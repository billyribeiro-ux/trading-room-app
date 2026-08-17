<script lang="ts">
  /**
   * The home page's own chrome: a fixed glass bar that stays transparent over the hero and gains
   * blur + hairline once the page scrolls. The brand mark is an inline SVG candlestick glyph — no
   * raster assets anywhere on this surface.
   */
  import type { Attachment } from 'svelte/attachments';
  import { resolve } from '$app/paths';
  import { BRAND } from '#lib/content/home.js';

  interface Props {
    /** Signed-in visitors get "My account" instead of "Log in". */
    signedIn?: boolean;
    /** False while the official-domain deployment is intentionally marketing-only. */
    accountAccessEnabled?: boolean;
  }

  let { signedIn = false, accountAccessEnabled = false }: Props = $props();

  let scrollY = $state(0);
  let open = $state(false);
  let scrolled = $derived(scrollY > 10);

  /* Held so Escape can hand focus back to the control that opened the menu. */
  let burgerElement: HTMLButtonElement | undefined;
  const trackBurger: Attachment = (node) => {
    burgerElement = node as HTMLButtonElement;
    return () => {
      burgerElement = undefined;
    };
  };

  function close() {
    open = false;
  }

  function onEscape(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !open) return;
    close();
    burgerElement?.focus();
  }
</script>

<svelte:window bind:scrollY onkeydown={onEscape} />

<header class="nav" class:scrolled class:open>
  <div class="inner">
    <a href={resolve('/(public)')} class="brand" onclick={close}>
      <svg viewBox="0 0 28 28" class="mark" aria-hidden="true">
        <line x1="6" y1="7" x2="6" y2="23" />
        <rect x="3.5" y="12" width="5" height="7" rx="1" class="down" />
        <line x1="14" y1="4" x2="14" y2="21" />
        <rect x="11.5" y="8" width="5" height="8" rx="1" />
        <line x1="22" y1="1" x2="22" y2="17" />
        <rect x="19.5" y="4" width="5" height="7" rx="1" />
      </svg>
      <span class="wordmark">{BRAND}</span>
    </a>

    <nav id="home-navigation" class="menu" aria-label="Home sections">
      <ul>
        <li><a href="#desk" onclick={close}>The desk</a></li>
        <li><a href="#engineering" onclick={close}>Engineering</a></li>
        <li><a href="#tape" onclick={close}>Live tape</a></li>
        <li><a href="#voices" onclick={close}>Voices</a></li>
        <li><a href={resolve('/(public)/contact')} onclick={close}>Contact</a></li>
        {#if accountAccessEnabled}
          <li>
            {#if signedIn}
              <a href={resolve('/(app)/account')} onclick={close}>My account</a>
            {:else}
              <a href={resolve('/(public)/login')} onclick={close}>Log in</a>
            {/if}
          </li>
        {/if}
      </ul>
      <a href={resolve('/(public)/contact')} class="hc-btn hc-btn-primary demo" onclick={close}>Book a demo</a>
    </nav>

    <button
      class="burger"
      type="button"
      aria-label="Toggle navigation"
      aria-controls="home-navigation"
      aria-expanded={open}
      onclick={() => (open = !open)}
      {@attach trackBurger}
    >
      <span></span><span></span>
    </button>
  </div>
</header>

<style>
  .nav {
    position: fixed;
    inset: 0 0 auto;
    z-index: 100;
    transition:
      background-color 0.4s ease,
      border-color 0.4s ease,
      backdrop-filter 0.4s ease;
    border-bottom: 1px solid transparent;
  }

  .nav.scrolled,
  .nav.open {
    background: rgba(4, 5, 10, 0.72);
    backdrop-filter: blur(14px);
    border-bottom-color: var(--hc-line);
  }

  .inner {
    display: flex;
    align-items: center;
    gap: 30px;
    max-width: var(--hc-max);
    margin-inline: auto;
    padding: 16px var(--hc-gutter);
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
  }

  .mark {
    width: 24px;
    height: 24px;
  }

  .mark line {
    stroke: var(--hc-up);
    stroke-width: 1.6;
  }

  .mark rect {
    fill: var(--hc-up);
  }

  .mark line:first-of-type,
  .mark rect.down {
    stroke: var(--hc-down);
    fill: var(--hc-down);
  }

  .mark rect.down {
    stroke: none;
  }

  .wordmark {
    font-family: var(--hc-font-mono);
    font-size: 15px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: var(--hc-ink);
  }

  .menu {
    display: flex;
    align-items: center;
    gap: 28px;
    margin-left: auto;
  }

  .menu ul {
    display: flex;
    align-items: center;
    gap: 26px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .menu ul a {
    font-family: var(--hc-font-mono);
    font-size: 12.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    text-decoration: none;
    color: var(--hc-ink-dim);
    transition: color 0.3s ease;
  }

  .menu ul a:hover {
    color: var(--hc-up);
  }

  .demo {
    padding: 10px 22px;
    font-size: 12.5px;
  }

  .burger {
    display: none;
    position: relative;
    width: 40px;
    height: 40px;
    margin-left: auto;
    border: 1px solid var(--hc-line-strong);
    border-radius: 10px;
    background: transparent;
    cursor: pointer;
  }

  .burger span {
    position: absolute;
    left: 11px;
    right: 11px;
    height: 1.5px;
    background: var(--hc-ink);
    transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .burger span:first-child {
    top: 15px;
  }

  .burger span:last-child {
    bottom: 15px;
  }

  .open .burger span:first-child {
    transform: translateY(4.25px) rotate(45deg);
  }

  .open .burger span:last-child {
    transform: translateY(-4.25px) rotate(-45deg);
  }

  @media (max-width: 880px) {
    .burger {
      display: block;
    }

    .menu {
      position: fixed;
      inset: 73px 0 auto;
      flex-direction: column;
      align-items: stretch;
      gap: 18px;
      margin: 0;
      padding: 22px var(--hc-gutter) 30px;
      background: rgba(4, 5, 10, 0.94);
      backdrop-filter: blur(18px);
      border-bottom: 1px solid var(--hc-line);
      transform: translateY(-8px);
      opacity: 0;
      visibility: hidden;
      transition:
        opacity 0.3s ease,
        transform 0.3s ease,
        visibility 0.3s;
    }

    .open .menu {
      transform: translateY(0);
      opacity: 1;
      visibility: visible;
    }

    .menu ul {
      flex-direction: column;
      align-items: stretch;
      gap: 0;
    }

    .menu ul a {
      display: block;
      padding: 13px 0;
      border-bottom: 1px solid var(--hc-line);
      font-size: 14px;
    }

    .demo {
      justify-content: center;
    }
  }
</style>
