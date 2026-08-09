#!/usr/bin/env node
/**
 * Seed a first account so the controller has something to control.
 *
 * HONEST DATA: the only room seeded is the one that exists in the reference
 * capture ("Room 3625"), with the 21 settings that were actually set there. No
 * members are invented — the captured tenant's member rows contain real people's
 * names and emails, and fabricating stand-ins would make the Users tab look
 * populated when it is not. It renders its empty state until real members exist.
 */
import { randomBytes, scryptSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { runMigrations } from '../src/lib/server/db/migrator.js';

const email = process.env.SEED_EMAIL?.trim().toLowerCase();
const password = process.env.SEED_PASSWORD ?? '';
if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  throw new Error('SEED_EMAIL must be an explicit valid email address.');
}
if (password.length < 12) {
  throw new Error('SEED_PASSWORD must be explicit and at least 12 characters.');
}

const connectionString = process.env.DATABASE_URL?.trim();
if (!connectionString) {
  throw new Error('DATABASE_URL is required; this script seeds PostgreSQL.');
}

const sql = postgres(connectionString, { max: 1, prepare: false, onnotice: () => {} });
try {
  /*
    The same migrations the app boots with, through the same function — not a second copy of the
    schema. A seed script that stands the database up differently from production is a seed script
    that hides production bugs.

    No advisory lock here: this is a developer running one script against their own database, not
    several serverless instances cold-starting at once.
  */
  // One transaction, because `runMigrations` expects the caller to provide atomicity — the same
  // contract `ensureDatabase` honours. No advisory lock: this is one developer, one script.
  const { applied } = await sql.begin((tx) => runMigrations(tx));
  console.log(`migrations applied: ${applied.length === 0 ? 'none pending' : applied.join(', ')}`);
  await seed(sql);
} finally {
  await sql.end();
}

async function seed(sql) {
  const salt = randomBytes(16).toString('hex');
  const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
  // A real Date, not Date.now(). `created_at` is timestamptz; an epoch integer
  // would either be rejected or land in the wrong century.
  const now = new Date();

  /**
   * Captured values, straight from the generated schema.
   *
   * `capturedIsDisplayOnly` fields are SKIPPED. For a select the captured text is
   * an option's label, and for a combodate it is a formatted date — neither is the
   * value the app stores. Seeding them anyway wrote
   * "Open - Anyone with the room link can join with their email & name" into
   * authMode, which no gate in the app matches.
   */
  const schema = readFileSync(resolve('src/lib/room-settings-schema.ts'), 'utf8');
  const settings = {};
  for (const m of schema.matchAll(
    /\{ name: "([^"]+)",[^}]*?captured: (true|false|null|"(?:[^"\\]|\\.)*"|[\d.]+), capturedIsDisplayOnly: (true|false)/g
  )) {
    const [, name, raw, displayOnly] = m;
    if (displayOnly === 'true') continue;
    if (raw === 'null' || raw === 'false') continue;
    settings[name] = raw === 'true' ? true : raw.startsWith('"') ? JSON.parse(raw) : Number(raw);
  }

  await sql.begin(async (tx) => {
    const [existing] = await tx`SELECT id FROM accounts WHERE owner_email = ${email}`;
    if (existing) {
      console.log(`seed account already exists (id ${existing.id}) — nothing to do`);
      return;
    }

    const [account] = await tx`
      INSERT INTO accounts (name, owner_email, created_at)
      VALUES ('My Trading Room', ${email}, ${now}) RETURNING id`;
    const accountId = account.id;

    const [user] = await tx`
      INSERT INTO users (account_id, email, display_name, password_hash, created_at)
      VALUES (${accountId}, ${email}, 'Owner', ${passwordHash}, ${now}) RETURNING id`;

    // 3625 is the captured room's code; if this database already has it, allocate a
    // free one so seeding a second account does not collide.
    let shortCode = '3625';
    while ((await tx`SELECT 1 FROM rooms WHERE short_code = ${shortCode}`).length > 0) {
      shortCode = String(1000 + Math.floor(Math.random() * 9000));
    }
    const roomName = shortCode === '3625' ? (settings.name ?? 'Room 3625') : `Room ${shortCode}`;

    const [room] = await tx`
      INSERT INTO rooms (account_id, short_code, name, state, max_users, created_at)
      VALUES (${accountId}, ${shortCode}, ${roomName}, 'open', 2, ${now}) RETURNING id`;
    const roomId = room.id;

    await tx`
      INSERT INTO room_settings (room_id, settings_json, updated_at)
      VALUES (${roomId}, ${JSON.stringify(settings)}, ${now})`;

    // the owner is a member of their own room, role 0
    await tx`
      INSERT INTO room_users (room_id, user_id, role, created_at)
      VALUES (${roomId}, ${user.id}, 0, ${now})`;

    console.log(`seeded account ${accountId}, room ${roomId} "${roomName}" (code ${shortCode})`);
    console.log(`${Object.keys(settings).length} settings carried over from the capture`);
  });
}
