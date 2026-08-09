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
  const manage = page.getByRole('link', { name: /^Manage$/ }).first();
  const href = await manage.getAttribute('href');
  expect(href, 'the account page must offer a Manage link').toBeTruthy();

  const code = href!.split('/').pop()!;
  expect(code, 'the URL segment must be the four-or-more digit short code, not a row id').toMatch(/^\d{4,}$/);

  await manage.click();
  await expect(page).toHaveURL(new RegExp(`/account/rooms/${code}$`));

  // The page's own header prints the same identifier, so the URL and the UI agree.
  await expect(page.getByText(new RegExp(`Manage Room id:\\s*${code}`))).toBeVisible();

  await page.goto(`/account/rooms/${code}?tab=stats`);

  /*
    AT REST: the label must not point at a control that does not exist.

    `for` used to be unconditional, so a screen reader announced a label whose control could not be
    found and clicking it moved focus nowhere.
  */
  const startLabel = page.locator('label', { hasText: 'Start Date:' }).first();
  await expect(startLabel).toBeVisible();
  expect(
    await startLabel.getAttribute('for'),
    'at rest there is no input, so the label must not claim one'
  ).toBeNull();

  /*
    THE DEFECT THIS SPEC EXISTS FOR.

    Clicking the anchor swaps in an `<input type="date">`. Before the fix it was never focused, so
    the picker never opened, nothing could be typed, and — worst — the row could not close, because
    its only exits are `change` and `blur` and `blur` cannot fire on an element that never held
    focus. One click put the row into an edit state with no way out.
  */
  await page.locator('a.editable').filter({ hasText: /\d{2}-\d{2}-\d{4}|Empty/ }).first().click();

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
