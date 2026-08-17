<script lang="ts">
  import { afterNavigate } from '$app/navigation';
  import { page } from '$app/state';
  import ControllerChrome from '#lib/components/ControllerChrome.svelte';
  import ConsentBanner from '#lib/components/home/ConsentBanner.svelte';
  import HomeFooter from '#lib/components/home/HomeFooter.svelte';
  import HomeNav from '#lib/components/home/HomeNav.svelte';
  import SiteFooter from '#lib/components/SiteFooter.svelte';
  import SiteHeader from '#lib/components/SiteHeader.svelte';
  import '../account.css';
  import '../manage.css';
  import '../public.css';
  import '../home.css';
  /*
   * TWO FontAwesomes, because the two apps being matched load two.
   *
   * The controller is FontAwesome 4: its capture reports exactly one loaded
   * family, "FontAwesome", pulls `vendor/font-awesome/css/font-awesome.min.css`,
   * and uses `fa-external-link`, `fa-cloud-upload`, `fa-sort-alpha-asc` and
   * `fa-smile-o` — names that were all renamed in v5 and do not exist in v6.
   *
   * The room entry screen is the modern Angular app, and it is FontAwesome 5:
   * its gear measures 16px inside a 27px button, which is 1em, where FA4's cog
   * is 0.857em = 13.719. Forcing FA4 on it shrank that button to 24.719.
   *
   * The version is not cosmetic — advance widths are baked into the font file,
   * and every button holding an icon is sized by them. FA4 is pinned to EXACTLY
   * 4.3.0, which is the version both captures request
   * (`fontawesome-webfont.woff2?v=4.3.0`, in the room-login dump and in the
   * manage page's stylesheets alike). 4.7.0 redrew `fa-user` from 1408 units to
   * 1280, which is 10.219px against 9.289px at the 13px the dropdown uses — the
   * only glyph on that menu that did not match, and invisible to any check that
   * does not measure it.
   *
   * The two coexist by prefix: FA4 owns `.fa`, FA5 owns `.fas`. FA5's stylesheet
   * also claims `.fa` for its solid family, so FA4 is imported SECOND and takes
   * that selector on source order; FA4 never defines `.fas`, so the room keeps
   * FA5. The glyphs the room uses — cog, user, power-off, phone, lock, envelope
   * — sit at the same codepoints in both, so the duplicated `::before` content
   * rules agree rather than fight.
   */
  import '@fortawesome/fontawesome-free/css/all.min.css';
  import 'font-awesome/css/font-awesome.min.css';
  import { resolveChrome } from '#lib/chrome.js';
import type { LayoutProps } from './$types';

  /**
   * The single place chrome is decided.
   *
   * It used to live in three group layouts plus two pages, which is how `/`
   * rendered two headers and how `/contact` got chrome the reference never had.
   *
   * Each chrome wraps navbar + page + footer in ONE element. `.acc-body` carries
   * `min-height: 100vh`, so an earlier version that wrapped only the navbar in it
   * made that block a full viewport tall and pushed the login panel below the
   * fold. One wrapper per page, never nested.
   *
   * Three chromes, because the reference has three:
   *
   *   marketing  `/`, `/contact`, `/privacy`, `/terms`
   *              navbar-inverse over #0e0e0e, #footer with the legal links
   *   controller `/login`, `/register`, `/account`, `/account/rooms/*`,
   *              `/forgot-password`, `/reset-password`
   *              the black `navbar topnavbar` and the © TradingRoomApp footer
   *   none       `/session/*`, `/account/api-docs`
   *              the room entry screen owns its full field; the API document
   *              is a separate first-party HTML surface with its own topbar
   */
  let { data, children }: LayoutProps = $props();

  // Public, framework-lifecycle hydration signal used by browser contracts and
  // diagnostics. `window.load` can precede SvelteKit's dynamic bootstrap; the
  // official afterNavigate callback runs when this layout has mounted and after
  // each completed client navigation.
  afterNavigate(() => {
    document.documentElement.dataset.proroomHydrated = 'true';
  });


  /* Manage Session is the controller's one full-bleed page — `.ng-fluid`, panel
     at x=0 w=1989, and no page footer. Everything else is the 1170 container. */
  const fluid = $derived(/^\/account\/rooms\//.test(page.url.pathname));

  /*
    The decision itself lives in `#lib/chrome.ts` so it can be tested.

    It was inlined here, and a page was filed under the wrong shell without anything noticing:
    `/forgot-password` and `/reset-password` fell through to `marketing` and rendered inside
    `.pub-root` while wearing the controller's `acc-*` classes, which put every field at twice its
    intended width. That file records the measurement and carries the cases.
  */
  const chrome = $derived(resolveChrome(page.url.pathname));

</script>

<!--
  The impersonation banner.

  OUTSIDE the `{#if chrome}` branches on purpose, so it renders on EVERY page an impersonated
  session can reach — the account page, a manage page, the room login — rather than only where the
  controller chrome happens to apply.

  There is no dismiss control, and that is the requirement, not an omission: a banner an operator
  can close is a banner they will close, and then act as somebody else without any indication on
  screen. The only way out is the button, which ends the session.
-->
{#if data.user?.impersonatedBy !== undefined}
  <div class="imp-banner" role="alert">
    <span>
      Viewing as <strong>{data.user.displayName}</strong> ({data.user.email}). Everything you do is
      recorded against your operator account.
    </span>
    <form method="POST" action="/admin?/stopImpersonating">
      <button type="submit">Stop impersonating</button>
    </form>
  </div>
{/if}

{#if chrome === 'controller'}
  <ControllerChrome signedIn={!!data.user} shell={fluid ? 'fluid' : 'container'}
    >{@render children()}</ControllerChrome
  >
{:else if chrome === 'marketing'}
  {#if page.url.pathname === '/'}
    <!-- The cinematic home surface (docs/decisions/0005-cinematic-home.md) owns its own chrome —
         nav, consent, footer — and its styles live in home.css under `.home-cine` plus component
         <style> blocks. It deliberately does NOT render inside `.pub-root`: the Bootstrap 3.1.1
         transcription would fight the new composition over headings, containers, and buttons. -->
    <div class="home-cine">
      <ConsentBanner />
      <HomeNav signedIn={!!data.user} accountAccessEnabled={data.accountAccessEnabled} />
      <main id="home-main">{@render children()}</main>
      <HomeFooter signedIn={!!data.user} accountAccessEnabled={data.accountAccessEnabled} />
    </div>
  {:else}
    <!-- public.css is scoped under .pub-root. It has to be: the marketing site is
         Bootstrap 3.1.1 plus a theme that overrides the desktop container, while
         the controller uses a different Bootstrap 3/app bundle. Loaded unscoped
         they fought over `.container`, `.row`,
         `.col-md-*`, `hr`, `img`, `.navbar`, `.caret` and `.dropdown-menu` on
         every controller page — the bulk-actions menu came out 376px wide instead
         of 238px because `.dropdown-menu { right: 0 }` from this sheet turned a
         shrink-to-fit box into a left-and-right-anchored one. -->
    <div class="pub-root">
      <SiteHeader signedIn={!!data.user} accountAccessEnabled={data.accountAccessEnabled} />
      {@render children()}
      <SiteFooter />
    </div>
  {/if}
{:else}
  {@render children()}
{/if}

<style>
  .imp-banner { position: sticky; top: 0; z-index: 2000; }
</style>
