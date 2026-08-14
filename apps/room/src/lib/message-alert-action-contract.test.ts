import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db, ensureDatabase } from '$lib/server/db';
import {
  alertQuestions,
  alerts,
  chatMutes,
  messages,
  users,
  type User
} from '$lib/server/db/schema';
import { resetRateLimits } from '$lib/server/rate-limit';
import { actions } from '../routes/+page.server';

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

type ActionArgs = Parameters<(typeof actions)['sendMessage']>[0];

function event(user: User, fields: Record<string, string>) {
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.set(key, value);
  return {
    request: new Request('http://localhost/', { method: 'POST', body }),
    /*
      `roomShortCode` is on the session because the room's realtime channel is keyed by room now.
      It used to be the constant `'ptr-room'`, which was correct while the build had one room and
      became a cross-room leak the moment the controller could create many.
    */
    locals: { user, sessionId: 'message-alert-contract', roomShortCode: '3625' }
  } as unknown as ActionArgs;
}

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
  resetRateLimits();
  db.delete(alertQuestions).run();
  db.delete(chatMutes).run();
  db.delete(messages).run();
  db.delete(alerts).run();
});

describe('sendMessage', () => {
  it('trims the body and marks a presenter’s message as admin', async () => {
    expect(
      await actions.sendMessage(event(presenter, { body: '  hello  ', room: 'main' }))
    ).toEqual({
      success: true
    });

    const [stored] = db.select().from(messages).all();
    expect(stored.body).toBe('hello');
    // `isAdmin` is derived from the role at write time, not stored on the request. After the
    // cutover it comes from `room_members.role` and must still be true for the same person.
    expect(stored.isAdmin).toBe(true);
    expect(stored.room).toBe('main');
  });

  it('does not mark a member’s message as admin', async () => {
    await actions.sendMessage(event(member, { body: 'hi', room: 'main' }));
    expect(db.select().from(messages).all()[0].isAdmin).toBe(false);
  });

  /*
    The channel allow-list is a security guard, not validation.

    `messages.room` is a label, not a foreign key, so without this check a crafted request could
    park messages in a channel the client never renders - invisible content that still occupies
    the table and still reaches every reader's payload.
  */
  it('refuses a channel outside CHAT_TABS', async () => {
    expect(
      await actions.sendMessage(event(member, { body: 'hidden', room: 'not-a-channel' }))
    ).toMatchObject({ status: 400 });
    expect(db.select().from(messages).all()).toHaveLength(0);

    // Both real channels are accepted.
    for (const room of ['main', 'off-topic']) {
      expect(await actions.sendMessage(event(member, { body: 'ok', room }))).toEqual({
        success: true
      });
    }
  });

  it('refuses an empty body and one over 4,000 characters', async () => {
    expect(await actions.sendMessage(event(member, { body: '   ', room: 'main' }))).toMatchObject({
      status: 400
    });
    expect(
      await actions.sendMessage(event(member, { body: 'x'.repeat(4_001), room: 'main' }))
    ).toMatchObject({ status: 400 });
    expect(
      await actions.sendMessage(event(member, { body: 'x'.repeat(4_000), room: 'main' }))
    ).toEqual({ success: true });
  });

  it('refuses a muted sender with a flag the client can act on', async () => {
    db.insert(chatMutes)
      .values({
        // A mute is granted in one room; it must not follow somebody into another.
        roomShortCode: '3625',
        targetUserId: member.id,
        mutedByUserId: presenter.id,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date()
      })
      .run();

    const refused = await actions.sendMessage(event(member, { body: 'let me in', room: 'main' }));
    // `{muted: true}` rather than a message: the client renders its own copy for this case.
    expect(refused).toMatchObject({ status: 403, data: { muted: true } });
    expect(db.select().from(messages).all()).toHaveLength(0);
  });

  it('lets an expired mute through', async () => {
    db.insert(chatMutes)
      .values({
        // A mute is granted in one room; it must not follow somebody into another.
        roomShortCode: '3625',
        targetUserId: member.id,
        mutedByUserId: presenter.id,
        expiresAt: new Date(Date.now() - 1_000),
        createdAt: new Date()
      })
      .run();

    expect(await actions.sendMessage(event(member, { body: 'served', room: 'main' }))).toEqual({
      success: true
    });
  });

  it('rate limits at 30 in the window', async () => {
    for (let sent = 0; sent < 30; sent += 1) {
      expect(await actions.sendMessage(event(member, { body: `m${sent}`, room: 'main' }))).toEqual({
        success: true
      });
    }
    expect(
      await actions.sendMessage(event(member, { body: 'one too many', room: 'main' }))
    ).toMatchObject({ status: 429 });
  });
});

describe('replyMessage', () => {
  it('copies the original’s channel and snapshots its author and body', async () => {
    await actions.sendMessage(event(member, { body: 'original', room: 'off-topic' }));
    const [original] = db.select().from(messages).all();

    expect(
      await actions.replyMessage(
        event(presenter, { body: 'a reply', messageId: String(original.id) })
      )
    ).toEqual({ success: true });

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

  it('is a 404 for a message that does not exist, and 400 for a non-numeric id', async () => {
    expect(
      await actions.replyMessage(event(member, { body: 'hi', messageId: '999999' }))
    ).toMatchObject({ status: 404 });
    expect(
      await actions.replyMessage(event(member, { body: 'hi', messageId: 'abc' }))
    ).toMatchObject({ status: 400 });
  });
});

describe('postAlert', () => {
  it('is presenter-only', async () => {
    expect(await actions.postAlert(event(member, { kind: 'text', body: 'mine' }))).toMatchObject({
      status: 403
    });
    expect(db.select().from(alerts).all()).toHaveLength(0);
  });

  it('accepts the three kinds and refuses anything else', async () => {
    for (const kind of ['text', 'url', 'media']) {
      expect(await actions.postAlert(event(presenter, { kind, body: `a ${kind} alert` }))).toEqual({
        success: true
      });
    }
    expect(
      await actions.postAlert(event(presenter, { kind: 'video', body: 'nope' }))
    ).toMatchObject({ status: 400 });
  });

  /*
    `targetUrl` is kept ONLY for `kind === 'media'` and silently dropped otherwise.

    Easy to lose in translation, and it fails quietly: a url alert would post with no link and
    look like a rendering bug rather than a dropped field.
  */
  it('keeps targetUrl for media and drops it for every other kind', async () => {
    await actions.postAlert(
      event(presenter, {
        kind: 'media',
        body: 'with media',
        targetUrl: 'https://example.test/a.png'
      })
    );
    await actions.postAlert(
      event(presenter, { kind: 'url', body: 'with url', targetUrl: 'https://example.test/b' })
    );

    const stored = db.select().from(alerts).all();
    expect(stored.find((row) => row.kind === 'media')?.targetUrl).toBe(
      'https://example.test/a.png'
    );
    expect(stored.find((row) => row.kind === 'url')?.targetUrl).toBeNull();
  });

  it('refuses an empty body and one over 8,000 characters', async () => {
    expect(await actions.postAlert(event(presenter, { kind: 'text', body: '' }))).toMatchObject({
      status: 400
    });
    expect(
      await actions.postAlert(event(presenter, { kind: 'text', body: 'x'.repeat(8_001) }))
    ).toMatchObject({ status: 400 });
  });
});

describe('askQuestion', () => {
  async function alertBy(user: User) {
    await actions.postAlert(event(user, { kind: 'text', body: 'an alert' }));
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

      Asserted on the ROWS, not just the return value: an action that refuses politely and inserts
      anyway is the exact shape of the bug.
    */
    const foreign = db
      .insert(alerts)
      .values({
        roomShortCode: '9999',
        senderId: presenter.id,
        body: 'an alert in somebody else’s room',
        createdAt: new Date()
      })
      .returning()
      .get();

    const before = db.select().from(alertQuestions).all().length;
    const result = await actions.askQuestion(
      event(member, { body: 'let me in', alertId: String(foreign.id) })
    );

    expect(result).toMatchObject({ status: 404 });
    expect(db.select().from(alertQuestions).all().length, 'no row was written').toBe(before);
  });

  it('records the question and keeps the alert’s counters in step', async () => {
    const alert = await alertBy(presenter);

    await actions.askQuestion(event(member, { body: 'why?', alertId: String(alert.id) }));

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
  it('marks every outstanding question answered when the alert’s author replies', async () => {
    const alert = await alertBy(presenter);

    await actions.askQuestion(event(member, { body: 'first?', alertId: String(alert.id) }));
    await actions.askQuestion(event(member, { body: 'second?', alertId: String(alert.id) }));

    let stored = db.select().from(alerts).where(eq(alerts.id, alert.id)).get();
    expect(stored?.questionCount).toBe(2);
    expect(stored?.questionAnswered).toBe(false);

    // The author replies once; both outstanding questions are settled, and the reply itself is
    // stored as an answered row - hence three.
    await actions.askQuestion(event(presenter, { body: 'because', alertId: String(alert.id) }));

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

  it('does not let a different presenter answer on the author’s behalf', async () => {
    const other = account('content-other-presenter@example.test', 'staff');
    const alert = await alertBy(presenter);

    await actions.askQuestion(event(member, { body: 'why?', alertId: String(alert.id) }));
    await actions.askQuestion(event(other, { body: 'I reckon', alertId: String(alert.id) }));

    const stored = db.select().from(alerts).where(eq(alerts.id, alert.id)).get();
    // Still outstanding: `other` is staff but did not post the alert.
    expect(stored?.questionAnswered).toBe(false);
  });

  it('refuses an empty body and a non-numeric alert id', async () => {
    const alert = await alertBy(presenter);
    expect(
      await actions.askQuestion(event(member, { body: '  ', alertId: String(alert.id) }))
    ).toMatchObject({ status: 400 });
    expect(
      await actions.askQuestion(event(member, { body: 'why?', alertId: 'abc' }))
    ).toMatchObject({ status: 400 });
  });
});
