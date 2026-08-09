/**
 * Rooms created before `open` was the creation state are opened.
 *
 * ## Why these rows are artifacts, not data
 *
 * `rooms.state` had a default of `closed`, and `provisionRoom` and the clone action both wrote
 * `closed` explicitly. NOTHING in this application ever writes `open`: there is no open/close
 * control on the account page, none on the manage page, and no action that touches the column. The
 * only reader is the account page's State chip; the only other mention is a `count(*) filter` on
 * the admin dashboard.
 *
 * So a room created before this could never leave `closed` — not by any route a person has. The
 * value was not a decision anybody made about those rooms; it was a default nobody could change.
 *
 * ## Why `open`
 *
 * It is the only state ever observed. The one room in the captures reads "open" in its State cell
 * while holding 0 of 2 users (`login-page/logged-in-page:465`), which also settles what the word
 * means: an empty room is open. It is the resting state of a room that exists and is not archived,
 * not an indicator that a session is live.
 *
 * ## Why this is safe to run once and never again
 *
 * It is scoped to `state = 'closed'`, and from now on nothing creates a room in that state. If a
 * real open/close control is added later, rooms an owner has deliberately closed will hold `closed`
 * legitimately — and this migration will already have run, so it cannot reopen them.
 */
export const sql = `
  UPDATE rooms SET state = 'open' WHERE state = 'closed';
`;
