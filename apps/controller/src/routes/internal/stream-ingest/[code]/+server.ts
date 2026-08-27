import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ROOM_JWT_SECRET, STREAM_SERVER_MTX } from '$app/env/private';
import { getDb } from '#lib/server/db/index.js';
import { ACCOUNT_ACTIVE, accounts, roomUsers, rooms, users } from '#lib/server/db/schema.js';
import { isRoomPresenter } from '#lib/room-member-role.js';
import { verifyConfigWriteToken } from '#lib/server/room-handoff.js';
import { ingestPathFor, mintRoomIngestKey } from '#lib/server/stream-ingest.js';
import type { RequestHandler } from './$types';

/**
 * `POST /internal/stream-ingest/<shortCode>` — this is `getRTMPToken`.
 *
 * The reference's panel calls one admin command and gets one field back
 * (`main.d6d3c112b59b7d0d.js` byte 2169850):
 *
 * ```js
 * let i = yield e.appService.invokeAdminCmd('getRTMPToken');   // -> { rtmpToken }
 * ```
 *
 * Same command, same field name. What it additionally returns — `ingestPath`, `streamServerMTX`,
 * `configured` — is what the reference gets from `globals` that were populated by a different call
 * (`getStreamServers`, byte 2157400). Sending them together means the panel cannot render a link
 * built from a stale path.
 *
 * ## Why the ROOM cannot mint this
 *
 * This is a credential that grants publish access to a live room, and the room is the party asking.
 * Every authority decision here is made from data this database owns:
 *
 *  - **who they are** comes from `email`, which the room learned from the signed handoff it already
 *    verified — not from a claim in this request body;
 *  - **whether they may publish** is re-derived here from `room_users`. The room does not get to
 *    say "I am a presenter". That assertion was the 2026-08-07 privilege escalation and it is not
 *    coming back;
 *  - **what path they get** is CONSTRUCTED here from this room's own short code. If the caller
 *    supplied the path, a compromised or buggy room could mint a key for another room's path, and
 *    the media server — which trusts this answer completely — would honour it.
 *
 * ## Every call rotates
 *
 * There is no "fetch my existing token" mode, because the reference has none: `getNewToken()` and
 * the panel's first load both call the same command, and `mintRoomIngestKey` upserts. That makes
 * the semantics honest — a token is shown exactly once per request and the previous one dies. A
 * presenter who reloads the panel gets a new key and must re-paste it into OBS, which is the
 * reference's behaviour and is the safe direction to be wrong in.
 */
export const POST: RequestHandler = async ({ params, request }) => {
  const secret = ROOM_JWT_SECRET;
  if (!secret) {
    // Same posture as `room-config` and `room-entry`: fail loudly, and never name the private
    // variable in a response body.
    error(500, 'Stream ingest is not available.');
  }

  const presented = request.headers.get('authorization')?.replace(/^Bearer /, '');
  const verified = verifyConfigWriteToken(secret, params.code, presented);
  if (!verified.ok) {
    console.warn('[stream-ingest] rejected', { code: params.code, reason: verified.reason });
    error(401, 'Unauthorized.');
  }

  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.code)).limit(1);
  if (!room) error(404, 'Room not found');

  // A suspended account's rooms stop issuing publish credentials, for the same reason they stop
  // serving configuration: otherwise suspension locks the owner out of the controller while every
  // already-minted stream key keeps working.
  const [account] = await getDb()
    .select({ status: accounts.status })
    .from(accounts)
    .where(eq(accounts.id, room.accountId))
    .limit(1);
  if (!account || account.status !== ACCOUNT_ACTIVE) {
    console.warn('[stream-ingest] refused: account not active', {
      code: params.code,
      status: account?.status ?? 'missing'
    });
    error(404, 'Room not found');
  }

  const body = (await request.json()) as { email?: string };
  const email = String(body.email ?? '')
    .trim()
    .toLowerCase();
  if (!email) error(400, 'An email is required.');

  /*
    Deny by default.

    Not a member, or a member without presenter authority, gets the same 403 — a participant asking
    for a publish credential is not a different kind of failure from a stranger asking, and telling
    them apart tells an unauthenticated caller who is on the roster.

    The match is on the EMAIL, with no fallback. An earlier draft of this file ended
    `?? roomMembers[0]`, which under a typo'd address would have selected an arbitrary member of the
    room and then asked whether THEY may publish. The later equality check happened to refuse it,
    but a defence that only works because a second check catches it is one edit away from not
    working at all.
  */
  const member = (
    await getDb()
      .select({ roomUser: roomUsers, user: users })
      .from(roomUsers)
      .innerJoin(users, eq(roomUsers.userId, users.id))
      .where(eq(roomUsers.roomId, room.id))
  ).find((row) => row.user.email.trim().toLowerCase() === email);

  if (!member) {
    console.warn('[stream-ingest] refused: not a member', { code: params.code });
    error(403, 'Forbidden.');
  }
  if (!(member.roomUser.role === 0 || isRoomPresenter(member.roomUser))) {
    console.warn('[stream-ingest] refused: not a presenter', { code: params.code, role: member.roomUser.role });
    error(403, 'Forbidden.');
  }

  /*
    The path, built here from the room's own short code.

    The reference uses `globals.sessionID`; this application's stable per-room identifier on every
    internal route is the short code, so that is the value that takes its place. The mapping is a
    naming difference, not a behavioural one — what matters is that ONE identifier names the room on
    both sides of the media server, and that the presenter does not choose it.
  */
  const ingestPath = ingestPathFor(room.shortCode, member.user.displayName);
  const minted = await mintRoomIngestKey(secret, {
    roomId: room.id,
    userId: member.roomUser.userId,
    ingestPath
  });

  const host = STREAM_SERVER_MTX?.trim() ?? '';

  return json({
    /** The reference's field name, unchanged. The panel reads `rc.rtmpToken`. */
    rtmpToken: minted.rtmpToken,
    ingestPath: minted.ingestPath,
    /*
      Blank when the deployment has no media host. The room renders that as "not configured"
      rather than composing `http://:8889/…`, which is a link that looks real and cannot work.
    */
    streamServerMTX: host,
    configured: host !== ''
  });
};
