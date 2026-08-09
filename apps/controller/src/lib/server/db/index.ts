import { DATABASE_URL } from '$app/env/private';
import { randomBytes } from 'node:crypto';
import { and, eq, isNull, notExists, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { accounts, roomUsers, rooms, users } from './schema';
import { runMigrations } from './migrator.js';

type PostgresClient = ReturnType<typeof postgres>;

function createDrizzle(client: PostgresClient) {
  return drizzle(client, { schema });
}

type AppDatabase = ReturnType<typeof createDrizzle>;

let postgresClient: PostgresClient | undefined;
let drizzleConnection: AppDatabase | undefined;

/**
 * Importing this module must not open a connection. SvelteKit can evaluate a
 * matched route module before the request hook rejects it, so module-evaluation
 * I/O would dial the database on a marketing-only deployment that is meant to
 * serve four static routes and nothing else.
 *
 * `postgres()` is itself lazy — it does not connect until the first query — but the
 * URL check belongs here rather than at import time for the same reason.
 */
function connect(): { client: PostgresClient; database: AppDatabase } {
  if (postgresClient && drizzleConnection) {
    return { client: postgresClient, database: drizzleConnection };
  }

  const configuredUrl = DATABASE_URL?.trim();
  if (!configuredUrl) {
    throw new Error('DATABASE_URL is required before connecting to PostgreSQL.');
  }

  const client = postgres(configuredUrl, {
    /**
     * One connection per serverless instance. Vercel runs many short-lived instances
     * and each would otherwise open its own pool, so the pool that matters is the
     * managed pooler in front of the database, not one held in this process.
     */
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    /**
     * Required when the connection string points at a transaction-mode pooler
     * (PgBouncer, which is what Neon's `-pooler` endpoint runs): a prepared statement
     * belongs to a backend connection the pooler is free to hand to somebody else
     * between statements. Off locally too, so dev and production take one code path.
     */
    prepare: false,
    /**
     * The idempotent bootstrap emits one "already exists, skipping" NOTICE per
     * CREATE/ALTER on every boot — roughly thirty lines saying the thing worked.
     * Those specific codes are dropped; every other notice is still printed, because
     * silencing the whole channel would also hide the ones worth reading.
     */
    onnotice: (notice) => {
      const alreadyExists = notice.code === '42P07' || notice.code === '42701' || notice.code === '42P16';
      if (!alreadyExists) console.warn('[db]', notice.severity, notice.code, notice.message);
    }
  });

  postgresClient = client;
  drizzleConnection = createDrizzle(client);
  return { client, database: drizzleConnection };
}

export function getDb(): AppDatabase {
  return connect().database;
}

/**
 * A fixed, arbitrary key identifying this application's bootstrap lock. Any constant
 * works as long as nothing else in the database picks the same one.
 */
const BOOTSTRAP_LOCK_KEY = 0x7074_7263; // "ptrc"

/**
 * Forward-only, idempotent bootstrap. Existing databases may receive missing
 * columns and public IDs, but the operation never resets or deletes data.
 *
 * ## Why the advisory lock
 *
 * On a long-running server this ran once at startup. On a serverless host it runs once
 * per COLD START, and several instances can cold-start at the same moment — a traffic
 * spike, or a fresh deployment taking its first requests.
 *
 * `CREATE TABLE IF NOT EXISTS` is not safe to run concurrently in PostgreSQL. The
 * existence check and the creation are not atomic against another transaction doing
 * the same thing, so two instances racing raise
 * `duplicate key value violates unique constraint "pg_type_typname_nsp_index"` rather
 * than one of them quietly doing nothing. The same applies to ADD COLUMN IF NOT EXISTS
 * and to the two backfills, which read then write.
 *
 * An advisory lock serialises the DDL across every instance and every process. The
 * second arrival blocks briefly, then finds the work already done and its own
 * statements become genuine no-ops.
 *
 * It must be the TRANSACTION-scoped `pg_advisory_xact_lock`, not the session-scoped
 * `pg_advisory_lock`. The connection string points at a transaction-mode pooler, which
 * is free to hand a backend to somebody else between statements — a session lock taken
 * in one statement and released in another can end up unlocking a different backend,
 * leaking the lock permanently and wedging every later boot. The transaction-scoped
 * form is released by the commit itself, so the pooler cannot separate them.
 *
 * The two backfills sit outside the lock and are made concurrency-safe on their own
 * terms instead, so a slow backfill cannot hold the DDL lock against other instances.
 */
export async function ensureDatabase() {
  const { client, database } = connect();

  /*
    The advisory lock now covers MIGRATIONS rather than one idempotent DDL string.

    Its reasoning is unchanged and still load-bearing — several serverless instances cold-start at
    the same moment, and `CREATE TABLE IF NOT EXISTS` is not safe to run concurrently — but the
    stakes are higher: two instances applying migration 3 at once would each try to insert the same
    `applied_migrations` row, and the loser would roll back a migration the winner had already
    committed. Serialising them means the second arrival reads the row and skips.

    `runMigrations` takes the lock as a precondition rather than acquiring it, because the lock has
    to cover the migration table's own creation too.
  */
  await client.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(${BOOTSTRAP_LOCK_KEY})`;
    const { applied } = await runMigrations(tx);
    if (applied.length > 0) console.info('[db] applied migrations', applied);
  });

  await backfillPublicIds(database);
  await backfillOwnerMemberships(database);
}

/**
 * Every room's owner is a member of it, at role 0.
 *
 * `createRoom` seats them now, but rooms made before it did have no such row — and three separate
 * pieces of this repository already presume one exists: `roleLabel` maps role 0 to "Owner",
 * `applyManyOpcode` skips role 0 so bulk actions cannot touch the owner, and
 * `shouldRemoveAsNonPresenter` is documented as preserving "only the owner and a true presenter".
 *
 * It matters beyond tidiness. The room asks `internal/room-config` who somebody is and takes the
 * answer as authoritative, so an owner with no membership reads as `member: null` and is not a
 * presenter in the room they own.
 *
 * Forward-only and idempotent, like everything else here: it adds only what is missing, and never
 * changes a membership that already exists — a room whose owner was deliberately given some other
 * role keeps it.
 *
 * Written through Drizzle rather than raw SQL. The SQLite version issued its own INSERT with
 * `Date.now()`, which is milliseconds, into a column every other writer filled through Drizzle's
 * `mode: 'timestamp'`, which is seconds — so a backfilled owner's join date read back roughly
 * fifty thousand years in the future. Going through the same encoder as every other writer is what
 * makes that unrepeatable, not the column type alone.
 */
async function backfillOwnerMemberships(database: AppDatabase) {
  const missing = await database
    .select({ roomId: rooms.id, userId: users.id })
    .from(rooms)
    .innerJoin(accounts, eq(accounts.id, rooms.accountId))
    .innerJoin(users, eq(users.email, accounts.ownerEmail))
    .where(
      notExists(
        database
          .select({ present: sql`1` })
          .from(roomUsers)
          .where(and(eq(roomUsers.roomId, rooms.id), eq(roomUsers.userId, users.id)))
      )
    );
  if (missing.length === 0) return;

  /*
    `onConflictDoNothing` rather than a bare insert. Two instances cold-starting together
    both SELECT the same missing owners before either INSERTs, and the second would hit
    `room_users_unique_idx` and throw — turning a cosmetic backfill into a failed boot.
    Losing the race is the correct outcome here: the row exists, which is all that was
    wanted.
  */
  await database
    .insert(roomUsers)
    .values(missing.map(({ roomId, userId }) => ({ roomId, userId, role: 0, createdAt: new Date() })))
    .onConflictDoNothing();
  console.log(`[db] seated ${missing.length} room owner(s) that predated createRoom's membership row`);
}

/**
 * Every room needs the opaque public id its links are built from. Rooms created
 * before the column existed get one now — 24 hex characters, the shape the
 * reference uses — rather than rendering a broken link.
 */
async function backfillPublicIds(database: AppDatabase) {
  const missing = await database.select({ id: rooms.id }).from(rooms).where(isNull(rooms.publicId));
  for (const room of missing) {
    /*
      The `IS NULL` is repeated in the UPDATE, not just the SELECT that found the row.
      Two instances racing would otherwise both generate an id for the same room and the
      slower one would overwrite the id the faster one had already published in a link.
      Re-checking in the write means the loser changes nothing.
    */
    await database
      .update(rooms)
      .set({ publicId: randomBytes(12).toString('hex') })
      .where(and(eq(rooms.id, room.id), isNull(rooms.publicId)));
  }
}
