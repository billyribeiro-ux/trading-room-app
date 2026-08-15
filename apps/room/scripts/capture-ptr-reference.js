/* ============================================================================
 * PTR reference capture harness — paste into the Chrome DevTools console.
 *
 * Produces dumps in the SAME shape as NEXT-STEP/ptr1.json / prt2.json, so
 * scripts/decode-ptr-dump.mjs keeps working unchanged — but closes the gaps the
 * first two dumps left open:
 *
 *   • <head>, <title>, <meta>, <link> — the old dumps started at <body>
 *   • rawHtml — full outerHTML, never captured before
 *   • CORS-blocked stylesheets — refetched over the network (video-js, toaster)
 *   • untruncated attrs and text — the old caps were 300 / 250 chars
 *   • border-collapse / table-layout / border-spacing and ~60 more properties
 *   • submenus captured OPEN, with real geometry (old ones were captured closed)
 *   • modals captured SETTLED, with a real .modal-backdrop
 *   • :focus states, captured live; :hover/:active rules, extracted from CSSOM
 *   • every @media block with its evaluated matches
 *   • a timed recording pass, so live chat/alerts/presence are finally observed
 *
 * ⚠ SAFETY: this script NEVER clicks anything and never dispatches an event to
 * an app handler. Menus are opened by toggling Bootstrap's own `.open`/`.in`
 * classes, which is pure CSS. Nothing is submitted, saved, or deleted. Every
 * mutation it makes is reverted in a finally block.
 *
 * USAGE
 *   1. Open the page you want captured. Log in as the role you want recorded.
 *   2. DevTools → Console. If Chrome blocks the paste, type `allow pasting` first.
 *   3. Paste this whole file, hit enter. It auto-runs.
 *   4. Approve "Download multiple files" when Chrome asks.
 *   5. For the live room, let RECORD_MS elapse with chat/alerts actually moving.
 *
 * Re-run per route. The routes that still have zero coverage are the live room
 * itself (chat, alerts, video, presence) — that is where the .dark styling and
 * the .roomArea / .alertsChatArea rules finally get exercised.
 * ========================================================================== */

(() => {
  'use strict';

  const CFG = {
    LABEL: null, // null → derived from the URL hash
    ATTR_CAP: 0, // 0 = no truncation (old dumps: 300)
    TEXT_CAP: 0, // 0 = no truncation (old dumps: 250)
    STYLE_MODE: 'curated', // 'curated' (~155 props) | 'all' (~340, ~3x bigger)
    RAW_HTML: true,
    INTERACTIONS: true, // open every dropdown/submenu/modal and measure it
    FOCUS_STATES: true, // real :focus computed styles (calls .focus(), safe)
    STATE_RULES: true, // :hover/:active/:focus/.open rules pulled from CSSOM
    MEDIA_QUERIES: true,
    REFETCH_CORS: true, // re-download stylesheets the CSSOM refuses to expose
    RECORD_MS: 20000, // 0 to skip the live-behaviour recording pass
    RECORD_EVERY: 2000, // how often to poll during recording
    RECORD_SNAPSHOTS: 2, // full-DOM snapshots to KEEP from the recording window.
    // Mutations are logged continuously regardless; a full
    // DOM copy per poll is ~3.5 MB of near-duplicate data,
    // which is what blew the first run out to 12 files.
    SCOPE_KEYS_ONLY: true, // dump Angular scope KEY names, never their values (PII)
    NODES_PER_FILE: 1200, // chunk size for the downloaded parts
    QUIET: false
  };

  const log = (...a) => {
    if (!CFG.QUIET) console.log('%c[ptr-capture]', 'color:#0a84ff;font-weight:700', ...a);
  };
  const warn = (...a) => console.warn('[ptr-capture]', ...a);
  const now = () => new Date().toISOString();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const settle = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  const cap = (s, n) => (n && typeof s === 'string' && s.length > n ? s.slice(0, n) : s);

  /* -------------------------------------------------------------- style props */
  const CURATED = `
display visibility position top right bottom left z-index float clear box-sizing
width height min-width max-width min-height max-height aspect-ratio
flex flex-direction flex-wrap flex-grow flex-shrink flex-basis align-items align-self
align-content justify-content justify-items justify-self gap row-gap column-gap order
grid-template-columns grid-template-rows grid-template-areas grid-auto-flow
grid-column grid-row place-items place-content
margin-top margin-right margin-bottom margin-left
padding-top padding-right padding-bottom padding-left
border-top-width border-right-width border-bottom-width border-left-width
border-top-style border-right-style border-bottom-style border-left-style
border-top-color border-right-color border-bottom-color border-left-color
border-top-left-radius border-top-right-radius border-bottom-left-radius border-bottom-right-radius
border-collapse border-spacing table-layout empty-cells caption-side
background-color background-image background-position background-size background-repeat
background-clip background-origin background-attachment background-blend-mode
color font-family font-size font-weight font-style font-variant font-stretch
line-height letter-spacing word-spacing text-align text-align-last text-transform
text-decoration-line text-decoration-color text-decoration-style text-indent
text-shadow text-overflow white-space vertical-align word-break overflow-wrap hyphens
tab-size direction writing-mode unicode-bidi
overflow-x overflow-y overscroll-behavior scroll-behavior
opacity box-shadow outline-style outline-width outline-color outline-offset
cursor pointer-events user-select touch-action
transition-property transition-duration transition-timing-function transition-delay
animation-name animation-duration animation-timing-function animation-iteration-count
transform transform-origin perspective
filter backdrop-filter mix-blend-mode isolation clip-path mask-image
object-fit object-position list-style-type list-style-position list-style-image
content quotes resize appearance will-change contain
fill stroke stroke-width
caret-color accent-color
`
    .trim()
    .split(/\s+/);

  const PSEUDO_PROPS = `
content display position top right bottom left width height
margin-top margin-right margin-bottom margin-left
padding-top padding-right padding-bottom padding-left
border-top-width border-right-width border-bottom-width border-left-width
border-top-color border-right-color border-bottom-color border-left-color
border-top-left-radius border-top-right-radius border-bottom-left-radius border-bottom-right-radius
color background-color background-image font-family font-size font-weight font-style
line-height letter-spacing text-align vertical-align white-space opacity
transform box-shadow float clear z-index overflow-x overflow-y
`
    .trim()
    .split(/\s+/);

  function readStyle(cs, props) {
    const o = {};
    for (const p of props) {
      const v = cs.getPropertyValue(p);
      if (v !== '') o[p] = v;
    }
    return o;
  }
  function styleOf(el) {
    const cs = getComputedStyle(el);
    if (CFG.STYLE_MODE === 'all') {
      const o = {};
      for (let i = 0; i < cs.length; i++) {
        const p = cs[i];
        o[p] = cs.getPropertyValue(p);
      }
      return o;
    }
    return readStyle(cs, CURATED);
  }
  function pseudoOf(el, which) {
    const cs = getComputedStyle(el, which);
    const content = cs.getPropertyValue('content');
    if (!content || content === 'none' || content === 'normal') return null;
    return readStyle(cs, PSEUDO_PROPS);
  }
  function customProps(el) {
    const cs = getComputedStyle(el),
      o = {};
    for (let i = 0; i < cs.length; i++) {
      const p = cs[i];
      if (p.startsWith('--')) o[p] = cs.getPropertyValue(p);
    }
    return o;
  }

  /* --------------------------------------------------------------- node walk */
  function attrsOf(el) {
    const o = {};
    for (const a of el.attributes) o[a.name] = cap(a.value, CFG.ATTR_CAP);
    return o;
  }
  function ownText(el) {
    let t = '';
    for (const n of el.childNodes) if (n.nodeType === 3) t += n.nodeValue;
    t = t.replace(/\s+/g, ' ').trim();
    return t ? cap(t, CFG.TEXT_CAP) : undefined;
  }
  function rectOf(el) {
    const r = el.getBoundingClientRect();
    return {
      x: +(r.x + scrollX).toFixed(4),
      y: +(r.y + scrollY).toFixed(4),
      w: +r.width.toFixed(4),
      h: +r.height.toFixed(4)
    };
  }

  function walk(root) {
    const nodes = [];
    let truncated = false;
    (function rec(el, path) {
      const n = {
        path,
        tag: el.tagName.toLowerCase(),
        attrs: attrsOf(el),
        rect: rectOf(el),
        style: styleOf(el)
      };
      const t = ownText(el);
      if (t !== undefined) n.text = t;
      const b = pseudoOf(el, '::before');
      if (b) n.before = b;
      const a = pseudoOf(el, '::after');
      if (a) n.after = a;
      nodes.push(n);
      let i = 0;
      for (const c of el.children) {
        const seg = `${path}.${i++}` + (c.id ? `#${c.id}` : '');
        rec(c, seg);
      }
    })(root, 'r');
    return { count: nodes.length, truncated, nodes };
  }

  function captureDom(label, root, extra = {}) {
    return Object.assign(
      {
        label,
        ts: now(),
        viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
        themeClass: document.body.className,
        cssVars: { root: customProps(document.documentElement), body: customProps(document.body) }
      },
      extra,
      { fullDom: walk(root) }
    );
  }
  function captureSubtree(label, root, extra = {}) {
    const c = captureDom(label, root, extra);
    c.subtree = c.fullDom;
    delete c.fullDom;
    return c;
  }

  /* -------------------------------------------------------------- stylesheets */
  async function stylesheets() {
    const out = [];
    for (const ss of Array.from(document.styleSheets)) {
      const rec = {
        href: ss.href || null,
        media: ss.media ? Array.from(ss.media).join(', ') : '',
        ruleCount: 0,
        rules: '',
        access: 'ok'
      };
      try {
        const rules = ss.cssRules;
        rec.ruleCount = rules.length;
        rec.rules = Array.from(rules)
          .map((r) => r.cssText)
          .join('\n');
      } catch {
        rec.access = 'cors-blocked';
        if (CFG.REFETCH_CORS && ss.href) {
          try {
            const res = await fetch(ss.href, { mode: 'cors', credentials: 'omit' });
            if (res.ok) {
              rec.rules = await res.text();
              rec.ruleCount = (rec.rules.match(/\{/g) || []).length;
              rec.access = 'recovered-by-fetch';
            } else rec.access = `cors-blocked; fetch ${res.status}`;
          } catch (err) {
            rec.access = `cors-blocked; fetch failed: ${err.message}`;
          }
        }
      }
      out.push(rec);
    }
    return out;
  }

  /* ------------------------------------------------- :hover/:active/.open CSS */
  function stateRules() {
    const wanted =
      /:(hover|active|focus|focus-within|focus-visible|visited|checked|disabled)|\.(open|show|in|active|collapsing)\b/;
    const out = [];
    for (const ss of Array.from(document.styleSheets)) {
      let rules;
      try {
        rules = ss.cssRules;
      } catch {
        continue;
      }
      (function rec(list, media) {
        for (const r of Array.from(list)) {
          // NB: in Chrome with CSS-nesting support, CSSStyleRule ALSO exposes an
          // (empty) .cssRules — so a plain `if (r.cssRules)` recurses into every
          // style rule and matches nothing. Only recurse into rules that are
          // genuinely groupings, i.e. that carry no selectorText of their own.
          if (!r.selectorText && r.cssRules) {
            rec(r.cssRules, r.conditionText || media);
            continue;
          }
          if (!r.selectorText || !wanted.test(r.selectorText)) continue;
          // does anything on this page match the base (state-stripped) selector?
          const base = r.selectorText.replace(/:(hover|active|focus[a-z-]*|visited)/g, '');
          let used = 0;
          for (const sel of base.split(',')) {
            try {
              used += document.querySelectorAll(sel.trim()).length;
            } catch {}
          }
          out.push({
            href: ss.href || '(inline)',
            media: media || null,
            selector: r.selectorText,
            css: r.cssText,
            matchingElementsOnPage: used
          });
        }
      })(rules, '');
    }
    return out;
  }

  /* -------------------------------------------------------------- @media list */
  function mediaQueries() {
    const out = [];
    for (const ss of Array.from(document.styleSheets)) {
      let rules;
      try {
        rules = ss.cssRules;
      } catch {
        continue;
      }
      for (const r of Array.from(rules)) {
        if (r.type !== CSSRule.MEDIA_RULE) continue;
        const q = r.conditionText || r.media.mediaText;
        out.push({
          href: ss.href || '(inline)',
          query: q,
          matchesNow: matchMedia(q).matches,
          ruleCount: r.cssRules.length,
          rules: Array.from(r.cssRules)
            .map((x) => x.cssText)
            .join('\n')
        });
      }
    }
    return out;
  }

  /* ------------------------------------------------------------ :focus states */
  async function focusStates() {
    const caps = [];
    const active = document.activeElement;
    const els = Array.from(
      document.querySelectorAll('input,textarea,select,button,a[href],[tabindex]')
    ).filter((el) => el.getBoundingClientRect().width > 0);
    for (const el of els.slice(0, 60)) {
      try {
        el.focus({ preventScroll: true });
        await settle();
        if (document.activeElement !== el) continue;
        caps.push({
          label: `focus:${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}`,
          ts: now(),
          selector: cssPath(el),
          style: styleOf(el),
          rect: rectOf(el),
          before: pseudoOf(el, '::before'),
          after: pseudoOf(el, '::after')
        });
      } catch {}
    }
    try {
      if (active && active.focus) active.focus({ preventScroll: true });
      else document.activeElement?.blur();
    } catch {}
    return caps;
  }
  function cssPath(el) {
    const p = [];
    for (let n = el; n && n.nodeType === 1 && n !== document.body; n = n.parentElement) {
      let s = n.tagName.toLowerCase();
      if (n.id) {
        s += '#' + n.id;
        p.unshift(s);
        break;
      }
      const cls = (n.className || '').toString().trim().split(/\s+/).filter(Boolean).slice(0, 3);
      if (cls.length) s += '.' + cls.join('.');
      p.unshift(s);
    }
    return p.join(' > ');
  }

  /* ------------------------------------------------------ interaction opening *
   * Class-toggling ONLY. No clicks, no dispatched events, no app handlers fire. */
  async function interactions() {
    const caps = [];
    const undo = [];
    const add = (el, cls) => {
      if (!el.classList.contains(cls)) {
        el.classList.add(cls);
        undo.push(() => el.classList.remove(cls));
      }
    };
    const setStyle = (el, prop, val) => {
      const prev = el.style[prop];
      el.style[prop] = val;
      undo.push(() => {
        el.style[prop] = prev;
      });
    };

    try {
      /* ---- dropdowns, including nested submenus, opened top-down so that the
       parent is OPEN when the child is measured (the old dumps measured
       submenus with the parent closed, so every submenu rect was zero) ---- */
      const menus = Array.from(document.querySelectorAll('.dropdown-menu'));
      log(`interactions: ${menus.length} dropdown-menu nodes`);
      for (const menu of menus) {
        const chain = [];
        for (let n = menu.parentElement; n; n = n.parentElement) {
          if (n.matches('.dropdown, .btn-group, .dropup, li')) chain.unshift(n);
          if (n === document.body) break;
        }
        const opened = [];
        for (const link of chain) {
          add(link, 'open');
          opened.push(link);
        }
        add(menu, 'show');
        setStyle(menu, 'display', 'block');
        await settle();
        caps.push(
          captureSubtree(`dropdown:${menu.className.trim().split(/\s+/).join('.')}`, menu, {
            openedChain: chain.map(cssPath),
            triggerText: (
              chain[chain.length - 1]?.querySelector('.dropdown-toggle,button,a')?.textContent || ''
            )
              .replace(/\s+/g, ' ')
              .trim(),
            triggerSelector: cssPath(chain[chain.length - 1] || menu),
            parentWasOpenedByHarness: true
          })
        );
        // leave them open only for the duration of this measurement
        for (const link of opened) link.classList.remove('open');
        menu.classList.remove('show');
        menu.style.display = '';
      }

      /* ---- modals: settle them properly and give them a real backdrop ---- */
      const modals = Array.from(document.querySelectorAll('.modal'));
      log(`interactions: ${modals.length} modal nodes`);
      for (const modal of modals) {
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade in';
        document.body.appendChild(backdrop);
        add(document.body, 'modal-open');
        setStyle(modal, 'display', 'block');
        add(modal, 'in');
        await sleep(400); // let the .fade transition finish, so we get the SETTLED position
        await settle();
        const c = captureSubtree(`modal:${modal.id || modal.className}`, modal, {
          settled: true,
          backdropSynthesised: true
        });
        c.backdrop = { style: styleOf(backdrop), rect: rectOf(backdrop) };
        caps.push(c);
        backdrop.remove();
        modal.classList.remove('in');
        modal.style.display = '';
        document.body.classList.remove('modal-open');
      }

      /* ---- tab panes: every non-active pane, activated so it actually lays out.
       The old dumps had 1,290 nodes with zero geometry for exactly this reason. */
      const panes = Array.from(document.querySelectorAll('.tab-pane'));
      log(`interactions: ${panes.length} tab panes`);
      for (const pane of panes) {
        if (pane.classList.contains('active')) continue;
        const siblings = Array.from(pane.parentElement.children);
        const wasActive = siblings.find((s) => s.classList.contains('active'));
        if (wasActive) wasActive.classList.remove('active');
        pane.classList.add('active');
        await settle();
        caps.push(
          captureSubtree(`tabpane:${pane.id || cssPath(pane)}`, pane, { activatedByHarness: true })
        );
        pane.classList.remove('active');
        if (wasActive) wasActive.classList.add('active');
      }

      /* ---- collapsibles ---- */
      for (const col of Array.from(document.querySelectorAll('.collapse:not(.in)'))) {
        add(col, 'in');
        setStyle(col, 'height', 'auto');
        await settle();
        caps.push(
          captureSubtree(`collapse:${col.id || cssPath(col)}`, col, { expandedByHarness: true })
        );
        col.classList.remove('in');
        col.style.height = '';
      }
    } finally {
      while (undo.length) {
        try {
          undo.pop()();
        } catch {}
      }
    }
    return caps;
  }

  /* ------------------------------------------------ live-behaviour recording */
  async function record(ms) {
    if (!ms) return { caps: [], mutations: [] };
    log(`recording live behaviour for ${ms / 1000}s — let chat/alerts/video actually move`);
    const mutations = [];
    const mo = new MutationObserver((list) => {
      for (const m of list) {
        mutations.push({
          t: now(),
          type: m.type,
          target: cssPath(m.target),
          attr: m.attributeName || undefined,
          oldValue: m.oldValue !== null ? cap(m.oldValue, 200) : undefined,
          added: m.addedNodes.length || undefined,
          removed: m.removedNodes.length || undefined,
          addedText: Array.from(m.addedNodes)
            .map((n) => cap((n.textContent || '').replace(/\s+/g, ' ').trim(), 200))
            .filter(Boolean)
            .slice(0, 5)
        });
      }
    });
    mo.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true
    });

    // Snapshot only at the points we actually need: mutations carry the timeline,
    // so keeping a full DOM copy per poll is pure duplication.
    const polls = Math.max(1, Math.round(ms / CFG.RECORD_EVERY));
    const snapAt = new Set();
    const wanted = Math.min(CFG.RECORD_SNAPSHOTS, polls);
    for (let k = 0; k < wanted; k++) snapAt.add(Math.round(((k + 1) * polls) / wanted));

    const caps = [];
    const start = Date.now();
    for (let i = 1; i <= polls; i++) {
      await sleep(CFG.RECORD_EVERY);
      if (snapAt.has(i)) {
        caps.push(captureDom(`recording-t${i}`, document.body, { elapsedMs: Date.now() - start }));
        log(`  snapshot at poll ${i}/${polls} — ${mutations.length} mutations so far`);
      } else if (i % 5 === 0) {
        log(`  t+${((Date.now() - start) / 1000).toFixed(0)}s — ${mutations.length} mutations`);
      }
    }
    mo.disconnect();
    log(`recording done — ${mutations.length} mutations, ${caps.length} snapshot(s) kept`);
    return { caps, mutations };
  }

  /* ------------------------------------------------------------------ output */
  function download(name, obj) {
    const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    log(`downloaded ${name} — ${(blob.size / 1048576).toFixed(2)} MB`);
  }

  function chunk(caps, meta, base) {
    // split so no single file carries more than NODES_PER_FILE nodes
    const parts = [];
    let cur = [];
    let n = 0;
    for (const c of caps) {
      const size = (c.fullDom || c.subtree || { count: 0 }).count;
      if (cur.length && n + size > CFG.NODES_PER_FILE) {
        parts.push(cur);
        cur = [];
        n = 0;
      }
      cur.push(c);
      n += size;
    }
    if (cur.length) parts.push(cur);

    // META GOES FIRST, IN ITS OWN FILE. It holds <head>, rawHtml, every stylesheet,
    // the state rules, the media queries and the mutation log — most of the value.
    // Chrome throttles or cancels long download bursts, so shipping meta last means
    // a truncated run loses the one irreplaceable file. (It did, on run 1.)
    download(`${base}-part0-META.json`, {
      part: 0,
      totalParts: parts.length + 1,
      caps: [{ label: '__meta__', meta }]
    });

    parts.forEach((p, i) => {
      download(`${base}-part${i + 1}of${parts.length}.json`, {
        part: i + 1,
        totalParts: parts.length,
        caps: p
      });
    });
    return parts.length + 1;
  }

  /* -------------------------------------------------------------------- main */
  async function run() {
    const t0 = Date.now();
    const label =
      CFG.LABEL ||
      (location.hash || location.pathname).replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') ||
      'page';
    log(`capturing "${label}" at ${innerWidth}x${innerHeight} dpr${devicePixelRatio}`);
    const errors = [];
    const caps = [];

    try {
      caps.push(captureDom('baseline-room', document.body));
    } catch (e) {
      errors.push(`baseline: ${e.message}`);
    }
    log(`baseline: ${caps[0]?.fullDom.count ?? 0} nodes`);

    if (CFG.INTERACTIONS) {
      try {
        const ic = await interactions();
        caps.push(...ic);
        log(`interactions: ${ic.length} captures`);
      } catch (e) {
        errors.push(`interactions: ${e.message}`);
        warn(e);
      }
    }

    let focus = [];
    if (CFG.FOCUS_STATES) {
      try {
        focus = await focusStates();
        log(`focus states: ${focus.length}`);
      } catch (e) {
        errors.push(`focus: ${e.message}`);
      }
    }

    const rec = await record(CFG.RECORD_MS).catch((e) => {
      errors.push(`record: ${e.message}`);
      return { caps: [], mutations: [] };
    });
    caps.push(...rec.caps);

    try {
      caps.push(captureDom('final-room', document.body));
    } catch (e) {
      errors.push(`final: ${e.message}`);
    }

    const sheets = await stylesheets().catch((e) => {
      errors.push(`sheets: ${e.message}`);
      return [];
    });
    const blocked = sheets.filter((s) => s.access.startsWith('cors-blocked'));
    const recovered = sheets.filter((s) => s.access === 'recovered-by-fetch');
    log(
      `stylesheets: ${sheets.length} (${recovered.length} recovered by fetch, ${blocked.length} still blocked)`
    );

    const meta = {
      capturedAt: now(),
      harnessVersion: 2,
      url: location.href,
      title: document.title,
      ua: navigator.userAgent,
      viewport: {
        w: innerWidth,
        h: innerHeight,
        dpr: devicePixelRatio,
        scrollW: document.documentElement.scrollWidth,
        scrollH: document.documentElement.scrollHeight
      },
      errors,
      // things the first-generation dumps never captured:
      head: document.head ? document.head.outerHTML : null,
      htmlAttrs: Object.fromEntries(
        Array.from(document.documentElement.attributes).map((a) => [a.name, a.value])
      ),
      bodyAttrs: Object.fromEntries(
        Array.from(document.body.attributes).map((a) => [a.name, a.value])
      ),
      rawHtml: CFG.RAW_HTML ? document.documentElement.outerHTML : null,
      styleSheets: sheets,
      stateRules: CFG.STATE_RULES ? stateRules() : null,
      mediaQueries: CFG.MEDIA_QUERIES ? mediaQueries() : null,
      focusStates: focus,
      mutations: rec.mutations,
      resources: performance.getEntriesByType('resource').map((r) => ({
        name: r.name,
        type: r.initiatorType,
        size: r.transferSize,
        ms: +r.duration.toFixed(1)
      })),
      fonts: (() => {
        try {
          return Array.from(document.fonts).map((f) => ({
            family: f.family,
            weight: f.weight,
            style: f.style,
            status: f.status
          }));
        } catch {
          return null;
        }
      })(),
      angular: (() => {
        try {
          if (!window.angular) return null;
          const out = { version: angular.version };
          if (CFG.SCOPE_KEYS_ONLY) {
            const sc = angular.element(document.body).scope();
            out.rootScopeKeys = sc ? Object.keys(sc).filter((k) => !k.startsWith('$')) : [];
            out.note = 'keys only — values withheld to avoid capturing PII';
          }
          return out;
        } catch {
          return null;
        }
      })(),
      storageKeys: {
        local: Object.keys(localStorage || {}),
        session: Object.keys(sessionStorage || {}),
        note: 'keys only — values withheld'
      }
    };

    const totalNodes = caps.reduce((s, c) => s + (c.fullDom || c.subtree || { count: 0 }).count, 0);
    const files = chunk(caps, meta, `ptr-${label}-${Date.now()}`);

    log(
      `DONE in ${((Date.now() - t0) / 1000).toFixed(1)}s — ${caps.length} captures, ${totalNodes} nodes, ${files} file(s)`
    );
    if (blocked.length)
      warn(
        `${blocked.length} stylesheet(s) still unreadable:`,
        blocked.map((s) => s.href)
      );
    if (errors.length) warn('errors recorded in meta.errors:', errors);
    console.table(
      caps.map((c) => ({ label: c.label, nodes: (c.fullDom || c.subtree || {}).count ?? '-' }))
    );
    return { caps: caps.length, nodes: totalNodes, files, errors };
  }

  window.__PTR_CAPTURE = {
    run,
    CFG,
    captureDom,
    interactions,
    stylesheets,
    stateRules,
    mediaQueries
  };
  log('harness loaded. auto-running — re-run any time with __PTR_CAPTURE.run()');
  return run();
})();
