import { capturePath, hasCapture, readCapture } from './reference-capture';
import { describe, expect, it } from 'vitest';
import { render as ssr } from 'svelte/server';
import Page from '../routes/(app)/account/rooms/[id]/[[tab]]/+page.svelte';
import { ROOM_SETTINGS } from './room-settings-schema';
import { shapeOf, sideBySide } from './dom-shape';
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
const REFERENCE = 'mising/file2';

/**
 * Line ranges in `file2`, 1-based and inclusive, established by reading its structure.
 *
 * Each pane range runs from the line carrying its own `<div class="tab-pane …">` to the line
 * BEFORE the `</div>` that closes it — the capture puts that close and the next pane's open on one
 * line (file2:851, 858, 883, 895, 980), and closing tags are ignored by `shapeOf` anyway.
 *
 * Settings ended at 2506 — the `<hr>` before the DON'T TOUCH heading — while its pane actually runs
 * to file2:2890 and `ourSection` returns our settings pane WHOLE. Two slices that stop in different
 * places cannot be compared, so the range now covers the pane the way the other six do. Most of
 * what that adds is the `donttouchShow` block (file2:2509), which carries `ng-hide` and drops out
 * on both sides; what it really adds to the comparison is the heading and its toggle.
 */
const SECTIONS = [
  { name: 'tab strip', tab: 'users', from: 1, to: 26 },
  { name: 'Users', tab: 'users', from: 27, to: 850 },
  { name: 'Text List', tab: 'text-list', from: 851, to: 857 },
  { name: 'Branding', tab: 'branding', from: 858, to: 882 },
  { name: 'SSO Setup', tab: 'sso', from: 883, to: 894 },
  { name: 'User Stats', tab: 'stats', from: 895, to: 979 },
  { name: 'Settings', tab: 'settings', from: 980, to: 2890 }
] as const;

/**
 * The worst each section is allowed to be.
 *
 * These are MEASUREMENTS, not targets — every one starts at whatever the section scores today and
 * is only ever lowered. Zero means matched.
 *
 * The previous set (22 / 3 / 2 / 99 / 7 / 46 / 2176) was stale, and four of the seven were measuring
 * the harness rather than the page: the fixture's tab objects were missing `strip`, the tab strip
 * slices did not cover the same region on both sides, `hidden` dropped an element but kept its
 * children while `ng-hide` dropped the subtree, and `active` came off the pane on our side only.
 * Every number below is what the section scores with those four fixed. None of them went UP.
 */
const BASELINE: Record<string, number> = {
  'tab strip': 0,
  Users: 2,
  'Text List': 0,
  Branding: 0,
  'SSO Setup': 0,
  'User Stats': 6,
  Settings: 16
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
/*
  Guarded, because this runs at MODULE SCOPE. An unguarded read here threw during import and took
  the whole suite down with a bare ENOENT, so the reason was buried in a stack trace rather than
  reported as a missing capture. The skipIf on the describe below never runs if this line throws
  first, which is why the guard has to be here as well as there.
*/
const REFERENCE_USERS = hasCapture(REFERENCE) ? referenceUsers(readCapture(REFERENCE)) : [];

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
        /*
          The reference's OWN six tabs and labels (file2:4-21). SECTIONS includes 'tab strip',
          which is not a tab, and shortens Branding's label.

          `strip` is REQUIRED, not decorative: the page renders the strip from
          `data.tabs.filter((t) => t.strip)` (+page.svelte:915), so six tab objects without it
          filtered down to none and our `<ul>` came out empty — which is how the tab strip scored
          15 of 15 differing against a strip it was rendering perfectly well in the real app. The
          value is `true` for all six because all six ARE in the captured `<ul>` (file2:4-21);
          Marketplace, the one `strip: false` entry in the page's own ALL_TABS
          (+page.server.ts:89), is not in that `<ul>` and is not in this fixture either.

          `visible: false` on Text List and SSO Setup is the capture's own `ng-hide`
          (file2:7 `ng-show="sess.twillioApiToken"`, file2:13 `ng-show="sess.authMode=='sso'"`).
        */
        tabs: [
          { id: 'users', label: 'Users', visible: true, strip: true },
          { id: 'text-list', label: 'Text List', visible: false, strip: true },
          { id: 'branding', label: 'Branding (Logo / Landing Page)', visible: true, strip: true },
          { id: 'sso', label: 'SSO Setup', visible: false, strip: true },
          { id: 'stats', label: 'User Stats', visible: true, strip: true },
          { id: 'settings', label: 'Settings', visible: true, strip: true }
        ],
        entitlements: {},
        /*
          The tenant's OWN values, not an empty room.

          `{}` made every editable print "empty" or "No", while the capture prints "Yes!" on seven
          checkboxes and «0» on the simulated count — eight text rows that could never match
          whatever the page did. The values are the schema's `captured` column, which is the
          reference controller's own rendered state; cross-checked row by row against file2 for
          980-1740, where the only «Yes!» are rosterVisibleToViewers (1118),
          rosterCountVisibleToViewers (1154), hasQAOnAlerts (1286), sendReportEmails (1494),
          archiveAlertsLog (1600), archiveChatLog (1608) and enableVideoPlayer (1631), plus
          simUserCount 0 (1161) and tokenExpiresIn "1d" (1007).

          `capturedIsDisplayOnly` entries are EXCLUDED: for authMode and webinarDate the captured
          text is what the reference DISPLAYED, not what it stored, and feeding a display string
          back in as a value is how authMode once got seeded with a whole sentence. Leaving
          authMode unset is also what keeps the seven `ng-hide` rows hidden on both sides.
        */
        settings: Object.fromEntries(
          ROOM_SETTINGS.filter((d) => !d.capturedIsDisplayOnly && d.captured !== null).map((d) => [d.name, d.captured])
        ),
        landingHtml: '',
        users: USERS,
        unsupportedFilter: null,
        visits: [],
        stats: [],
        links: { room: '', vanity: '', unique: '', registration: '', appPair: '', logo: null },
        badges: [],
        schema: ROOM_SETTINGS,
        fieldByName: Object.fromEntries(ROOM_SETTINGS.map((d) => [d.name, d])),
        featureReadiness: {},
        featureDefs: [],
        /*
          The capture's OWN shortcode (file2:1003), not a blank.

          Empty, the page renders `<span id="mg-shortcode"></span>` — a classless empty span, which
          is exactly the ripple-pair shape `dom-shape.ts` drops. So BOTH the span and its text row
          vanished from our column while the reference kept `span` + its text, and the two columns
          went out of step from there. The value is the reference's, room id and all.
        */
        wordpressShortcode:
          "[protradingroom room='6a6529b318781e20ed81947d' key='' link_text='Enter Room' mode='urlv3']",
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
    const ul = body.indexOf('<ul class="nav nav-tabs');
    expect(ul, 'our tab strip must render').toBeGreaterThan(-1);

    /*
      The slice has to cover what the reference slice covers, or the difference is the cut.

      `SECTIONS`'s 'tab strip' is file2:1-26, which is THREE things: the wrapping
      `<div class="ng-isolate-scope">` on line 1, the `<ul class="nav nav-tabs">` on lines 2-25,
      and the OPENING `<div class="tab-content">` on line 26. Returning our `<ul>` alone compared
      15 reference nodes against 1 of ours, so the wrapper and the tab-content div read as
      divergences no matter what the page did.

      Ours are +page.svelte:911 (a classless `<div>`, which normalises to the same `div` as the
      reference's, whose only class is Angular bookkeeping), :912 and :924.
    */
    const open = body.lastIndexOf('<div>', ul);
    expect(
      body
        .slice(open, ul)
        .replace(/<!--[\s\S]*?-->/g, '')
        .trim(),
      'the wrapper found immediately around our tab strip'
    ).toBe('<div>');

    const content = body.indexOf('<div class="tab-content"', ul);
    expect(content, 'our tab-content must open right after the strip').toBeGreaterThan(-1);
    // to the END of that opening tag only — file2:26 stops there too, and line 27 is the first pane
    return body.slice(open, body.indexOf('>', content) + 1);
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

/**
 * `active` on the pane itself says WHICH TAB THE CAPTURE HAD OPEN, not what the pane contains.
 *
 * The reference is one page rendered with Users selected, so file2:27's pane is
 * `tab-pane ng-scope active` and the other five are `tab-pane ng-scope`. Ours renders only the
 * selected pane and it is always `tab-pane active` (+page.svelte:925). Stripping the class on our
 * side alone — which is what this did — made Users' very first element a guaranteed divergence,
 * for no reason but the capture's starting tab. It comes off BOTH sides or neither.
 */
const withoutPaneActive = (nodes: ReturnType<typeof shapeOf>) =>
  nodes.map((n) =>
    n.kind === 'el' && n.classes?.includes('tab-pane')
      ? { ...n, classes: n.classes.filter((c) => c !== 'active') }
      : n.kind === 'text' &&
          (n.value?.startsWith("[protradingroom room='") || n.value === 'Hidden — reauthenticate to reveal')
        ? { ...n, value: '[integration credential redacted]' }
        : n
  );

describe.skipIf(!hasCapture(REFERENCE))('manage page, section by section', () => {
  it('has the reference to compare against', () => {
    expect(hasCapture(REFERENCE), `reference markup missing at ${capturePath(REFERENCE)}`).toBe(true);
  });

  const lines = hasCapture(REFERENCE) ? readCapture(REFERENCE).split('\n') : [];
  const scoreboard: string[] = [];

  for (const section of SECTIONS) {
    it(`${section.name} matches the reference`, () => {
      const reference = withoutPaneActive(
        shapeOf(lines.slice(section.from - 1, section.to).join('\n'), { angular: true })
      );
      const ours = withoutPaneActive(shapeOf(ourSection(section)));

      const { rows, differing } = sideBySide(reference, ours);
      scoreboard.push(`${section.name.padEnd(14)} ${String(differing).padStart(5)} / ${rows.length}`);

      if (differing > 0) {
        /*
          The window is centred on the FIRST divergence, not on row 0.

          `sideBySide` is a positional zip, not an LCS diff, so one element present on one side and
          not the other pushes every row after it out of step and the whole tail reads as a
          divergence. The number to act on is therefore always the first one: fix that, and the
          count typically falls by hundreds. Printing rows 0-39 hid it for any section whose first
          divergence sits past row 40 — Users' two are at rows 166 and 345 — and showed 40 rows of
          agreement instead.
        */
        const first = Math.max(0, rows.findIndex((r) => r.startsWith(' ! ')) - 4);
        console.log(`\n=== ${section.name} — reference | ours (from the first divergence) ===`);
        if (first > 0) console.log(`   … ${first} matching rows above`);
        console.log(rows.slice(first, first + 40).join('\n'));
        if (rows.length > first + 40) console.log(`   … ${rows.length - first - 40} more lines`);
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
