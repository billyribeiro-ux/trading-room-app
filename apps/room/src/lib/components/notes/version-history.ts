/*
  The two pure values a version-history row shows, kept out of the components on purpose.

  Both the panel row and the revert confirmation quote the date, and the reference's confirmation
  text embeds the SAME string the row displays. One formatter means those two can never disagree,
  and it makes each function testable without rendering an editor.

  Evidence: `docs/source/components/app-note.full.js`, which is the whole reference component.
  The panel is `C0e` (toggle), `w0e` (panel) and `S0e` (one row); these two values come from the
  class body:

    getVersionPreview(e) {
      const i = e.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      return i.length > 100 ? i.substring(0, 100) + '...' : i;
    }

    const i = { content: e, date: new Date().toLocaleString(), timestamp: Date.now() };

  The reference STORES a `toLocaleString()` string at the moment a version is taken, because its
  versions live in `localStorage` on one browser. Ours live in `note_versions` and travel as ISO
  timestamps, so the same string is produced on read instead. The platform does the formatting
  either way: a hand-rolled format over a date is what once produced `20-3341` in this repository.
*/

/** The reference truncates at 100 characters and appends an ellipsis; longer previews are elided by CSS. */
export const NOTE_VERSION_PREVIEW_MAX_LENGTH = 100;

/**
 * Reduces stored note HTML to the one-line plain-text preview the reference shows.
 *
 * Tags become a space rather than nothing, so `<p>one</p><p>two</p>` reads as `one two` instead of
 * `onetwo`. The result still reaches the DOM through `safeNoteHtml`, because stripping tags with a
 * regex is not a sanitiser and was never meant to be one — entity-encoded markup survives it intact.
 */
export function noteVersionPreview(contentHtml: string): string {
  const text = contentHtml
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > NOTE_VERSION_PREVIEW_MAX_LENGTH
    ? `${text.slice(0, NOTE_VERSION_PREVIEW_MAX_LENGTH)}...`
    : text;
}

/** Formats a stored ISO timestamp exactly as the reference's captured `new Date().toLocaleString()` did. */
export function noteVersionDate(createdAt: string): string {
  return new Date(createdAt).toLocaleString();
}

/** The revert confirmation, quoting the same date string the row displays. */
export function noteVersionRevertMessage(createdAt: string): string {
  return `Are you sure you want to revert to the version from ${noteVersionDate(createdAt)}? Your current content will be replaced.`;
}
