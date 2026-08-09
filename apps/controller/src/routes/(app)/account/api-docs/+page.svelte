<script lang="ts">
  import { resolve } from '$app/paths';
  import SanitizedHtml from '$lib/components/SanitizedHtml.svelte';
  import type { PageProps } from './$types';

  /**
	 * Rebuilt from `evidence-dumps/login-page/api-docs`: a topbar with a back link over a card
   * holding the rendered reference — `.topbar`, `.container`, `.card`,
   * `.card-header`, `.card-body.markdown-body`, as the capture has them.
   */
  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>API Documentation — TradingRoomApp</title>
  <meta name="description" content="Authenticated TradingRoomApp API reference and command documentation." />
</svelte:head>

<div class="ad-root">
  <div class="topbar">
    <a href={resolve('/account')}>← Back to PTR</a>
  </div>
  <div class="container">
    <div class="card">
      <div class="card-header">API Documentation</div>
      <!-- The branded value can only be created by the server allowlist. -->
      <SanitizedHtml class="card-body markdown-body" id="content" content={data.html} />
    </div>
  </div>
</div>
