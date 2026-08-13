import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * `table-striped` and `table-hover`, against Bootstrap 3.3.7's own rules. T2-7.
 *
 * ## The defect this file was written for
 *
 * `account.css` defined BOTH rules twice. The two copies computed to the same specificity — one
 * class, two types, one pseudo-class — so source order decided, and the LATER copy won. It differed
 * from the earlier one in two ways, both wrong:
 *
 *   - `.acc-table tbody tr` — a DESCENDANT combinator, where Bootstrap uses a CHILD one
 *     (`.table-striped > tbody > tr`). The loose form also stripes rows of any table nested inside
 *     an `.acc-table`.
 *   - `background:` — the SHORTHAND, where Bootstrap sets `background-color`. The shorthand also
 *     resets background-image, -position, -repeat and -size.
 *
 * Both colours were identical, so nothing looked wrong. A duplicated rule where the wrong copy wins
 * is invisible until the day something depends on the difference.
 *
 * ## What this does NOT establish
 *
 * Which rows actually stripe in a live render with several rooms and several users. That needs a
 * capture with 2+ rooms and 4+ users and is the remaining half of T2-7 — recorded, not asserted.
 * Note also that `ng-hide` rows still occupy `nth-of-type` positions (T5-12), so a filtered table
 * bands irregularly BY DESIGN.
 */

const cwd = process.cwd();
const BOOTSTRAP3 = readFileSync(`${cwd}/evidence-bootstrap-3.3.7.css`, 'utf8');
const ACCOUNT = readFileSync(`${cwd}/src/account.css`, 'utf8');
const MANAGE = readFileSync(`${cwd}/src/manage.css`, 'utf8');

/** Declarations only — the ban below is on the RULE, not on the comment explaining it. */
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '');

describe('the Bootstrap 3.3.7 rules we are matching', () => {
  it('are what this test claims — read, not remembered', () => {
    expect(BOOTSTRAP3).toContain('.table-striped > tbody > tr:nth-of-type(odd) {\n  background-color: #f9f9f9;\n}');
    expect(BOOTSTRAP3).toContain('.table-hover > tbody > tr:hover {\n  background-color: #f5f5f5;\n}');
  });
});

describe('account.css matches them exactly', () => {
  const css = strip(ACCOUNT);

  it('uses the CHILD combinator, as Bootstrap does', () => {
    expect(css).toContain('.acc-table > tbody > tr:nth-of-type(odd)');
    expect(css).toContain('.acc-table > tbody > tr:hover');
  });

  it('never uses the loose descendant form', () => {
    /* The exact shape of the duplicate that used to win. */
    expect(css).not.toMatch(/\.acc-table tbody tr:nth-of-type\(odd\)/);
    expect(css).not.toMatch(/\.acc-table tbody tr:hover/);
  });

  it('sets background-COLOR, never the shorthand', () => {
    /* The shorthand clears background-image and friends; Bootstrap sets only the colour. */
    const striped = css.slice(css.indexOf('.acc-table > tbody > tr:nth-of-type(odd)'));
    const block = striped.slice(0, striped.indexOf('}') + 1);
    expect(block).toContain('background-color:');
    expect(block).not.toMatch(/\bbackground:\s/);
  });

  it('defines each rule exactly ONCE', () => {
    /*
      THE assertion. Two copies at equal specificity meant source order silently chose the winner,
      and the winner was the wrong one for two years' worth of readers who saw the correct rule
      first and stopped looking.
    */
    expect(css.split('tr:nth-of-type(odd)').length - 1).toBe(1);
    expect(css.split('tr:hover').length - 1).toBe(1);
  });

  it('carries #f9f9f9 and #f5f5f5, in the rgb() form the CSSOM reports', () => {
    expect(css).toContain('background-color: rgb(249, 249, 249)');
    expect(css).toContain('background-color: rgb(245, 245, 245)');
  });
});

describe('manage.css keeps Bootstrap’s own selector', () => {
  it('scopes the striping under .mg-root with the child combinator', () => {
    expect(strip(MANAGE)).toContain('.mg-root .table-striped > tbody > tr:nth-of-type(odd)');
  });
});

describe('the two utility classes on the Chat Tabs gear icon', () => {
  /*
    `<i class="fa fa-gear ms-2 cursor-pointer">` — page.manageSession.html:1860.

    A comment in `+page.svelte` used to say NEITHER class had a rule. That was true when it was
    written, because only the CSSOM captures existed then. The RAW stylesheet was fetched later and
    defines one of them. Pinned here so the corrected claim cannot rot back.
  */
  const STYLES = readFileSync(`${cwd}/evidence-dumps/TIER1-fetched/styles.css`, 'utf8');

  it('cursor-pointer IS a real rule, scoped to :hover', () => {
    expect(STYLES).toContain('.cursor-pointer:hover {\n  cursor: pointer;\n}');
  });

  it('ms-2 has no rule in any stylesheet this repo holds', () => {
    /* A Bootstrap 5 spacing utility on a Bootstrap 3 page — inert, like `btn-small` on APPROVE. */
    for (const css of [STYLES, BOOTSTRAP3, ACCOUNT, MANAGE]) {
      expect(css).not.toMatch(/\.ms-2\b/);
    }
    /* And the theme sheet, which is the other place a utility could hide. */
    expect(readFileSync(`${cwd}/evidence-dumps/TIER1-fetched/theme.css`, 'utf8')).not.toMatch(/\.ms-2\b/);
  });
});
