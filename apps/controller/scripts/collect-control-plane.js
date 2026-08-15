/*
  collect-control-plane.js — asks the reference application to enumerate ITSELF.

  ## How to run it

  1. Log in to the ORIGINAL (protradingroom.com) as the account owner and stop on the ACCOUNT page —
     the one listing your rooms, with Badges / Extra Admin Users / API Keys further down.
  2. Open Chrome DevTools -> Console.
  3. Paste this whole file, press Enter, wait for DONE.

  It downloads `control-plane-<timestamp>.json` by itself. No terminal command, no follow-up call,
  no second step.

  ## What it is for, and why the other eight collectors do not cover it

  `docs/decoded/admin-surface.md` §D reaches the most consequential conclusion in this project:
  **there is no operator/superadmin surface in ANY capture we hold.** Twelve operator-level terms
  return zero hits across every dump, with the search proved sound by a control term that does hit.
  The conclusion drawn was that the control plane cannot be matched, only designed.

  That conclusion is correct about the EVIDENCE and it is the honest reading of it. But it rests
  entirely on captures taken while signed in as one ordinary tenant owner, and it therefore cannot
  distinguish between the two possibilities that actually matter:

    (a) the product genuinely has no operator console, or
    (b) it has one, and the account we captured from simply cannot see it.

  Every existing collector reads what is ON SCREEN, so every one of them is blind to that
  distinction in exactly the same way. Adding a ninth that captures more DOM would inherit the
  blindness.

  **This script asks a different question.** A single-page application must register every screen it
  can ever show, at boot, before it knows who you are. In AngularJS + ui-router that registry is
  `$state.get()`, and it lists states this account cannot reach, has no menu entry for, and would be
  bounced out of. Reading the registry therefore separates (a) from (b) in a way that no screenshot,
  no DOM dump and no amount of clicking ever could.

  If an operator console is registered and merely hidden from us, it appears in that list.
  If the list contains only tenant-level states, then (a) is supported by the application's own
  self-description rather than by the absence of a screenshot — which is a far stronger claim than
  §D can currently make, and it is the difference between "we did not find it" and "it is not there".

  Framework confirmed from evidence before this was written, not assumed. In
  `evidence-dumps/login-page/logged-in-page`: `ng-app="app"`, four nested `ui-view` containers, zero
  `ng-view`, zero `$routeProvider`, and `$state.includes('page')` evaluated live inside an `ng-class`
  at byte 4,411. That is ui-router. The script still probes for ngRoute as well and records which one
  answered, because "the evidence said ui-router" and "this build uses ui-router" are two different
  statements and only the second one matters at runtime.

  ## What it collects

   1. THE STATE TABLE — every registered state: name, url, templateUrl, controller, abstract flag.
      The headline. Nothing else here comes close in value.
   2. The Angular module graph — `angular.module('app').requires`, transitively. An operator console
      shipped as a separate module shows up here even if its states load lazily.
   3. An OPERATOR CENSUS of §D's twelve terms across six independent surfaces: state names, state
      urls, state templateUrls, controller names, the live DOM, and every readable stylesheet.
      Each term is counted per surface, so a hit in one and not the others is visible rather than
      averaged away.
   4. The account-level panes no other collector captures: API Keys and its restrictions control,
      Marketplace, Extra Admin Users, Badges, and the Sessions list.
   5. Anything on screen that changes an account's STATE — suspend, close, downgrade, delete.
      `docs/decoded/admin-surface.md` §G item 8 records that no capture shows one existing.

  ## The rule this script is built around

  **It never concludes that something does not exist.** It reports what is REGISTERED in this build
  and what is REACHABLE by this account, and those two words appear on every verdict it writes. An
  empty result from an ordinary tenant login is evidence about that login. `~/CLAUDE.md` opens with
  the incident this rule comes from: `st-fileSortBar` was reported "not in the capture" when the
  capture was simply older than the feature. Same error, larger blast radius.

  For the same reason the census runs POSITIVE CONTROLS — terms that must hit if the census works at
  all. If a control returns zero, the census is broken and the script says so INSTEAD of reporting
  twelve honest-looking zeroes. A zero from a broken search is indistinguishable from a real absence
  in the output file, and the output file is all anyone will have.

  ## Safety

  It observes. It does not act on your behalf.

  * It issues NO network request. No fetch, no XHR, no form submission, no state transition. It reads
    the route registry; it does not navigate it. `templateUrl`s are recorded, never fetched — use
    `pull-template-cache.js` for that, separately and deliberately.
  * Every click goes through `safeClick()`, carried over verbatim from `collect-manage-gaps.js`
    including its `splitCamel` fix: `\bdelete\b` does NOT match `deleteApiKey`, because the word
    boundary needs a non-word character and finds `A`. Every handler in this application is
    camelCase, so without that split the guard silently passes everything it exists to stop.
  * **An element carrying ANY `ng-click` is refused**, with exactly one exemption, spelled out in
    full below because a safety claim with a hidden exception is not a safety claim.
  * The ONLY thing it clicks is the Sessions counter, five times. Nothing else. Not one tab, not one
    menu, not one row control, not one form.
  * Values that look like credentials are masked before they reach the file, as are email addresses
    and 24-hex Mongo ids — this file is meant to be shared.

  ### The one click, and the one exemption

  The reference hides New Room behind `ng-show="showNewRoom>=5"` — five clicks and nothing else on
  the page reveals it. That is recorded in this repository, verbatim, in
  `src/lib/account-new-room-reveal.test.ts`, along with why we deliberately do NOT reproduce the
  gate.

  The control is NOT the heading. Read verbatim at `views/page.welcome.html:333-336`, it is a `span`
  inside the `h4` that reads "Total Sessions: N":

      <span ng-click="showNewRoom=showNewRoom+1;">Sessions</span>

  So the guard's blanket refusal of `ng-click` would have refused the one click this script needs.
  `EXEMPT_NG_CLICK` is anchored to that exact expression — an increment of a scope variable that
  calls nothing — and matches no other. Anything else with a handler is still refused.

  That mistake was found by READING the template, not by running the script. Had it shipped, the run
  would have completed, downloaded a file, and reported "New Room did not appear" — a clean-looking
  result that was entirely about this tool. There is one trip to the live site and no second chance
  to notice.

  Revealing the control captures its markup. It does not create a room: creation needs the form that
  appears afterwards, and this script never touches it.
*/

(async () => {
  'use strict';

  const OUT = {
    tool: 'collect-control-plane',
    version: 1,
    capturedAt: new Date().toISOString(),
    href: location.href,
    origin: location.origin,
    provenance: {},
    identity: {},
    router: { kind: null, how: null },
    states: [],
    modules: {},
    census: { controls: {}, terms: {}, trustworthy: null },
    panes: {},
    lifecycleControls: [],
    verdict: {},
    gaps: [],
    refusedClicks: []
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const gap = (message) => {
    OUT.gaps.push(message);
    console.warn('[gap]', message);
  };
  const note = (message) => console.log('[control-plane]', message);

  /* ─── safety ────────────────────────────────────────────────────────────── */

  const DENY =
    /\b(delete|remove|upload|play|stop|send|save|submit|post|ban|kick|clear|reset|launch|archive|pay|invite|email|suspend|close|cancel|downgrade|revoke|create|new)\b/i;

  /**
   * Splits camelCase so the word denylist can see inside an identifier.
   *
   * Carried over from `collect-manage-gaps.js`, where it is documented as a REAL HOLE that existed
   * on every earlier run: `\bdelete\b` does not match `deleteApiKey`. Copied rather than
   * paraphrased, because a guard that is retyped from memory is a guard that has not been reviewed.
   */
  const splitCamel = (s) => String(s).replace(/([a-z0-9])([A-Z])/g, '$1 $2');

  function safeClick(element, why) {
    if (!element) return false;
    const description = splitCamel(
      [
        element.textContent || '',
        element.getAttribute('title') || '',
        element.getAttribute('aria-label') || '',
        element.getAttribute('ng-click') || '',
        element.id || '',
        element.className || ''
      ].join(' ')
    );
    /*
      An ng-click naming a handler is a real action whatever the element looks like, so the default
      is to refuse every element that has one.

      ONE expression is exempt, and it is written out in full rather than matched loosely:

          ng-click="showNewRoom=showNewRoom+1;"

      That is the Sessions counter, read verbatim at `views/page.welcome.html:333-336`. It increments
      a scope variable and calls nothing. `EXEMPT_NG_CLICK` is anchored, so it matches that
      expression and no other — not a prefix of it, not one with a call appended.

      This exemption exists because the first version of this script had none, and it would have
      REFUSED THE ONLY CLICK IT NEEDS TO MAKE: the reveal control is a `span` carrying that
      `ng-click`, not the bare heading text the script was looking for. The run would have completed,
      downloaded a file, reported "New Room did not appear", and looked like a finding about the
      product. Found by reading the template rather than by running the script, which is the only
      way it could have been found before the one trip to the live site.

      ## The 06:47 run, and why the exemption now short-circuits BOTH tests

      The first live run refused all five clicks anyway, with `matched: "New"`. The exemption
      correctly disarmed the handler clause — and then the WORD denylist fired instead, because
      `splitCamel("showNewRoom=showNewRoom+1;")` produces "show New Room=show New Room+1;", and
      `new` is one of the deny words. The reveal never happened and the run recorded an honest gap
      saying so.

      That is the same lesson twice in one file: an exemption that only covers one of two guards is
      not an exemption. The proven-safe expression is now checked FIRST and returns early, so
      neither test can refuse it. Nothing else changes — an element whose `ng-click` is not exactly
      this expression still goes through both.
    */
    const ngClick = (element.getAttribute('ng-click') || '').trim();
    const EXEMPT_NG_CLICK = /^showNewRoom\s*=\s*showNewRoom\s*\+\s*1\s*;?$/;
    if (EXEMPT_NG_CLICK.test(ngClick)) {
      element.click();
      return true;
    }
    if (DENY.test(description) || ngClick) {
      OUT.refusedClicks.push({
        why,
        text: (element.textContent || '').trim().slice(0, 80),
        ngClick: ngClick || null,
        matched: (description.match(DENY) || [])[0] ?? 'has an ng-click handler'
      });
      console.warn('[refused]', why);
      return false;
    }
    element.click();
    return true;
  }

  /* ─── serialisation ─────────────────────────────────────────────────────── */

  const SECRET_NAME = /secret|password|pw$|pw\d|token|apikey|api_key|key$|keyid|clientid|sid$/i;

  function safeValue(element) {
    const name = `${element.id || ''} ${element.name || ''}`;
    const value = element.value == null ? null : String(element.value);
    if (value && SECRET_NAME.test(name)) return `«redacted ${value.length} chars»`;
    return value;
  }

  /**
   * Masks anything shaped like a live credential or a personal email.
   *
   * This file gets shared. The account page carries the owner's own email and, in the API Keys
   * pane, key material. `redact-owner-evidence.mjs` exists in this repository because that has
   * already had to be cleaned up once after the fact; doing it at capture time is cheaper and
   * cannot be forgotten.
   */
  const maskEmail = (s) =>
    String(s ?? '').replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, (m) => `«email ${m.length} chars»`);
  const maskHex = (s) => String(s ?? '').replace(/\b[a-f0-9]{24,}\b/gi, (m) => `«hex ${m.length}»`);

  /*
    JWTs, and this one is written from a REAL FAILURE of this very script.

    The 2026-08-15 06:47 run wrote **8 live JWTs** into the downloaded file — 301 characters each,
    segments 36/220/43, i.e. header.payload.signature complete with the signature — across
    `panes.{apiKeys,badges,extraAdminUsers,sessions}.panel.html`. They come from the Launch link,
    whose template is `ng-href="/session?id={{s.uuid}}&jwtSite={{tokSite}}"`
    (`views/page.welcome.html:379-381`), so every serialised pane containing that anchor carried a
    usable site token. The payload also base64-encodes the owner's name, email and user id.

    Neither `maskEmail` nor `maskHex` could see it: a JWT is base64url, so it has no `@` and its
    segments are not hex. The redaction was written against the two shapes I had thought of, and a
    token that matched neither passed straight through into a file meant to be shared.

    `.gitignore` in this repository already warns that captures contain "in some cases a live JWT".
    That warning existed and this script still leaked one, which is the argument for masking at
    CAPTURE time rather than trusting the operator to remember.

    Two patterns, deliberately overlapping:
      1. the JWT shape itself, wherever it appears;
      2. any query parameter whose NAME contains jwt/token/key/secret/sig/auth, whatever its value
         looks like — so the next credential shape nobody predicted is caught by its label instead.
  */
  const maskJwt = (s) =>
    String(s ?? '').replace(
      /\beyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\b/g,
      (m) => `«jwt ${m.length} chars — REDACTED AT CAPTURE»`
    );
  const maskTokenParams = (s) =>
    String(s ?? '').replace(
      /([?&][A-Za-z0-9_-]*(?:jwt|token|key|secret|sig|auth)[A-Za-z0-9_-]*=)([^&"'\s>]+)/gi,
      (_all, name, value) => `${name}«redacted ${value.length} chars»`
    );

  /**
   * Redact, then truncate — and SAY SO when truncation happened.
   *
   * The 06:47 capture cut `html` at exactly 4,000 characters and `text` at exactly 300 with no
   * ellipsis and no marker, so a truncated field was byte-indistinguishable from a complete one.
   * `collect-manage-gaps.js` exists partly to fix that exact defect in ITS predecessor, and its
   * header calls silent truncation "the worst kind" of failure — and it was reintroduced here.
   *
   * The marker carries the original length, so anyone reading the capture can tell how much is
   * missing rather than only that something is.
   */
  const clean = (s, cap = 400) => {
    const redacted = maskTokenParams(maskJwt(maskHex(maskEmail(s))));
    if (redacted.length <= cap) return redacted;
    return `${redacted.slice(0, cap)}…«TRUNCATED at ${cap} of ${redacted.length} chars»`;
  };

  const STYLE_PROPS = [
    'display',
    'visibility',
    'position',
    'width',
    'height',
    'margin',
    'padding',
    'border',
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'color',
    'background-color',
    'text-align',
    'opacity',
    'border-radius',
    'flex-direction',
    'justify-content',
    'align-items'
  ];

  function computed(element) {
    const style = getComputedStyle(element);
    const out = {};
    for (const property of STYLE_PROPS) out[property] = style.getPropertyValue(property);
    return out;
  }

  /**
   * Every CSS rule that actually matches this element — so "this class has no rule" is provable.
   *
   * Three defects the 06:47 capture exposed, all fixed here:
   *
   * 1. **Every `styles.css` rule was stored TWICE** in every `rules` array. The sheet is present
   *    more than once in `document.styleSheets`, and nothing deduplicated. Now keyed on
   *    href+selector+css, so a genuinely repeated declaration in one sheet still collapses to one
   *    entry — which is what a reader wants from a "which rules match" list.
   * 2. **Rules nested inside `@media` were never walked.** A grouping rule has no `selectorText`,
   *    so the old loop skipped it and everything inside it. Every responsive rule on the page was
   *    therefore invisible. `walk()` now recurses, and records the enclosing conditional text so a
   *    rule that only applies at some width cannot be mistaken for an unconditional one.
   * 3. **The unreadable sheets were never NAMED.** The capture said "2 stylesheets are cross-origin"
   *    and gave no href, so nobody could tell which cascade was missing. They are collected by href
   *    into `provenance.unreadableStylesheets`.
   */
  const unreadableSheets = new Set();

  function matchingRules(element) {
    const found = [];
    const seen = new Set();

    const walk = (rules, conditions) => {
      for (const rule of Array.from(rules)) {
        /* A grouping rule (@media, @supports) has child rules and no selector of its own. */
        if (rule.cssRules && rule.cssRules.length) {
          const text = rule.conditionText || rule.media?.mediaText || null;
          walk(rule.cssRules, text ? [...conditions, text] : conditions);
          continue;
        }
        if (!rule.selectorText) continue;
        try {
          if (!element.matches(rule.selectorText)) continue;
        } catch {
          continue; /* a selector this browser cannot evaluate against an element */
        }
        const entry = {
          selector: rule.selectorText,
          css: rule.style.cssText,
          href: rule.parentStyleSheet?.href ?? null,
          conditions: conditions.length ? conditions.slice() : undefined
        };
        const key = `${entry.href}|${conditions.join('&')}|${entry.selector}|${entry.css}`;
        if (seen.has(key)) continue;
        seen.add(key);
        found.push(entry);
      }
    };

    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        unreadableSheets.add(sheet.href ?? '(inline or unnamed sheet)');
        continue;
      }
      if (rules) walk(rules, []);
    }
    return found;
  }

  function describe(element, { withRules = false } = {}) {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      class: element.getAttribute('class') || null,
      text: clean((element.textContent || '').trim(), 300),
      value: 'value' in element ? safeValue(element) : null,
      attrs: Object.fromEntries(Array.from(element.attributes).map((a) => [a.name, clean(a.value, 200)])),
      rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      visible: rect.width > 0 && rect.height > 0,
      computed: computed(element),
      rules: withRules ? matchingRules(element) : undefined,
      html: clean(element.outerHTML, 4000)
    };
  }

  const all = (selector, cap = 40) => Array.from(document.querySelectorAll(selector)).slice(0, cap);
  const byText = (selector, re) =>
    Array.from(document.querySelectorAll(selector)).find((e) => re.test(e.textContent || ''));

  /* ─── 1. provenance ─────────────────────────────────────────────────────── */

  OUT.provenance = {
    userAgent: navigator.userAgent,
    viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
    ngApp: document.querySelector('[ng-app]')?.getAttribute('ng-app') ?? null,
    scripts: Array.from(document.querySelectorAll('script[src]')).map((s) => s.src),
    stylesheets: Array.from(document.querySelectorAll('link[rel=stylesheet]')).map((l) => l.href),
    uiViewCount: document.querySelectorAll('[ui-view], [data-ui-view]').length,
    ngViewCount: document.querySelectorAll('[ng-view], [data-ng-view]').length
  };
  note(`ng-app="${OUT.provenance.ngApp}", ${OUT.provenance.uiViewCount} ui-view container(s)`);

  /* ─── 2. the injector, and which router actually answered ───────────────── */

  let injector = null;
  try {
    injector =
      (window.angular && window.angular.element(document.body).injector?.()) ||
      (window.angular && window.angular.element(document).injector?.()) ||
      null;
  } catch (error) {
    gap(`angular.element(...).injector() threw: ${error && error.message}`);
  }

  if (!window.angular) {
    gap(
      'window.angular is undefined. Either this is not the AngularJS controller app, or the ' +
        'bundle has not finished booting. EVERYTHING below that depends on the injector is ' +
        'unavailable, and that is a failure of this run, NOT a finding about the product.'
    );
  } else if (!injector) {
    gap(
      'angular is present but no injector was found on document.body or document. The state ' +
        'table could not be read. Re-run once the application has finished loading.'
    );
  }

  const service = (name) => {
    if (!injector) return null;
    try {
      return injector.get(name);
    } catch {
      return null;
    }
  };

  /* ─── 3. THE STATE TABLE — the reason this script exists ────────────────── */

  const $state = service('$state');
  const $route = service('$route');

  if ($state && typeof $state.get === 'function') {
    OUT.router = { kind: 'ui-router', how: "injector.get('$state').get()" };
    let raw = [];
    try {
      raw = $state.get() || [];
    } catch (error) {
      gap(`$state.get() threw: ${error && error.message}`);
    }
    OUT.states = raw.map((s) => ({
      name: s.name ?? null,
      url: s.url ?? null,
      abstract: !!s.abstract,
      templateUrl: typeof s.templateUrl === 'string' ? s.templateUrl : s.templateUrl ? '(function)' : null,
      controller: typeof s.controller === 'string' ? s.controller : s.controller ? '(function)' : null,
      /* `views` is where ui-router hides the interesting multi-pane states. */
      views: s.views ? Object.keys(s.views) : null,
      hasResolve: !!s.resolve,
      data: s.data ? clean(JSON.stringify(s.data), 300) : null
    }));
    note(`state table: ${OUT.states.length} registered state(s)`);
  } else if ($route && $route.routes) {
    OUT.router = { kind: 'ngRoute', how: "injector.get('$route').routes" };
    OUT.states = Object.entries($route.routes).map(([url, r]) => ({
      name: null,
      url,
      abstract: false,
      templateUrl: typeof r.templateUrl === 'string' ? r.templateUrl : null,
      controller: typeof r.controller === 'string' ? r.controller : null,
      views: null,
      hasResolve: !!r.resolve,
      data: null
    }));
    note(`route table: ${OUT.states.length} registered route(s)`);
  } else {
    OUT.router = { kind: null, how: 'neither $state nor $route could be resolved' };
    gap(
      'No route registry could be read. The single highest-value part of this capture is ' +
        'missing, so this run CANNOT speak to whether an operator console is registered. Say ' +
        'that plainly rather than treating the empty states array as an absence.'
    );
  }

  /* ─── 4. the module graph ───────────────────────────────────────────────── */

  if (window.angular && OUT.provenance.ngApp) {
    const seen = new Set();
    const walk = (name) => {
      if (seen.has(name)) return;
      seen.add(name);
      let mod;
      try {
        mod = window.angular.module(name);
      } catch {
        return; /* a built-in or externally registered module we cannot resolve; not an error */
      }
      OUT.modules[name] = (mod.requires || []).slice();
      for (const dep of mod.requires || []) walk(dep);
    };
    walk(OUT.provenance.ngApp);
    note(`module graph: ${Object.keys(OUT.modules).length} module(s)`);
  }

  /* ─── 5. the operator census ────────────────────────────────────────────── */

  /*
    The twelve terms are `docs/decoded/admin-surface.md` §D, verbatim, plus the words a control
    plane would have to use if it existed under a different name. Each is counted SEPARATELY per
    surface, because a term that appears in a stylesheet and nowhere else means something very
    different from one that names a registered state.
  */
  const TERMS = [
    'superadmin',
    'super_admin',
    'isSuperAdmin',
    'platformAdmin',
    'ptrAdmin',
    'sysadmin',
    'impersonat',
    'suspend',
    'entitle',
    'tenant',
    'quota',
    'operator',
    'console',
    'staff',
    'customers',
    'accounts',
    'crossAccount',
    'allSessions',
    'allAccounts',
    'billing'
  ];

  /*
    Positive controls. These MUST hit if the census is working — they are terms the reference is
    known to use. If they all return zero the census is broken and every zero below it is
    meaningless, which is a thing the output has to say out loud rather than imply.
  */
  const CONTROLS = ['session', 'user', 'room'];

  const domText = document.documentElement.outerHTML;
  let cssText = '';
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      if (!rules) continue;
      for (const rule of Array.from(rules)) cssText += rule.cssText + '\n';
    } catch {
      /* Recorded by href in `unreadableSheets`, which `matchingRules` also feeds. */
      unreadableSheets.add(sheet.href ?? '(inline or unnamed sheet)');
    }
  }

  /*
    NAME the unreadable sheets. The 06:47 capture reported "2 stylesheet(s) are cross-origin" and
    never said WHICH, so nobody could tell which cascade was missing from the capture — and it turned
    out to matter: no rule from `bootstrap.min.css` appears anywhere in that file, and with no list
    of unreadable sheets there was no way to tell an unreadable sheet from a sheet whose rules simply
    did not match.
  */
  OUT.provenance.unreadableStylesheets = Array.from(unreadableSheets);
  if (unreadableSheets.size) {
    gap(
      `${unreadableSheets.size} stylesheet(s) are cross-origin and unreadable, so any rule they ` +
        'carry is absent from both the css census surface and every `rules` array. A zero in those ' +
        'is therefore weaker evidence than a zero elsewhere. Named in ' +
        `provenance.unreadableStylesheets: ${Array.from(unreadableSheets).join(', ')}`
    );
  }

  const stateNames = OUT.states.map((s) => s.name || '').join(' ');
  const stateUrls = OUT.states.map((s) => s.url || '').join(' ');
  const stateTemplates = OUT.states.map((s) => s.templateUrl || '').join(' ');
  const stateControllers = OUT.states.map((s) => s.controller || '').join(' ');
  const moduleNames = Object.keys(OUT.modules).join(' ');

  /* Counted with split().length - 1. `grep -c` counts LINES, and on a one-line minified surface
     every answer becomes 1 or 0 — that exact mistake was made in this repository on 2026-08-15. */
  const count = (haystack, needle) => haystack.toLowerCase().split(needle.toLowerCase()).length - 1;

  const surfaces = {
    stateNames,
    stateUrls,
    stateTemplates,
    stateControllers,
    modules: moduleNames,
    dom: domText,
    css: cssText
  };

  const censusFor = (term) => {
    const row = {};
    let total = 0;
    for (const [surface, text] of Object.entries(surfaces)) {
      const n = count(text, term);
      row[surface] = n;
      total += n;
    }
    row.total = total;
    return row;
  };

  for (const term of CONTROLS) OUT.census.controls[term] = censusFor(term);
  for (const term of TERMS) OUT.census.terms[term] = censusFor(term);

  const controlsHit = Object.values(OUT.census.controls).filter((r) => r.total > 0).length;
  OUT.census.trustworthy = controlsHit > 0;
  if (!OUT.census.trustworthy) {
    gap(
      'EVERY positive control returned zero. The census is broken — the surfaces it searched are ' +
        'empty or were never populated. Do NOT read the term counts below as absence; they are ' +
        'the output of a search that does not work.'
    );
  }
  note(
    `census: ${controlsHit}/${CONTROLS.length} controls hit; ` +
      `${Object.values(OUT.census.terms).filter((r) => r.total > 0).length}/${TERMS.length} operator terms hit`
  );

  /* ─── 6. identity — what account is this, and what can it see ───────────── */

  OUT.identity = {
    /* Redacted at capture: the file is meant to be shared. The SHAPE is what matters here. */
    emailPresent: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/.test(document.body.textContent || ''),
    navEntries: all('nav a, .navbar a, aside a, .sidebar a', 60).map((a) => ({
      text: clean((a.textContent || '').trim(), 80),
      href: clean(a.getAttribute('href') || '', 120),
      uiSref: a.getAttribute('ui-sref') || null,
      title: a.getAttribute('title') || null
    })),
    /* ui-sref is where a link's DESTINATION STATE is named, which is the thing to diff against
       the state table: a state that exists but has no ui-sref anywhere is a screen with no door. */
    allSrefs: Array.from(new Set(all('[ui-sref]', 200).map((e) => e.getAttribute('ui-sref'))))
  };

  if (OUT.states.length) {
    const linked = new Set(OUT.identity.allSrefs.map((s) => String(s).replace(/\(.*$/, '').trim()));
    OUT.identity.statesWithNoLinkOnThisPage = OUT.states
      .filter((s) => s.name && !s.abstract && !linked.has(s.name))
      .map((s) => s.name);
    note(`${OUT.identity.statesWithNoLinkOnThisPage.length} registered state(s) have no ui-sref on this page`);
  }

  /* ─── 7. the account-level panes no other collector captures ────────────── */

  /**
   * A pane, found from its heading.
   *
   * ## The defect this replaces, because it produced a capture that looked complete and was not
   *
   * The 06:47 run used `heading.closest('.panel, .card, …')`. All four account headings are
   * `div.app > h3` and their nearest `.panel` ANCESTOR is one shared container, so
   * `panes.apiKeys.panel`, `panes.badges.panel`, `panes.extraAdminUsers.panel` and
   * `panes.sessions.panel` all came back **deep-equal** — one object stored four times, about 17.7%
   * of a 118,757-byte file, with the per-pane structure it was taken for entirely absent. Nothing in
   * the output said so; four populated objects look like four panes.
   *
   * ## Why a FOLLOWING SIBLING is the right relationship, from evidence
   *
   * Read in the rendered account page (`evidence-dumps/login-page/logged-in-page`): the headings sit
   * at lines 492 (Badges), 611 (Extra Admin Users) and 672 (API Keys), and the panes at 586, 613 and
   * 675. Each pane FOLLOWS its heading; none contains it. The panes also use `panel pane-default`,
   * not Bootstrap's `panel-default` — a trap recorded by the reader that went through that file line
   * by line.
   *
   * So the walk goes forward from the heading. `closest()` is kept only as a last resort, and
   * `strategy` records which one answered, because a capture that silently changed method is a
   * capture nobody can compare against the previous one.
   */
  const PANE_SELECTOR = '.pane-default, .panel, .card, .box, .well';
  const paneOf = (re) => {
    const heading = byText('h1, h2, h3, h4, h5, legend, .panel-heading, .card-header', re);
    if (!heading) return null;

    let panel = null;
    let strategy = null;

    /* 1. the heading's own following siblings — the shape the evidence shows */
    for (let node = heading.nextElementSibling; node; node = node.nextElementSibling) {
      if (node.matches?.(PANE_SELECTOR)) {
        panel = node;
        strategy = 'following sibling of the heading';
        break;
      }
      /* a following sibling that CONTAINS a pane, e.g. a wrapping row */
      const inner = node.querySelector?.(PANE_SELECTOR);
      if (inner) {
        panel = inner;
        strategy = 'pane inside a following sibling of the heading';
        break;
      }
    }

    /* 2. last resort, and explicitly labelled, because this is what produced the shared container */
    if (!panel) {
      panel = heading.closest(PANE_SELECTOR);
      strategy = panel ? 'ancestor via closest() — MAY BE SHARED BETWEEN PANES' : null;
    }

    return {
      strategy,
      heading: describe(heading, { withRules: true }),
      panel: panel ? describe(panel, { withRules: true }) : null
    };
  };

  const PANES = [
    ['apiKeys', /API\s*Key/i],
    ['badges', /Badge/i],
    ['extraAdminUsers', /Extra\s*Admin/i],
    ['sessions', /Sessions?\b/i],
    ['marketplace', /Marketplace/i]
  ];
  for (const [key, re] of PANES) {
    const found = paneOf(re);
    if (found) {
      OUT.panes[key] = found;
    } else {
      OUT.panes[key] = null;
      gap(`pane "${key}" did not render for this account — not captured, and not to be inferred`);
    }
  }

  /*
    Did two panes resolve to the SAME element?

    This is the safety net for the defect above, and it is deliberately independent of the fix: it
    compares the serialised results rather than trusting the strategy that produced them, so it
    catches a collision arising some other way too.

    It exists because the 06:47 capture had this exact failure and said nothing. Four populated
    objects look like four panes, and the duplication was only found later by an agent computing
    deep-equality across the whole file. Nobody should have to do that again to know whether a
    capture is real.
  */
  const paneFingerprints = new Map();
  for (const [key] of PANES) {
    const html = OUT.panes[key]?.panel?.html;
    if (!html) continue;
    if (paneFingerprints.has(html)) {
      gap(
        `panes."${key}" and panes."${paneFingerprints.get(html)}" resolved to the SAME element — ` +
          `their panel objects are identical, so the per-pane structure was NOT captured for either. ` +
          `Treat both as one shared container, not as two panes.`
      );
    } else {
      paneFingerprints.set(html, key);
    }
  }
  OUT.panes.distinctPanelsCaptured = paneFingerprints.size;

  /*
    The API-key restrictions editor is `docs/decoded/admin-surface.md` §G item 1, the highest-value
    account-level gap. Its BUTTON is known (`page.welcome.html:1345`) and the data shape is proved
    by the lock indicator (`k.restrictToSessions`, `k.restrictToEndpoints`, :1338-1339). The EDITOR
    is entirely unknown.

    This script records the button and refuses to open it. Opening it means clicking a control whose
    ng-click is `manageApiKeyRestrictions(k)`, and a handler is exactly what the guard exists to
    refuse. Capturing that modal needs a deliberate, separately reviewed script — not a side effect
    of an inventory run.
  */
  OUT.panes.apiKeyRestrictionControls = all('[ng-click*="Restriction"], [ng-click*="restrict"]', 20).map((e) =>
    describe(e, { withRules: true })
  );
  if (!OUT.panes.apiKeyRestrictionControls.length) {
    gap(
      'No API-key restrictions control on screen. It only renders for an account that HAS a key, ' +
        'and this script will not create one. §G item 1 stays open.'
    );
  }

  /*
    The named account-level controls, located by their HANDLER rather than by their wording.

    Every selector below was read verbatim out of `views/page.welcome.html` at the line given. They
    are addressed by `ng-click` / `ng-submit` because that attribute is the one thing on these
    elements that is stable: the four content panes carry NO id, their headings carry no class, and
    the panes use `panel pane-default` — NOT bootstrap's `panel-default` — which is a trap recorded
    by the reader that went through the rendered page line by line.

    NONE of these is clicked, and that is not caution for its own sake. `page.welcome.html` is a
    TEMPLATE — it contains no function bodies at all, so for every handler here the question "does
    invoking this mutate anything?" is genuinely unanswered by the evidence. An adversarial review
    of the first selector list marked `toggleArchivedRooms`, `sortByUUID`, `sortByName`,
    `exportBadges`, `exportListToCSV` and `editBadge` as "read-only" from their LABELS, and every
    one of those judgements was correctly refuted: a name is not a body. They are serialised for
    their markup, styles and matching rules; what they DO is already covered by
    `collect-rendered-states.js`, which reads the function source via scope introspection.
  */
  const NAMED_CONTROLS = {
    marketplacePerSession: '[ng-click^="manageMarketplaceSession"]' /* :385-387 */,
    apiKeyCreate: '[ng-click="createApiKey()"]' /* :678-683 rendered */,
    apiKeyDelete: '[ng-click^="deleteApiKey"]',
    adminUserAddToggle: '[ng-click="showAddAdminUser=!showAddAdminUser"]' /* :1223-1238 */,
    adminUserAddForm: '[ng-submit="addAdminUser()"]' /* :1246-1263 */,
    adminUserRemove: '[ng-click^="removeAdminUser"]' /* :1295-1297 */,
    sessionsSortByUUID: '[ng-click="sortByUUID()"]' /* :351-354 */,
    sessionsSortByName: '[ng-click="sortByName()"]' /* :355-358 */,
    archivedRoomsToggle: '[ng-click="toggleArchivedRooms()"]' /* :341-343 */,
    sessionManageLink: 'a[href^="#/page/manageSession/"]' /* :382-384 */,
    newRoomCreate: '[ng-click="createNew()"]' /* :396-399, behind showNewRoom>=5 */
  };
  OUT.panes.namedControls = {};
  for (const [key, selector] of Object.entries(NAMED_CONTROLS)) {
    const nodes = all(selector, 10);
    OUT.panes.namedControls[key] = {
      selector,
      count: nodes.length,
      nodes: nodes.map((e) => describe(e, { withRules: true }))
    };
  }

  /*
    The server-injected globals, and the SCOPE flag they are suspected of feeding.

    Two separate facts, and the gap between them is the point of capturing both:

      1. The Marketplace control is hidden by a SCOPE variable: `ng-hide="disableMarketplace"`,
         read verbatim at `views/page.welcome.html:385-387`. That variable is never assigned
         anywhere in the template.
      2. A GLOBAL named `__disableMarketplace` exists in an inline script on the rendered account
         page (line 839, among the globals at 830-839) and ships the STRING 'true'.

    It is obvious that 1 is fed by 2. It is also NOT PROVEN by anything we hold: the assignment
    would live in `/public/dist/app.min.js`, which is not in our evidence. An adversarial review
    caught this stated as established fact and was right to — "obvious" is how a plausible guess
    gets into a document and then into code.

    So the script records BOTH sides and lets the capture settle it: the global's value and type,
    and the scope flag itself, read off the live scope where it is finally resolvable. If they
    disagree, something else is hiding the button and we would rather find that out here.

    Read as strings deliberately. 'true' is not `true`, and recording the type is how the next
    person avoids writing a falsy check against a non-empty string.
  */
  const GLOBALS = ['__disableMarketplace', '__disableMobile', '__disableSSO', '__disableTextList', 'tokSite'];
  OUT.panes.serverInjectedGlobals = {};
  for (const name of GLOBALS) {
    const present = name in window;
    OUT.panes.serverInjectedGlobals[name] = present
      ? { present: true, type: typeof window[name], value: clean(String(window[name]), 120) }
      : { present: false, type: null, value: null };
  }

  /* The scope side of the same question — the only place the two can be compared. */
  OUT.panes.marketplaceScopeFlag = { readable: false, value: null, how: null };
  const marketplaceNode = document.querySelector('[ng-hide="disableMarketplace"]');
  if (marketplaceNode && window.angular) {
    try {
      const scope = window.angular.element(marketplaceNode).scope();
      if (scope) {
        OUT.panes.marketplaceScopeFlag = {
          readable: true,
          value: String(scope.disableMarketplace),
          type: typeof scope.disableMarketplace,
          how: 'angular.element(node).scope().disableMarketplace'
        };
      }
    } catch (error) {
      gap(`Could not read the disableMarketplace scope flag: ${error && error.message}`);
    }
  }
  if (!OUT.panes.marketplaceScopeFlag.readable) {
    gap(
      'The disableMarketplace SCOPE flag could not be read, so whether the __disableMarketplace ' +
        'global is what hides the Marketplace control remains UNPROVEN — it is an inference, not ' +
        'a finding, and must not be written up as one.'
    );
  }

  /* ─── 8. account lifecycle — §G item 8 ──────────────────────────────────── */

  /*
    No capture shows an account being suspended, closed, downgraded or deleted, and the `accounts`
    table has no visible status column. Recording every candidate control by its WORDING rather
    than by a guessed selector, because a guessed selector that matches nothing is indistinguishable
    in the output from a control that is not there.
  */
  const LIFECYCLE = /suspend|deactivat|close account|delete account|downgrade|cancel subscription|plan|upgrade/i;
  OUT.lifecycleControls = all('a, button, input[type=button], input[type=submit]', 400)
    .filter((e) => LIFECYCLE.test(e.textContent || '') || LIFECYCLE.test(e.getAttribute('title') || ''))
    .map((e) => describe(e));
  if (!OUT.lifecycleControls.length) {
    gap(
      'No account-lifecycle control found on this page. Consistent with §G item 8, and still only ' +
        'evidence about THIS page for THIS account.'
    );
  }

  /* ─── 9. the one click: reveal New Room ─────────────────────────────────── */

  /*
    `ng-show="showNewRoom>=5"`, five clicks on the word "Sessions". Recorded in this repository at
    `src/lib/account-new-room-reveal.test.ts`, together with the reason we deliberately do NOT
    reproduce the gate. The clicks raise a counter initialised by `ng-init="showNewRoom=0;"`
    (rendered account page, byte 14,536).

    THE ELEMENT IS FOUND BY ITS HANDLER, NOT BY ITS TEXT. Read verbatim at
    `views/page.welcome.html:333-336`, the control is a `span` INSIDE the `h4` that reads
    "Total Sessions: N":

        <span ng-click="showNewRoom=showNewRoom+1;">Sessions</span>

    Matching on text was the original approach and it is fragile in both directions here: the `h4`
    also contains the word, and its text is "Total Sessions: 1" rather than "Sessions", so a
    strict match misses the span while a loose one hits the wrong node and clicks a heading that
    does nothing. The attribute is exact, so it is the primary. The text match stays as a fallback
    for a build where the expression differs, and which one answered is recorded.
  */
  const sessionsLabel =
    document.querySelector('[ng-click^="showNewRoom=showNewRoom+1"]') ||
    byText('h1, h2, h3, h4, h5, legend, .panel-heading, label, span', /^\s*Sessions?\s*$/i);
  OUT.panes.newRoomRevealFoundBy = document.querySelector('[ng-click^="showNewRoom=showNewRoom+1"]')
    ? 'ng-click attribute (page.welcome.html:333-336)'
    : sessionsLabel
      ? 'text fallback — the ng-click expression differs in this build, which is itself worth reporting'
      : null;
  if (!sessionsLabel) {
    gap(
      'Neither the showNewRoom ng-click nor a bare "Sessions" label was found — the New Room ' +
        'reveal was not attempted, and nothing here speaks to whether the control exists.'
    );
  } else {
    let clicks = 0;
    for (let i = 0; i < 5; i += 1) {
      if (safeClick(sessionsLabel, `Sessions click ${i + 1} of 5 (raises showNewRoom)`)) clicks += 1;
      await sleep(120);
    }
    await sleep(400);
    const newRoom = byText('a, button', /New\s*Room/i);
    OUT.panes.newRoomReveal = {
      clicksDelivered: clicks,
      revealed: !!newRoom && newRoom.getBoundingClientRect().width > 0,
      control: describe(newRoom, { withRules: true })
    };
    if (!OUT.panes.newRoomReveal.revealed) {
      gap(
        `New Room did not appear after ${clicks} click(s). Either the threshold differs in this ` +
          'build, the label is not the counted element, or the clicks were refused. Not evidence ' +
          'that the control is absent.'
      );
    }
    note(`New Room reveal: ${OUT.panes.newRoomReveal.revealed ? 'revealed' : 'not revealed'}`);
  }

  /* ─── 10. the verdict, phrased so it cannot be over-read ────────────────── */

  const operatorHits = Object.entries(OUT.census.terms)
    .filter(([, row]) => row.stateNames + row.stateUrls + row.stateTemplates + row.stateControllers > 0)
    .map(([term]) => term);

  OUT.verdict = {
    routeRegistryRead: OUT.states.length > 0,
    statesRegistered: OUT.states.length,
    censusTrustworthy: OUT.census.trustworthy,
    operatorTermsInRouteRegistry: operatorHits,
    /*
      Deliberately worded. "Registered in this build" and "reachable by this account" are the only
      two claims this script is entitled to make. It is NOT entitled to say a console does not
      exist, and the statement below is written so that nobody can quote it as if it did.
    */
    statement: !OUT.states.length
      ? 'INCONCLUSIVE — the route registry could not be read, so this run says nothing about whether an operator surface is registered.'
      : operatorHits.length
        ? `OPERATOR-LEVEL STATES MAY BE REGISTERED IN THIS BUILD. Terms hit inside the route registry: ${operatorHits.join(', ')}. Read the states array — a registered state this account cannot reach is exactly the thing no previous capture could see.`
        : `No operator-level term appears anywhere in the ${OUT.states.length} states this build registers. On the application's own self-description, the control plane is not part of this bundle. This is stronger than the absence of a screenshot, and it is still a statement about THIS BUILD as served to THIS ACCOUNT — not proof that PTR operates without one.`
  };

  /* ─── download ──────────────────────────────────────────────────────────── */

  const stamp = OUT.capturedAt.slice(0, 19).replace(/[:T]/g, '-');
  const filename = `control-plane-${stamp}.json`;
  const url = URL.createObjectURL(new Blob([JSON.stringify(OUT, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);

  console.log(
    `\n%cDONE — downloaded ${filename}`,
    'font-weight:bold;font-size:14px;color:#0a0',
    `\n  router          : ${OUT.router.kind ?? 'NOT FOUND'} (${OUT.router.how})`,
    `\n  states          : ${OUT.states.length}`,
    `\n  modules         : ${Object.keys(OUT.modules).length}`,
    `\n  census usable   : ${OUT.census.trustworthy ? 'yes' : 'NO — controls failed'}`,
    `\n  operator terms  : ${operatorHits.length ? operatorHits.join(', ') : 'none in the route registry'}`,
    `\n  panes captured  : ${Object.entries(OUT.panes).filter(([, v]) => v).length}`,
    `\n  refused clicks  : ${OUT.refusedClicks.length}`,
    `\n  gaps            : ${OUT.gaps.length}`
  );
  console.log(`\n${OUT.verdict.statement}\n`);
  OUT.gaps.forEach((g) => console.log('  · ' + g));
  console.log('\nSend me the downloaded file.');
})();
