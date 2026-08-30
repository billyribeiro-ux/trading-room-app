import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import RoomMessage from './components/RoomMessage.svelte';

/**
 * RM-22 and RM-16 — the card's class lists, and the gif id the extra column changes.
 *
 * RM-22 is FOUR findings, not one, and every one of them is a difference nothing on screen
 * announces: a wrapper that never clipped, a row that never right-packed, a reply block wearing
 * another node's classes, and two reaction containers rendered as one element with neither's.
 *
 * The card consts they rest on, decoded from `consts:` at bundle byte 1,357,725:
 *
 * ```
 * 25  [1,"d-inline-block","flex-shrink-1",2,"overflow","hidden",3,"innerHTML","ngStyle"]   badges, admin
 * 60  [1,"d-inline-block","flex-shrink-1",2,"overflow","hidden",3,"innerHTML"]             badges, member
 * 26  [1,"d-flex",3,"ngClass"]            body row, admin   ·  65  [1,"d-flex"]            body row, member
 * 46  msg-left text-formated preText ml-2 mr-2 p-0 pe-3 w-100 + ngClass + ngStyle          reply, admin
 * 73  the same list, ngStyle only                                                          reply, member
 * 47  private-reply-message w-100 + theme  ·  48  d-block username  ·  49  quoted  ·  50  own line
 * 29  [1,"ms-1",3,"ngClass","ngStyle"]    reactions, admin  ·   6  [3,"ngStyle"]           reactions, member
 * ```
 *
 * Every admin/member pair above is why each assertion here has a member control: the reference
 * binds these on ONE layout, and applying them to both is its own defect.
 */

const MESSAGE = readFileSync(new URL('./components/RoomMessage.svelte', import.meta.url), 'utf8');

const item = (extra: Record<string, unknown> = {}) => ({
  id: 7,
  senderId: 2,
  senderName: 'A Presenter',
  senderEmailHash: 'hash-of-the-sender',
  senderAvatarUrl: '',
  body: 'a message',
  createdAt: new Date('2026-08-30T12:00:00Z'),
  isAdmin: true,
  ...extra
});

const draw = (props: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) =>
  render(RoomMessage, {
    props: {
      kind: 'chat',
      currentUserId: 99,
      currentUserEmailHash: 'hash-of-the-viewer',
      viewerIsPresenter: true,
      theme: 'dark',
      menuOpen: false,
      showDateSeparator: false,
      ontoggle: () => {},
      onaction: () => {},
      ...props,
      item: item(extra)
    } as never
  }).body;

const admin = (p: Record<string, unknown> = {}, e: Record<string, unknown> = {}) =>
  draw(p, { isAdmin: true, ...e });
const member = (p: Record<string, unknown> = {}, e: Record<string, unknown> = {}) =>
  draw(p, { isAdmin: false, ...e });

const BADGES = {
  chatBadges: true,
  enableBadges: true
};
const badged = { badges: [{ text: 'VIP', backgroundColor: '#111', color: '#eee' }] };

describe('RM-22 — the badges wrapper', () => {
  it('wraps them in the shrinkable, clipping box the reference gives them', () => {
    /*
      Ours rendered badges as direct siblings of the username inside a `flex-nowrap` row, so a member
      with several badges pushed the timestamp and the kebab out of the row. `flex-shrink-1` plus
      `overflow: hidden` is what makes the badge strip the part that gives.
    */
    const html = member(BADGES, badged);
    expect(html).toContain('d-inline-block flex-shrink-1');
    expect(html).toContain('overflow: hidden');
    /* …and the badge is inside it, not beside it. */
    const at = html.indexOf('d-inline-block flex-shrink-1');
    expect(at, 'the wrapper must exist for this slice to test anything').toBeGreaterThan(-1);
    expect(html.slice(at, html.indexOf('</div>', at))).toContain('user-badge');
  });

  it('styles the wrapper on the ADMIN layout only, as consts 25 and 60 differ by exactly that', () => {
    /* `Mge` binds `("innerHTML", …)("ngStyle", e.styleF)`; the member's const 60 has no ngStyle. */
    const source = MESSAGE.slice(MESSAGE.indexOf('d-inline-block flex-shrink-1'));
    expect(source.slice(0, 200)).toContain('reverseMessage ? bodyStyle : undefined');
  });
});

describe('RM-22 — justify-content-end on the admin body row', () => {
  it('packs the admin body row to the end when the setting is on', () => {
    /* `dge` at byte 1,335,936, on const 26. */
    expect(admin({ presenterMessagesOnTheRight: true })).toContain(
      'class="d-flex justify-content-end"'
    );
  });

  it('and does neither for a member, whose node 36 is a plain d-flex', () => {
    expect(member({ presenterMessagesOnTheRight: true })).toContain('class="d-flex"');
    expect(member({ presenterMessagesOnTheRight: true })).not.toContain('justify-content-end');
    /* The other control: the setting off leaves the admin row plain too. */
    expect(admin({ presenterMessagesOnTheRight: false })).not.toContain('justify-content-end');
  });
});

describe('RM-22 — the card reply block', () => {
  const REPLY = { replyToName: 'Someone Else', replyToBody: 'the quoted line' };

  it('is the reference s shape rather than the answered tick s classes', () => {
    const html = admin({}, REPLY);
    expect(html).toContain('msg-left text-formated preText ml-2 mr-2 p-0 pe-3 w-100');
    expect(html).toContain('private-reply-message w-100');
    expect(html).toContain('<strong class="d-block username"');
    /* const 27 — `ms-1 private-reply` — belongs to the TICK and to nothing else on this card. */
    expect(html).not.toContain('ms-1 private-reply');
  });

  it('puts the sender s OWN line outside the quoted box, where div50 is', () => {
    /*
      `T(7,"div",50)` closes AFTER `u()` has closed div47, so the own line is a SIBLING of the quoted
      box and not a child of it. Ours had it inside - so the sender's own words sat on the quoted
      background, which is the one visual cue that says which half is the quote.

      ## Asserted by DEPTH, because the obvious assertion could not fail

      The first version of this test sliced from the box's class to the quoted text and checked the
      slice did not contain the sender's own words. It cannot: the own line comes AFTER the quoted
      one in document order in BOTH arrangements, so that slice never contained it either way. Its
      negative control - moving the own line back inside the box - stayed green, which is the only
      reason it was caught. **A test that cannot fail is worse than no test**, and this is the third
      time in this repository a control has found the test rather than the code.

      Nesting is what actually differs, so nesting is what is measured: the quoted line sits one
      `<div>` deeper than the sender's own, and moving the close tag makes them equal.
    */
    const html = admin({}, REPLY);
    const depthAt = (needle: string) => {
      const at = html.indexOf(needle);
      expect(at, `${needle} must be rendered`).toBeGreaterThan(-1);
      const before = html.slice(0, at);
      return (before.match(/<div\b/g) ?? []).length - (before.match(/<\/div>/g) ?? []).length;
    };
    expect(depthAt('a message')).toBeLessThan(depthAt('the quoted line'));
  });

  it('binds hge on the admin layout alone', () => {
    expect(admin({ presenterMessagesOnTheRight: true }, REPLY)).toContain(
      'pe-3 w-100 presenter-msg-right'
    );
    expect(member({ presenterMessagesOnTheRight: true }, REPLY)).not.toContain(
      'presenter-msg-right'
    );
  });
});

describe('RM-22 — the two reaction containers', () => {
  const REACTED = { reactions: { fire: { emoji: '🔥', clickedBy: ['someone'] } } };
  const on = { enableReactions: true, presenterMessagesOnTheRight: true };

  it('gives the ADMIN strip its `ms-1` span and the right-align binding', () => {
    /* `Lge` opens `d(0,"span",29)` with `pge` — const 29 is `[1,"ms-1",3,"ngClass","ngStyle"]`. */
    expect(admin(on, REACTED)).toContain('<span class="ms-1 presenter-reactions-right"');
  });

  it('gives the MEMBER strip a bare div, which is what const 6 is', () => {
    /*
      `p1e` opens `d(0,"div",6)` — `[3,"ngStyle"]`, no class at all. Ours emitted a span with
      neither base class and applied `presenter-reactions-right` on BOTH layouts, so a member's card
      right-aligned its reactions whenever the room had the setting on. The reference has no node
      that does that.
    */
    const html = member(on, REACTED);
    expect(html).not.toContain('presenter-reactions-right');
    expect(html).toContain('chat-reaction');
  });

  it('renders ONE strip implementation for every container, which is what the snippet is for', () => {
    /*
      The count was 2 and is 3, and neither number is the property.

      Two was right while the card had one reaction container. RM-22 measured that it has TWO — the
      reference splits on `reverseMessage` into a `<span class="ms-1">` and a `<div>` — so the card
      renders the strip twice and the compact host once. A test that pins the number fails the next
      time a container is added for a measured reason, and the repair is to bump the number, which
      teaches nobody anything.

      What this file is actually protecting is that there is ONE implementation however many places
      draw it, so that is what is asserted: exactly one `{#snippet}` definition, at least one render
      per host, and — the half a count cannot express — the strip's own markup appearing nowhere
      outside it. A second hand-written strip is the failure; a third CALL is not.
    */
    expect(MESSAGE.match(/\{#snippet reactionStrip\(\)\}/g), 'one definition').toHaveLength(1);

    const renders = MESSAGE.match(/\{@render reactionStrip\(\)\}/g) ?? [];
    expect(
      renders.length,
      'both hosts draw it, and the card draws it once per container'
    ).toBeGreaterThanOrEqual(2);

    /*
      The pill itself, which only the snippet may emit. Bound and asserted rather than inlined:
      `slice-anchor-contract` refuses the inline form, and a -1 here would slice one character and
      pass.
    */
    const at = MESSAGE.indexOf('{#snippet reactionStrip()}');
    expect(at, 'the snippet moved').toBeGreaterThan(-1);
    const end = MESSAGE.indexOf('{/snippet}', at);
    expect(end, 'the snippet is unterminated').toBeGreaterThan(at);
    const outside = MESSAGE.slice(0, at) + MESSAGE.slice(end);
    expect(
      outside,
      'a second reaction pill is written outside the snippet — that is two implementations'
    ).not.toContain("class={['badge chat-reaction'");
  });
});

describe('RM-16 — the extra column s gif placeholder id', () => {
  const GIF = { body: 'look https://example.com/a.gif' };
  /* `chatGif: false` is what mutes a gif and renders the placeholder at all. */
  const muted = { chatGif: false };

  it('emits `gif_<id>` in the main log', () => {
    expect(draw(muted, GIF)).toContain('id="gif_7"');
  });

  it('emits `gifExtra_<id>` in the extra column', () => {
    /* `const c = s ? \`gifExtra_${o}\` : \`gif_${o}\`` — bundle byte 1,326,195. */
    const html = draw({ ...muted, extraChatMsg: true }, GIF);
    expect(html).toContain('id="gifExtra_7"');
    expect(html).not.toContain('id="gif_7"');
  });

  it('is fed by the pane that is the only one able to know it', () => {
    const pane = readFileSync(
      new URL('./components/ExtraChatPane.svelte', import.meta.url),
      'utf8'
    );
    expect(pane).toContain('extraChatMsg={true}');
  });
});
