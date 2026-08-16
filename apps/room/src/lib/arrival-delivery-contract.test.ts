import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

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

/** The body between a marker and the closing of the effect that contains it. */
function effectContaining(marker: string): string {
  const at = pageSource.indexOf(marker);
  // The positive assertion, made before anything is read out of the slice.
  expect(at, `'${marker}' is not in +page.svelte; this guard has nothing to test`).toBeGreaterThan(
    -1
  );
  const opened = pageSource.lastIndexOf('$effect(() => {', at);
  expect(opened, `'${marker}' is not inside an $effect`).toBeGreaterThan(-1);
  const closed = pageSource.indexOf('\n  });', at);
  expect(closed, `the $effect holding '${marker}' is not closed`).toBeGreaterThan(at);
  return pageSource.slice(opened, closed);
}

describe('the three arrival deliveries', () => {
  it('routes all three lists through RoomArrivals, and there are exactly three', () => {
    const constructed = pageSource.match(/new RoomArrivals</g) ?? [];

    // Positive first: the three instances are found, by name, before anything is asserted absent.
    expect(pageSource).toContain('const alertArrivals = new RoomArrivals<');
    expect(pageSource).toContain('const qaArrivals = new RoomArrivals<');
    expect(pageSource).toContain('const chatArrivals = new RoomArrivals<');
    expect(constructed).toHaveLength(3);
  });

  it('holds one marker set per list, so one table cannot silence another', () => {
    /*
      Alert 7, question 7 and message 7 are three different rows. A single shared instance would let
      whichever arrived first swallow the other two — silently, and only for ids that collide, which
      is the kind of defect that reproduces once a month and never on demand.
    */
    expect(pageSource).toContain('alertArrivals.fresh(');
    expect(pageSource).toContain('qaArrivals.fresh(');
    expect(pageSource).toContain('chatArrivals.fresh(data.messages)');
  });

  it('never pings you for your own chat message', () => {
    const ding = effectContaining('chatArrivals.fresh(data.messages)');

    // `senderId !== data.user.id` is the whole gate. Upstream compares email hashes; the id compare
    // is this room's equivalent and is the only thing between a member and hearing themselves type.
    expect(ding).toContain('arrived.some((message) => message.senderId !== data.user.id)');
    expect(ding).toContain("playSoundEffect('pling')");
  });

  it('rings ONCE for a batch, not once per message', () => {
    const ding = effectContaining('chatArrivals.fresh(data.messages)');

    /*
      `.some(...)` collapses the whole arrival to one boolean and the sound is played after it, so
      four messages landing between two loads make one sound. A `playSoundEffect` inside the loop
      would make four, which is what the captured app is careful not to do.
    */
    expect(ding).toContain('.some(');
    const soundAt = ding.indexOf("playSoundEffect('pling')");
    const someAt = ding.indexOf('.some(');
    expect(soundAt).toBeGreaterThan(someAt);
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

  it('has no priming latch left in the page', () => {
    /*
      Paired with the positive assertions above, which is what stops this going vacuous: the three
      instances were FOUND, so these names are absent because `RoomArrivals` replaced them and not
      because the region moved somewhere this file does not read.
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
    }
  });
});
