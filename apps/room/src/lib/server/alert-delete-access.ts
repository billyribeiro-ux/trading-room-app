import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from './db/index.js';
import { sessions } from './db/schema.js';
import { checkAlertDeletePasswordRemotely } from './room-config-client.js';

/**
 * The `deleteAlertPW` door, server side — TODO row AL.
 *
 * ## The defect this closes
 *
 * `deleteAlertPW`'s help text is *"If set, Presenters will need to enter the password to delete an
 * alert"*, and until 2026-08-30 nothing in this product read it. `message-actions.remote.ts`'s
 * delete branch asked `usersCanDeleteOwnMsgs` of a MEMBER and let a presenter through
 * unconditionally — correct for chat, and for alerts it meant an owner could configure this password
 * and watch every presenter delete alerts unchallenged.
 *
 * The reference does the comparison in the browser, and for THIS surface — deleting one alert from
 * its context menu — at bundle byte 2,601,823:
 *
 * ```js
 * deleteAlertMessage(e){
 *   this.appService.globals.sessData.deleteAlertPW
 *     ? bootbox.prompt({ title:"Please enter the password to delete this alert:", value:"",
 *         callback: i => { i && (i.trim() === this.appService.globals.sessData.deleteAlertPW
 *           ? this.appService.deleteAlert(e) : bootbox.alert("Wrong password!")) } })
 *     : this.appService.deleteAlert(e)
 * }
 * ```
 *
 * Five sibling sites do the same against the same value — `archiveChatDate` at 2,048,641,
 * `doSearchSubmit(del)` at 2,051,139, `resetAllMediaServers` at 2,167,386, `switchToBackup` at
 * 2,173,860 and the whole-log archive.
 *
 * It can, because `sessData` already holds the value. This reconstruction must not put it there —
 * `deleteAlertPW` is one of the seven credential-shaped settings that may never cross the config
 * boundary — so the credential stays on the controller and the QUESTION travels, through
 * `internal/room-alert-delete-auth/[code]`.
 *
 * ## THE MODULE IS A MIRROR OF `user-notes.ts`, AND EVERY VALUE IN IT IS ITS OWN
 *
 * The shape is deliberately the same as `requireNotesAccess` — ask the controller whether the
 * password is required, then read a session-row grant with a TTL — because two doors built two
 * different ways is how one of them ends up with the weaker rule. What is NOT shared is the column
 * and the window. Both are stated here rather than imported:
 *
 *   * **`sessions.alert_delete_access_at`, its own column.** Clearing the notes password must not
 *     open the alert-delete one. An owner who sets one and not the other, or two different values,
 *     has said two different things.
 *   * **A much shorter TTL.** See {@link ALERT_DELETE_ACCESS_TTL_MS}.
 */

/**
 * How long a cleared alert-delete password stays cleared, from the moment it was cleared.
 *
 * ## Two minutes, and why it is not the notes password's thirty
 *
 * `NOTES_ACCESS_TTL_MS` is thirty minutes because managing a member's notes is *a piece of work with
 * the modal open* — a presenter reads, writes, deletes and writes again, and re-prompting mid-task
 * would be a control that fights its user.
 *
 * Deleting an alert is not that. It is ONE click, immediately after ONE prompt, and the reference is
 * stricter still: `deleteAlertMessage` prompts on **every single invocation** and keeps no grant at
 * all, because its grant is a callback closure that dies when the callback returns.
 *
 * We cannot be exactly that strict without making the grant single-use, and single-use has a failure
 * mode worse than the looseness it buys: a delete that loses a race, or is refused for a different
 * reason (a 404 on an already-deleted row), would burn the grant and demand the password again for
 * an action the presenter never completed. So the window is a TTL, and it is sized to *the gap
 * between answering a prompt and the delete landing* rather than to the length of a task.
 *
 * Two minutes covers a slow network and a confirmation dialog several times over, and it is short
 * enough that a presenter who walks away from an unlocked machine has not left the alert log open to
 * whoever sits down. It is **stricter than the reference in the direction that matters** — upstream
 * has no server check at all — and looser than it in the direction that costs nothing, which is
 * exactly the trade this repository makes for the notes grant and is recorded here so that the next
 * reader does not "harmonise" the two numbers.
 */
export const ALERT_DELETE_ACCESS_TTL_MS = 2 * 60 * 1000;

/**
 * May this session delete an alert right now — asked of the controller, then of the session row.
 *
 * ## Two questions, and only one of them can be answered locally
 *
 * *"Does this room require a password to delete an alert?"* is the controller's to answer:
 * `deleteAlertPW` never crosses the boundary, so the room cannot know, and
 * `checkAlertDeletePasswordRemotely` asks with an empty candidate exactly as the room's own prompt
 * does on its first call.
 *
 * *"Has this session cleared it?"* is the server's own, from `sessions.alertDeleteAccessAt`, which
 * only {@link grantAlertDeleteAccess} writes and only after the controller said yes.
 *
 * ## Why the controller is asked on every delete and not cached
 *
 * The answer can change: an owner who turns the password ON expects it to take effect, and a room
 * that cached `required:false` at boot would keep deleting alerts unchallenged until a restart.
 * Alerts are deleted by hand, one at a time, so a bounded round trip per delete is not a cost worth
 * trading correctness for — and the call already fails closed by THROWING, so an unreachable
 * controller refuses the delete rather than allowing it.
 *
 * @throws a 403 `HttpError` when the password is required and this session has not cleared it, or
 *   cleared it too long ago. A `RoomConfigUnavailable` propagates untouched: "I could not ask" is
 *   neither a grant nor a refusal, and turning it into either would be a lie in one direction or a
 *   destroyed alert in the other.
 */
export async function requireAlertDeleteAccess(room: string, sessionId: string): Promise<void> {
  const { required } = await checkAlertDeletePasswordRemotely(room, '');
  if (!required) return;

  const grantedAt = db
    .select({ alertDeleteAccessAt: sessions.alertDeleteAccessAt })
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .get()?.alertDeleteAccessAt;

  if (!grantedAt || Date.now() - grantedAt.getTime() > ALERT_DELETE_ACCESS_TTL_MS) {
    /*
      403 rather than 404, for the reason `requireNotesAccess` gives: there is nothing here to
      decline to confirm. The caller can see the alert — they clicked its menu — and the honest
      sentence is that they have not entered the password, or entered it too long ago.

      The message names no setting and quotes no value. It says what to DO, which is all the room's
      dialog needs in order to raise the prompt again.
    */
    error(403, 'Enter the alert password again to delete this alert.');
  }
}

/** Record that this session cleared `deleteAlertPW`, at this moment. */
export function grantAlertDeleteAccess(sessionId: string): void {
  db.update(sessions)
    .set({ alertDeleteAccessAt: new Date() })
    .where(eq(sessions.id, sessionId))
    .run();
}
