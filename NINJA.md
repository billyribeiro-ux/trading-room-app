# NINJA.md — everything left that needs YOU

Written 2026-08-14 23:13 EDT. This is the owner's list, and only that.

**Nothing here is blocked on effort on my side.** Every item that could be built from the evidence
has been built. What remains needs a host, an environment, a decision, or five minutes of a human at
a screen that browser automation cannot reach.

Work top to bottom — the order is by how much each unblocks, not by size. Item 1 alone closes four
rows of `TODO.md`.

**How to hand a step back to me:** finish it, then tell me which number you did. Where a step asks
for a value or an observation, paste it back verbatim.

---

## The state of play, in one table

| # | what | who/what it needs | unblocks |
| --- | --- | --- | --- |
| **1** | Stand up MediaMTX | a host + DNS + a real certificate | **4 rows** — AD, X, AC, and R's row 10 |
| **2** | Say one sentence | 30 seconds | T5-24, T5-25 |
| **3** | Create `apps/room/.env` | 2 minutes | item E |
| **4** | WordPress staging run | a live WordPress + WooCommerce | item Q |
| **5** | Measure screen-share quality | 5 minutes at a real desktop | R rows 6 and 8 |
| **6** | One DevTools reading | 30 seconds | the last evidence gap |

Two more are **decisions, not work**, and need no instructions — only your answer:

- **G** — Postgres host. Neon may not hold up: serverless autoscales *compute*, but the pressure here
  is sustained *connections* from long-lived room sessions, which is a different curve. Alternatives
  to weigh: Crunchy Bridge, RDS, or self-managed beside the app tier. Not urgent at one user.
- **H** — production topology. Media plane should be separated from the app tier. What is deployed
  today is a five-day TEST topology: one box means a shared failure domain, a shared attack surface
  (~10,000 open UDP ports beside your session cookies) and a shared lifecycle. Separating later is a
  redeploy, not a migration.

---

# 1. Stand up MediaMTX

**Unblocks four rows at once**, and it is the only thing standing between the streaming path and
being proven end to end. Everything else in that feature is built, tested and pushed.

> **Full runbook: `ops/mediamtx/README.md`.** Follow it start to finish. This section is the shape
> and the traps, not a replacement for it.

### 1a. Before you install anything

| you need | why |
| --- | --- |
| A host with a **static public IPv4** | WebRTC announces an address to clients; a changing one breaks ICE |
| A DNS name for playback, e.g. `stream.<domain>` | becomes `STREAM_SERVER_MTX`; browsers fetch `https://<that>/…/index.m3u8` |
| **A real certificate for that name** | not self-signed — see the trap below |
| Caddy on the same host | terminates TLS for HLS |
| The controller reachable over HTTPS | MediaMTX calls it on **every** publish and **every** read |
| The room reachable over HTTPS | the `runOnAvailable` hook POSTs to it |

**Its own host is preferable to sharing with the SFU.** WHIP ingest, HLS remuxing and mediasoup all
compete for CPU, and a stream stuttering because a screenshare spiked is hard to diagnose from
either side.

> ⚠️ **A self-signed certificate makes OBS fail with an opaque handshake error that reads exactly
> like a wrong stream key.** Budget an hour of looking in the wrong place if you skip this.

### 1b. Ports — open these four and nothing else

| port | proto | what |
| --- | --- | --- |
| 8889 | TCP | WHIP handshake, TLS |
| **8189** | **UDP** | **WebRTC ICE / media** |
| 1936 | TCP | RTMPS ingest, TLS |
| 443 | TCP | HLS, via Caddy |

> ⚠️ **UDP/8189 is the one that gets forgotten.** Without it a WHIP publish completes its handshake
> and then sends no media — which looks like a broken encoder, not a closed port.

> ⚠️ **Do not open 9997.** That is the control API and it can create and delete paths. The rendered
> config binds it to `127.0.0.1`; upstream's default is `:9997`, which binds every interface.

> ⚠️ **Not 1935.** Plaintext RTMP is refused by `rtmpEncryption: strict` and its listener never
> starts. This is deliberate — see 1e.

### 1c. Install

1. Start from a reviewed revision. Record it.
2. Resolve the image **digest**, never a tag — a tag lets a restart change what runs with nothing in
   Git changing:
   ```bash
   docker buildx imagetools inspect bluenviron/mediamtx:v1.20.0
   ```
3. Generate the hook secret and keep it — you need the identical value twice:
   ```bash
   openssl rand -base64 48
   ```
4. Render `mediamtx.yml`, `mediamtx.env`, `mediamtx-image.env`, `caddy.env` and the Caddyfile from
   the `.example` files in `ops/mediamtx/`, replacing every `<angle-bracket>` placeholder. Install
   under `/etc/tradingroom-mediamtx`, `chmod 600` and root-owned for anything holding the secret.
5. Install the unit, then:
   ```bash
   systemctl daemon-reload && systemctl enable --now tradingroom-mediamtx
   ```
6. Put the TLS key and certificate at `/etc/tradingroom-mediamtx/tls/`, readable by the container
   and nothing else.
7. Open the four ports from 1b.

### 1d. Set three variables and restart both apps

| app | variable | value |
| --- | --- | --- |
| controller | `STREAM_SERVER_MTX` | `stream.<domain>` — **host only, no scheme, no port** |
| room | `MEDIA_HOOK_SECRET` | the `openssl` value from step 3, identical to `mediamtx.env` |
| room | `MEDIA_API_URL` | `http://127.0.0.1:9997` |

> ⚠️ `MEDIA_API_URL` is the **internal** address. Pointing it at the public host would expose the
> control API in order to reach it.

### 1e. Prove it, in this order

Each step fails for exactly one reason, which is why they are separate.

```bash
# 1. The server is up, and the API is loopback-only.
curl -fsS http://127.0.0.1:9997/v3/paths/list | jq '.itemCount'
curl -fsS --max-time 3 http://<public-ip>:9997/v3/paths/list && echo "LEAKING" || echo "closed"

# 2. The controller is reachable from the media host and refuses a nonsense token.
curl -si -X POST https://<controller-host>/internal/media-auth \
  -H 'content-type: application/json' \
  -d '{"action":"read","path":"room__x__y","query":"jwt=nope","protocol":"hls"}' | head -1
# expect: HTTP/2 401

# 3. The hook refuses without the bearer.
curl -si -X POST https://<room-host>/internal/media-hook \
  -H 'content-type: application/json' \
  -d '{"event":"available","path":"room__x__y"}' | head -1
# expect: HTTP/2 401
```

**Then end to end.** Open a room as a presenter, take the OBS panel's Server and Stream Key, publish,
and confirm **all four**:

- [ ] the path appears in `/v3/paths/list` with `"available": true`
- [ ] the Streams tab appears for a viewer
- [ ] the tab appears **within a second** (that is the hook) **and** still appears after
      `systemctl restart` of the room (that is the reconcile)
- [ ] stopping the encoder removes it

> If the tab appears only after ~5 seconds, the hook is failing and the reconcile is covering for it.
> Check the media host's journal for the `curl`.

### 1f. The traps that will cost you a day

**`hlsAllowOrigins` is plural and an array.** The playlist is fetched from a different origin than
the page, so it must list the room's origin. Wrong value → playback fails in the browser with a CORS
error and **MediaMTX logs nothing**, because from its side the request succeeded.

**⛔ NEVER add `- action: read` to `authHTTPExclude`.** An earlier draft of our own documentation
recommended exactly that. It would serve **every room's video to anyone who guesses a path**.

**Caddy must not strip the query string.** `?jwt=` is the credential. `reverse_proxy` forwards it
untouched; a `rewrite` or `uri strip_prefix` in front can drop it, and every playback then 401s with
nothing obviously wrong.

**Auth is not cached — one POST to the controller per HLS segment request.** With
`hlsVariant: lowLatency` that is several per second **per viewer**; a 200-viewer room is a sustained
few hundred requests per second against `/internal/media-auth`. Measure it before a large session.

**Both ingest paths are encrypted and the reference's are not.** This is our one deliberate
divergence here, and it is about the credential rather than the protocol: these URLs carry a
**publish token that lives for thirty days**, and presenters stream from hotel and conference
networks. A deployment that skips the certificate gets publish URLs that refuse to connect — which
is the correct direction to fail. Refusing to publish is recoverable in a minute; a publish
credential read off a conference network is not.

### 1g. Related reading

- `apps/room/docs/OBS-XSPLIT-SETUP.md` — operator and presenter instructions
- `apps/room/docs/OBS-XSPLIT-INGEST.md` — the contract

---

# 2. Say one sentence — unblocks T5-24 and T5-25

**Four attempts at this have been refused** by a credential guard whose bar is *named + specifics*.
A general "match the original" does not clear it, and the edit was explicitly reverted once on
request. **Do not ask me to try a fifth time without this.**

Paste this back to me **verbatim**:

> Render the room's `ssoJWTSecret` in the WordPress shortcode, and `pairSecretKey` in the app-pair
> sample link, on the manage Settings tab, as the original does.

**Why it matters, so the decision is informed rather than mechanical:** the shortcode is COPIED into
WordPress, where the plugin signs the SSO handoff with that key. Empty means **every handoff fails,
and it renders identically to a working one** — there is no visible difference until a customer
cannot get in.

- Evidence: `page.manageSession.html:782`, and the display block at `1138-1142`.
- The endpoint behind T5-25 already exists with ten green tests. Only the display is missing.

---

# 3. Create `apps/room/.env` — unblocks item E

Three separate things are missing here, and all three are yours.

```bash
# 1. Generate ONE secret. It must be byte-identical in both apps.
openssl rand -hex 32
```

```ini
# 2. apps/room/.env   — THIS FILE DOES NOT EXIST TODAY
CONTROL_BASE_URL=http://127.0.0.1:5173
ROOM_JWT_SECRET=<the value from step 1>
```

```ini
# 3. apps/controller/.env  — add the SAME value; it is currently in neither app
ROOM_JWT_SECRET=<the same value from step 1>
```

- **`ROOM_JWT_SECRET` must match byte for byte** or every Launch link is rejected. It is currently in
  neither file — 0 occurrences in `apps/controller/.env`.
- **The port is 5173, not 5180.** The controller's dev port is 5173 (`apps/controller/vite.config.ts`),
  the room's is 5174. Port **5180 on your machine is a different project** (`Desktop/trick-trades`) —
  a first run of the seam probe reached it and got a 404 from `/register`.
- `apps/room/.env.example` lists the other seven variables the room understands.

**What this unblocks:** `apps/room/scripts/room-config-seam-e2e.mjs` — it flips `hideChatAlerts` and
`isChatOnlyRoom` on the Manage page and reads whether `.alert-chat-box` and `.presentation-box` are
in the room's DOM. The assertions are written; the probe has never been run.

> This was not fixed for you because provisioning a shared secret is an owner decision, and inventing
> one to make a probe go green is the opposite of what these files are for.

---

# 4. WordPress staging run — unblocks item Q

> **Runbook: `integrations/wordpress/STAGING-TEST.md`** — a step-by-step checklist.

**Already proven, so you do not need to re-do it:** the PHP is executed and clean under **PHP
8.3.33** (`php -l`), and `tests/mint-golden-token.php` mints a token with the plugin's OWN
`tradingroom_sso_entitlements()` and `tradingroom_sso_mint()`. That exact token is committed as
`tests/golden-token.json` and verified by `sso-wordpress-contract.test.ts`, with a negative control:
tampering one signature byte fails it. Both ran in a container, so no local PHP is needed.

**What still needs a real site:**

- [ ] Boot the plugin inside WordPress against a staging WooCommerce
- [ ] Click through as a paid member and reach a room
- [ ] **§6 — cancel the subscription and prove the door closes on the next entry**

That last step is the one that closes the row. Only it exercises
`wc_memberships_get_user_active_memberships`, `wcs_get_users_subscriptions`, the settings screen and
the cached-page path.

---

# 5. Measure screen-share quality — 5 minutes, unblocks R rows 6 and 8

> **Runbook: `apps/room/docs/MEASURE-SHARE-QUALITY.md`** — the written procedure, including what
> each possible result means.

This needs a human because `getDisplayMedia` requires an OS screen-picker dialog that browser
automation cannot click.

**Two conditions, both learned by getting it wrong:**

1. **A real desktop with a member attached.** Headless `getDisplayMedia` returns Chrome's synthetic
   gradient, which compresses too easily to show any difference — which is why the doc's own 525 kbps
   figure is not the real number. Read `outbound-rtp` from `getStats()` before and after each change.
2. **Close the other tabs first, in the order the doc gives.** An attempt on 2026-08-11 was abandoned
   because `chrome://webrtc-internals` lists every page in the *browser*, and six Simpler Trading
   tabs plus two ChatGPT tabs were each contributing their own connections.

**What it decides:** row 6 (raising the 1920 cap for Retina — every member pays that bandwidth) and
row 8 (an explicit `maxBitrate` — a floor is exactly what hurts the member on the worst connection).
Both were deliberately NOT taken without the measurement.

*Already done and needing nothing from you:* row 4 (VP9 at 8 Mbps) and row 2 (`contentHint = 'detail'`).

---

# 6. One DevTools reading — 30 seconds, closes the last evidence gap

Open a note, insert a carousel, and run this in the DevTools console:

```js
document.querySelector('[data-ptr-carousel]').getAttribute('style')
```

**Tell me which one you see:**

- `background:#111` → nothing to do. It was a jsdom artefact, as expected.
- `background: rgb(17, 17, 17)` → both sanitiser allow-lists need a second accepted form, or **every
  carousel saved through our editor loses its black backing**.

**Why this is a question at all:** under jsdom, Tiptap's `getHTML()` returns CSSOM-normalised styles.
`safe-html.ts` and `apps/controller/src/lib/server/notes.ts:123` accept `background` only as
`/^#111$/i`. I did not widen either allow-list on the strength of a jsdom observation — Chrome
preserves a `setAttribute('style', …)` value verbatim, and the server sanitiser is `sanitize-html`
over `htmlparser2`, a string parser with no CSSOM at all. So it is almost certainly nothing. One
look settles it either way, and it blocks nothing meanwhile.

---

# Two things about CI, so they do not cost you again

**The account is out of minutes**, and that is the cause of the current red backend job — not a code
defect. Two consequences worth knowing:

1. **Pushing to a branch with an OPEN PR spends minutes.** Both workflows trigger on `pull_request`
   and on `push` to `main`, and on nothing else. With **no open PR**, pushing to a feature branch
   triggers nothing at all. If you want free pushes while we finish, close PR #28 and reopen it for
   the single tune-up run at the end.
2. **A green PR check has never proven the backend.** That job skips every step on a pull request
   whose diff touches no backend path — by design, and it says so in its own skip notice. So a
   "green" PR run can mean *the suite never ran*. `main` is where backend rot surfaces. Do not read a
   green PR as proof the Rust and PostgreSQL contracts ran.

---

# What I would do first

**Item 1.** It is the only one that unblocks four rows, and it is the last thing between the
streaming path and being proven end to end.

**Then 2 and 3** — roughly two minutes each of your time, and each unblocks real work on my side
immediately.

**4, 5 and 6 can wait** without blocking anything I can do meanwhile.
