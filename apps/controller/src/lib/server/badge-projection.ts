import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { ManagedBadge } from './tradingroom-api.generated.js';
import { getDb } from './db/index.js';
import { badges } from './db/schema.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class BadgeProjectionError extends Error {
  constructor(readonly code: string) {
    super(`Canonical badge projection refused: ${code}`);
    this.name = 'BadgeProjectionError';
  }
}

function timestamp(value: string, code: string): { date: Date; canonical: string } {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new BadgeProjectionError(code);
  return { date, canonical: date.toISOString() };
}

export function badgeAuthorityContentHash(badge: ManagedBadge): string {
  const exact = [
    badge.id,
    badge.revision,
    badge.label,
    badge.textColor,
    badge.backgroundColor,
    badge.emoji,
    badge.imageDataUrl,
    badge.darkThemeBadgeId,
    badge.autoAssignRoles,
    timestamp(badge.createdAt, 'invalid-created-time').canonical,
    timestamp(badge.updatedAt, 'invalid-updated-time').canonical
  ];
  return createHash('sha256').update(JSON.stringify(exact)).digest('hex');
}

function validate(input: { definitions: readonly ManagedBadge[]; removedBadgeIds?: readonly string[] }): {
  present: Set<string>;
  removed: Set<string>;
} {
  const present = new Set<string>();
  for (const badge of input.definitions) {
    if (!UUID.test(badge.id) || (badge.darkThemeBadgeId !== null && !UUID.test(badge.darkThemeBadgeId))) {
      throw new BadgeProjectionError('invalid-canonical-id');
    }
    if (!Number.isSafeInteger(badge.revision) || badge.revision < 0) {
      throw new BadgeProjectionError('invalid-canonical-revision');
    }
    if (present.has(badge.id)) throw new BadgeProjectionError('duplicate-canonical-badge-id');
    present.add(badge.id);
    badgeAuthorityContentHash(badge);
  }
  const removed = new Set(input.removedBadgeIds ?? []);
  for (const id of removed) {
    if (!UUID.test(id)) throw new BadgeProjectionError('invalid-removed-badge-id');
    if (present.has(id)) throw new BadgeProjectionError('badge-both-present-and-removed');
  }
  return { present, removed };
}

function projectedFields(badge: ManagedBadge, now: Date) {
  return {
    authorityBadgeId: badge.id,
    authorityRevision: badge.revision,
    authorityContentHash: badgeAuthorityContentHash(badge),
    authorityReconciledAt: now,
    label: badge.label,
    textColor: badge.textColor,
    backgroundColor: badge.backgroundColor,
    emoji: badge.emoji,
    imageUrl: badge.imageDataUrl,
    autoAssignRolesJson: JSON.stringify(badge.autoAssignRoles)
  };
}

/**
 * Converges UUID badge definitions into the integer-id compatibility projection.
 *
 * Upserts happen before dark-theme links so forward references work. Equal revisions must be
 * byte-equivalent under the full content hash, and a complete read refuses any unreconciled legacy
 * row instead of silently inventing identity.
 */
export async function projectAuthorityBadges(input: {
  accountId: number;
  definitions: readonly ManagedBadge[];
  removedBadgeIds?: readonly string[];
  complete?: boolean;
  now?: Date;
}): Promise<Map<string, number>> {
  const { present, removed } = validate(input);
  const now = input.now ?? new Date();

  return getDb().transaction(async (tx) => {
    const mapped = new Map<string, number>();
    for (const canonical of input.definitions) {
      const [existing] = await tx.select().from(badges).where(eq(badges.authorityBadgeId, canonical.id)).limit(1);
      if (existing) {
        if (existing.accountId !== input.accountId) throw new BadgeProjectionError('badge-account-mismatch');
        if (existing.authorityRevision !== null) {
          if (existing.authorityRevision > canonical.revision) {
            throw new BadgeProjectionError('stale-canonical-revision');
          }
          if (
            existing.authorityRevision === canonical.revision &&
            existing.authorityContentHash !== badgeAuthorityContentHash(canonical)
          ) {
            throw new BadgeProjectionError('canonical-revision-content-mismatch');
          }
        }
        const [updated] = await tx
          .update(badges)
          .set(projectedFields(canonical, now))
          .where(and(eq(badges.id, existing.id), eq(badges.accountId, input.accountId)))
          .returning({ id: badges.id });
        if (!updated) throw new BadgeProjectionError('badge-update-race');
        mapped.set(canonical.id, updated.id);
      } else {
        const [inserted] = await tx
          .insert(badges)
          .values({
            accountId: input.accountId,
            ...projectedFields(canonical, now),
            createdAt: timestamp(canonical.createdAt, 'invalid-created-time').date
          })
          .returning({ id: badges.id });
        if (!inserted) throw new BadgeProjectionError('badge-projection-race');
        mapped.set(canonical.id, inserted.id);
      }
    }

    // Resolve both newly inserted and previously mapped forward references after every row exists.
    const accountRows = await tx.select().from(badges).where(eq(badges.accountId, input.accountId));
    const localByAuthority = new Map(
      accountRows.filter((row) => row.authorityBadgeId).map((row) => [row.authorityBadgeId!, row.id])
    );
    for (const canonical of input.definitions) {
      const localId = localByAuthority.get(canonical.id);
      if (!localId) throw new BadgeProjectionError('badge-mapping-missing');
      const darkLocalId = canonical.darkThemeBadgeId ? localByAuthority.get(canonical.darkThemeBadgeId) : null;
      if (canonical.darkThemeBadgeId && !darkLocalId) {
        throw new BadgeProjectionError('dark-theme-badge-mapping-missing');
      }
      await tx
        .update(badges)
        .set({ darkThemeBadgeId: darkLocalId })
        .where(and(eq(badges.id, localId), eq(badges.accountId, input.accountId)));
    }

    for (const authorityBadgeId of removed) {
      await tx
        .delete(badges)
        .where(and(eq(badges.accountId, input.accountId), eq(badges.authorityBadgeId, authorityBadgeId)));
    }

    if (input.complete) {
      const completeRows = await tx.select().from(badges).where(eq(badges.accountId, input.accountId));
      for (const local of completeRows) {
        if (!local.authorityBadgeId || local.authorityRevision === null || !local.authorityContentHash) {
          throw new BadgeProjectionError('unreconciled-legacy-badge');
        }
        if (!present.has(local.authorityBadgeId)) {
          await tx.delete(badges).where(and(eq(badges.id, local.id), eq(badges.accountId, input.accountId)));
        }
      }
    }
    return mapped;
  });
}
