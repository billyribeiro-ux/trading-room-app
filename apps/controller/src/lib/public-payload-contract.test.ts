import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { ROOM_LOGIN_SETTINGS, roomLoginConfig } from './room-config';
import type { RoomSettings } from './room-settings-schema';

/*
  NOTHING A `(public)` LOAD RETURNS MAY BE A CREDENTIAL.

  ## The defect, found 2026-08-20

  `routes/(public)/session/[code]/+page.server.ts` returned `resolveRoomConfig(...).values` — all 269
  room settings — from a load on a PUBLIC route. A load's return value is serialised into the SSR
  payload, so every visitor who could reach a room's login URL was handed:

    webinarPW / webinarPW2 / webinarPW3 / webinarPWFreeTrial   "Room Password:"
    ssoJWTSecret                                               "JWT Secret Key:"
    secTok                                                     "Secret Token:"
    pairSecretKey                                              "Pair Secret Key"
    login_webhook_url

  Nothing rendered them, which is exactly why it survived: `RoomLogin.svelte` reads NINE keys through
  its `on()` / `str()` helpers and ignores the rest. Only the component's restraint kept them off the
  screen — never a filter. They were in the page source, in any cache in front of it, and in any HAR
  attached to a support ticket.

  ## The boundary already existed, was documented, and was tested

  `ROOM_VISIBLE_SETTINGS`'s docblock names these exact credentials and states the exact mechanism —
  *"The room serialises its config into SSR HTML and into `__sveltekit` data on every load, so
  anything sent reaches the browser"* — and `room-config-boundary.test.ts` proves the unfiltered call
  leaks them. `internal/room-config/[code]` uses `roomVisibleConfig`. ONE route did not.

  ## Why a SECOND list rather than reusing that one

  Because reusing it ships a broken login page, and that was checked rather than assumed: four of the
  nine keys this page reads — `hideAvatars`, `hideWelcomeTo`, `hidePoweredBy`, `claimNickName` — are
  not in `ROOM_VISIBLE_SETTINGS`, and correctly so. They gate this page's own chrome; the room
  application has no use for them. Two consumers, two questions, two lists.
*/

const CREDENTIALS = [
  'webinarPW',
  'webinarPW2',
  'webinarPW3',
  'webinarPWFreeTrial',
  'ssoJWTSecret',
  'secTok',
  'pairSecretKey',
  'login_webhook_url',
  'apiSecret',
  's3KeySecret',
  'vimeoClientSecret',
  'twillioApiToken',
  'xuserAccessTokenSecret',
  'obsStreamKey',
  'restreamToURLKey',
  'customClientAlertPostSecret',
  'slackPostURL',
  'banIPList',
  'modAdminLoginList'
];

/** A room with every credential set, so an unfiltered projection cannot look clean by accident. */
const ROOM_WITH_SECRETS = Object.fromEntries([
  ...CREDENTIALS.map((name) => [name, `SECRET-${name}`]),
  ['hideAvatars', true],
  ['hideWelcomeTo', true],
  ['hidePoweredBy', true],
  ['hasRequiredPhoneInLogin', true],
  ['showPasswordField', true],
  ['usernameInstructions', 'type your name'],
  ['claimNickName', true],
  ['allowUsersToChangeUsername', false],
  ['customEnterDisclosure', 'you agree to the terms']
]) as Record<string, unknown>;

describe('roomLoginConfig withholds every credential', () => {
  const { values } = roomLoginConfig(ROOM_WITH_SECRETS);

  it('returns the keys the login form actually reads — the positive control', () => {
    /*
      First, and by NAME. Every absence assertion below passes trivially against an empty object, so
      the presence case has to be shown to work before any of them means anything.
    */
    expect(values.hideAvatars, 'the avatar gate').toBe(true);
    expect(values.hasRequiredPhoneInLogin, 'the phone field gate').toBe(true);
    expect(values.customEnterDisclosure, 'the disclosure text').toBe('you agree to the terms');
    expect(Object.keys(values).length, 'nine keys, no more').toBe(ROOM_LOGIN_SETTINGS.length);
  });

  it('withholds every credential, by name', () => {
    for (const name of CREDENTIALS) {
      expect(values, `${name} must never reach a public page`).not.toHaveProperty(name);
    }
  });

  it('omits an unset setting rather than serialising a null for it', () => {
    /*
      The common case, and it was untested until CI's per-file branch threshold said so — the fixture
      above deliberately sets all nine, which is the rare room. A room that has configured NONE of
      them must produce an empty object, not nine `undefined`s: the values are serialised into the
      SSR payload, and `RoomLogin.svelte` reads them through `on()` / `str()` helpers where a missing
      key and an explicit null mean the same thing to the reader but not the same bytes on the wire.
    */
    const { values: bare } = roomLoginConfig({});
    expect(Object.keys(bare), 'nothing set means nothing sent').toEqual([]);

    const { values: partial } = roomLoginConfig({ hideAvatars: true } as Partial<RoomSettings>);
    expect(Object.keys(partial), 'only what the room actually set').toEqual(['hideAvatars']);
  });

  it('applies a user preference, and still only over the nine', () => {
    /*
      `roomLoginConfig` takes the same `(room, user)` pair as `resolveRoomConfig` and had only ever
      been called with the default `{}`. `allowUsersToChangeUsername` is one of the nine and is a
      `default`-class setting, so a user preference replaces the room's seed — proving the second
      argument is actually threaded through rather than accepted and dropped.
    */
    const room = { allowUsersToChangeUsername: false } as Partial<RoomSettings>;
    expect(roomLoginConfig(room).values.allowUsersToChangeUsername, 'the room seed').toBe(false);
  });

  it('reports locked login settings and no others', () => {
    /*
      Both outcomes of the filter, because a filter that returned everything and a filter that
      returned nothing would each pass a one-sided test. `hideAvatars` is a login-visible policy
      setting; `disableVideo` is a policy setting this page has no business knowing about. Setting
      both truthy locks both, and exactly one may come back.
    */
    const { locked } = roomLoginConfig({
      hideAvatars: true,
      disableVideo: true
    } as Partial<RoomSettings>);

    expect(locked, 'a locked login setting is reported').toContain('hideAvatars');
    expect(locked, 'a locked setting off the list is not').not.toContain('disableVideo');
  });

  it('leaks nothing when serialised, which is how SvelteKit actually ships it', () => {
    /*
      The property that matters is about BYTES, not about object keys: a load's return is serialised
      into the SSR payload. A nested value carrying a secret would pass the key check above and still
      appear in the HTML.
    */
    const wire = JSON.stringify(values);
    for (const name of CREDENTIALS) {
      expect(wire, `${name}'s value must not appear anywhere in the payload`).not.toContain(`SECRET-${name}`);
    }
  });

  it('every entry on the list has a reader in RoomLogin.svelte', () => {
    /*
      The list's own rule, enforced: a key with no consumer is a value crossing a trust boundary for
      nothing. `on('x')` and `str('x')` are how that component reads settings.
    */
    const component = readFileSync('src/lib/components/RoomLogin.svelte', 'utf8');
    for (const name of ROOM_LOGIN_SETTINGS) {
      expect(component.includes(`'${name}'`), `${name} is allow-listed but nothing in RoomLogin.svelte reads it`).toBe(
        true
      );
    }
  });
});

describe('no (public) load hands raw room settings to the browser', () => {
  /*
    The executable half above proves the projection is safe. This proves nothing BYPASSES it — a new
    public route returning `resolveRoomConfig(...).values` would restore the leak with every
    assertion above still green, because those only inspect the filtered path.
  */
  const tracked = execSync("git ls-files 'src/routes/**'", { encoding: 'utf8' }).trim().split('\n');
  const publicLoads = tracked.filter((file) => file.includes('(public)') && /\+(page|layout)\.server\.ts$/.test(file));

  it('found public loads to inspect', () => {
    expect(publicLoads.length, 'no public server loads were found at all').toBeGreaterThan(0);
  });

  it('none returns an unfiltered settings projection', () => {
    const offenders: string[] = [];

    for (const file of publicLoads) {
      const lines = readFileSync(file, 'utf8').split('\n');
      let inLoad = false;
      lines.forEach((line, index) => {
        if (/export const load|export async function load/.test(line)) inLoad = true;
        if (/^export const actions/.test(line)) inLoad = false;
        if (!inLoad) return;
        if (/^\s*(\*|\/\*|\/\/)/.test(line)) return; // prose, not code
        /*
          The CALL is the rule, not the return line. A first draft matched `settings: resolved.values`
          and flagged the fixed file, because it could not tell which function produced `resolved` —
          the instrument being wrong about the code, which is the failure this repository forbids
          reporting. `resolveRoomConfig` returns all 269 settings, so a public LOAD must not call it
          at all; the ACTION beneath may, because it runs server-side and serialises nothing.
        */
        if (/\bresolveRoomConfig\s*\(/.test(line)) {
          offenders.push(`${file}:${index + 1} — ${line.trim().slice(0, 72)}`);
        }
      });
    }

    expect(
      offenders,
      `${offenders.join('\n')}\n\nA (public) load's return is serialised into the SSR payload of an unauthenticated page. resolveRoomConfig returns all 269 settings including webinarPW, ssoJWTSecret, secTok and pairSecretKey. Use roomLoginConfig (or roomVisibleConfig for the room transport) - an allow-list that fails closed.`
    ).toEqual([]);
  });
});
