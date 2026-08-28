import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';

import { db, ensureDatabase } from '#lib/server/db/index.js';
import { messages, users, type User } from '#lib/server/db/schema.js';
import { resetRateLimits } from '#lib/server/rate-limit.js';
import { callRemote, expectSchemaRefusal } from '#lib/server/remote-command-harness.js';
import {
  BUILT_IN_CHAT_TABS,
  MAX_CHAT_TAB_NAME,
  chatTabLabel,
  chatTabsForMember,
  parseChatTabsWithBadges,
  visibleBadgeTabs
} from '#lib/chat-tabs.js';

/*
  ── EXTRA CHAT CHANNELS, BEHIND BADGES ─────────────────────────────────────────────────────────────

  `chatTabsWithBadges` is the first setting to change a TYPE. This room had two chat channels, named
  in three places and held in a closed `ChatTab` union, and the argument for the union was written
  down: a typo in a comparison becomes a compile error. An owner can configure more channels now, so
  the set is per room and per member and cannot be a type at all.

  What the union was never doing is the thing this file mostly asserts. It caught a typo; it never
  asked whether the member naming a channel was allowed to read it, because until now every member
  could read every channel. The reference asks that question in the BROWSER —

      i.badges.every(r => globals.user.badges && globals.user.badges.length > 0
                          && globals.user.badges.includes(r))                       byte 1,007,526

  — and then subscribes its socket to `/sess/{id}/chat/{name}/`, so a member who edits that array in
  a console gets the channel. Every path here asks the SERVER instead: the page load, the send, the
  reply, the older-pages query, and the realtime fan-out.
*/

const controller = {
  settings: {} as Record<string, unknown>,
  badges: {} as Record<string, number[]>
};

vi.mock('#lib/server/room-config-client.js', () => ({
  RoomConfigUnavailable: class RoomConfigUnavailable extends Error {},
  readRoomConfig: async (_request: Request, shortCode: string, email?: string) => ({
    room: {
      shortCode,
      name: `Room ${shortCode}`,
      state: 'open',
      logoUrl: null,
      publicId: null,
      maxUsers: 0
    },
    settings: controller.settings,
    badges: { definitions: {}, byEmailHash: controller.badges },
    locked: [],
    member: {
      displayName: 'stub',
      email: email ?? '',
      role: 2,
      nonPresenter: false,
      isP: false,
      isNonPresenterAdmin: false,
      isFT: false,
      denyArchivesAccess: false,
      restrictPmUser: false,
      muted: false,
      banned: false,
      permissions: {
        hasMic: false,
        hasScreen: false,
        hasCam: false,
        hasAdminChat: false,
        canEditNotes: false
      }
    }
  })
}));

const { sendMessage, replyMessage } = await import('../routes/chat-messages.remote');
const { loadOlderChatMessages } = await import('../routes/log-pages.remote');
const { hashEmail } = await import('#lib/server/connection.js');
const { memberChatChannels } = await import('#lib/server/chat-channels.js');

const ROOM = '5150';
const VIP = 'vip lounge';

const locals = (user: User) =>
  ({ user, sessionId: 'chat-tabs-contract', roomShortCode: ROOM }) as App.Locals;

function account(email: string, role: string): User {
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return existing;
  return db
    .insert(users)
    .values({
      displayName: `tabs ${role}`,
      email,
      role,
      passwordHash: 'scrypt$00$00',
      createdAt: new Date()
    })
    .returning()
    .get();
}

let presenter: User;
let holder: User;
let outsider: User;

beforeAll(() => {
  ensureDatabase();
  presenter = account('tabs-presenter@example.test', 'staff');
  holder = account('tabs-holder@example.test', 'member');
  outsider = account('tabs-outsider@example.test', 'member');
});

beforeEach(() => {
  controller.settings = {};
  controller.badges = {};
  resetRateLimits();
  db.delete(messages).run();
});

/** The room the two members are actually in: one badge channel, one badge, one holder. */
function configureVipLounge() {
  controller.settings = {
    chatTabsWithBadges: JSON.stringify([{ name: VIP, badges: ['7'] }])
  };
  controller.badges = { [hashEmail(holder.email)]: [7] };
}

/* ───────────────────────────── the parser ───────────────────────────── */

describe('parseChatTabsWithBadges', () => {
  it('reads the shape the setting help text shows', () => {
    expect(
      parseChatTabsWithBadges(
        '[{"name":"easy channel","badges":["a","b"]},{"name":"harder channel","badges":["a"]}]'
      )
    ).toEqual([
      { name: 'easy channel', badges: ['a', 'b'] },
      { name: 'harder channel', badges: ['a'] }
    ]);
  });

  /*
    Deny by default, per DOCUMENT: nothing usable comes back, and the room keeps the two channels it
    always had. Every one of these is a value an owner can actually type into a textarea.
  */
  it.each([
    ['absent', undefined],
    ['null', null],
    ['empty', ''],
    ['whitespace', '   '],
    ['not JSON at all', '{oops'],
    ['a JSON object rather than a list', '{"name":"x","badges":[]}'],
    ['a JSON string', '"vip"'],
    ['a number', '7']
  ])('yields nothing for %s', (_label, raw) => {
    expect(parseChatTabsWithBadges(raw as string | null | undefined)).toEqual([]);
  });

  /*
    …and per ENTRY inside a good document, which is `parseReactions`' rule and its reason: one bad
    row must not cost an owner the rest of their configuration. Dropping is the fail-closed
    direction — the channel does not appear, rather than appearing without its gate.
  */
  it('drops only the unusable entries and keeps the rest', () => {
    const raw = JSON.stringify([
      { name: 'good', badges: ['a'] },
      { badges: ['a'] },
      { name: 'no badges key' },
      { name: 'badges is a string', badges: 'a' },
      { name: 'a badge is not a string', badges: [7] },
      { name: 'an empty badge id', badges: [''] },
      { name: '   ', badges: [] },
      'a string entry',
      null,
      ['an array entry'],
      { name: 'also good', badges: [] }
    ]);
    expect(parseChatTabsWithBadges(raw).map((tab) => tab.name)).toEqual(['good', 'also good']);
  });

  /*
    THE COLLISION IS THE ONE THAT MATTERS. A channel's name IS `messages.room`, so an entry called
    `main` would put a badge channel's messages into every member's main log — the opposite of what
    the setting is for, and invisible until somebody noticed their chat in the wrong tab.
  */
  it.each([...BUILT_IN_CHAT_TABS])('refuses a name colliding with the built-in %s', (name) => {
    expect(parseChatTabsWithBadges(JSON.stringify([{ name, badges: [] }]))).toEqual([]);
  });

  it('refuses a duplicate name, keeping the FIRST', () => {
    // Two entries with one name are two gates on one channel, and which one applies would depend on
    // read order. The first wins because it is the one the owner wrote first.
    expect(
      parseChatTabsWithBadges('[{"name":"vip","badges":["a"]},{"name":"vip","badges":[]}]')
    ).toEqual([{ name: 'vip', badges: ['a'] }]);
  });

  it('trims a name and refuses one past the bound', () => {
    expect(parseChatTabsWithBadges('[{"name":"  vip  ","badges":[]}]')).toEqual([
      { name: 'vip', badges: [] }
    ]);
    const tooLong = 'x'.repeat(MAX_CHAT_TAB_NAME + 1);
    expect(parseChatTabsWithBadges(JSON.stringify([{ name: tooLong, badges: [] }]))).toEqual([]);
    const atTheBound = 'x'.repeat(MAX_CHAT_TAB_NAME);
    expect(
      parseChatTabsWithBadges(JSON.stringify([{ name: atTheBound, badges: [] }]))
    ).toHaveLength(1);
  });

  it('refuses a control character in a name', () => {
    /*
      The name reaches a database column, a realtime channel key and a log line, and in none of those
      is a newline or a NUL one value. Built from codepoints here for the same reason the check is a
      codepoint test: a literal control character in a test file is invisible in review.
    */
    for (const code of [0x00, 0x09, 0x0a, 0x0d, 0x1f, 0x7f]) {
      const name = `vip${String.fromCodePoint(code)}lounge`;
      expect(
        parseChatTabsWithBadges(JSON.stringify([{ name, badges: [] }])),
        `U+${code.toString(16)}`
      ).toEqual([]);
    }
  });
});

/* ───────────────────────────── the gate ───────────────────────────── */

describe('visibleBadgeTabs', () => {
  const tabs = [
    { name: 'gold', badges: ['1', '2'] },
    { name: 'silver', badges: ['1'] }
  ];

  it('needs EVERY badge the entry names', () => {
    expect(visibleBadgeTabs(tabs, ['1'], false).map((t) => t.name)).toEqual(['silver']);
    expect(visibleBadgeTabs(tabs, ['1', '2'], false).map((t) => t.name)).toEqual([
      'gold',
      'silver'
    ]);
    expect(visibleBadgeTabs(tabs, [], false)).toEqual([]);
    expect(visibleBadgeTabs(tabs, ['3'], false)).toEqual([]);
  });

  it('and a presenter sees them all', () => {
    // `o = s || globals.isPresenter` — byte 1,007,526.
    expect(visibleBadgeTabs(tabs, [], true).map((t) => t.name)).toEqual(['gold', 'silver']);
  });

  /*
    AN EMPTY BADGE LIST MEANS EVERYONE, and this assertion exists because it looks like a bug.

    `[].every(…)` is `true`, and the `user.badges.length > 0` guard is INSIDE the callback, so it
    never runs for an entry with no badges. An owner who writes `"badges": []` has written a public
    extra channel. Reproduced rather than "fixed": reading it as "nobody" would silently hide a
    channel an owner asked for, and there is no evidence upstream means that.
  */
  it('treats an entry with NO badges as public, which is upstream’s own behaviour', () => {
    expect(visibleBadgeTabs([{ name: 'open', badges: [] }], [], false).map((t) => t.name)).toEqual([
      'open'
    ]);
  });
});

describe('chatTabsForMember', () => {
  it('puts the built-ins first, in the order the owner wrote the rest', () => {
    const raw = '[{"name":"b","badges":[]},{"name":"a","badges":[]}]';
    expect(chatTabsForMember(raw, [], false)).toEqual(['main', 'off-topic', 'b', 'a']);
  });

  it('and a room that configured nothing has exactly the two it always had', () => {
    expect(chatTabsForMember(undefined, [], false)).toEqual([...BUILT_IN_CHAT_TABS]);
    expect(chatTabsForMember('nonsense', ['1'], true)).toEqual([...BUILT_IN_CHAT_TABS]);
  });
});

describe('chatTabLabel', () => {
  it('keeps the captured labels for the built-ins and uses the owner’s name for the rest', () => {
    // `dump-contract.ts` pins `['Main Chat', 'Off Topic']` as the strip the capture rendered.
    expect(chatTabLabel('main')).toBe('Main Chat');
    expect(chatTabLabel('off-topic')).toBe('Off Topic');
    expect(chatTabLabel(VIP)).toBe(VIP);
  });
});

/* ───────────────────────────── the server decides ───────────────────────────── */

describe('memberChatChannels', () => {
  const request = new Request('http://room.test/');

  it('gives a badge holder the channel and everybody else the two built-ins', async () => {
    configureVipLounge();
    expect(await memberChatChannels(request, ROOM, holder)).toEqual(['main', 'off-topic', VIP]);
    expect(await memberChatChannels(request, ROOM, outsider)).toEqual(['main', 'off-topic']);
  });

  it('and a presenter has it without the badge', async () => {
    configureVipLounge();
    expect(await memberChatChannels(request, ROOM, presenter)).toEqual(['main', 'off-topic', VIP]);
  });
});

/* ───────────────────────────── the write paths ───────────────────────────── */

describe('sendMessage', () => {
  it('refuses a channel this member does not hold', async () => {
    /*
      THE POINT OF THE WHOLE FEATURE, asserted against the endpoint rather than the menu: a member
      without the badge cannot post into the channel by naming it, whatever their client renders.
    */
    configureVipLounge();
    await expect(
      callRemote(locals(outsider), () => sendMessage({ body: 'let me in', room: VIP }))
    ).rejects.toMatchObject({ status: 403 });
    expect(db.select().from(messages).all()).toHaveLength(0);
  });

  it('and accepts it from the holder', async () => {
    configureVipLounge();
    await callRemote(locals(holder), () => sendMessage({ body: 'hello', room: VIP }));
    expect(
      db
        .select()
        .from(messages)
        .all()
        .map((row) => row.room)
    ).toEqual([VIP]);
  });

  it('refuses a channel no room configured, with the same status', async () => {
    // Same refusal for "not yours" and "does not exist", so the answer does not enumerate the
    // room's private channels.
    await expect(
      callRemote(locals(holder), () => sendMessage({ body: 'x', room: 'invented' }))
    ).rejects.toMatchObject({ status: 403 });
  });

  it('still bounds the channel name at the schema', async () => {
    // The allow-list moved into the body; the BOUND stayed on the schema, so a value that could
    // never be a channel is refused before a config read happens.
    await expectSchemaRefusal(
      callRemote(locals(holder), () =>
        sendMessage({ body: 'x', room: 'y'.repeat(MAX_CHAT_TAB_NAME + 1) })
      )
    );
    await expectSchemaRefusal(
      callRemote(locals(holder), () => sendMessage({ body: 'x', room: '' }))
    );
  });
});

describe('replyMessage', () => {
  it('refuses a message in a channel this member cannot see', async () => {
    /*
      THE HOLE THIS CLOSED. The reply looks its target up by ROOM and id, not by channel, and then
      inserts into `original.room`. Without a check a member could name the id of a message in a
      badge channel and post a reply INTO that channel, quoting the line they were replying to back
      at the people who can read it.

      A 404 rather than a 403, deliberately: a 403 would confirm the id exists.
    */
    configureVipLounge();
    await callRemote(locals(holder), () => sendMessage({ body: 'members only', room: VIP }));
    const [posted] = db.select().from(messages).all();

    await expect(
      callRemote(locals(outsider), () => replyMessage({ body: 'me too', messageId: posted.id }))
    ).rejects.toMatchObject({ status: 404 });
    expect(db.select().from(messages).all()).toHaveLength(1);
  });

  it('and lets the holder reply', async () => {
    configureVipLounge();
    await callRemote(locals(holder), () => sendMessage({ body: 'members only', room: VIP }));
    const [posted] = db.select().from(messages).all();

    await callRemote(locals(holder), () => replyMessage({ body: 'agreed', messageId: posted.id }));
    expect(db.select().from(messages).all()).toHaveLength(2);
  });
});

describe('loadOlderChatMessages', () => {
  it('refuses a page of a channel this member does not hold', async () => {
    configureVipLounge();
    await expect(
      callRemote(locals(outsider), () => loadOlderChatMessages({ channel: VIP, page: 1 }))
    ).rejects.toMatchObject({ status: 403 });
  });

  it('and serves it to the holder', async () => {
    configureVipLounge();
    await expect(
      callRemote(locals(holder), () => loadOlderChatMessages({ channel: VIP, page: 1 }))
    ).resolves.toEqual([]);
  });
});

/* ───────────────────────────── the fan-out ───────────────────────────── */

const roomEvents = readFileSync(new URL('./server/room-events.ts', import.meta.url), 'utf8');
const eventsRoute = readFileSync(
  new URL('../routes/sess/[room]/events/+server.ts', import.meta.url),
  'utf8'
);

describe('the realtime fan-out is audience-aware', () => {
  /*
    Asserted as SOURCE, in the shape `channel-audience-contract.test.ts` already uses for this hub:
    the behaviour needs an open SSE stream and a live controller, and what has to stay true is that
    both room-wide chat publishers consult the listener's entitlement before enqueuing.
  */
  it('chat and typing both skip a listener without the channel', () => {
    // Both anchors asserted before the slice — `slice(-1)` is one character and every `toContain`
    // below it would then be asking a question about that character. `slice-anchor-contract.ts`.
    const chatAt = roomEvents.indexOf('export function publishChatToRoom');
    expect(chatAt, 'publishChatToRoom must exist for this guard to test anything').toBeGreaterThan(
      -1
    );
    expect(roomEvents.slice(chatAt)).toContain('if (!context.chatChannels.has(channel)) continue;');

    const typingAt = roomEvents.indexOf('export function publishTypingToRoom');
    expect(typingAt, 'publishTypingToRoom must exist').toBeGreaterThan(-1);
    expect(roomEvents.slice(typingAt)).toContain(
      'if (!context.chatChannels.has(chatChannel)) continue;'
    );
  });

  it('the entitlement is resolved on the server when the stream opens', () => {
    expect(eventsRoute).toContain('memberChatChannels(request, room, user)');
    /*
      And it FAILS SOFT to the built-in pair. The config read here is already allowed to fail without
      taking the realtime channel down — see the route — and a failed read must withhold a badge
      channel rather than grant one.
    */
    expect(eventsRoute).toContain('let chatChannels: readonly string[] = BUILT_IN_CHAT_TABS;');
  });

  it('and the default on the hub itself is the built-in pair, not everything', () => {
    const subscribeAt = roomEvents.indexOf('export function subscribeToRoom');
    expect(subscribeAt, 'subscribeToRoom must exist').toBeGreaterThan(-1);
    expect(roomEvents.slice(subscribeAt)).toContain(
      'chatChannels: readonly string[] = BUILT_IN_CHAT_TABS'
    );
  });

  /*
    The channel list must NOT ride on `RosterUser`: that object is published to every other member as
    roster data, so a channel list on it would travel to the room. It is a separate field of the
    listener context for exactly that reason.
  */
  it('keeps the entitlement off the roster entry', () => {
    const from = roomEvents.indexOf('export type RosterUser');
    const to = roomEvents.indexOf('const subscribers');
    expect(from, 'RosterUser must exist').toBeGreaterThan(-1);
    expect(to, 'the subscriber map must exist').toBeGreaterThan(-1);
    expect(roomEvents.slice(from, to)).not.toContain('chatChannels');
  });
});

/* ───────────────────────────── the read path ───────────────────────────── */

const chatLog = readFileSync(new URL('./server/chat-log.ts', import.meta.url), 'utf8');
const pageServer = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');

describe('the page load reads only this member’s channels', () => {
  it('takes the list as an argument rather than from a constant', () => {
    expect(chatLog).toContain(
      'export function loadNewestChatPages(roomShortCode: string, channels: readonly string[])'
    );
    expect(chatLog).toContain('return channels\n');
    expect(chatLog).toContain('.flatMap((channel) => loadChatPage(roomShortCode, channel))');
    expect(chatLog, 'a constant list here is the leak this argument closes').not.toContain(
      'CHAT_CHANNELS.flatMap'
    );
  });

  it('and the page resolves it on the server before selecting a row', () => {
    const at = pageServer.indexOf('const chatChannels = await memberChatChannels(');
    const read = pageServer.indexOf(
      'loadNewestChatPages(requireRoomShortCode(locals), chatChannels)'
    );
    expect(at, 'the resolution is missing').toBeGreaterThan(-1);
    expect(read).toBeGreaterThan(at);
  });
});
