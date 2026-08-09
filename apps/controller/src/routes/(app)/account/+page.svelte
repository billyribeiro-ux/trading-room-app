<script module lang="ts">
  /**
   * The Sessions table's row selection, as a pure function.
   *
   * It lives in `<script module>` rather than in the instance script for one reason: it is the whole
   * behaviour of the "Show / Hide Archived" toggle, and a `$derived` closed over component state
   * cannot be tested. Here it can be — see `src/lib/account-sessions-filter.test.ts`, which drives
   * it directly rather than asserting on the shape of the source.
   */

  /** Only the fields the filter and the sort actually read. */
  export type SessionRow = { name: string; shortCode: string; archivedAt: Date | null };

  /**
   * The reference's `s.isArchivedRoom`.
   *
   * `archived_at` is a nullable timestamp, so "is it archived" is "is there a date", and the answer
   * never depends on truthiness of the date itself.
   */
  export function isArchivedRoom(room: { archivedAt: Date | null }): boolean {
    return room.archivedAt !== null;
  }

  /**
   * Comparison is numeric-aware: the Session ID column holds short codes like `3625`, and a lexical
   * sort puts `3625` before `999`.
   */
  const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

  /**
   * `login.sessions | filter: sessSearch`, plus the reference's
   * `ng-hide="s.isArchivedRoom && !showArchivedRooms"` on every row, plus `sortByUUID`/`sortByName`.
   *
   * The archived rule is stated in the positive here rather than transcribed as a negated hide: a
   * row is shown when the toggle is on OR the room is not archived. Same truth table, and it cannot
   * be read backwards.
   */
  export function selectVisibleRooms<T extends SessionRow>(
    rooms: readonly T[],
    options: { search: string; showArchived: boolean; sortKey: 'uuid' | 'name' | null; sortAscending: boolean }
  ): T[] {
    const needle = options.search.toLowerCase();
    const matched = rooms.filter(
      (room) => (options.showArchived || !isArchivedRoom(room)) && room.name.toLowerCase().includes(needle)
    );

    const key = options.sortKey;
    if (!key) return matched;
    /*
      Sorting `matched` in place is safe and deliberate: `.filter()` has already produced a new
      array, so the caller's `data.rooms` — which is load data — is never reordered. Sorting the
      source would make the rendered order depend on how many times this happened to run.
    */
    return matched.sort((a, b) => {
      const compared = collator.compare(
        key === 'uuid' ? a.shortCode : a.name,
        key === 'uuid' ? b.shortCode : b.name
      );
      return options.sortAscending ? compared : -compared;
    });
  }
</script>

<script lang="ts">
  import { enhance } from '$app/forms';
  import { resolve } from '$app/paths';
  import { bootbox } from '$lib/bootbox.svelte';
  import type { SubmitFunction } from '@sveltejs/kit';
  import type { PageProps } from './$types';
  import PasswordReveal from '$lib/components/PasswordReveal.svelte';

  let { data, form }: PageProps = $props();

  /**
   * The reference hides two things behind clicks on the word "Sessions":
   * `ng-click="showNewRoom=showNewRoom+1"`. One click reveals each room's _id and
   * ownerID; five reveal the "New Room" button. Reproduced because it is the real
   * way a room gets created here — there is no always-visible create form.
   */
  let showNewRoom = $state(0);
  let showAddBadge = $state(false);
  /*
    The badge editor's own state, mirroring the reference's `badges.*` scope.

    `badgeMode` is real now. The reference's editor has two modes — its heading swaps "New Badge"
    for "Edit Badge" and its submit swaps "Add New Badge" for "Save Edit for New Badge" on
    `badges.mode=='edit'` — and this file previously carried the state for neither, because the only
    thing that can enter edit mode is the badges row's Edit action (`editBadge(b._id, b.text,
    b.bkcolor, b.color, b.roles, b.name, b.imgURL)`, #755/#756) and that needs somewhere to save to.
    `?/updateBadge` is that place; both halves land together, so nothing here is a branch that
    cannot be reached.

    `badgeId` is the reference's `badges.badgeID` — the row "Save Edit" writes back into, and the
    thing its Close button clears.
  */
  let badgeMode = $state<'add' | 'edit'>('add');
  let badgeId = $state<number | null>(null);
  /*
    The reference's own sentinel for "no background": `badges.bkcolor='rgba(1,0,0,0)'`.

    Not `transparent`, and not `rgba(0,0,0,0)` — an alpha-zero colour with a red channel of 1. It is
    what the Transparent button writes, and it is exactly what the badges table then renders as the
    cell's inline `background-color`, so the two agree by construction.

    Ours set `#000000` here: a button labelled Transparent that painted the badge BLACK. An
    `<input type="color">` cannot hold an rgba value, which is why this lives in state rather than
    in the picker.
  */
  const TRANSPARENT_BADGE = 'rgba(1,0,0,0)';

  let badgeBk = $state('#ffcc00');
  let badgeFg = $state('#ffffff');
  let badgeText = $state('');
  /** `badges.name`. Bound now because edit mode has to prefill it. */
  let badgeName = $state('');

  /** `editBadge(...)` — load a row into the editor and switch it to edit mode. */
  function editBadge(badge: {
    id: number;
    label: string;
    emoji: string | null;
    backgroundColor: string;
    textColor: string;
  }) {
    badgeId = badge.id;
    badgeMode = 'edit';
    badgeBk = badge.backgroundColor;
    badgeFg = badge.textColor;
    badgeText = badge.emoji ?? '';
    badgeName = badge.label;
    showAddBadge = true;
    /*
      `roles` is NOT prefilled, and that is an honest gap rather than an oversight: the reference
      passes `b.roles` into editBadge, but this schema has no roles column and `createBadge` never
      stored one, so there is nothing to read back. Prefilling it with anything would be inventing a
      value.
    */
  }

  /** The reference's Close: `badges.badgeID=''; badges.mode='add'; showAddBadge=false;` */
  function closeBadgeEditor() {
    badgeId = null;
    badgeMode = 'add';
    showAddBadge = false;
  }

  let showAddAdminUser = $state(false);
  let search = $state('');
  /**
   * `toggleArchivedRooms()` — the reference's `showArchivedRooms`, which drives
   * `ng-hide="s.isArchivedRoom && !showArchivedRooms"` on every session row.
   *
   * It filters for real now: `selectVisibleRooms` above reads it. It was removed from this page
   * once before precisely because it did not — there was no `archived` column for it to filter on,
   * so the button's only effect was swapping its own label, which tells an owner their archived
   * rooms are hidden while every room is always shown.
   */
  let showArchivedRooms = $state(false);
  /** which key's restrictions editor is open */
  let restrictionsFor = $state<string | null>(null);

  /**
   * `ng-dblclick="showBadgeID=!showBadgeID;"` on the Badges table's "Badge" header — the same
   * double-click-to-reveal idiom the manage page uses for `canCloneDblClick`.
   */
  let showBadgeID = $state(false);

  /**
   * `sortByUUID()` and `sortByName()` — the reference's two sortable session columns.
   *
   * Both headers already rendered a `fa-sort-alpha-asc` icon while nothing sorted, which is a
   * control whose only effect is looking like a control. The icon is the reference's own and it is
   * static there too — `.fa-sort-alpha-asc` never becomes `-desc` in either capture — so direction
   * lives in state and the glyph is left alone rather than inventing a descending icon no evidence
   * shows.
   */
  let sortKey = $state<'uuid' | 'name' | null>(null);
  let sortAscending = $state(true);

  function sortBy(key: 'uuid' | 'name') {
    if (sortKey === key) sortAscending = !sortAscending;
    else {
      sortKey = key;
      sortAscending = true;
    }
  }

  const visibleRooms = $derived(
    selectVisibleRooms(data.rooms, {
      search,
      showArchived: showArchivedRooms,
      sortKey,
      sortAscending
    })
  );

  /**
   * Every mutation on this page is progressively enhanced, so nothing here
   * reloads the document.
   *
   * That is the reference's behaviour — it is a single-page AngularJS app whose
   * buttons call `deleteApiKey(k._id)` and friends over XHR — and it is also
   * what keeps the `fadeInDown` correct: a full-page POST would build a new
   * document, and the container would drop in from the top again on every save.
   * `enhance` re-runs `load` through `invalidateAll()` instead, so the data
   * refreshes while the animated container stays mounted.
   */
  const save: SubmitFunction = () => {
    return async ({ update }) => {
      // reset:false — a collapsed add-form that clears itself is fine, but the
      // search field and the badge editor keep what the user typed.
      await update({ reset: false });
    };
  };

  /**
   * The badge editor's own submit.
   *
   * Identical to `save` except for the last line: the reference's edit submit is
   * `addBadge(true); showAddBadge=false;` — it closes the editor on save, where its add submit
   * leaves it open for the next badge. Only on success, so a rejected edit keeps what was typed on
   * screen next to the message explaining why.
   */
  const saveBadge: SubmitFunction = () => {
    return async ({ result, update }) => {
      const wasEditing = badgeMode === 'edit';
      await update({ reset: false });
      if (wasEditing && result.type === 'success') closeBadgeEditor();
    };
  };

  /**
   * Destructive actions go through bootbox first, exactly as the reference does:
   * clicking Remove pops a confirm and does nothing until OK is pressed.
   * `enhance` calls preventDefault synchronously and only checks `cancel()`
   * after awaiting this callback, so waiting on the dialog here is safe.
   */
  /**
   * "Upload Image Badge" — after the native picker, the original opens the
   * captured Bootbox text prompt titled "Enter the badge name (*optional):".
   */
  let imageForm: HTMLFormElement | null = null;
  let imageInput: HTMLInputElement | null = null;
  let imageLabel = $state('');

  function attachImageForm(element: HTMLFormElement) {
    imageForm = element;
    return () => {
      if (imageForm === element) imageForm = null;
    };
  }

  function attachImageInput(element: HTMLInputElement) {
    imageInput = element;
    return () => {
      if (imageInput === element) imageInput = null;
    };
  }

  async function onImageChosen(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const label = await bootbox.prompt('Enter the badge name (*optional):', 'OK', 'text');
    if (label === null) {
      input.value = '';
      return;
    }

    imageLabel = label;
    imageForm?.requestSubmit();
  }

  const saveImageBadge: SubmitFunction = ({ formData }) => {
    // requestSubmit() runs in the same microtask that receives the Bootbox
    // result. Write the value into the outgoing payload instead of depending
    // on a pending DOM update to the hidden input.
    formData.set('label', imageLabel);
    return async ({ result, update }) => {
      await update({ reset: false });
      if (result.type === 'success') {
        imageForm?.reset();
        imageLabel = '';
      }
    };
  };

  /**
   * "Export Badges" — the reference's `exportBadges()`. Writes the account's
   * badges out as JSON, from the same rows the table above is rendering, so
   * what is exported is what is on screen.
   */
  function exportBadges() {
    const blob = new Blob([JSON.stringify(data.badges, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'badges.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function confirmThen(message: string): SubmitFunction {
    return async ({ cancel }) => {
      if (!(await bootbox.confirm(message))) {
        cancel();
        return;
      }
      return async ({ update }) => {
        await update({ reset: false });
      };
    };
  }
</script>

<svelte:head>
  <title>Account — TradingRoomApp</title>
  <meta name="description" content="Manage TradingRoomApp rooms, badges, administrators, and API keys." />
</svelte:head>

<!-- The container, the fadeInDown and the footer all live in the root layout
     now, exactly as the reference has them: one
     `div.container.container-sm.animated.fadeInDown` wrapping the page and the
     `.p-lg.text-center` footer. This page renders the `.center-block.mt-xl`
     inside it and nothing more. -->
<div class="acc-inner">
  <!--
    EVERY failure on this page was silent.

    `+page.server.ts` has 22 `fail()` paths — a room with no name, a duplicate badge, an admin
    address already taken, an API key that could not be rotated — and each returns a `message` that
    NOTHING here rendered. The only `form` field read anywhere was `verificationSent`.

    So pressing New Room with an empty name did this: the request went out, the server refused it,
    `enhance` put the reason on `form`, and the page redrew identically. No row appeared, no error
    appeared, and the only conclusion available to the operator was that the button is broken.

    `.acc-error` already existed in account.css, unused — written for this and never wired up. A
    failure nobody can see is worse than a crash, because a crash at least says so.

    Not a divergence from the reference: it reports its failures through bootbox alerts, which are
    the same information in a different container. Silence is not what it does.
  -->
  {#if form?.message}
    <p class="acc-error" role="alert">{form.message}</p>
  {/if}

  <!-- ── Confirm your email ─────────────────────────────────── -->
  {#if data.emailUnproved}
    <div class="acc-panel acc-mb">
      <p>
        Confirm <strong>{data.user.email}</strong> to create rooms. Check your inbox for the link —
        each one expires after 24 hours.
      </p>
      {#if form?.verificationSent}
        <p>A new link is on its way.</p>
      {/if}
      <form method="POST" action="?/resendVerification" use:enhance={save}>
        <button class="acc-btn acc-btn-warning" type="submit">Resend the link</button>
      </form>
    </div>
  {/if}

  <!-- ── Sessions ─────────────────────────────────────────────────────── -->
  <h4 class="acc-h4">
    Total <span
      class="acc-clickable"
      role="button"
      tabindex="0"
      onclick={() => (showNewRoom += 1)}
      onkeydown={(e) => {
        // A `role="button"` is activated by Space as well as Enter; the reference's
        // <span ng-click> answers to neither.
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          showNewRoom += 1;
        }
      }}>Sessions</span
    >: {data.rooms.length}
  </h4>

  <div class="acc-row">
    <div class="col-md-4 acc-col-4 acc-panel">
      <input
        class="acc-input acc-search"
        id="sessSearch"
        name="sessSearch"
        placeholder="search"
        bind:value={search}
        aria-label="search"
      />
    </div>
    <!-- `toggleArchivedRooms()`, restored now that it filters something real.

         Transcribed from the capture verbatim
         (evidence-dumps/login-page/logged-in-page:434-436):

             <button class="btn btn-sm btn-default" ng-click="toggleArchivedRooms()">
               <span ng-show="!showArchivedRooms">Show</span>
               <span ng-show="showArchivedRooms" class="ng-hide">Hide</span> Archived
             </button>

         BOTH words stay in the DOM with one hidden, which is not cosmetic: collapsing them to a
         single text run measured 102.664px against the reference's 102.68, because the reference's
         button holds three text runs and their inter-word spacing is measured, not computed from
         one string.

         `hidden` rather than a class: Angular's own rule is `.ng-hide { display: none !important }`
         (logged-in-page:10) and the UA stylesheet gives `[hidden]` exactly that. These two spans
         carry no class, so nothing in account.css can outrank it — which is NOT true of the State
         chips below, where `.acc-label { display: inline }` would win, and that is why those use a
         block instead. -->
    <button
      class="acc-btn acc-btn-sm acc-btn-default"
      type="button"
      onclick={() => (showArchivedRooms = !showArchivedRooms)}
    >
      <span hidden={showArchivedRooms}>Show</span> <span hidden={!showArchivedRooms}>Hide</span> Archived
    </button>
  </div>

  <!-- .panel > .table-responsive > .table. The wrapper is not decoration: the
       whole `.panel > .table-responsive > .table-bordered` rule group hangs off
       it — the one that strips the table's outer border and rounds its top
       corners — and without it this table drew a 1px box the reference does
       not have and sat 2px taller than measured. -->
  <!-- `.row > .col-md-12.panel.pane-default` — the sessions panel carries the
       column class in the reference, like the Extra Admin and API Keys panels
       below it. Leaving it off moved nothing, but it made this the only one of
       the three that was not a column, which is the sort of drift that bites
       whoever next touches the grid. -->
  <div class="acc-row-block"><div class="col-md-12 acc-panel">
    <div class="acc-table-responsive">
    <table class="acc-table">
      <thead>
        <tr>
          <!-- `ng-click="sortByUUID()"` / `ng-click="sortByName()"`. A <th> is not a
               button in the reference either; the click handler sits on the cell. Ours
               adds keyboard access, which the reference lacks. -->
          <!-- No `acc-th-sort` class: it had no rule in any stylesheet, and the reference's
               sortable <th> carries no class at all. A class in the markup that styles nothing
               reads as "this is handled" to the next person to look. -->
          <th
            tabindex="0"
            aria-sort={sortKey === 'uuid' ? (sortAscending ? 'ascending' : 'descending') : 'none'}
            onclick={() => sortBy('uuid')}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                sortBy('uuid');
              }
            }}>Session ID <i class="fa fa-sort-alpha-asc acc-sort-icon"></i></th
          >
          <th
            class="acc-th-center"
            tabindex="0"
            aria-sort={sortKey === 'name' ? (sortAscending ? 'ascending' : 'descending') : 'none'}
            onclick={() => sortBy('name')}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                sortBy('name');
              }
            }}>Name <i class="fa fa-sort-alpha-asc acc-sort-icon"></i></th
          >
          <th class="acc-th-center">State</th>
          <th class="acc-th-center">Users</th>
          <th class="acc-th-center">Actions</th>
        </tr>
      </thead>
      <tbody>
        <!-- No empty-state row. The reference's sessions <tbody> holds nothing but the ngRepeat,
             with no `ng-show` fallback beside it — unlike its admin and API-key tables, which both
             DO carry a colspan empty row. So the absence here is a deliberate difference in the
             reference, not an oversight, and "No rooms yet." was ours. -->
        {#each visibleRooms as room (room.id)}
            <tr>
              <td>
                <strong>{room.shortCode}</strong>
                {#if showNewRoom}
                  <!-- NOT muted. The reference's element here is a bare `<muted>`
                       (#32) — an unknown tag, so an inline box with no styling of
                       its own; its only matched rule is `bootstrap|*`, and it
                       computes the inherited `color: rgb(51,51,51)` at 14px/20,
                       not `.text-muted`'s rgb(119,119,119). The class-less span
                       keeps the same inline box and the same text-node boundary,
                       with the ")" outside it exactly as the reference has it. -->
                  <div><br /><span>( {room.id} - ownerID: {room.accountId}</span> )</div>
                {/if}
              </td>
              <td>{room.name}</td>
              <td class="acc-td-center">
                <!-- Two chips, as captured (logged-in-page:465-466):

                       <div ng-hide="s.isArchivedRoom" class="label label-orange">open</div>
                       <div ng-show="s.isArchivedRoom" class="label label-warning">archived</div>

                     The state chip is HIDDEN when the room is archived — the reference does not
                     show both — and "archived" is a literal, not a bound value.

                     `{#if}` rather than the `hidden` attribute the toggle above uses, and the
                     difference is load-bearing: `.acc-label` declares `display: inline`, which as an
                     author rule outranks the UA's `[hidden] { display: none }`. A `hidden` chip
                     would still be on screen. Angular avoids this with `!important`; rendering one
                     branch avoids it outright. -->
                {#if isArchivedRoom(room)}
                  <div class="acc-label acc-label-warning">archived</div>
                {:else}
                  <!-- ALWAYS orange. The reference's class attribute is the literal
                       `label label-orange` with no `ng-class` on it, so the colour does not vary
                       with the state — only the TEXT does, which is why that div carries
                       `ng-binding` and this one interpolates. Ours used to switch to `warning`
                       whenever the state was not "open", a branch with nothing behind it. -->
                  <div class="acc-label acc-label-orange">{room.state}</div>
                {/if}
              </td>
              <td class="acc-td-center"><div class="acc-muted">{room.userCount} / {room.maxUsers}</div></td>
              <td>
                <!-- The reference's `ng-href`: the whole handoff URL, resolved server-side at
                     page load. `resolve()` cannot be used because this is a runtime string that is
                     CROSS-ORIGIN whenever a separate room is configured (ROOM_BASE_URL); it only
                     falls back to a same-origin path when one is not. -->
                <!-- eslint-disable svelte/no-navigation-without-resolve -->
                <a
                  class="acc-btn acc-btn-sm acc-btn-info"
                  href={room.launchUrl}
                  target="_blank"
                  rel="noopener noreferrer"><i class="fa fa-external-link"></i> Launch</a
                >
                <!-- eslint-enable svelte/no-navigation-without-resolve -->
                <a class="acc-btn acc-btn-sm acc-btn-inverse" href={resolve(`/account/rooms/${room.shortCode}`)}
                  ><i class="fa fa-cogs"></i> Manage</a
                >
                {#if data.entitlements.marketplace}
                  <a
                    class="acc-btn acc-btn-sm acc-btn-default"
                    href={resolve(`/account/rooms/${room.shortCode}/marketplace`)}
                    ><i class="fa fa-credit-card"></i> Marketplace</a
                  >
                {/if}
                <!-- OURS, and stated as ours because the placement is a real divergence rather
                     than an unknown.

                     The reference DOES have a trigger for archiving and it is not here: this
                     Actions cell holds Launch, Manage and Marketplace and nothing else
                     (logged-in-page:471-479). Archiving is `sess.isArchivedRoom`, an
                     `editable-checkbox` labelled "Is Archived Room?" on the manage page's Settings
                     tab (evidence-dumps/login-page/manage:1405-1408).

                     That file is `account/rooms/[id]/`, which this change does not own, and a
                     "Show / Hide Archived" toggle with no way at all to archive a room is the same
                     dead control the toggle itself was removed for last time. So the control goes
                     where its effect is visible — beside the toggle that hides the row — and it
                     should be REPLACED by the manage checkbox, not duplicated by it, when whoever
                     owns that route wires `isArchivedRoom` to `rooms.archived_at`.

                     No bootbox. Archiving is reversible from the row it produces, and the project's
                     confirm is for what cannot be undone. -->
                <form
                  class="acc-inline-form"
                  method="POST"
                  action="?/setRoomArchived"
                  use:enhance={save}
                >
                  <input type="hidden" name="id" value={room.id} />
                  <input type="hidden" name="archived" value={isArchivedRoom(room) ? 'false' : 'true'} />
                  {#if isArchivedRoom(room)}
                    <button class="acc-btn acc-btn-sm acc-btn-default" type="submit"
                      ><i class="fa fa-undo"></i> Unarchive</button
                    >
                  {:else}
                    <button class="acc-btn acc-btn-sm acc-btn-default" type="submit"
                      ><i class="fa fa-archive"></i> Archive</button
                    >
                  {/if}
                </form>
              </td>
            </tr>
        {/each}
      </tbody>
    </table>
    </div>
  </div></div>

  <!-- New Room, ALWAYS VISIBLE. Deliberate divergence, decided by the owner.

       The reference hides this behind `ng-show="showNewRoom>=5"` (#46) — five
       clicks on the word "Sessions" — and nothing else on its page reveals it.
       That is survivable for the reference because registration provisions a
       room and its tenants never reach zero, so the control is an easter egg
       rather than a route anyone needs.

       It is NOT survivable here. Our standard is that every user, test accounts
       included, can create a room and exercise the whole feature set without
       being told a secret. An account that reaches zero rooms otherwise has no
       Manage button, no Launch, no room to open, and no visible way back — which
       is exactly the dead end that was hit.

       `showNewRoom` still exists and is still incremented by the Sessions label:
       it independently drives the per-row id/ownerID reveal (`ng-show`, #461),
       which is a different control that keeps the reference's behaviour.

       The form itself still diverges from the reference in shape: theirs is
       `div.col-md-2` holding exactly one child, `a.btn.btn-warning.mb.btn-block`
       calling `createNew()`, with NO text field. Ours carries a required name
       input because `createRoom` reads `form.get('name')` and fails on a blank.
       What `createNew()` supplies for a name was never captured — no prompt,
       modal or default was recorded — so nothing is invented here. That remains
       an open evidence gap. -->
  <form method="POST" action="?/createRoom" class="acc-toolbar" use:enhance={save}>
    <input class="acc-input" name="name" placeholder="New room name" required />
    <button class="acc-btn acc-btn-warning acc-mb acc-btn-block" type="submit">New Room</button>
  </form>

  <hr class="acc-hr" />

  <!-- ── Badges ───────────────────────────────────────────────────────── -->
  <h3 class="acc-h3">Badges</h3>
  <div class="acc-row">
    <!-- The badge editor is a SIBLING of the badges panel, not a card inside it.
         In the reference it is `div.panel.panel-default.col-md-6` (#51) — a
         50%-wide float sitting in this same `.row` (#50), declared BEFORE the
         `.col-md-9` (#734), with `margin-bottom: 20px` and no top margin.
         Ours nested it inside the col-md-9 and pushed it down 15px, which made
         it a full-width sub-panel of the table's column instead of a column in
         its own right. Order here matches the reference's document order. -->
    {#if showAddBadge}
      <div class="acc-panel-default acc-badge-editor col-md-6">
        <div class="acc-panel-heading">
          <!-- The reference's two headings, `ng-show="badges.mode=='add'"` (#53) and
               `ng-show="badges.mode=='edit'"` (#54) — logged-in-page:496-497. Both are reachable
               now that the badges row has an Edit action to switch the mode. -->
          {#if badgeMode === 'edit'}
            <h3 class="acc-panel-title">Edit Badge</h3>
          {:else}
            <h3 class="acc-panel-title">New Badge</h3>
          {/if}
          <h4 class="acc-badge-preview">
            Preview:
            <span class="acc-label" style={`background-color: ${badgeBk}; color: ${badgeFg}`}
              >{badgeText || 'New Badge'}</span
            >
          </h4>
        </div>
        <div class="acc-panel-body">
          <!-- `action` stays `?/createBadge`; the edit submit carries `formaction="?/updateBadge"`.
               That mirrors the reference, whose two submits are two separate buttons gated on
               `badges.mode` (logged-in-page:527-532), and it keeps the add path a plain static
               action rather than a computed string. -->
          <form method="POST" action="?/createBadge" use:enhance={saveBadge}>
            <div class="acc-badge-row">
              <span>Background: </span>
              <input name="backgroundColor" type="color" bind:value={badgeBk} aria-label="Background" />
              <!-- the reference's own escape hatch for a transparent badge.
                   `acc-btn-tiny` maps the reference's `btn-tiny`. That class has NO rule there —
                   #63 computes a plain `.btn` — so ours has none either. The class is carried
                   because the reference carries it; the absence of a rule is the match. -->
              <button
                class="acc-btn acc-btn-tiny acc-btn-default"
                type="button"
                onclick={() => (badgeBk = TRANSPARENT_BADGE)}>Transparent</button
              >
              <span>Text: </span>
              <input name="textColor" type="color" bind:value={badgeFg} aria-label="Text colour" />
              <span>&nbsp;&nbsp;Badge Text: </span>
              <!-- NOT `.acc-input`. The three editor fields are bare UA form
                   controls in the reference — #67 and #72 carry no `.form-control`
                   and measure padding 1px 2px, border 2px INSET rgb(118,118,118),
                   radius 0 and an auto height; #74 measures padding 2px, border
                   1px solid rgb(118,118,118), radius 0. `.acc-input` is the
                   `.form-control` box (34px, 6px 18px, rgb(219,217,217), radius 4)
                   and it is still correct everywhere else it is used, so the fix
                   is to stop applying it here rather than to change it.
                   `input-emoji-txt` / `input-name-txt` / `input-text` are the
                   reference's own class names and have no rule there either. -->
              <input
                class="input-emoji-txt"
                id="badgeInputTxt"
                name="emoji"
                type="text"
                bind:value={badgeText}
                aria-label="Badge Text"
              />
              <button class="acc-btn acc-btn-default acc-btn-sm" type="button" id="emoji-picker" aria-label="Emoji">
                <i class="fa fa-smile-o fa-1x"></i>
              </button>
            </div>
            <hr />
            <div class="acc-badge-row">
              <span>&nbsp;&nbsp;Name: </span>
              <input
                class="input-name-txt"
                id="badgeNameTxt"
                name="label"
                type="text"
                placeholder="Badge Name"
                bind:value={badgeName}
                required
              />
            </div>
            <label for="badgeRolesTxt">Auto assign this badge to this WP roles (comma separated):</label>
            <textarea class="input-text" id="badgeRolesTxt" name="roles" cols="70" rows="2"></textarea>
            <hr />
            {#if badgeMode === 'edit'}
              <!-- `addBadge(true)` against `badges.badgeID`. The id travels as a field rather than
                   in the URL so the same <form> serves both modes. -->
              <input type="hidden" name="id" value={badgeId} />
              <button
                class="acc-btn acc-btn-primary acc-pull-right"
                type="submit"
                formaction="?/updateBadge">Save Edit for New Badge</button
              >
            {:else}
              <button class="acc-btn acc-btn-warning acc-pull-right" type="submit">Add New Badge</button>
            {/if}
            <button class="acc-btn acc-btn-default acc-pull-right" type="button" onclick={closeBadgeEditor}
              >Close</button
            >
          </form>
        </div>
      </div>
    {/if}

    <div class="col-md-9 acc-panel">
      <button class="acc-btn acc-btn-warning acc-mb" type="button" onclick={() => (showAddBadge = !showAddBadge)}>
        Add New Badge
      </button>
      <!-- A real control, not a disabled placeholder. Both of these were
           `disabled`, which put them permanently at opacity .65 with a
           not-allowed cursor and NO hover state at all — the reference's are
           live, so their hover, focus and press could never match while they
           stayed switched off. The file input is hidden and driven from the
           button so the button keeps its own geometry and stays focusable;
           a <label> would render the same but could not be tabbed to. -->
      <button class="acc-btn acc-btn-info acc-mb" type="button" onclick={() => imageInput?.click()}
        ><i class="fa fa-cloud-upload"></i> Upload Image Badge</button
      >
      <!-- Export is `ng-show="badgesList"` in the reference. An empty array is
           truthy in Angular, so it is always on screen there — measured at
           754.617, 119.078 wide, with no badges defined. Gating it on
           `.length` hid it and made the panel 6.4px short. -->
      <button class="acc-btn acc-btn-default acc-mb" type="button" onclick={exportBadges}
        >Export Badges</button
      >

      <form
        method="POST"
        action="?/uploadImageBadge"
        enctype="multipart/form-data"
        {@attach attachImageForm}
        use:enhance={saveImageBadge}
        hidden
      >
        <input type="hidden" name="label" bind:value={imageLabel} />
        <input
          {@attach attachImageInput}
          type="file"
          name="image"
          accept="image/png,image/jpeg,image/gif,image/webp"
          aria-hidden="true"
          tabindex="-1"
          onchange={onImageChosen}
        />
      </form>

      <!-- The table is always rendered, header and all, even with nothing in
           it — the capture shows a 823x60 thead-only table sitting directly
           under the buttons at y=442.195, and no "No Badges defined" anywhere
           on the page. That message exists in the reference's template behind
           `ng-show="!badgesList"`, which an empty array can never satisfy. -->
      <div class="acc-table-responsive">
        <table class="acc-table">
          <!-- `ng-dblclick="showBadgeID=!showBadgeID;"` — double-click "Badge" to reveal
               each badge's id, the same idiom as `canCloneDblClick` on the manage page.
               No visible affordance in the reference either; it is deliberately obscure. -->
          <thead
            ><tr
              ><th ondblclick={() => (showBadgeID = !showBadgeID)}>Badge</th><th
                class="acc-th-center">Actions</th
              ></tr
            ></thead
          >
          <tbody>
            {#each data.badges as badge (badge.id)}
              <tr>
                <td>
                  <!-- ONE wrapper for both cases, because that is what the
                       reference has: `div.label` carrying the badge's own colours
                       inline (#749, `background-color: rgba(1,0,0,0);
                       color: rgba(1,0,0,0)`), plus `label-badge-img` only when
                       there is an image, which zeroes the padding. Inside it, in
                       this order: the badge text (#750), the image (#751), the
                       name (#752) and the id (#753). Ours emitted a bare <img>
                       plus loose text and lost the wrapper entirely, so the image
                       row had no chip box and the name/id had nothing to inherit
                       their 10.5px/700 type from. -->
                  <div
                    class="acc-label{badge.imageUrl ? ' acc-label-badge-img' : ''}"
                    style={`background-color: ${badge.backgroundColor}; color: ${badge.textColor}`}
                  >
                    {#if badge.imageUrl}
                      <img class="acc-badge-img" src={badge.imageUrl} alt={badge.label} />
                    {:else}
                      <span>{badge.emoji ?? ''}</span>
                    {/if}
                    {#if badge.label}<span class="acc-room-badge-name">{badge.label}</span>{/if}
                    <!-- `span.room-badge-id` (#753): black, and 10.5px/10.5/700
                         inherited from the wrapper — NOT `.acc-muted`, which is
                         the Users count's grey at 14px. The two leading nbsp and
                         the parentheses are the reference's own text. -->
                    {#if showBadgeID}<span class="acc-room-badge-id"
                        >&nbsp;&nbsp;({badge.id})</span
                      >{/if}
                  </div>
                </td>
                <td class="acc-td-center">
                  <!-- All THREE of the reference's controls, in its order and with its separators.

                       Links in <label> elements, not buttons: the reference's badges Actions cell
                       (#754) holds three `label > a` pairs — #755/#756 Edit, #757/#758 Delete,
                       #759/#760 Dark Theme — whose links measure `color: rgb(51,122,183)`, 14px/20,
                       weight 700, the same box as the API-key row actions below. `btn-danger`
                       appears nowhere in the capture. Ours are spans with that computed box and
                       buttons instead of href-less anchors, so they can be tabbed to.

                       The `&nbsp; | &nbsp;` separators sit BETWEEN controls, never at either end. -->
                  <span class="acc-row-action"
                    ><button class="acc-link" type="button" onclick={() => editBadge(badge)}>Edit</button
                    ></span
                  >
                  &nbsp; | &nbsp;
                  <span class="acc-row-action"
                    ><form
                      method="POST"
                      action="?/deleteBadge"
                      use:enhance={confirmThen(`Delete badge "${badge.label}"? This cannot be undone.`)}
                    >
                      <input type="hidden" name="id" value={badge.id} />
                      <button class="acc-link" type="submit">Delete</button>
                    </form></span
                  >
                  &nbsp; | &nbsp;
                  <!-- `addBadgeDarkTheme(b._id, b.text, b.imgURL, b.darkTheme)` (#759/#760/#761).
                       It is handed the badge's CURRENT value, so it toggles; the server flips the
                       column in the UPDATE itself.

                       HONEST GAP, and the reason nothing here changes how the chip looks: no rule
                       in our evidence describes a dark-theme badge. The reference stylesheet has
                       `.dark-theme-badge-id { font-size: 10px }` (sheet-9.css:2564) beside
                       `.room-badge-id`, which hints the value may be a variant badge's ID rather
                       than a flag — but the badges <tbody> is empty in the capture, so the row
                       markup cannot settle it and none of it is guessed at. What the control does
                       is real and complete on its own terms: it writes the column, the page reloads
                       it, `aria-pressed` reports what came back, and Export Badges carries it.

                       The `title` is OURS. The reference's is not in the capture, and a toggle whose
                       only state cue is `aria-pressed` is unreadable to somebody using a mouse. -->
                  <span class="acc-row-action"
                    ><form method="POST" action="?/addBadgeDarkTheme" use:enhance={save}>
                      <input type="hidden" name="id" value={badge.id} />
                      <button
                        class="acc-link"
                        type="submit"
                        aria-pressed={badge.darkTheme}
                        title={badge.darkTheme
                          ? 'Marked for the dark theme — press to unmark'
                          : 'Mark this badge for the dark theme'}>Dark Theme</button
                      >
                    </form></span
                  >
                </td>
              </tr>
            {/each}
          </tbody>
        </table>

      </div>
    </div>
  </div>

  <hr class="acc-hr" />

  <!-- ── Extra Admin Users ────────────────────────────────────────────── -->
  <h3 class="acc-h3">Extra Admin Users</h3>
  <div class="acc-row">
    <div class="col-md-12 acc-panel">
      {#if showAddAdminUser}
        <!-- `.btn-secondary` is a Bootstrap 4 name on a Bootstrap 3 sheet, so it has NO rule in the
             reference: the button keeps the UA's grey `rgb(239,239,239)` with a transparent
             border, which is what the node measures. `.acc-btn-default` painted it white with a
             border instead. Reproduced rather than "corrected" to a variant. -->
        <button class="acc-btn acc-btn-secondary acc-mb" type="button" onclick={() => (showAddAdminUser = false)}>
          Close Add Admin User
        </button>
      {:else}
        <button class="acc-btn acc-btn-success acc-mb" type="button" onclick={() => (showAddAdminUser = true)}>
          Add Admin User
        </button>
      {/if}

      {#if showAddAdminUser}
        <div class="acc-panel-default">
          <div class="acc-panel-heading"><h3 class="acc-panel-title">Add Admin User</h3></div>
          <div class="acc-panel-body">
            <form method="POST" action="?/addAdminUser" use:enhance={save}>
              <div class="acc-field">
                <label for="adminName">Name</label>
                <input class="acc-input" id="adminName" name="name" type="text" placeholder="Enter name" required />
              </div>
              <div class="acc-field">
                <label for="adminEmail">Email</label>
                <input class="acc-input" id="adminEmail" name="email" type="email" placeholder="Enter email" required />
              </div>
              <div class="acc-field">
                <label for="adminPassword">Password</label>
                <PasswordReveal id="adminPassword" name="password" placeholder="Enter password" autocomplete="new-password" required />
              </div>
              <div class="acc-field">
                <button class="acc-btn acc-btn-primary" type="submit">Add Admin User</button>
                <button class="acc-btn acc-btn-default" type="button" onclick={() => (showAddAdminUser = false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      {/if}

      <!-- acc-mt-15: this is the one table on the page the reference pushes
           down, with an inline `style="margin-top: 15px"`. Its panel puts the
           button at 601.594 (+34 +10 mb) and the table at 660.594. -->
      <div class="acc-table-responsive acc-mt-15">
        <table class="acc-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Added</th><th class="acc-th-center">Actions</th></tr>
          </thead>
          <tbody>
            {#if data.admins.length === 0}
              <tr><td colspan="4" class="acc-empty-cell">No admin users added yet</td></tr>
            {:else}
              {#each data.admins as admin (admin.id)}
                <tr>
                  <td>{admin.name}</td>
                  <td>{admin.email}</td>
                  <td>—</td>
                  <td class="acc-td-center">
                    <!-- The exact bootbox copy the reference pops:
                         `Remove admin user "…"? This cannot be undone.`

                         HONEST GAP on the appearance: the reference's admin table
                         is EMPTY in the capture ("No admin users added yet",
                         #794/#795), so no admin Actions cell was ever measured.
                         This INHERITS the pattern its two captured siblings on the
                         same page use for row actions — `label > a` at
                         rgb(51,122,183), 14px/20, weight 700, measured on the
                         badges Delete (#757/#758) and the API-key delete
                         (#822/#823). It is not a captured value; the red
                         `btn-danger` button it replaces was not one either, and
                         `btn-danger` appears nowhere in the capture at all. -->
                    <span class="acc-row-action"
                      ><form
                        method="POST"
                        action="?/deleteAdminUser"
                        use:enhance={confirmThen(
                          `Remove admin user "${admin.name}"? This cannot be undone.`
                        )}
                      >
                        <input type="hidden" name="id" value={admin.id} />
                        <button class="acc-link" type="submit">Remove</button>
                      </form></span
                    >
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  </div>

  <hr class="acc-hr" />

  <!-- ── API Keys ─────────────────────────────────────────────────────── -->
  <h3 class="acc-h3">API Keys</h3>
  <div class="acc-row">
    <div class="col-md-12 acc-panel">
      <div class="acc-table-responsive">
        <div class="row" style="margin-bottom: 10px">
          <div class="col-md-2">
            <form method="POST" action="?/createApiKey" use:enhance={save}>
              <button class="acc-btn acc-btn-success acc-mb" type="submit">New Api key</button>
            </form>
          </div>
          <div class="col-md-2">
            <a
              class="acc-btn acc-btn-primary acc-mb"
              href={resolve('/account/api-docs')}
              target="_blank"
              rel="noopener noreferrer">API Docs</a
            >
          </div>
        </div>
        <table class="acc-table">
          <thead>
            <tr><th>_id</th><th>secret</th><th class="acc-th-center">Actions</th></tr>
          </thead>
          <tbody>
            {#if data.apiKeys.length === 0}
              <tr><td colspan="3" class="acc-empty-cell">No API keys yet</td></tr>
            {:else}
              {#each data.apiKeys as key (key.id)}
                <tr>
                  <td>
                    {key.id}
                    <!-- The reference marks a narrowed key with a warning padlock beside its id
                         (`i.fa.fa-lock.text-warning[title="Restricted"]`). It is `ng-hide` in the
                         capture only because that key happens to be unrestricted — without it, a
                         key that can call one command from one IP looks identical to one that can
                         call everything from anywhere. -->
                    {#if key.restrictions.ips.length > 0 || key.restrictions.scopes.length > 0}
                      <i class="fa fa-lock acc-text-warning" title="Restricted"></i>
                    {/if}
                  </td>
                  <!-- Hard evidence from the original page.welcome.html is
                       `<td>{{k.apiSecret}}</td>`, including after listApiKeys()
                       reloads the collection. Never turn an unavailable legacy
                       value into a fake masked credential: a hash-only secret is
                       irrecoverable and its existing regen action must replace it. -->
                  <td>
                    {#if key.secret}
                      {key.secret}
                    {:else if key.undecryptable}
                      <!-- Distinct from the legacy hash-only case above, and worth distinguishing:
                           this row's ciphertext is intact but was written under a DIFFERENT
                           `API_KEY_ENCRYPTION_KEY`, so it can never be read again. Rotating writes
                           a fresh envelope under the current key and repairs the row. Saying only
                           "unavailable" would suggest that waiting or reloading might help. It
                           cannot. -->
                      Secret cannot be decrypted with the current key — regen secret
                    {:else}
                      Secret unavailable — regen secret
                    {/if}
                  </td>
                  <td class="acc-td-center">
                    <!-- Three pipe-separated actions, as captured: `regen
                         secret | restrictions | delete`, each an inline link
                         inside a bold label-styled wrapper. The reference
                         nests them in <label> elements that label nothing;
                         these are spans with the same computed box, and the
                         links are buttons because they run an action rather
                         than navigate. -->
                    <span class="acc-api-label"
                      ><form
                        method="POST"
                        action="?/rotateApiKey"
                        use:enhance={confirmThen(
                          `Regenerate the secret for key "${key.id}"? The current secret stops working immediately.`
                        )}
                      >
                        <input type="hidden" name="id" value={key.id} />
                        <button class="acc-link" type="submit">regen secret</button>
                      </form></span
                    >
                    &nbsp; | &nbsp;
                    <span class="acc-api-label"
                      ><button
                        class="acc-link"
                        type="button"
                        onclick={() => (restrictionsFor = restrictionsFor === key.id ? null : key.id)}
                        >restrictions</button
                      ></span
                    >
                    &nbsp; | &nbsp;
                    <span class="acc-api-label"
                      ><form
                        method="POST"
                        action="?/deleteApiKey"
                        use:enhance={confirmThen(
                          `Delete API key "${key.id}"? This cannot be undone.`
                        )}
                      >
                        <input type="hidden" name="id" value={key.id} />
                        <button class="acc-link" type="submit">delete</button>
                      </form></span
                    >
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>

        {#if restrictionsFor}
          {const key = $derived(data.apiKeys.find((k) => k.id === restrictionsFor))}
          {#if key}
            <!-- The reference's `manageApiKeyRestrictions(k)`. A key is issued
                 unrestricted — it can call every command from anywhere — and this
                 narrows it. Both lists empty means no restriction, which is what
                 an existing key keeps. -->
            <form
              class="acc-panel-default acc-restrictions"
              method="POST"
              action="?/saveApiKeyRestrictions"
              use:enhance={save}
            >
              <div class="acc-panel-heading">
                <h3 class="acc-panel-title">Restrictions — {key.id}</h3>
              </div>
              <div class="acc-panel-body">
                <input type="hidden" name="id" value={key.id} />

                <div class="acc-field">
                  <label for="api-ips">Allowed IP addresses</label>
                  <input
                    class="acc-input"
                    id="api-ips"
                    name="ips"
                    placeholder="203.0.113.7, 198.51.100.0/24"
                    value={key.restrictions.ips.join(', ')}
                  />
                  <span class="acc-hint">
                    IPv4 addresses or CIDR blocks, comma separated. Leave blank to allow any.
                  </span>
                </div>

                <fieldset class="acc-field">
                  <legend>Allowed commands</legend>
                  <span class="acc-hint">Leave all unticked to allow every command.</span>
                  {#each data.apiScopes as scope (scope)}
                    <label class="acc-scope">
                      <input
                        type="checkbox"
                        name="scopes"
                        value={scope}
                        checked={key.restrictions.scopes.includes(scope)}
                      />
                      {scope}
                    </label>
                  {/each}
                </fieldset>

                <div class="acc-field">
                  <button class="acc-btn acc-btn-primary" type="submit">Save restrictions</button>
                  <button
                    class="acc-btn acc-btn-default"
                    type="button"
                    onclick={() => (restrictionsFor = null)}>Close</button
                  >
                </div>
              </div>
            </form>
          {/if}
        {/if}
      </div>
    </div>
  </div>

</div>
