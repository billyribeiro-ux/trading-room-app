import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { RoomNotes } from './room/notes.svelte.js';

/*
  "BRING EVERYONE HERE" BRINGS EVERYONE — the session-note half of a defect already fixed once.

  ## The defect

  Two controls said it and neither did it. `NoteTabContent.svelte`'s menu item and `NoteEditor.svelte`'s
  button were both wired, through `NotesPane`, to `selectNote(id)` — whose entire body assigned
  `requestedNoteId` and closed the menu. They moved the presenter's own tab and told nobody.

  `focus-on-screen-contract.test.ts` opens by recording the IDENTICAL defect for screens, in as many
  words: *"The menu item said 'Bring everyone here' and brought nobody."* That was found, fixed and
  pinned; the note pair one tab away was never looked at. This file is the missing half.

  ## The protocol is the reference's, read out of the capture rather than modelled on its sibling

  Byte offsets in `docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`, each region read:

    1474066  `bringFocusToTab(){…sendServerAdminCommand("focusOnSessionNote",{id:this.tab._id})}`
    1970831  `bringFocusToTab(e){…sendServerAdminCommand("focusOnSessionNote",{id:e})}`
    1023554  `case"focusOnSessionNote":…emit("focusOnSessionNote",i.id);break;`
             — immediately adjacent to `case"focusOnScreen"` in the same switch, same `{id}` shape
    1962371  the receiver: selects the notes tab, then `noteTab-${e}`

  That the two commands turned out to be siblings is the EVIDENCE that reusing the `cmds` channel is
  right, rather than the assumption that led there.

  ## A plain tab click must not broadcast

  Evidenced by absence that was read, not assumed: `bringFocusToTab` occurs exactly FOUR times in the
  bundle — the two definitions above and their two template call sites. Nothing on the tab-change path
  calls it. So selecting a note for yourself stays local, and only the named control tells the room.
  Sharing one prop between the two is exactly what made the control a lie, which is why
  `NoteTabContent` now takes `onBringEveryone` — and why its `onSelect` is gone entirely, having had
  no other reader once the menu item stopped borrowing it.
*/

const NOTES_PANE = readFileSync('src/lib/components/notes/NotesPane.svelte', 'utf8');
const TAB_CONTENT = readFileSync('src/lib/components/notes/NoteTabContent.svelte', 'utf8');
const EDITOR = readFileSync('src/lib/components/notes/NoteEditor.svelte', 'utf8');
const COMMANDS = readFileSync('src/routes/presenter-commands.remote.ts', 'utf8');
const EVENTS = readFileSync('src/lib/room/events.svelte.ts', 'utf8');

/** A `RoomNotes` whose two outward effects are recorded instead of performed. */
function make() {
  const sent: number[] = [];
  const tabShown: true[] = [];
  const notes = new RoomNotes({
    menus: { closeForModal: () => {}, set: () => {} } as never,
    modals: { open: () => {} } as never,
    noteGates: () => ({ editorMounted: false }),
    showNotesTab: () => tabShown.push(true),
    focusOnSessionNote: async (noteId: number) => {
      sent.push(noteId);
      return undefined;
    }
  });
  return { notes, sent, tabShown };
}

describe('the control tells the room, executed', () => {
  it('"Bring everyone here" SENDS the command — the assertion the old code failed', () => {
    /*
      The whole defect in one line. Before 2026-08-23 this array stayed empty and the control still
      reported nothing wrong, because moving your own tab looks identical to moving everybody's when
      you are the only person looking.
    */
    const { notes, sent } = make();
    notes.bringEveryoneTo(42);
    expect(sent, 'the room must be told').toEqual([42]);
  });

  it('and moves the presenter’s own view too, without waiting for the round trip', () => {
    const { notes, tabShown } = make();
    notes.bringEveryoneTo(42);
    expect(notes.focusedNoteId, 'their own view follows immediately').toBe(42);
    expect(
      tabShown,
      'a note focused on a hidden tab is a no-op the member never sees'
    ).toHaveLength(1);
  });

  it('RECEIVING moves the view and sends NOTHING back — the loop guard', () => {
    /*
      Every member runs this on arrival. If receiving also sent, one presenter's click would become a
      broadcast storm. The reference's guard is that nothing on the tab-change path calls
      `bringFocusToTab`; ours is that the receiver is a different method from the sender.
    */
    const { notes, sent, tabShown } = make();
    notes.focusNote(7);
    expect(notes.focusedNoteId).toBe(7);
    expect(tabShown, 'the notes tab is selected for the recipient too').toHaveLength(1);
    expect(sent, 'a recipient must not re-broadcast').toEqual([]);
  });
});

describe('the wiring that made it a lie is gone', () => {
  it('the menu item and the tab click are DIFFERENT props', () => {
    /*
      `NoteTabContent`'s "Bring everyone here" was `onSelect` — the same prop the tab itself uses — so
      the control could not have worked however `onSelect` was implemented. A separate prop is what
      makes the two acts distinguishable at the call site.
    */
    expect(TAB_CONTENT, 'the menu item must call its own prop').toContain(
      'activate(event, onBringEveryone)'
    );
    expect(TAB_CONTENT.includes('readonly onBringEveryone: () => void;')).toBe(true);
    /*
      And `onSelect` is GONE from this component, which eslint found once the menu item stopped using
      it: the prop existed for that one mis-wired consumer and had no other reader. The tab CLICK
      belongs to `NotesPane`, which owns the anchor.
    */
    expect(
      TAB_CONTENT.includes('readonly onSelect:'),
      'a prop nothing reads is dead scaffolding'
    ).toBe(false);
  });

  it('both controls reach the sender, and the plain tab click does not', () => {
    expect(NOTES_PANE, 'the tab menu item').toContain(
      'onBringEveryone={() => onBringEveryone(note.id)}'
    );
    /*
      THE EDITOR'S SUBJECT IS ITS OWN NOTE, not the active one — and the two are not the same value.

      This asserted `onBringEveryone(activeNote.id)` and that was wrong twice over. `<NoteEditor>` is
      mounted INSIDE `{#each notes as note}`, under `{#if editingNoteId === note.id}`, so the editor
      that exists belongs to a specific note; `activeNote` is whichever TAB is selected. They agree
      in the ordinary case and diverge exactly when an editor is mounted in a panel that is not the
      shown one — at which point `activeNote.id` broadcasts a note the presenter is not editing.

      It is also the unfaithful reading. The reference's editor-side sender is
      `bringFocusToTab(){…sendServerAdminCommand("focusOnSessionNote",{id:this.tab._id})}` at byte
      1,474,066 — `this.tab._id`, the tab the control belongs to. The parameterised form at 1,970,831
      is the presentation area's, which is the other call site.

      So both sites read `note.id`, and the assertion below is scoped to the editor's own markup
      rather than to the string, which the menu item shares.
    */
    const editorAt = NOTES_PANE.indexOf('<NoteEditor');
    expect(editorAt, 'the editor mount moved').toBeGreaterThan(-1);
    expect(
      NOTES_PANE.slice(editorAt, editorAt + 600),
      'the editor button sends ITS OWN note, which inside the each is `note.id`'
    ).toContain('onBringEveryone={() => onBringEveryone(note.id)}');
    expect(
      NOTES_PANE.split('onBringEveryone={() => onBringEveryone(note.id)}'),
      'exactly two controls send, and no third'
    ).toHaveLength(3);
    /*
      And the plain tab click stays LOCAL. It is the anchor's own handler in `NotesPane` — not a prop
      of `NoteTabContent`, which is rendered inside that anchor — so it calls `selectNote` directly
      and reaches no command. This assertion moved here when the dead `onSelect` prop was removed.
    */
    expect(NOTES_PANE, 'the tab anchor selects locally').toContain('selectNote(note.id);');
    expect(
      NOTES_PANE.includes('onSelect={() => selectNote(note.id)}'),
      'and no longer hands that through as a prop'
    ).toBe(false);
    expect(EDITOR, 'the editor still renders the control').toContain('Bring Everyone here');
  });
});

describe('authority is the server’s', () => {
  it('the command derives the room from the session, never from the request', () => {
    /*
      The rule the 2026-08-07 escalation earned. `presenterRoom()` checks the role and returns the
      CALLER'S OWN short code, so a presenter of one room cannot pull another, and no room identifier
      is accepted from the client. Same guard the screen command uses.
    */
    const start = COMMANDS.indexOf('export const focusOnSessionNote');
    expect(start, 'the command must exist').toBeGreaterThan(-1);
    const body = COMMANDS.slice(start, COMMANDS.indexOf('\n});', start));

    expect(body, 'the room comes from the session').toContain('presenterRoom()');
    expect(body, 'and it is a whole-room broadcast').toContain('publishToRoom');
    expect(body, 'the payload is the note id').toContain("cmd: 'focusOnSessionNote', noteId");
    expect(
      /roomShortCode|shortCode\s*[,:)]/.test(body),
      'no room identifier may be accepted from the request'
    ).toBe(false);
  });

  it('the id is bounded, which is the reference’s own `e &&`', () => {
    const start = COMMANDS.indexOf('export const focusOnSessionNote');
    const signature = COMMANDS.slice(start, start + 160);
    expect(signature, 'notes.id is an autoincrement key, so every real note is >= 1').toContain(
      'z.number().int().positive()'
    );
  });

  it('the client dispatches the frame it is sent', () => {
    expect(EVENTS, 'the receiver must exist').toContain("command?.cmd === 'focusOnSessionNote'");
    expect(EVENTS, 'and act through the page, which owns both tabs').toContain(
      'this.#focusSessionNote(command.noteId)'
    );
  });
});
