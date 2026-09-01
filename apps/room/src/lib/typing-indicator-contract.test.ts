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
const signal = readFileSync(new URL('./room/typing-signal.ts', import.meta.url), 'utf8');
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

describe('both columns render it, dots included', () => {
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
    THE PARAGRAPH THAT USED TO STAND HERE WAS HALF WRONG, and it had held since 2026-08-28.

    It said the dots could not be drawn because *"neither `app-typing-indicator-dots` nor its
    `.typing-indicator` class has a rule in any stylesheet this repository holds"*, and concluded
    that inventing the animation would be inventing a design. The first clause is true — grep
    `captured-runtime-components.css` for `typing-indicator` and all three hits are
    `.typing-indicator-container`, a different class. The conclusion does not follow: an Angular
    component's `styles:[…]` array is injected at runtime OUT OF THE BUNDLE, so it is never in a
    captured stylesheet, and this component's array specifies the appearance to the last decimal.

    Read 2026-09-01 beside the template, at the selector's own definition:

      consts:[[1,"typing-indicator"]],
      template:function(i,o){1&i&&(d(0,"div",0),T(1,"span")(2,"span")(3,"span"),u())},
      styles:[".typing-indicator[_ngcontent-%COMP%]{display:flex!important}
               .typing-indicator[_ngcontent-%COMP%]   span[_ngcontent-%COMP%]{height:3px;width:3px;
                 float:left;margin:0 1px;background-color:#9e9ea1;display:block;
                 border-radius:50%;opacity:.4}
               …:nth-of-type(1){animation:1.5s …_blink infinite .3333s}
               @keyframes _ngcontent-%COMP%_blink{50%{opacity:1}}"]

    Nothing was invented. `TypingIndicatorDots.svelte` transcribes it, scoped, because Svelte's
    scoped block is what Angular's `_ngcontent-%COMP%` is.
  */
  it.each([
    ['the main column', () => chat],
    ['the extra column', () => extra]
  ])('%s mounts the dots between the count and the names', (_label, source) => {
    const code = codeOf(source());
    /*
      Position is part of the transcription: consts 58-61 put the dots BETWEEN the `users-count`
      strong and the `users-typing` span, so a component rendered in the right container but the
      wrong order is still not the capture.
    */
    const count = code.indexOf('class="users-count me-1"');
    const dots = code.indexOf('<TypingIndicatorDots />');
    const names = code.indexOf('class="users-typing"');
    expect(count, 'the count is drawn').toBeGreaterThan(-1);
    expect(dots, 'the dots are drawn').toBeGreaterThan(count);
    expect(names, 'the names follow the dots').toBeGreaterThan(dots);
  });

  it('transcribes the capture s own styles array rather than a lookalike', () => {
    /*
      Every value here is read from the bundle, and each one is the kind a hand-written animation
      would get almost right: the resting opacity, the grey, and three delays that are thirds of a
      1.5s cycle rather than round numbers.
    */
    const dots = readFileSync(
      new URL('./components/TypingIndicatorDots.svelte', import.meta.url),
      'utf8'
    );
    expect(dots).toContain(
      '<div class="typing-indicator"><span></span><span></span><span></span></div>'
    );
    expect(dots).toContain('display: flex !important;');
    expect(dots).toContain('background-color: #9e9ea1;');
    expect(dots).toContain('opacity: 0.4;');
    expect(dots).toContain('animation: 1.5s blink infinite 0.3333s;');
    expect(dots).toContain('animation: 1.5s blink infinite 0.6666s;');
    expect(dots).toContain('animation: 1.5s blink infinite 0.9999s;');
    /* The one line the capture does not have, and it is marked as ours at the code. */
    expect(dots).toContain('@media (prefers-reduced-motion: reduce)');
  });

  it('counts from the list rather than carrying a second field', () => {
    for (const source of [chat, extra]) {
      expect(codeOf(source)).toContain('{typists.length}');
      expect(codeOf(source)).toContain("{typists.join(',')}");
    }
  });
});
