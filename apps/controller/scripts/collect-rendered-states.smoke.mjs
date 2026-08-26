#!/usr/bin/env node
/**
 * A smoke test for `collect-rendered-states.js`, with no dependencies.
 *
 * That collector is pasted into a console on a LIVE production site by a human, once, and its whole
 * value is the two files it downloads. `node --check` proves only that it parses. This runs it.
 *
 * ## What it proves
 *
 * - T2-7: it measures every `tbody > tr`, records the `nth-of-type` index and whether the row is
 *   HIDDEN, and separates `:hover` rules from stripe rules. Hidden rows must still be counted —
 *   they keep their nth-of-type position, which is why a filtered table bands irregularly (T5-12).
 * - `:hover` rules are found by matching the element against the selector with the pseudo-class
 *   STRIPPED. A synthetic MouseEvent does not trigger `:hover`, so an unstripped `el.matches()`
 *   returns false and the rule that actually governs the hover is silently missed.
 * - T2-20: dialog handlers are read off the `$parent` chain, not just the local scope.
 * - T2-22: the login form is captured and NOTHING is typed or submitted.
 * - Absences become entries in `gaps[]`; a thin table is reported rather than passed off as enough.
 * - PII is redacted to its SHAPE in everything written.
 * - BOTH downloads happen — the automatic one and the watcher's.
 *
 * Run: node apps/controller/scripts/collect-rendered-states.smoke.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(HERE, 'collect-rendered-states.js');

function el(tag, opts = {}) {
  const attrs = new Map(Object.entries(opts.attrs ?? {}));
  const node = {
    tagName: tag.toUpperCase(),
    children: opts.children ?? [],
    textContent: opts.text ?? '',
    get className() {
      return attrs.get('class') ?? '';
    },
    get id() {
      return attrs.get('id') ?? '';
    },
    get attributes() {
      return [...attrs].map(([name, value]) => ({ name, value }));
    },
    get outerHTML() {
      return `<${tag} class="${attrs.get('class') ?? ''}">${node.textContent}</${tag}>`;
    },
    getAttribute: (n) => (attrs.has(n) ? attrs.get(n) : null),
    hasAttribute: (n) => attrs.has(n),
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 900, height: opts.height ?? 32 }),
    matches: (sel) => (opts.matches ?? []).includes(sel.trim()),
    click() {
      node.clicked = (node.clicked ?? 0) + 1;
    },
    querySelector: (sel) => descend(node).find((d) => (d._sel ?? []).includes(sel)) ?? null,
    querySelectorAll: (sel) => descend(node).filter((d) => (d._sel ?? []).includes(sel)),
    _sel: opts.sel ?? [],
    _hiddenStyle: opts.hiddenStyle ?? false
  };
  return node;
}
const descend = (n) => (n.children ?? []).flatMap((c) => [c, ...descend(c)]);

/* Four rows: two visible, one `hidden`, one ng-hide — the pattern T5-12 is about. */
const rows = [
  /*
    Row 0 is `nth-of-type(1)` — ODD — so on a real page it matches BOTH the stripe selector and the
    hover one. The stub compares selector strings exactly, where a browser evaluates them, so both
    have to be listed here. `:hover` is absent from the list on purpose: the collector strips that
    pseudo-class before matching, which is the behaviour under test.
  */
  el('tr', {
    sel: [':scope > tbody > tr'],
    matches: ['.acc-table > tbody > tr', '.acc-table > tbody > tr:nth-of-type(odd)']
  }),
  el('tr', { sel: [':scope > tbody > tr'], attrs: { hidden: '' } }),
  el('tr', { sel: [':scope > tbody > tr'], attrs: { class: 'ng-hide' } }),
  el('tr', { sel: [':scope > tbody > tr'], text: 'ada@example.com — 4242424242424242' })
];
const table = el('table', { attrs: { class: 'table table-striped acc-table' }, children: rows, sel: ['table'] });

const pwInput = el('input', {
  attrs: { type: 'password', name: 'pw' },
  sel: ['input, select, textarea, button, label, a', 'input[type="password"]']
});
const loginForm = el('form', {
  attrs: { name: 'loginForm', class: 'form-signin' },
  /* Real-looking PII where the collector DOES capture text, so redaction is proven on output rather
     than asserted on a helper in isolation. */
  text: 'Signed in as ada@example.com — ref 4242424242424242',
  children: [pwInput],
  sel: ['form', 'form[name="loginForm"], form#loginForm']
});

const body = el('body', { children: [table, loginForm] });
body.innerText = 'Sign in to your room';
body.appendChild = () => {};
body.removeChild = () => {};

/* openStripeDetails lives TWO scopes up — the collector must walk $parent. */
const root = { $id: 1, $parent: null, openStripeDetails() {}, manageBadges() {} };
const mid = { $id: 2, $parent: root, setNoteUser() {} };
const local = { $id: 3, $parent: mid };

const downloads = [];
const timers = [];

const sandbox = {
  console: { log() {}, warn() {}, error() {} },
  setTimeout: (fn, ms) => timers.push({ fn, ms }),
  MutationObserver: class {
    observe() {}
    disconnect() {
      this.disconnected = true;
    }
  },
  WeakSet,
  Blob: class {
    constructor(parts) {
      downloads.push(parts.join(''));
    }
  },
  URL: Object.assign(class extends globalThis.URL {}, {
    createObjectURL: () => 'blob:stub',
    revokeObjectURL() {}
  }),
  location: { href: 'https://protradingroom.com/#/page/welcome' },
  navigator: { userAgent: 'smoke' },
  window: null,
  Date,
  Set,
  Map,
  Object,
  Array,
  JSON,
  String,
  Number,
  Boolean,
  RegExp,
  Error,
  Promise,
  Math,
  getComputedStyle: (node) => ({
    getPropertyValue: (p) => (p === 'background-color' ? 'rgb(249, 249, 249)' : `stub-${p}`),
    display: node?._hiddenStyle ? 'none' : 'block'
  }),
  document: {
    body,
    styleSheets: [
      {
        href: 'https://protradingroom.com/styles.css',
        cssRules: [
          {
            selectorText: '.acc-table > tbody > tr:nth-of-type(odd)',
            style: { cssText: 'background-color: rgb(249,249,249)' }
          },
          /* The one that only matches once `:hover` is stripped. */
          { selectorText: '.acc-table > tbody > tr:hover', style: { cssText: 'background-color: rgb(245,245,245)' } }
        ]
      },
      {
        href: 'https://cdn.example.com/x.css',
        get cssRules() {
          throw new Error('cross-origin');
        }
      }
    ],
    querySelector(sel) {
      if (sel.includes('loginForm')) return loginForm;
      if (sel.includes('ng-controller')) return body;
      return null;
    },
    querySelectorAll(sel) {
      if (sel === 'table') return [table];
      if (sel.includes('bootbox') || sel.includes('dialog')) return [];
      if (sel.includes('alert-danger')) return [];
      return [];
    },
    createElement: () => ({ click() {}, set href(_) {}, set download(_) {} })
  },
  angular: { version: { full: '1.3.15' }, element: () => ({ scope: () => local }) }
};
sandbox.window = sandbox;

runInContext(readFileSync(SOURCE, 'utf8'), createContext(sandbox), { filename: SOURCE });
for (let i = 0; i < 8; i++) await new Promise((r) => setImmediate(r));

/* ── the automatic file ──────────────────────────────────────────────────── */

assert.equal(downloads.length, 1, 'the automatic download must happen immediately');
const auto = JSON.parse(downloads[0]);

// T2-7
assert.ok(auto.striping, 'a striped table must be measured');
const t = auto.striping[0];
assert.equal(t.rowCount, 4);
assert.deepEqual(
  t.rows.map((r) => r.nthOfType),
  [1, 2, 3, 4],
  'nth-of-type is 1-based and counts EVERY row'
);
assert.deepEqual(
  t.rows.map((r) => r.odd),
  [true, false, true, false]
);
assert.deepEqual(
  t.rows.map((r) => r.hidden),
  [false, true, true, false],
  'hidden rows must be recorded as hidden AND still counted — that is the T5-12 artifact'
);
assert.equal(t.hoverRules.length, 1, ':hover rules must be found by stripping the pseudo-class before matching');
assert.match(t.hoverRules[0].selector, /:hover/);
assert.equal(t.stripeRules.length, 1);

/*
  The BOUNDARY. The register asks for 2+ rooms and 4+ users, so the collector gaps below four rows
  and is silent at four. The fixture has exactly four — the first value that must NOT gap.

  Asserted in this direction deliberately: the first version of this checked that a gap WAS recorded,
  which would have passed only if the threshold were wrong.
*/
assert.ok(
  !auto.gaps.some((g) => /row\(s\) on screen/.test(g.what)),
  'four rows meets the register’s bar and must NOT be reported as thin'
);

// T2-20 — the $parent walk
assert.equal(auto.bootbox.handlers.openStripeDetails.found, true);
assert.equal(auto.bootbox.handlers.openStripeDetails.scopeDepth, 2, 'must walk two scopes up, not read the local one');
assert.equal(auto.bootbox.handlers.setNoteUser.scopeDepth, 1);
assert.equal(auto.bootbox.handlers.doBatchInvite.found, false, 'an absent handler is recorded as absent');

// T2-22
assert.ok(auto.login, 'the login form must be captured');
assert.equal(auto.login.form.attrs.name, 'loginForm');
assert.equal(pwInput.clicked, undefined, 'nothing may be clicked');
assert.ok(
  auto.gaps.some((g) => /failed-login ERROR state is not captured/.test(g.what)),
  'the error state must be declared missing, not faked'
);

/*
  The striping phase captures NO row text — only index, visibility, background and height. That is
  deliberate and worth pinning: a room's table rows are full of real names and addresses, and a
  geometry capture has no use for them. Asserted so nobody "improves" it by adding a text field.
*/
assert.ok(
  t.rows.every((r) => !('text' in r)),
  'striping rows must carry geometry only — never row text'
);

// redaction, proven where text IS captured
const blob = JSON.stringify(auto);
assert.ok(!blob.includes('ada@example.com'), 'an email must never reach the file');
assert.ok(!blob.includes('4242424242424242'), 'a long digit run must never reach the file');
assert.match(blob, /«email \d+ chars»/);
assert.match(blob, /«digits 16»/);

// cross-origin sheet counted, not fatal
assert.ok(auto.notes.some((n) => /cross-origin/.test(n)));

/* ── the watcher's file ──────────────────────────────────────────────────── */

assert.equal(timers.length, 1, 'the watcher must arm exactly one timer');
assert.equal(timers[0].ms, 120_000, 'the window is two minutes');
timers[0].fn();

assert.equal(downloads.length, 2, 'the watcher must download a second file when it stops');
const watched = JSON.parse(downloads[1]);
assert.equal(watched.summary.dialogsObserved, 0);
assert.equal(watched.summary.errorsObserved, 0);
assert.ok(
  watched.gaps.some((g) => /No dialog opened/.test(g.what)),
  'an empty watch window must be recorded as a gap, not as success'
);
assert.ok(watched.gaps.some((g) => /No error state appeared/.test(g.what)));
assert.ok(watched.watchEndedAt, 'the second file must record when watching stopped');

console.log(
  `collect-rendered-states smoke: OK — 4 rows measured with hidden ones counted, ` +
    `:hover rule found via pseudo-strip, handler found 2 scopes up, ` +
    `login form captured with 0 clicks, ${watched.gaps.length} honest gaps, both downloads fired`
);
