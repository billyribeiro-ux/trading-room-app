// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';

/*
  TWO GATES THE REFERENCE HAS THAT THIS ROOM RENDERED WITHOUT.

  Both were found by reading the reference component end to end against ours, and both are the same
  failure: the gate EXISTS here and one of its two call sites forgot it.

  ## The private-chat entry point — `O(9, o.showPMBtn ? 9 : -1)`, byte 1,453,980

  `gates.ts` has computed `showPmButton` since it was written:

      (isPresenter || sessData.userPM || sessData.userToPresenterPM)
        && !(user.isFT && sessData.disablePMForTrials)

  `ExtraChatPane` gates on it, with a comment quoting that same `O(9, …)` line. `AlertChatArea` —
  the MAIN chat column — took no such prop and rendered the entry point unconditionally. A
  free-trial member in a room with `disablePMForTrials` was refused private chat in the extra column
  and offered it in the main one, which is the kind of split that makes a room's rules look
  arbitrary rather than enforced.

  ## The group chat control — `O(290, isPresenter && !isLimitedPresenter ? 290 : -1)`, byte 2,288,249

  Three radios that change the room's chat mode for everybody, rendered for every member.

  **Not an escalation**, and it matters to say which it is: `chat-mode.remote.ts` calls
  `presenterRoom()`, so the server refuses a member and the room's mode never moved. What a member
  actually got was a confirm dialog and a 403 — a control whose only possible effect is a refusal,
  which this repository refuses on its own terms.

  `!isLimitedPresenter` is not decoration. `giveMicScreen` makes a member a presenter at runtime
  (`globals.user.isPresenter = globals.isLimitedPresenter = e.give`), and disabling the room's chat
  is not among the things that grant hands over. The same three-way test is already used on the
  username row in this file, which is where the shape was read from.

  ## Why source assertions

  Both are `{#if}`s over markup, and what has to be true is that the gate is THERE. A mount test
  proves the branch works for the props it was given; it cannot notice that the second call site
  never received the prop at all, which is exactly what happened.
*/

const read = (relative: string) =>
  readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');

const alertChat = read('./components/AlertChatArea.svelte');
const extraChat = read('./components/ExtraChatPane.svelte');
const modalHost = read('./components/ModalHost.svelte');
const page = read('../routes/+page.svelte');
const gates = read('./room/gates.ts');

describe('private chat is offered on the same terms in both columns', () => {
  it('computes the rule once, in `gates.ts`', () => {
    /* One definition. Two columns deciding this separately is how they came to disagree. */
    expect(gates).toContain('get showPmButton()');
    expect(gates).toContain('disablePMForTrials');
  });

  it.each([
    ['the main column', () => alertChat],
    ['the extra column', () => extraChat]
  ])('%s gates its entry point on it', (_column, source) => {
    const text = source();
    expect(text).toContain('showPmButton: boolean;');
    /*
      The two chat columns are separate files, so the tree helper above — which is built over
      `ModalHost.svelte` — does not serve them. `{#if showPmButton}` is a distinctive string that
      appears nowhere else in either file, which is checked rather than assumed.
    */
    expect((text.match(/\{#if showPmButton\}/g) ?? []).length, 'exactly one such gate').toBe(1);
    const control = text.indexOf('Open Private chat');
    expect(control, 'the private-chat entry point').toBeGreaterThan(-1);
    expect(
      text.lastIndexOf('{#if showPmButton}', control),
      'and it opens before the control'
    ).toBeGreaterThan(-1);
    expect(
      text.indexOf('{/if}', text.lastIndexOf('{#if showPmButton}', control)),
      'and closes after it'
    ).toBeGreaterThan(control);
  });

  it('feeds both from the same getter', () => {
    /*
      Counted, not merely present: one `showPmButton={gates.showPmButton}` would satisfy a
      `toContain` while the other column still received nothing, which was the state before this.
    */
    expect((page.match(/showPmButton=\{gates\.showPmButton\}/g) ?? []).length).toBe(2);
  });
});

describe('the group chat control is presenter-only, and not for a runtime presenter', () => {
  it('gates the radios themselves on both terms', () => {
    /*
      THE NEAREST PRECEDING `{#if}`, not any matching string in the file — and the first draft of
      this test got that wrong in a way its own negative control caught.

      `ModalHost.svelte` contains THREE real `{#if isPresenter && !isLimitedPresenter}` gates (the
      username row, the administrative body, and this) plus two comments quoting the shape. A
      `toContain` was therefore satisfied by a gate elsewhere in the file: dropping
      `!isLimitedPresenter` from THIS one left the assertion green. Anchoring to the gate that
      actually precedes the block is the only form that says what it means.
    */
    const block = modalHost.indexOf('id="groupChatControl"');
    expect(block).toBeGreaterThan(-1);
    const gate = modalHost.lastIndexOf('{#if ', block);
    expect(gate).toBeGreaterThan(-1);
    expect(
      modalHost.slice(gate, block),
      'the gate immediately before the radios must carry BOTH terms'
    ).toContain('isPresenter && !isLimitedPresenter');
    expect(modalHost.indexOf('{/if}', block), 'and it must close after them').toBeGreaterThan(
      block
    );
  });

  it('is refused on the server as well, which is where authority is decided', () => {
    /*
      The render gate is a courtesy; this is the check that means something. Asserted here so that
      removing the server gate to "simplify" now that the control is hidden fails loudly — hiding a
      control is not the same as refusing the act, and this repository has the scar to prove it.
    */
    expect(read('../routes/chat-mode.remote.ts')).toContain('presenterRoom()');
  });
});

/*
  THE USER CARD'S WHOLE BODY IS PRESENTER-ONLY, and until now nothing said so.

  This block exists because of a claim that turned out to be WRONG, and the investigation was worth
  more than the claim would have been. A surface audit reported that the reference's
  `user.hidePrivateInfo` — the flag suppressing the extra tabs (slot 5), the Last Login / Email /
  Badges / Location rows (slot 17) and the Permissions row (slot 23), at byte 2,068,025 — "does not
  exist anywhere in our source", and concluded that this room renders all three unconditionally.

  It does not. Measured by walking the markup:

  * `{#if isPresenter && !isLimitedPresenter}` opens at the tab list and closes after the Admin
    Notes pane, so the tabs AND every row inside them are presenter-only. There is no `{:else}`: a
    member opening a card sees the header and the footer buttons, and no body at all.
  * `email` and `locStr` never reach a member in the first place — `roster-privacy.test.ts` filters
    them off the SSE frame, after a 2026-08-18 defect where the sidebar declined to draw data it had
    already been handed.
  * Last Login and Email in that card come from `user-detail.remote.ts`, which is presenter-only on
    the server.

  So the reference's client-side flag has three server-side refusals here instead, which is
  strictly stronger: `hidePrivateInfo` hides data that still arrives.

  ## What the investigation DID find

  Nothing asserted that gate. The privacy of every field in that card rested on one `{#if}` with no
  test — and the assertions above record how easily a `toContain` proves to be about a different
  occurrence of the same string. This is that assertion, anchored the same way.
*/
/**
 * Every `{#if}` in `ModalHost.svelte`, with its condition and its extent, from the compiler's tree.
 *
 * ## Why the tree, and not `lastIndexOf('{#if ', marker)`
 *
 * Three assertions in this file were written that way and TWO of them were hollow. `lastIndexOf`
 * finds the nearest PRECEDING `{#if}` in the text, which is not the same as the block that contains
 * the marker: a sibling block that closed before it, or an unrelated gate further up, satisfies a
 * `toContain` just as well. Both were caught by negative controls that removed the real gate and
 * watched the test stay green.
 *
 * The tree knows which block contains what. `enclosingIf` returns the INNERMOST one, which is the
 * gate that actually decides whether a marker renders.
 *
 * ## The parse is caught
 *
 * At module scope an unparseable file throws during COLLECTION, and vitest then reports this file as
 * having no tests — the shape that reads as absence rather than breakage. A control produced exactly
 * that before this was wrapped; `package-scripts-contract.test.ts` records the same correction.
 */
const parsed = (() => {
  const blocks: { start: number; end: number; test: string }[] = [];
  let parseError: unknown = null;
  try {
    const visit = (node: unknown): void => {
      if (!node || typeof node !== 'object') return;
      const candidate = node as { type?: string; start?: number; end?: number };
      if (
        candidate.type === 'IfBlock' &&
        typeof candidate.start === 'number' &&
        typeof candidate.end === 'number'
      ) {
        const opener = modalHost.slice(
          candidate.start,
          modalHost.indexOf('}', candidate.start) + 1
        );
        blocks.push({ start: candidate.start, end: candidate.end, test: opener });
      }
      for (const value of Object.values(node as Record<string, unknown>)) {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === 'object') visit(value);
      }
    };
    visit(parse(modalHost, { modern: true }).fragment);
  } catch (cause) {
    parseError = cause;
  }
  return { blocks, parseError };
})();

/** The offset of a marker, asserted to exist so a renamed control fails loudly rather than vacuously. */
const at = (marker: string) => {
  const offset = modalHost.indexOf(marker);
  expect(offset, `\`${marker}\` is not in ModalHost.svelte`).toBeGreaterThan(-1);
  return offset;
};

/**
 * The INNERMOST `{#if}` containing this offset, or undefined when nothing does.
 *
 * Innermost, because that is the gate that decides. An outer `{#if isPresenter}` around a block that
 * also carries an inner `{#if hasThing}` does not make the inner marker presenter-gated in the sense
 * a reader cares about — but for these assertions the question is the reverse, so both are checked:
 * `gateChain` gives every enclosing block when a marker's authority comes from an ancestor.
 */
const gateChain = (offset: number) =>
  parsed.blocks
    .filter((block) => block.start < offset && offset < block.end)
    .sort((a, b) => b.start - a.start);

const enclosingIf = (offset: number) => gateChain(offset)[0];

describe('the user card shows a member nothing about another member', () => {
  it('parses, so nothing below passes vacuously', () => {
    expect(parsed.parseError, 'ModalHost.svelte does not parse').toBeNull();
    expect(parsed.blocks.length, 'no `{#if}` blocks found at all').toBeGreaterThan(20);
  });

  it('gates the tab list, and therefore everything in it, on a server-decided presenter', () => {
    expect(
      enclosingIf(at('id="nav-tab" role="tablist"'))?.test,
      'a member must not be offered the System, Actions or Admin Notes tabs'
    ).toContain('isPresenter && !isLimitedPresenter');
  });

  it.each([
    ['Last Login', '<th scope="row">Last Login:'],
    ['Email', '<th scope="row">Email:'],
    ['Permissions', '<th scope="row">Permissions:']
  ])('keeps the %s row inside that same gate', (_label, marker) => {
    /*
      PARSED, not sliced, and the first draft is why.

      These rows carry no gate of their own — correctly, because they are inside the body — so what
      has to hold is that the body's gate CONTAINS them. A text slice between the gate and the row
      cannot say that: the draft asserted the slice held no `{:else}`, and tripped immediately on an
      `{:else}` belonging to a nested block several levels in. Only the tree knows which `{:else}`
      belongs to which `{#if}`, so this asks the tree, as `state-raw-contract.test.ts` does.
    */
    expect(
      gateChain(at(marker)).map((block) => block.test),
      'no enclosing gate makes this row presenter-only'
    ).toContainEqual(expect.stringContaining('isPresenter && !isLimitedPresenter'));
  });

  it('never receives the two fields at all, which is the half a render gate cannot give', () => {
    /*
      The gate above is a courtesy. `roster-privacy.test.ts` is the guarantee: it subscribes a real
      member to a real room and inspects the bytes they were handed. Named here so the connection
      between the two is findable from either end.
    */
    const privacy = read('./server/roster-privacy.test.ts');
    expect(privacy).toContain('locStr');
    expect(privacy).toContain('email');
  });
});

/*
  THE THREE PRESENTER ACTIONS IN THE SETTINGS MODAL — `O(135, isPresenter ? 135 : -1)`, byte 2,285,714.

  Slot 135 is the template function `ake`, and reading it settles exactly which buttons belong inside
  the gate:

      removePreviewWindows()  "Remove webcam/screenpreview windows"
      muteAllNonAdmins()      "Mute Microphone for all non-admins"
      getMyToken()            "Get my token"

  and nothing else. "Edit my Info and Avatar" is the const immediately after the `[1,"mx-3"]` wrapper
  (byte 2,263,375) and is drawn for everybody. All four sat inside one ungated `<div class="mx-3">`
  here.

  `isPresenter` ALONE, not the `&& !isLimitedPresenter` the user card uses: a member handed mic and
  screen by `giveMicScreen` has preview windows to remove and a microphone in the room, so the
  reference lets them at these. Transcribed rather than tightened — the narrower gate would be a
  guess about what that grant is for, and this file's job is to record what the reference does.
*/
describe('the settings modal’s presenter actions', () => {
  it.each([
    ['Remove webcam/screenpreview windows', 'remove-preview-windows'],
    ['Mute Microphone for all non-admins', 'mute-all-non-admins'],
    ['Get my token', 'get-my-token']
  ])('gates %s on being a presenter', (_label, action) => {
    expect(
      enclosingIf(at(`onUserAction('${action}', targetUser)`))?.test,
      'the block that decides whether this button renders'
    ).toBe('{#if isPresenter}');
  });

  it('leaves "Edit my Info and Avatar" ungated, as the reference does', () => {
    /*
      The other half, and it is the half a careless fix breaks: wrapping the whole `mx-3` div would
      take a member's own profile editor away with the three presenter actions.
    */
    expect(
      gateChain(at("onUserAction('edit-my-info', targetUser)")).map((block) => block.test),
      'a member must keep their own profile editor'
    ).not.toContainEqual('{#if isPresenter}');
  });
});
