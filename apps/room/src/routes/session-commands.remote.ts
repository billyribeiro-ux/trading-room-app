import { command } from '$app/server';
import { z } from 'zod';
import { presenterRoom } from '#lib/server/auth.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { roomState } from '#lib/server/db/schema.js';
import { publishRosterToRoom, publishToRoom } from '#lib/server/room-events.js';

/*
  COMMANDS THAT ACT ON THE SESSION, rather than on a PERSON or a SCREEN.

  `presenter-commands.remote.ts` holds the two shapes that name a target — `{subCmd, targetUserId}`
  and `{screenId}` — and its docblock records why those two do not share a payload. These share
  neither: both take NO argument at all, because "refresh the roster" and "reset the media" are acts
  on the room itself. A third payload shape in that module would have made its opening paragraph
  wrong; a third module makes the distinction visible instead.

  Same gate, for the same reason. `presenterRoom()` decides the caller is a presenter AND returns the
  caller's own room in one call, so "may they" and "which room" cannot be applied separately. The
  2026-08-07 privilege escalation was exactly the mistake of letting a client answer either.

  ## Both controls raised a captured sentence and sent nothing

  `TODO.md` row 3, and it was the last pair of that family. The room's Session Control modal has run
  a purely LOCAL `invalidateAll()` behind both buttons since they were built, while telling the
  presenter a server command had gone out. The refetch does not do what either message promises: it
  re-reads this presenter's own page data and touches nobody else in the room.

  **The defect table said the honest fix was to correct the message.** That reading was wrong and is
  recorded here rather than quietly dropped: it was made without locating the senders. Both are in
  the bundle, both are ordinary server commands, and the behaviour each names is reproducible with
  code this room already has. Correcting the sentence would have been giving up a working feature to
  make a true statement about not having it.
*/

/**
 * `refreshRoster` — rebuild the user list for everybody in the room.
 *
 * ```js
 * refreshRoster() {
 *   this.appService.sendServerAdminCommand("refreshRoster", null),
 *   bootbox.alert("Command send OK. Please allow 1/2 minute for old entries to get deleted from the list")
 * }                                                                          // byte 2169139
 * ```
 *
 * and the button above it carries the room's own description of what the server does:
 * *"This clears the user list and forces all 'stale' connections out"*, with a `<strong>` warning
 * that *"It will take up to 1/2 minute for changes to take effect"* (byte 2148196).
 *
 * `null` is the payload upstream sends, so this takes no argument. `z.void()` rather than an empty
 * object: a command that accepts a body would invite one to be added, and there is nothing this act
 * could legitimately be scoped by other than the room, which the gate already decided.
 *
 * ## What "stale connections" means HERE, which is not what it means upstream
 *
 * Upstream sweeps on a timer — hence half a minute. This room does not need to and must not pretend
 * to: the roster IS the subscriber map, and a listener leaves it the moment its `ReadableStream` is
 * cancelled, which the runtime reports on disconnect. There is no separate set of dead rows to
 * collect.
 *
 * So the honest act is the OTHER half of that sentence — rebuild the list every client is holding —
 * and `publishRosterToRoom` is exactly it, redacting per recipient as it always does so a member
 * still does not receive presenters' emails or locations.
 *
 * **The captured alert is kept even though it promises a delay we do not have.** It over-states the
 * wait rather than the effect, the presenter sees the list correct itself sooner than told, and
 * inventing a replacement sentence would be inventing evidence. That choice is stated so the next
 * reader knows it was a choice.
 */
export const refreshRoster = command(z.void(), async () => {
  ensureDatabase();
  publishRosterToRoom(presenterRoom());
});

/**
 * `softReset` — every client drops its media and reconnects, staggered.
 *
 * The room's own description, on the button: *"Resets the media state of the room, Makes all users
 * reconnect to the media servers gently"*. **"Gently" is a measurement, not a mood** — see the jitter
 * below, which is the whole reason this is not just a reconnect.
 *
 * The server answers with `softResetDone` on the command channel, and the client half is two
 * subscribers read whole:
 *
 * ```js
 * case "softResetDone": this.appEventBus.emit("softResetDone"),
 *   let oe = 3e3 * Math.random();
 *   setTimeout(() => { this.send("getM…") }, oe)                             // byte 1023810
 *
 * subscribe("softResetDone", () => {
 *   this.globals.roomState.isRecording = !1,
 *   this.globals.isPresenter && (this.mediaSoupService.disableMic(), this.mediaSoupService.stopCam());
 *   for (let r of this.webcamingUsers) this.guiEventBus.emit("removeWebcamPresenter", r);
 *   for (let r of this.screenSharingUsers);            // ← empty statement, upstream
 *   this.disconnectAll(), this.handleTalkingString(),
 *   this.appEventBus.emit("screenBroadcastEnd")
 * })                                                                          // byte 1115967
 * ```
 *
 * **`3e3 * Math.random()` is the point.** Every client in the room is told at once; if every client
 * then re-consumed at once the SFU would take the whole room's reconnect as a single burst. Up to
 * three seconds of per-client jitter spreads it. A soft reset without that is a thundering herd
 * aimed at the one service the room cannot lose, which is why the receiver reproduces the delay
 * rather than treating it as incidental.
 *
 * **`for (let r of this.screenSharingUsers);` is an EMPTY STATEMENT and does nothing** — a loop with
 * a semicolon for a body. It is transcribed here because it is evidence of intent that was never
 * implemented upstream, and the next reader comparing our receiver against the capture should know
 * the screen half is absent THERE rather than missing HERE.
 *
 * BROADCAST, not addressed: this one genuinely is the whole room's business, unlike every command in
 * `presenter-commands.remote.ts` that names an individual.
 */
export const softReset = command(z.void(), async () => {
  ensureDatabase();
  publishToRoom(presenterRoom(), { channel: 'cmds', data: { cmd: 'softResetDone' } });
});

/**
 * `hardReset` — every client drops its media and RELOADS.
 *
 * The heavier sibling of `softReset`, and the difference is what the client does after: a soft reset
 * rebuilds the media session in place, a hard reset takes the whole page down and back up.
 *
 * Receiver, read whole at bundle bytes 2596540-2597340:
 *
 * ```js
 * subscribe("hardReset", () => { disconnectAll(),
 *   bootbox.alert("The room is being reset by an administrator. Click OK to continue...",
 *                 () => location.reload()) })
 * ```
 *
 * and the sender frame at byte 1013595 is `case "hardReset": emit("hardReset"), this.disconnect()`
 * — **emit THEN disconnect**, which is the opposite order to `changeUserPerms` two cases below it.
 * That asymmetry is upstream's and is reproduced rather than normalised; it reads correctly in both
 * directions, because a frame that must reach the screen cannot race its own transport being torn
 * down.
 *
 * ## What was actually missing, and it was not the receiver
 *
 * `TODO.md` row 10 recorded this as a missing RECEIVER for two sessions running. It is not:
 * `RoomDialogs.alertThen` has existed since `forceReload` was built, and the four upstream callback
 * receivers were already transcribed in that file. What was missing is a SENDER — the room's
 * `session-hard-reset` button wrote a PREFERENCE and told nobody, so every other client sat there
 * while the presenter's own page reloaded.
 *
 * The preference write STAYS. It is what makes the reset survive a client that was not connected to
 * hear the frame, and it is read by the next page load either way. This adds the half that reaches
 * the people who ARE connected.
 */
export const hardReset = command(z.void(), async () => {
  ensureDatabase();
  publishToRoom(presenterRoom(), { channel: 'cmds', data: { cmd: 'hardReset' } });
});

/**
 * `openSession` — the room has been opened; everybody waiting outside may come in.
 *
 * ```js
 * bootbox.alert("The session is now open, click here to reload the page and enter",
 *               () => location.reload())
 * ```
 *
 * with the sender at byte 1013476, `case "openSession": this.openSession()`.
 *
 * **The message is addressed to people who are NOT in the room yet**, which is what makes the reload
 * the whole point rather than a refresh: a member turned away by `isShutOutByRoomState` is sitting
 * on a refusal page, and the reload is what re-runs the door check that now says yes. So this frame
 * is worth sending even though every recipient is about to leave the page.
 *
 * Same as `hardReset`: the preference write stays and this is the half that reaches the connected.
 */
export const openSession = command(z.void(), async () => {
  ensureDatabase();
  publishToRoom(presenterRoom(), { channel: 'cmds', data: { cmd: 'openSession' } });
});

/**
 * `saveCloseMessage` — what a member is told when this room is closed.
 *
 * ## Two buttons offered to save it and neither did
 *
 * *" Just Save Close Message "* raised `Message Saved` and wrote nothing — its whole handler body was
 * one alert — and its sibling *" Save Message and Close Session "* only wrote `sessionOpen: false`,
 * so the message half of its own label was a lie too. Nothing in `apps/room/src` persisted a close
 * message at all, and `ModalHost.svelte` rendered the literal string `undefined` where the editor
 * belongs. `TODO.md` row 7(b) and row W both carried it.
 *
 * ## What is evidenced, and what is not
 *
 * EVIDENCED: the payload key `closedMsg`, the round trip, and the host element the reference binds
 * into — `#summernoteClosedMsg`, at bundle byte 2154583, a Summernote editor whose content is
 * `closedTxt`.
 *
 * NOT EVIDENCED, and stated rather than papered over: **where the reference's server keeps it.** That
 * server is not in the capture, so per-session against per-room, and which column, cannot be read out
 * of anything held here. This room keeps it per ROOM, on `room_state`, because that table is already
 * keyed that way and a message that reset at the end of every session is one the presenter would
 * rewrite on every close.
 *
 * NOT EVIDENCED EITHER: **where it is SHOWN.** The capture shows the editor, never the reader. This
 * room shows it on the refusal a closed room gives — `session/+page.server.ts`, in place of its own
 * "This room is closed." — which is a decision recorded as one. It is also what stops this being
 * storage nothing reads, which this repository forbids more firmly than it forbids a divergence.
 *
 * The message is stored as TEXT and rendered as TEXT. Upstream's host is a rich-text editor and this
 * room's field is a plain textarea: a close message is delivered inside an HTTP error body, and
 * sending presenter-authored HTML through that path would be an injection surface bought for
 * italics. Recorded so nobody "restores" the editor without moving the display first.
 */
export const saveCloseMessage = command(
  z.strictObject({
    /*
      Bounded and trimmed, in that order. This is presenter-authored text that ends up in a response
      body, so it gets a length it cannot exceed rather than being trusted. Empty is ALLOWED and is
      how a presenter clears it — the refusal then falls back to its own sentence, which is why the
      column is nullable rather than defaulted to ''.
    */
    message: z.string().trim().max(2000)
  }),
  async ({ message }) => {
    ensureDatabase();
    const room = presenterRoom();
    const now = new Date();
    db.insert(roomState)
      .values({ roomShortCode: room, closedMessage: message || null, updatedAt: now })
      /* One row per room; a second save UPDATES rather than appending a second opinion. */
      .onConflictDoUpdate({
        target: roomState.roomShortCode,
        set: { closedMessage: message || null, updatedAt: now }
      })
      .run();
  }
);
