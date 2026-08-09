/* ============================================================================
 * Login page DESIGN extraction — paste into the DevTools console.
 *
 * capture-room-login.js dumps elements. This does the opposite job: it reads the
 * rendered page and derives the DESIGN — the palette, the type scale, the spacing
 * ladder, the radii, the shadows, the layout skeleton, the stacking order — and
 * writes a Markdown spec you can build from, plus the raw JSON behind it.
 *
 * The difference matters. An element dump tells you node #47 has
 * `color: rgb(41,161,182)`. This tells you the page has ONE accent colour, used on
 * input values only, covering 0.4% of the painted area — which is the thing you
 * actually reimplement.
 *
 * Everything is measured from the live render. Nothing is inferred from class
 * names: a class that looks like styling but computes to nothing (this codebase
 * has several) contributes nothing here, correctly.
 *
 * ⚠ Read-only. No clicks, no submits, no DOM mutation at all.
 *
 * Usage: paste, enter. Type `allow pasting` first if Chrome blocks it.
 *        Two files download: a .md spec and a .json.
 *
 * Optional raster: __LOGIN_DESIGN.shoot() injects html2canvas from a CDN. It is
 * OFF by default and deliberately not automatic — pulling a third-party script
 * into a page holding a session token is the same risk this project flagged in
 * the room's own JSONP geolocation call. DevTools' built-in
 * "Capture full size screenshot" (Cmd+Shift+P) is higher fidelity and zero risk.
 * ========================================================================== */

(() => {
  'use strict';

  const log = (...a) => console.log('%c[design]', 'color:#0d6efd;font-weight:700', ...a);
  const ROOT = document.querySelector('app-root') || document.body;
  const els = [ROOT, ...ROOT.querySelectorAll('*')].filter(
    (el) => !['SCRIPT', 'STYLE', 'LINK', 'META'].includes(el.tagName)
  );

  const sel = (el) => {
    if (el.id) return `#${el.id}`;
    const cls = String(el.className || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .filter((c) => !/^ng-|^_ngcontent|^_nghost/.test(c))
      .slice(0, 3);
    return el.tagName.toLowerCase() + (cls.length ? '.' + cls.join('.') : '');
  };

  const data = els.map((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      el,
      cs,
      r,
      area: r.width * r.height,
      sel: sel(el),
      visible: r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.opacity !== '0'
    };
  });
  const painted = data.filter((d) => d.visible);
  const totalArea = painted.reduce((s, d) => s + d.area, 0) || 1;

  /* ---------------------------------------------------------------- inventories */
  function tally(pick, { areaWeighted = false, skip = [] } = {}) {
    const m = new Map();
    for (const d of painted) {
      const v = pick(d.cs, d);
      if (!v || skip.includes(v)) continue;
      const e = m.get(v) ?? { count: 0, area: 0, where: [] };
      e.count++;
      e.area += d.area;
      if (e.where.length < 6) e.where.push(d.sel);
      m.set(v, e);
    }
    return [...m.entries()].sort((a, b) => (areaWeighted ? b[1].area - a[1].area : b[1].count - a[1].count));
  }

  const TRANSPARENT = ['rgba(0, 0, 0, 0)', 'transparent', 'none'];

  const palette = {
    background: tally((cs) => cs.backgroundColor, { areaWeighted: true, skip: TRANSPARENT }),
    text: tally((cs, d) => (d.el.textContent.trim() ? cs.color : null)),
    border: tally(
      (cs) => {
        const w = ['top', 'right', 'bottom', 'left'].some(
          (s) => parseFloat(cs[`border${s[0].toUpperCase()}${s.slice(1)}Width`]) > 0
        );
        return w ? cs.borderTopColor : null;
      },
      { skip: TRANSPARENT }
    )
  };

  const typography = tally((cs, d) =>
    d.el.textContent.trim()
      ? `${cs.fontSize} / ${cs.lineHeight} · ${cs.fontWeight} · ${cs.fontStyle} · ${cs.letterSpacing} · ${cs.fontFamily.split(',')[0].replace(/["']/g, '')}`
      : null
  );

  const spacing = (() => {
    const m = new Map();
    for (const d of painted)
      for (const p of [
        'marginTop',
        'marginRight',
        'marginBottom',
        'marginLeft',
        'paddingTop',
        'paddingRight',
        'paddingBottom',
        'paddingLeft',
        'gap',
        'rowGap',
        'columnGap'
      ]) {
        const v = d.cs[p];
        if (!v || v === '0px' || v === 'normal' || v === 'auto') continue;
        const e = m.get(v) ?? { count: 0, props: new Set() };
        e.count++;
        e.props.add(p.replace(/[A-Z].*/, ''));
        m.set(v, e);
      }
    return [...m.entries()].sort((a, b) => b[1].count - a[1].count);
  })();

  const radii = tally((cs) => (cs.borderTopLeftRadius !== '0px' ? cs.borderTopLeftRadius : null));
  const shadows = tally((cs) => (cs.boxShadow !== 'none' ? cs.boxShadow : null));
  const zIndex = painted.filter((d) => d.cs.zIndex !== 'auto').sort((a, b) => +b.cs.zIndex - +a.cs.zIndex);

  /* ------------------------------------------------------------------- layout */
  const layout = painted
    .filter((d) => d.area / totalArea > 0.002)
    .sort((a, b) => b.area - a.area)
    .slice(0, 40)
    .map((d) => ({
      selector: d.sel,
      rect: { x: +d.r.x.toFixed(1), y: +d.r.y.toFixed(1), w: +d.r.width.toFixed(1), h: +d.r.height.toFixed(1) },
      display: d.cs.display,
      position: d.cs.position,
      flow: d.cs.display.includes('flex')
        ? `flex ${d.cs.flexDirection} / ${d.cs.justifyContent} / ${d.cs.alignItems}`
        : d.cs.display.includes('grid')
          ? `grid ${d.cs.gridTemplateColumns}`
          : d.cs.float !== 'none'
            ? `float ${d.cs.float}`
            : 'block flow',
      box: `${d.cs.paddingTop} ${d.cs.paddingRight} ${d.cs.paddingBottom} ${d.cs.paddingLeft} pad · ${d.cs.marginTop} ${d.cs.marginRight} ${d.cs.marginBottom} ${d.cs.marginLeft} margin`,
      bg: d.cs.backgroundColor,
      centred: Math.abs(d.r.x + d.r.width / 2 - innerWidth / 2) < 2
    }));

  /* the vertical rhythm: distinct top edges of painted boxes */
  const rhythm = [...new Set(painted.filter((d) => d.area / totalArea > 0.0005).map((d) => Math.round(d.r.top)))].sort(
    (a, b) => a - b
  );
  const gaps = rhythm
    .slice(1)
    .map((y, i) => y - rhythm[i])
    .filter((g) => g > 0);

  /* --------------------------------------------------------- matching CSS rules */
  function matchingRules() {
    const out = new Map();
    for (const ss of document.styleSheets) {
      let rules;
      try {
        rules = ss.cssRules;
      } catch {
        continue;
      }
      (function rec(list, media) {
        for (const r of list) {
          if (!r.selectorText && r.cssRules) {
            rec(r.cssRules, r.conditionText || media);
            continue;
          }
          if (!r.selectorText) continue;
          for (const d of painted) {
            let hit = false;
            try {
              hit = d.el.matches(r.selectorText.replace(/::?[a-z-]+(\([^)]*\))?/g, ''));
            } catch {}
            if (!hit) continue;
            const k = d.sel;
            const e = out.get(k) ?? [];
            if (e.length < 12)
              e.push({ selector: r.selectorText, media: media || null, css: r.style.cssText.slice(0, 240) });
            out.set(k, e);
          }
        }
      })(rules, '');
    }
    return out;
  }

  /**
   * AUTHORED component CSS — the rules the developer wrote, recovered by stripping
   * Angular's [_ngcontent-*] / [_nghost-*] scope guards.
   *
   * This is the highest-value thing on the page and the easiest to walk past: the
   * capture had it all along and nothing was reading it. Computed style tells you
   * what one node ended up with; these tell you the intent, the :hover/:focus/:active
   * states no screenshot can show, and selectors for UI this configuration never
   * rendered.
   */
  const componentCss = (() => {
    const SCOPE = /\[_ng(?:content|host)-([a-zA-Z0-9-]+)\]/;
    const byScope = {};
    for (const ss of document.styleSheets) {
      let rules;
      try {
        rules = ss.cssRules;
      } catch {
        continue;
      }
      (function rec(list) {
        for (const r of list) {
          if (!r.selectorText && r.cssRules) {
            rec(r.cssRules);
            continue;
          }
          if (!r.selectorText || !SCOPE.test(r.selectorText)) continue;
          const id = SCOPE.exec(r.selectorText)[1];
          const authored = r.selectorText
            .replace(/\[_nghost-[a-zA-Z0-9-]+\]/g, ':host')
            .replace(/\[_ngcontent-[a-zA-Z0-9-]+\]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          (byScope[id] ??= []).push({ selector: authored, css: r.style.cssText });
        }
      })(rules);
    }
    // Angular can emit the same sheet twice; dedupe on selector+body.
    for (const id of Object.keys(byScope)) {
      const seen = new Set();
      byScope[id] = byScope[id].filter((r) => {
        const k = r.selector + '|' + r.css;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }
    return byScope;
  })();

  const mediaQueries = (() => {
    const out = [];
    for (const ss of document.styleSheets) {
      let rules;
      try {
        rules = ss.cssRules;
      } catch {
        continue;
      }
      for (const r of rules)
        if (r.type === CSSRule.MEDIA_RULE) {
          const q = r.conditionText || r.media.mediaText;
          out.push({ query: q, active: matchMedia(q).matches, ruleCount: r.cssRules.length });
        }
    }
    return out;
  })();

  const customProps = (() => {
    const cs = getComputedStyle(document.documentElement),
      o = {},
      pairs = {};
    for (let i = 0; i < cs.length; i++) {
      const p = cs[i];
      if (!p.startsWith('--')) continue;
      o[p] = cs.getPropertyValue(p).trim();
      const m = /^--(light|dark)Theme-(.+)$/.exec(p);
      if (m) (pairs[m[2]] ??= {})[m[1]] = o[p];
    }
    return { all: o, pairs, count: Object.keys(o).length };
  })();

  /* ------------------------------------------------------------------ markdown */
  const pct = (a) => ((a / totalArea) * 100).toFixed(1) + '%';
  const md = [];
  md.push(`# Login page — design specification`, '');
  md.push(`Derived from the live render at ${location.href}`);
  md.push(`${innerWidth}×${innerHeight} CSS px @dpr${devicePixelRatio} · ${new Date().toISOString()}`, '');
  md.push(`${els.length} elements, ${painted.length} painted. Everything below is measured from`);
  md.push(`computed style — class names that compute to nothing contribute nothing.`, '');

  md.push(
    '## Palette',
    '',
    '### Backgrounds (by painted area)',
    '',
    '| Colour | Area | Uses | Seen on |',
    '|---|---|---|---|'
  );
  for (const [c, e] of palette.background.slice(0, 12))
    md.push(`| \`${c}\` | ${pct(e.area)} | ${e.count} | ${e.where.join(', ')} |`);
  md.push('', '### Text colours', '', '| Colour | Uses | Seen on |', '|---|---|---|');
  for (const [c, e] of palette.text.slice(0, 12)) md.push(`| \`${c}\` | ${e.count} | ${e.where.join(', ')} |`);
  md.push('', '### Border colours', '', '| Colour | Uses | Seen on |', '|---|---|---|');
  for (const [c, e] of palette.border.slice(0, 10)) md.push(`| \`${c}\` | ${e.count} | ${e.where.join(', ')} |`);

  md.push(
    '',
    '## Type scale',
    '',
    '| size / line-height · weight · style · tracking · family | Uses | Seen on |',
    '|---|---|---|'
  );
  for (const [t, e] of typography.slice(0, 16)) md.push(`| ${t} | ${e.count} | ${e.where.join(', ')} |`);

  md.push('', '## Spacing ladder', '', '| Value | Uses | Properties |', '|---|---|---|');
  for (const [v, e] of spacing.slice(0, 18)) md.push(`| \`${v}\` | ${e.count} | ${[...e.props].join(', ')} |`);

  md.push('', '## Radii', '', '| Value | Uses | Seen on |', '|---|---|---|');
  for (const [v, e] of radii.slice(0, 10)) md.push(`| \`${v}\` | ${e.count} | ${e.where.join(', ')} |`);
  md.push('', '## Shadows', '', '| Value | Uses | Seen on |', '|---|---|---|');
  for (const [v, e] of shadows.slice(0, 8)) md.push(`| \`${v}\` | ${e.count} | ${e.where.join(', ')} |`);

  md.push('', '## Stacking order', '');
  if (zIndex.length) {
    md.push('| z-index | Element | position |', '|---|---|---|');
    for (const d of zIndex.slice(0, 12)) md.push(`| ${d.cs.zIndex} | \`${d.sel}\` | ${d.cs.position} |`);
  } else md.push('_No element declares a z-index. The page is a single stacking context._');

  md.push('', '## Layout skeleton', '', '| Element | Rect (x,y,w,h) | Flow | Box | Centred |', '|---|---|---|---|---|');
  for (const l of layout)
    md.push(
      `| \`${l.selector}\` | ${l.rect.x}, ${l.rect.y}, ${l.rect.w}, ${l.rect.h} | ${l.flow} | ${l.box} | ${l.centred ? '✓' : ''} |`
    );

  md.push('', '## Vertical rhythm', '');
  md.push(`Distinct top edges: ${rhythm.length}. Gaps between consecutive edges, most common first:`, '');
  const gapTally = [...gaps.reduce((m, g) => m.set(g, (m.get(g) ?? 0) + 1), new Map())]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  md.push('| Gap | Occurrences |', '|---|---|');
  for (const [g, n] of gapTally) md.push(`| ${g}px | ${n} |`);

  const scopes = Object.keys(componentCss);
  md.push('', '## Authored component CSS', '');
  if (scopes.length) {
    const total = scopes.reduce((n, id) => n + componentCss[id].length, 0);
    md.push(`${total} rules across ${scopes.length} component scope(s), with Angular's scope`);
    md.push('guards stripped — i.e. the stylesheet as written, not as computed.', '');
    for (const id of scopes) {
      md.push(`### scope \`${id}\` — ${componentCss[id].length} rules`, '', '```css');
      for (const r of componentCss[id]) md.push(`${r.selector} { ${r.css} }`);
      md.push('```', '');
    }
    const states = scopes.flatMap((id) =>
      componentCss[id].filter((r) => /:(hover|focus|active|disabled|checked)/.test(r.selector))
    );
    if (states.length) {
      md.push(`**${states.length} interaction-state rule(s)** — these cannot be observed from a`);
      md.push('screenshot or from computed style, because the state never occurs during capture:', '');
      for (const r of states) md.push(`- \`${r.selector}\` → ${r.css}`);
      md.push('');
    }
  } else {
    md.push('_No Angular-scoped component CSS — expected on a non-Angular page._');
  }

  md.push('', '## Breakpoints', '');
  if (mediaQueries.length) {
    md.push('| Query | Active now | Rules |', '|---|---|---|');
    for (const q of mediaQueries.slice(0, 30)) md.push(`| \`${q.query}\` | ${q.active ? '✓' : ''} | ${q.ruleCount} |`);
  } else md.push('_No @media rules reachable (all stylesheets CORS-blocked, or none defined)._');

  md.push('', `## Design tokens (${customProps.count} custom properties)`, '');
  const pairKeys = Object.keys(customProps.pairs);
  if (pairKeys.length) {
    md.push(
      `**${pairKeys.length} light/dark pairs.** This page has two themes.`,
      '',
      '| Token | Light | Dark |',
      '|---|---|---|'
    );
    for (const k of pairKeys.sort())
      md.push(`| \`${k}\` | \`${customProps.pairs[k].light ?? '—'}\` | \`${customProps.pairs[k].dark ?? '—'}\` |`);
  } else md.push('_No paired theme tokens._');

  const mdText = md.join('\n') + '\n';

  /* -------------------------------------------------------------------- output */
  function download(name, text, type) {
    const b = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    log(`downloaded ${name} — ${(b.size / 1024).toFixed(0)} KB`);
  }

  const json = {
    capturedAt: new Date().toISOString(),
    url: location.href,
    viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
    counts: { elements: els.length, painted: painted.length },
    palette: {
      background: palette.background.map(([c, e]) => ({
        colour: c,
        areaPct: +((e.area / totalArea) * 100).toFixed(2),
        count: e.count,
        where: e.where
      })),
      text: palette.text.map(([c, e]) => ({ colour: c, count: e.count, where: e.where })),
      border: palette.border.map(([c, e]) => ({ colour: c, count: e.count, where: e.where }))
    },
    typography: typography.map(([t, e]) => ({ spec: t, count: e.count, where: e.where })),
    spacing: spacing.map(([v, e]) => ({ value: v, count: e.count, props: [...e.props] })),
    radii: radii.map(([v, e]) => ({ value: v, count: e.count, where: e.where })),
    shadows: shadows.map(([v, e]) => ({ value: v, count: e.count, where: e.where })),
    stacking: zIndex.map((d) => ({ z: d.cs.zIndex, selector: d.sel, position: d.cs.position })),
    layout,
    rhythm,
    mediaQueries,
    customProperties: customProps,
    componentCss,
    matchingRules: Object.fromEntries(matchingRules())
  };

  const stamp = Date.now();
  download(`login-design-${stamp}.md`, mdText, 'text/markdown');
  download(`login-design-${stamp}.json`, JSON.stringify(json), 'application/json');

  log(`authored component rules: ${Object.values(componentCss).reduce((n, a) => n + a.length, 0)}`);
  log(
    `${painted.length} painted elements · ${palette.background.length} backgrounds · ${typography.length} type styles · ${spacing.length} spacing values · ${customProps.count} tokens`
  );
  console.log(mdText.slice(0, 3000) + (mdText.length > 3000 ? '\n… full spec in the downloaded .md' : ''));

  window.__LOGIN_DESIGN = {
    json,
    markdown: mdText,
    /** Optional raster. Injects html2canvas from a CDN — opt-in, see header. */
    async shoot() {
      if (!window.html2canvas) {
        await new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          s.onload = res;
          s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      const canvas = await window.html2canvas(document.body, { scale: devicePixelRatio, logging: false });
      canvas.toBlob((b) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(b);
        a.download = `login-render-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        log('raster downloaded — note html2canvas RE-RENDERS the DOM, it is not a true screenshot');
      });
    }
  };
  return { painted: painted.length, tokens: customProps.count };
})();
