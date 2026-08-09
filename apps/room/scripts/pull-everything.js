/* ============================================================================
 * PULL EVERYTHING - one paste-in dump of the LIVE protradingroom.com app.
 *
 * Paste into the DevTools console on protradingroom.com. Works signed in as a
 * member, as a presenter/admin, or with every panel closed.
 *
 *   1. Open protradingroom.com. Any role. Nothing needs to be open.
 *   2. DevTools -> Console. If Chrome blocks the paste, type: allow pasting
 *   3. Paste this file. It downloads one JSON and prints a summary.
 *      The same object is left on window.__ptrEverything for poking at.
 *
 * ── THE ONE THING TO UNDERSTAND ─────────────────────────────────────────────
 *
 * BUNDLE SECTIONS ARE AUTHORITATIVE. DOM SECTIONS ARE SESSION-SPECIFIC.
 *
 * A DOM capture only contains what THAT session happened to render. Anything
 * behind a role, an unopened tab or an empty list is simply absent - and absent
 * looks identical to "does not exist". That is how three DOM dumps showed
 * nothing wrong while the screenshot button was missing entirely.
 *
 * A component's TEMPLATE is not gated. Angular compiles every branch, icon,
 * label and handler into main.*.js and ships the same bytes to every visitor
 * regardless of who they log in as. So everything under `bundle` below was read
 * out of the JavaScript, not out of the page, and it is identical for a member,
 * a presenter and a logged-out browser.
 *
 * Everything under `session` was read out of THIS browser. It is useful context
 * and it is NOT evidence of absence. A missing element there means "this
 * session did not render it", never "the app does not have it" - check the
 * bundle section for that question, which is why both are in the same file.
 *
 * ── WHAT IT DOES NOT DO ─────────────────────────────────────────────────────
 *
 * It never gates a bundle extraction on a DOM query, it has no hardcoded list
 * of components (it discovers them), and it does not parse the const table with
 * JSON.parse: `"Don't Disturb"` is a legal minifier output and the old
 * replaceAll("'",'"') shortcut destroyed all 229 entries of app-room's table.
 * parseConstTable below is a real character-by-character tokenizer.
 *
 * PRIVACY: the session section decodes the login JWT out of localStorage - that
 * is how the app itself decides your role. The raw token is redacted but the
 * decoded payload can carry an email/user id. Treat the download as PII.
 *
 * Offline siblings: scripts/extract-component-source.mjs (one component) and
 * scripts/extract-all-production-components.mjs (the archived bundle).
 * Pinned by src/lib/pull-everything-contract.test.ts.
 * ========================================================================== */

(() => {
  'use strict';

  /*
    Elements whose full computed style is worth having every time. Named, not
    discovered, because the point is a stable before/after comparison.
    Sourced from docs/NEXT-SESSION-SCREEN-CONTROLS.md - every selector below is
    cited there (§2 the control cluster, §5 the z-index/height contract, §7 the
    tab-bar geometry measurement, §8 the #screenTabs height defect).
  */
  const COMPUTED_TARGETS = [
    'app-room',
    'app-presentationarea',
    'app-screenshare-view',
    'app-room-roster',
    'app-chat',
    '#mainTabs',
    '#mainTabsContent',
    '#screenTabs',
    '.screens-tabs',
    '#screensTabsContent',
    '.video-screen-container',
    '.webcamScreen',
    '.zoom-controls',
    '.zoom-controls-container',
    '.zoom-controls-container-detached',
    '.viewer-only-screen-zoom-controls',
    '.nav-item.ms-auto',
    'ngb-modal-window',
    'ngb-modal-backdrop'
  ];

  /*
    Angular writes a component definition as

      X = (() => { class Cmp { ... } ... static ɵcmp = dt({ type: t,
            selectors:[["app-room"]], decls, vars, consts:[ ... ],
            template: function(){...}, styles:[ ... ] }) ... return Cmp })()

    and hoists the *ngIf / *ngFor sub-templates into bare functions that sit
    BEFORE the class, between it and the previous class. Those hoisted helpers
    are where role-gated markup lives, so a span that stops at the class start
    would miss exactly the thing this script exists to find. componentSpan
    therefore returns class-body + hoisted prelude.
  */

  /** String-aware bracket matcher. Naive depth counting trips over CSS `[attr]` inside styles:[..]. */
  function matchBracket(text, start, open, close) {
    let depth = 0;
    let quote = null;
    for (let at = start; at < text.length; at += 1) {
      const char = text[at];
      if (quote !== null) {
        if (char === '\\') at += 1;
        else if (char === quote) quote = null;
        continue;
      }
      if (char === '"' || char === "'" || char === '`') {
        quote = char;
        continue;
      }
      if (char === open) depth += 1;
      else if (char === close) {
        depth -= 1;
        if (depth === 0) return at;
      }
    }
    return -1;
  }

  /** Returns the array literal text for `key` (`consts:[`, `styles:[`, `selectors:[`), or null. */
  function bracketedValue(body, key, from) {
    const start = body.indexOf(key, from ?? 0);
    if (start === -1) return null;
    const open = start + key.length - 1;
    const end = matchBracket(body, open, '[', ']');
    if (end === -1) return null;
    return body.slice(open, end + 1);
  }

  /*
    The table is a JavaScript array literal, NOT JSON. The minifier emits whichever quote
    character needs fewer escapes, so `"Don't Disturb"` (app-room, const 128) and `'say "hi"'`
    are both legal. The old shortcut - JSON.parse(table.replaceAll("'", '"')) - rewrote the
    apostrophe inside that label into `"Don"t Disturb"` and all 229 entries of the 13,636-char
    table were lost, which is why app-room came back undecoded while smaller components did not.

    So walk it a character at a time: `readString` remembers which quote opened the string and
    only that one closes it, and a backslash always consumes the character after it.
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

  /** `id` attribute values in a decoded const table - the modal index is built out of these. */
  function idsFromEntries(entries) {
    const ids = [];
    for (const entry of entries) {
      if (!Array.isArray(entry)) continue;
      for (let at = 0; at < entry.length - 1; at += 1) {
        if (entry[at] === 'id' && typeof entry[at + 1] === 'string' && entry[at + 1]) {
          if (!ids.includes(entry[at + 1])) ids.push(entry[at + 1]);
        }
      }
    }
    return ids;
  }

  /** Every class IIFE in the file: `X=(()=>{class Cmp{` and the `component:` inline form. */
  function classIndex(source) {
    const entries = [];
    const pattern = /(?:([A-Za-z0-9_$]+)=|component:)\(\(\)=>\{class ([A-Za-z0-9_$]+)\{/g;
    for (const match of source.matchAll(pattern)) {
      const inline = match[1] === undefined;
      entries.push({
        at: match.index + (inline ? 'component:'.length : 0),
        symbol: match[1] ?? `inline-component-${match.index}`,
        className: match[2],
        inline
      });
    }
    return entries;
  }

  /** The IIFE closes on `return <ClassName>})()`, which is how the offline extractor finds it too. */
  function classEndOffset(source, entry) {
    const marker = `return ${entry.className}})()`;
    const at = source.indexOf(marker, entry.at);
    return at === -1 ? -1 : at + marker.length;
  }

  /**
   * Every `selectors:[...]` in the file, parsed - element selectors AND attribute selectors.
   * No regex on the name, so `["input","type","checkbox","formControlName",""]` is not lost.
   */
  function selectorAnchors(source) {
    const anchors = [];
    let at = -1;
    while ((at = source.indexOf('selectors:[', at + 1)) !== -1) {
      const literal = bracketedValue(source, 'selectors:[', at);
      if (literal === null) continue;
      const anchor = { at, literal, selectors: null, name: null, kind: 'unknown', error: null };
      try {
        anchor.selectors = parseConstTable(literal);
        const first = anchor.selectors[0];
        if (Array.isArray(first) && typeof first[0] === 'string' && first[0])
          anchor.name = first[0];
      } catch (cause) {
        anchor.error = String(cause);
      }
      const before = source.slice(Math.max(0, at - 240), at);
      if (before.includes('\\u0275cmp')) anchor.kind = 'component';
      else if (before.includes('\\u0275dir')) anchor.kind = 'directive';
      anchors.push(anchor);
    }
    return anchors;
  }

  /**
   * The source that belongs to one definition.
   *
   * Preferred: the whole class IIFE plus the hoisted sub-template functions in front of it, which
   * is where every *ngIf branch lives. Falls back to brace-matching the definition object when the
   * class boundary cannot be resolved (Angular's own directives are emitted differently).
   */
  function componentSpan(source, classes, at) {
    let owner = null;
    for (const entry of classes) {
      if (entry.at < at) owner = entry;
      else break;
    }
    if (owner) {
      const end = classEndOffset(source, owner);
      // 400k is ~11x the largest real definition; a bigger span means the marker matched the
      // wrong `return X})()` and the fallback is the honest answer.
      if (end > at && end - owner.at < 400000) {
        const index = classes.indexOf(owner);
        const previous = classes[index - 1];
        const preludeFrom = previous ? classEndOffset(source, previous) : 0;
        const preludeTo = owner.inline ? source.lastIndexOf('const ', owner.at) : owner.at;
        return {
          strategy: 'class-iife',
          from: owner.at,
          to: end,
          className: owner.className,
          symbol: owner.symbol,
          prelude:
            preludeTo > preludeFrom && preludeFrom >= 0 ? source.slice(preludeFrom, preludeTo) : '',
          body: source.slice(owner.at, end)
        };
      }
    }

    const objectStart = source.lastIndexOf('({', at);
    if (objectStart !== -1 && at - objectStart < 400) {
      const end = matchBracket(source, objectStart + 1, '{', '}');
      if (end > at) {
        return {
          strategy: 'definition-object',
          from: objectStart,
          to: end + 1,
          className: null,
          symbol: null,
          prelude: '',
          body: source.slice(objectStart, end + 1)
        };
      }
    }
    return null;
  }

  /**
   * Literal strings the template renders as text - labels, tooltips, confirmations.
   *
   * Two alternatives rather than one back-referenced quote, for the same reason parseConstTable
   * exists: a double-quoted label is allowed to contain an apostrophe, and a class that excluded
   * both quote characters would silently drop exactly those labels.
   */
  function renderedText(body) {
    const found = [];
    const pattern = /[vh]t?\(\d+,\s*(?:"((?:[^"\\]|\\.){2,400}?)"|'((?:[^'\\]|\\.){2,400}?)')\)/g;
    for (const match of body.matchAll(pattern)) {
      const value = match[1] ?? match[2];
      if (!/[A-Za-z]{2}/.test(value)) continue;
      if (!found.includes(value)) found.push(value);
    }
    return found;
  }

  /** FontAwesome classes anywhere in the definition, including ones only a handler ever sets. */
  function iconsInSource(body) {
    const found = new Set();
    for (const match of body.matchAll(/\bfa-[a-z0-9]+(?:-[a-z0-9]+)*\b/g)) found.add(match[0]);
    return [...found].sort();
  }

  /**
   * THE WHOLE BUNDLE PATH. Pure: a string in, a report fragment out. No DOM, no fetch, no
   * document - which is why the contract test can run it in node against the archived bundle.
   */
  function extractBundle(source, url) {
    const classes = classIndex(source);
    const anchors = selectorAnchors(source);
    const regexNames = [];
    for (const match of source.matchAll(/selectors:\[\["([a-z][a-z0-9-]*)"\]\]/g)) {
      if (!regexNames.includes(match[1])) regexNames.push(match[1]);
    }

    const components = [];
    const notes = [];
    for (const anchor of anchors) {
      if (anchor.error) notes.push(`selectors at ${anchor.at}: ${anchor.error}`);
      const span = componentSpan(source, classes, anchor.at);
      if (!span) {
        notes.push(`${anchor.name ?? anchor.literal}: no span could be resolved`);
        continue;
      }

      const full = span.prelude + span.body;
      const record = {
        selector: anchor.name ?? anchor.literal,
        selectors: anchor.selectors,
        kind: anchor.kind,
        url,
        className: span.className,
        symbol: span.symbol,
        offsets: { selector: anchor.at, from: span.from, to: span.to, bytes: full.length },
        strategy: span.strategy,
        consts: null,
        constCount: 0,
        decoded: [],
        ids: [],
        icons: { fromConsts: [], fromSource: iconsInSource(full) },
        text: renderedText(full),
        css: [],
        cssBytes: 0,
        source: full
      };

      const table = bracketedValue(span.body, 'consts:[');
      if (table !== null) {
        record.consts = table;
        try {
          const entries = parseConstTable(table);
          record.constCount = entries.length;
          record.decoded = entries.map((entry, index) => `${index}: ${decodeEntry(entry)}`);
          record.ids = idsFromEntries(entries);
          const icons = new Set();
          for (const entry of entries) {
            if (!Array.isArray(entry)) continue;
            for (const value of entry) {
              if (typeof value === 'string' && /^fa-/.test(value)) icons.add(value);
            }
          }
          record.icons.fromConsts = [...icons].sort();
        } catch (cause) {
          notes.push(`${record.selector}: consts table did not parse (${cause})`);
        }
      }

      const styles = bracketedValue(span.body, 'styles:[');
      if (styles !== null) {
        try {
          record.css = parseConstTable(styles).filter((value) => typeof value === 'string');
          record.cssBytes = record.css.join('\n').length;
        } catch (cause) {
          notes.push(`${record.selector}: styles array did not parse (${cause})`);
        }
      }

      components.push(record);
    }

    const elementNames = [];
    for (const record of components) {
      if (
        record.selectors &&
        !elementNames.includes(record.selector) &&
        /^[a-z]/.test(record.selector)
      ) {
        if (record.selectors[0] && record.selectors[0][0]) elementNames.push(record.selector);
      }
    }

    return {
      url,
      bytes: source.length,
      discovery: {
        definitions: anchors.length,
        elementSelectors: elementNames.sort(),
        regexFallbackSelectors: regexNames.sort(),
        onlyFoundByParser: elementNames.filter((name) => !regexNames.includes(name)).sort(),
        onlyFoundByRegex: regexNames.filter((name) => !elementNames.includes(name)).sort()
      },
      components,
      notes
    };
  }

  /**
   * The app's own role test, from the bundle: `isPresenter = "a" == decodedSessionToken.perms`
   * (main.d6d3c112b59b7d0d.js offset 998872), and the token is
   * `localStorage.getItem(`${sessionID}.token`)` (offset 1153285). So the role is derivable from
   * storage alone - it does not need a rendered admin button, which is the point.
   */
  function decodeJwt(token) {
    if (typeof token !== 'string' || token.split('.').length < 2) return null;
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = part + '='.repeat((4 - (part.length % 4)) % 4);
    try {
      const binary = atob(padded);
      let escaped = '';
      for (let at = 0; at < binary.length; at += 1) {
        escaped += `%${`00${binary.charCodeAt(at).toString(16)}`.slice(-2)}`;
      }
      return JSON.parse(decodeURIComponent(escaped));
    } catch {
      return null;
    }
  }

  /* ── session: this browser only. NOT evidence of absence. ─────────────── */

  function readRole() {
    const role = {
      warning: 'SESSION-SPECIFIC. Describes THIS login only. Never evidence about the app.',
      basis:
        'bundle: isPresenter = ("a" == decodedSessionToken.perms); token = localStorage["<sessionID>.token"]',
      tokens: [],
      perms: null,
      isPresenter: null,
      instance: null,
      storage: {}
    };

    let keys = [];
    try {
      keys = Object.keys(localStorage);
    } catch (cause) {
      role.storage.error = String(cause);
    }

    for (const key of keys) {
      let value = null;
      try {
        value = localStorage.getItem(key);
      } catch {
        continue;
      }
      if (/\.p?token$/.test(key) || /^ey[A-Za-z0-9_-]+\./.test(String(value))) {
        const payload = decodeJwt(value);
        role.tokens.push({ key, raw: '(redacted)', bytes: (value ?? '').length, payload });
        if (payload && typeof payload.perms === 'string' && role.perms === null) {
          role.perms = payload.perms;
          role.isPresenter = payload.perms === 'a';
        }
      } else {
        role.storage[key] = value;
      }
    }

    /*
      Angular's debug API is not published in this production build (no publishGlobalUtil in the
      bundle) and `element.__ngContext__` is only an LView id: `ho` stores the LView in a
      module-private Map (`kb.set(t[zu],t)`, offset 41521) that nothing exports. So the component
      instance - and with it globals.isNonPresenterAdmin / viewerOnlyMode - is NOT reachable from
      the console. Recorded rather than guessed.
    */
    const host = document.querySelector('app-room') ?? document.querySelector('app-root');
    role.instance = {
      ngGlobalPublished: typeof window.ng === 'object' && window.ng !== null,
      hostFound: host !== null,
      ngContextType: host ? typeof host.__ngContext__ : null,
      globals: null,
      note: 'component instance unreachable in a production build; see comment above'
    };
    if (host && typeof window.ng === 'object' && window.ng !== null) {
      try {
        const component = window.ng.getComponent(host);
        const globals = component?.appService?.globals ?? component?.globals ?? null;
        if (globals) {
          role.instance.globals = {};
          for (const field of [
            'isPresenter',
            'isNonPresenterAdmin',
            'isLimitedPresenter',
            'viewerOnlyMode',
            'viewerOnlyModeLimited',
            'videoOnlyMode',
            'chatOnlyMode',
            'isPlayer',
            'loggedIn',
            'isDetached',
            'isScreenSharing',
            'isWebcaming',
            'currScreenID',
            'sessionID'
          ]) {
            role.instance.globals[field] = globals[field] ?? null;
          }
          role.isPresenter = globals.isPresenter ?? role.isPresenter;
        }
      } catch (cause) {
        role.instance.error = String(cause);
      }
    }
    return role;
  }

  function readComputed(targets) {
    const rows = [];
    for (const selector of targets) {
      let nodes = [];
      try {
        nodes = [...document.querySelectorAll(selector)];
      } catch (cause) {
        rows.push({ selector, error: String(cause) });
        continue;
      }
      const row = { selector, present: nodes.length > 0, count: nodes.length, first: null };
      if (nodes.length) {
        const node = nodes[0];
        const rect = node.getBoundingClientRect();
        const computed = getComputedStyle(node);
        const styles = {};
        for (let at = 0; at < computed.length; at += 1) {
          styles[computed[at]] = computed.getPropertyValue(computed[at]);
        }
        row.first = {
          tag: node.tagName.toLowerCase(),
          id: node.id || null,
          className: typeof node.className === 'string' ? node.className : null,
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            top: rect.top,
            left: rect.left
          },
          styles
        };
      }
      rows.push(row);
    }
    return rows;
  }

  /**
   * Every element id the BUNDLE declares, against what is in the DOM right now.
   *
   * `inDom: false` means this session did not render it. It never means the app lacks it - the
   * id is in the bundle either way, which is the whole reason both columns are here.
   *
   * `modal: true` covers both readings of "a modal id": the id NAMES a modal (`alert-modal`), or
   * a modal component DECLARES it (`discord-settings`, a tab inside app-user-settings-modal).
   * `modalIds` is that subset; `bundleIds` is every id in the bundle.
   */
  function readIds(components) {
    const bundleIds = [];
    for (const record of components) {
      const fromModal = /modal/i.test(record.selector);
      for (const id of record.ids) {
        const existing = bundleIds.find((row) => row.id === id);
        if (existing) {
          if (!existing.declaredBy.includes(record.selector))
            existing.declaredBy.push(record.selector);
          continue;
        }
        bundleIds.push({
          id,
          declaredBy: [record.selector],
          modal: fromModal || /modal/i.test(id),
          inDom: false
        });
      }
    }
    for (const row of bundleIds) row.inDom = document.getElementById(row.id) !== null;

    const inDomNow = [];
    for (const node of document.querySelectorAll(
      '.modal, [role="dialog"], ngb-modal-window, ngb-modal-backdrop'
    )) {
      inDomNow.push({
        tag: node.tagName.toLowerCase(),
        id: node.id || null,
        className: typeof node.className === 'string' ? node.className : null,
        visible: node.getClientRects().length > 0
      });
    }
    return {
      warning: 'inDom is SESSION-SPECIFIC. false means "not rendered here", not "does not exist".',
      bundleIds,
      modalIds: bundleIds.filter((row) => row.modal),
      inDomNow
    };
  }

  /* ── the run ───────────────────────────────────────────────────────────── */

  function scriptUrls() {
    const urls = new Set();
    for (const script of document.scripts) if (script.src) urls.add(script.src);
    for (const entry of performance.getEntriesByType('resource')) {
      if (/\.js(\?|$)/i.test(entry.name)) urls.add(entry.name);
    }
    return [...urls];
  }

  function styleUrls() {
    const urls = new Set();
    for (const link of document.querySelectorAll('link[rel="stylesheet"][href]')) {
      urls.add(link.href);
    }
    for (const entry of performance.getEntriesByType('resource')) {
      if (/\.css(\?|$)/i.test(entry.name)) urls.add(entry.name);
    }
    return [...urls];
  }

  /** Hashed filenames referenced from an already-fetched file - a lazy chunk this session skipped. */
  function referencedChunks(source, base) {
    const urls = new Set();
    for (const match of source.matchAll(/["'`]([\w.-]+\.[0-9a-f]{16,20}\.js)["'`]/g)) {
      try {
        urls.add(new URL(match[1], base).href);
      } catch {
        // A filename that is not resolvable against this origin is not a chunk.
      }
    }
    return [...urls];
  }

  const report = {
    capture: 'pull-everything',
    at: new Date().toISOString(),
    href: location.href,
    userAgent: navigator.userAgent,
    HOW_TO_READ_THIS_FILE: [
      'BUNDLE SECTIONS ARE AUTHORITATIVE. `bundle` was read out of the shipped JavaScript.',
      'Angular compiles every branch, icon, label and handler into main.*.js and serves the',
      'same bytes to every visitor, so `bundle` is identical for a member, a presenter/admin',
      'and a logged-out browser. A component missing from `bundle` really is missing.',
      '',
      'SESSION SECTIONS ARE NOT EVIDENCE OF ABSENCE. `session` was read out of THIS browser,',
      'as this role, with these panels open. An element absent from session.dom means this',
      'session did not render it - it does NOT mean the app lacks it. Ask `bundle` instead.',
      '',
      'PII: session.role.tokens[].payload is the decoded login JWT. Raw tokens are redacted.'
    ],
    bundle: {
      authoritative: true,
      assets: [],
      selectors: [],
      selectorSources: {},
      components: {},
      stylesheets: [],
      notes: []
    },
    session: {
      authoritative: false,
      role: null,
      dom: {},
      computed: [],
      ids: {}
    }
  };

  (async () => {
    const fetched = new Set();
    const queue = scriptUrls();
    report.bundle.notes.push(`${queue.length} scripts on the page`);

    while (queue.length) {
      const url = queue.shift();
      if (fetched.has(url)) continue;
      fetched.add(url);
      try {
        const response = await fetch(url, { credentials: 'same-origin' });
        const asset = { url, status: response.status, ok: response.ok, bytes: 0 };
        report.bundle.assets.push(asset);
        if (!response.ok) continue;
        const source = await response.text();
        asset.bytes = source.length;

        for (const chunk of referencedChunks(source, url)) {
          if (!fetched.has(chunk)) queue.push(chunk);
        }

        const found = extractBundle(source, url);
        asset.definitions = found.discovery.definitions;
        report.bundle.notes.push(...found.notes);
        for (const record of found.components) {
          const key = report.bundle.components[record.selector]
            ? `${record.selector}@${record.offsets.selector}`
            : record.selector;
          report.bundle.components[key] = record;
        }
        report.bundle.selectorSources[url] = found.discovery;
      } catch (cause) {
        report.bundle.assets.push({ url, error: String(cause) });
      }
    }

    report.bundle.selectors = Object.keys(report.bundle.components).sort();

    for (const url of styleUrls()) {
      try {
        const response = await fetch(url, { credentials: 'same-origin' });
        const text = response.ok ? await response.text() : '';
        report.bundle.stylesheets.push({ url, status: response.status, bytes: text.length, text });
      } catch (cause) {
        report.bundle.stylesheets.push({ url, error: String(cause) });
      }
    }

    report.session.role = readRole();
    const room = document.querySelector('app-room');
    report.session.dom = {
      warning: 'SESSION-SPECIFIC. Absence here is not absence in the app.',
      title: document.title,
      roomPresent: room !== null,
      roomBytes: room ? room.outerHTML.length : 0,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      documentHtml: document.documentElement.outerHTML
    };
    report.session.computed = readComputed(COMPUTED_TARGETS);
    report.session.ids = readIds(Object.values(report.bundle.components));

    const decoded = Object.values(report.bundle.components).reduce(
      (total, record) => total + record.constCount,
      0
    );
    const withCss = Object.values(report.bundle.components).filter((r) => r.cssBytes > 0).length;
    const parserOnly = new Set();
    const regexOnly = new Set();
    for (const discovery of Object.values(report.bundle.selectorSources)) {
      for (const name of discovery.onlyFoundByParser) parserOnly.add(name);
      for (const name of discovery.onlyFoundByRegex) regexOnly.add(name);
    }

    const name = `ptr-everything-${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = name;
    link.click();
    /*
      Revoke on a later turn, not synchronously.

      `URL.revokeObjectURL(href)` on the line after `click()` tears the blob down while the
      browser is still reading it. For a small file the read usually wins the race; this report is
      megabytes, and Chrome and Safari have both been observed to abort a download that large when
      the object URL is revoked in the same task. A timeout releases the memory without racing the
      reader.
    */
    setTimeout(() => URL.revokeObjectURL(href), 60_000);
    window.__ptrEverything = report;

    console.log(
      `[pull-everything] ${name}  (${(blob.size / 1024 / 1024).toFixed(1)} MB)\n` +
        `  BUNDLE (authoritative, same bytes for every role)\n` +
        `    assets      : ${report.bundle.assets.length} js, ${report.bundle.stylesheets.length} css\n` +
        `    definitions : ${report.bundle.selectors.length}\n` +
        `    consts      : ${decoded} entries decoded\n` +
        `    styles      : ${withCss} components ship scoped CSS\n` +
        `    parser-only : ${[...parserOnly].join(', ') || '(none)'}\n` +
        `    regex-only  : ${[...regexOnly].join(', ') || '(none)'}\n` +
        `  SESSION (this login only - NOT evidence of absence)\n` +
        `    perms       : ${report.session.role.perms ?? '(no token found)'}  isPresenter=${report.session.role.isPresenter}\n` +
        `    room in DOM : ${report.session.dom.roomPresent} (${report.session.dom.roomBytes} bytes)\n` +
        `    modal ids   : ${report.session.ids.modalIds.length} in bundle, ` +
        `${report.session.ids.modalIds.filter((row) => row.inDom).length} in this DOM\n` +
        `    all ids     : ${report.session.ids.bundleIds.length} in bundle, ` +
        `${report.session.ids.bundleIds.filter((row) => row.inDom).length} in this DOM\n` +
        (report.bundle.notes.length ? `  notes: ${report.bundle.notes.join(' | ')}\n` : '')
    );
    console.log('window.__ptrEverything is the same object.');

    return report;
  })();
})();
