import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { globSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * EVERY COMPONENT PROP IS EITHER SUPPLIED OR EXPLAINED.
 *
 * ## The question nothing was asking
 *
 * A Svelte prop with a default is a value that silently becomes the default when nobody passes it.
 * Nothing throws, nothing logs, `svelte-check` is content, eslint is content, and a render test that
 * does not pass it renders the default and agrees with itself. **The failure is invisible from every
 * direction except this one: which of a component's props does no call site supply?**
 *
 * Asked by hand for the first time on 2026-08-28, it found, in one afternoon:
 *
 * * `hasQaOnAlerts` — an ENTITLEMENT defaulting to `true`, so the ask-a-question button was on in
 *   every room whether or not Q&A had been bought.
 * * `userPrivateMessaging`, `userToPresenterPrivateMessaging`, `disablePrivateMessagingForTrials`
 *   and `currentUserIsTrial` — the private-message rule collapsed to `viewerIsPresenter`, so the
 *   entry was presenter-only in every room while two other copies of the same rule offered it to
 *   members.
 * * `hideAvatars` — avatars shown in rooms that hide them.
 * * `viewerIsLimitedPresenter` — a member handed mic and screen kept the Show To All entry.
 * * `bufferSizeLevel` and `onBufferSizeChange` — a live dropdown whose every click called
 *   `undefined?.()`.
 *
 * Every one of those values already existed in this room. None of them was a missing feature; all of
 * them were a value that never arrived. So the question is worth asking automatically, forever.
 *
 * ## How a prop counts as SUPPLIED
 *
 * Two ways, and the second is what makes this precise rather than approximate:
 *
 * 1. **Named at a call site** — `{prop}`, `prop={…}` or `bind:prop` in any other component.
 * 2. **Declared by a type that is SPREAD at a call site.** `{...messageChrome}` feeds exactly the
 *    fields `RoomMessageChrome` declares and nothing else, so the spread's TYPE is resolved and its
 *    fields count as supplied. Matching the spread loosely — treating any spread as feeding
 *    everything — would have hidden all six message gates above, since they were fed by nothing
 *    while `{...messageChrome}` sat at the call site.
 *
 * ## What this cannot see, stated rather than glossed
 *
 * A prop passed through a computed name, or spread from an object with no declared type, reads as
 * unsupplied. There are none of either today; if one appears, the honest fix is to give the spread
 * a type, not to loosen this.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));

const svelteFiles = globSync('**/*.svelte', { cwd: ROOT }).map((relative) => ({
  path: relative.replaceAll('\\', '/'),
  source: readFileSync(`${ROOT}/${relative}`, 'utf8')
}));

const typeFiles = globSync('**/*.ts', { cwd: ROOT })
  .filter((relative) => !relative.includes('.test.'))
  .map((relative) => readFileSync(`${ROOT}/${relative}`, 'utf8'))
  .join('\n');

/** The props a component declares, read from its `$props()` destructuring. */
function declaredProps(source: string): string[] {
  const block = source.match(/let \{([\s\S]*?)\}: Props = \$props\(\)/);
  if (!block) return [];
  return [...block[1].matchAll(/^\s*([a-zA-Z0-9_]+)/gm)].map((match) => match[1]);
}

/** `<Name` — the tag, so a mention in prose does not count as a call site. */
function callSites(componentPath: string) {
  const name = componentPath.split('/').pop()?.replace('.svelte', '') ?? '';
  const tag = new RegExp(`<${name}\\b`);
  return svelteFiles
    .filter((file) => file.path !== componentPath && tag.test(file.source))
    .map((file) => ({ ...file, tag: name }));
}

/**
 * The text between `<Name` and the end of that tag, for every occurrence.
 *
 * Bounded by the first `>` that is not inside braces, so an inline expression containing `>` — a
 * comparison in a prop value — does not truncate the tag. Everything this file asks about a call
 * site is asked of these strings, never of the whole file: a prop named in a comment is not a
 * supply, and this module's own docblocks name almost every prop in the tree.
 */
function tagBodies(source: string, tag: string): string[] {
  const bodies: string[] = [];
  const opening = new RegExp(`<${tag}\\b`, 'g');
  for (const match of source.matchAll(opening)) {
    let depth = 0;
    for (let index = match.index + match[0].length; index < source.length; index += 1) {
      const character = source[index];
      if (character === '{') depth += 1;
      else if (character === '}') depth -= 1;
      else if (character === '>' && depth === 0) {
        bodies.push(source.slice(match.index, index));
        break;
      }
    }
  }
  return bodies;
}

/**
 * Whether a call site supplies `prop`, by any of the five spellings.
 *
 * ONE function because there are two callers — the sweep and the stale-exemption check — and a
 * matcher written twice is a matcher that will answer two different questions after the next edit.
 * That is the failure this whole file exists to catch, and it would be embarrassing here.
 *
 * The five:
 *
 *     {prop}              shorthand
 *     prop={…}            explicit
 *     bind:prop           two-way
 *     prop                a bare boolean attribute, which is `prop={true}`
 *     {#snippet prop()}   a snippet prop, never written as `prop={…}`
 *
 * The first four are matched inside the TAG; the snippet form is matched in the file, because a
 * snippet is written between the tags rather than in them. Matching the first four file-wide would
 * let a prop named in a docblock count as a supply, and this module's own docblocks name almost
 * every prop in the tree.
 */
function siteSupplies(site: { source: string; tag: string }, prop: string): boolean {
  const inTag = new RegExp(
    `(?:\\{\\s*${prop}\\s*\\}|\\b${prop}\\s*=|bind:${prop}\\b|^\\s*${prop}\\s*$)`,
    'm'
  );
  if (tagBodies(site.source, site.tag).some((body) => inTag.test(body))) return true;
  return new RegExp(`\\{#snippet\\s+${prop}\\s*\\(`).test(site.source);
}

/**
 * The fields a spread at a call site can supply.
 *
 * `{...messageChrome}` resolves through the call site's own declaration —
 * `messageChrome: RoomMessageChrome` — to that type's `readonly <field>:` members. A spread whose
 * type cannot be resolved contributes nothing, which is the fail-closed direction: it reports a
 * prop as unsupplied rather than assuming a spread covers it.
 */
function spreadFields(site: { source: string }): Set<string> {
  const fields = new Set<string>();
  for (const spread of site.source.matchAll(/\{\.\.\.([a-zA-Z0-9_]+)\}/g)) {
    const identifier = spread[1];
    const typed = site.source.match(new RegExp(`${identifier}\\s*:\\s*([A-Z][A-Za-z0-9_]*)`));
    if (!typed) continue;
    const declaration = typeFiles.match(
      new RegExp(`(?:type|interface)\\s+${typed[1]}\\b[^{]*\\{([\\s\\S]*?)\\n\\}`)
    );
    if (!declaration) continue;
    for (const field of declaration[1].matchAll(/^\s*(?:readonly\s+)?([a-zA-Z0-9_]+)\??\s*:/gm)) {
      fields.add(field[1]);
    }
  }
  return fields;
}

/**
 * Props no call site supplies, WITH the reason each is deliberate.
 *
 * An entry here is a claim that the default is the right answer, and every one of them was checked
 * against the reference bundle. **Adding an entry is the reviewable act**: it is how a prop stops
 * being a defect and becomes a decision, and a bare name with no reason should not survive review.
 */
const DELIBERATELY_UNSUPPLIED: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'lib/components/RoomMessage.svelte': {
    /*
      `enableQaReactions` and `isQaMessage` were BOTH exempt here until 2026-08-28, on the reason the
      entries gave: the Q&A thread rendered with `onaction={() => {}}`, so anything they lit could
      not act. Both are supplied now — the thread has two commands behind it — and the entries are
      deleted rather than reworded, which is what this list means by a prop stopping being a
      decision. `qa-thread-contract.test.ts`.
    */
    showNewIndicator:
      'needs `isNewIndicatorOn` (unwired) AND a supply for `item.isNew`, which no feed populates. ' +
      'A presenter-only marker with no data behind it is a marker that never shows.'
  },
  'lib/components/StreamTabs.svelte': {
    lockedScreenId:
      '`globals.lockedScreenID` — the SCREENSHARE lock field, and not a typo. The badge at the top ' +
      'of a stream tab reads `lockedScreenIDMTX` while the menu item’s LABEL reads `lockedScreenID`, ' +
      'eight lines apart in the same update block. The asymmetry is reproduced rather than ' +
      'reconciled, and is invisible in practice because neither field is ever set to a stream id.',
    forcedStreamId:
      '`forcedScreenMTXID` — the eye badge. **Upstream has no writer for it either**, which the ' +
      'prop’s own docblock records. Passing something would be inventing a decision the reference ' +
      'did not make.',
    lockedStreamId:
      '`globals.lockedScreenIDMTX` — the lock badge, and upstream has no writer for it. Its sibling ' +
      '`toggleLockScreenMTX` is an unimplemented stub in the bundle: `console.error("TODO: …")`.'
  },
  'lib/components/Modal.svelte': {
    closedStyle:
      'the inline style a CLOSED modal keeps. Every modal in this room closes to the stylesheet’s ' +
      'own `display: none`, so the default is the answer; the prop exists for a captured modal that ' +
      'carries its own closed geometry, and none does yet.'
  },
};

describe('every component prop is supplied by somebody, or explained here', () => {
  const findings = svelteFiles.flatMap((file) => {
    const props = declaredProps(file.source);
    if (props.length === 0) return [];
    const sites = callSites(file.path);
    // A component nothing renders is a different problem, and not this file's.
    if (sites.length === 0) return [];

    const supplied = new Set<string>();
    for (const site of sites) {
      for (const field of spreadFields(site)) supplied.add(field);
      for (const prop of props) {
        if (siteSupplies(site, prop)) supplied.add(prop);
      }
      // `children` — anything written between the tags, which names nothing.
      if (new RegExp(`<${site.tag}[^/>]*>[\\s\\S]*?</${site.tag}>`).test(site.source)) {
        supplied.add('children');
      }
    }

    return props
      .filter((prop) => !supplied.has(prop))
      .filter((prop) => !DELIBERATELY_UNSUPPLIED[file.path]?.[prop])
      .map((prop) => `${file.path}: ${prop}`);
  });

  it('finds no prop that is neither supplied nor explained', () => {
    expect(findings).toEqual([]);
  });

  /*
    THE GUARD ON THE GUARD, and it is not hypothetical for this file in particular.

    Every mechanism above is a regex over source text. A change that made `declaredProps` match
    nothing would leave the assertion above passing over an empty universe — the vacuous-test failure
    this repository has met four times. The floor is well under what the tree holds so ordinary
    drift does not churn it.
  */
  it('reads props out of real components at all', () => {
    const withProps = svelteFiles.filter((file) => declaredProps(file.source).length > 0);
    expect(withProps.length).toBeGreaterThan(20);
    const roomMessage = svelteFiles.find((file) => file.path.endsWith('RoomMessage.svelte'));
    expect(declaredProps(roomMessage?.source ?? '').length).toBeGreaterThan(25);
  });

  /*
    …and that the SPREAD resolution works, which is the half that could silently start supplying
    everything or nothing. `RoomMessageChrome` is the only spread in this tree today; if it stopped
    resolving, thirteen real props would read as unsupplied and this file would become noise that
    somebody switches off.
  */
  it('resolves a spread to the fields its type declares', () => {
    const alertChat = svelteFiles.find((file) => file.path.endsWith('AlertChatArea.svelte'));
    const fields = spreadFields(alertChat ?? { source: '' });
    expect(fields.has('hasQaOnAlerts'), 'the chrome spread stopped resolving').toBe(true);
    expect(fields.has('userPrivateMessaging')).toBe(true);
    // …and it does not resolve to everything: a per-message prop is NOT on the chrome.
    expect(fields.has('item')).toBe(false);
  });

  /*
    Every exemption names a real prop. An entry left behind after a prop is deleted or renamed is a
    reason attached to nothing, and the next reader would take it for a live decision.
  */
  it('has no stale exemption', () => {
    for (const [path, props] of Object.entries(DELIBERATELY_UNSUPPLIED)) {
      const file = svelteFiles.find((candidate) => candidate.path === path);
      expect(file, `${path} is exempted but does not exist`).toBeDefined();
      const declared = new Set(declaredProps(file?.source ?? ''));
      for (const prop of Object.keys(props)) {
        expect(declared.has(prop), `${path} exempts ${prop}, which it no longer declares`).toBe(
          true
        );
      }
    }
  });

  /*
    …AND NO EXEMPTION THAT IS NO LONGER TRUE, which is the half that matters more.

    An entry here is a claim that nobody supplies the prop. The moment somebody does, the reason
    beside it becomes a false statement sitting in a contract file — and the next reader takes it for
    a live decision about a prop that is now wired. Three of the five entries in the first draft of
    this table were exactly that: `Modal.closedAriaHidden`, `Modal.footerOutsideContent` and
    `PresenterMuteRows.trailingRule` read as unsupplied only because the matcher could not see a bare
    boolean attribute. This assertion is what would have caught that without a person noticing.
  */
  it('exempts nothing that is actually supplied', () => {
    for (const [path, props] of Object.entries(DELIBERATELY_UNSUPPLIED)) {
      const sites = callSites(path);
      for (const prop of Object.keys(props)) {
        const suppliedByName = sites.some((site) => siteSupplies(site, prop));
        const suppliedBySpread = sites.some((site) => spreadFields(site).has(prop));
        expect(
          suppliedByName || suppliedBySpread,
          `${path} exempts ${prop}, but a call site supplies it — delete the entry`
        ).toBe(false);
      }
    }
  });
});
