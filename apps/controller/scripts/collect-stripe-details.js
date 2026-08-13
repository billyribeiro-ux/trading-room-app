/**
 * collect-stripe-details.js — closes T5-15 of docs/reference/evidence-gap-register.md
 *
 * Paste into the Chrome console on the LIVE protradingroom.com **manage page**, press Enter, and it
 * downloads `stripe-details-<timestamp>.json` by itself. No terminal command, no follow-up call,
 * no `stop()`.
 *
 * ## The one thing this is after
 *
 * The reference's user row ends its Stripe block with a link:
 *
 *     an <a> with an empty href, classes `label label-info`, an `fa-info-circle` icon, the text
 *     "Details", and an ng-click of `openStripeDetails(user)`   [page.manageSession.html:386-388]
 *
 * `openStripeDetails` is in NO DOM capture we hold, NOT in `views/page.manageSession.html`, and NOT
 * among the handlers transcribed out of `app.min.js` in `docs/reference/evidence-dumps-full-read.md`
 * (`getStripeStatusClass` and `formatStripeAmount` are there; this is not). So our rebuild renders
 * the five data labels and deliberately omits the link, because an anchor with invented contents
 * behind it — or with none — is a control whose only effect is its own presence.
 * `manage-user-row-reference-fields.test.ts` asserts its ABSENCE so it cannot be closed by guessing.
 *
 * ## Why this needs no marketplace member, and no clicks
 *
 * The obvious way to capture a modal is to find a marketplace member and click Details. That needs a
 * room that has one, and it means clicking.
 *
 * There is a better way. The manage page is AngularJS 1.3 with **debug info enabled** — the captures
 * carry 324 `ng-scope` classes — so `angular.element(el).scope()` returns the live scope, and
 * `String(scope.openStripeDetails)` returns THE FUNCTION'S OWN SOURCE. That is better evidence than
 * a screenshot of the modal: it names the template, the fields and the modal library, and it works
 * on a room with zero marketplace members.
 *
 * So PHASE 1 is a pure read — no clicks at all — and on its own it should close the gap. PHASE 2 and
 * PHASE 3 (the rendered block, then the modal) run only if the page actually has a marketplace
 * member, and are corroboration rather than the finding.
 *
 * ## What it will not do
 *
 * A hard denylist is checked before EVERY click. It never clicks delete, remove, upload, play, stop,
 * send, save, submit, post, ban, kick, clear, reset, pay or invite; it never submits a form; it
 * never mutates. Everything it opens is a disclosure — a dropdown, a tab, an info modal — and every
 * refusal is recorded in the output rather than silently skipped.
 *
 * **Personal data is redacted before it is written.** A real marketplace member is a paying customer:
 * the modal will carry their email, their Stripe ids and their payment history. Emails, `cus_`/`sub_`
 * /`pi_`/`in_` Stripe ids, long digit runs and anything named like a secret are masked to their SHAPE
 * — length and prefix — which is all the rebuild needs. The JSON is meant to be shareable.
 */

(async () => {
  'use strict';

  const OUT = {
    tool: 'collect-stripe-details.js',
    closes: 'T5-15 — openStripeDetails(user), the Stripe block’s Details link',
    capturedAt: new Date().toISOString(),
    pageUrl: location.href,
    userAgent: navigator.userAgent,
    role: null,
    roleEvidence: null,
    angular: null,
    handlers: {},
    templatesFetched: [],
    stripeBlock: null,
    modal: null,
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
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ══════════════════════════════════════════════════════════════════════════
     REDACTION — applied to every string that reaches the output
     ══════════════════════════════════════════════════════════════════════════ */

  const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const STRIPE_ID = /\b(cus|sub|pi|in|ch|card|price|prod|seti|py|re|txn|acct)_[A-Za-z0-9]{6,}\b/g;
  const LONG_DIGITS = /\b\d{9,}\b/g;
  const SECRET_NAME = /secret|password|\bpw\b|token|apikey|api_key|\bkey\b|clientid|jwt|bearer/i;

  /**
   * Masks to SHAPE, never to a fixed placeholder.
   *
   * `«email 21 chars»` still proves an email was in that position and how long it was, which is what
   * a layout rebuild needs. A bare `[REDACTED]` loses the fact that the field was populated at all,
   * and this repository's rule is that an honest gap must stay distinguishable from an empty value.
   */
  function redact(value) {
    if (value == null) return value;
    let s = String(value);
    s = s.replace(EMAIL, (m) => `«email ${m.length} chars»`);
    s = s.replace(STRIPE_ID, (m) => `«${m.slice(0, m.indexOf('_'))}_id ${m.length} chars»`);
    s = s.replace(LONG_DIGITS, (m) => `«digits ${m.length}»`);
    return s;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     THE DENYLIST — checked before every click, no exceptions
     ══════════════════════════════════════════════════════════════════════════ */

  const DENY =
    /\b(delete|remove|upload|play|stop|send|save|submit|post|ban|kick|clear|reset|launch|archive|pay|invite|email|logout|signout|destroy|drop|wipe|charge|refund|cancel)\b/i;

  /**
   * Whether an element is STRUCTURALLY incapable of mutating anything.
   *
   * Copied from `collect-manage-gaps.js`, including the reason it exists: on 2026-08-11 the word
   * denylist refused to open the menu labelled "Actions With the Email List" because `email` appears
   * in its text, and a gap stayed open over a false positive. A `data-toggle` element changes what is
   * VISIBLE and nothing else — that is the entire contract — so the exemption is by capability.
   *
   * The exemption never applies to an element carrying an `ng-click`, because that is a real handler
   * whatever the element looks like.
   */
  function isDisclosureOnly(el) {
    const toggle = (el.getAttribute('data-toggle') || el.getAttribute('data-bs-toggle') || '').toLowerCase();
    if (['dropdown', 'tab', 'collapse', 'pill', 'modal'].includes(toggle)) return true;
    if ((el.getAttribute('role') || '').toLowerCase() === 'tab') return true;
    return /\bdropdown-toggle\b/.test(String(el.className || ''));
  }

  /**
   * Splits camelCase so the word denylist can see inside an identifier.
   *
   * `\bsend\b` does NOT match inside `openStripeDetailsAndSendReceipt` — `d` and `S` are both word
   * characters, so there is no boundary between them, and the guard would have clicked it. Found by
   * the smoke test, not on the live page, which is the only reason it is not a story about a
   * production click.
   *
   * This is the same family as every other regex mistake recorded in this repository: a pattern
   * written against text nobody controls. Handler names in this codebase are camelCase by
   * convention, so the denylist has to be applied to the words rather than to the identifier.
   */
  const splitCamel = (s) => String(s).replace(/([a-z0-9])([A-Z])/g, '$1 $2');

  function safeClick(el, why) {
    if (!el) return false;
    const handler = (el.getAttribute('ng-click') || '').trim();
    const description = splitCamel(
      [
        el.textContent || '',
        el.getAttribute('title') || '',
        el.getAttribute('aria-label') || '',
        handler,
        el.id || '',
        el.className || ''
      ].join(' ')
    );

    if (DENY.test(description) && !(isDisclosureOnly(el) && !handler)) {
      OUT.refusedClicks.push({
        why,
        text: redact((el.textContent || '').trim().slice(0, 80)),
        ngClick: handler || null,
        matched: (description.match(DENY) || [])[0] ?? null
      });
      console.warn('[refused]', why, '— matched', (description.match(DENY) || [])[0]);
      return false;
    }
    el.click();
    console.log('[clicked]', why);
    return true;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     SERIALISATION — markup, computed styles, and the rules that actually match
     ══════════════════════════════════════════════════════════════════════════ */

  const STYLE_PROPS = [
    'display', 'visibility', 'position', 'width', 'height', 'margin', 'padding', 'border',
    'font-family', 'font-size', 'font-weight', 'line-height', 'color', 'background-color',
    'background-image', 'text-align', 'opacity', 'box-shadow', 'border-radius', 'overflow', 'z-index'
  ];

  function computed(el) {
    const cs = getComputedStyle(el);
    const out = {};
    for (const p of STYLE_PROPS) out[p] = cs.getPropertyValue(p);
    return out;
  }

  /**
   * Every CSS rule that MATCHES this element, with its source sheet.
   *
   * This is what makes "this class has no rule" provable rather than assumed — the finding that
   * `.stripe-mini` and `.mb-xs` are inert came from reading two stylesheets end to end, and this is
   * the runtime equivalent. A class present in `class` but absent from `rules` is proof.
   */
  function matchingRules(el) {
    const found = [];
    let crossOrigin = 0;
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
          if (el.matches(rule.selectorText)) {
            found.push({ selector: rule.selectorText, css: rule.style.cssText, href: sheet.href });
          }
        } catch {
          /* a selector this browser cannot evaluate against an element */
        }
      }
    }
    if (crossOrigin) OUT.notes.push(`${crossOrigin} stylesheet(s) unreadable (cross-origin) during rule matching`);
    return found;
  }

  function describe(el, { withRules = true, depth = 0 } = {}) {
    const r = el.getBoundingClientRect();
    const out = {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      class: el.getAttribute('class') || null,
      text: redact((el.textContent || '').trim().slice(0, 400)),
      attrs: Object.fromEntries(
        Array.from(el.attributes).map((a) => [a.name, SECRET_NAME.test(a.name) ? '«redacted»' : redact(a.value)])
      ),
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      computed: computed(el),
      rules: withRules ? matchingRules(el) : undefined
    };
    if (depth > 0) {
      out.children = Array.from(el.children).map((c) => describe(c, { withRules, depth: depth - 1 }));
    }
    return out;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     ROLE — read off the screen, not assumed
     ══════════════════════════════════════════════════════════════════════════ */

  const bodyText = document.body.innerText || '';
  const markers = {
    hasManageTable: !!document.querySelector('table.table-striped'),
    hasExtraAdminUsers: /Extra Admin Users/i.test(bodyText),
    hasActionsMenu: /Actions With Selected/i.test(bodyText),
    hasUserListActions: /User List Actions/i.test(bodyText)
  };
  OUT.roleEvidence = markers;
  OUT.role = markers.hasExtraAdminUsers
    ? 'account owner / admin — the Extra Admin Users control is on screen'
    : markers.hasActionsMenu || markers.hasUserListActions
      ? 'presenter or admin on the manage page — bulk actions visible, no Extra Admin Users'
      : 'UNKNOWN or member — none of the manage-page admin markers are on screen';
  console.log('[role]', OUT.role);

  if (!markers.hasManageTable) {
    gap(
      'The manage user table is not on this page, so nothing below could run.',
      ['document.querySelector("table.table-striped")'],
      'everything — open a room’s manage page (Users tab) and re-run'
    );
  }

  /* ══════════════════════════════════════════════════════════════════════════
     PHASE 1 — THE HANDLER SOURCE. Zero clicks. This is the finding.
     ══════════════════════════════════════════════════════════════════════════ */

  const ng = window.angular;
  OUT.angular = ng
    ? { present: true, version: (ng.version && ng.version.full) || null, debugInfoEnabled: null }
    : { present: false };

  if (!ng) {
    gap(
      'window.angular is absent, so no scope can be reached and the handler source cannot be read.',
      ['window.angular'],
      'PHASE 1 — the whole point of this script. Check that this is the AngularJS manage page and not the Angular 17 room.'
    );
  } else {
    /*
      Walk UP from a row rather than guessing at the root scope. `openStripeDetails` is called from
      inside `ng-repeat="user in xrefs"`, so it lives on that repeat's scope or on one of its
      parents. Starting at the row and walking the `$parent` chain finds it wherever it is defined
      AND records WHICH scope owns it, which the root alone would not.
    */
    const anchorEl =
      document.querySelector('tr[ng-repeat] , tbody tr') ||
      document.querySelector('table.table-striped') ||
      document.body;

    let scope = null;
    try {
      scope = ng.element(anchorEl).scope();
      OUT.angular.debugInfoEnabled = !!scope;
    } catch (e) {
      OUT.angular.scopeError = String(e);
    }

    if (!scope) {
      gap(
        'angular.element(row).scope() returned nothing — debug info is disabled on this build.',
        ['angular.element(tr[ng-repeat]).scope()', 'angular.element(table).scope()'],
        'PHASE 1. Fall back to PHASE 3 (click Details on a marketplace member) — that still works without scopes.'
      );
    } else {
      /*
        Every handler worth having, not just the one. `getStripeStatusClass` and `formatStripeAmount`
        are already transcribed in the full-read doc, and capturing them again is deliberate: they
        are the CONTROL. If this script's copies match what was transcribed by hand from the minified
        bundle, the transcription method is validated and `openStripeDetails` — read the same way —
        can be trusted. If they differ, the transcription is wrong and that is the more urgent
        finding.
      */
      const WANTED = [
        'openStripeDetails',
        'getStripeStatusClass',
        'formatStripeAmount',
        'openStripeModal',
        'showStripeDetails',
        'stripeDetails',
        'loadMarketplaceUsers',
        /*
          Added 2026-08-13 for T5-21. `page.manageSession.html:178-182` shows a "Batch User Invite"
          menu item gated on `sess.authMode === 'unamePW'`, calling `doBatchInvite()`. The item is
          captured; the prompt it opens is not in any template or capture. Same read, same trip.
        */
        'doBatchInvite',
        'actionsWithEmailList',
        'canCloneDblClick'
      ];

      for (const name of WANTED) {
        let owner = scope;
        let depth = 0;
        while (owner && typeof owner[name] !== 'function') {
          owner = owner.$parent;
          depth++;
        }
        if (owner && typeof owner[name] === 'function') {
          OUT.handlers[name] = {
            found: true,
            definedOnScopeDepth: depth,
            scopeId: owner.$id ?? null,
            source: redact(String(owner[name]))
          };
          console.log(`[handler] ${name} — found ${depth} scope(s) up`);
        } else {
          OUT.handlers[name] = { found: false };
          if (name === 'openStripeDetails') {
            gap(
              'openStripeDetails is not a function on the row scope or any ancestor.',
              ['the $parent chain from the first tbody row, to the root'],
              'T5-15. It may be named differently — every scope key matching /stripe/i is listed under handlers.scopeKeysMatchingStripe.'
            );
          }
        }
      }

      /*
        If the expected name is absent, do not give up and do not guess — enumerate. A key list is
        evidence; a guessed handler name is not.
      */
      const stripeKeys = [];
      let walk = scope;
      let up = 0;
      while (walk && up < 25) {
        for (const k of Object.keys(walk)) {
          if (/stripe|marketplace|subscription/i.test(k)) {
            stripeKeys.push({ key: k, scopeDepth: up, type: typeof walk[k] });
          }
        }
        walk = walk.$parent;
        up++;
      }
      OUT.handlers.scopeKeysMatchingStripe = stripeKeys;
      console.log(`[scope] ${stripeKeys.length} key(s) matching /stripe|marketplace|subscription/`);
    }
  }

  /*
    If the handler source names a template, FETCH IT. `openStripeDetails` almost certainly opens a
    modal, and in this codebase that means either a `templateUrl` or an inline `template:`. The
    templateUrl is the actual markup of the thing T5-15 is missing, so following that reference is
    the difference between "we know a modal opens" and "we can rebuild it".

    Read-only GETs for `.html` under the app's own origin, nothing else.
  */
  const handlerSource = Object.values(OUT.handlers)
    .filter((h) => h && h.found)
    .map((h) => h.source)
    .join('\n');

  if (handlerSource) {
    const urls = new Set();
    for (const m of handlerSource.matchAll(/["'`]([^"'`]*\.html)["'`]/g)) urls.add(m[1]);
    for (const url of urls) {
      if (DENY.test(new URL(url, location.origin).pathname)) {
        OUT.refusedClicks.push({ why: `fetch template ${url}`, matched: 'denylist on path' });
        continue;
      }
      try {
        const res = await fetch(new URL(url, location.origin).href, { credentials: 'same-origin', cache: 'no-store' });
        const text = await res.text();
        /*
          SOFT-404 GUARD — this server answers missing files with HTTP 200 and a 52-byte
          "this is not the page you are looking for" body, so `res.ok` is true for a file that does
          not exist. Recorded as an honest gap rather than as a successful capture of a 404 page.
        */
        const soft404 = text.length < 4096 && /this is not the page you are looking for/i.test(text);
        OUT.templatesFetched.push({
          url,
          status: res.status,
          bytes: text.length,
          ok: res.ok && !soft404,
          softNotFound: soft404,
          text: soft404 ? null : redact(text)
        });
        console.log(`[template] ${url} — ${soft404 ? 'SOFT 404' : `${text.length} B`}`);
        /*
          A soft 404 on the modal's own template is a GAP, not merely a failed fetch. The handler
          named this file, so it is the markup T5-15 is missing; the server answering 200 with its
          "not the page you are looking for" body means it is not deployed at that path. Recorded in
          `gaps[]` so it shows up where gaps are read, rather than only as a false-ish flag buried in
          `templatesFetched`.
        */
        if (soft404) {
          gap(
            `The modal template named by the handler (${url}) is NOT deployed — HTTP 200 with the server's soft-404 body.`,
            [`GET ${new URL(url, location.origin).href}`],
            'the modal MARKUP. The handler source is still captured, so the fields and the modal library are known; only the template is missing.'
          );
        } else if (!res.ok) {
          gap(
            `The modal template named by the handler (${url}) returned HTTP ${res.status}.`,
            [`GET ${new URL(url, location.origin).href}`],
            'the modal markup.'
          );
        }
      } catch (e) {
        OUT.templatesFetched.push({ url, ok: false, error: String(e) });
      }
    }
    if (!urls.size) note('The handler source names no .html template — the modal is likely inline (bootbox/`template:`), so its markup is in the source string itself.');
  }

  /* ══════════════════════════════════════════════════════════════════════════
     PHASE 2 — the rendered Stripe block, if this room has a marketplace member
     ══════════════════════════════════════════════════════════════════════════ */

  const block = document.querySelector('.stripe-mini');
  if (!block) {
    gap(
      'No .stripe-mini block is rendered, so this room has no marketplace member on screen.',
      ['document.querySelector(".stripe-mini")'],
      'PHASES 2 and 3 only. PHASE 1 above does not need one. To capture the rendered modal too, open a room that HAS a marketplace member (User List Actions → Marketplace Users) and re-run.'
    );
  } else {
    OUT.stripeBlock = describe(block, { depth: 3 });
    /*
      Proof about the two inert classes, taken at runtime. `.stripe-mini` and `.mb-xs` were found to
      have no rule by reading `styles.css` (218 KB) and `theme.css` (233 KB) end to end. If either
      appears in `rules` here, that reading was incomplete and our `mg-stripe-mini` replacement is
      wrong.
    */
    const selectors = OUT.stripeBlock.rules.map((r) => r.selector).join(' ');
    OUT.stripeBlock.inertClassCheck = {
      'stripe-mini': /\.stripe-mini\b/.test(selectors) ? 'HAS A RULE — our reading was incomplete' : 'no matching rule, as read',
      'mb-xs': /\.mb-xs\b/.test(selectors) ? 'HAS A RULE — our reading was incomplete' : 'no matching rule, as read'
    };
    console.log('[stripe-mini]', OUT.stripeBlock.inertClassCheck);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     PHASE 3 — the rendered modal. One click, denylist-checked, disclosure only.
     ══════════════════════════════════════════════════════════════════════════ */

  const detailsLink = block
    ? Array.from(block.querySelectorAll('a')).find(
        (a) =>
          /openStripeDetails/.test(a.getAttribute('ng-click') || '') ||
          /^\s*Details\s*$/i.test(a.textContent || '')
      )
    : null;

  if (block && !detailsLink) {
    gap(
      'A .stripe-mini block is present but contains no Details anchor.',
      ['every <a> inside .stripe-mini, by ng-click and by text'],
      'PHASE 3. The block may be a variant that omits it — its full markup is in stripeBlock above.'
    );
  }

  if (detailsLink) {
    OUT.modal = { linkMarkup: describe(detailsLink, { depth: 1 }) };
    const before = new Set(Array.from(document.querySelectorAll('.modal, .bootbox, [role="dialog"]')));

    if (safeClick(detailsLink, 'open the Stripe Details modal — read-only disclosure')) {
      /* Poll rather than sleep once: a modal with a fade transition is not in the DOM immediately,
         and a fixed wait either races it or wastes time. */
      let dialog = null;
      for (let i = 0; i < 30 && !dialog; i++) {
        await sleep(100);
        dialog = Array.from(document.querySelectorAll('.modal, .bootbox, [role="dialog"]')).find(
          (d) => !before.has(d) && d.getBoundingClientRect().height > 0
        );
      }

      if (!dialog) {
        gap(
          'The Details link was clicked and no new dialog appeared within 3 seconds.',
          ['.modal', '.bootbox', '[role="dialog"]', 'polled 30x100ms'],
          'PHASE 3. The handler source in PHASE 1 is still the authoritative answer.'
        );
      } else {
        OUT.modal.dialog = describe(dialog, { depth: 6 });
        OUT.modal.outerHTML = redact(dialog.outerHTML);
        note('Modal captured. It was NOT dismissed by this script — close it yourself; nothing was submitted.');
        console.log('[modal] captured');
      }
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     DOWNLOAD
     ══════════════════════════════════════════════════════════════════════════ */

  OUT.summary = {
    handlerFound: !!(OUT.handlers.openStripeDetails && OUT.handlers.openStripeDetails.found),
    templatesFetched: OUT.templatesFetched.filter((t) => t.ok).length,
    stripeBlockRendered: !!OUT.stripeBlock,
    modalCaptured: !!(OUT.modal && OUT.modal.dialog),
    gaps: OUT.gaps.length,
    refusedClicks: OUT.refusedClicks.length,
    verdict:
      OUT.handlers.openStripeDetails && OUT.handlers.openStripeDetails.found
        ? 'T5-15 CLOSED — openStripeDetails source captured.'
        : 'T5-15 STILL OPEN — read the gaps array; nothing was guessed to fill it.'
  };
  console.log('[summary]', OUT.summary);

  const blob = new Blob([JSON.stringify(OUT, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `stripe-details-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  console.log('[done] downloaded. Nothing was submitted, mutated or sent.');
})();
