// @vitest-environment jsdom
import { mount, unmount, flushSync } from 'svelte';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

import KickedPage from './components/KickedPage.svelte';
import { addressedChannelFor } from './room/addressed-channel';
import { RoomChatMute } from './room/chat-mute';
import { codeOf } from './source-comments';

/**
 * `TODO.md` row 6's one residual — `app-kicked-page`, and the dialog it replaced.
 *
 * The row read *"NOTHING for the ban. A kicked page remains unbuilt"*, and `private-commands.ts`
 * named the gap in its own words: *"upstream sets `currPage="kicked"` and renders
 * `app-kicked-page`. This room has none, so the member is told why and left disconnected."*
 *
 * ## The component, decoded whole from the pinned bundle
 *
 * ```js
 * constructor(){this.msg="kicked"}                                    // byte 2,561,780
 * ɵcmp = ut({ selectors:[["app-kicked-page"]], inputs:{msg:"msg"}, decls:4, vars:1,
 *   consts:[ [1,"container","h-100"],
 *            [1,"d-flex","d-flex-column","h-100","w-100"],
 *            [1,"align-self-center","w-100"] ],
 *   template:function(i,o){ 1&i&&(d(0,"div",0)(1,"div",1)(2,"h2",2),v(3),u()()()),
 *                           2&i&&(m(3),Ze(o.msg)) },
 *   styles:['h2[_ngcontent-%COMP%]{color:#000;vertical-align:middle;text-align:center}'] })
 * ```
 *
 * Four declarations, one variable, three consts, one rule. Everything asserted below is in there.
 *
 * ## Why the DIALOG was the defect and not merely a smaller version of this
 *
 * `addressed-channel.ts` set `dialogs.alert = message`. A dialog is dismissible, and what sits
 * behind it is a room whose stream the same frame has just closed — so the member read the
 * message, pressed OK, and was left looking at a frozen room with nothing on screen saying why.
 * That is worse than showing nothing, because the room then looks broken rather than closed to them.
 */

const BUNDLE = readFileSync('docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', 'utf8');

const mounted: { host: HTMLElement; component: Record<string, unknown> }[] = [];

afterEach(() => {
  for (const entry of mounted.splice(0)) {
    void unmount(entry.component);
    entry.host.remove();
  }
});

function draw(props: Record<string, unknown> = {}) {
  const host = document.createElement('div');
  document.body.append(host);
  const component = mount(KickedPage, { target: host, props: props as never });
  flushSync();
  mounted.push({ host, component: component as Record<string, unknown> });
  return host;
}

describe('the reference, read rather than recalled', () => {
  it('is the bundle this register is written against', () => {
    expect(BUNDLE.length).toBe(2_891_205);
  });

  it('declares the component, its one input and its three consts', () => {
    const at = BUNDLE.indexOf('selectors:[["app-kicked-page"]]');
    expect(at, 'app-kicked-page is not in the pinned bundle').toBeGreaterThan(-1);
    const cmp = BUNDLE.slice(at, at + 420);
    expect(cmp).toContain('inputs:{msg:"msg"}');
    expect(cmp).toContain('decls:4,vars:1');
    expect(cmp).toContain('[1,"container","h-100"]');
    expect(cmp).toContain('[1,"d-flex","d-flex-column","h-100","w-100"]');
    expect(cmp).toContain('[1,"align-self-center","w-100"]');
    expect(cmp).toContain(
      'h2[_ngcontent-%COMP%]{color:#000;vertical-align:middle;text-align:center}'
    );
  });

  it('and the page switch that instantiates it, with the arm it occupies', () => {
    /*
      `IRe` is a FIVE-way conditional and `kicked` is arm 2. Sliced from a bound offset, because an
      `indexOf` that returned -1 would make `slice` produce a tail of the file that contains
      everything and proves nothing — the trap `slice-anchor-contract.test.ts` exists for.
    */
    const at = BUNDLE.indexOf('function IRe(');
    expect(at, 'the page switch moved').toBeGreaterThan(-1);
    const body = BUNDLE.slice(at, at + 260);
    expect(body).toContain('H(0,xRe,1,1)(1,MRe,1,0)(2,ARe,1,1)(3,PRe,1,0)(4,RRe,1,1)');
    expect(body).toContain('"kicked"===e?2');
    /* `ARe` binds the message the host holds. */
    const arm = BUNDLE.indexOf('function ARe(');
    expect(arm).toBeGreaterThan(-1);
    expect(BUNDLE.slice(arm, arm + 120)).toContain(
      'T(0,"app-kicked-page",2),2&t&&z("msg",g(2).kickedMsg)'
    );
  });

  it('and the audio sink is a SIBLING of the switch, which is why it survives the branch', () => {
    /*
      The assertion behind one line of placement in `+page.svelte`. `app-root` is three declarations
      and the `<audio>` is the third, outside the conditional — so a kicked member keeps the element
      upstream too, and putting it inside the `{:else}` here would have been a divergence nothing
      else would have caught.
    */
    const at = BUNDLE.indexOf('selectors:[["app-root"]]');
    expect(at).toBeGreaterThan(-1);
    expect(BUNDLE.slice(at, at + 320)).toContain(
      'T(0,"router-outlet"),H(1,IRe,5,1),T(2,"audio",0)'
    );
  });
});

describe('ours renders the captured markup', () => {
  it('three elements, three class lists, the message in the h2', () => {
    const host = draw({ msg: 'You have been kicked from the room by an administrator' });
    const outer = host.querySelector('div.container.h-100');
    expect(outer, 'the container is missing').not.toBeNull();
    const inner = outer!.querySelector('div.d-flex.d-flex-column.h-100.w-100');
    expect(inner, 'the flex row is missing').not.toBeNull();
    const heading = inner!.querySelector('h2.align-self-center.w-100');
    expect(heading, 'the heading is missing').not.toBeNull();
    expect(heading!.textContent).toBe('You have been kicked from the room by an administrator');
  });

  it('keeps `d-flex-column`, which is the reference s own non-Bootstrap class', () => {
    /*
      Bootstrap's is `flex-column`; `d-flex-column` matches no rule in the shipped stylesheet, so
      the row stays horizontal and `align-self-center` centres the heading across rather than down.
      That is what the reference paints, and "correcting" it would leave this page matching no
      capture at all. Asserted so the fix is a deliberate act rather than a tidy-up.
    */
    expect(draw().querySelector('.d-flex-column')).not.toBeNull();
    expect(
      draw().querySelector('.flex-column'),
      'the Bootstrap spelling is NOT the capture s'
    ).toBeNull();
  });

  it('falls back to the reference s own lowercase default', () => {
    /*
      `constructor(){this.msg="kicked"}`. The HOST's default is different — `kickedMsg = "Kicked"`,
      capitalised, at byte 2,594,096 — and neither is normally reached, because the presenter's
      side always supplies one. Both are kept rather than collapsed: choosing which of the
      reference's two is "the" default would be a decision with no evidence behind it.
    */
    expect(draw().querySelector('h2')!.textContent).toBe('kicked');
  });

  it('and renders an EMPTY heading for an empty message rather than substituting one', () => {
    /*
      `private-commands.ts` sends `''` when the frame carries no `msg`, and an empty string is not
      an absent one. Substituting the fallback here would invent a reason the presenter did not
      give; upstream's `Ze(o.msg)` writes the empty string too, producing a page that says the room
      is gone without claiming why.
    */
    expect(draw({ msg: '' }).querySelector('h2')!.textContent).toBe('');
  });
});

describe('the page swaps, and the dialog it replaced is gone', () => {
  it('the kick receiver calls the page swap and raises no alert', () => {
    const swapped: string[] = [];
    const alerted: string[] = [];
    const channel = addressedChannelFor({
      viewerId: () => 7,
      /*
        A real one rather than a stub, because the kick branch shares this object with the mute
        branches and a stub would let the two drift apart in exactly the way `RoomMenus` is a real
        instance in `main-tab-strip-gates.svelte.test.ts`. Its own collaborators ARE stubs: nothing
        in this file exercises a mute.
      */
      chatMute: new RoomChatMute({
        commands: {} as never,
        alert: () => {},
        notice: () => {},
        reload: () => Promise.resolve(),
        announceThenSend: () => {}
      } as never),
      dialogs: { alertThen: (message: string) => alerted.push(message) },
      kicked: (message: string) => swapped.push(message),
      reconnectAudio: () => Promise.resolve(),
      debugLog: { collect: () => '', send: () => {}, received: () => {} },
      profilePictureChanged: () => {},
      stopLocalScreen: () => {}
    } as never);

    let disconnected = 0;
    const handled = channel.handle(
      { cmd: 'kickUser', targetUserId: 7, msg: 'out you go' } as never,
      () => (disconnected += 1)
    );

    expect(handled, 'the frame must be claimed').toBe(true);
    expect(swapped, 'the message reaches the page swap').toEqual(['out you go']);
    expect(alerted, 'and nothing is put in a dialog').toEqual([]);
    expect(disconnected, 'and the stream still closes').toBe(1);
  });

  it('and the deps no longer carry an `alert` field, because nothing reads one', () => {
    /*
      `dialogs` was `{ alertThen; alert }` and `alert` had exactly one caller: this kick. A field
      nothing reads is the shape the root standard refuses outright, so it went with its consumer
      rather than being left in place "in case".
    */
    const path = 'src/lib/room/addressed-channel.ts';
    const module = readFileSync(path, 'utf8');
    expect(module).toContain(
      'dialogs: { alertThen: (message: string, ondismiss: () => void) => void };'
    );
    /*
      COMMENTS STRIPPED for the negative half, and the first draft of this assertion is why: the
      docblock over `kicked` QUOTES the line it replaced, so a raw read found `deps.dialogs.alert =`
      in the prose explaining its removal and went red on the fix. Prose must never vote on a code
      assertion — `codeOf` is the file this repository keeps for exactly that.
    */
    const code = codeOf(path, module);
    expect(code).not.toContain('deps.dialogs.alert =');
    /*
      And the ASSIGNMENT form specifically, not the bare path: `deps.dialogs.alertThen` — which is
      still here for `forceReload` — has `deps.dialogs.alert` as a prefix, so the loose spelling
      goes red on working code. Measured, in the second draft of this line.
    */
    expect(code.match(/deps\.dialogs\.\w+/g) ?? []).toEqual(['deps.dialogs.alertThen']);
  });
});

describe('the page renders it INSTEAD of the room, not over it', () => {
  const page = readFileSync('src/routes/+page.svelte', 'utf8');

  it('branches on the message and puts the room in the else arm', () => {
    /*
      Anchored on locals and asserted before use. The property is ORDER — `{#if}` above `<app-room`,
      `{/if}` below `</app-room>` — because a `toContain` on the branch alone passes just as well
      with the kicked page rendered BESIDE a live room, which is the `hidden`-instead-of-`{#if}`
      defect this repository keeps catching.
    */
    const branch = page.indexOf('{#if kickedMessage !== null}');
    const roomOpen = page.indexOf('<app-room');
    const roomClose = page.indexOf('</app-room>');
    const end = page.indexOf('  {/if}', roomClose);
    expect(branch, 'the branch is missing').toBeGreaterThan(-1);
    expect(roomOpen, 'app-room is missing').toBeGreaterThan(-1);
    expect(roomClose, 'app-room is never closed').toBeGreaterThan(-1);
    expect(end, 'the branch is never closed after the room').toBeGreaterThan(-1);
    expect(branch).toBeLessThan(roomOpen);
    expect(page.slice(branch, roomOpen)).toContain('<KickedPage msg={kickedMessage} />');
    expect(page.slice(branch, roomOpen)).toContain('{:else}');
  });

  it('and keeps the webcam sink OUTSIDE it, as `app-root` does', () => {
    const end = page.indexOf('  {/if}', page.indexOf('</app-room>'));
    expect(end).toBeGreaterThan(-1);
    expect(page.slice(end), 'the audio sink must survive the branch').toContain('id="webcam"');
  });

  it('holds the message in `$state.raw`, because it is only ever replaced', () => {
    expect(page).toContain('let kickedMessage = $state.raw<string | null>(null);');
  });
});
