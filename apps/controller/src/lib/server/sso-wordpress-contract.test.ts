import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifySsoToken } from './sso-token';

/**
 * The contract between the WordPress plugin and this verifier.
 *
 * ## What this proves, and what it does NOT
 *
 * **Proves:** that a token built with the exact byte operations the plugin performs is accepted
 * here, including the PHP-specific encoding hazards below.
 *
 * **Also proves, since 2026-08-10:** that real PHP produces bytes this verifier accepts. The golden
 * vector below was minted by `integrations/wordpress/tradingroom-sso/tests/mint-golden-token.php`
 * running the plugin's OWN `tradingroom_sso_entitlements()` and `tradingroom_sso_mint()` under
 * PHP 8.3.33, and `php -l` reports no syntax errors. Both ran in a container, so no local PHP is
 * required to reproduce them — the command is in that script's header.
 *
 * **Still does not prove:** that it works inside a live WordPress against a real WooCommerce. The
 * harness stubs the three WordPress functions the plugin touches at load time; it does not boot
 * WordPress, and no subscription was cancelled mid-test. That remainder is `TODO.md` item Q.
 *
 * So: read this as "the contract holds in both languages", not yet as "it works in production".
 */

/** Minted by real PHP. See the module docs. */
const GOLDEN = JSON.parse(
  readFileSync(
    new URL('../../../../../integrations/wordpress/tradingroom-sso/tests/golden-token.json', import.meta.url),
    'utf8'
  )
) as {
  phpVersion: string;
  secret: string;
  room: string;
  nowSeconds: number;
  payloadJson: string;
  token: string;
  claims: Record<string, unknown>;
};

const PLUGIN = readFileSync(
  new URL('../../../../../integrations/wordpress/tradingroom-sso/tradingroom-sso.php', import.meta.url),
  'utf8'
);

const SECRET = 'c3aa19b0f4d7481aa9e2b6c5d8e1f0a3c3aa19b0f4d7481aa9e2b6c5d8e1f0a3';
const ROOM = '1001';
const NOW = 1_800_000_000;

/** base64url without padding — `rtrim(strtr(base64_encode($v), '+/', '-_'), '=')` in the plugin. */
function base64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

/**
 * Mints exactly as `tradingroom_sso_mint()` does: HS256 over `header.payload`, each segment
 * base64url of the JSON, signature base64url of the raw MAC.
 */
function mintAsPlugin(payloadJson: string, secret = SECRET): string {
  const header = base64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64Url(payloadJson);
  const mac = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${mac}`;
}

/** The claim object the plugin builds, in its order. */
function pluginClaims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: 'Dana Reyes',
    email: 'dana@example.com',
    room: ROOM,
    memberships: ['gold-annual'],
    products: ['options-mastery'],
    permissions: [],
    iat: NOW,
    exp: NOW + 120,
    ...overrides
  };
}

describe('a token shaped exactly as the plugin builds it', () => {
  it('is accepted', () => {
    const token = mintAsPlugin(JSON.stringify(pluginClaims()));
    const result = verifySsoToken(SECRET, ROOM, token, { nowSeconds: NOW });
    expect(result.ok).toBe(true);
  });

  /*
    THE PHP hazard.

    `wp_json_encode` escapes forward slashes by default — `https://x` becomes `https:\/\/x` — which
    is valid JSON and a classic source of "it works in Postman but not from WordPress" bugs when a
    verifier re-serialises the payload before checking the signature.

    Ours cannot hit that: the signature is computed over the payload SEGMENT as presented, never over
    a re-encoding of the decoded object. This test exists to keep it that way, because "verify the
    bytes you were given" is exactly the kind of invariant a well-meaning refactor breaks.
  */
  it('is accepted even when PHP escapes forward slashes in a claim', () => {
    const escaped =
      '{"name":"Dana","email":"dana@example.com","room":"1001","memberships":["plan\\/gold"],"products":[],"permissions":[],"iat":1800000000,"exp":1800000120}';
    expect(escaped).toContain('\\/');

    const result = verifySsoToken(SECRET, ROOM, mintAsPlugin(escaped), { nowSeconds: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // The escape is a JSON encoding detail, not part of the value.
    expect(result.claims.memberships).toEqual(['plan/gold']);
  });

  /*
    The second PHP hazard, and the reason `array_values()` is not decoration.

    `json_encode` turns a PHP list into `[]` and an associative array into `{}`. After
    `array_filter()` removes an entry the keys are no longer sequential, so without the
    `array_values()` wrapper the plugin would emit `{"1":"gold"}` where the room expects a list.
    Our reader treats a non-array as "nothing asserted" — which fails CLOSED, refusing entry rather
    than granting it — but the failure would be baffling, so the plugin's wrapper is load-bearing.
  */
  it('treats a PHP associative array as nothing asserted, failing closed', () => {
    const objectShaped = JSON.stringify(pluginClaims({ memberships: { 1: 'gold-annual' } }));
    const result = verifySsoToken(SECRET, ROOM, mintAsPlugin(objectShaped), { nowSeconds: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.claims.memberships).toEqual([]);
  });

  it('is accepted with unicode escaped, as wp_json_encode emits it', () => {
    const token = mintAsPlugin(
      '{"name":"Ren\\u00e9e","email":"r@example.com","room":"1001","memberships":[],"products":[],"permissions":[],"iat":1800000000,"exp":1800000120}'
    );
    const result = verifySsoToken(SECRET, ROOM, token, { nowSeconds: NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.claims.name).toBe('Renée');
  });

  it('is refused when signed with another room key', () => {
    const token = mintAsPlugin(JSON.stringify(pluginClaims()), 'd'.repeat(64));
    expect(verifySsoToken(SECRET, ROOM, token, { nowSeconds: NOW })).toEqual({
      ok: false,
      reason: 'bad-signature'
    });
  });
});

describe('the golden vector, minted by real PHP', () => {
  /*
    The one test in this file that is not a description of what PHP would do.

    Everything else here builds a token with Node's crypto and asserts our side handles it. This
    takes bytes that a real `hash_hmac` and a real `json_encode` produced — PHP 8.3.33, via
    `tests/mint-golden-token.php` — and runs them through the verifier a customer's login will hit.
    If either side's encoding ever drifts, this fails instead of a member being locked out.
  */
  it('is accepted by the verifier', () => {
    const result = verifySsoToken(GOLDEN.secret, GOLDEN.room, GOLDEN.token, {
      nowSeconds: GOLDEN.nowSeconds
    });
    expect(result.ok, `token minted by PHP ${GOLDEN.phpVersion} must verify`).toBe(true);
    if (!result.ok) return;
    expect(result.claims.email).toBe('dana@example.com');
    expect(result.claims.room).toBe(GOLDEN.room);
  });

  /*
    PHP's `json_encode` emits `{}` for a non-sequential array, and `array_filter()` leaves gaps.
    The plugin wraps its lists in `array_values( array_unique( … ) )` for exactly this reason, and
    the harness feeds it a duplicate and a blank so the golden vector exercises that path rather
    than a already-clean list.
  */
  it('carries entitlements as JSON ARRAYS, de-duplicated and trimmed', () => {
    expect(GOLDEN.payloadJson).toContain('"memberships":["gold-annual"]');
    expect(GOLDEN.payloadJson).toContain('"permissions":[]');
    // The failure this guards against: `{"0":"gold-annual"}`, which our reader treats as nothing
    // asserted — failing closed, but baffling.
    expect(GOLDEN.payloadJson).not.toMatch(/"memberships":\{/);
    expect(GOLDEN.payloadJson).not.toMatch(/"permissions":\{/);

    const result = verifySsoToken(GOLDEN.secret, GOLDEN.room, GOLDEN.token, {
      nowSeconds: GOLDEN.nowSeconds
    });
    expect(result.ok && result.claims.memberships).toEqual(['gold-annual']);
    expect(result.ok && result.claims.products).toEqual(['options-mastery']);
  });

  it('is refused once it is older than the ceiling, like any other token', () => {
    // Proof the golden vector is a real credential subject to the real rules, not a bypass.
    const stale = GOLDEN.nowSeconds + 86_400;
    expect(verifySsoToken(GOLDEN.secret, GOLDEN.room, GOLDEN.token, { nowSeconds: stale })).toEqual({
      ok: false,
      reason: 'expired'
    });
  });

  it('is refused against a different room', () => {
    expect(verifySsoToken(GOLDEN.secret, '2002', GOLDEN.token, { nowSeconds: GOLDEN.nowSeconds })).toEqual({
      ok: false,
      reason: 'wrong-room'
    });
  });
});

describe('the plugin source still honours the contract', () => {
  /*
    Read as text because the PHP cannot be executed here. Each assertion is a decision that would be
    invisible if it silently changed — and unlike the TypeScript, nothing else in this repository
    would catch it.
  */
  it("mints on click rather than at render, so a page cache cannot leak one member's token", () => {
    // The shortcode must link to the plugin's own endpoint, not straight to the controller.
    expect(PLUGIN).toContain("TRADINGROOM_SSO_QUERY_VAR => '1'");
    expect(PLUGIN).toContain('add_query_arg(');
    /*
      And the mint must happen in the init handler, after that link is followed.

      This compared the mint's byte offset against `add_shortcode(`'s, which proves nothing: the
      shortcode's CALLBACK BODY also lies after that token, so a mint moved into it — baking a
      token into the rendered page, which is exactly the page-cache leak this test is named for —
      still scored greater and still passed. The adversarial review of 2026-08-11 built that mutant
      and measured it: the mint landed at byte 14677, `add_shortcode(` was at 12941, green.

      The property is not "the mint comes later in the file". It is "the shortcode callback does
      not mint", and that is what the last assertion says.
    */
    const shortcode = PLUGIN.indexOf('add_shortcode(');
    const initHandler = PLUGIN.search(/add_action\(\s*'init'/);
    const mintCall = PLUGIN.indexOf('$token = tradingroom_sso_mint(');

    expect(shortcode, 'the shortcode registration must still be there').toBeGreaterThan(-1);
    expect(initHandler, 'the init handler must still be there').toBeGreaterThan(shortcode);
    expect(mintCall, 'the mint must live inside the init handler').toBeGreaterThan(initHandler);

    // THE assertion. Everything between the two registrations is the shortcode's own callback, and
    // a render-time mint is a token in cacheable HTML.
    const shortcodeCallback = PLUGIN.slice(shortcode, initHandler);
    expect(shortcodeCallback, 'the shortcode callback must never mint a token').not.toContain('tradingroom_sso_mint(');
  });

  it('signs HS256 over header.payload', () => {
    expect(PLUGIN).toContain("hash_hmac( 'sha256', $header . '.' . $payload, $secret, true )");
    expect(PLUGIN).toContain("'alg' => 'HS256'");
  });

  it('sends the room claim, which the verifier binds against the URL', () => {
    expect(PLUGIN).toContain("'room'        => $room,");
  });

  it('normalises entitlement lists so PHP emits arrays and not objects', () => {
    expect(PLUGIN).toContain('array_values( array_unique( $values ) )');
  });

  it('keeps the secret out of the rendered page entirely', () => {
    // The settings screen shows a mask; the key itself must never be echoed.
    expect(PLUGIN).toContain("str_repeat( '•', strlen( $secret ) )");
    // A shortcode attribute for the key would put it in post content, where every editor sees it.
    expect(PLUGIN).not.toContain("'key' =>");
  });

  it('requires a logged-in user before minting anything', () => {
    expect(PLUGIN).toContain('if ( ! is_user_logged_in() ) {');
    expect(PLUGIN).toContain('wp_login_url(');
  });

  it('refuses an unknown room instead of redirecting anywhere it is told', () => {
    // The room must already be a configured key; that is what makes the outbound redirect safe.
    expect(PLUGIN).toContain("$settings['rooms'][ $room ] ?? ''");
    expect(PLUGIN).toContain("if ( '' === $settings['controller'] || '' === $secret ) {");
  });
});
