import { describe, expect, it } from 'vitest';

import { defaultChatStyleForTheme, defaultFollowChatStyle } from './chat-style';

/*
  THE TWO CHAT STYLES, ASSERTED BY VALUE — which nothing did until 2026-08-17.

  Both functions lived on `+page.svelte` and `alerts-background-contract.test.ts` checked them by
  SLICING THE PAGE and reading the literals back as text. That instrument can confirm the characters
  `#e8e8e8` appear somewhere between two braces. It cannot confirm the function RETURNS them, cannot
  tell the light branch from the dark one, and cannot notice the two objects drifting into each
  other — which is the exact defect that produced them.

  ## The defect these two functions exist because of

  They were ONE function returning the FOLLOW default. `RoomMessage` applies the global style inline
  to every chat message without a colour of its own, and an inline style beats every stylesheet rule.
  So every chat message carried `background-color: #ffffff` while alerts sat on `#e8e8e8`: chat white,
  alerts grey, when the capture has them identical.

  The values below are therefore not decoration. `bgColor` and `fontSize` are the two fields that
  differ between the room style and the follow style, and they are the two the merge got wrong.
*/

const ROOM_LIGHT = {
  color: '#1a1a1a',
  tickerColor: '#1a1a1a',
  usernameColor: '#365d7d',
  bgColor: '#e8e8e8',
  fontSize: 13,
  playSound: true
};

const ROOM_DARK = {
  color: '#f7fd37',
  tickerColor: '#f7fd37',
  usernameColor: '#c0d8ed',
  bgColor: '#000000',
  fontSize: 13,
  playSound: true
};

describe('the ROOM style — globals.chatStyle', () => {
  it('returns the captured light theme exactly', () => {
    // `lightTheme:{color:"#1a1a1a",…,bgColor:"#e8e8e8",fontSize:"13"}`.
    expect(defaultChatStyleForTheme('light')).toEqual(ROOM_LIGHT);
  });

  it('returns the captured dark theme exactly', () => {
    /*
      The capture writes `bgColor:"#000"`; this returns `#000000`. Same colour, and the long form is
      used because every other value here is six digits and `RoomMessage` writes it into an inline
      style where a reader comparing against a screenshot will see the six-digit form.
    */
    expect(defaultChatStyleForTheme('dark')).toEqual(ROOM_DARK);
  });
});

describe('the FOLLOW style — a different captured default', () => {
  it('differs from the room style in exactly TWO fields, and they are the ones that regressed', () => {
    /*
      The heart of it. A followed user's messages must STAND OUT: white instead of `#e8e8e8`, 14px
      instead of 13. Every other field is shared, which is precisely why merging the two functions
      looked harmless and why this asserts the DIFFERENCE rather than the values alone.
    */
    const room = defaultChatStyleForTheme('light');
    const follow = defaultFollowChatStyle('light');

    const differing = Object.keys(room).filter(
      (key) => room[key as keyof typeof room] !== follow[key as keyof typeof follow]
    );
    expect(differing.sort()).toEqual(['bgColor', 'fontSize']);
    expect(follow.bgColor).toBe('#ffffff');
    expect(follow.fontSize).toBe(14);
  });

  it('is 14px in BOTH themes, where the room style is 13', () => {
    // Asserted on both branches: a merge that fixed only the light one would pass a single check.
    expect(defaultFollowChatStyle('light').fontSize).toBe(14);
    expect(defaultFollowChatStyle('dark').fontSize).toBe(14);
    expect(defaultChatStyleForTheme('light').fontSize).toBe(13);
    expect(defaultChatStyleForTheme('dark').fontSize).toBe(13);
  });

  it('shares the dark background with the room style, which is NOT a bug', () => {
    /*
      Stated because it looks like one. In dark theme both are `#000000` — the capture's follow style
      is `bgColor:"#000000"` and the room's is `#000`. The two functions genuinely agree here, so a
      future reader diffing them does not "fix" it into a difference the capture does not have.
    */
    expect(defaultFollowChatStyle('dark').bgColor).toBe('#000000');
    expect(defaultChatStyleForTheme('dark').bgColor).toBe('#000000');
    // …and they still differ on the field that matters.
    expect(defaultFollowChatStyle('dark').fontSize).not.toBe(
      defaultChatStyleForTheme('dark').fontSize
    );
  });
});

describe('the two never become one function again', () => {
  it('light-theme backgrounds differ, which is the regression that named this file', () => {
    /*
      The single assertion that would have caught the original defect. When one function served both,
      this returned `#ffffff` for the room style and every chat message went white against grey
      alerts.
    */
    expect(defaultChatStyleForTheme('light').bgColor).toBe('#e8e8e8');
    expect(defaultFollowChatStyle('light').bgColor).toBe('#ffffff');
    expect(defaultChatStyleForTheme('light').bgColor).not.toBe(
      defaultFollowChatStyle('light').bgColor
    );
  });

  it("returns a FRESH object each call, so one caller cannot mutate another's style", () => {
    /*
      Both return object literals rather than module-level constants. A shared frozen constant would
      be fine; a shared MUTABLE one would let `RoomMessage` writing a per-message colour leak into
      every other message. Cheapest possible proof that the literal is inside the function.
    */
    const first = defaultChatStyleForTheme('light');
    const second = defaultChatStyleForTheme('light');
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });
});
