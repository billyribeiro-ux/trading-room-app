import { expect, test, type Page, type Route, type TestInfo } from '@playwright/test';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

interface HydrationSession {
  page: Page;
  diagnostics: string[];
  hydrate: () => Promise<void>;
  close: () => Promise<void>;
}

/**
 * Open a cache-empty browser context with the source page's authenticated state,
 * then hold every script response while leaving the SSR document interactive.
 * Routing disables Playwright's HTTP cache. The fresh context additionally
 * guarantees a new document/module graph after the prior WebKit context reused
 * immutable production modules without invoking this route handler.
 */
async function openBeforeHydration(
  sourcePage: Page,
  baseURL: string | undefined,
  path: string,
  testInfo: TestInfo
): Promise<HydrationSession> {
  if (!baseURL) throw new Error('The Playwright project must provide a baseURL.');
  const browser = sourcePage.context().browser();
  if (!browser) throw new Error('The source page is not attached to a browser.');

  const projectUse = testInfo.project.use;
  const context = await browser.newContext({
    baseURL,
    storageState: await sourcePage.context().storageState(),
    viewport: projectUse.viewport ?? sourcePage.viewportSize() ?? undefined,
    screen: projectUse.screen,
    userAgent: projectUse.userAgent,
    deviceScaleFactor: projectUse.deviceScaleFactor,
    isMobile: projectUse.isMobile,
    hasTouch: projectUse.hasTouch,
    locale: projectUse.locale,
    colorScheme: projectUse.colorScheme,
    reducedMotion: projectUse.reducedMotion,
    forcedColors: projectUse.forcedColors,
    contrast: projectUse.contrast,
    timezoneId: projectUse.timezoneId,
    // A service worker can bypass Playwright routing and invalidate this test's
    // core invariant even if one is introduced later.
    serviceWorkers: 'block'
  });
  const page = await context.newPage();
  const diagnostics = observeHydrationDiagnostics(page);
  const hydrationRequested = deferred();
  const releaseScripts = deferred();
  const routeHandler = async (route: Route) => {
    if (route.request().resourceType() !== 'script') {
      await route.continue();
      return;
    }

    hydrationRequested.resolve();
    await releaseScripts.promise;
    await route.continue();
  };

  await page.route('**/*', routeHandler);
  let requestTimeout: ReturnType<typeof setTimeout> | undefined;
  const scriptWasIntercepted = Promise.race([
    hydrationRequested.promise,
    new Promise<void>((_, reject) => {
      requestTimeout = setTimeout(() => {
        reject(
          new Error(
            `No hydration script was intercepted for ${path} in ${browser.browserType().name()} within 15 seconds.`
          )
        );
      }, 15_000);
    })
  ]);

  const closeContext = async () => {
    const cleanupErrors: unknown[] = [];
    try {
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    } catch (error) {
      cleanupErrors.push(error);
    }
    try {
      await context.close();
    } catch (error) {
      cleanupErrors.push(error);
    }
    if (cleanupErrors.length === 1) throw cleanupErrors[0];
    if (cleanupErrors.length > 1) {
      throw new AggregateError(cleanupErrors, `Failed to close the hydration context for ${path}.`);
    }
  };

  try {
    await page.goto(path, { waitUntil: 'commit' });
    await scriptWasIntercepted;
  } catch (error) {
    releaseScripts.resolve();
    let cleanupError: unknown;
    try {
      await closeContext();
    } catch (caughtCleanupError) {
      cleanupError = caughtCleanupError;
    }
    if (cleanupError) {
      throw new AggregateError(
        [cleanupError],
        `Opening the pre-hydration context for ${path} failed and cleanup also failed.`,
        { cause: error }
      );
    }
    throw error;
  } finally {
    if (requestTimeout) clearTimeout(requestTimeout);
  }

  return {
    page,
    diagnostics,
    hydrate: async () => {
      releaseScripts.resolve();
      // `window.load` does not wait for SvelteKit's dynamic bootstrap imports.
      // Finish active route handlers, then wait for the root layout's public
      // afterNavigate marker before allowing any subsequent navigation.
      await page.unrouteAll({ behavior: 'wait' });
      await page.waitForLoadState('load');
      await page.waitForFunction(() => document.documentElement.dataset.proroomHydrated === 'true');
      // Give framework effects and diagnostics one browser rendering turn after
      // the public lifecycle marker before the test observes their final state.
      await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    },
    close: async () => {
      releaseScripts.resolve();
      await closeContext();
    }
  };
}

function observeHydrationDiagnostics(page: Page) {
  const diagnostics: string[] = [];
  page.on('console', (message) => {
    if (/hydrat|mismatch/i.test(message.text())) {
      diagnostics.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on('pageerror', (error) => diagnostics.push(`pageerror: ${error.message}`));
  return diagnostics;
}

async function createOwnerAndRoom(page: Page, testInfo: TestInfo) {
  const identity = [testInfo.project.name, testInfo.workerIndex, testInfo.repeatEachIndex, Date.now()].join('-');
  const email = `hydration-owner-${identity}@example.test`;
  const password = `Hydration-${identity}-Password!`;
  const roomName = `Hydration Room ${identity}`;

  await page.goto('/register');
  await page.getByLabel('Your email').fill(email);
  await page.getByLabel('Your password', { exact: true }).fill(password);
  await page.getByLabel('Type your password again').fill(password);
  await page.getByLabel('Your full name').fill('Hydration Owner');
  await page.getByRole('checkbox', { name: /I agree with the terms/ }).check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/account$/);

  const sessions = page.getByRole('button', { name: 'Sessions' });
  for (let click = 0; click < 5; click += 1) await sessions.click();

  await page.getByPlaceholder('New room name').fill(roomName);
  const createResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/createRoom')
  );
  /*
    ARMED BEFORE THE CLICK, and awaited after: `use:enhance` follows its action POST with an
    INVALIDATING `__data.json` request, and the action response arrives first.

    A caller that navigates as soon as `createResponse` resolves races that second request, and the
    browser aborts one of the two — measured here as `page.goto: net::ERR_ABORTED at
    …/account/rooms/1005/users`, thrown from the very first line after this helper returns.

    This file already knows the hazard: the comment before its `page.reload()` further down records
    the same thing, *"the action response arrives before `use:enhance` finishes its invalidating data
    request"*, and waits for the rendered result there. This makes the helper itself safe, so every
    caller inherits it rather than each having to remember.
  */
  const createInvalidation = page.waitForResponse((response) => response.url().includes('__data.json'));
  await page.getByRole('button', { name: 'New Room' }).click();
  expect((await createResponse).ok()).toBeTruthy();
  await createInvalidation;

  const row = page.locator('table.acc-table tbody tr').filter({ hasText: roomName });
  await expect(row).toHaveCount(1);
  const managePath = await row.getByRole('link', { name: 'Manage' }).getAttribute('href');
  const roomCode = (await row.locator('td').first().locator('strong').textContent())?.trim();
  if (!managePath || !roomCode) throw new Error('The newly created room did not expose its manage path and code.');

  return { managePath, roomCode };
}

test('registration preserves values entered before hydration', async ({ page, baseURL }, testInfo) => {
  const hydration = await openBeforeHydration(page, baseURL, '/register', testInfo);
  try {
    const name = hydration.page.getByLabel('Your full name');
    const email = hydration.page.getByLabel('Your email');
    await name.fill('Pre-hydration Owner');
    await email.fill('pre-hydration-register@example.test');
    await hydration.hydrate();

    await expect(name).toHaveValue('Pre-hydration Owner');
    await expect(email).toHaveValue('pre-hydration-register@example.test');
    expect(hydration.diagnostics).toEqual([]);
  } finally {
    await hydration.close();
  }
});

test('login preserves the email entered before hydration', async ({ page, baseURL }, testInfo) => {
  const hydration = await openBeforeHydration(page, baseURL, '/login', testInfo);
  try {
    const email = hydration.page.getByLabel('Your email');
    await email.fill('pre-hydration-login@example.test');
    await hydration.hydrate();

    await expect(email).toHaveValue('pre-hydration-login@example.test');
    expect(hydration.diagnostics).toEqual([]);
  } finally {
    await hydration.close();
  }
});

test('contact preserves every field entered before hydration', async ({ page, baseURL }, testInfo) => {
  const hydration = await openBeforeHydration(page, baseURL, '/contact', testInfo);
  try {
    /*
      `contact-`-prefixed ids, because that is what the page renders.

      `#name` / `#email` / `#message` matched nothing: `(public)/contact/+page.svelte:81,87,99` label
      and bind `contact-name`, `contact-email` and `contact-message`. The fill simply waited out the
      whole 60-second test budget on a selector no element has ever carried on this page, which is
      why the failure arrived as a bare timeout with nothing named in it.
    */
    const name = hydration.page.locator('#contact-name');
    const email = hydration.page.locator('#contact-email');
    const message = hydration.page.locator('#contact-message');
    await name.fill('Pre-hydration Contact');
    await email.fill('pre-hydration-contact@example.test');
    await message.fill('This complete message was typed before the client started.');
    await hydration.hydrate();

    await expect(name).toHaveValue('Pre-hydration Contact');
    await expect(email).toHaveValue('pre-hydration-contact@example.test');
    await expect(message).toHaveValue('This complete message was typed before the client started.');
    expect(hydration.diagnostics).toEqual([]);
  } finally {
    await hydration.close();
  }
});

test('guest room login preserves an email entered before hydration', async ({ page, baseURL }, testInfo) => {
  const { roomCode } = await createOwnerAndRoom(page, testInfo);
  await page.context().clearCookies();

  const hydration = await openBeforeHydration(page, baseURL, `/session/${roomCode}`, testInfo);
  try {
    const name = hydration.page.locator('#login-nickname-new');
    const email = hydration.page.locator('#login-email');
    await name.fill('Pre-hydration Guest');
    await email.fill('pre-hydration-guest@example.test');
    await hydration.hydrate();

    await expect(name).toHaveValue('Pre-hydration Guest');
    await expect(email).toHaveValue('pre-hydration-guest@example.test');
    expect(hydration.diagnostics).toEqual([]);
  } finally {
    await hydration.close();
  }
});

test('room member, text-list, and branding drafts survive hydration', async ({ page, baseURL }, testInfo) => {
  const { managePath } = await createOwnerAndRoom(page, testInfo);
  const diagnostics = observeHydrationDiagnostics(page);
  const inviteName = `Hydration Invitee ${testInfo.workerIndex}`;
  const inviteEmail = `hydration-invitee-${testInfo.project.name}-${testInfo.workerIndex}-${Date.now()}@example.test`;

  // Seed a selectable non-owner through the real enhanced invite form. This is
  // also a regression witness for the page-level outside-click closer: the
  // trigger must remain open long enough for the form to be usable.
  /*
    THE TAB IS A PATH SEGMENT, not a query string.

    `+page.server.ts:194` reads `params.tab ?? 'users'` from the `[[tab]]` optional path parameter,
    and the note beside it records the move away from `?tab=` as deliberate: a pane is a resource,
    not a filter over one. Every `?tab=` in this file was therefore inert.

    This particular one was inert and RIGHT BY ACCIDENT — the fallback is `'users'`, so the page it
    wanted is the page it got. The two below were inert and WRONG: `?tab=text-list` and
    `?tab=branding` both landed on Users, so those sections asserted against a pane that has neither
    control. They returned 200 the whole time, which is why nothing ever looked broken.
  */
  await page.goto(`${managePath}/users`);
  /*
    WAIT FOR HYDRATION BEFORE TOUCHING AN EDITABLE, and this is not belt-and-braces.

    The closed trigger is `<a href="">` whose click handler calls `preventDefault()`. Before Svelte
    attaches that handler the anchor is an ordinary link, and `href=""` resolves to the current URL —
    so a click that lands early NAVIGATES instead of opening the editor. Measured: the failure's call
    log read `waiting for "…/account/rooms/1005?tab=users" navigation to finish… navigated to
    "…/account/rooms/1005?tab=users"`, which is the page reloading onto itself.

    `responsive-contract.spec.ts` already waits on this exact marker for the same reason, recorded
    there as "interacting before SvelteKit attaches handlers silently no-ops". The root layout stamps
    it from `afterNavigate`, so it is the framework's own signal rather than a sleep.

    This is a race the SETUP has to avoid, not a contract being weakened. The pre-hydration
    assertions this file exists for are the ones inside `openBeforeHydration`, and they are untouched
    — they deliberately hold the scripts back and interact anyway.
  */
  await page.waitForSelector('html[data-proroom-hydrated="true"]');

  // Expose the captured room-link mode through the real editable save action.
  // A conditional vanity assertion would silently skip for a new room because
  // its authorization mode begins unset.
  const authModeField = page.locator('#mg-authmode');
  /*
    `a.editable`, because the closed trigger is an ANCHOR and has been since 2026-08-14.

    `Editable.svelte` records the change and its reason at its `{:else}` branch: it was a span with
    `role="button"`, then briefly considered as a real `<button>` — which Chrome refuses to make
    `display: inline`, adding 1px to each of 260 setting rows — and settled on `<a href="">`, the
    reference's own element, which is inline, natively focusable and activated by Enter.

    So `getByRole('button')` inside this field has matched nothing since that day, and this line
    waited out the full 60 seconds for it. `manage-room.spec.ts` already reaches the same control
    the right way, with `page.locator('a.editable')`; this now agrees with it.

    Note what is NOT changed: the SAVE button below is still found by role, correctly — the open
    editor really does render `<button aria-label="Save">`.
  */
  await authModeField.locator('a.editable').click();
  await authModeField.locator('select[name="value"]').selectOption('open');
  const authModeResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/saveField')
  );
  await authModeField.getByRole('button', { name: 'Save' }).click();
  expect((await authModeResponse).ok()).toBeTruthy();

  /*
    THE VANITY EDITOR IS A BOOTBOX PROMPT. It was an inline panel, and it is not one any more.

    What this block used to do — click Edit, type into `getByPlaceholder('yournamehere')`, then click
    the panel heading and watch the draft close — described a `form-inline` dropped into the page
    below the field. `+page.svelte:1152` records replacing it, and why: *"The vanity editor is a
    BOOTBOX PROMPT, not an inline form. Ours dropped a `form-inline` into the page below the field.
    The reference opens a modal"*, with the owner's rendered modal markup quoted beneath it.

    `getByPlaceholder('yournamehere')` had no target at all after that. The string survives in the
    repository only as the `[yournamehere]` stand-in inside the vanity URL itself
    (`+page.server.ts:410`) — never as a placeholder attribute on anything.

    So the assertion is rewritten against the control that exists rather than deleted. It keeps the
    original intent — exercise the editor WITHOUT submitting — and it keeps the property that
    actually matters here: a cancelled edit leaves the room's link untouched.

    The outside-click contract this block used to witness is not lost. The invite trigger, the row
    dropdown and the email-list prompt below assert it in both directions, including a window-level
    probe proving the closer could not have run.
  */
  const vanityEdit = page.locator('#customLinkTxt').locator('..').getByRole('button', { name: 'Edit' });
  await expect(vanityEdit).toBeVisible();
  const vanityLink = page.locator('#customLinkTxt');
  // A room that has never been given a slug advertises the placeholder segment, not a real name.
  await expect(vanityLink).toHaveValue(/\/room\/\[yournamehere\]$/);

  await vanityEdit.click();
  const vanityPrompt = page.locator('input.bootbox-input-text');
  await expect(vanityPrompt).toBeVisible();
  await vanityPrompt.fill('unsavedhydrationvanity');
  await expect(vanityPrompt).toHaveValue('unsavedhydrationvanity');

  // CANCEL, never confirm. `Bootbox.svelte:162` settles the prompt with `null`, and `editVanity`
  // returns immediately on `null` without touching `vanitySlug` or submitting its form.
  await page.locator('[data-bb-handler="cancel"]').click();
  await expect(vanityPrompt).toBeHidden();
  await expect(vanityLink, 'a cancelled prompt must not have renamed the room').toHaveValue(
    /\/room\/\[yournamehere\]$/
  );

  const inviteTrigger = page.getByRole('button', { name: 'Add User / Invite' });
  const inviteNameField = page.getByPlaceholder('Name');
  await expect(async () => {
    if (!(await inviteNameField.isVisible())) await inviteTrigger.click();
    await expect(inviteNameField).toBeVisible({ timeout: 500 });
  }).toPass({ timeout: 10_000 });
  await inviteNameField.fill(inviteName);
  await page.getByPlaceholder('Email').fill(inviteEmail);
  const inviteResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/inviteUser')
  );
  await page.getByRole('button', { name: 'Invite', exact: true }).click();
  expect((await inviteResponse).ok()).toBeTruthy();
  // The action response arrives before `use:enhance` finishes its invalidating
  // data request. Wait for that update to render before reloading; otherwise
  // WebKit correctly reports the canceled `__data.json` request as a page error.
  await expect(page.locator('table.table-striped tbody tr').filter({ hasText: inviteName })).toHaveCount(1);
  await page.reload();

  // Inline editors and row dropdowns share one-open-at-a-time state. Prove the
  // boundary in both directions so the window-level outside-click exemption
  // cannot leave two independent menus visible.
  const invitedMemberRow = page.locator('table.table-striped tbody tr').filter({ hasText: inviteName });
  await expect(invitedMemberRow).toHaveCount(1);
  /*
    `[data-menu-control]`, because the row's wrapper is NOT `.dropdown` and deliberately never was.

    `+page.svelte:1823` renders `class="btn-group mb-sm mr"` with a `data-menu-control` attribute,
    and the comment above it exists precisely because of the difference: the window click handler
    exempts `.dropdown, [data-menu-control], [data-menu-panel]`, this wrapper matched none of them,
    and *"the menu opened and shut inside one event, and the button looked inert"*. The attribute is
    the fix. `.dropdown` here matched zero elements, so every assertion below it was waiting on
    something that has not existed since that repair.

    The open state is still a class on this same wrapper — `{ open: openRowMenu === member.id }` —
    so the assertions themselves are unchanged and still mean what they say. Only the element they
    are asked about is corrected.

    Not changed: `.users-many-actions > .dropdown` further down. That one is right — the bulk menu
    at `+page.svelte:1370` really is `class={['dropdown', …]}`, which is the contrast the page's own
    comment draws: *"one class apart, one worked"*.
  */
  const memberActionsDropdown = invitedMemberRow.locator('[data-menu-control]');
  const memberActionsTrigger = invitedMemberRow.getByRole('button', { name: 'Actions', exact: true });

  await inviteTrigger.click();
  await expect(inviteNameField).toBeVisible();
  await memberActionsTrigger.click();
  await expect(memberActionsDropdown).toHaveClass(/(?:^|\s)open(?:\s|$)/);
  await expect(inviteNameField).toBeHidden();

  await inviteTrigger.click();
  await expect(inviteNameField).toBeVisible();
  await expect(memberActionsDropdown).not.toHaveClass(/(?:^|\s)open(?:\s|$)/);

  // The email-list callback must enforce the same invariant itself. Keep the
  // row menu open while the prompt is active, then stop the OK click at the
  // document boundary so the window closer cannot make this assertion pass.
  await memberActionsTrigger.click();
  await page.getByRole('button', { name: 'Actions With the Email List', exact: true }).click();
  await expect(memberActionsDropdown).toHaveClass(/(?:^|\s)open(?:\s|$)/);
  const emailListPrompt = page.getByRole('textbox', { name: 'Enter comma separated email list' });
  await emailListPrompt.fill(inviteEmail);
  await page.evaluate(() => {
    const probeWindow = window as typeof window & {
      __menuWindowProbe?: EventListener;
      __menuWindowReached?: boolean;
    };
    probeWindow.__menuWindowReached = false;
    probeWindow.__menuWindowProbe = () => {
      probeWindow.__menuWindowReached = true;
    };
    window.addEventListener('click', probeWindow.__menuWindowProbe, { once: true });
    document.addEventListener('click', (event) => event.stopPropagation(), { once: true });
  });
  await page.locator('[data-bb-handler="confirm"]').click();
  const windowCloserCouldRun = await page.evaluate(() => {
    const probeWindow = window as typeof window & {
      __menuWindowProbe?: EventListener;
      __menuWindowReached?: boolean;
    };
    if (probeWindow.__menuWindowProbe) {
      window.removeEventListener('click', probeWindow.__menuWindowProbe);
    }
    const reached = probeWindow.__menuWindowReached ?? false;
    delete probeWindow.__menuWindowProbe;
    delete probeWindow.__menuWindowReached;
    return reached;
  });
  expect(windowCloserCouldRun).toBe(false);
  await expect(memberActionsDropdown).not.toHaveClass(/(?:^|\s)open(?:\s|$)/);
  await expect(page.locator('.users-many-actions > .dropdown')).toHaveClass(/(?:^|\s)open(?:\s|$)/);

  const memberHydration = await openBeforeHydration(page, baseURL, `${managePath}/users`, testInfo);
  try {
    const memberCheckbox = memberHydration.page.getByRole('checkbox', { name: `Select ${inviteName}` });
    await expect(memberCheckbox).toBeVisible();
    await memberCheckbox.check();
    await memberHydration.hydrate();
    await expect(memberCheckbox).toBeChecked();

    // These hidden action inputs are rendered from Svelte's `selected` model,
    // not from the checkbox DOM, so their value proves bind:group adopted the
    // pre-hydration edit.
    const memberId = await memberCheckbox.getAttribute('value');
    if (!memberId) throw new Error('The invited member checkbox did not expose its member id.');
    await expect(memberHydration.page.locator('.users-many-actions input[name="roomUserId"]').first()).toHaveValue(
      memberId
    );
    expect(memberHydration.diagnostics).toEqual([]);
  } finally {
    await memberHydration.close();
  }

  // Seed a nonempty server value before testing that a newer DOM value wins.
  const textListPath = `${managePath}/text-list`;
  await page.goto(textListPath);
  const textList = page.getByLabel('Text list');
  await textList.fill('Server text-list baseline');
  const textListResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/saveTextList')
  );
  await page.getByRole('button', { name: 'Save List' }).click();
  expect((await textListResponse).ok()).toBeTruthy();
  await expect(textList).toHaveValue('Server text-list baseline');

  const textListHydration = await openBeforeHydration(page, baseURL, textListPath, testInfo);
  try {
    const hydratedTextList = textListHydration.page.getByLabel('Text list');
    await expect(hydratedTextList).toHaveValue('Server text-list baseline');
    await hydratedTextList.fill('Newer pre-hydration text-list draft');
    await textListHydration.hydrate();
    await expect(hydratedTextList).toHaveValue('Newer pre-hydration text-list draft');
    expect(textListHydration.diagnostics).toEqual([]);
  } finally {
    await textListHydration.close();
  }

  // Seed nonempty sanitized HTML through the real editor and save action.
  const brandingPath = `${managePath}/branding`;
  await page.goto(brandingPath);
  const toggleHtml = page.getByTitle('Toggle html / Rich Text');
  await toggleHtml.click();
  const source = page.getByLabel('HTML source');
  await source.fill('<p>Server branding baseline</p>');
  const brandingResponse = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/saveField')
  );
  await page.getByRole('button', { name: 'Save Editor Changes' }).click();
  expect((await brandingResponse).ok()).toBeTruthy();
  await expect(source).toHaveValue('<p>Server branding baseline</p>');

  const brandingHydration = await openBeforeHydration(page, baseURL, brandingPath, testInfo);
  try {
    const hydratedPage = brandingHydration.page;
    const richEditor = hydratedPage.getByRole('textbox', { name: 'Login landing page' });
    await expect(richEditor).toHaveText('Server branding baseline');
    await richEditor.fill('Newer pre-hydration branding draft');
    await brandingHydration.hydrate();
    await expect(richEditor).toHaveText('Newer pre-hydration branding draft');

    const submittedDescription = hydratedPage.locator('form[action*="saveField"] input[name="value"]');
    await expect(submittedDescription).toHaveValue(/Newer pre-hydration branding draft/);
    expect(await submittedDescription.inputValue()).not.toContain('<!---->');

    // Raw source must survive the source-to-rich transition, but only after the
    // shared allowlist has removed executable markup and attributes.
    const hydratedToggleHtml = hydratedPage.getByTitle('Toggle html / Rich Text');
    await hydratedToggleHtml.click();
    let hydratedSource = hydratedPage.getByLabel('HTML source');
    await hydratedSource.fill(
      '<p>Retained <strong>safe</strong></p>' +
        '<img src="data:image/png;base64,not-valid" onerror="window.__hydrationXss=1">' +
        '<script>window.__hydrationXss=2</script>' +
        '<a href="javascript:window.__hydrationXss=3">bad link</a>'
    );
    await hydratedPage.evaluate(() => {
      (window as typeof window & { __hydrationXss?: number }).__hydrationXss = 0;
    });
    await hydratedToggleHtml.click();

    await expect(richEditor.locator('strong')).toHaveText('safe');
    await expect(richEditor.locator('script')).toHaveCount(0);
    await expect(richEditor.locator('img')).not.toHaveAttribute('onerror');
    await expect(richEditor.locator('a')).not.toHaveAttribute('href');
    expect(
      await hydratedPage.evaluate(() => (window as typeof window & { __hydrationXss?: number }).__hydrationXss)
    ).toBe(0);

    await hydratedToggleHtml.click();
    hydratedSource = hydratedPage.getByLabel('HTML source');
    await expect(hydratedSource).toHaveValue(/Retained <strong>safe<\/strong>/);
    expect(await hydratedSource.inputValue()).not.toMatch(/onerror|javascript:|<script/i);

    // Bypass the browser sanitizer as a hostile client could. The server action
    // must return the canonical allowlisted seed, and the already-mounted raw
    // snippet must replace its stale editable DOM when that seed changes.
    await hydratedToggleHtml.click();
    await richEditor.evaluate((element) => {
      element.innerHTML =
        '<p>Server <strong>canonical</strong></p>' +
        '<a href="https://example.com" target="_blank" rel="opener">link</a>' +
        '<img src="/avatar-placeholder.svg" onerror="window.__hydrationXss=4">';
      element.dispatchEvent(new InputEvent('input', { bubbles: true }));
    });
    await expect(submittedDescription).toHaveValue(/onerror=/);

    const canonicalResponse = hydratedPage.waitForResponse(
      (response) => response.request().method() === 'POST' && response.url().includes('/saveField')
    );
    await hydratedPage.getByRole('button', { name: 'Save Editor Changes' }).click();
    expect((await canonicalResponse).ok()).toBeTruthy();

    await expect(richEditor).toContainText('Server canonical');
    await expect(richEditor.locator('img')).not.toHaveAttribute('onerror');
    await expect(richEditor.locator('img')).toHaveAttribute('alt', '');
    await expect(richEditor.locator('a')).toHaveAttribute('rel', 'noopener noreferrer');

    await hydratedPage.reload();
    const persistedEditor = hydratedPage.getByRole('textbox', { name: 'Login landing page' });
    await expect(persistedEditor).toContainText('Server canonical');
    await expect(persistedEditor.locator('img')).not.toHaveAttribute('onerror');
    await expect(persistedEditor.locator('img')).toHaveAttribute('alt', '');
    await expect(persistedEditor.locator('a')).toHaveAttribute('rel', 'noopener noreferrer');
    expect(brandingHydration.diagnostics).toEqual([]);
  } finally {
    await brandingHydration.close();
  }
  expect(diagnostics).toEqual([]);
});
