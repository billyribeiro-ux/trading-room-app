import { isHttpError } from '@sveltejs/kit';

import type { PrivateChatMessage } from './private-chat.svelte';

/*
  THE USER-INFO MODAL'S "SHOW PRIVATE MESSAGES" — one member's whole conversation with the viewer.

  Extracted from `RoomPrivateChat` on 2026-08-30. It had lived there since the private-chat slice was
  written, and it never belonged: `RoomPrivateChat` is the floating PANEL — its tabs, its draft, its
  paging — and this is a read-only modal opened from somewhere else entirely, sharing nothing with it
  but the word "private".

  The move was prompted by the panel's paging fix needing lines in a file on its ceiling, and it
  passes the test the ratchet's own header demands: three fields, three getters and one loader, with
  no reader or writer anywhere else in the class it left.
*/

/** What the all-user private-message modal is showing, as `loadPeerPrivateMessageHistory` answers it. */
export type PeerHistory = {
  readonly nick: string;
  readonly messages: readonly PrivateChatMessage[];
  readonly truncated: boolean;
};

export class RoomPeerHistory {
  #history: PeerHistory | null;
  #loading;
  #error: string | null;

  readonly #load: (payload: { peerId: number }) => Promise<PeerHistory>;

  constructor(load: (payload: { peerId: number }) => Promise<PeerHistory>) {
    this.#load = load;
    this.#history = $state.raw<PeerHistory | null>(null);
    this.#loading = $state(false);
    this.#error = $state<string | null>(null);
  }

  get history(): PeerHistory | null {
    return this.#history;
  }

  get loading() {
    return this.#loading;
  }

  get error(): string | null {
    return this.#error;
  }

  /**
   * `showPrivateMessages()` - the user-info modal's button, gated on the room setting.
   *
   * Upstream this emits `doUserPMModal` on the GUI event bus and a separate component subscribes,
   * clears, and fetches (bundle bytes 2,087,336 and 2,417,900). There is no bus here and there does
   * not need to be: the modal and the fetch are both this class's, so the event is a method call.
   * What IS reproduced is the ORDER - clear first, then load - because the alternative shows the
   * previous member's private messages under the new member's name while the request is in flight.
   *
   * The entitlement is NOT checked here. `loadPeerPrivateMessageHistory` refuses on the server from
   * the control plane, which is the only check that means anything; the button that calls this is
   * already gated so a member never sees it, and re-deciding it here would be a third copy of a rule
   * whose authoritative copy is the one on the server.
   */
  async show(peerId: number): Promise<void> {
    this.#history = null;
    this.#error = null;
    this.#loading = true;
    try {
      const answer = await this.#load({ peerId });
      this.#history = answer;
    } catch (cause) {
      /*
        The server's own message when it has one - `isHttpError` is how every other refusal in this
        file is surfaced, and the two that can arrive here ("Presenters only." and the room not
        having the setting) are both worth reading rather than replacing with a generic failure.
      */
      this.#error = isHttpError(cause) ? cause.body.message : 'Could not load private messages.';
    } finally {
      // `finally`, so a refusal cannot leave the modal spinning forever.
      this.#loading = false;
    }
  }
}
