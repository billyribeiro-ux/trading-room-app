// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';

import { RoomDialogs } from './dialogs.svelte';
import { RoomMedia } from './media.svelte';
import { RoomMediaTransport } from './media-transport.svelte';
import { RoomPrefs } from './prefs.svelte';
import { RoomScreens } from './screens.svelte';
import { RoomToasts } from './toasts.svelte';
import { RoomVolume } from './volume.svelte';

/*
  The SFU transport, EXECUTED.

  Six contract tests read this class as source — `media-restart`, `media-reconnect-toast`,
  `media-capture`, `webcam`, `save-data-gate` and `recording-codec` — and between them they pin the
  wire protocol, the toasts and the capture constraints against the reference bundle. None of them
  can run a single line of it, so none of them can see the property this file exists for.

  That property is REACTIVITY, and it is the one that fails silently. A `$state` field demoted to a
  plain field during a refactor renders once, correctly, and then never updates: svelte-check is
  green, the autofixer is green, every source-reading assertion above is green, and the room shows a
  webcam card for a presenter who left. `room-mtx.svelte.test.ts` records exactly that failure and
  the two drafts it took to catch it, including a draft that passed with a deliberately false
  `toEqual([99999])` in it because `$effect.root` had swallowed the throw.

  So the shape here is that file's shape, and it is not negotiable:

    - ONE assertion per independently reactive getter group, because a wiring that makes the tab
      list reactive while leaving the webcam cards stale passes any single check;
    - mutations and `flushSync` INSIDE `$effect.root`;
    - the expectation OUTSIDE it, after `stop()`, because a thrown assertion inside the root is
      swallowed and reports as a pass.
*/

const make = () => {
  const dialogs = new RoomDialogs();
  const toasts = new RoomToasts();
  const media = new RoomMedia();
  const prefs = new RoomPrefs('{}', { persist: () => {} });
  const roomVolume = new RoomVolume({ prefs, soundCloudPlaying: () => false });

  /*
    A real `RoomScreens`, not a stand-in, because the two classes are constructed as a pair on the
    page and the viewer reads the transport's list through a thunk. Wiring it the way the page does
    is what makes this harness able to fail for the same reason the room would — INCLUDING the
    order, which is load-bearing: `screens` is built first and reaches the transport through arrows
    that are not called until something reads them, while the transport takes the viewer by value.
    Building them the other way round throws on the temporal dead zone, which is how this harness
    found out that the page's order is a constraint rather than a preference.
  */
  const screens = new RoomScreens({
    dialogs,
    screens: () => transport.screens,
    removeScreen: (id) => transport.removeScreen(id),
    isLocalScreen: (id) => transport.isLocalScreen(id),
    stopLocalScreen: () => {},
    selectTabOfId: (id) => transport.selectScreenTabOfId(id),
    searchParams: () => new URLSearchParams(),
    sessionHandle: () => 'room',
    isPresenter: () => false,
    followMyScreens: () => false,
    focusOnScreen: async () => undefined
  });

  const transport: RoomMediaTransport = new RoomMediaTransport({
    dialogs,
    toasts,
    media,
    screens,
    session: () => ({
      user: { id: 1, name: 'Ada', role: 'member', hasMic: true, hasCam: true, hasScreen: true },
      handle: 'room',
      connectedUsers: [],
      iceServers: []
    }),
    roomVolume,
    beginSpeech: () => {},
    endSpeech: () => {},
    stopRecording: () => {},
    showScreensTab: () => {},
    checkPermissionState: async () => 'granted',
    closeScreenMenu: () => {},
    videoDeviceId: () => undefined
  } as unknown as ConstructorParameters<typeof RoomMediaTransport>[0]);

  return { transport, screens, toasts };
};

/**
 * Run `mutate` inside an effect root that reads `read`, and hand back every value the reader saw.
 *
 * The reads and the flush happen inside; NOTHING is asserted until the root has been stopped and
 * the array is being inspected from outside it.
 */
const observe = <T>(read: () => T, mutate: () => void): T[] => {
  const seen: T[] = [];
  const stop = $effect.root(() => {
    $effect(() => {
      seen.push(read());
    });
    flushSync();
    mutate();
    flushSync();
  });
  stop();
  return seen;
};

describe('every reactive group actually carries its rune', () => {
  it('the webcam card list re-runs its readers when a presenter arrives and leaves', () => {
    const { transport } = make();
    const seen = observe(
      () => transport.webcamPresenters.length,
      () => {
        transport.addWebcamPresenter({ id: 'p1', name: 'Ada', userID: 1 } as never);
        flushSync();
        transport.removeWebcamPresenter('p1');
      }
    );
    // 0 at subscribe, 1 after the arrival, 0 after the removal. A plain array would give [0].
    expect(seen).toEqual([0, 1, 0]);
  });

  it('the screen tab list re-runs its readers when the list is replaced', () => {
    const { transport } = make();
    /*
      `dropRemoteMedia` ASSIGNS a fresh array rather than emptying in place, which is what makes it
      the honest driver here: a `$state` field notices the new identity, a plain field does not, and
      the assertion cannot be satisfied by the array happening to already be empty.
    */
    const seen = observe(
      () => transport.screens,
      () => transport.dropRemoteMedia()
    );
    expect(seen).toHaveLength(2);
    expect(seen[0]).not.toBe(seen[1]);
  });

  it('the screen streams re-run their readers on set and on clear', () => {
    const { transport } = make();
    const stream = { id: 'a' } as unknown as MediaStream;
    const seen = observe(
      () => transport.screenStreams.size,
      () => {
        transport.screenStreams.set('p1', stream);
        flushSync();
        transport.dropRemoteMedia();
      }
    );
    // A plain Map would give [0] - nothing re-reads it, so the pane never gets its picture.
    expect(seen).toEqual([0, 1, 0]);
  });

  it('the remote audio sinks re-run their readers, which is what mounts the audio element', () => {
    const { transport } = make();
    const stream = { id: 'b' } as unknown as MediaStream;
    /*
      A SEPARATE group from the screens above, and separately asserted for the reason `room-mtx`
      records: the page renders one `<audio>` per key of this map, so a wiring that kept the tab
      bar live while leaving this static would produce a room that shows every screen and plays no
      sound at all. One assertion could not tell those two apart.
    */
    const seen = observe(
      () => transport.remoteAudioStreams.size,
      () => {
        transport.remoteAudioStreams.set('p2', stream);
        flushSync();
        transport.dropRemoteMedia();
      }
    );
    expect(seen).toEqual([0, 1, 0]);
  });

  it('the save-data flag re-runs its readers, because the modal switch renders from it', () => {
    const { transport } = make();
    const seen = observe(
      () => transport.saveData,
      () => {
        // No session is attached, so this exercises the flag and its early return - which is the
        // whole of what a reader can observe, and all this assertion claims.
        void transport.setSaveData(true);
      }
    );
    expect(seen).toEqual([false, true]);
  });
});

describe('the receiver keeps the five collections in step', () => {
  it('clears every guard the three consumers read, not just the visible streams', () => {
    /*
      The RUNTIME half of `media-restart-contract`'s source assertion. That test proves the five
      lines are written; this proves they run together on one call, which is the invariant the
      receiver exists to hold. Clearing four of five is the 2026-08-11 defect: the dedupe guards
      still held every producer id, so the rebuild from `getProducers` consumed nothing and the
      room reconnected to silence.
    */
    const { transport } = make();
    transport.screenStreams.set('p1', { id: 'a' } as unknown as MediaStream);
    transport.remoteAudioStreams.set('p2', { id: 'b' } as unknown as MediaStream);
    transport.webcamStreams.set('p3', { id: 'c' } as unknown as MediaStream);
    transport.audioProducerOwners.set('p2', { userID: 7, name: 'Ada' });
    transport.addWebcamPresenter({ id: 'p3', name: 'Ada', userID: 1 } as never);

    transport.dropRemoteMedia();

    expect(transport.screens).toEqual([]);
    expect(transport.screenStreams.size).toBe(0);
    expect(transport.remoteAudioStreams.size).toBe(0);
    expect(transport.audioProducerOwners.size).toBe(0);
    expect(transport.webcamPresenters).toEqual([]);
  });

  it('empties the presenter list in place, so a held reference sees the change', () => {
    // Reassigning would swap the array every reader is holding - the reason the citation on
    // `dropRemoteMedia` calls this out explicitly.
    const { transport } = make();
    transport.addWebcamPresenter({ id: 'p1', name: 'Ada', userID: 1 } as never);
    const held = transport.webcamPresenters;
    transport.dropRemoteMedia();
    expect(held).toHaveLength(0);
    expect(transport.webcamPresenters).toBe(held);
  });
});
