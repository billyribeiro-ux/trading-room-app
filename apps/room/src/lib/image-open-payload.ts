import type { ImageOpenPayload, MessageActionEvent } from './types';

/**
 * `MSB-03` — narrows a message-action payload to the "an image was clicked" case.
 *
 * ## Why this is a module and not a method or a field on `types.ts`
 *
 * `types.ts` is types only, by practice rather than by decree: `isChatTab` and `CHAT_TABS` left it
 * for `chat-tabs.ts` when the question they answered got harder, and `authorization-contract.test.ts`
 * records that move. A runtime guard added back into it would be the first value export in the file
 * and would pull every type-only importer into a real import at build time.
 *
 * ## Why it is a guard at all, rather than `payload instanceof MouseEvent`
 *
 * That is what the code it replaces did, and the shape is the reason the bug was possible: an
 * `instanceof` check answers *did a click arrive?* when the question the handler needs answered is
 * *which image?* The event alone cannot say — upstream never asks it to, because `urlwrapImg`
 * writes the URL into each container's own handler as it builds it
 * (`onclick="openImageModal(event,'${a}')"`, bundle byte 1,326,195).
 *
 * ## The check, and what it deliberately does not do
 *
 * Structural, on the two fields the payload has. A `MouseEvent` carries neither; `TradeCopyPayload`
 * has `text`; `MessageReactionPayload` has `key` and `emoji`. So the three siblings in the union are
 * separated by the presence of `url` alone, and `event` is checked too because the caller that
 * supplies one without the other is exactly the caller this is defending against.
 *
 * It does NOT validate the URL. The value is the `src` this room has already rendered into an
 * `<img>` — the segment parser's output or an alert's stored attachment — so a scheme check here
 * would be a second, weaker copy of a decision made further up, and the one place that matters is
 * `RoomModals.openImage`'s popped-out window, which is where any sanitising belongs.
 */
export function isImageOpenPayload(payload: MessageActionEvent): payload is ImageOpenPayload {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'url' in payload &&
    typeof payload.url === 'string' &&
    'event' in payload
  );
}
