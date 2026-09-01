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

  interface PrefRow {
    id: string;
    key: keyof ViewerAlertPrefs;
    label: string;
    /**
     * The ROOM setting this row's own gate reads — added 2026-09-01, and it was a real omission.
     *
     * `tke` gates each of the four INDIVIDUALLY, on top of the group gate below:
     *
     *     H(5,GEe,…)(6,KEe,…), T(7,"hr"), H(8,XEe,…)(9,eke,…)
     *     O(5, sessData.beepOnUserJoin        ? 5 : -1)   // beep on join
     *     O(6, sessData.userJoinAndLeavePopup ? 6 : -1)   // popup on join
     *     O(8, sessData.beepOnUserJoin        ? 8 : -1)   // beep on leave
     *     O(9, sessData.userJoinAndLeavePopup ? 9 : -1)   // popup on leave
     *
     * The group gate is an OR, so a room that enabled only the beep passed it and then drew all
     * four switches — two of them over a popup the room has turned off, which is the shape this
     * repository calls a control whose only effect is drawing itself.
     *
     * It is the ROOM's value and never the viewer's: the viewer's own `beepOnUserJoin` is what the
     * checkbox WRITES, and gating a control on its own value would make it impossible to switch
     * back on. Both names are `beepOnUserJoin`, which is exactly why this is spelled out.
     */
    roomKey: 'roomBeepOnUserJoin' | 'roomJoinLeavePopup';
  }

  /**
   * The four, as two tables, because they differ only in name and label — and because the capture
   * separates them with a rule.
   *
   * Written out four times it is forty lines of markup whose only variation is two strings — and
   * four places for the next reader to check that the id, the preference name and the bound value
   * agree. A row makes that agreement structural: the id and the key cannot drift apart because
   * there is one of each, and `keyof ViewerAlertPrefs` makes a mistyped key a compile error rather
   * than a checkbox that silently reads `undefined` and draws itself off.
   *
   * TWO tables and not one with an index test, because `T(7,"hr")` is not a separator every second
   * row: it is the one place the reference divides arrivals from departures, and a `{#if index ===
   * 2}` would say so with a number instead of a name.
   *
   * Plain `const`s, not `$derived`: nothing in either depends on a prop. The VALUES are read from
   * `viewerAlerts` at the point of use, which is where the reactivity belongs.
   */
  const joinRows: readonly PrefRow[] = [
    {
      id: 'beep-on-user-join',
      key: 'beepOnUserJoin',
      label: 'Beep on user join',
      roomKey: 'roomBeepOnUserJoin'
    },
    {
      id: 'popup-on-user-join',
      key: 'popupOnUserJoin',
      label: 'Popup on user join',
      roomKey: 'roomJoinLeavePopup'
    }
  ];

  const leaveRows: readonly PrefRow[] = [
    {
      id: 'beep-on-user-leave',
      key: 'beepOnUserLeave',
      label: 'Beep on user leave',
      /*
        THE QUIRK, again and from the other side: the LEAVE beep reads the room's `beepOnUserJoin`,
        because there is no `beepOnUserLeave` room setting upstream. `O(8, …beepOnUserJoin…)`.
      */
      roomKey: 'roomBeepOnUserJoin'
    },
    {
      id: 'popup-on-user-leave',
      key: 'popupOnUserLeave',
      label: 'Popup on user leave',
      roomKey: 'roomJoinLeavePopup'
    }
  ];
</script>

<!--
  `O(119, sessData.positionsIframe && sessData.positionsIframeUrl ? 119 : -1)` at byte 2,285,255 —
  the room must HAVE a positions panel before a switch over its refresh means anything. Both terms
  are already resolved into `positionsIframe` by the caller, because the url is a room value the
  modal has no other reason to hold.

  `HEe`, the row itself, is `d(0,"div",17)` and nothing more — const 17 is `[1,"ml-5"]`.

  THE `p-2 text-mode-box` AROUND IT IS OURS, and it is the price of the extraction rather than a
  transcription. Upstream draws this row as the LAST of five siblings sharing one box —
  `H(115,MEe,…)(116,REe,…)(117,NEe,…)(118,UEe,…)(119,HEe,…),u()` at byte 2,278,483 — and the other
  four (Stop recording sound, Note Update Popup and two more) are in `ModalHost.svelte`. A component
  cannot be a sibling inside a box its parent opened without the parent passing it through, which is
  the threading `source-size-contract` refused when this file was created. So the row gets a box of
  its own, and the difference is one border where the reference has none.
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
      <!--
        `d(3,"span",16),v(4,"Users join/leave:")` — const 16 is `[1,"pl-2"]`, byte 2,230,741.

        ABSENT UNTIL 2026-09-01, and the group had no visible name at all: a bare user icon whose
        only identification was the `title="Beep on user"` tooltip, which a pointer has to rest on
        and a keyboard never reaches. Every other section header in this modal carries the same
        icon-then-`span.pl-2` pair — "Choose Color Theme:", "Room Layout:", "Disable/Enable Video:",
        twenty-odd of them — so this one was the outlier rather than a style decision.

        The span carries NO gate of its own in `tke`: it renders whenever the group does.
      -->
      <span class="pl-2">Users join/leave:</span>
    </div>
    {#each joinRows as row (row.id)}
      {@render prefRow(row)}
    {/each}
    <!--
      `T(7,"hr")` — a bare element with no const index and no `O(…)` around it, so it renders
      unconditionally whenever the group does, even when one of the pairs beside it does not.
      Transcribed as it is: it is the only thing separating arrivals from departures, and the four
      labels alone read as one undifferentiated list of switches.
    -->
    <hr />
    {#each leaveRows as row (row.id)}
      {@render prefRow(row)}
    {/each}
  </div>
{/if}

{#snippet prefRow(row: PrefRow)}
  <!--
    The row's OWN gate — `O(5, sessData.beepOnUserJoin ? 5 : -1)` and its three siblings. See
    `PrefRow.roomKey` for why the group gate above is not enough and why this reads the ROOM's value
    rather than the one the checkbox writes.
  -->
  {#if viewerAlerts[row.roomKey]}
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
  {/if}
{/snippet}
