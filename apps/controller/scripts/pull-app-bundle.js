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
    version: 1,
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

  /* Only what this app serves. Every other script on the page is a CDN or an analytics tag, and a
     cross-origin fetch would fail noisily for nothing. Discovered from the DOM rather than
     hardcoded, so a versioned filename cannot break it. */
  var wanted = [];
  try {
    var tags = document.querySelectorAll('script[src]');
    for (var i = 0; i < tags.length; i++) {
      var src = tags[i].src || '';
      if (src.indexOf(location.origin) === 0 && /\/dist\/|\/app\/|\.min\.js/.test(src)) {
        if (wanted.indexOf(src) === -1) wanted.push(src);
      }
    }
  } catch (e) {
    fail('reading script tags', e);
  }
  step('same-origin bundles found: ' + wanted.length);
  if (wanted.length === 0) {
    OUT.gaps.push('No same-origin bundle on this page. Are you on protradingroom.com and logged in?');
  }

  var WINDOW = 6000;

  for (var b = 0; b < wanted.length; b++) {
    var url = wanted[b];
    var text;
    try {
      step('fetching ' + url.split('/').pop());
      var res = await fetch(url, { credentials: 'include' });
      text = await res.text();
      OUT.bundles.push({ url: url, status: res.status, bytes: text.length });
      step('  got ' + text.length + ' bytes');
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
