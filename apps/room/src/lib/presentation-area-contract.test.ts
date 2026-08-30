import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';

/**
 * `PA-02` through `PA-08` — the presentation column's wiring and its child order.
 *
 * `PA-01` is BEHAVIOUR and is executed in `room/caption-staleness.test.ts`; only its two ends are
 * read here, because a checker nothing starts and nothing listens to is a checker that does nothing.
 *
 * Four of these rows are ORDER, which is the kind of thing a reader fixes and a later refactor
 * silently undoes, because nothing about the rendered page looks wrong either way. They are pinned
 * by POSITION, and every position is taken from a marker that could not appear twice.
 */

const read = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');

const area = codeOf(
  'components/PresentationArea.svelte',
  read('./components/PresentationArea.svelte')
);
const page = codeOf('routes/+page.svelte', read('../routes/+page.svelte'));
const room = read('./room/create-room.svelte.ts');
const transport = read('./room/media-transport.svelte.ts');

/** Where a marker is, asserted to exist so a typo cannot pass as "earlier than everything". */
function at(source: string, marker: string): number {
  const found = source.indexOf(marker);
  expect(found, `${marker} is gone`).toBeGreaterThan(-1);
  return found;
}

describe('PA-01 — a caption stops being shown when the room falls silent', () => {
  it('is started by the caption that arrives', () => {
    expect(room).toContain('captionStaleness.seen();');
  });

  it('clears the caption, which the port type could not previously express', () => {
    /*
      The type was `(caption: Caption) => void`. Nothing in this room could send the null, so the
      last line anybody spoke stayed over the presentation area for the rest of the session.
    */
    expect(room).toContain('setCurrentCaption: (caption: Caption | null) => void;');
    expect(room).toContain('onStale: () => deps.setCurrentCaption(null)');
  });
});

describe('PA-02 — the overlay X persists, clears, stops and resets', () => {
  /*
    ```js
    hideSpeechRecognition(e) { … preferences.showSpeechRecoOverlay = !1,
      setPreference("showSpeechRecoOverlay", !1), this.showSpeechRecognition = !1,
      this.currentSpeechReco = null, this.lastSpeechRecoEvent = 0, this.stopSpeechChecker(),
      this.speechRecoHistoryMode = !1 }                                       // byte 1,957,245
    ```

    It was `subtitles = false`, a bare private-field write in `RoomPrefs` with no `save()` — so the
    dismissal was forgotten on reload while the navbar checkbox for the SAME preference persisted.
  */
  it('goes through the persisting path', () => {
    const from = at(page, 'function hideSpeechRecognition(): void {');
    const to = page.indexOf('\n  }', from);
    expect(to, 'the function never closes').toBeGreaterThan(from);
    const body = page.slice(from, to);
    expect(body).toContain("prefs.save('showSpeechRecoOverlay', false);");
    expect(body).toContain('currentCaption = null;');
    expect(body).toContain('speechRecoHistoryMode = false;');
    expect(body).toContain('captionStaleness.stop();');
  });

  it('is what the overlay X calls, and the binding that hid it is gone', () => {
    expect(area).toContain('onclose={onhidespeechreco}');
    expect(area).not.toContain('subtitles = $bindable');
    expect(page).toContain('onhidespeechreco={hideSpeechRecognition}');
  });
});

describe('PA-03 — the two screenshare toasts', () => {
  /*
    ```js
    subscribe("addScreenStream", e => { "screen" == e.mode &&
      alertsService.info(e.userName + " started screen sharing") }),
    subscribe("callingScreenStart", e => { e.uid != globals.user.id &&
      alertsService.info("Connecting to " + e.nick + "..."), … })             // byte 1,960,202
    ```
  */
  it('says "Connecting to …" BEFORE the consumer is built', () => {
    /*
      Scoped to `addRemoteScreen`. `const remote = await session.consume(info);` occurs FOUR times in
      this file — screens, webcams, audio — and a bare `indexOf` finds the webcam one, which is 3,800
      characters earlier and makes this assertion fail on correct code. That is the same
      wrong-occurrence trap `gatesAround` hit on 2026-08-30.
    */
    const from = at(transport, 'async addRemoteScreen(');
    const to = at(transport, 'Turns one remote WEBCAM producer into a floating presenter card.');
    const body = transport.slice(from, to);
    const connecting = body.indexOf(
      "this.#toasts.info(`Connecting to ${info.displayName ?? 'Presenter'}...`);"
    );
    const consume = body.indexOf('const remote = await session.consume(info);');
    expect(connecting, 'the connecting toast is gone').toBeGreaterThan(-1);
    expect(consume, 'the consume call is gone').toBeGreaterThan(-1);
    expect(
      connecting,
      'a "connecting" notice after the connection is a second arrival notice'
    ).toBeLessThan(consume);
  });

  it('says "… started screen sharing" only when a stream actually landed', () => {
    /*
      `consume` returns null for a producer already being consumed — the dedupe the server's
      at-least-once `newProducer` requires. Announcing outside the `if` would toast once per
      `getProducers` snapshot.
    */
    const from = at(transport, 'if (remote) {');
    const to = transport.indexOf('\n    }', from);
    expect(to, 'the branch never closes').toBeGreaterThan(from);
    expect(transport.slice(from, to)).toContain(
      "this.#toasts.info(`${info.displayName ?? 'Presenter'} started screen sharing`);"
    );
  });
});

describe('PA-04 — the notes pane has an empty state', () => {
  /*
    `d(43,"div",24), H(44,LSe,5,0,"div")(45,zSe,6,0), u()` with `O(44, globals.sessionNotes ? 45 : 44)`
    — two SLOTS decided by the host, not a branch inside the pane.
  */
  it('renders the heading and the button when there are no notes', () => {
    expect(area).toContain('{#if noteGates.surfaceVisible && data.notes.length === 0}');
    expect(area).toContain('<h3>No Notes to display...</h3>');
    expect(area).toContain('class="btn btn-small btn-primary"');
    expect(area).toContain('onclick={() => notes.requestNewNote()}');
  });

  it('still renders the pane when there are', () => {
    expect(area).toContain('{:else if noteGates.surfaceVisible}');
  });

  it('shares the new-note rule with the strip rather than restating the gate', () => {
    /*
      The interesting half is `editorMounted`: a viewer who may READ notes but not edit them must not
      be handed an editor, and in markup at one of two call sites that rule is one refactor from
      being dropped.
    */
    const notes = read('./room/notes.svelte.ts');
    expect(notes).toContain('requestNewNote(): void {');
    expect(notes).toContain('this.#newNoteOpen = this.#noteGates().editorMounted;');
    expect(notes).toContain('this.requestNewNote();');
  });
});

describe('PA-05 and PA-06 — the webcam strip', () => {
  it('is not rendered on a phone, where the reference host has no strip at all', () => {
    /*
      The mobile host `Z4e` (byte 2,495,149) has four children and none is `app-webcam-holder`; the
      desktop host `q4e` (2,492,999) has five and puts it first. A phone's presentation column is
      short and the reference keeps its height for the presentation.
    */
    expect(area).toContain('{#if !split.isMobileScreen}');
  });

  it('is the FIRST child of the split area on the desktop', () => {
    const strip = at(area, '<WebcamStrip');
    const moderator = at(area, '<ModeratorMessage');
    const positions = at(area, '<PositionsContainer');
    const presentation = at(area, '<app-presentationarea>');
    expect(strip).toBeLessThan(moderator);
    expect(moderator).toBeLessThan(positions);
    expect(positions).toBeLessThan(presentation);
  });
});

describe('PA-07 — the caption overlay is the holder’s LAST child', () => {
  it('comes after the tab strip, the panes and the audio element', () => {
    /*
      `H(86,n2e,…,"app-ytplayer",49)(87,i2e,…,"app-scplayer",50), T(88,"audio",51),
      H(89,u2e,9,7,"div",52), u())` — byte 2,016,249, and that `u()` closes the holder.

      Paint order never cared (`z-index: 9999`). Tab order did: the overlay's three `z-index: 10000`
      buttons came before the whole tab strip, so a viewer tabbing into the column met the caption
      controls before anything they were there to use.
    */
    const overlay = at(area, '<SpeechRecoOverlay');
    expect(at(area, '<MainTabStrip')).toBeLessThan(overlay);
    expect(at(area, 'id="mainTabsContent"')).toBeLessThan(overlay);
    expect(at(area, 'id="mp3player"')).toBeLessThan(overlay);
  });
});

describe('PA-08 — the videoplayer pane comes before the two alert panes', () => {
  it('matches the reference slot order, and its own tab strip', () => {
    /*
      `O(47, hideVideoPlayer && !isP || isP ? 47 : -1), m(), O(48, hasSwingTradeAlerts ? 48 : -1),
      m(), O(49, hasDayTradeAlerts ? 49 : -1)` — byte 2,017,654.

      `MainTabStrip` always kept this order, so before this the strip and the content were ordered
      differently from each other.
    */
    const video = at(area, 'id="videoplayer"');
    const swing = at(area, 'id="swingAlerts"');
    const dayTrade = at(area, 'id="dayTradeAlerts"');
    expect(video).toBeLessThan(swing);
    expect(swing).toBeLessThan(dayTrade);
  });

  it('keeps the panes before files, which is slot 50', () => {
    expect(at(area, 'id="dayTradeAlerts"')).toBeLessThan(at(area, '<FilesPane'));
  });
});
