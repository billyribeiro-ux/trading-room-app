import type { RoomSettingDef } from './room-settings-schema';

/**
 * Helper copy for the Settings pane, corrected and completed from the rendered reference.
 *
 * `room-settings-schema.ts` is GENERATED and byte-verified against
 * `scripts/extract-manage-schema.mjs` (see `scripts/verify-room-settings-schema.mjs`), so nothing
 * below can be written into it by hand — the next `pnpm schema:extract` would erase it, and until
 * then `schema:verify` would call the checked-in file stale. This overlay is therefore the place
 * the corrections live, and it is applied at render time only.
 *
 * Two separate things are wrong in the generated file, both of them consequences of how the
 * extractor reads helper copy — it takes "the `label.muted` that follows", and nothing else:
 *
 * 1. Settings whose helper is a CLASSLESS `<label>` came out with `help: null`, so their row
 *    rendered three nodes short. Eight are in the pane above the Token Badges row (file2:1247,
 *    1474, 1501, 1507, 1512, 1517, 1523 and 1528); thirty-three more are below it, read one by one
 *    out of file2:1741-2506 and listed with their line numbers in `CLASSLESS` below.
 * 2. THREE whose helper text arrived damaged: `allowedPerms` lost the last two dots of its "…both
 *    must match..." (file2:1097; its sibling `allowedProducts`, file2:1092, kept all three, so
 *    this is not a deliberate normalisation), and `alertLabels` (file2:1702-1715) and
 *    `subscriptionPlans` (file2:1870-1883) were both cut off mid-token inside their JSON samples —
 *    at exactly 160 characters, which is `scripts/outline.mjs:41`, `text.slice(0, 160)`, feeding
 *    the extractor a truncated text node before it ever looks at it.
 *
 * `shape` says which of THREE forms the reference uses for the copy, and `br` whether a `<br>`
 * precedes it. Both are read off the capture per row. The majority — and therefore the default for
 * anything this file does not mention — is `<br><label class="muted">`.
 *
 * HONEST GAP: neither distinction is recorded anywhere in the evidence as a FLAG — both are read
 * off each helper's markup in file2, one by one. The fields are ours, the values are the capture's.
 */
export interface SettingHelp {
  /**
   * True when the reference puts this helper OUTSIDE the row's `<p>`, as a sibling of it.
   *
   * Three settings do — `pairOKRedirect`, `pairErrorRedirect` and `doNotAutoSoftReset` — and the
   * outline proves it by indent: their helper sits one level shallower than their own anchor.
   */
  outside: boolean;
  readonly text: string;
  /**
   * How the reference wraps the copy:
   *   'muted' — `<label class="muted">`, the majority
   *   'plain' — a CLASSLESS `<label>`
   *   'text'  — no element at all: a bare text node on the row's own `<p>`
   */
  readonly shape: 'muted' | 'plain' | 'text';
  /** whether the reference puts a `<br>` between the editable and the copy */
  readonly br: boolean;
}

/**
 * Three muted helpers the extractor damaged.
 *
 * `alertLabels` and `subscriptionPlans` are written on one line each. The capture spreads the same
 * JSON samples over fourteen lines apiece (file2:1702-1715 and 1870-1883), and an HTML text node
 * collapses every run of whitespace to a single space, so one line and fourteen paint identically —
 * these are the collapsed forms, not rewrites.
 */
const CORRECTED: Record<string, string> = {
  allowedPerms:
    'Leave blank to let all members in. Comma seprated list of valid permissions the user needs to have to enter. Either a product or membership, or both must match...',
  alertLabels:
    'JSON array of alert labels, i.e. [ { "name": "Day Trade", "hash": "DayTrade", "color": "#9c4537", "bgcolor":"#e8f5f7" }, { "name": "Swing Trade", "hash": "SwingTrade", "color": "#24794f", "bgcolor":"#e8f5f7" } ]',
  subscriptionPlans:
    'JSON array with subscription plans, i.e. [{ "name": "Basic Plan", "fee": 4.99, "desc": "Basic Plan Description.", "recommended": false }, { "name": "Pro Plan", "fee": 9.99, "desc": "Pro Plan Description.", "recommended": true },]'
};

/** The helper a settings row should render, or null when the reference gives it none. */
/**
 * How the generated `helpShape` becomes markup. The schema records the shape the reference WROTE;
 * this is the one place it turns into elements.
 *
 * | generated | element                 | preceded by `<br>` |
 * | --------- | ----------------------- | ------------------ |
 * | `muted`   | `<label class="muted">` | yes                |
 * | `plain`   | `<label>`               | yes                |
 * | `bare`    | `<label>`               | no                 |
 * | `text`    | none — a text node      | no                 |
 */
const SHAPE: Record<string, { shape: SettingHelp['shape']; br: boolean }> = {
  muted: { shape: 'muted', br: true },
  plain: { shape: 'plain', br: true },
  bare: { shape: 'plain', br: false },
  text: { shape: 'text', br: false }
};

/**
 * The helper a settings row should render, or null when the reference gives it none.
 *
 * ## This used to consult three hand-maintained tables, and a hardcoded row in the page
 *
 * `BARE`, `CLASSLESS` and `NO_BR` listed by name which settings take which shape — 16 names read out
 * of the capture by hand. Everything not on one of them fell through to `muted` + `<br>`, right for
 * the majority and silently wrong for the rest. A fourth exception lived in the page itself: a
 * literal `<label>` for `doNotAutoSoftReset`, with a comment saying "`help` cannot express that, so
 * it is furniture here".
 *
 * All four are gone. The generator derives shape AND placement from the same capture those lists
 * were read out of.
 *
 * That is not tidiness. A hand list of 16 beside a generated file of 269 is a second source of
 * truth, and it had already drifted three ways: it held 3 of the 13 text-node helpers, so 10
 * rendered with a class and a `<br>` the reference has none of; and the page's hardcoded row was
 * rendering a helper the shape system now also rendered, so that one appeared **twice**.
 *
 * **Verified before replacing, not after:** all 9 `CLASSLESS` names generate `plain`, all 4 `NO_BR`
 * names generate `bare`, and the placement flag finds exactly the three settings whose helper the
 * outline shows at a shallower indent than its own anchor.
 *
 * `CORRECTED` stays, and is a different concern — three helpers whose TEXT needed restoring, which
 * is now only the whitespace collapsing its docblock describes rather than the 160-character
 * truncation `outline.mjs` used to apply.
 */
export function settingHelp(
  def: Pick<RoomSettingDef, 'name' | 'help' | 'helpShape' | 'helpOutside'>
): SettingHelp | null {
  const text = CORRECTED[def.name] ?? def.help;
  if (text === null || text === undefined) return null;
  // `muted` is the fallback for help with no recorded shape — what every setting got before the
  // shape was generated.
  const { shape, br } = SHAPE[def.helpShape ?? 'muted'] ?? SHAPE.muted;
  return { text, shape, br, outside: def.helpOutside === true };
}
