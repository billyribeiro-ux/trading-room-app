<script lang="ts">
  import { untrack } from 'svelte';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
  let name = $state<string | undefined>(untrack(() => form?.name));
  let email = $state<string | undefined>(untrack(() => form?.email));
  let message = $state<string | undefined>(untrack(() => form?.message));
</script>

<svelte:head>
  <title>Contact Us — ProTradingRoom</title>
  <meta name="description" content="Contact ProTradingRoom about pricing, integrations, or a demonstration room." />
</svelte:head>

<div class="pub-auth">
  <h1>Contact Us</h1>
  <div class="pub-form-card">
    <p class="pub-hint">
      Need to talk to somebody about pricing, custom integrations, or a demo room?
    </p>

    {#if !data.contactSubmissionEnabled}
      <p class="pub-hint">
        The contact form is disabled during this public preview. No message will be stored or sent.
      </p>
    {:else if form?.error}
      <p class="pub-error">{form.error}</p>
    {:else if form?.notDelivered}
      <p class="pub-success">The form was validated, but your message was not stored or sent.</p>
      <p class="pub-hint">
        Email delivery is not configured on this local reconstruction. Until a
        reviewed transport and retention policy are wired up, reach us directly.
      </p>
    {:else}
      <form method="POST">
        <div class="pub-field">
          <label for="name">Your name</label>
          <input id="name" name="name" bind:value={name} required />
        </div>
        <div class="pub-field">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" bind:value={email} required />
        </div>
        <div class="pub-field">
          <label for="message">Message</label>
          <textarea id="message" name="message" rows="6" bind:value={message} required></textarea>
        </div>
        <button class="button" type="submit">Send</button>
      </form>
    {/if}
  </div>
</div>
