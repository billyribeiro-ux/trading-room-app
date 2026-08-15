import { eq } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { db, ensureDatabase } from '$lib/server/db';
import { alerts, users } from '$lib/server/db/schema';
import { createSwingAlert, deleteSwingAlert } from '$lib/server/swing-alerts-repository';
import { createDayTradeAlert, deleteDayTradeAlert } from '$lib/server/day-trade-alerts-repository';

/**
 * Deleting a trade alert must actually delete it.
 *
 * ## Why this file exists
 *
 * On 2026-08-15 `deleteSwingAlert` shipped, green, and **could not delete anything**. Both trade
 * alert tables soft-delete their own row and hard-delete the mirrored message in `alerts`, and both
 * carry `alert_id REFERENCES alerts(id)` while `db/index.ts` sets `PRAGMA foreign_keys = ON`. The
 * surviving row therefore still pointed at the alert being removed, SQLite refused the delete with
 * `FOREIGN KEY constraint failed`, the transaction rolled back, and a presenter clicking the bin
 * icon got a 500 with the row still there.
 *
 * Nothing caught it. It type-checks, it lints, `svelte-check` is clean, and
 * `swing-alerts-contract.test.ts` asserts wire names, strings and rendered markup without ever
 * reaching the repository. It was found by running a create/edit/delete round trip against a real
 * SQLite file while porting the Day Trade twin — which had inherited the defect line for line,
 * because the port was faithful.
 *
 * So this is the test whose absence WAS the bug. It exercises the one path that has to touch two
 * tables in one transaction, for both features, because both had it and both were fixed together.
 *
 * ## What each case pins
 *
 * The delete succeeds; the mirror is gone; the row is gone from the log; and — the assertion that
 * would have caught the original — a second delete answers `null` rather than throwing, because
 * "already deleted" is a 404 and not a 500.
 */

function makeUser(email: string): number {
  return db
    .insert(users)
    .values({
      displayName: 'Mirror Delete Probe',
      email,
      role: 'staff',
      passwordHash: 'scrypt$00$00',
      createdAt: new Date()
    })
    .returning()
    .get().id;
}

const NOW = new Date('2026-08-15T12:00:00.000Z');
/* Room codes and emails unique to this file: the suite shares one SQLite file per worker. */
const SWING_ROOM = 'md-s1';
const DAY_TRADE_ROOM = 'md-d1';

beforeAll(() => {
  ensureDatabase();
});

describe('deleting a swing alert', () => {
  it('removes the row and its mirrored feed message instead of failing the constraint', () => {
    const userId = makeUser('mirror-delete-swing@example.test');
    const made = createSwingAlert({
      room: SWING_ROOM,
      alert: {
        symbol: 'AAPL',
        direction: 'long',
        entryPrice: '123.57',
        stop: '120.40',
        target: '138.75',
        image: ''
      },
      now: NOW,
      senderName: 'Mirror Delete Probe',
      userId
    });
    expect(made.mirror.alertId).not.toBeNull();

    /*
      The original threw here. `expect(...).not.toThrow()` rather than a bare call, so the failure
      reads as "delete threw" instead of as an unhandled error somewhere in the file.
    */
    let removed: ReturnType<typeof deleteSwingAlert> = null;
    expect(() => {
      removed = deleteSwingAlert({ room: SWING_ROOM, swingAlertID: made.row.id, now: NOW, userId });
    }).not.toThrow();
    expect(removed).not.toBeNull();

    // The mirror is really gone, not merely detached.
    const mirror = db
      .select()
      .from(alerts)
      .where(eq(alerts.id, made.mirror.alertId as number))
      .get();
    expect(mirror).toBeUndefined();

    // And a second delete is a 404, not a 500.
    expect(
      deleteSwingAlert({ room: SWING_ROOM, swingAlertID: made.row.id, now: NOW, userId })
    ).toBeNull();
  });
});

describe('deleting a day trade alert', () => {
  it('removes the row and its mirrored feed message instead of failing the constraint', () => {
    const userId = makeUser('mirror-delete-day-trade@example.test');
    const made = createDayTradeAlert({
      room: DAY_TRADE_ROOM,
      alert: {
        symbol: 'AAPL',
        direction: 'long',
        entryPrice: '123.57',
        stop: '120.40',
        target: '138.75',
        image: ''
      },
      now: NOW,
      senderName: 'Mirror Delete Probe',
      userId
    });
    expect(made.mirror.alertId).not.toBeNull();
    // The feed copy carries the Day Trade hashtag, not the Swing one — the two repositories call
    // different formatters and a shared-helper refactor would show up right here.
    expect(made.mirror.body).toBe(
      '#DayTrade \nAAPL - long - Entry 123.57 - Exit 120.40 - Target 138.75'
    );

    let removed: ReturnType<typeof deleteDayTradeAlert> = null;
    expect(() => {
      removed = deleteDayTradeAlert({
        room: DAY_TRADE_ROOM,
        dayTradeAlertID: made.row.id,
        now: NOW,
        userId
      });
    }).not.toThrow();
    expect(removed).not.toBeNull();

    const mirror = db
      .select()
      .from(alerts)
      .where(eq(alerts.id, made.mirror.alertId as number))
      .get();
    expect(mirror).toBeUndefined();

    expect(
      deleteDayTradeAlert({
        room: DAY_TRADE_ROOM,
        dayTradeAlertID: made.row.id,
        now: NOW,
        userId
      })
    ).toBeNull();
  });

  /*
    The room predicate, on the statement that decides the race. A delete naming another room's id
    must answer 404 and leave that room's row alone — this is the failure mode the whole repository
    is shaped around, and it costs one extra case to pin.
  */
  it('refuses to delete a row belonging to another room, and leaves it intact', () => {
    const userId = makeUser('mirror-delete-cross-room@example.test');
    const made = createDayTradeAlert({
      room: DAY_TRADE_ROOM,
      alert: {
        symbol: 'MSFT',
        direction: 'short',
        entryPrice: '1',
        stop: '2',
        target: '3',
        image: ''
      },
      now: NOW,
      senderName: 'Mirror Delete Probe',
      userId
    });

    expect(
      deleteDayTradeAlert({
        room: 'md-other',
        dayTradeAlertID: made.row.id,
        now: NOW,
        userId
      })
    ).toBeNull();

    // Still deletable by its OWN room, which proves the refusal above was the predicate and not a
    // row that had already gone.
    expect(
      deleteDayTradeAlert({
        room: DAY_TRADE_ROOM,
        dayTradeAlertID: made.row.id,
        now: NOW,
        userId
      })
    ).not.toBeNull();
  });
});
