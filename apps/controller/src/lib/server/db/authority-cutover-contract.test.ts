import { describe, expect, it } from 'vitest';
import { MIGRATIONS } from './migrations/index.js';

describe('Gate 3 authority identity mapping', () => {
  it('is a forward-only migration with one-to-one nullable UUID mappings', () => {
    const migration = MIGRATIONS.find(({ version }) => version === 18);
    expect(migration?.name).toBe('authority_identity_mappings');
    expect(migration?.sql).toContain('ADD COLUMN authority_enterprise_id UUID');
    expect(migration?.sql).toContain('accounts_authority_enterprise_id_unique');
    expect(migration?.sql).toContain('ADD COLUMN authority_user_id UUID');
    expect(migration?.sql).toContain('users_authority_user_id_unique');
    expect(migration?.sql).not.toMatch(/NOT NULL/);
  });

  it('adds one-to-one nullable room mappings without rewriting the identity migration', () => {
    const migration = MIGRATIONS.find(({ version }) => version === 19);
    expect(migration?.name).toBe('authority_room_mappings');
    expect(migration?.sql).toContain('ADD COLUMN authority_room_id UUID');
    expect(migration?.sql).toContain('rooms_authority_room_id_unique');
    expect(migration?.sql).toContain('ADD COLUMN authority_reconciled_at TIMESTAMPTZ');
    expect(migration?.sql).not.toMatch(/NOT NULL/);
  });

  it('adds nullable membership identity, revision, and content-stability proof forward-only', () => {
    const migration = MIGRATIONS.find(({ version }) => version === 21);
    expect(migration?.name).toBe('authority_membership_projection');
    expect(migration?.sql).toContain('ADD COLUMN authority_member_id UUID');
    expect(migration?.sql).toContain('ADD COLUMN authority_revision BIGINT');
    expect(migration?.sql).toContain('ADD COLUMN authority_content_hash TEXT');
    expect(migration?.sql).toContain('room_users_authority_member_idx');
    expect(migration?.sql).toContain('room_users_authority_revision_nonnegative');
    expect(migration?.sql).not.toMatch(/NOT NULL/);
  });

  it('adds badge identity, revision, content proof, and captured roles forward-only', () => {
    const migration = MIGRATIONS.find(({ version }) => version === 22);
    expect(migration?.name).toBe('authority_badge_projection');
    expect(migration?.sql).toContain('ADD COLUMN authority_badge_id UUID');
    expect(migration?.sql).toContain('ADD COLUMN authority_revision BIGINT');
    expect(migration?.sql).toContain('ADD COLUMN authority_content_hash TEXT');
    expect(migration?.sql).toContain('ADD COLUMN auto_assign_roles_json TEXT');
    expect(migration?.sql).toContain('badges_authority_badge_idx');
    expect(migration?.sql).toContain('badges_authority_revision_nonnegative');
  });
});
