import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The welcome email and the webinar reminder, against a fake database and a fake transport.
 *
 * The two things worth guarding here are opposites of each other: the reminder's body must stay
 * exactly what the reference's own preview says, and the welcome email's body must not pretend to
 * be anything — no invented sender, no invented address, no marketing.
 *
 * The bulk send gets the most attention because it is the only irreversible control on the page.
 */

const env = vi.hoisted(() => ({ RESEND_API_KEY: '' as string, MAIL_FROM: '' as string }));

vi.mock('$app/env/private', () => ({
  get RESEND_API_KEY() {
    return env.RESEND_API_KEY;
  },
  get MAIL_FROM() {
    return env.MAIL_FROM;
  },
  FCM_SERVICE_ACCOUNT_JSON: '',
  SUPERADMIN_EMAILS: ''
}));

const sent = vi.hoisted(() => ({ mails: [] as Array<{ to: string; subject: string; text: string }>, fail: '' }));

vi.mock('./mail', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./mail')>();
  return {
    ...actual,
    sendMail: async (mail: { to: string; subject: string; text: string }) => {
      if (sent.fail && mail.to === sent.fail) throw new actual.MailDeliveryFailed('status 422');
      sent.mails.push(mail);
    }
  };
});

const roomUserRows: Array<Record<string, unknown>> = [];
const userRows: Array<Record<string, unknown>> = [];
const roomRows: Array<Record<string, unknown>> = [];
const tablesByName: Record<string, Array<Record<string, unknown>>> = {
  room_users: roomUserRows,
  users: userRows,
  rooms: roomRows
};

type Row = Record<string, unknown>;
type Predicate = (row: Row) => boolean;

vi.mock('./db', () => ({
  getDb: () => ({
    select: () => ({
      from: (table: { table: string }) => ({
        where: (predicate: Predicate) => {
          const hit = (tablesByName[table.table] ?? []).filter(predicate);
          return Object.assign(Promise.resolve(hit), { limit: async () => hit });
        }
      })
    }),
    update: (table: { table: string }) => ({
      set: (patch: Row) => ({
        where: (predicate: Predicate) => {
          const hit = (tablesByName[table.table] ?? []).filter(predicate);
          for (const row of hit) Object.assign(row, patch);
          return Object.assign(Promise.resolve(hit), { returning: async () => hit });
        }
      })
    })
  })
}));

vi.mock('drizzle-orm', () => ({
  eq: (col: { name: string }, value: unknown) => (row: Row) => row[col.name] === value,
  ne: (col: { name: string }, value: unknown) => (row: Row) => row[col.name] !== value,
  isNull: (col: { name: string }) => (row: Row) => row[col.name] == null,
  inArray: (col: { name: string }, values: unknown[]) => (row: Row) => values.includes(row[col.name]),
  and:
    (...preds: Predicate[]) =>
    (row: Row) =>
      preds.every((p) => p(row))
}));

const table = (name: string, columns: string[]) =>
  Object.fromEntries([['table', name], ...columns.map((c) => [c, { name: c }])]);

vi.mock('./db/schema', () => ({
  roomUsers: table('room_users', ['id', 'roomId', 'userId', 'role', 'pushTokensJson', 'notificationsState']),
  users: table('users', ['id', 'email', 'displayName', 'accountId', 'emailVerifiedAt']),
  rooms: table('rooms', ['id', 'accountId', 'name', 'publicId', 'uniqueSlug', 'shortCode']),
  roomSettings: table('room_settings', ['roomId', 'settingsJson', 'updatedAt']),
  accounts: table('accounts', ['id', 'status']),
  loginSessions: table('login_sessions', ['id', 'userId', 'lastSeenAt']),
  impersonations: table('impersonations', ['id', 'operatorUserId', 'targetUserId', 'expiresAt', 'endedAt']),
  emailVerificationTokens: table('email_verification_tokens', ['tokenHash', 'userId', 'purpose', 'consumedAt']),
  ACCOUNT_ACTIVE: 'active',
  IMPERSONATION_TTL_MS: 900_000
}));

const {
  MailEnvMissing,
  missingMailEnv,
  sendWebinarReminderToRoom,
  sendWelcomeEmailToMember,
  webinarReminderEmail,
  welcomeEmail
} = await import('./member-email');

const ORIGIN = 'https://control.test';

function seed() {
  roomRows.push({ id: 10, accountId: 1, name: 'Room 3627', publicId: '6a6529b3', uniqueSlug: 'abc123' });
  roomRows.push({ id: 20, accountId: 2, name: "Somebody else's room", publicId: 'zzz', uniqueSlug: 'zzz' });
  roomUserRows.push({ id: 500, roomId: 10, userId: 77, role: 2 });
  roomUserRows.push({ id: 501, roomId: 10, userId: 78, role: 2 });
  roomUserRows.push({ id: 900, roomId: 20, userId: 99, role: 2 });
  userRows.push({ id: 77, email: 'first@example.test', displayName: 'First Member' });
  userRows.push({ id: 78, email: 'second@example.test', displayName: 'Second Member' });
  userRows.push({ id: 99, email: 'other-tenant@example.test', displayName: 'Other Tenant' });
}

beforeEach(() => {
  roomUserRows.length = 0;
  userRows.length = 0;
  roomRows.length = 0;
  sent.mails.length = 0;
  sent.fail = '';
  env.RESEND_API_KEY = 'test-key';
  env.MAIL_FROM = 'sender@configured.test';
  seed();
});

describe('the environment contract', () => {
  it('names exactly what is missing, not both by reflex', () => {
    env.RESEND_API_KEY = '';
    expect(missingMailEnv()).toEqual(['RESEND_API_KEY']);
    expect(new MailEnvMissing(missingMailEnv()).message).toContain('RESEND_API_KEY is not set');

    env.MAIL_FROM = '';
    expect(missingMailEnv()).toEqual(['RESEND_API_KEY', 'MAIL_FROM']);
    expect(new MailEnvMissing(missingMailEnv()).message).toContain('RESEND_API_KEY and MAIL_FROM are not set');
  });

  it('treats whitespace as absent, because a space is not a from-address', () => {
    env.MAIL_FROM = '   ';
    expect(missingMailEnv()).toEqual(['MAIL_FROM']);
  });

  it('refuses both sends loudly when unconfigured, and sends nothing', async () => {
    env.RESEND_API_KEY = '';
    env.MAIL_FROM = '';
    await expect(sendWelcomeEmailToMember(10, 500, ORIGIN)).rejects.toThrow(MailEnvMissing);
    await expect(sendWebinarReminderToRoom(10, 'at 7pm EST', ORIGIN)).rejects.toThrow(
      /RESEND_API_KEY and MAIL_FROM are not set/
    );
    expect(sent.mails).toHaveLength(0);
  });
});

describe('account isolation', () => {
  it('refuses a membership row that belongs to another room', async () => {
    await expect(sendWelcomeEmailToMember(20, 500, ORIGIN)).rejects.toThrow('no such member in this room');
    expect(sent.mails).toHaveLength(0);
  });

  it('never reaches another room on a bulk send', async () => {
    await sendWebinarReminderToRoom(10, 'at 7pm EST', ORIGIN);
    expect(sent.mails.map((m) => m.to)).toEqual(['first@example.test', 'second@example.test']);
    expect(sent.mails.map((m) => m.to)).not.toContain('other-tenant@example.test');
  });
});

describe('the welcome email', () => {
  it('addresses the member and links to the room the page shows', async () => {
    const result = await sendWelcomeEmailToMember(10, 500, ORIGIN);
    expect(result).toEqual({ to: 'first@example.test' });

    const [mail] = sent.mails;
    expect(mail.to).toBe('first@example.test');
    expect(mail.text).toContain('Hello First Member,');
    expect(mail.text).toContain('Room 3627');
    // `/u/<publicId>` is the manage page's own Room Link format, not a second invention.
    expect(mail.text).toContain('https://control.test/u/6a6529b3');
  });

  it('invents no sender, no address and no product name', () => {
    /*
      The copy is OURS — nothing in any capture shows the reference's welcome email — so the bar is
      that it claims nothing. A placeholder address baked into source is the specific failure that
      got an earlier email integration reverted here.
    */
    const mail = welcomeEmail({
      to: 'a@b.test',
      displayName: 'A',
      roomName: 'R',
      roomLink: 'https://control.test/u/1'
    });
    for (const invented of ['noreply@', 'example.com', 'TradingRoomApp', 'The Team', 'Unsubscribe']) {
      expect(mail.subject + mail.text).not.toContain(invented);
    }
  });
});

describe('the webinar reminder', () => {
  it('reproduces the captured preview, with its three placeholders substituted', () => {
    /*
      Verbatim from `evidence-dumps/NEXT-STEP/gaps/rawHtml.html`, the Email Preview <pre>:

        Hello __name__,
        (blank)
        This is a friendly reminder to attend the session "Room 3627".
        We'll get started at FILL TIME ABOVE.
        Please click this link to attend: ______ unique link will be here_____
    */
    const mail = webinarReminderEmail({
      to: 'a@b.test',
      displayName: 'First Member',
      roomName: 'Room 3627',
      eventTime: 'at 7pm EST',
      link: 'https://control.test/room/abc123'
    });

    expect(mail.text.split('\n')).toEqual([
      'Hello First Member,',
      '',
      'This is a friendly reminder to attend the session "Room 3627".',
      "We'll get started at at 7pm EST.",
      'Please click this link to attend: https://control.test/room/abc123'
    ]);
  });

  it('ships none of the preview placeholders to an inbox', async () => {
    await sendWebinarReminderToRoom(10, 'at 7pm EST', ORIGIN);
    for (const mail of sent.mails) {
      expect(mail.text).not.toContain('__name__');
      expect(mail.text).not.toContain('FILL TIME ABOVE');
      expect(mail.text).not.toContain('unique link will be here');
    }
  });

  it('refuses without an event time, since the email is about when it starts', async () => {
    await expect(sendWebinarReminderToRoom(10, '   ', ORIGIN)).rejects.toThrow(/needs an event time/);
    expect(sent.mails).toHaveLength(0);
  });

  it('refuses a room with no Unique Link rather than mailing a broken one', async () => {
    roomRows[0].uniqueSlug = null;
    await expect(sendWebinarReminderToRoom(10, 'at 7pm EST', ORIGIN)).rejects.toThrow(/no Unique Link/);
    expect(sent.mails).toHaveLength(0);
  });

  it('refuses an empty room instead of reporting a successful send of nothing', async () => {
    roomUserRows.length = 0;
    await expect(sendWebinarReminderToRoom(10, 'at 7pm EST', ORIGIN)).rejects.toThrow(/no members/);
  });

  it('reports a PARTIAL send honestly, naming who was refused', async () => {
    /*
      The failure this exists for: 12 delivered, 9 refused, and the page says "done". Nobody finds
      out until the webinar starts and the room is half empty — and there is no unsend to fall back
      on.
    */
    sent.fail = 'second@example.test';
    const result = await sendWebinarReminderToRoom(10, 'at 7pm EST', ORIGIN);

    expect(result.attempted).toBe(2);
    expect(result.sent).toBe(1);
    expect(result.failures).toEqual([{ email: 'second@example.test', reason: expect.stringContaining('422') }]);
    // The first recipient still got theirs; one bad address does not cancel the room.
    expect(sent.mails.map((m) => m.to)).toEqual(['first@example.test']);
  });
});
