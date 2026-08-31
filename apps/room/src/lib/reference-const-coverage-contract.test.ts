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

/** Every shipping source file, comments stripped. See the module note. */
const readOurs = (strip: boolean): string =>
  globSync('src/**/*.{svelte,ts}')
    .filter((path) => !path.includes('.test.'))
    .map((path) => {
      const source = readFileSync(path, 'utf8');
      return strip ? codeOf(path, source) : source;
    })
    .join('\n');

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

    `app-session-transcript` is the clearest result the sweep produced: eighty values, twenty-eight of
    them absent, and the absent ones are the whole component — its container, its header, its date
    picker, its pagination and its entries. Nothing in this repository renders a transcript list. It
    is named in no tracker row, and it was found by measurement rather than by reading.
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
    'Clear search',
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
  'app-session-login': [
    'top-50',
    'start-50',
    'translate-middle',
    'ms-3',
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
    'larger',
    'non-presenter',
    'addon-forgot-email'
  ],

  /*
    THREE — BOOTSTRAP'S DATA API, WHICH THIS ROOM REPLACED WITH STATE.

    Every `#`-prefixed value here is a `data-bs-target`: the reference asks Bootstrap's JavaScript to
    find an element by id and toggle it. This room decides which pane is showing in Svelte state, so
    the SELECTOR has no counterpart even where the pane it names is fully built. `#reset-session`,
    `#close-session` and `#lock-session` all name panes that exist here.

    They stay listed rather than excluded for the same reason as group two, and because the id itself
    sometimes IS still needed — `app-closed-session-page` shows both halves, the target and the bare
    `navbarsExampleDefault` the reference also writes into `aria-controls`.
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
  'app-user-info-modal': [
    '#nav-info',
    '#all-user-pm-modal',
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
  'app-closed-session-page': [
    '#navbarsExampleDefault',
    'navbarsExampleDefault',
    'closed-container'
  ],
  'app-note': ['carousel-modal-title', 'file-browser-modal-title', 'modal-basic-title'],

  /*
    FOUR — REAL GAPS ON SURFACES THAT ARE OTHERWISE BUILT. This is the work the sweep found.

    `app-room`'s six are the roster and the navbar: a help link to the vendor's Intercom, the
    not-talking indicator's image and id, and the SoundCloud icon's id and playing gif. Four of the
    six are ASSETS that a built feature draws and this room does not.
  */
  'app-room': [
    'https://intercom.help/simpler-trading/en/',
    'helpLink',
    'nolevelsImg',
    '/assets/images/notalking.png',
    'cssSoundCloudIcon',
    '/assets/images/playing.gif'
  ],
  'app-alert-send-report-modal': [
    'report-header-container',
    'report-header',
    'pie-container',
    'search-select-addon',
    'Search select',
    'queued',
    'search-addon',
    'Enter search term',
    'clear-search-addon',
    'btn-ligth',
    'report-body',
    'sent-time',
    'failed-reason',
    'fa-clock',
    'fa-exclamation-circle'
  ],
  'app-post-alert-modal': [
    '#scheduledAlertsModal',
    'alert-text-label',
    'alert-dont-cross-post-label',
    'alert-send-later-time',
    'sendLaterAsEmail',
    'sendLaterAsNick',
    'ignoreWeekendsChk'
  ],
  /* The two log modals are the same component twice over, and their residuals agree exactly. */
  'app-chat-logs-modal': [
    'log-header-container',
    'log-header',
    'search-addon',
    'Enter search term',
    'btn-ligth',
    'fa-box-open'
  ],
  'app-alert-logs-modal': [
    'log-header-container',
    'log-header',
    'search-addon',
    'Enter search term',
    'btn-ligth',
    'fa-box-open'
  ],
  /* `recordings` is the archive tab — blocked on an archive service, and recorded as such. */
  'app-presentationarea': [
    'recordings',
    'recordings-tab',
    '#recordings',
    'fa-file-video',
    'This is the default screen users are taken to right now. If you are a presenter and talking whichever screen you select will be forced on others. You can also select a specific screen and click the gear icon on this tab to force everyone to watch that screen.'
  ],
  /* `discord-settings` is the Discord-registration blocker; the two `presenterStyle.` are group three's defect again. */
  'app-user-settings-modal': [
    'discord-settings',
    'discord-settings-tab',
    '#discord-settings',
    'presenterStyle.color',
    'presenterStyle.bgColor'
  ],
  'app-chat': ['Save chat messages'],
  'app-extra-chat': ['Save chat messages'],
  'app-rec-preview': ['recScreenLocalPreview', 'recPreviewScreen'],
  /*
    `fullScreen()` is the value of `data-ng-dblclick` — an ANGULARJS 1 attribute left in an Angular 17
    template. No runtime in the reference reads it and the browser does not either, because the
    attribute is not `ondblclick`. Dead in the original; correctly dead here.
  */
  'app-screenshare-view': ['#ffcc00', 'fullScreen()'],
  /* Already recorded in `poll-panel-v4-contract.test.ts`: ours is `/assets/…`, served from `static/`. */
  'app-poll-modal': ['../../assets/images/ajax-loader.gif']
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

  it('holds the ratchet: thirty-three components fully covered, one hundred and forty-six values not', () => {
    /*
      Both totals are derived from the table above, so this case cannot disagree with it — it exists
      to state the two numbers in words a reader can find, and to fail loudly on the day somebody
      edits the table without knowing which way they moved it.
    */
    const residuals = ROWS.reduce((total, row) => total + row.residuals.length, 0);
    expect(ROWS.filter((row) => row.residuals.length === 0)).toHaveLength(33);
    expect(residuals).toBe(146);
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
    expect(stripped - raw).toBe(24);
  });
});
