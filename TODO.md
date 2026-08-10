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

---

## Evidence gaps — the index

Full write-ups live in the documents linked. Nothing below has been filled in with a plausible
value; each is a thing that was looked for and not found.

**This file lists only what is still OPEN.** Closed items are not struck through here any more —
they are removed, and their history lives in `CHANGELOG.md`, dated and timed, with the commit that
closed each one. Two places recording the same thing is how one of them goes stale, and a list that
is mostly strikethrough is a list nobody reads to the bottom of.

### Blocking a feature

| # | gap | read looking for it | blocks | written up |
| --- | --- | --- | --- | --- |
| 1 | **`createNew()`** — the New Room handler. **The collector is ready and verified 2026-08-10** (`node --check` clean; it performs one `fetch` GET and clicks nothing on the page) — paste `apps/controller/scripts/collect-create-new.js` into the Chrome console while logged in to the ORIGINAL and it downloads a JSON that closes gaps 1, 2, 3, 6 and 7 in one run. This is the owner's action; nothing here can reach that bundle. Three captures prove the control; none holds the function. Unknown: where a new room's NAME comes from. | `login-page/logged-in-page:487`, `login-page/login:465`, `main-nav-login-clicked/file:487`; searched `more-fucking-evidence/`, `new-evidence/`, `mising/` | matching the New Room form's shape — ours carries a required name input the reference does not have | `NEXT-SESSION.md` §7 |
| 2 | **`htmlDescChanged()`** — Save Editor Changes. Same bundle, same absence. The manage page loads angular-toaster but has **no `<toaster-container>`**, and `bootbox` appears zero times — so the original probably shows nothing on save. | `must-match/file1`, `must-match/important`, `login-page/manage` (all three toaster references are asset loads) | knowing whether our success toast is a divergence or a match. We show one deliberately. | `MOBILE-APP.md` §6 pattern; `NEXT-SESSION.md` §7 |
| 3 | **`disabled="disabled"` on the editor toolbar** — 29 of 30 buttons carry it, still true in a capture taken AFTER typing (`ng-dirty ng-touched`). So not "disabled until first edit". | `must-match/file1` toolbar block; the owner's post-typing capture | whether our always-enabled toolbar is right. Ours stay enabled: a permanently dead toolbar is the more expensive error. | `NEXT-SESSION.md` §7 |
| 4 | **`Show Mobile` / `Show Non-Mobile` / `Marketplace Users` have no observed predicate.** The reference resolves them server-side. `room_users` has three columns that could each mean "mobile" — `mobilePairCode`, `pushTokensJson`, `notificationsState`. | both collector runs; `ptr1.json` manage captures; `api-docs` documents an `isMobile` field and a "filter for mobile users only" but not its rule | those three filters. The loader reports them unsupported rather than silently returning everyone. | `OUTSTANDING.md` §6b; `MOBILE-APP.md` §2a |
| 5 | **The `" / manual"` token** on non-owner rows. Four samples across both captures all read "manual"; an earlier capture read "login", so it is per-user. `room_users` has no column that could hold it. **Collector ready 2026-08-10:** `apps/controller/scripts/collect-manage-gaps.js` captures every user row rather than four samples, so a per-user pattern is visible instead of inferred. | `must-match/file1:439,653`; `must-match/important:464,678` | the Role cell renders the slash alone rather than guessing | in-code comment at the Role cell |
| 6 | **`ptrMobileAppCaseByCaseEnabled` — three branches never rendered.** Angular stripped them; the captured room has the flag off. Labels and handlers unknown. | `must-match/file1` App and Notifications submenu | per-member app opt-in | `MOBILE-APP.md` §6 |
| 7 | **`customMobileAppLaunchWord`** — `wired: false`, behaviour unknown. A deep-link scheme is the obvious reading, and obvious is not evidence. | `room-settings-schema.ts`; no capture shows it in use | the white-label decision in `MOBILE-APP.md` §7 | `MOBILE-APP.md` §6, §7 |
| 8 | **Two `User List Actions` items never rendered** — `<!-- ngIf: sess.authMode === 'unamePW' -->` twice at the top of that menu. The captured room is not in that mode. **Collector ready 2026-08-10:** `collect-manage-gaps.js` records whether this tenant is in `unamePW` mode at all — an absence that is itself the answer. | `ptr1.json` manage captures | completeness of that menu for password-auth rooms | `OUTSTANDING.md` §6b |
| 9 | **The DON'T TOUCH block was never captured.** The collector logged the step and serialised the wrong element. **Collector ready 2026-08-10:** `collect-manage-gaps.js` clicks the disclosure and then PROVES the field count changed before serialising, which is exactly the step the previous collector skipped. | `collect-account-…json` (all captures), `manage:header`, `manage:tab:Settings` | 49 `group: 'dont-touch'` settings verified only against the older dump | `OUTSTANDING.md` §6b |
| 10 | **No hover, focus or open-menu state in any capture.** The collector's own `gaps[]` records six. **Collector ready 2026-08-10:** `collect-manage-gaps.js` captures the matching `:hover`/`:focus` CSS RULES (synthetic events cannot trigger real `:hover`, and it says so in the output) and opens each dropdown. | every capture | all `:hover`/`:focus` rules are unverified; the style gate deliberately does not judge them | `OUTSTANDING.md` §6b |
| 11 | **The Settings capture is truncated twice over** — node array stops at index 900, **35.6%** of the pane unmeasured; every tab's `html` stops at 120,000 characters. **Collector ready 2026-08-10:** `collect-manage-gaps.js` has no node cap and no html cap, and writes any limit it does hit into `gaps[]`. | the collector output | 13 settings from `slackPostURL` on have markup but no measurements; 121 after `customClientAlertPostSecret` have neither | `OUTSTANDING.md` §6b |
| 12 | **The app-pair sample link has no endpoint.** The reference renders `…/ptr_app/sessions/v2/addUser/<publicId>/?sec=<pairSecretKey>&…`; we have no `addUser` route. **Collector ready 2026-08-10:** `collect-manage-gaps.js` looks for the rendered link and reports honestly if "Pair Link For App?" is off. | searched `src/routes`, `src/lib` | self-serve mobile pairing | `OUTSTANDING.md` §6b; `MOBILE-APP.md` §4 |

### Not an evidence gap — missing work, recorded so it is not lost

| # | what | severity | written up |
| --- | --- | --- | --- |
| P | **The SFU liveness fix has NOT been promoted to the `services/**` mirror.** The fix itself is deployed and proven in production (2026-08-10 05:56 EDT — a probe that answered nothing was reclaimed in exactly 60.0s, its router closed, while live peers stayed connected). What remains is repository hygiene with real consequences: `services/**` exists in both this repo and `new-room-control`, and this copy is now ahead by seven files. That tree has diverged twice before, and the second time `new-room-control` was serving the UNSAFE copy while a document said it was the source of authority. Promote and re-seal per `apps/room/TODO.md` entry 2 and `services/SYNC-PROVENANCE.md`. **Not done here on purpose:** `new-room-control` is under a standing instruction not to be edited from this repository. | MEDIUM — a known-recurring drift, now live | `CHANGELOG.md` 2026-08-10 06:01 |
| Q | **The WordPress plugin has not been run inside a live WordPress.** The PHP itself is now executed and proven: `php -l` reports no syntax errors under **PHP 8.3.33**, and `tests/mint-golden-token.php` mints a token with the plugin's OWN `tradingroom_sso_entitlements()` and `tradingroom_sso_mint()` — that exact token is committed as `tests/golden-token.json` and verified by our TypeScript verifier in `sso-wordpress-contract.test.ts` (negative control: tampering one signature byte fails it). Both ran in a container, so no local PHP is needed to reproduce. **What remains needs a real site, not a machine here:** boot it inside WordPress against a staging WooCommerce, click through as a paid member, then **cancel the subscription and prove the door closes on the next entry**. Only that exercises `wc_memberships_get_user_active_memberships`, `wcs_get_users_subscriptions`, the settings screen and the cached-page path. | blocks the first WordPress customer | **`integrations/wordpress/STAGING-TEST.md`** — a step-by-step checklist; §6 (cancel the subscription, prove the next entry is refused) is the step that closes this |
| N | **The connectivity test does not test THIS deployment's relay.** `ModalHost.svelte`'s WebRTC test now uses public STUN only, after the hardcoded `turn:flash.protradingroom.com` credentials were removed. The room already receives the deployment's real ICE servers from `/api/media/grant` (`+page.svelte:5350-5360`) and hands them to the media session, but holds them in a function-local, so surfacing them to the modal is a refactor rather than a prop. Until then the test says nothing about `media.tradingroom.app`. | the test is honest but thin | in-code comment at `runWebRTCTest` |
| C | **`push_tokens_json` has no writer.** The endpoint the mobile app would call does not exist. | blocks the app | `MOBILE-APP.md` §4, §7b.3 |
| L | **The Hetzner box has no firewall at either layer.** Measured 2026-08-09 from outside: TCP 40000, 40100, 40199 **and 40500** all answer RST immediately — refused, not dropped — so every TCP port on `87.99.154.155` is reachable from the internet. On the box itself `ufw` is inactive and iptables INPUT policy is `ACCEPT`. **This is good news for the SFU** (a UDP-blocked client can fall back to TCP, which was the open caveat in `SFU-MIGRATION.md`) **and a hardening gap for everything else**: nothing is exposed today that should not be — signalling and the room are both bound to loopback, Caddy owns 80/443, sshd owns 22 — but the next service that binds `0.0.0.0` is public the second it starts. A Hetzner cloud firewall allowing 22/80/443 + UDP and TCP 40000-40199 would close it without touching the media path. | before real users | `SFU-MIGRATION.md` DONE banner; `CHANGELOG.md` 2026-08-09 |
| K | **The participant stats CSV is missing six columns, because there is no data behind them.** The reference's `exportStatsToCSV` writes `Name, Email, [Phone,] IP, In, Out, Duration, isMobile, Browser` — read from `app.min.js` in `dumps/export-controls-1786287657298.json`. Six of those come from its per-session participant records (`statXrefs`: `inTime`, `outTime`, `ip`, `isMobile`, `browser`), and this app has **no such table** — `stats` is `users` filtered to those with a `lastLoginAt`, so it has one timestamp per member and nothing about a visit. Emitting those headers over empty cells would claim we collect data we do not, so the export writes only the columns it can fill. **Closing this is a schema question, not an export question:** a `room_sessions`-shaped table written on join and left, which nothing currently produces. | export is honest but thinner than the reference's | `CHANGELOG.md` 2026-08-09 11:0x; in-code comment at `exportStatsToCsv` |
| G | **Postgres host is an open question — Neon may not hold up under volume.** Raised by the owner 2026-08-09, deliberately deferred. Serverless Postgres autoscales compute but the pressure here is sustained CONNECTIONS from long-lived room sessions, which is a different curve. Alternatives to weigh when it comes up: Crunchy Bridge, RDS, or self-managed on the same infrastructure as the app tier. Not urgent — current load is one user. | decide before real volume | not yet written up |
| H | **Production topology should SEPARATE the media plane from the app tier.** The owner's point, and correct: Hetzner earns its place on egress economics, and the rest of the app has the opposite shape. Sharing one box means a shared failure domain, a shared attack surface (~10,000 open UDP ports beside your session cookies), and a shared lifecycle. What is deployed today is a five-day TEST topology, not the target. Separating later is a redeploy, not a migration. | before real users | supersedes `NEXT-SESSION.md` §4c |

### The collector that closes most of these

Gaps 1, 2, 3, 6 and 7 all live in the same file — `/public/dist/app.min.js`, referenced by the
reference's pages and **not present anywhere on disk**.

`scripts/collect-create-new.js` already fetches it. It is a GET of a public static asset, clicks
nothing, submits nothing and mutates nothing. Running it once against the live original closes five
of the twelve remaining gaps.

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
