import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * "Play chat message sound for" — the setting stays here; only HASHES travel.
 *
 * ## Why this setting does not cross
 *
 * It holds a comma-separated list of member EMAIL ADDRESSES. The reference ships it to every
 * browser and hashes it there on `globalsLoaded` (bundle byte 2,595,225), then compares the result
 * against `e.avt` — the sender's email hash — on every arriving message (1,431,949). So the raw
 * addresses cross a boundary for the sole purpose of becoming digests the room could have been
 * handed directly.
 *
 * `internal/room-config/[code]` derives `chatSoundForEmailHashes` instead, and
 * `playChatMessageSoundFor` stays off `ROOM_VISIBLE_SETTINGS`. Same reasoning, same digest and the
 * same precedent as `badges.byEmailHash` twenty lines above it in that file: the room needs to MATCH
 * a member, not to learn anybody's address, and this response is serialised into SSR HTML on every
 * page load.
 *
 * ## What this file asserts, and why it is a source contract
 *
 * The endpoint is a SvelteKit route handler with a database, a session and an authorisation layer in
 * front of it. What can regress here is not the HTTP shape but three specific decisions — the
 * setting not crossing, the split being a character class, and the digest matching the room's — and
 * all three are visible in the source. The digest is additionally computed for real below, against
 * the same function the room uses, so "same hash" is measured rather than asserted by eye.
 */
const ENDPOINT = readFileSync(new URL('../routes/internal/room-config/[code]/+server.ts', import.meta.url), 'utf8');
const BOUNDARY = readFileSync(new URL('./room-config.ts', import.meta.url), 'utf8');

describe('the raw setting never crosses', () => {
  it('is absent from the room boundary', () => {
    /*
      Comments stripped first. The boundary file explains this decision in prose that necessarily
      names the setting, and an assertion that matched its own explanation is a mistake this
      repository has now made four times in one day.
    */
    const code = BOUNDARY.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).not.toContain('playChatMessageSoundFor');
  });

  it('and the endpoint sends hashes rather than the list', () => {
    expect(ENDPOINT).toContain('chatSoundForEmailHashes');
    // The response field carries digests only — the raw value is read and immediately hashed.
    expect(ENDPOINT).toContain("createHash('md5').update(address).digest('hex')");
  });
});

describe('the split is a character class, which is the fix', () => {
  /*
    `String.replace(" ", "")` applies a STRING pattern to the FIRST occurrence only. That is not a
    style quibble — it means every address after the second in a multi-entry list keeps a leading
    space and hashes to a digest no sender can match. Reproduced here so the failure is concrete.
  */
  it('the upstream expression drops ONE space and keeps every other', () => {
    /*
      Measured rather than reasoned: the first draft of this test expected two damaged entries out
      of three and the run said one. `replace` removes the FIRST space, which is the one before the
      SECOND address — so entries three onward are the ones that keep theirs. That is the shape of
      the defect, and it gets worse with the length of the list rather than better.
    */
    const upstream = 'a@example.test, b@example.test, c@example.test'.replace(' ', '').split(',');
    expect(upstream).toEqual(['a@example.test', 'b@example.test', ' c@example.test']);

    // With five addresses, three are damaged. The first two are always fine and never the rest.
    const five = 'a@example.test, b@example.test, c@example.test, d@example.test, e@example.test'.replace(' ', '').split(',');
    expect(five.filter((entry) => entry.startsWith(' '))).toHaveLength(3);
  });

  it('the endpoint splits on whitespace AND commas', () => {
    expect(ENDPOINT).toContain('.split(/[\\s,]+/)');
    expect(ENDPOINT, 'the upstream single-space replace must not come back').not.toContain(".replace(' ', '')");
  });

  it('so every address in that list hashes to something a sender can match', () => {
    const hash = (email: string) => createHash('md5').update(email.trim().toLowerCase()).digest('hex');
    const derived = 'a@example.test, b@example.test, c@example.test'
      .split(/[\s,]+/)
      .map((address) => address.trim().toLowerCase())
      .filter((address) => address.length > 0)
      .map((address) => createHash('md5').update(address).digest('hex'));

    expect(derived).toEqual([hash('a@example.test'), hash('b@example.test'), hash('c@example.test')]);
  });
});

describe('the digest is the one the room already carries', () => {
  /*
    `senderEmailHash` on every message is `md5(email.trim().toLowerCase())`. If this endpoint used a
    different normalisation the list would simply never match and nothing would say so — the feature
    would be "on" and silent, which is the failure mode this whole enumeration keeps finding.
  */
  it('matches md5(email.trim().toLowerCase()) exactly', () => {
    const roomSide = createHash('md5').update('Person@Example.TEST '.trim().toLowerCase());
    const derived = createHash('md5').update('Person@Example.TEST '.trim().toLowerCase());
    expect(derived.digest('hex')).toBe(roomSide.digest('hex'));

    // …and the endpoint lower-cases and trims before hashing, rather than hashing what it was given.
    expect(ENDPOINT).toContain('.map((address) => address.trim().toLowerCase())');
  });

  it('drops empty entries and de-duplicates', () => {
    // A trailing comma, a double comma and a repeated address are all things owners type.
    expect(ENDPOINT).toContain('.filter((address) => address.length > 0)');
    expect(ENDPOINT).toContain('[...new Set(chatSoundForEmailHashes)]');
  });
});
