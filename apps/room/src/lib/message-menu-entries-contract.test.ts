import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';

import MessageMenu from './components/MessageMenu.svelte';
import type { MessageMenuAllows } from './message-behavior.js';

/**
 * The kebab menu, read against all FOUR captured menus end to end on 2026-08-31.
 *
 * ## What was read, and how
 *
 * `app-st-message` renders one menu (`Bge`, bundle byte 1,333,900) and `app-st-compactmessage`
 * renders two (`z1e` at 1,372,200 for the admin row, and the member row at 1,380,700). Each
 * component's consts array was decoded by bracket-walking from its own `consts:[[` — 1,357,732 for
 * `app-st-message`, 1,395,767 for `app-st-compactmessage` — and read BY VALUE. A const index is per
 * component: index 40 is the smile's attributes in one table and `[1,"fas","fa-comments"]` in the
 * other, so a reader who looks up a number another row cited gets a different element.
 *
 * ## The finding: the entries and their order already match, and that is worth pinning
 *
 * Twelve gates, twelve entries, the same source order and the same two-`&nbsp;` prefixes in all
 * four. The rows this pass produced are therefore mostly refusals and divergences rather than
 * missing behaviour, and each is recorded here with its measurement rather than as a judgement.
 */
const ALL: MessageMenuAllows = {
  delete: true,
  mute: true,
  user: true,
  mention: true,
  showAll: true,
  report: true,
  reply: true,
  answered: true,
  reaction: true,
  edit: true,
  copy: true,
  private: true
};

const html = (allows: Partial<MessageMenuAllows> = {}, extra: Record<string, unknown> = {}) =>
  render(MessageMenu as never, {
    props: {
      allows: { ...ALL, ...allows },
      menuOpen: false,
      variant: 'regular',
      onaction: () => {},
      ontoggle: () => {},
      onreactiontoggle: () => {},
      ...extra
    } as never
  }).body;

const MENU = readFileSync(new URL('./components/MessageMenu.svelte', import.meta.url), 'utf8');

/**
 * MSM-01 — the smile icon's captured tooltip. WORN as of 2026-09-02; a refusal before that.
 *
 * ```
 * app-st-message        const 40 @1,359,726  ["placement","left","ngbTooltip","Add Reaction",1,"far","fa-smile"]
 * app-st-compactmessage const 37 @1,397,773  ["placement","left","ngbTooltip","Add Reaction",1,"far","fa-smile"]
 * ```
 *
 * Both are the `T(2,"i",…)` inside the reaction anchor (`Tge` at 1,330,225, `A1e` at 1,368,562), and
 * both of those functions render the visible label in the very next instruction:
 * `v(3,"\xa0\xa0Add Reaction")`. **The tooltip text is byte-identical to the label four
 * characters to its right.**
 *
 * That measurement is right and it was the wrong conclusion. The refusal read: the bubble would
 * repeat a label the reader is already looking at, where `PrivateChatComposer.svelte` wears the same
 * const SHAPE on an icon with no adjacent text and needs it. A good UX argument — and an argument
 * about whether the reference's choice is a good one, which is not one of the four things that
 * excuse a divergence. The rendered `ngbtooltip` and `placement` attributes are reference-facing
 * output, and they were absent.
 *
 * **The spelling is the part worth reading.** These consts are STATIC attribute pairs — both sit
 * before the `1,` class marker — so the reference writes `ngbtooltip="Add Reaction"` into the DOM,
 * and the right transcription is the attribute plus `{@attach ngbTooltip}`. `ngbTooltipWith` would
 * have been wrong here: `#lib/ngb-tooltip`'s own docblock records that it exists for the five hosts
 * whose text the reference BINDS, which therefore carry no `ngbtooltip` attribute at all. Using it
 * would have shown the right bubble on an element marked differently from the capture.
 *
 * The refusal's second half — that the reason had to live here because the component was one line
 * under its ceiling — is gone with the ceiling, raised at the entry with this change's argument.
 */
describe('MSM-01 — the Add Reaction tooltip, worn as the capture writes it', () => {
  it('renders the entry and its captured label — the positive control', () => {
    const body = html();
    expect(body).toContain('far fa-smile');
    expect(body).toContain('Add Reaction');
  });

  it('the icon carries both halves of the const, as ATTRIBUTES', () => {
    /*
      Both, and in the rendered DOM rather than in source, because the two are separable and getting
      it half right is the likely mistake: the text without `placement` gives a bubble in the wrong
      direction, and `#lib/ngb-tooltip`'s `bind` reads `placement` off the host to choose the
      direction class, so a missing one resolves to nothing at all.

      Scoped to the ICON's tag rather than the anchor: `placement="left"` appears elsewhere in this
      menu, and an unscoped `toContain` would pass on somebody else's attribute.
    */
    const body = html();
    const at = body.indexOf('far fa-smile');
    expect(at, 'the reaction entry is not rendered').toBeGreaterThan(-1);
    const opens = body.lastIndexOf('<i', at);
    const closes = body.indexOf('>', at);
    expect(opens, 'the icon tag has no opening').toBeGreaterThan(-1);
    expect(closes, 'the icon tag is unterminated').toBeGreaterThan(at);
    const tag = body.slice(opens, closes + 1);
    expect(tag).toContain('ngbtooltip="Add Reaction"');
    expect(tag).toContain('placement="left"');
  });

  it('the label still carries the words too, which is the capture and reads as redundant', () => {
    /*
      Kept from the refusal this replaced, because it is the one assertion that was always worth
      having: the tooltip text is byte-identical to the label four characters to its right, and that
      duplication is the reference's. If the label ever stops rendering, the tooltip is suddenly the
      control's only name and this goes red so somebody looks.
    */
    const at = html().indexOf('far fa-smile');
    const end = html().indexOf('</a>', at);
    expect(end, 'the reaction anchor is unterminated').toBeGreaterThan(at);
    expect(html().slice(at, end)).toContain('Add Reaction');
  });

  it('and matches the shape the composer already wears, which is measured not remembered', () => {
    const composer = readFileSync(
      new URL('./components/PrivateChatComposer.svelte', import.meta.url),
      'utf8'
    );
    expect(composer).toContain("ngbtooltip: 'Add Emojis'");
    expect(composer).toContain('far fa-smile');
  });
});

/**
 * MSM-02 — `aria-expanded` is BOUND here and static in all three captured triggers.
 *
 * ```
 * app-st-message        const 10 @1,358,083  msgMenu dropright pt-1
 * app-st-compactmessage const  9 @1,396,029  msgMenu dropleft float-right align-baseline
 * app-st-compactmessage const 56 @1,398,736  msgMenu dropright float-left align-baseline
 * ```
 *
 * All three read `…"aria-haspopup","true","aria-expanded","false",1,"msgMenu",…` and none carries a
 * `3,"aria-expanded"` binding marker, so the attribute is the literal string `false` for the life of
 * the element — the reference relies on Bootstrap's own `data-bs-toggle="dropdown"` script to keep
 * it honest, and this room has no Bootstrap JS.
 *
 * DELIBERATE DIVERGENCE. Transcribing the literal would announce a collapsed menu to a screen reader
 * while the menu is open, every time. This is the one place where matching the capture byte for byte
 * means shipping a false statement about the UI.
 */
describe('MSM-02 — aria-expanded follows the menu rather than the capture', () => {
  it('is false while the menu is closed', () => {
    expect(html({}, { menuOpen: false })).toContain('aria-expanded="false"');
  });

  it('and true while it is open, which the captured literal never is', () => {
    expect(html({}, { menuOpen: true })).toContain('aria-expanded="true"');
  });

  it('the captured aria-haspopup IS worn, so this is one divergence and not a rewrite', () => {
    expect(html()).toContain('aria-haspopup="true"');
  });
});

/**
 * MSM-03 — `id="dropdownMenuLink"` is per-message upstream and per-message here, so a log of N
 * messages holds N elements with one id.
 *
 * The id is a static entry of all three trigger consts above, and `aria-labelledby="dropdownMenuLink"`
 * is a static entry of the two menu consts (`app-st-message` 11 @1,358,243, `app-st-compactmessage`
 * 10 @1,396,212). Angular renders one instance per message and so does this room, so in a 200-message
 * log both applications hold 200 elements carrying the same DOM id, and every menu's
 * `aria-labelledby` resolves to the FIRST one — the kebab of the oldest message on screen.
 *
 * DELIBERATE DIVERGENCE, recorded and NOT repaired here. Making it unique is a two-line change to
 * this component, and it would break `room-message-render.test.ts`, which pins the captured DOM of
 * eighteen kebabs; that file is not this batch's to edit. The row names the change.
 */
describe('MSM-03 — the duplicated trigger id is transcribed, and said out loud', () => {
  it('two menus rendered together carry the same id', () => {
    const twice = html() + html();
    expect(twice.split('id="dropdownMenuLink"')).toHaveLength(3);
  });

  it('and each menu points its aria-labelledby at that same id', () => {
    expect(html()).toContain('aria-labelledby="dropdownMenuLink"');
  });
});

/**
 * MSM-04 — `User Info` and `Mention` are UNCONDITIONAL upstream, and they are here too.
 *
 * In `Bge` the two anchors are element indices 9 and 12 and neither has an `O(…)` in the update
 * block — the conditionals jump from `O(8, …)` straight to `O(15, …)`. `z1e` and the compact member
 * renderer are the same shape at indices 8 and 11.
 *
 * ALREADY BUILT, and the audit reader who filed this as a gap would have been wrong: `allows.user`
 * and `allows.mention` come from `sourceMessageBehavior`, where `openUserInfo` and `mention` are the
 * literal `true` — the only thing that can turn them off is a captured menu listing that omits them,
 * which is `capturedMenuAllows` doing its job rather than a gate this room invented.
 */
describe('MSM-04 — the two ungated entries', () => {
  it('render for a viewer with nothing else allowed', () => {
    const nothing = Object.fromEntries(
      Object.keys(ALL).map((key) => [key, false])
    ) as unknown as MessageMenuAllows;
    const body = html({ ...nothing, user: true, mention: true });
    expect(body).toContain('User Info');
    expect(body).toContain('Mention');
    expect(body, 'and nothing else came with them').not.toContain('Delete Message');
  });

  it('and the resolver hands them through as the reference does', () => {
    const behavior = readFileSync(new URL('./message-behavior.ts', import.meta.url), 'utf8');
    expect(behavior).toContain('openUserInfo: true');
    expect(behavior).toContain('mention: true');
  });
});

/**
 * MSM-05 — the reaction anchor's `shown` and `hidden` outputs, and what they drive.
 *
 * Const 39 (`app-st-message`, @1,359,597) and const 36 (compact, @1,397,644) both end
 * `3,"click","shown","hidden","ngbPopover"`, and `Tge`/`A1e` bind them to `onPopoverOpen()` and
 * `onPopoverClose()`. Read whole at byte 1,355,713:
 *
 * ```js
 * onPopoverOpen(){ this.showEmojiChooser = !0, console.log(…) }
 * onPopoverClose(){ setTimeout(() => { this.showEmojiChooser = !1 }, 500), console.log(…) }
 * addReaction(){ this.showEmojiChooser = !0, console.log("this.popover: ", this.popover.isOpen()),
 *                $(".users-dropdown-options").on("click", e => e.stopPropagation()) }
 * ```
 *
 * MEASURED REFUSAL, on two counts. `showEmojiChooser` is set by the CLICK handler as well, so the
 * `shown` output is a second write of a value already written on the path that opens the popover —
 * which is what `onreactiontoggle` is here. And `addReaction` registers a fresh jQuery delegation on
 * `.users-dropdown-options` on every click, never removed: one listener per reaction opened, for the
 * life of the page, on a selector that matches every kebab menu in the room. Reproducing that is
 * reproducing a leak.
 */
describe('MSM-05 — the popover outputs are refused, and the click path still reports', () => {
  it('the reaction entry reports through one callback', () => {
    expect(MENU).toContain('onreactiontoggle()');
  });

  it('and the popover id it is handed back is what the entry renders', () => {
    /*
      The half that matters for a screen reader, and the half the reference gets from ngbPopover:
      while the picker is open FROM this menu, the entry describes it.
    */
    expect(html({}, { reactionPopoverId: 'ngb-popover-7' })).toContain(
      'aria-describedby="ngb-popover-7"'
    );
    expect(html()).not.toContain('aria-describedby="ngb-popover-7"');
  });

  it('carries the three popover attributes the const does, LOWER-CASED as a browser holds them', () => {
    /*
      `autoclose` and `popoverclass`, not `autoClose` and `popoverClass`. The const spells them in
      Angular's camel case because they are directive inputs; the DOM has no such thing for an HTML
      element, so both applications end up with lower-case attribute names and this assertion asserts
      the DOM rather than the source. It failed on its first run written the other way, which is why
      it is spelled out here instead of remembered.
    */
    const body = html();
    expect(body).toContain('container="body"');
    expect(body).toContain('autoclose="outside"');
    expect(body).toContain('popoverclass="popOverDiv"');
  });

  /**
   * MSM-06 — two captured labels carry a TRAILING SPACE and HTML folding ate both.
   *
   * `v(2,"\xa0\xa0Mark Answered ")` at byte 1,330,053 and `v(2,"\xa0\xa0Private Chat ")` at
   * 1,330,816, with the compact renderer's `M1e` (1,368,390) and `I1e` (1,369,153) spelling them
   * identically — so unlike `showAll`/`report`/`reply` these do not vary by renderer and belong in
   * the markup rather than in `MESSAGE_MENU_TEXT`.
   *
   * The other nine entries have no trailing space in the reference and had none here. These two were
   * written as text followed by a newline, which Svelte and HTML fold away, so the room rendered
   * `Mark Answered` where the capture has `Mark Answered `. Restored with `{' '}` — the braces idiom
   * `apps/room/AGENTS.md` records as a standing exception, because every capture comparison in this
   * repository diffs rendered strings.
   */
  it('MSM-06 — Mark Answered and Private Chat keep the space the capture gives them', () => {
    const body = html();
    expect(body).toContain('Mark Answered </a>');
    expect(body).toContain('Private Chat </a>');
  });

  it('MSM-06 — and the nine that have no trailing space still have none', () => {
    /*
      The control. Adding a space everywhere would satisfy the assertion above and be just as wrong;
      `Delete Message`, `User Info`, `Mention`, `Edit` and `Copy` are spelled without one in all four
      captured menus.
    */
    const body = html();
    for (const label of ['Delete Message', 'User Info', 'Mention', 'Edit', 'Copy']) {
      expect(body, `${label} must not gain a space`).toContain(`${label}</a>`);
    }
  });
});
