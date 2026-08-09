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

### Option A — put the room on the Lightsail box, beside the SFU

- **Needs:** SSH access to `34.195.170.147` (port 22 is open; no key on this machine)
- **Ready:** `ADAPTER=node` already builds; `ops/` holds the Caddyfile, both systemd units and the
  env templates; that host already runs Caddy with valid TLS
- **Cost:** two databases — room data on SQLite, account data on Neon
- **Time:** hours

### Option B — migrate the room to Neon Postgres

- **Gets:** one database, one platform, the direction ADR 0003 was always heading
- **Cost:** schema port plus data migration — and the SSE constraint STILL argues against Vercel for
  this app, so it may not even buy the platform move
- **Time:** days

**DECIDED 2026-08-09: Option A.** The owner chose A. Get the room onto the Lightsail box beside the
SFU; revisit the Postgres migration once it is not blocking a launch.

### Executing A — the checklist

1. SSH to `34.195.170.147` (port 22 open; no key on this machine yet).
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
| Admin UI | stay on Vercel | pure rendering, no UDP, no state |

Lightsail was correct for Stage 1 and the plan says so itself — "a smoke/integration host, not a
production capacity claim". Nothing needs to move today. The decision is due before real load.

**Open sub-questions:** whether Postgres stays managed or moves self-hosted; whether the marketing
site stays on Vercel or consolidates onto owned infrastructure.

---

## 5. Do these next, in order

1. **Deploy the room** — Option A above. Unblocks items 2 and 3.
2. **`ROOM_BASE_URL` is live and wrong.** It is `http://localhost:5174`, copied from a developer
   `.env`. Every Launch link on the account page currently points at a laptop. Only fixable once
   the room has a URL. `scripts/set-vercel-env.sh` now REFUSES to write a localhost URL, so this
   cannot recur.
3. **`ROOM_JWT_SECRET` is 9 characters.** It signs room handoff tokens valid 360 days that travel in
   URLs and browser history. Rotate it on the controller and the room **in the same moment** or
   every existing link breaks. Cheapest right now, while no links exist.
4. **Rotate the API key** in the UI. One row cannot be decrypted — see §7.
5. **Continue the manage-page audit** against `must-match/`. §6 has the method.

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
