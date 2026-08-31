import { error, json } from '@sveltejs/kit';
import { and, eq, lt } from 'drizzle-orm';
import { ROOM_JWT_SECRET } from '$app/env/private';
import { getDb } from '#lib/server/db/index.js';
import { ACCOUNT_ACTIVE, accounts, rooms } from '#lib/server/db/schema.js';
import { verifyConfigWriteToken } from '#lib/server/room-handoff.js';
import type { RequestHandler } from './$types';

/**
 * `POST /internal/room-occupancy/<shortCode>` — the room reporting peak simultaneous occupancy.
 *
 * ## The row this closes, and the premise it had wrong
 *
 * `recorded_max_capacity` is the Manage panel's "Max" figure and what "Reset Counts" clears. It has
 * had a column, a reader and a reset since migration `0011` and **nothing has ever written it** —
 * tracked as evidence-gap `T5-20`, which said the next step was to *"capture whether the original
 * pushes occupancy on its command channel and under what name"*.
 *
 * **It does not.** Measured 2026-08-31 across all 455,329 bytes of the reference's manage bundle,
 * pinned at `evidence-dumps/manage-app-2026-08-31/`: `occupancy`, `maxCapacity`, `maxCap`,
 * `recorded_max` and `peakUsers` occur **zero** times, against a passing control that `userCount`
 * and `simUserCount` do. What the reference has is `chatModel.userCount`, computed in the BROWSER
 * from `Object.keys(roster).length + Object.keys(presroster).length` at four sites and read only by
 * two helpers that write it into `#rosterLen` and `#rosterLenSide`. It counts for a badge and
 * reports nothing.
 *
 * So there was never a signal to capture, and whatever writes this upstream observes the SERVER's
 * own connections. That is a thing this repository owns.
 *
 * ## Why the count is the room's SSE subscriber count and not the roster
 *
 * T5-20's own warning: *"do not substitute the roster size — the number who ever registered is not
 * the number ever simultaneously present."* `roomSubscriberCount()` counts open `/sess/[room]/events`
 * connections, which is exactly simultaneous presence: a member who left has no listener, and one
 * with two tabs has two. The two-tab case is a real overcount and it is the honest one — the
 * reference's own `userCount` is keyed on `uid` and would say one — so it is stated at
 * `reportRoomOccupancy` rather than silently corrected, because correcting it would mean the room
 * tracking identity per connection for a statistic.
 *
 * ## This is a MACHINE door, and the authority is different from its siblings
 *
 * `internal/room-setting`, `room-ban`, `room-permissions` and `room-mute` all take an `?email=` and
 * require that member to be a presenter, because each carries out a PERSON's decision and a hidden
 * button is not an authorization check.
 *
 * **Nobody decided this.** It is the room process reporting a fact about itself, with no user behind
 * it, so there is no member to name and requiring one would mean inventing an actor. The authority
 * is "this is the room service", proven by the same 60-second write-capability MAC the siblings use
 * — `config-write:`, never `config-read:`, so a capability minted to READ a room's configuration
 * cannot move a stored number.
 *
 * The blast radius is bounded by the write itself: the only reachable effect is raising one
 * non-negative integer on one room, and it cannot be lowered here at all (see below). A caller
 * holding the write secret can already do strictly more through the sibling endpoints.
 *
 * ## The write is ONE atomic conditional UPDATE
 *
 * A high-water mark read-then-written is a TOCTOU: two room processes reporting 11 and 12 can both
 * read 10 and the second can land first, leaving 11. `CLAUDE.md` states the rule directly —
 * *"SELECT-then-UPDATE is a TOCTOU. Use one atomic conditional `UPDATE … WHERE … RETURNING`; zero
 * rows means you lost the race."*
 *
 * Here zero rows is not a loss, it is the COMMON case: it means the stored mark is already at least
 * this high, which is what happens on every report but a new peak. So zero rows is answered `200`
 * with the count unchanged, and the room is told nothing went wrong — because nothing did.
 *
 * `lt(recordedMaxCapacity, count)` is also what makes this endpoint unable to LOWER the mark. That
 * is deliberate and it is the reason no reset lives here: "Reset Counts" is a presenter's decision
 * on the Manage page, gated as one, and a machine door that could zero the figure would be a second
 * way to do it with no person attached.
 */

/**
 * The largest occupancy this endpoint will record.
 *
 * A bound rather than a belief. The value is written by a room process the controller does not
 * host, and `recorded_max_capacity` is `INTEGER NOT NULL` — an absurd number would be stored
 * faithfully and then rendered on the Manage panel forever, since nothing but a presenter's reset
 * can bring it down. 100,000 is far above any plausible room (`max_users` is a per-room limit in the
 * low thousands at most) and far below anything that overflows, so it is a guard that a real
 * deployment cannot hit and a wrong caller cannot pass.
 */
const MAX_REPORTABLE_OCCUPANCY = 100_000;

export const POST: RequestHandler = async ({ params, request }) => {
  const secret = ROOM_JWT_SECRET;
  if (!secret) {
    // Same posture as the sibling endpoints: fail loudly, and do not name the private variable.
    error(500, 'Room configuration is not available.');
  }

  const presented = request.headers.get('authorization')?.replace(/^Bearer /, '');
  const verified = verifyConfigWriteToken(secret, params.code, presented);
  if (!verified.ok) {
    // One status and one message for every reason; the reason is for the log, not the caller.
    console.warn('[room-occupancy] rejected', { code: params.code, reason: verified.reason });
    error(401, 'Unauthorized.');
  }

  let payload: { count?: unknown };
  try {
    payload = (await request.json()) as { count?: unknown };
  } catch {
    error(400, 'A JSON body is required.');
  }

  /*
    `Number.isSafeInteger` and not `typeof === 'number'`.

    `NaN`, `Infinity` and `1.5` are all numbers, and each would reach the database: a float is
    truncated silently by an INTEGER column, and the other two throw at the driver — a 500 for a
    caller error. Checked here so the failure is a 400 that says which field.
  */
  const count = payload.count;
  if (!Number.isSafeInteger(count)) error(400, 'An integer count is required.');
  const occupancy = count as number;
  if (occupancy < 0) error(400, 'A count cannot be negative.');
  if (occupancy > MAX_REPORTABLE_OCCUPANCY) error(400, 'That count is implausible.');

  const [room] = await getDb()
    .select({ id: rooms.id, accountId: rooms.accountId })
    .from(rooms)
    .where(eq(rooms.shortCode, params.code))
    .limit(1);
  if (!room) error(404, 'Room not found');

  // A suspended account's rooms stop serving, reads and writes alike — `internal/room-config`'s
  // reasoning: a suspended room is indistinguishable from one that never was.
  const [account] = await getDb()
    .select({ status: accounts.status })
    .from(accounts)
    .where(eq(accounts.id, room.accountId))
    .limit(1);
  if (!account || account.status !== ACCOUNT_ACTIVE) {
    console.warn('[room-occupancy] refused: account not active', {
      code: params.code,
      status: account?.status ?? 'missing'
    });
    error(404, 'Room not found');
  }

  /*
    ONE statement, and the `lt` is the whole safety property: concurrent reports cannot lower the
    mark whatever order they land in, because each only writes when it is strictly greater than what
    is stored. Zero rows means somebody else's number was already at least this high.
  */
  const raised = await getDb()
    .update(rooms)
    .set({ recordedMaxCapacity: occupancy })
    .where(and(eq(rooms.id, room.id), lt(rooms.recordedMaxCapacity, occupancy)))
    .returning({ recordedMaxCapacity: rooms.recordedMaxCapacity });

  if (raised.length > 0) {
    return json({ recordedMaxCapacity: raised[0].recordedMaxCapacity, raised: true });
  }

  /*
    Not a new peak. Read back what stands so the room is answered with the truth rather than with
    the number it sent — a caller that logged its own value as "the mark" would report a figure the
    database never held.
  */
  const [current] = await getDb()
    .select({ recordedMaxCapacity: rooms.recordedMaxCapacity })
    .from(rooms)
    .where(eq(rooms.id, room.id))
    .limit(1);
  return json({ recordedMaxCapacity: current?.recordedMaxCapacity ?? 0, raised: false });
};
