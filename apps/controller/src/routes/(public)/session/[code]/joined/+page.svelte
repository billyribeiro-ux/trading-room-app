<script lang="ts">
  import '../../../../../auth.css';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Joined {data.roomName} — TradingRoomApp</title>
  <meta name="description" content={`Entry was accepted for the ${data.roomName} TradingRoomApp session.`} />
</svelte:head>

<div class="auth-wrapper">
  <div class="auth-column">
    <h1 class="auth-title">Welcome to the {data.roomName}</h1>
    <p class="auth-sub">You are in.</p>
    <div class="auth-card">
      <p>
        Entry accepted for <strong>{data.name}</strong>. The room itself is a separate
        application — this controller hands off to it rather than rendering a room it does
        not own.
      </p>
    </div>
  </div>
</div>
