# Streaming quality — every option, ranked

Written 2026-08-05.

> **Superseded 2026-08-29.** This line read _"Nothing here is implemented except the entry marked
> DONE"_, and the only entry so marked is row 1. It has been untrue since **rows 2 and 4 shipped**:
> the recorder picks VP9 at 8 Mbps (`apps/room/src/lib/recording-codec.ts`) and the screen track
> carries `contentHint = 'detail'` (`apps/room/src/lib/room/local-capture.svelte.ts`, in
> `startScreenSharing`). `TODO.md` row R had recorded that this line needed correcting _"when
> somebody next opens it"_; this is that.

**Implemented as of 2026-08-29: rows 1, 2 and 4. Row 8 is DECIDED on evidence as of 2026-09-02 and
the answer is NO.** Rows 6 and 10 remain open, each for the reason its own entry now names.

**The sentence this paragraph used to carry was wrong twice over, and both corrections are on the
record because each was itself a correction.** It read: _"rows 6 and 8 need a human at an OS screen
picker, because `getDisplayMedia` cannot be automated and headless returns a synthetic gradient that
compresses too easily to show any difference."_

1. `getDisplayMedia` **can** be automated — corrected 2026-09-01, and `--auto-select-desktop-capture-source`
   is the flag. The synthetic-gradient half was about `--use-fake-device-for-media-stream`, which is
   a `getUserMedia` camera flag and was not used in any attempt.
2. The replacement claim — _"blocked on a CAPTURABLE DISPLAY"_, on six attempts returning
   `NotReadableError: Could not start video source` — is **also wrong, measured 2026-09-02**. Under
   `xvfb-run -s "-screen 0 1920x1080x24 +extension COMPOSITE +extension DAMAGE +extension RANDR"`
   with headed Chromium 1194, `getDisplayMedia` returned a live track:
   `{displaySurface:"monitor", width:1920, height:1080, frameRate:30, deviceId:"screen:399:0"}`.

   What the first attempt of THAT probe hit is worth keeping, because it is how a wrong blocker gets
   written: on `about:blank`, `navigator.mediaDevices` is `undefined`, because the page is not a
   secure context. The failure is nothing to do with the display, and it looks like everything to do
   with it. Serving the probe page from `http://127.0.0.1` fixed it.

**Read the "Evidence" column before acting on any row.** Some entries are backed by measurements
taken on this machine; others are reasoning from a spec and are labelled as such. The difference
matters: an unmeasured claim is a hypothesis with a confident tone.

---

## What is already true

Measured, not assumed:

| Fact                                 | Value                                                                                                                                                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Screen share capture                 | `getDisplayMedia({audio:false, video:{width:{max:1920},height:{max:1080},frameRate:{max:30}}})` — **byte-identical to the capture**                                                                                   |
| Screen share delivered               | 1920×1080 @ 30                                                                                                                                                                                                        |
| SFU first video codec                | **VP9** (`services/media/src/codecs.rs`), H.264 and VP8 behind it                                                                                                                                                     |
| Codec pinned by client               | none — `produceScreen` passes no `codec`, so the router's first offer wins                                                                                                                                            |
| Encodings sent                       | `undefined` — matches the capture's `useSharingSimulcast = !1`                                                                                                                                                        |
| `videoGoogleStartBitrate`            | `100_000` — matches the capture's `1e5`                                                                                                                                                                               |
| Screen track `contentHint`           | **`'detail'`** — set in `local-capture.svelte.ts`'s `startScreenSharing`, on the SCREEN capture only, never the camera path. Recorded as `unset` here until 2026-08-29, which was stale from the moment row 2 shipped |
| Canvas/overlay re-encode in the path | none                                                                                                                                                                                                                  |
| Browser                              | Chrome 150.0.7871.187                                                                                                                                                                                                 |
| Screen share SENT (presenter)        | 1920×1080 @19, ~525 kbps, `qualityLimitationReason: none`, `encoderImplementation: libvpx`, `scalabilityMode: L1T1`                                                                                                   |
| Screen share RECEIVED (member)       | 1920×1080 @20, `video/VP9`, 236 frames decoded, **0 dropped**                                                                                                                                                         |
| Cumulative quality limitation        | `{bandwidth: 0, cpu: 0, none: 11.988, other: 0}` — the encoder spent **zero seconds** constrained                                                                                                                     |

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
  is NOT measured, and the reason is NOT the one this file used to give.
- **What actually blocks it, named correctly 2026-09-02** — a HIGH-DPI SOURCE and a person judging
  legibility. A capturable display exists here (see the header), so the automation half is answered;
  what an Xvfb framebuffer at 1920×1080 cannot provide is a surface with more pixels than the cap
  removes, and no measurement of "is the text sharper" is available without an eye. Those are
  different blockers with different prices, and the earlier one was cheaper to state than to check.

---

### 7. `degradationPreference: 'maintain-resolution'`

- **Pro** — states explicitly what #2 only hints, so behaviour under congestion is not left to the
  browser's default.
- **Con** — `degradationPreference` appears **0 times** in the capture. There is no evidence it
  belongs in this app at all.
- **Con** — overlaps #2. Doing both without measuring means not knowing which one acted.
- **Evidence** — the zero-occurrence count is MEASURED. Everything else is spec reasoning.

---

### 8. Explicit `maxBitrate` on the screen encoding — **DECIDED 2026-09-02: NO**

- **Pro (REFUTED)** — it read _"removes reliance on libvpx's own heuristic, which is the thing
  currently deciding 525 kbps was enough. A `minBitrate` in particular would stop it under-spending
  when there is measured headroom."_ **525 kbps was never a ceiling.** It was the heuristic spending
  what nearly-static content needed.
- **Con** — sets a floor under everyone's bandwidth. Congestion control currently adapts; a hard
  number stops it adapting downward as gracefully, and a floor is exactly the thing that hurts the
  member on the worst connection.
- **Con** — the capture passes `encodings: undefined`. Any value here is invented.
- **Evidence — the effective default ceiling IS measured now, and it is 2.5 Mbps.** A loopback
  `RTCPeerConnection` inside one page, so the number is the ENCODER's rather than an SFU's; the
  captured surface a deliberately busy 1920×1080 page (three columns of hex and random text
  repainting at 30 Hz), because a static desktop measures libvpx's floor and not its ceiling;
  `contentHint = 'detail'` set, as `startScreenSharing` sets it; codec preferences applied BEFORE
  `createOffer`, because applying them after is silently ignored — which is how the first run of the
  probe measured VP8 while believing it had asked for VP9.

  Steady state over twelve two-second samples:

  | field                     | value                                                |
  | ------------------------- | ---------------------------------------------------- |
  | `targetBitrate`           | **2,500,000** (2,487,392 – 2,500,000 across samples) |
  | measured send             | 2,476 – 2,613 kbps                                   |
  | `qualityLimitationReason` | `none`                                               |
  | `encoderImplementation`   | `libvpx`                                             |
  | codec                     | `video/VP9`                                          |
  | frame size                | 1920×1080                                            |

- **The decision, and it follows from the number rather than from taste.** libvpx already has
  2.5 Mbps of headroom for this track and spends it when the content asks; it spent 525 kbps on the
  earlier measurement because that screen was nearly still. A `maxBitrate` at or below 2.5 Mbps would
  only take headroom away; above it, it would do nothing. A `minBitrate` would force spending on
  frames that do not need it — bandwidth billed to every member so a static slide can be sent
  expensively. **And the capture passes `encodings: undefined`, so doing nothing is also the match.**
- **What this measurement does NOT establish**, stated so the number is not over-claimed: it was
  taken with software rendering under Xvfb, which held the capture to 7–8 encoded fps against the
  19–20 the room measured on real hardware. Frame RATE therefore is not measured here; the
  per-second bitrate ceiling is, and it is what the row asked for.

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
