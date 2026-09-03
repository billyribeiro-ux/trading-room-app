import { invalidateAll } from '$app/navigation';
import { closeSession, saveCloseMessage } from '../../routes/session-commands.remote';

/**
 * *" Save Message and Close Session "* and *" Just Save Close Message "*, which differ by one step.
 *
 * ## Both were lies, in different directions
 *
 * The first wrote `sessionOpen: false` and dropped the message half of its own label. The second's
 * entire handler body was `alert = 'Message Saved'`. Nothing in `apps/room/src` persisted a close
 * message at all, so two buttons offered to save it and neither did — `TODO.md` row 7(b) and row W.
 *
 * **The message half was fixed on 2026-08-27 and the CLOSE half was still a lie until 2026-09-03.**
 * `savePreference('sessionOpen', false)` writes the clicking presenter's own settings blob, and
 * `sessionOpen` had ZERO readers anywhere in `apps/room/src` — it was not even on
 * `DEAD_PREFERENCE_KEYS`. The room's actual door is `rooms.state` on the controller, which
 * `decideRoomEntry` refuses entry on and which nothing in either application could write after a
 * room was created. So a presenter closed the session, was told `Message Saved`, and the room
 * admitted everybody as before.
 *
 * `closeSession` is the write, and it publishes `closedPage` beside it so the members already inside
 * learn too. Neither substitutes for the other, and its own docblock says why.
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
 * is the composition root and every feature wired into it costs the same twenty-five lines. The one
 * remaining dep is passed rather than imported because it is the PAGE's: a single `RoomDialogs`
 * renders every alert in the room, and a module that reached for its own would put a second alert
 * surface in front of a presenter who is already looking at one.
 */
export async function saveCloseMessageThen(
  message: string,
  then: 'close' | 'save-only',
  /*
    ONE dep since 2026-09-03, and it was two.

    `savePreference` came out with the `sessionOpen` write it existed for: an injected collaborator
    nothing calls is the thing this repository refuses one level up, and leaving it would have read
    as "the close still touches preferences" to the next person who opened this file.
  */
  deps: {
    dialogs: { alert: string | null };
  }
): Promise<void> {
  try {
    await saveCloseMessage({ message });
  } catch (error) {
    console.error('saveCloseMessage', error);
    deps.dialogs.alert = 'Command failed.';
    return;
  }
  /*
    THE CLOSE, and its failure is SAID rather than swallowed.

    `saveCloseMessage` above already returns early on a refusal, for the reason the docblock gives:
    closing a room behind a message that did not save would shut members out under the previous
    explanation. The same rule applies one step later — a close that the controller refuses must not
    be reported as `Message Saved`, because "saved" is the word a presenter reads as "and closed".
  */
  if (then === 'close') {
    try {
      await closeSession();
    } catch (error) {
      console.error('closeSession', error);
      deps.dialogs.alert = 'The message was saved, but the room could not be closed.';
      await invalidateAll();
      return;
    }
  }
  deps.dialogs.alert = 'Message Saved';
  await invalidateAll();
}
