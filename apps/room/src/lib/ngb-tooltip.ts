import type { Attachment } from 'svelte/attachments';

/**
 * Makes the `ngbtooltip` attributes actually show a tooltip.
 *
 * The room carries nine of them — five in `+page.svelte`, four in `ModalHost.svelte` — transcribed
 * from the capture so the DOM matches it byte for byte, including the attribute ORDER. But
 * `ngbtooltip` is a **directive**, not an attribute the browser acts on, so all nine were silent:
 * they looked interactive and did nothing on hover. Reported by the owner 2026-08-11.
 *
 * ## Every value below is READ from a capture of the live original
 *
 * `evidence-tooltips-presenter-2026-08-11.json`, collected by `scripts/collect-tooltips.js` on
 * `chat.protradingroom.com` as a presenter. `ngb-tooltip.test.ts` asserts this
 * implementation against **that file**, not against this comment, so the two cannot drift.
 *
 * The captured element, verbatim:
 *
 * ```html
 * <ngb-tooltip-window role="tooltip" id="ngb-tooltip-9"
 *   class="tooltip fade show bs-tooltip-start"
 *   data-popper-placement="left"
 *   style="position: absolute; inset: 0px 0px auto auto; margin: 0px;
 *          transform: translate3d(-1255.5px, 1074.5px, 0px);">
 *   <div data-popper-arrow="" class="tooltip-arrow" style="..."></div>
 *   <div class="tooltip-inner">Add Emojis</div>
 * </ngb-tooltip-window>
 * ```
 *
 * ## The first version of this file was wrong, and how
 *
 * It emitted a `div.tooltip.show.bs-tooltip-left` with a `.arrow` and `x-placement`, appended to
 * `document.body`. Every one of those five decisions was wrong. They came from inferring Bootstrap 4
 * because `x-placement` appears in three modal captures — reasoning presented as evidence, which is
 * the one thing this project does not allow. The collector was written afterwards and disproved all
 * of it. That ordering was the mistake; the collector belonged first.
 *
 * ## What is deliberately NOT handled, because it was not captured
 *
 * **Every placement now resolves, and none of it is guessed.** The direction class is no longer a
 * one-entry table of what was captured; it is the reference's own arithmetic, ported from
 * `main.d6d3c112b59b7d0d.js` — the `Coe` placement table and the `koe` class function, called with
 * the `baseClass: "bs-tooltip"` the tooltip's own `createPopper` passes. `left` → `bs-tooltip-start`
 * is the branch the captures prove, and running the reference's code means the other 21 placements
 * are produced by the same arithmetic rather than typed out from memory.
 *
 * That the resulting classes are painted is checked separately and directly: the pinned
 * `styles.d622cb9ed2bbc221.css` and our own `complete-app-styles.css` both carry
 * `.bs-tooltip-top`, `.bs-tooltip-bottom`, `.bs-tooltip-start` and `.bs-tooltip-end` arrow rules, and
 * `ngb-tooltip-placements-contract.test.ts` fails if one goes missing.
 *
 * **What is NOT reproduced:** Popper's collision handling. The reference passes a fallback list and
 * flips the bubble when it would overflow; we position once from the measured rects. So `auto`
 * resolves to the head of the reference's own expansion order rather than to whatever fits, and a
 * fixed placement stays where it was asked for. Every host we render today is a fixed placement.
 *
 * The collector could not read the live sheets — all eight were CORS-blocked, and it recorded that
 * as an error rather than as an empty result — so the rules are read from the pinned reference sheet
 * and from our own, and the contract test fails if either stops carrying them.
 */

/**
 * ng-bootstrap's `placement` → Popper placement table, transcribed from `main.d6d3c112b59b7d0d.js`.
 *
 * The bundle ships it as `Coe`, each entry a two-element array — LTR arm first, RTL arm second, read
 * by `Soe(t, n) { const [e, i] = Coe[t]; return n && i || e }` where `n` is `isRTL()`. The room's
 * `<html>` carries no `dir`, so `isRTL()` is false and the LTR arm is the one that runs; only that
 * arm is transcribed here, and `resolveDirection` refuses anything absent from it.
 */
const POPPER_PLACEMENT: Record<string, string> = {
  top: 'top',
  bottom: 'bottom',
  start: 'left',
  left: 'left',
  end: 'right',
  right: 'right',
  'top-start': 'top-start',
  'top-left': 'top-start',
  'top-end': 'top-end',
  'top-right': 'top-end',
  'bottom-start': 'bottom-start',
  'bottom-left': 'bottom-start',
  'bottom-end': 'bottom-end',
  'bottom-right': 'bottom-end',
  'start-top': 'left-start',
  'left-top': 'left-start',
  'start-bottom': 'left-end',
  'left-bottom': 'left-end',
  'end-top': 'right-start',
  'right-top': 'right-start',
  'end-bottom': 'right-end',
  'right-bottom': 'right-end'
};

/**
 * What `placement="auto"` expands to, in order — the array `RI` splices in ahead of resolving.
 *
 * The reference hands the whole list to Popper, which picks the first that fits and flips on
 * collision. We do not run Popper, so ONLY THE HEAD of this list is read — `resolveDirection` takes
 * `AUTO_ORDER[0]`, which is where Popper starts before any collision pass.
 *
 * The remaining eleven are kept because they are the evidence for that head: written out, `'top'` is
 * a bare literal nobody can check; written as the reference's own ordered list, and pinned against
 * the bundle by `ngb-tooltip-placements-contract.test.ts`, it is a citation. They are also the
 * fallback order any future collision handling would need.
 */
const AUTO_ORDER = [
  'top',
  'bottom',
  'start',
  'end',
  'top-start',
  'top-end',
  'bottom-start',
  'bottom-end',
  'start-top',
  'start-bottom',
  'end-top',
  'end-bottom'
];

/** `baseClass: "bs-tooltip"` at the tooltip's `createPopper` call; popovers pass `"bs-popover"`. */
const BASE_CLASS = 'bs-tooltip';

/**
 * The reference's `koe(baseClass, popperPlacement)`, which is what writes the direction class.
 *
 * Verbatim from the bundle, with the minified regexes named:
 *
 * ```js
 * function koe(t, n) {
 *   let [e, i] = n.split("-");
 *   const o = e.replace(/^left/, "start").replace(/^right/, "end");
 *   let s = [o];
 *   if (i) {
 *     let r = i;
 *     ("left" === e || "right" === e) && (r = r.replace(/^start/, "top").replace(/^end/, "bottom")),
 *       s.push(`${o}-${r}`);
 *   }
 *   return t && (s = s.map((r) => `${t}-${r}`)), s.join(" ");
 * }
 * ```
 *
 * Ported rather than reduced to a lookup table on purpose: a table would have to enumerate 22
 * placements by hand, and the one that matters — `left` → `bs-tooltip-start` — is the one branch the
 * 2026-08-11 and 2026-08-12 captures actually prove. Running the reference's own arithmetic means the
 * other 21 are derived by the same code that produced the verified one, instead of typed out.
 *
 * The physical→logical rename is the whole point of the function: Popper keeps `left`/`right`,
 * Bootstrap 5 wants `start`/`end`, and the capture carries both at once —
 * `data-popper-placement="left"` beside `class="… bs-tooltip-start"`.
 */
function bootstrapClasses(popperPlacement: string): string {
  const [base, variation] = popperPlacement.split('-');
  const logical = base.replace(/^left/, 'start').replace(/^right/, 'end');
  const names = [logical];
  if (variation) {
    // A left/right bubble varies along the vertical axis, so its `start`/`end` mean top/bottom.
    const along =
      base === 'left' || base === 'right'
        ? variation.replace(/^start/, 'top').replace(/^end/, 'bottom')
        : variation;
    names.push(`${logical}-${along}`);
  }
  return names.map((n) => `${BASE_CLASS}-${n}`).join(' ');
}

/**
 * The `placement` attribute as written in the markup → what Popper resolves it to, and the classes.
 *
 * Returns `null` for a placement the reference itself has no entry for, which is refused rather than
 * guessed.
 */
function resolveDirection(placement: string): { popper: string; classes: string } | null {
  // `RI` splices the auto list in at the position `auto` occupied and then `shift()`s the head.
  const requested = placement === 'auto' ? AUTO_ORDER[0] : placement;
  const popper = POPPER_PLACEMENT[requested];
  if (!popper) return null;
  return { popper, classes: bootstrapClasses(popper) };
}

/**
 * Popper's `offset` distance for tooltips, from the bundle's own call.
 *
 * The tooltip builds its options with `updatePopperOptions: s => this.popperOptions(k_([0, 6])(s))`,
 * against the popover's `k_([0, 8])`; `k_` pushes Popper's `offset` modifier with that `[skidding,
 * distance]` pair. So the bubble sits 6px off the host along the placement axis, and the arrow —
 * which overhangs by `--bs-tooltip-arrow-height`, `.4rem` = 6.4px — reaches back across the gap to
 * touch it.
 *
 * The 2026-08-11 capture agrees: the bubble's right edge is 683.5 and the host's left edge 689.25, a
 * gap of 5.75px against rects reported to one decimal at `devicePixelRatio: 2`. The previous
 * implementation placed the two edges flush, which no capture supports.
 */
const OFFSET_DISTANCE = 6;

/**
 * `ngb-tooltip-9` in the capture — a per-page counter, not a random or time-based id.
 *
 * Module scope so it increments across every tooltip on the page, which is what produces the
 * sequential ids the capture shows.
 */
let nextId = 1;

/**
 * Positions the bubble the way the captured inline style does.
 *
 * The capture reads `position: absolute; inset: 0px 0px auto auto; margin: 0px;` plus a
 * `translate3d`. That is Popper's own anchoring: pin the box to the top-RIGHT of its containing
 * block, then translate. The offsets are measured rather than computed from the containing block's
 * geometry, because measuring is exact whatever the borders, scroll and zoom happen to be.
 */
/** The minimum a rect needs for the geometry below; `DOMRect` satisfies it. */
export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

/**
 * Where the bubble's top-left corner belongs, given the host's box and the bubble's own size.
 *
 * Exported and pure so it can be checked against the captured pixels rather than by reading this
 * file's source. jsdom reports every rect as zero, so a test that mounts a tooltip cannot measure
 * anything — which is how a version of this shipped with the 6px offset dropped and a green suite.
 */
export function restingPosition(
  anchor: Box,
  bubble: Box,
  popperPlacement: string
): { left: number; top: number } {
  const [base, variation] = popperPlacement.split('-');

  if (base === 'left' || base === 'right') {
    return {
      left:
        base === 'left'
          ? anchor.left - bubble.width - OFFSET_DISTANCE
          : anchor.right + OFFSET_DISTANCE,
      top:
        variation === 'start'
          ? anchor.top
          : variation === 'end'
            ? anchor.bottom - bubble.height
            : anchor.top + (anchor.height - bubble.height) / 2
    };
  }
  return {
    top:
      base === 'top'
        ? anchor.top - bubble.height - OFFSET_DISTANCE
        : anchor.bottom + OFFSET_DISTANCE,
    left:
      variation === 'start'
        ? anchor.left
        : variation === 'end'
          ? anchor.right - bubble.width
          : anchor.left + (anchor.width - bubble.width) / 2
  };
}

/**
 * Popper's `roundOffsetsByDPR`, which is why the captured transforms are all multiples of 0.5.
 *
 * From the bundle, with `Md = Math.round`:
 *
 * ```js
 * function dne(t, n) {
 *   var i = t.y, o = n.devicePixelRatio || 1;
 *   return { x: Md(t.x * o) / o || 0, y: Md(i * o) / o || 0 };
 * }
 * ```
 *
 * This is the whole of the 0.25px residual that an earlier version of this file recorded as
 * unexplained. The capture ran at `devicePixelRatio: 2`, so every translate is snapped to the half
 * pixel: "Add Emojis" wants `dx = -1305.75` and gets `-1305.5`, landing 0.245px right of the exact
 * geometry. Applying the same rounding reproduces all three captured transforms and all three final
 * rects EXACTLY, on both axes — see `ngb-tooltip-placements-contract.test.ts`.
 *
 * `Math.round` and not `toFixed`: `Math.round(-2611.5)` is `-2611`, rounding a half toward positive
 * infinity. That sign asymmetry is load-bearing — rounding half away from zero, which is what most
 * languages do, gives `-1306` and misses the captured value by half a pixel.
 */
export function roundToDevicePixels(
  value: number,
  dpr: number = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
): number {
  return Math.round(value * dpr) / dpr || 0;
}

function place(host: Element, bubble: HTMLElement, popperPlacement: string): void {
  bubble.style.position = 'absolute';
  bubble.style.inset = '0px 0px auto auto';
  bubble.style.margin = '0px';
  bubble.style.transform = 'none';

  /*
    The arrow leaves the flow BEFORE the bubble is measured. It is a block element whose height
    Bootstrap sets but whose position Popper writes, so while it is still in flow it adds its own
    12.797px to the bubble — and a bubble measured at 41.797px instead of 29px is then positioned
    12.797px off, which is precisely the wrong-gap symptom this ordering caused on the first attempt.
  */
  const arrow = detachArrow(bubble, popperPlacement);

  const anchor = host.getBoundingClientRect();
  const resting = bubble.getBoundingClientRect();
  const target = restingPosition(anchor, resting, popperPlacement);

  const dx = roundToDevicePixels(target.left - resting.left);
  const dy = roundToDevicePixels(target.top - resting.top);
  bubble.style.transform = `translate3d(${dx}px, ${dy}px, 0px)`;

  // The arrow is offset within the bubble's FINAL box, not the resting one it was measured at.
  centreArrow(
    arrow,
    { left: target.left, top: target.top, width: resting.width, height: resting.height },
    anchor,
    popperPlacement
  );
}

/**
 * Takes the arrow OUT OF FLOW and centres it on the bubble's cross axis.
 *
 * Popper writes the arrow's position itself — `computeStyles` handles it with
 * `{ offsets: modifiersData.arrow, position: "absolute", adaptive: !1, roundOffsets: l }` — and the
 * captured arrow carries the result inline:
 *
 * ```html
 * <div data-popper-arrow="" class="tooltip-arrow"
 *      style="position: absolute; top: 0px; transform: translate3d(0px, 8px, 0px);">
 * ```
 *
 * Bootstrap's own rules do NOT position it: `.tooltip .tooltip-arrow` sets only `display`, `width`
 * and `height`, and the per-direction rules set one edge (`right: calc(-1 * arrow-height)` for
 * `start`). Without the inline `position: absolute` the arrow stays a block in normal flow and adds
 * its own height to the bubble — which is exactly what happened here: real Chromium rendered the
 * bubble 41.797px tall against the capture's 29px, and 41.797 − 29 = 12.797 = the arrow's height.
 *
 * Every unit test passed while that was wrong, because jsdom reports all rects as zero. It took a
 * screenshot to see it.
 *
 * The captured offset checks out: bubble 29px tall, arrow 12.797px, `(29 − 12.797) / 2 = 8.1`, and
 * Popper's device-pixel rounding takes that to the captured `8`.
 */
function detachArrow(bubble: HTMLElement, popperPlacement: string): HTMLElement | null {
  const arrow = bubble.querySelector<HTMLElement>('.tooltip-arrow');
  if (!arrow) return null;
  arrow.style.position = 'absolute';
  // The edge the arrow is pinned to comes from the direction class; Popper only sets the axis it
  // slides along, which is the one the bubble does not span.
  if (popperPlacement.startsWith('left') || popperPlacement.startsWith('right')) {
    arrow.style.top = '0px';
  } else {
    arrow.style.left = '0px';
  }
  return arrow;
}

/**
 * Points the arrow at the HOST, clamped to stay within the bubble.
 *
 * Popper's `arrow` modifier centres it on the reference element and then clamps it to the popper's
 * own length, which is not the same as centring it on the bubble: for a `-start` or `-end` variation
 * the bubble is aligned to one of the host's edges rather than to its middle, and an arrow centred on
 * the bubble then points at empty space beside the control. Real Chromium showed exactly that for
 * `top-right` — arrow at x 395.7 against a host at x 450.
 *
 * For every placement with no variation the two rules agree, because the bubble is centred on the
 * host, which is why the captured `left` example cannot distinguish them.
 */
function centreArrow(
  arrow: HTMLElement | null,
  bubble: { left: number; top: number; width: number; height: number },
  anchor: Box,
  popperPlacement: string
): void {
  if (!arrow) return;
  const size = arrow.getBoundingClientRect();
  const alongY = popperPlacement.startsWith('left') || popperPlacement.startsWith('right');

  const start = alongY ? bubble.top : bubble.left;
  const span = alongY ? bubble.height : bubble.width;
  const arrowSpan = alongY ? size.height : size.width;
  const anchorMiddle = alongY ? anchor.top + anchor.height / 2 : anchor.left + anchor.width / 2;

  // Clamped so the arrow never overhangs its own bubble, which is Popper's `within(…)`.
  const ideal = anchorMiddle - start - arrowSpan / 2;
  const offset = roundToDevicePixels(Math.min(Math.max(ideal, 0), span - arrowSpan));

  arrow.style.transform = alongY
    ? `translate3d(0px, ${offset}px, 0px)`
    : `translate3d(${offset}px, 0px, 0px)`;
}

/**
 * Attach to any element carrying an `ngbtooltip` attribute.
 *
 * An element with no `ngbtooltip`, or with a placement that was never captured, gets nothing — so
 * this is safe to attach unconditionally.
 */
export const ngbTooltip: Attachment<Element> = (host) =>
  bind(host, host.getAttribute('ngbtooltip'));

/**
 * The same tooltip, for the hosts where the reference BINDS its text rather than writing it.
 *
 * Angular's `TAttributes` marks bindings with `3`, and five of the room's tooltips are declared that
 * way — the message timestamps, e.g.
 * `["placement","top",1,"created-at","mx-2",3,"ngbTooltip","ngStyle"]`, whose value comes from
 * `xn("ngbTooltip", Ct(27, 24, e.msg.t, "short"))`.
 *
 * A property binding sets no attribute, so those hosts carry `placement="top"` and NO `ngbtooltip` in
 * the rendered DOM. Passing the text through the attachment keeps that true; writing it into an
 * `ngbtooltip` attribute instead would show the right bubble on an element the reference never marks.
 */
export function ngbTooltipWith(text: string | null | undefined): Attachment<Element> {
  return (host) => bind(host, text ?? null);
}

function bind(host: Element, text: string | null): (() => void) | undefined {
  if (!text) return;

  /*
    `triggers="manual"` means the component opens it by calling `.open()`, so nothing is bound to
    hover. The reference sets it on the GIF control, and `main.d6d3c112b59b7d0d.js` shows `triggers`
    is a real NgbTooltip input — its directive definition reads
    `selectors:[["","ngbTooltip",""]],inputs:{…,placement:"placement",…,triggers:"triggers",…}`.

    This is not a guess about which directive the attribute belongs to. Angular's TAttributes has no
    per-directive grouping: every static attribute ahead of the `1` (classes) marker is set on the
    element, so every directive on it that declares that input receives it. The live capture agrees —
    hovering that control for 400ms produced no tooltip element at all.
  */
  if (host.getAttribute('triggers') === 'manual') return;

  const placement = host.getAttribute('placement') ?? '';
  const resolved = resolveDirection(placement);
  if (!resolved) {
    /*
      Still refused, not guessed — but the bar has moved. `resolveDirection` runs the reference's own
      table and class arithmetic, so every placement the reference can express now resolves here. What
      reaches this branch is a placement `Coe` has no entry for, which the reference could not render
      either.
    */
    console.warn(
      `[ngb-tooltip] placement="${placement}" is not one ng-bootstrap resolves, so no tooltip is ` +
        `rendered for "${text}".`
    );
    return;
  }
  const { popper, classes: direction } = resolved;

  let bubble: HTMLElement | null = null;
  let id = '';

  function show() {
    if (bubble || !host.parentElement) return;

    // A CUSTOM ELEMENT, not a div. `.tooltip` carries `display: block`, which is what makes an
    // unknown element lay out as the capture shows it.
    bubble = document.createElement('ngb-tooltip-window');
    bubble.setAttribute('role', 'tooltip');
    id = `ngb-tooltip-${nextId++}`;
    bubble.id = id;
    /*
      The RESOLVED placement, not the attribute as written. Popper writes this itself —
      `n.attributes.popper = { "data-popper-placement": n.placement }` — so it carries the physical
      name it settled on. For `left` the two coincide, which is why the capture shows
      `placement="left"` beside `data-popper-placement="left"`; for `top-right` they do not, and this
      attribute reads `top-end`.
    */
    bubble.setAttribute('data-popper-placement', popper);
    // `fade` WITHOUT `show` first: `.tooltip` is `opacity: 0` and `.tooltip.fade` is
    // `transition: opacity .15s linear`, so adding both in one frame would jump straight to 0.9 with
    // no transition. The capture caught this element mid-fade at `opacity: 0.099804`, which is the
    // proof it animates.
    bubble.className = `tooltip fade ${direction}`;

    const arrow = document.createElement('div');
    // Popper's marker attribute, present on the captured arrow.
    arrow.setAttribute('data-popper-arrow', '');
    arrow.className = 'tooltip-arrow';
    const inner = document.createElement('div');
    inner.className = 'tooltip-inner';
    // textContent, never innerHTML: these strings are transcribed from a capture today, but a
    // tooltip that renders markup is one settings field away from being a script injection.
    inner.textContent = text as string;
    bubble.append(arrow, inner);

    // A SIBLING of the host, inside the host's own parent — `span.textAreaBtns` in the capture,
    // which recorded `isDirectChildOfBody: false` and `isSiblingOfHost: true`.
    host.parentElement.appendChild(bubble);
    host.setAttribute('aria-describedby', id);

    place(host, bubble, popper);
    // Forces the style to settle before `show` flips the opacity, so the transition actually runs.
    void bubble.offsetHeight;
    bubble.classList.add('show');
  }

  function hide() {
    if (!bubble) return;
    bubble.remove();
    bubble = null;
    if (host.getAttribute('aria-describedby') === id) host.removeAttribute('aria-describedby');
  }

  host.addEventListener('mouseenter', show);
  host.addEventListener('mouseleave', hide);
  // Keyboard parity. The captured markup gives these icons no focus behaviour, but a control whose
  // only affordance is hover is unreachable without a mouse, and this adds nothing for a pointer.
  host.addEventListener('focusin', show);
  host.addEventListener('focusout', hide);
  // The emoji and GIF icons open popovers under where the bubble sits; a tooltip stranded over one
  // is the failure mode of every hand-rolled tooltip. The collector's own run left four behind on
  // the live original, which is exactly this.
  host.addEventListener('click', hide);

  return () => {
    host.removeEventListener('mouseenter', show);
    host.removeEventListener('mouseleave', hide);
    host.removeEventListener('focusin', show);
    host.removeEventListener('focusout', hide);
    host.removeEventListener('click', hide);
    hide();
  };
}
