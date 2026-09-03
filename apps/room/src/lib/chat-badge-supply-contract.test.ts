import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { buildMessageChrome } from './room-message-chrome.js';

/*
  Chat badges — the SUPPLY, which is what was missing rather than the rendering.

  `RoomMessage.svelte` has always been a faithful port: the four-term gate chain and both markup
  branches match the reference exactly. It rendered nothing for anybody because it was unfed at
  three levels, and all three are closed here.

  THE REFERENCE'S SHAPE, from `app-st-message.full.js` byte 28120:

      for (let o = 0; o < this.msg.b.length; o++) {
        let r = sessData.badgesH[this.msg.b[o]];
        r && r.darkTheme && 'darkTheme' === preferences.theme && (r = sessData.badgesH[r.darkTheme]);
        r && (this.badges += r.imgURL ? '<img class="user-badge-img" …>' : '<span class="badge …">')
      }

  Two structures: `badgesH`, a hash of id -> definition on the session data, and `msg.b`, the ids
  carried on each message.

  WHAT WE HAD TO DO DIFFERENTLY, and why it is not a shortcut. Upstream one server owns both the
  chat log and the badge assignments, so it can stamp `msg.b` onto each row. Here they live in
  different databases with no shared key space — the controller's own room-config endpoint says so
  in as many words. So the assignment map crosses keyed by **md5(email)**, the hash the room already
  computes in `hashEmail()` and already carries on every message as `senderEmailHash`, and the join
  happens at render time. The room never receives an address.

  THE DARK-THEME SWAP IS THE PROOF OF T5-27. `r.darkTheme` holds the ID of a variant badge and the
  whole definition is replaced with it — established from the manage page months ago, corroborated
  here at the render site. Our column is still the superseded boolean, which is why the controller
  sends `darkTheme` only when it is a number: `true` names no badge, and `badgesH[true]` is a
  lookup that can only fail.
*/

/*
  THE BUNDLE READ THAT SAT HERE IS IN `chat-badge-supply-capture.test.ts`.

  Two cases needed it — that the reference keeps definitions in a hash keyed by id, and that the dark
  variant is a LOOKUP rather than a flag. It was a MODULE-SCOPE read of a gitignored path, so it
  excluded all thirteen cases in this file on every checkout without the dumps, CI included; among
  them `keys members by md5(email), never by address`, which is the assertion that member addresses
  do not cross the boundary. The eleven that stayed read the controller endpoint, the room load,
  `feeds.svelte.ts` and `RoomMessage.svelte`, every one of them committed.
*/
const ENDPOINT = readFileSync(
  new URL('../../../controller/src/routes/internal/room-config/[code]/+server.ts', import.meta.url),
  'utf8'
);
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const SERVER = readFileSync(new URL('../routes/+page.server.ts', import.meta.url), 'utf8');
const MESSAGE = readFileSync(new URL('./components/RoomMessage.svelte', import.meta.url), 'utf8');

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const endpointCode = stripComments(ENDPOINT);
/*
  The read pipelines left the page for `RoomFeeds` in Phase 5 slice 9. Read as their own source, so
  an assertion about what a pane renders cannot pass against a file that no longer builds it.
*/
const feedsModule = readFileSync(new URL('room/feeds.svelte.ts', import.meta.url), 'utf8');
const pageCode = stripComments(PAGE);
const messageCode = stripComments(MESSAGE);

describe('level 1 — the controller sends it', () => {
  it('sends definitions and a hash-keyed assignment map', () => {
    expect(endpointCode).toContain(
      'badges: { definitions: badgeDefinitions, byEmailHash: memberBadges }'
    );
  });

  it('keys members by md5(email), never by address', () => {
    /*
      The response is serialised into SSR HTML on every load. A member list of raw emails crossing
      that boundary is what the settings allow-list exists to prevent, and the same reasoning
      applies to people.
    */
    expect(endpointCode).toContain("createHash('md5')");
    expect(endpointCode).toContain('.update(row.user.email.trim().toLowerCase())');
    expect(endpointCode).toContain('memberBadges[hash] = ids;');
    expect(endpointCode).not.toMatch(/memberBadges\[\s*row\.user\.email/);
  });

  it('omits members with no badges, so the payload is bounded by assignments', () => {
    expect(endpointCode).toContain('if (ids.length === 0) continue;');
  });

  it('sources darkTheme from the id column, never from the superseded boolean', () => {
    /*
      THE WIRE FIELD IS `darkTheme`; THE COLUMN BEHIND IT IS `darkThemeBadgeId`. The name is the
      reference's, matched by `feeds.svelte.ts` (`definitions[String(badge.darkTheme)]`); the source
      has to be the column that holds an ID, because the swap is a LOOKUP and not a flag.

      WHY THIS ASSERTS BOTH DIRECTIONS. Until 2026-08-17 this test pinned
      `typeof badge.darkTheme === 'number' ? badge.darkTheme : undefined`, and that expression was
      DEAD: `badges.darkTheme` is `boolean('dark_theme')`, so `typeof` was never `'number'` and the
      field was always undefined. The test was green the whole time, because it asserted the presence
      of a string rather than the behaviour — it pinned the defect in place instead of catching it.

      So the negative half below is the half that matters, and it is the one that goes red if anybody
      restores the boolean. `darkThemeBadgeId` is `integer(...)` and nullable (migration `0013`), so
      `?? undefined` is the whole of the conditioning that is needed.
    */
    expect(endpointCode).toContain('darkTheme: badge.darkThemeBadgeId ?? undefined');
    expect(endpointCode).not.toContain("typeof badge.darkTheme === 'number'");
  });

  it('loads the member list ONCE for both the membership lookup and the map', () => {
    expect(endpointCode).toContain('const roomMembers = await getDb()');
    expect(endpointCode).toContain('roomMembers.find((row)');
  });
});

describe('level 2 — the room carries it to the page', () => {
  it('passes it through the load, defaulting to empty rather than undefined', () => {
    expect(stripComments(SERVER)).toContain(
      'badges: roomConfig.badges ?? { definitions: {}, byEmailHash: {} }'
    );
  });
});

describe('level 3 — the page joins it onto each message', () => {
  it('resolves a sender by the hash the message already carries', () => {
    expect(feedsModule).toContain('this.badgesFor(item.senderEmailHash)');
    expect(feedsModule).toContain('const ids = this.#session().badges?.byEmailHash?.[emailHash];');
  });

  it('skips an id with no definition rather than drawing a blank chip', () => {
    // `r &&` upstream — a badge deleted from the account while still assigned to a member.
    expect(feedsModule).toContain('if (!badge) continue;');
  });

  it('swaps in the dark variant by LOOKUP, and falls back if it was deleted', () => {
    expect(feedsModule).toContain(
      "this.#theme() === 'dark' && typeof badge.darkTheme === 'number'"
    );
    /*
      `?? badge` is a deliberate divergence: upstream renders NOTHING when the variant id names a
      badge that no longer exists. Losing a badge because its dark variant was deleted is a worse
      outcome than showing the light one.
    */
    expect(feedsModule).toContain('(definitions[String(badge.darkTheme)] ?? badge)');
  });

  it('feeds all four gates the component already had', () => {
    /*
      RE-POINTED TWICE, and the second time is why this is now EXECUTED rather than matched.

      2026-08-15: the four used to be counted as shorthand props at each `RoomMessage`. They became
      four of the members of `messageChrome`, which every message list spreads, so the question "do
      all four reach the component" is answered once at the object instead of once per call site.

      2026-09-03: the twenty-two lines that built that object left `+page.svelte` for
      `buildMessageChrome` in `#lib/room-message-chrome.ts` — the page now passes SOURCES, and two of
      these four (`showBadgesToPresentersOnly`, `disableStarYears`) are read off `sessData` inside the
      builder and are not spelled in the page at all. This assertion went on slicing `+page.svelte`
      for them, and could not object, because a module-scope capture read had taken the whole file
      out of every run. It was measurably wrong the moment it could execute.

      So the subject is the BUILDER, and it is called rather than read. A text match over the
      builder would have the same failure mode one move later; a returned object cannot claim a
      member it does not have.
    */
    const chrome = buildMessageChrome({
      user: { id: 1, emailHash: 'h', displayName: 'A', role: 'user' },
      sessData: { showBadgesToPresentersOnly: true, disableStarYears: true },
      theme: 'dark',
      chatStyle: {
        color: '#fff',
        tickerColor: '#fff',
        usernameColor: '#fff',
        bgColor: '#000',
        fontSize: 14,
        playSound: false
      },
      chatGif: false,
      chatBadges: true,
      enableBadges: true,
      presenterMessagesOnTheRight: false,
      viewerIsLimitedPresenter: false
    });
    for (const gate of [
      'chatBadges',
      'enableBadges',
      'showBadgesToPresentersOnly',
      'disableStarYears'
    ] as const) {
      expect(chrome[gate], `${gate} must be in the chrome every message list spreads`).toBe(true);
    }

    // ...and the page still builds the chrome THROUGH that builder, rather than beside it.
    expect(pageCode).toContain('const messageChrome: RoomMessageChrome = $derived(');
    expect(pageCode).toContain('buildMessageChrome({');

    /*
      And it reaches all THREE lists — the alerts and chat lists, which moved to `AlertChatArea` on
      2026-08-15, and the second chat column, which was missing four other gates entirely until the
      capture settled it. See `extra-chat-column-contract`.

      The two spreads are counted in the PANE and the two hand-offs in the page, because that is
      where each now lives. Counting spreads in the page would find zero and `0 === 0` is not a
      contract.
    */
    const paneCode = readFileSync(
      new URL('./components/AlertChatArea.svelte', import.meta.url),
      'utf8'
    );
    expect(paneCode.split('{...messageChrome}').length - 1).toBe(2);
    expect(pageCode).toContain('{messageChrome}');
    expect(pageCode).toContain('chrome={messageChrome}');
  });

  it('and the component still gates on all four, in the reference’s order', () => {
    expect(messageCode).toContain('chatBadges &&');
    expect(messageCode).toContain('!presenterMessagesOnTheRight &&');
    expect(messageCode).toContain('enableBadges &&');
    expect(messageCode).toContain('(!showBadgesToPresentersOnly || viewerIsPresenter)');
  });
});
