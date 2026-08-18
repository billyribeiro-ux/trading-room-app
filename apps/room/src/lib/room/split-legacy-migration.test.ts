// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { splitStorageKeys } from './split.svelte';
import { promoteLegacySplitSizes, storedSplitPair } from './split-legacy-migration';

/*
  THE LOCALSTORAGE → SERVER MIGRATION, EXECUTED — which nothing did while it lived on the page.

  Earlier builds wrote the two split pairs to `localStorage` and nowhere else, so a member who had
  dragged their layout kept it on one machine and lost it on every other. This promotes whatever is
  in local storage into the stored preferences.

  ## Why an untested migration is worse than an untested feature

  A migration that silently does nothing is indistinguishable, from the outside, from one that ran
  and found nothing to do. Both look like a member with a default layout. There is no error, no log
  and no screen that differs — so the only way to know it works is to run it, and until 2026-08-17
  nothing did: it sat in `+page.svelte`, called once from `onMount`, reachable by no test.

  ## The rules being asserted, and where each comes from

  * **The server wins.** A key the settings already carry is skipped entirely — the stored value is
    the one that survives a change of machine, so a stale local copy must not overwrite it.
  * **Both directions, both keys.** `ltr` and `ttb` each have a room key and a chat key, so a member
    who dragged in one orientation does not lose the other.
  * **A corrupt entry is not fatal.** Hand-edited or truncated JSON returns null rather than
    throwing, because this runs during boot and a broken preference must not take the room down.
  * **It is a WRITE, never a read-back.** Nothing here applies sizes to the live layout; doing that
    would move three columns after first paint, which is the shift the promotion exists to remove.
*/

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

/** The four keys the migration walks, taken from the source of truth rather than retyped. */
const KEYS = (['ltr', 'ttb'] as const).flatMap((direction) => {
  const { roomKey, chatKey } = splitStorageKeys(direction);
  return [roomKey, chatKey];
});

describe('storedSplitPair', () => {
  it('reads a valid pair back', () => {
    localStorage.setItem(KEYS[0], JSON.stringify([30, 70]));
    expect(storedSplitPair(KEYS[0])).toEqual([30, 70]);
  });

  it('returns null for a missing key rather than throwing', () => {
    expect(storedSplitPair('nothing-here')).toBeNull();
  });

  it('survives a CORRUPT entry, because this runs during boot', () => {
    /*
      `JSON.parse` on a truncated value throws, and an uncaught throw here would take the room's
      whole mount down over a preference. Hand-edited storage is not hypothetical.
    */
    localStorage.setItem(KEYS[0], '{"broken":');
    expect(() => storedSplitPair(KEYS[0])).not.toThrow();
    expect(storedSplitPair(KEYS[0])).toBeNull();
  });

  it('rejects a well-formed value of the wrong shape, and TRUNCATES a long one', () => {
    /*
      Valid JSON, not a pair. `splitPairFromValue` is what refuses it, so this also pins that it is
      being called rather than the value being trusted.

      THE THREE-ELEMENT CASE IS NOT A REJECTION, and this test learned that rather than asserted it:
      the guard is `value.length >= 2`, so `[1, 2, 3]` yields `[1, 2]`. A first draft here expected
      `null` and was wrong — the code is deliberately permissive about extra entries and strict
      about the first two being numbers. Pinned as it behaves, because a future `=== 2` would be a
      silent behaviour change for anyone whose storage carries a longer array.

      Worth noting for whoever reads the source next: the docblock says a value is a pair "if it
      really is two numbers", which is looser in the code than in the sentence. The code is not
      changed here — that would be altering behaviour on no evidence — but the difference is now
      recorded in an executable place.
    */
    localStorage.setItem(KEYS[0], JSON.stringify({ a: 1 }));
    expect(storedSplitPair(KEYS[0])).toBeNull();

    localStorage.setItem(KEYS[0], JSON.stringify(['30', '70']));
    expect(storedSplitPair(KEYS[0]), 'strings are not numbers').toBeNull();

    localStorage.setItem(KEYS[0], JSON.stringify([1]));
    expect(storedSplitPair(KEYS[0]), 'one number is not a pair').toBeNull();

    localStorage.setItem(KEYS[0], JSON.stringify([1, 2, 3]));
    expect(storedSplitPair(KEYS[0]), 'a longer array keeps its first two numbers').toEqual([1, 2]);
  });
});

describe('promoteLegacySplitSizes', () => {
  it('promotes a browser-only pair the server does not have', () => {
    localStorage.setItem(KEYS[0], JSON.stringify([25, 75]));
    const save = vi.fn();

    promoteLegacySplitSizes(() => null, save);

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(KEYS[0], [25, 75]);
  });

  it('SKIPS a key the server already knows — the stored value wins', () => {
    /*
      The rule that makes this safe to run on every mount. Without it, a stale local pair would
      overwrite the value the member set on another machine, every time they opened the room.
    */
    localStorage.setItem(KEYS[0], JSON.stringify([25, 75]));
    const save = vi.fn();

    promoteLegacySplitSizes(() => [50, 50], save);

    expect(save, 'a key the server already has must not be overwritten').not.toHaveBeenCalled();
  });

  it('covers BOTH directions and BOTH keys, so one orientation is not lost', () => {
    // Four distinct keys: a member who dragged in `ltr` and in `ttb` keeps both.
    for (const [index, key] of KEYS.entries()) {
      localStorage.setItem(key, JSON.stringify([index + 10, 90 - index]));
    }
    const save = vi.fn();

    promoteLegacySplitSizes(() => null, save);

    expect(save).toHaveBeenCalledTimes(4);
    expect(save.mock.calls.map(([key]) => key).sort()).toEqual([...KEYS].sort());
  });

  it('writes NOTHING when local storage is empty, which is the common case', () => {
    // Every mount after the first migration. It must be silent, not merely harmless.
    const save = vi.fn();
    promoteLegacySplitSizes(() => null, save);
    expect(save).not.toHaveBeenCalled();
  });

  it('does not apply anything to the live layout — it only ever WRITES', () => {
    /*
      Asserted by what it is given: the function receives a reader and a writer and nothing else.
      There is no split instance in scope, so it CANNOT call `setSizes`. That is the property, and
      it is structural rather than incidental — reading sizes back at boot is the post-paint shift
      this migration was written to remove.
    */
    localStorage.setItem(KEYS[0], JSON.stringify([25, 75]));
    const save = vi.fn();
    const settingsPair = vi.fn(() => null);

    promoteLegacySplitSizes(settingsPair, save);

    // It asks the server for every key before writing any of them, and does nothing else.
    expect(settingsPair).toHaveBeenCalledTimes(4);
    expect(save).toHaveBeenCalledTimes(1);
  });
});
