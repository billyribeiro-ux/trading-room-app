import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Which capability each call to the controller mints — asserted, because nothing else can see it.
 *
 * ## The seam this guards
 *
 * The room MINTS and the controller VERIFIES, and they are separate deployables that cannot import
 * each other. The agreement between them is two string literals — `config-read:` and
 * `config-write:` — appearing in two files in two packages. Nothing connects them: not the compiler,
 * not a type, not the build. Change one and the other keeps compiling, and the first symptom is a
 * presenter's ban button returning 401 in production.
 *
 * That is the same shape as every defect this repository keeps re-meeting: a call site and its
 * target joined by a string. `remote-call-sites-contract.test.ts` guards the interpolated action
 * names; `manifest-scripts-contract.test.ts` guards the manifest's file paths; this guards the
 * capability prefixes.
 *
 * ## Why the WRITE callers are named one by one
 *
 * Because getting one wrong is silent in the safe-looking direction. A write call that mints a READ
 * token fails closed — the controller refuses it, the presenter sees a refusal — which is
 * recoverable and loud. A READ call that mints a WRITE token is the direction that matters: it hands
 * a capability wider than the job to a path that never needed it, and it succeeds, so nothing
 * complains. Both directions are pinned here.
 *
 * The controller half of this property is
 * `apps/controller/src/lib/server/config-read-cannot-write-contract.test.ts`, which proves each
 * verifier refuses the other's token. Between the two files the whole seam is covered: this one says
 * the right credential is minted, that one says the wrong one is refused.
 */

const CLIENT = readFileSync(new URL('./room-config-client.ts', import.meta.url), 'utf8');

/** The body of one exported function, from its signature to the start of the next one. */
function bodyOf(name: string): string {
  const start = CLIENT.indexOf(`export async function ${name}(`);
  expect(start, `${name} is not an exported function of room-config-client.ts`).toBeGreaterThan(-1);
  const next = CLIENT.indexOf('\nexport ', start + 1);
  return CLIENT.slice(start, next === -1 ? undefined : next);
}

/*
  Every caller that CHANGES something on the controller. `requestStreamIngestKey` is here and is the
  one that reads as though it belongs with the readers: its name says "request", and every call
  ROTATES the ingest credential, which is a mutation whatever the verb suggests.
*/
const WRITERS = [
  'writeRoomSetting',
  'writeRoomPermissions',
  'writeRoomBan',
  // The indefinite chat mute — opcode 3 on the controller. Added 2026-08-27, and this list is where
  // the test insisted the capability be decided rather than inherited from whichever call it was
  // copied from.
  'writeRoomMute',
  'requestStreamIngestKey'
];

/*
  Every caller that only asks a question. `decideRoomEntryRemotely` posts a typed password and
  `requestStreamReadToken` mints a playback token, so both are POSTs — and neither changes controller
  state, which is what decides the capability.
*/
const READERS = [
  'fetchRoomConfig',
  'requestMobilePin',
  'requestStreamReadToken',
  'decideRoomEntryRemotely',
  /*
    `checkNotesPasswordRemotely` — the second question-shaped POST, added 2026-08-29. It sends a
    candidate the controller compares against `needPasswordForUserNotes` and answers two booleans;
    nothing on the controller changes, which is what decides the capability. The same shape as
    `decideRoomEntryRemotely` immediately above, for the same reason: the credential stays where it
    was configured and the QUESTION travels.
  */
  'checkNotesPasswordRemotely',
  /*
    `restoreMobileTokens` — added 2026-08-29, and the one entry in this list whose call is NOT
    free of consequence: the controller sends a push notification and may delete a dead registration.
    It is a READER anyway, and the reason is the split's actual subject.

    This split is about the room's CONFIGURATION. Every writer above changes a room's stored settings
    from the room. This changes none: it is the same shape as `requestMobilePin` four lines up — a
    POST, on demand, for one named member, reached only when that member presses a button about
    their own device — and `requestMobilePin` MINTS a pair code, so "read" here has never meant "no
    side effect". What both assert is that the room may ask this question, not that the answer is
    free.
  */
  'restoreMobileTokens',
  /*
    `checkWelcomeMatPasswordRemotely` — the third question-shaped POST, added 2026-08-30, and the
    only one that answers with DATA as well as a boolean: on a correct password it returns the short
    codes of the rooms the caller's account owns.

    A READER, and the data does not change that. Nothing on the controller changes — the writes all
    happen in the room application, against its own database, gated on this answer. The list is on
    this call rather than a second one precisely so that a `config-read` token alone cannot
    enumerate an account's rooms: the gate and the data it unlocks are one round trip, and a wrong
    password returns `{required, ok:false, rooms:[]}`. The endpoint's own header carries the rest.
  */
  'checkWelcomeMatPasswordRemotely'
];

describe('the capability minted for each controller call', () => {
  it('mints both domains, and signs the shape the controller verifies', () => {
    /*
      The guard on the guard, and the assertion the whole seam rests on: if the domain ever stopped
      being part of the signed material, both tokens would become the same string and every
      per-function assertion below would still pass.
    */
    expect(CLIENT).toContain("domain: 'config-read' | 'config-write'");
    expect(CLIENT).toContain('`${domain}:${shortCode}.${issuedAt}`');
  });

  it.each(WRITERS)('%s mints a WRITE capability', (name) => {
    const body = bodyOf(name);
    expect(body).toContain('configWriteToken(secret, shortCode)');
    expect(body).not.toContain('configReadToken(secret, shortCode)');
  });

  it.each(READERS)('%s mints a READ capability', (name) => {
    const body = name === 'fetchRoomConfig' ? readerBody(name) : bodyOf(name);
    expect(body).toContain('configReadToken(secret, shortCode)');
    expect(body).not.toContain('configWriteToken(secret, shortCode)');
  });

  it('names every function that talks to the controller', () => {
    /*
      A new caller that lands in neither list is a capability decision nobody made. Counting the
      Bearer headers is how that shows up here rather than in a production 401.
    */
    const bearers = [...CLIENT.matchAll(/authorization: `Bearer \$\{config(Read|Write)Token\(/g)];
    expect(bearers).toHaveLength(WRITERS.length + READERS.length);
  });
});

/** `fetchRoomConfig` is module-private, so it is found without the `export` keyword. */
function readerBody(name: string): string {
  const start = CLIENT.indexOf(`async function ${name}(`);
  expect(start, `${name} is not a function of room-config-client.ts`).toBeGreaterThan(-1);
  const next = CLIENT.indexOf('\nexport ', start + 1);
  return CLIENT.slice(start, next === -1 ? undefined : next);
}
