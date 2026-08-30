// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

import PollPanel from './components/PollPanel.svelte';
import type { ActivePoll, SavedPoll } from './types.js';

/**
 * TWO WAYS THE POLL PANEL LIED TO THE PERSON IN FRONT OF IT, and both need a MOUNT to see.
 *
 * `poll-panel-contract.test.ts` reads this component's source and `polls.svelte.test.ts` exercises
 * the state class behind it. Neither can see either defect below, and the reason is the same in both
 * cases: one is a reconciler error raised while patching real DOM, the other is what happens after
 * an `await` inside a click handler. Source text has no opinion on either, and SSR emits the first
 * frame and then stops — no handler runs and no keyed list is ever RE-keyed.
 *
 * ## POLL-01 — two choices spelled the same took the panel down
 *
 * The pie labels were keyed `(datum.label)` and `datum.label` is the choice TEXT. Nothing dedupes a
 * choice: upstream's `addChoice()` is a bare push (bundle byte 2,110,392) and `addPollChoice` here
 * is deliberately the same, because the INDEX is the vote and a poll may legitimately offer the same
 * word twice. So `["Up", "Up"]` is a poll a presenter can build, and Svelte answers a duplicate key
 * by THROWING — `if (length > keys.size) e.each_key_duplicate(...)`, in
 * `svelte/src/internal/client/dom/blocks/each.js`, outside the `DEV` guard and therefore in
 * production too.
 *
 * `pieData` is `choices.map(...)`, so the list is full the moment the panel enters `results` mode.
 * The presenter did not have to wait for a vote: they pressed Send and the panel died.
 *
 * ## POLL-02 — a refused vote was reported to the member as a cast one
 *
 * `RoomModals.#mutate` catches, logs and answers `false` precisely so a panel does not claim a
 * success that did not happen; `polls.remote.ts` says the same thing from the server side. Every
 * other call in `PollPanel` consumes that boolean. `sendAnswer` awaited the promise and dropped it,
 * so a member whose vote was refused — the poll ended a moment ago, the index was out of range, the
 * request failed — was marked answered, moved to `done`, and had the panel closed, with the reason
 * visible only in their own console.
 *
 * ## What a "click" is here, and why it is `dispatchEvent` rather than a helper
 *
 * The panel renders into `document.body` and its buttons are plain `<button>`s, so the honest
 * instrument is the DOM's own: find the element by the text a member reads, dispatch a real click,
 * and let the component's handler run. Nothing is reached into and nothing is stubbed but the
 * callbacks, which is the seam the component was built with.
 */

const HOSTS: HTMLElement[] = [];
const MOUNTED: Record<string, unknown>[] = [];

afterEach(() => {
  for (const component of MOUNTED.splice(0)) unmount(component);
  for (const host of HOSTS.splice(0)) host.remove();
});

const noop = () => {};
const yes = () => Promise.resolve(true);

/** A poll somebody ELSE sent, which is what puts this viewer in `answer` mode. */
function poll(choices: string[], overrides: Partial<ActivePoll> = {}): ActivePoll {
  return {
    id: 1,
    senderId: 99,
    senderName: 'Presenter',
    q: 'Where is the market going?',
    choices,
    createdAt: new Date(0),
    total: 0,
    totals: choices.map(() => 0),
    answers: [],
    userAnswerChoice: null,
    ...overrides
  };
}

function open(overrides: Record<string, unknown> = {}) {
  const host = document.createElement('div');
  document.body.append(host);
  HOSTS.push(host);

  const component = mount(PollPanel, {
    target: host,
    props: {
      hostElement: host,
      open: true,
      openMode: 'auto',
      restoreToken: 0,
      currentUser: { id: 7 },
      activePoll: poll(['Up', 'Down']),
      savedPolls: [] as SavedPoll[],
      onclose: noop,
      onminimize: noop,
      onalert: noop,
      onconfirm: noop,
      onsave: yes,
      ondelete: yes,
      onsend: yes,
      onanswer: yes,
      onpostresults: yes,
      onend: yes,
      ...overrides
    } as never
  });
  MOUNTED.push(component as Record<string, unknown>);
  flushSync();
  return host;
}

/** The button a member actually presses, found by the words printed on it. */
function buttonSaying(host: HTMLElement, text: string): HTMLButtonElement {
  const found = [...host.querySelectorAll('button')].find((button) =>
    button.textContent?.includes(text)
  );
  expect(found, `no button reading "${text}" was rendered`).toBeDefined();
  return found as HTMLButtonElement;
}

describe('POLL-01 — a poll whose choices repeat still renders its results', () => {
  it('mounts in results mode with two identical choices', () => {
    /*
      The whole assertion is "this does not throw", so the positive control has to come with it:
      `Total Responses:` proves the results body actually rendered rather than the mount quietly
      producing nothing.
    */
    const host = open({
      currentUser: { id: 99 },
      activePoll: poll(['Up', 'Up', 'Sideways'], { senderId: 99 })
    });
    expect(host.textContent).toContain('Total Responses:');
  });

  it('draws one label per repeated choice once the votes arrive', () => {
    /*
      The state the reconciler actually chokes on: two entries with the same key AND both visible.
      With `(datum.label)` this threw; with `(index)` there are two labels reading "Up".
    */
    const host = open({
      currentUser: { id: 99 },
      activePoll: poll(['Up', 'Up'], { senderId: 99, total: 2, totals: [1, 1] })
    });
    const labels = [...host.querySelectorAll('.flot-pie-label')].map((node) =>
      node.textContent?.trim()
    );
    expect(labels).toHaveLength(2);
    expect(labels.every((label) => label?.startsWith('Up'))).toBe(true);
  });

  it('and distinct choices are unaffected — the control on the control', () => {
    const host = open({
      currentUser: { id: 99 },
      activePoll: poll(['Up', 'Down'], { senderId: 99, total: 2, totals: [1, 1] })
    });
    const labels = [...host.querySelectorAll('.flot-pie-label')].map((node) =>
      node.textContent?.trim()
    );
    expect(labels).toHaveLength(2);
  });
});

describe('POLL-02 — a vote the server refused is not reported as cast', () => {
  it('sends the INDEX of the choice pressed', () => {
    /*
      First, because everything below asserts what happens to the ANSWER, and none of it means
      anything if the wrong choice travels. The index is the vote — that is why the choice lists are
      index-keyed — so this is the assertion the rest rests on.
    */
    const onanswer = vi.fn(() => Promise.resolve(true));
    const host = open({ onanswer });
    buttonSaying(host, 'Choose').click();
    expect(onanswer).toHaveBeenCalledWith(0);
  });

  /**
   * Waits for the click handler to FINISH, not merely to start.
   *
   * `vi.waitFor(() => expect(onanswer).toHaveBeenCalled())` resolves the moment the callback is
   * entered, which is before its promise settles and before anything after the `await` has run. A
   * first draft of the two assertions below used exactly that, and **the negative control caught
   * them**: with the defect restored they stayed GREEN, because `onclose` had not been reached yet
   * when the assertion ran. A `not.toHaveBeenCalled()` measured too early passes for free.
   */
  const settled = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    flushSync();
  };

  it('closes the panel when the vote was accepted', async () => {
    const onclose = vi.fn();
    const host = open({ onanswer: () => Promise.resolve(true), onclose });
    buttonSaying(host, 'Choose').click();
    await settled();
    expect(onclose).toHaveBeenCalled();
  });

  it('does NOT close the panel when the vote was refused', async () => {
    /*
      The defect, stated as the member experiences it: they pressed Choose, nothing was recorded,
      and the panel went away as though it had been.
    */
    const onclose = vi.fn();
    const onanswer = vi.fn(() => Promise.resolve(false));
    const host = open({ onanswer, onclose });
    buttonSaying(host, 'Choose').click();
    await settled();
    expect(onanswer).toHaveBeenCalled();
    expect(onclose, 'a refused vote must not close the panel').not.toHaveBeenCalled();
  });

  it('leaves the choices pressable again after a refusal', async () => {
    /*
      `answered` is raised BEFORE the await — that is upstream's own double-click guard (byte
      2,110,624) — so lowering it again on a refusal is what makes the retry possible. Without that
      half, the panel stays open and every further press is swallowed, which is a worse failure than
      the one being fixed.
    */
    const onanswer = vi
      .fn<(choiceIndex: number) => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const host = open({ onanswer });

    buttonSaying(host, 'Choose').click();
    /*
      `waitFor` on the CALL is not enough and the first draft of this test proved it: the call
      happens before the promise settles, so `answered = false` has not run yet and the second click
      is swallowed by the in-flight guard. What has to be waited for is the handler FINISHING, which
      is a turn of the event loop after the promise resolves.
    */
    await settled();
    expect(onanswer).toHaveBeenCalledTimes(1);

    buttonSaying(host, 'Choose').click();
    await vi.waitFor(() => expect(onanswer).toHaveBeenCalledTimes(2));
  });

  it('still refuses a SECOND vote while the first is in flight', async () => {
    /*
      The other side of the same field, and the reason `answered` is not simply moved after the
      await: a member double-clicking Choose must send one vote, not two.
    */
    let settle: ((accepted: boolean) => void) | undefined;
    const onanswer = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          settle = resolve;
        })
    );
    const host = open({ onanswer });

    const button = buttonSaying(host, 'Choose');
    button.click();
    button.click();
    expect(onanswer, 'the in-flight guard is upstream’s own').toHaveBeenCalledTimes(1);

    settle?.(true);
  });
});
