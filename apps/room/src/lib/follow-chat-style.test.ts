import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { nextFollowChatFontSize } from './follow-chat-style';
import { resolveMessageStyles } from './message-styles';
import type { FollowChatStyle } from './types';

/**
 * FCS-1 — the Text Size box, and the one-pixel username it used to be able to save.
 *
 * ## The defect, and why the demonstration comes first
 *
 * `bind:value` on `<input type="number">` writes `null` for an empty box — Svelte 5.56.10,
 * `to_number` at `node_modules/svelte/src/internal/client/dom/elements/bindings/input.js:287-289`,
 * `value === '' ? null : +value`. `FollowChatStyle.fontSize` is declared `number` (`types.ts:59`),
 * so nothing in the type system or in `svelte-check` sees it.
 *
 * The first block below is not a test of the fix. It is the MEASUREMENT the fix exists for, made
 * executable so that "clearing the box renders the name at 1px" is a statement this repository can
 * be held to rather than a sentence in a comment — DPE rule 4. It feeds a `null` straight into
 * `resolveMessageStyles` and reads back `font-size: 1px`, because `null + 1` is `1` in JavaScript.
 *
 * ## Negative controls, run before this file was committed
 *
 * * `nextFollowChatFontSize` returning `parsed` unconditionally → the four "keeps the last good
 *   value" cases go RED, naming the value they got instead.
 * * the `> 0` term dropped → `'0'` and `'-3'` go RED.
 * * the markup assertion's `oninput` term removed from the pane → that `it` goes RED. Asserted
 *   against the SLICE around the size input rather than the whole file, because `bind:value`
 *   appears five more times in this pane for the colour inputs and a whole-file `not.toContain`
 *   would have been answered by any one of them.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PANE = readFileSync(`${ROOT}lib/components/FollowChatStylePane.svelte`, 'utf8');

const style = (fontSize: number): FollowChatStyle => ({
  color: '#ffffff',
  tickerColor: '#f7fd37',
  usernameColor: '#c0d8ed',
  bgColor: '#000000',
  fontSize,
  playSound: true
});

describe('the measurement: what an emptied Text Size box did downstream', () => {
  it('renders the followed user’s username at one pixel when fontSize is null', () => {
    const styles = resolveMessageStyles({
      kind: 'chat',
      followedStyle: style(null as unknown as number)
    });
    /* `message-styles.ts:123` — `${fontSize + 1}px`, and `null + 1` is 1, not NaN. */
    expect(styles.username).toContain('font-size: 1px;');
    /* Its two siblings produce declarations the parser drops instead, which is the quieter half. */
    expect(styles.date).toContain('font-size: -2px;');
    expect(styles.body ?? '').not.toContain('font-size');
  });

  it('renders the same three at the real size when fontSize is a number', () => {
    const styles = resolveMessageStyles({ kind: 'chat', followedStyle: style(14) });
    expect(styles.username).toContain('font-size: 15px;');
    expect(styles.date).toContain('font-size: 12px;');
    expect(styles.body).toContain('font-size: 14px;');
  });
});

describe('nextFollowChatFontSize keeps the last good value', () => {
  it('takes a number the box can hold', () => {
    expect(nextFollowChatFontSize('18', 14)).toBe(18);
    expect(nextFollowChatFontSize('9', 14)).toBe(9);
  });

  it('keeps the current value when the box is emptied', () => {
    expect(nextFollowChatFontSize('', 14)).toBe(14);
    expect(nextFollowChatFontSize('   ', 14)).toBe(14);
  });

  it('keeps the current value for anything CSS cannot use as a font-size', () => {
    /* A `type=number` box can still be handed these by paste, autofill or a spinner at the floor. */
    expect(nextFollowChatFontSize('abc', 14)).toBe(14);
    expect(nextFollowChatFontSize('0', 14)).toBe(14);
    expect(nextFollowChatFontSize('-3', 14)).toBe(14);
    expect(nextFollowChatFontSize('Infinity', 14)).toBe(14);
  });

  it('does not invent a maximum the reference does not have', () => {
    /*
      Const 113 carries no `min` and no `max`, so neither does this. The only refusals above are
      the ones `font-size` itself cannot express.
    */
    expect(nextFollowChatFontSize('96', 14)).toBe(96);
    expect(nextFollowChatFontSize('1', 14)).toBe(1);
  });
});

describe('the pane routes the Text Size box through it', () => {
  it('binds value one-way and writes back through the coercion', () => {
    const at = PANE.indexOf('id="follow-chat-text-size"');
    expect(at, 'the Text Size input moved').toBeGreaterThan(-1);
    const input = PANE.slice(at, at + 300);
    expect(input).toContain('value={style.fontSize}');
    expect(input).toContain('nextFollowChatFontSize(event.currentTarget.value, style.fontSize)');
    expect(input, 'the two-way numeric binding is the defect itself').not.toContain('bind:value');
  });

  it('still binds the five fields where a two-way binding is safe', () => {
    /* Four colours and a checkbox: a `type=color` box cannot be empty and a checkbox is boolean. */
    expect([...PANE.matchAll(/bind:value=\{style\./g)]).toHaveLength(4);
    expect(PANE).toContain('bind:checked={style.playSound}');
  });
});
