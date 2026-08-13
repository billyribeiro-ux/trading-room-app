/**
 * `recorded_max_capacity` — the occupancy HIGH-WATER MARK, split out of `max_users`.
 *
 * ## The bug this fixes, and how the reference's own API documentation proved it
 *
 * `page.manageSession.html:10` renders one line in the panel title:
 *
 *     Current <i class="icon fa fa-user"></i>: {{sess.current_capacity}}
 *     / Max   <i class="icon fa fa-user"></i> {{sess.recordedMaxCapacity}}
 *
 * next to a `resetMaxCount()` button. Two different fields, and the reset clears the SECOND one.
 *
 * The reference's own API documentation — carried in this repository at
 * `src/lib/content/api-docs.ts:127-130`, transcribed from the original — lists **three** distinct
 * fields on a session, with example values that settle what each one means:
 *
 *     "current_capacity":     25    // live occupancy right now
 *     "current_max":         100    // the CONFIGURED capacity limit
 *     "recordedMaxCapacity": 150    // the high-water mark ever reached
 *
 * `recordedMaxCapacity` (150) EXCEEDS `current_max` (100) in the reference's own example, which is
 * only coherent if it is a recorded observation rather than a limit. So "Reset Counts" clears an
 * observation; it does not touch configuration.
 *
 * **We had all three collapsed into `max_users`, and `resetMaxCount` set THAT to 0.** So pressing a
 * button labelled "Reset Counts" destroyed the room's configured capacity limit — the same value
 * `internal/room-config/[code]` ships to the room. Nothing enforces it in the room today, which is
 * the only reason this has not caused an incident, and is exactly why it is worth fixing before
 * enforcement lands rather than after.
 *
 * ## Why a new column rather than renaming `max_users`
 *
 * `max_users` keeps its meaning — the configured limit, the reference's `current_max` — and it is
 * already read by `internal/room-config/[code]:127` and by the account page's `N / max` cell.
 * Renaming it would break both for no gain. The high-water mark is a genuinely different fact and
 * gets its own column.
 *
 * ## Column choice
 *
 * `INTEGER NOT NULL DEFAULT 0`, matching `max_users`. This is a COUNT of people, not money — the
 * repository's `BIGINT` rule is about `*_cents` values and does not apply. Zero is the honest value
 * for every existing room: none has ever had a high-water mark recorded, because until this
 * migration there was nowhere to record one.
 *
 * ## Nothing writes it yet, and that is recorded rather than papered over
 *
 * A high-water mark needs live occupancy, and the controller receives no occupancy signal — the room
 * service is the only thing that knows who is currently connected. So this column has a reader (the
 * panel title and the reset) and no writer until the room reports. That gap is T5-20 in
 * `docs/reference/evidence-gap-register.md`, with what it blocks.
 *
 * Deliberately NOT faked by substituting the roster size: the number of people who have ever
 * registered is not the number who were ever simultaneously present, and rendering one as the other
 * would be an invented value that looks right.
 */
export const sql = `
  ALTER TABLE rooms
    -- The peak simultaneous occupancy ever observed. Cleared by "Reset Counts", never by config.
    ADD COLUMN IF NOT EXISTS recorded_max_capacity INTEGER NOT NULL DEFAULT 0;
`;
