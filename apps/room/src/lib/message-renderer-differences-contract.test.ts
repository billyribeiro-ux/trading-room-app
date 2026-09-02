import { readFileSync } from 'node:fs';
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';

import RoomMessage from './components/RoomMessage.svelte';
import {
  alertQaCountText,
  CARD_USERNAME_TEXT_PRIMARY_REFUSED,
  COMPACT_MEMBER_REACTION_GATE_BUILT,
  DATE_SEPARATOR_TAKES_BODY_STYLE,
  TRIAL_BADGE_TEXT,
  usernameRowStyle
} from './message-renderer-differences.js';
import { codeOf } from './source-comments';

/**
 * `RMSG-01` … `RMSG-06` — the six places `app-st-message` and `app-st-compactmessage` disagree, and
 * the two places this room disagreed with both.
 *
 * Every claim below is checked in the direction that can fail. The bundle claims are executed
 * against the **pinned bundle at run time** rather than quoted, because each is a counting claim:
 * "`fge` is bound exactly once" and "three of four repeaters carry the gate" stop being true the
 * moment a different capture is pinned, and a comment cannot notice that.
 *
 * The rendered claims are checked with a CONTROL on the other layout, because the whole family of
 * findings is "the reference binds this on ONE of the two and we applied it to both".
 */

const BUNDLE = new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url);

const MESSAGE = codeOf(
  'components/RoomMessage.svelte',
  readFileSync(new URL('./components/RoomMessage.svelte', import.meta.url), 'utf8')
);

const item = (extra: Record<string, unknown> = {}) => ({
  id: 11,
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

/* A message carrying its own colours, so every `styleF` binding below has something to render. */
const COLOURED = { fontColor: 'rgb(26, 26, 26)', backgroundColor: 'rgb(232, 232, 232)' };

describe('RMSG-01 — `text-primary` is applied by no reference template, and no longer by ours', () => {
  it('finds `fge` bound EXACTLY ONCE, on the member card, against a condition its own gate makes false', () => {
    const bundle = readFileSync(BUNDLE, 'utf8');
    /*
      Two occurrences in the whole file: the definition, and the single binding. A third would mean
      the class reaches a template this reading has not looked at, and the removal below would be
      wrong.
    */
    const uses = bundle.match(/(?<![\w$])fge(?![\w$])/g) ?? [];
    expect(uses).toHaveLength(2);
    expect(bundle).toContain('fge=t=>({"text-primary":t})');
    expect(bundle).toContain('ct(29,fge,e.msg.isA)');
    /*
      And the gate that decides WHICH template renders. Index 3 is the admin template, 4 is `f1e` —
      the one that carries the binding above — so `f1e` renders only when `msg.isA` is false, and
      the binding is false on every row that can evaluate it.
    */
    expect(bundle).toContain('o.msg.isA&&"alert"!=o.logType?3:4');
  });

  it('renders no `text-primary` on an admin alert, which is where ours put it', () => {
    expect(draw({ kind: 'alert' })).not.toContain('text-primary');
  });

  it('renders none on any of the other three combinations either', () => {
    /* The controls. It was `kind === 'alert' && isAdminMessage`, so these three were already clean —
       asserting them is what makes the first `it` a statement about the class rather than one row. */
    expect(draw({ kind: 'chat' })).not.toContain('text-primary');
    expect(draw({ kind: 'alert' }, { isAdmin: false })).not.toContain('text-primary');
    expect(draw({ kind: 'chat' }, { isAdmin: false })).not.toContain('text-primary');
  });

  it('keeps the measurement where the removal can be justified', () => {
    expect(CARD_USERNAME_TEXT_PRIMARY_REFUSED).toContain('1,344,339');
  });
});

describe('RMSG-02 — the username row takes the body style on the MEMBER card only', () => {
  it('binds it on the member layout', () => {
    expect(usernameRowStyle(false, 'color: red;')).toBe('color: red;');
  });

  it('and NOT on the admin layout, which is const 23 having no ngStyle section', () => {
    expect(usernameRowStyle(true, 'color: red;')).toBeUndefined();
  });

  it('proves the const pair it rests on, in the pinned bundle', () => {
    const bundle = readFileSync(BUNDLE, 'utf8');
    /* Const 23 — admin. No `3,` binding section at all. */
    expect(bundle).toContain(
      '[1,"d-flex","align-items-center","justify-content-between","flex-nowrap"]'
    );
    /* Const 58 — member. The same list plus `ngStyle`. */
    expect(bundle).toContain(
      '[1,"d-flex","align-items-center","justify-content-between","flex-nowrap",3,"ngStyle"]'
    );
  });

  it('renders the style on a member CHAT card, which ours withheld', () => {
    const html = draw({ kind: 'chat' }, { isAdmin: false, ...COLOURED });
    const at = html.indexOf('d-flex align-items-center justify-content-between flex-nowrap');
    expect(at, 'the username row must exist for this slice to test anything').toBeGreaterThan(-1);
    expect(html.slice(at, at + 160)).toContain('color: rgb(26, 26, 26)');
  });

  it('and withholds it on an admin ALERT card, which ours rendered', () => {
    const html = draw({ kind: 'alert' }, { ...COLOURED });
    const at = html.indexOf('d-flex align-items-center justify-content-between flex-nowrap');
    expect(at, 'the username row must exist for this slice to test anything').toBeGreaterThan(-1);
    expect(html.slice(at, at + 160)).not.toContain('color: rgb(26, 26, 26)');
  });
});

describe('RMSG-03 — the Q&A count span is padded on the card and bare in the compact row', () => {
  it('produces the card literal', () => {
    expect(alertQaCountText(3, false)).toBe(' (3) ');
  });

  it('produces the compact literal', () => {
    expect(alertQaCountText(3, true)).toBe('(3)');
  });

  it('reads both literals off the pinned bundle rather than trusting the two above', () => {
    const bundle = readFileSync(BUNDLE, 'utf8');
    /* `n1e` — the CARD's count span, byte 1,339,094. */
    expect(bundle).toContain('Ne(" (",e.msg.qa.length,") ")');
    /* `i_e` — the COMPACT one, byte 1,376,970. */
    expect(bundle).toContain('Ne("(",e.msg.qa.length,")")');
  });

  const QA = { questionCount: 3 };
  const ASK = { hasQaOnAlerts: true, kind: 'alert' as const };

  it('renders the bare form in the compact row', () => {
    const html = draw({ ...ASK, displayMode: 'c' }, { ...QA, isAdmin: false });
    expect(html).toContain('>(3)<');
  });

  it('renders the padded form on the card — the control that makes the compact one a difference', () => {
    const html = draw({ ...ASK, displayMode: 'r' }, { ...QA, isAdmin: false });
    expect(html).toContain('> (3) <');
  });
});

describe('RMSG-04 — the Trial badge is padded on the card and bare in the compact row', () => {
  it('reads both literals, and its unpadded `New` sibling, off the pinned bundle', () => {
    const bundle = readFileSync(BUNDLE, 'utf8');
    /* `Jge` (card) and `c_e` (compact) — same const 61, different text. */
    expect(bundle).toContain('d(0,"span",61),v(1," Trial ")');
    expect(bundle).toContain('d(0,"span",61),v(1,"Trial")');
    /*
      `New` is the control the finding rests on: it is unpadded in BOTH (`Zge`, `d_e`), which is why
      a padded Trial beside it is a transcription slip rather than a house rule.
    */
    expect(bundle.match(/d\(0,"span",62\),v\(1,"New"\)/g) ?? []).toHaveLength(2);
  });

  it('exposes the two literals separately', () => {
    expect(TRIAL_BADGE_TEXT.card).toBe(' Trial ');
    expect(TRIAL_BADGE_TEXT.compact).toBe('Trial');
  });

  const TRIAL = { isTrial: true, isAdmin: false };

  it('renders the bare word in the compact row', () => {
    const html = draw({ displayMode: 'c' }, TRIAL);
    expect(html).toContain('class="badge bg-danger trial-badge">Trial<');
  });

  it('renders the padded one on the card', () => {
    const html = draw({ displayMode: 'r' }, TRIAL);
    expect(html).toContain('class="badge bg-danger trial-badge"> Trial <');
  });
});

describe('RMSG-05 — the date separator anchor takes the body style, in both renderers', () => {
  it('reads the binding off the pinned bundle', () => {
    const bundle = readFileSync(BUNDLE, 'utf8');
    /* `_ge` (card, 1,328,773) and `S1e` (compact, 1,367,109) are the same six calls. */
    expect(bundle.match(/d\(0,"div",3\)\(1,"a",6\),v\(2\),Xe\(3,"date"\)/g) ?? []).toHaveLength(2);
    expect(
      bundle.match(/m\(\),z\("ngStyle",e\.styleF\),m\(\),Ze\(Ct\(3,2,e\.msg\.t,"fullDate"\)\)/g) ??
        []
    ).toHaveLength(2);
    expect(DATE_SEPARATOR_TAKES_BODY_STYLE).toContain('[3,"ngStyle"]');
  });

  for (const displayMode of ['r', 'c'] as const) {
    it(`paints it in the ${displayMode === 'r' ? 'card' : 'compact'} renderer`, () => {
      const html = draw({ displayMode, showDateSeparator: true }, COLOURED);
      const at = html.indexOf('class="separator"');
      expect(at, 'the separator must render for this slice to test anything').toBeGreaterThan(-1);
      expect(html.slice(at, at + 140)).toContain('color: rgb(26, 26, 26)');
    });
  }

  it('emits no style when the message carries no colours — the control', () => {
    const html = draw({ showDateSeparator: true });
    const at = html.indexOf('class="separator"');
    expect(at).toBeGreaterThan(-1);
    expect(html.slice(at, at + 140)).not.toContain('style="color');
  });
});

describe('RMSG-06 — three of the four repeaters gate the pill, and ours now match all four', () => {
  it('finds the gate on exactly three of the four repeaters in the pinned bundle', () => {
    const bundle = readFileSync(BUNDLE, 'utf8');
    const gates = bundle.match(/O\(1,e\.value\.clickedBy\.length>0\?1:-1\)/g) ?? [];
    expect(gates).toHaveLength(3);
    /* And the fourth — `m_e`, which opens the pill directly with no `H(1, …)` in front of it. */
    expect(bundle).toContain('function m_e(t,n){if(1&t){const e=Y();d(0,"span")(1,"span",51)');
    expect(COMPACT_MEMBER_REACTION_GATE_BUILT).toContain('1,379,950');
  });

  const REACTED = {
    reactions: {
      tada: { emoji: '🎉', clickedBy: ['someone'] },
      spent: { emoji: '👍', clickedBy: [] }
    }
  };
  const REACTIONS_ON = { enableReactions: true, kind: 'chat' as const };

  for (const displayMode of ['r', 'c'] as const) {
    for (const isAdmin of [true, false]) {
      const layout = `${displayMode === 'r' ? 'card' : 'compact'} ${isAdmin ? 'admin' : 'member'}`;

      /*
        ONE OF FOUR DIFFERS, which is why all four are drawn rather than the interesting one.

        `m_e` (1,379,950) is the compact MEMBER repeater and it renders the pill unconditionally, so
        an emptied reaction draws there as `👍 0` and nowhere else. Reproduced 2026-09-02: the
        assertion below flips on exactly that host, and a test that only looked at it could not say
        the other three still agree.
      */
      const emptiedShows = displayMode === 'c' && !isAdmin;

      it(`draws a held reaction, and an emptied one only where upstream does — ${layout}`, () => {
        const html = draw({ ...REACTIONS_ON, displayMode }, { ...REACTED, isAdmin });
        expect(html).toContain('🎉');
        if (emptiedShows) expect(html, 'the compact member host must draw `👍 0`').toContain('👍');
        else expect(html, 'only the compact MEMBER host draws an emptied pill').not.toContain('👍');
      });
    }
  }

  it('renders ONE reaction strip implementation, with three call sites', () => {
    /*
      Still one snippet, and the gate is a PARAMETER rather than a second copy — which is the shape
      this assertion has always been protecting. Two strips is how the compact one drifted before.
    */
    expect(MESSAGE.match(/\{#snippet reactionStrip\(gated: boolean\)\}/g) ?? []).toHaveLength(1);
    expect(MESSAGE.match(/\{@render reactionStrip\([^)]*\)\}/g) ?? []).toHaveLength(3);
    /* And the compact copy that used to live inline is gone: `chat-reaction-added` appears once. */
    expect(MESSAGE.match(/chat-reaction-added/g) ?? []).toHaveLength(1);
  });

  it('passes the gate from the term that also picks the container', () => {
    /*
      `reverseMessage` chooses between `$1e` (compact admin, const 26) and `__e` (compact member,
      const 65), and those two hold `V1e` and `m_e` — the gated repeater and the ungated one. Using
      any other discriminator here would be a second rule for the same question.
    */
    expect(MESSAGE).toContain('{@render reactionStrip(reverseMessage)}');
    expect(MESSAGE.match(/\{@render reactionStrip\(true\)\}/g) ?? []).toHaveLength(2);
  });
});
