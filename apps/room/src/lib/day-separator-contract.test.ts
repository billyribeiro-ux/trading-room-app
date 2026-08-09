import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  A date separator precedes the FIRST message and the FIRST alert of every day - including the
  first item in the list.

  Both call sites used to gate on `index > 0`, which suppressed the header on the very first
  item, so a room whose messages all fall on one day showed no date at all.

  The capture settles it by counting rather than by reading: each list carries TWO distinct dates
  and TWO separators. Under `index > 0` the first day's header cannot render, so there would be
  one. There are two.
*/

const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const roomCapture = readFileSync(
  new URL('../../app-room/complete.clean.html', import.meta.url),
  'utf8'
);
const alertCapture = readFileSync(new URL('../../alert-section/1.html', import.meta.url), 'utf8');

describe('day separator', () => {
  it('is evidenced twice per list in the capture, for two distinct days', () => {
    for (const [name, html] of [
      ['app-room/complete.clean.html', roomCapture],
      ['alert-section/1.html', alertCapture]
    ] as const) {
      const separators = html.match(/<div class="separator">/g) ?? [];
      expect(separators.length, `${name} should carry separators`).toBeGreaterThanOrEqual(2);
    }

    // Two distinct dates in the room capture - the arithmetic the fix rests on.
    const dates = new Set(
      [...roomCapture.matchAll(/<div class="separator"><a[^>]*>([^<]+)<\/a>/g)].map((m) =>
        m[1].trim()
      )
    );
    expect(dates.size).toBeGreaterThanOrEqual(2);
  });

  it('renders for the first item of each list, not only for day changes', () => {
    // Two call sites - alerts and chat - and both must include the first item.
    expect((page.match(/showDateSeparator=/g) ?? []).length).toBe(2);
    expect((page.match(/index === 0 \|\|/g) ?? []).length).toBe(2);

    // `index > 0` is what suppressed the first day entirely. It must not come back.
    expect(page).not.toMatch(/showDateSeparator[\s\S]{0,200}index > 0/);

    // The day comparison itself is still what drives every LATER separator.
    expect((page.match(/sameCalendarDay\(/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
