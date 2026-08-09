# Deployment — what runs where

Written 2026-08-09, the day the room was first deployed. Everything below was verified on the box,
not planned.

---

## The hosts

| host | serves | where | state |
| --- | --- | --- | --- |
| `www.tradingroom.app` | admin / marketing | **Vercel**, project `trading-room-app` (`prj_oxlP8Tig…`) | live |
| `tradingroom.app` | 308 → `www` | Vercel | live |
| `chat.tradingroom.app` | **the room, all rooms** | **Hetzner `87.99.154.155`**, Ashburn VA | **live** |
| `media.tradingroom.app` | the SFU | same box | **503 placeholder — SFU not yet moved** |
| — | mediasoup SFU | AWS Lightsail `mediasoup-test-01` | still running, to be retired |
| — | PostgreSQL | **Neon** | live |

DNS is at **Porkbun** (`curitiba.ns.porkbun.com`). `www` is a CNAME to Vercel; `chat` and `media`
are A records to the Hetzner box. Records must be added at Porkbun — adding them in Vercel does
nothing, because Vercel is not the nameserver. That mistake cost a round trip on day one.

---

## The box

```
Hetzner Cloud CCX-class, Ashburn VA — 87.99.154.155
Ubuntu 26.04 LTS · 2 vCPU · 1.9 GB RAM + 2 GB swap · 38 GB disk

/opt/trading-room-app/
└── room/
    ├── build/          the SvelteKit node-adapter output, built LOCALLY and shipped
    ├── node_modules/   production deps, installed ON the box
    ├── .data/          the SQLite file — the only writable path the service has
    └── .env            mode 600, owned by tradingroomapp
```

**Why the build is local and the install is remote.** `vite build` on 1.9 GB would OOM, so the
build happens on a developer machine and the output is shipped. But `better-sqlite3` is a NATIVE
module — a macOS build cannot run on Linux — so `npm install --omit=dev` runs on the server, where
it compiles for the right target. Verified: `better-sqlite3` opens a database on this box.

**Swap exists because the box shipped with none.** A Node process that briefly spikes on a 1.9 GB
machine gets OOM-killed; 2 GB of swap turns that into a slowdown instead.

### Services

| unit | what | notes |
| --- | --- | --- |
| `caddy` | TLS + reverse proxy | Caddy 2.11.4, certs auto-issued and auto-renewing |
| `trading-room-app` | the room | node 22, bound to `127.0.0.1:3000`, `Restart=always` |
| `docker` | for the SFU build | installed, nothing running yet |

The room listens on **loopback only**. Caddy is the sole thing that reaches it, so the app never
terminates TLS and is never exposed directly.

Hardening on the unit: `NoNewPrivileges`, `ProtectSystem=strict`, `ProtectHome`, `PrivateTmp`,
`ProtectKernelTunables`, `RestrictSUIDSGID`, and `ReadWritePaths` limited to `.data` — which is the
only directory the SQLite file and its WAL sidecars need.

### Caddy

Access logs go to the **journal**, not to files. A `log { output file … }` block makes the packaged
unit fail to START rather than merely fail to log, because its `ProtectSystem` does not grant
`/var/log/caddy`. That is how this configuration first came up dead. Read logs with
`journalctl -u caddy -f`.

The `chat` block carries two settings that are not defaults and are not optional:

```
flush_interval -1        # do not buffer — the room's SSE stream would arrive in bursts
read_timeout 24h         # do not sever a stream that is deliberately idle between events
write_timeout 24h
```

That endpoint's natural lifetime is hours. Default proxy behaviour breaks it.

---

## Secrets — the state as of 2026-08-09

| variable | where | value |
| --- | --- | --- |
| `ROOM_JWT_SECRET` | **both** the room's `.env` and Vercel | **rotated to 64 hex chars**, verified byte-identical on both sides |
| `ROOM_BASE_URL` | Vercel | **`https://chat.tradingroom.app`** — was `http://localhost:5174` |
| `DATABASE_URL` (room) | room `.env` | a FILE PATH, not a connection string |
| `DATABASE_URL` (controller) | Vercel | Neon PostgreSQL |
| `CONTROL_BASE_URL` | room `.env` | `https://www.tradingroom.app` |
| `MEDIA_WS_URL` | room `.env` | `wss://media.tradingroom.app/ws` — points at the placeholder until the SFU moves |

**`ROOM_JWT_SECRET` must be byte-identical on both sides or every Launch link is rejected.** It was
9 characters, signing tokens valid 360 days that travel in URLs. Rotated during this deployment
because no handoff links existed yet — the cheapest moment it will ever be.

---

## What is NOT done

1. **The SFU has not moved.** `media.tradingroom.app` answers a 503 placeholder; the real service is
   still on AWS Lightsail. Until it moves, the room loads and the handoff works, but **there is no
   screen share or audio**. See `docs/SFU-MIGRATION.md`.
2. **The controller is still on Vercel.** Consolidating it onto this box is `NEXT-SESSION.md` §4c and
   deliberately deferred — one change at a time.
3. **Room data is SQLite, account data is Neon.** Two stores. Tolerable, and worth unifying before it
   is permanent.

---

## Operating it

```bash
ssh root@87.99.154.155

systemctl status trading-room-app          # the room
journalctl -u trading-room-app -f          # its logs
journalctl -u caddy -f                     # TLS + proxy

systemctl restart trading-room-app         # after shipping a new build
```

**Shipping a new room build**, from a developer machine:

```bash
cd apps/room && ADAPTER=node npx vite build
tar czf /tmp/room.tgz build package.json drizzle
scp /tmp/room.tgz root@87.99.154.155:/tmp/
ssh root@87.99.154.155 'cd /opt/trading-room-app/room && tar xzf /tmp/room.tgz \
  && chown -R tradingroomapp:tradingroomapp . && systemctl restart trading-room-app'
```

Only re-run `npm install --omit=dev` on the box when dependencies change.

**This box is a five-day test.** A *stopped* Hetzner server still bills — only deleting stops it.
Snapshot before deleting, and the whole configured machine comes back in minutes.
