import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The one assertion about the reference's own ingest URLs, split out on 2026-09-03.
 *
 * ## Why this half exists at all
 *
 * `stream-ingest.test.ts` reproduces the reference's OBS / XSplit URL builders exactly **except for
 * the scheme**: ours are `https://` and `rtmps://` where the original is `http://` and `rtmp://`. A
 * declared divergence needs both halves or it is just an assertion about us — so this file pins that
 * the reference really does use cleartext, which is what makes ours a DECISION rather than a
 * misreading of the capture.
 *
 * ## What it was costing
 *
 * That read was at MODULE SCOPE in a gitignored path, and `gate/evidence-bound-tests.mjs` excludes
 * by FILE, so it took all eight of that file's cases out of every checkout without the dumps — this
 * container, and CI. Seven of them build the URLs and assert what this application emits, among them
 * `a publish token never appears beside a cleartext scheme`: the property that wherever the publish
 * token goes, the transport carrying it is encrypted.
 */

const BUNDLE = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);

describe('the reference own ingest URLs', () => {
  it('really does use cleartext, so ours is a decision and not a misreading', () => {
    expect(BUNDLE).toContain('streamingLinkRTMP=`rtmp://');
    expect(BUNDLE).toContain(':8889/');
    // And it carries no TLS scheme anywhere near those builders.
    expect(BUNDLE).not.toContain('streamingLinkRTMP=`rtmps://');
  });
});
