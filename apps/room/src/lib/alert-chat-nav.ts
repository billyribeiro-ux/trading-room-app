/**
 * Two measurements about the alerts column's navbar that are easy to get wrong by reading one node.
 *
 * Both were found by decoding `app-alerts`' template at byte 2,055,851 against its own consts table
 * at 2,052,335, rather than by looking up the const a row named. They live in a module because each
 * is an argument about the BUNDLE, and an argument about the bundle that sits in markup gets
 * re-indented, re-wrapped and eventually re-summarised until it stops being checkable.
 */

/**
 * `ACA-03` — the poll indicator classes belong to the `<a>`, not to its `<li>`.
 *
 * ```js
 * function P2e(t,n){ if(1&t){ const e=Y();
 *     d(0,"li",11)(1,"a",23), x("click", () => g().doPollUI()),
 *       T(2,"i",24), v(3," Poll"), u()(),
 *     d(4,"li",25)(5,"a",23), x("click", () => g().doPostAlertUI()),
 *       T(6,"i",26), v(7," Post Alert"), u()() }
 *   if(2&t){ const e=g();
 *     m(), Tt("poll-active-blink",  e.pollIsActive && !e.pollIsMinimized)
 *            ("poll-active-indicator", e.pollIsMinimized) } }        // byte 2,041,385
 *
 * 11 [1,"nav-item","mx-2"]   23 [3,"click"]   25 [1,"nav-item","mr-2"]
 * ```
 *
 * `Tt` is Angular's `classProp` and it writes to whichever node the update block has SELECTED. An
 * Ivy update block starts at index 0 and `m(n)` advances by `n`, so the bare `m()` moves from the
 * `<li>` at index 0 to the `<a>` at index 1. That arithmetic is not assumed: the same file's `Bge`
 * puts its first `z(…)` pair on node 0 with no `m()` at all and its next on node 4 after `m(4)`,
 * which is `d(4,"a",10)` — the kebab. One convention, two independent readings.
 *
 * The second half of the proof is the const table. Const 11 is `[1,"nav-item","mx-2"]` — a class
 * list with no `3,` binding section of any kind — so the `<li>` cannot change class at runtime,
 * whatever the update block selects.
 *
 * **Why it is visible.** Both rules paint the anchor's own box, and the NON-presenter poll entry a
 * few nodes later already wears one of them statically on its `<a>`: const 27 is
 * `[1,"poll-active-blink",2,"cursor","pointer",3,"click"]`. So this room drew the same indicator on
 * the anchor for a viewer and on the anchor's parent for a presenter — one control with two
 * geometries, differing by the `<li>`'s `mx-2` margin.
 *
 * Returned as clsx's object form rather than a string, because that is the shape `Tt` has: two
 * independent conditions on one node, neither of which knows about the other.
 */
export function pollNavAnchorClasses(
  pollIsActive: boolean,
  pollIsMinimized: boolean
): Record<string, boolean> {
  return {
    'poll-active-blink': pollIsActive && !pollIsMinimized,
    'poll-active-indicator': pollIsMinimized
  };
}

/**
 * `ACA-04` — the webinar-mode block's fourth node, MEASURED AND REFUSED.
 *
 * Both compiled copies close that block with an element that carries nothing at all:
 *
 * ```js
 * function e0e(t,n){ 1&t && ( d(0,"div",24), v(1," Webinar Mode "),
 *   d(2,"span",56), T(3,"i",57), u(), T(4,"i"), u() ) }        // app-chat,       byte 1,424,607
 * function Z3e(t,n){ 1&t && ( … identical … ) }                 // app-extra-chat, byte 2,371,066
 * ```
 *
 * `T(4,"i")` passes NO const index — not an empty one, none — so the element has no class, no
 * attribute, no text and no binding. Nothing in this repository's stylesheets can select it: there
 * is no bare `i` rule in `app.css`, none in `captured-runtime-components.css`, and none in the
 * reference's own `styles.ee2a710065b60389.css`. It renders zero pixels and announces nothing.
 *
 * Emitting it would be markup with no consumer, which is the first defect `CLAUDE.md` names. This
 * is the same test `app-typing-indicator-dots` failed eight nodes below — three empty spans whose
 * whole appearance is a stylesheet nobody here has — and that `blinkingRec` passed. Recorded as a
 * measurement rather than left out silently, so the next byte-for-byte comparison finds the reason
 * instead of the hole.
 *
 * A `const`, and exported, because a refusal nothing imports is a refusal nobody can see: the
 * contract test asserts against this value, so deleting the note breaks the test that guards it.
 */
export const WEBINAR_MODE_TRAILING_ICON_REFUSED =
  'T(4,"i") at bytes 1,424,607 and 2,371,066 carries no const index, no class and no text; no ' +
  'stylesheet in this repository or in the reference selects a bare <i>.';
