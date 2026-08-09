<script lang="ts">
  import { resolve } from '$app/paths';
  import { untrack } from 'svelte';
  import Recaptcha from '$lib/components/Recaptcha.svelte';
  import '../../../account.css';
  import type { PageProps } from './$types';
  import PasswordReveal from '$lib/components/PasswordReveal.svelte';

  /**
	 * Rebuilt from `evidence-dumps/login-page/login` — the served HTML of the controller's
   * `#/page/welcome` while logged out.
   *
   * This is NOT the room's entry screen. An earlier version of this page copied
   * that one (`app-session-login`: avatar, Name/Email, pill button on a #eee
   * field); the source shows the real thing is the AngularJS controller's own
   * Bootstrap 3 panel, on white, with a full-width btn-info. The room login lives
   * at /session/[code] and is unchanged.
   *
   * Reproduced: the `.panel > .panel-body`, the bold intro line, two
   * `.form-group.has-feedback` fields with their trailing muted icons, the `<br>`
   * between them, the right-aligned "Forgot your password?", the reCAPTCHA that
   * only appears after three failed attempts, the `btn-block btn-info mb` submit,
   * and the "Logging In, please wait..." state.
   */
  let { form }: PageProps = $props();

	// Preserve an email typed before hydration completes. An undefined binding
	// adopts the existing DOM value, while action failures still seed the
	// server-returned email and passwords are never reflected back.
	let email = $state<string | undefined>(untrack(() => form?.email));
  let loggingIn = $state(false);

  // The reference shows the captcha only once failedLoginCount >= 3.
  const failedLoginCount = $derived(
    form && 'failedLoginCount' in form ? (form.failedLoginCount as number) : 0
  );
</script>

<svelte:head>
  <title>Login to your TradingRoomApp account</title>
  <meta name="description" content="Sign in to manage your TradingRoomApp account and trading rooms." />
</svelte:head>

  <div class="acc-center-block">
    <!-- START panel -->
    <div class="acc-panel acc-panel-narrow">
      <div class="acc-panel-body">
        <p class="acc-panel-title">Login to your TradingRoomApp account</p>

        {#if form?.message}
          <p class="acc-error">{form.message}</p>
        {/if}

        <form method="POST" onsubmit={() => (loggingIn = true)}>
          <div class="row">
            <div class="col-md-6">
              <div class="acc-form-group acc-mb">
                <input
                  class="acc-input"
                  id="exampleInputEmail1"
                  name="email"
                  type="email"
                  placeholder="Your email"
                  autocomplete="off"
                  autocorrect="off"
                  aria-label="Your email"
                  bind:value={email}
                  required
                />
                <span class="acc-feedback"><i class="fa fa-envelope"></i></span>
              </div>
              <br />
              <div class="acc-form-group">
                <PasswordReveal
                  id="exampleInputPassword1"
                  name="password"
                  placeholder="Your password"
                  autocomplete="current-password"
                  required
                />
                <div class="acc-text-right">
                  <!-- Pointed at /contact until 2026-08-09, which did not deliver: the contact
                       action explicitly stores and sends nothing, so this link was the whole of
                       account recovery and it went nowhere. -->
                  <a class="acc-text-muted" href={resolve('/forgot-password')}>Forgot your password?</a>
                </div>
              </div>

              {#if failedLoginCount >= 3}
                <div class="acc-form-group">
                  <Recaptcha />
                </div>
              {/if}

              <div class="acc-form-group">
                <button class="acc-btn acc-btn-info acc-btn-block acc-mb" type="submit">
                  Login
                </button>
              </div>
            </div>
          </div>

          {#if loggingIn}
            <!-- the reference wraps this in a <label> with nothing to label; a
                 <p> says the same thing without the false association -->
            <div class="acc-logging-in" role="status">
              <p>Logging In, please wait...</p>
            </div>
          {/if}
        </form>
      </div>
    </div>
    <!-- END panel -->

  </div>
