/**
 * Room codes come from a sequence, so a deleted room's code is never handed out again.
 *
 * ## The defect
 *
 * `allocateShortCode` picked a random 4-digit number and rejected it only if a LIVE room already
 * held it. Deleting a room therefore returned its code to the pool, and a later room could be
 * issued the same one — which is exactly what was reported: a freshly created room wearing the
 * number of the room that had just been deleted.
 *
 * That is worse than untidy. A room code is what a member types to get in, what appears in a launch
 * URL, and what people paste to each other. Reissuing it silently points yesterday's link at
 * somebody else's room.
 *
 * ## Why a sequence, and why monotonic
 *
 * Every room code observed in the captures is 4 digits and the two that exist are TWO APART —
 * `3625` (ptr2.json, and the Sessions table's Name cell "Room 3625") and `3627`
 * (`login-page/logged-in-page:472`, `?id=3627`). Two samples are not proof of a counter, and this
 * comment does not claim they are; what they are is the ONLY evidence available, and they are
 * consistent with monotonic allocation and improbable under random selection from 9,000 values.
 * Randomness, by contrast, has no evidence behind it at all — it was invented here.
 *
 * A Postgres sequence is the one mechanism that keeps issuing new values regardless of what is in
 * `rooms`, so `DELETE` cannot recycle anything.
 *
 * ## Starting value
 *
 * Above every code already issued, so adopting this cannot collide with a room that exists. On an
 * empty database that is 1000, the smallest 4-digit code. `setval` with `is_called = true` means
 * the NEXT value is one past the maximum, not the maximum itself.
 *
 * Codes stay 4 digits until 9999 and then become 5. That is a widening, not a wrap: no code is ever
 * reused, and `short_code` is TEXT, so nothing overflows. The alternative — wrapping back to 1000 —
 * would reintroduce the exact bug this removes.
 */
export const sql = `
  CREATE SEQUENCE IF NOT EXISTS room_short_code_seq AS BIGINT START WITH 1000 MINVALUE 1000;

  SELECT setval(
    'room_short_code_seq',
    GREATEST(
      1000,
      COALESCE((SELECT MAX(short_code::BIGINT) FROM rooms WHERE short_code ~ '^[0-9]+$'), 0)
    ),
    true
  );
`;
