/**
 * Recording a visit to a room — the data behind the participant stats export.
 *
 * `TODO.md` item K. The reference's `exportStatsToCSV` writes `Name, Email, [Phone,] IP, In, Out,
 * Duration, isMobile, Browser`, and six of those come from its per-visit `statXrefs` records. This
 * module produces the equivalent rows.
 *
 * ## When a visit is recorded
 *
 * At the moment the controller mints a handoff, which is the only way into a room: an owner
 * launching from their account page, or a guest who has satisfied the room's own login. That
 * request is also the only place the IP and the user agent are visible to us — the room application
 * is behind a proxy on another host and sees neither the browser's original address nor our
 * account context.
 *
 * ## The two derived fields, and how far they can be trusted
 *
 * `isMobile` and `browser` come from parsing the `User-Agent` header, and a user agent is a string
 * the client chooses. Treat both as a **label a visitor supplied**, never as a security input.
 * Nothing in this codebase makes a decision from them; they exist so an owner can read their own
 * stats export, which is exactly what the reference uses them for.
 *
 * The parsing is deliberately small. A full UA database would be more precise and would be a
 * dependency, a licence and an update treadmill for two columns in a CSV. The order below is the
 * part that matters and is the usual trap: Edge and Opera both carry `Chrome` in their strings, and
 * Chrome carries `Safari`, so the most specific token has to win or every browser reads as Chrome.
 */
import { and, desc, eq, isNull } from 'drizzle-orm';
import { getDb } from './db';
import { roomSessions } from './db/schema';

export interface VisitorAgent {
  isMobile: boolean;
  browser: string;
}

/**
 * What browser this is, and whether it is a phone or tablet.
 *
 * @param userAgent the raw header; absent or empty yields `unknown`, never a guess
 */
export function parseUserAgent(userAgent: string | null | undefined): VisitorAgent {
  const ua = (userAgent ?? '').trim();
  if (!ua) return { isMobile: false, browser: 'unknown' };

  /*
    `Mobile` covers phones; `Tablet`, `iPad` and Android-without-`Mobile` cover tablets, which the
    room is explicitly built for as well ("mobile/tablet app"). Android tablets omit the `Mobile`
    token, which is the one non-obvious case and the reason this is not simply /Mobile/.
  */
  const isTablet = /\b(Tablet|iPad)\b/i.test(ua) || (/\bAndroid\b/i.test(ua) && !/\bMobile\b/i.test(ua));
  const isMobile = /\b(Mobile|iPhone|iPod|Android)\b/i.test(ua) || isTablet;

  /*
    Most specific first. Edge and Opera both contain `Chrome`; Chrome contains `Safari`. Reversing
    any pair here makes every browser report as the one below it, which is the classic way this
    function is written wrong and never noticed, because Chrome is the common case and looks right.
  */
  const browser = /\bEdg[A-Z]?\//.test(ua)
    ? 'Edge'
    : /\b(OPR|Opera)\//.test(ua)
      ? 'Opera'
      : /\bSamsungBrowser\//.test(ua)
        ? 'Samsung Internet'
        : /\bFirefox\//.test(ua)
          ? 'Firefox'
          : /\bChrome\//.test(ua)
            ? 'Chrome'
            : /\bSafari\//.test(ua)
              ? 'Safari'
              : 'unknown';

  return { isMobile, browser };
}

export interface RecordVisitInput {
  roomId: number;
  /** Null for a guest, who has no membership row here. */
  roomUserId: number | null;
  displayName: string;
  email: string;
  ip: string | null;
  userAgent: string | null;
}

/**
 * Opens a visit.
 *
 * Never throws into the caller: this runs on the entry path, and a stats row failing to write must
 * not stop somebody getting into the room they paid for. A lost row is a gap in a report; a thrown
 * error is a member staring at an error page.
 */
export async function recordVisit(input: RecordVisitInput, now: Date = new Date()): Promise<void> {
  const { isMobile, browser } = parseUserAgent(input.userAgent);

  try {
    await getDb()
      .insert(roomSessions)
      .values({
        roomId: input.roomId,
        roomUserId: input.roomUserId,
        displayName: input.displayName,
        email: input.email.trim().toLowerCase(),
        ip: input.ip,
        // Bounded: a header is attacker-controlled and this column is written on every entry.
        userAgent: input.userAgent ? input.userAgent.slice(0, 512) : null,
        isMobile,
        browser,
        joinedAt: now
      });
  } catch (cause) {
    console.error('[room-visit] could not record a visit; entry continues', cause);
  }
}

/**
 * Closes the most recent open visit for one person in one room.
 *
 * Keyed on room + email rather than on a session id, deliberately. The handoff token's claim set is
 * transcribed byte-for-byte from the reference (`{ name, email, id, type, issued, iat, exp }`) and
 * adding an id to it would break that match for a reporting feature — a bad trade. Room plus email
 * identifies the visit well enough, because a person cannot be in the same room twice at once in
 * any way this application can observe.
 *
 * Returns whether a row was closed, so a caller can tell "left" from "was never here" without a
 * second query.
 */
export async function closeVisit(roomId: number, email: string, now: Date = new Date()): Promise<boolean> {
  try {
    const db = getDb();
    const [open] = await db
      .select({ id: roomSessions.id })
      .from(roomSessions)
      .where(
        and(
          eq(roomSessions.roomId, roomId),
          eq(roomSessions.email, email.trim().toLowerCase()),
          isNull(roomSessions.leftAt)
        )
      )
      // Newest first: a stale open row from a crashed session must not swallow the close that
      // belongs to the visit happening now.
      .orderBy(desc(roomSessions.joinedAt))
      .limit(1);

    if (!open) return false;

    await db.update(roomSessions).set({ leftAt: now }).where(eq(roomSessions.id, open.id));
    return true;
  } catch (cause) {
    console.error('[room-visit] could not close a visit', cause);
    return false;
  }
}
