import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROOM_SETTINGS } from './room-settings-schema';

/**
 * Our 269-setting schema against the reference's own TEMPLATE, name for name.
 *
 * ## Why this is the strongest check in the suite
 *
 * `room-settings-schema.ts` was extracted from a DOM CAPTURE — the rendered manage page. This
 * compares it against `page.manageSession.html`, the uncompiled source, which the extraction was
 * never built from and which contains rows the capture could not show. Every earlier surprise this
 * session came from exactly that difference: four icons whose `ng-show` interpolated, a Stripe block
 * behind an `ng-if`, a Select All label with a second span.
 *
 * If the extraction had missed a setting, this is where it shows up.
 *
 * ## Comments are stripped FIRST, and that is not a convenience
 *
 * Eight names appear only inside commented-out markup: `chatAutoClearTime`, `customRoomURL`,
 * `linkedStreamsToSession`, `media_server_audio`, `relay_to_repeaters`, `relay_user_max`, `useV4`
 * and `webinarTZ`. They are not gaps — they are rows the reference itself has switched off, the same
 * situation as `fcmTokens`/`fcmUnreged` on the user row. Counting them as missing would send the
 * next person implementing eight settings that nothing renders.
 */

const TEMPLATE = readFileSync(`${process.cwd()}/evidence-dumps/TIER1-fetched/views/page.manageSession.html`, 'utf8');

/** The template with commented-out markup removed. */
const LIVE = TEMPLATE.replace(/<!--[\s\S]*?-->/g, '');

/**
 * Every setting the LIVE template reads or writes, from both spellings it uses:
 * `onaftersave="saveSessField('x')"` and `editable-<type>="sess.x"`.
 *
 * Both, because neither is complete on its own — a display-only row has the binding and no save, and
 * the two sets differ by four names.
 */
function templateSettingNames(source: string): Set<string> {
  const names = new Set<string>();
  for (const m of source.matchAll(/saveSessField\('([^']+)'\)/g)) names.add(m[1]);
  for (const m of source.matchAll(/editable-\w+="sess\.(\w+)"/g)) names.add(m[1]);
  return names;
}

const live = templateSettingNames(LIVE);
const ours = new Set(ROOM_SETTINGS.map((d) => d.name));

describe('the settings schema covers the reference template exactly', () => {
  it('reads a real set out of the template, so the comparison cannot be vacuous', () => {
    /* Guard against a regex that stops matching: `new Set() === new Set()` would make every
       assertion below pass while comparing nothing. Counted on 2026-08-13. */
    expect(live.size).toBe(267);
  });

  it('is MISSING NOTHING the live template reads or writes', () => {
    const missing = [...live].filter((n) => !ours.has(n)).sort();
    expect(missing, `absent from room-settings-schema.ts: ${missing.join(', ')}`).toEqual([]);
  });

  it('carries exactly two names the template does not, and both are accounted for', () => {
    const extra = [...ours].filter((n) => !live.has(n)).sort();
    /*
      `description` IS live — it is the textAngular Login Landing Page Editor at :636, bound by
      `ng-model="sess.description"`, which is neither of the two spellings above. Present for a
      reason, not an invention.

      `roomType` is the one documented product deviation: the reference's Room Type row is
      COMMENTED OUT (:30-37) and ours is real. `verify-room-settings-schema.mjs` states the same
      thing as "268 extracted + 1 reviewed deviation = 269".
    */
    expect(extra).toEqual(['description', 'roomType']);
  });

  it('reconciles: 267 live + description + roomType = 269', () => {
    expect(live.size + 2).toBe(ROOM_SETTINGS.length);
    expect(ROOM_SETTINGS.length).toBe(269);
  });

  it('the eight commented-out names are NOT counted as gaps', () => {
    /*
      Named individually rather than asserted as a count, so that a ninth appearing — or one of these
      being switched back ON in a re-fetch — is visible rather than absorbed.
    */
    const switchedOff = [
      'chatAutoClearTime',
      'customRoomURL',
      'linkedStreamsToSession',
      'media_server_audio',
      'relay_to_repeaters',
      'relay_user_max',
      'useV4',
      'webinarTZ'
    ];
    const all = templateSettingNames(TEMPLATE);
    for (const name of switchedOff) {
      expect(all.has(name), `${name} must still be present in the raw template`).toBe(true);
      expect(live.has(name), `${name} must be commented out, not live`).toBe(false);
    }
  });
});
