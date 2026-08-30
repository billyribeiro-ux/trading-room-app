import { describe, expect, it } from 'vitest';

import { resolveMessageStyles } from './message-styles.js';

/**
 * `resolveMessageStyles` — the four-row precedence table, asked directly.
 *
 * `presenter-colors.ts:93-98` states it:
 *
 * | # | source | wins over |
 * | - | ------ | --------- |
 * | 1 | `msg.bkgColor` / `msg.fontColor` — the message row's own colours | — |
 * | 2 | `presenterSettings[msg.avt]` — the sender's presenter pair | 1 |
 * | 3 | `localStorage.chatStyle` — the viewer's own chat style | 1, but **not** 2 |
 * | 4 | `followedUsers[msg.avt].followChatStyle` — the per-followed-user override | all |
 *
 * That table has been enforced end to end by `presenter-colors-contract.test.ts`, which renders a
 * whole message row with a dozen props and reads the attributes back. It still does, and it should:
 * the WIRING is a separate failure from the RULE. This file is the rule on its own, which is what
 * the function existing at all is for — and row 3's "not 2" is the one that reads as a bug until
 * you have both halves in front of you.
 */

const chatStyle = {
  color: '#c1c1c1',
  tickerColor: '#c2c2c2',
  usernameColor: '#c3c3c3',
  bgColor: '#c4c4c4',
  fontSize: 13,
  playSound: true
};

const followedStyle = {
  color: '#f1f1f1',
  tickerColor: '#f2f2f2',
  usernameColor: '#f3f3f3',
  bgColor: '#f4f4f4',
  fontSize: 20,
  playSound: false
};

const presenterStyle = { color: '#333333', bgColor: '#222222' };

const base = { kind: 'chat' } as const;

describe('the precedence, row by row', () => {
  it('1 — the message s own colours, when nothing else applies', () => {
    const styles = resolveMessageStyles({
      ...base,
      backgroundColor: '#111111',
      fontColor: '#999999'
    });
    expect(styles.box).toBe('background-color: #111111;');
    expect(styles.body).toBe('color: #999999;');
  });

  it('2 — the presenter s pair beats the message s own', () => {
    const styles = resolveMessageStyles({
      ...base,
      presenterStyle,
      backgroundColor: '#111111',
      fontColor: '#999999'
    });
    expect(styles.box).toBe('background-color: #222222;');
    expect(styles.body).toBe('color: #333333;');
  });

  it('3 — the room chat style beats the message s own, and LOSES to the presenter s', () => {
    /*
      The "not 2" of the table, and it falls out of one condition rather than a branch: the
      presenter's pair is applied as `messageBackgroundColor`, and `chatStyle` is gated on there
      being no background. Reproducing the reference's placement is what makes that free.
    */
    const overMessage = resolveMessageStyles({ ...base, chatStyle });
    expect(overMessage.box).toBe('background-color: #c4c4c4;');

    const underPresenter = resolveMessageStyles({ ...base, chatStyle, presenterStyle });
    expect(underPresenter.box).toBe('background-color: #222222;');
    expect(underPresenter.body).not.toContain('#c1c1c1');
  });

  it('4 — the per-followed-user override beats all three', () => {
    const styles = resolveMessageStyles({
      ...base,
      followedStyle,
      chatStyle,
      presenterStyle,
      backgroundColor: '#111111'
    });
    expect(styles.box).toBe('background-color: #f4f4f4;');
    expect(styles.username).toBe('color: #f3f3f3; font-size: 21px;');
    expect(styles.date).toBe('color: #f3f3f3; font-size: 18px;');
  });

  it('applies the ROOM style to chat only — an alert with no follow gets nothing', () => {
    /* `kind === 'chat' && !messageBackgroundColor ? chatStyle : undefined`, which is upstream's. */
    expect(resolveMessageStyles({ kind: 'alert', chatStyle }).box).toBeUndefined();
    expect(resolveMessageStyles({ kind: 'chat', chatStyle }).box).toBe(
      'background-color: #c4c4c4;'
    );
  });
});

describe('the kebab s inversion, which is one value and was two', () => {
  it('inverts the colour the BOX is actually painted with', () => {
    /*
      The defect this consolidation fixed: the inversion read `msg.bkgColor` while the box took its
      background from `followedStyle`, so a followed user whose message ALSO carried a background
      got a kebab inverting a colour nowhere on screen. Both read one resolved value now.
    */
    const styles = resolveMessageStyles({
      ...base,
      followedStyle,
      backgroundColor: '#111111'
    });
    expect(styles.box).toBe('background-color: #f4f4f4;');
    expect(styles.backgroundInversion).toBe('color: #f4f4f4; filter: invert(1);');
  });

  it('is undefined when the box has no background at all', () => {
    expect(resolveMessageStyles(base).backgroundInversion).toBeUndefined();
    expect(resolveMessageStyles(base).box).toBeUndefined();
  });

  it('is what the name and date fall back to when no follow/room style applies', () => {
    const styles = resolveMessageStyles({ ...base, backgroundColor: '#111111' });
    expect(styles.username).toBe('color: #111111; filter: invert(1);');
    expect(styles.date).toBe(styles.username);
  });
});

describe('a captured row renders what was captured', () => {
  it('shuts off every live source when evidenceKey is set', () => {
    /*
      A presenter whose hash happens to match a captured sender's must not repaint the evidence —
      and neither may this viewer's follow list or room style.
    */
    const styles = resolveMessageStyles({
      ...base,
      evidenceKey: 'captured-row-7',
      presenterStyle,
      followedStyle,
      chatStyle,
      backgroundColor: '#111111',
      fontColor: '#999999'
    });
    expect(styles.box).toBe('background-color: #111111;');
    expect(styles.body).toBe('color: #999999;');
    expect(styles.username).toBe('color: #111111; filter: invert(1);');
  });

  it('honours a captured `style` attribute, INCLUDING one the capture did not have', () => {
    /*
      `null` and `undefined` are different answers here and the distinction is load-bearing:
      `undefined` means "no captured value, resolve normally", `null` means "the captured element
      carried no style attribute" — which must render none, not fall back to a live one.
    */
    expect(
      resolveMessageStyles({ ...base, evidenceMessageBoxStyle: 'background-color: #abcdef;' }).box
    ).toBe('background-color: #abcdef;');

    expect(
      resolveMessageStyles({
        ...base,
        evidenceMessageBoxStyle: null,
        backgroundColor: '#111111'
      }).box
    ).toBeUndefined();

    expect(
      resolveMessageStyles({ ...base, evidenceBodyStyle: null, fontColor: '#999999' }).body
    ).toBeUndefined();
  });
});
