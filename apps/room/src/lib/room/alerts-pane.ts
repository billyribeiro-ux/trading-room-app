import { alertSearchScopeNotice } from '#lib/alert-toolbar-search-scope.js';
import { tick } from 'svelte';

import type { AlertFilterFor } from '#lib/alert-filter.js';

import type { RoomAlerts } from './alerts.svelte';
import type { RoomDialogs } from './dialogs.svelte';
import type { RoomPrefs } from './prefs.svelte';

/**
 * THE ALERTS PANE's own actions: archive, export, detach, and the two toolbar toggles.
 *
 * Phase 5 slice 22. Eight functions and four fields, all of them about what a viewer DOES to the
 * alerts pane rather than about the alerts themselves — which is the boundary against `RoomAlerts`
 * and `RoomFeeds`, both of which stay where they are and are read from here.
 *
 * **`chatAlertsDetached` is SHARED, so it crosses as a thunk plus a receiver rather than moving.**
 * Detaching writes it; the page's layout reads it and the reopen path writes it back. A field
 * written on both sides of a boundary is not extracted — that is the rule slice 13 paid for with
 * `followedUsers`, and the dependency scan is what found it here rather than a reading of the code.
 *
 * **The detached window is this class's own**, because nothing outside these eight functions ever
 * touched it: it is opened by `detach`, written to by `save`, and closed by `reopen`.
 *
 * A plain `.ts`: no rune. What renders is `RoomAlerts` and `RoomFeeds`; this asks them questions
 * and opens windows.
 */

// Exact copy from the captured detach bootbox (alert-section/modal-content); do not paraphrase.
const DETACHED_ALERTS_MESSAGE =
  'Chat/Alerts detached to a new browser window...You can reopen the chat in this window from the side menu.';

/**
 * `openTranscriptPage()`, and the sidebar's `toggleSpeechRecoHistory()` - byte-for-byte the same
 * body on two different components, so "Transcript History" in the Archives menu and "Full
 * Transcript History" on the caption overlay are one action:
 *
 * ```js
 * const e = globals.sesionToken;
 * if (!e) return void P("No session token available for transcript");
 * window.open(`${location.origin + location.pathname}#/session-transcript?token=${encodeURIComponent(e)}&name=${encodeURIComponent(globals.sessionName)}`, "_blank");
 * ```
 *
 * Both controls were dead links - no handler at all on the menu item, no button on the overlay.
 * They reported the gap honestly for three weeks, and on 2026-09-02 the gap was closed rather than
 * re-worded - twice, because the FIRST rewrite that day was also wrong.
 *
 * ## What the refusal used to say, and why both versions of it were false
 *
 * It began as *"`currentCaption` is never assigned … neither half is wired here"*. Every half was
 * wired and was read end to end before this was touched: `room/recording.ts:457` sends,
 * `services/media/src/server.rs:1412` relays it as `speechReco`, `room/media-transport.svelte.ts`
 * receives it, and `+page.svelte` keeps the last 500 FINAL lines for the caption overlay.
 *
 * It was then rewritten to say the captions were held in this window only - true that morning, and
 * true only because nothing stored them. `session_transcripts` and `session-transcript.remote.ts`
 * store them now, so the window HAS something to read and this opens it.
 *
 * ## The URL is ours, and the difference is a refusal rather than a shortcut
 *
 * Upstream opens `#/session-transcript?token=${globals.sesionToken}&name=…`. Ours opens
 * `/session-transcript` with nothing in the query string. A session credential in an address bar is
 * also in browser history, in every outbound `Referer` and in any screenshot of the window - the
 * same refusal `TODO.md` records for the Benzinga default URL. The window is same-origin, so it
 * arrives with the room's own session cookie, and the server re-derives both the room and the
 * caller from it rather than believing a parameter.
 *
 * The reference's own guard - *"No session token available for transcript"* - therefore has nothing
 * to guard here and is deliberately not reproduced: there is no token to be missing.
 *
 * `_blank`, as upstream. `noopener` is added and upstream has no equivalent: without it the opened
 * page gets a live `window.opener` handle back into the room, which is a navigation primitive over
 * the tab holding the session. Upstream in fact USES `window.opener` (it posts
 * `transcriptWindowClosing` back), and that is the one piece of its behaviour not transcribed -
 * nothing here listens for that message, so the handle would be a capability with no consumer.
 */
const alertExportFormatter = new Intl.DateTimeFormat('en-US', {
  year: '2-digit',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});
/**
 * What an EXPORT reads off a row.
 *
 * The class is generic over it rather than importing a row type, because the two feeds it exports
 * carry different shapes and only these four fields are common to both. `evidenceTimestampText` is
 * optional because a CAPTURED alert has one and a database row does not — that difference is the
 * reason the export checks for it rather than always formatting `createdAt`.
 */
export interface ExportableRow {
  createdAt: string | number | Date;
  senderName: string;
  body: string;
  evidenceTimestampText?: string | null;
}

export class RoomAlertsPane<Row extends ExportableRow> {
  #detachedWindow: Window | null;
  constructor(options: {
    alerts: RoomAlerts;
    dialogs: RoomDialogs;
    prefs: RoomPrefs;
    /** The rows the pane is showing, and the ones a search can reach. */
    feeds: { readonly visibleAlerts: readonly Row[]; readonly searchableAlerts: readonly Row[] };
    alertsScroller: () => HTMLElement | null;
    forceAlertsToBottom: (scroller: HTMLElement) => void;
    /** Keys the exported file. The handle, not the whole load. */
    sessionHandle: () => string;
    /**
     * Detached-ness is SHARED, and only the RECEIVER crosses.
     *
     * This class writes it; the page reads it to lay out. A thunk was supplied at first and eslint
     * refused it - nothing here reads the value, so a getter would have been a collaborator with no
     * reader. The write is the whole of what this side does.
     */
    setChatAlertsDetached: (next: boolean) => void;
  }) {
    this.#alerts = options.alerts;
    this.#dialogs = options.dialogs;
    this.#prefs = options.prefs;
    this.#feeds = options.feeds;
    this.#alertsScroller = options.alertsScroller;
    this.#forceAlertsToBottom = options.forceAlertsToBottom;
    this.#sessionHandle = options.sessionHandle;
    this.#setChatAlertsDetached = options.setChatAlertsDetached;

    this.#detachedWindow = null;
  }

  readonly #alerts: RoomAlerts;
  readonly #dialogs: RoomDialogs;
  readonly #prefs: RoomPrefs;
  readonly #feeds: {
    readonly visibleAlerts: readonly Row[];
    readonly searchableAlerts: readonly Row[];
  };
  readonly #alertsScroller: () => HTMLElement | null;
  readonly #forceAlertsToBottom: (scroller: HTMLElement) => void;
  readonly #sessionHandle: () => string;
  readonly #setChatAlertsDetached: (next: boolean) => void;

  /**
   * Whether the toolbar's search is answering over a partial log. HERE because this class already
   * holds both halves — the term, and the set the toolbar actually filters. The rule is on
   * `#lib/alert-toolbar-search-scope.js`.
   */
  get searchScopeNotice(): string | null {
    return alertSearchScopeNotice({
      term: this.#alerts.search,
      loadedCount: this.#feeds.searchableAlerts.length
    });
  }

  archive() {
    const archivable = this.#feeds.visibleAlerts.length;
    if (archivable === 0) {
      this.#dialogs.alert = 'There are no alerts to archive.';
      return;
    }
    this.#dialogs.confirmation = {
      message: `Archive ${archivable} alert${archivable === 1 ? '' : 's'} from this list? They stay stored and are not deleted.`,
      onconfirm: () => {
        this.#dialogs.confirmation = null;
        // One clock reading for the state and the preference: two calls could straddle an alert
        // arriving and archive it out of the list while storing a cut-off that does not cover it.
        this.#prefs.save('alertsArchivedAt', this.#alerts.archive(Date.now()));
      }
    };
  }

  // "Save alerts messages" exports what is currently listed, mirroring how a note is downloaded.
  save() {
    if (this.#feeds.visibleAlerts.length === 0) {
      this.#dialogs.alert = 'There are no alerts to save.';
      return;
    }
    const lines = this.#feeds.visibleAlerts.map((item) => {
      // Captured alerts carry the timestamp text exactly as it was rendered; database rows do not.
      const stamp =
        'evidenceTimestampText' in item && item.evidenceTimestampText
          ? item.evidenceTimestampText
          : alertExportFormatter.format(new Date(item.createdAt));
      return `[${stamp}] ${item.senderName}: ${item.body}`;
    });
    const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alerts-${this.#sessionHandle()}.txt`;
    link.style.display = 'none';
    document.body.append(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  /**
   * "Detach Alerts", transcribed from the capture's `detachChat` handler:
   *
   * ```js
   * appEventBus.subscribe("detachChat", () => {
   *   const e = window.innerWidth, i = window.innerHeight;
   *   this.detachedChatWindow = window.open(
   *     window.location.href + `&co=1&sl=1&tok=${globals.sesionToken}`, "_blank",
   *     `toolbar=no,location=no,directories=no,status=no,menubar=no,titlebar=no,
   *      fullscreen=no,width=${e / 2},height=${i}`);
   *   window.addEventListener("message", o =>
   *     "windowClosing" === o.data && appEventBus.emit("reatachChat")) })
   * ```
   *
   * `co=1` is the whole point and was missing: the capture parses it as `chatOnlyMode`
   * (`const F = s.get("co")`, and `globals.chatOnlyMode` even changes the socket's query to
   * `{detachedChat:"1"}`). This opened `window.location.href` with NO query string, so the popout
   * was a second copy of the ENTIRE room rather than the alerts and chat.
   *
   * `tok` is not carried: the capture passes a session token in the URL because its popout
   * authenticates from the query string. This app authenticates from the session cookie, which the
   * new window already has, so putting a credential in a URL here would add an exposure the
   * original needed and this one does not.
   *
   * `sl=1` IS carried and nothing reads it, and that is deliberate rather than an oversight —
   * recorded 2026-09-02, because `room-component-gap-register.md`'s R-11 named it as residue and
   * asked for a decision. Upstream `sl=1` sets `skeepLogin` and drives `doSessionLoginWithToken(tok)`
   * — it exists to make the popout log itself in with the token beside it. Dropping `tok` is what
   * makes it inert here, so the two go together and the note belongs beside that one.
   *
   * It is KEPT rather than removed for a reason that is not sentiment: the popout URL is a
   * transcription, a member never sees it, and it claims nothing. Removing a transcribed parameter
   * because this deployment happens not to need it is the direction that makes the next diff against
   * the capture harder to read, and it buys nothing — unlike the `(test it)` link in `ModalHost`,
   * which is the same "wired at one end only" shape and IS a control somebody clicks. The two
   * halves of R-11 are not the same case, and the register had them as one.
   *
   * The other half is in the room component, and matters as much: detaching HIDES the chat and
   * alerts in this window and offers a control to bring them back -
   * `subscribe("detachChat", () => { this.hideChatAlerts = !0; this.reopenAlertsChatBtn = !0 })`.
   * Without it a reader ends up with the same panel twice.
   */
  detach() {
    if (this.#detachedWindow && !this.#detachedWindow.closed) {
      this.#detachedWindow.focus();
      return;
    }
    const query = new URLSearchParams(window.location.search);
    query.set('co', '1');
    query.set('sl', '1');
    this.#detachedWindow = window.open(
      `${window.location.pathname}?${query}`,
      '_blank',
      `toolbar=no,location=no,directories=no,status=no,menubar=no,titlebar=no,fullscreen=no,width=${Math.round(window.innerWidth / 2)},height=${window.innerHeight}`
    );
    if (!this.#detachedWindow) {
      this.#dialogs.alert =
        'Your browser blocked the detached window. Please allow pop-ups for this site.';
      return;
    }
    this.#setChatAlertsDetached(true);
    // `"windowClosing" === o.data && emit("reatachChat")` - closing the popout puts them back.
    this.#detachedWindow.addEventListener('beforeunload', () => {
      this.#setChatAlertsDetached(false);
      this.#detachedWindow = null;
    });
    this.#dialogs.alert = DETACHED_ALERTS_MESSAGE;
  }

  /** `reopenAlertsChat()` - the side-menu control the bootbox message points at. */
  reopen() {
    this.#setChatAlertsDetached(false);
    if (this.#detachedWindow && !this.#detachedWindow.closed) this.#detachedWindow.close();
    this.#detachedWindow = null;
  }

  openTranscript() {
    window.open('/session-transcript', '_blank', 'noopener');
  }

  /**
   * `toggleInlineAlertEntry()` — byte 2,047,433, and it does exactly two things:
   *
   * ```js
   * toggleInlineAlertEntry() {
   *   this.appService.localstorage.setObject("showAlertsEntry", {showAlertsEntry: this.showAlertsEntry}),
   *   this.appService.guiEventBus.emit("scrollAlertLogToBottom")
   * }
   * ```
   *
   * Both were missing. The flag was ephemeral `$state`, so a presenter who opened the box got it
   * closed again on the next reload; and nothing pulled the log back, so opening the field — which
   * shortens the scroller — left the newest alert off screen.
   *
   * HERE rather than in `RoomAlerts` for the same reason {@link toggleToolbar} is: the scroller is
   * this file's element. The two methods are the same shape because upstream's two are.
   *
   * `prefs.save` where upstream writes localStorage only — see `alerts.svelte.ts`, which records
   * that this room's store is a superset and why a second persistence mechanism for one boolean is
   * the thing worth avoiding.
   */
  toggleInlineEntry(open: boolean) {
    this.#alerts.inlineEntry = open;
    this.#prefs.save('showAlertsEntry', open);
    const scroller = this.#alertsScroller();
    if (scroller) this.#forceAlertsToBottom(scroller);
  }

  /**
   * `toggleAlertsToolbar()` - the gear (`app-alerts.compiled.js:134-140`):
   *
   * ```js
   * toggleAlertsToolbar() {
   *   this.showAlertsToolbar && !this.showAlertsToolbarExtended
   *     ? (this.showAlertsToolbarExtended = !0)
   *     : ((this.showAlertsToolbar = !this.showAlertsToolbar),
   *        this.showAlertsToolbar && (this.showAlertsToolbarExtended = !0)),
   *   this.appService.guiEventBus.emit('scrollAlertLogToBottom');
   * }
   * ```
   *
   * Note the first branch: with a search-only strip already open the gear EXPANDS it rather than
   * closing it, so the two controls do not fight each other.
   */
  toggleToolbar() {
    this.#alerts.toggleToolbar();
    // `guiEventBus.emit('scrollAlertLogToBottom')` - the strip changes height, so the log would
    // otherwise be left scrolled off the newest alert. The scroller is this file's element, which
    // is why the emit stayed here rather than going into the class with the toggle.
    const scroller = this.#alertsScroller();
    if (scroller) this.#forceAlertsToBottom(scroller);
  }

  /**
   * `toggleAlertsToolbarSearchOnly()` - the magnifier (`app-alerts.compiled.js:141-150`):
   *
   * ```js
   * toggleAlertsToolbarSearchOnly() {
   *   (this.showAlertsToolbar && this.showAlertsToolbarExtended) ||
   *     (this.showAlertsToolbar = !this.showAlertsToolbar),
   *   this.showAlertsToolbarExtended = !1,
   *   this.showAlertsToolbar && setTimeout(() => { … focus the search box … });
   * }
   * ```
   *
   * The mirror of the above: from the FULL toolbar it collapses to search-only instead of
   * closing, and it always ends with the extended regions hidden.
   */
  toggleToolbarSearchOnly() {
    if (!this.#alerts.toggleSearchOnly()) return;
    // `setTimeout(...)` in the capture, because the input does not exist until the strip renders.
    void tick().then(() => {
      document.querySelector<HTMLInputElement>('#alert-settings .form-control')?.focus();
    });
  }

  /**
   * `updateAlertFilter` — the reference persists the map server-side AND sets the preference.
   *
   * This room has one mechanism for both: `savePreference` already stores arbitrary JSON per user
   * and already carries map-shaped values, so no new endpoint is needed. The observable result is
   * the reference's: the selection survives a reload.
   */
  saveFilter(next: { alertFilterFor: AlertFilterFor; showAlertsFrom: boolean }) {
    const write = this.#alerts.filterChanged(next);
    this.#prefs.save('alertFilterFor', write.alertFilterFor);
    this.#prefs.save('showAlertsFrom', write.showAlertsFrom);
  }
}
