<script lang="ts">
  /**
   * The opening shot. A full-viewport composition in four layers, back to front:
   *
   *   1. CSS aurora + perspective grid — always present, so the hero is complete with WebGL off,
   *      with JavaScript off, and under prefers-reduced-motion.
   *   2. The Threlte candlestick field — loaded dynamically only after a successful WebGL probe,
   *      paused whenever the hero scrolls offscreen.
   *   3. The copy: eyebrow, split-character headline, sub, CTAs, capability chips.
   *   4. The simulated tape marquee pinned to the hero's floor, labeled as simulated.
   *
   * Server-side rendering emits the finished layout; the GSAP intro only re-performs it.
   */
  import type { Attachment } from 'svelte/attachments';
  import { resolve } from '$app/paths';
  import { gsap, magnetic, prefersReducedMotion, splitChars } from '$lib/motion';
  import {
    HERO_CHIPS,
    HERO_CTA_PRIMARY,
    HERO_CTA_SECONDARY,
    HERO_EYEBROW,
    HERO_HEADLINE_LINES,
    HERO_SUB,
    SIMULATED_FEED_LABEL,
    TICKER
  } from '$lib/content/home';

  let sceneEnabled = $state(false);
  let sceneActive = $state(true);

  /**
   * The opening performance, attached to the hero section itself: probe WebGL, watch visibility
   * to pause the scene, and — motion permitting — run the split-character intro. An attachment
   * only ever runs client-side, and it only writes state (never reads any), so it runs exactly
   * once and tears down cleanly.
   */
  const cinematics: Attachment = (node) => {
    const hero = node as HTMLElement;
    const reduced = prefersReducedMotion();

    if (!reduced) {
      try {
        /*
         * Two-stage probe: WebGL must exist AND be hardware-accelerated. A software rasterizer
         * (SwiftShader, llvmpipe) renders the field on the main thread, starving the RAF loop the
         * GSAP intro also rides — those clients get the CSS aurora, which is the complete look.
         * When the renderer string is unavailable (privacy-hardened browsers), the scene stays
         * enabled on purpose: those are overwhelmingly real GPUs, and the field degrades to a slow
         * canvas rather than a broken page. `?webgl=force` bypasses the software check for QA.
         */
        const probe = document.createElement('canvas');
        const gl = (probe.getContext('webgl2') ?? probe.getContext('webgl')) as WebGLRenderingContext | null;
        if (gl) {
          const info = gl.getExtension('WEBGL_debug_renderer_info');
          const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
          const software = /swiftshader|software|llvmpipe/i.test(renderer);
          const forced = new URLSearchParams(window.location.search).get('webgl') === 'force';
          sceneEnabled = !software || forced;
          gl.getExtension('WEBGL_lose_context')?.loseContext();
        }
      } catch {
        sceneEnabled = false;
      }
    }

    const observer = new IntersectionObserver((entries) => {
      // Coalesced batches arrive oldest-first; the newest entry is the current state.
      sceneActive = entries[entries.length - 1].isIntersecting;
    });
    observer.observe(hero);

    let timeline: gsap.core.Timeline | undefined;
    const headline = hero.querySelector<HTMLHeadingElement>('h1.headline');
    if (!reduced && headline) {
      const chars = splitChars(headline);
      const fades = hero.querySelectorAll('[data-hero-fade]');
      timeline = gsap.timeline({ defaults: { ease: 'power4.out' } });
      timeline
        .from(chars, { yPercent: 120, duration: 1.2, stagger: { each: 0.018 } }, 0.2)
        .from(fades, { opacity: 0, y: 26, duration: 1, stagger: 0.12, ease: 'power3.out' }, 0.85);
    }

    return () => {
      observer.disconnect();
      timeline?.kill();
    };
  };
</script>

<section class="hero" id="top" {@attach cinematics}>
  <div class="backdrop" aria-hidden="true">
    <div class="aurora"></div>
    <div class="grid-floor"></div>
  </div>

  {#if sceneEnabled}
    {#await import('./HeroScene.svelte') then { default: HeroScene }}
      <HeroScene active={sceneActive} />
    {/await}
  {/if}

  <div class="veil" aria-hidden="true"></div>

  <div class="hc-container copy">
    <p class="hc-eyebrow" data-hero-fade><span class="live-dot"></span>{HERO_EYEBROW}</p>
    <h1 class="headline">
      {HERO_HEADLINE_LINES[0]}
      <br />
      {HERO_HEADLINE_LINES[1]}
    </h1>
    <p class="sub" data-hero-fade>{HERO_SUB}</p>
    <div class="actions" data-hero-fade>
      <a href={resolve('/contact')} class="hc-btn hc-btn-primary" {@attach magnetic()}>
        {HERO_CTA_PRIMARY.label}
      </a>
      <a href="#engineering" class="hc-btn hc-btn-ghost">{HERO_CTA_SECONDARY.label}</a>
    </div>
    <ul class="chips" data-hero-fade>
      {#each HERO_CHIPS as chip (chip)}
        <li>{chip}</li>
      {/each}
    </ul>
  </div>

  <div class="tape" data-hero-fade>
    <span class="hc-sim">{SIMULATED_FEED_LABEL}</span>
    <div class="tape-window">
      <div class="tape-track" aria-hidden="true">
        {#each [0, 1] as pass (pass)}
          <div class="tape-run">
            {#each TICKER as entry (entry.symbol)}
              <span class="tick" class:down={entry.direction === 'down'}>
                <span class="sym">{entry.symbol}</span>
                {entry.move}
              </span>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  </div>

  <div class="cue" aria-hidden="true"><span></span></div>
</section>

<style>
  .hero {
    position: relative;
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: clip;
    isolation: isolate;
  }

  /* --- layer 1: always-on cinematic backdrop --------------------------------------- */
  .backdrop {
    position: absolute;
    inset: 0;
    z-index: -3;
    background: var(--hc-bg-0);
  }

  .aurora {
    position: absolute;
    inset: -20%;
    background:
      radial-gradient(42% 55% at 18% 18%, rgba(16, 185, 129, 0.1), transparent 70%),
      radial-gradient(38% 48% at 82% 12%, rgba(122, 169, 255, 0.08), transparent 70%),
      radial-gradient(50% 60% at 55% 92%, rgba(139, 123, 255, 0.06), transparent 72%);
    filter: blur(46px);
    animation: aurora-drift 26s ease-in-out infinite alternate;
  }

  .grid-floor {
    position: absolute;
    inset: 52% 0 0;
    background-image:
      linear-gradient(rgba(151, 166, 198, 0.16) 1px, transparent 1px),
      linear-gradient(90deg, rgba(151, 166, 198, 0.16) 1px, transparent 1px);
    background-size: 56px 56px;
    transform: perspective(620px) rotateX(63deg) scale(1.6);
    transform-origin: 50% 0;
    mask-image: linear-gradient(to bottom, transparent, #000 22%, transparent 88%);
    opacity: 0.35;
  }

  @keyframes aurora-drift {
    from {
      transform: translate3d(-2.5%, -1.5%, 0) rotate(-1.6deg);
    }
    to {
      transform: translate3d(2.5%, 2%, 0) rotate(1.6deg);
    }
  }

  /* --- layer 2 host: the Threlte scene sits between backdrop and veil -------------- */
  .hero > :global(.scene) {
    z-index: -2;
  }

  /* --- layer 2.5: legibility veil over the scene ------------------------------------ */
  .veil {
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      linear-gradient(to right, rgba(4, 5, 10, 0.86) 0%, rgba(4, 5, 10, 0.35) 52%, rgba(4, 5, 10, 0.12) 100%),
      linear-gradient(to top, var(--hc-bg-0) 0%, transparent 34%),
      linear-gradient(to bottom, rgba(4, 5, 10, 0.55) 0%, transparent 22%);
  }

  /* --- layer 3: the copy ------------------------------------------------------------ */
  .copy {
    width: 100%;
    padding-top: clamp(96px, 16vh, 150px);
    padding-bottom: 140px;
  }

  .live-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--hc-up);
    box-shadow: 0 0 12px 2px var(--hc-glow-up);
    animation: trhome-pulse 2.2s ease-in-out infinite;
  }

  .headline {
    margin: 26px 0 0;
    font-family: var(--hc-font-display);
    font-weight: 300;
    font-size: clamp(42px, 7vw, 96px);
    line-height: 1.02;
    letter-spacing: -0.02em;
    color: var(--hc-ink);
  }

  .sub {
    margin: 30px 0 0;
    max-width: 56ch;
    font-size: clamp(16px, 1.45vw, 20px);
    line-height: 1.65;
    color: var(--hc-ink-dim);
    text-wrap: pretty;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    margin-top: 42px;
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 22px;
    margin: 34px 0 0;
    padding: 0;
    list-style: none;
  }

  .chips li {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    font-family: var(--hc-font-mono);
    font-size: 12.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--hc-ink-faint);
  }

  .chips li::before {
    content: '';
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--hc-up);
    opacity: 0.85;
  }

  /* --- layer 4: the simulated tape --------------------------------------------------- */
  .tape {
    position: absolute;
    inset: auto 0 0;
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 14px var(--hc-gutter);
    border-top: 1px solid var(--hc-line);
    background: rgba(4, 5, 10, 0.6);
    backdrop-filter: blur(10px);
  }

  .tape .hc-sim {
    flex-shrink: 0;
  }

  .tape-window {
    overflow: hidden;
    flex: 1;
    mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent);
  }

  .tape-track {
    display: flex;
    width: max-content;
    animation: trhome-marquee 46s linear infinite;
  }

  /* WCAG 2.2.2: hovering the strip holds it still; reduced-motion freezes it outright below. */
  .tape:hover .tape-track {
    animation-play-state: paused;
  }

  .tape-run {
    display: flex;
    gap: 42px;
    padding-right: 42px;
  }

  .tick {
    font-family: var(--hc-font-mono);
    font-size: 13px;
    letter-spacing: 0.04em;
    color: var(--hc-up);
    white-space: nowrap;
  }

  .tick.down {
    color: var(--hc-down);
  }

  .tick .sym {
    color: var(--hc-ink);
    margin-right: 8px;
    font-weight: 600;
  }

  /* --- scroll cue -------------------------------------------------------------------- */
  .cue {
    position: absolute;
    right: clamp(20px, 4vw, 48px);
    bottom: 72px;
    width: 1px;
    height: 64px;
    background: var(--hc-line-strong);
    overflow: hidden;
  }

  .cue span {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent, var(--hc-up));
    animation: cue-fall 2.2s cubic-bezier(0.65, 0, 0.35, 1) infinite;
  }

  @keyframes cue-fall {
    from {
      transform: translateY(-100%);
    }
    to {
      transform: translateY(100%);
    }
  }

  @media (max-width: 720px) {
    .cue {
      display: none;
    }

    .copy {
      padding-bottom: 120px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    /* The tape must not creep at 0.01ms-per-cycle; freeze it as a static strip. */
    .tape-track {
      animation: none;
    }
  }
</style>
