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
/*
  THE 36 CONSTRUCTIONS MOVED TO `create-room.svelte.ts` on 2026-08-17 (Phase 5, S7).

  `+page.svelte` held 740 lines of `new Room*()` across 22 non-contiguous runs. They are now one
  composition root, and the page destructures what it returns — so every reference like `prefs.x`
  still reads exactly as before, and only the CONSTRUCTION text changed address.

  Assertions about how a class is WIRED read `ROOT`. Assertions about what the page DECIDES still
  read `PAGE`, because that is still where the argument is built.
*/
const ROOT = readFileSync(new URL('./room/create-room.svelte.ts', import.meta.url), 'utf8');
/** `RoomPrivateCommands` — the addressed channel, and the one gate that makes it addressed. */
const privCmdsCode = readFileSync(
  new URL('./room/private-commands.svelte.ts', import.meta.url),
  'utf8'
);
/** `RoomChatMute` — the browser half, both directions and both ends, since 2026-08-23. */
const chatMuteCode = readFileSync(new URL('./room/chat-mute.svelte.ts', import.meta.url), 'utf8');
/** `applyChatMute` — the one insert and the one announcement, which both doors call. */
const muteCode = readFileSync(new URL('./server/chat-mute.ts', import.meta.url), 'utf8');
/** The message context menu's door, which must no longer hold a copy of the insert. */
const messageActionsCode = readFileSync(
  new URL('../routes/message-actions.remote.ts', import.meta.url),
  'utf8'
);
const rootCode = ROOT.replace(/\/\*[\s\S]*?\*\//g, '');
const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const remote = readFileSync(new URL('../routes/chat-mute.remote.ts', import.meta.url), 'utf8');
/*
  The unmute CALL SITE left the page for `RoomUserActions` in Phase 5 slice 13. The page still
  imports the command and hands it in, so both halves are read: the page supplies it, and the class
  is what awaits it and catches the refusal.
*/
const userActions = readFileSync(new URL('room/user-actions.svelte.ts', import.meta.url), 'utf8');
const events = readFileSync(new URL('./server/room-events.ts', import.meta.url), 'utf8');
// The CLIENT half. Named `stream` because `events` above is the SERVER publisher - two ends of
// one channel, and confusing them is how an assertion ends up proving the sender to itself.
const streamCode = readFileSync(new URL('./room/events.svelte.ts', import.meta.url), 'utf8');
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
    /*
      The import travelled with the `RoomUserActions` construction that uses it, into the
      composition root (S7) — so the path is module-relative now, not page-relative. The property
      being asserted is unchanged and is the whole point of this test: the command is reached by
      NAME through a real import, so deleting it is a compile error rather than a silent no-op.
    */
    /*
      The alias went on 2026-08-23 — `unmuteChat` is not otherwise bound in the composition root, so
      it was never needed, and dropping it let the whole `commands` object sit on one line. The
      PROPERTY being asserted is unchanged and is still the whole point: the command is reached by
      NAME through a real import, so deleting it is a compile error rather than a silent no-op.
      Property shorthand keeps that property exactly — `unmuteChat` IS `unmuteChat: unmuteChat`.
    */
    /*
      `muteChat` joined the import on 2026-08-23 when the modal's " Mute Chat for 24hrs " button was
      wired. Both names are asserted together rather than the line being loosened to a substring:
      the pair is the point, and an import that quietly lost one of them should fail here.
    */
    expect(rootCode).toContain(
      "import { muteChat, unmuteChat } from '../../routes/chat-mute.remote';"
    );
    // The ROOT hands the command in; the CLASS is what calls it. Both ends asserted, because
    // either alone passes with the wire cut.
    expect(rootCode).toMatch(/commands: \{[^}]*\bunmuteChat\b/);
    /*
      RE-POINTED 2026-08-23: the two senders left `RoomUserActions` for `RoomChatMute`, so the class
      that CALLS the command is the slice now. Both ends are still asserted and there is one more of
      them than before — the composition root's import, the root's hand-off into `commands`, and the
      slice's own call — because a re-point is the moment to assert the hand-off as well.
    */
    expect(chatMuteCode).toContain('await this.#commands.unmuteChat({ targetUserId });');
    expect(userActions, 'and the class that used to own it now delegates').toContain(
      'if (this.#chatMute.handle(action, user.id)) return;'
    );
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
    /*
      The NEIGHBOUR was `'mute-chat-24'` until 2026-08-23, when that button was wired too and left
      the table for the same reason. `'mute-chat-indefinitely'` takes its place here: it is still a
      real entry, still honestly listed, and blocked on a controller door rather than on evidence —
      so it is the live proof that this test is reading a populated table and not an empty slice.
    */
    expect(body).toContain("'mute-chat-indefinitely'");
    expect(body).not.toContain("'unmute-chat'");
    expect(body).not.toContain("'mute-chat-24'");
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

/*
  THE MUTE'S OWN HALF, ADDED 2026-08-23 — and it exists because its absence was MEASURED.

  Deleting the `publishToUsers` call out of `applyChatMute` entirely and re-running everything that
  covers the mute left the suite GREEN. The receiver was asserted, the branch was asserted, the alert
  wording was asserted — and nothing at all said the server ever announces a mute. That is precisely
  the shape of the defect being fixed: enforcement with no announcement, invisible until a member
  sits in front of a composer that has silently stopped working.

  A control that cannot fail is worse than no control, so this block is the negative control's
  answer rather than a copy of the unmute's for symmetry.
*/
describe('the mute is ANNOUNCED, not only enforced', () => {
  it('writes the row and publishes, in that order, from one function', () => {
    /*
      ORDER IS ASSERTED, and it is the reverse of `kickUser`'s. The kick writes its ban first because
      publishing first would disconnect the member while the write was still in flight. Here the
      frame disconnects nobody — it describes a row — so announcing a mute whose insert then failed
      would be the lie, and the insert goes first.
    */
    const insert = muteCode.indexOf('db.insert(chatMutes)');
    const publish = muteCode.indexOf('publishToUsers(room, [targetUserId]');
    expect(insert).toBeGreaterThan(-1);
    expect(publish).toBeGreaterThan(insert);
  });

  it('addresses the one member, and carries the instant rather than a composed sentence', () => {
    /*
      `mutedTill` is an ISO string on purpose. Upstream sends `msg` and renders it with
      `bootbox.alert(xe.msg)`, but that sentence is built by a server that is not in the capture, so
      composing one here would be inventing evidence. The receiver assembles the text from the two
      fragments this repository DID read off the reference.
    */
    expect(muteCode).toContain("channel: 'privCmds'");
    expect(muteCode).toContain(
      "data: { cmd: 'muteChat', targetUserId, mutedTill: expiresAt.toISOString() }"
    );
  });

  it('has ONE insert, reached by both doors', () => {
    /*
      The modal button and the message context menu are two doors onto the same act. A second copy of
      the insert is how `internal/room-ban` shipped a ban that enforced nothing earlier the same day
      — it hand-copied a mapping instead of calling it.
    */
    expect(muteCode.match(/db\.insert\(chatMutes\)/g) ?? []).toHaveLength(1);
    expect(messageActionsCode).not.toContain('db.insert(chatMutes)');
    expect(messageActionsCode).toContain('applyChatMute(room, args.targetUserId, user.id);');
    expect(remoteCode).toContain('applyChatMute(roomShortCode, targetUserId, caller.id);');
  });

  it('decides the authority on the server, exactly as the unmute does', () => {
    // A member who POSTs this endpoint directly must get a 403, not the power to silence somebody.
    const start = remoteCode.indexOf('export const muteChat');
    expect(
      start,
      'the mute command was FOUND before anything was sliced out of it'
    ).toBeGreaterThan(-1);
    const end = remoteCode.indexOf('export const unmuteChat', start);
    expect(end).toBeGreaterThan(start);
    expect(remoteCode.slice(start, end)).toContain(
      "if (!isPresenterRole(caller.role)) error(403, 'Presenters only.');"
    );
  });

  it('only reacts on the addressed member, and re-runs the loader', () => {
    /*
      The reload moved WITH the receiver. It is asserted on the slice that now performs it rather
      than on the router that dispatches to it — a test still looking for it in the router would go
      red for a refactor that changed no behaviour, which is the failure mode this file's own note
      about `cmd: 'forceReload' | 'unmuteChat'` records.
    */
    /*
      RE-POINTED 2026-08-23: the whole addressed channel moved to `RoomPrivateCommands`, and the
      `targetUserId` test moved with it — from four copies, one per branch, to ONE early return.

      That is why this now asserts the GATE separately from the BRANCH. The old form could only say
      "this branch tests the target"; the new form says "no branch on this channel is reachable
      without the test", which is the property that actually matters and which no per-branch
      assertion could ever establish.
    */
    expect(privCmdsCode).toContain('if (command.targetUserId !== this.#viewerId()) return false;');
    const branch = privCmdsCode.indexOf("command.cmd === 'muteChat'");
    expect(branch, 'the branch was FOUND before its body was read').toBeGreaterThan(-1);
    expect(privCmdsCode.slice(branch, branch + 200)).toContain(
      'this.#chatMute.muted(command.mutedTill);'
    );
    // ...and the router still recognises the channel and hands it over with a way to disconnect.
    expect(streamCode).toContain('this.#privateCommands.handle(');
    const muted = chatMuteCode.indexOf('muted(mutedTill: unknown): void {');
    expect(muted).toBeGreaterThan(-1);
    expect(chatMuteCode.slice(muted, muted + 200)).toContain('void invalidateAll();');
  });
});

describe('the member is told, on the channel meant for one member', () => {
  it('publishes on the per-user private command channel', () => {
    expect(remoteCode).toContain("channel: 'privCmds'");
    expect(remoteCode).toContain("data: { cmd: 'unmuteChat', targetUserId }");
  });

  it('is a command the event type admits', () => {
    /*
      Asserts MEMBERSHIP, not the whole union. This pinned the exact string
      `cmd: 'forceReload' | 'unmuteChat'` and therefore went red on 2026-08-23 for a change that did
      nothing to unmute — adding `kickUser` beside it. A test for "unmuteChat is admitted" should not
      fail because a THIRD command was admitted; that is the union's business, not this file's.
    */
    expect(eventsCode).toContain("channel: 'privCmds'");
    expect(eventsCode).toMatch(/cmd: '[^']*'( \| '[^']*')*/);
    expect(eventsCode).toContain("'unmuteChat'");
  });

  it('only reacts on the addressed member', () => {
    // The receiving dispatch moved to `RoomEventStream` in Phase 5 slice 5.
    /*
      ONE gate for the channel, not one per branch — see the note in the mute block above. Asserted
      as the gate plus the branch, because the pair is what makes "only the addressed member" true.
    */
    expect(privCmdsCode).toContain('if (command.targetUserId !== this.#viewerId()) return false;');
    expect(privCmdsCode).toContain("if (command.cmd === 'unmuteChat') {");
  });

  it('re-runs the loader, because the gate is server-read', () => {
    /*
      `chatMutedTill` comes from the server. A toast without this would tell the member their chat
      is back while the composer stayed disabled — the same class of lie as the original bug.
    */
    const at = privCmdsCode.indexOf("command.cmd === 'unmuteChat'");
    expect(at, 'the branch was FOUND before its body was read').toBeGreaterThan(-1);
    expect(privCmdsCode.slice(at, at + 200)).toContain('this.#chatMute.unmuted();');
    const unmuted = chatMuteCode.indexOf('unmuted(): void {');
    expect(unmuted).toBeGreaterThan(-1);
    expect(chatMuteCode.slice(unmuted, unmuted + 200)).toContain('void invalidateAll();');
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
    /*
      The refusal handling moved into `#announceThenSend` on 2026-08-23 — `unmute-chat` and
      `force-reload` were byte-identical in shape, so the invariant is declared once and both call
      it. The branch is now the CALL; the `Command failed.` replacement is asserted at the helper,
      which is the only place it can now live.

      RE-POINTED later the same day: the branch itself moved to `RoomChatMute`, and the helper did
      NOT — it is still `RoomUserActions`' private method, INJECTED into the slice rather than
      copied. So the two halves are asserted in the two files that hold them, plus the injection
      that joins them. That third assertion is new and is the one a copy would break.
    */
    const at = chatMuteCode.indexOf("if (action === 'unmute-chat') {");
    expect(at, 'the branch was FOUND before its body was read').toBeGreaterThan(-1);
    const end = chatMuteCode.indexOf('return true;', at);
    expect(end).toBeGreaterThan(at);
    expect(chatMuteCode.slice(at, end)).toContain("this.#announceThenSend('user chat unmuted'");
    expect(
      userActions,
      'the refusal is still visible, in the class that owns the helper'
    ).toContain("this.#dialogs.alert = 'Command failed.';");
    expect(
      userActions,
      'and the slice is HANDED that helper rather than holding a copy of it'
    ).toContain('announceThenSend: (message, send) => this.#announceThenSend(message, send)');
  });

  it('still awaits the command inside the wrapper, so a 403 cannot reach invalidateAll', () => {
    // Refreshing the roster after a refused mutation would show the presenter an unchanged list
    // and no reason for it.
    const at = chatMuteCode.indexOf('async unmute(targetUserId: number): Promise<void> {');
    expect(at, 'the sender was FOUND before its body was read').toBeGreaterThan(-1);
    const end = chatMuteCode.indexOf('\n  }', at);
    const body = chatMuteCode.slice(at, end);
    const send = body.indexOf('await this.#commands.unmuteChat(');
    const reload = body.indexOf('await this.#reload()');
    expect(send).toBeGreaterThan(-1);
    expect(reload).toBeGreaterThan(-1);
    expect(send).toBeLessThan(reload);
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
    /*
      The captured string itself, wherever it is raised from — that is what must stay verbatim. It
      moved to `RoomChatMute` with the branch on 2026-08-23, and its MUTE counterpart is asserted
      beside it now, which the single-sided version could not do because only one of the pair was
      real: `mute-chat-24` raised its string from the alert TABLE, over no wire at all.
    */
    expect(chatMuteCode).toContain("'user chat unmuted'");
    expect(chatMuteCode).toContain("'user chat muted'");
    // ...and the member's toast is still the page's, on the SSE path, which is the whole point of
    // the pair being two strings on two screens.
    expect(pageCode).not.toContain("'user chat unmuted'");
  });

  it('keeps the member toast verbatim and separate', () => {
    /*
      The toast itself moved to `RoomChatMute.unmuted`, which calls an injected `notice`; the SKIN —
      that it is a `kind: 'info'` toast and not a dialog — is decided where the slice is built, in
      `RoomUserActions`. Both are asserted, because either alone permits the pair to collapse: the
      string could survive in a dialog, or the toast could survive with the presenter's wording.
    */
    expect(chatMuteCode).toContain("this.#notice('Chat enabled');");
    expect(userActions).toContain(
      "notice: (message) => options.toasts.show({ kind: 'info', message, enableHtml: false })"
    );
    expect(chatMuteCode, "and the MUTE is a dialog, not a toast — upstream's asymmetry").toContain(
      'this.#alert(chatMutedMessage(mutedTill));'
    );
  });
});
