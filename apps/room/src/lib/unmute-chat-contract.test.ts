import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  The mute was built end to end. The unmute was a button that raised a toast.

  `mute24` writes a `chat_mutes` row, `sendMessage` refuses while one is live, and the loader hands
  the viewer their own `chatMutedTill` so the composer can explain itself. Every part of that works.
  What did not exist was the way back: `ModalHost.svelte` renders "Unmute Chat", the handler matched
  it in a table of action-to-toast strings, and the ONLY effect was the reference's own alert text.

  That is the failure this guards, and it is the worst-behaved kind — the control reported success.
  A presenter who muted the wrong person saw "user chat unmuted", believed it, and the member stayed
  silenced for the full 24 hours. Nothing threw and nothing logged.

  Upstream it is a command of its own on the wire, carrying `{user}` (main bundle bytes 996325,
  1430505, 2080257, 2376996), reached only through `muteChat(-1)`. There is no button bound directly
  to `unmuteChat`, which is why searching our source for that identifier found nothing to match and
  the gap survived an audit.
*/

const server = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');
const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const events = readFileSync(new URL('./server/room-events.ts', import.meta.url), 'utf8');
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
const serverCode = strip(server);
const pageCode = strip(page);
const eventsCode = strip(events);

describe('the unmute reaches the server', () => {
  it('exists as an action of its own', () => {
    /*
      Not another `messageAction` operation: that one returns 400 without a message id, and this is
      addressed to a user the presenter picked out of the roster, where no message exists.
    */
    expect(serverCode).toContain('unmuteChat: async ({ request, locals }) => {');
  });

  it('is the action the modal button actually posts to', () => {
    expect(pageCode).toContain("await fetch('?/unmuteChat', { method: 'POST', body });");
    expect(pageCode).toContain("body.set('targetUserId', String(user.id));");
  });

  it('is no longer one of the toast-only controls', () => {
    /*
      The negative half, and the one that would have caught the original bug. `exactAlerts` maps an
      action straight to a string; while `unmute-chat` was a key in it, the button could not have
      been doing anything else.
    */
    const table = pageCode.slice(pageCode.indexOf('const exactAlerts'));
    const body = table.slice(0, table.indexOf('};'));
    expect(body).not.toContain('unmute-chat');
  });
});

describe('who is allowed to lift a mute', () => {
  const action = serverCode.slice(serverCode.indexOf('unmuteChat: async'));
  const body = action.slice(0, action.indexOf('saveTheme:'));

  it('decides on the server from the session role', () => {
    expect(body).toContain("requireUser(locals).role === 'staff'");
    expect(body).toContain("requireUser(locals).role === 'admin'");
    expect(body).toContain('if (!isPresenter) return fail(403);');
  });

  it('scopes the lift to the room it was issued in', () => {
    // Authority here is per room; a presenter of one room must not reach into another.
    expect(body).toContain('eq(chatMutes.roomShortCode, requireRoomShortCode(locals))');
  });

  it('validates the target before touching the table', () => {
    expect(body).toContain('if (!Number.isInteger(targetUserId))');
  });
});

describe('how the row is removed', () => {
  const action = serverCode.slice(serverCode.indexOf('unmuteChat: async'));
  const body = action.slice(0, action.indexOf('saveTheme:'));

  it('is one conditional delete, not a read followed by a write', () => {
    /*
      SELECT-then-DELETE is the TOCTOU this repository removes everywhere else. One statement is
      also what makes a double click a no-op instead of a race.
    */
    expect(body).toContain('db.delete(chatMutes)');
    expect(body).not.toContain('db.select');
  });

  it('removes only mutes that are still live', () => {
    /*
      Expired rows are already inert — the loader and `sendMessage` both compare against now — so
      deleting them would erase the record of past mutes and change nothing a member can observe.
    */
    expect(body).toContain('gt(chatMutes.expiresAt, new Date())');
  });
});

describe('the member is told, on the channel meant for one member', () => {
  it('publishes on the per-user private command channel', () => {
    const action = serverCode.slice(serverCode.indexOf('unmuteChat: async'));
    const body = action.slice(0, action.indexOf('saveTheme:'));
    expect(body).toContain("channel: 'privCmds'");
    expect(body).toContain("data: { cmd: 'unmuteChat', targetUserId }");
  });

  it('is a command the event type admits', () => {
    expect(eventsCode).toContain("cmd: 'forceReload' | 'unmuteChat'");
  });

  it('only reacts on the addressed member', () => {
    expect(pageCode).toContain(
      "if (command?.cmd === 'unmuteChat' && command.targetUserId === data.user.id) {"
    );
  });

  it('re-runs the loader, because the gate is server-read', () => {
    /*
      `chatMutedTill` comes from the server. A toast without this would tell the member their chat
      is back while the composer stayed disabled — the same class of lie as the original bug.
    */
    const branch = pageCode.slice(pageCode.indexOf("command?.cmd === 'unmuteChat'"));
    expect(branch.slice(0, branch.indexOf('}'))).toBeTruthy();
    expect(branch.slice(0, 400)).toContain('void invalidateAll();');
  });
});

describe('the two strings stay two strings', () => {
  /*
    The presenter sees `user chat unmuted`; the member sees `Chat enabled`. Both are the capture's,
    on two different screens. Collapsing them would put the presenter's lower-case wording in front
    of the member, which is the sort of drift that only shows up in a screenshot diff.
  */
  it('keeps the presenter alert verbatim, lower-case included', () => {
    expect(pageCode).toContain("bootboxAlert = 'user chat unmuted';");
  });

  it('keeps the member toast verbatim and separate', () => {
    expect(pageCode).toContain(
      "showToast({ kind: 'info', message: 'Chat enabled', enableHtml: false });"
    );
  });
});
