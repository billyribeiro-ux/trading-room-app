import { error, redirect } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';
import { ROOM_BASE_URL, ROOM_JWT_SECRET } from '$app/env/private';
import { eq } from 'drizzle-orm';
import { getDb } from '#lib/server/db/index.js';
import { accounts, rooms } from '#lib/server/db/schema.js';
import { guestHandoffToken, handoffUrl } from '#lib/server/room-handoff.js';
import { recordVisit } from '#lib/server/room-visits.js';
import { redirectToConfiguredLocation } from '#lib/server/configured-redirect.js';
import { roomLaunchAuthorityMode } from '#lib/server/control-plane-runtime.js';
import { launchGuestRoomVisitInAuthority } from '#lib/server/room-visit-authority.js';
import type { PageServerLoad } from './$types';

/**
 * The guest's door into the live room.
 *
 * `/session/[code]` already enforces everything the reference enforces before entry — a name, a
 * valid email, `hasRequiredPhoneInLogin`, `nickFilter`, `webinarPW`, and the room being open — and
 * then set a `room_identity` cookie and sent the guest here. This page said "the room itself is a
 * separate application" and stopped, which was honest at the time and is no longer necessary.
 *
 * It now mints the same handoff `launch/[id]` mints and redirects into the room, so both doors end
 * in the same place holding the same kind of credential.
 *
 * The token is `type: 'guest'` and carries no account id. A guest satisfied the room's login
 * rules; they did not authenticate as an account here, and the room must be able to tell the
 * difference rather than inferring authority from the URL somebody arrived on.
 *
 * When `ROOM_BASE_URL` is blank this repository is serving the room itself, so the confirmation
 * page still renders — it is the destination in that configuration, not a placeholder.
 */
export const load: PageServerLoad = async ({ params, cookies, request, getClientAddress }) => {
  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.code)).limit(1);
  if (!room) error(404, 'Room not found');

  const raw = cookies.get('room_identity');
  if (!raw) redirect(303, `/session/${params.code}`);

  /*
    The whole identity is re-read and re-validated, not just `name`.

    This previously destructured `name` alone and defaulted it to the string "guest", so a cookie
    holding `{}` produced a page addressed to a person called guest. An email is needed to mint a
    token at all, and neither field is trustworthy just because it parsed.
  */
  let name = '';
  let email = '';
  let launchRequestId = '';
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'name' in parsed && 'email' in parsed) {
      name = String(parsed.name).trim();
      email = String(parsed.email).trim().toLowerCase();
      if ('launchRequestId' in parsed && typeof parsed.launchRequestId === 'string') {
        launchRequestId = parsed.launchRequestId;
      }
    }
  } catch {
    // A malformed cookie is not an identity; fall through to the redirect below.
  }

  if (!name || !email) {
    cookies.delete('room_identity', { path: '/' });
    redirect(303, `/session/${params.code}`);
  }

  /*
    Room state is re-checked here rather than trusted from the request that set the cookie.

    That cookie lives for 30 days. Without this, a guest who joined while the room was open could
    come back the next morning, land straight on this URL, and be handed a live token for a closed
    room having passed no check at all on this request.
  */
  if (room.state !== 'open') redirect(303, `/session/${params.code}`);

  if (roomLaunchAuthorityMode === 'rust') {
    const [account] = await getDb()
      .select({ authorityEnterpriseId: accounts.authorityEnterpriseId })
      .from(accounts)
      .where(eq(accounts.id, room.accountId))
      .limit(1);
    if (!account?.authorityEnterpriseId || !room.authorityRoomId || !room.authorityReconciledAt) {
      error(409, 'Room launch authority is not reconciled.');
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(launchRequestId)) {
      launchRequestId = randomUUID();
      cookies.set('room_identity', JSON.stringify({ name, email, launchRequestId }), {
        path: '/',
        httpOnly: false,
        sameSite: 'lax'
      });
    }
    let clientAddress: string | undefined;
    try {
      clientAddress = getClientAddress();
    } catch {
      // The Rust service treats missing attribution as unknown; an invented proxy address would be
      // more misleading than the absence.
    }
    const canonical = await launchGuestRoomVisitInAuthority({
      enterpriseId: account.authorityEnterpriseId,
      roomId: room.authorityRoomId,
      requestId: launchRequestId,
      email,
      displayName: name,
      clientAddress,
      userAgent: request.headers.get('user-agent')
    });
    if (!canonical.ok) {
      if (canonical.status === 403 || canonical.status === 404) error(canonical.status, 'Room entry was refused.');
      if (canonical.status === 429) error(429, 'Too many room entry attempts.');
      if (canonical.status === 400 || canonical.status === 409) error(409, canonical.message);
      error(503, 'Room launch authority is temporarily unavailable.');
    }
    if (
      canonical.data.roomId !== room.authorityRoomId ||
      canonical.data.shortCode !== room.shortCode ||
      canonical.data.email !== email ||
      canonical.data.displayName !== name
    ) {
      error(409, 'Room launch authority mapping is stale.');
    }
  } else {
    /* Legacy projection: guests do not have a controller membership row. */
    await recordVisit({
      roomId: room.id,
      roomUserId: null,
      displayName: name,
      email,
      ip: getClientAddress(),
      userAgent: request.headers.get('user-agent')
    });
  }

  if (ROOM_BASE_URL?.trim()) {
    const secret = ROOM_JWT_SECRET;
    if (!secret) error(500, 'Room launch is not configured.');

    const target = handoffUrl(ROOM_BASE_URL, room.shortCode, guestHandoffToken(secret, { name, email }));
    if (target) redirectToConfiguredLocation(target);
  }

  return { roomName: room.name, name };
};
