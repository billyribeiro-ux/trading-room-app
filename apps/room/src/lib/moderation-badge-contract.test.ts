import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The `Trial` and `New` badges in the user-info modal are PRESENTER-ONLY, and were not.
 *
 * ## What was wrong
 *
 * Bundle byte 2,060,925, the two consecutive slots in `app-user-info-modal`:
 *
 * ```js
 * O(19, globals.isPresenter && user.isFT ? 19 : -1)
 * O(20, globals.sessData.isNewIndicatorOn && globals.isPresenter && user.isNew ? 20 : -1)
 * ```
 *
 * This room rendered `{#if targetUser.isTrial}` and `{#if targetUser.isNew}` — **one term between
 * them, and it was the wrong one in both cases.** Whether somebody is on a free trial, or is new to
 * the room, is a moderation fact about another member. The role term is the one that keeps it that
 * way, and this room could evaluate it the whole time: `isPresenter` has been a prop on `ModalHost`
 * since it was written.
 *
 * The `Trial` badge is the live half — `isTrial` HAS a supply — so a member who opened another
 * member's info card could read their billing status.
 *
 * The controller now derives `isNew` from immutable membership creation time using a documented
 * thirty-day window. The room receives that server-owned fact and applies all three terms.
 */
const modalHost = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');

describe('the user-info badges', () => {
  it('shows the Trial badge to presenters only', () => {
    expect(modalHost).toContain('{#if isPresenter && targetUser.isTrial}');
  });

  it('shows the New badge to presenters only', () => {
    expect(modalHost).toContain('{#if showNewIndicator && isPresenter && targetUser.isNew}');
  });

  /*
    THE UNGATED FORMS, refused by name. `toContain` on the fixed spelling passes just as well when a
    second, ungated copy is added beside it — which is how a badge comes back.
  */
  it('has no ungated copy of either', () => {
    expect(modalHost).not.toContain('{#if targetUser.isTrial}');
    expect(modalHost).not.toContain('{#if targetUser.isNew}');
  });
});

describe('the setting behind the New badge has an authoritative supply', () => {
  it('crosses the room boundary now that its data has a consumer', () => {
    const boundary = readFileSync(
      new URL('../../../controller/src/lib/room-config.ts', import.meta.url),
      'utf8'
    );
    expect(boundary).toContain("'isNewIndicatorOn'");
  });

  /*
    THE MEASUREMENT, re-run rather than quoted. If a feed ever starts supplying `isNew`, this goes
    red and the triage row and the gate both become work — which is the point: the BLOCKED
    disposition is a claim about the repository, and a claim about the repository should be checked
    by reading the repository.
  */
  it('derives and transports `isNew` on server-owned membership data', () => {
    const serverFiles = [
      '../lib/server/room-events.ts',
      '../lib/server/room-config-client.ts',
      '../../../controller/src/routes/internal/room-config/[code]/+server.ts'
    ];
    for (const file of serverFiles) {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8');
      const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(withoutComments, `${file} must participate in the isNew supply`).toMatch(/\bisNew\b/);
    }
  });
});
