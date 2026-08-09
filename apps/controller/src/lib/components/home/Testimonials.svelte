<script lang="ts">
  import { asset, resolve } from '$app/paths';
  import { IMAGE_SIZES, TESTIMONIALS, TESTIMONIALS_HEADING } from '$lib/content/home';
</script>

<div class="row" style="text-align: center">
  <div class="col-sm-6 col-xs-12" style="padding-left: 60px">
    <img
      src={asset('/public/images/user_comments.png')}
      alt="Screenshot of ProTradingRoom customer comments"
      width={IMAGE_SIZES.comments.w}
      height={IMAGE_SIZES.comments.h}
      style="width: 100%; height: auto; padding: 10px; border: 4px solid gray"
    />
  </div>
  <div class="col-sm-6 col-xs-12" style="padding-left: 60px">
    <div class="info" style="font-size: 16px; margin-top: 30px; text-align: left">
      <h2 style="text-align: center">{TESTIMONIALS_HEADING}</h2>
      <br />
      {#each TESTIMONIALS as quote (quote)}
        <h3><i class="fa fa-check-circle"></i> {quote}</h3>
      {/each}
      <br />
      <h3 style="text-align: center">
        <a href={resolve('/contact')} class="button button-small">Get a free demo room</a>
      </h3>
    </div>
  </div>
</div>
