import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { alertSoundCommandValue } from '$lib/files-gates';
import { presenterRoom, requireUser } from '$lib/server/auth';
import { db, ensureDatabase } from '$lib/server/db';
import { sharedFiles } from '$lib/server/db/schema';
import { deleteStoredFile, storeUpload } from '$lib/server/file-storage';
import { publishToRoom } from '$lib/server/room-events';
import { writeRoomSetting } from '$lib/server/room-config-client';

/*
  The Files pane's three presenter acts: delete a file, play one to the room, make one the alert
  sound.

  ## Why these three are one module

  Not because they are all "file stuff". Because they share an invariant that was written out THREE
  times and could have been fixed in one copy and left wrong in the others: **the url must name a
  file THIS room holds.** `fileMediaCommand` and `overwriteCashRegisterSound` each carried their own
  `db.select().from(sharedFiles).where(and(eq(roomShortCode), eq(url)))`, and `deleteFile` carried
  the same predicate keyed by id. Without it, "a file this room holds" is any file on the
  deployment: a free-text url broadcast to every peer plays whatever the sender names on everyone's
  speakers, and the room's alert sound becomes any url a presenter cares to type.

  It is `roomFileByUrl` below now, declared once, and it returns the ROW — so the caller that needs
  the content type gets it from the same read that proved ownership rather than from a second one.

  They also share `presenterRoom()`, which is the gate and the tenant scope as one call.

  ## What they do NOT share, and why it is not an inconsistency

  `fileMediaCommand` broadcasts and persists nothing: `playMP3ForAll` is an EVENT — every browser
  plays a sound once and nothing about the room has changed. `overwriteCashRegisterSound` writes a
  room SETTING through to the controller and broadcasts nothing at all, because the page's
  five-second `invalidate('room:data')` re-reads it and every browser converges on the stored value
  rather than on a message it may have missed. The reference does not broadcast either — full.js
  line 3086 sets its own `globals.sessData` and leaves everyone else to the server.

  Widening one to carry the other would change what connected browsers believe and persist nothing,
  so the next reload would put the old sound back.

  ## `uploadComposerImage` is deliberately NOT here

  It is gated differently — `isPresenter || sessData.userUploads`, a room setting, not the presenter
  role — and putting it in a module whose every other export begins `presenterRoom()` is how a gate
  gets tightened by proximity. `composer-image.remote.ts`.

  `uploadFile` IS here, because it has this module's gate exactly: the Files pane's upload button is
  `O(81, o.isP ? 81 : -1)`, presenter-only.
*/

/**
 * The row for a url, if and only if this room holds it.
 *
 * Returns the ROW rather than a boolean: `overwriteCashRegisterSound` needs the content type, and a
 * second read to fetch it would be a second chance for the two to disagree.
 */
function roomFileByUrl(room: string, url: string) {
  return db
    .select()
    .from(sharedFiles)
    .where(and(eq(sharedFiles.roomShortCode, room), eq(sharedFiles.url, url)))
    .get();
}

/**
 * `deleteFile(name, id)` — a confirm, then one command per file, then `getSessionFiles()`.
 *
 * `deleteSelected()` is the same command in a loop over `#filesDriveList input:checked`, so both
 * share this and the client drives the loop. Presenter-only, matching `O(19, i.isP ? 19 : -1)` on
 * the row button and `O(77, o.isP ? 77 : -1)` on Delete Selected.
 *
 * ## The SELECT-then-DELETE became one statement, and that is a fix rather than a move
 *
 * The action read the row to learn its url, then deleted by the same predicate. Two statements with
 * a gap between them is the TOCTOU this repository's standard names explicitly: two presenters
 * pressing delete on the same file both read a row, both delete, and both call `deleteStoredFile`
 * on a path the first one already removed.
 *
 * One conditional `DELETE … RETURNING` closes it. Zero rows means somebody else won the race, and
 * the answer to that is the same 404 a file that never existed gets — because from this caller's
 * point of view they are the same fact.
 *
 * The blob goes only after the row is gone, and only when the row WAS gone by this call. The row is
 * the only reference to the bytes, so dropping it without them leaks a file on disk that nothing
 * can ever reach or clean up.
 */
export const deleteFile = command(
  z.strictObject({ fileId: z.number().int().positive() }),
  async ({ fileId }) => {
    ensureDatabase();
    const room = presenterRoom();

    const row = db
      .delete(sharedFiles)
      // Scoped, so a presenter cannot delete another room's file by naming its id.
      .where(and(eq(sharedFiles.roomShortCode, room), eq(sharedFiles.id, fileId)))
      .returning()
      .get();
    if (!row) error(404, 'No such file.');

    await deleteStoredFile(row.url);
    publishToRoom(room, { channel: 'cmds', data: { cmd: 'filesChanged' } });
  }
);

/**
 * `playMp3ForAll(e)` and `stopMp3ForAll()`, both `sendServerAdminCommand`:
 *
 * ```js
 * playMp3ForAll(e) { this.appService.sendServerAdminCommand('playMP3ForAll', { url: e }) }
 * stopMp3ForAll()  { this.appService.sendServerAdminCommand('stopMp3ForAll') }
 * ```
 *
 * The casing is the capture's and is NOT symmetric — `playMP3ForAll` with a capital `MP3`,
 * `stopMp3ForAll` without. Reproduced exactly, because the receiving switch matches on the literal
 * and "tidying" one of them into agreement with the other makes it a command nothing dispatches.
 *
 * `z.enum` is the allow-list that was two `!==` comparisons; an unknown string would reach every
 * client and be dispatched by none, which is a silent no-op dressed as a success.
 */
export const fileMediaCommand = command(
  z.strictObject({
    cmd: z.enum(['playMP3ForAll', 'stopMp3ForAll']),
    url: z.string().optional()
  }),
  async ({ cmd, url }) => {
    ensureDatabase();
    const room = presenterRoom();

    if (cmd === 'stopMp3ForAll') {
      publishToRoom(room, { channel: 'cmds', data: { cmd } });
      return;
    }

    // Only a file this room actually holds — see the module comment for what this is guarding.
    const playable = url ?? '';
    if (!roomFileByUrl(room, playable)) error(400, 'No such file.');

    publishToRoom(room, { channel: 'cmds', data: { cmd, url: playable } });
  }
);

/**
 * `overwriteCashRegisterSound(url, on)` — the Files pane's two `set-alert-sound-btn` buttons.
 *
 * ```js
 * overwriteCashRegisterSound(e, i) {
 *   this.appService.sendServerAdminCommand('overwriteCashRegisterSound', { url: i ? e : '' });
 *   this.appService.globals.sessData.overwriteCashRegisterSound = i ? e : '';
 * }
 * ```
 *
 * `on` is the reference's second argument: true from "Set as alert sound", false from "Remove as
 * alert sound". It is a real `z.boolean()` now rather than the string `'true'`/`'false'` the form
 * body carried — the action compared against the exact strings precisely so an unrecognised value
 * could not fall through to "remove" and silently clear the room's sound, and a typed boolean is
 * that same refusal enforced by the schema instead of by hand.
 *
 * Presenter-only here, and presenter-only AGAIN on the controller: `internal/room-setting` re-checks
 * that the named member is the owner or a true presenter of that room, because a remote command is
 * not the only way to reach an HTTP endpoint.
 */
export const overwriteCashRegisterSound = command(
  z.strictObject({ url: z.string(), on: z.boolean() }),
  async ({ url, on }) => {
    ensureDatabase();
    const room = presenterRoom();
    const { locals } = getRequestEvent();

    if (on) {
      const known = roomFileByUrl(room, url);
      if (!known) error(400, 'No such file.');
      // The same test the row's own gate applies (`contentType.indexOf('audio/') >= 0`). A pdf set
      // as the alert sound is a room whose alerts are silent, with nothing on screen saying why.
      if (known.contentType.indexOf('audio/') < 0) error(400, 'That file is not a sound.');
    }

    try {
      await writeRoomSetting(
        room,
        requireUser(locals).email,
        'overwriteCashRegisterSound',
        // Removing sends the EMPTY STRING, exactly as the reference does — not the url being
        // removed, and not an absent field.
        alertSoundCommandValue(url, on)
      );
    } catch (cause) {
      // Loud. A button that changes its own label while the setting did not move is the defect this
      // whole path exists to avoid.
      console.error('[overwriteCashRegisterSound] the controller refused the write', cause);
      error(502, 'Could not change the alert sound right now.');
    }
  }
);

/**
 * The Files pane's upload, one file per call.
 *
 * ## It was NOT a progressive form, and a comment of mine said it was
 *
 * When `uploadComposerImage` was converted, both this file's pointer in `+page.server.ts` and
 * `composer-image.remote.ts` said `uploadFile` stayed an action because it was "submitted from a
 * real `<form>` and degrades without JavaScript". That was wrong, and it was written without opening
 * `ModalHost.svelte`. `doFileListUpload` is a JS-driven loop over a queue with a per-file status
 * line and a collected failure list — there is no form and nothing degrades. Both comments are
 * corrected; this note stays because a wrong reason that shipped is worth more to the next reader
 * than a right one that was always there.
 *
 * ## One request per file, and the client keeps the loop
 *
 * `doFileListUpload()` iterates and awaits each, which is the capture's own shape. The loop stays on
 * the client because that is where the per-file status line and the "which one failed" list live.
 *
 * Returns nothing. The caller only ever asked whether it succeeded, and a rejection answers that.
 */
export const uploadFile = command(
  z.strictObject({
    file: z.instanceof(File),
    /*
      The capture sends the display name alongside the blob rather than trusting the part's own
      filename; `originalname` is what ends up in the row and on screen. Kept as a separate field for
      that reason, and bounded because it is rendered in every reader's Files pane.
    */
    originalName: z.string().trim().min(1).max(255)
  }),
  async ({ file, originalName }) => {
    ensureDatabase();
    const room = presenterRoom();
    const { locals } = getRequestEvent();

    let stored;
    try {
      stored = await storeUpload(file);
    } catch (cause) {
      // Fail loud with the real reason — too large, or empty — rather than a silent no-op that looks
      // like a successful upload of nothing.
      error(400, cause instanceof Error ? cause.message : 'Upload failed.');
    }

    db.insert(sharedFiles)
      .values({
        // The Files pane is per room, so an upload lands in the room it was made from.
        roomShortCode: room,
        name: originalName,
        kind: stored.kind,
        url: stored.url,
        contentType: stored.contentType,
        size: stored.size,
        uploadedBy: requireUser(locals).id,
        createdAt: new Date()
      })
      .run();

    /*
      Everyone's Files pane is stale the moment this lands. `getSessionFiles()` is what the capture
      calls after its own upload, and this is the equivalent for the other peers in the room.
    */
    publishToRoom(room, { channel: 'cmds', data: { cmd: 'filesChanged' } });
  }
);
