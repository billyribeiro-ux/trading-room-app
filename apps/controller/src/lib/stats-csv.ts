import { humanizeDuration } from './humanize-duration';

/**
 * The participant-stats CSV, built once and used by the endpoint that streams it.
 *
 * `TODO.md` item W. This was assembled in the browser from `data.visits`, which meant the manage
 * page had to SHIP every visit row — up to 5,000 of them, each carrying a visitor's IP address and
 * email — into the page payload on every load, for a file that is produced only when somebody
 * clicks Export. Two reviews on 2026-08-11 flagged the same line for two different reasons: ~755 KB
 * of serialised rows, and personal data in the HTML of a page about branding colours.
 *
 * Moving it here means those addresses never enter a page payload at all. The CSV is generated on
 * the server, streamed as an attachment, and the rows are read at the moment they are asked for.
 *
 * ## Why the format lives in its own module rather than in the endpoint
 *
 * So there is exactly one copy of it. The nine columns and their formatting are transcribed from
 * the reference's own bundle (`dumps/export-controls-1786287657298.json`) and every detail below is
 * a decision that was read rather than chosen — the quoting, the `N/A`, the comma handling. A second
 * copy of that in a test fixture would be a second thing to keep true.
 */

/** Columns, from the reference's own header. `Phone` only when the room collects one. */
export const STATS_COLUMNS = ['Name', 'Email', 'Phone', 'IP', 'In', 'Out', 'Duration', 'isMobile', 'Browser'] as const;

export interface StatsVisit {
  displayName: string;
  email: string;
  ip: string | null;
  isMobile: boolean;
  browser: string | null;
  joinedAt: Date | string;
  leftAt: Date | string | null;
}

/**
 * A name, with commas turned into spaces.
 *
 * The reference does this rather than quoting, and the quoting is applied separately on top. Both
 * are reproduced: a name containing a comma would otherwise split into two columns in the file the
 * owner opens, which is the corruption this exists to prevent.
 */
export function csvName(value: string | null | undefined): string {
  return value && value.trim() ? value.trim().replaceAll(',', ' ') : 'n/a';
}

/**
 * `MM/DD/YYYY hh:mm a` — the reference's moment format, and its `N/A` for an absent time.
 *
 * An absent `Out` is a visit still in progress, not a broken row, and `N/A` is what the reference
 * itself renders for one.
 */
export function statsWhen(at: Date | string | null): string {
  if (!at) return 'N/A';
  const d = new Date(at);
  const hh = d.getHours() % 12 || 12;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(hh)}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'am' : 'pm'}`;
}

/**
 * The whole file, header included.
 *
 * `phoneByEmail` is passed in rather than looked up here because a phone lives on the MEMBERSHIP and
 * a visit may have none — a guest satisfies the room's login without ever having a membership row.
 * Keyed by lowercased email so a visit still exports after the person has been removed from the
 * room, which is the case the stats export exists to survive.
 */
export function buildStatsCsv(
  visits: StatsVisit[],
  options: { withPhone: boolean; phoneByEmail?: Map<string, string> }
): string {
  const { withPhone, phoneByEmail } = options;
  const header = STATS_COLUMNS.filter((c) => withPhone || c !== 'Phone').join(', ');
  const lines = [`${header}\r\n`];

  for (const visit of visits) {
    const inAt = new Date(visit.joinedAt);
    const outAt = visit.leftAt ? new Date(visit.leftAt) : null;
    const cells = [
      csvName(visit.displayName),
      visit.email.trim(),
      ...(withPhone ? [phoneByEmail?.get(visit.email.trim().toLowerCase()) ?? ''] : []),
      visit.ip ?? '',
      statsWhen(visit.joinedAt),
      statsWhen(visit.leftAt),
      // Only computed when both times exist, matching the reference's own `dur`.
      outAt ? humanizeDuration(inAt.getTime(), outAt.getTime()) : 'N/A',
      String(visit.isMobile),
      visit.browser ?? 'unknown'
    ];
    lines.push(cells.map((c) => `"${c}"`).join(',') + '\r\n');
  }

  return lines.join('');
}

/** `Participant_Stats_<uuid>_<Day Mon DD YYYY>.csv` — the reference's own name. */
export function statsFilename(roomUuid: string, now: Date): string {
  return `Participant_Stats_${roomUuid}_${now.toDateString()}.csv`;
}
