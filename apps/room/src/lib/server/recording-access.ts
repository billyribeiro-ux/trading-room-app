import { error } from '@sveltejs/kit';
import { archivesAvailableTo } from '#lib/roster-gates.js';
import type { User } from './db/schema.js';
import { readRoomConfig } from './room-config-client.js';

export async function recordingAccess(input: {
  request: Request;
  roomShortCode: string;
  user: User;
}) {
  const config = await readRoomConfig(input.request, input.roomShortCode, input.user.email);
  const member = config.member;
  const isPresenter = member?.isP === true;
  const canRead = archivesAvailableTo(
    {
      isPresenter,
      email: input.user.email,
      userXrefID: '',
      hasAdminChat: member?.permissions.hasAdminChat ?? false,
      isLimitedPresenter: false,
      denyArchivesAccess: member ? member.denyArchivesAccess !== false : false
    },
    config.settings
  );
  return { canRead, canWrite: isPresenter, config };
}

export async function requireRecordingAccess(
  input: { request: Request; roomShortCode: string; user: User },
  mode: 'read' | 'write'
): Promise<Awaited<ReturnType<typeof recordingAccess>>> {
  const access = await recordingAccess(input);
  if (mode === 'write' ? !access.canWrite : !access.canRead) {
    error(403, mode === 'write' ? 'Presenters only.' : 'Recording archives are not available.');
  }
  return access;
}
