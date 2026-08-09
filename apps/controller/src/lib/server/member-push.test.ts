import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FcmOutcome } from './fcm';

/**
 * `listFcmRegistrations` and `sendTestPushToMember`, against a fake database and a fake FCM.
 *
 * These pin the four properties that are expensive to get wrong: a membership row from another
 * room is unreachable, a token is never printed in full, a registration FCM disowned is deleted,
 * and one that FCM merely could not be asked about is left exactly where it was.
 *
 * The SQL itself is not proved here — that belongs in a `*.db.test.ts` against real PostgreSQL.
 * What IS proved is that every statement carries the `roomId` predicate, because the fake evaluates
 * the same predicate objects the real code builds.
 */

const roomUserRows: Array<Record<string, unknown>> = [];
const userRows: Array<Record<string, unknown>> = [];
const roomRows: Array<Record<string, unknown>> = [];

const fcm = vi.hoisted(() => ({
  configured: true,
  send: vi.fn()
}));

/*
  Importing `rooms.ts` pulls in `auth.ts`, and through it the impersonation and superadmin modules,
  which read their own variables at module scope. All of them are blank here: this is the
  deployment's real state, and it keeps the fake environment from being a fifth place a value can
  disagree with production.
*/
vi.mock('$app/env/private', () => ({
  RESEND_API_KEY: '',
  MAIL_FROM: '',
  FCM_SERVICE_ACCOUNT_JSON: '',
  SUPERADMIN_EMAILS: ''
}));

vi.mock('./fcm', async (importOriginal) => {
  // The real error classes, because the code under test branches on `instanceof`; a hand-rolled
  // stand-in would make every one of those branches untested while looking tested.
  const actual = await importOriginal<typeof import('./fcm')>();
  return { ...actual, fcmConfigured: () => fcm.configured, sendPush: fcm.send };
});

const tablesByName: Record<string, Array<Record<string, unknown>>> = {
  room_users: roomUserRows,
  users: userRows,
  rooms: roomRows
};

type Row = Record<string, unknown>;
type Predicate = (row: Row) => boolean;

vi.mock('./db', () => ({
  getDb: () => ({
    select: () => ({
      from: (table: { table: string }) => {
        const all = () => tablesByName[table.table] ?? [];
        return {
          where: (predicate: Predicate) => {
            const hit = all().filter(predicate);
            return Object.assign(Promise.resolve(hit), { limit: async () => hit });
          }
        };
      }
    }),
    update: (table: { table: string }) => ({
      set: (patch: Row) => ({
        where: (predicate: Predicate) => {
          const hit = (tablesByName[table.table] ?? []).filter(predicate);
          for (const row of hit) Object.assign(row, patch);
          return Object.assign(Promise.resolve(hit), { returning: async () => hit });
        }
      })
    })
  })
}));

vi.mock('drizzle-orm', () => ({
  eq: (col: { name: string }, value: unknown) => (row: Row) => row[col.name] === value,
  ne: (col: { name: string }, value: unknown) => (row: Row) => row[col.name] !== value,
  isNull: (col: { name: string }) => (row: Row) => row[col.name] == null,
  inArray: (col: { name: string }, values: unknown[]) => (row: Row) => values.includes(row[col.name]),
  and:
    (...preds: Predicate[]) =>
    (row: Row) =>
      preds.every((p) => p(row))
}));

/** Column stubs keyed by their JS name, so a renamed field breaks these tests rather than passing. */
const table = (name: string, columns: string[]) =>
  Object.fromEntries([['table', name], ...columns.map((c) => [c, { name: c }])]);

vi.mock('./db/schema', () => ({
  roomUsers: table('room_users', [
    'id',
    'roomId',
    'userId',
    'role',
    'pushTokensJson',
    'notificationsState',
    'badgesJson',
    'permissionsJson'
  ]),
  users: table('users', ['id', 'email', 'displayName', 'passwordHash', 'emailVerifiedAt', 'accountId']),
  rooms: table('rooms', ['id', 'accountId', 'name', 'publicId', 'uniqueSlug', 'shortCode']),
  roomSettings: table('room_settings', ['roomId', 'settingsJson', 'updatedAt']),
  accounts: table('accounts', ['id', 'status']),
  loginSessions: table('login_sessions', ['id', 'userId', 'lastSeenAt']),
  impersonations: table('impersonations', ['id', 'operatorUserId', 'targetUserId', 'expiresAt', 'endedAt']),
  emailVerificationTokens: table('email_verification_tokens', ['tokenHash', 'userId', 'purpose', 'consumedAt']),
  ACCOUNT_ACTIVE: 'active',
  IMPERSONATION_TTL_MS: 900_000
}));

const { FcmNotConfigured, FcmUnreachable } = await import('./fcm');
const { listFcmRegistrations, listPushTokens, sendTestPushToMember } = await import('./rooms');

const LIVE = 'live-registration-token-AAAAAA';
const DEAD = 'dead-registration-token-ZZZZZZ';

function seed() {
  roomRows.push({ id: 10, accountId: 1, name: 'Room 3627', publicId: 'abc', uniqueSlug: null });
  roomRows.push({ id: 20, accountId: 2, name: "Somebody else's room", publicId: 'def', uniqueSlug: null });
  roomUserRows.push({
    id: 500,
    roomId: 10,
    userId: 77,
    role: 2,
    notificationsState: 'active',
    pushTokensJson: JSON.stringify([
      { token: LIVE, platform: 'android', addedAt: 1 },
      { token: DEAD, platform: 'ios', addedAt: 2 }
    ])
  });
  userRows.push({ id: 77, email: 'member@example.test', displayName: 'A Member' });
}

const ok: FcmOutcome = { ok: true, name: 'projects/p/messages/1' };
const gone: FcmOutcome = { ok: false, reason: 'unregistered', status: 404, errorCode: 'UNREGISTERED' };

beforeEach(() => {
  roomUserRows.length = 0;
  userRows.length = 0;
  roomRows.length = 0;
  fcm.configured = true;
  fcm.send.mockReset();
  seed();
});

describe('account isolation', () => {
  /*
    Room 20 belongs to account 2; room-user 500 belongs to room 10, on account 1. The route's own
    `ownedRoomId` is what stops account 2 naming room 10 at all — this is the second gate, which
    stops a row id from ANY other room being reached through a room the caller does own.
  */
  it('refuses a membership row that belongs to another room', async () => {
    await expect(listFcmRegistrations(20, 500)).rejects.toThrow('no such member in this room');
    await expect(sendTestPushToMember(20, 500)).rejects.toThrow('no such member in this room');
    await expect(listPushTokens(20, 500)).rejects.toThrow('no such member in this room');
    expect(fcm.send).not.toHaveBeenCalled();
  });

  it('reaches it through its own room', async () => {
    fcm.send.mockResolvedValue(ok);
    await expect(listFcmRegistrations(10, 500)).resolves.toMatchObject({ pruned: 0 });
  });
});

describe('an unconfigured deployment', () => {
  it('refuses both push actions loudly, naming the variable', async () => {
    fcm.configured = false;
    await expect(listFcmRegistrations(10, 500)).rejects.toThrow(FcmNotConfigured);
    await expect(sendTestPushToMember(10, 500)).rejects.toThrow(/FCM_SERVICE_ACCOUNT_JSON/);
    // Not a no-op dressed as an empty result, and nothing was written.
    expect(JSON.parse(String(roomUserRows[0].pushTokensJson))).toHaveLength(2);
  });

  it('still answers "no such member" before it answers "not configured"', async () => {
    // Otherwise an unconfigured deployment would confirm that somebody else's row id exists.
    fcm.configured = false;
    await expect(listFcmRegistrations(20, 500)).rejects.toThrow('no such member in this room');
  });
});

describe('masking', () => {
  it('returns the last six characters and never the token', async () => {
    fcm.send.mockResolvedValue(ok);
    const result = await listFcmRegistrations(10, 500);

    expect(result.tokens.map((t) => t.lastSix)).toEqual(['AAAAAA', 'ZZZZZZ']);
    const payload = JSON.stringify(result);
    expect(payload).not.toContain(LIVE);
    expect(payload).not.toContain(DEAD);
  });

  it('masks the send report the same way, because they are the same credentials', async () => {
    fcm.send.mockResolvedValue(ok);
    const result = await sendTestPushToMember(10, 500);
    expect(JSON.stringify(result)).not.toContain(LIVE);
    expect(result.results.map((r) => r.lastSix)).toEqual(['AAAAAA', 'ZZZZZZ']);
  });
});

describe('getFCMTokens is a different question from showAlerterAppTokens', () => {
  it('checks every registration with FCM, without delivering anything', async () => {
    fcm.send.mockResolvedValue(ok);
    await listFcmRegistrations(10, 500);

    expect(fcm.send).toHaveBeenCalledTimes(2);
    for (const call of fcm.send.mock.calls) expect(call[0].dryRun).toBe(true);
  });

  it('carries a state per registration, which the stored read does not', async () => {
    fcm.send.mockImplementation(async (m: { registrationToken: string }) => (m.registrationToken === DEAD ? gone : ok));
    const live = await listFcmRegistrations(10, 500);
    expect(live.tokens.map((t) => t.state)).toEqual(['registered', 'unregistered']);

    // The stored read has no such field: it reports what was written down, not what FCM says.
    const stored = await listPushTokens(10, 500);
    expect(stored.every((t) => !('state' in t))).toBe(true);
  });
});

describe('stale registrations', () => {
  it('deletes the one FCM disowned, and keeps the one it accepted', async () => {
    fcm.send.mockImplementation(async (m: { registrationToken: string }) => (m.registrationToken === DEAD ? gone : ok));
    const result = await listFcmRegistrations(10, 500);

    expect(result.pruned).toBe(1);
    const remaining = JSON.parse(String(roomUserRows[0].pushTokensJson)) as Array<{ token: string }>;
    expect(remaining.map((t) => t.token)).toEqual([LIVE]);
  });

  it('prunes on a real send too, and reports sent and failed separately', async () => {
    fcm.send.mockImplementation(async (m: { registrationToken: string }) => (m.registrationToken === DEAD ? gone : ok));
    const result = await sendTestPushToMember(10, 500);

    expect(result).toMatchObject({ registrations: 2, sent: 1, failed: 1, pruned: 1 });
    expect(result.results.map((r) => r.outcome)).toEqual(['sent', 'unregistered']);
    expect(JSON.parse(String(roomUserRows[0].pushTokensJson))).toHaveLength(1);
  });

  it('does NOT prune when the failure was ours — a quota rejection keeps the device', async () => {
    fcm.send.mockResolvedValue({ ok: false, reason: 'rejected', status: 429, errorCode: 'QUOTA_EXCEEDED' });
    const result = await sendTestPushToMember(10, 500);

    expect(result).toMatchObject({ sent: 0, failed: 2, pruned: 0 });
    expect(JSON.parse(String(roomUserRows[0].pushTokensJson))).toHaveLength(2);
  });

  it('does NOT prune a token FCM called invalid, because a bad PAYLOAD gets the same error', async () => {
    /*
      INVALID_ARGUMENT is FCM's answer both to a malformed registration token and to a malformed
      message. The second is our bug and applies to every token at once, so pruning on it would
      delete every device in the room the first time a payload went wrong.
    */
    fcm.send.mockResolvedValue({ ok: false, reason: 'invalid-token', status: 400, errorCode: 'INVALID_ARGUMENT' });

    const checked = await listFcmRegistrations(10, 500);
    expect(checked.tokens.map((t) => t.state)).toEqual(['invalid', 'invalid']);
    expect(checked.pruned).toBe(0);

    const pushed = await sendTestPushToMember(10, 500);
    expect(pushed).toMatchObject({ sent: 0, failed: 2, pruned: 0 });
    expect(JSON.parse(String(roomUserRows[0].pushTokensJson))).toHaveLength(2);
  });

  it('reports a refusal that says nothing about the device as unchecked, not as alive', async () => {
    // A quota rejection is FCM declining to answer. Calling it "registered" would invent an answer.
    fcm.send.mockResolvedValue({ ok: false, reason: 'rejected', status: 429, errorCode: 'QUOTA_EXCEEDED' });
    const checked = await listFcmRegistrations(10, 500);
    expect(checked.tokens.map((t) => t.state)).toEqual(['unchecked', 'unchecked']);
    expect(checked.pruned).toBe(0);
  });

  it('does NOT prune when Google could not be reached', async () => {
    /*
      The expensive mistake this guards: an outage looks exactly like two dead tokens if the code
      catches the network error and calls it a rejection. Every registration in the room would be
      deleted, and no retry could bring them back — only the devices re-registering could.
    */
    fcm.send.mockRejectedValue(new FcmUnreachable('ECONNREFUSED'));
    const result = await listFcmRegistrations(10, 500);

    expect(result.tokens.map((t) => t.state)).toEqual(['unchecked', 'unchecked']);
    expect(result.pruned).toBe(0);
    expect(JSON.parse(String(roomUserRows[0].pushTokensJson))).toHaveLength(2);

    const sendResult = await sendTestPushToMember(10, 500);
    expect(sendResult).toMatchObject({ sent: 0, failed: 2, pruned: 0 });
    expect(sendResult.results.map((r) => r.outcome)).toEqual(['unreachable', 'unreachable']);
  });

  it('reports zero registrations as zero, rather than as a successful send', async () => {
    roomUserRows[0].pushTokensJson = '[]';
    const result = await sendTestPushToMember(10, 500);
    expect(result).toMatchObject({ registrations: 0, sent: 0, failed: 0 });
    expect(fcm.send).not.toHaveBeenCalled();
  });
});
