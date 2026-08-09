import { describe, expect, it } from 'vitest';
import { formatLastLogin } from './last-login-format';

/*
  The one stamp the evidence gives outright is `08/07/2026 @ 5:05PM`, from the owner's own copy of
  a rendered row. Everything else here is the boundary arithmetic that stamp does not exercise —
  and the 12-hour clock has exactly two values that a naive `% 12` gets wrong.
*/
describe('the Last Login stamp', () => {
  it('reproduces the stamp the rendered row shows', () => {
    // 7 August 2026, 17:05 local.
    expect(formatLastLogin(new Date(2026, 7, 7, 17, 5))).toBe('08/07/2026 @ 5:05PM');
  });

  it('pads the month, day and minute to two digits', () => {
    expect(formatLastLogin(new Date(2026, 0, 3, 9, 7))).toBe('01/03/2026 @ 9:07AM');
  });

  it('calls midnight 12AM, not 0AM', () => {
    // `hours % 12` is 0 here. Printing it unguarded gives "0:00AM", which is not a time.
    expect(formatLastLogin(new Date(2026, 7, 7, 0, 0))).toBe('08/07/2026 @ 12:00AM');
  });

  it('calls noon 12PM, not 0PM or 12AM', () => {
    // The other `% 12 === 0` case, and the one where the meridiem flips.
    expect(formatLastLogin(new Date(2026, 7, 7, 12, 0))).toBe('08/07/2026 @ 12:00PM');
  });

  it('keeps 11:59AM in the morning and 12:00PM in the afternoon', () => {
    expect(formatLastLogin(new Date(2026, 7, 7, 11, 59))).toBe('08/07/2026 @ 11:59AM');
    expect(formatLastLogin(new Date(2026, 7, 7, 12, 1))).toBe('08/07/2026 @ 12:01PM');
  });

  it('does not depend on the visitor locale the way toLocaleString did', () => {
    /*
      The defect this replaced: `toLocaleString()` rendered `07/08/2026, 17:05` under en-GB for the
      same instant — day and month swapped, no meridiem. The month is asserted in FIRST position,
      which is the part that silently changed meaning.
    */
    expect(formatLastLogin(new Date(2026, 7, 7, 17, 5)).slice(0, 5)).toBe('08/07');
  });
});
