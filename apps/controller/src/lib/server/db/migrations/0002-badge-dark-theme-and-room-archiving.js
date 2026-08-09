/**
 * Two columns the account page's last two missing controls need.
 *
 * ## `badges.dark_theme`
 *
 * The reference's third badge row action, "Dark Theme" —
 * `addBadgeDarkTheme(b._id, b.text, b.imgURL, b.darkTheme)`. NOT NULL with a `false` default so
 * every badge that already exists is valid the moment the column lands; there is no backfill to run
 * because "nobody has pressed it" and `false` are the same statement.
 *
 * ## `rooms.archived_at`
 *
 * Nullable and undefaulted, which is the whole point: NULL is "not archived", so every existing room
 * stays live and the Sessions table renders exactly as it did before this ran. A default of any kind
 * here would archive an entire estate on deploy.
 *
 * ## Why this one is idempotent even though it does not have to be
 *
 * From version 1 onward the migrator does not require idempotence — `applied_migrations` guarantees
 * each runs once. These are written `IF NOT EXISTS` anyway because both columns are also plausible
 * things for somebody to have added by hand to a staging database while this was in review, and the
 * cost of the guard is nothing. It buys back the one property a versioned migrator gives up.
 *
 * No index. `archived_at` is only ever read as part of a row already selected by
 * `rooms.account_id`, and the filter itself happens in the browser (the reference's toggle is
 * client-side, not a reload) — an index nothing plans against is maintenance for nobody.
 */
export const sql = `
    ALTER TABLE badges ADD COLUMN IF NOT EXISTS dark_theme BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE rooms ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
`;
