import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MANY_OPCODES, USER_OPCODES } from './server/rooms';

/**
 * Our two opcode maps against every `updateUser(n, …)` and `updateManyUsers(n)` call in the
 * reference's own template.
 *
 * ## What this settles — T5-5
 *
 * The register carried an open question: "`updateUser` code **12** is unused in the template. Does
 * the server accept it? Dead code or an unreachable branch?" It was opened from a DOM capture, where
 * a gap in a numeric sequence is suggestive and nothing more.
 *
 * The template answers the first half exhaustively. Code 12 appears **nowhere** — not in the live
 * markup and not in the commented-out markup either, which matters because eight settings keys and
 * two user fields in this same file DO live only in comments. There is no switched-off row that once
 * used it. It is simply not a code this UI ever sends.
 *
 * The second half — whether the reference's SERVER accepts a 12 — is not answerable from any artifact
 * in this repository, and it is not our server. What is answerable, and is asserted here, is that
 * OURS does not: `USER_OPCODES` is the allow-list, and a code absent from it is refused.
 *
 * ## Why both maps, and why against the template rather than a capture
 *
 * `updateUser` and `updateManyUsers` are DIFFERENT enums that share small integers — 10 is
 * "Hide Pers User Data" in one and "Remove All" in the other. A test that checked only one, or that
 * checked a capture where most menu items were hidden, would not catch a code migrating between them.
 */

const TEMPLATE = readFileSync(`${process.cwd()}/evidence-dumps/TIER1-fetched/views/page.manageSession.html`, 'utf8');
/** Comments stripped: a row the reference has switched off is not a code this UI sends. */
const LIVE = TEMPLATE.replace(/<!--[\s\S]*?-->/g, '');

const codes = (source: string, re: RegExp) =>
  [...new Set([...source.matchAll(re)].map((m) => Number(m[1])))].sort((a, b) => a - b);

const liveUser = codes(LIVE, /updateUser\((\d+),/g);
const liveMany = codes(LIVE, /updateManyUsers\((\d+)\)/g);
const ours = (o: object) =>
  Object.keys(o)
    .map(Number)
    .sort((a, b) => a - b);

describe('the opcode maps match the reference template exactly', () => {
  it('reads a real set, so the comparison cannot be vacuous', () => {
    expect(liveUser.length).toBe(13);
    expect(liveMany.length).toBe(7);
  });

  it('USER_OPCODES is exactly the set the template calls', () => {
    expect(ours(USER_OPCODES)).toEqual(liveUser);
    expect(ours(USER_OPCODES)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14]);
  });

  it('MANY_OPCODES is exactly the set the template calls', () => {
    expect(ours(MANY_OPCODES)).toEqual(liveMany);
    expect(ours(MANY_OPCODES)).toEqual([1, 2, 3, 4, 5, 6, 10]);
  });

  it('code 12 is absent from the template ENTIRELY — live and commented alike', () => {
    /*
      The whole of T5-5's answerable half. Checked against the RAW template, not the live one:
      eight settings keys in this same file exist only inside comments, so "absent from live markup"
      would have left open the possibility of a switched-off row that once sent a 12. There is none.
    */
    expect(codes(TEMPLATE, /updateUser\((\d+),/g)).not.toContain(12);
    expect(codes(TEMPLATE, /updateUser\((\d+),/g)).toEqual(liveUser);
  });

  it('our server refuses 12, because the map IS the allow-list', () => {
    expect(Object.hasOwn(USER_OPCODES, 12)).toBe(false);
    expect((USER_OPCODES as Record<number, string>)[12]).toBeUndefined();
  });

  it('the two enums are NOT interchangeable, and 10 proves it', () => {
    /*
      10 means "Hide Pers User Data" to `updateUser` and "Remove All" to `updateManyUsers`. Routing a
      bulk code through the per-user handler would delete nobody and hide everybody's data, or the
      reverse. They must never share a code path.
    */
    expect((USER_OPCODES as Record<number, string>)[10]).toBe('hide-personal-data');
    expect((MANY_OPCODES as Record<number, string>)[10]).toBe('remove-all');
  });
});
