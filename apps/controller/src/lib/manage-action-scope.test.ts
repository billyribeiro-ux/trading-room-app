import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  Every form action on the manage page must resolve its room through `ownedRoomId`.

  `ownedRoomId` is the ONLY thing standing between one account and another's room: it re-reads the
  row by the id in the URL and hands it to `requireOwnedRoom`, which 404s when the account does not
  match. An action that takes `params.id` and queries with it directly looks identical in review,
  passes `svelte-check`, passes every unit test, and is a cross-tenant hole.

  Whole-file rather than only the four newest actions, because the failure is not specific to them —
  it belongs to whichever action is written next, by whoever is not thinking about tenancy that day.
*/

const server = readFileSync(
  new URL('../routes/(app)/account/rooms/[id]/[[tab]]/+page.server.ts', import.meta.url),
  'utf8'
);

/** The `actions` object only — so a helper above it cannot be mistaken for an action. */
const actionsBlock = server.slice(server.indexOf('export const actions: Actions = {'));

/** `name` → its body, from its own declaration to the next one. */
const bodies = new Map<string, string>();
{
  const declarations = [...actionsBlock.matchAll(/^ {2}([A-Za-z0-9_]+): async/gm)];
  for (const [index, match] of declarations.entries()) {
    const start = match.index ?? 0;
    const end = declarations[index + 1]?.index ?? actionsBlock.length;
    bodies.set(match[1], actionsBlock.slice(start, end));
  }
}

describe('the manage page actions', () => {
  it('found actions at all', () => {
    // Without this the loop below passes vacuously the moment the extraction stops matching.
    expect(bodies.size).toBeGreaterThan(20);
  });

  for (const name of [
    'getFcmTokens',
    'sendTestPush',
    'sendWelcomeEmail',
    'sendWebinarReminder',
    'showAppTokens',
    'resetNotifications'
  ]) {
    it(`${name} exists`, () => {
      expect(bodies.has(name)).toBe(true);
    });
  }
});

describe('account scoping', () => {
  it('resolves the room through ownedRoomId in every single action', () => {
    const unscoped = [...bodies].filter(([, body]) => !body.includes('ownedRoomId(locals, params.id)')).map(([n]) => n);
    expect(unscoped).toEqual([]);
  });

  it('never reads a member id without first resolving the room', () => {
    /*
      Order matters as much as presence. `ownedRoomId` throws a 404 for a room this account does not
      own; reading and acting on `roomUserId` above that line would do the work first and check
      afterwards.
    */
    for (const [name, body] of bodies) {
      const memberAt = body.indexOf("get('roomUserId')");
      if (memberAt === -1) continue;
      const scopeAt = body.indexOf('ownedRoomId(locals, params.id)');
      expect(scopeAt, `${name} reads roomUserId before scoping the room`).toBeLessThan(memberAt);
    }
  });
});

describe('the four newest actions carry the fields the template posts', () => {
  for (const name of ['getFcmTokens', 'sendTestPush', 'sendWelcomeEmail']) {
    it(`${name} reads roomUserId`, () => {
      expect(bodies.get(name)).toContain("get('roomUserId')");
    });
  }

  it('sendWebinarReminder reads eventTime', () => {
    expect(bodies.get('sendWebinarReminder')).toContain("get('eventTime')");
  });
});
