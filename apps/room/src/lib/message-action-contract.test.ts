import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, ensureDatabase } from '$lib/server/db';
import { alerts, chatMutes, messages, users, type User } from '$lib/server/db/schema';
import { actions } from '../routes/+page.server';

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

type ActionArgs = Parameters<(typeof actions)['messageAction']>[0];

/**
 * The room these fixtures live in.
 *
 * Every message action resolves `requireRoomShortCode(locals)` and scopes its reads and writes to
 * it, so a `locals` without one is not a realistic request — it is the shape that let a form-supplied
 * id reach another room's rows.
 */
const ROOM = '3625';

function event(user: User, fields: Record<string, string>) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return {
    request: new Request('http://localhost/', { method: 'POST', body }),
    locals: { user, sessionId: 'message-action-contract', roomShortCode: ROOM }
  } as unknown as ActionArgs;
}

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
  it('lets the author delete their own message and a presenter delete anyone’s', async () => {
    const own = newMessage(author);
    expect(
      await actions.messageAction(
        event(author, { operation: 'delete', kind: 'chat', id: String(own.id) })
      )
    ).toEqual({ success: true });

    const theirs = newMessage(author);
    expect(
      await actions.messageAction(
        event(presenter, { operation: 'delete', kind: 'chat', id: String(theirs.id) })
      )
    ).toEqual({ success: true });

    expect(db.select().from(messages).all()).toHaveLength(0);
  });

  it('refuses a bystander deleting somebody else’s message', async () => {
    const message = newMessage(author);
    expect(
      await actions.messageAction(
        event(bystander, { operation: 'delete', kind: 'chat', id: String(message.id) })
      )
    ).toMatchObject({ status: 403 });
    expect(db.select().from(messages).all()).toHaveLength(1);
  });

  it('is a 404 for an id that does not exist, and a 400 for one that is not a number', async () => {
    expect(
      await actions.messageAction(
        event(presenter, { operation: 'delete', kind: 'chat', id: '999999' })
      )
    ).toMatchObject({ status: 404 });
    expect(
      await actions.messageAction(
        event(presenter, { operation: 'delete', kind: 'chat', id: 'abc' })
      )
    ).toMatchObject({ status: 400 });
  });
});

describe('edit', () => {
  it('lets the author edit their own message', async () => {
    const message = newMessage(author, { body: 'before' });
    expect(
      await actions.messageAction(
        event(author, {
          operation: 'edit',
          kind: 'chat',
          id: String(message.id),
          newBody: ' after '
        })
      )
    ).toEqual({ success: true });

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
    expect(
      await actions.messageAction(
        event(presenter, {
          operation: 'edit',
          kind: 'chat',
          id: String(adminMessage.id),
          newBody: 'rewritten'
        })
      )
    ).toMatchObject({ status: 403 });

    expect(db.select().from(messages).where(eq(messages.id, adminMessage.id)).get()?.body).toBe(
      'admin says'
    );
  });

  it('lets a presenter edit an ordinary member message', async () => {
    const message = newMessage(author, { body: 'before' });
    expect(
      await actions.messageAction(
        event(presenter, {
          operation: 'edit',
          kind: 'chat',
          id: String(message.id),
          newBody: 'after'
        })
      )
    ).toEqual({ success: true });
  });

  it('makes editing an alert presenter-only, regardless of who wrote it', async () => {
    const alert = newAlert(author);
    expect(
      await actions.messageAction(
        event(author, { operation: 'edit', kind: 'alert', id: String(alert.id), newBody: 'mine' })
      )
    ).toMatchObject({ status: 403 });

    expect(
      await actions.messageAction(
        event(presenter, {
          operation: 'edit',
          kind: 'alert',
          id: String(alert.id),
          newBody: 'theirs'
        })
      )
    ).toEqual({ success: true });
  });

  it('refuses an empty body', async () => {
    const message = newMessage(author);
    expect(
      await actions.messageAction(
        event(author, { operation: 'edit', kind: 'chat', id: String(message.id), newBody: '   ' })
      )
    ).toMatchObject({ status: 400 });
  });
});

describe('reaction', () => {
  it('toggles on, then off, and removes the key entirely when nobody is left', async () => {
    const message = newMessage(author);
    const args = {
      operation: 'reaction',
      kind: 'chat',
      id: String(message.id),
      reactionKey: 'thumbsup',
      reactionEmoji: '👍'
    };

    const added = await actions.messageAction(event(bystander, args));
    expect(added).toMatchObject({ success: true });
    expect((added as { reactions: Record<string, unknown> }).reactions).toHaveProperty('thumbsup');

    const removed = await actions.messageAction(event(bystander, args));
    // Not left as an empty array: the key is deleted, so the client renders no chip at all.
    expect((removed as { reactions: Record<string, unknown> }).reactions).toEqual({});
  });

  it('is per person, so one leaving does not remove another’s', async () => {
    const message = newMessage(author);
    const args = {
      operation: 'reaction',
      kind: 'chat',
      id: String(message.id),
      reactionKey: 'thumbsup',
      reactionEmoji: '👍'
    };

    await actions.messageAction(event(bystander, args));
    await actions.messageAction(event(presenter, args));
    const afterOneLeaves = await actions.messageAction(event(bystander, args));

    const reactions = (afterOneLeaves as { reactions: Record<string, { clickedBy: string[] }> })
      .reactions;
    expect(reactions.thumbsup.clickedBy).toHaveLength(1);
  });

  it('needs both a key and an emoji', async () => {
    const message = newMessage(author);
    expect(
      await actions.messageAction(
        event(bystander, {
          operation: 'reaction',
          kind: 'chat',
          id: String(message.id),
          reactionKey: '',
          reactionEmoji: '👍'
        })
      )
    ).toMatchObject({ status: 400 });
  });
});

describe('presenter-only operations', () => {
  it('gates markAnswered, mute24 and showMsgToAll behind the presenter check', async () => {
    const message = newMessage(author);

    const attempts: Record<string, string>[] = [
      { operation: 'markAnswered', kind: 'chat', id: String(message.id) },
      {
        operation: 'mute24',
        kind: 'chat',
        id: String(message.id),
        targetUserId: String(author.id)
      },
      { operation: 'showMsgToAll', kind: 'chat', id: String(message.id) }
    ];

    for (const fields of attempts) {
      expect(await actions.messageAction(event(bystander, fields))).toMatchObject({ status: 403 });
    }
  });

  it('marks a message answered', async () => {
    const message = newMessage(author);
    await actions.messageAction(
      event(presenter, { operation: 'markAnswered', kind: 'chat', id: String(message.id) })
    );
    expect(db.select().from(messages).where(eq(messages.id, message.id)).get()?.answered).toBe(
      true
    );
  });

  it('mutes for 24 hours, to the minute', async () => {
    const message = newMessage(author);
    const before = Date.now();
    await actions.messageAction(
      event(presenter, {
        operation: 'mute24',
        kind: 'chat',
        id: String(message.id),
        targetUserId: String(author.id)
      })
    );

    const mute = db.select().from(chatMutes).all()[0];
    expect(mute.targetUserId).toBe(author.id);
    expect(mute.mutedByUserId).toBe(presenter.id);

    const twentyFourHours = 24 * 60 * 60 * 1000;
    const elapsed = mute.expiresAt.getTime() - before;
    expect(elapsed).toBeGreaterThan(twentyFourHours - 60_000);
    expect(elapsed).toBeLessThan(twentyFourHours + 60_000);
  });

  /*
    `showMsgToAll` writes nothing and returns success.

    Pinned deliberately: it looks like a missing implementation, and the cutover must not "fix" it
    into an endpoint call without deciding that separately. The client fires it and uses its own
    local state.
  */
  it('accepts showMsgToAll as a no-op', async () => {
    const message = newMessage(author);
    expect(
      await actions.messageAction(
        event(presenter, { operation: 'showMsgToAll', kind: 'chat', id: String(message.id) })
      )
    ).toEqual({ success: true });
  });

  it('refuses an unknown operation', async () => {
    const message = newMessage(author);
    expect(
      await actions.messageAction(
        event(presenter, { operation: 'launchMissiles', kind: 'chat', id: String(message.id) })
      )
    ).toMatchObject({ status: 400 });
  });
});
