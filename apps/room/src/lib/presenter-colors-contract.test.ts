import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { and, eq } from 'drizzle-orm';
import { render } from 'svelte/server';

import {
  PRESENTER_COLOR_DEFAULTS,
  isPresenterColor,
  presenterColorsFor,
  seedPresenterColors
} from './presenter-colors.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { presenterColors, users, type User } from '#lib/server/db/schema.js';
import { callRemote, expectSchemaRefusal } from '#lib/server/remote-command-harness.js';
import { hashEmail } from '#lib/server/connection.js';
import { subscribeToRoom, type RoomEvent } from '#lib/server/room-events.js';
import RoomMessage from './components/RoomMessage.svelte';

const { clearPresenterColors, savePresenterColors } =
  await import('../routes/presenter-colors.remote');

/**
 * `savePresenterColors` — the presenter's two message colours, end to end.
 *
 * ## What was broken, and it was the loudest kind of broken
 *
 * The settings modal has drawn two `<input type="color">` pickers under this heading since it was
 * built:
 *
 * > *These colors will affect how ALL USERS see your messages and alerts*
 *
 * and Save wrote `onPreferenceChange('presenterStyle', …)` — a key in the presenter's OWN settings
 * blob, read by nothing, in a store no other viewer can see. All three claims in that sentence were
 * false at once. Reset assigned two constants and sent nothing, so a presenter could not clear
 * colours they had never actually set. Reopening the modal showed the constants.
 *
 * `presenter-colors.ts` carries the four reference sites and the precedence table;
 * `presenter-colors.remote.ts` carries the authority divergence. This file is what fails if any of
 * it stops being true.
 *
 * ## Four things are pinned here, and they fail in four different ways
 *
 * 1. **The resolver's rules** — the reference's own `o && o.color && o.bkgColor` test, plus the
 *    re-validation this room adds. A wrong answer here is a message painted from a half-written row.
 * 2. **The command's authority** — a member refused, and the presenter's key NOT taken from the
 *    wire. A wrong answer here is one member recolouring a presenter's messages for the whole room.
 * 3. **The render precedence** — four sources write the same three style slots and the order
 *    between them is the feature. A wrong answer here is silent: every colour is still a colour.
 * 4. **The wiring** — the modal's buttons, the seed, and the broadcast receiver. A wrong answer
 *    here is the defect this whole file exists because of: a control that changes only its own label.
 */

const MODAL = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');
const EVENTS = readFileSync(new URL('./room/events.svelte.ts', import.meta.url), 'utf8');
const SCHEMA = readFileSync(new URL('./server/db/schema.ts', import.meta.url), 'utf8');
const DB = readFileSync(new URL('./server/db/index.ts', import.meta.url), 'utf8');
const SERVER = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');

/*
  Comments are STRIPPED before any source assertion below, and that is not tidiness.

  A test in this repository has already passed against its own explanation: the docblocks here quote
  the reference verbatim, `presenterStyle` and `onPreferenceChange` among the quotes, so a
  `not.toContain` over the raw file would have been red for a defect that is fixed and green for one
  that is not. Prose is not code.
*/
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const modalCode = stripComments(MODAL);
const eventsCode = stripComments(EVENTS);
const serverCode = stripComments(SERVER);

describe('the colours a message resolves to', () => {
  const map = {
    'hash-presenter': { color: '#112233', bgColor: '#445566' },
    'hash-half-set': { color: '#112233', bgColor: '' },
    'hash-not-hex': { color: 'red', bgColor: '#445566' }
  };

  it('returns the pair for a sender who has one', () => {
    expect(presenterColorsFor(map, 'hash-presenter')).toEqual({
      color: '#112233',
      bgColor: '#445566'
    });
  });

  it('returns nothing for a sender who has none, and for no map at all', () => {
    expect(presenterColorsFor(map, 'hash-stranger')).toBeUndefined();
    expect(presenterColorsFor(null, 'hash-presenter')).toBeUndefined();
    expect(presenterColorsFor(undefined, 'hash-presenter')).toBeUndefined();
  });

  it('refuses a HALF-SET entry, which is how the reference says "cleared"', () => {
    /*
      Upstream's Reset sends `{bkgColor:"", color:""}` and its renderer skips the entry on
      `o.color && o.bkgColor`. This room deletes the row instead, so a half-set entry should be
      unreachable — but the map arrives at the browser as JSON from a page load, and "unreachable"
      is a claim about our own writer, not about what a renderer is handed.
    */
    expect(presenterColorsFor(map, 'hash-half-set')).toBeUndefined();
  });

  it('refuses a stored value that is not a colour', () => {
    /*
      These two strings are interpolated into a `style=` attribute on every message the sender has
      ever posted, for every viewer in the room. The command validates on the way in; this validates
      on the way out, so one storage bug is not also a rendering injection.
    */
    expect(presenterColorsFor(map, 'hash-not-hex')).toBeUndefined();
  });

  it('accepts exactly what a colour input produces, and nothing else', () => {
    expect(isPresenterColor('#000000')).toBe(true);
    expect(isPresenterColor('#AbCdEf')).toBe(true);
    for (const bad of [
      '#000',
      '#0000000',
      'red',
      'rgb(0,0,0)',
      '#gggggg',
      '',
      ' #000000',
      '#000000;color:red',
      'url(javascript:alert(1))'
    ]) {
      expect(isPresenterColor(bad), bad).toBe(false);
    }
  });

  it('seeds the pickers from the presenter s own entry, or the theme default', () => {
    expect(seedPresenterColors(map, 'hash-presenter', 'dark')).toEqual({
      color: '#112233',
      bgColor: '#445566'
    });
    expect(seedPresenterColors(map, 'hash-stranger', 'light')).toEqual(
      PRESENTER_COLOR_DEFAULTS.light
    );
    expect(seedPresenterColors(map, 'hash-stranger', 'dark')).toEqual(
      PRESENTER_COLOR_DEFAULTS.dark
    );
  });

  it('carries the reference s own two theme defaults', () => {
    /*
      `globals.presenterStyle`, bundle byte 980,538. The dark background is `"#000"` there and is
      expanded to six digits here because a colour input cannot hold the short form — the one
      character of divergence in this table, and `presenter-colors.ts` says so at the value.
    */
    expect(PRESENTER_COLOR_DEFAULTS.light).toEqual({ color: '#1a1a1a', bgColor: '#e8e8e8' });
    expect(PRESENTER_COLOR_DEFAULTS.dark).toEqual({ color: '#f7fd37', bgColor: '#000000' });
  });
});

describe('the command', () => {
  const ROOM = 'presenter-colors-a';
  const OTHER_ROOM = 'presenter-colors-b';

  function account(email: string, role: string): User {
    const existing = db.select().from(users).where(eq(users.email, email)).get();
    if (existing) return existing;
    return db
      .insert(users)
      .values({
        displayName: `presenter colors ${role}`,
        email,
        role,
        passwordHash: 'scrypt$00$00',
        createdAt: new Date()
      })
      .returning()
      .get();
  }

  const as = <T>(user: User, room: string, run: () => T | Promise<T>) =>
    callRemote(
      { user, sessionId: 'presenter-colors-contract', roomShortCode: room } as App.Locals,
      run
    );

  const rowFor = (room: string, emailHash: string) =>
    db
      .select()
      .from(presenterColors)
      .where(
        and(eq(presenterColors.roomShortCode, room), eq(presenterColors.senderEmailHash, emailHash))
      )
      .get();

  /** One connected browser, listening on the channel the command publishes to. */
  function browser() {
    const received: Array<Record<string, unknown>> = [];
    return {
      received,
      listener: (event: RoomEvent) => {
        if (event.channel !== 'cmds') return;
        received.push(event.data as unknown as Record<string, unknown>);
      }
    };
  }

  let presenter: User;
  let otherPresenter: User;
  let member: User;

  beforeAll(() => {
    ensureDatabase();
    presenter = account('presenter-colors-presenter@example.test', 'staff');
    otherPresenter = account('presenter-colors-other@example.test', 'admin');
    member = account('presenter-colors-member@example.test', 'member');
  });

  beforeEach(() => {
    db.delete(presenterColors).run();
  });

  it('writes a row keyed by the CALLER s own hash, and tells the room', async () => {
    const listening = browser();
    const stop = subscribeToRoom(ROOM, listening.listener);
    try {
      await as(presenter, ROOM, () =>
        savePresenterColors({ color: '#123456', bgColor: '#abcdef' })
      );
    } finally {
      stop();
    }

    const row = rowFor(ROOM, hashEmail(presenter.email));
    expect(row?.textColor).toBe('#123456');
    expect(row?.backgroundColor).toBe('#abcdef');
    expect(listening.received).toEqual([{ cmd: 'presenterColorsChanged' }]);
  });

  it('REFUSES a key on the wire, which is the escalation shape the reference has', async () => {
    /*
      Upstream sends `{ key: hashEmail(user.email), val: {…} }` — the client naming whose colours it
      is writing, over a hash that is in every roster row and every rendered message. `z.strictObject`
      is what makes that unrepresentable here rather than merely unused: an extra field is refused,
      so a future edit cannot quietly start honouring one.

      The cast is deliberate and is the point of the test: the payload type already forbids this at
      compile time, and what is being proven is that the RUNTIME does too.
    */
    await expectSchemaRefusal(
      as(presenter, ROOM, () =>
        savePresenterColors({
          color: '#123456',
          bgColor: '#abcdef',
          key: hashEmail(otherPresenter.email)
        } as unknown as { color: string; bgColor: string })
      ),
      'key'
    );
    expect(rowFor(ROOM, hashEmail(otherPresenter.email))).toBeUndefined();
    expect(rowFor(ROOM, hashEmail(presenter.email))).toBeUndefined();
  });

  it('refuses anything that is not a colour, and writes nothing', async () => {
    for (const bad of ['#fff', 'red', '', 'javascript:alert(1)', '#ffffff;']) {
      await expectSchemaRefusal(
        as(presenter, ROOM, () => savePresenterColors({ color: bad, bgColor: '#abcdef' })),
        `color=${bad}`
      );
      await expectSchemaRefusal(
        as(presenter, ROOM, () => savePresenterColors({ color: '#abcdef', bgColor: bad })),
        `bgColor=${bad}`
      );
    }
    expect(rowFor(ROOM, hashEmail(presenter.email))).toBeUndefined();
  });

  it('refuses a MEMBER, and nothing is written or broadcast', async () => {
    const listening = browser();
    const stop = subscribeToRoom(ROOM, listening.listener);
    try {
      await expect(
        as(member, ROOM, () => savePresenterColors({ color: '#123456', bgColor: '#abcdef' }))
      ).rejects.toMatchObject({ status: 403 });
      await expect(as(member, ROOM, () => clearPresenterColors())).rejects.toMatchObject({
        status: 403
      });
    } finally {
      stop();
    }

    expect(rowFor(ROOM, hashEmail(member.email))).toBeUndefined();
    expect(listening.received).toEqual([]);
  });

  it('a second save REPLACES the pair rather than adding an opinion about it', async () => {
    await as(presenter, ROOM, () => savePresenterColors({ color: '#111111', bgColor: '#222222' }));
    await as(presenter, ROOM, () => savePresenterColors({ color: '#333333', bgColor: '#444444' }));

    const rows = db
      .select()
      .from(presenterColors)
      .where(eq(presenterColors.roomShortCode, ROOM))
      .all();
    expect(rows).toHaveLength(1);
    expect(rows[0].textColor).toBe('#333333');
  });

  it('Reset DELETES, and only the caller s own row in the caller s own room', async () => {
    await as(presenter, ROOM, () => savePresenterColors({ color: '#111111', bgColor: '#222222' }));
    await as(otherPresenter, ROOM, () =>
      savePresenterColors({ color: '#333333', bgColor: '#444444' })
    );
    await as(presenter, OTHER_ROOM, () =>
      savePresenterColors({ color: '#555555', bgColor: '#666666' })
    );

    const listening = browser();
    const stop = subscribeToRoom(ROOM, listening.listener);
    try {
      await as(presenter, ROOM, () => clearPresenterColors());
    } finally {
      stop();
    }

    expect(rowFor(ROOM, hashEmail(presenter.email))).toBeUndefined();
    // The OTHER presenter in the same room keeps theirs.
    expect(rowFor(ROOM, hashEmail(otherPresenter.email))?.textColor).toBe('#333333');
    // And the same presenter's colours in ANOTHER room are untouched — the tenancy half.
    expect(rowFor(OTHER_ROOM, hashEmail(presenter.email))?.textColor).toBe('#555555');
    expect(listening.received).toEqual([{ cmd: 'presenterColorsChanged' }]);
  });

  it('a presenter of one room cannot reach another room s map', async () => {
    await as(presenter, ROOM, () => savePresenterColors({ color: '#111111', bgColor: '#222222' }));
    expect(rowFor(OTHER_ROOM, hashEmail(presenter.email))).toBeUndefined();
  });

  it('pressing Reset twice is not an error', async () => {
    await as(presenter, ROOM, () => clearPresenterColors());
    await expect(as(presenter, ROOM, () => clearPresenterColors())).resolves.toBeUndefined();
  });
});

describe('the render precedence', () => {
  /*
    FOUR sources write the same three style slots and the ORDER between them is the whole feature.
    Getting it wrong is silent — every colour is still a colour — which is why this renders the
    component and reads the attributes rather than asserting on the source that produces them.

    SSR (`render` from `svelte/server`) rather than `mount`, deliberately: everything here is a
    `$derived` read in the first frame, so a mount would add a DOM without adding coverage.
  */
  const SENDER = 'hash-of-the-presenter';
  const presenterStyle = { color: '#101010', bgColor: '#202020' };
  const followedStyle = {
    color: '#303030',
    tickerColor: '#303030',
    usernameColor: '#404040',
    bgColor: '#505050',
    fontSize: 17,
    playSound: false
  };
  const chatStyle = {
    color: '#606060',
    tickerColor: '#606060',
    usernameColor: '#707070',
    bgColor: '#808080',
    fontSize: 13,
    playSound: true
  };

  const item = (extra: Record<string, unknown> = {}) => ({
    id: 1,
    senderId: 2,
    senderName: 'A Presenter',
    senderEmailHash: SENDER,
    senderAvatarUrl: '',
    body: 'a message',
    createdAt: new Date('2026-08-30T12:00:00Z'),
    isAdmin: true,
    ...extra
  });

  const draw = (props: Record<string, unknown>) =>
    render(RoomMessage, {
      props: {
        item: item(),
        kind: 'chat',
        currentUserId: 99,
        currentUserEmailHash: 'hash-of-the-viewer',
        viewerIsPresenter: false,
        theme: 'dark',
        menuOpen: false,
        showDateSeparator: false,
        ontoggle: () => {},
        onaction: () => {},
        ...props
      } as never
    }).body;

  it('paints the presenter s pair when nothing else applies', () => {
    const html = draw({ presenterStyle });
    expect(html).toContain('background-color: #202020;');
    expect(html).toContain('color: #101010;');
  });

  it('BEATS the viewer s own chat style', () => {
    const withColours = draw({ presenterStyle, chatStyle });
    expect(withColours).toContain('background-color: #202020;');
    expect(withColours).toContain('color: #101010;');
    expect(withColours).not.toContain('#808080');

    // …and with no presenter entry, the viewer's own style is what paints. The control for the above.
    const without = draw({ chatStyle });
    expect(without).toContain('background-color: #808080;');
    expect(without).not.toContain('#202020');
  });

  it('BEATS the message s own colours', () => {
    const html = draw({
      presenterStyle,
      item: item({ backgroundColor: '#909090', fontColor: '#a0a0a0' })
    });
    expect(html).toContain('background-color: #202020;');
    expect(html).toContain('color: #101010;');
    expect(html).not.toContain('#909090');
  });

  it('LOSES to the viewer s per-followed-user override', () => {
    /*
      The reference applies `followedUsers[msg.avt].followChatStyle` last and unconditionally, and
      that is the right way round: a viewer who has deliberately colour-coded one trader should not
      have that silently undone by that trader's own choice.
    */
    const html = draw({ presenterStyle, followedStyle, chatStyle });
    expect(html).toContain('background-color: #505050;');
    expect(html).toContain('color: #303030;');
    expect(html).not.toContain('#202020');
  });

  it('does not repaint a CAPTURED row', () => {
    /*
      An evidence row renders the DOM that was captured. A presenter whose hash happens to match a
      captured sender's must not repaint it — the same exclusion `effectiveStyle` already has.
    */
    const html = draw({ presenterStyle, item: item({ evidenceKey: 'captured-1' }) });
    expect(html).not.toContain('#202020');
    expect(html).not.toContain('#101010');
  });

  it('applies to an ALERT as well as a chat message', () => {
    // "your messages and alerts" — one component upstream, one component here, no exception.
    const html = draw({ presenterStyle, kind: 'alert' });
    expect(html).toContain('background-color: #202020;');
  });
});

describe('the wiring', () => {
  it('there is a row per presenter per room that persists it', () => {
    expect(SCHEMA).toContain("export const presenterColors = sqliteTable(\n  'presenter_colors'");
    expect(SCHEMA).toContain(
      'primaryKey({ columns: [table.roomShortCode, table.senderEmailHash] })'
    );
    expect(DB).toContain('CREATE TABLE IF NOT EXISTS presenter_colors');
    expect(DB).toContain('PRIMARY KEY (room_short_code, sender_email_hash)');
  });

  it('the page load hands the room s whole map to the browser', () => {
    expect(serverCode).toContain('presenterColors: Object.fromEntries(');
    expect(serverCode).toContain('eq(presenterColors.roomShortCode, requireRoomShortCode(locals))');
  });

  it('the modal SENDS both buttons and no longer writes a preference', () => {
    // The whole defect in one line: it persisted, and nothing read it back.
    expect(modalCode).not.toContain("onPreferenceChange('presenterStyle'");
    expect(modalCode).toContain('await savePresenterColors({');
    expect(modalCode).toContain('await clearPresenterColors();');
    expect(modalCode).toContain('onclick={savePresenterStyle}');
    expect(modalCode).toContain('onclick={resetPresenterStyle}');
  });

  it('the pickers open on the stored pair rather than a constant', () => {
    expect(modalCode).toContain(
      'const seed = seedPresenterColors(presenterColors, messageChrome.currentUserEmailHash, theme);'
    );
    expect(modalCode).toContain('presenterTextColor = seed.color;');
    expect(modalCode).toContain('presenterBackgroundColor = seed.bgColor;');
  });

  it('a tab that did not send it refetches when the broadcast arrives', () => {
    /*
      The frame is a TRIGGER, not a payload — the reference replaces its whole map from `i.colors`
      and this room reads the rows instead, for the reason `changeChatMode` gives one case above:
      this decides how everyone else's messages are painted, so a socket must not be what answers it.
    */
    expect(eventsCode).toContain("if (command?.cmd === 'presenterColorsChanged') {");
    const at = eventsCode.indexOf("command?.cmd === 'presenterColorsChanged'");
    expect(at, 'the marker must exist for this guard to test anything').toBeGreaterThan(-1);
    expect(eventsCode.slice(at, at + 200)).toContain('void invalidateAll();');
    expect(eventsCode.slice(at, at + 200)).not.toContain('colors');
  });

  it('every surface that renders a message is fed the map', () => {
    for (const [file, marker] of [
      ['./components/AlertChatArea.svelte', 'presenterColorsFor(presenterColors,'],
      ['./components/ExtraChatPane.svelte', 'presenterColorsFor(presenterColors,'],
      ['./components/AlertQaModal.svelte', 'presenterColorsFor(presenterColors,'],
      ['../routes/+page.svelte', 'presenterColors={data.presenterColors}']
    ] as const) {
      expect(readFileSync(new URL(file, import.meta.url), 'utf8'), file).toContain(marker);
    }
  });
});
