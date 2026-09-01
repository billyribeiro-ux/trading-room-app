/**
 * Positive controls for `verify-account-styles.mjs`. A gate nobody has tried to fool is not a gate.
 *
 * Three of the manage verifier's controls once reported MISSED, and two of those were bugs in the
 * gate rather than in the sheet — a `\b` that matched across a hyphen, and a `:hover` rule counted
 * as an override of the resting state. Both are re-tested here against `account.css`, along with
 * the shorthand expansion, the media filtering and the last-declaration-wins rule that this gate
 * needed and the manage one does not have.
 *
 * Every control mutates a COPY in the system temp directory and runs the verifier with `--css`
 * against it. `src/account.css` is never written to — another agent owns that file.
 *
 * A probe that quietly matches nothing reports a false MISSED, so each control asserts its
 * replacement actually changed the bytes before it draws any conclusion. A control that fails to
 * fire is a finding about the gate, not a pass.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SOURCE = new URL('../src/account.css', import.meta.url);
const VERIFIER = new URL('./verify-account-styles.mjs', import.meta.url);
const scratch = mkdtempSync(join(tmpdir(), 'account-css-controls-'));

const original = readFileSync(SOURCE, 'utf8');

/**
 * Proof that the verifier actually REACHED its comparison, printed by
 * `verify-account-styles.mjs` immediately after the last declaration is judged and before any
 * divergence, advisory or paintless report — so it is on stdout on the passing path and on the
 * failing path alike.
 *
 * ## Why a marker is needed at all, and what it cost not to have one
 *
 * `run()` below cannot distinguish a verifier that ran and stayed silent from a verifier that never
 * ran, because both hand back a string with no `expect` substring in it. For the `absent: true`
 * controls that difference is the entire result: "the gate correctly declined to judge this" and
 * "the gate died before it judged anything" both score QUIET (correct).
 *
 * That is not hypothetical. `verify-account-styles.mjs:39` pins its capture at an absolute path on
 * the machine that took it, so on any other checkout it throws ENOENT during module evaluation and
 * every probe gets an empty report. This harness then printed five QUIET (correct) lines — five
 * controls reported as having behaved as designed by a verifier that had not executed a single
 * assertion. A control harness exists precisely to refuse that kind of credit, so it now refuses it
 * for itself: no marker, no verdict.
 */
const RAN_MARKER = 'account.css vs capture:';

function run(css) {
  const file = join(scratch, `probe-${Math.random().toString(36).slice(2)}.css`);
  writeFileSync(file, css);
  try {
    return execFileSync('node', [VERIFIER.pathname, '--css', file], { encoding: 'utf8' });
  } catch (error) {
    // exit 1 is the gate failing, which is the whole point; its report is on both streams
    return `${error.stdout ?? ''}${error.stderr ?? ''}`;
  }
}

/**
 * The line of a crashed verifier's output that says WHY, so a failure is diagnosed rather than
 * merely counted.
 *
 * Node prints the offending source frame first (`node:fs:440`, then the source line, then a blank
 * line) and the actual message several lines down, so the first non-empty line is the least useful
 * one on the page. The error line is preferred and the first non-empty line is the fallback, which
 * covers a verifier that fails without throwing.
 */
function firstMeaningfulLine(report) {
  const lines = report
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    lines.find((line) => /^(?:[A-Za-z]*Error|Uncaught)\b|\bError:/.test(line)) ??
    lines[0] ??
    '(the verifier produced no output at all)'
  );
}

const results = [];

/**
 * @param name        what is being proved
 * @param from        the exact text in account.css to replace
 * @param to          what to replace it with
 * @param expect      a substring the report must contain (or must NOT, when `absent` is set)
 * @param absent      true when the control proves the gate stays QUIET
 */
function control({ name, from, to, expect, absent = false, why }) {
  if (!original.includes(from)) {
    results.push({ name, status: 'ANCHOR LOST', detail: `account.css no longer contains ${JSON.stringify(from)}` });
    return;
  }
  const mutated = original.replace(from, to);
  if (mutated === original) {
    results.push({ name, status: 'PROBE INERT', detail: 'the replacement changed no bytes' });
    return;
  }
  const report = run(mutated);
  /*
    Checked BEFORE `expect`, and it is the only ordering that is honest: an empty report satisfies
    every `absent: true` control for free. See `RAN_MARKER` above for the run this actually caught.
  */
  if (!report.includes(RAN_MARKER)) {
    results.push({ name, status: 'VERIFIER DID NOT RUN', detail: firstMeaningfulLine(report) });
    return;
  }
  const hit = report.includes(expect);
  const passed = absent ? !hit : hit;
  results.push({
    name,
    status: passed ? (absent ? 'QUIET (correct)' : 'CAUGHT') : absent ? 'FIRED (wrong)' : 'MISSED',
    detail: why
  });
}

/* ── the colour check, which is the reason this family of gates exists ─────────────────────── */
control({
  name: 'a colour swapped on a mapped class',
  from: '.acc-label-orange {\n  background: rgb(254, 86, 33);',
  to: '.acc-label-orange {\n  background: rgb(0, 0, 255);',
  expect: '.acc-label-orange -> .label-orange',
  why: 'background shorthand -> background-color, compared against [35]'
});

/* ── shorthand expansion: the eleven-divergence read found a padding bug ───────────────────── */
control({
  name: 'padding shorthand on .acc-input',
  from: '.acc-input {\n  height: 34px;\n  padding: 6px 18px;',
  to: '.acc-input {\n  height: 34px;\n  padding: 6px 12px;',
  // padding-LEFT, not -right: `.acc-form-group .acc-input { padding-right: 34px }` is a more
  // specific rule that also declares the right side, so the gate correctly declines to judge it.
  // The first draft of this control expected `padding-right` and reported a MISSED that was mine.
  expect: 'padding-left',
  why: '`padding: 6px 12px` vs the 18px measured on [8]'
});

/* ── the `\b` trap: `.acc-panel-default` must not read as an override of `.acc-panel` ──────── */
control({
  name: 'class-name boundary — .acc-panel-default is not an override of .acc-panel',
  from: '.acc-panel {\n  background: #fff;',
  to: '.acc-panel {\n  background: rgb(2, 2, 2);',
  expect: '.acc-panel -> .pane-default',
  why: '.acc-panel-default, -heading and -body all restate background; a \\b boundary mutes all three'
});

/* ── the class-wide model has a floor, and it is stated rather than hidden ─────────────────── */
control({
  name: 'KNOWN BLIND SPOT: a property the reference itself splits cannot be judged',
  from: '.acc-btn {\n  display: inline-block;\n  height: 34px;\n  padding: 6px 12px;',
  to: '.acc-btn {\n  display: inline-block;\n  height: 34px;\n  padding: 7px 12px;',
  expect: '.acc-btn -> .btn',
  absent: true,
  why: '.btn measures 5px of padding on its .btn-sm nodes and 6px elsewhere, so it pins nothing to compare against'
});

/* ── the state trap: a :hover rule is not an override of the resting state ─────────────────── */
control({
  name: 'state rules are not overrides — .acc-btn-default:hover must not mute the resting background',
  from: '.acc-btn-default {\n  background: var(--btn-default-bg);',
  to: '.acc-btn-default {\n  background: rgb(1, 2, 3);',
  expect: '.acc-btn-default -> .btn-default',
  why: ':hover, :focus, :active and [disabled] all declare background-color for this class'
});

/* ── border shorthand + var() resolution ───────────────────────────────────────────────────── */
control({
  name: 'border shorthand through a custom property',
  from: '.acc-panel-default {\n  background: #fff;\n  border: 1px solid var(--acc-cell-rule);',
  to: '.acc-panel-default {\n  background: #fff;\n  border: 1px solid rgb(9, 9, 9);',
  expect: 'border-top-color',
  why: '`border: 1px solid X` -> four longhand colours; var() must resolve or every token reads as a bug'
});

/* ── a width with no style paints nothing ──────────────────────────────────────────────────── */
control({
  name: 'a declared border width with no style anywhere',
  from: '.acc-mb {\n  margin-bottom: 10px;',
  to: '.acc-mb {\n  margin-bottom: 10px;\n  border-left-width: 3px;',
  expect: 'BORDERS THAT CANNOT PAINT',
  why: 'border-left-style stays `none`, so the used width is 0 and the line is never drawn'
});

control({
  name: 'the paintless check is not blanket-muted by the sibling-rule lookup',
  from: '.acc-tooltip .tooltip-arrow {\n  position: absolute;\n  width: 0;\n  height: 0;\n  border-color: transparent;\n  border-style: solid;',
  to: '.acc-tooltip .tooltip-arrow {\n  position: absolute;\n  width: 0;\n  height: 0;\n  border-color: transparent;',
  expect: 'tooltip-arrow',
  why: "remove the ONE rule that supplies the arrow's style and it must become paintless again"
});

/* ── the cascade this gate does model: equal-specificity source order ──────────────────────── */
control({
  name: 'last applying breakpoint wins — the 1200px branch is the one judged',
  from: '@media (min-width: 1200px) {\n  .acc-container,\n  .acc-container-sm {\n    width: 1170px;',
  to: '@media (min-width: 1200px) {\n  .acc-container,\n  .acc-container-sm {\n    width: 1180px;',
  expect: '.acc-container -> .container',
  why: 'the capture is 1989px wide, so 1200px is the branch that applies'
});

control({
  name: 'an overridden breakpoint is NOT judged',
  from: '@media (min-width: 768px) {\n  .acc-container,\n  .acc-container-sm {\n    width: 750px;',
  to: '@media (min-width: 768px) {\n  .acc-container,\n  .acc-container-sm {\n    width: 760px;',
  expect: '.acc-container -> .container',
  absent: true,
  why: 'the 992px and 1200px branches both come later and both apply; 760px never reaches the screen'
});

/* ── media that does not apply to the capture must not be judged against it ────────────────── */
control({
  name: 'a max-width rule is not judged against a 1989px capture',
  from: '@media screen and (max-width: 767px) {\n  .acc-table-responsive {\n    width: 100%;\n    margin-bottom: 15px;',
  to: '@media screen and (max-width: 767px) {\n  .acc-table-responsive {\n    width: 100%;\n    margin-bottom: 999px;',
  expect: 'acc-table-responsive',
  absent: true,
  why: 'that rule describes a phone; the capture is a desktop'
});

/* ── overflow shorthand ────────────────────────────────────────────────────────────────────── */
control({
  name: 'overflow shorthand on .acc-table-responsive',
  from: '.acc-table-responsive {\n  overflow: auto;\n}',
  to: '.acc-table-responsive {\n  overflow: hidden;\n}',
  expect: 'overflow-x',
  why: '[14] and [785] both measure overflow-x/y auto'
});

/* ── an unmapped class must produce NOTHING; the gate does not invent a counterpart ────────── */
control({
  name: 'an unmapped class is never judged',
  from: '.acc-h3 {\n  font-size: 24px;',
  to: '.acc-h3 {\n  font-size: 96px;',
  expect: '.acc-h3 ->',
  absent: true,
  why: 'the reference styles that heading by TAG; guessing a class for it is how a gate starts lying'
});

/* ── a known blind spot, stated rather than hidden ─────────────────────────────────────────── */
control({
  name: 'KNOWN BLIND SPOT: a relative length is not judged',
  from: '.acc-mb {\n  margin-bottom: 10px;',
  to: '.acc-mb {\n  margin-bottom: 3em;',
  expect: '.acc-mb -> .mb',
  absent: true,
  why: 'em/%/rem resolve against a parent this gate does not model — the price of not reporting `font-size: 75%` as a bug'
});

const width = Math.max(...results.map((r) => r.name.length));
let bad = 0;
for (const result of results) {
  if (
    result.status === 'MISSED' ||
    result.status === 'FIRED (wrong)' ||
    result.status === 'ANCHOR LOST' ||
    result.status === 'PROBE INERT' ||
    result.status === 'VERIFIER DID NOT RUN'
  )
    bad += 1;
  console.log(`${result.status.padEnd(20)} ${result.name.padEnd(width)}  ${result.detail ?? ''}`);
}
console.log(`\n${results.length - bad}/${results.length} controls behaved as designed`);
process.exit(bad === 0 ? 0 : 1);
