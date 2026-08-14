import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  `sessData.presenterMsgsOnTheRight` — presenter messages align right, and their reactions with them.

  WHY THIS FILE EXISTS. `RoomMessage.svelte` has carried both consumers since it was written —
  `presenter-msg-right` on the message body and `presenter-reactions-right` on the reaction row —
  and neither was ever fed. The prop defaulted `false`, the page passed nothing, and the owner's
  setting on the manage page did nothing however the room was configured.

  It was caught while auditing the badge gates, not by anything failing. The room-side half then
  turned out to be unguarded too: removing the prop from BOTH call sites left all 866 room tests
  green. That is what these assertions close.

  THE OTHER SIDE OF THE BOUNDARY. Adding a setting to `ROOM_VISIBLE_SETTINGS` is guarded in the
  controller — `room-config-boundary.test.ts` goes red on three assertions if an entry has no
  consumer, and `verify-room-settings-schema.mjs` states the rule outright: adding one is FOUR
  edits, not two. Both halves are needed; a setting the controller sends and the room ignores is a
  value crossing a trust boundary for nothing, which is the exact thing that list is designed to
  prevent.

  THE COUPLING WORTH KNOWING. This is also the FIRST term of the reference's chat-badge gate:

      preferences.chatBadges && !sessData.presenterMsgsOnTheRight && sessData.enableBadges && …

  so with it ON, badges are suppressed regardless of the other three gates. That is upstream's
  coupling, reproduced by `visibleBadges` in `RoomMessage.svelte`, and it is why the setting cannot
  be read as "purely cosmetic alignment".
*/

const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const MESSAGE = readFileSync(new URL('./components/RoomMessage.svelte', import.meta.url), 'utf8');
const CLIENT = readFileSync(new URL('./server/room-config-client.ts', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const pageCode = stripComments(PAGE);
const messageCode = stripComments(MESSAGE);

describe('the room consumes the setting it asked the controller for', () => {
  it('declares it on the settings type, so it is not read off an untyped blob', () => {
    expect(stripComments(CLIENT)).toContain('presenterMsgsOnTheRight?: boolean;');
  });

  it('reads it from sessData, strictly', () => {
    /*
      `=== true` rather than truthiness: an unset setting is absent from the payload entirely — the
      controller omits unset values rather than sending null — and `undefined` must read as off.
    */
    expect(pageCode).toContain(
      'const presenterMessagesOnTheRight = $derived(data.sessData?.presenterMsgsOnTheRight === true);'
    );
  });

  it('passes it to BOTH message lists', () => {
    /*
      The assertion that was missing. Removing the prop from both call sites left every room test
      green, so the setting could have been silently disconnected again at any point.
    */
    const chat = pageCode.indexOf('kind="chat"');
    const alert = pageCode.indexOf('kind="alert"');
    expect(chat, 'the chat list must exist').toBeGreaterThan(-1);
    expect(alert, 'the alert list must exist').toBeGreaterThan(-1);
    expect(pageCode.slice(chat, chat + 200)).toContain('{presenterMessagesOnTheRight}');
    expect(pageCode.slice(alert, alert + 200)).toContain('{presenterMessagesOnTheRight}');
  });

  it('and both consumers are still in the component', () => {
    // If either is deleted the prop becomes dead, and its allow-list entry should go with it.
    expect(messageCode).toContain('presenter-msg-right');
    expect(messageCode).toContain('class:presenter-reactions-right={presenterMessagesOnTheRight}');
  });

  it('suppresses badges when on — upstream’s coupling, not ours', () => {
    expect(messageCode).toContain('!presenterMessagesOnTheRight &&');
  });
});
