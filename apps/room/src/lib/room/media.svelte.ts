/*
  The room's media STATE — every flag the interface renders from, and nothing that holds a handle.

  ## The boundary, which is the whole design of this class

  The media code in `+page.svelte` is two things wearing one name. There is TRANSPORT — `MediaStream`,
  `MediaRecorder`, producer ids, the chunk array, the preview `Window` — and there is STATE, the
  dozen-odd flags a template reads to decide what a button says. The first group is imperative,
  browser-owned, and already correctly declared as plain `let`s because nothing renders from a
  handle. The second group is what this class takes.

  Drawing the line there rather than "everything media" is deliberate. A class that owned a
  `MediaRecorder` would have to own its lifecycle, its error paths and its `ondataavailable`, and the
  room would have gained an abstraction over the browser rather than an owner for its state.

  ## Two fields that were promised to this class by name

  `talkingUsers` and `isLimitedPresenter` were both filed under `RoomRoster` in the phase plan and
  both refused there, with the reason recorded in `roster.svelte.ts`. They arrive here because this
  is where their WRITERS are:

  - **`talkingUsers`** is driven by SFU audio-producer announcements. "Talking" in the capture means
    A MICROPHONE IS OPEN, not that anyone is making noise: the room socket pushes `startTalking` /
    `stopTalking` and the client only ever sends those on `presUnmuted` / `presMuted`. There is no
    level detection anywhere in the bundle.
  - **`isLimitedPresenter`** is what a member BECOMES when a presenter hands them mic and screen —
    `globals.user.isPresenter = globals.isLimitedPresenter = globals.isPresenter = e.give`, one
    statement, on a media command.

  Choosing the wrong owner for the convenience of one reader is a decision you then have to explain
  forever, so both waited for the class whose writer they belong to.
*/

/** One entry of `mediaService.talkingUsers`, as the capture shapes it. */
export interface TalkingUser {
  readonly userID: number;
  readonly mediaValue: { readonly name: string };
}

export class RoomMedia {
  /** Mirrors the capture's `isMediaConnected`. */
  #connected = $state(false);

  /**
   * `$state.raw` rather than `$state`: the array is REPLACED on every grant, never mutated, so a
   * deep proxy over a list of ICE servers would cost a proxy read per field and buy nothing.
   *
   * Empty means "not connected yet" and says so, rather than pretending.
   */
  #iceServers = $state.raw<RTCIceServer[]>([]);

  /*
    Muted is the DEFAULT for both, and it is the safe direction rather than a preference: a room
    that opened with a live microphone would be broadcasting before the viewer had looked at the
    screen. The two `Launching` flags are the gap between asking the browser for a device and
    getting one, which is where a second click would otherwise start a second acquisition.
  */
  #micMuted = $state(true);
  #micLaunching = $state(false);
  #camMuted = $state(true);
  #camLaunching = $state(false);
  #screenSharing = $state(false);

  /**
   * Every peer whose microphone is currently OPEN, keyed by nothing — it is a list, as upstream
   * keeps it.
   *
   * `$state.raw`, and the writers below replace it. That is a change from the page, where
   * `startTalking` did `talkingUsers.push(...)` on a deep-proxied array: the list is rendered by an
   * each block and never mutated field-by-field, so the proxy was paying for granularity nobody
   * reads. Replacing is also what `stopTalking` already did, so the two writers now agree.
   *
   * (An each block, described rather than quoted. This repository forbids template syntax inside a
   * comment: it is prose to a human and an unclosed block to any parser reading the file, and it
   * has already shipped once with `svelte-check` green and a contract test red.)
   */
  #talking = $state.raw<TalkingUser[]>([]);

  /*
    THIS ROOM's recording, and the ROOM's — two different things that the interface shows together.

    The first three are this browser's own `MediaRecorder` session. The last four are what the room
    reports over the command channel, which is what a member sees when somebody ELSE is recording.
    Collapsing them would mean a member's own idle recorder hid the presenter's live one.

    The last four are `globals.roomState.isRecording` / `isRecordingPaused` / `recName` in the
    capture, and the distinction is not academic — it is a FIXED DEFECT. The `[ REC ]` badge is a
    report about the room, so it must follow what the server says; it was gated on the local flag,
    which is why a member never saw it while a presenter was recording. That sentence arrived here
    on 2026-08-17 from a docblock stranded on `+page.svelte` when these fields moved: the fields
    travelled and their reason did not, so for a while the only record of the defect sat above an
    unrelated declaration. `orphaned-comment-contract.test.ts` is what found it.
  */
  #recording = $state(false);
  #recordingPaused = $state(false);
  #recordingReminder = $state(false);

  #roomRecordingStarting = $state(false);
  #roomRecording = $state(false);
  #roomRecordingPaused = $state(false);
  #roomRecordingName = $state('');

  /**
   * `this.recPreviewOpen = !1` in the capture's globals.
   *
   * Ours defaulted to TRUE, so the menu opened saying "Hide Rec Preview" with nothing shown.
   */
  #recPreviewOpen = $state(false);
  #recordedUrl = $state('');
  /** Whether the last recording actually captured the microphone, so the interface can say so. */
  #recordedHasAudio = $state(false);

  #soundCloudUrl = $state('');
  #soundCloudPlaying = $state(false);

  /**
   * `globals.isLimitedPresenter` — runtime state, not a stored flag.
   *
   * It was a column on `users`, which was inventing durable state for something the capture treats
   * as transient. Nothing in the controller stores it either. False on arrival, every time.
   */
  #limitedPresenter = $state(false);

  /**
   * Whether anyone in the room currently has their microphone open.
   *
   * DERIVED, not stored. It used to be a `$state` flag flipped only inside a listener for a `window`
   * event named `'presenterTalking'` that nothing in this codebase ever dispatched, so it was
   * permanently false — the "someone is speaking" block could never render, and " ( No one is
   * speaking )" stayed on screen with the microphone on.
   *
   * "Talking" here means unmuted, not making sound. That is what the capture sends:
   *
   *   guiEventBus.subscribe("presUnmuted", e => sendServerAdminCommand("startTalking", {…}))
   *   guiEventBus.subscribe("presMuted",   e => sendServerAdminCommand("stopTalking",  {…}))
   *
   * so the list changes on mute and unmute, and the indicator holds for as long as a microphone is
   * open. Pausing between sentences must not flip it back.
   */
  #anyoneTalking = $derived(this.#talking.length > 0);

  get connected(): boolean {
    return this.#connected;
  }

  set connected(on: boolean) {
    this.#connected = on;
  }

  /**
   * The ICE servers THIS deployment minted, hoisted out of `onMount` so the connectivity test can
   * see them (`TODO.md` item N).
   *
   * They were a `let` inside `onMount`, reachable only by the media session. The consequence was a
   * diagnostic that tested somebody else's infrastructure: the modal fell back to Google's public
   * STUN, so a green tick said nothing about whether `media.tradingroom.app` is reachable, and a red
   * one blamed the user's firewall for a server we do not run.
   *
   * `$state.raw` rather than `$state`: the array is REPLACED on every grant, never mutated, so deep
   * proxying would cost something and buy nothing.
   *
   * Empty until the first grant is minted, which happens when the socket opens. The modal treats
   * empty as "not connected yet" and says so rather than pretending.
   */
  get iceServers(): RTCIceServer[] {
    return this.#iceServers;
  }

  set iceServers(next: RTCIceServer[]) {
    this.#iceServers = next;
  }

  get micMuted(): boolean {
    return this.#micMuted;
  }

  set micMuted(muted: boolean) {
    this.#micMuted = muted;
  }

  get micLaunching(): boolean {
    return this.#micLaunching;
  }

  set micLaunching(launching: boolean) {
    this.#micLaunching = launching;
  }

  get camMuted(): boolean {
    return this.#camMuted;
  }

  set camMuted(muted: boolean) {
    this.#camMuted = muted;
  }

  get camLaunching(): boolean {
    return this.#camLaunching;
  }

  set camLaunching(launching: boolean) {
    this.#camLaunching = launching;
  }

  get screenSharing(): boolean {
    return this.#screenSharing;
  }

  set screenSharing(sharing: boolean) {
    this.#screenSharing = sharing;
  }

  get talking(): TalkingUser[] {
    return this.#talking;
  }

  get anyoneTalking(): boolean {
    return this.#anyoneTalking;
  }

  get recording(): boolean {
    return this.#recording;
  }

  set recording(on: boolean) {
    this.#recording = on;
  }

  get recordingPaused(): boolean {
    return this.#recordingPaused;
  }

  set recordingPaused(paused: boolean) {
    this.#recordingPaused = paused;
  }

  get recordingReminder(): boolean {
    return this.#recordingReminder;
  }

  set recordingReminder(on: boolean) {
    this.#recordingReminder = on;
  }

  get roomRecordingStarting(): boolean {
    return this.#roomRecordingStarting;
  }

  set roomRecordingStarting(on: boolean) {
    this.#roomRecordingStarting = on;
  }

  get roomRecording(): boolean {
    return this.#roomRecording;
  }

  get roomRecordingPaused(): boolean {
    return this.#roomRecordingPaused;
  }

  get roomRecordingName(): string {
    return this.#roomRecordingName;
  }

  get recPreviewOpen(): boolean {
    return this.#recPreviewOpen;
  }

  set recPreviewOpen(open: boolean) {
    this.#recPreviewOpen = open;
  }

  get recordedUrl(): string {
    return this.#recordedUrl;
  }

  set recordedUrl(url: string) {
    this.#recordedUrl = url;
  }

  get recordedHasAudio(): boolean {
    return this.#recordedHasAudio;
  }

  set recordedHasAudio(hasAudio: boolean) {
    this.#recordedHasAudio = hasAudio;
  }

  get soundCloudUrl(): string {
    return this.#soundCloudUrl;
  }

  set soundCloudUrl(url: string) {
    this.#soundCloudUrl = url;
  }

  get soundCloudPlaying(): boolean {
    return this.#soundCloudPlaying;
  }

  set soundCloudPlaying(playing: boolean) {
    this.#soundCloudPlaying = playing;
  }

  get limitedPresenter(): boolean {
    return this.#limitedPresenter;
  }

  /**
   * `giveMicScreen` arriving.
   *
   * One statement upstream — `globals.user.isPresenter = globals.isLimitedPresenter =
   * globals.isPresenter = e.give` — so a member GAINS limited-presenter status when granted and
   * loses it when it is taken away, and there is no third state to get stuck in.
   */
  micScreenGranted(granted: boolean): void {
    this.#limitedPresenter = granted;
  }

  /**
   * A peer's microphone opened.
   *
   * De-duplicated by user id: the same person can have two producers announced — a re-negotiation,
   * or a second tab — and the indicator lists people, not producers. Without this the same name
   * appears twice in " ( X is speaking )".
   */
  startTalking(user: TalkingUser): void {
    if (this.#talking.some((current) => current.userID === user.userID)) return;
    this.#talking = [...this.#talking, user];
  }

  stopTalking(userID: number): void {
    this.#talking = this.#talking.filter((user) => user.userID !== userID);
  }

  /*
    The ROOM's recording, as the command channel reports it — four transitions, matching the
    capture's four subscriptions rather than one bundled setter:

      subscribe("startRec",  e => { roomState.isRecording = !0; roomState.recName = e.recName })
      subscribe("stopRec",   () => { roomState.isRecording = !1 })
      subscribe("pauseRec",  () => { roomState.isRecordingPaused = !0 })
      subscribe("resumeRec", () => { roomState.isRecordingPaused = !1 })

    Pause and resume touch ONE field, which is why they are their own methods: a single
    `roomRecordingChanged({recording, paused, name})` would force every caller to restate the two
    values it is not changing, and a pause frame that restated a stale `recName` would blank the
    tooltip mid-recording.
  */

  /**
   * The presenter asked the room to record, and the room has not answered yet.
   *
   * `recIndicatorStart` — the spinner-plus-REC indicator, consts 92/93/94 of the navbar. It was
   * RENDERED here and nothing ever set the flag, so the branch was unreachable and the presenter
   * saw no feedback at all between pressing record and the room confirming. Found by reading every
   * use of the field during this extraction: one declaration, one template branch, no writer.
   */
  roomRecordingRequested(): void {
    this.#roomRecordingStarting = true;
  }

  /**
   * The request failed, so the spinner must stop.
   *
   * Without this the indicator spins for the rest of the session on a refused or dropped command,
   * which reads as "still starting" forever — worse than no feedback, because it is wrong feedback.
   */
  roomRecordingRequestFailed(): void {
    this.#roomRecordingStarting = false;
  }

  /** `subscribe("startRec", …)` — and the frame that ends the spinner. */
  roomRecordingStarted(name: string): void {
    this.#roomRecording = true;
    this.#roomRecordingPaused = false;
    this.#roomRecordingName = name;
    this.#roomRecordingStarting = false;
  }

  /** `subscribe("stopRec", …)`. Clears the name, so a stale tooltip cannot outlive the recording. */
  roomRecordingStopped(): void {
    this.#roomRecording = false;
    this.#roomRecordingPaused = false;
    this.#roomRecordingName = '';
    this.#roomRecordingStarting = false;
  }

  /** `subscribe("pauseRec", …)` and `subscribe("resumeRec", …)` — one field, both directions. */
  roomRecordingPauseChanged(paused: boolean): void {
    this.#roomRecordingPaused = paused;
  }
}
