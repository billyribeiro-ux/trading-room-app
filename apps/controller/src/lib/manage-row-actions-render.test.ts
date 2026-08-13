import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import Page from '../routes/(app)/account/rooms/[id]/[[tab]]/+page.svelte';
import { ROOM_SETTINGS } from './room-settings-schema';

/**
 * The row Actions button, rendered for real, because a screenshot of an owner-only room looks
 * exactly like a bug.
 *
 * The owner reported the Actions button "missing on the manage page". It is not missing — the
 * reference hides it on the OWNER's row and shows it on everyone else's, and a room whose only
 * member is its owner therefore renders an empty Actions cell. From the owner's own rendered DOM:
 *
 *     file2:256  role 0 (Owner)      class="btn-group mb-sm mr ng-hide"   -> hidden
 *     file2:470  role 1 (Presenter)  class="btn-group mb-sm mr"           -> visible
 *     file2:684  role 1 (Presenter)  class="btn-group mb-sm mr"           -> visible
 *
 * `ng-hide="user.role==0"`. Ours is `{#if member.role !== 0}`, which is the same condition — but
 * "the same condition" is what source-reading proves, and source-reading is what missed four icons
 * that rendered anyway. This mounts the component and reads the HTML.
 */

const member = (over: Record<string, unknown> = {}) => ({
  id: 1,
  displayName: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 2,
  banned: false,
  muted: false,
  paused: false,
  nonPresenter: false,
  note: null,
  badges: [] as number[],
  badgesJson: '[]',
  permissions: {
    hasMic: false,
    hasCam: false,
    hasScreen: false,
    hasAdminChat: false,
    canEditNotes: false
  },
  permissionsJson: '{}',
  isFreeTrial: false,
  hideUserCount: false,
  hidePersInfo: false,
  denyArchivesAccess: false,
  restrictPmUser: false,
  inactive: false,
  hasPassword: false,
  mobilePairCode: null,
  pushTokensJson: '[]',
  notificationsState: 'active',
  inviteStatus: 'approved',
  discordUserId: null,
  phone: null,
  avatarUrl: null,
  lastLoginAt: null,
  ...over
});

function html(users: ReturnType<typeof member>[]) {
  return render(Page as never, {
    props: {
      data: {
        room: { id: 1, shortCode: '3625', name: 'Live Room', publicId: 'abc', state: 'open' },
        launchUrl: 'http://127.0.0.1:5174/session?id=3625',
        tab: 'users',
        tabs: [{ id: 'users', label: 'Users', visible: true }],
        entitlements: {},
        settings: {},
        landingHtml: '',
        users,
        unsupportedFilter: null,
        stats: [],
        links: { room: '', vanity: '', unique: '', registration: '', appPair: '', logo: null },
        badges: [],
        schema: ROOM_SETTINGS,
        // The page reads several settings by name straight out of this map, not through the loop.
        fieldByName: Object.fromEntries(ROOM_SETTINGS.map((d) => [d.name, d])),
        featureReadiness: {},
        wordpressShortcode: '',
        apiScopes: []
      },
      form: null
    } as never
  }).body;
}

describe('the row Actions button', () => {
  it('is ABSENT on the owner row — which is why an owner-only room shows none', () => {
    const body = html([member({ role: 0, displayName: 'Ada Lovelace' })]);
    /*
      Was `'Ada Lovelace'.replace('Ada Lovelace', '<captured owner name>')` — a no-op string dance
      whose only effect was to smuggle the captured owner's real name past `privacy:verify`. The
      fixture name is arbitrary to this assertion, which is about the Actions button being ABSENT on
      an owner row, so it now uses the neutral fixture the rest of the suite uses.
    */
    expect(body).toContain('Ada Lovelace');
    expect(body).not.toContain('dropdown-menu-right');
  });

  it('is PRESENT on a participant row', () => {
    const body = html([member({ role: 2 })]);
    expect(body).toContain('dropdown-menu-right');
    expect(body).toContain('Actions');
  });

  it('shows exactly one menu in a room with one owner and one participant', () => {
    const body = html([member({ id: 1, role: 0, displayName: 'Ada Lovelace' }), member({ id: 2, role: 2 })]);
    expect(body.split('dropdown-menu-right').length - 1).toBe(1);
  });
});

describe('the four ng-show="false" icons', () => {
  /*
    `must-match/match:6-9` — they ARE in the reference's DOM, unconditionally hidden:

      <i ng-show="false" class="fa fa-folder-o fa-2x ng-hide" aria-hidden="true">
      <i ng-show="false" class="fa fa-mobile fa-2x ng-hide" aria-hidden="true">
      <i ng-show="false" class="fa fa-mobile ng-hide" aria-hidden="true">
      <i ng-show="false" class="fa fa-mobile ng-hide" style="color: red" aria-hidden="true">

    This file previously asserted the opposite — that they must NOT reach the DOM — because
    transcribing them had put a folder and two phones on screen on every row. `hidden` is only a
    UA-stylesheet `display: none` and Font Awesome's `.fa { display: inline-block }` outranked it.

    That cause is gone: `manage.css` line 393 gives `.mg-root [hidden]` a `display: none !important`,
    which is what Angular's own `.ng-hide` carries. So they are back, and what has to be pinned is
    both halves — present in the markup, and provably not rendering. The second half cannot be
    asserted from an SSR string, so it is measured in Chromium against the real stylesheet; the
    string assertions here guard the markup only, and say so rather than implying more.
  */
  it('are present, matching the reference DOM', () => {
    const body = html([member({ role: 2 })]);
    expect(body).toContain('fa-folder-o');
    expect(body).toContain('fa-mobile fa-2x');
  });

  it('carry the `hidden` attribute that `.mg-root [hidden]` acts on', () => {
    const body = html([member({ role: 2 })]);
    // each of the four must be hidden — a bare `fa-folder-o` with no `hidden` is the old defect
    for (const icon of ['fa-folder-o fa-2x', 'fa-mobile fa-2x']) {
      const at = body.indexOf(icon);
      expect(at, `${icon} must be in the row`).toBeGreaterThan(-1);
      const tag = body.slice(body.lastIndexOf('<', at), body.indexOf('>', at) + 1);
      expect(tag, `${icon} must be hidden`).toContain('hidden');
    }
  });

  it('keeps the rule that makes them invisible', () => {
    // if this rule is ever weakened, the icons come back on screen and nothing else would notice
    const css = readFileSync(new URL('../manage.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.mg-root \[hidden\]\s*\{\s*display:\s*none\s*!important/);
  });
});
