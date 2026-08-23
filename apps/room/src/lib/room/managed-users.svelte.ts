import type { FollowChatStyle, ManagedChatUser, ModalTargetUser } from '#lib/types.js';

/** The two lists this module owns, and the two `localStorage` keys they are stored under. */
export type ManagedListName = 'mutedUsers' | 'followedUsers';

/**
 * The two per-viewer chat lists — muted and followed — and nothing else.
 *
 * ## Why this is its own module
 *
 * Extracted out of `RoomUserActions` on 2026-08-23, when wiring `test-follow-sound` put that file
 * at 814 lines against a ceiling of 775. The owner's ruling was extraction, which is what the
 * ratchet's own failure message asks for — *"extract a slice into a module or component rather than
 * raising this number"* — and what the Phase 5 plan says in so many words: if a slice lands over its
 * projection the answer is another extraction, never a shortened comment and never a raised ceiling.
 *
 * It is a real seam rather than a convenient cut. Everything here is **local to the viewer**: these
 * two lists never reach the server, never appear in a room setting, and survive a reload only
 * because `localStorage` holds them. Every other thing `RoomUserActions` does ends in a command to
 * the server. That is the line, and it is the same one the reference draws — upstream reaches these
 * through `appService.addUserToList` / `removeUserFromList` with a list name, not through the
 * admin-command path that carries `sendServerAdminCommand`.
 *
 * ## `$state.raw`, deliberately
 *
 * Both fields are replaced wholesale on every change — the methods below build a `next` object and
 * assign it — and never mutated in place. A deep proxy would therefore cost a proxy on every read
 * and buy nothing. This is the case the project standard names explicitly.
 *
 * ## The reference's own shape, kept
 *
 * `followedUsers` entries carry a `followChatStyle`; `mutedUsers` entries do not. Upstream's
 * `doFollowUser` stores `{userXrefID, _id, nick, emailHash, pic, followChatStyle}` keyed by
 * `emailHash`, and `app-muted-users-modal` reads its list as `Object.values(globals.mutedUsers)`
 * and unmutes with `removeUserFromList(emailHash, 'mutedUsers')`. Both are keyed by `emailHash`,
 * not by user id, and that matters: a duplicate login shares an `emailHash`, so muting one instance
 * mutes the person — which is the behaviour `kickDuplicates` also relies on.
 */
export class RoomManagedUsers {
  #mutedUsers: Record<string, ManagedChatUser>;
  #followedUsers: Record<string, ManagedChatUser>;

  readonly #defaultFollowStyle: () => FollowChatStyle;

  constructor(defaultFollowStyle: () => FollowChatStyle) {
    this.#defaultFollowStyle = defaultFollowStyle;
    this.#mutedUsers = $state.raw<Record<string, ManagedChatUser>>({});
    this.#followedUsers = $state.raw<Record<string, ManagedChatUser>>({});
  }

  get mutedUsers() {
    return this.#mutedUsers;
  }

  get followedUsers() {
    return this.#followedUsers;
  }

  /** True when this viewer is following that person, by `emailHash`. */
  isFollowed(emailHash: string) {
    return Boolean(this.#followedUsers[emailHash]);
  }

  /** True when this viewer has muted that person, by `emailHash`. */
  isMuted(emailHash: string) {
    return Boolean(this.#mutedUsers[emailHash]);
  }

  /**
   * Reads one list back out of `localStorage`, and refuses to throw.
   *
   * Every unhappy path returns an empty object rather than propagating: no `localStorage` (SSR), no
   * stored value, unparseable JSON, or a value that parsed to something that is not an object. A
   * corrupted entry costs this viewer their list, which is recoverable; letting it throw would cost
   * them the room.
   */
  #readManaged(key: ManagedListName) {
    if (typeof localStorage === 'undefined') return {};
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return {};
      const parsed = JSON.parse(stored);
      return parsed && typeof parsed === 'object'
        ? (parsed as Record<string, ManagedChatUser>)
        : {};
    } catch {
      return {};
    }
  }

  #storeManaged(key: ManagedListName, users: Record<string, ManagedChatUser>) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(users));
    }
  }

  /** Called once on mount. Both lists come back, or both come back empty. */
  load() {
    this.#mutedUsers = this.#readManaged('mutedUsers');
    this.#followedUsers = this.#readManaged('followedUsers');
  }

  applyFollowToggle(user: ModalTargetUser) {
    const next = { ...this.#followedUsers };
    if (next[user.emailHash]) {
      delete next[user.emailHash];
    } else {
      next[user.emailHash] = {
        nick: user.nick,
        emailHash: user.emailHash,
        pic: user.pic,
        userXrefID: user.userXrefID,
        _id: user._id,
        followChatStyle: this.#defaultFollowStyle()
      };
    }
    this.#followedUsers = next;
    this.#storeManaged('followedUsers', next);
  }

  /**
   * Saves the per-follower chat styling.
   *
   * Returns silently when the person is not followed, which is not a swallowed error: the styling
   * pane is reachable while the confirm dialog for unfollowing is open, so a save can genuinely
   * arrive for someone who has just been removed. Re-adding them here would resurrect a list entry
   * the viewer had just deleted.
   */
  applyFollowStyle(user: ModalTargetUser, style: FollowChatStyle) {
    const existing = this.#followedUsers[user.emailHash];
    if (!existing) return;
    const next = {
      ...this.#followedUsers,
      [user.emailHash]: {
        ...existing,
        followChatStyle: { ...style }
      }
    };
    this.#followedUsers = next;
    this.#storeManaged('followedUsers', next);
  }

  /**
   * NOTE THE ASYMMETRY, WHICH IS ORIGINAL AND NOT A TRANSCRIPTION SLIP.
   *
   * A muted entry stores `nick`, `emailHash` and `pic` and **no `userXrefID` and no `_id`**, while a
   * followed entry stores both. That is what the pre-extraction code did and it is kept byte for
   * byte. `openManagedInfo` depends on it: it refuses with *"User is not logged in."* precisely when
   * those two fields are absent, so a muted entry cannot open a user-info modal and a followed one
   * can. Adding the ids here would look like tidying and would silently change that behaviour.
   */
  applyMuteToggle(user: ModalTargetUser) {
    const next = { ...this.#mutedUsers };
    if (next[user.emailHash]) {
      delete next[user.emailHash];
    } else {
      next[user.emailHash] = {
        nick: user.nick,
        emailHash: user.emailHash,
        pic: user.pic
      };
    }
    this.#mutedUsers = next;
    this.#storeManaged('mutedUsers', next);
  }

  /** Removes one entry from the named list. Used by the two "manage list" modals. */
  remove(list: ManagedListName, emailHash: string) {
    const next = { ...(list === 'mutedUsers' ? this.#mutedUsers : this.#followedUsers) };
    delete next[emailHash];
    if (list === 'mutedUsers') this.#mutedUsers = next;
    else this.#followedUsers = next;
    this.#storeManaged(list, next);
  }
}
