<script lang="ts">
  /**
   * "One surface. The whole desk." — the product, rendered live instead of screenshotted.
   * DeskMock and PhoneMock are decorative illustrations; every claim they dramatize is stated in
   * accessible copy here.
   */
  import { MOBILE, SHOWCASE, SHOWCASE_FEATURES } from '#lib/content/home.js';
  import { parallax, reveal } from '#lib/motion.js';
  import DeskMock from './DeskMock.svelte';
  import PhoneMock from './PhoneMock.svelte';
</script>

<section class="showcase" id="desk">
  <div class="hc-container">
    <header {@attach reveal()}>
      <p class="hc-eyebrow">{SHOWCASE.eyebrow}</p>
      <h2 class="hc-h2">{SHOWCASE.heading}</h2>
      <p class="hc-lede">{SHOWCASE.lede}</p>
    </header>

    <div class="stage">
      <div class="desk-col" {@attach reveal({ y: 46 })}>
        <DeskMock />
        <ul class="features">
          {#each SHOWCASE_FEATURES as feature (feature)}
            <li>{feature}</li>
          {/each}
        </ul>
      </div>

      <aside class="pocket" {@attach reveal({ y: 60, delay: 0.15 })}>
        <div {@attach parallax(26, -26)}>
          <PhoneMock />
        </div>
        <h3>{MOBILE.heading}</h3>
        <p>{MOBILE.body}</p>
      </aside>
    </div>
  </div>
</section>

<style>
  .showcase {
    padding-top: var(--hc-section-gap);
  }

  .stage {
    display: grid;
    grid-template-columns: 1.9fr 1fr;
    gap: clamp(28px, 4vw, 64px);
    align-items: start;
    margin-top: clamp(40px, 6vw, 72px);
  }

  .features {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 26px;
    margin: 26px 0 0;
    padding: 0;
    list-style: none;
  }

  .features li {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    font-family: var(--hc-font-mono);
    font-size: 12.5px;
    letter-spacing: 0.06em;
    color: var(--hc-ink-dim);
  }

  .features li::before {
    content: '';
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background:
      radial-gradient(circle at center, var(--hc-up) 0 3px, transparent 3.5px),
      radial-gradient(circle at center, var(--hc-glow-up) 0 6px, transparent 6.5px);
  }

  .pocket {
    position: sticky;
    top: 96px;
  }

  .pocket h3 {
    margin: 30px 0 0;
    font-family: var(--hc-font-display);
    font-weight: 300;
    font-size: clamp(22px, 2.2vw, 30px);
    line-height: 1.15;
    color: var(--hc-ink);
  }

  .pocket p {
    margin: 12px 0 0;
    font-size: 15.5px;
    color: var(--hc-ink-dim);
    text-wrap: pretty;
  }

  @media (max-width: 900px) {
    .stage {
      grid-template-columns: 1fr;
    }

    .pocket {
      position: static;
      max-width: 460px;
    }
  }
</style>
