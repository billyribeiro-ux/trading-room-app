import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  The private-chat wire, and a gap that only showed itself by being crossed.

  `sendPrivateMessage`, `loadPrivateChatLog` and `deletePrivateChatLog` were rewritten end to end —
  moved out of `+page.server.ts`, re-validated, re-scoped, their three FormData parsers collapsed
  into one schema — and the suite stayed at 1578/1578. Not one assertion moved, because there were
  none: a search of every test file for those three names returns a drag-handle selector in
  `panel-drag.test.ts` and nothing else.

  That is the finding this file exists to close. Three commands carrying private messages between
  users of a multi-tenant application — with a rate limit, an identity check, a recipient lookup and
  a cross-tenant read scope between them — had no test at all. A green suite across a rewrite of all
  three is the proof, not a reassurance.
*/

const remote = readFileSync(new URL('../routes/private-chat.remote.ts', import.meta.url), 'utf8');
const server = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');
const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
/*
  The client half of private chat left the page for `RoomPrivateChat` in Phase 5 slice 7. Read as
  its own source, so an assertion about the client cannot pass against a file that no longer holds it.
*/
const privateChatModule = readFileSync(
  new URL('room/private-chat.svelte.ts', import.meta.url),
  'utf8'
);
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
const remoteCode = strip(remote);
const serverCode = strip(server);
const pageCode = strip(page);

/*
  Sliced apart, because all three carry the same peer id and the same room scope, so an assertion
  over the whole file proves nothing about any one of them. Each slice asserts its marker was found;
  a slice that silently returns '' is how a `not.toContain` goes green while guarding nothing.
*/
const slice = (start: string, end: string) => {
  const from = remoteCode.indexOf(start);
  expect(from, `${start} must exist`).toBeGreaterThan(-1);
  const to = end === '' ? remoteCode.length : remoteCode.indexOf(end, from);
  expect(to, `${end} must follow ${start}`).toBeGreaterThan(from);
  return remoteCode.slice(from, to);
};
const loadLog = () =>
  slice('export const loadPrivateChatLog = command(', 'export const sendPrivateMessage = command(');
const send = () =>
  slice(
    'export const sendPrivateMessage = command(',
    'export const deletePrivateChatLog = command('
  );
const deleteLog = () => slice('export const deletePrivateChatLog = command(', '');

describe('all three are commands, including the read', () => {
  it('declares three commands and no query', () => {
    /*
      `loadThread` and `searchThread` are pure SELECTs, so the read looks like a `query`. It must not
      be one: `switchChatToUser` calls it with the SAME argument every time a conversation is opened
      and the answer REPLACES the held log, so a cache hit is a stale conversation. `command` runs
      every time by construction, and correctness that depends on when a cache entry happens to be
      released is not correctness.
    */
    expect((remoteCode.match(/= command\(/g) ?? []).length).toBe(3);
    expect(remoteCode).not.toContain('query(');
  });

  it('has left `+page.server.ts` entirely, so there is one way in and not two', () => {
    expect(serverCode).not.toContain('sendPrivateMessage: async');
    expect(serverCode).not.toContain('loadPrivateChatLog: async');
    expect(serverCode).not.toContain('deletePrivateChatLog: async');
    expect(pageCode).not.toContain("fetch('?/sendPrivateMessage'");
    expect(pageCode).not.toContain("fetch('?/loadPrivateChatLog'");
    expect(pageCode).not.toContain("fetch('?/deletePrivateChatLog'");
  });

  it('shares ONE peer-id schema rather than three copies of a guard', () => {
    /*
      The reason they were converted together. Each action previously parsed the peer with its own
      `Number(data.get('peerID') ?? NaN)` and its own `Number.isInteger`; three copies of a guard are
      three things that can drift, and only one of them has to be wrong.
    */
    expect(remoteCode).toContain('const peerId = z.number().int().positive();');
    /*
      Asserted per slice rather than by counting occurrences. The first version of this check counted
      `/^\s+peerId,$/gm` and failed at 1 of 2 — because prettier had collapsed one of the three
      schemas onto a single line, so the shorthand was not at the start of one. That was a defect in
      the check, not in the code, and a guard that depends on where a formatter puts a line break is
      a guard that cries wolf. Each slice is asked directly whether it uses the shared const.
    */
    expect(loadLog()).toContain('peerId,');
    expect(send()).toContain('z.strictObject({ peerId, body: z.string() })');
    expect(deleteLog()).toContain('z.strictObject({ peerId })');
    // And no slice re-declares its own: three copies of a guard are three things that can drift.
    expect((remoteCode.match(/z\.number\(\)\.int\(\)\.positive\(\)/g) ?? []).length).toBe(1);
  });
});

describe('nothing about the OTHER party is taken from the sender', () => {
  it('refuses the display fields the capture puts on the wire', () => {
    /*
      `sendPrivChat` sends `{peerID, msg, n, recvdNick, recvdAvt, recvdPic, recvdIsA}` — everything
      after the first two is display data about the RECIPIENT, supplied by the SENDER. The row stores
      ids and the thread load reads names and avatars back from `users`, so a client that lies about
      `recvdNick` changes nothing. `strictObject` is what makes sending them a validation error
      rather than a silently ignored extra key.
    */
    expect(send()).toContain('z.strictObject({ peerId, body: z.string() })');
    for (const field of ['recvdNick', 'recvdAvt', 'recvdPic', 'recvdIsA']) {
      expect(remoteCode).not.toContain(field);
    }
  });

  it('reads the recipient from the database and refuses an unknown one', () => {
    expect(send()).toContain('db.select().from(users).where(eq(users.id, peer)).get()');
    expect(send()).toContain("error(404, 'No such user.')");
  });

  it('builds the published message from the SENDER’s own session row', () => {
    // `n`, `avt`, `pic` and `isA` all come off `user`, which is `requireUser(locals)` — never off
    // the argument. This is the assertion that would fail if somebody "helpfully" accepted a nick.
    expect(send()).toContain('n: user.displayName,');
    expect(send()).toContain('avt: user.email,');
    expect(send()).toContain('isA: isPresenterRole(user.role)');
  });
});

describe('the room and the reader come from the session, never the request', () => {
  it('takes both from locals in all three', () => {
    /*
      A `roomShortCode` on any of these arguments would be the 2026-08-07 privilege escalation in a
      new place — and on the READ it would be worse than on the writes, because it would let one
      tenant enumerate another tenant's private conversations.
    */
    expect((remoteCode.match(/requireRoomShortCode\(locals\)/g) ?? []).length).toBe(3);
    expect(remoteCode).not.toContain('roomShortCode:');
  });

  it('scopes the thread read to a conversation the caller is a party to', () => {
    // `(room, user.id, peer)` — the caller's own id is one of the two sides, from the session.
    expect(loadLog()).toContain('searchThread(room, user.id, peer, searchTerm)');
    expect(loadLog()).toContain('loadThread(room, user.id, peer, page)');
  });

  it('scopes the delete the same way', () => {
    expect(deleteLog()).toContain('deleteThread(room, user.id, peer);');
  });
});

describe('the page bound that did not exist before', () => {
  it('caps the thread OFFSET with the same constant the other two logs use', () => {
    /*
      A FIX, not a move, and called out as one. The action read
      `Number(data.get('page') ?? 0) || 0` with no upper limit, so a caller could ask for page
      10,000,000 and make SQLite walk and discard that many rows. `MAX_CHAT_LOG_PAGE` is the bound
      already applied to the room log and the alerts log for exactly this reason; the private thread
      was the one log without it.
    */
    expect(remoteCode).toContain(
      'const threadPage = z.number().int().min(0).max(MAX_CHAT_LOG_PAGE);'
    );
    expect(remoteCode).toContain("import { MAX_CHAT_LOG_PAGE } from '#lib/server/chat-log.js';");
  });

  it('allows page 0, unlike the room log', () => {
    /*
      `.min(0)`, deliberately different from `log-pages.remote.ts`'s `.min(1)`. There the loader
      already sent page 0 so asking again was duplication; here `switchChatToUser` asks for page 0
      on every open because nothing else supplies it. Getting this wrong refuses every conversation.
    */
    expect(remoteCode).toContain('.min(0)');
    expect(loadLog()).toContain('page: threadPage');
  });
});

describe('the capture’s own strings survive verbatim', () => {
  it('keeps the self-chat refusal to the character', () => {
    // `bootbox.alert("Chatting with yourself again?")`. It is raised as an `error()` and not left to
    // the schema precisely so the wording reaches the user instead of a generic 400.
    expect(send()).toContain("error(400, 'Chatting with yourself again?')");
  });

  it('keeps the empty and rate-limit messages', () => {
    expect(send()).toContain("error(400, 'Empty message.')");
    expect(send()).toContain("error(429, 'You are sending messages too quickly.')");
  });

  it('shows the server’s wording on the client, with a fallback that is not invented', () => {
    /*
      TWO senders raise this, and both are read: the private-chat panel's own, and the room
      composer's. They are separate classes since slices 7 and 10 and neither may invent a fallback
      where the server supplied wording.
    */
    expect(privateChatModule).toContain(
      "this.#dialogs.alert = isHttpError(cause) ? cause.body.message : 'Message not sent.';"
    );
    const composerModule = readFileSync(
      new URL('room/composer.svelte.ts', import.meta.url),
      'utf8'
    );
    expect(composerModule).toContain(
      "this.#dialogs.alert = isHttpError(cause) ? cause.body.message : 'Message not sent.';"
    );
  });
});

describe('the rate limit is the same bucket as public chat', () => {
  it('consumes `message`, not a private quota of its own', () => {
    /*
      A private message is a message. Giving it its own bucket would let one user spend both budgets
      at once, which is a doubling of the limit disguised as a separate feature.
    */
    expect(send()).toContain("consumeRateLimit('message', user.id)");
    expect(remoteCode).not.toContain("consumeRateLimit('privateMessage'");
  });

  it('checks the limit BEFORE writing the row', () => {
    const body = send();
    expect(body.indexOf('consumeRateLimit')).toBeLessThan(body.indexOf('insertPrivateMessage'));
  });
});

describe('both parties are told', () => {
  it('publishes twice on send — the sender’s own copy is how their message appears', () => {
    /*
      The client deliberately inserts nothing locally after a send; the echo on `/privChat` is what
      appends it. Losing the second publish would make a sent message vanish until a reload, and it
      would look like a delivery bug rather than a missing echo.
    */
    expect((send().match(/publishToRoom\(room, \{/g) ?? []).length).toBe(2);
    expect(send()).toContain('toUserId: peer, fromUserId: user.id, message');
    expect(send()).toContain('toUserId: user.id, fromUserId: user.id, message');
    // The client's half moved to `RoomPrivateChat` in Phase 5 slice 7; the assertion moved with it.
    expect(privateChatModule).toContain("this.#draft = '';");
  });

  it('publishes once on delete, to the peer whose tab is now lying to them', () => {
    expect((deleteLog().match(/publishToRoom\(room, \{/g) ?? []).length).toBe(1);
    expect(deleteLog()).toContain('toUserId: peer, fromUserId: user.id');
  });
});

describe('the client’s own half', () => {
  it('replaces on page 0 or a search, and prepends older history otherwise', () => {
    // Page 0 is the current state of the thread; a later page is older and belongs in front.
    expect(privateChatModule).toContain(
      'page === 0 || searchTerm ? incoming : [...incoming, ...(this.#threads[peerId] ?? [])]'
    );
  });

  it('leaves the held log alone when a load fails, rather than blanking the pane', () => {
    const fn = pageCode.slice(pageCode.indexOf('async function loadPrivateChatLog('));
    const failure = fn.slice(fn.indexOf('} catch {'), fn.indexOf('}\n'));
    expect(failure).not.toContain('privChatLog =');
  });
});
