/**
 * Alert Labels — `#DayTrade` in an alert body renders as a coloured badge.
 *
 * Decoded from `apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`: the room setting is
 * read at byte 1,147,290 and the transform is the `parseSymbols` pipe at byte 1,326,855.
 *
 * ## The setting is a STRING containing JSON, and it gains a field on read
 *
 * Byte 1,147,290, verbatim:
 *
 * ```js
 * if (sessData.alertLabels && sessData.alertLabels.length > 0) {
 *   const s = sessData.alertLabels.trim();
 *   globals.alertLabels = JSON.parse(s);
 *   globals.alertLabels = globals.alertLabels.map(r => (r.checked = !1, r));
 *   console.log("alertLabels:", globals.alertLabels);
 * }
 * ```
 *
 * The third such setting, beside `modAlertFilterList` and `chatTabsWithBadges`. The `checked = false`
 * stamped onto every entry is NOT for rendering — it is the selection state of the post-alert
 * composer's label picker, whose branch is `hiddenCapabilityBranches: ['…', 'alertLabels', …]` in
 * `direct-evidence-contract.ts`, i.e. never rendered in the capture we hold. It is carried here
 * because the parse is the same parse, and dropping it would silently change the shape the composer
 * will need.
 *
 * **`JSON.parse` with no try/catch**, exactly like `parseModAlertFilterList`. A malformed setting
 * throws rather than quietly disabling labels, which is the reference's behaviour and the honest one:
 * a room that typed bad JSON should find out.
 *
 * ## The transform, byte 1,326,855
 *
 * ```js
 * transform(e, i, o, s) {
 *   if (s && s.length > 0 && "alerts" === i)
 *     for (const r of s)
 *       e.includes(`#${r.hash}`) && (e = e.replace(`#${r.hash}`,
 *         `<span class="my-1 me-1 badge" style="background-color: ${r.bgcolor}; color: ${r.color};`
 *         + ` border: 1px solid ${r.color};">` + sanitize(r.name) + "</span>"));
 *   return e.includes("$") ? this.parseStock(e, i, o) : e;
 * }
 * ```
 *
 * Four properties that are easy to get wrong and are each reproduced below:
 *
 * 1. **`"alerts" === i` — labels NEVER apply to chat.** The same pipe runs on both logs; only the
 *    alerts one substitutes. A `#DayTrade` typed in chat stays literal text.
 * 2. **`String.replace(string, string)` replaces the FIRST occurrence only.** A body containing
 *    `#DayTrade` twice gets one badge and one piece of literal text. That reads like a bug and is
 *    the shipped behaviour.
 * 3. **No word boundary.** It is `includes`/`replace` on `#${hash}`, so `foo#DayTrade` matches and
 *    `#DayTraderX` matches on its `#DayTrade` prefix, leaving `rX` behind. A regexp with `\b` here
 *    would be a quiet divergence.
 * 4. **Labels run BEFORE `$TICKER`.** The `$` pass only happens on the string the label pass already
 *    rewrote, so `parseBodySegments` applies labels first for the same reason.
 */

/**
 * One configured label.
 *
 * Shape proven twice over: the transform reads `hash`, `name`, `bgcolor` and `color`, and the Manage
 * page's own help text spells the same four out —
 * `room-settings-schema.ts` line 185: `[ { "name": "Day Trade", "hash": "DayTrade",
 * "color": "#9c4537", "bgcolor":"#e8f5f7" } ]`.
 */
export interface AlertLabel {
  /** Matched in the body as `#${hash}`, with no word boundary. */
  hash: string;
  /** The badge's visible text. */
  name: string;
  /** `background-color` of the badge. */
  bgcolor: string;
  /** Both the text colour AND the 1px border colour. */
  color: string;
  /** Stamped `false` by the reference on read. The composer's picker state, not a render input. */
  checked: boolean;
}

/**
 * Parse the room setting.
 *
 * Deliberately NOT wrapped in try/catch — see the module note. An absent or blank setting is not an
 * error and yields no labels, which is the `sessData.alertLabels && …length > 0` guard.
 */
export function parseAlertLabels(raw: string | null | undefined): AlertLabel[] {
  if (!raw || raw.length === 0) return [];
  const parsed = JSON.parse(raw.trim()) as AlertLabel[];
  return parsed.map((label) => ({ ...label, checked: false }));
}

/**
 * The badge's inline style, assembled in the reference's order and spacing.
 *
 * The trailing semicolon after the border is in the capture. Kept because these strings are compared
 * against the captured markup, and a missing one would be a real difference in a DOM diff.
 */
export function alertLabelBadgeStyle(label: AlertLabel): string {
  return `background-color: ${label.bgcolor}; color: ${label.color}; border: 1px solid ${label.color};`;
}

/** The badge's classes, byte 1,326,855. */
export const ALERT_LABEL_BADGE_CLASS = 'my-1 me-1 badge';

/**
 * `processAlertLabels(e)` — the prefix the composer's label picker puts in front of an alert.
 *
 * Byte 2,131,232, verbatim:
 *
 * ```js
 * processAlertLabels(e) {
 *   let i = "";
 *   const o = globals.alertLabels.filter(s => s.checked);
 *   if (o.length > 0)
 *     for (let s = 0; s < o.length; s++)
 *       i += " #" + o[s].hash + (s === o.length - 1 ? "\n" : " ");
 *   return i && i.length > 0 && (e.txt = i + e.txt,
 *     globals.alertLabels.forEach(s => s.checked = !1)), e
 * }
 * ```
 *
 * Four properties of that string, each of which a "tidier" version would get wrong:
 *
 * 1. **Every entry is PREFIXED with a space**, including the first — so the alert body begins with
 *    ` #DayTrade` and not `#DayTrade`. That leading space survives into the stored body.
 * 2. **The separator is a space and the terminator is a newline**, so two labels produce
 *    `" #A #B\n"` — not `" #A\n #B\n"` and not `" #A #B"`.
 * 3. **It is PREPENDED**, after the legal disclosure has already been appended. All four call sites
 *    do the disclosure first (`e.txt += " \n " + legalDisclosureTxt`) and then this, so a body ends
 *    up as `labels + text + disclosure`.
 * 4. **Nothing happens when nothing is checked** — no leading newline, no empty prefix. The `if`
 *    guards the write as well as the loop.
 *
 * The UNCHECKING half of that method is deliberately not here: it mutates the room's shared label
 * table, and this room keeps the picker's selection in the composer that owns it. `PostAlertModal`
 * clears its own boxes, which is the same observable behaviour without a module reaching into
 * another one's state.
 *
 * @param labels ONLY the checked ones. The filter is the caller's, because the caller is what holds
 *   the selection — passing the whole table plus a predicate would put the picker's state in here.
 */
export function alertLabelPrefix(labels: readonly AlertLabel[]): string {
  if (labels.length === 0) return '';
  let prefix = '';
  for (let index = 0; index < labels.length; index += 1) {
    prefix += ` #${labels[index].hash}${index === labels.length - 1 ? '\n' : ' '}`;
  }
  return prefix;
}

/** A body split into literal text and the label badges found in it. */
export type AlertLabelPiece =
  { kind: 'text'; text: string } | { kind: 'label'; text: string; label: AlertLabel };

/**
 * Split a body on its configured labels, reproducing the reference's replace loop.
 *
 * ## Why a claim-ranges pass rather than a chain of `String.replace`
 *
 * The reference mutates one accumulating string, so each label searches the text the PREVIOUS labels
 * already rewrote. Emitting elements instead of HTML means there is nothing to search into, so the
 * equivalent is: walk the labels in their configured order, and let each claim the first occurrence
 * of its own `#hash` that no earlier label has already taken.
 *
 * For every input that is not pathological this is the same output. The one case it deliberately
 * differs on is a label whose `hash` appears inside an EARLIER label's `name` or colour — upstream
 * that substring sits in the generated HTML and can be matched and corrupted by the next iteration,
 * producing broken markup. Reproducing that would mean reintroducing string-built HTML to reproduce
 * a way of breaking it, so it is recorded here instead.
 *
 * Order of the emitted pieces is by POSITION, not by label order, because that is what the rendered
 * string looks like either way.
 */
export function splitAlertLabels(body: string, labels: readonly AlertLabel[]): AlertLabelPiece[] {
  if (labels.length === 0 || body.length === 0) return [{ kind: 'text', text: body }];

  const claimed: { start: number; end: number; label: AlertLabel }[] = [];

  for (const label of labels) {
    const needle = `#${label.hash}`;
    // `#` alone would match every position; a label with a blank hash configures nothing.
    if (label.hash.length === 0) continue;

    let from = 0;
    for (;;) {
      const at = body.indexOf(needle, from);
      if (at === -1) break;
      const end = at + needle.length;
      const overlaps = claimed.some((range) => at < range.end && range.start < end);
      if (!overlaps) {
        claimed.push({ start: at, end, label });
        break;
      }
      from = at + 1;
    }
  }

  if (claimed.length === 0) return [{ kind: 'text', text: body }];

  claimed.sort((a, b) => a.start - b.start);

  const pieces: AlertLabelPiece[] = [];
  let cursor = 0;
  for (const range of claimed) {
    if (range.start > cursor) pieces.push({ kind: 'text', text: body.slice(cursor, range.start) });
    pieces.push({ kind: 'label', text: body.slice(range.start, range.end), label: range.label });
    cursor = range.end;
  }
  if (cursor < body.length) pieces.push({ kind: 'text', text: body.slice(cursor) });

  return pieces;
}
