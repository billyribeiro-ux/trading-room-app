import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * ── THE ROOM REPORTS A NEW PEAK, AND ONLY A NEW PEAK ───────────────────────────────────────────
 *
 * `recorded_max_capacity` — the Manage panel's "Max" — had a column, a reader and a reset since the
 * controller's migration `0011`, and **nothing had ever written it**. Evidence gap `T5-20` said the
 * next step was to capture how the reference pushes occupancy; measured 2026-08-31 across the whole
 * of its manage bundle, **it does not push one**. `chatModel.userCount` is computed in the browser
 * from the two roster sizes and read only by two display helpers.
 *
 * So the signal comes from the one place that can see simultaneous presence: this room's own SSE
 * hub. That is the distinction T5-20's warning draws — *"the number who ever registered is not the
 * number ever simultaneously present"* — and a subscriber count is the second of those, while a
 * roster is the first.
 *
 * ## What is asserted here
 *
 * The DECISION, which is pure and process-local: report when the count beats everything this process
 * has reported for that room, and not otherwise. That rule is the whole reason a busy room does not
 * make one control-plane request per arrival.
 *
 * The endpoint's own safety — that concurrent reports cannot lower the mark — belongs to the SQL and
 * is asserted in `apps/controller/src/lib/server/room-occupancy-contract.test.ts`. The two halves are
 * tested where they live, which is also why a change to one cannot quietly satisfy the other's test.
 */

const reported: Array<{ room: string; count: number }> = [];
let reportSucceeds = true;

vi.mock('./room-config-client', () => ({
  reportRoomOccupancy: (room: string, count: number) => {
    reported.push({ room, count });
    return Promise.resolve(reportSucceeds);
  }
}));

const { subscribeToRoom } = await import('./room-events');

const ROOM = '7301';

/** A subscriber, and its unsubscribe. The hub keys listeners by function identity. */
function join(room = ROOM): () => void {
  return subscribeToRoom(room, () => {});
}

/** The hub reports on the request path and does not await; let the microtask settle. */
async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick += 1) await Promise.resolve();
}

beforeEach(() => {
  reported.length = 0;
  reportSucceeds = true;
});

const open: Array<() => void> = [];
afterEach(() => {
  for (const close of open.splice(0)) close();
  vi.restoreAllMocks();
});

describe('a report happens on a new peak and nowhere else', () => {
  it('reports the first arrival', async () => {
    open.push(join());
    await settle();
    expect(reported).toEqual([{ room: ROOM, count: 1 }]);
  });

  it('reports each new high once, in order', async () => {
    open.push(join(), join(), join());
    await settle();
    expect(reported).toEqual([
      { room: ROOM, count: 1 },
      { room: ROOM, count: 2 },
      { room: ROOM, count: 3 }
    ]);
  });

  it('says NOTHING when somebody re-joins below the peak', async () => {
    /*
      THE POINT OF THE COUNTER. Three in, one out, one back in: the room is at 3 again, which this
      process has already reported. Without the counter that last arrival is another request, and a
      busy room makes one per arrival forever to move a number that changes a few times a day.
    */
    const first = join();
    open.push(join(), join());
    await settle();
    expect(reported).toHaveLength(3);

    first();
    reported.length = 0;
    open.push(join());
    await settle();

    expect(reported, 'the peak was already reported; nothing new happened').toEqual([]);
  });

  it('reports again once the peak is genuinely beaten', async () => {
    /* The floor for the assertion above: quiet must not mean broken. */
    open.push(join(), join());
    await settle();
    reported.length = 0;

    open.push(join());
    await settle();
    expect(reported).toEqual([{ room: ROOM, count: 3 }]);
  });

  it('counts each room separately', async () => {
    open.push(join('7301'), join('9999'), join('9999'));
    await settle();
    expect(reported).toEqual([
      { room: '7301', count: 1 },
      { room: '9999', count: 1 },
      { room: '9999', count: 2 }
    ]);
  });

  it('starts over when a room empties, and the controller is what remembers', async () => {
    /*
      The process-local counter is dropped with the room, so a room that empties and refills
      re-reports from 1. That is correct rather than merely tolerable: the controller's write is
      `WHERE recorded_max_capacity < $1`, so every re-report below the stored mark changes nothing,
      and the durable value outlives every process. The alternative — keeping the counter forever —
      is a Map that grows one key per room that ever existed.
    */
    const only = join();
    await settle();
    expect(reported).toEqual([{ room: ROOM, count: 1 }]);

    only();
    reported.length = 0;
    open.push(join());
    await settle();

    expect(reported).toEqual([{ room: ROOM, count: 1 }]);
  });

  it('does not let a failed report break the join', async () => {
    /*
      Every OTHER controller write in this room throws, because each carries a person's decision and
      a presenter who pressed Ban must never be told it worked when it did not. This one carries
      nobody's decision, and it runs on the request path of a member opening their event stream — so
      a control-plane outage must not reach the one call that decides whether they are in the room.

      `reportRoomOccupancy` never throws and logs its own failures; this asserts the hub keeps
      working when it answers false, which is the observable half.
    */
    reportSucceeds = false;
    const close = join();
    await settle();
    expect(reported).toEqual([{ room: ROOM, count: 1 }]);
    expect(typeof close).toBe('function');
    close();
  });
});
