/**
 * `badges.dark_theme_badge_id` — the badge that stands in for this one in the dark theme.
 *
 * ## Why this migration exists, and why it could not be written until 2026-08-15
 *
 * `dark_theme BOOLEAN NOT NULL DEFAULT false` (migration `0002`, shipped) was always known to be a
 * placeholder. `schema.ts` recorded exactly what would settle it and what would follow: *"if that
 * markup is captured later and shows an id, that is a new migration, not a rewrite."*
 *
 * It was captured, twice, and both halves now agree:
 *
 * * **STORAGE + DISPLAY**, 2026-08-13 — `page.welcome.html:1191-1211` renders the Dark Theme cell as
 *   a repeat over the badge list filtered by `ng-if="roomBadge._id === b.darkTheme"`, drawing that
 *   badge's own chip. **A boolean cannot be compared to an `_id`.**
 * * **THE SETTER**, 2026-08-15 — `$scope.addBadgeDarkTheme` at byte 202828 of the live `app.min.js`:
 *
 *   ```js
 *   dialog = bootbox.dialog({
 *     message: "<p>Add a badge id to show in the dark theme instead of this badge: " + b +
 *       '</p><p><input type="text" value="' + darkThemeID + '" id="darkThemeID" class="form-control"/></p>',
 *     buttons: { cancel: { label: "Cancel" },
 *                confirm: { label: "Set", className: "btn btn-inverse", callback: function () {
 *                  args.darkTheme = $("#darkThemeID").val(); … } } }
 *   })
 *   ```
 *
 *   A free-text field, seeded with the current value, posting whatever the admin typed. It is not a
 *   picker and it is not a toggle — and "handed the current value, therefore a toggle" is precisely
 *   the inference this repository made and the evidence refutes.
 *
 * ## Forward-only: `dark_theme` STAYS
 *
 * `0002` is shipped. Editing it would change the sqlx/migrator checksum and every existing database
 * would refuse to migrate — that has already happened permanently to one local database here. So the
 * boolean remains as a superseded column, and the new fact gets its own.
 *
 * ## The backfill is `true` → NULL, and that is the only honest one
 *
 * The boolean never recorded WHICH badge. A row reading `true` says "somebody pressed a control we
 * had modelled wrongly" and nothing more, so there is no id to derive from it. Inventing one — the
 * row's own id, the next badge, the first in the account — would be a fabricated value that renders,
 * which is the thing this repository forbids outright. NULL is "no dark variant set", which is
 * exactly what is known.
 *
 * Nothing is written here to do that: the new column is nullable and starts NULL for every row, so
 * the backfill is the default. Stated rather than silently omitted, because "there is no UPDATE in
 * this file" should be a decision a reader can find, not an absence they have to notice.
 *
 * ## `ON DELETE SET NULL`, which is a choice and not a capture
 *
 * The reference stores a Mongo id with no foreign key at all, so nothing upstream says what happens
 * when the badge you nominated is deleted. Left with no action, PostgreSQL would REFUSE to delete
 * any badge another badge points at — turning "Delete" into a failure with no explanation, for a
 * relationship the admin may have forgotten setting. `SET NULL` makes the survivor fall back to
 * having no dark variant, which is the same state it was in before anyone nominated one.
 *
 * `IF NOT EXISTS` on the column so re-running is safe; the constraint rides with the column, so it
 * is created exactly when the column is.
 */
export const sql = `
  ALTER TABLE badges
    -- The badge shown INSTEAD of this one in the dark theme. NULL = no variant set, which is every
    -- row until an admin nominates one: the superseded dark_theme boolean never recorded which.
    ADD COLUMN IF NOT EXISTS dark_theme_badge_id INTEGER
      REFERENCES badges(id) ON DELETE SET NULL;
`;
