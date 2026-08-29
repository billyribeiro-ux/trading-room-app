import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { ROOM_JWT_SECRET } from '$app/env/private';
import { getDb } from '#lib/server/db/index.js';
import { ACCOUNT_ACTIVE, accounts, badges, roomUsers, rooms, users } from '#lib/server/db/schema.js';
import { parseBadgeIds, readPermissions, readSettings } from '#lib/server/rooms.js';
import { resolveRoomConfig, roomVisibleConfig } from '#lib/room-config.js';
import { isRoomPresenter } from '#lib/room-member-role.js';
import { createHash } from 'node:crypto';
import { verifyConfigReadToken } from '#lib/server/room-handoff.js';
import type { RequestHandler } from './$types';

/**
 * `GET /internal/room-config/<shortCode>` — what the room is allowed to know about itself.
 *
 * ## Why this exists
 *
 * The room application had no way to be told anything, so it invented what it could not be told:
 * a hardcoded `sessData` literal standing in for 268 per-room settings, and four account columns
 * standing in for per-room membership. Both are the same defect — a global constant where the
 * controller owns per-room state.
 *
 * This is the read that removes it. Precedence is decided by `resolveRoomConfig()` in
 * `#lib/room-config` — already documented there as "the single seam between the controller and the
 * room" — and nothing is recomputed here.
 *
 * ## What it deliberately does NOT return
 *
 * `resolveRoomConfig()` resolves all 269 settings, and a configured room's set includes
 * `webinarPW`, `ssoJWTSecret`, `apiSecret`, `s3KeySecret`, `twillioApiToken` and a dozen more
 * credentials. The room serialises its config into SSR HTML on every load, so returning them would
 * put a room's secrets in every viewer's page source — the same defect the room's own
 * `page-load-contract.test.ts` exists to catch for a password hash.
 *
 * `roomVisibleConfig()` narrows the response to an explicit allow-list of settings the room has a
 * consumer for. It fails closed: a setting added tomorrow is invisible here until somebody decides
 * otherwise.
 *
 * ## Why not the public Sessions API
 *
 * `src/lib/content/api-docs.ts` documents nine endpoints for external integrators — users, stats,
 * logs. None of them expose room configuration, and adding one would put a room's passwords,
 * secrets and webhook URLs on a surface authenticated by a customer-visible API key.
 *
 * ## Why it 503s in production, correctly
 *
 * `decideControlPlaneRequest` allows only the four marketing routes unless
 * `CONTROL_PLANE_MODE=postgres`. A deployment that has not been given a database therefore serves
 * the marketing pages and 503s this, which is the honest answer to "what is this room configured
 * like" when there is nowhere to read that from.
 */
export const GET: RequestHandler = async ({ params, request, url }) => {
  const secret = ROOM_JWT_SECRET;
  if (!secret) {
    // Same posture as `launch/[id]`: fail loudly rather than accept an unauthenticated read, and
    // do not name the private configuration variable in a response body.
    error(500, 'Room configuration is not available.');
  }

  const presented = request.headers.get('authorization')?.replace(/^Bearer /, '');
  const verified = verifyConfigReadToken(secret, params.code, presented);
  if (!verified.ok) {
    /*
      One status and one message for all three failure reasons.

      Distinguishing "stale" from "bad signature" tells an attacker which half of the credential
      they got right. The reason is computed for the log line, not for the caller.
    */
    console.warn('[room-config] rejected', { code: params.code, reason: verified.reason });
    error(401, 'Unauthorized.');
  }

  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.code)).limit(1);
  if (!room) error(404, 'Room not found');

  /*
    A suspended account's rooms stop serving.

    This is the third and last path that can produce an identity, and the only one the ROOM uses.
    Without it, suspension would lock the owner out of the controller while every room they had
    already launched carried on indefinitely — which is not a suspension, it is a locked door on a
    building with the windows open.

    404, not 403: to an unauthenticated observer a suspended room is indistinguishable from one that
    never existed, and the room application's own `RoomConfigUnavailable` path already fails loudly
    rather than serving defaults.
  */
  const [account] = await getDb()
    .select({ status: accounts.status })
    .from(accounts)
    .where(eq(accounts.id, room.accountId))
    .limit(1);
  if (!account || account.status !== ACCOUNT_ACTIVE) {
    console.warn('[room-config] refused: account not active', {
      code: params.code,
      status: account?.status ?? 'missing'
    });
    error(404, 'Room not found');
  }

  const roomSettings = await readSettings(room.id);
  const resolved = roomVisibleConfig(roomSettings);

  /*
    The member, when the caller names one.

    `email` rather than an id, because the room knows who arrived from the handoff token and the
    two databases do not share a key space. An email that is not a member of this room is not an
    error — it is a guest, and the room needs to render them as one rather than 404.
  */
  const email = url.searchParams.get('email')?.trim().toLowerCase();
  /* Loaded once and used twice — the membership lookup below and the badge map further down. This
     query was already fetching every member of the room in order to `.find()` one of them. */
  const roomMembers = await getDb()
    .select({ roomUser: roomUsers, user: users })
    .from(roomUsers)
    .innerJoin(users, eq(roomUsers.userId, users.id))
    .where(eq(roomUsers.roomId, room.id));

  const membership = email ? roomMembers.find((row) => row.user.email.trim().toLowerCase() === email) : undefined;

  /*
    BADGES — the two halves the room needs, and neither is the whole table.

    The reference keeps them in the same two shapes: `sessData.badgesH`, a hash of badge id ->
    definition, and `msg.b`, the ids carried on each message
    (`app-st-message.full.js` byte 28120). This repository's two databases do not share a key
    space, so the per-member half is keyed by **md5(email)** — the same
    `createHash('md5').update(email.trim().toLowerCase())` the room computes in
    `hashEmail()` and already carries on every message as `senderEmailHash`.

    Hashed rather than plain: the room needs to MATCH a sender, not to learn anybody's address, and
    this response is serialised into SSR HTML on every load. A member list of raw emails crossing
    that boundary is the kind of thing `ROOM_VISIBLE_SETTINGS` exists to prevent for settings, and
    the same reasoning applies to people.

    Only members WITH badges appear. A room where nobody has one sends `{}`, not a map of every
    member to an empty array — the payload is bounded by badge assignments rather than by roster
    size.
  */
  const accountBadges = await getDb().select().from(badges).where(eq(badges.accountId, room.accountId));
  const badgeDefinitions = Object.fromEntries(
    accountBadges.map((badge) => [
      badge.id,
      {
        text: badge.label,
        color: badge.textColor,
        backgroundColor: badge.backgroundColor,
        /* `imgURL` upstream. Null becomes undefined so the room's `badge.imageUrl ? … : …` branch
           reads the same for "no image" as for a badge that never had one. */
        imageUrl: badge.imageUrl ?? undefined,
        /*
          `darkTheme` holds the ID of a variant badge, not a boolean — proven at the render site by
          `r.darkTheme && 'darkTheme' === preferences.theme && (r = badgesH[r.darkTheme])`.

          THE WIRE NAME IS THE REFERENCE'S; THE COLUMN IS OURS. It reads `darkTheme` because that is
          what the room's consumer matches (`feeds.svelte.ts` `definitions[String(badge.darkTheme)]`),
          and it is sourced from `darkThemeBadgeId` because that is the column that actually holds an
          id. `badges.darkTheme` is the SUPERSEDED boolean kept only because migrations are
          forward-only — see migration `0013-badge-dark-theme-badge-id.js`.

          THIS LINE READ `typeof badge.darkTheme === 'number' ? … : undefined` UNTIL 2026-08-17, AND
          THAT WAS DEAD. `badges.darkTheme` is `boolean('dark_theme')`, so `typeof` was never
          `'number'`, so the field was ALWAYS undefined and the room's dark-variant swap could never
          fire — a feature written, migrated, given a picker on the account page, and never rendered.
          It was honest when written (migration `0013` did not exist yet) and was simply not revisited
          when the column landed. `null` becomes `undefined` for the same reason `imageUrl` above
          does: the room gates on `typeof badge.darkTheme === 'number'` (`feeds.svelte.ts`), which
          must read the same for "no variant set" as for a badge that never had one. `??` and not
          `||`, because `||` would also discard a legitimate id — badge ids are a serial sequence, so
          0 is not one today, but a gate that depends on that is a gate waiting to be wrong.
        */
        darkTheme: badge.darkThemeBadgeId ?? undefined
      }
    ])
  );

  const memberBadges: Record<string, number[]> = {};
  for (const row of roomMembers) {
    const ids = parseBadgeIds(row.roomUser.badgesJson);
    if (ids.length === 0) continue;
    const hash = createHash('md5').update(row.user.email.trim().toLowerCase()).digest('hex');
    memberBadges[hash] = ids;
  }

  /*
    "Play chat message sound for" — the SETTING STAYS HERE; only the hashes travel.

    The reference stores a comma-separated list of member EMAIL ADDRESSES and hashes them in the
    browser on `globalsLoaded` (bundle byte 2,595,225):

      sessData.playChatMessageSoundFor.replace(" ", "").split(",")
        -> hashEmail(each) -> globals.playChatMessageSoundFor

    …then compares that list against `e.avt`, the sender's email HASH, on every arriving message
    (byte 1,431,949). So the raw addresses are shipped to every member's browser to be turned into
    hashes the room could have been given directly.

    **They are not shipped here.** `playChatMessageSoundFor` is NOT on `ROOM_VISIBLE_SETTINGS`; this
    endpoint hashes the list and sends the digests, which is the only form the room's comparison
    actually needs. Same reasoning, same `md5(email.trim().toLowerCase())` and same precedent as
    `memberBadges` directly above: the room needs to MATCH a member, not to learn anybody's address,
    and this response is serialised into SSR HTML on every load.

    `.split(/[\s,]+/)` rather than the reference's `.replace(" ", "").split(",")`. **That is a fix,
    and it is a one-character-class fix for a real defect**: `String.replace` with a STRING pattern
    replaces the FIRST occurrence only, so upstream a list of `a@example.test, b@example.test, c@example.test` loses the
    space before `b` and keeps the one before `c`, and ` c@example.test` hashes to something no sender
    will ever match. MEASURED, not reasoned: the first two entries of any list are always fine and
    every entry from the THIRD on is dead, so a five-address list loses three of five.
  */
  /*
    READ FROM THE UNFILTERED CONFIG, AND THAT IS THE FIX RATHER THAN A SHORTCUT.

    This used to read `resolved.values.playChatMessageSoundFor` — and `resolved` is
    `roomVisibleConfig(...)`, which projects onto `ROOM_VISIBLE_SETTINGS`. `playChatMessageSoundFor`
    is deliberately NOT on that list, precisely because the raw addresses must never cross. So the
    read was permanently `undefined`, the list was permanently empty, and **"play chat sound for
    these members" has never made a sound for anybody.**

    It failed CLOSED, which is why nothing noticed: no address leaked, no error was thrown, and the
    room received a well-formed empty array. That is the quiet half of a dead feature — the loud half
    is a control an owner types addresses into that does nothing.

    Found by a security review of this branch, filed as a correctness note rather than a
    vulnerability, and verified here before being believed: `playChatMessageSoundFor` occurs zero
    times in `room-config.ts`, so it cannot be on the allow-list.

    `resolveRoomConfig` is called a SECOND time rather than widening `roomVisibleConfig` to return
    unfiltered values. Two passes over a settings object cost nothing beside the database reads above,
    and the alternative — a function whose job is to narrow, handing back the un-narrowed set — is the
    exact shape that turns one careless spread into the leak the projection exists to prevent. The
    allow-list stays in one place and keeps one meaning.

    The privacy property is unchanged and is the whole point: only md5 hashes leave this function.
  */
  const chatSoundForEmailHashes = String(resolveRoomConfig(roomSettings).values.playChatMessageSoundFor ?? '')
    .split(/[\s,]+/)
    .map((address) => address.trim().toLowerCase())
    .filter((address) => address.length > 0)
    .map((address) => createHash('md5').update(address).digest('hex'));

  return json({
    badges: { definitions: badgeDefinitions, byEmailHash: memberBadges },
    /* Derived from `playChatMessageSoundFor`, which itself never crosses. See above. */
    chatSoundForEmailHashes: [...new Set(chatSoundForEmailHashes)],
    room: {
      shortCode: room.shortCode,
      name: room.name,
      state: room.state,
      logoUrl: room.logoUrl,
      publicId: room.publicId,
      maxUsers: room.maxUsers
    },
    /*
      The effective configuration after precedence, narrowed to what the room may see. `locked`
      rides along because a policy setting the owner is enforcing must not render in the room as a
      toggle the user can flip and watch snap back.
    */
    settings: resolved.values,
    locked: resolved.locked,
    /*
      The member, translated once here so the room never has to know the numeric model.

      `rooms.ts` reads it off the reference's own row template:
        0 Owner · 1 Presenter (!nonPresenter) · 1 Admin (nonPresenter) · 2 Participant
        · 3 CHAT MUTED · 4 BANNED
      There is no role 5, and Trial is not a role — it is the `isFreeTrial` flag behind the TRIAL
      badge. `schema.ts`'s own docblock still says "5 admin · 6 trial"; `rooms.ts` is the one that
      was corrected against the capture, and it is the one followed here.
    */
    member: membership
      ? {
          displayName: membership.user.displayName,
          email: membership.user.email,
          role: membership.roomUser.role,
          nonPresenter: membership.roomUser.nonPresenter,
          /*
            `isP` — presenter authority in the room.

            The owner counts. `shouldRemoveAsNonPresenter` is `role !== 0 && !isRoomPresenter(m)`,
            documented as "preserves only the owner and a true presenter", and `applyManyOpcode`
            skips `role === 0` outright. Both group the owner with presenters, so a room that
            answered `isP: false` for the account that owns it would drop its owner in as a
            participant.
          */
          isP: membership.roomUser.role === 0 || isRoomPresenter(membership.roomUser),
          /*
            Role 1 WITH `nonPresenter` — the reference's "Admin". A distinct global in the room
            (`globals.isNonPresenterAdmin`, initialised alongside `isPresenter`), and distinct from
            the `hasAdminChat` permission below, which any role may hold.
          */
          isNonPresenterAdmin: membership.roomUser.role === 1 && membership.roomUser.nonPresenter,
          /** `r.isFT`. Per room, which is why the room may not keep it on an account. */
          isFT: membership.roomUser.isFreeTrial,
          denyArchivesAccess: membership.roomUser.denyArchivesAccess,
          restrictPmUser: membership.roomUser.restrictPmUser,
          /*
            Derived from the role, not from the legacy booleans. `applyUserOpcode` writes both, but
            the roles are what the reference renders and the columns predate that correction —
            reading the columns would trust the half that can go stale.
          */
          muted: membership.roomUser.role === 3,
          banned: membership.roomUser.role === 4,
          /** hasMic · hasScreen · hasCam · hasAdminChat · canEditNotes. */
          permissions: readPermissions(membership.roomUser.permissionsJson)
        }
      : null
  });
};
