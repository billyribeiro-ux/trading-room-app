# Hosting MediaMTX for the Streams tab

Non-secret deployment assets, in the same shape as `ops/mediasoup`. Nothing rendered from these
templates belongs in Git.

MediaMTX carries **two** halves of one feature: **ingest**, where a presenter's OBS or XSplit
publishes over WHIP or RTMP, and **playback**, where every viewer's browser pulls HLS. Both are
authorised by the controller, and getting either exclusion wrong is a tenant-isolation failure
rather than a broken feature.

Pinned reference release at the time of writing: **v1.20.0**, published 2026-08-05. Image
`bluenviron/mediamtx` on Docker Hub, pinned **by digest** in `mediamtx-image.env`.

---

## 1. What has to exist before anything is installed

| thing | why |
| --- | --- |
| A host with a **static public IPv4** | WebRTC announces an address to clients; a changing one breaks ICE. `ops/mediasoup` already requires this for the SFU. |
| A DNS name for playback, e.g. `stream.<domain>` | Becomes `STREAM_SERVER_MTX`, and browsers fetch `https://<that>/…/index.m3u8`. |
| Caddy on the same host | Terminates TLS for HLS. The pattern is `ops/mediasoup/Caddyfile.example`. |
| The controller reachable over HTTPS | MediaMTX calls it for **every** publish and **every** read. |
| The room reachable over HTTPS | The `runOnAvailable` hook POSTs to it. |

This can share the SFU host or be its own. Its own is preferable: WHIP ingest, HLS remuxing and
mediasoup all compete for CPU, and a stream stuttering because a screenshare spiked is hard to
diagnose from either side.

---

## 2. Ports

| port | proto | exposure | what |
| --- | --- | --- | --- |
| 8889 | TCP | **public** | WHIP handshake |
| 8189 | **UDP** | **public** | WebRTC ICE / media |
| 1935 | TCP | **public** | RTMP ingest |
| 443 | TCP | **public** | HLS, via Caddy |
| 8888 | TCP | **loopback** | HLS origin, Caddy only |
| 9997 | TCP | **loopback** | Control API, the room only |

**UDP/8189 is the one that gets forgotten.** Without it a WHIP publish completes its handshake and
then sends no media, which looks like a broken encoder rather than a closed port.

`apiAddress` defaults upstream to `:9997`, which binds **every interface**. The rendered config sets
`127.0.0.1:9997` instead. That API can create and delete paths — it is not a read-only surface.

---

## 3. Install

1. **Start from a reviewed revision** whose Backend quality workflow passed. Record it.
2. **Resolve the image digest** for the reviewed release and write it to `mediamtx-image.env`:
   ```
   docker buildx imagetools inspect bluenviron/mediamtx:v1.20.0
   ```
   A digest, never a tag. A tag lets a restart change what runs with nothing in Git changing.
3. **Generate the hook secret** — `openssl rand -base64 48` — and put the identical value in
   `mediamtx.env` here and as `MEDIA_HOOK_SECRET` in the room's environment.
4. **Render** `mediamtx.yml`, `mediamtx.env`, `mediamtx-image.env`, `caddy.env` and the Caddyfile
   from the `.example` files, replacing every `<angle-bracket>` placeholder. Install under
   `/etc/tradingroom-mediamtx`, `chmod 600` and root-owned for anything holding the secret.
5. **Install the unit** at `/etc/systemd/system/tradingroom-mediamtx.service`, then
   `systemctl daemon-reload && systemctl enable --now tradingroom-mediamtx`.
6. **Open the firewall** for 8889/tcp, 8189/udp, 1935/tcp and 443/tcp. Nothing else.
7. **Set the application environment** and restart both apps:

   | app | variable | value |
   | --- | --- | --- |
   | controller | `STREAM_SERVER_MTX` | `stream.<domain>` — host only, **no scheme, no port** |
   | room | `MEDIA_HOOK_SECRET` | the generated secret |
   | room | `MEDIA_API_URL` | `http://127.0.0.1:9997` |

   `MEDIA_API_URL` is the **internal** address. Pointing it at the public host would expose the
   control API to reach it.

---

## 4. Prove it, in this order

Each step fails for one reason, which is why they are separate.

```bash
# 1. The server is up and the API is loopback-only.
curl -fsS http://127.0.0.1:9997/v3/paths/list | jq '.itemCount'
curl -fsS --max-time 3 http://<public-ip>:9997/v3/paths/list && echo "LEAKING" || echo "closed"

# 2. The controller is reachable from the media host and refuses a nonsense token.
curl -si -X POST https://<controller-host>/internal/media-auth \
  -H 'content-type: application/json' \
  -d '{"action":"read","path":"room__x__y","query":"jwt=nope","protocol":"hls"}' | head -1
# expect: HTTP/2 401

# 3. The hook refuses without the bearer, and accepts with it.
curl -si -X POST https://<room-host>/internal/media-hook \
  -H 'content-type: application/json' \
  -d '{"event":"available","path":"room__x__y"}' | head -1
# expect: HTTP/2 401
```

Then end to end: open a room as a presenter, take the OBS panel's Server/Stream Key, publish, and
confirm **all four** — the path appears in `/v3/paths/list` with `"available": true`; the Streams tab
appears for a viewer; the tab appears within a second (hook) and still appears after
`systemctl restart` of the room (reconcile); and stopping the encoder removes it.

If the tab appears only after ~5 seconds, the hook is failing and the reconcile is covering for it —
check the media host's journal for the `curl`.

---

## 5. Things that will bite, each with its symptom

**`hlsAllowOrigins` is plural and an array.** The playlist is fetched from a different origin than
the page, so it must list the room's origin. Wrong value → playback fails in the browser with a CORS
error and **MediaMTX logs nothing**, because from its side the request succeeded.

**Never add `- action: read` to `authHTTPExclude`.** An earlier draft of our own documentation
recommended exactly that. It would serve every room's video to anyone who guesses a path. Playback is
authenticated by design: each session gets an `mtxToken` and hls.js spends it as `?jwt=`.

**Caddy must not strip the query string.** `?jwt=` is the credential. `reverse_proxy` forwards it
untouched; a `rewrite` or `uri strip_prefix` in front can drop it, and every playback then 401s with
nothing obviously wrong.

**Auth is not cached — one POST to the controller per HLS segment request.** MediaMTX's own
documentation is explicit that HTTP auth runs "for each authentication request". With
`hlsVariant: lowLatency` that is several requests per second **per viewer**. A 200-viewer room is a
sustained few hundred requests per second against `/internal/media-auth`. Measure it before a large
session. The upstream alternative is `authMethod: jwt`, which fetches a JWKS once and validates
locally — but our tokens are **HS256**, and JWKS needs an asymmetric key, so adopting it means
minting with RS256/ES256 and publishing a JWKS endpoint. That is a real change, not a config flip.

**The hook can be lost and that is expected.** It is a `curl` with no retry, and the room's SSE hub
is process-local, so it reaches only the instance it lands on. The reconcile is what makes the list
correct. If the hook stops working entirely the feature degrades to ~5s latency; it does not break.

---

## 6. Two gaps this deployment does NOT close

Both are in the ingest URLs the room hands a presenter, both are faithful transcriptions of the
reference, and neither is acceptable for a fintech application. They are named here because the
person standing up this host is the one who will notice them first.

1. **WHIP is `http://<host>:8889/…`** (`apps/room/src/lib/stream-ingest.ts`). The publish credential
   travels as an HTTP `Bearer` over **cleartext**. That token is valid for 30 days.
2. **RTMP is `rtmp://…?jwt=…`**, not `rtmps://`. The publish token is in the query string of a
   cleartext protocol.

Closing them means `webrtcEncryption: yes` with a certificate (or Caddy in front of 8889) and
`rtmpEncryption` with `rtmpsAddress`, plus changing both URL builders. Until then, treat a publish
token as interceptable by anything on the network path between the encoder and this host.
