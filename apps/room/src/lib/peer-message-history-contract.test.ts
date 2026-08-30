import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * "Private message history?" — `getAllUserPM`, and the triage row that was WRONG.
 *
 * ## What the row said, and what reading it found
 *
 * `docs/decoded/missing-settings-triage.md` filed `enablePrivateMessageHistory` under WIRE with
 * "One row in the user-info modal." The button is one row. What it opens was not built:
 * `#all-user-pm-modal` in `ModalHost.svelte` was a permanent `Loading...` spinner with no fetch
 * behind it, no list, no empty state, and — measured — NOTHING in the repository that could open it.
 * `'all-private'` occurred exactly twice: the modal's own `open=` and the union member in
 * `types.ts`.
 *
 * That makes it the second row corrected out of WIRE by reading rather than by re-skimming, after
 * `enableQAReactions`. Both corrections have the same shape: a gate whose surface exists and whose
 * ACTION does not.
 *
 * ## The chain, transcribed
 *
 * ```
 * O(102, e.appService.globals.sessData.enablePrivateMessageHistory ? 102 : -1)   byte 2,068,640
 * hTe: <button ... data-bs-target="#all-user-pm-modal"> <i class="icon fas fa-comment"></i>
 *        Show private messages </button>, click showPrivateMessages()
 * showPrivateMessages(): guiEventBus.emit("doUserPMModal", {peerID, nick})       byte 2,087,336
 * the modal: subscribe -> clearData() -> loadLogs()
 *            -> invokeAdminCmd("getAllUserPM", {peerID})                         byte 2,417,900
 * ```
 */
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

/**
 * One function's body, bounded at BOTH ends.
 *
 * The first draft sliced from the declaration to end-of-file, and the "does not mention `pairKey`"
 * assertion below failed on a LATER function that legitimately uses it. An open-ended slice is not
 * the function; `slice-anchor-contract.test.ts` requires every bound be asserted found, and this is
 * why.
 */
function bodyOf(source: string, declaration: string): string {
  const from = source.indexOf(declaration);
  expect(from, `${declaration} has been renamed or removed`).toBeGreaterThan(-1);
  const to = source.indexOf('\n}', from);
  expect(to, `${declaration} is unterminated`).toBeGreaterThan(from);
  return source.slice(from, to);
}

const remote = read('../routes/private-chat.remote.ts');
const store = read('./server/private-chat.ts');
/*
  READ FROM `room/peer-history.svelte.ts` since 2026-08-30.

  This feature lived on `RoomPrivateChat` and never belonged there: that class is the floating PANEL
  — its tabs, its draft, its paging — and this is a read-only modal opened from the user-info card,
  sharing nothing with it but the word "private". It came out when the panel's paging fix needed
  lines in a file on its ceiling. Nothing about the behaviour changed in the move, which is what the
  assertions below still check; the names lost their `peerHistory` prefix because the class they are
  on now says it.
*/
const room = read('./room/peer-history.svelte.ts');
const modalHost = read('./components/ModalHost.svelte');
const overlays = read('./components/RoomOverlays.svelte');

describe('the server decides, and decides both halves', () => {
  /*
    THE ROLE AND THE ENTITLEMENT, both on the server, and this is the assertion that matters most in
    the file. The 2026-08-07 escalation was a client asserting authority; this read hands a presenter
    another member's private conversations with everybody, so it is the widest read in the room and
    the one where a client-side gate would be worth the least.
  */
  it('refuses a non-presenter before it reads a row', () => {
    const from = remote.indexOf('export const loadPeerPrivateMessageHistory');
    expect(from, 'the command has been renamed or removed').toBeGreaterThan(-1);
    const body = remote.slice(from);
    expect(body).toContain('presenterRoom()');
  });

  it('refuses a room that has not enabled the setting, reading it from the control plane', () => {
    const from = remote.indexOf('export const loadPeerPrivateMessageHistory');
    const body = remote.slice(from);
    // `readRoomConfig`, not the request and not the page's copy of `sessData`.
    expect(body).toContain('await readRoomConfig(locals, room, user.email)');
    expect(body).toContain('config.settings?.enablePrivateMessageHistory !== true');
    /*
      `!== true` and not `=== false`: absent means off. The setting arrives as JSON over an internal
      HTTP hop, so a room that has never been configured must not be treated as having enabled it.
    */
    expect(body).not.toContain('enablePrivateMessageHistory === false');
  });

  it('takes the label from the server too, not from the caller', () => {
    const from = remote.indexOf('export const loadPeerPrivateMessageHistory');
    const body = remote.slice(from);
    // The modal's header names whose private messages these are; a caller-supplied nick could lie.
    expect(body).toContain('nick: peerRow.displayName');
    expect(body).toContain('z.strictObject({ peerId })');
  });
});

describe('the read itself', () => {
  it('spans every conversation the peer had, which is what makes it a moderation read', () => {
    const body = bodyOf(store, 'export function loadPeerHistory');
    expect(body).toContain('eq(privateMessages.roomShortCode, room)');
    expect(body).toContain(
      'or(eq(privateMessages.senderId, peerId), eq(privateMessages.recipientId, peerId))'
    );
    /*
      NOT `pairKey`. That is `loadThread`'s scope — the conversation the CALLER is a party to — and
      reaching for it here would silently answer a different question with the same function name.
    */
    expect(body).not.toContain('pairKey');
  });

  it('is bounded, and says when it cut the answer', () => {
    expect(store).toContain('export const MAX_PEER_HISTORY = 500');
    const body = bodyOf(store, 'export function loadPeerHistory');
    expect(body).toContain('.limit(MAX_PEER_HISTORY + 1)');
    // Asking for one more than the cap is how `truncated` can be known without a second COUNT.
    expect(body).toContain('const truncated = rows.length > MAX_PEER_HISTORY');
    expect(body).toContain('truncated');
  });

  it('keeps the NEWEST when it cuts', () => {
    const body = bodyOf(store, 'export function loadPeerHistory');
    // `desc` then `.reverse()` — a moderator looking at a member is looking at what they did lately.
    expect(body).toContain('desc(privateMessages.createdAt), desc(privateMessages.id)');
    expect(body).toContain('.reverse()');
  });

  it('addresses each row from the ROW, not from the peer', () => {
    const body = bodyOf(store, 'export function loadPeerHistory');
    /*
      `loadThread` computes the other party because it knows both. This spans many conversations, so
      a message from the peer to a third member would come back addressed to the peer if the
      recipient were inferred.
    */
    expect(body).toContain('toMessage(message, sender, message.recipientId)');
  });
});

describe('the room half', () => {
  it('clears before it loads, so no member is labelled with another member’s messages', () => {
    const from = room.indexOf('async show(');
    expect(from, 'the loader has been renamed or removed').toBeGreaterThan(-1);
    const to = room.indexOf('\n  }', from);
    expect(to, 'the loader is unterminated').toBeGreaterThan(from);
    const body = room.slice(from, to);

    // The order IS the behaviour, so the positions are compared rather than the presence.
    const cleared = body.indexOf('this.#history = null');
    const loading = body.indexOf('this.#loading = true');
    const loaded = body.indexOf('await this.#load(');
    expect(cleared).toBeGreaterThan(-1);
    expect(loading).toBeGreaterThan(cleared);
    expect(loaded).toBeGreaterThan(loading);
  });

  it('always stops spinning, even when the server refuses', () => {
    const from = room.indexOf('async show(');
    const to = room.indexOf('\n  }', from);
    const body = room.slice(from, to);
    expect(body).toContain('} finally {');
    expect(body).toContain('this.#loading = false');
  });

  it('is a SECOND command rather than a flag on the thread read', () => {
    /*
      The narrow read and the wide one share a peer id and nothing else. A flag would have given
      them one code path, and only one of the two callers is allowed to take it.

      Both DECLARATIONS stayed on `PrivateChatCommands` when the loader moved out to
      `RoomPeerHistory`: that list is the panel's wire, and the new class is handed the one function
      it needs rather than the whole object.
    */
    const panel = read('./room/private-chat.svelte.ts');
    expect(panel).toContain('loadPeerHistory: (payload: {');
    expect(panel).toContain('loadLog: (payload: {');
  });
});

describe('the wire, end to end', () => {
  it('gates the button on the entitlement', () => {
    expect(modalHost).toContain('{#if privateMessageHistoryEnabled}');
    expect(modalHost).toContain('Show private messages');
    // Const 91: `["icon","fas","fa-comment"]`.
    expect(modalHost).toContain('<i class="icon fas fa-comment"></i>');
  });

  it('reads that entitlement off sessData where the data already is, and fails closed', () => {
    expect(overlays).toContain(
      'privateMessageHistoryEnabled={data.sessData?.enablePrivateMessageHistory === true}'
    );
  });

  it('opens the modal AND asks, because either alone is a broken control', () => {
    const from = overlays.indexOf('onShowPrivateMessages=');
    expect(from, 'the handler has been renamed or removed').toBeGreaterThan(-1);
    const body = overlays.slice(from, from + 300);
    expect(body).toContain("modals.open('all-private')");
    expect(body).toContain('privateChat.peerHistory.show(user.id)');
  });

  it('carries the answer to the modal', () => {
    for (const prop of [
      /*
        ONE prop since 2026-08-30, not three. Three parallel props that are one idea is the shape
        this session corrected twice in a day — the capture settings were the other — and each hop
        between the class and the modal was carrying all three.
      */
      'peerHistory={privateChat.peerHistory}'
    ]) {
      expect(overlays).toContain(prop);
    }
  });

  /*
    THE MODAL IS NO LONGER A PERMANENT SPINNER, which is the defect this whole change closes. Both
    branches the reference has, plus the two it does not: a refusal (its fetch cannot refuse; ours
    can) and a truncation notice (it asks for everything and gets everything; ours is bounded).
  */
  it('renders the log, the empty state, the refusal and the truncation notice', () => {
    expect(modalHost).toContain('{#if peerHistory.loading}');
    expect(modalHost).toContain('{:else if peerHistory.error}');
    expect(modalHost).toContain('<CompactMessageRow {message} />');
    expect(modalHost).toContain('No logs.');
    expect(modalHost).toContain('older ones are not listed');
  });
});

/*
  THE ROW IS SHARED, and this is asserted because writing it twice was the alternative on the table.

  `app-st-compactmessage` is one component upstream rendered by two surfaces. It was inline markup
  inside `PrivateChatPanel.svelte` here, and the modal needed the same rows — so the choice was a
  second copy of a transcription, or an extraction. A transcription written twice is two
  transcriptions: the next capture correction lands on one of them and both keep passing.
*/
describe('one row, one definition', () => {
  it('is a component both surfaces render', () => {
    const panel = read('./components/PrivateChatPanel.svelte');
    for (const file of [panel, modalHost]) {
      expect(file).toContain(
        "import CompactMessageRow from '#lib/components/CompactMessageRow.svelte'"
      );
      expect(file).toContain('<CompactMessageRow {message} />');
    }
  });

  it('and neither surface still carries the markup itself', () => {
    const panel = read('./components/PrivateChatPanel.svelte');
    for (const file of [panel, modalHost]) {
      expect(file).not.toContain('<app-st-compactmessage');
    }
  });
});
