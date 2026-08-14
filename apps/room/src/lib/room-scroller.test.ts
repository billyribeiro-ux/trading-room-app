import { describe, expect, it, vi } from 'vitest';
import {
  isRoomScrollerReadingHistory,
  ROOM_SCROLLER_BOTTOM_TOLERANCE_PX,
  ROOM_SCROLLER_REPEAT_DELAY_MS,
  scrollRoomScrollerToBottom,
  shouldAutoScrollForMessage
} from './room-scroller';

describe('captured room scroller behavior', () => {
  it('uses the captured 20px bottom tolerance', () => {
    expect(ROOM_SCROLLER_BOTTOM_TOLERANCE_PX).toBe(20);
    expect(
      isRoomScrollerReadingHistory({
        scrollHeight: 1_000,
        scrollTop: 680,
        offsetHeight: 300
      })
    ).toBe(false);
    expect(
      isRoomScrollerReadingHistory({
        scrollHeight: 1_000,
        scrollTop: 679,
        offsetHeight: 300
      })
    ).toBe(true);
  });

  it('preserves history reading except for the connected user’s own message', () => {
    expect(shouldAutoScrollForMessage(false, 42, 7)).toBe(true);
    expect(shouldAutoScrollForMessage(true, 42, 7)).toBe(false);
    expect(shouldAutoScrollForMessage(true, 7, 7)).toBe(true);
  });

  it('alwaysScrollToBottom overrides the reading-history guard, and defaults OFF', () => {
    /*
      The viewer's own override — a separate `appEventBus.subscribe('alwaysScrollToBottom', …)`
      upstream (`main.d6d3c112b59b7d0d.js` byte 1413501), fired from `chatMsg` when the message is
      on the channel being viewed. Folded in here as a third term: two subscribers, one outcome.

      The middle case is the whole point. Reading history, somebody else's message: normally FALSE,
      and the override is what makes it true. If the parameter were ignored this stays false.
    */
    expect(shouldAutoScrollForMessage(true, 42, 7, true)).toBe(true);
    expect(shouldAutoScrollForMessage(true, 42, 7, false)).toBe(false);
    // Omitted entirely — the alerts scroller shares this function and must not take the override.
    expect(shouldAutoScrollForMessage(true, 42, 7)).toBe(false);
  });

  it('scrolls immediately and repeats after the captured 200ms render delay', () => {
    const scroller = {
      scrollHeight: 1_000,
      scrollTop: 0,
      offsetHeight: 300
    };
    const callback = vi.fn();
    const schedule = vi.fn((next: () => void, delay: number) => {
      callback.mockImplementation(next);
      return 1;
    });

    scrollRoomScrollerToBottom(scroller, schedule);
    expect(scroller.scrollTop).toBe(1_000);
    expect(schedule).toHaveBeenCalledWith(expect.any(Function), ROOM_SCROLLER_REPEAT_DELAY_MS);

    scroller.scrollHeight = 1_200;
    callback();
    expect(scroller.scrollTop).toBe(1_200);
  });
});
