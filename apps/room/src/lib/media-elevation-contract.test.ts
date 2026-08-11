import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The live mic/screen hand-over — `giveMicScreen`, and the property that makes it safe.
 *
 * `TODO.md` gap 22. Restarting the recipient's media was necessary and not sufficient: the SFU
 * reads the GRANT's role, and a runtime hand-over never touches the controller's membership. So the
 * grant has to learn about it — and **where it learns it from is the whole security question.**
 *
 * The reference lets the browser re-join asserting its own `isP`
 * (`globals.user.isPresenter = e.give`, then `disconnectAll()`, then a join computing
 * `isP: isPresenter || hasCam || hasMic || hasScreen` from those globals). That is client-asserted
 * authority, and it is exactly what was removed on 2026-08-07 when a token type mapped to `staff`
 * and turned out to be a privilege escalation.
 *
 * These tests exist to stop it coming back the moment somebody "simplifies" the elevation into
 * something the client can send.
 */

const ACTION = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');
const GRANT = readFileSync(
  new URL('../routes/api/media/grant/+server.ts', import.meta.url),
  'utf8'
);
const MODULE = readFileSync(new URL('./server/media-elevation.ts', import.meta.url), 'utf8');

const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('the elevation is decided on the server', () => {
  /*
    THE test in this file.

    If the grant ever reads mic/screen from the request body, a query parameter, or anything else
    the browser controls, any member can mint themselves a producer grant and the SFU will believe
    it. The row is written by a staff-gated action and read back; nothing crosses the boundary.
  */
  it('is read from our own database, never from the request', () => {
    const code = strip(GRANT);
    expect(code).toContain(
      'const elevated = hasMediaElevation(requireRoomShortCode(locals), user.id)'
    );
    // The only inputs to the lookup are the session's own room and the authenticated user.
    expect(code).not.toMatch(/hasMediaElevation\([^)]*request/);
    expect(code).not.toMatch(
      /(elevated|hasMic|hasScreen)\s*[:=][^;\n]*(await\s+request|searchParams|body)/
    );
  });

  it('widens mic and screen, and never the presenter flag itself', () => {
    /*
      An elevation is "you may talk and share", not "you are a presenter". Folding it into
      `isPresenter` would hand the recipient every presenter-only server action — archives, polls,
      alerts, the lot — from a control that says "Mic/Screenshare".
    */
    const code = strip(GRANT);
    expect(code).toContain('hasMic: (config.member?.permissions.hasMic ?? false) || elevated');
    expect(code).toContain(
      'hasScreen: (config.member?.permissions.hasScreen ?? false) || elevated'
    );
    expect(code).toContain('isPresenter: config.member?.isP === true');
    expect(code).not.toMatch(/isPresenter:[^\n]*elevated/);
  });

  it('is written only by the staff-gated action, on both give and take', () => {
    const code = strip(ACTION);
    const handler = code.slice(
      code.indexOf('giveMicScreen: async'),
      code.indexOf('giveMicScreen: async') + 2500
    );
    // The authority check comes FIRST — the row must never be written by someone who could not
    // issue the command.
    expect(handler.indexOf("actor.role !== 'staff'")).toBeLessThan(
      handler.indexOf('grantMediaElevation(')
    );
    expect(handler).toContain('if (give) grantMediaElevation(');
    expect(handler).toContain('else revokeMediaElevation(');
  });
});

describe('the elevation expires and is room-scoped', () => {
  it('is bounded, so a forgotten grant does not last for ever', () => {
    // The capture's dies with the browser's globals. Ours survives a reload on purpose — a member
    // who refreshes mid-sentence should not lose their microphone — so it needs its own ceiling.
    expect(MODULE).toContain('MEDIA_ELEVATION_TTL_MS = 12 * 60 * 60 * 1000');
  });

  it('compares the expiry in SQL rather than in JavaScript', () => {
    // So an expired row cannot be honoured by a process whose clock drifted after it read.
    expect(MODULE).toContain('gt(mediaElevations.expiresAt, now)');
  });

  it('is scoped to one room', () => {
    // Every realtime row here is namespaced by the session; without it, a hand-over in one room
    // would follow the member into another.
    for (const fn of ['grantMediaElevation', 'revokeMediaElevation', 'hasMediaElevation']) {
      const body = MODULE.slice(
        MODULE.indexOf(`export function ${fn}`),
        MODULE.indexOf(`export function ${fn}`) + 900
      );
      expect(body, fn).toContain('roomShortCode');
    }
  });

  it('deletes on revoke rather than leaving a tombstone', () => {
    // A taken-away elevation that lingers is a second state for `hasMic` to be read from wrongly.
    expect(MODULE).toContain('db.delete(mediaElevations)');
  });
});
