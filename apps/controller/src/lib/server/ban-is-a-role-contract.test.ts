import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { userOpcodePatch } from './rooms.js';

/*
  A BAN IS A ROLE. THE COLUMN BESIDE IT IS THE MIRROR, NOT THE RECORD.

  ## The defect this exists to stop happening a second time

  `internal/room-ban/[code]` shipped on 2026-08-23 writing `.set({ banned })` — the boolean alone,
  hand-copied rather than taken from the opcode map. Nothing in this repository asks about that
  column when it decides whether somebody is banned. All three consumers read the ROLE:

    internal/room-config/[code]/+server.ts:244   banned: membership.roomUser.role === 4
    internal/stream-read/[code]/+server.ts:92    if (member.roomUser.role === 4) …
    account/rooms/[id]/[[tab]]/+page.svelte      {#if member.role === 4} BANNED

  So a member banned from a room kept `role = 2`, the control plane kept answering `banned: false`,
  and they walked straight back in on the next page load. The endpoint reported success and enforced
  nothing — the exact class of defect the whole 2026-08-23 sweep was removing.

  ## Why this file is short, and why that is the point

  The structural fix was to delete the copy: `userOpcodePatch` is now the single definition of what
  an opcode means, `applyUserOpcode` applies it, and the ban endpoint calls it with 4 and 2. There is
  no longer a second mapping for a test to compare against.

  What is left to assert is the thing the copy got wrong — that opcode 4 writes a ROLE and not just a
  flag — plus the round trip, because "ban then unban" is the sequence a presenter actually performs
  and the one where a half-written row is invisible until somebody is wrongly admitted or wrongly
  refused.

  Negative control, run 2026-08-23: dropping `patch.role = 4` from case 4 in `rooms.ts` turns the
  first assertion red with `expected undefined to be 4`.
*/

describe('a ban is a role, not a flag', () => {
  it('opcode 4 sets role 4 — the field every consumer of a ban actually reads', () => {
    expect(userOpcodePatch(4)).toEqual({ role: 4, banned: true });
  });

  /*
    Role holds ONE value, so a banned member is role 4 and whatever they were before is already gone.
    Lifting the ban therefore has to name a destination, and opcode 2 is the only one the reference
    provides — `case 2: … break; // also Unban`. It clears `muted` alongside because a row at role 2
    carrying `muted: true` would be the same role/column disagreement that caused the original defect.
  */
  it('opcode 2 lifts a ban to participant and leaves no flag disagreeing with the role', () => {
    expect(userOpcodePatch(2)).toEqual({ role: 2, banned: false, muted: false });
  });

  /*
    The mute is the neighbouring role and is asserted here for the same reason: `refuseIfChatMuted`
    in the room reads `member.muted` while the manage row renders `role === 3`, so these two must be
    written together or one of them is lying about the other.
  */
  it('opcode 3 sets role 3 and the mute flag together', () => {
    expect(userOpcodePatch(3)).toEqual({ role: 3, muted: true });
  });

  /*
    The endpoint is READ rather than trusted to still call the map. This is the one assertion that
    can catch somebody reintroducing a hand-written `.set({ banned })` — the literal shape of the
    original defect — because a patch built inline would never reach `userOpcodePatch` at all.
  */
  it('the room-ban endpoint writes through the opcode map rather than its own object literal', () => {
    const source = readFileSync(new URL('../../routes/internal/room-ban/[code]/+server.ts', import.meta.url), 'utf8');
    expect(source).toContain('.set(userOpcodePatch(banned ? 4 : 2))');
    expect(source).not.toContain('.set({ banned })');
  });
});
