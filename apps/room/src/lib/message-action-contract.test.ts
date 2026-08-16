import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { alerts, chatMutes, messages, users, type User } from '#lib/server/db/schema.js';
import { callRemote } from '#lib/server/remote-command-harness.js';
import { parseReactions } from '#lib/server/reactions.js';

/*
  Characterization tests for `messageAction`.

  216 lines, six operations, three item kinds and four different authorization rules, reached
  through one form action - and until this file, nothing executed any of it. It is the single
  riskiest thing in the cutover (`docs/CUTOVER-ROOM-TO-API.md` §4 says to split it first), because
  the API replaces it with four separate endpoints and a mistranslated guard here is a permission
  bug, not a rendering bug.

  What is pinned is the AUTHORIZATION MATRIX and the reaction toggle semantics. Those are the
  parts where being wrong is silent: a guard that lets the wrong person through looks identical to
  one that works, which is the same reasoning `authorization-contract.test.ts` was written under.

  HONEST GAP: only the real-row branches (`id > 0`) are covered. The captured-item branches
  (`id < 0`, which write to `captured_item_overrides` and `hidden_room_items` instead of to a
  table) are not, because they need the fixture wired up. They carry the same guards, and they are
  where the "deleted alert comes back for everyone else" defect lived. Worth doing next.
*/

/*
  REWRITTEN, not re-pointed, when `messageAction` became a remote command. Every assertion still
  EXECUTES against the live database through `callRemote`.

  Four shapes changed, and each is the conversion rather than a weakening:

    - a refusal REJECTS instead of returning `fail()`;
    - success returns `undefined`, so what proves a write is the ROW;
    - the REACTION tests used to read the recomputed map off the return value. The command hands
      back nothing — the client never read it either, it re-renders from the row — so they read the
      row's `reactions_json` now, which is the copy every other reader sees;
    - arguments are a DISCRIMINATED UNION, so an unknown operation, a non-numeric id and a
      `targetUserId` on the wrong operation are compile errors before they are runtime ones. Where a
      test still needs to prove the runtime refuses them, it casts, and says so.
*/
const { messageAction } = await import('../routes/message-actions.remote');

type Args = Parameters<typeof messageAction>[0];

const storedReactions = (table: 'messages' | 'alerts', id: number) => {
  const row =
    table === 'messages'
      ? db.select().from(messages).where(eq(messages.id, id)).get()
      : db.select().from(alerts).where(eq(alerts.id, id)).get();
  return parseReactions(row?.reactionsJson ?? '{}');
};

/**
 * The room these fixtures live in.
 *
 * Every message action resolves `requireRoomShortCode(locals)` and scopes its reads and writes to
 * it, so a `locals` without one is not a realistic request — it is the shape that let a form-supplied
 * id reach another room's rows.
 */
const ROOM = '3625';

const act = (user: User, args: Args) =>
  callRemote(
    { user, sessionId: 'message-action-contract', roomShortCode: ROOM } as App.Locals,
    () => messageAction(args)
  );

function account(email: string, role: string): User {
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return existing;
  return db
    .insert(users)
    .values({
      displayName: `msg contract ${role}`,
      email,
      role,
      passwordHash: 'scrypt$00$00',
      createdAt: new Date()
    })
    .returning()
    .get();
}

let presenter: User;
let author: User;
let bystander: User;

beforeAll(() => {
  ensureDatabase();
  presenter = account('msg-action-presenter@example.test', 'staff');
  author = account('msg-action-author@example.test', 'member');
  bystander = account('msg-action-bystander@example.test', 'member');
});

function newMessage(
  sender: User,
  overrides: { isAdmin?: boolean; body?: string; room?: string } = {}
) {
  return db
    .insert(messages)
    .values({
      roomShortCode: overrides.room ?? ROOM,
      senderId: sender.id,
      body: overrides.body ?? 'a message',
      isAdmin: overrides.isAdmin ?? false,
      createdAt: new Date()
    })
    .returning()
    .get();
}

function newAlert(sender: User, overrides: { room?: string } = {}) {
  return db
    .insert(alerts)
    .values({
      roomShortCode: overrides.room ?? ROOM,
      senderId: sender.id,
      body: 'an alert',
      createdAt: new Date()
    })
    .returning()
    .get();
}

beforeEach(() => {
  db.delete(chatMutes).run();
  db.delete(messages).run();
  db.delete(alerts).run();
});

describe('delete', () => {
  it('lets the author delete their own message and a presenter delete anyone\u2019s', async () => {
    const own = newMessage(author);
    await expect(
      act(author, { operation: 'delete', kind: 'chat', id: own.id })
    ).resolves.toBeUndefined();

    const theirs = newMessage(author);
    await expect(
      act(presenter, { operation: 'delete', kind: 'chat', id: theirs.id })
    ).resolves.toBeUndefined();

    expect(db.select().from(messages).all()).toHaveLength(0);
  });

  it('refuses a bystander deleting somebody else\u2019s message', async () => {
    const message = newMessage(author);
    await expect(
      act(bystander, { operation: 'delete', kind: 'chat', id: message.id })
    ).rejects.toMatchObject({ status: 403 });
    expect(db.select().from(messages).all()).toHaveLength(1);
  });

  it('is a 404 for an id that does not exist, and a 400 for one that is not a number', async () => {
    await expect(
      act(presenter, { operation: 'delete', kind: 'chat', id: 999999 })
    ).rejects.toMatchObject({ status: 404 });
    await expect(
      act(presenter, { operation: 'delete', kind: 'chat', id: 'abc' as unknown as number })
    ).rejects.toMatchObject({ status: 400 });
  });

  it('refuses a `kind` that is neither alert nor chat, where it used to mean chat', async () => {
    /*
      The tightening. `kind` was a bare string compared with `kind === 'alert'`, so a typo — or the
      empty string — fell through to the chat branch and acted on the messages table. `z.enum`
      refuses it, and the row is asserted untouched because a 400 with the delete already done is
      the failure that would matter.
    */
    const message = newMessage(author);
    for (const kind of ['', 'Chat', 'alerts']) {
      await expect(
        act(presenter, { operation: 'delete', kind: kind as 'chat', id: message.id }),
        kind
      ).rejects.toMatchObject({ status: 400 });
    }
    expect(db.select().from(messages).all()).toHaveLength(1);
  });
});

describe('edit', () => {
  it('lets the author edit their own message', async () => {
    const message = newMessage(author, { body: 'before' });
    await expect(
      act(author, { operation: 'edit', kind: 'chat', id: message.id, newBody: ' after ' })
    ).resolves.toBeUndefined();

    // Trimmed - unlike a saved poll, which is stored verbatim.
    expect(db.select().from(messages).where(eq(messages.id, message.id)).get()?.body).toBe('after');
  });

  /*
    The rule that is easiest to mistranslate: `!isOwner && (!isPresenter || message.isAdmin)`.

    A presenter may edit an ordinary member's message, but NOT another admin's. Read quickly it
    looks like "presenters can edit anything", and the cutover has to carry the exception.
  */
  it('refuses a presenter editing an admin message they do not own', async () => {
    const adminMessage = newMessage(author, { isAdmin: true, body: 'admin says' });
    await expect(
      act(presenter, { operation: 'edit', kind: 'chat', id: adminMessage.id, newBody: 'rewritten' })
    ).rejects.toMatchObject({ status: 403 });

    expect(db.select().from(messages).where(eq(messages.id, adminMessage.id)).get()?.body).toBe(
      'admin says'
    );
  });

  it('lets a presenter edit an ordinary member message', async () => {
    const message = newMessage(author, { body: 'before' });
    await expect(
      act(presenter, { operation: 'edit', kind: 'chat', id: message.id, newBody: 'after' })
    ).resolves.toBeUndefined();
  });

  it('makes editing an alert presenter-only, regardless of who wrote it', async () => {
    const alert = newAlert(author);
    await expect(
      act(author, { operation: 'edit', kind: 'alert', id: alert.id, newBody: 'mine' })
    ).rejects.toMatchObject({ status: 403 });

    await expect(
      act(presenter, { operation: 'edit', kind: 'alert', id: alert.id, newBody: 'theirs' })
    ).resolves.toBeUndefined();
  });

  it('refuses an empty body, and one over 4,000 characters', async () => {
    const message = newMessage(author);
    await expect(
      act(author, { operation: 'edit', kind: 'chat', id: message.id, newBody: '   ' })
    ).rejects.toMatchObject({ status: 400 });
    // NEW: the bound the post path always had and the edit path never did.
    await expect(
      act(author, { operation: 'edit', kind: 'chat', id: message.id, newBody: 'x'.repeat(4_001) })
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe('reaction', () => {
  it('toggles on, then off, and removes the key entirely when nobody is left', async () => {
    const message = newMessage(author);
    const args = {
      operation: 'reaction',
      kind: 'chat',
      id: message.id,
      reactionKey: 'thumbsup',
      reactionEmoji: '\u{1F44D}'
    } as const;

    /*
      Asserted on the ROW rather than on a returned map. The command hands nothing back — the client
      never read the old return value either, it calls `invalidateAll()` — and the row is the copy
      every other reader in the room actually sees.
    */
    await act(bystander, args);
    expect(storedReactions('messages', message.id)).toHaveProperty('thumbsup');

    await act(bystander, args);
    // Not left as an empty array: the key is deleted, so the client renders no chip at all.
    expect(storedReactions('messages', message.id)).toEqual({});
  });

  it('is per person, so one leaving does not remove another\u2019s', async () => {
    const message = newMessage(author);
    const args = {
      operation: 'reaction',
      kind: 'chat',
      id: message.id,
      reactionKey: 'thumbsup',
      reactionEmoji: '\u{1F44D}'
    } as const;

    await act(bystander, args);
    await act(presenter, args);
    await act(bystander, args);

    expect(storedReactions('messages', message.id).thumbsup.clickedBy).toHaveLength(1);
  });

  it('needs both a key and an emoji', async () => {
    const message = newMessage(author);
    for (const [reactionKey, reactionEmoji] of [
      ['', '\u{1F44D}'],
      ['thumbsup', ''],
      ['   ', '\u{1F44D}']
    ]) {
      await expect(
        act(bystander, {
          operation: 'reaction',
          kind: 'chat',
          id: message.id,
          reactionKey,
          reactionEmoji
        }),
        `${reactionKey}/${reactionEmoji}`
      ).rejects.toMatchObject({ status: 400 });
    }
  });
});

describe('presenter-only operations', () => {
  it('gates markAnswered, mute24 and showMsgToAll behind the presenter check', async () => {
    const message = newMessage(author);

    const attempts: Args[] = [
      { operation: 'markAnswered', kind: 'chat', id: message.id },
      { operation: 'mute24', kind: 'chat', id: message.id, targetUserId: author.id },
      { operation: 'showMsgToAll', kind: 'chat', id: message.id }
    ];

    for (const args of attempts) {
      await expect(act(bystander, args), args.operation).rejects.toMatchObject({ status: 403 });
    }
  });

  it('marks a message answered', async () => {
    const message = newMessage(author);
    await act(presenter, { operation: 'markAnswered', kind: 'chat', id: message.id });
    expect(db.select().from(messages).where(eq(messages.id, message.id)).get()?.answered).toBe(
      true
    );
  });

  it('mutes for 24 hours, to the minute', async () => {
    const message = newMessage(author);
    const before = Date.now();
    await act(presenter, {
      operation: 'mute24',
      kind: 'chat',
      id: message.id,
      targetUserId: author.id
    });

    const mute = db.select().from(chatMutes).all()[0];
    expect(mute.targetUserId).toBe(author.id);
    expect(mute.mutedByUserId).toBe(presenter.id);

    const twentyFourHours = 24 * 60 * 60 * 1000;
    const elapsed = mute.expiresAt.getTime() - before;
    expect(elapsed).toBeGreaterThan(twentyFourHours - 60_000);
    expect(elapsed).toBeLessThan(twentyFourHours + 60_000);
  });

  it('refuses a mute against an id that cannot be a user', async () => {
    // NEW: `Number.isInteger` let 0 and negatives through to insert a row against nobody.
    const message = newMessage(author);
    for (const targetUserId of [0, -1]) {
      await expect(
        act(presenter, { operation: 'mute24', kind: 'chat', id: message.id, targetUserId }),
        String(targetUserId)
      ).rejects.toMatchObject({ status: 400 });
    }
    expect(db.select().from(chatMutes).all()).toHaveLength(0);
  });

  /*
    `showMsgToAll` writes nothing and succeeds.

    Pinned deliberately: it looks like a missing implementation, and the cutover must not "fix" it
    into an endpoint call without deciding that separately. The client fires it and uses its own
    local state.
  */
  it('accepts showMsgToAll as a no-op', async () => {
    const message = newMessage(author);
    await expect(
      act(presenter, { operation: 'showMsgToAll', kind: 'chat', id: message.id })
    ).resolves.toBeUndefined();
    expect(db.select().from(messages).where(eq(messages.id, message.id)).get()?.answered).toBe(
      false
    );
  });

  it('refuses an unknown operation', async () => {
    /*
      A discriminated union refuses this at the SCHEMA, where the action reached the bottom of a
      chain of `if`s and returned "Unsupported message operation." Same 400, decided before the
      handler runs — and now a compile error too, hence the cast.
    */
    const message = newMessage(author);
    await expect(
      act(presenter, {
        operation: 'launchMissiles',
        kind: 'chat',
        id: message.id
      } as unknown as Args)
    ).rejects.toMatchObject({ status: 400 });
  });

  it('refuses `targetUserId` on an operation that is not mute24', async () => {
    /*
      What the union buys, stated as a test. The action took `targetUserId` on every operation and
      read it on one, so a delete carried a field nothing looked at and nothing anywhere said so.
    */
    const message = newMessage(author);
    await expect(
      act(presenter, {
        operation: 'delete',
        kind: 'chat',
        id: message.id,
        targetUserId: author.id
      } as unknown as Args)
    ).rejects.toMatchObject({ status: 400 });
    expect(db.select().from(messages).all()).toHaveLength(1);
  });
});
