import { describe, expect, it } from 'vitest';

import { isMentionOf } from './mention';

/*
  The reference's `isMention`, term by term. Every case below is a behaviour this room got WRONG
  until 2026-08-14, when the rule was `body.includes('@' + currentUserName)` — case-sensitive, no
  trailing space, and blind to `@all`.
*/

describe('isMentionOf', () => {
  it('matches a plain mention', () => {
    expect(isMentionOf('hey @bob can you look', 'bob')).toBe(true);
  });

  it('is case-insensitive on BOTH sides', () => {
    // `e.txt.toLowerCase()` and `globals.user.name.toLowerCase()`.
    expect(isMentionOf('hey @Bob', 'bob')).toBe(false); // no trailing space — see below
    expect(isMentionOf('hey @Bob there', 'bob')).toBe(true);
    expect(isMentionOf('hey @bob there', 'BOB')).toBe(true);
  });

  it('requires the trailing space, so @bobby never pings bob', () => {
    /*
      The whole point of the space. Without it, every longer name containing a shorter one would
      ping the shorter one on every message.
    */
    expect(isMentionOf('hey @bobby there', 'bob')).toBe(false);
    expect(isMentionOf('hey @bob there', 'bob')).toBe(true);
  });

  it('does NOT match a mention at the very end of a message', () => {
    /*
      Looks like a bug, is the reference's behaviour, and is reproduced deliberately: the rule is
      `indexOf('@name ')` and a message ending in `@bob` has no space after it. Recorded here so
      nobody "fixes" it back and changes who gets pinged.
    */
    expect(isMentionOf('are you there @bob', 'bob')).toBe(false);
    expect(isMentionOf('are you there @bob ', 'bob')).toBe(true);
  });

  it('honours @all ONLY from an admin', () => {
    expect(isMentionOf('@all please stand by', 'bob', true)).toBe(true);
    // A member typing it pings nobody — `e.isA` is the message's own admin flag.
    expect(isMentionOf('@all please stand by', 'bob', false)).toBe(false);
  });

  it('@all needs its trailing space too', () => {
    expect(isMentionOf('@allen is here', 'bob', true)).toBe(false);
  });

  it('is safe with no name and no body', () => {
    // `@ ` would otherwise match nearly everything.
    expect(isMentionOf('hey @ there', '')).toBe(false);
    expect(isMentionOf('hey @ there', null)).toBe(false);
    expect(isMentionOf(null, 'bob')).toBe(false);
    expect(isMentionOf('', 'bob')).toBe(false);
  });

  it('still finds @all for an admin when the viewer has no name', () => {
    expect(isMentionOf('@all stand by', null, true)).toBe(true);
  });
});
