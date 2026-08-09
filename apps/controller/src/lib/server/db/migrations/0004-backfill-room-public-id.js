/**
 * Every room gets a `public_id`, including the ones created before creation generated one.
 *
 * ## What was broken
 *
 * `public_id` is the id every link on the manage page is built from — `/u/<publicId>`,
 * `/r/<publicId>`, the app-pair link, the WordPress shortcode — and it is printed in the page
 * header beside the room code:
 *
 *     Manage Room id: 3627  ( 6a6529b318781e20ed81947d )
 *
 * `provisionRoom` never set it, so rooms created through New Room and through registration carried
 * NULL. The header rendered empty parentheses and every link silently fell back to the numeric row
 * id through the `??` in the manage loader. The room looked half-built, and was reported that way.
 * The clone action had always generated one; creation was the path that did not.
 *
 * Fixing the code fixes rooms made from now on. This fixes the ones that already exist.
 *
 * ## Its relationship to `backfillPublicIds`
 *
 * `ensureDatabase` already calls a boot-time `backfillPublicIds` that does the same UPDATE, so the
 * statement below overlaps it and will usually find nothing. Stated rather than left as a
 * coincidence: that helper only runs at COLD START, which is exactly why the reported room had a
 * NULL — it was created while the server was already up, and nothing filled it in until the next
 * restart. Generating the id at creation (`provision-room.ts`) is the actual fix; this migration
 * makes the repair a recorded, once-only event instead of something that depends on a reboot
 * happening, and it is self-contained if that helper is ever removed.
 *
 * The UNIQUE INDEX has no counterpart anywhere and is the part of this migration that is new.
 *
 * ## Why `gen_random_bytes` and not `md5(random())`
 *
 * This value appears in a URL that grants access to a room, so it is generated from a CSPRNG.
 * `pgcrypto` provides it; `random()` is a seeded PRNG whose output is predictable from prior values
 * and has no place in an access-bearing identifier.
 *
 * 12 bytes as hex is 24 characters — the same shape as the reference's own
 * `6a6529b318781e20ed81947d`, and the same width `randomBytes(12).toString('hex')` produces in
 * `provision-room.ts`, so backfilled rooms are indistinguishable from new ones.
 *
 * ## Why the unique index
 *
 * Two rooms sharing a `public_id` would make one room's link open the other's. Nothing enforced
 * that. The index is created AFTER the backfill so it cannot fail on the NULLs it exists to
 * prevent, and Postgres permits multiple NULLs in a unique index anyway — which is precisely why
 * the absence went unnoticed for this long.
 */
export const sql = `
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  UPDATE rooms
     SET public_id = encode(gen_random_bytes(12), 'hex')
   WHERE public_id IS NULL;

  CREATE UNIQUE INDEX IF NOT EXISTS rooms_public_id_idx ON rooms (public_id);
`;
