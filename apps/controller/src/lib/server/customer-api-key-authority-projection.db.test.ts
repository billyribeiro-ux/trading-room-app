import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ManagedCustomerApiKey } from './tradingroom-api.generated.js';

const CLUSTER = mkdtempSync(join(tmpdir(), 'pcakp-'));
const DATA = join(CLUSTER, 'data');
const PORT = 55_000 + Math.floor(Math.random() * 4_000);
const URL_ = `postgres://127.0.0.1:${PORT}/proroom_customer_api_key_projection_test`;

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
  run('createdb', ['-h', '127.0.0.1', '-p', String(PORT), 'proroom_customer_api_key_projection_test']);
}, 120_000);

afterAll(() => {
  if (started) run('pg_ctl', ['-D', DATA, '-m', 'immediate', '-w', 'stop']);
  rmSync(CLUSTER, { recursive: true, force: true });
});

function key(input: Partial<ManagedCustomerApiKey> = {}): ManagedCustomerApiKey {
  return {
    id: randomUUID().replaceAll('-', '').slice(0, 24),
    revision: 0,
    lastFour: 'cdef',
    restrictions: { ips: [], scopes: [], sessions: [] },
    createdAt: '2026-09-05T10:00:00Z',
    updatedAt: '2026-09-05T10:00:00Z',
    lastUsedAt: null,
    ...input
  };
}

function credential(seed: string) {
  return { secretHash: seed.repeat(64), secretCiphertext: `v1.fixture.${seed}` };
}

describe('canonical customer API-key projection, against real PostgreSQL', () => {
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
        name: `api-key-projection-${suffix}`,
        ownerEmail: `owner-${suffix}@example.test`,
        createdAt: new Date('2026-09-05T09:00:00Z')
      })
      .returning({ id: accounts.id });
    return { db: getDb(), accountId: row.id };
  }

  it('requires credentials for new/rekeyed rows and enforces monotonic content proof', async () => {
    const { projectAuthorityCustomerApiKeys } = await import('./customer-api-key-projection');
    const { apiKeys } = await import('./db/schema');
    const world = await account(`create-${Date.now()}`);
    const canonical = key();
    await expect(projectAuthorityCustomerApiKeys({ accountId: world.accountId, keys: [canonical] })).rejects.toThrow(
      'new-key-credential-missing'
    );
    await projectAuthorityCustomerApiKeys({
      accountId: world.accountId,
      keys: [canonical],
      credentials: new Map([[canonical.id, credential('a')]])
    });
    const [created] = await world.db.select().from(apiKeys).where(eq(apiKeys.id, canonical.id));
    expect(created).toMatchObject({
      accountId: world.accountId,
      authorityRevision: 0,
      lastFour: 'cdef',
      secretHash: 'a'.repeat(64),
      secretCiphertext: 'v1.fixture.a'
    });
    await expect(
      projectAuthorityCustomerApiKeys({
        accountId: world.accountId,
        keys: [{ ...canonical, restrictions: { ips: ['203.0.113.7'], scopes: [], sessions: [] } }]
      })
    ).rejects.toThrow('canonical-revision-content-mismatch');

    await expect(
      projectAuthorityCustomerApiKeys({
        accountId: world.accountId,
        keys: [
          {
            ...canonical,
            updatedAt: '2026-09-05T10:30:00Z',
            lastUsedAt: '2026-09-05T10:30:00Z'
          }
        ]
      })
    ).resolves.toBeUndefined();

    const rotated = {
      ...canonical,
      revision: 1,
      lastFour: '1234',
      updatedAt: '2026-09-05T11:00:00Z'
    };
    await expect(projectAuthorityCustomerApiKeys({ accountId: world.accountId, keys: [rotated] })).rejects.toThrow(
      'credential-projection-missing'
    );
    await projectAuthorityCustomerApiKeys({
      accountId: world.accountId,
      keys: [rotated],
      credentials: new Map([[canonical.id, credential('b')]])
    });
    const [updated] = await world.db.select().from(apiKeys).where(eq(apiKeys.id, canonical.id));
    expect(updated).toMatchObject({
      authorityRevision: 1,
      lastFour: '1234',
      secretHash: 'b'.repeat(64),
      secretCiphertext: 'v1.fixture.b'
    });
    await expect(projectAuthorityCustomerApiKeys({ accountId: world.accountId, keys: [canonical] })).rejects.toThrow(
      'stale-canonical-revision'
    );
  });

  it('refuses cross-account claims and incomplete legacy reconciliation', async () => {
    const { projectAuthorityCustomerApiKeys } = await import('./customer-api-key-projection');
    const { apiKeys } = await import('./db/schema');
    const first = await account(`first-${Date.now()}`);
    const second = await account(`second-${Date.now()}`);
    const canonical = key();
    await projectAuthorityCustomerApiKeys({
      accountId: first.accountId,
      keys: [canonical],
      credentials: new Map([[canonical.id, credential('c')]])
    });
    await expect(
      projectAuthorityCustomerApiKeys({
        accountId: second.accountId,
        keys: [canonical],
        credentials: new Map([[canonical.id, credential('c')]])
      })
    ).rejects.toThrow('key-account-mismatch');

    const legacyId = randomUUID().replaceAll('-', '').slice(0, 24);
    await first.db.insert(apiKeys).values({
      id: legacyId,
      accountId: first.accountId,
      secretHash: 'd'.repeat(64),
      lastFour: 'dddd',
      secretCiphertext: 'v1.fixture.d',
      createdAt: new Date()
    });
    await expect(
      projectAuthorityCustomerApiKeys({ accountId: first.accountId, keys: [canonical], complete: true })
    ).rejects.toThrow('unreconciled-legacy-key');
  });

  it('deletes only explicitly removed or reconciled canonically absent keys', async () => {
    const { projectAuthorityCustomerApiKeys } = await import('./customer-api-key-projection');
    const { apiKeys } = await import('./db/schema');
    const world = await account(`remove-${Date.now()}`);
    const first = key();
    const second = key({ lastFour: 'eeee' });
    await projectAuthorityCustomerApiKeys({
      accountId: world.accountId,
      keys: [first, second],
      credentials: new Map([
        [first.id, credential('e')],
        [second.id, credential('f')]
      ]),
      complete: true
    });
    await projectAuthorityCustomerApiKeys({
      accountId: world.accountId,
      keys: [first],
      complete: true
    });
    expect(await world.db.select().from(apiKeys).where(eq(apiKeys.accountId, world.accountId))).toHaveLength(1);
    await projectAuthorityCustomerApiKeys({
      accountId: world.accountId,
      keys: [],
      removedKeyIds: [first.id]
    });
    expect(await world.db.select().from(apiKeys).where(eq(apiKeys.accountId, world.accountId))).toHaveLength(0);
  });
});
