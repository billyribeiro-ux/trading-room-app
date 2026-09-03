import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from '#lib/source-comments.js';

/*
  TWO CONTROLS OF `app-session-control-modal` THIS ROOM DOES NOT BUILD, AND WHY EACH IS REFUSED.

  ## How they were found

  `gate/audit-surface.mjs` measured `app-session-control-modal` against the eight files that
  implement it and reported five absent text literals. Three are the WHIP pair and the Player Link
  readout, already argued at `ModalHost.svelte` and in `stream-player-blocked-contract.test.ts`. The
  other two had no reason recorded anywhere:

    " Swap Primary and Backup Media Servers "     `lDe`, byte 2,140,840
    " Admin Dashboard Login "                     `cDe`, byte 2,141,013

  An unrecorded absence is the state this repository treats as worse than a gap: it reads as
  something nobody has looked at, and the next reader either rebuilds it or leaves it another month.

  ## Why a test rather than a comment

  A comment saying "we did not build these" cannot fail. What CAN change is the PREMISE each refusal
  rests on — a gate that is a credential today could be re-modelled, and a cluster that does not exist
  could be provisioned. So the gates are read from the pinned bundle and from the settings schema on
  every run: if either stops being what it is, the refusal stops being founded and this file says so.

  `alert-report-modal-contract.test.ts` makes the same argument for the `RPT-*` refusal and is the
  model for this one.
*/

const BUNDLE = readFileSync(
  new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url),
  'utf8'
);
const SCHEMA = readFileSync(
  new URL('../../../controller/src/lib/room-settings-schema.ts', import.meta.url),
  'utf8'
);
const HOST = codeOf(
  'ModalHost.svelte',
  readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8')
);

describe('Swap Primary and Backup Media Servers — two blockers, either alone is enough', () => {
  it('is the control the reference builds, with the handler it calls', () => {
    expect(BUNDLE).toContain(
      'x("click",function(){return D(e),E(g(2).switchToBackup())}),' +
        'v(1," Swap Primary and Backup Media Servers ")'
    );
  });

  it('its gate is now backed by an automatic primary-to-backup resolver', () => {
    /*
      `O(36, e.appService.globals.sessData.backupClusterID ? 36 : -1)` — the button renders only when
      the room names a BACKUP cluster. The deployment now consumes that value server-side and
      automatically selects it after a failed configured primary health check.
    */
    expect(BUNDLE).toContain('O(36,e.appService.globals.sessData.backupClusterID?36:-1)');
    const at = SCHEMA.indexOf('{ name: "backupClusterID"');
    expect(at, 'the backupClusterID entry must be findable').toBeGreaterThan(-1);
    const close = SCHEMA.indexOf('}', at);
    expect(close, 'its entry must be closed').toBeGreaterThan(at);
    expect(SCHEMA.slice(at, close)).toContain('wired: true');
    const resolver = readFileSync(
      new URL('../../../controller/src/lib/server/media-cluster.ts', import.meta.url),
      'utf8'
    );
    expect(resolver).toContain('usedBackup: true');
    expect(resolver).toContain('primary health check failed');
  });

  it('and its ACTION is behind one of the seven credentials', () => {
    /*
      `switchToBackup()` at byte 2,173,860 opens `bootbox.prompt` and compares what is typed against
      `sessData.deleteAlertPW` in the BROWSER. That is the shape this repository refuses outright:
      the credential is one of the seven that stay on the controller, and a client-side comparison
      requires shipping it to every presenter's page.

      Building the control would mean moving the check to the controller — the question travels, the
      credential does not, as `internal/room-entry` does it. That is possible; it is simply not what
      unblocks this control, because the cluster it swaps to does not exist.
    */
    expect(BUNDLE).toContain(
      'switchToBackup(){this.appService.globals.sessData.deleteAlertPW?bootbox.prompt('
    );
    expect(BUNDLE).toContain('e.trim()===this.appService.globals.sessData.deleteAlertPW');
    /* And the room's own source names neither, which is the boundary holding. */
    expect(HOST).not.toContain('deleteAlertPW');
    expect(HOST).not.toContain('backupClusterID');
  });
});

describe('Admin Dashboard Login — its GATE is a credential, which is the whole finding', () => {
  it('is the control the reference builds, with the handler it calls', () => {
    expect(BUNDLE).toContain(
      'x("click",function(){return D(e),E(g(2).adminLogin())}),v(2," Admin Dashboard Login ")'
    );
  });

  it('renders only when `modAdminLoginList` is set — a value the room may never hold', () => {
    /*
      ── THE REASON THIS ONE IS NOT MERELY UNBUILT ────────────────────────────────────────────────

      `O(69, e.appService.globals.isPresenter && e.appService.globals.sessData.modAdminLoginList ? 69 : -1)`.

      `modAdminLoginList` is one of the SEVEN credentials that never cross to the room —
      `room-credential-prompt.ts` names it in the same list as `deleteAlertPW` and `obsStreamKey`,
      and `room-config.ts` records why: the room serialises its config into SSR HTML, so anything the
      room holds is readable by every member of it.

      A gate on that value is therefore not a gate this room can evaluate. Rendering the button when
      the list is non-empty would leak, one bit at a time, whether a room HAS an admin access list —
      which is exactly the oracle the guard exists to close.

      The buildable shape is the one `internal/room-entry` already uses: the QUESTION travels to the
      controller and the answer comes back. It is not built because nothing else in this room needs
      it, and inventing a new credential-adjacent route for one button is how a boundary erodes.
    */
    expect(BUNDLE).toContain(
      'O(69,e.appService.globals.isPresenter&&e.appService.globals.sessData.modAdminLoginList?69:-1)'
    );
    const at = SCHEMA.indexOf('{ name: "modAdminLoginList"');
    expect(at, 'the modAdminLoginList entry must be findable').toBeGreaterThan(-1);
    const close = SCHEMA.indexOf('}', at);
    expect(close, 'its entry must be closed').toBeGreaterThan(at);
    expect(SCHEMA.slice(at, close)).toContain('wired: false');
  });

  it('and what it would open is a CONTROLLER surface, not a room one', () => {
    /*
      `doAdminLogin()` at byte 1,153,962 POSTs `{sessID, token}` to
      `${apiROOT}/sessions/v2/loginToAdminFromRoom` and opens the `loginURL` it answers with. The
      destination is the manage application; the room is only the button. So even with the credential
      question moved server-side, this is a door into the controller and belongs to whoever owns that
      surface's authorisation model.
    */
    expect(BUNDLE).toContain('/sessions/v2/loginToAdminFromRoom');
    expect(BUNDLE).toContain('doAdminLogin(){this.httpClient.post(');
    expect(HOST).not.toContain('loginToAdminFromRoom');
    expect(HOST).not.toContain('modAdminLoginList');
  });
});

describe('the boundary these two refusals sit on is still where it was', () => {
  it('all seven credentials are still named as such on the controller', () => {
    /*
      Read from the controller's own module rather than restated here. If the list ever shrinks, one
      of these refusals may have stopped being founded — and this case is where that shows up, rather
      than in a comment that nobody re-reads.
    */
    const prompt = readFileSync(
      new URL('../../../controller/src/lib/server/room-credential-prompt.ts', import.meta.url),
      'utf8'
    );
    for (const credential of [
      'deleteAlertPW',
      'banIPList',
      'obsStreamKey',
      'twillioApiSID',
      'modAdminLoginList',
      'allRoomsWelcomeMatPW',
      'needPasswordForUserNotes'
    ]) {
      /*
        WHOLE-WORD, and the negative control is why. A `toContain` passed when the name was renamed
        to `modAdminLoginListX` — the new name contains the old one. That is the ninth time this
        repository has been bitten by a substring assertion, after `js` inside `json`, `pmToolbar`
        inside `pmToolbarZZ`, and `form-select` inside `form-select-sm` earlier today.
      */
      expect(
        new RegExp(`\\b${credential}\\b`).test(prompt),
        `${credential} must still be a controller-only credential`
      ).toBe(true);
    }
  });
});
