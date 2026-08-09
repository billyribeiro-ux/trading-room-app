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
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Attachment } from 'svelte/attachments';

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

const SCRAMBLE_GLYPHS = '01▮▯$+-%#≠≈';

/**
 * Terminal-style decode: the node's text resolves left to right out of market noise when it
 * scrolls into view. Attach only to `aria-hidden` spans — the accessible copy stays static.
 */
export function scramble(finalText: string): Attachment {
  if (prefersReducedMotion()) return NOOP;

  return (node) => {
    const element = node as HTMLElement;
    const progress = { value: 0 };

    const tween = gsap.to(progress, {
      value: 1,
      duration: 1.15,
      ease: 'power2.inOut',
      scrollTrigger: { trigger: element, start: 'top 88%', once: true },
      onUpdate: () => {
        const settled = Math.floor(progress.value * finalText.length);
        let text = finalText.slice(0, settled);
        for (let i = settled; i < finalText.length; i += 1) {
          const glyph = SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];
          text += finalText[i] === ' ' ? ' ' : glyph;
        }
        element.textContent = text;
      },
      onComplete: () => {
        element.textContent = finalText;
      }
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      element.textContent = finalText;
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
  // Markup whitespace (template indentation, <br>) collapses to single spaces; without this the
  // split would emit whitespace-only spans that render as visible gaps.
  const text = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  element.setAttribute('aria-label', text);
  element.textContent = '';

  const spans: HTMLElement[] = [];
  for (const word of text.split(' ')) {
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
  return spans;
}
