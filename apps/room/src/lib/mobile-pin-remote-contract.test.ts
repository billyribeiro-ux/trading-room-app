import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  `getMyMobilePin` — the second remote function, and the one that establishes a rule worth more than
  the conversion itself.

  It is a READ. It takes no argument, it returns data, it mutates nothing the room can see, and
  every instinct says a read should be a `query`. It must not be one, and the reason is not obvious
  until you know how `query` caches: SvelteKit serialises the argument into a cache key, dedupes
  concurrent callers onto a single instance, and holds the resolved value for as long as the query
  is in active use. With NO argument, every call in the application shares one key.

  The pin is minted fresh per request by the controller (`room_users.mobile_pair_code`). As a query,
  the second open of the mobile modal would be handed the first pin back out of the cache — possibly
  one the controller has already rotated — and nothing would look wrong. A plausible number, in the
  right place, silently stale.

  So: `query` is for reads that are PURE. A read with a server-side side effect is a `command`,
  whatever the verb in its name suggests. These assertions exist so that "getMyMobilePin is a read,
  it should be a query" cannot be acted on later as a tidy-up.
*/

const remote = readFileSync(new URL('../routes/mobile-pin.remote.ts', import.meta.url), 'utf8');
const server = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');
const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
const remoteCode = strip(remote);
const serverCode = strip(server);
const pageCode = strip(page);

describe('the pin is a command, not a query', () => {
  it('is declared with `command`', () => {
    expect(remoteCode).toContain('export const getMyMobilePin = command(async () => {');
  });

  it('never becomes a query, however much it looks like one', () => {
    /*
      The whole point of the file. If this ever fails, read the header before "fixing" it: making
      this a query reintroduces a stale pin that no screenshot would catch.
    */
    expect(remoteCode).not.toContain('query(');
  });

  it('still mints through the controller rather than reading a stored code', () => {
    // If this ever became a plain read of a column, the caching argument above would stop applying
    // and the choice would deserve revisiting — so it is pinned rather than assumed.
    expect(remoteCode).toContain('return await requestMobilePin(shortCode, user.email);');
  });
});

describe('the gate survived the move', () => {
  it('re-checks the room setting on the server', () => {
    // A hidden button is not an authorization check; this is the check.
    expect(remoteCode).toContain(
      'settings.ptrMobileAppEnabled === true || settings.customMobileAppEnabled === true'
    );
    expect(remoteCode).toContain(
      "if (!appEnabled) error(409, 'This room has no mobile app configured.');"
    );
  });

  it('still refuses loudly when the controller cannot issue one', () => {
    /*
      `console.error` then a 502. Showing a pin that was never issued is worse than saying so, and
      an empty string here would render as a plausible blank field.
    */
    expect(remoteCode).toContain(
      "console.error('[getMyMobilePin] the controller could not issue a pin', cause);"
    );
    expect(remoteCode).toContain("error(502, 'Could not get an app pin right now.');");
  });

  it('is no longer ALSO a form action', () => {
    expect(serverCode).not.toContain('getMyMobilePin: async');
    expect(pageCode).not.toContain("fetch('?/getMyMobilePin'");
  });
});

describe('the two server messages stay two messages on the client', () => {
  /*
    The 409 says the room has no mobile app; the 502 says the controller could not issue a pin.
    Those are different facts and a presenter needs to know which one they hit. Collapsing them into
    one fallback string would be the drift this file exists to stop.

    `isHttpError` is how the distinction survives: a remote command rejects with Kit's `HttpError`,
    whose `body` is the `App.Error` the server raised. That was read out of Kit's own client runtime
    (`remote_request` throws `new HttpError({ status, ...result.error })`), not assumed.
  */
  it('narrows the rejection and shows the server’s own message', () => {
    expect(pageCode).toContain('dialogs.alert = isHttpError(cause)');
    expect(pageCode).toContain('? cause.body.message');
  });

  it('falls back only when the rejection is NOT an HttpError', () => {
    // A network failure has no server message; inventing one would be a fabricated explanation.
    const fn = pageCode.slice(pageCode.indexOf('async function getMyPinAndDoInfo()'));
    const body = fn.slice(0, fn.indexOf('\n  }'));
    expect(body).toContain(": 'Could not get an app pin right now.';");
  });

  it('leaves the captured placeholder alone on failure', () => {
    /*
      `N/A` is the capture's value for "no pin" and is set BEFORE the request. The failure path must
      not overwrite it with a spinner, an empty string, or an invented "error" label.
    */
    const fn = pageCode.slice(pageCode.indexOf('async function getMyPinAndDoInfo()'));
    const body = fn.slice(0, fn.indexOf('\n  }'));
    expect(body).toContain("mobilePin = 'N/A';");
    expect(body.slice(body.indexOf('catch'))).not.toContain('mobilePin =');
  });
});
