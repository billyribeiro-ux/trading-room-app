<script lang="ts">
  /**
   * The verbatim member quotes from the original capture, on two counter-scrolling rails.
   * The first pass of each rail is the real content; the second is an aria-hidden duplicate that
   * closes the marquee loop. Under prefers-reduced-motion the rails become static wrapped rows and
   * the duplicates disappear, so every quote stays readable.
   */
  import { TESTIMONIALS, VOICES } from '$lib/content/home';
  import { reveal } from '$lib/motion';

  const rows = [TESTIMONIALS.slice(0, 4), TESTIMONIALS.slice(4)];
</script>

<section class="voices" id="voices">
  <div class="hc-container">
    <header {@attach reveal()}>
      <p class="hc-eyebrow">{VOICES.eyebrow}</p>
      <h2 class="hc-h2">{VOICES.heading}</h2>
      <p class="hc-lede">{VOICES.note}</p>
    </header>
  </div>

  <div class="rails" {@attach reveal({ y: 24 })}>
    {#each rows as row, rowIndex (rowIndex)}
      <div class="rail" class:reverse={rowIndex === 1}>
        <div class="rail-track">
          {#each [0, 1] as pass (pass)}
            <div class="rail-run" aria-hidden={pass === 1}>
              {#each row as quote (quote)}
                <figure class="card">
                  <span class="mark" aria-hidden="true">“</span>
                  <blockquote>{quote}</blockquote>
                  <figcaption>Member comment</figcaption>
                </figure>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</section>

<style>
  .voices {
    padding-top: var(--hc-section-gap);
  }

  .rails {
    display: flex;
    flex-direction: column;
    gap: 18px;
    margin-top: clamp(40px, 6vw, 64px);
  }

  .rail {
    overflow: hidden;
    mask-image: linear-gradient(to right, transparent, #000 8%, #000 92%, transparent);
  }

  .rail-track {
    display: flex;
    width: max-content;
    animation: trhome-marquee 58s linear infinite;
  }

  .rail.reverse .rail-track {
    animation-direction: reverse;
  }

  .rail:hover .rail-track,
  .rail:focus-within .rail-track {
    animation-play-state: paused;
  }

  .rail-run {
    display: flex;
    gap: 18px;
    padding-right: 18px;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 330px;
    margin: 0;
    padding: 22px 24px;
    border: 1px solid var(--hc-line);
    border-radius: 14px;
    background: var(--hc-bg-1);
    transition:
      border-color 0.35s ease,
      box-shadow 0.35s ease;
  }

  .card:hover {
    border-color: var(--hc-line-strong);
    box-shadow: 0 0 40px -18px var(--hc-glow-up);
  }

  .mark {
    font-family: var(--hc-font-display);
    font-size: 34px;
    line-height: 0.6;
    color: var(--hc-up);
  }

  blockquote {
    margin: 0;
    font-size: 16px;
    line-height: 1.5;
    color: var(--hc-ink);
    text-wrap: pretty;
  }

  figcaption {
    margin-top: 6px;
    font-family: var(--hc-font-mono);
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--hc-ink-faint);
  }

  @media (prefers-reduced-motion: reduce) {
    .rail {
      mask-image: none;
    }

    .rail-track {
      animation: none;
      width: auto;
    }

    .rail-run {
      flex-wrap: wrap;
    }

    .rail-run[aria-hidden='true'] {
      display: none;
    }

    .card {
      width: min(330px, 100%);
    }

    .rails {
      padding-inline: var(--hc-gutter);
    }
  }
</style>
