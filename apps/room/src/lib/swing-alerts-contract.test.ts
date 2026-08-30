import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { render } from 'svelte/server';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { swingAlerts, users, type User } from '#lib/server/db/schema.js';
import { callRemote } from '#lib/server/remote-command-harness.js';
import SwingAlertsPane from './components/swing-alerts/SwingAlertsPane.svelte';
import {
  SWING_ALERT_COMMANDS,
  SWING_ALERT_PUSH_COMMANDS,
  formatSwingAlertTxt,
  limitSwingLogs,
  searchSwingLogs,
  swingAlertsTabVisible
} from './swing-alerts';
import type { SwingAlertRow } from './types';
import type { TradeAlertDraftFields as SwingAlertDraftFields } from './room/trade-alerts.svelte';

/**
 * Swing Trade Alerts — the things that would regress SILENTLY.
 *
 * Not a re-description of the feature. Each block below guards something whose failure produces no
 * error, no type complaint and no visual difference until somebody in a live room notices:
 *
 *   1. the wire command names — a wrong one is a request the server rejects, and the trap here is
 *      documented: `newSwingAlertMsg` is NOT the create command;
 *   2. the verbatim placeholders — they are the only labels four of the five inputs have;
 *   3. the two comparators — `limitSwingLogs(rows, 0)` returning `[]` is one `||` away from
 *      returning everything, and `searchSwingLogs` matches two fields, not one;
 *   4. the entitlement — false must emit NOTHING, not hidden markup;
 *   5. `formatSwingAlertTxt` — two strings in it look like typos and are not.
 */

function row(overrides: Partial<SwingAlertRow> = {}): SwingAlertRow {
  return {
    id: 1,
    symbol: 'AAPL',
    direction: 'long',
    entryDate: '2026-07-30T12:00:00.000Z',
    entryPrice: '123.57',
    stop: '120.40',
    target: '138.75',
    image: '',
    senderName: 'Dana Vero',
    senderPic: '',
    senderAvt: 'abc123',
    ...overrides
  };
}

function renderPane(props: {
  hasSwingTradeAlerts: boolean;
  isPresenter: boolean;
  alerts?: readonly SwingAlertRow[];
}): string {
  return render(SwingAlertsPane, {
    props: {
      alerts: props.alerts ?? [],
      hasSwingTradeAlerts: props.hasSwingTradeAlerts,
      isPresenter: props.isPresenter,
      sessionHandle: '3625',
      onCreate: () => undefined,
      onDelete: () => undefined,
      onEdit: () => undefined,
      onMonthsChange: () => undefined,
      onPasteImage: async () => null,
      onUploadImage: async () => null
    }
  }).body;
}

/*
  THE CONTROLLER, stubbed at the module boundary — the same shape `scheduled-alert-contract.test.ts`
  uses, and for the same reason: the entitlement these commands re-ask on every write is a call to
  the controller, and a room without one is not a room this test can construct.

  `controller.settings` is written per test rather than fixed, because the ENTITLEMENT BEING FALSE
  is itself one of the behaviours under test.
*/
const controller = { settings: {} as Record<string, unknown> };

vi.mock('#lib/server/room-config-client.js', () => ({
  RoomConfigUnavailable: class RoomConfigUnavailable extends Error {},
  readRoomConfig: async (_key: object, shortCode: string, email?: string) => ({
    room: {
      shortCode,
      name: `Room ${shortCode}`,
      state: 'open',
      logoUrl: null,
      publicId: null,
      maxUsers: 0
    },
    settings: controller.settings,
    locked: [],
    member: {
      displayName: 'stub',
      email: email ?? '',
      role: 2,
      nonPresenter: false,
      isP: false,
      isNonPresenterAdmin: false,
      isFT: false,
      denyArchivesAccess: false,
      restrictPmUser: false,
      muted: false,
      banned: false,
      permissions: {
        hasMic: false,
        hasScreen: false,
        hasCam: false,
        hasAdminChat: false,
        canEditNotes: false
      }
    }
  })
}));

const { deleteSwingAlert, editSwingAlert, postSwingAlert } =
  await import('../routes/swing-alerts.remote');

/** The room these alerts belong to. Taken from the SESSION by every command; never an argument. */
const ROOM = '3625';

function account(email: string, role: string): User {
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return existing;
  return db
    .insert(users)
    .values({
      displayName: `swing contract ${role}`,
      email,
      role,
      passwordHash: 'scrypt$00$00',
      createdAt: new Date()
    })
    .returning()
    .get();
}

/** A valid composer payload. Every field is required by the schema, so none of them is optional. */
const draft = (overrides: Partial<SwingAlertDraftFields> = {}): SwingAlertDraftFields => ({
  symbol: 'AAPL',
  direction: 'long',
  entryPrice: '123.57',
  stop: '120.40',
  target: '138.75',
  image: '',
  ...overrides
});

const as = <T>(user: User, run: () => T | Promise<T>) =>
  callRemote({ user, sessionId: 'swing-alerts-contract', roomShortCode: ROOM } as App.Locals, run);

let presenter: User;
let member: User;
/**
 * A presenter used ONLY by the rate-limit test.
 *
 * `consumeRateLimit` is module state keyed by `alert:<userId>` and there is no reset between test
 * files, so exhausting the bucket for the presenter above would make every later create in this
 * file fail for a reason that has nothing to do with what it is asserting.
 */
let spender: User;

beforeAll(() => {
  ensureDatabase();
  presenter = account('swing-alerts-presenter@example.test', 'staff');
  member = account('swing-alerts-member@example.test', 'member');
  spender = account('swing-alerts-spender@example.test', 'staff');
});

beforeEach(() => {
  db.delete(swingAlerts).run();
  controller.settings = {};
});

describe('the wire vocabulary', () => {
  /*
    The whole reason this file exists. Two independent decodes of the bundle had to correct the
    create command, because `newSwingAlertMsg` reads like the obvious name for "make a new one" and
    is in fact a payload KEY on the edit command and, separately, the server->client push.
  */
  it('creates with `swingAlertMsg`, never with `newSwingAlertMsg`', () => {
    expect(SWING_ALERT_COMMANDS.create).toBe('swingAlertMsg');
    expect(SWING_ALERT_COMMANDS.create).not.toBe('newSwingAlertMsg');
    // The name is not unused — it belongs to the push, and the two must not be merged.
    expect(SWING_ALERT_PUSH_COMMANDS.created).toBe('newSwingAlertMsg');
  });

  it('names the log, edit and delete commands exactly', () => {
    expect(SWING_ALERT_COMMANDS.log).toBe('getSwingAlertsLog');
    expect(SWING_ALERT_COMMANDS.edit).toBe('editSwingAlertMsg');
    expect(SWING_ALERT_COMMANDS.delete).toBe('deleteSwingAlertMsg');
  });

  it('mirrors into the alerts feed with `alertMsg` and `editAlertMessageSwing`', () => {
    /*
      A swing submit sends TWO commands (bundle byte 1,983,136). `editAlertMessageSwing` is shared
      verbatim with the Day Trade path, which differs only in the boolean it sends — so when Day
      Trade is ported it reuses this name rather than inventing `editAlertMessageDayTrade`.
    */
    expect(SWING_ALERT_COMMANDS.mirrorCreate).toBe('alertMsg');
    expect(SWING_ALERT_COMMANDS.mirrorEdit).toBe('editAlertMessageSwing');
  });

  /*
    REWRITTEN, not re-pointed, when the three became remote commands on 2026-08-30.

    This block asserted that `+page.server.ts` contained the literal
    `\n  ${command}: async ({ request, locals }) => {` for each of the three names. That was the best
    available check while the endpoint was a string the client built at runtime — the whole point was
    that nothing else connected the two — and it is the wrong check now, for two reasons.

    First, it no longer proves anything the compiler does not: `trade-alerts.svelte.ts` imports
    `postSwingAlert`, `editSwingAlert` and `deleteSwingAlert` by name, so a renamed command is a
    build error before any test runs. Second, and this is the reason it is REWRITTEN rather than
    deleted, a text assertion about where a command LIVES has never been able to say whether it RUNS.
    Re-pointing it at `swing-alerts.remote.ts` would have kept a green tick over a question nobody
    was asking any more.

    So the three names are now proven by CALLING them. `SWING_ALERT_COMMANDS` is still the single
    place the vocabulary is written, and it is still what the assertions name — `SWING_ALERT_COMMANDS.create`
    is the sentence *"the create command is the one this exported constant names"*, which is exactly
    what it meant before, now answered by a row in the database instead of by a substring.
  */
  it('creates, edits and deletes a row through the three commands the constant names', async () => {
    expect([
      SWING_ALERT_COMMANDS.create,
      SWING_ALERT_COMMANDS.edit,
      SWING_ALERT_COMMANDS.delete
    ]).toEqual(['swingAlertMsg', 'editSwingAlertMsg', 'deleteSwingAlertMsg']);

    controller.settings = { hasSwingTradeAlerts: true };

    await as(presenter, () => postSwingAlert(draft({ symbol: 'AAPL' })));
    const created = db.select().from(swingAlerts).all();
    expect(created).toHaveLength(1);
    expect(created[0].symbol).toBe('AAPL');
    // Taken from the SESSION, never from the payload — a client-supplied author is a client-supplied
    // identity, and there is no field on the schema that could carry one.
    expect(created[0].senderName).toBe(presenter.displayName);

    await as(presenter, () =>
      editSwingAlert({ ...draft({ symbol: 'MSFT' }), swingAlertID: created[0].id })
    );
    expect(db.select().from(swingAlerts).all()[0].symbol).toBe('MSFT');

    await as(presenter, () => deleteSwingAlert({ swingAlertID: created[0].id }));
    // A SOFT delete: the row stays and `deletedAt` is set, because the feed mirror needs the record.
    expect(db.select().from(swingAlerts).all()[0].deletedAt).not.toBeNull();
  });

  it('refuses a member on all three, and a room without the entitlement on all three', async () => {
    /*
      TWO gates, and neither is the browser's. The composer is inside `{#if isPresenter}` in the pane
      and the whole tab is behind the entitlement, and a hidden control has never been an
      authorization decision here.

      The entitlement answers 404 rather than 403 deliberately: in a room without the feature it does
      not exist, and *"forbidden"* would confirm that it exists somewhere and this member is not
      allowed it.
    */
    controller.settings = { hasSwingTradeAlerts: true };
    await as(presenter, () => postSwingAlert(draft({ symbol: 'AAPL' })));
    const [row] = db.select().from(swingAlerts).all();

    for (const [name, run] of [
      [SWING_ALERT_COMMANDS.create, () => postSwingAlert(draft({ symbol: 'HACK' }))],
      [
        SWING_ALERT_COMMANDS.edit,
        () => editSwingAlert({ ...draft({ symbol: 'HACK' }), swingAlertID: row.id })
      ],
      [SWING_ALERT_COMMANDS.delete, () => deleteSwingAlert({ swingAlertID: row.id })]
    ] as const) {
      await expect(as(member, run), `${name} must refuse a member`).rejects.toMatchObject({
        status: 403
      });
    }

    controller.settings = {};
    for (const [name, run] of [
      [SWING_ALERT_COMMANDS.create, () => postSwingAlert(draft({ symbol: 'HACK' }))],
      [
        SWING_ALERT_COMMANDS.edit,
        () => editSwingAlert({ ...draft({ symbol: 'HACK' }), swingAlertID: row.id })
      ],
      [SWING_ALERT_COMMANDS.delete, () => deleteSwingAlert({ swingAlertID: row.id })]
    ] as const) {
      await expect(
        as(presenter, run),
        `${name} must refuse a room without the entitlement`
      ).rejects.toMatchObject({ status: 404 });
    }

    // Nothing was created and nothing was destroyed by any of the six refusals.
    const after = db.select().from(swingAlerts).all();
    expect(after).toHaveLength(1);
    expect(after[0].symbol).toBe('AAPL');
    expect(after[0].deletedAt).toBeNull();
  });

  /*
    The create action posts into the MAIN alerts feed as its second write, so without the limiter it
    is a way to spam that feed at whatever rate the network allows, straight past the one guarding
    the composer. This action shipped WITHOUT it and the omission was found by re-reading a diff, not
    by a test — `day-trade-alerts-contract.test.ts` grew the check first, reading the source, and it
    is behavioural on both sides now.
  */
  it('spends the alert rate limit on the create, and only on the create', async () => {
    controller.settings = { hasSwingTradeAlerts: true };

    /*
      The bucket is spent until it refuses. `consumeRateLimit` is module state keyed by
      `alert:<userId>`, so this presenter is used by no other test in this file and the loop stops on
      the first refusal rather than assuming a limit this test would then have to restate.
    */
    let refusal: unknown = null;
    for (let attempt = 0; attempt < 200 && refusal === null; attempt++) {
      refusal = await as(spender, () => postSwingAlert(draft({ symbol: 'AAPL' }))).then(
        () => null,
        (caught: unknown) => caught
      );
    }
    expect(refusal, 'the create is not rate limited at all').toMatchObject({ status: 429 });

    /* …and the edit and the delete are NOT, on the same exhausted bucket. */
    const [row] = db.select().from(swingAlerts).all();
    await expect(
      as(spender, () => editSwingAlert({ ...draft({ symbol: 'MSFT' }), swingAlertID: row.id }))
    ).resolves.toBeUndefined();
    await expect(
      as(spender, () => deleteSwingAlert({ swingAlertID: row.id }))
    ).resolves.toBeUndefined();
  });
});

describe('the comparators', () => {
  it('limits to zero rows when the limit is zero, rather than to all of them', () => {
    // `e && 0 !== i ? e.slice(0, i) : []`. `rows.slice(0, limit || rows.length)` is the tempting
    // rewrite and it inverts this.
    expect(limitSwingLogs([row(), row({ id: 2 })], 0)).toEqual([]);
    expect(limitSwingLogs([row(), row({ id: 2 })], 1)).toHaveLength(1);
    expect(limitSwingLogs([row(), row({ id: 2 })], 10)).toHaveLength(2);
  });

  it('searches the symbol OR the sender name, lowercased, and keeps everything for an empty term', () => {
    const rows = [row(), row({ id: 2, symbol: 'MSFT', senderName: 'Sam Kite' })];

    expect(searchSwingLogs(rows, 'aapl')).toHaveLength(1);
    expect(searchSwingLogs(rows, 'AAPL')).toHaveLength(1);
    // The sender arm is the one a symbol-only rewrite would drop.
    expect(searchSwingLogs(rows, 'kite')).toHaveLength(1);
    expect(searchSwingLogs(rows, '')).toHaveLength(2);
    expect(searchSwingLogs(rows, 'nothing')).toHaveLength(0);
  });
});

describe('the entitlement', () => {
  it('renders NOTHING when the room does not have the feature', () => {
    const body = renderPane({ hasSwingTradeAlerts: false, isPresenter: true });

    // Not "hidden" and not empty-ish: no element of any kind survives. SSR leaves comment anchors
    // behind, so those are stripped before the assertion rather than asserted away one by one.
    expect(body.replace(/<!--[\s\S]*?-->/g, '').trim()).toBe('');
    expect(body).not.toContain('swing-alerts-container');
    expect(body).not.toContain('swingAlert-symbol');
    expect(body).not.toContain('Latest Swing Trade Alerts');
  });

  it('agrees with the gate an absent setting produces', () => {
    expect(swingAlertsTabVisible({})).toBe(false);
    expect(swingAlertsTabVisible({ hasSwingTradeAlerts: false })).toBe(false);
    expect(swingAlertsTabVisible({ hasSwingTradeAlerts: true })).toBe(true);
  });

  it('renders the pane, and only the presenter gets the form', () => {
    const presenter = renderPane({ hasSwingTradeAlerts: true, isPresenter: true });
    const member = renderPane({ hasSwingTradeAlerts: true, isPresenter: false });

    // A substring, not a whole `class="…"`: Svelte appends its own scoping class, so the attribute
    // reads `m-2 mx-auto swing-alert-form svelte-xxxxxx`.
    expect(presenter).toContain('swing-alert-form');
    expect(presenter).toContain('Latest Swing Trade Alerts (Last');
    // A member sees the whole list surface and none of the composer.
    expect(member).not.toContain('swing-alert-form');
    expect(member).toContain('Latest Swing Trade Alerts (Last');
  });
});

describe('the form, verbatim', () => {
  const body = renderPane({ hasSwingTradeAlerts: true, isPresenter: true });

  it('carries the five placeholders exactly as captured', () => {
    expect(body).toContain('placeholder="AAPL"');
    expect(body).toContain('placeholder="123.57"');
    expect(body).toContain('placeholder="120.40"');
    expect(body).toContain('placeholder="138.75"');
    expect(body).toContain(
      'placeholder="Upload Image or Paste Image Link / Screenshot (optional)"'
    );
  });

  it('keeps the three price fields as text inputs', () => {
    /*
      The single most likely "improvement" to this form, and it changes the keyboard, the validation
      and the locale handling of the decimal separator on a field whose value is stored verbatim.
    */
    for (const id of ['swingAlert-entryPrice', 'swingAlert-stop', 'swingAlert-target']) {
      expect(body).toContain(`type="text" id="${id}"`);
    }
    expect(body).not.toContain('type="number" id="swingAlert-entryPrice"');
  });

  it('offers exactly the two directions, defaulting to long', () => {
    expect(body).toContain('id="swingAlert-long"');
    expect(body).toContain('id="swingAlert-short"');
    expect(body).toContain('class="form-check-label text-success font-weight-bold"');
    expect(body).toContain('class="form-check-label text-danger font-weight-bold"');
  });

  it('shows the create-mode buttons, not the edit-mode ones', () => {
    // `cwe` + `uwe`. The edit labels are `Discard ` with a TRASH icon and `Save Changes `; an
    // earlier decode had the edit-mode word and the icon index both wrong.
    expect(body).toContain('Cancel');
    expect(body).toContain('Submit Alert');
    expect(body).not.toContain('Save Changes');
    expect(body).not.toContain('Discard');
  });
});

describe('the log surface', () => {
  it('shows the empty-state heading when the unfiltered log is empty', () => {
    const body = renderPane({ hasSwingTradeAlerts: true, isPresenter: false });
    expect(body).toContain('No Swing Trade Alerts to display.');
  });

  it('renders the eight headers in the captured order once there are rows', () => {
    const body = renderPane({
      hasSwingTradeAlerts: true,
      isPresenter: false,
      alerts: [row()]
    });

    const headers = [...body.matchAll(/<th>([^<]*)<\/th>/g)].map((match) => match[1]);
    expect(headers).toEqual([
      'Symbol',
      'Long/Short',
      'Alert Date',
      'Entry Price',
      'Stop',
      'Target',
      'Image',
      'Sender'
    ]);
    expect(body).not.toContain('No Swing Trade Alerts to display.');
  });

  it('gives the row buttons and the symbol container to a presenter only', () => {
    const presenter = renderPane({
      hasSwingTradeAlerts: true,
      isPresenter: true,
      alerts: [row()]
    });
    const member = renderPane({ hasSwingTradeAlerts: true, isPresenter: false, alerts: [row()] });

    expect(presenter).toContain('swing-alert-btn-delete');
    expect(presenter).toContain('swing-alert-btn-edit');
    expect(presenter).toContain('swing-symbol-container');
    expect(member).not.toContain('swing-alert-btn-delete');
    expect(member).not.toContain('swing-alert-btn-edit');
    expect(member).not.toContain('swing-symbol-container');
  });

  it('prints the direction as the raw string, with no colour class on the cell', () => {
    // The `<td>` is created with no const index at all: no class, no `ngClass`, no pipe. The
    // green/red pair belongs to the form's radio labels alone.
    const body = renderPane({
      hasSwingTradeAlerts: true,
      isPresenter: false,
      alerts: [row({ direction: 'short' })]
    });
    expect(body).toContain('<td>short</td>');
  });
});

describe('formatSwingAlertTxt', () => {
  it('keeps the space before the newline and the word Exit for the stop value', () => {
    /*
      Both look like typos and neither is. The hashtag line is `"#SwingTrade \n"` with a trailing
      space, and the STOP value is labelled `Exit` even though the form's label and the table's
      header both say `Stop`. These strings are read by presenters in the alerts feed every day.
    */
    expect(
      formatSwingAlertTxt({
        symbol: 'AAPL',
        direction: 'long',
        entryPrice: '123.57',
        stop: '120.40',
        target: '138.75',
        image: ''
      })
    ).toBe('#SwingTrade \nAAPL - long - Entry 123.57 - Exit 120.40 - Target 138.75');
  });

  it('appends the image on its own line only when there is one', () => {
    const withImage = formatSwingAlertTxt({
      symbol: 'AAPL',
      direction: 'long',
      entryPrice: '1',
      stop: '2',
      target: '3',
      image: 'https://example.test/a.png'
    });
    expect(withImage.endsWith('\nhttps://example.test/a.png')).toBe(true);
  });
});
