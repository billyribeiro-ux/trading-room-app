/**
 * Server-only import boundary for the shared allowlist implementation.
 *
 * Every persistence path imports through this module so the server remains the
 * authoritative security control even though the editor also sanitizes its
 * local preview for immediate user safety.
 */
export { sanitizeHtml } from '$lib/sanitize-html';
