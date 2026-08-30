import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import RoomMessage from './components/RoomMessage.svelte';

/**
 * RM-05 — which messages take the ADMIN card, and the term of ours that was not the reference's.
 *
 * Both renderers gate the split on a comparison against a log type that does not exist:
 *
 * ```js
 * O(3, o.msg.isA && "alert" != o.logType ? 3 : 4)                       // app-st-message,        1,361,608
 * O(3, o.msg.isA && "alert" != o.logType && "pc" != o.logType ? 3 : 4)  // app-st-compactmessage, 1,400,148
 * ```
 *
 * `"alert"` is SINGULAR. The audit row called this "a candidate rather than a certainty" because
 * the captured DOM might have been the better authority and is absent from this checkout. The
 * bundle settles it without the capture: enumerating every `logType` literal in it gives 32
 * `alerts`, 23 `chat`, 3 `pc` — and exactly 2 `alert`, which are these two comparisons and nothing
 * else. A term that can never be false is not a term.
 *
 * `"pc" != o.logType` IS live, and never reaches this component: a private message renders through
 * `CompactMessageRow`. So upstream's gate is `msg.isA`, in both renderers, for everything this file
 * draws — and the box class says it with no term at all, `ct(30, o6, e.msg.isA)` at byte 1,334,988
 * where `o6 = t => ({"msg-box-adm": t})`.
 *
 * **What changes on screen:** an alert posted by a presenter now takes the reversed admin card.
 */

const BUNDLE = new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url);

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

const draw = (props: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) =>
  render(RoomMessage, {
    props: {
      kind: 'chat',
      currentUserId: 99,
      currentUserEmailHash: 'hash-of-the-viewer',
      viewerIsPresenter: false,
      theme: 'dark',
      menuOpen: false,
      showDateSeparator: false,
      ontoggle: () => {},
      onaction: () => {},
      ...props,
      item: item(extra)
    } as never
  }).body;

describe('the evidence the row rests on, read rather than recalled', () => {
  it('finds `alert` singular ONLY in the two dead comparisons', () => {
    /*
      Read from the pinned bundle in this test rather than quoted from a comment, because the whole
      claim is a counting claim: if a future capture introduces an `alerts` -> `alert` rename, this
      turns red and the code above it becomes wrong at the same moment.
    */
    const bundle = readFileSync(BUNDLE, 'utf8');
    const literals = [
      ...bundle.matchAll(/logType","([a-z]+)"|logType:"([a-z]+)"|logType="([a-z]+)"/g),
      ...bundle.matchAll(/"([a-z]+)"===?\s*[a-z]\.logType|[a-z]\.logType\s*===?\s*"([a-z]+)"/g),
      ...bundle.matchAll(/"([a-z]+)"!=\s*[a-z]\.logType/g)
    ].map((match) => match.slice(1).find(Boolean));

    const counts = new Map<string, number>();
    for (const value of literals) counts.set(value!, (counts.get(value!) ?? 0) + 1);

    expect(counts.get('alerts')).toBe(32);
    expect(counts.get('chat')).toBe(23);
    expect(counts.get('pc')).toBe(3);
    /* And the two `alert` occurrences are the render gates themselves. */
    expect(counts.get('alert')).toBe(2);
    expect(bundle).toContain('o.msg.isA&&"alert"!=o.logType?3:4');
    expect(bundle).toContain('o.msg.isA&&"alert"!=o.logType&&"pc"!=o.logType?3:4');
  });
});

describe('an ADMIN message takes the admin card on both logs', () => {
  for (const displayMode of ['r', 'c'] as const) {
    const host = displayMode === 'r' ? 'card' : 'compact';

    it(`reverses an admin CHAT message — the ${host} renderer`, () => {
      expect(draw({ displayMode, kind: 'chat' })).toContain('msg-box-adm');
    });

    it(`reverses an admin ALERT too, which it did not — the ${host} renderer`, () => {
      expect(draw({ displayMode, kind: 'alert' })).toContain('msg-box-adm');
    });

    it(`leaves a MEMBER message forward on both logs — the ${host} renderer`, () => {
      /* The control. `msg.isA` is the whole gate, so a member must move on neither log. */
      expect(draw({ displayMode, kind: 'chat' }, { isAdmin: false })).not.toContain('msg-box-adm');
      expect(draw({ displayMode, kind: 'alert' }, { isAdmin: false })).not.toContain('msg-box-adm');
    });
  }

  it('renders the card in the reversed DIRECTION, not only with the reversed class', () => {
    /* `Bge` is `mr-1 d-flex flex-row-reverse`; `f1e` is `mr-1 d-flex flex-row`. */
    expect(draw({ displayMode: 'r', kind: 'alert' })).toContain('mr-1 d-flex flex-row-reverse');
    expect(draw({ displayMode: 'r', kind: 'alert' }, { isAdmin: false })).toContain(
      'mr-1 d-flex flex-row'
    );
  });
});

describe('a captured row still renders what was captured', () => {
  it('lets evidenceDirection and evidenceMessageBoxClass win outright', () => {
    /*
      This is why the change is safe against the evidence the audit row worried about: a captured
      admin alert carries its own direction and its own class list, and neither reads `isAdmin`.
    */
    const forward = draw(
      { displayMode: 'r', kind: 'alert' },
      {
        evidenceKey: 'captured-row-7',
        evidenceDirection: 'forward',
        evidenceMessageBoxClass: 'msg-box pb-1'
      }
    );
    expect(forward).toContain('mr-1 d-flex flex-row');
    expect(forward).not.toContain('flex-row-reverse');
    expect(forward).not.toContain('msg-box-adm');
  });
});
