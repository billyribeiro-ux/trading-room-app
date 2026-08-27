import type { RoomBroadcasts } from './broadcasts.svelte.js';
import type { CmdsFrame } from './cmds-frame.js';

/**
 * THE "FOR ALL" BROADCASTS — the eight room-wide commands, routed in one place.
 *
 * ## Why they are a module
 *
 * They were eight branches of the `cmds` chain in `RoomEventStream`, and they are the one group in
 * that chain that shares a collaborator: every branch reaches `RoomBroadcasts` and two of them also
 * reach `showTab`. Everything else on that channel routes to a different object each time, which is
 * why the chain is a chain — and why these eight lift out cleanly while the rest do not.
 *
 * The precedent is in the same file: `RoomPrivateCommands` took the whole addressed channel out for
 * the same reason, and the router's job became recognising the channel rather than knowing what each
 * command means.
 *
 * `source-size-contract.test.ts` is what forced the timing, when the two page-ending frames pushed
 * `events.svelte.ts` over its ceiling. The move is right on its own terms: a reader asking what
 * happens when a presenter presses "Play for all" now has one file to open.
 *
 * ## The contract
 *
 * `true` means "this frame was mine and is handled", `false` means "not mine" — never "nothing
 * happened". The same contract `RoomSessionControl.handle`, `RoomKicks.handle` and
 * `RoomChatMute.handle` carry, for the reason `ModalHost` keeps one door: making the caller decide
 * which handler owns a string is the coupling that turned "Bring everyone here" into a lie.
 */
export function handleForAllBroadcast(
  command: CmdsFrame | undefined,
  broadcasts: RoomBroadcasts,
  showTab: (tab: 'screens' | 'videoplayer') => void,
  /*
    THE SENDER IS EXCLUDED FROM FOUR OF THESE, and it is a guard rather than a truthiness shorthand:
    `isPresenter ||` at bundle bytes 1015228 and 1015399 keeps the presenter who pressed the button
    from being shown their own overlay, and from being dragged to a tab they are already driving. A
    negative control that removed it came back GREEN once, which is why it is passed in explicitly
    rather than read off a field the extraction could have quietly dropped.
  */
  isPresenter: () => boolean
): boolean {
  /*
    `playMP3ForAll` / `stopMp3ForAll` — a sound every browser in the room plays.

    Room-wide, so unlike `giveMicScreen` there is no `targetUserId` to match on: everybody
    who receives it plays it, which is the whole point of "For All".
  */
  if (command?.cmd === 'playMP3ForAll') {
    broadcasts.mp3Started(typeof command.url === 'string' ? command.url : null);
    return true;
  }
  if (command?.cmd === 'stopMp3ForAll') {
    broadcasts.mp3Stopped();
    return true;
  }

  /*
    `sendSalesImageToChat` / `sendUsersToURL`, verbatim at bytes 1015180 and 1015357:

      case "sendSalesImageToChat": if (!i || !i.url) return true;
        this.globals.isPresenter || this.appEventBus.emit("sendSalesImageToChat", i)

    The senders shipped on 2026-08-23 and these did not, so both buttons raised
    "Command send OK." over a frame nothing read. `TODO.md` row 7.

    **`isPresenter ||` is a GUARD**: the receiver runs only for a NON-presenter, so a presenter
    is neither shown their own image nor navigated out of the room they are running. That is
    the opposite of `softResetDone` above, which returns to its sender on purpose.
  */
  if (command?.cmd === 'sendSalesImageToChat') {
    if (typeof command.url === 'string' && command.url && !isPresenter()) {
      broadcasts.salesImageShown(command.url);
    }
    return true;
  }
  if (command?.cmd === 'sendUsersToURL') {
    /*
      The most destructive frame in the room: the member loses a half-typed message and a live
      screenshare with no warning. Faithful — the reference's receiver is one statement with no
      guard near it, and no confirm was found. Recorded in `TODO.md` row 7 as a divergence
      candidate for the owner rather than invented here. `broadcastableUrl` already refused
      anything but http/https on the way out.
    */
    if (typeof command.url === 'string' && command.url && !isPresenter()) {
      globalThis.location.href = command.url;
    }
    return true;
  }

  /*
    `playVideoForAll` / `stopVideoForAll`, verbatim (bytes 1,966,711 and 1,966,882):

      subscribe("playVideoForAll", e => { this.videoPlayerUrl = e.url;
        this.hideVideoPlayer = !0;
        this.isP || this.onMainTabChange("presAreaTabs-videoplayer") })
      subscribe("stopVideoForAll", () => { this.videoPlayerUrl = "";
        this.scheduledVideo.videoURL = ""; this.scheduledVideo.videoPlayTime = null;
        this.hideVideoPlayer = !1;
        this.isP || this.onMainTabChange("presAreaTabs-screens") })

    Room-wide, so no `targetUserId` to match on. The tab move is for NON-presenters only, and
    the reason is visible in the gate it pairs with: a presenter is already able to reach the
    VideoPlayer tab whenever they like, while a member's tab exists only while
    `hideVideoPlayer` is true — dragging them there is what makes it reachable at all, and
    putting them back on screens is what stops them staring at an empty pane afterwards.
  */
  if (command?.cmd === 'playVideoForAll') {
    if (typeof command.url !== 'string') return true;
    broadcasts.videoStarted(command.url);
    if (!isPresenter()) showTab('videoplayer');
    return true;
  }
  if (command?.cmd === 'stopVideoForAll') {
    /*
      The armed timer dies here rather than in the sender, so that a stop sent by ANOTHER
      presenter also cancels this browser's pending play. Clearing it only where the button
      is pressed would leave the first presenter's video arriving minutes after the room was
      told it had been removed.
    */
    broadcasts.videoStopped();
    if (!isPresenter()) showTab('screens');
    return true;
  }

  /*
    `playYTForAll` / `stopYTForAll` — the floating overlay, on every screen in the room.

      case "playYTForAll": this.guiEventBus.emit("playYTForAll", {url: i.url});
      case "stopYTForAll": this.guiEventBus.emit("stopYTForAll");

    THE SEEK POSITION IS DERIVED, NEVER SENT. The subscriber at byte 1,964,799 is

      let i = 0;
      if (e.startTime) { let o = Number(e.startTime); i = Math.round((Date.now() - o) / 1e3) }
      else this.startTime = 0;

    and `startTime` is absent from the live command above — it arrives only on the late-join
    replay, `emit("playYTForAll", {url: roomState.ytURL, startTime: roomState.ytStartTime})`
    at byte 1,965,054. That replay needs a persisted room video state, which this room does
    not have, so the offset here is always the live command's 0 and no `start=` is appended.
    The gap is recorded in `TODO.md`. What must NOT happen is a `startTime` invented onto the
    wire to make the branch look implemented: the value is a function of when the room
    started playing, and nothing here knows that.
  */
  if (command?.cmd === 'playYTForAll') {
    if (typeof command.url === 'string') broadcasts.youtubeStarted(command.url);
    return true;
  }
  if (command?.cmd === 'stopYTForAll') {
    // No payload is read. A url rides with the stop that precedes a play (byte 2,296,932)
    // and the reference's dispatch forwards none of it.
    broadcasts.youtubeStopped();
    return true;
  }
  return false;
}
