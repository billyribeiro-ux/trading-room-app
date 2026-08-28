#!/usr/bin/env node
/**
 * A smoke test for `collect-control-plane.js`, with no dependencies.
 *
 * ## Why this exists
 *
 * That collector is pasted into a console on a LIVE system by a human, once, and its whole value is
 * the file it downloads. A script that throws on line 3 wastes the trip; one that throws halfway
 * writes a partial capture that LOOKS complete. `node --check` only proves it parses. This runs it.
 *
 * ## What it proves
 *
 * 1. It executes top to bottom against a DOM and reaches the download step.
 * 2. It reads a ui-router state table and records the router it actually used.
 * 3. **The census negative control works.** Run B gives it surfaces where the positive controls
 *    cannot hit, and asserts the script marks its own census untrustworthy and says so in `gaps`.
 *    This is the property the whole design rests on: a broken search must not be able to emit
 *    twelve honest-looking zeroes.
 * 4. **The guard actually refuses**, exercised rather than described, and by the ONE path that
 *    isolates it. Run C hands the collector an element with `class="…deleteApiKeyBtn"` and NO
 *    `ng-click`, so neither the handler clause nor a bare `\bdelete\b` can refuse it — the `\b`
 *    after `delete` needs a non-word character and finds `A`. Only `splitCamel` catches it.
 *
 *    Run A's element carries an `ng-click` instead, which proves the handler clause. That was
 *    originally the whole guard assertion, and a negative control showed it still passed with
 *    `splitCamel` deleted: the handler clause was doing all the work and the camelCase fix — the
 *    one documented in `collect-manage-gaps.js` as a real hole present on every earlier run — was
 *    untested. Hence run C. Both negative controls have been run; run C goes red on its own.
 * 5. **The verdict cannot claim non-existence.** Asserted against the emitted string, because that
 *    sentence is the one thing from this capture anybody will quote.
 *
 * ## What it does NOT prove
 *
 * Anything about the real page. The DOM below is a hand-built stand-in with the SHAPES the
 * collector looks for, not the reference's markup. `queryAll` deliberately does not support
 * descendant selectors, so several of the collector's perfectly correct queries match nothing here
 * and the run reports panes as absent. That is a limit of this stub, not a finding — which is
 * exactly why the collector writes `gaps[]` instead of assuming success.
 *
 * Run: node apps/controller/scripts/collect-control-plane.smoke.mjs
 */
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = resolve(HERE, 'collect-control-plane.js');
const CODE = readFileSync(SOURCE, 'utf8');

/* ── the smallest DOM that exercises every branch ─────────────────────────── */

function makeElement(tag, { attrs = {}, text = '', children = [], html = null } = {}) {
  const map = new Map(Object.entries(attrs));
  const element = {
    tagName: tag.toUpperCase(),
    children,
    textContent: text,
    clickCount: 0,
    get id() {
      return map.get('id') ?? '';
    },
    get className() {
      return map.get('class') ?? '';
    },
    get attributes() {
      return [...map].map(([name, value]) => ({ name, value }));
    },
    get outerHTML() {
      return html ?? `<${tag}>${text}</${tag}>`;
    },
    getAttribute: (name) => (map.has(name) ? map.get(name) : null),
    setAttribute: (name, value) => map.set(name, value),
    matches: () => false,
    closest: () => null,
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 120, height: 24 }),
    click() {
      element.clickCount += 1;
    },
    querySelector: (s) => queryAll(children, s)[0] ?? null,
    querySelectorAll: (s) => queryAll(children, s)
  };
  return element;
}

/**
 * Deliberately crude: tag, `.class`, `[attr]`, and `[attr=]` / `[attr*=]` / `[attr^=]` / `[attr$=]`.
 *
 * **No descendant support.** `nav a` matches nothing here, which is correct for this stub and
 * wrong for a browser. Do not "fix" the collector because a pane comes back null in this run.
 */
function queryAll(pool, selector) {
  const flat = [];
  const walk = (nodes) => {
    for (const node of nodes) {
      flat.push(node);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(pool);

  const parts = selector.split(',').map((p) => p.trim());
  const hit = (node, part) => {
    if (part.includes(' ')) return false; /* descendant — unsupported, see the note above */
    const attr = part.match(/^([a-zA-Z*]*)\[([a-zA-Z-]+)(?:([*^$]?=)"?([^"\]]*)"?)?\]$/);
    if (attr) {
      const [, tag, name, op, value] = attr;
      if (tag && tag !== '*' && node.tagName !== tag.toUpperCase()) return false;
      const actual = node.getAttribute(name);
      if (actual === null) return false;
      if (!op) return true;
      if (op === '=') return actual === value;
      if (op === '*=') return actual.includes(value);
      /* `^=` is not decoration: the collector finds the reveal control with
         [ng-click^="showNewRoom=showNewRoom+1"], and without this the stub silently fell through to
         the text fallback and run D failed on an artefact of this file rather than the collector. */
      if (op === '^=') return actual.startsWith(value);
      if (op === '$=') return actual.endsWith(value);
      return false;
    }
    if (part.startsWith('.')) return String(node.className).split(/\s+/).includes(part.slice(1));
    return node.tagName === part.toUpperCase();
  };
  return flat.filter((node) => parts.some((part) => hit(node, part)));
}

/* ── the four runs ────────────────────────────────────────────────────────── */

function buildContext({ healthy, camelOnly = false, exemptClick = false }) {
  /*
    Run A registers states whose names contain the census control words, so the controls hit.
    Run B registers a single state with none of them, so every control returns zero and the
    collector must mark its own census untrustworthy.
  */
  const states = healthy
    ? [
        { name: 'page', url: '/page', abstract: true },
        { name: 'page.welcome', url: '/welcome', templateUrl: 'views/page.welcome.html', controller: 'WelcomeCtrl' },
        { name: 'page.manageSession', url: '/manageSession', templateUrl: 'views/page.manageSession.html' },
        { name: 'page.room', url: '/room/:id', controller: 'RoomCtrl' },
        { name: 'page.user', url: '/user', controller: 'UserCtrl' }
      ]
    : [{ name: 'x', url: '/x' }];

  /*
    The one element the collector ever clicks.

    Three shapes, and the third is the one that matters:

      healthy            → carries `ng-click`, so the handler clause refuses it
      camelOnly          → carries NO handler, only a camelCase class. `splitCamel` is then the
                           ONLY thing that can refuse it, which is what run C exists to prove.
      neither            → clean, so the click is delivered

    Run C exists because the first version of this test asserted the guard using the `healthy`
    shape, and a negative control showed the assertion still passed with `splitCamel` DELETED — the
    handler clause was doing all the work and the camelCase fix was untested. A guard assertion that
    survives the removal of the guard is not an assertion.
  */
  const sessionsLabel = makeElement('h4', {
    text: 'Sessions',
    attrs: exemptClick
      ? { 'ng-click': 'showNewRoom=showNewRoom+1;' }
      : camelOnly
        ? { class: 'panel-heading deleteApiKeyBtn' }
        : healthy
          ? { 'ng-click': 'deleteApiKey(k)' }
          : {}
  });

  const body = makeElement('body', {
    text: 'Sessions ada@example.com',
    children: [
      sessionsLabel,
      makeElement('a', { text: 'New Room', attrs: { href: '#/new' } }),
      /*
        The Launch link, carrying a REAL-SHAPED site token.

        The 06:47 live run wrote 8 live JWTs into the downloaded file through exactly this element:
        ng-href="/session?id={{s.uuid}}&jwtSite={{tokSite}}" (views/page.welcome.html:379-381).
        Redaction was written against emails and hex, and a base64url token matched neither.

        ## Its payload decodes to PLACEHOLDERS, and that is not cosmetic

        This fixture used the jwt.io example token, whose payload decodes to
        {"sub":"1234567890","name":"Ada Lovelace"}. Synthetic, published, nobody's data — and
        `privacy:verify` flagged it anyway, correctly by its own rule: `countEncodedIdentityPayloads`
        base64url-decodes every `eyJ…` run in every tracked file and reports one carrying an identity
        CLAIM, because it cannot tell a famous example payload from a live one and must not try.

        **That failure was real and it was standing.** `pnpm test` was red on `main` on this line
        alone — not in CI, which runs the controller's `test:unit` and deliberately leaves the
        evidence verifiers to the pre-merge full gate, so nothing announced it. Fixed 2026-08-28.

        The payload is now {"sub":"[OWNER_JWT_SUB]","name":"[OWNER_JWT_NAME]"} — the same bracketed
        convention every redacted capture in `evidence-dumps/` uses, and the exact shape the
        verifier's own negative lookahead treats as already-redacted.

        **The token is still a literal, and still three real base64url segments.** The alternative
        was to assemble it from fragments so no `eyJ…` run appears in the source, which is what
        `verify-privacy-boundary.mjs` does for the literals it rejects. Rejected here: it would make
        the scanner blind to a genuinely live token pasted in the same split form, and this fixture
        exists to prove the collector catches tokens by SHAPE. The shape has to survive; only the
        claims had to go.
      */
      makeElement('a', {
        /* 400 chars, so `text` (capped at 300) truncates and must SAY it truncated. */
        text: 'Manage ' + 'x'.repeat(400),
        attrs: {
          href: '#/page/manageSession/652882112ad80b3e7c5132d5?jwtSite=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJbT1dORVJfSldUX1NVQl0iLCJuYW1lIjoiW09XTkVSX0pXVF9OQU1FXSJ9.dBjftJeZ4CVPmB92K27uhbUJU1p1r_wW1gFWFOEjXkw'
        }
      }),
      makeElement('a', { text: 'Suspend Account', attrs: { title: 'Suspend Account' } }),
      makeElement('div', { attrs: { 'ui-view': '' } }),
      makeElement('a', { attrs: { 'ui-sref': 'page.welcome' }, text: 'Account' }),
      makeElement('button', { attrs: { 'ng-click': 'manageApiKeyRestrictions(k)' }, text: 'restrictions' })
    ]
  });

  const documentElement = makeElement('html', {
    children: [body],
    attrs: { 'ng-app': 'app' },
    html: '<html><body>Sessions</body></html>'
  });
  /* The collector reads `document.documentElement.outerHTML` as the `dom` census surface. In run B
     it must carry none of the control words. */
  Object.defineProperty(documentElement, 'outerHTML', {
    get: () => (healthy ? '<html>session user room</html>' : '<html>zzz</html>')
  });

  const allNodes = [documentElement, body, ...body.children];

  const document = {
    documentElement,
    body,
    querySelector: (s) => queryAll(allNodes, s)[0] ?? null,
    querySelectorAll: (s) => queryAll(allNodes, s),
    createElement: () => ({ href: '', download: '', click() {} }),
    styleSheets: [{ href: 'https://example.test/app.css', cssRules: [] }]
  };

  const modules = {
    app: { requires: ['ui.router', 'toaster'] },
    'ui.router': { requires: [] },
    toaster: { requires: [] }
  };

  let downloaded = null;
  const context = {
    console: { log: () => {}, warn: () => {} },
    setTimeout: (fn) => fn(),
    Date,
    JSON,
    Math,
    Object,
    Array,
    String,
    Set,
    Promise,
    RegExp,
    document,
    location: { href: 'https://protradingroom.com/#/page/welcome', origin: 'https://protradingroom.com' },
    navigator: { userAgent: 'smoke' },
    innerWidth: 1440,
    innerHeight: 900,
    devicePixelRatio: 2,
    getComputedStyle: () => ({ getPropertyValue: () => '' }),
    Blob: class {
      constructor(parts) {
        downloaded = parts[0];
      }
    },
    URL: { createObjectURL: () => 'blob:stub', revokeObjectURL() {} },
    angular: {
      element: () => ({
        injector: () => ({
          get: (name) => {
            if (name === '$state') return { get: () => states };
            return null;
          }
        })
      }),
      module: (name) => {
        if (!modules[name]) throw new Error('unknown module ' + name);
        return modules[name];
      }
    },
    result: () => downloaded
  };
  context.window = context;
  return context;
}

async function run({ healthy, camelOnly = false, exemptClick = false }) {
  const context = createContext(buildContext({ healthy, camelOnly, exemptClick }));
  runInContext(CODE, context, { filename: SOURCE });
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  await new Promise((r) => setImmediate(r));
  const raw = context.result();
  if (!raw) throw new Error(`run(healthy=${healthy}) never reached the download step`);
  return { out: JSON.parse(raw), raw, context };
}

/* ── assertions ───────────────────────────────────────────────────────────── */

const failures = [];
const check = (label, condition, detail = '') => {
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failures.push(`${label}${detail ? ' — ' + detail : ''}`);
    console.log(`  FAIL ${label}${detail ? ' — ' + detail : ''}`);
  }
};

console.log('collect-control-plane.js — smoke\n');

console.log('run A: a healthy page');
const { out: a, raw: aRaw } = await run({ healthy: true });

check('reached the download step', !!a);
check('detected ui-router', a.router.kind === 'ui-router', `got ${a.router.kind}`);
check('read the state table', a.states.length === 5, `got ${a.states.length}`);
check(
  'recorded templateUrl',
  a.states.some((s) => s.templateUrl === 'views/page.welcome.html')
);
check('walked the module graph', Object.keys(a.modules).length === 3, `got ${Object.keys(a.modules).join(',')}`);
check('census marked trustworthy', a.census.trustworthy === true);
check(
  'positive controls hit',
  Object.values(a.census.controls).every((r) => r.total > 0)
);

/* The handler clause: the label carries ng-click="deleteApiKey(k)". */
check(
  'REFUSED to click an element carrying a handler',
  a.refusedClicks.length >= 1,
  `refusedClicks=${a.refusedClicks.length}`
);
check(
  'refusal names the reason',
  a.refusedClicks.every((r) => typeof r.matched === 'string' && r.matched.length > 0)
);

/* The verdict is the sentence that gets quoted. It must never claim non-existence. */
const FORBIDDEN_CLAIMS = /does not exist|no operator console exists|there is none|proves there is no/i;
check('verdict never claims non-existence', !FORBIDDEN_CLAIMS.test(a.verdict.statement), a.verdict.statement);
check(
  'verdict is scoped to this build and this account',
  /THIS BUILD|this build|this account|INCONCLUSIVE/.test(a.verdict.statement)
);

console.log('\nrun B: surfaces where the positive controls CANNOT hit');
const { out: b } = await run({ healthy: false });

check('census marked UNtrustworthy', b.census.trustworthy === false);
check(
  'recorded a gap saying the census is broken',
  b.gaps.some((g) => /every positive control returned zero/i.test(g)),
  JSON.stringify(b.gaps.slice(0, 2))
);
check(
  'did not silently emit clean zeroes',
  Object.values(b.census.terms).every((r) => r.total === 0) && b.census.trustworthy === false
);

console.log('\nrun C: a camelCase deny word and NO handler — only splitCamel can catch this');
const { out: c } = await run({ healthy: true, camelOnly: true });

/*
  THE assertion of this file. The element carries `class="panel-heading deleteApiKeyBtn"` and no
  `ng-click`, so the handler clause cannot fire and a bare `\bdelete\b` cannot match `deleteApiKeyBtn`
  either — the `\b` after `delete` needs a non-word character and finds `A`. Only `splitCamel`
  turns it into "delete Api Key Btn" and lets the denylist see the word.

  Negative control run 2026-08-15: `splitCamel` replaced with the identity function makes THIS check
  go red while every other check in this file still passes.
*/
check(
  'REFUSED a camelCase deny word with no handler (splitCamel)',
  c.refusedClicks.length >= 1,
  `refusedClicks=${c.refusedClicks.length} — splitCamel is not doing its job`
);
check(
  'the refusal matched the camelCase word itself',
  c.refusedClicks.some((r) => /delete/i.test(r.matched || '')),
  JSON.stringify(c.refusedClicks.slice(0, 1))
);

/*
  REDACTION — the regression test for the 06:47 live run, which wrote 8 live JWTs to disk.

  Asserted against the RAW serialised output rather than a field, because the leak did not arrive
  through a field anybody was watching: it came in via `describe().html`, the serialised outerHTML
  of four panes, each of which happened to contain the Launch anchor. Checking named fields would
  have missed it exactly the way the original redaction did.
*/
const JWT_SHAPE = /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\b/;
check('no JWT survives anywhere in the output', !JWT_SHAPE.test(aRaw), 'a JWT reached the downloaded file');
check(
  'the redaction marker is present, so masking ran rather than the element being absent',
  /«jwt \d+ chars — REDACTED AT CAPTURE»|«redacted \d+ chars»/.test(aRaw),
  'neither marker found — the JWT element may not have been serialised at all, so this proves nothing'
);
check('the 24-hex room id was masked too', !/652882112ad80b3e7c5132d5/.test(aRaw));

/*
  TRUNCATION must announce itself.

  The 06:47 capture cut `html` at exactly 4000 chars and `text` at exactly 300 with no ellipsis and
  no marker, so a truncated field was byte-indistinguishable from a complete one. That is the defect
  collect-manage-gaps.js was written to fix in ITS predecessor, and its header calls silent
  truncation the worst kind of failure.
*/
check(
  'truncation is marked, with the original length',
  /«TRUNCATED at \d+ of \d+ chars»/.test(aRaw),
  'a field was cut with no marker — a short capture looks identical to a complete one'
);
check(
  'the pane-collision check ran',
  typeof a.panes.distinctPanelsCaptured === 'number',
  `got ${a.panes.distinctPanelsCaptured}`
);

console.log('\nrun D: the EXEMPT expression — it must be CLICKED, not refused');
const { out: dRun } = await run({ healthy: true, exemptClick: true });

/*
  THE REGRESSION TEST for the 2026-08-15 06:47 live run.

  That run refused all five clicks with `matched: "New"`. The exemption had correctly disarmed the
  handler clause, and then the WORD denylist fired instead: splitCamel turns
  `showNewRoom=showNewRoom+1;` into "show New Room=show New Room+1;", and `new` is a deny word. The
  reveal never happened and the capture came back with an honest gap instead of the markup.

  The bug survived three green runs of this file because NO run exercised the exemption path — every
  shape here was built to prove a REFUSAL. A guard suite that only tests refusals cannot see a guard
  that refuses too much.
*/
check(
  'CLICKED the exempt showNewRoom expression',
  (dRun.panes.newRoomReveal?.clicksDelivered ?? 0) === 5,
  `clicksDelivered=${dRun.panes.newRoomReveal?.clicksDelivered} refusals=${dRun.refusedClicks.length}`
);
check(
  'no refusal recorded for the exempt expression',
  dRun.refusedClicks.length === 0,
  JSON.stringify(dRun.refusedClicks.slice(0, 1))
);
check(
  'found the control by its ng-click, not by text',
  /ng-click attribute/.test(dRun.panes.newRoomRevealFoundBy ?? ''),
  String(dRun.panes.newRoomRevealFoundBy)
);

console.log(
  `\n${failures.length ? `FAILED (${failures.length})` : 'PASSED'} — ` +
    `run A: ${a.states.length} states, ${a.gaps.length} gaps, ${a.refusedClicks.length} refusals; ` +
    `run B: census trustworthy=${b.census.trustworthy}; ` +
    `run C: ${c.refusedClicks.length} refusal(s)`
);
if (failures.length) {
  for (const f of failures) console.error('  · ' + f);
  process.exit(1);
}
