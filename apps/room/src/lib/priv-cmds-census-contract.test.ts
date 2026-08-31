import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * ── THE `privCmdsIn` CASE LIST, RE-RUN INSTEAD OF QUOTED ──────────────────────────────────────
 *
 * `room/private-commands.ts` carried this table in a comment, under an instruction to itself:
 *
 * > **re-run the count rather than trust the sentence.**
 *
 * Nothing re-ran it. The docblock said FIVE-built-and-THREE-left for the whole of the time three of
 * the five had already shipped, and the paragraph recording that staleness sat one line above the
 * instruction. A count in prose is a count nobody checks; this file is the re-run, so the module can
 * point here and stop holding an inventory it cannot verify.
 *
 * The offsets are the reference's own, read whole from bytes 995,800–997,400 rather than searched,
 * and re-enumerated on 2026-08-29. Each is asserted against the pinned bundle by VALUE — the case
 * label has to be exactly there — so a bundle change moves this file rather than silently making a
 * quoted number wrong.
 *
 * ## Why the count of branches here is asserted from source rather than stated
 *
 * The same reason. `private-commands.ts` says how many of the eleven it handles; that sentence is
 * true today and was false for eleven days once. Counting the `command.cmd === '…'` guards in the
 * module itself is the measurement, and the disposition of every case the module does NOT handle is
 * spelled out below so a gap cannot hide inside a matching total.
 */

const BUNDLE = readFileSync(
  fileURLToPath(
    new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url)
  ),
  'utf8'
);

const MODULE = readFileSync(
  fileURLToPath(new URL('./room/private-commands.ts', import.meta.url)),
  'utf8'
);

/**
 * The eleven upstream cases, each at the byte its label starts on.
 *
 * `handled` is what this room does with it, and every value that is not `'here'` names where the
 * behaviour lives instead — because "we do not have a branch for it" and "we do not have it" are
 * different statements and the module used to blur them.
 */
const CASES = [
  { at: 995_896, cmd: 'forceReload', handled: 'here' },
  { at: 995_969, cmd: 'remoteRestartAudio', handled: 'here' },
  { at: 996_041, cmd: 'getDebugLog', handled: 'here' },
  { at: 996_120, cmd: 'debugLogResp', handled: 'here' },
  { at: 996_187, cmd: 'kickUser', handled: 'here' },
  { at: 996_261, cmd: 'muteChat', handled: 'here' },
  { at: 996_320, cmd: 'unmuteChat', handled: 'here' },
  { at: 996_376, cmd: 'remotePresCommand', handled: 'the cmds channel — not an addressed frame' },
  {
    at: 996_456,
    cmd: 'userInfo',
    handled: 'routes/user-detail.remote.ts — this channel’s one reply'
  },
  { at: 996_699, cmd: 'updateProfilePic', handled: 'here' },
  { at: 996_894, cmd: 'getRoster', handled: 'RoomRoster — not an addressed frame' }
] as const;

describe('the eleven upstream cases are where this repository says they are', () => {
  it('finds every case label at its recorded byte', () => {
    for (const { at, cmd } of CASES) {
      const label = `case"${cmd}"`;
      expect(
        BUNDLE.slice(at, at + label.length),
        `${cmd} is not at byte ${at.toLocaleString()}; re-read 995,800-997,400 and move the offset`
      ).toBe(label);
    }
  });

  it('finds them in ONE switch, in the recorded order', () => {
    /*
      Byte order is the switch's order, and asserting it stops a future edit from "correcting" an
      offset to some other occurrence of the same label elsewhere in 2.8 MB — which is exactly how a
      cited offset goes wrong while still matching.
    */
    const offsets = CASES.map((entry) => entry.at);
    expect([...offsets].sort((a, b) => a - b)).toEqual([...offsets]);
    expect(offsets.at(-1)! - offsets[0]!).toBeLessThan(1_200);
  });
});

describe('what this room does with each of them', () => {
  it('has a branch for exactly the eight that are addressed commands', () => {
    const here = CASES.filter((entry) => entry.handled === 'here');
    expect(here).toHaveLength(8);

    for (const { cmd } of here) {
      expect(MODULE, `${cmd} lost its branch in private-commands.ts`).toContain(
        `command.cmd === '${cmd}'`
      );
    }
  });

  it('has NO branch for the three that are not addressed commands', () => {
    /*
      Deny-by-default cuts both ways: a branch appearing here for `getRoster` or `remotePresCommand`
      would mean the same behaviour arriving down two paths, and for `userInfo` it would mean a reply
      travelling on a per-room transport instead of returning to its caller.
    */
    for (const { cmd, handled } of CASES.filter((entry) => entry.handled !== 'here')) {
      expect(MODULE, `${cmd} grew a branch here; it belongs to ${handled}`).not.toContain(
        `command.cmd === '${cmd}'`
      );
    }
  });

  it('handles one command upstream has no case for at all', () => {
    /*
      `forceStopScreen`, 2026-08-29. Zero occurrences of `case"forceStopScreen"` in the bundle,
      because upstream's SERVER closes the producer; this room's SFU refuses `closeProducer` from any
      session but the owner's, so the ask is delivered and the owner closes their own.

      Asserted with its own count so the claim "upstream has no case for it" is measured here rather
      than remembered — it is the one branch a reader would otherwise assume was transcribed.
    */
    expect(BUNDLE).not.toContain('case"forceStopScreen"');
    expect(MODULE).toContain("command.cmd === 'forceStopScreen'");
  });

  it('leaves no fourth disposition, so a new case cannot arrive uncounted', () => {
    /*
      The vacuity floor for the two counts above: every entry is either handled here or names where
      it lives, and the totals are stated as the partition rather than as two independent numbers
      that could both be wrong in the same direction.
    */
    expect(CASES).toHaveLength(11);
    expect(CASES.filter((entry) => entry.handled === 'here')).toHaveLength(8);
    expect(CASES.filter((entry) => entry.handled !== 'here')).toHaveLength(3);
  });
});
