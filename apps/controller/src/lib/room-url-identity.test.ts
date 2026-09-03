import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { readFileSync } from 'node:fs';
import Page from '../routes/(app)/account/+page.svelte';

/**
 * A room is addressed in the URL by its SHORT CODE, never by its database id.
 *
 * `/account/rooms/1?tab=users` carried the primary key AND a query-string tab. The id was and it read as a toy: the first room any
 * the offence: the first room any account creates is `1`, which advertises the row count and belongs
 * to the database rather than to the product. The tab moved into the path in the same spirit. The short code is the room's own identity and the only number this product ever
 * shows for it — the reference's manage header reads `Manage Room id: 3627 (…)`, its Sessions table
 * lists Session ID `3625`, and `provisionRoom` names a new room `Room <shortCode>`.
 *
 * These cases can tell the two apart because the fixture's id and short code deliberately differ:
 * **id 1, short code 3625**. A test written against a room whose id happened to equal its code
 * would pass on either implementation and prove nothing.
 */

/** Only the fields the account page reads. `id` and `shortCode` differ ON PURPOSE. */
const room = (over: Record<string, unknown> = {}) => ({
  id: 1,
  accountId: 1,
  shortCode: '3625',
  name: 'Live Room',
  state: 'open',
  maxUsers: 2,
  textList: '',
  publicId: 'abc',
  vanitySlug: null,
  uniqueSlug: null,
  logoUrl: null,
  clonedFromId: null,
  archivedAt: null,
  createdAt: new Date(),
  userCount: 0,
  launchUrl: 'http://127.0.0.1:5174/session?id=3625',
  ...over
});

function html(rooms: unknown[]) {
  return render(Page as never, {
    props: {
      data: {
        user: {
          id: 1,
          email: 'owner@example.test',
          displayName: 'Owner',
          accountId: 1,
          emailVerifiedAt: new Date()
        },
        emailUnproved: false,
        profileAuthority: { enabled: false },
        entitlements: { marketplace: true },
        rooms,
        badges: [],
        admins: [],
        apiKeys: [],
        apiScopes: []
      },
      form: null
    } as never
  }).body;
}

describe('the account page links to a room by its short code', () => {
  it('points Manage at /account/rooms/3625, not /account/rooms/1', () => {
    const out = html([room()]);

    expect(out).toContain('/account/rooms/3625');
    /*
      The regression this file exists for. `1` is the row's primary key; a URL carrying it tells a
      customer how many rooms the database holds and looks like an unfinished product.
    */
    expect(out, 'no link may carry the database id').not.toMatch(/\/account\/rooms\/1(?![0-9])/);
  });

  it('puts the tab in the PATH, not a query string', () => {
    const out = html([room()]);
    /*
      `…/3625?tab=marketplace` until 2026-08-09. A tab selects which pane of the room you are
      looking at, and a pane is a place rather than an option bolted onto one.
    */
    expect(out).toContain('/account/rooms/3625/marketplace');
    expect(out, 'no link may still carry ?tab=').not.toContain('?tab=');
  });

  it('distinguishes two rooms by code rather than by id', () => {
    // Second room: id 2, code 999. If anything still used the id, this would link to /rooms/2.
    const out = html([room(), room({ id: 2, shortCode: '999', name: 'Second Room' })]);

    expect(out).toContain('/account/rooms/3625');
    expect(out).toContain('/account/rooms/999');
    expect(out).not.toMatch(/\/account\/rooms\/2(?![0-9])/);
  });
});

describe('the server resolves that URL the same way', () => {
  /*
    Read as text rather than executed: the load is a SvelteKit page-server function that needs a
    RequestEvent, a session and a database, and fabricating all three would test the fabrication.
    What is worth pinning here is narrow and textual — that the lookup column is the short code —
    because the failure mode is a silent reversion to `rooms.id`, which type-checks perfectly and
    would 404 every room.

    The behaviour itself is covered where it can be: `account-row-scope.db.test.ts` exercises
    ownership against real PostgreSQL.
  */
  const server = readFileSync(
    new URL('../routes/(app)/account/rooms/[id]/[[tab]]/+page.server.ts', import.meta.url),
    'utf8'
  );

  it('looks the room up by short code', () => {
    expect(server).toMatch(/eq\(rooms\.shortCode, params\.id\)/);
  });

  it('no longer coerces the URL segment to a number', () => {
    // `Number(params.id)` is what a reversion looks like, and it is indistinguishable at a glance.
    expect(server).not.toMatch(/eq\(rooms\.id, Number\(params\.id\)\)/);
    expect(server).not.toMatch(/eq\(rooms\.id, Number\(id\)\)/);
  });

  it('redirects a cloned room to its own code, not its id', () => {
    expect(server).toContain('/account/rooms/${created.shortCode}');
    expect(server).not.toContain('/account/rooms/${created.id}');
  });
});
