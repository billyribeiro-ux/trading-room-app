import { json, type RequestHandler } from '@sveltejs/kit';
import { redeemPairCode, validatePairRequest } from '#lib/server/mobile-pairing.js';

/**
 * `POST /api/mobile/pair` — the device-facing door, and the writer `push_tokens_json` never had.
 *
 * ```
 * POST /api/mobile/pair
 * { "room": "1001", "email": "dana@example.com", "pin": "418290",
 *   "token": "<fcm registration token>", "platform": "ios" }
 *
 * → 200 { "paired": true }
 * → 403 { "paired": false }
 * ```
 *
 * ## Why this is `/api/` and not `/internal/`
 *
 * `/internal/*` routes are server-to-server and carry the shared-secret MAC from
 * `room-handoff.ts`. This one is called by a **phone**, which by definition holds no secret before
 * it has paired — that is what pairing is for. The PIN is the credential, and everything that makes
 * a six-digit credential safe lives in `mobile-pairing.ts`: single use, five failures destroy it,
 * and the room and email must match as well.
 *
 * ## The response says nothing
 *
 * `{ paired: true }` or a 403, and never why. Wrong room, unknown email, expired code, wrong PIN,
 * exhausted attempts — one answer. Distinguishing them would turn this endpoint into a way to
 * discover which email addresses are members of which room, which is a membership list nobody
 * agreed to publish. The reason is logged instead, where the audience is us.
 *
 * ## What it deliberately does NOT do
 *
 * It does not issue a session, a device token or any other lasting credential, because nothing in
 * the evidence describes one and inventing an authentication scheme for a client that does not
 * exist yet is how you get a scheme the client cannot use. The app posts a PIN and gets registered;
 * when its FCM token rotates it pairs again. If that proves too coarse in practice, the fix is a
 * rotation endpoint proving possession of the CURRENT token — noted here so the next person does
 * not have to rediscover the question.
 */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    // Not JSON at all. Same refusal as everything else.
    return json({ paired: false }, { status: 403 });
  }

  const parsed = body && typeof body === 'object' ? validatePairRequest(body as Record<string, never>) : null;

  if (!parsed) {
    console.warn('[mobile-pair] refused', { reason: 'malformed', from: getClientAddress() });
    return json({ paired: false }, { status: 403 });
  }

  const result = await redeemPairCode(parsed);

  if (!result.ok) {
    /*
      The email is logged and the PIN is not.

      Diagnosing "my app will not pair" needs to know which member and which room; knowing which six
      digits were tried helps nobody and writes a live credential into the log.
    */
    console.warn('[mobile-pair] refused', {
      room: parsed.room,
      email: parsed.email,
      from: getClientAddress()
    });
    return json({ paired: false }, { status: 403 });
  }

  console.info('[mobile-pair] paired', {
    room: parsed.room,
    roomUserId: result.roomUserId,
    platform: parsed.platform,
    tokenCount: result.tokenCount,
    // Re-pairing an existing device is the common case; it should not read as a new one.
    replacedExisting: result.replacedExisting
  });

  return json({ paired: true });
};
