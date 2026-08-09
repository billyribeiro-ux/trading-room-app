export const ROOM_SCROLLER_BOTTOM_TOLERANCE_PX = 20;
export const ROOM_SCROLLER_REPEAT_DELAY_MS = 200;

type RoomScrollerViewport = Pick<HTMLElement, 'offsetHeight' | 'scrollHeight' | 'scrollTop'>;

export function isRoomScrollerReadingHistory(scroller: RoomScrollerViewport) {
  return (
    scroller.scrollHeight - scroller.scrollTop >
    scroller.offsetHeight + ROOM_SCROLLER_BOTTOM_TOLERANCE_PX
  );
}

export function shouldAutoScrollForMessage(
  isReadingHistory: boolean,
  senderId: number | undefined,
  connectedUserId: number
) {
  return !isReadingHistory || senderId === connectedUserId;
}

export function scrollRoomScrollerToBottom(
  scroller: RoomScrollerViewport
): ReturnType<typeof globalThis.setTimeout>;
export function scrollRoomScrollerToBottom<Timer>(
  scroller: RoomScrollerViewport,
  schedule: (callback: () => void, delay: number) => Timer
): Timer;
export function scrollRoomScrollerToBottom(
  scroller: RoomScrollerViewport,
  schedule: (callback: () => void, delay: number) => unknown = globalThis.setTimeout
) {
  scroller.scrollTop = scroller.scrollHeight;

  return schedule(() => {
    scroller.scrollTop = scroller.scrollHeight;
  }, ROOM_SCROLLER_REPEAT_DELAY_MS);
}
