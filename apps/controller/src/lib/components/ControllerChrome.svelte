<script lang="ts">
  import { animateOnce } from '$lib/animate-once';
  import AppFooter from './AppFooter.svelte';
  import AppNavbar from './AppNavbar.svelte';
  import Bootbox from './Bootbox.svelte';
  import type { Snippet } from 'svelte';

  /**
   * The controller's chrome: the black navbar, the animated container that holds
   * the page and the footer, and the one bootbox for the whole app.
   *
   * This is a component rather than a branch of the root layout's `{#if}` for
   * one reason: a component's `<script>` runs exactly once per mount, which is
   * precisely the lifetime the intro animation is scoped to. Resolving the class
   * in a `$derived` in the layout instead looked equivalent and was not — the
   * derived re-evaluated after hydration and handed back '', stripping
   * `fadeInDown` off the container while it was still running.
   *
   * `animateOnce()` then narrows once-per-mount to once-per-document: the first
   * time this chrome mounts it returns the classes, and every later mount — such
   * as navigating out to the marketing site and back — gets nothing.
   */
  interface Props {
    signedIn: boolean;
    /**
     * The controller has two page shells, and they are not interchangeable.
     *
     *   'container'  `.container.container-sm` — 1170 wide, centred, animated,
     *                with the © footer inside it. /login, /register, /account.
     *   'fluid'      `.ng-fluid` — edge to edge, no page footer at all, and no
     *                fadeInDown either: the reference wraps this one in
     *                `ng-fadeOutZoom`. The Manage Session page, whose panel
     *                measures x=0, w=1989 at a 1989-wide viewport.
     */
    shell?: 'container' | 'fluid';
    children: Snippet;
  }

  let { signedIn, shell = 'container', children }: Props = $props();

  const intro = animateOnce();
</script>

<div class="acc-body">
  <AppNavbar {signedIn} />
  {#if shell === 'fluid'}
    <div class="acc-fluid">{@render children()}</div>
  {:else}
  <!-- `div.container.container-sm.animated.fadeInDown` — one element, measured
       at 409.5,50 and 1170x1074.992, wrapping the page AND the footer. The three
       controller pages each used to build their own copy of this, which is why
       the footer rendered twice on /account and the page overflowed the
       viewport. -->
    <div class="acc-container acc-container-sm {intro}">
      {@render children()}
      <AppFooter />
    </div>
  {/if}
  <!-- One bootbox for the whole controller, as the reference has one: it
       appends its dialog to <body>, not into the page that asked for it. -->
  <Bootbox />
</div>
