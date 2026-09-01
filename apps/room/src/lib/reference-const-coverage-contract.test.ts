import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { findUnsafeRawEmails } from '../../gate/privacy-utils.mjs';
import { parseConstTable } from './const-table.mjs';
import { codeOf } from './source-comments';

/**
 * EVERY REFERENCE COMPONENT'S `consts:` TABLE, MEASURED AGAINST WHAT THIS ROOM ACTUALLY SHIPS.
 *
 * ## Why one sweep and not a fifty-second per-surface audit
 *
 * `todo-next.md`'s method for auditing a surface is fixed and it works: decode the reference
 * component's const table by value, then look for each value in ours and list what is missing. It has
 * been carried out by hand three times in a week — `PollPanel`, the roster, `PrivateChatPanel` — and
 * each run found something real. It is also the same twenty lines of work every time, and at three
 * surfaces a session the remaining forty would take a fortnight and would measure the repository as
 * it was on the day each one ran.
 *
 * So the method itself is the thing worth committing. This runs it over **all 51** components the
 * pinned v4 bundle declares, on every invocation of the suite, and pins the result.
 *
 * ## What a `consts:` table is, and why its VALUES are the right unit
 *
 * Angular compiles a component template into two halves: a `template:` function of opaque minified
 * instruction calls, and a `consts:` array holding every literal that function refers to by index —
 * class names, ids, hrefs, placeholder text, titles, image sources. The instructions are unreadable
 * without the Angular runtime; the const table is a flat, ordered, complete list of the strings that
 * reach a user's screen. Transcribing a surface faithfully means those strings appear here too.
 *
 * ## The three exclusions, each STRUCTURAL rather than a hand-written list of names
 *
 * A hand-maintained deny-list is how a sweep quietly stops measuring: a value nobody wanted to
 * explain gets added to it. All three exclusions below are derived from the bundle itself.
 *
 * 1. **Template reference variables.** Angular declares a `#ref` as a two-string entry at the HEAD of
 *    the table — `["emojiPanelDiv",""]`, or `["alertForm","ngForm"]` when it exports a directive. The
 *    leading run of such entries is skipped whole. These names are Angular's own plumbing for one
 *    element to address another; Svelte's equivalent is a variable with `bind:this`, so the NAME
 *    never survives translation and its absence says nothing about coverage. Positional, not by
 *    name: an entry with the same shape further down the table is a static attribute pair
 *    (`["formControlName","recaptcha"]`) and is NOT skipped.
 *
 * 2. **Attribute and listener NAMES, by position.** Inside an entry the leading strings are
 *    `name, value` pairs; a numeric marker changes the mode — `1` begins class names, `2` begins
 *    `name, value` style pairs, and `3` and above begin binding and listener names. So `type`, `id`,
 *    `aria-label`, `click` and `ngModelChange` are skipped for WHERE they sit, and `button`,
 *    `Toggle navigation` and `navbar-brand` are kept for the same reason. The first draft of this
 *    file used a hand-written set of forty-eight boring names instead, and that set is exactly what
 *    this replaces.
 *
 * 3. **Angular API names**, gathered from the bundle: every string inside any `selectors:[[…]]` and
 *    every key of any `inputs:{…}`. That is what makes `ngForOf`, `ngModel`, `formControlName`,
 *    `ngbDropdownMenu` and `app-scplayer`'s `scUrl` input drop out — they are framework identifiers,
 *    and a Svelte port has no such thing to be missing. Two hundred and forty-two names, and it is
 *    NOT the whole of Angular: `ngForm` is not among them, because its selector is written as an
 *    element match rather than an attribute one. Exclusion 1 catches that one instead, from
 *    `["alertForm","ngForm"]` — which is why all three exclusions exist and none is the safety net
 *    for the others.
 *
 * ## The stripping is load-bearing, and its own case below proves it
 *
 * Our side is read through `codeOf`, which removes comments. This repository quotes the reference
 * constantly — that is the house style and the root standard requires it — so a raw-text search
 * counts a docblock as coverage. **Measured on 2026-08-31: 122 residuals against raw text, 146
 * against code.** Twenty-four values were "covered" by nothing but a comment quoting the reference at
 * them. `captured-css-ancestor-contract.test.ts` learned the identical lesson from a negative control
 * that came back green, and this file was written knowing it and still had to measure it to believe
 * the size of it.
 */

/**
 * TRACKED, 2,891,205 bytes, SHA-256
 * `40796ca83dba809bb966dad0d020ee5170b33aa4556c691957cb65f0bab87524`.
 */
const BUNDLE = readFileSync('docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', 'utf8');

/**
 * A string this repository writes across concatenated literals, rejoined.
 *
 * ## The false GAP this closes, and why the fix is this narrow
 *
 * `app-presentationarea`'s const 74 is a 258-character tooltip, and both `ScreenTabs.svelte` and
 * `StreamTabs.svelte` carry it verbatim — as three literals joined by `+`, because one line of 258
 * characters is not what prettier leaves behind. The sweep looks for the whole value as a substring
 * and never found it, so it reported as MISSING a value that ships on two surfaces.
 *
 * The join is deliberately the smallest transformation that fixes it: only a quote, `+`, and the
 * next quote, with whitespace between. It cannot reach across a variable, an expression or a
 * template hole. What it CAN do, in principle, is glue two unrelated adjacent literals into a
 * spurious match — so the risk it carries is hiding a true gap, never inventing one. Measured on the
 * day it was added: exactly one residual moved, and it was this tooltip.
 */
const rejoinConcatenations = (source: string): string =>
  source.replace(/'\s*\+\s*'/g, '').replace(/`\s*\+\s*`/g, '');

/** Every shipping source file, comments stripped. See the module note. */
const readOurs = (strip: boolean): string =>
  rejoinConcatenations(
    globSync('src/**/*.{svelte,ts}')
      .filter((path) => !path.includes('.test.'))
      .map((path) => {
        const source = readFileSync(path, 'utf8');
        return strip ? codeOf(path, source) : source;
      })
      .join('\n')
  );

/**
 * EVERYTHING this app contains — shipping code, docblocks and contract tests alike — MINUS this file.
 *
 * The exclusion is the whole point and the first version of this measurement did not have it. Every
 * residual is written out in `RESIDUALS` below, so reading this file back reports 145 of 146 values
 * as "already examined" and the remaining one only because it is redacted. A tautology that looks
 * like a result, and it was believed for about a minute.
 */
const REPOSITORY = rejoinConcatenations(
  globSync('src/**/*.{svelte,ts}')
    .filter((path) => !path.includes('reference-const-coverage'))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n')
);

/** Exclusion 3 — framework identifiers, read out of the bundle rather than listed by hand. */
const angularApiNames = (): ReadonlySet<string> => {
  const names = new Set<string>();
  for (const block of BUNDLE.matchAll(/selectors:\[\[([^\]]*)\]\]/g))
    for (const name of block[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)) if (name[1]) names.add(name[1]);
  for (const block of BUNDLE.matchAll(/inputs:\{([^}]*)\}/g))
    for (const name of block[1].matchAll(/(\w+):"/g)) names.add(name[1]);
  return names;
};

const API = angularApiNames();

/** See the module note. The predicate that decides this is the privacy gate's, not this file's. */
const REDACTED = '[REDACTED_REFERENCE_EMAIL]';

/**
 * The strings one `consts:` table puts on screen, with exclusions 1 and 2 applied.
 *
 * The table is bounded by slicing `consts:` to the `,template:function` that always follows it, so
 * `parseConstTable` — which refuses trailing input, and is the single source of truth for this
 * literal shape — receives exactly the array and nothing else.
 */
const renderedValues = (table: readonly unknown[]): string[] => {
  let head = 0;
  while (
    head < table.length &&
    Array.isArray(table[head]) &&
    (table[head] as unknown[]).length === 2 &&
    (table[head] as unknown[]).every((item) => typeof item === 'string')
  )
    head += 1;

  const values: string[] = [];
  for (const entry of table.slice(head)) {
    if (typeof entry === 'string') {
      values.push(entry);
      continue;
    }
    if (!Array.isArray(entry)) continue;
    /* 0 = static `name, value` pairs, 1 = class names, 2 = style pairs, 3+ = binding names. */
    let mode = 0;
    let slot = 0;
    for (const item of entry as unknown[]) {
      if (typeof item === 'number') {
        mode = item;
        slot = 0;
        continue;
      }
      if (typeof item !== 'string') continue;
      if (mode === 1) {
        values.push(item);
        continue;
      }
      if (mode === 0 || mode === 2) {
        if (slot % 2 === 1) values.push(item);
        slot += 1;
      }
    }
  }
  return values;
};

interface Coverage {
  readonly component: string;
  readonly values: number;
  readonly residuals: readonly string[];
}

const sweep = (ours: string): Coverage[] => {
  const rows: Coverage[] = [];
  for (const match of BUNDLE.matchAll(/selectors:\[\["(app-[a-z0-9-]+)"\]\]/g)) {
    const consts = BUNDLE.indexOf('consts:[', match.index);
    const template = BUNDLE.indexOf(',template:function', match.index);
    if (consts === -1 || template === -1 || consts > template) continue;
    const table = parseConstTable(
      BUNDLE.slice(consts + 'consts:'.length, template)
    ) as readonly unknown[];
    const values = renderedValues(table);
    rows.push({
      component: match[1],
      values: values.length,
      /*
        Three characters is the floor for a value worth asking about: below it every string in the
        bundle is a Bootstrap fragment (`me`, `p-0`) that says nothing about whether a feature exists.
      */
      residuals: [
        ...new Set(
          values
            .filter((v) => v.length >= 3 && !API.has(v) && !ours.includes(v))
            .map((v) => (findUnsafeRawEmails(v).length > 0 ? REDACTED : v))
        )
      ]
    });
  }
  return rows;
};

const ROWS = sweep(readOurs(true));

/** The same sweep over UNSTRIPPED source. Module scope: it is the second pass over 2.9 MB. */
const RAW_ROWS = sweep(readOurs(false));

/**
 * WHAT IS STILL MISSING, MEASURED 2026-08-31, EVERY VALUE NAMED.
 *
 * This is a RATCHET and it fails in both directions. A value that disappears from this room shows up
 * as a new residual; a value that gets built and is left listed here shows up as a stale entry. Both
 * are the same failure — the map no longer matching the code — and both are red.
 *
 * The groups below are the finding. They are four kinds of thing, and only two are work:
 */
const RESIDUALS: Readonly<Record<string, readonly string[]>> = {
  /*
    ONE — SURFACES THIS ROOM HAS NOT BUILT AT ALL.

    `app-session-transcript` is the clearest result the sweep produced: eighty values, twenty-seven of
    them absent, and the absent ones are the whole component — its container, its header, its date
    picker, its pagination and its entries. Nothing in this repository renders a transcript list. It
    was named in no tracker row, and it was found by measurement rather than by reading.

    ## Traced on 2026-08-31, and it is an OWNER DECISION rather than work

    The component (byte 2,611,020) is a STANDALONE PAGE opened in its own window — it reads `token`
    and `name` off the location hash, posts `transcriptWindowClosing` back to `window.opener`, and
    pages a date-filtered archive through `getSessionTranscripts(token, {startDate, page, limit})` at
    300 rows a page. What it renders is a stored history of everything anybody SAID in a session.

    **This room relays captions and stores none of them, deliberately, at both layers.**
    `room/recording.ts` sends each result straight down the signalling socket, and
    `services/media/src/server.rs` handles `sendSpeechReco` by checking `may_produce`, bounding the
    text, and calling `notify_room` — a relay, with no write anywhere.

    Building the viewer therefore means first deciding to record every spoken word of every session to
    disk. In a multi-tenant fintech application that is a retention, consent and jurisdiction question
    and it belongs to the owner, not to a sweep closing a gap. **The twenty-seven values stay listed,
    with this reason, rather than being built or quietly excluded.**
  */
  'app-session-transcript': [
    'transcript-container',
    'transcript-header',
    'header-controls',
    'date-picker-container',
    'date-picker',
    'date-label',
    'search-container',
    'Search transcripts...',
    /*
      `Clear search` was here until 2026-08-31 and left WITHOUT being built. It is the aria-label on
      the archived-log viewer's clear button, so the sweep — a substring search over the whole app —
      now finds it and stops calling it a gap.

      Recorded rather than quietly deleted, because it is the measurement's one real weakness: a
      short, generic value can be matched by an unrelated surface. It cannot produce a FALSE GAP,
      only miss a true one, which is the direction that fails safe — and this component still shows
      TWENTY-SEVEN absent values, so nothing about its verdict moved.

      (That figure read "twenty-six" until 2026-09-01 and the list has held twenty-seven throughout:
      a hand count written beside a list, which is the one thing this file exists to stop being
      trusted. `the transcript verdict states its own size` re-derives it now, so the two cannot
      disagree again.)
    */
    'pagination-info',
    'transcript-body',
    'loading-container',
    'spinner-border',
    'visually-hidden',
    'error-container',
    'pagination-controls-top',
    'fa-arrow-up',
    'fa-chevron-up',
    'fa-chevron-down',
    'fa-arrow-down',
    'loading-more',
    'empty-container',
    'pagination-controls-bottom',
    'spinner-border-sm',
    'transcript-entries',
    'transcript-entry',
    'entry-date',
    'entry-speaker'
  ],

  /*
    TWO — FLOWS DELIBERATELY OUT OF SCOPE.

    `app-session-login` carries the reference's whole account-management surface: forgot password,
    change password, a Gravatar/Gmail/Facebook avatar chooser, a reCAPTCHA, and a supported-browsers
    page. Account management in this system lives on the CONTROLLER, and the room's own login is a
    handoff. These are listed rather than excluded because "out of scope" is a decision that should be
    visible and re-decidable, not a filter that hides the surface.
  */
  /*
    FOUR LEFT THIS LIST ON 2026-09-01, AND THEY WERE NEVER PART OF THE FLOW THIS GROUP IS ABOUT.

    `top-50`, `start-50`, `translate-middle` and `ms-3` sat under "account management lives on the
    controller" with the forgot-password and avatar-chooser values, and they are not account
    management. They are consts 1 and 3 of `app-session-login`'s LOADING VIEW — the whole page while
    a sign-in is in flight:

    ```js
    template:function(i,o){ 1&i && H(0,gde,5,0,"div",0)(1,yue,39,2),
                            2&i && O(0, o.appService.globals.logginIn ? 0 : 1) }
    function gde(t,n){ 1&t && (d(0,"div",0)(1,"div",1),T(2,"i",2),d(3,"span",3),v(4,"Loading..."),u()()()) }
    ```

    Built, and it cost a branch that had been built backwards: the button's " Connecting " label
    (`mue`, const 110) came from `yue`, whose own gate on the SAME flag is at byte 1,187,265 — so the
    root swap has already replaced the form and that label is markup the reference ships and cannot
    paint. `session-login-loading-contract.test.ts` re-reads both gates.

    The mis-grouping is the lesson rather than the four values: a group whose heading is a DECISION
    ("out of scope") absorbs anything filed near it, and nobody re-reads a value that already has a
    reason. The heading below still describes the twenty-six that remain.
  */
  'app-session-login': [
    'col-md-2',
    'col-sm-10',
    'solid 1px #0a0a0a',
    'avatar-from-gmail-modal',
    'gmail-avatar',
    REDACTED,
    'avatar-from-facebook-modal',
    'facebook-avatar',
    'johndoe',
    '/public/images/supported_browsers.jpeg',
    'https://www.google.com/chrome',
    'https://www.mozilla.org/firefox/',
    'https://opera.com',
    'forgot-email',
    'recaptcha',
    'fa-paper-plane',
    'change-password',
    'Your new password',
    'addon-change-password',
    'repeat-password',
    'Type your new password again',
    'addon-repeat-password',
    'https://www.gravatar.com/avatar/your_email_address?d=mm',
    'Setup Avatar',
    'setup-avatar',
    /*
      `larger` LEFT this list on 2026-09-01, and NOT because it was built. It is a `font-size` VALUE
      — `[2,"text-decoration","underline","font-size","larger"]` at byte 1,208,985 — and the sweep
      asks one question of every value: does our source contain this string? On 2026-09-01 it started
      to, in `ScreenPaneStatus.svelte`'s ` click here for larger preview) `, which is the reference's
      own `W0e` text and has nothing to do with a login link's underline.

      A COLLISION, then, not a closure. It is the same shape as three others this repository has
      already paid for — `js` matching inside `json`, `pmToolbar` inside `pmToolbarZZ`, and a
      declaration assertion passing on the comment above it — and it is the one direction the
      limitation note further down does NOT cover: that note bounds the EXAMINED side, and this moves
      a residual to zero.

      It is left out of the list because the list is what the sweep measures and the sweep cannot
      measure this any more; `no residual left this list by prose collision` below is what replaces
      it, and it fails if we ever DO ship `font-size: larger` under a false name, or if the
      invitation text goes.
    */
    'non-presenter',
    'addon-forgot-email'
  ],

  /*
    `app-chat` and `app-extra-chat` were BOTH here with one residual each — `'Save chat messages'` —
    and both are fully covered since 2026-09-01. It was the `K_e` save control, and the note that
    held it recorded a blocker naming the reference's TRANSPORT rather than this room's capability:
    *"`downloadLogType` awaits `invokeServerCommand("getAllLog", …)`. There is no such command in
    this repository."* True, and beside the point — `getAllLog` is how the reference asks ITS server
    for history its page has never seen, and this room keeps that history itself.

    Left as a comment with no entries beneath it for the reason `app-screenshare-view`'s note is: a
    closed gap whose argument is deleted is a gap the next reader of the const table reopens.
  */
  /*
    THREE — BOOTSTRAP'S DATA API, AND FOURTEEN OF THESE ARE FALSE GAPS.

    Every `#`-prefixed value here is a `data-bs-target` or an `href`: the reference asks Bootstrap's
    JavaScript to find an element by id and toggle it.

    ## The correction, 2026-09-01: this note said these had "no counterpart" and that was WRONG

    It read *"the SELECTOR has no counterpart even where the pane it names is fully built"*. Fourteen
    of them have an exact counterpart in the rendered DOM, and the sweep cannot see it because the
    attribute is **composed at runtime**:

        data-bs-target="#{tabId}"    ModalHost.svelte, the session-control tab strip   (7 values)
        href="#{tabId}"              ModalHost.svelte, the streaming sub-tab strip     (3 values)
        href="#nav-{tabId}"          ModalHost.svelte, the user-info tab strip         (4 values)

    Each `{#each}` iterates a literal list of bare ids — `'reset-session'`, `'obs-streaming'`,
    `'info'` — so the browser receives `data-bs-target="#reset-session"` character for character. A
    SUBSTRING search over source cannot find a string the source never contains, and that is a
    limitation of the instrument, not a gap in the room.

    This matters beyond bookkeeping: read the old way, fourteen rows looked like work. They are not
    work, and `every #-prefixed residual with a composing site is emitted at runtime` below asserts
    the composing site for each of the fourteen rather than leaving this paragraph to be believed.

    ## What is genuinely absent, measured the same day

    `#recordings`, `#discord-settings` and `#navbarsExampleDefault` — three, not fourteen. Those name
    panes or bars this room does not build, and they are the only members of this group that are a
    statement about the room rather than about the sweep.

    The composed fourteen stay LISTED rather than excluded, because the sweep's rule is that it
    reports what it can and cannot see, and quietly dropping a row it cannot measure is how a
    coverage number stops meaning anything. The case below is what carries the truth.
  */
  /*
    Ten `data-bs-target`s, and three values that are not:

    - `streaming-link-playyer` (upstream's own typo) is the id of the readonly field in the Stream
      Player tab, read by `copyToClipboardPlayer()`. That whole feature is REFUSED at length in
      `ModalHost.svelte`: `playerURL` arrives from the reference's server, this room composes
      nothing, and the page it links to is an anonymous view of one room's screenshares — an
      authorization decision the root standard forbids inventing.
    - `audioID` and `videoID` are the `name` attributes on the two AV device selects. They are
      Angular's `ngModel` binding keys, not something the DOM needs; ours carry the ids and the
      `label for` (`AvDevicePane.svelte`), which is the half that does anything.
  */
  'app-session-control-modal': [
    '#reset-session',
    '#close-session',
    '#lock-session',
    '#av-device-selection',
    '#streaming-selection',
    '#obs-streaming',
    '#restream',
    '#stream-player',
    '#session-history',
    '#webinar-tools',
    'streaming-link-playyer',
    'audioID',
    'videoID'
  ],
  /*
    Four tab targets, and all four are the FALSE GAP group three now describes. The panes exist —
    `ModalHost.svelte` carries `id="nav-info"`, `id="nav-system"`, `id="nav-options"` and
    `id="nav-notes"` — and so do the selectors: `href="#nav-{tabId}"` over
    `[['info', …], ['system', …], ['options', …], ['notes', …]]` emits all four verbatim. The sweep
    reads source, the browser reads output, and here they disagree in the room's favour.

    (The fifth entry, `#all-user-pm-modal`, LEFT this list on 2026-09-01: consts 52 and 90 both carry
    it and the opener now does too.)
  */
  'app-user-info-modal': [
    '#nav-info',
    '#nav-system',
    '#nav-options',
    '#nav-notes',
    /*
      NOT a Bootstrap target and NOT ours to reproduce: the reference writes
      `value="followChatStyle.color"` as a STATIC attribute where a binding was meant, so every one of
      these five colour inputs ships with the literal text of an expression as its value. A defect in
      the original, deliberately not transcribed, and recorded here so nobody "fixes" the gap.
    */
    'followChatStyle.color',
    'followChatStyle.usernameColor',
    'followChatStyle.bgColor',
    'followChatStyle.tickerColor',
    'followChatStyle.fontSize'
  ],
  /*
    ── RE-MEASURED 2026-09-01, BECAUSE THE REASON WAS WRONG ABOUT OUR OWN CODE ──────────────────

    It read: *"This room's closed-session page is not a Bootstrap navbar with a collapsible menu, so
    the toggler has nothing to toggle."* Both clauses assume a closed-session page. **There isn't
    one.** `grep -rn closed-container src/` finds only this list, and there is no component, route or
    page state for a closed room anywhere in `apps/room`: `session/+page.server.ts:257` answers with
    `error(403, closedRoomMessage(shortCode))` and the presenter's sentence is delivered in an HTTP
    error body. `KickedPage.svelte` decoded the reference's five-way page switch and named this arm's
    counterpart as `CloseSessionPane` — which is the PRESENTER's editor for the message, not the page
    a member sees; that sentence is corrected there too.

    Upstream's is a whole page: `app-closed-session-page`, selector at byte **2,571,301**, running to
    `app-detached-screen` at **2,593,043** — the room shell repeated (navbar, sidebar, Connectivity
    Check, General Settings, Muted Users, Followed Users, Session Control, the mobile-app button)
    around one content const.

    All three stay residuals, and each now has its own measured reason rather than one shared guess:

    - **`#navbarsExampleDefault` / `navbarsExampleDefault`** — a Bootstrap collapse toggler and the id
      it targets, `["type","button","data-bs-toggle","collapse","data-bs-target","#navbarsExampleDefault",
      "aria-controls","navbarsExampleDefault","aria-expanded","false","aria-label","Toggle navigation",
      1,"navbar-toggler"]` at byte 2,571,858, paired with `["id","navbarsExampleDefault",1,"collapse",
      "navbar-collapse"]`. Bootstrap's data API is replaced by state throughout this room — the group
      three rows above says so for thirteen more of these — and it is the SELECTOR that has no
      counterpart, not the pane.

    - **`closed-container`** — `[1,"m-2","w-100","closed-container",3,"innerHTML"]`, byte 2,573,542,
      and it **styles nothing**. The captured stylesheet is 444,793 bytes and holds no rule for it;
      the only `closed` in the whole sheet is `.ui-icon-mail-closed`, a jQuery UI sprite offset. It is
      an `innerHTML` host hook, and this repository's standard forbids carrying a class no rule reads.
      The `innerHTML` is the second reason and the load-bearing one: upstream injects presenter-authored
      Summernote markup there, which is a stored-XSS primitive reaching every member who arrives at a
      closed room. `CloseSessionPane.svelte` records the divergence at the write end and
      `error-page-contract.test.ts` guards it at the read end.

    What DID come of the re-measurement is `src/routes/+error.svelte`, built the same day: this app
    had no error boundary at all, so the closed-room sentence — and 123 other refusals — rendered on
    SvelteKit's unstyled fallback. It uses `app-kicked-page`'s three captured consts, because that is
    the reference's own answer for "the room, replaced by a sentence saying why".
  */
  'app-closed-session-page': [
    '#navbarsExampleDefault',
    'navbarsExampleDefault',
    'closed-container'
  ],
  /*
    All three are `ariaLabelledBy` strings handed to `modalService.open(...)`, and all three are the
    same recorded divergence: these dialogs name themselves with `role="dialog"` plus an `aria-label`
    rather than pointing at a title element's id. `CarouselDialog.svelte` states it at the file
    browser (byte 1,477,226) and `note-file-browser-chrome-contract.test.ts` carries the measurement.
  */
  /*
    `carousel-modal-title` and `file-browser-modal-title` LEFT this list on 2026-09-01, transcribed
    with their `aria-labelledby` bindings. The reason they were absent — *"a literal document-unique
    id belongs to a component that is mounted once, and this one is mounted … in an editor that a
    room may hold more than one of"* — was false about this codebase: `NotesPane.svelte` mounts
    `NoteEditor` behind `editingNoteId === note.id`, a single value, and says *"a second instance
    could never be reached"*.

    `modal-basic-title` stays, and the difference is a measurement rather than a preference: it names
    the Giphy modal, and `GiphyPicker` is mounted at FOUR sites, so a literal id there really would
    appear four times in one document. It already carries an instance-suffixed `popoverId`.
    `note-editor-modal-labelling-contract.test.ts` asserts both mount counts.
  */
  'app-note': ['modal-basic-title'],

  /*
    FOUR — GAPS ON SURFACES THAT ARE OTHERWISE BUILT.

    This group was first written as "the work the sweep found", and checking it before saying so is
    what corrected it: **most of these are already argued somewhere in this repository**, in a
    docblock or a contract test, and the sweep rediscovered them rather than finding them. The case
    below measures that split rather than leaving it as a claim in a comment.

    `app-room` is the clearest instance, and it is the surface with the most audit behind it. It had
    SIX residuals when this was written and has FOUR, and the two that left are the reason this
    paragraph is worth re-reading rather than trusting:

    - the Intercom help link is `RNB-01` in `room-surface-audit-batch3-contract.test.ts` — a control
      whose gate nothing can turn on. `hasSTHelpLink` occurs three times in the whole bundle, and the
      only occurrence inside `app-room` sets it FALSE and never writes it again. Re-measured
      2026-09-01 and reclassified: since the gate is dead upstream too, **the reference's own room
      never renders this link**, so the DOMs agree and this is a FALSE GAP rather than a refusal;
    - **`nolevelsImg` and `/assets/images/notalking.png` are GONE from this list, and the refusal
      that held them here was WRONG.** It read: *"refused because `presenterTalking` is a live
      audio-activity signal from a server this room does not have; building the branch means an image
      that can never show or one that always shows."* Both halves were false. All ten occurrences of
      `presenterTalking` were read on 2026-09-01: it is initialised `!1` at bytes 1,114,654 and
      1,129,852 — so the reference's own default is the FLAT LINE this room was never drawing — and
      it is flipped by two payload-free room commands from the server's own switch at byte 1,014,971.
      `G08` is built; `NavbarTalkingIndicator.svelte` carries both arms.
    - `cssSoundCloudIcon` is a **FALSE GAP of the same family as group three**, re-measured
      2026-09-01. Const 176 declares `id` twice — `cssSoundCloudIcon` then `soundcloudDropdown` —
      and Angular's `setUpAttributes` keeps the SECOND, so the reference's rendered DOM carries
      `id="soundcloudDropdown"`, which is exactly what `NavbarSoundCloud.svelte` renders. Nothing is
      missing from the page; the value exists only in a const table this room has no equivalent of.
      It is doubly settled: Svelte refuses the duplicate outright —
      `ERROR "Attributes need to be unique" https://svelte.dev/e/attribute_duplicate` — the same
      compiler limit as `FollowChatStylePane`'s four colour inputs.
    - `/assets/images/playing.gif` is the one genuine blocker of the four, and it is an ASSET rather
      than a decision. The gif is not in this repository (`static/assets/images/` holds six files and
      that is not one of them) and it is not obtainable from the capture either — `docs/source-v4-
      2026-08-15/` is four files, JS + CSS + HTML, no images. Transcribing the path would render a
      broken image in the navbar on every play. Same case and same resolution as `benzinga-logo.png`.
      Unblocking it needs the asset, not a judgement.

    So the honest summary is not "zero false alarms" — it is that this surface's residuals have now
    survived a second reading, one refusal was overturned, and one was reclassified.
  */
  'app-room': [
    'https://intercom.help/simpler-trading/en/',
    'helpLink',
    'cssSoundCloudIcon',
    '/assets/images/playing.gif'
  ],
  /*
    The `RPT-*` refusal, enumerated as orphans in `alert-report-modal-contract.test.ts`. Fifteen when
    this table was written and twelve now: `search-addon`, `Enter search term` and `btn-ligth` are
    shared with the two log modals, and building the archived-log viewer shipped all three.
  */
  'app-alert-send-report-modal': [
    'report-header-container',
    'report-header',
    'pie-container',
    'search-select-addon',
    'Search select',
    'queued',
    'clear-search-addon',
    'report-body',
    'sent-time',
    'failed-reason',
    'fa-clock',
    'fa-exclamation-circle'
  ],
  /*
    TRACED VALUE BY VALUE ON 2026-08-31, and none of the seven is work. Written out because the group
    heading above would otherwise read them as unfinished, which is what the heading itself got wrong.

    - `#scheduledAlertsModal` WAS group three, a `data-bs-target`; it left this list on 2026-09-01
      when `XTe`'s "See Scheduled Alerts" control was transcribed with its pair.
    - `alert-text-label` is the id of the "Text this out?" checkbox (`VTe`, byte 2,118,282, model
      `sendText`) and `alert-dont-cross-post-label` is "Don't cross post to linked alert rooms"
      (`WTe`, byte 2,119,672, model `dontCrossPost`). Both are in `direct-evidence-contract.ts`'s
      `hiddenCapabilityBranches`: no capture this repository holds ever rendered either, and the
      features behind them — Twilio SMS and the linked-room fan-out — are both blocked outright.
    - `sendLaterAsEmail` and `sendLaterAsNick` are `PAM-10`'s REFUSAL, argued in
      `ScheduledAlerts.svelte`: upstream's form lets a presenter post an alert under someone else's
      name and address, so those two fields are not on the wire here and the server derives the
      sender from the session.
    - `alert-send-later-time` and `ignoreWeekendsChk` **LEFT this list on 2026-09-01, and the reason
      that held them here was a preference rather than an impossibility.** It read: *"ids this room
      does not need. Upstream pairs each control with a separate `<label for>`; ours WRAPS the input
      in its label … a better association, not a missing one."* Both associations are valid and the
      wrap is arguably the more robust — but the decision is to match the dump wherever matching is
      POSSIBLE, not wherever it is preferable, and it was possible: `PostAlertModal` is mounted at one
      site behind `name === 'alert'`, so both ids are document-unique exactly as they are upstream.

      Same measurement, same day, as the two note-modal titles — and the same one that keeps the
      Giphy modal's `modal-basic-title` out, because that picker is mounted four times.
  */
  'app-post-alert-modal': [
    'alert-text-label',
    'alert-dont-cross-post-label',
    'sendLaterAsEmail',
    'sendLaterAsNick'
  ],
  /* `recordings` is the archive tab — blocked on an archive service, and recorded as such. */
  'app-presentationarea': ['recordings', 'recordings-tab', '#recordings', 'fa-file-video'],
  /*
    `discord-settings` is the Discord-registration blocker.

    The two `presenterStyle.` are the SAME upstream defect as `app-user-info-modal`'s five, and since
    2026-09-01 that is a reading rather than a cross-reference — `the seven <expression>-as-a-value
    residuals are an UPSTREAM DEFECT` below reads each const whole from the pinned bundle, including
    the `3,"ngModelChange","ngModel"` tail that makes it a defect rather than a choice: the binding is
    there, beside the literal it was meant to replace.

    ```js
    ["type","color","name","presenter-text-color","value","presenterStyle.color",
     "id","presenter-text-color",1,"form-check-input",3,"ngModelChange","ngModel"]   // byte 2,274,009
    ["type","color","name","presenter-bg-color","value","presenterStyle.bgColor",
     "id","presenter-bg-color",1,"form-check-input",3,"ngModelChange","ngModel"]     // byte 2,274,230
    ```

    (Both offsets are the START OF THE CONST, not the position of the value string inside it — 55 and
    53 bytes later respectively. Seven citations in this repository were off by exactly that kind of
    difference before they were re-measured on 2026-09-01.)

    The FEATURE is built here — `routes/presenter-colors.remote.ts` and `presenter-colors-contract`
    cover `savePresenterColors`, whose payload the reference builds at byte 2,243,603. What is not
    reproduced is a colour input shipping the text `presenterStyle.color` as its value.
  */
  'app-user-settings-modal': [
    'discord-settings',
    'discord-settings-tab',
    '#discord-settings',
    'presenterStyle.color',
    'presenterStyle.bgColor'
  ],
  /*
    `ACA-06` in `ChatSearchBar.svelte`: the chat toolbar's save control is `K_e` at byte 1,421,929 and
    is not built, while the ALERTS column's twin is (`AlertChatArea.svelte`, "Save alerts messages").
    Nothing stands in for it, which is deliberate — an empty toolbar section is a control whose only
    effect is its own presence.
  */
  /*
    The id and class of the `<video>` inside the reference's IN-PAGE preview card. This room's
    preview is a separate WINDOW, argued in `room/recording.ts`: upstream points its card at a
    server-supplied `recPreviewLocation`, there is no such URL here, and the window shows the local
    recording instead. No card, so no element to carry either name.
  */
  'app-rec-preview': ['recScreenLocalPreview', 'recPreviewScreen']
  /*
    `fullScreen()` is the value of `data-ng-dblclick` — an ANGULARJS 1 attribute left in an Angular 17
    template. No runtime in the reference reads it and the browser does not either, because the
    attribute is not `ondblclick`. Dead in the original; correctly dead here.
  */
  /*
    `app-screenshare-view` used to sit here with `['#ffcc00']` and is FULLY COVERED since 2026-09-01.

    That colour is the inline style on `W0e`, the local-preview invitation, and this entry read:
    *"`SP2-04` records the measurement that it cannot be reached in this application"*. The
    measurement was of a choice this room had made — `#addLocalScreen` attached our own capture
    eagerly, which is what made `isPresentingThisScreen && !localpreview` unreachable — and then read
    that choice back as a property of the reference. Upstream's default is the invitation.

    Node 3 is built; `screen-pane-contract.test.ts`'s `SP2-04` block holds the five readings of
    `localpreview` and the three writers of `isConnected` that decide it. Left as a comment with no
    entry beneath it, deliberately: a closed gap whose argument is deleted is a gap that gets
    reopened by the next reader of the const table.
  */
};

describe('the sweep is reading the bundle it claims to read', () => {
  it('is the pinned v4 bundle, by byte length', () => {
    expect(Buffer.byteLength(BUNDLE)).toBe(2_891_205);
  });

  it('found every component the bundle declares, and parsed every const table', () => {
    /*
      Exact, not a floor: the bundle is pinned, so this number cannot move unless the bundle does. A
      parse failure would silently drop a component from the sweep — `sweep` throws instead.
    */
    expect(ROWS).toHaveLength(51);
  });

  it('and the exclusions it applies were derived from that bundle, not written by hand', () => {
    for (const name of ['ngForOf', 'ngModel', 'formControlName', 'ngbDropdownMenu', 'scUrl'])
      expect(API, `${name} is Angular API and must be excluded`).toContain(name);
    /* A value that is NOT framework machinery must survive, or the exclusion is eating the subject. */
    expect(API).not.toContain('emojiPanelDiv');
    expect(API).not.toContain('transcript-container');
  });
});

describe('coverage of the reference const tables', () => {
  it('names every value this room does not ship, and nothing it does', () => {
    const measured = Object.fromEntries(
      ROWS.filter((row) => row.residuals.length > 0).map((row) => [row.component, row.residuals])
    );
    expect(
      measured,
      'a value appearing here that is not in RESIDUALS means this room lost something the ' +
        'reference renders; a RESIDUALS entry that is not here means the gap was closed and the ' +
        'table was not shrunk'
    ).toEqual(RESIDUALS);
  });

  it('holds the ratchet: thirty-nine components fully covered, one hundred and eleven values not', () => {
    /*
      Both totals are derived from the table above, so this case cannot disagree with it — it exists
      to state the two numbers in words a reader can find, and to fail loudly on the day somebody
      edits the table without knowing which way they moved it.
    */
    const residuals = ROWS.reduce((total, row) => total + row.residuals.length, 0);
    expect(ROWS.filter((row) => row.residuals.length === 0)).toHaveLength(39);
    /*
      115 -> 111 on 2026-09-01. The four are `app-session-login`'s loading view — consts 1 and 3 of
      the root swap, built, with the reason recorded at that entry. The ratchet only goes down.
    */
    expect(residuals).toBe(111);
  });

  it('every #-prefixed residual with a composing site is emitted at runtime', () => {
    /*
      THE CASE THAT MAKES GROUP THREE'S CORRECTION CHECKABLE RATHER THAN BELIEVED.

      Fourteen `#`-prefixed residuals are FALSE GAPS: the room emits the exact string, built at
      runtime from a bare id in an `{#each}` list. A substring sweep over source cannot see a string
      the source never contains. That was recorded as prose until 2026-09-01, and prose is what goes
      stale — group three's previous paragraph asserted the opposite for two weeks.

      So each one is proved from the source rather than asserted: find the composing ATTRIBUTE, find
      the `{#each}` list that feeds it, and require the bare id to be in that list. Both halves are
      needed. The attribute alone would pass on a strip iterating something else entirely; the list
      alone would pass on a list that no longer drives any `href` or `data-bs-target`.
    */
    const MODAL_HOST = readFileSync(
      new URL('./components/ModalHost.svelte', import.meta.url),
      'utf8'
    );

    /** The `{#each [...] as [tabId, label] (tabId)}` list nearest ABOVE a composing attribute. */
    const listDriving = (attribute: string): string => {
      const at = MODAL_HOST.indexOf(attribute);
      expect(at, `\`${attribute}\` is not in ModalHost.svelte`).toBeGreaterThan(-1);
      const opened = MODAL_HOST.lastIndexOf('{#each [', at);
      expect(opened, `no {#each} above \`${attribute}\``).toBeGreaterThan(-1);
      return MODAL_HOST.slice(opened, at);
    };

    const COMPOSED: readonly { attribute: string; ids: readonly string[] }[] = [
      {
        attribute: 'data-bs-target="#{tabId}"',
        ids: [
          'reset-session',
          'close-session',
          'lock-session',
          'av-device-selection',
          'streaming-selection',
          'session-history',
          'webinar-tools'
        ]
      },
      { attribute: 'href="#{tabId}"', ids: ['obs-streaming', 'restream', 'stream-player'] },
      { attribute: 'href="#nav-{tabId}"', ids: ['info', 'system', 'options', 'notes'] }
    ];

    /* Fourteen, and the count is asserted so a deleted entry cannot quietly weaken the claim. */
    expect(COMPOSED.reduce((total, entry) => total + entry.ids.length, 0)).toBe(14);

    for (const { attribute, ids } of COMPOSED) {
      const list = listDriving(attribute);
      for (const id of ids)
        expect(list, `\`${id}\` must be in the {#each} that drives \`${attribute}\``).toContain(
          `'${id}'`
        );
    }

    /*
      And the other half of the correction: exactly THREE `#`-prefixed residuals are real. Derived
      from the table rather than listed twice, so closing one of them fails here until this is
      updated — which is the point, because these three ARE work and the fourteen are not.
    */
    /*
      SELECTOR-shaped, which is not the same as `#`-prefixed — and writing this check is what found
      the difference. The first version filtered on `startsWith('#')` and caught `#ffcc00`, the
      inline colour on `W0e` recorded four entries below. A hex colour is not a Bootstrap target and
      has nothing to do with this correction, so the shape is required rather than the prefix.
    */
    const hashResiduals = ROWS.flatMap((row) => row.residuals).filter(
      (value) => /^#[a-z][\w-]*$/i.test(value) && !/^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value)
    );
    const composedValues = new Set([
      ...COMPOSED[0].ids.map((id) => `#${id}`),
      ...COMPOSED[1].ids.map((id) => `#${id}`),
      ...COMPOSED[2].ids.map((id) => `#nav-${id}`)
    ]);
    expect(hashResiduals.filter((value) => !composedValues.has(value)).sort()).toEqual([
      '#discord-settings',
      '#navbarsExampleDefault',
      '#recordings'
    ]);
  });

  it('the seven `<expression>-as-a-value` residuals are an UPSTREAM DEFECT, read from the bundle', () => {
    /*
      ── PROSE TURNED INTO A READING, 2026-09-01 ──────────────────────────────────────────────────

      Seven residuals across two components are the same mistake in the reference, and until now that
      was recorded twice in prose — five under `app-user-info-modal` as *"a defect in the original,
      deliberately not transcribed"*, and two under `app-user-settings-modal` as *"group three's
      defect again"*. The second is doing a lot of work in four words, and neither could be checked.

      The defect: a `<input type="color">` is given BOTH a static `value` attribute holding the text
      of an expression AND the `ngModel` binding that was meant to fill it. Angular's compiler puts
      the literal in the const table, so the control ships with `followChatStyle.color` — the source
      text — as its DOM value until the binding runs.

      Both halves are read here. If the reference ever turns out to bind these properly, this case
      goes red and the seven stop being a refusal.
    */
    const STATIC_VALUE_DEFECT: readonly { readonly value: string; readonly name: string }[] = [
      { value: 'followChatStyle.color', name: 'follow-chat-text-color' },
      { value: 'followChatStyle.usernameColor', name: 'follow-chat-username-color' },
      { value: 'followChatStyle.bgColor', name: 'follow-chat-bg-color' },
      { value: 'followChatStyle.tickerColor', name: 'follow-chat-ticker-color' },
      { value: 'presenterStyle.color', name: 'presenter-text-color' },
      { value: 'presenterStyle.bgColor', name: 'presenter-bg-color' }
    ];

    for (const { value, name } of STATIC_VALUE_DEFECT) {
      /*
        The whole const, in order, so this cannot pass on the two strings happening to co-occur. The
        `3,"ngModelChange","ngModel"` tail is the half that makes it a defect rather than a choice:
        the binding IS there, beside the literal it was supposed to replace.
      */
      expect(
        BUNDLE,
        `\`${value}\` must still be a static value= beside its own ngModel binding`
      ).toContain(
        `["type","color","name","${name}","value","${value}","id","${name}",` +
          '1,"form-check-input",3,"ngModelChange","ngModel"]'
      );
    }

    /*
      `followChatStyle.fontSize` is the seventh and it is NOT this shape — it is a `range`, not a
      colour — so it is asserted separately rather than bent into the list. Getting this wrong in the
      other direction (asserting six as seven) is how a table starts describing itself.
    */
    expect(STATIC_VALUE_DEFECT).toHaveLength(6);
    expect(BUNDLE).toContain('"value","followChatStyle.fontSize"');

    /* And every one of the seven is still recorded as a residual rather than quietly transcribed. */
    const declared = new Set(Object.values(RESIDUALS).flat());
    for (const { value } of STATIC_VALUE_DEFECT) expect(declared).toContain(value);
    expect(declared).toContain('followChatStyle.fontSize');
  });

  it('the transcript verdict states its own size', () => {
    /*
      The one place in this file where a count is written in PROSE beside the list it counts, because
      the paragraph's argument depends on it — "nothing in this repository renders a transcript list"
      is a claim about how many of the component's values are absent, and the number was wrong by one
      from 2026-08-31 to 2026-09-01.

      Both spellings are read, because the paragraph uses the word and the header uses it too. If a
      value is built or added, this fails until the prose is corrected rather than after somebody
      notices.
    */
    const listed = RESIDUALS['app-session-transcript'];
    expect(listed).toHaveLength(27);
    /*
      Bounded to the RESIDUALS block — from group one's heading to the end of the transcript list —
      and the bound is the assertion. This case's own body says the wrong spelling out loud in order
      to refuse it, so a search over the whole file would find the refusal and call it the defect.
      Seventh time this session a check's subject matched the prose recording it.
    */
    const source = readFileSync('src/lib/reference-const-coverage-contract.test.ts', 'utf8');
    const opened = source.indexOf('ONE — SURFACES THIS ROOM HAS NOT BUILT AT ALL');
    expect(opened, "group one's heading must be findable").toBeGreaterThan(-1);
    const listed_at = source.indexOf("'app-session-transcript': [", opened);
    expect(listed_at, 'the transcript list must be findable').toBeGreaterThan(-1);
    const closed = source.indexOf('\n  ],', listed_at);
    expect(closed, 'the transcript list must be closed').toBeGreaterThan(-1);
    const paragraph = source.slice(opened, closed);
    expect(paragraph).toContain('eighty values, twenty-seven of');
    expect(paragraph).toContain('TWENTY-SEVEN absent values');
    expect(paragraph).not.toContain('twenty-six absent');
  });

  it('and the surfaces audited by hand this week are among the covered', () => {
    /*
      `PollPanel`'s single divergence is recorded above, so it is not in this list. The roster and the
      private-chat panel are, and their by-hand audits and this sweep agree — which is the evidence
      that the sweep implements the same method those audits used.
    */
    const covered = ROWS.filter((row) => row.residuals.length === 0).map((row) => row.component);
    expect(covered).toContain('app-privchat');
    expect(covered).toContain('app-roomscroller');
    expect(covered).toContain('app-reply-modal');
    expect(covered).toContain('app-alert-qa-modal');
  });
});

describe('how much of the gap has already been written about', () => {
  /*
    A residual is a value the room does not RENDER. It is a separate question whether anybody here has
    ever looked at it — and the two answers want different work. A value named in a docblock or a
    contract test has been examined and refused or deferred, with a reason on record; a value named
    nowhere has not been looked at by anyone.

    LIMITATION, stated because it bounds every number below: this is a substring search over the whole
    repository, so a short generic value (`spinner-border`, `visually-hidden`) can be counted as
    examined because it occurs incidentally in unrelated prose. It over-counts the examined side. It
    cannot over-count the UNEXAMINED side, which is the side that means work, so the 86 below is a
    floor.
  */
  const mentioned = (value: string): boolean => value !== REDACTED && REPOSITORY.includes(value);
  const all = ROWS.flatMap((row) => row.residuals);

  /*
    29/86 -> 30/85 on 2026-09-01, and the ONE value that moved is worth naming because the mechanism
    looks like a bug and is not: `closed-container` became examined the moment the re-measurement
    above wrote its reason down. That is precisely what `mentioned` is defined to mean — *"a value
    named in a docblock or a contract test has been examined and refused or deferred, with a reason
    on record"* — so a value crossing this line as a result of being reasoned about is the split
    working, not the split being gamed.

    The distinction that keeps it honest: writing a reason moves a value from UNEXAMINED to EXAMINED;
    nothing anybody writes moves it out of `all`. Only rendering the value does that, and rendering is
    measured against stripped source. The two siblings (`#navbarsExampleDefault` and the bare id) did
    NOT move, because the reason they already carried named them literally.
  */
  it('splits the 111 into what is on record and what nobody has looked at', () => {
    expect(all).toHaveLength(111);
    expect(all.filter(mentioned)).toHaveLength(30);
    /*
      85 -> 81 on 2026-09-01, and the whole move is on the UNEXAMINED side, which is the side that
      means work: the four were `app-session-login`'s loading view and they left `all` by being
      BUILT, not by being written about. Compare the 29 -> 30 move recorded above, which was one
      value crossing from unexamined to examined because a reason was finally written for it. Both
      are legitimate and they are not the same event, so both are recorded.
    */
    expect(all.filter((value) => !mentioned(value))).toHaveLength(81);
  });

  it('and app-room, the most audited surface here, has NO unexamined residual', () => {
    /*
      The claim the group-four note makes, asserted rather than written down. A sweep that produced
      false alarms would produce them here first, on the surface that has been read hardest.

      SIX until 2026-09-01 and four now: `nolevelsImg` and `/assets/images/notalking.png` left when
      `G08` was BUILT rather than refused, which is the correction that started the re-reading of
      every entry in this file.
    */
    const room = ROWS.find((row) => row.component === 'app-room');
    expect(room?.residuals).toHaveLength(4);
    expect(room?.residuals.filter((value) => !mentioned(value))).toEqual([]);
  });

  it('and none of app-room s four is a DIVERGENCE — three are false gaps, one is a missing asset', () => {
    /*
      THE STRONGER STATEMENT, and the one the owner's "match the dump exactly" asks for. "Recorded
      refusal" was the old framing and it was too weak in three of four cases: a refusal says *we
      chose differently from the reference*. Re-measured on 2026-09-01, three of these four are
      cases where the reference's own rendered DOM and ours AGREE, and the value exists only in a
      const table this room has no equivalent of.

      - `https://intercom.help/simpler-trading/en/` and `helpLink` — `RNB-01`. The gate is
        `O(9, e.hasSTHelpLink ? 9 : -1)`, and `hasSTHelpLink` occurs three times in 2,891,205 bytes:
        `!0` in the LOGIN component's constructor, `!1` in `app-room`'s, and this read. `app-room`'s
        class body contains no `Object.assign(this`, no `for…in`, no computed `this[x] =`, and its
        only three `Object.keys` calls are webcam bookkeeping — all four checked by search on
        2026-09-01. So the field is initialised false and never written, and **upstream's own room
        never renders this link either**. `room-surface-audit-batch3-contract.test.ts` holds the
        measurement and its passing control (`isTipEnabled`, same constructor, IS assigned).
      - `cssSoundCloudIcon` — const 176 declares `id` twice and Angular keeps the second, so both
        DOMs carry `id="soundcloudDropdown"`. `navbar-decoded-rows-contract.test.ts`.
      - `/assets/images/playing.gif` — the ONE that is genuinely absent here, and it is an ASSET
        rather than a decision: it is not in `static/assets/images/` and the capture cannot supply
        it, because `docs/source-v4-2026-08-15/` is four files — JS, CSS, HTML, checksums — and no
        images. Unblocking needs the file, not a judgement.

      Asserted as a PARTITION rather than as prose, so a fifth residual arriving on this surface
      cannot be waved through by a paragraph written about four others.
    */
    const room = ROWS.find((row) => row.component === 'app-room');
    const FALSE_GAPS = [
      'https://intercom.help/simpler-trading/en/',
      'helpLink',
      'cssSoundCloudIcon'
    ];
    const ASSET_BLOCKED = ['/assets/images/playing.gif'];
    expect([...(room?.residuals ?? [])].sort()).toEqual([...FALSE_GAPS, ...ASSET_BLOCKED].sort());

    /* And the asset really is absent, read rather than assumed — both halves of the claim. */
    const images = globSync('static/assets/images/*');
    expect(
      images.length,
      'the directory must exist for its emptiness to mean anything'
    ).toBeGreaterThan(0);
    expect(images.some((path) => path.endsWith('playing.gif'))).toBe(false);
    expect(globSync('docs/source-v4-2026-08-15/*.{gif,png,jpg,jpeg,svg,webp}')).toEqual([]);
  });
});

describe('a residual that leaves this table must leave it for a reason', () => {
  it('no residual left by prose collision — `larger` is the one that did, and it is guarded', () => {
    /*
      THE CASE THAT REPLACES A ROW, and it exists because the sweep's rule is `ours.includes(value)`,
      which cannot tell a rendered value from an English word.

      `larger` is a `font-size` value on `app-session-login`
      (`[2,"text-decoration","underline","font-size","larger"]`, byte 1,208,985). It stopped being a
      residual on 2026-09-01 because `ScreenPaneStatus.svelte` started saying ` click here for larger
      preview) ` — the reference's own `W0e` text, about a different surface entirely.

      Both halves are asserted, because either one going alone would make the record wrong:

        the collision is REAL          our source says `larger`, in the invitation and nowhere else
        the feature is still MISSING   we do not ship `font-size: larger` anywhere

      If the invitation text is ever reworded, the collision ends and `larger` returns to the table
      above — and this case failing is how anyone finds that out.
    */
    const status = readFileSync(
      new URL('./components/ScreenPaneStatus.svelte', import.meta.url),
      'utf8'
    );
    expect(status).toContain("{' click here for larger preview) '}");

    /* And nothing here actually renders the declaration the const table is about. */
    const declaration = /font-size\s*:\s*larger/;
    const offenders = globSync('src/**/*.{svelte,ts,css}')
      .filter((path) => !path.includes('reference-const-coverage'))
      .filter((path) => declaration.test(readFileSync(path, 'utf8')));
    expect(
      offenders,
      'if this room ever ships `font-size: larger`, the residual is genuinely closed and the note ' +
        'above is what needs deleting — not this case'
    ).toEqual([]);
  });
});

describe('the comment stripping is load-bearing', () => {
  it('measures strictly more gaps than a raw-text search does', () => {
    /*
      THE NEGATIVE CONTROL, RUN ON EVERY INVOCATION RATHER THAN ONCE BY HAND.

      Read our source WITHOUT stripping comments and the sweep reports fewer gaps, because this
      repository's docblocks quote the reference by value constantly. If these two ever agree, either
      the stripping stopped working or the house style did — and in both cases every number above
      becomes a claim about prose.
    */
    const raw = RAW_ROWS.reduce((total, row) => total + row.residuals.length, 0);
    const stripped = ROWS.reduce((total, row) => total + row.residuals.length, 0);
    expect(raw).toBeLessThan(stripped);
    /*
      19 -> 20 on 2026-09-01. The twentieth is `closed-container`: the `app-closed-session-page`
      re-measurement quotes the const it belongs to, so an UNSTRIPPED read of our source now finds
      that string in a docblock and calls the gap closed. Which is the exact failure this case
      exists to prove is still being avoided — the gap is open, and only the stripped read says so.
    */
    expect(stripped - raw).toBe(20);
  });
});
