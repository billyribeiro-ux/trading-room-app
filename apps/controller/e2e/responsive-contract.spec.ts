import { expect, test } from '@playwright/test';

const viewportWidths = [320, 767, 768, 991, 992, 1199, 1200, 1989, 2205] as const;

test('the cinematic home holds its structural contract at every breakpoint', async ({ page }) => {
  for (const width of viewportWidths) {
    await page.setViewportSize({ width, height: 1300 });
    await page.goto('/');
    // The burger is a hydrated control; interacting before SvelteKit attaches handlers silently
    // no-ops. The layout stamps this attribute from afterNavigate exactly for this purpose.
    await page.waitForSelector('html[data-proroom-hydrated="true"]');

    // The hero fills the viewport, carries the headline, and contains no raster imagery anywhere.
    const hero = page.locator('#top');
    await expect(hero).toBeVisible();
    await expect(hero.getByRole('heading', { level: 1 })).toHaveText(/The trading floor,\s*re-engineered\./);
    expect(await page.locator('main img').count()).toBe(0);

    // The simulated-feed honesty label rides both live surfaces.
    await expect(page.locator('#top .hc-sim')).toHaveText(/simulated feed/i);
    await expect(page.locator('#tape .hc-sim')).toHaveText(/simulated feed/i);

    // The live tape chart renders as SVG with an accessible name, server-side and after hydration.
    await expect(page.locator('#tape svg[role="img"]')).toHaveAttribute('aria-label', /Simulated futures price chart/);

    // The footer is real: legal links, contact, copyright, on every viewport.
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: 'Privacy policy' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Terms of service' })).toBeVisible();
    await expect(footer.getByRole('link', { name: 'Contact us' })).toBeVisible();
    await expect(footer).toContainText('© 2026 TradingRoomApp™');

    // Nav collapses to the burger below 880px and shows inline links above it.
    const burger = page.getByRole('button', { name: 'Toggle navigation' });
    const inlineNav = page.getByRole('navigation', { name: 'Home sections' });
    if (width <= 880) {
      await expect(burger).toBeVisible();
      await burger.click();
      await expect(inlineNav.getByRole('link', { name: 'Engineering' })).toBeVisible();
      await burger.click();
    } else {
      await expect(burger).toBeHidden();
      await expect(inlineNav.getByRole('link', { name: 'Engineering' })).toBeVisible();
    }

    // The composition never leaks horizontal scroll.
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  }
});

test('the account API-key table owns overflow at every controller breakpoint', async ({ page }) => {
  const accountWidths = [320, 479, 480, 767, 768, 991, 992, 1199, 1200, 1989] as const;
  const identity = `responsive-${Date.now()}`;
  const email = `${identity}@example.test`;
  const password = `E2e-${identity}-Password!`;

  await page.goto('/register');
  await page.getByLabel('Your email').fill(email);
  await page.getByLabel('Your password', { exact: true }).fill(password);
  await page.getByLabel('Type your password again').fill(password);
  await page.getByLabel('Your full name').fill('Responsive Owner');
  await page.getByRole('checkbox', { name: /I agree with the terms/ }).check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/account$/);

  const documentWidthBaseline = new Map<number, number>();
  for (const width of accountWidths) {
    await page.setViewportSize({ width, height: 1300 });
    documentWidthBaseline.set(width, await page.evaluate(() => document.documentElement.scrollWidth));
  }

  await page.getByRole('button', { name: 'New Api key' }).click();
  const secretCell = page.locator('td').filter({ hasText: /^[a-f0-9]{64}$/ });
  await expect(secretCell).toHaveCount(1);

  for (const width of accountWidths) {
    await page.setViewportSize({ width, height: 1300 });
    const wrapper = page
      .getByRole('heading', { name: 'API Keys' })
      .locator('xpath=following-sibling::div[1]')
      .locator('.acc-table-responsive');

    const metrics = await wrapper.evaluate((element) => {
      const secret = element.querySelector('tbody tr td:nth-child(2)');
      const panel = element.parentElement;
      const wrapperRect = element.getBoundingClientRect();
      const panelRect = panel?.getBoundingClientRect();
      return {
        bodyWidth: document.documentElement.scrollWidth,
        clientWidth: element.clientWidth,
        overflowX: getComputedStyle(element).overflowX,
        panelLeft: panelRect?.left ?? null,
        panelRight: panelRect?.right ?? null,
        scrollWidth: element.scrollWidth,
        secretWhiteSpace: secret ? getComputedStyle(secret).whiteSpace : null,
        wrapperLeft: wrapperRect.left,
        wrapperRight: wrapperRect.right
      };
    });

    expect(metrics.overflowX).toBe('auto');
    expect(metrics.bodyWidth).toBe(documentWidthBaseline.get(width));
    expect(metrics.wrapperLeft).toBeGreaterThanOrEqual(metrics.panelLeft ?? Number.NEGATIVE_INFINITY);
    expect(metrics.wrapperRight).toBeLessThanOrEqual(metrics.panelRight ?? Number.POSITIVE_INFINITY);
    if (width < 768) {
      expect(metrics.secretWhiteSpace).toBe('nowrap');
      expect(metrics.scrollWidth).toBeGreaterThan(metrics.clientWidth);
    }
  }
});
