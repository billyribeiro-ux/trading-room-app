<script lang="ts">
  /**
   * The desk, drawn — not photographed. A stylized rendering of the trading room built from pure
   * markup: browser chrome, member roster, a live candlestick stage with presenter voice bars, and
   * a chat rail whose messages loop in on a GSAP timeline. It replaces the legacy page's
   * screenshot, so the illustration can never rot out of sync with the product's look.
   *
   * The whole panel is decorative (`aria-hidden`): the surrounding section carries the accessible
   * copy. The candles come from the same seeded walk as the tape section — deterministic on every
   * load.
   */
  import type { Attachment } from 'svelte/attachments';
  import { gsap, prefersReducedMotion } from '$lib/motion';
  import { createWalk } from './market-feed';

  const CANDLES = 30;
  const walk = createWalk(0x5eed, 100, 2.1);
  const closes = walk.series(CANDLES + 1);
  const candles = Array.from({ length: CANDLES }, (_, i) => {
    const open = closes[i];
    const close = closes[i + 1];
    const high = Math.max(open, close) + 0.9;
    const low = Math.min(open, close) - 0.9;
    return { open, close, high, low, up: close >= open };
  });
  const lo = Math.min(...candles.map((c) => c.low));
  const hi = Math.max(...candles.map((c) => c.high));
  const plotY = (v: number) => 6 + ((hi - v) / (hi - lo)) * 108;

  const roster = [
    { initials: 'MK', name: 'Maya K', role: 'Head trader', live: true },
    { initials: 'DV', name: 'Dev O', role: 'Futures', live: true },
    { initials: 'JT', name: 'Jo T', role: 'Options', live: false },
    { initials: 'RS', name: 'Ram S', role: 'Swing', live: false }
  ];

  /* Trade talk only — no product endorsements from invented people. Praise belongs to the real,
     verbatim quotes in VoicesSection. */
  const messages = [
    { who: 'Maya K', tag: 'HEAD TRADER', text: 'Watching 18,240 — if we reclaim it, I’m long.' },
    { alert: true, text: 'LONG NQ 18,242 · STOP 18,196 · T1 18,320' },
    { who: 'Dev O', tag: 'FUTURES', text: 'Filled 18,244. Size on.' },
    { who: 'Jo T', tag: 'OPTIONS', text: 'Taking half off into 18,290.' },
    { who: 'Ram S', tag: 'SWING', text: 'Stop to breakeven. Nice call.' }
  ];

  /**
   * The chat rail's message loop — client-only by construction, torn down with the element, and
   * paused offscreen so an infinite timeline never keeps the rAF ticker warm for the whole session.
   */
  const chatLoop: Attachment = (node) => {
    if (prefersReducedMotion()) return undefined;
    const items = node.querySelectorAll('.msg');
    const timeline = gsap.timeline({ repeat: -1, repeatDelay: 3.2 });
    timeline.from(items, { autoAlpha: 0, y: 16, duration: 0.55, stagger: 1.15, ease: 'power3.out' });
    const observer = new IntersectionObserver((entries) => {
      if (entries[entries.length - 1].isIntersecting) timeline.play();
      else timeline.pause();
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      timeline.kill();
      gsap.set(items, { clearProps: 'all' });
    };
  };
</script>

<div class="desk" aria-hidden="true">
  <div class="chrome">
    <span class="dot"></span><span class="dot"></span><span class="dot"></span>
    <span class="address">desk.yourbrand.com <em>· powered by tradingroom.app</em></span>
    <span class="secure">TLS</span>
  </div>

  <div class="bar">
    <span class="room">MOMENTUM DESK</span>
    <span class="live">LIVE</span>
    <span class="sim-tag">SIMULATED</span>
    <span class="count">132 in room</span>
  </div>

  <div class="body">
    <div class="roster">
      {#each roster as member (member.initials)}
        <div class="member">
          <span class="avatar">{member.initials}</span>
          <span class="who">
            <span class="name">{member.name}<span class="presence" class:on={member.live}></span></span>
            <span class="role">{member.role}</span>
          </span>
        </div>
      {/each}
      <p class="more">+128 members</p>
    </div>

    <div class="stage">
      <svg viewBox="0 0 300 120" preserveAspectRatio="none" class="chart">
        {#each candles as candle, i (i)}
          <line
            x1={8 + i * 9.8}
            x2={8 + i * 9.8}
            y1={plotY(candle.high)}
            y2={plotY(candle.low)}
            class:up={candle.up}
            class="wick"
          />
          <rect
            x={5.5 + i * 9.8}
            y={plotY(Math.max(candle.open, candle.close))}
            width="5"
            height={Math.max(1.6, Math.abs(plotY(candle.open) - plotY(candle.close)))}
            class:up={candle.up}
            class="candle"
          />
        {/each}
        <line x1="0" x2="300" y1={plotY(closes[CANDLES])} y2={plotY(closes[CANDLES])} class="last" />
      </svg>
      <div class="presenter">
        <span class="avatar small">MK</span>
        <span class="sharing">Maya K · sharing screen</span>
        <span class="eq">
          <i></i><i></i><i></i><i></i><i></i>
        </span>
      </div>
    </div>

    <div class="chat" {@attach chatLoop}>
      {#each messages as message, i (i)}
        {#if message.alert}
          <div class="msg alert">
            <span class="alert-tag">TRADE ALERT</span>
            {message.text}
          </div>
        {:else}
          <div class="msg">
            <span class="meta"><strong>{message.who}</strong> <span class="tag">{message.tag}</span></span>
            {message.text}
          </div>
        {/if}
      {/each}
    </div>
  </div>
</div>

<style>
  .desk {
    border: 1px solid var(--hc-line-strong);
    border-radius: 14px;
    background: var(--hc-bg-1);
    box-shadow:
      0 40px 90px -40px rgba(0, 0, 0, 0.85),
      0 0 60px -30px var(--hc-glow-accent);
    overflow: hidden;
    font-family: var(--hc-font-mono);
  }

  /* chrome */
  .chrome {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 11px 14px;
    border-bottom: 1px solid var(--hc-line);
    background: rgba(151, 166, 198, 0.05);
  }

  .dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: var(--hc-line-strong);
  }

  .dot:first-child {
    background: var(--hc-down);
    opacity: 0.7;
  }

  .address {
    flex: 1;
    margin-left: 10px;
    padding: 5px 12px;
    border: 1px solid var(--hc-line);
    border-radius: 7px;
    font-size: 10.5px;
    color: var(--hc-ink-dim);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .address em {
    font-style: normal;
    color: var(--hc-ink-faint);
  }

  .secure {
    font-size: 9px;
    letter-spacing: 0.14em;
    color: var(--hc-up);
    border: 1px solid var(--hc-glow-up);
    border-radius: 4px;
    padding: 2px 6px;
  }

  /* room bar */
  .bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    border-bottom: 1px solid var(--hc-line);
    font-size: 10.5px;
    letter-spacing: 0.16em;
  }

  .room {
    color: var(--hc-ink);
  }

  .live {
    color: var(--hc-down);
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .live::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--hc-down);
    animation: trhome-pulse 1.6s ease-in-out infinite;
  }

  .sim-tag {
    padding: 2px 8px;
    border: 1px solid var(--hc-line);
    border-radius: 4px;
    font-size: 8.5px;
    letter-spacing: 0.18em;
    color: var(--hc-ink-faint);
  }

  .count {
    margin-left: auto;
    color: var(--hc-ink-faint);
    letter-spacing: 0.06em;
  }

  /* body grid */
  .body {
    display: grid;
    grid-template-columns: 158px 1.55fr 1.2fr;
    min-height: 300px;
  }

  /* roster */
  .roster {
    padding: 14px;
    border-right: 1px solid var(--hc-line);
    display: flex;
    flex-direction: column;
    gap: 13px;
  }

  .member {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    flex-shrink: 0;
    border-radius: 50%;
    font-size: 10px;
    color: var(--hc-ink);
    background: linear-gradient(135deg, rgba(122, 169, 255, 0.35), rgba(139, 123, 255, 0.25));
    border: 1px solid var(--hc-line-strong);
  }

  .member:nth-child(2) .avatar {
    background: linear-gradient(135deg, rgba(34, 229, 140, 0.32), rgba(122, 169, 255, 0.22));
  }

  .member:nth-child(3) .avatar {
    background: linear-gradient(135deg, rgba(255, 77, 97, 0.28), rgba(139, 123, 255, 0.22));
  }

  .member:nth-child(4) .avatar {
    background: linear-gradient(135deg, rgba(139, 123, 255, 0.3), rgba(34, 229, 140, 0.2));
  }

  .who {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .name {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--hc-ink);
    white-space: nowrap;
  }

  .presence {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--hc-ink-faint);
  }

  .presence.on {
    background: var(--hc-up);
    box-shadow: 0 0 8px var(--hc-glow-up);
  }

  .role {
    font-size: 9px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--hc-ink-faint);
  }

  .more {
    margin: auto 0 0;
    font-size: 10px;
    color: var(--hc-ink-faint);
  }

  /* stage */
  .stage {
    display: flex;
    flex-direction: column;
    border-right: 1px solid var(--hc-line);
    background:
      radial-gradient(80% 60% at 50% 0%, rgba(34, 229, 140, 0.05), transparent),
      var(--hc-bg-0);
  }

  .chart {
    flex: 1;
    width: 100%;
    min-height: 190px;
  }

  .wick {
    stroke: var(--hc-down);
    stroke-width: 1;
    opacity: 0.85;
  }

  .candle {
    fill: var(--hc-down);
    opacity: 0.9;
  }

  .wick.up {
    stroke: var(--hc-up);
  }

  .candle.up {
    fill: var(--hc-up);
  }

  .last {
    stroke: var(--hc-accent);
    stroke-width: 0.7;
    stroke-dasharray: 3 3;
    opacity: 0.8;
  }

  .presenter {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 14px;
    border-top: 1px solid var(--hc-line);
  }

  .avatar.small {
    width: 24px;
    height: 24px;
    font-size: 8.5px;
  }

  .sharing {
    font-size: 10.5px;
    color: var(--hc-ink-dim);
  }

  .eq {
    display: inline-flex;
    align-items: flex-end;
    gap: 2.5px;
    height: 14px;
    margin-left: auto;
  }

  .eq i {
    width: 3px;
    border-radius: 2px;
    background: var(--hc-up);
    animation: eq-bounce 1.1s ease-in-out infinite;
  }

  .eq i:nth-child(1) {
    height: 40%;
    animation-delay: 0s;
  }
  .eq i:nth-child(2) {
    height: 90%;
    animation-delay: 0.15s;
  }
  .eq i:nth-child(3) {
    height: 60%;
    animation-delay: 0.3s;
  }
  .eq i:nth-child(4) {
    height: 100%;
    animation-delay: 0.45s;
  }
  .eq i:nth-child(5) {
    height: 50%;
    animation-delay: 0.6s;
  }

  @keyframes eq-bounce {
    0%,
    100% {
      transform: scaleY(0.45);
    }
    50% {
      transform: scaleY(1);
    }
  }

  /* chat */
  .chat {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 10px;
    padding: 14px;
  }

  .msg {
    font-size: 11px;
    line-height: 1.5;
    color: var(--hc-ink-dim);
    font-family: var(--hc-font-body);
  }

  .meta {
    display: block;
    margin-bottom: 2px;
    font-family: var(--hc-font-mono);
    font-size: 10px;
    color: var(--hc-ink);
  }

  .tag {
    margin-left: 6px;
    font-size: 8px;
    letter-spacing: 0.14em;
    color: var(--hc-accent);
  }

  .msg.alert {
    padding: 9px 11px;
    border: 1px solid var(--hc-glow-up);
    border-radius: 8px;
    background: rgba(34, 229, 140, 0.08);
    font-family: var(--hc-font-mono);
    font-size: 10.5px;
    letter-spacing: 0.04em;
    color: var(--hc-up-bright);
    box-shadow: 0 0 24px -8px var(--hc-glow-up);
  }

  .alert-tag {
    display: block;
    margin-bottom: 4px;
    font-size: 8px;
    letter-spacing: 0.2em;
    color: var(--hc-up);
  }

  @media (max-width: 860px) {
    .roster {
      display: none;
    }

    .body {
      grid-template-columns: 1.4fr 1.1fr;
    }
  }

  @media (max-width: 560px) {
    .body {
      grid-template-columns: 1fr;
    }

    .stage {
      border-right: none;
      border-bottom: 1px solid var(--hc-line);
    }

    .chart {
      min-height: 140px;
    }
  }
</style>
