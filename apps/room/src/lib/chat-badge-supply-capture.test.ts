import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The two assertions about the REFERENCE's badge supply, split out on 2026-09-03.
 *
 * ## What one module-scope read was costing
 *
 * `chat-badge-supply-contract.test.ts` walks the badge chain level by level — the controller
 * endpoint that sends the definitions and the hash-keyed assignment map, the room load that carries
 * it, the feeds module that resolves a sender, and `RoomMessage.svelte` that draws the chip. Eleven
 * of its thirteen cases read those four files, all committed. Two read
 * `docs/source/main.d6d3c112b59b7d0d.js` at MODULE SCOPE, and `docs/source` is gitignored, so
 * `gate/evidence-bound-tests.mjs` excluded all thirteen from every checkout without the dumps —
 * this container, and CI.
 *
 * Among the eleven is *"keys members by md5(email), never by address"*, which is the assertion that
 * member email addresses do not cross into the room. **A privacy-boundary case, excluded from CI by
 * a read no privacy assertion used.**
 *
 * ## What is here
 *
 * The whole `the reference` block, moved intact: that badges live in a hash keyed by id with the ids
 * on the message, and that the dark variant replaces the WHOLE definition rather than setting a
 * flag. The eleven that stayed are what this application does with that shape.
 */

const BUNDLE = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);

describe('the reference', () => {
  it('keeps definitions in a hash and ids on the message', () => {
    expect(BUNDLE).toContain('badgesH');
    expect(BUNDLE.replace(/\s+/g, '')).toContain('sessData.badgesH[this.msg.b[o]]');
  });

  it('swaps the whole definition for the dark variant — a LOOKUP, not a flag', () => {
    expect(BUNDLE.replace(/\s+/g, '')).toContain('badgesH[r.darkTheme]');
  });
});
