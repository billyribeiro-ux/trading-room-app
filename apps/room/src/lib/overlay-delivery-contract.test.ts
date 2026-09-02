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

describe('OVL-07 — the Q&A notice REPEATS, once per entry the viewer owns', () => {
  /*
    Read whole at bundle bytes 1,408,880-1,410,100:

      const f = s.isA ? "answer" : "question";
      for (let _ of o.qa)
        _.uid === globals.user.userXrefID && ( …sound…, !l && alertPopup && info(…), … );
      globals.user.isPresenter && ( …the SAME body again, outside the loop… );

    This room resolved the audience ONCE — "have I asked on this alert, or am I a presenter" — and
    delivered one notice. The two agree for a member with one question and diverge sharply otherwise:
    a viewer with N of their own entries gets N notices, and a PRESENTER with N gets N + 1.

    That amplification is upstream's and reproducing it is matching. It is asserted here rather than
    left to the comment because the obvious "tidy-up" is to collapse the two arms into one delivery,
    which reads like a bug fix and is a divergence.
  */
  it('delivers once per entry the viewer owns, in a loop over the alert’s questions', () => {
    const at = overlays.indexOf('function deliverQaNotice(');
    expect(at, 'deliverQaNotice is gone').toBeGreaterThan(-1);
    const end = overlays.indexOf('\n  }', at);
    expect(end, 'deliverQaNotice is unterminated').toBeGreaterThan(at);
    const body = overlays.slice(at, end);
    expect(body).toContain('for (const other of data.alertQuestions)');
    expect(body).toContain('other.senderId === data.user.id) deliverOnce();');
  });

  it('and AGAIN for a presenter, outside that loop, which is the N + 1', () => {
    const at = overlays.indexOf('function deliverQaNotice(');
    const end = overlays.indexOf('\n  }', at);
    const body = overlays.slice(at, end);
    expect(body).toContain('if (isPresenter) deliverOnce();');
    /*
      The two guards must stay SEPARATE. The single-delivery form this replaced tested them together
      — `if (!isPresenter && !askedOnThisAlert) return;` — and collapsing back to that is the change
      this assertion exists to catch.
    */
    expect(body, 'the two arms were collapsed back into one audience test').not.toContain(
      '!isPresenter && !askedOnThisAlert'
    );
  });
});

describe('OVL-05 — the lightbox describes the image the way the capture does', () => {
  /*
    ## THIS ROW WAS BUILT FROM THE WRONG UPSTREAM FUNCTION, and reversed on 2026-09-02

    It cited `showImagePreview` at byte 1,992,730:

    ```js
    message: `… <img src="${e}" class="img-fluid" alt="${e}" /> …`
    ```

    That IS a real viewer and its `alt` IS the url — but it is the ALERT PANES' preview. The dialog
    this component renders is `openImageModal`, declared at `deployed-index.html:70`, and its `alt`
    is the basename:

    ```js
    var imageName = url.substring(url.lastIndexOf('/') + 1);
    message: '<img src="' + url + '" alt="' + imageName + '" /><hr>…'      // index lines 106-116
    ```

    The room had it right and it was changed to the wrong one — "a preference substituted for a
    captured value" was the reason given, and the basename was the captured value.

    ## The supporting argument was upstream's own disagreement

    The other half of the reason was that the basename *"disagreed with its own other renderer of
    the same image, `RoomModals.showImage`, which writes `alt="${url}"` into the popped-out window"*.
    True — and the popped-out window is `openImageModal`'s OWN shift/alt/ctrl branch, ten lines above
    the dialog in the same function, and it really does use the whole url there:

    ```js
    <img src="${url}" alt="${url}" />                                       // index line 104
    ```

    So the reference describes one image two ways depending on which gesture opened it. The
    inconsistency is upstream's, both halves are transcribed, and the third assertion below — which
    was written to prove the room disagreed with itself — is kept, because it now pins the half that
    was always right.
  */
  it('passes the FILENAME as the alt text, which is what the dialog does', () => {
    expect(lightbox).toContain('alt={imageName}');
    expect(lightbox).toContain("url.substring(url.lastIndexOf('/') + 1)");
  });

  it('and the caller does not compute one, because the component does', () => {
    expect(overlays, 'a second basename rule appeared in the caller').not.toContain('lastIndexOf');
  });

  it('while the POPPED-OUT window keeps the whole url, which is the same function’s other arm', () => {
    const modals = read('./room/modals.svelte.ts');
    expect(modals).toContain('<img src="${url}" alt="${url}" />');
  });
});
