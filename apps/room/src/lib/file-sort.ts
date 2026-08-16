/**
 * The Files sort bar — its comparator, its one state transition, and its four titles.
 *
 * Decoded from `docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`, whose sha256 is the one
 * `sha256sums.txt` in that directory pins (40796ca8…bab87524, re-checked before this was written).
 * Every offset quoted below was opened and READ; every count is python `.count()` over the file's
 * BYTES, because the bundle is a single line and `grep -c` on it can only ever answer 1 or 0.
 *
 * Extracted out of `+page.svelte` for the reason `files-gates.ts` gives about the Files gates: a
 * comparator reachable only by rendering a 13,000-line component is a comparator nobody tests, and
 * this one carries four separate behaviours that a plausible rewrite silently drops.
 *
 * WHY THIS FILE EXISTS AT ALL: our older capture (`docs/source/main.d6d3c112b59b7d0d.js`) contains
 * `st-fileSortBar` zero times and the v4 bundle contains it once. The feature is not missing from
 * the older capture because anybody searched wrong — the evidence simply predates it. Evidence has
 * a date, and the live application moves.
 */

/**
 * The field the bar sorts by — the reference's `fileSortField`.
 *
 * `''` is not a member. The reference's pipe defaults its field argument to `""` and the template
 * never passes that (see `sortFiles` below), so the empty case belongs to the pipe's signature
 * rather than to this component's state.
 */
export type FileSortField = 'name' | 'date';

/**
 * The ONE direction the whole bar shares — the reference's `fileSortDir`.
 *
 * Not one direction per button. Both icon expressions read the same field; the two views were read
 * verbatim at bytes 1,946,450 and 1,946,605:
 *
 * ```js
 * function Uwe(t,n){1&t&&T(0,"i",245),2&t&&z("ngClass","asc"===g(2).fileSortDir?"fa-sort-alpha-down":"fa-sort-alpha-up")}
 * function Vwe(t,n){1&t&&T(0,"i",245),2&t&&z("ngClass","asc"===g(2).fileSortDir?"fa-sort-amount-down":"fa-sort-amount-up")}
 * ```
 *
 * A per-button direction is the single most tempting misreading of this control, because the
 * rendered capture shows an inactive Date button still claiming "Sorted newest to oldest" — which
 * looks like remembered state and is actually just the `else` arm of its title (see
 * `fileSortTitle`).
 */
export type FileSortDirection = 'asc' | 'desc';

/**
 * Field and direction together, because the reference changes both in one statement.
 *
 * Held as one value rather than two so they cannot drift: `toggleFileSort` assigns the pair, and
 * splitting that into two assignments is exactly the shape that lets a direction survive a field
 * change it was supposed to reset. `readonly` so a caller holding this state in `$state.raw`
 * cannot mutate it in place — raw state only reacts to reassignment, so a mutation would be a
 * silent no-op on screen.
 */
export interface FileSortState {
  readonly field: FileSortField;
  readonly direction: FileSortDirection;
}

/**
 * The pane opens NEWEST FIRST, not unsorted.
 *
 * Read at byte 1,954,640, in the constructor beside `soundsTotal` / `imagesTotal` / `filesTotal`:
 *
 * ```js
 * this.selectedFileTab="files",this.soundsTotal=0,this.imagesTotal=0,this.filesTotal=0,
 * this.fileSortField="date",this.fileSortDir="desc",this.mp3Playing=!1,
 * ```
 *
 * A build that starts unsorted, or starts on `name`, diverges on first paint — which is not a
 * subtle difference, it is the whole list in a different order.
 */
export const INITIAL_FILE_SORT: FileSortState = { field: 'date', direction: 'desc' };

/**
 * One row, as far as the comparator is concerned.
 *
 * The reference reads `e.created`; the column here is `createdAt` (`sharedFiles` in
 * `#lib/server/db/schema`, drizzle timestamp mode, so a `Date` at runtime). `new Date(x)` accepts
 * all three shapes and is what the reference does to its own value, so the union is transcribed
 * rather than narrowed.
 *
 * `name` is optional and nullable because the reference guards it — `(s.name||"")` — even though
 * our column is `.notNull()`. Transcribing the guard costs nothing and removing it would be a
 * silent behavioural edit.
 */
export interface SortableFile {
  name?: string | null;
  createdAt: Date | string | number;
}

/**
 * The one place the tie rule and the direction flip live.
 *
 * Generic over the key type so that the date branch compares `number` and the name branch compares
 * `string`, without either widening to `number | string` — a union that TypeScript refuses to
 * apply `>` to, and that would otherwise have to be cast away.
 */
function sortedBy<T, K extends number | string>(
  files: readonly T[],
  key: (row: T) => K,
  direction: FileSortDirection
): T[] {
  const flip = direction === 'asc' ? 1 : -1;
  return [...files].sort((s, r) => {
    const a = key(s);
    const l = key(r);
    // TIES RETURN 0. Equal values do NOT fall back to the other field, so two files uploaded in the
    // same millisecond keep whatever relative order the loader gave them. Adding a tiebreaker here
    // would be an improvement the reference does not make, and it would reorder real rows.
    if (a === l) return 0;
    return a > l ? flip : -flip;
  });
}

/**
 * `sortFiles`, the reference's pipe. Registered at byte 1,915,203; the body read at 1,914,860:
 *
 * ```js
 * transform(e,i="",o="asc"){
 *   return e&&i
 *     ? [...e].sort((s,r)=>{
 *         const a="date"===i?new Date(s.created).getTime():(s.name||"").toLowerCase(),
 *               l="date"===i?new Date(r.created).getTime():(r.name||"").toLowerCase();
 *         if(a===l)return 0;
 *         const c=a>l?1:-1;
 *         return"asc"===o?c:-c
 *       })
 *     : e
 * }
 * ```
 *
 * Four properties, and a rewrite loses a different one each time:
 *
 * 1. `[...e]` COPIES BEFORE SORTING. `Array.prototype.sort` mutates, and the array reaching this
 *    function is rendered by an `{#each}`; sorting a list in place underneath Svelte is a
 *    reactivity bug that shows up as a list that reorders one render late.
 * 2. NO FIELD IS PASSTHROUGH, NOT EMPTY. `e && i ? … : e` hands the original list back when the
 *    field is falsy. Its neighbour in the same bundle does the opposite — `limitSwingLogs` at byte
 *    1,915,553 is `return e&&0!==i?e.slice(0,i):[]`, where the falsy argument yields `[]` — so
 *    "the degenerate argument returns nothing" is a real convention in this codebase and is NOT
 *    the one this pipe follows.
 * 3. Ties return 0 (see `sortedBy`).
 * 4. The defaults are `i = ""` and `o = "asc"`, which is why they are the defaults here.
 *
 * The reference's `e &&` guard against a nullish list is deliberately NOT transcribed: the caller
 * is `data.files`, which comes from a drizzle `.all()` and is always an array, and the parameter
 * type says so. That is a documented divergence rather than a silent one.
 *
 * Returns `readonly T[]` because the passthrough arm returns the caller's own array by reference —
 * the type stops a caller from sorting that in place and re-introducing property 1.
 */
export function sortFiles<T extends SortableFile>(
  files: readonly T[],
  field: FileSortField | '' = '',
  direction: FileSortDirection = 'asc'
): readonly T[] {
  if (!field) return files;
  return field === 'date'
    ? sortedBy(files, (row) => new Date(row.createdAt).getTime(), direction)
    : sortedBy(files, (row) => (row.name || '').toLowerCase(), direction);
}

/**
 * `toggleFileSort`, read verbatim at byte 1,975,308:
 *
 * ```js
 * toggleFileSort(e){
 *   this.fileSortField===e
 *     ? this.fileSortDir="asc"===this.fileSortDir?"desc":"asc"
 *     : (this.fileSortField=e,this.fileSortDir="date"===e?"desc":"asc")
 * }
 * ```
 *
 * Clicking the ALREADY-ACTIVE field flips the direction. Clicking the OTHER field switches to it
 * and RESETS the direction to that field's own default — `date` to `desc`, `name` to `asc`. The
 * previous direction is discarded, so a direction can never be carried across a field change.
 *
 * That reset is the behaviour a rebuild is likeliest to miss, because "remember each button's
 * direction" is the friendlier design and is not what the reference does. Concretely: sort Name
 * Z-to-A, click Date, click Name again — the reference gives you A-to-Z, not Z-to-A.
 *
 * Pure, returning the next state rather than mutating, so the transition can be tested without a
 * component and so the caller's `$state.raw` sees a reassignment.
 */
export function toggleFileSort(current: FileSortState, field: FileSortField): FileSortState {
  return current.field === field
    ? { field, direction: current.direction === 'asc' ? 'desc' : 'asc' }
    : { field, direction: field === 'date' ? 'desc' : 'asc' };
}

/**
 * The `title` of one of the two buttons, from the update block read at bytes 1,950,560–1,951,040:
 *
 * ```js
 * z("ngClass",ct(13,mo,"name"===e.fileSortField))("title","name"===e.fileSortField&&"desc"===e.fileSortDir
 *   ?"Sorted Z to A (click to sort A to Z)"
 *   :"Sorted A to Z (click to sort Z to A)")
 * z("ngClass",ct(15,mo,"date"===e.fileSortField))("title","date"===e.fileSortField&&"asc"===e.fileSortDir
 *   ?"Sorted oldest to newest (click to sort newest to oldest)"
 *   :"Sorted newest to oldest (click to sort oldest to newest)")
 * ```
 *
 * `mo` is the shared pure function that both `ngClass` bindings above run their argument through,
 * read at byte 1,916,345 in the same const run as `Hr` and `jCe`:
 *
 * ```js
 * mo=t=>({active:t})
 * ```
 *
 * so `.active` is applied exactly when that button's field is the governing field — the direction
 * is no part of it. `docs/decoded/files-sort-bar.md` recorded this as an honest gap; it is not one,
 * and the component carries the same note in words because a brace-delimited body inside a Svelte
 * comment is a mustache to a parser.
 *
 * NOTE THE FIELD CONJUNCT. Each title asks whether THIS button is the governing sort before it
 * looks at the direction, so an inactive button always shows its own default-state string:
 * an inactive Name reads "Sorted A to Z (click to sort Z to A)" and an inactive Date reads
 * "Sorted newest to oldest (click to sort oldest to newest)", whatever the other button is doing.
 * `docs/decoded/files-sort-bar.md` tabulated these on direction alone, which produces a Name button
 * announcing "Sorted Z to A" while Date is the sort actually in force. The conjunct is why the
 * rendered capture shows an inactive Date button claiming a direction it is not applying.
 *
 * The strings are wrong-by-design in the reference and transcribed anyway: a button that is not
 * sorting anything still says "Sorted …". That is the captured text, not a description to improve.
 */
export function fileSortTitle(button: FileSortField, state: FileSortState): string {
  if (button === 'name') {
    return state.field === 'name' && state.direction === 'desc'
      ? 'Sorted Z to A (click to sort A to Z)'
      : 'Sorted A to Z (click to sort Z to A)';
  }
  return state.field === 'date' && state.direction === 'asc'
    ? 'Sorted oldest to newest (click to sort newest to oldest)'
    : 'Sorted newest to oldest (click to sort oldest to newest)';
}

/**
 * A file's size as the Files pane reports it.
 *
 * `i.round(e.size / 1024)` then the literal `'Kb '` — the capture reports kilobytes, rounded, with a
 * trailing space before the closing tag. The trailing space belongs to the template, not here.
 *
 * Moved out of `+page.svelte` with the rest of the Files-pane conversion: this module already owns
 * how the pane sorts and labels its rows, so it should own how it formats them too. It is also the
 * only way this was ever going to be tested — `files-pane-contract.test.ts` asserted the expression
 * as a STRING, which proves the text exists and nothing about what it returns.
 */
export function fileSizeInKb(size: number): number {
  return Math.round(size / 1024);
}
