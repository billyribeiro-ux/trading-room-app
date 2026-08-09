import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import Page from '../routes/(app)/account/rooms/[id]/+page.svelte';
import { ROOM_SETTINGS } from './room-settings-schema';

/**
 * The manage user row, element for element, against `must-match/match`.
 *
 * That capture is ONE row and it is the OWNER's (role 0). Almost nothing in it paints: the
 * checkbox is `ng-show="user.role!==0"`, all five permission icons are `ng-show` on flags the owner
 * does not have, the four `fa-folder-o`/`fa-mobile` icons are `ng-show="false"` outright, and the
 * entire Actions dropdown is `ng-hide="user.role==0"`. Every one of them carries `ng-hide` in the
 * capture, which AngularJS backs with `display: none !important`.
 *
 * So the comparison drops `ng-hide` elements on the reference side and `hidden` elements on ours,
 * and asks what is LEFT. That is the honest question — two DOMs that paint the same thing — and it
 * is the one a screenshot would answer.
 *
 * Comparing our PARTICIPANT row against this would report a dozen differences that are really just
 * two different users, which is why the fixture below is an owner.
 */

const REFERENCE = '/Users/billyribeiro/Desktop/new-room/must-match/match';

/**
 * Tags in document order, skipping any element hidden by `ng-hide`/`hidden` AND its whole subtree —
 * a hidden element's children do not paint either. Framework-only classes are dropped so the
 * comparison is about appearance rather than about AngularJS bookkeeping.
 */
function shapeOf(html: string, hiddenBy: 'ng-hide' | 'hidden'): string[] {
  const source = html.replace(/<!--[\s\S]*?-->/g, '');
  const out: string[] = [];
  const stack: string[] = [];
  const skip: number[] = [];
  const tagRe = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g;

  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(source))) {
    const [, closing, tag, attrs, selfClose] = m;
    const isVoid = /^(br|img|input|hr|meta|link|source)$/i.test(tag) || selfClose === '/';

    if (closing) {
      stack.pop();
      if (skip.length && skip[skip.length - 1] === stack.length) skip.pop();
      continue;
    }

    const cls = /(^|\s)class="([^"]*)"/.exec(attrs ?? '')?.[2] ?? '';
    /*
      `(^|\s)hidden(\s|=|$)` and NOT `\bhidden\b`: a word boundary also matches inside
      `aria-hidden`, which every icon on this row carries, and that silently hid the lot.
    */
    const isHidden =
      hiddenBy === 'ng-hide'
        ? /(^|\s)ng-hide(\s|$)/.test(cls)
        : /(^|\s)hidden(\s|=|>|$)/.test(attrs ?? '');

    if (!skip.length && !isHidden) {
      const keep = cls
        .split(/\s+/)
        .filter(Boolean)
        .filter((c) => !/^ng-/.test(c));
      out.push(`${tag}${keep.length ? '.' + keep.sort().join('.') : ''}`);
    }

    if (!isVoid) {
      if (isHidden && !skip.length) skip.push(stack.length);
      stack.push(tag);
    }
  }
  return out;
}

/** The owner, matching the captured row: role 0, no permissions, nothing set. */
const ownerRow = {
  id: 1,
  displayName: 'Billy Ribeiro',
  email: 'billy@example.com',
  role: 0,
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
  lastLoginAt: null
};

function ourRow(): string {
  const body = render(Page as never, {
    props: {
      data: {
        room: { id: 1, shortCode: '3625', name: 'Live Room', publicId: 'abc', state: 'open' },
        launchUrl: 'http://127.0.0.1:5174/session?id=3625',
        tab: 'users',
        tabs: [{ id: 'users', label: 'Users', visible: true, strip: true }],
        entitlements: {},
        settings: {},
        landingHtml: '',
        users: [ownerRow],
        unsupportedFilter: null,
        stats: [],
        links: { room: '', vanity: '', unique: '', registration: '', appPair: '', logo: null },
        badges: [],
        schema: ROOM_SETTINGS,
        fieldByName: Object.fromEntries(ROOM_SETTINGS.map((d) => [d.name, d])),
        featureReadiness: {},
        wordpressShortcode: '',
        apiScopes: []
      },
      form: null
    } as never
  }).body;

  // the row itself, not the page around it
  const tbody = body.slice(body.indexOf('<tbody'), body.indexOf('</tbody>'));
  const from = tbody.indexOf('<tr');
  expect(from, 'the rendered page must contain a user row').toBeGreaterThan(-1);
  return tbody.slice(from);
}

describe('the manage user row, side by side with must-match/match', () => {
  it('has the capture to compare against', () => {
    expect(() => readFileSync(REFERENCE, 'utf8')).not.toThrow();
  });

  it('reads a real shape out of the capture', () => {
    /*
      Guard against a vacuous pass. If the walker ever returns nothing — a changed capture, a
      regex that stops matching — then `[] === []` and the comparison below goes green while
      comparing nothing at all. These are the elements that survive `ng-hide` in that row,
      counted by hand off `must-match/match`.
    */
    const reference = shapeOf(readFileSync(REFERENCE, 'utf8'), 'ng-hide');
    expect(reference).toEqual(['tr', 'td', 'td', 'img.thumb24', 'br', 'td', 'td', 'span', 'td']);
  });

  it('paints the same elements, in the same order', () => {
    const reference = shapeOf(readFileSync(REFERENCE, 'utf8'), 'ng-hide');
    const ours = shapeOf(ourRow(), 'hidden');

    expect(ours.length, 'the rendered row must not be empty').toBeGreaterThan(0);

    // printed on failure, because "expected 9 to be 11" is not a diagnosis
    if (reference.join('|') !== ours.join('|')) {
      const rows: string[] = [];
      for (let i = 0; i < Math.max(reference.length, ours.length); i++) {
        const a = reference[i] ?? '—';
        const b = ours[i] ?? '—';
        rows.push(`${a === b ? ' ' : '✗'} ${String(i).padStart(2)}  ${a.padEnd(28)} | ${b}`);
      }
      console.log('\n=== reference | ours ===\n' + rows.join('\n') + '\n');
    }

    expect(ours).toEqual(reference);
  });
});
