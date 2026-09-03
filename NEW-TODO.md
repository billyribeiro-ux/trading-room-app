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

> ## ⛳ WHERE THIS FILE STANDS, 2026-09-03
>
> **All repository-buildable work in this file is complete.** The recordings row closed with a
> first-party durable archive, and Parts 1, 2, 4 and 5 are built. One vendor-only validation remains:
>
> | external acceptance | blocked on                                                                                                                                                             |
> | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | Part 3, v5          | a vendor account whose room is actually assigned the server-selected v5 build. The public `/v5` path is not evidence because every version path currently returns 404. |
>
> `presAreaTabs-recordings` closed on 2026-09-03 without reproducing the reference's bearer token in
> an iframe URL. The room now stores a media catalog and immutable recording-log snapshots, streams
> uploads, serves authenticated range playback, enforces the captured archive entitlement on both
> list and media routes, and exposes pagination, transcript download and presenter deletion.
>
> The five reset methods remain NOT WORK: the pinned bundle contains declarations but no call sites,
> so inventing controls for them would diverge from the reference.

# PART 1 — BOTH BUILT, 2026-08-27

Both revenue leaks are closed. What follows is the record of what was built and the decisions taken,
kept because the divergences are deliberate and a future reader must not "fix" them back.

**1.1 An expired subscription keeps receiving alerts — CLOSED.** The room now re-checks entitlement
on the OPEN realtime connection, once a minute, and closes it with a stated reason. The check goes
on the SSE stream because that is the cheapest correct place — a long-lived per-member connection the
server already owns — exactly as this file proposed. Token lifetimes were NOT shortened: that makes
the window smaller without making the check live, and degrades everybody's experience to half-fix one
case.

**1.2 One account, one active session — CLOSED.** `createSessionFor` deletes the account's other
sessions and inserts the new one in one synchronous transaction. **Newest login wins**, which is
self-service: the real subscriber logs in again and evicts the freeloader.

**The three decisions this file said to take first, and the answers:**

| decision                                         | answer                                                                                                                                                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Newest wins, or oldest holds?                    | **Newest.** Oldest-holds turns every shared password into a support ticket                                                                                                                                                            |
| Per account, or per account per room?            | **Per account, globally.** Per-room would let one shared login serve two rooms at the same moment                                                                                                                                     |
| Presenter exemption?                             | **None, for any role.** Put to the owner on 2026-08-27 with the laptop-and-phone case named; answered "everything, no exception". Asserted in `session-limit-contract.test.ts` so adding a role test later is a visible policy change |
| How does the evicted device find out?            | The SSE channel pushes `sessionRevoked` with the reason — the shared plumbing this file predicted, and both features do use it                                                                                                        |
| What happens when the controller is unreachable? | **Bounded grace**, chosen by the owner over closing immediately and over never closing. Three minutes without a confirmed answer ends the stream; a definite lapse ends it in under one                                               |

**Where it lives:** `apps/room/src/lib/server/live-access.ts` (the rule, pure), the poll in
`sess/[room]/events/+server.ts`, `createSessionFor` in `server/auth.ts`,
`sessionStillAuthenticates` in `server/connection.ts`, and the receiver through
`create-room.svelte.ts`. Covered by `live-access-contract.test.ts` (10),
`session-limit-contract.test.ts` (8, against a real database),
`entitlement-recheck-contract.test.ts` (7) and two cases in `events.svelte.test.ts` — all
negative-controlled.

**One thing this could not do, stated rather than left to be discovered:** a REVOCATION CANNOT BE
PUSHED here, and the pushed design looks correct. `publishToUsers` addresses a user id, and after a
newest-wins eviction the revoked connection and the one that replaced it share one; and the event hub
is process-local, so a push would silently miss every connection held on another instance. A
connection that asks about ITSELF has neither problem.

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

| button | when      | title                                                      |
| ------ | --------- | ---------------------------------------------------------- |
| Name   | `desc`    | `Sorted Z to A (click to sort A to Z)`                     |
| Name   | otherwise | `Sorted A to Z (click to sort Z to A)`                     |
| Date   | `asc`     | `Sorted oldest to newest (click to sort newest to oldest)` |
| Date   | otherwise | `Sorted newest to oldest (click to sort oldest to newest)` |

**Icons — note the asymmetry, it is easy to get wrong:**

| button | asc                   | desc                | inactive           |
| ------ | --------------------- | ------------------- | ------------------ |
| Name   | `fa-sort-alpha-down`  | `fa-sort-alpha-up`  | `fas fa-sort ml-2` |
| Date   | `fa-sort-amount-down` | `fa-sort-amount-up` | `fas fa-sort ml-2` |

**The comparator** (`sortFiles` pipe, verbatim behaviour): date sorts on
`new Date(created).getTime()`, name on `(name||"").toLowerCase()`; equal values return `0`, so ties
do NOT fall back to the other field.

**State:** `fileSortField` (`"name"|"date"`), `fileSortDir` (`"asc"|"desc"`), toggled by
`toggleFileSort(field)`. The active button carries `.active`.

**CSS — and this is the theming rule in miniature:**

```css
.st-fileSortBar {
  font-size: 12px;
}
.st-fileSortName,
.st-fileSortDate {
  color: var(--tabs-color);
  background-color: transparent;
  border: 1px solid var(--file-see-more-bg);
}
.st-fileSortName.active,
.st-fileSortDate.active {
  background-color: var(--file-see-more-bg);
}
```

**Both tokens already exist** in `css/complete-app-styles.css` and `src/app.css`. Build against the
token names.

## 2.2 Benzinga News — BUILT, 2026-08-29 ✅

The outstanding decode pass is done, and it produced a finding this section did not contain:
**Benzinga renders in TWO places upstream, not one.**

|            | where                                                                   | consts                                                                                                                                                                       | image                                                        | fallback                         |
| ---------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | -------------------------------- |
| sidebar    | `mPe` 2,467,533 and `_Re` 2,563,731 — the same component compiled twice | `nav-link sidebar-item ps-1` / `benzinga-logo-alt` / `fas fa-newspaper`                                                                                                      | `altBenzingaLogoURL`                                         | icon + the words "Benzinga News" |
| **navbar** | **`PPe` 2,473,150**                                                     | `90 [1,"nav-item","animated","fadeIn","benzinga-li"]`, `141 ["target","_blank","title","Benzinga News",1,"nav-link"]`, `142 [1,"benzinga-logo","animated","fadeIn",3,"src"]` | `altBenzingaLogoURL \|\| "/assets/images/benzinga-logo.png"` | **none — image only**            |

Only the sidebar one existed here. The navbar one shipped on 2026-08-29
(`benzinga-navbar-contract.test.ts`, 9 tests, 5 negative controls seen red).

**The const indices were parsed with a string-aware walker, not counted by eye** — an index is per
component, and the sidebar's `li` is index 32 of a _different_ table, where it is a generic
`nav-item` shared with "Manage Muted Users".

**Two divergences, both measured and both recorded at the code:**

- `/assets/images/benzinga-logo.png` is **not in this repository** (`find -iname "*benzinga*"`
  returns nothing), so the navbar item renders only when the room supplies a logo. Transcribing the
  fallback faithfully would put a broken `<img>` in every unconfigured room's navbar — the
  `playing.gif` defect again. The sidebar's icon-and-text answer is not available here: that branch
  exists in the sidebar's capture and not in this one, and inventing it would be inventing evidence.
- The default `benzingaUrl` is not reproduced. It is built from three values this room does not
  have — see `gates.ts`, which has recorded that since before this pass.

## 2.5 Mobile app — BUILT, 2026-08-29 ✅

All four new v4 strings are accounted for: `mobile-app-container` and `fa-mobile-alt` are the pane
and the tab icon, `restoreMobileAppTokens` is the command, and `mobile` is the tab key.

`docs/decoded/mobile-app-decoded.md` had already decoded the surface end to end, so nothing here
needed a fresh read of the bundle — only a decision on the two things that document deliberately left
open, and the server half, which is not in evidence at all.

**Shipped:** the Mobile App tab in `#webrtc-troubleshooter-modal`, `MobileRestorePane.svelte`,
`restoreMobileAppTokens` in `mobile-pin.remote.ts`, `restoreMobileTokens` in `room-config-client.ts`
and `internal/mobile-restore/[code]` on the controller. `mobile-restore-contract.test.ts`, 16 tests,
6 negative controls seen red.

**Row 24 was already closed.** The doc records `freeTrialsGetApp` as _"absent from the doc, from
`room-settings-schema.ts` and from `room-config-client.ts`"_. Measured 2026-08-29: it is in
`room-settings-schema.ts:333` (`wired: true`), `room-config.ts:271`, `room-config-client.ts:123` and
consumed at `gates.ts:306`. It is now also re-checked on the new controller route.

**Row 26 — the gate anomaly — decided.** The doc asks for a deliberate decision rather than a copy.
Upstream renders this tab with no gate at all; ours renders it on `mobileAppAvailable`, because a
room with no app configured would otherwise show a tab whose only button answers 409 every time.

**What the server does was DERIVED, and that is stated rather than implied.** There is no inbound
handler anywhere in the bundle — the switch at 1,020,600–1,022,200 was read in full — so the
reference's server is not in evidence. The pane's own copy is: _"restore your mobile app connectivity
and get a test notification on your device"_, shown to somebody who _"is not getting notifications"_.
With a token store that has one honest meaning, and `sendTestPushToMember` already did it for the
Manage page.

**The one thing deliberately not transcribed:** upstream's `bootbox.alert("Command sent
successfully…")` fires on the statement after the transmit, with no callback and no error path — it
says that to a member with no paired device just as readily as to one with three. Ours composes the
sentence from what happened, keeping the captured string for the case it is true of.

## 2.6 Removed upstream — THE CLAIM WAS FALSE, closed 2026-08-29 ✅

This row read: _"`Connectivity/Mic Troubleshooter` is in our older bundle and **gone** from the
current v4. If we built it, it should probably come out."_ We did build it, so the row's instruction
was to delete a working feature — four tabs of `#webrtc-troubleshooter-modal`.

**Counted in the current v4 bundle with `String.indexOf`, not `grep -c`:** `Connectivity/Mic` 2,
`webrtc-troubleshooter` 8, `troubleshooter-tabs` 6. Nothing about it was removed.

Pinned by `troubleshooter-retained-contract.test.ts` against the SHA-256'd bundle, because deleting
the row stops a reader acting on it but does not stop the claim being re-derived from one bad grep —
and a silently deleted modal breaks no type, no lint rule and no other test here.

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

**Owner, 2026-08-15:** _"Simpler Trading chose their own theme and we have to stick to Bootstrap so
customers can customize theirs like Simpler's."_

**The evidence agrees, and the original already works this way.** Its stylesheet carries **573 CSS
custom properties**, and every colour in the new sort-bar rules is a `var(--…)`. Simpler Trading's
"theme" _is_ those variables set to their values.

**So, for every feature in this file:**

- Structure is **Bootstrap**. Colours come from **tokens**, never literals.
- If a token does not exist yet, add it — do not hardcode ST's resolved colour.
- Per-room branding overrides already have a precedent: `altBenzingaLogoURL` above, and the manage
  page's Branding tab.

---

# PART 5 — Three alert features found 2026-08-15 by ENUMERATION, not by asking

**All three are BUILT, and their sections are removed from this file — 2026-08-29.**

|                         | shipped as                                                                                                                                                                                                | contract                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **5.1 Alert Filter**    | `alert-filter.ts`, persisted through `savePreference('alertFilterFor')`, consumed in `alerts.svelte.ts`, `alerts-pane.ts` and `create-room.svelte.ts`                                                     | `alert-filter-contract.test.ts` — 26 tests              |
| **5.2 Alert Labels**    | `alert-labels.ts`, rendered by `RoomMessage.svelte` and configured in `ModalHost.svelte`                                                                                                                  | `alert-labels-contract.test.ts`                         |
| **5.3 Alert Scheduler** | `scheduled-alert.ts`, `server/scheduled-alerts.ts`, `routes/scheduled-alerts.remote.ts`, `components/ScheduledAlerts.svelte`, and the sweeper `startAlertScheduler`; `hasAlertScheduler` is `wired: true` | `scheduled-alert-contract.test.ts` — with 5.2, 50 tests |

**Why they are removed rather than re-marked.** The three sections here were a SUMMARY of
`docs/decoded/alert-scheduler-filter-labels.md`, which carries the same evidence — the byte offsets,
the verbatim strings, the two 2026-08-15 corrections — roughly five times over. Two places recording
one thing is how one of them goes stale, and it is exactly what happened: on 2026-08-29 §5.3 still
carried a 🔴 and still said _"`hasAlertScheduler` … is NOT in `room-settings-schema.ts`"_, while the
entitlement had been wired and all four modules shipped. **The decoded document is the spec. This
file tracks what is left to build, and none of this is.**

**How they were found is still the point.** `audit-feature-coverage.mjs` was written after Swing and
Day Trade — two whole tabs — turned out to have been in the bundle from day one with nothing ever
enumerating the reference's features. Running it after the Swing build reported 47/88 wire commands
present, and four of the missing ones were alert-related. All four returned **zero hits across
`docs/`, `TODO.md` and `NEW-TODO.md`**: no spec, no row, no mention anywhere.

Same failure mode as Swing, caught by the same mechanism, eleven hours later. **Run that audit after
every feature lands.**

---

# Suggested order

**Built since this list was written, and removed from it:** 2.3 Swing Alerts, 2.4 Day Trade Alerts,
the four "For All" broadcast commands — which were not a missing feature but three SHIPPED controls
that said "For All" and moved one browser — and, on 2026-08-29, **all three of PART 5**: the Alert
Filter, the Alert Labels and the Alert Scheduler. See `CHANGELOG.md`, and `PART 5` above for where
each landed.

**Re-specified because "fully decoded" was not:** 2.1, the Files sort bar. Three errors found on
re-reading, one of which ships a control that looks right and behaves wrong. Build from
`docs/decoded/files-sort-bar.md`, not from §2.1.

**Removed from this order on 2026-08-29 because they are built:** _1.1 + 1.2 together_ (PART 1
records them CLOSED on 2026-08-27), _5.1 Alert Filter_, _5.2 Alert Labels_ and _5.3 Alert Scheduler_
(PART 5 above). The order below was still scheduling all five, which is how a plan outlives the work
it was planning.

1. ~~2.1 the sort bar~~ — **BUILT, and all three of the re-spec's corrections landed.** Verified by
   reading `lib/file-sort.ts` on 2026-08-29: ONE shared `direction` (line 29), a field switch that
   resets to that field's default (`field === 'date' ? 'desc' : 'asc'`, line 189), and
   `INITIAL_FILE_SORT = { field: 'date', direction: 'desc' }`. The labels keep their leading and
   trailing spaces, cited at `FilesPane.svelte:328`. This entry was still scheduling it.
2. ~~`presAreaTabs-recordings`~~ — **BUILT END TO END 2026-09-03.** The implementation keeps the
   captured entitlement but deliberately replaces the reference's bearer-token iframe with same-origin,
   cookie-authenticated APIs:

   - `recordings` and `recording_log_entries` are the durable catalog and immutable chat/alert snapshot;
   - `/recordings/upload` streams the body to a temporary file, hashes it, atomically renames it and
     commits metadata only after durable storage succeeds;
   - `/recordings/[id]/media` rechecks archive access and supports HTTP range requests;
   - `RecordingArchivePane.svelte` provides pagination, playback/download, log view/export and
     presenter-only deletion, behind `recsInRoom`, `hideRecs` and `archivesAvailableTo`;
   - `recordChat` snapshots only authoritative rows whose timestamps fall inside the recording window.

   The storage root and maximum upload size are deployment configuration. A server-side MediaMTX
   recorder remains an optional future producer, not a prerequisite for the product path: the existing
   browser recorder uploads its completed blob while retaining the local download as a recovery copy.

3. **Part 3 v5** — when an account is cleared for it. **Re-tested 2026-08-31 and the block HOLDS, but
   one piece of evidence for it must stop being cited.** The room host's version paths were probed
   again: `/` answers 200, and `/v3`, `/v4`, `/v5` and `/v6` all answer **404**. On 2026-08-15 `/v3`
   served a real, separate, older build and `/v4` was byte-identical to `/` — both are gone. So a 404
   on `/v5` distinguishes nothing: it is what this host now returns for every version path, present
   or absent. The conclusion is unchanged and rests on its other measurement — zero occurrences of
   `useV3`/`useV4`/`useV5` in 2,891,205 bytes, so the SERVER selects the build per room — and it
   still needs a room whose `useV5` is on.

   The same probe re-verified the pinned capture: `apps/room/docs/source-v4-2026-08-15/` is **still
   byte-identical to what is deployed** sixteen days on, index and bundle both. Recorded in that
   directory's README, because "is our evidence simply older than what the owner is looking at?" is
   the question it exists to answer, and today the answer is no.

**Then `docs/decoded/missing-commands-triage.md`** — the only complete list of what the reference has
and we do not. **This paragraph pointed at work that is finished, and is corrected 2026-08-30 by
reading that document rather than by remembering it.**

It used to say _"Moderation (`kickUser`, `unmuteChat`, `lockSession`) and the archives pair
(`archiveLogs` / `unarchiveLogs`) are the largest clusters left."_ Every one of those five is built:
`kicks.ts`, `chat-mute.ts` (whose docblock quotes the reference's own `subscribe("unmuteChat", …)`),
and `chat-archive-port.ts`, which wires `archiveChatLog` and `unarchiveChatLogCommand`. The triage's
own measured tally is **0 still NOT BUILT** — 15 built, 7 built under another name, 3 blocked with
the blocker named — and `apps/room/src/lib/missing-command-census-contract.test.ts` recomputes that
tally on every run and fails on a disagreement **in either direction**, so the triage cannot go
stale. This file could, and did.

**The rule that follows is the one this repository keeps re-learning:** the triage is the tracker for
those commands, so this file must POINT at it and never restate its state. Two places recording one
thing is how one of them goes stale, and the stale one is always the summary.

**Five remain, and on 2026-09-01 they stopped being "blocked" and became NOT WORK — measured, not
argued.** `getMyRepeater`, `resetAudioBridge`, `resetAllMediaServers`, `resetMediaServer` and
`resetAudioBridgeOnServer`.

**Four of the five methods have NO CALL SITE ANYWHERE IN THE BUNDLE.** Every occurrence of
`resetAudioBridge`, `resetAudioBridgeOnServer`, `resetAllMediaServers`, `hardResetMediaServer`,
`hardResetMediaServerOnServer` and `getMediaServerLost` is either the method DECLARATION — each one
preceded by `})}`, the end of the method before it — or the command-name STRING inside its own body.
There is no `x("click", …)`, no template reference, nothing. Swept over the whole 2,891,205-byte
bundle:

```
resetAudioBridge             2166556 declaration   2166702 "resetAudioBridge"
resetAudioBridgeOnServer     2166727 declaration   2166892 "resetAudioBridgeOnServer"
resetAllMediaServers         2167330 declaration   2167673 + 2167929 (both branches)
hardResetMediaServer         2168026 declaration   -> sends "resetMediaServer" at 2168170
hardResetMediaServerOnServer 2168259 declaration   -> "resetMediaServer" at 2168646, 2168907
getMediaServerLost           2167172 declaration   (never called either)
```

**So the reference renders no control that invokes them.** They are dead code upstream — methods on
the session-control component with nothing bound to them. Under the instruction to match the dump
exactly, building senders here would INVENT controls the reference does not have, which is the
opposite of matching and is the dead scaffolding the standard forbids by name.

That measurement replaces the two reasons this paragraph used to give, and it is worth saying why
both were weaker. The first was **reach** — the owner answered the product question on 2026-08-15:
these are what an operator uses when a tenant has a problem, not something a presenter should reach
for, so the gap is a central console rather than a room control. True, and an argument about product
shape. The second was that four of the five reset **a media plane this deployment does not have**.
Also true, and it is the argument `TODO.md` rows X and AC were held by until both turned out to be
category errors — so it is exactly the kind of reason that has to be re-measured rather than
inherited. It was, and the answer this time is stronger than either: there is nothing to transcribe.

The fifth, `getMyRepeater`, is not an operator control at all. It is live upstream and internal —
the soft reset sends it after its jitter to ask which media host to come back on
(`recording-frames.ts` carries the reading). This room has no repeater negotiation, so `restart()`
stands in its place; that is a stated equivalence and it is at the code.

## Evidence — two of these four are NOT committed, corrected 2026-08-29

This heading read **"Evidence, all committed"**. Measured with `git ls-files` and on disk:

|                                             | tracked     | present here |                                                                                                                                                                                                                                               |
| ------------------------------------------- | ----------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/room/docs/source-v4-2026-08-15/`      | **5 files** | yes          | the current v4: three artifacts + `sha256sums.txt` + a README recording how it was verified and what changed. All three verified `OK` against that file on 2026-08-29                                                                         |
| `v5.md`                                     | **yes**     | yes          | the version measurements and the retraction                                                                                                                                                                                                   |
| `apps/room/scripts/collect-app-versions.js` | **0**       | **no**       | the read-only version collector. `.gitignore` excludes `/apps/room/scripts/` whole, deliberately — the collectors in it reach the reference application and this repository is public. `docs/UNPUBLISHED-SCRIPTS.md` records what is in there |
| `apps/room/docs/source/`                    | **0**       | **no**       | the OLDER v4. Gitignored for the same reason, and its absence is why **42 evidence-bound test files are excluded from every run in a fresh clone** — `gate/evidence-bound-tests.mjs` prints that on every invocation                          |

The correction matters more than the two entries do: a list headed "all committed" is read as _a
clone has these_, and a clone has half of them. What a clone actually holds is the v4 bundle and
`v5.md`; everything reconstructed from a DOM capture needs the author's machine.
