<script lang="ts">
  /**
   * The pocket desk: a phone frame with a trade-alert push notification cycling in, over a live
   * sparkline. Replaces the legacy phone screenshot with markup that animates. Decorative —
   * the surrounding section carries the accessible copy.
   */
  import { createWalk } from './market-feed';

  const walk = createWalk(0xa11e47, 18240, 5);
  const points = walk.series(48);
  const lo = Math.min(...points);
  const hi = Math.max(...points);
  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * (132 / 47)).toFixed(1)},${(44 - ((p - lo) / (hi - lo)) * 40).toFixed(1)}`)
    .join(' ');
</script>

<div class="phone" aria-hidden="true">
  <div class="notch"></div>
  <div class="screen">
    <div class="status">
      <span>21:47</span>
      <span class="carrier">LTE ▪▪▪▫</span>
    </div>

    <div class="push">
      <span class="push-head"><span class="app-dot"></span>tradingroom.app · now</span>
      <strong>TRADE ALERT — LONG NQ 18,242</strong>
      <span class="push-body">Stop 18,196 · Target 18,320 · Maya K</span>
    </div>

    <div class="widget">
      <div class="widget-head">
        <span class="sym">NQ · SIM</span>
        <span class="price">18,243.5</span>
        <span class="delta">+0.68%</span>
      </div>
      <svg viewBox="0 0 132 48" class="spark">
        <path d={path} />
      </svg>
      <div class="room-row">
        <span class="live-dot"></span>
        Momentum Desk is live · 132 in room
      </div>
    </div>
  </div>
</div>

<style>
  .phone {
    position: relative;
    width: min(100%, 250px);
    aspect-ratio: 9 / 18.5;
    margin-inline: auto;
    border: 1px solid var(--hc-line-strong);
    border-radius: 34px;
    padding: 10px;
    background: linear-gradient(160deg, rgba(151, 166, 198, 0.12), rgba(151, 166, 198, 0.03));
    box-shadow:
      0 34px 80px -36px rgba(0, 0, 0, 0.85),
      0 0 50px -26px var(--hc-glow-up);
  }

  .notch {
    position: absolute;
    top: 18px;
    left: 50%;
    transform: translateX(-50%);
    width: 74px;
    height: 18px;
    border-radius: 12px;
    background: #000;
    z-index: 2;
  }

  .screen {
    height: 100%;
    border-radius: 26px;
    background:
      radial-gradient(90% 50% at 50% 0%, rgba(122, 169, 255, 0.09), transparent),
      var(--hc-bg-0);
    border: 1px solid var(--hc-line);
    padding: 46px 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;
    font-family: var(--hc-font-mono);
  }

  .status {
    display: flex;
    justify-content: space-between;
    font-size: 9.5px;
    color: var(--hc-ink-dim);
  }

  .push {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 11px 12px;
    border-radius: 14px;
    border: 1px solid var(--hc-glow-up);
    background: rgba(34, 229, 140, 0.09);
    backdrop-filter: blur(6px);
    box-shadow: 0 0 30px -10px var(--hc-glow-up);
    animation: push-in 7s cubic-bezier(0.22, 1, 0.36, 1) infinite;
  }

  .push-head {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 8.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--hc-ink-faint);
  }

  .app-dot {
    width: 7px;
    height: 7px;
    border-radius: 2.5px;
    background: var(--hc-up);
  }

  .push strong {
    font-size: 10.5px;
    letter-spacing: 0.03em;
    color: var(--hc-up-bright);
  }

  .push-body {
    font-size: 9.5px;
    color: var(--hc-ink-dim);
  }

  @keyframes push-in {
    0% {
      opacity: 0;
      transform: translateY(-24px) scale(0.96);
    }
    7%,
    88% {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    96%,
    100% {
      opacity: 0;
      transform: translateY(-10px) scale(0.98);
    }
  }

  .widget {
    margin-top: auto;
    border: 1px solid var(--hc-line);
    border-radius: 14px;
    padding: 12px;
    background: rgba(13, 16, 26, 0.6);
  }

  .widget-head {
    display: flex;
    align-items: baseline;
    gap: 8px;
    font-size: 10px;
  }

  .sym {
    color: var(--hc-ink);
    font-weight: 600;
  }

  .price {
    color: var(--hc-ink-dim);
  }

  .delta {
    margin-left: auto;
    color: var(--hc-up);
  }

  .spark {
    width: 100%;
    height: 48px;
    margin-top: 8px;
  }

  .spark path {
    fill: none;
    stroke: var(--hc-up);
    stroke-width: 1.4;
    filter: drop-shadow(0 0 5px var(--hc-glow-up));
  }

  .room-row {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--hc-line);
    font-size: 9px;
    color: var(--hc-ink-faint);
  }

  .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--hc-up);
    animation: trhome-pulse 2.2s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    .push {
      animation: none;
    }
  }
</style>
