import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';

/**
 * USM-11 — the Note Update Popup, and the broadcast it needed underneath it.
 *
 * ## The row named the popup; the defect was one level down
 *
 * `saveSessionNote` in `+page.server.ts` wrote its row and **published nothing**. Every other
 * viewer's Notes pane kept the previous text until they happened to reload, so a presenter editing
 * the room's notes during a session was invisible to the room — which is the entire point of the
 * pane. The audit row asks for a checkbox; the checkbox could not exist without the frame.
 *
 * ```js
 * case "updatedSessionNote":
 *   for (let se = 0; se < this.globals.sessionNotes.length; se++) {
 *     let _e = this.globals.sessionNotes[se];
 *     _e._id == i.tab._id && (this.globals.sessionNotes[se].noteContent = i.tab.noteContent,
 *       this.appEventBus.emit("noteTabUpdated", { id: _e._id, name: _e.name })) }
 *   break;                                                            // bundle byte 1,022,762
 *
 * subscribe("noteTabUpdated", e => { …
 *   preferences.noteUpdatePopup && this.alertsService.info(`Note "${e.name}" updated`) })
 *                                                                     // bundle byte 1,962,777
 * ```
 *
 * The frame name is the reference's own. `message-mutation-frames.ts` states the rule this obeys:
 * *"Adding a fifth means finding it in the bundle first — an invented frame name is the
 * `alertDisplayMode` defect wearing a wire format."*
 */

const read = (path: string) => readFileSync(path, 'utf8');
const server = () => codeOf('src/routes/+page.server.ts', read('src/routes/+page.server.ts'));
/*
  The handler left `events.svelte.ts` for `note-update-notice.ts` in the same commit that added it:
  the dispatcher went over its ceiling, ceilings only go down, and the reasoning belongs beside the
  behaviour rather than inside a switch. The assertions are unchanged; only where they read.
*/
const notice = () =>
  codeOf('src/lib/room/note-update-notice.ts', read('src/lib/room/note-update-notice.ts'));
const events = () => codeOf('src/lib/room/events.svelte.ts', read('src/lib/room/events.svelte.ts'));
const modal = () =>
  codeOf('src/lib/components/ModalHost.svelte', read('src/lib/components/ModalHost.svelte'));
const prefs = () => codeOf('src/lib/room/prefs.svelte.ts', read('src/lib/room/prefs.svelte.ts'));

/** The rest of the file from `opening`, with the position asserted — never a bare `indexOf`. */
const after = (source: string, opening: string) => {
  const from = source.indexOf(opening);
  expect(from, `\`${opening}\` is not in the source`).toBeGreaterThan(-1);
  return source.slice(from);
};

describe('the broadcast that did not exist', () => {
  it('publishes on a successful save', () => {
    const action = after(server(), 'saveSessionNote: async');
    expect(action).toContain("cmd: 'updatedSessionNote'");
    expect(action).toContain('noteName: note.name');
    expect(action).toContain('actorUserId: requireUser(locals).id');
  });

  it('sends the id and the NAME, and not the content', () => {
    /*
      `invalidateAll()` re-reads the row, which is the authority — the argument the four
      message-mutation frames already make. And this stream is per ROOM: a frame carrying note text
      would put it on every subscriber's wire, which is the second reason that module gives for
      trigger-only frames. A tab NAME is already drawn for anyone who can see the pane.
    */
    const action = after(server(), 'saveSessionNote: async');
    /*
      The FRAME, not the action: the action reads `contentHtml` off the form, which is what it is
      for. The first draft sliced the whole action and went red on that — the assertion has to be
      about what goes on the WIRE.
    */
    const opens = action.indexOf("cmd: 'updatedSessionNote'");
    expect(opens, 'the frame is missing').toBeGreaterThan(-1);
    const closes = action.indexOf('});', opens);
    expect(closes, 'the publish is never closed').toBeGreaterThan(opens);
    const frame = action.slice(opens, closes);
    expect(frame).not.toContain('contentHtml');
    expect(frame).not.toContain('noteContent');
    /* …and the slice is the frame, not an empty one. */
    expect(frame).toContain('noteName: note.name');
  });

  it('publishes only after the save is known to have worked', () => {
    /*
      The order `close-message.ts` argues for at length: announcing a change that was refused tells
      the room something untrue. The 404 returns BEFORE the publish.
    */
    const action = after(server(), 'saveSessionNote: async');
    const refusal = action.indexOf("fail(404, { message: 'Session note was not found.' })");
    const publish = action.indexOf("cmd: 'updatedSessionNote'");
    expect(refusal, 'the 404 branch is missing').toBeGreaterThan(-1);
    expect(publish).toBeGreaterThan(refusal);
  });
});

describe('USM-11 — the popup, and who does NOT get it', () => {
  it('skips the browser that saved', () => {
    expect(notice()).toContain('if (frame.actorUserId === deps.viewerId) return;');
    /* …and the dispatcher hands it the viewer's own id rather than something off the wire. */
    expect(after(events(), "command?.cmd === 'updatedSessionNote'")).toContain(
      'viewerId: this.#session().user.id'
    );
  });

  it('refetches, then raises the toast behind the preference', () => {
    const handler = notice();
    const refetch = handler.indexOf('deps.refetch();');
    const toast = handler.indexOf('if (!deps.popupEnabled');
    expect(refetch, 'the refetch is missing').toBeGreaterThan(-1);
    expect(toast, 'the preference gate is missing').toBeGreaterThan(refetch);
    expect(handler).toContain('message: `Note "${frame.noteName}" updated`');
    /* The dispatcher supplies both, from the room's own state. */
    const wiring = after(events(), "command?.cmd === 'updatedSessionNote'");
    expect(wiring).toContain('popupEnabled: this.#prefs.noteUpdatePopup');
    expect(wiring).toContain('refetch: () => void invalidateAll()');
  });

  it('does NOT clear the other toasts, which the reference does', () => {
    /*
      `this.alertsService.clear()` sits in upstream's handler and is deliberately not reproduced: it
      wipes every toast on screen, and one of the things on screen may be the media-outage banner
      that `RoomToasts` deliberately gives `timeOut: 0`. A note being edited must not dismiss it.
      `RoomToasts` already de-duplicates, which is what that call was there for.
    */
    const handler = notice();
    expect(handler).not.toContain('dismissAll');
    expect(handler).not.toContain('.clear()');
  });

  it('has a preference, defaulting on as the reference does', () => {
    expect(prefs()).toContain('loadedSettings.noteUpdatePopup !== false');
    expect(prefs()).toContain("if (key === 'noteUpdatePopup') this.#noteUpdatePopup = value;");
  });
});

describe('USM-11 — the control', () => {
  it('renders with the reference s id and the on/off pair', () => {
    const source = modal();
    expect(source).toContain('id="note-update-popup"');
    expect(source).toContain("{settingChecks['note-update-popup'] ? 'on' : 'off'}");
  });

  it('is mapped, which is this file s declaration that it has a consumer', () => {
    expect(modal()).toContain("'note-update-popup': 'noteUpdatePopup'");
  });

  it('is NOT gated on the join beep, which upstream gates it on', () => {
    /*
      `z("ngIf", sessData.beepOnUserJoin)` at byte 2,285,196 renders this control under the JOIN-BEEP
      room setting, which has nothing to do with session notes: nothing else in that block shares
      the gate and no handler reads the two together. Reproducing it would mean an owner who
      switches off the join beep silently loses control of note popups. Refused, and the offset is
      recorded at the code.
    */
    const source = modal();
    const at = source.indexOf('id="note-update-popup"');
    expect(at, 'the control is missing').toBeGreaterThan(-1);
    const around = source.slice(Math.max(0, at - 1200), at);
    expect(around).not.toContain('beepOnUserJoin');
    /* And the refusal is recorded where the behaviour lives, not only absent from the markup. */
    expect(read('src/lib/room/note-update-notice.ts')).toContain('byte 2,285,196');
  });
});
