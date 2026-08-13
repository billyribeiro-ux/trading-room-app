# TODO — the repository index

This is the root index. Anything recorded per-app stays where it is; this file points at it, so
there is one place to look rather than four.

**The project rule this file exists for:** when something cannot be found in the evidence, it gets
(1) said plainly in the reply, (2) written here under **Evidence gaps** with what is missing, every
file already read looking for it, and what it blocks, and (3) given a browser-console script that
will fetch it. A gap recorded in only one app's document is a gap the next person does not see.

---

## Where things are written down

| document                                                | covers                                                                                                                                                                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/NEXT-SESSION.md`                                  | verified state, the room-hosting decision, backend + egress arithmetic, what the original actually runs on, hostname/DNS plan, consolidation, ordered next actions, audit method, traps                                                     |
| `docs/DEPLOYMENT.md`                                    | **what runs where** — the Hetzner box, the services on it, the secrets, and how to ship a new build                                                                                                                                         |
| `docs/SFU-MIGRATION.md`                                 | how the media service moved to Hetzner — **done 2026-08-09**; kept as the record and as the operational contract for that box                                                                                                               |
| `docs/RETIRE-AWS-SFU.md`                                | **the old AWS SFU, retired 2026-08-10** — what it was, every command run, and why the "EC2, not Lightsail" identification was wrong                                                                                                         |
| `docs/EMAIL.md`                                         | transactional sending vs mailbox hosting, what is built, the DNS records, and the verification trap                                                                                                                                         |
| `docs/MOBILE-APP.md`                                    | the phone/tablet app — decoded server surface, proposed endpoint contract, security constraints, the white-label question                                                                                                                   |
| `apps/controller/docs/OUTSTANDING.md`                   | the controller's own gap register, §1–§7                                                                                                                                                                                                    |
| `apps/controller/docs/MEDIASOUP-DEPLOYMENT-PLAN.md`     | the SFU deployment ladder — **Stage 2+ superseded**, see `NEXT-SESSION.md` §4c                                                                                                                                                              |
| `apps/controller/docs/decisions/`                       | ADRs. 0003 is the one that matters for topology                                                                                                                                                                                             |
| `apps/room/TODO.md`                                     | the room's own list                                                                                                                                                                                                                         |
| `apps/controller/evidence-bootstrap-3.3.7.css`          | **the styling authority for the account, manage and login pages.** Pulled from `new-room-control/css-modals` 2026-08-11, SHA-256 pinned by `manage-panel-bootstrap3-contract.test.ts`. See the note below on the two Bootstrap generations. |
| `apps/room/evidence-tooltips-presenter-2026-08-11.json` | the RENDERED tooltip, captured from the live original. `ngb-tooltip.test.ts` reads its expectations out of this file                                                                                                                        |

---

## The product runs TWO Bootstrap generations, on two surfaces

Established 2026-08-11 from `new-room-control/css-modals`, and never written down before. Getting
this wrong is how a "fix" gets applied to the wrong surface, so it belongs at the top of this file
rather than inside a row.

| surface                                              | generation          | how it is PROVEN                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The room** (`chat.protradingroom.com`, Angular 2+) | **Bootstrap 5**     | the live tooltip renders `class="tooltip fade show bs-tooltip-start"` with `data-popper-placement` — a spelling only Bootstrap 5 emits (`apps/room/evidence-tooltips-presenter-2026-08-11.json`); its modal captures carry `modal fade show` and `aria-modal`, and **zero** `modal fade in`   |
| **Account / manage / login** (AngularJS)             | **Bootstrap 3.3.7** | `div class="panel panel-default"` appears six times across `evidence-dumps/login-page/{login,logged-in-page,manage,complimentary}`, beside `ng-show`/`ng-hide`. `.panel` is a Bootstrap **3** component — 4 replaced it with `.card`, 5 dropped it entirely — so that markup cannot be either |

**Confirmed again 2026-08-12, by RENDERED tooltips from both surfaces.** The manage page renders
`<div class="tooltip bottom … fade … in" tooltip-popup="" content="Account Settings"
placement="bottom" is-open="isOpen">` — Bootstrap 3's `.tooltip.<direction>` + `.in`, driven by
AngularJS UI Bootstrap's `tooltip="…"`/`tooltip-placement="…"` directives, inserted as a sibling
inside the host's `<li>`. The room renders `<ngb-tooltip-window class="tooltip fade show
bs-tooltip-start" data-popper-placement="left">` — Bootstrap 5 via ng-bootstrap. Two surfaces, two
tooltip systems, neither sharing a class name with the other. Captured in
`apps/controller/evidence-tooltips-manage-2026-08-12.json` and
`apps/room/evidence-tooltips-presenter-2026-08-11.json`.

`new-room-control/css-modals` is the source for the SECOND surface: the Bootstrap 3.3.7 LESS tree,
the compiled `bootstrap.css` (now pinned here as `apps/controller/evidence-bootstrap-3.3.7.css`),
and a `styes.css` whose header reads **"Naut - Bootstrap Admin Theme + AngularJS"** — the theme the
AngularJS half of the product was built on.

**It changes nothing about the room, and that is a finding rather than a disappointment.** Bootstrap
3 spells tooltips `.tooltip.left` + `.in` with arrows drawn from `width:0;height:0` borders; there
are **zero** such rules in our applied sheet or in the reference's own `styles.d622cb9ed2bbc221.css`.
Bootstrap 3 is not in the room's cascade at all.

**What it did do is verify work already done.** Every `.panel*` value in `apps/controller/src/manage.css`
matches Bootstrap 3.3.7 exactly — `margin-bottom: 20px`, `border-radius: 4px`,
`padding: 10px 15px`, `#ddd`, `#333333`, `#f5f5f5` — and that file was transcribed from a RENDER,
because no rect dump for the manage page existed. Two independent derivations agreeing to the byte
is the strongest form this evidence takes. `account.css`'s note that "the 15px inset belongs to the
HEADINGS", derived from `439.5 - 424.5` measured in a capture, is `.panel-heading { padding: 10px 15px }`
upstream. Nothing was edited to make any of it agree; `manage-panel-bootstrap3-contract.test.ts`
exists so it cannot silently stop agreeing, and a 1px drift fails it.

**Use it as the authority for gaps 1, 2, 3, 5, 8, 9, 10 and 11, and for item S** — every one of
those is on the AngularJS surface, and their styling questions now have a source instead of a
sampled computed style.

## The full gate is GREEN (2026-08-13) — all six red steps fixed

`pnpm --filter controller test` exits 0. **742 Vitest tests across 67 files**, plus every source,
evidence, privacy, font, breakpoint and runtime-HTTP contract.

It had SIX failing steps, all pre-existing (proven by stashing every change and re-running at
`HEAD`). The chain short-circuits at the first failure, so they surfaced one at a time as each was
fixed — five known failures became six before it became zero.

| step | root cause |
|---|---|
| `home:contract` | SvelteKit 3 migration (`ff948db`) changed `resolve()`/`asset()` shapes; verifier kept the old spellings |
| `room-login:contract` | the same `asset()` leading-slash expectation |
| `account:contract` | route moved to `rooms/[id]/[[tab]]/` (died ENOENT before asserting anything); a lazy `[\s\S]*?` crossed an action boundary; a regex matched markup quoted inside a CODE COMMENT |
| `fonts:verify` | workspace files read from the package root; `pnpm` pin 11.18.0 vs 11.21.0; `better-sqlite3: false` asserted when it has been `true` since the first commit |
| `privacy:verify` | 10 violations — see the table below |
| `runtime:http` | asserted the ORIGINAL contact-page sentence; the page was rebuilt twice since and now keys off `controlPlaneMode`, not a launch phase |
| `test:counts` | 715 documented vs 742 actual, after this session added 27 tests |

**Not one was a defect in shipped behaviour.** Every failure was a contract describing a shape the
code no longer used — which is the strongest argument for keeping the gate green: while it was red,
nobody could read a green result, and that is exactly how two genuinely RED unit tests survived
unnoticed until 2026-08-13.

### `privacy:verify` — all 10 cleared, each on its own evidence

| # | what | resolution |
|---|---|---|
| 3 | `(public)/{contact,privacy,terms}` raw email | `support@tradingroom.app` is the product's OWN published role address (`BRAND = 'tradingroom.app'`, `content/home.ts:15`). Allowlisted as a single ROLE ADDRESS, not a domain — a domain allowance would let a personal address on our own domain through. |
| 2 | fixture emails on `x.com`, a live domain | → reserved domain. One sits inside a transcript of a real psql run, so the substitution is ANNOTATED. |
| 4 | captured owner display name | → the suite's neutral `Ada Lovelace`. One site was `'Ada Lovelace'.replace('Ada Lovelace', '<name>')` — a no-op dance that existed only to smuggle the name past this check. |
| 1 | raw Gravatar identifier | → `[GRAVATAR_MD5_A]`. It was a real member's MD5, present only to illustrate a URL shape — the one thing that module's own docblock says not to do. |

---

---

## Evidence gaps — the index

Full write-ups live in the documents linked. Nothing below has been filled in with a plausible
value; each is a thing that was looked for and not found.

**This file lists only what is still OPEN.** Closed items are not struck through here any more —
they are removed, and their history lives in `CHANGELOG.md`, dated and timed, with the commit that
closed each one. Two places recording the same thing is how one of them goes stale, and a list that
is mostly strikethrough is a list nobody reads to the bottom of.

### THE REGISTER: `docs/reference/evidence-gap-register.md`

Every gap from the full read of `apps/controller/evidence-dumps/` now lives there with a status, in
five tiers. **That file is the tracker — this section is only the index to it.** Do not record a
gap's status in both places; one of them will go stale.

As of 2026-08-13 14:05 EDT: **36 CLOSED, 26 OPEN, 14 parked/won't-fix, 76 total.**

Four closed by reading `page.manageSession.html:634-780` — **T2-11** (the JWT rows live in the
SETTINGS tab, not their own), **T2-14** (the SSO tab is exactly one row, SSO Host), **T2-19** (the
textAngular editor and its in-heading Save button), **T5-12** (the stats striping counts hidden
rows — confirmed as the reference's own behaviour, recorded not corrected).

One opened, and it needs YOUR decision: **T5-22 — the User Stats table.** The reference renders one
row per ARRIVAL with IP, browser and duration. Ours renders one row per PERSON. We hold the data in
`roomSessions`, but it was deliberately removed from this payload after two privacy reviews (item
W). Putting it back partially reverses that, so it is not mine to do silently.

Two more opened while reading `page.manageSession.html:1-340`, and both come out of a REAL BUG that
reading found:

- **T5-20 — nothing writes `recorded_max_capacity`.** The column and the reader exist; the writer
  needs live occupancy, which only the room service knows. Not faked with the roster size.
- **T5-21 — "Batch User Invite" is not built.** The menu item, icon, position and gate are all
  captured; the prompt it opens is not. The collector now reads `doBatchInvite` off the scope.

The total GREW again, and for the same reason it grew before: reading templates end to end keeps
surfacing things no capture ever rendered. Four small `views/` templates were read whole today —
`page.stats.html`, `users.html`, `page.recordings.html`, `page.avatars.html`, 181 lines — and they
opened four gaps, two of which are whole PAGES neither of our apps has:

- **T5-16 — the Recordings page.** Not in `apps/controller`, not in `apps/room`. Checked both.
- **T5-17 — the Avatars page.** Same.
- **T5-18 — a DEAD CONTROL in the reference**: the recordings "Share" button has no handler of any
  kind. Needs a decision, because this repository forbids shipping one.
- **T5-19 — the stats period `<select>`** has no `ng-model` and all four options carry
  `value="hourly"`. Recorded so nobody "fixes" it.

Neither page is built. `recs` and `avatars` come from controller endpoints this repository holds no
contract for, and inventing a data source to make a page render is exactly what the evidence rules
forbid. The full write-up is PART 4 of `docs/reference/evidence-dumps-full-read.md`.

Closed since the last count: **T5-6** (`btn-small` on APPROVE is inert — proven absent from all three
stylesheets, and pinned so nobody "corrects" it to `btn-sm` and shrinks the button) and **T5-14**
(`mobilePairCode` on the user row — the entry was stale when it was written; it was already rendered).

The total GREW from 56 to 68 because reading the uncompiled templates keeps surfacing features no
DOM capture ever rendered — a new **Tier 5**. Three need a decision from the owner, not more
reading:

- **T5-9 — the API secret is rendered in plain text** in the account-page table, and the documented
  API auth also puts `apiSecret` in the URL query string. Two inherited exposure paths.

T5-1 and T5-3 were on this list and are now closed. The Stripe/marketplace block was ruled in scope
and is built (2026-08-13), rendering through `$lib/money` rather than the reference's formatter —
which divides by 100 unconditionally and so shows every zero-decimal currency a hundredfold low.

**One genuinely missing thing came out of building it — T5-15.** The reference's Stripe block ends
with a "Details" link whose handler is `openStripeDetails(user)`. That handler is in no capture, not
in `views/page.manageSession.html`, and not among the handlers transcribed out of `app.min.js`. The
link is deliberately NOT rendered and its absence is asserted by a test so it cannot be closed by
accident.

**The script to close it is written and smoke-tested:** `apps/controller/scripts/collect-stripe-details.js`.
Paste it into the Chrome console on the live manage page and it downloads the JSON by itself. It does
NOT need a marketplace member and does NOT click anything — the manage page is AngularJS with debug
info enabled, so it reads `String(scope.openStripeDetails)` off the scope chain and then fetches
whatever template that source names. Everything else it does is corroboration.

Reading source also proved a gap can close as **dead markup**: the cloned-room indicator is an empty
span in the SOURCE, so there was never anything to find (T2-9).

- **Tier 0 (7) — all CLOSED.** Local work, no capture. The four "codepoints unreadable" gaps were
  not really gaps: 951 codepoints decoded straight out of the sheets' own bytes. And `sheet-2.css`
  is proven to be stock **Bootstrap 3.3.7 with zero customisation** — which also retired the
  `.eot`/`.svg` `@font-face` question and the whole prefix/precision cluster as Chrome
  re-serialisation artifacts.
- **Tier 1 (7 closed, 2 open) — RUN 2026-08-13.** Artifacts in
  `apps/controller/evidence-dumps/TIER1-fetched/`. `app.min.js` turned out to contain NO templates;
  AngularJS loads 42 `.html` partials by `templateUrl`, and fetching those gave the uncompiled
  source for **every `ngRepeat` in the product**. Still open: public-site images, and the Angular-17
  room build assets (they soft-404 at `protradingroom.com/` — served from the room's own origin).
- **Tier 2 (8 closed, 15 open) — the MARKUP question is settled; only geometry remains.** Every row
  template is now in hand, so no seeding is needed for markup. What still needs a capture run is
  rendered geometry (striping, hover) and the config-gated panes — re-run the collector with
  `OPEN_EDITOR: true`, `OPEN_BOOTBOX: true`, `LOAD_STATS: true`; all three were `false`, which is
  why those panes came back empty.

**Beware the soft-404.** This server answers missing files with HTTP **200** and the body
`<h3>this is not the page you are looking for...</h3>`. Any fetch tooling must check the bytes, not
`res.ok` and not `Content-Type`. `ptr-fetch-static.js` now guards for it; it did not at first, and
would have recorded three 404 pages as successful captures.
- **Tier 3 (11 parked) — API wire contract.** Needs one authenticated GET each. Parked unless we
  reimplement their Sessions API; note their auth puts `apiSecret` in the URL query string.
- **Tier 4 (5 won't-fix)** — reasons recorded in the register.

The one gap below is kept here in full because it is the largest single blocker and its cause is
worth stating where people will read it.

### The Manage page's USER ROW markup is not in `NEXT-STEP/gaps`, and cannot be

**What is missing.** Every per-user control on the Manage → Users table: the five `<td>`s under
`# | Name / Email | Last Login/Notes | Role / Status | Actions`, whatever the Actions column holds,
how Role/Status is rendered, and whatever `ng-init="showPins=true;"` gates.

**Why it is not there, on evidence.** `rawHtml.html:430-443` is the table, and its `<tbody>`
contains exactly one thing:

    442    <!-- ngRepeat: user in xrefs -->

AngularJS 1.3.15 (version from `meta.json`) replaces an `ngRepeat` template with a comment
placeholder and re-inserts clones per item. The room was captured with **zero** users loaded — the
Users pane shows `Loading...` and `Load / Reload Users` was never clicked — so no clone was ever
made and the template markup exists only inside the compiled bundle. This is not a collector
oversight that a re-read can fix; the markup was never in the DOM.

**Everything already read looking for it.** All 11 `state-*.json` captures (every one of the
1,632/1,633 nodes, with attributes, flags, rects and text); all 11 `rects-*.json` (all 2,445
distinct identity lines, all 778 distinct property/value pairs, all 182 class→style bindings);
`rawHtml.html` head + body 49-153, 355-449, 2488-2592, all 166 comment lines, all 11 `{{ }}`
expressions; `meta.json`; `stylesheets.json`; and `sheet-{0,1,4,5,6,7,8,9,10,11,13,14}.css`.

**The same gap, same cause, for four more regions:**
`<!-- ngRepeat: userStat in statXrefs | filter: uSearchStat -->` (`rawHtml.html:571` — the filter
expression is recoverable, the row is not), `<!-- ngRepeat: montlyStat in statXrefsMontly -->`
(:553), `<!-- ngIf: sess.authMode === 'unamePW' -->` (:294, :295), and
`<!-- ngIf: completeUserList && completeUserList.length>0 -->` (:361).

**What it blocks.** Any claim to a verified match on the Users table body, the User Stats table
body, the monthly-report table, and the two `unamePW` login fields. Our
`manage-user-row-sbs.test.ts` / `user-row-contract.test.ts` are built on the OTHER captures, not on
this one, and must not be described as pinned to `NEXT-STEP`.

**How to fetch it.** Needs a new capture, not a re-read: open the Manage page on a room that has
users, click **Load / Reload Users**, and re-run the collector with `LOAD_STATS: true` (it ran with
`LOAD_STATS: false`, per `meta.json` `config`). `scripts/ptr-collect.js` is the reference
implementation to copy; the denylist must keep it off every destructive row action — the Actions
menu alone carries Remove All, BAN, MUTE and Remove Free Trials.

### Blocking a feature

**Eleven of the twelve rows that lived here are gone, closed on 2026-08-11.** They are not struck
through, per this file's own rule at the top — their history is in `CHANGELOG.md` at 15:10, 15:30,
15:45 and 16:15, dated and timed, with the evidence each was closed from.

Worth carrying forward, because it changes how the next gap should be worked: **four of them were
already answered by captures sitting unread since 2026-08-01**, and the rows claimed the opposite.
Four more came out of the uncompiled manage view once it was fetched from AngularJS's own
`$templateCache`, and four from the application bundle. Not one needed a value invented. Before
writing a collector for anything below, read what is already in `new-room` and `new-room-control`.

**There are no open evidence gaps blocking a feature.** The last one, gap 1 (the rendered tooltip),
closed 2026-08-12 — see `CHANGELOG.md` at 11:27 and 11:52 EDT for what it was and what closed it,
including the three defects that only surfaced once the thing was rendered in a real browser.

The rows below are not evidence gaps: they are work that is known, scoped and waiting on something
other than a fact.

### Not an evidence gap — missing work, recorded so it is not lost

| #   | what                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | severity                                          | written up                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P   | **RESOLVED as an investigation 2026-08-12 — `services/**` is NOT a mirror, and this repository is its authority. One authorised edit remains.** Full record and every measurement: `ops/backend-import-provenance.md`, section "The tree has diverged from the import". **THE DIRECTION IS MEASURED, not inferred.** Against the documented source (the sibling `new-room`, per that file's import checkpoint): `media/src/server.rs` +195/−29, `media/src/config.rs` +69/**−0** (a strict superset), `api/src/db/migrate.rs` +27/−1, `Cargo.lock` +69/−109 (net smaller, consistent with the 2026-08-09 dependency bump `8dd0306` dropping transitive deps). Ten imported files diverge in total; the same comparison against `new-room-control` gives the same answer, so the finding does not depend on which sibling is treated as source. **THERE IS NO SYNC.** Searched `scripts/`, `ops/`, `apps/*/scripts/`, `.github/` and the root `package.json`: the only script referencing a sibling is `scripts/set-vercel-env.sh`, which READS `.env` files and states at line 30 that `new-room-control` is "read-only reference, not a config store for this project". Nothing copies `services/**` in either direction. **THE OWNER SETTLED THE PREMISE**, 2026-08-12: *"those are for reference only. You're strictly working on trading-room-app folder"* — so there is no upstream to mirror, and `CLAUDE.md`'s "a change made here is lost on the next sync" describes a process that does not exist. `a11883c` is 252 insertions across seven of the ten (the SFU liveness fix), recorded DEPLOYED and proven against production at `CHANGELOG.md:2863`. **WHAT REMAINS — one act, deliberately not taken:** editing `apps/controller/scripts/verify-backend-provenance.mjs`, the audit control that caught this. It needs the ten pinned INDIVIDUALLY (so drift detection keeps working on each by name) and the manifest narrowed to the 88 never-edited imports — **not** a re-pin of the whole tree, which would silence it. Measured: 88 untouched, manifest `9e5fe0a6c5ae0d8fad3eeed7baadf6aac48cccc94ab1ac2796c4983a949bc9e0`, path-list unchanged. A FOURTH instance of the original path bug waits in the same file: `DOCUMENTED_COUNT_SITES` names `docs/…` for two files that live at `apps/controller/docs/…`. Until that edit is authorised the seal stays red, which is correct — it is reporting something true. | HIGH — it is the gate, and ten files of production work depend on the framing | `ops/backend-import-provenance.md`; item Z |
<!-- The earlier text of row P is superseded. It framed the close as a choice between pushing the
     ten files back to the source or "accepting" this repository as the authority. The first is
     incoherent now that the owner has stated the siblings are reference-only — there is no upstream
     to push to — and the second was never mine to accept unilaterally. What replaced it is the
     measured evidence and the single act still needing authorisation. -->
<!-- SUPERSEDED TEXT OF ROW P, kept because it records what was believed before the direction was
     measured and before the owner settled the premise:

     **The `services/**` mirror is diverged, and the divergence is now ENUMERATED rather than suspected.** Settled 2026-08-12 by recomputing the provenance seal once its read path was repaired (`e43928e`). The manifest SHA-256 mismatch is **real content drift, not a stale pin**: ten IMPORTED files have changed since the seal was taken at `e50a819` — `services/Cargo.lock`, `services/api/src/db/migrate.rs`, `services/media/Dockerfile`, `services/media/src/config.rs`, `grant.rs`, `main.rs`, `router_registry.rs`, `server.rs`, `session.rs`, `worker_pool.rs`. `git diff --stat e50a819..HEAD -- services` is the evidence; `server.rs` alone is +196 lines. An eleventh file, `0009_rename_runtime_roles.sql`, was authored here and is sealed separately as `LOCALLY_AUTHORED` — it is NOT part of this divergence. **Why it matters:** `CLAUDE.md` states `services/**` is a mirror and a change made here is lost on the next sync. So ten files of real work — the SFU liveness fix among them — are currently living only in this repository and will be destroyed by a sync nobody has scheduled. **The seal must NOT be re-pinned to make `pnpm test` green.** It is reporting precisely what it exists to report. Re-pinning would erase the only record that these ten files diverged. **Closing it is a direction only the owner can authorise**, and there are exactly two honest options: (a) push these ten files back to the source so the mirror and the source agree, then re-seal — which means writing to `new-room-control`, a direction the standing boundary forbids me; or (b) accept that this repository is now the authority for `services/**`, retire the import-provenance framing, and re-seal deliberately with a CHANGELOG entry naming all ten and why. Option (b) is a product decision about where the backend lives, not a cleanup. | HIGH — ten files of work are at risk, and it is the gate | `ops/backend-import-provenance.md`; `apps/controller/scripts/verify-backend-provenance.mjs`; item Z |
-->

| Q   | **The WordPress plugin has not been run inside a live WordPress.** The PHP itself is now executed and proven: `php -l` reports no syntax errors under **PHP 8.3.33**, and `tests/mint-golden-token.php` mints a token with the plugin's OWN `tradingroom_sso_entitlements()` and `tradingroom_sso_mint()` — that exact token is committed as `tests/golden-token.json` and verified by our TypeScript verifier in `sso-wordpress-contract.test.ts` (negative control: tampering one signature byte fails it). Both ran in a container, so no local PHP is needed to reproduce. **What remains needs a real site, not a machine here:** boot it inside WordPress against a staging WooCommerce, click through as a paid member, then **cancel the subscription and prove the door closes on the next entry**. Only that exercises `wc_memberships_get_user_active_memberships`, `wcs_get_users_subscriptions`, the settings screen and the cached-page path.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | blocks the first WordPress customer               | **`integrations/wordpress/STAGING-TEST.md`** — a step-by-step checklist; §6 (cancel the subscription, prove the next entry is refused) is the step that closes this |
| R   | **Screenshare quality and the MP4 question — the RESEARCH was already here; the recorder half is now implemented, three rows remain.** The owner's memory was of `apps/room/docs/streaming-choices.md`, written 2026-08-05 — a measured, evidence-tagged ranking of ten options. It is byte-identical to the copy in `new-room`, so there was nothing to pull. **Done 2026-08-10: row 4.** The recorder was `new MediaRecorder(stream)` with NO options, taking the browser's ~2.5 Mbps default; it now picks VP9 explicitly at 8 Mbps (`src/lib/recording-codec.ts`, 10 tests). Row 4's own table is why — on realistic chart content VP9 produces **3841 kbps at an 8 Mbps cap and 6414 at 16**, while H.264/mp4 **saturates at ~2033 and ignores a higher cap**. 8 rather than 12 Mbps because row 4 warns a second 1080p encode competes with the live encoder. **MP4 arrives automatically on Safari** (it produces `video/mp4` natively and is last in the preference list); making it universal without losing ~1.8 Mbps of detail needs server-side remux, which is row 10 and needs the transcoding workers `MEDIASOUP-DEPLOYMENT-PLAN.md` defers. **Also done 2026-08-10: row 2.** `contentHint = 'detail'` is now set on the captured screen track — the doc's "strongest remaining candidate", chosen on the wire measurement: full 1920x1080 arrives with `qualityLimitationReason: none` and cumulative `bandwidth: 0, cpu: 0`, so nothing is throttling and the only lever left is telling libvpx the content is text rather than camera video. Its COST is still unmeasured (it may raise the bitrate, and under real congestion it trades frame rate for resolution), and it is a divergence — the capture sets the hint on its alert-overlay canvas, never the raw screen track. Reverting is deleting one line. **STILL OPEN:** row 6 raising the 1920 cap for Retina (every member pays the bandwidth, and it diverges from a byte-identical constraint) and row 8 an explicit `maxBitrate` (a floor is exactly what hurts the member on the worst connection). Both were deliberately NOT taken without the measurement, and both need the same one: **`apps/room/docs/MEASURE-SHARE-QUALITY.md`** — a written procedure, ~5 minutes, needing a human because `getDisplayMedia` requires an OS screen-picker dialog that browser automation cannot click. Attempted 2026-08-11 and abandoned: `chrome://webrtc-internals` lists every page in the BROWSER, and six Simpler Trading tabs plus two ChatGPT tabs were each contributing their own connections. The doc says which tabs to close, in what order, and what each possible result would mean. **The measurement that settles all three is one thing: a presenter sharing a REAL desktop with a member attached, reading `outbound-rtp` from `getStats()` before and after each change.** Headless `getDisplayMedia` returns Chrome's synthetic gradient, which compresses too easily to show any difference — which is why the doc's own 525 kbps figure is not the real number. | quality; owner-visible                            | `apps/room/docs/streaming-choices.md`, rows 2, 6, 8                                                                                                                 |
| S   | **The login page — ASK WILL BEFORE TOUCHING IT.** Placeholder recorded 2026-08-11 at the owner's request, so it can be pointed at when the time comes. **Nothing has been investigated, measured or decided**, and this row is deliberately not a description of a problem — writing one from guesswork is how a "fix" arrives for something nobody asked to change. What is known today and is only context: the room's own guest login is `(public)/session/[code]` on the controller and renders through `RoomLogin.svelte`, and eleven settings already drive it (`webinarPW`, `nickFilter`, `hasRequiredPhoneInLogin`, `showPasswordField`, `hideWelcomeTo`, `loginErrorMsg`, `usernameInstructions`, `claimNickName`, `allowUsersToChangeUsername`, `hideAvatars`, `hidePoweredBy`). The controller's own account login is separate, at `(public)/login`. **Which of those two is meant, and what should change about it, comes from Will.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | not started; owner to scope                       | this row                                                                                                                                                            |
| W   | **`saveData` — "Video off to preserve data" — is not modelled anywhere in this room.** It is the third term of the screen video's `hidden` binding: `H0e`'s first argument is `!o.isConnected \|\| (o.isPresentingThisScreen && !o.localpreview) \|\| o.mediaService.saveData` (`app-screenshare-view.compiled.js:338-343`), and the same flag gates a whole branch of the presentation area — `TSe` renders `h3 "Video off to preserve data..."` INSTEAD of the screens when `preferences.disableVideo` is set (`app-presentationarea.render-helpers.js:496-499`, `compiled.js:21`). The first term is now bound (`stream === null`) and the second is false by construction here — our own screens always local-preview — but this one has no counterpart at all: `+page.svelte` has zero occurrences of `saveData` or `disableVideo`. Closing it means a per-viewer preference plus the alternate branch; it is a feature, not a binding, which is why it is a row rather than a one-line fix. | LOW — a data-saving mode nobody has asked for yet | this row; `ScreenPane.svelte`'s `<video>` comment |
| V   | **Per-presenter mute does not reach the SFU HERE. Upstream it does — the limit is our signalling wire, not the design.** This row previously read "and cannot on this wire", which was true of our transport and false about the reference, and the difference decides whether closing it is a port or an invention: it is a port. `toggleTalkingPresenter` (`app-room.full.js:2354-2371`) and `adjustVolPres` (`:2610-2631`) BOTH call `mediaSoupService.startListeningToPresenter` / `stopListeningToPresenter`, so the reference stops the server sending that presenter's audio and this app does not. (The other half of those handlers IS carried: ours writes `audioVolumeFor[userID] = 100` on unmute and `0` on mute — `screen-volume.ts:148,153`.) The reference's `toggleTalkingPresenter` and `adjustVolPres` both call `mediaSoupService.startListeningToPresenter` / `stopListeningToPresenter` (`app-presentationarea.compiled.js:901-954`), which stop the server SENDING that presenter's audio. `Commands` in `apps/room/src/lib/media/signalling.ts:322-404` is the whole command surface of this deployment's wire: `resumeConsumer`, `closeConsumer`, `pauseProducer`, `resumeProducer` — **no `pauseConsumer`**, and `closeConsumer` cannot be undone without re-consuming from a `ProducerInfo` the page does not retain. So the mute is applied to the listener's own `<audio id="msRemAudio-{userID}">` element: the member hears exactly what the reference's member hears, and the bandwidth saving is what is missing. Two ways to close it, and the choice is the owner's: add `pauseConsumer`/`resumeConsumer` to `services/media` — a **mirror** change, so it must be made at the source and re-synced — or retain each `ProducerInfo` in `+page.svelte` so `stopConsuming`/`consume` can round-trip, which keeps it in this repository but re-negotiates a consumer on every unmute. | LOW — audible behaviour is correct; the cost is bandwidth | `HANDOFF.md` item U, "What item U did NOT close" |
| Z   | **`pnpm test` fails at step 2. All three original causes are CLOSED; the seal now runs for the first time and fails on something no gate had ever been able to check.** **CAUSE 1, CLOSED — and it was three bugs, not one.** `verify-backend-provenance.mjs` computed paths as `new URL('../…', import.meta.url)`, which from `apps/controller/scripts/` is the APP root. `REPOSITORY_ROOT` was corrected earlier; the MANIFEST read and the DOCUMENTED-COUNT read still had it (`apps/controller/services/` and `apps/controller/ops/`, neither of which exists). Both were invisible because the file-count check threw first. All three now address `REPOSITORY_ROOT` (`e43928e`). **CAUSE 2, CLOSED.** `0009_rename_runtime_roles.sql` was added 2026-08-10, deployed, and had a preflight defect fixed in it, all while this verifier could not run. Now pinned by SHA-256 `6acfec23…`. **CAUSE 3, CLOSED by SPLITTING, not by bumping.** The gate reported `expected 98, got 99`. Bumping to 99 would make `ops/backend-import-provenance.md` — which records what was IMPORTED — claim an import that never happened. `LOCALLY_AUTHORED` now names 0009 as authored here and seals it separately; the imported count stays 98. The earlier refusal to bump was right, and this is the half that was missing. **VERIFIED:** imported count (98 of 99, 1 local) and path-list SHA-256 both pass, for the first time. **THE LIVE BLOCKER — DO NOT RE-PIN IT.** The manifest SHA-256 now differs: expected `4c303601…`, got `f1a8493f…`. That check has NEVER executed, because the read it depends on pointed at a directory that does not exist. So the mismatch is either real content drift in an imported file or a pin computed at import time and never validated, and nobody knows which. Re-pinning to make the gate green destroys the first true signal this seal has produced. Closing it needs a per-file diff against the source, which is item P and a direction only the owner can authorise. **SEPARATELY, step 4.** `evidence:verify` needs the full `evidence-dumps/` tree — `COPY`, `NEXT-STEP`, `README.md`, `account-page`, `home-page`, `login-page`, `main-nav-login-clicked`, `register-page`, `room-login`. This repository has only the 216 KB `login-page/manage` that `schema:verify` needs. The full tree is 45 MB in `new-room-control/evidence-dumps/`; pulling it is one command in the sanctioned direction, and committing 45 MB is the owner's call. | HIGH — it is the gate | `apps/controller/scripts/verify-backend-provenance.mjs`; item P |
| G   | **Postgres host is an open question — Neon may not hold up under volume.** Raised by the owner 2026-08-09, deliberately deferred. Serverless Postgres autoscales compute but the pressure here is sustained CONNECTIONS from long-lived room sessions, which is a different curve. Alternatives to weigh when it comes up: Crunchy Bridge, RDS, or self-managed on the same infrastructure as the app tier. Not urgent — current load is one user.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | decide before real volume                         | not yet written up                                                                                                                                                  |
| H   | **Production topology should SEPARATE the media plane from the app tier.** The owner's point, and correct: Hetzner earns its place on egress economics, and the rest of the app has the opposite shape. Sharing one box means a shared failure domain, a shared attack surface (~10,000 open UDP ports beside your session cookies), and a shared lifecycle. What is deployed today is a five-day TEST topology, not the target. Separating later is a redeploy, not a migration.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | before real users                                 | supersedes `NEXT-SESSION.md` §4c                                                                                                                                    |
| E   | **The room↔controller seam cannot be exercised locally: `apps/room/.env` does not exist.** Found 2026-08-12 while trying to produce the RENDER proof for `hideChatAlerts` and `isChatOnlyRoom`. `scripts/room-config-seam-e2e.mjs` is the right instrument and now carries the assertions for both — it flips each setting on the Manage page and reads whether `.alert-chat-box` and `.presentation-box` are in the room's DOM — but it **has not been run**, and the reason is environmental rather than a defect in either application. Three separate things are missing: (1) `apps/room/.env` is absent entirely, and `.env.example` lists nine variables the room needs, of which `CONTROL_BASE_URL` and `ROOM_JWT_SECRET` are the two the seam depends on; (2) `ROOM_JWT_SECRET` is **not in `apps/controller/.env` either** (0 occurrences), so there is no shared HMAC secret on this machine and the room's signed request to `internal/room-config/<code>` could not be verified even if the room were pointed at the controller; (3) the probe's own defaults are stale — it declares `CONTROL=http://localhost:5180`, but the controller's dev port is **5173** (`apps/controller/vite.config.ts:17`, and the comment there says the room's `CONTROL_BASE_URL` must name that exact port). Port 5180 on this machine is a **different project** (`Desktop/trick-trades`), which is what a first run actually reached — `/register` answered 404. **Not fixed here because provisioning a shared secret is an owner decision**, and inventing one to make a probe go green is the opposite of what this file is for. What the gates DO have behind them meanwhile: `chat-alerts-gates-contract.test.ts`, 13 assertions read out of the decoded component at runtime, with four negative controls each seen red and restored. What is missing is only the last mile — a browser observing a column leave the DOM when an owner ticks the box. | MEDIUM — the two gates are tested but not rendered | this row; `apps/room/scripts/room-config-seam-e2e.mjs` §9 |

### The collectors, and what each is now for

`collect-create-new.js` is superseded. It errored on paste and was replaced rather than repaired,
because the error was never captured and a fix would have been a guess. Three scripts replaced it and
each one's failure narrowed the next:

| script                                           | what it is for                                                                                                                                                   |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/controller/scripts/pull-app-bundle.js`     | the application bundles, sliced around named targets. Works; fetched 1.78 MB across three files                                                                  |
| `apps/controller/scripts/pull-manage-partial.js` | reads a ui-router state verbatim when a view is not inlined                                                                                                      |
| `apps/controller/scripts/pull-template-cache.js` | takes a partial out of `$templateCache` when its `templateUrl` is a function call and no path can be guessed                                                     |
| `apps/room/scripts/collect-tooltips.js`          | the rendered tooltip. It queries `[ngbtooltip]`, which is right: the screen tabs' `tooltip=` attributes bind to no directive, so there is nothing there to catch |
| `apps/controller/scripts/collect-manage-gaps.js` | v2, four defects fixed. Still the tool for a room whose user table has members in it                                                                             |

---

## Scope — what is NOT being matched

- **The homepage / marketing site is being rewritten and redesigned.** It is the one surface where
  matching the reference buys nothing, because it is being replaced. Do not spend audit effort on
  `(public)/+page.svelte` or its sections.
- **The marketing screenshots go with it.** `ptr_descrived_perspective.png`, `ss3.png` and
  `user_comments.png` are photographs of the ORIGINAL's interface. Renaming the files would not
  change what is inside them, and they will be retaken against this product once the room is live.
- **Fidelity still matters everywhere else** — the admin, the account page, the manage page and the
  room. Those are the product; the homepage is a brochure.

---

## Not gaps — decisions taken deliberately

Recorded so nobody "fixes" them back:

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
  navbar's copy. The navbar keeps the captured ids exactly; the overlay takes
  `screenTalkingPresenter{i}-donot-disturb`. Same rule as the `aria-selected` and `tabindex`
  divergences in `ScreenTabs.svelte` — a captured value is reproduced unless reproducing it locks a
  real person out — and unlike the duplicate `id="dropdownMenuScreen"`, which costs a reader nothing
  and is kept. Pinned by `screen-volume-contract.test.ts`.
- **New Room is always visible.** The reference hides it behind five clicks on "Sessions"
  (`ng-show="showNewRoom>=5"`). Ours does not, by the owner's decision — an account at zero rooms
  otherwise has no visible way back. Pinned by `account-new-room-reveal.test.ts`.
- **A save shows a toast.** The reference appears to show nothing (gap 2). A silent success is
  indistinguishable from a dead control, which is the exact complaint that produced this rule.
- **Failures render.** Both the account page and the manage page had `fail()` paths that rendered
  nothing — 22 and 43 respectively.
- **The editor toolbar stays enabled.** See gap 3.
- **Marketplace is not a tab.** It is not in the captured strip; it stays a routable pane reached
  from its own buttons so they are not dead controls.
- **AngularJS directives are not reproduced** — `ng-click`, `ng-repeat`, `ta-button`,
  `dropdown="dropdown"`. They render nothing. `data-menu-control` replaces the last of these because
  the outside-click closer needs a hook and TypeScript rejects `dropdown` on a div.
| AA  | **`app-room` gap sweep — ALL 11 CLOSED, 2026-08-12.** **IMPLEMENTED (4):** `muteAllNonAdmins`, which was silencing the presenter's OWN speakers while every non-admin microphone stayed open (`d03ae23`); the `#connectedMsg` reconnect flash, whose markup shipped with nothing to show it (`727e453`); join/leave announcements end to end — server presence events, client gates, two settings plumbed (`a68c734`); Tawk presenter support (`d904a7a`). **CLOSED BY EVIDENCE, no code, because building either would ADD behaviour the reference does not have (2):** `calculateDuplicates` (`full.js:2420-2426`) has ZERO call sites — dead upstream; the `.alert-chat-box` hover (`:1926-1932`) runs `un('.mainTabset ul.nav-tabs').hide()` and `mainTabset` occurs on exactly ONE element in the whole decoded tree — `ul#mainTabs`, which IS the only `ul.nav-tabs` and has no `ul` descendants, so the selector matches nothing and the handler is a no-op. **ALREADY IMPLEMENTED, both my own false negatives from grepping `+page.svelte` alone (2):** `initPMDrag` — `panelDragResize` is attached to `#privaChatCompHolder`; `pollModalCompHolder` — it is at `ModalHost.svelte:3483` with the captured id AND class, and `calculatePollPanelPosition` is literally `showPanel()`'s formula `(wrapper − holder.outer) / 2` reading the holder's own `offsetWidth`. **DEFERRED, each because the producer does not exist here (3):** `appVisibilityChange`'s catch-up half is in `onMount` and its `unloadRoster`/`loadRoster` half has no counterpart — this roster is SSE-PUSHED, and gating our five-second poll on `visibilityChangeEnabled` would make a hidden tab poll forever for anyone who has not opted in, strictly worse than what we do; `hideChat` — item AB; `stopRecMsg` — item AC. **VERIFIED:** 775 tests / 73 files; `svelte-check` 0 errors; `schema:verify` 269 total / 49 wired; four negative controls run, each red then restored. | — | `docs/MATCH-LEDGER.md`; items AB, AC |
| AB  | **`hideChat` handler — the producer is not modelled, so the listener would be dead.** `app-room.full.js:2185-2218` collapses chat to 0 / alerts to 100, disables `extraChatColumn` while remembering it was on, and restores sizes from the correct localStorage key. Its ONLY emitter is `app-chat.full.js:565-566`: `this.isPresenter || this.guiEventBus.emit('hideChat', 'd' == e)`, inside a `changeChatMode` subscriber. `changeChatMode` is the presenter-driven chat-mode feature — enabled / disabled / webinar (`'d'`, `'p'`) — and this room does not model it at all. Building the handler alone would be a consumer with no producer, which is the same dead scaffolding as building a producer with no consumer. **Closing it means implementing `changeChatMode` first**, which is a feature, not a gap. | LOW — nothing can trigger it today | `app-chat.full.js:561-568`; item AA |
| AC  | **`stopRecMsg` browser Notification — the server does not send it.** `app-room.full.js:2071-2076` raises `new Notification(i.data, {body: i.data})` alongside an error/info toast chosen on whether the text contains 'Stopped'. It is SUBSCRIBED in `app-room` and emitted nowhere in the decoded component tree — it arrives from the app service, i.e. the reference's own server, on the recording pipeline. This room's recording is client-side (`MediaRecorder`, a declared divergence) and `+page.server.ts` publishes no such message, so the handler would never fire. **Closing it means server-side recording**, which the deployment plan defers — see item R. | LOW | item R; `docs/MATCH-LEDGER.md` |
