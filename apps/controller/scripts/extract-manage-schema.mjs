#!/usr/bin/env node
/**
 * Regenerate src/lib/room-settings-schema.ts from `evidence-dumps/login-page/manage`, the
 * served DOM of the reference's `#/page/manageSession`.
 *
 * This tracked capture supersedes the ptr1.json one the schema was first built
 * from. It yields 268 settings. `roomType` is one separately reviewed product
 * deviation: the reference reads it to reveal webinar controls, but its editor
 * is commented out. The generated product schema therefore has 269 entries.
 *
 * For the 268 extracted entries, the following facts come from markup:
 *   name      the field named by `onaftersave="saveSessField('<field>')"`, which
 *             is what the reference WRITES; the `editable-*` binding is only what
 *             the popover edits, and on one row the two disagree
 *   type      which `editable-*` directive is used
 *   label     the nearest preceding `label.control-label`, verbatim, typos kept
 *   help      the `label.muted` that follows, if any
 *   captured  the anchor's own text: "empty" means unset, so it becomes null
 *   section   which tab-pane it sits in
 *   group     'dont-touch' for the block behind `ng-show="donttouchShow"`
 *
 * `wired` is NOT derived from the capture. The exact reviewed set below records
 * settings consumed by our room-login implementation. It must not depend on a
 * previous generated file: the same tracked inputs must always produce the same
 * bytes, including when the output path does not exist.
 *
 * Usage: node scripts/extract-manage-schema.mjs [--out <path>]
 */
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const SOURCE_RELATIVE = 'evidence-dumps/login-page/manage';
const SOURCE = resolve(REPO_ROOT, SOURCE_RELATIVE);
const OUTLINE_SCRIPT = resolve(SCRIPT_DIR, 'outline.mjs');
const DEFAULT_OUT = resolve(REPO_ROOT, 'src/lib/room-settings-schema.ts');

const args = process.argv.slice(2);
if (args.length !== 0 && (args.length !== 2 || args[0] !== '--out')) {
  console.error('usage: node scripts/extract-manage-schema.mjs [--out <path>]');
  process.exit(1);
}
const requestedOut = args[1];
const OUT = requestedOut
  ? isAbsolute(requestedOut)
    ? requestedOut
    : resolve(process.cwd(), requestedOut)
  : DEFAULT_OUT;

/**
 * Reviewed consumers, in either application.
 *
 * `wired: false` means the controller can store the value but nothing reads it — the honest bit,
 * so the UI can mark a control that does nothing instead of pretending. There are two consumers
 * now, and the flag has to mean both or it is lying about the second.
 *
 * This is generator input, not state recovered from generated output. Any change requires a
 * consumer test and an intentional schema regeneration.
 */

/** `src/lib/components/RoomLogin.svelte`, via `(public)/session/[code]/+page.server.ts`. */
const LOGIN_CONSUMED = [
  'allowUsersToChangeUsername',
  'claimNickName',
  'hasRequiredPhoneInLogin',
  'hideAvatars',
  'hidePoweredBy',
  'hideWelcomeTo',
  'loginErrorMsg',
  'nickFilter',
  'showPasswordField',
  'usernameInstructions',
  'webinarPW'
];

/**
 * The room application, via `internal/room-config/[code]`.
 *
 * Must equal `ROOM_VISIBLE_SETTINGS` in `src/lib/room-config.ts`, which is what actually decides
 * transport; `room-config-boundary.test.ts` asserts the two agree. Duplicated rather than imported
 * because that module imports the generated schema, and the generator has to run when the
 * generated file does not exist yet.
 */
const ROOM_CONSUMED = [
  'allowUsersToChangeUsername',
  'altBenzingaLinkURL',
  'altBenzingaLogoURL',
  'customMobileAppAndroidUrl',
  'customMobileAppEnabled',
  'customMobileAppIOSUrl',
  'disablePMForTrials',
  'freeTrialsGetApp',
  'hasBenzingaNews',
  'hideAppInfo',
  'hideChatLog',
  'hideFiles',
  'hideMobileCredentials',
  'hideRecs',
  'onlyPresentersVisibleToViewers',
  'overwriteCashRegisterSound',
  'ptrMobileAppEnabled',
  'rosterCountVisibleToViewers',
  'rosterVisibleToViewers',
  'showArchivesToSpecificPresenters',
  'showArchivesToUsers',
  'simUserCount',
  'userPM',
  'userToPresenterPM',
  'userUploads'
];

/**
 * The WordPress SSO door, via `(public)/sso/[code]/+server.ts`.
 *
 * A customer's WooCommerce decides whether a member has paid; that route checks the assertion their
 * site signs and applies these filters before minting a handoff. `ssoJWTSecret` is the signing key
 * and is deliberately NOT in `ROOM_VISIBLE_SETTINGS` — it is a credential, it stays in the
 * controller, and the room never sees it.
 *
 * `loginErrorMsg` is already in LOGIN_CONSUMED and is reused here, so the two doors refuse in the
 * same words; `loginErrorURL` is new, and is the customer's own "your subscription has lapsed" page.
 */
const SSO_CONSUMED = [
  'allowedMemberships',
  'allowedPerms',
  'allowedProducts',
  'loginErrorURL',
  'ssoJWTSecret'
];

const WIRED_SETTINGS = new Set([...LOGIN_CONSUMED, ...ROOM_CONSUMED, ...SSO_CONSUMED]);

/* Reuse the outline decoder so the parse below sees the same tree the docs do. */
const tempDirectory = mkdtempSync(join(tmpdir(), 'proroom-schema-'));
const outlinePath = join(tempDirectory, 'manage-outline.txt');
let lines;
try {
  execFileSync(process.execPath, [OUTLINE_SCRIPT, SOURCE, outlinePath], {
    cwd: REPO_ROOT,
    stdio: 'pipe'
  });
  lines = readFileSync(outlinePath, 'utf8').split('\n');
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}

const decode = (s) =>
  s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const textOf = (i) => {
  const m = /^\s*· "((?:[^"\\]|\\.)*)"/.exec(lines[i] ?? '');
  return m ? decode(JSON.parse(`"${m[1]}"`)) : null;
};

/* Tab panes in document order — the <ul class="nav-tabs"> above them names these. */
const TAB_SECTIONS = ['users', 'text-list', 'branding', 'sso-setup', 'stats', 'settings'];

let tabIndex = -1;
let inDontTouch = false;
let dontTouchIndent = Infinity;

const defs = [];
const seen = new Set();

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const indent = line.search(/\S/);

  if (/<div\.tab-pane/.test(line)) {
    tabIndex++;
    inDontTouch = false;
  }
  if (/ng-show="donttouchShow"/.test(line)) {
    inDontTouch = true;
    dontTouchIndent = indent;
  } else if (inDontTouch && indent >= 0 && indent <= dontTouchIndent && !/^\s*·/.test(line)) {
    inDontTouch = false;
  }

  const m = /editable-(text|textarea|checkbox|select|date|combodate|number)="([^"]+)"/.exec(line);
  if (!m) continue;

  const [, type, rawBinding] = m;
  const binding = rawBinding.trim();
  if (!binding.startsWith('sess.')) continue; // statsDate etc. are scope-local, not room settings

  /*
   * The name comes from `onaftersave`, not from the `editable-*` binding.
   *
   * Each row carries both, and they are supposed to agree. On the Logout Webhook
   * row they do not: it is bound `editable-textarea="sess.login_webhook_url"`
   * while saving `saveSessField('logout_webhook_url')` — a crossed wire in the
   * reference itself. Keying off the binding made this row a duplicate of the
   * Login Webhook row, so the dedupe below dropped it and `logout_webhook_url`
   * was silently absent from the schema entirely.
   *
   * `onaftersave` is the field the reference actually WRITES, so it is the field
   * the room stores. The binding is only which model the popover edits, and
   * where the two disagree the reference has a display bug we do not copy.
   */
  const saved = /saveSessField\(\s*'([^']+)'\s*\)/.exec(line);
  const name = saved ? saved[1].trim() : binding.slice(5).trim();
  if (seen.has(name)) continue; // a few are rendered twice behind different ng-show
  seen.add(name);

  /* label: nearest preceding control-label text */
  let label = null;
  for (let j = i - 1; j >= 0 && j > i - 12; j--) {
    if (/<label[^>]*\.control-label/.test(lines[j])) {
      label = textOf(j + 1);
      break;
    }
    if (/<a\.editable/.test(lines[j])) break; // ran into the previous field
  }

  /* captured value: the anchor's own text */
  const shown = textOf(i + 1);
  let captured = null;
  if (shown !== null && shown !== 'empty') {
    if (type === 'checkbox') captured = /^(yes|yes!)$/i.test(shown);
    else if (type === 'number') captured = Number(shown);
    else captured = shown;
  }
  if (type === 'checkbox' && shown === 'No') captured = false;

  /*
    help: the helper line after the field, whatever ELEMENT it happens to use.

    This required `<label.muted` and so found only the majority shape. The reference writes the
    same helper three other ways — a bare `<label>` with no class, a label with no preceding
    `<br>`, and a plain text node with no element at all — and 45 rows came out `help: null` as a
    result. They were never missing from the reference; they were missing from this regex, and
    every one is a sentence the operator is meant to read before changing a setting.

    The break condition is what keeps it honest: the NEXT row announces itself with
    `<label...control-label>` or its own editable anchor, so a helper can only ever be taken from
    between one field and the next.
  */
  let help = null;
  for (let j = i + 1; j < lines.length && j < i + 10; j++) {
    if (/<a\.editable|<label[^>]*\.control-label/.test(lines[j])) break;
    if (/<label/.test(lines[j])) {
      help = textOf(j + 1);
      break;
    }
  }

  defs.push({
    name,
    section: tabIndex < 0 ? 'room-form' : (TAB_SECTIONS[tabIndex] ?? 'settings'),
    type,
    label,
    help,
    captured,
    group: inDontTouch ? 'dont-touch' : null
  });
}

/*
 * 2026-08-07: each of these rose by one when the extractor started keying off
 * `onaftersave` instead of the `editable-*` binding. The recovered setting is
 * `logout_webhook_url`, which the reference binds to the login field and so had
 * been colliding with `login_webhook_url` and being deduped away. These pins are
 * what turned that into a build failure rather than a silent 267th row.
 */
const EXPECTED_EDITABLE_COUNT = 267;
const EXPECTED_EXTRACTED_COUNT = 268;
const EXPECTED_TOTAL_COUNT = 269;

if (defs.length !== EXPECTED_EDITABLE_COUNT) {
  throw new Error(`expected ${EXPECTED_EDITABLE_COUNT} editable settings in ${SOURCE_RELATIVE}; found ${defs.length}`);
}

/* The Branding tab's landing-page editor is the one live `sess.*` field bound
   with `ng-model` instead of an `editable-*` directive. It is a textAngular
   WYSIWYG, not an xeditable popover. Prove that exact live binding exists before
   representing it in the extracted set. */
const descriptionBindings = lines.filter((line) => /ng-model="sess\.description"/.test(line));
if (descriptionBindings.length !== 1 || seen.has('description')) {
  throw new Error(`expected one non-editable sess.description binding; found ${descriptionBindings.length}`);
}

const extractedCount = defs.length + 1;
if (extractedCount !== EXPECTED_EXTRACTED_COUNT) {
  throw new Error(`expected ${EXPECTED_EXTRACTED_COUNT} evidence-extracted settings; found ${extractedCount}`);
}

/* Reviewed product deviation: `roomType` is a live property —
   `ng-show="sess.roomType=='webinar'"` reads it to decide whether the Date row
   appears — but its editor is inside an HTML comment. The reference cannot
   change it from this page. The product exposes it in Settings without changing
   the captured room-form geometry. Only `webinar` is named in evidence; no
   additional option values are invented. */
if (seen.has('roomType')) {
  throw new Error('roomType became evidence-extracted; review and remove the product deviation');
}
defs.push({
  name: 'roomType',
  section: 'settings',
  type: 'select',
  label: 'Room Type',
  help: 'A webinar room adds a scheduled date and the reminder-email tools.',
  captured: null,
  group: null
});

/* Kept after roomType to preserve the established generated field order. */
defs.push({
  name: 'description',
  section: 'branding',
  type: 'html',
  label: 'Login Landing Page Editor',
  help: null,
  captured: null,
  group: null
});

if (defs.length !== EXPECTED_TOTAL_COUNT) {
  throw new Error(`expected ${EXPECTED_TOTAL_COUNT} total settings; found ${defs.length}`);
}

const missingWiredSettings = [...WIRED_SETTINGS].filter((name) => !defs.some((definition) => definition.name === name));
if (WIRED_SETTINGS.size !== 40 || missingWiredSettings.length > 0) {
  throw new Error(
    `wired-setting contract invalid: ${WIRED_SETTINGS.size} keys, missing ${missingWiredSettings.join(', ') || 'none'}`
  );
}

const q = (v) => (v === null || v === undefined ? 'null' : typeof v === 'string' ? JSON.stringify(v) : String(v));

const counts = {};
for (const d of defs) counts[d.type] = (counts[d.type] ?? 0) + 1;
const sections = {};
for (const d of defs) sections[d.section] = (sections[d.section] ?? 0) + 1;
const capturedSetCount = defs.filter((d) => d.captured !== null).length;
const extractedUnsetCount = extractedCount - capturedSetCount;
const wiredCount = defs.filter((d) => WIRED_SETTINGS.has(d.name)).length;

const body = `// GENERATED — do not edit by hand.
// Source: evidence-dumps/login-page/manage (served DOM of the reference's #/page/manageSession)
// Regenerate: pnpm schema:extract
//
// ${extractedCount} room settings extracted from the reference controller.
// 1 reviewed product deviation (roomType) is added; ${defs.length} settings total.
// By type: ${Object.entries(counts)
  .map(([k, v]) => `${k} ${v}`)
  .join(', ')}.
// By section: ${Object.entries(sections)
  .map(([k, v]) => `${k} ${v}`)
  .join(', ')}.
// ${capturedSetCount} extracted settings had a captured value; ${extractedUnsetCount} were unset.
// roomType has no captured value because its editor is absent from rendered evidence.
//
// \`wired\` is the honest bit: false means the controller can store the value but
// nothing in the room reads it yet. ${wiredCount} of ${defs.length} are wired today.
// Flip one to true ONLY when a consumer exists, so the UI can mark the rest
// instead of pretending they do something.

export type RoomSettingSection =
  | 'branding'
  | 'room-form'
  | 'settings'
  | 'sso-setup';

export type RoomSettingType =
  | 'checkbox'
  | 'combodate'
  | 'date'
  | 'html'
  | 'number'
  | 'select'
  | 'text'
  | 'textarea';

export interface RoomSettingDef {
  /** Key as stored in room_settings.settings_json, and as the reference names it. */
  readonly name: string;
  /** Which controller surface exposes this field. */
  readonly section: RoomSettingSection;
  readonly type: RoomSettingType;
  /** Label exactly as the reference renders it, including its typos. */
  readonly label: string | null;
  /** Helper copy shown under the field. */
  readonly help: string | null;
  /**
   * Value observed in the captured tenant. null = unset. Evidence, not a default.
   *
   * For every type EXCEPT select and combodate this is also the stored value.
   * For those two it is what the reference DISPLAYED — an option's label, or a
   * date formatted MM/DD/YYYY @ hh:mm A — and the underlying value is
   * something else entirely. capturedIsDisplayOnly says which, so a seed
   * cannot mistake one for the other. It did once: authMode was seeded as
   * "Open - Anyone with the room link can join with their email & name".
   */
  readonly captured: string | number | boolean | null;
  /** true when the captured text is display text rather than the stored value */
  readonly capturedIsDisplayOnly: boolean;
  /** 'dont-touch' for the block the reference hides behind a click on "TOUCH". */
  readonly group: 'dont-touch' | null;
  /** False until something in the room actually consumes this setting. */
  readonly wired: boolean;
}

export const ROOM_SETTINGS: readonly RoomSettingDef[] = [
${defs
  .map(
    (d) =>
      `  { name: ${q(d.name)}, section: ${q(d.section)}, type: ${q(d.type)}, label: ${q(d.label)}, help: ${q(d.help)}, captured: ${q(d.captured)}, capturedIsDisplayOnly: ${d.type === 'select' || d.type === 'combodate' || d.type === 'date'}, group: ${q(d.group)}, wired: ${WIRED_SETTINGS.has(d.name)} }`
  )
  .join(',\n')}
];

/** Fast lookup by the name the reference uses. */
export const ROOM_SETTING_BY_NAME: ReadonlyMap<string, RoomSettingDef> = new Map(
  ROOM_SETTINGS.map((d) => [d.name, d])
);

/** Kept as the name the rest of the app already imports. */
export const ROOM_SETTINGS_BY_NAME = ROOM_SETTING_BY_NAME;

/**
 * The stored shape: every setting the controller can write, with the value type
 * its editor produces. A room's row holds a Partial of this — an absent key
 * means "never set", which is what the reference renders as "empty".
 */
export interface RoomSettings {
${defs
  .map((d) => {
    const t = d.type === 'checkbox' ? 'boolean' : d.type === 'number' ? 'number' : 'string';
    const doc = d.label ? `  /** ${d.label.replace(/\*\//g, '*\\/')} */\n` : '';
    return `${doc}  ${/^[A-Za-z_$][\w$]*$/.test(d.name) ? d.name : JSON.stringify(d.name)}: ${t};`;
  })
  .join('\n')}
}
`;

writeFileSync(OUT, body);
console.log(
  `${defs.length} settings -> ${OUT}\n  sections: ${JSON.stringify(sections)}\n  types: ${JSON.stringify(counts)}\n  captured: ${capturedSetCount}, wired: ${wiredCount}`
);
