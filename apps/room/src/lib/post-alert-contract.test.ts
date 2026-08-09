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
    expect(page).not.toContain("showInfoToast('Alert");
  });
});
