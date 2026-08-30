// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
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
      Anchored to the control, for the reason the group-chat assertion below records: a bare
      `toContain` on the gate proves only that the file mentions it somewhere.
    */
    const control = text.indexOf('Open Private chat');
    expect(control, 'the private-chat entry point').toBeGreaterThan(-1);
    const gate = text.lastIndexOf('{#if ', control);
    expect(text.slice(gate, control), 'the gate immediately before it').toContain('showPmButton');
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
