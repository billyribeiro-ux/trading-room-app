/**
 * The home surface's motion engine — one module, one GSAP registration, one reduced-motion policy.
 *
 * Every animated element on `/` gets its behavior from here as a Svelte attachment, so the rules
 * hold everywhere at once:
 *
 * 1. SSR stays clean. Attachments only run in the browser, and the plugin registration below is
 *    window-guarded, so importing this module during server rendering is inert.
 * 2. Reduced motion is a contract, not a suggestion. Every attachment checks
 *    `prefers-reduced-motion` FIRST and returns a no-op, leaving the server-rendered layout —
 *    which is always the complete, final composition — untouched. Content is never hidden by a
 *    motion style that motion then fails to remove.
 * 3. Everything cleans up. Each attachment returns a teardown that kills its tweens and
 *    ScrollTriggers, so client-side navigation away from `/` leaves no orphaned observers.
 */
import { gsap } from 'gsap';
/*
  DEFAULT IMPORTS, NOT NAMED ONES — and this took the home page down for hours.

  BOTH specifiers needed it, which the first fix got wrong by fixing only one. Repairing
  `gsap/ScrollTrigger` alone simply moved the crash one line up:

    SyntaxError: Named export 'gsap' not found. The requested module 'gsap' is a CommonJS module…

  And the interop form was still not enough, because the problem was never HOW the module is
  imported — it is WHICH FILE Node resolves. With richer logging in place, production finally said
  it plainly:

    Cannot use import statement outside a module
    /var/task/node_modules/.pnpm/gsap@3.15.0/node_modules/gsap/index.js:1
    import { gsap, ... } from "./gsap-core.js";

  gsap 3.15's `index.js` is written in ESM but the package declares no `"type": "module"`, so Node
  loads it as CommonJS and fails on its first line. That file is only usable through a bundler. On
  this machine Vite bundles it and everything works; in the deployed function gsap is EXTERNAL and
  Node reads it directly.

  So the specifiers below point at the `dist/` builds, which ARE real CommonJS and are explicitly
  exported by the package (`"./dist/*.js": "./dist/*.js"`). Node loads them natively and a bundler
  handles them equally well. Three attempts, each fixing something true and insufficient:
  the subpath named import, then the root named import, then the file itself.

  `import { ScrollTrigger } from 'gsap/ScrollTrigger'` threw at module instantiation inside the
  Vercel function, so EVERY request to `/` answered 500 while every other route stayed healthy:

    SyntaxError: Named export 'ScrollTrigger' not found. The requested module
    'gsap/ScrollTrigger' is a CommonJS module, which may not support all module.exports as named
    exports. CommonJS modules can always be imported via the default export, for example using:
      import pkg from 'gsap/ScrollTrigger';

  gsap 3.15's exports map `./*` to `./*.js` for `import` and `./dist/*.js` for `require`, and the
  package declares no `"type": "module"`. Locally Node resolves the ESM file and the named import
  works — verified — which is exactly why this passed `svelte-check`, 564 unit tests, a clean
  `vite build` AND a production build served from `vite preview` on this machine. In the deployed
  function it resolves to the CommonJS build instead, and a named import of a CJS module is a
  syntax error before a single line of guarded code runs.

  The form below is the one Node's own error message prescribes, and it holds under BOTH
  resolutions: the default is the plugin in the ESM build and `module.exports` in the CJS one, so
  taking `.ScrollTrigger` off it when present covers both.

  The window guard below is NOT what makes this safe. An ESM import is instantiated before any
  statement in this module executes, so guarding `registerPlugin` never protected server rendering
  from the import itself — the comment above this module says SSR is inert, and that was true of
  the registration and untrue of the import. Keeping GSAP out of the server module graph entirely,
  with a browser-only dynamic import, is the structural fix and is recorded in `TODO.md`.
*/
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Attachment } from 'svelte/attachments';

/*
  Verified against each build explicitly, so neither line is a guess:

    gsap/dist/gsap.js          (CJS) -> default -> object with `.gsap` and `.to`
    gsap/dist/ScrollTrigger.js (CJS) -> default -> function ScrollTrigger
    gsap/ScrollTrigger.js      (ESM) -> default -> function ScrollTrigger
*/
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export { gsap, ScrollTrigger };

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const NOOP: Attachment = () => undefined;

export interface RevealOptions {
  /** Vertical travel in px. */
  y?: number;
  /** Seconds. */
  duration?: number;
  /** Seconds before the tween starts once triggered. */
  delay?: number;
  /** Selector for children to stagger instead of animating the node as one block. */
  children?: string;
  /** Seconds between staggered children. */
  stagger?: number;
}

/**
 * Scroll-triggered entrance. The node (or its `children` matches) rises and fades in the first
 * time it enters the viewport.
 */
export function reveal(options: RevealOptions = {}): Attachment {
  if (prefersReducedMotion()) return NOOP;
  const { y = 30, duration = 1.1, delay = 0, children, stagger = 0.09 } = options;

  return (node) => {
    const element = node as HTMLElement;
    const targets: Element[] = children ? Array.from(element.querySelectorAll(children)) : [element];
    if (targets.length === 0) return undefined;

    // opacity, never autoAlpha: visibility:hidden would drop the content out of the accessibility
    // tree and tab order until the visual scroll fires the trigger. Screen readers and keyboard
    // users get the whole document; only the paint is deferred.
    gsap.set(targets, { opacity: 0, y });
    const tween = gsap.to(targets, {
      opacity: 1,
      y: 0,
      duration,
      delay,
      stagger,
      ease: 'power3.out',
      scrollTrigger: { trigger: element, start: 'top 82%', once: true }
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(targets, { clearProps: 'all' });
    };
  };
}

/**
 * Scroll-scrubbed parallax drift between `from` and `to` (px) across the node's viewport transit.
 */
export function parallax(from: number, to: number): Attachment {
  if (prefersReducedMotion()) return NOOP;

  return (node) => {
    const tween = gsap.fromTo(
      node,
      { y: from },
      {
        y: to,
        ease: 'none',
        scrollTrigger: { trigger: node, start: 'top bottom', end: 'bottom top', scrub: 0.6 }
      }
    );

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(node, { clearProps: 'transform' });
    };
  };
}

/**
 * Magnetic pull for primary controls: the element leans toward a fine pointer and springs home
 * when it leaves. Touch devices and reduced motion get the plain element.
 */
export function magnetic(strength = 0.28): Attachment {
  if (prefersReducedMotion()) return NOOP;
  if (typeof window !== 'undefined' && !window.matchMedia('(pointer: fine)').matches) return NOOP;

  return (node) => {
    const element = node as HTMLElement;
    const xTo = gsap.quickTo(element, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(element, 'y', { duration: 0.5, ease: 'power3.out' });

    function onMove(event: MouseEvent) {
      const rect = element.getBoundingClientRect();
      xTo((event.clientX - rect.left - rect.width / 2) * strength);
      yTo((event.clientY - rect.top - rect.height / 2) * strength);
    }

    function onLeave() {
      xTo(0);
      yTo(0);
    }

    element.addEventListener('mousemove', onMove);
    element.addEventListener('mouseleave', onLeave);

    return () => {
      element.removeEventListener('mousemove', onMove);
      element.removeEventListener('mouseleave', onLeave);
      // quickTo keeps a persistent paused tween per axis; kill both or they outlive the element.
      xTo.tween.kill();
      yTo.tween.kill();
      gsap.set(element, { clearProps: 'transform' });
    };
  };
}

/**
 * Split a headline into per-character spans for the cinematic rise, preserving accessibility:
 * the original text becomes the element's `aria-label`, the spans are presentation only.
 * Returns the spans; the caller owns their animation. Under reduced motion nothing is touched.
 */
export function splitChars(element: HTMLElement): HTMLElement[] {
  // Preserve the authored line structure: a rebuild that dropped <br> re-wrapped the headline at
  // hydration on some widths — a visible layout shift. Lines are captured first, then rebuilt with
  // the same breaks.
  const lines: string[] = [];
  let current = '';
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeName === 'BR') {
      lines.push(current);
      current = '';
    } else {
      current += node.textContent ?? '';
    }
  }
  lines.push(current);
  const cleaned = lines.map((line) => line.replace(/\s+/g, ' ').trim()).filter((line) => line.length > 0);

  element.setAttribute('aria-label', cleaned.join(' '));
  element.textContent = '';

  const spans: HTMLElement[] = [];
  cleaned.forEach((line, lineIndex) => {
    if (lineIndex > 0) element.appendChild(document.createElement('br'));
    for (const word of line.split(' ')) {
      const wordSpan = document.createElement('span');
      wordSpan.className = 'hc-word';
      wordSpan.setAttribute('aria-hidden', 'true');
      for (const char of word) {
        const charSpan = document.createElement('span');
        charSpan.className = 'hc-char';
        charSpan.textContent = char;
        wordSpan.appendChild(charSpan);
        spans.push(charSpan);
      }
      element.appendChild(wordSpan);
      element.appendChild(document.createTextNode(' '));
    }
  });
  return spans;
}
