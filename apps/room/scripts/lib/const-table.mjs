// @ts-nocheck - `tsconfig.json` sets checkJs+strict, and importing this file from a test is what
// drags it into svelte-check. It cannot be answered with annotations: every byte of the function
// below is pinned, by src/lib/const-table-module.test.ts, to a copy that gets pasted into a
// DevTools console as plain JavaScript, so a `: string` here would fail that assertion.

/* ============================================================================
 * The const-table tokenizer. SINGLE SOURCE OF TRUTH.
 *
 * Angular emits a component's `consts:[ … ]` table as a JavaScript array literal, NOT as JSON.
 * The minifier picks whichever quote character needs fewer escapes, so `"Don't Disturb"`
 * (app-room, const 128) and `'say "hi"'` are both legal in the same table. The shortcut both
 * readers used - JSON.parse(table.replaceAll("'", '"')) - rewrote that apostrophe into
 * `"Don"t Disturb"`, the parse threw, and all 229 entries of the 13,636-char table were lost.
 * That is why app-room came back undecoded while smaller components did not.
 *
 * So walk it a character at a time: `readString` remembers which quote opened the string and
 * only that one closes it, and a backslash always consumes the character after it.
 *
 * TWO READERS, ONE PARSER
 * ------------------------------------------------------------------------
 * scripts/extract-component-source.mjs imports this module.
 *
 * scripts/pull-component-source.js CANNOT: it is a single IIFE pasted into a DevTools console,
 * where there is no module loader and no repository. It carries a copy, indented by two spaces to
 * sit inside the IIFE. That copy is not trusted to stay in step by hope -
 * src/lib/const-table-module.test.ts asserts the two function texts are byte-identical once the
 * two-space indent is removed, so a fix applied to one and not the other fails the suite.
 *
 * EDIT HERE FIRST, then mirror into the console script.
 * ========================================================================== */

function parseConstTable(text) {
  const ESCAPES = { b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v', 0: '\0' };
  const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/y;
  const KEYWORD = /true|false|null|undefined/y;
  let at = 0;

  function fail(what) {
    throw new SyntaxError(`${what} at offset ${at}: ${JSON.stringify(text.slice(at, at + 32))}`);
  }

  function space() {
    while (at < text.length && /\s/.test(text[at])) at += 1;
  }

  function readString() {
    const quote = text[at];
    at += 1;
    let value = '';
    while (at < text.length) {
      const char = text[at];
      if (char === quote) {
        at += 1;
        return value;
      }
      if (char !== '\\') {
        value += char;
        at += 1;
        continue;
      }
      const code = text[at + 1];
      at += 2;
      if (code === 'u' && text[at] === '{') {
        const close = text.indexOf('}', at);
        if (close === -1) fail('unterminated \\u{...} escape');
        value += String.fromCodePoint(Number.parseInt(text.slice(at + 1, close), 16));
        at = close + 1;
      } else if (code === 'u' || code === 'x') {
        const width = code === 'u' ? 4 : 2;
        const point = Number.parseInt(text.slice(at, at + width), 16);
        if (!Number.isInteger(point)) fail(`bad \\${code} escape`);
        value += String.fromCharCode(point);
        at += width;
      } else if (code === '\n') {
        // Line continuation: the newline is not part of the string.
      } else {
        value += ESCAPES[code] ?? code;
      }
    }
    return fail('unterminated string');
  }

  function readValue() {
    space();
    const char = text[at];
    if (char === undefined) return fail('unexpected end of table');

    if (char === '[') {
      at += 1;
      const items = [];
      for (;;) {
        space();
        if (text[at] === ']') {
          at += 1;
          return items;
        }
        if (text[at] === ',') {
          at += 1; // A hole, as in [1,,2].
          items.push(undefined);
          continue;
        }
        items.push(readValue());
        space();
        if (text[at] === ',') at += 1;
        else if (text[at] !== ']') fail('expected , or ] after array element');
      }
    }

    if (char === '"' || char === "'") return readString();

    NUMBER.lastIndex = at;
    const number = NUMBER.exec(text);
    if (number && number.index === at) {
      at += number[0].length;
      return Number(number[0]);
    }

    KEYWORD.lastIndex = at;
    const keyword = KEYWORD.exec(text);
    if (keyword && keyword.index === at) {
      at += keyword[0].length;
      return { true: true, false: false, null: null, undefined: undefined }[keyword[0]];
    }

    return fail('unexpected token');
  }

  const table = readValue();
  space();
  if (at !== text.length) fail('trailing input after the table');
  return table;
}

export { parseConstTable };
