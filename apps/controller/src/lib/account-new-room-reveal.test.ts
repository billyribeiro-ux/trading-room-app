import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { render as ssr } from 'svelte/server';
import Page from '../routes/(app)/account/+page.svelte';

/**
 * New Room is ALWAYS reachable. No clicks, no secret, no precondition.
 *
 * The reference hides it behind `ng-show="showNewRoom>=5"` — five clicks on the word "Sessions" —
 * and nothing else on its page reveals it. This repo copied that faithfully, and the result was an
 * account that reached zero rooms and became a dead end: no Manage, no Launch, no room to open and
 * no visible way back. The reference never hits that state because registration provisions a room
 * and its tenants never delete their last one, so for it the control is an easter egg rather than a
 * route anyone needs.
 *
 * The standard here is the opposite and deliberate: every user, test accounts included, can create
 * a room and exercise the whole product without being told a trick. These cases exist so nobody
 * "restores fidelity" by putting the gate back.
 *
 * Asserted against the RENDERED page, not the source, and in the emptiest state there is — zero
 * rooms, which is precisely when it matters. A source assertion would pass on a form that some
 * enclosing condition never emits.
 */
const source = readFileSync(new URL('../routes/(app)/account/+page.svelte', import.meta.url), 'utf8');

/** Comments stripped, so no assertion can be satisfied by its own documentation. */
const markup = source.replace(/<!--[\s\S]*?-->/g, '');

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
      },
      form: null
    } as never
  }).body.replace(/<!--[\s\S]*?-->/g, '');
}

describe('New Room', () => {
  it('renders on an account with no rooms at all', () => {
    const body = emptyAccount();
    expect(body).toContain('action="?/createRoom"');
    expect(body).toContain('New Room');
  });

  it('renders its name field, which the action requires', () => {
    // `createRoom` reads `form.get('name')` and fails on a blank, so a button with no field
    // would only ever produce an error
    expect(emptyAccount()).toMatch(/name="name"/);
  });

  it('is behind NO click threshold', () => {
    // the gate that caused the dead end. It must not come back.
    expect(markup).not.toContain('{#if showNewRoom >= 5}');
    expect(markup).not.toMatch(/\{#if\s+showNewRoom\s*>=?\s*\d/);
  });

  it('is not gated on already having a room', () => {
    /*
      If the form sat inside a `data.rooms.length` conditional, deleting the last room would leave
      no way back except the database — the state this test exists because of. Proven by rendering
      with zero rooms above; this pins the source shape too, so the intent is legible.
    */
    const at = markup.indexOf('action="?/createRoom"');
    expect(at).toBeGreaterThan(-1);
    const before = markup.slice(0, at);
    const opened = (before.match(/\{#if data\.rooms\.length/g) ?? []).length;
    const closed = (before.match(/\{\/if\}/g) ?? []).length;
    expect(opened).toBeLessThanOrEqual(closed);
  });

  it('still counts clicks on the Sessions label, which drives the row id reveal', () => {
    // `showNewRoom` keeps its OTHER job — the reference's per-row `_id`/ownerID disclosure.
    // Removing the New Room gate must not remove that.
    expect(markup).toContain('onclick={() => (showNewRoom += 1)}');
    expect(markup).toContain('{#if showNewRoom}');
  });
});
