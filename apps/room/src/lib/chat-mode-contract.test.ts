import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { chatModeConfirmPrompt } from './chat-mode';

/*
  The chat mode control, end to end — and the reason this file exists is that it did NOTHING.

  The settings modal has had a three-way radio since it was built: Group Chat, Webinar Mode,
  Disabled. It wrote `onPreferenceChange('chatMode', mode)`, confirmed itself with a dialog, and
  **nothing in this room ever read `chatMode`**. It was the purest example of the defect class this
  repository hunts: a control whose only effect is changing its own label.

  It was also modelled at the wrong LEVEL. Upstream reads `sessData.chatMode` — ROOM state — and the
  control is `sendServerAdminCommand('changeChatMode', {mode})`, a presenter act that changes the
  room for everyone. A per-user preference could not have expressed that even if something had read
  it, which is why the fix is a table and an action rather than a mapping row.

  `TODO.md` row AB recorded this as "the producer is not modelled, so the listener would be dead".
  That was wrong in both halves: the producer existed, and the behaviour is fully specified in the
  bundle.
*/

const SERVER = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
/*
  The RECEIVING half moved to `RoomEventStream` in Phase 5 slice 5. The sending half — the
  presenter's `changeChatMode` wrapper — stayed on the page, so both files are named and each
  assertion reads the one that owns its subject.
*/
const EVENTS = readFileSync(new URL('./room/events.svelte.ts', import.meta.url), 'utf8');
/*
  What each MODE draws — the Chat Disabled block, the mute suffix and the webinar banner — moved to
  `AlertChatArea.svelte` on 2026-08-15. What DECIDES the mode did not: the refetch, the derived and
  the `=== true` comparisons are still read from the page below.
*/
const PANE = readFileSync(new URL('./components/AlertChatArea.svelte', import.meta.url), 'utf8');
const MODAL = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');
const SCHEMA = readFileSync(new URL('./server/db/schema.ts', import.meta.url), 'utf8');
const DB = readFileSync(new URL('./server/db/index.ts', import.meta.url), 'utf8');
const CSS = readFileSync(new URL('../app.css', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const serverCode = stripComments(SERVER);
/*
  The read pipelines left the page for `RoomFeeds` in Phase 5 slice 9. Read as their own source, so
  an assertion about what a pane renders cannot pass against a file that no longer builds it.
*/
const feedsModule = readFileSync(new URL('room/feeds.svelte.ts', import.meta.url), 'utf8');
const pageCode = stripComments(PAGE);
const eventsCode = stripComments(EVENTS);
const paneCode = stripComments(PANE);
const modalCode = stripComments(MODAL);

describe('the mode is ROOM state, not a preference', () => {
  it('there is a row per room that persists it', () => {
    /*
      Persisted, unlike the recording state beside it. Recording is momentary and a late joiner has
      missed nothing; a disabled chat is a standing fact, and somebody arriving afterwards has to
      find it disabled.
    */
    expect(SCHEMA).toContain("export const roomState = sqliteTable('room_state'");
    expect(SCHEMA).toContain("roomShortCode: text('room_short_code').primaryKey()");
    expect(SCHEMA).toContain("chatMode: text('chat_mode').notNull().default('g')");
    expect(DB).toContain('CREATE TABLE IF NOT EXISTS room_state');
  });

  it('the modal no longer writes it as a per-user preference', () => {
    // The whole defect in one line. It persisted, and nothing read it back.
    expect(modalCode).not.toContain("onPreferenceChange('chatMode'");
    expect(modalCode).toContain('onChatModeChange(mode);');
  });

  it('and the radio shows what the ROOM is, not what this browser last clicked', () => {
    // Was `$state('g')`, seeded to group chat on every open regardless of the room.
    expect(modalCode).not.toContain("let groupChatMode = $state('g');");
    expect(modalCode).toContain('const groupChatMode = $derived(chatMode);');
  });
});

describe('the confirm, which the two radios spelled two different ways', () => {
  it('is the capture’s sentence, quotes and question mark included', () => {
    /*
      `let o = '"Group Chat"?'; 'p' == e ? (o = '"Webinar Mode"?') : 'd' == e && (o = '"Disabled"?');`
      then `bootbox.confirm('Are you sure you want to change the chat mode to ' + o, …)`.

      The `?` belongs to the LABEL, so the prefix carries none of its own — reproduced rather than
      tidied, because the sentence is what a presenter reads before changing the room for everyone.
    */
    expect(chatModeConfirmPrompt('g')).toBe(
      'Are you sure you want to change the chat mode to "Group Chat"?'
    );
    expect(chatModeConfirmPrompt('p')).toBe(
      'Are you sure you want to change the chat mode to "Webinar Mode"?'
    );
    expect(chatModeConfirmPrompt('d')).toBe(
      'Are you sure you want to change the chat mode to "Disabled"?'
    );
  });

  it('and BOTH radios ask it, where the session one used to show the raw letter', () => {
    /*
      The defect this extraction found. `requestSessionChatMode` interpolated `${mode}` directly, so
      the session modal asked "are you sure you want to change the chat mode to p" while the
      settings modal — the same control, the same three values — asked it properly. One copy right
      and one wrong is what duplicated copy always eventually becomes.
    */
    expect(modalCode).toContain(
      'onConfirm(chatModeConfirmPrompt(mode), () => applyGroupChatMode(mode));'
    );
    expect(modalCode.split('chatModeConfirmPrompt(mode)').length - 1).toBe(2);
    expect(modalCode).not.toContain('change the chat mode to ${mode}');
    expect(modalCode).not.toContain("mode === 'p' ? '\"Webinar Mode\"?'");
  });
});

/*
  The command — and a note on why these assertions no longer SLICE.

  This block used to carve the action out of `+page.server.ts` with
  `serverCode.slice(from, serverCode.indexOf('getMyMobilePin: async', from))`. That end marker
  stopped existing the day `getMyMobilePin` became a remote function, so `indexOf` returned -1 and
  the slice ran from `changeChatMode` to the second-to-last character of a 2,700-line file. Every
  assertion below still passed — against the whole rest of the file, matching lines belonging to
  actions that have nothing to do with the chat mode.

  Nothing went red, which is the point: it is the same failure as the `exactAlerts` slice that
  silently became `''`. A slice whose end marker can vanish is a guard that quietly widens to
  everything. The command has a file of its own now, so there is nothing to slice — the file IS the
  span, and a marker that disappears takes the `indexOf` assertion with it.
*/
const CHAT_MODE_COMMAND = readFileSync(
  new URL('../routes/chat-mode.remote.ts', import.meta.url),
  'utf8'
);
const commandCode = stripComments(CHAT_MODE_COMMAND);

describe('the command', () => {
  it('is presenter-only, checked on the SERVER, and scoped by the same call', () => {
    // A hidden radio is not an authorization check.
    expect(commandCode).toContain('const room = presenterRoom();');
    /*
      `presenterRoom()` returns the room only AFTER the role check, so the gate and the tenant scope
      cannot be applied separately. The room comes from the SESSION, and the argument schema below
      is a bare `z.enum` with nowhere to put a room even if a caller sent one — a `roomShortCode` on
      the argument would let a presenter of room A rewrite room B's policy.
    */
    expect(commandCode).not.toContain('requireRoomShortCode');
    expect(commandCode).not.toContain('z.strictObject');
  });

  it('refuses any mode that is not one of the three letters, from the ONE constant', () => {
    /*
      `z.enum(CHAT_MODES)` and not a hand-called `isChatMode`. Same three letters, deny-by-default
      either way — but derived from what `#lib/chat-mode.ts` exports, so a fourth mode cannot be
      added there and silently refused here.
    */
    expect(commandCode).toContain('command(z.enum(CHAT_MODES), async (mode)');
    /*
      Two facts asserted separately, because they are two. Matching the whole import LINE was the
      first shape and it broke on 2026-08-30 when `CHAT_MODE_LABELS` joined the same statement for
      the Session History entry — a change that says nothing about where the enum comes from. What
      matters is that `CHAT_MODES` is imported and that the module it comes from is `chat-mode.ts`.
    */
    expect(commandCode).toMatch(/import \{[^}]*\bCHAT_MODES\b[^}]*\} from '#lib\/chat-mode\.js'/);
  });

  it('upserts rather than appending a second opinion about the mode', () => {
    expect(commandCode).toContain('.onConflictDoUpdate({');
    expect(commandCode).toContain('target: roomState.roomShortCode,');
  });

  it('broadcasts, so tabs already open follow the presenter', () => {
    expect(commandCode).toContain(
      "publishToRoom(room, { channel: 'cmds', data: { cmd: 'changeChatMode', mode } });"
    );
  });

  it('returns nothing, so the client cannot assign a mode it was handed', () => {
    /*
      The action returned `{ success: true, mode }` and the caller ignored the `mode` — correctly.
      Handing one back invites a second source of truth that can disagree with the row.
    */
    expect(commandCode).not.toContain('return { success: true');
    expect(commandCode).not.toContain('return { mode');
  });

  it('and the form action it replaced is gone from the file that held it', () => {
    /*
      Pointed at `+page.server.ts` deliberately: that file DID hold this action, so the two
      `not.toContain`s below are a real guard rather than a search of a file that never had it.

      THE ANCHOR CHANGED ON 2026-08-30 and the reason is worth keeping. It used to be
      `toContain('export const actions: Actions = {')` — present-tense proof that this string is the
      file where actions live. That export is gone: `logout` was the last one and nothing could
      invoke it, so the whole thing went. An anchor that names a construct which no longer exists
      fails for the right reason exactly once and then has to be replaced, and replacing it with
      nothing is how a negative assertion starts passing because it is reading the wrong file.

      So the anchor is now the load, which is what this file does export, plus the stronger fact the
      deletion bought: there are no actions here AT ALL. `changeChatMode` cannot come back as an
      action without failing the second assertion, whatever it is called.
    */
    expect(serverCode, 'this is still +page.server.ts').toContain('export const load');
    expect(serverCode, 'and it exports no form actions at all now').not.toContain(
      'export const actions'
    );
    expect(serverCode).not.toContain('changeChatMode: async');
    expect(serverCode).not.toContain('if (!isChatMode(mode)) return fail(400');
  });
});

describe('the client reads the ROW, never the broadcast', () => {
  it('the mode is derived from the load', () => {
    /*
      No local copy. A second source of truth could disagree with the row, and the client's copy
      would be the one nobody could audit.
    */
    expect(pageCode).toContain(
      "const chatMode = $derived(isChatMode(data.chatMode) ? data.chatMode : 'g');"
    );
  });

  it('and it refetches ONLY on the path where the write actually happened', () => {
    /*
      The `fetch` version read `if (result.type !== 'success') return` before invalidating. A
      rejected command throws instead, so the equivalent is a `return` inside the catch — without
      it, a refused change would re-read the unchanged row and redraw the radio at the mode the
      presenter did not pick, which looks exactly like a successful no-op.

      The catch logs rather than swallowing. Nothing is shown to the presenter, because upstream
      shows nothing either and inventing a toast would change what the room does.
    */
    const from = pageCode.indexOf('async function changeChatMode(');
    expect(from, 'the client wrapper must exist').toBeGreaterThan(-1);
    const wrapper = pageCode.slice(from, pageCode.indexOf('\n  }', from));
    expect(wrapper).toContain('await changeChatModeCommand(mode);');
    expect(wrapper).toContain("console.error('changeChatMode', mode, error);");
    expect(wrapper).toContain('return;');
    expect(wrapper).not.toContain("fetch('?/changeChatMode'");
  });

  it('and the broadcast makes it REFETCH rather than assigning a mode', () => {
    /*
      A deliberate exception to "the command channel does not refetch — it ACTS". That rule is right
      for a command like `mutemic`, which is an instruction with nothing to re-read. A chat mode is
      state.
    */
    const from = eventsCode.indexOf("if (command?.cmd === 'changeChatMode')");
    expect(from).toBeGreaterThan(-1);
    const branch = eventsCode.slice(from, from + 260);
    expect(branch).toContain('void invalidateAll();');
    // Trusting the payload would put room policy in the gift of whatever arrives on a socket.
    expect(branch).not.toContain('command.mode');
  });
});

describe('what each mode does', () => {
  it('`d` replaces the composer with the captured Chat Disabled block', () => {
    // `<div class="chatDisabled d-flex align-items-center"><h5 class="pl-3"><i class="fas fa-lock">`
    expect(paneCode).toContain('{#if !chatEnabled}');
    expect(paneCode).toContain('<div class="chatDisabled d-flex align-items-center">');
    expect(paneCode).toContain('<h5 class="pl-3">');
    expect(paneCode).toContain('<i class="fas fa-lock"></i> Chat Disabled');
    expect(CSS).toContain('.chatDisabled {');
    // The pane draws it; the page decides it. Both halves, or the gate could arrive from nothing.
    expect(pageCode).toContain('{chatEnabled}');
  });

  it('and a MUTED viewer reaches the same block, which was enforced but never shown', () => {
    /*
      `sendMessage` has always refused while a live `chat_mutes` row exists, and the client was
      never told — so a muted member typed, pressed send, and watched nothing happen.
    */
    expect(serverCode).toContain('chatMutedTill:');
    expect(pageCode).toContain('mutedUntil: selfMutedUntil');
  });

  /*
    ALL THREE reasons reach the one derivation, asserted as three arguments rather than as one
    source line.

    This used to pin the line verbatim —
    `const chatEnabled = $derived(chatComposerEnabled(chatMode) && selfMutedUntil === null);` — and
    that pin did its job twice over: it went red the moment the third reason was added on
    2026-08-28, which is exactly when somebody should look. What it could not do is say WHY, or
    notice a term quietly disappearing from a rewritten expression that still parsed.

    So it asks for the three inputs by name instead. The rule itself, its transcription and its truth
    table are in `chat-mode.ts` and `chat-mode.test.ts`; what this file guards is that the PAGE still
    feeds it all three, which is the half a unit test cannot see.
  */
  it('feeds the composer gate all three of the reference reasons', () => {
    expect(pageCode).toContain('chatComposerAvailable({');
    expect(pageCode).toContain('mode: chatMode');
    expect(pageCode).toContain('mutedUntil: selfMutedUntil');
    expect(pageCode).toContain('isFreeTrial: data.user.isFT === true');
    expect(pageCode).toContain(
      'chatDisabledForTrials: data.sessData?.chatDisabledForTrials === true'
    );
  });

  it('the mute suffix is the captured string, not an approximation of it', () => {
    // `Ne(' till ', Ct(2, 1, e.chatMutedTill, 'EEE @ h:mm a'), '')`
    expect(paneCode).toContain('till {formatChatMutedTill(selfMutedUntil)}');
  });

  it('`p` draws the captured banner, tooltip and all', () => {
    expect(paneCode).toContain('{#if webinarMode}');
    expect(paneCode).toContain('<div class="px-1 webinarMode">');
    expect(paneCode).toContain(
      'In webinar mode users only see their own chat messages, while Presenters see everyones messages...'
    );
    expect(CSS).toContain('.webinarMode {');
  });

  it('and `p` actually FILTERS, so the banner is not a promise the room breaks', () => {
    /*
      The half that makes the banner honest. Upstream drops messages as they arrive; this room
      re-reads its log from the server on every invalidate, so a drop-on-arrival would be undone by
      the next load — it is a view filter here instead.
    */
    expect(feedsModule).toContain('webinarMessageVisible(');
    expect(feedsModule).toContain('hasAdminChat: this.#session().user.hasAdminChat === true');
    // One mention rule, shared with the highlight and the popup — not a second `indexOf('@')`.
    // Asserted on the three ARGUMENTS rather than on one line: prettier wraps this call, and a
    // test that breaks on a reformat is a test about formatting.
    const call = feedsModule.slice(feedsModule.indexOf('isMention: isMentionOf('));
    const args = call.slice(0, 220);
    expect(args).toContain('item.body');
    expect(args).toContain('this.#session().user.displayName');
    expect(args).toContain('item.isAdmin === true');
  });
});
