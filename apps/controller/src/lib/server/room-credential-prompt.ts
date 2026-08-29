import { timingSafeEqual } from 'node:crypto';

/**
 * The two ROOM CREDENTIALS a presenter is prompted for, and the one comparison that answers both.
 *
 * ## What these two have in common that the other five do not
 *
 * Seven settings are credential-shaped and may never reach the room:
 * `deleteAlertPW`, `banIPList`, `obsStreamKey`, `twillioApiSID`, `modAdminLoginList`,
 * `allRoomsWelcomeMatPW` and `needPasswordForUserNotes`.
 *
 * **Two of them are PROMPTS.** The reference asks a presenter to type
 * `needPasswordForUserNotes` before managing a member's notes (byte 2,081,768) and `deleteAlertPW`
 * before archiving or deleting an alert (byte 2,048,903), and in both cases it compares in the
 * browser against a value `sessData` already holds. This reconstruction cannot put either there, so
 * for both the credential stays and the QUESTION travels.
 *
 * The other five are never compared against anything a person types. `obsStreamKey` is handed to an
 * encoder, `banIPList` is a list the server filters against, `modAdminLoginList` names accounts.
 * There is no question about them for a room to ask, which is why this module names two and not
 * seven.
 *
 * ## WHY THE CREDENTIAL IS NOT A PARAMETER ON THE WIRE
 *
 * The obvious shape is one endpoint taking a credential NAME. It was rejected, and the reason is
 * worth stating because the alternative looks tidier:
 *
 * **A name on the wire is an oracle.** Any caller holding a `config-read` token could then ask "is
 * this string the value of `obsStreamKey`" and walk any of the seven a guess at a time. An
 * allow-list of askable names would narrow it, but it would still put a credential SELECTOR on a
 * request, and the thing standing between a stream key and a brute-force would be a filter rather
 * than the absence of a door.
 *
 * So each question gets its own route, each route names its own setting in its own source, and the
 * request body carries nothing but the candidate. What is shared is this — the comparison — because
 * a constant-time compare written twice is a constant-time compare that is eventually written once
 * incorrectly.
 */
export interface CredentialPromptAnswer {
  /** Whether the room has this credential configured at all. False means upstream never prompts. */
  readonly required: boolean;
  /** Whether this attempt matches. */
  readonly ok: boolean;
}

/**
 * Compare a typed candidate against a configured credential.
 *
 * ## Both halves of the answer, because `required` is what makes the behaviour match
 *
 * The reference's first branch is `<credential> && !<alreadyGranted>`: with nothing configured it
 * never prompts and grants immediately. A room that cannot see the setting cannot decide that
 * locally, and a second crossing boolean would put a fact DERIVED from a credential on the wire for
 * one caller. Returning `required` beside `ok` lets the room reproduce the branch exactly while
 * holding neither the value nor anything computed from it.
 *
 * ## The comparison, and the two things about it that are deliberate
 *
 * `candidate.trim() === configured` — the CANDIDATE is trimmed and the stored value is not, which is
 * upstream's `e.trim() === …` reproduced rather than tidied. An owner who configured a password with
 * a trailing space has a password with a trailing space, and matching that is the point.
 *
 * Constant-time over equal-length buffers, because a length-varying compare on a secret is the one
 * shape that leaks it a character at a time. `timingSafeEqual` throws on unequal lengths, so the
 * length test comes first and the comparison runs only when it can be meaningful.
 *
 * **The length test itself leaks the length**, and that is accepted rather than hidden: these are
 * room passwords an owner typed into a settings form, not key material, and the alternative — hashing
 * both sides to a fixed width — would change what "matches" means for a value the owner can see in
 * their own settings page.
 */
export function answerCredentialPrompt(configured: string, candidate: string): CredentialPromptAnswer {
  if (configured === '') return { required: false, ok: true };

  const offered = Buffer.from(candidate.trim());
  const expected = Buffer.from(configured);
  return { required: true, ok: offered.length === expected.length && timingSafeEqual(offered, expected) };
}
