/**
 * Tawk.to presenter support — `app-room.full.js:2224-2298`.
 *
 * ```js
 * ngAfterViewInit() {
 *   sessData.tawkPresenterSupport && (this.loadTawkSupport(), this.setTAWKAttributes()), …
 * }
 *
 * loadTawkSupport() {
 *   if (this.appService.globals.isPresenter) {
 *     var e = document.createElement('script'), i = document.getElementsByTagName('script')[0];
 *     e.async = !0;
 *     e.src = 'https://embed.tawk.to/5aecb59f227d3d7edc24f7c2/default';
 *     e.charset = 'UTF-8';
 *     e.setAttribute('crossorigin', '*');
 *     i.parentNode.insertBefore(e, i);
 *   }
 * }
 *
 * setTAWKAttributes() { yield this.waitForTawkAPI(); window.Tawk_API.hideWidget() }
 *
 * toggleTAWKSupport() {
 *   window.Tawk_API.toggleVisibility(),
 *   this.tawkWidgetOpen || (window.Tawk_API.setAttributes({
 *     name:  preferences.savedNick  || user.nick  || user.name || '',
 *     email: preferences.savedEmail || user.email || ''
 *   }, e => { e && console.error('Error setting Tawk.to attributes:', e) }),
 *   this.tawkWidgetOpen = !0)
 * }
 * ```
 *
 * ## The property id is NOT reproduced, and that is the point of this module
 *
 * `5aecb59f227d3d7edc24f7c2` is the REFERENCE'S OWN tawk.to property. Copied verbatim, every
 * presenter in every room this product serves would open a support chat into protradingroom's
 * inbox, and `setAttributes` would post their name and email address there. That is the same class
 * of defect as the "Powered by" link that credited another company, except it carries personal data
 * instead of a hyperlink.
 *
 * So the id comes from `PUBLIC_PTR_TAWK_PROPERTY_ID`, and **with no id configured the script is
 * never injected and the control never renders**. A support widget that cannot be reached is a
 * missing feature; one wired to somebody else's account is a data leak, and the two are not a
 * trade-off worth making. Recorded as a deliberate divergence rather than a transcription.
 *
 * Everything else IS the reference's: the `default` path segment, `async`, `charset="UTF-8"`,
 * `crossorigin="*"`, insertion before the first existing `<script>`, presenter-only injection, the
 * widget hidden until the control is used, and attributes set once on first open.
 */

/** The `<script>` this room injects, or `null` when no property is configured. */
export type TawkScript = {
  src: string;
  async: true;
  charset: 'UTF-8';
  crossorigin: '*';
};

/**
 * Whether the widget should exist at all.
 *
 * BOTH terms, and they are different kinds of thing: `tawkPresenterSupport` is the room setting an
 * owner ticks, and `isPresenter` is who this reader is. A member never loads the script, so the
 * third-party request is not made in their browser at all — the reference is equally strict
 * (`if (this.appService.globals.isPresenter)` inside `loadTawkSupport`), and it is the difference
 * between a support tool and a tracker on every member's page.
 */
export function tawkSupportAvailable(
  viewer: { isPresenter: boolean },
  session: { tawkPresenterSupport?: boolean },
  propertyId: string | undefined | null
): boolean {
  if (!viewer.isPresenter) return false;
  if (session.tawkPresenterSupport !== true) return false;
  return typeof propertyId === 'string' && propertyId.trim().length > 0;
}

/**
 * The script element's attributes, or `null` when the feature is unavailable.
 *
 * Returned as data rather than injected here so the decision is testable without a DOM, and so the
 * one place that touches `document` is the component.
 */
export function tawkScript(propertyId: string | undefined | null): TawkScript | null {
  const id = propertyId?.trim();
  if (!id) return null;
  return {
    // `https://embed.tawk.to/<property>/default` — the path is the reference's; the property is not.
    src: `https://embed.tawk.to/${encodeURIComponent(id)}/default`,
    async: true,
    charset: 'UTF-8',
    crossorigin: '*'
  };
}

/**
 * `Tawk_API.setAttributes({name, email})`, with the reference's fallback chains.
 *
 * `savedNick || nick || name || ''` and `savedEmail || email || ''` — three sources for the name
 * and two for the address, each falling through to the empty string rather than to `undefined`,
 * because tawk's own API rejects a non-string. Reproduced exactly, including that an anonymous
 * reader posts two empty strings rather than nothing.
 */
export function tawkAttributes(viewer: {
  savedNick?: string | null;
  nick?: string | null;
  name?: string | null;
  savedEmail?: string | null;
  email?: string | null;
}): { name: string; email: string } {
  return {
    name: viewer.savedNick || viewer.nick || viewer.name || '',
    email: viewer.savedEmail || viewer.email || ''
  };
}
