import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The two conditional tabs, against the reference's own `ng-show` on each.
 *
 * ## What was wrong
 *
 * Both tabs were gated ONLY on our account entitlement — may this customer use the capability. The
 * reference has no such layer; it is a single-tenant view. What it has instead is a PER-ROOM
 * condition on each tab:
 *
 *     Text List   ng-show="sess.twillioApiToken"   page.manageSession.html:609
 *     SSO Setup   ng-show="sess.authMode=='sso'"   page.manageSession.html:641
 *
 * Only the SSO one was honoured. Text List appeared on every room an entitled account owned,
 * including rooms with no Twilio credentials — a tab whose Save button posts an SMS list that cannot
 * be sent. The reference hides it precisely because there is nothing behind it.
 *
 * ## Why the SSO gate is a literal comparison and not `isSsoMode`
 *
 * `isSsoMode` treats `'jwt'` and `'sso'` as one mode, which is correct where it is used — the
 * reference's codebase spells the single concept both ways. It is wrong HERE. The tab's condition is
 * literally `authMode=='sso'`, and the reference routes a JWT room elsewhere on purpose: its SSO
 * Setup tab holds one row (SSO Host) while the JWT rows live in SETTINGS behind `authMode=='jwt'`.
 * Widening the gate would show a jwt room a tab with one field it does not use.
 */

const TEMPLATE = readFileSync(
  `${process.cwd()}/evidence-dumps/TIER1-fetched/views/page.manageSession.html`,
  'utf8'
);
const LOADER = readFileSync(
  `${process.cwd()}/src/routes/(app)/account/rooms/[id]/[[tab]]/+page.server.ts`,
  'utf8'
);
const CODE = LOADER.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/[^\n]*/g, '$1');

describe('the reference’s per-tab conditions', () => {
  it('are what this test claims — checked, not remembered', () => {
    expect(TEMPLATE).toContain('<tab heading="Text List" ng-show="sess.twillioApiToken">');
    expect(TEMPLATE).toContain(`<tab heading="SSO Setup " ng-show="sess.authMode=='sso'">`);
  });

  it('are the ONLY two conditional tabs', () => {
    /* Six tabs, two conditional. If a third ever gains an `ng-show`, this fails and says so rather
       than leaving it ungated here. */
    const gated = [...TEMPLATE.matchAll(/<tab heading="[^"]*"\s+ng-show=/g)];
    expect(gated.length).toBe(2);
  });
});

describe('our tab strip honours both', () => {
  it('Text List needs the entitlement AND the room’s Twilio token', () => {
    expect(CODE).toContain("features['text-list'] && Boolean(settings.twillioApiToken)");
  });

  it('SSO Setup needs the entitlement AND authMode exactly `sso`', () => {
    expect(CODE).toContain("features.sso && settings.authMode === 'sso'");
  });

  it('does NOT widen the SSO gate through isSsoMode', () => {
    /* The precise regression: `isSsoMode` would let a jwt room see a tab the reference hides. */
    expect(CODE).not.toContain('isSsoMode(settings.authMode)');
  });

  it('leaves Marketplace on the entitlement alone, because it is not in the strip', () => {
    expect(CODE).toContain('? features.marketplace');
    /* And the reference really has no `<tab heading="Marketplace"`. */
    expect(TEMPLATE).not.toContain('<tab heading="Marketplace"');
  });
});
