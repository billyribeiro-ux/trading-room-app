import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The four read-then-write races closed on 2026-09-02, pinned by SHAPE rather than by hash.
 *
 * ## Why this exists beside the provenance seal, which already pins these files
 *
 * `verify-backend-provenance.mjs` pins each of these four by SHA-256, so any edit to them fails the
 * gate until somebody re-pins with a reason. That is the right instrument for "did this file
 * change", and it is the wrong one for "does this file still have the guard": re-pinning is a
 * two-line edit, and a re-pin made for an unrelated change would carry a removed `FOR SHARE` with it
 * without anybody noticing.
 *
 * So the hash answers *changed?* and this answers *still correct?* — and it names the defect each
 * guard prevents, at a place a reader lands on when the assertion goes red.
 *
 * ## Why a TypeScript test asserts Rust
 *
 * Because the Rust suite cannot run in this container and saying so is better than pretending
 * otherwise. `cargo test -p tradingroom-api` pulls `mediasoup-sys`, whose build script pip-installs
 * `invoke` and compiles a C++ worker; it fails here for want of the toolchain and the disk. What
 * DOES run — and was run for these four changes — is `cargo check -p tradingroom-api`,
 * `cargo clippy -p tradingroom-api --lib -- -D warnings` and `cargo fmt --all --check`. None of the
 * three can see a TOCTOU, which is exactly why the semantics were proved against a live PostgreSQL
 * 16 and why the shape is pinned here rather than trusted.
 *
 * ## The measurements, so a reader does not have to take the guards on faith
 *
 * Every number below was produced by running the statement — the SOURCE's own text and its own bind
 * order — against PostgreSQL 16.13, with a second connection racing it:
 *
 * * `poll::answer` — poll closed one second into the transaction: three statements recorded **1**
 *   response, the one-statement CTE recorded **0**. Happy path still 1; a re-vote still replaces
 *   rather than duplicating; an out-of-range choice, a foreign room and an unknown poll each insert
 *   nothing and leave an existing vote untouched.
 * * `alert::ask` — alert soft-deleted one second in: two statements wrote **1** question, the
 *   `INSERT … SELECT … FOR SHARE` wrote **0**. A live alert still takes one.
 * * `note::create` — four inserts released at one clock instant: `first@1, tab-1@2, tab-2@2,
 *   tab-3@2, tab-4@2`, two distinct positions for five rows. `FOR UPDATE` inside the same statement
 *   changed nothing (measured, same two). Locking the room row in its OWN statement first: seven
 *   simultaneous creates, seven distinct positions.
 * * `login` rehash — a password change committing one second in: unguarded left
 *   `OLD-strong-params`, guarded left the member's own `NEW-password-chosen-by-the-member`, and the
 *   upgrade still lands when nothing else touches the row.
 */

const services = (path: string) => readFileSync(new URL(`../../../../services/${path}`, import.meta.url), 'utf8');

const poll = services('api/src/db/repo/poll.rs');
const alert = services('api/src/db/repo/alert.rs');
const note = services('api/src/db/repo/note.rs');
const login = services('api/src/auth/login.rs');

/** Rust string continuations wrap the SQL across lines; the statements are matched flattened. */
const flat = (source: string) => source.replace(/\\\s*\n\s*/g, ' ').replace(/\s+/g, ' ');

describe('the files this is about are the ones being read', () => {
  it('found all four, and each is the module it claims to be', () => {
    /* The vacuity floor: a moved file would otherwise make every assertion below pass by absence. */
    expect(poll).toContain('pub async fn answer(');
    expect(alert).toContain('pub async fn ask(');
    expect(note).toContain('pub async fn create(');
    expect(login).toContain('password::needs_rehash(&existing)');
  });
});

describe('poll::answer is ONE statement, and it is the one that was proved', () => {
  it('validates, clears and inserts in a single CTE', () => {
    const sql = flat(poll);
    expect(sql).toContain('WITH valid AS ( SELECT 1 FROM polls');
    expect(sql).toContain("AND state = 'active'");
    expect(sql).toContain('$4 >= 0 AND $4 < jsonb_array_length(choices)');
    expect(sql).toContain('), cleared AS ( DELETE FROM poll_responses');
    expect(sql).toContain('EXISTS (SELECT 1 FROM valid)');
    expect(sql).toContain('SELECT $1, $2, $3, $4 FROM valid');
  });

  it('takes the row lock, which is what makes the WHERE hold rather than merely narrow', () => {
    expect(flat(poll)).toContain('AND $4 >= 0 AND $4 < jsonb_array_length(choices) FOR SHARE');
  });

  it('still answers NotFound on zero rows, which is what the old SELECT returned', () => {
    expect(poll).toContain('if recorded.rows_affected() == 0 {');
    expect(poll).toContain('return Err(DbError::NotFound);');
  });

  it('no longer validates in a statement of its own', () => {
    /* The absence that would mean the race is back, paired with the presence above so it cannot
       pass by matching nothing. */
    expect(flat(poll)).not.toContain('SELECT id FROM polls WHERE id = $1 AND room_id = $2');
  });
});

describe('alert::ask writes through the alert row rather than after checking it', () => {
  it('is an INSERT ... SELECT over `alerts`, locked', () => {
    const sql = flat(alert);
    expect(sql).toContain('SELECT $1,$2,$3,$4,$5,$6,$7,$8 FROM alerts');
    expect(sql).toContain('WHERE id = $2 AND room_id = $9 AND deleted_at IS NULL FOR SHARE');
  });

  it('keeps the refusal arriving as NotFound rather than sqlx RowNotFound', () => {
    /*
      `fetch_one` would raise sqlx's own error for zero rows and the caller would answer 500 for a
      question asked on a deleted alert — a worse outcome than the race, arrived at while fixing it.
    */
    expect(alert).toContain('.fetch_optional(tx.conn())');
    expect(alert).toContain('.ok_or(DbError::NotFound)?;');
  });

  it('no longer checks membership in a statement of its own', () => {
    expect(flat(alert)).not.toContain('SELECT id FROM alerts WHERE id = $1 AND room_id = $2 AND deleted_at IS NULL');
  });
});

describe('note::create takes the room lock in its OWN statement', () => {
  it('locks before the insert, which is the only ordering that was measured to work', () => {
    expect(note).toContain('sqlx::query("SELECT id FROM rooms WHERE id = $1 FOR UPDATE")');
    const lock = note.indexOf('FOR UPDATE');
    const insert = note.indexOf('INSERT INTO notes');
    expect(lock, 'the room lock is gone').toBeGreaterThan(-1);
    expect(insert, 'the insert is gone').toBeGreaterThan(lock);
  });

  it('does not fold the lock into the insert, which was measured NOT to work', () => {
    /*
      `WITH room AS (SELECT id FROM rooms WHERE id = $1 FOR UPDATE) INSERT …` looks tidier and
      changes nothing: the lock is granted against a snapshot the statement already fixed, so the
      blocked writer resumes and reads the same maximum it read before. Four concurrent creates
      produced two distinct positions with it, exactly as without it.
    */
    expect(flat(note)).not.toContain('WITH room AS (');
  });
});

describe('the transparent rehash cannot revert a password change', () => {
  it('guards on the hash that was verified', () => {
    expect(flat(login)).toContain(
      'UPDATE users SET password_hash = $2, updated_at = $3 WHERE id = $1 AND password_hash = $4'
    );
    expect(login).toContain('.bind(&existing)');
  });

  it('still ignores the result, because neither outcome is the member’s problem', () => {
    /*
      Zero rows means somebody else won the race and their write is the correct one; an error means
      the upgrade did not happen and the login is still valid. Turning either into a failed login
      would make a correct password an error.
    */
    const at = login.indexOf('password::needs_rehash(&existing)');
    expect(at).toBeGreaterThan(-1);
    expect(login.slice(at, at + 600)).toContain('let _ = sqlx::query(');
  });
});
