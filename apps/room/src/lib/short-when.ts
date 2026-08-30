/**
 * The reference's `| date:'short'`, once.
 *
 * Angular's `short` is `M/d/yy, h:mm a` in `en-US`, and `Intl.DateTimeFormat` with
 * `dateStyle: 'short'` and `timeStyle: 'short'` is the same shape from the platform — so no format
 * string is carried anywhere in this repository and the viewer's own locale decides the order.
 *
 * ## Why a module rather than a `const` per component
 *
 * There were three identical copies — `UserNotesPane`, `ChatArchivePane` and `ScheduledAlerts` —
 * each with its own version of the paragraph above, and the user modal's Last Login row was about
 * to be a fourth. Three statements of one rule is how one of them stops matching; and the cost the
 * copies were each paying attention to is the same cost, which is the second reason to state it
 * once:
 *
 * **Built at module scope, not per render and never inside a loop.** Constructing an
 * `Intl.DateTimeFormat` is a locale-data lookup, so a formatter created inside an `{#each}` is one
 * lookup per row. This one is created when the module is first imported and reused for the life of
 * the page.
 *
 * Safe to share: `Intl.DateTimeFormat` is stateless and `format` does not mutate it.
 */
export const shortWhen = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'short',
  timeStyle: 'short'
});
