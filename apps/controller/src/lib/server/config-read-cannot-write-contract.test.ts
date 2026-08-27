import { describe, expect, it } from 'vitest';
import {
  CONFIG_READ_TTL_SECONDS,
  CONFIG_WRITE_TTL_SECONDS,
  configReadToken,
  configWriteToken,
  verifyConfigReadToken,
  verifyConfigWriteToken
} from './room-handoff.js';

/**
 * A capability to READ a room's configuration cannot CHANGE it, and the refusal is asserted here.
 *
 * ## The defect this closes
 *
 * Until 2026-08-27 there was one domain prefix. `internal/room-ban`, `internal/room-permissions`,
 * `internal/room-setting` and `internal/stream-ingest` all mutate controller state and all four
 * verified with `verifyConfigReadToken` — so the credential minted to read a room's settings also
 * authorised banning a member from that room, rewriting its permission set, overwriting a setting
 * and rotating its ingest key.
 *
 * Three of those four said so in their own docblocks, in almost the same words, each calling the
 * split "the one follow-up all of these endpoints share". **That is how an accepted caveat becomes a
 * permanent one:** the next door copies the paragraph along with the code, and TODO row 7 had
 * already noticed the pattern — *"a new door inherits that and must not fix it in isolation"*.
 *
 * ## What is and is not being claimed
 *
 * Both credentials are HMACs derived from the same `ROOM_JWT_SECRET`, and anything holding that
 * secret can mint either one. This does not put a wall between two parties — there is only one
 * party, the room application. What it fixes is that the credential now SAYS what it authorises, so
 * a read token presented at a write endpoint can be refused, and a future caller that only ever
 * needed to read cannot be handed something that also bans people.
 *
 * That distinction matters for how this is read later: the split is defence in depth and a
 * correctness property of the protocol, not a repair of a broken authentication.
 *
 * ## Why the test is here and not in the route files
 *
 * The routes each verify one credential; nothing in a route can observe that the OTHER one is
 * rejected. The property is about the pair, so it is asserted about the pair, and it stays true no
 * matter which route is added next.
 */

const SECRET = 'test-secret-for-domain-separation';
const ROOM = 'abc123';
const NOW = 1_700_000_000;

describe('config-read and config-write are separate capabilities', () => {
  it('a read token is REFUSED by the write verifier', () => {
    const read = configReadToken(SECRET, ROOM, NOW);
    expect(verifyConfigWriteToken(SECRET, ROOM, read, NOW)).toEqual({
      ok: false,
      reason: 'bad-signature'
    });
  });

  it('a write token is REFUSED by the read verifier', () => {
    const write = configWriteToken(SECRET, ROOM, NOW);
    expect(verifyConfigReadToken(SECRET, ROOM, write, NOW)).toEqual({
      ok: false,
      reason: 'bad-signature'
    });
  });

  /*
    The positive controls. Without them the two assertions above pass just as happily against a
    verifier that rejects everything, which is the vacuous shape this repository has met four times.
  */
  it('each token is accepted by its own verifier', () => {
    expect(verifyConfigReadToken(SECRET, ROOM, configReadToken(SECRET, ROOM, NOW), NOW)).toEqual({
      ok: true
    });
    expect(verifyConfigWriteToken(SECRET, ROOM, configWriteToken(SECRET, ROOM, NOW), NOW)).toEqual({
      ok: true
    });
  });

  it('the two tokens are different strings for the same room and instant', () => {
    /*
      Stated explicitly because it is the whole mechanism. If the domain were ever dropped from the
      signed material — a refactor that "simplified" the shared signer — both tokens would become
      identical and every assertion above would still pass except this one.
    */
    expect(configReadToken(SECRET, ROOM, NOW)).not.toBe(configWriteToken(SECRET, ROOM, NOW));
  });

  it('a write token for one room does not authorise a write to another', () => {
    const forOtherRoom = configWriteToken(SECRET, 'zzz999', NOW);
    expect(verifyConfigWriteToken(SECRET, ROOM, forOtherRoom, NOW)).toEqual({
      ok: false,
      reason: 'bad-signature'
    });
  });

  it('freshness is enforced on the write credential, not only on the read one', () => {
    const stale = configWriteToken(SECRET, ROOM, NOW);
    expect(verifyConfigWriteToken(SECRET, ROOM, stale, NOW + CONFIG_WRITE_TTL_SECONDS + 1)).toEqual({
      ok: false,
      reason: 'stale'
    });
    /* Symmetric window: a clock skewed backwards is a misconfiguration, not extra grace. */
    expect(verifyConfigWriteToken(SECRET, ROOM, stale, NOW - CONFIG_WRITE_TTL_SECONDS - 1)).toEqual({
      ok: false,
      reason: 'stale'
    });
  });

  it('both windows are the same length, so a write does not fail on skew a read survives', () => {
    expect(CONFIG_WRITE_TTL_SECONDS).toBe(CONFIG_READ_TTL_SECONDS);
  });
});

/**
 * The routes themselves, checked by reading them.
 *
 * A route that mutates and verifies with the READ credential is the exact defect above, and it can
 * come back one import at a time. This asserts the disposition of every `/internal/*` route by name,
 * so adding one means deciding — in this file, visibly — which capability it takes.
 */
describe('every internal route verifies the credential its job needs', () => {
  /*
    `room-mute` joined on 2026-08-27 — the indefinite chat mute, opcode 3. It was written AFTER the
    read/write split, so it is the first door that never inherited the caveat its three siblings
    carried; this list is where that was decided rather than copied.
  */
  const WRITES = ['room-ban', 'room-mute', 'room-permissions', 'room-setting', 'stream-ingest'];
  const READS = ['room-config', 'room-entry', 'mobile-pin', 'stream-read'];

  it.each(WRITES)('%s verifies a WRITE capability', async (route) => {
    const source = await sourceOf(route);
    expect(source).toContain('verifyConfigWriteToken');
    expect(source).not.toContain('verifyConfigReadToken(');
  });

  it.each(READS)('%s verifies a READ capability', async (route) => {
    const source = await sourceOf(route);
    expect(source).toContain('verifyConfigReadToken');
    expect(source).not.toContain('verifyConfigWriteToken(');
  });

  it('names every internal route that takes a credential', async () => {
    const { readdirSync } = await import('node:fs');
    const onDisk = readdirSync(`${process.cwd()}/src/routes/internal`, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    /*
      `media-auth` is the one route with no MAC at all, deliberately and by its own docblock, so it
      is named here rather than silently missing from both lists.
    */
    expect(onDisk).toEqual([...WRITES, ...READS, 'media-auth'].sort());
  });
});

async function sourceOf(route: string): Promise<string> {
  const { readFileSync } = await import('node:fs');
  return readFileSync(`${process.cwd()}/src/routes/internal/${route}/[code]/+server.ts`, 'utf8');
}
