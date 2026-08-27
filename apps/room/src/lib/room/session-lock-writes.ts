/**
 * The three lock actions, as what each one WRITES and SAYS.
 *
 * ## Why a table
 *
 * `RoomSessionControl` handles eleven session actions, and these three are the only group that
 * contacts nothing at all: two preference writes and one captured sentence each, with no command, no
 * reload and no modal to close. As branches they cost four lines apiece and grew this file every
 * time the room learned another lock state — which is what pushed it past its ceiling when the
 * hard-reset and open senders landed beside them.
 *
 * A table also makes the ASYMMETRY visible, which three separate branches hid: locking writes two
 * preferences and unlocking writes one. `sessionLockKick` is deliberately not cleared on unlock —
 * it is the answer to "and kick everyone out when you lock", which is a setting about the NEXT lock
 * rather than state belonging to the current one. Clearing it would silently change what the
 * presenter's next click does.
 *
 * ## The two sentences are the capture's
 *
 * `Session Locked` and `Session Unlocked`, verbatim, including that neither ends in a full stop.
 */
export interface SessionLockWrite {
  /** Preference key to value. Applied in declaration order, which only matters if a pair conflicts. */
  preferences: Record<string, boolean>;
  /** The dialog raised afterwards — the reference's own wording. */
  alert: string;
}

export const SESSION_LOCK_WRITES: Readonly<Record<string, SessionLockWrite | undefined>> = {
  'session-lock': {
    preferences: { sessionLocked: true, sessionLockKick: false },
    alert: 'Session Locked'
  },
  'session-lock-kick': {
    preferences: { sessionLocked: true, sessionLockKick: true },
    alert: 'Session Locked'
  },
  'session-unlock': {
    // `sessionLockKick` is NOT cleared here. See the docblock: it configures the next lock.
    preferences: { sessionLocked: false },
    alert: 'Session Unlocked'
  }
};
