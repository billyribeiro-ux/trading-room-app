import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

import {
  TYPING_DELAY_MS,
  TYPING_TTL_MS,
  noteNotTyping,
  noteTyping,
  resetTypingForTests,
  typingChannel,
  typingChannelsIn,
  typistsIn
} from './server/typing.js';

/**
 * The typing indicator — two frames per burst, per channel, and never your own name.
 *
 * Send at bytes 1,435,993 and 1,435,666; receive at 1,433,553; the display gate at 1,454,281 is
 * `O(22, showTyping && usersTypingCnt > 0 ? 22 : -1)` where `showTyping = sessData.hasTypingIndicator`.
 */
afterEach(() => resetTypingForTests());

describe('the registry', () => {
  it('defaults an empty channel to "main", which is the reference’s own default', () => {
    // `c: this.channel || "main"` at both send sites.
    for (const value of ['', '   ', undefined, null]) {
      expect(typingChannel(value)).toBe('main');
    }
    expect(typingChannel('off-topic')).toBe('off-topic');
  });

  it('records a typist and clears them', () => {
    noteTyping('r1', 'main', { id: 1, name: 'Ada' });
    expect(typistsIn('r1', 'main', 99)).toEqual(['Ada']);
    noteNotTyping('r1', 'main', 1);
    expect(typistsIn('r1', 'main', 99)).toEqual([]);
  });

  /*
    NEVER YOUR OWN NAME. The reference does not show it either — the frame that would say so is the
    one you just sent — and doing it on the SERVER means a viewer's own name never reaches their
    wire, rather than every client filtering itself out and one of them forgetting.
  */
  it('excludes the asking viewer', () => {
    noteTyping('r1', 'main', { id: 1, name: 'Ada' });
    noteTyping('r1', 'main', { id: 2, name: 'Grace' });
    expect(typistsIn('r1', 'main', 1)).toEqual(['Grace']);
    expect(typistsIn('r1', 'main', 2)).toEqual(['Ada']);
    expect(typistsIn('r1', 'main', 99)).toEqual(['Ada', 'Grace']);
  });

  /*
    PER CHANNEL AND PER ROOM. The two columns show different channels, so one bucket would put the
    extra column's typists under the main column's composer — and one bucket per room would put
    another room's members there, which is the failure `roomShortCode` exists to prevent everywhere
    else in this application.
  */
  it('keeps channels and rooms apart', () => {
    noteTyping('r1', 'main', { id: 1, name: 'Ada' });
    noteTyping('r1', 'off-topic', { id: 2, name: 'Grace' });
    noteTyping('r2', 'main', { id: 3, name: 'Alan' });

    expect(typistsIn('r1', 'main', 99)).toEqual(['Ada']);
    expect(typistsIn('r1', 'off-topic', 99)).toEqual(['Grace']);
    expect(typistsIn('r2', 'main', 99)).toEqual(['Alan']);
    expect(typistsIn('r1', 'nowhere', 99)).toEqual([]);
  });

  it('orders oldest first, so a name does not jump as others join', () => {
    noteTyping('r1', 'main', { id: 1, name: 'Ada' }, 1_000);
    noteTyping('r1', 'main', { id: 2, name: 'Grace' }, 2_000);
    expect(typistsIn('r1', 'main', 99, 2_100)).toEqual(['Ada', 'Grace']);
  });

  /*
    THE SWEEP IS ON READ, and the TTL is deliberately LONGER than the client's own delay. A client
    that navigates away mid-word never sends its `notyping`; a background interval per room would be
    a timer outliving every listener, and expiring on read costs nothing when nobody is looking.
  */
  it('expires a typist who never sent their notyping', () => {
    noteTyping('r1', 'main', { id: 1, name: 'Ada' }, 0);
    expect(typistsIn('r1', 'main', 99, TYPING_TTL_MS - 1)).toEqual(['Ada']);
    expect(typistsIn('r1', 'main', 99, TYPING_TTL_MS)).toEqual([]);
  });

  it('and the TTL leaves room for the client to clear itself first', () => {
    // At or below the client's own delay it would race that timer and flicker for a live typist.
    expect(TYPING_TTL_MS).toBeGreaterThan(TYPING_DELAY_MS);
    expect(TYPING_DELAY_MS).toBe(5_000);
  });

  it('re-announcing refreshes the stamp rather than adding a second entry', () => {
    noteTyping('r1', 'main', { id: 1, name: 'Ada' }, 0);
    noteTyping('r1', 'main', { id: 1, name: 'Ada' }, TYPING_TTL_MS - 1);
    expect(typistsIn('r1', 'main', 99, TYPING_TTL_MS)).toEqual(['Ada']);
  });

  it('drops empty channels and rooms rather than growing forever', () => {
    noteTyping('r1', 'main', { id: 1, name: 'Ada' });
    expect(typingChannelsIn('r1')).toEqual(['main']);
    noteNotTyping('r1', 'main', 1);
    expect(typingChannelsIn('r1')).toEqual([]);
  });
});

const command = readFileSync(new URL('../routes/typing.remote.ts', import.meta.url), 'utf8');
const events = readFileSync(new URL('./server/room-events.ts', import.meta.url), 'utf8');
const signal = readFileSync(new URL('./room/typing-signal.svelte.ts', import.meta.url), 'utf8');
const chat = readFileSync(new URL('./components/AlertChatArea.svelte', import.meta.url), 'utf8');
const extra = readFileSync(new URL('./components/ExtraChatPane.svelte', import.meta.url), 'utf8');

const codeOf = (source: string) =>
  source.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('the entitlement gates the SEND, not only the display', () => {
  /*
    A display-only gate would leave every member broadcasting their keystroke state to each other in
    a room that never bought the feature — hidden, but happening. `showTyping` governs the render;
    this governs whether anything is recorded or fanned out at all.
  */
  it('refuses to record or broadcast unless the room enabled it', () => {
    expect(command).toContain('config.settings?.hasTypingIndicator !== true');
    const gate = command.indexOf('hasTypingIndicator');
    const record = command.indexOf('noteTyping(');
    const publish = command.indexOf('publishTypingToRoom(');
    expect(gate).toBeGreaterThan(-1);
    expect(record, 'the gate must come before the write').toBeGreaterThan(gate);
    expect(publish, 'and before the broadcast').toBeGreaterThan(gate);
  });

  it('reads the name from the session rather than the request', () => {
    // Upstream puts `n: globals.user.nick || globals.user.name` on the wire; a client can lie.
    expect(command).toContain('name: user.displayName');
    expect(command).toContain('z.strictObject({');
    expect(codeOf(command)).not.toContain('n:');
  });
});

describe('the fan-out filters per recipient', () => {
  it('builds one frame per listener rather than one for the room', () => {
    const at = events.indexOf('export function publishTypingToRoom');
    expect(at, 'the publisher is missing').toBeGreaterThan(-1);
    const body = events.slice(at, events.indexOf('\n}', at));
    // `typistsIn(room, channel, thatListener'sId)` — the exclusion happens per listener.
    expect(body).toContain('typistsIn(room, chatChannel, context.user?.id ?? -1)');
    expect(body).not.toContain('publishToRoom(');
  });
});

describe('the send is debounced into TWO frames', () => {
  it('announces once per burst and stops on an empty box', () => {
    // `if (!this.amITyping)` upstream; `announce()` returns true only on the first key.
    expect(signal).toContain('if (this.#announce()) void this.#send(true);');
    // `"" == i.val()` is one of the three `notyping` conditions.
    expect(signal).toContain('if (value.trim().length === 0) {');
  });

  it('replaces the pending timer on every key rather than stacking them', () => {
    expect(signal).toContain('if (this.#timer !== null) clearTimeout(this.#timer);');
    expect(signal).toContain('this.#timer = setTimeout(() => this.stop(), this.#delayMs);');
  });

  /*
    A failed frame is swallowed, and this is the one place in this room where that is right: the
    indicator is advisory, there is no state to roll back, and the next burst tries again anyway.
    Asserted so it reads as a decision rather than as a missing `catch`.
  */
  it('does not surface a failure to the member', () => {
    expect(signal).toContain('} catch {');
  });
});

describe('both columns render it, and neither invents the dots', () => {
  it.each([
    ['the main column', () => chat],
    ['the extra column', () => extra]
  ])('%s draws the three classes that have captured rules', (_label, source) => {
    const code = codeOf(source());
    expect(code).toContain('class="d-flex align-items-center typing-indicator-container"');
    expect(code).toContain('class="users-count me-1"');
    expect(code).toContain('class="users-typing"');
  });

  /*
    `app-typing-indicator-dots` is three empty spans whose entire appearance is CSS, and NEITHER it
    nor its `.typing-indicator` class has a rule in any stylesheet this repository holds. Emitting
    them would be markup with no consumer — the check `smallerImagePreview` failed — and inventing
    the animation would be inventing a design.
  */
  it.each([
    ['the main column', () => chat],
    ['the extra column', () => extra]
  ])('%s does not emit the unstyled dots', (_label, source) => {
    expect(codeOf(source())).not.toContain('typing-indicator-dots');
    expect(codeOf(source())).not.toContain('class="typing-indicator"');
  });

  it('counts from the list rather than carrying a second field', () => {
    for (const source of [chat, extra]) {
      expect(codeOf(source)).toContain('{typists.length}');
      expect(codeOf(source)).toContain("{typists.join(',')}");
    }
  });
});
