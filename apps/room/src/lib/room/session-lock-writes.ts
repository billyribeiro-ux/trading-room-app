/**
 * The three lock actions, as what each one SENDS and SAYS.
 *
 * ## What this table used to be, and why the change is a defect closed
 *
 * It was a table of PREFERENCE writes: `session-lock` wrote
 * `{sessionLocked: true, sessionLockKick: false}`, `session-lock-kick` the same with `kick: true`,
 * and `session-unlock` `{sessionLocked: false}` — each into the clicking presenter's own settings
 * blob — and then raised the capture's own `Session Locked`.
 *
 * **Measured 2026-09-02: both keys had ZERO readers anywhere in `apps/room/src`.** A presenter
 * locked the room, was told the room was locked, and the door stayed open to everybody. Same defect
 * as the Stream Player pane (`SC-04`) and the chat-mode radio: a ROOM-level presenter act modelled
 * as a per-user preference — invisible precisely because the pane shows the value back to the person
 * who set it.
 *
 * The lock is a room SETTING on the controller, and `decideRoomEntry` has refused a locked room at
 * the guest door since before any of this was written. Only the write was missing.
 *
 * ## Why it is still a table
 *
 * The original argument holds and is why this file survived the rewrite: three branches cost four
 * lines apiece and grew `session-control.ts` every time the room learned another lock state.
 *
 * A table also keeps the ASYMMETRY visible, which three branches hid — and the asymmetry MOVED. It
 * used to be that locking wrote two preferences and unlocking wrote one. It is now that
 * `session-lock-kick` differs from `session-lock` by ONE FIELD on the payload, and that field is
 * accepted and not acted on. See `kick` below.
 *
 * ## The two sentences are the capture's
 *
 * `Session Locked` and `Session Unlocked`, verbatim, including that neither ends in a full stop.
 * Raised AFTER the command resolves, not before it — the old table raised them unconditionally,
 * which is what made a failed write indistinguishable from a successful one.
 */
export interface SessionLockCommand {
  /** `{lock}` on the reference's `lockSession` payload. */
  lock: boolean;
  /**
   * `{kick}` — sent, recorded, and NOT acted on, which is stated rather than hidden.
   *
   * Upstream's middle button sends `{kick: true, lock: true}` (byte 2,165,670) and its SERVER
   * evicts everybody. This deployment has no evict-everyone command: `kicks.svelte.ts` kicks one
   * named member, and the realtime hub is process-local, so a fan-out from the room would reach one
   * instance's listeners and silently miss the rest.
   *
   * Locking without kicking is the strictly safer half — nobody new gets in, and the members already
   * inside are exactly the ones a presenter can see and remove one at a time. A button that CLAIMED
   * to kick and reached one instance would be a worse lie than the one this table replaced.
   *
   * It is `false` on `session-unlock` rather than absent: the command's payload is a `strictObject`,
   * so an omitted field is a validation refusal and not a different meaning. Upstream's
   * `unlockSession()` sends `{lock: !1}` with no `kick` at all, and that difference is the schema's
   * rather than the feature's.
   */
  kick: boolean;
  /** The dialog raised after the command resolves — the reference's own wording. */
  alert: string;
}

export const SESSION_LOCK_WRITES: Readonly<Record<string, SessionLockCommand | undefined>> = {
  'session-lock': { lock: true, kick: false, alert: 'Session Locked' },
  'session-lock-kick': { lock: true, kick: true, alert: 'Session Locked' },
  'session-unlock': { lock: false, kick: false, alert: 'Session Unlocked' }
};
