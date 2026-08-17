import { fail, redirect } from '@sveltejs/kit';
import { count, desc, eq, sql } from 'drizzle-orm';
import { getDb } from '#lib/server/db/index.js';
import {
  ACCOUNT_ACTIVE,
  ACCOUNT_SUSPENDED,
  accounts,
  apiKeys,
  badges,
  roomUsers,
  rooms,
  users
} from '#lib/server/db/schema.js';
import { recordAdminWrite, requireSuperadmin, superadminCount } from '#lib/server/superadmin.js';
import { beginImpersonation, endImpersonation } from '#lib/server/impersonation.js';
import type { Actions, PageServerLoad } from './$types';

/**
 * The operator's view of every account in the system.
 *
 * ## Deliberately read-only, for now
 *
 * This is the one screen that crosses the tenant boundary `requireOwnedRoom` exists to enforce
 * everywhere else. A read-only first version is not timidity — it means the worst outcome of a bug
 * here is seeing something, not changing somebody's account. Destructive operations get added one
 * at a time, each with its own confirmation and its own test, once billing gives them a reason to
 * exist.
 *
 * ## What it deliberately does NOT show
 *
 *   * **No password hashes.** Not selected at all, so no accident can render one.
 *   * **No API key secrets or ciphertext.** The account page decrypts those for the owner because
 *     the reference does; an operator has no such need, so only counts appear here.
 *   * **No room settings.** 269 keys per room includes `webinarPW`, `ssoJWTSecret` and `s3KeySecret`.
 *     A support view that leaks a customer's credentials is worse than no support view.
 *
 * ## One query per table, not per account
 *
 * Every count is a single grouped query. The obvious shape — loop the accounts, count each one's
 * rooms — is a network round trip per account against Neon, and it degrades exactly as the product
 * succeeds. That mistake was already made and fixed on the account page; it is not repeated here.
 */
export const load: PageServerLoad = async ({ locals, setHeaders }) => {
  const operator = requireSuperadmin(locals);

  // Same posture as the account page: this response carries every customer's name and email.
  setHeaders({ 'cache-control': 'private, no-store' });

  const accountRows = await getDb()
    .select({
      id: accounts.id,
      status: accounts.status,
      suspendedAt: accounts.suspendedAt,
      suspendedReason: accounts.suspendedReason,
      name: accounts.name,
      ownerEmail: accounts.ownerEmail,
      createdAt: accounts.createdAt
    })
    .from(accounts)
    .orderBy(desc(accounts.createdAt));

  const tally = async <T extends { accountId: number; n: number }>(rows: Promise<T[]>) =>
    new Map((await rows).map((row) => [row.accountId, row.n]));

  const [userCounts, roomCounts, badgeCounts, keyCounts] = await Promise.all([
    tally(getDb().select({ accountId: users.accountId, n: count() }).from(users).groupBy(users.accountId)),
    tally(getDb().select({ accountId: rooms.accountId, n: count() }).from(rooms).groupBy(rooms.accountId)),
    tally(getDb().select({ accountId: badges.accountId, n: count() }).from(badges).groupBy(badges.accountId)),
    tally(getDb().select({ accountId: apiKeys.accountId, n: count() }).from(apiKeys).groupBy(apiKeys.accountId))
  ]);

  /*
    The user to impersonate for each account: its OWNER, matched on `accounts.owner_email`.

    Not "the lowest user id", which would silently pick a member if row order ever changed. One
    grouped query rather than a lookup per account, for the same reason every other count here is.
  */
  const ownerRows = await getDb()
    .select({ accountId: users.accountId, userId: users.id, email: users.email })
    .from(users)
    .innerJoin(accounts, eq(accounts.id, users.accountId))
    .where(eq(sql`lower(${users.email})`, sql`lower(${accounts.ownerEmail})`));
  const ownerUserIds = new Map(ownerRows.map((row) => [row.accountId, row.userId]));

  /*
    Membership counts need the join, because `room_users` carries no account id — it belongs to a
    room, and the room belongs to the account. Still one query.
  */
  const memberRows = await getDb()
    .select({ accountId: rooms.accountId, n: count() })
    .from(roomUsers)
    .innerJoin(rooms, eq(rooms.id, roomUsers.roomId))
    .groupBy(rooms.accountId);
  const memberCounts = new Map(memberRows.map((row) => [row.accountId, row.n]));

  /*
    Open rooms across the whole system. A single number the operator can sanity-check against
    reality — if it says four rooms are open and nobody is running a session, something is wrong.
  */
  const [totals] = await getDb()
    .select({
      rooms: count(),
      open: sql<number>`count(*) filter (where ${rooms.state} = 'open')::int`
    })
    .from(rooms);

  return {
    operator: {
      email: operator.email,
      displayName: operator.displayName,
      accountId: operator.accountId,
      /** Drives which controls render. The server refuses regardless; this stops offering them. */
      role: operator.operatorRole
    },
    configuredAdmins: superadminCount(),
    totals: {
      accounts: accountRows.length,
      rooms: totals?.rooms ?? 0,
      openRooms: totals?.open ?? 0
    },
    accounts: accountRows.map((account) => ({
      ...account,
      users: userCounts.get(account.id) ?? 0,
      /** null when the owner email has no user row yet; the control is not offered then. */
      ownerUserId: ownerUserIds.get(account.id) ?? null,
      rooms: roomCounts.get(account.id) ?? 0,
      members: memberCounts.get(account.id) ?? 0,
      badges: badgeCounts.get(account.id) ?? 0,
      apiKeys: keyCounts.get(account.id) ?? 0
    }))
  };
};

/**
 * The operator console's first write: suspend and reinstate an account.
 *
 * ## Why the guardrails and the audit land WITH the write, not after it
 *
 * `docs/OUTSTANDING.md` §3.2 orders this work suspend → roles → guardrails → audit. That order is
 * right for the *console*, but wrong for this action: shipping a write with no trail, or one that
 * can lock the operator out of their own platform, means the first version is the dangerous one.
 * So 3.2.3's self-harm guardrail and 3.2.4's write trail are here, and only operator ROLES (3.2.2)
 * are still outstanding — that one genuinely cannot be done first, because there is nothing to
 * assign roles to until writes exist.
 *
 * ## Where suspension is actually enforced
 *
 * Nowhere near here. `readUser` refuses a suspended session, the login action explains why, and
 * `internal/room-config` stops serving that account's rooms. This action only moves the column.
 */
export const actions: Actions = {
  setAccountStatus: async ({ request, locals, getClientAddress }) => {
    // `support` and above. A read-only operator gets the same 404 an outsider does.
    const operator = requireSuperadmin(locals, 'support');
    const form = await request.formData();
    const targetId = Number(form.get('accountId'));
    const status = String(form.get('status') ?? '');
    const reason = String(form.get('reason') ?? '').trim() || null;

    if (!Number.isInteger(targetId)) return fail(400, { message: 'Which account?' });
    if (status !== ACCOUNT_ACTIVE && status !== ACCOUNT_SUSPENDED) {
      return fail(400, { message: `Unknown account status ${status}.` });
    }

    const [target] = await getDb()
      .select({ id: accounts.id, status: accounts.status, name: accounts.name })
      .from(accounts)
      .where(eq(accounts.id, targetId))
      .limit(1);
    if (!target) return fail(404, { message: 'No such account.' });

    /*
      3.2.3, the guardrail that matters most: an operator may not suspend the account they are
      signed in as.

      `readUser` refuses a suspended session, so this would sign them out on the very next request
      and leave them unable to sign back in to undo it. There is no recovery path in the product —
      it would need somebody with database access. Refused loudly rather than confirmed.
    */
    if (target.id === operator.accountId && status === ACCOUNT_SUSPENDED) {
      return fail(409, {
        message: 'You cannot suspend the account you are signed in as — it would lock you out with no way back.'
      });
    }

    if (target.status === status) return { unchanged: true, status };

    /*
      Audit BEFORE the change, and awaited. If the trail cannot be written the account is not
      touched: an unexplained change to a customer's account is worse than a refused request.
    */
    await recordAdminWrite({
      operatorId: operator.id,
      action: 'set-account-status',
      targetAccountId: target.id,
      before: target.status,
      after: status,
      reason,
      path: '/admin',
      remoteIp: getClientAddress()
    });

    const now = new Date();
    await getDb()
      .update(accounts)
      .set(
        status === ACCOUNT_SUSPENDED
          ? { status, suspendedAt: now, suspendedBy: operator.email, suspendedReason: reason }
          : { status, suspendedAt: null, suspendedBy: null, suspendedReason: null }
      )
      .where(eq(accounts.id, target.id));

    return { statusChanged: status, account: target.name };
  },

  /**
   * 3.2.5 — impersonation. `full` only, and the most dangerous thing here.
   *
   * The refusals live in `beginImpersonation` rather than in this action, because they are
   * properties of impersonation itself and must hold for any future caller: not another operator,
   * not a suspended account, not yourself. This action's job is authority, audit and the redirect.
   */
  impersonate: async ({ request, locals, cookies, getClientAddress }) => {
    const operator = requireSuperadmin(locals, 'full');
    const form = await request.formData();
    const targetUserId = Number(form.get('userId'));
    const reason = String(form.get('reason') ?? '').trim() || null;
    if (!Number.isInteger(targetUserId)) return fail(400, { message: 'Which user?' });

    try {
      await beginImpersonation({
        operatorUserId: operator.id,
        targetUserId,
        reason,
        cookies
      });
    } catch (cause) {
      return fail(409, { message: cause instanceof Error ? cause.message : 'Cannot impersonate.' });
    }

    /*
      The `impersonations` row IS the audit record, so this second entry is not the trail — it is
      what puts an impersonation in the SAME stream as every other operator action, so a reviewer
      reading `admin_audit` chronologically does not miss it.
    */
    await recordAdminWrite({
      operatorId: operator.id,
      action: 'impersonate',
      targetAccountId: operator.accountId,
      before: 'self',
      after: `user:${targetUserId}`,
      reason,
      path: '/admin',
      remoteIp: getClientAddress()
    });

    // Straight into the customer's own view — the point of the feature.
    redirect(303, '/account');
  },

  /** Ending one is deliberately NOT gated on a role: getting out must always be possible. */
  stopImpersonating: async ({ cookies }) => {
    await endImpersonation(cookies);
    redirect(303, '/admin');
  }
};
