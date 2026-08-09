/* ============================================================================
 * Pull compiled Angular components out of the LIVE bundle.
 *
 * Paste into the DevTools console on protradingroom.com. Works signed in as a
 * member, as a presenter, or with the panel closed - because it never looks at
 * the DOM.
 *
 * WHY THIS BEATS A DOM DUMP
 * ------------------------------------------------------------------------
 * A DOM capture only contains what that session happened to render. Anything
 * behind a role, an unopened tab, or an empty list is simply absent - and
 * absent looks identical to "does not exist". That is how the saved-poll row
 * went missing for a day, and how the screenshare camera button sat
 * unimplemented while three DOM dumps showed nothing wrong.
 *
 * A component's TEMPLATE is not gated. Angular compiles every branch, icon,
 * label and handler into main.*.js and ships the same bytes to everyone. So
 * this reads the JavaScript instead of the page, and the answer does not depend
 * on who you are logged in as.
 *
 * WHY NOT JUST READ THE ARCHIVED BUNDLE
 * ------------------------------------------------------------------------
 * scripts/extract-component-source.mjs does exactly that, offline, against
 * docs/source/main.*.js. Use this one when you need the CURRENT deployment -
 * the archive is a point-in-time capture and the site moves.
 *
 * USAGE
 *   1. Open protradingroom.com. Any role. Nothing needs to be open.
 *   2. DevTools -> Console. If Chrome blocks the paste, type: allow pasting
 *   3. Paste this file. It downloads one JSON and prints a summary.
 *
 * To target different components, edit WANTED below. Leave it empty to get an
 * index of every component in the bundle and nothing else.
 * ========================================================================== */

(() => {
  'use strict';

  /** Angular selectors to extract. */
  const WANTED = [
    'app-screenshare-view',
    'app-poll-modal',
    'app-st-message',
    'app-st-compactmessage',
    'app-post-alert-modal',
    'app-room'
  ];

  /** Bytes of the component definition to keep. Templates are dense; 24k covers a large one. */
  const BODY_BYTES = 24000;

  const out = {
    capture: 'component-source',
    at: new Date().toISOString(),
    href: location.href,
    assets: [],
    index: [],
    components: {},
    notes: []
  };

  /* ── every script the page loaded, including lazy chunks ──────────────── */
  function assetUrls() {
    const urls = new Set();
    for (const script of document.scripts) if (script.src) urls.add(script.src);
    for (const entry of performance.getEntriesByType('resource')) {
      if (/\.js(\?|$)/i.test(entry.name)) urls.add(entry.name);
    }
    return [...urls];
  }

  /*
    Angular's const entries are flat arrays with a small marker language:

      ["attr","value", …]   attributes, in pairs
      1, "cls", "cls"       everything after a bare 1 is a CLASS
      2, "prop","value"     after a bare 2 come STYLE pairs
      3, "prop"             after a bare 3 come BOUND property names

    Decoding matters: [1,"btn","btn-sm","btn-dark",3,"click"] hides that it is
    class="btn btn-sm btn-dark" with a click binding.
  */
  function decodeEntry(entry) {
    if (!Array.isArray(entry)) return String(entry);
    const attrs = [];
    const classes = [];
    const styles = [];
    const bound = [];
    let mode = 'attr';

    for (let at = 0; at < entry.length; at += 1) {
      const value = entry[at];
      if (typeof value === 'number') {
        mode = value === 1 ? 'class' : value === 2 ? 'style' : value === 3 ? 'bound' : 'attr';
        continue;
      }
      if (mode === 'class') classes.push(value);
      else if (mode === 'bound') bound.push(value);
      else if (mode === 'style') {
        styles.push(`${value}:${entry[at + 1]}`);
        at += 1;
      } else {
        attrs.push(`${value}="${entry[at + 1]}"`);
        at += 1;
      }
    }

    const parts = [];
    if (classes.length) parts.push(`class="${classes.join(' ')}"`);
    if (attrs.length) parts.push(attrs.join(' '));
    if (styles.length) parts.push(`style="${styles.join('; ')}"`);
    if (bound.length) parts.push(`[bound: ${bound.join(', ')}]`);
    return parts.join('  ') || '(empty)';
  }

  /** `consts:[ … ]` needs bracket matching, not a regex - the entries nest. */
  function constsTable(body) {
    const start = body.indexOf('consts:[');
    if (start === -1) return null;
    let depth = 0;
    for (let at = start + 'consts:'.length; at < body.length; at += 1) {
      if (body[at] === '[') depth += 1;
      else if (body[at] === ']') {
        depth -= 1;
        if (depth === 0) return body.slice(start + 'consts:'.length, at + 1);
      }
    }
    return null;
  }

  /*
    The table is a JavaScript array literal, NOT JSON. The minifier emits whichever quote
    character needs fewer escapes, so `"Don't Disturb"` (app-room, const 128) and `'say "hi"'`
    are both legal. The old shortcut - JSON.parse(table.replaceAll("'", '"')) - rewrote the
    apostrophe inside that label into `"Don"t Disturb"` and all 229 entries of the 13,636-char
    table were lost, which is why app-room came back undecoded while smaller components did not.

    So walk it a character at a time: `readString` remembers which quote opened the string and
    only that one closes it, and a backslash always consumes the character after it.

    This function is a COPY. scripts/lib/const-table.mjs is the original, and
    scripts/extract-component-source.mjs imports it; a file that gets pasted into a DevTools
    console cannot import anything, so the bytes have to be duplicated here. They are not trusted
    to stay in step by hope: src/lib/const-table-module.test.ts fails if the two function texts
    stop being identical once this copy's two-space indent is removed. Edit the module first, then
    mirror it here.
  */
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

  function extract(source, url) {
    for (const [, name] of source.matchAll(/selectors:\[\["([a-z][a-z0-9-]*)"\]\]/g)) {
      if (!out.index.includes(name)) out.index.push(name);
    }

    for (const selector of WANTED) {
      const anchor = source.indexOf(`selectors:[["${selector}"]]`);
      if (anchor === -1) continue;

      const next = source.indexOf('selectors:[["', anchor + 10);
      const body = source.slice(
        anchor,
        next === -1 ? anchor + BODY_BYTES : Math.min(next, anchor + BODY_BYTES)
      );

      const record = { url, selector, consts: null, decoded: [], icons: [], text: [], body };

      const table = constsTable(body);
      if (table) {
        record.consts = table;
        try {
          const entries = parseConstTable(table);
          record.decoded = entries.map((entry, index) => `${index}: ${decodeEntry(entry)}`);
          const icons = new Set();
          for (const entry of entries) {
            if (!Array.isArray(entry)) continue;
            for (const value of entry)
              if (typeof value === 'string' && /^fa-/.test(value)) icons.add(value);
          }
          record.icons = [...icons].sort();
        } catch (cause) {
          out.notes.push(`${selector}: consts table did not parse (${cause})`);
        }
      }

      // Literal strings the template renders - labels, tooltips, confirmations.
      record.text = [
        ...new Set(
          [...body.matchAll(/[vh]t?\(\d+,\s*"((?:[^"\\]|\\.){3,160})"\)/g)]
            .map((m) => m[1])
            .filter((value) => /[a-z]{3}/i.test(value))
        )
      ];

      out.components[selector] = record;
    }
  }

  (async () => {
    const urls = assetUrls();
    out.notes.push(`${urls.length} scripts discovered`);

    for (const url of urls) {
      try {
        const response = await fetch(url, { credentials: 'same-origin' });
        out.assets.push({ url, status: response.status, ok: response.ok });
        if (!response.ok) continue;
        extract(await response.text(), url);
      } catch (cause) {
        out.assets.push({ url, error: String(cause) });
      }
    }

    out.index.sort();
    for (const selector of WANTED) {
      if (!out.components[selector]) out.notes.push(`${selector}: NOT FOUND in any loaded script`);
    }

    const name = `ptr-components-${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = name;
    link.click();
    URL.revokeObjectURL(href);

    console.log(
      `[components] ${name}  (${(blob.size / 1024).toFixed(0)} KB)\n` +
        `  scripts   : ${out.assets.length}\n` +
        `  components: ${out.index.length} in bundle, ${Object.keys(out.components).length} extracted\n` +
        (out.notes.length ? `  notes     : ${out.notes.join(' | ')}\n` : '')
    );

    for (const [selector, record] of Object.entries(out.components)) {
      console.groupCollapsed(
        `${selector} - ${record.icons.length} icons, ${record.decoded.length} consts`
      );
      console.log(record.decoded.join('\n'));
      if (record.icons.length) console.log('icons:', record.icons.join(', '));
      if (record.text.length) console.log('text:', record.text.join(' | '));
      console.groupEnd();
    }

    return out;
  })();
})();
