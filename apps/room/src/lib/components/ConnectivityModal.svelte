<script lang="ts">
  import { untrack } from 'svelte';

  import {
    CONNECTIVITY_ROWS,
    connectivityGlyph,
    connectivityRowClasses
  } from '#lib/connectivity-status-rows.js';
  import Modal from './Modal.svelte';
  import MobileRestorePane from './MobileRestorePane.svelte';

  /**
   * `app-webrtc-troubleshooter` — the Connectivity/Mic Troubleshooter, whole.
   *
   * ## Why it is its own component, and why it took three commits to become one
   *
   * `source-size-contract.test.ts` NAMED this extraction on 2026-08-30 and again in the commit
   * after it: *"THE NEXT EXTRACTION FROM THIS FILE IS THE CONNECTIVITY MODAL, and it is named here
   * rather than left for somebody to rediscover."* Both times it was deferred with a stated
   * reason — a large move with live media state in it, landing in a commit that already carried
   * several gates — and both times something smaller paid for the growth instead.
   *
   * On 2026-09-01 there was nothing smaller left. `ModalHost.svelte` went 14 lines past its ceiling
   * for the `#all-user-pm-modal` transcription, and the rule that ceiling states is *extract, do not
   * raise*. Deferring a third time on the reason that had already been spent twice would have been
   * the ratchet quietly becoming advisory.
   *
   * ## What came, and why it is a clean seam rather than a slice cut to make a number
   *
   * Everything: the tab strip, the WebRTC test with its ICE-source reasoning, the mic test, the
   * recorder and its playback, and the `$effect` that tears all of it down. 809 lines, and the host
   * keeps exactly one thing — `open` — which is the host's one job.
   *
   * Upstream it IS a component: `<app-webrtc-troubleshooter>` is the element this file's root still
   * carries. Nothing here reads anything the host reads; the four props below are the entire
   * interface, and three of them are pass-through.
   *
   * ## The `$effect` is the reason this component owns state rather than receiving it
   *
   * Closing the modal must stop a run: an abandoned `RTCPeerConnection` holds its TURN allocations
   * for the page lifetime, and an orphaned timer writes `failed` into a test that is no longer
   * running. That teardown is keyed on `open`, and the state it tears down has to be in the same
   * component as the effect — which is what makes this a component and not a snippet.
   */
  interface Props {
    /** `name === 'connectivity'` in the host. Opening RUNS the mic enumeration; closing tears down. */
    open: boolean;
    /**
     * CONN-02/CONN-03 — the Network and Mic tabs are BOTH behind `globals.isPresenter` upstream,
     * and the seed tab differs by role. Passed rather than recomputed: a second answer to "is this
     * viewer the presenter" is the shape `CLAUDE.md` refuses.
     */
    isPresenter: boolean;
    /** This deployment's own ICE servers, from `/api/media/grant`. Empty until the socket opens. */
    mediaIceServers: RTCIceServer[];
    /** Gates the Mobile App tab. The room's own divergence, argued at the tab strip below. */
    mobileAppAvailable: boolean;
    onclose: () => void;
    /**
     * `restoreMobileAppTokens` — forwarded verbatim to `MobileRestorePane`, which is what composes
     * the sentence the member reads. The shape is that pane's own `RestoreResult`, restated here
     * rather than exported from it, because a component's prop type is its interface and this one
     * is only a conduit.
     */
    onrestoremobiletokens: () => Promise<{
      registrations: number;
      sent: number;
      failed: number;
      pruned: number;
    }>;
  }

  const {
    open,
    isPresenter,
    mediaIceServers,
    mobileAppAvailable,
    onclose,
    onrestoremobiletokens
  }: Props = $props();

  type ConnectivityTestState = 'pending' | 'passed' | 'failed' | 'unconfigured';
  type MicStatus = 'idle' | 'testing' | 'success' | 'no-audio' | 'error';
  /*
    CONN-03 — `this.activeTab = this.appService.globals.isPresenter ? "network" : "mobile"` at byte
    2,444,097, in the constructor. This was the bare literal `'network'`, which is the tab a
    non-presenter is not allowed to see at all (CONN-02).

    `untrack` because this is a SEED: the member then clicks, and a `$derived` would drag them back
    to the default on any re-read of page data.
  */
  let activeConnectivityTab = $state<'network' | 'mic' | 'mobile'>(
    untrack(() => (isPresenter ? 'network' : 'mobile'))
  );

  let testResults = $state({ udp: false, tcp: false, stun: false, turn: false });
  /**
   * Which ICE servers the last run used.
   *
   * `deployment` — this deployment's own, from `/api/media/grant`; the result is about US.
   * `public-fallback` — Google's public STUN, because the media socket had not opened yet and we
   * had nothing of our own to offer. A pass then says the user's network can reach a public STUN
   * server, which is worth knowing and is NOT the same claim.
   */
  let testIceSource = $state<'deployment' | 'public-fallback'>('public-fallback');
  /** Whether a run has completed at least once, so the source line describes fact, not intent. */
  let hasRunTest = $state(false);
  let testStates = $state<Record<'udp' | 'tcp' | 'stun' | 'turn', ConnectivityTestState>>({
    udp: 'pending',
    tcp: 'pending',
    stun: 'pending',
    turn: 'pending'
  });
  let isTestRunning = $state(false);
  let showConnectivityMessage = $state(false);
  let connectivityMessageText = $state('');
  let micDevices = $state.raw<Array<{ deviceId: string; label: string }>>([]);
  let micDevicesLoading = $state(false);
  let micDevicesLoaded = $state(false);
  let selectedMicDeviceId = $state('');
  let isMicTesting = $state(false);
  let micLevel = $state(0);
  let micStatus = $state<MicStatus>('idle');
  let micErrorMessage = $state('');
  let micStream: MediaStream | null = null;
  let audioContext: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let animationFrameId = 0;
  let noAudioTimeout: number | null = null;
  let audioDetected = false;
  let waveformCanvas = $state<HTMLCanvasElement>();
  let isRecording = $state(false);
  let mediaRecorder: MediaRecorder | null = null;
  let recordedChunks: Blob[] = [];
  let recordedAudioUrl = $state<string | null>(null);
  let recordingDuration = $state(0);
  let recordingInterval: number | null = null;
  let isPlayingBack = $state(false);
  let playbackAudio: HTMLAudioElement | null = null;

  // Declared before resetTestResults so the reset can release an in-flight run.
  function resetTestResults() {
    testStates = { udp: 'pending', tcp: 'pending', stun: 'pending', turn: 'pending' };
    testResults = { udp: false, tcp: false, stun: false, turn: false };
    showConnectivityMessage = false;
    connectivityMessageText = '';
    isTestRunning = false;
    micStatus = 'idle';
    micLevel = 0;
    micErrorMessage = '';
  }

  function onConnectivityTabChange(tab: 'network' | 'mic' | 'mobile') {
    if (tab === activeConnectivityTab) return;
    if (activeConnectivityTab === 'mic') cleanupMicTest();
    /*
      Leaving the Mobile App tab drops its result, and nothing here has to remember to do that:
      `MobileRestorePane` holds the message and the `{:else if}` below unmounts it, so the state goes
      with it. Recorded because the manual reset that used to sit on this line is exactly the kind of
      thing a later reader deletes as redundant — and it would be, until somebody moved the state
      back up here.
    */
    activeConnectivityTab = tab;
  }

  function showMessageBox(message: string, duration = 3000) {
    connectivityMessageText = message;
    showConnectivityMessage = true;
    window.setTimeout(() => {
      showConnectivityMessage = false;
    }, duration);
  }

  // The peer connection and its timeout are owned at component scope so a run can always be torn
  // down - by the next run, or by the connectivity effect when the modal closes. Keeping them
  // function-local meant nothing outside runWebRTCTest could reach them: an abandoned run held its
  // RTCPeerConnection (and its two authenticated TURN allocations against flash.protradingroom.com)
  // open for the page lifetime, and its orphaned timer later wrote 'failed' into the live
  // testStates of a test that was no longer running.
  let webrtcConnection: RTCPeerConnection | null = null;
  let webrtcTimer: ReturnType<typeof globalThis.setTimeout> | undefined;

  function cleanupWebRTCTest() {
    if (webrtcTimer !== undefined) {
      globalThis.clearTimeout(webrtcTimer);
      webrtcTimer = undefined;
    }
    if (webrtcConnection) {
      webrtcConnection.onicecandidate = null;
      webrtcConnection.close();
      webrtcConnection = null;
    }
  }

  async function runWebRTCTest() {
    cleanupWebRTCTest();
    testStates = { udp: 'pending', tcp: 'pending', stun: 'pending', turn: 'pending' };
    testResults = { udp: false, tcp: false, stun: false, turn: false };
    isTestRunning = true;

    /*
      THE REFERENCE'S TURN SERVER IS GONE FROM HERE, AND IT SHOULD NEVER HAVE SHIPPED.

      This block used to carry, transcribed from the capture:

        { urls: 'turn:flash.protradingroom.com:3478?transport=udp', username: 'ptrUser', credential: 'ptr123' }
        { urls: 'turn:flash.protradingroom.com:3478?transport=tcp', username: 'ptrUser', credential: 'ptr123' }

      Every run of this test therefore opened two authenticated relay allocations against a THIRD
      PARTY's server, using that third party's credentials, and sent our user's IP addresses to it.
      It also tested the wrong thing: this deployment's media path is `media.tradingroom.app`, so a
      green tick here said nothing about whether OUR relay works, and a red one blamed the user's
      firewall for someone else's server being unreachable.

      The two STUN entries stay. They are Google's public servers — not the reference's — they were
      in the captured configuration for the same reason anyone uses them, and they are what makes
      the `typ srflx` check below meaningful.

      TURN is reported as `unconfigured` rather than `failed` when this deployment has none, which is
      the honest answer: `mediaIceServers` (`lib/server/media-grant.ts:411`) builds relay entries from
      `MEDIA_TURN_URLS` + `MEDIA_TURN_SECRET` and returns none when they are unset, which is the
      state today. Saying "check your network or firewall" for a relay nobody configured is blaming
      the user for our own missing setting.

      RESOLVED 2026-08-10 (`TODO.md` item N): this test now runs against the ICE servers THIS
      deployment minted. `+page.svelte` hoisted them out of its `onMount` local into
      `mediaIceServers` and passes them down.

      When they are available they are used ALONE, and that is the whole point. Adding Google's
      STUN alongside would mean a green `stun` tick could have come from Google's server while ours
      was unreachable — the same lie as before, pointing the other way. A result is only worth
      showing a user if it is about the infrastructure they are actually trying to reach.

      The public servers remain as a labelled FALLBACK for the window before the media socket has
      opened, when we have nothing of our own to test. The UI says which of the two ran, because
      "STUN passed" means different things in those two cases and a support conversation should not
      have to guess which.
    */
    const usingDeploymentServers = mediaIceServers.length > 0;
    testIceSource = usingDeploymentServers ? 'deployment' : 'public-fallback';
    hasRunTest = true;

    const configuration: RTCConfiguration = {
      iceServers: usingDeploymentServers
        ? mediaIceServers
        : [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
    };

    const relayConfigured = (configuration.iceServers ?? []).some((server) => {
      const urls = typeof server.urls === 'string' ? [server.urls] : server.urls;
      return urls.some((url) => url.startsWith('turn:') || url.startsWith('turns:'));
    });
    if (!relayConfigured) testStates.turn = 'unconfigured';

    let peerConnection: RTCPeerConnection;
    try {
      peerConnection = new RTCPeerConnection(configuration);
      webrtcConnection = peerConnection;
    } catch (error) {
      console.error('Failed to create RTCPeerConnection', error);
      showMessageBox('WebRTC is not supported on this browser.');
      isTestRunning = false;
      return;
    }

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) return;
      const candidate = event.candidate.candidate;
      console.log('Candidate found:', candidate);
      if (candidate.includes('udp') && !testResults.udp) {
        testResults.udp = true;
        testStates.udp = 'passed';
      }
      if (candidate.includes('tcp') && !testResults.tcp) {
        testResults.tcp = true;
        testStates.tcp = 'passed';
      }
      if (candidate.includes('typ srflx') && !testResults.stun) {
        testResults.stun = true;
        testStates.stun = 'passed';
        showMessageBox('STUN connectivity test passed!');
      }
      if (candidate.includes('typ relay') && !testResults.turn) {
        testResults.turn = true;
        testStates.turn = 'passed';
        showMessageBox('TURN connectivity test passed!');
      }
    };
    peerConnection.createDataChannel('test');

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
    } catch (error) {
      console.error('Failed to create offer:', error);
      showMessageBox('Failed to initiate test. Check console for details.');
      cleanupWebRTCTest();
      isTestRunning = false;
      return;
    }

    webrtcTimer = globalThis.setTimeout(() => {
      // Ignore a timer left over from a run that has already been superseded or torn down.
      if (webrtcConnection !== peerConnection) return;
      webrtcTimer = undefined;

      if (!testResults.udp) testStates.udp = 'failed';
      if (!testResults.tcp) testStates.tcp = 'failed';
      if (!testResults.stun) {
        testStates.stun = 'failed';
        showMessageBox('STUN connectivity test failed. Check your network.', 5000);
      }
      /*
        Only call TURN failed if a relay was actually offered. With none configured the state is
        already `unconfigured`, and overwriting it with `failed` — plus "check your network or
        firewall" — would blame the user for a server this deployment never set.
      */
      if (!testResults.turn && testStates.turn !== 'unconfigured') {
        testStates.turn = 'failed';
        showMessageBox('TURN connectivity test failed. Check your network or firewall.', 5000);
      }
      // The connection has served its purpose either way: gathering finished, or it timed out.
      // Leaving it open on the success path held its TURN allocations for the page lifetime.
      cleanupWebRTCTest();
      isTestRunning = false;
    }, 10000);
  }

  function copyResults() {
    const results = [
      `UDP: ${testResults.udp ? 'OK' : 'FAILED'}`,
      `TCP: ${testResults.tcp ? 'OK' : 'FAILED'}`,
      `STUN Server Connectivity: ${testResults.stun ? 'OK' : 'FAILED'}`,
      `TURN Server Connectivity: ${testResults.turn ? 'OK' : 'FAILED'}`
    ].join('\n');

    navigator.clipboard
      .writeText(results)
      .then(() => {
        showMessageBox('Test results copied to clipboard!');
      })
      .catch((error) => {
        console.error('Failed to copy results: ', error);
        showMessageBox('Failed to copy results to clipboard.');
      });
  }

  async function loadMicDevices() {
    if (!isPresenter) return;
    micDevicesLoading = true;
    micDevicesLoaded = false;
    try {
      const permissionStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      permissionStream.getTracks().forEach((track) => track.stop());
      const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
        (device) => device.kind === 'audioinput'
      );
      micDevices = devices
        .filter((device) => {
          const isAlias = device.deviceId === 'default' || device.deviceId === 'communications';
          let isDuplicateDefault = false;
          if (device.label.toLowerCase().startsWith('default - ')) {
            const physicalLabel = device.label.substring(10);
            isDuplicateDefault = devices.some(
              (candidate) =>
                candidate.kind === device.kind &&
                candidate.label === physicalLabel &&
                candidate.deviceId !== device.deviceId
            );
          }
          return !isAlias && !isDuplicateDefault;
        })
        .map((device) => ({ deviceId: device.deviceId, label: device.label }));
      if (micDevices.length > 0 && !selectedMicDeviceId) {
        selectedMicDeviceId = micDevices[0].deviceId;
      }
    } catch (error) {
      console.warn('Could not enumerate mic devices:', error);
      micDevices = [];
    } finally {
      micDevicesLoading = false;
      micDevicesLoaded = true;
    }
  }

  async function startMicTest() {
    cleanupMicTest();
    micStatus = 'testing';
    micLevel = 0;
    audioDetected = false;
    recordedAudioUrl = null;
    const constraints: MediaStreamConstraints = {
      audio: selectedMicDeviceId ? { deviceId: { exact: selectedMicDeviceId } } : true
    };

    try {
      micStream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      const microphoneError = error as DOMException;
      micStatus = 'error';
      micErrorMessage =
        microphoneError.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow mic permission.'
          : microphoneError.name === 'NotFoundError'
            ? 'No microphone found. Please connect a mic.'
            : `Could not access microphone: ${microphoneError.message || microphoneError.name}`;
      return;
    }

    isMicTesting = true;
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(micStream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    drawLoop();
    noAudioTimeout = window.setTimeout(() => {
      if (!audioDetected && isMicTesting) micStatus = 'no-audio';
    }, 4000);
  }

  function stopMicTest() {
    cleanupMicTest();
    if (micStatus === 'testing') micStatus = 'idle';
  }

  function drawLoop() {
    if (!analyser || !isMicTesting) return;
    const canvas = waveformCanvas;
    if (!canvas) {
      animationFrameId = requestAnimationFrame(() => drawLoop());
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) return;
    const binCount = analyser.frequencyBinCount;
    const timeData = new Uint8Array(binCount);
    const frequencyData = new Uint8Array(binCount);

    const draw = () => {
      if (!analyser || !isMicTesting) return;
      animationFrameId = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(timeData);
      analyser.getByteFrequencyData(frequencyData);

      let sum = 0;
      for (let index = 0; index < binCount; index += 1) {
        const normalized = (timeData[index] - 128) / 128;
        sum += normalized * normalized;
      }
      const rms = Math.sqrt(sum / binCount);
      const level = Math.min(100, Math.round(300 * rms));
      if (level > 5 && !audioDetected) {
        audioDetected = true;
        micStatus = 'success';
      }
      micLevel = level;

      const width = canvas.width;
      const height = canvas.height;
      context.fillStyle = '#0f172a';
      context.fillRect(0, 0, width, height);
      const barWidth = width / 64;
      const binStep = Math.floor(binCount / 64);
      for (let index = 0; index < 64; index += 1) {
        const strength = frequencyData[index * binStep] / 255;
        const barHeight = strength * height * 0.6;
        context.fillStyle = `hsla(${160 - 120 * strength}, 90%, 55%, 0.25)`;
        context.fillRect(index * barWidth, height - barHeight, barWidth - 1, barHeight);
      }

      context.lineWidth = 2;
      context.beginPath();
      const sliceWidth = width / binCount;
      let x = 0;
      for (let index = 0; index < binCount; index += 1) {
        const value = timeData[index] / 128;
        const y = (value * height) / 2;
        const hue = 180 - 140 * Math.abs(value - 1);
        context.strokeStyle = `hsl(${hue}, 100%, 60%)`;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
        x += sliceWidth;
      }
      context.stroke();
      context.shadowBlur = 8;
      context.shadowColor = 'rgba(34, 211, 238, 0.4)';
      context.lineWidth = 1;
      context.beginPath();
      x = 0;
      for (let index = 0; index < binCount; index += 1) {
        const y = ((timeData[index] / 128) * height) / 2;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
        x += sliceWidth;
      }
      context.strokeStyle = 'rgba(34, 211, 238, 0.5)';
      context.stroke();
      context.shadowBlur = 0;
    };
    draw();
  }

  function startRecording() {
    if (!micStream || !isMicTesting) return;
    recordedChunks = [];
    recordingDuration = 0;
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl);
      recordedAudioUrl = null;
    }
    try {
      mediaRecorder = new MediaRecorder(micStream);
    } catch (error) {
      console.error('MediaRecorder not supported:', error);
      return;
    }
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) recordedChunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(recordedChunks, { type: 'audio/webm' });
      recordedAudioUrl = URL.createObjectURL(audioBlob);
    };
    mediaRecorder.start();
    isRecording = true;
    recordingInterval = window.setInterval(() => {
      recordingDuration += 1;
      if (recordingDuration >= 30) stopRecording();
    }, 1000);
  }

  function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    isRecording = false;
    if (recordingInterval !== null) {
      window.clearInterval(recordingInterval);
      recordingInterval = null;
    }
  }

  function playRecording() {
    if (!recordedAudioUrl) return;
    isPlayingBack = true;
    playbackAudio = new Audio(recordedAudioUrl);
    playbackAudio.onended = () => {
      isPlayingBack = false;
      playbackAudio = null;
    };
    playbackAudio.onerror = () => {
      isPlayingBack = false;
      playbackAudio = null;
    };
    void playbackAudio.play();
  }

  function cleanupMicTest() {
    if (!isPresenter) return;
    isMicTesting = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = 0;
    }
    if (noAudioTimeout !== null) {
      window.clearTimeout(noAudioTimeout);
      noAudioTimeout = null;
    }
    if (isRecording) stopRecording();
    if (playbackAudio) {
      playbackAudio.pause();
      playbackAudio = null;
      isPlayingBack = false;
    }
    if (micStream) {
      micStream.getTracks().forEach((track) => track.stop());
      micStream = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
      void audioContext.close();
      audioContext = null;
    }
    analyser = null;
    micLevel = 0;
  }

  $effect(() => {
    if (!open) return;
    resetTestResults();
    void loadMicDevices();
    return () => {
      cleanupWebRTCTest();
      isTestRunning = false;
      cleanupMicTest();
    };
  });
</script>

<app-webrtc-troubleshooter>
  <Modal
    id="webrtc-troubleshooter-modal"
    {open}
    closedAriaHidden
    ariaLabelledby="webrtc-troubleshooter-modal"
    title={isPresenter ? 'Connectivity/Mic Troubleshooter' : 'Connectivity Troubleshooter'}
    titleClass="modal-title"
    titleTag="h3"
    dialogStyle="max-width: 540px;"
    {onclose}
  >
    {#snippet beforeBody()}
      <ul role="tablist" class="nav nav-tabs troubleshooter-tabs">
        <!--
          CONN-02 — `H(9,hAe,4,2,"li",8)` and `H(14,pAe,4,2,"li",8)` are BOTH behind
          `z("ngIf", globals.isPresenter)` at byte 2,456,395; only the Mobile App `li` between them
          is unconditional. This room had it the other way round — Network Test unconditional, Mic
          Test gated — so a member could run the WebRTC connectivity test, which the reference never
          exposes to one.

          Diagnostic rather than privileged, so this is defence in depth rather than a hole being
          closed. It is closed anyway, and the BODY and the footer carry the same term for the reason
          SC-17 records: a gate on the way IN is not a statement about what the thing is for.
        -->
        {#if isPresenter}
          <li role="presentation" class="nav-item">
            <button
              type="button"
              role="tab"
              class={['nav-link', { active: activeConnectivityTab === 'network' }]}
              onclick={() => onConnectivityTabChange('network')}
            >
              <i class="fas fa-network-wired me-1"></i> Network Test
            </button>
          </li>
        {/if}
        <!--
          The Mobile App tab, `d(10,"li",9)(11,"button",10)` at 2,456,143 — consts 9
          `["role","presentation",1,"nav-item"]`, 10 `["type","button","role","tab",1,"nav-link",3,"click"]`
          and 11 `[1,"fas","fa-mobile-alt","me-1"]`. The label is `" Mobile App "` at 2,456,210.

          `fa-mobile-alt` occurs EXACTLY ONCE in the whole bundle and this is it. The navbar's mobile
          button is `fa-mobile` (const 137 at 2,541,704) and has been since the older build —
          matching the new string to the nearest mobile-looking element would have changed the icon
          on a control nobody touched.

          It sits BETWEEN Network Test and Mic Test upstream, and it does here. Its `{#if}` does not:
          upstream emits this `li` unconditionally while gating the other two on `isPresenter`, and
          that absence is recorded on `mobileAppAvailable` above.
        -->
        {#if mobileAppAvailable}
          <li role="presentation" class="nav-item">
            <button
              type="button"
              role="tab"
              class={['nav-link', { active: activeConnectivityTab === 'mobile' }]}
              onclick={() => onConnectivityTabChange('mobile')}
            >
              <i class="fas fa-mobile-alt me-1"></i> Mobile App
            </button>
          </li>
        {/if}
        {#if isPresenter}
          <li role="presentation" class="nav-item">
            <button
              type="button"
              role="tab"
              class={['nav-link', { active: activeConnectivityTab === 'mic' }]}
              onclick={() => onConnectivityTabChange('mic')}
            >
              <i class="fas fa-microphone me-1"></i> Mic Test
            </button>
          </li>
        {/if}
      </ul>
    {/snippet}
    {#if isPresenter && activeConnectivityTab === 'network'}
      <div>
        <p class="text-muted mb-4">
          This tool checks your network and connectivity to essential WebRTC servers.
        </p>
        <!--
          WHICH servers were tested, said out loud.

          "STUN passed" against this deployment's own servers and against a public fallback are two
          different claims, and a support conversation should not have to guess which one it is
          reading. Rendered only after a run, so it reports what happened rather than what will.
        -->
        {#if hasRunTest}
          <p class="text-muted mb-4" data-testid="ice-source">
            {#if testIceSource === 'deployment'}
              Tested against this room's own media servers.
            {:else}
              Tested against public STUN only — the media connection has not opened yet, so this
              says nothing about this room's servers. Join the room, then run it again.
            {/if}
          </p>
        {/if}
        <!--
          The four checks, one loop. They were four near-identical blocks stating the same two rules
          four times; the table and the two pure functions live in `#lib/connectivity-status-rows.js`,
          where they are tested. The TURN row's `–`-for-unconfigured is preserved and is the reason
          the glyph is a function rather than a nested ternary in the markup.
        -->
        {#each CONNECTIVITY_ROWS as row (row.key)}
          {const state = $derived(testStates[row.key])}
          <div class={[`status-item ${row.spacing}`, connectivityRowClasses(state)]}>
            <span class="fw-medium">{row.label}</span>
            <span
              class={[`status-icon ${state}`, { spin: state === 'pending' && isTestRunning }]}
              title={state === 'unconfigured' ? row.unconfiguredTitle : undefined}
            >
              {connectivityGlyph(state, isTestRunning)}
            </span>
          </div>
        {/each}
        {#if showConnectivityMessage}
          <div
            class={[
              'alert alert-info',
              {
                'alert-success': connectivityMessageText.includes('passed'),
                'alert-danger': connectivityMessageText.includes('failed')
              }
            ]}
          >
            {connectivityMessageText}
          </div>
        {/if}
      </div>
    {:else if activeConnectivityTab === 'mobile' && mobileAppAvailable}
      <MobileRestorePane onrestore={onrestoremobiletokens} />
    {:else if !isPresenter && !mobileAppAvailable}
      <!--
        A GAP OUR OWN GATE CREATES, and upstream cannot have it.

        The reference draws the Mobile App `li` unconditionally, so a non-presenter always has one
        tab. Ours draws it behind `mobileAppAvailable` — correctly: a room with no mobile app has
        nothing for Restore Connectivity to restore, which is recorded on that prop. Put together
        with CONN-02's gate, a member in such a room would open this modal onto NOTHING.

        An empty modal is the shape this repository refuses hardest — a control whose only effect is
        that it opened. So it says why it is empty. Same reasoning as SC-14's Refresh button: a
        divergence forced by an earlier divergence of ours is still ours to answer for.
      -->
      <p class="text-muted my-4 text-center">
        There is nothing to troubleshoot from here. Connectivity checks are run by the room's
        presenters, and this room has no mobile app to reconnect.
      </p>
    {:else if activeConnectivityTab === 'mic'}
      <div class="mic-test-container">
        {#if micDevices.length === 0 && !micDevicesLoading && micDevicesLoaded}
          <div class="no-mic-container">
            <div class="no-mic-icon"><i class="fas fa-microphone-slash"></i></div>
            <h5 class="no-mic-title">No Microphone Detected</h5>
            <p class="no-mic-text">
              Please connect a microphone to your computer and make sure it is enabled in your
              system settings.
            </p>
            <button class="btn btn-mic-start" onclick={() => void loadMicDevices()}>
              <i class="fas fa-sync-alt"></i> Retry Detection
            </button>
          </div>
        {:else if micDevicesLoading}
          <div class="no-mic-container">
            <div class="no-mic-icon loading">
              <i class="fas fa-spinner fa-spin"></i>
            </div>
            <p class="no-mic-text">Detecting microphones...</p>
          </div>
        {:else if micDevices.length > 0}
          <p class="text-muted mb-3">
            Test your microphone, visualize audio input, and record a sample to play back.
          </p>
          <div class="mic-device-selector mb-3">
            <label for="webrtc-mic-device" class="mic-label mb-1">Microphone Device</label>
            <select
              id="webrtc-mic-device"
              class="form-select mic-select"
              bind:value={selectedMicDeviceId}
              disabled={isMicTesting}
            >
              {#each micDevices as device (device.deviceId)}
                <option value={device.deviceId}>
                  {device.label || `Microphone (${device.deviceId.slice(0, 8)}...)`}
                </option>
              {/each}
            </select>
          </div>
          <div class={['waveform-wrapper mb-3', { active: isMicTesting }]}>
            <canvas bind:this={waveformCanvas} width="480" height="120" class="waveform-canvas"
            ></canvas>
            {#if !isMicTesting}
              <div class="waveform-overlay">
                <i class="fas fa-waveform fa-microphone-alt"></i>
                <span>Start test to see waveform</span>
              </div>
            {/if}
          </div>
          <div class="volume-meter mb-3">
            <div class="volume-label">
              <span class="mic-label">Volume Level</span>
              <span class={['volume-value', { active: isMicTesting }]}>{micLevel}%</span>
            </div>
            <div class="volume-bar-track">
              <div
                class={[
                  'volume-bar-fill',
                  { low: micLevel <= 30, mid: micLevel > 30 && micLevel <= 70, high: micLevel > 70 }
                ]}
                style:width={`${micLevel}%`}
              ></div>
            </div>
          </div>
          <div class="mic-status mic-status-{micStatus} mb-3">
            <span class="mic-status-dot"></span>
            {#if micStatus === 'idle'}
              <span class="mic-status-text">Ready to test</span>
            {:else if micStatus === 'testing'}
              <span class="mic-status-text">Listening...</span>
            {:else if micStatus === 'success'}
              <span class="mic-status-text">Microphone is working!</span>
            {:else if micStatus === 'no-audio'}
              <span class="mic-status-text">No audio detected — check your mic</span>
            {:else if micStatus === 'error'}
              <span class="mic-status-text">{micErrorMessage}</span>
            {/if}
          </div>
          <div class="mic-actions">
            <div class="mic-actions-row mb-2">
              {#if !isMicTesting}
                <button class="btn btn-mic-start" onclick={() => void startMicTest()}>
                  <i class="fas fa-microphone"></i> Start Test
                </button>
              {:else}
                <button class="btn btn-mic-stop" onclick={stopMicTest}>
                  <i class="fas fa-stop"></i> Stop
                </button>
              {/if}
              {#if isMicTesting && !isRecording}
                <button
                  class={['btn btn-mic-record', { recording: isRecording }]}
                  onclick={startRecording}
                >
                  <i class="fas fa-circle"></i> Record
                </button>
              {:else if isRecording}
                <button class="btn btn-mic-record recording" onclick={stopRecording}>
                  <i class="fas fa-stop"></i> Stop ({recordingDuration}s)
                </button>
              {/if}
            </div>
            {#if recordedAudioUrl}
              <div class="mic-actions-row">
                <button class="btn btn-mic-play" onclick={playRecording} disabled={isPlayingBack}>
                  <i class={['fas', { 'fa-play': !isPlayingBack, 'fa-volume-up': isPlayingBack }]}
                  ></i>
                  {isPlayingBack ? 'Playing...' : 'Play Recording'}
                </button>
              </div>
            {/if}
          </div>
        {/if}
      </div>
    {/if}
    {#snippet footer()}
      {#if isPresenter && activeConnectivityTab === 'network'}
        <button
          type="button"
          class="btn btn-primary"
          onclick={() => void runWebRTCTest()}
          disabled={isTestRunning}
        >
          {#if !isTestRunning}
            <i class="fas fa-play"></i>
          {:else}
            <i class="fas fa-spinner fa-spin"></i>
          {/if}
          {isTestRunning ? 'Testing...' : 'Start Test'}
        </button>
        <button type="button" class="btn btn-success" onclick={copyResults}>
          <i class="fas fa-copy"></i> Copy Results
        </button>
        <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
          Close
        </button>
      {:else}
        <button type="button" data-bs-dismiss="modal" class="btn btn-secondary" onclick={onclose}>
          Close
        </button>
      {/if}
    {/snippet}
  </Modal>
</app-webrtc-troubleshooter>
