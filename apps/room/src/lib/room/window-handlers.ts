import {
  pushToTalkShouldMute,
  pushToTalkShouldUnmute,
  shouldBlockContextMenu,
  shouldBlockCopyKey
} from '$lib/room-key-gates';

import type { RoomDialogs } from './dialogs.svelte';
import type { RoomMedia } from './media.svelte';
import type { RoomMediaTransport } from './media-transport.svelte';
import type { RoomMenus } from './menus.svelte';
import type { RoomPrefs } from './prefs.svelte';
import type { RoomSplit } from './split.svelte';

/**
 * THE WINDOW LISTENERS' bodies — click, pointer, key, contextmenu and beforeunload.
 *
 * Phase 5 slice 18. The BINDINGS stay on `<svelte:window>` in the page and that is deliberate:
 * Svelte's own best-practices doc says *"If you need to attach listeners to `window` or `document`
 * you can use `<svelte:window>` and `<svelte:document>` … Avoid using `onMount` or `$effect` for
 * this"*, so the element keeps ownership of add and remove. What moves is the hundred lines of
 * BODY and citation that were sitting inside the attribute values, where no reader looks for logic
 * and no test can reach them except as template text.
 *
 * **Five unrelated features share these listeners, and the class does not pretend otherwise.** The
 * click handler closes two different kinds of menu, `keydown` carries push-to-talk AND the copy
 * restriction AND Escape, and `beforeunload` exists only to tell a popout's opener it closed. They
 * are together because the EVENT is one, which is the reference's arrangement too — every one of
 * them is a host binding on `app-room` upstream. Splitting them by feature would put five classes
 * on one listener and lose the ordering the citations record.
 *
 * **The predicates are not re-derived here.** `pushToTalkShouldUnmute`, `shouldBlockCopyKey` and
 * `shouldBlockContextMenu` live in `$lib/room-key-gates` with their own citations and their own
 * tests; this calls them. Every authority decision — `isPresenter`, `disableCopy` — arrives as a
 * thunk from the page, which reads it from data the server owns.
 *
 * A plain `.ts`: no rune. Everything reactive belongs to the classes it is handed.
 */
export class RoomWindowHandlers {
  readonly #menus: RoomMenus;
  readonly #split: RoomSplit;
  readonly #prefs: RoomPrefs;
  readonly #media: RoomMedia;
  readonly #mediaTransport: RoomMediaTransport;
  readonly #dialogs: RoomDialogs;
  readonly #mainElement: () => HTMLElement | undefined;
  readonly #alertChatElement: () => HTMLElement | undefined;
  readonly #disableCopy: () => boolean;
  readonly #isPresenter: () => boolean;
  readonly #chatOnlyMode: () => boolean;
  readonly #selectedImageUrl: () => string | null;
  readonly #clearSelectedImage: () => void;

  constructor(options: {
    menus: RoomMenus;
    split: RoomSplit;
    prefs: RoomPrefs;
    media: RoomMedia;
    mediaTransport: RoomMediaTransport;
    dialogs: RoomDialogs;
    mainElement: () => HTMLElement | undefined;
    alertChatElement: () => HTMLElement | undefined;
    /** Server-owned: `data.sessData.disableCopy`. Never asserted by this class. */
    disableCopy: () => boolean;
    /** Server-owned: derived from `data.user.role`. */
    isPresenter: () => boolean;
    chatOnlyMode: () => boolean;
    /**
     * The lightbox is SHARED — `RoomOverlays` binds it, Escape closes it — so it crosses as a
     * reader plus a receiver rather than moving. Both halves are used here, unlike slice 22's
     * detach flag where only the write crossed.
     */
    selectedImageUrl: () => string | null;
    clearSelectedImage: () => void;
  }) {
    this.#menus = options.menus;
    this.#split = options.split;
    this.#prefs = options.prefs;
    this.#media = options.media;
    this.#mediaTransport = options.mediaTransport;
    this.#dialogs = options.dialogs;
    this.#mainElement = options.mainElement;
    this.#alertChatElement = options.alertChatElement;
    this.#disableCopy = options.disableCopy;
    this.#isPresenter = options.isPresenter;
    this.#chatOnlyMode = options.chatOnlyMode;
    this.#selectedImageUrl = options.selectedImageUrl;
    this.#clearSelectedImage = options.clearSelectedImage;
  }

  click(event: MouseEvent): void {
    const target = event.target instanceof Element ? event.target : null;
    if (!target?.closest('.textAreaBtns, .popOverDiv')) {
      this.#menus.set('emoji', false);
      this.#menus.set('giphy', false);
    }
    if (target?.closest('.dropdown')) return;
    this.#menus.closeFloating();
  }

  pointerMove(event: PointerEvent): void {
    if (this.#split.target)
      this.#split.dragTo(event, this.#mainElement(), this.#alertChatElement());
  }

  keyDown(event: KeyboardEvent): void {
    /*
    `onKeyDown` — `app-room.full.js:3011-3021`, bound as a host listener on `keydown`
    (`app-room.compiled.js:1260-1266`). Two unrelated features that share the keyboard, in the
    reference's own order: push-to-talk first, then the copy restriction.

    Both predicates live in `$lib/room-key-gates` with their citations. They run before the
    Escape handling below because that returns early on every other key, which is exactly how a
    host binding added here would go unnoticed.
  */
    if (
      pushToTalkShouldUnmute(event, {
        pushToTalk: this.#prefs.pushToTalk,
        micMuted: this.#media.micMuted
      })
    )
      void this.#mediaTransport.toggleMicrophone();
    if (
      shouldBlockCopyKey(event, {
        disableCopy: this.#disableCopy(),
        isPresenter: this.#isPresenter()
      })
    )
      event.preventDefault();

    if (event.key !== 'Escape') return;
    /*
    The emoji and GIF triggers carry ngbPopover's `autoclose: 'outside'`, and that mode
    closes on Escape as well as on an outside click - the click half was already handled
    above, this is the other half.
  */
    if (this.#menus.emoji || this.#menus.giphy) {
      this.#menus.set('emoji', false);
      this.#menus.set('giphy', false);
      return;
    }
    if (this.#selectedImageUrl()) this.#clearSelectedImage();
    else if (this.#dialogs.confirmation) this.#dialogs.confirmation = null;
    else if (this.#dialogs.prompt) this.#dialogs.prompt = null;
    else if (this.#dialogs.alert) this.#dialogs.alert = null;
  }

  keyUp(event: KeyboardEvent): void {
    /*
    `onKeyUp` — `app-room.full.js:3027-3032`, host-bound on `keyup`
    (`app-room.compiled.js:1274-1280`). The release half of push-to-talk, and the ONLY thing on
    that listener upstream: `disableCopy` has no keyup arm, because suppressing a keystroke has
    to happen on the way down.
  */
    if (
      pushToTalkShouldMute(event, {
        pushToTalk: this.#prefs.pushToTalk,
        micMuted: this.#media.micMuted
      })
    )
      void this.#mediaTransport.toggleMicrophone();
  }

  contextMenu(event: MouseEvent): void {
    /*
    `onRightClick` — `app-room.full.js:3022-3026`, host-bound on `contextmenu`
    (`app-room.compiled.js:1267-1273`). Every right-click, not merely those over the presentation
    area, and never the presenter's.

    Bound on `window` rather than `document`: the reference uses a different target resolver here
    than for the key events, and neither resolver is defined anywhere in the decoded tree, so
    which is which is not established. `contextmenu` bubbles to both, and this handler's only
    effect is `preventDefault`, so the distinction cannot change behaviour — see the note at the
    top of `$lib/room-key-gates`.
  */
    if (
      shouldBlockContextMenu({ disableCopy: this.#disableCopy(), isPresenter: this.#isPresenter() })
    )
      event.preventDefault();
  }

  beforeUnload(): void {
    /*
    The other half of the `hidePresentation` block, registered in the same statement upstream:

      (chatOnlyMode || sessData.isChatOnlyRoom) &&
        ((this.hidePresentation = !0),
         window.addEventListener('beforeunload', () => {
           window.opener.postMessage('windowClosing', window.location.origin);
         }))

    (`app-room.full.js:1903-1907`.) It is how the opener learns the popout closed: the room that
    detached the chat listens for exactly this message and calls `reatachChat` —
    `window.addEventListener("message", o => "windowClosing" === o.data && emit("reatachChat"))`
    (`:1692-1693`, transcribed in `detachAlerts` above). Without it, closing the detached window
    leaves the opener believing the pair still lives elsewhere, and the column never comes back.

    Gated on the MODE, not on `hidePresentation`: a room whose owner set `isChatOnlyRoom` is not a
    popout and has no opener to notify. `chatOnlyMode` is the `co=1` that `detachAlerts` sets, so
    it is the precise condition under which an opener exists.

    The `window.opener` guard is OURS and is a declared divergence. The reference dereferences it
    unconditionally, which is safe upstream only because `co=1` is reached exclusively through
    `detachChat`. This room can also be opened at `?co=1` by hand — a member who bookmarks the
    popout URL — and there `window.opener` is null, so the reference's line would throw a
    TypeError on every unload. The origin argument is `window.location.origin`, matching the
    reference exactly: the opener and the popout are the same origin, so this never posts
    cross-origin.
  */
    if (!this.#chatOnlyMode()) return;
    window.opener?.postMessage('windowClosing', window.location.origin);
  }
}
