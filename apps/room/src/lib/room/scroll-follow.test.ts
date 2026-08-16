import { describe, expect, it } from 'vitest';
import { RoomScrollFollow } from './scroll-follow';

/**
 * Every assertion here is about whether a reader gets moved. The failure this guards is the one
 * members actually complain about: you scroll up to read something, somebody posts, and the column
 * throws you back to the bottom mid-sentence.
 */
const VIEWER = 7;
const SOMEBODY_ELSE = 42;

/** The alerts column's shape — no channels, and no `alwaysScrollToBottom` override by construction. */
function alertsColumn() {
  return new RoomScrollFollow();
}

/** A chat column, with the viewer's override wired the way the page wires it. */
function chatColumn(alwaysScrollToBottom = () => false) {
  return new RoomScrollFollow<'room' | 'admin'>({ alwaysScrollToBottom });
}

describe('RoomScrollFollow', () => {
  it('starts a freshly opened column at the newest message', () => {
    expect(
      alertsColumn().follows({
        count: 12,
        newestSenderId: SOMEBODY_ELSE,
        viewerId: VIEWER,
        // Even claiming to be reading history: there is no history to be reading on the first view.
        readingHistory: true
      })
    ).toBe(true);
  });

  it('does not move a reader who is scrolled up when somebody else posts', () => {
    const column = alertsColumn();
    column.follows({ count: 3, newestSenderId: VIEWER, viewerId: VIEWER, readingHistory: false });

    expect(
      column.follows({
        count: 4,
        newestSenderId: SOMEBODY_ELSE,
        viewerId: VIEWER,
        readingHistory: true
      })
    ).toBe(false);
  });

  it('DOES move them for their OWN message, however far up they are', () => {
    const column = alertsColumn();
    column.follows({ count: 3, newestSenderId: VIEWER, viewerId: VIEWER, readingHistory: false });

    // The reference's own exception: `!isScrollingUp || o.uid == globals.user.uid`. You posted; you
    // are taken to what you posted.
    expect(
      column.follows({ count: 4, newestSenderId: VIEWER, viewerId: VIEWER, readingHistory: true })
    ).toBe(true);
  });

  /*
    THE NEXT TWO ISOLATE THE COUNT COMPARISON, and they did not at first.

    Both were written with `readingHistory: true`, which made them pass for the wrong reason:
    `shouldAutoScrollForMessage` refuses to move a reader who is scrolled up, so the answer was
    already false before the count was consulted. A control that changed `count > previousCount` to
    `count !== previousCount` — making a DELETION scroll the column — left both of them green.

    With `readingHistory: false` that guard returns true, so the count comparison is the only thing
    left that can decide, which is the whole point of these two.
  */
  it('stays put when a re-render brings no new message', () => {
    const column = alertsColumn();
    column.follows({ count: 9, newestSenderId: VIEWER, viewerId: VIEWER, readingHistory: false });

    // The five-second poll re-renders a quiet room every five seconds, forever.
    expect(
      column.follows({
        count: 9,
        newestSenderId: SOMEBODY_ELSE,
        viewerId: VIEWER,
        readingHistory: false
      })
    ).toBe(false);
  });

  it('does not treat a DELETION as an arrival', () => {
    const column = alertsColumn();
    column.follows({ count: 9, newestSenderId: VIEWER, viewerId: VIEWER, readingHistory: false });

    // A presenter deletes a message. The column has fewer rows than before and nothing arrived.
    expect(
      column.follows({
        count: 8,
        newestSenderId: SOMEBODY_ELSE,
        viewerId: VIEWER,
        readingHistory: false
      })
    ).toBe(false);
  });

  it('goes to the bottom on a channel switch, even for a reader deep in history', () => {
    const column = chatColumn();
    column.follows({
      count: 30,
      tab: 'room',
      newestSenderId: VIEWER,
      viewerId: VIEWER,
      readingHistory: false
    });

    expect(
      column.follows({
        count: 5,
        tab: 'admin',
        newestSenderId: SOMEBODY_ELSE,
        viewerId: VIEWER,
        readingHistory: true
      })
    ).toBe(true);
  });

  it('counts a switch as a switch and not as an arrival, so the count baseline follows the tab', () => {
    const column = chatColumn();
    column.follows({
      count: 5,
      tab: 'room',
      newestSenderId: VIEWER,
      viewerId: VIEWER,
      readingHistory: false
    });
    // Switching to a BIGGER channel: the count goes up, but that is not a message arriving.
    column.follows({
      count: 30,
      tab: 'admin',
      newestSenderId: SOMEBODY_ELSE,
      viewerId: VIEWER,
      readingHistory: true
    });

    // Back to reading history in the new channel. Nothing has arrived since the switch.
    expect(
      column.follows({
        count: 30,
        tab: 'admin',
        newestSenderId: SOMEBODY_ELSE,
        viewerId: VIEWER,
        readingHistory: true
      })
    ).toBe(false);
  });

  it("honours the viewer's alwaysScrollToBottom override on a chat column", () => {
    const column = chatColumn(() => true);
    column.follows({
      count: 3,
      tab: 'room',
      newestSenderId: VIEWER,
      viewerId: VIEWER,
      readingHistory: false
    });

    expect(
      column.follows({
        count: 4,
        tab: 'room',
        newestSenderId: SOMEBODY_ELSE,
        viewerId: VIEWER,
        readingHistory: true
      })
    ).toBe(true);
  });

  it('CANNOT be given that override on an alerts column', () => {
    /*
      `shouldAutoScrollForMessage` records the rule: the alerts scroller shares the function and must
      NOT take the override. Here it is structural — the alerts column is constructed without one, so
      there is no argument a caller could pass to change this answer.
    */
    const column = alertsColumn();
    column.follows({ count: 3, newestSenderId: VIEWER, viewerId: VIEWER, readingHistory: false });

    expect(
      column.follows({
        count: 4,
        newestSenderId: SOMEBODY_ELSE,
        viewerId: VIEWER,
        readingHistory: true
      })
    ).toBe(false);
  });

  it('reads the override at decision time, not at construction', () => {
    let always = false;
    const column = chatColumn(() => always);
    column.follows({
      count: 3,
      tab: 'room',
      newestSenderId: VIEWER,
      viewerId: VIEWER,
      readingHistory: false
    });

    // The viewer ticks the box mid-session. A value captured at construction would ignore that
    // until the room was reloaded.
    always = true;
    expect(
      column.follows({
        count: 4,
        tab: 'room',
        newestSenderId: SOMEBODY_ELSE,
        viewerId: VIEWER,
        readingHistory: true
      })
    ).toBe(true);
  });

  it('keeps two columns independent, so traffic in one does not move the other', () => {
    const main = chatColumn();
    const extra = chatColumn();
    for (const column of [main, extra]) {
      column.follows({
        count: 10,
        tab: 'room',
        newestSenderId: VIEWER,
        viewerId: VIEWER,
        readingHistory: false
      });
    }

    // A message lands in the main column while the reader is scrolled up in the extra one.
    main.follows({
      count: 11,
      tab: 'room',
      newestSenderId: SOMEBODY_ELSE,
      viewerId: VIEWER,
      readingHistory: false
    });

    expect(
      extra.follows({
        count: 10,
        tab: 'room',
        newestSenderId: SOMEBODY_ELSE,
        viewerId: VIEWER,
        readingHistory: true
      })
    ).toBe(false);
  });
});
