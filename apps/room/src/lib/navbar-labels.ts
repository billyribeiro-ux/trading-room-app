/*
  The four navbar strings the capture spells exactly, with their spacing intact.

  ## Why they are a module and not four `const`s in a component

  Every one of them is EVIDENCE — a string read off the reference, not a label chosen here — and
  this repository already keeps its other captured measurements in modules (`DUMP_CONTRACT`,
  `DIRECT_EVIDENCE_CONTRACT`, `CAPTURED_ALERTS_PERCENT`). These four were the exception, sitting as
  bare literals in `+page.svelte` where nothing marked them as captured, and they are now passed as
  props to `RoomNavbar` — so without a single home they would have been a string in one file and a
  prop type in another, with nothing saying which one is right.

  ## The spacing is not a typo, and it has already caused a bug

  Read them carefully:

  - `' ( No one is speaking )'` — leading space, and spaces inside the parentheses.
  - `'Share Screen '` — TRAILING space, no leading one.
  - `' OBS / XSPLIT/ Share Virtual Cam'` — leading space, a space before the first slash and none
    before the second. The asymmetry is the reference's.
  - `' Stop Sharing All Screens'` — leading space.

  That third one is why this file carries a warning rather than just the values. A menu item once
  went unclicked in this repository because a regex was built out of that exact label, and the
  slashes inside it were read as pattern syntax. **Compare these strings with `===`. Never build a
  pattern from one.**
*/

/** `Ne(" ", …)` — the talking indicator when nobody has a microphone open. */
export const NO_SPEAKER_TEXT = ' ( No one is speaking )';

/** The screen-share menu's first item. Trailing space, no leading one. */
export const SHARE_SCREEN_TEXT = 'Share Screen ';

/** The virtual-camera item. The uneven spacing around the slashes is the capture's. */
export const VIRTUAL_CAM_TEXT = ' OBS / XSPLIT/ Share Virtual Cam';

/** The item that ends every share at once. */
export const STOP_SHARING_ALL_TEXT = ' Stop Sharing All Screens';
