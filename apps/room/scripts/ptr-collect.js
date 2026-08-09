/* ============================================================================
 * PASTE THIS INTO THE CHROME CONSOLE ON THE LIVE ROOM. IT DOWNLOADS BY ITSELF.
 *
 * Works logged in as a member OR as an admin/presenter - it detects which you
 * are and records what that role can reach.
 *
 * It opens tabs and panels for itself so the things I need actually render,
 * then downloads one JSON file. No terminal, no clicking, no stop().
 *
 * ⚠ WHAT IT CLICKS - and what it will never click
 *   Clicks ONLY: the main tabs, the Files sub-tabs, the file sort headers, and
 *   the private-chat gear. All of those are navigation - they change what is on
 *   screen and nothing else.
 *   There is a hard denylist it checks before EVERY click. It will not touch
 *   anything matching delete / upload / play / stop / send / save / remove /
 *   submit, or any form submit button, even if a selector above happens to
 *   match one. It never posts, uploads, deletes, plays or sends.
 *
 * WHAT IT COLLECTS, and why each one is unresolved
 *   1. The Files SORT BAR. `st-fileSortBar` / `st-fileSortName` /
 *      `st-fileSortDate` / `fa-sort` / `fa-sort-amount-up` are in NONE of the
 *      evidence here - not the bundle, not the stylesheet, not the Files dump.
 *      I built it from the markup you pasted, so it has no real styling. This
 *      grabs the real markup and its computed styles.
 *   2. The BUNDLE HASH. Mine is main.d6d3c112b59b7d0d.js. If yours differs,
 *      that alone explains #1 and means my copy of the app is an old build.
 *   3. `mp3Playing` / the "Stop For All" button, which I could not build.
 *   4. The PRIVATE-CHAT MESSAGE LOG - the shape "Download Log" writes out.
 *   5. Five theme variables that no stylesheet here defines.
 *   6. Cross-checks on what I changed: chat/alert backgrounds, which tab opens
 *      first, and where DND lives for your role.
 * ========================================================================== */

(async () => {
  'use strict';

  const HTML_CAP = 60000;
  const log = { meta: {}, role: {}, steps: [], states: {}, gaps: [] };
  const started = new Date().toISOString();
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const trim = (s, cap = 20000) =>
    typeof s === 'string' && s.length > cap ? s.slice(0, cap) + `…[+${s.length - cap}]` : s;
  const gap = (what, why) => log.gaps.push({ what, why });
  const note = (step, detail) => {
    log.steps.push({ at: new Date().toISOString(), step, detail });
    console.log(`[ptr] ${step}${detail ? ' — ' + detail : ''}`);
  };

  /* ── the guard. Checked before every single click. ───────────────────────── */
  const FORBIDDEN = /delete|upload|remove|play|stop|send|save|submit|post|kick|ban|mute|reset/i;
  const clickSafe = (el, why) => {
    if (!el) return false;
    const fingerprint = [
      el.getAttribute?.('title') ?? '',
      el.className ?? '',
      el.id ?? '',
      (el.textContent ?? '').slice(0, 60)
    ].join(' ');
    if (FORBIDDEN.test(fingerprint)) {
      note(
        'REFUSED to click',
        `${why} — matched the denylist: "${fingerprint.trim().slice(0, 70)}"`
      );
      return false;
    }
    if (el.type === 'submit' || el.tagName === 'FORM') {
      note('REFUSED to click', `${why} — is a submit`);
      return false;
    }
    const r = el.getBoundingClientRect();
    const [cx, cy] = [r.left + r.width / 2, r.top + r.height / 2];
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      el.dispatchEvent(
        new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          clientX: cx,
          clientY: cy,
          view: window
        })
      );
    }
    return true;
  };

  const byText = (sel, re) =>
    [...document.querySelectorAll(sel)].find((e) => re.test(e.textContent || ''));
  const vis = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  };

  const STYLE_PROPS = [
    'display',
    'position',
    'zIndex',
    'backgroundColor',
    'color',
    'borderTop',
    'borderBottom',
    'borderLeft',
    'borderRight',
    'borderRadius',
    'fontFamily',
    'fontSize',
    'fontWeight',
    'lineHeight',
    'textAlign',
    'padding',
    'margin',
    'width',
    'height',
    'justifyContent',
    'alignItems',
    'overflow',
    'visibility',
    'opacity'
  ];
  const styleOf = (el) => {
    const cs = getComputedStyle(el);
    const out = {};
    for (const p of STYLE_PROPS) out[p] = cs[p];
    return out;
  };
  const snap = (el) =>
    !el
      ? null
      : {
          tag: el.tagName,
          id: el.id || null,
          className: String(el.className || ''),
          title: el.getAttribute?.('title') ?? null,
          text: trim((el.textContent || '').replace(/\s+/g, ' ').trim(), 300),
          rect: (() => {
            const r = el.getBoundingClientRect();
            return {
              x: Math.round(r.left),
              y: Math.round(r.top),
              w: Math.round(r.width),
              h: Math.round(r.height)
            };
          })(),
          style: styleOf(el),
          outerHTML: trim(el.outerHTML, HTML_CAP)
        };
  const snapAll = (sel, cap = 40) => [...document.querySelectorAll(sel)].slice(0, cap).map(snap);

  /* Proves a class has NO rule, rather than just failing to find one. */
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
              css: trim(rule.cssText, 2000)
            });
        }
      };
      walk(rules);
    }
    return found;
  };

  /* ── what the Files pane looks like right now ────────────────────────────── */
  const filesState = () => ({
    pane: snap(document.querySelector('#files')),
    subTabs: snapAll('#myTab a, #files .nav-tabs a'),
    searchBar: snap(document.querySelector('.st-searchbar')),
    toolbarButtons: snapAll('#files .btn, #files button', 30),
    sortBar: snap(document.querySelector('.st-fileSortBar')),
    sortButtons: snapAll('.st-fileSortName, .st-fileSortDate'),
    sortBarRules: rulesMatching('st-fileSort'),
    sortIcons: snapAll('.st-fileSortBar i, [class*="fa-sort"]'),
    table: snap(document.querySelector('.st-fileTable')),
    rows: snapAll('#filesDriveList tr', 12),
    rowButtons: snapAll('#filesDriveList button, #filesDriveList a', 60),
    emptyState: snapAll('#files h4'),
    order: [...document.querySelectorAll('#filesDriveList tr')].slice(0, 30).map((tr) => ({
      name: tr.querySelector('.st-fileName')?.textContent.trim() ?? null,
      size: tr.querySelector('.st-fileSize')?.textContent.trim() ?? null,
      date: [...tr.querySelectorAll('.st-fileName i')].map((i) => i.textContent.trim())[0] ?? null
    }))
  });

  /* ── 1. meta + role ──────────────────────────────────────────────────────── */
  log.meta = {
    started,
    url: location.href,
    userAgent: navigator.userAgent,
    viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
    myPinnedBundle: 'main.d6d3c112b59b7d0d.js',
    scripts: [...document.querySelectorAll('script[src]')].map((s) => s.src),
    stylesheets: [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.href),
    loadedResources: (() => {
      try {
        return performance
          .getEntriesByType('resource')
          .map((e) => e.name)
          .filter((n) => /\.(js|css)(\?|$)/.test(n));
      } catch {
        return [];
      }
    })()
  };
  log.role = {
    postAlert: vis(byText('button, a', /Post Alert/i)),
    uploadFile: vis(document.querySelector('.st-fileUpload')),
    deleteSelected: vis(document.querySelector('.st-fileDeleteSelected')),
    stopForAll: vis(byText('button', /Stop For All/i))
  };
  const role = log.role.uploadFile || log.role.postAlert ? 'presenter' : 'member';
  note('role detected', role);

  /* ── 2. the tab bar as it loads, BEFORE anything is clicked ──────────────── */
  log.states.onLoad = {
    mainTabs: [...document.querySelectorAll('#mainTabs a')].map((a) => ({
      id: a.id || null,
      controls: a.getAttribute('aria-controls'),
      active: a.classList.contains('active'),
      ariaSelected: a.getAttribute('aria-selected'),
      liHidden: a.closest('li')?.hasAttribute('hidden') ?? false,
      text: (a.textContent || '').replace(/\s+/g, ' ').trim()
    })),
    activePanes: [...document.querySelectorAll('.tab-pane.active')].map((d) => d.id),
    screensTabsContent: snap(document.querySelector('#screensTabsContent'))
  };
  note('captured the tab bar as it loaded');

  /* ── 3. chat + alert colours, and the theme variables ────────────────────── */
  log.states.colours = {
    alertPanel: snap(document.querySelector('#chatScrollViewParentAlerts')),
    alertMsgBox: snap(document.querySelector('#chatScrollViewParentAlerts .msg-box')),
    chatPanel: snap(document.querySelector('#chatScrollViewParent, app-chat .list-of-msgs')),
    chatMsgBox: snap(document.querySelector('app-chat .msg-box')),
    chatInlineStyles: [...document.querySelectorAll('app-chat .msg-box')]
      .slice(0, 8)
      .map((el) => el.getAttribute('style')),
    variables: (() => {
      const host = document.querySelector('app-room') || document.documentElement;
      const cs = getComputedStyle(host);
      const names = [
        '--app-primary-color',
        '--border-color',
        '--chat-header-bg',
        '--chat-header-color',
        '--textarea-holder-btns-hover-color',
        '--msgs-bg',
        '--msgs-bg-adm',
        '--msgs-header-bg',
        '--msgs-header-color',
        '--msgs-separator-bg',
        '--tab-active-bg',
        '--tabs-color',
        '--tabs-border-color',
        '--textarea-bg',
        '--modal-content-bg-color'
      ];
      const out = {};
      for (const n of names) out[n] = cs.getPropertyValue(n).trim() || '(undefined)';
      return { resolvedOn: host.tagName + '.' + String(host.className || ''), values: out };
    })(),
    dndControls: [
      ...document.querySelectorAll('[id*="donot-disturb"], [name*="donot-disturb"]')
    ].map((i) => ({
      id: i.id,
      name: i.name,
      checked: i.checked,
      visible: vis(i)
    })),
    dndBadges: [...document.querySelectorAll('.badge')]
      .filter((b) => /DND/i.test(b.textContent))
      .map((b) => ({
        className: b.className,
        nav: b.closest('nav')?.className ?? null,
        icon: b.querySelector('i')?.className ?? null
      }))
  };
  note('captured chat/alert colours and theme variables');

  /* ── 4. open Files, walk the sub-tabs, work the sort bar ─────────────────── */
  const filesTab = [...document.querySelectorAll('#mainTabs a')].find((a) =>
    /Files/i.test(a.textContent || '')
  );
  if (clickSafe(filesTab, 'Files tab')) {
    await wait(1200);
    note('opened Files');
  } else {
    gap('Files tab', 'could not be opened — everything below it is unrecorded');
  }

  log.states.files = {};
  for (const label of ['Files', 'Images', 'Sounds']) {
    const sub = [...document.querySelectorAll('#myTab a, #files .nav-tabs a')].find((a) =>
      new RegExp(`^\\s*${label}\\b`, 'i').test(a.textContent || '')
    );
    if (clickSafe(sub, `${label} sub-tab`)) {
      await wait(900);
      log.states.files[label.toLowerCase()] = filesState();
      note(
        `captured Files → ${label}`,
        `${log.states.files[label.toLowerCase()].rows.length} row(s)`
      );
    } else {
      gap(`Files → ${label}`, 'sub-tab not found');
    }
  }

  log.states.sorting = {};
  for (const [key, selector, label] of [
    ['nameAsc', '.st-fileSortName', 'Name'],
    ['nameDesc', '.st-fileSortName', 'Name again'],
    ['dateAsc', '.st-fileSortDate', 'Date']
  ]) {
    const btn = document.querySelector(selector);
    if (clickSafe(btn, `sort by ${label}`)) {
      await wait(700);
      log.states.sorting[key] = filesState();
      note(`captured sort: ${label}`);
    } else if (!btn) {
      gap(`sort control ${selector}`, 'not present in this build');
    }
  }

  /* ── 5. Stop For All / audio ─────────────────────────────────────────────── */
  log.states.mp3 = {
    stopForAllButton: snap(byText('button', /Stop For All/i)),
    audioElements: [...document.querySelectorAll('audio')].map((a) => ({
      id: a.id,
      src: a.currentSrc || a.src,
      paused: a.paused,
      volume: a.volume,
      readyState: a.readyState
    }))
  };
  if (!log.states.mp3.stopForAllButton)
    gap(
      'Stop For All',
      'not on screen — it only appears while a sound is playing, which this script will not start'
    );

  /* ── 6. private chat: open the gear so the toolbar renders ───────────────── */
  const pcGear = document.querySelector('.chat-nav-pm .nav-item.dropdown');
  if (pcGear) {
    clickSafe(pcGear, 'private-chat gear');
    await wait(800);
  } else {
    gap(
      'private chat',
      'panel is not open — open a private chat with history and re-run for the message log'
    );
  }
  log.states.privateChat = {
    panel: snap(document.querySelector('app-privchat')),
    header: snap(document.querySelector('.chat-nav-pm')),
    toolbar: snap(document.querySelector('.pmToolbar')),
    searchInput: snap(document.querySelector('#pmSearchTermTxt')),
    dndButton: snap(byText('.pmToolbar a, .pmToolbar button', /Don't Disturb/i)),
    downloadLogButton: snap(byText('.pmToolbar a, .pmToolbar button', /Download Log/i)),
    scroller: snap(document.querySelector('.privChatScroller, app-privchatscroller')),
    messages: snapAll('app-privchatscroller .msg-box, .privChatScroller .msg-box', 15),
    userList: snapAll('.pc-list .list-group-item', 15)
  };
  if (!log.states.privateChat.messages.length)
    gap('private-chat messages', 'none on screen — the message shape stays unknown');
  note('captured private chat');

  /* ── 7. honest absences, then download ───────────────────────────────────── */
  const anyFiles = Object.values(log.states.files ?? {});
  if (!anyFiles.some((s) => s?.sortBar))
    gap(
      'st-fileSortBar',
      'absent from this build entirely — matches my evidence, so the sort bar you showed me is not in this deployment'
    );
  if (!anyFiles.some((s) => s?.rows?.length))
    gap('file rows', 'no files in any tab — the row markup could not be captured');

  const bundle =
    [...log.meta.scripts, ...log.meta.loadedResources].find((u) =>
      /\/main[.-][a-f0-9]{8,}\.js/.test(u)
    ) ?? null;
  log.meta.bundleSeen = bundle ? bundle.split('/').pop() : '(none found)';
  log.meta.bundleMatchesMine = log.meta.bundleSeen === log.meta.myPinnedBundle;

  const name = `ptr-${role}-${started.slice(0, 19).replace(/[:T]/g, '-')}.json`;
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' })
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);

  console.log(
    `\n%c[ptr] DOWNLOADED: ${name}`,
    'font-weight:bold;font-size:14px;color:#0a0',
    `\n  role         : ${role}`,
    `\n  your bundle  : ${log.meta.bundleSeen}`,
    `\n  mine         : ${log.meta.myPinnedBundle}  ${log.meta.bundleMatchesMine ? '(SAME build)' : '(DIFFERENT build)'}`,
    `\n  sort bar     : ${anyFiles.some((s) => s?.sortBar) ? 'FOUND' : 'not in this build'}`,
    `\n  file rows    : ${Math.max(0, ...anyFiles.map((s) => s?.rows?.length ?? 0))}`,
    `\n  privchat msgs: ${log.states.privateChat.messages.length}`,
    `\n  gaps         : ${log.gaps.length}`
  );
  log.gaps.forEach((g) => console.log(`    · ${g.what} — ${g.why}`));
  console.log('\nSend me the downloaded file.');
})();
