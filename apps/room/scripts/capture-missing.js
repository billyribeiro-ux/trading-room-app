/* ============================================================================
 * Gap capture — paste into the Chrome DevTools console on the LIVE room.
 *
 * This targets the three things the existing dumps do not contain, and NOTHING
 * else. It is deliberately not a general capture harness; scripts/capture-ptr-
 * reference.js already does that and produced 58 states + a full DOM freeze.
 *
 * WHAT IS MISSING, and why each item is here
 * ------------------------------------------------------------------------
 *  1. A POPULATED "Pre-Canned Polls" list.
 *     app-modals/app-poll-modal captured the panel OPEN, but `#savedPolls` was
 *     `class="tab-pane"` (not active) with `<ul class="list-group"></ul>` —
 *     EMPTY. The tenant had zero saved polls, so the row template never
 *     rendered. Consequence: the saved-poll row markup and its delete control
 *     have no evidence anywhere in 72 MB + 17 MB + 32 MB of dumps.
 *
 *  2. The WIRE FORMAT.
 *     second-dump/decoded/10-gaps/honest-gaps.json states plainly that the
 *     captures contain "no network/WebSocket payloads". Every dump is DOM only.
 *     So how savePoll / deleteSavedPoll / sendPoll actually talk to the server
 *     — paths, methods, bodies, the anonymous flag on the wire — is unknown.
 *
 *  3. The ANONYMOUS flag end to end.
 *     `#anonymous-poll` exists in the panel, but `polls` has no column for it
 *     and `poll_responses.member_id` is NOT NULL. Whether the flag reaches the
 *     server, and under what key, is unproven.
 *
 * NOT captured, on purpose: styles, themes, fonts, geometry, unrelated modals,
 * the roster, alerts, chat. All of that is already covered.
 *
 * ⚠ SAFETY
 *   This script NEVER clicks, submits, saves or deletes. It only:
 *     • wraps fetch / XHR / WebSocket to OBSERVE traffic you generate yourself
 *     • toggles Bootstrap's own `.active` / `.show` classes, which is pure CSS
 *   Every mutation is reverted in a finally block, and the originals are
 *   restored on stop(). You perform the actions; it records them.
 *
 * USAGE
 *   1. Log in as a PRESENTER (a member cannot open the poll panel).
 *   2. DevTools → Console. If Chrome blocks the paste, type `allow pasting`.
 *   3. Paste this file. It arms and waits.
 *   4. Open the Polls panel. Create a poll, tick "Anonymous Poll", press
 *      "Save To Canned". Do it twice so the list has more than one row.
 *   5. Open the "Pre-Canned Polls" tab so the rows render.
 *   6. Delete one saved poll — this is the control that has no evidence.
 *   7. Run  __ptrGaps.stop()  to snapshot and download.
 * ========================================================================== */

(() => {
  'use strict';

  if (window.__ptrGaps) {
    console.warn('[gaps] already armed — run __ptrGaps.stop() first');
    return;
  }

  /* Only traffic that could plausibly be a poll operation is recorded. A blanket
     recorder would sweep up chat, presence and media signalling, which are large
     and already understood. */
  const RELEVANT = /poll|canned|saved/i;
  const BODY_CAP = 20000;

  const log = { requests: [], sockets: [], dom: {}, notes: [] };
  const started = new Date().toISOString();

  const trim = (s) =>
    typeof s === 'string' && s.length > BODY_CAP
      ? s.slice(0, BODY_CAP) + `…[+${s.length - BODY_CAP}]`
      : s;

  /* ── 1. fetch ────────────────────────────────────────────────────────── */
  const realFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : (input?.url ?? String(input));
    const method = init?.method ?? (typeof input === 'object' ? input?.method : 'GET') ?? 'GET';
    const response = await realFetch.apply(this, arguments);

    if (RELEVANT.test(url)) {
      let body = null;
      try {
        body = trim(await response.clone().text());
      } catch {
        body = '[unreadable]';
      }
      log.requests.push({
        kind: 'fetch',
        at: new Date().toISOString(),
        method,
        url,
        requestBody: trim(
          typeof init?.body === 'string' ? init.body : init?.body ? '[non-string body]' : null
        ),
        status: response.status,
        responseBody: body
      });
    }
    return response;
  };

  /* ── 2. XMLHttpRequest — AngularJS $http uses this, not fetch ─────────── */
  const realOpen = XMLHttpRequest.prototype.open;
  const realSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__gap = { method, url };
    return realOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function (body) {
    const meta = this.__gap;
    if (meta && RELEVANT.test(meta.url)) {
      this.addEventListener('load', () => {
        log.requests.push({
          kind: 'xhr',
          at: new Date().toISOString(),
          method: meta.method,
          url: meta.url,
          requestBody: trim(typeof body === 'string' ? body : body ? '[non-string body]' : null),
          status: this.status,
          responseBody: trim(this.responseText)
        });
      });
    }
    return realSend.apply(this, arguments);
  };

  /* ── 3. WebSocket — the realtime channel, never captured before ───────── */
  const RealWS = window.WebSocket;
  function GapWS(url, protocols) {
    const socket = protocols === undefined ? new RealWS(url) : new RealWS(url, protocols);
    const entry = { url: String(url), opened: new Date().toISOString(), frames: [] };
    log.sockets.push(entry);

    socket.addEventListener('message', (event) => {
      const data = typeof event.data === 'string' ? event.data : '[binary]';
      if (RELEVANT.test(data))
        entry.frames.push({ dir: 'in', at: new Date().toISOString(), data: trim(data) });
    });

    const realSocketSend = socket.send.bind(socket);
    socket.send = (data) => {
      const text = typeof data === 'string' ? data : '[binary]';
      if (RELEVANT.test(text))
        entry.frames.push({ dir: 'out', at: new Date().toISOString(), data: trim(text) });
      return realSocketSend(data);
    };
    return socket;
  }
  GapWS.prototype = RealWS.prototype;
  Object.assign(GapWS, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
  window.WebSocket = GapWS;

  /* ── 4. DOM snapshot of the saved-poll list, taken on stop() ──────────── */
  function snapshotSavedPolls() {
    const panel = document.querySelector('#savedPolls');
    if (!panel) {
      log.notes.push('#savedPolls not in the DOM — open the Polls panel before stopping');
      return;
    }

    /* The tab is inactive until clicked. `.active` is Bootstrap's own class and
       toggling it renders no differently from the user clicking the tab, but it
       is reverted below regardless. */
    const wasActive = panel.classList.contains('active');
    try {
      if (!wasActive) panel.classList.add('active');

      const list = panel.querySelector('.list-group');
      const rows = list ? [...list.children] : [];

      log.dom.savedPolls = {
        tabWasAlreadyActive: wasActive,
        panelOuterHTML: panel.outerHTML,
        rowCount: rows.length,
        /* The row template is the missing artefact. Every attribute is kept:
           the delete control's handler is the whole point. */
        rows: rows.map((row) => ({
          outerHTML: row.outerHTML,
          text: row.textContent.replace(/\s+/g, ' ').trim(),
          controls: [...row.querySelectorAll('a,button,i,[ng-click],[data-target]')].map((el) => ({
            tag: el.tagName.toLowerCase(),
            attrs: Object.fromEntries([...el.attributes].map((a) => [a.name, a.value])),
            text: el.textContent.replace(/\s+/g, ' ').trim()
          }))
        }))
      };

      if (rows.length === 0) {
        log.notes.push(
          'list-group is EMPTY — save a poll with "Save To Canned" first, then stop()'
        );
      }
    } finally {
      if (!wasActive) panel.classList.remove('active');
    }

    /* The anonymous checkbox, so its name/id/state is on the record next to the
       wire payload that may or may not carry it. */
    const anon = document.querySelector('#anonymous-poll');
    if (anon) {
      log.dom.anonymousCheckbox = {
        attrs: Object.fromEntries([...anon.attributes].map((a) => [a.name, a.value])),
        checked: anon.checked
      };
    }
  }

  /* ── 5. stop, snapshot, restore, download ─────────────────────────────── */
  function stop() {
    try {
      snapshotSavedPolls();
    } finally {
      window.fetch = realFetch;
      XMLHttpRequest.prototype.open = realOpen;
      XMLHttpRequest.prototype.send = realSend;
      window.WebSocket = RealWS;
      delete window.__ptrGaps;
    }

    const payload = {
      capture: 'missing-gaps',
      targets: ['saved-poll rows + delete control', 'wire format', 'anonymous flag'],
      startedAt: started,
      stoppedAt: new Date().toISOString(),
      href: location.href,
      ...log
    };

    const name = `ptr-gaps-${Date.now()}.json`;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);

    console.log(
      `[gaps] ${name}\n` +
        `  requests : ${log.requests.length}\n` +
        `  sockets  : ${log.sockets.length} (${log.sockets.reduce((n, s) => n + s.frames.length, 0)} frames)\n` +
        `  rows     : ${log.dom.savedPolls?.rowCount ?? 'n/a'}\n` +
        (log.notes.length ? `  notes    : ${log.notes.join(' | ')}` : '')
    );
    return payload;
  }

  window.__ptrGaps = { stop, log };
  console.log(
    '[gaps] armed. Nothing is clicked for you.\n' +
      '  1. Open the Polls panel\n' +
      '  2. Create a poll, tick "Anonymous Poll", press "Save To Canned" (twice)\n' +
      '  3. Open the "Pre-Canned Polls" tab\n' +
      '  4. Delete one saved poll\n' +
      '  5. __ptrGaps.stop()'
  );
})();
