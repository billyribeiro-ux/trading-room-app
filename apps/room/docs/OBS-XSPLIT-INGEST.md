# Streaming in from OBS / XSplit

Status: **built.** The panel, the token, the rotation and the media server's authorisation check
all exist and are tested. What remains is a deployed MediaMTX host — §8 — and the playback half,
§6.

Every value below is read from `docs/source/main.d6d3c112b59b7d0d.js` at the byte offset named
beside it, or from MediaMTX's own documentation where that is named instead. Nothing here is
inferred, and the places where the evidence stops are marked as gaps rather than filled in.

The owner's requirement, 2026-08-14: a presenter must be able to stream from **the browser** (works
today, mediasoup) **and from OBS / XSplit**, both at the best quality and lowest latency achievable.

> **Corrected 2026-08-14.** An earlier revision of this page claimed `useMediaMTX` switched the
> panel's instructions between RTMP and WHIP. It does not, and the error came from reading a
> fragment instead of the region around it. §1 now records what actually switches them. The same
> read also produced four facts the earlier revision did not have: the `?jwt=` parameter, the
> `Bearer` label, the `hr`, and the fact that the intro sentence is itself conditional.

---

## 1. What selects RTMP vs WHIP — the radio pair, not `useMediaMTX`

Byte 2152300, in the update block of the Session Control template:

```js
O(153, "RTMP" === e.streamingType ? 153 : -1),
O(154, "WHIP" === e.streamingType ? 154 : -1)
```

`streamingType` is the **Rtmp / Whip radio pair** the panel already has, persisted as a preference.
Template 153 is the RTMP block, 154 the WHIP block. That is the whole switch.

`useMediaMTX` does appear, one level in, and gates one thing only (byte 2142900, inside the WHIP
block):

```js
O(1, e.useMTX ? -1 : 1)          // template 1 is `bDe`
```

`bDe` is a pair of **"Start WHIP Streaming" / "Stop WHIP Streaming"** buttons calling
`startStreaming()` / `stopStreaming()`. `-1` means "render nothing", so those buttons appear only
when `useMediaMTX` is **off** — they belong to a browser-publishes-WHIP path that exists when
MediaMTX is not in use. **They are deliberately not reproduced here**: this deployment's OBS design
*is* MediaMTX, so they never render in the reference for this configuration either, and building
them would be two controls that call nothing.

`useMediaMTX`, `mediaMTXClusterID` and `backupMediaMTXClustterID` are real manage-page settings, all
inside the reference's own **`dont-touch`** group. The two ClusterIDs appear **nowhere in the room
bundle** — they configure the reference's server, not its client. Because nothing in our panel now
reads `useMediaMTX`, it does **not** cross the `ROOM_VISIBLE_SETTINGS` boundary and the four-edit
process was not needed.

## 2. The URLs, verbatim

`handleStreaming()`, byte 2157950, complete:

```js
e.yourName = encodeURIComponent(globals.user.name.replace(/[^a-zA-Z0-9_-]/g, "_"));
if (globals.sessData.useMediaMTX) {
  e.useMTX = true;
  e.streamingLinkRTMP = `rtmp://${globals.streamServerMTX}/room__${globals.sessionID}__${e.yourName}?jwt=${globals.mtxToken}`;
  e.restreamLink      = globals.sessData.restreamToURL ? globals.sessData.restreamToURL : "";
  e.streamKey         = globals.mtxToken;
  e.streamingLink     = `http://${globals.streamServerMTX}:8889/room__${globals.sessionID}__${e.yourName}/whip`;
} else {
  e.streamingLink = globals.sessData.obsStreamKey
    ? `https://${globals.streamServer}/api/stream/${globals.sessionID}/${globals.sessData.obsStreamKey}?name=${e.yourName}`
    : "";
}
```

| fact | why it matters |
| --- | --- |
| **`streamServerMTX` is a DIFFERENT global from `streamServer`** | MediaMTX is its own host, not a port on the SFU. Ours is the `STREAM_SERVER_MTX` environment variable. |
| **Port `8889`** | MediaMTX's WebRTC/WHIP port. RTMP carries no port, so it is the standard `1935`. |
| **Path `room__{sessionID}__{yourName}`** | One MediaMTX *path* per presenter per room. Double underscores are the separator. Ours substitutes the room's **short code** for `sessionID`, that being this application's per-room identifier on every internal route. |
| **`yourName` is sanitised then encoded** | `replace(/[^a-zA-Z0-9_-]/g, '_')` and THEN `encodeURIComponent`. Both, in that order. Reproduced in `ingestPathFor`. |
| **ONE token, TWO carriers** | RTMP puts it in the query as **`jwt`**; WHIP does not put it in the URL at all — it is presented as an HTTP **Bearer**. |

## 3. The token

`invokeAdminCmd('getRTMPToken')` returns `{ rtmpToken }`, which becomes `globals.mtxToken` and is
shown as the stream key. Byte 2169850:

```js
getNewToken() {
  let i = yield e.appService.invokeAdminCmd("getRTMPToken");
  e.appService.globals.mtxToken = i.rtmpToken;
  e.yourName = encodeURIComponent(globals.user.name.replace(/[^a-zA-Z0-9_-]/g, "_"));
  e.streamingLinkRTMP = `rtmp://${globals.streamServerMTX}/room__${globals.sessionID}__${e.yourName}?jwt=${globals.mtxToken}`;
}
```

**A defect in the reference, and our one deliberate divergence.** `getNewToken()` rebuilds
`streamingLinkRTMP` only. It leaves `streamKey` and `streamingLink` holding the value that was just
replaced, so a presenter who presses "New Link" while on the WHIP tab copies a dead Bearer and the
publish is refused with nothing on screen to explain it. Ours derives all three from one source
(`ModalHost.svelte`), which makes that state unrepresentable. Same strings, no staleness.

**What the token is, which the bundle does not say.** The query parameter is named `jwt`, and that
is the only evidence of format. Lifetime, signing and revocation were ours to decide, and were
decided in `apps/controller/src/lib/server/stream-ingest.ts`:

- an HS256 JWT carrying `sub` (the exact path), `jti` (the row), `iat`, `exp`;
- **30 days**, chosen so a saved OBS profile survives a normal engagement — recorded there as a
  chosen value, not a captured one;
- revocation is not the expiry. `UNIQUE (room_id, user_id)` plus an upsert means "New Link"
  replaces the row, the old `jti` matches nothing, and the previous key stops working in the same
  statement that mints its successor. `stream-ingest.db.test.ts` proves exactly that against a real
  PostgreSQL.

## 4. The panel

Bytes 2141780–2143720, decoded against the component's `consts` array at byte 2173342. All of it is
now built in `ModalHost.svelte`'s `obs-streaming` tab:

| element | id / class | state |
| --- | --- | --- |
| RTMP / WHIP radio pair, persisted as `streamingType` | `#streaming-rtmp`, `#streaming-whip` | built |
| intro sentence, typo `streraming` preserved | — | built (RTMP branch only — it is inside `_De`) |
| RTMP streaming link | `#streaming-link-rtmp`, `form-control border border-danger`, `height: 100px` | built |
| **Copy** → toast "Copied to clipboard." | `btn btn-outline-info btn-sm m-1`, `fas fa-copy` | built |
| **New Link** → `getNewToken()` | same classes, `fas fa-sync` | built |
| RTMP instruction block + `hr` | — | built |
| WHIP streaming link | `#streaming-link`, `rows="2"`, `height: auto; overflow-y: scroll` | built |
| WHIP **Bearer** field | `#stream-whip-key`, label literally `Bearer` | built |
| WHIP instruction block | — | built |
| restream cross-link → `openRestreamTab()` | `text-primary fw-bold restream-link` | built |
| Start/Stop WHIP Streaming (`bDe`) | — | deliberately absent — see §1 |

Two divergences, both deliberate and both visually identical:

1. The restream cross-link is a `<button>` carrying the reference's three classes rather than a
   clickable `<strong>`. Svelte refuses `role="button"` on a `<strong>`, and a control inside a
   paragraph that only a mouse can reach is not acceptable. `fw-bold` supplies the weight,
   `text-primary` the colour, and the captured `.restream-link:hover` rule the underline.
2. The reference's `type="text"` attribute on a `<textarea>` (consts index 117) is dropped. It is
   invalid HTML with no effect.

One addition the reference has no equivalent for: when `STREAM_SERVER_MTX` is unset the panel says
so, rather than composing `http://:8889/…`. An absent value is reported, never filled in.

## 5. Authorising the publish — MediaMTX's side

From https://mediamtx.org/docs/usage/authentication, MediaMTX with `authMethod: http` POSTs one JSON
document per attempt to `authHTTPAddress`:

```json
{ "user": "", "password": "", "token": "", "ip": "",
  "action": "publish|read|playback|api|metrics|pprof",
  "path": "", "protocol": "rtsp|rtmp|hls|webrtc|srt",
  "id": "", "query": "", "userAgent": "" }
```

**A status beginning `20` allows; anything else denies.** Our endpoint is
`POST /internal/media-auth` on the controller. It:

- accepts the token from `token` (the WHIP Bearer) **or** from the `jwt` parameter of `query` (the
  RTMP URL and the HLS playlist URL), and from nowhere else;
- authorises `publish` and `read`, each against its own token scope, and refuses `api`, `metrics`
  and `pprof` outright — those are MediaMTX's operator surfaces and no token we mint opens one;
- verifies the HMAC in memory *before* any database read, so forged tokens cost no query;
- for `publish`, compares the token's `sub` to the requested `path` by equality, never by prefix;
- for `read`, parses the room out of the path and compares that by equality;
- answers 401 for every refusal reason, with the reason only in the log.

### Two scopes, and why `read` is one of them

> **Corrected 2026-08-14, second pass.** The first version of this section said reads were not
> gated yet and told operators to put `authHTTPExclude: [{action: read}]` in their config. **That
> advice was wrong and would have made every room's video readable by anyone who could guess a
> path.** It came from calling playback an unread gap instead of opening
> `app-streaming-view.full.js`, which was in the dump the whole time.

A `publish` token names one exact path and is backed by a database row, so New Link revokes it. A
`read` token names a ROOM and is stateless, because it is checked on every HLS segment — several
per second per viewer — and a database read per segment is the wrong trade. Neither can be spent as
the other; the crossover is refused as `wrong-scope` and has a test each way.

### The MediaMTX configuration this expects

```yaml
# Authentication — every publish AND every read is asked about. Nothing is excluded.
authMethod: http
authHTTPAddress: https://<controller-host>/internal/media-auth

# WHIP. 8889 is the port in the reference's own ingest URL.
webrtcAddress: :8889

# RTMP, standard port, which is why the reference's rtmp:// URL carries none.
rtmpAddress: :1935

# HLS is the PLAYBACK path — `index.m3u8`, served over TLS on 443 by the proxy in front of this.
hls: yes
hlsAddress: :8888
hlsVariant: lowLatency
hlsAlwaysRemux: yes

paths:
  # One path per presenter per room, named room__<shortCode>__<name>.
  '~^room__.*$':
    # Tell the controller when a stream goes live and when it stops, so the room can raise
    # `mtxStartStream` / `mtxStopStream`. NOTE: these are the CURRENT hook names —
    # `runOnReady`/`runOnNotReady` were the old ones and no longer exist.
    runOnAvailable: >
      curl -sS -X POST https://<controller-host>/internal/media-hook
      -H 'content-type: application/json'
      -d "{\"event\":\"available\",\"path\":\"$MTX_PATH\"}"
    runOnUnavailable: >
      curl -sS -X POST https://<controller-host>/internal/media-hook
      -H 'content-type: application/json'
      -d "{\"event\":\"unavailable\",\"path\":\"$MTX_PATH\"}"
```

Hook environment variables, from https://mediamtx.org/docs/usage/hooks: `MTX_PATH`, `MTX_QUERY`,
`MTX_SOURCE_TYPE`, `MTX_SOURCE_ID`, `RTSP_PORT`.

**`/internal/media-hook` is not built.** It is named here because the configuration above is what
the design expects, and writing a config that points at nothing would be worse than saying so. See
§6.

## 6. How a stream becomes visible in the room — fully READ, partly built

> **Corrected 2026-08-14, second pass.** This section previously said the playback mechanism was
> "not established from the bundle" and speculated that WHEP "would be the low-latency choice". Both
> statements were wrong, and neither was evidence — `app-streaming-view.full.js` was sitting
> unopened in the same dump. **It is HLS via hls.js, not WHEP.**

### The notification path

`MtxHandlerService`, byte 1137300 — read in full:

```js
this.appEventBus.subscribe("getSessionMediaStateMTX", () => {
  this.mtxStreams = this.globals.roomMediaStateMTX;
  this.mtxStreams.length > 0 && this.guiEventBus.emit("selectStreamTabOfId", this.mtxStreams[0]);
});
this.appEventBus.subscribe("mtxStartStream", s => {
  this.mtxStreams.push(s);
  (!this.selectedTabID || 1 === this.mtxStreams.length) && this.guiEventBus.emit("selectStreamTabOfId", s);
});
this.appEventBus.subscribe("mtxStopStream", s => {
  for (let r = 0; r < this.mtxStreams.length; r++)
    if (this.mtxStreams[r]._id === s._id) { this.mtxStreams.splice(r, 1); … break }
  this.connectToMTX(s);
});
…
disconnectFromMTX(e){}  handleStreamsMTX(){}  connectToMTX(e){}
```

**Those last three are empty function bodies in the shipped bundle.** That is not a capture gap —
it is what upstream ships. The service maintains a list and selects tabs; it makes no media
connection of its own, because the `<video>` element does that.

### The render path

`app-presentationarea.full.js:589-618` — a tab per stream and a pane per stream:

```js
// tab, per stream: shows e.mediaValue.name, with lock / bring-everyone-here controls
// pane, per stream:
d(0,'div',73), T(1,'app-streaming-view',117)   //  [muser]="e"
// and when there are none:
'No one is streaming right now...'
```

### The player

`app-streaming-view.full.js:112-131`, verbatim:

```js
setupStream() {
  let e = `room__${this.muser.sessionID}__${this.muser.producerID}`;
  this.muser.mediaValue.serverName !== this.appService.globals.streamServerMTX && (e += '__reb');
  this.videoSrc = `https://${this.appService.globals.streamServerMTX}/${e}/index.m3u8?jwt=${this.appService.globals.mtxToken}`;
  this.loadStream();
  this.startPerformanceMonitoring();
}
loadStream() {
  const e = this.videoPlayer.nativeElement;
  bf.isSupported()
    ? (this.cleanup(), this.hls = new bf(this.getHlsConfig()), this.setupHlsEventListeners(e),
       this.hls.attachMedia(e),
       e.volume = globals.preferences.doNotDisturbOn ? 0 : globals.audioVolume)
    : e.canPlayType('application/vnd.apple.mpegurl') && this.setupNativeHLS(e);
}
```

Five things follow, and every one is a build instruction rather than a question:

| fact | consequence |
| --- | --- |
| **`index.m3u8`, hls.js, native-HLS fallback** | The player is `hls.js`, not WebRTC. Not WHEP. |
| **`https://` with no port** | HLS is served on 443 through a TLS proxy, not on 8889. |
| **`?jwt=${globals.mtxToken}`** | Playback is AUTHENTICATED, with the same token family as ingest — hence the `read` scope in §5. |
| **Path is `__{producerID}`, not `__{yourName}`** | A playback path is NOT an ingest path. Ingest is keyed by presenter name; playback by producer id. |
| **`__reb` when `mediaValue.serverName !== streamServerMTX`** | A relayed stream gets a suffixed path. `roomKeyOfPath` is unaffected — the room is still segment two. |

The hls.js configuration is captured in full too: three buffer levels from
`preferences.bufferSizeLevel` (1 Normal / 2 Increased / 3 Maximum), `lowLatencyMode`,
`liveSyncDuration` 0/3/6, adaptive degradation optimal → balanced → conservative after 6 buffering
events in a 30-second window, at most 2 recovery attempts, `playbackRate` 1.5 when more than 10s
behind live and a seek when more than 15s behind.

### What is built and what is not

**Built:** the read scope, the read token, `/internal/stream-read/<code>`, and the whole ingest side.

**Not built:** `/internal/media-hook`, the room's `mtxStreams` list, the stream tabs, and the
`app-streaming-view` equivalent. These are no longer blocked on evidence — every value above is
read and cited. They are blocked on one thing only: **`producerID` and `mediaValue` come from the
server's stream object**, and this repository's media tier (`services/**`) is an import-governed
mirror, so the shape of that object is not ours to invent here. It has to come from the same place
`mtxStartStream` does.

## 7. Recording, and why it is the same decision

The presenter sends `startRecMtx { streams: mtxStreams }` / `stopRecMtx` (byte 2524230). The server
answers on the command channel with `startRec`, `stopRec`, `pauseRec`, `resumeRec`,
`setRecPreview { url }` and `stopRecMsg { data }`.

So **row X** (`setRecPreview` drives the recording-preview window), **row AC** (`stopRecMsg` raises
the notification) and **row R's row 10** (server-side remux to MP4) all become reachable the moment
MediaMTX exists, and none of them can be reached before. Four rows, one deployment.

Client-side recording is NOT a divergence: `startRecFromMuser` falls back to
`mediaService.startRecForMuser(null)` whenever `mtxStreams` is empty (byte 2524230), so the browser
recorder this room already has reproduces a real upstream path.

## 8. Latency, and why the protocol split is not arbitrary

- **WHIP** is WebRTC end to end. Sub-second, and OBS has spoken it natively since v30. This is the
  quality/latency path and it is why `useMediaMTX` exists at all.
- **RTMP** is TCP with buffering, conventionally 2–5s. Ingesting H.264 and republishing over WebRTC
  **without transcoding** keeps it near a second; a transcode would both add latency and cost CPU on
  the media host. XSplit is RTMP-centric, so this path is what makes XSplit work.

MediaMTX serves both, and does not transcode when the codecs already align. That is the whole reason
one server answers both halves of the owner's requirement.

## 9. What is still blocked, precisely

**A MediaMTX host at `STREAM_SERVER_MTX`**, with 8889 (WHIP/WHEP) and 1935 (RTMP) reachable and TLS
in front of it. Everything else on this page is built.

With the variable blank the panel is honest about it and the endpoints still work — the token can be
minted, rotated and validated, and `stream-ingest.db.test.ts` exercises all three. What cannot be
done without the host is an end-to-end publish from a real encoder, which is the one piece of
evidence this feature is not yet able to produce.

---

## 10. Live capture, 2026-08-14 — what it confirmed and what it could not reach

Three runs of `apps/room/scripts/mtx-collect.js` against the live `chat.protradingroom.com`, two
different rooms, ~9 minutes total. All three ran to completion and downloaded.

### Confirmed against the live app

| finding | value |
| --- | --- |
| room URL shape | `https://chat.protradingroom.com/?id=<24-hex>` — the session id is a Mongo ObjectId, not the short code. A second room carried `&sl=1`. |
| the Streams area is real | `#streams-tab`, labelled **"Streams"** — the `presAreaTabs-streams` main tab from `app-presentationarea.full.js`, present in the live DOM. |
| the empty state renders | `noOneStreaming: true` — *"No one is streaming right now…"* is what the live room shows with no MTX stream. Confirms the transcription target in §6. |
| the OBS link elements are ABSENT when unconfigured | `#streaming-link-rtmp`, `#streaming-link` and `#stream-whip-key` do not exist in the DOM at all. Confirms both blocks are gated, not merely hidden. |
| `appService.globals` is NOT on `window` | Production does not expose it. Anything we want from globals has to come off the wire. |
| webcam elements | `#webcamVideo-` (`.webcamsHolderVideo`), `#webcamScreenLocalPreview` (`.webcamPreviewScreen`). |

### Not reached, and why — stated rather than worked around

**No `mtxStartStream`, `mtxStopStream` or `getSessionMTXMediaState` frame was captured**, so the real
`muser` payload is still un-observed. Three independent reasons, and it is not yet known which
dominate:

1. **Nothing was streaming.** Both rooms showed the empty state throughout, and every `<video>` had
   `readyState: 0` with no `currentSrc`. There was nothing to notify about.
2. **The runs were from a phone** (Pixel 9, mobile Chrome). An OBS publish could not be started from
   the capturing device.
3. **A defect in the collector, owned here rather than reported as a finding about their app.**
   `recordFrame` only stores frames matching an MTX regex, so `frames: 0` cannot distinguish "the
   hook worked and the room was quiet" from "the hook never saw a frame at all" — which is what
   would happen if the app uses socket.io HTTP long-polling rather than a WebSocket. The script
   needs a total-frames counter and an XHR/fetch hook before another run is worth doing.

### What a useful capture requires

A **desktop** browser, in a room with **`useMediaMTX` on**, with an **actual OBS/XSplit publish**
running during the window. Absent any one of those there is nothing to observe, and further runs
would produce more empty files rather than more knowledge.

### What this does NOT block

Nothing. The client contract in §1-§6 is read from the bundle and is complete: the three server
commands and their payload keys, the `muser` fields the views consume, the HLS URL, and the whole
hls.js configuration. The capture is confirmation, not a dependency. What it would add is the real
`rtmpToken` format and the real `muser` values — useful, not load-bearing.
