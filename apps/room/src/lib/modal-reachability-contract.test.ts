import { globSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from '#lib/source-comments.js';

/*
  EVERY MODAL THIS ROOM CAN RENDER IS EITHER REACHABLE OR RECORDED AS NOT.

  ## The finding, 2026-09-01

  `ModalHost.svelte` renders twenty-four modals, one per `ModalName`, each gated on
  `open={name === '…'}`. **One of them has no writer at all.** `'av'` — the Audio/Video Settings
  modal, 139 lines — occurs exactly twice in the whole application: in the type union, and in the
  comparison that would show it. Nothing calls `modals.open('av')`, so a hundred and thirty-nine
  lines of markup with six controls sit behind a condition that is always false.

  It was found by `gate/audit-surface.mjs`, which reported `speakers-device` missing from
  `app-av-settings-modal` — a one-word gap that turned out to sit inside a modal nobody can open.

  **That one word was also a real defect, and it took until 2026-09-01 to read it as one.** The
  markup said `id="av-speakers-device"`; two rules in `app.css` written in the same change key on
  the captured name (`label[for='speakers-device']` at `:2117`, `#speakers-device` at `:2123`), so
  both matched nothing from the day they landed — `XCP-01` exactly, an ours-prefix costing an
  element every rule written for it. Corrected, and `orphan-style-contract.test.ts` now sweeps ID
  and `[for=…]` selectors as well as classes, which is the generalisation that would have caught it
  without an audit run.

  ## Why `'av'` STAYS, rather than being wired or deleted

  Three measurements decided it, and none of them was a preference:

  1. **Nothing opens it upstream either.** `#av-settings-modal` occurs twice in the 2,891,205-byte
     bundle and both are inside the component's OWN `styles:` array. There is no
     `data-bs-target="#av-settings-modal"` anywhere. The reference ships this modal unreachable, so
     this room reproducing that is a match rather than a gap.
  2. **The feature is built, elsewhere and better.** `AvDevicePane.svelte` enumerates real devices,
     filters the virtual and duplicate entries the reference's `loadDevices()` filters, persists
     `audioDeviceID`/`videoDeviceID`, and is mounted at two reachable sites. Wiring a door to this
     modal would put a SECOND device picker in front of members, and its controls are the inert ones.
  3. **The host is load-bearing.** `app-av-settings-modal` is a scoped host in the generated
     stylesheet, so deleting the block turns `captured-css-ancestor-contract` red — the same measured
     answer that put `RecordingPreviewCard.svelte` back after it was removed.

  ## What this file asserts, and why it is not a list of names

  A test that pinned "these modals are reachable" would pass forever and stop nothing. What is
  asserted is that the SET of unreachable modals is exactly the recorded one — so the day a
  twenty-fifth modal is added without a door, or `'av'` gains one, this goes red and the reason has
  to be written or removed.
*/

const SOURCES = [...globSync('src/**/*.svelte'), ...globSync('src/**/*.ts')]
  .filter((path) => !path.includes('.test.'))
  .sort()
  .map((path) => [path, codeOf(path, readFileSync(path, 'utf8'))] as const);

/** Every member of the `ModalName` union, read from the type rather than restated. */
const modalNames = (): string[] => {
  const types = readFileSync(new URL('./types.ts', import.meta.url), 'utf8');
  const union = /export type ModalName =([\s\S]*?);/.exec(types);
  expect(union, 'the ModalName union must be findable in types.ts').not.toBeNull();
  return [...union![1].matchAll(/\|\s*'([^']+)'/g)].map((match) => match[1]);
};

/**
 * The sites that OPEN a modal, as distinct from the sites that mention its name.
 *
 * A bare string search is useless here: `'user'`, `'poll'` and `'qa'` all occur inside
 * `emoji-data.ts`, which knows nothing about modals. What counts is an ASSIGNMENT — the one API
 * (`RoomModals.open`) plus the two shapes the page and its children use to reach it.
 */
const OPENERS = [
  /*
    A CALL whose name contains `open` or `modal`, taking a modal name as its argument.

    Not a hand-kept list of function names, and not a bare string search. The first version listed
    `open(`, `openModal(` and two assignment shapes, and reported NINE modals dead that are opened
    every day — `onopenmodal('connectivity')` from the sidebar, `onopenalertfilter` from the
    overlays, `modals.open('all-private')`. A list of callee names is a list somebody has to
    remember to extend, which is the failure this whole file is about one level up.

    The callee filter is what keeps it from being a string search: `emoji-data.ts` contains `'user'`,
    `'poll'` and `'qa'` as ordinary data, and `sound('followed')` would otherwise count as a door.
  */
  /\b\w*(?:open|modal)\w*\(\s*'([a-z-]+)'/gi,
  /\bmodal\s*=\s*'([a-z-]+)'/g,
  /\bmodals\.name\s*=\s*'([a-z-]+)'/g
];

const opened = (): Map<string, string[]> => {
  const found = new Map<string, string[]>();
  for (const [path, source] of SOURCES) {
    for (const pattern of OPENERS) {
      for (const match of source.matchAll(pattern)) {
        const line = source.slice(0, match.index).split('\n').length;
        found.set(match[1], [...(found.get(match[1]) ?? []), `${path}:${line}`]);
      }
    }
  }
  return found;
};

/**
 * The modals with no door, each with the measurement that says why it stays.
 *
 * **This is not a backlog.** Every entry here has been read against the bundle and found unreachable
 * UPSTREAM as well. Adding one is a conversation; removing one means a door was built.
 */
const DELIBERATELY_UNREACHABLE: Readonly<Record<string, string>> = {
  av:
    'Audio/Video Settings. `#av-settings-modal` occurs twice in the whole bundle and both are in ' +
    "the component's own `styles:` array — nothing opens it upstream either. The feature is built " +
    'as `AvDevicePane.svelte` and mounted at two reachable sites; the block stays because ' +
    '`app-av-settings-modal` is a scoped host in the generated stylesheet.',
  scheduled:
    'Manage Scheduled Alerts. Upstream this modal IS reachable — `XTe`\'s "See Scheduled Alerts" ' +
    'carries `data-bs-target="#scheduledAlertsModal"` and calls `manageScheduledAlerts()`. This ' +
    'room deliberately does not reproduce the split, and `ScheduledAlerts.svelte` records why: ' +
    '"both halves ask one question — what is already scheduled — so two components would refetch ' +
    'the same list and disagree about it after a removal." The button opens the INLINE table ' +
    'instead, which is the half that was built. The shell stays for the scoped host, and both of ' +
    "its captured rules live in `ScheduledAlertsTable.svelte`'s own `<style>` block rather than " +
    'depending on that host.'
};

describe('every modal name has a door, or a recorded reason for not having one', () => {
  it('found the union and the openers, so the sweep below means something', () => {
    /*
      The vacuity guard, in both directions. An empty union or an opener regex that matched nothing
      would make every assertion here pass over a room with no modals at all.
    */
    expect(modalNames().length).toBeGreaterThan(20);
    expect(opened().size).toBeGreaterThan(15);
    expect(SOURCES.length).toBeGreaterThan(300);
  });

  it('the unreachable set is exactly the recorded one', () => {
    const doors = opened();
    const unreachable = modalNames()
      .filter((name) => !doors.has(name))
      .sort();
    expect(
      unreachable,
      'A modal with no `open(...)` call is markup behind a condition that is always false. Either build the door, or add it to DELIBERATELY_UNREACHABLE with the measurement that says why — and the measurement has to include whether the REFERENCE opens it, because reproducing an unreachable modal is a match and inventing one is not.'
    ).toEqual(Object.keys(DELIBERATELY_UNREACHABLE).sort());
  });

  it('and no recorded reason outlives its subject', () => {
    /*
      The other direction. An entry for a modal that has since gained a door reads as a decision
      while being a leftover — the stale-exception shape `orphan-component-contract` guards for its
      own list.
    */
    const doors = opened();
    const stale = Object.keys(DELIBERATELY_UNREACHABLE).filter((name) => doors.has(name));
    expect(stale, `${stale.join(', ')} — now reachable; remove the entry`).toEqual([]);
  });
});

describe("the `av` reason's own premises", () => {
  /*
    A reason made of three measurements is three things that can quietly stop being true. Each is
    read here rather than trusted, which is what makes the entry above a decision rather than a note.
  */
  const BUNDLE = readFileSync(
    new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url),
    'utf8'
  );

  it('nothing in the reference opens it either', () => {
    /*
      TWO occurrences, and both inside the component's own `styles:` array. A `data-bs-target` or an
      `href` pointing at it would be a third, and would mean the reference DOES reach this modal —
      at which point ours not reaching it stops being a match.
    */
    expect((BUNDLE.match(/#av-settings-modal/g) ?? []).length).toBe(2);
    expect(BUNDLE).not.toContain('"data-bs-target","#av-settings-modal"');
  });

  it('the device picker is built, and mounted where members can reach it', () => {
    const host = codeOf(
      'ModalHost.svelte',
      readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8')
    );
    expect((host.match(/<AvDevicePane\b/g) ?? []).length).toBeGreaterThanOrEqual(2);
    const pane = readFileSync(new URL('./components/AvDevicePane.svelte', import.meta.url), 'utf8');
    expect(pane).toContain('enumerateDevices');
    expect(pane).toContain('audioDeviceID');
    expect(pane).toContain('videoDeviceID');
  });

  it('and the host is one the generated stylesheet scopes on', () => {
    /*
      The measured reason the block was not simply deleted. `captured-css-ancestor-contract` owns
      this rule; it is read here because THIS file's entry depends on it.
    */
    const generated = readFileSync(
      new URL('./styles/captured-runtime-components.css', import.meta.url),
      'utf8'
    );
    expect(generated).toMatch(/^app-av-settings-modal\b/m);
  });
});
