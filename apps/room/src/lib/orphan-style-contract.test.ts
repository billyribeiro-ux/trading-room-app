import { globSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

/**
 * EVERY CLASS `app.css` STYLES IS WORN BY SOMETHING, OR SAYS WHY IT IS NOT.
 *
 * ## The rule, and why it needed a gate
 *
 * `CLAUDE.md`: *"Nothing exists without a consumer… No `.flipped` class with no CSS."* The inverse is
 * the same defect and is harder to see — CSS for a class no element wears. It compiles, it lints, it
 * type-checks, and it is invisible to every other gate here.
 *
 * It also hides real work. `.debug-area` sat in this file with TWO rules and no wearer for the whole
 * port; it turned out to be the captured class for the Debug Log textarea, and the reason it had no
 * wearer was that the FEATURE was not built. Finding it was luck. This makes it arithmetic.
 *
 * ## Measured 2026-08-29: 200 class selectors, 29 with no wearer — now 4
 *
 * The catalog started at 29, split by whether the reference's own stylesheet had the class. The
 * fifteen this repository INVENTED were deleted outright: panel-layout names from before the page
 * was decomposed, styling nothing and never going to. The other fourteen were captured, and that
 * flag was read as *"the rule is waiting for markup"* — a feature to build.
 *
 * **Ten have since left, and they left in four different ways.** Each is worth more than the entry
 * it removed, because each is a way this gate could answer wrongly:
 *
 * 1. **BUILT** — `remove-profile-picture-btn`, then `edit-user-avatar-options`. The list turned red
 *    the moment each gained markup, and deleting the entry is the declaration that it is done, the
 *    shape `INERT_ACTIONS` uses.
 * 2. **WORN BY AN INTERPOLATION** — the five `mic-status-*`, a surface reported as entirely missing
 *    while it was fully built. See `isWornByInterpolation`.
 * 3. **WORN AS A CLSX OBJECT KEY** — `mid`, on the mic level bar eleven lines from those five. See
 *    `isWornAsClassKey`.
 * 4. **NEVER A SURFACE AT ALL** — `chat-stars` and `tagline`. The reference styles both and renders
 *    neither, in v3 or v4; the premise that a captured rule implies captured markup was simply
 *    false. `renderedUpstream` measures it now, and both rules are gone from `app.css`.
 *
 * Three of those four are the gate reporting work that did not exist. That is the expensive
 * direction — the answer LOOKS like work — and it is why every claim this file makes is now
 * measured against the pinned bundle rather than inferred from a stylesheet.
 *
 * ## What this refuses
 *
 * A THIRTIETH. Any class added to `app.css` that nothing wears fails here, which is the point: the
 * cost of a new orphan is now a failing test rather than a discovery three months later.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * The remaining orphans, each with why it has no wearer AND whether the reference renders it.
 *
 * ## `captured` was doing two jobs, and one of them was wrong
 *
 * It means one thing only: the class is in a stylesheet this repository captured. It was being READ
 * as a second thing — *"the rule is waiting for markup, so the feature is unbuilt"* — and row AJ of
 * `TODO.md` carried two entries upward on exactly that reading.
 *
 * The inference does not hold, because **a stylesheet can carry a rule the application never
 * renders**. That is the very defect this file exists to catch, and there was no reason to assume
 * the reference was free of it. It is not: measured against the pinned v4 bundle, FOUR of the seven
 * entries below are styled by the reference and rendered by nothing in it.
 *
 * `renderedUpstream` is that measurement, and it is asserted rather than asserted-about — see
 * `tells the truth about which orphans the reference actually renders`. It is what makes an entry
 * actionable:
 *
 * | captured | renderedUpstream | what the entry IS |
 * | --- | --- | --- |
 * | `true` | `true` | a REFERENCE SURFACE this room has not built — work, with a const index |
 * | `true` | `false` | dead CSS upstream as well as here — carried, never a feature |
 * | `false` | `false` | invented here; nothing will ever wear it |
 *
 * `captured: false, renderedUpstream: true` is impossible by construction and is refused below.
 */
const ORPHANS: Record<string, { captured: boolean; renderedUpstream: boolean; why: string }> = {
  /*
    ── Captured and rendered by NOTHING, upstream or here ──

    THE "UNBUILT SURFACE" HALF OF THIS CATALOG IS EMPTY. `smallAvatarImg` was the only entry
    measured as both captured and rendered upstream, and it left the same day it was named: const 98
    of `app-user-info-modal` is the avatar on a row of the per-member ADMIN NOTES list, `fTe` @ byte
    2,064,959, and this room rendered that tab's password prompt and nothing behind it. Built as
    `UserNotesPane.svelte` with `user_notes` under it. Every rule below is carried, not pending.
  */
  // ── Captured and rendered by NOTHING, upstream or here: carried rules, not pending features ──
  'sr-only': {
    captured: true,
    renderedUpstream: false,
    why: "Bootstrap's visually-hidden utility, present unscoped in the captured sheet at two places. This copy is redundant rather than waiting; nothing here needs it because every hidden label in this room uses `aria-label`."
  },
  'chat-header': {
    captured: true,
    renderedUpstream: false,
    why: 'the captured chat column header; this room renders its own through `AlertChatArea`.'
  },
  'disable-video': {
    captured: true,
    renderedUpstream: false,
    why: 'the captured class for the disable-video control, whose gate this room implements without wearing the class.'
  }
};

/** Class selectors declared anywhere in `app.css`, with the lines they are declared on. */
function declaredClasses(): Map<string, number[]> {
  const found = new Map<string, number[]>();
  postcss.parse(readFileSync(`${ROOT}app.css`, 'utf8'), { from: 'app.css' }).walkRules((rule) => {
    for (const selector of rule.selectors) {
      for (const match of selector.matchAll(/\.([A-Za-z_][\w-]*)/g)) {
        const line = rule.source?.start?.line ?? 0;
        found.set(match[1], [...(found.get(match[1]) ?? []), line]);
      }
    }
  });
  return found;
}

/**
 * Source with its comments removed, because a class NAMED IN PROSE is not worn by anything.
 *
 * Added after a negative control refused to fire. `remove-profile-picture-btn` was built and its
 * catalog entry deleted; removing the class from the button again should have failed this file, and
 * did not — because the note beside that button quotes the capture's const table verbatim, and the
 * class name is in it. The gate was reading a comment as markup.
 *
 * That is the same hollow-coverage shape this repository has hit twice before: a matcher that
 * answers "yes" for the wrong reason reports a clean sweep while measuring nothing. It matters more
 * here than in most gates, because THIS codebase quotes the reference's class lists constantly —
 * every transcription note is a potential false wearer.
 *
 * The strip is the whole-file regex the rest of the corpus uses. It is imprecise in the direction
 * that is safe here: an over-eager strip can only DELETE candidate wearers, which makes a class look
 * orphaned and fails loudly, never the reverse.
 */
function withoutComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

/**
 * Everything that could wear a class: markup, scripts, and the modules that build class strings.
 *
 * `.test.ts` files are excluded and only those — a class named in an assertion is not a wearer, and
 * counting one would let a deleted control keep its styling alive through the test that mourns it.
 */
const WEARERS = [
  ...globSync('**/*.svelte', { cwd: ROOT }),
  ...globSync('**/*.ts', { cwd: ROOT }).filter((file) => !file.endsWith('.test.ts'))
]
  .map((file) => withoutComments(readFileSync(`${ROOT}${file}`, 'utf8')))
  .join('\n');

function escapeForRegExp(value: string): string {
  return value.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function isWornLiterally(cls: string): boolean {
  /*
    Bounded on both sides so `chat-panel` is not matched by `chat-panel-wide`, and so a class inside
    a `class={[...]}` array, a template literal or a plain attribute all count. The boundary set is
    the punctuation a class name can actually sit between in this codebase's markup and clsx arrays.
  */
  return new RegExp(`[\\s"'\`{|:.,\\[]${escapeForRegExp(cls)}[\\s"'\`}|,\\]]`).test(WEARERS);
}

/**
 * A class ASSEMBLED at render time — `class="mic-status mic-status-{micStatus}"`.
 *
 * ## Why this exists, and what not having it cost
 *
 * The literal matcher above cannot see a class that is never written down whole. Five were:
 * `mic-status-idle`, `-testing`, `-success`, `-no-audio` and `-error` sat in the catalog below
 * reading *"one of five states of a mic-test surface this room does not have"* — and the surface is
 * fully built. `ModalHost.svelte` declares
 * `type MicStatus = 'idle' | 'testing' | 'success' | 'no-audio' | 'error'`, assigns every one of the
 * five, and renders `class="mic-status mic-status-{micStatus} mb-3"`.
 *
 * So this gate reported five orphans that were worn, and `TODO.md` row AJ carried them upward as a
 * whole missing reference surface — *"a microphone-test surface with FIVE states … with no
 * counterpart here at all"*. **A matcher that answers "no" for the wrong reason files working code
 * as absent**, which is the mirror of the hollow-coverage failure this file already records about
 * comments, and the more expensive direction: the answer looks like work.
 *
 * ## The test is BOTH halves, deliberately
 *
 * A prefix ending in an interpolation is not enough on its own — `mic-status-{x}` would then vouch
 * for `mic-status-anything`, and the catalog would lose its power to refuse. The suffix must ALSO
 * appear as a string literal in the corpus, which is what a union member, an enum value or a `?:`
 * arm looks like. Both conditions, or it is not worn.
 *
 * Every hyphen is tried as the cut rather than only the last, because a class can be assembled at
 * any of them: `a-b-{c}` and `a-{b}` are both real shapes.
 */
function isWornByInterpolation(cls: string): boolean {
  for (let cut = cls.indexOf('-'); cut !== -1; cut = cls.indexOf('-', cut + 1)) {
    const prefix = cls.slice(0, cut + 1);
    const suffix = cls.slice(cut + 1);
    if (!WEARERS.includes(`${prefix}{`)) continue;
    if (new RegExp(`['"\`]${escapeForRegExp(suffix)}['"\`]`).test(WEARERS)) return true;
  }
  return false;
}

/**
 * Every `class={…}` VALUE in the corpus, concatenated — the regions an object key can hide in.
 *
 * `class` takes an object or an array since Svelte 5.16, and clsx keeps the TRUTHY KEYS: the
 * official guidance (`svelte/class`, read 2026-08-29) is *"consider avoiding `class:`, since the
 * attribute is more powerful and composable"*, so the idiomatic conditional class in this codebase
 * is `class={{ mid: level > 30 }}` — a class name that appears in the source only as an OBJECT KEY.
 *
 * Extracted with a brace walker rather than a regex because the value is arbitrary JavaScript:
 * `class={['volume-bar-fill', { low: …, mid: …, high: … }]}` nests an object inside an array, and a
 * template literal inside either can carry a `}` that closes nothing. Strings and escapes are
 * tracked for the same reason the const-table walker tracks them.
 */
function classValueRegions(): string {
  const regions: string[] = [];
  const OPEN = 'class={';

  for (let at = WEARERS.indexOf(OPEN); at !== -1; at = WEARERS.indexOf(OPEN, at + 1)) {
    let depth = 0;
    let quote: string | null = null;
    let escaped = false;
    let i = at + OPEN.length - 1;

    for (; i < WEARERS.length; i += 1) {
      const ch = WEARERS[i];
      if (quote !== null) {
        if (escaped) escaped = false;
        else if (ch === '\\') escaped = true;
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'" || ch === '`') quote = ch;
      else if (ch === '{' || ch === '[' || ch === '(') depth += 1;
      else if (ch === '}' || ch === ']' || ch === ')') {
        depth -= 1;
        if (depth === 0) break;
      }
    }

    regions.push(WEARERS.slice(at + OPEN.length - 1, i + 1));
  }

  return regions.join('\n');
}

const CLASS_VALUES = classValueRegions();

/**
 * A class worn as a clsx OBJECT KEY — `class={['volume-bar-fill', { mid: level > 30 }]}`.
 *
 * ## The third blindness of the same matcher, and what it cost
 *
 * `mid` sat in the catalog below reading *"a captured layout name with no counterpart in this
 * decomposition"*. It is worn, at `ModalHost.svelte`, on the microphone level bar — with `low` and
 * `high` beside it and the reference's own three thresholds (`<= 30`, `> 30 && <= 70`, `> 70`).
 *
 * `isWornLiterally` could not see it for one character: its boundary sets admit the punctuation a
 * class sits between in an attribute or a clsx ARRAY, and a key is followed by a COLON, which is in
 * the LEADING set and not the trailing one. So `{ mid: … }` read as no wearer at all.
 *
 * That is the same shape as the `mic-status-*` miss this file already records — a matcher answering
 * "no" for the wrong reason, filing working code as absent — and it landed on the SAME COMPONENT,
 * eleven lines away from it. One fix does not generalise to the next; each new way of writing a
 * class needs the matcher taught, which is why this is a third function rather than a wider regex.
 *
 * ## Why not simply add `:` to the trailing boundary set
 *
 * Because that reads the whole corpus, where `mid:` is any object property in any module, and a
 * class named `title` or `id` or `name` would be vouched for by every options bag in the room. The
 * gate would keep passing and stop measuring — the hollow-coverage failure, arrived at by
 * loosening rather than by omission. Restricting the search to `class={…}` VALUES keeps the
 * question the one being asked: is this name a class somebody puts on an element.
 */
function isWornAsClassKey(cls: string): boolean {
  return new RegExp(`(^|[\\s{,])${escapeForRegExp(cls)}\\s*:`).test(CLASS_VALUES);
}

function isWorn(cls: string): boolean {
  return isWornLiterally(cls) || isWornByInterpolation(cls) || isWornAsClassKey(cls);
}

describe('app.css styles nothing that no element wears', () => {
  const declared = declaredClasses();

  it('reads a stylesheet with enough classes in it to mean something', () => {
    /*
      The vacuity floor. If the parse breaks or the glob root moves, every assertion below loops over
      nothing and reports success — the failure mode this repository has now hit twice.
    */
    expect(declared.size).toBeGreaterThan(150);
    expect(WEARERS.length).toBeGreaterThan(500_000);
    /* And that a class known to be worn is seen as worn, so the matcher itself is not broken. */
    expect(isWorn('debug-area')).toBe(true);
  });

  it('has no orphan that is not catalogued', () => {
    const uncatalogued = [...declared.keys()]
      .filter((cls) => !isWorn(cls) && !ORPHANS[cls])
      .sort()
      .map((cls) => `${cls} (app.css:${[...new Set(declared.get(cls))].join(',')})`);

    expect(
      uncatalogued,
      'a class was added to app.css that nothing wears. Either give it markup, or add it to ' +
        'ORPHANS saying why it has none — a rule that styles nothing is the same defect as a class ' +
        'with no CSS, and `.debug-area` sat here for the whole port hiding an unbuilt feature.'
    ).toEqual([]);
  });

  it('carries no stale entry — an orphan that gained a wearer must leave the list', () => {
    /*
      The other direction, and it is what keeps the catalog from becoming a place to hide: when a
      catalogued class gains markup, this fails until its entry is deleted — the same declaration
      `INERT_ACTIONS` treats as "this is done".

      IT HAS ALREADY DONE THAT ONCE. `remove-profile-picture-btn` was catalogued as an unbuilt
      affordance of `#user-modal` and turned this red the same day, when the button was built. The
      entry is gone; the mechanism is what is being asserted here.
    */
    const revived = Object.keys(ORPHANS)
      .filter((cls) => isWorn(cls))
      .sort();

    expect(
      revived,
      'these classes now have markup, so they are no longer orphans — delete their ORPHANS entries'
    ).toEqual([]);

    /* And an entry for a class app.css no longer declares at all is equally stale. */
    const undeclared = Object.keys(ORPHANS)
      .filter((cls) => !declared.has(cls))
      .sort();
    expect(undeclared, 'app.css no longer declares these, so their entries are dead').toEqual([]);
  });

  it('tells the truth about which orphans the reference STYLES', () => {
    /*
      `captured` says only that a sheet this repository captured declares the class. It is measured
      rather than trusted because it is half of what makes an entry actionable — the other half is
      the test below, and reading this one as if it were both is the error that put two dead rules
      in `TODO.md` as unbuilt features.
    */
    const sheets = [
      readFileSync(`${ROOT}../css/complete-app-styles.css`, 'utf8'),
      readFileSync(`${ROOT}lib/styles/captured-runtime-components.css`, 'utf8')
    ].join('\n');

    const wrong: string[] = [];
    for (const [cls, entry] of Object.entries(ORPHANS)) {
      const inCapture = new RegExp(`\\.${cls.replace(/[-]/g, '\\-')}[^A-Za-z0-9_-]`).test(sheets);
      if (inCapture !== entry.captured) {
        wrong.push(`${cls}: catalogued captured=${entry.captured}, measured ${inCapture}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('tells the truth about which orphans the reference RENDERS', () => {
    /*
      ## The measurement this file was missing, and the two claims it retracted

      A captured rule with no wearer HERE was being read as a feature waiting to be built. That
      reading needs a premise nobody checked: that the reference renders everything it styles. It
      does not.

      `chat-stars` and `tagline` were catalogued as affordances of `#user-modal` — *"a per-member
      rating nothing in this room reads or writes"* and *"a free-text line under the display name;
      this room has no column for one"* — and `TODO.md` row AJ carried both upward as reference
      surfaces still to build, the second of them as needing a schema change.

      Measured across BOTH pinned bundles, v3 and v4: `chat-stars` occurs 12 times and `tagline`
      once, and **every one of those 26 occurrences is immediately followed by `[_ngcontent-%COMP%]`**
      — that is, is a compiled Angular CSS selector. Zero are strings in a const table. The
      131-entry const table of `app-user-info-modal` (parsed at bundle byte 2,087,741) contains
      neither name. The reference styles them and renders them nowhere, in either version.

      They are gone from `app.css` and gone from this catalog: two rules that could not have been
      built because there was nothing to build.

      **What IS there, and was mistaken for them.** The star rating in the reference is real, and it
      wears three OTHER classes — consts 60/61/62, `stars-container` / `stars-icon` / `stars-num` —
      which this room renders at `ModalHost.svelte` and twice in `RoomMessage.svelte`. So the
      feature `chat-stars` was named for is BUILT, under the names the reference actually uses. A
      class name is not a feature, and this row had been treating one as the other.

      ## Where `chat-stars` came from, which settles that it can never gain markup

      It is the PREDECESSOR'S name for the same badge. `ptr1-DECODE.md:5289` records
      `09.css:1160  .chatStars { max-height: 8px; height: 8px; vertical-align: text-top; }`, and
      `todo-next.md:1145` records what wore it: `<img class="chatStars" src="/public/images/<years>
      .png">`, the tenure badge, regular roster only. v4 kept the RULE — kebab-cased, and still
      carrying `vertical-align: text-top` — and re-implemented the badge as consts 60/61/62 with a
      number drawn over an icon instead of a per-year image. The old rule was never deleted.

      So this room copied in a stylesheet rule that had been dead upstream for a whole major
      version, and then catalogued it as a feature to build. `tagline` is the same shape with less
      of a trail: the FIELD is real — it is on the login wire and in the roster row — but the
      predecessor rendered it as `<small class="text-muted user-info-block">`
      (`todo-next.md:1140`), and no capture held here shows anything wearing `.tagline`.

      ## What is measured, and what this cannot see

      `renderedUpstream` is the class appearing as a string INSIDE AN ARRAY in the bundle — the
      shape of a const-table entry, `[1,"smallAvatarImg",3,"src","alt"]`. Bare containment is not
      enough and was measured to matter: `mid` appears in this bundle as `{name:"mid"}` in the
      bundled sdp parser, which is an object property in a library and not a class on an element.

      The corpus is `main.*.js`, which holds every component definition, plus the global
      `styles.*.css`. `scripts.*.js` is third-party (its README records it as byte-identical across
      all three builds and it is not re-fetched here), so a class applied by a vendor plugin rather
      than by an Angular template would not be seen. None of the entries below is of that kind, but
      the limit is recorded rather than left to be assumed away.
    */
    const bundle = readFileSync(
      `${ROOT}../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`,
      'utf8'
    );
    const renders = (cls: string) =>
      new RegExp(`[\\[,]"${cls.replace(/[-]/g, '\\-')}"[\\],]`).test(bundle);

    /*
      The vacuity floor, both directions. Without it a broken path or a regex typo answers `false`
      for everything and every `renderedUpstream: false` below passes for the wrong reason — which
      is precisely the failure being corrected, arrived at from the other side.
    */
    expect(bundle.length).toBe(2_891_205);
    expect(renders('remove-profile-picture-btn'), 'const 23, a control since built here').toBe(
      true
    );
    expect(renders('mic-status-nonesuch'), 'a class no reference template can contain').toBe(false);

    const wrong: string[] = [];
    for (const [cls, entry] of Object.entries(ORPHANS)) {
      if (renders(cls) !== entry.renderedUpstream) {
        wrong.push(
          `${cls}: catalogued renderedUpstream=${entry.renderedUpstream}, measured ${renders(cls)}`
        );
      }
      /* Styled by no capture yet rendered by the reference is not a state that can exist. */
      if (entry.renderedUpstream && !entry.captured)
        wrong.push(`${cls}: rendered but not captured`);
    }
    expect(
      wrong,
      'an entry disagrees with the bundle. `renderedUpstream: true` is a surface to build; ' +
        '`false` is a rule to delete — getting it backwards is what row AJ did twice.'
    ).toEqual([]);
  });

  it('names what the captured orphans pointed at — and every one is now answered', () => {
    /*
      This assertion is what is left of four "missing affordances of `#user-modal`", and not one of
      the four was resolved the way the row that recorded them assumed:

      - `remove-profile-picture-btn` was BUILT, then built again in the right place — const 23 puts
        it inside the dropdown rather than floating on the avatar, under a gate with no role term.
      - `edit-user-avatar-options` was BUILT, from `K2e` @ 2,058,852. It is what const 23 lives in.
      - `chat-stars` and `tagline` were NEVER SURFACES. The reference styles both and renders
        neither, in v3 or v4 — see the render test above for the measurement.

      A FIFTH was found by the same arithmetic and is the only one that was a whole feature:
      `smallAvatarImg`, const 98, the avatar on a row of the per-member ADMIN NOTES list. Its
      neighbouring consts read as a followed-users list and that guess was wrong; `fTe` @ 2,064,959
      settled it. The tab existed here with its password prompt and NO `{:else}` — the gate had been
      repaired earlier the same day and opened onto nothing. Built, with `user_notes` under it.

      So the catalog's "captured, therefore pending" half is empty, and that is what is asserted:
      every remaining entry is a carried rule, and a NEW entry claiming otherwise must bring a const
      index with it.
    */
    for (const settled of [
      'edit-user-avatar-options',
      'remove-profile-picture-btn',
      'smallAvatarImg'
    ]) {
      expect(ORPHANS[settled], `${settled} is built; its entry must stay gone`).toBeUndefined();
      expect(isWorn(settled), `${settled} has markup now`).toBe(true);
    }
    for (const retracted of ['chat-stars', 'tagline']) {
      expect(
        declared.has(retracted),
        `${retracted} is dead upstream too; app.css must not declare it again`
      ).toBe(false);
    }
    expect(
      Object.values(ORPHANS).filter((entry) => entry.renderedUpstream),
      'a captured-and-rendered entry is an unbuilt surface — it belongs in TODO.md, not here'
    ).toEqual([]);

    /*
      THE STAR RATING IS BUILT, and this is what is left of the claim that it was missing. It is
      asserted by the classes the reference's own const table uses, because the retracted entry was
      a class name mistaken for a feature and the guard against repeating that is to name the
      feature by the markup that renders it.
    */
    for (const cls of ['stars-container', 'stars-icon', 'stars-num']) {
      expect(isWorn(cls), cls).toBe(true);
    }

    /*
      THE MIC-TEST SURFACE WAS NEVER MISSING, and this assertion is what is left of the claim that it
      was. Five `mic-status-*` classes were catalogued here as *"a microphone-test surface with five
      states that has no counterpart here at all"*, and `TODO.md` row AJ carried that upward as a
      whole unbuilt reference surface.

      It is built. `ModalHost.svelte` declares
      `type MicStatus = 'idle' | 'testing' | 'success' | 'no-audio' | 'error'`, assigns all five, and
      renders `class="mic-status mic-status-{micStatus} mb-3"` — so every one of the five is worn,
      by an interpolation the literal matcher could not see. `isWornByInterpolation` sees it now, and
      the five entries are gone from the catalog, which is this file's own declaration that something
      is done.

      What remains asserted is the SHAPE that made the error possible, so it cannot come back
      silently: the surface exists and every state it can reach has a class.
    */
    const micStates = ['idle', 'testing', 'success', 'no-audio', 'error'];
    for (const state of micStates) {
      expect(isWorn(`mic-status-${state}`), `mic-status-${state}`).toBe(true);
      expect(
        ORPHANS[`mic-status-${state}`],
        `mic-status-${state} is not an orphan`
      ).toBeUndefined();
    }
  });
});
