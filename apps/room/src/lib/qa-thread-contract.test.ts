import { readFileSync } from 'node:fs';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';

import { db, ensureDatabase } from '#lib/server/db/index.js';
import { alertQuestions, alerts, users, type User } from '#lib/server/db/schema.js';
import { resetRateLimits } from '#lib/server/rate-limit.js';
import { callRemote, expectSchemaRefusal } from '#lib/server/remote-command-harness.js';
import { appendMention } from '#lib/mention-insert.js';
import { buildMessageChrome } from '#lib/room-message-chrome.js';
import { sourceMessageBehavior, type SourceMessageBehaviorInput } from '#lib/message-behavior.js';

/*
  ── THE Q&A THREAD ─────────────────────────────────────────────────────────────────────────────────

  `enableQAReactions` was filed as a one-line WIRE and it is a feature, for a reason worth keeping:
  the RULE was already written. `sourceMessageBehavior.react` has read the setting since the day it
  was transcribed —

      enableReactions && "chat" === logType || enableQAReactions && "alerts" === logType && isQAMsg
                                                                                  (byte 1,335,445)

  — and its second clause could never evaluate true here, because the thread rendered its rows with
  `kind="chat"` behind `onaction={() => {}}`. Wiring the flag alone would have lit a control that
  cannot act.

  So this file covers the whole surface the flag needed underneath it: what the menu offers on a
  thread entry, where a reaction on one is stored, who may remove one, and the two defects the work
  uncovered — questions on captured alerts that were written and never read back, and a `mute24`
  carrying a row coordinate it never read.
*/

const controller = { settings: {} as Record<string, unknown> };

vi.mock('#lib/server/room-config-client.js', () => ({
  RoomConfigUnavailable: class RoomConfigUnavailable extends Error {},
  readRoomConfig: async (_request: Request, shortCode: string, email?: string) => ({
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

const { askQuestion, deleteQuestion, reactToQuestion } =
  await import('../routes/alert-questions.remote');
const { loadQuestionsForAlerts } = await import('#lib/server/alert-log.js');

const ROOM = '4471';
const OTHER_ROOM = '9902';

const locals = (user: User, room = ROOM) =>
  ({ user, sessionId: 'qa-thread-contract', roomShortCode: room }) as App.Locals;

function account(email: string, role: string): User {
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) return existing;
  return db
    .insert(users)
    .values({
      displayName: `qa ${role}`,
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
let stranger: User;

beforeAll(() => {
  ensureDatabase();
  presenter = account('qa-presenter@example.test', 'staff');
  member = account('qa-member@example.test', 'member');
  stranger = account('qa-stranger@example.test', 'member');
});

beforeEach(() => {
  controller.settings = {};
  resetRateLimits();
  db.delete(alertQuestions).run();
  db.delete(alerts).run();
});

const newAlert = (room = ROOM) =>
  db
    .insert(alerts)
    .values({
      roomShortCode: room,
      senderId: presenter.id,
      body: 'AAPL 200c',
      createdAt: new Date()
    })
    .returning()
    .get();

const newQuestion = (alertId: number, sender: User, room = ROOM) =>
  db
    .insert(alertQuestions)
    .values({
      alertId,
      roomShortCode: room,
      senderId: sender.id,
      body: 'why that strike?',
      createdAt: new Date()
    })
    .returning()
    .get();

const reactionsOf = (questionId: number) =>
  JSON.parse(
    db
      .select({ reactionsJson: alertQuestions.reactionsJson })
      .from(alertQuestions)
      .where(eq(alertQuestions.id, questionId))
      .get()?.reactionsJson ?? '{}'
  ) as Record<string, { emoji: string; clickedBy: string[] }>;

/* ───────────────────────────── the menu a thread entry draws ───────────────────────────── */

const BASE: SourceMessageBehaviorInput = {
  kind: 'alert',
  viewerIsPresenter: false,
  viewerIsLimitedPresenter: false,
  isOwnMessage: false,
  isAdminMessage: false,
  allowDeleteOwnMessage: false,
  usersPublicReply: false,
  userPrivateMessaging: false,
  userToPresenterPrivateMessaging: false,
  disablePrivateMessagingForTrials: false,
  currentUserIsTrial: false,
  enableReactions: false,
  enableQaReactions: false,
  isQaMessage: false,
  enableEditMessage: false,
  enableEditAlerts: false
};

describe('what enableQAReactions actually gates', () => {
  /*
    THE WHOLE POINT, and the reason this row was mis-filed as a one-line wire: the rule is one
    expression with FOUR terms, and three of them were already true in the thread. Only the setting
    was missing, and only because the thread said `kind="chat"`.
  */
  it('needs the setting, the alerts log AND the thread — any one missing is no reaction', () => {
    const on = { ...BASE, enableQaReactions: true, isQaMessage: true };
    expect(sourceMessageBehavior(on).react, 'all three').toBe(true);
    expect(
      sourceMessageBehavior({ ...on, enableQaReactions: false }).react,
      'owner left it off'
    ).toBe(false);
    expect(sourceMessageBehavior({ ...on, isQaMessage: false }).react, 'a plain alert').toBe(false);
    expect(sourceMessageBehavior({ ...on, kind: 'chat' }).react, 'chat asks the other flag').toBe(
      false
    );
  });

  it('and the CHAT half is still its own setting', () => {
    const chat = { ...BASE, kind: 'chat' as const };
    expect(sourceMessageBehavior({ ...chat, enableReactions: true }).react).toBe(true);
    expect(
      sourceMessageBehavior({ ...chat, enableQaReactions: true }).react,
      'the Q&A flag must not unlock chat'
    ).toBe(false);
  });
});

describe('the three entries that are DEAD upstream and are not drawn here', () => {
  /*
    Each of the three turns on purely because the thread renders `logType="alerts"`, and each acts
    on `this.msg._id` — which a Q&A entry does not have. That is not an inference: it is why the two
    things the reference CAN do to a thread entry send the parent alert plus an ordinal instead
    (`manageChatReactions`, byte 1,354,136; `deleteQAAlert`, byte 1,159,097).
  */
  it.each([
    ['showToAll', { viewerIsPresenter: true }],
    ['openAlertReport', { viewerIsPresenter: true }],
    ['edit', { viewerIsPresenter: true, enableEditAlerts: true }]
  ] as const)('%s is offered on a plain alert and refused inside the thread', (entry, extra) => {
    const onAnAlert = sourceMessageBehavior({ ...BASE, ...extra });
    const inTheThread = sourceMessageBehavior({ ...BASE, ...extra, isQaMessage: true });
    expect(onAnAlert[entry], 'the alerts log still offers it').toBe(true);
    expect(inTheThread[entry], 'the thread must not').toBe(false);
  });

  /*
    …and the seven that DO act are still there, because suppressing a menu is easy to overdo. Each
    of these acts on the question, on its sender, or on its text.
  */
  it('leaves the seven that act', () => {
    const behavior = sourceMessageBehavior({
      ...BASE,
      isQaMessage: true,
      viewerIsPresenter: true,
      enableQaReactions: true
    });
    expect(behavior.deleteMessage).toBe(true);
    expect(behavior.muteMessage).toBe(true);
    expect(behavior.openUserInfo).toBe(true);
    expect(behavior.mention).toBe(true);
    expect(behavior.react).toBe(true);
    expect(behavior.copy).toBe(true);
    expect(behavior.privateMessage).toBe(true);
  });
});

/* ───────────────────────────── the chrome and the mention insert ───────────────────────────── */

const chromeSources = (sessData: Record<string, unknown> | null) => ({
  user: { id: 1, emailHash: 'h', displayName: 'n', role: 'member', isFT: false },
  sessData: sessData as never,
  theme: 'dark' as const,
  chatStyle: {
    color: '#fff',
    tickerColor: '#fff',
    usernameColor: '#fff',
    bgColor: '#000',
    fontSize: 14,
    playSound: false
  },
  chatGif: false,
  chatBadges: false,
  enableBadges: false,
  presenterMessagesOnTheRight: false,
  viewerIsLimitedPresenter: false
});

describe('the setting reaches the chrome, and fails closed', () => {
  it('is true only for a literal true', () => {
    expect(buildMessageChrome(chromeSources({ enableQAReactions: true })).enableQaReactions).toBe(
      true
    );
    for (const value of ['true', 1, {}, 'false', null, undefined]) {
      expect(
        buildMessageChrome(chromeSources({ enableQAReactions: value })).enableQaReactions,
        JSON.stringify(value) ?? 'undefined'
      ).toBe(false);
    }
  });

  it('and a room that configured nothing has it off', () => {
    expect(buildMessageChrome(chromeSources(null)).enableQaReactions).toBe(false);
  });
});

describe('the mention insert, which is now one rule for three composers', () => {
  /*
    `i.length ? val(i + ' @' + e + ' ') : val('@' + e + ' ')` — byte 2,334,700 for the thread, and
    the identical pair on the main and extra columns. The leading space is CONDITIONAL and the
    trailing one is not; getting that backwards looks right until two names are inserted in a row.
  */
  it('adds no leading space to an empty composer and one to a non-empty one', () => {
    expect(appendMention('', 'ana')).toBe('@ana ');
    expect(appendMention('hey', 'ana')).toBe('hey @ana ');
  });

  /*
    MEASURED, not assumed. The obvious expectation for two mentions in a row is `@ana @bo `, and the
    reference's own rule does not produce it: the trailing space is unconditional and the leading one
    only asks whether anything is there, so the second insert adds a space after one that is already
    present. `@ana  @bo `, with two.

    Asserted rather than smoothed over. Collapsing it would be a divergence chosen because a test was
    easier to write that way, which is the wrong reason to differ from the thing being reproduced.
  */
  it('and doubles the space between two consecutive mentions, exactly as upstream does', () => {
    expect(appendMention(appendMention('', 'ana'), 'bo')).toBe('@ana  @bo ');
  });
});

/* ───────────────────────────── the two commands ───────────────────────────── */

describe('reactToQuestion', () => {
  it('refuses when the room has the setting off — the menu is not the gate', async () => {
    /*
      THE GATE THAT MATTERS. A member who cannot see the control can still call the command; an
      owner who left `enableQAReactions` off gets a room where the reaction cannot be RECORDED.
    */
    const alert = newAlert();
    const question = newQuestion(alert.id, member);
    await expect(
      callRemote(locals(member), () =>
        reactToQuestion({
          questionId: question.id,
          reactionKey: 'thumbsup',
          reactionEmoji: '👍'
        })
      )
    ).rejects.toMatchObject({ status: 403 });
    expect(reactionsOf(question.id)).toEqual({});
  });

  it.each([undefined, false, 'true', 1])('and %o is not on either', async (value) => {
    const alert = newAlert();
    const question = newQuestion(alert.id, member);
    controller.settings = { enableQAReactions: value };
    await expect(
      callRemote(locals(member), () =>
        reactToQuestion({
          questionId: question.id,
          reactionKey: 'thumbsup',
          reactionEmoji: '👍'
        })
      )
    ).rejects.toMatchObject({ status: 403 });
  });

  it('toggles on and back off, keyed by the reacting member', async () => {
    controller.settings = { enableQAReactions: true };
    const alert = newAlert();
    const question = newQuestion(alert.id, member);
    const args = { questionId: question.id, reactionKey: 'thumbsup', reactionEmoji: '👍' };

    await callRemote(locals(stranger), () => reactToQuestion(args));
    const added = reactionsOf(question.id);
    expect(added.thumbsup.emoji).toBe('👍');
    expect(added.thumbsup.clickedBy).toHaveLength(1);

    // The same member again REMOVES it, and an emptied key is deleted rather than left at zero.
    await callRemote(locals(stranger), () => reactToQuestion(args));
    expect(reactionsOf(question.id)).toEqual({});
  });

  it('refuses a question in another room, by id', async () => {
    /*
      The room predicate is on the ROW. Without it, a member of one room could react to another
      room's Q&A entry by naming its id, and nothing downstream would notice — `alert_questions` has
      no other anchor for a question asked on a captured alert.
    */
    controller.settings = { enableQAReactions: true };
    const foreign = newAlert(OTHER_ROOM);
    const question = newQuestion(foreign.id, member, OTHER_ROOM);
    await expect(
      callRemote(locals(member), () =>
        reactToQuestion({
          questionId: question.id,
          reactionKey: 'thumbsup',
          reactionEmoji: '👍'
        })
      )
    ).rejects.toMatchObject({ status: 404 });
    expect(reactionsOf(question.id)).toEqual({});
  });

  it('refuses an id that cannot be a question', async () => {
    controller.settings = { enableQAReactions: true };
    for (const questionId of [0, -1]) {
      await expectSchemaRefusal(
        callRemote(locals(member), () =>
          reactToQuestion({
            questionId,
            reactionKey: 'thumbsup',
            reactionEmoji: '👍'
          })
        ),
        String(questionId)
      );
    }
  });
});

describe('deleteQuestion', () => {
  it('lets a presenter remove anything in their room', async () => {
    const alert = newAlert();
    const question = newQuestion(alert.id, member);
    await callRemote(locals(presenter), () => deleteQuestion({ questionId: question.id }));
    expect(db.select().from(alertQuestions).all()).toHaveLength(0);
  });

  it('refuses a member removing somebody ELSE’s question, however the room is configured', async () => {
    controller.settings = { usersCanDeleteOwnMsgs: true };
    const alert = newAlert();
    const question = newQuestion(alert.id, member);
    await expect(
      callRemote(locals(stranger), () => deleteQuestion({ questionId: question.id }))
    ).rejects.toMatchObject({ status: 403 });
    expect(db.select().from(alertQuestions).all()).toHaveLength(1);
  });

  it('refuses a member removing their OWN when the room did not allow it', async () => {
    /*
      The same rule the chat delete carries, and the same reason it is on the SERVER: the room's menu
      not offering the control is not the same as the endpoint refusing it.
    */
    const alert = newAlert();
    const question = newQuestion(alert.id, member);
    await expect(
      callRemote(locals(member), () => deleteQuestion({ questionId: question.id }))
    ).rejects.toMatchObject({ status: 403 });
    expect(db.select().from(alertQuestions).all()).toHaveLength(1);
  });

  it('and allows it when the room did', async () => {
    controller.settings = { usersCanDeleteOwnMsgs: true };
    const alert = newAlert();
    const question = newQuestion(alert.id, member);
    await callRemote(locals(member), () => deleteQuestion({ questionId: question.id }));
    expect(db.select().from(alertQuestions).all()).toHaveLength(0);
  });

  it('refuses a question in another room', async () => {
    const foreign = newAlert(OTHER_ROOM);
    const question = newQuestion(foreign.id, member, OTHER_ROOM);
    await expect(
      callRemote(locals(presenter), () => deleteQuestion({ questionId: question.id }))
    ).rejects.toMatchObject({ status: 404 });
    expect(db.select().from(alertQuestions).all()).toHaveLength(1);
  });

  it('recomputes the alert’s cached counters rather than decrementing them', async () => {
    /*
      `question_count` and `question_answered` are a cache of these rows and the Q&A button reads
      them. A decrement cannot be replayed or repaired; a recount always agrees with what is there.
    */
    const alert = newAlert();
    await callRemote(locals(member), () => askQuestion({ body: 'one', alertId: alert.id }));
    await callRemote(locals(member), () => askQuestion({ body: 'two', alertId: alert.id }));
    const [first] = db.select().from(alertQuestions).all();

    await callRemote(locals(presenter), () => deleteQuestion({ questionId: first.id }));

    const row = db.select().from(alerts).where(eq(alerts.id, alert.id)).get();
    expect(row?.questionCount).toBe(1);
    expect(row?.questionAnswered).toBe(false);
  });

  it('and counts only THIS room’s rows while doing it', () => {
    /*
      The recount carries the room too. Same shape as the sweep above and the same reason it can be
      built at all: two rooms only ever share an alert id when the alert is a captured fixture, and
      the recount cannot tell the difference — it sees rows.
    */
    const alert = newAlert();
    newQuestion(alert.id, member, ROOM);
    newQuestion(alert.id, member, ROOM);
    newQuestion(alert.id, member, OTHER_ROOM);
    const [first] = db.select().from(alertQuestions).all();

    return callRemote(locals(presenter), () => deleteQuestion({ questionId: first.id })).then(
      () => {
        const row = db.select().from(alerts).where(eq(alerts.id, alert.id)).get();
        expect(row?.questionCount, 'one left here, and the other room is not ours to count').toBe(
          1
        );
      }
    );
  });
});

/* ───────────────────────────── the two defects the work uncovered ───────────────────────────── */

describe('a question asked on a CAPTURED alert', () => {
  /*
    `askQuestion` resolves a negative alert id through the fixture and writes a real row — it always
    has, deliberately, with its own comment saying so. `loadQuestionsForAlerts` then dropped every
    one of those rows, because it reached its room by joining `alerts` and a fixture alert has no
    row to join to. A member asked, was told nothing, and watched the thread go on saying "There are
    no questions."

    The room lives on the QUESTION now. This is the read, and it is the whole fix.
  */
  it('is loaded back, which it was not before the room moved onto the row', () => {
    const capturedAlertId = -5;
    newQuestion(capturedAlertId, member);
    const loaded = loadQuestionsForAlerts(ROOM, [capturedAlertId]);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]?.body).toBe('why that strike?');
  });

  it('and does NOT leak into another room serving the same fixture id', () => {
    /*
      The other half, and the reason the column is the anchor rather than the join: captured alerts
      carry the SAME negative id in every room, so two rooms would have shared their questions the
      moment anything read them without a room term.
    */
    const capturedAlertId = -5;
    newQuestion(capturedAlertId, member, OTHER_ROOM);
    expect(loadQuestionsForAlerts(ROOM, [capturedAlertId])).toHaveLength(0);
    expect(loadQuestionsForAlerts(OTHER_ROOM, [capturedAlertId])).toHaveLength(1);
  });

  it('and the answer sweep no longer reaches across rooms', () => {
    /*
      `askQuestion` marks every outstanding question on the alert answered when the alert's own
      author replies. Keyed on `alertId` alone that sweep crossed rooms, for exactly the reason
      above: a captured alert carries the SAME id in every room that serves the fixture.

      The fixture is not in this checkout, so the SHAPE is built directly — two questions sharing one
      alert id under two different rooms — which is what a captured alert produces and is the only
      thing the sweep can see. A real alert id is globally unique and so can never reach this state
      on its own, which is precisely why the hole was invisible.
    */
    const alert = newAlert();
    const theirs = newQuestion(alert.id, member, OTHER_ROOM);
    const ours = newQuestion(alert.id, member, ROOM);

    return callRemote(locals(presenter), () =>
      askQuestion({ body: 'because of the spread', alertId: alert.id })
    ).then(() => {
      const answeredAt = (id: number) =>
        db
          .select({ answeredAt: alertQuestions.answeredAt })
          .from(alertQuestions)
          .where(eq(alertQuestions.id, id))
          .get()?.answeredAt ?? null;

      expect(answeredAt(ours.id), 'this room’s question is answered').not.toBeNull();
      expect(answeredAt(theirs.id), 'the other room’s question is untouched').toBeNull();
    });
  });
});

describe('the questions load carries the room predicate itself', () => {
  it('reads the question’s own column, not a join to alerts', () => {
    const source = readFileSync(new URL('./server/alert-log.ts', import.meta.url), 'utf8');
    const read = source.slice(source.indexOf('export function loadQuestionsForAlerts'));
    expect(read).toContain('eq(alertQuestions.roomShortCode, roomShortCode)');
    expect(read, 'the join that dropped captured questions is gone').not.toContain(
      'innerJoin(alerts'
    );
  });
});

/* ───────────────────────────── the wire, in the markup ───────────────────────────── */

/*
  The thread is its OWN component since 2026-08-28. It moved out of `ModalHost.svelte` because the
  size ratchet refused the raise its new handler would have needed, which is exactly what that
  ratchet is for — the answer to a file outgrowing its ceiling is to take a self-contained piece out
  of it, not to move the number.
*/
const qaModal = readFileSync(new URL('./components/AlertQaModal.svelte', import.meta.url), 'utf8');
const modalHost = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');

/** Both comment syntaxes — a `.svelte` file has HTML comments AND block comments in its script. */
const codeOf = (source: string) =>
  source.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

describe('the Q&A thread renders its entries the way the reference does', () => {
  const code = codeOf(qaModal);

  it('and the host renders it rather than holding it', () => {
    /*
      Named here because the extraction is the reason every assertion below reads a different file
      than it used to, and because a host that stopped rendering the modal would leave the rest of
      this block passing over a component nothing mounts.
    */
    expect(codeOf(modalHost)).toContain('<AlertQaModal');
    expect(codeOf(modalHost), 'the markup moved out whole').not.toContain('<app-alert-qa-modal>');
  });

  it('as ALERTS inside the thread, with the chrome every other message gets', () => {
    // `this.isQAMsg = !0, this.logType = "alerts"` — byte 2,334,347.
    expect(code).toContain('{...messageChrome}');
    expect(code).toContain('kind="alert"');
    expect(code).toContain('isQaMessage={true}');
  });

  it('with a handler that acts, which is what the entitlement needed underneath it', () => {
    expect(code, 'the inert handler is gone').not.toContain('onaction={() => {}}');
    expect(code).toContain('onaction={runQaAction}');
  });

  it('and WITHOUT alert labels, which is the reference’s own choice', () => {
    /*
      The body pipe receives `e.isQAMsg ? null : alertLabels` (byte 1,331,700): a hash inside a
      question stays text. `RoomMessage` defaults `alertLabels` to `[]`, so the way to honour that
      is to pass nothing — and the way to keep honouring it is to say so here.
    */
    const thread = code.slice(code.indexOf('{#each qaQuestions as question'));
    expect(thread).not.toContain('alertLabels');
  });
});
