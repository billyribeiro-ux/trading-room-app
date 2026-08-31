import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from '#lib/source-comments.js';

/**
 * `OVL-01` … `OVL-04` — what the OVERLAY LAYER tells a member, and the four ways it was wrong.
 *
 * ## Source assertions, and the reason is the one `connection-overlay-contract.test.ts` gives
 *
 * `RoomOverlays.svelte` hosts `ModalHost`, which takes eighty-five props; rendering it needs a whole
 * room. What can regress in these four rows is a GATE and an ORDERING, and both are source. Every
 * file below is read through `codeOf`, so this file's own citations cannot satisfy its assertions —
 * three contract tests in this repository have quoted the very line they claimed was gone.
 *
 * ## OVL-03 is the one to read first: a rule that had two implementations, and the wrong one rang
 *
 * `RoomOverlays.svelte` carried a `chatArrivals` tracker and this claim above it:
 *
 * > app-chat plays `pling` for an incoming chat message under exactly this gate:
 * > `preferences.doNotDisturbOn || (preferences.chatSoundOn && soundEffectsService.pling.play())`
 *
 * **No such gate exists.** All eight `pling.play()` sites in the 2,891,205-byte bundle were read on
 * 2026-08-31 — 1,218,923, 1,431,259, 1,431,911, 2,075,972, 2,207,439, 2,377,691, 2,378,343,
 * 2,506,579 — and the two in `app-chat`'s `chatMsg` handler are:
 *
 * * **1,431,259**, inside `e.isMention && (…)`: the MENTION ring, under `chatSoundOn` alone.
 * * **1,431,911**, the ordinary-message branch, which is a three-way choice and not a bare ring:
 *   a followed sender with `followChatStyle.playSound` gets `pling`, a sender on
 *   `playChatMessageSoundFor` or a room with `sessData.dingOnNewMessage` gets `followed`, and
 *   everything else is SILENT.
 *
 * That second rule is already transcribed, in `#lib/chat-arrival-sound.ts`, and already wired, on
 * the SSE arrival in `room/events.svelte.ts`. So the effect in `RoomOverlays` was a second copy
 * layered on the first: upstream's silent case rang on every message, and upstream's ringing case
 * rang twice. Removing the second copy is the fix; the mention ring moves to the mention effect,
 * which is where the bundle puts it.
 *
 * ## Why the negative controls matter more than usual here
 *
 * Three of these four assertions are about something being ABSENT or being ORDERED, and both shapes
 * pass vacuously when the anchor moves. Each block below therefore asserts its anchor found before
 * asserting anything about it — the `slice-anchor-contract` lesson, applied to `indexOf`.
 */

const read = (name: string) => {
  const source = readFileSync(new URL(name, import.meta.url), 'utf8');
  return codeOf(name, source);
};

const overlays = read('./components/RoomOverlays.svelte');
const lightbox = read('./components/ImageLightbox.svelte');

describe('OVL-01 — the reconnect flash is a tick THEN a sentence', () => {
  /*
    ```js
    d(8,"div",10), T(9,"i",11), v(10," Conected\n"), u()               // byte 2,547,023
    10  ["id","connectedMsg",1,"notConnectedOverlay","animated","fadeIn"]
    11  [1,"fas","fa-check"]
    ```

    `T` is `ɵɵelement` and `v` is `ɵɵtext`. Two children, in that order, and the text opens with the
    space that separates them.
  */
  const flash = () => {
    const at = overlays.indexOf('id="connectedMsg"');
    expect(at, 'the success flash is gone or its id changed').toBeGreaterThan(-1);
    const end = overlays.indexOf('</div>', at);
    expect(end, 'the flash element never closes').toBeGreaterThan(at);
    return overlays.slice(at, end);
  };

  it('renders the tick before the text', () => {
    const body = flash();
    const icon = body.indexOf('fa-check');
    const text = body.indexOf('Conected');
    expect(icon, 'the tick must be there').toBeGreaterThan(-1);
    expect(text, 'and the sentence').toBeGreaterThan(-1);
    expect(icon, 'the capture puts the icon FIRST — T(9,"i",11) then v(10)').toBeLessThan(text);
  });

  it('carries the capture s own text node, spaces and typo intact', () => {
    /*
      THE TEXT NODE, extracted and compared — not searched for.

      The first draft of this asserted the element did not contain "Connected", to pin upstream's
      one-n spelling. It failed on its own subject: the element's CLASS is `notConnectedOverlay`,
      which contains "Connected", so the assertion was answered by a word that has nothing to do
      with the text node. That is the same defect this repository has already found twice — a
      substring match answering with a longer neighbour — and the repair is the same one: read the
      thing itself rather than asking whether the file mentions it.

      Svelte folds whitespace at element boundaries, so the leading space survives only as an
      expression; `v(10," Conected\n")` is what is being reproduced, `\n` included.
    */
    const literal = /\{'([^']*)'\}/.exec(flash());
    expect(literal, 'the flash no longer carries a text expression at all').not.toBeNull();
    expect(literal![1]).toBe(' Conected\\n');
  });
});

describe('OVL-02 — the Q&A notice is gated on the room having bought Q&A', () => {
  /*
    ```js
    if ("alerts" != this.logType || !this.appService.globals.sessData.hasQAOnAlerts) return;
                                                                        // byte 1,408,794
    ```

    Everything the handler does after that line — the toast, the `qaAlert` sound, and `unreadQA`
    itself — is unreachable in a room without the entitlement.
  */
  const effect = () => {
    const at = overlays.indexOf('const questions = data.alertQuestions;');
    expect(at, 'the Q&A effect is gone or was renamed').toBeGreaterThan(-1);
    const end = overlays.indexOf('unreadQaAlertIds.delete', at);
    expect(end, 'the effect no longer ends where it did').toBeGreaterThan(at);
    return overlays.slice(at, end);
  };

  it('refuses before it reads a single arrival', () => {
    const body = effect();
    const gate = body.indexOf('if (!messageChrome.hasQaOnAlerts) return;');
    const firstArrival = body.indexOf('qaArrivals.fresh(');
    expect(gate, 'the entitlement gate is missing').toBeGreaterThan(-1);
    expect(firstArrival, 'the arrival loop is missing').toBeGreaterThan(-1);
    expect(gate, 'a gate after the loop is not a gate').toBeLessThan(firstArrival);
  });

  it('takes the unread MARKER with it, not just the toast', () => {
    /*
      `unreadQA = !0` is set further down the SAME handler, past the return. So a room without the
      entitlement flashes nothing either — and the marker is what the flash reads.
    */
    const body = effect();
    const gate = body.indexOf('hasQaOnAlerts');
    const add = body.indexOf('unreadQaAlertIds.add(');
    expect(add, 'the marker is no longer set here').toBeGreaterThan(-1);
    expect(gate).toBeLessThan(add);
  });

  it('reads the entitlement from the chrome rather than re-deriving it', () => {
    /*
      `buildMessageChrome` resolves `hasQAOnAlerts === true` once for the whole page and three
      components already read the answer. A second `data.sessData?.hasQAOnAlerts` here would be a
      second answer to one question, which is what `room-message-chrome.ts` exists to prevent.
    */
    expect(overlays).not.toContain('sessData?.hasQAOnAlerts');
    const chrome = readFileSync(new URL('./room-message-chrome.ts', import.meta.url), 'utf8');
    expect(chrome, 'the chrome must still carry it').toContain(
      'hasQaOnAlerts: settings?.hasQAOnAlerts === true'
    );
  });
});

describe('OVL-03 — the per-message chat ding has exactly one implementation', () => {
  it('is NOT in the overlay layer', () => {
    /*
      The whole tracker went with it: nothing else read `chatArrivals`, so leaving it would have
      left a marker set growing per message for a reader that no longer exists.
    */
    expect(overlays, 'the second copy of the ding is back').not.toContain('chatArrivals');
    expect(overlays, 'and so is the tracker that fed it').not.toContain(
      'new RoomArrivals<(typeof data.messages)[number]>()'
    );
  });

  it('is in the module that transcribes the reference s three-way rule', () => {
    /*
      The positive control. An assertion that only says "not here" is satisfied by deleting the
      feature, and a chat room that never dings is not a fix.
    */
    const rule = read('./chat-arrival-sound.ts');
    expect(rule).toContain('if (input.followedSenderPlaysSound) return');
    expect(rule).toContain('input.dingOnNewMessage');
    const events = read('./room/events.svelte.ts');
    expect(events, 'and it is called on the SSE arrival').toContain('arrivalSoundFor({');
  });
});

describe('OVL-04 — a mention rings, and the popup preference does not silence it', () => {
  /*
    ```js
    preferences.doNotDisturbOn || (
      preferences.chatSoundOn && soundEffectsService.pling.play(),          // byte 1,431,259
      preferences.chatPopup && (alertService.info(e.txt, "Mention from @" + e.n, {enableHtml:!0}),
                                window.Notification && Notification.requestPermission()…))
    ```

    Two SIBLING gates under one Do Not Disturb. This effect returned on `chatPopup` before reaching
    either, so a member who had switched the popup off was told nothing at all when named.
  */
  const effect = () => {
    const at = overlays.indexOf('mentionArrivals.fresh(data.messages)');
    expect(at, 'the mention effect is gone or was renamed').toBeGreaterThan(-1);
    const end = overlays.indexOf('toasts.notify(title', at);
    expect(end, 'the mention effect no longer ends where it did').toBeGreaterThan(at);
    return overlays.slice(at, end);
  };

  it('rings under chatSoundOn', () => {
    const body = effect();
    expect(body).toContain("if (prefs.chatSoundOn) playSoundEffect('pling');");
  });

  it('rings BEFORE the popup preference is consulted', () => {
    const body = effect();
    const ring = body.indexOf("playSoundEffect('pling')");
    const popup = body.indexOf('if (!prefs.chatPopup) return;');
    expect(ring, 'the ring is missing').toBeGreaterThan(-1);
    expect(popup, 'the popup gate is missing').toBeGreaterThan(-1);
    expect(popup, 'chatPopup must gate the toast only').toBeGreaterThan(ring);
  });

  it('and Do Not Disturb still silences both', () => {
    const body = effect();
    const dnd = body.indexOf('if (prefs.doNotDisturbOn) return;');
    const ring = body.indexOf("playSoundEffect('pling')");
    expect(dnd, 'the outer gate is missing').toBeGreaterThan(-1);
    expect(dnd).toBeLessThan(ring);
  });

  it('rings once for a batch rather than once per mention', () => {
    /*
      Ours, and stated as ours at the code: upstream handles one frame at a time, and `data.messages`
      reaches this component as a page. The `for` loop must therefore start AFTER the ring.
    */
    const body = effect();
    const ring = body.indexOf("playSoundEffect('pling')");
    const loop = body.indexOf('for (const item of mentions)');
    expect(loop, 'the toast loop is missing').toBeGreaterThan(-1);
    expect(loop).toBeGreaterThan(ring);
  });
});

describe('OVL-05 — the lightbox describes the image the way the capture does', () => {
  /*
    ```js
    message: `… <img src="${e}" class="img-fluid" alt="${e}" /> …`         // byte 1,992,730
    ```

    `alt` IS the url. This room computed a basename instead — a preference substituted for a
    captured value — and disagreed with its own other renderer of the same image, `RoomModals.showImage`,
    which writes `alt="${url}"` into the popped-out window.
  */
  it('passes the whole url as the alt text', () => {
    expect(lightbox).toContain('alt={url}');
  });

  it('no longer trims it to a filename', () => {
    expect(lightbox).not.toContain('lastIndexOf');
    expect(overlays, 'and the caller does not do it either').not.toContain('lastIndexOf');
  });

  it('agrees with the popped-out window, which was the second answer', () => {
    const modals = read('./room/modals.svelte.ts');
    expect(modals).toContain('<img src="${url}" alt="${url}" />');
  });
});
