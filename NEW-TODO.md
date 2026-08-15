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

## 2.1 The Files sort bar — decoded, VERIFIED, and corrected ✅

> **Superseded by `docs/decoded/files-sort-bar.md`, 2026-08-15.** Everything below was re-checked
> against the bundle offset by offset. The classes, the four title strings and the comparator all
> hold. **Three things here are wrong or missing**, and the first would have shipped a subtly broken
> control:
>
> 1. **The two buttons share ONE direction variable.** The table below reads as though Name and Date
>    each keep their own asc/desc. They do not — both icons key off the same `fileSortDir`.
> 2. **Switching field RESETS the direction** to that field's default (`date` → `desc`,
>    `name` → `asc`). Not recorded below at all.
> 3. **The pane opens `date`/`desc`**, not unsorted, and the button labels are `" Name "` and
>    `" Date "` with leading and trailing spaces.
>
> Build from the spec, not from this section.

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

# PART 5 — Three alert features found 2026-08-15 by ENUMERATION, not by asking

Full spec: `docs/decoded/alert-scheduler-filter-labels.md`.

**How they were found is the point.** `audit-feature-coverage.mjs` was written after Swing and Day
Trade — two whole tabs — turned out to have been in the bundle from day one with nothing ever
enumerating the reference's features. Running it after the Swing build reported 47/88 wire commands
present, and four of the missing ones were alert-related. All four returned **zero hits across
`docs/`, `TODO.md` and `NEW-TODO.md`**: no spec, no row, no mention anywhere.

Same failure mode as Swing, caught by the same mechanism, eleven hours later. **Run that audit after
every feature lands.**

## 5.1 Alert Filter — each viewer chooses whose alerts they see 🟡

Smallest of the three and the only one that changes what an ordinary member sees. One command in
both directions, one modal, no entitlement flag found.

- `updateAlertFilter` — send `{alertFilterFor, userXrefID}` (byte 1,221,491); the response sets
  `user.alertFilterFor` and **re-fetches `getAlertsLog {page:0}`** (byte 1,017,535).
- **CORRECTED 2026-08-15: the filtering is CLIENT-side, in three places** — the live SSE stream
  (1,004,533), `getAlertsLog` (1,017,070) and the alerts search results (1,020,817), all with one
  identical guard. An earlier version of this row said the server owns it; building to that would
  have produced an architecture the reference does not have. The command is for PERSISTENCE.
- **Consequence worth deciding on:** every alert reaches every browser and some are hidden after
  arrival, so this is a display preference and **not** an access control. Filtering server-side
  instead would be a real improvement and a deliberate divergence — record it as one if taken.
- `preferences.showAlertsFrom` **inverts the meaning** — the same selection is an allow-list when
  true and a deny-list when false. Treating it as a display toggle gets the semantics backwards.
- Buttons verbatim, spaces included: `" Unselect All "`, `" Select All "`, `" Save"` — the last has a
  leading space and no trailing one, unlike its neighbours.

## 5.2 Alert Labels — per-room hashtags prefixed onto alert text 🟢

**Not a wire feature at all**: `getAlertLabels` / `saveAlertLabels` / `updateAlertLabels` /
`hasAlertLabels` are all 0 occurrences. Configuration plus a text transform.

- `sessData.alertLabels` is a **string containing JSON**, trimmed then `JSON.parse`d, every entry
  given `checked = false` (byte 1,147,292). `sessData.chatTabsWithBadges` uses the identical shape.
- `processAlertLabels` prefixes `" #" + hash` per checked label, **newline after the last and a space
  after the others**, prepends the result to `txt`, and **clears every checkbox as a side effect of
  formatting** (byte 2,131,206).

## 5.3 Alert Scheduler — post an alert later, optionally repeating 🔴

The largest. An entitlement, three commands, a modal with a table, repeat semantics, and a
**server-side scheduler this project has no equivalent for** — that part is a design decision, not a
port.

- **Entitlement `sessData.hasAlertScheduler`** (8 occurrences). It is NOT in `room-settings-schema.ts`
  and its manage-page control was not located. Per the per-client-entitlement pattern one should
  exist — **not invented; recorded as a gap.**
- `alertMsgLater` (byte 2,130,937) · `getScheduledAlerts`, null payload (bytes 1,009,797 / 1,021,836)
  · `removeScheduledAlert` `{scheduledAlertID}` (byte 2,407,145), whose response splices by id.
- **`ignoreWeekends` is not the checkbox value** — it is sent as
  `"daily" === repeatScheduledAlert && ignoreWeekends`, so a weekly repeat always sends false.
- Component `app-scheduled-alerts-modal`, modal id `scheduledAlertsModal`, `decls: 27`. Row cells:
  `sendOn | date:"short"`, `alert.n`, `alert.txt`, `repeat || "off"`, a `" Remove "` button, plus a
  conditional `"no weekends"` span when daily and ignoring weekends.
- Strings verbatim: `"Alert scheduled OK."`, `"Please enter some alert text..."`, and a remove
  confirm built by CONCATENATION with a full stop before `text:` and **no closing question mark**.

**Honest gaps** (also in the spec): the `hasAlertScheduler` manage control, the three `ngClass` class
names on the repeat badge, the modal's own 27-declaration layout, and what the server does with
`sendLaterAsNick` / `sendLaterAsEmail` / `dontCrossPost`.

---

# Suggested order

**Built since this list was written, and removed from it:** 2.3 Swing Alerts, 2.4 Day Trade Alerts,
and the four "For All" broadcast commands — which were not a missing feature but three SHIPPED
controls that said "For All" and moved one browser. See `CHANGELOG.md`.

**Re-specified because "fully decoded" was not:** 2.1, the Files sort bar. Three errors found on
re-reading, one of which ships a control that looks right and behaves wrong. Build from
`docs/decoded/files-sort-bar.md`, not from §2.1.

1. **1.1 + 1.2 together** — they share the SSE revocation plumbing, and they are the two that cost
   money every day they are open.
2. **2.1 the sort bar** — spec verified offset by offset, small, and it proves the theming rule end
   to end.
3. **`presAreaTabs-recordings` — BLOCKED, and I was wrong to call it cheap.** The pane is one iframe
   onto `${apiROOT}/sessions/v2/archives/recordings/{sessionID}/{token}`, a SERVER archive page.
   Measured: **zero recordings or archive tables in either database** — 22 room tables, 15 controller
   tables, none matching. Our Recordings is a different thing: `recording-codec.ts` records the
   presenter's screen locally to a download. That is the ACT of recording; this tab is PLAYBACK of
   past archives. Building the surface now yields an iframe pointing at nothing, which is the dead
   scaffolding the standard forbids. **Needs an archive service first, which is a design decision.**

   Two corrections to the triage's own claims, measured here: `recsInRoom` is NOT absent from the
   repo — it is in `room-settings-schema.ts:247` unwired and `room-settings-profile.ts:78` — and
   `hideRecs` is already in `ROOM_VISIBLE_SETTINGS` at `room-config.ts:214`.
4. **5.1 Alert Filter**, then **5.2 Alert Labels** — both small, and 5.1 is the only one of the
   three that changes what an ordinary member sees.
5. **2.2 Benzinga** — small, needs one more decode pass for the const-table classes.
6. **2.5 Mobile** — after `docs/MOBILE-APP.md` is read.
7. **5.3 Alert Scheduler** — needs an entitlement whose manage-page control was NOT located, and a
   server-side scheduler that does not exist here.
8. **Part 3 v5** — when an account is cleared for it.

**Then the 25 confirmed gaps in `docs/decoded/missing-commands-triage.md`**, which is the only
complete list of what the reference has and we do not. Moderation (`kickUser`, `unmuteChat`,
`lockSession`) and the archives pair (`archiveLogs` / `unarchiveLogs`) are the largest clusters left.
Five media-server admin commands are deliberately parked as UNCLEAR: whether a presenter should be
able to reset shared media infrastructure is a product and safety decision, not a porting question.

## Evidence, all committed

- `apps/room/docs/source-v4-2026-08-15/` — the current v4, three files + `sha256sums.txt` + a README
  recording how it was verified and what changed
- `apps/room/scripts/collect-app-versions.js` — the read-only version collector
- `v5.md` — the version measurements and the retraction
- `apps/room/docs/source/` — the OLDER v4, SHA-256 pinned, untouched
