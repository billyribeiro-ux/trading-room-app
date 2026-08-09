import { SUPERADMIN_EMAILS } from '$app/env/private';
import { error } from '@sveltejs/kit';
import { getDb } from './db';
import { adminAudit } from './db/schema';

/**
 * Who may see every account in the system.
 *
 * ## Why this is an email allow-list and NOT a password
 *
 * The obvious shape — a second login with its own password — is the wrong one, and worth saying why
 * before somebody adds it back:
 *
 *   * A password that grants cross-tenant access to every customer's data is the single most
 *     valuable credential here. A second one doubles the surface for no benefit.
 *   * It would have to live somewhere. In source it is public; in an env var it is a plaintext
 *     password one `printenv` away; in the database it needs a bootstrap path, which is itself an
 *     unauthenticated way to mint an administrator.
 *   * It would bypass the login path that already exists — the scrypt verification, the failed-
 *     attempt counter, the captcha at three failures. A second door means those protect only the
 *     door nobody is attacking.
 *
 * So there is no superadmin password. A superadmin registers and signs in exactly like everybody
 * else, through the same hardened path, and this list decides what that session may additionally
 * reach. The credential and the privilege are separate facts, which is what lets you revoke the
 * privilege without touching the credential.
 *
 * ## Why an env var and not a database column
 *
 * A column can be written by anything that can write to the database — including a SQL-injection
 * bug, a compromised migration, or a well-meaning script. Granting yourself this privilege would
 * then be an INSERT. Requiring a deployment means the escalation path is "have deploy access",
 * which is a boundary that already exists and is already audited.
 *
 * The cost is honest: adding an administrator needs a redeploy. At this scale that is correct, and
 * it should stay this way until there is a reviewed, audited in-app grant flow.
 */

/**
 * The three operator roles, in increasing privilege.
 *
 * `SUPERADMIN_EMAILS` was one boolean — on the list or not — and that does not survive a second
 * person needing partial access. Retrofitting roles AFTER writes exist is strictly harder, because
 * every call site then has to be revisited under time pressure; this lands with the first write
 * rather than after it.
 *
 * `read-only`  see every account. No writes at all.
 * `support`    the above, plus suspend and reinstate.
 * `full`       the above, plus impersonation.
 *
 * Ordered so a comparison decides authority, rather than a set of `if (role === …)` branches that
 * each have to remember every role.
 */
export const OPERATOR_ROLES = ['read-only', 'support', 'full'] as const;
export type OperatorRole = (typeof OPERATOR_ROLES)[number];

const RANK: Record<OperatorRole, number> = { 'read-only': 0, support: 1, full: 2 };

/** True when `held` is at least `needed`. One comparison, so a new role cannot miss a branch. */
export function operatorRoleAtLeast(held: OperatorRole, needed: OperatorRole): boolean {
  return RANK[held] >= RANK[needed];
}

/**
 * Parsed once. Comma-separated, whitespace tolerated, compared case-insensitively because email
 * local-parts are case-sensitive in the RFC and never in practice — and a superadmin locked out by
 * a capital letter would be "fixed" by loosening something more important.
 *
 * Each entry is `email` or `email:role`.
 *
 * A bare email means **`full`**, which is what every entry meant before roles existed — so an
 * existing deployment keeps working unchanged and nobody is silently demoted by an upgrade.
 *
 * An UNRECOGNISED role is not a parse error and not `full`: it is dropped entirely. A typo like
 * `ops@x:suport` must not grant anything, and the two failure modes available were "grant more
 * than intended" or "grant nothing". Granting nothing is visible the moment somebody tries to use
 * it; granting more is not visible at all.
 */
function parseAllowList(raw: string | undefined): ReadonlyMap<string, OperatorRole> {
  const parsed = new Map<string, OperatorRole>();
  for (const entry of (raw ?? '').split(',')) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const separator = trimmed.lastIndexOf(':');
    const email = (separator === -1 ? trimmed : trimmed.slice(0, separator)).trim().toLowerCase();
    const roleText =
      separator === -1
        ? 'full'
        : trimmed
            .slice(separator + 1)
            .trim()
            .toLowerCase();
    if (!email) continue;
    if (!(OPERATOR_ROLES as readonly string[]).includes(roleText)) {
      console.warn('[admin] ignoring an allow-list entry with an unknown role', { role: roleText });
      continue;
    }
    parsed.set(email, roleText as OperatorRole);
  }
  return parsed;
}

const allowList = parseAllowList(SUPERADMIN_EMAILS);

/** True when at least one superadmin is configured. Used to render an honest "off" state. */
export function superadminConfigured(): boolean {
  return allowList.size > 0;
}

/** How many are configured, for the panel to display. Never the addresses themselves. */
export function superadminCount(): number {
  return allowList.size;
}

export function isSuperadmin(email: string | undefined | null): boolean {
  return operatorRoleOf(email) !== null;
}

/** The role this email holds, or null when it holds none. */
export function operatorRoleOf(email: string | undefined | null): OperatorRole | null {
  if (!email) return null;
  return allowList.get(email.trim().toLowerCase()) ?? null;
}

/**
 * The guard every `/admin` route must call.
 *
 * Answers **404**, not 403. A 403 confirms the route exists and that the visitor is simply not
 * allowed, which tells an attacker they have found the right door and only need a better key. A 404
 * is indistinguishable from the route not existing, which is what `requireOwnedRoom` already does
 * for another account's room and what this mirrors deliberately.
 *
 * Logs every refusal. Cross-tenant access is the one privilege in this system worth an audit trail,
 * and an attempt that fails is more interesting than one that succeeds.
 */
export function requireSuperadmin(locals: App.Locals, needed: OperatorRole = 'read-only') {
  const user = locals.user;
  const role = operatorRoleOf(user?.email);
  /*
    The console is unreachable WHILE IMPERSONATING, even by an operator whose own role would allow
    it.

    `locals.user` is the customer during an impersonation, so `operatorRoleOf` would normally
    answer null and refuse anyway — but only because the customer happens not to be on the list.
    Stating it explicitly means the rule survives the day somebody impersonates a user who IS an
    operator by some other path, and it removes "impersonate, then act as an operator" as a shape
    entirely.
  */
  if (user?.impersonatedBy !== undefined) {
    console.warn('[admin] refused: console is unreachable while impersonating', {
      operatorUserId: user.impersonatedBy
    });
    error(404, 'Not found');
  }
  if (!user || !role || !operatorRoleAtLeast(role, needed)) {
    console.warn('[admin] refused', {
      // The id, not the address: enough to trace in the database, nothing to harvest from a log.
      userId: user?.id ?? null,
      authenticated: Boolean(user),
      held: role ?? 'none',
      needed,
      configuredAdmins: allowList.size
    });
    /*
      404 for an outsider AND for an under-privileged operator.

      A 403 to a `read-only` operator would confirm that the write exists and that they are merely
      the wrong rank, which is a map of the console for anybody who gets one read-only credential.
      They already know the console exists; they do not need to learn its write surface.
    */
    error(404, 'Not found');
  }
  return { ...user, operatorRole: role };
}

/**
 * Writes one row to the durable trail, for a granted or refused reach across the tenant boundary.
 *
 * ## Never throws
 *
 * An audit write that fails must not take the request with it. Two reasons, pulling the same way:
 * a failed INSERT turning a legitimate operator's page into a 500 makes the trail an availability
 * risk, and — worse — an attacker who could reliably break the write would be able to suppress
 * their own record by making the request fail. So the failure is logged loudly and swallowed.
 *
 * The honest cost, stated rather than hidden: this trail is best-effort, not guaranteed. Making it
 * guaranteed means writing it in the same transaction as the read it describes, which a `load` that
 * fans out across five queries does not have. If that guarantee is ever needed, that is the change
 * — not a retry loop here.
 *
 * ## Fire-and-forget on purpose
 *
 * Deliberately not awaited by callers. The row describes a read that has already been authorised;
 * blocking the response on it would add a round trip to every admin page view for no added safety.
 */
export function recordAdminAccess(input: {
  userId: number | null;
  outcome: 'granted' | 'refused';
  path: string;
  remoteIp: string | null;
}): void {
  void getDb()
    .insert(adminAudit)
    .values({
      userId: input.userId,
      outcome: input.outcome,
      path: input.path,
      remoteIp: input.remoteIp,
      createdAt: new Date()
    })
    .catch((cause: unknown) => {
      console.error('[admin] AUDIT WRITE FAILED — this access is unrecorded', {
        outcome: input.outcome,
        path: input.path,
        reason: cause instanceof Error ? cause.message : String(cause)
      });
    });
}

/**
 * Records an operator WRITE, and refuses to let the write happen if it cannot be recorded.
 *
 * Deliberately unlike {@link recordAdminAccess}, in two ways:
 *
 *  - **Awaited, and it throws.** A read whose audit row was lost is a gap in a log. A write whose
 *    audit row was lost is a change to a customer's account that nobody can attribute or explain.
 *    The caller must not proceed, so this rejects rather than swallowing.
 *  - **It brackets the value.** `before` and `after` are what makes the row answer the question
 *    somebody actually asks months later: what was it, and what did it become.
 *
 * Written BEFORE the change, so the ordering failure is "audited but not applied" rather than
 * "applied but unaudited". The first is a puzzling row; the second is an unexplained change.
 */
export async function recordAdminWrite(input: {
  operatorId: number;
  action: string;
  targetAccountId: number;
  before: string;
  after: string;
  reason: string | null;
  path: string;
  remoteIp: string | null;
}): Promise<void> {
  await getDb().insert(adminAudit).values({
    userId: input.operatorId,
    outcome: 'granted',
    path: input.path,
    remoteIp: input.remoteIp,
    action: input.action,
    targetAccountId: input.targetAccountId,
    beforeValue: input.before,
    afterValue: input.after,
    reason: input.reason,
    createdAt: new Date()
  });
}
