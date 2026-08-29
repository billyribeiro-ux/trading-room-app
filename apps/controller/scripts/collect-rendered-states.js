/**
 * collect-rendered-states.js — closes T2-7, T2-20 and T2-22 of the evidence gap register.
 *
 * Paste into the Chrome console on the LIVE protradingroom.com and press Enter. It downloads
 * `rendered-states-<timestamp>.json` immediately, then keeps watching for two minutes and downloads
 * a SECOND file if a dialog or a login error appears while you work. No terminal command, no
 * follow-up call.
 *
 * ## The three gaps, and why each needs a RENDER rather than a source read
 *
 * Everything in the templates has now been read. What is left cannot be read at all, because it only
 * exists once a browser has laid the page out or a user has done something:
 *
 *   T2-7   `table-striped` alternation and hover — WHICH rows stripe in a populated table, and what
 *          `:hover` actually computes to. Needs 2+ rooms and 4+ users on screen.
 *   T2-20  bootbox dialogs beyond the badge prompt. They exist only while open.
 *   T2-22  the login form's rendered geometry, and the failed-login ERROR state.
 *
 * ## What it will not do — read this before running it
 *
 * **It never submits a form and it never logs in.** The failed-login state in T2-22 is reached by
 * getting a password wrong, and a script that did that on your production site could lock an
 * account. So this script does not attempt it: it WATCHES, and if you trigger an error yourself it
 * captures what appears. Same for dialogs — it opens nothing, it snapshots what you open.
 *
 * A hard denylist guards the one place a click could happen at all (`safeClick`, unused by the
 * automatic phases and present so any future addition inherits it). The word list is applied to
 * camelCase-SPLIT text, because `\bdelete\b` does not match `deleteParticipant` — a hole found in
 * `collect-manage-gaps.js` on 2026-08-13 that had been live for every run before it.
 *
 * **Personal data is redacted to its SHAPE.** Emails, long digit runs and anything named like a
 * credential become `«email 21 chars»`. A room's chat and roster are full of real names, and this
 * file is meant to be shareable.
 */

(async () => {
  'use strict';

  const OUT = {
    tool: 'collect-rendered-states.js',
    closes: 'T2-7 (striping/hover), T2-20 (bootbox variants), T2-22 (login form + error state)',
    capturedAt: new Date().toISOString(),
    pageUrl: location.href,
    userAgent: navigator.userAgent,
    viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
    role: null,
    striping: null,
    bootbox: { handlers: {}, templatesFetched: [], observed: [] },
    login: null,
    observedErrors: [],
    refusedClicks: [],
    gaps: [],
    notes: []
  };

  const gap = (what, where, blocks) => {
    OUT.gaps.push({ what, whereILooked: where, blocks });
    console.warn('[gap]', what);
  };
  const note = (t) => {
    OUT.notes.push(t);
    console.log('[note]', t);
  };

  /* ─── redaction ─────────────────────────────────────────────────────────── */

  const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const LONG_DIGITS = /\b\d{9,}\b/g;
  const SECRET_NAME = /secret|password|\bpw\b|token|apikey|api_key|\bkey\b|jwt|bearer/i;

  const redact = (v) => {
    if (v == null) return v;
    return String(v)
      .replace(EMAIL, (m) => `«email ${m.length} chars»`)
      .replace(LONG_DIGITS, (m) => `«digits ${m.length}»`);
  };

  /* ─── the guard ─────────────────────────────────────────────────────────── */

  const DENY =
    /\b(delete|remove|upload|play|stop|send|save|submit|post|kick|ban|mute|reset|clear|wipe|create|add|invite|logout|signout|charge|refund|cancel|pay)\b/i;

  /**
   * Splits camelCase so the word list can see inside an identifier.
   * `\bdelete\b` does not match `deleteParticipant` — `d` and `P` are both word characters. Every
   * handler in this codebase is camelCase, so without this the guard is decorative.
   */
  const splitCamel = (s) => String(s).replace(/([a-z0-9])([A-Z])/g, '$1 $2');

  /** Present so any future click inherits the guard. The automatic phases below call nothing. */
  // The TypeScript-aware rule is the one that fires here; the base `no-unused-vars` is switched off
  // by the shared config, so naming it suppressed nothing AND was itself reported as a stale directive.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function safeClick(el, why) {
    if (!el) return false;
    const desc = splitCamel(
      [el.textContent, el.getAttribute?.('title'), el.getAttribute?.('ng-click'), el.className].join(' ')
    );
    if (DENY.test(desc)) {
      OUT.refusedClicks.push({ why, matched: (desc.match(DENY) || [])[0] ?? null });
      return false;
    }
    el.click();
    return true;
  }

  /* ─── serialisation ─────────────────────────────────────────────────────── */

  const STYLE_PROPS = [
    'display',
    'position',
    'width',
    'height',
    'margin',
    'padding',
    'border',
    'border-top',
    'border-bottom',
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'color',
    'background-color',
    'background-image',
    'text-align',
    'box-shadow',
    'border-radius',
    'z-index',
    'opacity',
    'visibility'
  ];
  const computed = (el) => {
    const cs = getComputedStyle(el);
    const out = {};
    for (const p of STYLE_PROPS) out[p] = cs.getPropertyValue(p);
    return out;
  };

  let crossOrigin = 0;
  /**
   * Every CSS rule that MATCHES this element, with its sheet.
   *
   * This is what makes "`:hover` computes to X" provable without synthesising a hover — a synthetic
   * MouseEvent does NOT trigger `:hover`, so a computed snapshot taken after one is just the resting
   * style. The RULES are the evidence; `hoverRules` below filters to them.
   */
  function matchingRules(el) {
    const found = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        crossOrigin++;
        continue;
      }
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        if (!rule.selectorText) continue;
        try {
          /* `:hover` never matches during a scripted read, so test the element against the selector
             with the pseudo-class stripped, and record the ORIGINAL selector. */
          const bare = rule.selectorText.replace(/:hover|:focus|:active/g, '');
          if (bare.trim() && el.matches(bare)) {
            found.push({ selector: rule.selectorText, css: rule.style.cssText, href: sheet.href });
          }
        } catch {
          /* a selector this browser cannot evaluate */
        }
      }
    }
    return found;
  }

  const describe = (el, withRules = true) => {
    const r = el.getBoundingClientRect();
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      class: el.getAttribute('class') || null,
      text: redact((el.textContent || '').trim().slice(0, 200)),
      attrs: Object.fromEntries(
        Array.from(el.attributes).map((a) => [a.name, SECRET_NAME.test(a.name) ? '«redacted»' : redact(a.value)])
      ),
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      computed: computed(el),
      rules: withRules ? matchingRules(el) : undefined
    };
  };

  /* ─── role ──────────────────────────────────────────────────────────────── */

  const bodyText = document.body.innerText || '';
  OUT.role = /Extra Admin Users/i.test(bodyText)
    ? 'account owner / admin'
    : /Actions With Selected|User List Actions/i.test(bodyText)
      ? 'presenter or admin on the manage page'
      : /login|sign in/i.test(bodyText)
        ? 'LOGGED OUT (or a login page) — which is what T2-22 needs'
        : 'unknown';
  console.log('[role]', OUT.role);

  /* ══════════════════════════════════════════════════════════════════════════
     T2-7 — striping and hover, measured on whatever table is on screen
     ══════════════════════════════════════════════════════════════════════════ */

  const tables = Array.from(document.querySelectorAll('table')).filter((t) =>
    /table-striped|acc-table/.test(t.className)
  );

  if (tables.length === 0) {
    gap(
      'No striped table is on screen, so alternation could not be measured.',
      ['every <table> whose class matches /table-striped|acc-table/'],
      'T2-7. Open the account page (room list) or a manage Users tab with rows and re-run.'
    );
  } else {
    OUT.striping = tables.map((table) => {
      const rows = Array.from(table.querySelectorAll(':scope > tbody > tr'));
      return {
        tableClass: table.className,
        tableRect: (({ x, y, width, height }) => ({ x, y, w: width, h: height }))(table.getBoundingClientRect()),
        rowCount: rows.length,
        /*
          `nth-of-type` counts EVERY `<tr>`, including ones hidden by `ng-hide`/`hidden` — which is
          why a filtered table bands irregularly in the reference and is not a bug (T5-12). Both the
          index and the visibility are recorded so the pattern can be read rather than guessed.
        */
        rows: rows.map((tr, i) => ({
          index: i,
          nthOfType: i + 1,
          odd: (i + 1) % 2 === 1,
          hidden:
            tr.hasAttribute('hidden') || /\bng-hide\b/.test(tr.className) || getComputedStyle(tr).display === 'none',
          backgroundColor: getComputedStyle(tr).backgroundColor,
          height: tr.getBoundingClientRect().height
        })),
        /* The `:hover` rules that MATCH these rows. A synthetic MouseEvent does not trigger :hover,
           so the rule is the evidence, not a computed snapshot. */
        hoverRules: rows.length ? matchingRules(rows[0]).filter((r) => /:hover/.test(r.selector)) : [],
        stripeRules: rows.length ? matchingRules(rows[0]).filter((r) => /nth-of-type|nth-child/.test(r.selector)) : []
      };
    });
    const totalRows = OUT.striping.reduce((n, t) => n + t.rowCount, 0);
    console.log(`[T2-7] ${tables.length} striped table(s), ${totalRows} row(s)`);
    if (totalRows < 4) {
      gap(
        `Only ${totalRows} row(s) on screen — the register asks for 2+ rooms and 4+ users to read the alternation.`,
        ['tbody > tr of every striped table'],
        totalRows === 0
          ? /* Said plainly, because the old wording claimed the rules "are still valid" at zero
               rows — they are not. `hoverRules` and `stripeRules` are matched against `rows[0]`, so
               with no rows NOTHING was captured for T2-7 and the empty arrays above are absence,
               not evidence of absence. A run on a table with rows is required. */
            'ALL of T2-7. With zero rows the rule arrays are empty because there was no row to match them against — nothing was captured here.'
          : 'the ALTERNATION half of T2-7. The per-row values and rules captured above are still valid.'
      );
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     T2-20 — bootbox. Handlers read off the scope; dialogs observed, never opened
     ══════════════════════════════════════════════════════════════════════════ */

  const ng = window.angular;
  if (!ng) {
    gap(
      'window.angular is absent — no scope to read bootbox handlers from.',
      ['window.angular'],
      'the handler half of T2-20.'
    );
  } else {
    /*
      ANCHOR DEEP, then walk up. This used to be

          ng.element(document.querySelector('[ng-controller], .ng-scope') || document.body).scope()

      and it could never work. `querySelector` returns the FIRST match in document order, which is
      the outermost `.ng-scope` — effectively the root scope — and the loop below then walks UPWARD
      via `$parent`, away from the controller that defines these handlers. On 2026-08-14 it reported
      0 of 15 found on a manage page where `collect-stripe-details.js` had captured
      `openStripeDetails` and `doBatchInvite` in full three minutes earlier. That was this script,
      not the page.

      `collect-stripe-details.js` gets it right by anchoring on a ROW (`tr[ng-repeat]`) — deep inside
      the controller — so walking `$parent` climbs INTO it. This now collects every distinct scope
      reachable from a set of anchors, deepest-yielding first, and tries each. Deduped by `$id`
      because `.ng-scope` matches hundreds of elements sharing a handful of scopes.
    */
    const seenScopeIds = new Set();
    const scopes = [];
    for (const el of document.querySelectorAll(
      'tr[ng-repeat], tbody tr, table.table-striped, [ng-controller], .ng-scope'
    )) {
      try {
        const s = ng.element(el).scope();
        if (s && !seenScopeIds.has(s.$id)) {
          seenScopeIds.add(s.$id);
          scopes.push(s);
        }
      } catch {
        /* not inside an Angular tree — skip it rather than abort the phase */
      }
    }
    OUT.bootbox.scopesSearched = scopes.length;
    if (!scopes.length) {
      gap(
        'angular.element(…).scope() returned nothing — debug info disabled.',
        ['.ng-scope', '[ng-controller]'],
        'the handler half of T2-20.'
      );
    } else {
      /* Named rather than enumerated blindly: these are the handlers the templates show opening a
         dialog. Their SOURCE names the template and the buttons, which is the thing T2-20 wants. */
      const WANTED = [
        'manageBadges',
        'updateManyUsersBadgePrompt',
        'setNoteUser',
        'editUsername',
        'setUserPW',
        'doInvite',
        'doBatchInvite',
        'setPermissions',
        'manageApiKeyRestrictions',
        'openStripeDetails',
        'showAlerterAppTokens',
        'getFCMTokens',
        'manageMarketplaceSession',
        'setCustomRoomURL',
        'createNew'
      ];
      for (const name of WANTED) {
        let hit = null;
        for (const start of scopes) {
          let owner = start;
          let depth = 0;
          /* Bounded at 25 like `collect-stripe-details.js`: an unbounded `$parent` walk on a
             detached or cyclic scope hangs the console, and no real scope chain is that deep. */
          while (owner && typeof owner[name] !== 'function' && depth < 25) {
            owner = owner.$parent;
            depth++;
          }
          if (owner && typeof owner[name] === 'function') {
            hit = { owner, depth };
            break;
          }
        }
        OUT.bootbox.handlers[name] = hit
          ? {
              found: true,
              scopeId: hit.owner.$id,
              scopeDepth: hit.depth,
              source: redact(String(hit.owner[name]))
            }
          : { found: false };
      }
      const found = Object.values(OUT.bootbox.handlers).filter((h) => h.found).length;
      console.log(`[T2-20] ${found}/${WANTED.length} dialog handlers read off the scope`);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     T2-22 — the login form, if this page has one
     ══════════════════════════════════════════════════════════════════════════ */

  /*
    "A form with a password field" is NOT a login form, and on 2026-08-14 that fallback reported
    `loginFormCaptured: true` for the **Add Admin User** form on the welcome page — `ng-submit`
    of `addAdminUser()`, models `adminUser.name` / `.email` / `.password`, buttons "Add Admin User"
    and "Cancel". Everything about the capture was accurate; the LABEL on it was false, which is
    worse than capturing nothing, because it would have closed T2-22 on the wrong form.

    So a password field is now necessary but not sufficient. A login form is one that submits a
    LOGIN, and every other candidate on these pages announces itself in `ng-submit`/`ng-click` as
    doing something else. Rejecting by intent keeps this honest without hardcoding a selector the
    next redesign would break.
  */
  const NOT_LOGIN = /addAdminUser|register|signup|forgot|reset|invite|changePassword|updateUser/i;
  const looksLikeLogin = (f) => {
    if (!f.querySelector('input[type="password"]')) return false;
    const intent = `${f.getAttribute('ng-submit') || ''} ${f.getAttribute('action') || ''} ${f.getAttribute('name') || ''} ${f.id || ''}`;
    if (NOT_LOGIN.test(intent)) return false;
    /* A login form asks for a password and NOT for a new user's details. Two text-ish inputs beside
       the password (name AND email) is the create-a-user shape, not the sign-in shape. */
    const textish = f.querySelectorAll('input[type="text"], input[type="email"]').length;
    return textish <= 1;
  };

  const loginForm =
    document.querySelector('form[name="loginForm"], form#loginForm') ||
    Array.from(document.querySelectorAll('form')).find(looksLikeLogin);

  if (!loginForm) {
    gap(
      'No login form on this page.',
      ['form[name="loginForm"]', 'form#loginForm', 'any form containing input[type=password]'],
      'T2-22. Log OUT and re-run on the login page — that is the state the register asks for.'
    );
  } else {
    OUT.login = {
      form: describe(loginForm),
      /* Every field and control, with geometry. Values are never read — only shapes. */
      fields: Array.from(loginForm.querySelectorAll('input, select, textarea, button, label, a')).map((el) =>
        describe(el)
      )
    };
    note('Login form captured. NOTHING was typed and NOTHING was submitted.');
    console.log('[T2-22] login form captured');
    gap(
      'The failed-login ERROR state is not captured — reaching it means submitting wrong credentials.',
      ['the form as it stands, logged out'],
      'the ERROR half of T2-22. The watcher below will capture it if YOU trigger one in the next two minutes.'
    );
  }

  if (crossOrigin) note(`${crossOrigin} stylesheet(s) unreadable (cross-origin) during rule matching.`);

  /* ─── download #1 ───────────────────────────────────────────────────────── */

  const stamp = () => new Date().toISOString().replace(/[:.]/g, '-');
  function download(obj, suffix) {
    const blob = new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rendered-states-${suffix}-${stamp()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  OUT.summary = {
    stripedTables: OUT.striping ? OUT.striping.length : 0,
    bootboxHandlers: Object.values(OUT.bootbox.handlers).filter((h) => h.found).length,
    loginFormCaptured: !!OUT.login,
    gaps: OUT.gaps.length
  };
  console.log('[summary]', OUT.summary);
  download(OUT, 'auto');
  console.log('[done] first file downloaded. Nothing was clicked, typed, submitted or sent.');

  /* ══════════════════════════════════════════════════════════════════════════
     THE WATCHER — two minutes, then it downloads a second file and stops
     ══════════════════════════════════════════════════════════════════════════ */

  console.log('[watch] 120s: open any dialog, or trigger a login error, and it will be captured.');

  const seen = new WeakSet();
  const observer = new MutationObserver(() => {
    for (const el of document.querySelectorAll('.bootbox, .modal.in, [role="dialog"]')) {
      if (seen.has(el) || el.getBoundingClientRect().height === 0) continue;
      seen.add(el);
      OUT.bootbox.observed.push({ at: new Date().toISOString(), dialog: describe(el), html: redact(el.outerHTML) });
      console.log('[watch] dialog captured:', (el.textContent || '').trim().slice(0, 60));
    }
    for (const el of document.querySelectorAll('.alert-danger, .has-error, .text-danger, [ng-show*="rror"]')) {
      if (seen.has(el) || el.getBoundingClientRect().height === 0) continue;
      seen.add(el);
      OUT.observedErrors.push({ at: new Date().toISOString(), element: describe(el) });
      console.log('[watch] error state captured:', (el.textContent || '').trim().slice(0, 60));
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style']
  });

  setTimeout(() => {
    observer.disconnect();
    OUT.watchEndedAt = new Date().toISOString();
    OUT.summary.dialogsObserved = OUT.bootbox.observed.length;
    OUT.summary.errorsObserved = OUT.observedErrors.length;
    if (!OUT.bootbox.observed.length) {
      gap(
        'No dialog opened during the 120s window.',
        ['.bootbox', '.modal.in', '[role="dialog"]'],
        'the rendered half of T2-20.'
      );
    }
    if (!OUT.observedErrors.length) {
      gap(
        'No error state appeared during the 120s window.',
        ['.alert-danger', '.has-error', '.text-danger'],
        'the ERROR half of T2-22.'
      );
    }
    download(OUT, 'watched');
    console.log('[done] second file downloaded. The watcher has stopped. Nothing was submitted.');
  }, 120_000);
})();
