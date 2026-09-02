/**
 * Where `app-st-message` and `app-st-compactmessage` DISAGREE — measured, in one place.
 *
 * ## Why this is a module and not six comments
 *
 * `RoomMessage.svelte` renders both of the reference's message components, because RM-01 decided
 * the seam upstream draws is the host element and its stylesheet rather than the whole renderer.
 * The consequence is that every place the two compiled copies differ lands in one file, as a
 * conditional a reader cannot check without opening the bundle. Six of those conditionals are
 * below, each with the byte that settles it.
 *
 * They are here rather than in the markup for the reason `source-size-contract.test.ts` records for
 * `message-styles.ts` and `message-body-segments.ts`: an argument about the BUNDLE that lives
 * inside markup gets re-indented, re-wrapped and eventually re-summarised until it stops being
 * checkable, and the only way to ask "what does the compact row do differently?" was to render one.
 * Every export below has a consumer in `RoomMessage.svelte` or in
 * `message-renderer-differences.test.ts`; nothing here is documentation with no reader.
 *
 * **The general lesson, and it is the expensive one.** Five of the six were found by decoding both
 * consts tables and both template functions END TO END and diffing them, not by looking up the
 * const a row named. Four are a single text literal or a single binding section — the size of
 * difference that renders, ships, and is invisible to every test that checks a class list.
 */

/**
 * `RMSG-03` — the Q&A count span's padding, which is the card's and the compact row's and NOT the
 * same.
 *
 * The `alert-qa` button is otherwise byte-identical across the two: card const 70 and compact const
 * 69 are the same eleven-entry array, the `me-1` span is `[1,"me-1"]` in both tables (card 71,
 * compact 70), and the trailing `✅` span is ` ✅` in both (`i1e` 1,339,199, `o_e` 1,377,073).
 * Exactly one literal differs:
 *
 * ```js
 * function n1e(t,n){ … Ne(" (", e.msg.qa.length, ") ") }   // CARD,    byte 1,339,094
 * function i_e(t,n){ … Ne("(",  e.msg.qa.length, ")")  }   // COMPACT, byte 1,376,970
 * ```
 *
 * `RoomMessage`'s Q&A button is ONE snippet with two call sites — the orders differ, the button
 * does not — and it was written from the card, so every compact alert row shipped two extra spaces
 * beside a `me-1` margin that is already the gap.
 *
 * A function taking `compact` explicitly rather than reading a display mode: the two call sites
 * already know which renderer they are, and a second answer derived from state is a second place
 * for them to disagree.
 */
export function alertQaCountText(count: number, compact: boolean): string {
  const pad = compact ? '' : ' ';
  return `${pad}(${count})${pad}`;
}

/**
 * `RMSG-04` — the Trial badge's text, padded on the card and bare in the compact row.
 *
 * ```js
 * function Jge(t,n){ 1&t && (d(0,"span",61), v(1," Trial "), u()) }   // CARD,    1,338,697
 * function c_e(t,n){ 1&t && (d(0,"span",61), v(1,"Trial"),   u()) }   // COMPACT, 1,378,154
 * ```
 *
 * Same const in both tables — `[1,"badge","bg-danger","trial-badge"]`, card 61 and compact 61 —
 * same element, same gate (`isPresenter && msg.isFT`), same position among the member-only marks.
 * Only the literal differs, and this room rendered the card's in both.
 *
 * **Its sibling proves this is a transcription error and not a house rule.** `New` is `v(1,"New")`
 * in BOTH (`Zge` 1,338,756, `d_e` 1,378,211) and was already right, so a compact row with both
 * badges drew one padded and one not, on the same line, from the same table.
 *
 * Constants rather than markup whitespace because Svelte normalises runs of whitespace around a
 * text node, so `" Trial "` typed into a template is not reliably `" Trial "` — the same reason
 * RM-10's two bracket runs are expressions.
 */
export const TRIAL_BADGE_TEXT = {
  /** `Jge`, byte 1,338,697 — a space on each side. */
  card: ' Trial ',
  /** `c_e`, byte 1,378,154 — neither. */
  compact: 'Trial'
} as const;

/**
 * `RMSG-02` — the card's username ROW takes the body's style on the MEMBER layout and on no other.
 *
 * The two consts differ by exactly one binding section, which is the whole finding:
 *
 * ```
 * 23  [1,"d-flex","align-items-center","justify-content-between","flex-nowrap"]
 *                                                            admin  · `Bge` node 30
 * 58  [1,"d-flex","align-items-center","justify-content-between","flex-nowrap",3,"ngStyle"]
 *                                                            member · `f1e` node 26
 * ```
 *
 * and `f1e`'s update block reaches node 26 with `m(3), z("ngStyle", e.styleF)` at byte 1,344,339 —
 * the same `styleF` the body carries. Const 23 has no `3,` section at all, so the admin row cannot
 * take a style whatever the update block selects.
 *
 * **Ours gated it on the LOG where the reference gates it on the LAYOUT**, and the two disagreed in
 * both directions: `kind === 'alert' ? bodyStyle : undefined` gave an admin's ALERT card a style
 * the reference has no node for, and denied a member's CHAT card the one it does.
 *
 * Captured rows move TOWARD the capture rather than away from it. The owner's coloured-alert
 * capture, quoted in `room-message-render.test.ts`, lists exactly four styled elements — the kebab,
 * the username, the timestamp and the body — and this wrapper is not among them, while an alert
 * from a presenter is an admin row.
 */
export function usernameRowStyle(
  reverseMessage: boolean,
  bodyStyle: string | undefined
): string | undefined {
  return reverseMessage ? undefined : bodyStyle;
}

/**
 * `RMSG-01` — `text-primary` on the card username was OURS, and no reference template can apply it.
 *
 * `fge = t => ({"text-primary": t})` is defined at byte 1,328,577 and BOUND EXACTLY ONCE in the
 * whole bundle: `ct(29, fge, e.msg.isA)` at 1,344,339, on card const 59, the MEMBER card's
 * username. Both occurrences of the identifier were enumerated; there is no third.
 *
 * The member card is `f1e`, selected by `O(3, e.msg.isA && "alert" != e.logType ? 3 : 4)` — index 3
 * is the admin template and 4 is `f1e`. `"alert"` is never a logType (RM-05 enumerated all four
 * literals in the bundle: 32 `alerts`, 23 `chat`, 3 `pc`, 2 `alert`, and both of the last are these
 * render gates), so `f1e` renders precisely when `msg.isA` is FALSE — and `ct(29, fge, e.msg.isA)`
 * is therefore false on every row that can ever evaluate it. **The class is dead upstream.**
 *
 * Ours applied it on `kind === 'alert' && isAdminMessage`, which after RM-05 is a row that takes the
 * ADMIN card, whose username is const 24 and carries no `ngClass` at all. So a presenter's name on
 * an alert was painted Bootstrap blue wherever no inline `usernameStyle` outranked it, and nothing
 * upstream ever does that. The `!item.evidenceKey` term settles where it came from: it EXCLUDED
 * captured rows, so it cannot have been read off a capture.
 *
 * This is RM-13's shape exactly — a real class, applied by us and by no reference template — and it
 * is removed for the same reason. Exported so the contract test asserts against a value the
 * component no longer contains; deleting the note breaks the test that guards the removal.
 */
export const CARD_USERNAME_TEXT_PRIMARY_REFUSED =
  'fge is bound once, at byte 1,344,339, on the member card whose own gate makes msg.isA false.';

/**
 * `RMSG-06` — the compact MEMBER reaction repeater has no `clickedBy` gate, and ours keeps one.
 *
 * Four templates repeat the loop; three wrap the pill in the same test and one does not:
 *
 * ```js
 * function Oge(t,n){ … O(1, e.value.clickedBy.length > 0 ? 1 : -1) }   // card admin,     1,333,312
 * function u1e(t,n){ … O(1, e.value.clickedBy.length > 0 ? 1 : -1) }   // card member,    1,341,960
 * function V1e(t,n){ … O(1, e.value.clickedBy.length > 0 ? 1 : -1) }   // compact admin,  1,371,615
 * function m_e(t,n){ … d(0,"span")(1,"span",51), x("click", …), v(2), u()() }
 *                                                                      // compact MEMBER, 1,379,950
 * ```
 *
 * `m_e` renders the pill unconditionally. `addRemoveReaction` empties `clickedBy` rather than
 * deleting the key, so a reaction whose last holder removes it draws upstream as `😀 0` — on a
 * compact member row and on no other row in the product.
 *
 * It was refused as a DEFECT — "reproducing it would ship a pill claiming a reaction nobody has
 * made, on one layout of four" — and the gate was applied to all four here. **Reproduced as of
 * 2026-09-02**, because that sentence is an argument about whether the reference's behaviour is
 * good, which is not one of the four things that excuse a divergence; a pill the reference draws is
 * reference-facing output.
 *
 * `RoomMessage.svelte`'s `reactionStrip` takes the gate as a parameter. It is `false` from the one
 * compact call site when that row is a member's and `true` everywhere else, so exactly one host of
 * four differs — and the term that selects it is `reverseMessage`, the same one that already chooses
 * between the two compact containers `$1e` (admin, holding `V1e`) and `__e` (member, holding `m_e`).
 */
export const COMPACT_MEMBER_REACTION_GATE_BUILT =
  'm_e at byte 1,379,950 renders the pill with no clickedBy gate; the other three templates gate ' +
  'it. Both are reproduced since 2026-09-02 — the strip takes the gate as a parameter, false only ' +
  'for the compact MEMBER host.';

/**
 * `RMSG-05` — the date separator's `<a>` takes `styleF`, and it does in BOTH components.
 *
 * ```js
 * function _ge(t,n){ … d(0,"div",3)(1,"a",6), v(2), Xe(3,"date") …
 *   2&t && ( m(), z("ngStyle", e.styleF), m(), Ze(Ct(3,2,e.msg.t,"fullDate")) ) }   // card,    1,328,773
 * function S1e(t,n){ … identical, const for const … }                               // compact, 1,367,109
 * ```
 *
 * Const 6 is `[3,"ngStyle"]` in both tables — an element declared for a binding and nothing else —
 * and the bare `m()` selects node 1, the anchor. `styleF` is the message's own font colour, which
 * is this component's `bodyStyle`.
 *
 * The separator was the only node in either renderer that reads a message and paints none of its
 * colours, so in a room whose alerts carry a `fontColor` the date rule sat in the default text
 * colour between rows that did not. Nothing announces that; it is a colour.
 *
 * No function: the binding is `style={bodyStyle}` and wrapping that would be indirection. The
 * constant is what the contract test anchors on, so the measurement cannot be dropped silently.
 */
export const DATE_SEPARATOR_TAKES_BODY_STYLE =
  'const 6 is [3,"ngStyle"] in both tables; z("ngStyle", styleF) lands on the anchor at 1,328,773 and 1,367,109.';
