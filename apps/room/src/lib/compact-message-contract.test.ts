import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments.js';

/**
 * The compact message row — eight rows of the `RoomMessage.svelte` surface audit.
 *
 * | row | what it wanted |
 * | --- | --- |
 * | RM-01 | `app-st-compactmessage`'s own host and its own stylesheet |
 * | RM-02 | the alerts row's `short` date and its Ask-a-question button |
 * | RM-03 | `mentionColor` / `questionColor` on the compact body |
 * | RM-04 | the add-reaction pill |
 * | RM-07 | `questionColor` on alerts, not only chat |
 * | RM-13 | `chat-reaction-hover`, which no reference template applies |
 * | RM-14 | the answered tick's real classes |
 * | RM-24 | `title="Copy order"`, which no reference span carries |
 *
 * ## The three that were OURS
 *
 * RM-13, RM-14 and RM-24 are inventions rather than omissions, and they are the more expensive
 * kind: an omission looks unfinished, an invention looks finished and behaves differently. The
 * worst of the three cost a control — `chat-reaction-hover` hid the add-reaction pill until the
 * enclosing box was hovered, and there is no hover on a phone.
 */

const read = (path: string) => codeOf(path, readFileSync(new URL(path, import.meta.url), 'utf8'));

const MESSAGE = read('./components/RoomMessage.svelte');
const ACTIONS = read('./room/message-actions.svelte.ts');
const COMPACT_CSS = readFileSync(new URL('./styles/compact-message.css', import.meta.url), 'utf8');
const CARD_CSS = readFileSync(
  new URL('./styles/captured-runtime-components.css', import.meta.url),
  'utf8'
);
const APP_CSS = readFileSync(new URL('../app.css', import.meta.url), 'utf8');

/**
 * The compact host's markup, bound ONCE and asserted below.
 *
 * `slice-anchor-contract` requires the bound to be a local that is checked: an `indexOf` written
 * into a slice returns -1 when the marker moves, and `slice(-1)` is a well-defined one-character
 * string that every `toContain` here would then quietly fail against.
 */
const COMPACT_AT = MESSAGE.indexOf('<app-st-compactmessage>');
const COMPACT_END = MESSAGE.indexOf('</app-st-compactmessage>');
const COMPACT = MESSAGE.slice(COMPACT_AT, COMPACT_END);

describe('the slice these assertions read', () => {
  it('found the compact host, and enough of it to mean something', () => {
    expect(COMPACT_AT, 'the host must exist').toBeGreaterThan(-1);
    expect(COMPACT_END, 'and must be closed').toBeGreaterThan(COMPACT_AT);
    /* The vacuity floor: a fragment would satisfy several assertions below by omission. */
    expect(COMPACT.length, 'the whole branch').toBeGreaterThan(4_000);
  });
});

/** Every declaration a selector carries in the compact sheet, by selector. */
const compactRules = new Map<string, Map<string, string>>();
postcss.parse(COMPACT_CSS).walkRules((rule) => {
  const declarations = new Map<string, string>();
  /*
    Braced, not an expression body: postcss types `walkDecls`'s callback as returning `false | void`
    — returning `false` stops the walk — and `Map.set` returns the map, which is neither. An arrow
    that happens to return a truthy value is fine at runtime and refused by the type, correctly:
    the API is telling you the return means something.
  */
  rule.walkDecls((decl) => {
    declarations.set(decl.prop, decl.value);
  });
  compactRules.set(rule.selector.replace(/\s+/g, ' '), declarations);
});

describe('RM-01 — the compact host has its own stylesheet', () => {
  it('renders TWO hosts, one per mode, as the reference has two components', () => {
    expect(MESSAGE.match(/<app-st-message>/g), 'the card host').toHaveLength(1);
    expect(MESSAGE.match(/<app-st-compactmessage>/g), 'the compact host').toHaveLength(1);
    /* The compact branch must be inside the compact host, not the card's. */
    const cardHost = MESSAGE.indexOf('<app-st-message>');
    expect(cardHost, 'the card host must exist').toBeGreaterThan(COMPACT_AT);
    expect(COMPACT_END, 'and the compact one closes before it').toBeLessThan(cardHost);
  });

  it('carries the block the CARD sheet cannot supply, at the values that differ', () => {
    /*
      The three the audit measured, and the ones that made the compact rows look like cards:
      14px against the card's 16px, a 25px avatar against 35px, `font-weight: 800` against 900.
      Read from BOTH sheets rather than asserted as text, so the comparison is the real one.
    */
    const compactBox = compactRules.get('app-st-compactmessage .msg-box:not(:root)');
    expect(compactBox?.get('font-size'), 'compact text').toBe('14px');
    expect(CARD_CSS, 'and the card is still 16px').toContain(
      'app-st-message .msg-box:not(:root) {\n  font-weight: 100;\n  font-size: 16px;'
    );

    expect(
      compactRules.get('app-st-compactmessage .avatar:not(:root) img:not(:root)')?.get('width')
    ).toBe('25px');
    expect(compactRules.get('app-st-compactmessage .username:not(:root)')?.get('font-weight')).toBe(
      '800'
    );
  });

  it('gives the two classes the markup wore that had no rule anywhere', () => {
    /*
      `nowrap` and `reactions-container` were in the compact markup and defined in NO stylesheet in
      this repository — classes with no CSS, which is the defect `CLAUDE.md` names by that
      description. They exist only in this component's block upstream.
    */
    expect(compactRules.get('app-st-compactmessage .nowrap:not(:root)')?.get('white-space')).toBe(
      'nowrap'
    );
    expect(
      compactRules.get('app-st-compactmessage .reactions-container:not(:root)')?.get('margin-left')
    ).toBe('20px');
  });

  it('is imported LAST, so it wins inside the compact host', () => {
    const captured = APP_CSS.indexOf('captured-runtime-components.css');
    const compact = APP_CSS.indexOf('compact-message.css');
    expect(captured, 'both imports must exist').toBeGreaterThan(-1);
    expect(compact, 'and the compact one comes after').toBeGreaterThan(captured);
  });

  it('says where it came from, because it is the one hand-written captured sheet', () => {
    /*
      `captured-runtime-components.css` is GENERATED and forbids hand edits, and its source —
      `complete-app-styles.css` — carries exactly one `.msg-box[…]` scope, the CARD's. The compact
      component's rules exist only inside the JS bundle, so no run of the generator can produce
      them. That provenance is the entire reason this is a separate file.
    */
    expect(COMPACT_CSS).toContain('bytes 1,400,248 – 1,404,709');
    /* Wrapped across a line in the header, so the assertion matches a phrase that is not. */
    expect(COMPACT_CSS).toContain('complete-app-styles.css` carries exactly one');
    expect(COMPACT_CSS).toContain('no run of `pnpm css:sync-captured` can ever');
  });
});

describe('RM-02 — the compact ALERTS row', () => {
  it('branches on the log before it renders a time', () => {
    /* `O(26, "alerts" === e.logType ? 26 : 27)` in `b_e` at byte 1,380,680. */
    expect(COMPACT).toContain("{#if kind === 'alert'}");
    expect(COMPACT).toContain('<span class="created-at mr-2" style={dateStyle}');
    /* Angular's `short` is `M/d/yy, h:mm a`, which is what `alertDateFormatter` produces. */
    expect(COMPACT).toContain('alertDateFormatter.format(item.createdAt)');
    /* And the bracketed chat time survives, on the other branch. */
    expect(COMPACT).toContain('compactTimeFormatter.format(item.createdAt)}]');
  });

  it('offers the Ask-a-question button, with the unread marker', () => {
    expect(COMPACT).toContain('{#if !isQaMessage && hasQaOnAlerts}');
    expect(COMPACT).toContain("'btn btn-sm btn-secondary me-1 alert-qa'");
    expect(COMPACT).toContain("'btn-danger': Boolean(item.unreadQa)");
    expect(COMPACT).toContain("runAction('question')");
  });

  it('and the button has a rule to be styled by', () => {
    /* `alert-qa` is in the compact block too — 10px and its own padding. */
    expect(compactRules.get('app-st-compactmessage .alert-qa:not(:root)')?.get('font-size')).toBe(
      '10px'
    );
  });
});

describe('RM-03 and RM-07 — the colours', () => {
  it('applies mentionColor and questionColor to the COMPACT body as well', () => {
    /*
      `Kn(13, Ew, e.msg.isMention && !e.hasCustomFollowedUserColors, e.msg.txt.includes("?") &&
      !e.hasCustomFollowedUserColors)` — the compact bodies read the same map the card's does. A
      member mentioned in compact mode got no highlight, and the mention colour is the one signal
      that says a message is addressed to you.
    */
    expect(MESSAGE).toContain('const bodyColorClasses = $derived(');
    expect(COMPACT).toContain('+ bodyColorClasses');
  });

  it('does not gate questionColor on the chat log', () => {
    /*
      RM-07 — the reference's two conditions mention no log type, and an alert is the surface where
      questions are the point: `hasQAOnAlerts` exists to invite one.
    */
    expect(MESSAGE).toContain(
      "item.evidenceQuestion ?? (item.body.includes('?') && followedStyle === undefined)"
    );
    expect(MESSAGE).not.toContain("kind === 'chat' && item.body.includes('?')");
  });
});

describe('RM-04 — the compact add-reaction pill', () => {
  it('exists, gated as `g_e` is', () => {
    /*
      `O(3, "chat" === e.logType || "alerts" === e.logType && e.isQAMsg ? 3 : -1)`. In compact mode a
      reaction could previously be added only through the kebab menu.
    */
    expect(COMPACT).toContain("{#if kind === 'chat' || (kind === 'alert' && isQaMessage)}");
    expect(COMPACT).toContain('<i class="far fa-smile"></i>');
  });
});

describe('the three that were ours', () => {
  it('RM-13 — the add pill is not hidden until hover', () => {
    /*
      `chat-reaction-hover` is a REAL captured class — `.msg-box:hover .chat-reaction-hover
      {display:inline-block}` with `.chat-reaction-hover{display:none}` at byte 1,366,420 — applied
      by NO reference template. Wearing it hid the pill until the enclosing box was hovered, and
      there is no hover on a phone.
    */
    expect(MESSAGE).not.toContain('chat-reaction-hover"');
    expect(MESSAGE).not.toContain("'chat-reaction-hover'");
    /* The captured RULE stays: that file is evidence, and deleting one would edit the record. */
    expect(CARD_CSS).toContain('app-st-message .chat-reaction-hover:not(:root)');
  });

  it('RM-14 — the answered tick carries the reference s classes', () => {
    /* Const 27 is `[1,"ms-1","private-reply"]`; `answered-check` was ours and had no rule at all. */
    expect(MESSAGE).toContain('<div class="ms-1 private-reply">✅</div>');
    expect(MESSAGE).not.toContain('answered-check');
  });

  it('RM-24 — the trade span carries no invented tooltip', () => {
    /*
      `'<span class="tradeColor" id="id_' + o._id + '">'` at byte 1,414,920 — no title. `aria-label`
      replaces it, and the two are not the same thing: `title` shows a tooltip to everyone,
      `aria-label` names the control for a screen reader and is invisible. The span is
      `role="button"` here because the capture puts a click handler on a bare span.
    */
    expect(MESSAGE).not.toContain('title="Copy order"');
    expect(MESSAGE).toContain('aria-label="Copy this order"');
  });

  it('RM-19 — the copy does not mutate the message, and says why', () => {
    /*
      `copyMessage(){ this.msg.txt = sf(this.msg.txt).result, … }` writes the stripped text back onto
      the MESSAGE, so copying silently rewrites the one on screen. Matching that would mean
      reproducing a defect, and the reason has to be findable or the next comparison reads it as a
      line we missed.
    */
    expect(ACTIONS).toContain('const container = document.createElement');
    const raw = readFileSync(new URL('./room/message-actions.svelte.ts', import.meta.url), 'utf8');
    expect(raw).toContain('WE DELIBERATELY DO NOT REPRODUCE THE MUTATION');
  });
});
