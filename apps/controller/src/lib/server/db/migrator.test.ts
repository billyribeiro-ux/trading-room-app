import { describe, expect, it } from 'vitest';
import { MIGRATIONS } from './migrations/index.js';
import { checksum, validateMigrations } from './migrator.js';

/**
 * The migration LIST, checked without a database.
 *
 * These are the mistakes somebody makes adding a migration at the end of a long day — a duplicated
 * version, a gap, an empty file — and none of them should need a connection to catch, because the
 * place they get caught otherwise is production boot.
 */
describe('the migration list', () => {
  it('is valid as shipped', () => {
    expect(validateMigrations()).toEqual([]);
  });

  it('starts at 0 and is contiguous', () => {
    expect(MIGRATIONS[0].version).toBe(0);
    expect(MIGRATIONS.map((m) => m.version)).toEqual(MIGRATIONS.map((_, index) => index));
  });

  it('rejects a gap, because "everything after N" would be ambiguous', () => {
    const problems = validateMigrations([
      { version: 0, name: 'baseline', sql: 'SELECT 1;' },
      { version: 2, name: 'skipped_one', sql: 'SELECT 1;' }
    ]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/expected 1/);
  });

  it('rejects a duplicated version', () => {
    const problems = validateMigrations([
      { version: 0, name: 'baseline', sql: 'SELECT 1;' },
      { version: 0, name: 'again', sql: 'SELECT 1;' }
    ]);
    expect(problems).toHaveLength(1);
  });

  it('rejects an empty migration and an unusable name', () => {
    expect(validateMigrations([{ version: 0, name: 'baseline', sql: '   ' }])).toHaveLength(1);
    expect(validateMigrations([{ version: 0, name: 'Bad Name', sql: 'SELECT 1;' }])).toHaveLength(1);
  });

  /**
   * The baseline is the existing idempotent DDL on purpose: applying it to the live database must
   * be a provable no-op. If somebody replaces it with a generated `CREATE TABLE` baseline, this
   * fails — and it should, because that change requires deliberately baselining production.
   */
  it('keeps a baseline that is safe to apply to an existing database', () => {
    const baseline = MIGRATIONS[0].sql;
    expect(MIGRATIONS[0].name).toBe('baseline');

    const creates = baseline.match(/CREATE TABLE(?! IF NOT EXISTS)/gi) ?? [];
    expect(creates, 'every CREATE TABLE in the baseline must be IF NOT EXISTS').toEqual([]);

    const alters = baseline.match(/ADD COLUMN(?! IF NOT EXISTS)/gi) ?? [];
    expect(alters, 'every ADD COLUMN in the baseline must be IF NOT EXISTS').toEqual([]);

    const indexes = baseline.match(/CREATE (UNIQUE )?INDEX(?! IF NOT EXISTS)/gi) ?? [];
    expect(indexes, 'every CREATE INDEX in the baseline must be IF NOT EXISTS').toEqual([]);
  });

  it('checksums the text and nothing else, so it is stable across machines', () => {
    expect(checksum('SELECT 1;')).toBe(checksum('SELECT 1;'));
    expect(checksum('SELECT 1;')).not.toBe(checksum('SELECT 2;'));
    expect(checksum('SELECT 1;')).toHaveLength(64);
  });
});
