# TODO — what is still left to do

Stripped 2026-08-13 18:26 EDT to exactly that. Everything historical moved out: finished work lives
in `CHANGELOG.md`, and the process rules earned along the way live in
`docs/reference/working-rules.md`. If a section here is not something somebody still has to DO, it
does not belong.

This is the root index. Anything recorded per-app stays where it is; this file points at it, so
there is one place to look rather than four.

**The project rule this file exists for:** when something cannot be found in the evidence, it gets
(1) said plainly in the reply, (2) written here under **Evidence gaps** with what is missing, every
file already read looking for it, and what it blocks, and (3) given a browser-console script that
will fetch it. A gap recorded in only one app's document is a gap the next person does not see.

---

## State, 2026-08-14 14:12 EDT

Ten rows remain, and **not one of them is blocked on effort**. Every item that could be built from
the evidence has been; what is left is blocked on a decision, an environment, or an architecture
this deployment does not have.

| row | what it needs | who or what unblocks it |
| --- | --- | --- |
| **P** | nothing — bookkeeping. PR #20 is green and mergeable; `feat/extra-chat-column` waits behind it | the owner merges |
| **S** | the login page — **ask Will before touching it** | the owner |
| **G** | the Postgres host question — Neon under volume | the owner |
| **H** | production topology — separating media from the app tier | the owner |
| **Q** | the WordPress plugin run inside a live WordPress | an environment |
| **E** | `apps/room/.env`, which holds secrets not authored here | an environment |
| **V** | per-presenter mute reaching the SFU — the change lives in `services/**` | that mirror, not this repo |
| **R** | screenshare quality / MP4 — three sub-rows | partly the owner, partly server-side recording |
| **X** | `app-recording-preview-window` — its URL is written by a server that does not exist here | server-side recording |
| **AC** | `stopRecMsg` — the same missing producer | server-side recording |

Five rows were CLOSED today and removed from this file rather than struck through, because a row
that is not something somebody still has to DO does not belong in it — see the rule at the top. Each
one's record is in `CHANGELOG.md` under 2026-08-14: **Z** the unbounded chat and alert reads, **Z2**
the alert-question tenancy leak in both directions, **X2** the extra chat column, **AB** the chat
mode control, and **AA**, which was already closed on 2026-08-12.

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
| `docs/reference/working-rules.md`                       | **how to work on this repository** — eight rules, each earned by a specific failure on 2026-08-13. Read before trusting any "not built" or "no such rule" note. |
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

As of 2026-08-14 09:21 EDT: **67 CLOSED, 6 OPEN, 14 parked/won't-fix, 87 total.**

**Everything closable by READING is closed.** The six that remain need something no source file
can give. Each is written out below with the exact next action, because "blocked" without an
instruction is just a note that something is unfinished.

---

### HANDOFF — the SIX still open, and exactly what each needs

Rewritten 2026-08-13 18:21 EDT, recounted 2026-08-14. It said twelve while the template read was
still running, then fourteen, and the prose disagreed with the tally line above it in BOTH
directions for a day. The items below count 0 + 1 + 4 + 1 + 0 = **six** after the 2026-08-14 browser session closed six and parked one, which is what the
tally says and what `evidence-gap-register-counts.test.ts` recounts from the register itself.
Section B reads "two" because one sentence unblocks two EDITS; only one of them (T5-24) is an open
register row. Every item says WHO does the next step and WHAT it is. **No item here
is waiting on more reading — the templates are exhausted.**

#### A. Nothing. All five closed 2026-08-14 by one browser session.

**T5-15, T5-21, T2-20, T2-7 and T2-22 are CLOSED.** Captures: `evidence-dumps/stripe-details-2026-08-14.json`,
`rendered-states-2026-08-14.json`, `rendered-states-welcome-2026-08-14.json`,
`rendered-states-login-2026-08-14.json`. **The only browser work left is T1-9/T1-10 in section E.**

That session found THREE defects in our own collectors, every one of which had been returning a
plausible result rather than an error — the scope walk that climbed away from the controller, the
denylist that matched `post` inside `POST_ROUTE_API_DOCUMENTATION.md`, and the login detector that
labelled the Add Admin User form as the login form. All three are fixed and asserted.

#### B. Two need one sentence from the owner, naming the field.

Blocked by a credential guard whose bar is `[named + specifics]`. A general "match the original" does
not clear it, and this exact edit was explicitly reverted earlier on request. **Four attempts were
refused; do not attempt a fifth without the sentence.**

> Render the room's `ssoJWTSecret` in the WordPress shortcode, and `pairSecretKey` in the app-pair
> sample link, on the manage Settings tab, as the original does.

- **T5-24** — `+page.server.ts`, the `wordpressShortcode` line: `key=''` becomes
  `key='${String(settings.ssoJWTSecret ?? '')}'`. Reference `page.manageSession.html:782`. **Why it
  matters:** the shortcode is COPIED into WordPress, where the plugin signs the SSO handoff with that
  key. Empty means every handoff fails, and it renders identically to a working one.
- **T5-25 is CLOSED as a gap in its own right** — the endpoint exists with ten green tests. What
  remains is only the DISPLAY block at `page.manageSession.html:1138-1142`, which is the same
  sentence.

#### C. Four need infrastructure that does not exist. Do NOT build them until it does.

Building any of these means inventing a data source, which the evidence rules forbid. Each is fully
specified in the register.

- **T5-16 — the Recordings page.** Needs an endpoint behind `recs`: `vidPath`, `contentType`, `name`,
  `created`, `length` (MILLISECONDS — the reference renders `length/60000` to two decimals).
- **T5-17 — the Avatars page.** Needs the avatar set behind `avatars`, and the endpoint
  `selectAvatar(avatar)` posts to.
- **T5-20 — nothing writes `recorded_max_capacity`.** Column, reader and reset all exist (migration
  `0011`). A high-water mark needs LIVE occupancy and the controller receives no occupancy signal.
  **Do not substitute the roster size** — the number who ever registered is not the number ever
  simultaneously present.
- **T5-27 — `badges.dark_theme` is an ID, not a boolean.** PROVEN by
  `page.welcome.html:1191-1211` (`ng-if="roomBadge._id === b.darkTheme"`). The storage and the
  display are evidenced; the PICKER that sets it is not. Migrating now would leave a column nothing
  can write — the same defect as T5-20. **Plan:** a nullable
  `dark_theme_badge_id INTEGER REFERENCES badges(id)`; keep the boolean as superseded, since
  migrations are forward-only; true→null is the only honest backfill.

#### D. One is a decision about a control the REFERENCE ships broken.

- **T5-18 — the recordings "Share" button has no handler of any kind.** It renders and does nothing.
  This repository forbids shipping a control whose only effect is its own presence, so a faithful
  rebuild has to choose. **Recommendation: omit it and record why**, the same call already taken for
  the Stripe Details link. Moot until T5-16 exists.

#### E. Nothing. Both re-fetched 2026-08-14 and resolved.

**T1-9 CLOSED** — all 8 public-site images fetched, recorded in
`evidence-dumps/static-asset-manifest-2026-08-14.json` by url + bytes + sha256.
**T1-10 PARKED to Tier 4** — both room build assets soft-404'd a second time (HTTP 200, 52-byte body), which is
the condition this bucket set for parking them. Nothing is blocked: the room's real bundle is already in the
repository at `apps/room/docs/source/`, decoded into 194 component files.

**T1-6 was independently re-confirmed** by the same run — its three glyphicon fonts soft-404 as well, which is
what its existing "CLOSED AS NOT-DEPLOYED" status already said.

#### F. Nothing. This bucket is empty.

**T5-28 closed 2026-08-14** — it was already built; only a test was missing. Every remaining item
needs something from outside this repository.

### Not an evidence gap — missing work, recorded so it is not lost

| #   | what                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | severity                                          | written up                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P   | **PR [#20](https://github.com/billyribeiro-ux/trading-room-app/pull/20) is GREEN and ready to merge, 2026-08-14 13:30 EDT.** The FULL GATE was run locally once, at the end of the work rather than after each edit: `pnpm -r test`, **exit 0** — room 1036 tests / 89 files, controller 937 / 90, and `verify-documented-test-counts.mjs` agreeing across all four documented sites. On GitHub: **Rust and PostgreSQL security contracts SUCCESS**, Vercel SUCCESS, `mergeable: MERGEABLE`. PR #19 was merged by the owner 2026-08-14 11:38 EDT; #20 carries everything since. **Standing instruction unchanged — "push but not merge"** (rule 9, `docs/reference/working-rules.md`): merge on the green from the FINAL push, as two acts, never combined. **Deliberately NOT added to this PR: the `extra-chat-column` refactor.** It is ~300 lines of chat-pane markup turned into a snippet plus per-pane state, and 37 contract tests read `+page.svelte` source text — a change of that size pushed onto a green PR would invalidate the checks it is about to be merged on, which is precisely what rule 9 exists to prevent. It gets its own PR after this one lands. Also cleaned up today: two corrupt refs literally named `fix/green-the-gate 2` (a macOS duplicate-file artifact) in `.git/refs/heads` and `.git/refs/remotes/origin`, which broke `git fetch` with "did not send all necessary objects"; both pointed at `dc659e8`, verified an ancestor of HEAD before removal. | LOW — bookkeeping | this row |
| Q   | **The WordPress plugin has not been run inside a live WordPress.** The PHP itself is now executed and proven: `php -l` reports no syntax errors under **PHP 8.3.33**, and `tests/mint-golden-token.php` mints a token with the plugin's OWN `tradingroom_sso_entitlements()` and `tradingroom_sso_mint()` — that exact token is committed as `tests/golden-token.json` and verified by our TypeScript verifier in `sso-wordpress-contract.test.ts` (negative control: tampering one signature byte fails it). Both ran in a container, so no local PHP is needed to reproduce. **What remains needs a real site, not a machine here:** boot it inside WordPress against a staging WooCommerce, click through as a paid member, then **cancel the subscription and prove the door closes on the next entry**. Only that exercises `wc_memberships_get_user_active_memberships`, `wcs_get_users_subscriptions`, the settings screen and the cached-page path.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | blocks the first WordPress customer               | **`integrations/wordpress/STAGING-TEST.md`** — a step-by-step checklist; §6 (cancel the subscription, prove the next entry is refused) is the step that closes this |
| R   | **Screenshare quality and the MP4 question — the RESEARCH was already here; the recorder half is now implemented, three rows remain.** The owner's memory was of `apps/room/docs/streaming-choices.md`, written 2026-08-05 — a measured, evidence-tagged ranking of ten options. It is byte-identical to the copy in `new-room`, so there was nothing to pull. **Done 2026-08-10: row 4.** The recorder was `new MediaRecorder(stream)` with NO options, taking the browser's ~2.5 Mbps default; it now picks VP9 explicitly at 8 Mbps (`src/lib/recording-codec.ts`, 10 tests). Row 4's own table is why — on realistic chart content VP9 produces **3841 kbps at an 8 Mbps cap and 6414 at 16**, while H.264/mp4 **saturates at ~2033 and ignores a higher cap**. 8 rather than 12 Mbps because row 4 warns a second 1080p encode competes with the live encoder. **MP4 arrives automatically on Safari** (it produces `video/mp4` natively and is last in the preference list); making it universal without losing ~1.8 Mbps of detail needs server-side remux, which is row 10 and needs the transcoding workers `MEDIASOUP-DEPLOYMENT-PLAN.md` defers. **Also done 2026-08-10: row 2.** `contentHint = 'detail'` is now set on the captured screen track — the doc's "strongest remaining candidate", chosen on the wire measurement: full 1920x1080 arrives with `qualityLimitationReason: none` and cumulative `bandwidth: 0, cpu: 0`, so nothing is throttling and the only lever left is telling libvpx the content is text rather than camera video. Its COST is still unmeasured (it may raise the bitrate, and under real congestion it trades frame rate for resolution), and it is a divergence — the capture sets the hint on its alert-overlay canvas, never the raw screen track. Reverting is deleting one line. **STILL OPEN:** row 6 raising the 1920 cap for Retina (every member pays the bandwidth, and it diverges from a byte-identical constraint) and row 8 an explicit `maxBitrate` (a floor is exactly what hurts the member on the worst connection). Both were deliberately NOT taken without the measurement, and both need the same one: **`apps/room/docs/MEASURE-SHARE-QUALITY.md`** — a written procedure, ~5 minutes, needing a human because `getDisplayMedia` requires an OS screen-picker dialog that browser automation cannot click. Attempted 2026-08-11 and abandoned: `chrome://webrtc-internals` lists every page in the BROWSER, and six Simpler Trading tabs plus two ChatGPT tabs were each contributing their own connections. The doc says which tabs to close, in what order, and what each possible result would mean. **The measurement that settles all three is one thing: a presenter sharing a REAL desktop with a member attached, reading `outbound-rtp` from `getStats()` before and after each change.** Headless `getDisplayMedia` returns Chrome's synthetic gradient, which compresses too easily to show any difference — which is why the doc's own 525 kbps figure is not the real number. | quality; owner-visible                            | `apps/room/docs/streaming-choices.md`, rows 2, 6, 8                                                                                                                 |
| S   | **The login page — ASK WILL BEFORE TOUCHING IT.** Placeholder recorded 2026-08-11 at the owner's request, so it can be pointed at when the time comes. **Nothing has been investigated, measured or decided**, and this row is deliberately not a description of a problem — writing one from guesswork is how a "fix" arrives for something nobody asked to change. What is known today and is only context: the room's own guest login is `(public)/session/[code]` on the controller and renders through `RoomLogin.svelte`, and eleven settings already drive it (`webinarPW`, `nickFilter`, `hasRequiredPhoneInLogin`, `showPasswordField`, `hideWelcomeTo`, `loginErrorMsg`, `usernameInstructions`, `claimNickName`, `allowUsersToChangeUsername`, `hideAvatars`, `hidePoweredBy`). The controller's own account login is separate, at `(public)/login`. **Which of those two is meant, and what should change about it, comes from Will.**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | not started; owner to scope                       | this row                                                                                                                                                            |
| V   | **Per-presenter mute does not reach the SFU HERE. Upstream it does — the limit is our signalling wire, not the design.** This row previously read "and cannot on this wire", which was true of our transport and false about the reference, and the difference decides whether closing it is a port or an invention: it is a port. `toggleTalkingPresenter` (`app-room.full.js:2354-2371`) and `adjustVolPres` (`:2610-2631`) BOTH call `mediaSoupService.startListeningToPresenter` / `stopListeningToPresenter`, so the reference stops the server sending that presenter's audio and this app does not. (The other half of those handlers IS carried: ours writes `audioVolumeFor[userID] = 100` on unmute and `0` on mute — `screen-volume.ts:148,153`.) The reference's `toggleTalkingPresenter` and `adjustVolPres` both call `mediaSoupService.startListeningToPresenter` / `stopListeningToPresenter` (`app-presentationarea.compiled.js:901-954`), which stop the server SENDING that presenter's audio. `Commands` in `apps/room/src/lib/media/signalling.ts:322-404` is the whole command surface of this deployment's wire: `resumeConsumer`, `closeConsumer`, `pauseProducer`, `resumeProducer` — **no `pauseConsumer`**, and `closeConsumer` cannot be undone without re-consuming from a `ProducerInfo` the page does not retain. So the mute is applied to the listener's own `<audio id="msRemAudio-{userID}">` element: the member hears exactly what the reference's member hears, and the bandwidth saving is what is missing. Two ways to close it, and the choice is the owner's: add `pauseConsumer`/`resumeConsumer` to `services/media` — a **mirror** change, so it must be made at the source and re-synced — or retain each `ProducerInfo` in `+page.svelte` so `stopConsuming`/`consume` can round-trip, which keeps it in this repository but re-negotiates a consumer on every unmute. | LOW — audible behaviour is correct; the cost is bandwidth | `HANDOFF.md` item U, "What item U did NOT close" |
| X   | **ONE settings-modal checkbox remains, and it is blocked on architecture rather than on effort.** Row X started at thirteen on 2026-08-14; twelve are closed. **`visibility-change-enabled` was CLOSED 2026-08-14** — item AA had deferred it, and AA's objection was right about the ROSTER half and only that half: `unloadRoster`/`loadRoster` gate a five-second POLL upstream, ours is SSE-pushed, so reproducing it would leave a hidden tab holding a stale roster. The CHAT half is the reverse and was worth more here than upstream: a hidden tab was doing a full page load per message posted, because this room re-reads its log on every SSE event. Now it skips the refetch while hidden, keeps the mention path alive, and catches up once on return — `appHasFocusGetChatLog`. Defaults OFF, a stated divergence: the reference ships `visibilityChangeEnabled:!0`, but upstream's hidden branch skips an array append and ours skips a network read, so nobody is opted in silently. **`app-recording-preview-window` (`recPreviewWindow`) is the last one, and it is BLOCKED — proven, not assumed.** The image src is `${sessData.recPreviewLocation}?${Date.now()}` polled every 1000ms, and `recPreviewLocation` is set by the SERVER on the command channel — `case "setRecPreview": globals.sessData.recPreviewLocation = i.url` (bundle byte 1023704). It is not a manage-page setting and nothing else writes it. The component's OWN gate is `videoOnlyMode || !isPresenter || !recPreviewLocation || !recPreviewWindow` → do nothing, so without a server snapshot it correctly renders nothing. This room records CLIENT-side with `MediaRecorder` — the declared divergence in item R — so no snapshot exists and no `setRecPreview` ever arrives. Building it would ship a component that cannot run; producing the frame locally instead would invent a mechanism the reference does not have, and its own heading says "DELAYED UPTO 20s" because the snapshot is generated server-side. **Closing it means server-side recording**, which `MEDIASOUP-DEPLOYMENT-PLAN.md` defers — same blocker as item AC. | LOW — the remaining one cannot run in this deployment | this row; `visibility-change-contract.test.ts` |
| G   | **Postgres host is an open question — Neon may not hold up under volume.** Raised by the owner 2026-08-09, deliberately deferred. Serverless Postgres autoscales compute but the pressure here is sustained CONNECTIONS from long-lived room sessions, which is a different curve. Alternatives to weigh when it comes up: Crunchy Bridge, RDS, or self-managed on the same infrastructure as the app tier. Not urgent — current load is one user.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | decide before real volume                         | not yet written up                                                                                                                                                  |
| H   | **Production topology should SEPARATE the media plane from the app tier.** The owner's point, and correct: Hetzner earns its place on egress economics, and the rest of the app has the opposite shape. Sharing one box means a shared failure domain, a shared attack surface (~10,000 open UDP ports beside your session cookies), and a shared lifecycle. What is deployed today is a five-day TEST topology, not the target. Separating later is a redeploy, not a migration.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | before real users                                 | supersedes `NEXT-SESSION.md` §4c                                                                                                                                    |
| E   | **The room↔controller seam cannot be exercised locally: `apps/room/.env` does not exist.** Found 2026-08-12 while trying to produce the RENDER proof for `hideChatAlerts` and `isChatOnlyRoom`. `scripts/room-config-seam-e2e.mjs` is the right instrument and now carries the assertions for both — it flips each setting on the Manage page and reads whether `.alert-chat-box` and `.presentation-box` are in the room's DOM — but it **has not been run**, and the reason is environmental rather than a defect in either application. Three separate things are missing: (1) `apps/room/.env` is absent entirely, and `.env.example` lists nine variables the room needs, of which `CONTROL_BASE_URL` and `ROOM_JWT_SECRET` are the two the seam depends on; (2) `ROOM_JWT_SECRET` is **not in `apps/controller/.env` either** (0 occurrences), so there is no shared HMAC secret on this machine and the room's signed request to `internal/room-config/<code>` could not be verified even if the room were pointed at the controller; (3) the probe's own defaults are stale — it declares `CONTROL=http://localhost:5180`, but the controller's dev port is **5173** (`apps/controller/vite.config.ts:17`, and the comment there says the room's `CONTROL_BASE_URL` must name that exact port). Port 5180 on this machine is a **different project** (`Desktop/trick-trades`), which is what a first run actually reached — `/register` answered 404. **Not fixed here because provisioning a shared secret is an owner decision**, and inventing one to make a probe go green is the opposite of what this file is for. What the gates DO have behind them meanwhile: `chat-alerts-gates-contract.test.ts`, 13 assertions read out of the decoded component at runtime, with four negative controls each seen red and restored. What is missing is only the last mile — a browser observing a column leave the DOM when an owner ticks the box. | MEDIUM — the two gates are tested but not rendered | this row; `apps/room/scripts/room-config-seam-e2e.mjs` §9 |

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
| AC  | **`stopRecMsg` browser Notification — the server does not send it.** `app-room.full.js:2071-2076` raises `new Notification(i.data, {body: i.data})` alongside an error/info toast chosen on whether the text contains 'Stopped'. It is SUBSCRIBED in `app-room` and emitted nowhere in the decoded component tree — it arrives from the app service, i.e. the reference's own server, on the recording pipeline. This room's recording is client-side (`MediaRecorder`, a declared divergence) and `+page.server.ts` publishes no such message, so the handler would never fire. **Closing it means server-side recording**, which the deployment plan defers — see item R. | LOW | item R; `docs/MATCH-LEDGER.md` |
