/* =============================================================================================
 * PTR DUMP NOW — paste into the DevTools console. It downloads. That is all.
 *
 * No waiting, no actions to perform, no Network-tab fiddling. Works logged in as a member, a
 * presenter or an admin — it captures whatever that role can see and writes the role's observed
 * capabilities into the file so the two are comparable.
 * ============================================================================================= */

(() => {
  const STYLE_PROPS = [
    'display',
    'visibility',
    'opacity',
    'position',
    'z-index',
    'overflow',
    'overflow-y',
    'width',
    'height',
    'min-height',
    'max-height',
    'flex',
    'flex-direction',
    'align-items',
    'justify-content',
    'gap',
    'margin',
    'padding',
    'border',
    'border-radius',
    'border-color',
    'color',
    'background-color',
    'background-image',
    'font-family',
    'font-size',
    'font-weight',
    'line-height',
    'text-align',
    'white-space',
    'animation',
    'transform',
    'box-shadow',
    'filter'
  ];

  const dump = {
    meta: {
      capturedAt: new Date().toISOString(),
      href: location.href,
      title: document.title,
      userAgent: navigator.userAgent,
      viewport: { w: innerWidth, h: innerHeight, dpr: devicePixelRatio },
      capabilities: {
        postAlert: !!document.querySelector('a i.fa-plus-circle, [title*="Post Alert" i]'),
        screenShare: !!document.querySelector('[title*="Screen Sharing" i]'),
        recording: !!document.querySelector('[title*="Recording" i]'),
        microphone: !!document.querySelector('[title*="Microphone" i]'),
        webcam: !!document.querySelector('[title*="WebCam" i]'),
        sessionControl: !!document.querySelector('[title*="Session Control" i]')
      }
    },
    nodes: [],
    extracted: {},
    stylesheets: [],
    globals: {}
  };
  dump.meta.roleGuess =
    dump.meta.capabilities.postAlert || dump.meta.capabilities.screenShare
      ? 'presenter-or-admin'
      : 'member';

  /* ------------------------------------------------------------------ every node, with styles -- */
  for (const el of document.querySelectorAll('*')) {
    let rect = null;
    const style = {};
    try {
      const r = el.getBoundingClientRect();
      rect = {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height)
      };
      const cs = getComputedStyle(el);
      for (const p of STYLE_PROPS) style[p] = cs.getPropertyValue(p);
    } catch {}
    const attrs = {};
    for (const a of el.attributes || []) attrs[a.name] = a.value;
    const text = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.nodeValue.trim())
      .filter(Boolean)
      .join(' ');
    dump.nodes.push({
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      class: typeof el.className === 'string' && el.className ? el.className : undefined,
      text: text || undefined,
      rect,
      attrs,
      style
    });
  }

  /* --------------------------------------------------------------- the surfaces that matter --- */
  const all = (sel, fn) => [...document.querySelectorAll(sel)].map(fn);
  dump.extracted = {
    screenTabs: all('#screenTabs li.nav-item', (li) => ({
      outerHTML: li.outerHTML,
      label: li.querySelector('span.mx-1')?.textContent ?? null,
      anchorId: li.querySelector('a.nav-link')?.id ?? null,
      ariaControls: li.querySelector('a.nav-link')?.getAttribute('aria-controls') ?? null,
      ariaSelected: li.querySelector('a.nav-link')?.getAttribute('aria-selected') ?? null,
      tabindex: li.querySelector('a.nav-link')?.getAttribute('tabindex') ?? null,
      classes: li.querySelector('a.nav-link')?.className ?? null,
      hasEyeBadge: !!li.querySelector('i.fa-eye'),
      eyeTooltip: li.querySelector('[tooltip]')?.getAttribute('tooltip') ?? null,
      avatar: li.querySelector('img.presenter-img')?.getAttribute('src') ?? null,
      menuItems: [...li.querySelectorAll('.dropdown-item')].map((a) => a.textContent.trim()),
      menuOpen: !!li.querySelector('.dropdown-menu.show')
    })),
    // The exact class string on every Q&A button — this is what settles the flashing question.
    alertQaButtons: all('button.alert-qa', (b) => ({
      class: b.className,
      text: b.textContent.trim(),
      inlineStyle: b.getAttribute('style'),
      isFlashing: b.classList.contains('btn-danger') && b.classList.contains('flash')
    })),
    videos: all('video', (v) => ({
      id: v.id,
      class: v.className,
      hasSrcObject: !!v.srcObject,
      videoWidth: v.videoWidth,
      videoHeight: v.videoHeight,
      paused: v.paused
    })),
    audios: all('audio', (a) => ({ id: a.id, hasSrcObject: !!a.srcObject })),
    navbar: all('#navbarsRoom li.nav-item', (li) => ({
      title: li.getAttribute('title'),
      text: li.textContent.trim().slice(0, 60)
    })),
    roster: all('.room-roster li, .active-room-users li', (li) =>
      li.textContent.trim().slice(0, 140)
    ),
    mainTabs: all('#mainTabs a, #screens-tab, #notes-tab, #files-tab', (a) => ({
      id: a.id,
      class: a.className,
      text: a.textContent.trim()
    })),
    openModals: all('.modal.show', (m) => ({
      id: m.id,
      class: m.className,
      title: m.querySelector('.modal-title')?.textContent?.trim() ?? null,
      outerHTML: m.outerHTML.slice(0, 20000)
    }))
  };

  /* ------------------------------------------------------------------------------ stylesheets -- */
  for (const sheet of document.styleSheets) {
    try {
      dump.stylesheets.push({
        href: sheet.href,
        ruleCount: sheet.cssRules?.length ?? 0,
        cssVars: (() => {
          const out = {};
          try {
            const root = getComputedStyle(document.documentElement);
            for (const rule of sheet.cssRules || []) {
              if (rule.style) {
                for (const prop of rule.style) {
                  if (prop.startsWith('--')) out[prop] = root.getPropertyValue(prop).trim();
                }
              }
            }
          } catch {}
          return out;
        })()
      });
    } catch (e) {
      dump.stylesheets.push({ href: sheet.href, crossOrigin: true, error: String(e) });
    }
  }

  /* ------------------------------------------------------ anything the app left on the window -- */
  for (const key of Object.keys(globalThis)) {
    try {
      const v = globalThis[key];
      if (typeof v === 'function' && /image|screen|download|room|alert|media/i.test(key)) {
        dump.globals[key] = 'function';
      }
    } catch {}
  }

  /* ----------------------------------------------------------------------------------- write -- */
  const name = `ptr-dump-${dump.meta.roleGuess}-${Date.now()}.json`;
  const blob = new Blob([JSON.stringify(dump)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);

  console.log(
    `%c[PTR] ${name} — ${(blob.size / 1048576).toFixed(1)} MB · ${dump.nodes.length} nodes · ` +
      `${dump.extracted.screenTabs.length} screen tabs · ${dump.extracted.alertQaButtons.length} Q&A buttons`,
    'color:#0a0;font-weight:bold'
  );
})();
