import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * THE USER MODAL'S BADGES CELL — an empty `div` with the whole supply already in the browser.
 *
 * ## What was there
 *
 * ```svelte
 * <th scope="row">Badges:</th>
 * <td><div class="d-inline-block align-baseline mr-1"></div>
 * ```
 *
 * Nothing bound to it. A presenter opening a member's modal saw an empty row while the same
 * member's badges rendered correctly on every chat message they sent.
 *
 * ## The reference's counterpart, and the one thing NOT copied
 *
 * Bundle bytes 2,060,329-2,060,802: `v(15,"Badges:"), u(), d(16,"td"), T(17,"div",57),
 * Xe(18,"noSanitize")` and then, in the update block,
 * `z("innerHTML", Ct(18,14,e.badges,"html"), wn)`.
 *
 * **`innerHTML` is not reproduced, and that is the important line in this file.** `badge.text`,
 * `badge.color` and `badge.backgroundColor` all originate in controller data — an owner types them
 * into a settings form and they travel through `internal/room-config`. Binding them as HTML would
 * make a badge label an injection into every presenter's modal. The chips here are the same ELEMENT
 * markup `RoomMessage` already draws, which renders the same thing and cannot.
 *
 * That upstream marks the binding `noSanitize` is not a licence; it is the reason to look.
 *
 * ## UNGATED, and this is the one place the two surfaces deliberately differ
 *
 * `RoomMessage` gates chat badges on `chatBadges && enableBadges && (!showBadgesToPresentersOnly ||
 * viewerIsPresenter)`. The reference's binding HERE carries no `O()` gate at all — verified by
 * reading the update block — so the cell renders whenever the modal does.
 *
 * Copying the chat gate would hide a member's badges from the presenter who opened the modal to
 * look at that member, which inverts what the surface is for. The tab is already inside
 * `isPresenter && !isLimitedPresenter`, so "presenters only" is structural here rather than a flag.
 *
 * ## How the gap was found
 *
 * Not by reading the capture: by a six-cluster measurement pass over every open tracker row, whose
 * first finding was that `badges` had been grouped in `TODO.md` row 9 with `notesArr` and `privData`
 * as needing "a server-side user-detail lookup this room has no endpoint for". That is true of the
 * other two and false of this one — the badge map is for the WHOLE room, is built by the controller,
 * and has been on the page load the entire time.
 */
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (file: string) => readFileSync(`${ROOT}${file}`, 'utf8');

const MODAL = read('lib/components/ModalHost.svelte');
const OVERLAYS = read('lib/components/RoomOverlays.svelte');
const FEEDS = read('lib/room/feeds.svelte.ts');
const MESSAGE = read('lib/components/RoomMessage.svelte');

describe('a member’s badges reach the modal that is about them', () => {
  it('reads the files it is measuring', () => {
    for (const [name, source] of Object.entries({ MODAL, OVERLAYS, FEEDS, MESSAGE })) {
      expect(source.length, `${name} is empty`).toBeGreaterThan(2000);
    }
  });

  it('renders the cell from the resolved badges, not from an empty div', () => {
    const cellAt = MODAL.indexOf('<th scope="row">Badges:</th>');
    expect(cellAt, 'the Badges row moved').toBeGreaterThan(-1);
    const cell = MODAL.slice(cellAt, cellAt + 1400);

    expect(cell).toContain('{#each targetBadges as badge');
    expect(cell, 'the image form, as RoomMessage draws it').toContain('class="user-badge-img"');
    expect(cell, 'and the text chip').toContain('class="badge px-1 mx-1 user-badge"');
    expect(
      cell,
      'the cell used to be a div with nothing in it — that shape must not come back'
    ).not.toContain('<div class="d-inline-block align-baseline mr-1"></div>');
  });

  it('NEVER renders a badge as HTML, whatever upstream binds', () => {
    /*
      The assertion this file exists for. Upstream binds `innerHTML`; every value in a badge comes
      from controller data, so the faithful port would have been an injection into the one surface
      only presenters see. Asserted over the whole component rather than the cell, because the next
      person to add a badge somewhere in this file needs to hit it too.
    */
    const badgeHtml = /\{@html[^}]*badge/i;
    expect(MODAL, 'a badge must never be interpolated as HTML').not.toMatch(badgeHtml);
    expect(MESSAGE, 'nor in the chat, which is where the chip markup came from').not.toMatch(
      badgeHtml
    );
  });

  it('resolves them ONCE, through the resolver the chat already uses', () => {
    /*
      A second resolution would be a second answer to which badges a member has — including the
      dark-theme variant swap, which is the part most likely to be forgotten by a copy.
    */
    expect(OVERLAYS).toContain('targetBadges={feeds.badgesFor(userActions.target.emailHash)}');
    expect(FEEDS).toContain('badgesFor(emailHash: string | null | undefined): MessageBadge[]');
    expect(
      (MODAL.match(/byEmailHash/g) ?? []).length,
      'the modal must not reach into the badge map itself'
    ).toBe(0);
  });

  it('is UNGATED here and GATED in the chat, deliberately', () => {
    /*
      Not an oversight in either direction. Upstream's modal binding has no `O()`; its chat rendering
      has three flags. Copying the chat gate here would hide a member's badges from the presenter who
      opened the modal to look at that member.
    */
    const cellAt = MODAL.indexOf('<th scope="row">Badges:</th>');
    const cell = MODAL.slice(cellAt, cellAt + 1400);
    for (const flag of ['enableBadges', 'chatBadges', 'showBadgesToPresentersOnly']) {
      expect(cell, `${flag} must not gate the modal cell`).not.toContain(flag);
    }
    /* And the chat's own gate is still all three, so this test cannot pass by them being deleted. */
    for (const flag of ['enableBadges', 'chatBadges', 'showBadgesToPresentersOnly']) {
      expect(MESSAGE, `${flag} still gates the chat`).toContain(flag);
    }
  });
});
