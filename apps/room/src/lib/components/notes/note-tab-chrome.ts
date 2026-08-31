import type { Attachment } from 'svelte/attachments';
import type { RoomNote } from '#lib/types.js';

/**
 * The chrome on one note tab: the Welcome Mat badge, the gear, the rename tooltip and the two
 * activations.
 *
 * `NoteTabContent.svelte` renders it. This module holds the parts that are prose plus a constant
 * plus three short functions, because that component sits on a `source-size-contract` ceiling and the
 * ratchet's instruction when an explanation outgrows its file is to move the explanation to the
 * code it explains, never to shorten it.
 *
 * Every const index below was read by bracket-walking `app-presentationarea`'s own consts table
 * (`consts:[` at byte 1,994,257 of `main.d1d09071be31f1ba.js`, 294 entries) by VALUE, not by
 * counting to a slot — the note tab's templates are `jSe` (byte 1,928,605), its gear menu `USe`
 * (byte 1,927,567) and its Welcome Mat badge `BSe` (byte 1,927,509).
 */

/**
 * NTC-1 — the Welcome Mat marker, quoted verbatim from const 122.
 *
 * `["placement","bottom","ngbTooltip","This note is the Welcome Mat, and will be shown by default
 * when noboby is presenting",1,"badge","badge-success","mx-1","p-0"]`. Its template is `BSe`:
 * `d(0,"span",122), T(1,"i",125)`, and const 125 is a bare `[1,"fas","fa-home"]` — so the `mx-1`
 * belongs to the badge, not to the icon.
 *
 * What was in the component instead was `<i class="fas fa-home mx-1" title="Welcome Mat">`: no
 * badge, and a two-word title that occurs **zero times** in the 2,891,205-byte bundle: `"Welcome
 * Mat"` as a quoted literal is 0 occurrences and `"title","Welcome Mat"` is 0, while the bare words
 * appear 12 times and every one of them is inside a longer sentence — the two menu labels at
 * 1,928,249 and 1,928,417, this tooltip at 2,002,385, and nine more across the note editor's own
 * two buttons and the multi-room prompt and dialog titles. Two consequences, both visible: the
 * marker was an unpainted grey house rather than a green `badge-success` pill
 * (`css/complete-app-styles.css`: `.badge-success { background-color: rgb(0, 188, 140) }`), and the
 * one place in the room that explains what a Welcome Mat DOES — that it is shown by default when
 * nobody is presenting — said "Welcome Mat" instead.
 *
 * **The reference's own misspelling of "nobody" is kept.** It is what the capture says, and every
 * comparison in this repository diffs rendered strings rather than intentions.
 *
 * The component pairs this with `{@attach ngbTooltip}`, which is what makes it visible at all:
 * `ngbtooltip` is an Angular directive and does nothing in a browser, which is the defect
 * `#lib/ngb-tooltip.js` was written for after the owner reported nine silent tooltips on
 * 2026-08-11.
 */
export const WELCOME_MAT_TOOLTIP =
  'This note is the Welcome Mat, and will be shown by default when noboby is presenting';

export interface NoteTabContentProps {
  readonly canEdit: boolean;
  readonly dirty: boolean;
  readonly menuId: string;
  readonly menuOpen: boolean;
  readonly note: RoomNote;
  readonly onDelete: () => void;
  readonly onRename: () => void;
  readonly onRequestWelcome: (allRooms: boolean) => void;
  /**
   * "Bring everyone here" — a ROOM-WIDE act, deliberately NOT `onSelect`.
   *
   * It was wired to `onSelect` until 2026-08-23, which is why it brought nobody: selecting a tab
   * and telling the room to follow are different things, and sharing one prop made the second
   * indistinguishable from the first.
   */
  readonly onBringEveryone: () => void;
  /*
    `onSelect` was REMOVED on 2026-08-23 and is recorded rather than silently dropped.

    It existed for exactly one consumer — the "Bring everyone here" menu item — and that was the
    bug: the item was wired to "select this tab" instead of "tell the room". Once the item took its
    own prop, `onSelect` had no reader left, and eslint said so. The tab CLICK is not the
    component's: `NotesPane` owns the anchor and calls `selectNote` there, with `NoteTabContent`
    rendered inside it. A prop nothing reads is the dead scaffolding this repository forbids.
  */
  readonly onStartEditing: () => void;
  readonly onToggleMenu: () => void;
}

/**
 * A menu item's click: swallow it, then act.
 *
 * `preventDefault` because every item is `<a href="#">` in the capture (const 57,
 * `["href","#",1,"dropdown-item"]`) and without it the room navigates to `#` and pushes a history
 * entry. `stopPropagation` because the whole tab is wrapped in `NotesPane`'s `<a role="tab">`,
 * whose click selects the note — so a Delete would also switch to the note being deleted.
 *
 * Upstream carries the click on the `<li>` rather than on the `<a>` and prevents neither, because
 * Angular's router swallows the fragment navigation. Ours is on the `<a>`, which is the element
 * that has the default action to prevent.
 */
export function activateNoteMenuItem(event: MouseEvent, action: () => void): void {
  event.preventDefault();
  event.stopPropagation();
  action();
}

/**
 * NTC-2 — the gear had no keyboard path at all, and the capture is why.
 *
 * Const 126 is `["id","dropdownMenuNote","data-bs-toggle","dropdown","aria-expanded","false",1,
 * "dropdown-toggle"]` — a `<span>` whose only child is an `<i>`, with no `role`, no `tabindex` and
 * no text. Upstream that is survivable because Bootstrap's dropdown plugin adopts the element and
 * gives it keyboard behaviour; `bootstrap-dropdown-contract.test.ts` measures that **no app in this
 * repository depends on `bootstrap`**, so the attribute is inert here and the span was simply
 * unreachable. Every note action behind it — Edit Note, Rename Note, Bring everyone here, both
 * Welcome Mat items and Delete — was mouse-only, on a tab strip a presenter drives while talking.
 *
 * `role`, `tabindex`, `aria-label` and this handler are OURS, on the precedent of `GiphyPicker`'s
 * two `input-group-text` spans and `ScreenTabs`' tab anchors: the capture puts a click handler on
 * something no keyboard can reach. `note-tab-content-contract.test.ts` pins all four so they cannot
 * be removed later as "not in the reference".
 *
 * Space as well as Enter, and `preventDefault` on both — Space scrolls the page on anything that is
 * not a native control. `stopPropagation` for the same reason the click handler has it.
 */
export function activateNoteMenuOnKey(event: KeyboardEvent, action: () => void): void {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  event.stopPropagation();
  action();
}

/**
 * The two attributes the capture puts on the tab's inner rename anchor, const 124:
 * `["placement","bottom","tooltip","Double-Click to rename note tab",1,"editName","mx-1",3,
 * "dblclick"]`.
 *
 * An ATTACHMENT rather than markup because `NotesPane` renders this component inside its own
 * `<a role="tab">`, and the source application creates the inner anchor after mount — writing a
 * nested `<a>` into SSR HTML asks the parser to repair it, which it does by closing the outer one.
 *
 * `tooltip` here where the Welcome Mat badge carries `ngbTooltip` is the capture's own
 * inconsistency, kept: two different directives on two elements four nodes apart.
 */
export const attachCapturedRenameTooltip: Attachment<HTMLAnchorElement> = (element) => {
  element.setAttribute('placement', 'bottom');
  element.setAttribute('tooltip', 'Double-Click to rename note tab');
};
