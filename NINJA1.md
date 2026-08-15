# NINJA 1 — Add the video server (MediaMTX) to your existing Hetzner box

**Time: about 30 minutes.** You already have the server. Nothing to buy.

---

## What you already have — verified, not assumed

From `docs/DEPLOYMENT.md`, `ops/trading-room-app.service`, and a live DNS/header check run
2026-08-14 23:2x EDT:

| thing | value |
| --- | --- |
| **Your box** | Hetzner Cloud, Ashburn VA, **`87.99.154.155`** |
| **OS** | Ubuntu 26.04 LTS |
| **Size** | **2 vCPU · 1.9 GB RAM** + 2 GB swap · 38 GB disk |
| **Log in with** | `ssh root@87.99.154.155` |
| **Docker** | ✅ already installed (29.7.2) |
| **Caddy** | ✅ already installed (2.11.4), already serving 2 sites |
| **DNS registrar** | **Porkbun** (`curitiba.ns.porkbun.com`) |

**Already running on that box:**

| service | what | ports |
| --- | --- | --- |
| `trading-room-app` | the room | `127.0.0.1:3000` |
| `tradingroom-media` | the SFU (screen share) | `127.0.0.1:4443`, UDP 40000-40199 |
| `caddy` | TLS for `chat.` and `media.tradingroom.app` | 80, 443 |

### Where each host actually lives, checked live just now

| host | resolves to | served by |
| --- | --- | --- |
| `chat.tradingroom.app` | `87.99.154.155` | **Hetzner** — the room |
| `media.tradingroom.app` | `87.99.154.155` | **Hetzner** — the SFU |
| `www.tradingroom.app` | Vercel DNS | **Vercel** — answered `server: Vercel` |
| `stream.tradingroom.app` | *nothing yet* | you create it in Part A |

> **The room and the SFU are both on Hetzner — that migration is real and done.** The controller
> (`www.tradingroom.app`) still answers from Vercel, which I verified from its own response header
> rather than from the docs. It matters in exactly two places below (Part D file 1, and Part I-2).
>
> **If you have since moved the controller too**, tell me and I will correct both. Everything else in
> this guide is unaffected.

---

## ⚠️ First: a real memory warning

**That box has 1.9 GB of RAM and already runs the room and the SFU.** MediaMTX adds HLS remuxing,
which costs CPU and memory per live stream.

This is not hypothetical. `docs/DEPLOYMENT.md` records that building the SFU with two jobs instead of
one "pushes the C++ mediasoup worker compile into swap and, at the wrong moment, into the OOM
killer." The box is already near its limit.

**Do this anyway, now** — it is how you prove the streaming path works at all. Part B has you check
free memory before committing, and Part G re-checks that nothing else died.

**Before real customers, move MediaMTX to its own box.** That is what `TODO.md` row **H** already
recommends: separating the media plane removes a shared failure domain. Moving later is a redeploy,
not a migration.

---

## Part A — Add the DNS record (5 minutes, then wait)

1. Go to **https://porkbun.com**, sign in.
2. Open **`tradingroom.app`** → **DNS**.
3. Add:

   | field | value |
   | --- | --- |
   | Type | **A** |
   | Host | `stream` |
   | Answer | `87.99.154.155` |
   | TTL | 600 |

4. Save.

> ⚠️ **It must be Porkbun.** Your nameservers are Porkbun's. `docs/DEPLOYMENT.md` records that adding
> records in Vercel "does nothing, because Vercel is not the nameserver. That mistake cost a round
> trip on day one."

**Wait 5 minutes**, then on your Mac:

```bash
dig +short stream.tradingroom.app
```

✅ **Expect:** `87.99.154.155`
❌ **Nothing?** Wait 10 more minutes, try again.

---

## Part B — Log in and check headroom (2 minutes)

On your Mac:

```bash
ssh root@87.99.154.155
```

✅ **Expect:** a `root@...#` prompt.

**Everything from here to Part H is typed on the SERVER.**

```bash
docker --version && caddy version && free -h
```

✅ **Expect:** Docker 29.x, Caddy 2.11.x, and a memory table.

> 🛑 **Look at `available` under `Mem`. If it is below 300 MB, stop and tell me** — we should put
> MediaMTX on its own box instead. Continuing would risk the room and the SFU.

---

## Part C — Make the folder and the secret (3 minutes)

```bash
mkdir -p /etc/tradingroom-mediamtx/tls
openssl rand -base64 48
```

✅ **Expect:** a long random line ending in `==`

**📋 COPY THAT WHOLE LINE AND SAVE IT.** You paste it **twice** — Part D and Part I. Call it
`HOOK_SECRET`.

> Deliberately **not** your `ROOM_JWT_SECRET`. That key signs user sessions and has no business on a
> media box.

---

## Part D — Create three config files (10 minutes)

Copy each block **whole** — including the `cat` line and the closing `EOF` — paste, press Enter.

### File 1 of 3 — the main config

**No editing needed.** Your real hostnames are already in it.

```bash
cat > /etc/tradingroom-mediamtx/mediamtx.yml <<'EOF'
authMethod: http
authHTTPAddress: https://www.tradingroom.app/internal/media-auth

api: yes
apiAddress: 127.0.0.1:9997

webrtc: yes
webrtcAddress: :8889
webrtcEncryption: yes
webrtcServerKey: /etc/tradingroom-mediamtx/tls/server.key
webrtcServerCert: /etc/tradingroom-mediamtx/tls/server.crt
webrtcLocalUDPAddress: :8189
webrtcAdditionalHosts: [87.99.154.155]

rtmp: yes
rtmpEncryption: strict
rtmpsAddress: :1936
rtmpServerKey: /etc/tradingroom-mediamtx/tls/server.key
rtmpServerCert: /etc/tradingroom-mediamtx/tls/server.crt

hls: yes
hlsAddress: 127.0.0.1:8888
hlsVariant: lowLatency
hlsAlwaysRemux: yes
hlsAllowOrigins: ["https://chat.tradingroom.app"]

rtsp: no
srt: no
metrics: no
pprof: no
playback: no

paths:
  '~^room__[A-Za-z0-9_-]+__[A-Za-z0-9_-]+$':
    runOnAvailable: >
      curl -sS -m 5 -X POST https://chat.tradingroom.app/internal/media-hook
      -H "authorization: Bearer $MEDIA_HOOK_SECRET"
      -H 'content-type: application/json'
      -d "{\"event\":\"available\",\"path\":\"$MTX_PATH\"}"
    runOnUnavailable: >
      curl -sS -m 5 -X POST https://chat.tradingroom.app/internal/media-hook
      -H "authorization: Bearer $MEDIA_HOOK_SECRET"
      -H 'content-type: application/json'
      -d "{\"event\":\"unavailable\",\"path\":\"$MTX_PATH\"}"
EOF
```

> `authHTTPAddress` points at **`www.tradingroom.app`** because that is the controller, and the
> controller decides who may publish and who may watch. If you have moved it off Vercel, that line is
> the one to change.

### File 2 of 3 — the secret

**Replace `PASTE_HOOK_SECRET`** with the line from Part C:

```bash
cat > /etc/tradingroom-mediamtx/mediamtx.env <<'EOF'
MEDIA_HOOK_SECRET=PASTE_HOOK_SECRET
EOF
chmod 600 /etc/tradingroom-mediamtx/mediamtx.env
```

### File 3 of 3 — the exact version

Run **as-is**:

```bash
docker pull bluenviron/mediamtx:v1.20.0 && docker inspect --format='{{index .RepoDigests 0}}' bluenviron/mediamtx:v1.20.0
```

✅ **Expect:** `bluenviron/mediamtx@sha256:abc123...`

**📋 Copy that whole line**, paste in place of `PASTE_DIGEST_LINE`:

```bash
cat > /etc/tradingroom-mediamtx/mediamtx-image.env <<'EOF'
MEDIAMTX_IMAGE=PASTE_DIGEST_LINE
EOF
```

> **Why a fingerprint rather than `v1.20.0`:** a version tag can be repointed by whoever publishes
> it. A fingerprint cannot. A restart then always runs exactly what you tested.

---

## Part E — Add ONE block to Caddy (3 minutes)

> 🛑 **DO NOT overwrite `/etc/caddy/Caddyfile`.** It already serves `chat.tradingroom.app` and
> `media.tradingroom.app`. Overwriting takes your room and your SFU offline.

Back it up:

```bash
cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.backup-$(date +%F)
```

**Append** the new site — note `>>` (append), not `>` (overwrite):

```bash
cat >> /etc/caddy/Caddyfile <<'EOF'

stream.tradingroom.app {
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options "nosniff"
		Referrer-Policy "no-referrer"
		-Server
	}

	@room path_regexp ^/room__[A-Za-z0-9_-]+__[A-Za-z0-9_-]+/
	handle @room {
		reverse_proxy 127.0.0.1:8888
	}

	handle {
		respond 404
	}
}
EOF
```

Validate **before** reloading:

```bash
caddy validate --config /etc/caddy/Caddyfile
```

✅ **Expect:** `Valid configuration`
❌ **Error?** Restore and tell me:
`cp /etc/caddy/Caddyfile.backup-$(date +%F) /etc/caddy/Caddyfile`

Reload and let it fetch a certificate:

```bash
systemctl reload caddy && sleep 20 && systemctl status caddy --no-pager | head -5
```

✅ **Expect:** `active (running)`

Confirm the existing sites still work:

```bash
curl -sI https://chat.tradingroom.app | head -1
curl -s https://media.tradingroom.app/health
```

✅ **Both must answer.**

---

## Part F — Copy the certificate for OBS (3 minutes)

Caddy just issued a certificate for `stream.tradingroom.app`. OBS talks straight to MediaMTX, so
MediaMTX needs its own copy.

```bash
CERTDIR=$(find /var/lib/caddy -type d -name "stream.tradingroom.app" 2>/dev/null | head -1)
echo "found: $CERTDIR"
cp "$CERTDIR/stream.tradingroom.app.crt" /etc/tradingroom-mediamtx/tls/server.crt
cp "$CERTDIR/stream.tradingroom.app.key" /etc/tradingroom-mediamtx/tls/server.key
chmod 644 /etc/tradingroom-mediamtx/tls/server.crt
chmod 640 /etc/tradingroom-mediamtx/tls/server.key
ls -la /etc/tradingroom-mediamtx/tls/
```

✅ **Expect:** both `server.crt` and `server.key` listed.
❌ **`found:` empty?** Caddy hasn't finished issuing. Wait a minute, run the block again.

> ⚠️ **Do not substitute a self-signed certificate.** OBS reports a bad certificate with *the same
> error it shows for a wrong stream key*. You will spend an hour blaming the stream key.
>
> 📅 **For later:** Caddy renews every ~60 days, but this is a copy. Re-run this block after a
> renewal or streams stop connecting. Ask me and I'll write a cron job that does it.

---

## Part G — Start it (2 minutes)

```bash
cat > /etc/systemd/system/tradingroom-mediamtx.service <<'EOF'
[Unit]
Description=Trading Room MediaMTX
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=simple
EnvironmentFile=/etc/tradingroom-mediamtx/mediamtx.env
EnvironmentFile=/etc/tradingroom-mediamtx/mediamtx-image.env
ExecStartPre=-/usr/bin/docker rm -f tradingroom-mediamtx
ExecStart=/usr/bin/docker run --name tradingroom-mediamtx \
  --network host \
  --env-file /etc/tradingroom-mediamtx/mediamtx.env \
  -v /etc/tradingroom-mediamtx/mediamtx.yml:/mediamtx.yml:ro \
  -v /etc/tradingroom-mediamtx/tls:/etc/tradingroom-mediamtx/tls:ro \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=64m \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --pids-limit 512 \
  --ulimit nofile=65536:65536 \
  --log-driver json-file --log-opt max-size=10m --log-opt max-file=3 \
  --stop-timeout 30 \
  ${MEDIAMTX_IMAGE}
ExecStop=/usr/bin/docker stop --time 30 tradingroom-mediamtx
ExecStopPost=-/usr/bin/docker rm -f tradingroom-mediamtx
Restart=always
RestartSec=5
TimeoutStopSec=45
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now tradingroom-mediamtx
sleep 5
systemctl status tradingroom-mediamtx --no-pager | head -5
```

✅ **Expect:** `active (running)`
❌ **`failed`?** Run `journalctl -u tradingroom-mediamtx -n 30 --no-pager` and send me the output.

**Now confirm you did not starve the other two:**

```bash
systemctl is-active tradingroom-media trading-room-app caddy
free -h
```

✅ **Expect:** `active` three times, and memory still with headroom.
❌ **Anything `inactive` or `failed`?** Run
`systemctl disable --now tradingroom-mediamtx && systemctl start trading-room-app tradingroom-media`
and tell me — the box is too small and MediaMTX needs its own.

---

## Part H — Open three ports (2 minutes)

See what is already open — **do not wipe existing rules**:

```bash
ufw status
```

Add only the new ones:

```bash
ufw allow 8889/tcp comment 'MediaMTX WHIP'
ufw allow 8189/udp comment 'MediaMTX WebRTC media'
ufw allow 1936/tcp comment 'MediaMTX RTMPS'
ufw status numbered
```

✅ **Expect** the three new rules **plus everything that was there before** — especially `22`, `443`,
and the SFU's `40000:40199/udp`.

❌ **If `ufw status` said `inactive`:** the firewall is off, so the ports are already reachable.
**Leave it off.** Turning it on now without care would lock you out of SSH.

> ⚠️ **`8189/udp` is the one everybody forgets.** Without it, OBS connects fine and then no video ever
> arrives. It looks like OBS is broken. It is the firewall.
>
> ⚠️ **Never open 9997.** That port creates and deletes video channels. It stays on loopback.

---

## Part I — Tell your apps about it (5 minutes)

**Two different places, because your two apps live in two different places.**

### I-1. The room — it runs ON THIS BOX

Still on the server:

```bash
nano /opt/trading-room-app/room/.env
```

Add these two lines at the bottom, pasting your `HOOK_SECRET` from Part C:

```
MEDIA_HOOK_SECRET=PASTE_HOOK_SECRET
MEDIA_API_URL=http://127.0.0.1:9997
```

Save: **Ctrl+O**, Enter, **Ctrl+X**.

```bash
systemctl restart trading-room-app
sleep 3
systemctl is-active trading-room-app
```

✅ **Expect:** `active`

> **Why `127.0.0.1` and not the public address:** that is MediaMTX's private control channel — it can
> create and delete channels. Pointing it at the public address would expose it.

### I-2. The controller — on Vercel

**On your Mac**, in a browser:

1. Vercel → project **`trading-room-app`** → **Settings** → **Environment Variables**
2. Add:

   | Name | Value |
   | --- | --- |
   | `STREAM_SERVER_MTX` | `stream.tradingroom.app` |

   > ⚠️ Host only. **No `https://`, no port, no trailing slash.**

3. **Save** → **Deployments** → **⋯** → **Redeploy**

> If you have moved the controller off Vercel since these docs were written, set the same variable
> wherever its environment now lives and restart it — the name and value do not change.

---

## Part J — Prove it works (5 minutes)

### Check 1 — running, and locked down

On the **server**:

```bash
curl -fsS http://127.0.0.1:9997/v3/paths/list
```

✅ **Expect:** `{"itemCount":0,"pageCount":0,"items":[]}`

From your **Mac** — this one must FAIL:

```bash
curl --max-time 5 http://87.99.154.155:9997/v3/paths/list && echo "*** LEAKING ***" || echo "correctly closed"
```

✅ **Expect:** `correctly closed`
❌ **`*** LEAKING ***`?** Stop and tell me. The control port is exposed.

### Check 2 — playback reachable

From your **Mac**:

```bash
curl -sI https://stream.tradingroom.app/ | head -1
```

✅ **Expect:** `HTTP/2 404` — **404 is correct.** HTTPS works and it refuses anything that is not a
room path.

### Check 3 — nothing else broke

```bash
curl -sI https://chat.tradingroom.app | head -1
curl -s https://media.tradingroom.app/health
```

✅ **Expect:** the room answers, and the SFU returns its health JSON.

### Check 4 — the real one

1. Open a room as **presenter** at `https://chat.tradingroom.app`
2. Find the **OBS / XSplit** panel, copy **Server** and **Stream Key**
3. OBS → **Settings → Stream** → Service **Custom** → paste both → **OK** → **Start Streaming**
4. In a **different browser** or incognito, join the same room as a member

**All four must be true:**

- [ ] The **Streams** tab appears for the member
- [ ] It appears **within about a second**
- [ ] Video plays when clicked
- [ ] **Stop Streaming** in OBS makes the tab disappear

> **Tab takes ~5 seconds instead of ~1?** Streaming works, but the instant notification is failing.
> Run `journalctl -u tradingroom-mediamtx -n 50 --no-pager` and send it to me. Not urgent — a backup
> check every 5 seconds is covering for it.

---

## When it works

Say **"ninja 1 done"** and paste the output of Check 1 and Check 2.

That closes **four rows** of `TODO.md` — AD (OBS/XSplit), X (`setRecPreview`), AC (`stopRecMsg`) and
row R's server-side remux — and lets me verify the streaming path end to end for the first time.

## If you get stuck

Run this and send me all of it:

```bash
systemctl status tradingroom-mediamtx --no-pager
journalctl -u tradingroom-mediamtx -n 50 --no-pager
systemctl is-active tradingroom-media trading-room-app caddy
free -h
ufw status
ls -la /etc/tradingroom-mediamtx/tls/
```

I can read those and tell you exactly which part to redo.

## To undo everything

```bash
systemctl disable --now tradingroom-mediamtx
rm -f /etc/systemd/system/tradingroom-mediamtx.service
rm -rf /etc/tradingroom-mediamtx
cp /etc/caddy/Caddyfile.backup-* /etc/caddy/Caddyfile
systemctl daemon-reload && systemctl reload caddy
```

Your room and your SFU are untouched by anything in this guide.
