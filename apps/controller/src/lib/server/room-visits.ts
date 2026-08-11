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

/*
  Column bounds for the three fields a visitor controls.

  `userAgent` was already bounded here — "a header is attacker-controlled and this column is written
  on every entry" — and the same sentence is true of the other three, which the review of
  2026-08-11 pointed out. The identity does NOT arrive from a trusted place: `/session/[code]`
  writes `room_identity` with `httpOnly: false` and it is plain JSON, so a request can carry any
  name and email it likes. `display_name` and `email` are bare `TEXT` in `0007-room-sessions.js`,
  so a 64 KB name was a 64 KB row on a public path.

  254 is the RFC 5321 maximum length of a forward path, so no deliverable address is truncated.
  45 is the longest textual IPv6 address (the IPv4-mapped form). 200 for a display name is generous
  against every name this product has seen and still bounds the column.
*/
const MAX_DISPLAY_NAME = 200;
const MAX_EMAIL = 254;
const MAX_IP = 45;

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
  const email = input.email.trim().toLowerCase().slice(0, MAX_EMAIL);

  try {
    /*
      One OPEN visit per person per room, which is what bounds this table on a public path.

      `/session/[code]/joined` calls this on a page load that needs only a `room_identity` cookie,
      and that cookie is `httpOnly: false` plain JSON — so a loop of requests wrote a row per
      request into a table on the production database, with no rate limit anywhere in front of it
      (`hooks.server.ts` has none, and the controller is serverless so an in-process limiter would
      not hold anyway). Capping the column widths above bounds each row; this bounds the COUNT.

      It is not merely a mitigation, it is what the data model already says: a person cannot be in
      one room twice at once, `closeVisit` looks up "the open row for one person", and
      `0007-room-sessions.js` created `room_sessions_open_idx ON (room_id, email) WHERE
      left_at IS NULL` for exactly this lookup. A genuine re-entry still gets its own row, because
      leaving closes the previous one — "one row per ARRIVAL" is unchanged.

      Checked rather than enforced by a unique index deliberately: a partial UNIQUE index would make
      a duplicate arrival throw, and this function's whole contract is that it never throws into the
      entry path. The race between this SELECT and the INSERT costs at most one extra row, which is
      the same outcome as not checking, so the cheap check is the right one.
    */
    const [alreadyOpen] = await getDb()
      .select({ id: roomSessions.id })
      .from(roomSessions)
      .where(and(eq(roomSessions.roomId, input.roomId), eq(roomSessions.email, email), isNull(roomSessions.leftAt)))
      .limit(1);
    if (alreadyOpen) return;

    await getDb()
      .insert(roomSessions)
      .values({
        roomId: input.roomId,
        roomUserId: input.roomUserId,
        // Every one of these is bounded, and every one of them is attacker-controlled on the
        // `/joined` path. See the constants above for where each limit comes from.
        displayName: input.displayName.slice(0, MAX_DISPLAY_NAME),
        email,
        ip: input.ip ? input.ip.slice(0, MAX_IP) : null,
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
