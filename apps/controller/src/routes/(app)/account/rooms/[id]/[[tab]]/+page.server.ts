import { error, fail, redirect } from '@sveltejs/kit';
import { randomBytes } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { PUBLIC_SITE_ORIGIN } from '$app/env/public';
import { ROOM_BASE_URL, ROOM_JWT_SECRET } from '$app/env/private';
import { getDb } from '$lib/server/db';
import { badges, rooms } from '$lib/server/db/schema';
import { requireOwnedRoom, requireUser } from '$lib/server/auth';
import {
  MANY_OPCODES,
  PERMISSION_KEYS,
  USER_OPCODES,
  applyManyOpcode,
  applyUserOpcode,
  listRoomUsers,
  readPermissions,
  readSettings,
  savePermissions,
  saveSetting,
  saveTextList,
  parseBadgeIds,
  toggleUserBadge,
  setUserRestrictPm,
  setInviteStatus,
  setUserNote,
  renameRoomUser,
  setRoomUserPassword,
  issueMobilePairCode,
  listPushTokens,
  listFcmRegistrations,
  sendTestPushToMember,
  setNotificationsState,
  resetPushTokens,
  writeSettings,
  deleteRoomCascade,
  inviteRoomUser,
  removeNonPresenters,
  removeRoomUser,
  clearUserBadges,
  removeFreeTrialUsers,
  setBadgeForUsers,
  type ManyOpcode,
  type PermissionKey,
  type UserOpcode
} from '$lib/server/rooms';
import { FcmCredentialInvalid, FcmNotConfigured, FcmUnreachable } from '$lib/server/fcm';
import { MailEnvMissing, sendWebinarReminderToRoom, sendWelcomeEmailToMember } from '$lib/server/member-email';
import { MailDeliveryFailed } from '$lib/server/mail';
import { launchHref } from '$lib/server/room-handoff';
import { ROOM_SETTINGS, ROOM_SETTING_BY_NAME } from '$lib/room-settings-schema';
import { resolveRoomConfig } from '$lib/room-config';
import { isRoomPresenter, isRoomTrial } from '$lib/room-member-role';
import { FEATURES, resolveFeatureReadiness, type FeatureId } from '$lib/features';
import { resolveAccountEntitlements } from '$lib/server/account-entitlements';
import { sanitizeHtml } from '$lib/server/sanitize-html';
import type { Actions, PageServerLoad } from './$types';

/**
 * The reference's tab strip, transcribed from `must-match/important:2-25` — the `ul.nav.nav-tabs`
 * in full. SIX `<li>`, in this order, with these exact labels:
 *
 *     Users · Text List · Branding (Logo / Landing Page) · SSO Setup · User Stats · Settings
 *
 * Two are conditional there and are here too: Text List is `ng-show="sess.twillioApiToken"` and
 * SSO Setup is `ng-show="sess.authMode=='sso'"`, which is why the captured page shows only four.
 * Note that those two are still IN the strip's markup, carrying `ng-hide` — the reference hides a
 * conditional tab rather than omitting it, and so does ours.
 *
 * ## `strip: false` — Marketplace is NOT one of the reference's tabs
 *
 * It used to be listed here as a seventh, while the comment above said six. It is not in the
 * captured strip, and its absence is real rather than a rendering condition: the two conditional
 * tabs prove that a hidden tab still appears as an `ng-hide` `<li>`, and there are no
 * `<!-- ngIf: … -->` markers anywhere in that `<ul>` either, so nothing was stripped from it.
 *
 * The Marketplace BUTTONS are evidenced — `ng-click="manageMarketplaceSession(s._id, s)"` on the
 * account page's session row (`logged-in-page:476`) and its counterpart here. What is NOT evidenced
 * is where that function goes; it is uncaptured. So the pane stays reachable by URL and the buttons
 * keep working, while the strip matches the capture exactly. Recorded in docs/OUTSTANDING.md rather
 * than resolved by guessing.
 */
const ALL_TABS = [
  { id: 'users', label: 'Users', strip: true },
  { id: 'text-list', label: 'Text List', strip: true },
  { id: 'branding', label: 'Branding (Logo / Landing Page)', strip: true },
  { id: 'sso', label: 'SSO Setup', strip: true },
  { id: 'stats', label: 'User Stats', strip: true },
  { id: 'settings', label: 'Settings', strip: true },
  { id: 'marketplace', label: 'Marketplace', strip: false }
] as const;

type Settings = Record<string, string | number | boolean | null | undefined>;

/**
 * The origin every link on this page is built from.
 *
 * This was the literal `https://protradingroom.example`, so an owner who created a room and wanted
 * to drop it into their own service was handed a room link, a vanity link, a unique link, a
 * registration link and an app-pair link on a domain that does not exist — with nowhere to set the
 * real one. That is the one thing this page exists to give them.
 *
 * `PUBLIC_SITE_ORIGIN` when configured; otherwise the origin of the request being served, which is
 * right in development and right behind a single hostname. Never a placeholder: a link that looks
 * real and is not is worse than one that is obviously local.
 */
function siteOrigin(url: URL): string {
  return PUBLIC_SITE_ORIGIN?.trim() || url.origin;
}

export const load: PageServerLoad = async ({ params, locals, url }) => {
  const ORIGIN = siteOrigin(url);
  const user = requireUser(locals);
  // Addressed by short code, not by primary key — see `ownedRoom`.
  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, params.id)).limit(1);
  requireOwnedRoom(locals, room);
  if (!room) error(404, 'Room not found');

  const settings = (await readSettings(room.id)) as Settings;
  const resolved = resolveRoomConfig(settings);
  const entitlements = resolveAccountEntitlements({ accountId: user.accountId });
  const features = {
    'text-list': entitlements['text-list'],
    sso: entitlements.sso,
    mobile: entitlements.mobile,
    marketplace: entitlements.marketplace
  } satisfies Record<FeatureId, boolean>;
  const featureReadiness = resolveFeatureReadiness(settings);

  /**
   * All implemented tabs are visible during the implementation phase. The
   * booleans still come from one server-only policy so persisted RBAC/ABAC can
   * replace the all-enabled policy without scattering conditions through UI.
   */
  const tabs = ALL_TABS.map(({ id, label, strip }) => ({
    id,
    label,
    /** whether it appears in `ul.nav.nav-tabs` at all — see the note on Marketplace above */
    strip,
    visible:
      id === 'text-list'
        ? features['text-list']
        : id === 'sso'
          ? features.sso
          : id === 'marketplace'
            ? features.marketplace
            : true
  }));

  /*
    The tab is a PATH SEGMENT — `/account/rooms/1001/marketplace`, not `…/1001/marketplace`.

    A tab here selects which pane of the room you are looking at, and a pane is a resource, not a
    filter over one. `?tab=` said otherwise: it read as an option bolted onto a page rather than a
    place, and it is what made the URL look unfinished.

    `[[tab]]` is optional, so `/account/rooms/1001` still resolves and lands on Users — the same
    default a missing `?tab=` had. `filter` and `q` stay in the query below, deliberately: those
    genuinely ARE filters over the collection this pane shows, which is what a query string is for.

    An unknown segment 404s rather than quietly showing Users. `/nonsense` silently falling back
    was tolerable when the tab was an option; a path that resolves to something other than what it
    names is a different thing, and the honest answer for a URL nobody issued is that it does not
    exist.
  */
  const requested = params.tab ?? 'users';
  if (!tabs.some((t) => t.id === requested)) error(404, 'No such tab');
  const tab = requested;

  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase();
  const filter = url.searchParams.get('filter');
  let users = (await listRoomUsers(room.id)).map((u) => ({
    ...u,
    permissions: readPermissions(u.permissionsJson),
    /** badge ids assigned to this member, for the row's Badges submenu */
    badges: parseBadgeIds(u.badgesJson),
    /**
     * The reference leads each row with a `thumb24` avatar resolved by its own
     * `gravatar-src-once="user.email"` directive:
     *
     *     <img gravatar-src-once="user.email " style="margin-right:5px " class="thumb24 ">
     *
     * This was held at `null` pending the owner's decision, because building the URL tells
     * Automattic that the hash of a given address was viewed. That is a real cost and it was not
     * mine to accept silently — the full trade-off is in `$lib/server/gravatar`.
     *
     * STILL null, and not for want of trying. Wiring `gravatarUrl(u.email)` here was blocked as
     * data exfiltration: it sends a hash of every member's real address to a third party. The
     * owner has asked for it twice and this app already does the same thing on the room login page
     * (`(public)/session/[code]` builds the identical MD5 URL), so the inconsistency is real — but
     * it needs the owner's explicit go-ahead on the record, not my inference from a complaint that
     * the avatar looks wrong.
     *
     * The `<img class="thumb24">` element itself IS rendered, so the row's shape matches the
     * capture; what differs is the src, which falls back to the local placeholder.
     */
    avatarUrl: null as string | null
  }));
  if (q) {
    users = users.filter((u) => u.displayName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }
  if (filter === 'banned') users = users.filter((u) => u.banned);
  else if (filter === 'presenters') users = users.filter(isRoomPresenter);
  else if (filter === 'trials') users = users.filter(isRoomTrial);
  /* the reference's `loadMutedUsers()` — role 3 is chat-muted, and `muted` is the flag the row
     menu's MUTE/UNMUTE opcodes set, so a member can arrive at it either way */
  else if (filter === 'muted') users = users.filter((u) => u.muted || u.role === 3);

  /*
     `mobile`, `non-mobile` and `marketplace` are in the reference's menu and are NOT filtered here.

     Those three used to fall through this chain and return every member, so the list said "Show
     Mobile" and showed everyone — a silent wrong answer. The predicate behind `loadMobileUsers()`
     and `loadMarketplaceUsers()` is server-side in the reference and appears in no capture, and
     `room_users` has three columns that could each plausibly mean "mobile" (`mobilePairCode`,
     `pushTokensJson`, `notificationsState`). Picking one would be inventing the semantics.

     So the request is reported as unsupported instead of being quietly ignored. Recorded in
     TODO.md under "Evidence gaps".
  */
  const unsupportedFilter = filter && !['banned', 'presenters', 'trials', 'muted'].includes(filter) ? filter : null;

  const publicId = room.publicId ?? String(room.id);

  return {
    room,
    /** the reference's `ng-href` on Launch — the whole handoff URL, resolved at page load */
    launchUrl: launchHref(ROOM_BASE_URL, ROOM_JWT_SECRET, room.shortCode, {
      name: user.displayName,
      email: user.email,
      id: String(user.id)
    }),
    tab,
    tabs,
    entitlements,
    settings,
    // Re-sanitize persisted HTML at the read boundary. This is the only value
    // branded for the reviewed client-side HTML sink.
    landingHtml: sanitizeHtml(String(settings.description ?? '')),
    users,
    /** a filter the menu offers but this loader cannot honour — shown, never silently ignored */
    unsupportedFilter,
    /** the User Stats table — real logins only, never invented rows */
    stats: users.filter((u) => u.lastLoginAt).sort((a, b) => Number(b.lastLoginAt) - Number(a.lastLoginAt)),
    links: {
      room: `${ORIGIN}/u/${publicId}`,
      vanity: room.vanitySlug ? `${ORIGIN}/room/${room.vanitySlug}` : `${ORIGIN}/room/[yournamehere]`,
      unique: room.uniqueSlug ? `${ORIGIN}/room/${room.uniqueSlug}` : `${ORIGIN}/room/[youruniquelinkhere]`,
      /** `/r/<id>` — the registration form, for the registrationA/M auth modes */
      registration: `${ORIGIN}/r/${publicId}`,
      /** `ng-show="sess.hasAppPairLink"` */
      appPair: `${ORIGIN}/room/${publicId}`,
      logo: room.logoUrl
    },
    disableMarketplace: !entitlements.marketplace,
    canClone: entitlements['clone-room'],
    canDelete: entitlements['delete-room'],
    isClonedRoom: room.clonedFromId !== null,
    permissionKeys: PERMISSION_KEYS,
    features,
    featureReadiness,
    featureDefs: FEATURES,
    /** other rooms on this account — for "Load Settings From Room" */
    otherRooms: (
      await getDb()
        .select({ id: rooms.id, shortCode: rooms.shortCode, name: rooms.name })
        .from(rooms)
        .where(eq(rooms.accountId, user.accountId))
    ).filter((r) => r.id !== room.id),
    /**
     * The WordPress shortcode, built from the room's public id exactly as the
     * reference builds it. Not a stored setting — it is derived, so it is
     * computed rather than kept in the settings blob where it could go stale.
     */
    wordpressShortcode: `[protradingroom room='${publicId}' key='' link_text='Enter Room' mode='urlv3']`,
    /** the account's badges, for the row menu's Badges submenu */
    badges: await getDb().select().from(badges).where(eq(badges.accountId, user.accountId)),
    // Sent once, used by every tab that renders fields.
    schema: ROOM_SETTINGS,
    /** the two fields the room form edits directly, looked up by name */
    fieldByName: {
      name: ROOM_SETTING_BY_NAME.get('name')!,
      authMode: ROOM_SETTING_BY_NAME.get('authMode')!,
      webinarDate: ROOM_SETTING_BY_NAME.get('webinarDate')!
    },
    unwiredCount: resolved.unwired.size
  };
};

/**
 * Resolves the URL's room identifier to a row, and checks ownership.
 *
 * ## The param is the SHORT CODE, not the database id
 *
 * `/account/rooms/1` was the primary key, and it read as a toy: the first room any account creates
 * is `1`, which advertises the row count and belongs to the database rather than to the product.
 * The short code is the room's own identity — it is what every surface already calls it. The
 * reference's manage header reads `Manage Room id: 3627 ( 6a6529b318781e20ed81947d )`, the Sessions
 * table lists Session ID `3625`, and `provisionRoom` names a new room `Room <shortCode>`.
 *
 * `rooms.short_code` is `NOT NULL` with a unique index (`rooms_short_code_idx`), so this is a
 * single indexed lookup — the same cost as the primary key it replaces.
 *
 * ## Why old numeric-id links are NOT accepted as a fallback
 *
 * Both are digit strings, so "try the id, then the short code" is ambiguous: nothing stops one
 * room's short code equalling another room's id, and the ambiguity would resolve silently to the
 * wrong room. A 404 is the honest answer. This is a days-old deployment whose rooms have four-digit
 * codes and single-digit ids, so the links that break are ones nobody has bookmarked.
 */
async function ownedRoom(locals: App.Locals, shortCode: string) {
  const [room] = await getDb().select().from(rooms).where(eq(rooms.shortCode, shortCode)).limit(1);
  requireOwnedRoom(locals, room);
  return room!;
}

async function ownedRoomId(locals: App.Locals, shortCode: string) {
  return (await ownedRoom(locals, shortCode)).id;
}

/**
 * Every room the SAME ACCOUNT owns as the room being managed.
 *
 * The account id is read off the room `ownedRoomId` has already checked, never off the request, so
 * the two "apply to the entire account" buttons in the DON'T TOUCH block cannot be steered at
 * another tenant's rooms by anything in the form. This is the rule `resolveBulkTargets` follows for
 * the Users tab's "Apply to all rooms?", restated here because these two are the highest
 * blast-radius controls on the page: they write to every room the account has.
 */
async function accountRoomIds(roomId: number) {
  const [room] = await getDb().select({ accountId: rooms.accountId }).from(rooms).where(eq(rooms.id, roomId)).limit(1);
  if (!room) error(404, 'Room not found');
  const owned = await getDb().select({ id: rooms.id }).from(rooms).where(eq(rooms.accountId, room.accountId));
  return owned.map((r) => r.id);
}

/**
 * The Repeater List as the reference stores it — ONE comma-separated string, e.g.
 * `localhost|127.0.0.1,somehostname|10.10.10.10`. Add Server and Remove Server edit one entry of
 * it, so both need the same split, and both need it to agree.
 */
function parseRelays(value: unknown): string[] {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Turns a thrown reason into a message the page can render, at the status that reason deserves.
 *
 * A `fail()` rather than a rethrow, because these four actions are posted by progressively-enhanced
 * forms: an uncaught throw becomes SvelteKit's error page, and the one thing the operator needed —
 * WHICH environment variable is unset — is exactly what that page does not say.
 *
 * The four statuses are distinct on purpose. 503 means "this deployment is missing a credential and
 * nothing you do in the browser will help"; 502 means "the provider is there and would not play";
 * 404 means the member is not in this room; 400 is everything the caller can fix.
 */
function failFor(e: unknown) {
  const message = e instanceof Error ? e.message : 'Could not complete that action.';
  if (e instanceof FcmNotConfigured || e instanceof FcmCredentialInvalid || e instanceof MailEnvMissing) {
    return fail(503, { message });
  }
  if (e instanceof FcmUnreachable || e instanceof MailDeliveryFailed) return fail(502, { message });
  if (message === 'no such member in this room') return fail(404, { message });
  return fail(400, { message });
}

export const actions: Actions = {
  /** `resetMaxCount()` — clears the room's high-water mark, not its members. */
  resetMaxCount: async ({ params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    await getDb().update(rooms).set({ maxUsers: 0 }).where(eq(rooms.id, roomId));
    return { resetCounts: true };
  },

  /**
   * `cloneRoom(sess._id)` — a new room with this one's settings and a fresh
   * short code, public id and empty membership. `clonedFromId` is what makes
   * Delete Room appear on the copy and stay hidden on the original.
   */
  cloneRoom: async ({ params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const [source] = await getDb().select().from(rooms).where(eq(rooms.id, roomId)).limit(1);

    let shortCode = '';
    for (let i = 0; i < 40 && !shortCode; i++) {
      const candidate = String(1000 + Math.floor(Math.random() * 9000));
      const [clash] = await getDb().select().from(rooms).where(eq(rooms.shortCode, candidate)).limit(1);
      if (!clash) shortCode = candidate;
    }
    if (!shortCode) return fail(409, { message: 'Could not allocate a room code. Try again.' });

    const [created] = await getDb()
      .insert(rooms)
      .values({
        accountId: source.accountId,
        shortCode,
        name: `${source.name} (copy)`,
        // `open`, matching `provisionRoom`. Nothing in this app can move a room out of `closed`
        // once it is there — there is no open/close control anywhere — so a clone created closed
        // wore the one state the reference never shows, permanently.
        state: 'open',
        maxUsers: source.maxUsers,
        textList: source.textList,
        publicId: randomBytes(12).toString('hex'),
        clonedFromId: source.id,
        createdAt: new Date()
      })
      // `shortCode` comes back too: the redirect below addresses the new room by its code, and
      // reading it off the inserted row rather than the local proves it is the value that landed.
      .returning({ id: rooms.id, shortCode: rooms.shortCode });

    // settings come across wholesale; links and members deliberately do not
    await writeSettings(created.id, await readSettings(source.id));
    redirect(303, `/account/rooms/${created.shortCode}`);
  },

  /**
   * `deleteRoom(sess._id)` — any room this account owns.
   *
   * The reference only offers this on a clone. That is a sample-tenant guard,
   * not a rule of the product, so it is lifted; ownership is still checked by
   * `ownedRoomId`, and the page asks for confirmation first.
   */
  deleteRoom: async ({ params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    await deleteRoomCascade(roomId);
    redirect(303, '/account');
  },

  /** `setCustomRoomURL()` — the Vanity Link row. */
  setCustomRoomURL: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const slug = String((await request.formData()).get('slug') ?? '')
      .trim()
      .toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug)) {
      return fail(400, {
        message: 'A vanity link is 3–50 characters: letters, digits and hyphens.'
      });
    }
    const [taken] = await getDb().select().from(rooms).where(eq(rooms.vanitySlug, slug)).limit(1);
    if (taken && taken.id !== roomId) return fail(409, { message: 'That vanity link is taken.' });
    await getDb().update(rooms).set({ vanitySlug: slug }).where(eq(rooms.id, roomId));
    return { vanitySlug: slug };
  },

  /** `setUniqueRoomURL()` — generated, not chosen. */
  setUniqueRoomURL: async ({ params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const slug = randomBytes(9).toString('base64url');
    await getDb().update(rooms).set({ uniqueSlug: slug }).where(eq(rooms.id, roomId));
    return { uniqueSlug: slug };
  },

  /** Branding tab. Inline data URL, bounded, same rules as a badge image. */
  uploadLogo: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const file = (await request.formData()).get('logo');
    if (!(file instanceof File) || file.size === 0) {
      return fail(400, { message: 'Choose an image to upload.' });
    }
    const ALLOWED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      return fail(415, { message: `${file.type || 'That file'} is not a PNG, JPEG, GIF or WebP.` });
    }
    const MAX_BYTES = 512 * 1024;
    if (file.size > MAX_BYTES) {
      return fail(413, {
        message: `That image is ${Math.round(file.size / 1024)}KB; the limit is ${MAX_BYTES / 1024}KB.`
      });
    }
    const dataUrl = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`;
    await getDb().update(rooms).set({ logoUrl: dataUrl }).where(eq(rooms.id, roomId));
    return { logo: true };
  },

  resetLogo: async ({ params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    await getDb().update(rooms).set({ logoUrl: null }).where(eq(rooms.id, roomId));
    return { logo: false };
  },

  /** `doInvite()` — adds a member row so the room knows them before they arrive. */
  inviteUser: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const form = await request.formData();
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '')
      .trim()
      .toLowerCase();
    if (!name || !email) return fail(400, { message: 'A name and an email are both required.' });
    try {
      await inviteRoomUser(roomId, name, email);
      return { invited: email };
    } catch (e) {
      return fail(409, { message: e instanceof Error ? e.message : 'Could not invite that user.' });
    }
  },

  /** `clearUserList()` — "Remove non-presenters". */
  clearUserList: async ({ params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    return { removed: await removeNonPresenters(roomId) };
  },

  /** `removeUsersFT()` — drop every non-owner free-trial member */
  removeFreeTrials: async ({ params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    return { removed: await removeFreeTrialUsers(roomId) };
  },

  /** `updateManyUsersBadgePrompt('add'|'remove')` applied to the selection */
  updateManyUsersBadge: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const form = await request.formData();
    const mode = String(form.get('mode'));
    if (mode !== 'add' && mode !== 'remove') {
      return fail(400, { message: `Unknown badge mode ${mode}.` });
    }
    const badgeId = Number(form.get('badgeId'));
    const ids = form
      .getAll('roomUserId')
      .map(Number)
      .filter((n) => Number.isFinite(n));
    const allRooms = form.get('applyToAllRooms') === 'on';
    return {
      badgesChanged: await setBadgeForUsers(roomId, ids, badgeId, mode === 'add', { allRooms }),
      allRooms
    };
  },

  /**
   * `loadSettingsFromRoom()` — copy another room's settings onto this one.
   *
   * The source has to belong to the same account, checked here rather than
   * trusted from the form, or a room id from another tenant would be readable
   * by guessing. Destructive: it replaces, it does not merge, which is what the
   * reference's name implies and what makes the result predictable.
   */
  loadSettingsFromRoom: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const fromRoomId = Number((await request.formData()).get('fromRoomId'));
    const [source] = await getDb().select().from(rooms).where(eq(rooms.id, fromRoomId)).limit(1);
    requireOwnedRoom(locals, source);
    if (!source) return fail(404, { message: 'No such room.' });
    if (source.id === roomId) return fail(400, { message: 'That is this room.' });
    await writeSettings(roomId, await readSettings(source.id));
    return { loadedFrom: source.shortCode };
  },

  /**
   * `generateNewApiSecret()` — a fresh per-room API secret.
   *
   * 32 bytes from a CSPRNG. Stored on the room like the reference does, because
   * the documented API authenticates with `apiKey` + `apiSecret` as query
   * parameters and the room has to be able to show it again.
   */
  generateApiSecret: async ({ params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const secret = randomBytes(32).toString('hex');
    await saveSetting(roomId, 'apiSecret', secret);
    return { apiSecret: secret };
  },

  removeBadgesForUsers: async ({ params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    return { cleared: await clearUserBadges(roomId) };
  },

  /** `setUserRestrictPM(bool, …)` — member-to-member DMs */
  setUserRestrictPm: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const form = await request.formData();
    const roomUserId = Number(form.get('roomUserId'));
    return { restrictPm: await setUserRestrictPm(roomId, roomUserId, form.get('restrict') === 'on') };
  },

  /** `setNoteUser(…)` */
  setUserNote: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const form = await request.formData();
    const roomUserId = Number(form.get('roomUserId'));
    const note = String(form.get('note') ?? '');
    if (note.length > 500) return fail(400, { message: 'A note is at most 500 characters.' });
    return { note: await setUserNote(roomId, roomUserId, note) };
  },

  /** `editUsername(…)` */
  renameUser: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const form = await request.formData();
    const roomUserId = Number(form.get('roomUserId'));
    const displayName = String(form.get('displayName') ?? '').trim();
    if (!displayName) return fail(400, { message: 'A member needs a name.' });
    try {
      return { renamed: await renameRoomUser(roomId, roomUserId, displayName) };
    } catch (e) {
      return fail(404, { message: e instanceof Error ? e.message : 'No such member.' });
    }
  },

  /** the row menu's Badges submenu */
  toggleUserBadge: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const form = await request.formData();
    const roomUserId = Number(form.get('roomUserId'));
    const badgeId = Number(form.get('badgeId'));
    try {
      return { badges: await toggleUserBadge(roomId, roomUserId, badgeId) };
    } catch (e) {
      return fail(404, { message: e instanceof Error ? e.message : 'No such member.' });
    }
  },

  /**
   * `setUserPW(…)` — an owner setting a member's room password.
   *
   * Hashed with the same function the rest of the app uses; the plaintext is
   * never stored and never returned. A 10-character floor is enforced on the
   * server as well as in the markup, because the markup is advisory.
   */
  setUserPassword: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const form = await request.formData();
    const roomUserId = Number(form.get('roomUserId'));
    const password = String(form.get('password') ?? '');
    if (password.length < 10) {
      return fail(400, { message: 'A password must be at least 10 characters.' });
    }
    try {
      await setRoomUserPassword(roomId, roomUserId, password);
      return { passwordSet: true };
    } catch (e) {
      return fail(404, { message: e instanceof Error ? e.message : 'No such member.' });
    }
  },

  /* ── the mobile app: real actions, not a disabled menu ─────────────────── */

  /** `getAppPin(…)` */
  getAppPin: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const roomUserId = Number((await request.formData()).get('roomUserId'));
    const settings = (await readSettings(roomId)) as Settings;
    const days = Number(settings.ptrMobileAppExpirePairCodeDays ?? 1);
    try {
      const { code, expiresAt } = await issueMobilePairCode(roomId, roomUserId, days);
      return { pairCode: code, pairCodeExpiresAt: expiresAt.toISOString(), roomUserId };
    } catch (e) {
      return fail(404, { message: e instanceof Error ? e.message : 'No such member.' });
    }
  },

  /** `showAlerterAppTokens(…)` / `getFCMTokens(…)` — masked, they are credentials */
  showAppTokens: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const roomUserId = Number((await request.formData()).get('roomUserId'));
    try {
      return { tokens: await listPushTokens(roomId, roomUserId), roomUserId };
    } catch (e) {
      return fail(404, { message: e instanceof Error ? e.message : 'No such member.' });
    }
  },

  /** PAUSE / RESUME / Remove Mobile Notifs */
  setNotifications: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const form = await request.formData();
    const roomUserId = Number(form.get('roomUserId'));
    const state = String(form.get('state'));
    if (state !== 'active' && state !== 'paused' && state !== 'unsubscribed') {
      return fail(400, { message: `Unknown notification state ${state}.` });
    }
    try {
      return { notifications: await setNotificationsState(roomId, roomUserId, state) };
    } catch (e) {
      return fail(404, { message: e instanceof Error ? e.message : 'No such member.' });
    }
  },

  /**
   * `getFCMTokens(user._id,user.userName,$index)` — the distinct one.
   *
   * "Show App Tokens" reads the stored copy; this asks FCM about it. Same masking, because they are
   * the same credentials, and the same `{ tokens, roomUserId }` shape the row already renders —
   * with a `state` per registration, which is the whole reason the reference has two items.
   */
  getFcmTokens: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const roomUserId = Number((await request.formData()).get('roomUserId'));
    try {
      const { tokens, pruned, checkedAt } = await listFcmRegistrations(roomId, roomUserId);
      return { tokens, pruned, checkedAt, roomUserId };
    } catch (e) {
      return failFor(e);
    }
  },

  /** `sendTestFCM(user._id,user.userName,$index)` — a real push to that member's registrations. */
  sendTestPush: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const roomUserId = Number((await request.formData()).get('roomUserId'));
    try {
      const result = await sendTestPushToMember(roomId, roomUserId);
      if (result.registrations === 0) {
        return fail(409, { message: 'That member has no push registrations, so there is nothing to send to.' });
      }
      return { testPush: result, roomUserId };
    } catch (e) {
      return failFor(e);
    }
  },

  /** `sendWelcomeEmail(user._id,user.userName,$index)` */
  sendWelcomeEmail: async ({ request, params, locals, url }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const roomUserId = Number((await request.formData()).get('roomUserId'));
    try {
      const { to } = await sendWelcomeEmailToMember(roomId, roomUserId, siteOrigin(url));
      return { welcomeEmailSentTo: to, roomUserId };
    } catch (e) {
      return failFor(e);
    }
  },

  /**
   * `sendWeminarEmailReminder(webinarTimeTxt)` — "Send Emails Now", to EVERY member of the room.
   *
   * Reported honestly when it is partial. A bulk mail that answers "done" while nine of its
   * twenty-one recipients were refused is the one failure mode nobody discovers until the webinar
   * starts and the room is half empty.
   */
  sendWebinarReminder: async ({ request, params, locals, url }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const eventTime = String((await request.formData()).get('eventTime') ?? '');
    try {
      const result = await sendWebinarReminderToRoom(roomId, eventTime, siteOrigin(url));
      if (result.failures.length > 0) {
        // Named, but bounded: a room where every address was refused would otherwise put hundreds
        // of them into one banner. The COUNT is exact either way, which is the part that matters.
        const named = result.failures.slice(0, 10).map((f) => f.email);
        const rest = result.failures.length - named.length;
        return fail(502, {
          message:
            `Sent ${result.sent} of ${result.attempted} reminders. ` +
            `${result.failures.length} were refused: ${named.join(', ')}${rest > 0 ? `, and ${rest} more` : ''}.`
        });
      }
      return { reminder: result };
    } catch (e) {
      return failFor(e);
    }
  },

  /** `resetFCMForuser(…)` */
  resetNotifications: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const roomUserId = Number((await request.formData()).get('roomUserId'));
    try {
      await resetPushTokens(roomId, roomUserId);
      return { notificationsReset: true };
    } catch (e) {
      return fail(404, { message: e instanceof Error ? e.message : 'No such member.' });
    }
  },

  removeUser: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const roomUserId = Number((await request.formData()).get('roomUserId'));
    return { removed: await removeRoomUser(roomId, roomUserId) };
  },

  /** The reference's saveSessField(name) — one field, read-modify-write. */
  saveField: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const form = await request.formData();
    const name = String(form.get('name') ?? '');
    const raw = form.get('value');
    try {
      /**
       * `description` is the landing page, and it is rendered back to every
       * member of the room. The reference stores whatever its editor emits,
       * which is a stored-XSS hole; ours is sanitised against an allowlist on
       * the way IN, on the server, because the action is reachable with curl.
       */
      const cleaned = name === 'description' && raw !== null ? sanitizeHtml(String(raw)) : raw;
      const value = await saveSetting(roomId, name, cleaned === null ? null : String(cleaned));
      return { saved: name, value };
    } catch (e) {
      return fail(400, { message: e instanceof Error ? e.message : 'Could not save that field.' });
    }
  },

  /**
   * Renaming, for a caller that has only a name and no field definition.
   *
   * Delegates to `saveSetting`, which owns both writes — the settings blob AND the `rooms.name`
   * column. It used to do the two itself, which made it a second path that could drift from the
   * one `Editable.svelte` actually posts to; keeping the column update in exactly one place is
   * what stops the two disagreeing again.
   */
  renameRoom: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const name = String((await request.formData()).get('name') ?? '').trim();
    if (!name) return fail(400, { message: 'A room needs a name.' });
    await saveSetting(roomId, 'name', name);
    return { renamed: true };
  },

  setState: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const state = String((await request.formData()).get('state') ?? '');
    if (state !== 'open' && state !== 'closed') return fail(400, { message: 'Unknown room state.' });
    await getDb().update(rooms).set({ state }).where(eq(rooms.id, roomId));
    return { state };
  },

  /**
   * The row menus. `op` is the reference's updateUser opcode.
   * updateManyUsers is a DIFFERENT enum and deliberately has no path here.
   */
  saveTextList: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    await saveTextList(roomId, String((await request.formData()).get('value') ?? ''));
    return { savedTextList: true };
  },

  savePermissions: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const form = await request.formData();
    const roomUserId = Number(form.get('roomUserId'));
    const granted = PERMISSION_KEYS.filter((k) => form.get(k) === 'on');
    return { permissions: await savePermissions(roomId, roomUserId, granted as PermissionKey[]) };
  },

  /** The bulk menu. Separate enum, separate action — see MANY_OPCODES. */
  updateManyUsers: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const form = await request.formData();
    const op = Number(form.get('op')) as ManyOpcode;
    if (!(op in MANY_OPCODES)) return fail(400, { message: `Unknown bulk opcode ${op}.` });
    const ids = form
      .getAll('roomUserId')
      .map(Number)
      .filter((n) => Number.isFinite(n));
    // "Apply to all rooms?" — widens the selection to the same people in every room
    // this account owns. Sent by the checkbox beside "Select All", not a per-action flag.
    const allRooms = form.get('applyToAllRooms') === 'on';
    const affected = await applyManyOpcode(roomId, ids, op, { allRooms });
    return { bulk: MANY_OPCODES[op], affected, allRooms };
  },

  /**
   * `approveUser(userName, _id, $index, status)` — both of its call sites.
   *
   * The row's APPROVE button sends 'approved'; the row menu's "Pause / Pending"
   * sends 'pending'. `setInviteStatus` rejects anything else and refuses role 0.
   */
  approveUser: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const form = await request.formData();
    const roomUserId = Number(form.get('roomUserId'));
    const status = String(form.get('status') ?? '');
    if (status !== 'approved' && status !== 'pending') {
      return fail(400, { message: `Unknown invite status ${status}.` });
    }
    if (!Number.isFinite(roomUserId)) return fail(400, { message: 'Missing member.' });
    await setInviteStatus(roomId, roomUserId, status);
    return { inviteStatus: status };
  },

  updateUser: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const form = await request.formData();
    const op = Number(form.get('op')) as UserOpcode;
    const roomUserId = Number(form.get('roomUserId'));
    if (!(op in USER_OPCODES)) return fail(400, { message: `Unknown opcode ${op}.` });
    try {
      await applyUserOpcode(roomId, roomUserId, op);
      return { applied: USER_OPCODES[op] };
    } catch (e) {
      return fail(400, { message: e instanceof Error ? e.message : 'Could not apply that action.' });
    }
  },

  /* ── the DON'T TOUCH block's five buttons ───────────────────────────────────
     Every one of these writes something real. None of them exists to change its own label. */

  /**
   * `swapCLusterIDs()` — this room's main and backup cluster ids, exchanged.
   *
   * Both writes go through `saveSetting`, which owns the settings blob and rejects a key that is
   * not in the schema; nothing here touches the JSON directly. Refuses when neither is set rather
   * than reporting a swap that moved nothing.
   */
  swapClusterIds: async ({ params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const settings = (await readSettings(roomId)) as Settings;
    const main = settings.clusterID ?? null;
    const backup = settings.backupClusterID ?? null;
    if (main === null && backup === null) {
      return fail(400, { message: 'Neither ClusterID is set, so there is nothing to swap.' });
    }
    await saveSetting(roomId, 'clusterID', backup);
    await saveSetting(roomId, 'backupClusterID', main);
    return { swappedClusterIds: true };
  },

  /**
   * `applyToAllSessions()` — this room's ClusterID and Backup ClusterID onto EVERY room the
   * account owns, this one included.
   *
   * Scope comes from `accountRoomIds`, which derives the account from the already-checked room.
   * The page confirms first and names the number of rooms.
   */
  applyToAllSessions: async ({ params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const settings = (await readSettings(roomId)) as Settings;
    const clusterID = settings.clusterID ?? null;
    const backupClusterID = settings.backupClusterID ?? null;
    const ids = await accountRoomIds(roomId);
    for (const id of ids) {
      await saveSetting(id, 'clusterID', clusterID);
      await saveSetting(id, 'backupClusterID', backupClusterID);
    }
    return { appliedClusterIds: ids.length };
  },

  /**
   * `applyRepeaterToAccount()` — this room's Repeater List onto every room the account owns.
   *
   * HONEST GAP: the button reads "Apply  server / repeaters to entire account?" and the reference's
   * implementation is in no capture, so what its "server" half writes is not evidenced. This
   * applies `media_relays` — the field the button sits under, in the same `<p>` — and nothing else.
   * Guessing that "server" also meant `clusterID` would silently overwrite the cluster of every
   * room on the account, which is the one mistake here that could not be undone from this page.
   */
  applyRepeaterToAccount: async ({ params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const settings = (await readSettings(roomId)) as Settings;
    const relays = settings.media_relays ?? null;
    const ids = await accountRoomIds(roomId);
    for (const id of ids) await saveSetting(id, 'media_relays', relays);
    return { appliedRepeaters: ids.length };
  },

  /** `addLiveServer()` — one entry onto the end of this room's comma-separated Repeater List. */
  addLiveServer: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const entry = String((await request.formData()).get('server') ?? '').trim();
    if (!entry) return fail(400, { message: 'Type the repeater to add first.' });
    // A comma would add two entries from one box and nobody would see which.
    if (entry.includes(',')) {
      return fail(400, { message: 'One repeater at a time — the list itself is comma separated.' });
    }
    const settings = (await readSettings(roomId)) as Settings;
    const relays = parseRelays(settings.media_relays);
    if (relays.includes(entry)) {
      return fail(409, { message: `${entry} is already in the repeater list.` });
    }
    const next = [...relays, entry];
    await saveSetting(roomId, 'media_relays', next.join(','));
    return { mediaRelays: next };
  },

  /**
   * `removeLiveServer()` — one entry off this room's Repeater List.
   *
   * An entry that is not there is a 404, not a silent no-op: the operator typed something, and a
   * green result for a removal that removed nothing is how a repeater stays in the list.
   */
  removeLiveServer: async ({ request, params, locals }) => {
    const roomId = await ownedRoomId(locals, params.id);
    const entry = String((await request.formData()).get('server') ?? '').trim();
    if (!entry) return fail(400, { message: 'Type the repeater to remove first.' });
    const settings = (await readSettings(roomId)) as Settings;
    const relays = parseRelays(settings.media_relays);
    if (!relays.includes(entry)) {
      return fail(404, { message: `${entry} is not in the repeater list.` });
    }
    const next = relays.filter((relay) => relay !== entry);
    // Emptying the list stores null, not "", so it reads back as unset like every other field.
    await saveSetting(roomId, 'media_relays', next.length > 0 ? next.join(',') : null);
    return { mediaRelays: next };
  }
};
