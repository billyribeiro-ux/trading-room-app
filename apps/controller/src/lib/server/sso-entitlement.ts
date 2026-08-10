/**
 * Deciding whether a customer's asserted entitlements open a room.
 *
 * The room owner configures three comma-separated filters on the Manage page; the customer's
 * WordPress site asserts what the visitor actually holds; this module compares them. It is pure —
 * no database, no clock, no I/O — because it is the rule that decides who gets in, and a rule you
 * cannot exercise in a unit test is a rule nobody will change safely in five years.
 *
 * ## The semantics, and where they come from
 *
 * Read from the reference's own help text, transcribed in `room-settings-schema.ts`:
 *
 *   `allowedMemberships`  "Leave blank to let all members in. Comma seprated list of valid
 *                          memberships the user needs to have to enter."
 *   `allowedProducts`     "…valid products the user needs to have to enter. **Either a product or
 *                          membership, or both must match**…"
 *   `allowedPerms`        "…valid permissions the user needs to have to enter. **Either a product or
 *                          membership, or both must match**."
 *
 * Two rules follow directly:
 *
 *  1. **A blank filter is not a constraint.** "Leave blank to let all members in", stated on all
 *     three. A room with nothing configured admits anyone the signature vouches for.
 *  2. **Configured filters are OR-ed, not AND-ed.** "Either a product or membership, or both must
 *     match" is an explicit statement of disjunction, and it appears on two of the three fields.
 *
 * ## The ambiguity, named rather than papered over
 *
 * That sentence is repeated verbatim on `allowedPerms`, where "a product or membership" does not
 * mention permissions at all — so it reads like copied help text, and the dump does not say whether
 * permissions join the same OR or form a separate AND. **OR is implemented**, because it is what the
 * only available evidence states, and the alternative would be inventing a stricter rule the
 * reference never described.
 *
 * The consequence is worth stating plainly, since it runs against the usual fail-closed instinct:
 * **filling in a second filter family widens access rather than narrowing it.** An owner who wants
 * "gold members who also bought the options course" cannot express it here — they configure one
 * family and let the other stay blank. {@link explainEntitlementDecision} exists so the Manage page
 * can say that out loud instead of leaving an owner to discover it from who turns up.
 *
 * ## Matching
 *
 * Case-insensitive and trimmed on both sides. WooCommerce slugs are lower-case by convention but
 * plan *names* are not, and an owner typing "Gold Annual" where the site sends "gold-annual" is a
 * support ticket, not a security decision. Comparison is exact after normalising — no prefix or
 * substring matching, because "gold" must not open a room configured for "gold-plus".
 */

/** The three filters, as stored in `room_settings.settings_json`. */
export interface EntitlementFilters {
  allowedMemberships?: string | null;
  allowedProducts?: string | null;
  allowedPerms?: string | null;
}

/** What the customer's signed token asserts the visitor holds. */
export interface AssertedEntitlements {
  memberships: readonly string[];
  products: readonly string[];
  permissions: readonly string[];
}

export type EntitlementDecision =
  | { allowed: true; reason: 'no-filters-configured' | 'matched'; matchedOn: readonly string[] }
  | { allowed: false; reason: 'no-match'; requiredOneOf: readonly string[] };

/** One filter family, after parsing. */
interface Family {
  readonly label: 'membership' | 'product' | 'permission';
  readonly required: readonly string[];
  readonly held: readonly string[];
}

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

/** A comma-separated filter as the owner typed it, into a list of comparable entries. */
export function parseFilterList(value: string | null | undefined): readonly string[] {
  if (!value) return [];
  return value
    .split(',')
    .map(normalise)
    .filter(Boolean);
}

/**
 * Whether these asserted entitlements satisfy this room's filters.
 *
 * Returns the matched entries rather than a bare boolean so the caller can log *why* somebody was
 * admitted. An audit trail that only records "allowed" cannot answer the question anybody actually
 * asks later, which is "on what basis".
 */
export function evaluateEntitlement(
  filters: EntitlementFilters,
  asserted: AssertedEntitlements
): EntitlementDecision {
  const families: Family[] = [
    {
      label: 'membership',
      required: parseFilterList(filters.allowedMemberships),
      held: asserted.memberships.map(normalise)
    },
    {
      label: 'product',
      required: parseFilterList(filters.allowedProducts),
      held: asserted.products.map(normalise)
    },
    {
      label: 'permission',
      required: parseFilterList(filters.allowedPerms),
      held: asserted.permissions.map(normalise)
    }
  ];

  const configured = families.filter((family) => family.required.length > 0);
  if (configured.length === 0) {
    return { allowed: true, reason: 'no-filters-configured', matchedOn: [] };
  }

  const matchedOn: string[] = [];
  for (const family of configured) {
    const held = new Set(family.held);
    for (const required of family.required) {
      if (held.has(required)) matchedOn.push(`${family.label}:${required}`);
    }
  }

  if (matchedOn.length > 0) return { allowed: true, reason: 'matched', matchedOn };

  return {
    allowed: false,
    reason: 'no-match',
    requiredOneOf: configured.flatMap((family) =>
      family.required.map((required) => `${family.label}:${required}`)
    )
  };
}

/**
 * A sentence describing what a room's filters currently do, for the Manage page.
 *
 * Exists because of the OR semantics above: an owner who fills in two families to be *stricter* has
 * made the room *more* open, and no amount of correct code makes that discoverable from a pair of
 * text boxes. Saying it where they are typing is cheaper than every conversation that follows.
 */
export function explainEntitlementDecision(filters: EntitlementFilters): string {
  const families = [
    ['membership', parseFilterList(filters.allowedMemberships)],
    ['product', parseFilterList(filters.allowedProducts)],
    ['permission', parseFilterList(filters.allowedPerms)]
  ] as const;

  const configured = families.filter(([, list]) => list.length > 0);
  if (configured.length === 0) {
    return 'Anyone your site vouches for may enter this room. Add a membership, product or permission filter to restrict it.';
  }

  const described = configured.map(([label, list]) => `${label} (${list.join(', ')})`);
  if (described.length === 1) {
    return `A visitor must hold one of the listed values for ${described[0]}.`;
  }
  return `A visitor must match ANY ONE of ${described.join(' or ')} — these widen access rather than narrowing it, so leave a filter blank unless you mean it.`;
}
