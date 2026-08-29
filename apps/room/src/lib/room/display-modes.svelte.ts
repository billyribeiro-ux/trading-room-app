import {
  CHAT_DISPLAY_MODE_KEYS,
  DEFAULT_CHAT_DISPLAY_MODE,
  resolveChatDisplayMode,
  type ChatDisplayMode,
  type ChatDisplaySurface
} from '#lib/chat-display-mode.js';

/**
 * `loadChatMode()` and `loadAlertsMode()` — which renderer each pair of surfaces uses.
 *
 * ## Why it is a class and not four lines on the page
 *
 * It is small, and it was four lines on `+page.svelte` before the size ratchet refused them. That
 * refusal was right for a reason beyond the count: the SEED, the WRITE-BACK and the member's later
 * change are one rule with three parts, and split between a page-level loop and a modal callback
 * they were two halves that had to agree about the preference key. Here the key is named once.
 *
 * `room-defaults.ts` is the same shape for the same reason — a room setting that seeds a per-viewer
 * preference belongs in a module that owns the seeding, not in the composition root.
 *
 * ## SEEDED, then owned by the member
 *
 * `$state` and not `$derived`, and {@link seed} is called ONCE on mount. That is the reference's own
 * shape — both `loadChatMode` and `loadAlertsMode` are called from `ngOnInit` — and it is what makes
 * the owner's `altChatRender` a seed rather than a lock: the member can still switch modes in the
 * settings modal afterwards. A derivation would re-apply the owner's value on every
 * `invalidateAll()` and the picker would appear to do nothing, which is the trap
 * `autoSwitchToOfftopics` records against the chat channel.
 *
 * ## The write on the else branch is upstream's, and it is kept
 *
 * Both branches of `loadChatMode` call `setPreference`, so a first load persists whatever it read —
 * `'r'` when nothing was stored. `#lib/chat-display-mode.ts` says why that is reproduced rather than
 * tidied away. {@link seed} skips the write when the stored value already equals what it would
 * write, so a member who has not changed anything does not take a preference write per page load.
 */
export class RoomDisplayModes {
  readonly #savePreference: (key: string, value: unknown) => void;
  #modes: Record<ChatDisplaySurface, ChatDisplayMode>;

  constructor(options: { savePreference: (key: string, value: unknown) => void }) {
    this.#savePreference = options.savePreference;
    this.#modes = $state({
      chat: DEFAULT_CHAT_DISPLAY_MODE,
      alerts: DEFAULT_CHAT_DISPLAY_MODE
    });
  }

  /** The mode the CHAT columns render in — both of them, main and extra. */
  get chat(): ChatDisplayMode {
    return this.#modes.chat;
  }

  /**
   * The mode the ALERTS log renders in — and the Q&A thread with it.
   *
   * One value for both because upstream's Q&A modal calls `loadAlertsMode()`, the same function the
   * alerts log calls, rather than keeping a third key. A key of its own would let the thread drift
   * from the log it belongs to.
   */
  get alerts(): ChatDisplayMode {
    return this.#modes.alerts;
  }

  /**
   * Apply the owner's setting and the member's stored preference, once.
   *
   * @param altChatRender `sessData.altChatRender` — the owner forcing compact on everybody.
   * @param loaded the preference blob, read for each surface's own key.
   */
  seed(altChatRender: boolean, loaded: Record<string, unknown>): void {
    for (const surface of ['chat', 'alerts'] as const) {
      const key = CHAT_DISPLAY_MODE_KEYS[surface];
      const { mode, persist } = resolveChatDisplayMode(altChatRender, loaded[key]);
      this.#modes[surface] = mode;
      if (loaded[key] !== persist) this.#savePreference(key, persist);
    }
  }

  /** The member picking a mode in the settings modal. Renders immediately, and persists. */
  set(surface: ChatDisplaySurface, mode: ChatDisplayMode): void {
    this.#modes[surface] = mode;
    this.#savePreference(CHAT_DISPLAY_MODE_KEYS[surface], mode);
  }
}
