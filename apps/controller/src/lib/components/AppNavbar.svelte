<script lang="ts">
  import { resolve } from '$app/paths';
  import { bottomTooltip } from '#lib/bootstrap-tooltip.js';

  interface Props {
    signedIn?: boolean;
  }

  let { signedIn = false }: Props = $props();

  const accountSettingsTooltip = bottomTooltip({
    content: 'Account Settings',
    id: 'account-settings-tooltip'
  });
  const logoutTooltip = bottomTooltip({ content: 'Logout', id: 'logout-tooltip' });
</script>

<!-- The original controller tree, including the Bootstrap 3 float wrappers.
     The account capture's tenant logo is `ng-hide`, so the semantic image node
     remains hidden while its 320px brand slot remains part of the layout. -->
<div class="acc-navbar-shell ng-fadeOutZoom ng-fluid">
  <nav class="acc-navbar navbar topnavbar" style="background-color: black;">
    <div class="acc-navbar-header navbar-header">
      <div class="acc-brand navbar-brand">
        <a href={resolve('/(app)/account')} aria-hidden="true" tabindex="-1">
          <img class="acc-brand-logo brand-logo ng-hide" hidden alt="" />
        </a>
      </div>
    </div>

    <div class="acc-nav-wrapper nav-wrapper collapse navbar-collapse in" style="height: auto;">
      {#if signedIn}
        <ul class="acc-nav-right nav navbar-nav navbar-right hidden-material">
          <li>
            <a
              href={resolve('/(app)/account')}
              class="acc-nav-account icon fa fa-cog"
              style="color: #FFFFFF"
              {@attach accountSettingsTooltip}
            >&nbsp; Account</a>
          </li>
          <li>
            <form method="POST" action={resolve('/(app)/logout')}>
              <button
                type="submit"
                class="acc-nav-logout icon fa fa-2x fa-power-off"
                style="color: #FFFFFF"
                aria-label="Logout"
                {@attach logoutTooltip}
              ></button>
            </form>
          </li>
        </ul>
      {/if}
    </div>
  </nav>
</div>
