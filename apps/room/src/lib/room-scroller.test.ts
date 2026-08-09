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
