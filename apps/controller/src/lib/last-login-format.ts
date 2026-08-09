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
export function formatLastLogin(at: Date | string | number): string {
  const d = new Date(at);
  const pad = (n: number) => String(n).padStart(2, '0');
  const hours = d.getHours();
  // 0 and 12 both map to 12 — midnight is 12AM, noon is 12PM, and `% 12` alone gives 0 for each.
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const meridiem = hours < 12 ? 'AM' : 'PM';
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} @ ${hour12}:${pad(d.getMinutes())}${meridiem}`;
}
