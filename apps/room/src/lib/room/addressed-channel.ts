import { RoomPrivateCommands } from './private-commands.js';
import type { RoomChatMute } from './chat-mute.js';
/**
 * The addressed channel, assembled with the callbacks its four commands actually need.
 *
 * ## Why the construction lives HERE and not at the call site
 *
 * It sat inline in `create-room.svelte.ts`, where every one of the four callbacks was a one-line
 * closure over a dialog. That put the description of what each command DOES to the member — the
 * verbatim capture byte for `forceReload`, why a kick shows text rather than swapping the page, why
 * the audio reconnect is narrower than a session restart — in the room's assembly factory rather
 * than beside the class that calls them.
 *
 * The line count is what forced the move (`source-size-contract.test.ts` refuses a raise, and asks
 * for exactly this), but the move is right on its own terms: a reader who wants to know what
 * `forceReload` does now finds the answer in the file that handles it.
 *
 * ## What the caller still supplies, and why it is these four
 *
 * The dialogs and the mute are the PAGE'S — one `RoomDialogs` renders every alert in the room, and
 * `chatMute` is the same instance the presenter's own two buttons hold, which is what stops the
 * presenter's half and the member's half from drifting apart as they once did. `reconnectAudio` is
 * the media transport's. None of the four can be constructed here without this module reaching for
 * the whole room, which is the coupling the split exists to avoid.
 */
export function addressedChannelFor(deps: {
  viewerId: () => number;
  /** ONE instance, shared with the presenter's two buttons — see `RoomChatMute`. */
  chatMute: RoomChatMute;
  /**
   * The room's single dialog host, NARROWED to `alertThen` on 2026-08-31.
   *
   * It used to read `{ alertThen; alert }`, and `alert` was here for exactly one caller: the kick,
   * which now replaces the page instead (see `kicked` below). A field nothing reads is the shape
   * this repository refuses outright, so it went with its consumer rather than being left in place
   * "in case" — the next receiver that needs an alert can widen this back and will have a reason to.
   */
  dialogs: { alertThen: (message: string, ondismiss: () => void) => void };
  /**
   * A presenter kicked this member: the message, and the page swap it belongs to.
   *
   * Separate from `dialogs` above, which is what it replaced. See the `kicked` wiring below.
   */
  kicked: (message: string) => void;
  /** Audio only — narrower than a session restart on purpose. See `reconnectAudio`. */
  reconnectAudio: () => Promise<void>;
  /**
   * The room's console buffer and the command that answers with it.
   *
   * A FIFTH callback pair, and it arrives with the same justification as the four above: the buffer
   * belongs to `RoomDebugLog` and the send is a remote command the page holds, so neither can be
   * constructed here without this module reaching for the whole room.
   */
  debugLog: {
    collect: () => string;
    send: (log: string) => void;
    received: (from: { fromUserId: number; fromName: string; log: string }) => void;
  };
  /**
   * A presenter set this member's own avatar.
   *
   * The PAGE's, because where an avatar is rendered is the page's business and not this module's —
   * the same reasoning `forceReloadRequested` and `kicked` carry for their dialogs.
   */
  profilePictureChanged: (avatarUrl: string) => void;
  /** The transport's `stopLocalScreen`, for the same reason `reconnectAudio` is the transport's. */
  stopLocalScreen: (producerId: string) => void;
}): RoomPrivateCommands {
  return new RoomPrivateCommands({
    viewerId: deps.viewerId,
    chatMute: deps.chatMute,
    // Byte 2597102, verbatim. Why `alertThen` and not `confirm` is on `RoomDialogs.alertThen`.
    forceReloadRequested: () =>
      deps.dialogs.alertThen('You need to reload this page to continue', () => location.reload()),
    /*
      THE PAGE SWAP, and it replaced a dialog. This read `deps.dialogs.alert = message` under the
      comment *"No page swap — see `kickUser` above"*, which was the honest record of a gap;
      `TODO.md` row 6 carried it as its one residual and `private-commands.ts` named the component.

      A dialog is the wrong shape here and not merely a smaller one. It is DISMISSIBLE, and what
      sits behind it is a room whose stream this same frame has just closed — so the member read
      the message, pressed OK, and was left looking at a frozen room with nothing on screen saying
      why. That is worse than showing nothing, because the room then looks broken rather than closed
      to them. Upstream replaces the page and the page stays replaced (`currPage = "kicked"`, byte
      2,596,772).

      The message is passed through UNTOUCHED, including an empty one. `private-commands.ts` sends
      `''` when the frame carries no `msg`, and `KickedPage`'s own fallback is the reference's
      `"kicked"` — but an empty string is not absent, and substituting a default for it here would
      invent a message the presenter did not send. What upstream does with an empty `kickedMsg` is
      render an empty `h2`, which is a page that says the room is gone without claiming a reason.
    */
    kicked: deps.kicked,
    reconnectAudio: deps.reconnectAudio,
    collectDebugLog: deps.debugLog.collect,
    sendDebugLog: deps.debugLog.send,
    debugLogReceived: deps.debugLog.received,
    profilePictureChanged: deps.profilePictureChanged,
    stopLocalScreen: deps.stopLocalScreen
  });
}
