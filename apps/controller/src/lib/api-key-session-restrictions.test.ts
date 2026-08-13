import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { readRestrictions } from './server/rooms';

/**
 * `restrictToSessions` — which ROOMS an API key may act on. T5-8.
 *
 * ## Why this is a different axis from `scopes`, and why that matters
 *
 * `scopes` (the reference's `restrictToEndpoints`) says which COMMANDS a key may call. Sessions say
 * which ROOMS it may call them against. A key scoped to `sessions/list` with no room restriction
 * still enumerates every room on the account — so having one axis and calling it "restrictions" is
 * protection that reads as more than it is.
 *
 * The evidence is `page.welcome.html:1339`: the "Restricted" padlock is gated on
 * `(k.restrictToSessions && k.restrictToSessions.length) || (k.restrictToEndpoints && …)`. The field
 * exists, it is a list, and a non-empty one means restricted. The EDITOR's shape is not captured —
 * `manageApiKeyRestrictions(k)` drives it and appears in no dump — so the widget follows our own
 * pattern for `ips` and `scopes`, which is stated in the code rather than implied.
 */

const TEMPLATE = readFileSync(
  `${process.cwd()}/evidence-dumps/TIER1-fetched/views/page.welcome.html`,
  'utf8'
);
const PAGE = readFileSync(`${process.cwd()}/src/routes/(app)/account/+page.svelte`, 'utf8');
const SERVER = readFileSync(`${process.cwd()}/src/routes/(app)/account/+page.server.ts`, 'utf8');

describe('the evidence for the field', () => {
  it('the reference gates its padlock on restrictToSessions having length', () => {
    /* Checked, not remembered — if a re-fetch changes this the citation fails here first. */
    expect(TEMPLATE).toContain('k.restrictToSessions && k.restrictToSessions.length');
    expect(TEMPLATE).toContain('k.restrictToEndpoints && k.restrictToEndpoints.length');
  });
});

describe('readRestrictions', () => {
  it('parses all three lists', () => {
    const r = readRestrictions(
      JSON.stringify({ ips: ['203.0.113.7'], scopes: ['sessions/list'], sessions: ['3625'] })
    );
    expect(r).toEqual({ ips: ['203.0.113.7'], scopes: ['sessions/list'], sessions: ['3625'] });
  });

  it('defaults sessions to EMPTY for a row written before the field existed', () => {
    /*
      The compatibility case, and the reason empty means "every room": every API key row predating
      this field parses as [] and keeps working exactly as before. A default of "no rooms" would have
      silently revoked every existing key.
    */
    expect(readRestrictions(JSON.stringify({ ips: [], scopes: [] })).sessions).toEqual([]);
    expect(readRestrictions('{}').sessions).toEqual([]);
    expect(readRestrictions('not json').sessions).toEqual([]);
  });

  it('drops non-string entries rather than trusting the stored blob', () => {
    const r = readRestrictions(JSON.stringify({ sessions: ['3625', 7, null, { a: 1 }] }));
    expect(r.sessions).toEqual(['3625']);
  });
});

describe('the save action', () => {
  it('filters posted codes against the ACCOUNT’s own rooms', () => {
    /*
      A key restricted to a short code belonging to someone else is not a restriction, it is a typo
      that reads as one. Same deny-by-default reasoning the IP list already gets.
    */
    expect(SERVER).toContain('ownRooms.has(code)');
    expect(SERVER).toMatch(/\.from\(rooms\)\s*\n\s*\.where\(eq\(rooms\.accountId, accountId\)\)/);
  });

  it('persists sessions alongside the other two', () => {
    expect(SERVER).toContain('JSON.stringify({ ips, scopes, sessions })');
  });
});

describe('the row and the editor', () => {
  it('the padlock counts sessions, as the reference’s gate does', () => {
    expect(PAGE).toContain('key.restrictions.sessions.length > 0');
  });

  it('the editor offers the account’s rooms by short code', () => {
    expect(PAGE).toContain('name="sessions"');
    expect(PAGE).toContain('checked={key.restrictions.sessions.includes(room.shortCode)}');
  });

  it('says empty means every room, so the default is not mistaken for a lockout', () => {
    expect(PAGE).toContain('Leave all unticked to allow every room on the account.');
  });
});
