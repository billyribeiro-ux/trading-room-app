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
  /* Two consumers in `RoomMessage.svelte`: `presenter-msg-right` on the body and
     `presenter-reactions-right` on the reaction row. Added 2026-08-14 when the room began
     reading it; its three manage-page neighbours (`enableBadges`,
     `showBadgesToPresentersOnly`, `disableStarYears`) stay out until badges and star years
     have a supply. */
  'presenterMsgsOnTheRight',
  /* The other three terms of the chat-badge gate. Added 2026-08-14 with the badge SUPPLY: the
     internal room-config endpoint now sends definitions plus a hash-keyed assignment map, and
     the room joins them onto each message, so `visibleBadges` finally has something to show.
     `disableStarYears` is honest about being ahead of its data — it gates the membership star,
     whose `item.membershipYears` has no supply yet.

     NOTE, and it cost two red runs: no square bracket may appear anywhere inside this array, not
     even in a comment. `room-config-boundary.test.ts` reads the list with a regex that stops at
     the first closing bracket, so one written in prose ends the match early and the whole list
     silently reads as a single entry. The first attempt at this note said so and QUOTED the
     regex, which put the brackets straight back in. Describe it, never quote it. Same family as
     the rule about template syntax in comments: prose to a human, a terminator to a parser. */
  'enableBadges',
  'showBadgesToPresentersOnly',
  'disableStarYears',
  /* "Enable Rich Text Editor?" — the OWNER term in a THREE-way gate. The room reads it as
     `sessData.enableRTE && preferences.enableRTE && isPresenter`, and that expression appears three
     times in the decoded bundle: on the composer button that opens the editor (byte 1426967), in
     `loadRTE` which refuses to construct the editor without it, and again in `retriveRTEContent`
     which returns an empty string. The same double-gate shape as `beepOnUserJoin` — owner AND
     viewer must both allow it — with a presenter term on top. Added 2026-08-14 with the editor.

     AND NO APOSTROPHE ABOVE, for the same reason the note further up forbids a square bracket.
     The test reads this array by matching single-quoted runs, so an apostrophe in prose opens a
     phantom string that swallows every name until the next one. This comment said "the OWNER-s
     term" with a real apostrophe and turned the whole 38-name list into punctuation. The rule is
     now two characters wide: no square bracket, no apostrophe, anywhere inside this array. */
  'enableRTE',
  /* The five the ROOM OWN LOGIN PAGE reads from `sessData`, added 2026-08-14 with that page.
     Each is read in the decoded bundle at the offset named in the note on ROOM_VISIBLE_SETTINGS.
     Three of them were already on LOGIN_CONSUMED for the controller-side room-login
     route, so the union grows by two rather than five.

     `webinarPW` is deliberately absent and is not an oversight: it appears NOWHERE in the room
     bundle. The reference sends the typed password to its SERVER and never compares it in the
     browser, which is what `internal/room-entry` reproduces. `banIPList` is absent too — the
     reference does ship that one and checks it client-side, and we decline, because a ban list in
     a browser hands every banned address to every visitor while the server decision is
     authoritative anyway.

     NO APOSTROPHE ANYWHERE ABOVE. This is the THIRD time that rule has been broken in this array —
     brackets once, an apostrophe in 2026-08-14 morning, and an apostrophe again in this very
     comment, which turned the whole list into punctuation and failed the boundary test. Two
     characters, no exceptions. */
  'showPasswordField',
  'usernameInstructions',
  'hasRequiredPhoneInLogin',
  'customEnterDisclosure',
  'disableEditingUsername',
  'allowUsersToChangeUsername',
  'altBenzingaLinkURL',
  'altBenzingaLogoURL',
  'customMobileAppAndroidUrl',
  'customMobileAppEnabled',
  'customMobileAppIOSUrl',
  'dingOnNewMessage',
  'disableCopy',
  'disablePMForTrials',
  'freeTrialsGetApp',
  'beepOnUserJoin',
  'hasBenzingaNews',
  'hideAppInfo',
  'hideChatAlerts',
  'hideChatLog',
  'hideFiles',
  'hideMobileCredentials',
  /* The gate on the Notes tab. Added 2026-08-28 — the note at the foot of this file says why it
     arrived two weeks after its two siblings, `hideFiles` and `hideRecs`, which crossed together.
     NO APOSTROPHES IN THIS BLOCK: `room-config-boundary.test.ts` reads these names with a
     single-quote regex, so one in prose swallows the list. It cost a run to learn. */
  'hideNotes',
  /* The three ROOM DEFAULTS, added 2026-08-28 and crossing together because upstream they are three
     consecutive clauses of one expression. See the foot of this file and `room-config.ts`.
     NO APOSTROPHES IN THIS BLOCK. */
  'darkThemeAsDefault',
  'alertSoundOff',
  'alertsChatOnBottom',
  'hideRecs',
  'individualVolumeControls',
  'userJoinAndLeavePopup',
  'isChatOnlyRoom',
  'onlyPresentersVisibleToViewers',
  'overwriteCashRegisterSound',
  'ptrMobileAppEnabled',
  'rosterCountVisibleToViewers',
  'rosterVisibleToViewers',
  'showArchivesToSpecificPresenters',
  'showArchivesToUsers',
  'tawkPresenterSupport',
  'simUserCount',
  'userPM',
  'userToPresenterPM',
  'userUploads',
  /* The two MediaMTX playback settings, added 2026-08-14 with the Streams pane.

     `useMediaMTX` is the whole tab: the reference computes hideStreams as the negation of it and
     hides both the main-tab li and the pane on that one value. Until now the room had a
     placeholder li with a hardcoded hidden attribute, because the flag never arrived.

     `overlayUserIdOnScreenshare` gates the userXrefID burned over the video for non-presenters,
     which StreamingView renders. Both were captured manage-page rows marked unwired; both now
     have a named reader.

     The two cluster ids that sit beside useMediaMTX on the manage page stay out. They name
     infrastructure, the room bundle reads neither, and the room finds its host server-side. */
  'useMediaMTX',
  'overlayUserIdOnScreenshare',
  /* "Enable Swing Trade Alerts Tab?" — the entitlement for the whole Swing Alerts feature.
     Added 2026-08-15 with that pane, and it has a reader on the day it crosses: the room reads it
     as `sessData.hasSwingTradeAlerts` and gates three things on it — the nav item, the pane, and
     the initial log fetch. All three collapse to nothing when it is absent, which is the correct
     state for a room that has not bought the feature.

     Not a credential and not something the room could infer: it is a per-room product entitlement
     the owner ticks, and the room is where the tab is drawn.

     `linkedRoomSwingAlertsOther` stays OUT, deliberately. Upstream it redirects the log fetch to
     ANOTHER room by substituting that room-s session id, and this room takes the room from the
     session row precisely so that no client-supplied value can name the room being read. Sending
     it would reopen a cross-room read by configuration. If it is ever wanted it has to arrive as a
     server-resolved room id with the link confirmed here, not as a string the room dereferences. */
  'hasSwingTradeAlerts',
  /* "Enable Day Trade Alerts Tab?" — the entitlement for the whole Day Trade Alerts feature.
     Added 2026-08-15 with that pane, one step after the Swing one, and it has a reader on the day
     it crosses: the room reads it as `sessData.hasDayTradeAlerts` and gates four things on it — the
     nav item, the pane, the initial log fetch, and all three mutations. Every one of them collapses
     to nothing when it is absent, which is the correct state for a room that has not bought the
     feature.

     Note the spelling beside its sibling: the Swing flag doubles the word and this one does not.
     Both are read side by side in the reference bundle at bytes 1,009,430 and 1,009,503, so that is
     a read fact rather than a typo to tidy.

     `linkedRoomDayTradeAlertsOther` stays OUT, deliberately, as its Swing twin does. Upstream it
     redirects the log fetch to ANOTHER room by substituting that room-s session id, and this room
     takes the room from the session row precisely so that no client-supplied value can name the
     room being read.

     NO SQUARE BRACKET AND NO APOSTROPHE ANYWHERE ABOVE, for the reason the two notes further up
     give. The boundary test reads this array with a regex that stops at the first closing bracket
     and matches single-quoted runs, so either character silently truncates the whole list. That has
     gone red three times, which is why the word for the punctuation is spelled out instead. */
  'hasDayTradeAlerts',
  /* "Alert filter list for mods:" — added 2026-08-15 with the Alert Filter.

     Not a boolean gate like every flag above it. This one is a STRING CONTAINING JSON, holding a
     list of username and avatar pairs, which the reference parses at bundle byte 1,221,905 with no
     try around it. It is the third room setting shipped that way, after alertLabels and
     chatTabsWithBadges.

     It has to cross because the reference gates the WHOLE feature on it being truthy, at bytes
     2,042,979 and 2,286,654. A room that configures no list gets no entry point, no modal and no
     filtering, and the room cannot decide that for itself.

     The avatars are gravatar hashes of emails the owner already administers, and every alert
     already carries senderAvt so the room can draw the avatar. Nothing new crosses.

     NO SQUARE BRACKET AND NO APOSTROPHE ANYWHERE ABOVE, for the reason the notes further up give. */
  'modAlertFilterList',
  /* "Alert Labels" — a hash tag inside an alert body renders as a coloured badge.

     The fourth room setting shipped as a STRING CONTAINING JSON, and the one the note on
     modAlertFilterList above already names. Objects of name, hash, color and bgcolor. The room
     parses it at bundle byte 1,147,290, stamping checked=false onto every entry, and the
     parseSymbols transform at byte 1,326,855 swaps the first occurrence of each hash for a badge.

     It crosses because every rendered byte of that badge is a value the owner typed. The text, the
     background and the border colour have no defaults to fall back to, and a room that configures
     none renders the hash as ordinary text, which is exactly what the transform does when the list
     is empty.

     ALERTS ONLY. The same transform runs over chat and substitutes nothing there, so this value
     changes no chat message.

     Read by alert-labels.ts and RoomMessage.svelte.

     NO SQUARE BRACKET AND NO APOSTROPHE ANYWHERE ABOVE, for the reason the notes further up give. */
  'alertLabels',
  /* Four gates that RoomMessage.svelte already implements and no room could switch on.

     Every occurrence of all four in the reference bundle is sessData dotted onto the name, so they
     are room settings and never local state. The room had the props, defaulted false, and the page
     never passed them, which meant public reply, reactions, edit message and edit alerts were dead
     in every room regardless of what the owner ticked.

     usersPublicReply and enableReactions gate menu entries through sourceMessageBehavior;
     enableEditMessage and enableEditAlerts gate the edit entry for chat and for alerts separately,
     which is why they are two settings and not one. */
  'usersPublicReply',
  'enableReactions',
  'enableEditMessage',
  'enableEditAlerts',
  /* "Recording Reminder If Speaking?" - the room POLICY term of the reminder banner.

     Two different values share this name upstream and only one is a setting. The gate at bundle
     byte 2,477,770 reads sessData dotted onto the name AND a separate local flag of the same name,
     plus mic state and recording state. The room already has the local flag and already renders the
     banner; the policy term was the missing half, so an owner could not switch the reminder off. */
  'recordingReminder'
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
  'ssoJWTSecret',
  'tokenExpiresIn'
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
  /** How the reference wrote it: 'muted' | 'plain' | 'bare'. Null when there is no helper. */
  let helpShape = null;
  /** True when the helper is a sibling of the row's `<p>` rather than a child. */
  let helpOutside = false;
  /* Hoisted above the loop: two of the break clauses below compare against it, and it used to be
     declared after them — a temporal dead zone that threw at runtime. */
  const anchorIndent = lines[i].search(/\S/);
  for (let j = i + 1; j < lines.length && j < i + 10; j++) {
    if (/<a\.editable|<label[^>]*\.control-label/.test(lines[j])) break;
    /*
      A CONDITIONAL container ends the search, because what is inside it belongs to that block and
      not to the field above it.

      `pairSecretKey` is the case that proved it. The outline reads:

          <a.editable … saveSessField('pairSecretKey') …>
            · "empty"
          <div ng-show="sess.hasAppPairLink && sess.pairSecretKey">
            <br>
            <label>
              · "Sample link you would need to use to add each user: …"

      Without this clause that label is taken as `pairSecretKey`'s helper, and it is not — it labels
      the sample-link input inside the block, which the reference renders only when BOTH the flag and
      a secret are set. Attributing it to the setting made our Settings pane emit an extra `br` +
      `label.muted` that the reference has nowhere, offsetting every node after it: the side-by-side
      went from 16 differing elements to 1094, all of them that single shift.

      The other three helper shapes this loop was widened to catch are unaffected — they are plain
      siblings, and `pairOKRedirect`'s `<label.muted>` two lines below is one of them.
    */
    if (/<div[^>]*\bng-(show|if)=/.test(lines[j])) break;
    /*
      THE ROW'S OWN PARAGRAPH ENDS THE SEARCH, and so does a rule between sections.

      A row whose `<p>` closes with no helper used to keep the scan running into whatever came next,
      and two settings picked up text that is not theirs:

        hidePoweredBy     took "For pushing alerts and streams to other rooms, you can use the
                          following settings…" — the SECTION INTRODUCTION for the linked-rooms block,
                          which sits after an `<hr>` and belongs to the group, not to a
                          "Hide Powered By" checkbox. An operator saw a paragraph about relaying
                          alerts under a toggle that hides a footer credit.
        streamingThreads  took a stray "×".

      Both rows genuinely have NO helper. `<hr>` is furniture between groups and `<p>` opens the next
      row or a section paragraph — in either case the field above it is finished. The bare-text
      helpers this loop was widened for are unaffected: their text node precedes the next `<p>`,
      which is exactly the outline documented above.
    */
    if (/^\s*<(hr|p)\b/.test(lines[j])) break;
    /*
      LEAVING THE ROW'S PARAGRAPH ends the search.

      `streamingThreads` is the LAST setting in the pane. Its `<p>` closes, then the panel footer,
      then the permissions MODAL — and the scan walked all the way into that modal's close button and
      took its `×` as the setting's helper. An outline has no closing tags, so nothing else stopped
      it.

      Indent is the boundary. The anchor sits inside the `<p>`, so the paragraph itself is at
      `anchorIndent - 2`. Anything SHALLOWER than that has left the row entirely.

      `< anchorIndent - 2` and not `< anchorIndent`, deliberately: a `helpOutside` helper is a SIBLING
      of the `<p>`, sitting at exactly `anchorIndent - 2`. `doNotAutoSoftReset` is the case — its
      label is at 22 against its anchor's 24 — and a stricter test would drop the one shape this
      loop was widened to catch.
    */
    if (/^\s*</.test(lines[j]) && lines[j].search(/\S/) < anchorIndent - 2) break;
    /*
      A helper with NO ELEMENT AT ALL — the fourth shape, and the one that made three settings come
      out `help: null` while a hand-maintained table in `room-settings-help.ts` carried their text.

      The outline reads:

          <a.editable … saveSessField('sendFcmAlertsNew') …>
            · "No"
          · "Use pub/sub for notifications"
          <p.form-control-static>

      The anchor's own text sits one level deeper; the helper is a bare text node at the SAME indent
      as the anchor, a sibling of it inside the `<p>`. Indent is what separates them, so it is what
      this tests — matching on the text alone would take the anchor's value as its own helper.

      Counted: 3 settings, exactly the three the `BARE` table held.
    */
    if (/^\s*·/.test(lines[j]) && lines[j].search(/\S/) <= anchorIndent) {
      const text = textOf(j);
      /*
        `&nbsp;` is not a helper. `webinarDate` carries `· "&nbsp;"` between its anchor and the next
        row — spacing, which decodes to a single space and trims to nothing. Taking it produced a
        setting with `help: ""` and a shape, which is a helper that renders an empty element.
      */
      if (text && text.trim()) {
        help = text;
        helpShape = 'text';
      }
      break;
    }
    if (/<label/.test(lines[j])) {
      help = textOf(j + 1);
      /*
        Whether the helper is a SIBLING of the row's `<p>` rather than a child of it.

        Indent decides it: the anchor sits inside the `<p>`, so a helper at a SHALLOWER indent has
        closed that paragraph and is furniture between two rows. Counted across the capture, exactly
        one setting does this — `doNotAutoSoftReset`, whose label is at 22 against its anchor's 24,
        while the other four bare-shaped helpers are at 24 like their anchors.

        It was hardcoded in the page as a literal `<label>` with a comment saying "`help` cannot
        express that, so it is furniture here". It can now, and one generated boolean is worth more
        than a name-matched special case: the next setting that does this is picked up rather than
        rendered in the wrong place.
      */
      helpOutside = lines[j].search(/\S/) < anchorIndent;
      /*
        The SHAPE, not just the text.

        The reference writes a helper three ways, counted across this capture:

            136  <br> then <label class="muted">
             37  <br> then <label>
              5  <label> with no <br>

        Recording only the text made our renderer emit the muted form for all 178, which put a
        `class="muted"` on 42 helpers that do not have one and a `<br>` before 5 that do not. That
        is a node-for-node divergence in the Settings pane and it is what `manage-sections-sbs`
        measures, so the shape is part of the contract rather than a detail.
      */
      const muted = /<label[\w.-]*\.muted/.test(lines[j]);
      const precededByBr = lines[j - 1].trim() === '<br>';
      helpShape = muted ? 'muted' : precededByBr ? 'plain' : 'bare';
      break;
    }
  }

  defs.push({
    name,
    section: tabIndex < 0 ? 'room-form' : (TAB_SECTIONS[tabIndex] ?? 'settings'),
    type,
    label,
    help,
    helpShape,
    helpOutside,
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
  helpShape: null,
  // Hand-declared rows are not read from the outline, so placement is stated rather than derived.
  helpOutside: false,
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
  helpShape: null,
  helpOutside: false,
  captured: null,
  group: null
});

if (defs.length !== EXPECTED_TOTAL_COUNT) {
  throw new Error(`expected ${EXPECTED_TOTAL_COUNT} total settings; found ${defs.length}`);
}

const missingWiredSettings = [...WIRED_SETTINGS].filter((name) => !defs.some((definition) => definition.name === name));
// 60 since 2026-08-15: `hasDayTradeAlerts` joined ROOM_CONSUMED with the Day Trade Alerts pane, one
// step after its Swing twin. One flag is the whole feature again — the nav item, the pane, the
// initial `getDayTradeAlertsLog` fetch and all three mutations collapse to nothing without it.
// Its sibling `linkedRoomDayTradeAlertsOther` stays unwired for the same reason the Swing one does:
// upstream it redirects the log fetch at ANOTHER room by substituting that room's session id, and
// the room deliberately takes its room from the session row so nothing the browser can reach names
// the room being read. Note the spelling — the Swing flag doubles the word and this one does not,
// which is upstream's asymmetry and is confirmed read at bundle bytes 1,009,430 and 1,009,503.
//
// 59 since 2026-08-15: `hasSwingTradeAlerts` joined ROOM_CONSUMED with the Swing Trade Alerts pane.
// One flag is the whole feature — the nav item, the pane and the initial `getSwingAlertsLog` fetch
// all collapse to nothing without it, which is the right state for a room that has not bought it.
// Its sibling `linkedRoomSwingAlertsOther` stays unwired on purpose: upstream it redirects the log
// fetch at ANOTHER room by substituting that room's session id, and the room deliberately takes its
// room from the session row so that nothing the browser can reach names the room being read.
//
// 56 since 2026-08-14: the room's own login page landed, and the five settings that DRIVE it now
// cross — `showPasswordField`, `usernameInstructions`, `hasRequiredPhoneInLogin`,
// `customEnterDisclosure`, `disableEditingUsername`. THREE of them were already on LOGIN_CONSUMED
// for the controller-side room-login route, so the union grows by TWO, not five. The first attempt
// at this said three and the tripwire caught it.
//
// 54 since 2026-08-14: `enableRTE` joined with the chat rich text editor. It is the owner's term
// in a three-way gate the room resolves as `sessData.enableRTE && preferences.enableRTE &&
// isPresenter`; the other two terms are the presenter's own preference and their role, neither of
// which is the owner's to decide, so only this one crosses.
//
// 53 since 2026-08-14: `enableBadges`, `showBadgesToPresentersOnly` and `disableStarYears`
// joined once chat badges had a SUPPLY — see the note in `verify-room-settings-schema.mjs`.
//
// 50 since 2026-08-14: `presenterMsgsOnTheRight` joined when the room began reading it. Both its
// consumers had existed in `RoomMessage.svelte` since that component was written and neither was
// ever fed — `presenter-msg-right` on the message body and `presenter-reactions-right` on the
// reaction row — so the owner's setting did nothing however the room was configured. Its three
// neighbours on the same manage-page block (`enableBadges`, `showBadgesToPresentersOnly`,
// `disableStarYears`) are deliberately still OUT: nothing populates `item.badges` or
// `item.membershipYears`, so sending them would put values across a trust boundary for nothing.
//
// 49 since 2026-08-12: `tawkPresenterSupport` joined when the room gained the presenter
// support widget that reads it. Its property id is NOT the capture's - see
// `apps/room/src/lib/tawk-support.ts` for why copying `5aecb59f227d3d7edc24f7c2` would post every
// presenter's name and email into another company's inbox.
//
// 48 since 2026-08-12: `userJoinAndLeavePopup` and `beepOnUserJoin` joined ROOM_CONSUMED when the
// room gained the join/leave announcements that read them (`app-room.full.js:2134-2155`). Each
// effect there is gated twice — a room setting AND a per-viewer preference — and only the
// preferences existed here, so both gates evaluated `undefined` and a presenter was never told
// that anybody arrived or left, however the room was configured.
//
// Earlier at 46: `hideChatAlerts`, `isChatOnlyRoom` and `disableCopy` joined when the room gained
// the gates that read them.
//
// 58 since 2026-08-14: `useMediaMTX` and `overlayUserIdOnScreenshare` joined ROOM_CONSUMED with the
// Streams pane. The first is the entire Streams tab — the reference computes `hideStreams` as its
// negation and hides both the tab and the pane on that one value, so with the flag absent the room
// hid the tab in every room, MediaMTX or not. The second gates the viewer id burned over the video
// for non-presenters. Their two manage-page neighbours, the MediaMTX cluster ids, stay unwired:
// they name infrastructure, the room bundle reads neither, and the room finds its host server-side.
//
// 61 since 2026-08-15: `modAlertFilterList` joined with the Alert Filter. It is the first entry on
// this list that is NOT a boolean gate — a string containing JSON, a list of username and avatar
// pairs, parsed at bundle byte 1,221,905. The reference gates the entire feature on it being
// truthy, so a room that configures no list has no entry point and no modal, and the room cannot
// decide that for itself.
//
// 68 since 2026-08-28: `hideNotes` joined ROOM_CONSUMED, and it is the first entry added by the
// SETTINGS ENUMERATION (`apps/room/gate/audit-setting-coverage.mjs`) rather than by somebody
// building a feature and noticing a flag it needed. That is the whole reason the enumeration was
// written: `hideFiles` and `hideRecs` crossed on 2026-08-14 with the panes they gate, `hideNotes`
// did not, and nothing anywhere could see the omission — the Notes tab has always been built, so no
// feature work would ever have reached this flag. An owner who ticked *"Hide Notes Section?"* got a
// room that still showed the tab, silently, for two weeks.
//
// 71 since 2026-08-28: `darkThemeAsDefault`, `alertSoundOff` and `alertsChatOnBottom` joined
// together, three clauses of one expression in the reference at bytes 1,149,414 / 1,149,637 /
// 1,149,866. Each seeds a per-viewer preference ONCE and latches itself so it never becomes an
// override; the latch lives in the room, because which member has already been given a default is a
// fact about that member and not about the room. `#lib/room/room-defaults.ts` holds the rule and
// `room-defaults.test.ts` holds the negative controls. Second find of the settings enumeration.
//
// The literal is a tripwire, not a fact about the schema — it is here so the wired set cannot grow
// by accident, which is why changing it is a deliberate edit.
if (WIRED_SETTINGS.size !== 71 || missingWiredSettings.length > 0) {
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
// roomType has no captured value because its editor sits inside an HTML comment in the
// served DOM (byte 2,377) — PRESENT in the evidence, just not rendered as a control. Said
// precisely because "absent from evidence" is the phrasing that makes the next reader search,
// find nothing, and conclude the reference lacks the field. It does not: the property is live,
// and ng-show="sess.roomType=='webinar'" reads it at byte 2,652 to reveal the Date row.
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
   * How the reference WRITES that helper, which differs per field and is part of the match.
   *
   * Counted across the capture: 136 \`muted\` (\`<br><label class="muted">\`), 37 \`plain\`
   * (\`<br><label>\`) and 5 \`bare\` (\`<label>\` with no \`<br>\`). Rendering one shape for all of
   * them put a class on 42 helpers that have none and a \`<br>\` before 5 that have none.
   */
  readonly helpShape: 'muted' | 'plain' | 'bare' | 'text' | null;
  /** True when the reference puts the helper OUTSIDE the row's \`<p>\`, as a sibling of it. */
  readonly helpOutside: boolean;
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
      `  { name: ${q(d.name)}, section: ${q(d.section)}, type: ${q(d.type)}, label: ${q(d.label)}, help: ${q(d.help)}, helpShape: ${q(d.helpShape)}, helpOutside: ${d.helpOutside}, captured: ${q(d.captured)}, capturedIsDisplayOnly: ${d.type === 'select' || d.type === 'combodate' || d.type === 'date'}, group: ${q(d.group)}, wired: ${WIRED_SETTINGS.has(d.name)} }`
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
