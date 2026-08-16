import { z } from 'zod';

/**
 * The three Day Trade Alerts mutations, validated on the way in.
 *
 * Shaped like `swing-alerts-command.ts`, which is shaped like `notes-command.ts`: one
 * `strictObject` per command, `cmd` pinned to the literal wire name so a payload can never be
 * parsed by the wrong schema, and `strictObject` so an unexpected field is a refusal rather than
 * something silently dropped.
 *
 * The command names come from `docs/decoded/day-trade-alerts.md` §1.7, each re-read in the bundle
 * while writing this file. **Create is `dayTradeAlertMsg`** — `newDayTradeAlertMsg` is the
 * server→client push AND a field name inside the edit payload, and it is the create command
 * nowhere. `#lib/day-trade-alerts` carries the same names as `DAY_TRADE_ALERT_COMMANDS`, and
 * `day-trade-alerts-contract.test.ts` pins them together.
 */

/**
 * Caps on the free-text fields.
 *
 * A symbol is a ticker and a price is something typed into a `type="text"` box; neither has any
 * business being long. The image field holds a URL, so it gets the room's usual URL headroom. These
 * are bounds against absurd input, not validation of shape: the reference validates only
 * non-emptiness, and imposing a numeric format here would refuse values the reference accepts.
 *
 * The same three numbers as the Swing schema, deliberately — the two forms are the same five inputs
 * with the same `minlength="1"` and no other constraint, so a room that accepts a symbol in one
 * would be strange to refuse it in the other.
 */
export const DAY_TRADE_ALERT_SYMBOL_MAX_LENGTH = 32;
export const DAY_TRADE_ALERT_PRICE_MAX_LENGTH = 32;
export const DAY_TRADE_ALERT_IMAGE_MAX_LENGTH = 2_000;

/**
 * `long` | `short`, closed. The radios offer nothing else (const indices 228 and 230) and the model
 * defaults to `long`.
 */
export const dayTradeAlertDirectionSchema = z.enum(['long', 'short']);

const dayTradeAlertFields = {
  symbol: z.string().trim().min(1).max(DAY_TRADE_ALERT_SYMBOL_MAX_LENGTH),
  direction: dayTradeAlertDirectionSchema,
  /*
    Trimmed and non-empty, matching `onDayTradeAlertSubmit`, which trims all five and refuses the
    first four when empty. NOT coerced to a number: the inputs are `type="text"` and the values are
    stored and rendered verbatim, so `123.570` must come back as `123.570`.
  */
  entryPrice: z.string().trim().min(1).max(DAY_TRADE_ALERT_PRICE_MAX_LENGTH),
  stop: z.string().trim().min(1).max(DAY_TRADE_ALERT_PRICE_MAX_LENGTH),
  target: z.string().trim().min(1).max(DAY_TRADE_ALERT_PRICE_MAX_LENGTH),
  /* The one optional field: `dayTradeAlert-image` carries no `required` attribute (const 227). */
  image: z.string().trim().max(DAY_TRADE_ALERT_IMAGE_MAX_LENGTH)
};

export const dayTradeAlertMsgSchema = z.strictObject({
  cmd: z.literal('dayTradeAlertMsg'),
  data: z.strictObject(dayTradeAlertFields)
});

export const editDayTradeAlertMsgSchema = z.strictObject({
  cmd: z.literal('editDayTradeAlertMsg'),
  data: z.strictObject({
    /** `dayTradeAlertID` — the row being edited, named as the wire names it. */
    dayTradeAlertID: z.number().int().positive(),
    ...dayTradeAlertFields
  })
});

export const deleteDayTradeAlertMsgSchema = z.strictObject({
  cmd: z.literal('deleteDayTradeAlertMsg'),
  data: z.strictObject({
    dayTradeAlertID: z.number().int().positive()
  })
});

/**
 * `getDayTradeAlertsLog`'s only parameter.
 *
 * The reference sends `{ sessionID, days }`; the session is not a parameter here because this room
 * takes the room from the session row rather than from the request — a client-supplied room id is
 * how one tenant reads another's log. Bounded above so a hand-edited query string cannot ask for an
 * unbounded scan.
 *
 * **420, not the Swing schema's 600.** The Day Trade select offers at most 15 months and the
 * conversion is `4 * months * 7`, so the largest window the UI can ask for is `4 * 15 * 7` = 420.
 * Carrying Swing's 600 across would have been the port's easiest mistake and would have widened the
 * bound by 180 days for no reason the UI can reach.
 */
export const DAY_TRADE_ALERT_MAX_LOG_DAYS = 420;

export const dayTradeAlertsLogDaysSchema = z
  .number()
  .int()
  .positive()
  .max(DAY_TRADE_ALERT_MAX_LOG_DAYS);
