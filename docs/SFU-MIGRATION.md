# Move the SFU off AWS — a brief for the next session

> ## DONE 2026-08-09 12:44 EDT — the SFU runs on the Hetzner box
>
> `media.tradingroom.app` serves the media service instead of its 503 placeholder. Built on the box
> (`tradingroom-media:local`, 71.8MB), keypair generated there, `tradingroom-media.service` enabled
> and healthy, Caddy proxying `/health` and `/ws` only. `GET /health` → 200; `/` → 404; an ungranted
> `/ws` upgrade → 400 with `workerDeaths: 0`.
>
> **Three things below are still open, and steps 1–4 are now history rather than instructions:**
>
> 1. **The two-browser screen-share test — step 5, and the only proof that matters.** Not run.
> 2. ~~The Hetzner CLOUD firewall is still unverified.~~ **RESOLVED 2026-08-09 — TCP on the RTC
>    range is NOT blocked, so the caveat at the end of this document does not apply.** Measured from
>    outside the box, which is the only place the cloud firewall is visible: TCP 40000, 40100 and
>    40199 all answer **RST — "connection refused", immediately**, not a timeout. A dropped packet
>    times out; a refused one means the SYN reached the host and the host answered. There is no
>    listener because mediasoup binds an RTC port only when a transport is created, which is
>    expected. **A UDP-blocked client will therefore fall back to TCP as designed.**
>
>    That probe found something else, and it is a hardening gap rather than a media one: **TCP 40500
>    — outside the configured range entirely — is refused just as fast**, which means every TCP port
>    on this host is reachable from the internet. Combined with `ufw inactive` and iptables INPUT
>    `ACCEPT` on the box, there is effectively **no firewall at either layer**. Nothing is exposed
>    today that should not be (signalling is bound to loopback, the room to loopback, Caddy owns
>    80/443, sshd owns 22), but the next service that binds `0.0.0.0` is public the moment it
>    starts. Recorded as work item **L** in `TODO.md`.
> 3. **Lightsail is still running and still billing.** Retire it only after step 5 passes.
>
> One correction to step 3 below, found by reading `ops/mediasoup/Caddyfile.example` against the
> deployment: the bare `reverse_proxy 127.0.0.1:4443` shown there is a SIMPLIFICATION of that ops
> file, which is the real contract — `/health` and `/ws` only, 404 for everything else, plus four
> security headers. The deployment follows the ops file. See `CHANGELOG.md` 2026-08-09 12:44.

Written 2026-08-09, immediately after the room was deployed. This is the last piece between here and
a working product: the room loads and the handoff works, but **there is no screen share and no audio
until this is done.**

Read `docs/DEPLOYMENT.md` first. It describes the box you are working on.

---

## The one-paragraph brief

The mediasoup SFU currently runs on **AWS Lightsail** (`mediasoup-test-01`, `34.195.170.147`,
reachable at `https://media.34-195-170-147.sslip.io`). It must move to the **Hetzner box**
(`87.99.154.155`, Ashburn) where the room now runs, and be served at
**`media.tradingroom.app`** — which already resolves there, already has a valid certificate, and
currently answers a 503 placeholder. When it is done, the `sslip.io` hostname is retired and the
Lightsail instance is deleted.

---

## Why it has to move at all

Two reasons, and the second is the one that forces the timing.

1. **Cost at scale.** `docs/streaming-choices.md` measured VP9 screen share on realistic chart
   content at **3841 kbps per member**. An SFU sends that to every member. 100 concurrent members is
   ~22.8 TB/month; Lightsail bundles 6 TB and charges ~$0.09/GB over — roughly **$1,900/month** in
   egress. Hetzner's overage is **€1/TB**. See `NEXT-SESSION.md` §4.
2. **`MEDIA_ALLOWED_ORIGIN`.** The SFU checks the browser `Origin` before admitting a grant
   (`services/media/src/server.rs:827-841`). The room is now served from
   `https://chat.tradingroom.app`, so the AWS instance would reject every grant unless its
   allowed-origin is changed — and nobody in this session had SSH to that box. Moving is simpler
   than reaching it.

---

## What is already in place

| | |
| --- | --- |
| `media.tradingroom.app` | resolves to `87.99.154.155`, **valid certificate already issued** |
| Caddy | running, and its `media` block is a 503 placeholder ready to become a reverse proxy |
| Docker | **29.7.2 installed and active** on the box |
| Firewall | TCP 22/80/443, **UDP any**, and a TCP RTC range — **verify it, Step 0a** |
| `ops/` | Caddyfile example, `tradingroom-media.service`, `media.env.example`, `caddy.env.example` |
| Source | `services/media/`, Rust **1.97.1** pinned in `services/rust-toolchain.toml` |

---

## Step 0 — do these THREE things before touching anything else

Each is a fail-hard that looks like an unrelated bug if you are not expecting it. Together they are
the difference between an afternoon and an evening.

**0a. Verify the firewall's TCP RTC range. This is the FIRST debugging step, not the last.**

During setup the Hetzner console **refused a TCP port range**. What is configured is UDP `any`; the
TCP rule on `40000-49999` **may be absent**. mediasoup opens both a UDP and a TCP listener per
transport (`services/media/src/session.rs:858-890`), and the TCP one is the fallback for clients on
UDP-blocking networks.

The failure mode is the expensive one: **silent, and invisible from your own machine.** Everything
works from a normal network, and anyone behind a corporate firewall simply never connects, with no
error to read. Open the Hetzner console, look at the rule, and fix it before you conclude the SFU
is broken.

If TCP on the range is missing and the console still refuses it, narrow BOTH sides to something it
accepts — `40000-40999` — and set `MEDIA_RTC_PORT_MAX` to match. `Config::validate` requires ≥100
ports per worker, so 1,000 is ample for testing.

**0b. Decide the build strategy up front — do not discover the OOM.**

The box is **1.9 GB with 2 GB swap**. A Rust release build of mediasoup is the likeliest place in
this whole job to lose time. Either accept a slow in-place build with `CARGO_BUILD_JOBS=1`, or build
the image somewhere with real memory and move it:

```bash
docker save tradingroom-media:latest | gzip | ssh root@87.99.154.155 'gunzip | docker load'
```

Choose before you start. Deciding after an OOM costs the whole first attempt.

**0c. Know that two env vars fail hard, and how each looks.**

| variable | wrong value | symptom |
| --- | --- | --- |
| `MEDIA_ALLOWED_ORIGIN` | anything but `https://chat.tradingroom.app` | **every grant rejected** — looks like an auth bug, is a config bug |
| `MEDIA_ANNOUNCED_ADDRESS` | loopback, or unset | **the service refuses to start** — `validate_announced_address_policy` in `main.rs` |

Both are better wrong-and-loud than silently degraded, which is why they were built that way. But
neither error mentions the variable that caused it unless you already suspect it.

---

## The steps

### 1. Build the image on the box

`services/media/Dockerfile` is the build. Note `docs/MEDIASOUP-DEPLOYMENT-PLAN.md`: **the container
topology requires Linux host networking** (`--network host`), because publishing 10,000 UDP ports as
Docker mappings creates a userland proxy per port and exhausts file descriptors.

Build strategy — in-place or `docker save`/`load` — is **Step 0b**, and is decided before you get
here.

### 2. Configure it

From `ops/mediasoup/media.env.example`. The values that matter here:

| variable | value | why |
| --- | --- | --- |
| `MEDIA_ANNOUNCED_ADDRESS` | `87.99.154.155` | the PUBLIC address. `validate_announced_address_policy` in `main.rs` refuses to start if an externally-bound service announces loopback |
| `MEDIA_ALLOWED_ORIGIN` | `https://chat.tradingroom.app` | the room's origin. Wrong value = every grant rejected |
| `MEDIA_BIND_ADDRESS` | `127.0.0.1:4443` | Caddy is the only thing that should reach signalling |
| `MEDIA_RTC_PORT_MIN` / `MAX` | see Step 0a | must match what the firewall actually allows |
| `MEDIA_GRANT_PUBLIC_KEY` | pair with the room's `MEDIA_GRANT_PRIVATE_KEY` | the room mints grants; the SFU verifies them |

### 3. Point Caddy at it

Replace the placeholder in `/etc/caddy/Caddyfile`:

```
media.tradingroom.app {
	reverse_proxy 127.0.0.1:4443
}
```

Signalling is a WebSocket; Caddy proxies those without extra configuration. **Do not add a
`log { output file … }` block** — the packaged unit's `ProtectSystem` does not grant
`/var/log/caddy` and Caddy will fail to START, not merely fail to log. That already happened once.

### 4. Then update the room

`/opt/trading-room-app/room/.env` already has
`MEDIA_WS_URL=wss://media.tradingroom.app/ws`, so it needs no change — but it does need
`MEDIA_GRANT_PRIVATE_KEY`, which is **not set yet**. Add it, then
`systemctl restart trading-room-app`.

### 5. Prove it, then retire the old one

Create a room in the admin, click Launch, and confirm with **two browsers**:

- the handoff token is accepted and the room loads
- a screen share from one appears in the other
- `getStats()` shows frames actually decoding, not just a connection

Only then: delete the Lightsail instance and stop using the `sslip.io` name. **Never ship that
hostname** — it embeds the IP, so changing servers breaks every client that cached it.

---

## Facts worth having before you start

- **One room = one router = one worker = one core.** Adding a second SFU node needs **room-aware
  placement**, which does not exist. Round-robin DNS or an HTTP load balancer in front of two SFUs
  will put two members of the same room on isolated in-memory routers that cannot exchange media.
  One box only, for now.
- **Bandwidth binds before CPU.** At 3841 kbps per member, 1 Gbit is ~260 concurrent viewers
  regardless of how many cores are idle.
- **The box is a five-day test.** A *stopped* Hetzner server still bills; only deletion stops it.
  Snapshot before deleting.

## The prompt to open that session with

> Read `docs/DEPLOYMENT.md` and `docs/SFU-MIGRATION.md` in trading-room-app, and do **Step 0**
> before anything else — all three parts of it.
>
> The room is deployed at `chat.tradingroom.app` on the Hetzner box `87.99.154.155` (SSH as root,
> key already authorised). `media.tradingroom.app` resolves there with a valid certificate and
> answers a 503 placeholder. Move the mediasoup SFU from AWS Lightsail onto that box, serve it at
> `media.tradingroom.app`, wire `MEDIA_GRANT_PRIVATE_KEY` into the room, and prove a screen share
> works between two browsers before retiring the Lightsail instance.
