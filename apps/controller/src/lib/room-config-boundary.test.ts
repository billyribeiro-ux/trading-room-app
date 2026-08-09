import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  ROOM_VISIBLE_SETTINGS,
  ROOM_WRITABLE_SETTINGS,
  isRoomWritableSetting,
  resolveRoomConfig,
  roomVisibleConfig
} from './room-config';
import { ROOM_SETTINGS } from './room-settings-schema';

/**
 * The trust boundary between the controller and the room application.
 *
 * The room serialises whatever it is given into SSR HTML and into `__sveltekit` data on every
 * load, so a value that crosses this boundary reaches the browser, any cache in front of it, and
 * any HAR a user attaches to a support ticket. These tests exist because the first version of
 * `/internal/room-config/[code]` returned `resolveRoomConfig()` whole, which would have done
 * exactly that with every credential a configured room holds.
 */

/** A room with one of everything sensitive actually set. */
const CONFIGURED_ROOM = {
  ssoJWTSecret: 'jwt-secret-abc',
  webinarPW: 'hunter2',
  webinarPW2: 'hunter3',
  webinarPWFreeTrial: 'trial-pw',
  deleteAlertPW: 'del-pw',
  allRoomsWelcomeMatPW: 'mat-pw',
  needPasswordForUserNotes: 'notes-pw',
  secTok: '5081b73a690762e2526bc1fef3c46eedf1ec8832',
  apiSecret: 'api-sec',
  slackPostURL: 'https://hooks.slack.com/services/T/B/XXXX',
  login_webhook_url: 'https://example.com/hook',
  runawayRecPostURL: 'https://hooks.slack.com/services/T/B/YYYY',
  pairSecretKey: 'pair-key',
  imgurApiKey: 'imgur-key',
  imgurRapidKey: 'imgur-rapid',
  xuserAccessToken: 'x-tok',
  xuserAccessTokenSecret: 'x-sec',
  s3KeyID: 'AKIAEXAMPLE',
  s3KeySecret: 'AKIA-SECRET',
  vimeoClientSecret: 'vimeo-sec',
  vimeoToken: 'vimeo-tok',
  twillioApiSID: 'AC-sid',
  twillioApiToken: 'tw-tok',
  protextingSecretTok: 'ptx-tok',
  customClientAlertPostSecret: 'alert-sec',
  obsStreamKey: 'obs-key',
  restreamToURLKey: 'restream-key',
  banIPList: '198.51.100.4',
  reportEmail: 'ops@example.com',
  modAdminLoginList: 'a@example.com,b@example.com',
  allowedMemberships: 'gold,platinum',
  stripeEmail: 'billing@example.com',
  // ...and a handful the room legitimately needs, to prove the filter is not simply empty.
  rosterVisibleToViewers: true,
  userUploads: true,
  simUserCount: 12
} as never;

describe('what may cross into the room', () => {
  it('sends only the allow-listed settings', () => {
    const { values } = roomVisibleConfig(CONFIGURED_ROOM);
    for (const name of Object.keys(values)) {
      expect(ROOM_VISIBLE_SETTINGS as readonly string[]).toContain(name);
    }
  });

  it('sends none of the credentials a configured room holds', () => {
    const { values } = roomVisibleConfig(CONFIGURED_ROOM);
    const serialized = JSON.stringify(values);

    for (const [name, secret] of Object.entries(CONFIGURED_ROOM as Record<string, unknown>)) {
      if ((ROOM_VISIBLE_SETTINGS as readonly string[]).includes(name)) continue;
      expect(values).not.toHaveProperty(name);
      // Not just absent under its own key — absent as a value, wherever it might have been copied.
      if (typeof secret === 'string') expect(serialized).not.toContain(secret);
    }
  });

  it('does still send what the room needs, so the filter is not vacuously safe', () => {
    // A boundary that lets nothing through passes every test above and breaks the product.
    const { values } = roomVisibleConfig(CONFIGURED_ROOM);
    expect(values).toMatchObject({ rosterVisibleToViewers: true, userUploads: true, simUserCount: 12 });
  });

  it('proves the unfiltered call would have leaked, so this is a filter and not decoration', () => {
    const unfiltered = resolveRoomConfig(CONFIGURED_ROOM).values;
    expect(unfiltered).toHaveProperty('webinarPW', 'hunter2');
    expect(unfiltered).toHaveProperty('s3KeySecret', 'AKIA-SECRET');
    expect(unfiltered).toHaveProperty('ssoJWTSecret', 'jwt-secret-abc');
  });

  it('omits an unset setting rather than sending null', () => {
    // The room treats absent as off. A null it has to distinguish from false is a second state
    // for no reason.
    const { values } = roomVisibleConfig({});
    expect(Object.keys(values)).toHaveLength(0);
  });

  it('narrows `locked` to the same set', () => {
    // Telling the room a setting is enforced when it will never see the setting is noise, and
    // noise inside a security boundary is how the boundary stops being read.
    const { locked } = roomVisibleConfig(CONFIGURED_ROOM);
    for (const name of locked) expect(ROOM_VISIBLE_SETTINGS as readonly string[]).toContain(name);
  });
});

describe('the allow-list itself', () => {
  it('names only real settings', () => {
    const known = new Set(ROOM_SETTINGS.map((definition) => definition.name));
    for (const name of ROOM_VISIBLE_SETTINGS) expect(known).toContain(name);
  });

  it("matches the generator's ROOM_CONSUMED, which decides the wired flag", () => {
    /*
      Two lists, and they have to agree.

      `ROOM_VISIBLE_SETTINGS` decides what actually crosses to the room.
      `ROOM_CONSUMED` in `scripts/extract-manage-schema.mjs` decides which settings the Manage page
      marks as wired. The generator cannot import this module — this module imports the generated
      schema, and the generator has to run when that file does not exist — so the duplication is
      deliberate and this test is what keeps it honest. A setting marked wired but not sent, or
      sent but marked dead, is a control whose UI lies about it.
    */
    const generator = readFileSync(new URL('../../scripts/extract-manage-schema.mjs', import.meta.url), 'utf8');
    const block = generator.match(/const ROOM_CONSUMED = \[([^\]]*)\]/);
    expect(block, 'scripts/extract-manage-schema.mjs must declare ROOM_CONSUMED').not.toBeNull();
    const declared = [...(block?.[1] ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    expect(declared).toEqual([...ROOM_VISIBLE_SETTINGS].sort());
  });

  it('is entirely marked wired in the generated schema', () => {
    // The flag's documented meaning is "nothing reads it yet". Everything on this list is read.
    const wired = new Set(ROOM_SETTINGS.filter((d) => d.wired).map((d) => d.name));
    for (const name of ROOM_VISIBLE_SETTINGS) {
      expect(wired.has(name), `${name} crosses to the room but is marked unwired`).toBe(true);
    }
  });

  it('has no duplicates', () => {
    expect(new Set(ROOM_VISIBLE_SETTINGS).size).toBe(ROOM_VISIBLE_SETTINGS.length);
  });

  it('contains nothing whose name reads like a credential', () => {
    /*
      A tripwire, not the mechanism. The allow-list is the mechanism; this catches the specific way
      it would most plausibly go wrong — somebody adding `webinarPW` because the room "needs to
      check the password", which it does not: the controller's own login does that before the room
      is ever reached.
    */
    /*
      Narrowed from `URL$` to the endpoint-shaped ones.

      The first version rejected any name ending in URL or Url, which was the wrong test: a public
      app-store listing and a logo address are not credentials, and blocking them would have kept
      Mobile App Info and Benzinga unbuildable for the wrong reason. What matters is a URL that IS
      a secret — a webhook or a post endpoint whose only protection is that nobody knows it.
    */
    const credentialShaped =
      /PW$|PW\d|Secret|secret|Token|token|ApiKey|apiKey|KeyID|KeySecret|[Ww]ebhook|WebHook|_url$|PostURL$|Email$|banIPList|LoginList/;
    for (const name of ROOM_VISIBLE_SETTINGS) {
      expect(name, `${name} reads like a credential`).not.toMatch(credentialShaped);
    }
  });

  it('every entry is a setting some room code actually reads', () => {
    /*
      Recorded so the list cannot quietly accumulate. Each name maps to the gate that consumes it;
      if a consumer is deleted, its entry should go with it rather than keep crossing the boundary.

      This map is a statement of intent, not proof — it agreed with itself while `hideAppInfo` and
      `hasBenzingaNews` sat on the list with no consumer anywhere in the room. What caught that was
      `scripts/room-config-seam-e2e.mjs` flipping one and watching nothing happen.
    */
    const consumers: Record<string, string> = {
      allowUsersToChangeUsername: 'O(9) fallback — a member renaming themselves',
      hideAppInfo: 'O(12) — the paragraph holding the Mobile App Info button',
      ptrMobileAppEnabled: 'the inner gate on that button',
      customMobileAppEnabled: 'the inner gate, and which store links the modal uses',
      customMobileAppAndroidUrl: 'the modal Google Play link when custom is on',
      customMobileAppIOSUrl: 'the modal App Store link when custom is on',
      freeTrialsGetApp: 'whether a trial account may reach the button at all',
      hideMobileCredentials: 'O(13) — the email/pin block inside the modal',
      hasBenzingaNews: 'O(31) sidebar and O(15) navbar — the Benzinga item',
      altBenzingaLogoURL: 'swaps the Benzinga image for a custom one',
      altBenzingaLinkURL: 'replaces the session-derived Benzinga destination',
      rosterVisibleToViewers: 'O(44) block gate, and the per-row gate',
      onlyPresentersVisibleToViewers: 'O(44) block gate, and the per-row gate',
      rosterCountVisibleToViewers: 'O(6) — the Users badge',
      simUserCount: 'added to the headcount in the navbar and the sidebar badge',
      showArchivesToUsers: 'archivesAvailableTo()',
      showArchivesToSpecificPresenters: 'archivesAvailableTo()',
      hideRecs: 'O(6) inside the Archives menu — Recording',
      hideChatLog: 'O(11)/O(12) inside the Archives menu',
      userUploads: 'canPostImages in the composer',
      /*
        Both of these were verified IN THE ROOM before being written here, because the note above is
        precisely about this map agreeing with itself: `filesSectionHidden` is imported at
        `src/routes/+page.svelte:40` and drives `filesHidden` at :569, bound to the Files tab and the
        pane together; `alertSoundButtonFor` is called at :8510 and its answer selects between the
        two buttons at :8643 and :8652. Neither is a name on a list with nothing behind it.
      */
      hideFiles: 'filesSectionHidden() — hides the Files tab AND the #files pane together',
      overwriteCashRegisterSound:
        'alertSoundButtonFor() — picks Set / Remove as alert sound, or neither, per audio row',
      userPM: 'canPM in the roster kebab',
      userToPresenterPM: 'canPM in the roster kebab',
      disablePMForTrials: 'canPM in the roster kebab'
    };
    expect(Object.keys(consumers).sort()).toEqual([...ROOM_VISIBLE_SETTINGS].sort());
  });
});

describe('what the room may WRITE back', () => {
  /*
    A second allow-list, and strictly narrower than the read one.

    Reading a setting exposes it; writing one lets the room change what its owner configured on the
    Manage page. Exactly one setting needs it: `overwriteCashRegisterSound` is chosen from inside
    the room, on the Files pane, which is where the reference puts the control
    (`app-presentationarea.full.js:3084-3086`).
  */
  it('permits exactly the settings on the write list', () => {
    expect([...ROOM_WRITABLE_SETTINGS]).toEqual(['overwriteCashRegisterSound']);
    expect(isRoomWritableSetting('overwriteCashRegisterSound')).toBe(true);
  });

  it('refuses a setting the room may READ but not write', () => {
    // `hideFiles` crosses to the room and is still not writable: a room that could switch it off
    // would be overriding the owner who turned it on.
    expect((ROOM_VISIBLE_SETTINGS as readonly string[]).includes('hideFiles')).toBe(true);
    expect(isRoomWritableSetting('hideFiles')).toBe(false);
  });

  it('refuses a setting that never crosses at all, and an unknown name', () => {
    expect(isRoomWritableSetting('webinarPW')).toBe(false);
    expect(isRoomWritableSetting('ssoJWTSecret')).toBe(false);
    expect(isRoomWritableSetting('')).toBe(false);
    // A `Set` lookup, not a property lookup — so an inherited key is not a way in.
    expect(isRoomWritableSetting('__proto__')).toBe(false);
    expect(isRoomWritableSetting('constructor')).toBe(false);
  });

  it('is a subset of the read list, so the room can see the result of its own write', () => {
    for (const name of ROOM_WRITABLE_SETTINGS) {
      expect(ROOM_VISIBLE_SETTINGS as readonly string[]).toContain(name);
    }
  });

  it('is enforced by the endpoint, together with a presenter check of its own', () => {
    /*
      Read as text, and the limitation is stated rather than hidden.
      `internal/room-setting/[code]/+server.ts` needs a database and `$app/env/private` to execute,
      and every `*.db.test.ts` is excluded from this run because it needs a real PostgreSQL binary.
      What this pins is that none of the three gates has been dropped: the shared-secret token, the
      write allow-list, and a presenter check that does not depend on the room having hidden the
      button.

      The room's own `files-pane-contract.test.ts` EXECUTES the caller and proves it refuses a
      member before any write leaves the room. This is the second lock on the same door.
    */
    const endpoint = readFileSync(
      new URL('../routes/internal/room-setting/[code]/+server.ts', import.meta.url),
      'utf8'
    );
    expect(endpoint).toContain('verifyConfigReadToken(secret, params.code, presented)');
    expect(endpoint).toContain('if (!isRoomWritableSetting(name))');
    expect(endpoint).toContain('membership.roomUser.role === 0 || isRoomPresenter(membership.roomUser)');
    expect(endpoint).toContain("error(403, 'Presenters only.')");
    // A guest has no membership row and therefore no authority.
    expect(endpoint).toContain("error(403, 'Not a member of this room.')");
    // The same suspended-account refusal the config read makes; a suspended room stops writing too.
    expect(endpoint).toContain('account.status !== ACCOUNT_ACTIVE');
  });
});
