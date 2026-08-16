// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';

import type { MessageActionItem } from '#lib/types.js';

import { RoomAlerts } from './alerts.svelte';
import { RoomChat } from './chat.svelte';
import { RoomFeeds } from './feeds.svelte';
import { RoomLogPages } from './log-pages.svelte';

/*
  What each pane RENDERS, executed.

  Four contract files read this class as source and pin the pipeline against the capture — the alert
  filter's three sites, the badge join, the webinar view filter, the paging merge. What none of them
  can do is run a pipeline, and the properties that only exist at runtime are the ones the overlay
  creates:

  - a hidden row disappears from EVERY pipeline, not just the one that hid it;
  - an edited row shows the new body and drops its captured segments;
  - the two columns come from one function, so a change to either is a change to both.
*/

type Row = MessageActionItem & {
  room: string;
  body: string;
  senderName: string;
  senderEmailHash?: string | null;
  createdAt: string | number | Date;
};

const row = (over: Partial<Row> = {}): Row =>
  ({
    id: 1,
    room: 'main',
    body: 'hello',
    senderId: 2,
    senderName: 'Ada',
    senderEmailHash: 'hash-ada',
    createdAt: 1_000,
    isAdmin: false,
    ...over
  }) as Row;

const make = (
  options: { alerts?: Row[]; messages?: Row[]; webinar?: boolean; badges?: unknown } = {}
) => {
  // The seed RoomAlerts actually takes - three values, not a thunk. Read from its constructor.
  const alerts = new RoomAlerts({ alertFilterFor: {}, showAlertsFrom: false, archivedAt: null });
  const chat = new RoomChat({ extraColumnEnabled: () => true });
  const alertPages = new RoomLogPages<Row>();
  const chatPages = new RoomLogPages<Row>();

  const feeds = new RoomFeeds<Row, Row>({
    alerts,
    chat,
    alertPages,
    chatPages,
    session: () => ({
      user: { id: 9, displayName: 'Me', hasAdminChat: false },
      alerts: options.alerts ?? [],
      messages: options.messages ?? [],
      badges: (options.badges ?? null) as never,
      sessData: {}
    }),
    prefs: { trimChatLogs: false },
    isPresenter: () => false,
    webinarMode: () => options.webinar ?? false,
    theme: () => 'dark',
    unreadQa: new Set<number>(),
    alertsLogKey: 'alerts'
  });

  return { feeds, alerts, chat };
};

describe('the evidence overlay reaches every pipeline', () => {
  it('hides a row from the alert list and the chat list alike', () => {
    /*
      The overlay is what makes a captured row respond to a click before the server has answered.
      A class holding the state without the pipelines would leave four readers on the other side of
      a boundary — which is the whole argument for these being one class.
    */
    const target = row({ id: 4, evidenceKey: 'k4' } as Partial<Row>);
    const { feeds } = make({ alerts: [target], messages: [target] });
    expect(feeds.visibleAlerts).toHaveLength(1);
    expect(feeds.visibleChat).toHaveLength(1);

    feeds.patchEvidence(target, { hidden: true });
    expect(feeds.visibleAlerts, 'a hidden row must leave the alert list').toHaveLength(0);
    expect(feeds.visibleChat, 'and the chat list, from the same patch').toHaveLength(0);
  });

  it('shows an edited body and drops the captured segments with it', () => {
    /*
      `evidenceBodySegments` is the capture's pre-split rendering. Leaving it in place after an edit
      would draw the OLD text from the segments while `body` said something else.
    */
    const target = row({
      id: 5,
      evidenceKey: 'k5',
      evidenceBodySegments: [{ kind: 'text', text: 'old' }]
    } as Partial<Row>);
    const { feeds } = make({ messages: [target] });
    feeds.patchEvidence(target, { body: 'edited' });
    const [seen] = feeds.visibleChat;
    expect(seen.body).toBe('edited');
    expect(
      seen.evidenceBodySegments,
      'the captured segments must not survive an edit'
    ).toBeUndefined();
  });

  it('ignores a patch for a row with no evidence key, rather than inventing one', () => {
    const target = row({ id: 6 });
    const { feeds } = make({ messages: [target] });
    feeds.patchEvidence(target, { hidden: true });
    expect(feeds.visibleChat, 'a live row has no overlay to patch').toHaveLength(1);
  });
});

describe('the two columns are one function', () => {
  it('each column shows only ITS channel', () => {
    const { feeds, chat } = make({
      messages: [row({ id: 1, room: 'main' }), row({ id: 2, room: 'off-topic' })]
    });
    chat.extraTab = 'off-topic';
    expect(feeds.visibleChat.map((m) => m.id)).toEqual([1]);
    expect(feeds.visibleExtraChat.map((m) => m.id)).toEqual([2]);
  });

  it('and a change reaches both, because there is only one pipeline', () => {
    const hidden = row({ id: 3, room: 'main', evidenceKey: 'k3' } as Partial<Row>);
    const { feeds, chat } = make({
      messages: [hidden, row({ id: 4, room: 'off-topic', evidenceKey: 'k3' } as Partial<Row>)]
    });
    chat.extraTab = 'off-topic';
    feeds.patchEvidence(hidden, { hidden: true });
    expect(feeds.visibleChat).toHaveLength(0);
    expect(feeds.visibleExtraChat, 'same key, same overlay, both columns').toHaveLength(0);
  });
});

describe('the badge join', () => {
  it('resolves by the hash the message already carries, and skips a deleted definition', () => {
    /*
      Badges live in the controller and messages in the room's own database, so they are joined at
      RENDER time on `senderEmailHash` rather than denormalised into room rows that then go stale.
    */
    const { feeds } = make({
      messages: [row({ id: 1, senderEmailHash: 'hash-ada' })],
      badges: {
        byEmailHash: { 'hash-ada': [1, 99] },
        definitions: { '1': { text: 'PRO', color: '#fff', backgroundColor: '#000' } }
      }
    });
    const [seen] = feeds.visibleChat;
    expect(seen.badges, 'id 99 has no definition and must not draw a blank chip').toHaveLength(1);
    expect(seen.badges?.[0].text).toBe('PRO');
  });

  it('swaps in the dark variant, and falls back when the variant was deleted', () => {
    const { feeds } = make({
      messages: [row({ id: 1, senderEmailHash: 'h' }), row({ id: 2, senderEmailHash: 'g' })],
      badges: {
        byEmailHash: { h: [1], g: [3] },
        definitions: {
          '1': { text: 'LIGHT', color: '#000', backgroundColor: '#fff', darkTheme: 2 },
          '2': { text: 'DARK', color: '#fff', backgroundColor: '#000' },
          // Its `darkTheme` names a definition that no longer exists.
          '3': { text: 'ORPHAN', color: '#000', backgroundColor: '#fff', darkTheme: 404 }
        }
      }
    });
    const [first, second] = feeds.visibleChat;
    expect(first.badges?.[0].text).toBe('DARK');
    expect(second.badges?.[0].text, 'losing a badge is worse than showing the light one').toBe(
      'ORPHAN'
    );
  });
});

describe('webinar mode filters the VIEW, not the arrival', () => {
  it('drops a member message and keeps an admin one', () => {
    /*
      Upstream drops messages as they arrive. This room re-reads its log from the server on every
      invalidate, so a drop-on-arrival would be undone by the next load — it is a view filter here.
    */
    const { feeds } = make({
      webinar: true,
      messages: [
        row({ id: 1, isAdmin: false, body: 'member' } as Partial<Row>),
        row({ id: 2, isAdmin: true, body: 'admin' } as Partial<Row>)
      ]
    });
    expect(feeds.visibleChat.map((m) => m.id)).toEqual([2]);
  });

  it('and does nothing at all when the mode is off', () => {
    const { feeds } = make({
      webinar: false,
      messages: [row({ id: 1, isAdmin: false } as Partial<Row>)]
    });
    expect(feeds.visibleChat).toHaveLength(1);
  });
});

describe('the pipelines are reactive', () => {
  /*
    Mutations and flushes INSIDE `$effect.root`, assertions OUTSIDE it — the root swallows a thrown
    assertion, as `room-mtx.svelte.test.ts` records.
  */
  it('re-runs a reader when a row is hidden', () => {
    const target = row({ id: 7, evidenceKey: 'k7' } as Partial<Row>);
    const { feeds } = make({ messages: [target] });
    const seen: number[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(feeds.visibleChat.length));
      flushSync();
      feeds.patchEvidence(target, { hidden: true });
      flushSync();
    });
    stop();
    expect(seen, 'the visibleChat getter is not reactive').toEqual([1, 0]);
  });

  it('re-runs the alert list when a row is hidden', () => {
    const target = row({ id: 8, evidenceKey: 'k8' } as Partial<Row>);
    const { feeds } = make({ alerts: [target] });
    const seen: number[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(feeds.visibleAlerts.length));
      flushSync();
      feeds.patchEvidence(target, { hidden: true });
      flushSync();
    });
    stop();
    expect(seen, 'the visibleAlerts getter is not reactive').toEqual([1, 0]);
  });

  it('re-runs the extra column when the channel it shows changes', () => {
    const { feeds, chat } = make({
      messages: [row({ id: 1, room: 'main' }), row({ id: 2, room: 'off-topic' })]
    });
    // `off-topic` is the DEFAULT extra channel, so switching TO it is a no-op. The change has to
    // be away and back, or the effect never sees two values.
    chat.extraTab = 'main';
    const seen: (number | undefined)[] = [];
    const stop = $effect.root(() => {
      $effect(() => void seen.push(feeds.visibleExtraChat[0]?.id));
      flushSync();
      chat.extraTab = 'off-topic';
      flushSync();
    });
    stop();
    expect(seen, 'the extra column does not follow its channel').toEqual([1, 2]);
  });
});
