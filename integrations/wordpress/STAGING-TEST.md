# Staging test — the evidence that closes `TODO.md` item Q

The PHP is already proven: `php -l` clean under 8.3.33, and a token minted by the plugin's own
functions is verified by 16 tests here. **What no machine in this repository can prove is that it
works inside WordPress**, because the test harness stubs WordPress rather than booting it.

This is that missing half, written as a checklist so it is an hour of following steps rather than an
afternoon of working out what to check. Do it on a **staging** site, never production.

**The one test that matters is §6.** Everything before it is setup. If you only have time for one
thing, get to the cancellation.

---

## What you need

- A staging WordPress with **WooCommerce**, plus **WooCommerce Memberships** and/or
  **WooCommerce Subscriptions** — whichever the customer actually uses.
- One test customer account you can subscribe and cancel at will.
- A room in the controller you can safely open and close.
- Access to the controller's logs (`vercel logs`), which is where every refusal explains itself.

---

## 1. Configure the room

Manage → Settings:

| field | value |
| --- | --- |
| **JWT Secret Key** | a fresh 64-character random string. `openssl rand -hex 32` |
| **Membership filter** | the exact WooCommerce plan slug, e.g. `gold-annual` |
| **Product filter** | leave **blank** — see the warning below |
| **Permissions filter** | leave blank |
| **Token Expiration** | `1h` |
| **Custom login error message** | something recognisable, e.g. `STAGING: refused` |

> Leave the other filters blank deliberately. Filters are **OR-ed**, so a second one would let a
> visitor in who matches only it — and you would not be testing the membership gate at all.

Room state must be **open**.

## 2. Install the plugin

1. Copy `tradingroom-sso/` into `wp-content/plugins/`, activate it.
2. **Settings → Trading Room SSO**: controller URL (no trailing slash), then one line —
   `<room short code> = <the JWT Secret Key from step 1>`.
3. Save. Re-open the page: the key must render as **bullets**, not the key. *If you can read the
   key, stop — that is a defect.*
4. Put `[tradingroom room="<short code>"]` on a page.

## 3. Logged out

Open the page in a private window.

- **Expect:** no button at all.
- Then set `logged_out_text="Members only"` and reload — the sentence renders, still no button.

*Proves the shortcode reveals nothing to anonymous visitors.*

## 4. A paid member gets in

Log in as the test customer **with an active membership matching the filter**, and click the button.

- **Expect:** the room loads, with their WordPress display name on the roster.
- **Check the URL you passed through:** it should be `/sso/<code>?jwt=…`, then a redirect to
  `/session?id=<code>&jwtSite=…`.
- **Check the controller log** for `[sso] admitted` — it names the filter entry that opened the
  door, e.g. `basis: ["membership:gold-annual"]`. **If it says `no-filters-configured`, your filter
  did not save and the rest of this test is meaningless.**

## 5. The cache trap — the failure this design exists to prevent

With the member still logged in:

1. Copy the **button's `href`** (right-click → copy link address). It must be a link to the
   WordPress site, containing `tradingroom_sso=1`. **It must NOT contain a `jwt=` token.**
2. Open that href in a **private window, logged out**.
   - **Expect:** the WordPress login page — not the room.

*If the href contains a token, or if a logged-out visitor reaches the room, stop and report it. That
is the cached-token failure: every visitor served that page would enter as whoever loaded it first.*

If the staging site has a page cache, clear it, load the page as one member, then load it as another
and confirm each gets into the room as themselves.

## 6. **Cancel the subscription — the test this whole feature exists for**

1. In WooCommerce, **cancel or expire** the test customer's membership.
2. Do **not** log them out. Reload the page and click the button again.

- **Expect:** refused. Either your `STAGING: refused` message, or a redirect to
  `loginErrorURL` if you set one.
- **Controller log:** `[sso] refused` with `reason: "no-match"`.

3. Re-activate the membership, click again — **expect:** back in, `[sso] admitted`.

*This is the only step that proves entitlement is live rather than decorative. Everything else can
pass with a permanently-open door.*

## 7. Staleness

1. Set **Token Expiration** to `1m` on the Manage page.
2. Click the button and let the room load, then wait **three minutes** and reload the room page.

- The existing session is unaffected — expected, and worth seeing: **a lapse blocks the next entry,
  not the session already running.**

3. Click the WordPress button again after the wait — a fresh token is minted each click, so it still
   works. To see a refusal you need a *stale* token: copy the `/sso/...?jwt=…` URL from step 4, wait
   past the expiry, then paste it.
   - **Expect:** refused, `reason: "too-old"` or `"expired"` in the log.

Set Token Expiration back to `1h`.

## 8. Wrong room

Take a working `/sso/<code>?jwt=…` URL and change **only the room code** in the path to another room
you own.

- **Expect:** refused, `reason: "wrong-room"`.

*Proves one customer key cannot open every room that customer owns.*

## 9. Room closed

Close the room in the controller, then click the button.

- **Expect:** refused, `reason: "room-closed"`.

---

## What to record

Paste into `TODO.md` item **Q** when it passes, or open a defect with the same detail:

- WordPress, WooCommerce, Memberships/Subscriptions and PHP versions.
- The `[sso] admitted` line from §4 and the `[sso] refused` line from §6, verbatim.
- Whether the button href in §5 was token-free.
- Anything that behaved differently from the expectations above.

**Item Q closes when §6 passes** — a real cancellation refusing the next entry, against a real
WooCommerce. Nothing less is evidence, because every other step can pass with the gate wide open.
