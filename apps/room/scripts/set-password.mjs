// Creates or updates an account's password and role.
//
//   node scripts/set-password.mjs <email> <password> [role] [display name]
//
// Credentials are arguments rather than literals so none are committed to the repository.
// Roles: `admin` and `staff` are presenters (they may post alerts, run polls and edit notes);
// anything else - `member`, `guest` - is a reader.
import { randomBytes, createHash, scrypt } from 'node:crypto';
import { promisify } from 'node:util';
import Database from 'better-sqlite3';

const scryptAsync = promisify(scrypt);
const [, , emailArg, password, role = 'member', displayNameArg] = process.argv;

if (!emailArg || !password) {
  console.error('usage: node scripts/set-password.mjs <email> <password> [role] [display name]');
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const displayName = displayNameArg ?? email.split('@')[0];

// Must match src/lib/server/password.ts.
const salt = randomBytes(16);
const key = await scryptAsync(password, salt, 64);
const passwordHash = `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;

const gravatar = `https://secure.gravatar.com/avatar/${createHash('md5').update(email).digest('hex')}?d=mm&s=50`;

const db = new Database('.data/proroom.sqlite');
const existing = db.prepare('SELECT id, role FROM users WHERE email = ?').get(email);

if (existing) {
  db.prepare('UPDATE users SET password_hash = ?, role = ? WHERE id = ?').run(
    passwordHash,
    role,
    existing.id
  );
  console.log(`updated  #${existing.id}  ${email}  role ${existing.role} -> ${role}`);
} else {
  const info = db
    .prepare(
      `INSERT INTO users (display_name, email, avatar_url, role, status, password_hash, created_at)
       VALUES (?, ?, ?, ?, 'offline', ?, ?)`
    )
    .run(displayName, email, gravatar, role, passwordHash, Math.floor(Date.now() / 1000));
  console.log(`created  #${info.lastInsertRowid}  ${email}  role ${role}`);
}

db.close();
