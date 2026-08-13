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
        visits: [],
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

describe('the four conditional icons', () => {
  /*
    `must-match/match:6-9` shows all four in the reference's DOM carrying `ng-hide`:

      i ng-show="false" class="fa fa-folder-o fa-2x ng-hide" aria-hidden="true"
      i ng-show="false" class="fa fa-mobile fa-2x ng-hide" aria-hidden="true"
      i ng-show="false" class="fa fa-mobile ng-hide" aria-hidden="true"
      i ng-show="false" class="fa fa-mobile ng-hide" style="color: red" aria-hidden="true"

    THIS FILE HAS NOW BEEN WRONG ABOUT THESE ICONS TWICE, in opposite directions, and both times the
    error came from treating a render as the source.

    Round one asserted they must NOT reach the DOM at all, because transcribing them had put a
    folder and two phones on every row — `hidden` is only a UA-stylesheet `display: none` and Font
    Awesome's `.fa { display: inline-block }` outranked it.

    Round two, after `manage.css` fixed that with `.mg-root [hidden] { display: none !important }`,
    asserted they are ALWAYS present and ALWAYS carry `hidden` — reading `ng-show="false"` in the
    capture as a literal.

    It is not a literal. `evidence-dumps/TIER1-fetched/views/page.manageSession.html:351-354` shows
    all four INTERPOLATE, e.g. `ng-show="{{sess.fileAccessCaseByCase && user.hasFileAccess}}"`.
    `{{expr}}` rendered the STRING "false" because the captured room had both case-by-case settings
    off and no users loaded. A conditional that never fired is indistinguishable in a render from
    markup that can never fire; only the source separates them.

    So the icons are conditional, and the assertions that they are unconditionally present had to
    go — they pinned a bug. What is left here is the CSS rule, which is still load-bearing for the
    other `hidden` elements in this page. Their real behaviour is covered gate by gate, in both
    states, in `manage-user-row-reference-fields.test.ts`.
  */
  it('keeps the rule that makes any `hidden` icon invisible under Font Awesome', () => {
    // if this rule is ever weakened, hidden icons come back on screen and nothing else would notice
    const css = readFileSync(new URL('../manage.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.mg-root \[hidden\]\s*\{\s*display:\s*none\s*!important/);
  });

  it('renders none of the four for a member with no flags and a room with no case-by-case', () => {
    /* The captured room's exact state, which is why the capture shows four hidden icons. Ours emits
       nothing at all, which paints identically and is what `manage-user-row-sbs` compares. */
    const body = html([member({ role: 2 })]);
    expect(body).not.toContain('fa-folder-o fa-2x');
    expect(body).not.toContain('fa-mobile fa-2x');
  });
});
