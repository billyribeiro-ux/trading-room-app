import { command } from '$app/server';
import { z } from 'zod';
import { CHAT_MODES } from '#lib/chat-mode.js';
import { presenterRoom } from '#lib/server/auth.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { roomState } from '#lib/server/db/schema.js';
import { publishToRoom } from '#lib/server/room-events.js';

/*
  `sendServerAdminCommand('changeChatMode', {mode})` — a PRESENTER act that changes the room.

  ```js
  changeChatMode(e, i) {
    if (sessData.chatMode == e) return;
    let o = '"Group Chat"?';
    'p' == e ? (o = '"Webinar Mode"?') : 'd' == e && (o = '"Disabled"?');
    bootbox.confirm('Are you sure you want to change the chat mode to ' + o, s => {
      s && this.appService.sendServerAdminCommand('changeChatMode', {mode: e});
    });
  }
  ```

  ## PERSISTED, unlike the recording state it sat beside

  `recording-state.remote.ts` broadcasts and stores nothing; this writes a row AND broadcasts. The
  two are otherwise the same presenter-gated `cmds` message, and the single thing that separates
  them is how long the fact is true for. Recording is momentary — a late joiner has missed nothing
  by not hearing it. A disabled chat is a standing fact about the room, and a member who arrives
  afterwards has to FIND it disabled, which only a row can tell them. The broadcast is on top of the
  row rather than instead of it, so tabs that are already open change without waiting for a reload.

  ## What was actually wrong before any of this

  The settings modal has had a three-way radio since it was built. It wrote
  `onPreferenceChange('chatMode', mode)` — and nothing in this room ever read `chatMode`. It was the
  purest example of the defect class this repository hunts: a control whose only effect is changing
  its own label. It was modelled at the wrong LEVEL too, as a per-user preference, which could not
  have expressed a presenter act that changes the room for everyone even if something had read it.
  `#lib/chat-mode.ts` carries the rest of that story and what each of the three modes does.
*/

/**
 * Writes the room's chat mode and tells the room.
 *
 * ## The allow-list is DERIVED, not restated
 *
 * `z.enum(CHAT_MODES)` rather than the `isChatMode(mode)` guard the action called. Same three
 * letters, same deny-by-default posture — but sourced from the one exported constant that
 * `#lib/chat-mode.ts` already owns, so a fourth mode cannot be added there and silently refused
 * here. The type flows to the caller as well: `+page.svelte` no longer takes a bare `string` it
 * cannot check.
 *
 * ## Presenter-gated on the SERVER, from the session's own role
 *
 * The radio is presenter-only in the modal too, and a hidden control is not an authorization check.
 * {@link presenterRoom} makes the gate and the room scope one event, so this cannot broadcast into
 * a room the caller is not in.
 *
 * ## No return value, because the client must not believe one
 *
 * The action returned `{ success: true, mode }` and the caller ignored the `mode` — correctly. The
 * answer that matters is the row the server wrote, which `invalidateAll()` re-reads. Handing back a
 * mode for the client to assign would create a second source of truth that could disagree with the
 * row, and the client's copy is the one nobody can audit.
 */
export const changeChatMode = command(z.enum(CHAT_MODES), async (mode) => {
  ensureDatabase();
  const room = presenterRoom();

  db.insert(roomState)
    .values({ roomShortCode: room, chatMode: mode, updatedAt: new Date() })
    /* One row per room, so a second change UPDATES rather than appending a second opinion about
       what the mode is. The conflict target is the primary key. */
    .onConflictDoUpdate({
      target: roomState.roomShortCode,
      set: { chatMode: mode, updatedAt: new Date() }
    })
    .run();

  publishToRoom(room, { channel: 'cmds', data: { cmd: 'changeChatMode', mode } });
});
