/**
 * `hasAlertScheduler` — when a scheduled alert fires, and when it fires again.
 *
 * ## What the capture proves, and where it stops
 *
 * The client half is fully evidenced. The composer builds this payload and sends it as
 * `alertMsgLater` (bundle byte 2,130,937):
 *
 * ```js
 * let r = { txt, n: globals.user.name, sendTxt, sendEmail, sendTweet, sendLaterDate,
 *           repeatScheduledAlert,
 *           ignoreWeekends: "daily" === e.repeatScheduledAlert && e.ignoreWeekends,
 *           sendLaterAsNick, sendLaterAsEmail, nonTradeAlert, dontCrossPost };
 * ```
 *
 * behind a future-date check and a confirmation quoting the date and the send-as identity. The
 * manage modal (2,406,725) renders `{_id, sendOn, repeat, ignoreWeekends, alert:{n, txt}}` per row,
 * shows `repeat || "off"`, and adds a "no weekends" badge only when `daily === repeat &&
 * ignoreWeekends`. `getScheduledAlerts` fills `globals.scheduledAlerts`; `removeScheduledAlert`
 * splices the row out by `_id` (1,021,836).
 *
 * **What is NOT in the capture is the rescheduling.** The reference's SERVER decides when a `daily`
 * alert next fires; no byte of that reaches the browser. So the two rules below are a DECISION, and
 * they are marked as one rather than dressed up as a transcription:
 *
 * * `daily` advances by one day, and with `ignoreWeekends` skips forward past Saturday and Sunday.
 * * `weekly` advances by seven days, which lands on the same weekday and therefore cannot land on a
 *   weekend it did not already start on — so `ignoreWeekends` is meaningless there, and the composer
 *   agrees, because it only ever sends the flag for `daily`.
 *
 * They are the only readings consistent with the badge the manage modal draws. If the owner's server
 * did something else, this is the file to correct, and the divergence is recorded here rather than
 * discovered from a member's alert arriving on a Sunday.
 *
 * ## Why the arithmetic is its own module
 *
 * Because it is the part that is wrong at 23:00 on the last day of a month across a daylight-saving
 * boundary, and none of that is observable from a running room. Everything here is pure and takes
 * its clock as an argument.
 */

/** The three repeat modes the composer offers. `''` is the reference's own spelling for "off". */
export const REPEAT_MODES = ['', 'daily', 'weekly'] as const;
export type RepeatMode = (typeof REPEAT_MODES)[number];

/**
 * Deny-by-default, because this value crosses from a browser into a row that fires on its own.
 *
 * An unrecognised repeat is not coerced to `''`; the caller is expected to refuse the whole request.
 * Silently downgrading a typo to "off" would schedule an alert the presenter believes recurs.
 */
export function isRepeatMode(value: unknown): value is RepeatMode {
  return typeof value === 'string' && (REPEAT_MODES as readonly string[]).includes(value);
}

/** How long a repeating alert may keep rescheduling itself before it is abandoned. */
export const MAX_REPEAT_ADVANCES = 366;

const DAY_MS = 86_400_000;

/**
 * Whether a timestamp lands on a Saturday or a Sunday, in UTC.
 *
 * **UTC, and that is a limitation rather than a design.** The reference stores a room's timezone
 * nowhere the capture reveals, so "weekend" here is the server's UTC weekend. For a room whose
 * members are in UTC-7, an alert set for 18:00 Friday local is 01:00 Saturday UTC and would be
 * skipped. Recorded rather than guessed at: making this correct needs a room timezone, which is an
 * owner question, and inventing one would put a wrong answer somewhere nobody would think to look.
 */
export function isWeekend(at: Date): boolean {
  const day = at.getUTCDay();
  return day === 0 || day === 6;
}

/**
 * When a repeating alert fires next, or `null` when it does not repeat.
 *
 * @param sentAt the occurrence that has just fired. Advancing from THIS rather than from `Date.now()`
 *   is what keeps a series on its original time of day: a sweep that runs 40 seconds late must not
 *   push every future occurrence 40 seconds later, and one that misses an hour of ticks must not
 *   collapse the series onto the moment the process came back.
 * @param now the clock, so a long outage can be caught up rather than replayed. The result is always
 *   in the future relative to this.
 */
export function nextSendOn(
  sentAt: Date,
  repeat: RepeatMode,
  ignoreWeekends: boolean,
  now: Date
): Date | null {
  if (repeat === '') return null;

  const step = repeat === 'weekly' ? 7 * DAY_MS : DAY_MS;
  let next = new Date(sentAt.getTime() + step);

  /*
    CATCH-UP, NOT REPLAY. A room that was down for three days has three missed daily occurrences, and
    firing all three the moment it returns would post three identical alerts to everyone at once.
    Advancing until the result is in the future delivers the NEXT one instead, which is what a person
    means by "daily".

    Bounded, because an unbounded loop over a corrupt or absurd `sentAt` — a row from 1970, a clock
    that jumped — would spin the sweep forever while holding its claim. At the daily step the bound is
    a year; past that the caller stops the series rather than guessing, and says so.
  */
  let advances = 1;
  while (next.getTime() <= now.getTime()) {
    if (advances >= MAX_REPEAT_ADVANCES) return null;
    next = new Date(next.getTime() + step);
    advances += 1;
  }

  /*
    The weekend skip is applied LAST and only to `daily`.

    A weekly series steps seven days, so it lands on the weekday it started on and can never move
    onto a weekend — the composer knows this too, which is why it only ever sends the flag with
    `daily` (`ignoreWeekends: "daily" === repeat && ignoreWeekends`). Applying it to weekly anyway
    would shift a Saturday series to Monday and then leave it there, silently converting the series
    the presenter set up into a different one.
  */
  if (repeat === 'daily' && ignoreWeekends) {
    let skips = 0;
    while (isWeekend(next)) {
      if (skips >= 2) break;
      next = new Date(next.getTime() + DAY_MS);
      skips += 1;
    }
  }

  return next;
}

/**
 * Whether a stored occurrence is ready to fire.
 *
 * `<=` and not `<`: a row stored for exactly the tick the sweep wakes on must go, or a series set on
 * a round minute would wait a whole extra sweep every time.
 */
export function isScheduledAlertDue(sendOn: Date, now: Date): boolean {
  return sendOn.getTime() <= now.getTime();
}

/**
 * The composer's own guard — *"Please select a date in the future"* — as a rule rather than a dialog.
 *
 * Reproduced on the SERVER as well as in the browser, because a date is the one field on this form
 * whose being wrong schedules something rather than refusing something. The reference checks it only
 * client-side (`o <= i ? bootbox.alert(...)`), which is a check anyone can skip with a devtools
 * console; here it is checked where it decides.
 */
export function isSchedulableDate(sendOn: Date, now: Date): boolean {
  return Number.isFinite(sendOn.getTime()) && sendOn.getTime() > now.getTime();
}
