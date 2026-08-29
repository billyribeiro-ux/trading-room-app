import { error } from '@sveltejs/kit';
import { command } from '$app/server';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { presenterRoom, requireRoomMember } from '#lib/server/auth.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { users } from '#lib/server/db/schema.js';
import { storeUpload } from '#lib/server/file-storage.js';
import { publishRosterToRoom, publishToUsers, setRosterAvatar } from '#lib/server/room-events.js';

/*
  `adminUploadProfilePic` — a presenter sets one member's avatar.

  Both halves are captured. The presenter menu button `" Upload Profile Picture "` calls
  `adminUploadProfilePic($event)` at bytes 2,067,826 / 2,084,891, and the member applies it at
  `case "updateProfilePic"`, which sets BOTH `globals.preferences.profilePic` and
  `globals.user.profilePic` and then emits `preferenceChanged {key:"profilePic", value}`.

  ## A CORRECTION: this does NOT belong with the controller

  `TODO.md` row 9 and row 4 both say it does — *"a presenter setting a member's avatar is DURABLE, so
  it belongs with the controller like `writeRoomBan`"*. That was written without checking, and it is
  wrong.

  **The controller's `users` table has no avatar column.** `apps/controller/src/lib/server/db/schema.ts`
  gives it `id`, `email` and `display_name` and nothing else of the kind; the only avatar-shaped thing
  in that app is `gravatar.ts`, which DERIVES a URL from an email and stores nothing. The room's own
  `users.avatar_url` is the authority — it is the column `connection.ts` backfills, the column the
  roster reads, and the column every `senderAvatarUrl` in the chat log joins to.

  `room-ban` belongs with the controller because a ban is room CONFIGURATION, which the controller
  owns and serves back through `room-config`. An avatar is not configuration; it is a property of a
  person, and this application is where that person's row lives. Sending it to the controller would
  have meant inventing a column there to shadow one that already exists here.

  ## THE TENANCY CHECK IS THE NEW THING, and it is why `requireRoomMember` exists

  Every presenter command written before this one ends in `publishToUsers(room, [targetUserId], …)`.
  Delivery is scoped to the room's own subscriber map, so naming a stranger's id sends a frame nobody
  receives — the tenancy is enforced by the transport without anyone having to remember it.

  **This is the first that writes a durable row keyed on the target alone.** A row update is not
  scoped by a subscriber map. Without `requireRoomMember` a presenter of room A could set the avatar
  of a member of room B by guessing an integer, which is the 2026-08-07 escalation arriving through a
  feature instead of through a token. See that helper for why membership is a session rather than
  presence in the live roster.
*/

/**
 * Store the image, point the member's row at it, and tell the room.
 *
 * ## Three effects, in an order that is not arbitrary
 *
 * The row is written BEFORE either broadcast. A member whose page applied the new avatar from a
 * frame, then reloaded onto a row that still held the old one, would watch it revert — and would be
 * right to think the upload failed. The durable half first means every later read agrees with what
 * was just shown.
 *
 * The roster broadcast is separate from the addressed frame and both are needed. The addressed frame
 * updates the MEMBER'S OWN view of themselves, which is what upstream's `case "updateProfilePic"`
 * does; the roster refresh updates everybody ELSE'S view of them, which upstream gets for free
 * because its roster carries the URL and is re-pushed. Sending only the first leaves the whole room
 * looking at the old picture until something else happens to refresh them.
 */
export const uploadProfilePicture = command(
  z.strictObject({
    targetUserId: z.number().int().positive(),
    file: z.instanceof(File)
  }),
  async ({ targetUserId, file }) => {
    ensureDatabase();
    const room = presenterRoom();
    requireRoomMember(targetUserId, room);

    /*
      Checked here as well as by the schema, because `z.instanceof(File)` proves the TYPE and this
      proves the CONTENT TYPE. The same line and the same reasoning as `uploadComposerImage`: the
      picker restricts to images, and this is that restriction enforced where it cannot be edited out.
    */
    if (!file.type.startsWith('image/')) error(400, 'That is not an image.');

    let stored;
    try {
      stored = await storeUpload(file);
    } catch (cause) {
      // Loud, with the real reason - too large, or empty - rather than a silent no-op that looks
      // like a successful upload of nothing.
      error(400, cause instanceof Error ? cause.message : 'Upload failed.');
    }

    db.update(users).set({ avatarUrl: stored.url }).where(eq(users.id, targetUserId)).run();

    publishToUsers(room, [targetUserId], {
      channel: 'privCmds',
      data: { cmd: 'updateProfilePic', targetUserId, avatarUrl: stored.url }
    });

    /*
      EVERYBODY ELSE — and the patch before the publish is load-bearing, which the first draft of
      this file got wrong.

      `RosterUser.avatarUrl` is captured into the subscriber context at SUBSCRIBE TIME. Publishing
      the roster without patching it re-pushes the snapshot, so every other member keeps seeing the
      old picture until they happen to reconnect, while the durable row already disagrees. The
      comment here claimed the push carried the new URL; measuring `subscribeToRoom`'s context is
      what showed it did not.
    */
    setRosterAvatar(room, targetUserId, stored.url);
    publishRosterToRoom(room);

    return { avatarUrl: stored.url };
  }
);
