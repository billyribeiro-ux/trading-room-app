<script lang="ts">
  import { resolve } from '$app/paths';
  import SanitizedHtml from '$lib/components/SanitizedHtml.svelte';
  import type { PageProps } from './$types';

  /**
   * The same shell as `/account/api-docs`, because the reference renders both documents through the
   * SAME viewer — `api-docs.html?src=…`, one page taking the document as a parameter. Two routes
   * here rather than one with a query parameter: the content is generated into the bundle at build
   * time, so there is nothing to look up, and a route per document keeps `resolve()` type-safe.
   */
  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>API POST Routes — TradingRoomApp</title>
  <meta name="description" content="Authenticated TradingRoomApp POST route API documentation." />
</svelte:head>

<div class="ad-root">
  <div class="topbar">
    <a href={resolve('/(app)/account')}>← Back to PTR</a>
  </div>
  <div class="container">
    <div class="card">
      <div class="card-header">POST Route API Documentation</div>
      <!-- The branded value can only be created by the server allowlist. -->
      <SanitizedHtml class="card-body markdown-body" id="content" content={data.html} />
    </div>
  </div>
</div>
