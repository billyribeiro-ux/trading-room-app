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

What it returns instead, on six attempts, is **`NotReadableError: Could not start video source`** —
the container's Xvfb display has no surface Chromium's X11 capturer can open. Tried and still
failing: `preferCurrentTab` with `--auto-accept-this-tab-capture`, `--enable-usermedia-screen-capturing`,
`--use-gl=swiftshader`, and `+extension COMPOSITE +extension DAMAGE +extension RANDR` on the Xvfb
server.

**The distinction is the point, because it changes what unblocks this.** A picker needing a human is
a permanent, per-run cost that no CI can pay. A display with no capturable surface is an environment
to fix once — a real X server, or a runner with a display, or a capture backend that works headless.
Row 6 and row 8 of `streaming-choices.md` are therefore blocked on **a capturable display**, not on
**a person**, and the two have very different prices.

**One more correction in the same pass.** The claim elsewhere that headless "returns Chrome's
synthetic gradient, which compresses too easily to show any difference" is about
`--use-fake-device-for-media-stream` — a DIFFERENT flag, and one that applies to `getUserMedia`
cameras rather than to desktop capture. It was not used in any of the six attempts above, so it is
not what produced the failure and it is not evidence that automation cannot work.

**What is still true:** the measurement needs a real viewer attached, because an encoder with nobody
receiving has no reason to spend bits. That half of the argument below is unaffected and is why this
is a two-session procedure rather than a one-tab one.

**The human procedure below remains correct and remains the fastest way to get the number today.**
It is not deleted, because until a capturable display exists it is the only way this gets measured.

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
