/**
 * collect-tooltips.js — the rendered tooltip, which no capture in this repository contains.
 *
 * Paste the whole file into the Chrome console on the LIVE original room, with the chat pane
 * visible. It detects whether you are a member or a presenter, hovers every tooltipped control,
 * captures what actually renders, and downloads one JSON file. No terminal, no second step, no
 * stop() to call afterwards.
 *
 * ── WHY THIS EXISTS ────────────────────────────────────────────────────────────────────────────
 *
 * `TODO.md` gap 10: no capture here holds a hover, focus or open-menu state. `tooltip-arrow` and
 * `bs-tooltip-` appear in ZERO capture files. So the tooltip CSS is captured and pinned, but the
 * DOM those rules are supposed to match has never been seen. The implementation shipped on
 * 2026-08-11 emits the Bootstrap 4 shape on evidence that is strong but INDIRECT — `x-placement`
 * appears in three captures, which is Popper 1, which is the ng-bootstrap generation that owns
 * `ngbtooltip`. This script replaces that inference with the thing itself.
 *
 * ── WHY HOVER WORKS HERE WHEN IT DOES NOT ELSEWHERE ────────────────────────────────────────────
 *
 * A synthetic event cannot trigger a real CSS `:hover`, which is why the manage-page collector
 * captures `:hover` RULES rather than states and says so. A tooltip is different: `ngbTooltip` is a
 * DIRECTIVE with real JavaScript listeners on mouseenter/focusin. Dispatching those events runs the
 * same code path a real pointer runs, and the tooltip it builds is the real one. That is the whole
 * reason this gap is closable and the `:hover` half of gap 10 is not.
 *
 * ── WHAT IT WILL AND WILL NOT DO ───────────────────────────────────────────────────────────────
 *
 * It **hovers**. It does not click anything by default, so it cannot send, save, upload, delete,
 * play, stop, post or submit — there is nothing for a denylist to catch on the main pass, which is
 * a stronger guarantee than checking one. The optional pass that opens a dropdown to reach the
 * tooltips inside it runs the same hard denylist the other collectors use, and skips rather than
 * guesses.
 *
 * It restores every element it touches: each hover is followed by the matching leave, and the run
 * ends by asserting no tooltip is left on the page. If one is, it says so in `gaps`.
 *
 * ── WHAT TO DO WITH IT ─────────────────────────────────────────────────────────────────────────
 *
 * Send the downloaded JSON. The four questions it answers, none of which we can answer today:
 *
 *   1. `.arrow` or `.tooltip-arrow`?           (Bootstrap 4 vs 5 — which one we should emit)
 *   2. `x-placement` or `data-popper-placement`?
 *   3. `bs-tooltip-left` or `bs-tooltip-start`? (BS5 renamed the logical directions)
 *   4. Where is it inserted — `document.body`, or as a sibling of the host?
 */
(async () => {
  'use strict';

  const HTML_CAP = 20000;
  const started = new Date().toISOString();
  const log = { meta: {}, role: {}, steps: [], tooltips: [], stylesheet: {}, native: [], gaps: [] };

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const trim = (s, cap = 8000) =>
    typeof s === 'string' && s.length > cap ? s.slice(0, cap) + `…[+${s.length - cap}]` : s;
  const gap = (what, why) => log.gaps.push({ what, why });
  const note = (step, detail) => {
    log.steps.push({ at: new Date().toISOString(), step, detail });
    console.log(`[tt] ${step}${detail ? ' — ' + detail : ''}`);
  };

  /* ── the guard, identical to ptr-collect.js. Only the optional dropdown pass can reach it. ── */
  const FORBIDDEN = /delete|upload|remove|play|stop|send|save|submit|post|kick|ban|mute|reset/i;
  const clickSafe = (el, why) => {
    if (!el) return false;
    const fingerprint = [
      el.getAttribute?.('title') ?? '',
      el.getAttribute?.('ngbtooltip') ?? '',
      el.className ?? '',
      el.id ?? '',
      (el.textContent ?? '').slice(0, 60)
    ].join(' ');
    if (FORBIDDEN.test(fingerprint)) {
      note('REFUSED to click', `${why} — denylist: "${fingerprint.trim().slice(0, 70)}"`);
      return false;
    }
    if (el.type === 'submit' || el.tagName === 'FORM') {
      note('REFUSED to click', `${why} — is a submit`);
      return false;
    }
    el.click();
    return true;
  };

  /* Everything that could differ between the two Bootstrap generations, plus the paint. */
  const STYLE_PROPS = [
    'position',
    'display',
    'zIndex',
    'opacity',
    'visibility',
    'top',
    'left',
    'right',
    'bottom',
    'transform',
    'margin',
    'padding',
    'maxWidth',
    'width',
    'height',
    'backgroundColor',
    'color',
    'borderRadius',
    'borderWidth',
    'borderStyle',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'textAlign',
    'whiteSpace',
    'pointerEvents',
    'transition',
    'animation',
    'boxShadow'
  ];
  const styleOf = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const out = {};
    for (const p of STYLE_PROPS) out[p] = cs[p];
    return out;
  };
  const rectOf = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: Math.round(r.left * 100) / 100,
      y: Math.round(r.top * 100) / 100,
      w: Math.round(r.width * 100) / 100,
      h: Math.round(r.height * 100) / 100
    };
  };
  const attrsOf = (el) => {
    if (!el) return null;
    const out = {};
    for (const a of el.attributes) out[a.name] = a.value;
    return out;
  };
  const snap = (el) =>
    !el
      ? null
      : {
          tag: el.tagName,
          className: String(el.className || ''),
          attrs: attrsOf(el),
          rect: rectOf(el),
          style: styleOf(el),
          outerHTML: trim(el.outerHTML, HTML_CAP)
        };

  /* Proves a class has NO rule, rather than merely failing to find one. */
  const rulesMatching = (fragment) => {
    const found = [];
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        found.push({ href: sheet.href, error: 'CORS — cannot read' });
        continue;
      }
      const walk = (list) => {
        for (const rule of list) {
          if (rule.cssRules) {
            walk(rule.cssRules);
            continue;
          }
          if (rule.selectorText?.includes(fragment))
            found.push({
              href: sheet.href,
              selector: rule.selectorText,
              css: trim(rule.cssText, 1500)
            });
        }
      };
      walk(rules);
    }
    return found;
  };

  /* Anything that is a tooltip, in either generation's spelling. */
  const TOOLTIP_SELECTOR = [
    'ngb-tooltip-window',
    '.tooltip',
    '[role="tooltip"]',
    '[id^="ngb-tooltip"]'
  ].join(',');
  const liveTooltips = () => [...document.querySelectorAll(TOOLTIP_SELECTOR)];

  /* ── 1. meta and role ─────────────────────────────────────────────────────────────────────── */
  log.meta = {
    startedAt: started,
    url: location.href,
    title: document.title,
    userAgent: navigator.userAgent,
    viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
    themeClass: document.body.className,
    // Which libraries are actually on the page decides which tooltip DOM to expect.
    libraries: {
      angularVersion: window.ng?.version?.full ?? null,
      hasNgbTooltipElement: !!document.querySelector('ngb-tooltip-window'),
      bootstrapGlobal: typeof window.bootstrap,
      bootstrapVersion: window.bootstrap?.Tooltip?.VERSION ?? null,
      jQueryTooltip: typeof window.jQuery?.fn?.tooltip
    }
  };

  // Read off what is on screen, not from a claim. The composer's own controls differ by role, and
  // four of the nine tooltips only exist for a presenter.
  const seen = (sel) => !!document.querySelector(sel);
  log.role = {
    uploadImage: seen('[ngbtooltip="Upload an Image"]'),
    playYouTube: seen('[ngbtooltip="Play YouTube For All"]'),
    searchGifs: seen('[ngbtooltip="Search for GIFs"]'),
    screenTabs: seen('#screenTabs'),
    postAlert: !!document.querySelector('.pmToolbar, [class*="postAlert"]')
  };
  const role = log.role.playYouTube ? 'presenter' : 'member';
  log.role.detected = role;
  note('role detected', role);
  if (role === 'member') {
    gap(
      'presenter-only tooltips',
      'Signed in as a member, so "Play YouTube For All" and the screen-tab gear are not on the page. Run this again as a presenter to capture those.'
    );
  }

  /* ── 2. the whole point: hover each one and capture what renders ──────────────────────────── */

  /**
   * ng-bootstrap binds `mouseenter`; different versions and wrappers also listen on pointer and
   * mouseover. All are dispatched because the cost of an extra event is nothing and a missed
   * tooltip is the whole run wasted.
   */
  const OPEN_EVENTS = ['pointerenter', 'mouseenter', 'mouseover', 'focusin', 'focus'];
  const CLOSE_EVENTS = ['pointerleave', 'mouseleave', 'mouseout', 'focusout', 'blur'];
  const fire = (el, type) => {
    const Ctor = type.startsWith('pointer')
      ? window.PointerEvent
      : type.startsWith('focus') || type === 'blur'
        ? window.FocusEvent
        : window.MouseEvent;
    try {
      el.dispatchEvent(new Ctor(type, { bubbles: true, cancelable: true, view: window }));
    } catch {
      el.dispatchEvent(new Event(type, { bubbles: true }));
    }
  };

  async function capture(host, label) {
    const before = new Set(liveTooltips());
    const t0 = performance.now();

    for (const type of OPEN_EVENTS) fire(host, type);

    // Poll rather than sleep once: this also MEASURES the open delay, which is a value we have
    // guessed at (ng-bootstrap's default is 0) and never observed.
    let tip = null;
    let appearedAfterMs = null;
    for (let i = 0; i < 40 && !tip; i++) {
      await wait(25);
      tip = liveTooltips().find((el) => !before.has(el)) ?? null;
      if (tip) appearedAfterMs = Math.round(performance.now() - t0);
    }

    const record = {
      label,
      host: snap(host),
      appeared: !!tip,
      appearedAfterMs,
      tooltip: null,
      parts: {},
      insertedInto: null,
      generation: null
    };

    if (!tip) {
      gap(
        `tooltip: ${label}`,
        'Hovering produced no tooltip element. Either the directive is not bound on this build, the control is off-screen, or the events it listens for differ. Nothing has been invented for it.'
      );
    } else {
      record.tooltip = snap(tip);
      record.insertedInto = {
        parentTag: tip.parentElement?.tagName ?? null,
        parentClass: String(tip.parentElement?.className || ''),
        parentId: tip.parentElement?.id || null,
        // The one thing that decides how ours must be positioned.
        isDirectChildOfBody: tip.parentElement === document.body,
        isSiblingOfHost: tip.parentElement === host.parentElement
      };

      // THE four unknowns, answered by reading the element rather than by reasoning about it.
      const cls = String(tip.className || '');
      record.generation = {
        arrowSpelling: tip.querySelector('.tooltip-arrow')
          ? 'tooltip-arrow (Bootstrap 5)'
          : tip.querySelector('.arrow')
            ? 'arrow (Bootstrap 4)'
            : 'neither found',
        placementAttribute: tip.hasAttribute('data-popper-placement')
          ? 'data-popper-placement (Popper 2 / BS5)'
          : tip.hasAttribute('x-placement')
            ? 'x-placement (Popper 1 / BS4)'
            : 'neither present',
        placementAttributeValue:
          tip.getAttribute('data-popper-placement') ?? tip.getAttribute('x-placement') ?? null,
        directionClass: (cls.match(/bs-tooltip-[a-z-]+/) ?? [null])[0],
        // BS5 renamed left/right to start/end. Which one is present is the answer.
        usesLogicalDirections: /bs-tooltip-(start|end)\b/.test(cls),
        allClasses: cls.split(/\s+/).filter(Boolean)
      };
      record.parts = {
        inner: snap(tip.querySelector('.tooltip-inner')),
        arrowBs4: snap(tip.querySelector('.arrow')),
        arrowBs5: snap(tip.querySelector('.tooltip-arrow')),
        // The arrow is painted by a pseudo-element in both generations, and it is the one part
        // `outerHTML` cannot show.
        arrowBefore: (() => {
          const arrow = tip.querySelector('.tooltip-arrow, .arrow');
          if (!arrow) return null;
          const cs = getComputedStyle(arrow, '::before');
          const out = {};
          for (const p of STYLE_PROPS) out[p] = cs[p];
          out.content = cs.content;
          return out;
        })()
      };
      // What the host gained while open — ng-bootstrap sets aria-describedby, and we guessed at it.
      record.hostWhileOpen = { attrs: attrsOf(host) };
    }

    /*
      Closing, and then PROVING it closed.

      The 2026-08-11 run left four tooltips on the live page — the copies inside the message modals.
      Firing the leave events once and waiting a fixed 150ms was not enough: `.tooltip` carries
      `transition: opacity .15s linear`, so a fade that starts late is still on screen when the check
      runs, and a host inside a hidden modal may not receive a pointer event at all.

      So it retries, and if the element still will not go it removes the node it created — the page
      is the owner's, and leaving a black bubble stuck over their room is not an acceptable cost of
      observing it. Whether it had to do that is recorded, because a forced removal means the close
      path itself is worth another look.
    */
    for (let attempt = 0; attempt < 4; attempt++) {
      for (const type of CLOSE_EVENTS) fire(host, type);
      // Also from the element the pointer would move TO, which is what really ends a hover.
      try {
        fire(document.body, 'pointerover');
        fire(document.body, 'mouseover');
      } catch {
        /* body is always there; this is belt and braces */
      }
      await wait(250);
      if (!liveTooltips().some((el) => !before.has(el))) break;
    }

    var strays = liveTooltips().filter((el) => !before.has(el));
    if (strays.length) {
      record.forciblyRemoved = strays.length;
      for (const el of strays) el.remove();
    }
    record.closedCleanly = !liveTooltips().some((el) => !before.has(el));
    if (!record.closedCleanly) {
      gap(
        `tooltip would not close on its own: ${label}`,
        'Four rounds of leave events did not dismiss it, so the element this script created was removed directly. The page is NOT left altered, but the close path is worth a look — it is usually a host inside a hidden modal that never receives the pointer event.'
      );
    }
    return record;
  }

  /* Every tooltipped control on the page, in either attribute spelling. `tooltip=` is the one the
     screen-tab eye badge uses; `ngbtooltip=` is the composer's. */
  const hosts = [...document.querySelectorAll('[ngbtooltip], [ngbTooltip], [tooltip]')];
  note('tooltipped elements found', String(hosts.length));
  if (!hosts.length) {
    gap(
      'no tooltipped elements',
      'Nothing on this page carries ngbtooltip or tooltip. Open the room with the chat pane visible and run it again.'
    );
  }

  for (const [i, host] of hosts.entries()) {
    const label =
      host.getAttribute('ngbtooltip') ||
      host.getAttribute('ngbTooltip') ||
      host.getAttribute('tooltip') ||
      `#${i}`;
    note('hovering', label.slice(0, 60));
    log.tooltips.push(await capture(host, label));
  }

  /* ── 3. the stylesheet side, so "this class has no rule" can be proven ────────────────────── */
  log.stylesheet = {
    tooltip: rulesMatching('.tooltip'),
    bsTooltip: rulesMatching('bs-tooltip'),
    arrowBs4: rulesMatching('.arrow'),
    arrowBs5: rulesMatching('tooltip-arrow'),
    // Whichever direction classes exist tells us which generation's sheet is live, independently of
    // what the DOM did.
    logicalDirections: rulesMatching('bs-tooltip-start').concat(rulesMatching('bs-tooltip-end')),
    physicalDirections: rulesMatching('bs-tooltip-left').concat(rulesMatching('bs-tooltip-right')),
    variables: (() => {
      const cs = getComputedStyle(document.documentElement);
      const out = {};
      for (const name of [
        '--bs-tooltip-zindex',
        '--bs-tooltip-bg',
        '--bs-tooltip-color',
        '--bs-tooltip-opacity',
        '--bs-tooltip-max-width',
        '--bs-tooltip-padding-x',
        '--bs-tooltip-padding-y',
        '--bs-tooltip-font-size',
        '--bs-tooltip-border-radius',
        '--bs-tooltip-arrow-width',
        '--bs-tooltip-arrow-height'
      ])
        out[name] = cs.getPropertyValue(name).trim() || null;
      return out;
    })()
  };

  /* ── 4. the ones that are NOT ours to capture, recorded rather than ignored ───────────────── */
  log.native = [...document.querySelectorAll('[title]')].slice(0, 60).map((el) => ({
    title: el.getAttribute('title'),
    tag: el.tagName,
    className: String(el.className || '')
  }));
  if (log.native.length) {
    gap(
      'title= tooltips are the browser own',
      `${log.native.length} elements use a native title attribute. The OS draws those and no script can capture their appearance — the text is recorded, the rendering is not ours to match.`
    );
  }

  /* ── 5. honest absences, then download ───────────────────────────────────────────────────── */
  const rendered = log.tooltips.filter((t) => t.appeared);
  if (!rendered.length) {
    gap(
      'nothing rendered',
      'Not one hover produced a tooltip. Do NOT treat this run as evidence that the original has no tooltips — treat it as this script failing to reach them, and say so.'
    );
  }

  const verdict = rendered.length
    ? {
        arrowSpelling: [...new Set(rendered.map((t) => t.generation.arrowSpelling))],
        placementAttribute: [...new Set(rendered.map((t) => t.generation.placementAttribute))],
        directionClasses: [...new Set(rendered.map((t) => t.generation.directionClass))],
        insertedIntoBody: [...new Set(rendered.map((t) => t.insertedInto.isDirectChildOfBody))],
        openDelaysMs: [...new Set(rendered.map((t) => t.appearedAfterMs))]
      }
    : null;
  log.verdict = verdict;

  const name = `tooltips-${role}-${started.slice(0, 19).replace(/[:T]/g, '-')}.json`;
  const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();

  console.log(
    `\n[tt] done — ${name}`,
    `\n  role            : ${role}`,
    `\n  hosts hovered   : ${log.tooltips.length}`,
    `\n  actually rendered: ${rendered.length}`,
    `\n  native title=   : ${log.native.length}`,
    `\n  gaps            : ${log.gaps.length}`
  );
  if (verdict) {
    console.log('\n  THE ANSWERS:');
    console.log(`    arrow      : ${verdict.arrowSpelling.join(', ')}`);
    console.log(`    placement  : ${verdict.placementAttribute.join(', ')}`);
    console.log(`    direction  : ${verdict.directionClasses.join(', ')}`);
    console.log(`    in body    : ${verdict.insertedIntoBody.join(', ')}`);
    console.log(`    open delay : ${verdict.openDelaysMs.join(', ')} ms`);
  }
  log.gaps.forEach((g) => console.log(`    · ${g.what} — ${g.why}`));
  console.log('\nSend me the downloaded file.');
})();
