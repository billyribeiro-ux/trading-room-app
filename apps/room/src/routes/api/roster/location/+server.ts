/**
 * Records this connection's city line on the roster.
 *
 * The reference resolves a member's location in the BROWSER — `reallyfreegeoip.org` over JSONP —
 * and rides the result into its `userLoggedIn` command at join, where it lands beside the IP under
 * `privData`. This endpoint is the equivalent seam here.
 *
 * ## Why it arrives after subscribe rather than with it
 *
 * The lookup is a third-party call with no SLA. Blocking the room's event stream on it would mean a
 * slow or unreachable geolocation host delays every message in the room, which is a far worse
 * failure than a roster line appearing a moment late. So the browser subscribes first and posts the
 * answer when it has one.
 *
 * ## What this deliberately does NOT do
 *
 * It does not resolve the location from the request's own IP. That would be more reliable, cheaper
 * and better for the member's privacy — and it is a different product, because the reference's
 * value is whatever the member's browser was told. Moving it server-side is recorded as an
 * improvement, not smuggled in here.
 */
import { json } from '@sveltejs/kit';
import { requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { publishRosterToRoom, setRosterLocation } from '#lib/server/room-events.js';
import type { RequestHandler } from './$types';

/**
 * `"Waterbury, CT, US"` is 17 characters; 120 is generous for any real answer and short enough that
 * a hostile client cannot use the roster as storage. Truncated rather than rejected, because a long
 * value is a malformed lookup rather than an attack worth a 400.
 */
const MAX_LOCATION = 120;

/**
 * Control characters are stripped, not escaped.
 *
 * This string is rendered into every presenter's roster. Svelte escapes markup on the way out, so
 * this is not the XSS boundary — but a newline or a bidi override in a roster row is a display
 * defect a member can inflict on a presenter, and there is no legitimate location containing one.
 */
function cleanLocation(value: unknown): string {
  return (
    String(value ?? '')
      // eslint-disable-next-line no-control-regex
      .replace(/[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e]/g, '')
      .trim()
      .slice(0, MAX_LOCATION)
  );
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const user = requireUser(locals);
  const room = requireRoomShortCode(locals);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ message: 'Expected a JSON body.' }, { status: 400 });
  }

  const locStr = cleanLocation(
    body && typeof body === 'object' ? (body as Record<string, unknown>).locStr : ''
  );

  // Nothing changed — a second tab reporting the same answer, or a lookup that returned nothing.
  if (!setRosterLocation(room, user.id, locStr)) {
    return json({ ok: true, applied: false }, { headers: { 'cache-control': 'no-store' } });
  }

  /*
    Republish the roster so presenters already in the room see the line without reloading.

    The whole roster, not a delta: `getRoster` is how every other change reaches the sidebar, and a
    second message shape for one field would be two ways of updating one list.
  */
  publishRosterToRoom(room);

  return json({ ok: true, applied: true }, { headers: { 'cache-control': 'no-store' } });
};
