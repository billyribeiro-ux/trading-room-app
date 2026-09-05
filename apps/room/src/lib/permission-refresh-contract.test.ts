import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { callRemote } from '#lib/server/remote-command-harness.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { users, type User } from '#lib/server/db/schema.js';
import { subscribeToRoom, type RoomEvent } from '#lib/server/room-events.js';
import { savePermissions } from '../routes/permissions.remote.js';

/*
  The real write client stays in this contract: its successful HTTP response is the commit boundary
  whose order the first test measures. Supply its configuration through Kit's declared environment
  module, however, rather than borrowing a developer's ignored `.env`. A clean checkout has no
  secret by design; without this fixture CI fails closed before the stub controller is reached.
*/
vi.mock('$app/env/private', () => ({
  CONTROL_BASE_URL: 'https://controller.permission-refresh.test',
  ROOM_JWT_SECRET: 'permission-refresh-contract-secret'
}));

const ROOM = 'permission-refresh';
let presenter: User;
let member: User;

function account(email: string, role: 'staff' | 'member'): User {
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return existing;
  return db
    .insert(users)
    .values({
      displayName: email,
      email,
      role,
      passwordHash: 'scrypt$00$00',
      createdAt: new Date()
    })
    .returning()
    .get();
}

beforeAll(() => {
  ensureDatabase();
  presenter = account('permission-refresh-presenter@example.test', 'staff');
  member = account('permission-refresh-member@example.test', 'member');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('permission changes take effect for the connected target', () => {
  it('publishes one addressed reload only after the controller commits', async () => {
    const order: string[] = [];
    const frames: RoomEvent[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string | URL | Request) => {
        if (String(input).includes('/internal/room-permissions/')) {
          order.push('controller-committed');
        }
        return new Response(null, { status: 204 });
      })
    );

    const unsubscribe = subscribeToRoom(
      ROOM,
      (event) => {
        if (event.channel !== 'privCmds') return;
        order.push('target-notified');
        frames.push(event);
      },
      {
        id: member.id,
        userXrefID: String(member.id),
        displayName: member.displayName,
        email: member.email,
        avatarUrl: member.avatarUrl,
        role: member.role,
        status: 'online',
        emailHash: '',
        locStr: '',
        isP: false,
        isFT: false,
        hasAdminChat: false,
        hasMic: false,
        hasScreen: false,
        hasCam: false,
        canEditNotes: false
      }
    );

    try {
      await callRemote(
        {
          user: presenter,
          sessionId: 'permission-refresh-presenter-session',
          roomShortCode: ROOM,
          isFreeTrial: false
        },
        () => savePermissions({ targetUserId: member.id, granted: ['hasMic'] })
      );
    } finally {
      unsubscribe();
    }

    expect(order).toEqual(['controller-committed', 'target-notified']);
    expect(frames).toEqual([
      {
        channel: 'privCmds',
        data: { cmd: 'forceReload', targetUserId: member.id }
      }
    ]);
  });

  it('does not claim success to the member when the controller write fails', async () => {
    const frames: RoomEvent[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(null, { status: 500 }))
    );
    const unsubscribe = subscribeToRoom(ROOM, (event) => {
      if (event.channel === 'privCmds') frames.push(event);
    });

    try {
      await expect(
        callRemote(
          {
            user: presenter,
            sessionId: 'permission-refresh-presenter-session',
            roomShortCode: ROOM,
            isFreeTrial: false
          },
          () => savePermissions({ targetUserId: member.id, granted: [] })
        )
      ).rejects.toBeDefined();
    } finally {
      unsubscribe();
    }

    expect(frames).toEqual([]);
  });
});
