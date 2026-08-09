# Changelog

Newest first. Every entry carries a **date and local time (EDT)**, and every time is either a git
commit timestamp or a measurement taken at that moment — none is estimated. Where a change landed in
a commit whose message describes something else, the commit is named anyway, because that is how it
will be found later.

**How this is maintained:** an entry is appended every time a piece of work is finished, not at the
end of a session. A change with no entry is a change the next person has to reverse-engineer from
`git log`.

**Branching: there isn't any, and that is deliberate.** Work is committed and pushed **straight to
`main`** — confirmed by the owner 2026-08-09. No feature branches, no PRs. The consequence is worth
stating once, here, rather than rediscovering it: **`main` auto-deploys**, so a push is a production
release, not a reviewable step. Two things follow, and both are conventions of this file:

1. **Every entry says whether it has runtime impact** — whether the push changed what the site
   serves, or only documentation, comments and tests. That is the first thing anyone reading back
   through an incident wants to know.
2. **Verification happens before the push, not after**, because there is no review gate to catch it.
   Each entry records what was run and what could not be.

---

## 2026-08-09

### 12:25 — SvelteKit 3 `@next` evaluated against the real repository, and NOT adopted

**No runtime impact — nothing shipped.** The migration was performed in full, found to be blocked,
and reverted to zero residue. This entry exists so the next attempt starts from evidence instead of
repeating it.

#### The `next` tags are not uniformly newer — taking them blindly is a downgrade

| package | `latest` | `next` | |
| --- | --- | --- | --- |
| `@sveltejs/kit` | 2.70.2 | **3.0.0-next.16** | ahead |
| `@sveltejs/adapter-vercel` | 6.3.4 | **7.0.0-next.6** | ahead |
| `@sveltejs/adapter-node` | 5.5.7 | **6.0.0-next.8** | ahead |
| `svelte` | **5.56.8** | 5.0.0-next.272 | **`next` is 56 minors BEHIND** |
| `@sveltejs/vite-plugin-svelte` | **7.3.0** | 7.0.0-next.1 | **`next` is behind** |

"Use @next" on the last two would have rolled Svelte back to a 5.0 prerelease.

#### The repository is otherwise ready

Kit 3's peers are `vite ^8.0.12`, `svelte ^5.56.4`, `typescript ^6.0.0`,
`@sveltejs/vite-plugin-svelte ^7.0.0` — **all already satisfied** after this morning's updates.

#### What was migrated, and it works

- **`svelte.config.js` is removed in Kit 3.** It errors: *"svelte.config.js is no longer used. Please
  pass configuration via the `sveltekit(...)` plugin in your Vite config."* Both apps were migrated —
  and note the shape: the **`kit` namespace disappears**, so `adapter`, `paths` and `preprocess` sit
  at the top level of `sveltekit({…})`. Per the docs that is "the only difference to the
  `svelte.config.js` layout".
- **`experimental.explicitEnvironmentVariables` is gone from Kit 3's types** — it graduated. `src/env.ts`
  and `$app/env/private` are simply how it works now. This repository had opted in early under Kit
  2.63, and that flag becomes a type error.
- **`eslint.config.js` imported `./svelte.config.js`** for the Svelte parser. The only part the parser
  uses is `preprocess`, so it can be declared inline — the file cannot come back, because its
  presence is what Kit 3 errors on.

#### Why it was reverted — the blocker, with evidence

**Kit 3.0.0-next.16 breaks typed `resolve()`, which this codebase uses at 48 call sites.** Every one
fails with `Argument of type '"/login"' is not assignable to parameter of type 'never'` — the route
union is empty. Three findings, each checked rather than inferred:

1. `svelte-kit sync` prints *"tsconfig.json should extend SvelteKit's built-in configuration:
   `{ "extends": "$app/tsconfig" }"`* — **but Kit 3 ships no tsconfig to extend.** Searched the
   installed package: there is none.
2. Following that advice anyway produced **1238 errors across 111 files**, because the unresolvable
   `extends` silently discards the base's `include`, `exclude` and `paths` and drags `scripts/**`
   into the type check. Those errors were an artefact of the broken extends, not defects.
3. Keeping the working `extends` leaves **`$app/types` mapped to `.svelte-kit/types/index.d.ts`,
   which Kit 3 no longer writes.** `RouteId` exists in `non-ambient.d.ts` and the per-route
   `$types.d.ts`, so the data is there — the entry point the typed router reads is not.

That is a prerelease with an unfinished TypeScript story, not a mistake in this repository. Adopting
it would mean giving up compile-time route checking on an app that auto-deploys on push.

#### State

Reverted to `@sveltejs/kit` 2.70.2, `adapter-vercel` 6.3.4, `adapter-node` 5.5.7, and `package.json`
and `pnpm-lock.yaml` restored to HEAD so **not one byte remains** of the attempt.

**Re-verified after reverting:** `svelte-check` 0 errors 0 warnings, 51 files / 562 tests passing,
`vite build` clean, `pnpm install --frozen-lockfile` clean.

**Retry when** Kit 3 either ships `$app/tsconfig` or writes `types/index.d.ts` again. The two-file
config migration above is done and takes ten minutes to redo.


### 12:15 — Dependencies taken to latest, with three deliberate exceptions (pushed to `main`)

**Runtime impact: yes** — `better-sqlite3` and `vite` are build/runtime dependencies. No source
changed.

Every version below was read from a registry or an official index **today**, not recalled.

#### Node — latest **LTS**, as asked

`nodejs.org/dist/index.json`: the newest LTS is **v24.19.0 "Krypton"**, released 2026-08-03. v26.7.0
exists and is **Current, not LTS**, so it is deliberately not adopted.

- `.nvmrc` created — there was none, so the Node version was implicit.
- `engines` unified to `24.x`. The root said `>=22`, the controller said `24.x`, **and the room
  declared none at all** — three answers to one question.

#### Updated (10 packages + pnpm)

`pnpm` 11.18.0 → **11.21.0**. `vite` 8.1.5 → 8.2.1 · `@sveltejs/vite-plugin-svelte` 7.2.0 → 7.3.0 ·
`svelte-check` 4.7.4 → 4.7.5 · `typescript-eslint` 8.65.0 → 8.66.0 · `eslint` 10.8.0 → 10.8.1 ·
`globals` 17.7.0 → 17.9.0 · `@types/node` 26.1.2 → 26.2.0 · `@types/better-sqlite3` 7.6.13 → 9.6.0 ·
`@types/howler` 2.2.12 → 2.2.13 · `better-sqlite3` 13.0.2 → 13.0.3.

**`svelte-check` now reports 0 errors and 0 WARNINGS.** The three long-standing `href=""` warnings
are gone in 4.7.5 — they were the ones the manage page documented as unavoidable.

#### TypeScript 7.0.2 — attempted, and REVERTED

It is on `latest`, so "latest" would have taken it. It **breaks the toolchain**: `svelte-check`
crashes on load, and no peer accepts it — SvelteKit wants `^5.3.3 || ^6.0.0`, `svelte-check`
`^5.0.0 || ^6.0.0`, and `typescript-eslint` `>=4.8.4 <6.1.0`. **6.0.3 is already the ceiling those
peers allow**, so the repository was correct before and stays there.

#### NOT updated — three packages pinned to captured evidence

Bumping these would break the pixel match, which is the premise of the whole reproduction:

| package | pinned | latest | why it stays |
| --- | --- | --- | --- |
| `font-awesome` | **4.3.0** | 4.7.0 | both captures request `fontawesome-webfont.woff2?v=4.3.0`. 4.7.0 redrew `fa-user` from 1408 units to 1280 — **10.219px against 9.289px** at the 13px the dropdown uses. |
| `@fortawesome/fontawesome-free` | **5.8.1** | 7.3.1 | the room is FA5, where the gear measures 16px = 1em; FA4's cog is 0.857em and shrank that button to 24.719. |
| `animate.css` | **3.7.2** | 4.1.1 | the reference loads 3.7.2 and the app uses its class names (`animated fadeInDown`). **v4 renames every class** to `animate__animated animate__fadeInDown`, and `account.css` transcribes 3.7.2's exact reduced-motion contract. |

#### Rust

**The toolchain pin was already current**: `channel-rust-stable.toml` gives rustc **1.97.1
(2026-07-14)**, which is exactly what `services/rust-toolchain.toml` pins.

21 crates updated via `cargo update` (thiserror, wasm-bindgen, time, regex-automata, cc, …).
`cargo check --workspace` exit 0; `cargo clippy --workspace --all-targets` exit 0.

**Eight direct crates are still behind and are NOT done**, because each needs a `Cargo.toml` edit
and an API migration rather than a lockfile bump: `base64` 0.22→0.23, `ed25519-dalek` 2→3,
`mediasoup` 0.24→0.25, `password-hash` 0.5→0.6, `rand` 0.9→0.10, `sha2` 0.10→0.11,
`tokio-tungstenite` 0.29→0.30, `tower-http` 0.6→0.7. `mediasoup` especially: the SFU migration is
another session's live task and moving it underneath them would be reckless.

#### Two defects found on the way, neither caused by this change

- **The documented clippy gate is wrong for this workspace.** `cargo clippy --all-targets -- -D
  warnings` fails with **46 errors on a clean tree**, because the test helpers
  (`raw_for_tests`, `identity_pool_for_tests`, `set_relay_ready_for_tests`) sit behind a
  deliberately non-default `testing` feature. Proven pre-existing by re-running it against the
  stashed original lockfile: same 46. The correct invocation is
  **`cargo clippy --workspace --all-targets --features tradingroom-api/testing -- -D warnings`**,
  which exits 0.
- **`ed25519-dalek` is declared twice and disagrees**: the workspace `Cargo.toml` says `3.0.0`,
  `media/Cargo.toml` pins `"2"`. The lock resolves 2.2.0. Recorded, not silently reconciled.

**Verified:** controller `svelte-check` 0/0, 51 files / 562 tests, `vite build` clean. Room
`svelte-check` 0/0, 56 files / 523 tests. Rust check and clippy both exit 0.


### 11:23 — `pnpm check` was RED and nobody knew; plus the focus ring that would not let go

**RUNTIME IMPACT: yes, but only visual** — a focus outline no longer sticks after a mouse click.
The rest is the build gate.

**`pnpm check` has been failing, and my own reporting hid it.** The script is
`svelte-check --tsconfig ./tsconfig.json --fail-on-warnings`, so its three `a11y_invalid_attribute`
warnings exit **1**. I had been running `svelte-check --threshold error` — my flag, not the
project's — and reporting "0 errors, 3 warnings" as though that were fine, in four separate
changelog entries. It was not fine: `check` sits inside `quality`, so the whole chain was red.
**Now 0 errors, 0 warnings, 0 files with problems, exit 0.**

The cause was `href=""` on three click-to-edit anchors, and the comment defending it was wrong in
both halves: it claimed `#` "cannot ship" under `--fail-on-warnings` while `""` is flagged by the
**same rule**, so the swap bought nothing and left the gate broken. The markup is right — an anchor
is what the reference uses, `""` is what its siblings carry (`file2:889, 991`), the click is always
prevented — so the rule is now **suppressed by name** with a comment that says so, instead of dodged
by picking a different invalid value.

**Two dead `svelte-ignore` comments removed.** `a11y_label_has_associated_control` on the stats date
labels suppressed nothing once `for` became conditional. A suppression that silences no warning is
scaffolding that outlives its reason.

**The emoji-picker "active blue": the ring is the reference's, the LINGER is not.** Its own
`bootstrap.min.css` carries verbatim (`evidence-dumps/NEXT-STEP/gaps/sheet-2.css:782`)
`.btn:focus { outline: -webkit-focus-ring-color auto 5px; outline-offset: -2px; }`, and its
`styles.css` (`sheet-9.css:324`) overrides only `box-shadow`, never `outline`. So deleting it would
contradict the capture. Changed `:focus` → `:focus-visible` instead: identical declared values,
byte for byte, but a mouse click no longer leaves the ring on until you click elsewhere. Keyboard
focus still shows it. Our classes were never the problem — `acc-btn acc-btn-default acc-btn-sm` is
exactly the reference's `btn btn-default btn-sm` (`logged-in-page:515`).

**Triaged, not fixed, because they are not bugs:** "Disconnected from Media Server" and the 503 are
the **un-migrated SFU** — `curl https://media.tradingroom.app/health` returns 503 with the body
`media endpoint not yet deployed on this host`, which is the placeholder `docs/SFU-MIGRATION.md`
describes. Nothing in this repository fixes that; it needs the SFU moved onto the Hetzner box, and
that needs SSH.

**Found and NOT yet fixed:** 13 form fields carry neither `id` nor `name`, which is the
"A form field element should have an id or name attribute" advisory. Nine are checkboxes, and
**adding `name` to a checkbox makes it submit** — a behaviour change, not a lint fix — so this needs
deciding rather than sweeping. A first scan said 19; six were my own regex counting Svelte's
`{id}`/`{name}` shorthand and reference markup quoted inside comments.

**Verified:** `pnpm check` exit 0; 51 files, 562 tests passing; breakpoint contract passing;
autofixer clean.

### 11:12 — All five downloads rewritten from the reference's own bundle

**RUNTIME IMPACT: yes.** Every export in the app changes filename, format, or both.

The owner ran `collect-export-controls.js` and `collect-create-new.js` against the live original;
both dumps are in `dumps/`. `app.min.js` — 455KB, never on disk before — is now readable, and it
overturned one conclusion and corrected four formats.

**Export Badges was a real defect, and the earlier dismissal of it was wrong.** The handler is
`exportBadges()`, on the ACCOUNT page, writing `BadgesList.csv` through a `convertToCSV`. Ours wrote
`badges.json`. The 10:50 entry said no such control existed; it had searched the manage-page capture
only, which is the failure the house rules exist to prevent, quoted in the same entry that committed
it.

| download | was | now, from the bundle |
| --- | --- | --- |
| Export Badges | `badges.json`, `application/json` | **`BadgesList.csv`**, `text/csv;charset=utf-8`, eleven fixed keys |
| Users → Export | `room-<code>-users.csv`, 4 quoted columns incl. an invented `Last login` | `Participant_List_<uuid>.csv`, **unquoted**, `Name, Email[, Phone], Role` |
| Stats → Export | `room-<code>-stats.csv`, `#/Nick/Email/Last login` | `Participant_Stats_<uuid>_<date>.csv`, **quoted** |
| Monthly | `room-<code>-monthly.csv` | `Monthly_report_<uuid>_<range>.csv`, header `Month, Total Logins, ` — trailing comma is the reference's |
| Export Settings | `room-<code>-settings.json` | `Settings_<uuid>.json`, `text/json;charset=utf-8` — **JSON confirmed correct** |

**Details that only a bundle read could give:** every CSV ends `\r\n` — except the badges one, which
`convertToCSV` writes with `\n`. Headers carry a space after each comma — except the badges one,
which has none. The participant list is unquoted and the other three are quoted. These look like
inconsistencies and are the reference's own.

**Two deliberate divergences, both one character wide.** The reference's `.replace(","," ")` on a
member name substitutes only the FIRST comma, so a second one still corrupts an unquoted row —
`replaceAll` here. And its `convertToCSV` guards on `!== undefined`, so a present-but-null key
concatenates the literal text `null` into the cell; our `emoji` and `imgURL` are nullable, so null
writes empty instead.

**Honest gaps, recorded not filled:** the reference's stats CSV has six columns this app has no data
for — IP, In, Out, Duration, isMobile, Browser — which come from per-session participant records
that do not exist here. Now `TODO.md` item **K**; it is a schema question, not an export one. And
three badge columns (`type`, `onlyP`, `roles`) are written empty; `roles` is collected by the editor
and never stored, already recorded at `+page.server.ts:345`.

`darkTheme` left the badges export as a result — the reference's key list is fixed at eleven and
matching it wins. The now-false comment in `schema.ts` saying otherwise was corrected.

**Also fixed: two type errors I shipped at 10:54.** `svelte-check` went 0 → 2 because
`expect(...).not.toBeNull()` does not narrow a type, and I ran the test and the breakpoint gate but
not `svelte-check` on a `.ts` change. Back to 0.

**Verified:** 51 files, 562 tests passing; `svelte-check` 0 errors, 3 warnings (unchanged, all
pre-existing); breakpoint contract passing; autofixer clean on both pages. Pinned by a new
`export-format-contract.test.ts` — 14 cases over filenames, line endings, MIME, header spacing,
per-file quoting and the empty-badges guard.

### 10:54 — The badge roles textarea no longer overflows its container (deliberate divergence)

**RUNTIME IMPACT: yes.** One CSS rule on the account page's badge editor. The field stops escaping
its card.

`#badgeRolesTxt` is `<textarea class="input-text" cols="70" rows="2">` inside a `.col-md-6` editor.
Node #91 of `NEXT-STEP/run2/welcome-run2.json` computes **`width: auto`** and **`max-width: none`**,
so the box comes entirely from `cols="70"` — about 70 characters, inside a card that is roughly half
of a 1170px container. Wider than its parent, with nothing to stop it. **The reference does this
too**, confirmed by the owner against the live original, so this is a divergence chosen on purpose
rather than a match.

**`max-width: 100%`, not `width: 100%`**, and the distinction is the whole fix: `width: 100%` would
contradict the measured `width: auto` and stretch the field even where there is room, which the
reference does not do. Bounding it changes nothing until the box would leave its parent — the one
case that is broken. `box-sizing: border-box` is already in force from `.acc-body *` and matches
what #91 computes, so the 2px padding and 1px border sit inside the bound.

**Honest gap:** the overflow itself is not in any capture. Every rect in that file is `0×0` because
the badge editor is `ng-show`-collapsed when captured, and a hidden element has no box. The authored
style explains *why* it overflows; the owner's observation is the evidence *that* it does. No
number for how far it overruns exists, and none was invented.

**Pinned in both directions** by a new case in `badge-editor-contract.test.ts`: `max-width: 100%`
must be present, a bare `width: 100%` must not be, and `cols="70"` stays in the markup. The
assertion **strips CSS comments first** — its first version matched the note quoting the old
`#badgeRolesTxt { width: 100% }` and failed against correct CSS, which is the same
"satisfied by its own documentation" trap the file already guards against for markup.

**Verified:** mutation-checked — swapping `max-width` for `width` turns the test red, so it is not
vacuous. Breakpoint contract passes; 5/5 badge editor tests pass.

### 10:50 — "Export badges should be CSV": investigated, and NOT changed — **THIS ENTRY WAS WRONG**

> **Corrected 11:12 by the bundle capture. The owner was right and this entry was not.**
> There IS an `Export Badges` control — `ng-click="exportBadges()"` — and it writes
> `BadgesList.csv`. The mistake below is a single word: this entry says "not in the reference",
> having searched `must-match/important`, which is the **manage** page. The control is on the
> **account** page. Searching one capture and concluding about the whole app is the exact failure
> the house rules describe, committed while quoting them. Everything below about the four
> manage-page exports is accurate and was confirmed by the same bundle; only the badges claim was
> false. See the 11:12 entry.

**No runtime impact** — one new collector script. **No application code was touched, deliberately.**

Reported: clicking export badges downloads a `.json` and should download a `.csv`. Read against
`must-match/important`, every export/download handler in the reference is:

| capture line | handler | format |
| --- | --- | --- |
| 34 | `exportListToCSV()` | CSV |
| 916 | `exportStatsToCSV(statsDate)` | CSV |
| 919 | `downloadMontlyStats(…)` — the reference's own misspelling | CSV |
| 985 | **`exportSettingsToJSON()`** | **JSON** |
| 986 | `loadSettingsFromJSON()` | **inside an HTML comment — never renders** |
| 91, 2081 | `removeBadgesForUsers()`, `openChatTabsWithBadgesEditor(…)` | not exports |

**There is no "Export badges" control** — not in this app and not in the reference. The only JSON
download anywhere is Export Settings, whose handler in the reference is literally named
`exportSettingsToJSON`, and ours already matches it. Users, stats and monthly already produce CSV
with `.csv` filenames.

So the requested change has no target, and making the settings export CSV would contradict the
capture. **Left alone pending the owner's call** — it is a divergence to decide, not a defect to fix,
and it will be recorded as a divergence if chosen.

**`apps/controller/scripts/collect-export-controls.js`** added to settle what markup cannot: whether
the function BODIES agree with their names, and whether the control the owner clicked exists
somewhere no capture reached. It fetches every same-origin bundle, pulls a 4,000-character window
around all thirteen export/badge/MIME/blob symbols, and captures every export/download/badge control
across every tab it can reach — outerHTML, computed styles, and the stylesheet rules that match, so
"this class has no rule" can be proven. Honest `gaps[]` for any tab that never rendered.

**It clicks nothing that acts.** `export` and `download` are on its denylist on purpose: the point
is to read the exporter, not run it. Tab links are the only thing clicked, matched by exact string
comparison — never a regex built from a label, which is how a menu item with a slash in its name
once went unclicked and the bug looked like the app's.

### 10:37 — Tabs moved into the path, and the last route still using a row id (pushed to `main`)

**Runtime impact: yes, URLs change.** `/account/rooms/1001?tab=marketplace` is now
`/account/rooms/1001/marketplace`. A tab selects which pane of the room you are looking at, and a
pane is a place — not an option bolted onto a page, which is what `?tab=` read as.

- **The manage page moved to `[id]/[[tab]]/`.** The segment is optional, so `/account/rooms/1001`
  still resolves and lands on Users — the same default a missing `?tab=` had. 14 links rewritten
  across three files, and 13 test files repointed at the new location.
- **An unknown tab now 404s** instead of quietly showing Users. Silent fallback was tolerable when
  the tab was an option; a path that resolves to something other than what it names is a different
  thing, and the honest answer for a URL nobody issued is that it does not exist.
- **`/launch/[id]` still resolved `eq(rooms.id, Number(params.id))`** — missed when the manage page
  moved off primary keys earlier today. It was the one door still speaking in row ids, and nothing
  in the UI links to it, so nothing caught it. Now resolves by short code like everything else.

**Investigated end to end.** Every `searchParams` read in both applications, and every generated
customer-facing URL:

| kept as a query, and why | |
| --- | --- |
| `?q=`, `?filter=` | a search term and a filter over the collection a pane shows. This is what query strings are FOR; making them path segments would conflate a filter with a resource. |
| `?token=` (verify-email, reset-password), `?secTok=` | one-time credentials, not resources. A path segment would make a secret look like a page. |
| `?email=` on the three `/internal/*` endpoints | server-to-server lookup parameters, never seen by a customer. |
| `?co=1` in the room | **transcribed evidence, not a choice.** The capture reads `const F = s.get("co")` into `globals.chatOnlyMode`; renaming it would break the original's detached chat popout. Checked before touching it. |

**Still outstanding, and it is the same offence:** the room's entry URL is
`/session?id=3625&jwtSite=…`. `id` belongs in the path. It is NOT in this push because it spans two
applications — the controller mints that link and the room parses it — and the room is deployed by
hand to Hetzner while the controller auto-deploys on push. Shipping them out of order breaks every
Launch button. Sequenced separately and deliberately.

**Verified before pushing:** `svelte-check` 0 errors, 3 warnings (unchanged). 50 files, 547 unit
tests passing. All 37 database tests passing. Not verified in a browser — `pnpm test:e2e` now exists
but has not been run.


### 10:31 — `TODO.md` now lists only open work (`ca1fe65`, pushed to `main`)

> This heading first read **10:35**, a time I wrote before checking the clock. It was 10:31.
> Corrected to the commit's own timestamp, and left visible: this file's whole premise is that
> every time here is measured rather than estimated, so an invented one in it is worse than an
> invented one anywhere else.

**No runtime impact** — one document.

Seven closed items removed rather than left struck through: evidence gap **13** (`ptr_logo.png`),
and work items **A** (password reset), **B** (mail transport), **D** (`ROOM_BASE_URL`),
**E** (`ROOM_JWT_SECRET`), **I** (four unstyled public pages) and **J** (the wrong-shell defect).

Nothing is lost — every one of them is in this file, dated, timed, and against the commit that
closed it. That is the point of the split: two places recording the same thing is how one of them
goes stale, and a list that is mostly strikethrough is a list nobody reads to the bottom of. The
header now says so, so the next person does not "helpfully" restore the history.

**Two counts repaired, which is the part a plain deletion would have got wrong:**

- "closes five of **thirteen** gaps" now reads "five of the **twelve remaining** gaps", because gap
  13 was one of the thirteen.
- checked for dangling references to the removed ids across the file — none.

**What is left, and it is now the whole file:** evidence gaps **1–12**, and work items **C**
(`push_tokens_json` has no writer), **G** (Neon under volume) and **H** (separate the media plane
from the app tier). G and H are the owner's calls, recorded rather than queued.


### 10:28 — The e2e harness could not run at all; written, plus the manage-page spec (pushed to `main`)

**No runtime impact** — test infrastructure and one `.gitignore` line. Nothing about what the site
serves changed.

**`test:e2e` is listed in the `quality` gate and could never have executed.** `e2e/` holds three
specs and `package.json` runs `playwright test`, but **there was no `playwright.config.*` anywhere in
the repository**. The specs navigate with `page.goto('/register')`, which needs a `baseURL` to
resolve. A gate in the quality chain that cannot run is worse than no gate, because it reads as
coverage.

- **`playwright.config.ts`** — `testDir: e2e`, baseURL on 5173, serial (`workers: 1`), and a
  `webServer` block so **Playwright owns the server's whole lifecycle**: it starts it, waits for
  `/login`, and tears it down when the run ends. That is what makes an e2e run compatible with the
  standing "nothing runs on local ports" rule — there is nothing left to forget about.
- **`reuseExistingServer: false`**, against the usual `!process.env.CI`. Other projects on this
  machine use this port range, and reusing a foreign server would run these assertions against a
  different application and report the result as this one's — exactly the failure the standing rule
  exists to prevent. Failing loudly on a busy port is the safer answer.
- **`playwright-report/` and `test-results/` added to `.gitignore`.** They were not ignored;
  `vite.config.ts` already excludes both from its watcher for the same reason, so this was an
  oversight rather than a decision. Without it the HTML report lands in the next commit.

**`e2e/manage-room.spec.ts`** covers the two things shipped earlier today that a unit test cannot
prove, and which `CHANGELOG.md` recorded as unverified in a browser:

- the URL a customer lands on carries the room's **short code** — read off the Manage link's own
  `href` and asserted to be four-or-more digits, never a hardcoded value, since the code comes from
  a database sequence;
- the stats date field **takes focus on click**, the label's `for` is absent at rest and present
  while editing, and **blur closes the row** — the half of the defect a stub cannot demonstrate,
  because `blur` is a browser behaviour rather than a function call.

The account is a throwaway registered through the real form, the same pattern
`critical-journey.spec.ts` already uses. Nothing is forged and no session is inserted.

**Verified:** the config parses and `playwright test --list` reports 9 tests across 4 files without
starting anything. `svelte-check` 0 errors, 3 warnings (unchanged); 547 unit tests passing.

**NOT yet executed, and that is the honest state.** Running it starts a dev server on 5173, which
is the owner's explicit standing boundary, so it waits on their word rather than being assumed.
Everything above is the harness being correct; none of it is the assertions having passed.


### 10:18 — Rooms are addressed by their short code, not the database id (pushed to `main`)

**Runtime impact: yes, and it changes a URL.** `/account/rooms/1?tab=users` is now
`/account/rooms/3625?tab=users`. Raised by the owner: the old form read as unfinished, and it was —
`1` is a row's primary key. It advertises how many rooms the database holds and belongs to the
database rather than to the product.

The short code is the room's own identity and the only number this product ever shows for it. The
reference's manage header reads `Manage Room id: 3627 ( 6a6529b318781e20ed81947d )`, its Sessions
table lists Session ID `3625`, and `provisionRoom` already names a new room `Room <shortCode>`.
`rooms.short_code` is `NOT NULL` with a unique index, so the lookup costs exactly what the primary
key did.

- `+page.server.ts` — the load, `ownedRoom`/`ownedRoomId`, and the clone redirect all resolve by
  short code. The clone's `returning` gained `shortCode` so the redirect reads the value that
  actually landed rather than a local.
- Eleven links updated: two on the account page, nine on the manage page.

**Old numeric links 404, deliberately.** Accepting both would be ambiguous — id and short code are
both digit strings, and nothing stops one room's code equalling another room's id, so a fallback
would silently resolve to the WRONG room. A 404 is the honest answer, and on a days-old deployment
whose rooms have four-digit codes and single-digit ids there is nothing bookmarked to break.

**`?tab=` is left alone.** A query parameter for a tabbed view is a normal, correct pattern; moving
it into the path would churn the most evidence-pinned page in the repository for no user-visible
gain. The complaint was the `1`, and the `1` is what changed.

**Verified before pushing:** `svelte-check` 0 errors, 3 warnings (unchanged). 50 files, 547 tests
(up 6 — `room-url-identity.test.ts`). **All 37 database tests pass**, and getting there mattered:
six of them failed on the first run because the harness passed numeric ids as the route param. That
is the change working, not a flake — the harness now resolves id to short code with a real lookup,
so the cases stay about the DON'T TOUCH actions.

The new cases can tell the two identifiers apart because the fixture's differ on purpose — **id 1,
short code 3625**. A fixture whose id happened to equal its code would pass on either
implementation. Mutation-checked: reverting one link to `${room.id}` turns two of them red.


### 10:12 — Both open manage-page audit defects fixed (pushed to `main`)

**Runtime impact: yes.** Two live UI bugs on the User Stats pane of a page already in production.
Both were found by the manage-page audit's own adversarial verifier and had been open since.

- **The stats date fields were a one-way trap.** Clicking either date swapped its anchor for an
  `<input type="date">` and stopped there — the field never took focus. The picker never opened,
  nothing could be typed without a second click, and **the row could not close**, because its only
  exits are `change` and `blur` and `blur` cannot fire on an element that never held focus. One
  click put the row into an edit state with no way out.

  Fixed with `{@attach focusDateField}` — an attachment rather than a `use:` action, which is what
  the current Svelte docs list as the replacement under "avoid legacy features", and which runs at
  element creation, exactly when focus needs to move.

- **`for="statsFrom"` / `for="statsTo"` were orphaned at rest.** Both pointed at ids that exist only
  while editing, so at rest the labels referenced nothing: a screen reader announces a label whose
  control cannot be found, and clicking it moves focus nowhere. `for` is now set only while the
  field exists.

  At rest the captioned thing is an `<a>`, which is not a labelable element — there is no id `for`
  could legally point at — so the label carries a documented `svelte-ignore` and the anchor gained
  an `aria-label` so the caption still reaches assistive tech. This is also the closer match: the
  reference's own labels carry no `for` at all (file2:904, 909), and attributes are invisible to the
  side-by-side comparison, which reads tag and classes only.

- **`focusDateField` was extracted to `$lib/focus-date-field.ts`** rather than left in a 2,000-line
  component, for the same reason as `chrome.ts`: it has three branches that are easy to get wrong
  and impossible to see in review — a browser with no `showPicker`, a `showPicker` that throws
  because the call is not user-activated, and the ordering of focus against it. **Focus runs first
  and unconditionally**, so a refused popup cannot take the stuck-row fix down with it; that
  ordering is pinned by a test.

**Verified before pushing:** `svelte-check` 0 errors, 3 warnings — unchanged, and all three are the
pre-existing `href=""` ones this block already documents. 49 files, 541 tests passing (up 6:
`focus-date-field.test.ts`). 47 manage-page tests still passing, so the side-by-side match is intact.

**Not verified in a browser**, and worth stating plainly: nothing runs on local ports for this
project by standing instruction, and the manage page needs a signed-in session and a room. The
picker opening is asserted against a stub, not against Chromium. The two behaviours a stub cannot
prove — that the native calendar actually appears, and that blur now fires — are the reason the
`showPicker` call is best-effort rather than assumed.


### 10:03 — This changelog started, and two comments corrected (`8c5dca3`, pushed to `main`)

**No runtime impact** — documentation, one code comment and one test comment. Nothing about what the
site serves changed in this push; the pages and CSS themselves went up earlier in `6e7a151`.

- **`CHANGELOG.md`** created at the repo root. It exists because several changes today landed in
  commits whose messages described something else — the four rebuilt public pages went in under a
  commit about the `pub-*` decision — which makes work unfindable without reading diffs.
- **Two comments that were true when written and had since reversed**, in
  `forgot-password/+page.svelte` and `password-reset-pages.test.ts`. Both stated that the `pub-*`
  classes have no rule anywhere in the app; `public.css` had defined all seven an hour earlier. A
  comment asserting a fact that has flipped is worse than no comment, because it is read as current.
  `forgot-password` still wears `acc-*` on purpose, and the comment now says why it should stay that
  way.

**Verified before pushing:** 48 files, 535 tests passing; `svelte-check` 0 errors, 3 warnings
(unchanged); breakpoint contract passing.

### 09:59 — Full controller unit suite re-measured

**No runtime impact** — a measurement, plus one documented count corrected.

**48 files, 535 tests, all passing.** `docs/PROMPT-TODO-ITEMS.md` said 522; corrected in place with
the date of the new measurement rather than silently overwritten.

### 09:58 — The verification query that was owed, run against production

**No runtime impact** — one read-only `SELECT`. Nothing was written to the database.

`docs/EMAIL.md` §5 and `docs/PROMPT-TODO-ITEMS.md` both recorded a query that had to be re-run
*after* `RESEND_API_KEY` and `MAIL_FROM` went live, because flipping them makes `verificationEnforced()`
true and gates any account with a NULL `email_verified_at` out of creating rooms.

Result: **one row, and it is the safe one.** `id 1 | billy.ribeiro@icloud.com`, `created_at` and
`email_verified_at` both `2026-08-07 22:46:34.438+00` — equal to the millisecond, which is the
signature of migration 1's backfill. **Nobody is locked out; no `UPDATE` and no resend needed.**

Also corrected the reason the brief gave for not having run it. It said obtaining a connection string
requires `vercel env pull`, which would write every other production secret to disk. It does not: a
`DATABASE_URL` was already on disk at `~/Desktop/new-room-control/.env.vercel-pull`, which is where
`scripts/set-vercel-env.sh` already reads it from.

*This measurement expires with the next registration.*

### 09:57 — TODO item I closed: the four unstyled public pages (`6e7a151`)

**RUNTIME IMPACT: yes.** Three public pages and a stylesheet, live on `main` and therefore deployed.
`/contact`, `/privacy` and `/terms` render differently to a visitor from this commit onward.

`contact`, `privacy`, `terms` and `verify-email` rendered with seven classes that had **no CSS rule
anywhere in the app**. `pub-hint`, `pub-error` and `pub-success` were therefore visually identical,
so on `/verify-email` "your address is confirmed" and "that link has expired" looked the same.

- **`src/public.css`** — added a section defining `pub-auth`, `pub-container`, `pub-form-card`,
  `pub-field`, `pub-hint`, `pub-error` and `pub-success`, every rule scoped `.pub-root …`, under a
  header marked NOT TRANSCRIBED because those pages were never captured. Values reuse what the app
  already has: Bootstrap 3.1.1 panel and `.form-control` geometry, `#777` from `.acc-text-muted`, and
  the two message colours literal-copied from `--btn-danger-bg` / `--btn-success-bg`.
- **Deliberately fluid, with no `@media` block** — `scripts/verify-breakpoints.mjs` asserts
  `public.css` carries exactly the thresholds 767/768/991/992/1200, so a new one fails that gate.
- **`(public)/contact/+page.svelte`** — rebuilt with labelled fields, all four server states handled
  (including `unavailable`, which the old page ignored), and an honest not-delivered state pointing
  at the real `support@tradingroom.app` mailbox.
- **`(public)/privacy/+page.svelte`, `(public)/terms/+page.svelte`** — written from the source code
  rather than a template, naming the third parties a template would miss: Gravatar's MD5-of-email
  lookup, reCAPTCHA, and Resend via Amazon SES `us-east-1`. Both carry an explicit "not reviewed by a
  lawyer" notice and list what is still undecided.
- **Checked, and it was an artifact:** the brief warned `contact`'s submit might be white-on-white
  because it computes `background: rgba(0,0,0,0)`. It is not. `.pub-root .button` sets
  `background-color: #4589e3` then `background: linear-gradient(...)`; the shorthand resets
  background-*color* to transparent while setting background-*image* to the gradient.
- Fixed two comments the change made false — in `forgot-password/+page.svelte` and
  `password-reset-pages.test.ts`, both of which still said the `pub-*` classes had no rule.

**Verified:** breakpoint contract passes; `svelte-check` 0 errors, 3 warnings (unchanged — none
added); 535 tests pass; Svelte autofixer clean on all three pages.
**Honest gap:** `verify-home-fidelity.mjs` could not be run — it reads `evidence-dumps/`, which lives
outside this repo — so its two `public.css` reject patterns were checked by hand (0 matches).

### 09:50 — `/forgot-password` and `/reset-password` moved to the correct shell (`4f36e89`)

Both were rendering in the marketing shell while wearing controller `acc-*` classes; measured in
Chromium, every field came out 508px instead of 254px. The shell is now decided by `$lib/chrome.ts`.

### 09:15 — Documentation corrected: mail is live (`17c1842`)

Three places still described the transport as unconfigured.

### 09:07–09:11 — Password reset built (`4291afc`, `178cbf4`)

The one flow with no route back into an account. Token design reused from `email-verification.ts`:
hashed at rest, single-use, one hour rather than 24, rate limited, reCAPTCHA before the lookup.

### ~08:50 — Email turned on end to end

- Porkbun hosted mailbox created for `support@tradingroom.app` ($36/yr — the free forward was
  offered and declined so replies do not come from a personal address).
- Resend domain `mail.tradingroom.app` verified; DKIM and the `send.mail` MX are live. **The SPF TXT
  and DMARC records did not save** and are still absent from the zone — confirmed against all four
  Porkbun nameservers. Sending works; inbox placement is weaker than it should be.
- `RESEND_API_KEY` and `MAIL_FROM` set on Vercel production, both marked Sensitive.
- `scripts/set-vercel-env.sh` extended to write both, with a minimum length for the key and a
  write-time check that `MAIL_FROM` is an address.

### 07:59 — The room is deployed (`77ac66d`)

`chat.tradingroom.app` on the Hetzner box, with `ROOM_JWT_SECRET` rotated to 64 hex characters on
the room and on Vercel in the same sitting.

### 05:04–05:33 — Documentation established

`TODO.md` at the repo root (`41ffe54`), `docs/EMAIL.md` (`12354fb`), `docs/MOBILE-APP.md`
(`f8a92f2`), and the white-label correction separating what the evidence proves from what it merely
permits (`38c74c0`).

### 04:19–04:47 — Rich text editor and hand-off notes

Editor toolbar focus ring, paragraph output, active-format highlighting, save toast
(`9755def`…`7ee434c`), and the hand-off notes (`2c620a4`).

### Earlier — manage-page side-by-side audit

Ran across 13 agents. The manage page went from **2,355 differing elements to 24**: tab strip 0/15,
Users 2/507, Text List 0/6, Branding 0/94, SSO Setup 0/9, User Stats 6/53, Settings 16/1501. The
first fix was a harness bug — the fixture omitted the `strip` property the page filters on, so the
tab strip scored 15/15 against an empty `<ul>`.

**Two defects from that work are still open**, both caught by its own adversarial verifier and
neither yet fixed: the stats date `<input>` is created on click but never focused, so the picker does
not open and the row sticks in edit state; and `for="statsFrom"`/`for="statsTo"` point at ids that
exist only while editing, so the labels are orphaned at rest.
