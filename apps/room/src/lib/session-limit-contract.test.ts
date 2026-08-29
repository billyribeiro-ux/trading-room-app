import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import type { Cookies } from '@sveltejs/kit';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { sessions, users, type User } from '#lib/server/db/schema.js';
import { createSessionFor } from '#lib/server/auth.js';
import { sessionStillAuthenticates } from '#lib/server/connection.js';

/**
 * ONE ACCOUNT, ONE ACTIVE SESSION — against the real database, not against the source text.
 *
 * ## The defect
 *
 * `NEW-TODO.md` Part 1.2: the original lets one login be used from many devices at once, so
 * customers share credentials and one subscription serves several people. This room reproduced it
 * exactly — `createSessionFor` was a plain `INSERT` that deleted nothing, and there was no per-user
 * session limit anywhere in `apps/room`.
 *
 * ## Why this test drives the real thing
 *
 * The rule is three lines inside a transaction, and the ways it can be wrong are all about the
 * DATABASE rather than about the code's shape: deleting too much (every account's sessions), too
 * little (only the same room's), or in an order that leaves a window with no session at all. Reading
 * the source for the word `delete` would pass on all three.
 *
 * `sessionStillAuthenticates` is used to ask whether a session survives, deliberately, rather than
 * counting rows: it is the same query the ordinary request path uses, so what this asserts is
 * "would this browser still be let in", not "is there a row somewhere".
 */

function account(email: string, role: 'member' | 'staff' | 'admin' = 'member'): User {
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return existing;
  return db
    .insert(users)
    .values({
      displayName: `session limit ${role}`,
      email,
      role,
      passwordHash: 'scrypt$00$00',
      createdAt: new Date()
    })
    .returning()
    .get();
}

/** The cookie jar `createSessionFor` writes into. Only `set` is reached. */
function jar(): Cookies & { value: string | undefined } {
  const box = { value: undefined as string | undefined };
  return {
    ...box,
    set(_name: string, value: string) {
      box.value = value;
    },
    get: () => box.value,
    getAll: () => [],
    delete: () => {},
    serialize: () => ''
  } as unknown as Cookies & { value: string | undefined };
}

let member: User;
let presenter: User;
let other: User;

beforeAll(() => {
  ensureDatabase();
  member = account('session-limit-member@example.test');
  presenter = account('session-limit-presenter@example.test', 'staff');
  other = account('session-limit-other@example.test');
});

beforeEach(() => {
  db.delete(sessions).run();
});

describe('a second login evicts the first', () => {
  it('leaves exactly one session for the account', () => {
    const first = createSessionFor(jar(), member.id, false, '1111');
    const second = createSessionFor(jar(), member.id, false, '1111');

    expect(first).not.toBe(second);
    expect(sessionStillAuthenticates(first)).toBe(false);
    expect(sessionStillAuthenticates(second)).toBe(true);
    expect(db.select().from(sessions).where(eq(sessions.userId, member.id)).all()).toHaveLength(1);
  });

  it('evicts across ROOMS, not only within one', () => {
    /*
      Scope is the ACCOUNT, not the account-and-room. Per-room would let one shared login serve two
      rooms at the same moment, which is the leak wearing a narrower hat.
    */
    const inRoomA = createSessionFor(jar(), member.id, false, '1111');
    const inRoomB = createSessionFor(jar(), member.id, false, '2222');

    expect(sessionStillAuthenticates(inRoomA)).toBe(false);
    expect(sessionStillAuthenticates(inRoomB)).toBe(true);
  });

  it('applies to a PRESENTER too — no exemption for any role', () => {
    /*
      Put to the owner explicitly on 2026-08-27, with the laptop-and-phone case named, and answered
      "everything, no exception". Asserted rather than left to the docblock: a role test added here
      later would be a policy change, and this is what makes it a visible one.
    */
    const laptop = createSessionFor(jar(), presenter.id, false, '1111');
    const phone = createSessionFor(jar(), presenter.id, false, '1111');

    expect(sessionStillAuthenticates(laptop)).toBe(false);
    expect(sessionStillAuthenticates(phone)).toBe(true);
  });

  it('does not touch anybody ELSE, which is the way this goes catastrophically wrong', () => {
    const bystander = createSessionFor(jar(), other.id, false, '1111');
    createSessionFor(jar(), member.id, false, '1111');
    createSessionFor(jar(), member.id, false, '1111');

    expect(sessionStillAuthenticates(bystander)).toBe(true);
  });

  it('never leaves the account with NO session, not even for an instant', () => {
    /*
      The reason the delete and the insert are one synchronous `better-sqlite3` transaction. Two
      statements would have a window where the account has no session; a request arriving in it — the
      same browser's own next request — resolves to nobody and redirects to signed out, so a login
      that succeeded presents as one that failed.

      Asserted by observing the only thing a test can observe from outside: after the call, the new
      session authenticates. A non-atomic implementation that threw between the two statements would
      leave zero rows, and this is what fails.
    */
    createSessionFor(jar(), member.id, false, '1111');
    const rows = db.select().from(sessions).where(eq(sessions.userId, member.id)).all();
    expect(rows).toHaveLength(1);
    expect(sessionStillAuthenticates(rows[0].id)).toBe(true);
  });

  it('writes the cookie for the session it kept', () => {
    const cookies = jar();
    const id = createSessionFor(cookies, member.id, false, '1111');
    expect(cookies.get('ptr_connection')).toBe(id);
  });
});

describe('sessionStillAuthenticates', () => {
  it('is false for a session that was deleted out from under the browser', () => {
    const id = createSessionFor(jar(), member.id, false, '1111');
    expect(sessionStillAuthenticates(id)).toBe(true);
    db.delete(sessions).where(eq(sessions.id, id)).run();
    expect(sessionStillAuthenticates(id)).toBe(false);
  });

  it('is false for no session at all, rather than throwing', () => {
    /* The SSE poll calls this with `locals.sessionId`, which is `string | undefined`. */
    expect(sessionStillAuthenticates(undefined)).toBe(false);
    expect(sessionStillAuthenticates('not-a-session')).toBe(false);
  });
});
