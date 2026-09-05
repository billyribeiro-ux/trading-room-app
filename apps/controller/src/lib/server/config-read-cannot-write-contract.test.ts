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
  /*
    `room-occupancy` joined 2026-08-31, and it is the one WRITE with no person behind it.

    Every other entry carries out a presenter's decision and so also names a member and checks that
    they are one. This is the room process reporting a fact about itself — nobody pressed anything —
    so there is no member to name, and requiring one would mean inventing an actor. Its authority is
    the write capability alone, which is exactly what this list is here to assert: a token minted to
    READ a room's configuration cannot move a stored number.
  */
  /*
    `room-state` joined 2026-09-03, and it is the first WRITE that is not a SETTING.

    Its siblings all move `room_settings.settings_json` through the generated schema, or a ban row.
    This one moves `rooms.state` — the COLUMN `decideRoomEntry` refuses entry on — so it is the door
    itself rather than a preference about the door. That is why it is a route of its own and not a
    key on `room-setting`, and it is a WRITE for the plainest possible reason: a token minted to READ
    a room's configuration must not be able to close, or reopen, that room to everybody in it.
  */
  const WRITES = [
    'room-ban',
    'room-mute',
    'room-occupancy',
    'room-permissions',
    'room-setting',
    'room-state',
    'room-visit-exit',
    'stream-ingest'
  ];
  /*
    `room-notes-auth` joined 2026-08-29. It POSTs a candidate the controller compares against
    `needPasswordForUserNotes` and answers two booleans; nothing on the controller changes, which is
    what puts it here rather than in WRITES. The same shape as `room-entry` beside it — the
    credential stays and the question travels.
  */
  /*
    `mobile-restore` joined 2026-08-29, and it is the one entry in this list that is NOT read-only —
    it sends a push notification and can delete a dead registration. It is here anyway, and the
    distinction is worth stating rather than glossing.

    This split is about the room's CONFIGURATION. `room-ban`, `room-permissions` and `room-setting`
    change a room's stored settings from the room, and those take `config-write`. `mobile-restore`
    changes no setting: it is the same shape as `mobile-pin` directly above it — a POST, on demand,
    for one named member, reached only when that member presses a button about their own device —
    and `mobile-pin` MINTS a credential, so "read" here has never meant "no side effect".

    What both actually assert is that the room may ask this question, not that the answer is free.
  */
  /*
    `room-welcome-mat-auth` joined 2026-08-30, and it is the first READ that answers with DATA: on a
    correct `allRoomsWelcomeMatPW` it returns the short codes of the rooms the caller's account owns.

    A READ anyway, and the data is what makes the decision worth writing down rather than assuming.
    Nothing on the controller changes — every write happens in the ROOM application, against its own
    database, gated on this answer. And the list is on this call rather than a second one precisely
    so that a `config-read` token alone cannot enumerate an account's rooms: the gate and the data it
    unlocks are one round trip, and a wrong password returns `{required, ok:false, rooms:[]}`.

    Had it been split in two, the list endpoint would have been the read that leaks, and this list
    would have had to say so.
  */
  /*
    `room-alert-delete-auth` joined 2026-08-30, and it is the FOURTH question-shaped read. It POSTs a
    candidate the controller compares against `deleteAlertPW` and answers two booleans; nothing on
    the controller changes, which is what puts it here rather than in WRITES.

    It is a SECOND ROUTE rather than a `credential` parameter on `room-notes-auth`, and this list is
    where that shows up as a decision rather than as a copied paragraph. One endpoint taking a
    credential NAME would let any holder of a `config-read` token ask "is this string the value of
    `obsStreamKey`" and walk all seven credential-shaped settings a guess at a time. So the count of
    READS grows by one per question, deliberately: the length of this list is the price of not having
    an oracle, and `room-credential-prompt.ts` carries the full argument.
  */
  const READS = [
    'room-alert-delete-auth',
    'room-config',
    'room-entry',
    'room-notes-auth',
    'room-welcome-mat-auth',
    'mobile-pin',
    'mobile-restore',
    'public-stream-read',
    'stream-read'
  ];
  const METHOD_SCOPED = ['alert-delivery', 'discord'];

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

  it.each(METHOD_SCOPED)('%s separates its read and write methods', async (route) => {
    const source = await sourceOf(route);
    expect(source).toContain('verifyConfigReadToken');
    expect(source).toContain('verifyConfigWriteToken');
  });

  /*
    THE SECOND HALF OF A WRITE ROUTE, and it did not exist as a sweep until 2026-09-03.

    The capability above answers "may this caller reach the door at all". It says nothing about WHO
    the caller is acting as, and the two are separate locks on purpose: the shared secret is held by
    the room PROCESS, so every member's request arrives carrying it. Authority is the second lock.

    Written as a sweep rather than as a per-endpoint block because of what it is guarding against —
    a NEW write route landing with the token check copied and the member check forgotten. That is
    exactly how `room-state` could have arrived: it was written the same day this sweep was, and the
    room hides its two buttons from a member, which is not an authorization check.

    The presenter test is asserted as the EXPRESSION and not as a message. `stream-ingest` answers
    `Forbidden.` where the others answer `Presenters only.`, deliberately and by its own docblock —
    a participant asking about a room's ingest credential learns nothing from the refusal — and a
    sweep that pinned the sentence would have forced that endpoint to leak the distinction or be
    excluded from the sweep entirely.

    The row is matched with a regular expression because the LOCAL is named three different ways
    across these six files (`caller`, `member`, `membership`), and renaming a local is not a
    security change. What is pinned is the shape that cannot be weakened without showing up here:
    the owner counts (`role === 0`), a true presenter counts (`isRoomPresenter`), and both read the
    SAME row — the one the endpoint just looked up for this room, never a claim from the request.
  */
  const PRESENTER_TEST = /(\w+)\.roomUser\.role === 0 \|\| isRoomPresenter\(\1\.roomUser\)/;
  // Both are machine-reported facts. Occupancy reports a count; visit-exit reports that the
  // already-authenticated room session has ended. Neither is a presenter acting on another user.
  const NO_MEMBER_NAMED = ['room-occupancy', 'room-visit-exit'];
  it.each(WRITES.filter((route) => !NO_MEMBER_NAMED.includes(route)))(
    '%s also checks that the named member is a presenter of THIS room',
    async (route) => {
      const source = await sourceOf(route);
      expect(source).toMatch(PRESENTER_TEST);
      expect(source).toContain('account.status !== ACCOUNT_ACTIVE');
    }
  );

  it('machine-reported writes are not misclassified as presenter actions', async () => {
    /*
      `room-occupancy` reports its own subscriber count, and `room-visit-exit` reports that an
      already-authenticated live-room session ended. Nobody is exercising presenter authority in
      either case, so requiring a presenter would invent an actor.

      The suspended-account refusal still applies. A suspended room stops serving, reads and writes
      alike, and that is not about who is asking.
    */
    for (const route of NO_MEMBER_NAMED) {
      const source = await sourceOf(route);
      expect(source).not.toContain('isRoomPresenter');
      expect(source).toContain('account.status !== ACCOUNT_ACTIVE');
    }
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
    expect(onDisk).toEqual([...WRITES, ...READS, ...METHOD_SCOPED, 'media-auth'].sort());
  });
});

async function sourceOf(route: string): Promise<string> {
  const { readFileSync } = await import('node:fs');
  return readFileSync(`${process.cwd()}/src/routes/internal/${route}/[code]/+server.ts`, 'utf8');
}
