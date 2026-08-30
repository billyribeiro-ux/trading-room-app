import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import {
  alerts,
  capturedItemOverrides,
  chatMutes,
  hiddenRoomItems,
  messages,
  users,
  type User
} from '#lib/server/db/schema.js';
import { callRemote, expectSchemaRefusal } from '#lib/server/remote-command-harness.js';
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

  THAT GAP IS CLOSED, 2026-08-30 — see the last describe in this file.

  It read: *"only the real-row branches (`id > 0`) are covered. The captured-item branches (`id < 0`
  … ) are not, because they need the fixture wired up."* The fixture needed no wiring: it is
  `server/captured-message-fixture.json`, a tracked JSON file that `captured-room.ts` imports
  directly, and it resolves in any environment. The blocker was inherited rather than measured, and
  re-measuring it is what closed it — the same lesson `missing-settings-triage.md` records about
  `altChatRender`.

  They carry the same guards, and they are where the "deleted alert comes back for everyone else"
  defect lived.
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
/*
  THE ROOM'S OWN SETTINGS, stubbed — and `usersCanDeleteOwnMsgs` is why this mock exists at all.

  The delete branch asks the control plane whether a MEMBER may remove their own message, so every
  self-delete assertion below depends on it. It is a mutable object rather than a literal because the
  refusal case has to flip it: pinning it `true` would hide the "the room did not allow it" branch,
  and pinning it `false` would hide every other delete test behind a 403.
*/
const roomSettings: Record<string, unknown> = { usersCanDeleteOwnMsgs: true };

vi.mock('#lib/server/room-config-client.js', () => ({
  RoomConfigUnavailable: class RoomConfigUnavailable extends Error {},
  readRoomConfig: async (_request: unknown, shortCode: string) => ({
    room: {
      shortCode,
      name: `Room ${shortCode}`,
      state: 'open',
      logoUrl: null,
      publicId: null,
      maxUsers: 0
    },
    settings: roomSettings,
    locked: [],
    member: null
  }),
  /*
    THE TWO CREDENTIAL DOORS, stubbed as "not required" — added 2026-08-30 when the alert-delete
    door shipped and this file's mock stopped being complete.

    `deleteAlertPW` put a `checkAlertDeletePasswordRemotely` call in front of every alert delete, so
    without this entry the whole delete branch throws `No "…" export is defined on the mock` and
    every assertion here fails for a reason that has nothing to do with what it tests.

    `required: false` is the RIGHT stub for this file rather than a convenience: these tests are
    about the authorisation matrix — who may delete what — and a room that has configured no
    password is the state in which that matrix is the only thing deciding. The door's own behaviour
    is `alert-delete-password-contract.test.ts`, which stubs the same function with a controller it
    can steer, and that file is where a configured password belongs.

    The notes door is stubbed beside it for the reason that file records: the two grants must be
    provably independent, and a mock that omits one makes that failure look like this one.
  */
  checkAlertDeletePasswordRemotely: async () => ({ required: false, ok: true }),
  checkNotesPasswordRemotely: async () => ({ required: false, ok: true })
}));

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
  /*
    The two tables the CAPTURED-item branches write to, cleared here for the same reason as the
    three above and added with the tests that first wrote to them.

    They were missing while nothing in this file touched them, and the omission was invisible: a
    table nothing writes needs no clearing. The first captured-delete assertion is what exposed it —
    its hide survived into the next test and made a refusal look like a write. A `beforeEach` that
    lists some of the tables a file writes is worse than one that lists none, because it reads as
    complete.
  */
  db.delete(hiddenRoomItems).run();
  db.delete(capturedItemOverrides).run();
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

  /*
    ── "Users can delete own messages?" ──────────────────────────────────────────────────────────

    THIS ENDPOINT LET A MEMBER DELETE THEIR OWN MESSAGE IN ANY ROOM until 2026-08-28, whatever the
    owner had configured. The guard was "a presenter may remove anything, anyone else only what is
    theirs", which is the right shape and the wrong number of terms: upstream's
    `canDeleteOwnMessage` (byte 1,158,799) tests `sessData.usersCanDeleteOwnMsgs` FIRST.

    Nothing in the UI showed it, because `allowDeleteOwnMessage` on `RoomMessage` defaults `false`
    and nothing fed it — so the menu entry never rendered. A control nobody can see is not a control
    nobody can reach, and that is the whole reason the check is on the server.
  */
  it('refuses a member deleting their OWN message when the room did not allow it', async () => {
    roomSettings.usersCanDeleteOwnMsgs = false;
    try {
      const own = newMessage(author);
      await expect(
        act(author, { operation: 'delete', kind: 'chat', id: own.id })
      ).rejects.toMatchObject({ status: 403 });
      expect(db.select().from(messages).all(), 'the row survived').toHaveLength(1);
    } finally {
      roomSettings.usersCanDeleteOwnMsgs = true;
    }
  });

  it('refuses the same for an ALERT, which is the other half of the branch', async () => {
    roomSettings.usersCanDeleteOwnMsgs = false;
    try {
      const own = newAlert(author);
      await expect(
        act(author, { operation: 'delete', kind: 'alert', id: own.id })
      ).rejects.toMatchObject({ status: 403 });
      expect(db.select().from(alerts).all()).toHaveLength(1);
    } finally {
      roomSettings.usersCanDeleteOwnMsgs = true;
    }
  });

  /*
    FAILS CLOSED, and this test exists because a negative control stayed GREEN without it.

    Loosening `!== true` to `=== false` passed every assertion above, because both of them set the
    setting explicitly. **The case that matters is a room that never configured it at all** — the
    common one — where `undefined === false` is false and the delete goes through. `sessData` is JSON
    over an internal HTTP hop, so the same reasoning covers a string `"false"` and a `0`.
  */
  it.each([undefined, 'false', 'true', 0, 1, {}])(
    'refuses a member self-delete when the setting is %o rather than a real true',
    async (value) => {
      roomSettings.usersCanDeleteOwnMsgs = value;
      try {
        const own = newMessage(author);
        await expect(
          act(author, { operation: 'delete', kind: 'chat', id: own.id })
        ).rejects.toMatchObject({ status: 403 });
        expect(db.select().from(messages).all()).toHaveLength(1);
      } finally {
        roomSettings.usersCanDeleteOwnMsgs = true;
      }
    }
  );

  /*
    A PRESENTER IS UNAFFECTED, and this is the assertion that keeps the fix from becoming a
    regression. The setting governs a MEMBER removing their own; removing anything is a different
    authority and upstream does not condition it on this either.
  */
  it('still lets a presenter delete anything with the setting OFF', async () => {
    roomSettings.usersCanDeleteOwnMsgs = false;
    try {
      const theirs = newMessage(author);
      await expect(
        act(presenter, { operation: 'delete', kind: 'chat', id: theirs.id })
      ).resolves.toBeUndefined();
      expect(db.select().from(messages).all()).toHaveLength(0);
    } finally {
      roomSettings.usersCanDeleteOwnMsgs = true;
    }
  });

  it('is a 404 for an id that does not exist, and a 400 for one that is not a number', async () => {
    await expect(
      act(presenter, { operation: 'delete', kind: 'chat', id: 999999 })
    ).rejects.toMatchObject({ status: 404 });
    await expectSchemaRefusal(
      act(presenter, { operation: 'delete', kind: 'chat', id: 'abc' as unknown as number })
    );
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
      await expectSchemaRefusal(
        act(presenter, { operation: 'delete', kind: kind as 'chat', id: message.id }),
        kind
      );
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
      await expectSchemaRefusal(
        act(bystander, {
          operation: 'reaction',
          kind: 'chat',
          id: message.id,
          reactionKey,
          reactionEmoji
        }),
        `${reactionKey}/${reactionEmoji}`
      );
    }
  });
});

describe('presenter-only operations', () => {
  it('gates markAnswered, mute24 and showMsgToAll behind the presenter check', async () => {
    const message = newMessage(author);

    const attempts: Args[] = [
      { operation: 'markAnswered', kind: 'chat', id: message.id },
      { operation: 'mute24', targetUserId: author.id },
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
    const before = Date.now();
    await act(presenter, { operation: 'mute24', targetUserId: author.id });

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
    for (const targetUserId of [0, -1]) {
      await expectSchemaRefusal(
        act(presenter, { operation: 'mute24', targetUserId }),
        String(targetUserId)
      );
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
    await expectSchemaRefusal(
      act(presenter, {
        operation: 'launchMissiles',
        kind: 'chat',
        id: message.id
      } as unknown as Args)
    );
  });

  it('refuses `targetUserId` on an operation that is not mute24', async () => {
    /*
      What the union buys, stated as a test. The action took `targetUserId` on every operation and
      read it on one, so a delete carried a field nothing looked at and nothing anywhere said so.
    */
    const message = newMessage(author);
    await expectSchemaRefusal(
      act(presenter, {
        operation: 'delete',
        kind: 'chat',
        id: message.id,
        targetUserId: author.id
      } as unknown as Args)
    );
    expect(db.select().from(messages).all()).toHaveLength(1);
  });

  it('refuses a `kind` or an `id` on mute24, which acts on a USER and not on a row', async () => {
    /*
      The other direction of the same rule, and it went the other way on 2026-08-28: `mute24` USED to
      carry `{ kind, id }` and read neither. The Q&A thread is what made that cost something — a
      question is neither an alert nor a chat message, so muting its author through the shared shape
      meant labelling a question id as one of the two, and the day anything started reading `id` that
      would have muted against the wrong table.
    */
    const message = newMessage(author);
    for (const extra of [{ kind: 'chat' }, { id: message.id }]) {
      await expectSchemaRefusal(
        act(presenter, {
          operation: 'mute24',
          targetUserId: author.id,
          ...extra
        } as unknown as Args),
        JSON.stringify(extra)
      );
    }
    expect(db.select().from(chatMutes).all()).toHaveLength(0);
  });
});

/*
  ── THE CAPTURED-ITEM BRANCHES (`id < 0`), which write no row to the table they appear to ────────

  Eighteen items of the forensic capture are served to the reference room as messages with NEGATIVE
  ids. They live in `server/captured-message-fixture.json`, not in `messages` or `alerts`, so every
  mutation of one has to be recorded somewhere else: a delete becomes a row in `hidden_room_items`,
  and an edit or a reaction becomes a column of `captured_item_overrides`.

  ## Why these branches, specifically

  They carry the SAME authorisation rules as the real-row branches and none of the same code, which
  is the shape that goes wrong quietly. `message-action-contract` covered `id > 0` in full and left
  these named as an honest gap; the "deleted alert comes back for everyone else" defect lived here.

  ## The room scoping is the security assertion, and it is not obvious

  `capturedRoomItem` refuses any room but `CAPTURE_REFERENCE_ROOM`, and its own comment says what
  that guard is for: *"Without this, a negative id posted from any room resolved against the fixture
  and let somebody delete or edit a captured item from a room that is not rendering the capture at
  all."* Every room is served the SAME fixture rows, so an unscoped negative id is a cross-room
  write — one tenant's action landing on evidence another tenant is being shown. That is the
  multi-tenant failure this repository exists to refuse, and it is asserted below by driving the
  identical command from a room that is not the capture's.
*/
const CAPTURED_ALERT_ID = -1;
const CAPTURED_ALERT_KEY = 'app-room-complete:app-st-message:1';

describe('the captured-item branches carry the same guards as the real rows', () => {
  it('a presenter deleting a captured alert records it, in THIS room only', async () => {
    const presenter = account('captured-presenter@example.test', 'staff');
    await act(presenter, { operation: 'delete', kind: 'alert', id: CAPTURED_ALERT_ID });

    const hidden = db.select().from(hiddenRoomItems).all();
    expect(hidden, 'exactly one hide was recorded').toHaveLength(1);
    expect(hidden[0].evidenceKey).toBe(CAPTURED_ALERT_KEY);
    /*
      The room is on the row, and that is the whole point of the column. Every room is served the
      same fixture item, so a hide keyed on the evidence alone would blank it for every tenant at
      once — the delete equivalent of the cross-room overwrite `recordOverride`'s conflict target
      records at the command.
    */
    expect(hidden[0].roomShortCode, 'hidden here, not everywhere').toBe(ROOM);
    expect(hidden[0].hiddenByUserId).toBe(presenter.id);

    /* And nothing was deleted from the real tables, because there was never a row to delete. */
    expect(db.select().from(alerts).all()).toHaveLength(0);
    expect(db.select().from(messages).all()).toHaveLength(0);
  });

  it('refuses a member the capture does not attribute to them', async () => {
    const member = account('captured-member@example.test', 'member');
    await expect(
      act(member, { operation: 'delete', kind: 'alert', id: CAPTURED_ALERT_ID })
    ).rejects.toMatchObject({ status: 403 });
    expect(db.select().from(hiddenRoomItems).all(), 'a refused delete writes nothing').toHaveLength(
      0
    );
  });

  it('REFUSES the same id from a room that is not the capture’s, with a 404', async () => {
    /*
      The cross-room assertion. Same user, same command, same negative id — only the room differs,
      and `capturedRoomItem` returns undefined for it, so the branch 404s before it can write.

      A 404 rather than a 403 is correct and deliberate: from a room that is not rendering the
      capture, that item does not exist. Answering 403 would confirm it exists somewhere, which is
      an oracle over another tenant's content.
    */
    const presenter = account('captured-presenter@example.test', 'staff');
    await expect(
      callRemote(
        { user: presenter, sessionId: 'captured-cross-room', roomShortCode: '9999' } as App.Locals,
        () => messageAction({ operation: 'delete', kind: 'alert', id: CAPTURED_ALERT_ID })
      )
    ).rejects.toMatchObject({ status: 404 });
    expect(db.select().from(hiddenRoomItems).all()).toHaveLength(0);
  });

  it('an edit of a captured item lands in the overrides, keyed by room as well as evidence', async () => {
    const presenter = account('captured-presenter@example.test', 'staff');
    await act(presenter, {
      operation: 'edit',
      kind: 'alert',
      id: CAPTURED_ALERT_ID,
      newBody: 'corrected copy'
    });

    const overrides = db.select().from(capturedItemOverrides).all();
    expect(overrides).toHaveLength(1);
    expect(overrides[0].evidenceKey).toBe(CAPTURED_ALERT_KEY);
    expect(overrides[0].roomShortCode, 'edited here, not in every room').toBe(ROOM);
    expect(overrides[0].body).toBe('corrected copy');
    expect(overrides[0].updatedByUserId).toBe(presenter.id);
  });
});
