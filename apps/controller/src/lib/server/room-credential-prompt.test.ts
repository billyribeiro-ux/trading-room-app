import { describe, expect, it } from 'vitest';
import { answerCredentialPrompt } from './room-credential-prompt';

/**
 * THE TWO PROMPTED ROOM CREDENTIALS, and the comparison that answers both.
 *
 * ## Why this is one module tested once rather than two endpoints tested twice
 *
 * `needPasswordForUserNotes` and `deleteAlertPW` are the only two of the seven credential-shaped
 * settings a presenter is ever asked to TYPE. The reference compares both in the browser, against
 * values `sessData` already holds; this reconstruction may put neither there, so for both the
 * credential stays on the controller and the question travels.
 *
 * Two ROUTES, because a credential name on the wire is an oracle — a `config-read` holder could walk
 * any of the seven a guess at a time. One COMPARISON, because a constant-time compare written twice
 * is one that is eventually written once incorrectly. This file is that comparison's own test.
 *
 * ## What each case is guarding, and what breaks if it goes
 *
 * The `required` half is not a nicety. Upstream's branch is `<credential> && !<granted>`: with
 * nothing configured it NEVER PROMPTS and grants immediately. A room that cannot see the setting
 * cannot decide that locally, so `required:false` is the only thing that lets it reproduce the
 * behaviour — and getting it backwards means either a prompt nobody can satisfy or a door that opens
 * for everybody.
 */
describe('a room credential prompt answers both halves', () => {
  it('never prompts when nothing is configured, and grants', () => {
    /*
      Upstream's first branch, exactly. The candidate is IGNORED here — a room with no password set
      grants whatever was typed, including nothing, because there is nothing to be right or wrong
      about. Returning `ok:false` for an empty candidate would lock every such room out of its own
      notes and alerts.
    */
    expect(answerCredentialPrompt('', '')).toEqual({ required: false, ok: true });
    expect(answerCredentialPrompt('', 'anything at all')).toEqual({ required: false, ok: true });
  });

  it('requires and accepts the exact configured value', () => {
    expect(answerCredentialPrompt('hunter2', 'hunter2')).toEqual({ required: true, ok: true });
  });

  it('requires and refuses anything else', () => {
    for (const wrong of ['hunter', 'hunter22', 'Hunter2', '', 'hunter3']) {
      expect(answerCredentialPrompt('hunter2', wrong), wrong).toEqual({ required: true, ok: false });
    }
  });

  it('trims the CANDIDATE and never the configured value', () => {
    /*
      Upstream's `e.trim() === <configured>`, reproduced rather than tidied — and the asymmetry is
      the point. An owner who configured a password with a trailing space HAS a password with a
      trailing space, and matching that is what makes their room behave as they set it up.

      Tidying it to trim both sides would be a silent widening: two different configured values,
      `"secret"` and `"secret "`, would start accepting the same input.
    */
    expect(answerCredentialPrompt('hunter2', '  hunter2  ')).toEqual({ required: true, ok: true });
    expect(answerCredentialPrompt('hunter2 ', 'hunter2')).toEqual({ required: true, ok: false });
    expect(answerCredentialPrompt('hunter2 ', 'hunter2 ')).toEqual({ required: true, ok: false });
  });

  it('does not throw on a length mismatch, which timingSafeEqual would', () => {
    /*
      `timingSafeEqual` THROWS on unequal-length buffers. The length test therefore has to come
      first, and a refactor that reorders them turns a wrong password into a 500 — which is not
      merely an ugly failure: the reference's own answer to a wrong password is a dialog saying so,
      and an exception would leave the presenter looking at nothing.
    */
    expect(() => answerCredentialPrompt('short', 'a much longer candidate')).not.toThrow();
    expect(answerCredentialPrompt('short', 'a much longer candidate').ok).toBe(false);
  });

  it('handles multi-byte characters by BYTES, consistently on both sides', () => {
    /*
      `Buffer.from` is UTF-8, so a password containing an emoji or an accented character compares as
      bytes. Asserted because the length test is on `Buffer.length` rather than `String.length`, and
      the two disagree for exactly these inputs — a comparison that mixed them would refuse a
      correct password.
    */
    expect(answerCredentialPrompt('påsswörd', 'påsswörd')).toEqual({ required: true, ok: true });
    expect(answerCredentialPrompt('påsswörd', 'passwörd')).toEqual({ required: true, ok: false });
  });
});
