/**
 * WHO IS TOLD WHEN SOMEBODY JOINS OR LEAVES, and what they hear.
 *
 * ## Why this is not in `events.svelte.ts`, where it was written
 *
 * `RoomEventStream`'s own docblock states its shape: *"It is a ROUTER, and it owns almost nothing …
 * every frame the server pushes arrives here and is routed, on six channels, to the class that owns
 * the state it changes."* Every other frame obeys that — `roster.countArrived`, `mtx.started`,
 * `broadcasts.mp3Started`, `privateChat.ingest`. This one could not, because a join changes NO state
 * and therefore has no owner to be routed to. It is a decision, not a delivery: four gates, two
 * toast skins and two sounds, evaluated in the router because there was nowhere else to put them.
 *
 * So the seam is the file's own rule applied to the one block that broke it, and the dependency
 * surface is the evidence rather than the argument — the router injects sixteen collaborators and
 * this needs facts from four of them, none of which it mutates.
 *
 * ## The shape is `alert-delivery.ts`'s, deliberately
 *
 * That module answers the identical question for an arriving ALERT — event plus preferences in, a
 * toast and a sound out, `null` for "say nothing at all" — and is a pure module in `lib/` for the
 * reason `roster-gates.ts` gives at its own head: *"a gate that is only reachable by rendering a
 * 8000-line component is a gate nobody tests, and these are precisely the predicates that decide
 * whether one member can see another."* These four gates were reachable only by constructing a
 * `RoomEventStream` around a live `EventSource`. Now they are four arguments and a return value.
 *
 * ## Transcribed from the bundle, byte 2507680, read rather than searched
 *
 * ```js
 * subscribe("onUserJoin", i => globals.isPresenter && globals.user.userXrefID !== i.userXrefID && (
 *   globals.sessData.userJoinAndLeavePopup && globals.preferences.popupOnUserJoin
 *     && alertsService.info(`${i.nick} logged in.`),
 *   globals.sessData.beepOnUserJoin && globals.preferences.beepOnUserJoin
 *     && !globals.preferences.doNotDisturbOn && soundEffectsService.userJoin.play()))
 *
 * subscribe("onUserLeave", i => globals.isPresenter && globals.user.userXrefID !== i.userXrefID && (
 *   globals.sessData.userJoinAndLeavePopup && globals.preferences.popupOnUserLeave
 *     && alertsService.warning(`${i.nick} logged out.`),
 *   globals.sessData.beepOnUserJoin && globals.preferences.beepOnUserLeave
 *     && !globals.preferences.doNotDisturbOn && soundEffectsService.userLeave.play()))
 * ```
 *
 * Five things in that are load-bearing, and each is executed by a case in the contract test:
 *
 * * **PRESENTER ONLY.** A member is not told who came and went.
 * * **NEVER YOURSELF** — `user.userXrefID !== i.userXrefID`. Opening the room would otherwise
 *   announce your own arrival to you.
 * * **TWO GATES PER EFFECT, and they are different gates.** The popup needs the ROOM setting
 *   `userJoinAndLeavePopup` and the VIEWER preference `popupOnUserJoin` / `popupOnUserLeave`; the
 *   beep needs the room's `beepOnUserJoin` and the viewer's `beepOnUserJoin` / `beepOnUserLeave`. An
 *   owner can turn the feature off for the room, and a presenter can turn it off for themselves.
 * * **`info` for a join, `warning` for a leave** — two different toast skins, and the strings are
 *   "logged in." / "logged out." with the full stop.
 * * **Do Not Disturb silences the BEEP and not the POPUP.** `!doNotDisturbOn` appears in the sound
 *   conjunction and in neither popup conjunction. That reads like an oversight and is reproduced,
 *   because it is what the room does.
 *
 * THE QUIRK, reproduced: the LEAVE beep reads the room's `beepOnUserJoin`, not a `beepOnUserLeave`.
 * There is no such room setting upstream — confirmed independently at byte 2230981, where the
 * settings pane's "Users join/leave:" block renders `beepOnUserJoin` and `userJoinAndLeavePopup`
 * twice each, once for the join row and once for the leave row. Only the VIEWER preference is
 * per-direction. Transcribed rather than tidied.
 */

/** The two flags the SESSION owns. Optional: absent means the owner never turned it on. */
export interface ArrivalRoomSettings {
  userJoinAndLeavePopup?: boolean;
  beepOnUserJoin?: boolean;
}

/**
 * The five flags the VIEWER owns, which `RoomPrefs` satisfies structurally.
 *
 * Note that four of the five are per-direction while the room has one flag for both — that
 * asymmetry is upstream's and is the subject of the quirk note above.
 */
export interface ArrivalPreferences {
  popupOnUserJoin: boolean;
  popupOnUserLeave: boolean;
  beepOnUserJoin: boolean;
  beepOnUserLeave: boolean;
  doNotDisturbOn: boolean;
}

export interface ArrivalEvent {
  direction: 'join' | 'leave';
  nick: string;
  /** `user.userXrefID === i.userXrefID` — the room does not announce you to yourself. */
  isSelf: boolean;
  /** `globals.isPresenter`. A member is told nothing. */
  viewerIsPresenter: boolean;
}

export interface ArrivalAnnouncement {
  sound: 'userJoin' | 'userLeave' | null;
  toast: { kind: 'info' | 'warning'; message: string; enableHtml: false } | null;
}

/**
 * What this viewer should see and hear, or `null` for nothing at all.
 *
 * The two return shapes are not interchangeable and map onto the reference's own structure: `null`
 * is the OUTER guard — not a presenter, or it is you — where upstream never evaluates either effect.
 * A populated object with two nulls is the inner case, where the guard passed and both gates
 * happened to be off. Collapsing them would lose the distinction between "this room does not
 * announce arrivals to you" and "it does, and you have turned both off".
 */
export function resolveArrivalAnnouncement(
  event: ArrivalEvent,
  room: ArrivalRoomSettings,
  preferences: ArrivalPreferences
): ArrivalAnnouncement | null {
  if (!event.viewerIsPresenter || event.isSelf) return null;

  const joined = event.direction === 'join';

  const popup =
    Boolean(room.userJoinAndLeavePopup) &&
    (joined ? preferences.popupOnUserJoin : preferences.popupOnUserLeave);

  /*
    `room.beepOnUserJoin` on BOTH branches — see the quirk note at the head of the file. The viewer
    preference is the only per-direction half, and Do Not Disturb is checked here and not on the
    popup because that is where the reference checks it.
  */
  const beep =
    Boolean(room.beepOnUserJoin) &&
    (joined ? preferences.beepOnUserJoin : preferences.beepOnUserLeave) &&
    !preferences.doNotDisturbOn;

  return {
    sound: beep ? (joined ? 'userJoin' : 'userLeave') : null,
    toast: popup
      ? {
          kind: joined ? 'info' : 'warning',
          message: `${event.nick} logged ${joined ? 'in' : 'out'}.`,
          enableHtml: false
        }
      : null
  };
}
