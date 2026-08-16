import { z } from 'zod';

/**
 * The three Swing Trade Alerts mutations, validated on the way in.
 *
 * Shaped like `notes-command.ts`: one `strictObject` per command, `cmd` pinned to the literal wire
 * name so a payload can never be parsed by the wrong schema, and `strictObject` so an unexpected
 * field is a refusal rather than something silently dropped.
 *
 * The command names come from `docs/decoded/swing-alerts.md` §5. **Create is `swingAlertMsg`** —
 * `newSwingAlertMsg` is the server→client push and a field name inside the edit payload, and the
 * first revision of the decode had the two the wrong way round. `#lib/swing-alerts.js` carries the
 * same names as `SWING_ALERT_COMMANDS`, and `swing-alerts-contract.test.ts` pins them together.
 */

/**
 * Caps on the free-text fields.
 *
 * A symbol is a ticker and a price is something typed into a `type="text"` box; neither has any
 * business being long. The image field holds a URL, so it gets the room's usual URL headroom. These
 * are bounds against absurd input, not validation of shape: the reference validates only
 * non-emptiness, and imposing a numeric format here would refuse values the reference accepts.
 */
export const SWING_ALERT_SYMBOL_MAX_LENGTH = 32;
export const SWING_ALERT_PRICE_MAX_LENGTH = 32;
export const SWING_ALERT_IMAGE_MAX_LENGTH = 2_000;

/**
 * `long` | `short`, closed. The radios offer nothing else and the model defaults to `long`.
 */
export const swingAlertDirectionSchema = z.enum(['long', 'short']);

const swingAlertFields = {
  symbol: z.string().trim().min(1).max(SWING_ALERT_SYMBOL_MAX_LENGTH),
  direction: swingAlertDirectionSchema,
  /*
    Trimmed and non-empty, matching `onSwingAlertSubmit`, which trims all five and refuses the
    first four when empty. NOT coerced to a number: the inputs are `type="text"` and the values are
    stored and rendered verbatim, so `123.570` must come back as `123.570`.
  */
  entryPrice: z.string().trim().min(1).max(SWING_ALERT_PRICE_MAX_LENGTH),
  stop: z.string().trim().min(1).max(SWING_ALERT_PRICE_MAX_LENGTH),
  target: z.string().trim().min(1).max(SWING_ALERT_PRICE_MAX_LENGTH),
  /* The one optional field: `swingAlert-image` carries no `required` attribute (const index 178). */
  image: z.string().trim().max(SWING_ALERT_IMAGE_MAX_LENGTH)
};

export const swingAlertMsgSchema = z.strictObject({
  cmd: z.literal('swingAlertMsg'),
  data: z.strictObject(swingAlertFields)
});

export const editSwingAlertMsgSchema = z.strictObject({
  cmd: z.literal('editSwingAlertMsg'),
  data: z.strictObject({
    /** `swingAlertID` — the row being edited, named as the wire names it. */
    swingAlertID: z.number().int().positive(),
    ...swingAlertFields
  })
});

export const deleteSwingAlertMsgSchema = z.strictObject({
  cmd: z.literal('deleteSwingAlertMsg'),
  data: z.strictObject({
    swingAlertID: z.number().int().positive()
  })
});

/**
 * `getSwingAlertsLog`'s only parameter.
 *
 * The reference sends `{ sessionID, days }`; the session is not a parameter here because this room
 * takes the room from the session row rather than from the request — a client-supplied room id is
 * how one tenant reads another's log. Bounded above so a hand-edited query string cannot ask for an
 * unbounded scan: 20 months is the largest the select offers, and `30 * 20` is 600.
 */
export const SWING_ALERT_MAX_LOG_DAYS = 600;

export const swingAlertsLogDaysSchema = z.number().int().positive().max(SWING_ALERT_MAX_LOG_DAYS);
