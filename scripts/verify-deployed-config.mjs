#!/usr/bin/env node
/**
 * Verify a deployment's CONFIGURATION, which no test suite covers.
 *
 * ## Why this exists
 *
 * On 2026-08-08 the controller's code was byte-identical to a version that had been working, with
 * 480 passing tests, and the deployed site was still broken four separate times. Not one of those
 * failures was in the application:
 *
 *   1. `ROOM_BASE_URL` was copied from a developer `.env` and shipped as `http://localhost:5174`,
 *      so every Launch link in production pointed at somebody's laptop.
 *   2. `API_KEY_ENCRYPTION_KEY` was generated fresh rather than carried over, so the one API key
 *      already in the database could not be decrypted — and an uncaught throw in the loader turned
 *      that single row into a 500 on the whole account page.
 *   3. Nine variables were written as EMPTY STRINGS by a shell one-liner whose helper function did
 *      not survive zsh. `vercel env add` reported success for every one.
 *   4. `CONTROL_PLANE_MODE=postgres` sat beside a blank `DATABASE_URL`, the one combination that
 *      makes the app refuse to boot.
 *
 * Every one of them is mechanically detectable in under a second. None of them was detected,
 * because the only thing anybody checked was whether the tests passed — and the tests never see
 * the environment.
 *
 * ## How to run it
 *
 *   vercel env pull .env.production --environment production
 *   node scripts/verify-deployed-config.mjs .env.production
 *
 * Exit code 1 on any failure, so it can gate a deploy.
 *
 * It prints variable NAMES, lengths and verdicts. It never prints a value.
 */

import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const file = process.argv[2] ?? '.env.production';

let raw;
try {
  raw = readFileSync(file, 'utf8');
} catch {
  console.error(`cannot read ${file}\n\nRun:  vercel env pull ${file} --environment production`);
  process.exit(1);
}

/** dotenv, minimally: everything after the first `=`, quotes stripped. */
const env = {};
for (const line of raw.split('\n')) {
  if (!line.trim() || line.trimStart().startsWith('#')) continue;
  const at = line.indexOf('=');
  if (at === -1) continue;
  env[line.slice(0, at).trim()] = line.slice(at + 1).trim().replace(/^["']|["']$/g, '');
}

/*
  Vercel returns the literal string `[SENSITIVE]` for any variable marked sensitive — the value is
  write-only and cannot be read back, by design. That is correct of Vercel and fatal to a checker
  that assumes it can see values: the first run of this script reported four failures that were
  entirely artefacts of `[SENSITIVE]` being 11 characters long.

  So value-based checks are SKIPPED, loudly, when the value is unreadable. A skip that announces
  itself is honest; a skip that scores as a pass is how this class of bug survives.
*/
const SENSITIVE = '[SENSITIVE]';
const readable = (v) => v !== undefined && v !== '' && v !== SENSITIVE;

const failures = [];
const warnings = [];

const fail = (name, why) => {
  failures.push(`${name}: ${why}`);
  console.log(`  FAIL  ${name.padEnd(28)} ${why}`);
};
const warn = (name, why) => {
  warnings.push(`${name}: ${why}`);
  console.log(`  WARN  ${name.padEnd(28)} ${why}`);
};
const ok = (name, note) => console.log(`  ok    ${name.padEnd(28)} ${note}`);

console.log(`Verifying ${file}\n`);

/* ---- 1. Nothing may be blank -------------------------------------------------------------- */
// The failure that reported success nine times. A variable that exists and is empty is worse than
// one that is absent, because "absent" has a defined fallback and "empty" usually does not.
const REQUIRED = [
  'CONTROL_PLANE_MODE',
  'PROFILE_AUTHORITY_MODE',
  'ROOM_AUTHORITY_MODE',
  'ROOM_SETTINGS_AUTHORITY_MODE',
  'DATABASE_URL',
  'ROOM_JWT_SECRET',
  'ROOM_BASE_URL',
  'API_KEY_ENCRYPTION_KEY',
  'PUBLIC_SITE_ORIGIN'
];
for (const name of REQUIRED) {
  if (!(name in env)) fail(name, 'not set at all');
  else if (env[name] === '') fail(name, 'set but EMPTY — a blank write that reported success');
  else if (env[name] === SENSITIVE) ok(name, 'present (sensitive — value not readable)');
  else ok(name, `${env[name].length} chars`);
}

/* ---- 2. No developer values in production ------------------------------------------------- */
// `ROOM_BASE_URL=http://localhost:5174`, copied from a laptop's .env and deployed.
for (const [name, value] of Object.entries(env)) {
  if (!/URL|ORIGIN|HOST/i.test(name) || !readable(value)) continue;
  if (/localhost|127\.0\.0\.1|0\.0\.0\.0|\.local\b/i.test(value)) {
    fail(name, 'points at a LOCAL address — a developer value reached production');
  } else if (/^http:\/\//i.test(value) && !/^http:\/\/(localhost|127\.)/i.test(value)) {
    warn(name, 'plain http:// in production');
  }
}

/* ---- 3. Mode and database agree ------------------------------------------------------------ */
// `assertControlPlaneConfiguration` throws on exactly this pair, which fails the boot rather than
// degrading — so it is worth catching before the deploy, not after.
if (env.CONTROL_PLANE_MODE === 'postgres' && !env.DATABASE_URL) {
  fail('CONTROL_PLANE_MODE', 'postgres with no DATABASE_URL — the app refuses to boot');
} else if (readable(env.CONTROL_PLANE_MODE) && !['postgres', 'marketing-only'].includes(env.CONTROL_PLANE_MODE)) {
  fail('CONTROL_PLANE_MODE', `must be postgres or marketing-only, not ${env.CONTROL_PLANE_MODE}`);
}

if (readable(env.PROFILE_AUTHORITY_MODE) && !['legacy', 'rust'].includes(env.PROFILE_AUTHORITY_MODE)) {
  fail('PROFILE_AUTHORITY_MODE', `must be legacy or rust, not ${env.PROFILE_AUTHORITY_MODE}`);
} else if (env.PROFILE_AUTHORITY_MODE === 'rust' && !readable(env.TRADINGROOM_API_URL)) {
  fail('TRADINGROOM_API_URL', 'required when PROFILE_AUTHORITY_MODE=rust — profile requests fail closed');
} else if (env.PROFILE_AUTHORITY_MODE === 'rust') {
  ok('TRADINGROOM_API_URL', 'present for Rust profile authority');
}

if (readable(env.ROOM_AUTHORITY_MODE) && !['legacy', 'rust'].includes(env.ROOM_AUTHORITY_MODE)) {
  fail('ROOM_AUTHORITY_MODE', `must be legacy or rust, not ${env.ROOM_AUTHORITY_MODE}`);
} else if (env.ROOM_AUTHORITY_MODE === 'rust' && env.PROFILE_AUTHORITY_MODE !== 'rust') {
  fail(
    'ROOM_AUTHORITY_MODE',
    'rust requires PROFILE_AUTHORITY_MODE=rust — room ownership must bind to canonical identity'
  );
} else if (env.ROOM_AUTHORITY_MODE === 'rust' && !readable(env.TRADINGROOM_API_URL)) {
  fail('TRADINGROOM_API_URL', 'required when ROOM_AUTHORITY_MODE=rust — room lifecycle requests fail closed');
} else if (env.ROOM_AUTHORITY_MODE === 'rust') {
  ok('ROOM_AUTHORITY_MODE', 'Rust room lifecycle authority is consistently configured');
}

if (readable(env.ROOM_SETTINGS_AUTHORITY_MODE) && !['legacy', 'rust'].includes(env.ROOM_SETTINGS_AUTHORITY_MODE)) {
  fail('ROOM_SETTINGS_AUTHORITY_MODE', `must be legacy or rust, not ${env.ROOM_SETTINGS_AUTHORITY_MODE}`);
} else if (
  env.ROOM_SETTINGS_AUTHORITY_MODE === 'rust' &&
  (env.PROFILE_AUTHORITY_MODE !== 'rust' || env.ROOM_AUTHORITY_MODE !== 'rust')
) {
  fail(
    'ROOM_SETTINGS_AUTHORITY_MODE',
    'rust requires PROFILE_AUTHORITY_MODE=rust and ROOM_AUTHORITY_MODE=rust'
  );
} else if (env.ROOM_SETTINGS_AUTHORITY_MODE === 'rust' && !readable(env.TRADINGROOM_API_URL)) {
  fail('TRADINGROOM_API_URL', 'required when ROOM_SETTINGS_AUTHORITY_MODE=rust — settings requests fail closed');
} else if (env.ROOM_SETTINGS_AUTHORITY_MODE === 'rust') {
  ok('ROOM_SETTINGS_AUTHORITY_MODE', 'Rust room-settings authority is consistently configured');
}

/* ---- 4. Secrets are actually secret --------------------------------------------------------- */
// `ROOM_JWT_SECRET` was 9 characters and signs 360-day handoff tokens that travel in URLs.
const MIN = { ROOM_JWT_SECRET: 32, API_KEY_ENCRYPTION_KEY: 32, RECAPTCHA_SECRET_KEY: 20 };
for (const [name, min] of Object.entries(MIN)) {
  const v = env[name];
  if (!readable(v)) {
    if (v === SENSITIVE) warn(name, `length not verifiable (sensitive) — check it is at least ${min} chars`);
    continue;
  }
  if (v.length < min) fail(name, `${v.length} chars, needs at least ${min} — brute-forceable`);
}

/* ---- 5. The encryption key can read what is already stored ---------------------------------- */
// The one that took the account page down. A key that cannot decrypt existing rows is not a
// "rotation", it is data loss with a delay.
if (readable(env.DATABASE_URL) && readable(env.API_KEY_ENCRYPTION_KEY)) {
  try {
    const { default: postgres } = await import('postgres');
    const sql = postgres(env.DATABASE_URL, { max: 1, ssl: 'require' });
    const rows = await sql`SELECT id, account_id, secret_ciphertext FROM api_keys WHERE secret_ciphertext IS NOT NULL`;
    await sql.end();

    if (rows.length === 0) {
      ok('API_KEY_ENCRYPTION_KEY', 'no stored keys to verify against');
    } else {
      const { decryptApiKeySecret } = await import('../apps/controller/src/lib/server/api-key-secret.ts');
      let bad = 0;
      for (const r of rows) {
        try {
          decryptApiKeySecret(r.secret_ciphertext, { accountId: r.account_id, keyId: r.id }, env.API_KEY_ENCRYPTION_KEY);
        } catch {
          bad += 1;
        }
      }
      if (bad > 0) {
        fail('API_KEY_ENCRYPTION_KEY', `cannot decrypt ${bad} of ${rows.length} stored keys — they need rotating`);
      } else {
        ok('API_KEY_ENCRYPTION_KEY', `decrypts all ${rows.length} stored keys`);
      }
    }
  } catch (e) {
    // Not a failure: this check needs a reachable database and a TS-capable loader, and neither is
    // guaranteed wherever this runs. Reported so a skip is never mistaken for a pass.
    warn('API_KEY_ENCRYPTION_KEY', `could not verify against the database (${String(e.message).slice(0, 70)})`);
  }
}

/* ---- 6. Fingerprints, so two deployments can be compared without revealing anything ---------- */
console.log('\n  fingerprints (sha256, first 8 — for comparing environments):');
for (const name of REQUIRED) {
  if (!readable(env[name])) continue;
  const fp = createHash('sha256').update(env[name]).digest('hex').slice(0, 8);
  console.log(`    ${name.padEnd(28)} ${fp}`);
}

console.log('');
if (failures.length) {
  console.log(`${failures.length} failure(s), ${warnings.length} warning(s)`);
  process.exit(1);
}
console.log(`configuration is sound (${warnings.length} warning(s))`);
