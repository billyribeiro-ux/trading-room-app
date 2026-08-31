/**
 * The navbar's Start/Stop Screen Sharing dropdown — its props, and the argument for the four
 * attributes that are OURS.
 *
 * `ScreenShareMenu.svelte` renders it. This module holds the parts that are prose plus a type plus
 * one three-line function, because the component sits on a `source-size-contract` ceiling and the
 * ratchet's instruction when an explanation outgrows its file is to move the explanation to the
 * code it explains, never to shorten it.
 *
 * ## SSM-1 — the whole control was unreachable without a mouse, and the capture is why
 *
 * Upstream's markup for every entry is `<li title=… (click)=…><a aria-hidden="true">label</a></li>`
 * — `app-room`'s consts 185/186/187 carry the click, and const 158 is a bare
 * `["aria-hidden","true"]`. The trigger is const 182, an `<a>` with `data-bs-toggle="dropdown"` and
 * no `href`. Transcribed faithfully that produces a control with **no focusable element anywhere in
 * it**: an `<a>` without `href` is not in the tab order, an `<li>` never is, and the only
 * text-bearing node in each row is explicitly hidden from assistive technology. A presenter driving
 * the room from the keyboard could neither open this menu nor reach one item in it, and a screen
 * reader announced six empty list items.
 *
 * `role`, `tabindex`, `aria-label` and the Enter/Space handler are therefore ours, exactly as they
 * are ours on `GiphyPicker`'s two `input-group-text` spans and on `ScreenTabs`' tab anchors, and
 * for the identical reason: the capture puts a click handler on something no keyboard can reach.
 * `menu`/`menuitem` rather than `button` because this genuinely is a menu, and because those two
 * are the pair Svelte's own a11y table permits on `<ul>`/`<li>`
 * (`a11y_non_interactive_element_to_interactive_role_exceptions`). **`aria-hidden` STAYS on each
 * anchor**: it is captured, and with the name now on the `<li>` it no longer hides the label — it
 * merely stops the label being announced twice.
 *
 * One side effect is worth recording because it is evidence that the change is a repair rather than
 * a decoration: the trigger anchor's `<!-- svelte-ignore a11y_missing_attribute -->` had to be
 * DELETED, because `role="button"` satisfies the rule that its missing `href` used to break, and
 * eslint's `no-unused-svelte-ignore` said so. A suppression that stops being needed is a warning
 * that stopped being true. The snippet's own anchor keeps its ignore: that one has no role, and
 * `aria-hidden` is why it does not need one.
 *
 * The six rows became ONE snippet in the same change. That is not tidying: four attributes and a
 * key handler repeated six times are four attributes and a key handler that will be missing from
 * the seventh, and `screen-share-menu-contract.test.ts` asserts the snippet carries all of them.
 *
 * ## SSM-2 — all six clicks are on the `<li>`, where the capture splits them three and three
 *
 * The first three entries carry the click on the `<li>` (consts 185/186/187 each end `3,"click"`).
 * The last three carry it on the `<a>` instead — const 163, `["aria-hidden","true",3,"click"]` — in
 * `l4e`, `c4e` and `d4e`. All six carry it on the `<li>` here, deliberately.
 *
 * Measured: `.dropdown-menu li` has no rule of its own in `css/complete-app-styles.css`, and these
 * anchors are not `.dropdown-item` — they are bare inline `<a>` with no `href`, so an anchor's box
 * is exactly its text. Upstream's "Stop Sharing All Screens" is therefore clickable on its words
 * and dead on the rest of the row, while "Share Screen" two entries above is clickable across the
 * whole row. Reproducing that split would reproduce a hit-target bug, and it would also put the
 * focusable element on the one node `aria-hidden` is on. One shape for all six.
 *
 * ## SSM-3 — none of the six is inert upstream, and that was checked rather than assumed
 *
 * The `StreamTabs` pass found four controls in the stream tab that are inert UPSTREAM — a forced
 * eye badge with no writer, a lock badge with no writer, a `toggleLockScreenMTX` whose body is
 * `console.error("TODO: …")`, and a "Bring everyone here" whose `focusOnScreen` no receiver
 * resolves. All six entries here were checked against that class and none is in it. Upstream they
 * reach `mediaService.startScreenSharing`, `mediaService.stopSharingAll`,
 * `mediaService.stopSharingProducer`, `openStreamingTab()` and `reopenPreviewWindow()`, each a real
 * body; here each of the six callbacks arrives from `routes/+page.svelte` (:1203, :1204, :1223,
 * :1224, :1225) and lands on a real implementation. Nothing in this menu is a label with no writer.
 */

/** One screen THIS browser is sharing; upstream's `mediaSoupService.screenProducers` map entry. */
export type LocalScreen = { readonly id: string; readonly screenName: string };

export interface ScreenShareMenuProps {
  /** `mediaService.isScreenSharing` — three of the six entries are behind it. */
  screenSharing: boolean;
  /** `menus.screen`; the navbar owns which top-level menu is open, because only one may be. */
  menuOpen: boolean;
  /**
   * The three captured labels, passed rather than restated. `virtualCamText` is
   * ' OBS / XSPLIT/ Share Virtual Cam' — the spacing and the missing space after the second slash
   * are the reference's, and one of them has already been the source of a bug here.
   */
  shareScreenText: string;
  virtualCamText: string;
  stopSharingAllText: string;
  /** `sessData.useMediaMTX`. */
  streamingTabAvailable: boolean;
  /** The screens THIS browser is sharing; upstream's `screenProducers` map. */
  localScreens: readonly LocalScreen[];
  ontoggle: () => void;
  onpromptforscreenname: (source: 'screen' | 'camera') => void;
  onstopscreensharing: () => void;
  onopenstreamingtab: () => void;
  onreopenpreview: () => void;
  onstoplocalscreen: (producerId: string) => void;
}

/**
 * Enter and Space, and `preventDefault` on both.
 *
 * Space scrolls the page on anything that is not a native control, and Enter on a focused
 * `role="menuitem"` must not also reach the `<li title>` ancestor whose only job is to stop the
 * navbar's document-level close. The capture has no keyboard path at all, so there is nothing here
 * to diverge from.
 */
export function activateOnKey(event: KeyboardEvent, run: () => void): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  run();
}
