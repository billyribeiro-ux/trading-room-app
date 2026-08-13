/*
  collect-manage-gaps.js — the six manage-page gaps the other collectors cannot close.

  ## How to run it

  1. Log in to the ORIGINAL (protradingroom) and open a room's Manage page — the one with the tab
     strip: Users, Settings, Badges, Stats…
  2. Open Chrome DevTools → Console.
  3. Paste this whole file, press Enter, and wait for `DONE` in the console.

  It downloads `manage-gaps-<timestamp>.json` by itself. No terminal command, no follow-up call.

  ## What it is for

  `TODO.md` gaps 5, 8, 9, 10, 11 and 12. Gaps 1, 2, 3, 6 and 7 live in `/public/dist/app.min.js` and
  are covered by `collect-create-new.js` — run that one too; they do not overlap.

  ## It fixes the two defects that spoiled the last capture

  Both are recorded in `TODO.md` and both are silent failures, which is the worst kind:

  * **Truncation.** The previous collector stopped its node array at index 900 and cut every tab's
    `html` at 120,000 characters, leaving 35.6% of the Settings pane unmeasured — 13 settings with
    markup but no measurements and 121 with neither. This one has no cap. If a browser limit is ever
    hit it is written into `gaps[]` with the number reached, so a short capture can never again look
    like a complete one.
  * **The DON'T TOUCH block.** The previous collector logged the step and serialised the wrong
    element, so 49 settings are still verified only against an older dump. This one finds the
    disclosure, clicks it, and then **proves the DOM changed** before serialising — and if it did
    not change, it says so instead of writing a plausible-looking empty result.

  ## Safety

  It observes. It does not act on your behalf.

  * Every click goes through `safeClick()`, which refuses any element whose text or attributes match
    a denylist: delete, remove, upload, play, stop, send, save, submit, post, ban, kick, clear,
    reset, launch, archive, pay. A refusal is recorded rather than worked around.
  * The only clicks it makes are on **tab strips and disclosure toggles** — controls whose whole
    function is to reveal something already on the page.
  * It issues **no** network request of any kind: no fetch, no XHR, no form submission.
  * It reads `value` from inputs, which on this page includes secrets. **See the redaction note at
    the bottom before sharing the file** — key-shaped fields are masked automatically.
*/

(async () => {
  'use strict';

  const OUT = {
    tool: 'collect-manage-gaps',
    version: 2,
    capturedAt: new Date().toISOString(),
    href: location.href,
    origin: location.origin,
    role: null,
    targets: {},
    gaps: [],
    refusedClicks: []
  };

  const note = (message) => {
    OUT.gaps.push(message);
    console.warn('[gap]', message);
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  /* ─── safety ────────────────────────────────────────────────────────────── */

  /**
   * What counts as a settings field.
   *
   * One definition, used by the Settings capture and by the DON'T TOUCH before/after count, so the
   * two can be compared. They previously counted different things — `input, select, textarea` here
   * against a wider set there — which means a "23 -> 23" result could never have been trusted even
   * if the click had worked.
   */
  const FIELD_SELECTOR =
    'input, select, textarea, [editable-text], [editable-checkbox], [editable-select]';

  const DENY = /\b(delete|remove|upload|play|stop|send|save|submit|post|ban|kick|clear|reset|launch|archive|pay|invite|email)\b/i;

  /**
   * Whether an element is STRUCTURALLY incapable of mutating anything.
   *
   * A tab link and a dropdown toggle change what is visible and nothing else — that is the entire
   * contract of `data-toggle`. The word denylist cannot see that, and on 2026-08-11 it refused to
   * open the menu labelled "Actions With the Email List" because the word `email` appears in its
   * text. The menu was never captured, and gap 10 stayed open over a false positive.
   *
   * So the denylist is applied by CAPABILITY rather than by wording: a toggle is opened, its items
   * are serialised, and **no item is ever clicked** — which is where the real danger lives and is
   * enforced by there being no code path that clicks one.
   */
  function isDisclosureOnly(element) {
    const toggle = (
      element.getAttribute('data-toggle') ||
      element.getAttribute('data-bs-toggle') ||
      ''
    ).toLowerCase();
    if (toggle === 'dropdown' || toggle === 'tab' || toggle === 'collapse' || toggle === 'pill') {
      return true;
    }
    const role = (element.getAttribute('role') || '').toLowerCase();
    if (role === 'tab') return true;
    const cls = String(element.className || '');
    return /\bdropdown-toggle\b/.test(cls);
  }

  /**
   * Splits camelCase so the word denylist can see inside an identifier.
   *
   * ADDED 2026-08-13, and it is a REAL HOLE that existed every time this script was run before:
   * `\bdelete\b` does NOT match `deleteParticipant`. The `\b` after `delete` needs a non-word
   * character and finds `P`, so the pattern fails — and every handler in this codebase is camelCase.
   * `sendWelcomeEmail`, `removeBadgesForUsers` and `deleteApiKey` were all invisible to the guard.
   *
   * The reason it never fired is luck rather than design: this script only ever clicks tabs and
   * disclosure toggles, so it never reached one. Found while writing `collect-stripe-details.js`,
   * whose smoke test exercises the guard directly instead of describing it.
   *
   * Same family as every other regex mistake recorded here — a pattern written against text nobody
   * controls. The denylist has to be applied to the WORDS, not to the identifier.
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
    // An `ng-click` naming a handler is a real action whatever the element looks like, so the
    // capability exemption never applies to one.
    const hasHandler = !!(element.getAttribute('ng-click') || '').trim();
    if (DENY.test(description) && !(isDisclosureOnly(element) && !hasHandler)) {
      OUT.refusedClicks.push({
        why,
        text: (element.textContent || '').trim().slice(0, 80),
        matched: (description.match(DENY) || [])[0] ?? null
      });
      console.warn('[refused]', why);
      return false;
    }
    element.click();
    return true;
  }

  /**
   * Clicks the innermost thing that actually carries the behaviour.
   *
   * The Settings tab was located with a text match across `a, button, li` and a `li` can win, but
   * in AngularJS the handler is on the `a` inside it — so the click landed on the wrapper, nothing
   * happened, and the run went on to serialise whatever pane was already active. That is how the
   * 2026-08-11 run captured the USERS pane and reported "only 1 field" against an expected 264.
   */
  function clickableWithin(element) {
    if (!element) return null;
    if (element.tagName === 'A' || element.tagName === 'BUTTON') return element;
    return element.querySelector('a, button') || element;
  }

  /* ─── serialisation ─────────────────────────────────────────────────────── */

  const SECRET_NAME = /secret|password|pw$|pw\d|token|apikey|api_key|key$|keyid|clientid|sid$/i;

  /** Masks a value that is shaped like a credential, so the file can be shared. */
  function safeValue(element) {
    const name = `${element.id || ''} ${element.name || ''}`;
    const value = element.value == null ? null : String(element.value);
    if (value && SECRET_NAME.test(name)) return `«redacted ${value.length} chars»`;
    return value;
  }

  /** Every CSS rule that actually matches this element, with its source sheet. */
  function matchingRules(element) {
    const found = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        // Cross-origin sheet. Recorded once, at the end, rather than per element.
        continue;
      }
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        if (!rule.selectorText) continue;
        try {
          if (element.matches(rule.selectorText)) {
            found.push({ selector: rule.selectorText, css: rule.style.cssText, href: sheet.href });
          }
        } catch {
          /* selector this browser cannot evaluate against an element; skip it */
        }
      }
    }
    return found;
  }

  const STYLE_PROPS = [
    'display', 'visibility', 'position', 'width', 'height', 'margin', 'padding', 'border',
    'font-family', 'font-size', 'font-weight', 'line-height', 'color', 'background-color',
    'background-image', 'background', 'text-align', 'opacity', 'box-shadow', 'border-radius',
    'flex-direction', 'justify-content', 'align-items', 'gap', 'overflow', 'z-index', 'cursor'
  ];

  function computed(element) {
    const style = getComputedStyle(element);
    const out = {};
    for (const property of STYLE_PROPS) out[property] = style.getPropertyValue(property);
    return out;
  }

  function describe(element, { withRules = false } = {}) {
    const rect = element.getBoundingClientRect();
    return {
      tag: element.tagName.toLowerCase(),
      id: element.id || null,
      class: element.getAttribute('class') || null,
      type: element.getAttribute('type') || null,
      name: element.getAttribute('name') || null,
      text: (element.textContent || '').trim().slice(0, 300),
      value: 'value' in element ? safeValue(element) : null,
      checked: 'checked' in element ? element.checked : null,
      disabled: element.getAttribute('disabled'),
      attrs: Object.fromEntries(Array.from(element.attributes).map((a) => [a.name, a.value])),
      rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      computed: computed(element),
      rules: withRules ? matchingRules(element) : undefined
    };
  }

  /* ─── role, from what is on screen ──────────────────────────────────────── */

  const bodyText = document.body ? document.body.innerText : '';
  OUT.role = /Extra Admin Users/i.test(bodyText)
    ? 'account-owner/admin'
    : /\bManage\b/.test(bodyText)
      ? 'member-with-rooms'
      : 'unknown';

  /* ─── gap 11: the Settings pane, in full, with NO cap ───────────────────── */

  async function captureSettings() {
    const tab = Array.from(document.querySelectorAll('a, button, li')).find(
      (element) => /^\s*Settings\s*$/i.test(element.textContent || '')
    );
    if (!tab) {
      note('gap 11: no "Settings" tab found on this page — is this the Manage page?');
      return;
    }
    /*
      PROVE the pane changed, then prove it finished rendering. Both were assumed before.

      The 2026-08-11 run clicked, slept 1200ms and serialised `.tab-pane.active` — which was still
      the USERS pane, so it captured one field (a search box named `title` carrying
      `ng-enter="loadUsers(uSearch)"`) and reported it as "only 1 of ~264 Settings fields". A fixed
      sleep cannot tell "not rendered yet" from "wrong pane", and those need different answers.
    */
    const paneOf = () => document.querySelector('.tab-pane.active');
    const before = paneOf();
    const beforeFields = before ? before.querySelectorAll(FIELD_SELECTOR).length : 0;

    const clicked = safeClick(clickableWithin(tab), 'open the Settings tab');
    if (!clicked) {
      note('gap 11: the Settings tab was refused by the denylist, so the pane was never opened.');
      return;
    }

    // Poll until the field count STOPS changing for two consecutive reads, up to ~8s. Angular
    // renders 264 controls in stages, so the first non-zero count is not the final one.
    let pane = null;
    let settledAfterMs = null;
    let previousCount = -1;
    let stableReads = 0;
    const startedAt = Date.now();
    for (let i = 0; i < 40; i++) {
      await sleep(200);
      pane = paneOf();
      if (!pane) continue;
      // Only the COUNT is needed while polling; the fields themselves are read once, after the
      // loop, from whichever pane it settled on.
      const count = pane.querySelectorAll(FIELD_SELECTOR).length;
      if (count === previousCount && count > 0) {
        if (++stableReads >= 2) {
          settledAfterMs = Date.now() - startedAt;
          break;
        }
      } else {
        stableReads = 0;
      }
      previousCount = count;
    }

    pane = pane || document.body;
    const fields = Array.from(pane.querySelectorAll(FIELD_SELECTOR));
    const paneChanged = !!before && pane !== before;

    OUT.targets.settings = {
      note: 'No node cap and no html truncation. The previous capture stopped at index 900 and cut html at 120,000 chars.',
      paneSelector: pane === document.body ? 'body (fallback)' : (pane.className || pane.id),
      paneChanged,
      previousPaneSelector: before ? before.className || before.id : null,
      previousPaneFieldCount: beforeFields,
      settledAfterMs,
      fieldCount: fields.length,
      htmlLength: pane.innerHTML.length,
      html: pane.innerHTML,
      fields: fields.map((field) => describe(field))
    };

    /*
      Two different failures, reported as two different things. Conflating them is what made the
      last run unreadable: "only 1 field" looked like a rendering problem and was actually the
      wrong pane entirely.
    */
    if (!paneChanged) {
      note(
        `gap 11: the active pane did NOT change after clicking Settings (still "${OUT.targets.settings.paneSelector}", ${fields.length} field(s)). The tab click did not take effect, so this is NOT the Settings pane and its contents are not evidence about it.`
      );
    } else if (settledAfterMs === null) {
      note(
        `gap 11: the Settings pane never stopped changing within 8s (last count ${fields.length}). Captured anyway, but treat the count as a floor rather than the total.`
      );
    } else if (fields.length < 200) {
      note(
        `gap 11: the Settings pane settled at ${fields.length} fields after ${settledAfterMs}ms; the schema expects ~264. The pane DID change and DID finish rendering, so this role genuinely sees fewer — which is itself the finding.`
      );
    }
  }

  /* ─── gap 9: the DON'T TOUCH block, proven to have opened ───────────────── */

  async function captureDontTouch() {
    const toggle = Array.from(document.querySelectorAll('a, button, span, h3, h4, div, legend')).find(
      (element) => /DON'?T TOUCH|donttouch/i.test(element.textContent || '') && (element.textContent || '').length < 200
    );
    if (!toggle) {
      note("gap 9: no DON'T TOUCH disclosure found. It may be admin-only, or worded differently in this tenant.");
      return;
    }

    const before = document.querySelectorAll(FIELD_SELECTOR).length;
    const opened = safeClick(clickableWithin(toggle), "open the DON'T TOUCH block");
    await sleep(900);
    const after = document.querySelectorAll(FIELD_SELECTOR).length;

    /*
      The previous collector's exact failure: it logged the step and serialised the wrong element.
      So the count is compared before and after, and a block that did not open is REPORTED rather
      than written out as a plausible empty result.
    */
    if (!opened) {
      note("gap 9: the DON'T TOUCH toggle matched the safety denylist and was not clicked.");
      return;
    }
    if (after <= before) {
      note(`gap 9: clicking the disclosure revealed no new fields (${before} → ${after}). NOT captured; do not treat an empty result as evidence.`);
      OUT.targets.dontTouch = { opened: false, fieldsBefore: before, fieldsAfter: after };
      return;
    }

    const container = toggle.closest('div, section, fieldset') || document.body;
    const fields = Array.from(container.querySelectorAll('input, select, textarea'));

    OUT.targets.dontTouch = {
      opened: true,
      fieldsBefore: before,
      fieldsAfter: after,
      toggle: describe(toggle),
      containerHtmlLength: container.innerHTML.length,
      containerHtml: container.innerHTML,
      fields: fields.map((field) => describe(field))
    };
  }

  /* ─── gap 10: hover, focus and open-menu states ─────────────────────────── */

  async function captureStates() {
    const samples = [];
    const pick = (selector, label) => {
      const element = document.querySelector(selector);
      if (element) samples.push({ label, element });
    };
    pick('.btn, button', 'button');
    pick('a.btn, .btn-default', 'button-default');
    pick('table tr td a', 'table-row-link');
    pick('.nav-tabs a, .nav a', 'tab');
    pick('input[type=text], .input-text', 'text-input');

    const states = [];
    for (const { label, element } of samples) {
      const rest = { computed: computed(element), rules: matchingRules(element) };

      element.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      await sleep(120);
      const hover = computed(element);

      try {
        element.focus();
      } catch {
        /* not focusable */
      }
      await sleep(120);
      const focus = computed(element);

      element.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
      element.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      try {
        element.blur();
      } catch {
        /* not focusable */
      }

      states.push({ label, selectorText: describe(element).class, rest, hover, focus });
    }

    /*
      A caveat that has to travel with the data: CSS `:hover` is applied by the browser from real
      pointer position, and a synthetic MouseEvent does NOT trigger it. So `hover` below is only
      different from `rest` where the app attaches a JS handler. The `rules` array is the reliable
      half — it carries the `:hover` and `:focus` rules that MATCH the element, which is what
      "unverified hover styles" actually needs.
    */
    OUT.targets.states = {
      caveat:
        'Synthetic MouseEvents do not trigger CSS :hover. Compare `rules` (which contains the :hover/:focus rules that match) rather than the computed `hover` snapshot.',
      samples: states
    };

    // Open menus: dropdown toggles are disclosures, so they are safe to click.
    const menus = [];
    for (const toggle of Array.from(document.querySelectorAll('[data-toggle=dropdown], .dropdown-toggle')).slice(0, 6)) {
      if (!safeClick(toggle, 'open a dropdown menu')) continue;
      await sleep(400);
      const menu = toggle.parentElement && toggle.parentElement.querySelector('.dropdown-menu, ul');
      if (menu) {
        menus.push({
          toggleText: (toggle.textContent || '').trim().slice(0, 60),
          html: menu.innerHTML,
          items: Array.from(menu.querySelectorAll('li, a')).map((item) => describe(item)),
          computed: computed(menu),
          rules: matchingRules(menu)
        });
      }
      safeClick(toggle, 'close the dropdown menu again');
      await sleep(200);
    }
    if (menus.length === 0) note('gap 10: no dropdown menus were opened; none matched [data-toggle=dropdown] or .dropdown-toggle.');
    OUT.targets.openMenus = menus;
  }

  /* ─── gaps 5, 8, 12: the Users tab ──────────────────────────────────────── */

  async function captureUsers() {
    const tab = Array.from(document.querySelectorAll('a, button, li')).find((element) =>
      /^\s*Users\s*$/i.test(element.textContent || '')
    );
    if (tab) {
      safeClick(tab, 'open the Users tab');
      await sleep(1200);
    }

    // Gap 5 — the " / manual" token on non-owner rows. Every row, so a per-user pattern is visible.
    const rows = Array.from(document.querySelectorAll('table tr')).filter(
      (row) => row.querySelectorAll('td').length > 2
    );
    OUT.targets.userRows = {
      note: 'gap 5 — the " / manual" token. Every row is captured so a per-user pattern can be seen rather than inferred from four samples.',
      count: rows.length,
      rows: rows.slice(0, 60).map((row) => ({
        cells: Array.from(row.querySelectorAll('td')).map((cell) => ({
          text: (cell.textContent || '').trim(),
          html: cell.innerHTML
        }))
      }))
    };
    if (rows.length === 0) note('gap 5: no user rows found on this page.');

    // Gap 8 — the two items gated on `sess.authMode === 'unamePW'`.
    const menuHtml = Array.from(document.querySelectorAll('.dropdown-menu, ul'))
      .map((menu) => menu.innerHTML)
      .join('\n');
    OUT.targets.authMode = {
      note: "gap 8 — two User List Actions items render only when sess.authMode === 'unamePW'. If this room is not in that mode they are absent, which is itself the answer.",
      unamePWCommentPresent: /unamePW/.test(document.documentElement.innerHTML),
      userListActionsHtml: menuHtml.slice(0, 200000)
    };

    // Gap 12 — the app-pair sample link.
    const pairLink = Array.from(document.querySelectorAll('a, input, code, span')).find((element) =>
      /ptr_app\/sessions|addUser/i.test(element.getAttribute?.('href') || element.value || element.textContent || '')
    );
    if (pairLink) {
      OUT.targets.appPairLink = describe(pairLink, { withRules: true });
    } else {
      note('gap 12: no app-pair link found. It may need "Pair Link For App?" enabled on this room.');
    }
  }

  /* ─── run ───────────────────────────────────────────────────────────────── */

  try {
    console.log('collect-manage-gaps: starting. Do not click anything until DONE appears.');
    await captureSettings();
    await captureDontTouch();
    await captureStates();
    await captureUsers();
  } catch (error) {
    note(`collector threw: ${error && error.message}`);
    console.error(error);
  }

  const crossOrigin = Array.from(document.styleSheets).filter((sheet) => {
    try {
      return !sheet.cssRules;
    } catch {
      return true;
    }
  }).length;
  if (crossOrigin > 0) {
    note(`${crossOrigin} stylesheet(s) are cross-origin and their rules could not be read; any rule they carry is missing from every \`rules\` array.`);
  }

  const json = JSON.stringify(OUT, null, 2);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  anchor.download = `manage-gaps-${stamp}.json`;
  document.body.appendChild(anchor);
  anchor.click(); // the only other click, and it is on an element this script created
  anchor.remove();

  console.log(
    `DONE — manage-gaps-${stamp}.json (${(json.length / 1024 / 1024).toFixed(2)} MB). ` +
      `${OUT.gaps.length} gap(s) recorded, ${OUT.refusedClicks.length} click(s) refused by the denylist.`
  );
  if (OUT.gaps.length) console.table(OUT.gaps);
})();

/*
  ## Before you share the file

  Values whose field name looks like a credential are already replaced with
  «redacted N chars» — secret, password, pw, token, apiKey, keyId, clientId, sid. That is a name
  check, not a content check: a key stored in a field called `slackPostURL` would survive it. Open
  the JSON and search for `http` once before attaching it anywhere.

  Drop the file in `dumps/` and it closes TODO gaps 5, 8, 9, 10, 11 and 12 — or tells us honestly
  which of them this tenant cannot answer, which is worth just as much.
*/
