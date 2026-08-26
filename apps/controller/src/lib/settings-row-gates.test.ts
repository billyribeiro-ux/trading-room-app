import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Every settings row the reference SHOWS CONDITIONALLY, against our handling of it.
 *
 * ## Why this is worth pinning
 *
 * A row that should be hidden and is not looks completely normal. The reference's captured room had
 * the profanity filter off, so both of its sub-rows carried `ng-hide` and contributed nothing to the
 * capture — while ours rendered two complete rows an operator of that room could never have seen.
 * Nothing about that is visible in a screenshot of either.
 *
 * The generated schema records no visibility field, so the gates are hand-written plumbing keyed by
 * name. Only the CONDITIONS are evidence. This test is what stops the hand-written half drifting from
 * the template: it extracts every gated wrapper and fails when one appears that nothing handles.
 *
 * ## The comment this replaces was wrong
 *
 * `+page.svelte` used to state the profanity pair were "the only two `ng-show` rows anywhere in the
 * settings list". Written from the capture, where most gated rows were hidden and therefore invisible.
 * The template has fourteen gated wrappers over nine distinct expressions.
 */

const TEMPLATE = readFileSync(`${process.cwd()}/evidence-dumps/TIER1-fetched/views/page.manageSession.html`, 'utf8');
const PAGE = readFileSync(`${process.cwd()}/src/routes/(app)/account/rooms/[id]/[[tab]]/+page.svelte`, 'utf8');
/** Rows the reference has switched off are not rows we must gate. */
const LIVE = TEMPLATE.replace(/<!--[\s\S]*?-->/g, '');

/** Each `<p>`/`<div>` gated on a `sess.*` expression, paired with the settings it wraps. */
function gatedSettings(): Map<string, string> {
  const found = new Map<string, string>();
  const wrapper = /<(p|div)\b[^>]*ng-(?:show|if)="([^"]*sess\.[^"]*)"[^>]*>/g;
  for (const m of LIVE.matchAll(wrapper)) {
    const [, tag, expr] = m;
    const rest = LIVE.slice(m.index! + m[0].length);
    const end = rest.indexOf(`</${tag}>`);
    const body = end === -1 ? rest.slice(0, 1200) : rest.slice(0, end);
    for (const n of body.matchAll(/saveSessField\('([^']+)'\)/g)) {
      found.set(n[1], expr.trim());
    }
  }
  return found;
}

const gates = gatedSettings();

describe('every conditionally-shown settings row is handled', () => {
  it('reads a real set out of the template', () => {
    /* Counted 2026-08-13. A regex that stops matching yields an empty map, and every `for` loop
       below would then pass while checking nothing. */
    expect(gates.size).toBe(10);
  });

  it('finds exactly the settings the reference gates', () => {
    expect([...gates.keys()].sort()).toEqual([
      'additionalBadWordsList',
      'allowPWLoginWithSSO',
      'ingnoreBadWordsList',
      'ssoJWTSecret',
      'tokenExpiresIn',
      'webinarDate',
      'webinarPW',
      'webinarPW2',
      'webinarPW3',
      'webinarPWFreeTrial'
    ]);
  });

  it('the seven authMode rows are in authModeGated', () => {
    for (const name of [
      'ssoJWTSecret',
      'allowPWLoginWithSSO',
      'tokenExpiresIn',
      'webinarPW',
      'webinarPW2',
      'webinarPW3',
      'webinarPWFreeTrial'
    ]) {
      expect(gates.get(name), `${name} must be gated in the template`).toMatch(/authMode/);
      expect(PAGE, `${name} must appear in authModeGated`).toMatch(
        new RegExp(`authModeGated[\\s\\S]{0,900}\\b${name}:`)
      );
    }
  });

  it('the two profanity rows are in profanityGated, on the parent checkbox', () => {
    for (const name of ['ingnoreBadWordsList', 'additionalBadWordsList']) {
      expect(gates.get(name)).toBe('sess.hasProfanityFilter');
      expect(PAGE).toMatch(new RegExp(`${name}: \\(\\) => !!settingValue\\('hasProfanityFilter'\\)`));
    }
  });

  it('webinarDate is gated in the header block, not in either map', () => {
    /* It is not part of the flat settings list — the header form renders it directly, so its gate
       lives on the wrapper rather than in a name-keyed map. */
    expect(gates.get('webinarDate')).toBe("sess.roomType=='webinar'");
    expect(PAGE).toContain('hidden={!isWebinar}');
  });

  it('both gate maps are actually consulted when rendering a row', () => {
    /* A map nothing reads is the same defect as no map. */
    expect(PAGE).toContain('(authModeGated[def.name]?.() ?? true) && (profanityGated[def.name]?.() ?? true)');
  });

  it('the reference spells it `ingnoreBadWordsList`, and we keep the typo', () => {
    /* Correcting it to `ignore…` would rename a live settings key and orphan every stored value. */
    expect(gates.has('ingnoreBadWordsList')).toBe(true);
    expect(gates.has('ignoreBadWordsList')).toBe(false);
  });
});
