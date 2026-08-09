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
| `docs/SFU-MIGRATION.md` | the one piece still outstanding: moving the media service off AWS |
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

### Blocking a feature

| # | gap | read looking for it | blocks | written up |
| --- | --- | --- | --- | --- |
| 1 | **`createNew()`** — the New Room handler. Three captures prove the control; none holds the function. Unknown: where a new room's NAME comes from. | `login-page/logged-in-page:487`, `login-page/login:465`, `main-nav-login-clicked/file:487`; searched `more-fucking-evidence/`, `new-evidence/`, `mising/` | matching the New Room form's shape — ours carries a required name input the reference does not have | `NEXT-SESSION.md` §7 |
| 2 | **`htmlDescChanged()`** — Save Editor Changes. Same bundle, same absence. The manage page loads angular-toaster but has **no `<toaster-container>`**, and `bootbox` appears zero times — so the original probably shows nothing on save. | `must-match/file1`, `must-match/important`, `login-page/manage` (all three toaster references are asset loads) | knowing whether our success toast is a divergence or a match. We show one deliberately. | `MOBILE-APP.md` §6 pattern; `NEXT-SESSION.md` §7 |
| 3 | **`disabled="disabled"` on the editor toolbar** — 29 of 30 buttons carry it, still true in a capture taken AFTER typing (`ng-dirty ng-touched`). So not "disabled until first edit". | `must-match/file1` toolbar block; the owner's post-typing capture | whether our always-enabled toolbar is right. Ours stay enabled: a permanently dead toolbar is the more expensive error. | `NEXT-SESSION.md` §7 |
| 4 | **`Show Mobile` / `Show Non-Mobile` / `Marketplace Users` have no observed predicate.** The reference resolves them server-side. `room_users` has three columns that could each mean "mobile" — `mobilePairCode`, `pushTokensJson`, `notificationsState`. | both collector runs; `ptr1.json` manage captures; `api-docs` documents an `isMobile` field and a "filter for mobile users only" but not its rule | those three filters. The loader reports them unsupported rather than silently returning everyone. | `OUTSTANDING.md` §6b; `MOBILE-APP.md` §2a |
| 5 | **The `" / manual"` token** on non-owner rows. Four samples across both captures all read "manual"; an earlier capture read "login", so it is per-user. `room_users` has no column that could hold it. | `must-match/file1:439,653`; `must-match/important:464,678` | the Role cell renders the slash alone rather than guessing | in-code comment at the Role cell |
| 6 | **`ptrMobileAppCaseByCaseEnabled` — three branches never rendered.** Angular stripped them; the captured room has the flag off. Labels and handlers unknown. | `must-match/file1` App and Notifications submenu | per-member app opt-in | `MOBILE-APP.md` §6 |
| 7 | **`customMobileAppLaunchWord`** — `wired: false`, behaviour unknown. A deep-link scheme is the obvious reading, and obvious is not evidence. | `room-settings-schema.ts`; no capture shows it in use | the white-label decision in `MOBILE-APP.md` §7 | `MOBILE-APP.md` §6, §7 |
| 8 | **Two `User List Actions` items never rendered** — `<!-- ngIf: sess.authMode === 'unamePW' -->` twice at the top of that menu. The captured room is not in that mode. | `ptr1.json` manage captures | completeness of that menu for password-auth rooms | `OUTSTANDING.md` §6b |
| 9 | **The DON'T TOUCH block was never captured.** The collector logged the step and serialised the wrong element. | `collect-account-…json` (all captures), `manage:header`, `manage:tab:Settings` | 49 `group: 'dont-touch'` settings verified only against the older dump | `OUTSTANDING.md` §6b |
| 10 | **No hover, focus or open-menu state in any capture.** The collector's own `gaps[]` records six. | every capture | all `:hover`/`:focus` rules are unverified; the style gate deliberately does not judge them | `OUTSTANDING.md` §6b |
| 11 | **The Settings capture is truncated twice over** — node array stops at index 900, **35.6%** of the pane unmeasured; every tab's `html` stops at 120,000 characters. | the collector output | 13 settings from `slackPostURL` on have markup but no measurements; 121 after `customClientAlertPostSecret` have neither | `OUTSTANDING.md` §6b |
| 12 | **The app-pair sample link has no endpoint.** The reference renders `…/ptr_app/sessions/v2/addUser/<publicId>/?sec=<pairSecretKey>&…`; we have no `addUser` route. | searched `src/routes`, `src/lib` | self-serve mobile pairing | `OUTSTANDING.md` §6b; `MOBILE-APP.md` §4 |
| ~~13~~ | ~~`ptr_logo.png` was never captured~~ — **CLOSED.** Not a gap and not a decision: the reference falls back to THE SITE'S OWN logo, so ours is ours. `static/public/images/room-logo.svg` now exists — a white-on-transparent `TradingRoomApp` wordmark, SVG so it stays crisp at any size. Replace that one file to rebrand.**Was:** The reference falls back to THE SITE'S OWN logo, so ours should be OURS, not theirs. Copying `ptr_logo.png` would put a third party's brand asset in a public repo and render their wordmark as this product's default. | — | the Branding tab's default logo. **Save the product's own logo to `apps/controller/static/public/images/room-logo.png`.** White-on-transparent, which is why the panel is `background-color: #000`. | in-code comment |

### Not an evidence gap — missing work, recorded so it is not lost

| # | what | severity | written up |
| --- | --- | --- | --- |
| ~~A~~ | ~~**No password reset flow.**~~ — **CLOSED 2026-08-09.** `(public)/forgot-password` and `(public)/reset-password` exist and the login link points at the first of them. Built on the token design already proven in `email-verification.ts`: hashed at rest, single-use via the conditional UPDATE, **one hour** rather than verification's 24, one request per address per minute, and reCAPTCHA before the account lookup. The request form answers identically whether or not the address has an account. Redeeming revokes **every** session, marks the address proved, and mints one fresh session so the reset does not end on the login page. `MIN_PASSWORD` moved to `auth.ts` so signup and reset cannot disagree. 28 cases across `password-reset.test.ts`, `password-reset-pages.test.ts` and the extended `email-verification.test.ts`; the three policy guarantees were mutation-checked. **Live** — item B closed the same day, so `resetEnabled()` is true in production and the flow sends for real. Verified on the deployed site: `/forgot-password` renders its form, `/reset-password` with a bad token refuses with the right sentence and offers no password field. | — | `EMAIL.md` §3, §4 step 7 |
| ~~B~~ | ~~**Mail transport unconfigured.**~~ — **CLOSED 2026-08-09.** `RESEND_API_KEY` and `MAIL_FROM` are both set on Vercel production (`vercel env ls`, created ~2h before this note). Confirmed from the OUTSIDE as well, without reading either value: `/forgot-password` renders its form rather than its "not available on this deployment" state, and that branch is `mailConfigured()`. **Two consequences are now live**: password reset actually sends, and `verificationEnforced()` is `true`, so the room-creation gate is real — see `EMAIL.md` §5, which has one query that must be re-run. | — | `EMAIL.md` §2, §4 |
| C | **`push_tokens_json` has no writer.** The endpoint the mobile app would call does not exist. | blocks the app | `MOBILE-APP.md` §4, §7b.3 |
| I | **Four public pages render with classes that have no CSS.** `contact`, `privacy`, `terms` and `verify-email` use `pub-auth`, `pub-form-card`, `pub-field`, `pub-hint`, `pub-error`, `pub-success` — read `public.css`, `account.css`, `auth.css` and `manage.css` end to end, and every rule in `public.css` is scoped `.pub-root …`. **Not one of those six classes has a rule anywhere in the app**, so those pages are unstyled text on white. Found 2026-08-09 while choosing classes for the reset pages; those two deliberately use the login panel's measured `acc-*` set instead, so the problem was not propagated. | cosmetic, but on four pages a customer sees | not yet written up |
| G | **Postgres host is an open question — Neon may not hold up under volume.** Raised by the owner 2026-08-09, deliberately deferred. Serverless Postgres autoscales compute but the pressure here is sustained CONNECTIONS from long-lived room sessions, which is a different curve. Alternatives to weigh when it comes up: Crunchy Bridge, RDS, or self-managed on the same infrastructure as the app tier. Not urgent — current load is one user. | decide before real volume | not yet written up |
| H | **Production topology should SEPARATE the media plane from the app tier.** The owner's point, and correct: Hetzner earns its place on egress economics, and the rest of the app has the opposite shape. Sharing one box means a shared failure domain, a shared attack surface (~10,000 open UDP ports beside your session cookies), and a shared lifecycle. What is deployed today is a five-day TEST topology, not the target. Separating later is a redeploy, not a migration. | before real users | supersedes `NEXT-SESSION.md` §4c |
| ~~D~~ | ~~`ROOM_BASE_URL` is `http://localhost:5174`~~ — **CLOSED 2026-08-09.** Now `https://chat.tradingroom.app`, set on Vercel and deployed. | — | `DEPLOYMENT.md` |
| ~~E~~ | ~~`ROOM_JWT_SECRET` is 9 characters~~ — **CLOSED 2026-08-09.** Rotated to 64 hex chars during the room's first deployment, set on the room and on Vercel in the same sitting, and verified byte-identical. Done before any handoff links existed, which was the cheapest moment. | — | `DEPLOYMENT.md` |

### The collector that closes most of these

Gaps 1, 2, 3, 6 and 7 all live in the same file — `/public/dist/app.min.js`, referenced by the
reference's pages and **not present anywhere on disk**.

`scripts/collect-create-new.js` already fetches it. It is a GET of a public static asset, clicks
nothing, submits nothing and mutates nothing. Running it once against the live original closes five
of thirteen gaps.

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
