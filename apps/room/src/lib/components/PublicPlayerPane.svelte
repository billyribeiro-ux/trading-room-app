<script lang="ts">
  import {
    disablePublicPlayer,
    enablePublicPlayer,
    publicPlayerStatus
  } from '../../routes/public-player.remote';

  let { active, oncopied }: { active: boolean; oncopied: () => void } = $props();
  let checked = $state(false);
  let enabled = $state(false);
  let expiresAt = $state<number | null>(null);
  let playerLink = $state('');
  let loading = $state(false);
  let problem = $state('');

  async function refresh() {
    loading = true;
    problem = '';
    try {
      const status = await publicPlayerStatus();
      enabled = status.enabled;
      expiresAt = status.expiresAt;
      checked = true;
    } catch (cause) {
      problem = cause instanceof Error ? cause.message : 'Player status could not be read.';
    } finally {
      loading = false;
    }
  }

  async function enable() {
    loading = true;
    problem = '';
    try {
      const status = await enablePublicPlayer();
      enabled = status.enabled;
      expiresAt = status.expiresAt;
      playerLink = status.playerUrl;
      checked = true;
    } catch (cause) {
      problem = cause instanceof Error ? cause.message : 'The player could not be enabled.';
    } finally {
      loading = false;
    }
  }

  async function disable() {
    loading = true;
    problem = '';
    try {
      await disablePublicPlayer();
      enabled = false;
      expiresAt = null;
      playerLink = '';
      checked = true;
    } catch (cause) {
      problem = cause instanceof Error ? cause.message : 'The player could not be disabled.';
    } finally {
      loading = false;
    }
  }

  async function copyLink() {
    if (!playerLink) return;
    await navigator.clipboard.writeText(playerLink);
    oncopied();
  }

  $effect(() => {
    if (active && !checked && !loading) void refresh();
  });
</script>

<div
  id="stream-player"
  role="tabpanel"
  aria-labelledby="stream-player-tab"
  class={['tab-pane fade', { show: active, active }]}
>
  <p>
    The stream player tool allows you to create a link you can share with others to watch your
    stream. This is useful if you want to share your stream with others who are not logged in to the
    trading room. They will just see the screenshare sections (no chat/notes/files/etc)
  </p>
  <p>
    Stream Player enabled:
    <span style:color={enabled ? 'green' : 'red'}>{enabled ? 'true' : 'false'}</span>
  </p>
  <div class="mt-4">
    <button class="btn btn-outline-primary btn-sm m-1" disabled={loading} onclick={enable}>
      <i class="fas fa-desktop"></i> Enable Stream Player
    </button>
    <button
      class="btn btn-outline-danger btn-sm m-1"
      disabled={loading || !enabled}
      onclick={disable}
    >
      <i class="fas fa-stop"></i> Disable Stream Player
    </button>
  </div>
  {#if problem}<div class="alert alert-danger m-2" role="alert">{problem}</div>{/if}
  {#if playerLink}
    <label for="public-player-link" class="form-label">Public player link</label>
    <div class="input-group">
      <input id="public-player-link" class="form-control" readonly value={playerLink} />
      <button class="btn btn-outline-info" type="button" onclick={copyLink}>
        <i class="fas fa-copy"></i> Copy
      </button>
    </div>
    <p class="small text-muted mt-2">
      This bearer link is shown once. Creating another link revokes it immediately.
    </p>
  {:else if enabled && expiresAt}
    <div class="alert alert-info m-2">
      A player link is active until {new Date(expiresAt).toLocaleString()}. Select Enable Stream
      Player to revoke it and issue a replacement link.
    </div>
  {/if}
</div>
