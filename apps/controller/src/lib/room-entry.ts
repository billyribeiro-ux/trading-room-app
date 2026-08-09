/**
 * Who may enter a room, and on what terms.
 *
 * Every rule here is transcribed from the reference's own conditional logic — the `ng-show` guards
 * on its Settings tab and the help text beside each field, extracted whole in
 * `docs/OUTSTANDING.md` §1g. Nothing is invented: a setting with no observed behaviour is listed in
 * {@link UNENFORCED_SETTINGS} rather than given one.
 *
 * It is a pure module for the same reason `roster-gates.ts` is: these are the predicates that
 * decide whether somebody gets into a paying customer's room, and a predicate only reachable by
 * rendering a route is a predicate nobody tests.
 */

/**
 * The seven modes, proven rather than inferred.
 *
 * These are the exact string literals the reference compares against in its own guards, so the set
 * is complete:
 *
 * ```
 * ng-show="sess.authMode=='jwt'"
 * ng-show="sess.authMode=='webinarRoom' || sess.allowPWLoginWithSSO"
 * ng-show="sess.authMode=='webinarRoom' || sess.authMode=='unamePW' || sess.allowPWLoginWithSSO"
 * ng-show="sess.authMode=='registrationA' || sess.authMode=='registrationM'"
 * ng-show="sess.authMode=='webinarRoom' || 'open' || 'unamePW' || sess.allowPWLoginWithSSO"
 * ng-show="sess.authMode=='sso'"
 * ```
 *
 * What is NOT proven is each mode's human-readable label; `sessAuthTypes` is controller-side JS and
 * never rendered. One label is known, from the captured room's own value: `open` renders as
 * "Open - Anyone with the room link can join with their email & name".
 */
export const AUTH_MODES = ['open', 'webinarRoom', 'unamePW', 'registrationA', 'registrationM', 'sso', 'jwt'] as const;

export type AuthMode = (typeof AUTH_MODES)[number];

/**
 * The captured room's `authMode` is `open`, and an unset setting means unset rather than invalid.
 *
 * An unrecognised value falls back to `open` deliberately: the alternative is refusing everybody
 * from a room whose settings blob has one bad string, and `open` is the mode the reference itself
 * ships a fresh room in.
 */
export function resolveAuthMode(value: unknown): AuthMode {
  return (AUTH_MODES as readonly string[]).includes(String(value ?? '')) ? (String(value) as AuthMode) : 'open';
}

/**
 * Whether this mode has a room password at all.
 *
 * Straight from the guard that gates `webinarPW`, `webinarPW2` and `webinarPW3`:
 * `ng-show="sess.authMode=='webinarRoom' || sess.allowPWLoginWithSSO"`.
 *
 * This is a behaviour fix, not only a transcription. `(public)/session/[code]` checked `webinarPW`
 * in EVERY mode, so an `open` room that happened to carry a stale password in its settings blob
 * demanded it at the door — a room the owner believes is open, refusing everybody.
 */
export function acceptsRoomPassword(mode: AuthMode, allowPWLoginWithSSO: boolean): boolean {
  return mode === 'webinarRoom' || allowPWLoginWithSSO;
}

/**
 * Whether this mode has a free-trial password.
 *
 * `ng-show="sess.authMode=='webinarRoom' || sess.authMode=='unamePW' || sess.allowPWLoginWithSSO"`
 * — a wider set than the room passwords above, which is why it is a separate predicate rather than
 * a branch inside one.
 */
export function acceptsFreeTrialPassword(mode: AuthMode, allowPWLoginWithSSO: boolean): boolean {
  return mode === 'webinarRoom' || mode === 'unamePW' || allowPWLoginWithSSO;
}

/** Registration happens on `/r/<publicId>`, not at the room door. */
export function isRegistrationMode(mode: AuthMode): boolean {
  return mode === 'registrationA' || mode === 'registrationM';
}

/** The settings this module reads. All optional: absent means unset, and unset means off. */
export interface RoomEntrySettings {
  authMode?: unknown;
  allowPWLoginWithSSO?: boolean;
  /** "Give this password to your registered members." */
  webinarPW?: string | null;
  /** "Temp password/additional pw.. Works in addition to the other passwords" */
  webinarPW2?: string | null;
  /** "Temp password 2/additional pw.. Works in addition to the other passwords" */
  webinarPW3?: string | null;
  /** "Give this password to your free trial users." */
  webinarPWFreeTrial?: string | null;
  /** "(Coma separated list of filters, i.e. 'SO_,SS_,John Carter, etc...'" */
  nickFilter?: string | null;
  /** "User will need to enter a valid phone number to enter" */
  hasRequiredPhoneInLogin?: boolean;
  /** "Leave blank to let all members in, Set it to something complex like '5081b73…'" */
  secTok?: string | null;
  /** ptr1 caps[0]: `<label>Comma separated list of banned IPs</label>` */
  banIPList?: string | null;
  /** "If session is locked, nobody will be able to log in..." */
  isLocked?: boolean;
  /** "If set, Users will need to agree to thisDisclosure to enter." */
  customEnterDisclosure?: string | null;
  /** "On the login error it will display this message to users" */
  loginErrorMsg?: string | null;
  /** "On the login error it will redirect users to this url" */
  loginErrorURL?: string | null;
}

export interface RoomEntryAttempt {
  name: string;
  email: string;
  phone: string;
  password: string;
  /** The `secTok` presented, normally from the query string of a generated link. */
  secretToken?: string;
  /** Whether the visitor ticked the disclosure, when the room sets one. */
  agreedToDisclosure?: boolean;
  /** Best-effort client address for `banIPList`. Absent means we could not determine one. */
  remoteIp?: string | null;
  /** The room's own open/closed state, which is not a setting. */
  roomState: string;
}

export type EntryRefusal =
  | 'room-locked'
  | 'room-closed'
  | 'ip-banned'
  | 'name-required'
  | 'name-filtered'
  | 'email-invalid'
  | 'phone-required'
  | 'password-required'
  | 'password-wrong'
  | 'secret-token-wrong'
  | 'disclosure-required';

export type EntryDecision =
  | {
      ok: true;
      /**
       * True when entry was granted by `webinarPWFreeTrial` rather than a room password. The
       * reference has a separate password for trials and a `TRIAL` badge on the member row, so the
       * membership must be marked — otherwise the two passwords would be interchangeable.
       */
      asFreeTrial: boolean;
    }
  | {
      ok: false;
      reason: EntryRefusal;
      /** `loginErrorMsg` when the room sets one, otherwise a specific, honest default. */
      message: string;
      /** `loginErrorURL` when the room sets one. The caller redirects instead of rendering. */
      redirectTo: string | null;
    };

/** "Coma separated" throughout the reference's help text, and blank entries are not filters. */
export function commaList(value: string | null | undefined): string[] {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * The room's passwords, in the order the reference describes them.
 *
 * `webinarPW2` and `webinarPW3` are documented as working "in addition to the other passwords", so
 * this is a set membership test, not a precedence chain. The free-trial password is deliberately
 * checked LAST and reported separately: if an owner sets the same string for both, the visitor gets
 * the more privileged answer rather than being silently marked a trial.
 */
export function matchPassword(
  settings: RoomEntrySettings,
  mode: AuthMode,
  presented: string
): 'member' | 'free-trial' | 'no-match' | 'none-configured' {
  const allowSso = settings.allowPWLoginWithSSO === true;

  const memberPasswords = acceptsRoomPassword(mode, allowSso)
    ? [settings.webinarPW, settings.webinarPW2, settings.webinarPW3].map((value) => String(value ?? '')).filter(Boolean)
    : [];

  const trialPassword = acceptsFreeTrialPassword(mode, allowSso) ? String(settings.webinarPWFreeTrial ?? '') : '';

  if (memberPasswords.length === 0 && !trialPassword) return 'none-configured';
  if (memberPasswords.includes(presented)) return 'member';
  if (trialPassword && presented === trialPassword) return 'free-trial';
  return 'no-match';
}

/**
 * Whether a client address is on the room's ban list.
 *
 * Exact string comparison, deliberately. The evidence is "Comma separated list of banned IPs" and
 * nothing more — no CIDR, no wildcards — and inventing prefix matching here would silently ban a
 * wider range than the owner typed. A range syntax needs its own evidence.
 */
export function isBannedIp(banList: string | null | undefined, remoteIp: string | null): boolean {
  if (!remoteIp) return false;
  return commaList(banList).includes(remoteIp.trim());
}

/**
 * The whole door, as one ordered decision.
 *
 * Order is not arbitrary. Absolute refusals that do not depend on what was typed come first, so a
 * locked room or a banned address never reveals whether a password was right. Credentials come
 * after identity, and the disclosure last, because agreeing to terms for a room that would have
 * refused you anyway is a pointless thing to ask.
 */
export function decideRoomEntry(settings: RoomEntrySettings, attempt: RoomEntryAttempt): EntryDecision {
  const mode = resolveAuthMode(settings.authMode);
  const redirectTo = String(settings.loginErrorURL ?? '').trim() || null;
  const custom = String(settings.loginErrorMsg ?? '').trim();
  const refuse = (reason: EntryRefusal, fallback: string): EntryDecision => ({
    ok: false,
    reason,
    message: custom || fallback,
    redirectTo
  });

  if (settings.isLocked === true) {
    return refuse('room-locked', 'This room is locked.');
  }
  if (attempt.roomState !== 'open') {
    return refuse('room-closed', 'This room is closed.');
  }
  if (isBannedIp(settings.banIPList, attempt.remoteIp ?? null)) {
    return refuse('ip-banned', 'This room is not available.');
  }

  const name = attempt.name.trim();
  if (!name) return refuse('name-required', 'Please enter a name.');
  if (commaList(settings.nickFilter).some((f) => f.toLowerCase() === name.toLowerCase())) {
    return refuse('name-filtered', 'That name is not allowed in this room.');
  }

  const email = attempt.email.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return refuse('email-invalid', 'A valid email is required.');
  }

  if (settings.hasRequiredPhoneInLogin === true && !attempt.phone.trim()) {
    return refuse('phone-required', 'A phone number is required for this room.');
  }

  /*
    "Leave blank to let all members in" — so an unset token is not a gate. When it IS set the
    presented value must match exactly, and a missing one is a mismatch rather than a pass.
  */
  const secretToken = String(settings.secTok ?? '').trim();
  if (secretToken && (attempt.secretToken ?? '') !== secretToken) {
    return refuse('secret-token-wrong', 'This room link is not valid.');
  }

  let asFreeTrial = false;
  const matched = matchPassword(settings, mode, attempt.password);
  if (matched !== 'none-configured') {
    if (!attempt.password) return refuse('password-required', 'This room requires a password.');
    if (matched === 'no-match') {
      return refuse('password-wrong', 'That room password is not correct.');
    }
    asFreeTrial = matched === 'free-trial';
  }

  if (String(settings.customEnterDisclosure ?? '').trim() && attempt.agreedToDisclosure !== true) {
    return refuse('disclosure-required', 'You must agree to the disclosure to enter.');
  }

  return { ok: true, asFreeTrial };
}

/**
 * Settings this module deliberately does NOT enforce, and what each one needs first.
 *
 * Listed as data so it is impossible to believe a gate exists when it does not. Every one of these
 * is stored, editable and shown in the manage UI; none of them changes who gets in yet.
 */
export const UNENFORCED_SETTINGS: ReadonlyArray<{ name: string; needs: string }> = [
  {
    name: 'allowedMemberships',
    needs:
      'An identity that carries memberships. Only an SSO or JWT arrival has claims to filter on, and neither is built; enforcing it against an email-only guest would refuse everybody.'
  },
  {
    name: 'allowedProducts',
    needs: 'The same claim source. Help text: "Either a product or membership, or both must match".'
  },
  {
    name: 'allowedPerms',
    needs: 'The same claim source. Permissions here are the identity provider\u2019s, not the five per-room ones.'
  },
  {
    name: 'disalowMultiLogins',
    needs:
      'A live per-room presence count. The room owns connections, not the controller, so this belongs on the room side of the seam.'
  },
  {
    name: 'disalowSporadicMultiLogins',
    needs: 'Reconnect timing within a short window, which only the room observes because it holds the socket.'
  },
  {
    name: 'openLoginLink',
    needs: 'A client-side hook: "it will open the link set in this setting on a new tab" on success.'
  },
  {
    name: 'login_webhook_url',
    needs: 'An outbound HTTP call on success, with its own timeout and failure policy.'
  },
  {
    name: 'logout_webhook_url',
    needs:
      'The same outbound call on logout, plus a logout event the controller can observe — today the room owns the session that ends.'
  }
];
