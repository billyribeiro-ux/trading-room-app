<script lang="ts">
  /**
   * ── "Session Information" — `getMyToken()`, bundle byte **2,255,348** ────────────────────────
   *
   * The dialog behind the user-settings modal's "Get my token" button. Upstream builds it as a
   * `bootbox.dialog` whose `message` is one interpolated HTML string:
   *
   * ```js
   * getMyToken() {
   *   let e = this.appService.globals.sessionID,
   *       i = this.appService.globals.sesionToken;
   *   $("#user-settings-modal").modal("hide");
   *   bootbox.dialog({ title: "Session Information", message: `
   *     <label class="form-label"><strong>Session ID:</strong></label>
   *     <input type="text" class="form-control" id="sessionId" value="${e}" readonly>
   *     <button … onclick="navigator.clipboard.writeText('${e}').then(() => alert('Session ID copied!'))">
   *     <label class="form-label"><strong>Session Token:</strong></label>
   *     <input type="text" class="form-control" id="sessionToken" value="${i}" readonly>
   *     <button … onclick="navigator.clipboard.writeText('${i}').then(() => alert('Session Token copied!'))">
   *   `, buttons: { ok: { label: "Close", className: "btn-primary" } } })
   * }
   * ```
   *
   * Two fields, two Copy buttons, one Close. Everything below is that, with the labels, the ids and
   * the `btn-outline-secondary` / `fa-copy` chrome transcribed by value.
   *
   * ## THE TOKEN FIELD IS PRESENT AND REFUSED, and that is the one divergence
   *
   * `globals.sesionToken` is the session credential. This room's cookie is `httpOnly`
   * (`server/auth.ts`), so no script here can read it — and reproducing this field would mean the
   * SERVER putting that value into the DOM, turning a cookie an XSS cannot reach into a string it
   * can, in a multi-tenant fintech room. That is not a port; it is a regression, and
   * `CLAUDE.md` names this class of change by itself.
   *
   * So the input renders, disabled and empty, with the reason beside it — the pattern the Stream
   * Player pane already sets (`stream-player-blocked-contract.test.ts`: *"the buttons `disabled`
   * with the reason on screen"*). Deleting the field instead would leave a member looking for their
   * session token with no answer at all, which is the outcome an honest refusal exists to avoid.
   *
   * Unblocking it needs a token that is SAFE to show — a short-lived, narrowly-scoped support
   * identifier minted for the purpose. That is a feature, and `TODO.md` carries it as one.
   *
   * ## THE SESSION ID FIELD IS REAL, and the reason it was ruled out did not survive re-measurement
   *
   * `user-action-intent.ts` refused this half too, on the grounds that *"`globals.sessionID` is the
   * room code, already visible in the address bar, so a dialog showing only that is a control whose
   * only effect is repeating what the URL says."*
   *
   * The first clause is right and was confirmed: `globals.sessionID = e` in `loadGlobals(e)` at byte
   * 1,148,131, called with `r = new URLSearchParams(window.location.search).get("id")` at 2,600,589.
   * One assignment in the whole bundle.
   *
   * **The second clause is false of THIS room.** Our room's address is `/` — the short code lives on
   * the session ROW, server-side, and `routes/session/+page.svelte` strips even the handoff token
   * from the bar. Nothing on screen tells a member which room they are in. So the field that merely
   * echoed the URL upstream is the only place here that answers "which room am I in" for somebody
   * reporting a problem, which is what the dialog is for.
   *
   * ## Copy: a handler, not an inline `onclick` in an interpolated string
   *
   * Upstream's is `onclick="navigator.clipboard.writeText('${e}')"` INSIDE the interpolated message —
   * a value crossing into executable attribute text, which is a stored-XSS primitive the moment
   * either value can contain a quote. It also ends in `alert('Session ID copied!')`, and
   * `CLAUDE.md` forbids `window.alert` by name.
   *
   * Both are replaced by ordinary Svelte: a real handler, and an inline confirmation that clears
   * itself. The confirmation is a `$state` string rather than a toast because the dialog is modal —
   * a toast behind it is a message the reader cannot see.
   */
  import Modal from '#lib/components/Modal.svelte';

  interface Props {
    /** Whether the dialog is on screen. */
    open: boolean;
    /**
     * The room's short code — this room's answer to `globals.sessionID`.
     *
     * From `data.room.shortCode`, which is the controller's own identifier for the room and is
     * already sent to every browser in it. Not a credential and not derived from one.
     */
    shortCode: string;
    onclose: () => void;
  }

  let { open, shortCode, onclose }: Props = $props();

  /**
   * What the Copy button just did, cleared when the dialog closes.
   *
   * A plain string rather than a boolean, because the reference has two Copy buttons with two
   * different confirmations and this keeps the shape if the second one ever becomes buildable.
   */
  let copied = $state('');

  async function copySessionId(): Promise<void> {
    /*
      `navigator.clipboard` is absent on an insecure origin and its write can be REFUSED by
      permissions policy. Upstream's inline handler has no failure branch at all, so a refusal there
      is a button that silently does nothing. Said out loud here instead — the same rule the
      transcript's durable write follows, and the reason neither uses `.catch(() => {})`.
    */
    try {
      await navigator.clipboard.writeText(shortCode);
      copied = 'Session ID copied!';
    } catch {
      copied = 'Your browser refused clipboard access — select the value and copy it.';
    }
  }

  function close(): void {
    copied = '';
    onclose();
  }
</script>

<Modal
  id="session-info-modal"
  {open}
  ariaLabelledby="sessionInfoLabel"
  title="Session Information"
  titleId="sessionInfoLabel"
  titleClass="modal-title"
  onclose={close}
>
  <div class="mb-3">
    <label class="form-label" for="sessionId"><strong>Session ID:</strong></label>
    <div class="input-group">
      <!-- `id="sessionId"`, the capture's own, kept so a stylesheet rule keyed to it still lands. -->
      <input type="text" class="form-control" id="sessionId" value={shortCode} readonly />
      <button class="btn btn-outline-secondary" type="button" onclick={copySessionId}>
        <i class="fas fa-copy"></i> Copy
      </button>
    </div>
  </div>
  <div class="mb-3">
    <label class="form-label" for="sessionToken"><strong>Session Token:</strong></label>
    <div class="input-group">
      <input
        type="text"
        class="form-control"
        id="sessionToken"
        value=""
        readonly
        disabled
        aria-describedby="sessionTokenWhy"
      />
      <button class="btn btn-outline-secondary" type="button" disabled>
        <i class="fas fa-copy"></i> Copy
      </button>
    </div>
    <!--
      The refusal, on screen. Not a tooltip: a reason a member has to hover to find is a reason most
      of them never read.
    -->
    <small id="sessionTokenWhy" class="form-text text-muted">
      This room does not show a session token. Your session is held in a cookie the page itself
      cannot read, which is what stops a malicious script from stealing it — so there is no value to
      display here.
    </small>
  </div>
  {#if copied}
    <div class="form-text" role="status">{copied}</div>
  {/if}
  {#snippet footer()}
    <button type="button" class="btn btn-primary" onclick={close}>Close</button>
  {/snippet}
</Modal>
