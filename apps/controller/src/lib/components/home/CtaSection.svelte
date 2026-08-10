<script lang="ts">
  /**
   * The closing shot: one panel, one ask. The aurora and grid echo the hero so the page ends on
   * the same visual note it opened with.
   */
  import { resolve } from '$app/paths';
  import { CTA } from '$lib/content/home';
  import { magnetic, reveal } from '$lib/motion';
</script>

<section class="cta" id="cta">
  <div class="hc-container">
    <div class="panel" {@attach reveal({ y: 40 })}>
      <div class="glow" aria-hidden="true"></div>
      <h2 class="hc-h2">{CTA.heading}</h2>
      <p class="hc-lede">{CTA.lede}</p>
      <div class="actions">
        <a href={resolve('/(public)/contact')} class="hc-btn hc-btn-primary" {@attach magnetic()}>{CTA.primary.label}</a>
        <a href={resolve('/(public)/contact')} class="hc-btn hc-btn-ghost">{CTA.secondary.label}</a>
      </div>
      <p class="fine">{CTA.finePrint}</p>
    </div>
  </div>
</section>

<style>
  .cta {
    padding-top: var(--hc-section-gap);
  }

  .panel {
    position: relative;
    overflow: clip;
    isolation: isolate;
    text-align: center;
    padding: clamp(56px, 9vw, 110px) clamp(24px, 6vw, 80px);
    border: 1px solid var(--hc-line-strong);
    border-radius: 16px;
    background: var(--hc-bg-1);
  }

  .glow {
    position: absolute;
    inset: -30%;
    z-index: -1;
    background:
      radial-gradient(45% 60% at 30% 20%, rgba(16, 185, 129, 0.09), transparent 70%),
      radial-gradient(40% 55% at 75% 80%, rgba(122, 169, 255, 0.07), transparent 70%);
    filter: blur(40px);
    animation: cta-drift 22s ease-in-out infinite alternate;
  }

  @keyframes cta-drift {
    from {
      transform: translate3d(-2%, -2%, 0);
    }
    to {
      transform: translate3d(2%, 2%, 0);
    }
  }

  .panel .hc-lede {
    margin-inline: auto;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 14px;
    margin-top: 40px;
  }

  .fine {
    margin: 26px 0 0;
    font-family: var(--hc-font-mono);
    font-size: 11.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--hc-ink-faint);
  }
</style>
