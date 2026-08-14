# Streaming in from OBS / XSplit — the contract, read from the bundle

Status: **contract complete, nothing built.** Every value below is read from
`docs/source/main.d6d3c112b59b7d0d.js` at the byte offset named beside it. Nothing here is inferred,
and the two places where the evidence stops are marked as gaps rather than filled in.

The owner's requirement, 2026-08-14: a presenter must be able to stream from **the browser** (works
today, mediasoup) **and from OBS / XSplit**, both at the best quality and lowest latency achievable.

---

## 1. What decides which protocol

```js
this.useMTX = this.globals.sessData.useMediaMTX;          // byte 1115350
```

and the panel switches its instructions on exactly that:

```js
O(1, e.useMTX ? -1 : 1)                                   // byte 2143600
```

- `useMediaMTX` **off** → *"IN OBS or any RTMP compatible broadcaster enter the above link. Replace
  `"name="` with your desired name"*
- `useMediaMTX` **on** → *"IN OBS, under streaming, select "WHIP", and enter the above link. Replace
  `"name="` with your desired name"*

`useMediaMTX`, `mediaMTXClusterID` and `backupMediaMTXClustterID` are real manage-page settings, all
inside the reference's own **`dont-touch`** group. The two ClusterIDs appear **nowhere in the room
bundle** — they configure the reference's server, not its client.

## 2. The URLs, verbatim

Byte 2157950, the MediaMTX branch:

```js
e.streamKey     = e.appService.globals.mtxToken;
e.streamingLink = `http://${e.appService.globals.streamServerMTX}:8889/room__${e.appService.globals.sessionID}__${e.yourName}/whip`;
```

Byte 2169850, `getNewToken()`:

```js
const i = yield e.appService.invokeAdminCmd('getRTMPToken');   // -> { rtmpToken }
e.appService.globals.mtxToken = i.rtmpToken;
e.yourName = encodeURIComponent(e.appService.globals.user.name.replace(/[^a-zA-Z0-9_-]/g, '_'));
e.streamingLinkRTMP = `rtmp://${e.appService.globals.streamServerMTX}/room__${e.appService.globals.sessionID}__${…}`;
```

And the NON-MediaMTX branch, same site:

```js
e.streamingLink = e.appService.globals.sessData.obsStreamKey
  ? `https://${e.appService.globals.streamServer}/api/stream/${e.appService.globals.sessionID}/${e.appService.globals.sessData.obsStreamKey}?name=${e.yourName}`
  : '';
```

Four facts fall out of those three fragments and each one matters to the build:

| fact | why it matters |
| --- | --- |
| **`streamServerMTX` is a DIFFERENT global from `streamServer`** | MediaMTX is its own host, not a port on the SFU. It is the separate media tier row H argues for, and the reference already separates it. |
| **Port `8889`** | MediaMTX's WebRTC/WHIP port. RTMP carries no port, so it is the standard `1935`. |
| **Path `room__{sessionID}__{yourName}`** | One MediaMTX *path* per presenter per room. Double underscores are the separator; the room id is the session id, not the short code. |
| **`yourName` is sanitised then encoded** | `replace(/[^a-zA-Z0-9_-]/g, '_')` and THEN `encodeURIComponent`. Both, in that order — the sanitiser is what keeps a display name from creating a second path segment. |

## 3. The token

`invokeAdminCmd('getRTMPToken')` returns `{ rtmpToken }`, which becomes `globals.mtxToken` and is
shown as the **stream key**. The panel offers **New Link**, which calls that command again — so the
token is regenerable and the old one must stop working.

**Gap:** the bundle does not show the token's lifetime, its format, or whether MediaMTX validates it
directly. Do not assume; it is a server-side decision for us to make deliberately, and it should be
made the same way the handoff token was — matched to a captured value if one is ever obtained, and
otherwise chosen and documented.

## 4. The panel, and what ours is missing

Bytes 2141780–2143720. Ours (`ModalHost.svelte`, the `obs-streaming` tab) has the first two elements
only:

| element | in ours |
| --- | --- |
| RTMP / WHIP radio pair, persisted as `streamingType` | yes |
| intro sentence, typo `streraming` preserved | yes |
| the streaming link, in a `<textarea>` | **no** |
| the stream key | **no** |
| **Copy** button, toast "Copied to clipboard." | **no** |
| **New Link** button → `getNewToken()` | **no** |
| RTMP instruction block | **no** |
| WHIP instruction block | **no** |
| restream cross-link → `openRestreamTab()` | **no** |

The restream half IS built: `restreamLink`, `saveRestreamLink()` validating `rtmp://`, and the
`restreamToURL` preference.

## 5. How a stream becomes visible in the room

`mtxStartStream` and `mtxStopStream` are **server → client** notifications (byte 1010826). The room
pushes each into `mtxStreams` and renders it as a stream TAB (`selectStreamTabOfId`, byte 1137850).
The client never publishes to MediaMTX and never talks to it directly for signalling.

**Gap:** how the room PLAYS an MTX stream is not established here. MediaMTX serves WHEP on the same
8889, which would be the low-latency choice and is consistent with the port already in the ingest
URL — but the bundle fragment that would prove it has not been read, so it is not claimed.

## 6. Recording, and why it is the same decision

The presenter sends `startRecMtx { streams: mtxStreams }` / `stopRecMtx` (byte 2524230). The server
answers on the command channel with `startRec`, `stopRec`, `pauseRec`, `resumeRec`,
`setRecPreview { url }` and `stopRecMsg { data }`.

So **row X** (`setRecPreview` drives the recording-preview window), **row AC** (`stopRecMsg` raises
the notification) and **row R's row 10** (server-side remux to MP4) all become reachable the moment
MediaMTX exists, and none of them can be reached before. Four rows, one deployment.

Client-side recording is NOT a divergence: `startRecFromMuser` falls back to
`mediaService.startRecForMuser(null)` whenever `mtxStreams` is empty (byte 2524230), so the browser
recorder this room already has reproduces a real upstream path.

## 7. Latency, and why the protocol split is not arbitrary

- **WHIP** is WebRTC end to end. Sub-second, and OBS has spoken it natively since v30. This is the
  quality/latency path and it is why `useMediaMTX` exists at all.
- **RTMP** is TCP with buffering, conventionally 2–5s. Ingesting H.264 and republishing over WebRTC
  **without transcoding** keeps it near a second; a transcode would both add latency and cost CPU on
  the media host. XSplit is RTMP-centric, so this path is what makes XSplit work.

MediaMTX serves both, and does not transcode when the codecs already align. That is the whole reason
one server answers both halves of the owner's requirement.

## 8. What is blocked, precisely

Not code. **A MediaMTX host at `streamServerMTX`**, with 8889 (WHIP/WHEP) and 1935 (RTMP) reachable,
TLS in front of it, and a way for it to tell the controller when a path goes ready or not-ready so
`mtxStartStream` / `mtxStopStream` can be broadcast. MediaMTX has `runOnReady` / `runOnNotReady`
hooks and an HTTP API for exactly that.

Everything on this page is buildable the day that host exists, and nothing on it should be built
before — a panel that hands a presenter a link to nowhere is the dead control this repository
refuses to ship.
