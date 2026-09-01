# The media plane, measured

**2026-08-31.** Every claim below was produced by running the thing, in this container, and the
commands are given so each can be re-run. Nothing here is read from documentation unless it says so.

Until this date the trackers recorded rows **X**, **AC**, **AD**, **SP**, **R row 10** and **T5-16**
as blocked on "a MediaMTX host at `STREAM_SERVER_MTX`". That premise was never tested. It is wrong:
MediaMTX is a single static binary, its own release is reachable from here, and the whole plane runs
locally. What the rows were actually blocked on turns out to differ row by row, and is restated at
the end.

## The rig

```
MediaMTX v1.20.1   github.com/bluenviron/mediamtx release tarball, HTTP 200
publisher          Chromium 1194 (Playwright's), WebRTC over WHIP
room               apps/room built with ADAPTER=node, on 127.0.0.1:9099
subscriber         a raw fetch of /sess/7301/events holding the session cookie a browser earned
```

Playwright's bundled **ffmpeg cannot publish**: it is built `--disable-everything` with only
VP8/webm/mjpeg, no libx264 and no RTSP muxer, so `-preset` is not even a recognised option. WHIP from
a browser replaced it and is closer to what a screenshare actually does.

## 1. The control API is NOT localhost-only, and the room's source said it was

The shipped `mediamtx.yml`:

```
147: api: false
149: apiAddress: :9997
```

The API is **off** by default, and `:9997` with no host is **every interface**. Measured rather than
inferred from the colon — an instance on `apiAddress: :9998` logs `[API] started with listener on
:9998` and answers on this container's non-loopback `192.0.2.2`, while one on `127.0.0.1:9997`
refuses that same connection (`Couldn't connect to server`).

What keeps it closed out of the box is **authorisation, not the bind**. `authInternalUsers` ships two
`any` users and the second — the only one holding `action: api` — is fenced by
`ips: ["127.0.0.1", "::1"]`:

| from                                  | result                                                  |
| ------------------------------------- | ------------------------------------------------------- |
| `http://127.0.0.1:9998/v3/paths/list` | `200 {"itemCount":0,"pageCount":0,"items":[]}`          |
| `http://192.0.2.2:9998/v3/paths/list` | `401 {"status":"error","error":"authentication error"}` |

The distinction matters because the two fail differently. A deployment that grants `api` to a user
with the default empty `ips: []`, or that points `authHTTPAddress` at its own service, has the
control API answering the whole network on every interface with nothing in the address line to warn
it — and `POST /v3/config/paths/add` is on the same API, so this is a write surface.

`mtx-reconcile.ts` and `src/env.ts` both claimed _"listens on `127.0.0.1:9997` by default,
localhost-only unless configured otherwise"_. Both are corrected, and both now carry the measurement.

## 2. The hook names and the path schema, from the binary

`runOnAvailable`, `runOnAvailableRestart` and `runOnUnavailable` are in the shipped config;
`runOnReady` and `runOnNotReady` occur **zero** times. The room already had this right, from the
docs; it is now confirmed against the artefact.

A path with no publisher, created by `POST /v3/config/paths/add`:

```json
{
  "name": "room__7301__Dana_Vero",
  "ready": false,
  "readyTime": null,
  "available": false,
  "availableTime": null,
  "online": false,
  "onlineTime": null,
  "source": null,
  "tracks": [],
  "readers": [],
  "bytesReceived": 0,
  "bytesSent": 0
}
```

The deprecated `ready`/`readyTime` pair is still present and still agrees with `available`. That is
precisely the condition under which reading `ready` looks correct up to the release that removes it,
which is why `mtx-reconcile.ts` reads `available` and why its fixtures now carry both.

## 3. The whole chain, end to end

Chromium → WHIP → MediaMTX → `runOnAvailable` → `POST /internal/media-hook` → `publishToRoom` → a
subscribed presenter's SSE connection:

```
04:42:07  browser publishes; MediaMTX logs "is publishing to path 'room__7301__Dana_Vero'"
04:42:08  runOnAvailable command started -> the room answers 200
04:42:08  FRAME {"channel":"cmds","data":{"cmd":"mtxStartStream","muser":{"_id":"room__7301__Dana_Vero",
                 "sessionID":"7301","producerID":"Dana_Vero","mediaValue":{"name":"Dana_Vero"}}}}
```

The route's own refusals were exercised over real HTTP at the same time: no bearer `401`, wrong
bearer `401`, right bearer `200`, unknown event `400 Unknown event.`, unparseable path
`400 Unrecognised path.`

## 4. A defect this found: every event was delivered TWICE

The first full run, before the fix:

```
04:33:52.676  mtxStartStream    the hook   (runOnAvailable logged at 04:33:52)
04:33:55.427  mtxStartStream    the poll,  2.75s later
04:34:11.286  mtxStopStream     the hook   (runOnUnavailable at 04:34:11)
04:34:15.429  mtxStopStream     the poll,  4.14s later, on the same 5-second grid
```

The hook published to subscribers without updating the reconciler's baseline, so the next poll
re-derived a delta the room had already been told. `applyMtxStartStream` is `[...state.streams,
stream]` — an unconditional append, transcribed that way deliberately — so **a presenter going live
put two identical tabs in every viewer's room**, and the paired duplicate stop cancelled them at the
end. Wrong for exactly as long as the stream was up.

Neither side's unit tests could see it: `mtx-reconciler.test.ts` proves a poll publishes what
changed, the media-hook tests prove the hook publishes what it was told, and **both are correct**.
The defect lived only in the seam.

Fixed by `noteHookPublished`, with an `epoch` guard for the case where a hook lands while a poll's
request is in flight — without it the stale answer publishes `mtxStopStream` for a stream that is
playing, which the negative control confirmed. After the fix, same rig, a 20-second stream with the
5-second reconcile running throughout:

```
04:42:08.730  mtxStartStream    (one)
04:42:27.280  mtxStopStream     (one)
```

## 5. MediaMTX IS an archive service

`record: yes` plus `playback: yes` needs no extra software. `GET /list?path=…` returns:

```json
[
  {
    "start": "2026-08-31T04:43:32.525276Z",
    "duration": 23,
    "url": "http://127.0.0.1:9996/get?duration=23&path=room__7301__Dana_Vero&start=..."
  }
]
```

against a real `.mp4` on disk. Compare what the Recordings tab (**T5-16**) needs — `vidPath`,
`contentType`, `name`, `created`, `length` in milliseconds:

| the tab needs | MediaMTX gives                                   |
| ------------- | ------------------------------------------------ |
| `created`     | `start`, RFC3339                                 |
| `length` (ms) | `duration` × 1000                                |
| `vidPath`     | `url`, the `/get` endpoint                       |
| `name`        | the path's producer segment                      |
| `contentType` | fixed by `recordFormat` — `video/mp4` for `fmp4` |

So the row's premise — _"this product stores no recordings server-side"_ — is a statement about
configuration, not about a missing capability.

**The catch, measured twice:** the fmp4 recorder logged `[recorder] skipping track 2 (VP8)` and then
`recording 1 track (Opus)`. A WebRTC publisher that negotiates VP8 records **audio only**. Whether
H264 records was **not measured here** and is not claimed: this Chromium offers
`video/VP8 video/rtx video/AV1 video/VP9 video/VP9 video/red video/ulpfec` and no H264 at all, so the
`setCodecPreferences` attempt was a silent no-op. An OBS/RTMP publisher sends H264 and would be the
way to settle it.

## What each row is actually blocked on now

| row                      | before                                      | measured                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AD** OBS/XSplit        | "an end-to-end publish from a real encoder" | **done** — published, hooked, reconciled, watched on the wire. Nothing left but an operator's host                                                                                                                                                                                                                                                                                              |
| **T5-16** Recordings     | "no archive service"                        | a **decision**: turn on `record`/`playback` and map five fields. Plus the VP8 finding above                                                                                                                                                                                                                                                                                                     |
| **X** `recPreviewWindow` | "a MediaMTX cluster"                        | **CLOSED 2026-09-01, and not by a media plane.** Both halves of this cell were true and the conclusion was not: `recPreviewLocation` is a value the SERVER SENDS, by one command nobody had transcribed. The receiver and the whole of `app-rec-preview` are built; the card stays dark here because the capture's own arming test fails, which is what a reference room does in the same state |
| **AC** `stopRecMsg`      | "a MediaMTX cluster"                        | **CLOSED 2026-09-01**, same correction. The payload is indeed server-generated text and is still not invented here; the RECEIVER is transcribable regardless, and is built                                                                                                                                                                                                                      |
| **SP** Stream Player     | "an owner decision, then a host"            | unchanged — anonymous playback authorization is not a media question                                                                                                                                                                                                                                                                                                                            |
| **R row 10** remux       | "the same cluster as X and AC"              | now downstream of T5-16: there is nothing to remux until something records                                                                                                                                                                                                                                                                                                                      |
