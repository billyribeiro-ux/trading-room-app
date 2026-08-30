// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { flushSync, mount, unmount } from 'svelte';
import { parse } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';

import BindThisProbe from './BindThisProbe.svelte';

/*
  HOW THIS ROOM GETS A REFERENCE TO A DOM NODE — one rule, and the evidence for it.

  ## The question, which was open and recorded as open

  Two forms were in use with no stated rule between them: `bind:this`, and a hand-written "capture
  attachment" of the shape

      function captureX(node) { x = node; return () => { if (x === node) x = undefined; } }

  A count on 2026-08-17 found the split and could not explain it — the note said the obvious rule
  was false for most of the sites. Left unresolved, it is the kind of inconsistency that makes the
  next reader copy whichever one they saw last.

  ## The rule, and it comes from the docs

  `svelte/bind`, verbatim: *"To get a reference to a DOM node, use `bind:this`. The value will be
  `undefined` until the component is mounted — in other words, you should read it inside an effect
  or an event handler, but not during component initialisation."*

  So `bind:this` is the answer, and a capture attachment needs a reason `bind:this` cannot serve.
  There are exactly three such reasons in this repository, and each is a structural limit rather
  than a preference:

  1. **It must cross a component boundary.** `bind:this` binds a variable in the file that owns the
     element. When the PAGE needs a node that lives inside `AlertChatArea` or `RoomShell`, it hands
     an attachment down as a prop — `captureMainElement`, `captureAlertChatElement`,
     `captureComposerElement`, `captureAlertsScroller`. There is no `bind:this` form for this.
  2. **It must fan one node to two owners.** `holdAlertsScroller` sets the component's own
     `alertsScroller` AND calls the page's `captureAlertsScroller`, because `RoomAlertsPane`
     reads it too. `bind:this` writes one lvalue.
  3. **It does something to the node as well as capturing it.** `captureFileInput` also sets
     `multiple`; `captureCategorySection(index)` is a factory writing one slot of an array per item.

  Everything else was hand-rolling `bind:this`, including the `=== node` teardown guard — and
  `~/CLAUDE.md` says it plainly: *"Do not hand-roll what the platform already does."*

  ## Which is why the first half of this file EXECUTES the platform

  The guard is only redundant if `bind:this` really does survive a new element mounting before the
  old one tears down. That is a claim about Svelte's internals, so it is run rather than assumed —
  and if a future version breaks it, these tests go red and the twelve attachments become load
  bearing again.
*/

describe('what bind:this actually does, so the guard can be removed on evidence', () => {
  const mountProbe = () => {
    const seen: (HTMLElement | undefined)[] = [];
    const props = $state({
      which: 'a' as 'a' | 'b',
      present: true,
      report: (node: HTMLElement | undefined) => seen.push(node)
    });
    const target = document.createElement('div');
    document.body.append(target);
    const component = mount(BindThisProbe, { target, props });
    flushSync();
    return {
      props,
      seen,
      latest: () => seen[seen.length - 1],
      stop: () => {
        unmount(component);
        target.remove();
      }
    };
  };

  it('points at the element once mounted', () => {
    const probe = mountProbe();
    expect(probe.latest()?.dataset.which, 'the binding must hold the mounted node').toBe('a');
    probe.stop();
  });

  it('SURVIVES a swap: the new element wins, it is never left undefined', () => {
    /*
      THE assertion, and the whole reason the hand-rolled guard existed. Swapping the branch mounts
      `b` and destroys `a`; if Svelte nullified the binding on `a`'s teardown without checking, the
      reference would end up `undefined` while an element is plainly on screen.
    */
    const probe = mountProbe();
    probe.props.which = 'b';
    flushSync();

    expect(probe.latest(), 'a live element must not leave the binding empty').toBeDefined();
    expect(probe.latest()?.dataset.which, 'the NEW element owns the binding').toBe('b');
    expect(
      probe.seen.filter((node) => node === undefined),
      'and it must not flicker through undefined on the way'
    ).toEqual([]);
    probe.stop();
  });

  it('clears to NULL when the element really goes away, not undefined', () => {
    /*
      The other half: the guard must not be so eager that a genuine removal leaves a dangling node.

      AND THE VALUE IS `null`, WHICH IS NOT WHAT THE HAND-ROLLED FORM USED. Every capture attachment
      cleared to `undefined`, so converting one to `bind:this` changes what a reader sees after
      teardown. Harmless here only because every reader in this repository is a falsy check
      (`if (!scroller) return`) — checked at each of the five conversion sites rather than assumed,
      and the declarations now say `| null` so the type tells the truth.

      A first draft of this test asserted `toBeUndefined()` and went red. That was the instrument
      being wrong about the platform, and it is exactly the detail that would otherwise have shipped
      silently.
    */
    const probe = mountProbe();
    probe.props.present = false;
    flushSync();

    expect(probe.latest(), 'a removed element must clear the binding').toBeNull();
    probe.stop();
  });
});

/*
  The catalog half. Everything above proves the platform's behaviour; this proves the repository
  follows the rule that behaviour licenses.
*/
const CAPTURE_SHAPE = /^\s*(?:function\s+)?(capture|hold)[A-Z]\w*/;

/** Every attachment expression, with the component it sits on. */
const attachmentsIn = (file: string, source: string) => {
  const found: { line: number; expr: string }[] = [];
  const lineOf = (offset: number) => source.slice(0, offset).split('\n').length;
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const candidate = node as { type?: string; expression?: { start?: number; end?: number } };
    if (candidate.type === 'AttachTag' && candidate.expression?.start !== undefined) {
      found.push({
        line: lineOf(candidate.expression.start),
        expr: source.slice(candidate.expression.start, candidate.expression.end)
      });
    }
    for (const value of Object.values(node as Record<string, unknown>)) {
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === 'object') visit(value);
    }
  };
  visit(parse(source, { modern: true }).fragment);
  return found.map((entry) => ({ ...entry, file }));
};

describe('every capture attachment has a reason bind:this cannot serve', () => {
  const tracked = execSync("git ls-files 'src/**'", { encoding: 'utf8' }).trim().split('\n');
  const components = tracked.filter((file) => file.endsWith('.svelte'));

  /*
    Named, with the reason each one is not a `bind:this`. Adding a capture attachment means adding a
    line here and saying which of the three structural limits applies — which is the decision this
    list exists to force, because the alternative is what this repository already had: two forms and
    no rule.
  */
  const SANCTIONED: Record<string, string> = {
    // 1 — crosses a component boundary as a prop. No bind:this form exists for this.
    captureMainElement: 'prop: the page needs a node owned by RoomShell',
    captureAlertChatElement: 'prop: the page needs a node owned by AlertChatArea',
    captureComposerElement: 'prop: the page needs a node owned by AlertChatArea',
    captureAlertsScroller: 'prop: RoomAlertsPane.toggleToolbar reads it',
    // 2 — fans one node to two owners; bind:this writes one lvalue.
    holdAlertsScroller: 'local AND the page prop, because two owners read the alerts scroller',
    // 3 — does something to the node as well as capturing it.
    captureFileInput: 'also sets the multiple attribute',
    captureCategorySection: 'a factory writing one array slot per category'
  };

  /*
    EVERY COMPONENT READ ONCE AND PARSED ONCE, shared by the three assertions below.

    This was `components.flatMap((file) => attachmentsIn(file, readFileSync(file, 'utf8')))` inside
    the first `it`, and the identical loop again inside the second, and a third read of every file
    in the third — so the Svelte compiler parsed the whole component tree three times for three
    questions about the same syntax trees.

    It stopped being merely wasteful on 2026-08-30: `ModalHost.svelte` grew by ~390 lines, each
    parse of it got proportionally slower, and the first `it` crossed vitest's 5-second per-test
    budget and FAILED — a green suite turned red by a file getting longer, with nothing wrong in it.
    Raising the timeout would have been treating the symptom; the shape was the problem, and it is
    the shape `CLAUDE.md` names third: work repeated per consumer instead of done once.

    One parse. Same assertions, and the whole file now runs in roughly a third of the time.
  */
  const SOURCES = new Map(components.map((file) => [file, readFileSync(file, 'utf8')]));
  const ATTACHMENTS = components.flatMap((file) => attachmentsIn(file, SOURCES.get(file)!));

  it('found attachments to inspect', () => {
    expect(ATTACHMENTS.length, 'no attachments were found at all').toBeGreaterThan(50);
  });

  it('no capture-shaped attachment is an unsanctioned hand-rolled bind:this', () => {
    const offenders: string[] = [];
    for (const attachment of ATTACHMENTS) {
      // The bare identifier or the factory head, e.g. `captureCategorySection(index)`.
      const name = attachment.expr.match(/^([A-Za-z_$][\w$]*)/)?.[1];
      if (!name || !CAPTURE_SHAPE.test(name)) continue;
      if (SANCTIONED[name]) continue;
      offenders.push(`${attachment.file}:${attachment.line} — {@attach ${name}}`);
    }

    expect(
      offenders,
      `${offenders.join('\n')}\n\nA capture attachment that only stores the node is a hand-rolled bind:this, including its "if (x === node)" teardown - and the tests above PROVE the platform already does both halves. Use bind:this, or add the name to SANCTIONED with which of the three structural limits applies.`
    ).toEqual([]);
  });

  it('the sanctioned list has no stale entries', () => {
    /*
      A name that no longer appears is a rule nobody is following, and it must not sit here as cover
      for the next one.

      Searched across the whole component rather than against the attachment heads, and the first
      draft got that wrong: `captureAlertsScroller` is a PROP that `holdAlertsScroller` CALLS, so it
      is never an attachment expression itself and was reported stale while being very much alive.
    */
    const sources = [...SOURCES.values()].join('\n');
    const stale = Object.keys(SANCTIONED).filter((name) => !sources.includes(name));
    expect(stale, `${stale.join(', ')} is sanctioned but appears in no component`).toEqual([]);
  });
});
