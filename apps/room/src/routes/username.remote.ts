import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { isPresenterRole, requireUser } from '$lib/server/auth';
import { db, ensureDatabase } from '$lib/server/db';
import { users } from '$lib/server/db/schema';

/*
  Renaming an account — its own, or somebody else's.

  A module of one, and NOT folded in with `user-settings.remote.ts` beside it, because the gate is
  the difference and the gate is the whole point. Those two write the caller's own row and can
  name nobody; this one takes a `userId` and can rename any account in the deployment when the
  caller is a presenter. A function that can reach another account, living among functions that
  cannot, is how the reach gets extended by whoever adds the next one.
*/

/**
 * `editUsername` — the user-info modal's rename.
 *
 * ## The gate, and the dead condition it replaced
 *
 * This guard used to read `role === 'user' && id !== userId`, which never fired: no row ever holds
 * the role `'user'`. The schema default is `'staff'` (`src/lib/server/db/schema.ts:8`), the
 * provisioning script issues `admin | staff | member | guest`
 * (`scripts/set-password.mjs:13`), and `src/lib/server/media-grant.test.ts:199` says outright that
 * `'user'` "exists in no row". A dead condition meant every authenticated caller — including a
 * guest — could rename any other account by id, an admin's included.
 *
 * Stated positively instead: **you may rename yourself, and a presenter may rename anyone.**
 * `isPresenterRole` is the same staff|admin test the rest of the app uses.
 *
 * ## What the schema took over
 *
 * `Number.isInteger(userId)` and the non-empty `username` check were hand-written and answered
 * `fail(400)`. They are `z.number().int().positive()` and `z.string().trim().min(1)` now — which
 * also refuses 0 and negatives, where `Number.isInteger` let them through to match no row and
 * report success.
 *
 * The 200-character bound is NEW. `displayName` had none, and it is rendered in the roster, every
 * chat line, the mention highlight and the private-chat header — an unbounded name is a layout
 * everybody in the room pays for. Well above any real name and well below anything that breaks a
 * row.
 *
 * There is no room scope here, deliberately, because there was none before: `users` is a
 * deployment-wide table and a rename is a property of the ACCOUNT, not of a membership. Adding one
 * would be inventing a rule rather than reproducing one, and it is recorded here so the absence
 * reads as a decision instead of an oversight.
 */
export const editUsername = command(
  z.strictObject({
    userId: z.number().int().positive(),
    username: z.string().trim().min(1).max(200)
  }),
  async ({ userId, username }) => {
    ensureDatabase();
    const { locals } = getRequestEvent();
    const actor = requireUser(locals);

    if (actor.id !== userId && !isPresenterRole(actor.role)) {
      error(403, 'You cannot edit this username.');
    }

    db.update(users).set({ displayName: username }).where(eq(users.id, userId)).run();
  }
);
