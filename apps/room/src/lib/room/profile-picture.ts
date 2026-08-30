import type { ModalTargetUser } from '#lib/types.js';

import type { UserActionCommands } from './user-action-commands';

/*
  A PRESENTER SETTING ONE MEMBER'S AVATAR — `adminUploadProfilePic` and its mirror.

  ## Why this is its own module

  Extracted from `user-actions.svelte.ts` on 2026-08-30, when the user-detail lookup pushed that
  file past its ceiling. The ratchet's instruction is to extract rather than raise, and its own
  header warns against "an extraction invented to satisfy a number" — so the test this had to pass
  was whether it is a real slice, and it is the same test `RoomKicks` and `RoomChatMute` passed:

  * One feature, complete. Set a picture, clear a picture; there is no third thing.
  * Two collaborators, both narrow — the two commands, and a way to say something went wrong.
  * Nothing else in `RoomUserActions` reads or writes anything these touch. They were adjacent to
    the permission checkboxes only because both were wired in the same week.

  Nothing about the behaviour changed in the move, and the transcriptions below are the originals
  byte for byte — `user-action-disposition-contract.test.ts` and the dispatcher's
  `upload-profile-picture` branch reach these through `RoomUserActions`, unchanged.

  ## Built by `RoomUserActions`, not injected

  Same reasoning `RoomKicks` records: it needs two things that class already holds, so injecting it
  would make the composition root assemble an object out of values it had just handed over.
*/
export class RoomProfilePicture {
  readonly #commands: Pick<UserActionCommands, 'uploadProfilePicture' | 'removeProfilePicture'>;
  readonly #alert: (message: string) => void;

  constructor(options: {
    commands: Pick<UserActionCommands, 'uploadProfilePicture' | 'removeProfilePicture'>;
    /** How this slice says something failed — `RoomDialogs.alert`, injected so it needs no import. */
    alert: (message: string) => void;
  }) {
    this.#commands = options.commands;
    this.#alert = options.alert;
  }

  /**
   * `adminUploadProfilePic` — a presenter sets one member's avatar.
   *
   * ## A CORRECTION: this DOES announce, and the first version was wrong to be silent
   *
   * The first version of this method carried a paragraph arguing that *"upstream raises no alert on
   * success — the picture simply changes, which is its own confirmation"*. **That was reasoning
   * carried over from `getDebugLog`, where it is true, and it was never checked here.** The
   * reference is explicit, at bundle byte 2,086,100:
   *
   * ```js
   * beforeSend: … bootbox.alert(`Uploading: ${e.name}... Please wait...`)
   * success:     … bootbox.alert("Profile picture uploaded successfully for " + (user.nick||user.name))
   * error:       … bootbox.alert("Upload Failed...")
   * ```
   *
   * Three alerts, one per outcome, and the sentences are transcribed rather than composed. That is
   * the opposite of the `EXACT_ALERTS` defect this repository has spent commits removing: those were
   * alerts raised over NOTHING, and these are raised over a real round trip.
   *
   * The progress alert is dropped and that IS a divergence, recorded rather than hidden: upstream's
   * is a bootbox that `bootbox.hideAll()` closes from the success and error callbacks, and this
   * room's `alert` primitive is a single string the member dismisses. Showing "Uploading…" would
   * require the presenter to dismiss it before they could read the result.
   *
   * The failure sentence is the SERVER's when there is one — "That is not an image", the size limit,
   * or the member having left the room — falling back to upstream's `"Upload Failed..."` verbatim.
   * A specific reason beats a transcribed one; the transcription is what happens when there is no
   * specific reason to give.
   *
   * The modal stays OPEN. `savePermissions` closes it because saving is the end of that dialog; a
   * presenter who has just set a picture may well set another.
   */
  uploadProfilePicture(user: ModalTargetUser, file: File): void {
    void this.#commands
      .uploadProfilePicture({ targetUserId: user.id, file })
      .then(() => {
        // Verbatim, byte 2,086,100 — including that it names the member rather than the file.
        this.#alert(`Profile picture uploaded successfully for ${user.nick}`);
      })
      .catch((cause: unknown) => {
        this.#alert(cause instanceof Error && cause.message ? cause.message : 'Upload Failed...');
      });
  }

  /**
   * Clear a member's picture. The mirror of {@link uploadProfilePicture}, and deliberately so.
   *
   * Silent on success and loud on failure, for that method's reason: the avatar changing IS the
   * confirmation, and the ways this can fail — the member has left the room — are ones a presenter
   * cannot infer from a control that did nothing.
   *
   * NO CONFIRM DIALOG. The reference's button raises none, and the act is reversible by the upload
   * beside it; asking twice for something undoable in one click is friction, not safety.
   */
  removeProfilePicture(user: ModalTargetUser): void {
    void this.#commands.removeProfilePicture(user.id).catch((cause: unknown) => {
      this.#alert(
        cause instanceof Error && cause.message
          ? cause.message
          : 'That profile picture could not be removed.'
      );
    });
  }
}
