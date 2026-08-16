import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DIRECT_EVIDENCE_CONTRACT } from './direct-evidence-contract';

function sha256(path: URL) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function text(path: URL) {
  return readFileSync(path, 'utf8');
}

describe('Post Alert forensic evidence', () => {
  it('pins every authoritative Post Alert input', () => {
    const contract = DIRECT_EVIDENCE_CONTRACT.postAlert;
    expect(
      sha256(new URL('../../docs/source/components/app-post-alert-modal.full.js', import.meta.url))
    ).toBe(contract.decodedSourceSha256);
    expect(
      sha256(
        new URL(
          '../../docs/source/components/app-post-alert-modal.render-helpers.js',
          import.meta.url
        )
      )
    ).toBe(contract.renderHelpersSha256);
    expect(
      sha256(
        new URL('../../docs/source/components/app-post-alert-modal.component.css', import.meta.url)
      )
    ).toBe(contract.componentCssSha256);
    expect(sha256(new URL('../../app-modals/app-post-alert-modal', import.meta.url))).toBe(
      contract.rawDomSha256
    );
    expect(
      sha256(new URL('../../app-modals/app-post-alert-modal.clean.html', import.meta.url))
    ).toBe(contract.cleanDomSha256);
    expect(sha256(new URL('../../modal', import.meta.url))).toBe(contract.focusedInnerDomSha256);
    expect(sha256(new URL('../../toast-container', import.meta.url))).toBe(
      contract.toastHostSha256
    );
  });

  it('keeps compiled branch facts in the implementation', () => {
    const source = text(
      new URL('../../docs/source/components/app-post-alert-modal.compiled.js', import.meta.url)
    );
    const component = text(new URL('components/PostAlertModal.svelte', import.meta.url));
    const page = text(new URL('../routes/+page.svelte', import.meta.url));

    expect(source).toContain("(this.selectedTab = 'text')");
    expect(source.match(/je\('ngModel', o\.alertUrl\)/g)).toHaveLength(2);
    expect(source).toContain(DIRECT_EVIDENCE_CONTRACT.postAlert.urlSchemeError);
    expect(source).toContain(
      "(this.legalDisclosureTxt = 'FOR EDUCATIONAL PURPOSES ONLY, NOT FINANCIAL ADVICE')"
    );
    expect(component.match(/bind:value=\{alertUrl\}/g)).toHaveLength(2);
    expect(component).toContain('{#if legalDisclosure}');
    /*
      A NEGATIVE GUARD THAT WENT VACUOUS AND WAS CAUGHT, 2026-08-16. It read
      `not.toContain("showInfoToast('Alert")`, and `showInfoToast` stopped existing in this file the
      moment the toast queue moved to `RoomToasts` in Phase 5 slice 1 — so it passed for the wrong
      reason: the text was absent because the FUNCTION had been renamed, not because the room had
      stopped raising a success toast on a posted alert.

      This is the exact failure `source-size-contract.test.ts` documents against `exactAlerts`, and
      it is why the rule is that every extraction re-points its negatives rather than merely running
      the suite and seeing green.

      Re-pointed AND anchored. The rule being guarded is that posting an alert raises no success
      toast — the reference does not, and one would sit on top of the alert the presenter just
      posted. So the guard now asserts the new spelling is absent, and asserts FIRST that the alert
      post path is still in this file at all, because a guard on a region that has moved is not a
      guard.
    */
    /*
      RE-POINTED on 2026-08-16, exactly as the note above anticipated: the alert post path left the
      page for `RoomComposer` in Phase 5 slice 10. The message that fired here is the reason this
      re-point took one minute instead of an afternoon — a guard that says WHERE to look when its
      region moves is worth the sentence it costs.
    */
    const composerModule = readFileSync(
      new URL('room/composer.svelte.ts', import.meta.url),
      'utf8'
    );
    expect(
      composerModule,
      'the alert post path has moved again - re-point this guard at its new owner'
    ).toContain('async #persistAlert(');
    expect(composerModule).not.toContain("toasts.info('Alert");
    expect(page).not.toContain("toasts.info('Alert");
  });
});
