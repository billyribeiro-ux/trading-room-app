import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { codeOf } from '#lib/source-comments.js';

/**
 * End-to-end source contract for the alert-delivery report.
 *
 * The legacy suite documented an intentional refusal while no delivery ledger or dispatcher
 * existed. That premise expired when the controller gained its durable dispatch/attempt ledgers,
 * FCM worker and presenter report endpoint. These assertions keep all layers connected and ensure
 * the UI cannot regress to a cosmetic report over fabricated data.
 */
const ROOM_ROOT = fileURLToPath(new URL('..', import.meta.url));
const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const readRoom = (file: string) => codeOf(file, readFileSync(`${ROOM_ROOT}${file}`, 'utf8'));
const readRepo = (file: string) => codeOf(file, readFileSync(`${REPO_ROOT}${file}`, 'utf8'));

const report = readRoom('lib/components/AlertSendReportModal.svelte');
const reportBody = readRoom('lib/components/AlertDeliveryReportBody.svelte');
const reportSurface = `${report}\n${reportBody}`;
const host = readRoom('lib/components/ModalHost.svelte');
const remote = readRoom('routes/alert-delivery.remote.ts');
const outbox = readRoom('lib/server/alert-delivery-outbox.ts');
const roomSchema = readRoom('lib/server/db/schema.ts');
const controllerRoute = readRepo(
  'apps/controller/src/routes/internal/alert-delivery/[code]/+server.ts'
);
const controllerDelivery = readRepo('apps/controller/src/lib/server/alert-delivery.ts');
const controllerSchema = readRepo('apps/controller/src/lib/server/db/schema.ts');

describe('alert delivery report end-to-end contract', () => {
  it('is mounted by the modal host and has a correctly named dialog', () => {
    expect(host).toContain('<AlertSendReportModal');
    expect(report).toContain('id="alert-send-report-modal"');
    expect(report).toContain('ariaLabelledby="alert-send-report-modal-title"');
    expect(report).toContain('titleId="alert-send-report-modal-title"');
  });

  it('loads the authenticated presenter-only report instead of synthesizing results', () => {
    expect(report).toContain('getAlertDeliveryReport(alertId)');
    expect(report).toContain('{#if loading}');
    expect(report).toContain('{:else if problem}');
    expect(report).toContain('{:else if report}');
    expect(remote).toContain('requireUser(locals)');
    expect(remote).toContain('presenterRoom()');
    expect(remote).toContain('readLocalAlertDelivery(alertId, room)');
    expect(remote).toContain('requestAlertDeliveryReport(room, alertId)');
  });

  it('keeps a durable local transactional outbox between alert creation and controller dispatch', () => {
    expect(roomSchema).toContain('export const alertDeliveryJobs');
    expect(outbox).toContain('claimDueAlertDeliveries');
    expect(outbox).toContain('requestAlertDelivery({');
    expect(outbox).toContain("status: 'failed'");
    expect(outbox).toContain('nextAttemptAt');
  });

  it('backs the controller endpoint with dispatch and per-recipient attempt ledgers', () => {
    expect(controllerSchema).toContain('export const alertDispatches');
    expect(controllerSchema).toContain('export const alertDeliveryAttempts');
    expect(controllerSchema).toContain('export const alertDispatchLinks');
    expect(controllerRoute).toContain('verifyConfigWriteToken');
    expect(controllerRoute).toContain('verifyConfigReadToken');
    expect(controllerRoute).toContain('dispatchAlert');
    expect(controllerRoute).toContain('readAlertDeliveryReport');
    expect(controllerDelivery).toContain('linkAlertDispatch');
  });

  it('exposes recipient outcomes, filtering, linked-room identity, and delivery timing', () => {
    for (const marker of [
      'recipientEmail',
      'roomName',
      'roomShortCode',
      'bind:value={search}',
      'bind:value={status}',
      'row.finishedAt',
      'row.reason',
      'row.registrationCount',
      'row.prunedCount'
    ]) {
      expect(reportSurface).toContain(marker);
    }
    expect(reportBody).toContain('`${row.roomShortCode}:${row.recipientEmail}`');
  });

  it('never substitutes an availability refusal for a real empty report', () => {
    expect(report).not.toContain('REPORT_UNAVAILABLE');
    expect(report).not.toContain('Delivery reporting is not available here');
    expect(report).toContain('{:else if report}');
    expect(reportBody).toContain('{#if filteredRows.length === 0}');
    expect(reportBody).toContain('>No Reports.<');
  });
});
