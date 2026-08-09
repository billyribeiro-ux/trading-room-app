/*
  Fetch the controller's own application bundle, so `createNew()` can be READ instead of guessed.

  WHY THIS EXISTS
  ---------------
  Three captures prove the New Room control exists:

    login-page/logged-in-page:487
    login-page/login:465
    main-nav-login-clicked/file:487

  all carrying the identical anchor:

    <a type="button" ng-click="createNew()" class="btn btn btn-warning mb btn-block">New Room</a>

  None of them carries the function body. It lives in /public/dist/app.min.js, which is referenced
  by the page and is not on disk anywhere. Without it, one thing in particular is unknown: where a
  new room's NAME comes from. A bootbox prompt, a modal, a server default and a generated name are
  all plausible and they produce four different UIs, so the correct move is to read it rather than
  pick one.

  WHAT IT DOES
  ------------
  Pastes into the Chrome console on the live site while logged in, as member OR admin, and downloads
  a JSON containing the bundle text plus every region mentioning the handler.

  It is a GET of a public static asset. It clicks nothing, submits nothing, posts nothing and
  mutates nothing — see the denylist assertion below, which is why there is no click path at all.

  HOW TO RUN
  ----------
  1. Log in to the controller (either role).
  2. Open DevTools -> Console.
  3. Paste this whole file, press Enter.
  4. A JSON downloads on its own. No follow-up call, no terminal step.
*/

(async () => {
  'use strict';

  /* This collector never interacts with the page: it reads the DOM and fetches static assets. The
     denylist (click/submit/send/save/delete/upload/play/stop) is satisfied structurally — there is
     no code path here that touches a page control at all. The single `.click()` below is on an
     <a> this script creates, to trigger the download. */

  const out = {
    capturedAt: new Date().toISOString(),
    href: location.href,
    origin: location.origin,
    role: null,
    bundles: [],
    createNew: { found: false, regions: [] },
    related: {},
    gaps: []
  };

  /* Role, from what is actually on screen — recorded because a member and an admin may be served
     different bundles, and a claim about "the" bundle needs to say which session produced it. */
  const bodyText = document.body ? document.body.innerText : '';
  const hasManage = /\bManage\b/.test(bodyText);
  const hasAdminUsers = /Extra Admin Users/i.test(bodyText);
  out.role = hasAdminUsers ? 'account-owner/admin' : hasManage ? 'member-with-rooms' : 'unknown';
  out.roleEvidence = { hasManage, hasAdminUsers };

  /* Every same-origin script the page loaded. The handler is an AngularJS controller method, so it
     is in the app bundle rather than a vendor one — but all of them are listed, because deciding
     which is "the" bundle from its filename is the kind of assumption this repo does not make. */
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
    Pull a WIDE window around each mention, not a matched substring.

    A regex that extracts "the function" returns only what its author already expected the function
    to look like. 4000 characters either side is enough to carry the surrounding controller methods,
    which is where a shared prompt helper or a default name would actually live.
  */
  const WINDOW = 4000;
  for (const b of out.bundles) {
    if (!b.text) continue;
    let from = 0;
    for (;;) {
      const at = b.text.indexOf('createNew', from);
      if (at === -1) break;
      out.createNew.found = true;
      out.createNew.regions.push({
        bundle: b.url,
        offset: at,
        text: b.text.slice(Math.max(0, at - WINDOW), at + WINDOW)
      });
      from = at + 9;
    }
  }

  if (!out.createNew.found) {
    out.gaps.push('the string "createNew" does not occur in any same-origin bundle this page loads');
  }

  /* Neighbouring names worth having in the same file: whatever createNew calls is likely here. */
  for (const name of ['createSession', 'newRoom', 'bootbox.prompt', 'sessName', 'roomName', 'addSession']) {
    const hits = [];
    for (const b of out.bundles) {
      if (!b.text) continue;
      const at = b.text.indexOf(name);
      if (at !== -1) hits.push({ bundle: b.url, offset: at, text: b.text.slice(Math.max(0, at - 1500), at + 1500) });
    }
    out.related[name] = hits.length ? hits : 'not present';
  }

  /* The control's own markup, from the live DOM, so the download is self-contained. */
  const anchor = [...document.querySelectorAll('a,button')].find(
    (el) => (el.getAttribute('ng-click') || '').indexOf('createNew') !== -1
  );
  out.controlInDom = anchor
    ? {
        outerHTML: anchor.outerHTML,
        parentOuterHTML: anchor.parentElement ? anchor.parentElement.outerHTML : null,
        computed: (() => {
          const s = getComputedStyle(anchor);
          const o = {};
          for (const p of ['display', 'visibility', 'width', 'height', 'background-color', 'color', 'border', 'font-size', 'padding', 'margin']) {
            o[p] = s.getPropertyValue(p);
          }
          return o;
        })(),
        rect: anchor.getBoundingClientRect().toJSON()
      }
    : null;
  if (!out.controlInDom) {
    out.gaps.push(
      'the New Room anchor is not in this DOM — it sits behind ng-show="showNewRoom>=5"; click the word "Sessions" five times, then re-run'
    );
  }

  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `create-new-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click(); // downloads the file — the only click, and it is on an element this script made
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);

  console.log('[collect-create-new] role:', out.role);
  console.log('[collect-create-new] bundles fetched:', out.bundles.length);
  console.log('[collect-create-new] createNew regions:', out.createNew.regions.length);
  console.log('[collect-create-new] gaps:', out.gaps.length ? out.gaps : 'none');
})();
