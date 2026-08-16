import { browser } from '$app/env';

/**
 * bootbox.confirm(), as the reference uses it.
 *
 * The reference is an AngularJS app that guards its destructive actions with
 * bootbox — a thin imperative wrapper over a Bootstrap 3 modal. Clicking
 * "Remove" on an admin user does NOT submit a form or reload the page; it pops
 *
 *   <div class="modal-content">
 *     <div class="modal-body">
 *       <button type="button" class="bootbox-close-button close" …>×</button>
 *       <div class="bootbox-body">Remove admin user "…"? This cannot be undone.</div>
 *     </div>
 *     <div class="modal-footer">
 *       <button data-bb-handler="cancel"  type="button" class="btn btn-default">Cancel</button>
 *       <button data-bb-handler="confirm" type="button" class="btn btn-primary">OK</button>
 *     </div>
 *   </div>
 *
 * and only acts once OK is pressed.
 *
 * bootbox's API is imperative and promise-shaped at the call site, so this
 * module holds the single in-flight request as reactive state and `Bootbox.svelte`
 * renders it. Runes work in `.svelte.ts` modules, and the state is never
 * exported directly — only through the getter below — because a reassigned
 * `$state` export cannot be tracked across module boundaries.
 */
interface PendingBase {
  /** 'confirm' has no header and puts the × in the body; 'prompt' has a header
   *  with an h4.modal-title and a text control in the body. Both are captured. */
  /** The email-list prompt is a textarea; the image-badge prompt is text. */
  inputType: 'text' | 'textarea';
  /** confirm: the body copy. prompt: the modal-title. */
  message: string;
  /** the reference's confirm button always reads "OK"; kept configurable for other call sites */
  okLabel: string;
  /**
   * What the prompt's control starts with. Empty for every caller until the badge dark-theme
   * setter, whose captured dialog seeds its input with the current value:
   * `'<input type="text" value="' + darkThemeID + '" id="darkThemeID" class="form-control"/>'`
   * (`app.min.js` byte 202828). Confirms ignore it — they have no control to seed.
   */
  value: string;
}

interface ConfirmPending extends PendingBase {
  kind: 'confirm';
  resolve: (ok: boolean) => void;
}

interface PromptPending extends PendingBase {
  kind: 'prompt';
  resolve: (value: string | null) => void;
}

type Pending = ConfirmPending | PromptPending;

let pending = $state<Pending | null>(null);

function dismissPending() {
  const open = pending;
  pending = null;
  if (open?.kind === 'prompt') open.resolve(null);
  else open?.resolve(false);
}

function requireBrowser() {
  if (!browser) throw new Error('Bootbox may only be opened from a browser interaction.');
}

export const bootbox = {
  get current() {
    return pending;
  },

  /**
   * Resolves true when the user presses OK, false for Cancel, Escape, the ×,
   * or a click on the backdrop — all four of which bootbox treats as a dismiss.
   *
   * bootbox has no queue: opening a second confirm while one is up replaces it.
   * The displaced one resolves false so its caller never hangs.
   */
  confirm(message: string, okLabel = 'OK'): Promise<boolean> {
    requireBrowser();
    dismissPending();
    return new Promise<boolean>((resolve) => {
      pending = {
        kind: 'confirm',
        inputType: 'text',
        message,
        okLabel,
        value: '',
        resolve
      };
    });
  },

  /**
   * `bootbox.prompt` — the textarea variant, as "Actions With the Email List"
   * uses it. Resolves the entered text, or null if it was dismissed, so a caller
   * can tell "cancelled" from "submitted empty".
   */
  prompt(
    title: string,
    okLabel = 'OK',
    inputType: 'text' | 'textarea' = 'textarea',
    value = ''
  ): Promise<string | null> {
    requireBrowser();
    dismissPending();
    return new Promise<string | null>((resolve) => {
      pending = {
        kind: 'prompt',
        inputType,
        message: title,
        okLabel,
        value,
        resolve
      };
    });
  },

  settle(ok: boolean | string | null) {
    requireBrowser();
    const open = pending;
    pending = null;
    if (!open) return;
    if (open.kind === 'prompt') open.resolve(typeof ok === 'string' ? ok : null);
    else open.resolve(ok === true);
  }
};
