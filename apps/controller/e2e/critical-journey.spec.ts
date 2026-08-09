import { expect, test } from '@playwright/test';

test('register, inspect the account, log out, and log back in', async ({ page }, testInfo) => {
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
  await expect(page.getByRole('heading', { name: 'Badges' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Account/ })).toBeVisible();

  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.getByLabel('Your email').fill(email);
  await page.getByLabel('Your password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole('heading', { name: 'API Keys' })).toBeVisible();
});
