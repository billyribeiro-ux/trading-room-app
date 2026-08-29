import { beforeAll, describe, expect, it, vi } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import {
  alertQuestions,
  alerts,
  messages,
  notes,
  polls,
  savedPolls,
  sharedFiles,
  users
} from '#lib/server/db/schema.js';

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
vi.mock('#lib/server/room-config-client.js', () => ({
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
  requestMobilePin: async () => '000000',
  /*
    ECHOES the short code rather than returning a fixed string, so the assertion below is about
    isolation and not about a stub. A playback token is room-scoped by design — `mintRoomReadToken`
    signs the short code and `decideIngestAuth` refuses a token presented for another room — and
    this is the file where "room A must not receive room B's anything" is proven. A constant here
    would make that assertion pass no matter what `load` did with the code.
  */
  requestStreamReadToken: async (shortCode: string) => ({
    mtxToken: `read-token-for-${shortCode}`,
    streamServerMTX: 'media.example.test',
    configured: true,
    expiresInSeconds: 43_200
  })
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
  const otherRoomAlert = db
    .insert(alerts)
    .values({
      roomShortCode: OTHER_ROOM,
      senderId: probe.id,
      body: 'another room’s alert',
      createdAt: now
    })
    .returning()
    .get();
  /*
    A question on that alert.

    `alert_questions` used to be the ONE room-owned table with no `room_short_code` column — it
    reached its room through `alert_id`, which is exactly why its read had no filter until
    2026-08-14 and every room received every room's questions. It HAS the column since 2026-08-28,
    because the join that supplied the room could not supply it for a question asked on a captured
    alert; `alert-log.ts` carries the reasoning. The row is stamped with the other room here, which
    is what makes this probe test the predicate rather than the join.
  */
  db.insert(alertQuestions)
    .values({
      alertId: otherRoomAlert.id,
      roomShortCode: OTHER_ROOM,
      senderId: probe.id,
      body: 'another room’s question',
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
    expect(data.alertQuestions, 'alert questions').toEqual([]);
    expect(data.notes, 'notes').toEqual([]);
    expect(data.files, 'files').toEqual([]);
    expect(data.savedPolls, 'saved polls').toEqual([]);
    expect(data.activePoll, 'active poll').toBeNull();
  });

  it('is given a playback token minted for ITSELF, not for whatever room asked last', async () => {
    /*
      The MediaMTX read token is a credential that authorises watching a room's video, and `load`
      mints one on every page load. It is scoped by the short code it is minted with — the real
      `mintRoomReadToken` signs that code and `decideIngestAuth` refuses a token presented against a
      different room — so the one thing that must never happen here is `load` passing a room code
      that is not the one being loaded.

      Asserted in both rooms and then asserted DIFFERENT, because a single-room check would pass
      just as happily if `load` ignored the argument entirely.
    */
    const fresh = await pageDataFor(FRESH_ROOM);
    const other = await pageDataFor(OTHER_ROOM);

    expect(fresh.streamRead?.mtxToken).toBe(`read-token-for-${FRESH_ROOM}`);
    expect(other.streamRead?.mtxToken).toBe(`read-token-for-${OTHER_ROOM}`);
    expect(fresh.streamRead?.mtxToken).not.toBe(other.streamRead?.mtxToken);
  });

  it('and the alert questions really were scoped, not merely absent', async () => {
    /*
      The direction this file warns about: emptiness that comes from being refused rather than from
      scoping is a test passing for the wrong reason. The question inserted in `beforeAll` must be
      visible in the room that OWNS it, or the assertion above proves nothing.

      This was a live cross-tenant leak until 2026-08-14. `alert_questions` has no room column, and
      the load selected the table with no WHERE at all — so question bodies, and the name, avatar
      and role of whoever asked, were serialised into every other room's SSR HTML. It is scoped now
      by joining through `alerts`, which is how the row reaches its room.
    */
    const owner = await pageDataFor(OTHER_ROOM);
    /* Annotated rather than inferred: `load`'s return reaches here through the `as unknown as`
       cast this file already uses to build its event, so the element type does not survive. The
       annotation states exactly the field this assertion depends on. */
    const bodies = owner.alertQuestions.map((question: { body: string }) => question.body);
    expect(bodies).toContain('another room’s question');
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
