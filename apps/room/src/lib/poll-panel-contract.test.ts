import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';

/**
 * `poll-01`, `poll-03`, `poll-07`, `poll-08` — the poll panel's four wiring rows.
 *
 * `poll-02` and `poll-11` are BEHAVIOUR and are executed in `room/polls.svelte.test.ts` and
 * `poll-behavior.test.ts` respectively; only the page's half of `poll-02` is read here, because a
 * verdict nothing acts on is a verdict that does nothing.
 *
 * Comments stripped throughout — this file quotes the strings it asserts.
 */

const read = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8');

const panel = codeOf('components/PollPanel.svelte', read('./components/PollPanel.svelte'));
const page = codeOf('routes/+page.svelte', read('../routes/+page.svelte'));
const drag = read('./panel-drag.ts');

describe('poll-01 — a poll arriving makes a sound', () => {
  /*
    ```js
    subscribe("gotPoll", i => { globals.preferences.doNotDisturbOn || soundEffects.fileShare.play(),
      guiEventBus.emit("doPollModal", { mode: "answer", … }) })              // byte 2,507,038
    ```

    `fileShare` was declared in `#lib/sound-effects.ts`, mapped to a file that ships, loaded on every
    page — and called by nothing anywhere in `src`.
  */
  it('plays fileShare, gated on do-not-disturb', () => {
    expect(page).toContain("if (!prefs.doNotDisturbOn) playSoundEffect('fileShare');");
  });

  it('plays it only when a panel actually opened', () => {
    /*
      Upstream's `gotPoll` never reaches the viewer who wrote the poll (`i.senderUID !=
      globals.user.userXrefID`, byte 1,024,082), and `deliver` refuses that person plus two more. A
      sound with no panel behind it is a noise nothing explains, so the call sits INSIDE the branch.
    */
    const at = page.indexOf("if (delivery === 'open') {");
    expect(at, 'the open branch is gone').toBeGreaterThan(-1);
    const to = page.indexOf('return;', at);
    expect(to, 'the open branch never returns').toBeGreaterThan(at);
    expect(page.slice(at, to)).toContain("playSoundEffect('fileShare')");
  });
});

describe('poll-02 — the page acts on the ending', () => {
  it('closes the poll modal, and only when the poll modal is what is open', () => {
    /*
      `closeActive()` runs the close bookkeeping for whatever is showing, so an unguarded call would
      let a poll ending shut somebody's settings modal.
    */
    expect(page).toContain(
      "if (delivery === 'ended' && modals.modal === 'poll') modals.closeActive();"
    );
  });
});

describe('poll-03 — the labels ring the pie, not the box', () => {
  /*
    `const EB = { series: { pie: { show: !0, innerRadius: 0, label: { show: !0, radius: .8, … } } } }`
    — byte 2,104,707. In flot a pie label radius at or below 1 is a fraction of the PIE's radius, so
    the labels sit on a circle. This placed them at 32% of the container box in each axis, and the
    box is `width: 100%` by a fixed `height: 300px` — an ellipse, with labels outside the pie left
    and right and inside it top and bottom.
  */
  it('takes the reference fraction as a named constant', () => {
    expect(panel).toContain('const PIE_LABEL_RADIUS = 0.8;');
  });

  it('measures the box, because a circle cannot be expressed in percentages of a rectangle', () => {
    expect(panel).toContain('let chartBox = $state.raw({ width: 0, height: 0 });');
    expect(panel).toContain('chartBox = { width, height };');
  });

  it('places labels in PIXELS at 0.8 of the pie radius', () => {
    expect(panel).toContain(
      'const distance = pieRadius(chartBox.width, chartBox.height) * PIE_LABEL_RADIUS;'
    );
    expect(panel).toContain('const left = chartBox.width / 2 + Math.cos(angle) * distance;');
    expect(panel).toContain('const top = chartBox.height / 2 + Math.sin(angle) * distance;');
    expect(panel).toContain('left: ${left}px; top: ${top}px;');
  });

  it('draws the pie and places the labels from ONE radius', () => {
    /*
      The defect was two expressions in different units for one circle. A shared function is what
      makes them un-driftable; two `Math.min(width, height) / 2 - 10`s would not be.
    */
    expect(panel).toContain('function pieRadius(width: number, height: number): number {');
    expect(panel).toContain('const radius = pieRadius(width, height);');
    expect(panel.match(/Math\.min\(width, height\) \/ 2 - 10/g) ?? []).toHaveLength(1);
  });
});

describe('poll-07 — dragging snaps to the containment edges', () => {
  /*
    `$("#pollModalCompHolder").draggable({ …, containment: ".wrapper", …, snap: !0, … })` — byte
    2,108,197. The containment was already reproduced; the snap was not, and this panel is the one
    floating panel in the room that rolls its own pointer handling instead of using `panel-drag.ts`.
  */
  it('uses the SHARED clamp, so the tolerance is one number', () => {
    expect(drag).toContain(
      'export function clampAndSnap(value: number, min: number, max: number, snap: boolean): number {'
    );
    expect(drag).toContain('export const SNAP_TOLERANCE = 20;');
    expect(panel).toContain("import { clampAndSnap } from '#lib/panel-drag.js';");
  });

  it('snaps both axes on the drag branch', () => {
    const at = panel.indexOf("if (pointerState.kind === 'drag') {");
    expect(at, 'the drag branch is gone').toBeGreaterThan(-1);
    const to = panel.indexOf('return;', at);
    expect(to, 'the drag branch never returns').toBeGreaterThan(at);
    const branch = panel.slice(at, to);
    expect(branch).toContain('panelLeft = clampAndSnap(');
    expect(branch).toContain('panelTop = clampAndSnap(');
    /* The clamp it replaced. Both axes, or the panel snaps sideways and slides vertically. */
    expect(branch).not.toContain('Math.max(bounds.left');
    expect(branch).not.toContain('Math.max(bounds.top');
  });
});

describe('poll-08 — a choice commits on keyUP', () => {
  it('binds the reference event, not the one that repeats', () => {
    /*
      `"keyup.enter"` in the const table for `#pollChoiceTxt`, byte 2,113,811. Holding Enter repeats
      `keydown` and added a choice per repeat; `keyup` fires once, on release.
    */
    const at = panel.indexOf('id="pollChoiceTxt"');
    expect(at, 'the choice input is gone').toBeGreaterThan(-1);
    const to = panel.indexOf('/>', at);
    expect(to, 'the choice input never closes').toBeGreaterThan(at);
    const input = panel.slice(at, to);
    expect(input).toContain('onkeyup=');
    expect(input).not.toContain('onkeydown=');
    expect(input).toContain("if (event.key === 'Enter') addChoice();");
  });
});
