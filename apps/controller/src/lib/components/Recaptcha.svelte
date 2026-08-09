<script lang="ts">
  import { PUBLIC_RECAPTCHA_SITE_KEY } from '$app/env/public';

  /**
   * Google reCAPTCHA v2 checkbox — `<div class="g-recaptcha" data-sitekey="…">`,
   * as the reference's register page renders it.
   *
   * The widget is Google's; the markup you see inside it (`rc-anchor-*`,
   * "I'm not a robot", the spinner and checkmark) is generated inside a
   * cross-origin iframe and cannot be reproduced by us — nor should it be. A
   * hand-built copy of that checkbox would look identical and verify nothing,
   * which is worse than having no bot defence, because it looks like one.
   *
   * So: with PUBLIC_RECAPTCHA_SITE_KEY set, this renders the real widget and the
   * real challenge. Without it, it renders an explicit unconfigured state rather
   * than a decorative fake.
   *
   * The reference's own key is public in its HTML. It is deliberately not used
   * here — it is theirs, tied to their domains, and revocable by them.
   */
  // Read once at module scope. `env` is a plain object, not reactive state, so
  // wrapping it in `$derived` bought nothing and read empty during SSR.
  const siteKey = PUBLIC_RECAPTCHA_SITE_KEY ?? '';
  const configured = siteKey.length > 0;

  function loadApi(node: HTMLElement) {
    if (!configured) return;
    if (document.querySelector('script[data-recaptcha]')) return;
    const s = document.createElement('script');
    s.src = 'https://www.google.com/recaptcha/api.js';
    s.async = true;
    s.defer = true;
    s.dataset.recaptcha = 'true';
    node.ownerDocument.head.appendChild(s);
  }
</script>

{#if configured}
  <div class="g-recaptcha" data-sitekey={siteKey} {@attach loadApi}></div>
{:else}
  <!-- Not a placeholder pretending to be a checkbox: it says what it is. -->
  <div class="recaptcha-unconfigured">
    <strong>Bot protection is not configured.</strong>
    Set <code>PUBLIC_RECAPTCHA_SITE_KEY</code> to enable reCAPTCHA on this form.
  </div>
{/if}

<style>
  .recaptcha-unconfigured {
    /* 304x78 is the size Google's widget occupies, so enabling it later does not
       reflow the form. */
    width: 304px;
    max-width: 100%;
    min-height: 78px;
    padding: 12px;
    border: 1px dashed rgb(193, 193, 193);
    border-radius: 3px;
    font-size: 12px;
    line-height: 1.5;
    color: rgb(85, 85, 85);
    background: rgb(249, 249, 249);
  }
  .recaptcha-unconfigured code {
    font-size: 11px;
  }
</style>
