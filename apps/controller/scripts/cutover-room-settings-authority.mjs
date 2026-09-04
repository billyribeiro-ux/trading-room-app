#!/usr/bin/env node

/**
 * Reversible Gate 3 conversion of controller room_settings into Rust rooms.config.settings.
 *
 * The target and its owner-only ledger commit before the controller projection. That unavoidable
 * cross-database window is resumable. Rollback clears the projection proof first and removes only
 * a target document that still has revision zero and the exact imported digest.
 */

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import postgres from 'postgres';

/** @typedef {import('postgres').Sql} Sql */
/** @typedef {import('postgres').TransactionSql} TransactionSql */
/** @typedef {Sql | TransactionSql} SqlHandle */
/** @typedef {'string' | 'number' | 'boolean'} SettingType */
/** @typedef {string | number | boolean} SettingValue */
/** @typedef {Record<string, SettingValue>} SettingsDocument */
/** @typedef {{ name: string; valueType: SettingType }} ManifestSetting */
/** @typedef {{ schemaVersion: number; settings: ManifestSetting[] }} Manifest */
/**
 * @typedef {object} SourceSettingsRow
 * @property {string} legacyId
 * @property {string} targetId
 * @property {string} enterpriseId
 * @property {number | null} authorityRevision
 * @property {string} roomName
 * @property {SettingsDocument} settings
 */
/**
 * @typedef {object} MappingRow
 * @property {string} legacyId
 * @property {string} targetId
 * @property {string} sourceDigest
 */
/** @typedef {{ row: SourceSettingsRow; sourceDigest: string; mapped: boolean }} PlanItem */
/** @typedef {{ counts: { roomSettings: number }; digest: string }} SettingsSnapshot */
/**
 * @typedef {object} TargetState
 * @property {string} enterpriseId
 * @property {string} name
 * @property {number | bigint | string} revision
 * @property {Record<string, unknown> | null} settings
 */
/**
 * @typedef {object} RoomSettingsCutoverInput
 * @property {string | undefined} command
 * @property {string | undefined} sourceUrl
 * @property {string | undefined} targetUrl
 * @property {string | undefined} sourceLabel
 */

const SOURCE_SYSTEM = 'controller-postgres';
const SCOPE = 'room-settings';
const ENTITY_TYPE = 'room-settings';
const LOCK_KEY = 0x4355_5435;
const COMMANDS = new Set(['plan', 'apply', 'verify', 'rollback']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/;
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const MANIFEST = /** @type {Manifest} */ (
  JSON.parse(readFileSync(resolve(SCRIPT_DIR, '../../../services/api/src/room-settings-manifest.json'), 'utf8'))
);
const SETTING_TYPES = new Map(MANIFEST.settings.map((setting) => [setting.name, setting.valueType]));

export class RoomSettingsCutoverRefusal extends Error {
  /** @param {string} code @param {string} message */
  constructor(code, message) {
    super(message);
    this.name = 'RoomSettingsCutoverRefusal';
    this.code = code;
  }
}

/** @param {string} code @param {string} message @returns {never} */
function refuse(code, message) {
  throw new RoomSettingsCutoverRefusal(code, message);
}

/** @param {string} value */
function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

/** @param {unknown} value */
function digest(value) {
  return sha256(JSON.stringify(value) ?? 'undefined');
}

/** @param {unknown} value @param {string} code */
function uuid(value, code) {
  const normalized = String(value ?? '').toLowerCase();
  if (!UUID.test(normalized)) refuse(code, 'A required authority mapping is missing or invalid.');
  return normalized;
}

/** @param {string | undefined} label */
function sourceFingerprint(label) {
  const normalized = String(label ?? '').trim();
  if (normalized.length < 8 || normalized.length > 128) {
    refuse('invalid-source-label', 'CUTOVER_SOURCE_LABEL must contain 8 to 128 characters.');
  }
  return sha256(normalized);
}

/** @param {unknown} raw @returns {SettingsDocument} */
export function normalizeSettingsDocument(raw) {
  let parsed = raw;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
    } catch {
      refuse('invalid-settings-json', 'A source room settings document is not valid JSON.');
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    refuse('invalid-settings-document', 'A source room settings document is not an object.');
  }
  const source = /** @type {Record<string, unknown>} */ (parsed);
  /** @type {SettingsDocument} */
  const normalized = {};
  for (const name of Object.keys(source).sort()) {
    const value = source[name];
    const expected = SETTING_TYPES.get(name);
    if (!expected) refuse('unknown-setting', 'A source room contains a setting outside the generated manifest.');
    if (value === null) continue;
    const actual = typeof value;
    if (actual !== expected || (actual === 'number' && !Number.isFinite(value))) {
      refuse('wrong-setting-type', 'A source room setting has the wrong scalar type.');
    }
    if (Buffer.byteLength(JSON.stringify(value)) > 256 * 1024) {
      refuse('setting-value-too-large', 'A source room setting exceeds the authority limit.');
    }
    normalized[name] = /** @type {SettingValue} */ (value);
  }
  if (Buffer.byteLength(JSON.stringify(normalized)) > 768 * 1024) {
    refuse('settings-document-too-large', 'A source room settings document exceeds the authority limit.');
  }
  if (typeof normalized.name === 'string') {
    normalized.name = normalized.name.trim();
    if (!normalized.name || Buffer.byteLength(normalized.name) > 160) {
      refuse('invalid-room-name', 'A source room title is invalid.');
    }
  }
  return normalized;
}

/** @param {Record<string, unknown>[]} rows @returns {SourceSettingsRow[]} */
export function normalizeSourceRows(rows) {
  const seenLegacy = new Set();
  const seenTarget = new Set();
  return rows
    .map((raw) => {
      const legacyId = String(raw.legacyId ?? '');
      if (!/^[1-9][0-9]*$/.test(legacyId)) refuse('invalid-legacy-id', 'A legacy room id is invalid.');
      const targetId = uuid(raw.targetId, 'missing-room-authority-mapping');
      if (seenLegacy.has(legacyId) || seenTarget.has(targetId)) {
        refuse('duplicate-room-mapping', 'Room settings mappings are not one to one.');
      }
      seenLegacy.add(legacyId);
      seenTarget.add(targetId);
      const authorityRevision = raw.authorityRevision == null ? null : Number(raw.authorityRevision);
      if (authorityRevision !== null && (!Number.isSafeInteger(authorityRevision) || authorityRevision < 0)) {
        refuse('invalid-authority-revision', 'A controller projection revision is invalid.');
      }
      const roomName = String(raw.roomName ?? '').trim();
      if (!roomName || Buffer.byteLength(roomName) > 160) {
        refuse('invalid-room-name', 'A source room title is invalid.');
      }
      const settings = normalizeSettingsDocument(raw.settingsJson);
      if (settings.name !== undefined && settings.name !== roomName) {
        refuse('room-name-disagreement', 'The source room title and settings title disagree.');
      }
      return {
        legacyId,
        targetId,
        enterpriseId: uuid(raw.enterpriseId, 'missing-enterprise-authority-mapping'),
        authorityRevision,
        roomName,
        settings
      };
    })
    .sort((left, right) => (BigInt(left.legacyId) < BigInt(right.legacyId) ? -1 : 1));
}

/** @param {SourceSettingsRow} row */
function rowDigest(row) {
  return digest({
    legacyId: row.legacyId,
    targetId: row.targetId,
    enterpriseId: row.enterpriseId,
    roomName: row.roomName,
    settings: row.settings
  });
}

/** @param {SourceSettingsRow[]} rows @returns {SettingsSnapshot} */
function snapshot(rows) {
  return { counts: { roomSettings: rows.length }, digest: digest(rows.map(rowDigest)) };
}

/** @param {SqlHandle} sql @returns {Promise<SourceSettingsRow[]>} */
async function readSource(sql) {
  const raw = /** @type {Record<string, unknown>[]} */ (
    await sql`
    SELECT room.id::text AS "legacyId", room.authority_room_id::text AS "targetId",
           account.authority_enterprise_id::text AS "enterpriseId",
           room.name AS "roomName", setting.settings_json AS "settingsJson",
           setting.authority_revision AS "authorityRevision"
      FROM rooms AS room
      INNER JOIN accounts AS account ON account.id = room.account_id
      INNER JOIN room_settings AS setting ON setting.room_id = room.id
     WHERE room.authority_room_id IS NOT NULL AND room.authority_reconciled_at IS NOT NULL
       AND account.authority_enterprise_id IS NOT NULL AND account.authority_reconciled_at IS NOT NULL
     ORDER BY room.id
  `
  );
  const rows = normalizeSourceRows(raw);
  const total = await sql`SELECT count(*)::integer AS count FROM rooms`;
  if (rows.length !== total[0].count) {
    refuse('room-conversion-incomplete', 'Every source room requires reconciled room, account, and settings rows.');
  }
  return rows;
}

/** @param {SqlHandle} sql @param {string} fingerprint @returns {Promise<MappingRow[]>} */
async function readMappings(sql, fingerprint) {
  return /** @type {Promise<MappingRow[]>} */ (
    sql`
    SELECT legacy_id AS "legacyId", target_id::text AS "targetId", source_digest AS "sourceDigest"
      FROM legacy_entity_mappings
     WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
       AND entity_type = ${ENTITY_TYPE}
     ORDER BY legacy_id
  `
  );
}

/** @param {SourceSettingsRow[]} rows @param {MappingRow[]} mappings @returns {PlanItem[]} */
function reconcile(rows, mappings) {
  const byLegacy = new Map(mappings.map((mapping) => [String(mapping.legacyId), mapping]));
  if (byLegacy.size !== mappings.length) refuse('duplicate-ledger-mapping', 'The settings ledger is ambiguous.');
  if (mappings.some((mapping) => !rows.some((row) => row.legacyId === String(mapping.legacyId)))) {
    refuse('extra-target-mapping', 'The target maps settings absent from the source.');
  }
  return rows.map((row) => {
    const mapping = byLegacy.get(row.legacyId);
    const sourceDigest = rowDigest(row);
    if (mapping) {
      if (uuid(mapping.targetId, 'invalid-ledger-target') !== row.targetId) {
        refuse('mapping-disagreement', 'Room and settings ledgers disagree on the canonical id.');
      }
      if (!SHA256.test(mapping.sourceDigest) || mapping.sourceDigest !== sourceDigest) {
        refuse('source-changed-since-target-commit', 'Source settings changed after the target commit.');
      }
    }
    return { row, sourceDigest, mapped: Boolean(mapping) };
  });
}

/** @param {SqlHandle} sql @param {string} fingerprint */
async function activeRun(sql, fingerprint) {
  const rows = await sql`
    SELECT id::text AS id, status, source_digest AS "sourceDigest", source_counts AS "sourceCounts"
      FROM legacy_cutover_runs
     WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint} AND scope = ${SCOPE}
       AND status IN ('running', 'target-committed')
     ORDER BY started_at DESC LIMIT 1
  `;
  return rows[0] ?? null;
}

/** @param {SqlHandle} sql @param {string} fingerprint @param {SettingsSnapshot} sourceSnapshot */
async function beginRun(sql, fingerprint, sourceSnapshot) {
  const active = await activeRun(sql, fingerprint);
  if (active) {
    if (
      active.sourceDigest !== sourceSnapshot.digest ||
      active.sourceCounts.roomSettings !== sourceSnapshot.counts.roomSettings
    ) {
      refuse('source-changed-during-resume', 'The source changed after an unfinished target commit.');
    }
    return active.id;
  }
  const rows = await sql`
    INSERT INTO legacy_cutover_runs
      (source_system, source_fingerprint, scope, status, source_counts, target_counts, source_digest)
    VALUES (${SOURCE_SYSTEM}, ${fingerprint}, ${SCOPE}, 'running', ${sql.json(sourceSnapshot.counts)},
            '{}'::jsonb, ${sourceSnapshot.digest})
    RETURNING id::text AS id
  `;
  return rows[0].id;
}

/** @param {SqlHandle} sql @param {string} targetId @returns {Promise<TargetState | null>} */
async function targetState(sql, targetId) {
  const rows = /** @type {TargetState[]} */ (
    await sql`
    SELECT enterprise_id::text AS "enterpriseId", name, settings_revision::bigint AS revision,
           config -> 'settings' AS settings
      FROM rooms WHERE id = ${targetId}::uuid
  `
  );
  return rows[0] ?? null;
}

/**
 * @param {Sql} sourceSql
 * @param {SqlHandle} targetSql
 * @param {string} fingerprint
 * @param {{ expectedRunId?: string | null; updateEvidence?: boolean }} [options]
 */
async function verifyState(sourceSql, targetSql, fingerprint, options = {}) {
  const { expectedRunId = null, updateEvidence = true } = options;
  const rows = await readSource(sourceSql);
  const mappings = await readMappings(targetSql, fingerprint);
  const plan = reconcile(rows, mappings);
  if (mappings.length !== rows.length) refuse('missing-target-mapping', 'A source settings row is not mapped.');
  for (const { row } of plan) {
    const target = await targetState(targetSql, row.targetId);
    if (
      !target ||
      target.enterpriseId !== row.enterpriseId ||
      target.name !== row.roomName ||
      Number(target.revision) !== row.authorityRevision ||
      digest(normalizeSettingsDocument(target.settings)) !== digest(row.settings)
    ) {
      refuse('settings-reconciliation-failed', 'A canonical settings document differs from its projection.');
    }
  }
  const state = snapshot(rows);
  const runs = expectedRunId
    ? await targetSql`
        SELECT id::text AS id, source_digest AS "sourceDigest", source_counts AS "sourceCounts"
          FROM legacy_cutover_runs WHERE id = ${expectedRunId}::uuid
      `
    : await targetSql`
        SELECT id::text AS id, source_digest AS "sourceDigest", source_counts AS "sourceCounts"
          FROM legacy_cutover_runs
         WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint} AND scope = ${SCOPE}
           AND status IN ('running', 'target-committed', 'verified')
         ORDER BY started_at DESC LIMIT 1
      `;
  if (
    runs.length !== 1 ||
    runs[0].sourceDigest !== state.digest ||
    runs[0].sourceCounts.roomSettings !== state.counts.roomSettings
  ) {
    refuse('source-changed-since-target-commit', 'The source snapshot differs from the committed run.');
  }
  if (updateEvidence) {
    await targetSql`
      UPDATE legacy_entity_mappings SET verified_at = now()
       WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
         AND entity_type = ${ENTITY_TYPE}
    `;
    await targetSql`
       UPDATE legacy_cutover_runs
         SET status = 'verified', verified_at = now(), target_counts = ${targetSql.json(state.counts)},
             target_digest = ${state.digest}
       WHERE id = ${runs[0].id}::uuid
    `;
  }
  return { ...state, runId: runs[0].id };
}

/** @param {Sql} sourceSql @param {Sql} targetSql @param {string} fingerprint */
async function planCommand(sourceSql, targetSql, fingerprint) {
  const rows = await readSource(sourceSql);
  const mappings = await readMappings(targetSql, fingerprint);
  reconcile(rows, mappings);
  return { status: 'planned', ...snapshot(rows), mapped: mappings.length };
}

/** @param {Sql} sourceSql @param {Sql} targetSql @param {string} fingerprint */
async function applyCommand(sourceSql, targetSql, fingerprint) {
  await sourceSql`SELECT pg_advisory_lock(${LOCK_KEY})`;
  let targetLocked = false;
  try {
    await targetSql`SELECT pg_advisory_lock(${LOCK_KEY})`;
    targetLocked = true;
    const rows = await readSource(sourceSql);
    const sourceSnapshot = snapshot(rows);
    const mappings = await readMappings(targetSql, fingerprint);
    const plan = reconcile(rows, mappings);
    const runId = await targetSql.begin('isolation level serializable', async (/** @type {TransactionSql} */ tx) => {
      const id = await beginRun(tx, fingerprint, sourceSnapshot);
      for (const { row, sourceDigest, mapped } of plan) {
        const locked = await tx`
          SELECT enterprise_id::text AS "enterpriseId", name, settings_revision::bigint AS revision,
                 config -> 'settings' AS settings
            FROM rooms WHERE id = ${row.targetId}::uuid FOR UPDATE
        `;
        const target = locked[0];
        if (!target || target.enterpriseId !== row.enterpriseId || target.name !== row.roomName) {
          refuse('missing-target-room', 'A mapped canonical room is missing or belongs to another enterprise.');
        }
        if (mapped) {
          if (
            Number(target.revision) !== 0 ||
            digest(normalizeSettingsDocument(target.settings)) !== digest(row.settings)
          ) {
            refuse('target-changed-during-resume', 'Canonical settings changed after the import commit.');
          }
        } else {
          if (Number(target.revision) !== 0 || (target.settings && Object.keys(target.settings).length > 0)) {
            refuse('unproven-existing-target', 'Canonical settings already exist without conversion ownership proof.');
          }
          await tx`
            UPDATE rooms SET config = jsonb_set(config, '{settings}', ${tx.json(row.settings)}::jsonb, true)
             WHERE id = ${row.targetId}::uuid
          `;
          await tx`
            INSERT INTO legacy_entity_mappings
              (source_system, source_fingerprint, entity_type, legacy_id, target_id, run_id, source_digest)
            VALUES (${SOURCE_SYSTEM}, ${fingerprint}, ${ENTITY_TYPE}, ${row.legacyId}, ${row.targetId}::uuid,
                    ${id}::uuid, ${sourceDigest})
          `;
        }
      }
      await tx`
        UPDATE legacy_cutover_runs SET status = 'target-committed', target_committed_at = now(),
               target_counts = ${tx.json(sourceSnapshot.counts)} WHERE id = ${id}::uuid
      `;
      return id;
    });

    await sourceSql.begin('isolation level serializable', async (/** @type {TransactionSql} */ tx) => {
      for (const { row } of plan) {
        const updated = await tx`
          UPDATE room_settings SET authority_revision = 0, authority_reconciled_at = now()
           WHERE room_id = ${row.legacyId}::integer AND settings_json::jsonb = ${tx.json(row.settings)}::jsonb
             AND (authority_revision IS NULL OR authority_revision = 0)
          RETURNING room_id
        `;
        if (updated.length !== 1) refuse('source-projection-race', 'Source settings changed during conversion.');
      }
    });
    const verified = await verifyState(sourceSql, targetSql, fingerprint, { expectedRunId: runId });
    return { status: 'verified', runId, counts: verified.counts, digest: verified.digest };
  } finally {
    if (targetLocked) await targetSql`SELECT pg_advisory_unlock(${LOCK_KEY})`;
    await sourceSql`SELECT pg_advisory_unlock(${LOCK_KEY})`;
  }
}

/** @param {Sql} sourceSql @param {Sql} targetSql @param {string} fingerprint */
async function verifyCommand(sourceSql, targetSql, fingerprint) {
  const verified = await verifyState(sourceSql, targetSql, fingerprint);
  return { status: 'verified', ...verified };
}

/** @param {Sql} sourceSql @param {Sql} targetSql @param {string} fingerprint */
async function rollbackCommand(sourceSql, targetSql, fingerprint) {
  await sourceSql`SELECT pg_advisory_lock(${LOCK_KEY})`;
  let targetLocked = false;
  try {
    await targetSql`SELECT pg_advisory_lock(${LOCK_KEY})`;
    targetLocked = true;
    const rows = await readSource(sourceSql);
    const mappings = await readMappings(targetSql, fingerprint);
    const latestRun = await targetSql`
      SELECT status FROM legacy_cutover_runs
       WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint} AND scope = ${SCOPE}
       ORDER BY started_at DESC LIMIT 1
    `;
    if (latestRun[0]?.status === 'rolled-back') {
      if (mappings.length !== 0 || rows.some((row) => row.authorityRevision !== null)) {
        refuse('rollback-state-disagreement', 'A completed rollback still has settings ownership residue.');
      }
      for (const row of rows) {
        const target = await targetState(targetSql, row.targetId);
        if (
          !target ||
          target.enterpriseId !== row.enterpriseId ||
          target.name !== row.roomName ||
          Number(target.revision) !== 0 ||
          (target.settings !== null && Object.keys(target.settings).length !== 0)
        ) {
          refuse('rollback-state-disagreement', 'A completed rollback still has canonical settings residue.');
        }
      }
      return { status: 'rolled-back', counts: snapshot(rows).counts };
    }
    const plan = reconcile(rows, mappings);
    if (mappings.length !== rows.length) refuse('missing-target-mapping', 'A source settings row is not mapped.');
    for (const { row } of plan) {
      const target = await targetState(targetSql, row.targetId);
      if (
        !target ||
        target.enterpriseId !== row.enterpriseId ||
        target.name !== row.roomName ||
        Number(target.revision) !== 0 ||
        (row.authorityRevision !== 0 && row.authorityRevision !== null) ||
        digest(normalizeSettingsDocument(target.settings)) !== digest(row.settings)
      ) {
        refuse('rollback-unsafe-after-use', 'Settings authority has changed since conversion; rollback is refused.');
      }
    }
    await sourceSql.begin('isolation level serializable', async (/** @type {TransactionSql} */ tx) => {
      for (const { row } of plan) {
        const cleared = await tx`
          UPDATE room_settings SET authority_revision = NULL, authority_reconciled_at = NULL
           WHERE room_id = ${row.legacyId}::integer
             AND (authority_revision IS NULL OR authority_revision = 0)
          RETURNING room_id
        `;
        if (cleared.length !== 1) refuse('source-projection-race', 'Source settings proof changed during rollback.');
      }
    });
    await targetSql.begin('isolation level serializable', async (/** @type {TransactionSql} */ tx) => {
      for (const { row } of plan) {
        const removed = await tx`
          UPDATE rooms SET config = config - 'settings'
           WHERE id = ${row.targetId}::uuid AND settings_revision = 0
             AND config -> 'settings' = ${tx.json(row.settings)}::jsonb
          RETURNING id
        `;
        if (removed.length !== 1) refuse('target-settings-race', 'Canonical settings changed during rollback.');
      }
      await tx`
        DELETE FROM legacy_entity_mappings
         WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint}
           AND entity_type = ${ENTITY_TYPE}
      `;
      await tx`
        UPDATE legacy_cutover_runs SET status = 'rolled-back', rolled_back_at = now()
         WHERE source_system = ${SOURCE_SYSTEM} AND source_fingerprint = ${fingerprint} AND scope = ${SCOPE}
           AND status IN ('running', 'target-committed', 'verified')
      `;
    });
    return { status: 'rolled-back', counts: snapshot(rows).counts };
  } finally {
    if (targetLocked) await targetSql`SELECT pg_advisory_unlock(${LOCK_KEY})`;
    await sourceSql`SELECT pg_advisory_unlock(${LOCK_KEY})`;
  }
}

/** @param {RoomSettingsCutoverInput} input */
export async function runRoomSettingsCutover({ command, sourceUrl, targetUrl, sourceLabel }) {
  if (typeof command !== 'string' || !COMMANDS.has(command)) {
    refuse('invalid-command', 'Expected plan, apply, verify, or rollback.');
  }
  if (!sourceUrl || !targetUrl) {
    refuse('missing-database-url', 'Both CUTOVER_SOURCE_DATABASE_URL and CUTOVER_TARGET_DATABASE_URL are required.');
  }
  if (sourceUrl === targetUrl) refuse('same-database-url', 'Source and target database URLs must differ.');
  const fingerprint = sourceFingerprint(sourceLabel);
  const options = { max: 1, prepare: false, idle_timeout: 5, connect_timeout: 10 };
  const sourceSql = postgres(sourceUrl, options);
  const targetSql = postgres(targetUrl, options);
  try {
    if (command === 'plan') return await planCommand(sourceSql, targetSql, fingerprint);
    if (command === 'apply') return await applyCommand(sourceSql, targetSql, fingerprint);
    if (command === 'verify') return await verifyCommand(sourceSql, targetSql, fingerprint);
    return await rollbackCommand(sourceSql, targetSql, fingerprint);
  } finally {
    await Promise.allSettled([sourceSql.end({ timeout: 5 }), targetSql.end({ timeout: 5 })]);
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedPath === import.meta.url) {
  try {
    const result = await runRoomSettingsCutover({
      command: process.argv[2],
      sourceUrl: process.env.CUTOVER_SOURCE_DATABASE_URL,
      targetUrl: process.env.CUTOVER_TARGET_DATABASE_URL,
      sourceLabel: process.env.CUTOVER_SOURCE_LABEL
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } catch (cause) {
    const code = cause instanceof RoomSettingsCutoverRefusal ? cause.code : 'internal';
    process.stderr.write(`[cutover:room-settings] ${code}\n`);
    process.exitCode = 1;
  }
}
