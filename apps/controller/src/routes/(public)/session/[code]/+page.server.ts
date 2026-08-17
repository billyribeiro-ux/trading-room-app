import { error, fail, redirect } from '@sveltejs/kit';
import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '#lib/server/db/index.js';
import { rooms } from '#lib/server/db/schema.js';
import { readSettings } from '#lib/server/rooms.js';
import { resolveRoomConfig } from '#lib/room-config.js';
import { decideRoomEntry, type RoomEntrySettings } from '#lib/room-entry.js';
import { ROOM_BASE_URL } from '$app/env/private';
import type { Actions, PageServerLoad } from './$types';

const IDENTITY = 'room_identity';

type RoomIdentity = { name: string; email: string };

const gravatar = (email: string) =>
  `https://www.gravatar.com/avatar/${createHash('md5').update(email.trim().toLowerCase()).digest('hex')}?d=mm`;

function readRoomIdentity(raw: string | undefined): RoomIdentity | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !('name' in parsed) || !('email' in parsed)) {
      return null;
    }

    const name = String(parsed.name).trim();
    const email = String(parsed.email).trim().toLowerCase();
    return name && email ? { name, email } : null;
  } catch {
    return null;
  }
}

export const load: PageServerLoad = async ({ params, cookies, locals }) => {
  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.code)).limit(1);
  if (!room) error(404, 'Room not found');

  /*
    THE ROOM OWNS THE FORM. This door hands over rather than asking the same questions first.

    The reference has exactly ONE login form and it lives in the room: `/session?id=<uuid>` renders
    `app-session-login`, which collects the name, the email, the phone and the room password. This
    application grew its own copy while the room had none, and once the room got its page back
    (2026-08-14) a guest met TWO forms for one entry — ours and then the room's.

    So a configured deployment sends them to the room, with the room short code and no token: a
    guest has not authenticated with anything here, and minting a credential for somebody who has
    answered no questions would be inventing an authority rather than passing one on. The room
    collects the answers and asks `internal/room-entry` — which runs `decideRoomEntry`, the same
    function this file's action calls — so the rules are enforced in one place either way.

    When `ROOM_BASE_URL` is blank this repository IS the room, so the form below still renders. That
    is the same fallback `launch/[id]` uses, and it is why the action underneath is kept rather than
    deleted.
  */
  if (ROOM_BASE_URL?.trim()) {
    const target = new URL('/session', ROOM_BASE_URL);
    target.searchParams.set('id', room.shortCode);
    redirect(303, target.toString());
  }

  // The screen the guest sees is decided by the room's settings, exactly as the
  // reference does it — resolveRoomConfig applies policy/default precedence.
  const resolved = resolveRoomConfig(await readSettings(room.id));

  const raw = cookies.get(IDENTITY);
  const cookieIdentity = readRoomIdentity(raw);
  // The authenticated controller session is the identity authority. A remembered
  // room guest is only a fallback; it must never replace the account that just
  // launched the room from the controller.
  const accountIdentity = locals.user ? { name: locals.user.displayName, email: locals.user.email } : null;
  const identity = accountIdentity ?? cookieIdentity;
  if (raw && !cookieIdentity) {
    // A malformed cookie is not an identity. Remove it so later requests do not
    // keep reparsing attacker-controlled or stale data.
    cookies.delete(IDENTITY, { path: '/' });
  }
  const known = identity ? { ...identity, gravatar: gravatar(identity.email) } : null;

  return {
    roomName: room.name,
    roomCode: room.shortCode,
    roomState: room.state,
    settings: resolved.values,
    known
  };
};

export const actions: Actions = {
  default: async ({ request, params, cookies, locals, url, getClientAddress }) => {
    const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.code)).limit(1);
    if (!room) error(404, 'Room not found');

    const settings = resolveRoomConfig(await readSettings(room.id)).values as RoomEntrySettings;
    const form = await request.formData();
    const name = String(form.get('name') ?? '').trim();
    const storedIdentity = readRoomIdentity(cookies.get(IDENTITY));
    const email = String(form.get('email') ?? locals.user?.email ?? storedIdentity?.email ?? '')
      .trim()
      .toLowerCase();
    const remember = form.get('remember') === 'on';

    /*
      One decision, in `#lib/room-entry.js`, rather than a run of ad-hoc checks here.

      What was here enforced four of the room's rules and got one of them wrong: it demanded
      `webinarPW` in EVERY auth mode, when the reference only offers a room password under
      `authMode=='webinarRoom' || allowPWLoginWithSSO`. An `open` room carrying a stale password in
      its settings blob refused everybody, and the owner had no field in the UI to clear it.

      `decideRoomEntry` also adds the gates that were simply absent: `isLocked`, `banIPList`,
      `secTok`, `customEnterDisclosure`, the two additional room passwords, and the free-trial
      password — which admits AND marks the member as a trial. `loginErrorURL` is honoured here
      too, so a room can send a refused visitor somewhere of its own.
    */
    const decision = decideRoomEntry(settings, {
      name,
      email,
      phone: String(form.get('phone') ?? '').trim(),
      password: String(form.get('password') ?? ''),
      secretToken: String(form.get('secTok') ?? url.searchParams.get('secTok') ?? ''),
      agreedToDisclosure: form.get('disclosure') === 'on',
      remoteIp: getClientAddress(),
      roomState: room.state
    });

    if (!decision.ok) {
      // A room that sets `loginErrorURL` wants its own page, not ours.
      if (decision.redirectTo) redirect(303, decision.redirectTo);
      return fail(400, { error: decision.message });
    }

    /*
      `decision.asFreeTrial` is computed and, for now, cannot be acted on.

      The free-trial password admits somebody AND marks their membership as a trial — that is what
      drives the `TRIAL` badge, `isFT`, "Only select from Trials?" and `disablePMForTrials`. But a
      guest has no membership row to mark: nothing creates one until the guest-join path exists
      (OUTSTANDING §1.1), and the room is not deployed to hand off to.

      It is deliberately NOT smuggled through the identity cookie. That cookie is client-controlled,
      so a visitor could promote or demote their own trial status by editing it, and a fabricated
      route for a value nothing reads is worse than an honest gap. Recorded in OUTSTANDING instead.
    */
    if (decision.asFreeTrial) {
      console.info('[session] admitted by the free-trial password', {
        room: room.shortCode,
        pendingMembership: true
      });
    }

    if (remember) {
      cookies.set(IDENTITY, JSON.stringify({ name, email }), {
        path: '/',
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30
      });
    }

    // Entry succeeds. The room itself is a separate application; this hands off
    // rather than pretending to render a room that does not live here.
    redirect(303, `/session/${room.shortCode}/joined`);
  }
};
