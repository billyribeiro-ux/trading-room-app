/* ============================================================================
 * Room login capture — paste into the DevTools console on /session?id=…
 *
 * Focused on the Angular room app rather than the AngularJS controller, so it
 * differs from capture-ptr-reference.js in three ways that matter here:
 *
 *   • the page is small (~100 elements), so it records EVERY computed property
 *     (~340) instead of a curated subset — no information budget to spend
 *   • it records the `<!---->` comment anchors Angular leaves where an @if
 *     rendered nothing, with their exact sibling position. Those anchors are the
 *     only trace of branches this screen has but did not show
 *   • it resolves the ~270 CSS custom properties, including the paired
 *     --lightTheme-* / --darkTheme-* token sets
 *
 * ⚠ It never clicks and never submits. Hidden Bootstrap 5 modals are revealed by
 * toggling `.show` + inline display, which is pure CSS, and every mutation is
 * reverted in a finally block.
 *
 * ⚠ It CANNOT reveal an unrendered @if. A branch that did not render has no DOM
 * to read. Those need a room configured differently — see WHAT THIS CANNOT DO
 * at the bottom of the console output.
 *
 * Usage: paste, hit enter. Type `allow pasting` first if Chrome blocks it.
 * ========================================================================== */

(() => {
  'use strict';

  const CFG = {
    ALL_STYLES: true, // false → ~60 common properties instead of ~340
    REVEAL_MODALS: true, // show .modal.fade so hidden dialogs get real geometry
    REDACT: true // blank out email/gravatar/nickname before download
  };

  const log = (...a) => console.log('%c[room-login]', 'color:#0d6efd;font-weight:700', ...a);
  const now = () => new Date().toISOString();
  const settle = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

  const COMMON = `display visibility position top right bottom left z-index float box-sizing
width height min-width max-width min-height max-height flex flex-direction flex-wrap
align-items justify-content gap order margin-top margin-right margin-bottom margin-left
padding-top padding-right padding-bottom padding-left border-top-width border-right-width
border-bottom-width border-left-width border-top-style border-top-color border-right-color
border-bottom-color border-left-color border-top-left-radius border-top-right-radius
border-bottom-left-radius border-bottom-right-radius background-color background-image
color font-family font-size font-weight font-style line-height letter-spacing text-align
text-transform text-decoration-line white-space vertical-align overflow-x overflow-y
opacity box-shadow outline-color cursor pointer-events transition-property
transition-duration transform filter object-fit content`
    .trim()
    .split(/\s+/);

  function styleOf(el, pseudo = null) {
    const cs = getComputedStyle(el, pseudo);
    const o = {};
    if (CFG.ALL_STYLES && !pseudo) {
      for (let i = 0; i < cs.length; i++) o[cs[i]] = cs.getPropertyValue(cs[i]);
    } else {
      for (const p of COMMON) {
        const v = cs.getPropertyValue(p);
        if (v) o[p] = v;
      }
    }
    return o;
  }

  function pseudoOf(el, which) {
    const cs = getComputedStyle(el, which);
    const c = cs.getPropertyValue('content');
    if (!c || c === 'none' || c === 'normal') return null;
    const o = {};
    for (const p of COMMON) {
      const v = cs.getPropertyValue(p);
      if (v) o[p] = v;
    }
    return o;
  }

  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    return {
      x: +(r.x + scrollX).toFixed(3),
      y: +(r.y + scrollY).toFixed(3),
      w: +r.width.toFixed(3),
      h: +r.height.toFixed(3)
    };
  };

  /**
   * Angular writes `<!---->` where a structural directive produced no view.
   * Recording them with their sibling index makes the unseen branches countable
   * and locatable, which is the whole point of running this on a login screen
   * whose config hides most of its own fields.
   */
  function anchorsIn(el, path) {
    const out = [];
    let elementIndex = 0;
    for (const node of el.childNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        elementIndex++;
        continue;
      }
      if (node.nodeType === Node.COMMENT_NODE && node.nodeValue === '') {
        out.push({
          parentPath: path,
          afterElementIndex: elementIndex,
          prevElement: node.previousElementSibling
            ? node.previousElementSibling.tagName.toLowerCase() +
              (node.previousElementSibling.className
                ? '.' + String(node.previousElementSibling.className).trim().split(/\s+/).join('.')
                : '')
            : null,
          nextElement: node.nextElementSibling
            ? node.nextElementSibling.tagName.toLowerCase() +
              (node.nextElementSibling.className
                ? '.' + String(node.nextElementSibling.className).trim().split(/\s+/).join('.')
                : '')
            : null
        });
      }
    }
    return out;
  }

  function walk(root) {
    const nodes = [];
    const anchors = [];
    (function rec(el, path) {
      const attrs = {};
      for (const a of el.attributes) attrs[a.name] = a.value;
      let text = '';
      for (const n of el.childNodes) if (n.nodeType === 3) text += n.nodeValue;
      text = text.replace(/\s+/g, ' ').trim();

      const rec_ = { path, tag: el.tagName.toLowerCase(), attrs, rect: rectOf(el), style: styleOf(el) };
      if (text) rec_.text = text;
      const b = pseudoOf(el, '::before');
      if (b) rec_.before = b;
      const a2 = pseudoOf(el, '::after');
      if (a2) rec_.after = a2;
      // form state Angular tracks but does not put in the DOM
      if (el.matches('input,textarea,select')) {
        rec_.control = {
          value: el.value,
          disabled: el.disabled,
          readOnly: el.readOnly,
          required: el.required,
          checked: el.checked ?? null,
          validity: Object.fromEntries(
            ['valueMissing', 'typeMismatch', 'patternMismatch', 'tooShort', 'tooLong', 'valid'].map((k) => [
              k,
              el.validity[k]
            ])
          ),
          labelledBy: el.labels ? Array.from(el.labels).map((l) => l.textContent.trim()) : [],
          describedByExists: el.getAttribute('aria-describedby')
            ? !!document.getElementById(el.getAttribute('aria-describedby'))
            : null
        };
      }
      nodes.push(rec_);
      anchors.push(...anchorsIn(el, path));

      let i = 0;
      for (const c of el.children) rec(c, `${path}.${i++}` + (c.id ? `#${c.id}` : ''));
    })(root, 'r');
    return { nodes, anchors };
  }

  function customProperties() {
    const out = { root: {}, body: {} };
    for (const [key, el] of [
      ['root', document.documentElement],
      ['body', document.body]
    ]) {
      const cs = getComputedStyle(el);
      for (let i = 0; i < cs.length; i++) {
        const p = cs[i];
        if (p.startsWith('--')) out[key][p] = cs.getPropertyValue(p).trim();
      }
    }
    const names = new Set([...Object.keys(out.root), ...Object.keys(out.body)]);
    const themePairs = {};
    for (const n of names) {
      const m = /^--(light|dark)Theme-(.+)$/.exec(n);
      if (!m) continue;
      (themePairs[m[2]] ??= {})[m[1]] = out.root[n] ?? out.body[n];
    }
    return { ...out, themePairs, count: names.size };
  }

  async function revealModals() {
    const undo = [];
    if (!CFG.REVEAL_MODALS) return { revealed: [], undo };
    const revealed = [];
    // Bootstrap 5 uses .show (BS3 used .in) — the room is BS5.
    for (const m of document.querySelectorAll('.modal.fade')) {
      const prevDisplay = m.style.display;
      m.classList.add('show');
      m.style.display = 'block';
      m.removeAttribute('aria-hidden');
      undo.push(() => {
        m.classList.remove('show');
        m.style.display = prevDisplay;
        m.setAttribute('aria-hidden', 'true');
      });
      revealed.push(m.id || m.className);
    }
    await settle();
    return { revealed, undo };
  }

  const redact = (s) =>
    CFG.REDACT && typeof s === 'string'
      ? s
          .replace(/(<div\b[^>]*class="[^"]*\buser-nick\b[^"]*"[^>]*>)@?[^<]*(<\/div>)/g, '$1@[OWNER_NAME]$2')
          .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
          .replace(/\b[a-f0-9]{32}\b/g, '[GRAVATAR_MD5_A]')
      : s;

  function deepRedact(o) {
    if (!CFG.REDACT) return o;
    return JSON.parse(JSON.stringify(o, (_, v) => (typeof v === 'string' ? redact(v) : v)));
  }

  async function run() {
    const t0 = Date.now();
    const root = document.querySelector('app-root') || document.body;

    const before = walk(root);
    log(`${before.nodes.length} elements, ${before.anchors.length} unrendered @if anchors`);

    const { revealed, undo } = await revealModals();
    const after = revealed.length ? walk(root) : before;
    if (revealed.length) log(`revealed ${revealed.length} modal(s): ${revealed.join(', ')}`);

    const vars = customProperties();
    log(`${vars.count} CSS custom properties, ${Object.keys(vars.themePairs).length} light/dark pairs`);

    const payload = {
      capturedAt: now(),
      url: location.href,
      ua: navigator.userAgent,
      viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
      angularVersion: document.querySelector('[ng-version]')?.getAttribute('ng-version') ?? null,
      appVersion: (document.body.textContent.match(/Version:\s*(v[\w.-]+)/) || [])[1] ?? null,
      title: document.title,
      head: document.head.outerHTML,
      rawHtml: root.outerHTML,
      customProperties: vars,
      stylesheets: Array.from(document.styleSheets).map((ss) => {
        try {
          return {
            href: ss.href,
            ruleCount: ss.cssRules.length,
            rules: Array.from(ss.cssRules)
              .map((r) => r.cssText)
              .join('\n')
          };
        } catch {
          return { href: ss.href, ruleCount: 0, rules: '', access: 'cors-blocked' };
        }
      }),
      scripts: Array.from(document.scripts).map((s) => ({
        src: s.src || '(inline)',
        type: s.type,
        defer: s.defer,
        async: s.async
      })),
      fonts: (() => {
        try {
          return Array.from(document.fonts).map((f) => ({ family: f.family, weight: f.weight, status: f.status }));
        } catch {
          return null;
        }
      })(),
      baseline: before,
      withModalsRevealed: revealed.length ? after : null
    };

    try {
      const out = deepRedact(payload);
      const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `room-login-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      log(`downloaded — ${(blob.size / 1048576).toFixed(2)} MB in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    } finally {
      while (undo.length) {
        try {
          undo.pop()();
        } catch {}
      }
    }

    console.table(
      before.anchors.map((a, i) => ({
        '#': i + 1,
        parent: a.parentPath,
        after: a.prevElement,
        before: a.nextElement
      }))
    );

    console.warn(
      'WHAT THIS CANNOT DO: an @if that rendered nothing leaves only an empty comment — ' +
        'there is no DOM to read. The ' +
        before.anchors.length +
        ' anchors above are branches this ' +
        "room's configuration hides. To see them, capture again with: a password-protected room " +
        '(showPasswordField), hasRequiredPhoneInLogin on, usernameInstructions set, and after a ' +
        'failed login (the error slot).'
    );

    return { elements: before.nodes.length, anchors: before.anchors.length, cssVars: vars.count };
  }

  window.__ROOM_LOGIN_CAPTURE = { run, CFG };
  log('loaded — running now; re-run any time with __ROOM_LOGIN_CAPTURE.run()');
  return run();
})();
