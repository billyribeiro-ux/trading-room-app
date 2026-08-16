import { panelDragResize, readPanelBounds } from '$lib/panel-drag';
import type { WebcamPresenter } from '$lib/types';

import type { RoomMedia } from './media.svelte';
import type { RoomMediaTransport } from './media-transport.svelte';

export function setWebcamAudioAttributes(node: HTMLAudioElement) {
  node.setAttribute('autoplay', 'autoplay');
  node.setAttribute('hidden', 'true');
}

export function setAutoplayAttribute(node: HTMLMediaElement) {
  node.setAttribute('autoplay', 'autoplay');
}
/**
 * THE WEBCAM CARDS, and the three attachments that put a stream into an element.
 *
 * Phase 5 slice 21. Six functions, 180 lines, and only TWO collaborators — the cleanest seam left
 * on the page after slice 20, which is what makes it worth taking as its own module rather than
 * folding into the transport.
 *
 * **It renders; it does not capture.** `RoomMediaTransport` acquires the camera and produces it;
 * this decides what a card looks like and which element the resulting `MediaStream` is attached to.
 * The split is the same one `RoomNavbar` already draws against the transport — "it decides what a
 * button LOOKS like; `RoomMedia` says what is true" — applied to the cards instead of the bar.
 *
 * **A plain `.ts`, not `.svelte.ts`, and the same test as `recording.ts`:** nothing here holds a
 * rune. The list of presenters is the transport's `#webcamPresenters`, which is `$state` and stays
 * there; every method on this class is a pure function of what it is handed, or an `{@attach}` that
 * runs against a real element. Naming it `.svelte.ts` would tell the compiler to look for runes and
 * a reader that the module is reactive, and neither is true.
 *
 * **The attachments return their own teardown**, which is the contract `{@attach}` defines and the
 * reason a card can be destroyed without leaving a track pointed at a detached node.
 */
export class RoomWebcams {
  constructor(options: {
    media: RoomMedia;
    mediaTransport: RoomMediaTransport;
    /** Keys each card's saved position. The handle, not the whole load. */
    sessionHandle: () => string;
  }) {
    this.#media = options.media;
    this.#mediaTransport = options.mediaTransport;
    this.#sessionHandle = options.sessionHandle;
  }

  readonly #media: RoomMedia;
  readonly #mediaTransport: RoomMediaTransport;
  readonly #sessionHandle: () => string;

  /**
   * A webcam card's initial placement and its drag/resize, in the order the capture applies them.
   *
   * **Placement** is `resetWebcamPositionsAlt()`, which `app-room` runs 100ms after
   * `newWebcamPresenter`:
   *
   * ```js
   * resetWebcamPositionsAlt() {
   *   const c = $('#mainAreaSplit'), s = c.offset();
   *   let lastX = 0, lastY = 0, idx = 0;
   *   Object.keys(this.webcams).forEach(id => {
   *     const el = $(`#webcamsHolder-${…pID}`);
   *     idx === 0 ? (lastX = s.left + 20, lastY = s.top + 20)
   *               : (lastX = lastX + el.innerWidth() + 5, lastY = s.top + 20);
   *     el.offset({ top: lastY, left: lastX });
   *     idx++;
   *   });
   * }
   * ```
   *
   * So the first card sits 20px in from the TOP-LEFT of `#mainAreaSplit` and each next one tiles
   * to its right with a 5px gap - not bottom-centre, which is what this room had been placing it
   * at by way of an invented wrapper height.
   *
   * **Then** `initDrag()` (1000ms after the card's own `ngOnInit`) applies any stored position
   * over the top and enables the gestures. Running later is what makes a remembered position win,
   * so the stored bounds are checked FIRST here and the default is skipped when one exists -
   * otherwise the card would visibly jump from the default to the stored spot.
   *
   * `cancel: '.closeIcon'` is the one addition. The captured `initDrag()` passes no `cancel`
   * because jQuery UI does not use pointer capture, so a click on the X still reaches it. This
   * room's `makeDraggable` calls `setPointerCapture` on pointerdown, which retargets the pointerup
   * to the card and swallows the click outright - the X simply stopped closing. Excluding the icon
   * from the drag restores the captured behaviour rather than changing it.
   */
  card(presenter: WebcamPresenter, index: number) {
    // `webcam-<sessionID>-<name with spaces underscored>` - the capture keys the position to the
    // PERSON, so it survives the producer id changing on a reconnect.
    const persistKey = `webcam-${this.#sessionHandle()}-${presenter.name.replaceAll(' ', '_')}`;
    const attachGestures = panelDragResize({
      persistKey,
      cancel: '.closeIcon',
      snap: true,
      handles: 'n, e, s, w, ne, se, sw, nw'
    });

    return (node: HTMLElement) => {
      /*
        Zero the margin before anything writes `left`/`top`.

        The captured `.webcamsHolder` carries `margin: 5px`, and the capture positions with
        jQuery's `.offset({top,left})`, whose setter COMPENSATES for margin - it solves for the
        CSS `top`/`left` that lands the border box on the requested point. Writing `left` directly,
        as both the placement below and `makeDraggable` do, does not: the margin is added on top
        every time.

        Measured with it left in place: the first card landed at 25,74 for a requested 20,69, and
        a drag dispatched as +100,+100 moved it +105,+105 - so the card crept 5px further right
        and down on EVERY drag. Removing the margin once, here, makes `left`/`top` mean what the
        capture's `.offset()` means. Nothing else uses that margin: the card is out of flow, so it
        was never spacing it from a sibling.
      */
      node.style.margin = '0';

      if (!readPanelBounds(persistKey)) {
        const container = document.querySelector('#mainAreaSplit');
        if (container) {
          const bounds = container.getBoundingClientRect();
          node.style.position = 'fixed';
          node.style.left = `${bounds.left + 20 + index * (node.offsetWidth + 5)}px`;
          node.style.top = `${bounds.top + 20}px`;
          node.style.right = 'auto';
          node.style.bottom = 'auto';
        }
      }
      return attachGestures(node);
    };
  }

  /**
   * Puts THIS peer's camera into the first webcam card.
   *
   * The card markup was reproduced from the capture as two static placeholders and nothing was
   * ever wired to them, so `toggleWebcam` produced a camera that was genuinely open - the browser
   * reported it in use - with no picture anywhere. `srcObject` cannot be set from markup, so it
   * has to be assigned here.
   *
   * Read the reactive state INSIDE the body, not in the returned teardown: an attachment runs in
   * an effect and re-runs when what it reads changes, and the returned function is the teardown.
   * That distinction is the same one recorded in `ScreenPane.svelte`, where putting the work in
   * the returned function meant the element never got a `srcObject` and nothing threw.
   *
   * `muted` is not optional. This is the presenter's own camera played back to them; unmuted it
   * would feed the room's audio back into the room, and Chrome blocks audible autoplay without a
   * gesture anyway, which would leave the preview frozen on its first frame.
   */
  attachLocal(node: HTMLVideoElement) {
    node.setAttribute('autoplay', 'autoplay');
    node.muted = true;
    node.playsInline = true;

    const stream = this.#media.camMuted ? null : this.#mediaTransport.webcamStream;
    if (node.srcObject !== stream) node.srcObject = stream;

    if (stream) {
      node.play().catch((error: unknown) => {
        // Surfaced rather than swallowed: "no camera" and "camera paused by policy" look the same.
        console.warn('[media] local webcam preview could not play', error);
      });
    }

    return () => {
      node.pause();
      node.srcObject = null;
    };
  }

  /**
   * Puts a REMOTE presenter's camera into their card.
   *
   * The mirror of {@link attachLocalWebcam}. Not muted the way the local preview is: that one is
   * muted because it is your own microphone path played back at you, while a remote presenter is
   * the audio you actually want. `playsInline` and the surfaced `play()` rejection are kept for
   * the same reasons as every other stream in this room.
   */
  attachRemote(producerId: string) {
    return (node: HTMLVideoElement) => {
      node.setAttribute('autoplay', 'autoplay');
      node.playsInline = true;

      const stream = this.#mediaTransport.webcamStreams.get(producerId) ?? null;
      if (node.srcObject !== stream) node.srcObject = stream;

      if (stream) {
        node.play().catch((error: unknown) => {
          console.warn(`[media] remote webcam ${producerId} could not play`, error);
        });
      }

      return () => {
        node.pause();
        node.srcObject = null;
      };
    };
  }

  /**
   * `closeMe()` (`docs/source/components/app-presenter-cams.compiled.js`):
   *
   * ```js
   * closeMe() {
   *   this.muser.isMe ? (this.pStream = null)
   *                   : (this.pStream = null, this.mediaSoupService.hupScreenOfProducer(this.muser));
   *   this.appService.guiEventBus.emit('removeWebcamPresenter', this.muser);
   * }
   * ```
   *
   * The emit is the part that matters: `removePresenterWebcam` calls `container.remove(idx)` and
   * deletes the entry, so the card is DESTROYED, not merely blanked. Dropping this peer out of
   * {@link webcamPresenters} is the same thing here - the `{#each}` removes the node.
   *
   * For ourselves that means turning the camera off, which is what clears `pStream`. The remote
   * branch additionally needs `hupScreenOfProducer`, which is not wired yet.
   */
  closePreview(presenter: WebcamPresenter) {
    // `closeMe()` emits `removeWebcamPresenter` and, for ourselves, does nothing else -
    // `this.muser.isMe ? (this.pStream = null) : ...`. It NEVER calls `stopCam()`, so the camera
    // keeps running and only the preview goes away. Verified against every `stopCam()` call site
    // in the bundle: `toggleCam()`, the soft reset, and the remote `"mutecam"` command. None of
    // them is this.
    this.#mediaTransport.removeWebcamPresenter(presenter.id);
    if (!presenter.isMe) {
      // The remote branch also needs `hupScreenOfProducer(muser)`, which is not wired yet.
      return;
    }
  }
}
