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
 * ## Measured 2026-08-29: 200 class selectors, 29 with no wearer — now 13
 *
 * They split cleanly, and the split is what makes each one actionable:
 *
 * - **CAPTURED** — the class exists in the reference's own stylesheet. `app.css` carries a copy for
 *   markup this room has not built, so the rule is waiting rather than dead. Four of them
 *   (`edit-user-avatar-options`, `remove-profile-picture-btn`, `chat-stars`, `tagline`) shared the
 *   Angular component id `ng-c1441935951`, which is `#user-modal` — the user-info modal this room
 *   DOES render, missing four of its affordances. Five more (`mic-status-*`) share `ng-c2606333922`,
 *   a microphone-test surface with five states that has no counterpart here at all.
 *
 * **`remove-profile-picture-btn` LEFT THIS LIST the same day**, which is the gate working as
 * intended rather than a note: it turned red the moment the button was built, and deleting its
 * entry is the declaration that it is done — the shape `INERT_ACTIONS` uses. Three of the user
 * modal's four remain.
 * - **OURS** — the class is in no captured sheet. `app.css` invented it, and nothing in `src/`
 *   mentions it. Every one of these is a panel-layout name from before the page was decomposed into
 *   components; they style nothing and they never will.
 *
 * ## Why nothing is DELETED here
 *
 * Deleting the fifteen invented rules changes nothing observable — that is exactly the argument for
 * doing it and exactly why it is not done in the same commit as the measurement. `app.css` is read
 * by `dump-contract.test.ts` and by the capture verifiers, and a bulk edit landing beside a feature
 * is how a stylesheet change gets attributed to the wrong commit. The list is recorded, frozen, and
 * cannot grow; removing it is its own change.
 *
 * ## What this refuses
 *
 * A THIRTIETH. Any class added to `app.css` that nothing wears fails here, which is the point: the
 * cost of a new orphan is now a failing test rather than a discovery three months later.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * The known 29, each with why it has no wearer.
 *
 * `captured` means the reference's own stylesheet has the class, so the rule is waiting for markup;
 * `false` means this repository invented it and nothing will ever wear it.
 */
const ORPHANS: Record<string, { captured: boolean; why: string }> = {
  // ── The user-info modal, `ng-c1441935951` — a modal this room renders, missing four affordances ──
  'edit-user-avatar-options': {
    captured: true,
    why: 'the avatar dropdown inside `#user-modal` — the pencil overlay on the picture. `.edit-user-avatar img` beside it IS worn, so the container is built and its options menu is not.'
  },
  'chat-stars': {
    captured: true,
    why: "a per-member rating shown beside the nick in `#user-modal`. Nothing in this room reads or writes a member's stars, so the class is the only trace of the feature."
  },
  tagline: {
    captured: true,
    why: '`#user-modal .tagline` — a free-text line under the display name. This room has no column for one.'
  },

  // ── The microphone test, `ng-c2606333922` — five states, no counterpart here ──
  'mic-status-idle': {
    captured: true,
    why: 'one of five states of a mic-test surface this room does not have.'
  },
  'mic-status-testing': { captured: true, why: 'see `mic-status-idle`.' },
  'mic-status-success': { captured: true, why: 'see `mic-status-idle`.' },
  'mic-status-no-audio': { captured: true, why: 'see `mic-status-idle`.' },
  'mic-status-error': { captured: true, why: 'see `mic-status-idle`.' },

  // ── Captured, and not a feature ──
  'sr-only': {
    captured: true,
    why: "Bootstrap's visually-hidden utility, present unscoped in the captured sheet at two places. This copy is redundant rather than waiting; nothing here needs it because every hidden label in this room uses `aria-label`."
  },
  smallAvatarImg: {
    captured: true,
    why: 'a smaller avatar variant the reference uses in a surface this room does not build.'
  },
  'chat-header': {
    captured: true,
    why: 'the captured chat column header; this room renders its own through `AlertChatArea`.'
  },
  'disable-video': {
    captured: true,
    why: 'the captured class for the disable-video control, whose gate this room implements without wearing the class.'
  },
  mid: { captured: true, why: 'a captured layout name with no counterpart in this decomposition.' }
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

function isWorn(cls: string): boolean {
  /*
    Bounded on both sides so `chat-panel` is not matched by `chat-panel-wide`, and so a class inside
    a `class={[...]}` array, a template literal or a plain attribute all count. The boundary set is
    the punctuation a class name can actually sit between in this codebase's markup and clsx arrays.
  */
  const escaped = cls.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  return new RegExp(`[\\s"'\`{|:.,\\[]${escaped}[\\s"'\`}|,\\]]`).test(WEARERS);
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

  it('tells the truth about which orphans are the reference own', () => {
    /*
      The `captured` flag is what makes an entry actionable rather than decorative: `true` means a
      rule waiting for markup — a feature to build — and `false` means a name this repository
      invented, which can only ever be deleted. Getting it backwards would file a missing feature as
      dead code, so it is checked against the captured sheets rather than trusted.
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

  it('names the two surfaces the captured orphans point at', () => {
    /*
      Not decoration: these are the two FINDINGS this sweep produced, and a list of 29 reasons is
      where a finding goes to be forgotten. Asserting them keeps both visible as work rather than as
      trivia — and if either is built, the stale-entry test above turns red and forces this to be
      revisited with it.
    */
    const userModal = ['edit-user-avatar-options', 'chat-stars', 'tagline'];
    for (const cls of userModal) expect(ORPHANS[cls]?.captured, cls).toBe(true);

    const micTest = Object.keys(ORPHANS).filter((cls) => cls.startsWith('mic-status-'));
    expect(micTest).toHaveLength(5);
    for (const cls of micTest) expect(ORPHANS[cls]?.captured, cls).toBe(true);
  });
});
