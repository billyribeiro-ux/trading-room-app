<script lang="ts">
  /**
   * The proof bar: four engineering claims that decode out of market noise as they enter the
   * viewport. The scramble runs on an aria-hidden span; the accessible value never mutates.
   */
  import { reveal, scramble } from '$lib/motion';
  import { STATS } from '$lib/content/home';
</script>

<section class="strip" aria-label="Platform proof points" {@attach reveal({ children: '.stat', stagger: 0.12 })}>
  <div class="hc-container grid">
    {#each STATS as stat (stat.label)}
      <div class="stat">
        <p class="value">
          <span aria-hidden="true" {@attach scramble(stat.value)}>{stat.value}</span>
          <span class="hc-sr">{stat.value}</span>
        </p>
        <p class="label">{stat.label}</p>
        <p class="detail">{stat.detail}</p>
      </div>
    {/each}
  </div>
</section>

<style>
  .strip {
    border-block: 1px solid var(--hc-line);
    background: linear-gradient(to bottom, rgba(13, 16, 26, 0.5), rgba(13, 16, 26, 0.14));
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
  }

  .stat {
    padding: clamp(30px, 4vw, 52px) clamp(18px, 2.4vw, 34px);
    border-left: 1px solid var(--hc-line);
  }

  .stat:first-child {
    border-left: none;
    padding-left: 0;
  }

  .value {
    margin: 0;
    font-family: var(--hc-font-mono);
    font-size: clamp(34px, 3.6vw, 52px);
    font-weight: 500;
    letter-spacing: -0.02em;
    color: var(--hc-up);
    text-shadow: 0 0 26px var(--hc-glow-up);
  }

  .label {
    margin: 10px 0 0;
    font-family: var(--hc-font-mono);
    font-size: 12px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--hc-ink);
  }

  .detail {
    margin: 12px 0 0;
    font-size: 14.5px;
    line-height: 1.55;
    color: var(--hc-ink-faint);
    text-wrap: pretty;
  }

  @media (max-width: 1000px) {
    .grid {
      grid-template-columns: 1fr 1fr;
    }

    .stat:nth-child(3) {
      border-left: none;
      padding-left: 0;
    }

    .stat:nth-child(-n + 2) {
      border-bottom: 1px solid var(--hc-line);
    }
  }

  @media (max-width: 560px) {
    .grid {
      grid-template-columns: 1fr;
    }

    .stat {
      border-left: none;
      padding-inline: 0;
      border-bottom: 1px solid var(--hc-line);
    }

    .stat:last-child {
      border-bottom: none;
    }
  }
</style>
