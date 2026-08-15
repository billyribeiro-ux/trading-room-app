/*
  collect-app-versions.js — what v3, v4 and v5 actually ARE.

  Paste into the Chrome console on the LIVE protradingroom app, logged in as anything. It downloads
  one JSON and needs no follow-up step.

  ## The question this answers

  `useV3` / `useV4` / `useV5` are checkboxes in the reference's own "DON'T TOUCH These below unless
  you know what you are doing..." block, and its v5 label reads `Use v5? (DON'T!)`. Their MEANING is
  in no evidence this repository holds:

    - `main.d6d3c112b59b7d0d.js`, all 2,887,876 bytes: **0** occurrences of useV3/useV4/useV5.
      Control: `sessData` matched in the same file by the same method.
    - `services/**`: 0 occurrences including snake_case. Control: 80 files matched a must-exist
      pattern.

  So the version is chosen BEFORE the client loads, and the bundle we hold is one specific version
  with no version-switching logic in it at all.

  The lead this script follows is the one property that names a version path —
  `full.js:1925`:

      roomV4Link = window.location.href.replace('.com/', '.com/v3/')

  A `/v3/` URL prefix. If each version is served under its own prefix, fetching each prefix's
  index and hashing the bundles it references settles what the three versions are, and whether we
  hold one of them.

  ## SAFETY — this script only READS

  Every request is a GET. It clicks NOTHING, submits NOTHING, and never touches the DON'T TOUCH
  block, whose warning is explicit that turning those on breaks the room. It changes no setting and
  posts no data. If a prefix does not exist it records that as an honest gap rather than inventing
  a result.

  ## What comes back

  For each of `/`, `/v3/`, `/v4/`, `/v5/`: whether it responded, its index HTML's byte count and
  SHA-256, every script/stylesheet it references, and the byte count and SHA-256 of each of those.
  Then a comparison against the hashes this repository already holds, so "we already have this one"
  is answered rather than guessed.
*/

(async () => {
  /** The version prefixes to probe. `''` is the site as currently served. */
  const PREFIXES = ['', 'v3', 'v4', 'v5'];

  /*
    What `apps/room/docs/source/README.md` records, so the report can say which version we hold
    instead of leaving that to a later manual diff. Byte counts are included because a matching
    size with a different hash is a far more interesting result than neither matching.
  */
  const KNOWN = {
    '1d9e55b58075b78ec61a389c672aa40d7d2ccd691621562461bcda0ff5fdc850': {
      name: 'main.d6d3c112b59b7d0d.js',
      bytes: 2887876
    },
    e24c0534fee07207c60dedbc48e7cb17298726b922bb56e2cc9e6f55c537c7cd: {
      name: 'scripts.38973a242454fb27.js',
      bytes: 774566
    },
    '2779452ed0d9088b4730ba342f85a5ac1bc548a77dcfd751059212aa2d16e7ba': {
      name: 'polyfills.95db17d6d6f4b89d.js',
      bytes: 35480
    },
    f7a9f182dd4f63c790f8037c4db63a0472733aa1faa02f33a22ee4d9c1816e52: {
      name: 'runtime.b70e5d3ff558bfdf.js',
      bytes: 1239
    },
    '0f9482210ab4e57898b2a11979dcd37c299d9f4e05e4f8910c6115e46a6a8ffa': {
      name: 'styles.d622cb9ed2bbc221.css',
      bytes: 444545
    },
    '7afd09a14bd8fb904f662508c8e4c0777aa7fa69fbcc2a608978399a40171fc9': {
      name: 'deployed-index.html',
      bytes: 16094
    }
  };

  async function sha256(buffer) {
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * One GET, reported rather than thrown.
   *
   * A prefix that does not exist is a RESULT — it says the versions are not served that way — so a
   * failure here is recorded with its reason instead of aborting the run.
   */
  async function fetchAsset(url) {
    try {
      const response = await fetch(url, { credentials: 'include', redirect: 'follow' });
      if (!response.ok) {
        return { url, ok: false, status: response.status, reason: `HTTP ${response.status}` };
      }
      const buffer = await response.arrayBuffer();
      const hash = await sha256(buffer);
      const known = KNOWN[hash];
      return {
        url,
        ok: true,
        status: response.status,
        finalUrl: response.url,
        bytes: buffer.byteLength,
        sha256: hash,
        contentType: response.headers.get('content-type'),
        weAlreadyHold: known ? known.name : null,
        buffer
      };
    } catch (cause) {
      return { url, ok: false, reason: String(cause && cause.message ? cause.message : cause) };
    }
  }

  /** Every script/stylesheet an index page references, resolved to absolute URLs. */
  function referencedAssets(html, baseUrl) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const urls = new Set();
    for (const el of doc.querySelectorAll('script[src]')) {
      urls.add(new URL(el.getAttribute('src'), baseUrl).href);
    }
    for (const el of doc.querySelectorAll('link[rel="stylesheet"][href]')) {
      urls.add(new URL(el.getAttribute('href'), baseUrl).href);
    }
    return [...urls];
  }

  const origin = location.origin;
  const report = {
    tool: 'collect-app-versions',
    capturedAt: new Date().toISOString(),
    origin,
    href: location.href,
    /*
      Recorded because the answer may differ by role, and a capture that does not say who took it
      cannot be compared with one that does. Read from what is on screen, not asserted.
    */
    role: {
      hasAdminNav: Boolean(document.querySelector('[href*="manage"], [ng-click*="manage"]')),
      bodyClasses: document.body ? document.body.className : null,
      note: 'Presence is a hint, not proof. The prefixes below are fetched with credentials either way.'
    },
    versions: {},
    gaps: [],
    summary: {}
  };

  for (const prefix of PREFIXES) {
    const label = prefix === '' ? 'current' : prefix;
    const base = prefix === '' ? `${origin}/` : `${origin}/${prefix}/`;

    const index = await fetchAsset(base);
    if (!index.ok) {
      report.versions[label] = { base, served: false, reason: index.reason };
      report.gaps.push(`${label}: ${base} did not serve an index (${index.reason})`);
      continue;
    }

    const html = new TextDecoder().decode(index.buffer);
    delete index.buffer;

    const assetUrls = referencedAssets(html, base);
    const assets = [];
    for (const url of assetUrls) {
      const asset = await fetchAsset(url);
      delete asset.buffer;
      assets.push(asset);
      if (!asset.ok) report.gaps.push(`${label}: ${url} — ${asset.reason}`);
    }

    report.versions[label] = {
      base,
      served: true,
      finalUrl: index.finalUrl,
      /*
        A prefix that silently redirects to the site root is NOT a distinct version, and saying so
        here stops four identical hashes being read as four versions.
      */
      redirectedToRoot: prefix !== '' && !index.finalUrl.includes(`/${prefix}`),
      index: {
        bytes: index.bytes,
        sha256: index.sha256,
        weAlreadyHold: index.weAlreadyHold
      },
      assets
    };
  }

  /* Which distinct bundle sets exist, and whether ours is one of them. */
  const served = Object.entries(report.versions).filter(([, v]) => v.served);
  report.summary = {
    prefixesServed: served.map(([k]) => k),
    prefixesMissing: Object.entries(report.versions)
      .filter(([, v]) => !v.served)
      .map(([k]) => k),
    distinctIndexHashes: [...new Set(served.map(([, v]) => v.index.sha256))].length,
    matchesWeHold: served
      .flatMap(([label, v]) =>
        [
          v.index.weAlreadyHold ? `${label}: index → ${v.index.weAlreadyHold}` : null,
          ...v.assets.map((a) => (a.weAlreadyHold ? `${label}: ${a.weAlreadyHold}` : null))
        ].filter(Boolean)
      )
      .sort(),
    readThisFirst:
      'distinctIndexHashes === 1 means the prefixes are NOT different versions and the question ' +
      'is answered a different way. Check redirectedToRoot on each before concluding anything.'
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `app-versions-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);

  console.log('[collect-app-versions] served:', report.summary.prefixesServed);
  console.log('[collect-app-versions] missing:', report.summary.prefixesMissing);
  console.log('[collect-app-versions] distinct index hashes:', report.summary.distinctIndexHashes);
  console.log('[collect-app-versions] already held:', report.summary.matchesWeHold);
  if (report.gaps.length) console.warn('[collect-app-versions] gaps:', report.gaps);
  console.log('[collect-app-versions] downloaded. Send me that JSON.');
})();
