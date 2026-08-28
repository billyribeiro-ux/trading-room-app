import { invalidateAll } from '$app/navigation';

import { chatMutedMessage } from '#lib/message-formatters.js';

/**
 * THE CHAT MUTE, both directions and both ends, in the browser.
 *
 * ## Why one module rather than four places
 *
 * A mute has four halves and until 2026-08-23 they lived in four files that could not see each
 * other: the presenter's two buttons in `RoomUserActions`, and the muted member's two receivers in
 * `RoomEventStream`. That split is exactly how the pair drifted — `unmuteChat` was given a real
 * command and a real receiver while `mute-chat-24` sat in `EXACT_ALERTS` raising the capture's own
 * *"user chat muted"* over nothing at all, and nothing anywhere could notice the asymmetry because
 * no file held both sides.
 *
 * They are one subject: what a presenter does, what the member sees, and the rule that those two
 * agree. The server half is `#lib/server/chat-mute.ts`, which is the same argument applied to the
 * two doors onto the insert.
 *
 * ## THE ASYMMETRY IS THE POINT, and it is upstream's
 *
 * Bundle byte 1430423, both subscriptions on adjacent lines:
 *
 *     subscribe("muteChat",   e  => { this.chatEnabled = !1, bootbox.alert(e) })
 *     subscribe("unmuteChat", () => { this.chatEnabled = !0,
 *                                     this.alertService.success("Chat enabled") })
 *
 * Being SILENCED raises a dialog that must be dismissed; being RELEASED raises a passing toast. That
 * is the right way round and is reproduced rather than normalised: a member who steps away during a
 * transient toast comes back to a composer that has silently stopped working, with no explanation
 * anywhere. Acknowledgement belongs on the bad news.
 *
 * Collapsing the two into one skin would also put the presenter's wording in front of the member —
 * *"user chat unmuted"* is what the presenter is told, `Chat enabled` is what the member is told,
 * and they are two strings on two screens.
 */

/** The two commands, injected so this module needs no route import. */
export interface ChatMuteCommands {
  /** *" Mute Chat for 24hrs "* — presenter-gated on the server, like its opposite. */
  muteChat: (payload: { targetUserId: number }) => Promise<unknown>;
  /** *" Mute Chat indefinately "* — a separate command; why, on `muteChatIndefinitely`. */
  muteChatIndefinitely: (payload: { targetUserId: number }) => Promise<unknown>;
  unmuteChat: (payload: { targetUserId: number }) => Promise<unknown>;
}

export class RoomChatMute {
  constructor(options: {
    commands: ChatMuteCommands;
    /** A modal that must be dismissed. The MUTE gets this one. */
    alert: (message: string) => void;
    /** A transient notice. The UNMUTE gets this one, as the reference does. */
    notice: (message: string) => void;
    /** The presenter's own view of the roster — see the note above the two senders. */
    reload: () => Promise<void>;
    /**
     * Alert FIRST, send after, and turn a rejection into `Command failed.` — one implementation,
     * shared with `RoomKicks` through the same injection rather than written out again here.
     */
    announceThenSend: (alert: string, send: () => Promise<unknown>) => void;
  }) {
    this.#commands = options.commands;
    this.#alert = options.alert;
    this.#notice = options.notice;
    this.#reload = options.reload;
    this.#announceThenSend = options.announceThenSend;
  }

  readonly #commands: ChatMuteCommands;
  readonly #alert: (message: string) => void;
  readonly #notice: (message: string) => void;
  readonly #reload: () => Promise<void>;
  readonly #announceThenSend: (alert: string, send: () => Promise<unknown>) => void;

  /*
    ── THE PRESENTER'S TWO BUTTONS ────────────────────────────────────────────────────────────────

    Both end in `#reload`, and that call runs by hand because it has to: single-flight mutations
    refresh remote QUERIES, and the presenter's roster is not one — it comes from the route's `load`.
    Converting it is its own change, and doing it here would be claiming a refresh that never happens.

    Neither is awaited by its caller — `RoomUserActions.handle` is synchronous — but both ARE caught,
    by `#announceThenSend`. A remote command REJECTS where the old `fetch('?/unmuteChat')` returned
    `response.ok === false` for anyone who bothered to look, and nobody did; that is the same silent
    success this whole path was built to end.
  */

  /**
   * Mutes a member's chat for 24 hours.
   *
   * The MEMBER is not told from here. Their gate is read on the server, so nothing local to them has
   * changed and a client-side announcement would be a second answer to a question the server owns;
   * `applyChatMute` publishes the frame that `muted()` below receives.
   */
  async mute(targetUserId: number): Promise<void> {
    await this.#commands.muteChat({ targetUserId });
    await this.#reload();
  }

  /** Silences a member until somebody lifts it — the controller's opcode 3. */
  async muteIndefinitely(targetUserId: number): Promise<void> {
    await this.#commands.muteChatIndefinitely({ targetUserId });
    await this.#reload();
  }

  /** Lifts a member's chat mute — the other half of `mute24`, and the frame `unmuted()` receives. */
  async unmute(targetUserId: number): Promise<void> {
    await this.#commands.unmuteChat({ targetUserId });
    await this.#reload();
  }

  /**
   * The two modal buttons. `false` means "not mine", never "nothing happened" — the same contract
   * `RoomSessionControl.handle` and `RoomKicks.handle` carry, and the reason `ModalHost` keeps ONE
   * `onUserAction` door rather than making the caller decide which class owns a string.
   *
   * Both announce BEFORE they send, which is the order every sibling uses and the order the
   * reference's own `muteChat` has: `sendServerAdminCommand(…), bootbox.alert(…)` in one comma
   * expression, neither awaiting the other. The failure path belongs to the send.
   */
  handle(action: string, targetUserId: number): boolean {
    /*
      `mute-chat-24` — WIRED 2026-08-23. It was the THIRD entry ever removed from `EXACT_ALERTS`,
      after `unmute-chat` and `force-reload`, and it went for the reason both of those did: its
      presence in that table WAS the bug. The button raised the reference's own *"user chat muted"*
      over nothing at all, while a working mute — the message context menu's `mute24` — sat in the
      same source with nothing joining them. That table's docblock named this one explicitly:
      *"`mute-chat-24` from this modal does not mute"*.

      *" Mute Chat indefinately "* (the reference's own spelling) IS here since 2026-08-27 and is
      still not folded into the 24-hour one — two stores, two commands; see `muteChatIndefinitely`.
      BOTH RAISE THE SAME ALERT, which is the capture's: `muteChat(e)` alerts once whatever `e` is.
    */
    if (action === 'mute-chat-24') {
      this.#announceThenSend('user chat muted', () => this.mute(targetUserId));
      return true;
    }
    if (action === 'mute-chat-indefinitely') {
      this.#announceThenSend('user chat muted', () => this.muteIndefinitely(targetUserId));
      return true;
    }
    if (action === 'unmute-chat') {
      this.#announceThenSend('user chat unmuted', () => this.unmute(targetUserId));
      return true;
    }
    return false;
  }

  /*
    ── THE MUTED MEMBER'S TWO RECEIVERS ───────────────────────────────────────────────────────────

    `invalidateAll()` on both sides, and it is load-bearing in both directions rather than a refresh
    for tidiness: `chatMutedTill` is read on the SERVER, so the composer does not actually lock or
    unlock until the loader runs again. Announcing either without it would tell the member something
    the box in front of them contradicts — which is the same class of lie as the original bug.
  */

  /** `muteChat` arrived for this member. A dialog, because being silenced must be acknowledged. */
  muted(mutedTill: unknown): void {
    this.#alert(chatMutedMessage(mutedTill));
    void invalidateAll();
  }

  /**
   * `unmuteChat` arrived for this member.
   *
   * The capture's receiver toast for the unmute, verbatim: `Chat enabled`. It is a plain info toast,
   * not the presenter's `user chat unmuted` — those are two different strings on two different
   * screens and collapsing them would put the presenter's wording in front of the member.
   *
   * `invalidateAll()` is what actually re-opens the composer: `chatMutedTill` is read on the server,
   * so the gate does not lift until the loader runs again. Toasting without it would tell the member
   * they can type while the box stayed disabled.
   */
  unmuted(): void {
    this.#notice('Chat enabled');
    void invalidateAll();
  }
}
