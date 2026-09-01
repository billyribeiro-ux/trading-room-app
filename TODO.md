# TODO — what is still left to do

Stripped 2026-08-13 18:26 EDT to exactly that, and re-audited 2026-08-17 against the repository
itself. Everything historical lives in `CHANGELOG.md`, and the process rules earned along the way
live in `docs/reference/working-rules.md`. If a section here is not something somebody still has to
DO, it does not belong.

This is the root index. Anything recorded per-app stays where it is; this file points at it, so
there is one place to look rather than four.

**The project rule this file exists for:** when something cannot be found in the evidence, it gets
(1) said plainly in the reply, (2) written here under **Evidence gaps** with what is missing, every
file already read looking for it, and what it blocks, and (3) given a browser-console script that
will fetch it. A gap recorded in only one app's document is a gap the next person does not see.

**What the 2026-08-17 audit changed, stated once so the diff is not mistaken for progress.** Eighty-five
claims in this file were checked by reading the artefacts they name, and every "this is finished"
verdict was then put to a pass whose only job was to refute it — which overturned ten of sixteen and
saved four rows that were about to be deleted while still carrying open work. Rows removed below were
removed on that evidence. **No row was removed because it looked stale**; the two that looked most
finished (row W's toast-only family, row AE's decomposition) turned out to be, respectively, worse
than recorded and three times further along than recorded.

> ⛔ **`apps/controller/src/lib/evidence-gap-register-counts.test.ts:36` READS THIS FILE.** It
> requires the tally sentence under *The register* below to exist in its exact documented shape and
> to equal a live recount of `docs/reference/evidence-gap-register.md`. **Do not delete or hand-edit
> that sentence.** If it drifts, recount with the test's own parser — never by memory, and never by
> reading the register's status column, which does not agree with it (see the open row on that).

---

## Still open — the 78 evicted scripts remain readable in PUBLIC history

The one thing untracking could not reach, and an owner decision rather than a piece of work.

`apps/room/scripts` holds **0** files on `main` today. At `be239b2` — before the 2026-08-15
eviction — it holds **78**, and the repository is `public`, so they are readable at that commit by
anyone. Untracking governs future commits only.

**AND THE DIRECTORY IS STILL GROWING, unmeasured until 2026-08-23: 146 files on disk against 0
tracked and 78 at `be239b2`.** The ignore rule is the bare directory line `/apps/room/scripts/` at
`.gitignore:176`, so every script written since the eviction has gone straight into a directory git
cannot see — nearly doubling the surface with no review, no CI and no privacy scan. That is a
second problem from the same rule and it gets worse on its own: the eviction question is about 78
files already published, this one is about 68 more that nobody has ever looked at.

Measured rather than assumed, with the repository's own detector in `apps/room/gate/privacy-utils.mjs`:
no email addresses, no gravatar hashes, no tokens across all 78. **One** occurrence of the owner's
name, in `scripts/compare-capture-states.mjs`, baselined at `apps/room/ops/privacy-baseline.txt:68`.
What they do carry is the third-party application they were built to match —
`chat.protradingroom.com`, its selectors and wire protocol — which makes this the republication
question, not a credential leak.

Two ways to actually resolve it, and only these two: rewrite history with `git filter-repo` and
force-push (every commit SHA changes, and GitHub may cache the old objects until support purges
them), or make the repository private (instant, erases nothing, ends the exposure). Leaving it is a
legitimate third answer given what is actually in the files. **Owner's decision; not taken.**

**Corrected 2026-08-17: it is 78 of 78 on `origin/main`, not 76.** `git merge-base --is-ancestor
be239b2 origin/main` exits 0, so every blob in that tree is reachable from the published default
branch, and a per-file check returned a commit for all 78 and none for zero. Nothing about the
decision turns on the number, but the row stated it as a measurement.

**Two smaller things fell out of the same eviction and are DONE, 2026-08-27.** The manifest no longer
advertises what a clone cannot run, and the enumeration is published. What is left of the eviction is
the owner decision above and nothing else. `apps/room/docs/UNPUBLISHED-SCRIPTS.md` records the thirty
removed entries so the account survives the removal, and names the one thing still genuinely lost:
the four Chromium gates, which cannot be re-derived from tracked bytes because they drive a browser
against unpublished captures. That is the same owner decision as row 5.

**Three baseline lines are stale in the safe direction, recorded so nobody re-reports them as a leak.**
(It read "Two" until 2026-08-23 while naming three files in the same sentence.)
`apps/room/ops/privacy-baseline.txt:121-123` still baselines `rawEmail` findings in
`alert-delete-e2e.mjs`, `audit-clean-app-room.mjs` and `media-screenshare-e2e.mjs`. Those addresses
were replaced by `PTR_*_EMAIL` environment reads.

**This row said the verifier prints them under "baselined finding(s) are gone — run `--update` to
shrink". Run 2026-08-31, it does not, and it must not.** It prints:

> `[privacy] 81 baselined finding(s) are not visible from this checkout, which is missing 13 capture
> root(s)… Do NOT run --update here. They are absent, not redacted. Shrinking the baseline would make
> them read as NEW personal data on a checkout that has the captures.`

The advice is **withheld whenever any capture root is missing** (`verify-privacy-boundary.mjs:185`),
and in a clone one always is. The three files here are in the same bucket for a second reason:
`apps/room/scripts/` holds **0 files** in this checkout and `git ls-files` returns **0** for it, so
"redacted" and "absent" are indistinguishable from here regardless.

**So this is not pending work for anyone reading this in a clone — it is an OWNER-MACHINE step**, and
only there, where the captures resolve, `missingRoots` is empty and the three lines can be told apart
from the other 81. Stated because the row read as an outstanding chore and the tool refuses it by
design: `--update` from a clone would rewrite the baseline down to what a clone can see, and the next
run on the owner's machine would report 81 findings as NEW personal data entering the repository.

---

## What the CI gates left behind

### One evidence set is documented and has never been committed — needs the owner

`apps/controller/evidence-dumps/account-page/` is in the archive map, is cited by
`docs/reference/account-pixel-match.md` and others, and does not exist in this repository.
`git log --all -- 'apps/controller/evidence-dumps/account-page*'` returns nothing, so it was never
committed rather than deleted — it is a capture that stayed on the machine that took it.

**Nothing here can close this.** The capture is of an authenticated page on the reference site;
it cannot be re-derived from what the repository holds, and fabricating it would be worse than its
absence. What was done on 2026-08-28 is everything short of that: the absence is pinned in
`scripts/verify-evidence-layout.mjs` (restore the directory and the verifier goes red, naming the
lists the entry has to move to), `verify-account-contract.mjs` skips one SHA-256 pin out loud
instead of dying with ENOENT before its other assertions, and `evidence-dumps/README.md` says so
in prose.

**What unblocks it:** the owner committing `account-page/` from the machine that holds it, with
`upload-image-badge-prompt.html` hashing to
`fb4e934f761f15fb2eac26882ce6ebac9b6628f6f3b8ab48b20ad521a6c7c43f` — the hash the contract still
carries. Conclusions already drawn from that capture stay unrecheckable by anybody else until then.

### Local dev secrets — one standing warning, no outstanding action

The 2026-08-15 restoration is finished and its record is in `CHANGELOG.md`. What survives here is the
fact that makes it repeatable, and it is not a task:

**Every controller variable on Vercel is type `Sensitive`, which is write-only.** No value can be
read back by the dashboard, the CLI or support. **`~/Desktop/new-room-control/.env` and
`.env.vercel-pull` are therefore the only readable copies of production secrets that exist
anywhere.** Back that folder up off this machine.

Consequence of the one key that could not be restored and was regenerated: API keys created before
2026-08-15 can no longer be re-displayed on the account page. They still **authenticate** —
`secret_hash` is what authenticates and it is untouched. Delete and recreate any key you want visible.

### The runtime-role cutover: one row left, and it is an operator step

`ops/naming-provenance.md` is the authority on all of this.

**The RUNTIME role is finished.** `0009_provision_tradingroom_app.sql` gave `tradingroom_app` parity
and retargeted all 22 RLS policies onto it; `0010_retire_ptr_clone_app.sql`, authored 2026-08-31,
strips every privilege the baseline role holds in the database it runs on — 87 table grants, 26
column grants, 6 routine grants, schema `USAGE` and the DATABASE `CONNECT` — counts the residue from
`pg_catalog` and refuses rather than reporting success if anything survives. It also REFUSES on a
database where `0009` has not taken effect. Measured on a live PostgreSQL 16.13 cluster across four
databases; the CHANGELOG entry of 2026-08-31 00:57 UTC carries the evidence.

**It deliberately does not `DROP ROLE`, and the earlier version of this row that demanded one was
wrong.** Roles are cluster-global while the sqlx ledger is per-database, so a chain that drops the
role cannot be applied to the next database: the migrate preflight requires `ptr_clone_app` to exist
before `0001` runs, because `0001` would otherwise create it with the placeholder password committed
at its line 26. `migration_reappliability.rs` is what refused it, on
`the_chain_applies_to_a_second_database_on_the_same_cluster`. Dropping the role is an operator step
for a cluster that will take no further new databases, and `db::migrate::baseline_role_absence_policy`
is what stops that step from blocking every deploy after it.

**The grant-site list this row used to carry is no longer load-bearing** and is not reproduced: the
migration enumerates ACLs from the catalogue rather than from a hand-kept list of `GRANT` lines,
which is what made two sites missing from that list (`0003:106` and `0004:55`) a documentation bug
rather than a defect. The counted residual is the check.

| # | what | why it is not done yet |
| --- | --- | --- |
| 1 | **Owner role and database name `ptr_clone` → `tradingroom`** — **steps 1 and 2 are DONE and the rest is rehearsed; `ops/OWNER-ROLE-CUTOVER.md` is the runbook.** The blocker was in the code, not on the cluster: `EXPECTED_MIGRATOR_ROLE` was a single `&str`, and a single accepted name forces a FLAG DAY — the database's ownership and the deployed binary have to change in the same instant, and in the window between them one of the two refuses a database that is perfectly healthy. `ACCEPTED_MIGRATOR_ROLES` is that window, an ordered allow-list of exactly two names. It is **not** the tolerance removed from the runtime-role preflight: that was a catalogue lookup returning role Y's posture when asked about X; this is an equality test against three facts about the current connection, all of which must name the SAME entry. **Four cases measured through the real `migrate` binary on a live PG 16.13 cluster:** `tradingroom`→`tradingroom`-owned exit 0 (10 migrations, 3 tables, 22 policies); `ptr_clone`→`ptr_clone`-owned exit 0 (no regression); a third superuser exit 1; and `tradingroom` after `SET ROLE ptr_clone` exit 1 — both names accepted, unanimity still enforced. The negative control for that last one is the whole reason it is checked entry-by-entry: the plausible "each fact is in the list" form accepts all four impersonations. **Step 3 rehearsed on a fully-migrated database:** `REASSIGN OWNED` moved 129 relations and `ALTER DATABASE … OWNER TO` the database, with 22 RLS policies and 87 `tradingroom_app` grants intact either side, and the chain then applies as EITHER owner. **Step 4 rehearsed:** `DROP ROLE ptr_clone` REFUSES while objects remain and names the databases and counts — fail-closed retirement, no `CASCADE`. The release attestation now resolves the owner from the connection once and PINS every downstream check to it, so a half-finished `REASSIGN OWNED` fails attestation. | the operator: steps 3-5 of the runbook, per cluster |

**The cost constraint that governs how these get tested.** Every push against an open PR starts a
run. The backend gate is ~33 minutes when the diff touches a backend path and ~25 seconds when it
does not, so batching backend pushes is worth real money and docs pushes are effectively free. See
`docs/reference/working-rules.md` rule 12 for why a green PR check is not proof the backend ran.

---

## Evidence gaps

**Whether a real browser serialises `background:#111` as `rgb(17, 17, 17)` — UNVERIFIED, and it
matters.** Writing the jsdom test surfaced that Tiptap's `getHTML()` returns CSSOM-normalised style
attributes there: `width:50.000000%` comes back `width: 50%`, and `background:#111` comes back
`background: rgb(17, 17, 17)`. Both sanitiser allow-lists — `safe-html.ts` client-side and
`server/notes.ts` line 123 — accept `background` only as `/^#111$/i`, so **if** a browser normalises
the same way, every carousel saved through our editor loses its black backing.

I do not believe it does: `setAttribute('style', …)` preserves the attribute verbatim in Chrome, and
the server sanitiser is `sanitize-html` over `htmlparser2`, a string parser with no CSSOM at all. So
this is most likely a jsdom artefact and **nothing has been changed on the strength of it** —
widening a sanitiser allow-list to defend against a behaviour I have not observed is exactly the
speculative change this file exists to prevent.

- **What is missing:** one look at `editor.getHTML()` in a real browser after inserting a carousel.
- **Where I looked:** `carousel.ts` `renderHTML`, `TAG_STYLE_RULES.div.background` in
  `apps/room/src/lib/components/notes/safe-html.ts` (**not** `lib/safe-html.ts` — the file moved and
  this row used to cite it by bare name), `server/notes.ts:123`, and the jsdom output pinned in
  `note-carousel.test.ts`.
- **What it blocks:** nothing today. It decides whether the allow-lists need a second accepted form.

---

## What the SETTINGS enumeration says — new, 2026-08-28

`apps/room/gate/audit-setting-coverage.mjs` asks the second question nothing had asked. The command
audit next to it asks what the reference SENDS; this asks what it READS.

`room-settings-schema.ts` declares **269** settings and marks **164** of them `wired: false` —
nothing in this room reads them. That number alone says nothing: most were never meant to reach a
room. The answerable question is narrower, and it is measured against the pinned v4 bundle:

A subset of them are read by the reference's OWN room client, as `sessData.<name>`, and **that subset
is pinned BY NAME in `apps/room/src/lib/setting-coverage-contract.test.ts` — never by a count here.**

> **Superseded 2026-08-29, twice.** This paragraph said **170** and "26 of the 170"; the first was
> corrected when `COUNT_CLAIMS` grew to include `TODO.md`, and the second was still wrong the next
> day — measured live, the reference reads **22**, not 26. `COUNT_CLAIMS` did not catch it because it
> checks the WIRED count and this is a different claim, in a phrasing no pattern matched. The
> verifier's own docblock had predicted exactly this: *"the next stale count will be in a seventh
> file phrased a seventh way."* It was a seventh phrasing in the same file.
>
> So the number is GONE rather than corrected, which is the doctrine
> `setting-coverage-contract.test.ts` already states about itself: *"NO COUNTS IN THIS PARAGRAPH ANY
> MORE… the numbers move every time a setting is wired, and prose beside a list it counts is the copy
> nobody updates."* That test now asserts this file carries no such count.

**The subset is fully triaged, and nothing in it is buildable here.** Measured 2026-08-29 against the
pinned bundle, every one has a disposition in `docs/decoded/missing-settings-triage.md` with a byte
offset:

- **SEVEN are credentials the reference ships to every browser** and this room refuses to. Wiring one
  is a regression, not progress.
- **ONE is answered by derivation** — `playChatMessageSoundFor`'s feature is built; the raw value
  deliberately does not cross.
- **THREE are not gaps at all**, because the reference's own feature does not work: `h264Enabled` is
  `sessData.h264Enabled || !0`, unconditionally true; `advancedSearchAlerts` is gated on one
  hard-coded owner id; `smallerImagePreview` seeds a preference whose only class has no rule in any
  of the 52 stylesheets held here.
- **The rest are BLOCKED** on infrastructure or one owner answer — an archive service, a
  server-owned lock, a second MediaMTX cluster, the `r` recording-bot parameter, a cross-post
  fan-out that occurs zero times in the bundle, or a Discord application registration.

`WIRE` — the section for settings whose surface exists and is missing a term — **opened at twelve rows
and is down to one**, `recsInRoom`, which is itself blocked on the Recordings tab.

**Thirty-one have already left the list, on the day it was written**, and it keeps moving.

> **History, not a current count.** The list opened at 202 unwired and 58 questions. Both numbers have
> moved many times since; the live one is the paragraph above, which
> `apps/controller/scripts/verify-room-settings-schema.mjs` checks. This sentence sits in a
> blockquote for that reason — it is the convention that lets a document record what it used to say
> without a superseded number failing the build, or the check being loosened to let one pass.

- `hideNotes` — the Notes tab and pane now honour *"Hide Notes Section?"*, which they did not while
  its two siblings `hideFiles` and `hideRecs` did. A gap nobody could have found by looking, because
  the tab it gates was always built.
- `darkThemeAsDefault`, `alertSoundOff`, `alertsChatOnBottom` — **one feature, not three settings.**
  Read alone, each is a small owner preference; read together they are three consecutive clauses of
  one expression in the reference (bytes 1,149,414 / 1,149,637 / 1,149,866), each paired with a
  per-viewer LATCH so that a room default seeds a member's preference once and never overrides it
  afterwards. `#lib/room/room-defaults.ts`. **The list is what put the three names next to each
  other**; asked one at a time, the shape is invisible.
- `dontShowRecInfoToUsers` — **not a missing feature at all.** The gate was built and
  `RoomNavbar.svelte` carried the correct transcription in a comment, but `RoomGates.recordingTooltip`
  read the flag off `prefs.loaded` — a viewer preference nothing writes — instead of `sessData`. It
  compiled, `svelte-check` was clean, and its own test passed because the test handed it the same
  wrong source the code read. Every member in every room saw the recording file name the owner had
  asked to hide. **Nothing but this list could have found it.**

**All 53 were READ and triaged on 2026-08-28**, and the answers are in
`docs/decoded/missing-settings-triage.md` — that document, not the pinned list, is the tracker. Three
classes of answer are not work at all:

- **NEVER — SEVEN are credentials the reference ships to every member's browser.** `deleteAlertPW`,
  `banIPList`, `obsStreamKey`, `twillioApiSID`, `modAdminLoginList`, and — found on 2026-08-28 by
  reading every entry rather than by pattern — `allRoomsWelcomeMatPW` and `needPasswordForUserNotes`.
  Each is `bootbox.prompt` then `value.trim() === sessData.<pw>` **in the browser**, so upstream the
  gate protects nothing. `internal/room-entry` is the shape that replaces them: the credential stays
  on the controller and the question travels. **Wiring one is a regression wearing an enumeration's
  clothes.**
- **NOT A GAP — three reproduce a defect.** `h264Enabled` is `sessData.h264Enabled || !0`, so it is
  unconditionally true upstream and the setting does nothing at all. `advancedSearchAlerts` is gated
  on one hard-coded owner id. `smallerImagePreview` seeds a preference whose only effect is a class
  with no rule in any of the 52 stylesheets this repository holds.
- **ENUMERATION ARTEFACT — one count is noise, and it is the rule this list needs most.** `name`
  matches `this.name` on unrelated error classes throughout the bundle and so sat near the TOP of
  the list. Its one real read — `globals.sessionName = r.name`, feeding `document.title` — was a
  real gap and took three lines of `<svelte:head>` to close on 2026-08-28. **Rank a row by what it
  turns out to be, never by the number beside it.**

Two of the WIRE rows — `chatDisabledForTrials` and `hasQAOnAlerts` — landed the same day, and one
row was CORRECTED out of WIRE into FEATURE by reading it properly rather than by re-reading the
first pass: `enableQAReactions` gates reactions on the entries of the Q&A THREAD (`isQAMsg` is the
modal's own flag, not a property of a message), and that thread's menu was inert here, so wiring the
flag would have lit a control that cannot act. **It was BUILT on 2026-08-28**, and the correction
still under-called it: it needed two commands addressing a question by its own row id, two columns on
`alert_questions`, and the thread extracted into `AlertQaModal.svelte` because the size ratchet
refused the raise. It also found a silent data loss — every question ever asked on a CAPTURED alert
was written and never read back. The remainder split into **12 WIRE** (the surface exists here and is
missing a term), **18 FEATURE** and **6 BLOCKED**, each with its byte offset and its size in the
triage document.

**The ceiling catalog is now DISCOVERED for components as well as modules** (2026-08-28). It was a
hand-kept list at **12 of 48**, and the four found uncapped by accident in two days were the visible
part: `AlertChatArea` (1,113) and `RoomMessage` (949) had never had one either. Adding an entry is
now how a component is ADMITTED, not how it gets covered. Three files are named as their own
outstanding work rather than swept: `AlertChatArea`, `RoomMessage` and `RoomNavbar`.

**A CORRECTION THAT BELONGS BESIDE THAT ROW.** The ceiling sweep and two CHANGELOG entries called
`RoomNavbar` "the one component with neither a mount nor an SSR render test". **That was false.**
`room-navbar-render.test.ts` and `room-navbar-contract.test.ts` both existed, and row AE below said
so; `todo-next.md` carried the stale line and it was read, believed and repeated rather than checked
with one `ls`. The navbar's real gap was a client `mount` — SSR runs no handler and no `$bindable`
write — and `components/RoomNavbar.svelte.test.ts` closed it on 2026-08-28. Both trackers are
corrected.

**A THIRD KIND OF ANSWER, added 2026-08-28: DERIVED.** `playChatMessageSoundFor` holds member email
ADDRESSES and the reference ships them to every browser to hash there. The room never needs them:
`internal/room-config/[code]` sends the HASHES, the same digest it already sends for
`badges.byEmailHash`. **The feature is built and the setting stays `wired: false`** — so the counts
above do not move, and that is correct rather than a bookkeeping problem: the pinned list asks
whether the raw value crosses, and here it must not. Two silent upstream defects are fixed on the
way, including one where following a single person turns off every chat sound in the room.

**WIRE is down to ONE**, and it is `recsInRoom`, which is BLOCKED anyway — wire it with the
Recordings tab, never before it. The section opened with twelve.

**`isNewIndicatorOn` was the THIRD row corrected out of WIRE**, on 2026-08-28, and its own caveat is
what did it: *"Needs `msg.isNew` to have a supply; check before wiring."* The check says there is no
supply and there cannot be one from evidence — `isNew` is produced by the reference's SERVER and
arrives on the login payload (bytes 995,175 and 1,157,344), so the rule deciding who is new is
unknowable here, and inventing one would invent the decision the setting exists to express. It is
BLOCKED on one owner answer or one capture of that response.

**The check found a live defect on the way.** `ModalHost.svelte` drew the `Trial` and `New` badges
as `{#if targetUser.isTrial}` and `{#if targetUser.isNew}` — ONE term between them, where the capture
has `isPresenter &&` on both. `isTrial` has a supply, so **any member opening another member's info
card could read their billing status.** Both now carry the presenter term.

**A SECOND WIRE ROW WAS WRONG, and reading fixed it.** `enablePrivateMessageHistory` was filed as
"one row in the user-info modal". The button is one row; the modal it opens was a permanent
`Loading...` spinner with no fetch, no list, no empty state and nothing in the repository that could
open it. That is the second row corrected out of WIRE the same way `enableQAReactions` was — a gate
whose SURFACE exists and whose ACTION does not — and it is the pattern to check for before filing
anything else as cheap. It was built on 2026-08-28: a bounded repository read, a remote command that
decides the role AND the entitlement on the server, and the captured modal actually filled in.

`simplifiedEditor` left WIRE on 2026-08-28 and is worth a line of its own, because it is the first
setting to cross whose DOWNSTREAM VENDOR is absent from the capture. The reference spends it choosing
between two Summernote button names and Summernote is not in the bundle we hold, so the room
reproduces the decision — foreground-only colour — and `resolveNoteSurfaceGates` states in as many
words which part of that is evidenced and which part is this repository's call. A setting wired
without that distinction written down would read, later, as a transcription.

`src/lib/setting-coverage-contract.test.ts` pins that list BY NAME — never by a size — and asserts
separately that the seven credentials are still on it, because a name leaving that list means the
room started reading it.

> **Superseded 2026-08-29.** This sentence said *"pins the 26 by NAME"*. It was the SECOND stale copy
> of that number in this file and the THIRD phrasing of it, found only because a negative control on
> the new guard failed to fire — the guard's pointer assertion was being satisfied by this line while
> this line carried the stale count. Two sites, three phrasings, one file: which is the argument for
> the guard rather than another correction.

The largest by read count are `deleteAlertPW` (12, a credential), `altChatRender` (6) and
`smallerImagePreview` (6, answered as NOT A GAP). **Read count is not priority** — it is how many
times the reference mentions a name, and the biggest number on this list is a credential we refuse.
`enableQAReactions` was second at 10 and is built; `positionsIframe` was fourth at 7 and is built.

**SEVEN TEST FILES WERE BEING DROPPED FROM EVERY CI RUN**, 2026-08-28, behind a banner announcing
them as uncovered. `gate/evidence-bound-tests.mjs` matched an evidence-root path anywhere in a test
file, including in a COMMENT, and matched all fourteen roots rather than the ones actually missing.
`room-message-render.test.ts` — 226 lines pinning all 18 captured kebabs with their exact labels and
source order — was excluded by one citation while the fixture it reads is tracked and present. The
suite goes 173 files / 2,841 tests to **180 / 2,904** with nothing written to make them pass. Both
narrowings are in place and `evidence-partition.test.ts` pins 42.

**AND IT WAS THE STATED REASON `altChatRender` WAS FILED BLOCKED**, forty minutes earlier the same
day. The guard was never off. That is the SECOND inherited blocker to dissolve on re-measurement in
one session, after the Rust one below — **re-measure a blocker before building around it.**

**THE ROOM NOW HAS A BROWSER GATE, and its first run found two defects that were shipping** — a
`ReferenceError` that made every room render 500 for eleven days, and a duplicate `<title>` that had
been overriding every page's. Both fixed; `.github/workflows/quality.yml` runs the suite on every PR.
All seven of its specs pass in 35 seconds. Getting the last four green turned up a THIRD shipped
defect: the login page navigated to itself in an infinite loop for anyone arriving with a valid
handoff, because the SvelteKit 3 migration to `goto(…, { shallow: true })` broke the termination
condition its own comment documented — that call does not update `page.url`, so the guard re-read the
token forever.

**THE SETTINGS ENUMERATION IS DOWN TO ONE UNBUILT FEATURE** — measured 2026-08-28, not inherited.
`enableDiscord` needs a Discord application registration, which is the owner's call because there is
nothing to link accounts to until one exists. `altChatRender` was the fifth and is BUILT.

**`hasAlertScheduler` is BUILT, and its blocker named the wrong process.** "A scheduler process in
`services/api`" is true of that crate and is not where this belongs: the reference's scheduler is its
own Node server, and this stack's long-lived Node process is the ROOM, which cannot be serverless on
two grounds already documented and which owns the `alerts` table and the fan-out. Durable rows, an
ephemeral sweep timer, one atomic conditional UPDATE so firing is exactly-once. FIFTH inherited
blocker to dissolve on re-measurement in one session.

**`autoRecord` + `dontStopRecOnMicMute` are BUILT, and their blocker described the wrong system.** It
read "a server-side recorder, which does not exist", which is true of the REFERENCE — its
`startRecLocal` is a misnomer reaching `socket.emit("cmd", {cmd: "startRecord"})` — and irrelevant
here, because this room records in the browser with `MediaRecorder`, deliberately and with the reason
already at the method. Two divergences are written at the code: only this peer's own share is
auto-recorded, and the start is guarded on not already recording. FOURTH inherited blocker to
dissolve on re-measurement in one session.

**`alertsOverlayOnScreenshare` was the fourth, and it is BUILT — its blocker was WRONG, not merely
stale.** The row read "a human at a screen picker", which remains true of the one thing it blocks:
nothing here can look at a composited frame, and `alert-overlay-contract.test.ts` says so in its own
header. But the risk in that feature was never the canvas; it was the wrapping, and the wrapping is
arithmetic. Split into a pure `alert-overlay-layout.ts`, all four of its wrapping rules are measured
against a stub text measurer and twelve negative controls were seen red. THIRD inherited blocker to
dissolve on re-measurement in one session.

**TWO INHERITED BLOCKERS WERE RE-MEASURED AND ONE IS NARROWER THAN IT READS.** `cargo check -p
tradingroom-api --features testing` and `cargo clippy -p tradingroom-api --features testing --
-D warnings` are **both green in this container**. What cannot build is `cargo test`: the crate
dev-depends on `tradingroom-media` for one contract test, which pulls `mediasoup-sys`, whose build
script fetches `libsrtp` from GitHub and gets **403** from the egress proxy. So a `services/api`
change can be compiled and linted here — it just cannot be unit-tested, which is why a scheduler
that writes to a multi-tenant database on a timer is not something to ship from this container.

**`chatTabsWithBadges` was the first row to change a TYPE**, 2026-08-28. This room had two chat
channels hard-coded in three components behind a closed `ChatTab` union, and the union's own note
argued for it: a typo becomes a compile error. An owner can configure more channels, behind badges,
so the set is per room AND per member — and the reference decides which a member gets **in the
browser**, against a list the browser holds. Every read and write path here asks the server instead,
and the realtime chat and typing fan-outs became audience-aware, which they were not. Two live
defects fell out of it: a reply could be posted into a channel the replier could not read, and the
chat fan-out told every listener in the room that something had happened in a private one.

---

## What the enumeration says

Nothing had ever ENUMERATED the reference's features, so "everything buildable is built" was for a
long time a statement about what somebody had thought to look for — while two whole presentation-area
tabs sat in the captured bundle unbuilt. `apps/room/gate/audit-feature-coverage.mjs` now asks the
bundle directly, and since it was written it has found, three separate times, work nobody knew
existed. **Run it after every feature lands.** It moved from the untracked `scripts/` to the
published `gate/` on 2026-08-27 and was re-derived from the tracked v4 bundle, so a fresh clone can
reproduce every number it prints; `src/lib/feature-coverage-contract.test.ts` pins the output by NAME
rather than by count, because wiring one command while another quietly stops being mentioned leaves a
total unchanged. **Its own first run under Vitest reported every gap closed** — the pin file contains
the absent names as literals and the scan was reading `src/**` whole, so the measurement was
satisfied by a pin of its own output. Test files are excluded now, and the rule that settled it is
the honest one anyway: a name that appears only in a test or a comment is not an implementation.

**What it measures today, from the pinned bundle (sha256 `40796ca8…bab87524`, 2,891,205 bytes):**
135 wire identifiers in the reference, **93 named in our source, 42 not**; 8 presentation-area tabs,
**6 named, 2 not** — `recordings`, which is a real gap with a named blocker, and `files`, which is not
a gap at all (the reference uses the id as a value in `onMainTabChange`; this room reaches the same
behaviour through a typed union). **An absent identifier is not an absent feature**: the last
adversarial pass killed 7 of 34 such claims outright and reclassified 9 more.

`docs/decoded/missing-commands-triage.md` — every missing identifier read at every occurrence, then
each gap claim put through an adversarial pass that killed 8 of 34:

| | |
| --- | ---: |
| **NOT BUILT — outstanding work** | **30** |
| — fully specified, ready to build | 25 |
| — need a decision first, still outstanding | 5 |
| claimed missing then refuted — we already build it | 7 (+1 contested, resolved by reading) |
| built under another name — the audit cannot see these | 9 |
| third-party noise, never ours to build | 4 |

**⚠️⚠️ "NOT BUILT" IS THE WRONG LABEL FOR ROUGHLY HALF THAT TABLE, AND THE RIGHT LABEL IS WORSE.**
A pass on 2026-08-17 attacked 49 open items with the single instruction *prove this is already
built*. **23 came back mislabelled** — 21 partly built, 2 built outright. The count above is left
alone deliberately (the document derives it, and a hand-adjusted copy in a second place is how one of
them goes stale), but **do not read that table as "nothing exists" for any given row.** The recurring
shape is this: **the UI was ported verbatim — every string, every button, every gate — and the wire
was never connected.** So the control renders, a presenter clicks it, and nothing happens.

**Five rows are simply built and the document has not noticed:** `playVideoForAll` (`:76`),
`stopVideoForAll` (`:71`), `playYTForAll` (`:73`), `stopYTForAll` (`:74`) and `unmuteChat` (`:82`),
all shipped 2026-08-15 (`for-all-broadcast.remote.ts:81,142`; `chat-mute.remote.ts:50`). A sixth,
`presAreaTabs-videoplayer`, is built and gated end to end at `PresentationArea.svelte:520-541` and
`:1039-1048` — so of the **two** presentation-area tabs the audit reported missing, only
`recordings` is real.

**The script is tracked and the re-run is DONE, 2026-08-27** — its current output is above. What is
still outstanding is the DOCUMENT: `missing-commands-triage.md` must be restated against those 42
names, and **its verdicts need three buckets, not one** — see *What "not built" actually means here*
below.

**ITS LINE POINTERS WERE STALE REPO-WIDE — FIXED AND GATED, 2026-08-29.** The document's `ours`
column was written before the `apps/room` decomposition. Measured: **44 `path:line` citations, 23 of
them naming a line that no longer exists** — the videoplayer row cited `+page.svelte:11294-11316` for
a file now under 1,500 lines, and the `restoreMobileAppTokens` row cited `ModalHost.svelte:5327-5362`,
which is now the alerts advanced-search modal. **Two were absolute paths into the author's home
directory**, which no clone can resolve at all.

All 44 are now a path plus a SYMBOL, which is what the document's own method section already
recommended — *cite symbols and verbatim strings, which survive refactors*. **The 200 byte offsets
are untouched and must stay:** they cite the SHA-256'd bundle, which cannot drift. A byte offset is
evidence; a line number is a guess about a file somebody else will edit.

`missing-command-census-contract.test.ts` now refuses a `path:line` citation, a dangling `, :133`
continuation, an absolute path, and — as its vacuity floor — the loss of the byte offsets. Four
negative controls seen red. This closes what `doc-citation-contract.test.ts` states it cannot see:
*"a citation that still lands INSIDE the file can still point at the wrong line… it catches the loud
half only."*

**Nothing that is not built gets parked.** An earlier version of that table carried a fifth bucket —
"unclear, needs a product decision" — which read as resolved and was not. A pending decision is
outstanding work; the only thing that removes a row is building it or proving we already did.

### What "not built" actually means here — four kinds, and only one of them is harmless

Established 2026-08-17 by reading each control end to end. **This distinction is the single most
useful thing the audit produced**, because the flat label "NOT BUILT" reads as *nothing is there* and
for most of these the truth is *it is there, it is live, and it is lying*. Severity runs top to
bottom.

**1. LYING CONTROLS — they report success and send nothing.** The worst kind, because the presenter
believes the action landed. **Row W names the one that is left; the census itself lives in row 4, which is
machine-checked** — this sentence carried its own copy (*"Row W holds THREE as of 2026-08-27, down from
twelve"*) until 2026-08-29, which made it the third place in this file stating one number. `remoteRestartAudio` was named here as the same shape
and is NOT one any more: `restart-audio` keeps its `EXACT_ALERTS` entry because the reference raises
that alert too, and it now sits over a real `restartAudio` command. **`focusOnSessionNote` WAS in this list and is FIXED, 2026-08-23.** Both controls — "Bring everyone
here" at `NoteTabContent.svelte` and "Bring **E**veryone here" at `NoteEditor.svelte:583` — were wired
through `NotesPane` to a purely local `selectNote(id)`, and brought nobody. They now send a real
`focusOnSessionNote` command on the same `cmds` channel the screen version uses, with the protocol
READ out of the capture rather than modelled on its sibling (bytes 1474066, 1970831, 1023554, 1962371)
— the two turned out to be adjacent cases in the same switch, which is the evidence that reusing the
channel was right rather than convenient. Authority is `presenterRoom()`, so no room identifier is
accepted from the client. `NoteTabContent`'s `onSelect` prop was deleted with it: once the menu item
stopped borrowing it, eslint showed it had no other reader. Pinned by
`focus-on-session-note-contract.test.ts` (11 cases), negative-controlled three ways including the
re-broadcast loop. It was the identical defect to the screens one that
`focus-on-screen-contract.test.ts:13` already recorded — *"The menu item said 'Bring everyone here'
and brought nobody"* — one tab away, and nobody had looked.

**2. DEAD CONTROLS — no handler at all, not even a toast.** Clicking does literally nothing.
**BOTH BUILT 2026-08-29 — this whole section is superseded and kept only for the byte offsets it
records.** `debug-log` and `upload-profile-picture` (with its remove half) have real branches, real
commands and contract cover; see `routes/debug-log.remote.ts` and `routes/profile-picture.remote.ts`.
**One correction the build produced:** the upload evidence in
`docs/decoded/missing-commands-triage.md:93` is TRUNCATED in that document — it names a "125px
longest edge" downscale and three alert sentences but cuts off mid-word — so both were read from the
bundle instead, at bytes 2,084,700 and 2,086,100, and the downscale and the alerts shipped as a
correction hours after the feature. The original text follows.

`getDebugLog`: `ModalHost.svelte:2306` dispatches `onUserAction('debug-log', …)` and that string
occurs **exactly once in the whole source**, at the call site — no branch in `handle()`, no entry in
`EXACT_ALERTS`. Its modal at `:3844` is unreachable (nothing ever sets `name === 'debug'`) and
nothing ever fills `debugLogModalTxt`. `setUserProfilePic` ("Upload Profile Picture",
`ModalHost.svelte:2376-2381`) is the same.

**IT WAS ELEVEN, IT IS NOW SIX, AND NINE OF THE ELEVEN HAD NEVER BEEN RECORDED ANYWHERE.** The
paragraph below is the 2026-08-23 finding, kept because how the class was FOUND is the transferable
part; the count is re-measured in row 4 and in `user-action-intent.ts`, which is the authority.
Established 2026-08-23 by
diffing every `onUserAction('…')` string in the source against every branch in
`RoomUserActions.handle` and every key of `EXACT_ALERTS`: **42 dispatched, 27 handled, 5 alerted,
11 reaching nothing.** `handle()` ends on a bare `if (fixedAlert)` with **no fallback**, so each of
the eleven returns having done nothing at all — no command, no toast, no error, nothing in the
console. This section previously named two of them (`getDebugLog`, `setUserProfilePic`); the other
nine are `stop-screens` (`ModalHost.svelte:2265`), `restart-screens` (`:2272`), `start-recording`
(`:2279`), `stop-recording` (`:2285`), `mute-mic` (`:2253`), `mute-camera` (`:2259`),
`disable-private-chat` (`:2373`), `get-my-token` (`:3075`) and `test-follow-sound` (`:2505`).
**None of the eleven has a server half** — verified by searching `src/routes` and `src/lib/server`
for each name, which returns zero files — so none can be wired by connecting an existing endpoint.
Each needs the reference's captured wire protocol or an infrastructure decision, and this
repository forbids inventing either.

**GUARDED, NOT FIXED — `user-action-disposition-contract.test.ts` (2026-08-23).** Deny by default:
every dispatched action must be handled, alerted, or carry an entry in `INERT_ACTIONS`
(`user-action-intent.ts`) with a reason and a `file:line`. A twelfth cannot be added silently, and
wiring one means deleting its entry — at which point the gate demands a real handler. It also
refuses dispatch by a COMPUTED name, which no enumeration could see. Nine cases; the runtime half
executes `handle()` for each inert action and asserts no dialog, no toast, no command, behind two
positive controls. Negative-controlled three ways: a twelfth dead control, an action wired without
removing its entry, and a placeholder reason — each red on its own assertion. **The entries are a
to-do list with evidence attached, not a suppression file: the work is still open.**

**3. SILENT CORRECTNESS GAPS — it works, but not the way the reference works, and nothing says so.**
`doChatLogSearch` was the example and **the ALERTS half is closed, 2026-08-27, by the second of the
two resolutions the defect table offered: the limit is VISIBLE.** The toolbar still filters the rows
the page holds — it is a live filter, not a round trip — but it now says so, and points at the
Advanced Search modal, which has queried the database since 2026-08-23 and reports its own
truncation. `alert-toolbar-search-scope.ts` carries the rule and records that the sentence is ours.

**The CHAT half is a missing FEATURE, not a broken one, and that is the correction:** this room has no
chat search input at all. Upstream's `doSearchSubmit` (byte 1439114) sends
`{searchTerm, channel, type:"chat", del}`, and the same command with `del:true` DELETES what it
matches — gated on `deleteAlertPW`, which is the setting row 2 was originally confused about. Building
the search would mean deciding about the delete too.

**4. HONEST PARTIALS — half built, and the code documents the limit.** These are fine and must not be
lumped in with the above. `forceStopScreen` is the example: `screens.stop()` really stops one of your
own screens (closes the producer, releases the capture), and for somebody else's it drops the tab
with the reason written down — *"Stopping their producer is not ours to do, so this only drops the
tab and is deliberately not pretending the remote share ended."* That is the standard being met, not
missed.

**A FIFTH THING THAT IS NOT A CONTROL AT ALL — FIXED 2026-08-23, recorded because the shape recurs.**
`+page.server.ts:381` sent `muted: roomConfig.member?.muted ?? false` into the room and **nothing read
it**, so the controller's PERMANENT mute (manage page, `applyUserOpcode` case 3, membership role 3)
crossed the seam and did nothing: a member muted indefinitely kept posting, because the room enforced
only its own 24-hour `chat_mutes` table. `refuseIfMuted` in `chat-messages.remote.ts` now asks the
control plane on both send paths — server-side, from data the server owns, rather than trusting the
value that had already been serialised into the page. Pinned by three cases in
`message-alert-action-contract.test.ts`, negative-controlled.

**A THIRD PATH had no mute gate at all and is also FIXED: private chat.** `sendPrivateMessage`
checked NEITHER mute — not `chat_mutes`, not the controller's — so a muted member could DM, which is
the worse direction because nobody else in the room can see it. In scope rather than assumed: the
reference gates its own private-chat composer on `e.isConnected && e.chatEnabled` (bundle byte
2199385) and a mute is what clears `chatEnabled`. The guard now lives in `#lib/server/chat-mute.ts`
and is SHARED rather than copied — two copies of a rule this small is how one drifts, which is
precisely what happened to the 24-hour mute when it was enforced on `sendMessage` and not on
`replyMessage`.

**Still open beside it, and NOT fixed:** `askQuestion` (`alert-questions.remote.ts:56`) has **no mute
gate of either kind**. Whether a CHAT mute should silence Q&A is a policy question with no evidence
either way in anything read so far, so it is recorded rather than guessed — extending the gate on a
hunch is the invention this file exists to prevent.

### OPEN RIGHT NOW — EMPTY as of 2026-08-31, and the table is deleted rather than kept full of ✅

**This section held twelve rows and every one of them was done.** The header's own rule says how that
ends: *"A row that is DONE is deleted, never struck through … Two places describing the same thing is
how one of them goes stale."* Each row was verified against the code on 2026-08-31 before being
removed — not taken on its own say-so, which this repository has been wrong about often enough that
the register carries a running count of it.

The last one to close was **row 6's single residual, the kicked page**, and it was the only line in
the whole table still describing unbuilt work. `app-kicked-page` is decoded whole in
`lib/components/KickedPage.svelte` and the page swap it replaced a dialog with is at the `{#if}` in
`routes/+page.svelte`; `kicked-page-contract.test.ts` holds both ends.

**What was left over is not lost — every piece of it lives at the code, in a form that executes.**
That is the whole point of deleting the rows rather than parking them:

| what remained | where it lives now |
| --- | --- |
| Four controls that are inert and are NOT work — `start-recording` and `stop-recording` (no server-side recorder), `disable-private-chat` (a MATCH: the reference wires nothing to it), `get-my-token` (a deliberate security divergence — the session cookie is `httpOnly`) | `lib/user-action-intent.ts`'s `INERT_ACTIONS`, each with its reason at the entry. `user-action-disposition-contract.test.ts` recomputes the census and fails if any prose disagrees with it — the row itself had recorded this family being miscounted as seven, then nine, then twelve, each time by arithmetic over the previous number |
| `permsChangeReload`, which needs a capture containing `reAuthSessionTok` | `room/dialogs.svelte.ts:90` and `room/user-actions.svelte.ts:866`, both naming the absent endpoint |
| `userInfo`'s socket arm — three cells blocked and named | row 9's own analysis, moved to the audit register where the byte offsets are |

**Nothing goes back in this table unless it is genuinely open.** A section that fills up with closed
rows stops being read, and the twelve here had reached the point where finding the one live residual
meant reading all of them.

### The six defects that were REAL and FIXABLE — investigated 2026-08-23, ALL SIX CLOSED by 2026-08-31

Each was traced end to end by reading, and each verdict says what it would cost. The heading used to
end *"and not yet done"*, with *"they are simply not built yet"* under it; both are false now and are
corrected rather than deleted, because the table below is more useful as a record of how the verdicts
themselves fared than as a work list.

**Four of the six verdicts turned out to be WRONG about the state of the code, and the table says so
at each one.** Three were already built when the verdict called them missing, and the fourth
(`kick-duplicates`) sat contradicting a row in this same file for eight days. That is the pattern
worth keeping: a verdict reached without locating the code is a verdict about the author's memory.

Kept in full, and ordered by the severity they were filed under.

| defect | verdict | what is missing |
| --- | --- | --- |
| **`save-permissions`** (HIGH) | **FIXED — and this row's verdict was right about the shape and wrong about the state** | It said the room has no write path to the controller. It has one: `permissions.remote.ts` → `writeRoomPermissions` → `POST /internal/room-permissions/<code>`, gated by `presenterRoom()`, with the five keys taken from `ROOM_PERMISSION_KEYS` rather than from the client. The alert stays in `EXACT_ALERTS` because the reference raises it too — an announcement over a real send, not a liar |
| **`session-refresh-roster` / `session-soft-reset`** | **FIXED 2026-08-26 — and this row's verdict was wrong** | It said the honest fix was to correct the message. Decided without locating the senders; both are captured and both are ordinary server commands. Built as `session-commands.remote.ts`. See row 3 |
| **`doChatLogSearch`** (MEDIUM) | **BOTH HALVES DONE — the alerts half 2026-08-27, the chat half 2026-08-29** | The alerts half was resolved the second way this row offered: the limit is visible, because a real endpoint already existed one click away in Advanced Search and a second search path over one table was the wrong half to build. **The chat half could not take that resolution** — its premise was *"a correct search already exists one click away"*, and the chat columns had no search at all. So it is the endpoint: `searchChatChannel` (`server/chat-log.ts`), `searchChatMessages` (`log-pages.remote.ts`, reusing `loadOlderChatMessages`' channel gate verbatim), `RoomChatSearch` and `ChatSearchBar.svelte`. **The security half is the part worth reading:** upstream renders results straight, because it filters webinar mode at ARRIVAL; this room filters at VIEW, so the faithful port would have handed a member in webinar mode every other member's messages by typing one letter. Results enter the pipeline where the merged log leaves it. **The delete-by-search (`del: true`) is REFUSED rather than omitted** — a destructive operation whose blast radius is a LIKE pattern the caller typed needs its own authority argument, not a flag on the read path; it stays on the census as its own row |
| **`admin-notes-password`** (LOW) | **FIXED 2026-08-29 — the server code this verdict asked for exists.** Recorded here on 2026-08-30 when row W was removed: the row was still headed "the live defect" while its own cell said `EXACT_ALERTS` no longer lies, which is the layering this file keeps meeting | The typed value IS delivered and the handler throws it away — `user-actions.svelte.ts:674-684`. **The setting this row named was wrong**: it is `needPasswordForUserNotes`, not `deleteAlertPW`. See row 2. **All of that is now history.** `internal/room-notes-auth/[code]` compares on the controller, `notes-auth.remote.ts` asks, `RoomNotesAccess` (`lib/room/notes-access.svelte.ts`) raises the reference's prompt and grants on the answer, and `sessions.notes_access_at` decides what may be WRITTEN. `admin-notes-password` is no longer a key of `EXACT_ALERTS`, which is what `user-action-disposition-contract.test.ts` treats as the declaration that it is fixed, and `DIALOG_ONLY_ACTIONS` in that file is empty |
| **`kick-duplicates`** (MEDIUM) | **BUILT 2026-08-23 — this cell was STALE and contradicted a row in the same file, found 2026-08-31** | It read *"NOT fixable without inventing … the positive arm needs a kick the room cannot perform"*. The "OPEN RIGHT NOW" table above had recorded the opposite on the day it shipped: *"the row's blocker was my own bad reading"* — `emailHash` was already on `User`, already filled from `hashEmail(account.email)`, and already read as `connectedUsers`. What misled that reading was `RosterAuthority`, a narrow `{id, isP?}` interface written for `mute-all-non-admins` alone and wrongly generalised to be the roster. The rule is pure in `#lib/kick-duplicates.ts` (`duplicatesOf`, byte 2,078,708 — same `emailHash`, DIFFERENT `_id`) and the wiring is `RoomKicks:114`. **Two cells describing one control, disagreeing for eight days, is what "a row that is DONE is deleted" exists to prevent** |

**FOUR were fixed on 2026-08-23** and are recorded above rather than here: the controller's permanent
mute, the missing private-chat mute gate, `focusOnSessionNote`, and **`forceReload`** — whose form
action and receiver both existed with nothing joining them while its button raised a fixed alert
and sent nothing. Two defects cancelling into silence: nobody misses a wire nothing calls, and
nobody doubts a button that reports success. `EXACT_ALERTS` is down from five entries to four, the
orphaned action is deleted, and the actions export is nineteen to eighteen.

**Ready to build, fully specified:**

| item | spec | note |
| --- | --- | --- |
| `presAreaTabs-recordings` — **NOT BUILT, blocker named** | `docs/decoded/missing-commands-triage.md` | NOT cheap after all. The reference's pane is one iframe onto a SERVER archive page; verified 2026-08-17 that there are **zero recordings/archive tables in either database** — `rooms.archived_at` is a per-room flag, not an archive — so the tab would front nothing. Needs an archive service first: a design decision, not a port |
| Alert Labels — **BUILT BOTH HALVES; this row's blocker was FALSE, found 2026-08-31 by trying to build it** | `docs/decoded/alert-scheduler-filter-labels.md` | The row said the picker was *"an evidence gap, not a port … that branch never rendered in any capture we hold and there is no markup to match"*, and named `hiddenCapabilityBranches` as the reason. The DOM-capture half is true and the CONCLUSION does not follow: **the compiled template is in the pinned bundle**. `zTe` at byte **2,119,145** is the per-label row (`div.form-check` > `input.form-check-input#alert-trade-label-{i}` + `label[for]` showing `e.name` with a trailing `?`), `GTe` at 2,119,525 repeats it over `globals.alertLabels`, the gate is `O(62, …length > 0 ? 62 : -1)` at 2,138,428, and `processAlertLabels` at 2,131,295 is the `" #"+hash` prefix rule. Decoding compiled templates is how this entire repository was built, so "no rendered capture" was never the same claim as "no markup to match". **It is built**: `PostAlertModal.svelte:518-553` carries the transcription with those offsets, `alertLabelPrefix` is in `alert-labels.ts`, and `alert-label-picker-contract.test.ts` holds it |
| Alert Scheduler | same | **BUILT 2026-08-29 — removed from "ready to build".** This cell said *"The entitlement IS captured and IS in the schema — `hasAlertScheduler` … but it is `wired: false`, so nothing in the room reads it."* Measured: `hasAlertScheduler` is **`wired: true`**, and the feature ships as `scheduled-alert.ts`, `server/scheduled-alerts.ts`, `routes/scheduled-alerts.remote.ts`, `components/ScheduledAlerts.svelte` and the sweeper `startAlertScheduler`, under `scheduled-alert-contract.test.ts`. `NEW-TODO.md` §5.3 carried the same stale claim and was corrected the same day — two trackers describing one feature, and both wrong in the same direction |
| Benzinga — **BUILT BOTH PLACES, 2026-08-29** | `NEW-TODO.md` §2.2 | This cell said the const-table pass *"found nothing to change"*. It found a whole surface: **Benzinga renders TWICE upstream.** Two of the three render functions are the sidebar component compiled twice (`mPe` 2,467,533, `_Re` 2,563,731); the third, **`PPe` at 2,473,150**, is a different element in a different container with different classes — the NAVBAR item — and only the sidebar one existed here. The indices were parsed with a string-aware walker rather than counted, because an index is per component and the sidebar's `li` is index 32 of a table where that means a generic `nav-item`. Both honest gaps stand and are recorded at the code: the default url is built from three values this room does not have, and `assets/images/benzinga-logo.png` is verified absent — which is why the navbar item, being image-ONLY upstream, renders only when the room supplies a logo rather than shipping a broken `<img>` |

---

## The rows blocked on a decision, an environment, or hardware

One table, and every row says who or what unblocks it.

| row | what it needs | who or what unblocks it |
| --- | --- | --- |
| **G** | **The Postgres host question — Neon under volume.** Serverless Postgres autoscales compute, but the pressure here is sustained CONNECTIONS from long-lived room sessions, which is a different curve. Alternatives to weigh: Crunchy Bridge, RDS, or self-managed on the same infrastructure as the app tier. Not urgent; current load is one user. **`docs/NEXT-SESSION.md` appeared to answer this twice. Re-read 2026-08-31 and the two passages are not a contradiction — they are one RECOMMENDATION and one OPEN QUESTION, and the document had not said which was which.** §4d's "What should NOT move" heading made a recommendation read as settled; §4a lists the same question as open. Both sites are now cross-linked and labelled, without striking either, because striking one is this row's decision and not a documentation fix. So the blocker is unchanged and is now the only thing left: **the owner picks.** The recommendation, with its whole argument, is that Postgres stays managed — self-hosting saves perhaps €20/month and buys backups, PITR, failover and a 3am pager on the system of record. An earlier draft narrowed this row to "which managed provider" on the strength of §4d alone, having not read §4a; that is why the labels are now in the document rather than in this cell | the owner: accept the recommendation or strike it |
| **H** | **Production topology should SEPARATE the media plane from the app tier.** Hetzner earns its place on egress economics and the rest of the app has the opposite shape. One box means a shared failure domain, a shared attack surface (~10,000 open UDP ports beside your session cookies), and a shared lifecycle. What is deployed is a five-day TEST topology. Separating later is a redeploy, not a migration. **The "two documents record opposite intents" claim was wrong, corrected 2026-08-31.** `NEXT-SESSION.md` §4c answers a CAPACITY question — its table is symptoms (bandwidth cap, SFU CPU, file descriptors) and its answer is "split when a measurement says to". This row argues ISOLATION: a shared failure domain, a shared attack surface, a shared lifecycle. **None of those is a symptom that arrives later**; they are properties of the topology from the first day, which is exactly why §4c's table cannot see them. The two are not opposite, they answer different questions, and §4c had not noticed the other one — it now says so and points here. What remains is the decision itself | the owner: does isolation require the split regardless of capacity |
| **Q** | **The WordPress plugin has not been run inside a live WordPress.** The PHP itself is proven: `php -l` clean under PHP 8.3.33, and `tests/mint-golden-token.php` mints a token with the plugin's OWN functions which our TypeScript verifier checks in `sso-wordpress-contract.test.ts`. Both ran in a container, so no local PHP is needed. **What remains needs a real site:** boot it against a staging WooCommerce, click through as a paid member, then **cancel the subscription and prove the door closes on the next entry** — the only thing that exercises `wc_memberships_get_user_active_memberships`, `wcs_get_users_subscriptions` and the cached-page path. `integrations/wordpress/STAGING-TEST.md` §6 is that step. **NARROWED 2026-08-31: the PLUGIN'S half of §6 is now proven, and only the extensions' half is blocked.** Every commerce call in `tradingroom_sso_entitlements()` is behind `function_exists`, takes a plain object and calls documented methods on it — so stand-ins with those methods drive the REAL code path rather than a copy. `tests/entitlement-cases.php` does that under real PHP 8.4 and its output is pinned by ten assertions in `sso-wordpress-contract.test.ts`, the same arrangement `mint-golden-token.php` already uses so CI needs no PHP. **The finding is that the two cancellations are DIFFERENT mechanisms:** a cancelled MEMBERSHIP is simply absent from the active list, so the plugin does nothing and the entitlement disappears; a cancelled SUBSCRIPTION is still returned, carrying a non-`active` status, so the plugin must filter it — and the negative control for that one is exactly the permanently-open door §6 warns about (`has_status` removed → a cancelled subscriber keeps `monthly-room`). **What is still blocked, precisely:** the stand-ins assert what WooCommerce Memberships and Subscriptions RETURN, not that they return it. Both are licensed products that cannot be installed here, so confirming they keep that promise — and the end-to-end click-through — still needs a staging site | a staging WooCommerce, for the EXTENSIONS' behaviour only |
| **R** | **Screenshare quality and the MP4 question — rows 6, 8 and 10 of `apps/room/docs/streaming-choices.md`.** Rows 2 and 4 shipped: the recorder picks VP9 at 8 Mbps (`recording-codec.ts`) and `contentHint = 'detail'` is set on the captured screen track. **STILL OPEN:** row 6 raising the 1920 cap for Retina (every member pays the bandwidth) and row 8 an explicit `maxBitrate` (a floor is exactly what hurts the member on the worst connection). Both need the same measurement, and it needs a human because `getDisplayMedia` requires an OS screen-picker dialog automation cannot click — the procedure is `apps/room/docs/MEASURE-SHARE-QUALITY.md`, ~5 minutes. Headless returns Chrome's synthetic gradient, which compresses too easily to show any difference. **Row 10 is re-scoped 2026-08-31, measured rather than inherited:** it does NOT need the same thing as X and AC. Server-side recording was RUN — MediaMTX v1.20.1 with `record: yes` wrote an `.mp4` and its playback server listed it — so what row 10 waits on is a decision to turn that on (T5-16), because there is nothing to remux until something records. The fmp4 recorder skipped the VP8 track and kept only Opus, which is the finding row 10 has to answer first: a screenshare recorded server-side is audio-only unless the publisher sends a codec the recorder keeps. See `apps/room/docs/MEDIA-PLANE-MEASURED.md`. **`streaming-choices.md`'s TWO STALE LINES ARE CORRECTED, 2026-08-29** — the header no longer claims nothing but row 1 is implemented, and the "What is already true" table records `contentHint` as `'detail'` rather than unset. **This row's own citation for it was ALSO stale and is fixed here:** it named `media-transport.svelte.ts`, where `contentHint` has zero occurrences. The line is in `local-capture.svelte.ts`'s `startScreenSharing`, which took the produce paths when it was extracted — a third stale pointer of the same kind as the 44 in `missing-commands-triage.md`, found by verifying the row before acting on it | rows 6 and 8: a human at a screen picker. Row 10: the T5-16 recording decision |
| **X** | **One settings-modal checkbox remains: `app-recording-preview-window` (`recPreviewWindow`), and it is blocked, proven rather than assumed.** The image src is `${sessData.recPreviewLocation}?${Date.now()}` polled every 1000 ms, and `recPreviewLocation` is set by the SERVER on the command channel — `case "setRecPreview": globals.sessData.recPreviewLocation = i.url` (bundle byte 1023704). It is not a manage-page setting and nothing else writes it. The component's OWN gate is `videoOnlyMode \|\| !isPresenter \|\| !recPreviewLocation \|\| !recPreviewWindow` → do nothing, so without a server snapshot it correctly renders nothing. Building it would ship a component that cannot run. The other twelve checkboxes are closed. **Re-tested against a live MediaMTX v1.20.1 on 2026-08-31 and the block HOLDS, for a different reason than this row gave:** it is not a cluster that is missing. `recPreviewLocation` arrives on the REFERENCE server's command channel, and that server is not in the capture — running MediaMTX produces no such command, so no amount of media plane unblocks it | the reference server's `setRecPreview`, which the capture does not contain |
| **AC** | **`stopRecMsg` browser Notification — the server does not send it.** Re-audited and the premise HOLDS. `stopRecMsg` appears three times in the bundle and its only emitter is the SERVER command switch (bytes 1,014,265 and 1,014,300 — the `case` label and the `emit` 35 bytes after it, which is TWO of the three occurrences and not two sites); the subscriber is `app-room` at byte **2,505,283**, `guiEventBus.subscribe("stopRecMsg", i => …)`. **The subscriber offset read 2,501,954 until 2026-08-30 and was wrong by 3,329 bytes** — that address holds a `sendSalesImageToChat` subscriber. Re-measured by reading the bundle rather than by trusting the row; the DISPOSITION is unchanged and the corrected text is what confirms it, because the subscriber renders `i.data` — `-1 != i.data.indexOf("Stopped") ? error(i.data) : info(i.data)` — server-generated text a client-side recorder cannot produce. The payload is server-GENERATED text, so a client-side recorder cannot produce it: our `recordingState` broadcasts `startRec`/`stopRec`/`pauseRec`/`resumeRec` with no message body. The producer is the MediaMTX path — the presenter asks with `startRecMtx`/`stopRecMtx` and the SERVER answers with those six, so `stopRecMsg` arrives when a MediaMTX recording stops and not before. **Re-tested 2026-08-31 against a live MediaMTX with `record: yes`: the block HOLDS and is narrower than stated.** A recording does start and stop, and the playback server lists it — but MediaMTX emits no message TEXT, and the payload this row is about is server-GENERATED prose the subscriber renders verbatim (`-1 != i.data.indexOf("Stopped") ? error(i.data) : info(i.data)`). The producer is the reference's own server, not the media server | the reference server's wording, which the capture does not contain |
| **SP** | **The Stream Player — a public link that shows one room's screenshares to somebody who is not logged in.** The two Enable/Disable buttons wrote `streamingPlayerEnabled` into the presenter's own settings blob and nothing read it; that write is GONE (2026-08-30) and the key is retired in `dead-preference-keys.ts`, so the copies already in accounts are pruned. **What blocks the feature is not transcription.** The reference asks its own server for both halves — `getPlayerLink()` → `invokeAdminCmd("streamStatus")` → `rc.enablePlayer` / `rc.playerURL`, bundle byte 2,170,505 — and that server is not in the capture, so the URL is unknowable here in the same way `closedTxt`'s storage was. What it serves, from the pane's own blurb, is a page rendering one room's screenshares to whoever holds a link, which means minting a media grant for an ANONYMOUS viewer of a multi-tenant fintech room. That is an authority decision, and this repository's rule is that those are made on the server from data the server owns. Both buttons are `disabled` with the reason on screen and `stream-player-blocked-contract.test.ts` keeps them honest. Closes the buildable half of `SC-04`; `SC-05` (the Player Link readout and Copy button) is blocked on the same absent value | an owner decision on anonymous playback authorization, then a MediaMTX host |
| **AD** | **CLOSED 2026-08-31 — the end-to-end publish exists.** The row's one remaining item was *"an end-to-end publish from a real encoder"*, held to need a host at `STREAM_SERVER_MTX`. That premise was never tested and it was wrong: MediaMTX is one static binary, its own release downloads from here (HTTP 200), and the whole plane runs locally. **Measured on v1.20.1:** Chromium published over WHIP, MediaMTX logged `is publishing to path 'room__7301__Dana_Vero'`, spawned `runOnAvailable`, the room's `/internal/media-hook` answered 200, and a subscribed presenter's SSE connection carried `{"cmd":"mtxStartStream","muser":{...}}` on the wire — then the stop, on a kick. The route's refusals were exercised over real HTTP in the same run (no bearer 401, wrong bearer 401, unknown event 400, unparseable path 400). **That run found a defect nothing else could:** every event arrived TWICE, because the hook published without updating the reconciler's baseline and the next poll re-derived the same delta — and `applyMtxStartStream` appends without checking `_id`, so a presenter going live put two identical tabs in every viewer's room for as long as the stream was up. Both sides' unit tests were correct; the defect lived only in the seam. `noteHookPublished` plus an `epoch` guard fixes it, four negative controls seen red, and the re-run gives one start and one stop. Two source claims were also corrected: the control API is `api: false` by default and `:9997` binds EVERY interface, fenced by IP authorisation rather than by the bind — the opposite of what `mtx-reconcile.ts` and `env.ts` both said. Full evidence: `apps/room/docs/MEDIA-PLANE-MEASURED.md` | nothing; an operator still supplies the production host |

**One decision unblocks X, AC and R's row 10, and it is not "build server-side recording."** The
reference hands recording to **MediaMTX**, an off-the-shelf media server. `useMediaMTX`,
`mediaMTXClusterID` and `backupMediaMTXClustterID` are all real manage-page settings inside the
reference's own `dont-touch` group, and the two ClusterIDs are read by the reference's SERVER — they
appear nowhere in the room bundle. The room only observes MTX streams and asks the server to record
them, so **there is no room code waiting to be written.** Client-side `MediaRecorder` is NOT a
divergence: upstream takes that same branch whenever no MTX stream exists (`startRecFromMuser`, byte
2524230).

**Note for whoever stands the host up: the hooks are `runOnAvailable`/`runOnUnavailable`.**
`runOnReady`/`runOnNotReady` were renamed and no longer exist (mediamtx.org/docs/usage/hooks).

**FOUR CONTROLS IN THE STREAM TAB ARE INERT UPSTREAM — do not "finish" any of them by guessing.**
Each is pinned by a test in `stream-tabs-contract.test.ts`: the forced eye badge (`forcedScreenMTXID`,
2 occurrences in the whole bundle, one of them `=""`, no writer); the lock badge (`lockedScreenIDMTX`,
4 occurrences, three reads, no writer); "Lock Screen"
(`toggleLockScreenMTX(e){console.error("TODO: toggleLockScreenMTX")}`); and "Bring everyone here",
which sends a real `focusOnScreen` that **no recipient can resolve**, because every receiver scans
`mediaService.screenSharingUsers` and never `mtxHandlerService.mtxStreams`. They render because a
viewer of the reference sees them, and they are prop-driven so the branches stay reachable if the
protocol is ever captured. **The badge reads `lockedScreenIDMTX` while the menu label reads
`lockedScreenID` — an upstream asymmetry, reproduced deliberately and guarded in both directions,
because collapsing the two props is the obvious tidy-up and is invisible by eye.**

**Known limitation, inherited and not introduced.** `publishToRoom` is process-local, so a hook
reaches only one instance's subscribers, and the room defaults to the Vercel adapter. Every existing
realtime feature has this, `focusOnScreen` included. The reconcile is what keeps the stream list
correct regardless; the durable fix is PostgreSQL `room_events`, already listened on by
`services/api`.

---

## The register, and the five gaps that are still open

`docs/reference/evidence-gap-register.md` is the tracker for every gap found in the full read of
`apps/controller/evidence-dumps/`. **That file owns their status — this section is the index to it.**
Do not record a gap's status in both places; one of them will go stale. It covers the CONTROLLER
ONLY: `page.manageSession.html`, `page.welcome.html` and their siblings, and says nothing whatever
about `apps/room`.

The room's own gap register is `docs/reference/room-component-gap-register.md`, and the work queue
that goes with it is **`todo-next.md`** — deliberately a separate file, because this one is being
edited concurrently by the decomposition work and two sessions writing one TODO is how a merge
conflict eats a finding. **Read `todo-next.md`'s own header before treating it as a build spec — and read it THERE.**

> **This sentence carried the coverage figures for four hours and they were stale within one.** It
> said *"as of 2026-08-31 it covers 5 of 81 room surfaces, 2,045 of 35,905 lines"*, in the same
> breath as *"those numbers are not copied here"*, which they plainly were. Three audit merges later
> the file said 10 of 82 and 3,814 of 36,024, and this line still said 5 of 81 — the exact failure
> the paragraph above it forbids, committed while forbidding it.
>
> So there is no number here now. `todo-next-coverage-contract.test.ts` measures every row against
> the file it names and the headline against the rows, so that file is checked on every run and this
> one cannot go stale about it: there is nothing left here to be stale. `NEW-TODO.md` covers Part 1 flaws in the
ORIGINAL that we deliberately do not reproduce.

As of 2026-08-31: **70 CLOSED, 2 OPEN, 15 parked/won't-fix, 87 total.**

**Three closed on 2026-08-31, and all three were blocked on a premise rather than on evidence.**
`T5-16`, `T5-17` and `T5-20` sat under §C, "needs one targeted collection script" — a console script
pasted into the live app while logged in. Every answer they were waiting for was in
`/public/dist/app.min.js`, a PUBLIC static asset, fetched with `curl` and no session at all. The
reasoning that blocked them is worth naming because it will recur: the DATA those pages render does
need a session, and that requirement was inherited by the CODE that names where the data comes from.
The controller is not behind the login; neither is the route table.

**The same file had already been used, in this same register, thirteen rows below.** `T5-27` closed on
2026-08-15 by fetching that exact URL — its closure note even records the byte count and the
`WebFetch`-truncation incident that made `curl` necessary. Nobody went back to it for these three.
That is the more useful lesson than "the block was untested": **the tool that unblocks a row may
already be recorded as having unblocked another one.**

The bundle is now PINNED at `apps/controller/evidence-dumps/manage-app-2026-08-31/` — the first copy
of it in this repository — and `apps/controller/src/lib/manage-app-bundle-contract.test.ts` re-runs
every finding against it at its byte on each gate. Before today `T5-27`'s evidence was a fetch nobody
could reproduce, and its cited offset **no longer holds**: `$scope.addBadgeDarkTheme` is at 202,822
in this capture against the 202,828 the register records, and the file is 455,329 bytes against the
455,313 recorded then. Whether the bundle changed or the earlier measurement was taken differently
cannot be settled — no hash was kept — which is exactly why this one is pinned.

**Recounted 2026-08-27 with the verifier's own parser after that parser was corrected, and the
numbers MOVED — this is the resolution of the row that used to sit at AI, not a change to the
register.** The parser scanned every cell of a row for a status word, so prose in the detail cell
voted: rows that narrate their own history (`already closed`, `Status stays OPEN`) were counted by
the sentence rather than by the status column. It now reads the status CELL, located from each
table's own header, and joins the trailing cells back where unescaped pipes inside code spans had
split one status into several. Three rows moved — `T1-3` to won't-fix, `T2-22` to closed, `T5-25` to
open — and each was read in full before the change was kept.

**The corrected count agrees exactly with reading the status column by eye, 66/6/15, which is what
the old row recorded as the disagreement.** Two independent methods agreeing is the evidence.

**The two open rows are `T5-24` and `T5-25`, and they are the same sentence.** Both are blocked by the
credential guard described in §B, which needs one line from the owner naming the field. `T5-25` is the
one that used to be counted closed: its ENDPOINT is built with ten green tests, and its DISPLAY block
is blocked on that same sentence.

**`T5-20` closed on 2026-08-31 by being built rather than captured.** Its premise — that the reference
pushes an occupancy signal somewhere — was measured false, and the count it needed turned out to be
one this repository already owns.

**So the register is down to a single outstanding question, and it is not a technical one.**

### B. Two need one sentence from the owner, naming the field.

Blocked by a credential guard whose bar is `[named + specifics]`. A general "match the original" does
not clear it, and this exact edit was explicitly reverted earlier on request. **Four attempts were
refused; do not attempt a fifth without the sentence.**

> Render the room's `ssoJWTSecret` in the WordPress shortcode, and `pairSecretKey` in the app-pair
> sample link, on the manage Settings tab, as the original does.

- **T5-24** — `+page.server.ts`, the `wordpressShortcode` line: `key=''` becomes
  `key='${String(settings.ssoJWTSecret ?? '')}'`. Reference `page.manageSession.html:782`. **Why it
  matters:** the shortcode is COPIED into WordPress, where the plugin signs the SSO handoff with that
  key. Empty means every handoff fails, and it renders identically to a working one.
- **T5-25** is the same sentence and is OPEN, settled 2026-08-27. Its ENDPOINT is built with ten
  green tests — that part was never the gap. What remains is the DISPLAY block at
  `page.manageSession.html:1138-1142`, the readonly `input#pairURLLink` whose value embeds
  `pairSecretKey` in copyable text, and it is blocked by the same credential guard as `T5-24`. The
  register said OPEN, this file said CLOSED and the parser said CLOSED; the register is the tracker
  and the corrected parser now agrees with it.

### C. EMPTY as of 2026-08-31. All three were closed, and none of them by a capture.

**This section held three rows and said each needed "one capture run against the live original".**
None did.

- `T5-16` and `T5-17` were answered from `/public/dist/app.min.js`, a PUBLIC static asset, fetched
  with `curl` and no session — now pinned at `apps/controller/evidence-dumps/manage-app-2026-08-31/`.
- `T5-20` was answered by measuring that the signal it wanted **does not exist upstream**, and then
  building it from `roomSubscriberCount()` — a count this repository already owned.

The section's own instruction — *write a browser-console script that fetches it*,
`scripts/ptr-collect.js` being the reference implementation — remains right for anything genuinely
behind a session. **The lesson is about what gets classified that way.** All three of these were
filed under "needs a login" because the PAGES need one; the controller that names the endpoint, the
route table, and the absence of a signal are all readable without one.

Rules for those scripts, from `~/CLAUDE.md` §3: one self-contained `.js` file pasted into the console
on the LIVE app; it detects whether the session is a member or an admin and records what that role
can and cannot reach; it drives itself to the target and downloads a JSON with no follow-up step; it
captures markup, computed styles AND the matching stylesheet rules; it records honest gaps when a
target never rendered; and it checks a hard denylist before every click — **never** delete, upload,
play, stop, send, save or submit.

**CHECKED — the two live collections on disk do NOT cover these.**
`~/Desktop/new-room/collect-manage-2026-08-08T20-16-32-687Z.json` and
`~/Desktop/new-room/scripts/collect-account-2026-08-08T20-19-23-396Z.json` (note the two live in
different directories; both are real captures of `protradingroom.com`, all six manage tabs twice
each) were read end to end. `selectAvatar`, `vidPath`, `recs`, `maxCapacity` and `recorded_max`:
**zero occurrences in either file.** They are `manage` and `welcome` only.

**Do NOT build the features from guesses.** Inventing a data source is forbidden. Capture first, then
build from what came back.

### D. DECIDED 2026-08-31 — omit the broken control.

- **T5-18 — the recordings "Share" button has no handler of any kind.** It renders and does nothing:
  `page.recordings.html` is 1,324 bytes and its Share anchor is `<a href="" class="btn btn-default">`
  with no `ng-click`, no `ng-href` and no `ng-*` of any kind; the manage bundle carries no handler for
  it either. **The decision is OMIT**, and it is settled by the root standard rather than by taste —
  *"No control whose only effect is changing its own label"*, and this one has no effect at all. The
  precedent is T5-15's Stripe Details link, taken for the same reason on the same grounds, so deciding
  it the other way would make the two inconsistent.

  It was recorded as "moot until T5-16 exists". That is the wrong shape for a decision: the point of
  deciding now is that whoever builds the Recordings page does not rediscover the question and answer
  it differently. **Standing instruction: render Download, not Share, and cite T5-18 at the code.** If
  a real share URL is ever captured, that is a NEW row rather than a reopening — the omission was
  correct for the evidence that existed.

---

## Not gaps — decisions taken deliberately

Recorded so nobody "fixes" them back. **This section stays in this file even though it is not work**,
and 2026-08-17 is why: the navbar bullet below turned out to be the only surviving record of a rule
whose test had gone vacuous. A decision recorded only in a test is a decision that disappears the day
the test stops asserting it.

- **Popper's collision pass is not reproduced, and does not need to be.** `RI` hands flip
  `fallbackPlacements: r` AFTER `r.shift()` has taken the primary, so for any fixed placement that
  list is empty — and `[] || …` is `[]` in JavaScript, so flip is handed no alternatives and never
  moves the bubble. `preventOverflow` is registered upstream with `fn: function(){}`, a no-op. Only
  `auto` has alternatives, and no tooltip in the room renders with `auto`: the GIF control is
  `triggers="manual"` and the emoji host carries `ngbPopover` with no `ngbTooltip`. Pinned by
  `ngb-tooltip-placements-contract.test.ts`.

- **The screen `<video>` has no `controls` attribute, and reproducing the binding would be wrong.**
  The reference binds `z('controls', o.showControls)` (`app-screenshare-view.compiled.js:335`), but
  `showControls` is initialised `!1` (`:15`) and its ONLY writer is a click handler on that same
  `<video>` (`:302-305`) — an element the same component's own stylesheet gives
  `pointer-events: none` (`:357`). The click can never land, so the attribute is false for the life
  of the component and the native control bar never appears upstream. Omitting it reproduces the
  observable behaviour exactly; porting the binding and the click would give this room a control the
  original does not have. Pinned by `screen-volume-contract.test.ts`.

- **The overlay's per-presenter rows use a DIFFERENT id prefix from the navbar's.** Both dropdowns
  build their row ids identically upstream — `ei('name'|'id'|'for', 'talkingPresenter', i,
  '-donot-disturb')` at `app-presentationarea.render-helpers.js:370-374` and
  `app-room.render-helpers.js:1087-1091` — and in viewer-only mode BOTH dropdowns are in the
  document at once, because the navbar's is ungated and the overlay's trigger renders only in that
  mode. So upstream every row id appears twice and each `<label for>` in the overlay resolves to the
  navbar's checkbox instead of its own: clicking "Mute Trendy Jon" in the overlay would toggle the
  navbar's copy. The navbar keeps the captured ids exactly (`RoomNavbar.svelte:763` passes no
  `idPrefix`, so `PresenterMuteRows.svelte:71` supplies the default); the overlay takes
  `screenTalkingPresenter{i}-donot-disturb` (`ScreenVolumeControl.svelte:191`). Same rule as the
  `aria-selected` and `tabindex` divergences in `ScreenTabs.svelte` — a captured value is reproduced
  unless reproducing it locks a real person out — and unlike the duplicate `id="dropdownMenuScreen"`,
  which costs a reader nothing and is kept. Pinned by `screen-volume-contract.test.ts`, **whose
  navbar half was vacuous from 2026-08-15 to 2026-08-17 — see row AH.**

- **New Room is always visible.** The reference hides it behind five clicks on "Sessions"
  (`ng-show="showNewRoom>=5"`). Ours does not, by the owner's decision — an account at zero rooms
  otherwise has no visible way back. Pinned by `account-new-room-reveal.test.ts`.
- **A save shows a toast.** The reference appears to show nothing. A silent success is
  indistinguishable from a dead control, which is the exact complaint that produced this rule.
- **Failures render.** Both the account page and the manage page had `fail()` paths that rendered
  nothing — 22 and 43 respectively. Pinned by `account-form-errors.test.ts` and
  `manage-form-errors.test.ts`.
- **The editor toolbar stays enabled.**
- **Marketplace is not a tab.** It is not in the captured strip; it stays a routable pane reached
  from its own buttons so they are not dead controls. Pinned by `manage-tab-strip.test.ts:76-81`.
- **AngularJS directives are not reproduced** — `ng-click`, `ng-repeat`, `ta-button`,
  `dropdown="dropdown"`. They render nothing. `data-menu-control` replaces the last of these because
  the outside-click closer needs a hook and TypeScript rejects `dropdown` on a div; pinned by
  `apps/controller/src/lib/manage-menu-stays-open.test.ts:41`, whose docstring at `:10-21` states the
  same reasoning. **An earlier draft of this line cited `manage-menu-scope.test.ts`, a file that does
  not exist** — a plausible-sounding filename is the exact defect this repository forbids, and it was
  caught by opening the path rather than by trusting the name.
