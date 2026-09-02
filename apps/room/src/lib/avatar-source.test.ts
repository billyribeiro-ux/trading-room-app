import { describe, expect, it } from 'vitest';
import { isGravatar } from './avatar-source';

/*
  THE PREDICATE THAT DECIDES WHETHER "Remove profile picture" IS OFFERED.

  It lived inside `ModalHost.svelte` — six thousand lines — where nothing could reach it without
  mounting the component, so the four cases below had never been run. They are here because the
  extraction is only worth doing if the module is actually exercised; moving a function and leaving
  it untested is the line-count exercise `source-size-contract.test.ts` refuses.

  Every input is a value this room's `users.avatar_url` column genuinely holds, not an invented one:
  the `notNull()` default, the gravatar `connection.ts` upgrades to, and an uploaded picture.
*/
describe('isGravatar — the only "did they set one" signal this room has', () => {
  it('says yes to the gravatar this room stores', () => {
    /* `gravatarUrl` in `server/connection.ts` — the exact shape written on connect. */
    expect(isGravatar('https://secure.gravatar.com/avatar/abc123?d=mm&s=50')).toBe(true);
  });

  it('says no to the column default, which is a RELATIVE path and throws in `new URL`', () => {
    /*
      `/avatar.svg` is `text('avatar_url').notNull().default('/avatar.svg')`. Any account that has
      not connected since `connection.ts:148` began upgrading avatars still holds it, so the catch
      is the answer for a real stored value rather than defensive padding.
    */
    expect(isGravatar('/avatar.svg')).toBe(false);
  });

  it('says no to an uploaded picture on another host', () => {
    expect(isGravatar('https://cdn.example.test/u/42.png')).toBe(false);
  });

  it('matches on HOSTNAME, so a lookalike host in the path does not pass', () => {
    /*
      The reason this is `new URL(...).hostname` and not `startsWith` or `includes`. Substring
      matching on a URL has cost this repository real time elsewhere; a path segment is not a host.
    */
    expect(isGravatar('https://evil.test/secure.gravatar.com/avatar/abc')).toBe(false);
  });
});
