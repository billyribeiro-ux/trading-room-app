/**
 * The shape of a frame on the `cmds` channel, as the CLIENT reads it.
 *
 * ## Why it is a module and not an inline type
 *
 * It was written inline in `events.svelte.ts`, inside the branch that reads it, and it grew a field
 * per command until it was longer than most of the handlers it serves. That is the growth
 * `source-size-contract.test.ts` exists to stop, and this is the extraction it asks for rather than
 * a raised ceiling.
 *
 * There is a second reason, and it outlives the line count: this type is one half of a WIRE. The
 * other half is the `channel: 'cmds'` arm of `RoomEvent` in `#lib/server/room-events.ts`, and the two
 * cannot import each other — server-only modules must not reach the client bundle. Two declarations
 * of one contract, in two files, joined by nothing. Naming this one makes the pairing visible and
 * gives the drift somewhere to be noticed.
 *
 * ## Everything is optional, and that is not laziness
 *
 * A frame arrives as parsed JSON from a socket. Declaring `cmd` required would be asserting, at the
 * type level, something no runtime check has established — which is the shape of the 2026-08-07
 * privilege escalation, where a token TYPE was read as authority. Every handler tests what it needs.
 *
 * `muser` and `data` stay `unknown` for the same reason, one step further: `isMtxStream` is what
 * decides whether a payload may reach a playlist URL, and a type here that promised the shape would
 * make that guard look optional.
 */
export interface CmdsFrame {
  cmd?: string;
  subCmd?: string;
  targetUserId?: number;
  recName?: string;
  /** `giveMicScreen`'s payload: `{give: boolean}`. */
  give?: boolean;
  /** `playMP3ForAll`'s payload: `{url}`. Room-wide, so it carries no target. */
  url?: string;
  /** `focusOnScreen` — the producer id of the screen to move to. */
  screenId?: string;
  /** `focusOnSessionNote` — the note a presenter pulled the room to. */
  noteId?: number;
  /**
   * `updatedSessionNote`'s tab NAME — USM-11, and the one string on this frame that is DISPLAYED.
   *
   * Safe to render because it is server-authored and already visible: the frame is published by
   * `saveSessionNote` in `+page.server.ts`, not relayed from a client, and a note's tab name is
   * drawn for everyone who can see the pane at all. The note's BODY is deliberately not sent —
   * `invalidateAll()` re-reads it, which is the authority.
   */
  noteName?: string;
  /** `changeChatMode`'s payload — `g`, `p` or `d`. The row in `room_state` is the authority. */
  mode?: string;
  /**
   * Who performed the act, on the four message-mutation frames — see `#lib/message-mutation-frames.ts`.
   *
   * ONLY ever compared against the recipient's own id, to skip a refetch that browser has already
   * done. It is not authority and nothing may read it as such: the frame carries no payload, so
   * there is nothing for a forged id to unlock, and the server has already applied every rule
   * before publishing.
   */
  actorUserId?: number;
  /**
   * `mtxStartStream` / `mtxStopStream` carry the stream under `muser` — the reference's own key
   * (byte 1010826), and the reason `mtx-streams.ts` describes an MTX stream as "simply another
   * muser". Typed `unknown` because `isMtxStream` is what decides.
   */
  muser?: unknown;
  /** `getSessionMTXMediaState`'s full list. Same reason: validated, not asserted. */
  data?: unknown;
  /**
   * `sessionRevoked` — the server's stated reason, shown to the member verbatim.
   *
   * OURS rather than the reference's, which never ends a live connection at all. Composed on the
   * server because three different things produce one and they are not interchangeable; see
   * `#lib/server/live-access.ts`.
   */
  message?: string;
}
