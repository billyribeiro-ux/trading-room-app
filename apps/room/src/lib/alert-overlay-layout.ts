/**
 * `alertsOverlayOnScreenshare` — the LAYOUT half: where each alert card goes and how its text wraps.
 *
 * ## Why this is a module and not part of the compositor
 *
 * The compositor is plumbing — a canvas, a hidden `<video>`, an interval and a `captureStream`. None
 * of it can run outside a browser. **The wrapping is not plumbing**, and it is the part that is easy
 * to get subtly wrong: the reference packs the first line against a width reduced by the sender
 * prefix, spills the words it could not fit into a SECOND pass at full width, breaks a single
 * over-long word character by character, and treats a blank paragraph as a blank line. Four rules,
 * each with an edge, and every one of them measured through `ctx.measureText`.
 *
 * Split out, all four are exercised against a stub measurer in an ordinary unit test, at sizes and
 * inputs a screen share would take an afternoon to reproduce by hand. What is left in the browser is
 * `drawImage`, `fillText` and the geometry this returns.
 *
 * ## Transcribed from the compositor at byte 1,098,419
 *
 * Every constant below is the reference's own and none is rounded: the 900px cap, the 24px margin,
 * the 48px horizontal padding, the 44px line step, the 32px baseline offset, the 12px gap between
 * cards, the 14s hold and the 1s fade, the `#f0c040` rule and the `rgba(0, 0, 0, 0.72)` ground.
 */

/** One alert the overlay is currently showing. */
export interface OverlayAlert {
  readonly text: string;
  readonly sender: string;
  /** `Date.now()` when it arrived. The fade and the eviction are both measured from it. */
  readonly shownAt: number;
}

/**
 * How wide a run of text is, in the font the caller is about to draw it in.
 *
 * Two of them rather than a font argument, because the reference switches `ctx.font` twice per card
 * and measures in whichever is current: the sender prefix in `bold 32px sans-serif`, everything else
 * in `32px sans-serif`. A single measurer would have to be told which, at every call site.
 */
export interface OverlayMetrics {
  readonly bold: (text: string) => number;
  readonly regular: (text: string) => number;
}

/** One line of a card, positioned. `x` differs for the first line, which sits after the prefix. */
export interface OverlayLine {
  readonly text: string;
  readonly x: number;
  readonly y: number;
}

/** One card, ready to draw. */
export interface OverlayCard {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  /** 1 while the alert is held, falling to 0 across the last second. */
  readonly alpha: number;
  /** `@sender: `, drawn bold in the rule colour. */
  readonly prefix: string;
  readonly prefixX: number;
  readonly prefixY: number;
  /** The body, already wrapped. The first entry starts after the prefix on the same baseline. */
  readonly lines: readonly OverlayLine[];
}

/* ── The reference's own constants ─────────────────────────────────────────────────────────────── */

/** `Math.min(900, .9 * canvas.width)` — the card never exceeds 900px or 90% of the frame. */
export const OVERLAY_MAX_CARD_WIDTH = 900;
/** The gap from the right edge, and the first card's distance from the top. */
export const OVERLAY_MARGIN = 24;
/** Horizontal padding inside a card: 24 each side, subtracted once as 48. */
export const OVERLAY_PADDING = 48;
/** The line step, and the height a card allows per line. */
export const OVERLAY_LINE_HEIGHT = 44;
/** First baseline, measured down from the card's top edge: `y + 24 + 32`. */
export const OVERLAY_FIRST_BASELINE = 56;
/** Vertical gap between stacked cards. */
export const OVERLAY_CARD_GAP = 12;
/** How long an alert stays before it starts fading. */
export const OVERLAY_HOLD_MS = 14_000;
/** And how long the fade takes. An alert is evicted at 15s — hold plus fade. */
export const OVERLAY_FADE_MS = 1_000;
/** At most four alerts are shown; the fifth pushes the oldest out. */
export const OVERLAY_MAX_ALERTS = 4;

/**
 * Wrap a list of words to a width, breaking a word that cannot fit on its own.
 *
 * The reference's `Oe`, term for term. Two details are easy to lose and both are asserted:
 *
 * * **A word wider than the line is broken CHARACTER by character**, and the last piece stays in
 *   the buffer to be joined by the words after it rather than being flushed as its own line.
 * * **The overflow check requires a non-empty buffer.** A single word that does not fit is placed
 *   anyway rather than producing an empty line and looping.
 */
export function wrapOverlayWords(
  words: readonly string[],
  maxWidth: number,
  measure: (text: string) => number
): string[] {
  const lines: string[] = [];
  let current = '';

  const breakWord = (word: string): string[] => {
    const pieces: string[] = [];
    let accumulated = '';
    for (const character of word) {
      const next = accumulated + character;
      if (measure(next) > maxWidth && accumulated) {
        pieces.push(accumulated);
        accumulated = character;
      } else {
        accumulated = next;
      }
    }
    if (accumulated) pieces.push(accumulated);
    return pieces;
  };

  for (const word of words) {
    if (measure(word) > maxWidth) {
      /*
        Flush whatever preceded the over-long word, and DO NOT clear the buffer.

        Upstream clears it here and the clear is dead: the next statement but one reassigns `current`
        from `pieces` unconditionally, so nothing can observe the empty string in between. Dropped
        rather than reproduced, on the same footing as the dead `r || (r = …)` fallback in
        `promptForScreenName` — a line that cannot execute is not behaviour to match, and `eslint`'s
        `no-useless-assignment` is right to refuse it.
      */
      if (current) lines.push(current);
      const pieces = breakWord(word);
      for (let index = 0; index < pieces.length - 1; index += 1) lines.push(pieces[index]);
      current = pieces[pieces.length - 1] ?? '';
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (measure(candidate) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines;
}

/**
 * Everything the compositor needs to draw one frame's worth of cards.
 *
 * @param alerts newest LAST, which is the order the reference pushes them in.
 * @param frameWidth the canvas width, which follows the shared surface.
 * @param now `Date.now()`, passed in so the fade is testable without a clock.
 */
export function layoutAlertOverlay(
  alerts: readonly OverlayAlert[],
  frameWidth: number,
  now: number,
  metrics: OverlayMetrics
): OverlayCard[] {
  const cardWidth = Math.min(OVERLAY_MAX_CARD_WIDTH, 0.9 * frameWidth);
  const cardX = frameWidth - cardWidth - OVERLAY_MARGIN;
  const restMax = cardWidth - OVERLAY_PADDING;

  const cards: OverlayCard[] = [];
  let y = OVERLAY_MARGIN;

  for (const alert of alerts) {
    const age = now - alert.shownAt;
    /*
      Held at full opacity, then linear across the last second. NOT clamped, exactly as upstream
      leaves it — an alert older than the eviction window would compute a negative alpha, and the
      caller never gets one because it filters at 15s first. `visibleOverlayAlerts` is that filter,
      and keeping the two separate is what makes each of them assertable.
    */
    const alpha = age < OVERLAY_HOLD_MS ? 1 : 1 - (age - OVERLAY_HOLD_MS) / OVERLAY_FADE_MS;

    const prefix = `@${alert.sender}: `;
    const prefixWidth = metrics.bold(prefix);
    const firstMax = cardWidth - prefixWidth - OVERLAY_PADDING;

    const paragraphs = alert.text.split('\n');
    const firstWords = paragraphs[0].split(' ').filter((word) => word.length > 0);

    /*
      THE FIRST LINE IS PACKED, NOT WRAPPED, and the difference is the `break`.

      It takes words while they still fit beside the prefix and STOPS at the first one that does
      not — it does not skip ahead looking for a shorter word, and it does not fall through to the
      wrapper. Whatever is left goes to a second pass at the full width. Reproducing this as one
      `wrapOverlayWords` call would put the prefix's width on every line rather than on the first.
    */
    let firstLine = '';
    let consumed = 0;
    for (let index = 0; index < firstWords.length; index += 1) {
      const candidate = firstLine ? `${firstLine} ${firstWords[index]}` : firstWords[index];
      if (!(metrics.regular(candidate) <= firstMax)) break;
      firstLine = candidate;
      consumed = index + 1;
    }

    const rest: string[] = [];
    if (consumed < firstWords.length) {
      rest.push(...wrapOverlayWords(firstWords.slice(consumed), restMax, metrics.regular));
    }
    /*
      Every paragraph after the first wraps at the full width. An EMPTY one becomes an empty line
      rather than being dropped, which is what preserves a deliberate blank line in an alert body.
    */
    for (let index = 1; index < paragraphs.length; index += 1) {
      const words = paragraphs[index].split(' ').filter((word) => word.length > 0);
      if (words.length === 0) rest.push('');
      else rest.push(...wrapOverlayWords(words, restMax, metrics.regular));
    }

    const height = OVERLAY_PADDING + OVERLAY_LINE_HEIGHT * (1 + rest.length);
    const baseline = y + OVERLAY_FIRST_BASELINE;

    cards.push({
      x: cardX,
      y,
      width: cardWidth,
      height,
      alpha,
      prefix,
      prefixX: cardX + OVERLAY_MARGIN,
      prefixY: baseline,
      lines: [
        // The first line shares the prefix's baseline and starts where the prefix ends.
        ...(firstLine
          ? [{ text: firstLine, x: cardX + OVERLAY_MARGIN + prefixWidth, y: baseline }]
          : []),
        ...rest.map((text, index) => ({
          text,
          x: cardX + OVERLAY_MARGIN,
          y: baseline + OVERLAY_LINE_HEIGHT * (index + 1)
        }))
      ]
    });

    y += height + OVERLAY_CARD_GAP;
  }

  return cards;
}

/**
 * The alerts still worth drawing — those younger than the hold plus the fade.
 *
 * Its own function rather than a line inside the draw loop, because it is the rule that decides how
 * long an alert is burned into somebody else's screen recording, and that deserves to be assertable
 * on its own.
 */
export function visibleOverlayAlerts(alerts: readonly OverlayAlert[], now: number): OverlayAlert[] {
  return alerts.filter((alert) => now - alert.shownAt < OVERLAY_HOLD_MS + OVERLAY_FADE_MS);
}

/**
 * Push an arriving alert, keeping at most {@link OVERLAY_MAX_ALERTS}.
 *
 * `alerts.push(…); alerts.length > 4 && alerts.shift()` — the oldest leaves as the fifth arrives,
 * so a burst cannot cover the shared screen.
 */
export function pushOverlayAlert(
  alerts: readonly OverlayAlert[],
  arriving: OverlayAlert
): OverlayAlert[] {
  const next = [...alerts, arriving];
  return next.length > OVERLAY_MAX_ALERTS ? next.slice(next.length - OVERLAY_MAX_ALERTS) : next;
}
