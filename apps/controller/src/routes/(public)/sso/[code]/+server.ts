import { error, redirect } from '@sveltejs/kit';
import { ROOM_BASE_URL, ROOM_JWT_SECRET } from '$app/env/private';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { rooms } from '$lib/server/db/schema';
import { readSettings } from '$lib/server/rooms';
import { guestHandoffToken, handoffUrl } from '$lib/server/room-handoff';
import { evaluateEntitlement } from '$lib/server/sso-entitlement';
import { verifySsoToken, type SsoRejection } from '$lib/server/sso-token';
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
 * rules without authenticating as an account here. The room then resolves their role from its own
 * membership lookup by email and **fails closed to `member`** when there is none — so a customer's
 * site can grant entry and can never grant presenter.
 *
 * That is the security property worth protecting in every future change to this file: **entitlement
 * is delegated, authority is not.** If a customer's WordPress is compromised, the blast radius is
 * people getting into a room they did not pay for — not somebody arriving as staff.
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
  function refuse(reason: SsoRejection | 'room-closed' | 'not-configured' | 'no-match'): never {
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

  const secret = typeof settings.ssoJWTSecret === 'string' ? settings.ssoJWTSecret : '';
  const verified = verifySsoToken(secret, shortCode, url.searchParams.get('jwt'));
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
