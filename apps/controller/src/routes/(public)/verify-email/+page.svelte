<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();

  /*
    One message per refusal, each naming what to do next. A single "invalid link" would be honest
    but useless: expired and already-used need opposite actions from whoever is reading it.
  */
  const REASONS = {
    unknown: 'That link is not one we issued. Check you copied the whole address from the email.',
    expired: 'That link has expired. Sign in and use Resend to get a fresh one.',
    'already-used': 'That link was already used. Your address is confirmed — you can sign in.',
    'address-changed':
      'That link was for an address this account no longer uses. Sign in and resend it from your account page.'
  } as const;
</script>

<svelte:head>
  <title>Confirm your email — ProTradingRoom</title>
  <!-- A one-time credential in the query string must never be indexed or sent onward as a referrer. -->
  <meta name="robots" content="noindex, nofollow" />
  <meta name="referrer" content="no-referrer" />
</svelte:head>

<div class="pub-auth">
  <h1>Confirm your email</h1>
  <div class="pub-form-card">
    {#if data.verified}
      <p class="pub-success">{data.email} is confirmed.</p>
      <p class="pub-hint">That is everything — you can carry on.</p>
      <a class="pub-hint" href={resolve('/account')}>Go to your account</a>
    {:else}
      <p class="pub-error">{REASONS[data.reason]}</p>
      <a class="pub-hint" href={resolve('/login')}>Sign in</a>
    {/if}
  </div>
</div>
