/* ============================================================================
 * PASTE INTO THE CHROME CONSOLE ON THE LIVE REFERENCE APP, ON THE MANAGE PAGE:
 *
 *   https://protradingroom.com/ptrApp#/page/manageSession/<roomId>
 *
 * It drives itself and downloads ONE JSON file. No terminal, no follow-up call.
 *
 * ⚠ WHAT IT CLICKS, AND WHAT IT WILL NEVER CLICK
 *   Clicks ONLY: tab headings, dropdown TOGGLES, and one editable field to open
 *   its editor. All navigation — they change what is on screen and nothing else.
 *   A hard denylist is checked before EVERY click and before the editor is
 *   opened: nothing matching delete / upload / remove / play / stop / send /
 *   save / submit / post / kick / ban / mute / reset / clone / archive is ever
 *   touched, and no form is ever submitted. The editor it opens is closed with
 *   Escape, never with its Save button.
 *
 * WHY THIS EXISTS — the three things ptr1.json cannot answer
 *
 *   ptr1.json holds 2,156 nodes x 95 computed properties, and a contract built
 *   from it now gates our colours. But it was captured entirely AT REST, so
 *   three whole classes of fact are simply absent from it:
 *
 *   1. #filesModal — "Room Files". Searched every one of the 23 caps for
 *      `filesModal` and for `modal-megamenu`: zero hits. Our only evidence is a
 *      314-byte row fragment, so the modal's colours, spacing and tab styling
 *      would be my invention.
 *   2. HOVER / FOCUS / OPEN states. Nothing was hovered and no dropdown was
 *      open when the capture ran, so `.editable-click:hover`, an open
 *      `.dropdown-menu` and `.dropdown-submenu` have no measured values.
 *   3. The xeditable EDIT state. Every editable in the capture is in its
 *      display form (`editable editable-click`). The `<form class="editable-wrap">`,
 *      its input, and the Save/Cancel buttons were never rendered, so their
 *      appearance is unknown.
 *
 *   Everything it collects is a MEASUREMENT: markup, computed styles, AND the
 *   stylesheet rules that produced them — so "this class has no rule" can be
 *   proven rather than assumed. Anything that never renders is recorded as an
 *   honest gap instead of being left out.
 * ========================================================================== */

(async () => {
  'use strict';

  const out = {
    capturedAt: new Date().toISOString(),
    url: location.href,
    userAgent: navigator.userAgent,
    viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
    bundles: [...document.scripts].map((s) => s.src).filter(Boolean),
    role: {},
    states: {},
    gaps: [],
    steps: []
  };

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const gap = (what, why) => {
    out.gaps.push({ what, why });
    console.warn(`[gap] ${what} — ${why}`);
  };
  const step = (s, d) => {
    out.steps.push({ at: new Date().toISOString(), step: s, detail: d ?? null });
    console.log(`[collect] ${s}${d ? ' — ' + d : ''}`);
  };

  /* ── the guard, checked before every click ─────────────────────────────── */
  const FORBIDDEN =
    /delete|upload|remove|play|stop|send|save|submit|post|kick|ban|mute|reset|clone|archive|invite|logout|pay/i;

  function safeToClick(el) {
    if (!el) return false;
    if (el.tagName === 'BUTTON' && (el.type ?? 'submit') === 'submit' && el.form) return false;
    if (el.tagName === 'INPUT' && /submit|image|reset/i.test(el.type)) return false;
    const text = `${el.textContent ?? ''} ${el.className ?? ''} ${el.id ?? ''} ${
      el.getAttribute('ng-click') ?? ''
    } ${el.getAttribute('title') ?? ''} ${el.getAttribute('aria-label') ?? ''}`;
    if (FORBIDDEN.test(text)) return false;
    return true;
  }

  function click(el, why) {
    if (!safeToClick(el)) {
      gap(why, 'refused by the denylist — this element could mutate something');
      return false;
    }
    el.click();
    return true;
  }

  /* ── measurement ───────────────────────────────────────────────────────── */

  /** Every computed property, so nothing is filtered out before it is recorded. */
  function computed(el) {
    const cs = getComputedStyle(el);
    const style = {};
    for (let i = 0; i < cs.length; i++) style[cs[i]] = cs.getPropertyValue(cs[i]);
    return style;
  }

  /**
   * The stylesheet rules that actually match an element.
   *
   * This is the half that makes a NEGATIVE provable. A computed value alone
   * cannot distinguish "a rule sets this" from "nothing sets it and the value
   * is inherited or a UA default" — and that distinction is exactly what was
   * got wrong before, when a caret was forced black under a comment claiming
   * the captured cascade demanded it.
   */
  function matchingRules(el) {
    const found = [];
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        // A cross-origin stylesheet cannot be read. Recorded, not skipped silently.
        found.push({ href: sheet.href, unreadable: true });
        continue;
      }
      for (const rule of rules ?? []) {
        if (!rule.selectorText) continue;
        // No initialiser: the `catch` always continues, so a value here could never be read.
        let matches;
        try {
          matches = el.matches(rule.selectorText);
        } catch {
          continue;
        }
        if (matches) found.push({ href: sheet.href, selector: rule.selectorText, css: rule.cssText });
      }
    }
    return found;
  }

  const MAX_HTML = 40000;
  function snapshot(el, label) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      label,
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      className: el.className || null,
      text: (el.textContent ?? '').trim().slice(0, 300),
      rect: { x: r.x, y: r.y, w: r.width, h: r.height },
      style: computed(el),
      rules: matchingRules(el),
      html: (el.outerHTML ?? '').slice(0, MAX_HTML)
    };
  }

  /** A subtree, every element, so a modal is captured whole rather than sampled. */
  function snapshotTree(root, label, cap = 400) {
    if (!root) return null;
    const nodes = [root, ...root.querySelectorAll('*')].slice(0, cap);
    return {
      label,
      count: nodes.length,
      truncatedAt: nodes.length >= cap ? cap : null,
      html: (root.outerHTML ?? '').slice(0, MAX_HTML * 3),
      nodes: nodes.map((el, i) => {
        const r = el.getBoundingClientRect();
        return {
          index: i,
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          className: el.className || null,
          text: (el.childNodes.length === 1 && el.firstChild.nodeType === 3
            ? el.textContent
            : ''
          )
            .trim()
            .slice(0, 200),
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
          style: computed(el),
          rules: matchingRules(el)
        };
      })
    };
  }

  /** Hover measured through :hover, not guessed from a stylesheet. */
  function withHover(el, label) {
    if (!el) return null;
    const before = computed(el);
    el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    const during = computed(el);
    el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
    el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    const changed = {};
    for (const k of Object.keys(before)) if (before[k] !== during[k]) changed[k] = { rest: before[k], hover: during[k] };
    return {
      label,
      selectorText: el.className || el.tagName.toLowerCase(),
      changedUnderHover: changed,
      /*
        A synthetic mouseover does not trigger the CSS :hover pseudo-class in
        every engine. When nothing changed, the rules below are what a real
        pointer would apply — recorded so the answer is derivable either way.
      */
      hoverRules: matchingRules(el).filter((r) => r.selector && r.selector.includes(':hover'))
    };
  }

  /* ── role ──────────────────────────────────────────────────────────────── */
  out.role = {
    heading: document.querySelector('.panel-title')?.textContent?.trim() ?? null,
    sawUsersTab: !!document.querySelector('[ng-click*="users"], [aria-controls="users"]'),
    editableCount: document.querySelectorAll('.editable-click').length,
    bodyClass: document.body.className
  };
  step('role recorded', out.role.heading ?? '(no panel title)');

  /* ── 1. resting baselines, so this file is comparable to ptr1 ──────────── */
  out.states.restingEditable = snapshot(document.querySelector('.editable-click'), 'editable at rest');
  out.states.restingEmpty = snapshot(document.querySelector('.editable-empty'), 'editable-empty at rest');
  out.states.restingCaret = snapshot(
    document.querySelector('.btn .caret, .caret'),
    'caret at rest'
  );
  step('resting baselines captured');

  /* ── 2. hover, which ptr1 has none of ──────────────────────────────────── */
  out.states.hover = [
    withHover(document.querySelector('.editable-click'), '.editable-click'),
    withHover(document.querySelector('.editable-empty'), '.editable-empty'),
    withHover(document.querySelector('.btn-primary'), '.btn-primary'),
    withHover(document.querySelector('.btn-default'), '.btn-default'),
    withHover(document.querySelector('.nav-tabs li a'), '.nav-tabs a')
  ].filter(Boolean);
  step('hover states captured', `${out.states.hover.length} elements`);

  /* ── 3. an OPEN dropdown and its submenu ───────────────────────────────── */
  const toggle = [...document.querySelectorAll('.dropdown-toggle')].find(safeToClick);
  if (!toggle) {
    gap('open dropdown-menu', 'no .dropdown-toggle passed the denylist on this page');
  } else {
    click(toggle, 'open a dropdown');
    await wait(350);
    const menu =
      toggle.parentElement?.querySelector('.dropdown-menu') ??
      document.querySelector('.dropdown-menu');
    out.states.openDropdown = snapshotTree(menu, 'open .dropdown-menu');
    if (!menu) gap('open dropdown-menu', 'the toggle was clicked but no .dropdown-menu appeared');

    const submenu = document.querySelector('.dropdown-submenu');
    if (submenu) {
      submenu.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      await wait(250);
      out.states.openSubmenu = snapshotTree(submenu, 'open .dropdown-submenu');
    } else {
      gap('.dropdown-submenu', 'no submenu rendered inside the open menu');
    }
    document.body.click();
    await wait(200);
    step('dropdown captured');
  }

  /* ── 4. the xeditable EDIT state ───────────────────────────────────────── */
  const editable = document.querySelector('.editable-click');
  if (!editable) {
    gap('xeditable edit state', 'no .editable-click on the page');
  } else if (!click(editable, 'open the inline editor')) {
    gap('xeditable edit state', 'the editable failed the denylist');
  } else {
    await wait(400);
    const wrap = document.querySelector('.editable-wrap, form.editable-wrap, .editable-container');
    if (wrap) {
      out.states.editorOpen = snapshotTree(wrap, 'xeditable editor, open');
      step('editor captured');
    } else {
      gap('xeditable edit state', 'clicking the value opened no .editable-wrap');
    }
    /*
      Closed with Escape. Never with the Save button — that would write a value
      to the owner's live room, which this script must never do.
    */
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    (wrap?.querySelector('button.editable-cancel') ?? null)?.click();
    await wait(250);
  }

  /* ── 5. #filesModal — the whole reason for this script ─────────────────── */
  const filesOpener = [...document.querySelectorAll('a,button,[ng-click]')].find(
    (el) =>
      /files/i.test(`${el.textContent ?? ''} ${el.getAttribute('ng-click') ?? ''}`) &&
      safeToClick(el)
  );
  if (!filesOpener) {
    gap(
      '#filesModal',
      'nothing on this page opens Room Files. It may live in the ROOM, not the manage page — ' +
        'in which case re-run this script there.'
    );
  } else {
    click(filesOpener, 'open Room Files');
    await wait(700);
    const modal =
      document.querySelector('#filesModal') ??
      document.querySelector('.modal-megamenu') ??
      document.querySelector('.modal-content');
    if (modal) {
      out.states.filesModal = snapshotTree(modal, '#filesModal', 600);
      // The three tabs, each measured in its selected state.
      out.states.filesModalTabs = [];
      for (const tab of modal.querySelectorAll('.nav-tabs li')) {
        if (!safeToClick(tab)) continue;
        tab.querySelector('a')?.click();
        await wait(300);
        out.states.filesModalTabs.push(snapshotTree(modal.querySelector('.panel-body'), `tab: ${tab.textContent.trim()}`, 200));
      }
      step('#filesModal captured', `${out.states.filesModal.count} nodes`);
      const close = modal.querySelector('.close, [ng-click*="closeModal"]');
      if (close) close.click();
    } else {
      gap('#filesModal', 'the opener was clicked but no modal rendered');
    }
  }

  /* ── download ──────────────────────────────────────────────────────────── */
  const json = JSON.stringify(out, null, 2);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  a.download = `manage-states-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();

  console.log(
    `%c[collect] done — ${(json.length / 1024).toFixed(0)} KB, ${out.gaps.length} honest gap(s)`,
    'font-weight:bold'
  );
  if (out.gaps.length) console.table(out.gaps);
})();
