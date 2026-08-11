/* pull-manage-partial.js — the manage view's HTML partial, which is where gap 5's answer lives.

   PASTE INTO THE CHROME CONSOLE ON the manage page, logged in. Downloads one JSON.

   WHY THIS EXISTS
   `pull-app-bundle.js` worked: it fetched vendor.min.js (1,245,997 bytes), janus3.js (79,285) and
   app.min.js (455,314) and found `createNew`, `htmlDescChanged`, `customMobileAppLaunchWord`,
   `textAngularToolbar`, `ta-toolbar`, `loadMobileUsers` and `showMobile`. But `user.role==0` was
   ABSENT from all three, and no `$templateCache.put` carried the role spans.

   That is itself the finding: **this AngularJS app does not inline its views.** The bundle's own
   `templateUrl` values are paths — `app/views/files.html`, `/public/app/views/roomControl.html`,
   `/public/app/views/debugLog.html` — so every view is a separate HTML file fetched at runtime.
   The manage view is one of them, and it has never been fetched.

   WHAT IT DOES
   1. Reads `manageSession` out of `app.min.js` with a wide window, so the ui-router state that
      names the view is captured verbatim rather than guessed at.
   2. Fetches a list of candidate partial paths, built from the directory pattern the bundle itself
      uses. Every candidate is reported with its status, so a miss is visible instead of silent.
   3. In whatever HTML comes back, extracts the Role cell region — the sibling `ng-show` spans and
      the `ng-hide="user.role==0"` span that follows them.

   THE ANSWER IT IS AFTER
   Five captures render that span as `<span ng-hide="user.role==0" class="ng-binding"> / manual</span>`
   on non-owner rows and `<span ... class="ng-binding ng-hide"> / </span>` on the owner's, where the
   value is empty. `ng-binding` is AngularJS 1.3.15 marking a {{ }} interpolation, so " / manual" is
   " / " plus a per-user field. In the PARTIAL that interpolation is still literal. One string.

   It fetches and reads. It clicks nothing, submits nothing, mutates nothing.
*/

(async function () {
  var OUT = {
    tool: 'pull-manage-partial',
    version: 1,
    capturedAt: new Date().toISOString(),
    href: location.href,
    origin: location.origin,
    stateConfig: [],
    partials: [],
    roleCell: null,
    errors: [],
    gaps: []
  };
  var step = function (m) {
    console.log('[partial] ' + m);
  };
  var fail = function (what, e) {
    OUT.errors.push({ what: what, error: e && e.message ? e.message : String(e) });
    console.warn('[partial] FAILED: ' + what);
  };

  /* 1. The state that names the view, read out of the bundle rather than assumed. */
  var bundle = null;
  try {
    var tags = document.querySelectorAll('script[src]');
    var appUrl = null;
    for (var i = 0; i < tags.length; i++) {
      if ((tags[i].src || '').indexOf('app.min.js') !== -1) appUrl = tags[i].src;
    }
    if (!appUrl) appUrl = location.origin + '/public/dist/app.min.js';
    step('fetching ' + appUrl);
    var r = await fetch(appUrl, { credentials: 'include' });
    bundle = await r.text();
    step('  ' + bundle.length + ' bytes');
  } catch (e) {
    fail('fetch app.min.js', e);
  }

  var CANDIDATES = [];
  if (bundle) {
    try {
      var from = 0;
      var n = 0;
      while (n < 20) {
        var at = bundle.indexOf('manageSession', from);
        if (at === -1) break;
        OUT.stateConfig.push({
          offset: at,
          text: bundle.slice(Math.max(0, at - 3000), at + 3000)
        });
        from = at + 13;
        n++;
      }
      step('manageSession regions captured: ' + n);

      /* Every templateUrl the bundle names, so the candidate list is the app's own vocabulary and
         not a list I invented. */
      var re = /templateUrl\s*:\s*["']([^"']+)["']/g;
      var m;
      var seen = {};
      while ((m = re.exec(bundle))) {
        if (!seen[m[1]]) {
          seen[m[1]] = 1;
          OUT.templateUrlsInBundle = OUT.templateUrlsInBundle || [];
          OUT.templateUrlsInBundle.push(m[1]);
        }
      }
      step('distinct templateUrl values in the bundle: ' + (OUT.templateUrlsInBundle || []).length);

      /* Anything whose path smells like the manage view goes to the front of the queue. */
      var list = OUT.templateUrlsInBundle || [];
      for (var j = 0; j < list.length; j++) {
        if (/manage|session|users|admin/i.test(list[j])) CANDIDATES.push(list[j]);
      }
    } catch (e) {
      fail('scanning the bundle', e);
    }
  }

  /* The directory pattern the bundle uses, with the names the route and the tabs imply. Reported
     with status either way, so a 404 is evidence about where the file is NOT. */
  var GUESSES = [
    '/public/app/views/manageSession.html',
    '/public/app/views/manage.html',
    '/public/app/views/cached/manageSession.html',
    'app/views/manageSession.html',
    '/public/app/views/sessionUsers.html',
    '/public/app/views/users.html'
  ];
  for (var g = 0; g < GUESSES.length; g++) {
    if (CANDIDATES.indexOf(GUESSES[g]) === -1) CANDIDATES.push(GUESSES[g]);
  }

  step('candidate partials to try: ' + CANDIDATES.length);

  for (var c = 0; c < CANDIDATES.length; c++) {
    var path = CANDIDATES[c];
    var url = path.indexOf('http') === 0 ? path : location.origin + (path.charAt(0) === '/' ? '' : '/') + path;
    var html;
    try {
      var res = await fetch(url, { credentials: 'include' });
      html = await res.text();
      var isHtmlDoc = /^\s*(<!doctype|<html)/i.test(html.slice(0, 200));
      var hasRole = html.indexOf('user.role==0') !== -1 || html.indexOf('nonPresenter') !== -1;
      OUT.partials.push({
        url: url,
        status: res.status,
        bytes: html.length,
        isFullDocument: isHtmlDoc,
        containsRoleCell: hasRole
      });
      step('  ' + res.status + '  ' + (hasRole ? 'HAS THE ROLE CELL  ' : '') + url);

      if (res.ok && hasRole && !OUT.roleCell) {
        var k = html.indexOf('user.role==0');
        if (k === -1) k = html.indexOf('nonPresenter');
        OUT.roleCell = {
          url: url,
          offset: k,
          /* Wide, because the answer is the whole cell: the four role spans and the slash span. */
          text: html.slice(Math.max(0, k - 2500), k + 2500)
        };
        OUT.fullPartial = html.length < 900000 ? html : html.slice(0, 900000) + '…[truncated]';
      }
    } catch (e) {
      OUT.partials.push({ url: url, error: e && e.message ? e.message : String(e) });
    }
  }

  if (!OUT.roleCell) {
    OUT.gaps.push(
      'No candidate partial contained the role spans. The stateConfig regions above hold the ui-router definition verbatim — the real templateUrl is in them, and the partials list shows exactly which paths were tried and what each returned.'
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
    a.download = 'manage-partial-' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    step('DONE — ' + a.download + ' (' + (json.length / 1048576).toFixed(2) + ' MB)');
  } catch (e) {
    fail('download', e);
  }
  window.__PARTIAL__ = OUT;

  if (OUT.roleCell) {
    console.log('%c[partial] THE ROLE CELL, UNCOMPILED:', 'font-weight:bold');
    console.log(
      OUT.roleCell.text.slice(
        Math.max(0, OUT.roleCell.text.indexOf('user.role==2') - 200),
        OUT.roleCell.text.indexOf('user.role==2') + 900
      )
    );
  }
  for (var q = 0; q < OUT.gaps.length; q++) console.warn('[gap] ' + OUT.gaps[q]);
})();
