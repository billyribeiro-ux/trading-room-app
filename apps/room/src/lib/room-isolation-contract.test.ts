import { beforeAll, describe, expect, it, vi } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db, ensureDatabase } from '$lib/server/db';
import {
  alerts,
  messages,
  notes,
  polls,
  savedPolls,
  sharedFiles,
  users
} from '$lib/server/db/schema';

/**
 * A room created a moment ago must come up EMPTY.
 *
 * This is the defect the owner reported: a brand-new room opened showing another room's alerts,
 * chat, notes and files. There were two causes and this file pins both.
 *
 * 1. **Nothing was scoped.** `alerts`, `notes`, `shared_files`, `polls` and the rest had no room
 *    column at all, so every read returned the whole deployment. The original scopes every one of
 *    its realtime channels by the session — `/sess/${sessionID}/alerts/`,
 *    `/sess/${sessionID}/chat/main/` and eight more, extracted from its own bundle into
 *    `docs/generated/realtime-protocol.json`.
 *
 * 2. **The capture fixture was served into every room.** Its 18 items are the samples the
 *    reconstruction is matched AGAINST, not content, and `capturedRoomItems` was called
 *    unconditionally on every load. They now render only in the room they were captured from.
 *
 * The assertions are deliberately about ABSENCE, which is the hard direction: a scoping bug shows
 * up as extra rows, and only a test that counts zero will fail on it.
 */

const OTHER_ROOM = '3625';
const FRESH_ROOM = '9001';

/*
  The controller, stubbed — same reasoning as `page-load-contract.test.ts`: `load` reads this
  room's settings from `new-room-control`, which is not running in a unit test. The stub answers
  for whichever room is asked, so the fresh room is a real room with a real membership and nothing
  in it. If emptiness came from being refused rather than from scoping, that would be a different
  test passing for the wrong reason.
*/
vi.mock('$lib/server/room-config-client', () => ({
  readRoomConfig: async (_request: Request, shortCode: string) => ({
    room: {
      shortCode,
      name: `Room ${shortCode}`,
      state: 'open',
      logoUrl: null,
      publicId: null,
      maxUsers: 0
    },
    settings: { rosterVisibleToViewers: true, userUploads: false },
    locked: [],
    member: {
      displayName: 'Isolation Probe',
      email: 'room-isolation-contract@example.test',
      role: 1,
      nonPresenter: false,
      isP: true,
      isNonPresenterAdmin: false,
      isFT: false,
      denyArchivesAccess: false,
      restrictPmUser: false,
      muted: false,
      banned: false,
      permissions: {
        hasMic: true,
        hasScreen: true,
        hasCam: true,
        hasAdminChat: false,
        canEditNotes: true
      }
    }
  }),
  requestMobilePin: async () => '000000'
}));

const { load } = await import('../routes/+page.server');

type LoadArgs = Parameters<typeof load>[0];

let probe: typeof users.$inferSelect;

beforeAll(() => {
  ensureDatabase();

  probe = db
    .insert(users)
    .values({
      displayName: 'Isolation Probe',
      email: 'room-isolation-contract@example.test',
      role: 'staff',
      passwordHash: 'scrypt$00$00',
      createdAt: new Date()
    })
    .onConflictDoUpdate({ target: users.email, set: { displayName: 'Isolation Probe' } })
    .returning()
    .get();

  const now = new Date();
  // Content that belongs to somebody else's room, and must never appear in the fresh one.
  db.insert(messages)
    .values({
      roomShortCode: OTHER_ROOM,
      room: 'main',
      senderId: probe.id,
      body: 'another room’s chat',
      createdAt: now
    })
    .run();
  db.insert(alerts)
    .values({
      roomShortCode: OTHER_ROOM,
      senderId: probe.id,
      body: 'another room’s alert',
      createdAt: now
    })
    .run();
  db.insert(notes)
    .values({
      roomShortCode: OTHER_ROOM,
      name: 'another room’s note',
      position: 0,
      updatedById: probe.id,
      createdAt: now,
      updatedAt: now
    })
    .run();
  db.insert(sharedFiles)
    .values({
      roomShortCode: OTHER_ROOM,
      name: 'another-rooms-file.pdf',
      kind: 'file',
      url: '/uploads/another-rooms-file.pdf',
      contentType: 'application/pdf',
      size: 1,
      uploadedBy: probe.id,
      createdAt: now
    })
    .run();
  db.insert(polls)
    .values({
      roomShortCode: OTHER_ROOM,
      senderId: probe.id,
      question: 'another room’s poll',
      choicesJson: JSON.stringify(['a', 'b']),
      status: 'active',
      createdAt: now
    })
    .run();
  db.insert(savedPolls)
    .values({
      roomShortCode: OTHER_ROOM,
      question: 'another room’s saved poll',
      choicesJson: JSON.stringify(['a', 'b']),
      createdByUserId: probe.id,
      createdAt: now
    })
    .run();
});

async function pageDataFor(roomShortCode: string) {
  const data = await load({
    depends: () => {},
    locals: { user: probe, sessionId: `isolation-${roomShortCode}`, roomShortCode } as App.Locals,
    request: new Request('http://room.test/')
  } as unknown as LoadArgs);
  if (!data) throw new Error('load returned nothing');
  return data;
}

describe('a room created a moment ago', () => {
  it('shows no chat, alerts, notes, files or polls from any other room', async () => {
    const data = await pageDataFor(FRESH_ROOM);

    expect(data.messages, 'chat').toEqual([]);
    expect(data.alerts, 'alerts').toEqual([]);
    expect(data.notes, 'notes').toEqual([]);
    expect(data.files, 'files').toEqual([]);
    expect(data.savedPolls, 'saved polls').toEqual([]);
    expect(data.activePoll, 'active poll').toBeNull();
  });

  it('renders none of the capture fixture, which is match material and not content', async () => {
    /*
      The fixture holds 18 items and was served on every load, in every room. It belongs to the
      room it was captured from; anywhere else it is another room's chat history appearing in
      yours.
    */
    /*
      The fixture is merged INTO `messages` and `alerts` rather than exposed under its own key, so
      that is where its absence has to be asserted. Captured items carry NEGATIVE ids — that is how
      the server tells a fixture item from a row — which makes them countable.
    */
    const fresh = await pageDataFor(FRESH_ROOM);
    const capturedIn = (items: ReadonlyArray<{ id: number }>) => items.filter((i) => i.id < 0);
    expect(capturedIn(fresh.messages), 'captured chat outside the reference room').toEqual([]);
    expect(capturedIn(fresh.alerts), 'captured alerts outside the reference room').toEqual([]);

    // ...and it still renders in the room it came from, or the fidelity contracts have nothing to
    // measure against.
    const reference = await pageDataFor(OTHER_ROOM);
    expect(
      capturedIn(reference.messages).length + capturedIn(reference.alerts).length,
      'the reference room still gets all 18 captured items'
    ).toBe(18);
  });

  it('leaves the other room’s rows exactly where they were', async () => {
    // Isolation is not deletion: reading a fresh room must not disturb the room next door.
    await pageDataFor(FRESH_ROOM);

    const stillThere = db
      .select()
      .from(messages)
      .where(and(eq(messages.roomShortCode, OTHER_ROOM), eq(messages.senderId, probe.id)))
      .all();
    expect(stillThere.length).toBeGreaterThan(0);
  });
});
