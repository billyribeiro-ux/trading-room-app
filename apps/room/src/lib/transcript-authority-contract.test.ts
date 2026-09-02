import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments.js';

/**
 * THE TRANSCRIPT'S AUTHORITY, pinned at the source.
 *
 * ## Why a source-text contract and not a behavioural one
 *
 * `session-transcript.test.ts` drives the STORE against the real database and proves what it
 * returns. What it structurally cannot see is the layer above it — a remote function's gate is a
 * property of the module, and constructing a SvelteKit request event with a forged membership to
 * test it would mean building the very thing the gate exists to refuse.
 *
 * So this reads the module and asserts the shape. Every line below guards a specific way a
 * transcript feature goes wrong, and each one is a rule this repository already learned somewhere
 * else:
 *
 *   the ROOM is the server's        — the 2026-08-07 privilege escalation, in one sentence
 *   the SPEAKER is the server's     — a client-named speaker is a forged transcript
 *   the READ is gated               — a room's whole spoken record is its most complete leak
 *   the URL carries no credential   — the Benzinga refusal, applied to a window this one opens
 *
 * ## Read COMMENT-STRIPPED, and the first draft proved why
 *
 * Two assertions here forbid a string — `"Unknown Session"` in the page, `.catch(() => {})` in
 * `recording.ts` — and both went red on their first run against the PROSE that explains why the
 * thing is forbidden. A file that documents a refusal contains the refused text by construction, so
 * a raw-source assertion about absence is unwritable. `codeOf` is the module this repository already
 * has for exactly that, and it dispatches on the extension because `svelteCodeOf` over a `.ts` file
 * strips nothing.
 *
 * ## What "negative control" means for a file like this
 *
 * Each expectation was watched RED by making the change it forbids: deleting the `presenterRoom()`
 * call, accepting a `speaker` in the schema, deleting the `archivesAvailableTo` gate, and putting a
 * token in the window's URL. A source-text assertion that has never been seen red is a string
 * comparison, not a contract.
 */

function read(relative: string): string {
  return readFileSync(new URL(relative, import.meta.url), 'utf8');
}

/** Raw, for the assertions that a line IS present — a comment cannot satisfy those falsely. */
const REMOTE = read('../routes/session-transcript.remote.ts');
const PANE = read('./room/alerts-pane.ts');
const RECORDING = read('./room/recording.ts');

/** Comment-stripped, for every assertion that something is ABSENT. See the module note. */
const PAGE_CODE = codeOf('+page.svelte', read('../routes/session-transcript/+page.svelte'));
const RECORDING_CODE = codeOf('recording.ts', RECORDING);

describe('the write: nothing about a recorded line is asserted by the caller', () => {
  it('takes the room from the session, through the presenter gate', () => {
    /*
      `presenterRoom()` is both halves at once — it refuses a non-presenter AND returns the room the
      session was issued for. A `roomShortCode` in the payload would let any presenter write into
      any room's transcript.
    */
    expect(REMOTE).toContain('const room = presenterRoom();');
  });

  it('takes the speaker from the session and never from the payload', () => {
    expect(REMOTE).toContain('speaker: user.displayName');

    /*
      The schema is `strictObject`, so an unexpected key is REFUSED rather than ignored. That is what
      makes "the payload has no speaker" enforceable instead of merely true today: a caller sending
      one gets a validation error, not a silently dropped field.
    */
    expect(REMOTE).toContain('z.strictObject({');

    /*
      EVERY BOUND IS A LOCAL THAT IS ASSERTED FIRST, which `slice-anchor-contract.test.ts` requires
      and which is not ceremony: `indexOf` answers -1 when it misses, and `slice(-1)` takes the last
      character instead of failing. A renamed export would leave every "the schema does not contain
      this" assertion below passing over a one-character string.
    */
    const commandAt = REMOTE.indexOf('export const recordTranscript');
    expect(commandAt).toBeGreaterThan(-1);
    const command = REMOTE.slice(commandAt);

    const schemaAt = command.indexOf('z.strictObject({');
    const bodyAt = command.indexOf('async (');
    expect(schemaAt).toBeGreaterThan(-1);
    expect(bodyAt).toBeGreaterThan(schemaAt);
    const schema = command.slice(schemaAt, bodyAt);

    expect(schema).not.toContain('speaker');
    expect(schema).not.toContain('room');
    expect(schema).not.toContain('sender');
  });
});

describe('the read: gated by archives, on the server', () => {
  it('asks archivesAvailableTo AND refuses on its answer', () => {
    expect(REMOTE).toContain('const allowed = archivesAvailableTo(');

    /*
      BOTH LINES, and the second is the one that matters — found by its own negative control.

      The first draft asserted only that the 403 string appeared somewhere in the module. Deleting
      the `if (!allowed)` refusal entirely left this test GREEN, because the fail-closed
      `if (!membership)` branch below carries the identical message. An assertion satisfied by a
      DIFFERENT guard than the one it names is the vacuous-pass this repository has now met five
      times; the fix is to pin the refusal to its own condition.
    */
    expect(REMOTE).toContain(
      "if (!allowed) error(403, 'Archives are not available in this room.');"
    );
  });

  it('fails CLOSED when the controller cannot answer', () => {
    /*
      A config read that returns no membership must REFUSE. Defaulting the other way hands a room's
      entire spoken record to a member whose owner never opened archives — and a controller that is
      briefly unreachable is a normal event, not an exceptional one.
    */
    expect(REMOTE).toContain('if (!membership) error(403,');
  });

  it('derives the room from the session here too', () => {
    expect(REMOTE).toContain('const room = requireRoomShortCode(locals);');
  });
});

describe('the window carries no credential', () => {
  it('opens the page with no query string at all', () => {
    expect(PANE).toContain("window.open('/session-transcript', '_blank', 'noopener');");
  });

  it('never puts a token or a session handle in that URL', () => {
    /*
      Upstream's is `#/session-transcript?token=${encodeURIComponent(globals.sesionToken)}&name=…`.
      A credential in an address bar is in browser history and in every outbound `Referer`; the same
      refusal `TODO.md` records for the Benzinga default URL.
    */
    const openerAt = PANE.indexOf('openTranscript()');
    expect(openerAt).toBeGreaterThan(-1);
    const opener = PANE.slice(openerAt, openerAt + 200);

    expect(opener).not.toContain('token');
    expect(opener).not.toContain('sessionHandle');
  });

  it('and the page reads no query parameter for its heading', () => {
    /*
      The other half of the same rule. Upstream falls back to `globals.sesionToken` when the query
      parameter is missing, and reads `&name=` for the heading. Ours reads neither: a heading taken
      from the opener's URL is a heading the opener chooses.
    */
    expect(PAGE_CODE).not.toContain('page.url.searchParams');
    expect(PAGE_CODE).not.toContain('Unknown Session');
    expect(PAGE_CODE).toContain("const sessionName = $derived(loaded?.sessionName ?? '');");
  });
});

describe('only final lines are recorded, and it is structural', () => {
  it('the room writes from the SPEAKER’s recognition callback, behind isFinal', () => {
    /*
      Every browser in the room RECEIVES the relayed line. Writing from the receiver would store one
      row per listener per sentence. This call sits in `startSpeechRecognition`'s own `onresult`,
      which only ever runs on the machine doing the recognising.
    */
    expect(RECORDING).toContain('if (result.isFinal) {');
    expect(RECORDING).toContain('void this.#recordTranscript({ text: result.text');

    /*
      NOT SWALLOWED. A failed durable write must not interrupt the live relay, but `.catch(() => {})`
      is the silent fallback `CLAUDE.md` forbids by name.
    */
    expect(RECORDING).toContain("console.warn('[captions] a line was not recorded', error)");
    expect(RECORDING_CODE).not.toContain('.catch(() => {})');
  });

  it('is DOWNSTREAM of the three gates that decide whether a word is captioned at all', () => {
    /*
      THE CONSENT PROPERTY, and it is the reason a transcript table is not a new product decision.

      `reference-const-coverage-contract.test.ts` used to list this whole component as unbuilt with
      the reason that building it *"means first deciding to record every spoken word of every
      session to disk"*. That would be true of a write placed anywhere else. It is not true of this
      one: it sits INSIDE `startSpeechRecognition`'s `onresult`, and that callback only exists after
      `beginSpeechRecognition` has passed all three of its gates — the ROOM's
      `speechRecognitionAvailable()` (`!sessData.hasSpeechRecognitionDisabled`), the PRESENTER's
      `prefs.doSpeechReco`, and `isPresenter()`.

      So nothing is written that was not already being spoken aloud to every member's screen. A room
      that never captions never gets a row. What the owner's decision genuinely governs is how long
      the rows LIVE, which is recorded as retention at the table and not answered here.

      Asserted structurally — the write's position relative to the guard — because the property is
      about WHERE the call is, and a mock-based test would prove the gates work while saying nothing
      about whether the write is behind them. Negative control: move the block above the `if` and
      watch the ordering assertion go red.
    */
    const guardAt = RECORDING.indexOf('!this.#speechRecognitionAvailable() ||');
    const startAt = RECORDING.indexOf('this.#stopSpeechReco = startSpeechRecognition({');
    const writeAt = RECORDING.indexOf('void this.#recordTranscript(');

    expect(guardAt, 'the room/preference/presenter guard must be findable').toBeGreaterThan(-1);
    expect(startAt, 'the recognition start must be findable').toBeGreaterThan(guardAt);
    expect(
      writeAt,
      'the durable write must sit inside the callback the gates guard, not before it'
    ).toBeGreaterThan(startAt);
  });
});
