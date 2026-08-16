import type { ChatTab } from '#lib/types.js';

/*
  The room's two chat columns — which channel each shows, what is typed in each, which one the
  viewer last touched, and the mention routing that depends on all three at once.

  ## Why these five fields are one owner

  They were declared 650 lines apart and the thing that binds them is not visible from any one of
  them. `mentionTargetIsExtraColumn` reads THREE of them to answer one question:

  ```js
  return extraChatColumn && (fromExtraColumn || chatInputFocus === 'textAreaTxtExtra');
  ```

  and that is a transcription of the reference's own router:

  ```js
  doMention(e) {
    guiEventBus.emit(
      this.isQAMsg ? "doQAMention"
      : preferences.extraChatColumn && (this.extraChatMsg || "textAreaTxtExtra" === globals.chatInputFocus)
        ? "doMentionExtra" : "doMention", e)
  }
  ```

  Two ways to reach the extra column and both matter: the message you clicked was IN that column
  (`extraChatMsg`, true for every row it renders), or you were last typing there (`chatInputFocus`).
  Without the second, clicking a name in the main log while composing in the extra column inserts
  into the pane you are not looking at.

  ## What it does NOT own

  **`extraChatColumn` itself.** It is one of fifteen boolean preferences seeded from the settings
  snapshot and written through the page's one `savePreference`, and pulling a single one out would
  leave that block inconsistent for the sake of one reader. Taken as a THUNK instead, which is the
  documented shape for reading a value rather than copying it — `$state`'s "passing state into
  functions" section.

  **The message lists.** `visibleChatMessages` and `visibleExtraChatMessages` run the same six-step
  pipeline over `data.messages`, differing only in which channel they read. That pipeline belongs
  with the data it filters, not with the composer.

  **The focus call.** `mention` RETURNS which composer it wrote to; the page focuses the element and
  places the caret, because the element is the page's. Same decision/effect split as
  `RoomSplit.endDrag` and `RoomAlerts.filterChanged`.
*/

/**
 * The two composer element ids, as the reference names them.
 *
 * A UNION rather than the bare `string` this was: `chatInputFocus` is compared against
 * `'textAreaTxtExtra'` to route every mention, and a typo in that comparison silently routes every
 * mention to the main column forever. The union makes it a compile error.
 */
export type ChatComposerId = 'textAreaTxt' | 'textAreaTxtExtra';

/** `#textAreaTxtExtra` — the extra column's composer. */
export const EXTRA_COMPOSER: ChatComposerId = 'textAreaTxtExtra';

export class RoomChat {
  #tab = $state<ChatTab>('main');
  /** `this.channel = 'offTopic'` in `app-extra-chat` — the extra column has its own channel. */
  #extraTab = $state<ChatTab>('off-topic');
  #composer = $state('');
  #extraComposer = $state('');
  /** `globals.chatInputFocus` — which composer the viewer last typed in. */
  #focus = $state<ChatComposerId>('textAreaTxt');

  readonly #extraColumnEnabled: () => boolean = () => false;

  /**
   * Takes the extra column's preference as a thunk rather than a value.
   *
   * A copy would be the value as of construction, and the viewer can turn the second column on from
   * the settings modal mid-session — at which point every mention would keep routing to the main
   * composer because this class was still holding `false`.
   */
  constructor(sources: { extraColumnEnabled: () => boolean }) {
    this.#extraColumnEnabled = sources.extraColumnEnabled;
  }

  get tab(): ChatTab {
    return this.#tab;
  }

  set tab(next: ChatTab) {
    this.#tab = next;
  }

  get extraTab(): ChatTab {
    return this.#extraTab;
  }

  set extraTab(next: ChatTab) {
    this.#extraTab = next;
  }

  /*
    WRITABLE, both composers, because a `<textarea>` binds to them and the emoji picker appends to
    one. That is not a hole in the encapsulation — it is what a composer IS. What the class adds is
    that the two can no longer be confused for each other at a call site, and that everything which
    DECIDES between them is a method here rather than an expression repeated in the template.
  */
  get composer(): string {
    return this.#composer;
  }

  set composer(next: string) {
    this.#composer = next;
  }

  get extraComposer(): string {
    return this.#extraComposer;
  }

  set extraComposer(next: string) {
    this.#extraComposer = next;
  }

  get focus(): ChatComposerId {
    return this.#focus;
  }

  /** `onfocus` on either textarea. The reference stores this on `globals` for the same reason. */
  focused(composer: ChatComposerId): void {
    this.#focus = composer;
  }

  /**
   * Which composer a mention belongs in, given where the click came from.
   *
   * Gated on the extra column being ENABLED first, so a room with one column can never route a
   * mention into a composer that is not on screen — which would look like the button doing nothing.
   */
  mentionTargetIsExtra(fromExtraColumn: boolean): boolean {
    return this.#extraColumnEnabled() && (fromExtraColumn || this.#focus === EXTRA_COMPOSER);
  }

  /**
   * `doMention` / `doMentionExtra` — the SAME insert, into whichever composer is the target.
   *
   * Returns true when the MAIN composer was written to, which is the page's cue to focus it and put
   * the caret at the end. The extra column gets no such treatment upstream either.
   *
   * The extra column's insert is upstream's own and differs by a space:
   * `i.length ? val(i + ' @' + e + ' ') : val('@' + e + ' ')`. Both forms are reproduced exactly —
   * a leading space only when there is already something typed, and a trailing space always, so the
   * next word does not run into the name.
   */
  mention(name: string, toExtraColumn: boolean): boolean {
    if (toExtraColumn) {
      this.#extraComposer += `${this.#extraComposer ? ' ' : ''}@${name} `;
      return false;
    }
    this.#composer += `${this.#composer ? ' ' : ''}@${name} `;
    return true;
  }

  /** A sent message clears its own composer and never the other one. */
  clear(composer: ChatComposerId): void {
    if (composer === EXTRA_COMPOSER) this.#extraComposer = '';
    else this.#composer = '';
  }

  /**
   * Take what is typed and clear it in one step.
   *
   * The rich-text editor opens on the current draft and the draft must not survive the handoff —
   * two copies of the same half-written message, one in a modal and one behind it, is a message
   * sent twice.
   */
  take(composer: ChatComposerId): string {
    const body = (composer === EXTRA_COMPOSER ? this.#extraComposer : this.#composer).trim();
    this.clear(composer);
    return body;
  }
}
