import { createHash } from 'node:crypto';

/**
 * The reference's `gravatar-src-once="user.email"` — the avatar every user row leads with.
 *
 * ```html
 * <img gravatar-src-once="user.email " style="margin-right:5px " class="thumb24 "
 *      src="https://secure.gravatar.com/avatar/[GRAVATAR_MD5_A]?size=80&default=mm">
 * ```
 *
 * The hash above is REDACTED to `[GRAVATAR_MD5_A]`, the same placeholder the captured evidence uses
 * (`evidence-dumps/room-login/room-login-file`, asserted by `verify-privacy-boundary.mjs`). The real
 * digest was the MD5 of a real member's address: not reversible, but a stable cross-site identifier,
 * which is exactly what the paragraph below warns about. Reproducing it in shipped source to
 * illustrate a URL SHAPE would have been the one thing this module tells you not to do.
 *
 * Gravatar keys on the MD5 of the lowercased, trimmed address. MD5 is not a security choice here
 * and is not ours to change: it is the lookup key Gravatar defines, and any other digest returns
 * the fallback for every member.
 *
 * ## The trade-off, stated once
 *
 * Requesting this URL tells Automattic that the hash of a given email was viewed, from the
 * operator's IP, at that moment. The hash is not reversible, but it IS a stable identifier — the
 * same address produces the same hash everywhere, so it can be correlated across any site that
 * does this, and short or common addresses fall to a dictionary. The owner has asked for the
 * reference's behaviour, and this is the reference's behaviour.
 *
 * `default=mm` is the reference's own parameter: the neutral "mystery person" silhouette, returned
 * when the address has no Gravatar account. So a member who has never heard of Gravatar still gets
 * a placeholder, and no request reveals whether they have an account.
 */
export function gravatarUrl(email: string, size = 80): string {
  const normalised = email.trim().toLowerCase();
  if (!normalised) return '';
  const hash = createHash('md5').update(normalised).digest('hex');
  return `https://secure.gravatar.com/avatar/${hash}?size=${size}&default=mm`;
}
