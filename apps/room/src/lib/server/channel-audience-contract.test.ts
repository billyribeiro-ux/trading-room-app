// @vitest-environment node
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

/*
  EVERY FRAME THIS HUB SENDS HAS A STATED AUDIENCE, AND A FRAME THAT NAMES A PERSON GOES TO THAT
  PERSON.

  ## Five instances of one defect, found by tracing rather than by guessing

  Over 2026-08-18 and -19 the same mistake turned up five times: the SERVER broadcast to the whole
  room and the BROWSER decided what it was entitled to.

  | frame                        | what every member received                         |
  | ---------------------------- | -------------------------------------------------- |
  | roster `locStr`              | every other member's city                          |
  | roster `email`               | every other member's address                       |
  | `privChat` message           | every private message in the room, in plaintext    |
  | `privCmds` forceReload/unmute| who a presenter had just reloaded or un-muted      |
  | `cmds` remotePresCommand / giveMicScreen | whose microphone was cut, whose rights changed |

  Each was invisible on screen, because each had a correct client-side gate in front of it. Each was
  plainly readable in the network tab. The root standard names the shape exactly: *"Every authority
  decision is made on the server from data the server owns — never asserted by the client, ever, for
  any reason."*

  The fifth was found by asking, after the fourth, what CONNECTS them — and the answer is mechanical:
  **a frame carrying `targetUserId` or `toUserId` is by definition addressed to somebody.** That is
  the rule this file enforces, because a rule stated once catches the sixth instance and a list of
  five does not.

  ## The two halves

  1. Every channel in the `RoomEvent` union is classified `room` or `addressed`. A new channel with
     no entry fails, so adding one is a decision about who may read it rather than a default.
  2. No frame naming a target may be published with `publishToRoom`. `publishToUsers` is the only
     publisher that consults the subscriber map for WHO, and it is the only one allowed to carry a
     target.

  Read from source rather than executed, deliberately: `private-chat-delivery.test.ts` already
  executes the hub and proves a third party receives nothing. What this adds is coverage of the
  places a future frame could be introduced, which no runtime test can enumerate.
*/

const HUB = 'src/lib/server/room-events.ts';
const tracked = execSync("git ls-files 'src/**'", { encoding: 'utf8' }).trim().split('\n');
const serverModules = tracked.filter(
  (file) => file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts')
);

/**
 * Who each channel is for.
 *
 * `room` — the payload is the whole room's business: an alert, a chat message, a screen command
 * everybody acts on, a count.
 *
 * `addressed` — the payload concerns ONE person. Delivery must name them.
 */
const AUDIENCE: Record<string, 'room' | 'addressed'> = {
  // Everybody in the room is entitled to these.
  alerts: 'room',
  chat: 'room',
  roster: 'room',
  cmdsAdmin: 'room',
  /*
    MIXED, and it is the one entry worth reading twice. Most of `cmds` is room-wide — a screen
    focus, a chat-mode change, files changed. Two of its commands are not: `remotePresCommand` and
    `giveMicScreen` both carry `targetUserId`, and `events.svelte.ts` returns early on both unless
    the id is its own. The per-frame rule below is what covers those; classifying the channel
    `addressed` would wrongly forbid the rest.
  */
  cmds: 'room',
  /*
    `room`, and the classification is worth its paragraph because the frame is not identical for
    everybody who gets it.

    WHO IS TYPING IN A CHANNEL IS THE ROOM'S BUSINESS — that is what an indicator above a shared
    composer means, and every member of the channel is entitled to it. What differs per recipient is
    one NAME: `publishTypingToRoom` removes the reader's own, because the frame that would tell you
    about your own keystrokes is the one you just sent.

    That is a REDACTION, not an addressing rule, and the distinction is the same one `roster` makes
    two lines up: `publishRosterToRoom` also builds a frame per listener and also removes fields
    (`locStr`, `email`) that recipient may not see. Both are `room`, because the AUDIENCE is the
    room; `addressed` would say this frame concerns one person, and it does not.
  */
  typing: 'room',
  // Named for what they are, and both were being broadcast until 2026-08-19.
  privChat: 'addressed',
  privCmds: 'addressed'
};

/** Every channel named in the `RoomEvent` union, taken from the type rather than from a list. */
const declaredChannels = (): string[] => {
  const source = readFileSync(HUB, 'utf8');
  const from = source.indexOf('export type RoomEvent');
  expect(from, 'the RoomEvent union must exist').toBeGreaterThan(-1);
  const to = source.indexOf('\ntype Subscriber', from);
  expect(to, 'the union must end').toBeGreaterThan(from);

  const union = source.slice(from, to);
  const found = new Set<string>();
  for (const match of union.matchAll(/channel:\s*'([a-zA-Z]+)'/g)) found.add(match[1]);
  return [...found].sort();
};

describe('every channel has a stated audience', () => {
  const channels = declaredChannels();

  it('found the union, so this file cannot go vacuous', () => {
    expect(channels.length, `found: ${channels.join(', ')}`).toBeGreaterThan(4);
  });

  it('classifies every channel the union declares', () => {
    const unclassified = channels.filter((channel) => !AUDIENCE[channel]);
    expect(
      unclassified,
      `${unclassified.join(', ')} appears in RoomEvent with no audience. Add it to AUDIENCE and say who may read it - "room" if the payload is the whole room's business, "addressed" if it concerns one person. That decision is the point; a default is how locStr, email, the private log and two command frames each shipped.`
    ).toEqual([]);
  });

  it('has no audience entry for a channel that no longer exists', () => {
    const stale = Object.keys(AUDIENCE).filter((channel) => !channels.includes(channel));
    expect(stale, `${stale.join(', ')} is classified but absent from RoomEvent`).toEqual([]);
  });
});

describe('a frame that names a person is delivered to that person', () => {
  /*
    The mechanical half. `targetUserId` and `toUserId` are the two ways this hub addresses somebody,
    and a frame carrying either is addressed whatever channel it rides on — which is what makes this
    catch the two `cmds` commands that the channel-level rule cannot.
  */
  const ADDRESS_FIELDS = ['targetUserId', 'toUserId'];

  it('no addressed frame is published with the room-wide publisher', () => {
    const offenders: string[] = [];

    for (const file of serverModules) {
      if (file === HUB) continue; // the hub declares the type; it does not publish these
      const lines = readFileSync(file, 'utf8').split('\n');

      lines.forEach((line, index) => {
        if (!line.includes('data:')) return;
        if (!ADDRESS_FIELDS.some((field) => line.includes(field))) return;
        /*
          Walk back to the publisher this payload belongs to. Six lines is enough for the longest
          formatted call in this repository and short enough not to reach the previous statement.
        */
        const window = lines.slice(Math.max(0, index - 6), index + 1).join('\n');
        if (!window.includes('publishToUsers')) {
          offenders.push(`${file}:${index + 1} — ${line.trim().slice(0, 72)}`);
        }
      });
    }

    expect(
      offenders,
      `${offenders.join('\n')}\n\nA frame carrying targetUserId or toUserId is addressed to one person. publishToRoom hands the identical object to EVERY listener in the room, leaving the browser to filter - which is how five separate leaks shipped. Use publishToUsers(room, [id], frame).`
    ).toEqual([]);
  });

  it('and the hub still offers the room-wide publisher, so shared channels are unaffected', () => {
    // Narrowing the addressed frames must not have narrowed the ones everybody is entitled to.
    const hub = readFileSync(HUB, 'utf8');
    expect(hub).toContain('export function publishToRoom');
    expect(hub).toContain('export function publishToUsers');
    expect(hub, 'and the per-recipient roster publisher from the day before').toContain(
      'export function publishRosterToRoom'
    );
  });
});
