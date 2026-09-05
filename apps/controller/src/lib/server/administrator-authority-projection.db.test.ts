import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ManagedAdministrator } from './tradingroom-api.generated.js';

const CLUSTER = mkdtempSync(join(tmpdir(), 'paap-'));
const DATA = join(CLUSTER, 'data');
const PORT = 55_000 + Math.floor(Math.random() * 4_000);
const URL_ = `postgres://127.0.0.1:${PORT}/proroom_administrator_authority_projection_test`;

vi.mock('$app/env/private', () => ({
  get DATABASE_URL() {
    return URL_;
  },
  SUPERADMIN_EMAILS: '',
  RESEND_API_KEY: '',
  MAIL_FROM: '',
  API_KEY_ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef',
  ROOM_BASE_URL: 'http://127.0.0.1:5174',
  ROOM_JWT_SECRET: 'test-secret-not-a-real-one',
  RECAPTCHA_SECRET_KEY: '',
  CONTROL_PLANE_MODE: '',
  PROFILE_AUTHORITY_MODE: '',
  ROOM_AUTHORITY_MODE: '',
  ROOM_SETTINGS_AUTHORITY_MODE: '',
  MEMBERSHIP_AUTHORITY_MODE: '',
  BADGE_AUTHORITY_MODE: '',
  ADMINISTRATOR_AUTHORITY_MODE: '',
  CUSTOMER_API_KEY_AUTHORITY_MODE: '',
  ROOM_LAUNCH_AUTHORITY_MODE: '',
  TRADINGROOM_INTERNAL_SECRET: '',
  TRADINGROOM_API_URL: '',
  FCM_SERVICE_ACCOUNT_JSON: ''
}));

function run(binary: string, args: string[]) {
  const result = spawnSync(binary, args, { encoding: 'utf8' });
  if (result.status === 0) return;
  let serverLog = '(no server log was written)';
  try {
    serverLog = readFileSync(join(CLUSTER, 'log'), 'utf8');
  } catch {
    // The command stderr remains the primary diagnostic if PostgreSQL did not start.
  }
  throw new Error(
    `${binary} ${args.join(' ')} failed:\n${result.stderr || result.stdout}\n--- postgres log ---\n${serverLog}`
  );
}

let started = false;

beforeAll(() => {
  run('initdb', ['-D', DATA, '--auth=trust', '-E', 'UTF8']);
  run('pg_ctl', [
    '-D',
    DATA,
    '-o',
    `-p ${PORT} -c listen_addresses=127.0.0.1 -c unix_socket_directories=${CLUSTER}`,
    '-w',
    '-l',
    join(CLUSTER, 'log'),
    'start'
  ]);
  started = true;
  run('createdb', ['-h', '127.0.0.1', '-p', String(PORT), 'proroom_administrator_authority_projection_test']);
}, 120_000);

afterAll(() => {
  if (started) run('pg_ctl', ['-D', DATA, '-m', 'immediate', '-w', 'stop']);
  rmSync(CLUSTER, { recursive: true, force: true });
});

function administrator(input: Partial<ManagedAdministrator> = {}): ManagedAdministrator {
  return {
    userId: randomUUID(),
    revision: 0,
    displayName: 'Account Operator',
    email: `operator-${randomUUID()}@example.test`,
    createdAt: '2026-09-05T10:00:00Z',
    updatedAt: '2026-09-05T10:00:00Z',
    ...input
  };
}

describe('canonical administrator projection, against real PostgreSQL', () => {
  beforeAll(async () => {
    const { ensureDatabase } = await import('./db');
    await ensureDatabase();
  }, 120_000);

  async function account(suffix: string) {
    const { getDb } = await import('./db');
    const { accounts } = await import('./db/schema');
    const [row] = await getDb()
      .insert(accounts)
      .values({
        name: `administrator-projection-${suffix}`,
        ownerEmail: `owner-${suffix}@example.test`,
        createdAt: new Date('2026-09-05T09:00:00Z')
      })
      .returning({ id: accounts.id });
    return { db: getDb(), accountId: row.id };
  }

  it('creates a credential-free projection and requires byte-identical equal revisions', async () => {
    const { projectAuthorityAdministrators } = await import('./administrator-projection');
    const { adminUsers } = await import('./db/schema');
    const world = await account(`create-${Date.now()}`);
    const canonical = administrator();
    const mapped = await projectAuthorityAdministrators({
      accountId: world.accountId,
      administrators: [canonical]
    });
    const [row] = await world.db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.id, mapped.get(canonical.userId)!));
    expect(row).toMatchObject({
      accountId: world.accountId,
      authorityUserId: canonical.userId,
      authorityRevision: 0,
      passwordHash: null,
      name: canonical.displayName,
      email: canonical.email
    });
    await expect(
      projectAuthorityAdministrators({
        accountId: world.accountId,
        administrators: [{ ...canonical, displayName: 'Changed without revision' }]
      })
    ).rejects.toThrow('canonical-revision-content-mismatch');
    await projectAuthorityAdministrators({
      accountId: world.accountId,
      administrators: [{ ...canonical, revision: 1, displayName: 'Revision One', updatedAt: '2026-09-05T11:00:00Z' }]
    });
    const [updated] = await world.db.select().from(adminUsers).where(eq(adminUsers.authorityUserId, canonical.userId));
    expect(updated).toMatchObject({ authorityRevision: 1, name: 'Revision One', passwordHash: null });
    await expect(
      projectAuthorityAdministrators({ accountId: world.accountId, administrators: [canonical] })
    ).rejects.toThrow('stale-canonical-revision');
  });

  it('adopts only an unambiguous same-account legacy row and refuses cross-account claims', async () => {
    const { projectAuthorityAdministrators } = await import('./administrator-projection');
    const { adminUsers } = await import('./db/schema');
    const first = await account(`adopt-a-${Date.now()}`);
    const second = await account(`adopt-b-${Date.now()}`);
    const canonical = administrator({ email: `case-${randomUUID()}@example.test` });
    const [legacy] = await first.db
      .insert(adminUsers)
      .values({
        accountId: first.accountId,
        name: 'Legacy',
        email: canonical.email.toUpperCase(),
        passwordHash: 'legacy-hash',
        createdAt: new Date(canonical.createdAt)
      })
      .returning({ id: adminUsers.id });
    const mapped = await projectAuthorityAdministrators({
      accountId: first.accountId,
      administrators: [canonical]
    });
    expect(mapped.get(canonical.userId)).toBe(legacy.id);
    const [adopted] = await first.db.select().from(adminUsers).where(eq(adminUsers.id, legacy.id));
    expect(adopted.passwordHash).toBe('legacy-hash');
    await expect(
      projectAuthorityAdministrators({ accountId: second.accountId, administrators: [canonical] })
    ).rejects.toThrow('administrator-account-mismatch');
  });

  it('refuses unreconciled complete reads and revokes local sessions when canonical authority disappears', async () => {
    const { projectAuthorityAdministrators } = await import('./administrator-projection');
    const { adminUsers, loginSessions, users } = await import('./db/schema');
    const world = await account(`remove-${Date.now()}`);
    const canonical = administrator();
    await world.db.insert(adminUsers).values({
      accountId: world.accountId,
      name: 'Unmapped Legacy',
      email: `legacy-${randomUUID()}@example.test`,
      passwordHash: 'legacy-hash',
      createdAt: new Date()
    });
    await expect(
      projectAuthorityAdministrators({ accountId: world.accountId, administrators: [], complete: true })
    ).rejects.toThrow('unreconciled-legacy-administrator');
    await world.db.delete(adminUsers).where(eq(adminUsers.accountId, world.accountId));
    await projectAuthorityAdministrators({ accountId: world.accountId, administrators: [canonical], complete: true });
    const [identity] = await world.db
      .insert(users)
      .values({
        accountId: world.accountId,
        email: canonical.email,
        displayName: canonical.displayName,
        passwordHash: null,
        emailVerifiedAt: new Date(),
        authorityUserId: canonical.userId,
        authorityReconciledAt: new Date(),
        createdAt: new Date()
      })
      .returning({ id: users.id });
    await world.db.insert(loginSessions).values({
      id: randomUUID().replaceAll('-', ''),
      userId: identity.id,
      createdAt: new Date(),
      lastSeenAt: new Date()
    });
    await projectAuthorityAdministrators({
      accountId: world.accountId,
      administrators: [],
      removedUserIds: [canonical.userId]
    });
    expect(await world.db.select().from(adminUsers).where(eq(adminUsers.accountId, world.accountId))).toHaveLength(0);
    expect(await world.db.select().from(loginSessions).where(eq(loginSessions.userId, identity.id))).toHaveLength(0);
    expect(await world.db.select().from(users).where(eq(users.id, identity.id))).toHaveLength(1);
  });
});
