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

## Why it cannot be automated

`getDisplayMedia` requires a real user gesture and an operating-system screen-picker dialog. Browser
automation can drive a page; it cannot click an OS dialog. So this needs a human for the thirty
seconds it takes, and no amount of tooling removes that.

---

## The procedure

Order matters: `chrome://webrtc-internals` logs from the moment it is opened, so opening it *before*
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
*before* starting the share. It samples for 30 seconds, prints kbps per second, and downloads its
own JSON. It must go in first — it hooks `RTCPeerConnection` at construction and cannot see a
connection that already exists.

---

## What to read out of it

From `outbound-rtp (video)` on the `room=1001` connection:

| stat | what it settles |
| --- | --- |
| `bytesSent` over time | the real bitrate on real content — the number the whole exercise is for |
| `qualityLimitationReason` + `qualityLimitationDurations` | whether anything is throttling. The 2026-08-05 read was `none`, `bandwidth: 0`, `cpu: 0` |
| `frameWidth` / `frameHeight` | whether full resolution survives to the wire |
| `framesPerSecond` | whether `contentHint='detail'` traded frame rate for sharpness |
| codec `mimeType` | that VP9 is still winning the negotiation |

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
