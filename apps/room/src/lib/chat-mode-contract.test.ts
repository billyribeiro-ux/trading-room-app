import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

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
const MODAL = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');
const SCHEMA = readFileSync(new URL('./server/db/schema.ts', import.meta.url), 'utf8');
const DB = readFileSync(new URL('./server/db/index.ts', import.meta.url), 'utf8');
const CSS = readFileSync(new URL('../app.css', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const serverCode = stripComments(SERVER);
const pageCode = stripComments(PAGE);
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

describe('the action', () => {
  it('is presenter-only, checked on the SERVER', () => {
    const from = serverCode.indexOf('changeChatMode: async');
    expect(from, 'the action must exist').toBeGreaterThan(-1);
    const action = serverCode.slice(from, serverCode.indexOf('getMyMobilePin: async', from));
    // A hidden radio is not an authorization check.
    expect(action).toContain('if (!isPresenterRole(user.role)) return fail(403');
    expect(action).toContain('requireRoomShortCode(locals)');
    expect(action).not.toContain("data.get('roomShortCode')");
  });

  it('refuses any mode that is not one of the three letters', () => {
    expect(serverCode).toContain('if (!isChatMode(mode)) return fail(400');
  });

  it('upserts rather than appending a second opinion about the mode', () => {
    expect(serverCode).toContain('.onConflictDoUpdate({');
    expect(serverCode).toContain('target: roomState.roomShortCode,');
  });

  it('broadcasts, so tabs already open follow the presenter', () => {
    expect(serverCode).toContain(
      "publishToRoom(roomShortCode, { channel: 'cmds', data: { cmd: 'changeChatMode', mode } });"
    );
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

  it('and the broadcast makes it REFETCH rather than assigning a mode', () => {
    /*
      A deliberate exception to "the command channel does not refetch — it ACTS". That rule is right
      for a command like `mutemic`, which is an instruction with nothing to re-read. A chat mode is
      state.
    */
    const from = pageCode.indexOf("if (command?.cmd === 'changeChatMode')");
    expect(from).toBeGreaterThan(-1);
    const branch = pageCode.slice(from, from + 260);
    expect(branch).toContain('void invalidateAll();');
    // Trusting the payload would put room policy in the gift of whatever arrives on a socket.
    expect(branch).not.toContain('command.mode');
  });
});

describe('what each mode does', () => {
  it('`d` replaces the composer with the captured Chat Disabled block', () => {
    // `<div class="chatDisabled d-flex align-items-center"><h5 class="pl-3"><i class="fas fa-lock">`
    expect(pageCode).toContain('{#if !chatEnabled}');
    expect(pageCode).toContain('<div class="chatDisabled d-flex align-items-center">');
    expect(pageCode).toContain('<h5 class="pl-3">');
    expect(pageCode).toContain('<i class="fas fa-lock"></i> Chat Disabled');
    expect(CSS).toContain('.chatDisabled {');
  });

  it('and a MUTED viewer reaches the same block, which was enforced but never shown', () => {
    /*
      `sendMessage` has always refused while a live `chat_mutes` row exists, and the client was
      never told — so a muted member typed, pressed send, and watched nothing happen.
    */
    expect(serverCode).toContain('chatMutedTill:');
    expect(pageCode).toContain(
      'const chatEnabled = $derived(chatComposerEnabled(chatMode) && selfMutedUntil === null);'
    );
  });

  it('the mute suffix is the captured string, not an approximation of it', () => {
    // `Ne(' till ', Ct(2, 1, e.chatMutedTill, 'EEE @ h:mm a'), '')`
    expect(pageCode).toContain('till {formatChatMutedTill(selfMutedUntil)}');
  });

  it('`p` draws the captured banner, tooltip and all', () => {
    expect(pageCode).toContain('{#if webinarMode}');
    expect(pageCode).toContain('<div class="px-1 webinarMode">');
    expect(pageCode).toContain(
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
    expect(pageCode).toContain('webinarMessageVisible(');
    expect(pageCode).toContain('hasAdminChat: data.user.hasAdminChat === true');
    // One mention rule, shared with the highlight and the popup — not a second `indexOf('@')`.
    expect(pageCode).toContain(
      'isMention: isMentionOf(item.body, data.user.displayName, item.isAdmin === true)'
    );
  });
});
