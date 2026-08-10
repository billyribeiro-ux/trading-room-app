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
| `media.tradingroom.app` | **the SFU** | same box | **live since 2026-08-09 12:44** |
| `media.34-195-170-147.sslip.io` | **a second, older SFU** | `34.195.170.147` — **provenance unverified**, see below | **live right now**, serving `workers: 1` |
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
| `trading-room-app` | the room | node 22, bound to `127.0.0.1:3000`, `Restart=always`. **SvelteKit 3** since 2026-08-10 |
| `tradingroom-media` | **the SFU** | Docker 29.7.2, `--network host`, signalling on `127.0.0.1:4443`, RTC 40000-40199 |
| `docker` | runs the SFU container | image `tradingroom-media:local` |

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
| `MEDIA_WS_URL` | room `.env` | `wss://media.tradingroom.app/ws` — the live SFU since 2026-08-09 |
| `MEDIA_GRANT_PRIVATE_KEY` | room `.env` | Ed25519 PKCS#8 PEM, generated ON the box. **Escaped newlines**, because `EnvironmentFile` carries no multi-line value |
| `BODY_SIZE_LIMIT` | room `.env` | `32M`. Without it adapter-node rejects any upload over **512K** with a bare 413, before `MAX_UPLOAD_BYTES` (25MB) is consulted |

**Every variable the room reads must ALSO be declared in `apps/room/src/env.ts`.** Under Kit 3
`$env/dynamic/private` is a shim over `$app/env/private`, which exports only what that file
declares — an undeclared variable reads `undefined` no matter what is in the environment. Adding one
to `.env` without adding it there is a silent no-op.

**`ROOM_JWT_SECRET` must be byte-identical on both sides or every Launch link is rejected.** It was
9 characters, signing tokens valid 360 days that travel in URLs. Rotated during this deployment
because no handoff links existed yet — the cheapest moment it will ever be.

---

## What is NOT done

1. ~~The SFU has not moved.~~ **DONE 2026-08-09.** It runs on this box and
   `media.tradingroom.app` serves it. Proven end to end at 20:36: a grant minted by the deployed
   room build was answered `101 Switching Protocols`, and the SFU logged
   `peer connected user=Some(Legacy(999999)) role=Some(Presenter)` with a real mediasoup router
   created for the room. The same endpoint refuses an ungranted socket with 400.
   **What remains is the two-browser screen-share test** — a human watching video actually move —
   and then dealing with the second SFU described below.

2. **There is a SECOND SFU live, and this repository cannot say whose it is.** Measured
   2026-08-09 20:51 EDT, not inherited from a document:

   ```
   curl https://media.34-195-170-147.sslip.io/health
   {"status":"ok","workers":1,"workerDeaths":0,"rooms":0,"peers":0,"admission":"require-grant"}
   via: 1.1 Caddy · TLS CN=media.34-195-170-147.sslip.io, Let's Encrypt, notBefore 2026-08-02
   TCP 22 and 443 both open on 34.195.170.147
   ```

   That is this project's own SFU health payload, behind Caddy, on a certificate issued 2026-08-02.
   So an SFU **is** running there.

   **What is NOT established: that it is AWS Lightsail.** Every previous document in this repository
   called it "AWS Lightsail, instance `mediasoup-test-01`, us-east-1a, still billing" — and none of
   that was ever verified from here. Nobody working in this repository has had access to that
   account, a console, an instance list or a bill. **The owner states it was never deployed to
   Lightsail.** The claim was repeated between documents until it read as fact.

   **RETIRED 2026-08-10 05:14 EDT — and it WAS Lightsail.** Deleted: `mediasoup-test-01`,
   us-east-1a, Ubuntu, bundle `small_3_0` ($12.00/month), created 2026-08-02 12:54:31 -0400. Static IP
   `mediasoup-test-ip` released, both CloudWatch alarms removed with it, and `aws lightsail
   get-instances` now returns empty in all eleven regions. Stopped first, verified dark while
   `media.tradingroom.app` still served its 2 connected peers and `pnpm smoke` passed 9/9, then
   deleted.

   **The 04:56 "it is EC2, not Lightsail" identification above was MY error — disregard it.** `whois`
   and reverse DNS prove the vendor and the region, not the product: Lightsail runs on EC2, so its
   public IPs carry `ec2-<ip>.compute-1.amazonaws.com` rDNS. And Lightsail resources never appear in
   the EC2 API, so the empty `describe-instances` across every region — which felt like confirmation —
   was the strongest sign the wrong service was being queried. The original Stage 1 description in
   `MEDIASOUP-DEPLOYMENT-PLAN.md` was accurate all along. Full account in
   **`docs/RETIRE-AWS-SFU.md`**.

   What matters operationally does not depend on whose it is: **two SFUs are live at once**, only the
   Hetzner one is wired to `chat.tradingroom.app`, and the old hostname embeds an IP — so anything
   still pointing at it keeps working silently while diverging from production. Retire the name and
   shut that instance down once the two-browser test passes; whoever owns it will know where.
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

**Operating the SFU:**

```bash
systemctl status tradingroom-media          # the SFU
journalctl -u tradingroom-media -f          # its logs — peer connects and refusals both appear here
curl -s http://127.0.0.1:4443/health        # bypasses Caddy
curl -s https://media.tradingroom.app/health # through it
```

**Rebuilding the SFU image.** The source is kept on the box at `/opt/sfu-build` (1.8 MB) precisely
so this does not need a developer machine:

```bash
cd /opt/sfu-build && docker build --build-arg CARGO_BUILD_JOBS=1 -f media/Dockerfile -t tradingroom-media:local .
systemctl restart tradingroom-media
```

**`CARGO_BUILD_JOBS=1` is not optional here.** Two jobs on 2 cores with 1.9 GB pushes the C++
mediasoup worker compile into swap and, at the wrong moment, into the OOM killer — which surfaces as
a mediasoup build error rather than as what it is. The build takes roughly 15 minutes.

**The image is LOCAL ONLY** — tag `:local`, no registry anywhere. If this box is rebuilt or the
image pruned, it must be rebuilt from that directory. That is the trade for not running a registry,
and it is fine as long as it is written down, which is what this paragraph is for.

Config lives in `/etc/tradingroom-media/` (mode 600): `media.env` holds the announced address, the
RTC range and the grant PUBLIC key; `media-image.env` holds the image tag the unit runs.

**Two optional variables control peer liveness, live since 2026-08-10 05:56 EDT:**
`MEDIA_PEER_PING_SECONDS` (default 20) and `MEDIA_PEER_SILENCE_SECONDS` (default 60). The server
pings every signalling socket on the first interval and closes it once it has said nothing for the
second, releasing its `max_peers` slot, one of its user's four connection slots, and the room's
router. **Neither is set in `media.env` and neither needs to be** — the defaults are compiled in.

Before this shipped, a client that disappeared without a clean close was counted as a peer
indefinitely; two sockets were measured holding slots for over two hours with zero bytes exchanged.
Proven on the deployed build: a probe answering nothing was closed in exactly 60.0s with
`peer stopped answering … silent_for_secs=60`, while connected peers were unaffected.
`CHANGELOG.md` 2026-08-10 05:42 and 06:01 have the measurements.

**Shipping a new room build**, from a developer machine.

**Run the smoke test after EVERY deploy — either app.** One command, about a second, exits
non-zero on failure:

```bash
pnpm smoke                                        # production
SMOKE_CONTROLLER=https://<preview>.vercel.app pnpm smoke   # a preview deployment
```

`scripts/smoke.mjs` probes all three tiers: the controller's six public routes (with a content
check, because a 200 rendering an error page passes a status check), the room's invalid-token
refusal, and the SFU's health payload plus its 404 contract. **This is the check neither app had,
and its absence is why two total outages shipped on 2026-08-10 past a green `svelte-check`, 1,090
passing tests and clean builds** — every one of those inspects source or bundles, and none starts
the artefact that ships.

The room's probe is the sharpest single line in it:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  'https://chat.tradingroom.app/session?id=1001&jwtSite=bogus'
```

**403 means the room read `ROOM_JWT_SECRET` and rejected a bogus token — healthy. 500 means it could
not read its own environment**, which is what a missing `src/env.ts` does under Kit 3: every private
variable reads `undefined` while `process.env` holds the real value, and every Launch fails. That
went to production once, on 2026-08-10, past a green `svelte-check`, 524 passing tests and a clean
build under both adapters — because none of them boots the built server against a real environment.
The log distinguishes the two cases as clearly as the status does:
`handoff rejected { reason: 'malformed' }` versus `ROOM_JWT_SECRET is not configured`.



```bash
cd apps/room && ADAPTER=node npx vite build
tar czf /tmp/room.tgz build package.json drizzle
scp /tmp/room.tgz root@87.99.154.155:/tmp/
ssh root@87.99.154.155 'cd /opt/trading-room-app/room && tar xzf /tmp/room.tgz \
  && chown -R tradingroomapp:tradingroomapp . && systemctl restart trading-room-app'
```

Only re-run `npm install --omit=dev` on the box when dependencies change — the SvelteKit 3
upgrade did change them, and `better-sqlite3` is a native module, so a macOS build cannot be shipped
for it.

**This box is a five-day test.** A *stopped* Hetzner server still bills — only deleting stops it.
Snapshot before deleting, and the whole configured machine comes back in minutes.
