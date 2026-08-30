import type { RoomToasts } from './toasts.svelte';

/**
 * `updatedSessionNote` — a session note was saved by somebody else — USM-11.
 *
 * ## The row named the popup; the defect was one level under it
 *
 * `saveSessionNote` in `+page.server.ts` wrote its row and **published nothing**. Every other
 * viewer's Notes pane kept the previous text until they happened to reload, so a presenter editing
 * the room's notes during a session was invisible to the room — which is the entire point of the
 * pane. The audit row asks for a checkbox; the checkbox could not exist without the frame.
 *
 * ```js
 * case "updatedSessionNote":
 *   for (let se = 0; se < this.globals.sessionNotes.length; se++) {
 *     let _e = this.globals.sessionNotes[se];
 *     _e._id == i.tab._id && (this.globals.sessionNotes[se].noteContent = i.tab.noteContent,
 *       this.appEventBus.emit("noteTabUpdated", { id: _e._id, name: _e.name })) }
 *   break;                                                            // bundle byte 1,022,762
 *
 * subscribe("noteTabUpdated", e => { …flash #noteUpd-<id>…
 *   (selectedMainTab !== "presAreaTabs-notes" || selectedNoteTab !== `noteTab-${e.id}`) &&
 *     (…flash #noteChangeIndicator…, this.alertsService.clear(),
 *      preferences.noteUpdatePopup && this.alertsService.info(`Note "${e.name}" updated`)) })
 *                                                                     // bundle byte 1,962,777
 * ```
 *
 * The frame name is the reference's own, which is what `#lib/message-mutation-frames.ts` demands of
 * a fifth: *"Adding one means finding it in the bundle first — an invented frame name is the
 * `alertDisplayMode` defect wearing a wire format."*
 *
 * ## NOT for the browser that saved
 *
 * The same skip the four message-mutation frames make, for the same reason: that browser has
 * already called `invalidateAll()`, and telling somebody their own note changed is noise.
 *
 * ## `alertsService.clear()` is deliberately NOT reproduced
 *
 * Upstream wipes every toast on screen before raising this one. One of the things on screen may be
 * the media-outage banner `RoomToasts` deliberately gives `timeOut: 0` — a note being edited must
 * not dismiss it. De-duplication is what that call was there for, and `RoomToasts.show` already
 * does it.
 *
 * ## The CONTROL is not gated on the join beep, which upstream gates it on
 *
 * `z("ngIf", sessData.beepOnUserJoin)` at byte 2,285,196 renders the checkbox under the JOIN-BEEP
 * room setting, which has nothing to do with session notes: nothing else in that block shares the
 * gate and no handler reads the two together. It reads as a markup slip, and reproducing it would
 * mean an owner who switches off the join beep silently loses control of note popups.
 *
 * ## Why a module rather than a branch in the dispatcher
 *
 * `source-size-contract.test.ts`, and the same trade `close-message.ts` and `restream-url.ts`
 * record: `events.svelte.ts` is a dispatcher, this is a behaviour with four paragraphs of reasoning
 * attached, and the reasoning belongs beside the behaviour rather than inside the switch.
 */
export function noteUpdateNotice(
  frame: { actorUserId?: number; noteName?: string },
  deps: {
    viewerId: number;
    /** `prefs.noteUpdatePopup`. */
    popupEnabled: boolean;
    refetch: () => void;
    toasts: RoomToasts;
  }
): void {
  if (frame.actorUserId === deps.viewerId) return;
  deps.refetch();
  if (!deps.popupEnabled || typeof frame.noteName !== 'string') return;
  deps.toasts.show({
    kind: 'info',
    message: `Note "${frame.noteName}" updated`,
    enableHtml: false
  });
}
