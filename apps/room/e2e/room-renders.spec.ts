import { readFileSync } from 'node:fs';

import { expect, test, type Page } from '@playwright/test';

import { handoffUrl } from './handoff';

/**
 * Does the room actually paint?
 *
 * ## What this suite is for, and what it deliberately is not
 *
 * 3,085 unit assertions cover this application, and every one of them is made against source text or
 * against a component mounted in jsdom. Neither has ever painted a pixel — the repository's own
 * verification notes say so on every entry, as *"nothing was opened in a browser"*.
 *
 * This is the one class of failure those assertions structurally cannot see: markup that
 * type-checks, mounts, and renders wrong. So the assertions below are deliberately SHALLOW and
 * BROAD. They ask whether the door opens, whether the room paints, whether the composer is reachable
 * and whether a setting the server sends changes what a member sees. They do not re-assert the rules
 * — those have their own contract files, which are faster, more precise, and already green.
 *
 * A browser test that duplicates a unit test costs thirty seconds and buys nothing. A browser test
 * that notices the page is blank buys the thing nothing else here can.
 *
 * ## The login is the real one
 *
 * `e2e/handoff.ts` mints the controller's HS256 handoff and the room's own verifier checks it —
 * algorithm pinned, signature constant-time, `exp` required. There is no test-only bypass, because a
 * bypass would test a door the product does not have.
 */

const ROOM = '7301';

/**
 * THE SUITE IS HERMETIC, and that is a correctness property rather than a speed trick.
 *
 * The room's pages reach for third parties by design: Gravatar for every roster face, and the
 * geolocation JSONP `events.svelte.ts` documents (with its own privacy note). None of them is the
 * subject here, and every one of them makes this suite depend on a network it does not control —
 * measured the hard way, with a run that spent nine minutes waiting on hosts an egress proxy was
 * refusing.
 *
 * So anything that is not this room's own origin is aborted. Two consequences worth stating:
 *
 * * a spec can never pass or fail because a CDN was slow, which is what makes a browser gate one
 *   people trust rather than one they learn to re-run;
 * * the console-error assertion below has to tolerate the aborts it causes itself, which is why its
 *   filter names them rather than filtering broadly.
 */
test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue();
    return route.abort();
  });
});

test.describe('the room opens and paints', () => {
  test('the login page renders without a session', async ({ page }) => {
    /*
      The one route that renders for an unauthenticated visitor, and the readiness probe the config
      uses. If this is blank, nothing below can mean anything.
    */
    const response = await page.goto('/session');
    expect(response?.status(), 'the login page must not be an error').toBeLessThan(400);
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('a signed handoff reaches the login form with the room named', async ({ page }) => {
    await page.goto(handoffUrl(ROOM));
    /*
      The room's title comes from the CONTROLLER — `roomConfig.room.name` — so seeing it proves the
      whole chain: the room minted a `config-read` capability, the stub verified it, the answer was
      parsed, and the value reached the rendered page. A stub that accepted anything could not prove
      that.

      Asserted on the DOCUMENT TITLE rather than on a heading, because the login page draws the name
      in one of two layouts depending on whether the room has a `description` — so a heading locator
      is really an assertion about which layout is active, and it failed for exactly that reason
      first time round. `<title>` carries it in both.
    */
    await expect(page).toHaveTitle(new RegExp(`E2E Room ${ROOM}`));
  });

  test('the handoff email survives hydration, and the URL loses the token', async ({ page }) => {
    /*
      ── `TODO.md` ROW 8, TURNED FROM AN ANECDOTE INTO AN ASSERTION ─────────────────────────────

      That row records a guest's pre-hydration email being *"RARELY discarded"* on `/session/[code]`
      — once in nine runs, never in eight targeted repeats — with the field resolving first as the
      SSR node and then as one with no `value` attribute: **replaced rather than hydrated.** It was
      mitigated by CI retries and never reproduced, and nothing in this suite asserted the field at
      all, so the only record of it was a sentence.

      Now it is checked on every run. The value is read as the live DOM PROPERTY rather than as the
      attribute, because that is what a user submits and what a replaced node loses: Svelte sets
      `input.value` on the client and does not re-emit the attribute, so an attribute assertion here
      would fail on a correctly hydrated field and pass on nothing useful.

      The second half is the same page's other known defect, and they belong together because both
      turn on the mount-time effect that strips the token: the address bar must lose `jwtSite` while
      the field it seeded keeps its value. A regression that re-rendered the form would show up here
      as an empty field, and a regression in the latch would show up as a token still in the URL.

      ## The reproduction attempt, and what it measured

      Row 8 named the likely condition: *"the load correlation suggests throttling the CPU or the
      script release."* Both were tried on 2026-08-31 — twelve repeats on a machine at load average
      12, then ten more with `Emulation.setCPUThrottlingRate` at **8x** through CDP. **Twenty-two
      attempts, zero reproductions**, against the row's own eight.

      That is not a proof of absence and this comment does not claim one. What it changes is who
      finds it next: the field was asserted nowhere, so the only record was a sentence in a tracker.
      It is asserted on every run now.

      One consequence worth stating: `playwright.config.ts` retries twice in CI, which was the
      mitigation while nothing tested this. A retry now turns a recurrence into a **flaky** result
      rather than a red one — so a flaky mark on THIS spec is the reproduction row 8 asked for, and
      should be read as a finding rather than as noise.
    */
    const email = 'row-eight@example.com';
    await page.goto(handoffUrl(ROOM, { email, type: 'guest' }));

    const field = page.locator('#login-email');
    await expect(field).toHaveValue(email);

    /* The strip is an effect, so it lands after paint; the assertion waits rather than sampling. */
    await expect
      .poll(() => new URL(page.url()).searchParams.has('jwtSite'), {
        message: 'the mount-time effect must strip the handoff from the address bar'
      })
      .toBe(false);

    /* And the field is STILL filled after the shallow navigation, which is the actual row-8 claim. */
    await expect(field).toHaveValue(email);
  });

  test('a REFUSED handoff does not open the room', async ({ page }) => {
    /*
      The negative half, and the reason this file is a test rather than a screenshot. A tampered
      signature must not produce a session — and this is the only place in the repository where that
      is asserted end to end rather than against the verifier in isolation.
    */
    const url = handoffUrl(ROOM);
    await page.goto(`${url.slice(0, -4)}xxxx`);
    await expect(page.locator('body')).not.toContainText('E2E Presenter');
  });
});

/*
  SERIAL, WITH ONE LOGIN FOR THE WHOLE GROUP, and both halves are a measurement.

  Under `vite dev` the room's page is compiled for SSR on its first request, and it is the largest
  component in the repository. Logging in per spec paid that cost once and then paid a fresh login
  three more times: the first spec exceeded ninety seconds while the three after it passed in
  seconds — the signature of a cold compile, not a slow room.

  So the group shares one page. That is a real trade: a failure in one spec can leave the next one on
  a page it did not expect, which is why the mode is `serial` (Playwright then skips the rest rather
  than running them against unknown state) and why every assertion below reads the page rather than
  changing it. A suite that MUTATED the room would have to pay for isolation instead.
*/
test.describe('the room itself', () => {
  // Scoped to THIS group. At file level it made a failure in the login group skip these too, which
  // hid three results behind one — the opposite of what a gate is for.
  test.describe.configure({ mode: 'serial' });

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    // The hermetic routing again — `beforeEach` above binds to the per-test `page`, and this one is
    // the group's own, so it needs its own handler. See the note at the top for why it exists.
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue();
      return route.abort();
    });
    await page.goto(handoffUrl(ROOM));
    /*
      The Login button is the reference's `doLoginCheck()` and the room's only entry action. Clicking
      it rather than posting the form directly is the point: a submit button that stopped submitting
      is exactly the failure a jsdom mount cannot see.
    */
    await page
      .getByRole('button', { name: /log ?in|enter/i })
      .first()
      .click();
    /*
      `/?room=<code>` and not `/sess/<code>`. The realtime CHANNEL is `/sess/{id}/…`, which is what
      the reference names its socket paths, and the room's own page is the root route with a `room`
      query parameter — a distinction it is easy to carry over from the transcription notes into a
      URL assertion, as this one did on its first run.
    */
    /*
      The click posts the login action, which sets the session cookie. The room is then reached by
      NAVIGATING to it rather than by waiting for the form's own redirect, and that is deliberate:
      the enhanced submit resolves client-side and the browser's URL does not reliably become the
      room's within a bounded wait, so a `waitForURL` here was watching for something that may never
      happen while the login had in fact succeeded — the server log showed the room answering 200
      while the spec timed out.

      A direct navigation is not a shortcut past the door. The door is the POST above; this is the
      same thing a member's own reload does with the cookie it produced, and it fails just as loudly
      if the cookie was never set, because the room refuses a request without a session.
    */
    await page.waitForTimeout(1_000);
    const entered = await page.goto(`/?room=${ROOM}`, { waitUntil: 'domcontentloaded' });
    /*
      THE STATUS IS ASSERTED HERE, IN THE SETUP, and that is not belt-and-braces.

      Every assertion in this group reads the rendered page — it is not empty, it contains no
      `undefined`, it does not scroll sideways. **An error page satisfies all three.** So without
      this line the group could report four green ticks while the room was answering 403 to every
      request, which is exactly the shape of hollow coverage the rest of this repository's gates
      exist to refuse. Caught by the console-error spec noticing a 403 the other specs were happily
      asserting against.
    */
    expect(entered?.status(), 'the room must answer 200 before anything below means anything').toBe(
      200
    );
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('paints the room shell, not an error page', async () => {
    await expect(page.locator('body')).not.toContainText('Internal Error');
    await expect(page.locator('body')).not.toContainText('500');
    // The alerts log and the chat column are the two panes every room has.
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('renders no unresolved template markers anywhere on the page', async () => {
    /*
      THE ASSERTION THAT WOULD HAVE CAUGHT `#summernoteClosedMsg`.

      `ModalHost.svelte` rendered the literal string `undefined` into a panel for weeks, because the
      value it interpolated was never loaded. Nothing failed: the markup was valid, the type was
      `string | undefined`, and no unit test read that node. A browser sees it immediately.
    */
    const body = (await page.locator('body').innerText()).toLowerCase();
    /*
      `%sveltekit` JOINED THIS LIST ON 2026-09-01, and it was absent for the reason every list like
      this is incomplete: the four above are the markers that had already gone wrong.

      `app.html`'s docblock named the head placeholder in prose. SvelteKit substitutes the FIRST
      occurrence in the template, so the head was injected into the COMMENT and the real placeholder
      was served to browsers as literal text. This assertion ran on every commit for weeks and saw
      it, because it was looking for four other strings.
    */
    for (const marker of ['undefined', 'nan', '[object object]', '{{', '%sveltekit']) {
      expect(body, `the page renders the literal "${marker}"`).not.toContain(marker);
    }
  });

  test('no prose from the shell has escaped into the page', async () => {
    /*
      THE OTHER HALF OF THE SAME DEFECT, and the half no marker list can be written for.

      The injected head opens with Svelte's style-hash marker — an HTML comment — and HTML comments do
      not nest, so its closing sequence ended `app.html`'s comment early and the rest of that docblock
      was painted across the top of every page. The escaped text is ordinary English; there is no
      token to look for.

      ## The first version of this test PASSED under its own negative control

      It derived its probes by matching `<!--…-->` over `app.html` — which is exactly how a browser
      parses it, and therefore exactly the parse that is WRONG when this defect is present. Under the
      mutation, the regex stopped at the injected closer too, so the escaped prose was never a probe
      and the test went green over the thing it was written to catch. Re-run properly it is red; the
      run that reported "1 passed" was the finding.

      ## What it reads instead: prose LINES, with no notion of comments at all

      A line of `app.html` that does not begin with a tag is prose the author wrote for other authors,
      whatever the parser later decides about it — so it is the right probe whether the comment
      structure is intact or broken. None of those lines may appear in what a member reads.

      A new comment is covered the moment it is written, which is the property a hard-coded sentinel
      would not have. `app-html-contract.test.ts` catches the same defect at the source, faster and
      with a better message; this is the backstop that does not depend on knowing the mechanism —
      the one thing that was missing when the mechanism was unknown.
    */
    const bodyText = await page.locator('body').innerText();
    const shell = readFileSync(new URL('../src/app.html', import.meta.url), 'utf8');
    const probes = shell
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 40 && !line.startsWith('<') && !line.includes('%sveltekit'));
    expect(probes.length, 'app.html must carry prose for this to test anything').toBeGreaterThan(0);
    for (const probe of probes) {
      expect(bodyText, `app.html prose reached the page: "${probe}"`).not.toContain(probe);
    }
  });

  test('has no console error while the room loads', async () => {
    /*
      Collected on a SECOND navigation rather than in `beforeEach`, because the listener has to be
      attached before the load it is watching. A room that throws during hydration still paints —
      which is precisely why this is worth asserting separately from what is visible.
    */
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));
    /*
      RESPONSES TOO, and they are the half that is diagnosable. A failed request reaches the console
      as the bare string "Failed to load resource: the server responded with a status of 403" — with
      no URL — so an assertion on console text alone tells whoever reads the failure that something
      is broken and nothing about what. Recording the response gives the address.
    */
    const failed: string[] = [];
    page.on('response', (response) => {
      if (response.status() >= 400) failed.push(`${response.status()} ${response.url()}`);
    });

    await page.reload();
    /*
      NOT `waitForLoadState('networkidle')`, and the reason is this application specifically.

      The room opens a `text/event-stream` and holds it — that is its realtime channel — so the
      network is never idle and `networkidle` waits until the test times out. It cost a ten-minute
      hang to learn, which is exactly the kind of thing a browser suite teaches and no unit test can.
      Playwright's own documentation discourages the state for this reason.

      `domcontentloaded` plus a bounded settle is what is actually wanted: hydration has run, effects
      have fired, and anything thrown on the way has been recorded by the listeners above.
    */
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2_000);

    /*
      Two exclusions, each named rather than a blanket filter. A favicon the room does not ship and a
      media socket with no SFU in this job are absences of infrastructure, not defects in the page;
      anything else is a real error and fails.
    */
    const real = errors.filter(
      (text) =>
        !/favicon/i.test(text) &&
        !/websocket|mediasoup|ws:\/\//i.test(text) &&
        // The aborts this suite causes itself — see the hermetic-routing note at the top.
        !/ERR_FAILED|ERR_ABORTED|net::/i.test(text) &&
        !/gravatar|googleapis|google\.com|freegeoip/i.test(text) &&
        /*
          "Failed to load resource: the server responded with a status of N" carries NO URL, so it
          can only ever be filtered by status — which would mean excluding every 503 anywhere, the
          blanket the response assertion above exists to avoid. Dropped here because that assertion
          already covers precisely these failures WITH the address: a request that fails is reported
          once, by the check that can name it.
        */
        !/^Failed to load resource:/.test(text)
    );
    /*
      The same two named exclusions apply to responses: this suite aborts every third-party request
      itself, and there is no SFU in this job.
    */
    const realFailures = failed.filter(
      (line) =>
        !/favicon|gravatar|googleapis|google\.com|freegeoip/i.test(line) &&
        /*
          `/api/media/grant` 503 — the SFU admission endpoint, and there is no SFU in this job. Named
          as one path with one status rather than filtered as "any 503", because a 503 from anywhere
          ELSE is a real failure and this suite must still say so. The room degrades honestly without
          a media plane, which is a property `.env.example` documents and this run exercises.
        */
        !/503 .*\/api\/media\/grant/.test(line)
    );
    expect(realFailures, realFailures.join('\n')).toEqual([]);
    expect(real, real.join('\n')).toEqual([]);
  });

  test('the page body never scrolls sideways', async () => {
    /*
      A layout assertion no jsdom mount can make, because jsdom has no layout. Wide content — the
      alerts table, a long message, the scheduler's manage table — is supposed to scroll inside its
      own container.
    */
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    );
    expect(overflow, 'the document scrolls horizontally').toBeLessThanOrEqual(1);
  });
});

/*
  THE DROPDOWNS, WHICH ARE THE ONE THING IN THIS ROOM NO STATIC CHECK CAN CONFIRM.

  This app renders Bootstrap's markup and ships none of Bootstrap's JavaScript, so `data-bs-toggle`
  is inert and a dropdown opens only if this codebase adds `.show` itself, from `RoomMenus`. Two
  menus were missing that for months and NOTHING here could see it: both type-check, both lint
  clean, `svelte-check` is silent on both, `bootstrap-dropdown-contract.test.ts` reads source text,
  and a jsdom mount has no layout at all.

  Only a browser answers the real question, which is not "is the class right" but "is the menu ON
  SCREEN after a click". This group asks it the way a member does, over every dropdown the room
  actually renders, and it reads `display` from the computed style because `display` IS the
  mechanism that was broken.

  ## What it does NOT cover, stated rather than implied

  The two menus that were repaired are not among the six below, and cannot be. The presentation
  area's volume control is ATTACHED ONLY - `ScreenZoomControls` renders it beside a screen that is
  being shared - and the streaming view's buffer picker needs a live MediaMTX stream. Neither exists
  in this job, and `getDisplayMedia` cannot be automated at all, which this repository already
  records as needing a human at a screen picker. Measured, not assumed: a first draft of this spec
  looked for `#dropdownVolume` in `vo=1` mode and found NOTHING IN THE DOM.

  What is covered is the MECHANISM those two now use, including the navbar's own `#dropdownVolume` -
  the twin of the repaired control, driven by the same class. If `RoomMenus` stops opening menus,
  this goes red.

  Its own group, and NOT serial with the one above, because this one CLICKS - that group shares a
  page precisely on the promise that every assertion reads rather than mutates.
*/
test.describe('the dropdowns open, in a browser', () => {
  test('every rendered dropdown is hidden until clicked, and shuts again', async ({ page }) => {
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue();
      return route.abort();
    });
    await page.goto(handoffUrl(ROOM));
    await page
      .getByRole('button', { name: /log ?in|enter/i })
      .first()
      .click();
    await page.waitForTimeout(1_000);
    const entered = await page.goto(`/?room=${ROOM}`, { waitUntil: 'domcontentloaded' });
    expect(entered?.status(), 'the room must answer 200 before anything below means anything').toBe(
      200
    );

    /*
      Discovered from the page rather than listed here. A hard-coded list rots into a spec that keeps
      passing while the controls it names are gone - and the menu is found through the trigger's own
      `aria-labelledby`, which is the association the markup already makes.
    */
    const pairs = await page.evaluate(() =>
      [...document.querySelectorAll('[data-bs-toggle="dropdown"]')]
        .filter((trigger) => {
          if (!trigger.id || (trigger as HTMLElement).offsetParent === null) return false;
          /*
            IN THE VIEWPORT, not merely in the layout. The sidebar's `#archivesDropdown` is rendered
            and laid out but sits off-screen until the sidebar slides in, and Playwright reported
            exactly that - "element is outside of the viewport" - for sixty seconds. A member cannot
            click it either without opening the sidebar first, so testing it here would be testing a
            different interaction than the one this spec is about.
          */
          const box = trigger.getBoundingClientRect();
          return (
            box.width > 0 &&
            box.height > 0 &&
            box.top >= 0 &&
            box.left >= 0 &&
            box.bottom <= window.innerHeight &&
            box.right <= window.innerWidth
          );
        })
        .map((trigger) => trigger.id)
        .filter((id) => document.querySelector(`.dropdown-menu[aria-labelledby="${id}"]`))
    );

    /*
      The vacuity floor, and it is not decorative: every assertion below runs inside a loop over this
      list, so an empty list is silent green ticks. Five visible, paired dropdowns were measured in
      the room this job builds.
    */
    expect(pairs.length, 'no dropdown was discovered, so nothing below was tested').toBeGreaterThan(
      3
    );

    /*
      ONE DISCARDED INTERACTION, and it is not superstition — it is a measurement.

      The FIRST click after this navigation never takes effect, whichever control receives it. That
      was established by reversing the order: with the recording menu first, the recording menu
      failed and the other four passed; with the volume menu first, the VOLUME menu failed and the
      recording menu passed. The failure follows the position, not the control.

      Waiting on Svelte's delegated-handler symbol appearing on the trigger is not enough — it is
      already there while that first click is still being dropped — so the honest thing is to spend
      one interaction rather than to assert a cause this suite has not proven. It is spent on the
      body, where it is also what the loop below does between menus.

      Recorded because it nearly became a bug report: the first draft of this spec read that dropped
      click as a dead control and got as far as bisecting `RoomNavbar.svelte`.
    */
    await page.locator('body').click({ position: { x: 2, y: 2 } });
    await page.waitForTimeout(200);

    for (const id of pairs) {
      const trigger = page.locator(`#${id}`);
      const menu = page.locator(`.dropdown-menu[aria-labelledby="${id}"]`);
      const display = () =>
        menu.evaluate((node) => window.getComputedStyle(node as HTMLElement).display);

      expect(await display(), `${id}: the menu must start hidden`).toBe('none');

      await trigger.click();
      expect(await display(), `${id}: clicking the trigger must open the menu`).toBe('block');

      /*
        Closed by clicking the trigger again, which is the reference's own mechanism (Bootstrap
        toggles) and what `RoomMenus.toggle` reproduces. Leaving it open would also carry state into
        the next iteration.
      */
      await trigger.click();
      expect(await display(), `${id}: clicking the trigger again must shut the menu`).toBe('none');
    }
  });
});

/*
  THE PRIVATE-CHAT LOG IS A SCROLL BOX, which for the life of this repository it was not.

  `.pc-messages` is rendered by `PrivateChatPanel`, `private-chat.svelte.ts` scrolls it with
  `scroller.scrollTop = scroller.scrollHeight`, and NO CSS RULE ANYWHERE GAVE IT A HEIGHT. Two rules
  were missing and only one of them was the capture's:

    * `.pc-messages{height:calc(100% - 50px);overflow:hidden auto}` — the reference's own, at bundle
      byte 2,194,498, living in `app-privchatscroller`'s styles rather than `app-privchat`'s, which
      is how it was missed when that component's styles were transcribed.
    * `app-privchatscroller { display: block; height: 100% }` — OURS. A custom element is
      `display: inline` until something says so, which `app.css` already knew for `app-roomscroller`
      and had never said here.

  Setting `scrollTop` on a box that does not scroll is a no-op, so a conversation longer than the
  panel ran off the bottom with no way to reach it.

  ## What this proves, and what it does NOT

  A source assertion cannot see this at all: a rule can be present, correctly spelled, and never
  reach an element. So this asks a real browser, after the real stylesheets have cascaded.

  **Measured here:** both rules are parsed into live `CSSStyleDeclaration`s in the page's own
  stylesheets. Before this change the capture's rule did not exist in this repository at all and the
  `display` rule had never been written, so that is a real transition, and the negative control
  confirms it — removing either turns this red.

  **NOT measured here, stated rather than implied:** a laid-out box with a conversation in it.
  `.pc-messages` and its scroller only enter the DOM once a peer is selected, and selecting a peer
  needs a second member in the roster — two browser contexts and a live presence stream, which this
  job has neither of. The branch below that measures `getBoundingClientRect` is therefore the one
  that does NOT run today; it is kept because the day this job grows a second member it is the
  stronger assertion and will start running on its own.
*/
test.describe('the private-chat log', () => {
  test('carries both rules the browser needs to make it scroll', async ({ page }) => {
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue();
      return route.abort();
    });
    await page.goto(handoffUrl(ROOM));
    await page
      .getByRole('button', { name: /log ?in|enter/i })
      .first()
      .click();
    await page.waitForTimeout(1_000);
    const entered = await page.goto(`/?room=${ROOM}`, { waitUntil: 'domcontentloaded' });
    expect(entered?.status(), 'the room must answer 200 before anything below means anything').toBe(
      200
    );

    /*
      The panel is mounted and hidden rather than unmounted — `PrivateChatPanel.test.ts` pins that —
      so the element exists to be measured without a second member in the room, which this job has
      no way to produce. What cannot be measured that way is a THREAD, because `.pc-messages` only
      renders once a peer is selected. So this asserts the two rules that were missing, on the
      element that carries them, and says plainly which half it cannot reach.
    */
    const scroller = await page.evaluate(() => {
      const element = document.querySelector('app-privchatscroller');
      if (!element) return null;
      const style = getComputedStyle(element);
      return { display: style.display, height: element.getBoundingClientRect().height };
    });

    if (scroller === null) {
      /*
        No conversation open, so the scroller is not in the DOM. Measure the rule itself instead:
        a stylesheet that CONTAINS the selector proves nothing, but one whose rule the browser has
        parsed into a live `CSSStyleDeclaration` proves the cascade reached it.
      */
      const rules = await page.evaluate(() =>
        [...document.styleSheets].flatMap((sheet) => {
          try {
            return [...sheet.cssRules].map((rule) => rule.cssText);
          } catch {
            return [];
          }
        })
      );
      expect(
        rules.some((text) => /app-privchatscroller\s*\{[^}]*display:\s*block/.test(text)),
        'the scroller must be a block, or `.pc-messages` has no height to be a percentage of'
      ).toBe(true);
      expect(
        rules.some((text) => /\.pc-messages[^{]*\{[^}]*overflow:\s*hidden auto/.test(text)),
        'and the log must overflow, or setting scrollTop is a no-op'
      ).toBe(true);
      return;
    }

    expect(scroller.display, 'a custom element is inline until something says otherwise').toBe(
      'block'
    );
    expect(scroller.height, 'and an inline box has no height to give its child').toBeGreaterThan(0);
  });
});

/*
  XCP-09 and USM-18, in the one place that can settle either: a browser's CSSOM.

  Both changes landed on 2026-09-02 and both are about CSS that no unit test can check. The
  generated sheet is asserted as TEXT by `extra-chat-styles-contract.test.ts` — that the generator
  produced it and that a hand-edit fails — and text is exactly what a stylesheet is not. What text
  cannot tell you is whether the browser PARSED it, and these selectors are the kind that get
  dropped silently:

      app-extra-chat .roomLog:not(:root):not(app-extra-chat :is(app-extra-roomscroller) *)

  A `:not()` containing a compound `:is()` with a descendant combinator is legal in Selectors 4 and
  was legal in nothing before it. A parser that refuses it discards the WHOLE rule, without an error,
  and the second chat column would go on rendering unstyled exactly as it did before the generator
  existed — with a green suite, because every assertion about that file is about its bytes.

  The other half is the one that has to STAY absent. `chat-uploaded-img-sm` is transcribed from the
  capture and styles nothing there; inventing a rule for it here would be a worse divergence than
  binding a dead name, and this is the assertion that would catch somebody doing it.
*/
test.describe('the two 2026-09-02 stylesheet changes, in the CSSOM', () => {
  test('the extra column has its component rules and the dead class still has none', async ({
    page
  }) => {
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return route.continue();
      return route.abort();
    });
    await page.goto(handoffUrl(ROOM));
    await page
      .getByRole('button', { name: /log ?in|enter/i })
      .first()
      .click();
    await page.waitForTimeout(1_000);
    const entered = await page.goto(`/?room=${ROOM}`, { waitUntil: 'domcontentloaded' });
    expect(entered?.status(), 'the room must answer 200 before anything below means anything').toBe(
      200
    );

    /*
      Every rule the browser actually holds, flattened. Cross-origin sheets throw on `cssRules` and
      are skipped; the room's own styles are same-origin, which is the only reason this works.
    */
    const rules = await page.evaluate(() =>
      [...document.styleSheets].flatMap((sheet) => {
        try {
          return [...sheet.cssRules].map((rule) => rule.cssText);
        } catch {
          return [];
        }
      })
    );

    expect(
      rules.length,
      'no stylesheet was readable, so nothing below means anything'
    ).toBeGreaterThan(100);

    /*
      PARSED, not merely shipped. `cssText` is the browser's own re-serialisation of a rule it
      accepted — a rule it rejected is not in this list at all.
    */
    const extraChatRules = rules.filter((text) => /(^|[\s,>])app-extra-chat[\s.:]/.test(text));
    expect(
      extraChatRules.length,
      'the generated `captured-extra-chat.css` reached the browser and survived parsing'
    ).toBeGreaterThan(20);

    for (const [selector, declaration] of [
      ['.roomLog', /overflow-y:\s*scroll/],
      ['.txt-area', /./],
      ['.chatTabs', /./],
      ['.counterBadge', /./]
    ] as const) {
      expect(
        extraChatRules.some((text) => text.includes(selector) && declaration.test(text)),
        `app-extra-chat ${selector} is not a rule this browser holds`
      ).toBe(true);
    }

    /*
      And the class USM-18 binds is styled by NOTHING, here as in the capture. Asserted over every
      rule rather than over one sheet, because the way this would break is somebody adding it to
      `app.css` to "finish" the feature.
    */
    expect(
      rules.some((text) => text.includes('chat-uploaded-img-sm')),
      'a rule was invented for a class the reference leaves dead'
    ).toBe(false);
  });
});
