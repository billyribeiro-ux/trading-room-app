import { beforeAll, describe, expect, it, vi } from 'vitest';
import { db, ensureDatabase } from '$lib/server/db';
import { users } from '$lib/server/db/schema';

/*
  The controller, stubbed.

  `load` now reads this room's 268 settings from `new-room-control` rather than from a literal it
  carried itself, which means the page payload depends on a service that is not running in a unit
  test. Stubbing the read keeps this file doing its job — pinning the SHAPE the client receives —
  without turning it into an integration test.

  What the controller actually answers is proven where it can be: `room-config-boundary.test.ts`
  in the controller pins which settings may cross at all, and `scripts/two-app-seam-e2e.mjs`
  drives both applications for real.
*/
const CONTROLLER_SETTINGS = { rosterVisibleToViewers: true, userUploads: false } as const;
vi.mock('$lib/server/room-config-client', () => ({
  readRoomConfig: async () => ({
    room: {
      shortCode: '3625',
      name: 'Contract Room',
      state: 'open',
      logoUrl: null,
      publicId: null,
      maxUsers: 0
    },
    settings: CONTROLLER_SETTINGS,
    locked: ['rosterVisibleToViewers'],
    /*
      A real membership, because the fixture account is meant to be a presenter and the room no
      longer takes its word for that. `load` reconciles the stored role against this on every call
      — a `staff` row with no membership is a member, which is the escalation fix working — so a
      stub returning `null` would quietly make every presenter assertion below test a participant.
    */
    member: {
      displayName: 'Contract Probe',
      email: 'page-load-contract@example.test',
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
  })
}));

const { load } = await import('../routes/+page.server');

/*
  A characterization test for the page payload.

  `+page.server.ts` is 1,157 lines - one `load` and 19 form actions - and until this file it had
  no behavioural coverage at all. The 197 other tests are pure functions, render contracts, and
  source-text pins; `authorization-contract.test.ts` reads the server as a STRING and asserts
  substrings, which does not execute anything.

  That matters because of what happens next. `docs/CUTOVER-ROOM-TO-API.md` replaces this whole
  server layer with calls to the Rust API. Without this file, a green suite after that rewrite
  would prove only that the pure functions still work - the page could fail to load at all and
  every test would still pass.

  So this pins the CONTRACT rather than the implementation: the exact set of keys the client
  receives and the shape of each one. It is written to survive the cutover unchanged. If it has
  to be edited to make the API-backed `load` pass, that edit is the client breaking, and the diff
  is where to look.
*/

/** `load`'s own parameter type is SvelteKit-internal; this is the subset it actually reads. */
type LoadArgs = Parameters<typeof load>[0];

const SESSION_ID = 'page-load-contract-session';

let locals: App.Locals;

beforeAll(() => {
  ensureDatabase();

  // A real row: `load` joins settings and reads `user.id`, so a stub object would exercise a
  // different path than production does.
  const user = db
    .insert(users)
    .values({
      displayName: 'Contract Probe',
      email: 'page-load-contract@example.test',
      role: 'staff',
      passwordHash: 'scrypt$00$00',
      createdAt: new Date()
    })
    .returning()
    .get();

  // `roomShortCode` is on the session because the controller decides which room you are in; a
  // load without one redirects to the front door rather than guessing.
  locals = { user, sessionId: SESSION_ID, roomShortCode: '3625' } as App.Locals;
});

async function pageData() {
  // `depends` is a no-op here: it registers an invalidation key and returns nothing.
  // `request` keys the config client's per-request cache; any stable object works here.
  const data = await load({
    depends: () => {},
    locals,
    request: new Request('http://room.test/')
  } as unknown as LoadArgs);

  // SvelteKit types a `load` return as possibly `void`, because a load may legitimately return
  // nothing. This one never does, and asserting that here is what lets every assertion below
  // read a property instead of guarding for it.
  if (!data) throw new Error('load returned nothing; the page would render with no data');
  return data;
}

describe('page load contract', () => {
  it('returns exactly the keys the client destructures', async () => {
    const data = await pageData();

    // Sorted so a reordering of the return object is not a failure, but an addition or a
    // removal is. Both matter: the client reads `data.<key>` directly.
    expect(Object.keys(data).sort()).toMatchInlineSnapshot(`
      [
        "activePoll",
        "alertQuestions",
        "alerts",
        "canEditNotes",
        "connectedUsers",
        "files",
        "lockedSettings",
        "mediaWsUrl",
        "messages",
        "notes",
        "notesEnabled",
        "privateChats",
        "room",
        "savedPolls",
        "sessData",
        "sessionHandle",
        "settings",
        "user",
      ]
    `);
  });

  it('never leaks the session credential itself', async () => {
    const data = await pageData();

    // `sessionHandle` is a one-way digest. The raw `ptr_connection` value used to be sent to the
    // browser and put in a third-party upload URL, which is how it reached access logs, proxies,
    // `Referer` headers and browser history.
    expect(JSON.stringify(data)).not.toContain(SESSION_ID);
    expect(data.sessionHandle).toEqual(expect.any(String));
    expect(data.sessionHandle).toHaveLength(32);
  });

  it('never puts the password hash in the page payload', async () => {
    const data = await pageData();

    /*
      This is the defect this file was written to find, and it was there: `connectedUser` was
      built as `{...requireUser(locals)}`, which spread the entire `users` row - including
      `password_hash` - into the payload. The scrypt digest of the connected account was
      serialised into the SSR HTML and into `__sveltekit` data on every load, so it reached the
      browser, any cache in front of it, and any HAR attached to a support ticket.

      Pinned as an exact key set rather than as "does not contain scrypt$": a hash format can
      change, and an allow-list is the only form of this assertion that also catches the NEXT
      sensitive column somebody adds to `users`.
    */
    expect(Object.keys(data.user).sort()).toEqual([
      'avatarUrl',
      // One of the five `permissions_json` keys. Decides the notes editor; was decided by role.
      'canEditNotes',
      'createdAt',
      // `archivesAvailableTo()`'s individual block.
      'denyArchivesAccess',
      'displayName',
      'email',
      'emailHash',
      // Reveals the roster, and admits the row into it.
      'hasAdminChat',
      /*
        The three MEDIA permissions. They already crossed the seam and were dropped here; the
        reference feeds all three straight into its admission,
        `isPresenter || hasCam || hasMic || hasScreen` (`joinsMediaAsProducer`).

        They are not secrets - they are this member's own standing in this room, which the UI has
        to render to decide whether to show a mic button at all. The allow-list exists to stop
        `users` columns leaking, and these are not `users` columns.
      */
      'hasCam',
      'hasMic',
      'hasScreen',
      'id',
      // `r.isFT` - "Only select from Trials?". Per room, from the controller's membership row.
      'isFT',
      // Whether the controller knows this person as a member of this room at all.
      'isMember',
      // Role 1 WITH `nonPresenter` - the reference's "Admin", which is not a presenter.
      'isNonPresenterAdmin',
      // `r.isP` - four gates read the presenter flag off the entry, not off `role`.
      'isP',
      /*
        The roster's location line. Always '' from the server — it is resolved by the BROWSER and
        sent back, and it is presenter-only on render (`locationVisibleTo`). Present here so the
        page-load roster and the SSE roster are one shape.
      */
      'locStr',
      // Chat-muted (role 3) carries a boolean of its own on the membership row.
      'muted',
      // `user.restrictPMUser` - the reference's per-member "Disallow User2User PM".
      'restrictPmUser',
      'role',
      // The controller's numeric per-room role. Null for a guest, who has no membership.
      'roomRole',
      'status',
      // The identity the per-row roster gate compares against.
      'userXrefID'
    ]);

    // Belt and braces: the whole payload, not just `user`. `connectedUsers` carries the same
    // object, and a future roster would carry other people's.
    expect(JSON.stringify(data)).not.toContain('scrypt$');
    expect(JSON.stringify(data)).not.toContain('passwordHash');
  });

  it('gives saved polls the exact shape PollPanel reads', async () => {
    const data = await pageData();

    // `{id, q, choices}` and nothing else - `PollPanel.svelte` uses `poll.id` as the `{#each}`
    // key and the delete argument, `poll.q` as the row label, and `poll.choices` for Load.
    // The API's `GET /rooms/{id}/saved-polls` already returns exactly these three fields.
    for (const poll of data.savedPolls) {
      expect(Object.keys(poll).sort()).toEqual(['choices', 'id', 'q']);
      expect(Array.isArray(poll.choices)).toBe(true);
    }
  });

  it('marks a staff account as able to edit notes', async () => {
    const data = await pageData();

    // The one capability the payload carries directly. After the cutover this comes from
    // `room_members.can_edit_notes` rather than from a global role column, and it must not
    // change value for the same person.
    expect(data.canEditNotes).toBe(true);
  });
});
