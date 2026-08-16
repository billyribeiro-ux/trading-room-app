import { fail } from '@sveltejs/kit';
import { API_KEY_ENCRYPTION_KEY, ROOM_BASE_URL, ROOM_JWT_SECRET } from '$app/env/private';
import { randomBytes, createHash } from 'node:crypto';
import { and, count, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '$lib/server/db';
import { adminUsers, apiKeys, badges, rooms, roomUsers } from '$lib/server/db/schema';
import { emailIsProved, hashPassword, requireUser } from '$lib/server/auth';
import { issueToken, sendVerificationEmail, verificationEnforced } from '$lib/server/email-verification';
import { resolveAccountEntitlements } from '$lib/server/account-entitlements';
import { decryptApiKeySecret, encryptApiKeySecret } from '$lib/server/api-key-secret';
import { API_SCOPES, parseIpList, readRestrictions } from '$lib/server/rooms';
import { launchHref } from '$lib/server/room-handoff';
import { NoRoomCodeAvailable, provisionRoom } from '$lib/server/provision-room';
import type { Actions, PageServerLoad } from './$types';

function apiKeyEncryptionMaster() {
  return API_KEY_ENCRYPTION_KEY ?? ROOM_JWT_SECRET ?? '';
}

/**
 * One undecryptable API key must not take down the whole account page.
 *
 * `decryptApiKeySecret` throws on a malformed or unauthenticated envelope, and that throw was
 * uncaught in the loader — so a single bad row turned every request for this page into a 500. The
 * owner saw `An unexpected error occurred.` and an account they could not open at all.
 *
 * A row becomes undecryptable when `API_KEY_ENCRYPTION_KEY` is not the key that encrypted it. That
 * is not hypothetical: it happened when this deployment moved to a new Vercel project and the
 * original key could not be recovered from the old one. The ciphertext is intact and still safe —
 * it simply cannot be read again, and retrying will never change that.
 *
 * So the page reports the row instead of dying on it. `undecryptable: true` lets the UI say the key
 * exists and needs rotating, which is the only honest thing to say and the only action that helps:
 * rotating writes a fresh envelope under the current key and the row heals.
 *
 * Not swallowed silently. A key that will not decrypt is either a configuration mistake or
 * tampering, and both deserve a server-side trace — carrying the key id and never the ciphertext.
 */
function readApiKeySecret(
  ciphertext: string | null,
  accountId: number,
  keyId: string
): { secret: string | null; undecryptable: boolean } {
  if (!ciphertext) return { secret: null, undecryptable: false };

  try {
    return {
      secret: decryptApiKeySecret(ciphertext, { accountId, keyId }, apiKeyEncryptionMaster()),
      undecryptable: false
    };
  } catch (cause) {
    console.error(
      `[api-key] key ${keyId} on account ${accountId} could not be decrypted with the configured ` +
        `API_KEY_ENCRYPTION_KEY; it needs rotating. ${cause instanceof Error ? cause.message : String(cause)}`
    );
    return { secret: null, undecryptable: true };
  }
}

/**
 * A row id out of a form, or a loud failure.
 *
 * `Number(null)` is 0 and `Number('')` is 0, so an absent field arrives at the WHERE clause as a
 * perfectly plausible id rather than as a mistake. Every action added here goes through this instead
 * of `Number(...)`, so a malformed post is a 400 that says so rather than a silent no-op that the
 * caller cannot distinguish from "somebody else's row".
 */
function readRowId(form: FormData, field: string): number | null {
  const raw = form.get(field);
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export const load: PageServerLoad = async ({ locals, setHeaders }) => {
  const user = requireUser(locals);
  const accountId = user.accountId;

  // Complete API credentials are owner-visible by product contract. Do not let
  // browsers or intermediaries retain the authenticated account response.
  setHeaders({ 'cache-control': 'private, no-store' });

  const roomRows = await getDb().select().from(rooms).where(eq(rooms.accountId, accountId));

  /*
    One grouped query for every room's member count, not one query per room.

    Under SQLite the per-room loop was an in-process call and its cost was invisible. Against a
    network database it is a round trip each, so an account with twenty rooms paid twenty
    latencies to render one page. `inArray` is guarded because an empty list is not valid SQL.
  */
  const counts = new Map<number, number>();
  if (roomRows.length > 0) {
    const grouped = await getDb()
      .select({ roomId: roomUsers.roomId, members: count() })
      .from(roomUsers)
      .where(
        inArray(
          roomUsers.roomId,
          roomRows.map((r) => r.id)
        )
      )
      .groupBy(roomUsers.roomId);
    for (const row of grouped) counts.set(row.roomId, row.members);
  }

  const keyRows = await getDb()
    .select({
      id: apiKeys.id,
      secretCiphertext: apiKeys.secretCiphertext,
      createdAt: apiKeys.createdAt,
      restrictionsJson: apiKeys.restrictionsJson
    })
    .from(apiKeys)
    .where(eq(apiKeys.accountId, accountId));

  return {
    user,
    /*
      Whether to nag, computed on the server because only the server knows whether mail is
      configured. False on a deployment with no transport, so the banner cannot ask somebody to
      check an inbox nothing was ever sent to.
    */
    emailUnproved: verificationEnforced() && !user.emailVerifiedAt,
    entitlements: resolveAccountEntitlements({ accountId }),
    /*
      `launchUrl` is minted here, at page load, because the reference puts the whole
      `/session?id=…&jwtSite=…` into the anchor's `ng-href` rather than redirecting through a
      route. One token per room per render, exactly as there.
    */
    rooms: roomRows.map((r) => ({
      ...r,
      userCount: counts.get(r.id) ?? 0,
      launchUrl: launchHref(ROOM_BASE_URL, ROOM_JWT_SECRET, r.shortCode, {
        name: user.displayName,
        email: user.email,
        id: String(user.id)
      })
    })),
    badges: await getDb().select().from(badges).where(eq(badges.accountId, accountId)),
    admins: await getDb()
      /* `createdAt` feeds the Added column — `{{au.created | date:'short'}}` in the reference
         (page.welcome.html:1294). It was omitted, so that column rendered an em dash on every row.
         The password hash is still never selected. */
      .select({
        id: adminUsers.id,
        name: adminUsers.name,
        email: adminUsers.email,
        createdAt: adminUsers.createdAt
      })
      .from(adminUsers)
      .where(eq(adminUsers.accountId, accountId)),
    // Never select the verification hash or encrypted envelope into a page
    // payload. Only the account-scoped decrypted display value crosses the
    // server boundary required by the original product contract.
    apiKeys: keyRows.map((k) => ({
      id: k.id,
      createdAt: k.createdAt,
      restrictionsJson: k.restrictionsJson,
      restrictions: readRestrictions(k.restrictionsJson),
      ...readApiKeySecret(k.secretCiphertext, accountId, k.id)
    })),
    /** the real API's command list — see API_SCOPES */
    apiScopes: API_SCOPES
  };
};

export const actions: Actions = {
  createRoom: async ({ request, locals }) => {
    const owner = requireUser(locals);
    const { accountId } = owner;

    /*
      The one place verification actually bites.

      Creating a room is the first act that produces something other people are invited to, so it is
      the right boundary: signing up and looking around costs nobody anything, and inviting an
      audience under an address you have not proved does. Inert on a deployment with no mail
      transport — see `emailIsProved`.
    */
    if (!emailIsProved(owner)) {
      return fail(403, {
        message: 'Confirm your email address before creating a room. Check your inbox, or resend the link below.'
      });
    }

    const form = await request.formData();
    const name = String(form.get('name') ?? '').trim();
    if (!name) return fail(400, { message: 'A room needs a name.' });

    /*
      The same three rows registration writes, through the same helper. Written by hand here twice
      before, and both times a row was left out — see `provision-room.ts`.
    */
    try {
      await provisionRoom(getDb(), { accountId, ownerUserId: owner.id, name });
    } catch (cause) {
      if (cause instanceof NoRoomCodeAvailable) {
        return fail(409, { message: 'Could not allocate a room code. Try again.' });
      }
      throw cause;
    }

    return { created: true };
  },

  /**
   * Archive or unarchive one room.
   *
   * One action for both directions rather than two, because the caller states the state it wants
   * instead of the transition it thinks it is making — two rapid clicks on a toggle that says
   * "flip it" can leave the room in the state nobody asked for, and a form that says `archived=true`
   * cannot.
   *
   * `archived` is validated to exactly `"true"` or `"false"` and fails loud otherwise. The tempting
   * `raw === 'true'` alone would silently treat a typo, a missing field or a stale client as
   * "unarchive", which is a destructive default dressed up as a fallback.
   *
   * Account-scoped in the UPDATE's own WHERE clause, exactly like `rotateApiKey` and `updateBadge`,
   * so no room belonging to another tenant is reachable even with its id in hand.
   *
   * Re-archiving an already-archived room restamps `archived_at`. That is reachable only by posting
   * this action directly — the row renders Archive or Unarchive, never both — and restamping is the
   * honest outcome of "make it archived, now" rather than silently ignoring the request.
   */
  setRoomArchived: async ({ request, locals }) => {
    const { accountId } = requireUser(locals);
    const form = await request.formData();
    const id = readRowId(form, 'id');
    if (id === null) return fail(400, { message: 'That room id is not a row id.' });

    const wanted = form.get('archived');
    if (wanted !== 'true' && wanted !== 'false') {
      return fail(400, { message: `"archived" must be "true" or "false", not ${JSON.stringify(wanted)}.` });
    }

    const changed = await getDb()
      .update(rooms)
      .set({ archivedAt: wanted === 'true' ? new Date() : null })
      .where(and(eq(rooms.id, id), eq(rooms.accountId, accountId)))
      .returning({ id: rooms.id, archivedAt: rooms.archivedAt });
    if (changed.length === 0) return fail(404, { message: 'No such room.' });
    return { archived: changed[0].archivedAt !== null };
  },

  createBadge: async ({ request, locals }) => {
    const { accountId } = requireUser(locals);
    const form = await request.formData();
    const label = String(form.get('label') ?? '').trim();
    if (!label) return fail(400, { message: 'A badge needs a label.' });
    await getDb()
      .insert(badges)
      .values({
        accountId,
        label,
        textColor: String(form.get('textColor') ?? '#ffffff'),
        backgroundColor: String(form.get('backgroundColor') ?? '#777777'),
        emoji: String(form.get('emoji') ?? '') || null,
        createdAt: new Date()
      });
    return { created: true };
  },

  /**
   * "Upload Image Badge" — the reference's `btn-info` next to Add New Badge.
   *
   * The image is stored inline as a data URL rather than in object storage.
   * Badges are small icons, this product is still standalone (no R2 wiring until
   * the amendment), and inlining keeps a badge a single row with nothing to
   * orphan. The size cap is what makes that safe.
   *
   * Only raster types a browser will render are accepted. SVG is deliberately
   * excluded: an SVG is a document, it can carry script, and these are rendered
   * back into the page.
   */
  uploadImageBadge: async ({ request, locals }) => {
    const { accountId } = requireUser(locals);
    const form = await request.formData();
    // The original upload prompt explicitly marks the badge name as optional.
    const label = String(form.get('label') ?? '').trim();
    const file = form.get('image');

    if (!(file instanceof File) || file.size === 0) {
      return fail(400, { message: 'Choose an image to upload.' });
    }
    const ALLOWED = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
    if (!ALLOWED.includes(file.type)) {
      return fail(415, { message: `${file.type || 'That file'} is not a PNG, JPEG, GIF or WebP.` });
    }

    const MAX_BYTES = 256 * 1024;
    if (file.size > MAX_BYTES) {
      return fail(413, {
        message: `That image is ${Math.round(file.size / 1024)}KB; the limit is ${MAX_BYTES / 1024}KB.`
      });
    }

    const dataUrl = `data:${file.type};base64,${Buffer.from(await file.arrayBuffer()).toString('base64')}`;
    await getDb().insert(badges).values({
      accountId,
      label,
      imageUrl: dataUrl,
      textColor: '#ffffff',
      backgroundColor: '#777777',
      createdAt: new Date()
    });
    return { created: true };
  },

  /**
   * The reference's Edit row action — `editBadge(b._id, b.text, b.bkcolor, b.color, b.roles,
   * b.name, b.imgURL)` (#755/#756) — followed by its "Save Edit for New Badge" submit, which is
   * `addBadge(true)` against `badges.badgeID`.
   *
   * The editor previously had no second mode at all, because there was nothing to save into and
   * pointing "Save Edit" at `?/createBadge` would silently produce a SECOND badge. This is that
   * missing half.
   *
   * Scoped exactly like `rotateApiKey`: the account is part of the UPDATE's own WHERE clause rather
   * than checked by a SELECT first, so another tenant's badge cannot be swapped in between the two
   * queries. Zero rows changed means the badge was not this account's — which is deliberately
   * indistinguishable from "no such badge", because telling somebody their id named a real row in
   * another account is itself a leak.
   */
  updateBadge: async ({ request, locals }) => {
    const { accountId } = requireUser(locals);
    const form = await request.formData();
    const id = readRowId(form, 'id');
    if (id === null) return fail(400, { message: 'That badge id is not a row id.' });

    // Same rule as createBadge: a badge needs a label. An edit that blanks it is a mistake, not a
    // request to store an empty string.
    const label = String(form.get('label') ?? '').trim();
    if (!label) return fail(400, { message: 'A badge needs a label.' });

    const changed = await getDb()
      .update(badges)
      .set({
        label,
        textColor: String(form.get('textColor') ?? '#ffffff'),
        backgroundColor: String(form.get('backgroundColor') ?? '#777777'),
        emoji: String(form.get('emoji') ?? '') || null
      })
      .where(and(eq(badges.id, id), eq(badges.accountId, accountId)))
      .returning({ id: badges.id });
    if (changed.length === 0) return fail(404, { message: 'No such badge.' });
    /*
      `imageUrl` is deliberately absent from the SET. An image badge is created by
      `uploadImageBadge` and the editor has no file field in edit mode, so writing the column here
      would clear the image of any badge that has one. The reference passes `b.imgURL` back INTO
      `editBadge`, i.e. it carries the existing value rather than replacing it.

      `roles` is likewise absent, and that is an honest gap rather than a decision: the reference's
      editor has an "Auto assign this badge to this WP roles" textarea bound to `badges.roles`, and
      this schema has no column for it — `createBadge` does not store one either. Storing it here
      would be the only writer of a field nothing reads.
    */
    return { updated: id };
  },

  /**
   * "Dark Theme" — `$scope.addBadgeDarkTheme`, captured verbatim at byte 202828 of the live
   * `app.min.js`. It opens a dialog with a free-text field seeded with the current value and posts
   * `args.darkTheme = $("#darkThemeID").val()`: whatever the admin typed.
   *
   * **It was a toggle here until 2026-08-15 and that was wrong.** The docstring this replaces read
   * the current value being handed back as proof of a toggle; it is handed back to SEED THE FIELD.
   * The value is the id of ANOTHER badge — the dark-theme variant of this one — which
   * `page.welcome.html:1191-1211` had already proven by comparing it with `roomBadge._id`.
   *
   * ## Three refusals, and each is a real reachable input rather than defensive noise
   *
   * * **Empty clears it.** The captured field can be emptied and Set pressed, and the only coherent
   *   meaning is "no dark variant". NULL, not zero.
   * * **A badge cannot be its own dark variant.** Nothing upstream forbids it, but the display is a
   *   lookup of another row; pointing a badge at itself renders it as its own replacement forever.
   * * **The target must be a badge in THIS account.** The reference has no such check because it
   *   scopes by session; this is a multi-tenant fintech application and an id typed into a text box
   *   is raw user input. Deny-by-default: the id is resolved against `accountId` and refused if it
   *   does not resolve, so a typed id from another tenant fails exactly as a nonsense one does.
   *
   * The write stays a single conditional UPDATE for the same reason it always did — a SELECT then an
   * UPDATE is a lost-update race between two tabs — and `.returning()` reports what was committed
   * rather than what was predicted.
   */
  addBadgeDarkTheme: async ({ request, locals }) => {
    const { accountId } = requireUser(locals);
    const form = await request.formData();
    const id = readRowId(form, 'id');
    if (id === null) return fail(400, { message: 'That badge id is not a row id.' });

    const typed = String(form.get('darkThemeBadgeId') ?? '').trim();

    /* Empty is not a failure: it is how the captured field says "no dark variant". */
    let parsed: number | null = null;
    if (typed !== '') {
      const asNumber = Number(typed);
      if (!Number.isInteger(asNumber) || asNumber <= 0) {
        return fail(400, { message: 'That is not a badge id.' });
      }
      if (asNumber === id) {
        return fail(400, { message: 'A badge cannot be its own dark theme.' });
      }
      parsed = asNumber;
    }

    /*
      ONE STATEMENT, and the account scope appears TWICE inside it — once on the row being written
      and once inside the subquery that resolves the target.

      The obvious shape is a SELECT to check the target belongs to this account, then an UPDATE. That
      is the SELECT-then-UPDATE this repository forbids, and `account-actions-contract.test.ts`
      refuses it by reading this function's source. Correctly: the check and the write must not be
      two decisions a concurrent request can slip between.

      So the target is resolved BY the write. The subquery yields the id only if that badge is in
      this account, and NULL otherwise — which is why the outcome has to be compared against intent
      on the next line rather than trusted: a NULL result means either "cleared, as asked" or "that
      id is not yours", and only the caller's `parsed` distinguishes them. A cross-tenant id and a
      nonsense one therefore fail identically, which is the point.
    */
    const changed = await getDb()
      .update(badges)
      .set({
        darkThemeBadgeId:
          parsed === null
            ? null
            : sql`(SELECT b.id FROM badges b WHERE b.id = ${parsed} AND b.account_id = ${accountId})`
      })
      .where(and(eq(badges.id, id), eq(badges.accountId, accountId)))
      .returning({ id: badges.id, darkThemeBadgeId: badges.darkThemeBadgeId });

    if (changed.length === 0) return fail(404, { message: 'No such badge.' });
    if (parsed !== null && changed[0].darkThemeBadgeId === null) {
      return fail(404, { message: 'No badge with that id.' });
    }
    return { darkThemeBadgeId: changed[0].darkThemeBadgeId };
  },

  deleteBadge: async ({ request, locals }) => {
    const { accountId } = requireUser(locals);
    const id = Number((await request.formData()).get('id'));
    await getDb()
      .delete(badges)
      .where(and(eq(badges.id, id), eq(badges.accountId, accountId)));
    return { deleted: true };
  },

  addAdminUser: async ({ request, locals }) => {
    const { accountId } = requireUser(locals);
    const form = await request.formData();
    const name = String(form.get('name') ?? '').trim();
    const email = String(form.get('email') ?? '')
      .trim()
      .toLowerCase();
    const password = String(form.get('password') ?? '');
    if (!name || !email || !password) return fail(400, { message: 'Name, email and password are all required.' });
    await getDb()
      .insert(adminUsers)
      .values({ accountId, name, email, passwordHash: hashPassword(password), createdAt: new Date() });
    return { created: true };
  },

  deleteAdminUser: async ({ request, locals }) => {
    const { accountId } = requireUser(locals);
    const id = Number((await request.formData()).get('id'));
    await getDb()
      .delete(adminUsers)
      .where(and(eq(adminUsers.id, id), eq(adminUsers.accountId, accountId)));
    return { deleted: true };
  },

  createApiKey: async ({ locals }) => {
    const { accountId } = requireUser(locals);
    const id = randomBytes(12).toString('hex');
    const secret = randomBytes(32).toString('hex');
    await getDb()
      .insert(apiKeys)
      .values({
        id,
        accountId,
        secretHash: createHash('sha256').update(secret).digest('hex'),
        lastFour: secret.slice(-4),
        secretCiphertext: encryptApiKeySecret(secret, { accountId, keyId: id }, apiKeyEncryptionMaster()),
        createdAt: new Date()
      });
    // Progressive enhancement refreshes load; the original template likewise
    // refreshes apiKeys and binds the complete k.apiSecret in the table.
    return { keyId: id };
  },

  /**
   * `regen secret` — the reference's `rotateApiKey(k._id)`. Same key id, new
   * secret, so anything referencing the id keeps working and the old secret
   * stops immediately.
   *
   * The UPDATE is conditional on accountId in the same statement rather than a
   * SELECT-then-UPDATE, so a key cannot be rotated out from under another
   * tenant between the two queries. Zero rows changed means the key was not
   * this account's.
   */
  rotateApiKey: async ({ request, locals }) => {
    const { accountId } = requireUser(locals);
    const id = String((await request.formData()).get('id'));
    const secret = randomBytes(32).toString('hex');
    const changed = await getDb()
      .update(apiKeys)
      .set({
        secretHash: createHash('sha256').update(secret).digest('hex'),
        lastFour: secret.slice(-4),
        secretCiphertext: encryptApiKeySecret(secret, { accountId, keyId: id }, apiKeyEncryptionMaster())
      })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.accountId, accountId)))
      .returning({ id: apiKeys.id });
    if (changed.length === 0) return fail(404, { message: 'No such API key.' });
    return { keyId: id };
  },

  /**
   * `manageApiKeyRestrictions(k)` — narrow what a key may do and where from.
   *
   * An empty list means "no restriction", which is what a key is issued with.
   * The IP list is validated strictly rather than stored as typed: a
   * restriction list that silently accepts a malformed entry reads as protection
   * that is not there.
   */
  saveApiKeyRestrictions: async ({ request, locals }) => {
    const { accountId } = requireUser(locals);
    const form = await request.formData();
    const id = String(form.get('id') ?? '');
    let ips: string[];
    try {
      ips = parseIpList(String(form.get('ips') ?? ''));
    } catch (e) {
      return fail(400, { message: e instanceof Error ? e.message : 'Invalid IP list.' });
    }
    const scopes = form
      .getAll('scopes')
      .map(String)
      .filter((s) => (API_SCOPES as readonly string[]).includes(s));

    /*
      `restrictToSessions` — which ROOMS the key may act on, a different axis from which COMMANDS.

      Filtered against the account's OWN rooms, not merely stored as posted. A key restricted to a
      short code belonging to somebody else is not a restriction, it is a typo that reads as one —
      and the same deny-by-default reasoning the IP list already gets. An unknown code is dropped
      rather than rejected, because the list is a narrowing and a stale room should not block saving
      the rest of it.
    */
    const ownRooms = new Set(
      (await getDb().select({ shortCode: rooms.shortCode }).from(rooms).where(eq(rooms.accountId, accountId))).map(
        (r) => r.shortCode
      )
    );
    const sessions = form
      .getAll('sessions')
      .map(String)
      .filter((code) => ownRooms.has(code));

    const changed = await getDb()
      .update(apiKeys)
      .set({ restrictionsJson: JSON.stringify({ ips, scopes, sessions }) })
      .where(and(eq(apiKeys.id, id), eq(apiKeys.accountId, accountId)))
      .returning({ id: apiKeys.id });
    if (changed.length === 0) return fail(404, { message: 'No such API key.' });
    return { restrictionsSaved: id };
  },

  /**
   * A fresh verification link.
   *
   * The recovery path for every ordinary way the first one fails: it expired overnight, it went to
   * spam, the provider had an outage during registration. `issueToken` consumes any earlier
   * unconsumed token, so this never leaves two live links in one mailbox.
   *
   * Unlike registration, a failure here IS reported. Nothing else happened in this request, so a
   * silent success would be a button that lies.
   */
  resendVerification: async ({ locals, url }) => {
    const user = requireUser(locals);
    if (!verificationEnforced()) {
      return fail(400, { message: 'Email is not configured on this deployment, so there is nothing to send.' });
    }
    // Reachable only by posting directly — the banner that offers this hides once verified. Says so
    // rather than reporting a send that did not happen.
    if (user.emailVerifiedAt) return fail(400, { message: 'That address is already confirmed.' });

    try {
      const token = await issueToken({ userId: user.id, email: user.email, purpose: 'verify-email' });
      await sendVerificationEmail({
        email: user.email,
        displayName: user.displayName,
        token,
        origin: url.origin
      });
    } catch (cause) {
      console.error('[account] resend of the verification email failed', { email: user.email, cause });
      return fail(502, { message: 'We could not send that email just now. Try again in a minute.' });
    }
    return { verificationSent: true };
  },

  deleteApiKey: async ({ request, locals }) => {
    const { accountId } = requireUser(locals);
    const id = String((await request.formData()).get('id'));
    await getDb()
      .delete(apiKeys)
      .where(and(eq(apiKeys.id, id), eq(apiKeys.accountId, accountId)));
    return { deleted: true };
  }
};
