# Streaming into a room from OBS or XSplit — setup

Two audiences, in order. **Part A** is done once by whoever operates the deployment. **Part B** is
what a presenter does every time, and takes about a minute.

The contract behind all of this — which byte of the reference each string came from, and which
decisions were ours — is `OBS-XSPLIT-INGEST.md`. This page is the instructions.

---

# Part A — the operator, once

## A1. Stand up a MediaMTX host

MediaMTX is one static binary (https://github.com/bluenviron/mediamtx/releases). It is a **separate
host from the SFU**, deliberately: media ingest and signalling that share a box lose both when
either saturates.

It needs three ports:

| port | protocol | what uses it |
| --- | --- | --- |
| `8889` | TCP + UDP | WHIP publish (OBS 30+) |
| `1935` | TCP | RTMP publish (XSplit, OBS, any RTMP encoder) |
| `8888` | TCP | HLS playback — put the TLS proxy in front of this one, because viewers fetch `https://<host>/<path>/index.m3u8` on 443 |

## A2. Configure it

Put this in `mediamtx.yml`, replacing `<controller-host>` with the hostname the **controller** app
is served from:

```yaml
# Every publish AND every read is authorised by the controller. Nothing is excluded.
authMethod: http
authHTTPAddress: https://<controller-host>/internal/media-auth

webrtcAddress: :8889
rtmpAddress: :1935

# Playback. The room plays `index.m3u8` with hls.js.
hls: yes
hlsAddress: :8888
hlsVariant: lowLatency
hlsAlwaysRemux: yes
```

Every publish **and every playlist fetch** now asks the controller, which refuses unless the token is
one it signed, has not expired, has not been rotated away, and carries the right scope for what is
being asked. There is no default allow anywhere in that chain.

> **Do not add `authHTTPExclude`.** An earlier version of this page suggested excluding `read`. That
> would make every room's video readable by anyone who could guess a path — reads are authenticated
> in the reference too, with a token handed to every session at login.

> Put TLS in front of it. `authHTTPAddress` must be `https://` — that request carries a live publish
> credential, and a plaintext hop hands it to anyone on the path.

## A3. Tell the controller where it is

In the controller's environment:

```bash
STREAM_SERVER_MTX=media.yourdomain.com
```

**Host only — no scheme, no port, no trailing slash.** The two URLs append their own; a value like
`https://media.yourdomain.com:8889` produces
`http://https://media.yourdomain.com:8889:8889/...`, which fails with no useful error.

Leaving it blank is a supported state: presenters still get a key, and the panel tells them plainly
that no ingest server is configured. It never shows a link that cannot work.

## A4. Apply the migration

`stream_ingest_keys` arrives as migration `0012`, which runs automatically on the controller's next
start. Nothing to do by hand.

## A5. Check it

```bash
# Should answer 401 — no token was presented. A 200 here means something is very wrong.
curl -i -X POST https://<controller-host>/internal/media-auth \
  -H 'content-type: application/json' \
  -d '{"action":"publish","path":"room__x__y","protocol":"rtmp","query":"","token":""}'

# Should ALSO answer 401. If this returns 200, reads are not being authorised and every room's
# video is public — check that `authHTTPExclude` is absent from mediamtx.yml.
curl -i -X POST https://<controller-host>/internal/media-auth \
  -H 'content-type: application/json' \
  -d '{"action":"read","path":"room__x__y","protocol":"hls","query":"","token":""}'

# Should answer 401 as well: operator surfaces are never opened by a token we mint.
curl -i -X POST https://<controller-host>/internal/media-auth \
  -H 'content-type: application/json' \
  -d '{"action":"api","path":"","protocol":"hls","query":"","token":""}'
```

`401` is the correct and expected answer to all three. The controller logs the reason (`no-token`,
`action not permitted`); the response body deliberately does not, so a caller cannot learn which half
of a credential they got right.

---

# Part B — the presenter, every time

## B1. Open the panel

In the room: **Session Control → Stream RTMP/WHIP/OBS**.

Two radio buttons decide what you see:

- **Whip** — lowest latency, roughly a second or less. Needs **OBS 30 or newer**. Choose this
  unless you have a reason not to.
- **Rtmp** — works with everything, including **XSplit**. Expect 2–5 seconds.

A stream key is issued the moment the pane opens. You do not have to press anything to get one.

> **Every time you open this pane, or press "New Link", you get a NEW key and the previous one stops
> working immediately.** That is deliberate — it is how a leaked key is revoked. If you are already
> live on the old key, you will be cut off. Copy the key into OBS *after* you have opened the pane,
> not before.

## B2a. OBS with WHIP — the low-latency path

With **Whip** selected, the panel shows two fields. In OBS:

**Settings → Stream**

| OBS field | what to paste |
| --- | --- |
| Service | `WHIP` |
| Server | the **Streaming Link** box (press its Copy button) |
| Bearer Token | the **Bearer** box (press its Copy button) |

The Server value looks like:

```
http://media.yourdomain.com:8889/room__7f3a__Dana_Vero/whip
```

That last path segment is your display name with everything outside `A-Z a-z 0-9 _ -` turned into
`_`. It is fixed when the key is minted — if you rename yourself, reopen the pane to get a key for
the new name.

Then **Settings → Output**, and set the encoder to **H.264**. MediaMTX republishes H.264 to the room
without transcoding, which is what keeps the latency near a second; anything else forces a transcode
or fails outright.

Press **Start Streaming**.

## B2b. XSplit, or OBS with RTMP

With **Rtmp** selected, the panel shows a single **Streaming link** box. The token is already inside
that URL — there is no separate key to enter.

```
rtmp://media.yourdomain.com/room__7f3a__Dana_Vero?jwt=eyJhbGciOiJIUzI1NiIs...
```

**XSplit** — Broadcast → Set up new output → **Custom RTMP**:

| XSplit field | what to paste |
| --- | --- |
| RTMP URL | everything up to and including `?jwt=…` — the whole string |
| Stream name / key | leave **empty** |

**OBS with RTMP** — Settings → Stream → Service: **Custom…**:

| OBS field | what to paste |
| --- | --- |
| Server | the whole link, `?jwt=…` included |
| Stream Key | leave **empty** |

Some encoders refuse an empty stream key. If yours does, split the link at the last `/`: everything
before it is the Server, everything after it (`room__…?jwt=…`) is the Stream Key. Both halves
together must reproduce the URL exactly.

## B3. Treat the link like a password

The RTMP link **contains** your credential, and the WHIP Bearer **is** one. Anyone holding either
can publish video into your room under your name for the next 30 days.

- Do not put either in a chat message, a screenshot, or a support ticket.
- Do not screen-share the panel while the boxes are visible.
- If either gets out, press **New Link**. The old one is dead the instant the new one appears —
  there is no propagation delay and nothing to wait for.

## B4. When it does not connect

| symptom | cause |
| --- | --- |
| OBS: "Failed to connect", immediately | The key was rotated. Reopen the pane and copy the current one. |
| OBS: connects then drops instantly | Encoder is not H.264, or the URL lost a character in transit. |
| The panel says no ingest server is configured | `STREAM_SERVER_MTX` is unset on the deployment. Operator, Part A3. |
| The panel says the key could not be issued | Either you are not a presenter in this room, or the controller is unreachable. The message distinguishes them. |
| Viewers get 401 on the playlist | Their read token has lapsed — it lives 12 hours. Reloading the room mints a new one. |
| Everything says connected, nothing appears in the room | Expected today — see `OBS-XSPLIT-INGEST.md` §6. The publish is authorised and accepted and the stream is live on the media server; the room does not yet render MediaMTX streams as tabs. |
| Playback returns 401 for viewers | The viewer has no read token, or it has lapsed (12 hours). Reloading the room mints a new one. |
