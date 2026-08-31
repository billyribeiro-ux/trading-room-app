import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { svelteCodeOf } from '#lib/source-comments.js';

/**
 * The three arrival deliveries, and the gates that decide whether a member is interrupted.
 *
 * ## Why this test exists, and what it is standing in for
 *
 * `RoomArrivals` has its own unit test and two negative controls. Those prove the ALGORITHM. They
 * proved nothing about whether `+page.svelte` still uses it, and that gap was measured rather than
 * suspected: with the whole suite at 1,862 assertions, both of these edits left it entirely GREEN —
 *
 * ```
 *   .some((message) => message.senderId !== data.user.id)  ->  .some(() => true)
 *       // the chat ding now pings you for your own messages
 *   const unseenAlerts = alertArrivals.fresh(data.alerts)  ->  = data.alerts
 *       // every load re-toasts and re-sounds every alert in the room
 * ```
 *
 * Both are things a member HEARS. Neither is reachable from a unit test, because the effects that
 * carry them live in a page that cannot be mounted — `AlertChatArea` is one of the two components
 * still to be extracted, and until it is, source text is the only instrument there is.
 *
 * ## The rule this file obeys
 *
 * Every slice asserts it was FOUND before asserting anything about its contents. A guard that
 * `indexOf`s a marker, gets -1, and then tests the empty string passes for the wrong reason — that
 * has happened twice in this repository, most recently four hours after it was predicted.
 */
const pageSource = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
/*
  ALL THREE DELIVERIES MOVED TO `RoomOverlays.svelte` on 2026-08-17 (Phase 5, S3).

  They are `$effect`s, and Svelte's docs place an effect in the component that owns the side effect
  rather than in a class: *"if `$state` and `$derived` are used directly inside the `$effect` (for
  example, during creation of a reactive class), those values will not be treated as dependencies"*.
  For these three that would mean the alert toast, the Q&A toast and the chat ding all ignoring a
  Do Not Disturb toggle. The side effect is a toast and a sound; `RoomOverlays` renders the host.

  `pageSource` is still read, and the reason is the whole lesson of this file. Re-pointing a guard at
  the file the code moved to makes it pass. Asserting the OLD file no longer carries it is what
  proves a MOVE rather than a COPY — and a copy here is not a cosmetic defect: two chat-ding effects
  ring twice per message, and every positive assertion below stays green while it happens.
*/
const overlaysSource = readFileSync(
  new URL('./components/RoomOverlays.svelte', import.meta.url),
  'utf8'
);

/*
  ── AND THE THIRD DELIVERY LEFT AGAIN ON 2026-08-31, because it was never the reference's ────────

  This file asserted a `chatArrivals` tracker and a per-message `pling` in `RoomOverlays.svelte`,
  under the comment *"which is what the captured app is careful not to do"*. That claim was read
  against the bundle on 2026-08-31 and it is false: **the captured app does not ring for an ordinary
  chat message at all** unless one of three conditions holds. All eight `pling.play()` sites were
  read — 1,218,923, 1,431,259, 1,431,911, 2,075,972, 2,207,439, 2,377,691, 2,378,343, 2,506,579 —
  and `app-chat`'s `chatMsg` handler has exactly two:

  * **1,431,259**, inside `e.isMention && (…)`: the MENTION ring, under `chatSoundOn` alone.
  * **1,431,911**, the ordinary branch, which is a three-way choice and not a bare ring — a followed
    sender with `followChatStyle.playSound` gets `pling`, a sender on `playChatMessageSoundFor` or a
    room with `sessData.dingOnNewMessage` gets `followed`, and everything else is SILENT.

  That second rule was ALREADY transcribed, in `#lib/chat-arrival-sound.ts`, and ALREADY wired, on
  the SSE arrival in `room/events.svelte.ts`, where the sender's hash is in hand. So the effect this
  file pinned was a second copy layered on the correct one — the exact defect the paragraph above
  warns about (*"two chat-ding effects ring twice per message"*), shipped and then pinned. It is the
  reason a source assertion has to be checked against the bytes it claims to reproduce and not only
  against the code it currently matches.

  The two SURVIVING deliveries are unchanged and still asserted below. What replaces the third is
  two assertions: that the ordinary ding lives in exactly one place, and that the MENTION ring —
  which is genuinely `RoomOverlays`', because the mention popup is — obeys the reference's nesting.

  Row `OVL-03` in `docs/decoded/room-surface-audit-2026-08-30.md`;
  `overlay-delivery-contract.test.ts` carries the per-assertion detail.
*/
const eventsSource = readFileSync(new URL('./room/events.svelte.ts', import.meta.url), 'utf8');
const arrivalSoundSource = readFileSync(
  new URL('./chat-arrival-sound.ts', import.meta.url),
  'utf8'
);

/** The body between a marker and the closing of the effect that contains it. */
function effectContaining(marker: string): string {
  const at = overlaysSource.indexOf(marker);
  // The positive assertion, made before anything is read out of the slice.
  expect(
    at,
    `'${marker}' is not in RoomOverlays.svelte; this guard has nothing to test`
  ).toBeGreaterThan(-1);
  const opened = overlaysSource.lastIndexOf('$effect(() => {', at);
  expect(opened, `'${marker}' is not inside an $effect`).toBeGreaterThan(-1);
  const closed = overlaysSource.indexOf('\n  });', at);
  expect(closed, `the $effect holding '${marker}' is not closed`).toBeGreaterThan(at);
  return overlaysSource.slice(opened, closed);
}

describe('the three arrival deliveries', () => {
  it('routes both remaining lists through RoomArrivals, and there are exactly two', () => {
    const constructed = overlaysSource.match(/new RoomArrivals</g) ?? [];

    // Positive first: both instances are found, by name, before anything is asserted absent.
    expect(overlaysSource).toContain('const alertArrivals = new RoomArrivals<');
    expect(overlaysSource).toContain('const qaArrivals = new RoomArrivals<');
    /*
      TWO, not three. The third was `chatArrivals`, feeding a per-message ding that duplicated
      `room/events.svelte.ts`'s and got the rule wrong besides — see the note above the reader. The
      count is the assertion: a third tracker appearing here is either that defect returning or a
      new delivery nobody has argued for.
    */
    expect(constructed).toHaveLength(2);
    /*
      COMMENTS STRIPPED for this one, because it is a NEGATIVE assertion and the file's own note
      explaining why the tracker went names it. A negative read against raw text is answered by the
      paragraph that says the thing is absent — the failure `source-comments.ts` exists for.
    */
    expect(svelteCodeOf(overlaysSource), 'the duplicated chat ding is back').not.toContain(
      'chatArrivals'
    );

    /*
      AND NOWHERE ELSE. A tracker left behind on the page keeps its own marker, so the page and the
      overlay layer would each independently decide a message was "new" — two toasts, two dings, and
      three green assertions above.
    */
    expect(pageSource, 'the arrival trackers left the page in S3').not.toContain(
      'new RoomArrivals<'
    );
    expect(pageSource, 'the arrival trackers left the page in S3').not.toContain(
      'new RoomOrderedArrivals<'
    );
  });

  it('holds one marker set per list, so one table cannot silence another', () => {
    /*
      Alert 7, question 7 and message 7 are three different rows. A single shared instance would let
      whichever arrived first swallow the other two — silently, and only for ids that collide, which
      is the kind of defect that reproduces once a month and never on demand.
    */
    expect(overlaysSource).toContain('alertArrivals.fresh(');
    expect(overlaysSource).toContain('qaArrivals.fresh(');
    expect(overlaysSource).toContain('mentionArrivals.fresh(data.messages)');
  });

  it('never pings you for your own chat message, in the ONE place that decides it', () => {
    /*
      The rule survives the move; only its address changed. `room/events.svelte.ts` drops the
      viewer's own echo before the ding is even considered — upstream compares email hashes, the id
      compare is this room's equivalent — and then asks `arrivalSoundFor`, which is the reference's
      three-way choice and the only copy of it.
    */
    expect(eventsSource).toContain(
      'if (payload.data?.senderId === this.#session().user.id) return;'
    );
    expect(eventsSource).toContain('const sound = arrivalSoundFor({');
    expect(arrivalSoundSource).toContain("if (input.followedSenderPlaysSound) return 'pling';");
    expect(arrivalSoundSource, 'the ordinary ding is `followed`, not `pling`').toContain(
      "? 'followed' : null"
    );
  });

  it('rings ONCE for a batch of MENTIONS, not once per mention', () => {
    const ring = effectContaining('mentionArrivals.fresh(data.messages)');

    /*
      The mention ring is `RoomOverlays`' own — byte 1,431,259 puts it beside the mention popup, and
      the popup is what this component renders. The batching is OURS and is stated as ours at the
      code: upstream handles `chatMsg` one frame at a time, while `data.messages` reaches this
      component as a page. So the sound is played after the whole arrival is known, and a
      `playSoundEffect` inside the loop would ring once per name.
    */
    expect(ring).toContain('const mentions = fresh.filter(');
    expect(ring).toContain('item.senderId !== data.user.id');
    const soundAt = ring.indexOf("playSoundEffect('pling')");
    const loopAt = ring.indexOf('for (const item of mentions)');
    expect(soundAt, 'the mention ring is gone').toBeGreaterThan(-1);
    expect(loopAt, 'the toast loop is gone').toBeGreaterThan(-1);
    expect(soundAt).toBeLessThan(loopAt);
  });

  it('delivers only alerts that ARRIVED, never the whole log', () => {
    const delivery = effectContaining('alertArrivals.fresh(data.alerts)');

    // The gate, and the early return that keeps a quiet five-second poll silent.
    expect(delivery).toContain('const unseenAlerts = alertArrivals.fresh(data.alerts);');
    expect(delivery).toContain('if (unseenAlerts.length === 0) return;');
    // The filter is applied at DELIVERY, not at render — a filtered-out alert makes no toast and no
    // sound, which is where the reference puts its two `continue`s.
    expect(delivery).toContain('alertPassesFilter(');
  });

  it('delivers only questions that ARRIVED, and marks their alert unread', () => {
    const delivery = effectContaining('qaArrivals.fresh(questions)');

    expect(delivery).toContain('for (const question of qaArrivals.fresh(questions))');
    expect(delivery).toContain('unreadQaAlertIds.add(question.alertId)');
    expect(delivery).toContain('deliverQaNotice(question)');
  });

  it('has no priming latch left in the page or in the overlay layer', () => {
    /*
      Paired with the positive assertions above, which is what stops this going vacuous: the three
      instances were FOUND, so these names are absent because `RoomArrivals` replaced them and not
      because the region moved somewhere this file does not read.

      BOTH files are swept as of S3. Reading only the page would have gone green the moment delivery
      left it — the latches would be "absent" from a file that no longer delivers anything, which is
      absence by relocation and is the failure this repository keeps rediscovering.
    */
    for (const latch of [
      'alertDeliveryInitialized',
      'qaNoticesPrimed',
      'chatSoundPrimed',
      'seenAlertIds',
      'seenQuestionIds',
      'seenMessageIds'
    ]) {
      expect(pageSource).not.toContain(latch);
      expect(overlaysSource).not.toContain(latch);
    }
  });
});
