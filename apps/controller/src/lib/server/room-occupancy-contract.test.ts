import { describe, expect, it } from 'vitest';

/**
 * ── THE HIGH-WATER MARK ONLY EVER GOES UP, AND ONE STATEMENT IS WHY ────────────────────────────
 *
 * `recorded_max_capacity` is the Manage panel's "Max" figure. It has had a column, a reader and a
 * reset since migration `0011` and **nothing had ever written it** — evidence gap `T5-20`, whose
 * stated next step was to *"capture whether the original pushes occupancy on its command channel and
 * under what name"*.
 *
 * **It does not push one.** Measured 2026-08-31 across all 455,329 bytes of the reference's manage
 * bundle, pinned at `evidence-dumps/manage-app-2026-08-31/` and asserted by
 * `manage-app-bundle-contract.test.ts`: `occupancy`, `maxCapacity`, `maxCap`, `recorded_max` and
 * `peakUsers` occur zero times, against a passing control that `userCount` does. The reference
 * computes its count in the browser and sends it nowhere. So the signal had to come from a server
 * that can see connections, and `roomSubscriberCount()` is one.
 *
 * ## What this file asserts, and what belongs to the database
 *
 * The endpoint's correctness rests on ONE statement — `UPDATE … WHERE recorded_max_capacity < $1
 * RETURNING` — and the property that matters is that concurrent reports cannot lower the mark
 * whatever order they land in. That is a property of the SQL, so it is asserted on the SQL's shape
 * (the `lt` predicate is present, and no unconditional set exists) plus the pure decision the room
 * side makes about WHEN to send.
 *
 * The arithmetic itself — that `lt` means what it means — is PostgreSQL's, and a test asserting it
 * would be testing the database. `services/api/tests` is where this repository puts assertions that
 * need a real one.
 */

const ENDPOINT = 'src/routes/internal/room-occupancy/[code]/+server.ts';

async function endpointSource(): Promise<string> {
  const { readFileSync } = await import('node:fs');
  return readFileSync(`${process.cwd()}/${ENDPOINT}`, 'utf8');
}

describe('the write cannot lower the mark', () => {
  it('guards the UPDATE with a strictly-less-than on the stored value', async () => {
    /*
      The safety property in one line. Without `lt` this is a last-writer-wins assignment, and two
      processes reporting 12 and 11 would leave 11 whenever the second landed second.
    */
    const source = await endpointSource();
    expect(source).toContain('lt(rooms.recordedMaxCapacity, occupancy)');
    expect(source).toContain('.returning({ recordedMaxCapacity: rooms.recordedMaxCapacity })');
  });

  it('never reads-then-writes, which would be the TOCTOU', async () => {
    /*
      `CLAUDE.md`: *"SELECT-then-UPDATE is a TOCTOU. Use one atomic conditional `UPDATE … WHERE …
      RETURNING`; zero rows means you lost the race."*

      The file DOES select — the room row and the account status — and then updates, so "contains a
      select and an update" cannot be the check. What must not exist is a read OF THE MARK used to
      decide the write, so that is what is asserted: `recordedMaxCapacity` is selected exactly once,
      in the read-back AFTER the conditional update has already decided.
    */
    const source = await endpointSource();
    const selectsOfTheMark = source.match(/select\(\{ recordedMaxCapacity/g) ?? [];
    expect(selectsOfTheMark).toHaveLength(1);
    expect(
      source.indexOf('select({ recordedMaxCapacity'),
      'the only read of the mark must come after the conditional update'
    ).toBeGreaterThan(source.indexOf('lt(rooms.recordedMaxCapacity, occupancy)'));
  });

  it('has no path that sets the mark unconditionally', async () => {
    /*
      A reset would be exactly that, and it must not live on a machine door. "Reset Counts" is a
      presenter's decision on the Manage page and is gated as one; a second way to zero the figure
      with no person attached is the hole this asserts against.
    */
    const source = await endpointSource();
    const sets = source.match(/\.set\(\{ recordedMaxCapacity/g) ?? [];
    expect(sets).toHaveLength(1);
    expect(source, 'the machine door must not carry a reset').not.toContain('recordedMaxCapacity: 0');
  });
});

describe('what it accepts', () => {
  it('requires a safe integer, not merely a number', async () => {
    /*
      `NaN`, `Infinity` and `1.5` are all `typeof 'number'`. A float is silently truncated by an
      INTEGER column and the other two throw at the driver — a 500 for a caller's mistake. Checked so
      the answer is a 400 naming the field.
    */
    const source = await endpointSource();
    expect(source).toContain('Number.isSafeInteger(count)');
    expect(source).not.toContain("typeof payload.count === 'number'");
  });

  it('bounds the value in both directions', async () => {
    const source = await endpointSource();
    expect(source).toContain('occupancy < 0');
    expect(source).toContain('MAX_REPORTABLE_OCCUPANCY');
  });

  it('takes no member, and that is the difference from every sibling', async () => {
    /*
      `room-setting`, `room-ban`, `room-mute` and `room-permissions` all read `?email=` and require
      that member to be a presenter, because each carries out a person's decision. Nobody decided
      this one. Asserting the ABSENCE keeps that a stated design rather than an omission somebody
      later "fixes" by adding a gate that has no actor to check.
    */
    const source = await endpointSource();
    expect(source).not.toContain("searchParams.get('email')");
    expect(source).not.toContain('isRoomPresenter');
  });

  it('still refuses a suspended account, like its siblings', async () => {
    const source = await endpointSource();
    expect(source).toContain('ACCOUNT_ACTIVE');
    expect(source).toContain("error(404, 'Room not found')");
  });
});
