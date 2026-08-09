import { describe, expect, it } from 'vitest';
import { editableText, isBlank, isEditableEmpty } from './editable-display';

/*
  The tally these rules come from, transcribed from the reference's Settings tab.

  Each row is one distinct printed value, how many `.editable-click` nodes printed it, and whether
  those nodes carried `editable-empty`. This is the whole of the evidence: 134 nodes, no sampling —
  and the assertion below computes that total rather than restating it, because this line said 133
  while the assertion said 134 and both were sitting in the same file.

  Reproduce with, against `scripts/collect-account-2026-08-08T20-19-23-396Z.json`:

      captures['manage:tab:Settings'].nodes
        .filter(n => /editable-click/.test(n.class ?? ''))
        .map(n => [n.text.trim(), /editable-empty/.test(n.class), n.style['font-style']])
*/
const CAPTURED = [
  { text: 'empty', nodes: 47, editableEmpty: true },
  { text: '0', nodes: 1, editableEmpty: true },
  { text: 'No', nodes: 76, editableEmpty: false },
  { text: 'Yes!', nodes: 7, editableEmpty: false },
  { text: '1d', nodes: 1, editableEmpty: false },
  { text: '08-07-2026', nodes: 1, editableEmpty: false },
  { text: '08-08-2026', nodes: 1, editableEmpty: false }
] as const;

/** The value and field type that produced each captured row. */
const SOURCE: Record<string, { value: unknown; isCheckbox: boolean }> = {
  empty: { value: '', isCheckbox: false },
  '0': { value: 0, isCheckbox: false },
  No: { value: false, isCheckbox: true },
  'Yes!': { value: true, isCheckbox: true },
  '1d': { value: '1d', isCheckbox: false },
  '08-07-2026': { value: '08-07-2026', isCheckbox: false },
  '08-08-2026': { value: '08-08-2026', isCheckbox: false }
};

describe('what the reference prints in an xeditable trigger', () => {
  it('covers every node that was measured', () => {
    expect(CAPTURED.reduce((n, r) => n + r.nodes, 0)).toBe(134);
  });

  for (const row of CAPTURED) {
    const { value, isCheckbox } = SOURCE[row.text];

    it(`prints "${row.text}" (${row.nodes} nodes)`, () => {
      expect(editableText(value, isCheckbox)).toBe(row.text);
    });

    it(`${row.editableEmpty ? 'italicises' : 'does not italicise'} "${row.text}"`, () => {
      expect(isEditableEmpty(value, isCheckbox)).toBe(row.editableEmpty);
    });
  }

  /*
    The two ways this was wrong before, stated as the assertions that would have caught them. A
    checkbox is the ONLY place `No` comes from, and `0` is the only falsy value that still prints
    itself — so these two cases are the whole difference between the three candidate rules.
  */
  it('checkbox true is "Yes!", not "Yes"', () => {
    expect(editableText(true, true)).toBe('Yes!');
    expect(editableText(true, true)).not.toBe('Yes');
  });

  it('0 is italic and still prints its digit; false is neither', () => {
    expect(isEditableEmpty(0, false)).toBe(true);
    expect(editableText(0, false)).toBe('0');
    expect(isEditableEmpty(false, true)).toBe(false);
  });

  it('blankness is not the same test as emptiness', () => {
    // 0 is empty (italic) but not blank (prints its value rather than the word)
    expect(isBlank(0)).toBe(false);
    expect(isEditableEmpty(0, false)).toBe(true);
  });

  it('a select shows its option text, not the stored value', () => {
    const options = [{ value: 'open', text: 'Open - Anyone with the room link can join' }] as const;
    expect(editableText('open', false, options)).toBe(options[0].text);
    // an unmatched value still falls back to the reference's own wording
    expect(editableText('', false, options)).toBe('empty');
  });
});
