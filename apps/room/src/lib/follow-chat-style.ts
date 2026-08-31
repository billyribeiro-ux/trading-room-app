import type { FollowChatStyle } from '#lib/types.js';

/**
 * The follow-chat STYLE editor — `#user-modal`'s body when the target is already followed.
 *
 * `FollowChatStylePane.svelte` renders it; this module holds its props and the one rule that is not
 * a transcription. It is `vTe` in the capture (byte 2,068,821), and the whole pane was read end to
 * end for FCS-1: consts 100 through 126 of `app-user-info-modal`, bracket-walked BY VALUE out of
 * that component's own table (`consts:[` at byte 2,087,748, 131 entries), against the template's
 * nodes 0-48. Everything matched — the five field rows, `[1,"py-2"]` at const 12 for the root,
 * `["title","Chat Color Mode",1,"pb-2"]` at 102, `G2e=(t,n,e)=>({"background-color":t,color:n,
 * "font-size":e})` for the preview's three properties, `TB=t=>({color:t})` for the two colour-only
 * ones, and `[1,"fw-bold"]` at 120 (UIM-16, whose citation of byte 2,070,269 lands four bytes into
 * `d(36,"strong",120)`, which actually begins at 2,070,265).
 *
 * ## Why the props are `$bindable` and this file only types them
 *
 * Every input in the pane is `bind:value={style.x}`, which MUTATES the object the parent owns.
 * Svelte's own guidance is explicit — mutation through a normal prop is "strongly discouraged" and
 * warns at runtime when it detects a component writing to state it does not own — so the prop is
 * declared `$bindable()` and `ModalHost` binds. The alternative, an `onchange` per field, would be
 * five callbacks and a copy of the object for no gain.
 *
 * It moved out of `ModalHost.svelte` on 2026-08-29 because the Admin Notes list took that file 27
 * lines past its ceiling, and the ratchet's answer to that is to extract rather than to raise. The
 * markup is the same markup, re-indented, so the extraction cannot have changed what the panel
 * renders. This module is the second half of the same instruction, applied to the pane itself.
 */
export interface FollowChatStylePaneProps {
  style: FollowChatStyle;
  /** Back to the room's defaults. The parent owns what "default" means; this only asks. */
  onreset: () => void;
  onsave: () => void;
  /** `test-follow-sound` — plays the pling, and is disabled while the sound is off. */
  ontestsound: () => void;
}

/**
 * FCS-1 — what the Text Size box is allowed to write, and why `bind:value` was not allowed to.
 *
 * ## The defect, measured end to end
 *
 * `bind:value` on `<input type="number">` does not write a string and does not refuse: Svelte
 * coerces through `to_number`, and `to_number` is
 * `node_modules/svelte/src/internal/client/dom/elements/bindings/input.js:287-289` —
 * `value === '' ? null : +value`. **Emptying the box therefore assigns `null`** to a field
 * `lib/types.ts:59` declares `fontSize: number`. TypeScript cannot see it; `svelte-check` is silent;
 * the type is simply a lie from that keystroke onward.
 *
 * What that `null` does is not a missing style. `lib/message-styles.ts` interpolates it three times
 * for every message from that followed member:
 *
 * ```ts
 * :120  `color: ${usernameColor}; font-size: ${fontSize}px;`      // "nullpx" — invalid, dropped
 * :123  `color: ${usernameColor}; font-size: ${fontSize + 1}px;`  // null + 1 === 1  →  1px
 * :126  `color: ${usernameColor}; font-size: ${fontSize - 2}px;`  // -2px — invalid, dropped
 * ```
 *
 * Line 123 is the username line, and `null + 1` is `1` in JavaScript rather than `NaN`. So the box
 * does not fail loud and it does not fail closed: **a presenter who clears the Text Size field and
 * presses Save changes renders that member's name at one pixel**, on every message they post, until
 * somebody notices and types a number back. `ModalHost.svelte:3338` persists the object as it
 * stands, so the `null` survives into `followedUsers` and outlives the modal.
 *
 * ## Why this is a DELIBERATE DIVERGENCE and not a missing behaviour
 *
 * The reference has the same hole. Const 113 is
 * `["type","number","name","follow-chat-text-size","value","followChatStyle.fontSize","id",
 * "follow-chat-text-size",1,"form-check-input",3,"ngModelChange","ngModel"]` — a two-way `ngModel`
 * with no `min`, no `max` and no validator, and Angular's number-value accessor writes `null` for an
 * empty box exactly as Svelte does. Matching it here would reproduce the defect, which is the one
 * case this repository's vocabulary has a word for.
 *
 * ## The rule, and what it deliberately does not do
 *
 * Keep the last good value. Nothing is clamped to a taste and no maximum is invented: the only
 * values refused are the ones CSS itself cannot use — a non-number, and anything at or below zero,
 * since `font-size` takes a NON-NEGATIVE length and zero would put the username line back at 1px
 * through the same `+ 1`. A half-typed "1" on the way to "18" is a legal 1px for one keystroke,
 * which is what a live preview is for.
 */
export function nextFollowChatFontSize(raw: string, current: number): number {
  const parsed = Number(raw);
  if (raw.trim() === '' || !Number.isFinite(parsed) || parsed <= 0) return current;
  return parsed;
}
