import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { chatComposerKeyAction, chatComposerKeyPrevents } from './chat-composer-key.js';
import { inlineAlertKeyAction } from './inline-alert-key.js';
import { codeOf } from './source-comments';

/**
 * `ACA-01` and `ACA-02` — what Enter does in the chat composer, measured on BOTH compiled copies.
 *
 * The row this closes exists because a rule was read off one copy of a component that ships twice,
 * and then written down backwards. `inline-alert-key.ts`'s docblock states, as a fact about the
 * REFERENCE, that "one column over, in the chat composer, Shift+Enter is the newline". The bundle
 * says the chat composer's `onKey` is the alert box's `onKey` with three side effects added and the
 * same three-branch decision, Shift included — so that sentence describes THIS ROOM, not upstream.
 *
 * Everything below that can be executed is executed; everything that cannot is read from the pinned
 * bundle at run time rather than quoted, so a different capture turns this red instead of leaving a
 * comment quietly wrong. Source assertions read code with its comments stripped (`codeOf`), because
 * this file quotes the strings it asserts and a `toContain` a docblock can satisfy is not a test.
 */

const BUNDLE = new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url);

const PANE = codeOf(
  'components/AlertChatArea.svelte',
  readFileSync(new URL('./components/AlertChatArea.svelte', import.meta.url), 'utf8')
);

const key = (over: Record<string, unknown> = {}) => ({ key: 'Enter', ...over }) as never;

describe('the reference, read rather than recalled', () => {
  it('carries the SAME three-branch onKey in both compiled chat components', () => {
    const bundle = readFileSync(BUNDLE, 'utf8');
    /*
      Two copies, one per component, differing only in the jQuery alias and the textarea id. Both
      are matched, because the whole point of this row is that reading one is not reading the rule.
    */
    expect(bundle).toContain(
      'onKey(e){if(13==e.keyCode){e.preventDefault(),this.showTyping&&this.refreshTypingStatus(!0);const i=li("#textAreaTxt");e.shiftKey?(i.val(i.val()),this.autoExpand(e.target)):e.altKey?(i.val(i.val()+"\\n"),this.autoExpand(e.target)):(this.showEmojiChooser=!1,this.sendMessage(),this.autoExpand(e.target))}'
    );
    expect(bundle).toContain(
      'onKey(e){if(13==e.keyCode){e.preventDefault(),this.showTyping&&this.refreshTypingStatus(!0);const i=ui("#textAreaTxtExtra");e.shiftKey?(i.val(i.val()),this.autoExpand(e.target)):e.altKey?(i.val(i.val()+"\\n"),this.autoExpand(e.target)):(this.showEmojiChooser=!1,this.sendMessage(),this.autoExpand(e.target))}'
    );
  });

  it('cancels the browser default on keydown, which is what makes the keyup branch the whole rule', () => {
    const bundle = readFileSync(BUNDLE, 'utf8');
    expect(bundle).toContain('onKeydown(e){e.preventDefault()}');
    /* Bound as `keydown.enter` on the composer textarea's const, in each copy. */
    expect(bundle).toContain('"keyup","paste","keydown.enter","focus"');
  });

  it('refutes the sentence in `inline-alert-key.ts` — upstream SWALLOWS Shift+Enter in chat too', () => {
    const bundle = readFileSync(BUNDLE, 'utf8');
    /*
      `i.val(i.val())` is a self-assignment after `preventDefault`. It appears once per chat
      component and once per every other composer that shares the rule; what matters here is that
      the CHAT ones are among them, which the two full-function matches above already establish.
      This counts the swallow across the whole bundle so a future capture that removes it is seen.
    */
    expect(bundle.match(/e\.shiftKey\?\(i\.val\(i\.val\(\)\)/g) ?? []).toHaveLength(5);
    /* And the claim being corrected is still on the page it has to be corrected on. */
    const module = readFileSync(new URL('./inline-alert-key.ts', import.meta.url), 'utf8');
    expect(module).toContain('Shift+Enter is the newline');
  });
});

describe('ACA-01 — the decision', () => {
  it('posts on a plain Enter', () => {
    expect(chatComposerKeyAction(key())).toBe('post');
  });

  it('inserts a newline on ALT+Enter, which used to POST', () => {
    expect(chatComposerKeyAction(key({ altKey: true }))).toBe('newline');
  });

  it('claims nothing for any other key', () => {
    expect(chatComposerKeyAction(key({ key: 'a' }))).toBe('ignore');
    expect(chatComposerKeyAction(key({ key: 'a', altKey: true }))).toBe('ignore');
  });

  it('prevents the default exactly when this room writes the text itself', () => {
    expect(chatComposerKeyPrevents('post')).toBe(true);
    expect(chatComposerKeyPrevents('newline')).toBe(true);
    expect(chatComposerKeyPrevents('ignore')).toBe(false);
  });
});

describe('ACA-02 — the one divergence, stated in the direction it can fail', () => {
  it('leaves SHIFT+Enter to the browser, where upstream swallows it', () => {
    expect(chatComposerKeyAction(key({ shiftKey: true }))).toBe('ignore');
    expect(chatComposerKeyPrevents(chatComposerKeyAction(key({ shiftKey: true })))).toBe(false);
  });

  it('tests Shift BEFORE Alt, which is upstream s own order', () => {
    /*
      `e.shiftKey ? … : e.altKey ? …`. Shift+Alt+Enter resolves to the Shift branch in both, and the
      ordering is transcribed even though that branch's leaf is changed — a later reader comparing
      the two should find the same decision tree with one leaf moved, not a different tree.
    */
    expect(chatComposerKeyAction(key({ shiftKey: true, altKey: true }))).toBe('ignore');
  });

  it('is the ONLY leaf that differs from the inline alert box, which shares the rule', () => {
    /*
      The comparison that makes this a divergence rather than a second rule. `inlineAlertKeyAction`
      transcribes the same three branches with the swallow intact; only the Shift leaf differs, and
      only because that box had no prior behaviour to take away.
    */
    expect(inlineAlertKeyAction(key())).toBe('post');
    expect(inlineAlertKeyAction(key({ altKey: true }))).toBe('newline');
    expect(inlineAlertKeyAction(key({ key: 'a' }))).toBe('ignore');
    expect(inlineAlertKeyAction(key({ shiftKey: true }))).toBe('swallow');
    expect(chatComposerKeyAction(key({ shiftKey: true }))).toBe('ignore');
  });
});

describe('ACA-01 — the three side effects, at the composer', () => {
  const handler = (() => {
    const at = PANE.indexOf('function handleComposerKey');
    expect(at, 'the handler must exist for any of this to test anything').toBeGreaterThan(-1);
    const closes = PANE.indexOf('\n  }', at);
    expect(closes, 'the handler must close for the slice to bound anything').toBeGreaterThan(at);
    return PANE.slice(at, closes);
  })();

  it('is what the composer textarea binds', () => {
    expect(PANE).toContain('onkeydown={handleComposerKey}');
    /* On the MAIN composer, which is the element the reference's own handler reads by id. */
    expect(PANE).toContain('id="textAreaTxt"');
  });

  it('stops the typing signal on every Enter, before the branch', () => {
    expect(handler).toContain('onstoppedtyping();');
    /* BEFORE, not after: an Alt+Enter newline returns early and must still have stopped it. */
    expect(handler.indexOf('onstoppedtyping()')).toBeLessThan(handler.indexOf("=== 'newline'"));
  });

  it('closes the emoji panel on the SEND branch and not on the newline one', () => {
    expect(handler).toContain("menus.set('emoji', false)");
    expect(handler.indexOf("menus.set('emoji', false)")).toBeGreaterThan(
      handler.indexOf("=== 'newline'")
    );
  });

  it('appends the newline to the END of the draft, as `i.val(i.val() + "\\n")` does', () => {
    expect(handler).toContain("chat.composer += '\\n';");
  });

  it('re-expands the composer on both branches', () => {
    expect(handler.match(/onexpandcomposer\(field\)/g) ?? []).toHaveLength(2);
  });

  it('returns before doing anything at all for an ignored key', () => {
    /* The divergence, at the code: Shift+Enter must reach the browser with nothing prevented and
       no typing frame sent. */
    expect(handler).toContain("if (action === 'ignore') return;");
    expect(handler.indexOf("if (action === 'ignore') return;")).toBeLessThan(
      handler.indexOf('onstoppedtyping()')
    );
  });
});
