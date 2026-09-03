<script lang="ts">
  import type { MainTab } from '#lib/types.js';

  let {
    recordingsVisible,
    mainTab = $bindable()
  }: { recordingsVisible: boolean; mainTab: MainTab } = $props();
</script>

{#if recordingsVisible}
  <li role="presentation" class="nav-item">
    <a
      id="recordings-tab"
      class={['nav-link', { active: mainTab === 'recordings' }]}
      role="tab"
      tabindex={mainTab === 'recordings' ? 0 : -1}
      aria-controls="recordings"
      aria-selected={mainTab === 'recordings'}
      data-bs-toggle="tab"
      data-bs-target="#recordings"
      onclick={() => (mainTab = 'recordings')}
      onkeydown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') mainTab = 'recordings';
      }}
    >
      <div class="d-flex">
        <i class="fas fa-file-video"></i><span class="ml-1">Recordings</span>
      </div>
    </a>
  </li>
{/if}
