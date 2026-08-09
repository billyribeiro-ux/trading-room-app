<script lang="ts">
  import { enhance } from '$app/forms';
  import { asset, resolve } from '$app/paths';
  import { bootbox } from '$lib/bootbox.svelte';
  import Editable from '$lib/components/Editable.svelte';
  import { formatLastLogin } from '$lib/last-login-format';
  import PermissionsModal from '$lib/components/PermissionsModal.svelte';
  import RichTextEditor from '$lib/components/RichTextEditor.svelte';
  import { AUTH_MODES, isRegistrationMode, showsRoomLinks } from '$lib/auth-modes';
  import { isRoomTrial } from '$lib/room-member-role';
  import type { RoomSettingDef } from '$lib/room-settings-schema';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { untrack } from 'svelte';
  import type { PageProps } from './$types';

  /**
	 * Manage Session — rebuilt from `evidence-dumps/login-page/manage`, the served DOM of the
   * reference's `#/page/manageSession`, and measured against a render of that
   * capture (see src/manage.css for how the reference rects were obtained).
   *
   * Structure, in the reference's order:
   *   .panel.panel-default
   *     .panel-heading > .panel-title   title, live count, Reset Counts,
   *                                     and the right-floated Launch / Clone /
   *                                     Delete / Marketplace buttons
   *     .panel-body
   *       .form-vertical                Room Title, Authorization Mode, then the
   *                                     Room / Vanity / Unique link rows
   *       ul.nav.nav-tabs + .tab-content    six tabs
   *     .panel-footer
   *
   * The restricted reference hides tabs behind tenant/configuration flags. This
   * implementation renders every built tab; future access decisions come from
   * the server-only entitlement policy.
   */
  let { data, form }: PageProps = $props();

  const ajaxLoader = asset('/ajax_loader.gif');
  const avatarPlaceholder = asset('/avatar-placeholder.svg');

  let openMenu = $state<string | null>(null);
  let openRowMenu = $state<number | null>(null);
  let openSubmenu = $state<string | null>(null);
  let permissionsFor = $state<number | null>(null);
  let dontTouchShown = $state(false);
  /**
   * `showAdServer` — the second disclosure inside the DON'T TOUCH block.
   *
   * The reference reveals the live repeater console by clicking the HELPER TEXT under
   * "Repeater List": `<label class="muted" ng-click="showAdServer=true;">`. It is a one-way
   * flag there (`=true`, never toggled back), and it also un-hides the amber
   * "Apply  server / repeaters to entire account?" button inside that same row.
   *
   * Rendered with `{#if}` rather than `hidden`, matching how `dontTouchShown` — the identical
   * `ng-show` disclosure one level up — is already rendered on this page.
   */
  let showAdServer = $state(false);
  let selected = $state<number[]>([]);

  /**
   * "Apply to all rooms?" — `ng-model="applyToAllRooms"` in the reference.
   *
   * It sits in `.users-many-actions`, one level ABOVE both bulk dropdowns, so it
   * scopes the selection rather than any one action: with it on, every bulk action
   * — including "Remove All" and "BAN" — reaches the same PEOPLE in every room this
   * account owns. Sent as a hidden field on each bulk form so the server decides
   * scope from the submission rather than from remembered UI state.
   */
  let applyToAllRooms = $state(false);

  /** `ng-if="completeUserList && completeUserList.length>0"` — the owner has no checkbox. */
  const selectableIds = $derived(data.users.filter((u) => u.role !== 0).map((u) => u.id));
  const allSelected = $derived(
    selectableIds.length > 0 && selectableIds.every((id) => selected.includes(id))
  );

  /** `getCheckedAllUserIds()` — toggles the whole selectable set. */
  function toggleSelectAll() {
    selected = allSelected ? [] : [...selectableIds];
  }

  /**
   * A checkbox can be changed after SSR but before hydration. Svelte correctly
   * leaves that DOM property alone while hydrating, but an empty `bind:group`
   * model cannot infer the pre-hydration edit. Adopt an already-checked member
   * once when its element attaches; subsequent changes remain owned by the
   * native group binding.
   */
  function preserveHydratedGroupSelection(memberId: number) {
    return (input: HTMLInputElement) => {
      if (!input.checked) return;

      // Do not make every member attachment reactive to the whole selection.
      untrack(() => {
        if (!selected.includes(memberId)) selected = [...selected, memberId];
      });
    };
  }

  /**
   * "Actions With the Email List" — the reference pops a `bootbox.prompt` titled
   * "Enter comma separated email list" with a textarea, then applies the bulk
   * actions to those people instead of the checked rows. Here it resolves the
   * pasted addresses to this room's members and checks them, so the same menu
   * above operates on them and the operation is still scoped to rows the server
   * will accept.
   *
   * Splitting on commas, semicolons and whitespace because a pasted list is
   * rarely only commas. Addresses that are not in this room are reported rather
   * than silently dropped — a bulk action that quietly skips half the list is
   * worse than one that says so.
   */
  async function selectByEmailList() {
    const entered = await bootbox.prompt('Enter comma separated email list');
    if (entered === null) return;

    const wanted = entered
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .filter((email, index, all) => all.indexOf(email) === index);
    if (wanted.length === 0) return;

    /* role 0 is the owner, who has no checkbox — see the table below. Selecting
       them here would let the email list reach a member the UI deliberately puts
       out of reach of every bulk action, so they are reported, not selected. */
    const byEmail = Object.fromEntries(
      data.users.filter((u) => u.role !== 0).map((u) => [u.email.toLowerCase(), u.id])
    );
    const owners = data.users.filter((u) => u.role === 0).map((u) => u.email.toLowerCase());

    const found = wanted.filter((e) => e in byEmail);
    const skippedOwners = wanted.filter((e) => owners.includes(e));
    const missing = wanted.filter((e) => !(e in byEmail) && !owners.includes(e));

    selected = found.map((e) => byEmail[e]);
    setOpenMenu('bulk');

    if (missing.length || skippedOwners.length) {
      const notes = [
        `${found.length} of ${wanted.length} selected.`,
        missing.length ? `Not in this room: ${missing.join(', ')}` : '',
        skippedOwners.length ? `Cannot be actioned (room owner): ${skippedOwners.join(', ')}` : ''
      ].filter(Boolean);
      await bootbox.confirm(notes.join(' '));
    }
  }
  let logoForm: HTMLFormElement | null = null;
  /** the webinar reminder's "Event Time"; scope-local in the reference too */
  let webinarTimeTxt = $state('');
  let bulkBadgeMode = $state<string | null>(null);
  let loadFromRoom = $state(false);
  /** the monthly roll-up, computed here from real logins — never invented */
  let monthly = $state<{ month: string; logins: number }[]>([]);

  function loadMonthly() {
    const byMonth: Record<string, number> = {};
    for (const row of visibleStats) {
      if (!row.lastLoginAt) continue;
      const key = new Date(row.lastLoginAt).toISOString().slice(0, 7);
      byMonth[key] = (byMonth[key] ?? 0) + 1;
    }
    monthly = Object.entries(byMonth)
      .map(([month, logins]) => ({ month, logins }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }
  let noteFor = $state<number | null>(null);
  let renameFor = $state<number | null>(null);
  let passwordFor = $state<number | null>(null);
  /* User Stats controls — the reference's date fields are scope-local and never
     persist (they carry no onaftersave), so these are page state too. */
  let statsFrom = $state('');
  let statsTo = $state('');
  let statsSearch = $state('');
  let statsOnlineOnly = $state(false);
  let statsTrialsOnly = $state(false);
  let statsMobileOnly = $state(false);
  let statsDedupe = $state(false);
  let statsReversed = $state(false);
  let statsLoaded = $state(false);
  let logoInput: HTMLInputElement | null = null;
  // Writable derived drafts follow a different room after client navigation,
  // while user input owns each draft until its server seed actually changes.
  let textList = $derived(data.room.textList ?? '');
  let landingHtml: string = $derived(data.landingHtml);
  let search = $state('');

  const permissionsTarget = $derived(data.users.find((u) => u.id === permissionsFor) ?? null);


  const visibleStats = $derived.by(() => {
    let rows = data.stats.filter((r) => {
      if (!r.lastLoginAt) return false;
      const at = new Date(r.lastLoginAt);
      if (statsFrom && at < new Date(statsFrom)) return false;
      // an end date means the whole of that day, not midnight at its start
      if (statsTo && at > new Date(new Date(statsTo).getTime() + 86_400_000 - 1)) return false;
      return true;
    });
    const q = statsSearch.trim().toLowerCase();
    if (q) rows = rows.filter((r) => r.displayName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
    if (statsTrialsOnly) rows = rows.filter(isRoomTrial);
    if (statsDedupe) {
      const seen: string[] = [];
      rows = rows.filter((r) => {
        if (seen.includes(r.email)) return false;
        seen.push(r.email);
        return true;
      });
    }
    return statsReversed ? [...rows].reverse() : rows;
  });

  /*
    Two of the four Stats checkboxes CANNOT filter, and say so rather than silently doing nothing.

    `statsOnlineOnly` and `statsMobileOnly` were bound to inputs and read by nothing — the exact
    "control whose only effect is on itself" this project forbids. The two are not the same case:

    - `showMobileStat` IS a real filter in the reference: it is the sixth argument to
      `loadStats(...)` (file2:915). But the predicate behind "mobile" is an evidence gap already
      recorded for the Users tab, where `room_users` has three columns that could each plausibly
      mean it and picking one would be inventing the semantics.
    - `filterOnline` is passed to NOTHING in the reference. It appears in neither `loadStats(...)`
      nor the repeat's only filter expression (`| filter: uSearchStat`, file2:975). On this evidence
      it does nothing there either — but "the reference is also broken" is not a reason to ship a
      dead control silently.

    Same mechanism the Users tab already uses for its unsupported filters: the control stays, and
    the reason is on screen.
  */
  const unsupportedStatsFilters = $derived(
    [statsOnlineOnly ? 'Show Online Users Only' : null, statsMobileOnly ? 'Show Mobile Only?' : null].filter(
      (name): name is string => name !== null
    )
  );

  const bySection = $derived.by(() => {
    const grouped: Record<string, RoomSettingDef[]> = {};
    for (const def of data.schema) (grouped[def.section] ??= []).push(def);
    return grouped;
  });

  /** the Settings tab splits at the reference's "DON'T TOUCH" heading */
  const settingsMain = $derived((bySection.settings ?? []).filter((d) => d.group !== 'dont-touch'));

  /*
    API secret sits in the MIDDLE of the settings list, not after it.

    The reference's order is `… collectsUserStats → API secret (+ New Secret) → API POST Routes
    Docs → slackPostURL → diasableFCMAlerts → …`. `apiSecret` has its own block here because of the
    New Secret button, and that block used to be emitted after the whole loop — so it rendered
    twice (once by the loop, which does not exclude it, once by the block) and the thirteen
    settings that follow it in the schema were hoisted above it.

    Splitting the list at `apiSecret` fixes both: the loop no longer reaches it, and the tail
    resumes underneath the docs link where the reference has it.
  */
  const apiSecretIndex = $derived(settingsMain.findIndex((d) => d.name === 'apiSecret'));
  const settingsBeforeApiSecret = $derived(
    apiSecretIndex === -1 ? settingsMain : settingsMain.slice(0, apiSecretIndex)
  );
  const settingsAfterApiSecret = $derived(
    apiSecretIndex === -1 ? [] : settingsMain.slice(apiSecretIndex + 1)
  );
  const apiSecretDef = $derived(apiSecretIndex === -1 ? undefined : settingsMain[apiSecretIndex]);
  const settingsDontTouch = $derived(
    (bySection.settings ?? []).filter((d) => d.group === 'dont-touch')
  );

  /**
   * The DON'T TOUCH block is NOT a loop.
   *
   * Its 49 fields sit among 13 pieces of structural furniture — 6 `<hr>`, 2 bare `<br>`, 2 empty
   * `<p>`, 2 prose paragraphs and 2 button `<div>`s — and two of its rows pack TWO fields into one
   * `<p>`. A flat `{#each}` cannot express any of that, so the block names each field in the
   * reference's own DOM order and looks it up here.
   */
  const dontTouchByName = $derived(new Map(settingsDontTouch.map((d) => [d.name, d])));

  /**
   * Fails loud rather than rendering an empty row: every name below is written out by hand, so one
   * that is not in the schema is a defect in this file, not a runtime condition. Pinned from the
   * other side too — `dont-touch-block.test.ts` asserts the rendered names and the schema's
   * `dont-touch` group are the same 49, in the same order.
   */
  function dontTouch(name: string): RoomSettingDef {
    const def = dontTouchByName.get(name);
    if (!def) throw new Error(`no DON'T TOUCH setting named ${name}`);
    return def;
  }

  /*
    Three pieces of DON'T TOUCH copy, held here rather than written as template text.

    Two of them contain a DOUBLE SPACE that is the reference's, and `prettier --write` collapses a
    run of spaces inside HTML text — verified: `These  vars` comes back `These vars`. So the
    formatter would quietly repair the very typos this block is being matched against, and a string
    is out of its reach. (`{'…'}` in the markup works too, and `svelte/no-useless-mustaches` rejects
    it — with an autofix that reintroduces exactly this bug.)

    The rest is transcribed as found: "server" for "serve" and "altertaive" for "alternative" in the
    first, and the word that appears to be missing after "Apply" in the third — P22 §13 records that
    that gap holds no child element, so nothing was elided by the capture.
  */
  const ALT_CODE_INTRO = 'These  vars allow to server altertaive code version for this room';
  const LINKED_ROOMS_INTRO =
    'For pushing alerts and streams to other rooms, you can use the following settings. You need the other rooms ID and the API Secret of the other room to do this.';
  const APPLY_REPEATERS_LABEL = 'Apply  server / repeaters to entire account?';

  function attachLogoForm(element: HTMLFormElement) {
    logoForm = element;
    return () => {
      if (logoForm === element) logoForm = null;
    };
  }

  function attachLogoInput(element: HTMLInputElement) {
    logoInput = element;
    return () => {
      if (logoInput === element) logoInput = null;
    };
  }

  const settingValue = (name: string) =>
    (data.settings as Record<string, string | number | boolean | null>)[name];

  /**
   * Exactly the reference's set. "Admin" is not a role of its own — it is role 1
   * with `nonPresenter`, which is why this takes the member rather than a number.
   */
  const isWebinar = $derived(settingValue('roomType') === 'webinar');
  const isRegistration = $derived(isRegistrationMode(settingValue('authMode')));
  /** `ng-show="authMode=='webinarRoom' || 'open' || 'unamePW' || allowPWLoginWithSSO"` */
  const showsLinks = $derived(
    showsRoomLinks(settingValue('authMode'), settingValue('allowPWLoginWithSSO'))
  );

  const roleLabel = (u: { role: number; nonPresenter: boolean }) => {
    if (u.role === 0) return 'Owner';
    if (u.role === 1) return u.nonPresenter ? 'Admin' : 'Presenter';
    if (u.role === 2) return 'Participant';
    /*
      Roles 3 and 4 render NO role name at all.

      The reference has four separate role spans — `ng-show="user.role==2"`, `==0`,
      `==1 && !nonPresenter`, `==1 && nonPresenter` — and none of them matches role 3 or 4. So a
      chat-muted member's cell shows only the red "CHAT MUTED" span and the `/ …` token; there is
      no "Participant" beside it.

      This has now been wrong twice. It first RETURNED 'CHAT MUTED', which replaced the role; the
      fix over-corrected to 'Participant', which the reference does not print either.
    */
    if (u.role === 3 || u.role === 4) return '';
    return `Role ${u.role}`;
  };

  /** the per-row menu — opcodes verified against the reference's updateUser */
  /**
   * The Permissions submenu, label for label and opcode for opcode as the
   * reference's row template binds them. Six of these — 7, 8, 10, 11, 13, 14 —
   * were previously documented here as room settings; the capture shows every
   * one reading `user.*`, so they are row state.
   */
  /*
    `icons` is a LIST because four of these items carry two glyphs, not one.

    The reference's row menu holds 45 `<i>` elements; ours held 8. Every label below was already
    right and every opcode already right, so the menu behaved correctly and looked nothing like the
    original — 36 missing icons per row, 108 across the three captured rows.

    `dividerAfter` restores the `li.divider` elements: the reference has 8 per row menu and we had
    2. They are not decoration — they are what separates "change this member's role" from "undo a
    ban", and without them the menu is one undifferentiated list of sixteen items.
  */
  const PERMISSIONS = [
    { op: 1, label: 'Make Presenter', icons: ['fa-microphone', 'fa-desktop'] },
    { op: 5, label: 'Make Admin', icons: ['fa-cog', 'fa-user-md'] },
    { op: 2, label: 'Make Participant', icons: ['fa-user'] },
    { op: 6, label: 'Make Trial', icons: ['fa-user'] },
    { op: 3, label: 'MUTE Participant', icons: ['fa-user-times'] },
    { op: 4, label: 'BAN', icons: ['fa-user-times'], dividerAfter: true },
    { op: 2, label: 'Unban', icons: ['fa-user'] },
    { op: 9, label: 'Freshen Login Date', icons: ['fa-clock-o'] }
  ] as { op: number; label: string; icons: string[]; dividerAfter?: boolean; tight?: boolean }[];

  /*
    The "Granular Perms" submenu — per-user visibility and access.

    Order is the reference's, which differs from ours: Show/Hide User Count, then BOTH archives
    items, then BOTH personal-data items. Ours interleaved them the other way round.

    HONEST GAP on two glyphs: `fa-user-circle` (FontAwesome 4.7) has no `::before` in the capture,
    because the sheet loaded there is 4.3 — so those two items very likely render as empty boxes in
    the reference itself. Transcribed as captured rather than substituted for a glyph that exists.
  */
  const GRANULAR = [
    /*
      Only the ARCHIVES pair is conditional. Everything else here is shown unconditionally.

      Ours gated all six on `when`, so a member always saw exactly one of "Show User Count" /
      "Hide User Count" and one of the personal-data pair. The reference carries no `ng-show` on
      those four at all — both members of each pair are always in the menu, and it is the operator
      who picks. Only `Deny`/`Allow Archives Access` swap, on `user.denyArchivesAccess`.

      The two User Count items are also the only ones with NO `&nbsp;&nbsp;` between glyph and
      label — the icon butts straight against the text. Transcribed, not tidied.
    */
    { op: 8, label: 'Show User Count', icons: ['fa-user-circle'], tight: true },
    { op: 7, label: 'Hide User Count', icons: ['fa-user-circle'], tight: true },
    { op: 13, label: 'Deny Archives Access', icons: ['fa-hdd-o'], when: (u: Member) => !u.denyArchivesAccess },
    { op: 14, label: 'Allow Archives Access', icons: ['fa-hdd-o'], when: (u: Member) => u.denyArchivesAccess },
    { op: 10, label: 'Hide Pers User Data', icons: ['fa-lock'] },
    { op: 11, label: "Don't Hide Pers User Data", icons: ['fa-user'] }
  ] as {
    op: number;
    label: string;
    icons: string[];
    tight?: boolean;
    when?: (u: Member) => boolean;
  }[];

  type Member = PageProps['data']['users'][number];

  /** `?/showAppTokens` returns the member's registered push tokens, last six only. */
  type AppToken = { platform: string; lastSix: string; addedAt: number };

  /**
   * "Actions With Selected" — a DIFFERENT enum from the row menu's, and its own
   * icons. Two of these carry a PAIR of icons separated by a non-breaking space,
   * which is how the reference distinguishes the two presenter-ish roles at a
   * glance: a microphone and a screen for a presenter, a cog and a doctor for an
   * admin who does not present.
   */
  const BULK = [
    { op: 10, label: 'Remove All', icons: ['icon fa fa-trash'] },
    { op: 2, label: 'UNBAN Participant', icons: ['icon fa fa-user'] },
    { op: 1, label: 'Make Presenter', icons: ['fa fa-microphone', 'fa fa-desktop'] },
    { op: 5, label: 'Make Admin (Non-Presenter)', icons: ['fa fa-cog', 'fa fa-user-md'] },
    { op: 2, label: 'Make Participant', icons: ['icon fa fa-user'] },
    { op: 6, label: 'Make TRIAL user', icons: ['icon fa fa-user'] },
    { op: 3, label: 'MUTE Participant', icons: ['fa fa-user-times'] },
    { op: 4, label: 'BAN Participant', icons: ['fa fa-user-times'] }
  ];

  const save: SubmitFunction = () => async ({ update }) => update({ reset: false });

  /** close the inline row form once its save has landed */
  const rowFormDone =
    (close: () => void): SubmitFunction =>
    () =>
    async ({ update }) => {
      await update({ reset: false });
      close();
    };

  function confirmThen(message: string): SubmitFunction {
    return async ({ cancel }) => {
      if (!(await bootbox.confirm(message))) {
        cancel();
        return;
      }
      return async ({ update }) => update({ reset: false });
    };
  }

  function setOpenMenu(id: string | null) {
    openMenu = id;
    openRowMenu = null;
    openSubmenu = null;
  }

  function toggleMenu(id: string) {
    setOpenMenu(openMenu === id ? null : id);
  }

  /**
   * The Vanity Link editor — a bootbox prompt, matching the reference.
   *
   * Its title, input type and button pair are transcribed from the reference's own rendered modal:
   * a single-line `bootbox-input-text`, an OK and a Cancel, and the exact wording below. The
   * constraint in that wording is real — the value becomes a URL path segment — so it is also
   * enforced here rather than only described.
   */
  let vanityForm = $state<HTMLFormElement | null>(null);
  let vanitySlug = $state('');

  async function editVanity() {
    const entered = await bootbox.prompt(
      'Enter your desired name. (Only letters and numbers allowed. No spaces or special characters allowed, as this is a URL)',
      'OK',
      'text'
    );
    if (entered === null) return;

    const slug = entered.trim();
    if (!slug) return;

    /*
      Checked before posting, because the prompt's own title promises it. Letting an invalid value
      reach the server would produce a refusal the operator has already been told to avoid — and
      the server still validates, so this is a courtesy, not the guard.
    */
    if (!/^[A-Za-z0-9]+$/.test(slug)) {
      await bootbox.confirm('Only letters and numbers are allowed. No spaces or special characters.');
      return;
    }

    vanitySlug = slug;
    vanityForm?.requestSubmit();
  }

  function toggleRowMenu(memberId: number) {
    openMenu = null;
    openRowMenu = openRowMenu === memberId ? null : memberId;
    openSubmenu = null;
  }

  /** Integration configuration guidance — never authorization-denial copy. */
  const featureReason = (id: string) =>
    data.featureDefs.find((f) => f.id === id)?.reason ?? '';

  async function copy(id: string) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return;
    await navigator.clipboard.writeText(el.value);
  }

  function exportSettings() {
    const blob = new Blob([JSON.stringify(data.settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `room-${data.room.shortCode}-settings.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv(rows: string[][], name: string) {
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<svelte:head>
  <title>Manage Room {data.room.shortCode} — ProTradingRoom</title>
  <meta name="description" content={`Manage settings, members, branding, and permissions for ${data.room.name}.`} />
</svelte:head>

<svelte:window
  onclick={(e) => {
    // One open menu at a time. A control outside `.dropdown` still owns the
    // state change from its click, so do not close it in the same bubble cycle.
    if (
      !(e.target instanceof Element) ||
      !e.target.closest('.dropdown, [data-menu-control], [data-menu-panel]')
    ) {
      openMenu = null;
      openRowMenu = null;
      openSubmenu = null;
    }
  }}
/>

<!--
  The DON'T TOUCH block's three row shapes, hoisted out of the block itself so that what is left
  down there is the reference's 62 group-children and nothing else.

  Shapes, and their counts among those 62 (P22 §5): 24 rows are label + editable with no helper at
  all, 19 are label + editable + `<br>` + `label.muted`, and 6 carry their helper as a BARE TEXT
  NODE on the row's own `<p>` instead — a different element, not a `.muted` label. `dtRow` covers
  the first two (the presence of `def.help` is exactly what separates them), `dtNote` the third.
-->
{#snippet dtField(name: string)}
  {@const def = dontTouch(name)}
  <label class="col-sm-2 control-label" for={`mg-${def.name}`}>{def.label ?? def.name}</label>
  <span id={`mg-${def.name}`}>
    <Editable {def} value={settingValue(def.name)} markUnwired />
  </span>
{/snippet}

{#snippet dtHelp(name: string)}
  <!-- the reference's `label.muted`; a span with the same computed box, because it labels no
       control. `.muted` is a dead class in these stylesheets — see the note in manage.css. -->
  <span class="muted">{dontTouch(name).help}</span>
{/snippet}

{#snippet dtRow(name: string)}
  <p class="form-control-static">
    {@render dtField(name)}
    {#if dontTouch(name).help}
      <br />
      {@render dtHelp(name)}
    {/if}
  </p>
{/snippet}

{#snippet dtNote(name: string, note: string)}
  <p class="form-control-static">
    {@render dtField(name)}
    <!-- `note` is a JS string, not template text. Three of the six notes and both prose
         paragraphs in this block carry the reference's own typos, and `prettier --write` collapses
         a run of spaces inside HTML text — verified, `These  vars` comes back `These vars`. A
         string literal is the only form the formatter cannot silently repair. -->
    {note}
  </p>
{/snippet}

<div class="mg-root">
  <div class="panel panel-default">
    <div class="panel-heading">
      <div class="panel-title">
        <span>Manage Room id: {data.room.shortCode}&nbsp;&nbsp;( {data.room.publicId} )</span>
        <span class="text-muted">
          Current <i class="icon fa fa-user"></i>: {data.users.length} / Max
          <i class="icon fa fa-user"></i> {data.room.maxUsers}
        </span>
        <form
          method="POST"
          action="?/resetMaxCount"
          style="display:inline"
          use:enhance={confirmThen('Reset the user counts for this room?')}
        >
          <button class="btn btn-link btn-warning" type="submit">
            <i class="icon fa fa-refresh"></i> Reset Counts
          </button>
        </form>

        <!-- `ng-href` on the reference's Launch button: the full handoff URL, minted at page
             load. Cross-origin whenever ROOM_BASE_URL names a separate room, so `resolve()`
             does not apply. -->
        <!-- eslint-disable svelte/no-navigation-without-resolve -->
        <a
          class="btn btn-sm pull-right btn-info mr"
          href={data.launchUrl}
          target="_blank"
          rel="noopener noreferrer"><i class="icon fa fa-external-link"></i>&nbsp;Launch</a
        >
        <!-- eslint-enable svelte/no-navigation-without-resolve -->
        {#if data.canClone}
          <!-- `ng-show="sess.canClone || sess.isClonedRoom || canCloneClicks"` -->
          <form
            method="POST"
            action="?/cloneRoom"
            style="display:inline"
            use:enhance={confirmThen(`Clone "${data.room.name}" into a new room?`)}
          >
            <button class="btn btn-sm pull-right btn-warning mr" type="submit">
              <i class="icon fa fa-copy" aria-hidden="true"></i>&nbsp;Clone Room
            </button>
          </form>
        {/if}
        {#if data.canDelete}
          <!-- the reference limits this to clones; that is a sample guard, and a
               paying owner can delete a room they own -->
          <form
            method="POST"
            action="?/deleteRoom"
            style="display:inline"
            use:enhance={confirmThen(
              `Delete room "${data.room.name}"? This cannot be undone.`
            )}
          >
            <button class="btn btn-sm pull-right btn-danger mr" type="submit">
              <i class="icon fa fa-trash" aria-hidden="true"></i>&nbsp;Delete Room
            </button>
          </form>
        {/if}
        {#if !data.disableMarketplace}
          <a
            class="btn btn-sm pull-right btn-default mr"
            href={resolve(`/account/rooms/${data.room.id}?tab=marketplace`)}
          >
            <i class="fa fa-credit-card"></i>&nbsp;Marketplace
          </a>
        {/if}
      </div>
    </div>

    <div class="panel-body">
      <!--
        EVERY failure on this page was silent, and that is why "nothing works".

        `+page.server.ts` has 43 `fail()` paths — a name that is blank, a vanity slug already
        taken, a setting that is not in the schema, a logo of the wrong type, a member who is not
        in this room — and each returns a `message` that NOTHING here rendered. `form` was declared
        as a prop on line 36 and never read once.

        So editing a field did this: the click opened the editor, the save posted, the server
        refused it, `enhance` put the reason on `form`, and the page redrew EXACTLY as before. No
        change, no error, and nothing in the browser console — because there was no error. The
        server was declining politely and nobody was listening. From the operator's side that is
        indistinguishable from a dead control, which is precisely how it was reported.

        The same defect was fixed on the account page earlier; this page was missed. `.acc-error`
        already existed for it there, so this uses `mg-error` scoped to the manage stylesheet.

        Not a divergence from the reference: it reports failures through bootbox alerts, which is
        the same information in a different container. Silence is not what it does.
      -->
      {#if form?.message}
        <p class="mg-error" role="alert">{form.message}</p>
      {/if}
      <div class="form-vertical">
        <div class="form-group m0">
          <label class="col-sm-2 control-label" for="mg-name">Room Title</label>
          <div class="col-sm-10">
            <p class="form-control-static" id="mg-name">
              <Editable def={data.fieldByName.name} value={data.room.name} />
            </p>
          </div>
        </div>

        <!-- `ng-show="sess.roomType=='webinar'"` -->
        <div class="form-group m0" hidden={!isWebinar}>
          <label class="col-sm-2 control-label" for="mg-webinardate">Date:</label>
          <div class="col-sm-10">
            <p class="form-control-static" id="mg-webinardate">
              <Editable def={data.fieldByName.webinarDate} value={settingValue('webinarDate')} />&nbsp;<br />
              <!-- the reference wraps this in a bare <muted> element, which no
                   stylesheet defines; a span renders identically and is valid -->
              <span>(NOTE: use your local time. It will be converted to the user's local time)</span>
            </p>
          </div>
        </div>

        <div class="form-group m0">
          <label class="col-sm-2 control-label" for="mg-authmode">Authorization Mode</label>
          <div class="col-sm-10">
            <p class="form-control-static" id="mg-authmode">
              <Editable def={data.fieldByName.authMode} value={settingValue('authMode')} options={AUTH_MODES} />
            </p>
          </div>
        </div>

        <!-- `ng-show="sess.authMode=='registrationA' || sess.authMode=='registrationM'"` -->
        <div hidden={!isRegistration}>
          <div class="form-group m0">
            <label class="col-sm-2 control-label" for="webinarRegLinkTxt">Registration Link:</label>
            <div class="input-group">
              <input class="form-control col-md-6" type="text" id="webinarRegLinkTxt" readonly value={data.links.registration} />
              <span class="input-group-btn">
                <button class="btn btn-info" type="button" onclick={() => copy('webinarRegLinkTxt')}>
                  Copy <i class="fa fa-copy"></i>
                </button>
              </span>
            </div>
          </div>
          <br />
          <div class="form-group m0">
            <label class="col-sm-2 control-label" for="webinarTimeTxt">Event Time (for email template):</label>
            <div class="col-sm-10">
              <input type="text" id="webinarTimeTxt" bind:value={webinarTimeTxt} placeholder="at 7pm EST" />
            </div>
          </div>
          <br class="mg-clear" />
          <div class="form-group m0">
            <label class="col-sm-2 control-label" for="mg-emailpreview">Email Preview:</label>
            <div class="col-sm-8">
              <pre style="height: 130px; overflow: scroll;" id="mg-emailpreview">Hello __name__,

This is a friendly reminder to attend the session "{data.room.name}".
We'll get started at {#if !webinarTimeTxt}<strong>FILL TIME ABOVE</strong>{:else}<strong
                  >{webinarTimeTxt}</strong
                >{/if}.
Please click this link to attend: ______ unique link will be here_____
              </pre>
              <form
                method="POST"
                action="?/sendWebinarReminder"
                use:enhance={confirmThen(
                  `Send the reminder email to every member of "${data.room.name}"? This cannot be undone.`
                )}
              >
                <input type="hidden" name="eventTime" value={webinarTimeTxt} />
                <button class="btn btn-default" type="submit" disabled={!webinarTimeTxt}>
                  Send Emails Now
                </button>
              </form>
            </div>
            <br /><br />
          </div>
          <br class="mg-clear" />
        </div>

        <div hidden={!showsLinks}>
          <label class="col-sm-2 control-label" for="webinarLinkTxt">Room Link:</label>
          <div class="input-group">
            <input class="form-control col-md-6" type="text" id="webinarLinkTxt" readonly value={data.links.room} />
            <span class="input-group-btn">
              <button class="btn btn-info" type="button" onclick={() => copy('webinarLinkTxt')}>
                Copy <i class="fa fa-copy"></i>
              </button>
            </span>
          </div>

          <label class="col-sm-2 control-label" for="customLinkTxt">Vanity Link:</label>
          <div class="input-group">
            <input class="form-control col-md-6" type="text" id="customLinkTxt" readonly value={data.links.vanity} />
            <span class="input-group-btn">
              <button class="btn btn-warning" type="button" onclick={editVanity}>
                Edit <i class="fa fa-edit"></i>
              </button>
              <button class="btn btn-info" type="button" onclick={() => copy('customLinkTxt')}>
                Copy <i class="fa fa-copy"></i>
              </button>
            </span>
          </div>
          <!--
            The vanity editor is a BOOTBOX PROMPT, not an inline form.

            Ours dropped a `form-inline` into the page below the field. The reference opens a modal,
            and the owner supplied its rendered markup:

              <h4 class="modal-title">Enter your desired name. (Only letters and numbers allowed.
              No spaces or special characters allowed, as this is a URL)</h4>
              <form class="bootbox-form">
                <input class="bootbox-input bootbox-input-text form-control" autocomplete="off" type="text">
              </form>
              <button data-bb-handler="cancel" class="btn btn-default">Cancel</button>
              <button data-bb-handler="confirm" class="btn btn-primary">OK</button>

            Three things come from that markup and are reproduced exactly: the title string, the
            input type (`bootbox-input-text` — a single-line text field, NOT this app's textarea
            default), and the OK/Cancel pair.

            `?/setCustomRoomURL` is unchanged — only how the value is collected differs. The form
            posts hidden so the action, its validation and its failure message all still apply.
          -->
          <form
            method="POST"
            action="?/setCustomRoomURL"
            use:enhance={save}
            id="vanity-editor"
            bind:this={vanityForm}
            hidden
          >
            <input type="hidden" name="slug" bind:value={vanitySlug} />
          </form>

          <label class="col-sm-2 control-label" for="uniqueLinkTxt">Unique Link:</label>
          <div class="input-group">
            <input class="form-control col-md-6" type="text" id="uniqueLinkTxt" readonly value={data.links.unique} />
            <span class="input-group-btn">
              <!-- The button is a DIRECT child of .input-group-btn, with its form
                   outside and referenced by id. Wrapping it in the form put a
                   node between them, and Bootstrap's corner rules use a child
                   combinator — so Generate kept all four rounded corners where
                   the reference has it square on both sides. -->
              <button class="btn btn-primary" type="submit" form="mg-unique-form">
                Generate <i class="fa fa-link"></i>
              </button>
              <button class="btn btn-info" type="button" onclick={() => copy('uniqueLinkTxt')}>
                Copy <i class="fa fa-copy"></i>
              </button>
            </span>
          </div>
          <form id="mg-unique-form" method="POST" action="?/setUniqueRoomURL" use:enhance={save}></form>

          <!-- `ng-show="sess.hasAppPairLink"` -->
          <div hidden={!settingValue('hasAppPairLink')}>
            <label class="col-sm-2 control-label" for="appPairLink">App Pair Link:</label>
            <div class="input-group">
              <input class="form-control col-md-6" type="text" id="appPairLink" readonly value={data.links.appPair} />
              <span class="input-group-btn">
                <button class="btn btn-info" type="button" onclick={() => copy('appPairLink')}>
                  Copy <i class="fa fa-copy"></i>
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>

      <br />
      <!-- `ng-show="dataLoading"` — the reference's spinner, between the <br> and
           the tabs. Hidden unless a load is in flight, but it is part of the DOM
           the page was measured with. -->
      <div class="div animated fadeIn infinite" style="padding: 25px; text-align: center;" hidden>
        <!-- The real ajax_loader.gif, pulled off the reference by
             scripts/capture-gaps.js. It used to be an honest gap here — the
             asset had never been captured and a fabricated spinner was not
             worth it. -->
        <img src={ajaxLoader} alt="" width="16" height="16" />
        <span>&nbsp;&nbsp;Loading...</span>
      </div>
      <div>
        <ul class="nav nav-tabs">
          <!-- `must-match/important:2-25` — SIX <li>, and only these six. Marketplace is a
               routable pane reached from its own buttons, not a tab; see ALL_TABS for why. -->
          {#each data.tabs.filter((t) => t.strip) as tab (tab.id)}
            <!-- hidden, not absent: `ng-hide` on the <li> is what the reference
                 does, and the pane behind it stays reachable by URL -->
            <li class={{ active: data.tab === tab.id }} hidden={!tab.visible}>
              <a href={resolve(`/account/rooms/${data.room.id}?tab=${tab.id}`)}>{tab.label}</a>
            </li>
          {/each}
        </ul>

        <div class="tab-content">
          <div class="tab-pane active">
            {#if data.tab === 'users'}
              <fieldset>
                <div class="form-group">
                  <div class="col-sm-4 pull-right">
                    <button
                      class="btn btn-md btn-info mt"
                      type="button"
                      data-menu-control
                      aria-expanded={openMenu === 'invite'}
                      aria-controls="invite-editor"
                      onclick={() => toggleMenu('invite')}
                    >
                      <i class="fa fa-user-plus" aria-hidden="true"></i> Add User / Invite
                    </button>
                    <button
                      class="btn btn-md btn-info mt"
                      type="button"
                      onclick={() =>
                        exportCsv(
                          [
                            ['Name', 'Email', 'Role', 'Last login'],
                            ...data.users.map((u) => [
                              u.displayName,
                              u.email,
                              roleLabel(u),
                              u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : ''
                            ])
                          ],
                          `room-${data.room.shortCode}-users.csv`
                        )}
                    >
                      <i class="fa fa-floppy-o" aria-hidden="true"></i> Export
                    </button>
                    <button class="btn btn-md btn-primary mt" type="button" onclick={() => location.reload()}>
                      <i class="fa fa-refresh"></i>&nbsp; Load / Reload Users
                    </button>
                    <div
                      class={['dropdown', { open: openMenu === 'userlist' }]}
                      style="display: inline-block; vertical-align: middle;"
                    >
                      <button
                        class="btn btn-md dropdown-toggle btn-primary mt"
                        type="button"
                        aria-haspopup="true"
                        aria-expanded={openMenu === 'userlist'}
                        onclick={() => toggleMenu('userlist')}
                      >
                        User List Actions&nbsp;<span class="caret"></span>
                      </button>
<!-- Item order is the reference's, read off nodes 16-43 of manage:tab:Users:
                           Free Trials, BANNED, Chat Muted, Mobile, Non-Mobile, Presenters,
                           Marketplace, divider, Remove non-presenters, Remove Free Trials,
                           Remove All User Badges. The last two used to be the other way round,
                           and a "Show All" item we had invented sat above the divider -- the
                           reference gets back to the unfiltered list with its Reload Users
                           button, which we already render. -->
                      <ul class="dropdown-menu" role="menu">
                        <li><a href={resolve(`/account/rooms/${data.room.id}?tab=users&filter=trials`)}>Show Free Trials</a></li>
                        <li><a href={resolve(`/account/rooms/${data.room.id}?tab=users&filter=banned`)}><i class="fa fa-ban"></i> Show BANNED</a></li>
                        <li><a href={resolve(`/account/rooms/${data.room.id}?tab=users&filter=muted`)}><i class="fa fa-comment-o"></i> Show Chat Muted</a></li>
                        <li><a href={resolve(`/account/rooms/${data.room.id}?tab=users&filter=mobile`)}><i class="fa fa-mobile"></i> Show Mobile</a></li>
                        <li><a href={resolve(`/account/rooms/${data.room.id}?tab=users&filter=non-mobile`)}><i class="fa fa-mobile"></i> Show Non-Mobile</a></li>
                        <li><a href={resolve(`/account/rooms/${data.room.id}?tab=users&filter=presenters`)}><i class="fa fa-microphone"></i> Show Presenters</a></li>
                        <li>
                          <a href={resolve(`/account/rooms/${data.room.id}?tab=users&filter=marketplace`)}><i class="fa fa-credit-card"></i> Marketplace Users</a>
                        </li>
                        <li class="divider" role="separator"></li>
                        <li>
                          <form method="POST" action="?/clearUserList" use:enhance={confirmThen('Remove every non-presenter from this room? This cannot be undone.')}>
                            <button type="submit"><i class="fa fa-trash-o"></i> Remove non-presenters</button>
                          </form>
                        </li>
                        <li>
                          <form method="POST" action="?/removeFreeTrials" use:enhance={confirmThen('Remove every non-owner free-trial member from this room? This cannot be undone.')}>
                            <button type="submit"><i class="fa fa-trash-o"></i> Remove Free Trials</button>
                          </form>
                        </li>
                        <li>
                          <form method="POST" action="?/removeBadgesForUsers" use:enhance={confirmThen('Remove all badges from every user in this room?')}>
                            <button type="submit"><i class="fa fa-trash-o"></i> Remove All User Badges</button>
                          </form>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {#if openMenu === 'invite'}
                  <form
                    method="POST"
                    action="?/inviteUser"
                    use:enhance={save}
                    class="form-inline"
                    id="invite-editor"
                    data-menu-panel
                  >
                    <input class="form-control" name="name" placeholder="Name" required />
                    <input class="form-control" name="email" type="email" placeholder="Email" required />
                    <button class="btn btn-primary" type="submit">Invite</button>
                  </form>
                {/if}

                <form class="form-inline" method="GET">
                  <input type="hidden" name="tab" value="users" />
                  <div class="form-group">
                    <label class="control-label" for="uSearch">Search Users</label>
                    <input class="form-control" type="search" id="uSearch" name="q" bind:value={search} />
                    <button class="btn btn-sm btn-primary" type="submit">Search / Load Users</button>
                  </div>
                </form>

                <div class="users-many-actions">
                  <!-- `ng-if="completeUserList && completeUserList.length>0"` -->
                  {#if data.users.length > 0}
                    <div class="checkbox">
                      <label>
                        <input type="checkbox" checked={allSelected} onchange={toggleSelectAll} />
                        <!-- `ng-if="!checkedAllUsers"` — the reference drops the words
                             once every row is checked, leaving a bare checkbox -->
                        {#if !allSelected}<span>Select All</span>{/if}
                      </label>
                      <label class="checkbox-apply-to-all-rooms">
                        <input type="checkbox" bind:checked={applyToAllRooms} />
                        <span>Apply to all rooms?</span>
                      </label>
                    </div>
                  {/if}
                  <span class={['dropdown', { open: openMenu === 'bulk' }]}>
                    <button
                      class="btn dropdown-toggle btn-primary"
                      type="button"
                      aria-haspopup="true"
                      aria-expanded={openMenu === 'bulk'}
                      onclick={() => toggleMenu('bulk')}
                    >
                      Actions With Selected&nbsp;
                      <span class="caret"></span>
                    </button>
                    <!-- inside the same `.dropdown` span as the toggle, which is
                         where the reference puts it -->
                    <button
                      class="btn dropdown-toggle btn-primary"
                      type="button"
                      onclick={selectByEmailList}
                    >
                      Actions With the Email List
                    </button>
                    <!-- `role="menu"`, as the reference has on both of its dropdowns -->
                    <ul class="dropdown-menu" role="menu">
                      {#each BULK as action (action.label)}
                        <li>
                          <form method="POST" action="?/updateManyUsers" use:enhance={confirmThen(`${action.label} — apply to ${selected.length} selected user(s)${applyToAllRooms ? ' in EVERY room on this account' : ''}?`)}>
                            <input type="hidden" name="op" value={action.op} />
                            {#if applyToAllRooms}
                              <input type="hidden" name="applyToAllRooms" value="on" />
                            {/if}
                            {#each selected as id (id)}
                              <input type="hidden" name="roomUserId" value={id} />
                            {/each}
                            <button type="submit" disabled={selected.length === 0}>
                              {#each action.icons as icon, i (icon)}<i class={icon}
                                ></i>{#if i < action.icons.length - 1}&nbsp;{/if}{/each}
                              {action.label}
                            </button>
                          </form>
                        </li>
                      {/each}
                      <!-- `updateManyUsersBadgePrompt('add'|'remove')` -->
                      {#each ['add', 'remove'] as mode (mode)}
                        <li>
                          <button
                            type="button"
                            disabled={selected.length === 0 || data.badges.length === 0}
                            onclick={() => (bulkBadgeMode = bulkBadgeMode === mode ? null : mode)}
                          >
                            <i class="icon fa fa-user"></i> {mode === 'add' ? 'Add Badge' : 'Remove Badge'}
                          </button>
                          {#if bulkBadgeMode === mode}
                            <ul class="dropdown-menu">
                              {#each data.badges as badge (badge.id)}
                                <li>
                                  <form method="POST" action="?/updateManyUsersBadge" use:enhance={save}>
                                    <input type="hidden" name="mode" value={mode} />
                                    <input type="hidden" name="badgeId" value={badge.id} />
                                    {#if applyToAllRooms}
                                      <input type="hidden" name="applyToAllRooms" value="on" />
                                    {/if}
                                    {#each selected as id (id)}
                                      <input type="hidden" name="roomUserId" value={id} />
                                    {/each}
                                    <button type="submit">{badge.label}</button>
                                  </form>
                                </li>
                              {/each}
                            </ul>
                          {/if}
                        </li>
                      {/each}
                  </ul>
                  </span>
                </div>

                {#if data.unsupportedFilter}
                  <!-- Says so, rather than listing every member under a filter's name. The
                       predicate behind Mobile / Non-Mobile / Marketplace is server-side in the
                       reference and appears in no capture; see the note in +page.server.ts. -->
                  <p class="ta-notice">
                    “{data.unsupportedFilter}” is not filtered yet — every member is listed below.
                  </p>
                {/if}

                <table class="table table-striped">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Name / Email</th>
                      <th>Last Login/Notes</th>
                      <th>Role / Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {#each data.users as member, i (member.id)}
                      <tr>
                        <!-- The row number is `$index` — ZERO-based. The three captured rows read
                             "0", "1", "2", and this cell has no child elements at all. Ours printed
                             `i + 1` and also held the checkbox, which belongs next door. -->
                        <td>{i}</td>
                        <td>
                          <!-- The checkbox lives HERE, in Name/Email, not in the number cell: it is
                               the first child of this td and measures x=104.3, the td's own x plus
                               its 8px padding. `ng-show="user.role!==0"` — the owner has none. -->
                          {#if member.role !== 0}
                            <input
                              type="checkbox"
                              aria-label={`Select ${member.displayName}`}
                              value={member.id}
                              {@attach preserveHydratedGroupSelection(member.id)}
                              bind:group={selected}
                            />
                          {/if}
                          <!--
                            The four `ng-show="false"` icons, restored — `must-match/match:6-9`:

                              <i ng-show="false" class="fa fa-folder-o fa-2x ng-hide" aria-hidden="true">
                              <i ng-show="false" class="fa fa-mobile fa-2x ng-hide" aria-hidden="true">
                              <i ng-show="false" class="fa fa-mobile ng-hide" aria-hidden="true">
                              <i ng-show="false" class="fa fa-mobile ng-hide" style="color: red" aria-hidden="true">

                            `ng-show="false"` is a literal, not an expression over data: these are
                            unconditionally hidden in the reference too. They are in the DOM and
                            never visible.

                            They were deleted once. Marked `hidden`, they had rendered anyway — a
                            folder and two phones sat between the checkbox and the avatar on every
                            row — because the HTML `hidden` attribute is only a UA-stylesheet
                            `display: none` and Font Awesome's `.fa { display: inline-block }`
                            outranks it. That is now fixed at the source: `manage.css` line 393
                            gives `.mg-root [hidden]` a `display: none !important`, which is exactly
                            what Angular's own `.ng-hide` carries. So the reason for deleting them
                            no longer holds, and the DOM matches the reference again.

                            Verified by measurement, not by reading the cascade: each of these
                            computes `display: none` inside `.mg-root`.
                          -->
                          <i class="fa fa-folder-o fa-2x" aria-hidden="true" hidden></i>
                          <i class="fa fa-mobile fa-2x" aria-hidden="true" hidden></i>
                          <i class="fa fa-mobile" aria-hidden="true" hidden></i>
                          <i class="fa fa-mobile mg-red" aria-hidden="true" hidden></i>
                          <!--
                            The permission icons, in the reference's order, with NO title attribute.

                            "Microphone" / "WebCam" / "Screenshare" / "AdminChat" / "CanEditNotes"
                            were titles I invented; the original's markup carries none on these five.
                            Only the archives icon has one, and it also carries `style="color: red"`.
                            Every one of them has `aria-hidden="true"`, which ours lacked entirely.
                          -->
                          {#if member.permissions.hasMic}<i class="fa fa-microphone" aria-hidden="true"></i>{/if}
                          {#if member.permissions.hasCam}<i class="fa fa-video-camera" aria-hidden="true"></i>{/if}
                          {#if member.permissions.hasScreen}<i class="fa fa-desktop" aria-hidden="true"></i>{/if}
                          {#if member.permissions.hasAdminChat}<i class="fa fa-comment-o" aria-hidden="true"></i>{/if}
                          {#if member.permissions.canEditNotes}<i class="fa fa-pencil-square-o" aria-hidden="true"></i>{/if}
                          {#if member.denyArchivesAccess}
                            <i class="fa fa-hdd-o mg-red" aria-hidden="true" title="Denied Archives Access"></i>
                          {/if}
                          <!--
                            The name follows the avatar IMMEDIATELY — `<img …>Billy Ribeiro`, no
                            element between them. The Discord line and the TRIAL badge come AFTER the
                            name, not before it, which is where ours had put them.
                          -->
                          <img
                            class="thumb24"
                            src={member.avatarUrl ?? avatarPlaceholder}
                            alt=""
                            width="24"
                            height="24"
                          />{member.displayName}
                          <!-- `ng-show="user.discordUserId"`. Written by the Discord
                               integration, which is not built — see docs/OUTSTANDING.md. -->
                          {#if member.discordUserId}
                            <div class="mg-discord">Discord Username: {member.discordUserId}</div>
                          {/if}
                          <!-- `.badge.badge-danger-chat` — RED. `.badge-danger` is a Bootstrap 4
                               name on a Bootstrap 3 sheet and has no rule at all, so this rendered
                               in the plain grey `.badge` fill. The label is spaced ` TRIAL `. -->
                          {#if member.isFreeTrial}
                            <span class="badge badge-danger-chat mg-trial"> TRIAL </span>
                          {/if}
                          <br />
                          {member.email}
                          <!--
                            `ng-show="showPins && user.mobilePairCode"` — the App PIN marker, which
                            ours did not render at all. Its content is a pipe, the mobile glyph, then
                            the code.
                          -->
                          {#if member.mobilePairCode}
                            <span> | <i class="fa fa-mobile"></i> {member.mobilePairCode} </span>
                          {/if}
                          <!--
                            Both of these lead with non-breaking spaces and put the ICON FIRST: the
                            phone with two, `PW set` with four and its label AFTER the padlock. Ours
                            had "PW set" before the icon and no leading space at all.
                          -->
                          {#if member.phone}<span>&nbsp;&nbsp;<i class="fa fa-phone"></i> {member.phone}</span>{/if}
                          {#if member.hasPassword}<span>&nbsp;&nbsp;&nbsp;&nbsp;<i class="fa fa-lock" aria-hidden="true"></i> PW set</span>{/if}
                          {#if member.hideUserCount}
                            <span class="badge badge-danger">User Count Hidden</span>
                          {/if}
                          {#if member.hidePersInfo}
                            <span class="badge badge-danger">User Personal Info Hidden</span>
                          {/if}
                        </td>
                        <td>
                          {member.lastLoginAt ? formatLastLogin(member.lastLoginAt) : ''}
                          <!-- Both of these belong in Last Login/Notes and are inline
                               `style="color: red"` in the reference. Ours had them in Name/Email
                               and in the body colour, so a member barred from PMs read as ordinary.

                               The PM span leads with the <br> and the glyph, THEN the words —
                               ours had the words first, which put the icon on the following line. -->
                          {#if member.inactive}<span class="mg-red">*** INACTIVE USER ***</span>{/if}
                          {#if member.restrictPmUser}
                            <span class="mg-red"><br /><i class="fa fa-comment-o"></i> User PMs disabled</span>
                          {/if}
                          {#if member.note}<div class="mg-note"><br />{member.note}</div>{/if}
                        </td>
                        <td>
                          <!-- `ng-show="user.inviteStatus=='pending'"` — sends 'approved' -->
                          {#if member.inviteStatus === 'pending'}
                            <form method="POST" action="?/approveUser" use:enhance={save}>
                              <input type="hidden" name="roomUserId" value={member.id} />
                              <input type="hidden" name="status" value="approved" />
                              <button class="btn btn-small btn-warning" type="submit"> APPROVE</button>
                            </form>
                          {/if}
                          <span>{roleLabel(member)}</span>
                          <!--
                            HONEST GAP: the reference prints a second token here — measured
                            "/ login" on one row and "/ manual" on another — from an Angular
                            interpolation whose expression is not in the DOM capture. We cannot name
                            the field, so the slash stands alone rather than hard-coding "login",
                            which is provably wrong for at least one measured row. Recorded in
                            docs/OUTSTANDING.md.
                          -->
                          {#if member.role !== 0}<span> / </span>{/if}
                          <!-- Their own red spans, beside the role rather than instead of it — and
                               for roles 3 and 4 the reference prints no role name at all, because
                               none of its four role spans matches those values. -->
                          {#if member.role === 3}<span class="mg-red">CHAT MUTED</span>{/if}
                          {#if member.role === 4}<span class="mg-red">BANNED</span>{/if}
                        </td>
                        <td>
                          <!-- `ng-hide="user.role==0"` — the owner has no menu -->
                          {#if member.role !== 0}
                            <!--
                              THE ACTIONS BUTTON WAS DEAD, and this attribute is what fixes it.

                              The window click handler closes every menu unless the click landed
                              inside `.dropdown, [data-menu-control], [data-menu-panel]`. This
                              wrapper's class is `btn-group mb-sm mr` — none of them. So `closest()`
                              returned null, and the very click that called `toggleRowMenu` nulled
                              `openRowMenu` again as it bubbled: the menu opened and shut inside one
                              event, and the button looked inert.

                              The toolbar's User List Actions menu never had this problem because
                              its wrapper is `class="dropdown"`. Same handler, same state pattern,
                              one class apart, one worked — the control that proves this diagnosis
                              rather than merely fitting it.

                              `data-menu-control`, and NOT the reference's own `dropdown="dropdown"`
                              (`must-match/match:53`, `file1:445,659`). That is angular-bootstrap's
                              directive — the same category as `ng-click` and `ng-repeat`, which
                              this page does not reproduce either — and it renders nothing at all.
                              It is also not a valid attribute on a div, which `svelte-check` says
                              out loud. A data attribute is invisible, standard, and already this
                              codebase's own mechanism for exactly this.
                            -->
                            <div
                              data-menu-control
                              class={[
                                'btn-group mb-sm mr',
                                { open: openRowMenu === member.id }
                              ]}
                            >
                              <button
                                class="btn dropdown-toggle btn-primary"
                                type="button"
                                aria-haspopup="true"
                                aria-expanded={openRowMenu === member.id}
                                onclick={() => toggleRowMenu(member.id)}
                              >
                                Actions&nbsp;<span class="caret"></span>
                              </button>
                              <!-- `dropdown-menu-right` + `role="menu"`: the reference anchors this
                                   menu to its button's RIGHT edge (measured, both at 1615.9). Without
                                   it a 199px menu opens rightward off the end of the Actions column. -->
                              <ul class="dropdown-menu dropdown-menu-right" role="menu">
                                <li class="dropdown-submenu" class:open={openSubmenu === 'permissions'}>
                                  <button type="button" onclick={() => (openSubmenu = openSubmenu === 'permissions' ? null : 'permissions')}>
                                    <i class="fa fa-shield"></i>&nbsp;&nbsp;Permissions <i class="fa fa-caret-right pull-right"></i>
                                  </button>
                                    <ul class="dropdown-menu">
                                      {#each PERMISSIONS as action (action.label)}
                                        <li>
                                          <form method="POST" action="?/updateUser" use:enhance={save}>
                                            <input type="hidden" name="op" value={action.op} />
                                            <input type="hidden" name="roomUserId" value={member.id} />
                                            <button type="submit">
                                              {#each action.icons as ic, n (ic)}<i class="fa {ic}"></i>{#if n < action.icons.length - 1}&nbsp;{/if}{/each}{#if !action.tight}&nbsp;&nbsp;{/if}{action.label}
                                            </button>
                                          </form>
                                        </li>
                                        {#if action.dividerAfter}
                                          <li class="divider" role="separator"></li>
                                        {/if}
                                      {/each}
                                    </ul>
                                </li>
                                <li class="dropdown-submenu" class:open={openSubmenu === 'granular'}>
                                  <button type="button" onclick={() => (openSubmenu = openSubmenu === 'granular' ? null : 'granular')}>
                                    <i class="fa fa-sliders"></i>&nbsp;&nbsp;Granular Perms <i class="fa fa-caret-right pull-right"></i>
                                  </button>
                                    <ul class="dropdown-menu">
                                      <!-- each pair shows only the one that would change something,
                                           exactly as the reference's ng-show pairs do -->
                                      <!-- The permissions modal opens from HERE, first in Granular
                                           Perms, gated `ng-show="user.role !== 1"`. We had it at
                                           the menu's top level, one level up from where the
                                           reference puts it and with no role gate. -->
                                      {#if member.role !== 1}
                                        <li>
                                          <button
                                            type="button"
                                            onclick={() => {
                                              permissionsFor = member.id;
                                              openRowMenu = null;
                                              openSubmenu = null;
                                            }}
                                          >
                                            Adjust Mic/Cam/Screen/Chat/Notes
                                          </button>
                                        </li>
                                      {/if}
                                      <!-- The divider is NOT inside the role gate. On a presenter's
                                           row the reference hides the item above and keeps this
                                           separator (file2:517-520); ours hid both, so a presenter's
                                           Granular menu ran together with no break at all. -->
                                      <li class="divider" role="separator"></li>
                                      {#each GRANULAR.filter((g) => !g.when || g.when(member)) as action (action.label)}
                                        <li>
                                          <form method="POST" action="?/updateUser" use:enhance={save}>
                                            <input type="hidden" name="op" value={action.op} />
                                            <input type="hidden" name="roomUserId" value={member.id} />
                                            <button type="submit">
                                              {#each action.icons as ic, n (ic)}<i class="fa {ic}"></i>{#if n < action.icons.length - 1}&nbsp;{/if}{/each}{#if !action.tight}&nbsp;&nbsp;{/if}{action.label}
                                            </button>
                                          </form>
                                        </li>
                                      {/each}
                                      <li class="divider" role="separator"></li>
                                      <!--
                                        TWO items, both always present — not one toggling item.

                                        The reference lists `Disallow User2User PM` and
                                        `Allow User2User PM` side by side, each calling
                                        `setUserRestrictPM` with a fixed boolean. Ours collapsed
                                        them into a single button whose label flipped, so the
                                        operator could never see which state they were in without
                                        reading the verb.
                                      -->
                                      <li>
                                        <form method="POST" action="?/setUserRestrictPm" use:enhance={save}>
                                          <input type="hidden" name="roomUserId" value={member.id} />
                                          <input type="hidden" name="restrict" value="on" />
                                          <button type="submit">
                                            <i class="fa fa-comment-o"></i>&nbsp;&nbsp;Disallow User2User PM
                                          </button>
                                        </form>
                                      </li>
                                      <li>
                                        <form method="POST" action="?/setUserRestrictPm" use:enhance={save}>
                                          <input type="hidden" name="roomUserId" value={member.id} />
                                          <input type="hidden" name="restrict" value="" />
                                          <button type="submit">
                                            <i class="fa fa-comment-o"></i>&nbsp;&nbsp;Allow User2User PM
                                          </button>
                                        </form>
                                      </li>
                                      <li class="divider" role="separator"></li>
                                    </ul>
                                </li>
                                <li class="dropdown-submenu" class:open={openSubmenu === 'app'}>
                                  <button type="button" onclick={() => (openSubmenu = openSubmenu === 'app' ? null : 'app')}>
                                    <i class="fa fa-mobile"></i>&nbsp;&nbsp;App and Notifications <i class="fa fa-caret-right pull-right"></i>
                                  </button>
                                    <ul class="dropdown-menu">
                                      <!-- Every one of these is BUILT and stores
                                           something real. They stay disabled until
                                           the room switches the mobile app on, and
                                           the server refuses them too — a disabled
                                           button is a hint, not a control. -->
                                      <!-- The reference has no feature-off notice here. Ours added a
                                           <span class="mg-feature-off"> the original never shows; the
                                           buttons below are already disabled when the room has the
                                           mobile app switched off, which is the hint. -->
                                      <li>
                                        <form method="POST" action="?/getAppPin" use:enhance={save}>
                                          <input type="hidden" name="roomUserId" value={member.id} />
                                          <button type="submit"><i class="fa fa-mobile"></i>&nbsp;&nbsp;Get App PIN</button>
                                        </form>
                                      </li>
                                      <li>
                                        <form method="POST" action="?/showAppTokens" use:enhance={save}>
                                          <input type="hidden" name="roomUserId" value={member.id} />
                                          <button type="submit"><i class="fa fa-mobile"></i>&nbsp;&nbsp;Show App Tokens</button>
                                        </form>
                                      </li>
                                      <!--
                                        `getFCMTokens(user._id, …)` — a DIFFERENT read from Show App
                                        Tokens, which passes `user.alerterAppTokens`. One reads the
                                        alerter app's tokens, the other the FCM push registrations.
                                        Ours served both from one action until now.
                                      -->
                                      <li>
                                        <form method="POST" action="?/getFcmTokens" use:enhance={save}>
                                          <input type="hidden" name="roomUserId" value={member.id} />
                                          <button type="submit"><i class="fa fa-mobile" aria-hidden="true"></i>&nbsp;&nbsp;Get FCM Tokens</button>
                                        </form>
                                      </li>
                                      <li class="divider" role="separator"></li>
                                      {#each [['paused', 'PAUSE Mobile Notifs', 'fa-bell-o'], ['active', 'RESUME Mobile Notifs', 'fa-play'], ['unsubscribed', 'Remove Mobile Notifs', 'fa-trash']] as [state, label, glyph] (state)}
                                        <li>
                                          <form
                                            method="POST"
                                            action="?/setNotifications"
                                            use:enhance={state === 'unsubscribed'
                                              ? confirmThen(`Remove ${member.displayName}'s mobile notifications? Their device registrations are deleted.`)
                                              : save}
                                          >
                                            <input type="hidden" name="roomUserId" value={member.id} />
                                            <input type="hidden" name="state" value={state} />
                                            <button
                                              type="submit"
                                              disabled={member.notificationsState === state}
                                            >
                                              <i class="fa fa-mobile"></i><i class={glyph === 'fa-bell-o' ? 'fa fa fa-bell-o' : `fa ${glyph}`}></i>&nbsp;&nbsp;{label}
                                            </button>
                                          </form>
                                        </li>
                                      {/each}
                                      <!-- `sendTestFCM(user._id, …)` — sits between Remove and Reset
                                           in the reference, and carries the same two glyphs as
                                           PAUSE: the mobile and the bell. -->
                                      <li>
                                        <form method="POST" action="?/sendTestPush" use:enhance={save}>
                                          <input type="hidden" name="roomUserId" value={member.id} />
                                          <button type="submit">
                                            <i class="fa fa-mobile" aria-hidden="true"></i><i class="fa fa fa-bell-o"></i>&nbsp;&nbsp;Send Test Mobile Notifs
                                          </button>
                                        </form>
                                      </li>
                                      <li>
                                        <form method="POST" action="?/resetNotifications" use:enhance={confirmThen(`Reset ${member.displayName}'s mobile notifications?`)}>
                                          <input type="hidden" name="roomUserId" value={member.id} />
                                          <button type="submit"><i class="fa fa-mobile"></i><i class="fa fa-reload"></i>&nbsp;&nbsp;Reset Mobile Notifs</button>
                                        </form>
                                      </li>
                                    </ul>
                                </li>
                                <li class="dropdown-submenu" class:open={openSubmenu === 'badges'}>
                                  <button type="button" onclick={() => (openSubmenu = openSubmenu === 'badges' ? null : 'badges')}>
                                    <i class="fa fa-certificate"></i>&nbsp;&nbsp;Badges <i class="fa fa-caret-right pull-right"></i>
                                  </button>
                                    <ul class="dropdown-menu">
                                      <!-- No placeholder: the reference's Badges submenu is an
                                           empty <ul> when the account has none. -->
                                      {#if data.badges.length > 0}
                                        {#each data.badges as badge (badge.id)}
                                          <li>
                                            <form method="POST" action="?/toggleUserBadge" use:enhance={save}>
                                              <input type="hidden" name="roomUserId" value={member.id} />
                                              <input type="hidden" name="badgeId" value={badge.id} />
                                              <button type="submit">
                                                {member.badges.includes(badge.id) ? 'Remove' : 'Add'} — {badge.label}
                                              </button>
                                            </form>
                                          </li>
                                        {/each}
                                      {/if}
                                    </ul>
                                </li>
                                <li class="divider" role="separator"></li>
                                <li>
                                  <button type="button" onclick={() => (noteFor = member.id)}><i class="fa fa-pencil-square-o"></i>&nbsp;&nbsp;Set Note</button>
                                </li>
                                <li>
                                  <button type="button" onclick={() => (renameFor = member.id)}><i class="fa fa-edit"></i>&nbsp;&nbsp;Edit Username</button>
                                </li>
                                <li>
                                  <form method="POST" action="?/removeUser" use:enhance={confirmThen(`Remove ${member.displayName} from this room? This cannot be undone.`)}>
                                    <input type="hidden" name="roomUserId" value={member.id} />
                                    <button type="submit"><i class="fa fa-trash"></i>&nbsp;&nbsp;Remove User</button>
                                  </form>
                                </li>
                                <!-- The reference separates "Remove User" from "Set/Change
                                     Password". A destructive item sitting flush against a routine
                                     one is how a mis-click happens. -->
                                <li class="divider" role="separator"></li>
                                <li>
                                  <button type="button" onclick={() => (passwordFor = member.id)}><i class="fa fa-lock"></i>&nbsp;&nbsp;Set/Change Password</button>
                                </li>
                                <!-- `sendWelcomeEmail(user._id, …)` — directly under Set/Change
                                     Password and above the divider, as the reference has it. -->
                                <li>
                                  <form method="POST" action="?/sendWelcomeEmail" use:enhance={confirmThen(`Resend the welcome email to ${member.displayName}?`)}>
                                    <input type="hidden" name="roomUserId" value={member.id} />
                                    <button type="submit"><i class="fa fa-envelope"></i>&nbsp;&nbsp;Resend Welcome Email</button>
                                  </form>
                                </li>
                                <li class="divider" role="separator"></li>
                                <!-- the reference's last row-menu item:
                                     `approveUser(userName, _id, $index, 'pending')` -->
                                <li>
                                  <form method="POST" action="?/approveUser" use:enhance={confirmThen(`Pause ${member.displayName}? They will need approving again before they can enter.`)}>
                                    <input type="hidden" name="roomUserId" value={member.id} />
                                    <input type="hidden" name="status" value="pending" />
                                    <button type="submit" disabled={member.inviteStatus === 'pending'}>
                                      <i class="fa fa-pause"></i>&nbsp;&nbsp;Pause / Pending
                                    </button>
                                  </form>
                                </li>
                              </ul>
                            </div>
                          {/if}
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>

                {#if form && 'pairCode' in form}
                  <p class="mg-rowform" role="status">
                    App PIN <strong>{form.pairCode}</strong> — expires
                    {new Date(String(form.pairCodeExpiresAt)).toLocaleString()}
                  </p>
                {/if}
                {#if form && 'tokens' in form}
                  {const appTokens = $derived(form.tokens as AppToken[])}
                  <div class="mg-rowform" role="status">
                    {#if appTokens.length === 0}
                      No app tokens registered for that member.
                    {:else}
                      <!-- last six only: a push token is a credential for sending
                           to that device -->
                      {#each appTokens as t (t.lastSix)}
                        <div>{t.platform} …{t.lastSix} — added {new Date(t.addedAt).toLocaleString()}</div>
                      {/each}
                    {/if}
                  </div>
                {/if}

                <!-- the three row actions that need a value. The reference opens a
                     bootbox prompt for each; a prompt cannot be styled, validated
                     or cancelled cleanly, so these are inline forms with the same
                     copy. -->
                {#if noteFor !== null}
                  {const target = $derived(data.users.find((u) => u.id === noteFor))}
                  <form class="mg-rowform form-inline" method="POST" action="?/setUserNote" use:enhance={rowFormDone(() => (noteFor = null))}>
                    <input type="hidden" name="roomUserId" value={noteFor} />
                    <label class="control-label" for="mg-note">Set Note — {target?.displayName}</label>
                    <input class="form-control" id="mg-note" name="note" maxlength="500" value={target?.note ?? ''} />
                    <button class="btn btn-primary" type="submit">Save</button>
                    <button class="btn btn-default" type="button" onclick={() => (noteFor = null)}>Cancel</button>
                  </form>
                {/if}
                {#if renameFor !== null}
                  {const target = $derived(data.users.find((u) => u.id === renameFor))}
                  <form class="mg-rowform form-inline" method="POST" action="?/renameUser" use:enhance={rowFormDone(() => (renameFor = null))}>
                    <input type="hidden" name="roomUserId" value={renameFor} />
                    <label class="control-label" for="mg-rename">Edit Username</label>
                    <input class="form-control" id="mg-rename" name="displayName" required value={target?.displayName ?? ''} />
                    <button class="btn btn-primary" type="submit">Save</button>
                    <button class="btn btn-default" type="button" onclick={() => (renameFor = null)}>Cancel</button>
                  </form>
                {/if}
                {#if passwordFor !== null}
                  {const target = $derived(data.users.find((u) => u.id === passwordFor))}
                  <form class="mg-rowform form-inline" method="POST" action="?/setUserPassword" use:enhance={rowFormDone(() => (passwordFor = null))}>
                    <input type="hidden" name="roomUserId" value={passwordFor} />
                    <label class="control-label" for="mg-pw">Set/Change Password — {target?.displayName}</label>
                    <input
                      class="form-control"
                      id="mg-pw"
                      name="password"
                      type="password"
                      autocomplete="new-password"
                      minlength="10"
                      required
                    />
                    <button class="btn btn-primary" type="submit">Save</button>
                    <button class="btn btn-default" type="button" onclick={() => (passwordFor = null)}>Cancel</button>
                  </form>
                {/if}
              </fieldset>
            {:else if data.tab === 'text-list'}
              <!-- No banner in this pane: the reference's is 1915x845 with the
                   textarea filling it, and anything extra changes the geometry.
                   The reason rides on the control's title instead, which costs no
                   layout. -->
              <div class="form-vertical">
                <form method="POST" action="?/saveTextList" use:enhance={save}>
                  <button
                    class="btn btn-info pull-right"
                    type="submit"
                    title={data.featureReadiness['text-list'] ? 'Save this list' : featureReason('text-list')}
                  >
                    <i class="fa fa-save"></i> Save List
                  </button>
                  <!-- A bare UA textarea, deliberately unstyled, exactly as the reference leaves it.

                       Its only rules there are Bootstrap's font/margin reset, so it keeps the
                       browser's own chrome: 1px rgb(118,118,118), square corners, 2px padding,
                       rgb(51,51,51) text, `resize: both`, `display: inline-block`. We had re-skinned
                       it as a form-control and contradicted all six.

                       The 806px height is `rows="40"`, not a length: 40 x 20px line-height + 4px
                       padding + 2px border = 806. It had been pinned as a hard-coded `height: 806px`,
                       which is that arithmetic frozen at one font size.

                       `display: inline-block` is load-bearing: it makes the textarea shorten for the
                       right-floated Save button and start 34px below the pane top. A block box would
                       start at the top and let the button paint over its corner. -->
                  <textarea
                    id="textListTxt"
                    name="value"
                    rows="40"
                    style="width: 100%; height: 100%"
                    aria-label="Text list"
                    bind:value={textList}
                  ></textarea>
                </form>
              </div>
            {:else if data.tab === 'branding'}
              <fieldset>
                <div class="form-group">
                  <label class="col-sm-2 control-label" for="mg-logo">Logo</label>
                  <div class="col-sm-3" style="background-color: #000; padding: 15px;" id="mg-logo">
                    {#if data.links.logo}
                      <!-- No width/height attributes: `.navLogo` clamps this in CSS, exactly as the
                           reference does. The 203x25 that used to be here was the captured logo's
                           own pixel size, so any logo of a different aspect ratio was stretched to
                           fit it. Vertical CLS is still zero because the rule fixes `height: 25px`. -->
                      <img class="navLogo" src={data.links.logo} alt="Room logo" />
                    {:else}
                      <!--
                        The reference ALWAYS renders an `<img class="navLogo">` here — never a
                        message. A room with no custom logo falls back to the site's own:

                          <div class="col-sm-3 " style="background-color: #000; padding: 15px; ">
                            <img ng-src="/public/images/ptr_logo.png" class="navLogo " src="…">
                          </div>

                        Ours printed "No logo set", which was invented text where the reference
                        shows a picture — and it read as a fault rather than a default, on a black
                        panel built to frame a logo.

                        The path is the reference's own, byte for byte, so the asset drops
                        straight in at `static/public/images/ptr_logo.png`.

                        The logo is white on transparent — which is why the surrounding panel is
                        `background-color: #000`. That black box is not decoration; it exists so a
                        white wordmark is visible at all. Worth knowing before anyone "simplifies"
                        the panel away.
                      -->
                      <img class="navLogo" src="/public/images/ptr_logo.png" alt="" />
                    {/if}
                  </div>
                  <div class="col-sm-4">
                    <!-- both forms inline: the reference's column is 34 tall
                         with the two buttons side by side, 3.899 apart -->
                    <form
                      class="mg-inline-form"
                      method="POST"
                      action="?/uploadLogo"
                      enctype="multipart/form-data"
                      {@attach attachLogoForm}
                      use:enhance={save}
                    >
                      <input
                        class="mg-file"
                        type="file"
                        name="logo"
                        accept="image/png,image/jpeg,image/gif,image/webp"
                        {@attach attachLogoInput}
                        onchange={() => logoForm?.requestSubmit()}
                        hidden
                      />
                      <button class="btn btn-assertive" type="button" onclick={() => logoInput?.click()}>
                        Upload/Change
                      </button>
                    </form>
                    <form
                      class="mg-inline-form"
                      method="POST"
                      action="?/resetLogo"
                      use:enhance={confirmThen('Reset this room\u2019s logo to the default?')}
                    >
                      <button class="btn btn-assertive" type="submit">Reset</button>
                    </form>
                  </div>
                  <!-- the <br> and the <hr> are SIBLINGS of the columns, not
                       inside them: the reference's rule runs 1117.086 wide from
                       834.914, which is where the col-sm-3 float ends, and the
                       <br> above it is the 20px line that puts it at 401 -->
                  <br />
                  <hr />
                  <div class="col-sm-10">
                    <h3 style="text-align: center; margin-bottom: 20px;">
                      Login Landing Page Editor
                      <form method="POST" action="?/saveField" use:enhance={save} style="display:contents">
                        <input type="hidden" name="name" value="description" />
                        <input type="hidden" name="value" value={landingHtml} />
                        <button class="btn btn-info pull-right" type="submit">
                          <i class="fa fa-save"></i> Save Editor Changes
                        </button>
                      </form>
                    </h3>
                    {#key data.room.id}
                      <RichTextEditor
                        bind:value={landingHtml}
                        initialContent={data.landingHtml}
                        name="description"
                      />
                    {/key}
                  </div>
                </div>
              </fieldset>
            {:else if data.tab === 'sso'}
              <!-- likewise: the reference's SSO pane is exactly 34 tall, one row,
                   so the reason goes on the field rather than above it -->
              <div class="form-horizontal">
                {#each bySection['sso-setup'] ?? [] as def (def.name)}
                  <div class="form-group m0">
                    <label class="col-sm-4 control-label" for={`mg-${def.name}`}>{def.label ?? def.name}</label>
                    <div class="col-sm-8">
                      <p
                        class="form-control-static"
                        id={`mg-${def.name}`}
                        title={data.featureReadiness.sso ? '' : featureReason('sso')}
                      >
                        <Editable {def} value={settingValue(def.name)} markUnwired />
                      </p>
                    </div>
                  </div>
                {/each}
              </div>
            {:else if data.tab === 'stats'}
              <fieldset>
                <div class="form-group">
                  <div class="col-sm-4 pull-left">
                    <div>
                      <p class="form-control-static">
                        <label class="col-sm-4 control-label" for="statsFrom">Start Date:</label>
                        <input class="mg-date" type="date" id="statsFrom" bind:value={statsFrom} />
                        <br />
                        <span class="muted">Choose a start date</span>
                      </p>
                      <p class="form-control-static">
                        <label class="col-sm-4 control-label" for="statsTo">End Date:</label>
                        <input class="mg-date" type="date" id="statsTo" bind:value={statsTo} />
                        <br />
                        <span class="muted">Choose an end date</span>
                      </p>
                    </div>
                    <button class="btn btn-md btn-info" type="button" onclick={() => (statsLoaded = true)}>
                      <i class="fa fa-user-plus" aria-hidden="true"></i> Load Stats
                    </button>
                    <!-- Export sits between Load Stats and the monthly buttons: the reference's
                         order is Load Stats, Export, Monthly report (nodes 213/215/217 of
                         manage:tab:User Stats). Ours had Export last. -->
                    <button
                      class="btn btn-md btn-info"
                      type="button"
                      onclick={() =>
                        exportCsv(
                          [
                            ['#', 'Nick', 'Email', 'Last login'],
                            ...visibleStats.map((r, i) => [
                              String(i + 1),
                              r.displayName,
                              r.email,
                              r.lastLoginAt ? new Date(r.lastLoginAt).toISOString() : ''
                            ])
                          ],
                          `room-${data.room.shortCode}-stats.csv`
                        )}
                    >
                      <i class="fa fa-floppy-o" aria-hidden="true"></i> Export
                    </button>
                    <!-- `loadMontlyStats(...)` / `downloadMontlyStats(...)` — the
                         reference shows one of the first two depending on whether a
                         report is loaded, and the download only once there is one. -->
                    {#if monthly.length === 0}
                      <button class="btn btn-md btn-info" type="button" onclick={loadMonthly}>
                        <i class="fa fa-users" aria-hidden="true"></i> Monthly report for date range
                      </button>
                    {:else}
                      <button class="btn btn-md btn-info" type="button" onclick={() => (monthly = [])}>
                        <i class="fa fa-trash" aria-hidden="true"></i> Clear monthly report
                      </button>
                      <button
                        class="btn btn-md btn-info"
                        type="button"
                        onclick={() =>
                          exportCsv(
                            [['Month', 'Logins'], ...monthly.map((m) => [m.month, String(m.logins)])],
                            `room-${data.room.shortCode}-monthly.csv`
                          )}
                      >
                        <i class="fa fa-download" aria-hidden="true"></i> Download monthly report
                      </button>
                    {/if}
                  </div>

                  <div>
                    <label class="col-sm-2 control-label" for="uSearchStat">Search Users</label>
                    <div class="col-sm-4">
                      <!-- `required` is on the reference's field (it renders `ng-invalid-required`
                           while empty), so the box carries the same invalid state before a term
                           is typed rather than looking ready when it is not. -->
                      <input class="form-control" type="search" id="uSearchStat" required bind:value={statsSearch} />
                      <br />
                      <label>
                        <input type="checkbox" bind:checked={statsOnlineOnly} />
                        &nbsp;Show Online Users Only
                      </label>
                      <label>
                        <input type="checkbox" bind:checked={statsTrialsOnly} />
                        &nbsp;Show <span class="badge badge-danger">Free Trials</span> Only?
                      </label>
                      <label>
                        <input type="checkbox" bind:checked={statsMobileOnly} />
                        &nbsp;Show Mobile Only?
                      </label>
                      <label>
                        <input type="checkbox" bind:checked={statsDedupe} />
                        &nbsp;Remove duplicates?
                      </label>
                      <!--
                        The two filters that cannot filter say so, rather than sitting there
                        pretending. Same mechanism the Users tab uses for Mobile / Marketplace:
                        the control stays where the reference puts it, and the reason is on screen
                        instead of the operator wondering why the table did not change.
                      -->
                      {#if unsupportedStatsFilters.length > 0}
                        <p class="ta-notice">
                          {unsupportedStatsFilters.join(' and ')}
                          {unsupportedStatsFilters.length === 1 ? 'is' : 'are'} not applied — the room
                          does not record what they filter on.
                        </p>
                      {/if}
                    </div>
                  </div>
                </div>

                {#if monthly.length > 0}
                  <h4>
                    Monthly report: <strong></strong> - Total Logins:
                    <strong>{monthly.reduce((n, m) => n + m.logins, 0)}</strong>
                  </h4>
                  <table class="table table-striped">
                    <tbody>
                      {#each monthly as row (row.month)}
                        <tr><td>{row.month}</td><td>{row.logins}</td></tr>
                      {/each}
                    </tbody>
                  </table>
                {/if}
              </fieldset>
              <!--
                The <h3> and everything under it are SIBLINGS of the fieldset, not inside it.

                That is not cosmetic. `styles.css` gives every fieldset a 1px dashed
                rgb(238,238,238) bottom rule, cancelled by `fieldset:last-child`. In the reference's
                User Stats pane the fieldset is followed by this heading, so it is NOT the last
                child and the separator PAINTS — measured on node 199 of that tab capture, whose
                rule list does not include the `:last-child` reset.

                Ours wrapped the heading inside the fieldset, which made it the last child, fired
                the reset, and silently dropped a rule line the reference draws. This was missed the
                first time because only two of the three captured fieldsets were read, and both of
                those happened to be last children.
              -->
              {#if !statsLoaded}
                <h3>No results to show. Select a date above...</h3>
                {:else if visibleStats.length === 0}
                  <h3>No results to show. Select a date above...</h3>
                  <p class="muted">
                    Nothing was recorded in that range. Logins come from the room's own
                    sessions — no rows are invented to fill the table.
                  </p>
                {:else}
                  <table class="table table-striped">
                    <thead>
                      <tr>
                        <th>#</th><th>Nick</th><th>Email / IP</th>
                        <th>Time Stamps <button class="acc-link" type="button" onclick={() => (statsReversed = !statsReversed)}>Reverse</button></th>
                        <th>Duration (Hours)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {#each visibleStats as row, i (row.id)}
                        <tr>
                          <td>{i + 1}</td>
                          <td>{row.displayName}</td>
                          <td>{row.email}</td>
                          <td>{row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : '—'}</td>
                          <td>—</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                {/if}
            {:else if data.tab === 'marketplace'}
              <fieldset>
                {#if !data.featureReadiness.marketplace}
                  <p class="mg-feature-off">{featureReason('marketplace')}</p>
                {/if}
                <div class="form-vertical">
                  <!-- the marketplace is Stripe-backed; these are the room's own
                       settings behind it, edited here rather than hunted for
                       among the other 260 -->
                  {#each ['stripeEmail', 'subscriptionPlans'] as name (name)}
                    {const def = $derived(data.schema.find((d) => d.name === name))}
                    {#if def}
                      <p class="form-control-static">
                        <label class="col-sm-2 control-label" for={`mg-${def.name}`}>
                          {def.label ?? def.name}
                        </label>
                        <span id={`mg-${def.name}`}>
                          <Editable {def} value={settingValue(def.name)} markUnwired />
                        </span>
                        {#if def.help}
                          <br />
                          <span class="muted">{def.help}</span>
                        {/if}
                      </p>
                    {/if}
                  {/each}
                </div>
              </fieldset>
            {:else if data.tab === 'settings'}
              <div class="form-vertical">
                <div class="form-group m0">
                  <p class="form-control-static">
                    <button class="btn btn-md btn-info" type="button" onclick={exportSettings}>
                      <i class="fa fa-floppy-o" aria-hidden="true"></i> Export Settings
                    </button>
                    <button
                      class="btn btn-md btn-info"
                      type="button"
                      onclick={() => (loadFromRoom = !loadFromRoom)}
                    >
                      <i class="fa fa-plus" aria-hidden="true"></i> Load Settings From Room
                    </button>
                  </p>

                  {#if loadFromRoom}
                    <!-- `loadSettingsFromRoom()` — copy another room's settings onto
                         this one. Destructive, so it confirms and names the source. -->
                    <form
                      class="mg-rowform form-inline"
                      method="POST"
                      action="?/loadSettingsFromRoom"
                      use:enhance={rowFormDone(() => (loadFromRoom = false))}
                    >
                      <label class="control-label" for="mg-fromroom">Copy settings from</label>
                      <select class="form-control" id="mg-fromroom" name="fromRoomId" required>
                        <option value="">Choose a room…</option>
                        {#each data.otherRooms as room (room.id)}
                          <option value={room.id}>{room.shortCode} — {room.name}</option>
                        {/each}
                      </select>
                      <button class="btn btn-primary" type="submit">Load</button>
                      <button class="btn btn-default" type="button" onclick={() => (loadFromRoom = false)}>
                        Cancel
                      </button>
                    </form>
                  {/if}

                  <!-- a plain <span>, not an editable: the reference builds this
                       from the room id and it is not a stored setting -->
                  <p class="form-control-static">
                    <label class="col-sm-2 control-label" for="mg-shortcode">Wordpress shortcode:</label>
                    <span id="mg-shortcode">{data.wordpressShortcode}</span>
                  </p>

                  {#each settingsBeforeApiSecret as def (def.name)}
                    <p class="form-control-static">
                      <label class="col-sm-2 control-label" for={`mg-${def.name}`}>{def.label ?? def.name}</label>
                      <span id={`mg-${def.name}`}>
                        <Editable {def} value={settingValue(def.name)} markUnwired />
                      </span>
                      {#if def.help}
                        <br />
                        <!-- the reference wraps helper copy in a <label> that
                             labels no control; a span with the same computed box
                             says the same thing and is valid -->
                        <span class="muted">{def.help}</span>
                      {/if}
                    </p>
                  {/each}

                  {#if apiSecretDef}
                    <!-- a div, not the reference's <p>: it holds a <form>, which
                         cannot nest inside a paragraph. `.form-control-static`
                         sets margin-bottom: 0 either way, so the box is the same. -->
                    <div class="form-control-static">
                      <label class="col-sm-2 control-label" for="mg-apisecret">API secret</label>
                      <span id="mg-apisecret">
                        <Editable def={apiSecretDef} value={settingValue('apiSecret')} markUnwired />
                      </span>
                      &nbsp;
                      <form
                        method="POST"
                        action="?/generateApiSecret"
                        style="display:inline"
                        use:enhance={confirmThen(
                          'Generate a new API secret for this room? The current one stops working immediately.'
                        )}
                      >
                        <button class="btn btn-sm btn-warning" type="submit">
                          <i class="fa fa-random"></i> New Secret
                        </button>
                      </form>
                    </div>
                  {/if}

                  <p class="form-control-static">
                    <a class="btn btn-default" target="_blank" rel="noopener noreferrer" href={resolve('/account/api-docs')}>
                      API POST Routes Docs
                    </a>
                  </p>

                  <!-- the settings the reference lists BELOW the docs link, starting at slackPostURL -->
                  {#each settingsAfterApiSecret as def (def.name)}
                    <p class="form-control-static">
                      <label class="col-sm-2 control-label" for={`mg-${def.name}`}>{def.label ?? def.name}</label>
                      <span id={`mg-${def.name}`}>
                        <Editable {def} value={settingValue(def.name)} markUnwired />
                      </span>
                      {#if def.help}
                        <br />
                        <span class="muted">{def.help}</span>
                      {/if}
                    </p>
                  {/each}

                  <hr />
                  <h3>
                    DON'T
                    <button
                      type="button"
                      class="editable editable-click"
                      onclick={() => (dontTouchShown = !dontTouchShown)}>TOUCH</button
                    >
                    These below unless you know what you are doing...
                  </h3>
                  {#if !dontTouchShown}
                    <p>Settings...</p>
                  {:else}
                    <!--
                      A SECOND `.form-vertical`, nested inside the one that already wraps the tab,
                      with a `.form-group.m0` inside it. Both are the reference's; the inner
                      form-group is what this block's 62 children hang off, and it was missing.
                    -->
                    <div class="form-vertical">
                      <div class="form-group m0">
                        {@render dtNote(
                          'useV3',
                          "(DON'T TURN THIS ON, If PTR did not clear you for v3!! it will not work....)"
                        )}
                        {@render dtNote(
                          'useV5',
                          "(DON'T TURN THIS ON, If PTR did not clear you for v5!! it will not work....)"
                        )}

                        <!-- row 2 — TWO fields in ONE <p>, split by a double `br`, and the single
                             helper belongs to the BACKUP: `clusterID` has none. -->
                        <p class="form-control-static">
                          {@render dtField('clusterID')}
                          <br /><br />
                          {@render dtField('backupClusterID')}
                          <br />
                          {@render dtHelp('backupClusterID')}
                        </p>
                        <!-- rows 3 and 4: a bare <div> holding one button each -->
                        <div>
                          <button class="btn btn-primary btn-link" type="submit" form="mg-swap-clusterids">
                            Swap ClusterIDs (Backup &lt;--&gt; Main)
                          </button>
                        </div>
                        <div>
                          <button class="btn btn-danger btn-sm" type="submit" form="mg-apply-clusterids">
                            Apply clusterID/backupID to all sessions
                          </button>
                        </div>
                        <!-- row 5: an empty <p>. Not decoration — it carries the 10px bottom
                             margin every <p> on this page has, and nothing else here does. -->
                        <p></p>
                        <!-- row 6 — the other double row: field, helper, double break, field, helper -->
                        <p class="form-control-static">
                          {@render dtField('superClusterID')}
                          <br />
                          {@render dtHelp('superClusterID')}
                          <br /><br />
                          {@render dtField('superClusterExpectedServerCount')}
                          <br />
                          {@render dtHelp('superClusterExpectedServerCount')}
                        </p>
                        {@render dtRow('useFFmpegRecording')}
                        <br />
                        {@render dtRow('useLessBusyVsRoundRobin')}
                        <hr />
                        {@render dtRow('useMediaMTX')}
                        {@render dtRow('mediaMTXClusterID')}
                        {@render dtRow('backupMediaMTXClustterID')}
                        {@render dtRow('media_max_bitrate')}
                        {@render dtRow('media_fir_rate')}
                        {@render dtRow('hasYTStreaming')}
                        <br />
                        <!-- row 18 — Repeater List, its helper doubling as the disclosure, and the
                             apply-to-account button, all inside the one <p>. -->
                        <p class="form-control-static">
                          {@render dtField('media_relays')}
                          <br />
                          <!-- `ng-click="showAdServer=true;"` sits on the HELPER TEXT, not on a
                               button: same element and same class here, but operable from the
                               keyboard, which the reference's label is not. -->
                          <span
                            class="muted"
                            role="button"
                            tabindex="0"
                            onclick={() => (showAdServer = true)}
                            onkeydown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                showAdServer = true;
                              }
                            }}>{dontTouch('media_relays').help}</span
                          >
                          <br />
                          {#if showAdServer}
                            <!-- the label is a constant, so the double space between "Apply"
                                 and "server" survives `prettier --write` — see APPLY_REPEATERS_LABEL -->
                            <button class="btn btn-warning" type="submit" form="mg-apply-repeaters"
                              >{APPLY_REPEATERS_LABEL}</button
                            >
                          {/if}
                        </p>
                        <!-- row 19 — the live repeater console. Its two inputs carry no class in
                             the reference and are left unstyled here for the same reason. -->
                        {#if showAdServer}
                          <div>
                            <hr />
                            <br /><input
                              type="text"
                              id="addServerTxt"
                              name="server"
                              form="mg-add-server"
                            /><button class="btn btn-inverse" type="submit" form="mg-add-server"
                              >Add Server</button
                            >
                            <br /><input
                              type="text"
                              id="removeServerTxt"
                              name="server"
                              form="mg-remove-server"
                            /><button class="btn btn-inverse" type="submit" form="mg-remove-server"
                              >Remove Server</button
                            >
                            <br />
                          </div>
                        {/if}
                        <!-- row 20 -->
                        <p></p>
                        <hr />
                        {@render dtRow('isLocked')}
                        {@render dtRow('chatServerURL')}
                        <hr />
                        {@render dtRow('force_jpeg_screenshare')}
                        {@render dtRow('force_mp3_audio')}
                        {@render dtRow('node_media_relays')}
                        {@render dtRow('node_ws_media_relays')}
                        <hr />
                        <!-- row 30 — see ALT_CODE_INTRO for why the copy is a constant -->
                        <p>{ALT_CODE_INTRO}</p>
                        {@render dtRow('altCodeVendorJS')}
                        {@render dtRow('altCodeAppJS')}
                        {@render dtRow('customJanus')}
                        {@render dtRow('alt_roomjs')}
                        {@render dtRow('modAlertFilterList')}
                        {@render dtRow('customCSS')}
                        {@render dtRow('darkThemeStyle')}
                        {@render dtRow('hideLogo')}
                        {@render dtRow('hidePoweredBy')}
                        <hr />
                        <!-- row 41 -->
                        <p>{LINKED_ROOMS_INTRO}</p>
                        {@render dtRow('linkedRoomAlerts')}
                        {@render dtRow('linkedRoomSwingAlerts')}
                        {@render dtRow('linkedRoomSwingAlertsOther')}
                        {@render dtRow('linkedRoomDayTradeAlerts')}
                        {@render dtRow('linkedRoomDayTradeAlertsOther')}
                        <!-- row 47 — the ONE field row whose <p> carries no `form-control-static`,
                             so it alone has no 34px min-height and takes a 10px bottom margin
                             instead. Transcribed, not tidied. -->
                        <p>
                          {@render dtField('linkedRoomRecordings')}
                          <br />
                          {@render dtHelp('linkedRoomRecordings')}
                        </p>
                        {@render dtRow('linkedStreamsAPIKey')}
                        <hr />
                        {@render dtNote('ptrMobileAppEnabled', "(DON'T USE this for ST)")}
                        {@render dtNote('freeTrialsGetApp', 'Also enable the app for free trials?')}
                        {@render dtNote('customMobileAppEnabled', "(DON'T USE unless you have a custom app)")}
                        {@render dtRow('customMobileAppV3Name')}
                        {@render dtRow('customMobileAppIOSUrl')}
                        {@render dtRow('customMobileAppAndroidUrl')}
                        {@render dtRow('customMobileAppLaunchWord')}
                        {@render dtRow('hideMobileCredentials')}
                        {@render dtNote(
                          'ptrMobileAppCaseByCaseEnabled',
                          'Note above needs to ALSO be on (enable ptr app)'
                        )}
                        {@render dtRow('nqNewsFeedURL')}
                        {@render dtRow('generateRandomUDPPort')}
                        {@render dtRow('streamingThreads')}

                        <!--
                          The five actions this block's buttons post to.

                          The reference calls each from an `ng-click`, with no form anywhere. Ours
                          has to POST, and three of the five buttons sit INSIDE a `<p>` or beside a
                          bare `<input>` — and an HTML parser closes an open paragraph the moment it
                          meets a form start tag, which would break those rows apart. So each button
                          (and each console input) is associated with its form by the `form`
                          attribute, exactly as the Unique Link's Generate button already is, and
                          the forms themselves are empty elements gathered here.

                          The two that write to EVERY room on the account confirm first, and say
                          how many rooms that is.
                        -->
                        <form
                          id="mg-swap-clusterids"
                          method="POST"
                          action="?/swapClusterIds"
                          use:enhance={save}
                        ></form>
                        <form
                          id="mg-apply-clusterids"
                          method="POST"
                          action="?/applyToAllSessions"
                          use:enhance={confirmThen(
                            `Copy this room's ClusterID and Backup ClusterID onto EVERY room on this account — all ${data.otherRooms.length + 1} of them? Both fields are overwritten wherever they are already set.`
                          )}
                        ></form>
                        <form
                          id="mg-apply-repeaters"
                          method="POST"
                          action="?/applyRepeaterToAccount"
                          use:enhance={confirmThen(
                            `Copy this room's Repeater List onto EVERY room on this account — all ${data.otherRooms.length + 1} of them? Their own repeater lists are overwritten.`
                          )}
                        ></form>
                        <form
                          id="mg-add-server"
                          method="POST"
                          action="?/addLiveServer"
                          use:enhance={save}
                        ></form>
                        <form
                          id="mg-remove-server"
                          method="POST"
                          action="?/removeLiveServer"
                          use:enhance={save}
                        ></form>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <div class="panel-footer text-center"></div>
  </div>
</div>

{#if permissionsTarget}
  <PermissionsModal
    roomUserId={permissionsTarget.id}
    userName={permissionsTarget.displayName}
    role={permissionsTarget.role}
    permissions={permissionsTarget.permissions}
    permissionKeys={data.permissionKeys}
    onclose={() => (permissionsFor = null)}
  />
{/if}
