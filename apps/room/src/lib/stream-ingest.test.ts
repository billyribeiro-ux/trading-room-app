import { describe, expect, it } from 'vitest';
import { MEDIAMTX_WHIP_PORT, rtmpIngestUrl, whipIngestUrl } from './stream-ingest';

/**
 * These are the exact strings a presenter pastes into OBS or XSplit. One wrong character produces
 * a link that looks correct and silently fails to connect, with no error anywhere the presenter can
 * see — so each is pinned against the reference byte offset it was transcribed from.
 *
 * `docs/source/main.d6d3c112b59b7d0d.js` byte 2157950, `handleStreaming()`:
 *
 * ```js
 * e.streamingLinkRTMP = `rtmp://${streamServerMTX}/room__${sessionID}__${yourName}?jwt=${mtxToken}`;
 * e.streamingLink     = `http://${streamServerMTX}:8889/room__${sessionID}__${yourName}/whip`;
 * ```
 */
describe('the OBS / XSplit ingest URLs', () => {
  const HOST = 'media.example.com';
  const PATH = 'room__7f3a__Dana_Vero';
  const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ4In0.sig';

  it('builds the WHIP publish URL exactly as the reference does', () => {
    expect(whipIngestUrl(HOST, PATH)).toBe(
      'http://media.example.com:8889/room__7f3a__Dana_Vero/whip'
    );
  });

  it('builds the RTMP publish URL exactly as the reference does', () => {
    expect(rtmpIngestUrl(HOST, PATH, TOKEN)).toBe(
      `rtmp://media.example.com/room__7f3a__Dana_Vero?jwt=${TOKEN}`
    );
  });

  /*
    8889 is MediaMTX's WebRTC port and it is in the reference's URL literally. RTMP carries no port,
    so it resolves to RTMP's standard 1935 — which is why the RTMP URL must NOT gain one.
  */
  it('puts the port on WHIP only', () => {
    expect(MEDIAMTX_WHIP_PORT).toBe(8889);
    expect(whipIngestUrl(HOST, PATH)).toContain(':8889/');
    expect(rtmpIngestUrl(HOST, PATH, TOKEN)).not.toContain(':8889');
    expect(rtmpIngestUrl(HOST, PATH, TOKEN)).not.toContain(':1935');
  });

  /*
    The token travels in ONE of the two, not both.

    WHIP presents it as an HTTP Bearer — the panel's field is labelled `Bearer` (consts index 116)
    and the URL carries nothing secret. RTMP has no header to put it in, so it goes in the query
    string under the name `jwt`, which is the name the controller's media-auth check reads.

    A WHIP URL that leaked the token would put a live publish credential into MediaMTX's access
    log and into any screen recording of the panel.
  */
  it('keeps the credential out of the WHIP URL and inside the RTMP one', () => {
    expect(whipIngestUrl(HOST, PATH)).not.toContain(TOKEN);
    expect(whipIngestUrl(HOST, PATH)).not.toContain('jwt');
    expect(rtmpIngestUrl(HOST, PATH, TOKEN)).toContain(`?jwt=${TOKEN}`);
  });

  /* The path is built by the controller and passed through verbatim — never re-derived here. */
  it('passes the ingest path through untouched', () => {
    expect(whipIngestUrl(HOST, 'room__ab__X-1_2')).toBe(
      'http://media.example.com:8889/room__ab__X-1_2/whip'
    );
    expect(rtmpIngestUrl(HOST, 'room__ab__X-1_2', 't')).toBe(
      'rtmp://media.example.com/room__ab__X-1_2?jwt=t'
    );
  });
});
