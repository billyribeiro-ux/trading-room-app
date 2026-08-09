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
 * 1. EIGHT settings whose helper is a CLASSLESS `<label>` came out with `help: null`, so their
 *    row rendered three nodes short. They are file2:1247, 1474, 1501, 1507, 1512, 1517, 1523
 *    and 1528, and each reads `<br><label>…</label>` with no class at all.
 * 2. TWO whose helper text arrived damaged: `allowedPerms` lost the last two dots of its "…both
 *    must match..." (file2:1097; its sibling `allowedProducts`, file2:1092, kept all three, so
 *    this is not a deliberate normalisation), and `alertLabels` was cut off mid-token inside its
 *    JSON sample (file2:1702-1715).
 *
 * `muted` says which of the two shapes the reference uses. Every helper in this pane is
 * `<label class="muted">` EXCEPT the eight above, which is why it defaults to true for anything
 * this file does not mention.
 *
 * HONEST GAP: the muted/classless distinction is not recorded anywhere in the evidence as a
 * FLAG — it is read off each label's markup in file2, one by one. The field is ours, the values
 * are the capture's.
 */
export interface SettingHelp {
  readonly text: string;
  /** true for `<label class="muted">`, false for the reference's classless `<label>` */
  readonly muted: boolean;
}

/**
 * Eight classless helpers, transcribed from the lines named above.
 *
 * `autoOpenTime` and `autoCloseTime` carry two TRAILING spaces in the capture (file2:1523, 1528).
 * They are dropped here rather than hidden in a string literal: HTML collapses trailing
 * whitespace before a closing tag, so nothing on screen depends on them.
 */
const CLASSLESS: Record<string, string> = {
  usernameInstructions: 'Instructions how user can edit his username',
  showArchivesToSpecificPresenters: 'Comma separated list of Presenter emails',
  banIPList: 'Comma separated list of banned IPs',
  reportEmail: 'Comma separated list of emails to receive abuse reports',
  customJWTErrorMessage: 'Set a custom JWT error message',
  sendOpenCloseEmail: 'Comma separated list of emails to receive open / close room events',
  autoOpenTime: 'Time in Military EST to automatically OPEN the room. i.e. 7:30',
  autoCloseTime: 'Time in Military EST to automatically CLOSE the room. i.e. 18:30'
};

/**
 * Two muted helpers the extractor damaged.
 *
 * `alertLabels` is written on one line. The capture spreads the same JSON sample over fourteen
 * (file2:1702-1715), and an HTML text node collapses every run of whitespace to a single space,
 * so one line and fourteen paint identically — this is the collapsed form, not a rewrite.
 */
const CORRECTED: Record<string, string> = {
  allowedPerms:
    'Leave blank to let all members in. Comma seprated list of valid permissions the user needs to have to enter. Either a product or membership, or both must match...',
  alertLabels:
    'JSON array of alert labels, i.e. [ { "name": "Day Trade", "hash": "DayTrade", "color": "#9c4537", "bgcolor":"#e8f5f7" }, { "name": "Swing Trade", "hash": "SwingTrade", "color": "#24794f", "bgcolor":"#e8f5f7" } ]'
};

/** The helper a settings row should render, or null when the reference gives it none. */
export function settingHelp(def: Pick<RoomSettingDef, 'name' | 'help'>): SettingHelp | null {
  const classless = CLASSLESS[def.name];
  if (classless !== undefined) return { text: classless, muted: false };

  const text = CORRECTED[def.name] ?? def.help;
  return text === null || text === undefined ? null : { text, muted: true };
}
