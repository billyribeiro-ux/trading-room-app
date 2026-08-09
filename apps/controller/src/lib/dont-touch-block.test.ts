import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROOM_SETTINGS } from './room-settings-schema';

/*
  The manage page's "DON'T TOUCH" block, pinned against the reference's own rendered DOM.

  The evidence is `mising/file2` lines 2506-2888 in the sibling `new-room` repo — the served markup
  of `#/page/manageSession` with `donttouchShow` on — corroborated node for node by
  `docs/reference/pieces/ptr1-P22-settings-advanced-cluster.md`, which decodes the same block out of
  the `00-baseline-room` capture: 225 records under `r.0.1.1.0.1.3.1.5.0.4.0`, of which 62 are the
  block's direct children.

  Those 62 children are the thing this file exists to hold still. The block used to render as a flat
  `{#each}` of 49 identical rows, which is right about the FIELDS and wrong about everything else:
  it dropped 6 `<hr>`, 2 bare `<br>`, 2 empty `<p>`, 2 prose paragraphs, 2 button `<div>`s and the
  repeater console, and it split the two rows that pack TWO fields into one `<p>` into four.

  ── why the assertions are shaped like this ──────────────────────────────────────────────────────

  Comments are stripped before anything is asserted. A comment that QUOTES the markup it explains
  satisfies a `toContain` over the raw file, and this block is heavily commented, so every check
  below runs against comment-free source.

  The structure is asserted as one ORDERED TOKEN STREAM rather than as a bag of `toContain`s.
  Presence checks cannot see order, and order is most of what was wrong: an `<hr>` in the wrong
  place regroups the whole block visually, and it is exactly the kind of defect a presence check
  waves through.
*/

const ROOT = new URL('../routes/(app)/account/rooms/[id]/', import.meta.url);
const page = readFileSync(new URL('+page.svelte', ROOT), 'utf8');
const server = readFileSync(new URL('+page.server.ts', ROOT), 'utf8');

/** Comments stripped, so prose about the markup can never stand in for the markup. */
const markup = page.replace(/<!--[\s\S]*?-->/g, '');

/**
 * The block, sliced from the heading that opens it to the end of the file.
 *
 * Everything past the block is the panel's closing `</div>`s, an empty `.panel-footer` and the
 * permissions modal — no `<hr>`, no `<br>`, no `{@render dt*}`, so the tail cannot contribute a
 * token. `blockIsWhereWeThink` proves both ends rather than assuming them.
 */
const headingAt = markup.indexOf('These below unless you know what you are doing');
const block = markup.slice(headingAt);

/**
 * The block's structure, in document order.
 *
 * `Row`/`Note` are whole rows, `Field`/`Help` the halves the two double rows are built from, and
 * `HR`/`BR` the furniture. The snippets that expand `Row`, `Note`, `Field` and `Help` are declared
 * at the TOP of the component, outside this slice, which is what keeps their own internal `<br>`
 * out of the stream.
 */
const tokens = [
  // `\s*` after the paren is not cosmetic: prettier breaks the three longest `dtNote` calls across
  // lines, and without it those three rows silently vanished from the stream.
  ...block.matchAll(/(<hr \/>)|(<br \/>)|\{@render (dtRow|dtNote|dtField|dtHelp)\(\s*'([^']+)'/g)
].map((m) => (m[1] ? 'HR' : m[2] ? 'BR' : `${m[3].slice(2)}:${m[4]}`));

/**
 * The reference's 62 group-children, expanded.
 *
 * Row indices are P22 §6/§6.1's, and the two double rows (2 and 6) and the console (19) are spelled
 * out because their internals are structure too.
 */
const EXPECTED = [
  /* 0  */ 'Note:useV3',
  /* 1  */ 'Note:useV5',
  /* 2  */ 'Field:clusterID',
  'BR',
  'BR',
  'Field:backupClusterID',
  'BR',
  'Help:backupClusterID',
  /* 3,4  the two button divs — no token, asserted separately */
  /* 5   the empty spacer <p> */
  /* 6  */ 'Field:superClusterID',
  'BR',
  'Help:superClusterID',
  'BR',
  'BR',
  'Field:superClusterExpectedServerCount',
  'BR',
  'Help:superClusterExpectedServerCount',
  /* 7  */ 'Row:useFFmpegRecording',
  /* 8  */ 'BR',
  /* 9  */ 'Row:useLessBusyVsRoundRobin',
  /* 10 */ 'HR',
  /* 11 */ 'Row:useMediaMTX',
  /* 12 */ 'Row:mediaMTXClusterID',
  /* 13 */ 'Row:backupMediaMTXClustterID',
  /* 14 */ 'Row:media_max_bitrate',
  /* 15 */ 'Row:media_fir_rate',
  /* 16 */ 'Row:hasYTStreaming',
  /* 17 */ 'BR',
  /* 18 */ 'Field:media_relays',
  'BR',
  'BR',
  /* 19  the console: hr, br, input, button, br, input, button, br */
  'HR',
  'BR',
  'BR',
  'BR',
  /* 20  the second empty spacer <p> */
  /* 21 */ 'HR',
  /* 22 */ 'Row:isLocked',
  /* 23 */ 'Row:chatServerURL',
  /* 24 */ 'HR',
  /* 25 */ 'Row:force_jpeg_screenshare',
  /* 26 */ 'Row:force_mp3_audio',
  /* 27 */ 'Row:node_media_relays',
  /* 28 */ 'Row:node_ws_media_relays',
  /* 29 */ 'HR',
  /* 30  the alt-code intro paragraph */
  /* 31 */ 'Row:altCodeVendorJS',
  /* 32 */ 'Row:altCodeAppJS',
  /* 33 */ 'Row:customJanus',
  /* 34 */ 'Row:alt_roomjs',
  /* 35 */ 'Row:modAlertFilterList',
  /* 36 */ 'Row:customCSS',
  /* 37 */ 'Row:darkThemeStyle',
  /* 38 */ 'Row:hideLogo',
  /* 39 */ 'Row:hidePoweredBy',
  /* 40 */ 'HR',
  /* 41  the linked-rooms intro paragraph */
  /* 42 */ 'Row:linkedRoomAlerts',
  /* 43 */ 'Row:linkedRoomSwingAlerts',
  /* 44 */ 'Row:linkedRoomSwingAlertsOther',
  /* 45 */ 'Row:linkedRoomDayTradeAlerts',
  /* 46 */ 'Row:linkedRoomDayTradeAlertsOther',
  /* 47 */ 'Field:linkedRoomRecordings',
  'BR',
  'Help:linkedRoomRecordings',
  /* 48 */ 'Row:linkedStreamsAPIKey',
  /* 49 */ 'HR',
  /* 50 */ 'Note:ptrMobileAppEnabled',
  /* 51 */ 'Note:freeTrialsGetApp',
  /* 52 */ 'Note:customMobileAppEnabled',
  /* 53 */ 'Row:customMobileAppV3Name',
  /* 54 */ 'Row:customMobileAppIOSUrl',
  /* 55 */ 'Row:customMobileAppAndroidUrl',
  /* 56 */ 'Row:customMobileAppLaunchWord',
  /* 57 */ 'Row:hideMobileCredentials',
  /* 58 */ 'Note:ptrMobileAppCaseByCaseEnabled',
  /* 59 */ 'Row:nqNewsFeedURL',
  /* 60 */ 'Row:generateRandomUDPPort',
  /* 61 */ 'Row:streamingThreads'
];

describe('the DON’T TOUCH block', () => {
  it('blockIsWhereWeThink', () => {
    // Both ends proved. A slice that started at -1 would hand every assertion the whole file, and
    // a slice that ended early would make a missing row look like a passing test.
    expect(headingAt).toBeGreaterThan(0);
    expect(block).toContain('{@render dtNote(');
    expect(block).toContain("{@render dtRow('streamingThreads')}");
    expect(block).toContain('panel-footer');
    // nothing before the heading leaks in
    expect(block).not.toContain('Wordpress shortcode');
  });

  it('reproduces all 62 group-children in the reference’s order', () => {
    expect(tokens).toEqual(EXPECTED);
  });

  it('renders every one of the 49 dont-touch settings, once, in schema order', () => {
    const schema = ROOM_SETTINGS.filter((d) => d.group === 'dont-touch').map((d) => d.name);
    expect(schema).toHaveLength(49);

    const rendered = tokens
      .filter((t) => t.startsWith('Row:') || t.startsWith('Note:') || t.startsWith('Field:'))
      .map((t) => t.split(':')[1]);
    expect(rendered).toEqual(schema);
  });

  it('pairs clusterID with backupClusterID, and superClusterID with its server count, in ONE <p> each', () => {
    // Two fields, a double break between them, inside a single form-control-static paragraph.
    const paragraphs = [...block.matchAll(/<p class="form-control-static">([\s\S]*?)<\/p>/g)].map((m) => m[1]);

    const cluster = paragraphs.find((p) => p.includes("dtField('clusterID')"));
    expect(cluster).toBeDefined();
    expect(cluster).toContain("dtField('backupClusterID')");
    expect(cluster).toMatch(/<br \/>\s*<br \/>/);
    // the helper is the BACKUP's; clusterID has none in the reference
    expect(cluster).toContain("dtHelp('backupClusterID')");
    expect(cluster).not.toContain("dtHelp('clusterID')");

    const superCluster = paragraphs.find((p) => p.includes("dtField('superClusterID')"));
    expect(superCluster).toBeDefined();
    expect(superCluster).toContain("dtField('superClusterExpectedServerCount')");
    expect(superCluster).toMatch(/<br \/>\s*<br \/>/);
  });

  /*
    The copy with the reference's typos in it lives in the `<script>`, as three constants.

    Not a style choice: `prettier --write` collapses a run of spaces inside HTML TEXT — verified,
    `These  vars` comes back `These vars` — so writing it as template text hands the formatter the
    power to repair the very typo being matched. `{'…'}` in the markup avoids that and trips
    `svelte/no-useless-mustaches`, whose AUTOFIX puts the bug straight back. A constant is out of
    reach of both.

    So this asserts in two places: the constant holds the copy character for character, and the
    block renders that constant rather than some other text.
  */
  it('carries both prose paragraphs verbatim, typos and double space included', () => {
    expect(page).toContain(
      "const ALT_CODE_INTRO = 'These  vars allow to server altertaive code version for this room';"
    );
    expect(page).toContain(
      "'For pushing alerts and streams to other rooms, you can use the following settings. You need the other rooms ID and the API Secret of the other room to do this.'"
    );
    expect(block).toContain('<p>{ALT_CODE_INTRO}</p>');
    expect(block).toContain('<p>{LINKED_ROOMS_INTRO}</p>');
  });

  it('carries the six bare trailing notes, which are NOT .muted helper labels', () => {
    const notes = [...block.matchAll(/\{@render dtNote\(\s*'[^']+',\s*(["'])([\s\S]*?)\1\s*\)\}/g)].map((m) => m[2]);
    expect(notes).toEqual([
      "(DON'T TURN THIS ON, If PTR did not clear you for v3!! it will not work....)",
      "(DON'T TURN THIS ON, If PTR did not clear you for v5!! it will not work....)",
      "(DON'T USE this for ST)",
      'Also enable the app for free trials?',
      "(DON'T USE unless you have a custom app)",
      'Note above needs to ALSO be on (enable ptr app)'
    ]);
  });

  it('keeps the two empty spacer <p> and the class-less linkedRoomRecordings row', () => {
    expect([...block.matchAll(/<p><\/p>/g)]).toHaveLength(2);
    // row 47 is the one field row NOT in a `form-control-static` paragraph
    expect(block).toMatch(/<p>\s*\{@render dtField\('linkedRoomRecordings'\)\}/);
  });

  it('wraps the block in the reference’s second .form-vertical > .form-group.m0', () => {
    expect(block).toMatch(/<div class="form-vertical">\s*<div class="form-group m0">/);
  });
});

describe('the five DON’T TOUCH buttons', () => {
  /** `id` → the `?/action` of the form that id names. */
  const formsById = new Map(
    [...block.matchAll(/<form\s+id="([^"]+)"[\s\S]*?action="\?\/([A-Za-z0-9_]+)"/g)].map((m) => [m[1], m[2]])
  );

  /** every action `+page.server.ts` exports, matched at its own indentation */
  const declared = new Set([...server.matchAll(/^ {2}([A-Za-z0-9_]+):\s*async/gm)].map((m) => m[1]));

  const BUTTONS = [
    {
      label: 'Swap ClusterIDs (Backup &lt;--&gt; Main)',
      classes: 'btn btn-primary btn-link',
      action: 'swapClusterIds'
    },
    {
      label: 'Apply clusterID/backupID to all sessions',
      classes: 'btn btn-danger btn-sm',
      action: 'applyToAllSessions'
    },
    { label: '{APPLY_REPEATERS_LABEL}', classes: 'btn btn-warning', action: 'applyRepeaterToAccount' },
    { label: 'Add Server', classes: 'btn btn-inverse', action: 'addLiveServer' },
    { label: 'Remove Server', classes: 'btn btn-inverse', action: 'removeLiveServer' }
  ];

  it('keeps the amber button’s double space, which prettier would collapse in plain text', () => {
    expect(page).toContain("const APPLY_REPEATERS_LABEL = 'Apply  server / repeaters to entire account?';");
  });

  it('found the forms and the actions at all', () => {
    // Without this every loop below can pass by matching nothing.
    expect(formsById.size).toBe(5);
    expect(declared.size).toBeGreaterThan(20);
  });

  for (const button of BUTTONS) {
    it(`${button.action} has its button, with the reference's classes, wired to a real action`, () => {
      const at = block.indexOf(button.label);
      expect(at, `no button labelled ${button.label}`).toBeGreaterThan(-1);

      // the button element that owns that label — back up to its own `<button`
      const tag = block.slice(block.lastIndexOf('<button', at), at);
      expect(tag).toContain(`class="${button.classes}"`);
      expect(tag).toContain('type="submit"');

      const formId = /form="([^"]+)"/.exec(tag)?.[1];
      expect(formId, `${button.label} is not associated with any form`).toBeDefined();
      expect(formsById.get(formId!)).toBe(button.action);
      expect(declared.has(button.action)).toBe(true);
    });
  }

  it('confirms before either action that writes to EVERY room on the account', () => {
    for (const id of ['mg-apply-clusterids', 'mg-apply-repeaters']) {
      const form = /<form[\s\S]*?<\/form>/g;
      const match = [...block.matchAll(form)].find((m) => m[0].includes(`id="${id}"`));
      expect(match, `no form ${id}`).toBeDefined();
      expect(match![0]).toContain('confirmThen(');
      expect(match![0]).toContain('EVERY room on this account');
    }
  });

  it('gives the repeater console its two inputs, each posting to its own action', () => {
    for (const [inputId, formId] of [
      ['addServerTxt', 'mg-add-server'],
      ['removeServerTxt', 'mg-remove-server']
    ]) {
      const at = block.indexOf(`id="${inputId}"`);
      expect(at, `no input #${inputId}`).toBeGreaterThan(-1);
      const tag = block.slice(block.lastIndexOf('<input', at), block.indexOf('/>', at));
      expect(tag).toContain('name="server"');
      expect(tag).toContain(`form="${formId}"`);
    }
  });

  it('reveals the console from the helper text under Repeater List, as the reference does', () => {
    // `ng-click="showAdServer=true;"` is on the `label.muted`, not on a button.
    expect(block).toMatch(/class="muted"[\s\S]{0,400}?showAdServer = true/);
    expect(block).toContain("dontTouch('media_relays').help");
  });

  /*
    `.btn-inverse` is the one class this block introduces that PAINTS.

    Add Server and Remove Server are the only two nodes on the page carrying it, and manage.css had
    no rule for it at all, so both rendered as a bare `.btn` — a transparent border over nothing.
    That is the "class with no CSS rule" failure exactly, and nothing else in the repo would notice:
    `verify-manage-styles.mjs` only judges values we DECLARE, so an absent declaration is invisible
    to it. `.btn-primary`, `.btn-danger`, `.btn-sm`, `.btn-link` and `.btn-warning` were all already
    declared, which is why only this one is asserted here.
  */
  it('gives .btn-inverse a rule, since the console buttons measurably paint', () => {
    const css = readFileSync(new URL('../manage.css', import.meta.url), 'utf8');
    const rule = /\.mg-root \.btn-inverse\s*\{([^}]*)\}/.exec(css);
    expect(rule, '.btn-inverse is used in the markup and declared nowhere').not.toBeNull();
    // the measured values, from P22 §6.2 and the style contract's 4 nodes
    expect(rule![1]).toContain('rgb(54, 63, 69)');
    expect(rule![1]).toContain('color: rgb(255, 255, 255)');
  });
});

describe('the two account-wide actions are scoped to the caller’s own account', () => {
  const actionsBlock = server.slice(server.indexOf('export const actions: Actions = {'));
  const bodies = new Map<string, string>();
  {
    const declarations = [...actionsBlock.matchAll(/^ {2}([A-Za-z0-9_]+): async/gm)];
    for (const [index, match] of declarations.entries()) {
      const start = match.index ?? 0;
      bodies.set(match[1], actionsBlock.slice(start, declarations[index + 1]?.index ?? actionsBlock.length));
    }
  }

  it('found the five new actions', () => {
    for (const name of [
      'swapClusterIds',
      'applyToAllSessions',
      'applyRepeaterToAccount',
      'addLiveServer',
      'removeLiveServer'
    ]) {
      expect(bodies.has(name), `${name} is not exported`).toBe(true);
    }
  });

  for (const name of ['applyToAllSessions', 'applyRepeaterToAccount']) {
    it(`${name} fans out through accountRoomIds and never through the form`, () => {
      const body = bodies.get(name)!;
      /*
        Ownership first, then the fan-out — and the fan-out takes the ROOM id, so the account is
        derived from a row this caller has already been proved to own.

        Asserted over EVERY `accountRoomIds(` call in the body, not just the one spelled
        `accountRoomIds(roomId)`. A control that inserted `accountRoomIds(Number(params.id))` above
        the ownership check went unreported by the narrower version: the id it looked for was still
        further down, so the ordering still held while an unscoped fan-out ran first.
      */
      const scopeAt = body.indexOf('ownedRoomId(locals, params.id)');
      expect(scopeAt).toBeGreaterThan(-1);
      const calls = [...body.matchAll(/accountRoomIds\(([^)]*)\)/g)];
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) {
        expect(call.index, `${name} fans out before checking ownership`).toBeGreaterThan(scopeAt);
        expect(call[1], `${name} fans out from something other than the checked room`).toBe('roomId');
      }
      // no room or account id may come off the request
      expect(body).not.toMatch(/get\(['"](accountId|roomId|rooms?)['"]\)/);
      expect(body).not.toContain('accountId: Number');
    });
  }

  it('accountRoomIds derives the account from the room, not from locals or the request', () => {
    const helper = server.slice(server.indexOf('async function accountRoomIds'));
    const body = helper.slice(0, helper.indexOf('\n}\n') + 2);
    expect(body).toContain('eq(rooms.id, roomId)');
    expect(body).toContain('eq(rooms.accountId, room.accountId)');
    expect(body).not.toContain('locals');
    expect(body).not.toContain('request');
  });

  it('every write in the five actions goes through saveSetting, never raw SQL', () => {
    for (const name of [
      'swapClusterIds',
      'applyToAllSessions',
      'applyRepeaterToAccount',
      'addLiveServer',
      'removeLiveServer'
    ]) {
      const body = bodies.get(name)!;
      expect(body, `${name} writes without saveSetting`).toContain('saveSetting(');
      expect(body, `${name} writes the settings table directly`).not.toContain('roomSettings');
      expect(body, `${name} uses a raw update`).not.toMatch(/\.update\(|\.insert\(|\.delete\(/);
    }
  });
});
