<script lang="ts">
  /**
   * The troubleshooter's Mobile App pane — `PAe` @ bundle byte 2,438,242, whole.
   *
   * ## What the capture contains, and it is all of it
   *
   * ```js
   * function PAe(t,n){
   *   if(1&t){const e=Y();
   *     d(0,"div",26)(1,"p",19),
   *       v(2," Use this to restore your mobile app connectivity and get a test notification on your device. Only do this if you are not getting notifications "),
   *     u(),
   *     d(3,"button",27),x("click",function(){return D(e),E(g().restoreMobileAppTokens())}),
   *       T(4,"i",28),
   *       v(5," Restore Connectivity "),
   *     u()()
   *   }
   * }
   * ```
   *
   * Consts 26 `[1,"mobile-app-container"]`, 19 `[1,"text-muted","mb-4"]`,
   * 27 `["type","button",1,"btn","btn-primary",3,"click"]`, 28 `[1,"fas","fa-sync-alt","me-1"]`.
   * One paragraph and one button: no pin display, no token list, no platform picker, no pairing UI.
   *
   * The body copy is verbatim **including the missing full stop after "notifications"**, which is
   * the reference's own and is the kind of thing a well-meaning edit repairs.
   *
   * `.mobile-app-container` carries NO rule anywhere — the substring occurs exactly twice in the
   * bundle and both are const tuples. It is worn regardless: it is the capture's own hook, and it is
   * what a future stylesheet would target.
   *
   * ## Why this is a component and not markup in `ModalHost`
   *
   * It went into `ModalHost.svelte` first and the size contract refused it — correctly. But the
   * extraction buys something beyond a line count, and it is the reason this is the right shape
   * rather than a concession:
   *
   * **The result state resets itself.** In `ModalHost` the message was a field that a tab change had
   * to remember to clear, or a member would come back to the tab and read a sentence about a press
   * from ten minutes earlier as though it were current. Here the pane is unmounted when the tab
   * changes, so the state goes with it. A rule enforced by structure rather than by a line in a
   * handler is the difference between a convention and a guarantee — the same argument
   * `private-commands.ts` makes about its addressing gate.
   *
   * ## The sentence is composed HERE, and upstream composes none
   *
   * `restoreMobileAppTokens()` at 2,444,920 is two statements: the transmit, then
   * `bootbox.alert("Command sent successfully, check your mobile device for a test notification")`
   * on the very next line — no callback, no acknowledgement, no error path. It says that to a member
   * with no paired device just as readily as to one with three, and it fires even if the transmit
   * threw.
   *
   * The member pressing this is, by the paragraph directly above the button, somebody who **is not
   * getting notifications**. Telling them one is on its way when nothing was reached leaves them
   * waiting for a buzz that cannot arrive, and sends them to support saying the app told them it
   * worked. That is the `EXACT_ALERTS` shape this repository fixes rather than transcribes.
   *
   * So the captured sentence is kept for the one case in which it is true — at least one device
   * reached — and the other outcomes say what actually happened.
   */
  import { isHttpError } from '@sveltejs/kit';

  type RestoreResult = {
    /** Registrations this member had before the sweep. Zero means the app was never paired. */
    registrations: number;
    /** Devices the push actually reached. */
    sent: number;
    failed: number;
    /** Dead registrations removed. This is the half that RESTORES anything. */
    pruned: number;
  };

  type Props = {
    /** `restoreMobileAppTokens` — takes nothing, because the server knows who is asking. */
    onrestore: () => Promise<RestoreResult>;
  };

  let { onrestore }: Props = $props();

  let message = $state<string | null>(null);
  let busy = $state(false);

  async function run() {
    if (busy) return;
    busy = true;
    message = null;
    try {
      const result = await onrestore();
      if (result.sent > 0) {
        // Verbatim, byte 2,445,008 — kept for the one case in which it is a true statement.
        message = 'Command sent successfully, check your mobile device for a test notification';
      } else if (result.registrations === 0) {
        message =
          'No device is paired with this room yet. Open Mobile App Info for your pin, then pair the app.';
      } else {
        /*
          `pruned` is mentioned only when it is non-zero. Removing a dead registration IS the
          restoration this button promises, and a member who was not getting notifications deserves
          to know something changed — but "and 0 stale ones were removed" is noise.
        */
        message =
          result.pruned > 0
            ? `None of your ${result.registrations} registered devices could be reached, and ${result.pruned} stale one${result.pruned === 1 ? '' : 's'} were removed. Pair the app again to restore notifications.`
            : `None of your ${result.registrations} registered devices could be reached. Pair the app again to restore notifications.`;
      }
    } catch (cause) {
      message = isHttpError(cause) ? cause.body.message : 'That did not work.';
    } finally {
      busy = false;
    }
  }
</script>

<div class="mobile-app-container">
  <p class="text-muted mb-4">
    Use this to restore your mobile app connectivity and get a test notification on your device.
    Only do this if you are not getting notifications
  </p>
  <button type="button" class="btn btn-primary" disabled={busy} onclick={() => void run()}>
    <i class={['fas me-1', busy ? 'fa-spinner fa-spin' : 'fa-sync-alt']}></i>
    Restore Connectivity
  </button>
  <!--
    `aria-live` because the result appears without focus moving, and a member who pressed a button
    about notifications should not have to discover the answer by looking for it.
  -->
  {#if message}
    <p class="mt-3 mb-0" aria-live="polite" data-testid="mobile-restore-result">{message}</p>
  {/if}
</div>
