import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import RoomMessage from './components/RoomMessage.svelte';

/**
 * `parseStock` — RM-06 and RM-21, the two halves of the ticker that were not the reference's.
 *
 * Both are rendered rather than read off the source, because both are silent when wrong: an
 * uncoloured `$AAPL` still says `$AAPL`, and a coloured `foo$AAPL` still says `foo$AAPL`. Only the
 * emitted markup distinguishes them.
 *
 * `render` from `svelte/server` rather than `mount`: everything under test is a `$derived` read in
 * the first frame, so a DOM would add no coverage.
 *
 * | row | what the reference does | what we did |
 * | --- | --- | --- |
 * | RM-06 | refuses a match not at index 0 and not preceded by a space (byte 1,327,300) | coloured every match |
 * | RM-21 | colours ALERT tickers from the room style, CHAT tickers from follow-then-room (bytes 1,327,332 / 1,327,851) | coloured only when a body style applied, and never on an alert |
 */

const chatStyle = {
  color: '#606060',
  tickerColor: '#c0ffee',
  usernameColor: '#707070',
  bgColor: '#808080',
  fontSize: 13,
  playSound: true
};

const followedStyle = {
  color: '#303030',
  tickerColor: '#facade',
  usernameColor: '#404040',
  bgColor: '#505050',
  fontSize: 17,
  playSound: false
};

const item = (extra: Record<string, unknown> = {}) => ({
  id: 1,
  senderId: 2,
  senderName: 'A Member',
  senderEmailHash: 'hash-of-the-sender',
  senderAvatarUrl: '',
  body: 'a message',
  createdAt: new Date('2026-08-30T12:00:00Z'),
  isAdmin: false,
  ...extra
});

const draw = (props: Record<string, unknown> = {}) =>
  render(RoomMessage, {
    props: {
      item: item(),
      kind: 'chat',
      currentUserId: 99,
      currentUserEmailHash: 'hash-of-the-viewer',
      viewerIsPresenter: false,
      theme: 'dark',
      menuOpen: false,
      showDateSeparator: false,
      ontoggle: () => {},
      onaction: () => {},
      ...props
    } as never
  }).body;

/** Every `stockColor` span in the rendered output, with its text. */
function tickers(html: string) {
  return [...html.matchAll(/<span[^>]*class="stockColor"[^>]*>([^<]*)<\/span>/g)].map((m) => m[1]);
}

describe('RM-06 — the preceding-character guard', () => {
  /*
    ```js
    var a = e.indexOf(r);
    if (!(a > 0 && " " != e.charAt(a))) { … }
    ```

    `r` carries whatever `\s*` swallowed, so `e.charAt(a)` is the match's OWN first character.
  */
  it('colours a ticker that starts the body', () => {
    expect(tickers(draw({ item: item({ body: '$AAPL is up' }) }))).toEqual(['$AAPL']);
  });

  it('colours a ticker preceded by a space, and keeps the space inside the span', () => {
    /* The captured regex is `\s*\$…`, so the leading space is part of the substituted text. */
    expect(tickers(draw({ item: item({ body: 'buying $AAPL now' }) }))).toEqual([' $AAPL']);
  });

  it('LEAVES a ticker glued to a non-space character alone', () => {
    /* `foo$AAPL` — the case the row is named for. */
    expect(tickers(draw({ item: item({ body: 'foo$AAPL' }) }))).toEqual([]);
    /* And a bracket, which is the one a member actually types: `($AAPL)`. */
    expect(tickers(draw({ item: item({ body: 'the ticker ($AAPL) moved' }) }))).toEqual([]);
  });

  it('treats a TAB as a non-space character, because the reference compares against " "', () => {
    /*
      A literal space, not "whitespace". `\s*` consumes the tab into the match and then
      `" " != e.charAt(a)` rejects it. Transcribed rather than generalised: widening this to
      `/\s/` would be a correction, and corrections are how a transcription stops being one.
    */
    expect(tickers(draw({ item: item({ body: 'buying\t$AAPL' }) }))).toEqual([]);
    /* …but a tab at the very START passes, because `a > 0` is false there. */
    expect(tickers(draw({ item: item({ body: '\t$AAPL' }) }))).toEqual(['\t$AAPL']);
  });

  it('still colours the second of two, which is what a plain positional check would break', () => {
    expect(tickers(draw({ item: item({ body: '$AAPL and $MSFT' }) }))).toEqual(['$AAPL', ' $MSFT']);
  });
});

describe('RM-21 — where the ticker colour comes from', () => {
  it('colours an ALERT ticker from the room style, which it never did', () => {
    /*
      `if ("alerts" === i) { const l = localStorage.getItem("alertStyle") … }` at byte 1,327,851.
      This is the whole row: every `$TICKER` in every alert rendered as a bare span.
    */
    const html = draw({ kind: 'alert', chatStyle, item: item({ body: '$AAPL breaking out' }) });
    expect(html).toContain('color: #c0ffee;');
  });

  it('does NOT consult the followed-user style on an alert, because parseStock does not', () => {
    /*
      The alerts branch reads ONE store. A followed user's ticker colour bleeding onto the alerts
      log would be ours, not the reference's — and the negative half is the half that catches it.
    */
    const html = draw({
      kind: 'alert',
      chatStyle,
      followedStyle,
      item: item({ body: '$AAPL breaking out' })
    });
    expect(html).toContain('color: #c0ffee;');
    expect(html).not.toContain('#facade');
  });

  it('prefers the followed-user style on CHAT, and the room style otherwise', () => {
    const followed = draw({ chatStyle, followedStyle, item: item({ body: '$AAPL' }) });
    expect(followed).toContain('color: #facade;');

    const room = draw({ chatStyle, item: item({ body: '$AAPL' }) });
    expect(room).toContain('color: #c0ffee;');
  });

  it('colours a CHAT ticker even when the message carries its own background', () => {
    /*
      `parseStock` never reads `msg.bkgColor`; `effectiveStyle` drops to `undefined` for exactly
      that case, because that gate belongs to the BOX. Reading the box's gate for the ticker is
      what left a coloured message's tickers bare.
    */
    const html = draw({
      chatStyle,
      item: item({ body: '$AAPL', backgroundColor: '#123456' })
    });
    expect(html).toContain('color: #c0ffee;');
  });

  it('falls back to a bare span when no style is supplied, which IS the reference', () => {
    /* `else e = e.replace(r, '<span class="stockColor">' + … )` — the class, and no inline colour. */
    const html = draw({ item: item({ body: '$AAPL' }) });
    expect(tickers(html)).toEqual(['$AAPL']);
    expect(html).toContain('<span class="stockColor">$AAPL</span>');
  });
});
