import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import Page from '../routes/(app)/account/+page.svelte';

/**
 * The account page rendered for real, so the new controls are proved to reach the DOM rather than
 * proved to exist in the source.
 *
 * `account-actions-contract.test.ts` reads the file as text, which catches a form pointed at an
 * action that is not there and nothing else — it would pass just as happily on markup that never
 * renders. This mounts the component through `svelte/server` and reads the HTML it produces.
 *
 * WHAT THIS CANNOT REACH, stated rather than faked: the `label-warning` "archived" chip. It renders
 * only for a row that survives the filter, and an archived row survives only once
 * `showArchivedRooms` is on — which is client state, set by pressing the toggle, with no prop that
 * reaches it. The predicate behind both is covered directly in `account-sessions-filter.test.ts`;
 * the chip itself is verified by reading, and its class is the one the styles gate maps to the
 * reference's own `div.label.label-warning «archived»`.
 */

/** The load payload's shape, with only the fields this page reads. */
const room = (over: Record<string, unknown> = {}) => ({
  id: 1,
  accountId: 1,
  shortCode: '3625',
  name: 'Live Room',
  state: 'open',
  maxUsers: 2,
  textList: '',
  publicId: 'abc',
  vanitySlug: null,
  uniqueSlug: null,
  logoUrl: null,
  clonedFromId: null,
  archivedAt: null,
  createdAt: new Date(),
  userCount: 0,
  launchUrl: 'http://127.0.0.1:5174/session?id=3625',
  ...over
});

const badge = (over: Record<string, unknown> = {}) => ({
  id: 9,
  accountId: 1,
  label: 'VIP',
  textColor: '#ffffff',
  backgroundColor: '#000000',
  emoji: '*',
  imageUrl: null,
  /* Superseded by the column below, kept because the load still selects the row. */
  darkTheme: false,
  /** NULL = no dark variant nominated, which is every badge until an admin types an id. */
  darkThemeBadgeId: null,
  createdAt: new Date(),
  ...over
});

function html(rooms: unknown[], badges: unknown[]) {
  return render(Page as never, {
    props: {
      data: {
        user: {
          id: 1,
          email: 'owner@example.test',
          displayName: 'Owner',
          accountId: 1,
          emailVerifiedAt: new Date()
        },
        emailUnproved: false,
        profileAuthority: { enabled: false },
        roomCreateRequestId: '90000000-0000-4000-8000-000000000001',
        entitlements: { marketplace: false },
        rooms,
        badges,
        admins: [],
        apiKeys: [],
        apiScopes: []
      },
      form: null
    } as never
  }).body;
}

describe('the Sessions table as rendered', () => {
  const both = [room(), room({ id: 2, shortCode: '999', name: 'Old Room', archivedAt: new Date() })];

  it('leaves an archived room out of the table until the toggle is pressed', () => {
    const out = html(both, []);
    expect(out).toContain('Live Room');
    expect(out, 'the toggle is off on first render, so this row must not be in the DOM').not.toContain('Old Room');
  });

  it('renders BOTH toggle words, with exactly one hidden', () => {
    /*
      Not cosmetic. Collapsing the two spans into one text run measured 102.664px against the
      reference's 102.68 — the reference's button holds three text runs and their spacing is
      measured, not computed from one string.
    */
    const out = html(both, []);
    expect(out).toMatch(/<span[^>]*>Show<\/span>/);
    expect(out).toMatch(/<span hidden[^>]*>Hide<\/span>/);
    // `hidden` on the word that is currently off, and only that one.
    expect(out).not.toMatch(/<span hidden[^>]*>Show<\/span>/);
  });

  it('offers an Archive control that posts to the real action', () => {
    const out = html([room()], []);
    expect(out).toContain('?/setRoomArchived');
    expect(out).toContain('Archive');
    expect(out, 'a live room is offered Archive, not Unarchive').not.toContain('Unarchive');
    expect(out).toContain('value="true"');
  });
});

describe('the Badges table as rendered', () => {
  /**
   * The reference's separator is `&nbsp; | &nbsp;`, which Svelte emits as the CHARACTER, not the
   * entity — so this matches U+00A0 either side of the pipe.
   *
   * Written as an escape rather than as the literal byte on purpose: eslint's
   * `no-irregular-whitespace` rejects the literal, and it is right to. A raw non-breaking space in
   * source is invisible in every diff and in every review.
   */
  const SEPARATOR = /\u00a0 \| \u00a0/g;

  it('renders all three of the reference actions, in its order', () => {
    const out = html([], [badge()]);
    const order = ['>Edit</button>', '>Delete</button>', '>Dark Theme</button>'].map((needle) => out.indexOf(needle));
    expect(
      order.every((at) => at > -1),
      'all three controls must be present'
    ).toBe(true);
    expect(order, 'Edit, Delete, Dark Theme — the reference order').toEqual([...order].sort((a, b) => a - b));
  });

  it('separates them with the captured pipe, twice per row and never at an end', () => {
    const out = html([], [badge(), badge({ id: 10, label: 'Second' })]);
    // Two rows, two separators each. The badges table is the only place this string appears with
    // a `.acc-row-action` on both sides; the API-key table below uses `.acc-api-label`.
    expect((out.match(SEPARATOR) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it('reports the badge nominated for the dark theme, and says so when there is none', () => {
    /*
      RE-POINTED 2026-08-15. This asserted `aria-pressed="true"` / `"false"`, which was correct for
      the toggle this control used to be and is wrong for what the capture shows it is: a dialog with
      a free-text field holding ANOTHER badge's id. A pressed state cannot express "shows badge 12".

      The title carries it now, because that is the only visible cue on a control whose label never
      changes — and unlike the old `aria-pressed`, it names which badge, which is the whole fact.
    */
    const out = html([], [badge({ id: 11, darkThemeBadgeId: 12 }), badge({ id: 12, darkThemeBadgeId: null })]);
    expect(out).toContain('?/addBadgeDarkTheme');
    expect(out).toContain('Shows badge 12 in the dark theme');
    expect(out).toContain('Set a badge to show instead of this one in the dark theme');
    // The toggle is gone, not merely relabelled: a pressed state would be a second, contradictory
    // model of the same column living beside the id.
    expect(out).not.toMatch(/aria-pressed/);
  });

  it('opens in add mode, so the edit-only submit is not on screen', () => {
    // The editor is behind `showAddBadge`, and `badgeMode` starts at 'add'. Neither the "Edit Badge"
    // heading nor `?/updateBadge` may be reachable before the Edit control is pressed.
    const out = html([], [badge()]);
    expect(out).not.toContain('Save Edit for New Badge');
    expect(out).not.toContain('?/updateBadge');
  });
});
