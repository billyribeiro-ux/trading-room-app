import { describe, expect, it } from 'vitest';
import { toggleReaction } from './reaction-toggle';

/*
  The four rules, executed. They existed in three copies — two in the message-action server branches
  and one in the page's optimistic update — and none of the three was ever run by a test that read
  the result. The server copies were reachable only through the action; the client one not at all.
*/

const ME = 'hash-me';
const YOU = 'hash-you';

describe('toggling one reaction', () => {
  it('adds the clicker when they are not there', () => {
    expect(toggleReaction({}, 'thumbsup', '👍', ME)).toEqual({
      thumbsup: { emoji: '👍', clickedBy: [ME] }
    });
  });

  it('removes them when they are, and drops the KEY when nobody is left', () => {
    /*
      Not `clickedBy: []`. An empty array still renders a chip with a zero on it, which is the
      difference between "nobody reacted" and "a reaction with no one behind it".
    */
    const one = { thumbsup: { emoji: '👍', clickedBy: [ME] } };
    expect(toggleReaction(one, 'thumbsup', '👍', ME)).toEqual({});
  });

  it('is per person, so one leaving does not remove another', () => {
    const both = { thumbsup: { emoji: '👍', clickedBy: [ME, YOU] } };
    expect(toggleReaction(both, 'thumbsup', '👍', ME)).toEqual({
      thumbsup: { emoji: '👍', clickedBy: [YOU] }
    });
  });

  it('keeps the FIRST emoji, so a later click cannot change what others see', () => {
    // `reaction.emoji || emoji`. A client sending a different glyph for the same key is ignored.
    const existing = { thumbsup: { emoji: '👍', clickedBy: [YOU] } };
    expect(toggleReaction(existing, 'thumbsup', '🎉', ME).thumbsup.emoji).toBe('👍');
  });

  it('never mutates its input', () => {
    /*
      The server passes a freshly parsed object and the client passes an item's live `reactions`.
      Mutating would make the optimistic update land before the request did — and land even if the
      request were then refused.
    */
    const before = { thumbsup: { emoji: '👍', clickedBy: [YOU] } };
    const snapshot = structuredClone(before);
    toggleReaction(before, 'thumbsup', '👍', ME);
    expect(before).toEqual(snapshot);
  });

  it('leaves other keys alone', () => {
    const many = {
      thumbsup: { emoji: '👍', clickedBy: [YOU] },
      party: { emoji: '🎉', clickedBy: [ME] }
    };
    expect(toggleReaction(many, 'thumbsup', '👍', ME).party).toEqual({
      emoji: '🎉',
      clickedBy: [ME]
    });
  });
});
