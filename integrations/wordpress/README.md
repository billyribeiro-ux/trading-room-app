# WordPress SSO — letting a customer's WooCommerce decide who enters

A customer runs their own WordPress site with WooCommerce. Their billing system knows whether a
member's subscription is paid up; ours does not, and deliberately never will. This integration lets
their site vouch for a member, over a signature we can check, so the member enters the room without
a second login and a lapsed payment closes the door on its own.

```
  WordPress                         Controller                      Room
  ─────────                         ──────────                      ────
  member clicks
  "Enter Room"
        │
        │  reads WooCommerce: active memberships,
        │  active subscriptions, purchased products
        │
        │  signs { name, email, room, memberships,
        │          products, permissions, iat, exp }
        │  with THIS ROOM'S ssoJWTSecret
        ▼
  /sso/<code>?jwt=… ───────────────▶ verify signature
                                     check room binding + freshness
                                     evaluate the room's filters
                                             │
                                             │ mint the ordinary guest handoff
                                             ▼
                                     /session?id=<code>&jwtSite=… ──▶ member is in
```

**Nothing about the room application changes.** The controller already owns identity and mints every
handoff; this is a third door onto the same corridor, beside owner-launch and guest-login.

## The two properties worth protecting

**Entitlement is delegated. Authority is not.** The customer's site decides *whether* somebody may
enter. It cannot decide *what they are* — the handoff is minted as a guest, and the room resolves
role from its own membership, failing closed to `member`. If a customer's WordPress is compromised,
the blast radius is people getting into a room they did not pay for, not somebody arriving as staff.

**A lapsed payment needs no webhook.** WooCommerce simply stops reporting the plan, so the signed
assertion arrives with nothing in it and no filter matches. Absence is the signal, which means our
gate cannot drift out of step with their billing state machine.

## Setting it up

**On the room's Manage page → Settings:**

| field | what to put in it |
| --- | --- |
| **JWT Secret Key** (`ssoJWTSecret`) | a long random string, unique per room. This is the shared key. |
| **Membership filter** (`allowedMemberships`) | comma-separated WooCommerce membership plan slugs |
| **Product filter** (`allowedProducts`) | comma-separated product slugs |
| **Permissions filter** (`allowedPerms`) | anything the site asserts through the `tradingroom_sso_permissions` filter |
| **Token Expiration** (`tokenExpiresIn`) | how stale an assertion may be — `1h` is the default, `1d` the maximum |
| **Custom login error URL / message** | where a refused member lands, e.g. the customer's renewal page |

> **Filters are OR-ed, not AND-ed.** Filling in a second family *widens* access rather than
> narrowing it — a visitor matching **any one** listed value gets in. That is the reference's own
> documented behaviour ("Either a product or membership, or both must match"). To restrict a room,
> configure **one** family and leave the others blank.

**On the customer's WordPress:**

1. Copy `tradingroom-sso/` into `wp-content/plugins/` and activate it.
2. **Settings → Trading Room SSO** — paste the controller URL, then one line per room:
   `1001 = <the JWT Secret Key from that room>`
3. Put `[tradingroom room="1001"]` on any page.

Shortcode attributes: `room` (required), `link_text`, `class`, `logged_out_text` (shown instead of
the button when nobody is logged in — blank renders nothing).

## Two implementation details that are not style choices

**The token is minted when the link is clicked, never when the page renders.** A token embedded in
rendered HTML would be stored by the page cache, the CDN and every "copy of this page" plugin, then
served to every subsequent visitor — each of whom would enter as whoever loaded it first. The
shortcode therefore links to the plugin's own endpoint, which mints and redirects.

**The key is never a shortcode attribute.** The reference's own shortcode carried `key=''`, which
puts a room credential into post content where every editor, revision and export can see it. Ours
keeps keys in site options, masked on the settings screen.

## For the customer's developer

Three filters are available for sites whose entitlements do not live in WooCommerce:

```php
add_filter( 'tradingroom_sso_memberships', function ( array $slugs, int $user_id ): array { … }, 10, 2 );
add_filter( 'tradingroom_sso_products',    function ( array $slugs, int $user_id ): array { … }, 10, 2 );
add_filter( 'tradingroom_sso_permissions', function ( array $caps,  int $user_id ): array { … }, 10, 2 );
```

and an action, `tradingroom_sso_before_redirect( $user_id, $room, $entitlements )`, for auditing.

## Status — read this before shipping it to a customer

**The PHP is executed and proven; the WordPress integration is not yet.**

Done, on 2026-08-10 under **PHP 8.3.33** in a container (no local PHP needed):

- `php -l` — no syntax errors.
- `tests/mint-golden-token.php` mints a token through the plugin's own
  `tradingroom_sso_entitlements()` and `tradingroom_sso_mint()`. That exact token is committed as
  `tests/golden-token.json` and verified by
  `apps/controller/src/lib/server/sso-wordpress-contract.test.ts` — **16 tests**, including the two
  PHP-specific encoding hazards (forward-slash escaping, and `json_encode` emitting `{}` for a
  non-sequential array). Negative control: changing one signature byte fails it.

Regenerate the vector after any change to the minting path:

```bash
docker run --rm -v "$PWD/integrations/wordpress/tradingroom-sso":/app php:8.3-cli \
  php /app/tests/mint-golden-token.php > integrations/wordpress/tradingroom-sso/tests/golden-token.json
```

**Still outstanding, and it needs a real site rather than a build machine:** the harness stubs the
three WordPress functions the plugin touches at load time — it does not boot WordPress. Before a
customer uses this, install it on a staging site with WooCommerce, enter as a paid member, then
**cancel the subscription and confirm the next entry is refused**. That is the only thing that
exercises `wc_memberships_get_user_active_memberships`, `wcs_get_users_subscriptions`, the settings
screen and the cached-page path. Tracked as `TODO.md` item **Q**.
