import { error, redirect } from '@sveltejs/kit';
import { ROOM_BASE_URL, ROOM_JWT_SECRET } from '$app/env/private';
import { and, eq } from 'drizzle-orm';
import { getDb } from '#lib/server/db/index.js';
import { roomUsers, rooms, users } from '#lib/server/db/schema.js';
import { readSettings } from '#lib/server/rooms.js';
import { isRoomPresenter } from '#lib/room-member-role.js';
import { guestHandoffToken, handoffUrl } from '#lib/server/room-handoff.js';
import { evaluateEntitlement } from '#lib/server/sso-entitlement.js';
import { resolveMaxTokenAge, verifySsoToken, type SsoRejection } from '#lib/server/sso-token.js';
import type { RequestHandler } from './$types';

/**
 * `GET /sso/<shortCode>?jwt=<HS256 JWT>` — the WordPress door into a room.
 *
 * The third and last way in, beside an owner launching from their account page and a guest passing
 * the room's own login. A customer runs WordPress with WooCommerce; WooCommerce knows whether the
 * subscription is paid; their plugin signs an assertion with the room's `ssoJWTSecret` and sends the
 * visitor here. We check the signature, apply the room's entitlement filters, and — if both pass —
 * mint the **same** handoff the other two doors mint and redirect into the room.
 *
 * ## Why this ends in `guestHandoffToken`
 *
 * A WordPress visitor has no account in this controller, and inventing one would be inventing
 * authority. `type: 'guest'` with an empty `id` is precisely true: they satisfied a room's entry
 * rules without authenticating as an account here.
 *
 * The security property worth protecting in every future change to this file: **entitlement is
 * delegated, authority is not.** If a customer's WordPress is compromised, the blast radius is
 * people getting into a room they did not pay for — not somebody arriving as staff.
 *
 * ## How that is ENFORCED, and why the enforcement is not free
 *
 * It does not follow from `type: 'guest'`, and until 2026-08-11 this docblock claimed it did. The
 * room deliberately ignores the token's type when deciding role and looks the membership up by
 * email alone (`apps/room/src/routes/session/+server.ts:94` and `:125`), so a token signed with a
 * PRESENTER'S address arrived holding presenter authority — signature valid, entitlement satisfied,
 * staff on the other side. Found by the adversarial review of 2026-08-11.
 *
 * So the door now refuses any address that holds staff authority in the room, computed the same way
 * `/internal/room-config/[code]` computes it. **Staff do not enter through a customer's key**; they
 * use the controller's own login, where the authority comes from an account we authenticate. The
 * cost is real and accepted: a presenter who is also a subscriber cannot use the SSO link.
 *
 * ## Failure is quiet to the caller and loud in the log
 *
 * Every rejection returns the same thing, because naming the failed check would turn this endpoint
 * into an oracle for probing a customer's signing key. The room's own settings decide what the
 * visitor sees:
 *
 *   `loginErrorURL`  redirect there — a customer's own "your subscription has lapsed" page
 *   `loginErrorMsg`  otherwise, show this text
 *
 * Both already exist in the schema and `loginErrorMsg` is already consumed by the room-login page,
 * so a room configured for one door behaves consistently at the other.
 *
 * ## The query parameter is `jwt`, and that is our choice
 *
 * The reference's shortcode carried `key=''` and `mode='urlv3'`, which tells us a token travelled in
 * the URL but not what the parameter was called — no captured SSO request exists in any dump. `jwt`
 * is chosen for being unambiguous, and recorded here as a decision rather than a transcription so
 * nobody later "corrects" it toward something that was never observed.
 */

/** One message for every refusal. Which check failed is for the log, not the browser. */
const REFUSAL = 'You do not have access to this room. Please check your subscription and try again.';

export const GET: RequestHandler = async ({ params, url, getClientAddress }) => {
  const shortCode = params.code;

  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, shortCode)).limit(1);
  if (!room) error(404, 'Room not found');

  const settings = await readSettings(room.id);

  /*
    Refusals funnel through here so that every one of them is logged with its reason and answered
    with the same words. The `loginErrorURL` redirect is the customer's own page — a lapsed-payment
    explanation we cannot write for them — and takes precedence over our message when configured.
  */
  // A function DECLARATION, not a `const` arrow: TypeScript only treats a call as never-returning
  // — and so only narrows `verified` to the ok branch below — when the call target is a function
  // declaration or a `const` carrying an explicit type annotation. The arrow form compiles and
  // silently stops narrowing, which surfaces as a confusing error at `verified.claims`.
  function refuse(reason: SsoRejection | 'room-closed' | 'not-configured' | 'no-match' | 'staff-address'): never {
    console.warn('[sso] refused', {
      room: shortCode,
      reason,
      // The address, not the token: a rejected token still belongs to somebody and may be valid
      // elsewhere. The reason plus the source is enough to diagnose an integration.
      from: getClientAddress()
    });

    const target = typeof settings.loginErrorURL === 'string' ? settings.loginErrorURL.trim() : '';
    if (target) redirect(303, target);

    const message = typeof settings.loginErrorMsg === 'string' ? settings.loginErrorMsg.trim() : '';
    error(403, message || REFUSAL);
  }

  /*
    Room state before signature.

    Deliberately the cheap check first HERE, unlike the verifier's signature-before-claims ordering:
    whether a room is open is not a secret — the guest login already reveals it to anyone with the
    code — so there is no oracle to protect, and refusing early avoids an HMAC per probe.
  */
  if (room.state !== 'open') refuse('room-closed');

  /*
    How stale an assertion this room tolerates.

    The customer's site controls the token's own `exp`; the room owner controls this. Both must
    pass, which is what stops a site minting year-long tokens from turning "is this subscription
    paid?" into "was it paid at some point last year".

    Anything the owner typed that we could not read, or had to cap, is logged once per entry rather
    than swallowed — a settings box that silently does nothing is the exact complaint that produced
    the `wired` flag in the first place.
  */
  const maxAge = resolveMaxTokenAge(settings.tokenExpiresIn);
  if (maxAge.source === 'unparsed' || maxAge.source === 'clamped') {
    console.warn('[sso] tokenExpiresIn', {
      room: shortCode,
      configured: settings.tokenExpiresIn,
      applied: maxAge.seconds,
      outcome: maxAge.source
    });
  }

  const secret = typeof settings.ssoJWTSecret === 'string' ? settings.ssoJWTSecret : '';
  const verified = verifySsoToken(secret, shortCode, url.searchParams.get('jwt'), {
    maxAgeSeconds: maxAge.seconds
  });
  if (!verified.ok) refuse(verified.reason);

  const decision = evaluateEntitlement(
    {
      allowedMemberships: typeof settings.allowedMemberships === 'string' ? settings.allowedMemberships : null,
      allowedProducts: typeof settings.allowedProducts === 'string' ? settings.allowedProducts : null,
      allowedPerms: typeof settings.allowedPerms === 'string' ? settings.allowedPerms : null
    },
    {
      memberships: verified.claims.memberships,
      products: verified.claims.products,
      permissions: verified.claims.permissions
    }
  );
  if (!decision.allowed) refuse('no-match');

  /*
    Admission is logged, not just refusal.

    "On what basis was this person let in" is the question that gets asked months later, and it
    cannot be answered from a log that only records failures. `matchedOn` is the filter entry that
    opened the door, which is exactly what an owner disputing access needs to see.
  */
  console.info('[sso] admitted', {
    room: shortCode,
    email: verified.claims.email,
    basis: decision.reason === 'matched' ? decision.matchedOn : 'no-filters-configured'
  });

  if (!ROOM_BASE_URL?.trim()) {
    // No separate room application is configured, so there is nothing to hand off to. This is a
    // deployment mistake rather than a visitor's problem, and it must not read as "access denied".
    console.error('[sso] ROOM_BASE_URL is not configured; cannot complete a handoff');
    error(500, 'This room is not available right now.');
  }
  if (!ROOM_JWT_SECRET) {
    console.error('[sso] ROOM_JWT_SECRET is not configured; refusing to mint a handoff');
    error(500, 'This room is not available right now.');
  }

  /*
    The door refuses anyone the ROOM would treat as staff. This is the enforcement of the invariant
    stated at the top of this file, which until 2026-08-11 was only asserted.

    The claim was that a customer's site "can grant entry and can never grant presenter". It was
    false. The room resolves role from the email alone — `readRoomConfig(request, shortCode,
    claims.email)` then `roomRoleFor(membership)` at `apps/room/src/routes/session/+server.ts:94`
    and `:125` — and deliberately ignores the token's `type` when deciding it. So a compromised
    WordPress, a malicious WP admin, or a leaked `wp-config.php` could sign a token carrying a
    PRESENTER'S email and arrive holding presenter commands, archives, admin chat, ban and kick.
    Signature valid, entitlement satisfied, staff on the other side.

    `isP` is computed here exactly as `/internal/room-config/[code]` computes it for the room —
    `role === 0 || isRoomPresenter(roomUser)` — because agreeing with the room is the entire point.
    Two spellings of "is this person staff" is how the two ends stop agreeing.

    This is a deliberate product decision, not only a mitigation: **staff do not enter through a
    customer's key.** A presenter reaches their own room through the controller's own login, where
    the authority comes from an account we authenticate. The cost is that a presenter who is also a
    WooCommerce subscriber cannot use the SSO link, and that is the correct trade — it is the one
    case where the delegated-entitlement model would otherwise delegate authority too.

    Refused through `refuse()` like every other check, so it returns the SAME words, honours the
    room's `loginErrorURL`/`loginErrorMsg`, and is logged with its own reason. A distinct message
    here would turn the door into an oracle for enumerating a room's staff by address.
  */
  const [staffMatch] = await getDb()
    .select({ role: roomUsers.role, nonPresenter: roomUsers.nonPresenter })
    .from(roomUsers)
    .innerJoin(users, eq(users.id, roomUsers.userId))
    .where(and(eq(roomUsers.roomId, room.id), eq(users.email, verified.claims.email)))
    .limit(1);

  if (
    staffMatch &&
    (staffMatch.role === 0 ||
      isRoomPresenter({
        role: staffMatch.role,
        nonPresenter: staffMatch.nonPresenter,
        isFreeTrial: false
      }))
  ) {
    refuse('staff-address');
  }

  const target = handoffUrl(
    ROOM_BASE_URL,
    room.shortCode,
    guestHandoffToken(ROOM_JWT_SECRET, {
      name: verified.claims.name,
      email: verified.claims.email
    })
  );
  if (!target) error(500, 'This room is not available right now.');

  redirect(303, target.toString());
};
