import { command, getRequestEvent } from '$app/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { pruneDeadPreferenceKeys } from '$lib/dead-preference-keys';
import { requireUser } from '$lib/server/auth';
import { db, ensureDatabase } from '$lib/server/db';
import { userSettings } from '$lib/server/db/schema';

/*
  The two writes a member makes to their OWN settings row.

  One module because they share the only gate either has: the row written is
  `requireUser(locals).id`'s, always, with no target on the argument. Neither can reach another
  account, which is what separates them from `username.remote.ts` next door — that one CAN name
  somebody else and is therefore presenter-gated. Splitting on the gate is the rule the Files-pane
  conversion settled on, and this is the same cut.

  Nothing here broadcasts and nothing invalidates. A preference is this browser's business; the
  client already mirrors it into its own decoded snapshot before the write, which is what makes the
  UI feel instant, and the row is what a RELOAD reads.
*/

/**
 * `saveTheme` — light or dark.
 *
 * The action read `data.get('theme') === 'dark' ? 'dark' : 'light'`, so every unrecognised value
 * silently became `light`. `z.enum` refuses it instead. That is a deliberate change and not a move:
 * a silent coercion means a typo at a call site sets the wrong theme and reports success, which is
 * the same shape of quiet-wrong-answer this repository has been removing all afternoon.
 *
 * `Theme` in `$lib/types` is `'light' | 'dark'` — the same two, and the caller already had that
 * type, so nothing legitimate can now be refused.
 */
export const saveTheme = command(z.enum(['light', 'dark']), async (theme) => {
  ensureDatabase();
  const { locals } = getRequestEvent();

  db.update(userSettings)
    .set({ theme, updatedAt: new Date() })
    .where(eq(userSettings.userId, requireUser(locals).id))
    .run();
});

/**
 * One preference, into the account's settings blob.
 *
 * ## The value crosses as a VALUE now, and that removes a whole failure mode
 *
 * The action took `value` as a string: the client ran `JSON.stringify`, the server ran `JSON.parse`
 * inside a `try` and answered `fail(400, 'The preference value must be valid JSON.')` when it threw.
 * Two conversions and a failure mode, to move a boolean.
 *
 * SvelteKit serializes a command's argument with devalue, so the value arrives as itself. `z.json()`
 * is the schema that says precisely what may be stored — the blob is written back with
 * `JSON.stringify`, so anything JSON cannot represent must be refused, and it is: a function, a
 * `Date`, `undefined`. The 400 that used to depend on the client remembering to stringify correctly
 * is now a property of the type.
 *
 * ## `key` gained a length bound, which is new
 *
 * The action required a non-empty key and nothing more. This blob is parsed, mutated and
 * re-serialized on EVERY preference write, so an unbounded key is an unbounded row on a path that
 * rewrites itself — a cost paid by every future write for that account. 100 characters is far above
 * the longest key this room uses (`sessionTokensRevoked`, 20) and far below anything that could
 * matter.
 */
export const savePreference = command(
  z.strictObject({
    key: z.string().trim().min(1).max(100),
    value: z.json()
  }),
  async ({ key, value }) => {
    ensureDatabase();
    const { locals } = getRequestEvent();
    const userId = requireUser(locals).id;

    const current = db
      .select({ settingsJson: userSettings.settingsJson })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .get();

    let settings: Record<string, unknown> = {};
    try {
      const parsed: unknown = JSON.parse(current?.settingsJson ?? '{}');
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        settings = parsed as Record<string, unknown>;
      }
    } catch {
      /*
        The one `catch` here that is NOT a swallowed error, and it is worth being explicit because
        the rule this repository applies everywhere else would forbid it. A blob that will not parse
        is already lost — there is no correct value to recover and no caller who could act on the
        news. Refusing would leave the account permanently unable to change any preference. Starting
        from `{}` lets the next write repair it, which is the same converge-on-use rule the prune
        below uses.
      */
      settings = {};
    }

    settings[key] = value;

    /*
      Remove what the old element-id fallback wrote, on the way past.

      `updateSettingCheck` used to persist `preferenceKeyByInputId[input.id] ?? input.id`, so
      nineteen HTML ids went into this blob as if they were preferences and nothing ever read them
      back. Deleting the write does not delete what was written: every account that has opened the
      settings modal is carrying some of them.

      Here rather than in a migration, because this already parses and rewrites the whole blob — the
      prune is free, it needs no downtime, and it cannot half-apply. It is idempotent, so an account
      converges on its next preference change and a converged one pays nothing. The list is a
      deny-list for the reason `dead-preference-keys.ts` sets out: an allow-list would delete the
      next preference somebody adds without updating it.
    */
    pruneDeadPreferenceKeys(settings);

    db.update(userSettings)
      .set({ settingsJson: JSON.stringify(settings), updatedAt: new Date() })
      .where(eq(userSettings.userId, userId))
      .run();
  }
);
