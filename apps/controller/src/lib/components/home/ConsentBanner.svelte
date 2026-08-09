<script lang="ts">
  import { resolve } from '$app/paths';

  /**
   * The consent banner, restyled for the cinematic home surface. The behavioral contract is
   * unchanged from the evidence-backed original: same `gdprConsent` localStorage key, same
   * accepted/rejected values, and the stored-consent read still happens in an `{@attach}` — an
   * attachment only ever runs on the client, which is exactly the guarantee a `localStorage` read
   * needs. The banner renders server-side and removes itself on hydration when a choice was
   * already stored — never the reverse, so nobody who has already answered sees it reappear.
   */
  let answered = $state(false);

  function readStoredConsent() {
    if (localStorage.getItem('gdprConsent')) answered = true;
  }

  function choose(value: 'accepted' | 'rejected') {
    localStorage.setItem('gdprConsent', value);
    answered = true;
    // Consent must gate script INJECTION, not flip a disable flag after the tags
    // have already loaded — see docs/reference/public-site.md §4 for what the
    // reference gets wrong there.
  }
</script>

{#if !answered}
  <div id="gdpr-banner" class="consent" role="region" aria-label="Cookie consent" {@attach readStoredConsent}>
    <p>
      We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.
      For more information, including how to manage your cookie settings, see our
      <a href={resolve('/(public)/privacy')} target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
    </p>
    <div class="choices">
      <button type="button" class="accept" onclick={() => choose('accepted')}>Accept All</button>
      <button type="button" class="reject" onclick={() => choose('rejected')}>Reject Non-Essential</button>
    </div>
  </div>
{/if}

<style>
  .consent {
    position: fixed;
    inset: auto 16px 16px;
    z-index: 200;
    display: flex;
    align-items: center;
    gap: 22px;
    max-width: 860px;
    margin-inline: auto;
    padding: 18px 22px;
    border: 1px solid var(--hc-line-strong);
    border-radius: 16px;
    background: rgba(11, 14, 24, 0.92);
    backdrop-filter: blur(16px);
    box-shadow: 0 30px 70px -30px rgba(0, 0, 0, 0.9);
  }

  .consent p {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.55;
    color: var(--hc-ink-dim);
  }

  .consent a {
    color: var(--hc-accent);
  }

  .choices {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex-shrink: 0;
  }

  .choices button {
    padding: 9px 18px;
    min-width: 172px;
    border-radius: 999px;
    font-family: var(--hc-font-mono);
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition:
      background-color 0.3s ease,
      border-color 0.3s ease,
      color 0.3s ease;
  }

  .accept {
    border: 1px solid var(--hc-up);
    background: var(--hc-up);
    color: var(--hc-up-ink);
  }

  .accept:hover {
    background: var(--hc-up-bright);
    border-color: var(--hc-up-bright);
  }

  .reject {
    border: 1px solid var(--hc-line-strong);
    background: transparent;
    color: var(--hc-ink-dim);
  }

  .reject:hover {
    border-color: var(--hc-ink-dim);
    color: var(--hc-ink);
  }

  @media (max-width: 640px) {
    .consent {
      flex-direction: column;
      align-items: stretch;
      gap: 14px;
    }

    .choices {
      flex-direction: row;
    }

    .choices button {
      flex: 1;
      min-width: 0;
    }
  }
</style>
