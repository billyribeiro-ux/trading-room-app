/**
 * The two keyboard gates `app-room` carries as host bindings, and the right-click one beside them.
 *
 * `onKeyDown`, `onRightClick` and `onKeyUp` (`app-room.full.js:3011-3032`) are bound as host
 * listeners on `keydown`, `contextmenu` and `keyup` (`app-room.compiled.js:1260-1281`). Between them
 * they carry two unrelated features that happen to share the keyboard:
 *
 * - **push-to-talk**, a per-USER preference, which unmutes the mic while a key is held;
 * - **`disableCopy`**, a per-ROOM setting, which suppresses copying for everyone except the
 *   presenter.
 *
 * Both had zero occurrences in this room. `disableCopy` in particular is a content-protection
 * checkbox an owner has been able to tick on the Manage page all along, protecting nothing.
 *
 * Extracted rather than written inline for the reason `split-gutter.ts` was: these are pure
 * decisions over an event and some flags, and a decision that lives inside a 10,000-line component
 * can be read but not driven. Everything here is a predicate — the caller does the muting and the
 * `preventDefault`.
 *
 * ## A note on the listener targets, because it cannot be proven from this tree
 *
 * The reference registers `keydown` and `keyup` with one target resolver (`Cm`) and `contextmenu`
 * with a different one (`mE`). Neither symbol is defined anywhere in `docs/source/components/` —
 * they come from the Angular runtime elsewhere in the bundle — so which is `window` and which is
 * `document` is NOT established here. What is established: `Cm` is the same resolver used for
 * `onResize`, and resize is a window-only event. `contextmenu` bubbles to both, so for a handler
 * whose only effect is `preventDefault` the distinction cannot change behaviour, which is why the
 * room binds all three on `window` rather than guessing at the difference.
 */

/** The key that holds the mic open. `event.code`, with the legacy `keyCode` as the second term. */
export const PUSH_TO_TALK_CODE = 'ControlRight';
export const PUSH_TO_TALK_KEY_CODE = 17;

/**
 * The three letters `disableCopy` blocks when Ctrl is held: copy, view-source, save.
 *
 * `['c', 'u', 's']` verbatim from `app-room.full.js:3019`, compared against
 * `e.key.toLowerCase()` — so it catches Ctrl+Shift+C as well, which is the reference's behaviour
 * and not an accident of case handling.
 */
export const BLOCKED_COPY_KEYS = ['c', 'u', 's'] as const;

/** The subset of a keyboard event these gates read. */
export interface KeyGateEvent {
  readonly code?: string;
  readonly which?: number;
  readonly key: string;
  readonly ctrlKey?: boolean;
  readonly repeat?: boolean;
}

/**
 * Is this the push-to-talk key?
 *
 * `'ControlRight' === e.code || 17 == e.which` (`:3014`, `:3029`). The second term is a legacy
 * fallback and is kept: `which` is deprecated but still populated, and dropping it would silently
 * narrow the key on any browser that reports one and not the other.
 */
function isPushToTalkKey(event: KeyGateEvent): boolean {
  return event.code === PUSH_TO_TALK_CODE || event.which === PUSH_TO_TALK_KEY_CODE;
}

/**
 * Should a keydown UNMUTE the microphone? — `app-room.full.js:3012-3016`.
 *
 * ```js
 * preferences.pushToTalk && !e.repeat && ('ControlRight' === e.code || 17 == e.which)
 *   && this.mediaService.micMuted && this.toggleMic()
 * ```
 *
 * `!e.repeat` is load-bearing and easy to drop: holding a key fires keydown continuously, and
 * without it every repeat would call the mic toggle again — closing and reopening the producer
 * dozens of times a second for as long as the speaker holds the key.
 *
 * The `micMuted` term is what makes this push-to-TALK rather than a toggle: if the mic is already
 * live because the user unmuted it from the toolbar, holding the key does nothing, and — see
 * {@link pushToTalkShouldMute} — releasing it does not mute them either.
 */
export function pushToTalkShouldUnmute(
  event: KeyGateEvent,
  { pushToTalk, micMuted }: { pushToTalk: boolean; micMuted: boolean }
): boolean {
  return pushToTalk && !event.repeat && isPushToTalkKey(event) && micMuted;
}

/**
 * Should a keyup RE-MUTE the microphone? — `app-room.full.js:3028-3031`.
 *
 * ```js
 * preferences.pushToTalk && ('ControlRight' === e.code || 17 == e.which)
 *   && !this.mediaService.micMuted && this.toggleMic()
 * ```
 *
 * No `repeat` term, because keyup does not repeat. Note the asymmetry with the keydown above is
 * only apparent: `micMuted` there and `!micMuted` here are the same guard — act only if the mic is
 * in the state this gesture is supposed to change.
 */
export function pushToTalkShouldMute(
  event: KeyGateEvent,
  { pushToTalk, micMuted }: { pushToTalk: boolean; micMuted: boolean }
): boolean {
  return pushToTalk && isPushToTalkKey(event) && !micMuted;
}

/**
 * Should this keystroke be suppressed? — `app-room.full.js:3017-3020`.
 *
 * ```js
 * !isPresenter && sessData.disableCopy &&
 *   ((e.ctrlKey && ['c','u','s'].includes(e.key.toLowerCase())) || 'F12' === e.key) &&
 *   e.preventDefault()
 * ```
 *
 * `F12` is NOT behind `ctrlKey` — it is the second arm of the `||`, so devtools is blocked on its
 * own. Reading it as a third Ctrl combination is the obvious misreading and would leave F12 open.
 *
 * The presenter exemption is the reference's and is the point: this restricts the AUDIENCE.
 */
export function shouldBlockCopyKey(
  event: KeyGateEvent,
  { disableCopy, isPresenter }: { disableCopy: boolean; isPresenter: boolean }
): boolean {
  if (isPresenter || !disableCopy) return false;
  const blockedCombination =
    event.ctrlKey === true &&
    (BLOCKED_COPY_KEYS as readonly string[]).includes(event.key.toLowerCase());
  return blockedCombination || event.key === 'F12';
}

/**
 * Should the right-click menu be suppressed? — `app-room.full.js:3022-3026`.
 *
 * The same two terms as the keystroke gate and nothing else: every right-click is blocked, not
 * merely those on the presentation area.
 */
export function shouldBlockContextMenu({
  disableCopy,
  isPresenter
}: {
  disableCopy: boolean;
  isPresenter: boolean;
}): boolean {
  return !isPresenter && disableCopy;
}

/**
 * Should `document.body` carry `noselect`? — `ngAfterViewInit`, `app-room.full.js:2227-2229`.
 *
 * Identical terms again, which is why it is one function and not a fourth rule.
 *
 * The class is real and already applied here — `.noselect { user-select: none; }`,
 * `css/complete-app-styles.css:7017`, unscoped. Checked rather than assumed, because a class with no
 * rule behind it is this repository's standing example of dead scaffolding, and adding one would
 * have closed the keyboard path while leaving the text selectable by drag.
 */
export function shouldDisableSelection({
  disableCopy,
  isPresenter
}: {
  disableCopy: boolean;
  isPresenter: boolean;
}): boolean {
  return !isPresenter && disableCopy;
}
