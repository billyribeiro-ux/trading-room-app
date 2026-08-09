/* scratch: prints EVERY differing row of the Users section. Deleted before the run ends. */
import { readFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { render as ssr } from 'svelte/server';
import Page from '../routes/(app)/account/rooms/[id]/+page.svelte';
import { ROOM_SETTINGS } from './room-settings-schema';
import { shapeOf, sideBySide } from './dom-shape';
import { referenceUsers } from './reference-users';

const REFERENCE = '/Users/billyribeiro/Desktop/new-room/mising/file2';
const src = readFileSync(REFERENCE, 'utf8');
const R = referenceUsers(src);

const member = (over: Record<string, unknown> = {}) => ({
  id: 1,
  displayName: 'Ada Lovelace',
  email: 'ada@example.com',
  role: 1,
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

const USERS = [
  member({ id: 1, role: 0, ...R[0] }),
  member({
    id: 2,
    role: 1,
    ...R[1],
    hasPassword: true,
    lastLoginAt: new Date(2026, 7, 7, 17, 5)
  }),
  member({ id: 3, role: 1, ...R[2], hasPassword: true })
];

function ourPage(tab: string) {
  return ssr(Page as never, {
    props: {
      data: {
        room: { id: 1, shortCode: '3625', name: 'Live Room', publicId: 'abc', state: 'open' },
        launchUrl: 'http://127.0.0.1:5174/session?id=3625',
        tab,
        tabs: [
          { id: 'users', label: 'Users', visible: true, strip: true },
          { id: 'text-list', label: 'Text List', visible: false, strip: true },
          { id: 'branding', label: 'Branding (Logo / Landing Page)', visible: true, strip: true },
          { id: 'sso', label: 'SSO Setup', visible: false, strip: true },
          { id: 'stats', label: 'User Stats', visible: true, strip: true },
          { id: 'settings', label: 'Settings', visible: true, strip: true }
        ],
        entitlements: {},
        settings: {},
        landingHtml: '',
        users: USERS,
        unsupportedFilter: null,
        stats: [],
        links: { room: '', vanity: '', unique: '', registration: '', appPair: '', logo: null },
        badges: [],
        schema: ROOM_SETTINGS,
        fieldByName: Object.fromEntries(ROOM_SETTINGS.map((d) => [d.name, d])),
        featureReadiness: {},
        featureDefs: [],
        wordpressShortcode: '',
        apiScopes: []
      },
      form: null
    } as never
  }).body;
}

function closeOf(html: string, from: number) {
  const re = /<(\/?)div\b[^>]*>/g;
  re.lastIndex = from;
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return re.lastIndex;
  }
  return html.length;
}

const withoutPaneActive = (nodes: ReturnType<typeof shapeOf>) =>
  nodes.map((n) =>
    n.kind === 'el' && n.classes?.includes('tab-pane')
      ? { ...n, classes: n.classes.filter((c) => c !== 'active') }
      : n
  );

describe('scratch', () => {
  it('every differing Users row', () => {
    const lines = src.split('\n');
    const reference = withoutPaneActive(
      shapeOf(lines.slice(26, 850).join('\n'), { angular: true })
    );
    const body = ourPage('users');
    const at = body.indexOf('<div class="tab-pane');
    const ours = withoutPaneActive(shapeOf(body.slice(at, closeOf(body, at))));
    const { rows, differing } = sideBySide(reference, ours);
    console.log(`\nUsers differing=${differing} of ${rows.length}`);
    for (const r of rows) if (r.startsWith(' ! ')) console.log(r);
  });
});
