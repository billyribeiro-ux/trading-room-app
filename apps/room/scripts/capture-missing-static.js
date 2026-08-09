/* ============================================================================
 * Gap capture, STATIC — pulls the missing evidence out of the shipped source,
 * so nothing has to be open, clicked, or populated with data.
 *
 * WHY A SECOND SCRIPT
 * ------------------------------------------------------------------------
 * capture-missing.js observes a live session: you save a poll, you delete one,
 * it records the DOM and the traffic. That works, but it needs the tenant to
 * actually have saved polls, and it needs someone to press the buttons.
 *
 * The saved-poll row does not exist in any dump for exactly that reason — the
 * captured tenant had zero saved polls, so `<ul class="list-group">` was empty
 * and the row template never rendered. A template that never renders is still
 * SHIPPED: it is compiled into the JavaScript bundle. That is what this reads.
 *
 * WHAT IT PULLS
 *   1. Every loaded script and stylesheet, refetched from cache.
 *   2. From each, the regions around the poll identifiers — the compiled
 *      template for the saved-poll row, its delete handler, and the anonymous
 *      flag's property name.
 *   3. AngularJS `$templateCache` in full, when present. The control plane is
 *      AngularJS 1.x, and there templates are stored as literal HTML strings —
 *      the row markup comes out verbatim, no decompilation needed.
 *   4. Angular 17 component defs reachable from `window.ng`, when the build
 *      exposes it.
 *   5. Whatever IS in the DOM, if the panel happens to be open — as a bonus,
 *      never as a requirement.
 *
 * WHAT IT DOES NOT DO
 *   No clicking. No submitting. No network traffic to the application API — the
 *   only fetches are re-reads of assets the page already loaded, which come
 *   from the HTTP cache. Nothing in the page is mutated at all.
 *
 * USAGE
 *   1. Open the room (or the admin console). Any role. Nothing needs to be open.
 *   2. DevTools → Console. If Chrome blocks the paste, type `allow pasting`.
 *   3. Paste this file. It runs immediately and downloads one JSON.
 * ========================================================================== */

(() => {
  'use strict';

  /* The identifiers worth slicing around. Each is something whose definition is
     missing from the DOM dumps: the saved-poll row and its controls, the delete
     path, and the anonymous flag. */
  const TARGETS = [
    'savedPolls',
    'Pre-Canned',
    'preCanned',
    'Save To Canned',
    'saveToCanned',
    'cannedPoll',
    'canned',
    'deleteSavedPoll',
    'removeSavedPoll',
    'deletePoll',
    'anonymous-poll',
    'anonymousPoll',
    'isAnonymous',
    'pollQuestionTxt',
    'pollChoiceTxt',
    'list-group'
  ];

  /* Bytes kept either side of a hit. Compiled Angular templates are dense; 1200
     is enough to carry a full element instruction plus its handler binding. */
  const WINDOW = 1200;
  const MAX_HITS_PER_TARGET = 12;

  const out = {
    capture: 'missing-gaps-static',
    at: new Date().toISOString(),
    href: location.href,
    targets: TARGETS,
    assets: [],
    slices: [],
    templateCache: null,
    angularComponents: null,
    dom: null,
    notes: []
  };

  /* ── 1. every asset the page loaded ───────────────────────────────────── */
  function assetUrls() {
    const urls = new Set();
    for (const script of document.scripts) if (script.src) urls.add(script.src);
    for (const link of document.querySelectorAll('link[rel="stylesheet"]'))
      if (link.href) urls.add(link.href);
    /* Lazy chunks are not in document.scripts once evaluated; the resource
       timeline still has them. */
    for (const entry of performance.getEntriesByType('resource')) {
      if (/\.(js|css)(\?|$)/i.test(entry.name)) urls.add(entry.name);
    }
    return [...urls];
  }

  /* ── 2. slice each asset around every target ──────────────────────────── */
  async function sliceAsset(url) {
    let text;
    try {
      const response = await fetch(url, { credentials: 'same-origin' });
      out.assets.push({ url, status: response.status, ok: response.ok });
      if (!response.ok) return;
      text = await response.text();
    } catch (cause) {
      out.assets.push({ url, error: String(cause) });
      return;
    }

    for (const target of TARGETS) {
      let from = 0;
      let hits = 0;
      while (hits < MAX_HITS_PER_TARGET) {
        const at = text.indexOf(target, from);
        if (at === -1) break;
        out.slices.push({
          url,
          target,
          offset: at,
          text: text.slice(Math.max(0, at - WINDOW), at + WINDOW)
        });
        from = at + target.length;
        hits += 1;
      }
      if (hits === MAX_HITS_PER_TARGET) {
        out.notes.push(`${target} hit the ${MAX_HITS_PER_TARGET}-slice cap in ${url}`);
      }
    }
  }

  /* ── 3. AngularJS $templateCache — literal HTML, when the app is 1.x ──── */
  function readTemplateCache() {
    const ng = window.angular;
    if (!ng) return;
    try {
      const injector = ng.element(document).injector();
      if (!injector) return;
      const cache = injector.get('$templateCache');
      const entries = {};
      /* $templateCache is a $cacheFactory; info().id/size are public, but there
         is no key enumeration API. The internal data store is the only route,
         and it is read-only here. */
      const store = cache._data ?? cache.data ?? null;
      if (store) {
        for (const key of Object.keys(store)) entries[key] = store[key];
      } else {
        /* Fall back to asking for the paths that appear in the sliced source. */
        for (const slice of out.slices) {
          for (const match of slice.text.matchAll(/["'`]([\w./-]+\.html)["'`]/g)) {
            const tpl = cache.get(match[1]);
            if (tpl) entries[match[1]] = tpl;
          }
        }
      }
      out.templateCache = { count: Object.keys(entries).length, entries };
    } catch (cause) {
      out.notes.push(`templateCache unavailable: ${cause}`);
    }
  }

  /* ── 4. Angular 17 component defs, when the build exposes `ng` ────────── */
  function readAngularComponents() {
    const ng = window.ng;
    if (!ng?.getComponent) {
      out.notes.push('window.ng not exposed — production build, use the source slices instead');
      return;
    }
    const found = [];
    for (const host of document.querySelectorAll('app-poll-modal,[id="pollModalCompHolder"]')) {
      try {
        const component = ng.getComponent(host);
        if (!component) continue;
        found.push({
          host: host.tagName.toLowerCase(),
          /* Own enumerable keys only: the component's state, which is where a
             saved-poll array and the anonymous flag would live. */
          keys: Object.keys(component),
          snapshot: JSON.parse(
            JSON.stringify(component, (key, value) =>
              typeof value === 'function' ? '[fn]' : value
            )
          )
        });
      } catch (cause) {
        found.push({ host: host.tagName.toLowerCase(), error: String(cause) });
      }
    }
    out.angularComponents = found;
  }

  /* ── 5. the DOM, if it happens to be there. Never required. ───────────── */
  function readDom() {
    const panel = document.querySelector('#savedPolls');
    const modal = document.querySelector('#pollModalCompHolder, app-poll-modal');
    if (!panel && !modal) {
      out.notes.push('poll panel not in the DOM — static slices are the evidence');
      return;
    }
    const rows = panel ? [...(panel.querySelector('.list-group')?.children ?? [])] : [];
    out.dom = {
      modalPresent: Boolean(modal),
      modalOuterHTML: modal ? modal.outerHTML : null,
      panelOuterHTML: panel ? panel.outerHTML : null,
      rowCount: rows.length,
      rows: rows.map((row) => ({
        outerHTML: row.outerHTML,
        controls: [...row.querySelectorAll('a,button,i,[ng-click],[data-target]')].map((el) => ({
          tag: el.tagName.toLowerCase(),
          attrs: Object.fromEntries([...el.attributes].map((a) => [a.name, a.value]))
        }))
      }))
    };
  }

  /* ── run ──────────────────────────────────────────────────────────────── */
  (async () => {
    const urls = assetUrls();
    out.notes.push(`${urls.length} assets discovered`);
    for (const url of urls) await sliceAsset(url);

    readTemplateCache();
    readAngularComponents();
    readDom();

    const name = `ptr-gaps-static-${Date.now()}.json`;
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    a.click();
    URL.revokeObjectURL(href);

    const byTarget = {};
    for (const slice of out.slices) byTarget[slice.target] = (byTarget[slice.target] ?? 0) + 1;

    console.log(
      `[gaps-static] ${name}  (${(blob.size / 1024 / 1024).toFixed(1)} MB)\n` +
        `  assets   : ${out.assets.length}\n` +
        `  slices   : ${out.slices.length}\n` +
        `  templates: ${out.templateCache?.count ?? 0}\n` +
        `  dom rows : ${out.dom?.rowCount ?? 'n/a'}\n` +
        `  per target: ${JSON.stringify(byTarget)}`
    );
    return out;
  })();
})();
