import { invalidateAll } from '$app/navigation';
import { saveCloseMessage } from '../../routes/session-commands.remote';

/**
 * *" Save Message and Close Session "* and *" Just Save Close Message "*, which differ by one step.
 *
 * ## Both were lies, in different directions
 *
 * The first wrote `sessionOpen: false` and dropped the message half of its own label. The second's
 * entire handler body was `alert = 'Message Saved'`. Nothing in `apps/room/src` persisted a close
 * message at all, so two buttons offered to save it and neither did — `TODO.md` row 7(b) and row W.
 *
 * ## THE ORDER IS THE RULE: save first, close only if it succeeded
 *
 * Closing a room on the strength of a save that was refused would shut members out behind whatever
 * the PREVIOUS message said — a room closed with the wrong explanation, which is worse than a room
 * that stayed open. The alert comes after the save for the same reason, unlike the `announceThenSend`
 * family: those reproduce a reference that alerts immediately, and this pair has no captured alert to
 * reproduce because upstream's server is not in the capture.
 *
 * `invalidateAll()` last, so the editor and the refusal read the same row.
 *
 * ## Why a module and not a page function
 *
 * It began as one, beside `changeChatMode`, and `source-size-contract.test.ts` refused it — the page
 * is the composition root and every feature wired into it costs the same twenty-five lines. The deps
 * are passed rather than imported because both of them are the PAGE's: one `RoomDialogs` renders
 * every alert in the room, and `prefs.save` is the write path the whole settings surface shares.
 */
export async function saveCloseMessageThen(
  message: string,
  then: 'close' | 'save-only',
  deps: {
    dialogs: { alert: string | null };
    savePreference: (key: string, value: boolean) => void;
  }
): Promise<void> {
  try {
    await saveCloseMessage({ message });
  } catch (error) {
    console.error('saveCloseMessage', error);
    deps.dialogs.alert = 'Command failed.';
    return;
  }
  if (then === 'close') deps.savePreference('sessionOpen', false);
  deps.dialogs.alert = 'Message Saved';
  await invalidateAll();
}
