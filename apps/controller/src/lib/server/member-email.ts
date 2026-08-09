import { eq } from 'drizzle-orm';
import { MAIL_FROM, RESEND_API_KEY } from '$app/env/private';
import { getDb } from './db';
import { rooms } from './db/schema';
import { getMemberContact, listMemberContacts } from './rooms';
import { sendMail, type Mail } from './mail';

/**
 * The two emails the manage page sends: `sendWelcomeEmail(user._id,…)` from the row menu, and
 * `sendWeminarEmailReminder(webinarTimeTxt)` from the webinar block's "Send Emails Now".
 *
 * ## One transport, not two
 *
 * Everything goes through {@link sendMail}, the Resend seam `email-verification.ts` already uses.
 * A second transport would mean a second set of credentials, a second thing to configure and a
 * second place for "the email never arrived" to hide.
 *
 * ## Loud when unconfigured
 *
 * `sendMail` throws {@link MailNotConfigured} for a missing transport, which names both variables
 * whichever one is absent. {@link assertMailConfigured} is checked FIRST and names exactly the
 * missing ones, because "set RESEND_API_KEY and MAIL_FROM" sends somebody to re-check a value that
 * was already right. Neither path no-ops and neither reports a send that did not happen.
 *
 * **As of this commit nothing can be sent**: there is no provider account and no mailbox on a
 * domain with DKIM/SPF. That is the owner's to provision — there is deliberately no default
 * address anywhere in this file, because a plausible-looking one is accepted by the provider and
 * dropped by the recipient, which is worse than an obvious refusal.
 *
 * ## What is matched and what is ours
 *
 * The reminder body IS the reference's, verbatim — it renders its own template in a preview `<pre>`
 * on the manage page and that markup is captured
 * (`evidence-dumps/NEXT-STEP/gaps/rawHtml.html`, the Email Preview block). Its three variable parts
 * are visible in the capture: `__name__`, the room name (the `<pre>` carries `class="ng-binding"`
 * and reads `"Room 3627"`, the captured room's real title) and `webinarTimeTxt`, bound into the
 * `<strong>` beside the `FILL TIME ABOVE` placeholder.
 *
 * The reminder's SUBJECT is not captured — the preview shows the body only — and the welcome email
 * is not captured at all, in any form: `sendWelcomeEmail` is server-side and appears in no dump.
 * Both are written here to be plain and true rather than to imitate something unobserved, and
 * neither claims to match.
 */

/** Which half of the mail contract is missing. Empty means mail can be sent. */
export function missingMailEnv(): string[] {
  return [RESEND_API_KEY?.trim() ? null : 'RESEND_API_KEY', MAIL_FROM?.trim() ? null : 'MAIL_FROM'].filter(
    (name): name is string => name !== null
  );
}

export class MailEnvMissing extends Error {
  constructor(missing: string[]) {
    super(
      `Outbound email is not configured on this deployment: ${missing.join(' and ')} ${
        missing.length === 1 ? 'is' : 'are'
      } not set.`
    );
    this.name = 'MailEnvMissing';
  }
}

export function assertMailConfigured(): void {
  const missing = missingMailEnv();
  if (missing.length > 0) throw new MailEnvMissing(missing);
}

/**
 * The welcome email's copy.
 *
 * OURS, entirely. Nothing in any capture reveals what the reference sends here, so this states the
 * facts the recipient needs — which room, and how to get into it — and nothing else. No product
 * pitch, no invented sender name, no signature block naming a company nobody has confirmed.
 */
export function welcomeEmail(input: { to: string; displayName: string; roomName: string; roomLink: string }): Mail {
  return {
    to: input.to,
    subject: `You have access to "${input.roomName}"`,
    text: [
      `Hello ${input.displayName},`,
      '',
      `You have been added to the session "${input.roomName}".`,
      '',
      'You can join it here:',
      input.roomLink,
      '',
      'If you were not expecting this, you can ignore this message.'
    ].join('\n')
  };
}

/**
 * The webinar reminder's copy — the reference's own preview text, reproduced.
 *
 * Line for line from the captured `<pre>`:
 *
 *     Hello __name__,
 *     (blank)
 *     This is a friendly reminder to attend the session "Room 3627".
 *     We'll get started at FILL TIME ABOVE.
 *     Please click this link to attend: ______ unique link will be here_____
 *
 * `__name__` is the reference's own placeholder token, so it is substituted rather than shipped.
 * `FILL TIME ABOVE` is the empty state of the `webinarTimeTxt` binding — the capture shows the two
 * `<strong>` siblings, one `ng-show="!webinarTimeTxt"` and one bound and `ng-hide`-den — so the
 * event time replaces it and the placeholder never reaches an inbox. The link placeholder is
 * likewise replaced by a real link; the apostrophe in `We'll` is the ASCII one the capture uses.
 *
 * The subject is not in the capture and is ours.
 */
export function webinarReminderEmail(input: {
  to: string;
  displayName: string;
  roomName: string;
  eventTime: string;
  link: string;
}): Mail {
  return {
    to: input.to,
    subject: `Reminder: "${input.roomName}"`,
    text: [
      `Hello ${input.displayName},`,
      '',
      `This is a friendly reminder to attend the session "${input.roomName}".`,
      `We'll get started at ${input.eventTime}.`,
      `Please click this link to attend: ${input.link}`
    ].join('\n')
  };
}

/**
 * The room row the two links are built from.
 *
 * `publicId` is what every link on the manage page uses and it falls back to the numeric id exactly
 * as the loader does, so the address in the email is the address on the screen.
 */
async function roomForEmail(roomId: number) {
  const [room] = await getDb()
    .select({ id: rooms.id, name: rooms.name, publicId: rooms.publicId, uniqueSlug: rooms.uniqueSlug })
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1);
  if (!room) throw new Error('room not found');
  return room;
}

/** `sendWelcomeEmail(user._id, user.userName, $index)` — one member, one message. */
export async function sendWelcomeEmailToMember(
  roomId: number,
  roomUserId: number,
  origin: string
): Promise<{ to: string }> {
  assertMailConfigured();
  // Scoped lookup first: a row id belonging to another tenant's room never becomes an address.
  const member = await getMemberContact(roomId, roomUserId);
  const room = await roomForEmail(roomId);

  await sendMail(
    welcomeEmail({
      to: member.email,
      displayName: member.displayName,
      roomName: room.name,
      roomLink: `${origin}/u/${room.publicId ?? String(room.id)}`
    })
  );
  return { to: member.email };
}

/** One recipient's fate. A bulk send that reports only a total cannot answer "who missed it". */
export interface ReminderFailure {
  email: string;
  reason: string;
}

/**
 * `sendWeminarEmailReminder(webinarTimeTxt)` — the "Send Emails Now" button.
 *
 * The most destructive control on the page: it mails every member of the room and there is no
 * unsend. Three things follow from that, and all three are structural rather than advisory.
 *
 *  - **It refuses before it starts** if mail is unconfigured, if the event time is blank, if the
 *    room has no Unique Link, or if the room has no members. Each refusal names its own cause; a
 *    blanket "could not send" would send somebody looking in the wrong place.
 *  - **It never claims more than it did.** Sends are sequential and each result is recorded
 *    separately, so a provider that starts refusing halfway through yields "12 sent, 9 failed" with
 *    the nine addresses — not a success, and not a failure that hides the twelve already delivered.
 *  - **The link is real.** The reference's preview says "unique link will be here" and nothing in
 *    the capture says whether that link is per-recipient or per-room, so the room's own Unique Link
 *    — the one `setUniqueRoomURL` generates and the page displays — is used, and a room without one
 *    is refused rather than mailed a broken address.
 */
export async function sendWebinarReminderToRoom(
  roomId: number,
  eventTime: string,
  origin: string
): Promise<{ attempted: number; sent: number; failures: ReminderFailure[] }> {
  assertMailConfigured();

  const time = eventTime.trim();
  if (!time) throw new Error('The reminder needs an event time; the email says when it starts.');

  const room = await roomForEmail(roomId);
  if (!room.uniqueSlug) {
    throw new Error('This room has no Unique Link yet. Generate one first — the reminder links to it.');
  }
  const link = `${origin}/room/${room.uniqueSlug}`;

  const members = await listMemberContacts(roomId);
  if (members.length === 0) throw new Error('This room has no members to remind.');

  let sent = 0;
  const failures: ReminderFailure[] = [];
  for (const member of members) {
    try {
      await sendMail(
        webinarReminderEmail({
          to: member.email,
          displayName: member.displayName,
          roomName: room.name,
          eventTime: time,
          link
        })
      );
      sent++;
    } catch (cause) {
      // Recorded, not swallowed and not fatal: one bad address must not cancel the rest of the room.
      failures.push({ email: member.email, reason: cause instanceof Error ? cause.message : String(cause) });
    }
  }

  return { attempted: members.length, sent, failures };
}
