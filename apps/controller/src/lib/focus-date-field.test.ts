import { describe, expect, it, vi } from 'vitest';
import { focusDateField } from './focus-date-field';

/**
 * The click-to-edit date fields on the manage page's User Stats pane.
 *
 * These pin a defect that shipped and was caught by the audit's own adversarial verifier: the
 * `<input type="date">` was created on click and never focused, so the picker never opened AND —
 * the part that made it a trap — the row could not close, because its only exits are `change` and
 * `blur`, and `blur` cannot fire on an element that never held focus.
 */

describe('focusDateField', () => {
  it('focuses the field, which is the half that unsticks the row', () => {
    const focus = vi.fn();
    focusDateField({ focus });
    expect(focus).toHaveBeenCalledOnce();
  });

  it('opens the picker, which is the half the control exists for', () => {
    const showPicker = vi.fn();
    focusDateField({ focus: vi.fn(), showPicker });
    expect(showPicker).toHaveBeenCalledOnce();
  });

  it('focuses BEFORE opening the picker', () => {
    /*
      The order is load-bearing, not stylistic. `showPicker` throws when the call is not
      user-activated; if it ran first, that throw would take the focus call down with it and leave
      the original stuck-row defect exactly as it was.
    */
    const calls: string[] = [];
    focusDateField({
      focus: () => calls.push('focus'),
      showPicker: () => calls.push('showPicker')
    });
    expect(calls).toEqual(['focus', 'showPicker']);
  });

  it('still focuses when showPicker throws, so a refused popup does not cost the fix', () => {
    const focus = vi.fn();
    const showPicker = vi.fn(() => {
      // What a browser does when the call is not user-activated.
      throw new DOMException('showPicker() requires a user gesture', 'NotAllowedError');
    });

    expect(() => focusDateField({ focus, showPicker })).not.toThrow();
    expect(focus).toHaveBeenCalledOnce();
  });

  it('tolerates a browser with no showPicker at all', () => {
    const focus = vi.fn();
    // No `showPicker` property whatsoever — an older engine, or a non-date input.
    expect(() => focusDateField({ focus })).not.toThrow();
    expect(focus).toHaveBeenCalledOnce();
  });

  it('does not call a showPicker that is present but not a function', () => {
    /*
      Defensive for a reason: `typeof` rather than truthiness. A property that exists and is not
      callable would throw a TypeError OUTSIDE the try block if this were a truthiness check, which
      is the one failure mode the catch above cannot absorb.
    */
    const focus = vi.fn();
    expect(() => focusDateField({ focus, showPicker: 'not a function' as unknown as () => void })).not.toThrow();
    expect(focus).toHaveBeenCalledOnce();
  });
});
