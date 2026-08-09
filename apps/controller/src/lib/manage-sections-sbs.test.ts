import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render as ssr } from 'svelte/server';
import Page from '../routes/(app)/account/rooms/[id]/+page.svelte';
import { ROOM_SETTINGS } from './room-settings-schema';
import { shapeOf, render as line, sideBySide } from './dom-shape';
import { referenceUsers } from './reference-users';

/**
 * EVERY section of the manage page, side by side with the owner's own rendered DOM, one at a time.
 *
 * The user table was matched by hand and reached 382 of 384 elements. This does the same thing for
 * the other seven sections, mechanically, so "which section is off and by how much" stops being a
 * question anyone has to ask twice.
 *
 * Each section reports its own count. A section that is BEHIND its recorded baseline fails; a
 * section that is AHEAD updates the baseline. That way progress is ratcheted and a regression in a
 * section nobody is currently working on cannot slip through.
 *
 * The reference lives outside the repo — it carries three real members' names, addresses and
 * gravatar hashes. Absent, this suite says so and stops, rather than passing on nothing.
 */
const REFERENCE = '/Users/billyribeiro/Desktop/new-room/mising/file2';

/** Line ranges in `file2`, 1-based and inclusive, established by reading its structure. */
const SECTIONS = [
  { name: 'tab strip', tab: 'users', from: 1, to: 26 },
  { name: 'Users', tab: 'users', from: 27, to: 850 },
  { name: 'Text List', tab: 'text-list', from: 851, to: 857 },
  { name: 'Branding', tab: 'branding', from: 858, to: 882 },
  { name: 'SSO Setup', tab: 'sso', from: 883, to: 894 },
  { name: 'User Stats', tab: 'stats', from: 895, to: 979 },
  { name: 'Settings', tab: 'settings', from: 980, to: 2506 }
] as const;

/**
 * The worst each section is allowed to be.
 *
 * These are MEASUREMENTS, not targets — every one starts at whatever the section scores today and
 * is only ever lowered. Zero means matched.
 */
const BASELINE: Record<string, number> = {
  'tab strip': 22,
  Users: 3,
  'Text List': 2,
  Branding: 99,
  'SSO Setup': 7,
  'User Stats': 46,
  Settings: 2176
};

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
  permissions: { hasMic: false, hasCam: false, hasScreen: false, hasAdminChat: false, canEditNotes: false },
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

/** The reference's own three rows: one owner, two presenters. */
/*
  Identities read OUT of the capture, never written here.

  These fixtures have to carry the reference's exact names and addresses, because the comparisons
  below match rendered TEXT against it. That was satisfied by hardcoding four real people's names
  and email addresses into this file, where they followed every clone.

  Replacing them with `owner@example.test` was tried first and broke two of these eleven cases,
  which is the useful result: it proves the values are load-bearing rather than decorative. So they
  are parsed from the capture at run time instead — byte-exact for the test, absent from the repo.
*/
const REFERENCE_USERS = referenceUsers(readFileSync(REFERENCE, 'utf8'));

const USERS = [
  member({ id: 1, role: 0, ...REFERENCE_USERS[0] }),
  member({
    id: 2,
    role: 1,
    ...REFERENCE_USERS[1],
    hasPassword: true,
    lastLoginAt: new Date(2026, 7, 7, 17, 5)
  }),
  member({ id: 3, role: 1, ...REFERENCE_USERS[2], hasPassword: true })
];

function ourPage(tab: string) {
  return ssr(Page as never, {
    props: {
      data: {
        room: { id: 1, shortCode: '3625', name: 'Live Room', publicId: 'abc', state: 'open' },
        launchUrl: 'http://127.0.0.1:5174/session?id=3625',
        tab,
        // the reference's OWN six tabs and labels (file2:2-25) — SECTIONS includes 'tab strip',
        // which is not a tab, and shortens Branding's label
        tabs: [
          { id: 'users', label: 'Users', visible: true },
          { id: 'text-list', label: 'Text List', visible: false },
          { id: 'branding', label: 'Branding (Logo / Landing Page)', visible: true },
          { id: 'sso', label: 'SSO Setup', visible: false },
          { id: 'stats', label: 'User Stats', visible: true },
          { id: 'settings', label: 'Settings', visible: true }
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

/**
 * OUR counterpart to a reference slice.
 *
 * The first cut of this compared the reference's 15-element tab strip against our ENTIRE rendered
 * page, and duly reported "652 of 652 differ" for every section — a scoreboard measuring nothing
 * but its own bug. Each section has to be cut out of our render the same way the reference slice
 * was cut out of the dump.
 */
function ourSection(section: { name: string; tab: string }) {
  const body = ourPage(section.tab);

  if (section.name === 'tab strip') {
    const at = body.indexOf('<ul class="nav nav-tabs');
    expect(at, 'our tab strip must render').toBeGreaterThan(-1);
    return body.slice(at, body.indexOf('</ul>', at) + '</ul>'.length);
  }

  // every other section is the tab pane — to ITS OWN closing tag, not the end of the document
  const at = body.indexOf('<div class="tab-pane');
  expect(at, `our ${section.name} pane must render`).toBeGreaterThan(-1);
  return body.slice(at, closeOf(body, at));
}

/**
 * The index just past the `</div>` that closes the element opening at `from`.
 *
 * `lastIndexOf('</div>')` swept up everything to the end of the page, which is how the Text List
 * comparison acquired a `div.panel-footer` the reference slice could not have. Depth counting is
 * the only way to cut a subtree out of flat HTML.
 */
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

describe('manage page, section by section', () => {
  it('has the reference to compare against', () => {
    expect(existsSync(REFERENCE), `reference markup missing at ${REFERENCE}`).toBe(true);
  });

  const lines = existsSync(REFERENCE) ? readFileSync(REFERENCE, 'utf8').split('\n') : [];
  const scoreboard: string[] = [];

  for (const section of SECTIONS) {
    it(`${section.name} matches the reference`, () => {
      const reference = shapeOf(lines.slice(section.from - 1, section.to).join('\n'), { angular: true });
      const ours = shapeOf(ourSection(section)).map((n) =>
        n.kind === 'el' && n.classes?.includes('tab-pane')
          ? { ...n, classes: n.classes.filter((c) => c !== 'active') }
          : n
      );

      const { rows, differing } = sideBySide(reference, ours);
      scoreboard.push(`${section.name.padEnd(14)} ${String(differing).padStart(5)} / ${rows.length}`);

      if (differing > 0) {
        console.log(`\n=== ${section.name} — reference | ours ===`);
        console.log(rows.slice(0, 40).join('\n'));
        if (rows.length > 40) console.log(`   … ${rows.length - 40} more lines`);
        console.log(`\n${section.name}: ${differing} of ${rows.length} differ (baseline ${BASELINE[section.name]})\n`);
      }

      expect(
        differing,
        `${section.name} is WORSE than its baseline of ${BASELINE[section.name]}. ` +
          `Lower the baseline when a section improves; never raise it.`
      ).toBeLessThanOrEqual(BASELINE[section.name]);
    });
  }

  it('reports the scoreboard', () => {
    console.log('\n--- manage page: differing elements per section ---');
    for (const row of scoreboard) console.log('  ' + row);
    expect(scoreboard.length).toBe(SECTIONS.length);
  });
});
