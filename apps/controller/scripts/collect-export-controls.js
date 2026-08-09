/*
  Capture EVERY export / download / badge control on the live original, and the code behind them.

  WHY THIS EXISTS
  ---------------
  The owner reported that "export badges" downloads a `.json` and should download a `.csv`.
  Read against `must-match/important`, no such control exists — in the reference or in ours. What
  the capture holds is:

    line   34  ng-click="exportListToCSV()"          Users → Export
    line  916  ng-click="exportStatsToCSV(statsDate)" User Stats → Export
    line  919  ng-click="downloadMontlyStats(statXrefsMontly)"   (the reference's own typo)
    line  985  ng-click="exportSettingsToJSON()"     Settings → Export Settings
    line  986  ng-click="loadSettingsFromJSON()"     COMMENTED OUT — never renders
    line   91  ng-click="removeBadgesForUsers()"     Badges, and it is not an export
    line 2081  ng-click="openChatTabsWithBadgesEditor(sess.chatTabsWithBadges)"

  So four exports exist and exactly one is JSON — the settings one, whose handler says JSON in its
  own name. Nothing in the DOM contradicts that, which leaves two possibilities that markup cannot
  settle: the FUNCTION BODIES might disagree with their names, or the control the owner clicked is
  somewhere no capture reached.

  Both are answerable, and neither is guessable. This settles them.

  WHAT IT DOES
  ------------
  Paste into the Chrome console on the live original while logged in, as member OR admin. It
  downloads one JSON containing:

    - every same-origin script bundle, in full, plus a wide window around each export/badge symbol —
      so `exportSettingsToJSON` can be READ rather than inferred from its name;
    - every button and anchor whose label or `ng-click` mentions export, download, csv, json or
      badge — outerHTML, computed styles, bounding box, and the stylesheet rules that match it;
    - the same sweep on each tab it can reach, because these controls live on three different panes;
    - an honest `gaps[]` for anything that never rendered.

  IT DOES NOT CLICK ANYTHING THAT ACTS
  ------------------------------------
  There is a hard denylist checked before every click, and it covers the words that mutate: delete,
  remove, upload, play, stop, send, save, submit, export, download, import, load, reset, ban, kick,
  clear, pause. **Export is on that list deliberately** — clicking it is the one thing this script
  must not do, because a download is an action and the point here is to read the code that performs
  it. Tab links are the only thing clicked, and only when the label matches one of the known tab
  names by exact string comparison.

  Never build a regex out of a label. `"OBS / XSPLIT/ Share Virtual Cam"` once produced a pattern
  that matched nothing and a control that went unclicked, and the bug looked like the app's.

  HOW TO RUN
  ----------
  1. Log in to the original and open a room's Manage page.
  2. DevTools → Console.
  3. Paste this whole file, press Enter.
  4. A JSON downloads on its own. No follow-up call, no terminal step.
*/

(async () => {
  'use strict';

  const out = {
    capturedAt: new Date().toISOString(),
    href: location.href,
    origin: location.origin,
    role: null,
    roleEvidence: null,
    bundles: [],
    symbols: {},
    controls: [],
    tabsVisited: [],
    gaps: []
  };

  /*
    The words that make a click an ACTION rather than a look. Checked before every click, against
    the element's own text and its ng-click, both lowercased. `export` and `download` are here on
    purpose: this script exists to read the exporter, not to run it.
  */
  const DENY = [
    'delete', 'remove', 'upload', 'play', 'stop', 'send', 'save', 'submit', 'export', 'download',
    'import', 'load', 'reset', 'ban', 'kick', 'clear', 'pause', 'invite', 'regen', 'rotate'
  ];

  const isForbidden = (el) => {
    const text = ((el.textContent || '') + ' ' + (el.getAttribute('ng-click') || '')).toLowerCase();
    return DENY.some((word) => text.includes(word));
  };

  /* What this session can see. A member and an admin are served different controls, and a claim
     about "the" export set has to say which session produced it. */
  const bodyText = document.body ? document.body.innerText : '';
  const hasManage = /\bManage\b/.test(bodyText);
  const hasAdminUsers = /Extra Admin Users/i.test(bodyText);
  out.role = hasAdminUsers ? 'account-owner/admin' : hasManage ? 'member-with-rooms' : 'unknown';
  out.roleEvidence = { hasManage, hasAdminUsers };

  // ── the code behind the controls ───────────────────────────────────────────
  const scripts = [...document.querySelectorAll('script[src]')]
    .map((s) => s.src)
    .filter((src) => {
      try {
        return new URL(src, location.href).origin === location.origin;
      } catch {
        return false;
      }
    });

  if (scripts.length === 0) out.gaps.push('no same-origin <script src> on this page');

  for (const url of scripts) {
    try {
      const res = await fetch(url, { credentials: 'include' });
      const text = await res.text();
      out.bundles.push({ url, status: res.status, bytes: text.length, text });
    } catch (e) {
      out.bundles.push({ url, error: String(e && e.message ? e.message : e) });
      out.gaps.push(`could not fetch ${url}`);
    }
  }

  /*
    A WIDE window, not a matched substring. A regex that extracts "the function" returns only what
    its author already expected the function to look like; 4000 characters either side carries the
    neighbouring methods, which is where a shared `download(blob, filename)` helper would live — and
    that helper is what actually decides the extension and the MIME type.
  */
  const WINDOW = 4000;
  const SYMBOLS = [
    { needle: 'exportListToCSV', why: 'Users → Export. Capture line 34. Expected: CSV.' },
    { needle: 'exportStatsToCSV', why: 'User Stats → Export. Capture line 916. Expected: CSV.' },
    { needle: 'downloadMontlyStats', why: 'Monthly report. Capture line 919. Note the reference misspells "Monthly".' },
    { needle: 'exportSettingsToJSON', why: 'Settings → Export Settings. Capture line 985. THE one JSON export — does the body agree with the name?' },
    { needle: 'loadSettingsFromJSON', why: 'Capture line 986, inside an HTML comment. Does the function still exist in the bundle?' },
    { needle: 'removeBadgesForUsers', why: 'Badges. Capture line 91. Not an export — confirming there is no badge export hiding near it.' },
    { needle: 'openChatTabsWithBadgesEditor', why: 'Badges editor. Capture line 2081.' },
    { needle: 'text/csv', why: 'Every place the app declares a CSV MIME type.' },
    { needle: 'application/json', why: 'Every place it declares a JSON MIME type.' },
    { needle: '.csv', why: 'Every literal .csv filename or extension.' },
    { needle: '.json', why: 'Every literal .json filename or extension.' },
    { needle: 'createObjectURL', why: 'The download mechanism itself — whatever builds the blob decides the extension.' },
    { needle: 'Blob(', why: 'Same, from the other end.' }
  ];

  for (const target of SYMBOLS) {
    const entry = { why: target.why, found: false, regions: [] };
    for (const b of out.bundles) {
      if (!b.text) continue;
      let from = 0;
      for (;;) {
        const at = b.text.indexOf(target.needle, from);
        if (at === -1) break;
        entry.found = true;
        // Cap it: `.json` and `Blob(` can occur hundreds of times in a vendor bundle, and a
        // download nobody can open is not evidence.
        if (entry.regions.length < 12) {
          entry.regions.push({
            bundle: b.url,
            offset: at,
            text: b.text.slice(Math.max(0, at - WINDOW), at + WINDOW)
          });
        }
        from = at + target.needle.length;
      }
    }
    if (entry.regions.length === 12) entry.note = 'truncated at 12 regions; the full bundle text is in bundles[].text';
    out.symbols[target.needle] = entry;

    // Absence is REPORTED, never filled in.
    if (!entry.found) out.gaps.push(`"${target.needle}" does not occur in any same-origin bundle (${target.why})`);
  }

  // ── the controls themselves ────────────────────────────────────────────────
  const INTERESTING = ['export', 'download', 'csv', 'json', 'badge'];

  /* The stylesheet rules that actually match an element, so "this class has no rule" can be proven
     rather than assumed. Cross-origin sheets throw on .cssRules; that is recorded, not swallowed. */
  function rulesFor(el) {
    const matched = [];
    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        matched.push({ href: sheet.href, error: 'cross-origin, rules unreadable' });
        continue;
      }
      for (const rule of rules) {
        if (!rule.selectorText) continue;
        try {
          if (el.matches(rule.selectorText)) matched.push({ href: sheet.href, selector: rule.selectorText, css: rule.cssText });
        } catch {
          /* a selector this browser cannot parse is not a finding about the app */
        }
      }
    }
    return matched;
  }

  function captureControls(tabLabel) {
    for (const el of document.querySelectorAll('button, a, input[type="button"], input[type="submit"]')) {
      const label = (el.textContent || '').trim();
      const click = el.getAttribute('ng-click') || '';
      const haystack = (label + ' ' + click).toLowerCase();
      if (!INTERESTING.some((word) => haystack.includes(word))) continue;

      const style = getComputedStyle(el);
      const props = {};
      for (const p of ['display', 'visibility', 'background-color', 'background-image', 'color', 'border', 'font-size', 'padding', 'margin', 'width', 'height']) {
        props[p] = style.getPropertyValue(p);
      }

      out.controls.push({
        tab: tabLabel,
        label,
        ngClick: click,
        outerHTML: el.outerHTML,
        parentOuterHTML: el.parentElement ? el.parentElement.outerHTML : null,
        computed: props,
        rect: el.getBoundingClientRect().toJSON(),
        visible: style.display !== 'none' && style.visibility !== 'hidden',
        matchedRules: rulesFor(el)
      });
    }
  }

  /*
    These controls live on three different panes, so one pass over the current DOM sees at most one
    of them. Tab labels are compared as EXACT STRINGS — never as a pattern built from the label,
    which is how a menu item with a slash in its name once went unclicked.
  */
  const TAB_LABELS = ['Users', 'Text List', 'Branding (Logo / Landing Page)', 'SSO Setup', 'User Stats', 'Settings'];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  captureControls('(as loaded)');
  out.tabsVisited.push('(as loaded)');

  const tabLinks = [...document.querySelectorAll('.nav-tabs a, .nav-tabs button')];
  if (tabLinks.length === 0) out.gaps.push('no .nav-tabs links found — the tab strip did not render for this role, so only the loaded pane was captured');

  for (const link of tabLinks) {
    const label = (link.textContent || '').trim();
    if (!TAB_LABELS.includes(label)) {
      out.gaps.push(`tab "${label}" is not in the known list and was NOT clicked`);
      continue;
    }
    if (isForbidden(link)) {
      out.gaps.push(`tab "${label}" matched the denylist and was NOT clicked`);
      continue;
    }
    try {
      link.click();
      await sleep(400);
      captureControls(label);
      out.tabsVisited.push(label);
    } catch (e) {
      out.gaps.push(`clicking tab "${label}" threw: ${String(e && e.message ? e.message : e)}`);
    }
  }

  for (const label of TAB_LABELS) {
    if (!out.tabsVisited.includes(label)) out.gaps.push(`tab "${label}" never rendered — nothing from it is in this capture`);
  }

  if (out.controls.length === 0) {
    out.gaps.push('no export/download/badge control was found in any pane this role could reach');
  }

  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `export-controls-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click(); // the only click on an element this script did not create is a tab link, above
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);

  console.log('[collect-export-controls] role:', out.role);
  console.log('[collect-export-controls] tabs visited:', out.tabsVisited.join(', '));
  console.log('[collect-export-controls] controls captured:', out.controls.length);
  for (const [needle, entry] of Object.entries(out.symbols)) {
    console.log(`[collect-export-controls] ${needle}: ${entry.found ? entry.regions.length + ' region(s)' : 'ABSENT'}`);
  }
  console.log('[collect-export-controls] gaps:', out.gaps.length ? out.gaps : 'none');
})();
