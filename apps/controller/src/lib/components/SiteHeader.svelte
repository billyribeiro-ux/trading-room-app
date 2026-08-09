<script lang="ts">
  import { asset, resolve } from '$app/paths';
  import { IMAGE_SIZES } from '$lib/content/home';

  interface Props {
    /** Signed-in visitors get "My account" instead of the Register/Login dropdown. */
    signedIn?: boolean;
    /** False while the official-domain deployment is intentionally marketing-only. */
    accountAccessEnabled?: boolean;
  }

  let { signedIn = false, accountAccessEnabled = false }: Props = $props();
  let expanded = $state(false);
  let accountMenuOpen = $state(false);

  function toggleNavigation() {
    expanded = !expanded;
    if (!expanded) accountMenuOpen = false;
  }
</script>

<!-- header.navbar.navbar-inverse.normal — the site's own header, from evidence-dumps/home-page/file.
     Defined once here so every marketing page carries the same chrome. -->
<header class="navbar navbar-inverse normal">
  <div class="container">
    <div class="navbar-header">
      <button
        class="navbar-toggle"
        type="button"
        aria-label="Toggle navigation"
        aria-controls="marketing-navigation"
        aria-expanded={expanded}
        onclick={toggleNavigation}
      >
        <span class="icon-bar"></span>
        <span class="icon-bar"></span>
        <span class="icon-bar"></span>
      </button>
      <a href={resolve('/')} class="navbar-brand">
        <img
          src={asset('/public/images/protradingroom_icon.png')}
          alt=""
          width={IMAGE_SIZES.brand.w}
          height={IMAGE_SIZES.brand.h}
          style="width: auto; height: 45px"
        /> TradingRoomApp
      </a>
    </div>
    <nav
      id="marketing-navigation"
      class={['collapse navbar-collapse bs-navbar-collapse', { in: expanded }]}
    >
      <ul class="nav navbar-nav navbar-right">
        {#if accountAccessEnabled}
          {#if signedIn}
            <li><a href={resolve('/account')}>My account</a></li>
          {:else}
            <li class={['dropdown', { open: accountMenuOpen }]}>
              <button
                class="navbar-dropdown-toggle dropdown-toggle"
                type="button"
                aria-haspopup="true"
                aria-expanded={accountMenuOpen}
                onclick={() => (accountMenuOpen = !accountMenuOpen)}
                onkeydown={(event) => {
                  if (event.key === 'Escape') accountMenuOpen = false;
                }}
              >Register/Login <b class="caret"></b></button>
              <ul class="dropdown-menu" aria-label="Account">
                <li><a href={resolve('/login')} onclick={() => (accountMenuOpen = false)}>Login</a></li>
                <li><a href={resolve('/register')} onclick={() => (accountMenuOpen = false)}>Register</a></li>
              </ul>
            </li>
          {/if}
        {/if}
        <li>
          <a href={resolve('/contact')}><i class="fa fa-envelope"></i> Contact Us</a>
        </li>
      </ul>
    </nav>
  </div>
</header>
