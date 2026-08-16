import { beforeAll, describe, expect, test } from 'vitest';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { sessions, users } from '#lib/server/db/schema.js';
import { resolveConnectedIdentity } from './connection';

/**
 * A session must not outlive the longest cookie it was issued with.
 *
 * Before this was enforced, `getSessionUser` matched on the session id alone: a copied
 * cookie authenticated indefinitely, and declining "remember me" bought nothing at all on
 * the server. The cookie's `maxAge` only tells an honest browser when to stop sending a
 * value; it does nothing about a value someone has written down.
 */
describe('session expiry', () => {
  const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;
  let userId = 0;

  /** Minimal stand-in for SvelteKit's `Cookies`, which is all `resolveConnectedIdentity` uses. */
  function cookiesFor(sessionId: string | undefined) {
    return {
      get: (name: string) => (name === 'ptr_connection' ? sessionId : undefined),
      set: () => {},
      delete: () => {}
    } as unknown as Parameters<typeof resolveConnectedIdentity>[0];
  }

  function seedSession(id: string, createdAt: Date) {
    db.insert(sessions).values({ id, userId, createdAt, lastSeenAt: createdAt }).run();
  }

  beforeAll(() => {
    ensureDatabase();
    userId = db
      .insert(users)
      .values({
        displayName: 'Session Expiry Subject',
        email: `expiry-${crypto.randomUUID()}@example.invalid`,
        createdAt: new Date(),
        // Sessions are only honoured for accounts that can actually authenticate.
        passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA'
      })
      .returning({ id: users.id })
      .get().id;
  });

  test('a session created moments ago is accepted', () => {
    const id = crypto.randomUUID();
    seedSession(id, new Date());

    expect(resolveConnectedIdentity(cookiesFor(id)).user?.id).toBe(userId);
  });

  test('a session older than the longest cookie is refused', () => {
    const id = crypto.randomUUID();
    // One minute past the 30-day ceiling.
    seedSession(id, new Date(Date.now() - THIRTY_DAYS_MS - 60_000));

    const resolved = resolveConnectedIdentity(cookiesFor(id));
    expect(resolved.user, 'a stolen cookie must stop working once the session ages out').toBeNull();
  });

  test('a session just inside the window still works', () => {
    const id = crypto.randomUUID();
    // An hour short of the ceiling: still valid, so the check is an expiry and not a
    // blanket refusal.
    seedSession(id, new Date(Date.now() - THIRTY_DAYS_MS + 60 * 60 * 1000));

    expect(resolveConnectedIdentity(cookiesFor(id)).user?.id).toBe(userId);
  });

  test('an unknown session id resolves to nobody', () => {
    expect(resolveConnectedIdentity(cookiesFor(crypto.randomUUID())).user).toBeNull();
    expect(resolveConnectedIdentity(cookiesFor(undefined)).user).toBeNull();
  });
});
