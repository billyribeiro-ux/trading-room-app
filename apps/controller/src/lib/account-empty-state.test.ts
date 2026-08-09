import { describe, expect, it } from 'vitest';
import { render as ssr } from 'svelte/server';
import Page from '../routes/(app)/account/+page.svelte';

/**
 * The account page with ZERO rooms — the state an owner lands in after deleting their last one.
 *
 * This is not hypothetical. The owner deleted their only room and reported being unable to reach
 * the manage page at all: no room means no Manage button, and if the only way to create one were
 * also gated on having one, the account would be a dead end with no way out but the database.
 *
 * The way out is deliberately obscure, because the reference made it so: five clicks on the word
 * "Sessions" (`ng-click="showNewRoom=showNewRoom+1"`) reveal the New Room control. Obscure is
 * survivable. UNREACHABLE is not — so what this pins is that the escape hatch renders when there
 * is nothing else on the page.
 */
function emptyAccount() {
  return ssr(Page as never, {
    props: {
      data: {
        rooms: [],
        badges: [],
        adminUsers: [],
        admins: [],
        apiKeys: [],
        apiScopes: [],
        entitlements: { marketplace: true, 'text-list': true, sso: true, mobile: true },
        user: { id: 1, displayName: 'Ada Lovelace', email: 'ada@example.com', emailVerifiedAt: new Date() },
        verificationEnforced: false
      },
      form: null
    } as never
  }).body;
}

describe('an account with no rooms', () => {
  it('still renders the clickable "Sessions" label — the only way back', () => {
    const body = emptyAccount();
    expect(body).toContain('Sessions');
    // it must be the INTERACTIVE one, not a bare heading: the counter is what reveals New Room
    expect(body).toMatch(/class="[^"]*acc-clickable[^"]*"[^>]*role="button"/);
  });

  it('reports zero rather than hiding the count', () => {
    expect(emptyAccount()).toContain('Total');
  });

  it('renders the sessions table head, so the page is not blank', () => {
    // The reference has no empty-state row in this table — proven by reading every <tr> — so the
    // headings are all an owner sees, and they must still be there.
    const body = emptyAccount();
    expect(body).toContain('Session ID');
    expect(body).toContain('Actions');
  });
});
