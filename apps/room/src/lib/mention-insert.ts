/**
 * `doMention` / `doMentionExtra` / `doQAMention` — ONE insert, three composers.
 *
 * The reference writes the same two lines at each of the three receivers:
 *
 * ```js
 * let i = $('#textAreaQATxt').val().toString();
 * i.length ? $('#textAreaQATxt').val(i + ' @' + e + ' ') : $('#textAreaQATxt').val('@' + e + ' ')
 * ```
 *
 * (bundle byte 2,334,700 for the Q&A thread; the main and extra columns carry the identical pair).
 *
 * A leading space ONLY when something is already typed, and a trailing space always so the next word
 * does not run into the name. Both details are easy to get subtly wrong, and the wrong version looks
 * right until somebody mentions two people in a row.
 *
 * Extracted 2026-08-28, when the Q&A thread's menu started acting and this would have become the
 * THIRD copy. `RoomChat.mention` held two of them and they already agreed; the point of moving it is
 * that they cannot stop agreeing.
 */
export function appendMention(current: string, name: string): string {
  return `${current}${current ? ' ' : ''}@${name} `;
}
