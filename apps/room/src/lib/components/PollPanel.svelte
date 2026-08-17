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
  import type { ActivePoll, SavedPoll } from '#lib/types.js';

  type PollMode = 'setup' | 'answer' | 'results' | 'done';
  type PollTab = 'new' | 'saved';
  type OpenMode = 'setup' | 'auto';
  type ResizeDirection = 'n' | 'e' | 's' | 'w' | 'ne' | 'se' | 'sw' | 'nw';

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

  let mode = $state<PollMode>('setup');
  let pollTab = $state<PollTab>('new');
  let pollQuestion = $state('');
  let pollChoice = $state('');
  let pollChoices = $state<string[]>([]);
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

  async function sendAnswer(index: number) {
    if (!answered) {
      answered = true;
      await onanswer(index);
      mode = 'done';
    }
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
      panelLeft = Math.min(
        bounds.left + bounds.width - panelWidth,
        Math.max(bounds.left, pointerState.left + dx)
      );
      panelTop = Math.min(
        bounds.top + bounds.height - panelHeight,
        Math.max(bounds.top, pointerState.top + dy)
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
    const ratio = window.devicePixelRatio || 1;
    chartCanvas.width = Math.round(width * ratio);
    chartCanvas.height = Math.round(height * ratio);
    chartCanvas.style.width = `${width}px`;
    chartCanvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const colors = ['#edc240', '#afd8f8', '#cb4b4b', '#4da74d', '#9440ed'];
    const radius = Math.max(0, Math.min(width, height) / 2 - 10);
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

  function labelStyle(index: number) {
    const priorPercentage = pieData
      .slice(0, index)
      .reduce((sum, datum) => sum + datum.data, 0);
    const centerPercentage = priorPercentage + pieData[index].data / 2;
    const angle = -Math.PI / 2 + (centerPercentage / 100) * Math.PI * 2;
    const left = 50 + Math.cos(angle) * 32;
    const top = 50 + Math.sin(angle) * 32;
    return `position: absolute; left: ${left}%; top: ${top}%; transform: translate(-50%, -50%); background: rgba(34, 34, 34, 0.8); font-size: 12px; text-align: center; padding: 2px; color: white;`;
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
                  onkeydown={(event) => {
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
            <p>
              You can store polls you use often here. Just type the poll on the create poll tab
              and press "save"
            </p>
            <ul class="list-group">
              {#each savedPolls as poll (poll.id)}
                <li class="list-group-item">
                  {poll.q}
                  <div class="float-right">
                    <button
                      type="button"
                      class="btn btn-default btn-sm mr-2"
                      onclick={() => deleteSavedPoll(poll)}
                    >
                      <i class="fas fa-trash"></i> Delete
                    </button>
                    <button
                      type="button"
                      class="btn btn-primary btn-sm"
                      onclick={() => loadSavedPoll(poll)}
                    >
                      Load
                    </button>
                  </div>
                </li>
              {/each}
            </ul>
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
            <img src="/assets/images/ajax-loader.gif" alt="" />
            <p style="margin: 10px; text-align: center;">
              Waiting for results to come in...Please Wait...
            </p>
          {/if}
          <div
            id="pollPieChart"
            style="display: {total > 0 ? 'block' : 'none'}; width: 100%; height: 300px; text-align: center; position: relative;"
          >
            <canvas bind:this={chartCanvas} style="position: absolute; inset: 0;"></canvas>
            {#each pieData as datum, index (datum.label)}
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
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
      class="ui-resizable-handle ui-resizable-n"
      style="z-index: 90;"
      onpointerdown={(event) => beginResize(event, 'n')}
  ></div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
      class="ui-resizable-handle ui-resizable-e"
      style="z-index: 90;"
      onpointerdown={(event) => beginResize(event, 'e')}
  ></div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
      class="ui-resizable-handle ui-resizable-s"
      style="z-index: 90;"
      onpointerdown={(event) => beginResize(event, 's')}
  ></div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
      class="ui-resizable-handle ui-resizable-w"
      style="z-index: 90;"
      onpointerdown={(event) => beginResize(event, 'w')}
  ></div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
      class="ui-resizable-handle ui-resizable-ne"
      style="z-index: 90;"
      onpointerdown={(event) => beginResize(event, 'ne')}
  ></div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
      class="ui-resizable-handle ui-resizable-se ui-icon ui-icon-gripsmall-diagonal-se"
      style="z-index: 90; display: block;"
      onpointerdown={(event) => beginResize(event, 'se')}
  ></div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
      class="ui-resizable-handle ui-resizable-sw"
      style="z-index: 90;"
      onpointerdown={(event) => beginResize(event, 'sw')}
  ></div>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
      class="ui-resizable-handle ui-resizable-nw"
      style="z-index: 90;"
      onpointerdown={(event) => beginResize(event, 'nw')}
  ></div>
{/if}
