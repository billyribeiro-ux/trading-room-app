<script lang="ts">
	/**
	 * #hero — evidence-dumps/home-page/file lines 387–411 (verbatim structure + inline styles).
	 */
	import { asset, resolve } from '$app/paths';
	import { HERO_HEADLINE } from '$lib/content/home';
</script>

<div id="hero" style="padding-top: 60px; background: #0e0e0e">
	<div class="container-fluid">
		<h1 class="hero-text" style="text-align: center">{HERO_HEADLINE}</h1>
		<div class="row">
			<div class="col-md-8" style="text-align: center">
				<img
					src={asset('/public/images/ptr_descrived_perspective.png')}
					style="height: 95%"
					alt="ProTradingRoom interface showing trade alerts, group chat, market charts, and HD screen sharing"
				/>
			</div>
			<div class="col-md-4">
				<div class="animated fadeInUp" style="text-align: center">
					<br />
					<a href={resolve('/contact')} class="button button-large button-primary">Learn More</a>
				</div>
				<ul style="color: #f0f0f0; padding-bottom: 0px; font-size: 20px; padding-top: 40px">
					<li>White Label!</li>
					<li>HD Screen-Sharing with no lag!</li>
					<li>Desktop or Mobile</li>
					<li>Mobile trade alerts</li>
					<li>Web based HTML5, No Flash, No Downloads</li>
					<li>Custom integrations on your site</li>
					<li>Branding, Recording, Webinars, Stats, and more...</li>
				</ul>
			</div>
		</div>
	</div>
</div>
