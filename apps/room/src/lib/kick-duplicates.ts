/**
 * Who counts as a duplicate of somebody, and what the presenter is told afterwards.
 *
 * ## Pure, for the same reason `mute-all-non-admins.ts` is
 *
 * The rule here is a SELECTION over a roster plus two message strings, and both are worth asserting
 * without building a `RoomUserActions` and its dozen collaborators. That module set the pattern:
 * the selection lives in `#lib/`, the class calls it and sends. This one follows it exactly.
 *
 * ## The rule, read at byte 2078708 of the v4 bundle
 *
 * `kickDuplicates()` reads `user.emailHash`, `user.nick||user.name` and `user._id`, and refuses
 * outright when there is no `emailHash`. Then, for every roster entry:
 *
 *     c && c.emailHash === i && c._id !== s
 *
 * — same email hash, DIFFERENT identity. One `kickUser` per match, counted.
 *
 * **`emailHash` is the join, not the user id, and that is the whole feature.** A person logged in
 * twice has two identities and one hash, so the hash is what says "this is the same human". It is
 * also why the muted list is keyed by `emailHash` — muting one instance mutes the person.
 *
 * ## What this repository has, which I claimed twice that it did not
 *
 * `emailHash` is on `User` (`types.ts:58`), filled from `hashEmail(account.email)`
 * (`+page.server.ts:318`), and `RoomUserActions` already reads `connectedUsers` as `readonly User[]`.
 * The thing that misled me was `RosterAuthority` — `{id, isP?}` — which is a narrow interface for
 * `mute-all-non-admins` alone and was never the roster. One type read, wrongly generalised.
 */

/** The fields the duplicate rule needs. Deliberately narrow: it matches, it does not send. */
export interface DuplicateCandidate {
  id: number;
  emailHash: string;
}

/**
 * The default kick message, shared with the plain `kick`.
 *
 * Upstream seeds both prompts from `getPreference("kickMsg")` and falls back to this string, so the
 * two controls genuinely share one default rather than happening to spell the same words twice.
 */
export const DEFAULT_KICK_MESSAGE = 'You have been kicked from the room by an administrator';

/**
 * Every OTHER login of the same person.
 *
 * Returns empty when the target has no `emailHash` — upstream's `if (!i) return`, and the safer
 * reading anyway: an empty hash would match every other entry that also lacks one, which would kick
 * strangers. That is the one case where being permissive is dangerous rather than merely wrong.
 */
export function duplicatesOf<T extends DuplicateCandidate>(
  roster: readonly T[],
  target: DuplicateCandidate
): T[] {
  if (!target.emailHash) return [];
  return roster.filter((entry) => entry.emailHash === target.emailHash && entry.id !== target.id);
}

/** The two alerts, verbatim from the capture — including the singular/plural `duplicate(s)`. */
export function duplicateKickAlert(count: number, nick: string): string {
  return count > 0 ? `Kicked ${count} duplicate(s) of ${nick}` : `No duplicates found for ${nick}`;
}
