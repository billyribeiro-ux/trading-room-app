/* pull-template-cache.js — take the partial from Angular's own cache instead of guessing its path.

   PASTE INTO THE CHROME CONSOLE ON the manage page, logged in. Downloads one JSON.

   WHY THIS ONE WORKS WHERE PATH-GUESSING CANNOT
   The previous run read the state definition out of `app.min.js` verbatim:

     .state("page.manageSession",{url:"/manageSession/:sessionID",
             templateUrl:Route.base("page.manageSession.html"),params:{autoLogin:!0}})

   The template is `Route.base("page.manageSession.html")` — a FUNCTION call, so there is no literal
   path in the bundle to fetch and every directory I tried returned a 52-byte stub. Guessing the base
   is exactly the thing this project forbids.

   But the page you are standing on has ALREADY fetched that partial in order to render itself, so
   AngularJS is holding it in `$templateCache` right now, keyed by its real resolved URL. Reading it
   from there is not a guess: it is the exact bytes the app used, and the key tells us the path as a
   by-product.

   THREE WAYS IN, TRIED IN ORDER, EACH REPORTED
   1. `$templateCache` via the injector — the whole cache, enumerated.
   2. `Route.base` located in the bundle, so the directory is read rather than guessed, then fetched.
   3. The rendered DOM, as a floor: whatever the Role cell looks like right now.

   WHAT IT IS AFTER
   `<span ng-hide="user.role==0" class="ng-binding"> / manual</span>` renders on non-owner rows and
   `<span ... class="ng-binding ng-hide"> / </span>` on the owner's, where the value is EMPTY.
   `ng-binding` is AngularJS 1.3.15 marking a {{ }} interpolation, so " / manual" is " / " plus a
   per-user field. In the cached partial that interpolation is still literal.

   It reads. It clicks nothing, submits nothing, mutates nothing.
*/

/* global angular */
(async function () {
  var OUT = {
    tool: 'pull-template-cache',
    version: 1,
    capturedAt: new Date().toISOString(),
    href: location.href,
    origin: location.origin,
    injector: null,
    cacheKeys: [],
    matches: [],
    routeBase: [],
    fetched: [],
    renderedRoleCell: null,
    errors: [],
    gaps: []
  };
  var step = function (m) {
    console.log('[tc] ' + m);
  };
  var fail = function (what, e) {
    OUT.errors.push({ what: what, error: e && e.message ? e.message : String(e) });
    console.warn('[tc] FAILED: ' + what + ' — ' + (e && e.message ? e.message : e));
  };

  var NEEDLES = ['user.role==0', 'nonPresenter', 'user.role==1'];
  var carriesRoleCell = function (text) {
    if (typeof text !== 'string') return false;
    for (var i = 0; i < NEEDLES.length; i++) if (text.indexOf(NEEDLES[i]) !== -1) return true;
    return false;
  };

  /* ── 1. the injector, tried from several roots ───────────────────────────── */
  var cache = null;
  try {
    if (typeof angular === 'undefined') {
      OUT.gaps.push('`angular` is not a global on this page.');
    } else {
      var roots = [
        document.body,
        document.documentElement,
        document.querySelector('[ng-app]'),
        document.querySelector('.ng-scope')
      ];
      for (var r = 0; r < roots.length && !cache; r++) {
        if (!roots[r]) continue;
        try {
          var inj = angular.element(roots[r]).injector();
          if (inj) {
            cache = inj.get('$templateCache');
            OUT.injector =
              'found via ' +
              (roots[r].tagName || 'node') +
              (roots[r].className ? '.' + String(roots[r].className).split(' ')[0] : '');
          }
        } catch (_e2) {
          /* try the next root */
        }
      }
    }
  } catch (e) {
    fail('reaching the injector', e);
  }

  if (cache) {
    step('injector ' + OUT.injector);
    try {
      /* $cacheFactory keeps its data in a closure, so enumerate by asking for every URL the app
         could have used: the state templates follow one naming scheme, visible in the bundle. */
      var NAMES = [
        'page.manageSession.html',
        'page.welcome.html',
        'page.stats.html',
        'page.register.html',
        'layout.columns.html',
        'page.html'
      ];
      var BASES = [
        '',
        'app/pages/',
        '/app/pages/',
        'public/app/pages/',
        '/public/app/pages/',
        'app/views/',
        '/app/views/',
        'public/app/views/',
        '/public/app/views/',
        'app/',
        '/app/',
        'tpl/',
        'views/'
      ];
      for (var b = 0; b < BASES.length; b++) {
        for (var n = 0; n < NAMES.length; n++) {
          var key = BASES[b] + NAMES[n];
          var val = null;
          try {
            val = cache.get(key);
          } catch (_e4) {
            val = null;
          }
          if (typeof val === 'string' && val.length) {
            OUT.cacheKeys.push({ key: key, bytes: val.length, roleCell: carriesRoleCell(val) });
            step('  CACHE HIT  ' + key + '  ' + val.length + ' bytes' + (carriesRoleCell(val) ? '  << ROLE CELL' : ''));
            if (carriesRoleCell(val)) {
              OUT.matches.push({ source: '$templateCache', key: key, html: val });
            }
          }
        }
      }
      step('cache hits: ' + OUT.cacheKeys.length);
    } catch (e) {
      fail('reading $templateCache', e);
    }
  } else {
    OUT.gaps.push('Could not reach $templateCache through any root element.');
  }

  /* ── 2. Route.base, read out of the bundle rather than guessed ───────────── */
  try {
    var appUrl = null;
    var tags = document.querySelectorAll('script[src]');
    for (var i2 = 0; i2 < tags.length; i2++) {
      if ((tags[i2].src || '').indexOf('app.min.js') !== -1) appUrl = tags[i2].src;
    }
    if (appUrl) {
      var res0 = await fetch(appUrl, { credentials: 'include' });
      var bundle = await res0.text();
      step('bundle ' + bundle.length + ' bytes');
      var from = 0;
      var got = 0;
      while (got < 8) {
        var at = bundle.indexOf('base', from);
        if (at === -1) break;
        from = at + 4;
        var around = bundle.slice(Math.max(0, at - 400), at + 400);
        // Only the definition, which will sit beside the other Route helpers.
        if (/base\s*[:=]\s*function|base\s*[:=]\s*\(/.test(around) && /Route|\.html/.test(around)) {
          OUT.routeBase.push({ offset: at, text: around });
          got++;
        }
      }
      step('Route.base candidates: ' + OUT.routeBase.length);

      /* Any path the bundle itself spells out, so the base can be inferred from real values. */
      var re = /["']([\w./-]*page\.[\w.-]+\.html)["']/g;
      var m;
      var seenp = {};
      OUT.pageTemplateNames = [];
      while ((m = re.exec(bundle))) {
        if (!seenp[m[1]]) {
          seenp[m[1]] = 1;
          OUT.pageTemplateNames.push(m[1]);
        }
      }
      step('page.*.html names in the bundle: ' + OUT.pageTemplateNames.length);
    }
  } catch (e) {
    fail('reading Route.base', e);
  }

  /* ── 3. if the cache gave nothing, fetch the resolved names ──────────────── */
  if (OUT.matches.length === 0) {
    var TRY = [];
    var bases2 = ['/public/app/pages/', '/app/pages/', '/public/app/', '/app/', '/public/app/views/', '/'];
    for (var b2 = 0; b2 < bases2.length; b2++) TRY.push(bases2[b2] + 'page.manageSession.html');
    for (var t2 = 0; t2 < TRY.length; t2++) {
      try {
        var u = location.origin + TRY[t2];
        var rr = await fetch(u, { credentials: 'include' });
        var hh = await rr.text();
        var hit = carriesRoleCell(hh);
        OUT.fetched.push({ url: u, status: rr.status, bytes: hh.length, roleCell: hit });
        step('  ' + rr.status + '  ' + hh.length + 'B  ' + (hit ? 'ROLE CELL  ' : '') + TRY[t2]);
        if (rr.ok && hit) OUT.matches.push({ source: 'fetch', key: u, html: hh });
      } catch (_e5) {
        OUT.fetched.push({ url: TRY[t2], error: String(_e5 && _e5.message ? _e5.message : _e5) });
      }
    }
  }

  /* ── 4. the floor: whatever is rendered right now ────────────────────────── */
  try {
    var spans = document.querySelectorAll('span.ng-binding');
    for (var s = 0; s < spans.length; s++) {
      var txt = (spans[s].textContent || '').trim();
      if (txt.charAt(0) === '/') {
        OUT.renderedRoleCell = {
          text: spans[s].textContent,
          outerHTML: spans[s].outerHTML,
          parentHTML: spans[s].parentElement ? spans[s].parentElement.outerHTML.slice(0, 3000) : null
        };
        break;
      }
    }
  } catch (e) {
    fail('reading the rendered cell', e);
  }

  if (OUT.matches.length === 0) {
    OUT.gaps.push(
      'The manage partial was not recovered. `routeBase` and `pageTemplateNames` hold what the bundle says about where it lives; `cacheKeys` and `fetched` show exactly what was tried.'
    );
  }

  var json;
  try {
    json = JSON.stringify(OUT, null, 1);
  } catch (e) {
    fail('serialise', e);
    json = JSON.stringify({ errors: OUT.errors });
  }
  try {
    var blob = new Blob([json], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'template-cache-' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    step('DONE — ' + a.download + ' (' + (json.length / 1048576).toFixed(2) + ' MB)');
  } catch (e) {
    fail('download', e);
  }
  window.__TC__ = OUT;

  if (OUT.matches.length) {
    var h = OUT.matches[0].html;
    var k2 = h.indexOf('user.role==0');
    if (k2 === -1) k2 = h.indexOf('nonPresenter');
    console.log('%c[tc] THE ROLE CELL, UNCOMPILED:', 'font-weight:bold;color:#0a0');
    console.log(h.slice(Math.max(0, k2 - 900), k2 + 600));
  }
  for (var q = 0; q < OUT.gaps.length; q++) console.warn('[gap] ' + OUT.gaps[q]);
})();
