<?php
/**
 * Plugin Name:       Trading Room SSO
 * Description:       Lets your WooCommerce members enter a Trading Room room without a second login. Your site stays the authority on who has paid.
 * Version:           1.0.0
 * Requires at least: 6.0
 * Requires PHP:      7.4
 * License:           GPL-2.0-or-later
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS DOES, AND WHY IT IS SHAPED THIS WAY
 * ---------------------------------------------------------------------------
 *
 * A logged-in member clicks "Enter Room". This plugin asks WooCommerce what that member currently
 * holds — active memberships, active subscriptions, purchased products — signs those facts with a
 * key shared only with the room, and sends the member to:
 *
 *     https://<controller>/sso/<room-code>?jwt=<token>
 *
 * The room checks the signature, applies the filters its owner configured, and lets them in.
 *
 * **Your site remains the authority on entitlement.** Trading Room never queries WooCommerce, never
 * holds your API credentials, and never learns anything about a member except what you sign here.
 * When a subscription lapses, WooCommerce simply stops reporting it, no entitlement is asserted, and
 * the room refuses entry. There is no "cancel" webhook to get wrong, because absence is the signal.
 *
 * ## The token is minted on CLICK, never when the page renders
 *
 * The shortcode outputs a link to this plugin's own endpoint; the token is created only when
 * somebody follows it. That is not a style preference — it is the difference between working and
 * catastrophically broken on any cached site. A token embedded in rendered HTML would be stored by
 * your page cache, your CDN and every "copy of the page" a plugin makes, and then served to
 * **every subsequent visitor**, each of whom would enter the room as the first member who loaded it.
 *
 * ## Tokens are short-lived on purpose
 *
 * The signed assertion is a statement about *now*. The room enforces its own ceiling (one hour by
 * default, set by the room owner) on top of whatever expiry is chosen here, so a stale assertion
 * cannot outlive the payment it describes.
 *
 * ## Installation
 *
 * 1. Copy this folder into `wp-content/plugins/` and activate it.
 * 2. Settings → Trading Room SSO: paste your controller URL, then add one row per room — the room
 *    short code and the key from that room's Manage → Settings → "JWT Secret Key".
 * 3. Put `[tradingroom room="1001"]` on any page.
 *
 * @package TradingRoomSSO
 */

// A direct request for this file must do nothing at all.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const TRADINGROOM_SSO_VERSION      = '1.0.0';
const TRADINGROOM_SSO_OPTION       = 'tradingroom_sso_settings';
const TRADINGROOM_SSO_QUERY_VAR    = 'tradingroom_sso';

/**
 * Seconds a minted token is valid for.
 *
 * Short because it only has to survive one redirect. The room applies its own, usually longer,
 * ceiling — whichever is stricter wins, and that is deliberate: neither side can unilaterally
 * loosen the gate.
 */
const TRADINGROOM_SSO_TOKEN_TTL = 120;

/* -------------------------------------------------------------------------
 * Settings
 * ---------------------------------------------------------------------- */

/**
 * Stored configuration.
 *
 * @return array{controller:string, rooms:array<string,string>}
 */
function tradingroom_sso_settings(): array {
	$stored = get_option( TRADINGROOM_SSO_OPTION, array() );

	return array(
		'controller' => isset( $stored['controller'] ) ? untrailingslashit( (string) $stored['controller'] ) : '',
		'rooms'      => isset( $stored['rooms'] ) && is_array( $stored['rooms'] ) ? $stored['rooms'] : array(),
	);
}

add_action(
	'admin_menu',
	function () {
		add_options_page(
			__( 'Trading Room SSO', 'tradingroom-sso' ),
			__( 'Trading Room SSO', 'tradingroom-sso' ),
			'manage_options',
			'tradingroom-sso',
			'tradingroom_sso_render_settings_page'
		);
	}
);

/**
 * Settings screen.
 *
 * Rooms are stored as a textarea of `code = secret` lines rather than a repeater: it is one text
 * field to explain over the phone, it survives a copy/paste from an email, and it needs no
 * JavaScript. The secret is shown masked, and re-saving without changing a row keeps the stored
 * value — so an admin can edit the controller URL without being forced to re-enter every key.
 */
function tradingroom_sso_render_settings_page(): void {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to change these settings.', 'tradingroom-sso' ) );
	}

	$settings = tradingroom_sso_settings();
	$notice   = '';

	if ( isset( $_POST['tradingroom_sso_nonce'] )
		&& wp_verify_nonce( sanitize_key( wp_unslash( $_POST['tradingroom_sso_nonce'] ) ), 'tradingroom_sso_save' ) ) {

		$controller = isset( $_POST['controller'] ) ? esc_url_raw( wp_unslash( $_POST['controller'] ) ) : '';
		$rooms_raw  = isset( $_POST['rooms'] ) ? sanitize_textarea_field( wp_unslash( $_POST['rooms'] ) ) : '';

		$rooms = array();
		foreach ( preg_split( '/\R/', $rooms_raw ) as $line ) {
			$line = trim( $line );
			if ( '' === $line || 0 === strpos( $line, '#' ) ) {
				continue;
			}
			$parts = explode( '=', $line, 2 );
			if ( count( $parts ) !== 2 ) {
				continue;
			}
			$code   = trim( $parts[0] );
			$secret = trim( $parts[1] );
			if ( '' === $code ) {
				continue;
			}
			// A masked row means "leave this one alone", so editing the URL does not wipe the keys.
			if ( '' === $secret || str_repeat( '•', strlen( $secret ) ) === $secret ) {
				if ( isset( $settings['rooms'][ $code ] ) ) {
					$rooms[ $code ] = $settings['rooms'][ $code ];
				}
				continue;
			}
			$rooms[ $code ] = $secret;
		}

		update_option( TRADINGROOM_SSO_OPTION, array( 'controller' => $controller, 'rooms' => $rooms ) );
		$settings = tradingroom_sso_settings();
		$notice   = __( 'Settings saved.', 'tradingroom-sso' );
	}

	$rooms_text = '';
	foreach ( $settings['rooms'] as $code => $secret ) {
		$rooms_text .= $code . ' = ' . str_repeat( '•', strlen( $secret ) ) . "\n";
	}
	?>
	<div class="wrap">
		<h1><?php esc_html_e( 'Trading Room SSO', 'tradingroom-sso' ); ?></h1>

		<?php if ( '' !== $notice ) : ?>
			<div class="notice notice-success is-dismissible"><p><?php echo esc_html( $notice ); ?></p></div>
		<?php endif; ?>

		<form method="post">
			<?php wp_nonce_field( 'tradingroom_sso_save', 'tradingroom_sso_nonce' ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="tradingroom-controller"><?php esc_html_e( 'Controller URL', 'tradingroom-sso' ); ?></label></th>
					<td>
						<input name="controller" id="tradingroom-controller" type="url" class="regular-text"
							value="<?php echo esc_attr( $settings['controller'] ); ?>" placeholder="https://www.tradingroom.app" />
						<p class="description"><?php esc_html_e( 'The address of your Trading Room account site. No trailing slash needed.', 'tradingroom-sso' ); ?></p>
					</td>
				</tr>
				<tr>
					<th scope="row"><label for="tradingroom-rooms"><?php esc_html_e( 'Rooms and keys', 'tradingroom-sso' ); ?></label></th>
					<td>
						<textarea name="rooms" id="tradingroom-rooms" rows="6" class="large-text code"
							placeholder="1001 = paste-the-key-from-manage-settings"><?php echo esc_textarea( $rooms_text ); ?></textarea>
						<p class="description">
							<?php esc_html_e( 'One room per line, as "short code = key". Find the key in that room\'s Manage → Settings → JWT Secret Key. Existing keys are shown masked; leave a masked row untouched to keep it.', 'tradingroom-sso' ); ?>
						</p>
					</td>
				</tr>
			</table>
			<?php submit_button(); ?>
		</form>

		<h2><?php esc_html_e( 'Using it', 'tradingroom-sso' ); ?></h2>
		<p><?php esc_html_e( 'Put this on any page or post:', 'tradingroom-sso' ); ?></p>
		<p><code>[tradingroom room="1001" link_text="Enter Room"]</code></p>
		<p class="description">
			<?php esc_html_e( 'Only logged-in members see the button. Whether they may actually enter is decided by the filters on the room\'s own Manage page, using the memberships and products this site reports for them.', 'tradingroom-sso' ); ?>
		</p>
	</div>
	<?php
}

/* -------------------------------------------------------------------------
 * What this member currently holds
 * ---------------------------------------------------------------------- */

/**
 * Gathers the member's entitlements from WooCommerce.
 *
 * Every integration is behind `function_exists`, so the plugin degrades to "logged in, holds
 * nothing" on a site without WooCommerce rather than fataling. A room with no filters configured
 * still admits those members, which is the correct behaviour for a site that gates access some
 * other way.
 *
 * @param int $user_id WordPress user id.
 * @return array{memberships:string[], products:string[], permissions:string[]}
 */
function tradingroom_sso_entitlements( int $user_id ): array {
	$memberships = array();
	$products    = array();

	// WooCommerce Memberships — active plans only. An expired or cancelled plan is simply absent,
	// which is exactly the signal the room needs.
	if ( function_exists( 'wc_memberships_get_user_active_memberships' ) ) {
		foreach ( (array) wc_memberships_get_user_active_memberships( $user_id ) as $membership ) {
			if ( is_object( $membership ) && method_exists( $membership, 'get_plan' ) ) {
				$plan = $membership->get_plan();
				if ( $plan && method_exists( $plan, 'get_slug' ) ) {
					$memberships[] = (string) $plan->get_slug();
				}
			}
		}
	}

	// WooCommerce Subscriptions — the products behind any subscription that is currently active.
	if ( function_exists( 'wcs_get_users_subscriptions' ) ) {
		foreach ( (array) wcs_get_users_subscriptions( $user_id ) as $subscription ) {
			if ( ! is_object( $subscription ) || ! method_exists( $subscription, 'has_status' ) ) {
				continue;
			}
			if ( ! $subscription->has_status( array( 'active' ) ) ) {
				continue;
			}
			if ( ! method_exists( $subscription, 'get_items' ) ) {
				continue;
			}
			foreach ( $subscription->get_items() as $item ) {
				$product = is_object( $item ) && method_exists( $item, 'get_product' ) ? $item->get_product() : null;
				if ( $product && method_exists( $product, 'get_slug' ) ) {
					$products[] = (string) $product->get_slug();
				}
			}
		}
	}

	/**
	 * Anything else this site wants to assert.
	 *
	 * The escape hatch for sites whose entitlements do not live in WooCommerce at all — a custom
	 * table, a CRM, a "founding member" user meta. Returned values are matched against the room's
	 * "Permissions filter".
	 *
	 * @param string[] $permissions Capability strings.
	 * @param int      $user_id     The member.
	 */
	$permissions = (array) apply_filters( 'tradingroom_sso_permissions', array(), $user_id );

	/**
	 * Last word on memberships and products, for sites that need to add or remove entries.
	 *
	 * @param string[] $values  Slugs gathered above.
	 * @param int      $user_id The member.
	 */
	$memberships = (array) apply_filters( 'tradingroom_sso_memberships', $memberships, $user_id );
	$products    = (array) apply_filters( 'tradingroom_sso_products', $products, $user_id );

	$clean = static function ( array $values ): array {
		$values = array_map( 'strval', $values );
		$values = array_map( 'trim', $values );
		$values = array_filter( $values, static fn( $value ) => '' !== $value );
		return array_values( array_unique( $values ) );
	};

	return array(
		'memberships' => $clean( $memberships ),
		'products'    => $clean( $products ),
		'permissions' => $clean( $permissions ),
	);
}

/* -------------------------------------------------------------------------
 * The token
 * ---------------------------------------------------------------------- */

/** base64url without padding, per RFC 4648 §5 — what the room's verifier expects. */
function tradingroom_sso_base64url( string $value ): string {
	return rtrim( strtr( base64_encode( $value ), '+/', '-_' ), '=' );
}

/**
 * Signs one assertion.
 *
 * HS256 over `header.payload`, which is what the room pins — it accepts no other algorithm, so
 * there is no algorithm confusion to be had.
 *
 * @param string               $secret Room key.
 * @param array<string, mixed> $claims Payload.
 */
function tradingroom_sso_mint( string $secret, array $claims ): string {
	$header  = tradingroom_sso_base64url( (string) wp_json_encode( array( 'alg' => 'HS256', 'typ' => 'JWT' ) ) );
	$payload = tradingroom_sso_base64url( (string) wp_json_encode( $claims ) );
	$mac     = hash_hmac( 'sha256', $header . '.' . $payload, $secret, true );

	return $header . '.' . $payload . '.' . tradingroom_sso_base64url( $mac );
}

/* -------------------------------------------------------------------------
 * The shortcode, and the endpoint it points at
 * ---------------------------------------------------------------------- */

add_shortcode(
	'tradingroom',
	/**
	 * `[tradingroom room="1001" link_text="Enter Room" class="button"]`
	 *
	 * Renders nothing for a logged-out visitor by default — a button that always fails is worse than
	 * no button. Set `logged_out_text` to show a prompt instead.
	 *
	 * @param array<string, string>|string $atts Shortcode attributes.
	 */
	function ( $atts ): string {
		$atts = shortcode_atts(
			array(
				'room'            => '',
				'link_text'       => __( 'Enter Room', 'tradingroom-sso' ),
				'class'           => 'button',
				'logged_out_text' => '',
			),
			is_array( $atts ) ? $atts : array(),
			'tradingroom'
		);

		$room = trim( (string) $atts['room'] );
		if ( '' === $room ) {
			// Visible only to somebody who can fix it; a visitor sees nothing.
			return current_user_can( 'edit_posts' )
				? '<p><em>' . esc_html__( 'Trading Room: this shortcode needs a room, e.g. [tradingroom room="1001"].', 'tradingroom-sso' ) . '</em></p>'
				: '';
		}

		if ( ! is_user_logged_in() ) {
			$prompt = trim( (string) $atts['logged_out_text'] );
			return '' === $prompt ? '' : '<p>' . esc_html( $prompt ) . '</p>';
		}

		$settings = tradingroom_sso_settings();
		if ( '' === $settings['controller'] || ! isset( $settings['rooms'][ $room ] ) ) {
			return current_user_can( 'manage_options' )
				? '<p><em>' . esc_html__( 'Trading Room: set the controller URL and this room\'s key under Settings → Trading Room SSO.', 'tradingroom-sso' ) . '</em></p>'
				: '';
		}

		/*
		  A link to OUR endpoint, not to the room.

		  The token is minted when this link is followed, so nothing member-specific is ever baked
		  into a page that a cache might hand to somebody else. See the note at the top of the file.
		*/
		$href = add_query_arg(
			array(
				TRADINGROOM_SSO_QUERY_VAR => '1',
				'room'                    => rawurlencode( $room ),
			),
			home_url( '/' )
		);

		return sprintf(
			'<a class="%1$s" rel="nofollow" href="%2$s">%3$s</a>',
			esc_attr( (string) $atts['class'] ),
			esc_url( $href ),
			esc_html( (string) $atts['link_text'] )
		);
	}
);

add_action(
	'init',
	/**
	 * Mints and redirects.
	 *
	 * On `init` rather than a rewrite rule so the plugin needs no permalink flush on activation —
	 * one fewer way for an install to end up half-working.
	 */
	function (): void {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- a navigation, not a state change.
		if ( ! isset( $_GET[ TRADINGROOM_SSO_QUERY_VAR ] ) ) {
			return;
		}
		$room = isset( $_GET['room'] ) ? sanitize_text_field( wp_unslash( $_GET['room'] ) ) : '';
		// phpcs:enable WordPress.Security.NonceVerification.Recommended

		if ( ! is_user_logged_in() ) {
			// Send them to log in and come back here, so the click is not simply lost.
			wp_safe_redirect( wp_login_url( add_query_arg( array( TRADINGROOM_SSO_QUERY_VAR => '1', 'room' => $room ), home_url( '/' ) ) ) );
			exit;
		}

		$settings = tradingroom_sso_settings();
		$secret   = $settings['rooms'][ $room ] ?? '';

		if ( '' === $settings['controller'] || '' === $secret ) {
			wp_die(
				esc_html__( 'This room is not configured yet. Please contact support.', 'tradingroom-sso' ),
				esc_html__( 'Trading Room', 'tradingroom-sso' ),
				array( 'response' => 500 )
			);
		}

		$user = wp_get_current_user();
		$now  = time();

		$entitlements = tradingroom_sso_entitlements( (int) $user->ID );

		/*
		  Claim order and names are the room's contract. `room` is required and is checked against
		  the room in the URL, so a token minted for one room cannot open another even if a site
		  reuses one key across several.
		*/
		$token = tradingroom_sso_mint(
			$secret,
			array(
				'name'        => $user->display_name ? $user->display_name : $user->user_login,
				'email'       => $user->user_email,
				'room'        => $room,
				'memberships' => $entitlements['memberships'],
				'products'    => $entitlements['products'],
				'permissions' => $entitlements['permissions'],
				'iat'         => $now,
				'exp'         => $now + TRADINGROOM_SSO_TOKEN_TTL,
			)
		);

		$destination = $settings['controller'] . '/sso/' . rawurlencode( $room ) . '?jwt=' . rawurlencode( $token );

		/**
		 * Fires immediately before a member is sent to the room.
		 *
		 * @param int    $user_id      The member.
		 * @param string $room         Room short code.
		 * @param array  $entitlements What was asserted.
		 */
		do_action( 'tradingroom_sso_before_redirect', (int) $user->ID, $room, $entitlements );

		/*
		  `wp_redirect`, not `wp_safe_redirect`.

		  The destination is another host by definition, and `wp_safe_redirect` would refuse it. The
		  value is not user input: it is built from an admin-configured controller URL and a room
		  code that must already exist as a key in that configuration, so there is no open redirect
		  here — an unknown room was rejected above.
		*/
		wp_redirect( $destination, 302 ); // phpcs:ignore WordPress.Security.SafeRedirect.wp_redirect_wp_redirect
		exit;
	}
);
