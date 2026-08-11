/**
 * Pairing a phone to a room membership, and the writer `push_tokens_json` never had.
 *
 * `TODO.md` item C. The column has existed since the schema was written and nothing has ever
 * appended to it, because the endpoint a device would call did not exist — so the FCM client, the
 * fan-out and the manage-page controls were all built against a list that could only ever be empty.
 *
 * ## The flow, from `docs/MOBILE-APP.md` §5
 *
 * 1. A presenter issues a six-digit PIN from the manage page (`issueMobilePairCode`, already built).
 * 2. The member types it into the app.
 * 3. The app posts the room, the member's email, the PIN and its FCM registration token.
 * 4. This module verifies, appends the token, and **consumes the PIN**.
 *
 * ## Why the room and the email are required as well as the PIN
 *
 * Not defence-in-depth for its own sake — it is what the reference's own pair URL carries:
 *
 *     …/ptr_app/sessions/v2/addUser/<publicId>/?sec=<pairSecretKey>&email=__userEmail__&name=__userName__
 *
 * The room is in the path and the email in the query. So an attacker needs a room's short code, a
 * member's email address AND the PIN, rather than sweeping six digits across every room at once.
 *
 * ## The PIN is single-use, and five failures destroy it
 *
 * Six digits is a million combinations, and this endpoint is public by necessity: a phone that has
 * never paired holds no credential to authenticate with. Two properties make that safe rather than
 * alarming:
 *
 * * **Consumed on success.** A code that leaks after use is worthless. Without this, a PIN read over
 *   someone's shoulder stays valid until its expiry — days, per `ptrMobileAppExpirePairCodeDays`.
 * * **Invalidated after {@link MAX_PAIR_ATTEMPTS} failures.** An attacker gets five guesses out of a
 *   million, and then the code they were attacking no longer exists. A member who mistypes five
 *   times asks for another, which is one click.
 *
 * The counter is a column rather than an in-process limiter because this controller runs serverless:
 * an instance-local count shares nothing with the next instance and would look like protection while
 * providing almost none.
 *
 * ## Every failure returns the same thing
 *
 * Wrong room, unknown email, expired code, wrong PIN, exhausted attempts — one refusal, no detail.
 * Distinguishing them turns this into an oracle for discovering which emails are members of which
 * room, which is a membership list nobody has agreed to publish.
 */
import { and, eq, gt, isNotNull, lt, sql } from 'drizzle-orm';
import { getDb } from './db';
import { roomUsers, rooms, users } from './db/schema';
import { readPushTokens, type PushToken } from './rooms';

/** Failed attempts against one code before it is destroyed. */
export const MAX_PAIR_ATTEMPTS = 5;

/**
 * Registrations kept per membership.
 *
 * A person has a phone and perhaps a tablet; the reference's own API publishes `alerterAppTokens`
 * as a list, so more than one is expected. The cap exists because this list is written by a public
 * endpoint and an unbounded JSON column is a slow-motion denial of service. Oldest is evicted, so a
 * member replacing a lost phone is never locked out by their own history.
 */
export const MAX_PUSH_TOKENS = 10;

export type PairFailure = 'refused';
export type PairResult =
  { ok: true; roomUserId: number; tokenCount: number; replacedExisting: boolean } | { ok: false; reason: PairFailure };

export interface PairRequest {
  /** Room short code, as it appears in the pair URL's path. */
  room: string;
  /** The member's email, as the pair URL carries it. Compared case-insensitively. */
  email: string;
  /** The six-digit code from the manage page. */
  pin: string;
  /** The device's FCM registration token. */
  token: string;
  /** `ios` | `android`, or whatever the app reports. Stored as a label, never trusted. */
  platform: string;
}

/** Shapes and bounds only — this runs before any database work, on unauthenticated input. */
export function validatePairRequest(input: Partial<PairRequest>): PairRequest | null {
  const room = typeof input.room === 'string' ? input.room.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const pin = typeof input.pin === 'string' ? input.pin.trim() : '';
  const token = typeof input.token === 'string' ? input.token.trim() : '';
  const platform = typeof input.platform === 'string' ? input.platform.trim().toLowerCase() : '';

  if (!room || room.length > 64) return null;
  if (!email || email.length > 320 || !email.includes('@')) return null;
  // Exactly six digits. `issueMobilePairCode` zero-pads, so "0042" is not a shorter valid code.
  if (!/^\d{6}$/.test(pin)) return null;
  /*
    An FCM registration token is an opaque string of roughly 140-200 characters. The bound is
    deliberately generous — Google has changed the format before and refusing a longer one would
    break pairing for a reason no support engineer would find — but it is bounded, because this
    value goes into a JSON column written by an unauthenticated caller.
  */
  if (token.length < 32 || token.length > 4096) return null;
  if (platform !== 'ios' && platform !== 'android') return null;

  return { room, email, pin, token, platform };
}

/**
 * Adds a token to a member's list, replacing an identical one rather than duplicating it.
 *
 * Re-pairing the same device is the common case — a reinstall, a restored backup — and it must not
 * grow the list. Returns the new list plus whether it replaced, so the caller can log which
 * happened without inspecting the array again.
 */
export function addPushToken(
  existing: readonly PushToken[],
  token: string,
  platform: string,
  now: number
): { tokens: PushToken[]; replacedExisting: boolean } {
  const withoutThisDevice = existing.filter((entry) => entry.token !== token);
  const replacedExisting = withoutThisDevice.length !== existing.length;

  const tokens = [...withoutThisDevice, { token, platform, addedAt: now }];
  // Oldest first, so the eviction below drops the least recently registered device.
  tokens.sort((a, b) => a.addedAt - b.addedAt);

  return { tokens: tokens.slice(-MAX_PUSH_TOKENS), replacedExisting };
}

/**
 * Verifies a pairing request and, if it holds, registers the device.
 *
 * `now` is a parameter rather than a `Date.now()` call so expiry is testable without faking the
 * clock globally — the same shape as the handoff and SSO signers.
 */
export async function redeemPairCode(request: PairRequest, now: Date = new Date()): Promise<PairResult> {
  const db = getDb();

  const [row] = await db
    .select({
      roomUserId: roomUsers.id,
      pairCode: roomUsers.mobilePairCode,
      expiresAt: roomUsers.mobilePairCodeExpiresAt,
      attempts: roomUsers.mobilePairAttempts,
      pushTokensJson: roomUsers.pushTokensJson
    })
    .from(roomUsers)
    .innerJoin(rooms, eq(rooms.id, roomUsers.roomId))
    /*
      The email is on `users`, not on `room_users`.

      A membership is a join row: it carries the room, the account and the per-room role, while the
      identity lives once on the account. Written against `roomUsers.email` first and caught by
      `svelte-check` — which is the whole argument for running it on a `.ts` change rather than
      trusting a green test suite, since every test here is of the pure half.
    */
    .innerJoin(users, eq(users.id, roomUsers.userId))
    .where(and(eq(rooms.shortCode, request.room), eq(users.email, request.email)))
    .limit(1);

  // No such room, or nobody with that email in it. Same answer as a wrong PIN, on purpose.
  if (!row) return { ok: false, reason: 'refused' };

  const codeIssued = Boolean(row.pairCode);
  const expired = !row.expiresAt || row.expiresAt.getTime() <= now.getTime();
  const exhausted = row.attempts >= MAX_PAIR_ATTEMPTS;
  const matches = codeIssued && row.pairCode === request.pin;

  if (!codeIssued || expired || exhausted || !matches) {
    /*
      Count the failure only when there is a live code to attack.

      Incrementing against an expired or already-exhausted code would let anyone run the counter up
      on a member who is not currently pairing, so that their NEXT code starts part-spent. The
      counter exists to bound guesses at one specific live secret.
    */
    if (codeIssued && !expired && !exhausted) {
      /*
        Counted in the DATABASE, not in this process.

        This read `row.attempts + 1` — a value SELECTed in a separate statement — and wrote it back
        unconditionally. Every request in a concurrent burst reads the same number and writes the
        same number, so N simultaneous guesses advanced the counter by one. The cap was per ROUND,
        not per guess: an attacker who knows the room code and a member's email could fire thousands
        of PINs in parallel against a one-in-a-million secret that lives for days, and there is no
        rate limit in front of this route. Winning binds the attacker's own FCM token to the
        member's membership, so the room's push alerts go to their device.

        Found by the adversarial review of 2026-08-11. The expression below is evaluated by
        PostgreSQL against the current row under the row lock the UPDATE itself takes, so
        concurrent requests serialise and each one counts.

        The predicates are the other half. They repeat the `codeIssued && !expired && !exhausted`
        test that was checked above against the SELECTed snapshot, so a request that lost a race in
        between cannot push the counter past the cap or run it up on a code that has since expired
        or been consumed.
      */
      const nextAttempts = sql`${roomUsers.mobilePairAttempts} + 1`;
      // Destroy the code itself on the last failure. Leaving it with a spent counter would keep a
      // guessable secret alive in the row; the owner reissuing is one click, and reissuing now
      // clears the counter with it.
      const spent = sql`${roomUsers.mobilePairAttempts} + 1 >= ${MAX_PAIR_ATTEMPTS}`;
      await db
        .update(roomUsers)
        .set({
          mobilePairAttempts: nextAttempts,
          mobilePairCode: sql`CASE WHEN ${spent} THEN NULL ELSE ${roomUsers.mobilePairCode} END`,
          mobilePairCodeExpiresAt: sql`CASE WHEN ${spent} THEN NULL ELSE ${roomUsers.mobilePairCodeExpiresAt} END`
        })
        .where(
          and(
            eq(roomUsers.id, row.roomUserId),
            isNotNull(roomUsers.mobilePairCode),
            gt(roomUsers.mobilePairCodeExpiresAt, now),
            lt(roomUsers.mobilePairAttempts, MAX_PAIR_ATTEMPTS)
          )
        );
    }
    return { ok: false, reason: 'refused' };
  }

  const { tokens, replacedExisting } = addPushToken(
    readPushTokens(row.pushTokensJson),
    request.token,
    request.platform,
    now.getTime()
  );

  /*
    The claim is conditional, and 0 rows means somebody else got there first.

    The PIN is single-use, so exactly one request may consume it. Written as an unconditional
    `WHERE id = ?` this had the same read-then-write gap as the counter above: two requests that
    both presented the correct PIN would both pass the check and both write, and the second would
    overwrite the first's token list with its own stale copy — quietly unpairing the device that
    won. Requiring the code to still be present is what makes exactly one of them the winner.

    `mobilePairCodeExpiresAt` is re-checked here too, so a code that expired between the SELECT and
    this statement cannot be consumed.
  */
  const claimed = await db
    .update(roomUsers)
    .set({
      pushTokensJson: JSON.stringify(tokens),
      // Consumed. A code that survives its own use is a credential with a multi-day life.
      mobilePairCode: null,
      mobilePairCodeExpiresAt: null,
      mobilePairAttempts: 0
    })
    .where(
      and(
        eq(roomUsers.id, row.roomUserId),
        eq(roomUsers.mobilePairCode, request.pin),
        gt(roomUsers.mobilePairCodeExpiresAt, now)
      )
    )
    .returning({ roomUserId: roomUsers.id });

  // Lost the race. Refused with the same opaque answer as a wrong PIN — telling the caller "someone
  // else just used this code" confirms the code was right.
  if (claimed.length === 0) return { ok: false, reason: 'refused' };

  return {
    ok: true,
    roomUserId: row.roomUserId,
    tokenCount: tokens.length,
    replacedExisting
  };
}
