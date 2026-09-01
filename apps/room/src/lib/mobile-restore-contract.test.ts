import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * `restoreMobileAppTokens` — THE MOBILE APP TAB, AND THE ALERT UPSTREAM RAISES OVER NOTHING.
 *
 * ## The reference implementation is two statements, and one of them is a lie
 *
 * Byte 2,444,920, whole:
 *
 * ```js
 * restoreMobileAppTokens(){
 *   this.appService.sendServerCommand("restoreMobileAppTokens",{}),
 *   bootbox.alert("Command sent successfully, check your mobile device for a test notification")
 * }
 * ```
 *
 * The alert is the next statement after the transmit — no callback, no acknowledgement, no error
 * path. It tells a member with no paired device exactly what it tells one with three, and
 * `docs/decoded/mobile-app-decoded.md` records that it fires even if the transmit inside `send()`
 * threw.
 *
 * **The member pressing this button is, by the pane's own copy, somebody who is not getting
 * notifications.** Telling them a notification is on its way when nothing was reached leaves them
 * waiting for a buzz that cannot arrive. That is the `EXACT_ALERTS` shape — a control reporting
 * success it did not achieve — and it is the one thing here that is deliberately not transcribed.
 *
 * ## What the server does, derived rather than guessed
 *
 * There is no inbound handler in the bundle: the switch at 1,020,600–1,022,200 was read in full and
 * has no `restoreMobileAppTokens` case, so the reference's server is not in evidence. What IS in
 * evidence is the pane's copy — *"restore your mobile app connectivity and get a test notification
 * on your device"*, shown to somebody who *"is not getting notifications"*.
 *
 * With a token store that has one honest meaning: push to every registration this member has, and
 * drop the ones the push proves dead. A registration FCM answers `UNREGISTERED` for is a device that
 * uninstalled or reinstalled, and a stale one sitting in the list is the ordinary reason
 * notifications stop. **Removing it IS the restoration.**
 *
 * `sendTestPushToMember` already did exactly that for the Manage page. Reusing it rather than
 * writing a second sweep is what keeps the prune rule from drifting from FCM's outcome vocabulary in
 * one of the two places.
 *
 * ## The tab has no gate upstream, and that is recorded rather than copied
 *
 * `docs/decoded/mobile-app-decoded.md` §3 row 26: the new tab is the only mobile control in the
 * bundle with no gate — verified by reading the whole troubleshooter component and counting, not by
 * pattern-matching (`ptrMobileAppEnabled` occurs five times and none is in that range). The doc asks
 * for a deliberate decision. Ours is to gate the tab: a room with no app configured would otherwise
 * show a tab whose only button answers 409 every time.
 */

const ROOM = fileURLToPath(new URL('..', import.meta.url));
const CONTROLLER = fileURLToPath(new URL('../../../controller/src/', import.meta.url));

/*
  THE MODAL LEFT `ModalHost.svelte` ON 2026-09-01, whole, for `ConnectivityModal.svelte`.

  `source-size-contract` had NAMED that extraction twice and deferred it twice; the third time the
  host went past its ceiling there was nothing smaller left to extract, so the 809 lines went. This
  file reads the component that holds the markup now — repointed rather than widened to "either
  file", because which component owns the troubleshooter is itself a fact worth failing on.
*/
const MODAL = readFileSync(`${ROOM}lib/components/ConnectivityModal.svelte`, 'utf8');
/*
  The pane is its own component, and the extraction bought more than a line count: the result message
  is the pane's state, so a tab change unmounts it and the "leaving the tab drops the result" rule is
  structural instead of a line in a handler somebody has to remember.
*/
const PANE = readFileSync(`${ROOM}lib/components/MobileRestorePane.svelte`, 'utf8');
const REMOTE = readFileSync(`${ROOM}routes/mobile-pin.remote.ts`, 'utf8');
const CLIENT = readFileSync(`${ROOM}lib/server/room-config-client.ts`, 'utf8');
const ROUTE = readFileSync(`${CONTROLLER}routes/internal/mobile-restore/[code]/+server.ts`, 'utf8');

/** Comments stripped, for the assertions that test for an ABSENCE. */
function codeOf(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/** One exported symbol's body, bounded by the next `export`. */
function bodyOf(source: string, declaration: string): string {
  const from = source.indexOf(declaration);
  expect(from, `${declaration} is gone`).toBeGreaterThan(-1);
  const next = source.indexOf('\nexport ', from + 1);
  return source.slice(from, next === -1 ? source.length : next);
}

describe('the pane is the capture, down to its missing full stop', () => {
  it('carries the body copy verbatim', () => {
    /*
      `PAe` @ 2,438,242. The copy is at 2,438,310 and ends `…if you are not getting notifications`
      with no full stop — the reference's own, and the kind of thing a well-meaning edit repairs.
    */
    expect(PANE).toContain('Only do this if you are not getting notifications');
    expect(PANE).not.toContain('if you are not getting notifications.');
  });

  it('carries the button label and its icon', () => {
    expect(PANE).toContain('Restore Connectivity');
    expect(PANE).toContain('fa-sync-alt');
  });

  it('wears the container class the capture has no rule for', () => {
    /*
      `.mobile-app-container` carries NO rule anywhere: the substring occurs exactly twice in the
      bundle and both are const tuples. Worn anyway — it is the capture's own hook, and it is what a
      future stylesheet targets.
    */
    expect(PANE).toContain('class="mobile-app-container"');
  });

  it('labels the TAB with the one fa-mobile-alt in the bundle', () => {
    /*
      `fa-mobile-alt` occurs exactly once in 2,891,205 bytes and it is this tab's icon. The navbar's
      mobile button is `fa-mobile` and has been since the older build — matching the new string to
      the nearest mobile-looking element would have changed an untouched control's icon.
    */
    expect(MODAL).toContain('<i class="fas fa-mobile-alt me-1"></i> Mobile App');
    const navbar = readFileSync(`${ROOM}lib/components/RoomNavbar.svelte`, 'utf8');
    expect(codeOf(navbar), 'the navbar keeps fa-mobile').toContain('fa-mobile mr-1');
    expect(codeOf(navbar)).not.toContain('fa-mobile-alt');
  });
});

describe('it does not tell a member a notification is coming when none is', () => {
  it('keeps the captured sentence only for the case it is true of', () => {
    /*
      THE ASSERTION THIS FILE EXISTS FOR. The string is kept — it is the capture's — but it is
      reached only through `result.sent > 0`, so it can never be shown over nothing.
    */
    /*
      Bound to LOCALS and asserted: `slice-anchor-contract.test.ts` refuses an `indexOf` inlined into
      a `slice`, because an anchor that silently returns -1 makes the slice start at the end of the
      string and every assertion over it pass on nothing.
    */
    const from = PANE.indexOf('async function run()');
    expect(from, 'the handler is gone').toBeGreaterThan(-1);
    const to = PANE.indexOf('</script>', from);
    expect(to, 'the handler never ends').toBeGreaterThan(from);

    const handler = PANE.slice(from, to);
    const sentBranch = handler.indexOf('if (result.sent > 0)');
    const captured = handler.indexOf('Command sent successfully, check your mobile device');
    expect(sentBranch, 'the success branch is gone').toBeGreaterThan(-1);
    expect(captured, 'the captured sentence is gone').toBeGreaterThan(sentBranch);
  });

  it('says something different when nothing is paired', () => {
    expect(PANE).toContain('result.registrations === 0');
    expect(PANE).toContain('No device is paired with this room yet');
  });

  it('says something different when every device failed', () => {
    expect(PANE).toContain('could be reached');
    expect(PANE).toContain('None of your');
  });
});

describe('the command takes nothing and asks the session who is calling', () => {
  const body = bodyOf(REMOTE, 'export const restoreMobileAppTokens = command(');

  it('accepts no argument, as the capture sends none', () => {
    /*
      `sendServerCommand("restoreMobileAppTokens",{})` — an empty payload, because the server knows
      the caller. A member id on this argument would be a client asserting whose devices to push to.
    */
    expect(body).toContain('command(async () => {');
    expect(codeOf(body)).not.toContain('z.');
  });

  it('resolves the member and the room from locals', () => {
    expect(body).toContain('requireUser(locals)');
    expect(body).toContain('requireRoomShortCode(locals)');
  });

  it('re-gates on the room having an app, because the tab upstream has no gate', () => {
    expect(body).toContain(
      "if (!appEnabled) error(409, 'This room has no mobile app configured.');"
    );
  });
});

describe('the controller route is the pin route gates plus one call', () => {
  it('verifies a capability before anything else', () => {
    const verify = ROUTE.indexOf('verifyConfigReadToken(secret, params.code, presented)');
    const db = ROUTE.indexOf('getDb()');
    expect(verify).toBeGreaterThan(-1);
    expect(db).toBeGreaterThan(-1);
    expect(verify, 'a capability checked after the lookup is not a gate').toBeLessThan(db);
  });

  it('re-applies both of the pin route gates', () => {
    /*
      A room with no app has nothing to restore, and a trial account that may not pair the app may
      not push to one. Re-checked here because this endpoint is reachable with the shared secret and
      a URL — a hidden button is not an authorization check.
    */
    expect(ROUTE).toContain(
      "if (!appEnabled) error(409, 'This room has no mobile app configured.');"
    );
    expect(ROUTE).toContain(
      'membership.roomUser.isFreeTrial && settings.freeTrialsGetApp !== true'
    );
  });

  it('reuses the existing sweep rather than writing a second one', () => {
    /*
      `sendTestPushToMember` is the Manage page's, and it already sends real pushes with
      per-registration outcomes and prunes what FCM reports dead. A second implementation is a second
      place for the prune rule to drift.

      Its sibling `listFcmRegistrations` is deliberately NOT used: it runs the same sweep with
      `dryRun: true`, which validates tokens without buzzing anything — right for a diagnostic table,
      wrong for a button that promises a notification.
    */
    expect(ROUTE).toContain('sendTestPushToMember(room.id, membership.roomUser.id)');
    expect(codeOf(ROUTE)).not.toContain('listFcmRegistrations');
    expect(codeOf(ROUTE)).not.toContain('dryRun');
  });

  it('returns counts and never the registrations themselves', () => {
    /*
      `sendTestPushToMember` also returns a per-device array carrying a platform and the last six
      characters of each token. That is the Manage page's table and nobody else's business: the room
      renders a sentence, and a sentence needs counts. Returning the detail "because it is there"
      would put device fingerprints into a response a member triggers about themselves.
    */
    const code = codeOf(ROUTE);
    expect(code).toContain('registrations: result.registrations');
    expect(code).toContain('pruned: result.pruned');
    expect(code, 'the per-device detail must not travel').not.toContain('results');
    expect(code).not.toContain('lastSix');
  });
});

describe('the room validates what the controller sends back', () => {
  const body = bodyOf(CLIENT, 'export async function restoreMobileTokens(');

  it('refuses a non-integer count rather than rendering it', () => {
    /*
      The counts become a sentence a member reads, and a `NaN` in that sentence would look like an
      answer. The controller is ours, which is exactly why this is checked: a boundary that only
      validates what it does not control stops being one the first time both sides move.
    */
    expect(body).toContain("typeof value !== 'number'");
    expect(body).toContain('!Number.isInteger(value)');
    expect(body).toContain('value < 0');
  });

  it('sends the capability and a bounded timeout, like the pin call beside it', () => {
    expect(body).toContain('configReadToken(secret, shortCode)');
    expect(body).toContain('AbortSignal.timeout(TIMEOUT_MS)');
  });
});
