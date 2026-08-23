import { expect, test } from '@playwright/test';

/**
 * The two things a unit test cannot prove about the manage page, proved in a real browser.
 *
 * `room-url-identity.test.ts` and `focus-date-field.test.ts` cover the logic against SSR output and
 * a stub. Neither can see what this spec exists for:
 *
 *  - that the URL a customer actually lands on carries the room's short code, not the row id;
 *  - that clicking a stats date really moves focus, and that **blur then closes the row** — the
 *    half of the defect that a stub cannot demonstrate, because `blur` is a browser behaviour, not
 *    a function call.
 *
 * Both were shipped unverified in a browser and said so in `CHANGELOG.md`. This closes that gap
 * rather than leaving it as a note.
 *
 * ## The account is a throwaway, created through the real form
 *
 * Same pattern as `critical-journey.spec.ts`: a unique `@example.test` address and a generated
 * password, registered by filling the actual form. Nothing is forged, no session is inserted, and
 * no real credential is used anywhere.
 */

test('a room is managed at its short code, and the stats dates behave', async ({ page }, testInfo) => {
  const identity = `${testInfo.project.name}-${testInfo.workerIndex}-${Date.now()}`;
  const email = `${identity}@example.test`;
  const password = `E2e-${identity}-Password!`;

  await page.goto('/register');
  await page.getByLabel('Your email').fill(email);
  await page.getByLabel('Your password', { exact: true }).fill(password);
  await page.getByLabel('Type your password again').fill(password);
  await page.getByLabel('Your full name').fill('E2E Owner');
  await page.getByRole('checkbox', { name: /I agree with the terms/ }).check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/account$/);

  /*
    Registration provisions the account's first room, so there is exactly one Manage link. Its href
    is read rather than assumed: the short code comes from a database sequence, so the test cannot
    know it in advance — which is the point. Asserting a hardcoded code would prove nothing.
  */
  /*
    A plain substring name, NOT the anchored regex `/^Manage$/` this line used to carry.

    The link is icon-prefixed — `<a><i class="fa …"></i> Manage</a>` — so its accessible name begins
    with the space the icon contributes, and an anchored pattern cannot match it. Playwright's page
    snapshot at the failure printed the name as `" Manage"`, alongside `" Launch"`, `" Marketplace"`
    and `" Account"`, every one of them icon-prefixed the same way. The link itself was present and
    correct the whole time, pointing at `/account/rooms/1006`.

    `{ name: 'Manage', exact: true }` was tried FIRST and MEASURED FAILING, which is why it is named
    here rather than quietly replaced. Whatever precedes the word in the computed name is therefore
    not something an exact match reduces away — the icon contributes more than the single space the
    snapshot prints, and no attempt is made here to say exactly what, because that was not read.
    What IS proven, on this markup, in this suite: the default substring match works, and
    `hydration-contract.spec.ts` finds the same anchor with `{ name: 'Manage' }` and passes.

    Nothing is loosened by dropping the anchor, because the two assertions below are what actually
    pin the target: the href's last segment must be a four-or-more digit short code, and clicking it
    must land on `/account/rooms/<that code>`. A wrong link fails both.
  */
  const manage = page.getByRole('link', { name: 'Manage' }).first();
  const href = await manage.getAttribute('href');
  expect(href, 'the account page must offer a Manage link').toBeTruthy();

  const code = href!.split('/').pop()!;
  expect(code, 'the URL segment must be the four-or-more digit short code, not a row id').toMatch(/^\d{4,}$/);

  await manage.click();
  await expect(page).toHaveURL(new RegExp(`/account/rooms/${code}$`));

  // The page's own header prints the same identifier, so the URL and the UI agree.
  await expect(page.getByText(new RegExp(`Manage Room id:\\s*${code}`))).toBeVisible();

  /*
    THE TAB IS A PATH SEGMENT. `?tab=stats` selected nothing.

    `+page.server.ts:194` reads `params.tab ?? 'users'` — the route is `[[tab]]`, an optional path
    parameter — and the note above it records the move from a query string deliberately: *"A tab here
    selects which pane of the room you are looking at, and a pane is a resource, not a filter over
    one."* A query string is simply ignored, and because the fallback is `'users'`, the page rendered
    the Users pane and returned 200 while looking nothing like what the rest of this test asserts.

    That is the worst shape a stale locator can take. There was no 404 and no error — the assertion
    below just could not find a Start Date label, on a pane that has never had one.
  */
  await page.goto(`/account/rooms/${code}/stats`);

  /*
    AT REST: the label must not point at a control that does not exist.

    `for` used to be unconditional, so a screen reader announced a label whose control could not be
    found and clicking it moved focus nowhere.
  */
  const startLabel = page.locator('label', { hasText: 'Start Date:' }).first();
  await expect(startLabel).toBeVisible();
  expect(await startLabel.getAttribute('for'), 'at rest there is no input, so the label must not claim one').toBeNull();

  /*
    THE DEFECT THIS SPEC EXISTS FOR.

    Clicking the anchor swaps in an `<input type="date">`. Before the fix it was never focused, so
    the picker never opened, nothing could be typed, and — worst — the row could not close, because
    its only exits are `change` and `blur` and `blur` cannot fire on an element that never held
    focus. One click put the row into an edit state with no way out.
  */
  /*
    ADDRESSED BY ITS OWN `aria-label`, not by `.first()` over every editable on the page.

    This selector went through two measured wrong answers, and both are worth leaving recorded
    because each looked correct until it ran:

      `.filter({ hasText: /…|Empty/ })`   matched NOTHING. `editable-display.ts:56` returns the
                                          literal lowercase `'empty'` — its docblock tallies the
                                          reference printing it lowercase 47 times — and `hasText`
                                          with a RegExp is case-sensitive.
      `.filter({ hasText: /…|empty/ })`   matched, and then could not be clicked: *"locator resolved
       plus `.first()`                    to <a href="" class="editable editable-click
                                          editable-empty">empty</a> … element is not visible"*. The
                                          manage page renders an editable per setting and keeps
                                          several behind `hidden` blocks (`hidden={!isWebinar}`,
                                          `hidden={!isRegistration}`), so the FIRST anchor printing
                                          `empty` belongs to a pane nobody is looking at.

    `aria-label="Start Date: …"` is on the anchor at `+page.svelte:2472` and names exactly one
    element on the page. It is also the attribute a screen-reader user navigates by, so a test that
    cannot find it is a test worth failing.
  */
  await page.locator('a.editable[aria-label^="Start Date:"]').click();

  const field = page.locator('input.mg-date').first();
  await expect(field, 'the click must produce a date input').toBeVisible();
  await expect(field, 'and that input must hold focus — this is the fix').toBeFocused();

  // While editing, the label DOES have a control, so `for` comes back.
  expect(await startLabel.getAttribute('for'), 'while editing the label points at the field').toBe('statsFrom');

  /*
    And the row can now leave edit state. Blurring is only meaningful because the field was focused
    in the first place — on the old build this assertion could not even be reached, since there was
    nothing to blur.
  */
  await field.blur();
  await expect(field, 'blur must close the row rather than stranding it in edit state').toBeHidden();
});
