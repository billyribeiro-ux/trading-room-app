import { randomBytes } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { getDb } from './db';
import { roomSettings, roomUsers, rooms } from './db/schema';
import { newRoomSettings } from '$lib/room-settings-profile';

/**
 * Everything that has to exist for a room to work, in one place.
 *
 * A room is three rows, not one, and every time they have been written by hand one has been
 * forgotten. `createRoom` shipped without the `room_users` row, which made `internal/mobile-pin`
 * answer 404 to the very account that had just created the room; it later shipped without the
 * settings row, so a new room resolved to `{}` and every feature was off. Registration now needs
 * the same three rows, and copying the block a third time is how the third omission happens.
 */

/*
  Anything that can run a query: the pool, or a transaction.

  The transaction type is DERIVED from `getDb()` rather than written out. Naming it by hand means
  restating Drizzle's schema generics, and getting one wrong produces an error about `never` that
  says nothing about the actual mistake.
*/
type Pool = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Pool['transaction']>[0]>[0];
type Db = Pool | Tx;

export interface ProvisionedRoom {
  id: number;
  shortCode: string;
  name: string;
}

/**
 * The next room code, from a sequence — never a code some other room has already worn.
 *
 * This used to pick a random 4-digit number and reject it only if a LIVE room held it, which meant
 * deleting a room returned its code to the pool. A room created afterwards could then be issued the
 * number of the room that had just been deleted, and was — reported directly by the owner. A room
 * code is what a member types to get in and what sits inside a launch URL, so reissuing one points
 * yesterday's link at somebody else's room.
 *
 * `room_short_code_seq` keeps counting regardless of what `rooms` contains, so `DELETE` recycles
 * nothing. Migration 0003 carries the reasoning for monotonic rather than random: every code
 * observed in the captures is 4 digits and the two that exist are TWO APART — 3625 and 3627 —
 * which is what a counter produces and is improbable from 9,000 random draws. Two samples are not
 * proof of a counter, and this does not claim they are; they are simply the only evidence there is,
 * and randomness had none behind it at all.
 *
 * The uniqueness check stays, doing a DIFFERENT job now: codes issued by the old random allocator
 * sit at arbitrary points in the range, so a sequence climbing past one has to step over it.
 * Bounded, so a dense range cannot hang a request.
 */
async function allocateShortCode(db: Db): Promise<string | null> {
  for (let attempt = 0; attempt < 20; attempt++) {
    const issued = await db.execute<{ code: string }>(sql`SELECT nextval('room_short_code_seq')::TEXT AS code`);
    const candidate = (issued as unknown as Array<{ code: string }>)[0]?.code;
    if (!candidate) return null;
    const [clash] = await db.select().from(rooms).where(eq(rooms.shortCode, candidate)).limit(1);
    if (!clash) return candidate;
  }
  return null;
}

export class NoRoomCodeAvailable extends Error {
  constructor() {
    super('Could not allocate a room code.');
    this.name = 'NoRoomCodeAvailable';
  }
}

/**
 * Creates a room, seats its owner in it, and seeds its settings.
 *
 * @throws {NoRoomCodeAvailable} when twenty candidate codes were all taken.
 */
export async function provisionRoom(
  db: Db,
  input: { accountId: number; ownerUserId: number; name?: string; now?: Date }
): Promise<ProvisionedRoom> {
  const now = input.now ?? new Date();

  const shortCode = await allocateShortCode(db);
  if (!shortCode) throw new NoRoomCodeAvailable();

  /*
    An unnamed room is called `Room <shortCode>`, which is what the reference calls one.

    Evidence, both dumps agreeing on the same room:
      ptr2.json `r.0.1.1.0.0.0.0.2.0.0.0.1.0.1` — the Sessions table's Name cell reads "Room 3625"
        while the Session ID cell beside it (`…1.0.0.0`) reads "3625".
      ptr1.json `r.0.1.1.0.1.0.0.1.0.0` — the manage page's Room Title editable renders the same
        "Room 3625".

    This replaces "<Owner>'s Room", which I made up. The owner's name appears nowhere in either
    capture's room title.
  */
  const name = input.name?.trim() || `Room ${shortCode}`;

  const [room] = await db
    .insert(rooms)
    /*
      `open`, which is the only state ever observed.

      The one room in the captures reads "open" in its State cell while holding 0 of 2 users
      (`logged-in-page:465`), so "open" is not a live-session indicator — an empty room is open. It
      is the resting state of a room that exists and is not archived.

      New rooms were created `closed`, which put a room the owner had just made into the one state
      the reference never shows, and the chip beside it said so. Nothing gates on this column: the
      account page's State chip is its only reader, and archiving is a separate column.
    */
    /*
      `publicId` is generated HERE, not left null.

      It is the id every link on the manage page is built from — the Room Link `/u/<publicId>`, the
      registration link `/r/<publicId>`, the app-pair link, the WordPress shortcode — and it is
      printed in the header beside the room code: `Manage Room id: 3627 ( 6a6529b318781e20ed81947d )`.

      Rooms created here left it null, so that header rendered empty parentheses and every link fell
      back to `String(room.id)` through the `?? ` in the manage loader. The room looked half-built,
      which is exactly how it was reported. Cloning already generated one (`rooms/[id]` clone action)
      — creation was the path that did not.

      12 random bytes as hex is 24 characters, the same shape as the reference's own
      `6a6529b318781e20ed81947d`, and the same call the clone action makes. `randomBytes`, not
      `Math.random`: this value appears in a URL that grants access to a room.

      `vanitySlug` and `uniqueSlug` stay null on purpose. The manage page renders the vanity field as
      the placeholder `[yournamehere]` until an owner picks one, and the unique link has its own
      Generate button — both are chosen later, not at creation.
    */
    .values({
      accountId: input.accountId,
      shortCode,
      name,
      state: 'open',
      publicId: randomBytes(12).toString('hex'),
      createdAt: now
    })
    .returning();

  /*
    The owner is a member of their own room, at role 0.

    Three separate pieces of this repository presume that row exists: `roleLabel` maps `role === 0`
    to "Owner", `applyManyOpcode` skips it so bulk actions cannot touch the owner, and
    `shouldRemoveAsNonPresenter` preserves "only the owner and a true presenter". None of them could
    fire while the row was missing.
  */
  await db
    .insert(roomUsers)
    .values({ roomId: room.id, userId: input.ownerUserId, role: 0, createdAt: now })
    .onConflictDoNothing();

  /*
    Seed with every feature on.

    A room with no settings row resolves to `{}`, which is every feature OFF — the emptiest possible
    product for somebody evaluating it. The reference's own captured values are no better as a
    starting point: that tenant is its free sample, configured to show as little as possible, which
    is why the generated schema labels `captured` "Evidence, not a default".

    A seed, not a lock: every key is editable afterwards, and editing the profile later affects only
    rooms created after the edit.
  */
  await db.insert(roomSettings).values({
    roomId: room.id,
    settingsJson: JSON.stringify(newRoomSettings()),
    updatedAt: now
  });

  return { id: room.id, shortCode, name };
}

/*
  `firstRoomName` is gone.

  It returned "<Owner>'s Room", which I invented — the owner's name appears in neither capture's
  room title. The reference names a room `Room <shortCode>`, and `provisionRoom` now does that
  itself when no name is supplied, because the code is only known once it has been allocated.
*/
