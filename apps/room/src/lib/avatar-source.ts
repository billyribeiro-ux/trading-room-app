/**
 * WHERE AN AVATAR CAME FROM — the one question this room can ask that the reference does not.
 *
 * ## The reference asks a field this room does not have
 *
 * `O(4, e.appService.globals.preferences.profilePic ? 5 : 4)` — the avatar menu's two states,
 * decided by whether `preferences.profilePic` is empty. Emptiness there means "never set", so
 * upstream reads the ABSENCE of a picture directly.
 *
 * This room has no such field. `avatar_url` is `text('avatar_url').notNull()` and
 * `removeProfilePicture` writes `gravatarUrl(email)` into it rather than clearing it, so a member
 * who has removed their picture holds a URL, not a null. There is nothing empty to test.
 *
 * So "is it a gravatar" is the SAME question asked of the value this room actually stores, and it is
 * the ONLY signal available — worth stating here rather than leaving the next reader to rediscover
 * it from `server/connection.ts`.
 *
 * ## Why this is a module, and not four lines in the component
 *
 * It arrived as a local function in `ModalHost.svelte` beside `gravatarAtSize`, which asked the same
 * question to decide whether it could rewrite a URL's `s` parameter. That rewrite turned out to BE a
 * divergence — the reference emits `pic` verbatim (byte 2,095,604) — and deleting it left this
 * predicate as the only reader of the argument above, inside a six-thousand-line component where
 * nothing could reach it without a mount.
 *
 * It is pure, it is the whole of one concept, and it is now testable directly. That is the
 * extraction `source-size-contract.test.ts` asks for rather than a raised ceiling.
 */
export function isGravatar(url: string) {
  /*
    `new URL` THROWS on a relative path, and `/avatar.svg` is the column's own default — every
    account created before `connection.ts` began upgrading avatars holds exactly that. So the catch
    is the answer for a real stored value, not defensive padding: a relative path is not a gravatar.
  */
  try {
    return new URL(url).hostname === 'secure.gravatar.com';
  } catch {
    return false;
  }
}
