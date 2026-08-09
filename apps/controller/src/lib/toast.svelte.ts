/**
 * Brief confirmations for actions that succeed.
 *
 * ## Why this is a deliberate divergence, not a match
 *
 * The reference gives NO visible confirmation here, and that is a measured claim rather than an
 * assumption. Its manage page loads angular-toaster — `toaster.min.css` in `<head>` and
 * `toaster.min.js` at the foot of the body, with the 1.1.0 copy commented out — but there is no
 * `<toaster-container>` element anywhere in the captured DOM, and angular-toaster renders
 * exclusively into that directive. Library present, nowhere to draw. `bootbox` appears zero times
 * on that page too.
 *
 * So a save in the original fires and the page sits there. Reproducing that faithfully would be
 * bad: a success that shows nothing is indistinguishable from a control that did nothing, which is
 * exactly the report that started this — "none of the controls work" on a page whose controls all
 * worked and simply never spoke.
 *
 * Failures already speak: the manage page renders `form.message` in red. This is the other half.
 *
 * ## Why not the room's ToastHost
 *
 * That one is prop-driven and carries sticky toasts, HTML bodies and a sanitiser, because room
 * alerts are authored content. A save confirmation is a fixed string the app wrote itself, so none
 * of that applies and inheriting it would mean maintaining a sanitiser for text that can never
 * contain markup.
 */

export interface Toast {
  id: number;
  kind: 'success' | 'error';
  message: string;
}

let nextId = 1;

/**
 * `$state` on the array itself, not `$state.raw`, because entries are pushed and spliced
 * individually — the deep proxy is what makes those mutations reactive.
 */
export const toasts = $state<Toast[]>([]);

/** How long a confirmation stays. Long enough to read, short enough not to sit over the page. */
const DISMISS_AFTER_MS = 3200;

function push(kind: Toast['kind'], message: string) {
  const id = nextId++;
  toasts.push({ id, kind, message });

  /*
    Removed by id rather than by index. A second toast dismissed first would shift the array, and
    an index captured at push time would then remove the wrong one — the kind of bug that only
    appears when two saves land close together, which is exactly when it is hardest to notice.
  */
  setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
}

export function dismiss(id: number) {
  const at = toasts.findIndex((t) => t.id === id);
  if (at !== -1) toasts.splice(at, 1);
}

export const toast = {
  success: (message: string) => push('success', message),
  error: (message: string) => push('error', message)
};
