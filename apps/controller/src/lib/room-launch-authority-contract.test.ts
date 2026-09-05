import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

const ACCOUNT = readFileSync('src/routes/(app)/account/+page.server.ts', 'utf8');
const MANAGE = readFileSync('src/routes/(app)/account/rooms/[id]/[[tab]]/+page.server.ts', 'utf8');
const LAUNCH = readFileSync('src/routes/(app)/launch/[id]/+server.ts', 'utf8');
const EXIT = readFileSync('src/routes/internal/room-visit-exit/[code]/+server.ts', 'utf8');
const LOGOUT = readFileSync('../room/src/routes/logout/+page.server.ts', 'utf8');
const ROOM_CLIENT = readFileSync('../room/src/lib/server/room-config-client.ts', 'utf8');
const visitExitStart = ROOM_CLIENT.indexOf('export async function notifyRoomVisitExit');
const VISIT_EXIT_CLIENT = ROOM_CLIENT.slice(visitExitStart, ROOM_CLIENT.indexOf('\nexport ', visitExitStart + 1));

describe('the final Gate 3 launch path is one current authorization door', () => {
  test('account pages never mint or serialize a room credential', () => {
    for (const source of [ACCOUNT, MANAGE]) {
      expect(source).toContain('`/launch/${encodeURIComponent(');
      expect(source).not.toContain('launchHref(');
      expect(source).not.toContain('siteHandoffToken(');
    }
  });

  test('rust mode commits authority before minting the short-lived handoff', () => {
    const mode = LAUNCH.indexOf("roomLaunchAuthorityMode === 'rust'");
    const authority = LAUNCH.indexOf('await launchRoomInAuthority(', mode);
    const binding = LAUNCH.indexOf('canonical.data.roomId !== room.authorityRoomId', authority);
    const mint = LAUNCH.indexOf('siteHandoffToken(secret', binding);
    expect([mode, authority, binding, mint].every((offset) => offset >= 0)).toBe(true);
    expect(mode).toBeLessThan(authority);
    expect(authority).toBeLessThan(binding);
    expect(binding).toBeLessThan(mint);
  });

  test('logout notifies the scoped close path before destroying its local session', () => {
    expect(EXIT).toContain('verifyConfigWriteToken(secret, params.code, presented)');
    expect(EXIT).toContain("roomLaunchAuthorityMode === 'rust'");
    expect(EXIT).toContain('closeRoomVisitInAuthority({');
    expect(EXIT).toContain('Object.keys(payload).length !== 1');
    expect(EXIT).not.toContain('url.searchParams');
    expect(VISIT_EXIT_CLIENT).toContain('body: JSON.stringify({ email })');
    expect(VISIT_EXIT_CLIENT).toContain("'content-type': 'application/json'");
    expect(VISIT_EXIT_CLIENT).not.toContain("searchParams.set('email'");
    expect(LOGOUT.indexOf('await notifyRoomVisitExit(')).toBeLessThan(LOGOUT.indexOf('logout(cookies)'));
  });
});
