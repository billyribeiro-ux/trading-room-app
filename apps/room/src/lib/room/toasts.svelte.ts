import type { ToastNotice } from '#lib/toast.js';

/*
  The room's toast queue — `alertService` in the capture, which is ngx-toastr.

  THE FIRST SLICE OF PHASE 5, and the first extraction in this repository that moves BEHAVIOUR
  rather than declarations. Phase 1 put eight state classes in this directory and moved 584 lines,
  because what moved was the fields while 248 function bodies stayed in `+page.svelte`. This class
  is the other shape: the state and every function that operates on it, leaving together.

  ## Why this one first

  It is the smallest region with a real boundary, and it has NO dependencies — no preferences, no
  `data`, no server call, nothing but the browser. That makes it the honest place to prove the
  pattern before a slice that touches forty declarations and four components. `PrivateChatPanel`
  was chosen first in Phase 2 for the same reason.

  ## Mechanism, not policy — and that IS the boundary

  The phase plan filed `deliverAlert` and `deliverQaNotice` under this slice. They are deliberately
  NOT here, and the reason is worth stating because it is the line this class is drawn on: those two
  decide WHO is told and with WHICH sound, reading `doNotDisturbOn`, `alertSoundOn`, `nonTradeSound`,
  `alertPopup`, `longerAlertPopup` and `qaSoundOn`. That is policy, it belongs with the preferences
  it reads, and those preferences are still on the page until the third slice. Moving it now would
  mean six constructor thunks that all get rewritten two commits later.

  So: this class owns the QUEUE and the browser notification. It knows how to show a thing and when
  to take it away. It has no opinion about whether a thing should be shown, which is why nothing in
  here reads a preference.

  ## `$state.raw`, and the MOVE that deliberately deferred it for one commit

  The array qualifies for `$state.raw` on this repository's own rule — it is only ever REPLACED,
  never mutated in place. Both writers reassign (`filter` on the way out, spread on the way in), and
  `ToastHost.svelte` reads `id`/`kind`/`title`/`message`/`enableHtml` and mutates none of them, which
  was checked rather than assumed.

  It stayed `$state` through THIS slice, because the slice is a MOVE. A move plus an optimisation is
  two changes in one commit, and when the pair breaks something there is no way to tell which one did
  it — the same reasoning that kept the Files pane out of the `PresentationArea` extraction. `S2`
  then made that one-word change against the evidence recorded above: `#notices` is read on every
  render of the toast host and replaced on every add and every expiry, so the proxy was pure cost.
*/
export class RoomToasts {
  #notices = $state.raw<ToastNotice[]>([]);
  /*
    A plain counter, not `$state`: it is the id source and nothing renders from it. Making it
    reactive would add a dependency to every reader of the list and change no pixel.
  */
  #sequence = 0;
  /*
    Timer handles, keyed by the id they will dismiss. A plain `Map` for the same reason — nothing
    renders from a timer handle.

    `svelte-autofixer` SUGGESTS `SvelteMap` here and the suggestion is declined, recorded so nobody
    re-litigates it on the next run. `SvelteMap` exists to make READS reactive — iterating it, or
    calling `has`/`get`/`size`, re-runs an effect when the map changes. Nothing reads this map from a
    template or a derived; it is written by `#scheduleRemoval`, read by `#clearTimer` and drained by
    `destroy`, all of them plain imperative code. Converting it would add a signal per entry and
    change no pixel, which is the same trade the owner already ruled on for the room's eight
    copy-on-write `new Set()` sites.
  */
  readonly #timers = new Map<number, ReturnType<typeof globalThis.setTimeout>>();

  /** What `ToastHost` renders, newest first. */
  get notices(): ToastNotice[] {
    return this.#notices;
  }

  #clearTimer(id: number) {
    const timer = this.#timers.get(id);
    if (timer !== undefined) globalThis.clearTimeout(timer);
    this.#timers.delete(id);
  }

  #scheduleRemoval(id: number, timeOut: number) {
    this.#clearTimer(id);
    this.#timers.set(
      id,
      globalThis.setTimeout(() => {
        this.dismiss(id);
      }, timeOut)
    );
  }

  /**
   * @param timeOut milliseconds, or **0 for a toast that never expires** — toastr's
   *   `disableTimeOut: true`. The media reconnect toasts use it: a banner that says "reconnecting"
   *   must not clear itself while the thing is still disconnected.
   * @returns the id, so a sticky toast can be cleared by whatever raised it. `null` when the notice
   *   was a duplicate and nothing was added.
   */
  show(notice: Omit<ToastNotice, 'id'>, timeOut = 5_000): number | null {
    const duplicate = this.#notices.some(
      (toast) => toast.title === notice.title && toast.message === notice.message
    );
    if (duplicate) return null;

    const id = ++this.#sequence;
    this.#notices = [{ id, ...notice }, ...this.#notices];
    if (timeOut > 0) this.#scheduleRemoval(id, timeOut);
    return id;
  }

  dismiss(id: number) {
    this.#clearTimer(id);
    this.#notices = this.#notices.filter((toast) => toast.id !== id);
  }

  /** Hovering holds a toast open — the timer is dropped, not paused. */
  stick(id: number) {
    this.#clearTimer(id);
  }

  /*
    Leaving gives it a second, not the remainder of its original five. That is toastr's own
    behaviour and it is why this is a fresh `1_000` rather than a stored deadline: a toast the
    reader has already looked at does not need showing again for as long as one they have not.

    Guarded on the toast still existing, because a pointer can leave an element that was dismissed
    by the click that moved it — without the guard that schedules a timer against an id that is
    already gone, and the map grows by one entry per stray mouseleave.
  */
  resume(id: number) {
    if (this.#notices.some((toast) => toast.id === id)) this.#scheduleRemoval(id, 1_000);
  }

  info(message: string) {
    this.show({ kind: 'info', message, enableHtml: false });
  }

  dismissMatching(fragment: string) {
    for (const toast of this.#notices) {
      if (toast.message.includes(fragment)) this.dismiss(toast.id);
    }
  }

  #decodeHtmlEntities(value: string) {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
  }

  /**
   * The OS-level notification that rides alongside an alert or a mention toast.
   *
   * Separate from {@link show} because it is a different surface with a different permission model:
   * a toast always appears, a notification appears only if the browser has been allowed to make
   * one, and the request itself can be refused. A caller that wants both asks for both.
   */
  notify(title: string, message: string, icon: string | null | undefined, emailHash: string) {
    if (!('Notification' in window)) return;

    void Notification.requestPermission()
      .then((permission) => {
        if (permission !== 'granted' && permission !== 'default') {
          console.log('User blocked notifications.');
          return;
        }
        /*
          NO ICON when neither an explicit one nor an email hash is given, and the empty string is
          what made that a real case rather than a defensive one.

          Both original callers name a person, so a gravatar fallback is right for them — a mention
          and a private message both have a sender whose picture the reader recognises. `stopRecMsg`
          (2026-09-01) has no sender: it is the SERVER saying a recording stopped, and upstream's
          `new Notification(i.data, {body: i.data})` sets no icon at all. Building
          `avatar/?d=mm&s=50` from an empty hash would put a mystery-man silhouette on a message
          about a recording, which is a face the reference never shows and one that would read as a
          person having said something.
        */
        const notificationIcon =
          icon || (emailHash ? `https://secure.gravatar.com/avatar/${emailHash}?d=mm&s=50` : '');
        new Notification(title, {
          body: this.#decodeHtmlEntities(message),
          ...(notificationIcon ? { icon: notificationIcon } : {})
        });
      })
      .catch((error: unknown) => {
        console.error(error);
      });
  }

  /**
   * Every pending timer, dropped when the room unmounts.
   *
   * The list itself needs no clearing — it goes with the component. What outlives it is a
   * `setTimeout` holding a closure over this instance, and a five-second one fired after teardown
   * is a write to state nothing is rendering.
   */
  destroy() {
    for (const timer of this.#timers.values()) globalThis.clearTimeout(timer);
    this.#timers.clear();
  }
}
