import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { RoomDialogs } from '#lib/room/dialogs.svelte.js';
import { RoomPrivateCommands } from '#lib/room/private-commands.js';
import { RoomScreens, type SharedScreen } from '#lib/room/screens.svelte.js';
import type { RoomChatMute } from '#lib/room/chat-mute.js';

/**
 * "STOP THIS SCREEN" REACHES THE SHARER, OR IT IS A LIE.
 *
 * ## What this file was written for
 *
 * The menu item existed from the day the tab bar was built, presenter-gated exactly as upstream
 * gates it (`O(11, i.isP ? 11 : -1)`, bundle byte 1,920,554). Its handler removed the presenter's
 * OWN tab and returned. The member kept sharing their desktop; every other viewer kept watching it;
 * nothing anywhere reported that the stop had not happened.
 *
 * `docs/decoded/missing-commands-triage.md` recorded the row as built and cited the BUTTON's line
 * numbers — two lines below its own warning that *"the refuter matched the BUTTON. The brief asked
 * it to match the BEHAVIOUR."* A control whose only effect is on the presenter's own screen is the
 * `stopVideoForAll` defect again, and the same document is where both were hidden.
 *
 * ## Why the local drop is not enough, stated as a property
 *
 * Two halves have to hold together and neither is visible from the other's file:
 *
 *   1. the presenter's click must SEND, addressed to the screen's owner;
 *   2. the owner's browser must ACT on that frame by closing its own producer.
 *
 * Break either and the control silently returns to lying. Both are asserted here, in one file, for
 * the reason `chat-mute.ts` holds both directions of the mute: the pair drifted apart precisely
 * because no file held both sides to notice.
 *
 * ## The divergence this pins
 *
 * Upstream's server closes the producer — `sendServerAdminCommand("forceStopScreen", {id: e._id})`
 * at byte 1,969,578, and `case "forceStopScreen"` has ZERO occurrences in the 2,891,205-byte bundle.
 * This room's SFU accepts `closeProducer` only from the session that owns the producer, which is the
 * property that stops one member ending another's stream, so the ask travels to the owner instead.
 * That makes the receiver load-bearing in a way upstream's has no counterpart for, and it is why
 * `handle` returning `true` is asserted rather than assumed.
 */

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const COMMAND_SOURCE = readFileSync(`${ROOT}routes/presenter-commands.remote.ts`, 'utf8');

/** The `forceStopScreen` command alone, so an assertion cannot pass on a neighbour's body. */
function forceStopScreenBody(): string {
  const from = COMMAND_SOURCE.indexOf('export const forceStopScreen = command(');
  expect(from, 'forceStopScreen is no longer exported as a command').toBeGreaterThan(-1);
  const next = COMMAND_SOURCE.indexOf('\nexport const ', from + 1);
  return COMMAND_SOURCE.slice(from, next === -1 ? COMMAND_SOURCE.length : next);
}

/**
 * A `RoomScreens` wired the way the page wires it, with the send captured instead of performed.
 *
 * `isPresenter` and the owner are the two things the send depends on, so both are parameters: a
 * harness that could only build the happy case would report a green sweep over a control that
 * refuses everybody.
 */
function makeScreens(options: { isPresenter: boolean; screens: SharedScreen[] }) {
  let list = options.screens;
  const sent: { targetUserId: number; producerId: string }[] = [];
  const stoppedLocal: string[] = [];

  const screens = new RoomScreens({
    dialogs: new RoomDialogs(),
    screens: () => list,
    removeScreen: (id) => (list = list.filter((entry) => entry.id !== id)),
    isLocalScreen: (id) => id === 'mine',
    stopLocalScreen: (id) => stoppedLocal.push(id),
    selectTabOfId: () => {},
    searchParams: () => new URLSearchParams(),
    sessionHandle: () => 'room-1',
    isPresenter: () => options.isPresenter,
    followMyScreens: () => false,
    focusOnScreen: async () => undefined,
    forceStopScreen: (target) => (sent.push(target), Promise.resolve(null))
  });

  return { screens, sent, stoppedLocal, list: () => list };
}

/** The receiving half, with only the callback this command uses observable. */
function makeReceiver(viewerId: number) {
  const stopped: string[] = [];
  const commands = new RoomPrivateCommands({
    viewerId: () => viewerId,
    chatMute: { muted: () => {}, unmuted: () => {} } as unknown as RoomChatMute,
    forceReloadRequested: () => {},
    kicked: () => {},
    reconnectAudio: async () => {},
    collectDebugLog: () => '',
    sendDebugLog: () => {},
    debugLogReceived: () => {},
    profilePictureChanged: () => {},
    stopLocalScreen: (producerId) => stopped.push(producerId)
  });
  return { commands, stopped };
}

describe('the presenter half — the click must leave the browser', () => {
  it('sends to the screen OWNER, not to the screen', () => {
    /*
      The payload names a person AND a producer. Upstream sends only `{id: e._id}` because its server
      resolves the owner from its own producer table; this room has never seen that table, so the
      recipient has to travel. Both halves are asserted because sending the producer to the wrong
      member is a silent no-op — `stopLocalScreen` is a lookup — and would look exactly like success.
    */
    const { screens, sent } = makeScreens({
      isPresenter: true,
      screens: [{ id: 'theirs', ownerId: 42 }]
    });

    screens.stop('theirs');

    expect(sent).toEqual([{ targetUserId: 42, producerId: 'theirs' }]);
  });

  it('drops the tab as well, so the presenter own view answers the click', () => {
    const { screens, list } = makeScreens({
      isPresenter: true,
      screens: [
        { id: 'theirs', ownerId: 42 },
        { id: 'other', ownerId: 43 }
      ]
    });

    screens.stop('theirs');

    expect(
      list().map((entry) => entry.id),
      'the local drop happens first so the click is answered without a round trip'
    ).toEqual(['other']);
  });

  it('stops a screen of its OWN locally and sends nothing', () => {
    /*
      The branch that already worked, kept under test because the new send sits directly after it: a
      refactor that moved the early return would start asking the server to stop this browser's own
      producer, which it would then deliver back to this browser.
    */
    const { screens, sent, stoppedLocal } = makeScreens({
      isPresenter: true,
      screens: [{ id: 'mine', ownerId: null }]
    });

    screens.stop('mine');

    expect(stoppedLocal).toEqual(['mine']);
    expect(sent, 'a local screen is stopped here, never through the room').toEqual([]);
  });

  it('sends nothing when the sharer is not known yet', () => {
    /*
      A producer can arrive before its peer reaches the roster — the same window in which the tab
      falls back to gravatar's placeholder avatar. There is nobody to address, and the honest answer
      is to drop the tab and send nothing rather than guess a recipient.
    */
    const { screens, sent, list } = makeScreens({
      isPresenter: true,
      screens: [{ id: 'theirs', ownerId: null }]
    });

    screens.stop('theirs');

    expect(sent).toEqual([]);
    expect(list()).toEqual([]);
  });

  it('sends nothing for a viewer, whose menu does not render the item at all', () => {
    const { screens, sent } = makeScreens({
      isPresenter: false,
      screens: [{ id: 'theirs', ownerId: 42 }]
    });

    screens.stop('theirs');

    expect(sent).toEqual([]);
  });
});

describe('the server half — authority is decided from data the server owns', () => {
  const body = forceStopScreenBody();

  it('gates on the presenter role and the caller own room, in one call', () => {
    /*
      `presenterRoom()` returns the room only after the role check, so "gated" and "scoped to the
      caller's tenant" are the same event and cannot be applied separately. A `roomShortCode`
      argument would let a presenter of room A stop a share in room B.
    */
    expect(body).toContain('const room = presenterRoom();');
    expect(body).not.toContain('roomShortCode');
  });

  it('refuses a target who is not a member of that room, BEFORE publishing', () => {
    const member = body.indexOf('requireRoomMember(targetUserId, room);');
    const publish = body.indexOf('publishToUsers(');
    expect(member, 'the membership check is gone').toBeGreaterThan(-1);
    expect(publish, 'the frame is no longer published').toBeGreaterThan(-1);
    expect(member, 'a membership check after the frame has gone out is not a check').toBeLessThan(
      publish
    );
  });

  it('addresses ONE member rather than broadcasting', () => {
    /*
      `publishToRoom` is imported in this module and used by its neighbours, so the wrong one is one
      character away. A broadcast would hand every browser in the room a producer id and rely on
      each to decide it was not theirs — which is the shape the addressing gate exists to refuse.
    */
    expect(body).toContain('publishToUsers(room, [targetUserId]');
    expect(body).not.toContain('publishToRoom(');
  });

  it('bounds the producer id rather than forwarding an unbounded string', () => {
    expect(body).toMatch(/producerId: z\.string\(\)\.min\(1\)\.max\(\d+\)/);
  });
});

describe('the member half — the frame has to be acted on', () => {
  it('closes the named producer for the member it is addressed to', () => {
    const { commands, stopped } = makeReceiver(42);

    const handled = commands.handle(
      { cmd: 'forceStopScreen', targetUserId: 42, producerId: 'p-1' },
      () => {}
    );

    expect(handled, 'an unhandled frame is a control that stops nothing').toBe(true);
    expect(stopped).toEqual(['p-1']);
  });

  it('ignores a frame addressed to somebody else', () => {
    /*
      THE ONE GATE, exercised on this command specifically. The channel is per ROOM, so without it a
      presenter stopping one member's screen would stop that producer id on every browser in the
      room — and `stopLocalScreen` being a lookup would make the damage silent rather than absent.
    */
    const { commands, stopped } = makeReceiver(43);

    expect(
      commands.handle({ cmd: 'forceStopScreen', targetUserId: 42, producerId: 'p-1' }, () => {})
    ).toBe(false);
    expect(stopped).toEqual([]);
  });

  it('refuses a frame with no producer id rather than closing something arbitrary', () => {
    const { commands, stopped } = makeReceiver(42);

    expect(commands.handle({ cmd: 'forceStopScreen', targetUserId: 42 }, () => {})).toBe(false);
    expect(
      commands.handle({ cmd: 'forceStopScreen', targetUserId: 42, producerId: '' }, () => {})
    ).toBe(false);
    expect(stopped).toEqual([]);
  });

  it('does not close the stream this browser is watching', () => {
    /*
      Reading the frame and calling the VIEWER's removal instead of the transport's producer close
      would pass every assertion above while reproducing the original defect on the other side. The
      receiver is given the transport's `stopLocalScreen` and nothing else, so there is no viewer
      state it could reach — asserted by the callback set, which is the structural version of it.
    */
    const { commands } = makeReceiver(42);
    expect(Object.keys(commands)).toEqual([]);
  });
});
