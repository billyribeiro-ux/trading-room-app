import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROOM_SETTINGS } from './room-settings-schema';
import { settingHelp } from './room-settings-help';

/**
 * Helper copy: its SHAPE and its PLACEMENT, both derived from the capture — `TODO.md` item Y.
 *
 * The reference does not write helpers one way. It writes them four ways, and puts three of them
 * outside the row they belong to. None of that was in the generated schema, so
 * `room-settings-help.ts` carried three hand-maintained tables naming 16 settings, and
 * `+page.svelte` carried a hardcoded `<label>` for a seventeenth with a comment saying "`help`
 * cannot express that, so it is furniture here".
 *
 * All four exceptions are gone. This file exists so they cannot come back: every one of them was a
 * name written down by hand beside a generated file of 269 settings, and each had already drifted.
 */

const cwd = process.cwd();
const HELP = readFileSync(`${cwd}/src/lib/room-settings-help.ts`, 'utf8');
const PAGE = readFileSync(`${cwd}/src/routes/(app)/account/rooms/[id]/[[tab]]/+page.svelte`, 'utf8');
const strip = (s: string) =>
  s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('the four shapes are what the capture contains', () => {
  it('counts exactly what was measured in the outline', () => {
    /*
      Counted by walking from each `saveSessField(` to its helper. If the generator regresses these
      move, and a count is the one thing a shape bug cannot hide behind.
    */
    const counts: Record<string, number> = {};
    for (const d of ROOM_SETTINGS) {
      if (!d.helpShape) continue;
      counts[d.helpShape] = (counts[d.helpShape] ?? 0) + 1;
    }
    expect(counts).toEqual({ muted: 136, plain: 37, bare: 5, text: 11 });
  });

  it('gives every setting with help a shape, and none without one', () => {
    for (const d of ROOM_SETTINGS) {
      // `roomType` and `description` are hand-declared rows, not read from the outline.
      if (d.name === 'roomType' || d.name === 'description') continue;
      expect(Boolean(d.helpShape), `${d.name}`).toBe(Boolean(d.help));
    }
  });
});

describe('placement is derived, not named', () => {
  it('finds exactly the three the outline puts outside their <p>', () => {
    // Their helper sits one indent level shallower than their own anchor, which is what closing the
    // paragraph looks like in the outline.
    const outside = ROOM_SETTINGS.filter((d) => d.helpOutside).map((d) => d.name);
    expect(outside.sort()).toEqual(['doNotAutoSoftReset', 'pairErrorRedirect', 'pairOKRedirect']);
  });

  it('the page renders those outside the paragraph and the rest inside', () => {
    const code = strip(PAGE);
    // Guarded both ways, or a helper renders twice — which is exactly what happened.
    expect(code).toContain('{#if help && !help.outside}');
    expect(code).toContain('{#if help?.outside}');
  });

  it('the hardcoded label for doNotAutoSoftReset is gone', () => {
    /*
      THE regression this file is for. That literal rendered a helper the shape system also
      rendered once `helpShape` existed, so it appeared TWICE — the last 62 differing elements in
      the Settings side-by-side.
    */
    const code = strip(PAGE);
    expect(code).not.toContain("def.name === 'doNotAutoSoftReset'");
    expect(code).not.toContain('Enable this to prevent media server soft reset');
  });
});

describe('the hand-maintained tables are gone and stay gone', () => {
  it('no BARE, CLASSLESS or NO_BR list', () => {
    const code = strip(HELP);
    for (const table of ['const BARE', 'const CLASSLESS', 'const NO_BR']) {
      expect(code, `${table} was a second source of truth beside the generated schema`).not.toContain(table);
    }
  });

  it('settingHelp reads the schema rather than matching names', () => {
    const code = strip(HELP);
    expect(code).toContain('SHAPE[def.helpShape ?? ');
    expect(code).toContain('outside: def.helpOutside === true');
  });

  it('CORRECTED stays, and is a different concern', () => {
    // Three helpers whose TEXT needed restoring — not their shape.
    expect(HELP).toContain('const CORRECTED');
    const code = strip(HELP);
    expect(code).toContain('CORRECTED[def.name] ?? def.help');
  });
});

describe('the mapping produces the markup the reference writes', () => {
  const of = (name: string) => {
    const def = ROOM_SETTINGS.find((d) => d.name === name);
    expect(def, name).toBeTruthy();
    return settingHelp(def!);
  };

  it('muted: a classed label after a <br>', () => {
    const h = of('pairOKRedirect');
    expect(h).toMatchObject({ shape: 'muted', br: true, outside: true });
  });

  it('plain: a bare label after a <br>', () => {
    expect(of('usernameInstructions')).toMatchObject({ shape: 'plain', br: true, outside: false });
  });

  it('bare: a label with no <br>', () => {
    expect(of('collectsUserStats')).toMatchObject({ shape: 'plain', br: false, outside: false });
  });

  it('text: no element at all', () => {
    // 11 settings write their helper as a plain text node. A `<label>`-only scan could not see
    // them, and the hand table named only 3, so the other 8 rendered with a class and a `<br>` the
    // reference has none of.
    expect(of('sendFcmAlertsNew')).toMatchObject({ shape: 'text', br: false, outside: false });
  });

  it('returns null when the reference gives no helper', () => {
    const none = ROOM_SETTINGS.find((d) => !d.help && d.name !== 'roomType');
    expect(settingHelp(none!)).toBeNull();
  });
});

describe('the outline decoder no longer truncates a helper', () => {
  it('keeps the longest one whole', () => {
    /*
      `outline.mjs` capped every text node at 160 characters, so four helpers shipped cut off
      mid-sentence and a `CORRECTED` entry existed to restore three of them by hand. The longest
      real helper is 203 characters.
    */
    const longest = ROOM_SETTINGS.reduce((n, d) => Math.max(n, d.help?.length ?? 0), 0);
    expect(longest).toBeGreaterThan(160);
    const chatTabs = ROOM_SETTINGS.find((d) => d.name === 'chatTabsWithBadges');
    expect(chatTabs?.help?.endsWith(']')).toBe(true);
  });
});
