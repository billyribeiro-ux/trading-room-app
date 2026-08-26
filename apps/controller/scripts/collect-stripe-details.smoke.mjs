#!/usr/bin/env node
/**
 * A smoke test for `collect-stripe-details.js`, with no dependencies.
 *
 * ## Why this exists
 *
 * That collector is pasted into a console on a LIVE production system by a human, once, and its
 * whole value is the file it downloads. A script that throws on line 3 wastes the trip; worse, one
 * that throws halfway writes a partial capture that LOOKS complete. `node --check` proves only that
 * it parses. This runs it.
 *
 * ## What it proves
 *
 * - PHASE 1 walks the `$parent` chain and finds `openStripeDetails` on an ancestor scope, recording
 *   how far up it lives — the single thing T5-15 needs.
 * - A `templateUrl` named inside the handler source is followed and fetched, and a SOFT 404 (this
 *   server answers missing files with HTTP **200** and a "not the page you are looking for" body) is
 *   recorded as a gap rather than as a successful capture.
 * - The denylist REFUSES a click it should refuse, and the refusal reaches the output.
 * - Redaction masks emails, Stripe ids and long digit runs to their SHAPE, in every string that
 *   reaches the file — including inside handler source and modal markup.
 * - Absences become entries in `gaps[]` instead of being filled in or silently skipped.
 * - It reaches the download step and produces parseable JSON.
 *
 * ## What it does NOT prove
 *
 * Anything about the real page. The DOM below is a hand-built stand-in with the SHAPES the collector
 * looks for, not the reference's markup. A selector that is subtly wrong for the live manage page
 * passes here and finds nothing there — which is exactly why the collector writes `gaps[]` rather
 * than assuming success.
 *
 * Run: node apps/controller/scripts/collect-stripe-details.smoke.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(HERE, 'collect-stripe-details.js');

/* ── the smallest DOM that exercises every branch ──────────────────────────── */

function el(tag, opts = {}) {
  const attrs = new Map(Object.entries(opts.attrs ?? {}));
  const node = {
    tagName: tag.toUpperCase(),
    children: opts.children ?? [],
    textContent: opts.text ?? '',
    clicked: 0,
    get id() {
      return attrs.get('id') ?? '';
    },
    get className() {
      return attrs.get('class') ?? '';
    },
    get attributes() {
      return [...attrs].map(([name, value]) => ({ name, value }));
    },
    get outerHTML() {
      return `<${tag} class="${attrs.get('class') ?? ''}">${node.textContent}</${tag}>`;
    },
    getAttribute: (n) => (attrs.has(n) ? attrs.get(n) : null),
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 100, height: opts.height ?? 20 }),
    matches: (sel) => (opts.matches ?? []).includes(sel),
    click() {
      node.clicked++;
      if (opts.onClick) opts.onClick();
    },
    querySelector: (sel) => descendants(node).find((d) => (d._sel ?? []).includes(sel)) ?? null,
    querySelectorAll: (sel) => descendants(node).filter((d) => (d._sel ?? []).includes(sel)),
    _sel: opts.sel ?? []
  };
  for (const c of node.children) c.parentElement = node;
  return node;
}

function descendants(node) {
  const out = [];
  for (const c of node.children ?? []) {
    out.push(c, ...descendants(c));
  }
  return out;
}

/*
  The fixture is a FUNCTION so the collector can be run twice against two different pages. The second
  run is what actually exercises the denylist: a Details link whose handler is named
  `openStripeDetailsAndSendReceipt` must be REFUSED on the word `send`, and the modal must not be
  captured. Without that second run, the guard is asserted rather than tested — which is the same
  mistake as a contract test whose negative control was never run.
*/
function buildPage({ detailsNgClick = 'openStripeDetails(user)', detailsText = 'Details' } = {}) {
  const detailsLink = el('a', {
    text: detailsText,
    attrs: { class: 'label label-info', 'ng-click': detailsNgClick, href: '' },
    sel: ['a'],
    matches: ['.label-info']
  });

  const stripeBlock = el('div', {
    attrs: { class: 'stripe-mini mb-xs', style: 'margin-top:4px' },
    children: [detailsLink],
    sel: ['.stripe-mini'],
    matches: ['.label']
  });

  const state = { dialogOpen: false };
  detailsLink.click = function () {
    this.clicked = (this.clicked ?? 0) + 1;
    state.dialogOpen = true;
  };

  const dialog = el('div', {
    attrs: { class: 'modal in', role: 'dialog' },
    height: 400,
    /* Real-looking PII, so redaction is proven on content rather than asserted on a helper. */
    text: 'Customer ada@example.com — cus_Qa1B2c3D4e5F6g sub_9Zy8Xw7Vu6Ts5R — card 4242424242424242',
    sel: ['.modal', '[role="dialog"]']
  });

  const row = el('tr', {
    attrs: { 'ng-repeat': 'user in xrefs' },
    children: [stripeBlock],
    sel: ['tr[ng-repeat]', 'tbody tr']
  });
  const table = el('table', { attrs: { class: 'table table-striped' }, children: [row], sel: ['table.table-striped'] });
  const body = el('body', { children: [table] });
  /* The download step appends and removes the anchor; the stub DOM needs both. */
  body.appendChild = () => {};
  body.removeChild = () => {};
  body.innerText = 'Extra Admin Users\nActions With Selected\nUser List Actions';

  return { detailsLink, stripeBlock, dialog, row, table, body, state };
}

/* ── the fake Angular scope chain ──────────────────────────────────────────── */

/*
  `openStripeDetails` is deliberately TWO scopes up from the row, not on it. The collector must walk
  `$parent` to find it; a version that only reads the row's own scope passes a test where the handler
  sits on the row and fails on the real page.
*/
const rootScope = {
  $id: 1,
  $parent: null,
  openStripeDetails(user) {
    return this.$modal.open({ templateUrl: 'views/modal.stripeDetails.html', scope: user });
  },
  getStripeStatusClass: (s) => (!s ? 'label-default' : 'label-info'),
  stripeCustomerEmail: 'owner@example.com'
};
const midScope = { $id: 2, $parent: rootScope, formatStripeAmount: (a) => String(a / 100) };
const rowScope = { $id: 3, $parent: midScope, marketplaceCount: 1 };

/* ── the sandbox ───────────────────────────────────────────────────────────── */

async function runCollector(pageOptions = {}) {
  const page = buildPage(pageOptions);
  let downloaded = null;
  let fetches = 0;

  const sandbox = {
    console: { log() {}, warn() {}, error() {} },
    setTimeout: (fn) => fn(),
    Blob: class {
      constructor(parts) {
        downloaded = parts.join('');
      }
    },
    URL: Object.assign(class extends globalThis.URL {}, { createObjectURL: () => 'blob:stub', revokeObjectURL() {} }),
    location: { href: 'https://protradingroom.com/#/manage/3625', origin: 'https://protradingroom.com' },
    navigator: { userAgent: 'smoke' },
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
    getComputedStyle: () => ({ getPropertyValue: (p) => `stub-${p}` }),
    async fetch(url) {
      /* The SOFT 404 this server actually serves: HTTP 200 with a 52-byte body. The collector must
         record it as a gap, not as a fetched template. */
      fetches++;
      assert.ok(String(url).includes('modal.stripeDetails.html'), `unexpected fetch: ${url}`);
      return {
        ok: true,
        status: 200,
        text: async () => '<h3>this is not the page you are looking for...</h3>'
      };
    },
    document: {
      body: page.body,
      styleSheets: [
        {
          href: 'https://protradingroom.com/styles.css',
          cssRules: [{ selectorText: '.label', style: { cssText: 'color: #fff' } }]
        },
        /* A cross-origin sheet: reading `cssRules` throws, and that must be counted, not fatal. */
        {
          href: 'https://cdn.example.com/x.css',
          get cssRules() {
            throw new Error('cross-origin');
          }
        }
      ],
      querySelector(sel) {
        if (sel.includes('stripe-mini')) return page.stripeBlock;
        if (sel.includes('tr[ng-repeat]')) return page.row;
        if (sel.includes('table.table-striped')) return page.table;
        return null;
      },
      querySelectorAll(sel) {
        if (sel.includes('dialog') || sel.includes('modal')) return page.state.dialogOpen ? [page.dialog] : [];
        return [];
      },
      createElement: () => ({ click() {}, set href(_) {}, set download(_) {} })
    },
    angular: {
      version: { full: '1.3.15' },
      element: () => ({ scope: () => rowScope })
    }
  };
  sandbox.window = sandbox;

  runInContext(readFileSync(SOURCE, 'utf8'), createContext(sandbox), { filename: SOURCE });

  /* The collector is an async IIFE; let its microtasks and the fetch settle. */
  for (let k = 0; k < 6; k++) await new Promise((r) => setImmediate(r));

  assert.ok(downloaded, 'the collector must reach the download step');
  return { out: JSON.parse(downloaded), page, fetches };
}

/* ── RUN 1: the normal page ────────────────────────────────────────────────── */

const { out, page, fetches } = await runCollector();
assert.equal(fetches, 1, 'exactly one template fetch — the one the handler names');

// PHASE 1 — the finding
assert.equal(out.handlers.openStripeDetails.found, true, 'openStripeDetails must be found');
assert.equal(
  out.handlers.openStripeDetails.definedOnScopeDepth,
  2,
  'it lives two scopes up; a collector that only reads the row scope would report 0 and find nothing on the real page'
);
assert.match(out.handlers.openStripeDetails.source, /modal\.stripeDetails\.html/);
assert.equal(out.summary.handlerFound, true);
assert.match(out.summary.verdict, /CLOSED/);

// the sibling handlers, which are the control on the transcription method
assert.equal(out.handlers.getStripeStatusClass.found, true);
assert.equal(out.handlers.formatStripeAmount.found, true, 'must be found one scope up');
assert.equal(out.handlers.formatStripeAmount.definedOnScopeDepth, 1);

// enumeration, for when the expected name is absent
const keys = out.handlers.scopeKeysMatchingStripe.map((k) => k.key);
assert.ok(keys.includes('stripeCustomerEmail'), 'scope keys matching /stripe/i must be enumerated');
assert.ok(keys.includes('marketplaceCount'));

// templateUrl followed, and the SOFT 404 recorded honestly
assert.equal(out.templatesFetched.length, 1, 'the templateUrl named in the source must be followed');
assert.equal(out.templatesFetched[0].softNotFound, true);
assert.equal(out.templatesFetched[0].ok, false, 'a soft 404 is NOT a successful capture');
assert.equal(out.templatesFetched[0].text, null, 'the 404 body must not be stored as if it were the template');

// the soft 404 is a GAP, where gaps are actually read — not just a flag in templatesFetched
assert.ok(
  out.gaps.some((g) => /NOT deployed/.test(g.what) && /modal\.stripeDetails\.html/.test(g.what)),
  'a soft-404 on the modal template must be recorded in gaps[]'
);

// nothing was refused on a clean page, and exactly one thing was clicked
assert.equal(out.refusedClicks.length, 0, 'a page with only the Details link has nothing to refuse');
assert.equal(page.detailsLink.clicked, 1, 'the Details link is clicked exactly once');

// PHASE 2 — the rendered block, and the inert-class proof
assert.ok(out.stripeBlock, 'the rendered .stripe-mini block must be captured');
assert.match(out.stripeBlock.inertClassCheck['stripe-mini'], /no matching rule/);
assert.match(out.stripeBlock.inertClassCheck['mb-xs'], /no matching rule/);

// PHASE 3 — the modal
assert.ok(out.modal?.dialog, 'the modal must be captured after the click');
assert.equal(out.summary.modalCaptured, true);

// REDACTION — proven on the modal's real-looking content, not on a helper in isolation
const modalText = JSON.stringify(out.modal);
assert.ok(!modalText.includes('ada@example.com'), 'an email must never reach the file');
assert.ok(!modalText.includes('cus_Qa1B2c3D4e5F6g'), 'a Stripe customer id must never reach the file');
assert.ok(!modalText.includes('4242424242424242'), 'a card-shaped digit run must never reach the file');
assert.match(modalText, /«email \d+ chars»/, 'redaction must preserve SHAPE, not blank the value');
assert.match(modalText, /«cus_id \d+ chars»/);
assert.match(modalText, /«digits 16»/);

// cross-origin stylesheet counted, not fatal
assert.ok(
  out.notes.some((n) => /cross-origin/.test(n)),
  'an unreadable stylesheet must be recorded'
);

/* ── RUN 2: the denylist, actually exercised ───────────────────────────────── */

/*
  The guard is the whole safety story of this script, and a guard that is only described is a guard
  that has never been tested. Same page, one difference: the Details handler is named
  `openStripeDetailsAndSendReceipt`, so `send` matches. The click must be REFUSED, the refusal must
  reach the output, and no modal must be captured.
*/
const denied = await runCollector({ detailsNgClick: 'openStripeDetailsAndSendReceipt(user)' });

assert.equal(denied.page.detailsLink.clicked, 0, 'a denied element must never be clicked');
assert.equal(denied.out.refusedClicks.length, 1, 'the refusal must be recorded, not silently skipped');
assert.equal(denied.out.refusedClicks[0].matched, 'Send', 'the refusal must name the word that matched');
assert.equal(denied.out.refusedClicks[0].ngClick, 'openStripeDetailsAndSendReceipt(user)');
assert.equal(denied.out.summary.modalCaptured, false, 'no modal is captured when the click is refused');

/*
  And the handler read is UNAFFECTED — PHASE 1 needs no click at all, so a refused click costs the
  corroboration and not the finding. This is the property that makes the script safe to run on a
  production page.
*/
assert.equal(denied.out.handlers.openStripeDetails.found, true);
assert.match(denied.out.summary.verdict, /CLOSED/);

console.log(
  `collect-stripe-details smoke: OK — handler found ${out.handlers.openStripeDetails.definedOnScopeDepth} scope(s) up; ` +
    `soft-404 in gaps[]; denylist refused "${denied.out.refusedClicks[0].matched}" and left the finding intact; ` +
    `redaction verified on 3 PII shapes`
);
