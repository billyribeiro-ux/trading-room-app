import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PERMISSION_KEYS } from './server/rooms';

/**
 * The permissions modal — `page.manageSession.html:2685-2715`.
 *
 * ## Four of five labels had been "tidied" into ordinary English
 *
 *     reference        ours (before)
 *     Microphone       Microphone      ✓
 *     Screenshare      Screen share
 *     WebCam           Camera
 *     AdminChat        Admin chat
 *     CanEditNotes     Edit notes
 *
 * `CanEditNotes` is a property name shown to an operator. It reads oddly, and it is exactly what the
 * reference does. Renaming these is the kind of change that looks like an improvement right up until
 * a support conversation about "the AdminChat box" cannot be followed.
 *
 * ## And the modal had no header or footer
 *
 * The reference wraps its title in `modal-header` beside a `×` dismiss button, and its buttons in
 * `modal-footer text-right`. Ours had a bare `<h4>` and a private `.actions` div — so the dismiss
 * control the reference puts top-right did not exist, and two Bootstrap classes were reimplemented
 * under different names.
 */

const cwd = process.cwd();
const TEMPLATE = readFileSync(`${cwd}/evidence-dumps/TIER1-fetched/views/page.manageSession.html`, 'utf8');
const MODAL = readFileSync(`${cwd}/src/lib/components/PermissionsModal.svelte`, 'utf8');
const STYLES = readFileSync(`${cwd}/evidence-dumps/TIER1-fetched/styles.css`, 'utf8');

describe('the reference’s five labels', () => {
  it('are what this test claims — read, not remembered', () => {
    for (const label of ['Microphone', 'Screenshare', 'WebCam', 'AdminChat', 'CanEditNotes']) {
      expect(TEMPLATE).toContain(`type="checkbox" name="checkbox"> ${label}`);
    }
  });

  it('sit on labels carrying d-block, which styles.css defines', () => {
    expect(TEMPLATE).toContain('<label class="d-block">');
    expect(STYLES).toContain('.d-block {\n  display: block;\n}');
  });
});

describe('ours uses them verbatim', () => {
  it('carries all five exactly', () => {
    for (const label of ['Microphone', 'Screenshare', 'WebCam', 'AdminChat', 'CanEditNotes']) {
      expect(MODAL).toContain(`'${label}'`);
    }
  });

  it('does not carry the tidied versions', () => {
    /* The precise regression: each of these reads better and is wrong. */
    for (const wrong of ["'Screen share'", "'Camera'", "'Admin chat'", "'Edit notes'"]) {
      expect(MODAL).not.toContain(wrong);
    }
  });

  it('labels every key the server accepts', () => {
    /* A key with no label falls back to its raw name, which would silently ship `hasMic` as text. */
    for (const key of PERMISSION_KEYS) {
      expect(MODAL).toContain(`${key}: '`);
    }
    expect(PERMISSION_KEYS).toEqual(['hasMic', 'hasScreen', 'hasCam', 'hasAdminChat', 'canEditNotes']);
  });
});

describe('the modal structure', () => {
  it('has the header, the dismiss button and the titled h4', () => {
    expect(MODAL).toContain('class="modal-header"');
    expect(MODAL).toContain('class="close"');
    expect(MODAL).toContain('&times;');
    expect(MODAL).toContain('class="modal-title"');
  });

  it('uses modal-footer text-right, not a private .actions', () => {
    expect(MODAL).toContain('class="modal-footer text-right"');
    expect(MODAL).not.toContain('class="actions"');
  });

  it('uses the reference’s d-block on each row, not a private .perm', () => {
    expect(MODAL).toContain('<label class="d-block">');
    expect(MODAL).not.toContain('class="perm"');
  });
});
