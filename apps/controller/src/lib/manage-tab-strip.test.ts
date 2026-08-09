import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The manage page's tab strip, against the capture of the strip itself.
 *
 * `must-match/important:2-25` is the whole `ul.nav.nav-tabs`, and it holds SIX `<li>`:
 *
 *     Users · Text List · Branding (Logo / Landing Page) · SSO Setup · User Stats · Settings
 *
 * Ours listed seven. The extra one, Marketplace, was invented — and the comment directly above the
 * array said "six tabs" while the array underneath it had seven, which is how it survived review.
 *
 * Absence in that capture means absence, not "hidden right now". The strip proves it twice over:
 * Text List and SSO Setup are conditional (`ng-show="sess.twillioApiToken"`,
 * `ng-show="sess.authMode=='sso'"`) and BOTH are present as `<li>` carrying `ng-hide`, so a tab the
 * reference does not want to show is still in the markup. And Angular leaves `<!-- ngIf: … -->`
 * behind for a removed branch; that `<ul>` contains none.
 *
 * The labels are read out of the capture rather than typed here, so this compares the code against
 * the evidence instead of against my transcription of it.
 */

const CAPTURE = '/Users/billyribeiro/Desktop/new-room/must-match/important';
const SERVER = new URL('../routes/(app)/account/rooms/[id]/+page.server.ts', import.meta.url);
const PAGE = new URL('../routes/(app)/account/rooms/[id]/+page.svelte', import.meta.url);

/** The `heading="…"` of every `<li>` in the capture's `ul.nav.nav-tabs`, in document order. */
function referenceTabs(): string[] {
  const text = readFileSync(CAPTURE, 'utf8');
  const open = text.indexOf('<ul class="nav nav-tabs"');
  const close = text.indexOf('</ul>', open);
  expect(open, 'the capture must contain the tab strip').toBeGreaterThan(-1);
  const strip = text.slice(open, close);

  const headings: string[] = [];
  for (const li of strip.split('<li ').slice(1)) {
    const m = /heading="([^"]*)"/.exec(li);
    if (m) headings.push(m[1]);
  }
  return headings;
}

describe('the manage tab strip', () => {
  it('the capture holds exactly six tabs', () => {
    expect(referenceTabs()).toEqual([
      'Users',
      'Text List',
      'Branding (Logo / Landing Page)',
      'SSO Setup',
      'User Stats',
      'Settings'
    ]);
  });

  it('every captured tab is in the strip, in the capture\'s own order', () => {
    const source = readFileSync(SERVER, 'utf8');
    // the labels the code will actually put in `ul.nav.nav-tabs`
    const ours: string[] = [];
    for (const entry of source.slice(source.indexOf('const ALL_TABS')).split('{ id:').slice(1)) {
      const label = /label: '([^']*)'/.exec(entry)?.[1];
      const strip = /strip: (true|false)/.exec(entry)?.[1];
      if (!label) break;
      if (strip === 'true') ours.push(label);
      if (entry.includes('] as const')) break;
    }
    expect(ours).toEqual(referenceTabs());
  });

  it('Marketplace is NOT one of them', () => {
    const source = readFileSync(SERVER, 'utf8');
    expect(referenceTabs()).not.toContain('Marketplace');
    // it still exists as a routable pane, so its buttons are not dead controls
    expect(source).toContain("{ id: 'marketplace', label: 'Marketplace', strip: false }");
  });

  it('the strip renders only strip tabs', () => {
    // without this filter the seventh tab reappears in the <ul> no matter what the flag says
    const page = readFileSync(PAGE, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    expect(page).toContain('data.tabs.filter((t) => t.strip)');
  });

  it('keeps conditional tabs in the markup rather than omitting them', () => {
    // Text List and SSO Setup must still be emitted and merely hidden, as the reference does
    const page = readFileSync(PAGE, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    expect(page).toContain('hidden={!tab.visible}');
  });
});
