import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

/**
 * The manage page's panel is Bootstrap **3**, and this pins it to the actual Bootstrap 3 source.
 *
 * ## The finding this exists to record
 *
 * The product runs TWO Bootstrap generations on two different surfaces, and until 2026-08-11 that
 * was never written down anywhere:
 *
 *  - **The room** is Bootstrap 5. Proven by a live capture — the tooltip renders
 *    `class="tooltip fade show bs-tooltip-start"` with `data-popper-placement`, which only
 *    Bootstrap 5 emits — and by its modal captures, which carry `modal fade show` and `aria-modal`.
 *  - **The account, manage and login pages** are Bootstrap 3. Proven by the reference's own
 *    captures: `div class="panel panel-default"` appears six times across
 *    `evidence-dumps/login-page/{login,logged-in-page,manage,complimentary}`, alongside
 *    `ng-show`/`ng-hide`. `.panel` is a Bootstrap 3 component — Bootstrap 4 replaced it with
 *    `.card` and Bootstrap 5 has no `.panel` at all — so that markup cannot be 4 or 5.
 *
 * The owner's `new-room-control/css-modals` is the source for that second surface: the Bootstrap
 * 3.3.7 LESS tree, the compiled `bootstrap.css` pinned beside this test, and a `styes.css` whose
 * header reads "Naut - Bootstrap Admin Theme + AngularJS". That is the theme the AngularJS half of
 * the product was built on.
 *
 * ## Why this test is a verification and not a change
 *
 * `manage.css` was transcribed from a RENDER, because no rect dump for that page existed — its own
 * header says so. This test checks that independent transcription against the upstream source it
 * was unknowingly reproducing. Every value already agreed on the day this was written; nothing was
 * edited to make it pass. What the test adds is that it cannot silently stop agreeing.
 *
 * Bootstrap 3.3.7 is frozen upstream — the last 3.x release, published 2016 — so pinning its bytes
 * is safe in a way that pinning a moving dependency would not be.
 */

const cwd = process.cwd();
const BOOTSTRAP3 = readFileSync(`${cwd}/evidence-bootstrap-3.3.7.css`, 'utf8');
const MANAGE = readFileSync(`${cwd}/src/manage.css`, 'utf8');

/** The declarations of one top-level rule, as `prop: value` pairs. */
function ruleFrom(css: string, selector: string): Record<string, string> {
  const at = css.indexOf(`\n${selector} {`);
  expect(at, `${selector} must exist`).toBeGreaterThan(-1);
  const open = css.indexOf('{', at);
  const body = css.slice(open + 1, css.indexOf('}', open));
  const out: Record<string, string> = {};
  for (const line of body.split(';')) {
    const i = line.indexOf(':');
    if (i === -1) continue;
    const prop = line.slice(0, i).trim();
    // The `-webkit-` duplicates are Bootstrap 3's own prefixes and are not what we transcribe.
    if (!prop || prop.startsWith('-')) continue;
    out[prop] = line
      .slice(i + 1)
      .trim()
      .replace(/\s+/g, ' ');
  }
  return out;
}

/** Colours are transcribed as `rgb()` from computed styles; Bootstrap writes hex. */
const HEX: Record<string, string> = {
  '#ddd': 'rgb(221, 221, 221)',
  '#333333': 'rgb(51, 51, 51)',
  '#f5f5f5': 'rgb(245, 245, 245)',
  '#fff': '#fff'
};
const normalise = (v: string) => HEX[v] ?? v;

describe('the pinned Bootstrap 3 source', () => {
  it('is the exact file the owner supplied, unmodified', () => {
    // Pinned by bytes so a "helpful" edit to the evidence is caught rather than absorbed.
    expect(createHash('sha256').update(BOOTSTRAP3).digest('hex')).toBe(
      '74a581f48de3aa01b75025b863e79592530f543f648bb3f98bfe2573c794cb48'
    );
    expect(BOOTSTRAP3).toContain('Bootstrap v3.3.7');
  });

  it('is Bootstrap 3, not 4 or 5 — the generation the manage page needs', () => {
    // `.panel` is the discriminator: Bootstrap 4 replaced it with `.card`.
    expect(BOOTSTRAP3).toContain('\n.panel {');
    expect(BOOTSTRAP3).not.toContain('\n.card {');
    // And Bootstrap 5's tooltip spelling is absent, which is why the ROOM cannot be styled from it.
    expect(BOOTSTRAP3).not.toContain('bs-tooltip-start');
  });
});

describe('every panel value we transcribed matches Bootstrap 3.3.7', () => {
  /*
    Each case reads BOTH sides out of a file. Nothing is asserted against a literal typed here, so
    this cannot pass because somebody wrote the same wrong number twice.
  */
  const cases: { selector: string; ours: string; props: string[] }[] = [
    {
      selector: '.panel',
      ours: '.mg-root .panel',
      props: ['margin-bottom', 'background-color', 'border', 'border-radius']
    },
    {
      selector: '.panel-default',
      ours: '.mg-root .panel-default',
      props: ['border-color']
    },
    {
      selector: '.panel-heading',
      ours: '.mg-root .panel-heading',
      props: ['padding', 'border-bottom', 'border-top-left-radius', 'border-top-right-radius']
    },
    {
      selector: '.panel-default > .panel-heading',
      ours: '.mg-root .panel-default > .panel-heading',
      props: ['color', 'background-color', 'border-color']
    }
  ];

  for (const { selector, ours, props } of cases) {
    it(`${selector} agrees`, () => {
      const upstream = ruleFrom(BOOTSTRAP3, selector);
      const mine = ruleFrom(MANAGE, ours);
      for (const prop of props) {
        expect(upstream[prop], `${selector} must declare ${prop} upstream`).toBeTruthy();
        expect(mine[prop], `${ours} must declare ${prop}`).toBeTruthy();
        expect(normalise(upstream[prop]), `${selector} { ${prop} }`).toBe(mine[prop]);
      }
    });
  }

  it('reproduces the box-shadow, allowing for the transcribed notation', () => {
    // Ours came from a computed style, which reorders the colour to the front and adds the spread.
    expect(ruleFrom(BOOTSTRAP3, '.panel')['box-shadow']).toBe('0 1px 1px rgba(0, 0, 0, 0.05)');
    expect(ruleFrom(MANAGE, '.mg-root .panel')['box-shadow']).toBe('rgba(0, 0, 0, 0.05) 0 1px 1px 0');
  });
});

describe('the two surfaces are not mixed up', () => {
  it('keeps Bootstrap 3 scoped to the manage page and out of the room', () => {
    // `.mg-root` is the scope that stops any of this reaching the rest of the app, and it is why
    // Bootstrap 3 panels can coexist with the Bootstrap 5 room.
    for (const line of MANAGE.split('\n')) {
      if (!line.trimStart().startsWith('.panel')) continue;
      expect(line, 'every panel rule must be scoped').toContain('.mg-root');
    }
  });

  it('does not import Bootstrap 3 into anything', () => {
    // The evidence file is READ by this test and by nothing else. If it ever ships to a browser it
    // would put a second Bootstrap on the page.
    expect(MANAGE).not.toContain('evidence-bootstrap-3.3.7');
  });
});
