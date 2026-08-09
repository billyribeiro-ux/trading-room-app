<script lang="ts">
  import { asset } from '$app/paths';
  import { IMAGE_SIZES, MOBILE } from '$lib/content/home';
</script>

<div id="mobile">
  <div class="container">
    <div class="row">
      <div class="col-xs-6 hidden-xs">
        <img
          src={asset('/public/images/ss3.png')}
          class="device img-responsive"
          alt="ProTradingRoom mobile interface"
          width={IMAGE_SIZES.mobile.w}
          height={IMAGE_SIZES.mobile.h}
        />
      </div>
      <div class="col-sm-6 col-xs-12">
        <div class="info">
          <h3>{MOBILE.heading}</h3>
          <p>{MOBILE.body}</p>
        </div>
      </div>
    </div>
  </div>
</div>
