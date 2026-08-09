<script lang="ts">
  import { resolve } from '$app/paths';
</script>

<!-- #footer — the site's own, from evidence-dumps/home-page/file -->
<div id="footer">
  <div class="container">
    <div class="row">
      <div class="col-md-12 menu" style="text-align: center; color: #FAFAFA;">
        <ul>
          <li><a href={resolve('/privacy')} target="_blank" rel="noopener noreferrer">Privacy Policy</a></li>
          <li><a href={resolve('/terms')} target="_blank" rel="noopener noreferrer">Terms of Service</a></li>
          <li><a href={resolve('/contact')}>Contact Us</a></li>
        </ul>
        © 2026 ProTradingRoom™
      </div>
    </div>
  </div>
</div>
