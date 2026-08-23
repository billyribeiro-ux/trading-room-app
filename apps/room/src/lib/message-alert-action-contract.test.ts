import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import {
  alertQuestions,
  alerts,
  chatMutes,
  messages,
  users,
  type User
} from '#lib/server/db/schema.js';
import { resetRateLimits } from '#lib/server/rate-limit.js';
import { callRemote, expectSchemaRefusal } from '#lib/server/remote-command-harness.js';

/*
  THE CONTROLLER, STUBBED — required from 2026-08-23, when `refuseIfMuted` began asking it.

  There are two mutes. `chat_mutes` is the room's own 24-hour one and is a local table these tests
  already write. The other is the controller's permanent mute — membership `role = 3`, surfaced as
  `member.muted` — and it was loaded into the page payload and read by NOTHING, so an owner who muted
  somebody indefinitely from the manage page watched them keep posting.

  Enforcing it means the send path asks the control plane, which is not running in a unit test. Same
  stub and same reasoning as `room-isolation-contract.test.ts` and `page-load-contract.test.ts`.

  `permanentlyMuted` is a mutable knob rather than a fixed value because the interesting assertions
  are on BOTH sides of it: a stub pinned to `false` would let the refusal tests pass for the wrong
  reason, and one pinned to `true` would hide every other test in this file behind a 403.
*/
const controller = { permanentlyMuted: false };

vi.mock('#lib/server/room-config-client.js', () => ({
  RoomConfigUnavailable: class RoomConfigUnavailable extends Error {},
  readRoomConfig: async (_request: Request, shortCode: string, email?: string) => ({
    room: {
      shortCode,
      name: `Room ${shortCode}`,
      state: 'open',
      logoUrl: null,
      publicId: null,
      maxUsers: 0
    },
    settings: {},
    locked: [],
    member: {
      displayName: 'stub',
      email: email ?? '',
      role: controller.permanentlyMuted ? 3 : 2,
      nonPresenter: false,
      isP: false,
      isNonPresenterAdmin: false,
      isFT: false,
      denyArchivesAccess: false,
      restrictPmUser: false,
      muted: controller.permanentlyMuted,
      banned: false,
      permissions: {
        hasMic: false,
        hasScreen: false,
        hasCam: false,
        hasAdminChat: false,
        canEditNotes: false
      }
    }
  })
}));

/*
  Characterization tests for the four actions that create content: sendMessage, replyMessage,
  postAlert and askQuestion.

  These are the last uncovered high-risk actions before the cutover
  (`docs/CUTOVER-ROOM-TO-API.md`). Each maps onto an API endpoint that already exists, so what
  matters is the behaviour AROUND the insert - the guards, the derived columns, and the fields
  that are silently dropped - because that is what a mechanical translation loses.

  `resetRateLimits()` runs before each test. Every one of these actions consumes a bucket, and
  `alert` and `question` allow only 10 per minute, so without it a later test would fail with a
  429 that has nothing to do with what it is asserting.
*/

/*
  REWRITTEN, not re-pointed, when these four became remote commands. Every assertion still EXECUTES
  against the live database through `callRemote`, which establishes the request store a command's
  wrapper reads — `remote-command-harness.ts` records which fields Kit needs and where each was read.

  Three shapes changed, and each is the conversion rather than a weakening: a refusal REJECTS instead
  of returning `fail()`; success returns `undefined`, so what proves a write is the ROW; and
  arguments are TYPED, so a case that used to send a bad string has to reach around the compiler —
  which is the improvement, and the cast is how the test says so.
*/
const { replyMessage, sendMessage } = await import('../routes/chat-messages.remote');
const { askQuestion } = await import('../routes/alert-questions.remote');
const { postAlert } = await import('../routes/post-alert.remote');

const ROOM = '3625';

/*
  `roomShortCode` is on the session because the room's realtime channel is keyed by room now. It used
  to be the constant `'ptr-room'`, which was correct while the build had one room and became a
  cross-room leak the moment the controller could create many.
*/
const locals = (user: User) =>
  ({ user, sessionId: 'message-alert-contract', roomShortCode: ROOM }) as App.Locals;

function account(email: string, role: string): User {
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return existing;
  return db
    .insert(users)
    .values({
      displayName: `content contract ${role}`,
      email,
      role,
      passwordHash: 'scrypt$00$00',
      createdAt: new Date()
    })
    .returning()
    .get();
}

let presenter: User;
let member: User;

beforeAll(() => {
  ensureDatabase();
  presenter = account('content-presenter@example.test', 'staff');
  member = account('content-member@example.test', 'member');
});

beforeEach(() => {
  controller.permanentlyMuted = false;
  resetRateLimits();
  db.delete(alertQuestions).run();
  db.delete(chatMutes).run();
  db.delete(messages).run();
  db.delete(alerts).run();
});

const muteMember = (expiresAt: Date) =>
  db
    .insert(chatMutes)
    .values({
      // A mute is granted in one room; it must not follow somebody into another.
      roomShortCode: ROOM,
      targetUserId: member.id,
      mutedByUserId: presenter.id,
      expiresAt,
      createdAt: new Date()
    })
    .run();

describe('sendMessage', () => {
  it('trims the body and marks a presenter\u2019s message as admin', async () => {
    await callRemote(locals(presenter), () => sendMessage({ body: '  hello  ', room: 'main' }));

    const [stored] = db.select().from(messages).all();
    expect(stored.body).toBe('hello');
    // `isAdmin` is derived from the role at write time, not stored on the request. After the
    // cutover it comes from `room_members.role` and must still be true for the same person.
    expect(stored.isAdmin).toBe(true);
    expect(stored.room).toBe('main');
  });

  it('does not mark a member\u2019s message as admin', async () => {
    await callRemote(locals(member), () => sendMessage({ body: 'hi', room: 'main' }));
    expect(db.select().from(messages).all()[0].isAdmin).toBe(false);
  });

  /*
    The channel allow-list is a security guard, not validation.

    `messages.room` is a label, not a foreign key, so without this check a crafted request could
    park messages in a channel the client never renders - invisible content that still occupies
    the table and still reaches every reader's payload.

    It is a schema check now, so the compiler refuses `'not-a-channel'` before the runtime does —
    hence the cast, which is what lets this keep proving the runtime guard is still there.
  */
  it('refuses a channel outside CHAT_TABS', async () => {
    await expectSchemaRefusal(
      callRemote(locals(member), () =>
        sendMessage({ body: 'hidden', room: 'not-a-channel' as 'main' })
      )
    );
    expect(db.select().from(messages).all()).toHaveLength(0);

    // Both real channels are accepted.
    for (const room of ['main', 'off-topic'] as const) {
      await expect(
        callRemote(locals(member), () => sendMessage({ body: 'ok', room }))
      ).resolves.toBeUndefined();
    }
  });

  it('refuses an empty body and one over 4,000 characters', async () => {
    for (const body of ['   ', 'x'.repeat(4_001)]) {
      await expect(
        callRemote(locals(member), () => sendMessage({ body, room: 'main' })),
        `${body.length} chars`
      ).rejects.toMatchObject({ status: 400 });
    }
    await expect(
      callRemote(locals(member), () => sendMessage({ body: 'x'.repeat(4_000), room: 'main' }))
    ).resolves.toBeUndefined();
  });

  it('refuses a muted sender, and writes nothing', async () => {
    muteMember(new Date(Date.now() + 60_000));

    /*
      `fail(403, { muted: true })` carried a flag rather than a sentence, because the composer
      renders its own captured "Chat Disabled" block for this case. A command has no `data`, so the
      403 is the whole signal — which is what the client reads either way.
    */
    await expect(
      callRemote(locals(member), () => sendMessage({ body: 'let me in', room: 'main' }))
    ).rejects.toMatchObject({ status: 403 });
    expect(db.select().from(messages).all()).toHaveLength(0);
  });

  /*
    THE CONTROLLER'S PERMANENT MUTE — the bug this pair exists for, fixed 2026-08-23.

    `applyUserOpcode` on the manage page writes membership `role = 3`, which `room-config-client.ts`
    documents as "3 muted" and surfaces as `member.muted`. `+page.server.ts:381` loaded it into the
    page payload and NOTHING read it, so a member muted INDEFINITELY by the owner kept posting. The
    control reported success and the database recorded the mute; only the room never asked.

    It is asserted on both send paths because that asymmetry has already happened once in this file:
    the 24-hour mute applied to `sendMessage` and not to `replyMessage`, and a muted member simply
    used the other door. A gate added to one path is not a gate.
  */
  it("refuses a PERMANENTLY muted member — the controller's mute, not the room's", async () => {
    controller.permanentlyMuted = true;

    await expect(
      callRemote(locals(member), () => sendMessage({ body: 'muted by the owner', room: 'main' }))
    ).rejects.toMatchObject({ status: 403 });
    expect(db.select().from(messages).all(), 'nothing may be written').toHaveLength(0);
  });

  it('refuses a permanently muted member on the REPLY path too, not just send', async () => {
    const original = db
      .insert(messages)
      .values({
        roomShortCode: ROOM,
        room: 'main',
        senderId: presenter.id,
        body: 'the original',
        createdAt: new Date()
      })
      .returning()
      .get();

    controller.permanentlyMuted = true;

    await expect(
      callRemote(locals(member), () =>
        replyMessage({ body: 'around the front door', messageId: original.id })
      )
    ).rejects.toMatchObject({ status: 403 });
    expect(db.select().from(messages).all(), 'only the original may remain').toHaveLength(1);
  });

  it('lets an UNMUTED member through — the positive control for both assertions above', async () => {
    /*
      Without this, a stub that refused everything, a harness that threw, or a gate that had become
      unconditional would make the two refusals above pass while chat was broken for everybody.
    */
    controller.permanentlyMuted = false;
    await expect(
      callRemote(locals(member), () => sendMessage({ body: 'not muted at all', room: 'main' }))
    ).resolves.toBeUndefined();
    expect(db.select().from(messages).all()).toHaveLength(1);
  });

  it('lets an expired mute through', async () => {
    muteMember(new Date(Date.now() - 1_000));
    await expect(
      callRemote(locals(member), () => sendMessage({ body: 'served', room: 'main' }))
    ).resolves.toBeUndefined();
  });

  it('rate limits at 30 in the window', async () => {
    for (let sent = 0; sent < 30; sent += 1) {
      await expect(
        callRemote(locals(member), () => sendMessage({ body: `m${sent}`, room: 'main' })),
        `message ${sent}`
      ).resolves.toBeUndefined();
    }
    await expect(
      callRemote(locals(member), () => sendMessage({ body: 'one too many', room: 'main' }))
    ).rejects.toMatchObject({ status: 429 });
  });
});

describe('replyMessage', () => {
  it('copies the original\u2019s channel and snapshots its author and body', async () => {
    await callRemote(locals(member), () => sendMessage({ body: 'original', room: 'off-topic' }));
    const [original] = db.select().from(messages).all();

    await expect(
      callRemote(locals(presenter), () => replyMessage({ body: 'a reply', messageId: original.id }))
    ).resolves.toBeUndefined();

    const reply = db
      .select()
      .from(messages)
      .all()
      .find((row) => row.id !== original.id);
    // The reply lands in the SAME channel as the original, not in a channel the client passed.
    expect(reply?.room).toBe('off-topic');
    expect(reply?.replyToMessageId).toBe(original.id);
    // Snapshotted, not joined: the quoted text must survive the original being edited or deleted.
    expect(reply?.replyToName).toBe(member.displayName);
    expect(reply?.replyToBody).toBe('original');
  });

  it('is a 404 for a message that does not exist, and 400 for an id that is not an integer', async () => {
    await expect(
      callRemote(locals(member), () => replyMessage({ body: 'hi', messageId: 999999 }))
    ).rejects.toMatchObject({ status: 404 });
    await expectSchemaRefusal(
      callRemote(locals(member), () =>
        replyMessage({ body: 'hi', messageId: 'abc' as unknown as number })
      )
    );
  });

  /*
    THE TWO ASYMMETRIES THE CONVERSION FOUND, pinned in the direction they were fixed.

    `sendMessage` and `replyMessage` sat eighty lines apart in `+page.server.ts` and had drifted:
    the mute check and the length bound were on the first and not on the second. A muted member
    could not send and COULD reply, into the same log — so `mute24`, a control that says it stops
    somebody posting for a day, did not.

    Both are behaviour changes and both are asserted here rather than left to a comment, because a
    comment is what the old code had.
  */
  it('now refuses a MUTED member, where the reply path used to let them through', async () => {
    await callRemote(locals(presenter), () => sendMessage({ body: 'original', room: 'main' }));
    const [original] = db.select().from(messages).all();
    muteMember(new Date(Date.now() + 60_000));

    await expect(
      callRemote(locals(member), () =>
        replyMessage({ body: 'around the mute', messageId: original.id })
      )
    ).rejects.toMatchObject({ status: 403 });
    expect(db.select().from(messages).all(), 'no reply was written').toHaveLength(1);
  });

  it('now refuses a reply over 4,000 characters, where it had no bound at all', async () => {
    await callRemote(locals(presenter), () => sendMessage({ body: 'original', room: 'main' }));
    const [original] = db.select().from(messages).all();

    await expect(
      callRemote(locals(member), () =>
        replyMessage({ body: 'x'.repeat(4_001), messageId: original.id })
      )
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      callRemote(locals(member), () =>
        replyMessage({ body: 'x'.repeat(4_000), messageId: original.id })
      )
    ).resolves.toBeUndefined();
  });
});

describe('postAlert', () => {
  const post = (user: User, args: Parameters<typeof postAlert>[0]) =>
    callRemote(locals(user), () => postAlert(args));

  it('is presenter-only', async () => {
    await expect(
      post(member, { kind: 'text', body: 'mine', nonTradeAlert: false })
    ).rejects.toMatchObject({
      status: 403
    });
    expect(db.select().from(alerts).all()).toHaveLength(0);
  });

  it('accepts the three kinds and refuses anything else', async () => {
    for (const kind of ['text', 'url', 'media'] as const) {
      await expect(
        post(presenter, { kind, body: `a ${kind} alert`, nonTradeAlert: false }),
        kind
      ).resolves.toBeUndefined();
    }
    await expectSchemaRefusal(
      post(presenter, { kind: 'video' as 'text', body: 'nope', nonTradeAlert: false })
    );
  });

  /*
    `targetUrl` is kept ONLY for `kind === 'media'` and silently dropped otherwise.

    Easy to lose in translation, and it fails quietly: a url alert would post with no link and
    look like a rendering bug rather than a dropped field.
  */
  it('keeps targetUrl for media and drops it for every other kind', async () => {
    await post(presenter, {
      kind: 'media',
      body: 'with media',
      targetUrl: 'https://example.test/a.png',
      nonTradeAlert: false
    });
    await post(presenter, {
      kind: 'url',
      body: 'with url',
      targetUrl: 'https://example.test/b',
      nonTradeAlert: false
    });

    const stored = db.select().from(alerts).all();
    expect(stored.find((row) => row.kind === 'media')?.targetUrl).toBe(
      'https://example.test/a.png'
    );
    expect(stored.find((row) => row.kind === 'url')?.targetUrl).toBeNull();
  });

  it('refuses an empty body and one over 8,000 characters', async () => {
    for (const body of ['', 'x'.repeat(8_001)]) {
      await expectSchemaRefusal(
        post(presenter, { kind: 'text', body, nonTradeAlert: false }),
        `${body.length} chars`
      );
    }
  });

  it('refuses `dontPush`, which the action accepted and never read', async () => {
    /*
      `z.strictObject` refusing an unknown field is the honest shape: accepting one implies
      something consumes it. Nothing does — the suppression it names has no consumer in this room —
      so the client stopped sending it.
    */
    await expectSchemaRefusal(
      post(presenter, {
        kind: 'text',
        body: 'a',
        nonTradeAlert: false,
        dontPush: true
      } as unknown as Parameters<typeof postAlert>[0])
    );
  });
});

describe('askQuestion', () => {
  async function alertBy(user: User) {
    await callRemote(locals(user), () =>
      postAlert({ kind: 'text', body: 'an alert', nonTradeAlert: false })
    );
    return db.select().from(alerts).all()[0];
  }

  it('refuses an alert that belongs to another room, and writes nothing', async () => {
    /*
      A CROSS-TENANT WRITE, live until 2026-08-14.

      The author lookup was always scoped to the room, but its answer was only ever used to decide
      `isAnswer`. A miss produced `null`, `isAnswer` went false, and the insert ran anyway with
      whatever `alertId` the form carried — so a member of one room could attach a question to
      another room's alert thread, and that room would display it. `alert_questions` has no room
      column of its own, so nothing downstream could catch it either.

      Asserted on the ROWS, not just the rejection: a command that refuses politely and inserts
      anyway is the exact shape of the bug.
    */
    const foreign = db
      .insert(alerts)
      .values({
        roomShortCode: '9999',
        senderId: presenter.id,
        body: 'an alert in somebody else\u2019s room',
        createdAt: new Date()
      })
      .returning()
      .get();

    const before = db.select().from(alertQuestions).all().length;
    await expect(
      callRemote(locals(member), () => askQuestion({ body: 'let me in', alertId: foreign.id }))
    ).rejects.toMatchObject({ status: 404 });
    expect(db.select().from(alertQuestions).all().length, 'no row was written').toBe(before);
  });

  it('records the question and keeps the alert\u2019s counters in step', async () => {
    const alert = await alertBy(presenter);

    await callRemote(locals(member), () => askQuestion({ body: 'why?', alertId: alert.id }));

    const stored = db.select().from(alerts).where(eq(alerts.id, alert.id)).get();
    // Derived from the rows rather than incremented, so the badge cannot drift from the list.
    expect(stored?.questionCount).toBe(1);
    expect(stored?.questionAnswered).toBe(false);
  });

  /*
    The rule that keys off AUTHORSHIP, not role.

    A question stays outstanding until the presenter who posted the alert replies, and their
    reply marks EVERY outstanding question on that alert answered at once. Keyed on authorship
    deliberately: an earlier build promoted every visitor to `staff`, so a role check would have
    marked questions answered the moment they were asked.
  */
  it('marks every outstanding question answered when the alert\u2019s author replies', async () => {
    const alert = await alertBy(presenter);

    await callRemote(locals(member), () => askQuestion({ body: 'first?', alertId: alert.id }));
    await callRemote(locals(member), () => askQuestion({ body: 'second?', alertId: alert.id }));

    let stored = db.select().from(alerts).where(eq(alerts.id, alert.id)).get();
    expect(stored?.questionCount).toBe(2);
    expect(stored?.questionAnswered).toBe(false);

    // The author replies once; both outstanding questions are settled, and the reply itself is
    // stored as an answered row - hence three.
    await callRemote(locals(presenter), () => askQuestion({ body: 'because', alertId: alert.id }));

    stored = db.select().from(alerts).where(eq(alerts.id, alert.id)).get();
    expect(stored?.questionCount).toBe(3);
    expect(stored?.questionAnswered).toBe(true);

    const unanswered = db
      .select()
      .from(alertQuestions)
      .all()
      .filter((row) => row.answeredAt === null);
    expect(unanswered).toHaveLength(0);
  });

  it('does not let a different presenter answer on the author\u2019s behalf', async () => {
    const other = account('content-other-presenter@example.test', 'staff');
    const alert = await alertBy(presenter);

    await callRemote(locals(member), () => askQuestion({ body: 'why?', alertId: alert.id }));
    await callRemote(locals(other), () => askQuestion({ body: 'I reckon', alertId: alert.id }));

    const stored = db.select().from(alerts).where(eq(alerts.id, alert.id)).get();
    // Still outstanding: `other` is staff but did not post the alert.
    expect(stored?.questionAnswered).toBe(false);
  });

  it('refuses an empty body, an over-long one, and an id that is not an integer', async () => {
    const alert = await alertBy(presenter);
    await expect(
      callRemote(locals(member), () => askQuestion({ body: '  ', alertId: alert.id }))
    ).rejects.toMatchObject({ status: 400 });
    // NEW: this path accepted a body of any size, where a question lands in a thread every reader
    // of that alert loads.
    await expect(
      callRemote(locals(member), () => askQuestion({ body: 'x'.repeat(4_001), alertId: alert.id }))
    ).rejects.toMatchObject({ status: 400 });
    await expectSchemaRefusal(
      callRemote(locals(member), () =>
        askQuestion({ body: 'why?', alertId: 'abc' as unknown as number })
      )
    );
  });
});
