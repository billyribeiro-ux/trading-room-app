<script lang="ts">
  import { resolve } from '$app/paths';

  /**
   * #gdpr-banner — every value is inline in the reference's markup.
   *
   * The stored-consent read happens in an `{@attach}`, not a `$derived` and not
   * `onMount`. `$derived` is the usual advice for "compute from state", but it is
   * evaluated during SSR and `localStorage` does not exist on the server; an
   * attachment only ever runs on the client, which is exactly the guarantee this
   * needs.
   *
   * The banner therefore renders server-side and removes itself on hydration when
   * a choice was already stored — never the reverse, so nobody who has already
   * answered sees it reappear.
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
  <div id="gdpr-banner" {@attach readStoredConsent}>
    <div class="container">
      <div class="row">
        <div class="col-md-9">
          <p style="margin: 0">
            We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies. For more
            information, including how to manage your cookie settings, see our
            <a
              href={resolve('/privacy')}
              target="_blank"
              rel="noopener noreferrer"
              style="color: #2095f2">Privacy Policy</a
            >.
          </p>
        </div>
        <div class="col-md-3" style="text-align: right">
          <button
            onclick={() => choose('accepted')}
            class="button button-small"
            style="width: 100%; min-width: 140px">Accept All</button
          >
          <button
            onclick={() => choose('rejected')}
            class="button button-small"
            style="width: 100%; background: #666; min-width: 140px">Reject Non-Essential</button
          >
        </div>
      </div>
    </div>
  </div>
{/if}
