<script lang="ts">
  import { asset, resolve } from '$app/paths';
  import { untrack } from 'svelte';
  import Recaptcha from '$lib/components/Recaptcha.svelte';
  import type { PageProps } from './$types';

  /**
	 * Rebuilt from `evidence-dumps/register-page/register-page-file` — the served HTML of the
   * controller's `#/page/register`.
   *
   * This is the AngularJS controller's own registration screen, not the marketing
   * site's: same black topnavbar, same Bootstrap 3 panel, same `LoginCtrl`
   * lockup. Structure, class semantics and copy come from that source.
   *
   * The container carries `animated fadeInDown` exactly as the reference does —
   * the card drops in from above its resting place over 1s.
   */
  let { form }: PageProps = $props();

	// An undefined binding adopts an input's existing DOM value during the
	// initial render. That preserves keystrokes made while hydration is still
	// completing, while action failures still seed the server-returned values.
	let name = $state<string | undefined>(untrack(() => form?.name));
	let email = $state<string | undefined>(untrack(() => form?.email));
</script>

<svelte:head>
  <title>Create your ProTradingRoom account</title>
  <meta name="description" content="Create a ProTradingRoom account for web-based professional trading rooms." />
</svelte:head>

  <div class="acc-center-block">
    <a class="acc-brand-lockup" href={resolve('/')}>
      <img
        src={asset('/public/images/protradingroom_icon_dark.png')}
        alt=""
        width="128"
        height="80"
        style="max-height: 50px; width: auto"
      />
      <!-- the reference's alt is the literal word "Image", which a screen reader
           reads as "Image image". The wordmark beside it already names the brand,
           so the icon is decorative. -->
      <span class="title">ProTradingRoom.com</span>
    </a>
    <br /><br /><br />

    <div class="acc-panel acc-panel-narrow">
      <div class="acc-panel-body">
        <p class="acc-panel-title">Create your ProTradingRoom account</p>

        {#if form?.message}
          <p class="acc-error">{form.message}</p>
        {/if}

        <form method="POST">
          <div class="row">
            <div class="col-md-6">
              <div class="acc-form-group">
                <input
                  class="acc-input"
                  name="name"
                  type="text"
                  placeholder="Your full name"
                  autocomplete="off"
                  bind:value={name}
                  aria-label="Your full name"
                  required
                />
                <!-- the reference leaves this feedback span empty on the name field -->
                <span class="acc-feedback"></span>
              </div>

              <div class="acc-form-group">
                <input
                  class="acc-input"
                  name="email"
                  type="email"
                  placeholder="Your email"
                  autocomplete="off"
                  bind:value={email}
                  aria-label="Your email"
                  required
                />
                <span class="acc-feedback"><i class="fa fa-envelope"></i></span>
              </div>

              <div class="acc-form-group">
                <input
                  class="acc-input"
                  id="signupInputPassword1"
                  name="password"
                  type="password"
                  placeholder="Your password"
                  autocomplete="off"
                  aria-label="Your password"
                  minlength="12"
                  required
                />
                <span class="acc-feedback"><i class="fa fa-lock"></i></span>
              </div>

              <div class="acc-form-group">
                <input
                  class="acc-input"
                  id="signupInputRePassword1"
                  name="confirm"
                  type="password"
                  placeholder="Type your password again"
                  autocomplete="off"
                  aria-label="Type your password again"
                  minlength="12"
                  required
                />
                <span class="acc-feedback"><i class="fa fa-lock"></i></span>
                <div class="acc-text-right">
                  <a class="acc-text-muted" href={resolve('/contact')}>Forgot your password?</a>
                </div>
              </div>

              <div class="acc-form-group">
                <Recaptcha />
              </div>

              <div class="acc-form-group">
                <div class="acc-checkbox">
                  <label>
                    <input type="checkbox" name="agreeTOS" required />
                    <span class="fa fa-check"></span>
                    I agree with the <a href={resolve('/terms')}>terms</a>
                  </label>
                </div>
              </div>

              <div class="acc-form-group">
                <button class="acc-btn acc-btn-primary acc-btn-block" type="submit">
                  Create account
                </button>
                <p class="acc-form-note">
                  <!-- "Already register?" is the reference's own wording, typo and
                       all. Kept, because the copy deck is the copy deck. -->
                  Already register?
                  <a href={resolve('/login')}> Login here </a>
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>

  </div>
