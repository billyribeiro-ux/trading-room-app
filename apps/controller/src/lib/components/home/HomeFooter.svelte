<script lang="ts">
  /**
   * A real footer: brand block, navigation columns, legal links, and the stack line — closed out
   * by a giant watermark wordmark fading into the page's floor. Account links appear only when the
   * deployment actually serves accounts, mirroring the header's gating.
   */
  import { resolve } from '$app/paths';
  import { BRAND, FOOTER } from '#lib/content/home.js';

  interface Props {
    signedIn?: boolean;
    accountAccessEnabled?: boolean;
  }

  let { signedIn = false, accountAccessEnabled = false }: Props = $props();
</script>

<footer class="footer">
  <div class="hc-container">
    <div class="top">
      <div class="brand-block">
        <a href={resolve('/(public)')} class="brand">
          <svg viewBox="0 0 28 28" class="mark" aria-hidden="true">
            <line x1="6" y1="7" x2="6" y2="23" />
            <rect x="3.5" y="12" width="5" height="7" rx="1" class="down" />
            <line x1="14" y1="4" x2="14" y2="21" />
            <rect x="11.5" y="8" width="5" height="8" rx="1" />
            <line x1="22" y1="1" x2="22" y2="17" />
            <rect x="19.5" y="4" width="5" height="7" rx="1" />
          </svg>
          <span class="wordmark">{BRAND}</span>
        </a>
        <p class="tagline">{FOOTER.tagline}</p>
        <p class="stack">{FOOTER.stack}</p>
      </div>

      <nav class="columns" aria-label="Footer">
        <div class="column">
          <h3>Product</h3>
          <ul>
            <li><a href="#desk">The desk</a></li>
            <li><a href="#engineering">Engineering</a></li>
            <li><a href="#tape">Live tape</a></li>
            <li><a href="#voices">Voices</a></li>
          </ul>
        </div>

        <div class="column">
          <h3>Company</h3>
          <ul>
            <li><a href={resolve('/(public)/contact')}>Contact us</a></li>
            <li><a href={resolve('/(public)/privacy')}>Privacy policy</a></li>
            <li><a href={resolve('/(public)/terms')}>Terms of service</a></li>
          </ul>
        </div>

        {#if accountAccessEnabled}
          <div class="column">
            <h3>Account</h3>
            <ul>
              {#if signedIn}
                <li><a href={resolve('/(app)/account')}>My account</a></li>
              {:else}
                <li><a href={resolve('/(public)/login')}>Log in</a></li>
                <li><a href={resolve('/(app-auth)/register')}>Register</a></li>
              {/if}
            </ul>
          </div>
        {/if}
      </nav>
    </div>

    <div class="bottom">
      <span>{FOOTER.copyright}</span>
      <span class="heritage">{FOOTER.heritage}</span>
      <a href="#top" class="to-top">Back to top ↑</a>
    </div>
  </div>

  <p class="watermark" aria-hidden="true">{BRAND}</p>
</footer>

<style>
  .footer {
    position: relative;
    margin-top: var(--hc-section-gap);
    border-top: 1px solid var(--hc-line);
    background: linear-gradient(to bottom, var(--hc-bg-0), var(--hc-bg-1));
    overflow: clip;
  }

  .top {
    display: grid;
    grid-template-columns: 1.4fr 2fr;
    gap: clamp(32px, 6vw, 90px);
    padding-block: clamp(48px, 7vw, 84px) clamp(32px, 5vw, 56px);
  }

  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    text-decoration: none;
  }

  .mark {
    width: 24px;
    height: 24px;
  }

  .mark line {
    stroke: var(--hc-up);
    stroke-width: 1.6;
  }

  .mark rect {
    fill: var(--hc-up);
  }

  .mark line:first-of-type {
    stroke: var(--hc-down);
  }

  .mark rect.down {
    fill: var(--hc-down);
  }

  .wordmark {
    font-family: var(--hc-font-mono);
    font-size: 15px;
    font-weight: 600;
    color: var(--hc-ink);
  }

  .tagline {
    margin: 18px 0 0;
    max-width: 34ch;
    font-size: 15px;
    line-height: 1.6;
    color: var(--hc-ink-dim);
    text-wrap: pretty;
  }

  .stack {
    margin: 16px 0 0;
    font-family: var(--hc-font-mono);
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--hc-up);
  }

  .columns {
    display: grid;
    grid-template-columns: repeat(3, minmax(130px, 1fr));
    gap: clamp(24px, 4vw, 48px);
  }

  .column h3 {
    margin: 0 0 16px;
    font-family: var(--hc-font-mono);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--hc-ink-faint);
  }

  .column ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 11px;
  }

  .column a {
    font-size: 14.5px;
    text-decoration: none;
    color: var(--hc-ink-dim);
    transition: color 0.3s ease;
  }

  .column a:hover {
    color: var(--hc-up);
  }

  .bottom {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
    padding-block: 22px clamp(70px, 9vw, 130px);
    border-top: 1px solid var(--hc-line);
    font-family: var(--hc-font-mono);
    font-size: 11.5px;
    letter-spacing: 0.06em;
    color: var(--hc-ink-faint);
  }

  .heritage {
    color: var(--hc-ink-faint);
  }

  .to-top {
    margin-left: auto;
    text-decoration: none;
    color: var(--hc-ink-dim);
    transition: color 0.3s ease;
  }

  .to-top:hover {
    color: var(--hc-up);
  }

  .watermark {
    position: absolute;
    inset: auto 0 -0.34em;
    margin: 0;
    text-align: center;
    font-family: var(--hc-font-mono);
    font-weight: 600;
    font-size: clamp(64px, 12.5vw, 190px);
    letter-spacing: -0.04em;
    line-height: 1;
    color: transparent;
    background: linear-gradient(to bottom, rgba(151, 166, 198, 0.08), rgba(151, 166, 198, 0.01));
    background-clip: text;
    pointer-events: none;
    user-select: none;
    white-space: nowrap;
  }

  @media (max-width: 900px) {
    .top {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 560px) {
    .columns {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
