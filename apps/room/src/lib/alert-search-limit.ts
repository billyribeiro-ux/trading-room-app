/**
 * The cap on an advanced alert search, shared by the query that applies it and the modal that
 * reports it.
 *
 * It lives here rather than in `#lib/server/alert-log.ts` because the modal renders it, and that
 * module is server-only — importing it from a component would pull `db` into the browser bundle.
 * Declaring the number twice was the alternative and is the failure `permission-keys.ts` records
 * about its own five: two copies of one constant drift, and the drift is silent because both sides
 * still compile.
 *
 * The VALUE and the reasoning are on `searchAlertLog`, which is the code that enforces it.
 */
export const ALERT_SEARCH_LIMIT = 500;
