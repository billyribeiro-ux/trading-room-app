<script lang="ts">
  import { asset } from '$app/paths';
  import { FEATURES, type Feature } from '$lib/content/home';

  interface Props {
    features?: readonly Feature[];
  }

  let { features = FEATURES }: Props = $props();

  const iconSources = {
    locked: asset('/public/images/circle-icons/one-color/locked.png'),
    cloud: asset('/public/images/circle-icons/one-color/cloud.png'),
    browser: asset('/public/images/circle-icons/one-color/browser.png')
  } as const;
</script>

<div id="second-option">
  <div class="container">
    <div class="row">
      {#each features as feature (feature.title)}
        <div class="col-md-4 feature">
          <div style="text-align: center">
            <img src={iconSources[feature.icon]} alt={feature.alt} />
          </div>
          <strong style:text-align={feature.titleAlign}>{feature.title}</strong>
          {#each feature.lines as line (line)}
            <p>{line}</p>
          {/each}
        </div>
      {/each}
    </div>
  </div>
</div>
