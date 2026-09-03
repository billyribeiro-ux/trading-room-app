/**
 * `openLoginLink` — the operator's own page, opened once when a member enters the room.
 *
 * ## The capture, read whole
 *
 * Bundle bytes 1,437,913 and 2,384,175, in the room component's post-login setup — the same
 * statement that reads `chatMutedTill` off the decoded token and applies `chatDisabledForTrials`:
 *
 * ```js
 * this.appService.globals.sessData.openLoginLink &&
 *   window.open(this.appService.globals.sessData.openLoginLink, "_blank",
 *               "resizable=yes,top=0,left=0,width=800,height=400")
 * ```
 *
 * The manage page calls it *"Open link on login?"* — *"If enabled, it will open the link set in this
 * setting on a new tab"*. Its help text says "tab" and its code says an 800×400 window; the code is
 * what ships, so the code is what is transcribed.
 *
 * ## The truthiness guard is the whole gate, and it is transcribed as one
 *
 * `sessData.openLoginLink && window.open(...)` — an empty string is how an operator turns this off,
 * because the manage control is a textarea and not a checkbox. There is no separate enable flag to
 * read, so a `!== undefined` or a `!= null` here would open `about:blank` for every member of every
 * room that has ever had the field focused and cleared.
 *
 * ## Three divergences, each measured and each recorded
 *
 * **1. `noopener` is added, and it follows this room's own precedent rather than being invented
 * here.** Without it the opened page holds a live `window.opener` back into the room — a navigation
 * primitive over the tab holding the session, in a multi-tenant fintech application. The identical
 * call is already made twice in this room with `noopener`: `alerts-pane.ts` (the transcript popout,
 * where the divergence is argued at length) and `RoomSidebar.svelte`'s tip button, which is the
 * closest precedent of all — an operator-supplied external URL opened in a new window with
 * `noopener,noreferrer`. Upstream passes neither. It costs the reference-facing output nothing: the
 * window opens, at that size, at that URL.
 *
 * **2. The window features are otherwise the capture's, character for character**, including
 * `resizable=yes` and the `top=0,left=0` that most browsers now ignore. They are transcribed rather
 * than trimmed for the reason `sl=1` is kept in the popout URL: a member never reads them, they
 * claim nothing, and normalising them makes the next diff against the capture harder.
 *
 * **3. A blocked popup is SILENT, and that is not a swallowed error.** `window.open` outside a user
 * gesture is refused by every current browser unless the member has allowed popups for the site,
 * and this fires on entry — nobody clicked anything. `alerts-pane.detach` DOES raise a dialog when
 * its popout is blocked, and the difference is the whole reason this is written down: there, a
 * member pressed "Detach" and is owed an answer about the thing they asked for. Here, telling
 * somebody their browser blocked a window they never requested is noise about somebody else's
 * configuration. Upstream is silent too, and for once the reference and the honest answer agree.
 *
 * ## Pure, because the interesting half is the rule
 *
 * {@link openLoginLinkTarget} is a function of its argument. The `window.open` is the caller's, one
 * line in `onMount`. Same split as `room-defaults.ts`, `iframe-breakout.ts` and `live-access.ts`.
 */

/**
 * The window features, transcribed. Exported so the contract asserts them against the capture rather
 * than against a copy of itself, and so `noopener` is visibly an addition to a captured string.
 */
export const OPEN_LOGIN_LINK_FEATURES = 'resizable=yes,top=0,left=0,width=800,height=400';

/** The same string with this room's `noopener`. See divergence 1. */
export const OPEN_LOGIN_LINK_FEATURES_WITH_NOOPENER = `${OPEN_LOGIN_LINK_FEATURES},noopener`;

/**
 * The URL to open, or `null` for "do not open one".
 *
 * `null` rather than `''`, so a caller cannot pass the empty string to `window.open` by forgetting a
 * check — `window.open('')` opens `about:blank`, which is exactly the failure the truthiness guard
 * above exists to prevent.
 *
 * Trimmed before the test, which upstream does not do. A textarea holding a single newline is
 * truthy, and upstream would open `about:blank` for it; that is a defect rather than a behaviour,
 * and reproducing it would mean a room whose members get a blank window because somebody pressed
 * Enter in a settings field. The value is otherwise passed through untouched — it is the operator's
 * URL and this module does not get to have opinions about its shape.
 */
export function openLoginLinkTarget(setting: unknown): string | null {
  if (typeof setting !== 'string') return null;
  const trimmed = setting.trim();
  return trimmed === '' ? null : trimmed;
}

export interface OpenLoginLinkDeps {
  /** `window.open`, isolated so the rule above stays pure and testable without a browser. */
  readonly open: (url: string, target: string, features: string) => void;
}

/**
 * The acting half, called once on mount.
 *
 * Returns whether it opened anything, which is what makes the "and did not open" cases assertable
 * without reaching into the caller's mock — a boolean the test reads rather than an absence it has
 * to infer.
 */
export function openLoginLink(setting: unknown, deps: OpenLoginLinkDeps): boolean {
  const target = openLoginLinkTarget(setting);
  if (target === null) return false;
  deps.open(target, '_blank', OPEN_LOGIN_LINK_FEATURES_WITH_NOOPENER);
  return true;
}
