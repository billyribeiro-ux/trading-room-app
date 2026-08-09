<script lang="ts">
  import { resolve } from '$app/paths';
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Log out - PTRChat</title>
</svelte:head>

<!--
  Deliberately its own route rather than a control in the navbar: the room's shell markup is pinned
  against the forensic capture, which has no logout control, so adding one there would break that
  match. A POST form rather than a link, so no prefetch or stray GET can end the session.
-->
<div class="logout-page">
  <p>Signed in as <strong>{data.displayName}</strong> ({data.role}).</p>
  <form method="POST">
    <button type="submit" class="btn btn-primary">Log out</button>
  </form>
  <p class="mt-3"><a href={resolve('/')}>Back to the room</a></p>
</div>

<style>
  .logout-page {
    max-width: 24rem;
    margin: 4rem auto;
    text-align: center;
  }
</style>
