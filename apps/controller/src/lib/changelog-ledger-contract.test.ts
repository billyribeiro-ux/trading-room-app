import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * THE CHANGELOG IS A LEDGER, AND A LEDGER'S TIMESTAMPS ARE READ, NEVER ESTIMATED.
 *
 * ## The failure this was written for
 *
 * `CHANGELOG.md`'s own first paragraph says every time is *"either a git commit timestamp or a
 * measurement taken at that moment — none is estimated."* On 2026-09-01 that was measured against
 * `git log` for the first time and **54 consecutive headings failed it**. Each had been written as
 * "a bit after the last one", and the error compounded: twelve minutes at `SHL-06`, an hour by the
 * middle of the block, and fifteen hours forty-four minutes at the top — far enough that **eleven
 * entries carried 2026-09-02, a day on which no commit in this repository was made**.
 *
 * Nothing noticed, because nothing was looking. A record that drifts is worse than no record: the
 * next person reading back through an incident correlates these headings against deploy logs, and a
 * heading fifteen hours out points at the wrong deploy with total confidence.
 *
 * ## The two rules, and why these two
 *
 * 1. **No heading may be dated in the future.** This is the cheap one and it is the one that would
 *    have caught the whole block on its FIRST estimate — the clock said 2026-09-01 every time an
 *    entry was written claiming 2026-09-02. It needs no mapping from entries to commits, which is
 *    what makes it enforceable: matching prose titles to commit subjects is a heuristic, and a gate
 *    built on a heuristic is a gate that gets disabled the first time it is wrong.
 *
 * 2. **Headings run newest-first, and the exceptions are named.** Thirty inversions survive from
 *    before this rule existed, every one of them from a merged branch: two agents wrote entries on
 *    two branches, both prepended, and the merge interleaved them. They are pinned BY TITLE rather
 *    than by count, so a new inversion fails naming itself and an old one can only be removed. Line
 *    numbers would have been the wrong key — every new entry prepended at the top moves all of them.
 *
 * ## What is deliberately NOT asserted
 *
 * That every entry names a commit. Not every piece of finished work is one commit, the file says so
 * (*"where a change landed in a commit whose message describes something else, the commit is named
 * anyway"*), and two entries legitimately share `579edfa`. An assertion that cannot be satisfied by
 * correct behaviour is an assertion that gets deleted.
 */
const ROOT = `${process.cwd()}/../..`;
const CHANGELOG = readFileSync(`${ROOT}/CHANGELOG.md`, 'utf8');

/**
 * `### 2026-09-01 15:21 UTC — …`, `### 2026-08-20 10:22 EDT — …`, or a bare `### 2026-08-13 — …`.
 *
 * The zone is part of the format because both are in use: the entries written by the agent working
 * in this container are UTC, and the ones written beside the owner are EDT. Reading an EDT heading
 * as UTC would place it four hours early and invent inversions that are not there.
 */
const HEADING = /^### (\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}) (UTC|EDT|EST))?(?: —.*)?$/;

interface Entry {
  readonly line: number;
  readonly at: number;
  readonly title: string;
}

const entries: Entry[] = [];
const unparsed: string[] = [];

CHANGELOG.split('\n').forEach((line, index) => {
  if (!line.startsWith('### ') || !/^### \d{4}-\d{2}-\d{2}/.test(line)) return;
  const parts = line.match(HEADING);
  if (!parts) {
    unparsed.push(`line ${index + 1}: ${line}`);
    return;
  }
  const [, year, month, day, hour = '23', minute = '59', zone = 'UTC'] = parts;
  /* EDT is UTC-4 and EST is UTC-5, so the UTC instant is the wall clock PLUS the offset. */
  const offset = zone === 'UTC' ? 0 : zone === 'EDT' ? 4 : 5;
  entries.push({
    line: index + 1,
    at: Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) + offset, Number(minute)),
    title: line.replace(/^### /, '')
  });
});

/**
 * The thirty inversions that predate this gate, every one an artefact of a branch merge.
 *
 * This list may SHRINK — an entry re-dated from its commit leaves it — and may not grow. It is not
 * a count, because a count tells the next person nothing about which entry to look at.
 */
const MERGE_INTERLEAVED: readonly string[] = [
  '2026-08-31 08:59 EDT — `EmojiPicker` and `ScreenPane` audited end to end; three ports were wrong',
  "2026-08-31 02:40 UTC — Entry 2 closed by an owner ruling, and entry 5's own measurement had become self-referential",
  '2026-08-30 20:46 EDT — `MainTabStrip` and `RoomOverlays` audited against the v4 bundle: fourteen rows, seven behaviours changed',
  '2026-08-31 00:45 EDT — Three unaudited Svelte surfaces read against the v4 bundle: VideoPlayer, ScheduledAlerts, AvDevicePane',
  '2026-08-30 22:29 EDT — Three room surfaces audited against the pinned v4 bundle: the private composer, the GIF picker and the captions overlay',
  '2026-08-31 02:30 EDT — The screen zoom, screen volume and stream-tab surfaces, audited against the pinned v4 bundle',
  '2026-08-31 02:40 EDT — §NAV and §MSM: the navbar and the message kebab, read whole against the pinned v4 bundle',
  '2026-08-31 00:35 EDT — RoomShell, MessageBody and RichTextEditor audited: four citations naming a bundle this repository has never held, and a placeholder that never came back',
  '2026-08-31 04:40 EDT — Four room surfaces audited against the pinned v4 bundle: 13 rows, of which two keyboard traps and a one-pixel username',
  '2026-08-30 22:50 UTC — `NEW-TODO.md` was scheduling five commands that were already built',
  "2026-08-30 03:55 UTC — Three presenter actions were drawn for every member, and every gate assertion in this file was rebuilt on the compiler's tree",
  "2026-08-30 04:30 UTC — The user modal's Badges cell was an empty div, and the whole supply was already on the page",
  '2026-08-29 22:00 UTC — The 125px downscale and the alerts: a correction to a feature shipped hours earlier',
  '2026-08-29 02:40 UTC — `accept="image/*"` opened a comment that ate a real render, and a false claim I had just written',
  '2026-08-28 18:40 UTC — The typing indicator, and a gate that governs the send rather than the view',
  '2026-08-28 06:10 EDT — The last component with no render cover, and two comments that had gone false',
  '2026-08-19 10:20 EDT — the whole class: five addressed frames were broadcast, and the rule is now a gate',
  '2026-08-17 20:05 EDT — CORRECTION: component-render coverage was mis-stated, and my own audit had the bug',
  '2026-08-16 14:21 EDT — coverage map added to `todo-next.md`: it is a build spec for 2 surfaces of 42, not for the app',
  '2026-08-16 14:14 EDT — R-1 closed, Q-1 audited against our code, and a false comment found in `ModalHost.svelte`',
  '2026-08-16 13:42 EDT — Q-1 closed: `app-alert-qa-modal` read end to end, and the capture alone would have shipped it wrong',
  '2026-08-16 13:29 EDT — the six login evidence gaps closed: MD5, the site key, the upload endpoint, the gear padding, both password wire calls',
  '2026-08-16 12:20 EDT — L-5 closed, divergences to zero, and the JWT taken out of the address bar',
  '2026-08-16 09:47 EDT — `RoomBroadcasts`, and a rename that silently broke three wire commands',
  '2026-08-16 08:05 EDT — The corpus moves to v4, the push-notification root cause is FOUND, and the work queue moves to `todo-next.md`',
  '2026-08-15 21:45 EDT — Migration `0013` applied to `tradingroom_dev`, with the schema read back',
  '2026-08-15 21:40 EDT — Migration `0013` applied and read back, and two things I recorded wrongly',
  '2026-08-15 12:49 EDT — CI can no longer cancel the default branch out of its own verification',
  '2026-08-13 — The full gate has five PRE-EXISTING red steps; evidence seal updated for TIER1-fetched',
  '2026-08-12 13:05 EDT — The gate has a source, and `HANDOFF.md` is complete'
];

describe('the changelog is a ledger', () => {
  it('reads a changelog with entries in it', () => {
    expect(CHANGELOG.length).toBeGreaterThan(100_000);
    expect(entries.length).toBeGreaterThan(500);
  });

  it('states every heading in the one format the parser can read', () => {
    /*
      A heading this parser cannot read is a heading neither rule below applies to, which is a hole
      rather than a pass. Failing on it is the point: the format is `### YYYY-MM-DD [HH:MM ZONE] —`.
    */
    expect(unparsed).toEqual([]);
  });

  it('dates no entry in the future, which is what an estimate always eventually does', () => {
    /*
      The whole 2026-09-02 block failed exactly here: the clock said 2026-09-01 on every one of the
      eleven occasions one of them was written. Measured against the wall clock rather than against
      HEAD, so that an entry written minutes BEFORE the commit that carries it still passes — which
      is the order the CHANGELOG rule asks for.
    */
    const now = Date.now();
    const ahead = entries.filter((entry) => entry.at > now);
    expect(ahead.map((entry) => `line ${entry.line}: ${entry.title}`)).toEqual([]);
  });

  it('runs newest-first, and every exception is one this file names', () => {
    const inversions = entries
      .filter((entry, index) => index > 0 && entry.at > entries[index - 1].at)
      .map((entry) => entry.title);

    for (const title of inversions) {
      expect(
        MERGE_INTERLEAVED,
        `${title}\n\nis dated LATER than the entry above it. Newest first: either the heading is ` +
          'wrong (read the commit with `git show -s --format=%cI`) or it was prepended to the ' +
          'wrong place. Do not add it to MERGE_INTERLEAVED — that list is closed and only shrinks.'
      ).toContain(title);
    }

    /* And the ratchet: the historical set may lose members, never gain them. */
    expect(inversions.length).toBeLessThanOrEqual(MERGE_INTERLEAVED.length);
  });
});
