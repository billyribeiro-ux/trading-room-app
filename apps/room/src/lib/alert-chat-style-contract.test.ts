import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import postcss from 'postcss';

import { svelteCodeOf } from './source-comments.js';

function text(url: URL) {
  return readFileSync(url, 'utf8');
}

describe('Alert/Chat captured stylesheet authority', () => {
  const sourceCss = text(new URL('../../css/complete-app-styles.css', import.meta.url));
  const bridgedCss = text(new URL('styles/captured-runtime-components.css', import.meta.url));
  const tokensCss = text(new URL('styles/tokens.css', import.meta.url));
  const localCss = text(new URL('../app.css', import.meta.url));
  const messageCode = svelteCodeOf(text(new URL('components/RoomMessage.svelte', import.meta.url)));

  it('retains the exact source typography and shared separator rules', () => {
    expect(sourceCss).toContain('--app-font-family: Arial, Helvetica, sans-serif !important');
    expect(sourceCss).toContain(
      '.navbar[_ngcontent-ng-c3761163150] { font-size: 12px; padding: 2px; }'
    );
    expect(sourceCss).toContain(
      '.chatHeader[_ngcontent-ng-c3761163150] .fas[_ngcontent-ng-c3761163150]'
    );
    expect(sourceCss).toContain(
      '.separator[_ngcontent-ng-c1254915701] a[_ngcontent-ng-c1254915701]'
    );
    expect(bridgedCss).toContain('app-alerts .alertHeader:not(:root)');
    expect(bridgedCss).toContain('app-chat .chatHeader:not(:root)');
    expect(bridgedCss).toContain('app-st-message .separator:not(:root)');
    expect(tokensCss).toContain(
      'border-top: var(--msgs-separator-border-width) solid var(--msg-border-color)'
    );
    expect(tokensCss).toContain('font-style: var(--msgs-separator-date-font-style)');
    expect(tokensCss).toContain('font-weight: var(--msgs-separator-date-font-weight)');
  });

  it('has exactly one shared separator implementation for Alert and Chat messages', () => {
    /*
      ## COMMENTS ARE STRIPPED, and this assertion is why

      `messageComponent` is read raw, and on 2026-08-30 a comment explaining the two-host split
      quoted `<app-st-message>` — so the count read 2 for a file with one. That is the fifth time in
      this repository that prose has voted in a source assertion (`dead-export-contract`,
      `orphan-style-contract`, `evidence-gap-register-counts` and `private-chat-delivery` were the
      others), and the fix is the same one each time: `svelteCodeOf`, which strips markup comments
      and the JS comments inside `<script>`/`<style>` without touching `accept="image/*"`.

      ## And there is still exactly ONE separator, rendered from a snippet

      The card and the compact row are two hosts now — the reference's own split, each component
      carrying its own `.separator` rule — so the markup must sit INSIDE a host or neither rule
      reaches it. A `{#snippet}` is how that stays one implementation with two call sites, which is
      what this assertion is protecting and why it was worth keeping rather than relaxing.
    */
    expect(messageCode.match(/<app-st-message>/g)).toHaveLength(1);
    expect(messageCode.match(/<app-st-compactmessage>/g), 'the compact host').toHaveLength(1);
    expect(messageCode.match(/\{@render dateSeparator\(\)\}/g), 'one per host').toHaveLength(2);
    expect(messageCode.match(/<div class="separator">/g)).toHaveLength(1);
    expect(messageCode).toContain(
      '<a>{item.evidenceSeparatorText ?? longDateFormatter.format(item.createdAt)}</a>'
    );
  });

  it('forbids later local overrides of the captured header and message selectors', () => {
    const forbiddenTokens = [
      '.chat-nav',
      '.alertHeader',
      '.chatHeader',
      '.chatTabs',
      'app-st-message'
    ];
    const selectors: string[] = [];

    postcss.parse(localCss).walkRules((rule) => {
      for (const selector of rule.selectors) {
        if (forbiddenTokens.some((token) => selector.includes(token))) selectors.push(selector);
      }
    });

    expect(selectors).toEqual([]);
  });
});
