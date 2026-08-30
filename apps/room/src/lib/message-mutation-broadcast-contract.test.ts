import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';

import {
  MESSAGE_MUTATION_FRAMES,
  isMessageMutationFrame,
  messageMutationFrame
} from './message-mutation-frames.js';
import { db, ensureDatabase } from '#lib/server/db/index.js';
import { alertQuestions, alerts, messages, users, type User } from '#lib/server/db/schema.js';
import { resetRateLimits } from '#lib/server/rate-limit.js';
import { callRemote } from '#lib/server/remote-command-harness.js';
import { subscribeToRoom, type RoomEvent } from '#lib/server/room-events.js';

/**
 * A message changed and the room was never told — nine commands, one defect.
 *
 * ## What was wrong
 *
 * `message-actions.remote.ts` and `alert-questions.remote.ts` hold nine commands between them that
 * mutate a row somebody else is looking at: delete, reaction, edit, mark-answered, ask, react to a
 * question, delete a question, edit a question. **Not one of them published anything.** A presenter
 * deleted a message and every other viewer kept it on screen. A reaction was visible only to the
 * browser that clicked it. A question landed and the presenter's Q&A badge did not move.
 *
 * It was silent in the way this repository keeps finding: every command returned 200, wrote its
 * row, and passed its own tests — because every one of those tests asserts on the row.
 * `EMOJI-01` in `docs/decoded/room-surface-audit-2026-08-30.md` names the reaction third of it;
 * the delete and edit thirds were found beside it by asking which OTHER branches of the same file
 * announce nothing.
 *
 * ## What this file pins, and why it EXECUTES rather than reads
 *
 * A source assertion that `publishToRoom` appears in a file proves the call was typed, not that it
 * is reached: the nine branches return early at eleven different points, and a publish placed after
 * the wrong `return` is invisible to any amount of grep. So every case below drives the real
 * command through `callRemote` against a live database, with a second connection subscribed to the
 * real hub, and asserts on what that OTHER browser received.
 */

const controller = { settings: { enableQAReactions: true } as Record<string, unknown> };

vi.mock('#lib/server/room-config-client.js', () => ({
  RoomConfigUnavailable: class RoomConfigUnavailable extends Error {},
  /*
    The `deleteAlertPW` door, added 2026-08-30 with the gate it feeds. `{required:false}` is what the
    controller answers for a room that has NOT configured an alert-delete password, so every
    assertion in this file stays about the BROADCAST rather than about the password — and the file
    now fails loudly if the gate is ever moved somewhere this mock does not cover, which is exactly
    how this line came to be written.
  */
  checkAlertDeletePasswordRemotely: async () => ({ required: false, ok: true }),
  readRoomConfig: async (_request: unknown, shortCode: string, email?: string) => ({
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

const { messageAction } = await import('../routes/message-actions.remote');
const { askQuestion, deleteQuestion, editQuestion, reactToQuestion } =
  await import('../routes/alert-questions.remote');

const ROOM = 'mutation-broadcast';

const locals = (user: User) =>
  ({ user, sessionId: 'message-mutation-contract', roomShortCode: ROOM }) as App.Locals;

function account(email: string, role: string): User {
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return existing;
  return db
    .insert(users)
    .values({
      displayName: `mutation ${role}`,
      email,
      role,
      passwordHash: 'scrypt$00$00',
      createdAt: new Date()
    })
    .returning()
    .get();
}

let presenter: User;
let member: User;

beforeAll(() => {
  ensureDatabase();
  presenter = account('mutation-presenter@example.test', 'staff');
  member = account('mutation-member@example.test', 'member');
});

beforeEach(() => {
  resetRateLimits();
  controller.settings = { enableQAReactions: true, usersCanDeleteOwnMsgs: true };
});

const newMessage = (sender: User) =>
  db
    .insert(messages)
    .values({
      roomShortCode: ROOM,
      senderId: sender.id,
      body: 'a message',
      isAdmin: false,
      createdAt: new Date()
    })
    .returning()
    .get();

const newAlert = (sender: User) =>
  db
    .insert(alerts)
    .values({
      roomShortCode: ROOM,
      senderId: sender.id,
      body: 'an alert',
      createdAt: new Date()
    })
    .returning()
    .get();

/**
 * Runs one command with a SECOND browser subscribed, and returns what that browser was handed.
 *
 * The real `subscribeToRoom` / `publishToRoom`, never a mock: a mock of the fan-out is a test of
 * the mock, and the thing being proven here is that a frame reaches a connection that did not send
 * the command.
 */
async function watch(run: () => Promise<unknown>): Promise<Array<Record<string, unknown>>> {
  const received: Array<Record<string, unknown>> = [];
  const stop = subscribeToRoom(ROOM, (event: RoomEvent) => {
    if (event.channel !== 'cmds') return;
    received.push(event.data as unknown as Record<string, unknown>);
  });
  try {
    await run();
  } finally {
    stop();
  }
  return received;
}

describe('the four frame names', () => {
  it('are the reference s, and nothing has been invented beside them', () => {
    expect([...MESSAGE_MUTATION_FRAMES]).toEqual([
      'updateChatMsg',
      'updateAlertMsg',
      'deleteChatMsg',
      'deleteAlertMsg'
    ]);
  });

  it('map log and change onto the right one', () => {
    expect(messageMutationFrame('chat', 'update')).toBe('updateChatMsg');
    expect(messageMutationFrame('chat', 'delete')).toBe('deleteChatMsg');
    expect(messageMutationFrame('alert', 'update')).toBe('updateAlertMsg');
    expect(messageMutationFrame('alert', 'delete')).toBe('deleteAlertMsg');
  });

  it('recognise exactly those four and nothing else', () => {
    for (const name of MESSAGE_MUTATION_FRAMES) expect(isMessageMutationFrame(name)).toBe(true);
    for (const other of [
      undefined,
      '',
      'changeChatMode',
      'presenterColorsChanged',
      'updateChatMsgReaction',
      'deleteChatMsgs'
    ]) {
      expect(isMessageMutationFrame(other), String(other)).toBe(false);
    }
  });
});

describe('a second browser is told', () => {
  it('when a chat message is reacted to', async () => {
    const message = newMessage(member);
    const received = await watch(() =>
      callRemote(locals(member), () =>
        messageAction({
          kind: 'chat',
          id: message.id,
          operation: 'reaction',
          reactionKey: 'thumbsup',
          reactionEmoji: '👍'
        })
      )
    );
    expect(received).toEqual([{ cmd: 'updateChatMsg', actorUserId: member.id }]);
  });

  it('when an ALERT is reacted to', async () => {
    const alert = newAlert(presenter);
    const received = await watch(() =>
      callRemote(locals(member), () =>
        messageAction({
          kind: 'alert',
          id: alert.id,
          operation: 'reaction',
          reactionKey: 'fire',
          reactionEmoji: '🔥'
        })
      )
    );
    expect(received).toEqual([{ cmd: 'updateAlertMsg', actorUserId: member.id }]);
  });

  it('when a chat message is edited', async () => {
    const message = newMessage(member);
    const received = await watch(() =>
      callRemote(locals(member), () =>
        messageAction({ kind: 'chat', id: message.id, operation: 'edit', newBody: 'edited' })
      )
    );
    expect(received).toEqual([{ cmd: 'updateChatMsg', actorUserId: member.id }]);
  });

  it('when an alert is edited', async () => {
    const alert = newAlert(presenter);
    const received = await watch(() =>
      callRemote(locals(presenter), () =>
        messageAction({ kind: 'alert', id: alert.id, operation: 'edit', newBody: 'edited' })
      )
    );
    expect(received).toEqual([{ cmd: 'updateAlertMsg', actorUserId: presenter.id }]);
  });

  it('when a chat message is DELETED — the case that left it on everyone else s screen', async () => {
    const message = newMessage(member);
    const received = await watch(() =>
      callRemote(locals(presenter), () =>
        messageAction({ kind: 'chat', id: message.id, operation: 'delete' })
      )
    );
    expect(received).toEqual([{ cmd: 'deleteChatMsg', actorUserId: presenter.id }]);
  });

  it('when an alert is deleted', async () => {
    const alert = newAlert(presenter);
    const received = await watch(() =>
      callRemote(locals(presenter), () =>
        messageAction({ kind: 'alert', id: alert.id, operation: 'delete' })
      )
    );
    expect(received).toEqual([{ cmd: 'deleteAlertMsg', actorUserId: presenter.id }]);
  });

  it('when a chat message is marked answered', async () => {
    const message = newMessage(member);
    const received = await watch(() =>
      callRemote(locals(presenter), () =>
        messageAction({ kind: 'chat', id: message.id, operation: 'markAnswered' })
      )
    );
    expect(received).toEqual([{ cmd: 'updateChatMsg', actorUserId: presenter.id }]);
  });

  it('when a question is ASKED — the Q&A badge nobody else saw move', async () => {
    const alert = newAlert(presenter);
    const received = await watch(() =>
      callRemote(locals(member), () => askQuestion({ alertId: alert.id, body: 'why?' }))
    );
    expect(received).toEqual([{ cmd: 'updateAlertMsg', actorUserId: member.id }]);
  });

  it('when a question is reacted to, edited and deleted', async () => {
    const alert = newAlert(presenter);
    await callRemote(locals(member), () => askQuestion({ alertId: alert.id, body: 'why?' }));
    const question = db
      .select()
      .from(alertQuestions)
      .where(eq(alertQuestions.alertId, alert.id))
      .get();
    expect(question, 'the fixture question must exist').toBeDefined();

    expect(
      await watch(() =>
        callRemote(locals(member), () =>
          reactToQuestion({
            questionId: question!.id,
            reactionKey: 'thumbsup',
            reactionEmoji: '👍'
          })
        )
      )
    ).toEqual([{ cmd: 'updateAlertMsg', actorUserId: member.id }]);

    expect(
      await watch(() =>
        callRemote(locals(presenter), () =>
          editQuestion({ questionId: question!.id, body: 'corrected' })
        )
      )
    ).toEqual([{ cmd: 'updateAlertMsg', actorUserId: presenter.id }]);

    expect(
      await watch(() =>
        callRemote(locals(presenter), () => deleteQuestion({ questionId: question!.id }))
      )
    ).toEqual([{ cmd: 'updateAlertMsg', actorUserId: presenter.id }]);
  });

  it('and is told NOTHING when the command was refused', async () => {
    /*
      The half that matters as much as the announcement: a 403 must not put a frame on the wire.
      Every other browser would refetch for a change that never happened, which is the "reports
      success and sends nothing" defect running backwards.
    */
    const alert = newAlert(presenter);
    const received = await watch(async () => {
      await expect(
        callRemote(locals(member), () =>
          messageAction({ kind: 'alert', id: alert.id, operation: 'delete' })
        )
      ).rejects.toMatchObject({ status: 403 });
      await expect(
        callRemote(locals(member), () =>
          messageAction({ kind: 'chat', id: 999_999, operation: 'markAnswered' })
        )
      ).rejects.toMatchObject({ status: 403 });
    });
    expect(received).toEqual([]);
  });
});

describe('the browser that sent it does not refetch twice', () => {
  const EVENTS = readFileSync(new URL('./room/events.svelte.ts', import.meta.url), 'utf8');
  const eventsCode = EVENTS.replace(/\/\*[\s\S]*?\*\//g, '');

  it('skips its own frame, and refetches every other one', () => {
    /*
      Source-level, and it is the one assertion here that has to be: the skip lives in an
      `EventSource` handler that only a browser can drive. What makes it safe to read rather than
      run is that the frame's shape is EXECUTED above — every case asserts the exact
      `actorUserId` that this line compares against.

      The same skip the `chat` and `alerts` channels make one screen down, in their own words:
      "Our own post already refetched. Re-invalidating would refetch twice per alert."
    */
    expect(eventsCode).toContain('if (isMessageMutationFrame(command?.cmd)) {');
    expect(eventsCode).toContain(
      'if (command.actorUserId !== this.#session().user.id) void invalidateAll();'
    );
  });
});
