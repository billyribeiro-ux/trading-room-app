// @vitest-environment jsdom
import { flushSync, mount, unmount } from 'svelte';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

import BootboxDialog from './components/BootboxDialog.svelte';

/**
 * RS-07 — a confirm's buttons are the ANSWER to its question, and this room answered every question
 * with OK and Cancel.
 *
 * ```js
 * bootbox.confirm({ message: "Only select from Trials?",
 *   buttons: { confirm: {label:"Yes", className:"btn-success"},
 *              cancel:  {label:"No",  className:"btn-danger"} }, callback(i){…} })
 * ```
 * (bundle byte 2,516,822.)
 *
 * ## Why this is worth a row at all
 *
 * "Only select from Trials?" answered by OK/Cancel takes a beat to read every single time — and
 * **"Cancel" is actively wrong here**, because the No branch is not a cancellation: `ondismiss`
 * runs `roster.draw(false)`, which draws from everybody. A member pressing Cancel to back out gets
 * a random user anyway.
 *
 * The defaults are the half that has to keep working: `bootbox.confirm(message, callback)` with no
 * `buttons` block renders OK and Cancel, and every other call site in this room passes exactly that.
 */

const mounted: (() => void)[] = [];
afterEach(() => {
  while (mounted.length) mounted.pop()?.();
});

const open = (props: Record<string, unknown>) => {
  const target = document.createElement('div');
  document.body.append(target);
  const component = mount(BootboxDialog, {
    target,
    props: { mode: 'confirm', message: 'Only select from Trials?', onclose: () => {}, ...props }
  });
  flushSync();
  mounted.push(() => {
    unmount(component);
    target.remove();
  });
  return target;
};

describe('the labels and their classes', () => {
  it('renders what the call site asks for', () => {
    const dom = open({
      confirmLabel: 'Yes',
      confirmClassName: 'btn-success',
      cancelLabel: 'No',
      cancelClassName: 'btn-danger'
    });
    const accept = dom.querySelector('.bootbox-accept');
    const cancel = dom.querySelector('.bootbox-cancel');
    expect(accept?.textContent?.trim()).toBe('Yes');
    expect(cancel?.textContent?.trim()).toBe('No');
    expect(accept?.className).toContain('btn-success');
    expect(cancel?.className).toContain('btn-danger');
  });

  it('DEFAULTS to OK and Cancel, which every other call site relies on', () => {
    /*
      The control that matters more than the feature. Forty call sites pass no labels at all, and a
      default that changed would silently reword every dialog in the room.
    */
    const dom = open({});
    expect(dom.querySelector('.bootbox-accept')?.textContent?.trim()).toBe('OK');
    expect(dom.querySelector('.bootbox-cancel')?.textContent?.trim()).toBe('Cancel');
    expect(dom.querySelector('.bootbox-accept')?.className).toContain('btn-primary');
    expect(dom.querySelector('.bootbox-cancel')?.className).toContain('btn-secondary');
  });

  it('labels the ALERT s single button too, since it is the same accept', () => {
    const dom = open({ mode: 'alert', confirmLabel: 'Got it' });
    expect(dom.querySelector('.bootbox-accept')?.textContent?.trim()).toBe('Got it');
    expect(dom.querySelector('.bootbox-cancel'), 'an alert has no cancel').toBeNull();
  });
});

describe('the one call site that needed them', () => {
  /*
    A CWD-relative path, not `import.meta.url`. This file runs under `@vitest-environment jsdom`
    because it mounts a component, and jsdom gives `import.meta.url` an `http:` scheme — so
    `new URL('…', import.meta.url)` produces something `readFileSync` refuses outright. Every other
    source-reading contract here is a node-environment file and never meets this.
  */
  const page = readFileSync('src/routes/+page.svelte', 'utf8');

  it('asks "Only select from Trials?" with Yes and No', () => {
    const at = page.indexOf("message: 'Only select from Trials?'");
    expect(at, 'the random-user confirm is missing').toBeGreaterThan(-1);
    const call = page.slice(at, at + 900);
    expect(call).toContain("confirmLabel: 'Yes'");
    expect(call).toContain("confirmClassName: 'btn-success'");
    expect(call).toContain("cancelLabel: 'No'");
    expect(call).toContain("cancelClassName: 'btn-danger'");
  });

  it('and its No branch still DRAWS, which is why Cancel was the wrong word', () => {
    /*
      `bootbox.confirm`'s callback receives false for No AND for a dismissal, and this call site acts
      on it: `ondismiss` runs the draw without the trials filter. A button reading "Cancel" in front
      of that is a promise the code does not keep.
    */
    const at = page.indexOf("message: 'Only select from Trials?'");
    expect(page.slice(at, at + 1200)).toContain('ondismiss: () => roster.draw(false)');
  });
});
