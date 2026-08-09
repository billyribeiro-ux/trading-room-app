/* ============================================================================
 * ONE SCRIPT. PASTE INTO THE CHROME CONSOLE. IT WORKS OUT WHERE IT IS.
 *
 * Run it on any of these and it captures everything that page can show:
 *
 *   https://protradingroom.com/ptrApp#/page/welcome              (account)
 *   https://protradingroom.com/ptrApp#/page/manageSession/<id>   (manage)
 *   https://protradingroom.com/session?id=<code>                 (the room)
 *
 * On ptrApp it navigates BETWEEN the account and manage pages by itself — same
 * document, hash routing — so one run covers both. The room is a separate
 * document, so it needs its own run; the script says so when it finishes.
 *
 * Downloads ONE JSON. No terminal, no follow-up call, no stop().
 *
 * ⚠ WHAT IT CLICKS, AND WHAT IT WILL NEVER CLICK
 *   Clicks ONLY navigation: tab headings, dropdown toggles, disclosure toggles,
 *   and one editable field to open its inline editor.
 *   A denylist is checked before EVERY click. Nothing matching delete / upload /
 *   remove / play / stop / send / save / submit / post / kick / ban / mute /
 *   reset / clone / archive / invite / logout / pay is ever touched, and no form
 *   is ever submitted. The inline editor is closed with ESCAPE, never with Save,
 *   so this cannot write a value to a live room.
 *
 * WHY IT EXISTS
 *   ptr1.json holds 2,156 nodes x 95 computed properties and now gates our
 *   colours. But it was captured entirely AT REST, with every panel closed, so
 *   whole classes of fact are simply absent from it:
 *
 *     · hover / focus states — nothing was ever hovered
 *     · open dropdowns and their submenus — all closed
 *     · the xeditable EDIT state — every editable is in display form
 *     · #filesModal ("Room Files") — zero hits across all 23 caps
 *     · the DON'T TOUCH settings block — ng-hide, never expanded
 *     · every tab except the one that happened to be open
 *
 *   Each is recorded as a MEASUREMENT: computed style AND the stylesheet rules
 *   that matched, so "nothing sets this" is provable rather than assumed. That
 *   distinction is the exact one that was got wrong before, when a caret was
 *   forced black under a comment claiming the capture demanded it.
 *
 *   Anything that never renders is written into `gaps` with what was tried.
 * ========================================================================== */

(async () => {
  'use strict';

  /* The same 95 properties ptr1.json records, in its order, so the output of
     this script and the existing capture are directly comparable. */
  const PROPS = [
    'display',
    'visibility',
    'position',
    'top',
    'right',
    'bottom',
    'left',
    'z-index',
    'float',
    'box-sizing',
    'width',
    'height',
    'min-width',
    'max-width',
    'min-height',
    'max-height',
    'flex',
    'flex-direction',
    'flex-wrap',
    'flex-grow',
    'flex-shrink',
    'flex-basis',
    'align-items',
    'align-self',
    'justify-content',
    'gap',
    'order',
    'grid-template-columns',
    'margin-top',
    'margin-right',
    'margin-bottom',
    'margin-left',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'border-top-left-radius',
    'border-top-right-radius',
    'border-bottom-left-radius',
    'border-bottom-right-radius',
    'background-color',
    'background-image',
    'background-position',
    'background-size',
    'background-repeat',
    'background-clip',
    'color',
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'line-height',
    'letter-spacing',
    'text-align',
    'text-transform',
    'text-decoration-line',
    'text-shadow',
    'text-overflow',
    'white-space',
    'vertical-align',
    'word-break',
    'overflow-wrap',
    'overflow-x',
    'overflow-y',
    'opacity',
    'box-shadow',
    'outline-style',
    'outline-width',
    'outline-color',
    'cursor',
    'pointer-events',
    'user-select',
    'transition-property',
    'transition-duration',
    'transform',
    'filter',
    'object-fit',
    'list-style-type',
    'content',
    'resize',
    'appearance',
    'fill',
    'stroke'
  ];

  const out = {
    capturedAt: new Date().toISOString(),
    url: location.href,
    page: null,
    userAgent: navigator.userAgent,
    viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
    scripts: [...document.scripts].map((s) => s.src).filter(Boolean),
    stylesheets: [...document.styleSheets].map((s) => s.href).filter(Boolean),
    role: {},
    captures: {},
    ruleIndex: {},
    gaps: [],
    steps: []
  };

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const gap = (what, why) => {
    out.gaps.push({ what, why });
    console.warn(`[gap] ${what} — ${why}`);
  };
  const step = (s, d) => {
    out.steps.push({ at: Date.now(), step: s, detail: d ?? null });
    console.log(`[collect] ${s}${d ? ' — ' + d : ''}`);
  };

  /* ── the guard ──────────────────────────────────────────────────────────── */
  const FORBIDDEN =
    /delete|upload|remove|play\b|stop|send|save|submit|post\b|kick|ban\b|mute|reset|clone|archive|invite|logout|pay\b|purchase|charge/i;

  function safe(el) {
    if (!el) return false;
    if (el.tagName === 'BUTTON' && (el.getAttribute('type') ?? 'submit') === 'submit' && el.form) return false;
    if (el.tagName === 'INPUT' && /submit|image|reset/i.test(el.type || '')) return false;
    const text = [
      el.textContent,
      el.className,
      el.id,
      el.getAttribute('ng-click'),
      el.getAttribute('title'),
      el.getAttribute('aria-label'),
      el.getAttribute('href')
    ].join(' ');
    return !FORBIDDEN.test(text);
  }
  function click(el, why) {
    if (!safe(el)) {
      gap(why, 'refused by the denylist — could mutate something');
      return false;
    }
    try {
      el.click();
      return true;
    } catch (e) {
      gap(why, 'click threw: ' + e.message);
      return false;
    }
  }

  /* ── measurement ────────────────────────────────────────────────────────── */
  function styleOf(el) {
    const cs = getComputedStyle(el);
    const s = {};
    for (const p of PROPS) s[p] = cs.getPropertyValue(p);
    return s;
  }

  /*
    Rules are recorded ONCE, in `ruleIndex`, and referenced by key from each node. Inlining them per
    node made the file enormous and unreadable.

    ⚠ THE NEGATIVE IS ONLY PROVABLE BECAUSE THIS RECURSES INTO @media.

    The comment here used to say "a node with no keys has no rule", and the code only looked at
    top-level rules — anything with a `selectorText` — so every rule nested inside `@media`,
    `@supports` or `@layer` was invisible. That made the claim false, and demonstrably so:
    `.form-group` on the Users tab recorded three rule keys that between them declare only
    `box-sizing` and `margin-bottom`, yet it computes `display: inline-block` and
    `vertical-align: middle` — from Bootstrap's `@media (min-width: 768px) .form-inline
    .form-group`. A reader trusting the comment would have concluded nothing styled it.

    Grouping rules are now walked recursively and their condition is kept in the key, so a
    media-scoped rule is distinguishable from an unconditional one rather than merged with it.
  */
  const ruleKeys = new Map();
  /** sheets already reported as unreadable — `rulesFor` runs per element, the gap is per sheet */
  const unreadableSheets = new Set();
  function rulesFor(el) {
    const keys = [];

    const walk = (rules, sheetName, condition) => {
      for (const rule of rules ?? []) {
        // a grouping rule (@media / @supports / @layer) holds the rules that actually match
        if (rule.cssRules && !rule.selectorText) {
          const inner = rule.conditionText ?? rule.media?.mediaText ?? '';
          walk(rule.cssRules, sheetName, condition + (inner ? `@${inner} ` : ''));
          continue;
        }
        if (!rule.selectorText) continue;
        let hit = false;
        try {
          hit = el.matches(rule.selectorText);
        } catch {
          continue;
        }
        if (!hit) continue;
        const key = sheetName + '|' + condition + rule.selectorText;
        if (!ruleKeys.has(key)) {
          ruleKeys.set(key, true);
          out.ruleIndex[key] = rule.cssText;
        }
        keys.push(key);
      }
    };

    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        // a cross-origin sheet cannot be read at all — that is a gap, not an absence of rules
        const href = sheet.href ?? 'inline';
        if (!unreadableSheets.has(href)) {
          unreadableSheets.add(href);
          gap('stylesheet: ' + href, 'cssRules is not readable (cross-origin)');
        }
        continue;
      }
      walk(rules, sheet.href ? sheet.href.split('/').pop() : 'inline', '');
    }
    return keys;
  }

  /*
    `cap` and the HTML slice are the two places a run silently stops telling the truth.

    The 2026-08-08 run hit BOTH on the Settings tab: the node array stopped at 900 in a pane
    10,882px tall (35.6% of it unmeasured) and every tab's HTML stopped at exactly 120,000 chars,
    mid-row at `Custom Alert secret`. Thirteen settings had markup with no measurements; 121 schema
    entries after them had neither. `truncated: true` was recorded, but the total that WOULD have
    been captured was not — so there was no way to see how much was lost without re-running.

    Both limits are raised to cover the largest pane, and `total`/`htmlTruncated` now say what was
    dropped rather than leaving it to be inferred.
  */
  function tree(root, label, cap = 4000) {
    if (!root) return null;
    const all = [root, ...root.querySelectorAll('*')];
    const els = all.slice(0, cap);
    const html = root.outerHTML ?? '';
    const HTML_CAP = 2000000;
    return {
      label,
      count: els.length,
      total: all.length,
      truncated: all.length > cap,
      htmlLength: html.length,
      htmlTruncated: html.length > HTML_CAP,
      html: html.slice(0, HTML_CAP),
      nodes: els.map((el) => {
        const r = el.getBoundingClientRect();
        const onlyText = el.childNodes.length === 1 && el.firstChild.nodeType === 3;
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || undefined,
          class: el.className || undefined,
          text: onlyText ? el.textContent.trim().slice(0, 200) : undefined,
          rect: { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) },
          style: styleOf(el),
          rules: rulesFor(el)
        };
      })
    };
  }

  /** Hover measured, plus the :hover rules that a real pointer would apply. */
  function hover(el, label) {
    if (!el) {
      gap('hover: ' + label, 'no element matched');
      return null;
    }
    const rest = styleOf(el);
    for (const t of ['mouseover', 'mouseenter', 'pointerover', 'pointerenter'])
      el.dispatchEvent(new MouseEvent(t, { bubbles: true }));
    const now = styleOf(el);
    for (const t of ['mouseout', 'mouseleave', 'pointerout', 'pointerleave'])
      el.dispatchEvent(new MouseEvent(t, { bubbles: true }));
    const changed = {};
    for (const k of PROPS) if (rest[k] !== now[k]) changed[k] = { rest: rest[k], hover: now[k] };
    const hoverRules = [];
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of rules ?? []) {
        if (!rule.selectorText || !rule.selectorText.includes(':hover')) continue;
        const bare = rule.selectorText.replace(/:hover/g, '');
        let hit = false;
        try {
          hit = el.matches(bare);
        } catch {
          continue;
        }
        if (hit) hoverRules.push(rule.cssText);
      }
    }
    return { label, class: el.className || null, changedUnderHover: changed, hoverRules };
  }

  /* ── which page are we on ───────────────────────────────────────────────── */
  const href = location.href;
  out.page = /#\/page\/manageSession/.test(href)
    ? 'manage'
    : /#\/page\/welcome/.test(href)
      ? 'account'
      : /\/session\b/.test(href) || document.querySelector('#filesModal, .st-chat, [class*="st-"]')
        ? 'room'
        : 'unknown';
  step('page detected', out.page + '  ' + href);
  if (out.page === 'unknown') gap('page detection', 'not the account, manage or room page — capturing generically');

  out.role = {
    editables: document.querySelectorAll('.editable-click').length,
    emptyEditables: document.querySelectorAll('.editable-empty').length,
    dropdownToggles: document.querySelectorAll('.dropdown-toggle').length,
    tabs: [...document.querySelectorAll('.nav-tabs li, [role="presentation"]')]
      .map((t) => t.textContent.trim())
      .filter(Boolean)
  };

  /* ── shared: resting baselines, hover, dropdowns, editor ────────────────── */
  async function captureCommon(prefix) {
    out.captures[prefix + ':resting'] = {
      editable: tree(document.querySelector('.editable-click'), 'editable at rest', 3),
      empty: tree(document.querySelector('.editable-empty'), 'editable-empty at rest', 3),
      caret: tree(document.querySelector('.caret'), 'caret at rest', 2),
      primaryBtn: tree(document.querySelector('.btn-primary'), '.btn-primary at rest', 3)
    };

    out.captures[prefix + ':hover'] = [
      hover(document.querySelector('.editable-click'), '.editable-click'),
      hover(document.querySelector('.editable-empty'), '.editable-empty'),
      hover(document.querySelector('.btn-primary'), '.btn-primary'),
      hover(document.querySelector('.btn-default'), '.btn-default'),
      hover(document.querySelector('.btn-info'), '.btn-info'),
      hover(document.querySelector('.nav-tabs a'), '.nav-tabs a'),
      hover(document.querySelector('.dropdown-menu a'), '.dropdown-menu a'),
      hover(document.querySelector('table.table tbody tr'), 'table row')
    ].filter(Boolean);
    step(prefix + ': hover captured');

    /*
      Every dropdown, opened by setting the state class rather than by clicking.

      A previous run captured ZERO menus. The reason is in the evidence: the page loads
      `bootstrap.min.css` but no Bootstrap JS — the app scripts are AngularJS
      (`app.min.js`, `vendor.min.js`) — so a synthetic click has nothing listening to open a
      menu, and every `.dropdown-menu` stayed `display: none`.

      Bootstrap 3 shows a menu when its CONTAINER carries `.open`; the captured rule
      `.open > .dropdown-toggle.btn-default { … }` proves that is the mechanism here. Adding the
      class renders the real menu with the real cascade, which is what needs measuring — and it
      touches presentation only, so it is safer than clicking, not riskier. It is removed again
      afterwards.

      `.dropdown-submenu` is opened the same way, since its rule is also `:hover`/`.open`-driven.
    */
    const opened = [];
    for (const t of [...document.querySelectorAll('.dropdown-toggle')].slice(0, 10)) {
      const container = t.closest('.dropdown, .btn-group, .dropup') ?? t.parentElement;
      const menu = container?.querySelector('.dropdown-menu');
      if (!container || !menu) continue;

      const hadOpen = container.classList.contains('open');
      container.classList.add('open');
      await wait(200);

      if (menu.getBoundingClientRect().height > 0) {
        opened.push(tree(menu, 'open menu: ' + (t.textContent.trim().slice(0, 40) || t.className), 200));
        for (const sub of menu.querySelectorAll('.dropdown-submenu')) {
          const hadSubOpen = sub.classList.contains('open');
          sub.classList.add('open');
          sub.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          await wait(200);
          opened.push(tree(sub, 'open submenu: ' + sub.textContent.trim().slice(0, 30), 150));
          if (!hadSubOpen) sub.classList.remove('open');
        }
      } else {
        gap(prefix + ': menu stayed hidden', 'container.open did not reveal ' + (t.className || 'a toggle'));
      }
      if (!hadOpen) container.classList.remove('open');
      await wait(80);
    }
    out.captures[prefix + ':dropdowns'] = opened;
    if (!opened.length) gap(prefix + ': open dropdown', 'no .dropdown-toggle had a sibling .dropdown-menu');
    step(prefix + ': dropdowns captured', opened.length + ' menus');

    // The xeditable editor, opened once and dismissed with Escape.
    const ed = document.querySelector('.editable-click');
    if (!ed) gap(prefix + ': editor', 'no .editable-click present');
    else if (click(ed, prefix + ': open inline editor')) {
      await wait(450);
      const wrap = document.querySelector(
        '.editable-wrap, form.editable-wrap, .editable-container, .popover.editable-container'
      );
      if (wrap) {
        out.captures[prefix + ':editor'] = tree(wrap, 'xeditable editor open', 80);
        step(prefix + ': editor captured');
      } else gap(prefix + ': editor', 'clicking the value opened no editable-wrap');
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      document.querySelector('button.editable-cancel')?.click();
      await wait(250);
    }
  }

  /* ── the account page ───────────────────────────────────────────────────── */
  async function captureAccount() {
    out.captures['account:page'] = tree(document.querySelector('.container') ?? document.body, 'account page', 3000);
    const table = document.querySelector('table');
    out.captures['account:sessionsTable'] = tree(table, 'Sessions table', 200);
    if (!table) gap('account: sessions table', 'no table on the account page');
    await captureCommon('account');
  }

  /* ── the manage page: every tab, plus the hidden blocks ─────────────────── */
  async function captureManage() {
    out.captures['manage:header'] = tree(
      document.querySelector('.form-vertical, .panel-heading')?.closest('.panel') ?? document.body,
      'manage header',
      1200
    );

    const tabs = [...document.querySelectorAll('.nav-tabs li a, .nav-tabs li')].filter(safe);
    if (!tabs.length) gap('manage: tabs', 'no .nav-tabs found');
    for (const tab of tabs) {
      const name = tab.textContent.trim().slice(0, 40) || 'tab';
      tab.click();
      await wait(600);
      const pane = document.querySelector('.tab-pane.active, .tab-content') ?? document.body;
      out.captures['manage:tab:' + name] = tree(pane, 'tab ' + name, 4000);
      step('manage: tab captured', name);
    }

    /* The DON'T TOUCH block: ng-hide until the word TOUCH inside the heading is
       clicked. 37 settings live behind it and none were ever captured. */
    const touch = [...document.querySelectorAll('span,h3,a')].find(
      (el) => /^\s*TOUCH\s*$/i.test(el.textContent ?? '') && safe(el)
    );
    if (touch) {
      /*
        Find the block by what the CLICK REVEALED, never by a guessed selector.

        The previous version asked for `[ng-show="donttouchShow"], .form-vertical:not(.ng-hide)`.
        `querySelector` with a selector LIST returns the first match in DOCUMENT ORDER, not the
        first alternative that matches — so when the invented `donttouchShow` attribute matched
        nothing, the second alternative silently returned the page header's `.form-vertical`. The
        run recorded 72 nodes under `manage:dontTouch` that were byte-identical to
        `manage:header[18..89]`, and the capture looked entirely successful. A whole audit was
        written against it before the duplication was noticed.

        So: record what is hidden BEFORE the click, and take whatever stopped being hidden. That
        cannot return an element the toggle did not affect, and it needs no guess about markup.
      */
      const hiddenBefore = [...document.querySelectorAll('*')].filter((el) => getComputedStyle(el).display === 'none');
      touch.click();
      await wait(500);

      const revealed = hiddenBefore.filter((el) => el.isConnected && getComputedStyle(el).display !== 'none');
      // the outermost revealed element; the rest are its descendants
      const block = revealed.find((el) => !revealed.some((o) => o !== el && o.contains(el)));

      if (block) {
        out.captures['manage:dontTouch'] = tree(block, "DON'T TOUCH block, expanded", 1500);
        step("manage: DON'T TOUCH expanded", block.tagName + '.' + (block.className || '(no class)'));
      } else {
        gap("manage: DON'T TOUCH block", 'the TOUCH toggle was clicked but nothing became visible');
      }
    } else gap("manage: DON'T TOUCH block", 'the TOUCH toggle was not found');

    /*
      Back to the first tab before measuring the shared states.

      The loop above leaves whichever tab it visited last on screen — Settings — and the row
      menus, the user table and the tab links being hovered all live under Users. A previous run
      reported "hover: table row — no element matched" and zero dropdowns for exactly this reason:
      it was looking at the wrong pane, not at a page that lacks them.
    */
    if (tabs.length) {
      tabs[0].click();
      await wait(700);
      step('manage: returned to the first tab', tabs[0].textContent.trim().slice(0, 30));
    }

    await captureCommon('manage');
  }

  /* ── the room: the files modal and the panes ────────────────────────────── */
  async function captureRoom() {
    out.captures['room:page'] = tree(document.body, 'room, as loaded', 4000);

    const opener = [...document.querySelectorAll('a,button,[ng-click],[class*="file"]')].find(
      (el) =>
        /file/i.test(`${el.textContent ?? ''} ${el.getAttribute('ng-click') ?? ''} ${el.className ?? ''}`) && safe(el)
    );
    if (!opener) gap('#filesModal', 'nothing on screen opens Room Files');
    else {
      opener.click();
      await wait(800);
      const modal =
        document.querySelector('#filesModal') ??
        document.querySelector('.modal-megamenu') ??
        document.querySelector('.modal-content');
      if (!modal) gap('#filesModal', 'the opener was clicked but no modal rendered');
      else {
        out.captures['room:filesModal'] = tree(modal, '#filesModal', 700);
        for (const li of modal.querySelectorAll('.nav-tabs li')) {
          if (!safe(li)) continue;
          (li.querySelector('a') ?? li).click();
          await wait(400);
          out.captures['room:filesModal:tab:' + li.textContent.trim()] = tree(
            modal.querySelector('.panel-body') ?? modal,
            'files tab ' + li.textContent.trim(),
            300
          );
        }
        step('#filesModal captured', out.captures['room:filesModal'].count + ' nodes');
        modal.querySelector('.close, [ng-click*="closeModal"]')?.click();
        await wait(300);
      }
    }
    await captureCommon('room');
  }

  /* ── run, walking the SPA where it can ──────────────────────────────────── */
  try {
    if (out.page === 'account') {
      await captureAccount();
      const manageLink = [...document.querySelectorAll('a[href*="manageSession"]')].find(safe);
      if (manageLink) {
        location.hash = manageLink.getAttribute('href').replace(/^#/, '');
        await wait(2500);
        out.captures['navigatedTo'] = location.href;
        await captureManage();
      } else gap('manage page', 'no Manage link on the account page to follow');
    } else if (out.page === 'manage') {
      await captureManage();
      location.hash = '/page/welcome';
      await wait(2500);
      out.captures['navigatedTo'] = location.href;
      await captureAccount();
    } else if (out.page === 'room') {
      await captureRoom();
    } else {
      await captureCommon('unknown');
    }
  } catch (e) {
    gap('run aborted', e && e.stack ? e.stack.slice(0, 500) : String(e));
  }

  /* ── download ───────────────────────────────────────────────────────────── */
  const json = JSON.stringify(out);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = `collect-${out.page}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  console.log(
    `%c[collect] ${out.page}: ${Object.keys(out.captures).length} captures, ` +
      `${Object.keys(out.ruleIndex).length} css rules, ${out.gaps.length} gap(s), ` +
      `${(json.length / 1024 / 1024).toFixed(1)} MB`,
    'font-weight:bold;color:#0a0'
  );
  if (out.gaps.length) console.table(out.gaps);
  if (out.page !== 'room')
    console.log(
      '%c[collect] Now run this again inside the ROOM (/session?id=…) — it is a separate document.',
      'color:#c60'
    );
})();
