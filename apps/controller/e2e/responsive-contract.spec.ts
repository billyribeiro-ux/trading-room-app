import { expect, test } from '@playwright/test';

const viewportWidths = [320, 767, 768, 991, 992, 1199, 1200, 1989, 2205] as const;

test('home hero follows every evidence-backed breakpoint branch', async ({ page }) => {
  for (const width of viewportWidths) {
    await page.setViewportSize({ width, height: 1300 });
    await page.goto('/');

    const hero = page.locator('#hero');
    const heading = hero.getByRole('heading', {
      name: 'Web-based Trading Room for Professionals'
    });
    const image = hero.locator('img[src="/public/images/ptr_descrived_perspective.png"]');

    await expect(hero).toBeVisible();
    await expect(image).toBeVisible();

    const metrics = await page.evaluate(() => {
      const heroElement = document.querySelector<HTMLElement>('#hero');
      const headingElement = document.querySelector<HTMLElement>('#hero h1.hero-text');
      const imageElement = document.querySelector<HTMLImageElement>(
        '#hero img[src="/public/images/ptr_descrived_perspective.png"]'
      );
      if (!heroElement || !headingElement || !imageElement) throw new Error('hero contract element missing');
      return {
        headingFontSize: Number.parseFloat(getComputedStyle(headingElement).fontSize),
        heroHeight: Number.parseFloat(getComputedStyle(heroElement).height),
        imageWidth: imageElement.getBoundingClientRect().width,
        naturalWidth: imageElement.naturalWidth
      };
    });

    const expectedImageWidth = Math.min(1440, width < 992 ? width - 30 : width * (2 / 3) - 30);
    const expectedHeadingFontSize = width < 768 ? 27 : width < 992 ? 30 : 36;
    const expectedHeroHeight = width < 992 ? 550 : 583;

    expect(metrics.naturalWidth).toBe(1440);
    expect(metrics.imageWidth).toBeCloseTo(expectedImageWidth, 1);
    expect(metrics.headingFontSize).toBe(expectedHeadingFontSize);
    expect(metrics.heroHeight).toBe(expectedHeroHeight);
    await expect(heading).toBeVisible();
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
