/* ============================================================================
 * Gap capture — paste into the Chrome DevTools console on the reference's
 * Manage Session page (#/page/manageSession/<id>).
 *
 * Everything else about that page is already matched to the pixel. This closes
 * the four things the existing captures could not see, plus the interaction
 * states that only exist while something is open:
 *
 *   • the FIVE tab panes that are never visible at once — Text List, Branding
 *     (with its textAngular toolbar), SSO Setup, User Stats and Settings. All
 *     of them are ALREADY in the DOM: Angular's ng-repeat built every pane and
 *     Bootstrap hides the inactive ones with `display: none`. Switching which
 *     one carries `.active` is pure CSS, so all six are captured with real
 *     geometry without a single click.
 *   • the "DON'T TOUCH" settings block, behind `ng-show="donttouchShow"`
 *   • every dropdown, captured OPEN
 *   • the permissions modal, captured OPEN with its backdrop
 *   • the xeditable editor — what a field looks like mid-edit (opt-in)
 *   • the bootbox confirm, rendered, with computed styles (opt-in)
 *   • assets referenced but never captured: ajax_loader.gif, the room logo,
 *     the favicon — inlined as data URLs
 *
 * ── SAFETY ──────────────────────────────────────────────────────────────────
 * By default this NEVER clicks anything and never calls an app handler. It
 * toggles Bootstrap's and Angular's own classes, which is CSS only, and reverts
 * every change in a finally block.
 *
 * Two passes are opt-in because they call into the app. Both are still
 * read-only — they open a UI and close it again, they never save, submit or
 * delete — but they are off unless you turn them on:
 *
 *   CFG.OPEN_EDITOR   calls the xeditable controller's $show()/$hide()
 *   CFG.OPEN_BOOTBOX  calls bootbox.confirm() with a no-op callback, then hides it
 *
 * CFG.LOAD_STATS is also off by default. It calls loadStats(), which is a plain
 * network read, but it hits your server — turn it on only if you want the User
 * Stats tables captured with rows in them.
 *
 * ── USAGE ───────────────────────────────────────────────────────────────────
 *   1. Open the room you want captured and go to its Manage page.
 *   2. DevTools → Console. If Chrome blocks pasting, type `allow pasting` first.
 *   3. Paste this whole file and press enter. It runs itself.
 *   4. Approve "Download multiple files".
 *   5. Move the downloaded part*.json files into new-room-control/evidence-dumps/NEXT-STEP/.
 *
 * Part 0 is the manifest and is downloaded FIRST — a previous harness wrote it
 * last and Chrome throttled the burst, losing it along with the head and the
 * stylesheets.
 * ========================================================================== */

(() => {
  'use strict';

  const CFG = {
    /** file prefix; the room id is appended */
    NAME: 'ptr-gaps',
    /** ~6MB per file keeps Chrome from dropping downloads */
    MAX_BYTES: 6 * 1024 * 1024,
    /** ms between downloads — Chrome throttles a fast burst */
    DOWNLOAD_GAP: 400,
    /** ms to let a revealed pane settle before measuring */
    SETTLE: 120,

    /** opt-in: open an xeditable field so the editor form is captured */
    OPEN_EDITOR: false,
    /** opt-in: render a bootbox confirm so its computed styles are captured */
    OPEN_BOOTBOX: false,
    /** opt-in: call loadStats() so the User Stats tables have rows */
    LOAD_STATS: false
  };

  /* ── what we read off every element ─────────────────────────────────────── */
  const PROPS = [
    'display',
    'position',
    'float',
    'clear',
    'box-sizing',
    'overflow-x',
    'overflow-y',
    'width',
    'height',
    'min-height',
    'max-width',
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
    'box-shadow',
    'opacity',
    'visibility',
    'color',
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'line-height',
    'letter-spacing',
    'text-align',
    'text-decoration-line',
    'text-transform',
    'text-shadow',
    'white-space',
    'vertical-align',
    'list-style-type',
    'flex-direction',
    'justify-content',
    'align-items',
    'gap',
    'border-collapse',
    'border-spacing',
    'table-layout',
    'cursor',
    'z-index',
    'transform',
    'transition',
    'animation-name',
    'appearance',
    'user-select',
    'touch-action',
    'outline-width',
    'outline-style',
    'outline-color'
  ];

  const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const cssPath = (el) => {
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && parts.length < 8; n = n.parentElement) {
      let p = n.tagName.toLowerCase();
      if (n.id) {
        parts.unshift(`${p}#${n.id}`);
        break;
      }
      const cls = (n.getAttribute('class') || '')
        .split(/\s+/)
        .filter((c) => c && !/^ng-/.test(c))
        .slice(0, 3);
      if (cls.length) p += '.' + cls.join('.');
      const sibs = n.parentElement ? [...n.parentElement.children].filter((s) => s.tagName === n.tagName) : [];
      if (sibs.length > 1) p += `:nth-of-type(${sibs.indexOf(n) + 1})`;
      parts.unshift(p);
    }
    return parts.join(' > ');
  };

  /** direct text of an element — not its descendants' */
  const ownText = (el) =>
    norm(
      [...el.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent)
        .join(' ')
    );

  const readOne = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const attrs = {};
    for (const a of el.attributes) attrs[a.name] = a.value; // untruncated, deliberately
    const style = {};
    for (const p of PROPS) style[p] = cs.getPropertyValue(p);

    const pseudo = {};
    for (const which of ['::before', '::after']) {
      const ps = getComputedStyle(el, which);
      if (ps.content && ps.content !== 'none') {
        pseudo[which] = {
          content: ps.content,
          display: ps.display,
          width: ps.width,
          height: ps.height,
          'background-color': ps.backgroundColor,
          'border-top-width': ps.borderTopWidth,
          'font-family': ps.fontFamily,
          color: ps.color,
          clear: ps.clear,
          float: ps.cssFloat
        };
      }
    }

    return {
      tag: el.tagName.toLowerCase(),
      path: cssPath(el),
      attrs,
      text: ownText(el),
      rect: {
        x: +r.x.toFixed(3),
        y: +r.y.toFixed(3),
        w: +r.width.toFixed(3),
        h: +r.height.toFixed(3)
      },
      scroll: { w: el.scrollWidth, h: el.scrollHeight, cw: el.clientWidth, ch: el.clientHeight },
      style,
      ...(Object.keys(pseudo).length ? { pseudo } : {})
    };
  };

  /**
   * Every element in a subtree, hidden ones included and flagged.
   *
   * `rendered` is decided by getClientRects(), not by the computed display: a
   * descendant of a `display: none` ancestor still reports its OWN display, so
   * checking that property marks a whole hidden tab as visible. Having no client
   * rects is the only test that is true for the ancestor and every child of it.
   */
  const readTree = (root) => {
    const out = [];
    for (const el of root.querySelectorAll('*')) {
      const node = readOne(el);
      if (el.getClientRects().length === 0) node.rendered = false;
      const cs = getComputedStyle(el);
      if (cs.display === 'none') node.displayNone = true;
      if (cs.visibility === 'hidden') node.invisible = true;
      out.push(node);
    }
    return out;
  };

  /* ── reversible DOM tweaks ──────────────────────────────────────────────── */
  const undo = [];
  const addClass = (el, c) => {
    if (!el || el.classList.contains(c)) return;
    el.classList.add(c);
    undo.push(() => el.classList.remove(c));
  };
  const removeClass = (el, c) => {
    if (!el || !el.classList.contains(c)) return;
    el.classList.remove(c);
    undo.push(() => el.classList.add(c));
  };
  const setStyle = (el, prop, value) => {
    if (!el) return;
    const prev = el.style.getPropertyValue(prop);
    el.style.setProperty(prop, value, 'important');
    undo.push(() => (prev ? el.style.setProperty(prop, prev) : el.style.removeProperty(prop)));
  };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ── stylesheets, with the CORS ones refetched ──────────────────────────── */
  async function readStylesheets() {
    const out = [];
    for (const sheet of document.styleSheets) {
      const entry = { href: sheet.href || '', media: sheet.media?.mediaText || '', rules: '', access: 'ok' };
      try {
        const parts = [];
        const walk = (list) => {
          for (const rule of list) {
            // A CSSStyleRule also exposes an empty .cssRules under CSS nesting,
            // so recursing on truthiness alone descends into every style rule.
            if (!rule.selectorText && rule.cssRules) {
              parts.push(rule.cssText.split('{')[0] + '{');
              walk(rule.cssRules);
              parts.push('}');
            } else {
              parts.push(rule.cssText);
            }
          }
        };
        walk(sheet.cssRules);
        entry.rules = parts.join('\n');
      } catch {
        entry.access = 'cors';
        if (sheet.href) {
          try {
            entry.rules = await (await fetch(sheet.href)).text();
            entry.access = 'refetched';
          } catch (e) {
            entry.error = String(e);
          }
        }
      }
      out.push(entry);
    }
    return out;
  }

  /** the @media blocks and whether each currently matches */
  const readMedia = () => {
    const seen = new Map();
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of rules) {
        if (rule.media && rule.conditionText !== undefined) {
          const q = rule.conditionText;
          if (!seen.has(q)) seen.set(q, matchMedia(q).matches);
        }
      }
    }
    return [...seen].map(([query, matches]) => ({ query, matches }));
  };

  /* ── assets the captures reference but never contained ──────────────────── */
  async function readAssets() {
    const urls = new Set();
    for (const img of document.images) if (img.src) urls.add(img.src);
    for (const link of document.querySelectorAll('link[rel*="icon"]')) {
      if (link.href) urls.add(link.href);
    }
    // named outright because it is only ever shown while loading, so it is never
    // in a screenshot and never in a DOM capture with a resolvable src
    urls.add(new URL('app/img/ajax_loader.gif', location.origin + '/').href);
    urls.add(new URL('/public/images/ptr_logo.png', location.origin).href);

    const out = [];
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          out.push({ url, error: `HTTP ${res.status}` });
          continue;
        }
        const blob = await res.blob();
        if (blob.size > 2 * 1024 * 1024) {
          out.push({ url, error: `too large (${blob.size})` });
          continue;
        }
        const dataUrl = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
        out.push({ url, type: blob.type, bytes: blob.size, dataUrl });
      } catch (e) {
        out.push({ url, error: String(e) });
      }
    }
    return out;
  }

  /* ── the capture passes ─────────────────────────────────────────────────── */
  const caps = [];
  const capture = async (label, extra = {}) => {
    await sleep(CFG.SETTLE);
    caps.push({
      label,
      ts: new Date().toISOString(),
      viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
      scroll: { x: scrollX, y: scrollY },
      ...extra,
      nodes: readTree(document.body)
    });
    console.log(`  captured  ${label}  (${caps[caps.length - 1].nodes.length} elements)`);
  };

  async function run() {
    console.log('%cPTR gap capture', 'font-weight:bold;font-size:14px');

    await capture('baseline');

    /* ── every tab pane, one at a time ─────────────────────────────────────
       The panes are all in the DOM already; only `.active` decides which one
       Bootstrap displays. Nothing is clicked and no Angular handler runs. */
    const tabLinks = [...document.querySelectorAll('.nav-tabs > li')];
    const panes = [...document.querySelectorAll('.tab-content > .tab-pane')];
    const activePane = panes.find((p) => p.classList.contains('active'));
    const activeLi = tabLinks.find((li) => li.classList.contains('active'));

    for (let i = 0; i < panes.length; i++) {
      const label = norm(tabLinks[i]?.textContent) || `tab-${i}`;
      const restore = [];
      for (const p of panes) {
        if (p.classList.contains('active') && p !== panes[i]) {
          p.classList.remove('active');
          restore.push(() => p.classList.add('active'));
        }
      }
      // a hidden tab (Text List, SSO Setup) also carries ng-hide on its <li>
      const li = tabLinks[i];
      const liHidden = li && li.classList.contains('ng-hide');
      if (liHidden) li.classList.remove('ng-hide');
      const wasActive = panes[i].classList.contains('active');
      if (!wasActive) panes[i].classList.add('active');

      await capture(`tab:${label}`, { tabIndex: i, tabLabel: label, wasHidden: !!liHidden });

      if (!wasActive) panes[i].classList.remove('active');
      if (liHidden) li.classList.add('ng-hide');
      restore.forEach((f) => f());
    }
    // put the original selection back exactly as it was
    if (activePane) activePane.classList.add('active');
    if (activeLi) activeLi.classList.add('active');

    /* ── the DON'T TOUCH block ─────────────────────────────────────────────── */
    const dontTouch = [...document.querySelectorAll('[ng-show="donttouchShow"]')];
    if (dontTouch.length) {
      const settingsPane = panes[panes.length - 1];
      const wasActive = settingsPane?.classList.contains('active');
      if (settingsPane && !wasActive) addClass(settingsPane, 'active');
      dontTouch.forEach((el) => removeClass(el, 'ng-hide'));
      await capture('settings:dont-touch-revealed');
      dontTouch.forEach((el) => addClass(el, 'ng-hide'));
      if (settingsPane && !wasActive) removeClass(settingsPane, 'active');
    }

    /* ── every dropdown, open ──────────────────────────────────────────────── */
    const dropdowns = [...document.querySelectorAll('.dropdown, .btn-group')].filter((d) =>
      d.querySelector('.dropdown-menu')
    );
    for (let i = 0; i < dropdowns.length; i++) {
      const d = dropdowns[i];
      const owner = norm(d.querySelector('.dropdown-toggle, button, a')?.textContent).slice(0, 40);
      const pane = d.closest('.tab-pane');
      const paneWasActive = pane?.classList.contains('active');
      if (pane && !paneWasActive) pane.classList.add('active');
      d.classList.add('open');
      await capture(`dropdown:${i}:${owner}`, { owner });
      d.classList.remove('open');
      if (pane && !paneWasActive) pane.classList.remove('active');
    }

    /* ── the permissions modal, open, with a backdrop ──────────────────────── */
    const modal = document.querySelector('#permissionsModal, .modal');
    if (modal) {
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop fade in';
      document.body.appendChild(backdrop);
      document.body.classList.add('modal-open');
      modal.classList.add('in');
      setStyle(modal, 'display', 'block');
      await capture('modal:permissions');
      modal.classList.remove('in');
      backdrop.remove();
      document.body.classList.remove('modal-open');
    }

    /* ── opt-in: the xeditable editor, mid-edit ────────────────────────────── */
    if (CFG.OPEN_EDITOR && window.angular) {
      const target = document.querySelector('.editable-click');
      try {
        const scope = angular.element(target).scope();
        const ctrl = scope?.$$childHead?.$editable || scope?.$editable;
        const editable = ctrl || (target && angular.element(target).controller('editable'));
        if (editable?.$show) {
          editable.$show();
          scope.$apply?.();
          await capture('editable:open', { field: target.getAttribute('editable-text') || '' });
          editable.$hide();
          scope.$apply?.();
        } else {
          console.warn('  editable controller not reachable — skipped');
        }
      } catch (e) {
        console.warn('  editable open failed:', e);
      }
    }

    /* ── opt-in: a bootbox confirm, rendered ───────────────────────────────── */
    if (CFG.OPEN_BOOTBOX && window.bootbox) {
      try {
        // a no-op callback: nothing is confirmed, and it is dismissed below
        bootbox.confirm({
          message: 'CAPTURE ONLY — nothing will happen. This dialog is being measured.',
          callback: () => {}
        });
        await sleep(500);
        await capture('bootbox:confirm');
        bootbox.hideAll?.();
        await sleep(400);
      } catch (e) {
        console.warn('  bootbox open failed:', e);
      }
    }

    /* ── opt-in: populated User Stats ──────────────────────────────────────── */
    if (CFG.LOAD_STATS && window.angular) {
      try {
        const scope = angular.element(document.querySelector('.tab-content')).scope();
        if (scope?.loadStats) {
          scope.loadStats(scope.statsDate, scope.statsDateEnd, '', false, false, false);
          scope.$apply?.();
          await sleep(4000); // give the request time to come back
          const statsPane = panes[4];
          const wasActive = statsPane?.classList.contains('active');
          if (statsPane && !wasActive) statsPane.classList.add('active');
          await capture('tab:User Stats (loaded)');
          if (statsPane && !wasActive) statsPane.classList.remove('active');
        } else {
          console.warn('  loadStats not on scope — skipped');
        }
      } catch (e) {
        console.warn('  loadStats failed:', e);
      }
    }

    /* ── everything that is not per-state ──────────────────────────────────── */
    console.log('  reading stylesheets…');
    const stylesheets = await readStylesheets();
    console.log('  reading assets…');
    const assets = await readAssets();

    const fonts = [...document.fonts].map((f) => ({
      family: f.family,
      weight: f.weight,
      style: f.style,
      status: f.status
    }));

    const meta = {
      capturedAt: new Date().toISOString(),
      url: location.href,
      ua: navigator.userAgent,
      viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
      title: document.title,
      head: document.head.outerHTML,
      angularVersion: window.angular?.version ?? null,
      config: CFG,
      captures: caps.map((c, i) => ({ index: i, label: c.label, elements: c.nodes.length })),
      assets: assets.map((a) => ({ url: a.url, type: a.type, bytes: a.bytes, error: a.error })),
      stylesheets: stylesheets.map((s) => ({ href: s.href, access: s.access, bytes: s.rules.length })),
      media: readMedia(),
      fonts
    };

    /* ── download: manifest FIRST ──────────────────────────────────────────── */
    const roomId = (location.hash.match(/([0-9a-f]{24})/) || [])[1] || 'room';
    const stamp = Date.now();
    const files = [];
    const push = (name, payload) => files.push({ name, payload });

    push('part0-META', meta);
    push('part1-rawHtml', { rawHtml: document.documentElement.outerHTML });
    push('part2-stylesheets', { stylesheets });
    push('part3-assets', { assets });

    // one file per capture, split further if a single one is oversized
    caps.forEach((cap, i) => {
      const json = JSON.stringify(cap);
      if (json.length <= CFG.MAX_BYTES) {
        push(`part${4 + i}-${cap.label.replace(/[^\w.-]+/g, '_')}`, cap);
        return;
      }
      const chunkSize = Math.ceil(cap.nodes.length / Math.ceil(json.length / CFG.MAX_BYTES));
      for (let s = 0, n = 0; s < cap.nodes.length; s += chunkSize, n++) {
        push(`part${4 + i}-${cap.label.replace(/[^\w.-]+/g, '_')}-${n}`, {
          ...cap,
          chunk: n,
          nodes: cap.nodes.slice(s, s + chunkSize)
        });
      }
    });

    console.log(`  downloading ${files.length} files…`);
    for (const file of files) {
      const blob = new Blob([JSON.stringify(file.payload)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${CFG.NAME}-${roomId}-${stamp}-${file.name}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      await sleep(CFG.DOWNLOAD_GAP); // Chrome silently drops an unthrottled burst
    }

    console.log(
      `%cdone — ${files.length} files, ${caps.length} states, ${assets.filter((a) => a.dataUrl).length} assets`,
      'color:green;font-weight:bold'
    );
    console.table(meta.captures);
  }

  run()
    .catch((e) => console.error('capture failed:', e))
    .finally(() => {
      // put the page back exactly as it was found, whatever happened above
      while (undo.length) undo.pop()();
      console.log('  page restored');
    });
})();
