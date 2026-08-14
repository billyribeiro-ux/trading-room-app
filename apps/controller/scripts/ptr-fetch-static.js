/**
 * ptr-fetch-static.js — Tier 1 of docs/reference/evidence-gap-register.md
 *
 * Paste into the Chrome console on https://protradingroom.com (any page, logged in or out) and
 * press Enter. It downloads ONE JSON bundle containing every static artifact the gap register
 * lists as Tier 1, then stops. No further steps, no terminal command, no follow-up call.
 *
 * ## What this does NOT do
 *
 * It does not click anything. It does not open a tab, a panel or a modal. It does not submit a
 * form, create, delete, upload, play, stop, send or save. It issues GET requests for static assets
 * that the page already loads, and reads them. That is the whole of it.
 *
 * The denylist below is enforced on every URL before it is fetched, and the script aborts the whole
 * run if any target ever matches it. It is deliberately paranoid: these are the owner's live
 * production servers.
 *
 * ## Why a script rather than curl
 *
 * Three of these are same-origin-only in practice (the CSSOM already proved `access: "refetched"`
 * for the cross-origin CDN sheets in stylesheets.json) and the Angular-17 build assets are served
 * relative to a `<base href="/">` that only resolves correctly from the app's own origin. Running
 * in the page gets the same bytes the browser got.
 *
 * ## What it closes
 *
 * T1-1 app.min.js .......... the ngRepeat row templates (user/stats/monthly/badge/admin/api-key).
 *                            This is the one that may make most of Tier 2 unnecessary.
 * T1-2 vendor.min.js ....... xeditable + bootbox directive internals
 * T1-4 styles.css .......... raw bytes, incl. comment banners Chrome stripped from sheet-9
 * T1-5 API_Documentation.md  the authoritative source behind the rendered api-docs page
 * T1-6 glyphicons webfont .. lets the decoded PUA codepoints actually be rendered
 * T1-7 fontawesome webfont . same, for FA 4.3.0
 * T1-8 public-site CSS ..... theme.css / vendor/animate.css / main.css — currently ZERO captured
 * T1-9 public-site images .. referenced by path only in every capture we hold
 * T1-10 Angular-17 build ... styles.<hash>.css + main.<hash>.js for the room
 *
 * T1-3 (bootstrap.min.css raw bytes) is deliberately absent: closed already by T0-5/6/7 via the
 * in-repo evidence-bootstrap-3.3.7.css comparison. Fetching it would add nothing.
 */

(async () => {
  'use strict';

  /* ---------------------------------------------------------------------- *
   * HARD DENYLIST. Checked before every single fetch. Any match aborts all. *
   * ---------------------------------------------------------------------- */
  const FORBIDDEN = [
    'delete', 'remove', 'destroy', 'drop',
    'upload', 'save', 'submit', 'send', 'post',
    'play', 'stop', 'start', 'kill',
    'ban', 'mute', 'kick',
    'reset', 'clear', 'wipe',
    'create', 'add', 'invite', 'clone',
    'logout', 'signout'
  ];

  const ORIGIN = 'https://protradingroom.com';

  /* Cache-buster values read from the live page rather than hardcoded, so this keeps working
     after a deploy. If they cannot be found we say so and fall back to the captured values —
     an honest fallback, recorded in the output, not a silent guess. */
  const CVER = (window.__cver ?? '1785053347467') + '';
  const cverSource = window.__cver ? 'window.__cver (live)' : 'FALLBACK: value from meta.json capture';

  const TARGETS = [
    ['T1-1',  'app.min.js',            `${ORIGIN}/public/dist/app.min.js?v=${CVER}`,           'text'],
    ['T1-2',  'vendor.min.js',         `${ORIGIN}/public/dist/vendor.min.js?v=2.18.100`,       'text'],
    ['T1-4',  'styles.css',            `${ORIGIN}/public/app/css/styles.css`,                  'text'],
    ['T1-5',  'API_Documentation.md',  `${ORIGIN}/public/html/POST_ROUTE_API_DOCUMENTATION.md`,'text'],
    ['T1-5b', 'api-docs source alt',   `${ORIGIN}/public/html/API_Documentation.md`,           'text'],
    ['T1-6',  'glyphicons.woff2',      `${ORIGIN}/public/app/fonts/glyphicons-halflings-regular.woff2`, 'b64'],
    ['T1-6',  'glyphicons.woff',       `${ORIGIN}/public/app/fonts/glyphicons-halflings-regular.woff`,  'b64'],
    ['T1-6',  'glyphicons.ttf',        `${ORIGIN}/public/app/fonts/glyphicons-halflings-regular.ttf`,   'b64'],
    ['T1-7',  'fontawesome.woff2',     `${ORIGIN}/public/vendor/font-awesome/fonts/fontawesome-webfont.woff2?v=4.3.0`, 'b64'],
    ['T1-8',  'theme.css',             `${ORIGIN}/public/css/compiled/theme.css`,              'text'],
    ['T1-8',  'vendor-animate.css',    `${ORIGIN}/public/css/vendor/animate.css`,              'text'],
    ['T1-8',  'main.css',              `${ORIGIN}/public/css/main.css?v1.0`,                   'text'],
    ['T1-9',  'protradingroom_icon.png',      `${ORIGIN}/public/images/protradingroom_icon.png`,      'b64'],
    ['T1-9',  'protradingroom_icon_dark.png', `${ORIGIN}/public/images/protradingroom_icon_dark.png`, 'b64'],
    ['T1-9',  'ptr_descrived_perspective.png',`${ORIGIN}/public/images/ptr_descrived_perspective.png`,'b64'],
    ['T1-9',  'user_comments.png',     `${ORIGIN}/public/images/user_comments.png`,            'b64'],
    ['T1-9',  'ss3.png',               `${ORIGIN}/public/images/ss3.png`,                      'b64'],
    ['T1-9',  'icon-locked.png',       `${ORIGIN}/public/images/circle-icons/one-color/locked.png`,  'b64'],
    ['T1-9',  'icon-cloud.png',        `${ORIGIN}/public/images/circle-icons/one-color/cloud.png`,   'b64'],
    ['T1-9',  'icon-browser.png',      `${ORIGIN}/public/images/circle-icons/one-color/browser.png`, 'b64'],
    ['T1-10', 'room styles.css',       `${ORIGIN}/styles.d622cb9ed2bbc221.css`,                'text'],
    ['T1-10', 'room main.js',          `${ORIGIN}/main.d6d3c112b59b7d0d.js`,                   'text']
  ];

  /* The denylist matches on the PATH only. Without this, `/public/dist/app.min.js` trips on
     nothing but a query like `?v=` containing "save" would, and — more importantly — a path
     segment such as `.../images/uploads/` would not be caught by a naive whole-URL test that the
     origin string already satisfies. Path-only keeps the check meaningful. */
  /*
    STATIC DOCUMENTS ARE EXEMPT FROM THE VERB LIST, and that is a correction rather than a
    loosening.

    On 2026-08-14 this aborted the entire run — before a single request — on
    `/public/html/POST_ROUTE_API_DOCUMENTATION.md`, because `path.includes('post')` is true of a
    filename describing HTTP POST *routes*. Nothing was fetched and T1-9/T1-10 stayed open on a
    false positive.

    The list names ACTIONS: delete, upload, submit, kick. What makes a request dangerous is that it
    invokes one, not that a noun in its name happens to contain those letters — the same class of
    error as `\bdelete\b` failing to match `deleteParticipant`, in the opposite direction. A path
    ending in a document or asset extension is a FILE being read, and every request here is a GET.

    Splitting on separators would not fix it either: `POST_ROUTE_…` yields `post` as a whole token.
    The extension is the honest discriminator.

    The tripwire keeps its teeth for anything added later that is NOT a static file — an endpoint
    like `/users/v1/sessions/deleteUser` has no such extension and still aborts the run.
  */
  const STATIC_DOCUMENT = /\.(js|css|md|json|map|txt|woff2?|ttf|eot|otf|svg|png|jpe?g|gif|ico|webp)$/;
  const tripwire = (url) => {
    const path = new URL(url).pathname.toLowerCase();
    if (STATIC_DOCUMENT.test(path)) return [];
    return FORBIDDEN.filter((w) => path.includes(w));
  };

  for (const [, name, url] of TARGETS) {
    const hits = tripwire(url);
    if (hits.length) {
      console.error(`ABORTED before any request. Target "${name}" matches denylist: ${hits.join(', ')}`);
      console.error(url);
      return;
    }
  }

  const toB64 = (buf) => {
    let s = '';
    const b = new Uint8Array(buf);
    for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return btoa(s);
  };

  const out = {
    tool: 'ptr-fetch-static.js',
    closes: 'Tier 1 of docs/reference/evidence-gap-register.md',
    capturedAt: new Date().toISOString(),
    pageUrl: location.href,
    userAgent: navigator.userAgent,
    cver: CVER,
    cverSource,
    /* An honest note about what this run can and cannot see, recorded IN the output so the file
       is self-describing when someone opens it in six months. */
    roleNote: (() => {
      const loggedIn = !!document.querySelector('[ng-show="login.isLoggedIn"]:not(.ng-hide)');
      return loggedIn
        ? 'Page reports a LOGGED-IN session (an [ng-show="login.isLoggedIn"] element is not ng-hide).'
        : 'Page reports LOGGED-OUT or the marker was not found. Static assets below are public, so this should not matter — but if any 401/403 appears, that is why.';
    })(),
    assets: []
  };

  console.log(`[ptr-fetch-static] ${TARGETS.length} targets, denylist clean. Starting.`);

  for (const [gapId, name, url, kind] of TARGETS) {
    try {
      const res = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
      if (!res.ok) {
        out.assets.push({ gapId, name, url, ok: false, status: res.status, note: 'HTTP error — recorded as an honest gap, not retried with a guessed path' });
        console.warn(`  ${res.status}  ${name}`);
        continue;
      }
      const buf = await res.arrayBuffer();

      /*
        SOFT-404 GUARD — this server answers missing files with HTTP **200** and a 52-byte body:
            <h3>this is not the page you are looking for...</h3>
        `res.ok` is therefore TRUE for a file that does not exist. Without this check the run
        records a successful capture of a 404 page and the gap looks closed when it is not.
        Found the hard way: the glyphicons webfont, the room's styles.<hash>.css and its
        main.<hash>.js all came back "200" this way.

        Checked on the BYTES, not on Content-Type — the server labels these with the content type
        of whatever was asked for, so a .woff2 404 arrives as font/woff2.
      */
      const SOFT_404 = 'this is not the page you are looking for';
      if (buf.byteLength < 4096) {
        const peek = new TextDecoder('utf-8', { fatal: false }).decode(buf).toLowerCase();
        if (peek.includes(SOFT_404)) {
          out.assets.push({
            gapId, name, url, ok: false, status: res.status, bytes: buf.byteLength,
            note: 'SOFT 404 — server returned HTTP 200 with its "not the page you are looking for" body. The asset is NOT deployed at this path. Recorded as an honest gap; do NOT treat as fetched.'
          });
          console.warn(`  soft-404  ${name}  (HTTP ${res.status}, ${buf.byteLength}B)`);
          continue;
        }
      }

      const digest = await crypto.subtle.digest('SHA-256', buf);
      const sha256 = [...new Uint8Array(digest)].map((x) => x.toString(16).padStart(2, '0')).join('');
      const rec = {
        gapId,
        name,
        url,
        ok: true,
        status: res.status,
        bytes: buf.byteLength,
        contentType: res.headers.get('content-type'),
        sha256
      };
      if (kind === 'text') rec.text = new TextDecoder().decode(buf);
      else rec.base64 = toB64(buf);
      out.assets.push(rec);
      console.log(`  ok ${String(buf.byteLength).padStart(9)}  ${name}`);
    } catch (err) {
      out.assets.push({ gapId, name, url, ok: false, error: String(err) });
      console.warn(`  ERR ${name}: ${err}`);
    }
  }

  const okCount = out.assets.filter((a) => a.ok).length;
  out.summary = `${okCount}/${TARGETS.length} fetched. Missing ones are recorded above with their status — they are honest gaps, not to be filled in by hand.`;
  console.log(`[ptr-fetch-static] ${out.summary}`);

  const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ptr-static-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
  console.log('[ptr-fetch-static] downloaded. Nothing was clicked, changed or sent.');
})();
