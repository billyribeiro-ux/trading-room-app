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

  It is now a REMOTE COMMAND rather than a `?/unmuteChat` form action, and the assertions below moved
  with it. That migration is the reason this file is worth re-reading rather than skimming: the old
  version sliced `+page.svelte` for `const exactAlerts` to prove the action had left the toast-only
  table, and when that table was extracted to `user-action-intent.ts` the slice returned an empty
  string and the assertion passed against nothing. It is now pointed at the file that owns the table
  AND asserts the table was found, which is the difference between a guard and a decoration.
*/

const server = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');
const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const remote = readFileSync(new URL('../routes/chat-mute.remote.ts', import.meta.url), 'utf8');
const events = readFileSync(new URL('./server/room-events.ts', import.meta.url), 'utf8');
const viteConfig = readFileSync(new URL('../../vite.config.ts', import.meta.url), 'utf8');
const intent = readFileSync(new URL('./user-action-intent.ts', import.meta.url), 'utf8');
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
const serverCode = strip(server);
const pageCode = strip(page);
const remoteCode = strip(remote);
const eventsCode = strip(events);
const viteCode = strip(viteConfig);
const intentCode = strip(intent);

describe('the unmute reaches the server', () => {
  it('is a remote command with its argument validated by a schema', () => {
    /*
      `command(schema, fn)` — the two-argument form. The one-argument form takes no input at all and
      the `'unchecked'` form skips validation, so asserting the schema is passed is what proves the
      exposed endpoint is not simply trusting whatever the client sends it.
    */
    expect(remoteCode).toContain('export const unmuteChat = command(unmuteChatArgs,');
    expect(remoteCode).toContain('const unmuteChatArgs = z.strictObject({');
  });

  it('is no longer ALSO a form action, so there is one way in and not two', () => {
    /*
      The migration's real risk. Leaving `?/unmuteChat` behind would keep an unvalidated,
      role-checked-by-hand endpoint alive next to the validated one, and a later fix to either would
      silently miss the other.
    */
    expect(serverCode).not.toContain('unmuteChat: async');
  });

  it('is the command the modal button actually calls, by name and not by string', () => {
    expect(pageCode).toContain(
      "import { unmuteChat as unmuteChatCommand } from './chat-mute.remote';"
    );
    expect(pageCode).toContain('await unmuteChatCommand({ targetUserId: user.id });');
    // The endpoint-as-a-magic-string this replaced. Its return is what nobody had to check.
    expect(pageCode).not.toContain("fetch('?/unmuteChat'");
  });

  it('is no longer one of the toast-only controls', () => {
    /*
      The negative half, and the one that would have caught the original bug: while `unmute-chat`
      was a key in the action-to-alert table, the button could not have been doing anything else.

      The table now lives in `user-action-intent.ts`, and this asserts it was FOUND before asserting
      what is absent from it. Without that first line this passes just as happily against an empty
      string — which is what it did, silently, for one commit after the table was extracted.
    */
    const start = intentCode.indexOf('const EXACT_ALERTS');
    expect(start).toBeGreaterThan(-1);
    const body = intentCode.slice(start, intentCode.indexOf('};', start));
    expect(body).toContain("'mute-chat-24'");
    expect(body).not.toContain('unmute-chat');
  });
});

describe('who is allowed to lift a mute', () => {
  it('decides on the server from the session role', () => {
    expect(remoteCode).toContain('const { locals } = getRequestEvent();');
    expect(remoteCode).toContain('if (!isPresenterRole(requireUser(locals).role))');
    expect(remoteCode).toContain("error(403, 'Presenters only.');");
  });

  it('scopes the lift to the room it was issued in', () => {
    // Authority here is per room; a presenter of one room must not reach into another.
    expect(remoteCode).toContain('const roomShortCode = requireRoomShortCode(locals);');
    expect(remoteCode).toContain('eq(chatMutes.roomShortCode, roomShortCode)');
  });

  it('validates the target as a positive integer before touching the table', () => {
    /*
      Tighter than the `Number.isInteger` guard it replaces, which admitted 0 and negatives. Every
      `users.id` is an autoincrement primary key, so nothing legitimate is refused.
    */
    expect(remoteCode).toContain('targetUserId: z.number().int().positive()');
  });
});

describe('how the row is removed', () => {
  it('is one conditional delete, not a read followed by a write', () => {
    /*
      SELECT-then-DELETE is the TOCTOU this repository removes everywhere else. One statement is
      also what makes a double click a no-op instead of a race.
    */
    expect(remoteCode).toContain('db.delete(chatMutes)');
    expect(remoteCode).not.toContain('db.select');
  });

  it('removes only mutes that are still live', () => {
    /*
      Expired rows are already inert — the loader and `sendMessage` both compare against now — so
      deleting them would erase the record of past mutes and change nothing a member can observe.
    */
    expect(remoteCode).toContain('gt(chatMutes.expiresAt, new Date())');
  });
});

describe('the member is told, on the channel meant for one member', () => {
  it('publishes on the per-user private command channel', () => {
    expect(remoteCode).toContain("channel: 'privCmds'");
    expect(remoteCode).toContain("data: { cmd: 'unmuteChat', targetUserId }");
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

describe('a refusal is visible', () => {
  /*
    The one behavioural change the migration makes, and the point of it. A form action answered with
    `response.ok === false`, which the call site was free to ignore and did — `void unmuteChat(user)`
    with no handler at all. That is the original bug's exact shape, reintroduced at a different
    layer. A remote command rejects, so the refusal has to be caught to be dropped.
  */
  it('catches the rejection and says so, rather than dropping it', () => {
    const branch = pageCode.slice(pageCode.indexOf("if (action === 'unmute-chat') {"));
    const body = branch.slice(0, branch.indexOf('return;'));
    expect(body).toContain('void unmuteChat(user).catch(() => {');
    expect(body).toContain("bootboxAlert = 'Command failed.';");
  });

  it('still awaits the command inside the wrapper, so a 403 cannot reach invalidateAll', () => {
    // Refreshing the roster after a refused mutation would show the presenter an unchanged list
    // and no reason for it.
    const fn = pageCode.slice(pageCode.indexOf('async function unmuteChat(user: ModalTargetUser)'));
    const body = fn.slice(0, fn.indexOf('\n  }'));
    expect(body.indexOf('await unmuteChatCommand(')).toBeLessThan(
      body.indexOf('await invalidateAll()')
    );
  });
});

describe('the experimental flag and its consumer travel together', () => {
  /*
    Remote functions are opt-in behind `kit.experimental.remoteFunctions`, and the flag lives in
    `vite.config.ts` because this app has no `svelte.config.js` — Kit 3 takes its options through
    the plugin. Two failure modes are worth one assertion each: the flag switched off while a
    `.remote.ts` file still exists (every call 404s at runtime, and nothing here would notice), and
    the flag left behind after the last consumer is deleted, which is the dead configuration this
    repository forbids by name.
  */
  it('has the flag on while a remote file exists', () => {
    expect(viteCode).toContain('experimental: { remoteFunctions: true }');
  });

  it('does not turn on the async compiler option, which nothing here needs', () => {
    /*
      `compilerOptions.experimental.async` is what allows `await` in a component TEMPLATE. Every
      call in this app is `await` inside an event handler, which is ordinary JavaScript. Turning it
      on would change how a 13,000-line component compiles to buy nothing.
    */
    expect(viteCode).not.toContain('async: true');
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
