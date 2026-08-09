# Where this stands, and what to do next

Written 2026-08-09. Everything below is either a measured fact with its source, or an explicitly
labelled open question. Nothing here is an assumption presented as a finding.

---

## 1. The one-line summary

The **admin is live and working** at `https://www.tradingroom.app`. The **room is not deployed**
and cannot go on Vercel. Deciding where it lives is the only thing blocking an end-to-end product,
and it is a decision, not a task.

---

## 2. Verified state

| Thing | State | How it was verified |
| --- | --- | --- |
| Repo | `github.com/billyribeiro-ux/trading-room-app` @ `7ee434c`, public, clean tree | `git status`, `git rev-parse` |
| Admin | live, Login/Register rendering, account + manage pages working | HTTP 200, markup fetched, screenshot |
| Controller tests | 45 files / 485 tests passing, `svelte-check` 0 errors | run from `apps/controller` |
| Room tests | 56 of 56 test files passing | run from `apps/room` |
| Room build | builds under BOTH `adapter-vercel` and `ADAPTER=node` | `vite build` twice |
| SFU | live on AWS Lightsail, `/health` → 200, valid TLS behind Caddy | `curl https://media.34-195-170-147.sslip.io/health` |
| Database | Neon Postgres — 1 user, 1 API key, 1 room | direct SQL against `DATABASE_URL` |
| Vercel | ONE project, `trading-room-app` (`prj_oxlP8Tig…`), owns both domains | `vercel project ls`, `vercel domains inspect` |
| PII | no real addresses or secrets in any tracked file | `git ls-files | xargs grep` |

### Repo layout

```
trading-room-app/
├─ apps/controller/   the admin — deployed to Vercel, live
├─ apps/room/         the room  — builds, NOT deployed
├─ services/media/    the Rust SFU — source for what runs on AWS
├─ ops/               Caddyfile, systemd units, env templates for the SFU box
├─ scripts/           set-vercel-env.sh, verify-deployed-config.mjs
└─ docs/              this file
```

`~/Desktop/new-room` and `~/Desktop/new-room-control` are now **read-only reference**. All captures
live in `new-room` and are symlinked into `apps/room` so evidence-bound tests can read them without
publishing them. `new-room-control/.env` and `.env.vercel-pull` still hold the values production was
configured from.

---

## 3. THE DECISION — where does the room live?

The room **cannot** deploy to Vercel. Two independent reasons, both from the code:

1. **`apps/room/src/lib/server/db/index.ts:7`** opens a SQLite file with WAL mode. Vercel's
   filesystem is read-only except `/tmp`, and `/tmp` is per-instance and ephemeral. Every request
   could hit a different, empty database.
2. **`apps/room/src/routes/sess/[room]/events/+server.ts`** serves a long-lived `text/event-stream`
   with a heartbeat — the room's realtime channel. A serverless function's bounded duration cuts it
   and the browser reconnect-loops. The route now declares `maxDuration: 800`, which makes that
   rarer, not absent.

This is the same reasoning `ADR 0003` used to move the controller off SQLite. The room is the last
holdout.

### Option A — put the room on a VM, beside the SFU

- **Needs:** a host with SSH. See §4a — the owner is leaving Lightsail, so this should go straight
  to the replacement rather than onto Lightsail and then move again.
- **Ready:** `ADAPTER=node` already builds; `ops/` holds the Caddyfile, both systemd units and the
  env templates.
- **Cost:** two databases — room data on SQLite, account data on Neon
- **Time:** hours

### Option B — migrate the room to Neon Postgres

- **Gets:** one database, one platform, the direction ADR 0003 was always heading
- **Cost:** schema port plus data migration — and the SSE constraint STILL argues against Vercel for
  this app, so it may not even buy the platform move
- **Time:** days

**DECIDED 2026-08-09: Option A**, and the owner is **leaving Lightsail** — so the room goes onto
whichever host replaces it, not onto Lightsail first. One migration, not two. Revisit the Postgres
question once it is not blocking a launch.

### Executing A — the checklist

1. Provision the replacement host (§4a) and get SSH to it. Lightsail is being retired.
2. Build the room with `ADAPTER=node pnpm --filter ./apps/room build`, which produces a Node server.
3. Install it beside the SFU. `ops/` already holds the Caddyfile and both systemd units — model the
   room's unit on `tradingroom-media.service`.
4. Give it a hostname on the existing Caddy (that host already terminates TLS for the SFU) and
   proxy to the room's port. The SFU's own `4443` is loopback-only; do not disturb it.
5. `.data/` needs a real directory with write permission — the SQLite file lives there, and that is
   the whole reason this is not on Vercel.
6. Set the room's env from `apps/room/.env.example`: `DATABASE_URL`, `MEDIA_WS_URL`
   (`wss://media.34-195-170-147.sslip.io/ws`), `CONTROL_BASE_URL` (`https://www.tradingroom.app`),
   `MEDIA_GRANT_PRIVATE_KEY`, and `ROOM_JWT_SECRET`.
7. **`ROOM_JWT_SECRET` must be the same value on both sides.** Rotate it to something ≥32 chars NOW,
   during this deploy, and set the new value on the room AND on Vercel in the same sitting — no
   handoff links exist yet, so this is the cheapest it will ever be.
8. Then set `ROOM_BASE_URL` on Vercel to the room's real URL and redeploy the controller.
9. Prove it end to end: create a room in the admin, click Launch, confirm the handoff token is
   accepted and the room loads.

---

## 4. Backend deployment — decided, and open

### Already decided and executed

- **Control plane database: Neon Postgres.** Not an open question — `.env.vercel-pull` carries
  `NEON_PROJECT_ID`, `PGHOST`, `DATABASE_URL_UNPOOLED`. It is provisioned and in use.
- **Admin hosting: Vercel.** Live, correct, and the one tier serverless genuinely suits — it is
  request/response with no durable local state.
- **SFU: AWS Lightsail**, instance `mediasoup-test-01`, `us-east-1a`, static IP `34.195.170.147`,
  Caddy TLS on 443 → loopback `127.0.0.1:4443`. Stage 1 of `MEDIASOUP-DEPLOYMENT-PLAN.md`, executed
  2026-08-02.

### 4a. What the ORIGINAL actually runs on — resolved 2026-08-09

Measured with `dig` and `whois`, not recalled:

```
protradingroom.com       ->  148.251.195.139   Hetzner Online GmbH, fsn1-dc12 Falkenstein, DE
                             172.98.193.74     Centrilogic, Inc., US
www.protradingroom.com   ->  same two
chat.protradingroom.com  ->  same two
```

Three findings that bear directly on the hosting decision:

1. **Two providers, two continents, deliberately.** Every hostname is dual-homed across a Hetzner
   box in Germany and a Centrilogic box in the US. Centrilogic is a managed-hosting/colo provider,
   not a hyperscaler.
2. **No AWS, GCP or Azure anywhere. No CDN in front** — the IPs answer directly.
3. **The room shares the site's hosts.** `chat.protradingroom.com` is not on separate media
   infrastructure; it resolves to the same pair. That is exactly the topology Option A describes.

The most useful detail is the split itself. Hetzner's US locations (Ashburn, Hillsboro) carry a much
smaller included-traffic allowance than its EU ones, so whoever built this appears to have solved US
latency with a DIFFERENT US provider rather than paying Hetzner's US traffic terms.

**Hetzner EU for bandwidth economics, a separate US provider for latency to US traders** is a
pattern the original is already using, and it is worth copying rather than re-deriving.

An earlier version of this document, and several statements in conversation, asserted
"Hetzner + Centrilogic" from memory before it was verified. It happened to be right; it was still
wrong to state. The commands above are cheap — re-run them rather than trusting this paragraph.

---

### The genuinely open question: where the SFU lives at launch

The deployment plan's ladder ends at **Stage 3 — two Lightsail Xlarge nodes, $168/month, 6 TB of
bundled transfer between them.** That number does not survive contact with this application's own
measurements.

`docs/streaming-choices.md` measured VP9 screen share on realistic chart content (13px monospace,
120 candlesticks, gridlines) at **3841 kbps**. An SFU sends that to *every* member — the presenter
uploads once and the server fans out.

| concurrent members | egress | 6h/day × 22 days |
| ---: | ---: | ---: |
| 25 | 96 Mbps | **5.7 TB/mo** |
| 100 | 384 Mbps | **22.8 TB/mo** |
| 250 | 960 Mbps | **57 TB/mo** |

So the bundle is exhausted at roughly **25 concurrent members**. AWS overage runs about $0.09/GB:
22 TB puts you near **$1,900/month in egress alone** on a $168/month box.

**This is why the original runs on Hetzner + Centrilogic with its own TURN** — hard evidence from
the captures, no AWS anywhere. Unmetered 1 Gbit on Hetzner dedicated is roughly €40–120/month flat
for the same traffic.

**Recommendation:**

| tier | host | why |
| --- | --- | --- |
| SFU | Hetzner dedicated, unmetered 1 Gbit | egress dominates every other cost |
| TURN | second Hetzner box, own IP | the reference runs its own; TURN relays media and is equally egress-heavy |
| Room | same box or beside it | needs a durable filesystem and long-lived connections |
| Control API | Hetzner CCX (dedicated vCPU) if/when the Rust API lands | no cold starts, long-lived connections |
| Postgres | **managed** (Neon today) | the system of record; paying for someone else's on-call is worth it here |
| Admin UI | ~~stay on Vercel~~ → **consolidate, see §4c** | superseded 2026-08-09: the owner is putting everything on one provider |

Lightsail was correct for Stage 1 and the plan says so itself — "a smoke/integration host, not a
production capacity claim". **The owner has decided to leave it**, so the ladder in
`MEDIASOUP-DEPLOYMENT-PLAN.md` beyond Stage 1 is superseded: Stage 2 and 3 should not be provisioned
on Lightsail.

**Before a second SFU node is worth buying, room-aware placement has to exist.** The plan says so
itself: routers, peers and producers are process-local, so two members of one room on two nodes
cannot exchange media, and ordinary round-robin DNS or an HTTP load balancer will do exactly that.
That is the real work between here and selling this — not the hosting choice.

**Open sub-questions:** whether Postgres stays managed or moves self-hosted; whether the marketing
site stays on Vercel or consolidates onto owned infrastructure.

---

## 4b. Hostnames and DNS — the plan

The original answers this for us. `chat.protradingroom.com` resolves to the **same two IPs** as the
apex (§4a), so the room is a SUBDOMAIN of the product's own domain pointing at the room host — not a
separate domain, and not one hostname per room.

### The target layout

| hostname | serves | host | state |
| --- | --- | --- | --- |
| `www.tradingroom.app` | admin / marketing | Vercel | **live** |
| `tradingroom.app` | 308 → `www` | Vercel | **live** |
| `chat.tradingroom.app` | **every room** | the room box | to create |
| `media.tradingroom.app` | the SFU | the SFU box | to create |

`chat` and `media` may be the same machine to begin with — the original does exactly that, and the
SFU host already runs Caddy with valid TLS, so adding a second site to it is a Caddyfile block.

### ONE hostname for all rooms, not one per room

In the reference every room is served by the single `chat.` host and identified in the URL, never in
the hostname:

```
/session?id=3627              the launch URL, from the account page's ng-href
/u/6a6529b318781e20ed81947d   the Room Link, built from publicId
/room/<vanitySlug>            the Vanity Link
/room/<uniqueSlug>            the Unique Link
```

That is the property to preserve: **creating a room is a database row, not a DNS record and not a
certificate.** A per-room hostname would mean a DNS API call and an ACME challenge on every signup,
and a wildcard certificate to avoid it — all to solve a problem the URL already solves.

### Retire the sslip.io hostname before launch

The SFU is currently reachable at `media.34-195-170-147.sslip.io`. sslip.io resolves any
IP-shaped name to that IP, which is a genuinely clever way to get a working TLS hostname with no DNS
at all — and a bad thing to launch on, because **the hostname contains the IP address**. Change
servers and every client that has cached, embedded or hard-coded that name breaks.

`media.tradingroom.app` costs one A record and removes that permanently. Do it as part of the move
off Lightsail, not after, so the name never has to change twice.

### Ordering — this matters

1. Provision the replacement host (§4a).
2. Create `chat` and `media` A records pointing at it. **Do not point them at the Lightsail IP** —
   it is being retired, and you would be re-pointing them within the week.
3. Let Caddy issue certificates for both. It does this automatically on first request, provided the
   DNS resolves and ports 80/443 are reachable.
4. Deploy the room, deploy/redirect the SFU.
5. **Only then** set `ROOM_BASE_URL=https://chat.tradingroom.app` on Vercel and redeploy the
   controller.

Step 5 last, on purpose: `ROOM_BASE_URL` is baked into every Launch link at page load, so pointing
it at a host that is not answering yet produces broken links rather than a pending one.

### What each host needs open

| host | ports | why |
| --- | --- | --- |
| `chat` | 80, 443 TCP | HTTP + the SSE stream. No UDP. |
| `media` | 80, 443 TCP | Caddy → loopback `127.0.0.1:4443` signalling |
| `media` | **40000–49999 UDP _and_ TCP** | WebRTC. Every transport opens both — `services/media/src/session.rs:858-890`. This is the requirement that rules out most cheap hosting. |

`MEDIA_ANNOUNCED_ADDRESS` must be the host's **public** address. The grant-enforcing build refuses
to start if an externally-bound service announces a loopback address —
`validate_announced_address_policy` in `services/media/src/main.rs`.

### Also worth knowing

- **`PUBLIC_SITE_ORIGIN`** is already `https://www.tradingroom.app` and is what every manage-page
  link is built from — Room Link, Vanity, Unique, registration, app-pair, and the WordPress
  shortcode. It is the ADMIN origin, not the room's; do not point it at `chat`.
- **`MEDIA_ALLOWED_ORIGIN`** must list the origin the ROOM is served from, since the SFU checks the
  browser `Origin` before admitting a grant (`services/media/src/server.rs:827-841`). When the room
  moves to `chat.tradingroom.app`, that value has to change with it or media admission fails.
- **TURN needs its own IP.** It relays media for members who cannot reach the SFU directly, so it is
  a second egress-heavy service. The original runs its own; budget it as a peer of the SFU, not an
  afterthought.

---

## 4c. Consolidation — one provider for everything

Decided direction 2026-08-09: stop splitting the app across Vercel and a VM. Put the application
tier on one provider. This section supersedes the "Admin UI — stay on Vercel" line in the §4 table.

### First: "the backend" is TWO things, and one of them has never run

This is the most important fact in this document for anyone planning infrastructure.

| # | thing | stack | data store | deployed |
| --- | --- | --- | --- | --- |
| 1 | **Controller / admin** | SvelteKit server routes + Drizzle | **Neon Postgres** | yes — Vercel |
| 2 | **Room** | SvelteKit server routes + SSE | **SQLite file** | **no** |
| 3 | **`services/api`** | **Rust / Axum + sqlx** | **Postgres** | **NEVER** |
| 4 | **`services/media`** | Rust mediasoup SFU | none (ephemeral) | yes — Lightsail |

**#3 deserves attention.** `services/api` is 75 tracked files with ten route modules:

```
account (3)   alerts (5)   join (2)     media (1)    messages (2)
moderation (11)  notes (9)  polls (10)  rooms (3)    mod.rs (30 route registrations)
```

It has its own migrations — `0001_baseline` through `0005_harden_runtime_role_and_room_events_policy`
— and the room already ships a client for it, `apps/room/src/lib/server/tradingroom-api.ts`, with
`CONTROL_BASE_URL` to point at it. It has never been deployed and the room has never called it.

Per **ADR 0003** that Rust API was always meant to BE the backend: SvelteKit owns rendering, Rust
owns authentication, tenancy, validation and media-grant issuance, PostgreSQL owns the data. Today
the SvelteKit controller talks to Neon directly and the Rust API sits idle.

So there are currently **two backends and the intended one is not running.** Whoever plans hosting
should know that before drawing a diagram.

### The target topology

```
Hetzner (one box to start, split later)
├── Caddy :80/:443 ─ automatic TLS, routes by hostname
│     ├── www.tradingroom.app    → controller   (SvelteKit, ADAPTER=node)
│     ├── chat.tradingroom.app   → room         (SvelteKit, ADAPTER=node)
│     └── media.tradingroom.app  → SFU signalling → loopback 127.0.0.1:4443
├── services/media ─ UDP + TCP 40000-49999, host networking
├── services/api ─── only if/when the cutover happens (see below)
└── .data/ ───────── the room's SQLite file, on a real disk

Neon ─────────────── PostgreSQL, stays managed
```

### What consolidation buys

- **One provider, one bill, one ops surface.** One place to look when something is wrong.
- **Flat bandwidth.** The entire reason for leaving AWS — see the egress table above.
- **No cross-provider hops** between controller, API and SFU.
- **It is what the original does.** Both of its hostnames resolve to the same pair of IPs (§4a);
  the room is not on separate infrastructure.
- **The room stops being a special case.** Its SQLite file and its SSE stream are only awkward
  because Vercel cannot host them. On a VM they are unremarkable.

### What it costs — stated honestly

- **Vercel's CDN** for marketing pages. Caddy can serve static assets well, but it is one origin,
  not an edge network. For a handful of marketing pages this is a small loss.
- **Preview deployments per pull request**, and one-click rollback. These are genuinely useful and
  you would be rebuilding them with a deploy script plus keeping the previous release directory.
- **You own uptime, restarts and TLS renewal.** Caddy automates certificates, and systemd handles
  restarts — `ops/` already contains working units — so this is smaller than it first sounds, but
  it is not zero.
- **`adapter-vercel` → `adapter-node` for the controller.** Both already build in this repo, so it
  is a config change, not a port. The room's `svelte.config.js` already selects by `ADAPTER`; do
  the same for the controller.

### What should NOT move

**PostgreSQL stays managed.** Self-hosting saves perhaps €20/month and buys backups, point-in-time
recovery, failover and a 3am pager. It is the system of record; this is the one tier where paying
for someone else's on-call is straightforwardly worth it. Neon today; any managed Postgres later.

### Sequencing — this matters more than the destination

**Move the hosting first. Change the architecture second. Never both at once.**

1. Provision the Hetzner host. Verify UDP 40000-49999 is permitted and check the included-traffic
   figure for that specific location (§4, §4a).
2. Create `chat` and `media` DNS records against it (§4b).
3. Deploy the SFU there; retire the Lightsail instance and the `sslip.io` hostname.
4. Deploy the room with `ADAPTER=node`. Rotate `ROOM_JWT_SECRET` on both sides in the same sitting.
5. Point `ROOM_BASE_URL` at `chat.tradingroom.app`, redeploy, prove Launch end to end.
6. Move the controller to `ADAPTER=node` behind the same Caddy. Keep the Vercel project until the
   new one is proven, then repoint DNS.
7. **Only then** consider deploying `services/api` and running the cutover in
   `docs/CUTOVER-ROOM-TO-API.md`.

Step 7 is a separate project with its own document. Bundling it into a hosting move means that when
something breaks you will not know which change caused it.

### One box or several?

Start with one. Split when a measurement says to, not before:

| symptom | action |
| --- | --- |
| approaching the bandwidth cap (~250 concurrent viewers on 1 Gbit) | move the SFU to its own box |
| SFU CPU saturating before bandwidth | add SFU nodes — but see below |
| the room's SSE connections exhausting file descriptors | tune limits first, then split |

**Adding a second SFU node requires room-aware placement, which does not exist.** Routers, peers
and producers are process-local, so two members of one room on two nodes cannot exchange media.
Round-robin DNS or an HTTP load balancer in front of two SFUs will do exactly that. This is the
real work between here and selling the product.

---

## 5. Do these next, in order

1. **Deploy the room** — Option A above. Unblocks items 2 and 3.
2. **Create the `chat` and `media` DNS records** against the new host — see §4b — and retire the
   `sslip.io` name while you are there.
3. **`ROOM_BASE_URL` is live and wrong.** It is `http://localhost:5174`, copied from a developer
   `.env`. Every Launch link on the account page currently points at a laptop. Only fixable once
   the room has a URL. `scripts/set-vercel-env.sh` now REFUSES to write a localhost URL, so this
   cannot recur.
4. **`ROOM_JWT_SECRET` is 9 characters.** It signs room handoff tokens valid 360 days that travel in
   URLs and browser history. Rotate it on the controller and the room **in the same moment** or
   every existing link breaks. Cheapest right now, while no links exist.
5. **Rotate the API key** in the UI. One row cannot be decrypted — see §7.
6. **Continue the manage-page audit** against `must-match/`. §6 has the method.

---

## 6. The audit method that works

`apps/controller/src/lib/manage-user-row-sbs.test.ts` compares our rendered user row against
`must-match/match` element for element. It drops `ng-hide` subtrees from the reference and `hidden`
elements from ours — what remains is what actually paints — and it currently matches **exactly**.
Unhiding a single icon fails it.

Extend that pattern per pane. The evidence:

| file | what it is |
| --- | --- |
| `new-room/must-match/important` | the complete manage page — tab strip + all six panes |
| `new-room/must-match/file1` | the same, minus the tab strip |
| `new-room/must-match/match` | one user row, the owner's |
| `new-room-control/evidence-dumps/login-page/logged-in-page` | the account page |

**Read them. Do not grep them.** Three separate wrong conclusions tonight came from searching:
a greedy regex that "found" a nested `<form>` that does not exist, an assertion anchored on a string
that also appears in a file's header JSDoc, and a PII sweep that flagged a vendor placeholder.

---

## 7. Open evidence gaps — recorded, never invented

- **`createNew()`** — the New Room handler. Three captures prove the control; none contains the
  function. It is in `/public/dist/app.min.js`, which is not on disk. Unknown: where a new room's
  NAME comes from. `scripts/collect-create-new.js` fetches the bundle and closes this.
- **`htmlDescChanged()`** — Save Editor Changes. Same bundle, same gap. The manage page loads
  angular-toaster but has **no `<toaster-container>`** in the captured DOM, and `bootbox` appears
  zero times — so the original probably shows nothing at all on save. We deliberately diverge and
  show a toast: a silent success is indistinguishable from a dead control.
- **`disabled="disabled"` on the editor toolbar** — 29 of 30 buttons carry it, still true in a
  capture taken after typing. Probably a focus gate; unproven. Ours stay enabled, because shipping a
  permanently dead toolbar is the more expensive way to be wrong.
- **`ptr_logo.png`** — the markup points at the reference's own path; the asset needs saving to
  `apps/controller/static/public/images/ptr_logo.png`. It is white-on-transparent, which is why the
  surrounding panel is `background-color: #000`.
- **The `" / manual"` token** on non-owner rows — four samples across both captures, all "manual",
  and an earlier capture read "login", so it is per-user. `room_users` has no column that could hold
  it. The slash renders alone rather than guessing.
- **One API key cannot be decrypted.** `API_KEY_ENCRYPTION_KEY` was regenerated during the Vercel
  move and the original was on a project this account can no longer reach. The account page now
  catches it and says "Secret cannot be decrypted with the current key — regen secret". Rotating in
  the UI writes a fresh envelope and heals the row.

---

## 8. Traps that already cost hours

- **Deploy from the repo ROOT.** The Vercel project's Root Directory is `apps/controller`;
  deploying from inside that folder makes it look for `apps/controller/apps/controller`.
- **Run test suites from inside the app** (`cd apps/controller && npx vitest run`). `--root` and
  `--dir` flags break path resolution and produce phantom failures.
- **zsh does not word-split unquoted variables.** `for x in $LIST` iterates once on the whole
  string. Use an array. This silently no-opped two loops.
- **Shell helper functions do not survive an `&&` chain** in zsh. One did not, and nine production
  secrets were written as empty strings while `vercel env add` reported success for every one.
- **Vercel returns `[SENSITIVE]` for sensitive env values on pull** — an 11-character string. A
  checker that reads values will score them as real and report nonsense failures.
- **Validate config at WRITE time**, not after. `set-vercel-env.sh` now refuses localhost URLs and
  short secrets before the call.
- **An empty console is information.** No error meant nothing was throwing, which meant hydration
  was fine and the handlers were firing — so the failure had to be a response being ignored. It was:
  43 `fail()` paths and nothing rendering them. Reading that correctly would have saved an evening.
