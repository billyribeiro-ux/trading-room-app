import { describe, expect, it } from 'vitest';
import { calculateMessageMenuPosition } from './message-menu-position';

const menu = { left: 0, top: 0, bottom: 0, width: 160, height: 220 };
const viewport = { width: 1000, height: 800, devicePixelRatio: 2 };

describe('app-st-message dropdown placement adapter', () => {
  it('opens below the kebab when there is room', () => {
    expect(
      calculateMessageMenuPosition(
        { left: 24, top: 40, bottom: 56, width: 8, height: 16 },
        menu,
        viewport
      )
    ).toEqual({ left: 24, top: 58, placement: 'bottom-start' });
  });

  it('clamps the menu inside the right edge instead of sending it across the viewport', () => {
    expect(
      calculateMessageMenuPosition(
        { left: 980, top: 40, bottom: 56, width: 8, height: 16 },
        menu,
        viewport
      )
    ).toEqual({ left: 836, top: 58, placement: 'bottom-start' });
  });

  it('flips above the kebab when the menu would be cut off at the bottom', () => {
    expect(
      calculateMessageMenuPosition(
        { left: 24, top: 740, bottom: 756, width: 8, height: 16 },
        menu,
        viewport
      )
    ).toEqual({ left: 24, top: 518, placement: 'top-start' });
  });
});
