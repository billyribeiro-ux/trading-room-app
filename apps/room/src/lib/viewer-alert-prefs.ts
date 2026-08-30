/*
  THE ALERTS TAB'S FIVE GATED VIEWER PREFERENCES — the three room gates, and the five switches.

  Five controls the reference has that this room did not, and every one of them sat over a LIVE
  consumer:

  | preference | consumer, all along | control |
  | --- | --- | --- |
  | `beepOnUserJoin` | `arrival-announcement.ts` | none |
  | `popupOnUserJoin` | `arrival-announcement.ts` | none |
  | `beepOnUserLeave` | `arrival-announcement.ts` | none |
  | `popupOnUserLeave` | `arrival-announcement.ts` | none |
  | `updatePositionsIframe` | `PositionsContainer` | none |

  The four arrival preferences seed to ON (`!== false` in `RoomPrefs`), so a presenter was popped at
  and beeped at on every arrival and departure with nothing anywhere to stop it. The fifth was the
  mirror image: `+page.svelte` read `prefs.loaded.updatePositionsIframe === true` off the decoded
  blob, and an absent key is not `true`, so the positions panel's thirty-second refresh was OFF for
  everybody — while the reference defaults it ON (`updatePositionsIframe:!0`, byte 980,052).

  ## Why a module rather than an object literal at the call site

  Same reason `capture-settings.ts` is one: it is assembled from two different places — the room's
  `sessData` and the viewer's `RoomPrefs` — and the ROOM half is three gates with real logic in
  them, not a pass-through. A literal in `RoomOverlays.svelte` put that logic in markup where nothing
  could test it, and cost that file ten lines it does not have.
*/

/** The three room gates and the five viewer preferences the pane draws. */
export interface ViewerAlertPrefs {
  /** `sessData.beepOnUserJoin` — the room's half of the beep, for BOTH directions. See below. */
  readonly roomBeepOnUserJoin: boolean;
  /** `sessData.userJoinAndLeavePopup` — the room's half of the popup, for both directions. */
  readonly roomJoinLeavePopup: boolean;
  /** `sessData.positionsIframe && sessData.positionsIframeUrl`, already resolved to one answer. */
  readonly positionsIframe: boolean;
  readonly beepOnUserJoin: boolean;
  readonly popupOnUserJoin: boolean;
  readonly beepOnUserLeave: boolean;
  readonly popupOnUserLeave: boolean;
  readonly updatePositionsIframe: boolean;
}

/** Whatever the room's configuration says, read defensively — every field is optional upstream. */
export interface ViewerAlertRoomSettings {
  readonly beepOnUserJoin?: boolean;
  readonly userJoinAndLeavePopup?: boolean;
  readonly positionsIframe?: boolean;
  readonly positionsIframeUrl?: string;
}

/** The viewer's own five, as `RoomPrefs` currently holds them. */
export interface ViewerAlertViewerPrefs {
  readonly beepOnUserJoin: boolean;
  readonly popupOnUserJoin: boolean;
  readonly beepOnUserLeave: boolean;
  readonly popupOnUserLeave: boolean;
  readonly updatePositionsIframe: boolean;
}

/**
 * The two halves, resolved into what the pane renders.
 *
 * ## The room gates are `=== true`, and the viewer values are not
 *
 * A room setting arrives from the controller and is `boolean | undefined`; absent means the owner
 * never enabled the feature, so `=== true` is the right reading and the deny-by-default one. The
 * viewer's five are already real booleans by the time `RoomPrefs` has seeded them — with their own
 * `!== false` defaults, which is where "on unless turned off" is decided.
 *
 * ## `positionsIframe` needs the URL as well
 *
 * `O(119, sessData.positionsIframe && sessData.positionsIframeUrl ? 119 : -1)` at byte 2,285,255.
 * A room that has switched the panel on without giving it an address has no panel, so a switch over
 * its refresh rate would configure nothing. Resolved to one boolean here rather than passed as two,
 * because the url is a room value the modal has no other reason to hold.
 */
export function viewerAlertPrefsFrom(
  room: ViewerAlertRoomSettings | null | undefined,
  viewer: ViewerAlertViewerPrefs
): ViewerAlertPrefs {
  return {
    roomBeepOnUserJoin: room?.beepOnUserJoin === true,
    roomJoinLeavePopup: room?.userJoinAndLeavePopup === true,
    positionsIframe: room?.positionsIframe === true && Boolean(room?.positionsIframeUrl),
    beepOnUserJoin: viewer.beepOnUserJoin,
    popupOnUserJoin: viewer.popupOnUserJoin,
    beepOnUserLeave: viewer.beepOnUserLeave,
    popupOnUserLeave: viewer.popupOnUserLeave,
    updatePositionsIframe: viewer.updatePositionsIframe
  };
}
