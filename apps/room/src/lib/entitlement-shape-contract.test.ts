import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * A `User` BECOMES A `ModalTargetUser` IN EXACTLY ONE PLACE.
 *
 * ## The defect this exists for, and why it was worth fixing while it was still latent
 *
 * `RoomUserActions` had TWO constructions of that object from the same `User`: `targetFor(user)`,
 * and an inline literal inside `get target()`. They were identical except that the inline one
 * omitted five fields — `hasMic`, `hasScreen`, `hasCam`, `canEditNotes`, `hasAdminChat`.
 *
 * Those five are ENTITLEMENTS, and `targetFor`'s own comment records what dropping them costs:
 * `#permissionsModal` seeds its checkboxes from this object, `Boolean(undefined)` draws every box
 * unchecked however the membership actually stands, and `POST /internal/room-permissions` writes
 * `false` for every key absent from `granted`. Pressing Save on that modal would have stripped mic,
 * screen, cam and notes from a member who had them — and told the presenter "Permissions applied".
 *
 * **Nothing reached it.** Traced end to end: the roster's ⠇ menu calls `onselectuser` →
 * `selectUserId`, which clears the message selection and lands on the inline branch; the only item
 * in that menu that opens the modal is `onopenrosteruserinfo` → `openInfoFor` → `select` →
 * `targetFor`. The lossy object was built, held, and replaced before anything rendered it.
 *
 * That is exactly why it is worth a gate rather than a shrug. The same five fields caused a REAL
 * revocation once already, and the comment recording it says the state that made it dangerous was
 * "harmless while the Save button sent nothing" — right up until it sent. A second construction of
 * an entitlement-bearing shape is one call site away from being the same bug again, and the cost of
 * refusing it is this file.
 *
 * ## What is asserted, and why it is a SHAPE check rather than a behaviour check
 *
 * A behavioural test would have to guess which call site goes wrong next, which is the thing nobody
 * can know in advance. The invariant that survives is structural: there is one builder, it names
 * all five, and no other module assembles the object field by field.
 */
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (file: string) => readFileSync(`${ROOT}${file}`, 'utf8');

const ACTIONS = read('lib/room/user-actions.svelte.ts');

/**
 * The five permission fields, from the type rather than from memory.
 *
 * Read out of `ModalTargetUser` itself so a SIXTH added to the type is covered without anybody
 * remembering this file — the catalog-driven shape this repository prefers over a hardcoded list.
 */
const PERMISSION_FIELDS = [
  'hasMic',
  'hasScreen',
  'hasCam',
  'canEditNotes',
  'hasAdminChat'
] as const;

function codeOf(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('an entitlement-bearing target is built in one place', () => {
  it('reads the module it is measuring', () => {
    /* The vacuity floor: every assertion below is a search over this one string. */
    expect(ACTIONS.length).toBeGreaterThan(10_000);
    expect(ACTIONS).toContain('targetFor(user: User): ModalTargetUser');
  });

  it('names every permission field the type carries, so a sixth cannot be dropped', () => {
    /*
      Measured against the TYPE rather than trusted: if `ModalTargetUser` grows a permission-shaped
      optional that `targetFor` does not carry, that is the same defect with a new field name.
    */
    const types = read('lib/types.ts');
    /*
      Bound to locals and asserted, rather than inlined into `slice`. `slice-anchor-contract.test.ts`
      refuses the inline form for a reason this file would otherwise demonstrate: `indexOf` answers
      -1 when an anchor moves, `slice(-1, -1)` is the empty string, and every assertion below would
      then pass over nothing.
    */
    const from = types.indexOf('export interface ModalTargetUser');
    const to = types.indexOf('export interface MessageReaction');
    expect(from, 'the ModalTargetUser declaration moved').toBeGreaterThan(-1);
    expect(to, 'the anchor after it moved').toBeGreaterThan(from);
    const block = types.slice(from, to);

    const declared = [...block.matchAll(/^\s{2}(has[A-Z]\w*|canEdit\w*)\??:/gm)].map((m) => m[1]);
    expect(new Set(declared), 'a permission field was added to the type').toEqual(
      new Set(PERMISSION_FIELDS)
    );

    const code = codeOf(ACTIONS);
    const builderAt = code.indexOf('targetFor(user: User)');
    expect(builderAt, 'the one builder moved').toBeGreaterThan(-1);
    const builder = code.slice(builderAt);
    for (const field of PERMISSION_FIELDS) {
      expect(builder.slice(0, 1200), `targetFor must carry ${field}`).toContain(`${field}:`);
    }
  });

  it('has exactly ONE construction of the object from a User', () => {
    /*
      The count is of literals that assign `nick: user.displayName` — the field every construction
      from a `User` must set, and one no other object in this module sets. Two of these is the
      defect; one is the invariant.

      Deliberately NOT a count of `ModalTargetUser` mentions: the type is named in signatures,
      parameters and the placeholder below, and counting those would make this assertion pass or
      fail for reasons that have nothing to do with the shape.
    */
    const constructions = [...codeOf(ACTIONS).matchAll(/nick:\s*user\.displayName/g)];
    expect(
      constructions.length,
      'a second construction of ModalTargetUser from a User has appeared — it will differ from ' +
        '`targetFor` in some field, and if that field is one of the five permissions, Save on the ' +
        'permissions modal becomes a silent revocation. Call `targetFor` instead.'
    ).toBe(1);
  });

  it('routes the roster selection through that one builder', () => {
    /*
      The specific fix, pinned so it cannot be inlined back.

      `get target()` may still return the NO-SUCH-USER placeholder directly, and that is not an
      exception being carved out: there is no `User` on that branch. The selected id names nobody
      the session knows about, so the object is a placeholder for a modal that should not be open
      rather than a member, and it has no entitlements to lose. `targetFor` takes a `User` and could
      not be called there even if it were the right thing to do.

      The found-a-user path is the one that must delegate, and this is what asserts it does.
    */
    const code = codeOf(ACTIONS);
    const opens = code.indexOf('get target(): ModalTargetUser');
    const closes = code.indexOf('targetFor(user: User)');
    expect(opens, 'the getter moved').toBeGreaterThan(-1);
    expect(closes, 'the builder must still follow the getter').toBeGreaterThan(opens);
    const getter = code.slice(opens, closes);
    expect(getter).toContain('return this.targetFor(user);');
    expect(getter, 'the placeholder stays, and is the only literal here').toContain(
      "status: 'offline'"
    );
    expect(
      [...getter.matchAll(/nick:/g)].length,
      'only the placeholder may set nick directly'
    ).toBe(1);
  });
});
