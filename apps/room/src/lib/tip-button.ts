/**
 * The "tip me" button — ONE feature spelled as three settings, and the gate is all three.
 *
 * ## The transcription
 *
 * Byte 2,509,187, in the room component's constructor:
 *
 * ```js
 * this.isTipEnabled =
 *   this.appService.globals.sessData.tipMeBtnEnabled &&
 *   this.appService.globals.sessData.tipMeBtnUrl &&
 *   this.appService.globals.sessData.tipMeBtnTxt;
 * ```
 *
 * and the click, byte 2,531,907:
 *
 * ```js
 * doTipToUser() {
 *   this.appService.globals.sessData.tipMeBtnUrl &&
 *     window.open(this.appService.globals.sessData.tipMeBtnUrl, "_blank");
 * }
 * ```
 *
 * ## Why the three travel together
 *
 * A conjunction is not three independent gates. `tipMeBtnEnabled` alone would draw a button with no
 * label and no destination; a URL with no text would draw a nameless button. Upstream computes the
 * three into ONE field once and every render site reads that field, so this module does the same and
 * the two call sites read `tip.visible`. Splitting them across the markup would put the same
 * three-way rule in two places, which is what `buildMessageChrome` exists to prevent one layer up.
 *
 * ## The URL is checked, not trusted
 *
 * `window.open` on an owner-supplied string is a link the room hands every member. The reference
 * opens whatever is stored. This room refuses anything that is not `http:` or `https:` — a
 * `javascript:` URL there would execute in the member's page with the room's origin, and the
 * settings form is not the place that guarantee should come from.
 *
 * That is a DIVERGENCE and it is deliberate. It cannot show up as a missing button in a working
 * room: every legitimate tip destination is an https link.
 */
export interface TipButtonSettings {
  readonly tipMeBtnEnabled?: boolean;
  readonly tipMeBtnUrl?: string;
  readonly tipMeBtnTxt?: string;
}

export interface TipButton {
  /** All three present and the URL usable. The single field both render sites read. */
  readonly visible: boolean;
  /** The label AND the `title` attribute — upstream binds `tipMeBtnTxt` to both. */
  readonly label: string;
  /** Empty when the button is not visible, so a call site cannot open a URL it never checked. */
  readonly url: string;
}

const NOT_SHOWN: TipButton = { visible: false, label: '', url: '' };

/**
 * `http:` and `https:` only, parsed rather than pattern-matched.
 *
 * `new URL` is what the browser will do with the string anyway, so agreeing with it is the point.
 * A regex over a user-supplied URL is the class of check that misses `java\tscript:` and friends.
 */
function openableUrl(raw: string): string {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
  } catch {
    // Not a URL at all. The button does not draw, which is the same outcome as an empty setting.
    return '';
  }
}

export function tipButtonFor(settings: TipButtonSettings | null | undefined): TipButton {
  /*
    `=== true` on the switch, like every other room setting read here; the two STRINGS are trimmed
    and required non-empty, which is the truthiness the reference relies on made explicit. A label of
    three spaces is a button nobody can read.
  */
  if (settings?.tipMeBtnEnabled !== true) return NOT_SHOWN;

  const label = String(settings.tipMeBtnTxt ?? '').trim();
  const url = openableUrl(String(settings.tipMeBtnUrl ?? '').trim());
  if (!label || !url) return NOT_SHOWN;

  return { visible: true, label, url };
}
