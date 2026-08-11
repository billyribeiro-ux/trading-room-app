/**
 * Executes `collect-tooltips.js` against a simulated room, because `node --check` is not enough.
 *
 * A syntax check passed on `constdescription` once — legal as an implicit global, fatal under
 * `'use strict'` on the first click. The only way to know a console script runs is to run it.
 *
 *   node scripts/collect-tooltips.smoke.mjs
 *
 * The page below stands in for ng-bootstrap: a listener on `mouseenter` that builds the Bootstrap 4
 * tooltip DOM and removes it on `mouseleave`. That is deliberately the shape the implementation
 * ASSUMES — the point of this harness is to prove the collector reads and reports whatever is
 * there, so the assertions check that it reported the simulated shape, not that the shape is right.
 * Only the live original can say that.
 */
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('./collect-tooltips.js', import.meta.url), 'utf8');

const dom = new JSDOM(
  `<!doctype html><html><body class="lightTheme">
     <div id="screenTabs"></div>
     <span class="textAreaBtns"><i placement="left" ngbtooltip="Add Emojis" class="far fa-smile"></i></span>
     <span class="textAreaBtns"><i ngbtooltip="Upload an Image" placement="left" class="fas fa-image"></i></span>
     <span class="textAreaBtns"><i ngbtooltip="Play YouTube For All" placement="left" class="fas fa-video"></i></span>
     <span class="textAreaBtns"><i ngbtooltip="Show message options" placement="left" class="fas fa-plus"></i></span>
     <span class="mr-2" placement="bottom" tooltip="This is the default screen users are taken to right now."><i class="fas fa-eye"></i></span>
     <button title="Mute Audio" class="btn btn-primary btn-sm">Mute</button>
     <i ngbtooltip="Never Opens" placement="left" class="fas fa-ghost" data-inert="1"></i>
   </body></html>`,
  {
    url: 'https://chat.protradingroom.com/?room=1001',
    pretendToBeVisual: true,
    // Without this, `window.eval` is not the window's own and the script would run in a context
    // with no `location` — a failure of this harness that would look like a bug in the collector.
    runScripts: 'outside-only'
  }
);

const { window } = dom;
const { document } = window;

// Stand-in for the ngbTooltip directive. Bootstrap 4 spelling on purpose — see the header.
for (const host of document.querySelectorAll('[ngbtooltip], [tooltip]')) {
  if (host.dataset.inert) continue; // one control that never opens, to exercise the gap path
  const text = host.getAttribute('ngbtooltip') || host.getAttribute('tooltip');
  const placement = host.getAttribute('placement') || 'top';
  let node = null;
  host.addEventListener('mouseenter', () => {
    if (node) return;
    node = document.createElement('div');
    node.className = `tooltip show bs-tooltip-${placement}`;
    node.setAttribute('role', 'tooltip');
    node.setAttribute('x-placement', placement);
    node.id = 'ngb-tooltip-7';
    const arrow = document.createElement('div');
    arrow.className = 'arrow';
    const inner = document.createElement('div');
    inner.className = 'tooltip-inner';
    inner.textContent = text;
    node.append(arrow, inner);
    document.body.appendChild(node);
    host.setAttribute('aria-describedby', 'ngb-tooltip-7');
  });
  host.addEventListener('mouseleave', () => {
    node?.remove();
    node = null;
    host.removeAttribute('aria-describedby');
  });
}

// The two browser APIs jsdom does not implement, stubbed only enough to let the download run.
let downloaded = null;
window.URL.createObjectURL = () => 'blob:stub';
const realCreate = document.createElement.bind(document);
document.createElement = (tag) => {
  const el = realCreate(tag);
  if (tag === 'a') el.click = () => (downloaded = el.download);
  return el;
};
// Capture the JSON the script serialises, since the blob itself never leaves jsdom.
let captured = null;
window.Blob = class {
  constructor(parts) {
    captured = parts[0];
  }
};

const logs = [];
window.console = { ...console, log: (...a) => logs.push(a.join(' ')) };

await window.eval(`(async () => { ${source} })()`);
// The script is an async IIFE; give its internal awaits time to settle.
await new Promise((r) => setTimeout(r, 3000));

assert.ok(captured, 'the script must serialise a JSON payload');
const out = JSON.parse(captured);

// 1. It ran end to end and produced a filename.
assert.ok(downloaded?.startsWith('tooltips-'), `expected a download, got ${downloaded}`);

// 2. Role detection read the page rather than assuming.
assert.equal(out.role.detected, 'presenter', 'Play YouTube For All is present, so: presenter');

// 3. It hovered every tooltipped control, including the `tooltip=` spelling.
assert.equal(out.tooltips.length, 6, `expected 6 hosts, got ${out.tooltips.length}`);
assert.ok(
  out.tooltips.some((t) => t.label.startsWith('This is the default screen')),
  'the `tooltip=` eye badge must be captured, not just `ngbtooltip=`'
);

// 4. It captured what actually rendered.
const emoji = out.tooltips.find((t) => t.label === 'Add Emojis');
assert.ok(emoji.appeared, 'the emoji tooltip must have been captured');
assert.match(emoji.generation.arrowSpelling, /Bootstrap 4/);
assert.match(emoji.generation.placementAttribute, /Popper 1/);
assert.equal(emoji.generation.directionClass, 'bs-tooltip-left');
assert.equal(emoji.parts.inner.outerHTML.includes('Add Emojis'), true);
assert.equal(emoji.insertedInto.isDirectChildOfBody, true);
assert.ok(emoji.hostWhileOpen.attrs['aria-describedby'], 'must record what the host gained');

// 5. It closed everything it opened.
assert.ok(
  out.tooltips.every((t) => !t.appeared || t.closedCleanly),
  'every tooltip it opened must have been closed again'
);
assert.equal(document.querySelectorAll('.tooltip').length, 0, 'the page must be left clean');

// 6. The control that never opens is an honest GAP, not a silent omission.
const ghost = out.tooltips.find((t) => t.label === 'Never Opens');
assert.equal(ghost.appeared, false);
assert.ok(
  out.gaps.some((g) => g.what.includes('Never Opens')),
  'a control that never rendered must be recorded as a gap'
);

// 7. Native title= tooltips are recorded as not ours to match.
assert.ok(out.native.some((n) => n.title === 'Mute Audio'));
assert.ok(out.gaps.some((g) => g.what.includes('title=')));

// 8. The verdict block answers the four questions in one place.
assert.deepEqual(out.verdict.arrowSpelling, ['arrow (Bootstrap 4)']);
assert.deepEqual(out.verdict.placementAttribute, ['x-placement (Popper 1 / BS4)']);

// 9. It never clicked anything. The Mute button is the trap: the denylist would catch it, but the
//    stronger guarantee is that the main pass has no click at all.
assert.ok(
  !logs.some((l) => l.includes('REFUSED')),
  'nothing should have been offered to the denylist, because nothing is clicked'
);

console.log('collect-tooltips.js smoke: PASS');
console.log(`  hosts hovered   : ${out.tooltips.length}`);
console.log(`  rendered        : ${out.tooltips.filter((t) => t.appeared).length}`);
console.log(`  gaps recorded   : ${out.gaps.length}`);
console.log(`  download        : ${downloaded}`);
