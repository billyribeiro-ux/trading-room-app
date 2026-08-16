import { and, desc, eq, gte, isNull } from 'drizzle-orm';
import type { SwingAlertDirection, SwingAlertRow } from '#lib/types.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import {
  alertQuestions,
  alerts,
  swingAlerts,
  users,
  type SwingAlert
} from '#lib/server/db/schema.js';
import { hashEmail } from '#lib/server/connection.js';
import { formatSwingAlertTxt } from '#lib/swing-alerts.js';

/**
 * Swing Trade Alerts, persisted.
 *
 * Shaped like `notes-repository.ts`, and for the same reason its comment gives: **every query here
 * is scoped to one room**, in the WHERE clause rather than by a caller remembering to filter. This
 * table holds a room's trading positions — entries, stops and targets — and a query that reaches it
 * without `roomShortCode` is one tenant reading another tenant's book. The room short code comes
 * from the session row, never from the request.
 *
 * ## Two writes per operation, in one transaction
 *
 * A swing submit sends TWO commands (bundle byte 1,983,136): `swingAlertMsg` writes the row and
 * `alertMsg` posts `formatSwingAlertTxt(h)` into the MAIN alerts feed. Edit sends
 * `editSwingAlertMsg` then `editAlertMessageSwing`; delete removes both. So every mutation here
 * touches `swing_alerts` AND `alerts`, and it does so inside `db.transaction` — a swing row whose
 * feed message failed to write is exactly the orphan the reference suffers from, and it is the one
 * thing this room can cheaply not have.
 *
 * That is why this module writes a table it does not own. The alternative is two repositories and
 * two statements a caller has to remember to pair, which is the same bug with more files.
 *
 * ## Soft delete for the row, hard delete for the mirror
 *
 * The swing row is soft-deleted, as `notes` are: a mis-clicked delete on a position somebody is
 * trading is not recoverable from a broadcast, and `deleted_at` costs one predicate. The feed
 * message is hard-deleted, because that is what deleting an alert does everywhere else in this room
 * (`messageAction`'s `delete` branch) and a tombstoned alert would still be served by the feed.
 */

/**
 * The sender's avatar pair, derived rather than stored.
 *
 * The client writes neither `senderPic` nor `senderAvt` — both occur in the bundle only as reads
 * inside the two row templates (spec §5c), so they are produced server-side. `senderPic` is the
 * account's own avatar and `senderAvt` is the md5 of its email, which is exactly the hash the row's
 * fallback URL is built from. A row whose author's account has since been removed falls back to an
 * empty pair, and the template's Gravatar default (`?d=mm`) then draws the anonymous silhouette.
 */
interface SenderIdentity {
  senderPic: string;
  senderAvt: string;
}

function swingAlertDto(row: SwingAlert, sender: SenderIdentity): SwingAlertRow {
  return {
    id: row.id,
    symbol: row.symbol,
    direction: row.direction as SwingAlertDirection,
    entryDate: row.entryDate.toISOString(),
    entryPrice: row.entryPrice,
    stop: row.stop,
    target: row.target,
    image: row.image,
    senderName: row.senderName,
    senderPic: sender.senderPic,
    senderAvt: sender.senderAvt
  };
}

/** The fields a create or an edit writes. `senderName` is added by the caller, from the session. */
export interface SwingAlertInput {
  symbol: string;
  direction: SwingAlertDirection;
  entryPrice: string;
  stop: string;
  target: string;
  image: string;
}

/**
 * What a mutation did to the feed, so the caller can announce it on the alerts channel.
 *
 * Returned rather than published from here: `publishToRoom` must run AFTER the transaction commits,
 * or a rolled-back write is announced to every member in the room as though it had happened.
 */
export interface SwingAlertMirrorResult {
  /** The feed message's id, or null when the row has no mirror to speak of. */
  alertId: number | null;
  /** The feed message's text after the operation, or null when it was removed. */
  body: string | null;
}

export interface SwingAlertMutation {
  row: SwingAlertRow;
  mirror: SwingAlertMirrorResult;
}

/**
 * `getSwingAlertsLog` — one room's alerts inside a rolling window, newest first.
 *
 * ## What bounds this read
 *
 * Two things, and both are needed. `days` bounds it in time, which is the reference's own window
 * (`{ sessionID, days }`); the caller clamps it, so the worst case is 600 days of one room. The
 * index `(room_short_code, entry_date, id)` then serves the equality, the range and the ordering in
 * one walk, so the cost is the rows returned rather than the room's whole history. At ten thousand
 * rows in a room this reads the window, not the table.
 *
 * ## Why the join is here rather than per row
 *
 * The avatar pair needs the author's account. Fetching it per row would be a query inside a loop —
 * the shape this repository's standard names explicitly — so it is one `leftJoin` instead, which
 * costs one indexed lookup per row inside a single statement. `leftJoin` and not `innerJoin`: an
 * alert whose author's account is gone is still a real alert and must still appear.
 *
 * ## Newest first
 *
 * The reference reverses the server's array on receipt and prepends new rows, so the displayed
 * order is newest first. That ordering is produced here, by the index, rather than by reversing an
 * array in the browser.
 */
export function getSwingAlerts(room: string, days: number, now: Date): readonly SwingAlertRow[] {
  ensureDatabase();
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return db
    .select({ alert: swingAlerts, avatarUrl: users.avatarUrl, email: users.email })
    .from(swingAlerts)
    .leftJoin(users, eq(users.id, swingAlerts.senderId))
    .where(
      and(
        eq(swingAlerts.roomShortCode, room),
        isNull(swingAlerts.deletedAt),
        gte(swingAlerts.entryDate, since)
      )
    )
    .orderBy(desc(swingAlerts.entryDate), desc(swingAlerts.id))
    .all()
    .map(({ alert, avatarUrl, email }) =>
      swingAlertDto(alert, {
        senderPic: avatarUrl ?? '',
        senderAvt: email === null ? '' : hashEmail(email)
      })
    );
}

/**
 * `swingAlertMsg` + `alertMsg` — the create, both halves.
 *
 * `entryDate` is set here, from the server's clock, because the client never sends it: the payload
 * the reference builds carries the six typed fields plus `senderName` and nothing else, and `_id`,
 * `entryDate`, `senderPic` and `senderAvt` are explicitly not sent.
 *
 * The feed message is written FIRST so its id can be recorded on the swing row in the same
 * transaction. Its payload in the reference is
 * `{ txt, n, sendTxt:!1, sendEmail:!1, sendTweet:!1, dontPush:!1, nonTradeAlert:!1, swingTradeAlert:!0 }`
 * — of those, the four `send*`/`dontPush` flags are delivery instructions this room has no
 * equivalent for, and `nonTradeAlert:!1` is the one that maps onto a stored column: `nonTrade`
 * false, i.e. this IS a trade alert.
 */
export function createSwingAlert(input: {
  room: string;
  alert: SwingAlertInput;
  now: Date;
  senderName: string;
  userId: number;
}): SwingAlertMutation {
  ensureDatabase();
  const body = formatSwingAlertTxt(input.alert);
  const row = db.transaction((transaction) => {
    const mirror = transaction
      .insert(alerts)
      .values({
        roomShortCode: input.room,
        senderId: input.userId,
        kind: 'text',
        body,
        // `nonTradeAlert: !1` — a swing alert is a trade alert.
        nonTrade: false,
        createdAt: input.now
      })
      .returning({ id: alerts.id })
      .get();

    return transaction
      .insert(swingAlerts)
      .values({
        roomShortCode: input.room,
        symbol: input.alert.symbol,
        direction: input.alert.direction,
        entryPrice: input.alert.entryPrice,
        stop: input.alert.stop,
        target: input.alert.target,
        image: input.alert.image,
        senderId: input.userId,
        senderName: input.senderName,
        entryDate: input.now,
        alertId: mirror.id
      })
      .returning()
      .get();
  });
  return {
    row: swingAlertDto(row, sender(input.userId)),
    mirror: { alertId: row.alertId, body }
  };
}

/**
 * `editSwingAlertMsg` + `editAlertMessageSwing` — replace a row's fields and re-write its mirror.
 *
 * One conditional UPDATE with the room in the WHERE and `RETURNING`, not a SELECT then an UPDATE:
 * zero rows back means the id does not name an undeleted row of THIS room, and the caller answers
 * 404. Splitting it would be a TOCTOU where the check passes and the write lands after a delete.
 *
 * **`senderName` is rewritten to the editor**, which looks wrong and is correct: the reference puts
 * `globals.user.nick || .name` into the payload of the edit command just as it does the create, so
 * an edit by a second presenter does move the row's sender. Reproduced deliberately; "preserving"
 * the original author here would be a divergence chosen by me.
 *
 * The mirror update is room-scoped as well, even though `alertId` came off a row this statement
 * just proved belongs to the room. The predicate costs nothing and means no future caller can turn
 * this into a cross-room write by passing an id from somewhere else.
 */
export function editSwingAlert(input: {
  room: string;
  swingAlertID: number;
  alert: SwingAlertInput;
  senderName: string;
  userId: number;
}): SwingAlertMutation | null {
  ensureDatabase();
  const body = formatSwingAlertTxt(input.alert);
  const updated = db.transaction((transaction) => {
    const row = transaction
      .update(swingAlerts)
      .set({
        symbol: input.alert.symbol,
        direction: input.alert.direction,
        entryPrice: input.alert.entryPrice,
        stop: input.alert.stop,
        target: input.alert.target,
        image: input.alert.image,
        senderId: input.userId,
        senderName: input.senderName
      })
      .where(
        and(
          eq(swingAlerts.roomShortCode, input.room),
          eq(swingAlerts.id, input.swingAlertID),
          isNull(swingAlerts.deletedAt)
        )
      )
      .returning()
      .get();
    if (row === undefined) return undefined;

    if (row.alertId !== null) {
      transaction
        .update(alerts)
        .set({ body })
        .where(and(eq(alerts.roomShortCode, input.room), eq(alerts.id, row.alertId)))
        .run();
    }
    return row;
  });

  if (updated === undefined) return null;
  return {
    row: swingAlertDto(updated, sender(input.userId)),
    mirror: { alertId: updated.alertId, body }
  };
}

/**
 * `deleteSwingAlertMsg` — soft delete the row, hard delete its feed mirror.
 *
 * Zero rows back means the row is not this room's, or is already deleted. Both answer 404, and
 * neither tells the caller which — a room must not be able to probe another room's ids.
 *
 * The mirror's questions go with it, exactly as `messageAction`'s alert delete does: left behind
 * they are unreachable but still count towards the pending Q&A total that decides whether the
 * button flashes.
 *
 * ## Why `alert_id` is cleared before the mirror is deleted
 *
 * Because the row is SOFT-deleted and the mirror is HARD-deleted, and `alert_id REFERENCES
 * alerts(id)` with `PRAGMA foreign_keys = ON` (`db/index.ts`). The surviving row therefore still
 * points at the alert row being removed, and SQLite refuses the delete with
 * `SqliteError: FOREIGN KEY constraint failed` — the whole transaction rolls back and the presenter
 * gets a 500 with nothing deleted.
 *
 * **This function shipped without that clearing statement and deleting a swing alert could not
 * work at all.** Nothing caught it: it type-checks, it lints, and `swing-alerts-contract.test.ts`
 * never reaches the repository. It was found on 2026-08-15 by running the create/edit/delete round
 * trip against a real SQLite file while porting the Day Trade twin, which had inherited the same
 * defect line for line. Both were fixed in the same change.
 *
 * The extra UPDATE is not a second race: the conditional UPDATE above is what decides who wins, and
 * this statement runs inside the same transaction on a row that statement has already claimed. It
 * keeps the room predicate anyway, for the same reason the mirror update does. Nulling is also the
 * honest end state: the row no longer has a feed mirror, and an `alert_id` pointing at a deleted
 * alert would be a dangling one.
 */
export function deleteSwingAlert(input: {
  room: string;
  swingAlertID: number;
  now: Date;
  userId: number;
}): SwingAlertMirrorResult | null {
  ensureDatabase();
  const deleted = db.transaction((transaction) => {
    const row = transaction
      .update(swingAlerts)
      .set({ deletedAt: input.now, deletedById: input.userId })
      .where(
        and(
          eq(swingAlerts.roomShortCode, input.room),
          eq(swingAlerts.id, input.swingAlertID),
          isNull(swingAlerts.deletedAt)
        )
      )
      .returning({ id: swingAlerts.id, alertId: swingAlerts.alertId })
      .get();
    if (row === undefined) return undefined;

    if (row.alertId !== null) {
      // Release the foreign key first — see the note above. Without this the DELETE below fails.
      transaction
        .update(swingAlerts)
        .set({ alertId: null })
        .where(and(eq(swingAlerts.roomShortCode, input.room), eq(swingAlerts.id, row.id)))
        .run();
      transaction.delete(alertQuestions).where(eq(alertQuestions.alertId, row.alertId)).run();
      transaction
        .delete(alerts)
        .where(and(eq(alerts.roomShortCode, input.room), eq(alerts.id, row.alertId)))
        .run();
    }
    return row;
  });

  if (deleted === undefined) return null;
  return { alertId: deleted.alertId, body: null };
}

/** The avatar pair for the account that just wrote, so a create or edit answers with a full row. */
function sender(userId: number): SenderIdentity {
  const account = db
    .select({ avatarUrl: users.avatarUrl, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .get();
  return {
    senderPic: account?.avatarUrl ?? '',
    senderAvt: account === undefined ? '' : hashEmail(account.email)
  };
}
