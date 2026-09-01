import type { FollowChatStyle } from '#lib/types.js';
import { isRoomSplitDir, type RoomSplitDir } from '#lib/room/split.svelte.js';

/**
 * The preference writes that are NOT preferences.
 *
 * `RoomPrefs.save` mirrors the snapshot, then offers the key here through `RoomPrefsHooks.onSideEffect`,
 * then runs its own typed cases. Four keys need something else to happen as well, and none of the
 * four is the preferences class's business:
 *
 * | key | what else happens | why it is not `RoomPrefs`'s |
 * | --- | --- | --- |
 * | `chatStyle` | the room's chat rendering style is re-merged | a preferences class owning the room's rendering has stopped having a boundary |
 * | `roomSplitDir` | the split geometry is re-seeded | same, for layout |
 * | `recPreviewWindow` | an open recording preview is closed | USM-12; the UNGUARDED close, `RoomRecording.closeRecPreviewWindow` |
 * | `doSpeechReco` | recognition starts or stops now | USM-13; the recogniser belongs to `RoomRecording` |
 *
 * ## Why a module rather than four inline branches
 *
 * They were inline in `createRoom`, and `source-size-contract.test.ts` is what moved them: USM-12
 * and USM-13 added their citations and the composition root went over its ceiling. The rule there is
 * that ceilings only go down and prose is never trimmed to hit a number, so the block left instead —
 * the same trade `close-message.ts` and `restream-url.ts` record.
 *
 * It is a better home on its own terms. `createRoom` is a wiring file; this is a decision table, and
 * every row of it is a defect somebody fixed with a reason worth keeping.
 *
 * ## The dependencies are passed, not imported
 *
 * All four act on objects `createRoom` owns, and two of them (`closeRecPreviewWindow`, the speech pair) are
 * on a class **constructed after** the hook — a closure, never a read at construction. Taking them
 * as thunks makes that explicit and makes this testable without building a room.
 */
export interface PreferenceSideEffectDeps {
  /** `deps.mergeGlobalChatStyle` — the page's, because the style is the page's. */
  mergeGlobalChatStyle: (patch: Partial<FollowChatStyle>) => void;
  /** `split.setDirection`, with the pair of size keys for the arrangement being applied. */
  setSplitDirection: (direction: RoomSplitDir) => void;
  /** `recording.closeRecPreviewWindow` — a thunk because `recording` is constructed after this hook. */
  hideRecordingPreview: () => void;
  /** `recording.beginSpeechRecognition` / `endSpeechRecognition`, thunks for the same reason. */
  beginSpeechRecognition: () => void;
  endSpeechRecognition: () => void;
}

/**
 * @returns the `onSideEffect` hook, ready to hand to `RoomPrefs`.
 */
export function preferenceSideEffects(deps: PreferenceSideEffectDeps) {
  return (key: string, value: unknown): void => {
    if (key === 'chatStyle' && value && typeof value === 'object' && !Array.isArray(value)) {
      deps.mergeGlobalChatStyle(value as Partial<FollowChatStyle>);
      return;
    }

    /*
      Applies the sizes the server rendered with, alongside the new direction. Each arrangement has
      its own pair of preference keys, so this brings back the geometry last chosen for THAT
      arrangement rather than reinterpreting a width as a height. It said "never on a page load"
      until 2026-08-28, when `applyRoomDefaults` began writing `roomSplitDir` from `onMount` for a
      room that sets `alertsChatOnBottom` — once per viewer, latched, and the correct path.
    */
    if (key === 'roomSplitDir' && isRoomSplitDir(value)) {
      deps.setSplitDirection(value);
      return;
    }

    /*
      USM-12 — `recPreviewWindowOnChange` at byte 2,250,601 does two things, and the second is the
      one that was missing:

        this.appService.setPreference("recPreviewWindow", …),
        this.appService.globals.preferences.recPreviewWindow ||
          this.appService.guiEventBus.emit("closeRecPreviewWindow")

      Switching the box OFF closes a preview that is already open. Without it a presenter unticks
      the setting and the window stays on their second monitor until they close it themselves, which
      reads as the setting having done nothing.
    */
    if (key === 'recPreviewWindow' && value === false) {
      deps.hideRecordingPreview();
      return;
    }

    /*
      USM-13 — the presenter's captions toggle acts NOW, which it did not.

        speechRecoCCOnChange() {
          …setPreference("speechRecoCC", …), setPreference("doSpeechReco", …),
          this.appService.globals.preferences.speechRecoCC
            ? this.mediaSoupService.micProducer && !this.mediaSoupService.micMuted &&
                this.mediaSoupService.startSpeechRecognition()
            : this.mediaSoupService.stopSpeechRecognition() }        // byte 2,246,212

      Ours persisted `doSpeechReco` and stopped there. The only callers of `beginSpeechRecognition`
      were the two mic-START paths, so turning captions ON mid-session did nothing until the
      microphone was restarted, and turning them OFF did not stop a recognition already running — a
      toggle that says `Enabled` and captions nobody.

      The reference's `micProducer && !micMuted` guard is deliberately NOT repeated here:
      `beginSpeechRecognition` already refuses without a live session, without the preference,
      without the room entitlement and without presenter authority, and it is the method both mic
      paths call. Two copies of one guard is how the copies come to disagree.
    */
    if (key === 'doSpeechReco') {
      if (value === true) deps.beginSpeechRecognition();
      else deps.endSpeechRecognition();
    }
  };
}
