import type { RoomChatMute } from './chat-mute';

/**
 * `/privCmdsIn/{uid}-{id}/` — every command ADDRESSED TO ONE MEMBER.
 *
 * ## Why these are a subject rather than four branches in a router
 *
 * `RoomEventStream` routes six channels. Five carry frames for the whole room and this one does
 * not: every frame here names a single member, and what makes each safe is the same test. That test
 * is the subject, and it now happens ONCE — see below.
 *
 * The upstream switch has ELEVEN cases (bundle bytes 995800-997400, read whole rather than
 * searched). FIVE have a branch here — `forceReload`, `muteChat`, `unmuteChat`, `kickUser`,
 * `remoteRestartAudio` — and two more are built elsewhere because they are not addressed frames:
 * `getRoster` in `RoomRoster`, and `remotePresCommand` on the `cmds` channel.
 *
 * **THREE ARE LEFT and each is a feature rather than a branch.** `TODO.md` row 9 carries the audit
 * of 2026-08-26 — what each needs, with the sender's byte offset — and it is deliberately NOT
 * repeated here: an inventory of unbuilt work in two places is how one of them goes stale, which is
 * the rule that already cost this row four false blockers.
 *
 * ONE of the three has a constraint that belongs in code rather than in a register, because it is
 * about this gate: **`debugLogResp` cannot be ported as written.** Upstream replies
 * `{requestor: xe.requestor}` — the CLIENT names who receives the log — so a member could inject
 * content into any presenter's modal. Whoever builds it must have the server remember who asked and
 * ignore that field. It is the 2026-08-07 rule arriving on the one frame that travels member→
 * presenter instead of the other way.
 *
 * That queue is why this is a module: more receivers were about to be added to a router with no room
 * for them and no structural guarantee that each would remember to check who the frame was for.
 *
 * ## THE ADDRESSING TEST IS ONE GATE, AND THAT IS THE POINT
 *
 * Upstream does not need it. Its channel name contains the member's own id, so the server never
 * delivers somebody else's frame. **This room's transport is per-ROOM**, so `targetUserId` is the
 * only thing standing between one presenter reloading one member and reloading everybody at once —
 * or putting a `Chat Disabled` dialog in front of the whole room.
 *
 * It used to be repeated per branch as `command?.cmd === 'x' && command.targetUserId === …`. Four
 * copies of a security check is four chances to forget the second half. It is now a single early
 * return, **deny by default**: a frame that is not for this member never reaches a branch, and a
 * receiver added tomorrow is covered without its author knowing the rule exists.
 *
 * ## `disconnect` is passed per call, not held
 *
 * Two of the four close the stream, and the `EventSource` belongs to one subscription — a field here
 * would be a stale handle to a closed stream after any reconnect. The router passes its own
 * `source.close()`, which is what makes that impossible.
 */

/** The frame shape. Every field but `cmd` is optional because each command carries its own. */
export interface AddressedCommand {
  cmd?: string;
  targetUserId?: number;
  /** `kickUser` only — the presenter's own message, as `xe.msg` upstream. */
  msg?: unknown;
  /** `muteChat` only — an ISO instant, never a composed sentence. See `RoomChatMute`. */
  mutedTill?: unknown;
}

export class RoomPrivateCommands {
  constructor(options: {
    /** This member's own id. A thunk, because the page data is replaced on every load. */
    viewerId: () => number;
    /** Both mute directions, shared with the presenter's buttons — see `RoomChatMute`. */
    chatMute: RoomChatMute;
    /**
     * A presenter forced this member to reload, and the member has not been told yet.
     *
     * A RECEIVER rather than a `location.reload()` here, because the reference does not reload — it
     * ASKS. Byte 995901: `case "forceReload": e.disconnect(), e.appEventBus.emit("forceReload")`,
     * and the subscriber at byte 2597102 is
     * `bootbox.alert("You need to reload this page to continue", () => window.location.reload())`.
     * The dialog belongs to `RoomDialogs` and the page owns both, so the decision to raise one is
     * not this class's to make — the same reasoning `showTab` and `focusSessionNote` carry.
     */
    forceReloadRequested: () => void;
    /** `kickUser` — the member is removed; the argument is the presenter's own message. */
    kicked: (message: string) => void;
    /**
     * `remoteRestartAudio` — THIS browser re-consumes every microphone in the room.
     *
     * The work is `RoomMediaTransport.reconnectAudio`, which is narrower than a session restart on
     * purpose. Injected rather than reached through a media collaborator, so this class keeps no
     * opinion about media beyond "somebody asked for audio to come back".
     */
    reconnectAudio: () => Promise<void>;
  }) {
    this.#viewerId = options.viewerId;
    this.#chatMute = options.chatMute;
    this.#forceReloadRequested = options.forceReloadRequested;
    this.#kicked = options.kicked;
    this.#reconnectAudio = options.reconnectAudio;
  }

  readonly #viewerId: () => number;
  readonly #chatMute: RoomChatMute;
  readonly #forceReloadRequested: () => void;
  readonly #kicked: (message: string) => void;
  readonly #reconnectAudio: () => Promise<void>;

  /**
   * Route one addressed frame.
   *
   * @param disconnect closes the stream this frame arrived on — see the note on why it is a
   *   parameter rather than a field.
   * @returns whether the frame was for this member AND had a branch. `false` covers both "not mine"
   *   and "no receiver built yet": different things to a reader, the same thing to the caller.
   */
  handle(command: AddressedCommand | undefined, disconnect: () => void): boolean {
    if (!command?.cmd) return false;
    // THE ONE GATE. See the module docblock — this room's transport is per room, not per member.
    if (command.targetUserId !== this.#viewerId()) return false;

    if (command.cmd === 'forceReload') {
      /*
        DISCONNECT FIRST, THEN ASK — the order is the reference's, at byte 995901:

          case "forceReload": e.disconnect(), e.appEventBus.emit("forceReload")

        and it is the opposite of its neighbour two cases along, `case "kickUser":
        emit("kickPage", xe.msg), e.disconnect()`. Both were read in the same pass; the asymmetry is
        upstream's and is reproduced rather than normalised.

        Closing the stream before the dialog goes up is what makes the pause safe. The member may sit
        on that alert for a minute, and a channel still delivering frames into a page the server has
        already decided is stale would keep refetching and re-toasting behind it.

        Until 2026-08-23 this was a bare `location.reload()`: no disconnect, no warning, no
        dismissal. A member mid-sentence lost what they were typing with no notice.
      */
      disconnect();
      this.#forceReloadRequested();
      return true;
    }

    /*
      BOTH DIRECTIONS OF THE CHAT MUTE live in `#lib/room/chat-mute.ts` — the dialog, the
      toast, the sentence and the `invalidateAll()` that makes either true — together with the
      presenter's two buttons, because that split is how the pair drifted: `unmuteChat` had a real
      command and a real receiver for months while `mute-chat-24` raised the capture's own
      "user chat muted" over nothing, and no file held both sides to notice.
    */
    if (command.cmd === 'muteChat') {
      this.#chatMute.muted(command.mutedTill);
      return true;
    }
    if (command.cmd === 'unmuteChat') {
      this.#chatMute.unmuted();
      return true;
    }

    if (command.cmd === 'remoteRestartAudio') {
      /*
        `case "remoteRestartAudio": e.appEventBus.emit("remoteRestartAudio")` at byte 995973, whose
        subscriber at 1119299 is one line: `() => { this.reconnectAudio() }`.

        NOTHING IS SHOWN TO THE MEMBER, and that is the capture rather than an omission — the
        subscriber raises no toast and no dialog. The presenter is the one who gets told, by the
        alert on their own button, and even that is only ever "request sent". A member whose audio is
        being repaired has no reason to be interrupted about it.

        A FAILURE is still surfaced, because a silent failure here leaves somebody deaf while the
        presenter has been told the request went out. `reconnectAudio` rethrows for that reason and
        the handler passes it on.
      */
      void this.#reconnectAudio();
      return true;
    }

    if (command.cmd === 'kickUser') {
      /*
        EMIT FIRST, THEN DISCONNECT — the reverse of `forceReload` above, and upstream's own
        asymmetry rather than a normalisation of it. It reads correctly in that direction too: the
        kick carries a MESSAGE that must reach the screen, so tearing the stream down first risks
        racing the frame's own handler. The wire, and the ban that is written before this frame is
        ever published, are on `kickUser` in `presenter-commands.remote.ts`.

        NOT DONE, a gap rather than a decision: upstream sets `currPage="kicked"` and renders
        `app-kicked-page`. This room has none, so the member is told why and left disconnected.

        THE SECOND "GAP" RECORDED HERE WAS NOT ONE, and the correction is kept rather than the claim.
        This said a banned kick logs the member out upstream and that "this room does not". Both
        halves were wrong. `logout` occurs EXACTLY ONCE in the whole bundle, at byte 1011431, and
        that once is the emit — there is no subscriber, so upstream's own line does nothing. Ours
        ends the session SERVER-side on the next load (`+page.server.ts`, `logout(cookies)` then
        `redirectSignedOut()`), which a modified client cannot decline the way it can ignore an
        event. Pinned by `ban-ends-the-session-contract.test.ts`.
      */
      this.#kicked(typeof command.msg === 'string' ? command.msg : '');
      disconnect();
      return true;
    }

    return false;
  }
}
