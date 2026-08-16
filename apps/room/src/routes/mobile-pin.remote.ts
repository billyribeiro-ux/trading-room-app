import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import { requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { ensureDatabase } from '#lib/server/db/index.js';
import { readRoomConfig, requestMobilePin } from '#lib/server/room-config-client.js';

/*
  The pairing pin for the mobile app, and the second remote function here.

  The room has never held the pin: the reference sends `getMyMobilePin` on the command channel and
  the server answers with one. Here the CONTROLLER is that server — the code lives on
  `room_users.mobile_pair_code`, which is per room, and it is minted fresh per request.

  WHY THIS IS A `command` AND NOT A `query`, WHICH IS THE OBVIOUS AND WRONG CHOICE.

  Every instinct says a read should be a `query`: it takes no argument, it returns data, and it does
  not look like a mutation. But `query` is CACHED. SvelteKit serialises the argument into a cache
  key, dedupes concurrent callers onto one instance, and keeps the resolved value for as long as the
  query is in active use. With no argument at all, every call in the application shares one key.

  This read MINTS. The second time a presenter opened the mobile modal they would be handed the
  first pin back out of the cache — a pin the controller may already have rotated — and nothing
  would look wrong: a plausible number in the right place, silently stale. That is the exact class
  of defect this repository fails closed against, and it would have been introduced by choosing the
  flavour whose name matched the verb.

  So the rule, stated once so the next conversion does not have to rediscover it: `query` is for
  reads that are PURE. A read with a side effect on the server is a command, whatever it is called.

  `error()` rather than the `fail(409)` / `fail(502)` this used as a form action — `fail` returns a
  value only a form action's caller understands, and a command has no such caller. The client
  narrows the rejection with `isHttpError` and shows `body.message`, which is why both messages
  below are still the ones the user reads.
*/
export const getMyMobilePin = command(async () => {
  ensureDatabase();

  const { request, locals } = getRequestEvent();
  const user = requireUser(locals);
  const shortCode = requireRoomShortCode(locals);

  /*
    Re-gated here and not only on the button, because a hidden button is not an authorization check.
  */
  const { settings } = await readRoomConfig(request, shortCode, user.email);
  const appEnabled =
    settings.ptrMobileAppEnabled === true || settings.customMobileAppEnabled === true;
  if (!appEnabled) error(409, 'This room has no mobile app configured.');

  try {
    return await requestMobilePin(shortCode, user.email);
  } catch (cause) {
    // Loud, not a placeholder: showing a pin that was never issued is worse than saying so.
    console.error('[getMyMobilePin] the controller could not issue a pin', cause);
    error(502, 'Could not get an app pin right now.');
  }
});
