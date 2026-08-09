/**
 * The Authorization Mode choices, verbatim from the reference's own select —
 * including the "Registraion" typo, which is theirs.
 *
 * The `sessAuthTypes` array is never rendered in any capture, so the LABELS come
 * from a screenshot of the open dropdown and the VALUES are pinned from the
 * `ng-show` expressions that gate each mode's settings:
 *
 *   registrationA  the registration block, "A" for automatic — the label says
 *                  users "join automatically after they register"
 *   registrationM  the same block, "M" for the MANUAL approval the label names
 *   webinarRoom    gates Room Password / Temp Room Password — the password mode
 *   unamePW        username + password per user
 *   open           gates the Room Link block; the captured room is set to this
 *   jwt / sso      see below
 *
 * One genuine ambiguity, resolved rather than guessed at: the reference gates the
 * JWT settings on `authMode=='jwt'` but the SSO Setup TAB on `authMode=='sso'`,
 * while offering a single "SSO (JWT)" choice. Those are the same mode with two
 * spellings in their codebase. So the value written is 'sso' and every gate here
 * accepts either, which is correct whichever one their server stores.
 */
export const AUTH_MODES = [
  {
    value: 'sso',
    text: 'SSO (JWT)  - Single Sign On using Wordpress/PHP/Other JWT method'
  },
  { value: 'open', text: 'Open - Anyone with the room link can join with their email & name' },
  {
    value: 'registrationA',
    text: 'WEBINAR STYLE - Users get sent a unique link to join automatically after they register'
  },
  {
    value: 'registrationM',
    text: 'Registraion with MANUAL approval. You approve each registration before users get a unique link'
  },
  { value: 'webinarRoom', text: 'Unique link & password (optional)' },
  { value: 'unamePW', text: 'Unique email/pw for each user' },
  { value: 'closed', text: 'Closed - Nobody can use this room while in closed mode' }
] as const;

export type AuthMode = (typeof AUTH_MODES)[number]['value'];

/** both spellings of the single SSO mode */
export const isSsoMode = (m: unknown) => m === 'sso' || m === 'jwt';
export const isRegistrationMode = (m: unknown) => m === 'registrationA' || m === 'registrationM';
/** the modes that show the Room / Vanity / Unique link block */
export const showsRoomLinks = (m: unknown, allowPwWithSso: unknown) =>
  m === 'webinarRoom' || m === 'open' || m === 'unamePW' || Boolean(allowPwWithSso);
/** the modes that take a room password */
export const usesRoomPassword = (m: unknown, allowPwWithSso: unknown) => m === 'webinarRoom' || Boolean(allowPwWithSso);

/**
 * The Room Type choices. Only 'webinar' is named in the evidence — it is what
 * `ng-show="sess.roomType=='webinar'"` tests for — and the alternative is simply
 * unset, which every room in the captures is. The reference's own selector is
 * commented out, so no further values are invented.
 */
export const ROOM_TYPES = [
  { value: '', text: 'Standard room' },
  { value: 'webinar', text: 'Webinar — adds a scheduled date and the reminder emails' }
] as const;
