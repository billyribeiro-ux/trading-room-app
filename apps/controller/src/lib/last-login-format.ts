/**
 * The user list's Last Login stamp: `MM/DD/YYYY @ h:mmA`.
 *
 * The reference renders `08/07/2026 @ 5:05PM`. Ours called `toLocaleString()`, which renders the
 * VISITOR's locale — an owner in London saw `07/08/2026, 17:05` for the same instant, with the day
 * and month swapped and no meridiem. On a page whose whole purpose is telling an operator when
 * someone last logged in, a silently reordered date is worse than a missing one.
 *
 * The parts are assembled explicitly rather than pulled out of a formatted string with a regex.
 * Doing the latter is what once turned a date into `20-3341`.
 */
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * `MM/dd/yyyy` — AngularJS's `date:'MM/dd/yyyy'` filter, which the reference applies to all four
 * Stripe stamps in the user row (page.manageSession.html:372, 376, 380).
 *
 * Same reasoning as `formatLastLogin` below, and the same trap: this is a FIXED format, not a
 * locale-sensitive one. `toLocaleDateString()` would render `13/08/2026` for an owner in London and
 * `08/13/2026` for one in New York, and a billing date whose day and month swap depending on who is
 * looking is a support ticket waiting to happen.
 *
 * Local time, deliberately, matching the reference's filter. The stamps are `timestamptz`, so the
 * instant is unambiguous in the database; what an operator wants to see is the date in their own
 * day, which is what Angular's filter gives them.
 */
export function formatShortDate(at: Date | string | number): string {
  const d = new Date(at);
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`;
}

export function formatLastLogin(at: Date | string | number): string {
  const d = new Date(at);
  const hours = d.getHours();
  // 0 and 12 both map to 12 — midnight is 12AM, noon is 12PM, and `% 12` alone gives 0 for each.
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const meridiem = hours < 12 ? 'AM' : 'PM';
  /* Built on `formatShortDate` so the date half has ONE assembly path. Two copies of the same
     padding logic is how one of them drifts. */
  return `${formatShortDate(d)} @ ${hour12}:${pad(d.getMinutes())}${meridiem}`;
}

/**
 * AngularJS's `date:'short'` — `M/d/yy h:mm a`, e.g. `8/13/26 5:32 PM`.
 *
 * The admin-users table is the only place the reference uses this format
 * (`page.welcome.html:1294`, `{{au.created | date:'short'}}`), and it differs from every other
 * stamp on these pages in three ways: the month and day are NOT zero-padded, the year is TWO
 * digits, and there is a SPACE before the meridiem.
 *
 * Assembled explicitly, for the same reason `formatShortDate` is: `toLocaleString('en-US')` gets
 * close and then renders the visitor's locale, which is how an owner abroad reads a swapped date.
 */
export function formatShortDateTime(at: Date | string | number): string {
  const d = new Date(at);
  const hours = d.getHours();
  // 0 and 12 both map to 12 — midnight is 12 AM, noon is 12 PM.
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const meridiem = hours < 12 ? 'AM' : 'PM';
  const yy = String(d.getFullYear()).slice(-2);
  return `${d.getMonth() + 1}/${d.getDate()}/${yy} ${hour12}:${pad(d.getMinutes())} ${meridiem}`;
}
