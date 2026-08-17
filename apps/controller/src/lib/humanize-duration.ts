/**
 * The reference's duration string, for the participant stats CSV.
 *
 * Lives OUTSIDE `#lib/server` because both halves need it: the export runs in the browser, and
 * anything server-side that summarises a visit runs on the server. SvelteKit refuses a `#lib/server`
 * import from a component, and duplicating the thresholds is how two files quietly disagree about
 * what "an hour" means.
 *
 */
/**
 * `moment(out).from(in, true)` — "2 hours", "a few seconds".
 *
 * Reimplemented rather than pulling in moment for one column. The thresholds below are moment's own
 * `relativeTime` defaults, which is what makes the output match the reference's file rather than
 * merely resemble it.
 */
export function humanizeDuration(fromMs: number, toMs: number): string {
  const seconds = Math.round((toMs - fromMs) / 1000);
  if (!Number.isFinite(seconds) || seconds < 0) return 'N/A';

  if (seconds < 45) return 'a few seconds';
  if (seconds < 90) return 'a minute';

  const minutes = Math.round(seconds / 60);
  if (minutes < 45) return `${minutes} minutes`;
  if (minutes < 90) return 'an hour';

  const hours = Math.round(minutes / 60);
  if (hours < 22) return `${hours} hours`;

  const days = Math.round(hours / 24);
  if (days < 26) return days === 1 ? 'a day' : `${days} days`;

  const months = Math.round(days / 30);
  if (months < 11) return months === 1 ? 'a month' : `${months} months`;

  const years = Math.round(days / 365);
  return years === 1 ? 'a year' : `${years} years`;
}
