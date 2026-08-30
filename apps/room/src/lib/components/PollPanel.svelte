<script lang="ts">
  import {
    POLL_CLOSE_CONFIRMATION,
    POLL_SAVED_ALERT,
    POLL_SEND_CONFIRMATION,
    addPollChoice,
    calculatePollPanelPosition,
    calculatePollSeries,
    deletePollChoice,
    formatPollResults,
    formatVisiblePollResponses,
    pollDeleteConfirmation
  } from '#lib/poll-behavior.js';
  import { clampAndSnap } from '#lib/panel-drag.js';
  import PollSavedList from '#lib/components/PollSavedList.svelte';
  import type { ActivePoll, SavedPoll } from '#lib/types.js';

  type PollMode = 'setup' | 'answer' | 'results' | 'done';
  type PollTab = 'new' | 'saved';
  type OpenMode = 'setup' | 'auto';
  /**
   * `handles: "n, e, s, w, ne, se, sw, nw"` — byte 2,108,197, in the reference's own order.
   *
   * One list, read by the type and by the markup, so a handle cannot be drawn that `beginResize`
   * does not understand and none can be typed that is never drawn.
   */
  const RESIZE_HANDLES = ['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'] as const;
  type ResizeDirection = (typeof RESIZE_HANDLES)[number];

  interface Props {
    hostElement: HTMLElement | undefined;
    open: boolean;
    openMode: OpenMode;
    restoreToken: number;
    currentUser: {
      id: number;
    };
    activePoll: ActivePoll | null;
    savedPolls: SavedPoll[];
    onclose: () => void;
    onminimize: () => void;
    onalert: (message: string) => void;
    onconfirm: (message: string, onconfirm: () => void) => void;
    onsave: (question: string, choices: string[]) => Promise<boolean>;
    ondelete: (pollId: number) => Promise<boolean>;
    onsend: (question: string, choices: string[]) => Promise<boolean>;
    onanswer: (choiceIndex: number) => Promise<boolean>;
    onpostresults: (body: string) => Promise<boolean>;
    onend: () => Promise<boolean>;
  }

  let {
    hostElement,
    open,
    openMode,
    restoreToken,
    currentUser,
    activePoll,
    savedPolls,
    onclose,
    onminimize,
    onalert,
    onconfirm,
    onsave,
    ondelete,
    onsend,
    onanswer,
    onpostresults,
    onend
  }: Props = $props();

  /**
   * `radius: .8` — where flot rings the pie with its labels, as a fraction of the pie's radius.
   *
   * `EB`, byte 2,104,707, which is the whole options object the reference hands `$.plot`. Named
   * rather than inlined because it is the reference's number and not a taste, and a bare `0.8` in a
   * geometry expression is the first thing a later reader "tunes".
   */
  const PIE_LABEL_RADIUS = 0.8;

  /**
   * The pie's radius for a given box — ONE expression, read by the drawing and by the labels.
   *
   * They were two expressions, in different units, and that is precisely what `poll-03` was: the pie
   * was drawn on `min(w,h)/2 - 10` while the labels were placed at 32% of the box in each axis.
   */
  function pieRadius(width: number, height: number): number {
    return Math.max(0, Math.min(width, height) / 2 - 10);
  }

  let mode = $state<PollMode>('setup');
  let pollTab = $state<PollTab>('new');
  let pollQuestion = $state('');
  let pollChoice = $state('');
  let pollChoices = $state.raw<string[]>([]);
  let anonymousPoll = $state(false);
  let answered = $state(false);
  let isMinimized = $state(false);
  let isMaximized = $state(false);
  let wasMaximizedBeforeMin = $state(false);
  let dragInitialized = $state(false);
  let panelWidth = $state(580);
  let panelHeight = $state(553);
  let panelLeft = $state(0);
  let panelTop = $state(0);
  let preMaxBounds = {
    width: 580,
    height: 553,
    top: 0,
    left: 0
  };
  let chartCanvas = $state<HTMLCanvasElement | undefined>();
  /**
   * `poll-03` — the chart box, measured, because the labels sit on a CIRCLE and the box is not one.
   *
   * `#pollPieChart` is `width: 100%` by a fixed `height: 300px`, so a percentage offset from its
   * centre traces an ellipse: 32% of a ~540px-wide panel is ~173px sideways and ~96px down. flot
   * places labels at `radius: .8` — eight tenths of the PIE's radius, the same number in both axes —
   * and the pie radius here is `min(width, height) / 2 - 10`. The two agree only when the box is
   * square, which it never is.
   *
   * Written by `drawPieChart`, which measures the parent anyway; reactive because `labelStyle` reads
   * it during render and a plain `let` would leave the first frame's labels at the origin. `.raw`
   * because it is only ever REPLACED — a deep proxy over two numbers is overhead on every label.
   */
  let chartBox = $state.raw({ width: 0, height: 0 });
  let priorOpen = false;
  let priorRestoreToken = 0;
  let pointerState:
    | {
        kind: 'drag';
        startX: number;
        startY: number;
        left: number;
        top: number;
      }
    | {
        kind: 'resize';
        direction: ResizeDirection;
        startX: number;
        startY: number;
        left: number;
        top: number;
        width: number;
        height: number;
      }
    | null = null;

  const senderResults = $derived(
    activePoll && activePoll.senderId === currentUser.id ? activePoll : null
  );
  const total = $derived(senderResults?.total ?? 0);
  const totals = $derived(senderResults?.totals ?? pollChoices.map(() => 0));
  const answers = $derived(senderResults?.answers ?? []);
  const pieData = $derived(calculatePollSeries(pollChoices, totals, total));
  const visibleResponses = $derived(formatVisiblePollResponses(pollChoices, answers));
  const panelStyle = $derived(
    `width: ${panelWidth}px; height: ${panelHeight}px; display: ${
      open && !isMinimized ? 'inline' : 'none'
    }; left: ${panelLeft}px; top: ${panelTop}px;`
  );

  function wrapperElement() {
    return document.querySelector<HTMLElement>('.wrapper');
  }

  function centerPanel() {
    const wrapper = wrapperElement();
    if (!wrapper || !hostElement) return;

    const position = calculatePollPanelPosition(
      wrapper.clientWidth,
      wrapper.clientHeight,
      hostElement.offsetWidth,
      hostElement.offsetHeight
    );
    panelLeft = position.left;
    panelTop = position.top;
  }

  function resetModeForOpen() {
    pollQuestion = '';
    pollChoice = '';
    pollChoices = [];
    anonymousPoll = false;
    answered = false;
    pollTab = 'new';

    if (openMode === 'setup' || !activePoll) {
      mode = 'setup';
      return;
    }

    pollQuestion = activePoll.q;
    pollChoices = [...activePoll.choices];
    if (activePoll.senderId === currentUser.id) {
      mode = 'results';
    } else if (activePoll.userAnswerChoice === null) {
      mode = 'answer';
    } else {
      mode = 'done';
    }
  }

  function showPanel() {
    isMinimized = false;
    isMaximized = false;
    wasMaximizedBeforeMin = false;
    panelWidth = 580;
    panelHeight = 553;
    resetModeForOpen();
    requestAnimationFrame(() => {
      centerPanel();
      dragInitialized = true;
    });
  }

  function hidePanel() {
    isMinimized = false;
    isMaximized = false;
    wasMaximizedBeforeMin = false;
    pointerState = null;
    onclose();
  }

  function restorePanel() {
    isMinimized = false;
    if (wasMaximizedBeforeMin) {
      const wrapper = wrapperElement();
      if (wrapper) {
        const bounds = wrapper.getBoundingClientRect();
        panelWidth = wrapper.offsetWidth;
        panelHeight = wrapper.offsetHeight;
        panelTop = bounds.top;
        panelLeft = bounds.left;
        isMaximized = true;
      }
    }
    wasMaximizedBeforeMin = false;
  }

  function toggleMinimize() {
    isMinimized = !isMinimized;
    if (isMinimized) {
      wasMaximizedBeforeMin = isMaximized;
      pointerState = null;
      onminimize();
    } else {
      restorePanel();
    }
  }

  function toggleMaximize() {
    if (isMaximized) {
      panelWidth = preMaxBounds.width;
      panelHeight = preMaxBounds.height;
      panelTop = preMaxBounds.top;
      panelLeft = preMaxBounds.left;
      isMaximized = false;
      return;
    }

    preMaxBounds = {
      width: panelWidth,
      height: panelHeight,
      top: panelTop,
      left: panelLeft
    };
    if (isMinimized) isMinimized = false;
    const wrapper = wrapperElement();
    if (!wrapper) return;
    const bounds = wrapper.getBoundingClientRect();
    panelWidth = wrapper.offsetWidth;
    panelHeight = wrapper.offsetHeight;
    panelTop = bounds.top;
    panelLeft = bounds.left;
    isMaximized = true;
  }

  function closePanel() {
    if (mode !== 'setup' && activePoll?.senderId === currentUser.id) {
      onconfirm(POLL_CLOSE_CONFIRMATION, () => {
        void (async () => {
          if (await onend()) hidePanel();
        })();
      });
      return;
    }
    hidePanel();
  }

  function addChoice() {
    const nextChoices = addPollChoice(pollChoices, pollChoice);
    if (nextChoices.length === pollChoices.length) return;
    pollChoices = nextChoices;
    pollChoice = '';
  }

  function delChoice(index: number) {
    pollChoices = deletePollChoice(pollChoices, index);
  }

  async function savePollToStorage() {
    if (await onsave(pollQuestion, [...pollChoices])) onalert(POLL_SAVED_ALERT);
  }

  function deleteSavedPoll(poll: SavedPoll) {
    onconfirm(pollDeleteConfirmation(poll.q), () => {
      void ondelete(poll.id);
    });
  }

  function loadSavedPoll(poll: SavedPoll) {
    pollChoices = [...poll.choices];
    pollQuestion = poll.q;
    pollTab = 'new';
  }

  function sendPoll() {
    onconfirm(POLL_SEND_CONFIRMATION, () => {
      void (async () => {
        if (await onsend(pollQuestion, [...pollChoices])) mode = 'results';
      })();
    });
  }

  /**
   * POLL-02 — the one call in this panel that threw away the verdict it was handed.
   *
   * `RoomModals.#mutate` catches, logs and returns `false` precisely so a panel does not claim a
   * success that did not happen — its own docblock and `polls.remote.ts` both say so in those
   * words. Every sibling here consumes it: `savePollToStorage`, `sendPoll`, `postResults` and
   * `closePanel` all act only on a `true`. This one awaited the promise and dropped the boolean, so
   * a member whose vote the server refused was marked answered, moved to `done` and had the panel
   * shut, with the reason only in their own console. Argued as POLL-02 in
   * `docs/decoded/room-surface-audit-2026-08-30.md`.
   *
   * `answered` is still raised BEFORE the await — that is the reference's own double-click guard
   * (`this.answered || (this.answered = !0, …)`, byte 2,110,624) — and lowered again on a refusal,
   * which leaves the reader in front of the buttons that did not take. No alert: the reference
   * sends over a socket and can never reach this branch, so any wording would be invented. Refusing
   * to claim a vote that did not happen is not.
   */
  async function sendAnswer(index: number) {
    if (answered) {
      hidePanel();
      return;
    }
    answered = true;
    if (!(await onanswer(index))) {
      answered = false;
      return;
    }
    mode = 'done';
    hidePanel();
  }

  async function postResults() {
    const posted = await onpostresults(
      formatPollResults(pollQuestion, pollChoices, totals, total)
    );
    if (posted) closePanel();
  }

  /**
   * The capture's full cancel list, not just its last entry:
   *
   *   cancel: "input, textarea, button, select, .poll-panel-controls"
   *
   * Only `.poll-panel-controls` was checked here, so dragging from a poll's own answer field,
   * textarea, button or select picked the whole panel up instead of letting the reader use it.
   */
  const DRAG_CANCEL = 'input, textarea, button, select, .poll-panel-controls';

  function beginDrag(event: PointerEvent) {
    if ((event.target as HTMLElement).closest(DRAG_CANCEL) || isMaximized) return;
    pointerState = {
      kind: 'drag',
      startX: event.clientX,
      startY: event.clientY,
      left: panelLeft,
      top: panelTop
    };
    event.preventDefault();
  }

  function beginResize(event: PointerEvent, direction: ResizeDirection) {
    if (isMaximized) return;
    pointerState = {
      kind: 'resize',
      direction,
      startX: event.clientX,
      startY: event.clientY,
      left: panelLeft,
      top: panelTop,
      width: panelWidth,
      height: panelHeight
    };
    event.preventDefault();
    event.stopPropagation();
  }

  function pointerBounds() {
    const wrapper = wrapperElement();
    if (!wrapper) {
      return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    }
    const bounds = wrapper.getBoundingClientRect();
    return {
      left: bounds.left,
      top: bounds.top,
      width: wrapper.offsetWidth,
      height: wrapper.offsetHeight
    };
  }

  function movePointer(event: PointerEvent) {
    if (!pointerState) return;
    const bounds = pointerBounds();
    const dx = event.clientX - pointerState.startX;
    const dy = event.clientY - pointerState.startY;

    if (pointerState.kind === 'drag') {
      /*
        `poll-07` — `snap: !0`, byte 2,108,197, and the reason it goes through `clampAndSnap` rather
        than being written out here.

        The clamp was already `containment: ".wrapper"`; what was missing was the snap. Every other
        floating panel in this room got it from `panel-drag.ts` — the private chat and the webcam
        holders both do — and this one is the outlier that rolls its own pointer handling for its
        maximise and minimise states. Sharing the FUNCTION rather than copying its four lines is what
        keeps the tolerance one number: `SNAP_TOLERANCE`, jQuery UI's own 20px.

        What is reproduced is snapping to the CONTAINMENT edges. jQuery UI's `snap: true` also snaps
        to every other snappable element, which needs a registry this application does not have —
        `panel-drag.ts` records that gap once, for all four panels, rather than four times.
      */
      panelLeft = clampAndSnap(
        pointerState.left + dx,
        bounds.left,
        bounds.left + bounds.width - panelWidth,
        true
      );
      panelTop = clampAndSnap(
        pointerState.top + dy,
        bounds.top,
        bounds.top + bounds.height - panelHeight,
        true
      );
      return;
    }

    const direction = pointerState.direction;
    const resizeEast = direction.includes('e');
    const resizeWest = direction.includes('w');
    const resizeSouth = direction.includes('s');
    const resizeNorth = direction.includes('n');
    const minWidth = Math.min(580, bounds.width);
    const minHeight = Math.min(553, bounds.height);
    let nextLeft = pointerState.left;
    let nextTop = pointerState.top;
    let nextWidth = pointerState.width;
    let nextHeight = pointerState.height;

    if (resizeEast) nextWidth = pointerState.width + dx;
    if (resizeSouth) nextHeight = pointerState.height + dy;
    if (resizeWest) {
      nextWidth = pointerState.width - dx;
      nextLeft = pointerState.left + dx;
    }
    if (resizeNorth) {
      nextHeight = pointerState.height - dy;
      nextTop = pointerState.top + dy;
    }

    nextWidth = Math.min(bounds.width, Math.max(minWidth, nextWidth));
    nextHeight = Math.min(bounds.height, Math.max(minHeight, nextHeight));
    if (resizeWest) nextLeft = pointerState.left + pointerState.width - nextWidth;
    if (resizeNorth) nextTop = pointerState.top + pointerState.height - nextHeight;
    nextLeft = Math.min(bounds.left + bounds.width - nextWidth, Math.max(bounds.left, nextLeft));
    nextTop = Math.min(bounds.top + bounds.height - nextHeight, Math.max(bounds.top, nextTop));

    panelLeft = nextLeft;
    panelTop = nextTop;
    panelWidth = nextWidth;
    panelHeight = nextHeight;
  }

  function endPointer() {
    pointerState = null;
  }

  function drawPieChart() {
    if (!chartCanvas || mode !== 'results' || total === 0) return;
    const context = chartCanvas.getContext('2d');
    const parent = chartCanvas.parentElement;
    if (!context || !parent) return;

    const width = parent.clientWidth;
    const height = parent.clientHeight;
    chartBox = { width, height };
    const ratio = window.devicePixelRatio || 1;
    chartCanvas.width = Math.round(width * ratio);
    chartCanvas.height = Math.round(height * ratio);
    chartCanvas.style.width = `${width}px`;
    chartCanvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const colors = ['#edc240', '#afd8f8', '#cb4b4b', '#4da74d', '#9440ed'];
    const radius = pieRadius(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    let angle = -Math.PI / 2;

    for (const [index, datum] of pieData.entries()) {
      const slice = (datum.data / 100) * Math.PI * 2;
      if (slice <= 0) continue;
      context.beginPath();
      context.moveTo(centerX, centerY);
      context.arc(centerX, centerY, radius, angle, angle + slice);
      context.closePath();
      context.fillStyle = colors[index % colors.length];
      context.fill();
      angle += slice;
    }
  }

  /**
   * `label: { show: !0, radius: .8, … }` — byte 2,104,707.
   *
   * In flot a pie label radius at or below 1 is a FRACTION OF THE PIE'S RADIUS, so the labels ring
   * the pie at a constant distance in both axes. This used to be 32% of the container box in each
   * axis, which is an ellipse on a box that is 100% wide and 300px tall — labels drifting outside
   * the pie on the left and right and sitting inside it top and bottom.
   *
   * The radius is `PIE_RADIUS` below, the same expression `drawPieChart` uses to draw the pie, and
   * the two read one function so they cannot drift apart.
   */
  function labelStyle(index: number) {
    const priorPercentage = pieData
      .slice(0, index)
      .reduce((sum, datum) => sum + datum.data, 0);
    const centerPercentage = priorPercentage + pieData[index].data / 2;
    const angle = -Math.PI / 2 + (centerPercentage / 100) * Math.PI * 2;
    const distance = pieRadius(chartBox.width, chartBox.height) * PIE_LABEL_RADIUS;
    const left = chartBox.width / 2 + Math.cos(angle) * distance;
    const top = chartBox.height / 2 + Math.sin(angle) * distance;
    return `position: absolute; left: ${left}px; top: ${top}px; transform: translate(-50%, -50%); background: rgba(34, 34, 34, 0.8); font-size: 12px; text-align: center; padding: 2px; color: white;`;
  }

  $effect(() => {
    const element = hostElement;
    if (!element) return;
    element.setAttribute('style', panelStyle);
    element.classList.toggle('ui-draggable', dragInitialized);
    element.classList.toggle('ui-resizable', dragInitialized);
  });

  $effect(() => {
    const nextOpen = open;
    const nextRestoreToken = restoreToken;
    if (nextOpen && !priorOpen) {
      if (isMinimized && nextRestoreToken !== priorRestoreToken) restorePanel();
      else showPanel();
    }
    priorOpen = nextOpen;
    priorRestoreToken = nextRestoreToken;
  });

  $effect(() => {
    /*
      Three bare reads, and they are the DEPENDENCY LIST — not leftovers.

      `drawPieChart` paints to a canvas, so nothing in this effect's body touches `panelWidth`,
      `panelHeight` or `pieData` through the template. Without reading them here the effect would
      never re-run when the panel is resized or a vote arrives, and the chart would freeze at
      whatever it drew first.

      ESLint reads a bare identifier as a statement with no effect, which is true of the expression
      and false of the program: in runes mode the read IS the subscription.
    */
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    panelWidth;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    panelHeight;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    pieData;
    if (!open || total === 0 || mode !== 'results') return;
    const frame = requestAnimationFrame(drawPieChart);
    return () => cancelAnimationFrame(frame);
  });
</script>

<svelte:window onpointermove={movePointer} onpointerup={endPointer} onpointercancel={endPointer} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  id="pollPanelTitlebar"
  class={['poll-panel-titlebar', { 'ui-draggable-handle': dragInitialized }]}
  onpointerdown={beginDrag}
>
  <span class="poll-panel-title">Polls</span>
  <div class="poll-panel-controls">
    <button type="button" title="Minimize" class="poll-panel-btn" onclick={toggleMinimize}>
      <i class="fa fa-window-minimize"></i>
    </button>
    <button type="button" title="Maximize" class="poll-panel-btn" onclick={toggleMaximize}>
      <i class={isMaximized ? 'fa fa-window-restore' : 'fa fa-window-maximize'}></i>
    </button>
    <button
      type="button"
      aria-label="Close"
      title="Close"
      class="poll-panel-btn poll-panel-btn-close"
      onclick={closePanel}
    >
      <i class="fa fa-times"></i>
    </button>
  </div>
</div>
<div class="poll-panel-body" style="display: block;">
  {#if mode === 'setup'}
    <div class="row">
        <ul id="nav-tab" role="tablist" class="nav nav-tabs">
          <li role="presentation" class="nav-item">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <a
              id="sendpolltab"
              aria-controls="sendpoll"
              data-bs-target="#sendpoll"
              role="tab"
              data-bs-toggle="tab"
              aria-selected={pollTab === 'new'}
              tabindex={pollTab === 'new' ? undefined : -1}
              class={['nav-link', { active: pollTab === 'new' }]}
              onclick={() => (pollTab = 'new')}
            >
              Create New Poll
            </a>
          </li>
          <li role="presentation" class="nav-item">
            <a
              {...{ 'ria-controls': 'savedPolls' } as Record<string, string>}
              role="tab"
              data-bs-target="#savedPolls"
              data-bs-toggle="tab"
              aria-selected={pollTab === 'saved'}
              tabindex={pollTab === 'saved' ? undefined : -1}
              class={['nav-link', { active: pollTab === 'saved' }]}
              onclick={() => (pollTab = 'saved')}
            >
              Pre-Canned Polls
            </a>
          </li>
        </ul>
        <div class="tab-content w-100 p-2">
          <div
            role="tabpanel"
            id="sendpoll"
            aria-labelledby="sendpolltab"
            class={['tab-pane', { active: pollTab === 'new', show: pollTab === 'new' }]}
          >
            <div class="p-2">
              <h3><span class="label label-warning">1</span> Enter your poll question:</h3>
              <input
                type="text"
                id="pollQuestionTxt"
                placeholder="Main poll question (i.e. Where do you think the market is going?)"
                class="form-control"
                bind:value={pollQuestion}
              />
              <hr />
              <h3><span class="label label-warning">2</span> Add Choices/Answers:</h3>
              <div class="input-group">
                <input
                  type="text"
                  id="pollChoiceTxt"
                  placeholder="Enter a choice (i.e. Up, Down, Sideways)"
                  class="form-control"
                  bind:value={pollChoice}
                  onkeyup={(event) => {
                    /*
                      `poll-08` — `"keyup.enter"` in const table entry for this input, byte
                      2,113,811. It was `onkeydown`, and the difference is not one frame: holding
                      Enter down repeats `keydown` and added a choice per repeat, where the reference
                      commits once, on release.
                    */
                    if (event.key === 'Enter') addChoice();
                  }}
                />
                <span class="input-group-btn">
                  <button type="button" class="btn btn-outline-light" onclick={addChoice}>
                    <i aria-hidden="true" class="fa fa-plus-circle"></i>&nbsp;&nbsp;Add Choice
                  </button>
                </span>
              </div>
              <ol>
                <!--
                  KEYED BY INDEX, and here that satisfies the rule rather than breaking it.

                  Svelte's best-practices page says *"the key must uniquely identify the object"* and
                  warns against the index. In this component the index IS what uniquely identifies a
                  choice, because position is the choice's identity on the WIRE and in every array
                  paired with it:

                    onanswer(index)   — the vote sent to the server is the index
                    totals[index]     — the result count for that choice
                    calculatePollSeries(pollChoices, totals, total)  — paired by position

                  So a synthetic id would not make this safer; it would introduce a SECOND identity
                  that has to be kept in step with the one the server already uses, and the failure
                  mode of that drifting is a vote recorded against the wrong choice.

                  `each-key-contract.test.ts` allows exactly these two blocks and fails on any new
                  index key elsewhere.
                -->
                {#each pollChoices as choice, index (index)}
                  <li>
                    {choice}
                    <button
                      type="button"
                      class="btn btn-link pull-right btn-default"
                      onclick={() => delChoice(index)}
                      ><i aria-hidden="true" class="fa fa-minus-circle"></i>&nbsp;Del</button
                    ><br {...{ clear: 'both' } as Record<string, string>} />
                  </li>
                {/each}
              </ol>
              <hr />
              <h3>
                <span class="label label-warning">3</span> When done editing, Send your poll
              </h3>
              <div class="anonymous-poll-container">
                <input
                  type="checkbox"
                  name="anonymous-poll"
                  id="anonymous-poll"
                  title="Anonymous Poll"
                  class="form-check-input"
                  bind:checked={anonymousPoll}
                />
                <label for="anonymous-poll" class="form-check-label">
                  Anonymous Poll (Does not show the voting name/email, just results)
                </label>
              </div>
              <div class="poll-panel-footer">
                <button
                  type="button"
                  class="btn btn-outline-light pull-right"
                  style="text-align: center;"
                  onclick={savePollToStorage}
                >
                  <i aria-hidden="true" class="fa fa-floppy-o"></i>&nbsp;Save To Canned
                </button>
                <button
                  type="button"
                  class="btn btn-success centered float-right"
                  style="text-align: center;"
                  onclick={sendPoll}
                >
                  Send Poll
                </button>
              </div>
            </div>
          </div>
          <div
            role="tabpanel"
            id="savedPolls"
            class={['tab-pane', { active: pollTab === 'saved', show: pollTab === 'saved' }]}
          >
            <PollSavedList {savedPolls} ondelete={deleteSavedPoll} onload={loadSavedPoll} />
          </div>
        </div>
    </div>
  {:else if mode === 'answer'}
    <div class="row">
        <div class="p-2" style="text-align: center;">
          <h1>{pollQuestion}</h1>
          <hr />
          <ol style="text-align: left;">
            <!-- Index-keyed for the same reason as the edit list above: `onanswer(index)` IS the vote. -->
            {#each pollChoices as choice, index (index)}
              <li class="p-2">
                {choice}
                <button
                  type="button"
                  class="btn btn-primary float-right btn-sm"
                  style="color: white;"
                  onclick={() => sendAnswer(index)}
                >
                  &nbsp;Choose
                </button>
                <br {...{ clear: 'both' } as Record<string, string>} />
              </li>
            {/each}
          </ol>
        </div>
    </div>
  {:else if mode === 'results'}
    <div class="row w-100" style="text-align: center;">
        <div class="p-2 w-100" style="text-align: center;">
          <h2>{pollQuestion}</h2>
          <p>Total Responses: {total}</p>
          {#if total === 0}
            <img src="/assets/images/ajax-loader.gif" alt="" width="32" height="32" />
            <p style="margin: 10px; text-align: center;">
              Waiting for results to come in...Please Wait...
            </p>
          {/if}
          <div
            id="pollPieChart"
            style="display: {total > 0 ? 'block' : 'none'}; width: 100%; height: 300px; text-align: center; position: relative;"
          >
            <canvas bind:this={chartCanvas} style="position: absolute; inset: 0;"></canvas>
            <!--
              POLL-01 — this was keyed `(datum.label)`, the choice TEXT, and nothing dedupes a
              choice: `addChoice()` is a bare push upstream (byte 2,110,392) and `addPollChoice` is
              the same here. So a poll offering "Up" twice produced two identical keys, and Svelte
              answers a duplicate key by THROWING — `if (length > keys.size) e.each_key_duplicate(…)`
              at `svelte/src/internal/client/dom/blocks/each.js:355-362`, outside the `DEV` guard, so
              in production too. `pieData` is `choices.map(...)`, so the panel died on Send rather
              than on the first vote. Measured and argued as POLL-01 in
              `docs/decoded/room-surface-audit-2026-08-30.md`.

              Keyed by INDEX now, which here satisfies the rule rather than breaking it, for the
              reason the two sibling blocks above already carry and `each-key-contract.test.ts`
              allows this file by name: position IS a choice's identity — `onanswer(index)` is the
              vote and `totals[index]` is its tally. `datum.label` was a label that is usually
              unique, which is not the same thing.
            -->
            {#each pieData as datum, index (index)}
              {#if datum.data > 0}
                <div class="flot-pie-label" style={labelStyle(index)}>
                  {datum.label} : {Math.round(datum.data)}%
                </div>
              {/if}
            {/each}
          </div>
          {#if !anonymousPoll}
            <hr />
            <textarea
              id="responsesTxt"
              rows="10"
              maxlength="500"
              readonly
              class="form-control"
              style="width: 100%;"
              value={visibleResponses}></textarea>
            <hr />
          {/if}
          {#if total > 0}
            <button
              type="button"
              class="btn btn-warning float-left"
              style="text-align: center;"
              onclick={postResults}
            >
              Post Results
            </button>
          {/if}
        </div>
    </div>
  {/if}
</div>
{#if dragInitialized}
  <!--
    The eight handles as an `{#each}` over `RESIZE_HANDLES`, because that list IS the reference's
    `handles: "n, e, s, w, ne, se, sw, nw"` and this markup is what jQuery UI generates from it
    rather than a shape chosen here. The `se` extras are the plugin's own — it draws a visible grip
    only on that corner — and are a per-direction value so the difference cannot be read as a copy.
    Keyed by DIRECTION, which is the identity these eight have and an index is not.
  -->
  {#each RESIZE_HANDLES as direction (direction)}
    {const extra = $derived(direction === 'se' ? ' ui-icon ui-icon-gripsmall-diagonal-se' : '')}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      class="ui-resizable-handle ui-resizable-{direction}{extra}"
      style={direction === 'se' ? 'z-index: 90; display: block;' : 'z-index: 90;'}
      onpointerdown={(event) => beginResize(event, direction)}
    ></div>
  {/each}
{/if}
