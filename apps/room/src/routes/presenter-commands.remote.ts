import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import { z } from 'zod';
import { presenterRoom, requireUser } from '#lib/server/auth.js';
import { ensureDatabase } from '#lib/server/db/index.js';
import { grantMediaElevation, revokeMediaElevation } from '#lib/server/media-elevation.js';
import { publishToRoom, publishToUsers } from '#lib/server/room-events.js';

/*
  A presenter commands the room: mute somebody's mic, or pull everybody to one screen.

  Both broadcast on the `cmds` channel, both are refused to non-presenters, and both scope the
  broadcast to the caller's own room — which is why they are one module. What they do NOT share is a
  payload, and that separation is load-bearing rather than incidental:

    `presenterCommand`  names a PERSON  — `{subCmd, targetUserId}`, target validated as an integer
    `focusOnScreen`     names a SCREEN  — `{screenId}`, a string

  `focus-on-screen-contract.test.ts` exists because folding the second into the first was tried and
  is wrong: `presenterCommand` refuses anything without an integer target, so carrying a screen id
  through it would have meant loosening a check to fit a payload it was never for. Two shapes, two
  schemas — and now one gate and one room scope, written once instead of twice.

  THE GATE IS THE POINT OF THE MODULE. Both actions previously inlined
  `requireUser(locals).role === 'staff' || requireUser(locals).role === 'admin'`, which is
  `isPresenterRole` spelled out by hand, twice, next to each other. That is the duplication this
  whole conversion exists to remove: an invariant repeated per call site is an invariant that can be
  fixed in one place and left wrong in the other.

  It became `presenterRoom()` in this file, and then MOVED AGAIN to `#lib/server/auth.ts` the moment
  `for-all-broadcast.remote.ts` needed the same gate — because leaving it here would have recreated
  the duplication one level up, between modules instead of between actions. It returns the room only
  after the role check, so "gated" and "scoped to the caller's tenant" are the same event and cannot
  be applied separately.

  Authority is decided on the SERVER, from the session's own role, and never asserted by the client.
  The clients do check `isPresenter` before calling — but that is responsiveness, not security, and
  the 2026-08-07 privilege escalation was exactly the mistake of believing otherwise.

  HOW A REFUSAL SURFACES. Every call site is fire-and-forget: upstream shows the presenter nothing
  when a broadcast fails, and inventing a toast would be a change to what the room does. But a
  rejection that is simply dropped is the swallowed catch this repository forbids, and these can
  only reject for real faults — a network failure, or a 403 meaning the client and server disagree
  about who is a presenter. So the call sites `catch` to `console.error`: loud in the one place that
  costs the room nothing, and honest that the user has not been told.
*/

/**
 * `remotePresCommand` — a presenter mutes one member's mic, camera or screens.
 *
 * The three subCmds are the capture's own and the list is deny-by-default. An unknown string would
 * be forwarded to every client in the room and dispatched by none: a silent no-op, which is worse
 * than a refusal because nothing anywhere reports it. `z.enum` is the allow-list that was a
 * `new Set([...])` check — same three values, now refused before the handler runs rather than inside
 * it.
 */
export const presenterCommand = command(
  z.strictObject({
    subCmd: z.enum(['mutemic', 'mutecam', 'mutescreens']),
    // Names a PERSON. `users.id` is an autoincrement primary key, so every real target is >= 1.
    targetUserId: z.number().int().positive()
  }),
  async ({ subCmd, targetUserId }) => {
    ensureDatabase();
    /*
      ADDRESSED, not broadcast — 2026-08-19. `events.svelte.ts` reads this frame and returns
      immediately unless `targetUserId` is its own id, so no other client ever used it; sending it
      to the whole room told every member that a presenter had cut a NAMED person's microphone.
      Moderation state about an individual is not the room's business.
    */
    publishToUsers(presenterRoom(), [targetUserId], {
      channel: 'cmds',
      data: { cmd: 'remotePresCommand', subCmd, targetUserId }
    });
  }
);

/**
 * `focusOnScreen` — a presenter pulls the whole room to one screen.
 *
 * `bringFocusToScreen(e) { e && this.appService.sendServerAdminCommand("focusOnScreen", {id: e}) }`
 * (`main.d6d3c112b59b7d0d.js` byte 1918706 for the menu item, and the method itself). It is a SERVER
 * command upstream and has to be one here: the room learns about it over the same `cmds` channel
 * every other broadcast uses, and the authority to send it belongs to the server.
 *
 * `.min(1)` after `.trim()` is the reference's `e &&`. It sends nothing for an empty id, and an
 * empty broadcast would ask every client in the room to focus a screen that does not exist.
 */
export const focusOnScreen = command(z.string().trim().min(1), async (screenId) => {
  ensureDatabase();
  publishToRoom(presenterRoom(), { channel: 'cmds', data: { cmd: 'focusOnScreen', screenId } });
});

/**
 * `focusOnSessionNote` — the same act for a session note, and it is the SAME defect fixed twice.
 *
 * The screen version's contract test opens by recording that *"the menu item said 'Bring everyone
 * here' and brought nobody"*. The note version said it too, from two places, and brought nobody
 * either: both controls were wired to a purely local `selectNote(id)` whose whole body assigned
 * `requestedNoteId` and closed the menu. Fixed 2026-08-23.
 *
 * Read out of the capture rather than modelled on its sibling, and the two turned out to be
 * identical anyway — which is the evidence that reusing the channel is right rather than convenient:
 *
 *   sender A, byte 1474066:  `bringFocusToTab(){…sendServerAdminCommand("focusOnSessionNote",{id:this.tab._id})}`
 *   sender B, byte 1970831:  `bringFocusToTab(e){…sendServerAdminCommand("focusOnSessionNote",{id:e})}`
 *   server frame, byte 1023554: `case"focusOnSessionNote":…emit("focusOnSessionNote",i.id);break;`
 *     — immediately adjacent to `case"focusOnScreen"` in the same switch, same `{id}` shape.
 *
 * **A plain note-tab click must not broadcast**, and that is evidenced by ABSENCE that was read
 * rather than assumed: `bringFocusToTab` occurs exactly four times in the bundle — the two
 * definitions above and their two template call sites — so nothing on the tab-change path calls it.
 * The screen side has the same rule for the same reason, enforced there by only the user-initiated
 * click broadcasting.
 *
 * `.positive()` because `notes.id` is an autoincrement primary key, so every real note is >= 1 — the
 * same bound `presenterCommand` puts on `targetUserId`, and the equivalent of the reference's `e &&`.
 */
/**
 * `forceReload` — a presenter reloads one member's browser.
 *
 * ## Both ends existed and NOTHING joined them
 *
 * A form action at `+page.server.ts:1318` and a receiver at `events.svelte.ts` had been shipped, and
 * no call site connected them: `forceReload` appeared nineteen times in the actions export and zero
 * times as a caller. Meanwhile the "Force Reload" button dispatched `force-reload`, a key of
 * `EXACT_ALERTS`, so it raised *"Reload request sent OK"* and sent nothing at all.
 *
 * That is two defects that cancel each other into silence: a working wire nobody used, and a control
 * that lied about using it. Joined 2026-08-23 — the button now reaches this, the alert is gone from
 * that table, and the orphaned form action is deleted.
 *
 * ## Addressed, not broadcast
 *
 * `publishToUsers`, for the reason `presenterCommand` gives directly above: the frame is meaningful
 * to exactly one member, and telling the whole room that a named person is being reloaded is
 * moderation state about an individual that is not the room's business. `privCmds` is the channel
 * the capture uses — `/sess/{id}/privCmdsIn/{uid}-{id}/` — and the receiver already reads it.
 */
export const forceReload = command(z.number().int().positive(), async (targetUserId) => {
  ensureDatabase();
  publishToUsers(presenterRoom(), [targetUserId], {
    channel: 'privCmds',
    data: { cmd: 'forceReload', targetUserId }
  });
});

/**
 * `kickUser` — a presenter removes one member from the room.
 *
 * ## The control it repairs told the presenter it had worked
 *
 * `RoomUserActions.handle` answered `kick` by opening a prompt, closing the modal and alerting
 * *"User kicked OK"*. There was no command in that branch and **no command it could call**: this
 * room's `UserActionCommands` had `presenter`, `editUsername`, `unmuteChat`, `forceReload` and
 * `savePermissions`, and the only `kickUser` text in `apps/room/src` was inside a comment. So a
 * presenter clicked Kick, was told the person was gone, and the person stayed.
 *
 * That is a worse failure than the eleven controls in `INERT_ACTIONS`, which at least say nothing —
 * and it is worse than `forceReload`'s old state too, because `force-reload` at least sat in
 * `EXACT_ALERTS` where the lie was tracked. This one was in the `handled` bucket of
 * `user-action-disposition-contract.test.ts`, counted as done, because a branch existed.
 *
 * ## The wire, read rather than designed
 *
 * Sender, at byte 2078708 of `docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`:
 * `sendServerAdminCommand("kickUser",{user:o.user,msg:s,ban:e,kickAllInstances:i})`, followed by
 * `setPreference("kickMsg",s)`, `doCloseModal()` and `bootbox.alert("User kicked OK")` — so our
 * message text and our ordering were already faithful and only the send was missing.
 *
 * Receiver, at byte 996192: `case"kickUser": e.appEventBus.emit("kickPage", xe.msg), e.disconnect()`.
 * **Emit THEN disconnect**, which is the opposite of `forceReload`'s `disconnect()` then emit two
 * cases earlier in the same switch. Both were read in one pass; the asymmetry is upstream's and is
 * reproduced rather than tidied, for the same reason it is preserved on the receiving side.
 *
 * ## `ban` is NOT accepted here, deliberately
 *
 * The reference's payload carries `ban` and `kickAllInstances`. A ban has to outlive the frame — it
 * needs somewhere durable to record that this person may not return — and this room has no such
 * store. Taking a `ban` flag and dropping it would reproduce the exact defect this command exists to
 * fix: a control that reports something it did not do. `kick-ban` therefore stays unwired and is
 * recorded in `TODO.md` rather than quietly aliased onto this.
 *
 * ## Addressed, not broadcast
 *
 * `publishToUsers` on `privCmds`, for the reason `forceReload` gives above: the frame is meaningful
 * to exactly one member, and telling a whole room that a named person is being removed is moderation
 * state about an individual that is not the room's business. `presenterRoom()` is the authority — the
 * server decides the caller is a presenter and scopes the frame to the caller's own room in one call,
 * so no client assertion is trusted. That is the 2026-08-07 rule.
 */
export const kickUser = command(
  z.object({
    targetUserId: z.number().int().positive(),
    /*
      Bounded, and trimmed before the bound is applied. The reference seeds this prompt from
      `getPreference("kickMsg")` and lets the presenter type freely, so the value is genuinely
      user-authored text arriving from a client — it gets a length it cannot exceed rather than
      being trusted. Empty is refused because the member would be disconnected with no reason shown.
    */
    message: z.string().trim().min(1).max(500)
  }),
  async ({ targetUserId, message }) => {
    ensureDatabase();
    publishToUsers(presenterRoom(), [targetUserId], {
      channel: 'privCmds',
      // `msg`, not `message`: the receiver reads `xe.msg`, and the wire name is the capture's.
      data: { cmd: 'kickUser', targetUserId, msg: message }
    });
  }
);

export const focusOnSessionNote = command(z.number().int().positive(), async (noteId) => {
  ensureDatabase();
  publishToRoom(presenterRoom(), { channel: 'cmds', data: { cmd: 'focusOnSessionNote', noteId } });
});

/**
 * `giveMicScreen` — a presenter hands a member mic and screenshare, or takes them back.
 *
 * ```js
 * giveMicScreen(e) {
 *   if (this.user.userXrefID == this.appService.globals.user.userXrefID)
 *     return bootbox.alert(`Can't ${e ? 'give' : 'take'} 'Mic/Screenshare' to yourself.`), !1;
 *   this.appService.sendServerAdminCommand('giveMicScreen', { user: this.user._id, give: e });
 *   bootbox.alert(e ? 'Mic/Screenshare given OK' : 'Mic/Screen taken away OK');
 * }
 * ```
 *
 * It is a COMMAND, not a stored permission. The recipient's own client flips
 * `isPresenter`/`isLimitedPresenter` and reinitialises its media — which is why
 * `is_limited_presenter` was correctly removed as a column: it is transient state, not a property of
 * an account.
 *
 * ## The elevation row IS written, and that is the one thing that is not transient
 *
 * Recorded on the SERVER before it is announced — `TODO.md` gap 22. The SFU decides who may produce
 * from the grant's role, and `/api/media/grant` reads this row when it mints. Without it the
 * recipient restarts its media and is refused `forbidden`, because a runtime hand-over never touches
 * the controller's membership.
 *
 * Written here rather than trusted from the client: the reference achieves the same thing by letting
 * the browser re-join asserting its own `isP`, which is the privilege escalation removed on
 * 2026-08-07. `presenterRoom()` establishes the authority before the row is written.
 *
 * ## The self-target refusal is enforced HERE as well as in the UI
 *
 * The reference checks it only in the browser, and a presenter who reached this endpoint directly
 * would otherwise flip their own presenter flag off and have no control left to flip it back.
 *
 * Returns nothing. The action returned the sentence for the caller to display; the modal owns its
 * own copy of both strings and always did — it never read the one it was sent.
 */
export const giveMicScreen = command(
  z.strictObject({
    // `users.id` is an autoincrement primary key, so every real target is >= 1. `Number.isInteger`
    // let 0 and negatives through to elevate nobody and announce it anyway.
    targetUserId: z.number().int().positive(),
    give: z.boolean()
  }),
  async ({ targetUserId, give }) => {
    ensureDatabase();
    const room = presenterRoom();
    const actor = requireUser(getRequestEvent().locals);

    if (targetUserId === actor.id) {
      error(400, `Can't ${give ? 'give' : 'take'} 'Mic/Screenshare' to yourself.`);
    }

    if (give) grantMediaElevation(room, targetUserId, actor.id);
    else revokeMediaElevation(room, targetUserId);

    /*
      Addressed for the same reason: only the recipient acts on it — it grants them limited-presenter
      status and raises their own toast — and every other client returns early. Broadcasting it
      announced a permission change about a named member to everyone.
    */
    publishToUsers(room, [targetUserId], {
      channel: 'cmds',
      data: { cmd: 'giveMicScreen', targetUserId, give }
    });
  }
);
