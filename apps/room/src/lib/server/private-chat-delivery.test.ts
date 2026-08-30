// @vitest-environment node
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

import {
  publishToRoom,
  publishToUsers,
  subscribeToRoom,
  type RoomEvent,
  type RosterUser
} from './room-events';
import { tsCodeOf } from '#lib/source-comments.js';

/*
  A PRIVATE MESSAGE REACHES TWO PEOPLE. IT WAS REACHING THE WHOLE ROOM.

  ## The defect, found 2026-08-19 by tracing every publisher in the codebase

  `private-chat.remote.ts` built a message carrying `txt` — the body — and published it three times
  with `publishToRoom`, which hands the identical object to EVERY listener in the room. The only
  thing that made it look private was a line in the browser:

  ```js
  if (priv?.toUserId !== this.#session().user.id) return;
  ```

  A client-side filter over a server-side broadcast. **Every member of a room received every private
  message sent in it, in plaintext**, and their browser discarded the ones not addressed to them.
  Anyone with the network tab open read all of it. The same frame also carried `avt: user.email` —
  the sender's raw address — where every sibling in this codebase sends `hashEmail(...)` and the
  reference's own comparison is `hashEmail(user.email) !== e.avt`.

  This is the third instance of one shape in two days: `locStr`, then `email` on the roster, now the
  private log. The root standard names it exactly — *"Every authority decision is made on the server
  from data the server owns — never asserted by the client, ever, for any reason"* — and private
  chat is its sharpest case, because privacy is the entire product of the feature.

  ## Why this file EXECUTES

  The question is which bytes reach which socket. Only a real hub with real subscribers can answer
  it; a source-text assertion can prove `publishToUsers` is written and cannot prove a third party
  gets nothing.
*/

const person = (id: number, displayName: string): RosterUser =>
  ({
    id,
    userXrefID: String(id),
    displayName,
    email: `user${id}@example.test`,
    avatarUrl: '',
    role: 'member',
    status: 'online',
    emailHash: `hash-${id}`,
    isP: false,
    isFT: false,
    hasAdminChat: false,
    locStr: ''
  }) as RosterUser;

const ROOM = 'private-delivery-probe';
const teardowns: (() => void)[] = [];

const listen = (user: RosterUser | null) => {
  const received: RoomEvent[] = [];
  teardowns.push(subscribeToRoom(ROOM, (event) => received.push(event), user));
  return received;
};

const privateFrames = (received: RoomEvent[]) =>
  received.filter((event) => event.channel === 'privChat');

afterEach(() => {
  while (teardowns.length) teardowns.pop()?.();
});

describe('a private message reaches its two parties and nobody else', () => {
  it('delivers to the addressee', () => {
    // The positive control. Every absence assertion below is vacuous until delivery is shown to work.
    const alice = listen(person(1, 'Alice'));
    listen(person(2, 'Bob'));

    publishToUsers(ROOM, [1], {
      channel: 'privChat',
      data: { toUserId: 1, fromUserId: 2, message: { txt: 'the secret' } as never }
    });

    expect(privateFrames(alice), 'the addressee must receive it').toHaveLength(1);
  });

  it('delivers NOTHING to a third party in the same room', () => {
    const alice = listen(person(1, 'Alice'));
    const bob = listen(person(2, 'Bob'));
    const eavesdropper = listen(person(3, 'Mallory'));

    publishToUsers(ROOM, [1], {
      channel: 'privChat',
      data: { toUserId: 1, fromUserId: 2, message: { txt: 'the secret' } as never }
    });
    publishToUsers(ROOM, [2], {
      channel: 'privChat',
      data: { toUserId: 2, fromUserId: 2, message: { txt: 'the secret' } as never }
    });

    expect(privateFrames(alice), 'the recipient').toHaveLength(1);
    expect(privateFrames(bob), 'the sender’s own copy').toHaveLength(1);
    expect(
      privateFrames(eavesdropper),
      'a third member in the room must receive NOTHING - not a frame it filters, no frame at all'
    ).toEqual([]);
    expect(
      JSON.stringify(eavesdropper),
      'and the body must not appear anywhere in what they were sent'
    ).not.toContain('the secret');
  });

  it('reaches every TAB the addressee holds, because one person is not one socket', () => {
    /*
      `subscribeToRoom` keys presence by person and explicitly supports several connections per
      user — so addressing by id has to mean all of their sockets, or a private message would land
      in whichever tab happened to win.
    */
    const firstTab = listen(person(1, 'Alice'));
    const secondTab = listen(person(1, 'Alice'));
    const other = listen(person(2, 'Bob'));

    publishToUsers(ROOM, [1], {
      channel: 'privChat',
      data: { toUserId: 1, fromUserId: 2, message: { txt: 'hello' } as never }
    });

    expect(privateFrames(firstTab)).toHaveLength(1);
    expect(privateFrames(secondTab), 'the second tab too').toHaveLength(1);
    expect(privateFrames(other)).toEqual([]);
  });

  it('fails CLOSED for an anonymous listener', () => {
    const anonymous = listen(null);
    listen(person(1, 'Alice'));

    publishToUsers(ROOM, [1], {
      channel: 'privChat',
      data: { toUserId: 1, fromUserId: 2, message: { txt: 'hello' } as never }
    });

    expect(
      privateFrames(anonymous),
      'no RosterUser means no id, so it matches nobody and receives nothing'
    ).toEqual([]);
  });

  it('delivers to nobody when the addressee is not in the room', () => {
    // The direction a mistake here has to fail in: silence, never a broadcast.
    const bystander = listen(person(2, 'Bob'));

    publishToUsers(ROOM, [99], {
      channel: 'privChat',
      data: { toUserId: 99, fromUserId: 2, message: { txt: 'hello' } as never }
    });

    expect(privateFrames(bystander)).toEqual([]);
  });

  it('survives a listener that throws, like every other fan-out in the hub', () => {
    teardowns.push(
      subscribeToRoom(
        ROOM,
        () => {
          throw new Error('this connection is gone');
        },
        person(1, 'Alice')
      )
    );
    const secondTab = listen(person(1, 'Alice'));

    expect(() =>
      publishToUsers(ROOM, [1], {
        channel: 'privChat',
        data: { toUserId: 1, fromUserId: 2, message: { txt: 'hello' } as never }
      })
    ).not.toThrow();
    expect(privateFrames(secondTab), 'the surviving socket still got it').toHaveLength(1);
  });

  it('and the room-wide publisher still reaches everyone, so nothing else regressed', () => {
    /*
      `publishToRoom` is correct for a chat message, a screen command, a roster count. This proves
      the fix narrowed the private channel WITHOUT narrowing the shared ones.
    */
    const alice = listen(person(1, 'Alice'));
    const bob = listen(person(2, 'Bob'));

    publishToRoom(ROOM, { channel: 'cmds', data: { cmd: 'filesChanged' } as never });

    expect(alice.filter((event) => event.channel === 'cmds')).toHaveLength(1);
    expect(bob.filter((event) => event.channel === 'cmds')).toHaveLength(1);
  });
});

describe('no route broadcasts a privChat frame', () => {
  /*
    The executable half above proves `publishToUsers` addresses correctly. This proves nothing
    BYPASSES it — a new endpoint reaching for `publishToRoom` with a `privChat` frame would restore
    the leak with every assertion above still green, because those only inspect the addressed path.
  */
  const tracked = execSync("git ls-files 'src/**'", { encoding: 'utf8' }).trim().split('\n');
  const serverModules = tracked.filter(
    (file) => file.endsWith('.ts') && !file.endsWith('.test.ts')
  );

  it('every privChat publish goes through the addressed publisher', () => {
    const offenders: string[] = [];
    for (const file of serverModules) {
      if (file === 'src/lib/server/room-events.ts') continue;
      const lines = readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, index) => {
        if (!line.includes("channel: 'privChat'")) return;
        // Walk back to the publisher this frame belongs to.
        const window = lines.slice(Math.max(0, index - 4), index + 1).join('\n');
        if (!window.includes('publishToUsers')) {
          offenders.push(`${file}:${index + 1} — ${line.trim().slice(0, 70)}`);
        }
      });
    }

    expect(
      offenders,
      `${offenders.join('\n')}\n\nA privChat frame must be published with publishToUsers. publishToRoom hands the identical object to EVERY listener in the room, which is how every member came to receive every private message in plaintext while their browser filtered them out.`
    ).toEqual([]);
  });

  it('EVERY producer of `avt` carries a hash, never an address', () => {
    /*
      ## This assertion read ONE FILE, and the other two shipped the address for weeks
 
      It named `private-chat.remote.ts` — the live broadcast — and that is where the leak was found
      and fixed. `lib/server/private-chat.ts` builds the same field twice more, for the two READ
      paths: `toMessage` on every page of every thread, and `loadConversations` on the tab strip. Both
      read `sender.email` / `peer.email` until 2026-08-30, so a member asking for their own history
      was handed the other participant's raw address, and the tab list carried one per conversation.
 
      Found by reading, while building the gravatar fallback the surface audit's G15 asked for —
      which would have taken this exact value and put it in an outbound URL to gravatar.com.
 
      So the check is now over the FIELD wherever it is produced, not over one file. A fixed
      instance is not a fixed class, and the difference here was two files nobody had looked at.
    */
    const producers = ['src/routes/private-chat.remote.ts', 'src/lib/server/private-chat.ts'];

    const offenders: string[] = [];
    for (const file of producers) {
      /*
        COMMENTS STRIPPED, and this file learned that the hard way: the paragraph above quotes
        `avt: user.email` to say what was wrong, and the first run of this sweep reported the
        explanation as the defect. `dead-export-contract` and `orphan-style-contract` have both been
        corrected for the same shape — prose voting in a source assertion.
      */
      tsCodeOf(readFileSync(file, 'utf8'))
        .split('\n')
        .forEach((line, index) => {
          if (/\bavt:\s*[A-Za-z_$][\w$.]*\.email\b/.test(line)) {
            offenders.push(`${file}:${index + 1} — ${line.trim()}`);
          }
        });
    }
    expect(
      offenders,
      `${offenders.join('\n')}\n\n\`avt\` is the AVATAR KEY. It must be \`hashEmail(...)\` — gravatar's own md5-of-the-lowercased-address — because the value is handed to the other participant's browser and, since 2026-08-30, forwarded into an image URL at gravatar.com.`
    ).toEqual([]);

    /* The positive control: each file must actually hash it, or the sweep above passes vacuously. */
    for (const file of producers) {
      expect(readFileSync(file, 'utf8'), file).toContain('hashEmail(');
    }
  });
});
