/**
 * The entitlement rule.
 *
 * This decides who gets into a paid room, so every branch is pinned — including the OR semantics,
 * which are counter-intuitive enough that somebody will eventually "fix" them into an AND. If that
 * day comes, `two configured families widen access rather than narrowing it` is the test that should
 * stop them, and its comment says where the semantics came from.
 */
import { describe, expect, it } from 'vitest';
import {
  evaluateEntitlement,
  explainEntitlementDecision,
  parseFilterList
} from './sso-entitlement';

const NOTHING = { memberships: [], products: [], permissions: [] };

describe('parseFilterList', () => {
  it('splits, trims, lower-cases and drops empties', () => {
    expect(parseFilterList(' Gold Annual , silver ,, PLATINUM ')).toEqual([
      'gold annual',
      'silver',
      'platinum'
    ]);
  });

  it('treats blank, whitespace, null and undefined as no filter at all', () => {
    for (const value of ['', '   ', ',', ' , , ', null, undefined]) {
      expect(parseFilterList(value)).toEqual([]);
    }
  });
});

describe('evaluateEntitlement', () => {
  /*
    "Leave blank to let all members in" — stated on all three fields in the reference's own help
    text. An unconfigured room is an open room to anyone the signature vouches for.
  */
  it('admits everyone when no filter is configured', () => {
    const decision = evaluateEntitlement({}, NOTHING);
    expect(decision).toEqual({ allowed: true, reason: 'no-filters-configured', matchedOn: [] });
  });

  it('treats blank filters the same as absent ones', () => {
    const decision = evaluateEntitlement(
      { allowedMemberships: '  ', allowedProducts: null, allowedPerms: '' },
      NOTHING
    );
    expect(decision.allowed).toBe(true);
  });

  it('admits a visitor holding a listed membership', () => {
    const decision = evaluateEntitlement(
      { allowedMemberships: 'gold-annual, platinum' },
      { ...NOTHING, memberships: ['gold-annual'] }
    );
    expect(decision).toEqual({ allowed: true, reason: 'matched', matchedOn: ['membership:gold-annual'] });
  });

  it('refuses a visitor holding none of them, and says what was required', () => {
    const decision = evaluateEntitlement(
      { allowedMemberships: 'gold-annual' },
      { ...NOTHING, memberships: ['lapsed-trial'] }
    );
    expect(decision).toEqual({
      allowed: false,
      reason: 'no-match',
      requiredOneOf: ['membership:gold-annual']
    });
  });

  /*
    THE lapsed-payment case, and the whole point of the feature.

    WooCommerce stops reporting the plan the moment a subscription lapses, so the token simply
    arrives with nothing in it. No special "expired" signal is needed or wanted — absence is the
    signal, which means we cannot get out of step with their billing state machine.
  */
  it('refuses a visitor whose site now asserts no entitlements at all', () => {
    const decision = evaluateEntitlement({ allowedMemberships: 'gold-annual' }, NOTHING);
    expect(decision.allowed).toBe(false);
  });

  it('matches case-insensitively and ignores surrounding whitespace on both sides', () => {
    const decision = evaluateEntitlement(
      { allowedMemberships: ' Gold Annual ' },
      { ...NOTHING, memberships: ['  gold annual  '] }
    );
    expect(decision.allowed).toBe(true);
  });

  it('does not match on prefix or substring', () => {
    const decision = evaluateEntitlement(
      { allowedMemberships: 'gold-plus' },
      { ...NOTHING, memberships: ['gold'] }
    );
    expect(decision.allowed).toBe(false);
  });

  /*
    OR, not AND — and this is the surprising one.

    Source: the reference's help for `allowedProducts` and `allowedPerms`, both of which read
    "Either a product or membership, or both must match". An owner who fills in a second family
    expecting to tighten the room has instead opened it to a second population. The rule is
    implemented as the evidence states it; `explainEntitlementDecision` is what warns the owner.
  */
  it('two configured families widen access rather than narrowing it', () => {
    const filters = { allowedMemberships: 'gold-annual', allowedProducts: 'options-mastery' };

    const membershipOnly = evaluateEntitlement(filters, {
      ...NOTHING,
      memberships: ['gold-annual']
    });
    const productOnly = evaluateEntitlement(filters, { ...NOTHING, products: ['options-mastery'] });

    expect(membershipOnly.allowed).toBe(true);
    expect(productOnly.allowed).toBe(true);

    const neither = evaluateEntitlement(filters, { ...NOTHING, memberships: ['bronze'] });
    expect(neither.allowed).toBe(false);
  });

  it('reports every basis when a visitor matches more than one filter', () => {
    const decision = evaluateEntitlement(
      { allowedMemberships: 'gold-annual', allowedPerms: 'room-access' },
      { ...NOTHING, memberships: ['gold-annual'], permissions: ['room-access'] }
    );
    expect(decision.allowed).toBe(true);
    if (!decision.allowed) return;
    expect(decision.matchedOn).toEqual(['membership:gold-annual', 'permission:room-access']);
  });

  it('permissions participate in the same disjunction', () => {
    const decision = evaluateEntitlement(
      { allowedPerms: 'vip' },
      { ...NOTHING, permissions: ['vip'] }
    );
    expect(decision.allowed).toBe(true);
  });
});

describe('explainEntitlementDecision', () => {
  it('says an unfiltered room is open', () => {
    expect(explainEntitlementDecision({})).toMatch(/Anyone your site vouches for/);
  });

  it('describes a single filter without the widening warning', () => {
    const text = explainEntitlementDecision({ allowedMemberships: 'gold, silver' });
    expect(text).toContain('membership (gold, silver)');
    expect(text).not.toMatch(/widen/);
  });

  it('warns explicitly when more than one family is configured', () => {
    const text = explainEntitlementDecision({
      allowedMemberships: 'gold',
      allowedProducts: 'course'
    });
    expect(text).toMatch(/ANY ONE/);
    expect(text).toMatch(/widen access rather than narrowing/);
  });
});
