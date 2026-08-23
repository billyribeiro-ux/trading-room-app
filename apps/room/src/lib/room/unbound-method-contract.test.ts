import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'svelte/compiler';
import { describe, expect, it } from 'vitest';

import { RoomAlerts } from './alerts.svelte';
import { RoomBroadcasts } from './broadcasts.svelte';
import { RoomFiles } from './files.svelte';
import { RoomPrivateChat } from './private-chat.svelte';
import { RoomTradeAlerts } from './trade-alerts.svelte';
import { RoomComposer } from './composer.svelte';
import { RoomFeeds } from './feeds.svelte';
import { RoomMessageActions } from './message-actions.svelte';
import { RoomEventStream } from './events.svelte';
import { RoomGates } from './gates.svelte';
import { RoomMediaTransport } from './media-transport.svelte';
import { RoomAlertsPane } from './alerts-pane';
import { RoomArrivals, RoomOrderedArrivals } from './arrivals';
import { RoomFeedScroll } from './feed-scroll';
import { RoomRecording } from './recording';
import { RoomScrollFollow } from './scroll-follow';
import { RoomWebcams } from './webcams';
import { RoomWindowHandlers } from './window-handlers';
import { RoomScreens } from './screens.svelte';
import { RoomSessionControl } from './session-control.svelte';
import { RoomUserActions } from './user-actions.svelte';
import { RoomChat } from './chat.svelte';
import { RoomDialogs } from './dialogs.svelte';
import { RoomLogPages } from './log-pages.svelte';
import { RoomMedia } from './media.svelte';
import { RoomMenus } from './menus.svelte';
import { RoomModals } from './modals.svelte';
import { RoomNotes } from './notes.svelte';
import { RoomPolls } from './polls.svelte';
import { RoomPrefs } from './prefs.svelte';
import { RoomRoster } from './roster.svelte';
import { RoomSplit } from './split.svelte';
import { RoomToasts } from './toasts.svelte';
import { RoomVolume } from './volume.svelte';

/*
  A CLASS METHOD PASSED AS A PROP LOSES `this`, AND NOTHING ELSE IN THIS TOOLCHAIN CAN SEE IT.

  `svelte/$state` names the case outright: *"when calling methods in JavaScript, the value of `this`
  matters"*. Write `onConfirm={dialogs.confirm}` and the modal calls it with `this` undefined, the
  body reaches for a private field on nothing, and it throws the first time a user clicks.

  What makes it worth a gate of its own rather than a habit is the evidence:

  * `svelte-check` passes. The types line up perfectly — a method IS a function of that signature.
  * `eslint` passes. Nothing is unused and nothing is shadowed.
  * `svelte-autofixer` passes. It has no opinion about `this`.
  * Every text-reading contract test passes, because the text is exactly what they expect.
  * The suite passes, because no test mounts the component and clicks the control.

  It happened FIFTEEN times across Phase 5 slices 2 to 4b — twice in `RoomDialogs`, twice in
  `RoomPrefs`, and eleven times in one commit for `RoomVolume`, where a mechanical rename turned ten
  handler props into unbound methods at a stroke. Each was found by reading the diff. That is not a
  process; it is luck with a good habit attached, and `AGENTS.md` DPE rule 2 says the gate comes
  before the bug rather than after it.

  ## How it decides

  The prototype, not the source text. For each known room-class instance, every property is
  classified by its own descriptor: an accessor (`get`) is a VALUE and is safe to pass, a data
  property whose value is a function is a METHOD and is not. So the guard needs no list of method
  names, cannot go stale when a class gains one, and says exactly which line is wrong.

  The remedy is always the same and is what the docs prescribe: wrap it —
  `onconfirm={(message, run) => dialogs.confirm(message, run)}`.
*/

/*
  Instance name in the markup -> the class it is constructed from. Only classes whose methods can be
  passed as props need to be here; a class the page never hands to a component cannot exhibit this.
*/
const INSTANCES: Record<string, new (...args: never[]) => object> = {
  // Phase 5 services
  toasts: RoomToasts,
  dialogs: RoomDialogs,
  prefs: RoomPrefs,
  roomVolume: RoomVolume,
  broadcasts: RoomBroadcasts,
  files: RoomFiles,
  swingAlerts: RoomTradeAlerts,
  privateChat: RoomPrivateChat,
  composer: RoomComposer,
  feeds: RoomFeeds,
  messageActions: RoomMessageActions,
  screens: RoomScreens,
  mediaTransport: RoomMediaTransport,
  recording: RoomRecording,
  roomEvents: RoomEventStream,
  sessionControl: RoomSessionControl,
  userActions: RoomUserActions,
  gates: RoomGates,
  /*
    The Phase 1 classes, added when the completeness check below refused a map that covered only the
    new ones. Every one of these is handed to a component as a prop — `roster` and `menus` go whole
    to `RoomSidebar`, `media` and `menus` to `RoomNavbar`, five of them to `AlertChatArea` — so
    they can exhibit this exactly as the new ones can, and were simply never checked.
  */
  alerts: RoomAlerts,
  chat: RoomChat,
  logPages: RoomLogPages,
  media: RoomMedia,
  menus: RoomMenus,
  modals: RoomModals,
  notes: RoomNotes,
  polls: RoomPolls,
  roster: RoomRoster,
  split: RoomSplit,
  /*
    THE PLAIN `.ts` MODULES, added 2026-08-16 — and the reason is a defect this file could not see
    while it scanned only `*.svelte.ts`.

    `ondetachalerts={alertsPane.detach}` was on the page and `RoomAlertsPane` lives in a plain
    `alerts-pane.ts`, because it holds no rune. The discovery below skipped it, the map did not name
    it, and the guard reported nothing. Executed rather than argued: calling `pane.detach` by
    reference throws `TypeError: Cannot read properties of undefined (reading '#detachedWindow')`,
    so "Detach Alerts" was broken in every room from the slice that introduced it.

    Being the wrong extension is not a reason to be unguarded. It is the SAME sentence
    `source-size-contract.test.ts` already carries about its own catalog, and it turns out to have
    been the more expensive of the two omissions.
  */
  alertsPane: RoomAlertsPane,
  alertArrivals: RoomArrivals,
  qaArrivals: RoomOrderedArrivals,
  feedScroll: RoomFeedScroll,
  alertsFollow: RoomScrollFollow,
  webcams: RoomWebcams,
  windowHandlers: RoomWindowHandlers
};

/*
  A HAND-KEPT MAP IS THE FAILURE THIS FILE EXISTS TO PREVENT, so it is checked against disk.

  `RoomBroadcasts` proved it within one slice of the guard being written: the class landed, seven of
  its methods were passed as props by a mechanical shorthand repair, and this file said nothing —
  because the map had four entries and the new class was not one of them. A guard that is blind to
  the newest module is worse than no guard, since it reads as coverage.

  So every class this directory exports has to be listed. Adding a module without adding it here
  fails, in the same shape and for the same reason as `source-size-contract.test.ts` refusing a
  module with no declared ceiling.
*/
const exportedRoomClasses = () => {
  const dir = new URL('./', import.meta.url);
  const names = new Set<string>();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue;
    const source = readFileSync(new URL(file, dir), 'utf8');
    for (const match of source.matchAll(/^export class (\w+)/gm)) names.add(match[1]);
  }
  return names;
};

const methodNames = (constructor: new (...args: never[]) => object) => {
  const names = new Set<string>();
  for (const key of Object.getOwnPropertyNames(constructor.prototype)) {
    if (key === 'constructor') continue;
    const descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, key);
    // An accessor is a value the template may read. A data property holding a function is a method,
    // and passing it by reference is what drops `this`.
    if (descriptor && typeof descriptor.value === 'function') names.add(key);
  }
  return names;
};

const SOURCE = new URL('../../', import.meta.url);

const svelteFiles = [
  'routes/+page.svelte',
  ...readdirSync(new URL('lib/components/', SOURCE))
    .filter((name) => name.endsWith('.svelte'))
    .map((name) => `lib/components/${name}`)
];

/*
  `svelte.parse`, never a regex over the markup. A hand-rolled scanner on `+page.svelte` once
  stopped after three tags on an apostrophe inside a JS handler and reported a clean run with a
  wrong answer; the compiler's own parser is the only instrument this file will trust.
*/
/**
 * `instance.method` written as a bare reference — the shape that drops `this`.
 *
 * Returns the `instance.method` text when the expression is exactly that and the property really is
 * a method on the class; `null` for anything else. A CALL (`webcams.card(presenter, index)`) is
 * safe, because `this` is bound at the call and only the RESULT travels.
 */
const unboundMethodIn = (expression: Record<string, unknown> | undefined): string | null => {
  if (
    expression?.type !== 'MemberExpression' ||
    (expression.object as { type?: string })?.type !== 'Identifier' ||
    (expression.property as { type?: string })?.type !== 'Identifier'
  ) {
    return null;
  }
  const instance = (expression.object as { name: string }).name;
  const property = (expression.property as { name: string }).name;
  const constructor = INSTANCES[instance];
  if (!constructor || !methodNames(constructor).has(property)) return null;
  return `${instance}.${property}`;
};

/**
 * The expressions an attachment could actually resolve to.
 *
 * A ternary is unwrapped because each branch is independently the thing that gets attached, and
 * `WebcamStrip.svelte` has exactly that: one branch wraps and the other calls a factory. Checking
 * only the top-level node would see a `ConditionalExpression`, find no member expression, and pass.
 */
const attachmentCandidates = (
  expression: Record<string, unknown> | undefined
): (Record<string, unknown> | undefined)[] => {
  if (expression?.type === 'ConditionalExpression') {
    return [
      ...attachmentCandidates(expression.consequent as Record<string, unknown>),
      ...attachmentCandidates(expression.alternate as Record<string, unknown>)
    ];
  }
  return [expression];
};

const unboundReferences = (file: string) => {
  const source = readFileSync(new URL(file, SOURCE), 'utf8');
  const ast = parse(source, { modern: true });
  const found: string[] = [];

  const lineOf = (offset: number) => source.slice(0, offset).split('\n').length;

  const visit = (node: unknown) => {
    if (!node || typeof node !== 'object') return;
    const candidate = node as Record<string, unknown> & { type?: string };

    if (candidate.type === 'Attribute') {
      const value = candidate.value as unknown;
      // `foo={bar.baz}` parses to a single ExpressionTag whose expression is a MemberExpression.
      const tag = Array.isArray(value) ? value[0] : value;
      const expression = (tag as { type?: string; expression?: Record<string, unknown> })
        ?.expression;
      if ((tag as { type?: string })?.type === 'ExpressionTag') {
        const unbound = unboundMethodIn(expression);
        if (unbound) {
          found.push(
            `${file}:${lineOf(candidate.start as number)} — ${String(candidate.name)}={${unbound}} passes a METHOD by reference`
          );
        }
      }
    }

    /*
      ATTACHMENTS TOO, added 2026-08-18 — and the gap was real rather than theoretical.

      This file only ever looked at `Attribute` nodes, so `{@attach instance.method}` was invisible
      to it. That is the SAME failure in a different node type: the attach directive calls what it
      is given with the element, so a bare method reference reaches its first private-field read
      with `this` undefined and throws on mount. Every reason listed at the top of this file for why
      nothing else catches it applies unchanged — the types line up, eslint is happy, the autofixer
      has no opinion.

      Found while moving `app-webcam-holder` into `WebcamStrip.svelte`, which put two attach sites
      into a new file where `attachLocal` is the attachment itself and must be wrapped. Nothing in
      the toolchain would have reported it if that wrapping were dropped, so the gate is widened in
      the commit that created the exposure rather than after something breaks.
    */
    if (candidate.type === 'AttachTag') {
      for (const branch of attachmentCandidates(
        candidate.expression as Record<string, unknown> | undefined
      )) {
        const unbound = unboundMethodIn(branch);
        if (unbound) {
          found.push(
            `${file}:${lineOf(candidate.start as number)} — {@attach ${unbound}} passes a METHOD by reference`
          );
        }
      }
    }

    for (const key of Object.keys(candidate)) {
      if (key === 'parent') continue;
      const child = candidate[key];
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === 'object') visit(child);
    }
  };

  visit(ast.fragment);
  return found;
};

describe('no room-class method is ever passed as a prop by reference', () => {
  it('knows which properties are methods, so the guard is not a stale list', () => {
    // If a class stops exposing methods entirely this whole file goes vacuous, which is the same
    // failure `source-size-contract.test.ts` polices for the text readers.
    expect(methodNames(RoomDialogs), 'RoomDialogs should expose confirm()').toContain('confirm');
    expect(methodNames(RoomVolume)).toContain('toggleMute');
    expect(methodNames(RoomToasts)).toContain('show');
    // ...and that a getter is NOT mistaken for one, or every read would be reported.
    expect(methodNames(RoomVolume), 'volume is a getter and must not be flagged').not.toContain(
      'volume'
    );
  });

  it('lists every room class, so the map cannot go stale', () => {
    const listed = new Set(Object.values(INSTANCES).map((c) => c.name));
    const missing = [...exportedRoomClasses()].filter((name) => !listed.has(name));
    expect(
      missing,
      missing.join(', ') +
        ' is exported from lib/room/ but absent from INSTANCES, so this guard is blind to it. Add it — that is exactly how RoomBroadcasts slipped seven unbound methods past this file.'
    ).toEqual([]);
  });

  it('found Svelte files to inspect', () => {
    expect(svelteFiles.length).toBeGreaterThan(1);
  });

  it.each(svelteFiles)('%s passes no unbound method', (file) => {
    const offenders = unboundReferences(file);
    expect(
      offenders,
      `${offenders.join('\n')}\n\nA class method handed over as a value loses \`this\` and throws the first time it is called. svelte-check, eslint and the autofixer all pass on it. Wrap it instead: onthing={(a, b) => instance.method(a, b)}.`
    ).toEqual([]);
  });

  /*
    THE CONSEQUENCE, EXECUTED — because everything above this line is a source-text assertion, and a
    source-text assertion cannot prove that the thing it forbids is actually harmful.

    That mattered on 2026-08-16. `alerts-pane.ts` holds no rune, so it is a plain `.ts`, so the
    discovery above skipped it and the map did not name it, and `ondetachalerts={alertsPane.detach}`
    sat on the page reported by nothing. Thirteen props were in that state across two plain modules
    — Detach Alerts, Save, Archive, Open Transcript, Reopen, both scroll trackers, the four webcam
    attachments and the alert-filter save. Every one of them threw on the first click, in every room.

    So this runs the failure rather than describing it. If a future change makes an unbound pass
    harmless — a decorator, a bind in the constructor, a build step — this test goes GREEN in the
    wrong direction and says so, instead of the whole file quietly guarding nothing.
  */
  it('an unbound pass really does throw, which is what the rest of this file is for', () => {
    const pane = new RoomAlertsPane<{ createdAt: string; senderName: string; body: string }>({
      alerts: {} as never,
      dialogs: {} as never,
      prefs: {} as never,
      feeds: {} as never,
      alertsScroller: () => null,
      forceAlertsToBottom: () => {},
      sessionHandle: () => 'handle',
      setChatAlertsDetached: () => {}
    });
    /*
      Called through the instance it belongs to, the private-field read SUCCEEDS and execution
      carries on into `window.open`, which this environment does not have. That `ReferenceError` is
      the proof: it can only be reached by getting past `this.#detachedWindow`.
    */
    expect(() => pane.detach()).toThrow(ReferenceError);
    // Handed over as a value — which is exactly what `ondetachalerts={alertsPane.detach}` did.
    const handedOver = pane.detach;
    expect(() => handedOver()).toThrow(TypeError);
  });
});
