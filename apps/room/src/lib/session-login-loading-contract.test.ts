import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  `app-session-login`'s ROOT swap — the branch this room had built backwards.

  ## The finding

  The login page is a two-way conditional at its very top, and this room rendered only the arm that
  is NOT the busy one, while carrying a busy label from the arm the reference can never paint.

  A member of the original application who presses Login sees the whole page replaced by a centred
  spinner reading "Loading...". They never see the button say " Connecting ", because by the time
  that flag is true the form has already been swapped off the page.

  Both readings are re-made here against the pinned bundle on every run, because the whole finding is
  that TWO gates read one flag and the outer one wins. A comment saying so would be a claim; these
  are the bytes.
*/

const BUNDLE = readFileSync(
  new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url),
  'utf8'
);
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

/*
  TWO FILES, because the change is two things and they must not drift into one.

  The VIEW is `SessionLoadingView.svelte` — `gde`, decoded whole, no props, because `gde` has no
  variables either. The GATE is on `session/+page.svelte`, where the reference's root swap keeps it.
  Asserting both against one concatenated string would keep every case green through a move that put
  the gate inside the component, which is exactly the shape the split exists to prevent.
*/
const PAGE = readFileSync(new URL('../routes/session/+page.svelte', import.meta.url), 'utf8');
const VIEW = readFileSync(
  new URL('./components/SessionLoadingView.svelte', import.meta.url),
  'utf8'
);
const code = strip(PAGE);
const view = strip(VIEW);

describe('the two gates, and which one wins', () => {
  it('the ROOT template swaps the whole page on `logginIn`', () => {
    /*
      `H` declares the two views — `gde` at slot 0 with tag "div" and attrs const 0, `yue` at slot 1
      with 39 declarations — and `O(0, …)` is the conditional that picks between them. So `logginIn`
      decides which of the two the page IS, not what one control inside it looks like.
    */
    expect(BUNDLE).toContain(
      'template:function(i,o){1&i&&H(0,gde,5,0,"div",0)(1,yue,39,2),' +
        '2&i&&O(0,o.appService.globals.logginIn?0:1)}'
    );
  });

  it('and the button gate sits INSIDE the arm that swap replaces', () => {
    /*
      The evidence that the busy label is unreachable, and it has to be read as one string: the
      `disabled` binding and the label swap are adjacent instructions in `yue`'s update block, both
      on the same flag the root already answered.
    */
    expect(BUNDLE).toContain(
      'z("disabled",e.appService.globals.logginIn||!e.loginReady),m(),' +
        'O(30,e.appService.globals.logginIn?31:30)'
    );
  });

  it('reads the loading view whole, with the four consts that dress it', () => {
    expect(BUNDLE).toContain(
      'function gde(t,n){1&t&&(d(0,"div",0)(1,"div",1),T(2,"i",2),d(3,"span",3),v(4,"Loading..."),u()()())}'
    );
    expect(BUNDLE).toContain(
      'consts:[[1,"position-relative","w-100","h-100"],' +
        '[1,"position-absolute","top-50","start-50","translate-middle"],' +
        '[1,"fas","fa-spinner","fa-spin","fa-2x"],' +
        '[1,"ms-3","loading-message"]'
    );
  });
});

describe('what this room renders now', () => {
  it('replaces the page while a sign-in is in flight, as the root swap does', () => {
    expect(code).toContain('{#if submitting}');
    expect(code).toContain('<SessionLoadingView />');
    expect(view).toContain('<div class="position-relative w-100 h-100">');
    expect(view).toContain('<div class="position-absolute top-50 start-50 translate-middle">');
    expect(view).toContain('<i class="fas fa-spinner fa-spin fa-2x"></i>');
    expect(view).toContain('Loading...');
  });

  it('and the view takes NO props, because `gde` has no variables', () => {
    /*
      `H(0,gde,5,0,"div",0)` — five declarations, ZERO variables. A `busy` prop here would be state
      the reference's own arm does not have, and it would move the gate off the page, where the root
      swap keeps it.
    */
    expect(view).not.toContain('$props()');
    expect(view).not.toContain('$bindable');
  });

  it('and the loading view comes BEFORE the form, so it replaces rather than precedes it', () => {
    /*
      The ordering is the behaviour. A spinner rendered after the wrapper, or beside it, would be a
      second thing on the page rather than the page — which is the difference between the reference's
      swap and a busy indicator.
    */
    const gate = code.indexOf('{#if submitting}');
    const wrapper = code.indexOf('<div class="login-wrapper">');
    expect(gate, 'the loading gate must be findable').toBeGreaterThan(-1);
    expect(wrapper, 'the login wrapper must be findable').toBeGreaterThan(-1);
    expect(gate).toBeLessThan(wrapper);
    expect(code).toContain('{:else}');
  });

  it('no longer carries the busy label from the branch upstream cannot paint', () => {
    /*
      THE NEGATIVE HALF, and it is the point of the change rather than tidying.

      `mue`'s " Connecting " and const 110's `ml-2 fas fa-spinner fa-spin` were transcribed here from
      a branch that the root swap makes unreachable. Keeping both would mean this room shows a busy
      state the reference does not have, in a place the reference cannot reach, WHILE also showing
      the one it does.

      `disabled` is asserted gone for the same reason and one more: the form is no longer on the page
      once `submitting` is true, so there is no second press to guard against.
    */
    expect(code).not.toContain('Connecting');
    expect(code).not.toContain('ml-2 fas fa-spinner fa-spin');
    expect(code).not.toContain('disabled={submitting}');
    expect(view).not.toContain('Connecting');
  });
});

describe('every class on the loading view has a rule behind it', () => {
  /*
    This repository does not ship a class no rule reads — the standard names `.flipped` as the case.
    `.loading-message` is the login component's OWN scoped rule and therefore has to be written in
    the view; the five Bootstrap utilities beside it are in the shipped sheet already and must not be
    copied.

    Both halves are measured rather than asserted in prose, because "it is in Bootstrap" is exactly
    the kind of claim that is true until the sheet is trimmed.
  */
  const SHEET = readFileSync(new URL('../../css/complete-app-styles.css', import.meta.url), 'utf8');

  it('the component rule is carried, verbatim from its `styles:` array', () => {
    expect(BUNDLE).toContain('.loading-message[_ngcontent-%COMP%]{font-size:24px}');
    expect(view).toContain('.loading-message {\n    font-size: 24px;\n  }');
  });

  it.each(['top-50', 'start-50', 'translate-middle', 'ms-3', 'position-absolute', 'fa-2x'])(
    'the shipped sheet already defines .%s',
    (utility) => {
      expect(
        SHEET.includes(`.${utility} {`) || SHEET.includes(`.${utility}{`),
        `.${utility} is on the loading view but has no rule in the shipped stylesheet`
      ).toBe(true);
    }
  );
});
