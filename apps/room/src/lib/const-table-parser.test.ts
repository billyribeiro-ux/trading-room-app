import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  `scripts/pull-component-source.js` is pasted into a DevTools console, so it is one IIFE with no
  exports and it cannot be imported. This lifts the two functions under test straight out of the
  shipped file text and evaluates them, which means the assertions below are pinned to the bytes
  that actually get pasted - a reintroduced `replaceAll` shortcut fails here.

  Pinned against the SHIPPED BUNDLE rather than a hand-written sample, for the same reason as
  screen-controls-contract.test.ts: app-room's const table is the real input that broke.
*/

const script = readFileSync(
  new URL('../../scripts/pull-component-source.js', import.meta.url),
  'utf8'
);
const bundle = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);

/** Slices `function <name>(...) { ... }` out of the script - inside the IIFE they close on `\n  }`. */
function lift(name: string): string {
  const from = script.indexOf(`function ${name}(`);
  expect(from, `${name} should be defined in pull-component-source.js`).toBeGreaterThan(-1);
  const to = script.indexOf('\n  }\n', from);
  expect(to, `${name} should close on a two-space-indented brace`).toBeGreaterThan(from);
  return script.slice(from, to + '\n  }'.length);
}

const parseConstTable = new Function(`${lift('parseConstTable')}\nreturn parseConstTable;`)() as (
  text: string
) => unknown[];

const constsTable = new Function(`${lift('constsTable')}\nreturn constsTable;`)() as (
  body: string
) => string | null;

/** The same anchoring the script uses: selector to the next selector, capped at BODY_BYTES. */
function componentBody(selector: string): string {
  const anchor = bundle.indexOf(`selectors:[["${selector}"]]`);
  expect(anchor, `${selector} should be in the bundle`).toBeGreaterThan(-1);
  const next = bundle.indexOf('selectors:[["', anchor + 10);
  return bundle.slice(anchor, next === -1 ? anchor + 24000 : Math.min(next, anchor + 24000));
}

describe('const-table tokenizer', () => {
  it('keeps an apostrophe inside a double-quoted string', () => {
    expect(parseConstTable(`[["title","Don't Disturb"]]`)).toEqual([['title', "Don't Disturb"]]);
  });

  it('keeps double quotes inside a single-quoted string', () => {
    expect(parseConstTable(`[['say "hi"',1,'btn']]`)).toEqual([['say "hi"', 1, 'btn']]);
  });

  it('honours backslash escapes in either quote style', () => {
    expect(parseConstTable(`["a\\"b",'c\\'d',"e\\\\f","g\\u0041h","tab\\th"]`)).toEqual([
      'a"b',
      "c'd",
      'e\\f',
      'gAh',
      'tab\th'
    ]);
  });

  it('preserves the marker integers the decoder depends on', () => {
    expect(parseConstTable(`[[1,"btn","btn-sm",3,"click"],["for","x"],[2,"width","0px"]]`)).toEqual(
      [
        [1, 'btn', 'btn-sm', 3, 'click'],
        ['for', 'x'],
        [2, 'width', '0px']
      ]
    );
  });

  it('reports a malformed table instead of returning a corrupted one', () => {
    expect(() => parseConstTable(`[["unterminated]`)).toThrow(/unterminated string/);
    expect(() => parseConstTable(`[1] , junk`)).toThrow(/trailing input/);
  });

  it("parses app-room's real const table, the one JSON.parse could not", () => {
    const table = constsTable(componentBody('app-room'));
    expect(table, 'app-room should have a consts table').not.toBeNull();

    // The exact byte that broke the old shortcut: replaceAll("'", '"') made this `"Don"t Disturb"`.
    expect(table).toContain(`"Don't Disturb"`);
    expect(() => JSON.parse((table as string).replaceAll("'", '"'))).toThrow();

    const entries = parseConstTable(table as string);
    expect(entries.length).toBeGreaterThan(100);
    expect(entries).toContainEqual(
      expect.arrayContaining(['title', "Don't Disturb", 'id', 'app-donot-disturb'])
    );
  });

  it('is the parser the script actually calls', () => {
    // Everything from `extract` on is the code path; the shortcut survives only in the comment
    // above the tokenizer that explains why it is gone.
    const callSite = script.slice(script.indexOf('function extract(source, url) {'));
    expect(callSite).toContain('const entries = parseConstTable(table);');
    expect(callSite).not.toContain('replaceAll');
    expect(callSite).not.toContain('JSON.parse');
  });

  it('agrees with the old shortcut on every table the old shortcut could handle', () => {
    // No regression: these four have no apostrophe, so the shortcut parsed them, and the
    // tokenizer must return exactly the same structure - markers, order and all.
    for (const selector of [
      'app-screenshare-view',
      'app-poll-modal',
      'app-st-message',
      'app-st-compactmessage'
    ]) {
      const table = constsTable(componentBody(selector)) as string;
      expect(table, `${selector} should have a consts table`).not.toBeNull();
      expect(parseConstTable(table), selector).toEqual(JSON.parse(table.replaceAll("'", '"')));
    }
  });
});
