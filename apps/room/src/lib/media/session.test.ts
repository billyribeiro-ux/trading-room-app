/**
 * Pins the encoding selection against the captured client.
 *
 * This is the one behaviour in the media client that has to match a reference rather than merely
 * work, so every constant asserted here is quoted from `docs/source/main.d6d3c112b59b7d0d.js` at a
 * byte offset, and the offsets were checked with `grep -abo` against the file rather than copied
 * from a summary:
 *
 * ```
 * $ grep -abo 'QS=\[{dtx' docs/source/main.d6d3c112b59b7d0d.js   -> 1071656
 * $ grep -abo 'XS=\[{scalabilityMode' docs/source/main.d6d3c112b59b7d0d.js -> 1071710
 * ```
 *
 * The router's side of the same contract is asserted in Rust: `codecs.rs`'s
 * `video_mime_types().first() == Some(Vp9)` (`services/media/src/codecs.rs:119-126`). Together they
 * are the whole claim - the server leads with VP9, and the client reads the leader.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { RtpCapabilities } from 'mediasoup-client/types';
import {
  H264_NOT_SUPPORTED,
  MICROPHONE_CODEC_OPTIONS,
  SCREEN_START_BITRATE,
  SIMULCAST_ENCODINGS,
  VP9_NOT_SUPPORTED,
  VP9_SVC_ENCODINGS,
  WEBCAM_START_BITRATE,
  findCodec,
  selectScreenShareEncodings,
  selectVideoEncodings
} from './session';

function codec(kind: 'audio' | 'video', mimeType: string, preferredPayloadType = 100) {
  return { kind, mimeType, preferredPayloadType, clockRate: kind === 'audio' ? 48000 : 90000 };
}

/**
 * What our router actually advertises, in order: Opus, then VP9, H264, VP8.
 * (`services/media/src/codecs.rs:64, 74, 84, 95`.)
 */
const OUR_ROUTER: RtpCapabilities = {
  codecs: [
    codec('audio', 'audio/opus'),
    codec('video', 'video/VP9', 101),
    codec('video', 'video/H264', 102),
    codec('video', 'video/VP8', 103)
  ]
};

describe('the captured encoding constants', () => {
  it('is XS: one encoding, S3T3, dtx', () => {
    // `XS=[{scalabilityMode:"S3T3",dtx:!0}]` - byte 1071710.
    expect(VP9_SVC_ENCODINGS).toEqual([{ scalabilityMode: 'S3T3', dtx: true }]);
  });

  it('is QS: two layers at 1.5 Mbps and 6 Mbps, both dtx', () => {
    // `QS=[{dtx:!0,maxBitrate:15e5},{dtx:!0,maxBitrate:6e6}]` - byte 1071656.
    expect(SIMULCAST_ENCODINGS).toEqual([
      { dtx: true, maxBitrate: 1_500_000 },
      { dtx: true, maxBitrate: 6_000_000 }
    ]);
    // 15e5 and 6e6 spelled out, so a typo in the literals cannot pass.
    expect(SIMULCAST_ENCODINGS[0].maxBitrate).toBe(15e5);
    expect(SIMULCAST_ENCODINGS[1].maxBitrate).toBe(6e6);
  });

  it('carries the two start bitrates, a hundredfold apart', () => {
    // `videoGoogleStartBitrate:1e3` (byte 1088120, the single webcam site) and `:1e5`
    // (bytes 1077889, 1103756, 1106783 - the three screen sites).
    expect(WEBCAM_START_BITRATE).toBe(1e3);
    expect(SCREEN_START_BITRATE).toBe(1e5);
  });

  it('turns every Opus feature off on the microphone', () => {
    // `codecOptions:{opusStereo:!1,opusDtx:!1,opusFec:!1}` - byte 1083675.
    expect(MICROPHONE_CODEC_OPTIONS).toEqual({
      opusStereo: false,
      opusDtx: false,
      opusFec: false
    });
    // The asymmetry worth not tidying away: audio dtx off, video dtx on.
    expect(MICROPHONE_CODEC_OPTIONS.opusDtx).toBe(false);
    expect(VP9_SVC_ENCODINGS[0].dtx).toBe(true);
  });
});

describe('selecting encodings from the first video codec', () => {
  it('chooses VP9 SVC when the router leads with VP9, which ours does', () => {
    expect(selectVideoEncodings(OUR_ROUTER)).toEqual([{ scalabilityMode: 'S3T3', dtx: true }]);
  });

  it('chooses two-layer simulcast when the first video codec is not VP9', () => {
    const h264First: RtpCapabilities = {
      codecs: [
        codec('audio', 'audio/opus'),
        codec('video', 'video/H264', 102),
        codec('video', 'video/VP9', 101)
      ]
    };
    expect(selectVideoEncodings(h264First)).toEqual([
      { dtx: true, maxBitrate: 1_500_000 },
      { dtx: true, maxBitrate: 6_000_000 }
    ]);
  });

  it('reads the FIRST video codec, not merely whether VP9 is present anywhere', () => {
    // This is the assertion that makes the router's codec ORDER load-bearing. A router that
    // merely offers VP9 somewhere in the list must not get SVC.
    const vp9Last: RtpCapabilities = {
      codecs: [codec('video', 'video/VP8', 103), codec('video', 'video/VP9', 101)]
    };
    expect(selectVideoEncodings(vp9Last)).toHaveLength(2);
    expect(selectVideoEncodings(vp9Last)[0].maxBitrate).toBe(1_500_000);
  });

  it('skips audio codecs when looking for the first video one', () => {
    // Our router's codecs[0] is Opus (`codecs.rs:64`), so a naive `codecs[0]` would never see VP9.
    expect(OUR_ROUTER.codecs?.[0].kind).toBe('audio');
    expect(selectVideoEncodings(OUR_ROUTER)[0].scalabilityMode).toBe('S3T3');
  });

  it('compares the mime type case-insensitively', () => {
    // The capture lowercases before comparing (`"video/vp9" === S.mimeType.toLowerCase()`), and
    // mediasoup serialises the mime type as `video/VP9` - so a case-sensitive compare would pick
    // simulcast for a VP9-first router, silently.
    expect(OUR_ROUTER.codecs?.[1].mimeType).toBe('video/VP9');
    for (const spelling of ['video/VP9', 'video/vp9', 'Video/Vp9']) {
      const caps: RtpCapabilities = { codecs: [codec('video', spelling, 101)] };
      expect(selectVideoEncodings(caps)[0].scalabilityMode).toBe('S3T3');
    }
  });

  it('falls back to simulcast when the router advertises no video at all', () => {
    expect(selectVideoEncodings({ codecs: [codec('audio', 'audio/opus')] })).toHaveLength(2);
    expect(selectVideoEncodings({})).toHaveLength(2);
    expect(selectVideoEncodings({ codecs: [] })).toHaveLength(2);
  });

  it('returns copies, so a caller cannot rewrite the constants for every later producer', () => {
    const first = selectVideoEncodings(OUR_ROUTER);
    first[0].scalabilityMode = 'L1T1';
    expect(selectVideoEncodings(OUR_ROUTER)[0].scalabilityMode).toBe('S3T3');
    expect(VP9_SVC_ENCODINGS[0].scalabilityMode).toBe('S3T3');
  });
});

describe('the useSharingSimulcast guard, reproduced', () => {
  it('yields NO encodings key at all when the flag is false, which is the captured default', () => {
    // `this.useSharingSimulcast=!1` is the only assignment in the bundle (byte 1072430), and the
    // encodings variable is assigned only inside `if (useSharingSimulcast)`. So the deployed build
    // called produce() with `encodings: undefined` every time. `undefined` is not `[]`: an empty
    // array is normalised away by the library (`lib/Transport.js:328-330`), but only `undefined`
    // means "let the browser pick its own single encoding".
    expect(
      selectScreenShareEncodings({ recvRtpCapabilities: OUR_ROUTER, useSharingSimulcast: false })
    ).toBeUndefined();
  });

  it('selects on the codec once the flag is on', () => {
    expect(
      selectScreenShareEncodings({ recvRtpCapabilities: OUR_ROUTER, useSharingSimulcast: true })
    ).toEqual([{ scalabilityMode: 'S3T3', dtx: true }]);
  });

  it('names no bitrate anywhere, which is streaming-choices row 8 DECIDED rather than deferred', () => {
    /*
      ROW 8 WAS OPEN UNTIL 2026-09-02 and is now answered by a number rather than by taste.
      Its `Pro` read *"removes reliance on libvpx's own heuristic, which is the thing currently
      deciding 525 kbps was enough"*. **525 kbps was never a ceiling** — it was the heuristic
      spending what nearly-static content needed.

      Measured: a loopback `RTCPeerConnection` in one page (so the number is the ENCODER's, not an
      SFU's), capturing a deliberately busy 1920×1080 surface, `contentHint = 'detail'` set, codec
      preferences applied BEFORE `createOffer` — applying them after is silently ignored, which is
      how the first run measured VP8 while believing it had asked for VP9. Over twelve two-second
      samples: `targetBitrate` 2,500,000, send 2,476–2,613 kbps, `qualityLimitationReason: none`,
      `encoderImplementation: libvpx`, `video/VP9`, 1920×1080.

      So libvpx already has 2.5 Mbps of headroom and spends it when the content asks. A `maxBitrate`
      at or below that only takes headroom away; above it, it does nothing. A `minBitrate` would
      force spending on frames that do not need it — bandwidth billed to every member so a static
      slide can be sent expensively, which is this row's own `Con` and the thing that hurts the
      member on the worst connection.

      **And doing nothing is also the match**: the capture passes `encodings: undefined`.

      Asserted over the whole module rather than one return value, because the way this decision
      would be undone is somebody adding a constant next to the ones above.
    */
    const source = readFileSync(new URL('./session.ts', import.meta.url), 'utf8');
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code, 'the module was not read').toContain('selectScreenShareEncodings');

    /*
      `maxBitrate` DOES appear twice, and both are transcribed rather than chosen: `QS` at bundle
      byte 1,071,656 is `[{dtx:!0,maxBitrate:15e5},{dtx:!0,maxBitrate:6e6}]`. The assertion is
      therefore about INVENTION, not absence — exactly two occurrences, exactly those two numbers,
      and no `minBitrate` at all, which the capture has nowhere.
    */
    expect(code.match(/maxBitrate/g) ?? []).toHaveLength(2);
    expect(code).toContain('maxBitrate: 1_500_000');
    expect(code).toContain('maxBitrate: 6_000_000');
    expect(code).not.toContain('minBitrate');

    /*
      And the path the capture actually takes returns NO encodings key at all, so nothing is spent
      or floored by default. `useSharingSimulcast` is `!1` in the bundle's only assignment.
    */
    expect(
      selectScreenShareEncodings({ recvRtpCapabilities: OUR_ROUTER, useSharingSimulcast: false })
    ).toBeUndefined();
  });

  it('honours forceVP9 only when a codec was actually resolved', () => {
    // `forceVP9 && f || mimeType === "video/vp9"` short-circuits: the conjunct needs BOTH.
    const vp8Only: RtpCapabilities = { codecs: [codec('video', 'video/VP8', 103)] };

    // forceVP9 true but no resolved codec -> falls through to the mimeType test -> simulcast.
    expect(
      selectScreenShareEncodings({
        recvRtpCapabilities: vp8Only,
        useSharingSimulcast: true,
        forceVP9: true
      })
    ).toHaveLength(2);

    // forceVP9 true WITH a resolved codec -> SVC, regardless of the router's first codec.
    expect(
      selectScreenShareEncodings({
        recvRtpCapabilities: vp8Only,
        useSharingSimulcast: true,
        forceVP9: true,
        forcedCodec: codec('video', 'video/VP9', 101)
      })
    ).toEqual([{ scalabilityMode: 'S3T3', dtx: true }]);
  });
});

describe('findCodec', () => {
  it('finds a codec case-insensitively', () => {
    expect(findCodec(OUR_ROUTER, 'video/h264').mimeType).toBe('video/H264');
    expect(findCodec(OUR_ROUTER, 'VIDEO/VP9').mimeType).toBe('video/VP9');
  });

  it('throws the capture’s message, matched to the codec that was actually asked for', () => {
    const vp8Only: RtpCapabilities = { codecs: [codec('video', 'video/VP8', 103)] };
    // Reporting the H264 message for a failed VP9 lookup would name a codec the caller never
    // asked for - a fabricated diagnostic.
    expect(() => findCodec(vp8Only, 'video/h264')).toThrow(H264_NOT_SUPPORTED);
    expect(() => findCodec(vp8Only, 'video/vp9')).toThrow(VP9_NOT_SUPPORTED);
    expect(H264_NOT_SUPPORTED).not.toBe(VP9_NOT_SUPPORTED);
  });

  it('does not pin a codec by default, so the router’s first video codec wins', () => {
    // The deliberate divergence from the capture's `forceH264 = ... || !0` bug (byte 1073216).
    // Nothing in MediaSession calls findCodec, so `produce()` receives `codec: undefined` and
    // mediasoup-client takes codecs[0] (`lib/ortc.js:449-455`).
    expect(selectVideoEncodings(OUR_ROUTER)).toBeDefined();
  });
});
