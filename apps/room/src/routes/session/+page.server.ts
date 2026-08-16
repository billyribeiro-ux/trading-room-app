import sanitizeHtml from 'sanitize-html';
import { error, fail, redirect } from '@sveltejs/kit';
import { ROOM_JWT_SECRET } from '$app/env/private';
import { eq } from 'drizzle-orm';
import { db, ensureDatabase } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { createSessionFor } from '$lib/server/auth';
import { isBannedFromRoom, isShutOutByRoomState, roomRoleFor } from '$lib/server/room-role';
import { verifyHandoffToken } from '$lib/server/handoff-token';
import { hashEmail } from '$lib/server/connection';
import {
  decideRoomEntryRemotely,
  readRoomConfig,
  type RoomConfig,
  type RoomMembership
} from '$lib/server/room-config-client';
import type { Actions, PageServerLoad } from './$types';

/**
 * `/session?id=<shortCode>&jwtSite=<HS256 JWT>` — the room's own login page.
 *
 * ## Why this is a PAGE, where it used to be a redirect
 *
 * The reference ALWAYS renders `app-session-login`, and nothing auto-submits it:
 * `doLoginCheck()` has exactly four callers in that component and every one is a click or submit
 * binding (`app-session-login.full.js:408, 451, 908, 948`). A member arriving with a token sees
 * their name and email already filled in, adjusts the name if the room allows it, and presses
 * `Login`. This redirected straight into the room instead, which was reported as the difference it
 * is.
 *
 * ## This is NOT the room's old login
 *
 * `ROOM-STATE-2026-08-06.md` row 78 deleted an email-and-password identity system — a second place
 * to authenticate an account, for a product whose front door is the controller. None of it returns.
 * **The signed handoff still decides who you are.** This page confirms a display name and collects
 * the room's own entry rules; it cannot promote anybody, and the role still comes from the
 * controller's membership.
 *
 * ## Where the password is checked, and why not here
 *
 * `webinarPW` appears NOWHERE in the reference's 2.9 MB bundle. Its `loginToRoom()` builds
 * `{cver, nick, email}`, adds `i.pw` when one was typed, and posts it — its SERVER decides. So does
 * ours: `decideRoomEntryRemotely` asks the controller, which runs the same `decideRoomEntry` the
 * guest door uses. The credential never reaches this application, which is also what
 * `room-config-boundary.test.ts` requires of every credential-shaped setting.
 */

/** What the reference prefills before it renders the form. */
/**
 * `sessData.description` as HTML that is safe on an UNAUTHENTICATED page.
 *
 * The reference hands this string straight to Angular's `innerHtml` binding. We do not, and the
 * reason is the room this page opens onto: `/session` is reachable without a session, so anything
 * that lands in this field executes for every visitor before they have identified themselves. The
 * write path is the owner's settings, which means one compromised or careless owner, not an
 * attacker, is enough.
 *
 * The tag list is derived from what the reference's own stylesheet expects to find in here rather
 * than from a general-purpose default: `.login-wrapper .room-description img { width:100%; height:auto }`
 * proves images render, and the const sets `height:100%; overflow-x:hidden` on the container, which
 * is a block of flowing rich text. Links get `rel="noopener noreferrer nofollow"` and are forced to
 * `target="_blank"` because this text is not ours and must not be able to navigate the login page.
 *
 * Deny-by-default: `sanitize-html` drops every tag and every attribute not named here, so widening
 * this is a deliberate edit with a reason, never an accident.
 *
 * NOT exported, and that is SvelteKit's rule rather than a style choice: a `+page.server.ts` may
 * export only `load`, `actions`, `prerender`, `csr`, `ssr`, `trailingSlash`, `config`, `entries`
 * and `_`-prefixed names, and anything else fails the BUILD — `Invalid export
 * 'sanitizeRoomDescription'`. It had been exported since it was written and nothing ever imported
 * it; the build only reached this check on 2026-08-16, after a lint failure that had been stopping
 * CI earlier in the pipeline was cleared. The single caller is `load`, forty lines below.
 */
function sanitizeRoomDescription(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p', 'br', 'hr', 'div', 'span',
      'b', 'strong', 'i', 'em', 'u', 's', 'sub', 'sup',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td'
    ],
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height'],
      '*': ['style']
    },
    // No `data:` — an SVG data URL is a script delivery mechanism dressed as an image.
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowedStyles: {
      '*': {
        color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\(/i],
        'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgba?\(/i],
        'text-align': [/^left$|^right$|^center$|^justify$/],
        'font-size': [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/],
        'font-weight': [/^\d{3}$|^bold$|^normal$/]
      }
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'noopener noreferrer nofollow',
        target: '_blank'
      })
    }
  });
}

type Prefill = {
  token: string;
  shortCode: string;
  name: string;
  email: string;
  /** `this.email && e && (this.readOnlyEmail = !0)` — the token supplied it, so it is not editable. */
  readOnlyEmail: boolean;
  /** `'a' !== decodedPassedToken.perms && sessData.disableEditingUsername`. */
  disableEditingUsername: boolean;
  /** `sessData.usernameInstructions`, byte 1189881. */
  usernameInstructions: string;
  /** `showPresenter = sessData.showPasswordField`, byte 1189804. */
  showPasswordField: boolean;
  /** `sessData.hasRequiredPhoneInLogin`, byte 1189964. */
  hasRequiredPhoneInLogin: boolean;
  /** `sessData.customEnterDisclosure`, byte 1190048. */
  customEnterDisclosure: string;
  /** `?dlf=1` — `globals.disableLoginForm`, bundle byte 2595200ff. */
  disableLoginForm: boolean;
  roomTitle: string;
  /**
   * `sessData.description` — the layout selector, NOT decoration.
   *
   * Carried as sanitised HTML because the reference binds it with `innerHtml`. Every other
   * `sessData.*` field on this page reads from `settings`, and so does this one.
   */
  roomDescription: string;
  avatarUrl: string;
};

/**
 * Verifies the handoff and reads the room, or throws the refusals the redirect used to throw.
 *
 * Shared by `load` and the action, because a POST is a fresh request that may carry anything: the
 * submit re-runs every one of these rather than trusting a form that says it already passed them.
 */
/**
 * Who is arriving, and on what authority.
 *
 * TWO arrivals, and the difference between them is the whole security model of this page:
 *
 *   **With a token** — the controller signed it, so the identity is VERIFIED. The membership is
 *   read for that email and the role comes from it, which is how a presenter gets presenter
 *   authority.
 *
 *   **Without one** — the reference's ordinary public arrival: `/session?id=<uuid>` renders the
 *   login form and the visitor types their own name and email. That identity is SELF-DECLARED, and
 *   it is never used to look up a membership. A guest who typed the owner's address would otherwise
 *   inherit the owner's role, which is the 2026-08-07 escalation in a new coat. `guestHandoffToken`
 *   already states the rule for the other door — "a guest is not an owner and must not inherit an
 *   owner's authority just because both arrive on the same URL" — and it holds here too.
 *
 * So: a verified token may carry authority; a typed email may not. Both may enter, if the room's
 * own rules let them, and those rules are checked by the controller.
 */
async function verifyEntry(request: Request, token: string | null, shortCode: string | undefined) {
  // `$app/env/private`, not `process.env` — SvelteKit never copies `.env` into the latter, and
  // under Kit 3 this is the module `$env/dynamic/private` is now merely a deprecated shim over.
  const secret = ROOM_JWT_SECRET;
  if (!secret) {
    // No fallback: a default secret here would let anyone who can read this file mint entry.
    console.error('[session] ROOM_JWT_SECRET is not configured; refusing every handoff');
    error(500, 'This room is not configured to accept sign-ins.');
  }

  /*
    A PRESENT token must be valid. Absent is a guest; present-and-broken is somebody holding an
    expired or forged credential, and telling them apart matters — the second is not a guest.
  */
  let claims: { name: string; email: string } | null = null;
  if (token) {
    const verified = verifyHandoffToken(secret, token);
    if (!verified.ok) {
      // One message for every rejection; which check failed is for the log, not the caller.
      console.warn('[session] handoff rejected', { room: shortCode, reason: verified.reason });
      error(403, 'This sign-in link is not valid. Open the room from your account page again.');
    }
    claims = verified.claims;
  }

  let roomConfig: RoomConfig | null = null;
  let membership: RoomMembership | null = null;
  if (shortCode) {
    try {
      /*
        The membership lookup is by the VERIFIED email only. A guest is read with no email at all,
        so the controller answers with the room's settings and no membership — which is exactly the
        authority a self-declared identity should carry: none.
      */
      roomConfig = await readRoomConfig(request, shortCode, claims?.email ?? '');
      membership = claims ? roomConfig.member : null;
    } catch (cause) {
      // Fail CLOSED. `roomRoleFor(null)` is `member`, the safe answer to "cannot tell".
      console.error('[session] could not read the membership; entering as a member', cause);
    }
  }

  if (isBannedFromRoom(membership)) {
    console.warn('[session] refused a banned member', { room: shortCode, email: claims?.email });
    error(403, 'You do not have access to this room.');
  }

  if (roomConfig && isShutOutByRoomState(roomConfig.room.state, membership)) {
    console.warn('[session] refused entry to a closed room', { room: shortCode });
    error(403, 'This room is closed.');
  }

  return { claims, roomConfig, membership };
}

export const load: PageServerLoad = async ({ url, request }) => {
  ensureDatabase();

  const shortCode = url.searchParams.get('id')?.trim();
  const token = url.searchParams.get('jwtSite');
  const { claims, roomConfig, membership } = await verifyEntry(request, token, shortCode);
  const settings = roomConfig?.settings ?? {};

  /*
    The reference's prefill, in its own order:

      globals.loginNick  -> this.nick     (`?name=`)
      globals.loginEmail -> this.email    (`?email=`)
      …then on the token path:
      this.nick  = preferences.savedNick || decodedPassedToken.name
      this.email = this.email            || decodedPassedToken.email
      this.email && e && (this.readOnlyEmail = !0)

    `?name=` and `?email=` win over the token because that is the order it assigns them in.
  */
  const prefill: Prefill = {
    token: token ?? '',
    shortCode: shortCode ?? '',
    name: (url.searchParams.get('name') ?? claims?.name ?? '').trim(),
    email: (url.searchParams.get('email') ?? claims?.email ?? '').trim(),
    /* `this.email && e && (readOnlyEmail = !0)` — only a TOKEN locks the field. A guest types
       their own, which is the reference's ordinary public arrival. */
    readOnlyEmail: Boolean(claims?.email),
    /*
      `'a' !== decodedPassedToken.perms && sessData.disableEditingUsername`. `'a'` is the presenter
      permission and that is not a guess — `loginToRoom` sets `isPresenter: 'a' === o.perms` from
      the same claim, and this room maps that membership to `staff`.
    */
    disableEditingUsername:
      roomRoleFor(membership) !== 'staff' && settings.disableEditingUsername === true,
    usernameInstructions: String(settings.usernameInstructions ?? ''),
    showPasswordField: settings.showPasswordField === true,
    hasRequiredPhoneInLogin: settings.hasRequiredPhoneInLogin === true,
    customEnterDisclosure: String(settings.customEnterDisclosure ?? ''),
    disableLoginForm: url.searchParams.get('dlf') === '1',
    roomTitle: roomConfig?.room.name ?? '',
    /*
      Sanitised HERE, on the server, rather than at the template. This string is owner-authored and
      renders on a page reachable WITHOUT authentication, so an owner — or anyone who reaches the
      settings write path — could otherwise put script on an unauthenticated route. The reference
      hands it straight to `innerHtml`; we do not, and that is deliberate.
    */
    roomDescription: sanitizeRoomDescription(String(settings.description ?? '')),
    // The same derivation the roster uses, so the face here is the face in the room.
    avatarUrl: claims ? `https://www.gravatar.com/avatar/${hashEmail(claims.email)}?d=mm` : ''
  };

  return prefill;
};

export const actions: Actions = {
  /** `doLoginCheck()` -> `loginToRoom()` — the Login button, and the only way in. */
  default: async ({ request, cookies, getClientAddress }) => {
    ensureDatabase();

    const form = await request.formData();
    const token = String(form.get('jwtSite') ?? '');
    const shortCode = String(form.get('id') ?? '').trim() || undefined;

    const { claims, roomConfig, membership } = await verifyEntry(request, token, shortCode);
    const settings = roomConfig?.settings ?? {};

    const name = String(form.get('name') ?? '').trim();
    const phone = String(form.get('phone') ?? '').trim();

    /*
      WHOSE EMAIL THIS IS, and it decides everything below.

      A verified token supplies it. Without one the visitor typed it, which is the reference's
      ordinary public arrival and is fine for IDENTIFYING somebody in a chat room — and useless for
      authorising them. The two are kept apart deliberately: `claims` is the only thing that may
      produce a membership, and `roomRoleFor(null)` is `member`.
    */
    const email =
      claims?.email ??
      String(form.get('email') ?? '')
        .trim()
        .toLowerCase();
    if (!email || !name) return fail(400, { message: 'Please fill in your name and email...' });

    /*
      THE DECISION IS THE CONTROLLER'S, and there is exactly one of it.

      `decideRoomEntry` already covers `isLocked`, `banIPList`, `nickFilter`, the three room
      passwords, the free-trial password, `secTok` and `customEnterDisclosure`, and the guest door
      calls the same function. Re-implementing any of it here is how two doors end up disagreeing
      about who may enter — and half of it is impossible here anyway, because the credentials it
      reads may never cross to this application.

      The page has already applied the reference's own CLIENT-side checks with its own messages.
      This is the authoritative pass.
    */
    let decision;
    try {
      decision = await decideRoomEntryRemotely(shortCode ?? '', {
        name,
        email,
        phone,
        password: String(form.get('password') ?? ''),
        secretToken: String(form.get('secTok') ?? ''),
        agreedToDisclosure: form.get('disclosure') === 'on',
        // The room is the only party that saw the browser; this request is server-to-server.
        remoteIp: getClientAddress()
      });
    } catch (cause) {
      /*
        FAILS CLOSED. A controller that cannot be reached means the room cannot know whether this
        person may enter, and "cannot know" is not "yes". Admitting somebody because a network call
        timed out is the one outcome that must never happen.
      */
      console.error('[session] entry check unavailable; refusing', cause);
      return fail(503, { message: 'This room cannot be reached right now. Please try again.' });
    }

    if (!decision.ok) {
      // A room that sets `loginErrorURL` wants its own page, not ours.
      if (decision.redirectTo) redirect(303, decision.redirectTo);
      return fail(400, { message: decision.message });
    }

    /*
      `disableEditingUsername` is enforced HERE as well as disabled in the form. A disabled input is
      a UI state, not an authorization check, and this is where the difference lands: the name
      reaches the roster and rides on every message this member sends.

      A guest has no name to fall back TO, so the typed one stands — there is nothing else, and the
      setting exists to stop somebody CHANGING a name the controller gave them.
    */
    const mayRename =
      !claims || roomRoleFor(membership) === 'staff' || settings.disableEditingUsername !== true;
    const displayName = mayRename && name ? name : (claims?.name ?? name);

    /*
      THE ROLE, and the one line that keeps a typed email from being an authority claim.

      `membership` is null for every tokenless arrival — `verifyEntry` refuses to look one up
      without a verified email — so `roomRoleFor` answers `member`. Somebody typing the owner's
      address gets a chat nickname, not the owner's room.
    */
    const role = roomRoleFor(membership);
    const now = new Date();
    const existing = db.select().from(users).where(eq(users.email, email)).get();

    const account = existing
      ? (db
          .update(users)
          /*
            The controller is where a rename and a role change happen, so the local copy follows it
            on every entry, in both directions. An earlier version promoted on a `site` token and
            refused to demote on a `guest` one — reasoning about the DOOR when the question is about
            the MEMBERSHIP.
          */
          .set({ displayName, status: 'online', role })
          .where(eq(users.id, existing.id))
          .returning()
          .get() ?? existing)
      : db
          .insert(users)
          .values({
            displayName,
            email,
            avatarUrl: `https://www.gravatar.com/avatar/${hashEmail(email)}?d=mm`,
            role,
            status: 'online',
            // No password hash, and `authSource: 'handoff'` to say so on purpose.
            passwordHash: null,
            authSource: 'handoff',
            createdAt: now
          })
          .returning()
          .get();

    /*
      The room goes on the session, so a reload does not need the query string to remember it.

      The third argument used to be a hardcoded `false`, which quietly capped every session at
      ONE_DAY. `createSessionFor` → `setSessionCookie` has always branched THIRTY_DAYS vs ONE_DAY on
      it; what was missing was the switch. The reference's `pue` view binds a checkbox to
      `rememberMe` and posts it, and that checkbox now exists — so this reads it rather than
      deciding for the member.
    */
    createSessionFor(cookies, account.id, form.get('remember') === 'on', shortCode ?? null);
    redirect(303, shortCode ? `/?room=${encodeURIComponent(shortCode)}` : '/');
  }
};
