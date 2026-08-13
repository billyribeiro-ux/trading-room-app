<script lang="ts">
  import { enhance } from '$app/forms';
  import { humanizeDuration } from '$lib/humanize-duration';
  import { asset, resolve } from '$app/paths';
  import { bootbox } from '$lib/bootbox.svelte';
  import ToastHost from '$lib/components/ToastHost.svelte';
  import { toast } from '$lib/toast.svelte';
  import Editable from '$lib/components/Editable.svelte';
  import { formatLastLogin, formatShortDate } from '$lib/last-login-format';
  import { formatMoney } from '$lib/money';
  import { stripeStatusClass } from '$lib/stripe-status';
  import { focusDateField } from '$lib/focus-date-field';
  import { editableText, isBlank, isEditableEmpty } from '$lib/editable-display';
  import PermissionsModal from '$lib/components/PermissionsModal.svelte';
  import RichTextEditor from '$lib/components/RichTextEditor.svelte';
  import {
    AUTH_MODES,
    isRegistrationMode,
    isSsoMode,
    showsRoomLinks,
    usesRoomPassword
  } from '$lib/auth-modes';
  import { isRoomTrial } from '$lib/room-member-role';
  import { settingHelp, type SettingHelp } from '$lib/room-settings-help';
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

  const ajaxLoader = asset('ajax_loader.gif');
  const avatarPlaceholder = asset('avatar-placeholder.svg');

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

  /*
    `loadMontlyStats(...)` — the reference's spelling, "Montly", throughout its own scope.

    Counted per ARRIVAL now rather than per member's last login, which is what "Total Logins"
    actually means and what the reference's own `statXrefsMontly` rolls up: its source is `statXrefs`,
    one row per entry. Counting last-logins gave each member at most one, so a room with 40 members
    who each visited daily reported 40 logins for the month instead of ~1,200.
  */
  function loadMonthly() {
    const byMonth: Record<string, number> = {};
    for (const row of visibleStats) {
      const key = new Date(row.joinedAt).toISOString().slice(0, 7);
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
  /* Which of the two date fields has been clicked open. The reference edits both through
     angular-xeditable's `editable-date` directive (file2:905, 910), so the resting state is an
     anchor and the input only exists while one is being edited. */
  let editingStatsFrom = $state(false);
  let editingStatsTo = $state(false);
  let statsSearch = $state('');
  let statsOnlineOnly = $state(false);
  let statsTrialsOnly = $state(false);
  let statsMobileOnly = $state(false);
  let statsDedupe = $state(false);
  let statsReversed = $state(false);
  /*
    The committed date range. `statsFrom`/`statsTo` are what the date fields hold as they are edited;
    these are what the table filters on, and `applyStatsRange` is what moves one to the other.

    Separated because the reference's dates do NOT filter as you type — they are arguments to
    `loadStats(...)`, applied when the button is pressed. A range that filtered per keystroke would
    also re-run the whole derivation on every character of a half-typed year.
  */
  let statsRangeFrom = $state('');
  let statsRangeTo = $state('');
  function applyStatsRange() {
    statsRangeFrom = statsFrom;
    statsRangeTo = statsTo;
  }
  let logoInput: HTMLInputElement | null = null;
  // Writable derived drafts follow a different room after client navigation,
  // while user input owns each draft until its server seed actually changes.
  let textList = $derived(data.room.textList ?? '');
  let landingHtml: string = $derived(data.landingHtml);
  let search = $state('');

  const permissionsTarget = $derived(data.users.find((u) => u.id === permissionsFor) ?? null);


  /*
    The User Stats rows — ONE PER ARRIVAL, which is what the reference's `statXrefs` is.

    This derived from `data.stats`, one row per PERSON, until 2026-08-13. That could never render the
    reference's table: `In`/`Out`, IP, browser and a duration are properties of a VISIT, and a member
    row has none of them. `data.visits` is `room_sessions`, loaded on this tab only and capped.

    ## Which filters remove rows and which merely hide them — this is not a detail

    `page.manageSession.html:739` is
        ng-repeat="userStat in statXrefs | filter: uSearchStat "
        ng-hide="filterOnline && !userStat.isOnline"

    The search REMOVES rows. "Show Online Users Only" does NOT — it is a per-row `ng-hide`, so the
    rows are still in the table, still counted by `table-striped`'s `nth-of-type`, and the banding
    goes visibly irregular when it is on. That is the reference's behaviour, it is recorded as T5-12,
    and it is reproduced here rather than quietly improved: `hiddenByOnline` marks them and the
    markup gives them `hidden`, which `.mg-root [hidden]` renders `display: none !important` — the
    same thing Angular's `.ng-hide` does.

    The other three checkboxes are arguments to `loadStats(...)` in the reference, so they filter
    SERVER-side on reload. Ours applies them here, live, which spares a round trip and produces the
    same set. Stated rather than silent, because it is a deliberate difference.
  */
  const visibleStats = $derived.by(() => {
    let rows = data.visits.filter((r) => {
      const at = new Date(r.joinedAt);
      if (statsRangeFrom && at < new Date(statsRangeFrom)) return false;
      // an end date means the whole of that day, not midnight at its start
      if (statsRangeTo && at > new Date(new Date(statsRangeTo).getTime() + 86_400_000 - 1)) return false;
      return true;
    });
    const q = statsSearch.trim().toLowerCase();
    if (q) rows = rows.filter((r) => r.displayName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
    if (statsTrialsOnly) rows = rows.filter((r) => r.isFreeTrial === true);
    if (statsMobileOnly) rows = rows.filter((r) => r.isMobile);
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

  /** `ng-hide="filterOnline && !userStat.isOnline"`. A visit is online while it has no `leftAt`. */
  const hiddenByOnline = (leftAt: unknown) => statsOnlineOnly && leftAt !== null;

  /** `{{userStat.duration / 3600 | number: 2}}` — seconds to hours, two decimals. */
  function visitDurationHours(joinedAt: string | Date, leftAt: string | Date | null): string {
    if (leftAt === null) return '';
    const seconds = (new Date(leftAt).getTime() - new Date(joinedAt).getTime()) / 1000;
    return (seconds / 3600).toFixed(2);
  }

  /**
   * What a stats date anchor prints.
   *
   * MONTH FIRST, with dashes. The capture's two anchors read «08-07-2026» and «08-08-2026»
   * (file2:905, 910), and the app's other rendered date — the Users table's last-login cell,
   * « 08/07/2026 @ 5:05PM » (file2:446), which this suite's fixture reads as 7 August 2026 —
   * settles the ordering as month/day/year rather than day/month/year.
   *
   * The `yyyy-mm-dd` a date input stores is reordered by splitting the string, never by building a
   * Date: `new Date('2026-08-07')` is UTC midnight and prints as the 6th anywhere west of
   * Greenwich.
   *
   * INHERITED, NOT CAPTURED: both anchors are populated in the capture — they are the only two
   * `editable-date` nodes in it — so what one shows with NO value is not evidence this repo holds.
   * It goes through the same `editableText` as every other editable, which is what the capture's
   * empty ones do print (`editable-display.ts` tallies 47 of them; file2:889 and 991 are two).
   */
  function statsDateText(iso: string) {
    if (isBlank(iso)) return editableText(iso, false);
    const [year, month, day] = iso.split('-');
    return `${month}-${day}-${year}`;
  }


  /*
    ALL FOUR Stats checkboxes now filter. This block used to declare two of them unsupported, and
    BOTH halves of that were wrong — each because it was reasoned from a DOM capture instead of the
    source.

    - `filterOnline` was recorded as "passed to NOTHING in the reference … it appears in neither
      `loadStats(...)` nor the repeat's only filter expression". Both of those are true and the
      conclusion is still false: it appears in the repeat's `ng-hide`
      (`page.manageSession.html:739`, `ng-hide="filterOnline && !userStat.isOnline"`). An attribute
      the capture rendered as `ng-hide=""` on rows that happened not to be hidden.
    - `showMobileStat` was recorded as blocked because "mobile" was ambiguous across three
      `room_users` columns. That ambiguity is real and belongs to the USERS tab. These are
      `room_sessions` rows, and `is_mobile` is one explicit column on them — no ambiguity to
      resolve.

    `unsupportedStatsFilters` is gone with them. It was the honest thing to render while the
    controls could not work; leaving it now would print a warning about filters that do.
  */

  const bySection = $derived.by(() => {
    const grouped: Record<string, RoomSettingDef[]> = {};
    for (const def of data.schema) (grouped[def.section] ??= []).push(def);
    return grouped;
  });

  /*
    SEVEN settings the reference only shows for certain auth modes.

    Each of the seven carries `ng-hide` in the capture, which is AngularJS for "in the DOM,
    display:none" — nobody sees them in a room whose auth mode is 'open', which is the room the
    capture is of. Rendered unconditionally, they added seven paragraphs to a pane the capture
    shows none of them in — and, this being a positional comparison, pushed everything after them
    out of step.

    The conditions are the capture's own `ng-show` expressions, transcribed one for one:

      ssoJWTSecret / allowPWLoginWithSSO / tokenExpiresIn   file2:989, 993, 1005
        ng-show="sess.authMode=='jwt'"
      webinarPW / webinarPW2 / webinarPW3                   file2:1012, 1017, 1022
        ng-show="sess.authMode=='webinarRoom' || sess.allowPWLoginWithSSO"
      webinarPWFreeTrial                                    file2:1027
        ng-show="sess.authMode=='webinarRoom' || sess.authMode=='unamePW' || sess.allowPWLoginWithSSO"

    `isSsoMode` and `usesRoomPassword` are the same two predicates `$lib/auth-modes` already
    derived from those expressions for the link block — the JWT gate goes through `isSsoMode`
    because their codebase spells the one mode both 'jwt' and 'sso' (see the note there).

    HONEST GAP: only the CONDITIONS are evidence. The generated schema records no visibility field
    for a setting, so this map is our own plumbing, written by hand and keyed by name.
  */
  const authModeGated: Record<string, () => boolean> = {
    ssoJWTSecret: () => isSsoMode(settingValue('authMode')),
    allowPWLoginWithSSO: () => isSsoMode(settingValue('authMode')),
    tokenExpiresIn: () => isSsoMode(settingValue('authMode')),
    webinarPW: () => usesRoomPassword(settingValue('authMode'), settingValue('allowPWLoginWithSSO')),
    webinarPW2: () => usesRoomPassword(settingValue('authMode'), settingValue('allowPWLoginWithSSO')),
    webinarPW3: () => usesRoomPassword(settingValue('authMode'), settingValue('allowPWLoginWithSSO')),
    webinarPWFreeTrial: () =>
      usesRoomPassword(settingValue('authMode'), settingValue('allowPWLoginWithSSO')) ||
      settingValue('authMode') === 'unamePW'
  };
  /*
    The two rows the reference reveals only when the profanity filter is on.

    file2:2109 and 2114 are `<p class="form-control-static ng-hide" ng-show="sess.hasProfanityFilter">`
    — the Ignore List and the Extra Bad list. `ng-hide` is on both in the capture, because the
    reference room has the filter off, so the reference contributes NOTHING for either row while
    ours rendered two complete rows an operator of that room could never have seen.

    HONEST GAP: no visibility field is recorded in the generated schema, so — like `authModeGated`
    above — this is our own plumbing, hand-written and keyed by name. Only the CONDITION is evidence.

    This note used to claim these were "the only two `ng-show` rows anywhere in the settings list".
    That was written from the capture and is wrong: the template has FOURTEEN gated wrappers over
    nine distinct expressions, ten of which wrap a named setting. Seven of those ten are the
    authMode rows in the map above, two are these, and the tenth is `webinarDate`, gated by
    `hidden={!isWebinar}` in the header block. `settings-row-gates.test.ts` extracts all ten from the
    template and fails if a new one appears — which is what the old wording would have hidden.
  */
  const profanityGated: Record<string, () => boolean> = {
    ingnoreBadWordsList: () => !!settingValue('hasProfanityFilter'),
    additionalBadWordsList: () => !!settingValue('hasProfanityFilter')
  };
  const settingIsVisible = (def: RoomSettingDef) =>
    (authModeGated[def.name]?.() ?? true) && (profanityGated[def.name]?.() ?? true);

  /** the Settings tab splits at the reference's "DON'T TOUCH" heading */
  const settingsMain = $derived(
    (bySection.settings ?? []).filter((d) => d.group !== 'dont-touch' && settingIsVisible(d))
  );

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

  /*
    The two ROOM settings that gate the row's four conditional icons
    (page.manageSession.html:351-354). Derived once per settings change rather than read inside the
    member loop: `settingValue` is an index into an object, so doing it per row is a lookup per row
    per render for a value that is the same for every row in the table.

    These stay `wired: false` in `room-settings-schema.ts`, and that is not an oversight. `wired`
    there means "something IN THE ROOM reads it" — the union of the room-login page, the room app's
    `internal/room-config/[code]`, and the SSO door. This is the controller's own admin table, which
    renders and stores all 269 settings by definition. Flipping either one would put it in
    `EXPECTED_WIRED_SETTINGS` and assert to the next reader that the room honours it, which it does
    not yet.
  */
  const fileAccessCaseByCase = $derived(Boolean(settingValue('fileAccessCaseByCase')));
  const mobileAppCaseByCase = $derived(Boolean(settingValue('ptrMobileAppCaseByCaseEnabled')));

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

  /**
   * Every form on this page posts through here, so this is the one place a success can be
   * confirmed.
   *
   * `result.type` is what distinguishes them: `success` for an action that returned data,
   * `failure` for a `fail(...)`. The failure branch is deliberately silent HERE — the red
   * `form.message` at the top of the panel already carries the server's own wording, and a toast
   * repeating it would say the same thing twice in two places.
   *
   * Only the confirmation is new. Before this, a save that WORKED looked exactly like a save that
   * did nothing, which is the complaint that started all of this.
   */
  const save: SubmitFunction = () => async ({ result, update }) => {
    await update({ reset: false });
    if (result.type === 'success') toast.success('Changes have been saved.');
  };

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

  /*
    ── The four downloads, read out of the reference's own `app.min.js` ─────────────────────────
    Captured 2026-08-09 by `scripts/collect-export-controls.js`; the bundle is
    `dumps/export-controls-1786287657298.json`, symbol regions `exportListToCSV`,
    `exportStatsToCSV`, `downloadMontlyStats` and `exportSettingsToJSON`.

    Before that capture, all three CSVs were ours: one quoting writer, `room-<shortCode>-<thing>.csv`
    filenames, LF endings, and column sets nobody had checked. Every one of those was wrong, and none
    of it was visible in the DOM — the handlers live in a bundle that is not on disk.

    What the reference actually does, and what is reproduced below:

      - filenames  `Participant_List_<uuid>.csv`, `Participant_Stats_<uuid>_<date>.csv`,
                   `Monthly_report_<uuid>_<range>.csv`, `Settings_<uuid>.json`. Our `publicId` is
                   the reference's `sess.uuid` — the same identifier its room URLs are built from.
      - CRLF       every row ends `\r\n`, not `\n`.
      - MIME       `text/csv;charset=utf-8`, and `text/json;charset=utf-8` for the settings file.
      - quoting    the participant LIST is written UNQUOTED and the other two are fully quoted.
                   That is not a style choice to normalise away: unquoted is why the list replaces
                   commas in a name, and the two shapes have to stay apart to stay faithful.
      - headers    with a space after each comma, exactly as the reference writes them.
  */

  /** `new Blob(msgs, …)` over an array of already-terminated lines, as the reference does. */
  function saveAs(lines: string[], filename: string, type: string) {
    const url = URL.createObjectURL(new Blob(lines, { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** The reference's `sess.uuid`, with the same fallback the page's own links use. */
  const roomUuid = $derived(data.room.publicId ?? String(data.room.id));

  /**
   * A name, safe for an UNQUOTED cell.
   *
   * DELIBERATE DIVERGENCE, and it is one character wide. The reference writes
   * `o.userName.trim().replace(","," ")` — and a string first argument to `replace` substitutes only
   * the FIRST occurrence, so a member called `Ribeiro, Billy, Jr` still lands two commas in an
   * unquoted row and silently shifts every column after it. Replacing all of them is the same
   * intent, minus the corruption.
   */
  const csvName = (value: string | null | undefined) =>
    value && value.trim() ? value.trim().replaceAll(',', ' ') : 'n/a';

  /** `exportListToCSV()` — Participant list. Unquoted, and phone only when the room asks for one. */
  function exportListToCsv() {
    const withPhone = Boolean((data.settings as Record<string, unknown>).hasRequiredPhoneInLogin);
    const lines = [withPhone ? 'Name, Email, Phone, Role\r\n' : 'Name, Email, Role\r\n'];
    for (const u of data.users) {
      const cells = withPhone
        ? [csvName(u.displayName), u.email.trim(), u.phone ?? '', String(u.role)]
        : [csvName(u.displayName), u.email.trim(), String(u.role)];
      lines.push(cells.join(',') + '\r\n');
    }
    saveAs(lines, `Participant_List_${roomUuid}.csv`, 'text/csv;charset=utf-8');
  }

  /**
   * `exportStatsToCSV(d)` — participant stats, all nine of the reference's columns.
   *
   * This BUILT the file here, from a `data.visits` array the loader shipped on every page load: up
   * to 5,000 rows, each carrying a visitor's IP address and email. It is now
   * `GET /account/rooms/<shortCode>/stats.csv` — `TODO.md` item W — so those addresses never enter
   * a page payload at all, the rows are read when the file is asked for, and the 5,000 cap is gone
   * because truncating an export silently is worse than a slow one.
   *
   * The format moved to `$lib/stats-csv.ts` rather than being copied, so the endpoint and its tests
   * share one definition of the nine columns.
   *
   * A navigation, not a `fetch`. The browser's own download handling takes the filename from
   * `content-disposition`, shows progress for a large file, and survives a navigation — none of
   * which a blob assembled in memory does. `location.href` rather than `window.open` so no popup
   * blocker is involved: this is a download, not a new window.
   */
  function exportStatsToCsv() {
    location.href = `/account/rooms/${data.room.shortCode}/stats.csv`;
  }

  /** `MM/DD/YYYY hh:mm a`, the reference's moment format, and its `N/A` for an absent time. */
  function statsWhen(at: Date | string | null): string {
    if (!at) return 'N/A';
    const d = new Date(at);
    const hh = d.getHours() % 12 || 12;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(hh)}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'am' : 'pm'}`;
  }

  /**
   * `downloadMontlyStats(data)` — the monthly roll-up.
   *
   * The trailing comma in the header is the reference's, not a typo here: it writes
   * `"Month, Total Logins, \r\n"`, which yields a third, empty column. Reproduced because it is
   * what the file actually contains, and a spreadsheet opens it identically either way.
   *
   * The reference names the file from its own `statXrefsMonthlyDateRange` picker. This app has no
   * such picker — the roll-up is computed from real logins — so the range is taken from the first
   * and last month actually present, which is derived from the data rather than invented.
   */
  function exportMonthlyCsv() {
    const lines = ['Month, Total Logins, \r\n'];
    for (const m of monthly) lines.push(`"${m.month}","${m.logins}"\r\n`);
    const range = monthly.length ? `${monthly[0].month}_to_${monthly[monthly.length - 1].month}` : 'empty';
    saveAs(lines, `Monthly_report_${roomUuid}_${range}.csv`, 'text/csv;charset=utf-8');
  }

  /**
   * `exportSettingsToJSON()` — and JSON here is CORRECT, settled from the bundle.
   *
   * The reference's own handler is `var data=new Blob([JSON.stringify($scope.sess)],
   * {type:"text/json;charset=utf-8"}); FileSaver.saveAs(data,prefix+".json",!0)`. Its filename and
   * MIME are matched here. The body stays pretty-printed: the object is ours rather than its
   * `sess`, so byte-fidelity is not available anyway, and indentation is what makes a settings
   * dump readable.
   *
   * Worth knowing if this ever looks odd: the reference's neighbouring `loadSettingsFromJSON()` is
   * a copy-paste of this function and DOWNLOADS instead of loading. Its button is commented out in
   * the markup, so it never renders. Ours is `loadSettingsFromRoom`, which is a different feature.
   */
  function exportSettings() {
    saveAs(
      [JSON.stringify(data.settings, null, 2)],
      `Settings_${roomUuid}.json`,
      'text/json;charset=utf-8'
    );
  }
</script>

<svelte:head>
  <title>Manage Room {data.room.shortCode} — TradingRoomApp</title>
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

<!--
  The helper copy under a settings row, in the THREE forms the reference uses for it.

  Most rows are `<br><label class="muted">…</label>`. But 41 use a CLASSLESS `<label>`, four of
  those omit the `<br>` (file2:1903, 2112, 2117, 2415), and three carry the copy as a bare text
  node on the row's own `<p>` with no element and no `<br>` at all (file2:2459, 2469, 2477) — the
  same shape `dtNote` above models for the DON'T TOUCH block. Which row is which is read off the
  capture line by line in `$lib/room-settings-help`; this snippet only renders what that says.

  The labels label no control — they are copy sitting beside an editable, exactly like the row
  label — so the a11y rule is silenced with the reason rather than satisfied with a `for` pointing
  at nothing.
-->
{#snippet helpCopy(help: SettingHelp)}
  {#if help.br}<br />{/if}
  {#if help.shape === 'text'}{help.text}{:else}
    <!-- svelte-ignore a11y_label_has_associated_control -->
    <label class={help.shape === 'muted' ? 'muted' : undefined}>{help.text}</label>
  {/if}
{/snippet}

<ToastHost />

<div class="mg-root">
  <div class="panel panel-default">
    <div class="panel-heading">
      <div class="panel-title">
        <span>Manage Room id: {data.room.shortCode}&nbsp;&nbsp;( {data.room.publicId} )</span>
        <!--
          `Current: {{sess.current_capacity}} / Max {{sess.recordedMaxCapacity}}` — two DIFFERENT
          fields, and the reference's own API documentation (`$lib/content/api-docs.ts:127-130`)
          proves it carries three: `current_capacity` 25, `current_max` 100,
          `recordedMaxCapacity` 150. The mark exceeding the limit in its own example is what settles
          that the mark is a recorded observation, not configuration.

          BOTH numbers here were wrong until 2026-08-13:

          - "Current" was `data.users.length`, which is the list AFTER the search box and the seven
            filters. Typing a name into search made the room's occupancy readout say 1. It is now
            `rosterCount`, counted with `count(*)` before any filter is applied.

            `rosterCount` is still a SUBSTITUTION and is stated as one: `current_capacity` is LIVE
            occupancy, and this server receives no occupancy signal — only the room service knows who
            is connected. The roster size is the closest fact the controller holds. The account
            page's room list makes the same substitution, so the two agree. T5-20.
          - "Max" was `maxUsers`, the CONFIGURED limit — and `resetMaxCount` set that to zero, so
            "Reset Counts" destroyed the value shipped to the room. It is now
            `recordedMaxCapacity`, which is what the reset clears.
        -->
        <span class="text-muted">
          Current <i class="icon fa fa-user"></i>: {data.rosterCount} / Max
          <i class="icon fa fa-user"></i> {data.room.recordedMaxCapacity}
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
            href={resolve('/(app)/account/rooms/[id]/[[tab]]', { id: data.room.shortCode, tab: 'marketplace' })}
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
              <a href={resolve('/(app)/account/rooms/[id]/[[tab]]', { id: data.room.shortCode, tab: tab.id })}>{tab.label}</a>
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
                      onclick={exportListToCsv}
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
                        <li><a href={`${resolve('/(app)/account/rooms/[id]/[[tab]]', { id: data.room.shortCode, tab: 'users' })}?filter=trials`}>Show Free Trials</a></li>
                        <li><a href={`${resolve('/(app)/account/rooms/[id]/[[tab]]', { id: data.room.shortCode, tab: 'users' })}?filter=banned`}><i class="fa fa-ban"></i> Show BANNED</a></li>
                        <li><a href={`${resolve('/(app)/account/rooms/[id]/[[tab]]', { id: data.room.shortCode, tab: 'users' })}?filter=muted`}><i class="fa fa-comment-o"></i> Show Chat Muted</a></li>
                        <li><a href={`${resolve('/(app)/account/rooms/[id]/[[tab]]', { id: data.room.shortCode, tab: 'users' })}?filter=mobile`}><i class="fa fa-mobile"></i> Show Mobile</a></li>
                        <li><a href={`${resolve('/(app)/account/rooms/[id]/[[tab]]', { id: data.room.shortCode, tab: 'users' })}?filter=non-mobile`}><i class="fa fa-mobile"></i> Show Non-Mobile</a></li>
                        <li><a href={`${resolve('/(app)/account/rooms/[id]/[[tab]]', { id: data.room.shortCode, tab: 'users' })}?filter=presenters`}><i class="fa fa-microphone"></i> Show Presenters</a></li>
                        <li>
                          <a href={`${resolve('/(app)/account/rooms/[id]/[[tab]]', { id: data.room.shortCode, tab: 'users' })}?filter=marketplace`}><i class="fa fa-credit-card"></i> Marketplace Users</a>
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
                        <input id="select-all-members" type="checkbox" checked={allSelected} onchange={toggleSelectAll} />
                        <!--
                          TWO spans, not one — `page.manageSession.html:258`:

                            <span ng-if="!checkedAllUsers">Select All</span>
                            <span ng-if="checkedAllUsers">Unselect All</span>

                          The comment that used to sit here said the reference "drops the words once
                          every row is checked, leaving a bare checkbox". That was read off a capture
                          taken with nothing selected, where the second `ng-if` had removed its span
                          and left nothing to see. The label TOGGLES; it does not disappear. Same
                          mistake as the four `ng-show="false"` icons, and only the source shows it.
                        -->
                        {#if allSelected}<span>Unselect All</span>{:else}<span>Select All</span>{/if}
                      </label>
                      <label class="checkbox-apply-to-all-rooms">
                        <input id="apply-to-all-rooms" type="checkbox" bind:checked={applyToAllRooms} />
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
                            <!-- The id carries the member id because this renders once per row;
                                 a constant would be duplicated across every row, which is worse
                                 than having none. No `name`: these post through `selected`, and a
                                 name would add a second, unread field to the form. -->
                            <input
                              id={`select-member-${member.id}`}
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

                            CORRECTED 2026-08-13 — THE ABOVE READING IS WRONG, and it was wrong in a
                            way only the SOURCE could show. The DOM capture renders `ng-show="false"`,
                            from which this comment concluded "a literal, not an expression over
                            data". The uncompiled template
                            (`evidence-dumps/TIER1-fetched/views/page.manageSession.html:351-354`)
                            says otherwise — each one INTERPOLATES:

                              ng-show="{{sess.fileAccessCaseByCase && user.hasFileAccess}}"
                              ng-show="{{sess.ptrMobileAppCaseByCaseEnabled && user.hasMobileApp}}"
                              ng-show="{{!sess.ptrMobileAppCaseByCaseEnabled && user.alerterAppTokens.length >0}}"
                              ng-show="{{!sess.ptrMobileAppCaseByCaseEnabled && user.alerterAppFCMUserOff}}"

                            `{{expr}}` evaluated to the STRING "false" because the captured room had
                            both case-by-case settings off and zero users loaded. So these are
                            conditional icons that this room happened never to show — not dead
                            markup.

                            WIRED 2026-08-13, closing that gap. Migration `0010` added
                            `hasFileAccess`, `hasMobileApp` and `alerterAppFcmUserOff` to the member;
                            `alerterAppTokens` was already here as `pushTokensJson`, surfaced by the
                            loader as `pushTokenCount` so the raw device tokens never leave the
                            server.

                            The two mobile icons are mutually exclusive BY CONSTRUCTION, not by
                            coincidence: one requires `ptrMobileAppCaseByCaseEnabled` and the other
                            two require its negation. A room with case-by-case ON shows the large
                            `fa-2x` phone for members granted the app; a room with it OFF shows the
                            small phone for members who have registered a device, and a RED small
                            phone for members who have switched their own notifications off. Both
                            small ones can show at once, which is the reference's behaviour and is
                            meaningful — registered, but silenced.

                            The `hidden` attribute is gone from all four because they are now
                            conditional. `manage.css` still gives `.mg-root [hidden]` a
                            `display: none !important`, which stays: it was added because Font
                            Awesome's `.fa { display: inline-block }` outranks the UA stylesheet's
                            `[hidden]` rule, and other `hidden` icons in this file still rely on it.
                          -->
                          {#if fileAccessCaseByCase && member.hasFileAccess}
                            <i class="fa fa-folder-o fa-2x" aria-hidden="true"></i>
                          {/if}
                          {#if mobileAppCaseByCase && member.hasMobileApp}
                            <i class="fa fa-mobile fa-2x" aria-hidden="true"></i>
                          {/if}
                          {#if !mobileAppCaseByCase && member.pushTokenCount > 0}
                            <i class="fa fa-mobile" aria-hidden="true"></i>
                          {/if}
                          {#if !mobileAppCaseByCase && member.alerterAppFcmUserOff}
                            <i class="fa fa-mobile mg-red" aria-hidden="true"></i>
                          {/if}
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
                            The name follows the avatar IMMEDIATELY — `<img …><the owner's display name>`, no
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
                          <!--
                            `<div ng-show="user.discordUserId">Discord Username: {{user.discordUsername}}</div>`
                            — page.manageSession.html:362-364. The ID is the GATE; the HANDLE is the
                            text. This rendered the id in both positions, so a linked member showed a
                            numeric snowflake where the reference shows their name. Two columns, and
                            neither substitutes for the other.

                            Still written by the Discord integration, which is not built — see
                            docs/OUTSTANDING.md. Both columns stay null until it is.
                          -->
                          {#if member.discordUserId}
                            <div class="mg-discord">Discord Username: {member.discordUsername}</div>
                          {/if}
                          <!--
                            THE STRIPE / MARKETPLACE BLOCK — page.manageSession.html:365-389, behind
                            a marker comment in the reference reading "stripe data here".

                            This feature appears in NO DOM capture. The captured room has no
                            marketplace members, so `ng-if="user.isMarketPlaceUser"` removed the
                            whole div before it ever reached the DOM — `ng-if`, unlike `ng-show`,
                            leaves nothing behind to find. It exists only in the template, which is
                            the second thing in this row that reading the source found and reading
                            the render could not.

                            `.stripe-mini` and `.mb-xs` HAVE NO CSS RULE. Not assumed — both
                            `evidence-dumps/TIER1-fetched/styles.css` (218 KB, the app's own sheet)
                            and `theme.css` (233 KB) were read for each, and neither defines either.
                            The 4px gap comes from the inline style, which is why that is inline here
                            too. They are kept because they are in the reference's markup and this
                            table is a match target; they are inert there and inert here.

                            The `.label-*` classes ARE real: Bootstrap 3.3.7 defines all five
                            (`evidence-bootstrap-3.3.7.css`, `.label-default` #777 through
                            `.label-danger`). `stripeStatusClass()` picks between them exactly as the
                            reference's `getStripeStatusClass` does.

                            HONEST GAP — the "Details" link is deliberately NOT here. The reference
                            ends the block with an anchor carrying an empty href, the classes
                            `label label-info`, a `fa-info-circle` icon, the text "Details", and an
                            ng-click of `openStripeDetails(user)`; nothing in the evidence says what
                            that opens. `openStripeDetails` is
                            not in the template, not in any capture, and not among the handlers
                            transcribed out of `app.min.js` in
                            `docs/reference/evidence-dumps-full-read.md`. Rendering the anchor with
                            an invented modal behind it, or with no behaviour at all, would be a
                            control whose only effect is its own presence. Recorded in `TODO.md`
                            under Evidence gaps instead, with the console script that would fetch it.

                            Every amount goes through `formatMoney`, never a bare `/100` — the
                            reference's own formatter divides unconditionally and renders JPY, KRW,
                            VND and thirteen more a hundredfold low. `money.test.ts` keeps that
                            implementation as a negative control so nobody restores it.
                          -->
                          {#if member.isMarketplaceUser}
                            <div class="stripe-mini mb-xs mg-stripe-mini">
                              <span
                                class="label {stripeStatusClass(member.stripeSubscriptionStatus)}"
                                title="Subscription Status"
                              >
                                <i class="fa fa-credit-card"></i>
                                {member.stripeSubscriptionStatus || 'stripe'}
                              </span>
                              {#if member.stripeLastPaidAt}
                                <span class="label label-default" title="Last Paid At">
                                  <i class="fa fa-calendar-check-o"></i>
                                  {formatShortDate(member.stripeLastPaidAt)}
                                </span>
                              {/if}
                              {#if member.stripeCurrentPeriodEnd}
                                <span class="label label-default" title="Next Billing">
                                  <i class="fa fa-clock-o"></i>
                                  {formatShortDate(member.stripeCurrentPeriodEnd)}
                                </span>
                              {/if}
                              {#if member.stripeLastPaymentFailureAt}
                                <span class="label label-danger" title="Last Payment Failure">
                                  <i class="fa fa-exclamation-triangle"></i>
                                  {formatShortDate(member.stripeLastPaymentFailureAt)}
                                </span>
                              {/if}
                              {#if member.stripeLastPaidAmount}
                                <span class="label label-default" title="Last Paid Amount">
                                  <i class="fa fa-usd"></i>
                                  {formatMoney(member.stripeLastPaidAmount, member.stripeLastPaidCurrency ?? undefined)}
                                </span>
                              {/if}
                            </div>
                          {/if}
                          <!--
                            THE MEMBER'S BADGES — page.manageSession.html:391-396.

                            Sits between the Stripe block and the TRIAL span, which is where the
                            reference puts it. Ours rendered badges only inside the row menu, so an
                            operator could assign one and never see it on the row.

                            **Iterated over the ACCOUNT's badge list, filtered by membership** —
                            `ng-repeat="b in badgesList" ng-if="user.badges.includes(b._id)"`. That
                            ordering is the reference's and it is the right one: every row shows its
                            badges in the same order, so a column of rows is scannable. Iterating
                            `member.badges` instead would order them by whenever each was assigned,
                            which differs per member and looks like noise.

                            Both loops are small — an account's badge list and one member's
                            assignments — so the nested `includes` is bounded by the badge count, not
                            by the member count.

                            The two leading `&nbsp;` are INSIDE the outer div and before the first
                            badge, which is what separates the block from the name preceding it.
                            There is no CSS margin doing that job.

                            Colours come from the data and are therefore inline, as they are in the
                            reference. The only static declaration on the inner div is
                            `margin-right: 2px`, which is `mg-row-badge` here so the value lives in
                            the stylesheet with its provenance rather than being repeated per row.

                            Text form OR image form, never both: the reference uses `ng-hide` on the
                            span and `ng-show` on the img with the same predicate, so exactly one
                            paints. `alt` is the image URL itself — its own choice, kept, because a
                            badge image has no other text and inventing one would be inventing.
                          -->
                          {#if data.badges.length > 0 && member.badges.length > 0}
                            <div class="mg-row-badges">
                              &nbsp;&nbsp;{#each data.badges as badge (badge.id)}{#if member.badges.includes(badge.id)}<div
                                    class="label mg-row-badge"
                                    style:background-color={badge.backgroundColor}
                                    style:color={badge.textColor}
                                  >
                                    {#if badge.imageUrl}
                                      <img class="user-badge-img" src={badge.imageUrl} alt={badge.imageUrl} />
                                    {:else}
                                      <span>{badge.label}</span>
                                    {/if}
                                  </div>{/if}{/each}
                            </div>
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
                            The field is `user.type`. Named 2026-08-11 from the UNCOMPILED manage
                            view, pulled out of AngularJS's own `$templateCache` at
                            `/public/app/views/page.manageSession.html` and committed as
                            `evidence-page.manageSession.html`. Line 420, verbatim:

                                span ng-hide="user.role==0" then " / " then user.type in braces

                            So the earlier note here was right about the shape and wrong about one
                            thing: the interpolation was never unnameable, only unfetched. A DOM
                            dump keeps the rendered text; the partial keeps the binding.

                            "login" is WITHDRAWN. `docs/OUTSTANDING.md:285` recorded it as a measured
                            value, and it is not: `manual` is the only value in any capture, and
                            `login` appears in none of the five files that carry this row
                            (`must-match/file1`, `must-match/important`, `must-match/match`,
                            `mising/file1`, `mising/file2`). It was read into the record somewhere
                            and repeated since.

                            The slash still stands alone, and now for a known reason rather than an
                            unknown one: `room_users` has no column meaning "how this membership came
                            to exist", and inventing one would be inventing the semantics. This is
                            EXACTLY what the reference renders for a user whose `type` is empty — the
                            owner's own row proves that shape, carrying " / " with nothing after it.
                            Giving the column a meaning is a product decision, recorded in TODO.md.
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
                                     <!--
                                       `manageMobileApp(user._id, user.userName, $index, 'enable'|'disable')` —
                                       page.manageSession.html:545-551. The divider is gated on the SAME `ng-if`,
                                       so a room without case-by-case ends this submenu at Reset rather than on a
                                       trailing rule.

                                       These write `hasMobileApp`, which drives the large phone icon at the top of
                                       this row. Until they existed the column had no writer and the icon had no
                                       cause — an indicator that could never light up.

                                       Disable carries a RED glyph in the reference and Enable does not, which is
                                       the only thing telling the two apart at a glance.
                                     -->
                                     {#if mobileAppCaseByCase}
                                       <li class="divider" role="separator"></li>
                                       <li>
                                         <form method="POST" action="?/setMemberGrant" use:enhance={save}>
                                           <input type="hidden" name="roomUserId" value={member.id} />
                                           <input type="hidden" name="grant" value="mobile-app" />
                                           <input type="hidden" name="granted" value="on" />
                                           <button type="submit"><i class="fa fa-mobile" aria-hidden="true"></i>&nbsp;&nbsp;Enable Mobile App</button>
                                         </form>
                                       </li>
                                       <li>
                                         <form method="POST" action="?/setMemberGrant" use:enhance={save}>
                                           <input type="hidden" name="roomUserId" value={member.id} />
                                           <input type="hidden" name="grant" value="mobile-app" />
                                           <input type="hidden" name="granted" value="" />
                                           <button type="submit"><i class="fa fa-mobile mg-red" aria-hidden="true"></i>&nbsp;&nbsp;Disable Mobile App</button>
                                         </form>
                                       </li>
                                     {/if}
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
                                <!--
                                  `manageFileAccess(user._id, user.userName, $index, 'enable'|'disable')` —
                                  page.manageSession.html:592-598, the LAST two items in the reference's row
                                  menu, after Pause / Pending. Divider gated on the same `ng-if`.

                                  These write `hasFileAccess`, which drives the folder icon at the top of the
                                  row. Same reasoning as the mobile pair above: without a writer the icon has
                                  no cause.

                                  The glyph is `fa-folder`, SOLID — not the `fa-folder-o` outline the row's
                                  icon uses. Two different glyphs in the reference, kept as two here.
                                -->
                                {#if fileAccessCaseByCase}
                                  <li class="divider" role="separator"></li>
                                  <li>
                                    <form method="POST" action="?/setMemberGrant" use:enhance={save}>
                                      <input type="hidden" name="roomUserId" value={member.id} />
                                      <input type="hidden" name="grant" value="file-access" />
                                      <input type="hidden" name="granted" value="on" />
                                      <button type="submit"><i class="fa fa-folder" aria-hidden="true"></i>&nbsp;&nbsp;Enable Files</button>
                                    </form>
                                  </li>
                                  <li>
                                    <form method="POST" action="?/setMemberGrant" use:enhance={save}>
                                      <input type="hidden" name="roomUserId" value={member.id} />
                                      <input type="hidden" name="grant" value="file-access" />
                                      <input type="hidden" name="granted" value="" />
                                      <button type="submit"><i class="fa fa-folder mg-red" aria-hidden="true"></i>&nbsp;&nbsp;Disable Files</button>
                                    </form>
                                  </li>
                                {/if}
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
                    <!-- `formatLastLogin`, INHERITED from this page's other stamps rather than
                         captured: the reference shows this inside a bootbox whose format is in no
                         capture we hold. What is not inherited is the reason — `toLocaleString()`
                         renders the reader's locale, so an owner abroad reads a swapped date. -->
                    {formatLastLogin(String(form.pairCodeExpiresAt))}
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
                        <!-- same inherited format, same reason -->
                        <div>{t.platform} …{t.lastSix} — added {formatLastLogin(t.addedAt)}</div>
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

                        The BEHAVIOUR is the match, not the filename. The reference falls back to
                        THE SITE'S OWN logo — for it, `ptr_logo.png`. For us the site is
                        tradingroom.app, so the fallback is OUR logo, at a neutral path.

                        Copying `ptr_logo.png` was briefly done here and was wrong twice: it would
                        put a third party's brand asset into a public repository, and it would
                        render somebody else's wordmark as this product's default.

                        The logo is white on transparent, which is why the surrounding panel is
                        `background-color: #000`. That black box is not decoration — it exists so a
                        white wordmark is visible at all. Worth knowing before anyone "simplifies"
                        the panel away.

                        SVG rather than PNG: a wordmark is vector by nature, so it stays crisp on
                        a Retina display and at the 25px `.navLogo` clamps it to, without shipping
                        three raster sizes. Replace the file to rebrand; nothing here changes.
                      -->
                      <img class="navLogo" src="/public/images/room-logo.svg" alt="" />
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
                    <!--
                      A CLICK-TO-EDIT ANCHOR, not a bare date input.

                      The reference edits both stats dates through angular-xeditable's
                      `editable-date` directive — `<a href="#" editable-date="statsDate" class="…
                      editable editable-click">08-07-2026</a>` on file2:905, and its End Date twin
                      on file2:910 — carrying the current value as the anchor's own text. Ours was
                      an `<input type="date">`: a different tag, and one node fewer than the
                      anchor-plus-text pair, which put every element after it in this pane out of
                      step with the capture.

                      The href is `""`, and the reference's is `"#"` — the one attribute here that
                      is deliberately NOT transcribed. `""` is the value the capture's other
                      editable anchors already carry (file2:889, 991), it resolves to the current
                      URL, and neither is ever followed: the click is always prevented.

                      WHAT THIS COMMENT USED TO SAY, AND WHY IT WAS WRONG. It claimed `#` "cannot
                      ship" because Svelte flags `a11y_invalid_attribute` under
                      `svelte-check --fail-on-warnings`. Both halves were misleading: `""` is
                      flagged by the SAME rule, so swapping one for the other bought nothing, and
                      `pnpm check` really does run `--fail-on-warnings` — so these two anchors put
                      the package's own gate at exit 1 from the moment they shipped, which is not
                      what a comment explaining a workaround should leave behind.

                      The warning is now SUPPRESSED rather than dodged, because the markup is
                      right: an anchor is what the reference uses, the value is what its siblings
                      carry, and the control is keyboard-reachable with a real `aria-label`. A
                      suppression that names the rule is honest; picking a different invalid value
                      and claiming the linter forced it was not.

                      The EDITING state is not captured: nothing in the dump was ever clicked, so
                      there is no evidence of what the date popover looks like. The input therefore
                      keeps exactly the styling it already had and closes on change (a date was
                      picked) or on blur (clicked away), which is this page's own choice, not a
                      transcription.

                      The `for`/`id` pair stays. The reference's labels carry no `for` (file2:904,
                      909) and it does dangle while the field is resting, but it is invisible to
                      this comparison — `shapeOf` reads tag and classes only — and dropping it
                      would leave an orphan `<label>`, which `svelte-check --fail-on-warnings`
                      rejects as `a11y_label_has_associated_control`.
                    -->
                    <div>
                      <p class="form-control-static">
                        <!--
                          `for` is set only WHILE the field exists.

                          It used to be unconditional, pointing at an id that is only in the DOM
                          during editing — so at rest the label referenced nothing. A dangling
                          `for` is not inert: a screen reader announces a label whose control
                          cannot be found, and clicking it moves focus nowhere.

                          The reference's own labels carry no `for` at all (file2:904, 909), so
                          dropping it at rest is also the closer match. Attributes are invisible to
                          the side-by-side comparison, which reads tag and classes only.

                          a conditional `for`, because at rest the thing being captioned is an `<a>`, and
                          an anchor is not a labelable element — there is no id `for` could legally
                          point at. The anchor carries its own `aria-label` below, so the caption
                          still reaches assistive tech. The `svelte-ignore` that used to sit here was removed on
                          2026-08-09: with `for` conditional the rule no longer fires, so the
                          suppression silenced nothing and was dead scaffolding.
                        -->
                        <label class="col-sm-4 control-label" for={editingStatsFrom ? 'statsFrom' : undefined}
                          >Start Date:</label
                        >
                        {#if editingStatsFrom}
                          <input
                            class="mg-date"
                            type="date"
                            id="statsFrom"
                            bind:value={statsFrom}
                            onchange={() => (editingStatsFrom = false)}
                            onblur={() => (editingStatsFrom = false)}
                            {@attach focusDateField}
                          />
                        {:else}
                          <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                          <!-- svelte-ignore a11y_invalid_attribute -->
                          <a
                            class={[
                              'editable editable-click',
                              { 'editable-empty': isEditableEmpty(statsFrom, false) }
                            ]}
                            href=""
                            onclick={(e) => {
                              e.preventDefault();
                              editingStatsFrom = true;
                            }}
                            aria-label="Start Date: {statsDateText(statsFrom)}"
                            >{statsDateText(statsFrom)}</a
                          >
                        {/if}
                        <br />
                        <span class="muted">Choose a start date</span>
                      </p>
                      <p class="form-control-static">
                        <!--
                          `for` is set only WHILE the field exists.

                          It used to be unconditional, pointing at an id that is only in the DOM
                          during editing — so at rest the label referenced nothing. A dangling
                          `for` is not inert: a screen reader announces a label whose control
                          cannot be found, and clicking it moves focus nowhere.

                          The reference's own labels carry no `for` at all (file2:904, 909), so
                          dropping it at rest is also the closer match. Attributes are invisible to
                          the side-by-side comparison, which reads tag and classes only.

                          a conditional `for`, because at rest the thing being captioned is an `<a>`, and
                          an anchor is not a labelable element — there is no id `for` could legally
                          point at. The anchor carries its own `aria-label` below, so the caption
                          still reaches assistive tech. The `svelte-ignore` that used to sit here was removed on
                          2026-08-09: with `for` conditional the rule no longer fires, so the
                          suppression silenced nothing and was dead scaffolding.
                        -->
                        <label class="col-sm-4 control-label" for={editingStatsTo ? 'statsTo' : undefined}
                          >End Date:</label
                        >
                        {#if editingStatsTo}
                          <input
                            class="mg-date"
                            type="date"
                            id="statsTo"
                            bind:value={statsTo}
                            onchange={() => (editingStatsTo = false)}
                            onblur={() => (editingStatsTo = false)}
                            {@attach focusDateField}
                          />
                        {:else}
                          <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
                          <!-- svelte-ignore a11y_invalid_attribute -->
                          <a
                            class={[
                              'editable editable-click',
                              { 'editable-empty': isEditableEmpty(statsTo, false) }
                            ]}
                            href=""
                            onclick={(e) => {
                              e.preventDefault();
                              editingStatsTo = true;
                            }}
                            aria-label="End Date: {statsDateText(statsTo)}"
                            >{statsDateText(statsTo)}</a
                          >
                        {/if}
                        <br />
                        <span class="muted">Choose an end date</span>
                      </p>
                    </div>
                    <!--
                      `loadStats(statsDate, statsDateEnd, uSearchStat, filterFT, remDupes, showMobileStat)`
                      — in the reference this posts and repopulates `statXrefs`. Ours already holds
                      the rows and every one of those six arguments is applied live, so the button
                      re-applies the date range rather than fetching. It is not a no-op: `statsFrom`
                      and `statsTo` are typed into date fields, and this is what commits them.
                    -->
                    <button class="btn btn-md btn-info" type="button" onclick={applyStatsRange}>
                      <i class="fa fa-user-plus" aria-hidden="true"></i> Load Stats
                    </button>
                    <!-- Export sits between Load Stats and the monthly buttons: the reference's
                         order is Load Stats, Export, Monthly report (nodes 213/215/217 of
                         manage:tab:User Stats). Ours had Export last. -->
                    <!--
                      A BUTTON, because the reference's is one — `evidence-page.manageSession.html:677`
                      is `<button class="btn btn-md btn-info" ng-click="exportStatsToCSV(statsDate)">`.
                      This was briefly an `<a>` pointing at the endpoint, which read better as HTML
                      and made the side-by-side against the reference worse; `manage-sections-sbs`
                      caught it, which is what that baseline exists for.

                      The file itself now comes from
                      `GET /account/rooms/<shortCode>/stats.csv` — `TODO.md` item W — so the visit
                      rows and the IP addresses in them never enter a page payload. Navigating
                      rather than fetching means the browser's own download handling takes the
                      filename from `content-disposition` and shows progress for a large export.
                    -->
                    <button
                      class="btn btn-md btn-info"
                      type="button"
                      onclick={exportStatsToCsv}
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
                        onclick={exportMonthlyCsv}
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
                        <input id="stats-online-only" type="checkbox" bind:checked={statsOnlineOnly} />
                        &nbsp;Show Online Users Only
                      </label>
                      <label>
                        <input id="stats-trials-only" type="checkbox" bind:checked={statsTrialsOnly} />
                        &nbsp;Show <span class="badge badge-danger">Free Trials</span> Only?
                      </label>
                      <label>
                        <input id="stats-mobile-only" type="checkbox" bind:checked={statsMobileOnly} />
                        &nbsp;Show Mobile Only?
                      </label>
                      <label>
                        <input id="stats-dedupe" type="checkbox" bind:checked={statsDedupe} />
                        &nbsp;Remove duplicates?
                      </label>
                      <!--
                        The "not applied" notice that used to sit here is GONE, because all four
                        checkboxes now filter. It was honest while two of them could not — the
                        reference has no such notice, and rendering one was a deliberate divergence
                        with a reason. The reason expired when the reading closed it.
                      -->
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
              <!--
                The reference gates on the ROWS, not on a "loaded" flag:

                  <h3 ng-hide="statXrefs.length>0 || statXrefsMontly.length>0">No results to show. …
                  <table ng-show="!loadingUsersStats && statXrefs.length>0">

                `statsLoaded` used to stand in for that, because our rows arrived only when the
                button was pressed. They now arrive WITH the page — the loader selects them on this
                tab — so the flag would keep a table full of real rows hidden behind a click the
                reference never required for data it already had.

                The empty-state paragraph below the heading is ours and is kept: the reference shows
                the same heading whether the room has no visits or the chosen range has none, and
                which of those it is matters to whoever is looking.
              -->
              {#if visibleStats.length === 0}
                <h3>No results to show. Select a date above...</h3>
                <!--
                  The heading ALONE by default, because that is all the reference shows
                  (`ng-hide="statXrefs.length>0 || statXrefsMontly.length>0"`) and it is what the
                  capture holds. `manage-sections-sbs` compares this pane element for element.

                  The extra line appears only once a range has been COMMITTED and came back empty —
                  the one case where "no results" is ambiguous between "this room has no visits" and
                  "your dates excluded them all", and the reference shows the same heading for both.
                -->
                {#if statsRangeFrom || statsRangeTo}
                  <p class="muted">
                    Nothing was recorded in that range. Logins come from the room's own
                    sessions — no rows are invented to fill the table.
                  </p>
                {/if}
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
                      <!--
                        THE ARRIVAL ROW — `page.manageSession.html:739-754`, cell for cell.

                        `{{$index}}` is ZERO-based, as ngRepeat's is and as our user row already
                        rendered it. Every stamp is `date:'MM/dd/yyyy @ h:mma'`, which is what
                        `formatLastLogin` implements — never `toLocaleString`, which renders the
                        READER's locale and swaps day and month for an owner abroad.

                        `hidden` rather than removed for the online filter: the reference's
                        `ng-hide="filterOnline && !userStat.isOnline"` leaves the row in the table,
                        so `table-striped` keeps counting it and the banding goes irregular when the
                        filter is on. Reproduced deliberately — T5-12 — because it is the original's
                        behaviour, and `.mg-root [hidden]` is `display: none !important`, exactly
                        what `.ng-hide` carries.

                        The IP lookup is the reference's own `http://ip-api.com/#<ip>` in a new tab.
                        Two deliberate deviations, both stated: `rel="noopener noreferrer"`, which
                        this page already adds to its other `target="_blank"` anchor and which
                        changes nothing visible; and nothing else. The scheme stays `http` because
                        that is the href in the source.

                        `Out` renders only for a CLOSED visit — `ng-hide="userStat.isOnline"`, and a
                        visit is online while `leftAt` is null. Duration likewise: an open visit has
                        no duration yet, and the reference prints an empty cell rather than a running
                        total.
                      -->
                      {#each visibleStats as row, i (row.id)}
                        <tr hidden={hiddenByOnline(row.leftAt)}>
                          <td>{i}</td>
                          <td>
                            <img
                              class="thumb24"
                              src={avatarPlaceholder}
                              alt=""
                              width="24"
                              height="24"
                            />{row.displayName}
                            {#if row.isFreeTrial}
                              <span class="badge badge-danger-chat mg-trial"> TRIAL </span>
                            {/if}
                          </td>
                          <td>
                            {row.email}
                            <br />
                            IP: <a
                              href={`http://ip-api.com/#${row.ip ?? ''}`}
                              target="_blank"
                              rel="noopener noreferrer">{row.ip ?? ''} (lookup)</a
                            >
                            <br />
                            {#if row.isMobile}
                              <i class="fa fa-mobile" aria-hidden="true"></i>
                            {:else}
                              <i class="fa fa-desktop" aria-hidden="true"></i>
                            {/if}&nbsp;
                            {row.browser ?? ''}
                          </td>
                          <td>
                            In: {formatLastLogin(row.joinedAt)}
                            <br />
                            {#if row.leftAt !== null}
                              <span>Out {formatLastLogin(row.leftAt)}</span>
                            {/if}
                          </td>
                          <td>{visitDurationHours(row.joinedAt, row.leftAt)}</td>
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

                  <!-- the reference's own empty <p>, file2:1000, sitting between the JWT block
                       and the shortcode. Not decoration — same 10px bottom margin as the empty
                       one in the DON'T TOUCH block below. -->
                  <p></p>

                  <!-- a plain <span>, not an editable: the reference builds this
                       from the room id and it is not a stored setting -->
                  <p class="form-control-static">
                    <label class="col-sm-2 control-label" for="mg-shortcode">Wordpress shortcode:</label>
                    <span id="mg-shortcode">{data.wordpressShortcode}</span>
                  </p>

                  {#each settingsBeforeApiSecret as def (def.name)}
                    {@const help = settingHelp(def)}
                    <p class="form-control-static">
                      <!--
                        NO `for`, AND NO WRAPPER around the editable.

                        The reference's row is `<p class="form-control-static"><label
                        class="col-sm-2 control-label">…</label><a … class="editable
                        editable-click">…</a></p>` — file2:1035-1036, and the same on every row
                        after it. Its label carries no `for`, and there is nothing between the
                        paragraph and the anchor.

                        Ours used to add `for` pointing at a `<span>` wrapped round the editable,
                        which bought no accessibility — a span is not a labelable element, so the
                        association does nothing — and cost one extra node on every one of the
                        260 settings rows. So the span goes, and the a11y rule that asked for the
                        `for` is silenced here with the reason rather than satisfied with a lie.
                      -->
                      <!-- svelte-ignore a11y_label_has_associated_control -->
                      <label class="col-sm-2 control-label">{def.label ?? def.name}</label>
                      <Editable {def} value={settingValue(def.name)} markUnwired />
                      {#if help && !help.outside}
                        <!--
                          A `<label>`, because that is what the reference's helper copy IS:
                          `<br><label class="muted">If set, Presenters will need to enter the
                          password to delete an alert</label>` (file2:1037), and the same on
                          every row that has helper copy.

                          This was a `<span class="muted">` on the argument that a span with the
                          same computed box says the same thing. True of the paint, false of the
                          shape — one differing row per helper, and there are 87 of them in the
                          first half of this pane alone.

                          41 of them carry NO class in the capture, four of those drop the `<br>`
                          as well, and three are not an element at all — `helpCopy` above renders
                          the three shapes and `$lib/room-settings-help` says which row is which,
                          and why the generated schema cannot.
                        -->
                        {@render helpCopy(help)}
                      {/if}
                    </p>
                    <!--
                      Three settings put their helper OUTSIDE the row's `<p>`, as a sibling — the
                      outline proves it by indent, their helper sitting one level shallower than
                      their own anchor. `pairOKRedirect`, `pairErrorRedirect` and
                      `doNotAutoSoftReset`. It is generated as `helpOutside` rather than matched by
                      name, so the next setting that does it is placed correctly instead of wrongly.
                    -->
                    {#if help?.outside}
                      {@render helpCopy(help)}
                    {/if}
                  {/each}

                  {#if apiSecretDef}
                    <!--
                      The reference's own `<p class="form-control-static">` (file2:1907), not a div.

                      This was a div because the New Secret button lived inside an inline `<form>`
                      here, and a form cannot nest in a paragraph — so the row's outermost element
                      was the one element on it that did not match. The button keeps its form and
                      loses the nesting: `form="mg-generate-apisecret"` points at the detached
                      `<form>` below, which is the pattern this file already uses for the cluster
                      and repeater buttons in the DON'T TOUCH block.
                    -->
                    <p class="form-control-static">
                      <!-- same bare label and unwrapped editable as the loops above -->
                      <!-- svelte-ignore a11y_label_has_associated_control -->
                      <label class="col-sm-2 control-label">API secret</label>
                      <Editable def={apiSecretDef} value={settingValue('apiSecret')} markUnwired />
                      &nbsp;
                      <button
                        class="btn btn-sm btn-warning"
                        type="submit"
                        form="mg-generate-apisecret"
                      >
                        <i class="fa fa-random"></i> New Secret
                      </button>
                    </p>
                    <form
                      id="mg-generate-apisecret"
                      method="POST"
                      action="?/generateApiSecret"
                      use:enhance={confirmThen(
                        'Generate a new API secret for this room? The current one stops working immediately.'
                      )}
                    ></form>
                  {/if}

                  <p class="form-control-static">
                    <a class="btn btn-default" target="_blank" rel="noopener noreferrer" href={resolve('/(app)/account/api-docs')}>
                      API POST Routes Docs
                    </a>
                  </p>

                  <!-- the settings the reference lists BELOW the docs link, starting at slackPostURL -->
                  {#each settingsAfterApiSecret as def (def.name)}
                    {@const help = settingHelp(def)}
                    <p class="form-control-static">
                      <!-- same bare label and unwrapped editable as the loop above -->
                      <!-- svelte-ignore a11y_label_has_associated_control -->
                      <label class="col-sm-2 control-label">
                        {#if def.name === 'chatTabsWithBadges'}
                          <!--
                            A row label that opens with a CHILD ELEMENT rather than with its text
                            — the only one anywhere in this pane, which is why the schema carries
                            `label: null` for it and the row came out titled with its raw key:
                            `scripts/extract-manage-schema.mjs:203` takes the line AFTER the
                            control-label opener, and here that line is the icon. Both the icon and
                            the text are transcribed from file2:2081.

                            HONEST GAP: the reference hangs
                            `ng-click="openChatTabsWithBadgesEditor(sess.chatTabsWithBadges)"` off
                            this `<i>`, and that editor never rendered anywhere in the capture. The
                            markup is transcribed; the handler is not invented, so the icon here is
                            an icon and nothing else. `ms-2` and `cursor-pointer` likewise have no
                            rule in any stylesheet this repo holds — they are the capture's class
                            list, carried across, not classes we style.
                          -->
                          <i class="fa fa-gear ms-2 cursor-pointer" title="Configure Chat Tabs"
                          ></i> Chat Tabs With Badges:
                        {:else}
                          {def.label ?? def.name}
                        {/if}
                      </label>
                      <Editable {def} value={settingValue(def.name)} markUnwired />
                      {#if help && !help.outside}
                        <!-- the reference's own helper copy again — see the loop above -->
                        {@render helpCopy(help)}
                      {/if}
                    </p>
                    <!--
                      Three settings put their helper OUTSIDE the row's `<p>`, as a sibling — the
                      outline proves it by indent, their helper sitting one level shallower than
                      their own anchor. `pairOKRedirect`, `pairErrorRedirect` and
                      `doNotAutoSoftReset`. It is generated as `helpOutside` rather than matched by
                      name, so the next setting that does it is placed correctly instead of wrongly.
                    -->
                    {#if help?.outside}
                      {@render helpCopy(help)}
                    {/if}
                    {#if def.name === 's3BucketFolderPath' || def.name === 'restreamToURLKey'}
                      <!-- a bare `<br>` BETWEEN two rows, not inside either: file2:2316 separates
                           the S3 block from Save Recs to Vimeo, file2:2366 the Restream block from
                           Custom Rec Params. Same furniture the DON'T TOUCH block already carries. -->
                      <br />
                    {/if}
                    <!--
                      The literal `<label>` that used to sit here for `doNotAutoSoftReset` is gone.
                      Its comment said "`help` cannot express that, so it is furniture here" — it
                      can now: `helpOutside`, generated from the outline's indent, places this and
                      the two `pair*Redirect` helpers outside their `<p>` without naming any of
                      them. Keeping both rendered the helper TWICE, which was the last 62 of the
                      Settings side-by-side.
                    -->
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
