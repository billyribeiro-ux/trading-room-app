<script lang="ts">
  import { resolve } from '$app/paths';
  import { CTA_HEADING } from '$lib/content/home';
</script>

<div id="cta">
  <div class="container">
    <div class="row">
      <div class="col-md-12">
        <div class="form-wrapper" style="text-align: center;">
          <h4>{CTA_HEADING}</h4>
          <a href={resolve('/contact')} class="button button-small">Contact Us</a>
        </div>
      </div>
    </div>
  </div>
</div>
