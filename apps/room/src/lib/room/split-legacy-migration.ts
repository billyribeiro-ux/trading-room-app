import { splitPairFromValue, splitStorageKeys, type SplitPair } from '#lib/room/split.svelte.js';

/*
  THE ONE-TIME MIGRATION of browser-only split sizes onto the server.

  Earlier builds wrote the two split pairs to `localStorage` and nowhere else, so a member who had
  dragged their layout kept it on one machine and lost it on every other. These promote whatever is
  in local storage into the stored preferences, so the NEXT server render already contains it.

  ## They are deliberately NOT applied to the live layout

  Reading them and calling `setSizes` would move the alerts column, the chat column and the whole
  presentation area AFTER first paint — which is exactly the shift this promotion exists to remove.
  The promotion is a write, never a read-back.

  ## Why its OWN file, and not `split.svelte.ts` — a guard decided this

  The first attempt put these beside `splitStorageKeys` in `split.svelte.ts`, which is where they
  call into. `extra-chat-column-contract.test.ts:366` refused it: *"the class must have no way to
  write a preference"*, asserted as `split.svelte.ts` not containing `localStorage`. That guard is
  right and the placement was wrong — `RoomSplit` computes geometry and must not be able to reach
  storage, or the next person adding a "just persist this" line has somewhere to put it.

  So the migration is a sibling: it may import from `split.svelte.ts`, and `split.svelte.ts` still
  cannot touch storage.

  ## Why not on the page or in `RoomPrefs`

  They arrived from `+page.svelte` on 2026-08-17. They belong beside `splitStorageKeys` and
  `splitPairFromValue`, which they call and which define the key names and the shape being migrated
  — three functions describing one storage format. `RoomPrefs` was the alternative and is refused:
  it would have to learn what a split pair is and which two keys exist per direction, which is split
  geometry leaking into a preferences bag.

  They take the two preference accessors as ARGUMENTS rather than importing anything, so they stay
  pure enough to execute in a test — which `split-legacy-migration.test.ts` does, because a
  migration that silently does nothing is indistinguishable from one that ran.
*/

/** Browser-only sizes written by earlier builds, kept as a one-time migration source. */
export function storedSplitPair(key: string): SplitPair | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return splitPairFromValue(JSON.parse(localStorage.getItem(key) ?? 'null'));
  } catch {
    /* A hand-edited or truncated entry is not a reason to fail the room's boot. */
    return null;
  }
}

/**
 * Promote any browser-only pair onto the server, for both directions and both keys.
 *
 * @param settingsPair What the SERVER already has for a key. A key it already knows is skipped —
 *   the server's value wins, because it is the one that survives a change of machine.
 * @param save `RoomPrefs.save`.
 */
export function promoteLegacySplitSizes(
  settingsPair: (key: string) => SplitPair | null,
  save: (key: string, value: unknown) => void
): void {
  for (const direction of ['ltr', 'ttb'] as const) {
    const { roomKey, chatKey } = splitStorageKeys(direction);
    for (const key of [roomKey, chatKey]) {
      if (settingsPair(key)) continue;
      const legacy = storedSplitPair(key);
      if (legacy) save(key, legacy);
    }
  }
}
