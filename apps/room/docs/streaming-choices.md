# Streaming quality — every option, ranked

Written 2026-08-05.

> **Superseded 2026-08-29.** This line read *"Nothing here is implemented except the entry marked
> DONE"*, and the only entry so marked is row 1. It has been untrue since **rows 2 and 4 shipped**:
> the recorder picks VP9 at 8 Mbps (`apps/room/src/lib/recording-codec.ts`) and the screen track
> carries `contentHint = 'detail'` (`apps/room/src/lib/room/local-capture.svelte.ts`, in
> `startScreenSharing`). `TODO.md` row R had recorded that this line needed correcting *"when
> somebody next opens it"*; this is that.

**Implemented as of 2026-08-29: rows 1, 2 and 4.** Rows 6, 8 and 10 remain open and each needs the
measurement named in its own entry — rows 6 and 8 need a human at an OS screen picker, because
`getDisplayMedia` cannot be automated and headless returns a synthetic gradient that compresses too
easily to show any difference.

**Read the "Evidence" column before acting on any row.** Some entries are backed by measurements
taken on this machine; others are reasoning from a spec and are labelled as such. The difference
matters: an unmeasured claim is a hypothesis with a confident tone.

---

## What is already true

Measured, not assumed:

| Fact                                 | Value                                                                                                                               |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| Screen share capture                 | `getDisplayMedia({audio:false, video:{width:{max:1920},height:{max:1080},frameRate:{max:30}}})` — **byte-identical to the capture** |
| Screen share delivered               | 1920×1080 @ 30                                                                                                                      |
| SFU first video codec                | **VP9** (`services/media/src/codecs.rs`), H.264 and VP8 behind it                                                                   |
| Codec pinned by client               | none — `produceScreen` passes no `codec`, so the router's first offer wins                                                          |
| Encodings sent                       | `undefined` — matches the capture's `useSharingSimulcast = !1`                                                                      |
| `videoGoogleStartBitrate`            | `100_000` — matches the capture's `1e5`                                                                                             |
| Screen track `contentHint`           | **`'detail'`** — set in `local-capture.svelte.ts`'s `startScreenSharing`, on the SCREEN capture only, never the camera path. Recorded as `unset` here until 2026-08-29, which was stale from the moment row 2 shipped |
| Canvas/overlay re-encode in the path | none                                                                                                                                |
| Browser                              | Chrome 150.0.7871.187                                                                                                               |
| Screen share SENT (presenter)        | 1920×1080 @19, ~525 kbps, `qualityLimitationReason: none`, `encoderImplementation: libvpx`, `scalabilityMode: L1T1`                 |
| Screen share RECEIVED (member)       | 1920×1080 @20, `video/VP9`, 236 frames decoded, **0 dropped**                                                                       |
| Cumulative quality limitation        | `{bandwidth: 0, cpu: 0, none: 11.988, other: 0}` — the encoder spent **zero seconds** constrained                                   |

### The finding that reframes everything below

Measured presenter→member, 12 seconds of a live share with a member attached:

**Resolution is not the problem.** Full 1920×1080 leaves the presenter, arrives at the member, and
paints at 1920×1080. VP9 end to end. Zero dropped frames. Nothing downscales anywhere.

**Nothing is throttling it.** `qualityLimitationReason: none`, and the cumulative durations are
`bandwidth: 0, cpu: 0`. The encoder was never constrained.

So if a share looks soft on the member side, **it is not a bottleneck to remove — it is that nothing
asks the encoder to spend more bits.** With `encodings: undefined` there is no floor, no ceiling and
no content hint, so libvpx's own heuristic decides, and that heuristic is tuned for camera video,
not text.

That changes the shape of rows 2 and 8: they are not "lift a limit", they are "give it a reason".

**Caveat on the 525 kbps.** Headless `getDisplayMedia` returns Chrome's synthetic test pattern — a
smooth gradient that is nearly free to compress. On realistic content (13px monospace, 120
candlesticks, gridlines) VP9 spent **3841 kbps** at the same settings. The low figure is the test
content, not a cap. What is trustworthy here is the _pipeline_: full resolution, no throttling, no
drops. What is NOT known is how many bits it spends on real charts — that needs a real desktop
shared while the same stats are read.

The capture's constraint table, which is the vocabulary for anything resolution-related:

```js
const JN = {
  qvga: { width: { ideal: 320 }, height: { ideal: 240 } },
  vga: { width: { ideal: 640 }, height: { ideal: 480 } },
  hd: { width: { ideal: 1280 }, height: { ideal: 720 } },
  hdd: { width: { ideal: 1920 }, height: { ideal: 1080 } }
};
```

`JN.hdd` is referenced **once**. `qvga`, `vga` and `hd` are referenced **zero** times — defined and
never used.

---

## The ranking

### 1. Camera / virtual-cam share at 1080p — **DONE 2026-08-05**

Was `getUserMedia({video:true})`, measured **640×480**. The capture spreads `JN.hdd` and passes
`deviceId:{ideal: globals.videoDeviceID}`. Members watching an OBS / XSPLIT / virtual-cam share were
receiving a ninth of the pixels the original sends, and the camera chosen in AV settings was written
by the modal and never read back.

Now: presenter 1920×1080, member receives 1920×1080 over the SFU, 3/3 verified.

- **Pro** — a defect with captured evidence, not a tuning preference. Nine times the pixels.
- **Con** — nine times the pixels is also more bandwidth for every member. That cost was always
  intended; we were under-spending by accident.
- **Evidence** — MEASURED both before and after, presenter and member.

---

### 2. `contentHint = 'detail'` on the screen track

One line on the outgoing screen track.

- **Pro** — biases the encoder's rate-distortion decisions toward spatial detail. For candlesticks,
  gridlines and quote text this is the correct trade. Currently unset, so nothing is asking the
  encoder to prefer sharpness.
- **Con** — **its cost is unmeasured.** It may raise the bitrate; under constraint it degrades frame
  rate instead of resolution, which changes how a share _feels_ even if it reads better. I earlier
  described this as costing nothing. That was an assumption and it was wrong to state.
- **Con** — the capture sets `contentHint = "detail"` only on its alert-overlay canvas stream, never
  on the raw screen track. So this is a divergence, not a reproduction.
- **Evidence** — the current value (unset) is MEASURED. So is the headroom: `limitedBy=none`,
  `bandwidth: 0`, `cpu: 0`, so the encoder has room to spend more and is choosing not to. The
  EFFECT of the hint is still NOT measured.
- **Now the strongest candidate.** Since nothing is throttling, the only way the picture improves is
  if the encoder is told the content is text/graphics rather than camera video. That is exactly what
  this flag does.
- **To validate** — same `getStats()` read, before and after, on a REAL desktop share (the headless
  test pattern compresses too easily to show a difference).

---

### 3. Resolution picker for the camera / virtual-cam path

A dropdown in AV settings driving the tier passed to `getUserMedia`.

- **Pro** — the four values are captured (`JN`), so the numbers are not invented even though the UI
  is. Presenters on poor uplinks get a way down; the room stops paying 1080p for everyone.
- **Pro** — the capture already has the shape of this: `enableCam()` reads
  `const {resolution:_} = this.webcam` and spreads `JN[_]`.
- **Con** — **that mechanism is broken in the original.** `this.webcam` is initialised
  `{device:null, resolution:"sd"}` and nothing in the bundle ever writes to it. `JN` has no `sd`
  key, so `JN["sd"]` is `undefined` and the spread contributes nothing. The original's webcam runs
  unconstrained. Copying the mechanism means copying a dead switch; building a working one is new.
- **Con** — **OBS may ignore it.** A virtual camera emits whatever OBS is configured to output, and
  `ideal` is a request, not a demand. A picker on this path can appear broken through no fault of
  ours.
- **Con** — one presenter's choice sets bandwidth for every member. Presenter-only, and it needs a
  sane default.
- **Evidence** — `JN` contents, the single `JN.hdd` use, and the zero writes to `webcam.resolution`
  are all MEASURED by reading the bundle. Whether OBS honours `ideal` is NOT measured.
- **Watch out** — `applyConstraints()` retunes a live track with no new permission prompt and no new
  producer, so a mid-share change need not drop the stream. Untested here.

---

### 4. Recording codec and bitrate — VP9 @ 8–12 Mbps

Recorder only. Does not change the stream members receive.

Measured on realistic screen content (34 lines of 13px monospace, 120 animated candlesticks, thin
gridlines, 1080p30), same content for every row:

| Codec          | cap 2 Mbps | cap 8 Mbps | cap 16 Mbps |
| -------------- | ---------: | ---------: | ----------: |
| **VP9 (webm)** |       1429 |   **3841** |    **6414** |
| AV1 (webm)     |       1928 |       3778 |        3802 |
| H.264 (mp4)    |       1582 |       2033 |        1990 |
| HEVC (mp4)     |       1238 |       1723 |        1626 |

_(kbps actually produced)_

- **Pro** — only VP9 keeps scaling. Everything else saturates and ignores a higher cap; for 1080p
  text a hard 2 Mbps ceiling is a quality ceiling. All four encode in real time on this machine.
- **Con** — **not bandwidth-free for the presenter's CPU.** A second 1080p encode competes with the
  live encoder, and on a loaded machine that can drop frames on the share members are watching. I
  previously stated this could not affect members. That was wrong and unmeasured.
- **Con** — `.webm` does not open in QuickTime on macOS. mp4/H.264 opens everywhere and caps at
  ~2 Mbps, so compatibility and sharpness are directly opposed here.
- **Evidence** — the bitrate table is MEASURED. Perceptual quality is NOT — no PSNR/SSIM was run,
  the inference is from the saturation ceiling.

---

### 5. Webcam resolution constraint

The presenter's own camera, currently unconstrained.

- **Pro** — would fix the original's dead `JN["sd"]` switch and give a predictable webcam size.
- **Con** — a straight divergence: the original genuinely ships an unconstrained webcam. Matching
  its _effective_ behaviour means changing nothing.
- **Con** — the webcam is a small tile in the corner. Pixels spent here buy far less than pixels
  spent on the shared screen.
- **Evidence** — the dead-switch analysis is MEASURED by reading. The visual benefit is NOT.

---

### 6. Raising the 1080p screen cap for Retina displays

- **Pro** — `{max:1920}` downsamples a Retina surface _before_ encoding, so text is softened before
  any codec sees it. On a high-DPI display this is likely the largest single quality factor.
- **Con** — every member pays, in bandwidth and decode CPU, and members on laptops gain nothing from
  pixels their screen cannot show.
- **Con** — diverges from a constraint that is byte-identical to the capture.
- **Evidence** — that we cap at 1920×1080 and deliver exactly that is MEASURED. The Retina benefit
  is NOT measured on this machine.

---

### 7. `degradationPreference: 'maintain-resolution'`

- **Pro** — states explicitly what #2 only hints, so behaviour under congestion is not left to the
  browser's default.
- **Con** — `degradationPreference` appears **0 times** in the capture. There is no evidence it
  belongs in this app at all.
- **Con** — overlaps #2. Doing both without measuring means not knowing which one acted.
- **Evidence** — the zero-occurrence count is MEASURED. Everything else is spec reasoning.

---

### 8. Explicit `maxBitrate` on the screen encoding

- **Pro** — removes reliance on libvpx's own heuristic, which is the thing currently deciding
  525 kbps was enough. A `minBitrate` in particular would stop it under-spending when there is
  measured headroom (`bandwidth: 0`, `cpu: 0`).
- **Con** — sets a floor under everyone's bandwidth. Congestion control currently adapts; a hard
  number stops it adapting downward as gracefully, and a floor is exactly the thing that hurts the
  member on the worst connection.
- **Con** — the capture passes `encodings: undefined`. Any value here is invented.
- **Evidence** — that we send `undefined` is MEASURED. The effective default ceiling is NOT.

---

### 9. VP9 SVC (`scalabilityMode: 'S3T3'`)

- **Pro** — the SFU is explicitly built for it: _"VP9 first: this is what puts the client on the
  `S3T3` SVC path"_ (`codecs.rs`). Per-member layer selection is the correct answer to mixed
  connection quality.
- **Con** — the capture disables it (`useSharingSimulcast = !1`), so production never takes this
  path.
- **Con** — enabling it here previously **stalled the stream**: 24 packets, 0 lost,
  `framesReceived 0`, and the consumer asking for a keyframe 41 times.
- **Evidence** — the router config and the capture's flag are MEASURED. The stall is MEASURED, and
  recorded in `session.ts`.
- **Verdict** — do not reopen without a specific reason and a reproduction.

---

### 10. Server-side recording (MediaMTX / transcoding workers)

- **Pro** — what the original actually does: `mediaSoupService.startRec()` and
  `sendServerAdminCommand('startRecMtx', {streams})`, with the server returning a `recName`. Records
  the _room_, not one presenter's screen, and costs the presenter nothing.
- **Con** — needs the recording/transcoding workers that `MEDIASOUP-DEPLOYMENT-PLAN.md` explicitly
  defers, plus storage.
- **Con** — the MTX path is dead in this deployment anyway: the Streams tab is `hidden` in
  `new-evidence/presenter-tab` **and** in our markup, so `mtxStreams.length > 0` is false and the
  capture itself falls through to the non-MTX branch.
- **Evidence** — all of the above MEASURED by reading the bundle, the plan, and both markups.

---

## The honest summary

Row 1 is done and was a real defect. Row 4 is contained — it touches the recorder, not the stream,
though not the presenter's CPU. Row 2 is now the strongest remaining candidate: the wire measurement shows
full resolution arriving with zero throttling, so the only lever left on crispness is telling the
encoder what kind of content it is looking at. Row 3 still needs a decision about scope. Rows 7–9 are either uncaptured, invented, or already known to
break.

The measurement that settles rows 2, 6, 7 and 8 is the same one: a presenter sharing with a member
attached, reading `outbound-rtp` from `getStats()` — `bytesSent`, `framesPerSecond`,
`qualityLimitationReason`, `totalEncodeTime` — as a baseline and then per change. Until that exists,
every claim in those rows is a hypothesis.
