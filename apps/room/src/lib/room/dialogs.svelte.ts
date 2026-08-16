/*
  The room's three bootbox dialogs — `bootbox.alert`, `bootbox.confirm` and `bootbox.prompt`.

  Phase 5 slice 2. Like `RoomToasts` it owns a MECHANISM and no policy: it holds which dialog is
  open and what it says, and has no opinion about when one should be. Every decision to raise one
  stays with the code that made it.

  ## Why three fields and not one

  The obvious simplification is a single `open: Dialog | null` discriminated on a `kind`. It is
  refused, and the reason is in the room's own behaviour rather than in taste: these three STACK.
  `handleUserAction` raises a prompt whose `onconfirm` raises an alert; `deleteThisPM` raises a
  confirm whose handler can raise an alert on failure. With one field the second would silently
  replace the first, and the reader would answer a prompt and watch it vanish with no result.

  The Escape handler in `+page.svelte` reads all three in a fixed order for the same reason — image
  modal, then confirmation, then prompt, then alert — which is a precedence that only exists because
  more than one can be open.

  ## Settable properties rather than `raise*` methods

  `bootboxAlert = 'text'` appears at roughly forty call sites. Those are assignments to a piece of
  state, not requests to a service, and modelling them as `dialogs.alert = 'text'` keeps them that
  way — the move stays a move, and the diff stays a rename rather than forty rewritten expressions
  each of which could go wrong on its own. `RoomMedia` already uses settable properties for exactly
  this shape (`media.connected = true`).

  `confirm()` is the one method, because it is the one that does something beyond storing a value:
  it wraps the caller's handler so the dialog closes itself before the handler runs.
*/

/** `bootbox.confirm(message, callback)` plus the two options this room passes. */
export interface RoomConfirmation {
  message: string;
  onconfirm: () => void;
  /**
   * The FALSE branch. `bootbox.confirm(msg, cb)` calls back with `false` for No and for a
   * dismissal, and not every call site treats that as "do nothing" - `getRandomUser()` picks
   * from everyone when the answer is No.
   */
  ondismiss?: () => void;
  className?: string;
}

/** `bootbox.prompt({title, value, callback})`. */
export interface RoomPrompt {
  title: string;
  value: string;
  onconfirm: (value: string) => void;
}

export class RoomDialogs {
  #alert = $state<string | null>(null);
  #confirmation = $state<RoomConfirmation | null>(null);
  /*
    `$state`, not `$state.raw`, and unlike the toast queue this one is not even a candidate: the
    object is replaced wholesale by every writer, but `BootboxDialog` binds nothing back into it, so
    there is no mutation either way. Left as the plain rune the page already used, because a move is
    a move.
  */
  #prompt = $state<RoomPrompt | null>(null);

  get alert(): string | null {
    return this.#alert;
  }

  set alert(message: string | null) {
    this.#alert = message;
  }

  get confirmation(): RoomConfirmation | null {
    return this.#confirmation;
  }

  set confirmation(next: RoomConfirmation | null) {
    this.#confirmation = next;
  }

  get prompt(): RoomPrompt | null {
    return this.#prompt;
  }

  set prompt(next: RoomPrompt | null) {
    this.#prompt = next;
  }

  /**
   * `requestModalConfirmation` — a confirm that closes itself before running the handler.
   *
   * The self-close is the whole reason this is a method rather than another assignment. Every call
   * site that built the object by hand had to remember `bootboxConfirmation = null` as the first
   * line of its own `onconfirm`, and a site that forgot it left the dialog on screen behind
   * whatever the handler did next.
   *
   * **WRAP IT, never hand it over by reference.** `onConfirm={dialogs.confirm}` type-checks
   * cleanly and then throws the first time a modal asks for a confirmation, because a class method
   * passed as a value loses `this` and the body reaches for a private field on `undefined`.
   * `svelte/$state` names the case outright — *"when calling methods in JavaScript, the value of
   * `this` matters"* — and the documented remedy is the one used at the `ModalHost` call site:
   * `onConfirm={(message, onconfirm) => dialogs.confirm(message, onconfirm)}`.
   *
   * Neither the compiler nor a text-reading contract test can see this, which is why it is written
   * down here rather than left to be rediscovered.
   */
  confirm(message: string, onconfirm: () => void) {
    this.#confirmation = {
      message,
      onconfirm: () => {
        this.#confirmation = null;
        onconfirm();
      }
    };
  }
}
