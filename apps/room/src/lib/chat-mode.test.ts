import { describe, expect, it } from 'vitest';

import {
  CHAT_MODES,
  chatComposerEnabled,
  isChatMode,
  isWebinarMode,
  webinarMessageVisible
} from './chat-mode';

/*
  The three modes, and webinar mode's filter.

  The filter is transcribed from the arrival handler, not from the tooltip:

    if ("p" == chatMode && !isPresenter && !user.hasAdminChat
        && ( (!te.isA && te.uid != userID)
             || (te.txt.indexOf("@") >= 0 && !te.isMention && te.uid != userID) ))
      continue;

  The tooltip says only "users only see their own chat messages, while Presenters see everyones",
  which is looser than the code in two ways that matter: admin messages survive, and an `@` can
  suppress one. Every case below is the CODE.
*/

const member = { id: 7, isPresenter: false, hasAdminChat: false };
const presenter = { id: 1, isPresenter: true, hasAdminChat: false };
const adminChat = { id: 9, isPresenter: false, hasAdminChat: true };

const msg = (over: Partial<Parameters<typeof webinarMessageVisible>[0]> = {}) => ({
  isAdmin: false,
  senderId: 42,
  body: 'hello',
  isMention: false,
  ...over
});

describe('the three modes', () => {
  it('are the reference letters, and nothing else is accepted', () => {
    expect([...CHAT_MODES]).toEqual(['g', 'p', 'd']);
    for (const mode of CHAT_MODES) expect(isChatMode(mode)).toBe(true);
    for (const bad of ['', 'G', 'group', 'disabled', 'x']) expect(isChatMode(bad)).toBe(false);
  });

  it("`'d' != e` decides whether there is a composer at all", () => {
    expect(chatComposerEnabled('g')).toBe(true);
    expect(chatComposerEnabled('p')).toBe(true);
    expect(chatComposerEnabled('d')).toBe(false);
  });

  it("`'p' == e` decides webinar mode", () => {
    expect(isWebinarMode('p')).toBe(true);
    expect(isWebinarMode('g')).toBe(false);
    expect(isWebinarMode('d')).toBe(false);
  });
});

describe('webinarMessageVisible', () => {
  it('does not filter a presenter, or anyone with hasAdminChat', () => {
    // `!e.globals.isPresenter && !e.globals.user.hasAdminChat` guards the whole condition.
    expect(webinarMessageVisible(msg(), presenter)).toBe(true);
    expect(webinarMessageVisible(msg(), adminChat)).toBe(true);
  });

  it('hides another member’s ordinary message from a member', () => {
    // `!te.isA && te.uid != e.userID` — the clause the tooltip is describing.
    expect(webinarMessageVisible(msg({ senderId: 42 }), member)).toBe(false);
  });

  it('always shows you your own messages', () => {
    // Both clauses exclude `uid == me`, so nothing you sent can be filtered from you.
    expect(webinarMessageVisible(msg({ senderId: member.id }), member)).toBe(true);
    expect(webinarMessageVisible(msg({ senderId: member.id, body: 'hi @bob' }), member)).toBe(true);
  });

  it('shows admin messages, which the tooltip does not say', () => {
    // `!te.isA` — an admin message survives the first clause, so a member still sees the presenter.
    expect(webinarMessageVisible(msg({ isAdmin: true }), member)).toBe(true);
  });

  it('hides a message mentioning SOMEBODY ELSE, even from an admin', () => {
    /*
      The asymmetry, reproduced deliberately: the second clause has no `isA` guard, so an admin
      message containing an `@` that is not a mention of you is dropped. That looks like an
      oversight upstream; guessing it was meant otherwise would be inventing a rule.
    */
    expect(webinarMessageVisible(msg({ body: 'hi @carol', isAdmin: true }), member)).toBe(false);
    expect(webinarMessageVisible(msg({ body: 'hi @carol' }), member)).toBe(false);
  });

  it('does NOT let a mention pierce webinar mode for member-to-member messages', () => {
    /*
      The first draft of this test asserted the opposite, and the code was right.

      Clause one — `!te.isA && te.uid != e.userID` — drops any non-admin message from somebody else
      whether or not it mentions you. The mention escape lives only in clause TWO, which is reached
      solely by messages that already survived clause one, i.e. admin messages and your own. So in
      webinar mode another member cannot reach you by typing your name, which is the point of
      webinar mode.
    */
    expect(webinarMessageVisible(msg({ body: 'hi @me', isMention: true }), member)).toBe(false);
  });

  it('but an ADMIN message that mentions you survives both clauses', () => {
    expect(
      webinarMessageVisible(msg({ body: 'hi @me', isMention: true, isAdmin: true }), member)
    ).toBe(true);
  });

  it('compares the sender by SAMENESS, so it survives ids becoming uuids', () => {
    /*
      `te.uid != e.userID` is an equality test upstream and stays one here. `id-opacity-contract`
      exists because a previous version did arithmetic on an id.
    */
    const uuidViewer = { id: 'a0e9-…', isPresenter: false, hasAdminChat: false };
    expect(webinarMessageVisible(msg({ senderId: 'a0e9-…' }), uuidViewer)).toBe(true);
    expect(webinarMessageVisible(msg({ senderId: 'b2f4-…' }), uuidViewer)).toBe(false);
  });
});
