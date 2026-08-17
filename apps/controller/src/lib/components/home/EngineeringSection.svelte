<script lang="ts">
  /**
   * "Engineered like a trading system." — six pillars, each traceable to this repository's actual
   * stack, over a wire diagram of the request path with a separate media lane. The diagram's
   * moving pulses are decoration; the lane text carries the claim.
   */
  import { ARCH_FLOW, ARCH_MEDIA_LANE, ENGINEERING, PILLARS } from '#lib/content/home.js';
  import { reveal } from '#lib/motion.js';
</script>

<section class="engineering" id="engineering">
  <div class="hc-container">
    <header {@attach reveal()}>
      <p class="hc-eyebrow">{ENGINEERING.eyebrow}</p>
      <h2 class="hc-h2">{ENGINEERING.heading}</h2>
      <p class="hc-lede">{ENGINEERING.lede}</p>
    </header>

    <div class="pillars" {@attach reveal({ children: '.pillar', stagger: 0.1 })}>
      {#each PILLARS as pillar (pillar.index)}
        <article class="pillar">
          <div class="pillar-head">
            <span class="index">{pillar.index}</span>
            <span class="tag">{pillar.tag}</span>
          </div>
          <h3>{pillar.title}</h3>
          <p>{pillar.body}</p>
        </article>
      {/each}
    </div>

    <div class="wire" {@attach reveal()}>
      <div class="flow" role="img" aria-label={`Request path: ${ARCH_FLOW.join(', then ')}`}>
        {#each ARCH_FLOW as node, i (node)}
          {#if i > 0}
            <span class="link" aria-hidden="true"></span>
          {/if}
          <span class="node">{node}</span>
        {/each}
      </div>
      <p class="lane">{ARCH_MEDIA_LANE}</p>
    </div>
  </div>
</section>

<style>
  .engineering {
    padding-top: var(--hc-section-gap);
  }

  .pillars {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1px;
    margin-top: clamp(40px, 6vw, 72px);
    background: var(--hc-line);
    border: 1px solid var(--hc-line);
    border-radius: 16px;
    overflow: hidden;
  }

  .pillar {
    padding: clamp(24px, 3vw, 40px);
    background: var(--hc-bg-1);
    transition:
      background-color 0.4s ease,
      box-shadow 0.4s ease;
  }

  .pillar:hover {
    background: var(--hc-bg-2);
    box-shadow: inset 0 0 0 1px var(--hc-line-strong);
  }

  .pillar-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 12px;
  }

  .index {
    font-family: var(--hc-font-mono);
    font-size: 12px;
    color: var(--hc-ink-faint);
  }

  .tag {
    font-family: var(--hc-font-mono);
    font-size: 10.5px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--hc-up);
  }

  .pillar h3 {
    margin: 18px 0 0;
    font-family: var(--hc-font-display);
    font-weight: 300;
    font-size: clamp(20px, 1.9vw, 26px);
    color: var(--hc-ink);
  }

  .pillar p {
    margin: 12px 0 0;
    font-size: 14.5px;
    line-height: 1.6;
    color: var(--hc-ink-dim);
    text-wrap: pretty;
  }

  /* the wire */
  .wire {
    margin-top: clamp(28px, 4vw, 48px);
    border: 1px solid var(--hc-line);
    border-radius: 16px;
    padding: clamp(20px, 3vw, 32px);
    background:
      radial-gradient(60% 120% at 50% 0%, rgba(122, 169, 255, 0.05), transparent),
      var(--hc-bg-1);
  }

  .flow {
    display: flex;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .node {
    padding: 9px 16px;
    border: 1px solid var(--hc-line-strong);
    border-radius: 999px;
    font-family: var(--hc-font-mono);
    font-size: 11.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--hc-ink);
    white-space: nowrap;
    background: var(--hc-bg-0);
  }

  /* The moving dashes ride a transform on an oversized pseudo-element, not background-position:
     a permanent animation must composite, never repaint. */
  .link {
    position: relative;
    flex: 1;
    min-width: 34px;
    height: 1px;
    overflow: hidden;
    opacity: 0.75;
  }

  .link::after {
    content: '';
    position: absolute;
    inset: 0 0 0 -14px;
    background-image: linear-gradient(90deg, var(--hc-up) 0 6px, transparent 6px 14px);
    background-size: 14px 1px;
    animation: wire-flow 0.9s linear infinite;
    will-change: transform;
  }

  @keyframes wire-flow {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(14px);
    }
  }

  .lane {
    margin: 18px 0 0;
    font-family: var(--hc-font-mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--hc-ink-faint);
  }

  @media (max-width: 980px) {
    .pillars {
      grid-template-columns: 1fr 1fr;
    }
  }

  @media (max-width: 620px) {
    .pillars {
      grid-template-columns: 1fr;
    }

    .flow {
      flex-direction: column;
      align-items: stretch;
    }

    .node {
      text-align: center;
    }

    .link {
      width: 1px;
      min-width: 0;
      height: 22px;
      margin-inline: auto;
    }

    .link::after {
      inset: -14px 0 0;
      background-image: linear-gradient(180deg, var(--hc-up) 0 6px, transparent 6px 14px);
      background-size: 1px 14px;
      animation-name: wire-flow-down;
    }
  }

  @keyframes wire-flow-down {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(14px);
    }
  }
</style>
