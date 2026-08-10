/**
 * The identities in a captured manage-page user table, read OUT of the capture.
 *
 * The side-by-side tests need fixtures whose name and email match the reference's rows exactly,
 * because those tests compare rendered text against the capture. They used to satisfy that by
 * hardcoding the real values — four real people's names and addresses, in source, following every
 * clone of this repository.
 *
 * Redacting them to `owner@example.test` was tried and it broke two of eleven cases, which is the
 * useful result: it proves the values are load-bearing rather than decorative, so they cannot
 * simply be replaced with placeholders.
 *
 * Reading them from the capture at run time satisfies both constraints at once. The test gets
 * byte-exact identities, and the repository stores none of them — the capture stays on disk
 * outside the repo, where it already lives and where `.gitignore` keeps it.
 *
 * ## What it parses
 *
 * The reference's Name/Email cell, whose shape is fixed across all three rows:
 *
 *     <img gravatar-src-once="user.email " style="margin-right:5px " class="thumb24 ">NAME
 *     …<br> EMAIL  <span ng-show="showPins…
 *
 * The name follows the avatar immediately, with no element between them; the email follows the
 * `<br>`. Both are read as the raw text run and trimmed, so a row with an empty name (the owner's,
 * in this capture) yields an empty string rather than being skipped.
 */
export interface ReferenceUser {
  displayName: string;
  email: string;
}

/** Every `<tr ng-repeat="user in xrefs …">` in the capture, in document order. */
export function referenceUsers(captureHtml: string): ReferenceUser[] {
  const rows: ReferenceUser[] = [];

  for (const chunk of captureHtml.split('<tr ng-repeat="user in xrefs').slice(1)) {
    const row = chunk.slice(0, chunk.indexOf('</tr>'));

    /*
      Anchored on `class="thumb24` rather than on `<img`, because the row holds several images and
      only this one leads the name. The trailing quote is deliberately not matched: the reference
      writes `class="thumb24 "` with a trailing space inside the attribute.
    */
    const afterAvatar = row.indexOf('class="thumb24');
    const displayName = afterAvatar === -1 ? '' : textAfterTag(row.slice(afterAvatar));

    const br = row.indexOf('<br>');
    const email = br === -1 ? '' : textAfterTag(row.slice(br));

    rows.push({ displayName, email });
  }

  return rows;
}

/** The text run immediately after the tag this slice starts inside, trimmed. */
function textAfterTag(slice: string): string {
  const close = slice.indexOf('>');
  if (close === -1) return '';
  const rest = slice.slice(close + 1);
  const next = rest.indexOf('<');
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}
