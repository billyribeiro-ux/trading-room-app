import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { parseConstTable } from './const-table.mjs';

/*
  ONE parser, TWO readers - and the duplication is proven, not assumed.

  src/lib/const-table.mjs is the source of truth and scripts/extract-component-source.mjs imports it.
  scripts/pull-component-source.js cannot: it is a single IIFE pasted into a DevTools console, where
  there is no module loader. So it carries a copy, and this file is the thing that keeps the copy
  honest - if someone fixes one and not the other, the first assertion below fails.

  The parser lived at scripts/lib/const-table.mjs until 2026-08-15, when every file under
  apps/room/scripts was untracked and gitignored - that directory is reference-match tooling aimed at
  a live third-party application and this repository is public. Three TRACKED tests import this
  parser, so leaving it there meant three `Cannot find module` errors in svelte-check on every clean
  checkout, which is exactly what the room's Type-check gate reported. It was misfiled: a parser with
  its own unit test beside it in src/lib is first-party source, not a collector. The collectors stay
  out; this came in.

  NORMALISATION, stated exactly: the console copy lives inside the IIFE and is therefore indented
  two spaces deeper. The only transform applied is removing ONE leading two-space run from each
  line of the console copy that starts with two spaces; empty lines (which are truly empty, not
  whitespace) are left alone. Nothing else is touched - no trimming, no whitespace collapsing, no
  newline rewriting. After that the two texts are compared with ===.
*/

const consoleScript = readFileSync(
  new URL('../../scripts/pull-component-source.js', import.meta.url),
  'utf8'
);
const moduleSource = readFileSync(new URL('./const-table.mjs', import.meta.url), 'utf8');
const offlineScript = readFileSync(
  new URL('../../scripts/extract-component-source.mjs', import.meta.url),
  'utf8'
);
const bundle = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);

/**
 * Slices `function <name>(…) { … }` out of a file, closing on a brace at `indent` columns.
 * Text only - no evaluation, because the point is to compare bytes.
 */
function functionText(source: string, name: string, indent: string): string {
  const from = source.indexOf(`${indent}function ${name}(`);
  expect(from, `${name} should be defined at ${indent.length}-space indent`).toBeGreaterThan(-1);
  const close = `\n${indent}}\n`;
  const to = source.indexOf(close, from);
  expect(to, `${name} should close on a ${indent.length}-space-indented brace`).toBeGreaterThan(
    from
  );
  return source.slice(from + indent.length, to + close.length - 1);
}

/** Removes exactly one leading two-space run per line. Empty lines are untouched. */
function dedent(text: string): string {
  return text
    .split('\n')
    .map((line) => (line.startsWith('  ') ? line.slice(2) : line))
    .join('\n');
}

describe('const-table parser: one source of truth', () => {
  it('ships byte-identical copies in the module and the console script', () => {
    const fromModule = functionText(moduleSource, 'parseConstTable', '');
    const fromConsole = dedent(functionText(consoleScript, 'parseConstTable', '  '));

    // Guard the normalisation itself: dedent must not have been a no-op on a real, indented copy.
    expect(fromConsole).not.toBe(functionText(consoleScript, 'parseConstTable', '  '));
    expect(fromModule.length).toBeGreaterThan(2000);
    expect(fromConsole).toBe(fromModule);
  });

  it('is what the offline extractor actually calls - the shortcut is gone', () => {
    // Path updated with the parser's move into src/lib on 2026-08-15. This assertion is the reason
    // the move could not be done by editing imports alone: it pins the extractor to the ONE parser
    // rather than a copy, so it has to name wherever that parser actually lives.
    expect(offlineScript).toContain(
      "import { parseConstTable } from '../src/lib/const-table.mjs';"
    );
    expect(offlineScript).toContain('entries = parseConstTable(table);');
    // The shortcut survives only inside the comments that explain why it is gone.
    const code = offlineScript
      .split('\n')
      .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
      .join('\n');
    expect(code).not.toContain('replaceAll');
    expect(code).not.toContain('JSON.parse');
  });

  it("decodes app-room's real const table, which JSON.parse could not", () => {
    // The same anchoring scripts/extract-component-source.mjs uses.
    const anchor = bundle.indexOf('selectors:[["app-room"]]');
    expect(anchor, 'app-room should be in the archived bundle').toBeGreaterThan(-1);
    const next = bundle.indexOf('selectors:[["', anchor + 10);
    const body = bundle.slice(anchor, next === -1 ? anchor + 20000 : next);

    const start = body.indexOf('consts:[');
    let depth = 0;
    let table = '';
    for (let at = start + 'consts:'.length; at < body.length; at += 1) {
      if (body[at] === '[') depth += 1;
      else if (body[at] === ']') {
        depth -= 1;
        if (depth === 0) {
          table = body.slice(start + 'consts:'.length, at + 1);
          break;
        }
      }
    }

    expect(table.length).toBe(13636);
    expect(table).toContain(`"Don't Disturb"`);
    expect(() => JSON.parse(table.replaceAll("'", '"'))).toThrow();

    const entries = parseConstTable(table);
    expect(entries).toHaveLength(229);
    expect(entries).toContainEqual(
      expect.arrayContaining(['title', "Don't Disturb", 'id', 'app-donot-disturb'])
    );
  });

  it('agrees with the old shortcut on every table the old shortcut could parse', () => {
    // No regression for the components that had no apostrophe: same structure, markers and order.
    for (const selector of [
      'app-presentationarea',
      'app-screenshare-view',
      'app-poll-modal',
      'app-alerts'
    ]) {
      const anchor = bundle.indexOf(`selectors:[["${selector}"]]`);
      expect(anchor, `${selector} should be in the archived bundle`).toBeGreaterThan(-1);
      const next = bundle.indexOf('selectors:[["', anchor + 10);
      const body = bundle.slice(anchor, next === -1 ? anchor + 20000 : next);

      const start = body.indexOf('consts:[');
      if (start === -1) continue;
      let depth = 0;
      let table = '';
      for (let at = start + 'consts:'.length; at < body.length; at += 1) {
        if (body[at] === '[') depth += 1;
        else if (body[at] === ']') {
          depth -= 1;
          if (depth === 0) {
            table = body.slice(start + 'consts:'.length, at + 1);
            break;
          }
        }
      }

      expect(parseConstTable(table), selector).toEqual(JSON.parse(table.replaceAll("'", '"')));
    }
  });
});
