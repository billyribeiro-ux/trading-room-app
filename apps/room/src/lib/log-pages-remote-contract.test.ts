import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  `loadOlderChatMessages` and `loadOlderAlerts` — the first `query` functions here, and the first
  reads that earn one.

  The pair before them settled the rule: `getMyMobilePin` is a read that had to stay a `command`,
  because it MINTS a pin and `query` caches. These do not mint. `loadChatPage` and `loadAlertPage`
  are two SELECTs with a LIMIT and an OFFSET and no write anywhere on the path.

  What this file guards is not the flavour choice — it is everything that made the actions SAFE,
  because that is what a move loses if nobody is watching: the channel allow-list, the page bound,
  and the room coming from the session rather than the request.
*/

const remote = readFileSync(new URL('../routes/log-pages.remote.ts', import.meta.url), 'utf8');
const server = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');
const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
const remoteCode = strip(remote);
const serverCode = strip(server);
const pageCode = strip(page);

describe('both are queries, and both are pure', () => {
  it('are declared with `query`', () => {
    expect(remoteCode).toContain('export const loadOlderChatMessages = query(');
    expect(remoteCode).toContain('export const loadOlderAlerts = query(pageNumber,');
  });

  it('read and do not write', () => {
    /*
      The condition that makes the cache safe. A query is keyed on its argument and its value is
      held while the resource is in use; if either of these ever grew a write, the same key would
      start returning a result whose side effect had already happened once. `command` is the answer
      then, not a comment.
    */
    expect(remoteCode).not.toContain('db.insert');
    expect(remoteCode).not.toContain('db.update');
    expect(remoteCode).not.toContain('db.delete');
    expect(remoteCode).toContain(
      'return loadChatPage(requireRoomShortCode(locals), channel, page);'
    );
    expect(remoteCode).toContain('return loadAlertPage(requireRoomShortCode(locals), page);');
  });

  it('are no longer form actions as well', () => {
    expect(serverCode).not.toContain('loadOlderChatMessages: async');
    expect(serverCode).not.toContain('loadOlderAlerts: async');
    expect(pageCode).not.toContain("fetch('?/loadOlderChatMessages'");
    expect(pageCode).not.toContain("fetch('?/loadOlderAlerts'");
  });
});

describe('the page bound survived the move', () => {
  it('is one schema, used by both, refusing page 0 and an unbounded OFFSET', () => {
    /*
      Page 0 is the newest page and the loader already sent it. The upper bound is the one that
      matters for cost: an unvalidated OFFSET lets a caller ask for page 10,000,000 and make SQLite
      count its way there. This was two hand-written guards; it is now one schema used twice, which
      is the only way the two cannot drift apart.
    */
    expect(remoteCode).toContain(
      'const pageNumber = z.number().int().min(1).max(MAX_CHAT_LOG_PAGE);'
    );
  });
});

describe('the channel is validated, not trusted', () => {
  it('keeps the deny-by-default allow-list', () => {
    // Without it the field is an arbitrary string reaching a WHERE clause — parameterised, so not
    // injectable, but enough to enumerate whether messages exist under any label a caller guesses.
    expect(remoteCode).toContain('isChatChannel(value)');
  });

  it('checks the value is a string BEFORE the allow-list', () => {
    /*
      `z.custom` hands its predicate `unknown`; the argument comes off the wire and could be a
      number or an object. `isChatChannel` is declared over `string`. Dropping the `typeof` means
      handing a non-string to `.includes` and trusting the answer — and it type-errors, which is how
      this was caught rather than shipped.
    */
    expect(remoteCode).toContain("typeof value === 'string' && isChatChannel(value)");
  });
});

describe('the room comes from the session, never the request', () => {
  it('takes the room short code from locals in both', () => {
    /*
      A `roomShortCode` field on either argument would be the 2026-08-07 privilege escalation again
      in a new place. `strictObject` is what stops one being accepted silently if somebody adds it
      to the client call.
    */
    expect((remoteCode.match(/requireRoomShortCode\(locals\)/g) ?? []).length).toBe(2);
    expect(remoteCode).toContain('z.strictObject({');
    expect(remoteCode).not.toContain('roomShortCode:');
  });

  it('still requires a user on both', () => {
    expect((remoteCode.match(/requireUser\(locals\);/g) ?? []).length).toBe(2);
  });
});

describe('the empty answer is still the terminator', () => {
  /*
    Upstream reads `0 == o.length && (this.hasMoreData = !1)`. The server never says how much
    history remains — running out is something you discover by asking once too often. So an empty
    array must stay a SUCCESS. Turning it into a 404 (the tempting "not found") would surface as an
    error toast at the top of every log the moment a reader reached the end of it.
  */
  it('does not turn an empty page into an error on the server', () => {
    expect(remoteCode).not.toContain('error(404');
  });

  it('is what the client reads to stop asking', () => {
    // One terminator for both logs since the paging state was unified — `room/log-pages.svelte.ts`.
    expect(pageCode).toContain('alertPages.exhausted(ALERTS_LOG);');
    expect(pageCode).toContain('chatPages.exhausted(channel);');
  });
});

describe('a failed page is non-fatal and retried, not swallowed', () => {
  /*
    Both call sites `catch` and return. That is NOT the swallowed `.catch(() => {})` this repository
    forbids: `hasMoreData` is deliberately left TRUE so the next scroll to the top asks again, which
    is exactly what the form action did when it returned early on a non-success. The `finally` is
    the part that must not be lost — without it a failure leaves the loading flag stuck on and the
    pane never pages again.
  */
  it('clears the loading flag in a `finally`, so a failure cannot wedge paging', () => {
    /*
      Still asserted with the closing brace attached, which is the whole point of the assertion: the
      call has to be the LAST thing in the `finally`, not a line that happens to appear somewhere in
      the function. Moving it into the `catch` would clear on failure and leave success wedged.
    */
    expect(pageCode).toContain('alertPages.settled();\n    }');
    expect(pageCode).toContain('chatPages.settled();\n    }');
  });

  it('leaves hasMoreData alone on the failure path', () => {
    const fn = pageCode.slice(pageCode.indexOf('async function loadOlderAlerts(scroller'));
    const failure = fn.slice(fn.indexOf('} catch {'), fn.indexOf('} finally {'));
    expect(failure, 'the failure path must be findable').not.toBe('');
    expect(failure).not.toContain('exhausted');
  });
});
