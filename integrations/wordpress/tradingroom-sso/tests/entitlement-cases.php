<?php
/**
 * Exercises `tradingroom_sso_entitlements()` against stand-ins for the two PAID WooCommerce
 * extensions, under real PHP, and emits the result as JSON.
 *
 * ## Why this exists, and what it does NOT claim
 *
 * `STAGING-TEST.md` §6 is the step this whole integration exists for: *cancel the subscription and
 * prove the door closes*, and it says so itself — *"this is the only step that proves entitlement is
 * live rather than decorative. Everything else can pass with a permanently-open door."*
 *
 * That step needs a staging WooCommerce, and `wc_memberships_get_user_active_memberships` and
 * `wcs_get_users_subscriptions` come from **WooCommerce Memberships** and **WooCommerce
 * Subscriptions**, both licensed products that cannot be downloaded here. So the end-to-end step
 * stays blocked.
 *
 * **What is NOT blocked is the plugin's own half of it**, and that is what this file proves. Every
 * WooCommerce call in `tradingroom_sso_entitlements()` is behind `function_exists`, takes a plain
 * object and calls documented methods on it — so a stand-in with those methods exercises the real
 * code path rather than a copy of it. `mint-golden-token.php` beside this file already established
 * the technique for the WordPress functions; this extends it to the commerce ones.
 *
 * **The gap this leaves, stated:** the stand-ins assert what those extensions RETURN, not that they
 * return it. A cancelled membership is absent from `wc_memberships_get_user_active_memberships` —
 * that is the extension's documented behaviour and the plugin's own comment relies on it — and
 * nothing here can confirm WooCommerce keeps that promise. §6 against a real site is still the only
 * thing that can.
 *
 * Deterministic, like its sibling: no clock, no randomness. The output is committed as
 * `entitlement-cases.json` and pinned by `sso-wordpress-contract.test.ts`, so CI needs no PHP.
 *
 * Run it:
 *
 *   php integrations/wordpress/tradingroom-sso/tests/entitlement-cases.php \
 *     > integrations/wordpress/tradingroom-sso/tests/entitlement-cases.json
 *
 * @package TradingRoomSSO
 */

define( 'ABSPATH', __DIR__ );

function add_action( $hook, $callback = null, $priority = 10, $args = 1 ) {}
function add_shortcode( $tag, $callback ) {}
function wp_json_encode( $data, $options = 0, $depth = 512 ) {
	return json_encode( $data, $options, $depth );
}
function apply_filters( $hook, $value ) {
	return $GLOBALS['tr_filters'][ $hook ] ?? $value;
}

/* -------------------------------------------------------------------------
 * Stand-ins for the two paid extensions
 *
 * Shaped to the methods the plugin actually calls and nothing more, so a change in what it calls
 * fails here rather than being silently accommodated.
 * ---------------------------------------------------------------------- */

/** What `$membership->get_plan()` returns. */
final class TR_Plan {
	public function __construct( private string $slug ) {}
	public function get_slug(): string {
		return $this->slug;
	}
}

/** One entry of `wc_memberships_get_user_active_memberships()`. */
final class TR_Membership {
	public function __construct( private ?TR_Plan $plan ) {}
	public function get_plan(): ?TR_Plan {
		return $this->plan;
	}
}

/** What `$item->get_product()` returns. */
final class TR_Product {
	public function __construct( private string $slug ) {}
	public function get_slug(): string {
		return $this->slug;
	}
}

/** One entry of `$subscription->get_items()`. */
final class TR_LineItem {
	public function __construct( private ?TR_Product $product ) {}
	public function get_product(): ?TR_Product {
		return $this->product;
	}
}

/** One entry of `wcs_get_users_subscriptions()`. */
final class TR_Subscription {
	/** @param TR_LineItem[] $items */
	public function __construct( private string $status, private array $items ) {}
	public function has_status( $statuses ): bool {
		return in_array( $this->status, (array) $statuses, true );
	}
	public function get_items(): array {
		return $this->items;
	}
}

/*
  Defined UNCONDITIONALLY, because `function_exists` is what the plugin branches on and a site with
  the extensions installed always has them. The per-case control is what they RETURN — which is
  exactly how WooCommerce signals a cancellation: the plan is simply absent from the active list.
*/
function wc_memberships_get_user_active_memberships( $user_id ) {
	return $GLOBALS['tr_memberships'] ?? array();
}
function wcs_get_users_subscriptions( $user_id ) {
	return $GLOBALS['tr_subscriptions'] ?? array();
}

require_once __DIR__ . '/../tradingroom-sso.php';

/** Run one case with the globals it names, then put them back. */
function tr_case( string $name, array $state ): array {
	$GLOBALS['tr_memberships']   = $state['memberships'] ?? array();
	$GLOBALS['tr_subscriptions'] = $state['subscriptions'] ?? array();
	$GLOBALS['tr_filters']       = $state['filters'] ?? array();

	$result = tradingroom_sso_entitlements( 7 );

	unset( $GLOBALS['tr_memberships'], $GLOBALS['tr_subscriptions'], $GLOBALS['tr_filters'] );
	return array( 'case' => $name, 'entitlements' => $result );
}

$paidUp = array(
	'memberships'   => array( new TR_Membership( new TR_Plan( 'pro-trader' ) ) ),
	'subscriptions' => array(
		new TR_Subscription( 'active', array( new TR_LineItem( new TR_Product( 'monthly-room' ) ) ) ),
	),
);

$cases = array(
	// The paid-up member. Everything else is measured against this.
	tr_case( 'active membership and active subscription', $paidUp ),

	/*
	  §6, AT THE PLUGIN'S BOUNDARY. WooCommerce Memberships omits a cancelled or expired plan from
	  the active list — the plugin's own comment says "an expired or cancelled plan is simply absent,
	  which is exactly the signal the room needs" — so the cancellation IS the empty array.
	*/
	tr_case( 'membership cancelled: the plan is gone', array(
		'memberships'   => array(),
		'subscriptions' => $paidUp['subscriptions'],
	) ),

	/*
	  The subscription half of the same question, and it is a DIFFERENT mechanism: a cancelled
	  subscription is still returned by `wcs_get_users_subscriptions`, with a status that is not
	  `active`. So the plugin has to filter it, and this case is what proves it does.
	*/
	tr_case( 'subscription cancelled: still returned, wrong status', array(
		'memberships'   => array(),
		'subscriptions' => array(
			new TR_Subscription( 'cancelled', array( new TR_LineItem( new TR_Product( 'monthly-room' ) ) ) ),
		),
	) ),
	tr_case( 'subscription on-hold is not active either', array(
		'subscriptions' => array(
			new TR_Subscription( 'on-hold', array( new TR_LineItem( new TR_Product( 'monthly-room' ) ) ) ),
		),
	) ),

	// Both gone: the door must be shut on every path at once.
	tr_case( 'everything lapsed', array() ),

	/*
	  Malformed entries. A membership with no plan, and a line item with no product, are both
	  reachable in real data — a deleted plan, a removed product — and neither may fatal or emit an
	  empty slug.
	*/
	tr_case( 'a membership with no plan is skipped', array(
		'memberships' => array( new TR_Membership( null ), new TR_Membership( new TR_Plan( 'pro-trader' ) ) ),
	) ),
	tr_case( 'a line item with no product is skipped', array(
		'subscriptions' => array(
			new TR_Subscription( 'active', array( new TR_LineItem( null ), new TR_LineItem( new TR_Product( 'monthly-room' ) ) ) ),
		),
	) ),

	// The normalisation: duplicates collapse, blanks and whitespace go, order is preserved.
	tr_case( 'duplicates and blanks are cleaned', array(
		'memberships' => array(
			new TR_Membership( new TR_Plan( 'pro-trader' ) ),
			new TR_Membership( new TR_Plan( '  pro-trader  ' ) ),
			new TR_Membership( new TR_Plan( '' ) ),
			new TR_Membership( new TR_Plan( 'founding' ) ),
		),
	) ),

	// The site's own escape hatch, for entitlements that are not in WooCommerce at all.
	tr_case( 'the permissions filter is the site\'s last word', array(
		'filters' => array( 'tradingroom_sso_permissions' => array( 'vip', 'vip', ' ' ) ),
	) ),

	/*
	  A filter REMOVING what WooCommerce reported. Documented as "last word on memberships and
	  products, for sites that need to add or remove entries", and a site that revokes this way must
	  actually revoke.
	*/
	tr_case( 'a filter can take an entitlement away', array(
		'memberships' => $paidUp['memberships'],
		'filters'     => array( 'tradingroom_sso_memberships' => array() ),
	) ),
);

echo wp_json_encode( $cases, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . "\n";
