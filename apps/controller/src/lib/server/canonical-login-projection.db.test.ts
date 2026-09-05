import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Cookies, RequestEvent } from '@sveltejs/kit';

const CLUSTER = mkdtempSync(join(tmpdir(), 'pclp-'));
const DATA = join(CLUSTER, 'data');
const PORT = 55_000 + Math.floor(Math.random() * 4_000);
const URL_ = `postgres://127.0.0.1:${PORT}/proroom_canonical_login_projection_test`;

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
  PROFILE_AUTHORITY_MODE: 'rust',
  ROOM_AUTHORITY_MODE: '',
  ROOM_SETTINGS_AUTHORITY_MODE: '',
  MEMBERSHIP_AUTHORITY_MODE: '',
  BADGE_AUTHORITY_MODE: '',
  ADMINISTRATOR_AUTHORITY_MODE: '',
  CUSTOMER_API_KEY_AUTHORITY_MODE: '',
  ROOM_LAUNCH_AUTHORITY_MODE: '',
  TRADINGROOM_INTERNAL_SECRET: '',
  TRADINGROOM_API_URL: 'http://127.0.0.1:8080',
  FCM_SERVICE_ACCOUNT_JSON: ''
}));
vi.mock('$app/env/public', () => ({ PUBLIC_RECAPTCHA_SITE_KEY: '' }));

const { authorityLogin, authorityLogout, clearApiCookies, readProfileAuthority } = vi.hoisted(() => ({
  authorityLogin: vi.fn(),
  authorityLogout: vi.fn(),
  clearApiCookies: vi.fn(),
  readProfileAuthority: vi.fn()
}));

vi.mock('./tradingroom-api', () => ({
  apiRequestContext: () => ({ cookies: {}, origin: 'https://controller.example.test' }),
  clearApiCookies,
  login: authorityLogin,
  logout: authorityLogout
}));
vi.mock('./profile-authority', () => ({ readProfileAuthority }));

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
  run('createdb', ['-h', '127.0.0.1', '-p', String(PORT), 'proroom_canonical_login_projection_test']);
}, 120_000);

afterAll(() => {
  if (started) run('pg_ctl', ['-D', DATA, '-m', 'immediate', '-w', 'stop']);
  rmSync(CLUSTER, { recursive: true, force: true });
});

function cookieJar() {
  const values = new Map<string, string>();
  return {
    values,
    cookies: {
      get: vi.fn((name: string) => values.get(name)),
      set: vi.fn((name: string, value: string) => values.set(name, value)),
      delete: vi.fn((name: string) => values.delete(name))
    } as unknown as Cookies
  };
}

function event(email: string, password: string, cookies: Cookies): RequestEvent {
  const body = new FormData();
  body.set('email', email);
  body.set('password', password);
  return {
    request: new Request('https://controller.example.test/login', { method: 'POST', body }),
    cookies,
    url: new URL('https://controller.example.test/login'),
    getClientAddress: () => '127.0.0.1',
    locals: {},
    params: {},
    platform: undefined,
    route: { id: '/(public)/login' },
    setHeaders: () => undefined,
    fetch: globalThis.fetch,
    isDataRequest: false,
    isRemoteRequest: false,
    isSubRequest: false,
    tracing: {} as RequestEvent['tracing']
  };
}

async function expectRedirect(operation: Promise<unknown>) {
  try {
    await operation;
  } catch (cause) {
    expect(cause).toMatchObject({ status: 303, location: '/account' });
    return;
  }
  throw new Error('expected the login action to redirect');
}

function bootstrap(userId: string, enterpriseId: string, displayName = 'Canonical Administrator') {
  return {
    ok: true as const,
    status: 200,
    data: {
      user: {
        id: userId,
        displayName,
        isPlatformAdmin: false,
        isGuest: false,
        preferences: {}
      },
      accounts: [{ id: enterpriseId, name: 'Canonical Account', role: 'admin', rooms: [], slug: 'canonical' }]
    }
  };
}

describe('canonical-first controller login, against real PostgreSQL', () => {
  beforeAll(async () => {
    const { ensureDatabase } = await import('./db');
    await ensureDatabase();
  }, 120_000);

  beforeEach(() => {
    vi.clearAllMocks();
    authorityLogout.mockResolvedValue({ ok: true, status: 204, data: null });
  });

  async function account(suffix: string, enterpriseId: string) {
    const { getDb } = await import('./db');
    const { accounts } = await import('./db/schema');
    const [row] = await getDb()
      .insert(accounts)
      .values({
        name: `canonical-login-${suffix}`,
        ownerEmail: `owner-${suffix}@example.test`,
        authorityEnterpriseId: enterpriseId,
        authorityReconciledAt: new Date(),
        createdAt: new Date()
      })
      .returning({ id: accounts.id });
    return { db: getDb(), accountId: row.id };
  }

  it('creates a non-password local shadow after canonical credentials succeed', async () => {
    const { actions } = await import('../../routes/(public)/login/+page.server');
    const { loginSessions, users } = await import('./db/schema');
    const userId = randomUUID();
    const enterpriseId = randomUUID();
    const email = `new-admin-${randomUUID()}@example.test`;
    const world = await account(`new-${Date.now()}`, enterpriseId);
    authorityLogin.mockResolvedValue({ ok: true, status: 200, data: { userId } });
    readProfileAuthority.mockResolvedValue(bootstrap(userId, enterpriseId));
    const jar = cookieJar();

    await expectRedirect(Promise.resolve(actions.default!(event(email, 'canonical-password', jar.cookies) as never)));
    const [created] = await world.db.select().from(users).where(eq(users.authorityUserId, userId));
    expect(created).toMatchObject({
      accountId: world.accountId,
      email,
      displayName: 'Canonical Administrator',
      passwordHash: null,
      authorityUserId: userId
    });
    expect(created.emailVerifiedAt).toBeInstanceOf(Date);
    expect(await world.db.select().from(loginSessions).where(eq(loginSessions.userId, created.id))).toHaveLength(1);
    expect(authorityLogin).toHaveBeenCalledWith(expect.anything(), {
      email,
      password: 'canonical-password'
    });
  });

  it('never lets a stale local password veto a successful canonical login', async () => {
    const { actions } = await import('../../routes/(public)/login/+page.server');
    const { users } = await import('./db/schema');
    const userId = randomUUID();
    const enterpriseId = randomUUID();
    const email = `mapped-admin-${randomUUID()}@example.test`;
    const world = await account(`mapped-${Date.now()}`, enterpriseId);
    await world.db.insert(users).values({
      accountId: world.accountId,
      email,
      displayName: 'Stale Local Name',
      passwordHash: 'not:a:usable:hash',
      emailVerifiedAt: new Date(),
      authorityUserId: userId,
      authorityReconciledAt: new Date(),
      createdAt: new Date()
    });
    authorityLogin.mockResolvedValue({ ok: true, status: 200, data: { userId } });
    readProfileAuthority.mockResolvedValue(bootstrap(userId, enterpriseId, 'Canonical Name'));

    await expectRedirect(
      Promise.resolve(actions.default!(event(email, 'only-rust-knows-this', cookieJar().cookies) as never))
    );
    const [updated] = await world.db.select().from(users).where(eq(users.authorityUserId, userId));
    expect(updated.displayName).toBe('Canonical Name');
    expect(updated.passwordHash).toBe('not:a:usable:hash');
  });

  it('fails closed on missing membership and mismatched local identity without creating a session', async () => {
    const { actions } = await import('../../routes/(public)/login/+page.server');
    const { loginSessions, users } = await import('./db/schema');
    const userId = randomUUID();
    const enterpriseId = randomUUID();
    const email = `refused-admin-${randomUUID()}@example.test`;
    await account(`refused-${Date.now()}`, enterpriseId);
    const db = (await import('./db')).getDb();
    const sessionsBefore = await db.select().from(loginSessions);
    authorityLogin.mockResolvedValue({ ok: true, status: 200, data: { userId } });
    const canonical = bootstrap(userId, enterpriseId);
    readProfileAuthority.mockResolvedValue({ ...canonical, data: { ...canonical.data, accounts: [] } });

    const result = await actions.default!(event(email, 'canonical-password', cookieJar().cookies) as never);
    expect(result).toMatchObject({ status: 503 });
    expect(await db.select().from(users).where(eq(users.email, email))).toHaveLength(0);
    expect(await db.select().from(loginSessions)).toHaveLength(sessionsBefore.length);
    expect(authorityLogout).toHaveBeenCalledTimes(1);
  });
});
