import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

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

const BUNDLE = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);
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
const pageCode = stripComments(PAGE);
const messageCode = stripComments(MESSAGE);

describe('the reference', () => {
  it('keeps definitions in a hash and ids on the message', () => {
    expect(BUNDLE).toContain('badgesH');
    expect(BUNDLE.replace(/\s+/g, '')).toContain('sessData.badgesH[this.msg.b[o]]');
  });

  it('swaps the whole definition for the dark variant — a LOOKUP, not a flag', () => {
    expect(BUNDLE.replace(/\s+/g, '')).toContain('badgesH[r.darkTheme]');
  });
});

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

  it('sends darkTheme only when it names a badge', () => {
    // Our column is still the superseded boolean; `badgesH[true]` could only ever fail.
    expect(endpointCode).toContain(
      "darkTheme: typeof badge.darkTheme === 'number' ? badge.darkTheme : undefined"
    );
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
    expect(pageCode).toContain('badgesForSender(item.senderEmailHash)');
    expect(pageCode).toContain('const ids = data.badges?.byEmailHash?.[emailHash];');
  });

  it('skips an id with no definition rather than drawing a blank chip', () => {
    // `r &&` upstream — a badge deleted from the account while still assigned to a member.
    expect(pageCode).toContain('if (!badge) continue;');
  });

  it('swaps in the dark variant by LOOKUP, and falls back if it was deleted', () => {
    expect(pageCode).toContain("theme === 'dark' && typeof badge.darkTheme === 'number'");
    /*
      `?? badge` is a deliberate divergence: upstream renders NOTHING when the variant id names a
      badge that no longer exists. Losing a badge because its dark variant was deleted is a worse
      outcome than showing the light one.
    */
    expect(pageCode).toContain('(definitions[String(badge.darkTheme)] ?? badge)');
  });

  it('feeds all four gates the component already had', () => {
    /*
      RE-POINTED 2026-08-15. The four used to be counted as shorthand props at each `RoomMessage`.
      They are now four of the sixteen in `messageChrome`, which every message list spreads — so the
      question "do all four reach the component" is answered once, at the object, instead of once per
      call site.

      Positive first: the chrome is FOUND and is built here, before membership is asserted.
    */
    const from = pageCode.indexOf('const messageChrome');
    expect(from, 'messageChrome is not built in +page.svelte').toBeGreaterThan(-1);
    const chrome = pageCode.slice(from, pageCode.indexOf('\n  });', from));

    for (const gate of [
      'chatBadges',
      'enableBadges',
      'showBadgesToPresentersOnly',
      'disableStarYears'
    ]) {
      expect(chrome, `${gate} must be in the chrome every message list spreads`).toContain(gate);
    }

    // And it reaches all THREE lists — the two here and the second chat column, which was missing
    // four other gates entirely until the capture settled it. See `extra-chat-column-contract`.
    expect(pageCode.split('{...messageChrome}').length - 1).toBe(2);
    expect(pageCode).toContain('chrome={messageChrome}');
  });

  it('and the component still gates on all four, in the reference’s order', () => {
    expect(messageCode).toContain('chatBadges &&');
    expect(messageCode).toContain('!presenterMessagesOnTheRight &&');
    expect(messageCode).toContain('enableBadges &&');
    expect(messageCode).toContain('(!showBadgesToPresentersOnly || viewerIsPresenter)');
  });
});
