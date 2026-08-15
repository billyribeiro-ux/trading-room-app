import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import { z } from 'zod';
import { requireRoomShortCode, requireUser, isPresenterRole } from '$lib/server/auth';
import { db, ensureDatabase } from '$lib/server/db';
import { sharedFiles } from '$lib/server/db/schema';
import { storeUpload } from '$lib/server/file-storage';
import { consumeRateLimit } from '$lib/server/rate-limit';
import { readRoomConfig } from '$lib/server/room-config-client';
import { publishToRoom } from '$lib/server/room-events';

/*
  An image posted into chat, an alert, or a private message.

  ## Deliberately NOT in `files-pane.remote.ts`, and not `uploadFile`

  `uploadFile` backs the Files pane, which the capture gates presenter-only
  (`O(81, o.isP ? 81 : -1)`). Composer images use a different gate entirely — the same one that
  decides whether the button is even drawn:

  ```js
  (this.isPresenter || this.appService.globals.sessData.userUploads) && (this.canPostImages = !0)
  ```

  Routing composer uploads through the Files action refused every member with "Presenters only."
  while their own upload button sat right there, enabled. That is why this has a module of its own:
  every export of `files-pane.remote.ts` opens with `presenterRoom()`, and a function with a looser
  gate living among them is how a gate gets tightened by proximity — or loosened, which is worse.

  The capture posts these to an external CDN with NO server-side role check at all; the button's
  visibility IS the gate. Re-checking here rather than trusting the client is the one deliberate
  difference, and it is why the check reads the room's own setting rather than an environment
  variable — `PTR_USER_UPLOADS` was a process-wide switch standing in for a per-room one, so two
  rooms on one deployment could not disagree about it.

  ## `uploadFile` stays a form action, and that is not an oversight

  It is submitted from a real `<form>` in the Files-pane modal, so it degrades without JavaScript —
  which is exactly the case SvelteKit's own guidance says to prefer `form` for. This one has no
  form: it is driven by a paste and a drag-drop in the rich-text composer, so `command` is the
  honest flavour.
*/

/**
 * Stores one image and returns the url that will go in the message.
 *
 * ## The `File` crosses the wire as a real `File`, and that was READ before it was relied on
 *
 * `@sveltejs/kit@3.0.0-next.16`, `src/runtime/shared.js`: `stringify_command_arg` registers a
 * reducer that turns a `File` into `{ data: ArrayBuffer, name, type, size, lastModified }`, and the
 * matching reviver rebuilds it with `new File([data], name, meta)`. So `z.instanceof(File)` on the
 * server is checking a genuine `File`, not a shape that resembles one.
 *
 * What that costs, stated rather than discovered later: the bytes are base64 inside a JSON body,
 * which is roughly a third larger on the wire than the multipart body the form action sent. The
 * ceiling that matters is `storeUpload`'s own size limit, which is unchanged and still the thing
 * that refuses an over-large image — loudly, with the real reason.
 *
 * One request per image; `uploadComposerImages` loops and awaits each, the same shape the capture's
 * `doFileListUpload()` uses. The client keeps the loop.
 */
export const uploadComposerImage = command(
  z.strictObject({
    file: z.instanceof(File),
    /*
      The capture sends the display name alongside the blob rather than trusting the part's own
      filename, and `originalname` is what ends up in the row and on screen. Optional here because
      the fallback is `file.name`, which the revived `File` carries faithfully.
    */
    originalName: z.string().optional()
  }),
  async ({ file, originalName }) => {
    ensureDatabase();
    const { locals, request } = getRequestEvent();
    const user = requireUser(locals);
    const room = requireRoomShortCode(locals);

    // The room's own setting, asked of the controller — not an environment variable.
    const { settings } = await readRoomConfig(request, room, user.email);
    if (!isPresenterRole(user.role) && settings.userUploads !== true) {
      error(403, 'Image uploads are turned off for this room.');
    }

    if (!consumeRateLimit('message', user.id).allowed) {
      error(429, 'You are uploading too quickly.');
    }

    /*
      Checked here as well as by the schema, because `z.instanceof(File)` proves the TYPE and this
      proves the CONTENT TYPE. An `image/` prefix is what the composer's own picker restricts to,
      and this is that restriction enforced where it cannot be edited out.
    */
    if (!file.type.startsWith('image/')) error(400, 'That is not an image.');

    let stored;
    try {
      stored = await storeUpload(file);
    } catch (cause) {
      // Fail loud with the real reason — too large, or empty — rather than a silent no-op that
      // looks like a successful upload of nothing.
      error(400, cause instanceof Error ? cause.message : 'Upload failed.');
    }

    const row = db
      .insert(sharedFiles)
      .values({
        // The Files pane is per room, so an upload lands in the room it was made from.
        roomShortCode: room,
        name: (originalName ?? file.name).trim() || file.name,
        kind: stored.kind,
        url: stored.url,
        contentType: stored.contentType,
        size: stored.size,
        uploadedBy: user.id,
        createdAt: new Date()
      })
      .returning()
      .get();

    publishToRoom(room, { channel: 'cmds', data: { cmd: 'filesChanged' } });

    /*
      The URL, not the row. The only caller needs `file.url` and threw when it was missing; handing
      back the whole row exports the uploader's id and the room short code to every browser that
      pastes an image, for no consumer.
    */
    return row.url;
  }
);
