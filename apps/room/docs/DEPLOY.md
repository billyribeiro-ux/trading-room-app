# Deploying the room and its media server

Two processes. The SvelteKit app can go anywhere that runs Node. The SFU cannot go just anywhere,
and the reason is the first section below - it is the constraint that decides your hosting choice,
so it comes before the variable tables.

---

## Why the SFU cannot run on a normal PaaS

An SFU does not send media over the signalling connection. It opens a **wide range of UDP ports** and
tells every browser to send RTP to `MEDIA_ANNOUNCED_ADDRESS` on one of them. The default range is
10,000 ports (`MEDIA_RTC_PORT_MIN=40000`, `MEDIA_RTC_PORT_MAX=49999`,
`services/media/src/config.rs:72-73`).

That rules out the usual "we give you one HTTP port" platforms - Vercel, Railway's default web
service, Heroku, Cloud Run. They terminate one TCP port and have nowhere to put the UDP range. You
need one of:

- **A VM with a public IP** (EC2, Hetzner, DigitalOcean droplet, Fly.io with a dedicated IPv4). Run
  the container with `--network host`, or publish the range explicitly.
- **Kubernetes with `hostNetwork: true`** and the range open in the node's security group.

Publishing the range as a Docker port mapping (`-p 40000-49999:40000-49999/udp`) technically works
but Docker creates a userland proxy per port; ten thousand of them will exhaust file descriptors and
add latency to every packet. Use host networking, or narrow the range deliberately (see below).

### Narrowing the range

`Config::validate` requires at least 100 ports per worker and refuses to start otherwise
(`config.rs:89-110`) - an inverted or too-small range is rejected at boot, not at the first
connection. The ceiling on concurrent peers is the range restated: `max_peers()` divides the
available ports by the worst-case per-peer allowance (`config.rs:130-135`). So:

| Range                 | Workers | Concurrent peers |
| --------------------- | ------- | ---------------- |
| 40000-49999 (default) | 4       | 1250             |
| 40000-40999           | 2       | 125              |
| 40000-40099 (minimum) | 1       | 12               |

Pick the range from the audience size you actually expect. Too small does not degrade - peers past
the ceiling are refused at the door with a 503 they can retry, deliberately, because admitting them
and running out of ports underneath them is the worse failure.

### Firewall

Open, on the media host:

- `4443/tcp` (or whatever `MEDIA_BIND_ADDRESS` uses) for signalling
- `MEDIA_RTC_PORT_MIN`-`MEDIA_RTC_PORT_MAX` on **both UDP and TCP** - mediasoup binds both per
  transport, and the TCP candidates are what save a viewer whose network blocks UDP entirely

---

## TURN

Even with the range open, some viewers cannot reach the SFU directly: symmetric NAT, or a corporate
firewall that permits nothing outbound but TCP/443. For them ICE finds no working candidate pair.
The failure is silent and total - the WebSocket connects, signalling succeeds, the transport
negotiates, and no media ever arrives. A black screen share with no error in the console.

A TURN relay is the fix, and on the public internet it is not optional.

### coturn, with ephemeral credentials

Credentials are minted per request by `mediaIceServers()` (`src/lib/server/media-grant.ts`) using
coturn's `use-auth-secret` mode, so the long-term secret stays on the app server and the browser
only ever sees a credential that expires. Configure coturn with:

```conf
# /etc/turnserver.conf
listening-port=3478
tls-listening-port=5349
fingerprint
use-auth-secret
static-auth-secret=<the same value as MEDIA_TURN_SECRET>
realm=<your domain>
# The public IP clients should reach this relay on.
external-ip=<public ip>
# TLS on 443 is what rescues viewers behind a firewall that allows nothing else.
cert=/etc/letsencrypt/live/<domain>/fullchain.pem
pkey=/etc/letsencrypt/live/<domain>/privkey.pem
# Do not relay to private ranges from a public relay.
no-multicast-peers
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
```

Then set `MEDIA_TURN_URLS` and `MEDIA_TURN_SECRET` on the **app**, not on the SFU - the app is what
mints credentials, and the SFU never sees them.

Verifying it works: Chrome's `chrome://webrtc-internals` lists the candidate pairs for a live call.
A viewer relaying through TURN shows a selected pair whose local candidate type is `relay`. If no
viewer ever shows `relay`, TURN is configured but unused, which is fine; if a viewer shows no
selected pair at all, it is needed and not working.

---

## Environment variables

### The app (SvelteKit)

| Variable                  | Required              | Default                  | Notes                                                                                                                                                                              |
| ------------------------- | --------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ORIGIN`                  | **yes**               | -                        | adapter-node rejects form posts whose Origin does not match. Without it every action fails with `Cross-site POST form submissions are forbidden`, which reads as a bug in the app. |
| `DATABASE_URL`            | no                    | `.data/proroom.sqlite`   |                                                                                                                                                                                    |
| `MEDIA_GRANT_PRIVATE_KEY` | **yes**               | -                        | Ed25519 PKCS#8 PEM. **Never** expose this; it is read only inside `$lib/server`, which SvelteKit refuses to bundle into client code.                                               |
| `MEDIA_WS_URL`            | **yes** in production | `ws://localhost:4443/ws` | Must be `wss://` in production - the grant travels in the query string.                                                                                                            |
| `MEDIA_ROOM_ID`           | no                    | `ptr-room`               | A deployment constant. There is no room entity in the schema to derive it from.                                                                                                    |
| `MEDIA_TURN_URLS`         | recommended           | -                        | Comma-separated, e.g. `turn:relay.example.com:3478?transport=udp,turns:relay.example.com:5349`.                                                                                    |
| `MEDIA_TURN_SECRET`       | with the above        | -                        | coturn's `static-auth-secret`.                                                                                                                                                     |
| `MEDIA_STUN_URLS`         | no                    | -                        | Comma-separated. Needs no credential.                                                                                                                                              |

### The SFU (`services/media`)

| Variable                      | Required | Default           | Notes                                                                                                                                                   |
| ----------------------------- | -------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MEDIA_BIND_ADDRESS`          | no       | `0.0.0.0:4443`    | Signalling listener.                                                                                                                                    |
| `MEDIA_ANNOUNCED_ADDRESS`     | **yes**  | `127.0.0.1`       | The **public** IP peers send RTP to. Cannot be inferred from the bind address behind NAT, and the default only works for a browser on the same machine. |
| `MEDIA_RTC_PORT_MIN` / `_MAX` | no       | `40000` / `49999` | Validated at boot.                                                                                                                                      |
| `MEDIA_WORKERS`               | no       | CPU count         | Each worker gets its own non-overlapping slice of the range.                                                                                            |
| `MEDIA_GRANT_PUBLIC_KEY`      | **yes**  | -                 | Raw 32 public-key bytes in **padded standard base64** - 44 characters ending in `=`. Not base64url, not PEM.                                            |
| `MEDIA_ALLOW_ANONYMOUS`       | no       | off               | Development only. Turns off grant checking entirely.                                                                                                    |

### Generating the grant keypair

```sh
openssl genpkey -algorithm ed25519 -out media-grant.pem
```

`media-grant.pem` is `MEDIA_GRANT_PRIVATE_KEY`. The public half is the **raw 32 public-key bytes in
padded standard base64** - not PEM, not base64url, not the DER the `-pubout` default emits. Either
of these produces it, and they agree:

```sh
# openssl: SPKI DER is a 12-byte prefix plus the 32 raw bytes.
openssl pkey -in media-grant.pem -pubout -outform DER | tail -c 32 | base64

# node, equivalently - the JWK `x` member of an Ed25519 key is those same 32 bytes (RFC 8037 §2).
node -e "const {createPrivateKey,createPublicKey}=require('node:crypto');\
const k=createPrivateKey(require('node:fs').readFileSync('media-grant.pem'));\
console.log(Buffer.from(createPublicKey(k).export({format:'jwk'}).x,'base64url').toString('base64'))"
```

Both print 44 characters ending in `=`. If yours does not, it is the wrong encoding and the SFU
will refuse it at boot.

The keys must be two halves of **one** keypair. A mismatch fails in the most opaque way there is:
every peer is refused, with no other symptom.

---

## Running it

```sh
# The SFU, on the media host. The context is `services/`, not `services/media`: the crate
# is a member of the services/ Cargo workspace, so the lockfile lives at the workspace root.
docker build -t ptr-media -f services/media/Dockerfile services/
docker run -d --name ptr-media --network host \
  -e MEDIA_ANNOUNCED_ADDRESS=<public ip> \
  -e MEDIA_GRANT_PUBLIC_KEY=<44-char base64> \
  -e MEDIA_RTC_PORT_MIN=40000 -e MEDIA_RTC_PORT_MAX=49999 \
  ptr-media

# The app.
pnpm build
ORIGIN=https://<your domain> node build
```

TLS for the signalling socket is terminated by a reverse proxy in front of `4443`; the SFU speaks
plain WebSocket. nginx needs the upgrade headers and a read timeout longer than the default, or it
will close idle signalling sockets mid-session:

```nginx
location /ws {
    proxy_pass http://127.0.0.1:4443;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 3600s;
}
```

---

## Checking a deployment before trusting it

In order, because each step's failure looks like the next step's:

1. `curl -sf http://<media host>:4443/health` - the process is up. Check two fields in the
   response: `admission` must read `"require-grant"` (`"allow-anonymous"` means the SFU is open to
   anyone who can reach the port), and `workerDeaths` must stay at 0. A climbing `workerDeaths` is
   the only external symptom of a pool quietly replacing crashed workers - every request still
   succeeds while every session on the dead worker was dropped.
2. Sign in and watch the network tab: `POST /api/media/grant` returns 200 with a `grant` and, if
   TURN is configured, a non-empty `iceServers`. A 503 here names the missing variable.
3. The room shows the lime **"Connected to the media server"** toast. If it shows the red
   disconnected toast instead, signalling is not reachable - check `MEDIA_WS_URL` and the proxy.
4. Share a screen and open `chrome://webrtc-internals` on a **second** machine, on a different
   network. `framesReceived` climbing is the only proof that matters; a connected transport with
   zero frames means `MEDIA_ANNOUNCED_ADDRESS` is wrong or the UDP range is closed.

Step 4 is the one that catches the mistakes the first three cannot. Both other machines being on
your LAN will pass every check and still fail for real viewers.
