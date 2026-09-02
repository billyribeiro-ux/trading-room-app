// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';

import { RoomPrefs, decodeSettingsJson } from './prefs.svelte';

/*
  The 27 preferences and the one write path, executed rather than read as text.

  Most of what this class does was previously assertable only by reading `+page.svelte` as a string —
  `settings-preference-wiring-contract.test.ts` walks 26 wires that way and still does, because the
  modal half and the page half are genuinely in those files. What it could never do is RUN the write
  path, and the two defects this class exists to prevent are both runtime ones: a preference that
  changes on screen without reaching the server, and a getter that renders once and then goes stale.
*/

const make = (json: string | null | undefined = '{}') => {
  const persisted: [string, unknown][] = [];
  const sideEffects: [string, unknown][] = [];
  const prefs = new RoomPrefs(json, {
    persist: (key, value) => persisted.push([key, value]),
    onSideEffect: (key, value) => sideEffects.push([key, value])
  });
  return { prefs, persisted, sideEffects };
};

describe('the settings blob decodes without ever throwing', () => {
  it('reads a plain object', () => {
    expect(decodeSettingsJson('{"chatGif":false}')).toEqual({ chatGif: false });
  });

  it('answers {} for malformed JSON, an array, null and undefined', () => {
    /*
      Fails soft on SHAPE and only on shape: a corrupt blob costs one viewer their preferences and
      never the room. Every read narrows the value afterwards, which is why an empty object is a
      safe answer and a thrown error would not be.
    */
    for (const bad of ['{', '[]', 'null', '"a string"', null, undefined]) {
      expect(decodeSettingsJson(bad as string), `decoding ${String(bad)}`).toEqual({});
    }
  });
});

describe('the seeded defaults, which are read from the reference and not chosen', () => {
  it('defaults chatGif ON, because the blob ships it on', () => {
    // `!== false`: absent means enabled. `=== true` here would mute gifs for everybody.
    expect(make('{}').prefs.chatGif).toBe(true);
    expect(make('{"chatGif":false}').prefs.chatGif).toBe(false);
  });

  it('defaults alwaysScrollToBottom OFF, which is the OPPOSITE comparison', () => {
    /*
      The pair that proves there is no house style: the blob ships `alwaysScrollToBottom:!1`, so
      this one is `=== true` and an untouched checkbox leaves a reader in the history they scrolled
      into. `showSpeechRecoOverlay` next door is `!== false` for the same reason in reverse. Getting
      either backwards is a defect that renders perfectly.
    */
    expect(make('{}').prefs.alwaysScrollToBottom).toBe(false);
    expect(make('{"alwaysScrollToBottom":true}').prefs.alwaysScrollToBottom).toBe(true);
  });

  it('defaults subtitles ON, absent or null', () => {
    expect(make('{}').prefs.subtitles).toBe(true);
    expect(make('{"showSpeechRecoOverlay":false}').prefs.subtitles).toBe(false);
  });

  it('keeps the blob available for the reads that are not preferences', () => {
    // ~40 reads in the page are the saved nick, the streaming type, the device id, the volume maps.
    expect(make('{"savedNick":"Bo"}').prefs.loaded.savedNick).toBe('Bo');
  });
});

describe('save() is the only way in, and it does all three things', () => {
  it('mirrors into the snapshot, moves the state, and persists', () => {
    const { prefs, persisted } = make('{}');
    expect(prefs.chatGif).toBe(true);

    prefs.save('chatGif', false);

    expect(prefs.chatGif, 'the state the consumer reads did not move').toBe(false);
    expect(prefs.loaded.chatGif, 'the snapshot was not mirrored').toBe(false);
    expect(persisted, 'the server was not told').toEqual([['chatGif', false]]);
  });

  /*
    THE FIVE ADDED 2026-08-30, and this block exists because a negative control found nothing to fail.

    Four of them had a field, a seed and a getter here and NO `save()` case, so a control writing one
    would have persisted it and left the state this page already read it into unchanged — the setting
    would take effect on the next reload. That is not hypothetical: it is exactly how
    `recordingStartSound` behaved, and the comment beside these cases says so.

    Deleting the `beepOnUserJoin` case left every test in this repository green. The five below are
    what stops that, and they assert all three things `save()` owes a modelled preference: the
    getter moves, the snapshot mirrors, and the server is told.
  */
  it.each([
    ['beepOnUserJoin', (prefs: ReturnType<typeof make>['prefs']) => prefs.beepOnUserJoin],
    ['popupOnUserJoin', (prefs: ReturnType<typeof make>['prefs']) => prefs.popupOnUserJoin],
    ['beepOnUserLeave', (prefs: ReturnType<typeof make>['prefs']) => prefs.beepOnUserLeave],
    ['popupOnUserLeave', (prefs: ReturnType<typeof make>['prefs']) => prefs.popupOnUserLeave],
    [
      'updatePositionsIframe',
      (prefs: ReturnType<typeof make>['prefs']) => prefs.updatePositionsIframe
    ]
  ])('moves %s at once, not on the next reload', (key, read) => {
    const { prefs, persisted } = make('{}');
    // All five seed to ON: `!== false`, which is the reference's own default for each.
    expect(read(prefs), `${key} must default on`).toBe(true);

    prefs.save(key, false);

    expect(read(prefs), 'the state the consumer reads did not move').toBe(false);
    expect(prefs.loaded[key], 'the snapshot was not mirrored').toBe(false);
    expect(persisted, 'the server was not told').toEqual([[key, false]]);
  });

  it('persists even a key it holds no state for', () => {
    // The blob carries far more than the 27 modelled preferences; an unmodelled key must still
    // round-trip rather than being silently dropped because no `if` matched it.
    const { prefs, persisted } = make('{}');
    prefs.save('savedNick', 'Bo');
    expect(prefs.loaded.savedNick).toBe('Bo');
    expect(persisted).toEqual([['savedNick', 'Bo']]);
  });

  it('INVERTS disableVideo, because the checkbox reports "video enabled"', () => {
    /*
      The one case where storing the value as given would be the bug. The modal sends
      `input.checked` under the reference's own preference name and a ticked box means video is ON,
      so `videoDisabled` is the negation. Storing it straight would blank the screens pane for every
      viewer who has video enabled, which is all of them by default.
    */
    const { prefs } = make('{}');
    expect(prefs.videoDisabled).toBe(false);
    prefs.save('disableVideo', false);
    expect(prefs.videoDisabled, 'the inversion was dropped').toBe(true);
    prefs.save('disableVideo', true);
    expect(prefs.videoDisabled).toBe(false);
  });

  it('keeps soundChecks in step for the four that have a checkbox', () => {
    const { prefs } = make('{}');
    prefs.save('alertSoundOn', false);
    expect(prefs.alertSoundOn).toBe(false);
    expect(prefs.soundChecks['alert-donot-disturb']).toBe(false);
  });

  /*
    THE ONE NUMERIC PREFERENCE, and it needs a test here rather than only in `stream-buffer.test.ts`.

    That file proves the CLAMP. This proves the value is real state that a save moves — which is the
    half that was missing, and the reason the control could not work. Deleting the save branch left
    the whole suite green until this test existed.

    It also has to be `$state` rather than a read through `prefs.loaded`: `#loaded` is a plain
    object, so a control reading the blob would never re-render after its own write. That is the trap
    `RoomGates.recordingTooltip` fell into with a different key, and the assertion below is what
    would catch it here.
  */
  it('holds the buffer level as state a save moves, clamped on the way in', () => {
    const { prefs } = make('{}');
    expect(prefs.bufferSizeLevel, 'upstream defaults to Maximum').toBe(3);

    prefs.save('bufferSizeLevel', 1);
    expect(prefs.bufferSizeLevel).toBe(1);
    prefs.save('bufferSizeLevel', 2);
    expect(prefs.bufferSizeLevel).toBe(2);

    // A value no control can produce falls back rather than reaching hls.js as a buffer length.
    prefs.save('bufferSizeLevel', 7);
    expect(prefs.bufferSizeLevel).toBe(3);
  });

  it('seeds the buffer level from the settings blob', () => {
    expect(make('{"bufferSizeLevel":2}').prefs.bufferSizeLevel).toBe(2);
    // …and refuses a blob that carries something the control cannot have written.
    expect(make('{"bufferSizeLevel":"2"}').prefs.bufferSizeLevel).toBe(3);
  });

  it('hands the two non-preference keys back instead of owning them', () => {
    /*
      `chatStyle` writes the room's chat rendering and `roomSplitDir` re-seeds the split geometry.
      Neither is a preference this class should own; a preferences module that reseeded the layout
      would have stopped having a boundary.
    */
    const { prefs, sideEffects } = make('{}');
    prefs.save('roomSplitDir', 'ttb');
    prefs.save('chatStyle', { bgColor: '#000' });
    expect(sideEffects.map(([key]) => key)).toEqual(['roomSplitDir', 'chatStyle']);
  });

  it('calls the side-effect hook for EVERY key, including ones it also stores', () => {
    // The hook decides for itself; filtering here would make this class the arbiter of what the
    // page is allowed to react to.
    const { prefs, sideEffects } = make('{}');
    prefs.save('chatGif', false);
    expect(sideEffects).toEqual([['chatGif', false]]);
  });
});

describe('updateSoundCheck, and the early return that skips persistence', () => {
  const check = (id: string, checked: boolean) =>
    ({ currentTarget: { id, checked } }) as unknown as Event;

  it('does NOT persist do-not-disturb, matching the capture', () => {
    /*
      `app-privchat`'s `setDND()` flips the one global flag and calls no `setPreference`, unlike
      every neighbouring handler. Persisting it here would make a session-only switch permanent.
    */
    const { prefs, persisted } = make('{}');
    prefs.updateSoundCheck(check('app-donot-disturb', true));
    expect(prefs.doNotDisturbOn).toBe(true);
    expect(persisted, 'do-not-disturb must not reach the server').toEqual([]);
  });

  it('persists the mapped ids under their reference preference names', () => {
    const { prefs, persisted } = make('{}');
    prefs.updateSoundCheck(check('qa-donot-disturb', false));
    expect(prefs.soundChecks['qa-donot-disturb']).toBe(false);
    expect(persisted).toEqual([['qaSoundOn', false]]);
  });

  it('stores an unmapped id without persisting it', () => {
    const { prefs, persisted } = make('{}');
    prefs.updateSoundCheck(check('some-other-box', true));
    expect(prefs.soundChecks['some-other-box']).toBe(true);
    expect(persisted).toEqual([]);
  });
});

describe('it is actually reactive — the part no other gate could prove', () => {
  /*
    Mutations and flushes INSIDE `$effect.root`, assertions OUTSIDE it — `room-mtx.svelte.test.ts`
    records both drafts that got this wrong. The negative control is removing `$state` from the
    field under test, which turns only that block red.
  */
  it('re-runs a reader when save() moves a preference', () => {
    const { prefs } = make('{}');
    const seen: boolean[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(prefs.chatGif);
      });
      flushSync();
      prefs.save('chatGif', false);
      flushSync();
    });
    stop();

    expect(seen, 'the getter is not reactive through the write path').toEqual([true, false]);
  });

  it('re-runs a reader for the two that keep a public setter', () => {
    /*
      `doNotDisturbOn` and `subtitles` are the only two the room writes without persisting, and both
      are transient by the reference's own design. They need their own assertion because they are
      the only fields reachable without going through `save`.
    */
    const { prefs } = make('{}');
    const dnd: boolean[] = [];
    const subs: boolean[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        dnd.push(prefs.doNotDisturbOn);
      });
      $effect(() => {
        subs.push(prefs.subtitles);
      });
      flushSync();
      prefs.doNotDisturbOn = true;
      prefs.subtitles = false;
      flushSync();
    });
    stop();

    expect(dnd.at(-1), 'doNotDisturbOn is not reactive').toBe(true);
    expect(subs.at(-1), 'subtitles is not reactive').toBe(false);
  });

  it('re-runs a reader of soundChecks, which is a deep object rather than a scalar', () => {
    // Distinct from the scalars: this one is mutated by KEY, so a `$state.raw` here would render
    // the checkbox once and then never again.
    const { prefs } = make('{}');
    const seen: (boolean | undefined)[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(prefs.soundChecks['qa-donot-disturb']);
      });
      flushSync();
      prefs.save('qaSoundOn', false);
      flushSync();
    });
    stop();

    expect(seen.at(-1), 'soundChecks is not deeply reactive').toBe(false);
    expect(seen.length, 'the effect did not re-run').toBeGreaterThan(1);
  });
});

describe('the write path cannot be bypassed', () => {
  it('exposes no setter for the 25 that must go through save()', () => {
    /*
      The invariant this class exists for, asserted structurally. Before the extraction any code in
      the page could write `chatGif = true` and the preference changed on screen and never reached
      the server, because persistence lived in a function nobody was obliged to call.

      Read off the prototype rather than from source text, so it stays true however the class is
      rewritten.
    */
    const settable = ['doNotDisturbOn', 'subtitles'];
    const guarded = [
      'chatGif',
      'chatBadges',
      'alertSoundOn',
      'qaSoundOn',
      'pushToTalk',
      'enableRTE',
      /* USM-18's pair. The latch in particular: a setter on it would let any code in the page
         un-latch a member and hand them the room default a second time. */
      'smallImagePreview',
      'defaultImagePreview'
    ];

    for (const name of settable) {
      const descriptor = Object.getOwnPropertyDescriptor(RoomPrefs.prototype, name);
      expect(descriptor?.set, `${name} is meant to keep its setter`).toBeTypeOf('function');
    }
    for (const name of guarded) {
      const descriptor = Object.getOwnPropertyDescriptor(RoomPrefs.prototype, name);
      expect(descriptor?.get, `${name} must still be readable`).toBeTypeOf('function');
      expect(descriptor?.set, `${name} must not be writable except through save()`).toBeUndefined();
    }
  });

  it('refuses the write at runtime, not merely at the type level', () => {
    const { prefs } = make('{}');
    // A getter with no setter throws in strict mode, which every module is.
    expect(() => {
      (prefs as unknown as Record<string, unknown>).chatGif = false;
    }).toThrow();
    expect(prefs.chatGif).toBe(true);
  });
});

describe('USM-18 — the image-preview latch, executed', () => {
  /*
    The half of this row that no source-text assertion can reach. `image-preview-latch-contract.test.ts`
    proves the transcription against the bundle and proves this file contains the right lines; what it
    cannot do is show that the latch fires ONCE, that the right half is persisted each time, and that a
    member's own choice survives a room default that disagrees with it. Those are the three ways this
    feature can be wrong while every string in it is correct.
  */

  it('both halves default OFF, because the reference initialises them to !1', () => {
    // `=== true`, unlike `chatGif` next door. Getting this backwards shrinks every image by default.
    const { prefs } = make('{}');
    expect(prefs.smallImagePreview).toBe(false);
    expect(prefs.defaultImagePreview).toBe(false);
    expect(make('{"smallImagePreview":true}').prefs.smallImagePreview).toBe(true);
    expect(make('{"defaultImagePreview":true}').prefs.defaultImagePreview).toBe(true);
  });

  it('applies the room default once, persisting the LATCH and not the flag', () => {
    const { prefs, persisted } = make('{}');
    prefs.latchRoomImagePreview(true);
    expect(prefs.smallImagePreview).toBe(true);
    expect(prefs.defaultImagePreview).toBe(true);
    /* Exactly the reference's asymmetry: `setPreference("defaultImagePreview", …)` and nothing else. */
    expect(persisted).toEqual([['defaultImagePreview', true]]);

    /* Called again in the same session — the guard is the latch, so nothing more is written. */
    prefs.latchRoomImagePreview(true);
    expect(persisted).toEqual([['defaultImagePreview', true]]);
  });

  it('never applies the room default when the room has not set it', () => {
    const { prefs, persisted } = make('{}');
    prefs.latchRoomImagePreview(false);
    expect(prefs.smallImagePreview).toBe(false);
    expect(prefs.defaultImagePreview).toBe(false);
    expect(persisted).toEqual([]);
  });

  it('leaves a member who turned it OFF off, against a room default that says on', () => {
    /*
      THE REASON THE LATCH EXISTS, and the one behaviour that a single flag could not produce. The
      member's stored blob carries the latch, so the room's default is not re-applied on this load
      and their `smallImagePreview: false` stands.
    */
    const { prefs, persisted } = make('{"defaultImagePreview":true,"smallImagePreview":false}');
    prefs.latchRoomImagePreview(true);
    expect(prefs.smallImagePreview).toBe(false);
    expect(persisted).toEqual([]);
  });

  it('the toggle mirrors the flag into the latch and persists only the flag', () => {
    /*
      `smallImagePreviewOnChange`, byte 2,253,020. The mirror is what lets the box act in a room
      whose default is off — without it the conjunction both chat logs render could never be true
      there, and the checkbox would be a control that changes only its own label.
    */
    const { prefs, persisted } = make('{}');
    prefs.save('smallImagePreview', true);
    expect(prefs.smallImagePreview).toBe(true);
    expect(prefs.defaultImagePreview).toBe(true);
    expect(persisted).toEqual([['smallImagePreview', true]]);

    prefs.save('smallImagePreview', false);
    expect(prefs.smallImagePreview).toBe(false);
    expect(prefs.defaultImagePreview).toBe(false);
    expect(persisted).toEqual([
      ['smallImagePreview', true],
      ['smallImagePreview', false]
    ]);
  });

  it('re-runs a reader of the conjunction, which is what both chat logs bind', () => {
    const { prefs } = make('{}');
    const seen: boolean[] = [];
    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(prefs.smallImagePreview && prefs.defaultImagePreview);
      });
    });
    flushSync();
    prefs.latchRoomImagePreview(true);
    flushSync();
    prefs.save('smallImagePreview', false);
    flushSync();
    stop();
    expect(seen).toEqual([false, true, false]);
  });
});
