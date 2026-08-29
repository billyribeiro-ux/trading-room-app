import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ROOM_JWT_SECRET } from '$app/env/private';
import { getDb } from '#lib/server/db/index.js';
import { rooms, roomUsers, users } from '#lib/server/db/schema.js';
import { readSettings, sendTestPushToMember } from '#lib/server/rooms.js';
import { FcmNotConfigured } from '#lib/server/fcm.js';
import { verifyConfigReadToken } from '#lib/server/room-handoff.js';
import type { RequestHandler } from './$types';

/**
 * `POST /internal/mobile-restore/<shortCode>` — the room's `restoreMobileAppTokens`.
 *
 * ## What the reference does, and what it can possibly mean here
 *
 * The room client's whole implementation is two statements, at bundle byte 2,444,920:
 *
 * ```js
 * restoreMobileAppTokens(){
 *   this.appService.sendServerCommand("restoreMobileAppTokens",{}),
 *   bootbox.alert("Command sent successfully, check your mobile device for a test notification")
 * }
 * ```
 *
 * **It sends no payload at all** — the server identifies the caller from the socket session — and
 * there is no inbound handler anywhere in the bundle (the switch at 1,020,600–1,022,200 was read in
 * full). So the reference's server is not in evidence and its behaviour has to be derived from the
 * one thing that is: the button's own copy, which promises *"restore your mobile app connectivity
 * and get a test notification on your device"*, shown to somebody who *"is not getting
 * notifications"*.
 *
 * With a token store, that has exactly one honest meaning: **push to every registration this member
 * has, and drop the ones the push proves are dead.** A registration that FCM answers `UNREGISTERED`
 * for is a device that uninstalled or reinstalled the app, and a stale one sitting in the list is
 * the ordinary reason a member stops getting notifications. Removing it IS the restoration.
 *
 * ## Nothing here is new machinery, and that is deliberate
 *
 * `sendTestPushToMember` already does this — real pushes, per-registration outcomes, and the prune —
 * and has since the Manage page grew its "send test" control. A second implementation would be a
 * second place for the prune rule to drift from FCM's outcome vocabulary. This route is the
 * membership lookup, the two gates, and that call.
 *
 * `listFcmRegistrations` is its sibling and is NOT what this wants: it runs the same sweep with
 * `dryRun: true`, which validates the tokens without buzzing anything. That is the right answer for
 * a diagnostic table on an admin page and the wrong one for a button that promises the member a
 * notification.
 *
 * ## Why `config-read` and not `config-write`
 *
 * The capability split is about the room's CONFIGURATION: `internal/room-ban`,
 * `internal/room-permissions` and `internal/room-setting` changed a room's stored settings from the
 * room, and they take `config-write`. This changes no setting. It is the same shape as
 * `internal/mobile-pin` beside it — a POST, on demand, for one named member, reached only when that
 * member presses a button — and it takes the same capability for the same reason.
 *
 * It is not read-only, and that is worth stating rather than glossing: it sends a notification and
 * it can delete a dead registration. Both are consequences of the member asking about their own
 * device, and neither is reachable for anybody else — the email is checked against a membership of
 * THIS room before anything happens.
 *
 * ## The two gates are the pin route's, applied for the same reasons
 *
 * A room with no app configured has nothing to restore, and a trial account that may not pair the
 * app may not push to one either. Both are re-checked here rather than trusted from the room,
 * because this endpoint is reachable with the shared secret and a URL — a hidden button is not an
 * authorization check.
 */
export const POST: RequestHandler = async ({ params, request, url }) => {
  const secret = ROOM_JWT_SECRET;
  if (!secret) error(500, 'Room configuration is not available.');

  const presented = request.headers.get('authorization')?.replace(/^Bearer /, '');
  const verified = verifyConfigReadToken(secret, params.code, presented);
  if (!verified.ok) {
    console.warn('[mobile-restore] rejected', { code: params.code, reason: verified.reason });
    error(401, 'Unauthorized.');
  }

  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.code)).limit(1);
  if (!room) error(404, 'Room not found');

  const settings = await readSettings(room.id);
  const appEnabled = settings.ptrMobileAppEnabled === true || settings.customMobileAppEnabled === true;
  if (!appEnabled) error(409, 'This room has no mobile app configured.');

  const email = url.searchParams.get('email')?.trim().toLowerCase();
  if (!email) error(400, 'A member is required.');

  const membership = (
    await getDb()
      .select({ roomUser: roomUsers, user: users })
      .from(roomUsers)
      .innerJoin(users, eq(roomUsers.userId, users.id))
      .where(eq(roomUsers.roomId, room.id))
  ).find((row) => row.user.email.trim().toLowerCase() === email);

  // A guest has no membership row, so no registrations and nothing to restore.
  if (!membership) error(404, 'Not a member of this room.');

  if (membership.roomUser.isFreeTrial && settings.freeTrialsGetApp !== true) {
    error(403, 'Trial accounts cannot pair the app in this room.');
  }

  try {
    const result = await sendTestPushToMember(room.id, membership.roomUser.id);
    /*
      The per-registration `results` array is NOT returned. It carries a platform and the last six
      characters of each token, which is exactly enough for the Manage page's table and is nobody
      else's business — the room renders a sentence, and a sentence needs counts. Returning the
      detail "because it is there" would put device fingerprints into a room response that a member
      triggers about themselves.
    */
    return json({
      registrations: result.registrations,
      sent: result.sent,
      failed: result.failed,
      pruned: result.pruned
    });
  } catch (cause) {
    if (cause instanceof FcmNotConfigured) {
      // 503 and not 500: the deployment has no push credentials, which is a configuration state
      // rather than a fault, and the room turns it into a sentence a member can act on.
      error(503, 'Push notifications are not configured for this deployment.');
    }
    throw cause;
  }
};
