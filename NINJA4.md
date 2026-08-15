# NINJA 4 — Test the WordPress plugin on a real site

**Time: about an hour.** You need a **staging** WordPress site. Never do this on production.

---

## What you need before starting

- A **staging** WordPress with **WooCommerce**, plus **WooCommerce Memberships** and/or
  **WooCommerce Subscriptions** — whichever your customer actually uses.
- One test customer account you can subscribe and cancel at will.
- A room in the controller you can safely open and close.
- Access to the controller's logs. If it's on Vercel: `vercel logs` in Terminal, or the Logs tab in
  the dashboard. **Every refusal explains itself there** — you will need this.

---

## What's already proven, so you don't redo it

The plugin's PHP code is already tested and clean: it passes `php -l` under PHP 8.3.33, and a
security token minted by the plugin's own functions is verified by 16 tests, including a negative
control where changing one byte of the signature makes it fail.

**What no test here can prove is that it works inside actual WordPress**, because the tests replace
WordPress with a stand-in. That is the only thing you're doing.

---

## ⭐ The one step that matters is Step 6

Steps 1–5 are setup. **If you only have time for one thing, get to Step 6** — cancelling a
subscription and proving the door closes. Everything else can pass with the door permanently wide
open, so only Step 6 is real evidence.

---

## Step 1 — Configure the room

In the controller: **Manage → Settings**

| field | value |
| --- | --- |
| **JWT Secret Key** | a fresh 64-character random string — run `openssl rand -hex 32` in Terminal |
| **Membership filter** | the exact WooCommerce plan slug, e.g. `gold-annual` |
| **Product filter** | leave **blank** |
| **Permissions filter** | leave **blank** |
| **Token Expiration** | `1h` |
| **Custom login error message** | `STAGING: refused` |

Room state must be **open**.

> ⚠️ **Leave the other filters blank on purpose.** Filters are **OR-ed** together. A second filter
> would let someone in who matches only that one — and you would not be testing the membership gate
> at all.

---

## Step 2 — Install the plugin

1. Copy the `tradingroom-sso/` folder into `wp-content/plugins/` and activate it.
2. Go to **Settings → Trading Room SSO**. Enter:
   - Controller URL (**no trailing slash**)
   - One line: `<room short code> = <the JWT Secret Key from Step 1>`
3. Save, then **re-open the page**.

✅ **The key must now render as bullets (••••), not readable text.**
❌ **If you can read the key on screen, STOP and tell me.** That is a defect.

4. Put this on a page: `[tradingroom room="<your short code>"]`

---

## Step 3 — Logged out

Open that page in a **private/incognito window**.

- ✅ **Expect:** no button at all.
- Now set `logged_out_text="Members only"` on the shortcode and reload.
- ✅ **Expect:** the sentence appears, still **no button**.

*This proves the shortcode reveals nothing to anonymous visitors.*

---

## Step 4 — A paid member gets in

Log in as your test customer **with an active membership matching the filter**, and click the button.

- ✅ **Expect:** the room loads, showing their WordPress display name on the roster.
- ✅ **Check the URL:** it should go to `/sso/<code>?jwt=…`, then redirect to
  `/session?id=<code>&jwtSite=…`
- ✅ **Check the controller log** for `[sso] admitted`. It names what opened the door, e.g.
  `basis: ["membership:gold-annual"]`

❌ **If the log says `no-filters-configured`:** your filter did not save. Fix Step 1 — the rest of
this test is meaningless until it does.

**📋 Copy that `[sso] admitted` line. I need it at the end.**

---

## Step 5 — The cache trap

Still logged in as the member:

1. **Right-click the button → Copy link address.**
2. Look at what you copied. It must be a link **to the WordPress site**, containing
   `tradingroom_sso=1`.

   ❌ **It must NOT contain `jwt=`.**

3. Open that copied link in a **private window, logged out**.
   - ✅ **Expect:** the WordPress login page — **not** the room.

❌ **If the link contained a token, or a logged-out visitor reached the room: STOP and tell me.**
That's the cached-token failure: every visitor served that page would enter as whoever loaded it
first.

If your staging site has page caching, clear it, load the page as one member, then as another, and
confirm each gets in as themselves.

---

## Step 6 — ⭐ Cancel the subscription. This is the real test.

1. In WooCommerce, **cancel or expire** the test customer's membership.
2. **Do not log them out.** Reload the page and click the button again.

- ✅ **Expect: refused.** Either your `STAGING: refused` message, or a redirect if you set one.
- ✅ **Controller log:** `[sso] refused` with `reason: "no-match"`

**📋 Copy that `[sso] refused` line. I need it at the end.**

3. Re-activate the membership and click again.
   - ✅ **Expect:** back in, `[sso] admitted`.

*This is the only step that proves entitlement is live rather than decorative.*

---

## Step 7 — Expiry

1. Set **Token Expiration** to `1m` on the Manage page.
2. Click the button, let the room load. Wait **three minutes**, reload the room page.
   - ✅ **Expect:** the existing session still works. That is correct and worth seeing —
     **a lapsed subscription blocks the next entry, not the session already running.**
3. To see an actual refusal you need a *stale* token: copy the `/sso/...?jwt=…` URL from Step 4, wait
   past the expiry, then paste it into the browser.
   - ✅ **Expect:** refused, `reason: "too-old"` or `"expired"`.

**Set Token Expiration back to `1h` when done.**

---

## Step 8 — Wrong room

Take a working `/sso/<code>?jwt=…` URL and change **only the room code** in the path to another room
you own.

- ✅ **Expect:** refused, `reason: "wrong-room"`.

*Proves one customer's key cannot open every room you own.*

---

## Step 9 — Room closed

Close the room in the controller, then click the button.

- ✅ **Expect:** refused, `reason: "room-closed"`.

---

## When you're done, send me this

- WordPress version, WooCommerce version, Memberships/Subscriptions version, PHP version
- The `[sso] admitted` line from Step 4, **verbatim**
- The `[sso] refused` line from Step 6, **verbatim**
- Whether the button link in Step 5 was token-free (yes/no)
- Anything that behaved differently from what's written above

Say **"ninja 4 done"** with those.

> **This closes when Step 6 passes** — a real cancellation refusing the next entry against a real
> WooCommerce. Nothing less counts, because every other step can pass with the gate wide open.
