import { error } from '@sveltejs/kit';
import { command, getRequestEvent } from '$app/server';
import { requireRoomShortCode, requireUser } from '#lib/server/auth.js';
import { ensureDatabase } from '#lib/server/db/index.js';
import {
  readRoomConfig,
  requestMobilePin,
  restoreMobileTokens
} from '#lib/server/room-config-client.js';

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

/**
 * `restoreMobileAppTokens` — the Mobile App tab's one button.
 *
 * ## The whole reference implementation, and what is missing from it
 *
 * Byte 2,444,920:
 *
 * ```js
 * restoreMobileAppTokens(){
 *   this.appService.sendServerCommand("restoreMobileAppTokens",{}),
 *   bootbox.alert("Command sent successfully, check your mobile device for a test notification")
 * }
 * ```
 *
 * **It sends `{}`** — the server knows the caller from the session — and there is no inbound handler
 * anywhere in the bundle. So this takes no argument either, and the member is resolved from
 * `locals`, never from the request. What the controller does with it is argued at
 * `internal/mobile-restore`.
 *
 * ## THE ALERT IS UNCONDITIONAL UPSTREAM, AND THAT IS THE DIVERGENCE
 *
 * `bootbox.alert` is the next statement after the transmit. It has no callback and no error path, so
 * the reference tells the member *"Command sent successfully, check your mobile device for a test
 * notification"* **whether or not anything was sent, and whether or not they have ever paired a
 * device** — the decoded note records that it fires even if the transmit inside `send()` threw.
 *
 * This room does not reproduce that. The member pressing this button is, by the pane's own copy,
 * somebody who *is not getting notifications*; telling them a notification is on its way when zero
 * devices were reached leaves them waiting for a buzz that cannot come, and sends them to support
 * with "the app says it worked". A control that reports success it did not achieve is the defect
 * class this repository fixes most often — see `EXACT_ALERTS`.
 *
 * So the counts come back and the page composes the sentence from them. The verbatim string is kept
 * for the case it is actually true of: at least one device reached.
 *
 * ## The gate is `getMyMobilePin`'s
 *
 * Re-checked here rather than trusted from the tab, because the tab has NO gate upstream — that is
 * the anomaly `docs/decoded/mobile-app-decoded.md` §3 row 26 records, verified by reading the whole
 * troubleshooter component and counting: `ptrMobileAppEnabled` occurs five times in the bundle and
 * none of them is in that range. A surface with no gate is exactly the one whose endpoint must have
 * one.
 */
export const restoreMobileAppTokens = command(async () => {
  ensureDatabase();

  const { request, locals } = getRequestEvent();
  const user = requireUser(locals);
  const shortCode = requireRoomShortCode(locals);

  const { settings } = await readRoomConfig(request, shortCode, user.email);
  const appEnabled =
    settings.ptrMobileAppEnabled === true || settings.customMobileAppEnabled === true;
  if (!appEnabled) error(409, 'This room has no mobile app configured.');

  try {
    return await restoreMobileTokens(shortCode, user.email);
  } catch (cause) {
    console.error('[restoreMobileAppTokens] the controller could not restore', cause);
    error(502, 'Could not reach your devices right now.');
  }
});
