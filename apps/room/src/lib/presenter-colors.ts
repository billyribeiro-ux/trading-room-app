/**
 * `savePresenterColors` — the per-presenter message colours every viewer in the room sees.
 *
 * ## The defect this closes
 *
 * The settings modal has drawn two `<input type="color">` pickers under this heading since it was
 * built:
 *
 * > *These colors will affect how ALL USERS see your messages and alerts*
 *
 * and the Save button beneath them wrote `onPreferenceChange('presenterStyle', { color, bkgColor })`
 * — a key in the presenter's OWN settings blob, read by nothing, in a store no other viewer can
 * see. The heading was false in all three of its claims at once: the colours did not affect all
 * users, they did not affect messages, and they did not affect alerts. Reopening the modal showed
 * the constant the pickers were seeded from, whatever had been picked. `presenterStyle` joins
 * `dead-preference-keys.ts` with the two Text Mode radios it is the third example of.
 *
 * ## The reference, read rather than recalled
 *
 * Four separate sites in `main.d1d09071be31f1ba.js`, and the whole feature is in them.
 *
 * **The send** (byte 2,243,496):
 *
 * ```js
 * savePresenterStyle() {
 *   this.appService.sendServerAdminCommand("savePresenterColors", {
 *     key: this.appService.hashEmail(this.appService.globals.user.email),
 *     val: { bkgColor: this.presenterStyle.bgColor, color: this.presenterStyle.color }
 *   })
 * }
 * resetPresenterStyle() {
 *   this.presenterStyle = {
 *     color:   globals.presenterStyle[globals.preferences.theme].color,
 *     bgColor: globals.presenterStyle[globals.preferences.theme].bgColor
 *   },
 *   this.appService.sendServerAdminCommand("savePresenterColors", {
 *     key: this.appService.hashEmail(this.appService.globals.user.email),
 *     val: { bkgColor: "", color: "" }
 *   })
 * }
 * ```
 *
 * So Reset is not a local revert — it is a SEND, of the empty pair, and that is what clears the
 * presenter's entry for everyone. Ours had no send at all: it assigned two locals and stopped.
 *
 * **The broadcast** (byte 1,025,162):
 *
 * ```js
 * case "presenterColorsChanged":
 *   this.globals.sessData.presenterSettings = i.colors,
 *   this.guiEventBus.emit("redrawChatAndAlerts"); break;
 * ```
 *
 * The whole map is replaced and both logs redraw. It arrives on the same channel as
 * `changeChatMode`, and like that one it is a TRIGGER here rather than a payload — see
 * `events.svelte.ts`.
 *
 * **The seed** (byte 2,241,150, on opening the modal; byte 2,254,236 repeats it verbatim on a theme
 * switch):
 *
 * ```js
 * if (globals.isPresenter) {
 *   this.presenterStyle = { color: "#1a1a1a", bgColor: "#e8e8e8" };
 *   const e = presenterSettings && presenterSettings[hashEmail(user.email)]
 *           ? presenterSettings[hashEmail(user.email)] : null;
 *   e && e.hasOwnProperty("color") && e.hasOwnProperty("bkgColor")
 *     && "" !== e.color && "" !== e.bkgColor
 *     && (this.presenterStyle = { color: e.color, bgColor: e.bkgColor })
 * }
 * ```
 *
 * **The render** (byte 1,346,945, inside the shared message component's `ngOnInit`):
 *
 * ```js
 * if (globals.sessData.presenterSettings) {
 *   const o = globals.sessData.presenterSettings[this.msg.avt];
 *   o && o.color && o.bkgColor && (this.presenterColors = o),
 *   this.presenterColors && (
 *     this.invertTxtColor = { color: this.presenterColors.bkgColor, filter: "invert(1)" },
 *     this.styleB = { "background-color": this.presenterColors.bkgColor },
 *     this.styleF.color = this.presenterColors.color)
 * }
 * ```
 *
 * `msg.avt` is the sender's hashed email — the same key `followedUsers[this.msg.avt]` is looked up
 * by four lines later, which is `senderEmailHash` here.
 *
 * ## THE RENDER PRECEDENCE, which is the part that is easy to get wrong
 *
 * Four writers touch the same three style slots in `ngOnInit`, in this order, each overwriting the
 * one before:
 *
 * | # | source | wins over |
 * | - | ------ | --------- |
 * | 1 | `msg.bkgColor` / `msg.fontColor` — the message row's own colours | — |
 * | 2 | `presenterSettings[msg.avt]` — THIS feature | 1 |
 * | 3 | `localStorage.chatStyle` — the viewer's own chat style | 1, but **not** 2 |
 * | 4 | `followedUsers[msg.avt].followChatStyle` — the viewer's per-followed-user override | all |
 *
 * Step 3 is the subtle one. It does not simply run last and win: it branches on whether step 2
 * fired, and when it did, it re-applies the presenter's two colours and takes only `fontSize` from
 * the viewer's style. So the presenter's colours beat the viewer's own chat style, and the viewer's
 * explicit decision to follow a particular person beats the presenter's colours. Both of those are
 * the right way round — a presenter branding their own messages should not be overruled by a
 * default, and a viewer who has deliberately colour-coded one trader should not have that silently
 * undone.
 *
 * This room reaches the same order by plugging the presenter's pair in exactly where step 1 sits:
 * `RoomMessage` already treats a message's own `backgroundColor` as beating `chatStyle` (the
 * `!item.backgroundColor` term in `effectiveStyle`) and already loses to `followedStyle`. Overriding
 * step 1 therefore produces steps 2, 3 and 4 with no new branch — which is what the reference is
 * doing too: `presenterColors` overwrites the same three assignments `msg.bkgColor` made.
 *
 * **One difference is real and is not papered over.** When the presenter's colours apply AND the
 * viewer has a chat style, the reference still takes `fontSize` from that chat style; ours does not,
 * because a message carrying its own background has never taken a font size here either. That is a
 * property of this room's existing `effectiveStyle` gate rather than of this feature, it applies
 * identically to the message-background case that has shipped for months, and changing it would
 * alter every captured message's rendering. Left alone deliberately, recorded here so the next
 * reader does not "fix" a divergence that was measured.
 *
 * ## The authority divergence, which is deliberate and load-bearing
 *
 * The reference's client sends the key: `{ key: hashEmail(user.email), val: … }`. That is a client
 * asserting WHOSE colours it is writing, and a member who can reach the socket can therefore write
 * a presenter's row. This room derives the key on the server from the session — see
 * `presenter-colors.remote.ts`. The payload carries the two colours and nothing else. This is the
 * same rule the 2026-08-07 privilege escalation was fixed by, and it is why the wire shape here
 * intentionally does not match.
 */

/**
 * One presenter's pair, as the room renders it.
 *
 * Deliberately NOT `FollowChatStyle`. That type carries `usernameColor`, `tickerColor`, `fontSize`
 * and `playSound`, and the reference's presenter entry has exactly two fields — widening it here
 * would invent four values nothing produces and hand the renderer defaults that look like settings.
 */
export interface PresenterColors {
  /** The message BODY colour. The reference's `val.color`. */
  readonly color: string;
  /** The message BACKGROUND colour. The reference's `val.bkgColor` — its spelling, not a typo. */
  readonly bgColor: string;
}

/** The room's whole map: sender email hash → that presenter's pair. */
export type PresenterColorMap = Readonly<Record<string, PresenterColors>>;

/**
 * `#rrggbb`, lower- or upper-case, and nothing else.
 *
 * `<input type="color">` produces exactly this form — the HTML standard defines its value as a
 * "simple color", seven characters, always fully expanded. So the strict pattern is not a
 * restriction on the control; it is the control's own output written down, which makes anything
 * else a caller that is not the control.
 *
 * The reference's own dark default is `"#000"`, three digits, and could not round-trip through its
 * own picker — the input would coerce it to `#000000` on first paint. That is why
 * {@link PRESENTER_COLOR_DEFAULTS} expands it rather than transcribing the literal.
 */
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Whether a string is a colour this room will store and render. */
export function isPresenterColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

/**
 * `globals.presenterStyle`, byte 980,538 — the two theme defaults, transcribed.
 *
 * ```js
 * this.presenterStyle = {
 *   lightTheme: { color:"#1a1a1a", tickerColor:"#1a1a1a", usernameColor:"#365d7d", bgColor:"#e8e8e8", fontSize:"13" },
 *   darkTheme:  { color:"#f7fd37", tickerColor:"#f7fd37", usernameColor:"#c0d8ed", bgColor:"#000",   fontSize:"13" }
 * }
 * ```
 *
 * Only the two fields this feature has are kept; the other three belong to `chat-style.ts`.
 *
 * ## The reference disagrees with itself here, and this resolves it toward its own table
 *
 * Opening the modal seeds the pickers with the LIGHT pair hardcoded (`{color:"#1a1a1a",
 * bgColor:"#e8e8e8"}`, byte 2,241,150) whatever the theme is, while its Reset button reads
 * `globals.presenterStyle[theme]` (byte 2,243,603). A presenter on the dark theme therefore opens
 * the modal on light-theme colours and presses Reset to get different ones. The table is the
 * considered answer of the two — it is the one that has a dark entry at all — so both the seed and
 * the reset read it here. Stated as a decision, not a match.
 */
export const PRESENTER_COLOR_DEFAULTS: Readonly<Record<'light' | 'dark', PresenterColors>> = {
  light: { color: '#1a1a1a', bgColor: '#e8e8e8' },
  /* `#000` in the capture. Expanded because a colour input cannot hold the short form — see HEX_COLOR. */
  dark: { color: '#f7fd37', bgColor: '#000000' }
};

/**
 * The pair a message renders with, or `undefined` for "this sender has no override".
 *
 * Both halves must be present and non-empty, which is the reference's own `o && o.color &&
 * o.bkgColor` test rather than a defensive extra: the empty pair IS the wire's way of saying
 * "cleared", so a half-set entry must render as no entry rather than as a black-on-nothing message.
 * The colours are re-validated on the way out even though the command validated them on the way in,
 * because this map arrives at the browser as JSON from a page load and a renderer that interpolates
 * an unvalidated string into a `style=` attribute is a renderer one storage bug away from being an
 * injection point.
 */
export function presenterColorsFor(
  map: PresenterColorMap | null | undefined,
  senderEmailHash: string
): PresenterColors | undefined {
  const entry = map?.[senderEmailHash];
  if (!entry) return undefined;
  if (!isPresenterColor(entry.color) || !isPresenterColor(entry.bgColor)) return undefined;
  return entry;
}

/**
 * The pair the settings modal's two pickers open on.
 *
 * The presenter's own stored entry when there is one, the theme default otherwise — the reference's
 * seed, with its light/dark inconsistency resolved as {@link PRESENTER_COLOR_DEFAULTS} explains.
 */
export function seedPresenterColors(
  map: PresenterColorMap | null | undefined,
  ownEmailHash: string,
  theme: 'light' | 'dark'
): PresenterColors {
  return presenterColorsFor(map, ownEmailHash) ?? PRESENTER_COLOR_DEFAULTS[theme];
}
