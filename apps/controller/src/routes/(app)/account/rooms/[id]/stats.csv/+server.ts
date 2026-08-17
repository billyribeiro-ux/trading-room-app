import { error } from '@sveltejs/kit';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '#lib/server/db/index.js';
import { roomSessions, roomUsers, rooms, users } from '#lib/server/db/schema.js';
import { requireOwnedRoom, requireUser } from '#lib/server/auth.js';
import { readSettings } from '#lib/server/rooms.js';
import { buildStatsCsv, statsFilename } from '#lib/stats-csv.js';
import type { RequestHandler } from './$types';

/**
 * `GET /account/rooms/<shortCode>/stats.csv` — the participant stats export, streamed.
 *
 * `TODO.md` item W. This file exists so that visit rows stop travelling in a page payload.
 *
 * ## What it replaces
 *
 * The manage page's loader selected up to 5,000 `room_sessions` rows and returned them as `visits`,
 * and the browser built the CSV from that array. Two independent reviews on 2026-08-11 flagged the
 * same line: ~755 KB of serialised rows on **every** load (the tab links are same-route anchors, so
 * clicking through six tabs refetched it six times), and every one of those rows carries a
 * visitor's **IP address and email**. Gating it on the Stats tab removed five sixths of the cost;
 * this removes the rest, because the addresses now never enter a page payload at all.
 *
 * ## Authority
 *
 * The same gate as the page: `requireUser` then `requireOwnedRoom`. A stats export is a list of who
 * was in somebody's room and from what address, so it gets the room's own ownership check and not a
 * weaker one. Addressed by short code like every other route here, and `requireOwnedRoom` is called
 * before anything is read.
 *
 * ## The 5,000 cap is gone, and that is deliberate
 *
 * The loader capped at 5,000 because an unbounded SELECT behind a PAGE LOAD is a slow-motion outage.
 * That reasoning does not apply to a file somebody asked for: truncating an export silently is worse
 * than a slow one, because the owner gets a file that looks complete and is not. `?limit=` is
 * honoured when supplied, so a caller can still bound it deliberately.
 */
export const GET: RequestHandler = async ({ params, locals, url }) => {
  const user = requireUser(locals);
  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.id)).limit(1);
  requireOwnedRoom(locals, room);
  if (!room) error(404, 'Room not found');

  const settings = (await readSettings(room.id)) as Record<string, unknown>;
  const withPhone = Boolean(settings.hasRequiredPhoneInLogin);

  /*
    An explicit bound only when asked for. Clamped rather than trusted: a caller passing a huge
    number would otherwise choose this process's memory ceiling for it.
  */
  const requested = Number(url.searchParams.get('limit'));
  const limit = Number.isFinite(requested) && requested > 0 ? Math.min(requested, 100_000) : null;

  const query = getDb()
    .select({
      displayName: roomSessions.displayName,
      email: roomSessions.email,
      ip: roomSessions.ip,
      isMobile: roomSessions.isMobile,
      browser: roomSessions.browser,
      joinedAt: roomSessions.joinedAt,
      leftAt: roomSessions.leftAt
    })
    .from(roomSessions)
    .where(eq(roomSessions.roomId, room.id))
    .orderBy(desc(roomSessions.joinedAt));

  const visits = limit ? await query.limit(limit) : await query;

  /*
    Phones, only when the room collects one — otherwise this is a second query for a column the file
    will not contain. Read from the MEMBERSHIP, because a visit has no phone of its own: a guest
    satisfies the room's login without ever having a membership row.
  */
  let phoneByEmail: Map<string, string> | undefined;
  if (withPhone) {
    const members = await getDb()
      .select({ email: users.email, phone: roomUsers.phone })
      .from(roomUsers)
      .innerJoin(users, eq(users.id, roomUsers.userId))
      .where(and(eq(roomUsers.roomId, room.id)));
    phoneByEmail = new Map(members.map((m) => [m.email.trim().toLowerCase(), m.phone ?? '']));
  }

  const csv = buildStatsCsv(visits, { withPhone, phoneByEmail });
  const filename = statsFilename(room.publicId ?? String(room.id), new Date());

  console.info('[stats-export]', {
    room: room.shortCode,
    by: user.email,
    rows: visits.length,
    withPhone
  });

  return new Response(csv, {
    headers: {
      // `charset=utf-8` because a display name can be any script, and the BOM-less default would
      // hand Excel mojibake for anything outside Latin-1.
      'content-type': 'text/csv;charset=utf-8',
      'content-disposition': `attachment; filename="${filename}"`,
      // A stats export is somebody's room membership and IP addresses. No shared cache anywhere may
      // hold it, and a browser re-request must reach us so the ownership check runs again.
      'cache-control': 'private, no-store'
    }
  });
};
