import { createHash } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import type { ManagedCustomerApiKey } from './tradingroom-api.generated.js';
import { getDb } from './db/index.js';
import { apiKeys } from './db/schema.js';

const KEY_ID = /^[0-9a-f]{24}$/u;
const HASH = /^[0-9a-f]{64}$/u;

export interface ProjectedCustomerApiKeyCredential {
  secretHash: string;
  secretCiphertext: string;
}

export class CustomerApiKeyProjectionError extends Error {
  constructor(readonly code: string) {
    super(`Canonical customer API-key projection refused: ${code}`);
    this.name = 'CustomerApiKeyProjectionError';
  }
}

function timestamp(value: string, code: string): { date: Date; canonical: string } {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new CustomerApiKeyProjectionError(code);
  return { date, canonical: date.toISOString() };
}

function normalizedRestrictions(key: ManagedCustomerApiKey) {
  const unique = (values: readonly string[]) => [...new Set(values)].sort();
  return {
    ips: unique(key.restrictions.ips),
    scopes: unique(key.restrictions.scopes),
    sessions: unique(key.restrictions.sessions)
  };
}

export function customerApiKeyAuthorityContentHash(key: ManagedCustomerApiKey): string {
  // lastUsedAt and updatedAt are observations, not configuration. External API traffic may advance
  // both without changing the optimistic configuration revision; including either here would make
  // an equal-revision reconciliation reject legitimate use as a split-brain disagreement.
  const exact = [
    key.id,
    key.revision,
    key.lastFour,
    normalizedRestrictions(key),
    timestamp(key.createdAt, 'invalid-created-time').canonical
  ];
  timestamp(key.updatedAt, 'invalid-updated-time');
  if (key.lastUsedAt !== null) timestamp(key.lastUsedAt, 'invalid-last-used-time');
  return createHash('sha256').update(JSON.stringify(exact)).digest('hex');
}

function validate(input: {
  keys: readonly ManagedCustomerApiKey[];
  removedKeyIds?: readonly string[];
  credentials?: ReadonlyMap<string, ProjectedCustomerApiKeyCredential>;
}): { present: Set<string>; removed: Set<string> } {
  const present = new Set<string>();
  for (const key of input.keys) {
    if (!KEY_ID.test(key.id)) throw new CustomerApiKeyProjectionError('invalid-canonical-id');
    if (!Number.isSafeInteger(key.revision) || key.revision < 0) {
      throw new CustomerApiKeyProjectionError('invalid-canonical-revision');
    }
    if (!/^[0-9a-f]{4}$/u.test(key.lastFour)) throw new CustomerApiKeyProjectionError('invalid-last-four');
    if (present.has(key.id)) throw new CustomerApiKeyProjectionError('duplicate-canonical-id');
    present.add(key.id);
    customerApiKeyAuthorityContentHash(key);
  }
  const removed = new Set(input.removedKeyIds ?? []);
  for (const id of removed) {
    if (!KEY_ID.test(id)) throw new CustomerApiKeyProjectionError('invalid-removed-id');
    if (present.has(id)) throw new CustomerApiKeyProjectionError('key-both-present-and-removed');
  }
  for (const [id, credential] of input.credentials ?? []) {
    if (!KEY_ID.test(id) || !HASH.test(credential.secretHash) || !credential.secretCiphertext) {
      throw new CustomerApiKeyProjectionError('invalid-credential-projection');
    }
    if (!present.has(id)) throw new CustomerApiKeyProjectionError('credential-without-canonical-key');
  }
  return { present, removed };
}

function projectedFields(key: ManagedCustomerApiKey, now: Date) {
  return {
    lastFour: key.lastFour,
    restrictionsJson: JSON.stringify(normalizedRestrictions(key)),
    createdAt: timestamp(key.createdAt, 'invalid-created-time').date,
    lastUsedAt: key.lastUsedAt === null ? null : timestamp(key.lastUsedAt, 'invalid-last-used-time').date,
    authorityRevision: key.revision,
    authorityContentHash: customerApiKeyAuthorityContentHash(key),
    authorityReconciledAt: now
  };
}

/**
 * Converges canonical verifier metadata into the controller's temporary encrypted-secret view.
 * New keys and rotations require the credential derived for that exact mutation; a canonical
 * revision is never projected with an old locally recoverable secret.
 */
export async function projectAuthorityCustomerApiKeys(input: {
  accountId: number;
  keys: readonly ManagedCustomerApiKey[];
  removedKeyIds?: readonly string[];
  credentials?: ReadonlyMap<string, ProjectedCustomerApiKeyCredential>;
  complete?: boolean;
  now?: Date;
}): Promise<void> {
  const { present, removed } = validate(input);
  const now = input.now ?? new Date();

  await getDb().transaction(async (tx) => {
    for (const canonical of input.keys) {
      const [existing] = await tx.select().from(apiKeys).where(eq(apiKeys.id, canonical.id)).limit(1);
      const credential = input.credentials?.get(canonical.id);
      if (existing) {
        if (existing.accountId !== input.accountId) throw new CustomerApiKeyProjectionError('key-account-mismatch');
        if (existing.authorityRevision !== null) {
          if (existing.authorityRevision > canonical.revision) {
            throw new CustomerApiKeyProjectionError('stale-canonical-revision');
          }
          if (
            existing.authorityRevision === canonical.revision &&
            existing.authorityContentHash !== customerApiKeyAuthorityContentHash(canonical)
          ) {
            throw new CustomerApiKeyProjectionError('canonical-revision-content-mismatch');
          }
        }
        if (existing.lastFour !== canonical.lastFour && !credential) {
          throw new CustomerApiKeyProjectionError('credential-projection-missing');
        }
        const [updated] = await tx
          .update(apiKeys)
          .set({
            ...projectedFields(canonical, now),
            ...(credential ?? {})
          })
          .where(and(eq(apiKeys.id, canonical.id), eq(apiKeys.accountId, input.accountId)))
          .returning({ id: apiKeys.id });
        if (!updated) throw new CustomerApiKeyProjectionError('key-update-race');
      } else {
        if (!credential) throw new CustomerApiKeyProjectionError('new-key-credential-missing');
        await tx.insert(apiKeys).values({
          id: canonical.id,
          accountId: input.accountId,
          ...credential,
          ...projectedFields(canonical, now)
        });
      }
    }

    const removeIds = new Set(removed);
    if (input.complete) {
      const completeRows = await tx.select().from(apiKeys).where(eq(apiKeys.accountId, input.accountId));
      for (const local of completeRows) {
        if (local.authorityRevision === null || !local.authorityContentHash || !local.authorityReconciledAt) {
          throw new CustomerApiKeyProjectionError('unreconciled-legacy-key');
        }
        if (!present.has(local.id)) removeIds.add(local.id);
      }
    }
    if (removeIds.size > 0) {
      await tx.delete(apiKeys).where(and(eq(apiKeys.accountId, input.accountId), inArray(apiKeys.id, [...removeIds])));
    }
  });
}
