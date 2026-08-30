<script lang="ts">
  import type { ViewerAlertPrefs } from '#lib/viewer-alert-prefs.js';

  /*
    FIVE CONTROLS THE ALERTS TAB NEVER HAD, EVERY ONE OF THEM OVER A LIVE CONSUMER.

    `#lib/arrival-announcement.ts` has read `popupOnUserJoin`, `popupOnUserLeave`, `beepOnUserJoin`
    and `beepOnUserLeave` since it was written, and `RoomPrefs` has held all four as seeded state
    with getters. **Nothing in the room could write any of them.** A presenter was popped at and
    beeped at on every arrival and every departure, with no control anywhere — and the seeds default
    to on (`!== false`), so it was on for everybody.

    The fifth, `updatePositionsIframe`, is the mirror image: `PositionsContainer` has run the
    positions panel's thirty-second refresh from it all along, nothing could write it, and
    `+page.svelte` read it as `prefs.loaded.updatePositionsIframe === true` — so an absent key was
    false and the refresh was OFF for everybody. The reference's default is ON
    (`updatePositionsIframe:!0`, byte 980,052).

    They sit together here because the reference puts them adjacent in this tab, because they are
    one idea — what this viewer has chosen about announcements they cannot otherwise silence — and
    because each is gated on the ROOM having the feature at all.

    ## The reference, transcribed

    Four checkboxes in the user-settings modal's alerts tab, in a group the capture gives an id and a
    title (byte 2,269,797):

        ["id","appBeepOnUserJoinLeave","title","Beep on user",1,"pb-2"], [1,"fas","fa-user"]

    with ids `beep-on-user-join`, `popup-on-user-join`, `beep-on-user-leave`, `popup-on-user-leave`
    and labels " Beep on user join " … " Popup on user leave ", each followed by an `on`/`off` span.
    Every handler is the same two statements (byte 2,252,100):

        beepOnUserJoinChange() {
          preferences.beepOnUserJoin = !preferences.beepOnUserJoin,
          setPreference("beepOnUserJoin", preferences.beepOnUserJoin)
        }

    ## The group gate, and why it reads the ROOM rather than the viewer

        O(120, (sessData.beepOnUserJoin || sessData.userJoinAndLeavePopup) && isPresenter ? 120 : -1)

    An owner who has turned both halves off for the room leaves nothing for a viewer to configure, so
    the group disappears rather than offering switches over a feature that cannot fire. And it is
    presenter-only for the same reason the announcement is: a member is never told who came and went,
    so a member has nothing to silence.

    ## Its own component, not four blocks in `ModalHost`

    The precedent is `AvDevicePane`, `UserNotesPane` and `ChatArchivePane` — and `ModalHost.svelte`
    sits on its ceiling, which is what the ratchet is for. What lives here is one gate, four controls
    and the account of the quirk below; nothing else in that file reads any of it.

    ## THE QUIRK, reproduced rather than tidied

    The LEAVE beep is gated on the room's `beepOnUserJoin` — there is no `beepOnUserLeave` room
    setting upstream. `arrival-announcement.ts` records the same thing from the consuming side and
    cites byte 2,230,981, where the room's own settings pane renders `beepOnUserJoin` twice, once per
    direction. Only the VIEWER preference is per-direction, which is exactly what these four are.
  */

  interface Props {
    /** The three room gates and the five viewer preferences. See `ViewerAlertPrefs`. */
    viewerAlerts: ViewerAlertPrefs;
    isPresenter: boolean;
    onPreferenceChange: (key: string, value: unknown) => void;
  }

  const { viewerAlerts, isPresenter, onPreferenceChange }: Props = $props();

  /**
   * The four, as one table, because they differ only in name and label.
   *
   * Written out four times it is forty lines of markup whose only variation is two strings — and
   * four places for the next reader to check that the id, the preference name and the bound value
   * agree. A row makes that agreement structural: the id and the key cannot drift apart because
   * there is one of each, and `keyof ViewerAlertPrefs` makes a mistyped key a compile error rather
   * than a checkbox that silently reads `undefined` and draws itself off.
   *
   * A plain `const`, not `$derived`: nothing in it depends on a prop. The VALUES are read from
   * `viewerAlerts` at the point of use, which is where the reactivity belongs.
   */
  const rows: readonly { id: string; key: keyof ViewerAlertPrefs; label: string }[] = [
    { id: 'beep-on-user-join', key: 'beepOnUserJoin', label: 'Beep on user join' },
    { id: 'popup-on-user-join', key: 'popupOnUserJoin', label: 'Popup on user join' },
    { id: 'beep-on-user-leave', key: 'beepOnUserLeave', label: 'Beep on user leave' },
    { id: 'popup-on-user-leave', key: 'popupOnUserLeave', label: 'Popup on user leave' }
  ];
</script>

<!--
  `O(119, sessData.positionsIframe && sessData.positionsIframeUrl ? 119 : -1)` at byte 2,285,255 —
  the room must HAVE a positions panel before a switch over its refresh means anything. Both terms
  are already resolved into `positionsIframe` by the caller, because the url is a room value the
  modal has no other reason to hold.
-->
{#if viewerAlerts.positionsIframe}
  <div class="p-2 text-mode-box">
    <div class="ml-5">
      <input
        type="checkbox"
        name="app-positions-update"
        value="Do not disturb"
        id="app-positions-update"
        class="form-check-input"
        checked={viewerAlerts.updatePositionsIframe}
        onchange={(event) =>
          onPreferenceChange('updatePositionsIframe', event.currentTarget.checked)}
      />
      <label for="app-positions-update" class="form-check-label"
        >Update Positions <span>{viewerAlerts.updatePositionsIframe ? 'on' : 'off'}</span></label
      >
    </div>
  </div>
{/if}

{#if (viewerAlerts.roomBeepOnUserJoin || viewerAlerts.roomJoinLeavePopup) && isPresenter}
  <div class="p-2 text-mode-box">
    <div id="appBeepOnUserJoinLeave" title="Beep on user" class="pb-2">
      <i class="fas fa-user"></i>
    </div>
    {#each rows as row (row.id)}
      <div class="ml-5">
        <input
          type="checkbox"
          name={row.id}
          value="Do not disturb"
          id={row.id}
          class="form-check-input"
          checked={viewerAlerts[row.key]}
          onchange={(event) => onPreferenceChange(row.key, event.currentTarget.checked)}
        />
        <label for={row.id} class="form-check-label"
          >{row.label} <span>{viewerAlerts[row.key] ? 'on' : 'off'}</span></label
        >
      </div>
    {/each}
  </div>
{/if}
