# NEW-TODO — what to build next

Written 2026-08-15 00:30 EDT.

`TODO.md` tracks **matching the original**. This file is different, and the difference matters:

- **Part 1** is **fixing flaws the original has.** These are deliberate divergences — we are
  knowingly NOT matching, because matching would reproduce a defect that costs the owner money.
- **Parts 2–4** are features the original has that we do not have yet, decoded 2026-08-15 from the
  **current** v4 bundle.

Everything below cites where it came from. Nothing here is a guess, and where something is not yet
established it says so.

---

# PART 1 — Flaws in the original we are fixing, not matching

Both were raised by the owner 2026-08-15. Both are revenue leaks.

## 1.1 An expired subscription keeps receiving alerts 🔴

**The flaw:** in the original, entitlement is checked when someone ENTERS a room. Once they are in,
nothing re-checks. A customer whose subscription lapsed keeps receiving alerts for as long as their
session lives.

**Where ours stands today, measured:**

- `integrations/wordpress/` checks WooCommerce membership at the SSO handoff — that is entry only.
- `apps/controller/src/lib/server/stream-ingest.ts` documents the identical shape for playback and is
  honest about it: *"a member banned right now keeps the ability to fetch the playlist until their
  token expires"*, with `READ_TOKEN_TTL_SECONDS = 43_200` (12 hours).
- So **we currently reproduce the flaw.**

**What closing it means.** A live entitlement check on the paths that deliver value, not only at the
door. Three decisions to make before writing code, and they are the whole design:

1. **Where the check goes.** On the SSE alert stream is the cheapest correct place — it is already a
   long-lived per-member connection the server owns, so it can be closed. Re-checking on every alert
   fan-out is more precise and more expensive.
2. **How fresh it has to be.** A per-member `entitlement_checked_at` with a TTL, re-validated against
   the controller, is the shape `stream-ingest.ts` already suggests for the token case: *"a
   room-level epoch in the claim checked against a cached counter — not a per-segment membership
   query."*
3. **What the member sees.** Silent disconnect is hostile. A stated reason — "your subscription has
   lapsed" — is the honest version, and it is also the one that gets them to renew.

**Do not** implement this by shortening token lifetimes alone. That makes the window smaller without
making the check live, and it degrades everybody's experience to half-fix one case.

## 1.2 One account, one active session 🔴

**The flaw:** the original lets one login be used from many devices at once. Customers share
credentials, and one subscription serves several people.

**Where ours stands today, measured.** `apps/room/src/lib/server/auth.ts:81` —
`createSessionFor()` does a plain `INSERT` into `sessions` and **deletes nothing**. There is no
per-user session limit anywhere. **We reproduce the flaw exactly.**

**What closing it means.** The `sessions` table already has everything needed: `id`, `user_id`,
`created_at`, `last_seen_at`, `room_short_code`. Adding "newest login wins" is a delete-then-insert
inside one transaction.

Decisions to make first:

1. **Newest wins, or oldest holds?** Newest-wins is what streaming services do and it is
   self-service: the real owner logs in again and evicts the freeloader. Oldest-holds turns every
   shared password into a support ticket.
2. **Scope — per account, or per account per room?** A presenter legitimately using a laptop and a
   phone in the same room is a real case. Per-account-globally is stricter and simpler; per-room is
   friendlier and more code.
3. **How the evicted device finds out.** The SSE channel can push a `sessionRevoked` command, which
   is the same mechanism 1.1 needs — **build these two together, they share the plumbing.**
4. **Presenters may need an exemption.** Confirm with the owner before assuming.

**Note for both:** these are the first features in this repository whose reference is deliberately
*not* the original. Every divergence elsewhere is documented at the code with a WHY, and these need
the same treatment — a comment saying we knowingly do not match, and the reason.

---

# PART 2 — v4 features decoded 2026-08-15, ready or nearly ready

We had an OLDER v4. The current one is captured in
`apps/room/docs/source-v4-2026-08-15/` (three files, SHA-256 recorded, verified three ways).

The delta between the two builds is **+3,329 bytes: twelve strings added, one removed.**

## 2.1 The Files sort bar — FULLY DECODED, ready to build ✅

Everything needed is in hand. Nothing to guess.

**Markup** (`t2e` in the current bundle):

```js
d(0,"div",242)(1,"span",243), v(2,"Sorting by:"), u(),
d(3,"button",244), x("click", () => toggleFileSort("name")), v(4," Name "), …
d(7,"button",246), x("click", () => toggleFileSort("date")), v(8," Date "), …
```

**Classes:** `st-fileSortBar` = `d-flex flex-wrap justify-content-center align-items-center mt-2`;
each button `btn btn-sm m-1` plus `st-fileSortName` / `st-fileSortDate`; the label `<span class="mr-2">`.

**The four title strings, verbatim:**

| button | when | title |
| --- | --- | --- |
| Name | `desc` | `Sorted Z to A (click to sort A to Z)` |
| Name | otherwise | `Sorted A to Z (click to sort Z to A)` |
| Date | `asc` | `Sorted oldest to newest (click to sort newest to oldest)` |
| Date | otherwise | `Sorted newest to oldest (click to sort oldest to newest)` |

**Icons — note the asymmetry, it is easy to get wrong:**

| button | asc | desc | inactive |
| --- | --- | --- | --- |
| Name | `fa-sort-alpha-down` | `fa-sort-alpha-up` | `fas fa-sort ml-2` |
| Date | `fa-sort-amount-down` | `fa-sort-amount-up` | `fas fa-sort ml-2` |

**The comparator** (`sortFiles` pipe, verbatim behaviour): date sorts on
`new Date(created).getTime()`, name on `(name||"").toLowerCase()`; equal values return `0`, so ties
do NOT fall back to the other field.

**State:** `fileSortField` (`"name"|"date"`), `fileSortDir` (`"asc"|"desc"`), toggled by
`toggleFileSort(field)`. The active button carries `.active`.

**CSS — and this is the theming rule in miniature:**

```css
.st-fileSortBar{font-size:12px}
.st-fileSortName,.st-fileSortDate{color:var(--tabs-color);background-color:transparent;border:1px solid var(--file-see-more-bg)}
.st-fileSortName.active,.st-fileSortDate.active{background-color:var(--file-see-more-bg)}
```

**Both tokens already exist** in `css/complete-app-styles.css` and `src/app.css`. Build against the
token names.

## 2.2 Benzinga News — small, decoded

A nav `<li>` linking out, beside "Reopen Alerts / Chat" and "Recording" (`mPe`/`pPe`/`fPe`):

- `href` = `benzingaUrl`
- renders `<img src="{{sessData.altBenzingaLogoURL}}">` when that is set, **else** icon + the text
  **"Benzinga News"**
- assets: `/assets/images/benzinga-logo.png`; classes `benzinga-li`, `benzinga-logo`,
  `benzinga-logo-alt`

**`altBenzingaLogoURL` is per-room** — the same customer-branding pattern as the theme tokens.

**Still needed:** the const table entries for exact classes on the `<li>`, `<a>` and `<img>`, and
where `benzingaUrl` is set.

## 2.3 Swing Trade Alerts — LARGE, needs a decode pass

Its own presentation-area tab: `presAreaTabs-swingAlerts`, labelled **"Swing Alerts"**.

**Four wire commands:** `getSwingAlertsLog` · `newSwingAlertMsg` · `editSwingAlertMsg` ·
`deleteSwingAlertMsg`

**Form fields:** `swingAlert-symbol` · `swingAlert-long` / `swingAlert-short` ·
`swingAlert-entryPrice` · `swingAlert-target` · `swingAlert-stop` · `swingAlert-image` ·
`swingAlert-search` · `swingAlert-limit`

**Two pipes, already read:**

- `searchSwingLogs` — filters on `symbol` OR `senderName`
- `limitSwingLogs` — `slice(0, n)`

**Empty state, verbatim:** `" No Swing Trade Alerts to display. "`
**Export:** `Download Swing Trades`, class `download-swing-trades-btn`
**Containers:** `swing-alerts-container`, `swing-alert-form`, `swing-symbol-container`,
`swing-alert-btn-edit`, `swing-alert-btn-delete`

**Scale: comparable to the notes editor.** Tab, form, log list, search, limit, export, four commands,
plus persistence. Not an afternoon.

## 2.4 Day Trade Alerts — LARGE, not yet examined

A parallel feature in the same bundle: `dayTradeAlert-direction`, `dayTradeAlert-long`,
`dayTradeAlert-short`, `dayTradeAlert-limit`, `dayTradeAlert-search`, `Download Day Trades`,
`download-day-trades-btn`, `day-trade-alert-btn-edit`, `day-trade-alert-btn-delete`.

Same shape as Swing. **Decode both together** — they will share most of their structure, and finding
out where they differ is cheaper than doing them separately.

## 2.5 Mobile app — the other half of the v4 delta

New strings: `mobile-app-container`, `mobile`, `restoreMobileAppTokens`, `fa-mobile-alt`.

`docs/MOBILE-APP.md` already exists in this repository — **read it before decoding anything**, it may
already answer most of this.

## 2.6 Removed upstream — check whether we built it

`"Connectivity/Mic Troubleshooter"` is in our older bundle and **gone** from the current v4. If we
built it, it should probably come out. If we did not, do not build it.

---

# PART 3 — v5, later

The owner's decision: **match v4 first, v5 afterwards.**

What is established (see `v5.md`, measured 2026-08-15):

- `useV3` and `useV5` are **live** editable checkboxes on the manage page. **`useV4` is commented
  out** in the reference — v4 is the default, which is why `/` and `/v4` are byte-identical.
- `/v3` is a real, separate, older build. `/v5` **404s as a URL path** on `chat.protradingroom.com`.
- The client has **no version-switching logic** — 0 occurrences of `useV3/4/5` in 2,887,876 bytes
  with a passing control — so the **server** selects the build per room.
- Therefore the 404 does **not** mean v5 does not exist. It means v5 is not served at that path.

**What settles v5:** a room whose `useV5` is ON, loaded in a browser, network panel showing which
`main.*.js` it fetches. Per the setting's own warning that needs an account "PTR cleared for v5".

---

# PART 4 — The theming rule, which applies to everything above

**Owner, 2026-08-15:** *"Simpler Trading chose their own theme and we have to stick to Bootstrap so
customers can customize theirs like Simpler's."*

**The evidence agrees, and the original already works this way.** Its stylesheet carries **573 CSS
custom properties**, and every colour in the new sort-bar rules is a `var(--…)`. Simpler Trading's
"theme" *is* those variables set to their values.

**So, for every feature in this file:**

- Structure is **Bootstrap**. Colours come from **tokens**, never literals.
- If a token does not exist yet, add it — do not hardcode ST's resolved colour.
- Per-room branding overrides already have a precedent: `altBenzingaLogoURL` above, and the manage
  page's Branding tab.

---

# Suggested order

1. **1.1 + 1.2 together** — they share the SSE revocation plumbing, and they are the two that cost
   money every day they are open.
2. **2.1 the sort bar** — fully decoded, small, and it proves the theming rule end to end.
3. **2.2 Benzinga** — small, needs one more decode pass.
4. **2.3 + 2.4 Swing and Day Trade together** — the big one.
5. **2.5 Mobile** — after `docs/MOBILE-APP.md` is read.
6. **Part 3 v5** — when an account is cleared for it.

## Evidence, all committed

- `apps/room/docs/source-v4-2026-08-15/` — the current v4, three files + `sha256sums.txt` + a README
  recording how it was verified and what changed
- `apps/room/scripts/collect-app-versions.js` — the read-only version collector
- `v5.md` — the version measurements and the retraction
- `apps/room/docs/source/` — the OLDER v4, SHA-256 pinned, untouched
