# Measuring what the screen share actually spends

The one measurement that settles `streaming-choices.md` rows **6** and **8**, and that would
retire the "cost unmeasured" caveat on row 2 (`contentHint = 'detail'`, shipped 2026-08-10).

Written 2026-08-11, after an attempt that had to be abandoned: the browser had six Simpler Trading
tabs and two ChatGPT tabs open, all with their own WebRTC connections, and `chrome://webrtc-internals`
lists **every page in the browser** rather than one app. Doing this properly needs a few minutes with
those tabs closed, which is why it is written down instead of rushed.

---

## Why it takes a second session

A video encoder adapts to who is receiving. With nobody attached it has no reason to spend bits, so
a share with no viewer measures the wrong thing. This is true of every WebRTC application — Zoom,
Meet, Teams — and is not a property of this app.

**It is still one person.** The second session is an **incognito window joining as a GUEST**: name
and email, no account, no logging out of anything. Two tabs in one window will not do it, because
they share a cookie jar and the room would see one participant.

## Why it cannot be automated — RE-MEASURED 2026-09-01, and the stated reason was wrong

This section read:

> `getDisplayMedia` requires a real user gesture and an operating-system screen-picker dialog.
> Browser automation can drive a page; it cannot click an OS dialog. So this needs a human for the
> thirty seconds it takes, and **no amount of tooling removes that**.

**The picker is not what stops it.** Chromium ships
`--auto-select-desktop-capture-source=<title match>` for exactly this purpose, and it works: driven
under `xvfb-run` with headed Chromium 1194, `getDisplayMedia({video:true})` never raises a picker and
never returns `NotAllowedError`. Permission is granted, the source is selected, and the call gets as
far as trying to open the capture.

What it returned on six attempts was **`NotReadableError: Could not start video source`**, and this
section concluded that the container's Xvfb display has no surface Chromium's X11 capturer can open.

## THAT CONCLUSION IS ALSO WRONG — measured 2026-09-02, and it captured

Same container, same Chromium 1194, `xvfb-run -a -s "-screen 0 1920x1080x24 +extension COMPOSITE
+extension DAMAGE +extension RANDR"`, `--auto-select-desktop-capture-source=Entire screen`:

```json
{
  "displaySurface": "monitor",
  "width": 1920,
  "height": 1080,
  "frameRate": 30,
  "cursor": "always",
  "logicalSurface": true,
  "deviceId": "screen:399:0"
}
```

A live track, not an error. And the way the 2026-09-02 probe FIRST failed is the more useful half of
this record, because it is exactly how a wrong blocker gets written: on `about:blank`,
`navigator.mediaDevices` is `undefined`, because the page is not a secure context. The error has
nothing to do with the display and reads like it has everything to do with it. Serving the probe page
from `http://127.0.0.1` — which IS a secure context — fixed it.

**So the corrections here run three deep**, and each one replaced a confident sentence with another
confident sentence: _a human must click a picker_ → _the picker is not the problem, the display is_ →
_the display is not the problem either_. The lesson is not about screen capture. It is that a blocker
is a MEASUREMENT and this one was written three times as an inference.

**Row 8 of `streaming-choices.md` is measured and DECIDED as a result** — the default ceiling is
2.5 Mbps and no explicit `maxBitrate` is set. **Row 6 is still open, and its blocker is named
correctly now**: a HIGH-DPI SOURCE and a person judging legibility. An Xvfb framebuffer at 1920×1080
has no pixels for a 1920 cap to remove, and "is the text sharper" has no automated answer.

**One more correction in the same pass.** The claim elsewhere that headless "returns Chrome's
synthetic gradient, which compresses too easily to show any difference" is about
`--use-fake-device-for-media-stream` — a DIFFERENT flag, and one that applies to `getUserMedia`
cameras rather than to desktop capture. It was not used in any of the six attempts above, so it is
not what produced the failure and it is not evidence that automation cannot work.

**What is still true, and was confirmed rather than assumed:** the measurement needs a real viewer
attached, because an encoder with nobody receiving has no reason to spend bits. The 2026-09-02 probe
satisfied that with a loopback `RTCPeerConnection` inside one page — a second peer connection is a
real receiver — which is why it could take row 8's number without a second machine. For a
member-facing quality judgement the two-session procedure below is still the right shape.

**The human procedure below remains correct**, and it is what answers the questions an encoder
statistic cannot: whether the text on a shared IDE is legible to a member, and whether raising the
cap changes that. It is not deleted, and it is no longer the only way anything here gets measured.

---

## The procedure

Order matters: `chrome://webrtc-internals` logs from the moment it is opened, so opening it _before_
the connection exists captures the whole timeline — negotiation, first keyframe, the bitrate ramp —
instead of joining midway.

1. **Stop any screen share** that is already running.
2. **Close other tabs with live WebRTC connections.** Anything on `simplertrading.com`,
   `chatgpt.com`, Meet, Zoom. While those pages are open their connections are listed, and a dump
   will contain them.
3. **Close every `chrome://webrtc-internals` tab.** Two open duplicates everything.
4. **Open one fresh tab** at `chrome://webrtc-internals`. It should be empty.
5. **Enter the room and start the screen share.** Prefer a **chart** — thinkorswim, a platform, a
   terminal. The doc's 3841 kbps was measured on candlesticks, gridlines and 13px text; a desktop
   wallpaper is real content but not comparable to that figure.
6. **Join from the second session:** incognito → `https://www.tradingroom.app/session/1001` → any
   name and email. Confirm the share is actually visible there.
7. **Wait ~30 seconds**, so there is steady state and not only the ramp.
8. **Create a WebRTC-Internals dump → Download**, with `chat.tradingroom.app/?room=1001` selected.

Only `chat.tradingroom.app/?room=1001` should appear in the list. If anything else does, a tab is
still open.

**Alternative:** `apps/room/scripts/collect-share-stats.js` pasted into the presenter's console
_before_ starting the share. It samples for 30 seconds, prints kbps per second, and downloads its
own JSON. It must go in first — it hooks `RTCPeerConnection` at construction and cannot see a
connection that already exists.

---

## What to read out of it

From `outbound-rtp (video)` on the `room=1001` connection:

| stat                                                     | what it settles                                                                          |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `bytesSent` over time                                    | the real bitrate on real content — the number the whole exercise is for                  |
| `qualityLimitationReason` + `qualityLimitationDurations` | whether anything is throttling. The 2026-08-05 read was `none`, `bandwidth: 0`, `cpu: 0` |
| `frameWidth` / `frameHeight`                             | whether full resolution survives to the wire                                             |
| `framesPerSecond`                                        | whether `contentHint='detail'` traded frame rate for sharpness                           |
| codec `mimeType`                                         | that VP9 is still winning the negotiation                                                |

## What each result would mean

- **Bitrate well above the old ~525 kbps and `limitation: none`** — row 2 did its job; the encoder
  is spending the headroom it always had. Rows 6 and 8 stay closed, because nothing is constrained.
- **`qualityLimitationReason: bandwidth`** — the encoder now wants more than the link gives. Row 8's
  `maxBitrate` becomes a real conversation, and row 6 becomes actively harmful.
- **`framesPerSecond` noticeably down** — `contentHint='detail'` is trading smoothness for
  sharpness, which is exactly the caveat recorded when it shipped. That is the point at which it
  should be reconsidered rather than defended.
- **Resolution below 1920×1080 on the wire** — something downscales before the encoder, and row 6
  (the Retina cap) moves from speculative to evidenced.

Drop the JSON anywhere in the repo and it can be read from there.
