import { describe, expect, it } from 'vitest';
import { render as ssr } from 'svelte/server';
import { readFileSync } from 'node:fs';
import Page from '../routes/(app)/account/+page.svelte';

/**
 * Every failure this page can produce has to be visible.
 *
 * `+page.server.ts` returns `fail(...)` with a `message` on more than twenty paths — a room with no
 * name, a badge label already taken, an admin address in use, an upload of the wrong type, an API
 * key that could not be rotated. For a long time NOTHING rendered any of them: the only field read
 * off `form` anywhere on the page was `verificationSent`.
 *
 * The result was a page that lied by omission. Pressing New Room with a blank name sent the
 * request, the server refused it, `enhance` put the reason on `form`, and the page redrew exactly
 * as before — no row, no error, nothing. The only available conclusion was that the button was
 * broken, and that is precisely what got reported.
 *
 * These cases exist because a silent `fail()` is indistinguishable from a dead control, and the
 * cost of not noticing was measured in hours.
 */

const data = {
  rooms: [],
  badges: [],
  adminUsers: [],
  admins: [],
  apiKeys: [],
  apiScopes: [],
  entitlements: {
    marketplace: true,
    'text-list': true,
    sso: true,
    mobile: true
  },
  user: {
    id: 1,
    displayName: 'Ada Lovelace',
    email: 'ada@example.com',
    emailVerifiedAt: new Date()
  },
  profileAuthority: { enabled: false },
  roomCreateRequestId: '90000000-0000-4000-8000-000000000001',
  verificationEnforced: false
};

function pageWith(form: unknown) {
  return ssr(Page as never, { props: { data, form } as never }).body;
}

/** Strip comments before asserting: a test that matches its own explanatory prose proves nothing. */
function visible(html: string) {
  return html.replace(/<!--[\s\S]*?-->/g, '');
}

describe('failures the server reports are shown to the operator', () => {
  it('renders the message from a failed action', () => {
    const body = visible(pageWith({ message: 'A room needs a name.' }));
    expect(body).toContain('A room needs a name.');
  });

  it('marks it as an alert, so it is announced and not merely coloured', () => {
    const body = visible(pageWith({ message: 'A room needs a name.' }));
    expect(body).toMatch(/role="alert"/);
  });

  it('says nothing when there is nothing to say', () => {
    const body = visible(pageWith(null));
    expect(body).not.toMatch(/role="alert"/);
  });

  it('shows a message from any action, not just room creation', () => {
    // one message slot serves all of them; pinning a second proves it is not hardcoded to the first
    const body = visible(pageWith({ message: 'That badge label is already in use.' }));
    expect(body).toContain('That badge label is already in use.');
  });

  it('styles it with the rule written for it rather than inventing a new one', () => {
    // `.acc-error` sat unused in account.css for exactly this purpose
    const css = readFileSync(new URL('../account.css', import.meta.url), 'utf8');
    expect(css).toMatch(/^\.acc-error\s*\{/m);
    expect(visible(pageWith({ message: 'x' }))).toMatch(/class="acc-error"/);
  });
});
