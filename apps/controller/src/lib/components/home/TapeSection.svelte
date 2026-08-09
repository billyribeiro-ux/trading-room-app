<script lang="ts">
  /**
   * "Built for the tape." — a D3-driven price chart streaming seeded, simulated ticks, rendered
   * live in the browser. One series, one axis, recessive grid, a direct last-price label, and a
   * crosshair tooltip on hover. The feed is labeled simulated everywhere it appears.
   *
   * SSR renders the full initial series (deterministic seed), so the chart is complete without
   * JavaScript; ticking starts only when the section is in view and motion is allowed, and stops
   * the moment either is no longer true.
   */
  import type { Attachment } from 'svelte/attachments';
  import { max, min } from 'd3-array';
  import { scaleLinear } from 'd3-scale';
  import { area, curveMonotoneX, line } from 'd3-shape';
  import { SIMULATED_FEED_LABEL, TAPE, TAPE_SPARKLINE_SYMBOLS } from '$lib/content/home';
  import { prefersReducedMotion, reveal } from '$lib/motion';
  import { createWalk } from './market-feed';

  const W = 980;
  const H = 380;
  const M = { top: 22, right: 92, bottom: 28, left: 14 };
  const N = 220;

  const walk = createWalk(0x7a9e2026, 18240, 6.2);
  let points = $state(walk.series(N));

  const SPARK_N = 60;
  const sparkWalks = TAPE_SPARKLINE_SYMBOLS.map((symbol, i) =>
    createWalk(0x1000 + i * 977, [5610, 18240, 61240, 1.0842][i], [4.2, 13, 160, 0.0011][i])
  );
  let sparks = $state(sparkWalks.map((w) => w.series(SPARK_N)));

  /**
   * Tick only while the section is on screen and motion is allowed. The intervals live inside the
   * attachment and start/stop from the observer's callbacks — state is written from event
   * callbacks, exactly like any other input handler, with no effect in the loop.
   */
  const watchViewport: Attachment = (node) => {
    if (prefersReducedMotion()) return undefined;

    let tick: ReturnType<typeof setInterval> | undefined;
    let sparkTick: ReturnType<typeof setInterval> | undefined;

    function stop() {
      clearInterval(tick);
      clearInterval(sparkTick);
      tick = undefined;
      sparkTick = undefined;
    }

    function start() {
      if (tick !== undefined) return;
      tick = setInterval(() => {
        points = [...points.slice(1), walk.next()];
      }, 130);
      sparkTick = setInterval(() => {
        sparks = sparks.map((series, i) => [...series.slice(1), sparkWalks[i].next()]);
      }, 420);
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) start();
      else stop();
    });
    observer.observe(node);

    return () => {
      observer.disconnect();
      stop();
    };
  };

  const x = scaleLinear([0, N - 1], [M.left, W - M.right]);
  let lo = $derived(min(points) ?? 0);
  let hi = $derived(max(points) ?? 1);
  let pad = $derived((hi - lo) * 0.18 + 1);
  let y = $derived(scaleLinear([lo - pad, hi + pad], [H - M.bottom, M.top]));

  let linePath = $derived(
    line<number>()
      .x((_, i) => x(i))
      .y((d) => y(d))
      .curve(curveMonotoneX)(points) ?? ''
  );
  let areaPath = $derived(
    area<number>()
      .x((_, i) => x(i))
      .y0(H - M.bottom)
      .y1((d) => y(d))
      .curve(curveMonotoneX)(points) ?? ''
  );

  let last = $derived(points[points.length - 1]);
  let sessionUp = $derived(last >= points[0]);
  let gridTicks = $derived(y.ticks(4));

  function formatPrice(value: number): string {
    return value.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }

  /* Crosshair tooltip. */
  let hover = $state<{ index: number; price: number } | null>(null);

  function onPointerMove(event: PointerEvent) {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const index = Math.max(0, Math.min(N - 1, Math.round(x.invert(((event.clientX - rect.left) / rect.width) * W))));
    hover = { index, price: points[index] };
  }

  function onPointerLeave() {
    hover = null;
  }

  function sparkPath(series: number[]): string {
    const sLo = Math.min(...series);
    const sHi = Math.max(...series);
    const span = sHi - sLo || 1;
    return series
      .map((v, i) => `${i === 0 ? 'M' : 'L'}${((i * 150) / (SPARK_N - 1)).toFixed(1)},${(40 - ((v - sLo) / span) * 34).toFixed(1)}`)
      .join(' ');
  }

  function sparkDelta(series: number[]): number {
    return ((series[series.length - 1] - series[0]) / series[0]) * 100;
  }
</script>

<section class="tape-section" id="tape" {@attach watchViewport}>
  <div class="hc-container">
    <header {@attach reveal()}>
      <p class="hc-eyebrow">{TAPE.eyebrow}</p>
      <h2 class="hc-h2">{TAPE.heading}</h2>
      <p class="hc-lede">{TAPE.lede}</p>
    </header>

    <figure class="board" {@attach reveal({ y: 44 })}>
      <figcaption class="board-head">
        <span class="board-symbol">NQ · SIM</span>
        <span class="board-price" class:down={!sessionUp}>{formatPrice(last)}</span>
        <span class="board-range">
          H {formatPrice(hi)} · L {formatPrice(lo)}
        </span>
        <span class="hc-sim">{SIMULATED_FEED_LABEL}</span>
      </figcaption>

      <svg
        viewBox="0 0 {W} {H}"
        class="chart"
        role="img"
        aria-label="Simulated futures price chart streaming live ticks, currently {formatPrice(last)}"
        onpointermove={onPointerMove}
        onpointerleave={onPointerLeave}
      >
        <defs>
          <linearGradient id="tape-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="var(--hc-up)" stop-opacity="0.26" />
            <stop offset="1" stop-color="var(--hc-up)" stop-opacity="0" />
          </linearGradient>
        </defs>

        {#each gridTicks as tick (tick)}
          <line x1={M.left} x2={W - M.right} y1={y(tick)} y2={y(tick)} class="grid" />
          <text x={M.left + 4} y={y(tick) - 6} class="grid-label">{formatPrice(tick)}</text>
        {/each}

        <path d={areaPath} fill="url(#tape-fill)" />
        <path d={linePath} class="line" />

        <line x1={M.left} x2={W - M.right} y1={y(last)} y2={y(last)} class="last-line" />
        <g transform="translate({W - M.right + 8}, {y(last)})">
          <rect x="0" y="-13" width="78" height="26" rx="6" class="price-chip" class:down={!sessionUp} />
          <text x="39" y="4" class="price-chip-text">{formatPrice(last)}</text>
        </g>
        <circle cx={x(N - 1)} cy={y(last)} r="4" class="pulse-dot" />

        {#if hover}
          <line x1={x(hover.index)} x2={x(hover.index)} y1={M.top} y2={H - M.bottom} class="crosshair" />
          <circle cx={x(hover.index)} cy={y(hover.price)} r="4.5" class="hover-dot" />
          <g transform="translate({Math.min(x(hover.index) + 10, W - M.right - 92)}, {Math.max(y(hover.price) - 34, M.top)})">
            <rect width="86" height="26" rx="6" class="tip" />
            <text x="43" y="17" class="tip-text">{formatPrice(hover.price)}</text>
          </g>
        {/if}
      </svg>

      <div class="sparks">
        {#each TAPE_SPARKLINE_SYMBOLS as symbol, i (symbol)}
          {@const series = sparks[i]}
          {@const delta = sparkDelta(series)}
          <div class="spark-chip">
            <div class="spark-meta">
              <span class="spark-symbol">{symbol}</span>
              <span class="spark-delta" class:down={delta < 0}>
                {delta >= 0 ? '+' : ''}{delta.toFixed(2)}%
              </span>
            </div>
            <svg viewBox="0 0 150 44" class="spark" aria-hidden="true">
              <path d={sparkPath(series)} class:down={delta < 0} />
            </svg>
          </div>
        {/each}
      </div>
    </figure>
  </div>
</section>

<style>
  .tape-section {
    padding-top: var(--hc-section-gap);
  }

  .board {
    margin: clamp(40px, 6vw, 72px) 0 0;
    border: 1px solid var(--hc-line-strong);
    border-radius: 16px;
    background:
      radial-gradient(70% 90% at 50% 0%, rgba(34, 229, 140, 0.05), transparent),
      var(--hc-bg-1);
    box-shadow: 0 40px 90px -50px rgba(0, 0, 0, 0.9);
    overflow: hidden;
  }

  .board-head {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    padding: 16px 20px;
    border-bottom: 1px solid var(--hc-line);
    font-family: var(--hc-font-mono);
  }

  .board-symbol {
    font-size: 12px;
    letter-spacing: 0.16em;
    color: var(--hc-ink);
  }

  .board-price {
    font-size: 20px;
    font-weight: 600;
    color: var(--hc-up);
    font-variant-numeric: tabular-nums;
  }

  .board-price.down {
    color: var(--hc-down);
  }

  .board-range {
    font-size: 11px;
    color: var(--hc-ink-faint);
    font-variant-numeric: tabular-nums;
  }

  .board-head .hc-sim {
    margin-left: auto;
  }

  .chart {
    display: block;
    width: 100%;
    height: auto;
    touch-action: pan-y;
  }

  .grid {
    stroke: var(--hc-line);
    stroke-width: 1;
  }

  .grid-label {
    fill: var(--hc-ink-faint);
    font-family: var(--hc-font-mono);
    font-size: 10px;
  }

  .line {
    fill: none;
    stroke: var(--hc-up);
    stroke-width: 2;
    filter: drop-shadow(0 0 8px var(--hc-glow-up));
  }

  .last-line {
    stroke: var(--hc-line-strong);
    stroke-width: 1;
    stroke-dasharray: 4 4;
  }

  .price-chip {
    fill: var(--hc-up);
  }

  .price-chip.down {
    fill: var(--hc-down);
  }

  .price-chip-text {
    fill: var(--hc-up-ink);
    font-family: var(--hc-font-mono);
    font-size: 12px;
    font-weight: 600;
    text-anchor: middle;
    font-variant-numeric: tabular-nums;
  }

  .pulse-dot {
    fill: var(--hc-up-bright);
    animation: trhome-pulse 1.4s ease-in-out infinite;
  }

  .crosshair {
    stroke: var(--hc-line-strong);
    stroke-width: 1;
  }

  .hover-dot {
    fill: none;
    stroke: var(--hc-ink);
    stroke-width: 1.5;
  }

  .tip {
    fill: var(--hc-bg-2);
    stroke: var(--hc-line-strong);
  }

  .tip-text {
    fill: var(--hc-ink);
    font-family: var(--hc-font-mono);
    font-size: 11.5px;
    text-anchor: middle;
    font-variant-numeric: tabular-nums;
  }

  .sparks {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    border-top: 1px solid var(--hc-line);
  }

  .spark-chip {
    padding: 14px 18px 10px;
    border-left: 1px solid var(--hc-line);
  }

  .spark-chip:first-child {
    border-left: none;
  }

  .spark-meta {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-family: var(--hc-font-mono);
  }

  .spark-symbol {
    font-size: 11px;
    letter-spacing: 0.12em;
    color: var(--hc-ink);
  }

  .spark-delta {
    font-size: 11px;
    color: var(--hc-up);
    font-variant-numeric: tabular-nums;
  }

  .spark-delta.down {
    color: var(--hc-down);
  }

  .spark {
    width: 100%;
    height: 40px;
    margin-top: 6px;
  }

  .spark path {
    fill: none;
    stroke: var(--hc-up);
    stroke-width: 1.4;
    opacity: 0.9;
  }

  .spark path.down {
    stroke: var(--hc-down);
  }

  @media (max-width: 760px) {
    .sparks {
      grid-template-columns: 1fr 1fr;
    }

    .spark-chip:nth-child(3) {
      border-left: none;
    }

    .spark-chip:nth-child(-n + 2) {
      border-bottom: 1px solid var(--hc-line);
    }
  }
</style>
