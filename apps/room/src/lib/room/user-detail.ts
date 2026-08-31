import type { UserDetail } from '../user-detail-shape';
import { SvelteMap } from 'svelte/reactivity';

import type { ModalTargetUser } from '#lib/types.js';

/*
  THE TWO CELLS THE USER MODAL COULD NEVER FILL, and the one round trip that fills them.

  `ModalHost.svelte` has rendered `Last Login:` and `Email:` since it was written. `loggedIn` had NO
  producer anywhere in the room — one consumer, one optional field on `ModalTargetUser`, and nothing
  that ever assigned it — so the cell read `n/a` for everybody on every path. `email` had exactly one
  producer, `targetFor`, which reads a live ROSTER entry, so it filled for somebody standing in the
  room and read `n/a` the moment the same modal was opened from a chat message.

  `#lib/server/user-detail.ts` carries the bundle evidence for what the reference does instead: every
  `getUserInfo` call site except the roster's passes a null `socketID` and takes the
  `serverInvokeUserInfoDB` branch, so the offline lookup is not a rare fallback — it is how the
  reference fills this modal everywhere except the roster.

  ## Why a class and not a call inside `RoomUserActions`

  Because the answer OUTLIVES the selection. A presenter opening one member's card, closing it,
  opening another and coming back would otherwise ask twice for something that does not change
  within a page view. Holding it here also keeps the fetch out of `get target()`, which
  `ModalHost` reads about a hundred times per render — a lookup in that getter would be a request
  per read.

  ## `.ts`, NOT `.svelte.ts`, and the gate is what said so

  It holds a `SvelteMap`, which was enough to make the first draft `user-detail.svelte.ts` — and
  `rune-module-extension-contract.test.ts` rejected it, correctly. `SvelteMap` is an ordinary class
  from `svelte/reactivity`; the extension marks a module that uses RUNES, and a third of the
  codebase wearing it without meaning it is how the marker stops carrying information. There is no
  rune here.

  ## SvelteKit already dedupes; this is not a second cache of the same thing

  A remote `query` is keyed on its serialized argument and deduped by the framework, but the cache is
  released "once nothing is using it" — and nothing here holds the query, because the consumer is a
  plain `ModalTargetUser` object the modal reads synchronously. So this holds the RESULT, and
  `#asked` is what stops a second request, not a second copy of SvelteKit's cache.
*/

/* Declared once, in `#lib/user-detail-shape.ts`, and imported by the server end as well. */
export type { UserDetail };

export class RoomUserDetail {
  /**
   * Successful lookups only, by user id.
   *
   * `SvelteMap` because the modal is on screen while the request is in flight: the presenter clicks,
   * the card opens with the name and avatar it already had, and the two cells fill when the answer
   * lands. A plain `Map` would resolve and change nothing. It holds only successes, so `.get`
   * returning nothing means exactly "no addition to make" and never "asked and refused".
   */
  readonly #known = new SvelteMap<number, UserDetail>();

  /**
   * Every id already asked about, whatever the answer.
   *
   * ## `SvelteSet` was suggested by the autofixer and DECLINED
   *
   * `RoomFiles` records the same decision for a different reason — its sets are copy-on-write. This
   * one is simpler: **nothing renders from this set at all.** It is asked-or-not bookkeeping read
   * only by `hydrate`, one line below, and a `SvelteSet` would add a proxy and a reactive read for a
   * value no template can ever reach. `SvelteSet` exists to make a mutation of an already-stored set
   * publish; there is nothing subscribed here to publish TO.
   *
   * `#known` above is the opposite case and is reactive, which is what makes the pair worth reading
   * together: one is state the modal draws, the other is a note to self.
   *
   * A refusal is remembered here and never retried. That is not an oversight: the server refuses an
   * account with no standing in this room, which is a fact about the room's history rather than a
   * transient failure, so asking again on the next open would be the same question and the same no.
   */
  readonly #asked = new Set<number>();

  readonly #fetch: (userId: number) => Promise<UserDetail | null>;

  constructor(options: { fetch: (userId: number) => Promise<UserDetail | null> }) {
    this.#fetch = options.fetch;
  }

  /**
   * Ask about one account, at most once per page view.
   *
   * Fire-and-forget on purpose: the caller is a selection setter, and awaiting it there would make
   * opening a modal wait on a network round trip before the name and avatar it ALREADY HAS could be
   * drawn. The card opens immediately and fills.
   *
   * `id <= 0` is the placeholder `get target()` returns when a modal is open over nobody — see the
   * contract test on that branch. Asking about it would be a guaranteed refusal.
   */
  hydrate(userId: number): void {
    if (userId <= 0 || this.#asked.has(userId)) return;
    this.#asked.add(userId);
    void this.#fetch(userId)
      .then((detail) => {
        if (detail) this.#known.set(userId, detail);
      })
      /*
        Logged, not swallowed. A failure here leaves both cells reading `n/a`, which is exactly what
        they read before this existed — so the modal degrades to its old behaviour rather than
        breaking — but a silent `.catch(() => {})` is the shape the root standard names by name, and
        a presenter reporting "the email is blank" needs this line to be findable.
      */
      .catch((cause) => console.error('[userDetail]', cause));
  }

  /**
   * The target with whatever the server has said about it, or the target unchanged.
   *
   * Returns the SAME object when there is nothing to add, rather than a spread copy every time. This
   * is read once per `target` access and `ModalHost` accesses that about a hundred times a render.
   */
  decorate(target: ModalTargetUser): ModalTargetUser {
    const detail = this.#known.get(target.id);
    return detail ? { ...target, ...detail } : target;
  }
}
