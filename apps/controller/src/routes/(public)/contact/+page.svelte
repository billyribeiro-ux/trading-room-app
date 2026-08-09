<script lang="ts">
  import { untrack } from 'svelte';
  import type { PageProps } from './$types';

  /**
   * Contact.
   *
   * ## Nothing here is matched
   *
   * The reference's own contact page was never captured. It appears in the capture only as five
   * links TO it — `home-page/file` lines 380, 397, 457, 487 and 506 — so there is no markup, no
   * layout and no copy to reproduce. The shape below is ours, and `public.css` says the same thing
   * about the rules it uses.
   *
   * ## The form does not deliver, and says so
   *
   * `+page.server.ts` validates the fields, logs that an enquiry arrived, and returns
   * `notDelivered`. It does NOT send anything. That is not an oversight to paper over: until the
   * enquiry is either stored or emailed, the honest thing is to say it went nowhere and give a
   * route that works — `support@tradingroom.app`, which is a real mailbox.
   *
   * Every branch below is a state the server can actually return: `unavailable` (503, control plane
   * off), `error` (400, a blank field), `notDelivered` (success-shaped), and the form itself.
   */
  let { data, form }: PageProps = $props();

  // Re-seeds what a failed submission returned, so a blank field does not cost the whole message.
  // `untrack` because these become user-owned the moment they type.
  let name = $state<string | undefined>(untrack(() => form?.name));
  let email = $state<string | undefined>(untrack(() => form?.email));
  let message = $state<string | undefined>(untrack(() => form?.message));

  const SUPPORT = 'support@tradingroom.app';
</script>

<svelte:head>
  <title>Contact Us — TradingRoomApp</title>
  <meta name="description" content="Contact TradingRoomApp about pricing, integrations, or a demonstration room." />
</svelte:head>

<div class="pub-auth">
  <div class="pub-form-card">
    <h1>Contact us</h1>

    {#if !data.contactSubmissionEnabled}
      <!-- Said BEFORE the form rather than after a submission. A control that takes input and only
           then admits it could never have worked is the dead-control failure this project has a
           rule about. -->
      <p class="pub-error" role="alert">The contact form is not available on this deployment.</p>
      <p class="pub-hint">
        Nothing you type here would be stored or sent. Email
        <a href="mailto:{SUPPORT}">{SUPPORT}</a> instead — that address is monitored.
      </p>
    {:else if form?.unavailable}
      <p class="pub-error" role="alert">That did not go through — the form is not available right now.</p>
      <p class="pub-hint">
        Nothing was stored or sent. Email <a href="mailto:{SUPPORT}">{SUPPORT}</a> and it will reach us.
      </p>
    {:else if form?.notDelivered}
      <!-- Deliberately NOT dressed up as "thanks, we'll be in touch". The server logged it and sent
           nothing; saying otherwise would be the lie that makes an unanswered enquiry look like
           rudeness rather than a missing transport. -->
      <p class="pub-success" role="status">Your message was checked over — but it was not sent.</p>
      <p class="pub-hint">
        This form does not deliver yet, so nothing has reached us and nothing was stored. Send the
        same message to <a href="mailto:{SUPPORT}">{SUPPORT}</a> and you will get a reply.
      </p>
    {:else}
      <p class="pub-hint">
        Pricing, custom integrations, or a demonstration room — tell us what you need and we will
        come back to you.
      </p>

      {#if form?.error}
        <p class="pub-error" role="alert">{form.error}</p>
      {/if}

      <form method="POST">
        <div class="pub-field">
          <label for="contact-name">Your name</label>
          <input id="contact-name" name="name" autocomplete="name" bind:value={name} required />
        </div>

        <div class="pub-field">
          <label for="contact-email">Email</label>
          <input
            id="contact-email"
            name="email"
            type="email"
            autocomplete="email"
            autocorrect="off"
            bind:value={email}
            required
          />
        </div>

        <div class="pub-field">
          <label for="contact-message">Message</label>
          <textarea id="contact-message" name="message" rows="6" bind:value={message} required></textarea>
        </div>

        <button class="button" type="submit">Send</button>
      </form>

      <p class="pub-hint">
        Prefer email? <a href="mailto:{SUPPORT}">{SUPPORT}</a>.
      </p>
    {/if}
  </div>
</div>
