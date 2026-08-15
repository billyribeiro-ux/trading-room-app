import { isHttpError } from '@sveltejs/kit';

/**
 * The sentence to show when a remote command rejects.
 *
 * Eleven call sites reach for this shape now, and it was written out at each of them. The rule is
 * not obvious enough to retype: a command's refusal is an `HttpError` whose `body` is the app's
 * `App.Error`, so the SERVER's wording — the rate-limit retry seconds, the captured
 * "Chatting with yourself again?", the "That file is not a sound." — lives on `cause.body.message`.
 * Anything else that lands here is a transport failure and has no sentence worth showing a user.
 *
 * @param fallback what to say when the rejection is not the server refusing — a dropped connection,
 *        an aborted navigation. Deliberately NOT `cause.message`: that is a browser's own wording
 *        about sockets, and putting it in a dialog tells the user nothing they can act on.
 */
export function refusalMessage(cause: unknown, fallback: string): string {
  return isHttpError(cause) ? cause.body.message : fallback;
}

/**
 * The same, but naming the transport failure — for the one caller that wants it.
 *
 * `doFileListUpload` collects a line per failed file across a whole queue, so "network error" for
 * three different files in a row is less use than the browser's own reason for each. That is a
 * genuine exception to the rule above rather than an inconsistency, which is why it is a second
 * function with its own name instead of a flag on the first.
 */
export function refusalOrTransportMessage(cause: unknown, fallback: string): string {
  if (isHttpError(cause)) return cause.body.message;
  return cause instanceof Error ? cause.message : fallback;
}
