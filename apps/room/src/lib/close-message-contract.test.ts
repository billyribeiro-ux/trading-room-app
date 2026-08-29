import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { roomState } from '#lib/server/db/schema.js';
import { CLOSED_ROOM_DEFAULT, closedRoomMessage } from '#lib/server/closed-room-message.js';

/**
 * TWO BUTTONS OFFERED TO SAVE A CLOSE MESSAGE AND NEITHER DID.
 *
 * *" Just Save Close Message "* raised `Message Saved` and its entire handler body was that one
 * alert. *" Save Message and Close Session "* wrote `sessionOpen: false` and dropped the message half
 * of its own label. Nothing in `apps/room/src` persisted a close message at all, and
 * `ModalHost.svelte` rendered the literal string `undefined` where the reference hosts its editor.
 *
 * ## What is asserted here, and why in three parts
 *
 * The round trip is only worth anything if the message REACHES somebody, so this covers the store,
 * the reader, and the fact that the reader is wired to the door that turns a member away. A test of
 * the store alone would pass just as happily against a column nothing consults — which is the dead
 * storage this repository forbids as firmly as it forbids a dead control.
 */

const ROOM = 'close-msg-room';

beforeEach(() => {
  ensureDatabase();
  db.delete(roomState).run();
});

function store(message: string | null) {
  db.insert(roomState)
    .values({ roomShortCode: ROOM, closedMessage: message, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: roomState.roomShortCode,
      set: { closedMessage: message, updatedAt: new Date() }
    })
    .run();
}

describe('the message a closed room turns somebody away with', () => {
  it('is the room default when the presenter has never written one', () => {
    expect(closedRoomMessage(ROOM)).toBe(CLOSED_ROOM_DEFAULT);
  });

  it("is the presenter's own words once they have", () => {
    store('Back Monday at 9. Alerts resume then.');
    expect(closedRoomMessage(ROOM)).toBe('Back Monday at 9. Alerts resume then.');
  });

  it('falls back rather than handing a member a BLANK refusal', () => {
    /*
      The reason the column is nullable rather than `.notNull().default('')`, and the reason
      `saveCloseMessage` normalises a trimmed-empty save to `null`. Both routes to "empty" are
      checked, because they are different rows: one never written, one written and cleared.
    */
    store(null);
    expect(closedRoomMessage(ROOM)).toBe(CLOSED_ROOM_DEFAULT);
    store('   ');
    expect(closedRoomMessage(ROOM)).toBe(CLOSED_ROOM_DEFAULT);
  });

  it('is per ROOM — one room cannot answer for another', () => {
    store('this room only');
    expect(closedRoomMessage('a-different-room')).toBe(CLOSED_ROOM_DEFAULT);
  });

  it('answers the default for no room at all, rather than throwing', () => {
    /* The guest door reaches this with `string | undefined`; see the function. */
    expect(closedRoomMessage(undefined)).toBe(CLOSED_ROOM_DEFAULT);
  });
});

describe('the message reaches a member, which is what stops it being dead storage', () => {
  const GUEST_DOOR = readFileSync(
    new URL('../routes/session/+page.server.ts', import.meta.url),
    'utf8'
  );

  it('the closed-room refusal uses the stored message, not a fixed string', () => {
    /*
      Read as text because this refusal is inside a load that needs a controller, a handoff secret
      and a request. What cannot be executed here is still the join that matters: a stored message no
      door reads would be a column nothing consults.
    */
    expect(GUEST_DOOR).toContain('error(403, closedRoomMessage(shortCode));');
    expect(GUEST_DOOR, 'the fixed sentence must not survive beside it').not.toContain(
      "error(403, 'This room is closed.')"
    );
  });

  it("the default sentence is still the reference's own words", () => {
    /*
      A presenter who writes nothing must see no change at all. The string moved out of the route and
      into `closed-room-message.ts`; if it drifted there, every room that never set a message would
      start saying something the capture does not.
    */
    expect(CLOSED_ROOM_DEFAULT).toBe('This room is closed.');
  });
});

describe('the editor and the command', () => {
  /*
    THE PANE, not `ModalHost` — the close-session tabpanel became `CloseSessionPane.svelte` on
    2026-08-27, when wiring three missing halves into a 6,000-line component pushed it past its
    ceiling. Both files are read: the pane for what it now owns, and `ModalHost` for the assertion
    that the old markup did not survive there. A `not.toContain` left aimed only at the old file
    would have started passing for the wrong reason the moment the markup moved out of it.
  */
  const PANE = readFileSync(
    new URL('./components/CloseSessionPane.svelte', import.meta.url),
    'utf8'
  );
  const MODAL = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');
  const COMMANDS = readFileSync(
    new URL('../routes/session-commands.remote.ts', import.meta.url),
    'utf8'
  );

  it('the editor host no longer renders the literal string `undefined`', () => {
    /*
      What it rendered until 2026-08-27 — an interpolated `undefined` that reached the DOM as text,
      inside the reference's own `#summernoteClosedMsg` element id.
    */
    expect(MODAL).not.toContain('<div id="summernoteClosedMsg">undefined</div>');
    expect(PANE).not.toContain('<div id="summernoteClosedMsg">undefined</div>');
    expect(PANE).toContain('bind:value={draft}');
  });

  it('BOTH buttons carry the text, which is the defect that made them two lies', () => {
    /*
      One receiver taking what they differ by, rather than two props. Two would have been two chances
      to wire the save to only one of them — which is precisely what was wrong: the closing button
      saved nothing and the saving button closed nothing and saved nothing either.
    */
    expect(PANE).toContain("onSave?.(draft, 'close')");
    expect(PANE).toContain("onSave?.(draft, 'save-only')");
  });

  it('the command is presenter-gated and bounded', () => {
    const at = COMMANDS.indexOf('export const saveCloseMessage');
    expect(at).toBeGreaterThan(-1);
    const body = COMMANDS.slice(at);
    expect(body, 'the gate decides authority AND room in one call').toContain('presenterRoom()');
    expect(body, 'presenter-authored text that reaches a response body is bounded').toContain(
      'max(2000)'
    );
    expect(body, 'empty clears it, which is what the nullable column is for').toContain(
      'message || null'
    );
  });
});
