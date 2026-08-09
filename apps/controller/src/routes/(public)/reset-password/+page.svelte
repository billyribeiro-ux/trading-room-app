<script lang="ts">
  import { resolve } from '$app/paths';
  import PasswordReveal from '$lib/components/PasswordReveal.svelte';
  import '../../../account.css';
  import type { PageProps } from './$types';

  /**
   * The other end of the reset link.
   *
   * Two states, decided on the server by inspecting the token WITHOUT spending it: a form, or an
   * explanation of why there is no form. The token rides in a hidden field because the POST needs
   * it and a form body does not carry the URL's query string.
   *
   * Every message shown here is composed on the server. This page holds no copy of the refusal
   * wording, so the sentence a person sees on arrival and the one they see after submitting cannot
   * drift apart.
   *
   * The eye toggle matters more here than anywhere else in the product: this is somebody typing a
   * twelve-character minimum twice, blind, having already lost one password today. See
   * `PasswordReveal.svelte`.
   */
  let { data, form }: PageProps = $props();
</script>

<svelte:head>
  <title>Set a new password — TradingRoomApp</title>
  <!-- A one-time credential in the query string must never be indexed, and must not travel onward
       in a Referer header to any host this page touches. Same pair as `verify-email`. -->
  <meta name="robots" content="noindex, nofollow" />
  <meta name="referrer" content="no-referrer" />
</svelte:head>

<div class="acc-center-block">
  <div class="acc-panel acc-panel-narrow">
    <div class="acc-panel-body">
      <p class="acc-panel-title">Set a new password</p>

      {#if !data.valid}
        <p class="acc-error" role="alert">{data.message}</p>
        <div class="acc-text-right">
          <a class="acc-text-muted" href={resolve('/forgot-password')}>Request a new link</a>
        </div>
      {:else}
        {#if form?.message}
          <p class="acc-error" role="alert">{form.message}</p>
        {/if}

        <form method="POST">
          <!-- The credential this POST is authorised by. It is already in the page's URL; putting
               it in the body is what gets it to the action. -->
          <input type="hidden" name="token" value={data.token} />

          <div class="row">
            <div class="col-md-6">
              <div class="acc-form-group acc-mb">
                <PasswordReveal
                  id="reset-password"
                  name="password"
                  placeholder="New password"
                  autocomplete="new-password"
                  minlength={data.minPassword}
                  required
                />
              </div>

              <div class="acc-form-group acc-mb">
                <PasswordReveal
                  id="reset-confirm"
                  name="confirm"
                  placeholder="Repeat new password"
                  autocomplete="new-password"
                  minlength={data.minPassword}
                  required
                />
              </div>

              <p class="acc-text-muted">
                At least {data.minPassword} characters. Setting it signs you out on every other device.
              </p>

              <div class="acc-form-group">
                <button class="acc-btn acc-btn-info acc-btn-block acc-mb" type="submit">
                  Set password and sign in
                </button>
              </div>
            </div>
          </div>
        </form>
      {/if}
    </div>
  </div>
</div>
