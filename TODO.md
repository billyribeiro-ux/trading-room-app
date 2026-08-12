# TODO — the repository index

This is the root index. Anything recorded per-app stays where it is; this file points at it, so
there is one place to look rather than four.

**The project rule this file exists for:** when something cannot be found in the evidence, it gets
(1) said plainly in the reply, (2) written here under **Evidence gaps** with what is missing, every
file already read looking for it, and what it blocks, and (3) given a browser-console script that
will fetch it. A gap recorded in only one app's document is a gap the next person does not see.

---

## Where things are written down

| document | covers |
| --- | --- |
| `docs/NEXT-SESSION.md` | verified state, the room-hosting decision, backend + egress arithmetic, what the original actually runs on, hostname/DNS plan, consolidation, ordered next actions, audit method, traps |
| `docs/DEPLOYMENT.md` | **what runs where** — the Hetzner box, the services on it, the secrets, and how to ship a new build |
| `docs/SFU-MIGRATION.md` | how the media service moved to Hetzner — **done 2026-08-09**; kept as the record and as the operational contract for that box |
| `docs/RETIRE-AWS-SFU.md` | **the old AWS SFU, retired 2026-08-10** — what it was, every command run, and why the "EC2, not Lightsail" identification was wrong |
| `docs/EMAIL.md` | transactional sending vs mailbox hosting, what is built, the DNS records, and the verification trap |
| `docs/MOBILE-APP.md` | the phone/tablet app — decoded server surface, proposed endpoint contract, security constraints, the white-label question |
| `apps/controller/docs/OUTSTANDING.md` | the controller's own gap register, §1–§7 |
| `apps/controller/docs/MEDIASOUP-DEPLOYMENT-PLAN.md` | the SFU deployment ladder — **Stage 2+ superseded**, see `NEXT-SESSION.md` §4c |
| `apps/controller/docs/decisions/` | ADRs. 0003 is the one that matters for topology |
| `apps/room/TODO.md` | the room's own list |
| `apps/controller/evidence-bootstrap-3.3.7.css` | **the styling authority for the account, manage and login pages.** Pulled from `new-room-control/css-modals` 2026-08-11, SHA-256 pinned by `manage-panel-bootstrap3-contract.test.ts`. See the note below on the two Bootstrap generations. |
| `apps/room/evidence-tooltips-presenter-2026-08-11.json` | the RENDERED tooltip, captured from the live original. `ngb-tooltip.test.ts` reads its expectations out of this file |

---

## The product runs TWO Bootstrap generations, on two surfaces

Established 2026-08-11 from `new-room-control/css-modals`, and never written down before. Getting
this wrong is how a "fix" gets applied to the wrong surface, so it belongs at the top of this file
rather than inside a row.

| surface | generation | how it is PROVEN |
| --- | --- | --- |
| **The room** (`chat.protradingroom.com`, Angular 2+) | **Bootstrap 5** | the live tooltip renders `class="tooltip fade show bs-tooltip-start"` with `data-popper-placement` — a spelling only Bootstrap 5 emits (`apps/room/evidence-tooltips-presenter-2026-08-11.json`); its modal captures carry `modal fade show` and `aria-modal`, and **zero** `modal fade in` |
| **Account / manage / login** (AngularJS) | **Bootstrap 3.3.7** | `div class="panel panel-default"` appears six times across `evidence-dumps/login-page/{login,logged-in-page,manage,complimentary}`, beside `ng-show`/`ng-hide`. `.panel` is a Bootstrap **3** component — 4 replaced it with `.card`, 5 dropped it entirely — so that markup cannot be either |

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

## Evidence gaps — the index

Full write-ups live in the documents linked. Nothing below has been filled in with a plausible
value; each is a thing that was looked for and not found.

**This file lists only what is still OPEN.** Closed items are not struck through here any more —
they are removed, and their history lives in `CHANGELOG.md`, dated and timed, with the commit that
closed each one. Two places recording the same thing is how one of them goes stale, and a list that
is mostly strikethrough is a list nobody reads to the bottom of.

### Blocking a feature

**Eleven of the twelve rows that lived here are gone, closed on 2026-08-11.** They are not struck
through, per this file's own rule at the top — their history is in `CHANGELOG.md` at 15:10, 15:30,
15:45 and 16:15, dated and timed, with the evidence each was closed from.

Worth carrying forward, because it changes how the next gap should be worked: **four of them were
already answered by captures sitting unread since 2026-08-01**, and the rows claimed the opposite.
Four more came out of the uncompiled manage view once it was fetched from AngularJS's own
`$templateCache`, and four from the application bundle. Not one needed a value invented. Before
writing a collector for anything below, read what is already in `new-room` and `new-room-control`.

| # | gap | read looking for it | blocks | written up |
| --- | --- | --- | --- | --- |
| 1 | **Closed 2026-08-12, and it closed by disproving its own premise.** A presenter run on the live room (`evidence-tooltips-presenter-2026-08-12.json`, 8 hosts, Bootstrap **5.3.3**) plus the bundle's directive definition settled all three parts. **(a) `triggers` is an NgbTooltip input**, not a popover-only one — `selectors:[["","ngbTooltip",""]],inputs:{…,triggers:"triggers",…}`. Angular's TAttributes has no per-directive grouping, so `triggers="manual"` on the GIF host reaches the tooltip, and the live hover confirmed it: every other host rendered within 33ms, that one rendered nothing. The earlier reading — *"triggers sits in the POPOVER's group, so the tooltip is not manual-triggered after all"* — was wrong. **(b) `placement="auto"` is correct and was never a collapse of ours.** The template declares `placement` twice (`"placement","top","placement","auto"`); one attribute survives into the DOM and it is the later one, so `top` is dead in the reference too. Our markup already matched the captured DOM byte for byte. **(c) The eye badge has no tooltip to capture.** The screen tabs use `tooltip="Unlock this screen?"` / `tooltip="This is the default screen…"` with `placement="bottom"` — and the bundle contains **no `[tooltip]` directive selector at all**. Inert attributes; the real hover text there is native `title="Lock this screen?"`. No run while sharing a screen could ever have captured it. **Fix shipped:** the attachment returns before binding when `triggers="manual"`. Pinned by `ngb-tooltip-triggers-contract.test.ts`. | `evidence-tooltips-presenter-2026-08-12.json`; `docs/source/main.d6d3c112b59b7d0d.js` | nothing | `CHANGELOG.md` 2026-08-12 |

**The room's full placement inventory is implemented, rendered and pinned — closed 2026-08-12 11:27 EDT.**
Reading every `"placement",` entry in `main.d6d3c112b59b7d0d.js` gives the inventory: `left`, `top`,
`bottom`, `top-right`, `auto`. All resolve, all render, and all five are verified in real Chromium by
`pnpm --filter room verify:tooltips`, which measures what the browser draws and exits non-zero on a
mismatch. Screenshots and measurements land in `apps/room/evidence-tooltip-placements/`.

The mapping is not transcribed — the bundle ships it as code (`Coe`, `koe`, `baseClass:"bs-tooltip"`)
and both are ported, so the 21 uncaptured directions are derived by the same arithmetic that produces
the one the captures prove.

**Three things the rendering found that unit tests could not**, because jsdom reports every rect as
zero:

1. **The arrow was never positioned.** Bootstrap sets its size and one edge; Popper writes
   `position: absolute` and the offset inline. Ours stayed in normal flow and added its own 12.797px
   to the bubble — 41.797px against the capture's 29px.
2. **The arrow must point at the HOST, clamped to the bubble** — not at the bubble's centre. For a
   `-end` variation the bubble aligns to the host's trailing edge, so the two differ and an arrow
   centred on the bubble points at empty space. Only `top-right` can show this.
3. **Top and bottom tooltips are genuinely ~12.8px taller than left ones**, in the original too. The
   reference's own sheet still carries the Bootstrap 4 block, and `.bs-tooltip-top{padding:.4rem 0}`
   lands on the element ng-bootstrap emits because BS4 and BS5 share those two names — but not
   `left`, which BS5 renamed to `start`.

**The 0.25px positional residual is solved**, not tolerated: Popper's `roundOffsetsByDPR` snaps the
translate to the device pixel grid, and the capture ran at `devicePixelRatio: 2`. Applying the same
rounding reproduces all three captured transforms and all three final rects EXACTLY, both axes. The
half-toward-`+∞` behaviour of `Math.round` is load-bearing — rounding half away from zero misses by
half a pixel.

**The five tooltips the reference BINDS are wired too — 2026-08-12 11:52 EDT.** Angular marks
bindings with `3` in `TAttributes`, and a property binding sets no attribute, so
`["placement","top",1,"created-at","mx-2",3,"ngbTooltip","ngStyle"]` renders a host carrying
`placement="top"` and no `ngbtooltip` at all. Three spans in this app carried exactly that and showed
nothing: two in `RoomMessage.svelte`, one in `ModalHost.svelte`. `ngbTooltipWith(text)` takes the
value through the attachment instead of writing an attribute the reference never sets. The bound
value is `xn("ngbTooltip", Ct(27, 24, e.msg.t, "short"))` — Angular's `date:'short'`, which for en-US
is `M/d/yy, h:mm a` and is exactly what the existing `alertDateFormatter` already produces, so it is
reused rather than re-derived. Covered by a sixth case in `verify:tooltips`, which also fails if a
bound host gains the attribute.

**Popper's collision pass is not implemented, and does not need to be.** `RI` hands flip
`fallbackPlacements: r` AFTER `r.shift()` has taken the primary, so for any fixed placement that list
is empty; `[] || …` is `[]` in JavaScript, so flip receives no alternatives and never moves the
bubble. `preventOverflow` is registered with `fn: function(){}` — a no-op. Only `auto` has
alternatives, and no tooltip in the room renders with `auto`: the GIF control is `triggers="manual"`
and the emoji host carries `ngbPopover` with no `ngbTooltip`.

### Not an evidence gap — missing work, recorded so it is not lost

| # | what | severity | written up |
| --- | --- | --- | --- |
| P | **The `services/**` mirror is diverged, and closing it needs a direction I am not permitted to move in.** The SFU liveness fix is deployed and proven in production (2026-08-10 05:56 EDT — a probe answering nothing was reclaimed in exactly 60.0s, its router closed, while live peers stayed connected), and migration `0009_rename_runtime_roles.sql` has since been added here too. `services/**` exists in both this repository and `new-room-control`, and this copy is now ahead by eight files. That tree has diverged twice before, and the second time **`new-room-control` was serving the UNSAFE copy** while a document claimed it was the source of authority — so this is a known-recurring defect, not tidiness. **Standing instruction, confirmed by the owner 2026-08-10: files may be pulled FROM `new-room-control` and `new-room` into this repository, and never the other way.** Promotion is therefore an owner action by definition. Re-seal per `apps/room/TODO.md` entry 2 and `services/SYNC-PROVENANCE.md` when it happens. | MEDIUM — a known-recurring drift, now live | `CHANGELOG.md` 2026-08-10 06:01 and 07:35 |
| Q | **The WordPress plugin has not been run inside a live WordPress.** The PHP itself is now executed and proven: `php -l` reports no syntax errors under **PHP 8.3.33**, and `tests/mint-golden-token.php` mints a token with the plugin's OWN `tradingroom_sso_entitlements()` and `tradingroom_sso_mint()` — that exact token is committed as `tests/golden-token.json` and verified by our TypeScript verifier in `sso-wordpress-contract.test.ts` (negative control: tampering one signature byte fails it). Both ran in a container, so no local PHP is needed to reproduce. **What remains needs a real site, not a machine here:** boot it inside WordPress against a staging WooCommerce, click through as a paid member, then **cancel the subscription and prove the door closes on the next entry**. Only that exercises `wc_memberships_get_user_active_memberships`, `wcs_get_users_subscriptions`, the settings screen and the cached-page path. | blocks the first WordPress customer | **`integrations/wordpress/STAGING-TEST.md`** — a step-by-step checklist; §6 (cancel the subscription, prove the next entry is refused) is the step that closes this |
| R | **Screenshare quality and the MP4 question — the RESEARCH was already here; the recorder half is now implemented, three rows remain.** The owner's memory was of `apps/room/docs/streaming-choices.md`, written 2026-08-05 — a measured, evidence-tagged ranking of ten options. It is byte-identical to the copy in `new-room`, so there was nothing to pull. **Done 2026-08-10: row 4.** The recorder was `new MediaRecorder(stream)` with NO options, taking the browser's ~2.5 Mbps default; it now picks VP9 explicitly at 8 Mbps (`src/lib/recording-codec.ts`, 10 tests). Row 4's own table is why — on realistic chart content VP9 produces **3841 kbps at an 8 Mbps cap and 6414 at 16**, while H.264/mp4 **saturates at ~2033 and ignores a higher cap**. 8 rather than 12 Mbps because row 4 warns a second 1080p encode competes with the live encoder. **MP4 arrives automatically on Safari** (it produces `video/mp4` natively and is last in the preference list); making it universal without losing ~1.8 Mbps of detail needs server-side remux, which is row 10 and needs the transcoding workers `MEDIASOUP-DEPLOYMENT-PLAN.md` defers. **Also done 2026-08-10: row 2.** `contentHint = 'detail'` is now set on the captured screen track — the doc's "strongest remaining candidate", chosen on the wire measurement: full 1920x1080 arrives with `qualityLimitationReason: none` and cumulative `bandwidth: 0, cpu: 0`, so nothing is throttling and the only lever left is telling libvpx the content is text rather than camera video. Its COST is still unmeasured (it may raise the bitrate, and under real congestion it trades frame rate for resolution), and it is a divergence — the capture sets the hint on its alert-overlay canvas, never the raw screen track. Reverting is deleting one line. **STILL OPEN:** row 6 raising the 1920 cap for Retina (every member pays the bandwidth, and it diverges from a byte-identical constraint) and row 8 an explicit `maxBitrate` (a floor is exactly what hurts the member on the worst connection). Both were deliberately NOT taken without the measurement, and both need the same one: **`apps/room/docs/MEASURE-SHARE-QUALITY.md`** — a written procedure, ~5 minutes, needing a human because `getDisplayMedia` requires an OS screen-picker dialog that browser automation cannot click. Attempted 2026-08-11 and abandoned: `chrome://webrtc-internals` lists every page in the BROWSER, and six Simpler Trading tabs plus two ChatGPT tabs were each contributing their own connections. The doc says which tabs to close, in what order, and what each possible result would mean. **The measurement that settles all three is one thing: a presenter sharing a REAL desktop with a member attached, reading `outbound-rtp` from `getStats()` before and after each change.** Headless `getDisplayMedia` returns Chrome's synthetic gradient, which compresses too easily to show any difference — which is why the doc's own 525 kbps figure is not the real number. | quality; owner-visible | `apps/room/docs/streaming-choices.md`, rows 2, 6, 8 |
| S | **The login page — ASK WILL BEFORE TOUCHING IT.** Placeholder recorded 2026-08-11 at the owner's request, so it can be pointed at when the time comes. **Nothing has been investigated, measured or decided**, and this row is deliberately not a description of a problem — writing one from guesswork is how a "fix" arrives for something nobody asked to change. What is known today and is only context: the room's own guest login is `(public)/session/[code]` on the controller and renders through `RoomLogin.svelte`, and eleven settings already drive it (`webinarPW`, `nickFilter`, `hasRequiredPhoneInLogin`, `showPasswordField`, `hideWelcomeTo`, `loginErrorMsg`, `usernameInstructions`, `claimNickName`, `allowUsersToChangeUsername`, `hideAvatars`, `hidePoweredBy`). The controller's own account login is separate, at `(public)/login`. **Which of those two is meant, and what should change about it, comes from Will.** | not started; owner to scope | this row |
| U | **Reduced to ONE thing: the volume dropdown's TRIGGER was never rendered.** Everything else closed 2026-08-12. **Background — closed, four independent confirmations.** Every `#screenTabs` node in `proroom-ULTIMATE-staff-2026-07-24…json` reads `background-color: rgb(17,17,17)`, across the `main-tab:Screens`, `Streams`, `Notes` and `Files` captures; ours is `var(--notes-tabs-bg)` = `#111`, which is the variable the captured sheet keys `.screens-tabs` off by name. **Height — closed, and it never needed the number.** All four captures are of an EMPTY bar (h=1, its own border, or h=0 when the pane is hidden), so the populated height is still underived — and it does not matter: our sheet pins no height at all and uses `auto`, which reproduces both states because `.nav-tabs .nav-item { margin-bottom: -1px }` cancels the bar's own border once it has tabs. `screen-tab-bar-contract.test.ts:87` fails if anybody ever pins one. A derived 41.5 that nothing consumes is a note, not a gap. **Structure and attributes — closed 2026-08-11** from the owner's populated paste: `data-bs-target` removed to match, `aria-selected` and `tabindex` kept as deliberate accessibility divergences. **What genuinely remains:** the reference renders `div.dropdown-menu.volumeControl[aria-labelledby=dropdownVolume]` — `h4` "Volume" with a `float-right.mr-2` `fa-times` closer, `input[audiovolslider][type=range][min=0][max=100][title=Volume].mx-auto.py-2.volCtrl`, `br`, `button.btn.btn-primary.btn-sm[title="Mute Audio"]` "Mute", `hr`, `div.room-sound-options` — but the element that OPENS it is one of the collapsed `<!---->` placeholders and has never rendered in any capture. | LOW — one unrendered trigger | this row; `CHANGELOG.md` 2026-08-12 |
| Z | **`pnpm test` fails at step 2, and now for a TRUE reason. Two of the three causes are fixed.** Found 2026-08-12 after `schema:verify` (step 1) was repaired. **CAUSE 1, FIXED:** three verifiers — `verify-backend.mjs`, `verify-backend-provenance.mjs`, `verify-api-release-artifact.mjs` — computed `REPOSITORY_ROOT` as `new URL('../', import.meta.url)`, which from `apps/controller/scripts/` is the APP root, not the repository root. Every path they check is `services/api/…`, which lives at the repository root, so all three died on `scandir` before reading a single file. They came from the sibling repository where `'../'` WAS the root; moving them under `apps/controller/` invalidated that without changing the name. **CAUSE 2, FIXED:** with the path right, the gate immediately caught a real thing — `0009_rename_runtime_roles.sql` was added 2026-08-10, deployed, and had a preflight defect found and fixed in it, all without ever being pinned, because the verifier could not run. Now pinned by SHA-256. **CAUSE 3, THE OWNER'S:** the gate now reports `file count changed: expected 98, got 99` — the real `services/**` divergence that item P describes. **Deliberately not silenced.** `ops/backend-import-provenance.md` records what was IMPORTED from the source; 0009 was authored here, so bumping the count to 99 would claim an import that never happened and hide exactly what P exists for. **Separately, `evidence:verify` (step 4) needs the full `evidence-dumps/` tree** — it expects `COPY`, `NEXT-STEP`, `README.md`, `account-page`, `home-page`, `login-page`, `main-nav-login-clicked`, `register-page`, `room-login`, and this repository has only the 216 KB `login-page/manage` that `schema:verify` needs. The full tree is **45 MB** in `new-room-control/evidence-dumps/`; pulling it is one command in the sanctioned direction, and committing 45 MB is the owner's call rather than mine. | MEDIUM — the chain is red at step 2, honestly now | this row; `CHANGELOG.md` 2026-08-12 |
| G | **Postgres host is an open question — Neon may not hold up under volume.** Raised by the owner 2026-08-09, deliberately deferred. Serverless Postgres autoscales compute but the pressure here is sustained CONNECTIONS from long-lived room sessions, which is a different curve. Alternatives to weigh when it comes up: Crunchy Bridge, RDS, or self-managed on the same infrastructure as the app tier. Not urgent — current load is one user. | decide before real volume | not yet written up |
| H | **Production topology should SEPARATE the media plane from the app tier.** The owner's point, and correct: Hetzner earns its place on egress economics, and the rest of the app has the opposite shape. Sharing one box means a shared failure domain, a shared attack surface (~10,000 open UDP ports beside your session cookies), and a shared lifecycle. What is deployed today is a five-day TEST topology, not the target. Separating later is a redeploy, not a migration. | before real users | supersedes `NEXT-SESSION.md` §4c |

### The collectors, and what each is now for

`collect-create-new.js` is superseded. It errored on paste and was replaced rather than repaired,
because the error was never captured and a fix would have been a guess. Three scripts replaced it and
each one's failure narrowed the next:

| script | what it is for |
| --- | --- |
| `apps/controller/scripts/pull-app-bundle.js` | the application bundles, sliced around named targets. Works; fetched 1.78 MB across three files |
| `apps/controller/scripts/pull-manage-partial.js` | reads a ui-router state verbatim when a view is not inlined |
| `apps/controller/scripts/pull-template-cache.js` | takes a partial out of `$templateCache` when its `templateUrl` is a function call and no path can be guessed |
| `apps/room/scripts/collect-tooltips.js` | the rendered tooltip. It queries `[ngbtooltip]`, which is right: the screen tabs' `tooltip=` attributes bind to no directive, so there is nothing there to catch |
| `apps/controller/scripts/collect-manage-gaps.js` | v2, four defects fixed. Still the tool for a room whose user table has members in it |

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
