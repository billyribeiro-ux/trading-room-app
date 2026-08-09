# Move the SFU off AWS — a brief for the next session

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
| Firewall | TCP 22/80/443, **UDP any**, and a TCP RTC range — see the caveat below |
| `ops/` | Caddyfile example, `tradingroom-media.service`, `media.env.example`, `caddy.env.example` |
| Source | `services/media/`, Rust **1.97.1** pinned in `services/rust-toolchain.toml` |

---

## The steps

### 1. Build the image on the box

`services/media/Dockerfile` is the build. Note `docs/MEDIASOUP-DEPLOYMENT-PLAN.md`: **the container
topology requires Linux host networking** (`--network host`), because publishing 10,000 UDP ports as
Docker mappings creates a userland proxy per port and exhausts file descriptors.

**Watch the memory.** The box is 1.9 GB with 2 GB swap. A Rust release build of mediasoup is heavy;
if it OOMs, either lower codegen parallelism (`CARGO_BUILD_JOBS=1`) or build the image elsewhere and
ship it with `docker save` / `docker load`.

### 2. Configure it

From `ops/mediasoup/media.env.example`. The values that matter here:

| variable | value | why |
| --- | --- | --- |
| `MEDIA_ANNOUNCED_ADDRESS` | `87.99.154.155` | the PUBLIC address. `validate_announced_address_policy` in `main.rs` refuses to start if an externally-bound service announces loopback |
| `MEDIA_ALLOWED_ORIGIN` | `https://chat.tradingroom.app` | the room's origin. Wrong value = every grant rejected |
| `MEDIA_BIND_ADDRESS` | `127.0.0.1:4443` | Caddy is the only thing that should reach signalling |
| `MEDIA_RTC_PORT_MIN` / `MAX` | see the firewall caveat | must match what the firewall actually allows |
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

## The firewall caveat — read this before debugging connectivity

During setup the Hetzner firewall **would not accept a TCP port range** for `40000-49999`. What is
actually configured is:

- **UDP: any** — the normal WebRTC path, fully covered
- **TCP on the RTC range: possibly absent**

mediasoup opens **both** a UDP and a TCP listener per transport
(`services/media/src/session.rs:858-890`). The TCP one is the fallback for clients on networks that
block UDP — typically locked-down corporate firewalls. So:

- ordinary home and office networks will work on UDP alone
- someone behind a UDP-blocking network will fail **silently**

**Verify the rule in the Hetzner console before concluding the SFU is broken.** If TCP on the range
is missing, either add it or narrow both sides to something the console accepts (e.g.
`40000-40999`) and set `MEDIA_RTC_PORT_MAX` to match. `Config::validate` requires ≥100 ports per
worker; 1,000 is ample for testing.

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

> Read `docs/DEPLOYMENT.md` and `docs/SFU-MIGRATION.md` in trading-room-app. The room is deployed at
> `chat.tradingroom.app` on the Hetzner box `87.99.154.155` (SSH as root, key already authorised).
> `media.tradingroom.app` resolves there with a valid certificate and answers a 503 placeholder.
> Move the mediasoup SFU from AWS Lightsail onto that box, serve it at `media.tradingroom.app`, wire
> `MEDIA_GRANT_PRIVATE_KEY` into the room, and prove a screen share works between two browsers before
> retiring the Lightsail instance. Check the firewall's TCP RTC range first — see the caveat.
