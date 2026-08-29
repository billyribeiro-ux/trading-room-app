/**
 * The short local time `app-st-compactmessage` shows against each row.
 *
 * That sentence arrived here WITH the code it describes, from `RoomPrivateChat.formatTime`. A
 * transcription that stays behind when its implementation moves is prose explaining the wrong
 * thing, which `orphaned-comment-contract.test.ts` catches and which it caught here.
 *
 * A MODULE FUNCTION and not a method, because two surfaces need it and neither of them should have
 * to hold a `RoomPrivateChat` to format a timestamp. `RoomPrivateChat.formatTime` delegates here so
 * the panel, the modal and the download all print the same string — three copies of a
 * `toLocaleTimeString` option bag is three chances for one of them to say 13:05.
 */
export function formatCompactTime(at: number): string {
  return new Date(at).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}
