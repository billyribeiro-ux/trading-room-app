<script lang="ts">
  import { untrack } from 'svelte';

  /**
   * The Restream tab of the session-control modal — SC-12 and SC-13.
   *
   * ## Why it is a component and not twenty lines of `ModalHost.svelte`
   *
   * It was, and `source-size-contract.test.ts` refused it: `ModalHost.svelte` is capped, ceilings
   * there only go DOWN, and the rule's own words are *"extract a slice rather than raising this
   * number"*. The slice is a real one rather than a convenience — this pane owns exactly one value,
   * seeds it from one place, and writes it to one place, and the three neighbours it sat among
   * (Stream RTMP/WHIP/OBS, Stream Player) share none of that.
   *
   * ## The two defects it was built to fix
   *
   * ```js
   * e.restreamLink = e.appService.globals.sessData.restreamToURL
   *   ? e.appService.globals.sessData.restreamToURL : ""            // byte 2,160,049   SC-12
   *
   * startRestream(e = !1) {
   *   if (e) return this.appService.invokeAdminCmd("setRestreamURL", { restreamToURL: "" }),
   *              void (this.restreamLink = "");
   *   this.restreamLink.startsWith("rtmp://") && !this.restreamLink.includes(" ")
   *     ? this.appService.invokeAdminCmd("setRestreamURL", { restreamToURL: this.restreamLink })
   *     : …                                                          // byte 2,174,659   SC-13
   * }
   * ```
   *
   * SC-12: the textarea was `$state('')` with no prop and no read of the room config, so it opened
   * empty on a room that already had a destination — and Set on an untouched pane would have
   * cleared it. SC-13: both buttons called `onPreferenceChange('restreamToURL', …)`, which is
   * `prefs.save` — the VIEWER's own settings row. Those two calls were the only occurrences of the
   * name in `apps/room/src`, so a presenter set a destination and the room republished nowhere,
   * **while this pane went on showing them the value they had typed**. That display is the reason
   * it survived: a control whose only effect is on the person pressing it looks like one that works.
   */
  interface Props {
    /** Whether the Restream tab is the selected one — Bootstrap's `show active` pair. */
    active: boolean;
    /**
     * `sessData.restreamToURL`, for SEEDING only.
     *
     * `undefined` for a participant: it crosses on `ROOM_PRESENTER_SETTINGS`, a presenter-only
     * allow-list, because an rtmp destination usually carries its own stream key inline. See
     * `RoomSessionSettings.restreamToURL` for the whole argument.
     */
    restreamUrl?: string;
    /** `setRestreamURL` — the ROOM-level write. `''` clears, exactly as upstream sends. */
    onSaveRestreamUrl: (url: string) => void;
    /** The reference's own refusal for a value that is not an rtmp destination. */
    oninvalid: () => void;
  }

  const { active, restreamUrl, onSaveRestreamUrl, oninvalid }: Props = $props();

  /*
    SC-12 — seeded from the room's stored destination, not from `''`.

    `untrack` because this is a SEED and then locally owned: the textarea binds to it and the
    presenter must be able to type without the write having round-tripped. A `$derived` would
    overwrite what is being typed on any re-read of page data, and `invalidateAll()` after a
    successful save is exactly such a re-read.
  */
  let restreamLink = $state(untrack(() => restreamUrl ?? ''));

  /*
    SC-13 — the room-level write, replacing a per-viewer preference nothing read.

    The validation is the reference's own and is unchanged. It is applied again on the server, in
    `setRestreamUrl`, because a remote command is reachable without this pane and a hidden button is
    not a check.
  */
  function saveRestreamLink() {
    if (restreamLink.startsWith('rtmp://') && !restreamLink.includes(' ')) {
      onSaveRestreamUrl(restreamLink);
      return;
    }
    oninvalid();
  }

  function clearRestreamLink() {
    restreamLink = '';
    onSaveRestreamUrl('');
  }
</script>

<div
  id="restream"
  role="tabpanel"
  aria-labelledby="restream-tab"
  class={['tab-pane fade', { show: active, active }]}
>
  <textarea
    id="restream-link"
    class="form-control border border-danger"
    style="height: 100px;"
    bind:value={restreamLink}></textarea>
  <button class="btn btn-outline-info btn-sm m-1" onclick={saveRestreamLink}>
    <i class="fas fa-save"></i> Set Restream URL
  </button>
  <button class="btn btn-outline-warning btn-sm m-1" onclick={clearRestreamLink}>
    <i class="fas fa-save"></i> Clear Restream URL
  </button>
</div>
