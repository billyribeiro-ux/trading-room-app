import type { FollowChatStyle } from '#lib/types.js';
import type { PresenterColors } from '#lib/presenter-colors.js';

/**
 * `invertTxtColorToggler` and the precedence above it — every inline style a message row carries.
 *
 * ## Why this is a module
 *
 * Upstream it already is one function with a mode argument: `invertTxtColorToggler(invertTxtColor,
 * "name" | "date" | …)`, called from both renderers. Here it was ninety lines of `$derived` inside
 * `RoomMessage.svelte`, which meant the only way to ask "what does a followed user who is also a
 * presenter with colours get?" was to render a message row with a dozen props and read the
 * attributes back. That question has a four-row answer table in `presenter-colors.ts` and no
 * function to point it at.
 *
 * FOUR SOURCES WRITE THE SAME THREE SLOTS and the order between them is the feature. Getting it
 * wrong is silent — every colour is still a colour — so the resolution is one pure function with
 * one input and one output, and `presenter-colors-contract.test.ts` still renders the component to
 * prove the wiring on top of it.
 */

/** Everything the resolution reads. Every field is a value the row already has. */
export interface MessageStyleInput {
  readonly kind: 'alert' | 'chat';
  /** The SENDER's presenter pair, when they have one. Beats the message's own colours. */
  readonly presenterStyle?: PresenterColors;
  /** This viewer's per-followed-user override. Beats everything below it. */
  readonly followedStyle?: FollowChatStyle;
  /** The room's global chat style. Applies to CHAT with no background of its own. */
  readonly chatStyle?: FollowChatStyle;
  /** `msg.bkgColor` / `msg.fontColor`, the message's own pair. */
  readonly backgroundColor?: string | null;
  readonly fontColor?: string | null;
  /**
   * Set on a row rendered FROM CAPTURED DOM.
   *
   * Its presence disables every live source below, which is not a special case bolted on: a
   * captured row must render what was captured, and a presenter whose hash happens to match a
   * captured sender's must not repaint the evidence.
   */
  readonly evidenceKey?: string;
  /** A captured row's own `style` attributes — `null` meaning "the capture had none". */
  readonly evidenceMessageBoxStyle?: string | null;
  readonly evidenceBodyStyle?: string | null;
}

/**
 * The five inline styles the markup binds, and nothing else.
 *
 * `effectiveStyle` and the resolved box background were returned here too while this was being
 * lifted out of the component, and NOTHING read either of them — the caller's own gates go through
 * `followedStyle`, and the kebab's inversion is already resolved into `backgroundInversion`. A
 * returned value nobody consumes is the defect `CLAUDE.md` names first, so they are internal.
 */
export interface MessageStyles {
  readonly box?: string;
  readonly backgroundInversion?: string;
  readonly username?: string;
  readonly date?: string;
  readonly body?: string;
}

export function resolveMessageStyles(input: MessageStyleInput): MessageStyles {
  /*
    ── THE PRESENTER'S COLOURS OVERRIDE THE MESSAGE'S OWN, and that is the whole of the wiring ─────

    The reference applies them by overwriting the same three assignments `msg.bkgColor` /
    `msg.fontColor` made, in the same `ngOnInit`, four lines later (bundle byte 1,346,945). So they
    are plugged in HERE, at the two values those assignments produce, rather than as a fourth branch
    in `effectiveStyle` — which is what makes the full precedence fall out with no new condition:
    `followedStyle` still wins below, `chatStyle` still loses to a message that has a background,
    and the presenter's pair now IS that background.

    `evidenceKey` excludes it for the same reason it excludes `effectiveStyle`: a captured row
    renders the DOM that was captured, and a presenter whose hash happens to match a captured
    sender's must not repaint the evidence.

    `presenter-colors.ts` carries the four-row precedence table and the one measured divergence
    (font size, which a message with its own background has never taken here either).
  */
  const senderPresenterStyle = input.evidenceKey ? undefined : input.presenterStyle;
  const messageBackgroundColor = senderPresenterStyle?.bgColor ?? input.backgroundColor;
  const messageFontColor = senderPresenterStyle?.color ?? input.fontColor;
  const effectiveStyle = input.evidenceKey
    ? undefined
    : (input.followedStyle ??
      (input.kind === 'chat' && !messageBackgroundColor ? input.chatStyle : undefined));
  /*
    THE BOX'S BACKGROUND, resolved once — and the reason it is one value is a defect it was hiding.

    Two things are painted from it: the box itself, and the kebab's inversion below. They were two
    separate expressions, and the second one read only `item.backgroundColor` — so whenever the box
    took its background from `followedStyle` while the message ALSO carried one of its own, the
    kebab inverted a colour that was not on screen anywhere. The comment beneath already said what
    it should be (*"color: <box background>"*); the code did not, and nothing compared them.

    Found on 2026-08-30 by the presenter-colour precedence test, which made the case common rather
    than rare: a presenter's pair is set once and applies to every message they send, so "followed
    user who is also a presenter with colours" is an ordinary state rather than a corner. Captured
    rows are unaffected — they have no `effectiveStyle`, so this resolves to exactly what the old
    expression did.
  */
  const resolvedBackgroundColor = effectiveStyle?.bgColor ?? messageBackgroundColor;
  const box =
    input.evidenceMessageBoxStyle !== undefined
      ? (input.evidenceMessageBoxStyle ?? undefined)
      : resolvedBackgroundColor
        ? `background-color: ${resolvedBackgroundColor};`
        : undefined;
  // The only inline style the captured DOM ever puts on `.msgMenu` is this background inversion:
  // app-room/complete.html has 13 kebab anchors carrying `color: <box background>; filter:
  // invert(1);` and 5 carrying no style attribute at all - never a font size. The captured
  // stylesheet pins `app-st-message .msgMenu` at 20px, so feeding the follow/global chat font
  // size into that anchor shrank the kebab on newly posted messages while captured ones (which
  // have no effectiveStyle) stayed at 20px.
  const backgroundInversion = resolvedBackgroundColor
    ? `color: ${resolvedBackgroundColor}; filter: invert(1);`
    : undefined;
  const invertedText = effectiveStyle
    ? `color: ${effectiveStyle.usernameColor}; font-size: ${effectiveStyle.fontSize}px;`
    : backgroundInversion;
  const username = effectiveStyle
    ? `color: ${effectiveStyle.usernameColor}; font-size: ${effectiveStyle.fontSize + 1}px;`
    : invertedText;
  const date = effectiveStyle
    ? `color: ${effectiveStyle.usernameColor}; font-size: ${effectiveStyle.fontSize - 2}px;`
    : invertedText;
  const color = effectiveStyle?.color ?? messageFontColor;
  const fontSize = effectiveStyle?.fontSize;
  const body =
    input.evidenceBodyStyle !== undefined
      ? (input.evidenceBodyStyle ?? undefined)
      : [color ? `color: ${color};` : '', fontSize ? `font-size: ${fontSize}px;` : '']
          .filter(Boolean)
          .join(' ') || undefined;

  return {
    box,
    backgroundInversion,
    username,
    date,
    body
  };
}
