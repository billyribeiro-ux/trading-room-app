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
    for (const marker of ['undefined', 'nan', '[object object]', '{{']) {
      expect(body, `the page renders the literal "${marker}"`).not.toContain(marker);
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
