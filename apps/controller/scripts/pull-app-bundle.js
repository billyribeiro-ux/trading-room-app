/* pull-app-bundle.js — fetches the one file that blocks six gaps, and nothing else.

   PASTE INTO THE CHROME CONSOLE ON https://protradingroom.com/ptrApp#/page/manageSession/<any room>
   while logged in. It downloads one JSON. Nothing to click, nothing to run afterwards.

   WHY A NEW SCRIPT
   collect-create-new.js errors on paste and the error was never captured, so it cannot be fixed.
   This one is rewritten to remove every plausible cause rather than guess at one:

     - it fetches TWO named files, not "every same-origin script[src]" (16 on this page, several
       cross-origin, several enormous);
     - it never stores a bundle's full text, only slices around hits, so the download is under a
       megabyte instead of twenty;
     - nothing throws: every step is wrapped and its failure is written into the JSON;
     - no 'use strict', no top-level await, no optional chaining, no template literals in the
       hot path — nothing that a console or an older engine can object to;
     - it logs each step, so if it ever does die the last line tells you where.

   THE TARGET THAT MATTERS MOST IS THE FIRST ONE.
   `user.role==0` is the Role cell. Five separate captures show it rendering
   `<span ng-hide="user.role==0" class="ng-binding"> / manual</span>` on non-owner rows and
   `<span ... class="ng-binding ng-hide"> / </span>` on the owner's, where the value is EMPTY.
   `ng-binding` is AngularJS 1.3.15 saying the content is a {{ }} interpolation, so the rendered
   " / manual" is " / " plus a per-user field whose NAME has never been seen. AngularJS 1.3 apps
   ship their partials inside the bundle via $templateCache.put(), so the uncompiled template —
   with the {{ }} still literal — is in this file. That is gap 5, and it is one string away.
*/

(async function () {
  var OUT = {
    tool: 'pull-app-bundle',
    version: 2,
    capturedAt: new Date().toISOString(),
    href: location.href,
    origin: location.origin,
    bundles: [],
    hits: {},
    templates: [],
    errors: [],
    gaps: []
  };

  var step = function (msg) {
    console.log('[pull] ' + msg);
  };
  var fail = function (what, e) {
    var m = e && e.message ? e.message : String(e);
    OUT.errors.push({ what: what, error: m });
    console.warn('[pull] FAILED: ' + what + ' — ' + m);
  };

  /* The targets, most important first. `why` travels into the file so it explains itself. */
  var TARGETS = [
    {
      needle: 'user.role==0',
      why: 'GAP 5 — the Role cell. The uncompiled template shows what {{ }} follows the " / ".'
    },
    { needle: 'nonPresenter', why: 'gap 5 support — the sibling role spans, to locate the same template' },
    { needle: 'createNew', why: 'gap 1 — the New Room handler; where a new room NAME comes from' },
    { needle: 'htmlDescChanged', why: 'gap 2 — Save Editor Changes; whether the original shows anything on save' },
    { needle: 'ptrMobileAppCaseByCaseEnabled', why: 'gap 6 — the three branches Angular stripped' },
    { needle: 'customMobileAppLaunchWord', why: 'gap 7 — what the launch word actually does' },
    { needle: 'textAngularToolbar', why: 'gap 3 — toolbar disabled state (candidate)' },
    { needle: 'ta-toolbar', why: 'gap 3 — toolbar disabled state (the class in the capture)' },
    { needle: 'loadMobileUsers', why: 'gap 4 — the Show Mobile filter; may reveal only the request' },
    { needle: 'showMobile', why: 'gap 4 — the filter flag' }
  ];

  /* EVERY script tag is recorded, matched or not.
     Version 1 required `src.indexOf(location.origin) === 0`, which found nothing on the live page:
     `www.protradingroom.com` and `protradingroom.com` are different origins by that test, so the
     bundle the 2026-08-08 dump proves is there was filtered out by its own hostname. Recording all
     of them means a miss can be diagnosed from the download instead of guessed at. */
  var allScripts = [];
  var wanted = [];
  try {
    var tags = document.querySelectorAll('script[src]');
    for (var i = 0; i < tags.length; i++) {
      var src = tags[i].src || '';
      if (!src) continue;
      allScripts.push(src);
      // Host-based, not origin-based: any protradingroom host, www or not, room or app.
      if (/(^|\/\/|\.)protradingroom\.com\//.test(src) && wanted.indexOf(src) === -1) {
        wanted.push(src);
      }
    }
  } catch (e) {
    fail('reading script tags', e);
  }
  OUT.allScripts = allScripts;

  /* The known paths, tried DIRECTLY whether or not a tag advertised them.
     `/public/dist/app.min.js` is recorded in `collect-manage-2026-08-08T20-16-32-687Z.json`'s
     `scripts` list, so it exists on this host even when the tag scan comes back empty — a
     hash-routed AngularJS page can have replaced the tags by the time this runs. Relative to
     `location.origin`, so it follows whichever host you are actually on. */
  var KNOWN = ['/public/dist/app.min.js', '/public/dist/vendor.min.js'];
  for (var kk2 = 0; kk2 < KNOWN.length; kk2++) {
    var abs = location.origin + KNOWN[kk2];
    var already = false;
    for (var w = 0; w < wanted.length; w++) {
      if (wanted[w].indexOf(KNOWN[kk2]) !== -1) already = true;
    }
    if (!already) wanted.push(abs);
  }

  step('bundles to fetch: ' + wanted.length + ' (of ' + allScripts.length + ' script tags seen)');
  for (var q = 0; q < wanted.length; q++) step('  · ' + wanted[q]);
  if (allScripts.length === 0) {
    OUT.gaps.push('No <script src> on this page at all. The known paths are still being tried directly.');
  }

  var WINDOW = 6000;

  for (var b = 0; b < wanted.length; b++) {
    var url = wanted[b];
    var text;
    try {
      step('fetching ' + url.split('/').pop());
      var res = await fetch(url, { credentials: 'include' });
      text = await res.text();
      // A 404 on this app returns the SPA's index.html, which is a perfectly valid string and would
      // otherwise be scanned as if it were the bundle and report every target as absent.
      var looksLikeHtml = /^\s*(<!doctype|<html)/i.test(text.slice(0, 200));
      OUT.bundles.push({
        url: url,
        status: res.status,
        bytes: text.length,
        looksLikeHtml: looksLikeHtml
      });
      step('  got ' + text.length + ' bytes, status ' + res.status + (looksLikeHtml ? ' — HTML, not JS' : ''));
      if (!res.ok || looksLikeHtml) {
        OUT.gaps.push(
          url +
            ' returned ' +
            res.status +
            (looksLikeHtml ? ' and HTML rather than JavaScript' : '') +
            ' — not scanned.'
        );
        continue;
      }
    } catch (e) {
      OUT.bundles.push({ url: url, error: String(e && e.message ? e.message : e) });
      fail('fetch ' + url, e);
      continue;
    }

    for (var t = 0; t < TARGETS.length; t++) {
      var needle = TARGETS[t].needle;
      if (!OUT.hits[needle]) OUT.hits[needle] = { why: TARGETS[t].why, found: false, regions: [] };
      var from = 0;
      var guard = 0;
      while (guard++ < 40) {
        var at = text.indexOf(needle, from);
        if (at === -1) break;
        OUT.hits[needle].found = true;
        OUT.hits[needle].regions.push({
          bundle: url.split('/').pop(),
          offset: at,
          text: text.slice(Math.max(0, at - WINDOW), at + WINDOW)
        });
        from = at + needle.length;
      }
      if (guard >= 40) OUT.hits[needle].capped = 'stopped at 40 regions';
    }

    /* AngularJS 1.3 inlines its partials with $templateCache.put('name', '...'). Pulling the whole
       call for any template mentioning the role spans gives the ROW markup uncompiled, which is
       where the {{ }} that gap 5 needs is still literal. */
    try {
      var key = '$templateCache.put(';
      var p = 0;
      var found = 0;
      while (found < 12) {
        var k = text.indexOf(key, p);
        if (k === -1) break;
        p = k + key.length;
        var chunk = text.slice(k, k + 60000);
        if (chunk.indexOf('user.role==0') !== -1 || chunk.indexOf('nonPresenter') !== -1) {
          OUT.templates.push({ bundle: url.split('/').pop(), offset: k, text: chunk });
          found++;
        }
      }
      step('  templateCache entries carrying the role spans: ' + found);
    } catch (e) {
      fail('scanning $templateCache', e);
    }
  }

  for (var t2 = 0; t2 < TARGETS.length; t2++) {
    var n = TARGETS[t2].needle;
    if (!OUT.hits[n] || !OUT.hits[n].found) {
      OUT.gaps.push('"' + n + '" does not occur in any bundle fetched (' + TARGETS[t2].why + ')');
    }
  }
  if (OUT.templates.length === 0) {
    OUT.gaps.push(
      'No $templateCache entry mentioned the role spans. The manage view may be served as a separate .html partial rather than inlined — if so its URL is in the bundle and the regions above will show it.'
    );
  }

  /* The rendered Role cell from THIS page, so the download carries both halves. */
  try {
    var spans = document.querySelectorAll('span.ng-binding');
    var roleCells = [];
    for (var s = 0; s < spans.length; s++) {
      var txt = (spans[s].textContent || '').trim();
      if (txt.indexOf('/') === 0 || txt === '/' || /^\/\s*\w+$/.test(txt)) {
        roleCells.push({ text: spans[s].textContent, outerHTML: spans[s].outerHTML.slice(0, 400) });
      }
    }
    OUT.renderedRoleCells = roleCells;
    step('rendered role cells on this page: ' + roleCells.length);
    if (roleCells.length === 0) {
      OUT.gaps.push('No rendered role cell on this page — the user table is empty here, as it was in every capture.');
    }
  } catch (e) {
    fail('reading rendered role cells', e);
  }

  var json;
  try {
    json = JSON.stringify(OUT, null, 1);
  } catch (e) {
    fail('serialising', e);
    json = JSON.stringify({ errors: OUT.errors, note: 'serialisation failed; see errors' });
  }

  try {
    var blob = new Blob([json], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'app-bundle-' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    step('DONE — ' + a.download + ' (' + (json.length / 1048576).toFixed(2) + ' MB)');
  } catch (e) {
    fail('download', e);
    console.log('[pull] Download failed. Copy the JSON manually with: copy(window.__PULL__)');
  }
  window.__PULL__ = OUT;

  for (var g = 0; g < OUT.gaps.length; g++) console.warn('[gap] ' + OUT.gaps[g]);
  console.log('[pull] hits:');
  for (var kk in OUT.hits) {
    if (Object.prototype.hasOwnProperty.call(OUT.hits, kk)) {
      console.log('   ' + kk + ': ' + (OUT.hits[kk].found ? OUT.hits[kk].regions.length + ' region(s)' : 'ABSENT'));
    }
  }
})();
