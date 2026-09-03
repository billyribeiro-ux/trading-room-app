import { eq } from 'drizzle-orm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MAX_REPEAT_ADVANCES,
  REPEAT_MODES,
  isRepeatMode,
  isSchedulableDate,
  isScheduledAlertDue,
  isWeekend,
  nextSendOn
} from '#lib/scheduled-alert.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import {
  alertDeliveryJobs,
  alerts,
  scheduledAlerts,
  users,
  type User
} from '#lib/server/db/schema.js';
import { resetRateLimits } from '#lib/server/rate-limit.js';
import { callRemote, expectSchemaRefusal } from '#lib/server/remote-command-harness.js';

/*
  ── `hasAlertScheduler`, AND THE THIRD BLOCKER IN A DAY THAT NAMED THE WRONG OBSTACLE ─────────────

  The row read: *"A scheduler process in `services/api`, and the crate's TEST targets cannot be built
  here."* Both halves are true of that crate. Neither is a reason to put the scheduler in it.

  The reference's scheduler is its own Node server. This stack's long-lived Node process is the ROOM
  — which `docs/NEXT-SESSION.md` establishes cannot be serverless at all, on two independent grounds
  it already documents: a WAL SQLite file Vercel's read-only filesystem cannot hold, and a
  `text/event-stream` a bounded function duration cuts. The room owns the `alerts` table a scheduled
  alert is written into and the fan-out that announces it. A Rust sweep would have reached across a
  process boundary into a SQLite file it does not own.

  ## What is transcribed and what is a DECISION

  Transcribed: the payload (byte 2,130,937), the future-date refusal, the load on session start when
  the flag is on (1,009,767), the removal by `_id` (2,406,725), the manage row's shape, and the
  composer's own `ignoreWeekends: "daily" === repeat && ignoreWeekends`.

  A DECISION, because the reference's SERVER does the rescheduling and no byte of it reaches the
  browser: `daily` advances one day and skips weekends when asked; `weekly` advances seven and
  therefore cannot move onto a weekend it did not start on. Marked as a decision in
  `#lib/scheduled-alert.ts` rather than dressed up as evidence.

  ## What is NOT verified

  No alert has fired from a real timer in this repository. The sweep is driven directly with an
  injected clock, which is the point of taking one — a test that waited fifteen seconds for an
  interval would be slow and would still prove less.
*/

const controller = { settings: {} as Record<string, unknown> };

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
    settings: controller.settings,
    locked: [],
    member: {
      displayName: 'stub',
      email: email ?? '',
      role: 2,
      nonPresenter: false,
      isP: false,
      isNonPresenterAdmin: false,
      isFT: false,
      denyArchivesAccess: false,
      restrictPmUser: false,
      muted: false,
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

const { scheduleAlertLater, listScheduledAlerts, removeScheduledAlert } =
  await import('../routes/scheduled-alerts.remote');
const { sweepScheduledAlerts, claimDueScheduledAlerts, scheduleAlert, MAX_PER_SWEEP } =
  await import('#lib/server/scheduled-alerts.js');

const ROOM = '5510';
const OTHER_ROOM = '5511';

const locals = (user: User, room = ROOM) =>
  ({ user, sessionId: 'scheduled-alert-contract', roomShortCode: room }) as App.Locals;

function account(email: string, role: string): User {
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return existing;
  return db
    .insert(users)
    .values({
      displayName: `sched ${role}`,
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
  presenter = account('sched-presenter@example.com', 'staff');
  member = account('sched-member@example.com', 'member');
});

beforeEach(() => {
  db.delete(scheduledAlerts).run();
  db.delete(alerts).run();
  resetRateLimits();
  controller.settings = { hasAlertScheduler: true };
});

/* ═══════════════════════ the arithmetic, which is the risky half ═══════════════════════ */

const at = (iso: string) => new Date(iso);

describe('nextSendOn', () => {
  it('returns nothing for an alert that does not repeat', () => {
    expect(
      nextSendOn(at('2026-08-28T14:00:00Z'), '', false, at('2026-08-28T14:00:01Z'))
    ).toBeNull();
  });

  it('advances a daily alert by exactly one day, keeping its time', () => {
    const next = nextSendOn(at('2026-08-28T14:30:00Z'), 'daily', false, at('2026-08-28T14:30:01Z'));
    expect(next?.toISOString()).toBe('2026-08-29T14:30:00.000Z');
  });

  it('advances a weekly alert by seven days, landing on the same weekday', () => {
    const sentAt = at('2026-08-28T14:30:00Z'); // a Friday
    const next = nextSendOn(sentAt, 'weekly', false, at('2026-08-28T14:30:01Z'));
    expect(next?.toISOString()).toBe('2026-09-04T14:30:00.000Z');
    expect(next?.getUTCDay()).toBe(sentAt.getUTCDay());
  });

  it('advances from the OCCURRENCE, not from the clock, so a late sweep does not drift', () => {
    /*
      The sweep runs every fifteen seconds and fires whatever is due, so it is almost always late by
      some seconds. Advancing from `now` would push each occurrence later than the last and a daily
      alert set for 09:00 would walk through the morning over a fortnight.
    */
    const next = nextSendOn(
      at('2026-08-28T09:00:00Z'),
      'daily',
      false,
      at('2026-08-28T09:00:14Z') // the sweep caught it fourteen seconds late
    );
    expect(next?.toISOString()).toBe('2026-08-29T09:00:00.000Z');
  });

  it('CATCHES UP rather than replaying, when the room was down', () => {
    /*
      Three days of downtime on a daily series is three missed occurrences. Posting all three the
      moment the process returns would put a wall of identical alerts on every member's screen; what
      a person means by "daily" is the NEXT one.
    */
    const next = nextSendOn(
      at('2026-08-25T09:00:00Z'),
      'daily',
      false,
      at('2026-08-28T10:00:00Z') // three days later, past that morning's occurrence
    );
    expect(next?.toISOString()).toBe('2026-08-29T09:00:00.000Z');
  });

  it('gives up rather than looping forever on an absurd date', () => {
    // An unbounded catch-up over a row from 1970, or after a clock jump, would spin the sweep while
    // it holds its claim. Past the bound the series is abandoned and the caller deletes the row.
    expect(nextSendOn(at('1970-01-01T00:00:00Z'), 'daily', false, at('2026-08-28T00:00:00Z'))).toBe(
      null
    );
  });

  it('skips Saturday and Sunday when a DAILY alert asks it to', () => {
    // Friday -> Saturday, skipped twice, landing on Monday.
    const next = nextSendOn(at('2026-08-28T09:00:00Z'), 'daily', true, at('2026-08-28T09:00:01Z'));
    expect(next?.toISOString()).toBe('2026-08-31T09:00:00.000Z');
    expect(isWeekend(next as Date)).toBe(false);
  });

  it('leaves a daily alert alone mid-week when it asks to skip weekends', () => {
    const next = nextSendOn(at('2026-08-25T09:00:00Z'), 'daily', true, at('2026-08-25T09:00:01Z'));
    expect(next?.toISOString()).toBe('2026-08-26T09:00:00.000Z');
  });

  it('does NOT apply the weekend skip to a weekly alert', () => {
    /*
      A weekly series steps seven days, so it lands on the weekday it started on and can never move
      onto a weekend it did not already start on. Applying the skip anyway would shift a Saturday
      series to Monday and leave it there — silently converting the series the presenter set up into
      a different one. The composer agrees: it only ever sends the flag for `daily`.
    */
    const saturday = at('2026-08-29T09:00:00Z');
    expect(isWeekend(saturday)).toBe(true);
    const next = nextSendOn(saturday, 'weekly', true, at('2026-08-29T09:00:01Z'));
    expect(next?.toISOString()).toBe('2026-09-05T09:00:00.000Z');
    expect(isWeekend(next as Date), 'it stays on its own Saturday').toBe(true);
  });

  it('crosses a month boundary without special-casing it', () => {
    const next = nextSendOn(at('2026-08-31T23:30:00Z'), 'daily', false, at('2026-08-31T23:30:01Z'));
    expect(next?.toISOString()).toBe('2026-09-01T23:30:00.000Z');
  });
});

describe('the vocabulary is deny-by-default', () => {
  it('accepts only the three modes the composer offers', () => {
    for (const mode of REPEAT_MODES) expect(isRepeatMode(mode)).toBe(true);
    for (const bogus of ['DAILY', 'monthly', 'hourly', 'off', 0, null, undefined]) {
      expect(isRepeatMode(bogus), String(bogus)).toBe(false);
    }
  });

  it('does not coerce an unknown repeat to "off"', () => {
    // Downgrading a typo to "off" would schedule an alert the presenter believes recurs, which is
    // the one failure worse than refusing the whole request.
    expect(isRepeatMode('weekley')).toBe(false);
  });
});

describe('isSchedulableDate and isScheduledAlertDue', () => {
  it('refuses a date that is not in the future', () => {
    const now = at('2026-08-28T12:00:00Z');
    expect(isSchedulableDate(at('2026-08-28T12:00:01Z'), now)).toBe(true);
    expect(isSchedulableDate(now, now), 'the composer refuses "now" too').toBe(false);
    expect(isSchedulableDate(at('2026-08-28T11:59:59Z'), now)).toBe(false);
    expect(isSchedulableDate(new Date(Number.NaN), now)).toBe(false);
  });

  it('fires a row stored for exactly the tick the sweep wakes on', () => {
    // `<=` and not `<`, or a series set on a round minute waits a whole extra sweep every time.
    const now = at('2026-08-28T12:00:00Z');
    expect(isScheduledAlertDue(now, now)).toBe(true);
    expect(isScheduledAlertDue(at('2026-08-28T12:00:01Z'), now)).toBe(false);
  });
});

/* ═══════════════════════ the commands, driven for real ═══════════════════════ */

const schedule = (user: User, patch: Record<string, unknown> = {}, room = ROOM) =>
  callRemote(locals(user, room), () =>
    scheduleAlertLater({
      body: 'SPY 500c runner',
      nonTradeAlert: false,
      repeat: '',
      ignoreWeekends: false,
      sendOn: Date.now() + 3_600_000,
      ...patch
    })
  );

describe('scheduling', () => {
  it('stores an alert a presenter scheduled', async () => {
    const { id } = await schedule(presenter);
    const row = db.select().from(scheduledAlerts).where(eq(scheduledAlerts.id, id)).get();
    expect(row?.body).toBe('SPY 500c runner');
    expect(row?.roomShortCode).toBe(ROOM);
    expect(row?.claimedAt, 'a fresh row is unclaimed').toBeNull();
  });

  it('takes the sender from the SESSION, never from the request', async () => {
    /*
      The reference's payload carries `sendLaterAsNick` / `sendLaterAsEmail` — the client naming who
      an alert is from. Refusing them is a security decision and not only a scope one: it is the
      2026-08-07 privilege escalation, and it will not be reintroduced.
    */
    const { id } = await schedule(presenter);
    const row = db.select().from(scheduledAlerts).where(eq(scheduledAlerts.id, id)).get();
    expect(row?.senderName).toBe(presenter.displayName);
    expect(row?.senderId).toBe(presenter.id);
  });

  it('REFUSES the five fields whose downstream this deployment does not have', async () => {
    /*
      `z.strictObject`, so accepting a flag nothing reads is impossible rather than merely avoided.

      EACH VALUE IS THE SHAPE THE REFERENCE ACTUALLY SENDS, and that detail is the test rather than
      decoration. The first draft sent `true` for all six, which meant the two STRING fields were
      being refused for the wrong reason — a type mismatch, not the unknown-key rule. A negative
      control proved it: adding `sendLaterAsNick: z.string().optional()` to the schema left this
      green, because `true` is still not a string. With a real string here, the only thing that can
      refuse it is `strictObject`, which is what the assertion claims to be about.
    */
    const refused: Record<string, unknown> = {
      sendTxt: true,
      sendEmail: true,
      sendTweet: true,
      sendLaterAsNick: 'someone else',
      sendLaterAsEmail: 'someone-else@example.com'
    };
    for (const [field, value] of Object.entries(refused)) {
      await expectSchemaRefusal(
        callRemote(locals(presenter), () =>
          scheduleAlertLater({
            body: 'x',
            nonTradeAlert: false,
            repeat: '',
            ignoreWeekends: false,
            sendOn: Date.now() + 3_600_000,
            [field]: value
          } as never)
        )
      );
    }
  });

  it('persists per-alert linked-room suppression until the scheduled occurrence fires', async () => {
    const sendOn = Date.now() + 1000;
    const { id } = await schedule(presenter, { sendOn, dontCrossPost: true });
    expect(
      db.select().from(scheduledAlerts).where(eq(scheduledAlerts.id, id)).get()?.dontCrossPost
    ).toBe(true);
    sweepScheduledAlerts(new Date(sendOn));
    expect(db.select().from(alertDeliveryJobs).get()?.dontCrossPost).toBe(true);
  });

  it('refuses a date that is not in the future, on the SERVER', async () => {
    // The reference checks this in the browser alone, which anyone can step past from a console.
    await expect(schedule(presenter, { sendOn: Date.now() - 1000 })).rejects.toThrow();
    expect(db.select().from(scheduledAlerts).all()).toHaveLength(0);
  });

  it('refuses a member, and writes nothing', async () => {
    await expect(schedule(member)).rejects.toThrow();
    expect(db.select().from(scheduledAlerts).all()).toHaveLength(0);
  });

  it('refuses when the room does not have the scheduler', async () => {
    // A gate that only removes a control is not a gate — the correction `enableQAReactions` was
    // made under, applied here from the start.
    controller.settings = { hasAlertScheduler: false };
    await expect(schedule(presenter)).rejects.toThrow();
    expect(db.select().from(scheduledAlerts).all()).toHaveLength(0);
  });

  it('refuses when the setting is ABSENT, not just when it is false', async () => {
    // `!== true`, the fail-closed read: a config response that omitted the field must refuse.
    controller.settings = {};
    await expect(schedule(presenter)).rejects.toThrow();
  });

  it('stores ignoreWeekends only for a DAILY alert', async () => {
    const weekly = await schedule(presenter, { repeat: 'weekly', ignoreWeekends: true });
    const daily = await schedule(presenter, { repeat: 'daily', ignoreWeekends: true });
    const rowOf = (id: number) =>
      db.select().from(scheduledAlerts).where(eq(scheduledAlerts.id, id)).get();
    expect(rowOf(weekly.id)?.ignoreWeekends, 'a weekly row cannot carry the flag').toBe(false);
    expect(rowOf(daily.id)?.ignoreWeekends).toBe(true);
  });
});

describe('listing and removing', () => {
  it('lists this room only, soonest first', async () => {
    const later = await schedule(presenter, { sendOn: Date.now() + 7_200_000 });
    const sooner = await schedule(presenter, { sendOn: Date.now() + 3_600_000 });
    await schedule(presenter, {}, OTHER_ROOM);

    const listed = await callRemote(locals(presenter), () => listScheduledAlerts());
    expect(listed.map((row) => row.id)).toEqual([sooner.id, later.id]);
  });

  it('refuses the LIST to a member, because it is unpublished trade calls', async () => {
    /*
      The reference gates only the UI here. A room's pending alerts are what a presenter intends to
      say and has not said yet, so handing them to every member turns a scheduler into a leak.
    */
    await schedule(presenter);
    await expect(callRemote(locals(member), () => listScheduledAlerts())).rejects.toThrow();
  });

  it('removes one pending alert', async () => {
    const { id } = await schedule(presenter);
    await callRemote(locals(presenter), () => removeScheduledAlert({ id }));
    expect(db.select().from(scheduledAlerts).all()).toHaveLength(0);
  });

  it('answers 404 for another room’s alert, and leaves it standing', async () => {
    /*
      404 and not 403: the room is in the WHERE rather than checked before it, so a presenter of one
      room asking about another's id gets the same answer as one asking about an id that never
      existed — the only answer that does not confirm the row exists.
    */
    const { id } = await schedule(presenter, {}, OTHER_ROOM);
    await expect(
      callRemote(locals(presenter, ROOM), () => removeScheduledAlert({ id }))
    ).rejects.toThrow();
    expect(db.select().from(scheduledAlerts).where(eq(scheduledAlerts.id, id)).get()).toBeDefined();
  });
});

/* ═══════════════════════ the sweep ═══════════════════════ */

describe('the sweep', () => {
  it('posts a due alert into the room’s alert log', async () => {
    const sendOn = Date.now() + 1000;
    await schedule(presenter, { sendOn });

    expect(sweepScheduledAlerts(new Date(sendOn - 1)), 'not yet due').toBe(0);
    expect(sweepScheduledAlerts(new Date(sendOn))).toBe(1);

    const posted = db.select().from(alerts).all();
    expect(posted).toHaveLength(1);
    expect(posted[0].body).toBe('SPY 500c runner');
    expect(posted[0].roomShortCode).toBe(ROOM);
    expect(posted[0].senderId).toBe(presenter.id);
  });

  it('deletes a one-off row once it has fired, rather than leaving it claimed', async () => {
    // A claimed row is invisible to the manage modal and to the sweep alike, so keeping it would
    // accumulate rows nothing can ever read or remove.
    const sendOn = Date.now() + 1000;
    await schedule(presenter, { sendOn });
    sweepScheduledAlerts(new Date(sendOn));
    expect(db.select().from(scheduledAlerts).all()).toHaveLength(0);
  });

  it('RE-ARMS a repeating alert in place, keeping its id', async () => {
    const sendOn = Date.now() + 1000;
    const { id } = await schedule(presenter, { sendOn, repeat: 'daily' });
    sweepScheduledAlerts(new Date(sendOn));

    const row = db.select().from(scheduledAlerts).where(eq(scheduledAlerts.id, id)).get();
    expect(row, 'the id the manage modal already holds survives').toBeDefined();
    expect(row?.claimedAt, 're-armed rows are unclaimed again').toBeNull();
    expect(row?.sendOn.getTime()).toBe(sendOn + 86_400_000);
  });

  it('fires a repeating alert once per occurrence and not twice', async () => {
    const sendOn = Date.now() + 1000;
    await schedule(presenter, { sendOn, repeat: 'daily' });
    sweepScheduledAlerts(new Date(sendOn));
    sweepScheduledAlerts(new Date(sendOn + 1000));
    expect(db.select().from(alerts).all(), 'the second sweep finds nothing due').toHaveLength(1);
    sweepScheduledAlerts(new Date(sendOn + 86_400_000));
    expect(db.select().from(alerts).all()).toHaveLength(2);
  });

  it('CLAIMS atomically, so a second sweep of the same instant fires nothing', async () => {
    /*
      The TOCTOU this is built to avoid. Two sweeps that both SELECT a due row would both post it —
      a duplicate alert to every member of a trading room, from a missing WHERE clause. The claim is
      one conditional UPDATE … WHERE claimed_at IS NULL … RETURNING, so the loser gets zero rows.
    */
    const sendOn = Date.now() + 1000;
    await schedule(presenter, { sendOn });

    const first = claimDueScheduledAlerts(new Date(sendOn));
    const second = claimDueScheduledAlerts(new Date(sendOn));
    expect(first).toHaveLength(1);
    expect(second, 'the row is already claimed').toHaveLength(0);
  });

  it('paces a backlog rather than emptying it in one tick', async () => {
    /*
      A room down for a week comes back with a backlog; posting it all at once would put a wall of
      alerts on every screen. Nothing is dropped — the next sweep is fifteen seconds away.

      THE BACKLOG IS BUILT THROUGH THE STORE, not through the command, and the reason is worth
      stating because the first draft did the latter and failed with a 429. `scheduleAlertLater`
      spends the presenter's alert budget per call, which is correct and is tested above; twenty-three
      calls exhaust it. The subject HERE is the sweep, so driving the command would be testing the
      rate limiter a second time and calling it a scheduler test.
    */
    const sendOn = Date.now() + 1000;
    for (let index = 0; index < MAX_PER_SWEEP + 3; index += 1) {
      scheduleAlert({
        roomShortCode: ROOM,
        senderId: presenter.id,
        senderName: presenter.displayName,
        body: `alert ${index}`,
        nonTrade: false,
        repeat: '',
        ignoreWeekends: false,
        sendOn: new Date(sendOn)
      });
    }
    expect(sweepScheduledAlerts(new Date(sendOn))).toBe(MAX_PER_SWEEP);
    expect(sweepScheduledAlerts(new Date(sendOn))).toBe(3);
  });

  it('does not touch another room’s pending alerts when firing this one', async () => {
    const sendOn = Date.now() + 1000;
    await schedule(presenter, { sendOn });
    await schedule(presenter, { sendOn: sendOn + 86_400_000 }, OTHER_ROOM);
    sweepScheduledAlerts(new Date(sendOn));
    expect(db.select().from(alerts).all()).toHaveLength(1);
    expect(db.select().from(scheduledAlerts).all(), 'the other room keeps its row').toHaveLength(1);
  });
});

describe('the bound on catching up is real', () => {
  it('abandons a series whose next occurrence is more than a year of steps away', () => {
    // The row is deleted rather than re-armed, so a corrupt date cannot keep the sweep busy forever.
    expect(MAX_REPEAT_ADVANCES).toBe(366);
    expect(
      nextSendOn(at('2020-01-01T00:00:00Z'), 'daily', false, at('2026-08-28T00:00:00Z'))
    ).toBeNull();
  });
});
