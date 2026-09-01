import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';

import NavbarTalkingIndicator from './components/NavbarTalkingIndicator.svelte';
import { RoomMedia } from './room/media.svelte';

/**
 * `G08` — BOTH ARMS OF THE TALKING INDICATOR RENDER, AND THE FLAG CHOOSES BETWEEN THEM.
 *
 * ## The refusal this replaces, and the one measurement that overturned it
 *
 * `RoomNavbar.svelte` carried a long note headed *"THE IDLE WAVEFORM IS A MEASURED REFUSAL"*. Its
 * conclusion was that building the branch meant *"an image nothing can ever show, or one that always
 * shows. Neither is the reference."* The room rendered `talking.gif` unconditionally and
 * `notalking.png` shipped in `static/assets/images/` with no consumer.
 *
 * Every one of the **ten** occurrences of `presenterTalking` in the pinned v4 bundle was then read:
 *
 * | byte | what is there |
 * | ---: | --- |
 * | 1,114,654 | `this.presenterTalking=!1` — the initialiser |
 * | 1,129,852 | the same, in the second media service |
 * | 1,117,020 | `guiEventBus.subscribe("presenterTalking", () => { this.presenterTalking = !0 })` |
 * | 1,117,129 | `subscribe("presenterNotTalking", () => { this.presenterTalking = !1 })` |
 * | 1,014,971 | `case "presenterTalking": this.guiEventBus.emit("presenterTalking")` — the server switch |
 * | 2,473,920 | `O(8, e.mediaService.presenterTalking ? 8 : 9)` — the gate this file is about |
 *
 * **The reference's own default is FALSE**, so upstream shows the flat line until its server says
 * otherwise — the opposite of what this room was doing. And the signal is a payload-free room
 * command, not something only a server can compute. Both halves of the refusal were wrong, and the
 * feature is one flag, two receivers and a branch.
 *
 * ## Why SSR rather than a mount
 *
 * Nothing here depends on an event firing; what is being asserted is which `<img>` the server sends.
 * `render` from `svelte/server` returns exactly that. Same argument, in the same words, as
 * `room-navbar-render.test.ts`.
 */

const html = (presenterTalking: boolean, anyoneTalking = true): string =>
  render(NavbarTalkingIndicator, {
    props: {
      talkingUsers: [{ userID: 7, mediaValue: { name: 'Ada' } }],
      anyoneTalking,
      presenterTalking,
      noSpeakerText: ' ( No one is speaking )',
      onmutetalkinguser: () => {}
    }
  }).body;

describe('the two arms, and the flag between them', () => {
  it('shows the waveform when the server says a presenter is talking — const 146', () => {
    const body = html(true);
    expect(body).toContain('id="talkingLevelsImg"');
    expect(body).toContain('src="/assets/images/talking.gif"');
    expect(body, 'exactly one arm renders').not.toContain('id="nolevelsImg"');
  });

  it('shows the flat line otherwise — const 148, the arm this room did not have', () => {
    const body = html(false);
    expect(body).toContain('id="nolevelsImg"');
    expect(body).toContain('src="/assets/images/notalking.png"');
    expect(body).not.toContain('id="talkingLevelsImg"');
  });

  it('carries the captured class on both, because it is one const pair', () => {
    for (const body of [html(true), html(false)]) {
      expect(body).toContain('talkingWaveform');
      /* Both consts end `…,1,"talkingWaveform","animated","fadeIn"`. */
      expect(body).toContain('animated');
      expect(body).toContain('fadeIn');
    }
  });

  it('falls back to LPe when nobody has an open microphone at all', () => {
    /* The OUTER gate, which is a different question from `presenterTalking` and stays that way. */
    const body = html(true, false);
    expect(body).toContain('( No one is speaking )');
    expect(body).not.toContain('talkingWaveform');
  });
});

describe('the flag defaults to what the reference defaults to', () => {
  it('is FALSE on a fresh RoomMedia, which is byte 1,114,654 s value', () => {
    /*
      The single fact that overturned the refusal. Asserted on the real class rather than quoted,
      because a default is exactly the kind of thing a later edit changes without noticing.
    */
    expect(new RoomMedia().presenterTalking).toBe(false);
  });

  it('and both directions run through one setter, because the two commands are one flag', () => {
    const media = new RoomMedia();
    media.setPresenterTalking(true);
    expect(media.presenterTalking).toBe(true);
    media.setPresenterTalking(false);
    expect(media.presenterTalking).toBe(false);
  });
});
