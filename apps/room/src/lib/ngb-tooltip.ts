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
 * `chat.protradingroom.com` as a presenter. `ngb-tooltip-contract.test.ts` asserts this
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
 * **Only `placement="left"` is implemented.** The run captured `left`, and only `left`: it maps to
 * `bs-tooltip-start`, with `data-popper-placement="left"` keeping the physical name. Bootstrap 5
 * renamed the logical directions, so `right` is presumably `end` and `top`/`bottom` presumably keep
 * their names — **presumably is not evidence**, and no capture shows them. The screen-tab eye badge
 * (`placement="bottom"`) never rendered during the run because no screen was being shared, so there
 * was no badge to hover.
 *
 * All nine wired sites use `placement="left"`, so nothing is missing today. Anything else refuses to
 * render and says why, rather than emitting a guessed class that no rule may paint. See `TODO.md`
 * gap 10a.
 *
 * **Which CSS rules paint it is also unproven from that run** — all eight stylesheets were
 * CORS-blocked, and the collector recorded that as an error rather than as an empty result. The
 * class names here are what the live DOM carried; that they are styled by our pinned
 * `complete-app-styles.css` is asserted separately by the contract test against our own sheet.
 */

/**
 * The captured mapping, and the ONLY one.
 *
 * Keyed by the `placement` attribute; the value is what the live tooltip carried in its class list.
 * A placement that is not a key here has never been observed and is refused rather than guessed.
 */
const CAPTURED_DIRECTIONS: Record<string, string> = { left: 'bs-tooltip-start' };

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
function place(host: Element, bubble: HTMLElement, placement: string): void {
  bubble.style.position = 'absolute';
  bubble.style.inset = '0px 0px auto auto';
  bubble.style.margin = '0px';
  bubble.style.transform = 'none';

  const anchor = host.getBoundingClientRect();
  const resting = bubble.getBoundingClientRect();

  // `left`: the bubble's right edge meets the host's left edge, vertically centred on it. This is
  // the only placement the capture contains, and the only one this function is asked for.
  const targetLeft = anchor.left - resting.width;
  const targetTop = anchor.top + (anchor.height - resting.height) / 2;

  const dx = Math.round((targetLeft - resting.left) * 10) / 10;
  const dy = Math.round((targetTop - resting.top) * 10) / 10;
  bubble.style.transform = `translate3d(${dx}px, ${dy}px, 0px)`;
  void placement;
}

/**
 * Attach to any element carrying an `ngbtooltip` attribute.
 *
 * An element with no `ngbtooltip`, or with a placement that was never captured, gets nothing — so
 * this is safe to attach unconditionally.
 */
export const ngbTooltip: Attachment<Element> = (host) => {
  const text = host.getAttribute('ngbtooltip');
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
  const direction = CAPTURED_DIRECTIONS[placement];
  if (!direction) {
    // Refused, not guessed. Bootstrap 5's logical names are a convention we have not observed here,
    // and a class no rule paints is an invisible element that ships and nobody checks.
    console.warn(
      `[ngb-tooltip] placement="${placement}" has never been captured, so no tooltip is rendered ` +
        `for "${text}". Only "left" is evidenced. See TODO.md gap 10a.`
    );
    return;
  }

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
    bubble.setAttribute('data-popper-placement', placement);
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

    place(host, bubble, placement);
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
};
