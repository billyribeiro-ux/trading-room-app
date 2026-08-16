// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import { RoomDialogs } from './dialogs.svelte';

/*
  Shipped with the extraction, for the reason `room-mtx.svelte.test.ts` records having learned a
  commit too late: nothing else in the toolchain can tell a reactive field from a plain one.

  THREE reactivity assertions and not one, which is the specific lesson that file carries. It found
  that a wiring making `streams` reactive while leaving `selectedTabID` stale would pass a single
  test and still highlight the wrong tab. This class has three independent fields, so a single
  assertion would leave two of them unproven — and the failure would be a dialog that opens once and
  then never again.
*/

describe('all three start closed', () => {
  it('has no alert, confirmation or prompt', () => {
    const dialogs = new RoomDialogs();
    expect(dialogs.alert).toBeNull();
    expect(dialogs.confirmation).toBeNull();
    expect(dialogs.prompt).toBeNull();
  });
});

describe('they STACK, which is why there are three fields and not one', () => {
  it('an alert raised while a prompt is open leaves the prompt alone', () => {
    /*
      The behaviour that refuses the obvious simplification to `open: Dialog | null`. Real paths do
      this: `handleUserAction`'s prompt callbacks raise alerts, and `deleteThisPM` confirms and then
      alerts on failure. Collapsed into one field the second would replace the first, and the reader
      would answer a prompt and watch it disappear with no result.
    */
    const dialogs = new RoomDialogs();
    dialogs.prompt = { title: 'Enter a new username:', value: '', onconfirm: () => {} };
    dialogs.alert = 'Username can only contain letters and numbers';

    expect(dialogs.prompt, 'the alert replaced the prompt').not.toBeNull();
    expect(dialogs.prompt?.title).toBe('Enter a new username:');
    expect(dialogs.alert).toBe('Username can only contain letters and numbers');
  });

  it('a confirmation and an alert coexist', () => {
    const dialogs = new RoomDialogs();
    dialogs.confirmation = { message: 'Delete this?', onconfirm: () => {} };
    dialogs.alert = 'Command failed.';

    expect(dialogs.confirmation).not.toBeNull();
    expect(dialogs.alert).toBe('Command failed.');
  });
});

describe('confirm() closes itself before running the handler', () => {
  it('clears the confirmation FIRST, so the handler can raise its own dialog', () => {
    /*
      The ordering is the whole reason this is a method. Every call site used to build the object by
      hand and had to remember `bootboxConfirmation = null` as the first line of its own `onconfirm`;
      one that forgot left the confirm on screen behind whatever the handler did next — including
      behind an alert the handler raised.
    */
    const dialogs = new RoomDialogs();
    const seenWhileRunning: unknown[] = [];

    dialogs.confirm('Are you sure?', () => {
      seenWhileRunning.push(dialogs.confirmation);
      dialogs.alert = 'Done.';
    });

    expect(dialogs.confirmation, 'confirm() did not store anything').not.toBeNull();
    dialogs.confirmation?.onconfirm();

    expect(seenWhileRunning, 'the dialog was still open when the handler ran').toEqual([null]);
    expect(dialogs.alert, 'the handler could not raise its own dialog').toBe('Done.');
  });

  it('does not run the handler merely by being raised', () => {
    const onconfirm = vi.fn();
    const dialogs = new RoomDialogs();
    dialogs.confirm('Are you sure?', onconfirm);
    expect(onconfirm).not.toHaveBeenCalled();
  });

  it('carries the message through unchanged', () => {
    const dialogs = new RoomDialogs();
    dialogs.confirm('Are you sure you want to reset the room?', () => {});
    expect(dialogs.confirmation?.message).toBe('Are you sure you want to reset the room?');
  });
});

describe('the dismiss branch survives, because not every No is a no-op', () => {
  it('keeps ondismiss when a caller supplies one', () => {
    /*
      `bootbox.confirm(msg, cb)` calls back with `false` for No AND for a dismissal, and
      `getRandomUser()` acts on it — the draw still runs, just without the trials filter. A shape
      that dropped `ondismiss` would turn that into a dead button.
    */
    const ondismiss = vi.fn();
    const dialogs = new RoomDialogs();
    dialogs.confirmation = { message: 'Only select from Trials?', onconfirm: () => {}, ondismiss };

    dialogs.confirmation?.ondismiss?.();
    expect(ondismiss).toHaveBeenCalledOnce();
  });
});

describe('it is actually reactive — one assertion per field', () => {
  /*
    Mutations and flushes INSIDE `$effect.root`, assertions OUTSIDE it. The root is the only place
    effects run, and it swallows a thrown assertion — both halves are recorded as failed drafts in
    `room-mtx.svelte.test.ts`. The negative control for each is deleting `$state` from that field.
  */
  it('re-runs a reader when the alert opens and closes', () => {
    const dialogs = new RoomDialogs();
    const seen: (string | null)[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(dialogs.alert);
      });
      flushSync();
      dialogs.alert = 'Command failed.';
      flushSync();
      dialogs.alert = null;
      flushSync();
    });
    stop();

    expect(seen, 'the alert getter is not reactive').toEqual([null, 'Command failed.', null]);
  });

  it('re-runs a reader when the confirmation changes', () => {
    const dialogs = new RoomDialogs();
    const seen: (string | undefined)[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(dialogs.confirmation?.message);
      });
      flushSync();
      dialogs.confirm('Are you sure?', () => {});
      flushSync();
    });
    stop();

    expect(seen.at(-1), 'the confirmation getter is not reactive').toBe('Are you sure?');
    expect(seen.length, 'the effect did not re-run').toBeGreaterThan(1);
  });

  it('re-runs a reader when the prompt changes', () => {
    const dialogs = new RoomDialogs();
    const seen: (string | undefined)[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(dialogs.prompt?.title);
      });
      flushSync();
      dialogs.prompt = { title: 'Please enter the URL:', value: '', onconfirm: () => {} };
      flushSync();
    });
    stop();

    expect(seen.at(-1), 'the prompt getter is not reactive').toBe('Please enter the URL:');
    expect(seen.length, 'the effect did not re-run').toBeGreaterThan(1);
  });
});
