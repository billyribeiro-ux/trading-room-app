import {
  deleteDayTradeAlert,
  editDayTradeAlert,
  postDayTradeAlert
} from '../../routes/day-trade-alerts.remote';
import { deleteSwingAlert, editSwingAlert, postSwingAlert } from '../../routes/swing-alerts.remote';
import { DAY_TRADE_ALERT_INITIAL_DAYS, dayTradeAlertLogDays } from '#lib/day-trade-alerts.js';
import { SWING_ALERT_INITIAL_DAYS, swingAlertLogDays } from '#lib/swing-alerts.js';

import type { RoomDialogs } from './dialogs.svelte';

/**
 * The six fields both composers send, and the only part of a draft this class reads.
 *
 * `SwingAlertDraft` and `DayTradeAlertDraft` are field-for-field identical apart from the name of
 * their id key, and that is a READ fact rather than a convenience: the two models sit 248 bytes
 * apart in the same reference constructor (1,955,146 and 1,955,394) with the same eleven keys in the
 * same order, which `day-trade-alerts/draft.ts` records. `payload()` took a `SwingAlertDraft` and
 * a `DayTradeAlertDraft` in two functions with byte-identical bodies; it takes this instead.
 */
export interface TradeAlertDraftFields {
  symbol: string;
  /**
   * `'long'` or `'short'`, and nothing else — WIDENED TO `string` UNTIL 2026-08-30.
   *
   * The two radios offer exactly these two and both drafts already typed the field this way
   * (`SwingAlertDraft.direction: SwingAlertDirection`); this interface widened it back to `string`
   * on the way past, which cost nothing while the value was about to be stringified into a
   * `FormData` and costs the whole check now that it is handed to a command whose schema is
   * `z.enum(['long', 'short'])`. Narrowing it here means a third direction cannot reach the wire
   * without this line and the two schemas being changed together.
   */
  direction: TradeAlertDirection;
  entryPrice: string;
  stop: string;
  target: string;
  image: string;
}

/**
 * The one direction union both feeds send.
 *
 * `SwingAlertDirection` and `DayTradeAlertDirection` are two types in `#lib/types.ts` and stay two,
 * for the reason recorded there — they are two row templates and the day the server disagrees about
 * one of them is the day having one type stops being an accident. This alias is the shape of the
 * value crossing THIS boundary, where the two feeds share one class, and it is structurally
 * identical to both by construction rather than by import so that neither becomes the other's
 * definition.
 */
export type TradeAlertDirection = 'long' | 'short';

/**
 * EVERYTHING that differs between the swing feed and the day trade feed.
 *
 * The list is this short because it was measured rather than guessed. Folding the day trade
 * vocabulary onto the swing one and diffing the two halves of `+page.svelte` left **nine of
 * fourteen declarations byte-identical**, and of the five that differed, four differed only in
 * PROSE — the window number in a sentence, a cross-reference, a citation one half carried and the
 * other did not. The only CODE difference in 297 lines was the endpoint and the failure sentence.
 *
 * That measurement is what justifies one class with two instances instead of two classes. It CANNOT
 * be re-executed, because the duplicate it measured no longer exists — that was the point of the
 * slice — so what `trade-alerts.svelte.test.ts` asserts instead is the shape it justified: that
 * these four values are the whole of the difference, and that the two feeds disagree on all four.
 */
export interface TradeAlertFeed<Action extends string = string> {
  /** The GET that answers the current window. */
  endpoint: string;
  /** The sentence raised when that GET is not ok. Different per feed, and deliberately so. */
  loadFailure: string;
  /** The window the page load always answers, before the presenter changes it. */
  initialDays: number;
  /**
   * Months to days. Transcribed per feed in `#lib/swing-alerts` and `$lib/day-trade-alerts`,
   * where they are tested — the two do NOT agree, and neither is `months * 30`.
   */
  logDays: (months: number) => number;
  /**
   * THE FIFTH DIFFERENCE, added when the six actions became remote commands.
   *
   * It belongs on the descriptor for the same reason `endpoint` does: it is the one thing about a
   * mutation that differs between the two feeds. `RoomTradeAlerts.submit` used to build its own
   * endpoint from the action name — ``fetch(`?/${action}`)`` — so the descriptor did not need to
   * carry anything about writes at all, and that was precisely the defect: the name was assembled
   * at runtime and connected to nothing.
   *
   * Each implementation dispatches over IMPORTED COMMANDS, so deleting one of the six is a build
   * error at the line that calls it.
   */
  send: (action: Action, values: TradeAlertMutationValues) => Promise<unknown>;
}

/**
 * What a composer hands `submit`: the six draft fields on a create, those plus the row id on an
 * edit, and the row id alone on a delete.
 *
 * ## Why it is one optional-field shape rather than a discriminated union
 *
 * Because there is no discriminant available. The six call sites are prop callbacks inside
 * `PresentationArea.svelte` calling `submit` on an INSTANCE, so `Action` is a class type parameter
 * fixed at construction rather than a literal TypeScript can read off the call — which is exactly
 * the difference from `RoomNotes.submitMutation`, whose call sites do name literals and which
 * therefore types each payload against its own command.
 *
 * What it is NOT any more is `Record<string, string | number>`. Every key is named, `direction`
 * carries its union rather than `string`, and the two id keys are separate — so a Day Trade
 * composer cannot hand a `swingAlertID` to a Swing command and have it silently ignored, which the
 * open record allowed.
 *
 * The strict zod schemas still run on the SERVER and are still the authority. Nothing typed here is
 * trusted there.
 */
export interface TradeAlertMutationValues {
  symbol?: string;
  direction?: TradeAlertDirection;
  entryPrice?: string;
  stop?: string;
  target?: string;
  image?: string;
  /** The Swing row being edited or deleted. `swingAlertID` is the wire's own name. */
  swingAlertID?: number;
  /** The Day Trade row being edited or deleted. `dayTradeAlertID` is the wire's own name. */
  dayTradeAlertID?: number;
}

/**
 * The six draft fields, taken off the values map — and REFUSED LOUDLY if one is absent.
 *
 * The form actions read these with `String(formData.get('symbol') ?? '')`, defaulting a missing
 * field to the empty string so the schema could refuse it on the server. That indirection is gone:
 * a create or an edit that reaches this function without all six is not a user typing something
 * wrong, it is a call site that forgot a field, and `?? ''` would turn that into *"That swing alert
 * is not valid."* three hundred milliseconds later on a different machine.
 *
 * No trimming and no other coercion, deliberately: the schema trims, bounds and refuses, and doing
 * any of that twice in two places is how the two get to disagree. That is the note the server-side
 * reader carried, and it travels with the reader.
 */
function draftFrom(values: TradeAlertMutationValues): TradeAlertDraftFields {
  const { symbol, direction, entryPrice, stop, target, image } = values;
  if (
    symbol === undefined ||
    direction === undefined ||
    entryPrice === undefined ||
    stop === undefined ||
    target === undefined ||
    image === undefined
  ) {
    throw new Error('A trade alert must carry all six composer fields.');
  }
  return { symbol, direction, entryPrice, stop, target, image };
}

/**
 * The row id an edit or a delete names, or a loud refusal when the caller sent the other feed's.
 *
 * `Number(formData.get('swingAlertID'))` is what this was, and it answered `NaN` for an absent id —
 * which the schema then refused. The refusal still happens on the server for a value the composer
 * can really produce: the edit call site sends `draft.swingAlertID ?? 0`, and
 * `z.number().int().positive()` refuses `0` rather than letting it reach a WHERE clause to match
 * nothing. What is refused HERE is the different failure of a Swing composer reaching a Day Trade
 * command, which no server schema can see because the field it needs simply is not there.
 */
function idFrom(values: TradeAlertMutationValues, key: 'swingAlertID' | 'dayTradeAlertID'): number {
  const id = values[key];
  if (id === undefined) throw new Error(`A trade alert mutation must carry ${key}.`);
  return id;
}

/** The three swing form actions, which are the wire command names. */
export type SwingAlertAction = 'swingAlertMsg' | 'editSwingAlertMsg' | 'deleteSwingAlertMsg';
/** The three day trade form actions, which are the wire command names. */
export type DayTradeAlertAction =
  'dayTradeAlertMsg' | 'editDayTradeAlertMsg' | 'deleteDayTradeAlertMsg';

export const SWING_ALERT_FEED: TradeAlertFeed<SwingAlertAction> = {
  endpoint: '/api/swing-alerts',
  loadFailure: 'Unable to load swing trade alerts.',
  initialDays: SWING_ALERT_INITIAL_DAYS,
  logDays: swingAlertLogDays,
  /*
    The three Swing commands, dispatched over IMPORTED SYMBOLS.

    This replaced ``fetch(`?/${action}`)`` inside `submit`. A `switch` and not a lookup table,
    because the switch is what makes the union exhaustive to the compiler: add a fourth member to
    `SwingAlertAction` and this function stops returning on every path, which is a build error at
    the place that has to grow a case. A table typed `Record<SwingAlertAction, …>` would say the
    same thing, but only for the KEYS — nothing would connect a key to the command it must call.
  */
  send: (action, values) => {
    switch (action) {
      case 'swingAlertMsg':
        return postSwingAlert(draftFrom(values));
      case 'editSwingAlertMsg':
        return editSwingAlert({
          ...draftFrom(values),
          swingAlertID: idFrom(values, 'swingAlertID')
        });
      case 'deleteSwingAlertMsg':
        return deleteSwingAlert({ swingAlertID: idFrom(values, 'swingAlertID') });
    }
  }
};

export const DAY_TRADE_ALERT_FEED: TradeAlertFeed<DayTradeAlertAction> = {
  endpoint: '/api/day-trade-alerts',
  loadFailure: 'Unable to load day trade alerts.',
  initialDays: DAY_TRADE_ALERT_INITIAL_DAYS,
  logDays: dayTradeAlertLogDays,
  /* The Day Trade three, and a SEPARATE module behind them — see `day-trade-alerts.remote.ts`. */
  send: (action, values) => {
    switch (action) {
      case 'dayTradeAlertMsg':
        return postDayTradeAlert(draftFrom(values));
      case 'editDayTradeAlertMsg':
        return editDayTradeAlert({
          ...draftFrom(values),
          dayTradeAlertID: idFrom(values, 'dayTradeAlertID')
        });
      case 'deleteDayTradeAlertMsg':
        return deleteDayTradeAlert({ dayTradeAlertID: idFrom(values, 'dayTradeAlertID') });
    }
  }
};

/*
  One trade alert feed: its log, the window it is showing, its three mutations and its two image
  paths. Instantiated TWICE — once for swing, once for day trade.

  Phase 5 slice 15. This is the slice that removes a duplicate rather than moving one, which is the
  `RoomLogPages` precedent: two near-identical fourteen-declaration features whose difference is a
  descriptor. 297 lines left `+page.svelte` and roughly half that arrived here, because the second
  copy simply stops existing.

  ## The sameness is measured, not assumed

  See `TradeAlertFeed` above. Nine of fourteen pairs are byte-identical once the vocabulary is
  folded; the only code difference across the whole 297 lines is the endpoint and the failure
  sentence. Both halves were read end to end before this class was written. That diff CANNOT
  be re-executed now: the duplicate it measured is gone, which is what the slice was for.

  ## The log is a SEED, not a thunk, and that is the opposite of `RoomFiles`

  `RoomFiles` takes `files` and `sessData` as thunks precisely so they keep following `data`.
  This class takes its log as a one-time constructor value precisely so it STOPS following it: the
  page load always answers one fixed window, so a value that tracked `data` would throw away the
  presenter's chosen months window on the next `invalidateAll()`. The field note says so at length,
  and the difference between the two classes is deliberate rather than an inconsistency.

  ## The entitlement IS a thunk, for the same reason `filesHidden` is a getter

  `enabled` reads the room's configuration fresh, so a room whose configuration is re-read
  mid-session cannot leave the tab showing after the owner turned the feature off.

  ## `payload()` is one method where the page had two byte-identical functions

  `swingAlertPayload` and `dayTradeAlertPayload` returned the same six draft fields and differed
  only in the type of their parameter. See `TradeAlertDraftFields`.
*/
export class RoomTradeAlerts<Row, Action extends string> {
  readonly #dialogs: RoomDialogs;
  readonly #feed: TradeAlertFeed<Action>;
  readonly #enabled: () => boolean;
  readonly #uploadImages: (files: readonly File[]) => Promise<readonly string[]>;
  #log: readonly Row[];
  #days: number;
  #imageUpload: { resolve: (url: string | null) => void } | null;
  #imagePaste: { file: File; previewUrl: string; resolve: (url: string | null) => void } | null;

  constructor(options: {
    dialogs: RoomDialogs;
    feed: TradeAlertFeed<Action>;
    /** The page load's ONE-TIME seed. Not a thunk — see the note on the field. */
    seed: readonly Row[];
    /** The per-room entitlement, read fresh on every access. */
    enabled: () => boolean;
    /** `uploadAlertFiles` — shared with the other trade alert form and the chat composer. */
    uploadImages: (files: readonly File[]) => Promise<readonly string[]>;
  }) {
    this.#dialogs = options.dialogs;
    this.#feed = options.feed;
    this.#enabled = options.enabled;
    this.#uploadImages = options.uploadImages;

    /**
     * `globals.swingAlertsLog` / `globals.dayTradeAlertsLog`.
     *
     * `$state.raw` because it is only ever REPLACED — by the page load's seed and by
     * `refresh()` — and never mutated in place. A deep proxy over a list of a few hundred
     * rows would cost on every read of every cell and buy nothing.
     *
     * Seeded from `data.swingAlerts` / `data.dayTradeAlerts` and thereafter owned here. It
     * deliberately does NOT track that value afterwards: the load always answers ONE fixed window —
     * 42 days for swing, 21 for day trade — so a `$derived` would throw away the presenter's chosen
     * months window the next time anything else on the page called `invalidateAll()`. Every mutation
     * refetches this list itself instead.
     *
     * A CONSTRUCTOR SEED rather than a thunk, and that is the deliberate difference from
     * `RoomFiles`, where `files` and `sessData` cross as thunks precisely so they keep following
     * `data`. Here the whole point of the field is that it STOPS following it after the first value,
     * so a thunk would reintroduce the bug the note above describes.
     *
     * `svelte-ignore state_referenced_locally` is not needed HERE, because the seed arrives as a
     * parameter rather than as a `$props()` read — but the deliberate one-time read did not go
     * away, it MOVED to the construction site, and the suppression and its reason moved with it.
     */
    this.#log = $state.raw<readonly Row[]>(options.seed);

    /** The window currently displayed, so a refetch after a mutation asks for the same one. */
    this.#days = $state(this.#feed.initialDays);

    /** A pending image upload for this feed's form, and its `resolve`. `imgUpload(feed)`. */
    this.#imageUpload = $state.raw<{ resolve: (url: string | null) => void } | null>(null);

    /** A pasted image awaiting the confirmation `onImagePaste` shows before uploading. */
    this.#imagePaste = $state.raw<{
      file: File;
      previewUrl: string;
      resolve: (url: string | null) => void;
    } | null>(null);
  }

  /**
   * `hasSwingTradeAlerts` / `hasDayTradeAlerts` — the per-room entitlement, gating the nav item
   * AND the pane.
   *
   * Read fresh rather than copied into a field, so a room whose configuration is re-read mid-session
   * cannot leave the tab showing after the owner turned the feature off. The reference reads it once
   * in `ngOnInit` (byte 1,955,967 for the day trade half) and therefore does NOT react; reacting is
   * the safer direction of that divergence and costs nothing.
   *
   * A getter over a thunk rather than a `$derived` field, for the reason `RoomFiles.filesHidden`
   * records: a derived class field initialises before the constructor assigns the thunk it reads.
   */
  get enabled(): boolean {
    return this.#enabled();
  }

  get log(): readonly Row[] {
    return this.#log;
  }

  get imageUpload() {
    return this.#imageUpload;
  }

  get imagePaste() {
    return this.#imagePaste;
  }

  /**
   * The upload dialog was dismissed without choosing a file.
   *
   * A receiver rather than a setter, because it is TWO writes that must happen together: the waiting
   * promise is resolved with `null` and the pending record is cleared. The page did both inline in
   * the dialog's `onclose`, where a caller holding a setter could do one of them and leave a
   * composer waiting forever on a promise nothing will ever settle.
   */
  cancelImageUpload(): void {
    this.#imageUpload?.resolve(null);
    this.#imageUpload = null;
  }

  /**
   * `getSwingAlertsLog` / `getDayTradeAlertsLog` — refetch the log for the current window.
   *
   * A plain GET rather than a form action, for the reason `loadNoteVersions` gives: this changes
   * nothing, so it must not go through `invalidateAll()` and re-run every load function on the page
   * to answer a question about one table.
   */
  async refresh(): Promise<void> {
    const response = await fetch(`${this.#feed.endpoint}?days=${this.#days}`);
    if (!response.ok) throw new Error(this.#feed.loadFailure);
    this.#log = (await response.json()) as readonly Row[];
  }

  /**
   * The three mutations of whichever feed this instance is. Named for the wire commands, which
   * are the action names.
   *
   * ## What this was
   *
   * ``fetch(`?/${action}`)`` with a hand-built `FormData` body and a `deserialize()` of the
   * response, over an exported type alias of three action names. Nothing connected the endpoint to
   * the action it reached — the string was assembled while the page ran — so deleting one of the
   * six actions would have left this compiling and silently doing nothing, which is what
   * `presenterCommand` did for three commits with every gate green.
   *
   * The dispatch is `feed.send` now, and every arm of it names an imported command. One `fetch`
   * became six symbols the compiler can see.
   *
   * ## The failure path, which is where the old shape leaked
   *
   * A form action answered with a discriminated union the caller had to remember to inspect, and
   * the three branches below re-raised it as `'Unable to save.'` — a sentence that replaced whatever
   * the server actually said. A command rejects with its own `error(…)`, so the 404 *"That swing
   * alert was not found."*, the 404 *"Swing Trade Alerts are not enabled for this room."* and the
   * 429 all reach `SwingAlertsPane`'s `catch` intact instead of being flattened into one string.
   *
   * ## Still no `invalidateAll()`, unlike `RoomNotes.submitMutation`
   *
   * The only page data these change is THIS feed's log, and re-running every load function would
   * additionally reset it to the window the load always returns — 42 days for swing, 21 for day
   * trade. The explicit refetch below keeps the presenter's chosen window. It runs only on success,
   * because a rejection propagates past it.
   */
  async submit(action: Action, values: TradeAlertMutationValues): Promise<void> {
    await this.#feed.send(action, values);
    await this.refresh();
  }

  payload(draft: TradeAlertDraftFields): TradeAlertDraftFields {
    return {
      symbol: draft.symbol,
      direction: draft.direction,
      entryPrice: draft.entryPrice,
      stop: draft.stop,
      target: draft.target,
      image: draft.image
    };
  }

  /** `onTradeAlertWeeksChange('Swing' | 'DayTrade')` — clear the list, then refetch the window. */
  async changeMonths(months: number): Promise<void> {
    this.#days = this.#feed.logDays(months);
    /*
      The reference empties `globals.swingAlertsLog` / `globals.dayTradeAlertsLog` BEFORE sending
      the command — byte 1,993,666 for the day trade half — so the list is blank while the refetch
      is in flight rather than showing the previous window under the new label. Reproduced,
      including the flash of the empty-state heading that comes with it.
    */
    this.#log = [];
    await this.refresh();
  }

  requestImageUpload(): Promise<string | null> {
    return new Promise((resolve) => {
      this.#imageUpload = { resolve };
    });
  }

  async completeImageUpload(files: readonly File[]): Promise<void> {
    const pending = this.#imageUpload;
    this.#imageUpload = null;
    if (!pending) return;
    /*
      One file. The reference's own dialog sets `multiple='false'`; `ImageUploadDialog` is shared
      with the chat composer, which does allow several, so the extras are dropped here rather than
      by forking the component.
    */
    const [file] = files;
    if (!file) {
      pending.resolve(null);
      return;
    }
    try {
      const [url] = await this.#uploadImages([file]);
      pending.resolve(url ?? null);
    } catch (error) {
      console.error(error);
      this.#dialogs.alert = 'Upload Failed...';
      pending.resolve(null);
    }
  }

  /**
   * `onImagePaste(event, 'swing' | 'dayTrade')` — confirm the pasted image, then upload it.
   *
   * The object URL is created for the confirmation's preview and revoked when the dialog closes,
   * whichever way it closes. Leaking one per paste would pin the image bytes for the life of the
   * tab.
   */
  requestImagePaste(file: File): Promise<string | null> {
    return new Promise((resolve) => {
      this.#imagePaste = { file, previewUrl: URL.createObjectURL(file), resolve };
    });
  }

  closeImagePaste(): { file: File; resolve: (url: string | null) => void } | null {
    const pending = this.#imagePaste;
    this.#imagePaste = null;
    if (!pending) return null;
    URL.revokeObjectURL(pending.previewUrl);
    return { file: pending.file, resolve: pending.resolve };
  }

  async confirmImagePaste(): Promise<void> {
    const pending = this.closeImagePaste();
    if (!pending) return;
    try {
      const [url] = await this.#uploadImages([pending.file]);
      pending.resolve(url ?? null);
    } catch (error) {
      console.error(error);
      this.#dialogs.alert = 'Upload Failed...';
      pending.resolve(null);
    }
  }
}
