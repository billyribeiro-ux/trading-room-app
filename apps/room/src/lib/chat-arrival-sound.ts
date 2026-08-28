/**
 * Which sound an arriving chat message plays, if any.
 *
 * ## The transcription
 *
 * Bytes 1,431,949 (main chat) and 2,378,381 (extra chat) — the same expression in both:
 *
 * ```js
 * if (!preferences.doNotDisturbOn && preferences.chatSoundOn) {
 *   const { followedUsers } = globals;
 *   try {
 *     followedUsers && Object.keys(followedUsers).length > 0
 *       && followedUsers[e.avt].followChatStyle.playSound
 *       ? soundEffects.pling.play()
 *       : ( globals.playChatMessageSoundFor
 *             && globals.playChatMessageSoundFor.length > 0
 *             && hashEmail(globals.user.email) !== e.avt
 *             && globals.playChatMessageSoundFor.includes(e.avt)
 *           || globals.sessData.dingOnNewMessage
 *             && hashEmail(globals.user.email) !== e.avt
 *         ) && soundEffects.followed.play();
 *   } catch { console.log("Error in chat.component for chatSoundOn") }
 * }
 * ```
 *
 * The two sound NAMES are the reference's and they are confusing on purpose: `pling` is the
 * followed-user sound, and the file called `followed` is what an ORDINARY new message plays.
 *
 * ## Why this is a module and not four lines in the event router
 *
 * It is a rule with five inputs and three outcomes, and it lived inside a 900-line dispatcher where
 * the only way to reach it was to construct an `EventSource`, a media transport, a private-command
 * router and nine other collaborators. A rule nobody can call is a rule nobody tests, which is how
 * the per-member list sat unimplemented behind a paragraph explaining why.
 *
 * ## THE UPSTREAM `try/catch` IS HIDING A REAL DEFECT, and this is where it is not reproduced
 *
 * `Object.keys(followedUsers).length > 0 && followedUsers[e.avt].followChatStyle.playSound` reads
 * the map with the SENDER's hash after checking only that the map is non-empty. So the moment a
 * member follows one person, every message from somebody they do NOT follow evaluates
 * `undefined.followChatStyle` and throws — caught, logged, and the whole block abandoned.
 *
 * **The effect is that `dingOnNewMessage` and the per-member list both go silent for a member who
 * follows anybody at all.** Not intermittently: for every message from every non-followed sender.
 * An optional lookup is all it takes, and it is what this function does.
 */
export interface ArrivalSoundInput {
  /** `preferences.doNotDisturbOn`. */
  readonly doNotDisturb: boolean;
  /** `preferences.chatSoundOn`. */
  readonly chatSoundOn: boolean;
  /**
   * `followedUsers[e.avt]?.followChatStyle.playSound` — already looked up, and OPTIONALLY.
   *
   * Passed resolved rather than as the whole map, so the one lookup that can throw upstream happens
   * at the call site with an optional chain and cannot be written any other way here.
   */
  readonly followedSenderPlaysSound: boolean;
  /** `sessData.dingOnNewMessage` — the room-wide ding. */
  readonly dingOnNewMessage: boolean;
  /** `e.avt`, the sender's email hash. Absent means a frame that carried none. */
  readonly senderEmailHash: string | undefined;
  /**
   * `globals.playChatMessageSoundFor` — member email HASHES, derived on the controller.
   *
   * Hashes and never addresses: the setting holds raw emails and does not cross. See
   * `RoomConfig.chatSoundForEmailHashes`.
   */
  readonly chatSoundForEmailHashes: readonly string[] | undefined;
}

/** `pling` for a followed sender, `followed` for an ordinary ding, `null` for silence. */
export type ArrivalSound = 'pling' | 'followed' | null;

export function arrivalSoundFor(input: ArrivalSoundInput): ArrivalSound {
  // The outer gate. Do-not-disturb wins over everything, including a followed user.
  if (input.doNotDisturb || !input.chatSoundOn) return null;

  // A followed user wins, and plays a DIFFERENT sound. The only branch that does.
  if (input.followedSenderPlaysSound) return 'pling';

  /*
    The per-member list OR the room-wide ding — the reference's own `||`, and either alone is
    enough. The "not my own message" term both branches carry is NOT here: the caller drops its own
    echo before it gets this far, and a second copy of that rule is a second thing to keep in step.
  */
  const onTheList =
    input.senderEmailHash !== undefined &&
    input.chatSoundForEmailHashes?.includes(input.senderEmailHash) === true;

  return onTheList || input.dingOnNewMessage ? 'followed' : null;
}
