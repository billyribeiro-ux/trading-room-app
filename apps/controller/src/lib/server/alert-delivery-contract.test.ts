import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const read = (path: string) => readFileSync(`${ROOT}${path}`, 'utf8');

describe('durable alert delivery boundary', () => {
  it('ships a forward-only migration and registers it as version 14', () => {
    const migration = read('lib/server/db/migrations/0014-alert-delivery-ledger.js');
    const index = read('lib/server/db/migrations/index.js');
    expect(migration).toContain('CREATE TABLE alert_dispatches');
    expect(migration).toContain('CREATE TABLE alert_delivery_attempts');
    expect(migration).toContain('UNIQUE INDEX alert_dispatches_room_idempotency_idx');
    expect(index).toContain('version: 14');
    expect(index).toContain("name: 'alert_delivery_ledger'");
  });

  it('persists linked-room suppression as idempotent dispatch input', () => {
    const migration = read('lib/server/db/migrations/0017-alert-cross-post-suppression.js');
    const index = read('lib/server/db/migrations/index.js');
    const delivery = read('lib/server/alert-delivery.ts');
    expect(migration).toContain('ADD COLUMN dont_cross_post BOOLEAN NOT NULL DEFAULT FALSE');
    expect(index).toContain('version: 17');
    expect(index).toContain("name: 'alert_cross_post_suppression'");
    expect(delivery).toContain('dispatch.dontCrossPost !== input.dontCrossPost');
  });

  it('projects only a presenter-facing availability bit, never linked room ids', () => {
    const endpoint = read('routes/internal/room-config/[code]/+server.ts');
    const boundary = read('lib/room-config.ts');
    expect(endpoint).toContain('...(isPresenter ? { hasLinkedRoomAlerts } : {})');
    expect(endpoint).toContain("String(allSettings.linkedRoomAlerts ?? '').trim().length > 0");
    expect(boundary.match(/'linkedRoomAlerts'/g) ?? []).toHaveLength(0);
  });

  it('domain-separates report reads from dispatch writes', () => {
    const route = read('routes/internal/alert-delivery/[code]/+server.ts');
    expect(route).toContain('verifyConfigWriteToken');
    expect(route).toContain('verifyConfigReadToken');
    expect(route).toContain('dispatchAlertPush');
    expect(route).toContain('readAlertDeliveryReport');
    expect(route).toContain('linkedAlertRoomIds(settings.linkedRoomAlerts, room.id, dontCrossPost)');
  });

  it('never persists or returns an FCM registration credential in the report ledger', () => {
    const schema = read('lib/server/db/schema.ts');
    const ledger = schema.slice(schema.indexOf('export const alertDeliveryAttempts'));
    expect(ledger).not.toContain('registrationToken:');
    expect(ledger).not.toContain('pushTokensJson:');
    expect(ledger).toContain("registrationCount: integer('registration_count')");
  });
});
