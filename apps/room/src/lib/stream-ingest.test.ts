import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  MEDIAMTX_RTMPS_PORT,
  MEDIAMTX_WHIP_PORT,
  rtmpIngestUrl,
  whipIngestUrl
} from './stream-ingest';

/**
 * These are the exact strings a presenter pastes into OBS or XSplit. One wrong character produces
 * a link that looks correct and silently fails to connect, with no error anywhere the presenter can
 * see.
 *
 * `docs/source/main.d6d3c112b59b7d0d.js` byte 2157950, `handleStreaming()`:
 *
 * ```js
 * e.streamingLinkRTMP = `rtmp://${streamServerMTX}/room__${sessionID}__${yourName}?jwt=${mtxToken}`;
 * e.streamingLink     = `http://${streamServerMTX}:8889/room__${sessionID}__${yourName}/whip`;
 * ```
 *
 * **Everything about those two is reproduced except the SCHEME**, and this file asserts both halves:
 * that the reference really does use cleartext (so the divergence is a decision and not a
 * misreading), and that we really do not.
 */
const BUNDLE = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);

describe('the OBS / XSplit ingest URLs', () => {
  const HOST = 'media.example.com';
  const PATH = 'room__7f3a__Dana_Vero';
  const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ4In0.sig';

  it('builds the WHIP publish URL', () => {
    expect(whipIngestUrl(HOST, PATH)).toBe(
      'https://media.example.com:8889/room__7f3a__Dana_Vero/whip'
    );
  });

  it('builds the RTMPS publish URL', () => {
    expect(rtmpIngestUrl(HOST, PATH, TOKEN)).toBe(
      `rtmps://media.example.com:1936/room__7f3a__Dana_Vero?jwt=${TOKEN}`
    );
  });

  it('carries the right port on each', () => {
    /*
      8889 is MediaMTX's WebRTC port and is in the reference's URL literally. 1936 is its RTMPS
      listener (`rtmpsAddress: :1936`) and MUST be explicit: plain RTMP could omit 1935 because
      every encoder assumes it, and nothing assumes 1936.
    */
    expect(MEDIAMTX_WHIP_PORT).toBe(8889);
    expect(MEDIAMTX_RTMPS_PORT).toBe(1936);
    expect(whipIngestUrl(HOST, PATH)).toContain(':8889/');
    expect(rtmpIngestUrl(HOST, PATH, TOKEN)).toContain(':1936/');
    expect(rtmpIngestUrl(HOST, PATH, TOKEN)).not.toContain(':8889');
  });

  /*
    The token travels in ONE of the two, not both.

    WHIP presents it as an HTTP Bearer — the panel's field is labelled `Bearer` (consts index 116)
    and the URL carries nothing secret. RTMP has no header to put it in, so it goes in the query
    string under the name `jwt`, which is the name the controller's media-auth check reads.
  */
  it('keeps the credential out of the WHIP URL and inside the RTMPS one', () => {
    expect(whipIngestUrl(HOST, PATH)).not.toContain(TOKEN);
    expect(whipIngestUrl(HOST, PATH)).not.toContain('jwt');
    expect(rtmpIngestUrl(HOST, PATH, TOKEN)).toContain(`?jwt=${TOKEN}`);
  });

  /* The path is built by the controller and passed through verbatim — never re-derived here. */
  it('passes the ingest path through untouched', () => {
    expect(whipIngestUrl(HOST, 'room__ab__X-1_2')).toBe(
      'https://media.example.com:8889/room__ab__X-1_2/whip'
    );
    expect(rtmpIngestUrl(HOST, 'room__ab__X-1_2', 't')).toBe(
      'rtmps://media.example.com:1936/room__ab__X-1_2?jwt=t'
    );
  });
});

describe('the ONE deliberate divergence: transport encryption', () => {
  /*
    Both halves are asserted on purpose.

    Pinning only "ours is https" would let somebody conclude the reference was https too and that
    this is a transcription. Pinning only the reference would not stop the divergence being quietly
    reverted to match it. Together they say: we know exactly what upstream does, and we do not do it.

    WHY. The credential these URLs carry is a PUBLISH token — it authorises writing video into a
    named room path and it lives for thirty days. On plain RTMP it crosses the wire inside the
    connection handshake, where an observer needs to do nothing but watch; on plain HTTP the WHIP
    Bearer is a readable header. Presenters stream from hotel and conference networks as a matter of
    course, and this is a multi-tenant fintech application: the failure mode is one tenant
    publishing into another tenant's room.

    This is the same rule `ScreenTabs` already applies to `aria-selected` and `tabindex` — a capture
    is reproduced unless reproducing it locks a real person out — applied to the stronger case.
  */
  const HOST = 'media.example.com';
  const PATH = 'room__7f3a__Dana_Vero';
  const TOKEN = 'tok';

  it('the REFERENCE really does use cleartext, so this is a decision and not a misreading', () => {
    expect(BUNDLE).toContain('streamingLinkRTMP=`rtmp://');
    expect(BUNDLE).toContain(':8889/');
    // And it carries no TLS scheme anywhere near those builders.
    expect(BUNDLE).not.toContain('streamingLinkRTMP=`rtmps://');
  });

  it('ours never emits a cleartext scheme', () => {
    const whip = whipIngestUrl(HOST, PATH);
    const rtmp = rtmpIngestUrl(HOST, PATH, TOKEN);

    expect(whip.startsWith('https://')).toBe(true);
    expect(rtmp.startsWith('rtmps://')).toBe(true);

    // `startsWith` alone would pass for `https://` while a second `http://` hid in the path.
    expect(whip).not.toMatch(/(^|[^s])http:\/\//);
    expect(rtmp).not.toMatch(/(^|[^s])rtmp:\/\//);
  });

  it('a publish token never appears beside a cleartext scheme', () => {
    /*
      The assertion that would have caught the original defect stated as the property rather than
      the string: wherever the token goes, the transport carrying it is encrypted.
    */
    const rtmp = rtmpIngestUrl(HOST, PATH, TOKEN);
    expect(rtmp).toContain(TOKEN);
    expect(rtmp.slice(0, rtmp.indexOf(TOKEN))).not.toContain('rtmp://');
  });
});
