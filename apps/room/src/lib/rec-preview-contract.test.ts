// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoomMedia } from '#lib/room/media.svelte.js';
import { RoomPrefs } from '#lib/room/prefs.svelte.js';

import RecordingPreviewCard from './components/RecordingPreviewCard.svelte';

/*
  `app-rec-preview` — the recording preview card, TRANSCRIBED WHOLE (byte 2,353,188).

  ## What this file said until 2026-09-01, and why every word of it is gone

  It asserted a CONDITIONAL: *"the card may stay handler-less only while it stays unreachable."* The
  card was eleven lines of markup with two inert icons, hidden by `.recsHolderScreen { display: none }`
  with no writer, and the whole argument rested on one recorded blocker — that `recPreviewLocation`
  is a value this repository does not have.

  **That blocker was mis-scoped, and re-measuring it is what dissolved it.** `recPreviewLocation` is
  not a value we lack; it is a value the SERVER sends, by exactly one command — `setRecPreview`, byte
  1,023,704, the only writer of the field anywhere in the bundle — which had simply never been
  transcribed. With that receiver in place the whole component is transcribable: the arming test, the
  six subscriptions, the 1s timer, the drag, and both icons.

  And the part that looked like a gap is not one. This room's server does not send `setRecPreview`,
  so `recPreviewLocation` stays `''`, `armed` stays false and the card is never shown — which is
  precisely what the reference does in a room whose server has not sent it. The gate is doing its
  job. Matching the dump means transcribing the gate, not inventing a value to get past it.

  ## Why this file MOUNTS where it used to read source

  Everything the old file could assert was a string in a `.svelte` file, and the thing that mattered
  most — whether the card can be seen, and by whom — is a runtime question. `render` from
  `svelte/server` cannot answer it either: SSR emits the first frame and no effect, no handler and no
  attachment ever run, and this component is four effects and two handlers.

  So the behaviour is mounted and driven. The source assertions that remain are the ones a mount
  genuinely cannot see: the call site in another component, and the two files at the other end of the
  wire.
*/

const mounted: (() => void)[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()?.();
  vi.useRealTimers();
});

/**
 * A card mounted over real `RoomMedia` and `RoomPrefs`, not over stubs.
 *
 * The classes are cheap to build and they are what the component's gate actually reads; a fake
 * would let this file keep passing through a rename of `roomRecordingPaused` or a change to
 * `recPreviewWindow`'s `!== false` default — the exact polarity `prefs.svelte.ts` records having
 * already caused two defects when it was guessed at.
 */
const render = (over: { isPresenter?: boolean; recPreviewWindow?: boolean } = {}) => {
  const media = new RoomMedia();
  const prefs = new RoomPrefs(JSON.stringify({ recPreviewWindow: over.recPreviewWindow ?? true }), {
    persist: () => {}
  });

  const target = document.createElement('div');
  document.body.append(target);
  const component = mount(RecordingPreviewCard, {
    target,
    props: { media, prefs, isPresenter: over.isPresenter ?? true }
  });
  mounted.push(() => {
    void unmount(component);
    target.remove();
  });

  const holder = () => target.querySelector<HTMLDivElement>('#recLocalPreviewHolder');
  return {
    media,
    prefs,
    target,
    holder,
    /** The card is SEEN when its inline display is set — jQuery's `.show()`, which is what upstream calls. */
    visible: () => holder()?.style.display === 'block'
  };
};

/** The state a reference room is in once its server has sent `setRecPreview` and recording began. */
const armAndRecord = (harness: ReturnType<typeof render>) => {
  harness.media.recPreviewLocation = 'https://rec.example.test/room-42.jpg';
  harness.media.roomRecordingStarted('take-1');
  flushSync();
};

describe('the markup is the capture’s, and it is unconditional', () => {
  /*
    Unconditional because the reference's template is: `ngOnInit`'s gate decides which subscriptions
    exist, never whether the DOM is built. It is also what `captured-css-ancestor-contract` needs —
    `app-rec-preview` is a scoped host in the generated stylesheet, and ten rules hang off it.
  */
  it('renders the host, the holder and the captured title on a card nobody has armed', () => {
    const { target, holder, visible } = render();
    expect(target.querySelector('app-rec-preview'), 'the scoped host must exist').not.toBeNull();
    expect(holder()?.className).toBe('card recsHolderScreen');
    expect(target.textContent).toContain('Recording Preview. (DELAYED UPTO 20s)');
    expect(visible(), 'an unarmed card is never shown').toBe(false);
  });

  it('renders both captured icons, and the expand arm starts on fa-expand', () => {
    const { target } = render();
    expect(target.querySelector('.float-right.p-2 > i')?.className).toBe('fas fa-times text-white');
    expect(target.querySelector('.float-right.p-2.mx-1 > i')?.className).toBe(
      'fas fa-expand text-white'
    );
  });

  it('shows “Recording paused.” while the room is not recording — the -1 arm of O(10, …)', () => {
    const { target } = render();
    expect(target.textContent).toContain('Recording paused.');
    expect(target.querySelector('#recScreenLocalPreview')).toBeNull();
  });
});

describe('the arming test — !videoOnlyMode && isPresenter && recPreviewLocation && recPreviewWindow', () => {
  /*
    Three terms, each denied on its own. `videoOnlyMode` is the fourth and is not represented: it is
    the `r` query parameter, the recording-bot mode, which this room does not implement anywhere —
    `gates.ts`, `private-chat.svelte.ts` and `RoomShell.svelte` each record the same absence — so it
    is constantly false and naming it would be config nothing reads.
  */
  it('a member is never shown the card, however the room is recording', () => {
    const harness = render({ isPresenter: false });
    armAndRecord(harness);
    expect(harness.visible()).toBe(false);
  });

  it('a presenter whose server never sent setRecPreview is never shown it either', () => {
    const harness = render();
    harness.media.roomRecordingStarted('take-1');
    flushSync();
    expect(harness.media.recPreviewLocation, 'the room’s own server sends no such command').toBe(
      ''
    );
    expect(harness.visible()).toBe(false);
  });

  it('a presenter who switched the preference off is never shown it', () => {
    const harness = render({ recPreviewWindow: false });
    armAndRecord(harness);
    expect(harness.visible()).toBe(false);
  });

  it('and with all three, `startRec` shows it — the appEventBus subscription', () => {
    const harness = render();
    armAndRecord(harness);
    expect(harness.visible()).toBe(true);
  });

  /*
    THE SAME THREE DENIALS AGAIN, DRIVEN THROUGH THE OTHER DOOR — and a negative control is what
    demanded them.

    Deleting `armed` from the `recPreviewOpen` effect left all twenty-three cases above GREEN,
    because every arming test drove `startRec` and none drove `showRecPreview`. Upstream an unarmed
    card has no subscriptions at all, so it ignores `reopenRecPreviewWindow` exactly as it ignores
    `startRec`; one gate tested and one not is how a card reappears for a member.

    That the recording menu already refuses to show the entry to an unarmed viewer is not a reason to
    skip these: the gate here is the component's own, the menu's is the menu's, and a component that
    leans on its only current caller is one refactor away from being wrong.
  */
  it('and a member is not shown it by `reopenRecPreviewWindow` either', () => {
    const harness = render({ isPresenter: false });
    armAndRecord(harness);
    harness.media.recPreviewOpen = true;
    flushSync();
    expect(harness.visible()).toBe(false);
  });

  it('nor a presenter whose server sent no location', () => {
    const harness = render();
    harness.media.roomRecordingStarted('take-1');
    harness.media.recPreviewOpen = true;
    flushSync();
    expect(harness.visible()).toBe(false);
  });

  it('nor a presenter who switched the preference off', () => {
    const harness = render({ recPreviewWindow: false });
    armAndRecord(harness);
    harness.media.recPreviewOpen = true;
    flushSync();
    expect(harness.visible()).toBe(false);
  });
});

describe('the four subscriptions, driven', () => {
  it('`stopRec` hides it', () => {
    const harness = render();
    armAndRecord(harness);
    harness.media.roomRecordingStopped();
    flushSync();
    expect(harness.visible()).toBe(false);
  });

  it('`reopenRecPreviewWindow` shows it, `closeRecPreviewWindow` hides it', () => {
    const harness = render();
    harness.media.recPreviewLocation = 'https://rec.example.test/room-42.jpg';
    flushSync();
    expect(harness.visible(), 'armed, but nothing has asked for it yet').toBe(false);

    harness.media.recPreviewOpen = true; // `showRecPreview()` — the flag and the emit are one act
    flushSync();
    expect(harness.visible()).toBe(true);

    harness.media.recPreviewOpen = false; // `hideRecPreview()`
    flushSync();
    expect(harness.visible()).toBe(false);
  });

  it('the close icon hides the card AND clears the flag the menu reads', () => {
    const harness = render();
    armAndRecord(harness);
    harness.media.recPreviewOpen = true;
    flushSync();

    harness.target.querySelector<HTMLElement>('.float-right.p-2')?.click();
    flushSync();
    expect(harness.visible(), 'closePreview() calls .hide()').toBe(false);
    expect(harness.media.recPreviewOpen, 'globals.recPreviewOpen = !1').toBe(false);
  });

  it('and the close STAYS closed while the room goes on recording', () => {
    /*
      THE CASE THAT PROVES `shown` CANNOT BE A `$derived`.

      Any expression over the room's state — `recPreviewOpen || roomRecording`, or anything like it —
      puts the card straight back the moment it is recomputed, because the room is still recording.
      Upstream this is `$("#recLocalPreviewHolder").hide()`: imperative visibility with an identity
      of its own. CLAUDE.md's "an effect that assigns derived state should be a `$derived`" does not
      reach this, and this test is why.
    */
    const harness = render();
    armAndRecord(harness);
    harness.target.querySelector<HTMLElement>('.float-right.p-2')?.click();
    flushSync();
    expect(harness.media.roomRecording, 'the room has NOT stopped recording').toBe(true);
    expect(harness.visible()).toBe(false);
  });

  it('a preference switched off after the card is up does not strand it on screen', () => {
    /*
      The `untrack` around `armed` is what this covers. Were `armed` a tracked dependency of the
      `recPreviewOpen` effect, switching the preference off would re-run it, find `armed` false, take
      the early return, and leave a visible card with nothing able to close it. The preference's real
      path is `preferenceSideEffects` → `closeRecPreviewWindow()`, which clears the flag.
    */
    const harness = render();
    armAndRecord(harness);
    harness.media.recPreviewOpen = true;
    flushSync();
    expect(harness.visible()).toBe(true);

    harness.prefs.save('recPreviewWindow', false);
    harness.media.recPreviewOpen = false; // what `closeRecPreviewWindow()` does
    flushSync();
    expect(harness.visible()).toBe(false);
  });
});

describe('the 1s timer', () => {
  beforeEach(() => vi.useFakeTimers());

  it('paints no src until the interval’s FIRST fire, then a cache-busted one', () => {
    /*
      The reference's `<img>` const carries no `src` — `["id","recScreenLocalPreview",1,
      "recPreviewScreen"]` — and only `startRecTimer` ever sets one, at t+1s. The blank first second
      is transcribed rather than smoothed away.
    */
    const harness = render();
    armAndRecord(harness);
    const img = () => harness.target.querySelector<HTMLImageElement>('#recScreenLocalPreview');
    expect(img(), 'the recording arm of O(10, …) renders the frame').not.toBeNull();
    expect(img()?.getAttribute('src'), 'no src before the first fire').toBeNull();

    vi.advanceTimersByTime(1000);
    flushSync();
    const first = img()?.getAttribute('src') ?? '';
    expect(first.startsWith('https://rec.example.test/room-42.jpg?')).toBe(true);

    vi.advanceTimersByTime(1000);
    flushSync();
    expect(img()?.getAttribute('src'), 'the query is a cache-buster; it must move').not.toBe(first);
  });

  it('stops while paused and starts again on resume — pauseRec / resumeRec', () => {
    const harness = render();
    armAndRecord(harness);
    vi.advanceTimersByTime(1000);
    flushSync();

    harness.media.roomRecordingPauseChanged(true);
    flushSync();
    expect(
      harness.target.querySelector('#recScreenLocalPreview'),
      'the paused arm replaces the frame entirely'
    ).toBeNull();
    expect(harness.target.textContent).toContain('Recording paused.');
    expect(vi.getTimerCount(), 'clearRecTimer()').toBe(0);

    harness.media.roomRecordingPauseChanged(false);
    flushSync();
    expect(vi.getTimerCount(), 'startRecTimer()').toBe(1);
  });

  it('and stops when the card is closed, so a hidden card fetches nothing', () => {
    const harness = render();
    armAndRecord(harness);
    vi.advanceTimersByTime(1000);
    flushSync();
    expect(vi.getTimerCount()).toBe(1);

    harness.target.querySelector<HTMLElement>('.float-right.p-2')?.click();
    flushSync();
    expect(vi.getTimerCount(), 'closePreview() calls clearRecTimer()').toBe(0);
  });
});

describe('expandPreview — the class toggle and the clamp', () => {
  it('swaps the icon and the size class, both ways', () => {
    const harness = render();
    armAndRecord(harness);
    const expand = harness.target.querySelector<HTMLElement>('.float-right.p-2.mx-1');
    const icon = () => harness.target.querySelector('.float-right.p-2.mx-1 > i')?.className;

    expand?.click();
    flushSync();
    expect(harness.holder()?.classList.contains('recsHolderScreen-lg')).toBe(true);
    expect(icon(), 'O(8, expandRecPreview ? 8 : 9)').toBe('fas fa-compress-arrows-alt text-white');

    expand?.click();
    flushSync();
    expect(harness.holder()?.classList.contains('recsHolderScreen-lg')).toBe(false);
    expect(icon()).toBe('fas fa-expand text-white');
  });

  it('clamps a card sitting past 700/520 so expanding cannot push it off-screen', () => {
    const harness = render();
    armAndRecord(harness);
    const holder = harness.holder();
    /*
      jsdom gives every element a zero rect, so the position is stated rather than measured — which
      is the only part of this that a browser would do differently, and the numbers under test are
      the two literals and the two thresholds, not the layout.
    */
    Object.defineProperty(holder!, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 800, top: 600 }) as DOMRect
    });

    harness.target.querySelector<HTMLElement>('.float-right.p-2.mx-1')?.click();
    flushSync();
    expect(holder?.style.left).toBe('678px');
    expect(holder?.style.top).toBe('415px');
  });

  it('and leaves a card inside those bounds where it is', () => {
    const harness = render();
    armAndRecord(harness);
    const holder = harness.holder();
    Object.defineProperty(holder!, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 10, top: 10 }) as DOMRect
    });

    harness.target.querySelector<HTMLElement>('.float-right.p-2.mx-1')?.click();
    flushSync();
    expect(holder?.style.left).toBe('');
    expect(holder?.style.top).toBe('');
  });
});

/*
  Everything below is a fact about ANOTHER file, which a mount of this component cannot reach.

  Read by a path relative to the working directory rather than through `import.meta.url`: under
  jsdom `fileURLToPath(import.meta.url)` throws `The URL must be of scheme file`, which cost a turn
  on `image-upload-dialog-contract.test.ts` before it was recorded.
*/
const source = (path: string) => readFileSync(`src/${path}`, 'utf8');
const strip = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

describe('the wire the card hangs on', () => {
  it('is mounted exactly once, by the overlay layer, with all three props', () => {
    /*
      `RoomOverlays`, not `ModalHost`, since 2026-09-01: the card is not a modal, and that host has
      neither `media` nor `prefs`, so it could not feed the gate the terms it reads.
    */
    const overlays = strip(source('lib/components/RoomOverlays.svelte'));
    expect(overlays.match(/<RecordingPreviewCard\b/g) ?? []).toHaveLength(1);
    expect(overlays).toContain('<RecordingPreviewCard {media} {prefs} {isPresenter} />');
    expect(strip(source('lib/components/ModalHost.svelte'))).not.toContain('RecordingPreviewCard');
  });

  it('`setRecPreview` is transcribed, and it is the only writer of the location', () => {
    /*
      `recording-frames.ts` since 2026-09-01, not the router: the three frames about what is being
      recorded share `RoomMedia`, which is the seam `for-all-broadcasts.ts` records, and transcribing
      all three took `events.svelte.ts` past its ceiling. The ROUTER is asserted separately below,
      because "the module exists" and "anything calls it" are two different facts.
    */
    const events = strip(source('lib/room/recording-frames.ts'));
    expect(events).toContain("command?.cmd === 'setRecPreview'");
    expect(events).toContain("if (typeof command.url === 'string') deps.media.recPreviewLocation");
    expect(strip(source('lib/room/events.svelte.ts'))).toContain('handleRecordingFrame(command, {');

    /*
      The gate on the frame is the assertion, not decoration. `CmdsFrame` types every field optional
      on purpose — "declaring `cmd` required would be asserting, at the type level, something no
      runtime check has established" — so a handler that assigned `command.url` unguarded would put
      `undefined` into a field the card interpolates into a URL.
    */
    const receiverAt = events.indexOf("command?.cmd === 'setRecPreview'");
    expect(receiverAt, 'the receiver must exist for this guard to test anything').toBeGreaterThan(
      -1
    );
    expect(events.slice(receiverAt, receiverAt + 400)).not.toContain('as string');
  });

  it('the menu pair carries the capture’s own two-term gate', () => {
    /*
      `O(9, roomState.isRecording && sessData.recPreviewLocation ? 9 : -1)`, byte 2,476,206, inside
      `YPe` at 2,475,469. Both
      terms: a room that is recording but whose server sent no frame URL renders neither entry, which
      is what the reference does and is why this room shows none.
    */
    const navbar = strip(source('lib/components/RoomNavbar.svelte'));
    expect(navbar).toContain('{#if media.roomRecording && media.recPreviewLocation}');
    expect(navbar).toContain("media.recPreviewOpen ? ' Hide Rec Preview ' : ' Show Rec Preview'");
  });

  it('the two previews keep two flags, and the local one is named as ours', () => {
    /*
      They shared `recPreviewOpen` until 2026-09-01, which meant one menu label standing for two
      unrelated mechanisms: the capture's card, fed by the server's `recPreviewLocation`, and this
      room's window onto a blob its own `MediaRecorder` produced.
    */
    const navbar = strip(source('lib/components/RoomNavbar.svelte'));
    expect(navbar).toContain('{#if media.recordedUrl}');
    expect(navbar).toContain(
      'media.localPreviewOpen ? onhidelocalrecpreview : onshowlocalrecpreview'
    );

    const recording = strip(source('lib/room/recording.ts'));
    expect(recording).toContain('showLocalRecPreview() {');
    expect(recording).toContain('this.#media.localPreviewOpen = true;');
  });

  it('showRecPreview and hideRecPreview carry the capture’s isRecording refusal', () => {
    /*
      COMMENTS STRIPPED, and the strip is the assertion: the methods' own docblock quotes both
      signatures verbatim, so an unstripped read stays green through a rename. That was the eighth
      time in one session a check matched the prose recording it.
    */
    const recording = strip(source('lib/room/recording.ts'));
    for (const method of ['showRecPreview', 'hideRecPreview']) {
      const at = recording.indexOf(`${method}() {`);
      expect(at, `${method} must exist`).toBeGreaterThan(-1);
      expect(recording.slice(at, at + 160)).toContain('if (!this.#media.roomRecording) return;');
    }

    /*
      And the preference's path is the UNGUARDED one, which is the whole reason it is a third method:
      `recPreviewWindowOnChange` (byte 2,250,601) emits `closeRecPreviewWindow` straight to
      `closePreview()`, passing no `isRecording` test. Routed through `hideRecPreview()` it would
      strand a card on screen exactly when the room's recording had already stopped.
    */
    const at = recording.indexOf('closeRecPreviewWindow() {');
    expect(at, 'the unguarded close must exist for this guard to test anything').toBeGreaterThan(
      -1
    );
    expect(recording.slice(at, at + 200)).not.toContain('roomRecording');
    expect(strip(source('lib/room/create-room.svelte.ts'))).toContain(
      'hideRecordingPreview: () => recording.closeRecPreviewWindow()'
    );
  });
});
