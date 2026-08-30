// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoomDialogs } from './dialogs.svelte';
import {
  DAY_TRADE_ALERT_FEED,
  type DayTradeAlertAction,
  RoomTradeAlerts,
  SWING_ALERT_FEED,
  type SwingAlertAction,
  type TradeAlertFeed
} from './trade-alerts.svelte';

/*
  The two trade alert feeds, EXECUTED.

  `remote-call-sites-contract.test.ts` proves every action name this class can post still exists on
  the server, and it reads source to do it. What it cannot do is run a mutation, and the three
  decisions slice 15 took only exist at runtime:

  - the log is a one-time SEED, so it stops following `data` — the opposite of `RoomFiles`;
  - `changeMonths` empties the list BEFORE refetching, reproducing the reference's blank flash;
  - `closeImagePaste` revokes the object URL whichever way the dialog closes.

  ## What this file does NOT re-run, and why

  The class docstring's "nine of fourteen pairs are byte-identical" is a measurement taken against
  `+page.svelte` at extraction time, and it CANNOT be re-executed here, because the duplicate it
  measured no longer exists — that was the point of the slice. What is executable is the shape that
  measurement justified: that the two feeds differ in the descriptor and nowhere else, which is the
  first block below.
*/

type Row = { id: number; symbol: string };

const SEED: readonly Row[] = [
  { id: 1, symbol: 'AAPL' },
  { id: 2, symbol: 'MSFT' }
];

const make = (
  options: {
    feed?: TradeAlertFeed<SwingAlertAction>;
    seed?: readonly Row[];
    enabled?: boolean;
    uploadFails?: boolean;
  } = {}
) => {
  let enabled = options.enabled ?? true;
  const dialogs = new RoomDialogs();

  const alerts = new RoomTradeAlerts<Row, SwingAlertAction>({
    dialogs,
    feed: options.feed ?? SWING_ALERT_FEED,
    seed: options.seed ?? SEED,
    enabled: () => enabled,
    uploadImages: () =>
      options.uploadFails
        ? Promise.reject(new Error('upload refused'))
        : Promise.resolve(['https://cdn.test/a.png'])
  });

  return { alerts, dialogs, setEnabled: (next: boolean) => (enabled = next) };
};

/* One fetch stub for the whole file: records the URL, answers with whatever was queued. */
let queued: { ok: boolean; body: unknown }[] = [];
let seen: string[] = [];

beforeEach(() => {
  queued = [];
  seen = [];
  vi.stubGlobal('fetch', (input: string) => {
    seen.push(String(input));
    const next = queued.shift() ?? { ok: true, body: [] };
    return Promise.resolve({
      ok: next.ok,
      json: () => Promise.resolve(next.body),
      text: () => Promise.resolve(JSON.stringify({ type: 'success', status: 200, data: null }))
    } as unknown as Response);
  });
  // jsdom implements neither, and `requestImagePaste` calls both.
  vi.stubGlobal(
    'URL',
    Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn() })
  );
});
afterEach(() => vi.unstubAllGlobals());

describe('the two feeds differ in the descriptor and nowhere else', () => {
  it('carries exactly the five members that were measured to differ', () => {
    /*
      This is the executable half of the extraction's argument. Every difference between the swing
      half and the day trade half of `+page.svelte` was folded into these values; anything a later
      change adds here is one more difference, and adding one should be a decision rather than a
      drift.

      FOUR until 2026-08-30. `send` is the fifth and it was a decision: `submit` used to build its
      own endpoint from the action name — ``fetch(`?/${action}`)`` — so the descriptor did not carry
      anything about writes at all, and that WAS the defect, because the name was assembled at
      runtime and connected to nothing. The mutation is per feed exactly as the read endpoint is,
      and it belongs beside it.
    */
    expect(Object.keys(SWING_ALERT_FEED).sort()).toEqual([
      'endpoint',
      'initialDays',
      'loadFailure',
      'logDays',
      'send'
    ]);
    expect(Object.keys(DAY_TRADE_ALERT_FEED).sort()).toEqual(Object.keys(SWING_ALERT_FEED).sort());
  });

  it('and the two disagree on all five, which is why neither is a default', () => {
    expect(SWING_ALERT_FEED.endpoint).not.toBe(DAY_TRADE_ALERT_FEED.endpoint);
    expect(SWING_ALERT_FEED.loadFailure).not.toBe(DAY_TRADE_ALERT_FEED.loadFailure);
    // 42 and 21 — the load's fixed windows, and NOT `months * 30` in either case.
    expect(SWING_ALERT_FEED.initialDays).toBe(42);
    expect(DAY_TRADE_ALERT_FEED.initialDays).toBe(21);
    expect(SWING_ALERT_FEED.logDays(2)).not.toBe(DAY_TRADE_ALERT_FEED.logDays(2));
    expect(SWING_ALERT_FEED.send).not.toBe(DAY_TRADE_ALERT_FEED.send);
  });
});

describe('the log is a seed, not a thunk', () => {
  it('starts at the value it was constructed with', () => {
    const { alerts } = make();
    expect(alerts.log).toEqual(SEED);
  });

  it('opens on the feed window and asks for it by name', async () => {
    const { alerts } = make();
    await alerts.refresh();
    expect(seen).toEqual(['/api/swing-alerts?days=42']);
  });

  it('uses the other feed entirely when constructed with it', async () => {
    const dialogs = new RoomDialogs();
    const alerts = new RoomTradeAlerts<Row, DayTradeAlertAction>({
      dialogs,
      feed: DAY_TRADE_ALERT_FEED,
      seed: SEED,
      enabled: () => true,
      uploadImages: () => Promise.resolve([])
    });
    await alerts.refresh();
    expect(seen).toEqual(['/api/day-trade-alerts?days=21']);
  });

  it("raises its OWN failure sentence rather than the other feed's", async () => {
    const { alerts } = make();
    queued.push({ ok: false, body: null });
    await expect(alerts.refresh()).rejects.toThrow('Unable to load swing trade alerts.');
  });
});

describe('every public getter is reactive', () => {
  /*
    Mutations and flushes INSIDE `$effect.root`, assertions OUTSIDE it — the root swallows a thrown
    assertion, which is what let an earlier draft of `room-mtx.svelte.test.ts` pass with a
    deliberately false expectation in it.
  */
  it('re-runs a reader when the log is replaced', async () => {
    const { alerts } = make();
    const seenLengths: number[] = [];
    queued.push({ ok: true, body: [{ id: 9, symbol: 'NVDA' }] });
    const stop = $effect.root(() => {
      $effect(() => void seenLengths.push(alerts.log.length));
      flushSync();
    });
    await alerts.refresh();
    flushSync();
    stop();
    expect(seenLengths, 'the log getter is not reactive').toEqual([2, 1]);
  });

  it('re-runs a reader when an upload is requested and cancelled', () => {
    const { alerts } = make();
    const seenPending: boolean[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seenPending.push(alerts.imageUpload !== null));
      flushSync();
      void alerts.requestImageUpload();
      flushSync();
      alerts.cancelImageUpload();
      flushSync();
    });
    stop();
    expect(seenPending, 'the imageUpload getter is not reactive').toEqual([false, true, false]);
  });

  it('re-runs a reader when a paste is offered', () => {
    const { alerts } = make();
    const seenPending: boolean[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seenPending.push(alerts.imagePaste !== null));
      flushSync();
      void alerts.requestImagePaste(new File(['x'], 'a.png', { type: 'image/png' }));
      flushSync();
    });
    stop();
    expect(seenPending, 'the imagePaste getter is not reactive').toEqual([false, true]);
  });

  it('reads the entitlement fresh on every access rather than caching it', () => {
    /*
      The `filesHidden` decision again: a getter over a thunk, not a `$derived` field, so a room
      whose configuration is re-read mid-session cannot leave the tab showing after the owner turned
      the feature off.
    */
    const { alerts, setEnabled } = make({ enabled: true });
    expect(alerts.enabled).toBe(true);
    setEnabled(false);
    expect(alerts.enabled, 'the entitlement is cached rather than re-read').toBe(false);
  });
});

describe('the mutations and the window', () => {
  it('dispatches through the feed and refetches afterwards, in that order', async () => {
    /*
      REWRITTEN when the six actions became remote commands on 2026-08-30.

      It asserted `seen` was `['?/swingAlertMsg', '/api/swing-alerts?days=42']` — one stubbed
      `fetch` recording both the mutation and the refetch, which worked because both were `fetch`.
      The mutation is `feed.send` now, so a stub feed is what records it; the REAL `send` is proven
      by `swing-alerts-contract.test.ts` and `day-trade-alerts-contract.test.ts`, which call the
      commands against a live database.

      The two properties this class owns are unchanged and both are asserted: the action and values
      reach `send` untouched, and the log is refetched for the CURRENT window afterwards — not by
      `invalidateAll()`, which would reset the window to the one the page load always returns.
    */
    const dispatched: [string, unknown][] = [];
    const { alerts } = make({
      feed: {
        ...SWING_ALERT_FEED,
        send: (action, values) => {
          dispatched.push([action, values]);
          // Nothing has been refetched yet at the moment the mutation runs.
          expect(seen).toEqual([]);
          return Promise.resolve();
        }
      }
    });

    await alerts.submit('swingAlertMsg', { symbol: 'AAPL' });

    expect(dispatched).toEqual([['swingAlertMsg', { symbol: 'AAPL' }]]);
    expect(seen).toEqual(['/api/swing-alerts?days=42']);
  });

  it('does NOT refetch when the mutation was refused', async () => {
    /*
      The refusal reaches the pane, which is what shows the presenter what the server actually said.
      A refetch here would redraw the same rows and read as success — and it would also swallow the
      rejection, because `submit` awaits it.
    */
    const { alerts } = make({
      feed: { ...SWING_ALERT_FEED, send: () => Promise.reject(new Error('Presenters only.')) }
    });

    await expect(alerts.submit('swingAlertMsg', { symbol: 'AAPL' })).rejects.toThrow(
      'Presenters only.'
    );
    expect(seen, 'a refused mutation still refetched the log').toEqual([]);
  });

  it('empties the list BEFORE refetching, as the reference does', async () => {
    /*
      Byte 1,993,666 for the day trade half. The blank flash is reproduced deliberately: showing the
      previous window's rows under the new window's label is the alternative, and it is worse.
    */
    const { alerts } = make();
    const lengths: number[] = [];
    queued.push({ ok: true, body: [{ id: 5, symbol: 'TSLA' }] });
    const stop = $effect.root(() => {
      $effect(() => void lengths.push(alerts.log.length));
      flushSync();
    });
    await alerts.changeMonths(3);
    flushSync();
    stop();
    // 2 seeded, 0 while the refetch is in flight, 1 when it lands.
    expect(lengths, 'the list must go blank while the refetch is in flight').toEqual([2, 0, 1]);
    expect(seen).toEqual([`/api/swing-alerts?days=${SWING_ALERT_FEED.logDays(3)}`]);
  });

  it('returns exactly the six editable draft fields, and no more', () => {
    /*
      `swingAlertPayload` and `dayTradeAlertPayload` were two byte-identical functions. The six are
      the editable inputs; `entryDate`, `senderPic` and the rest are read from the row on the SERVER,
      because a client that can send `entryDate` is a client that can backdate an alert.
    */
    const { alerts } = make();
    expect(
      alerts.payload({
        symbol: 'AAPL',
        direction: 'long',
        entryPrice: '1',
        stop: '2',
        target: '3',
        image: 'https://cdn.test/a.png'
      })
    ).toEqual({
      symbol: 'AAPL',
      direction: 'long',
      entryPrice: '1',
      stop: '2',
      target: '3',
      image: 'https://cdn.test/a.png'
    });
  });
});

describe('the image paths', () => {
  it('resolves the waiting promise AND clears the pending record on cancel', async () => {
    /*
      Two writes that must happen together. The page did both inline in the dialog's `onclose`; a
      caller holding a setter could do one and leave a composer waiting forever on a promise nothing
      will settle. `cancelImageUpload` is a receiver for that reason.
    */
    const { alerts } = make();
    const pending = alerts.requestImageUpload();
    expect(alerts.imageUpload).not.toBeNull();
    alerts.cancelImageUpload();
    await expect(pending).resolves.toBeNull();
    expect(alerts.imageUpload, 'the pending record outlived the dialog').toBeNull();
  });

  it('uploads one file and resolves with its url', async () => {
    const { alerts } = make();
    const pending = alerts.requestImageUpload();
    await alerts.completeImageUpload([new File(['x'], 'a.png', { type: 'image/png' })]);
    await expect(pending).resolves.toBe('https://cdn.test/a.png');
  });

  it('surfaces a refused upload and still settles the promise', async () => {
    const { alerts, dialogs } = make({ uploadFails: true });
    const pending = alerts.requestImageUpload();
    await alerts.completeImageUpload([new File(['x'], 'a.png', { type: 'image/png' })]);
    expect(dialogs.alert).toBe('Upload Failed...');
    // Settled with null rather than left hanging — a rejected upload must not wedge the form.
    await expect(pending).resolves.toBeNull();
  });

  it('revokes the preview object URL whichever way the confirmation closes', () => {
    /*
      Leaking one per paste would pin the image bytes for the life of the tab. Both exits are
      tested because `closeImagePaste` is the shared one — the × calls it directly and
      `confirmImagePaste` calls it first.
    */
    const { alerts } = make();
    void alerts.requestImagePaste(new File(['x'], 'a.png', { type: 'image/png' }));
    alerts.closeImagePaste();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
    expect(alerts.imagePaste).toBeNull();
  });

  it('confirming uploads the pasted file and resolves with the url', async () => {
    const { alerts } = make();
    const pending = alerts.requestImagePaste(new File(['x'], 'a.png', { type: 'image/png' }));
    await alerts.confirmImagePaste();
    await expect(pending).resolves.toBe('https://cdn.test/a.png');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
  });
});
