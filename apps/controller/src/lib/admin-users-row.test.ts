import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { formatShortDateTime } from './last-login-format';

/**
 * The Extra Admin Users row, against `page.welcome.html:1291-1301`.
 *
 * ## Two things the fetched template settled that a capture could not
 *
 * The reference's admin table is EMPTY in the capture — "No admin users added yet" — so no populated
 * row was ever measured. Two consequences were carried for months:
 *
 *  1. The **Added** column rendered an em dash, because the loader never selected `createdAt`. The
 *     reference fills it with `{{au.created | date:'short'}}`.
 *  2. The **Actions** cell INHERITED its appearance from the two captured siblings on the same page —
 *     the badges Delete and the API-key delete — which wrap their link in a `<label>`. The template
 *     shows this row does NOT: it is a bare anchor carrying an icon.
 *
 * Inheriting from siblings was the right call while the row was unmeasured. It is worth recording
 * that it still produced a difference, because "consistent with its neighbours" is a guess and this
 * row is the one on the page that breaks the pattern.
 */

const cwd = process.cwd();
const TEMPLATE = readFileSync(`${cwd}/evidence-dumps/TIER1-fetched/views/page.welcome.html`, 'utf8');
const PAGE = readFileSync(`${cwd}/src/routes/(app)/account/+page.svelte`, 'utf8');
const LOADER = readFileSync(`${cwd}/src/routes/(app)/account/+page.server.ts`, 'utf8');
const CSS = readFileSync(`${cwd}/src/account.css`, 'utf8');
const BOOTSTRAP3 = readFileSync(`${cwd}/evidence-bootstrap-3.3.7.css`, 'utf8');

describe('what the reference actually renders', () => {
  it('a BARE anchor with fa-remove text-danger — no <label> wrapper', () => {
    /* Checked, not remembered. If a re-fetch changes this row the citation fails here first. */
    expect(TEMPLATE).toContain(
      '<a href="" ng-click="removeAdminUser(au._id, au.name)"> <i class="fa fa-remove text-danger"></i> Remove </a>'
    );
  });

  it("and the Added column is date:'short'", () => {
    expect(TEMPLATE).toContain("{{au.created | date:'short'}}");
  });
});

describe('ours matches', () => {
  it('selects createdAt, so the Added column can be filled', () => {
    expect(LOADER).toContain('createdAt: adminUsers.createdAt');
    /* And still never selects the password hash into a page payload. */
    expect(LOADER).not.toMatch(/adminUsers\.passwordHash/);
  });

  it('renders the Added column rather than an em dash', () => {
    expect(PAGE).toContain('formatShortDateTime(admin.createdAt)');
    expect(PAGE).not.toMatch(/<td>—<\/td>/);
  });

  it('carries the fa-remove icon on the Remove control', () => {
    expect(PAGE).toContain('<i class="fa fa-remove acc-text-danger" aria-hidden="true"></i> Remove');
  });
});

describe("date:'short' is M/d/yy h:mm a", () => {
  /*
    Three things separate it from every other stamp on these pages: month and day are NOT
    zero-padded, the year is TWO digits, and there is a SPACE before the meridiem.
  */
  it('does not zero-pad the month or day', () => {
    expect(formatShortDateTime(new Date('2026-08-07T17:05:00'))).toBe('8/7/26 5:05 PM');
  });

  it('uses a two-digit year and a space before the meridiem', () => {
    expect(formatShortDateTime(new Date('2026-12-25T09:30:00'))).toBe('12/25/26 9:30 AM');
  });

  it('renders midnight and noon as 12, not 0', () => {
    expect(formatShortDateTime(new Date('2026-01-01T00:00:00'))).toBe('1/1/26 12:00 AM');
    expect(formatShortDateTime(new Date('2026-01-01T12:00:00'))).toBe('1/1/26 12:00 PM');
  });

  it('is NOT the format the rest of the page uses', () => {
    /* `formatLastLogin` is `MM/dd/yyyy @ h:mma` — padded, four-digit, no space. Confusing the two
       would be invisible until a single-digit month. */
    expect(formatShortDateTime(new Date('2026-08-07T17:05:00'))).not.toContain('@');
    expect(formatShortDateTime(new Date('2026-08-07T17:05:00'))).not.toContain('08/07/2026');
  });
});

describe('the danger colour is read, not chosen', () => {
  it('is Bootstrap 3.3.7’s #a94442', () => {
    expect(BOOTSTRAP3).toContain('.text-danger {\n  color: #a94442;\n}');
    expect(CSS).toContain('color: rgb(169, 68, 66)');
  });

  it('is scoped the way this stylesheet scopes everything else — unscoped', () => {
    /* `.acc-root` is the MANAGE page's wrapper idea, not this one's. A rule scoped to it would
       never match, which is what the first version of this did. */
    expect(CSS).toContain('.acc-text-danger {');
    expect(CSS).not.toContain('.acc-root .acc-text-danger');
    expect(PAGE).not.toContain('acc-root');
  });
});
