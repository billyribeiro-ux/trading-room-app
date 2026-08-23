import { describe, expect, it } from 'vitest';

import { publishChatToRoom, type RoomEvent, type RosterUser, subscribeToRoom } from './room-events';

/*
  A MENTION PIERCES THE HIDDEN-TAB GATE, and the server is what decides it.

  ## The divergence this closes

  A member with `visibilityChangeEnabled` and a hidden tab does not refetch on a chat frame — that
  is what the preference is for. Upstream keeps mentions alive on that branch:

    visibilityChangeEnabled && !appHasFocus ? te.isMention && emit('chatMsg', te) : push(...)

  This room could not, because its mention popup is an `$effect` reading `data.messages`, and
  `data.messages` only changes when the loader runs — exactly what the hidden-tab return skips. So a
  member addressed by name waited until they came back. Found 2026-08-16.

  ## Why the SERVER answers it

  The reference computes `isMention(te)` on the client off `te.txt`, and this room cannot: its
  `subscribe(path)` is per CHANNEL, while this hub's SSE stream is per ROOM. A frame carrying
  message text would put admin chat on every subscriber's wire.

  So the hub answers it, per recipient, against the name each listener joined with. This file is the
  RUNTIME proof of both halves — that the right person is told, and that the text never leaves.
  `chat-popup-contract` reads the same property as source; only an executed fan-out can show what
  each listener actually received.
*/

const member = (id: number, displayName: string): RosterUser => ({
  id,
  userXrefID: `x${id}`,
  displayName,
  email: `${displayName.toLowerCase()}@example.test`,
  avatarUrl: '',
  role: 'member',
  status: '',
  emailHash: `hash${id}`,
  isP: false,
  isFT: false,
  hasAdminChat: false,
  locStr: '',
  hasMic: false,
  hasScreen: false,
  hasCam: false,
  canEditNotes: false
});

/** Subscribe a set of people and hand back what each of them receives. */
const roomWith = (people: (RosterUser | null)[]) => {
  const received = people.map(() => [] as RoomEvent[]);
  const stops = people.map((person, index) =>
    subscribeToRoom('mention-room', (event) => received[index].push(event), person)
  );
  return { received, stop: () => stops.forEach((s) => s()) };
};

describe('the hub decides per recipient, not per room', () => {
  it('tells the person named and nobody else', () => {
    const { received, stop } = roomWith([member(1, 'Ada'), member(2, 'Grace')]);
    publishChatToRoom(
      'mention-room',
      { senderId: 3, senderEmailHash: 'h3', room: 'main' },
      { body: 'hey @ada can you look at this', fromAdmin: false }
    );
    stop();

    const chat = received.map((events) => events.filter((e) => e.channel === 'chat'));
    expect(chat[0].at(-1)).toMatchObject({ isMention: true });
    expect(chat[1].at(-1)).toMatchObject({ isMention: false });
  });

  it('is case-insensitive and needs the trailing space, because it is the same rule as the highlight', () => {
    /*
      `isMentionOf`'s own three details, exercised through the fan-out rather than restated: both
      sides lowercased, and `@bob ` matches where `@bobby` does not. Two copies of a rule this
      fiddly is how one of them drifts — the point of importing it rather than rewriting it here.
    */
    const { received, stop } = roomWith([member(1, 'Bob')]);
    publishChatToRoom(
      'mention-room',
      { senderId: 3 },
      { body: 'ask @BOB about it', fromAdmin: false }
    );
    publishChatToRoom('mention-room', { senderId: 3 }, { body: '@bobby is out', fromAdmin: false });
    stop();

    const chat = received[0].filter((e) => e.channel === 'chat');
    expect(chat[0]).toMatchObject({ isMention: true });
    expect(chat[1]).toMatchObject({ isMention: false });
  });

  it('honours @all only from an admin, which is the half most worth having', () => {
    // Without it a presenter addressing the room mentions no one; with it a member cannot ping
    // everybody by typing three characters.
    const { received, stop } = roomWith([member(1, 'Ada')]);
    publishChatToRoom('mention-room', { senderId: 9 }, { body: '@all standup', fromAdmin: true });
    publishChatToRoom('mention-room', { senderId: 9 }, { body: '@all lunch?', fromAdmin: false });
    stop();

    const chat = received[0].filter((e) => e.channel === 'chat');
    expect(chat[0]).toMatchObject({ isMention: true });
    expect(chat[1]).toMatchObject({ isMention: false });
  });

  it('tells an anonymous listener false rather than throwing', () => {
    /*
      A listener with no identity has no NAME to match, so a by-name mention cannot reach it -
      `isMentionOf` returns false on a missing name by its own guard, and the fan-out must not fall
      over reaching for `displayName`.

      Deliberately not an `@all ` body: that arm needs no name at all, so it would have proved the
      guard was reached rather than that it answered correctly. The first draft used one and passed
      for the wrong reason.
    */
    const { received, stop } = roomWith([null]);
    publishChatToRoom(
      'mention-room',
      { senderId: 3 },
      { body: 'hello @ada there', fromAdmin: true }
    );
    stop();

    expect(received[0].filter((e) => e.channel === 'chat').at(-1)).toMatchObject({
      isMention: false
    });
  });
});

describe('the message text never reaches the wire', () => {
  it('publishes the id, the hash and the channel — and nothing else', () => {
    /*
      THE SECURITY PROPERTY, asserted on what a listener ACTUALLY RECEIVED rather than on the source
      of the publisher.

      `chat-popup-contract` used to check this by grepping the publish helper for the word `body`,
      which stopped being able to tell the difference the moment the helper took a body in order to
      answer the mention question. This looks at the frame instead: whatever the hub reads, the only
      thing that leaves is the payload it was given plus one boolean.
    */
    const { received, stop } = roomWith([member(1, 'Ada')]);
    const secret = 'the admin channel body that must not travel @ada';
    publishChatToRoom(
      'mention-room',
      { senderId: 3, senderEmailHash: 'h3', room: 'admin' },
      { body: secret, fromAdmin: true }
    );
    stop();

    const frame = received[0].filter((e) => e.channel === 'chat').at(-1);
    expect(frame).toBeDefined();
    expect(JSON.stringify(frame)).not.toContain(secret);
    expect(JSON.stringify(frame)).not.toContain('must not travel');
    expect(Object.keys(frame as object).sort()).toEqual(['channel', 'data', 'isMention']);
    expect(Object.keys((frame as { data: object }).data).sort()).toEqual([
      'room',
      'senderEmailHash',
      'senderId'
    ]);
  });

  it('the bit is the only thing that differs between two recipients', () => {
    // If a future edit built a per-listener payload, this is what would catch it carrying anything
    // else that differs — a name, a role, another member's business.
    const { received, stop } = roomWith([member(1, 'Ada'), member(2, 'Grace')]);
    publishChatToRoom(
      'mention-room',
      { senderId: 3, senderEmailHash: 'h3', room: 'main' },
      // A TRAILING SPACE, because `@ada` at the very end of a message does not match - the
      // reference chose that false negative over pinging every `@adam`, and `isMentionOf` keeps it.
      { body: 'morning @ada how are you', fromAdmin: false }
    );
    stop();

    const [a, b] = received.map((events) => events.filter((e) => e.channel === 'chat').at(-1));
    expect((a as { data: unknown }).data).toEqual((b as { data: unknown }).data);
    expect((a as { isMention: boolean }).isMention).not.toBe(
      (b as { isMention: boolean }).isMention
    );
  });
});
