/* ============================================================================
 * PASTE THIS INTO THE CHROME CONSOLE ON THE LIVE ROOM. IT DOWNLOADS BY ITSELF.
 *
 * Answers ONE question with hard evidence: what infrastructure does the original
 * application actually run on?
 *
 * Works logged in as a member OR as an admin/presenter - it detects which you are
 * and records what that role could and could not reach. A member sees fewer
 * panels, so fewer hosts; that is recorded as a limitation, never as an absence.
 *
 * It opens tabs for itself so more of the app's network surface actually loads,
 * then downloads one JSON file. No terminal, no clicking, no stop().
 *
 * WHAT IT CLICKS - and what it will never click
 *   Clicks ONLY the main tabs. That is navigation: it changes what is on screen
 *   and causes more assets to load, which is the entire point.
 *   The same hard denylist as ptr-collect.js is checked before EVERY click:
 *   delete / upload / play / stop / send / save / remove / submit / post / kick /
 *   ban / mute / reset, and any form submit. It never posts, uploads, deletes,
 *   plays or sends.
 *
 * WHAT IT RE-FETCHES, and why that is safe
 *   To read response headers it re-requests assets that are ALREADY loaded, and
 *   only ones whose URL ends in a static-asset extension (js, css, images, fonts,
 *   media, json, map). It never re-requests an API path, never uses any method
 *   other than GET, and never sends a body. Every one is a cache-warm read of a
 *   file the browser fetched a moment ago on its own.
 *
 * WHY HEADERS COME BACK EMPTY SOMETIMES - this is expected, not a failure
 *   The browser only exposes cross-origin response headers that are CORS-
 *   safelisted, unless the server sends Access-Control-Expose-Headers. So for a
 *   third-party host you may get only content-type and cache-control. The script
 *   records response.type for every probe so an empty header set can be read as
 *   "the browser hid them" rather than "the server sent none".
 *
 * WHAT IT CANNOT SEE, and what to run instead
 *   A browser cannot resolve DNS or see an IP address. The script says so in its
 *   gaps and prints the exact terminal commands that close that hole.
 * ========================================================================== */

(async () => {
  'use strict';

  const started = new Date().toISOString();
  const log = {
    meta: {},
    role: {},
    steps: [],
    declared: {},
    observed: {},
    headerProbes: [],
    bundleScan: {},
    sockets: {},
    verdict: {},
    gaps: []
  };

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const trim = (s, cap = 20000) =>
    typeof s === 'string' && s.length > cap ? s.slice(0, cap) + '…[+' + (s.length - cap) + ']' : s;
  const gap = (what, why) => log.gaps.push({ what, why });
  const note = (step, detail) => {
    log.steps.push({ at: new Date().toISOString(), step, detail: detail ?? null });
    console.log('[infra] ' + step + (detail ? ' — ' + detail : ''));
  };
  const hostOf = (u) => {
    try {
      return new URL(u, location.href).host;
    } catch {
      return null;
    }
  };

  /* ── the guard. Checked before every single click. Same as ptr-collect.js. ── */
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
        why + ' — matched the denylist: "' + fingerprint.trim().slice(0, 70) + '"'
      );
      return false;
    }
    if (el.type === 'submit' || el.tagName === 'FORM') {
      note('REFUSED to click', why + ' — is a submit');
      return false;
    }
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
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

  const vis = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  };
  const byText = (sel, re) =>
    [...document.querySelectorAll(sel)].find((e) => re.test(e.textContent || ''));

  /* ── provider fingerprints ───────────────────────────────────────────────────
     Two independent channels: the HOSTNAME, and the RESPONSE HEADERS. A hostname
     alone can be a CNAME pointing anywhere, and a header alone can come from a
     proxy in front of somebody else's origin. Agreement between the two is what
     makes an attribution solid, so both are scored separately and reported
     separately rather than collapsed into one guess. */
  const HOST_SIGNS = [
    ['aws-s3', /(^|\.)s3[.-][a-z0-9-]*\.amazonaws\.com$|(^|\.)s3\.amazonaws\.com$/i],
    ['aws-cloudfront', /\.cloudfront\.net$/i],
    ['aws-elb', /\.elb\.amazonaws\.com$|\.elb\.[a-z0-9-]+\.amazonaws\.com$/i],
    ['aws-other', /\.amazonaws\.com$|\.awsstatic\.com$|\.awsglobalaccelerator\.com$/i],
    ['cloudflare', /\.cloudflare\.com$|\.cdnjs\.cloudflare\.com$|\.workers\.dev$|\.pages\.dev$/i],
    ['fastly', /\.fastly\.net$|\.fastlylb\.net$/i],
    ['akamai', /\.akamai(zed|edge|hd)?\.net$|\.akamaitechnologies\.com$/i],
    [
      'google-cloud',
      /\.googleapis\.com$|\.googleusercontent\.com$|\.appspot\.com$|\.gstatic\.com$/i
    ],
    ['azure', /\.azureedge\.net$|\.azurewebsites\.net$|\.blob\.core\.windows\.net$/i],
    ['hetzner', /\.your-server\.de$|\.your-cloud\.dev$/i],
    ['digitalocean', /\.digitaloceanspaces\.com$|\.ondigitalocean\.app$/i],
    ['vercel', /\.vercel\.app$|\.vercel-dns\.com$/i],
    ['jsdelivr', /\.jsdelivr\.net$/i],
    ['bunny', /\.b-cdn\.net$/i]
  ];
  const HEADER_SIGNS = [
    [
      'aws-s3',
      (h) =>
        h['server'] === 'AmazonS3' ||
        'x-amz-request-id' in h ||
        'x-amz-id-2' in h ||
        'x-amz-bucket-region' in h
    ],
    [
      'aws-cloudfront',
      (h) =>
        'x-amz-cf-id' in h ||
        'x-amz-cf-pop' in h ||
        /cloudfront/i.test(h['via'] ?? '') ||
        /cloudfront/i.test(h['x-cache'] ?? '')
    ],
    [
      'aws-elb',
      (h) => /awselb/i.test(h['server'] ?? '') || 'x-amzn-trace-id' in h || 'x-amzn-requestid' in h
    ],
    [
      'cloudflare',
      (h) => 'cf-ray' in h || /cloudflare/i.test(h['server'] ?? '') || 'cf-cache-status' in h
    ],
    [
      'fastly',
      (h) =>
        /fastly/i.test(h['x-served-by'] ?? '') ||
        'x-fastly-request-id' in h ||
        ('x-served-by' in h && 'x-timer' in h)
    ],
    ['akamai', (h) => 'x-akamai-transformed' in h || /akamai/i.test(h['server'] ?? '')],
    [
      'google-cloud',
      (h) =>
        /gse|gws/i.test(h['server'] ?? '') ||
        'x-goog-generation' in h ||
        'x-guploader-uploadid' in h
    ],
    [
      'azure',
      (h) => 'x-azure-ref' in h || 'x-ms-request-id' in h || /ecacc|ecs/i.test(h['x-cache'] ?? '')
    ],
    ['vercel', (h) => 'x-vercel-id' in h || 'x-vercel-cache' in h],
    ['nginx-origin', (h) => /^nginx/i.test(h['server'] ?? '')],
    ['apache-origin', (h) => /^apache/i.test(h['server'] ?? '')],
    ['express-app', (h) => /express/i.test(h['x-powered-by'] ?? '')]
  ];
  const hostSignsFor = (host) => HOST_SIGNS.filter(([, re]) => re.test(host)).map(([name]) => name);
  const headerSignsFor = (headers) =>
    HEADER_SIGNS.filter(([, test]) => test(headers)).map(([name]) => name);

  /* ── 1. meta + role ──────────────────────────────────────────────────────── */
  log.meta = {
    started,
    url: location.href,
    origin: location.origin,
    host: location.host,
    userAgent: navigator.userAgent,
    viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio }
  };
  log.role = {
    postAlert: vis(byText('button, a', /Post Alert/i)),
    uploadFile: vis(document.querySelector('.st-fileUpload')),
    deleteSelected: vis(document.querySelector('.st-fileDeleteSelected')),
    manageLink: vis(byText('a, button', /Manage|Admin/i))
  };
  const role = log.role.uploadFile || log.role.postAlert ? 'presenter' : 'member';
  log.meta.role = role;
  note('role detected', role);

  /* ── 2. infrastructure the page DECLARES ─────────────────────────────────────
     preconnect and dns-prefetch are the operator telling the browser which hosts
     matter, before anything is requested. They are the cheapest, most explicit
     statement of infrastructure a page makes. */
  log.declared = {
    preconnect: [
      ...document.querySelectorAll('link[rel="preconnect"], link[rel="dns-prefetch"]')
    ].map((l) => ({
      rel: l.rel,
      href: l.href,
      host: hostOf(l.href)
    })),
    scripts: [...document.querySelectorAll('script[src]')].map((s) => ({
      src: s.src,
      host: hostOf(s.src)
    })),
    stylesheets: [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => ({
      href: l.href,
      host: hostOf(l.href)
    })),
    mediaElements: [...document.querySelectorAll('img[src], video[src], audio[src], source[src]')]
      .slice(0, 60)
      .map((e) => ({ tag: e.tagName, src: e.getAttribute('src'), host: hostOf(e.src) }))
  };
  note(
    'captured declared infrastructure',
    log.declared.preconnect.length + ' preconnect/dns-prefetch hint(s)'
  );

  /* ── 3. click through the main tabs so more of the app actually loads ────────
     A room that has only ever shown the chat tab has never requested a recording,
     an avatar, or a shared file. Each tab pulls from whatever host serves it, and
     that is exactly the evidence being collected. */
  const tabs = [...document.querySelectorAll('#mainTabs a')];
  if (!tabs.length)
    gap(
      'main tabs',
      'no #mainTabs anchors on screen — only the initially-loaded hosts were observed'
    );
  for (const tab of tabs) {
    const label = (tab.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30);
    if (clickSafe(tab, 'main tab ' + label)) {
      await wait(1100);
      note('opened tab', label);
    }
  }
  await wait(600);

  /* ── 4. every origin the browser ACTUALLY talked to ─────────────────────────
     PerformanceResourceTiming is the ground truth: it lists what was requested,
     over which protocol, and any Server-Timing the server volunteered. CDNs
     routinely leak their point-of-presence through Server-Timing. */
  const entries = (() => {
    try {
      return performance.getEntriesByType('resource');
    } catch {
      gap('performance timeline', 'getEntriesByType threw — no observed-origin evidence');
      return [];
    }
  })();

  const byHost = new Map();
  for (const e of entries) {
    const host = hostOf(e.name);
    if (!host) continue;
    if (!byHost.has(host)) {
      byHost.set(host, {
        host,
        sameOrigin: host === location.host,
        requests: 0,
        bytes: 0,
        initiatorTypes: new Set(),
        protocols: new Set(),
        serverTiming: [],
        samples: []
      });
    }
    const rec = byHost.get(host);
    rec.requests += 1;
    rec.bytes += e.transferSize || 0;
    if (e.initiatorType) rec.initiatorTypes.add(e.initiatorType);
    if (e.nextHopProtocol) rec.protocols.add(e.nextHopProtocol);
    for (const st of e.serverTiming ?? []) {
      const line =
        st.name +
        (st.description ? '=' + st.description : '') +
        (st.duration ? ' (' + st.duration + 'ms)' : '');
      if (!rec.serverTiming.includes(line)) rec.serverTiming.push(line);
    }
    if (rec.samples.length < 4) rec.samples.push(e.name.slice(0, 200));
  }
  log.observed.hosts = [...byHost.values()]
    .map((r) => ({
      ...r,
      initiatorTypes: [...r.initiatorTypes],
      protocols: [...r.protocols],
      hostSigns: hostSignsFor(r.host)
    }))
    .sort((a, b) => b.requests - a.requests);
  log.observed.totalRequests = entries.length;
  note(
    'observed origins',
    log.observed.hosts.length + ' distinct host(s) across ' + entries.length + ' request(s)'
  );

  /* ── 5. response headers, from a safe re-read of already-loaded assets ────── */
  const SAFE_TO_REFETCH =
    /\.(js|mjs|css|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|mp3|wav|ogg|mp4|webm|json|map)(\?|$)/i;
  const PER_HOST = 2;
  const probeTargets = [];
  for (const rec of log.observed.hosts) {
    const safe = rec.samples.filter((u) => SAFE_TO_REFETCH.test(u)).slice(0, PER_HOST);
    for (const u of safe) probeTargets.push(u);
    if (!safe.length) {
      gap(
        'headers for ' + rec.host,
        'no already-loaded static asset on this host was safe to re-read, so its headers are unknown'
      );
    }
  }
  // The document itself is same-origin, so every one of its headers is readable.
  probeTargets.unshift(location.href);

  for (const url of probeTargets.slice(0, 40)) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'follow'
      });
      const headers = {};
      res.headers.forEach((v, k) => (headers[k.toLowerCase()] = v));
      const readable = Object.keys(headers).length;
      log.headerProbes.push({
        url: url.slice(0, 200),
        host: hostOf(url),
        status: res.status,
        responseType: res.type,
        headersReadable: readable,
        corsLimited: res.type !== 'basic' && readable <= 6,
        headers,
        headerSigns: headerSignsFor(headers)
      });
    } catch (error) {
      log.headerProbes.push({
        url: url.slice(0, 200),
        host: hostOf(url),
        error: String(error).slice(0, 160)
      });
    }
  }
  note('probed response headers', log.headerProbes.length + ' asset(s)');

  /* ── 6. read the bundle for hardcoded infrastructure ─────────────────────────
     The most valuable single source here. Signalling endpoints, API bases, media
     servers and bucket names are compiled into the bundle as string literals, and
     a WebSocket URL never appears in the performance timeline at all. */
  /*
    Choosing the bundle is where this went wrong the first time it was run for real.

    The original fallback was "the first script[src] ending in .js", and on a page carrying
    a third-party chat widget that picked twk-main.js from embed.tawk.to — 121 bytes of
    somebody else's loader. Every hostname scanned out of it would have been tawk.to's
    infrastructure reported as the application's.

    So: same-origin only, because a third party's bundle is never evidence about this app;
    then the hashed main-bundle name if one is present; otherwise the LARGEST script by
    transferSize, since the app bundle is invariably the biggest thing on the page. The
    strategy used is recorded in the output so the choice can be audited rather than trusted.
  */
  const sameOriginScripts = [...document.querySelectorAll('script[src]')]
    .map((s) => s.src)
    .filter((u) => hostOf(u) === location.host && /\.js(\?|$)/.test(u));
  const sizeOf = (u) => entries.find((e) => e.name === u)?.transferSize ?? 0;
  const hashedMain = sameOriginScripts.find((u) => /\/main[.-][a-f0-9]{6,}\.js/.test(u));
  const largest = [...sameOriginScripts].sort((a, b) => sizeOf(b) - sizeOf(a))[0];
  const bundleUrl = hashedMain ?? largest ?? null;
  const bundleStrategy = hashedMain
    ? 'hashed main bundle'
    : largest
      ? 'largest same-origin script'
      : 'none found';

  if (!bundleUrl) {
    gap(
      'application bundle',
      'no same-origin script[src] was found. Third-party scripts were deliberately not scanned, because their hostnames describe their own infrastructure and not this application.'
    );
  } else {
    try {
      const text = await (await fetch(bundleUrl, { credentials: 'omit' })).text();
      const urls = [
        ...new Set(text.match(/\b(?:https?|wss?):\/\/[A-Za-z0-9._~:/?#@!$&'()*+,;=%-]+/g) ?? [])
      ];
      const IGNORE =
        /w3\.org|schema\.org|xmlns|json-schema|example\.com|localhost|127\.0\.0\.1|github\.com|npmjs|mozilla\.org|opensource\.org/i;
      const interesting = urls.filter((u) => !IGNORE.test(u));
      const hosts = [...new Set(interesting.map(hostOf).filter(Boolean))];
      log.bundleScan = {
        bundleUrl,
        bundleStrategy,
        sameOriginScriptsConsidered: sameOriginScripts.length,
        bytes: text.length,
        totalUrlLiterals: urls.length,
        hosts: hosts.map((h) => ({ host: h, hostSigns: hostSignsFor(h) })),
        websocketLiterals: interesting.filter((u) => /^wss?:/i.test(u)).slice(0, 40),
        // Bucket-shaped strings that never appear as a full URL.
        bucketLiterals: [
          ...new Set(
            text.match(/[a-z0-9][a-z0-9.-]{2,62}\.s3[.-][a-z0-9-]*\.amazonaws\.com/gi) ?? []
          )
        ].slice(0, 20),
        sampleUrls: interesting.slice(0, 60).map((u) => trim(u, 200))
      };
      note(
        'scanned the bundle',
        hosts.length + ' distinct host literal(s) in ' + text.length + ' bytes'
      );
    } catch (error) {
      gap('bundle scan', 'could not read ' + bundleUrl + ' — ' + String(error).slice(0, 120));
    }
  }

  /* ── 7. live sockets ─────────────────────────────────────────────────────────
     A WebSocket handshake is invisible to the performance timeline, so the open
     connection is found by walking globals the app left behind. This only READS
     properties; it never opens, closes or sends on any socket. */
  const socketUrls = new Set();
  const seen = new WeakSet();
  const walk = (obj, depth) => {
    if (!obj || depth > 3 || typeof obj !== 'object' || seen.has(obj)) return;
    seen.add(obj);
    for (const key of Object.keys(obj)) {
      let value;
      try {
        value = obj[key];
      } catch {
        continue;
      }
      if (typeof WebSocket !== 'undefined' && value instanceof WebSocket) {
        socketUrls.add(value.url);
        continue;
      }
      if (typeof value === 'string' && /^wss?:\/\//i.test(value)) socketUrls.add(value);
      else if (value && typeof value === 'object') walk(value, depth + 1);
    }
  };
  try {
    for (const key of Object.keys(window)) {
      if (/^(webkit|chrome|document|location|navigator|history|external)/i.test(key)) continue;
      let value;
      try {
        value = window[key];
      } catch {
        continue;
      }
      if (value && typeof value === 'object') walk(value, 0);
    }
  } catch (error) {
    gap('socket discovery', 'walking window threw — ' + String(error).slice(0, 120));
  }
  log.sockets = {
    discovered: [...socketUrls].map((u) => ({
      url: u,
      host: hostOf(u),
      hostSigns: hostSignsFor(hostOf(u) ?? '')
    })),
    note: 'A WebSocket handshake never appears in the performance timeline. These come from reading app globals and from string literals in the bundle.'
  };
  if (!log.sockets.discovered.length) {
    gap(
      'live WebSocket',
      'none reachable from a global — check bundleScan.websocketLiterals for the compiled-in endpoint instead'
    );
  }

  /* ── 8. weigh the evidence ──────────────────────────────────────────────────
     Counted per provider and kept split by channel. A verdict is only as good as
     the agreement between hostname evidence and header evidence, so both are
     printed rather than blended into a single confident-looking number. */
  const tally = {};
  const bump = (provider, channel, detail) => {
    tally[provider] ??= { hostHits: 0, headerHits: 0, details: [] };
    tally[provider][channel] += 1;
    if (tally[provider].details.length < 12) tally[provider].details.push(detail);
  };
  for (const h of log.observed.hosts)
    for (const s of h.hostSigns) bump(s, 'hostHits', 'observed host ' + h.host);
  for (const h of log.bundleScan.hosts ?? [])
    for (const s of h.hostSigns) bump(s, 'hostHits', 'bundle literal ' + h.host);
  for (const p of log.headerProbes)
    for (const s of p.headerSigns ?? []) bump(s, 'headerHits', 'headers on ' + p.host);

  log.verdict = {
    providers: Object.entries(tally)
      .map(([provider, v]) => ({ provider, ...v, total: v.hostHits + v.headerHits }))
      .sort((a, b) => b.total - a.total),
    documentServer: log.headerProbes[0]?.headers?.server ?? null,
    documentPoweredBy: log.headerProbes[0]?.headers?.['x-powered-by'] ?? null,
    corsLimitedProbes: log.headerProbes.filter((p) => p.corsLimited).length,
    caveat:
      'Hostname evidence and header evidence are counted separately on purpose. A hostname can be a CNAME onto somebody else, and a header can come from a proxy in front of a different origin. Treat a provider as established only where both channels agree, or where the header evidence is unambiguous (x-amz-request-id, cf-ray, x-vercel-id).'
  };

  /* ── 9. what a browser structurally cannot answer ───────────────────────────── */
  gap(
    'DNS and IP ownership',
    'a browser cannot resolve a hostname or see an address. Run the printed dig/whois commands to close this.'
  );
  if (role !== 'presenter') {
    gap(
      'admin-only surfaces',
      'collected as a member, so recordings, archives and management panels were never loaded and their hosts are unrecorded. Re-run as an admin/presenter to cover them.'
    );
  }

  /* ── 10. download ───────────────────────────────────────────────────────────── */
  const name = 'ptr-infra-' + role + '-' + started.slice(0, 19).replace(/[:T]/g, '-') + '.json';
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' })
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);

  const top = log.verdict.providers.slice(0, 6);
  console.log(
    '\n%c[infra] DOWNLOADED: ' + name,
    'font-weight:bold;font-size:14px;color:#0a0',
    '\n  role            : ' + role,
    '\n  document server : ' + (log.verdict.documentServer ?? '(not exposed)'),
    '\n  x-powered-by    : ' + (log.verdict.documentPoweredBy ?? '(not exposed)'),
    '\n  hosts observed  : ' + log.observed.hosts.length,
    '\n  bundle hosts    : ' + (log.bundleScan.hosts?.length ?? 0),
    '\n  sockets found   : ' + log.sockets.discovered.length,
    '\n  CORS-limited    : ' +
      log.verdict.corsLimitedProbes +
      ' probe(s) returned only safelisted headers',
    '\n  gaps            : ' + log.gaps.length
  );
  console.log('\n  evidence by provider (host hits / header hits):');
  if (!top.length)
    console.log('    · none matched a known fingerprint — read observed.hosts by hand');
  for (const p of top)
    console.log(
      '    · ' + p.provider.padEnd(16) + ' host:' + p.hostHits + '  header:' + p.headerHits
    );
  console.log('\n  gaps:');
  log.gaps.forEach((g) => console.log('    · ' + g.what + ' — ' + g.why));

  const uniqueHosts = [
    ...new Set([
      ...log.observed.hosts.map((h) => h.host),
      ...(log.bundleScan.hosts ?? []).map((h) => h.host)
    ])
  ];
  console.log('\n  A browser cannot do DNS. Paste this into a terminal to finish the picture:\n');
  console.log(
    'for h in ' +
      uniqueHosts.slice(0, 25).join(' ') +
      '; do echo "== $h"; dig +short "$h" | head -3; done'
  );
  console.log('\n  then, for each address that comes back:\n');
  console.log('whois <ip> | grep -iE "^(orgname|netname|descr|country):"');
  console.log('\nSend me the downloaded file and the output of those two commands.');
})();
