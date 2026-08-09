<script lang="ts">
  import { resolve } from '$app/paths';
  import { untrack } from 'svelte';
  import Recaptcha from '$lib/components/Recaptcha.svelte';
  import '../../../account.css';
  import type { PageProps } from './$types';

  /**
   * "Forgot your password?" — the page that link should always have gone to.
   *
   * ## Why it looks like the login page rather than the other public pages
   *
   * It is reached from login, and it returns to login, so it is part of that panel's flow and wears
   * that panel's clothes: `acc-panel-narrow` on white, the muted trailing field icon, the
   * full-width `acc-btn-info`. Every class here is one the login page already uses and
   * `account.css` already defines.
   *
   * The neighbouring public pages (`contact`, `verify-email`) use a `pub-*` set — `pub-auth`,
   * `pub-form-card`, `pub-field`, `pub-hint` — which has **no CSS rule anywhere in this app**, so
   * those pages render unstyled. That is recorded in `TODO.md` rather than propagated here.
   *
   * ## Nothing on this page is matched
   *
   * The reference has a "forgot password" LINK and no captured page behind it. See
   * `password-reset.ts` for the full note. The wording below is ours.
   */
  let { data, form }: PageProps = $props();

  // Preserves an address typed before hydration, and re-seeds the one a failed
  // action returned. Same pattern as the login page.
  let email = $state<string | undefined>(untrack(() => form?.email));
</script>

<svelte:head>
  <title>Reset your TradingRoomApp password</title>
  <!-- Nothing here should be indexed: it is a transactional dead end for search, and the page it
       leads to carries a one-time credential. -->
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="acc-center-block">
  <div class="acc-panel acc-panel-narrow">
    <div class="acc-panel-body">
      <p class="acc-panel-title">Reset your password</p>

      {#if !data.enabled}
        <!-- Said BEFORE the form, not after a submission. A control that accepts input and then
             reveals it could never have worked is the dead-control failure this project has a rule
             about. -->
        <p class="acc-error" role="alert">Password reset is not available on this deployment yet.</p>
        <p class="acc-text-muted">
          Email delivery is not configured, so no link can be sent.
          <a href={resolve('/contact')}>Get in touch</a> and we will sort it out directly.
        </p>
      {:else if form?.sent}
        <!-- Deliberately the same answer whether or not that address has an account. -->
        <p class="acc-success" role="status">{form.message}</p>
        <p class="acc-text-muted">
          Nothing arrived? Check spam, then <a href={resolve('/forgot-password')}>try again</a>.
        </p>
      {:else}
        <p class="acc-text-muted">
          Type the address on your account and we will send a link to set a new password.
        </p>

        {#if form?.message}
          <p class="acc-error" role="alert">{form.message}</p>
        {/if}

        <form method="POST">
          <div class="row">
            <div class="col-md-6">
              <div class="acc-form-group acc-mb">
                <input
                  class="acc-input"
                  id="reset-email"
                  name="email"
                  type="email"
                  placeholder="Your email"
                  autocomplete="email"
                  autocorrect="off"
                  aria-label="Your email"
                  bind:value={email}
                  required
                />
                <span class="acc-feedback"><i class="fa fa-envelope"></i></span>
              </div>

              <div class="acc-form-group acc-mb">
                <Recaptcha />
              </div>

              <div class="acc-form-group">
                <button class="acc-btn acc-btn-info acc-btn-block acc-mb" type="submit">
                  Email me a link
                </button>
              </div>

              <div class="acc-text-right">
                <a class="acc-text-muted" href={resolve('/login')}>Back to sign in</a>
              </div>
            </div>
          </div>
        </form>
      {/if}
    </div>
  </div>
</div>
