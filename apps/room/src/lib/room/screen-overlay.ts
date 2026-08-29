import { startAlertOverlay, type AlertOverlayHandle } from '#lib/alert-overlay-compositor.js';

/**
 * `alertsOverlayOnScreenshare` — the LIFECYCLE half: which shares carry an overlay, and for how long.
 *
 * ## Three halves, and this is the one that knows about the room
 *
 * `#lib/alert-overlay-layout.ts` is pure geometry and is unit-tested exhaustively.
 * `#lib/alert-overlay-compositor.ts` is the browser: a canvas, a hidden `<video>`, an interval and a
 * `captureStream`. Neither of them knows what a producer id is, and neither should — the layout has
 * to be testable without a browser and the compositor has to be testable without a room.
 *
 * What is left is this: the SETTING that decides whether a wrap happens at all, the map from
 * producer id to the overlay behind it, and the fan-out of an arriving alert to every share that is
 * currently running. Three responsibilities that only exist because a room has more than one screen.
 *
 * ## Why the wrap is unconditional at the call site
 *
 * {@link wrap} always returns a {@link WrappedScreen}. When the owner has the setting off, when the
 * source is a camera rather than a screen, or when the compositor could not start, the wrapper it
 * returns carries the RAW stream and two no-ops. That is deliberate: `local-capture.svelte.ts` is
 * the most fragile path in the room and the alternative shape is an `if (overlay)` around four
 * separate lines of it, three of which would then have two versions. The branch belongs here, once.
 *
 * ## The producer id does not exist yet when the wrap happens
 *
 * A share is wrapped BEFORE it is published, because the canvas track is the thing being published.
 * So the overlay cannot be keyed by producer id at the moment it is created, and the raw capture's
 * `ended` handler — the presenter pressing the browser's own "Stop sharing" — has no id to pass on
 * either. Both are resolved by {@link WrappedScreen.keep}, which is called once the publish
 * succeeds; until then the ended callback has nothing to call and does nothing, which is correct:
 * a capture that ends before it was ever published has no share to stop.
 */
export class RoomScreenOverlay {
  readonly #enabled: () => boolean;
  /**
   * Producer id to the overlay drawing that share.
   *
   * A plain `Map` and not a `SvelteMap`: nothing renders from it. The only reactive consequence of
   * an overlay is the stream the tab bar already holds, which the capture puts there itself.
   */
  readonly #live = new Map<string, LiveOverlay>();

  constructor(options: { enabled: () => boolean }) {
    this.#enabled = options.enabled;
  }

  /**
   * Put an overlay between a capture and the wire, when the room asked for one.
   *
   * @param raw what `getDisplayMedia` / `getUserMedia` returned.
   * @param source `'camera'` is never wrapped. The setting is "Alerts over SCREENSHARE", and the
   *   reference's compositor is reached only from the display-capture branch of `enableShare`.
   * @param onRawEnded what to do when the presenter ends the capture from the browser's own bar.
   *   It receives the producer id, which is why it cannot fire before {@link WrappedScreen.keep}.
   */
  async wrap(
    raw: MediaStream,
    source: 'screen' | 'camera',
    onRawEnded: (producerId: string) => void
  ): Promise<WrappedScreen> {
    const unwrapped: WrappedScreen = {
      stream: raw,
      keep: () => {},
      detach: () => {},
      abandon: () => {}
    };
    if (source !== 'screen' || !this.#enabled()) return unwrapped;

    let producerId: string | null = null;
    const handle = await startAlertOverlay(raw, () => {
      if (producerId !== null) onRawEnded(producerId);
    });
    // The compositor failed to start. It fails OPEN and says why; the share goes out unadorned.
    if (!handle) return unwrapped;

    /*
      `rename` closes over the SAME `producerId` the ended callback reads, which is what makes
      {@link rekey} correct rather than half-correct: a reconnect that only moved the map entry
      would leave the browser's "Stop sharing" bar pointing at a producer the SFU has closed.
    */
    const live: LiveOverlay = {
      handle,
      rename: (id) => {
        producerId = id;
      }
    };

    return {
      stream: handle.stream,
      keep: (id) => {
        live.rename(id);
        this.#live.set(id, live);
      },
      detach: () => handle.detach(),
      abandon: () => handle.stop()
    };
  }

  /**
   * A reconnect re-published this share under a NEW producer id — `restartLocalScreens`.
   *
   * Without this the overlay stays keyed by the id the SFU has already closed, so the eventual
   * `stopLocalScreen(newId)` releases nothing: the 33ms interval keeps drawing and the raw capture
   * keeps running, which leaves the browser's "sharing your screen" indicator up after the presenter
   * has stopped sharing. Found by re-reading the diff rather than by a test, because a reconnect
   * cannot be provoked here.
   */
  rekey(oldProducerId: string, newProducerId: string): void {
    const live = this.#live.get(oldProducerId);
    if (!live) return;
    this.#live.delete(oldProducerId);
    live.rename(newProducerId);
    this.#live.set(newProducerId, live);
  }

  /**
   * The share is over — stop drawing, and release the canvas, the interval and the raw tracks.
   *
   * Called from `stopLocalScreen`, which is the ONE place a share ends: the browser's Stop-sharing
   * bar routes here through `onRawEnded` above, and so does the room's own control. A no-op for a
   * producer that never had an overlay, which is every share in a room with the setting off.
   */
  release(producerId: string): void {
    const live = this.#live.get(producerId);
    if (!live) return;
    this.#live.delete(producerId);
    live.handle.stop();
  }

  /**
   * An alert arrived. Every share this presenter is running burns it in.
   *
   * ALL of them, not the selected tab: the tab bar is what THIS presenter is looking at, and every
   * screen they are sharing is being watched by somebody else. Showing the alert on one of them
   * would make what a member sees depend on which tab the presenter happened to have open.
   */
  show(alert: { text: string; sender: string }): void {
    for (const live of this.#live.values()) live.handle.show(alert);
  }
}

/** One wrapped capture: the stream to publish, and what to do once its fate is known. */
export interface WrappedScreen {
  /** Publish THIS, not the raw stream. It is the same object when no overlay was created. */
  readonly stream: MediaStream;
  /** The publish succeeded. The overlay is now keyed by this producer id. */
  readonly keep: (producerId: string) => void;
  /**
   * The publish failed but the presenter keeps their local preview.
   *
   * Releases the canvas, the interval and the hidden `<video>` and LEAVES the raw capture running,
   * because that is what this room did before overlays existed. An error path whose behaviour
   * depends on a room setting is worse than either behaviour on its own.
   */
  readonly detach: () => void;
  /** The capture itself failed, or never happened. Release everything, raw tracks included. */
  readonly abandon: () => void;
}

/** One running overlay, and the handle to the producer id its ended callback reports. */
interface LiveOverlay {
  readonly handle: AlertOverlayHandle;
  readonly rename: (producerId: string) => void;
}
