/**
 * The live mic/screen hand-over — `giveMicScreen`, decided on the server.
 *
 * `TODO.md` gap 22. Restarting the recipient's media was necessary and not sufficient: the SFU
 * decides who may produce from the GRANT's role, and `/api/media/grant` mints that from the
 * controller's membership. A member handed a microphone mid-session has no membership change, so a
 * rebuilt session re-minted the same `member` grant and the SFU answered `forbidden`.
 *
 * ## Why not just copy the reference
 *
 * Because the reference does it client-side. `giveMicScreen` sets `globals.user.isPresenter = true`
 * and the re-join computes `isP: isPresenter || hasCam || hasMic || hasScreen` from those globals —
 * the browser asserting its own authority. That is exactly what was removed on 2026-08-07, when the
 * room mapped a token type to `staff` and it turned out to be a privilege escalation.
 *
 * So the same outcome is produced with the decision on our side: the presenter's action writes a
 * row here — it is already gated to staff/admin and refuses a self-target — and the grant endpoint
 * reads it. The client is *told* what happened over the `cmds` channel so it can restart its media;
 * it never asserts it.
 *
 * ## Why not write it to the membership instead
 *
 * That is the OTHER mechanism, and the reference keeps them separate: `#permissionsModal` →
 * `saveCustomPerms()` → `changeUserPerms` is the durable one, and it is already ours on the
 * controller as `permissions_json`. Folding a live hand-over into it would make a transient act
 * permanent, and would mean a presenter granting somebody a microphone for one session had quietly
 * edited their standing permissions.
 */
import { and, eq, gt } from 'drizzle-orm';
import { db } from './db';
import { mediaElevations } from './db/schema';

/**
 * How long a hand-over lasts if nobody revokes it.
 *
 * The capture's dies with the browser's globals, so a reload silently takes the microphone back.
 * Ours survives one, deliberately — a member who refreshes mid-sentence should not lose the ability
 * to speak, and the server already knows the truth. This bounds a grant somebody forgot about: a
 * trading day, not for ever. An unbounded elevation is the kind of thing found years later.
 */
export const MEDIA_ELEVATION_TTL_MS = 12 * 60 * 60 * 1000;

/** Records a hand-over. Idempotent: re-granting refreshes the window rather than stacking rows. */
export function grantMediaElevation(
  roomShortCode: string,
  targetUserId: number,
  grantedByUserId: number,
  now: Date = new Date()
): void {
  revokeMediaElevation(roomShortCode, targetUserId);
  db.insert(mediaElevations)
    .values({
      roomShortCode,
      targetUserId,
      grantedByUserId,
      expiresAt: new Date(now.getTime() + MEDIA_ELEVATION_TTL_MS),
      createdAt: now
    })
    .run();
}

/**
 * Takes it away.
 *
 * Deletes rather than expiring in place: the row exists to answer one question, and a taken-away
 * elevation that lingers as a tombstone is a second state for `hasMic` to be read from wrongly.
 */
export function revokeMediaElevation(roomShortCode: string, targetUserId: number): void {
  db.delete(mediaElevations)
    .where(
      and(
        eq(mediaElevations.roomShortCode, roomShortCode),
        eq(mediaElevations.targetUserId, targetUserId)
      )
    )
    .run();
}

/**
 * Whether this member currently holds a live hand-over in this room.
 *
 * Read on the grant path, so it is one indexed lookup. The expiry is compared in SQL rather than in
 * JavaScript so an expired row can never be honoured by a process whose clock drifted after it read.
 */
export function hasMediaElevation(
  roomShortCode: string,
  targetUserId: number,
  now: Date = new Date()
): boolean {
  const rows = db
    .select({ id: mediaElevations.id })
    .from(mediaElevations)
    .where(
      and(
        eq(mediaElevations.roomShortCode, roomShortCode),
        eq(mediaElevations.targetUserId, targetUserId),
        gt(mediaElevations.expiresAt, now)
      )
    )
    .limit(1)
    .all();

  return rows.length > 0;
}
