import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import { MESSAGE_MENU_LABEL, MESSAGE_MENU_TEXT } from './message-behavior.js';
import RoomMessage from './components/RoomMessage.svelte';

/**
 * The compact ADMIN row — the four rows that are all one idea, plus the menu that serves both.
 *
 * | row | what it wanted |
 * | --- | --- |
 * | RM-08 | the compact menu's three divergent labels |
 * | RM-10 | ` [h:mm a] ` on the admin row against `[h:mm a]` on the member's |
 * | RM-11 | the four nodes `presenterMsgsOnTheRight` paints, one of which we had wrong |
 * | RM-12 | `presenter-reactions-right` on the compact reaction strip |
 * | RM-25 | the compact reply block, which was wearing the answered tick's markup |
 *
 * ## Rendered, not read
 *
 * Every one of these is a class or a literal that changes NOTHING about what the row says. A
 * `presenter-msg-right` where the reference has `flex-row-reverse` still resolves to a real rule in
 * a real stylesheet, so the page looks finished and the setting quietly does nothing. Only the
 * emitted attribute distinguishes the two, which is why this renders.
 *
 * `render` from `svelte/server` rather than `mount`: all of it is `$derived` in the first frame.
 */

const item = (extra: Record<string, unknown> = {}) => ({
  id: 1,
  senderId: 2,
  senderName: 'A Presenter',
  senderEmailHash: 'hash-of-the-sender',
  senderAvatarUrl: '',
  body: 'a message',
  createdAt: new Date('2026-08-30T12:00:00Z'),
  isAdmin: true,
  ...extra
});

const draw = (props: Record<string, unknown> = {}) =>
  render(RoomMessage, {
    props: {
      item: item(),
      kind: 'chat',
      displayMode: 'c',
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

/**
 * The admin row is the mirrored one; the member row binds none of these lambdas.
 *
 * The item extras are a SECOND parameter rather than a prop, because a caller passing `item` in
 * `props` would silently replace the one that carries `isAdmin` — which it did, and it turned
 * `member()` into a second `admin()` for one assertion here before the run caught it.
 */
const admin = (props: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) =>
  draw({ ...props, item: item({ isAdmin: true, ...extra }) });
const member = (props: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) =>
  draw({ ...props, item: item({ isAdmin: false, ...extra }) });

describe('RM-11 — the four nodes presenterMsgsOnTheRight paints', () => {
  it('mirrors the inner row with `flex-row-reverse`, which is what g1e binds', () => {
    /* `z("ngClass", ct(30, g1e, …presenterMsgsOnTheRight))` at byte 1,373,250, on const 8. */
    const on = admin({ presenterMessagesOnTheRight: true });
    expect(on).toContain('w-100 d-inline-flex align-items-center flex-row-reverse');

    /*
      The control: without the setting the row keeps its source order. Asserted as the CLOSING
      quote rather than as `not.toContain('flex-row-reverse')`, because the row's own parent —
      const 7, `w-100 h-100 d-flex flex-row-reverse` — carries that class unconditionally on every
      admin row. A bare `not.toContain` here is red no matter what this node does.
    */
    const off = admin({ presenterMessagesOnTheRight: false });
    expect(off).toContain('class="w-100 d-inline-flex align-items-center"');
  });

  it('does NOT paint presenter-msg-right on that row — that was ours', () => {
    /*
      `presenter-msg-right` is a REAL class of this component and the wrong one for this node: it
      sets text-align and margin, so the children never moved. It belongs on the BODY (b1e) and the
      REPLY wrapper (v1e), both asserted below.
    */
    const on = admin({ presenterMessagesOnTheRight: true });
    expect(on).not.toContain('align-items-center presenter-msg-right');
  });

  it('gives the plain body `presenter-msg-right flex-fill`, which b1e binds', () => {
    /* `$a(13, b1e, mention, question, presenterMsgsOnTheRight)` at byte 1,369,889, on const 25. */
    expect(admin({ presenterMessagesOnTheRight: true })).toContain('presenter-msg-right flex-fill');
    expect(admin({ presenterMessagesOnTheRight: false })).not.toContain('flex-fill');
  });

  it('gives the body WRAPPER `flex-fill`, or `w-100` when there is a reply and the setting is off', () => {
    /*
      `Kn(32, _1e, msg.repl && !presenterMsgsOnTheRight, presenterMsgsOnTheRight)` at byte
      1,374,249, on const 23. The two terms are mutually exclusive and the first also requires a
      reply, so a plain message with the setting off gets NEITHER — which is the third case.
    */
    const wrapper = (html: string) =>
      /class="(d-inline-flex msg-left preText ml-2 float-right align-baseline[^"]*)"/.exec(
        html
      )?.[1];

    expect(wrapper(admin({ presenterMessagesOnTheRight: true }))).toContain('flex-fill');
    expect(wrapper(admin({}, { replyToBody: 'hi', replyToName: 'B' }))).toContain('w-100');
    expect(wrapper(admin())).toBe('d-inline-flex msg-left preText ml-2 float-right align-baseline');
  });

  it('binds NONE of them on the member row, because the member template has no ngClass', () => {
    /*
      Compact consts 55, 64, 75 and 65 are the member's four, and every one of them is a plain class
      list. This is the negative control for all four assertions above at once: dropping the
      `reverseMessage` term from any of them turns this red.
    */
    const html = member({ presenterMessagesOnTheRight: true });
    expect(html).not.toContain('flex-row-reverse');
    expect(html).not.toContain('presenter-msg-right');
    expect(html).not.toContain('flex-fill');
    expect(html).not.toContain('presenter-reactions-right');
  });
});

describe('RM-12 — the compact reaction strip', () => {
  const withReaction = { reactions: { fire: { emoji: '🔥', clickedBy: ['someone'] } } };

  it('right-aligns on the admin row when the setting is on', () => {
    /* `ct(6, y1e, …)` at byte 1,372,053, on const 26. */
    expect(
      admin({ presenterMessagesOnTheRight: true, enableReactions: true }, withReaction)
    ).toContain('reactions-container presenter-reactions-right');
  });

  it('and does not when it is off — const 26 is the ONLY container with an ngClass', () => {
    const off = admin({ presenterMessagesOnTheRight: false, enableReactions: true }, withReaction);
    expect(off).toContain('class="reactions-container"');
    expect(off).not.toContain('presenter-reactions-right');
  });
});

describe('RM-10 — the two compact stamps', () => {
  it('pads the ADMIN stamp and leaves the member s flush', () => {
    /*
      ```js
      Ne(" [", Ct(29, 27, e.msg.t, "h:mm a"), "] ")   // z1e,  admin
      Ne("[",  Ct(3,  6,  e.msg.t, "h:mm a"), "]")    // a_e,  member
      ```
      Asserted as the exact bracketed run rather than with `toContain('[')`, because a one-space
      divergence is precisely what a looser assertion cannot see.
    */
    const stamp = (html: string) => /class="created-at[^"]*"[^>]*>([^<]*)</.exec(html)?.[1];

    expect(stamp(admin())).toMatch(/^ \[\d{1,2}:\d{2} [AP]M\] $/);
    expect(stamp(member())).toMatch(/^\[\d{1,2}:\d{2} [AP]M\]$/);
  });
});

describe('RM-25 — the compact reply block', () => {
  const REPLY = { replyToBody: 'the quoted line', replyToName: 'Someone Else' };

  it('is the reference s three-deep shape, not the answered tick s two classes', () => {
    /*
      `U1e` at byte 1,370,300: div43 > [ div44 > [strong45, div46], div47 ]. This wore compact
      const 24 — `ms-1 private-reply`, which is the TICK's const — with `private-reply-message` as
      a SIBLING of the name instead of the box that wraps it.
    */
    const html = admin({}, REPLY);
    expect(html).toContain('msg-left text-formated preText ml-2 mr-2 p-0 pe-3 w-100');
    expect(html).toContain('private-reply-message w-100');
    expect(html).toContain('<strong class="d-block username"');
    /* The tick keeps its own markup, and it is now the only thing wearing it. */
    expect(html).not.toContain('<div class="ms-1 private-reply">\n');
  });

  it('carries the theme background the reference picks by preference', () => {
    /* `"lightTheme" == theme ? "private-reply-bg-light" : "private-reply-bg-dark"`. */
    expect(admin({ theme: 'light' }, REPLY)).toContain('private-reply-bg-light');
    expect(admin({ theme: 'dark' }, REPLY)).toContain('private-reply-bg-dark');
  });

  it('applies v1e to the outer div on the admin row only', () => {
    /* `ct(29, v1e, presenterMsgsOnTheRight)` on const 43; the member's const 76 has no ngClass. */
    expect(admin({ presenterMessagesOnTheRight: true }, REPLY)).toContain(
      'pe-3 w-100 presenter-msg-right'
    );
    expect(member({ presenterMessagesOnTheRight: true }, REPLY)).not.toContain(
      'presenter-msg-right'
    );
  });
});

describe('RM-08 — the compact menu s three divergent labels', () => {
  const MENU = readFileSync(new URL('./components/MessageMenu.svelte', import.meta.url), 'utf8');

  it('carries the four enumerated menus values, trailing spaces included', () => {
    /* Bytes 1,329,666 / 1,329,852 / 1,330,027 against 1,368,002 / 1,368,189 / 1,368,363. */
    expect(MESSAGE_MENU_TEXT.regular).toEqual({
      showAll: 'Show message to all',
      report: 'Alert Send Report ',
      reply: 'Reply'
    });
    expect(MESSAGE_MENU_TEXT.compact).toEqual({
      showAll: 'Show message to all ',
      report: 'Show Send Report ',
      reply: 'Reply '
    });
  });

  it('keeps the CARD text and the capture LOOKUP in step, which are two different jobs', () => {
    /*
      `MESSAGE_MENU_LABEL` matches captured DOM entries to gates and every captured kebab came from
      `app-st-message`. If the card's rendered text and that lookup ever disagree beyond the
      reference's own trailing space, one of them is wrong.
    */
    expect(MESSAGE_MENU_TEXT.regular.showAll).toBe(MESSAGE_MENU_LABEL.showAll);
    expect(MESSAGE_MENU_TEXT.regular.report.trimEnd()).toBe(MESSAGE_MENU_LABEL.report);
    expect(MESSAGE_MENU_TEXT.regular.reply).toBe(MESSAGE_MENU_LABEL.reply);
  });

  it('renders `Show Send Report` in compact mode and `Alert Send Report` on the card', () => {
    const compact = draw({ viewerIsPresenter: true, kind: 'alert' });
    expect(compact).toContain('Show Send Report ');
    expect(compact).not.toContain('Alert Send Report');

    const card = draw({ displayMode: 'r', viewerIsPresenter: true, kind: 'alert' });
    expect(card).toContain('Alert Send Report ');
    expect(card).not.toContain('Show Send Report');
  });

  it('renders one label set per variant rather than one for all three', () => {
    /*
      The defect the row names: `MessageMenu` had the card's words hard-coded and all three variants
      shared them. The nine identical entries stay literal markup, so this asserts that exactly the
      three that diverge are the three that go through the table.
    */
    expect(MENU).toContain("MESSAGE_MENU_TEXT[variant === 'regular' ? 'regular' : 'compact']");
    expect(MENU).toContain('{text.showAll}');
    expect(MENU).toContain('{text.report}');
    expect(MENU).toContain('{text.reply}');
    expect(MENU).toContain('&nbsp;&nbsp;Mark Answered');
  });
});
