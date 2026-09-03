<script lang="ts">
  import {
    disconnectDiscord,
    discordStatus,
    startDiscordAuthorization
  } from '../../routes/discord.remote';

  let { active }: { active: boolean } = $props();
  let checked = $state(false);
  let connected = $state(false);
  let configured = $state(false);
  let userId = $state<string | null>(null);
  let username = $state<string | null>(null);
  let loading = $state(false);
  let problem = $state('');

  async function refresh() {
    loading = true;
    problem = '';
    try {
      const status = await discordStatus();
      connected = status.connected;
      configured = status.configured;
      userId = status.userId;
      username = status.username;
      checked = true;
    } catch (cause) {
      problem = cause instanceof Error ? cause.message : 'Discord status could not be read.';
    } finally {
      loading = false;
    }
  }

  async function connect() {
    loading = true;
    problem = '';
    try {
      const { authorizationUrl } = await startDiscordAuthorization();
      window.location.assign(authorizationUrl);
    } catch (cause) {
      problem = cause instanceof Error ? cause.message : 'Discord authorization could not start.';
      loading = false;
    }
  }

  async function unlink() {
    loading = true;
    problem = '';
    try {
      await disconnectDiscord();
      connected = false;
      userId = null;
      username = null;
      checked = true;
    } catch (cause) {
      problem = cause instanceof Error ? cause.message : 'Discord could not be disconnected.';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    if (active && !checked && !loading) void refresh();
  });
</script>

<div
  id="discord-settings"
  role="tabpanel"
  aria-labelledby="discord-settings-tab"
  class={active ? 'tab-pane fade active show' : 'tab-pane fade'}
>
  <div class="p-2 text-mode-box" data-testid="discord-integration">
    {#if problem}<div class="alert alert-danger" role="alert">{problem}</div>{/if}
    {#if connected}
      <p class="ml-5 mb-2">
        Discord Linked to <strong>{username ?? 'Discord user'}</strong>
        {#if userId}<span> (ID: {userId})</span>{/if}
      </p>
      <button type="button" class="btn btn-outline-danger ml-5" disabled={loading} onclick={unlink}
        >Unlink Discord</button
      >
    {:else}
      <p class="ml-5 mb-2">
        {loading
          ? 'Linking Discord...'
          : checked && !configured
            ? 'Discord OAuth is not configured for this deployment.'
            : 'Connect your Discord identity to this room membership.'}
      </p>
      <button
        type="button"
        class="btn btn-outline-primary ml-5"
        disabled={loading || (checked && !configured)}
        onclick={connect}>Connect Discord</button
      >
      {#if loading}
        <button class="btn btn-link ml-2" type="button" onclick={refresh}>Check Status</button>
      {/if}
    {/if}
  </div>
</div>
