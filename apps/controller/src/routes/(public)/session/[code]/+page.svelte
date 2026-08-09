<script lang="ts">
  import RoomLogin from '$lib/components/RoomLogin.svelte';
  import '../../../../auth.css';
  import type { PageProps } from './$types';

  let { data, form }: PageProps = $props();
</script>

<svelte:head>
  <title>Welcome to the {data.roomName}</title>
  <meta name="description" content={`Enter the ${data.roomName} ProTradingRoom session.`} />
</svelte:head>

<RoomLogin
  roomName={data.roomName}
  roomCode={data.roomCode}
  settings={data.settings}
  known={data.known}
  error={form?.error ?? null}
/>
