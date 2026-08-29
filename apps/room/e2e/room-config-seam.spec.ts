import { expect, test, type Page } from '@playwright/test';

import { handoffUrl } from './handoff';

/**
 * A ROOM SETTING REACHES THE DOM — watched in a browser, which nothing had done.
 *
 * ## The row this closes
 *
 * `TODO.md` row E: *"the seam probe has still never been RUN, and its instrument is not in the
 * repository."* Its instrument was `room-config-seam-e2e.mjs`, which `git ls-files` returns 0 for —
 * one of the thirty untracked scripts — and which declared `CONTROL=http://localhost:5180` while the
 * controller's dev port is 5173, so its one attempted run reached a different project entirely and
 * got a 404 from `/register`.
 *
 * The row also states what WAS covered and what was not: *"the gates ARE tested —
 * `chat-alerts-gates-contract.test.ts`, 30 assertions across 13 tests, negative-controlled — but no
 * browser has watched a column leave the DOM when an owner ticks the box."*
 *
 * That is the gap, and it is a real one rather than a formality. Everything between the setting and
 * the pixel is covered in pieces: the controller decides what crosses (`ROOM_VISIBLE_SETTINGS`), the
 * room signs for it (`config-read`), `RoomGates` resolves it, `RoomShell` renders on it. Each piece
 * is asserted against a stub of its neighbour. **A seam is exactly where that kind of cover is
 * weakest** — every piece can be right about an interface both sides have got wrong.
 *
 * ## Why this is a spec and not the probe the row describes
 *
 * The probe was a one-off script run by hand against two dev servers. This is the same observation
 * made by the suite that already boots both halves, so it runs in CI on every push, and it is
 * TRACKED — which was half of what was wrong with the original.
 *
 * It is also strictly more than the probe could see. The probe would have watched one room with the
 * box ticked; this watches the same build answer both ways in one run, which is the only version of
 * the assertion that can tell *"the column is hidden"* apart from *"the column was never built"*.
 *
 * ## How both answers come from one run
 *
 * `stub-controller.mjs` now keys settings on the SHORT CODE, which is what a real controller does —
 * *"any short code is a room"* was already true of it. One page load asks for `HIDDEN_ROOM` and gets
 * `hideChatAlerts: true`; the next asks for `OPEN_ROOM` and gets the default. No shared mutable
 * state, no ordering dependency, and no second server boot.
 *
 * ## What this does NOT prove, stated rather than glossed
 *
 * The stub is not the controller. It verifies the `config-read` HMAC and refuses a `config-write`
 * token on the read route — so the CAPABILITY half of the seam is real traffic — but the settings it
 * returns are this file's, not a database's. What is proven here is that a value which crosses the
 * seam reaches the DOM and changes it. That the controller puts the right value on the wire is
 * `room-config-boundary.test.ts`'s subject, and that is the correct split: two services in one job
 * would give every failure two possible causes.
 */

/** The default room. Its settings are `ROOM_SETTINGS_JSON`, which the suite leaves empty. */
const OPEN_ROOM = '7301';

/**
 * A room whose owner has ticked "Hide Chat/Alerts".
 *
 * The code is the key `playwright.config.ts` maps to `{"hideChatAlerts": true}`. Named rather than
 * a literal at the use site because the mapping lives in two files and a typo in either would make
 * this spec assert against a DEFAULT room — which would pass the "column is present" half and fail
 * the other in a way that reads like a product bug.
 */
const HIDDEN_ROOM = 'hidden';

/** Enter a room the way production does: mint the handoff, then click the room's only door. */
async function enterRoom(page: Page, shortCode: string) {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue();
    return route.abort();
  });
  await page.goto(handoffUrl(shortCode));
  await page
    .getByRole('button', { name: /log ?in|enter/i })
    .first()
    .click();
  await page.waitForURL(new RegExp(`\\\\?room=${shortCode}`));
}

test.describe('a room setting crosses the seam and changes the DOM', () => {
  test.describe.configure({ mode: 'serial' });

  test('the chat/alerts column is THERE when the owner has not hidden it', async ({ browser }) => {
    /*
      THE POSITIVE CONTROL, and it is the half the original probe could not have had. Without it,
      "the element is absent" in the next test is satisfied by a build in which the column does not
      exist at all — which is precisely the failure a seam test is for.
    */
    const page = await browser.newPage();
    await enterRoom(page, OPEN_ROOM);

    await expect(page.locator('.alert-chat-box')).toHaveCount(1);
    await page.close();
  });

  test('the chat/alerts column is GONE when the owner has hidden it', async ({ browser }) => {
    /*
      `RoomShell.svelte`: `{#if !hideChatAlerts}{@render chatAlertsPane()}{/if}` — the reference's
      `O(2, hideChatAlerts ? -1 : 2)`. It is a REMOVAL and not a `display: none`, which is why this
      asserts a count of zero rather than invisibility: a hidden-but-present column still receives
      messages, still scrolls, and still costs the member the render.
    */
    const page = await browser.newPage();
    await enterRoom(page, HIDDEN_ROOM);

    await expect(page.locator('.alert-chat-box')).toHaveCount(0);

    /*
      And the page is otherwise ALIVE. A room that failed to render at all would also have no column,
      and would pass the assertion above while proving nothing — the vacuity failure this repository
      has met repeatedly. The presentation area is the sibling `RoomShell` renders either way.
    */
    await expect(page.locator('app-presentationarea')).toHaveCount(1);
    await page.close();
  });
});
