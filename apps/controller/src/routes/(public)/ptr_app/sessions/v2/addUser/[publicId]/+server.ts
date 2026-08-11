import { error, json } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { rooms } from '$lib/server/db/schema';
import { inviteRoomUser, readSettings } from '$lib/server/rooms';
import type { RequestHandler } from './$types';

/**
 * `GET /ptr_app/sessions/v2/addUser/<publicId>/?sec=<pairSecretKey>&email=…&name=…`
 *
 * `TODO.md` item X — the self-serve pairing link. The path, the parameter names and the two literal
 * placeholders are transcribed from the reference's own manage view, not designed here:
 *
 * ```html
 * <input type="text" class="form-control col-md-6" id="pairURLLink" readonly="readonly"
 *   value="https://chat.protradingroom.com/ptr_app/sessions/v2/addUser/{{sess._id}}/?sec={{sess.pairSecretKey}}&email=__userEmail__&name=__userName__">
 * ```
 *
 * `evidence-page.manageSession.html:1141`, gated at `:1138` by
 * `ng-show="sess.hasAppPairLink && sess.pairSecretKey"` — the reference shows the link only when the
 * checkbox is on AND a secret exists, and this endpoint enforces the same pair as a precondition.
 *
 * ## The one divergence: the HOST
 *
 * The reference serves this from `chat.protradingroom.com` — the room. Ours is on the controller,
 * because in this product the controller owns memberships and the room does not: a `room_users` row
 * lives in the controller's PostgreSQL, and the room app reads it over `/internal/room-config`. An
 * endpoint on the room host would have to call back here anyway. The PATH is matched exactly so the
 * link an owner already has in their systems keeps the shape they know.
 *
 * ## What this is, honestly
 *
 * A **room-scoped bearer secret in a URL**. Anyone holding the link can add any address to that
 * room, and URLs leak — into referrers, proxy logs, browser history and shoulders. That is the
 * reference's design, and reproducing it is the point of the exercise; what is NOT reproduced is any
 * ambiguity about its limits:
 *
 *  * it can only ever create a **plain member** — never a presenter, never an admin, never a
 *    permission. `inviteRoomUser` writes role 2 and this handler passes it nothing else;
 *  * it is off unless the owner turns it on AND sets a secret;
 *  * the secret is compared in constant time, so the endpoint cannot be used to recover it a byte
 *    at a time;
 *  * every refusal returns the same 403 with the same words, so it is not an oracle for which of
 *    the four possible reasons applied.
 *
 * ## The secret's format is NOT invented
 *
 * `sec=` came back **empty** in the 2026-08-11 capture, because that room has no `pairSecretKey`
 * set — so no populated key has ever been observed. Nothing here assumes a length, an alphabet or an
 * encoding. It is compared as the opaque bytes the owner typed, and a short one is the owner's
 * choice to make rather than ours to reject with a rule we cannot source.
 */

/** One message for every refusal. Which check failed is for the log, not the caller. */
const REFUSAL = 'This link is not valid for this room.';

/** Constant-time over the presented bytes, so a mismatch cannot be timed. */
function secretMatches(configured: string, presented: string): boolean {
  const a = Buffer.from(configured, 'utf8');
  const b = Buffer.from(presented, 'utf8');
  // `timingSafeEqual` throws on a length mismatch, which would itself be a timing signal — compare
  // a fixed-width digest-shaped pair instead by padding to the longer of the two.
  const width = Math.max(a.length, b.length, 1);
  const left = Buffer.alloc(width);
  const right = Buffer.alloc(width);
  a.copy(left);
  b.copy(right);
  return timingSafeEqual(left, right) && a.length === b.length;
}

export const GET: RequestHandler = async ({ params, url, getClientAddress }) => {
  const refuse = (reason: string): never => {
    console.warn('[app-pair] refused', {
      room: params.publicId,
      reason,
      // The address, not the secret: a rejected secret still belongs to somebody's room.
      from: getClientAddress()
    });
    error(403, REFUSAL);
  };

  const [room] = await getDb().select().from(rooms).where(eq(rooms.publicId, params.publicId)).limit(1);
  // Same answer as a wrong secret. Otherwise this enumerates which public ids are real rooms.
  if (!room) refuse('no such room');

  const settings = (await readSettings(room.id)) as Record<string, unknown>;
  const enabled = settings.hasAppPairLink === true || settings.hasAppPairLink === 'true';
  const configured = typeof settings.pairSecretKey === 'string' ? settings.pairSecretKey.trim() : '';

  // The reference's own gate, at `:1138`: the link is shown only when BOTH hold, so both are
  // required here. An enabled room with no secret is not "open" — it is unconfigured.
  if (!enabled) refuse('hasAppPairLink is off');
  if (!configured) refuse('no pairSecretKey is set');

  const presented = url.searchParams.get('sec') ?? '';
  if (!presented || !secretMatches(configured, presented)) refuse('secret mismatch');

  /*
    The placeholders are LITERAL in the sample link — `__userEmail__` and `__userName__` — so an
    owner who pastes it unedited arrives here with those exact strings. Refusing them by name turns
    the most likely mistake into a clear one instead of a member called `__userName__`.
  */
  const email = (url.searchParams.get('email') ?? '').trim().toLowerCase();
  const name = (url.searchParams.get('name') ?? '').trim();
  if (!email || email === '__useremail__') refuse('email is missing or still the placeholder');
  if (email.length > 254 || !email.includes('@')) refuse('email is not an address');
  if (name === '__userName__') refuse('name is still the placeholder');

  /*
    `inviteRoomUser` is the SAME path the manage page's own invite uses. It creates the account when
    there is none, with no password — the member sets one on first sign-in — and writes role 2.
    Reusing it is what guarantees this door cannot mint a membership the manage page could not.
  */
  const displayName = name.slice(0, 200) || email.split('@')[0];
  await inviteRoomUser(room.id, displayName, email);

  console.info('[app-pair] added', { room: room.shortCode, email });

  /*
    JSON, not a redirect. The reference has a separate `Pair OK Redirect` setting for where a human
    should land, and that is a different feature from what this endpoint returns; inventing a
    redirect target here would be inventing that setting's semantics. A caller that wants a
    destination has one to configure.
  */
  return json({ ok: true, room: room.shortCode, email });
};
