import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { DEAD_PREFERENCE_KEYS } from './dead-preference-keys.js';
import { codeOf } from './source-comments.js';

/**
 * THE SESSION DOOR — closing a room, opening it, and the fact that neither did anything.
 *
 * ## What was measured on 2026-09-03
 *
 * `rooms.state` is the column `decideRoomEntry` refuses entry on: `attempt.roomState !== 'open'`
 * answers with the presenter's own close message. The enforcement was correct. **Nothing could set
 * it**, at either end:
 *
 *   * written at CREATION and nowhere else — `provision-room.ts` and the clone action;
 *   * the controller's `setState` form action had **no form posting to it** — one occurrence of the
 *     name in the whole application, its own declaration;
 *   * the ROOM wrote `savePreference('sessionOpen', …)`, a key with **zero readers anywhere**, from
 *     both the close and the open control.
 *
 * A presenter closed the session, was told `Message Saved`, and the room admitted everybody as
 * before — for the entire life of the feature.
 *
 * ## What this file asserts, and why each half is here
 *
 * Not that a room closes — that is `decideRoomEntry`'s test on the controller, and it always passed.
 * That the three ways this defect existed cannot come back:
 *
 *   the WRITE happens              — a command that publishes and does not persist is the old bug
 *   the write comes FIRST          — a frame telling people to reload into a stale door is the old
 *                                    bug wearing a working command
 *   no preference is written       — `sessionOpen` is dead, and named dead
 *
 * ## Read comment-stripped
 *
 * Every docblock here quotes `savePreference('sessionOpen', false)` in order to explain why it was
 * wrong. A raw-source assertion that the write is gone would match the sentence recording that it
 * went — the trap this repository has now hit four times in one day.
 */

const read = (relative: string) => readFileSync(new URL(relative, import.meta.url), 'utf8');

const COMMANDS = read('../routes/session-commands.remote.ts');
const CLOSE_MESSAGE = read('./room/close-message.ts');
const ROOM_COMMANDS = read('./room/session-room-commands.ts');
const EVENTS = read('./room/events.svelte.ts');

const CLOSE_MESSAGE_CODE = codeOf('close-message.ts', CLOSE_MESSAGE);
const ROOM_COMMANDS_CODE = codeOf('session-room-commands.ts', ROOM_COMMANDS);

describe('the door is written, not announced', () => {
  it('closeSession persists the state', () => {
    expect(COMMANDS).toContain("await writeRoomState(room, requireUser(locals).email, 'closed');");
  });

  it('openSession persists it too, which it did not', () => {
    /*
      `openSession` existed before this and published `openSession` alone — a reload prompt into a
      door nothing could open. Half a working control is what made the defect survive: the OPEN side
      looked like it worked, because the room had never actually been closed.
    */
    expect(COMMANDS).toContain("await writeRoomState(room, requireUser(locals).email, 'open');");
  });

  it('and the WRITE comes before the frame, in both', () => {
    /*
      THE ORDERING, and it is one principle with the sign flipped rather than two rules.

      `openSession`: do not tell people to reload into a door that is still shut.
      `closeSession`: the refusal must already be true when the reload arrives.

      Both fall out of "the durable state changes before anything tells anybody it has". Asserted by
      POSITION because that is what the property is; a mock could show both calls happening and say
      nothing about which was first.
    */
    for (const [name, state, frame] of [
      ['openSession', "'open'", "cmd: 'openSession'"],
      ['closeSession', "'closed'", "cmd: 'closedPage'"]
    ] as const) {
      const at = COMMANDS.indexOf(`export const ${name} = command(`);
      expect(at, `${name} must be findable`).toBeGreaterThan(-1);

      const writeAt = COMMANDS.indexOf(
        `writeRoomState(room, requireUser(locals).email, ${state})`,
        at
      );
      const frameAt = COMMANDS.indexOf(frame, at);
      expect(writeAt, `${name} must write the state`).toBeGreaterThan(at);
      expect(frameAt, `${name} must publish its frame`).toBeGreaterThan(at);
      expect(frameAt, `${name} must write BEFORE it announces`).toBeGreaterThan(writeAt);
    }
  });
});

describe('no per-user preference stands in for the room’s door', () => {
  it('neither control writes sessionOpen any more', () => {
    expect(CLOSE_MESSAGE_CODE).not.toContain('sessionOpen');
    expect(ROOM_COMMANDS_CODE).not.toContain('sessionOpen');
  });

  it('and the key is NAMED dead, so a stored copy is evicted', () => {
    /*
      `mirrorPreferenceToLocalStorage` removes every dead key on the next write, so naming it is what
      clears the copies already in browsers. Being unwritten is not the same as being retired.
    */
    expect(DEAD_PREFERENCE_KEYS).toContain('sessionOpen');
  });

  it('the close no longer takes a savePreference it does not use', () => {
    /*
      The dep came out with the write it existed for. An injected collaborator nothing calls is what
      this repository refuses one level up, and leaving it would read as "the close still touches
      preferences" to the next person who opened the file.
    */
    expect(CLOSE_MESSAGE_CODE).not.toContain('savePreference');
  });
});

describe('the people already inside are told', () => {
  it('a closedPage frame reaches the room', () => {
    expect(COMMANDS).toContain("cmd: 'closedPage'");
  });

  it('and the room has a receiver for it', () => {
    /*
      Upstream's is one line — `subscribe("closedPage", () => this.currPage = "closed")`, byte
      2,596,849 — swapping `app-root`'s whole page. This room has no `currPage` switch: its
      equivalent is the guest door's refusal, rendered by `+error.svelte` with the stored close
      message, so the RELOAD is the page swap.
    */
    expect(EVENTS).toContain("if (command?.cmd === 'closedPage') {");
    expect(EVENTS).toContain("this.#alertThenReload('The presenter has closed this session.');");
  });

  it('the close FAILS LOUDLY rather than reporting a save that did not close', () => {
    /*
      `Message Saved` is the word a presenter reads as "and closed". A refused write that still said
      it would reproduce the original defect with a working command underneath.
    */
    expect(CLOSE_MESSAGE_CODE).toContain(
      "'The message was saved, but the room could not be closed.'"
    );
    expect(CLOSE_MESSAGE_CODE).not.toContain('.catch(() => {})');
  });
});
