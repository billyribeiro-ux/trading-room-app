import { createHash } from 'node:crypto';
import { and, eq, inArray, or, sql } from 'drizzle-orm';
import type { ManagedAdministrator } from './tradingroom-api.generated.js';
import { getDb } from './db/index.js';
import { adminUsers, loginSessions, users } from './db/schema.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class AdministratorProjectionError extends Error {
  constructor(readonly code: string) {
    super(`Canonical administrator projection refused: ${code}`);
    this.name = 'AdministratorProjectionError';
  }
}

function timestamp(value: string, code: string): { date: Date; canonical: string } {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new AdministratorProjectionError(code);
  return { date, canonical: date.toISOString() };
}

export function administratorAuthorityContentHash(administrator: ManagedAdministrator): string {
  const exact = [
    administrator.userId,
    administrator.revision,
    administrator.displayName,
    administrator.email.trim().toLowerCase(),
    timestamp(administrator.createdAt, 'invalid-created-time').canonical,
    timestamp(administrator.updatedAt, 'invalid-updated-time').canonical
  ];
  return createHash('sha256').update(JSON.stringify(exact)).digest('hex');
}

function validate(input: { administrators: readonly ManagedAdministrator[]; removedUserIds?: readonly string[] }): {
  present: Set<string>;
  removed: Set<string>;
} {
  const present = new Set<string>();
  const emails = new Set<string>();
  for (const administrator of input.administrators) {
    if (!UUID.test(administrator.userId)) throw new AdministratorProjectionError('invalid-canonical-id');
    if (!Number.isSafeInteger(administrator.revision) || administrator.revision < 0) {
      throw new AdministratorProjectionError('invalid-canonical-revision');
    }
    const email = administrator.email.trim().toLowerCase();
    if (!email || !email.includes('@')) throw new AdministratorProjectionError('invalid-canonical-email');
    if (present.has(administrator.userId)) throw new AdministratorProjectionError('duplicate-canonical-user-id');
    if (emails.has(email)) throw new AdministratorProjectionError('duplicate-canonical-email');
    present.add(administrator.userId);
    emails.add(email);
    administratorAuthorityContentHash(administrator);
  }
  const removed = new Set(input.removedUserIds ?? []);
  for (const id of removed) {
    if (!UUID.test(id)) throw new AdministratorProjectionError('invalid-removed-user-id');
    if (present.has(id)) throw new AdministratorProjectionError('administrator-both-present-and-removed');
  }
  return { present, removed };
}

function projectedFields(administrator: ManagedAdministrator, now: Date) {
  return {
    name: administrator.displayName,
    email: administrator.email.trim().toLowerCase(),
    authorityUserId: administrator.userId,
    authorityRevision: administrator.revision,
    authorityContentHash: administratorAuthorityContentHash(administrator),
    authorityReconciledAt: now
  };
}

/**
 * Converges canonical administrator rows into the controller compatibility projection.
 *
 * A complete read refuses an unmapped legacy row. Removed canonical administrators lose every
 * local controller session in the same source transaction as projection removal; the canonical
 * API independently revokes refresh tokens in its target transaction.
 */
export async function projectAuthorityAdministrators(input: {
  accountId: number;
  administrators: readonly ManagedAdministrator[];
  removedUserIds?: readonly string[];
  complete?: boolean;
  now?: Date;
}): Promise<Map<string, number>> {
  const { present, removed } = validate(input);
  const now = input.now ?? new Date();

  return getDb().transaction(async (tx) => {
    const mapped = new Map<string, number>();
    for (const canonical of input.administrators) {
      const email = canonical.email.trim().toLowerCase();
      const candidates = await tx
        .select()
        .from(adminUsers)
        .where(
          or(
            eq(adminUsers.authorityUserId, canonical.userId),
            and(eq(adminUsers.accountId, input.accountId), sql`lower(${adminUsers.email}) = ${email}`)
          )
        );
      if (candidates.length > 1) throw new AdministratorProjectionError('administrator-collision');
      const existing = candidates[0];
      if (existing) {
        if (existing.accountId !== input.accountId)
          throw new AdministratorProjectionError('administrator-account-mismatch');
        if (existing.authorityUserId && existing.authorityUserId !== canonical.userId) {
          throw new AdministratorProjectionError('administrator-mapping-mismatch');
        }
        if (existing.authorityRevision !== null) {
          if (existing.authorityRevision > canonical.revision) {
            throw new AdministratorProjectionError('stale-canonical-revision');
          }
          if (
            existing.authorityRevision === canonical.revision &&
            existing.authorityContentHash !== administratorAuthorityContentHash(canonical)
          ) {
            throw new AdministratorProjectionError('canonical-revision-content-mismatch');
          }
        }
        const [updated] = await tx
          .update(adminUsers)
          .set(projectedFields(canonical, now))
          .where(and(eq(adminUsers.id, existing.id), eq(adminUsers.accountId, input.accountId)))
          .returning({ id: adminUsers.id });
        if (!updated) throw new AdministratorProjectionError('administrator-update-race');
        mapped.set(canonical.userId, updated.id);
      } else {
        const [inserted] = await tx
          .insert(adminUsers)
          .values({
            accountId: input.accountId,
            passwordHash: null,
            ...projectedFields(canonical, now),
            createdAt: timestamp(canonical.createdAt, 'invalid-created-time').date
          })
          .returning({ id: adminUsers.id });
        if (!inserted) throw new AdministratorProjectionError('administrator-projection-race');
        mapped.set(canonical.userId, inserted.id);
      }
    }

    const removeIds = new Set(removed);
    if (input.complete) {
      const completeRows = await tx.select().from(adminUsers).where(eq(adminUsers.accountId, input.accountId));
      for (const local of completeRows) {
        if (!local.authorityUserId || local.authorityRevision === null || !local.authorityContentHash) {
          throw new AdministratorProjectionError('unreconciled-legacy-administrator');
        }
        if (!present.has(local.authorityUserId)) removeIds.add(local.authorityUserId);
      }
    }

    if (removeIds.size > 0) {
      const authorityIds = [...removeIds];
      const localIdentities = await tx
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.accountId, input.accountId), inArray(users.authorityUserId, authorityIds)));
      if (localIdentities.length > 0) {
        await tx.delete(loginSessions).where(
          inArray(
            loginSessions.userId,
            localIdentities.map((identity) => identity.id)
          )
        );
      }
      await tx
        .delete(adminUsers)
        .where(and(eq(adminUsers.accountId, input.accountId), inArray(adminUsers.authorityUserId, authorityIds)));
    }
    return mapped;
  });
}
