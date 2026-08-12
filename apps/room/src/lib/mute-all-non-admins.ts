/**
 * `muteAllNonAdmins()` — the presenter control that silences every ordinary member who currently
 * has a microphone open, and leaves the other presenters talking.
 *
 * Transcribed from `docs/source/components/app-room.full.js:2963-2986`:
 *
 * ```js
 * muteAllNonAdmins() {
 *   if (!this.appService.globals.user.isPresenter) return;
 *   const e = this.mediaService.talkingUsers;
 *   !e || 0 === e.length || bootbox.confirm('Mute all non-admin users currently speaking?', i => {
 *     if (!i) return;
 *     const o = this.appService.globals.roster;
 *     if (!o || 0 === o.length) return;
 *     const s = new Map();
 *     for (const a of o) s.set(a._id, a);
 *     const r = [];
 *     for (const a of e) { const l = s.get(a.userID); l && 'a' !== l.perms && r.push(a) }
 *     0 !== r.length && r.forEach((a, l) => {
 *       setTimeout(() => { this.appService.sendServerCommand('muteTalkingUser', a) }, 100 * l)
 *     })
 *   })
 * }
 * ```
 *
 * Four properties of that are load-bearing and are what this module exists to pin:
 *
 * 1. **It selects from `talkingUsers`, not from the roster.** Somebody with no microphone open is
 *    not muted, so the command is never sent to a peer that has nothing to stop.
 * 2. **The roster is the AUTHORITY on who is an admin**, looked up by id. A talking user carries no
 *    permission of its own, so a `talkingUsers` entry with no roster row is skipped entirely —
 *    `l && 'a' !== l.perms`. Unknown is NOT treated as ordinary. That asymmetry is deliberate
 *    upstream and is reproduced: muting somebody because we could not find them is the wrong
 *    failure.
 * 3. **`perms === 'a'` is the admin test.** This room's roster carries `isP` instead, and
 *    `roster-gates.ts` already maps the two (`permissions: user.isP ? 'a' : 'r'`), so `isP` is the
 *    same question asked in this codebase's own vocabulary.
 * 4. **The sends are STAGGERED 100ms apart**, `100 * index`. Not cosmetic: the reference is firing
 *    one socket command per muted member, and a room with twenty open microphones would otherwise
 *    emit twenty in the same tick.
 *
 * The empty checks are early returns rather than a filter that happens to produce nothing, because
 * upstream they gate the CONFIRM: with nobody speaking the dialog never opens at all.
 */

/** A `mediaService.talkingUsers` entry — everyone with a microphone open right now. */
export type TalkingEntry = {
  userID: number;
  mediaValue: { name: string };
};

/**
 * A roster row, reduced to the one field this decision reads.
 *
 * `isP` rather than `perms`: see property 3 above. Deliberately not the whole `RosterEntry`, so a
 * change to an unrelated roster field cannot alter who gets muted.
 */
export type RosterAuthority = {
  id: number;
  isP?: boolean;
};

/**
 * Everyone who should be muted, in `talkingUsers` order.
 *
 * Order matters because the caller staggers by index, and the reference staggers in the order
 * `talkingUsers` already holds — so the person who has been speaking longest is muted first.
 */
export function nonAdminTalkingUsers(
  talking: readonly TalkingEntry[],
  roster: readonly RosterAuthority[]
): TalkingEntry[] {
  if (talking.length === 0 || roster.length === 0) return [];

  // `const s = new Map(); for (const a of o) s.set(a._id, a)` — one pass, then a lookup per
  // talking user. A `find()` inside the loop would be quadratic, and a busy room is exactly when
  // this control gets used.
  const byId = new Map<number, RosterAuthority>();
  for (const row of roster) byId.set(row.id, row);

  const selected: TalkingEntry[] = [];
  for (const entry of talking) {
    const row = byId.get(entry.userID);
    // `l && 'a' !== l.perms` — no roster row means SKIP, not "assume ordinary". See property 2.
    if (!row) continue;
    if (row.isP === true) continue;
    selected.push(entry);
  }
  return selected;
}

/** `100 * index` — the reference's stagger, named so the test can assert it rather than a literal. */
export const MUTE_STAGGER_MS = 100;

/** `bootbox.confirm('Mute all non-admin users currently speaking?', …)`, verbatim. */
export const MUTE_ALL_CONFIRM = 'Mute all non-admin users currently speaking?';
