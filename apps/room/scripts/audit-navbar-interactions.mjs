import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const chromeBinary =
  process.env.PTR_CHROME_BINARY ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const targetUrl = process.env.PTR_TARGET_URL ?? 'http://localhost:5178/';
const chromeProfile = mkdtempSync(join(tmpdir(), 'ptr-navbar-interaction-audit-'));
const chrome = spawn(
  chromeBinary,
  [
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--metrics-recording-only',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-pipe',
    `--user-data-dir=${chromeProfile}`,
    'about:blank'
  ],
  { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] }
);

const requestPipe = chrome.stdio[3];
const responsePipe = chrome.stdio[4];
if (!requestPipe || !responsePipe) {
  chrome.kill();
  throw new Error('Chrome did not expose the DevTools protocol pipes.');
}

let nextRequestId = 1;
let responseBuffer = Buffer.alloc(0);
const pendingRequests = new Map();
const eventWaiters = new Set();

function send(method, params = {}, sessionId) {
  const id = nextRequestId++;
  const payload = { id, method, params };
  if (sessionId) payload.sessionId = sessionId;
  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    requestPipe.write(`${JSON.stringify(payload)}\0`);
  });
}

function waitForEvent(method, sessionId, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    const waiter = {
      method,
      sessionId,
      resolve: (params) => {
        clearTimeout(timer);
        eventWaiters.delete(waiter);
        resolve(params);
      }
    };
    const timer = setTimeout(() => {
      eventWaiters.delete(waiter);
      reject(new Error(`Timed out waiting for ${method}.`));
    }, timeoutMs);
    eventWaiters.add(waiter);
  });
}

function handleProtocolMessage(message) {
  if (message.id) {
    const pending = pendingRequests.get(message.id);
    if (!pending) return;
    pendingRequests.delete(message.id);
    if (message.error) pending.reject(new Error(`${message.error.code}: ${message.error.message}`));
    else pending.resolve(message.result);
    return;
  }
  for (const waiter of eventWaiters) {
    if (waiter.method === message.method && waiter.sessionId === message.sessionId) {
      waiter.resolve(message.params);
    }
  }
}

responsePipe.on('data', (chunk) => {
  responseBuffer = Buffer.concat([responseBuffer, chunk]);
  let separatorIndex = responseBuffer.indexOf(0);
  while (separatorIndex !== -1) {
    const raw = responseBuffer.subarray(0, separatorIndex).toString('utf8');
    responseBuffer = responseBuffer.subarray(separatorIndex + 1);
    if (raw) handleProtocolMessage(JSON.parse(raw));
    separatorIndex = responseBuffer.indexOf(0);
  }
});

chrome.on('exit', (code, signal) => {
  if (pendingRequests.size === 0) return;
  const error = new Error(`Chrome exited before the audit completed (${signal ?? code}).`);
  for (const pending of pendingRequests.values()) pending.reject(error);
  pendingRequests.clear();
});

async function evaluate(expression, sessionId) {
  const result = await send(
    'Runtime.evaluate',
    { expression, returnByValue: true, awaitPromise: true },
    sessionId
  );
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? 'Runtime evaluation failed.');
  }
  return result.result.value;
}

const settle = `
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  await new Promise((resolve) => setTimeout(resolve, 25));
`;

async function click(selector, sessionId) {
  return evaluate(
    `(async () => {
      const node = document.querySelector(${JSON.stringify(selector)});
      if (!node) throw new Error('Missing selector: ${selector}');
      node.click();
      ${settle}
      return true;
    })()`,
    sessionId
  );
}

async function run() {
  const target = await send('Target.createTarget', { url: 'about:blank' });
  const attached = await send('Target.attachToTarget', {
    targetId: target.targetId,
    flatten: true
  });
  const sessionId = attached.sessionId;
  await Promise.all([
    send('Page.enable', {}, sessionId),
    send('Runtime.enable', {}, sessionId),
    send(
      'Emulation.setDeviceMetricsOverride',
      {
        width: 962,
        height: 942,
        deviceScaleFactor: 1,
        mobile: false
      },
      sessionId
    )
  ]);

  await send(
    'Page.addScriptToEvaluateOnNewDocument',
    {
      source: `
        (() => {
          class FakeTrack extends EventTarget {
            constructor(kind) {
              super();
              this.kind = kind;
              this.enabled = true;
              this.readyState = 'live';
            }
            stop() {
              this.readyState = 'ended';
              this.dispatchEvent(new Event('ended'));
            }
          }
          class FakeStream {
            constructor(kind) {
              this.track = new FakeTrack(kind);
            }
            getTracks() {
              return [this.track];
            }
            getAudioTracks() {
              return this.track.kind === 'audio' ? [this.track] : [];
            }
            getVideoTracks() {
              return this.track.kind === 'video' ? [this.track] : [];
            }
          }
          const maybeReject = () => {
            if (sessionStorage.getItem('__ptrMediaFailure') === 'denied') {
              throw new DOMException('Permission denied', 'NotAllowedError');
            }
          };
          const devices = {
            enumerateDevices: async () => [],
            getUserMedia: async (constraints) => {
              maybeReject();
              return new FakeStream(constraints && constraints.video ? 'video' : 'audio');
            },
            getDisplayMedia: async () => {
              maybeReject();
              return new FakeStream('video');
            }
          };
          Object.defineProperty(navigator, 'mediaDevices', {
            configurable: true,
            value: devices
          });
          if (navigator.permissions) {
            Object.defineProperty(navigator.permissions, 'query', {
              configurable: true,
              value: async () => ({ state: 'denied' })
            });
          }
          class FakeMediaRecorder extends EventTarget {
            constructor(stream) {
              super();
              this.stream = stream;
              this.state = 'inactive';
              this.mimeType = 'video/webm';
            }
            start() {
              this.state = 'recording';
            }
            pause() {
              this.state = 'paused';
            }
            resume() {
              this.state = 'recording';
            }
            stop() {
              this.state = 'inactive';
              const dataEvent = new Event('dataavailable');
              Object.defineProperty(dataEvent, 'data', {
                value: new Blob(['audit'], { type: this.mimeType })
              });
              this.dispatchEvent(dataEvent);
              this.dispatchEvent(new Event('stop'));
            }
          }
          Object.defineProperty(window, 'MediaRecorder', {
            configurable: true,
            value: FakeMediaRecorder
          });
        })();
      `
    },
    sessionId
  );

  const loaded = waitForEvent('Page.loadEventFired', sessionId);
  await send('Page.navigate', { url: targetUrl }, sessionId);
  await loaded;

  const checks = [];
  const record = (name, passed, actual, expected) => {
    checks.push({ name, passed, actual, expected });
  };

  const initialSidebar = await evaluate(
    `({
      wrapperClass: document.querySelector('.wrapper').className,
      sidebarLeft: Math.round(document.querySelector('.sidebar-wrapper').getBoundingClientRect().left)
    })`,
    sessionId
  );
  record('hamburger starts closed', initialSidebar.wrapperClass === 'wrapper', initialSidebar, {
    wrapperClass: 'wrapper'
  });

  await click('.mainAppNav .sidebar-menu', sessionId);
  const openSidebar = await evaluate(
    `(() => {
      const rect = document.querySelector('.sidebar-wrapper').getBoundingClientRect();
      return {
        wrapperClass: document.querySelector('.wrapper').className,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        hamburgerIcon: document.querySelector('.sidebar-menu i').className
      };
    })()`,
    sessionId
  );
  record(
    'hamburger opens the sidebar on the left',
    openSidebar.wrapperClass.includes('push-wrapper') &&
      openSidebar.left === 0 &&
      openSidebar.right === 250 &&
      openSidebar.hamburgerIcon.includes('fa-arrow-left'),
    openSidebar,
    { left: 0, right: 250, icon: 'fa-arrow-left' }
  );
  await click('.mainAppNav .sidebar-menu', sessionId);

  const mobileLauncher = await evaluate(
    `(() => {
      const launcher = document.querySelector('.mainAppNav .mobile-info-app-btn');
      const users = document.querySelector('.mainAppNav .users');
      const logo = document.querySelector('.mainAppNav .navbar-brand');
      return {
        title: launcher?.getAttribute('title') ?? '',
        toggle: launcher?.getAttribute('data-bs-toggle') ?? '',
        target: launcher?.getAttribute('data-bs-target') ?? '',
        className: launcher?.className ?? '',
        afterUsers: users?.nextElementSibling === launcher,
        beforeLogo: launcher?.nextElementSibling === logo
      };
    })()`,
    sessionId
  );
  record(
    'mobile-app launcher uses the captured node and navbar position',
    mobileLauncher.title === 'Launch in Mobile App' &&
      mobileLauncher.toggle === 'modal' &&
      mobileLauncher.target === '#mobileAppInfoModal' &&
      mobileLauncher.className === 'fas fa-mobile mr-1 mobile-info-app-btn' &&
      mobileLauncher.afterUsers &&
      mobileLauncher.beforeLogo,
    mobileLauncher,
    {
      title: 'Launch in Mobile App',
      toggle: 'modal',
      target: '#mobileAppInfoModal',
      className: 'fas fa-mobile mr-1 mobile-info-app-btn',
      afterUsers: true,
      beforeLogo: true
    }
  );
  await click('.mainAppNav .mobile-info-app-btn', sessionId);
  const mobileModal = await evaluate(
    `(() => {
      const modal = document.querySelector('#mobileAppInfoModal');
      return {
        display: getComputedStyle(modal).display,
        openClass: modal.classList.contains('show'),
        title: modal.querySelector('#mobileAppInfoLabel')?.textContent.trim() ?? '',
        email: modal.querySelector('.modal-body .mt-2 div span')?.textContent.trim() ?? ''
      };
    })()`,
    sessionId
  );
  record(
    'mobile-app launcher opens the captured mobile information modal',
    mobileModal.display === 'block' &&
      mobileModal.openClass &&
      mobileModal.title === 'Download our mobile apps' &&
      mobileModal.email.length > 0,
    mobileModal,
    {
      display: 'block',
      openClass: true,
      title: 'Download our mobile apps',
      email: 'connected user email'
    }
  );
  await click('#mobileAppInfoModal .btn-close', sessionId);

  await click('#dropdownVolume', sessionId);
  const volumePlacement = await evaluate(
    `(() => {
      const trigger = document.querySelector('#dropdownVolume').getBoundingClientRect();
      const menu = document.querySelector('.volumeControl');
      const rect = menu.getBoundingClientRect();
      return {
        popper: menu.getAttribute('data-bs-popper'),
        display: getComputedStyle(menu).display,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        triggerLeft: Math.round(trigger.left),
        viewportWidth: innerWidth,
        viewportHeight: innerHeight
      };
    })()`,
    sessionId
  );
  record(
    'volume dropdown uses the captured Bootstrap dropstart placement',
    volumePlacement.popper === 'static' &&
      volumePlacement.display === 'block' &&
      volumePlacement.left >= 0 &&
      volumePlacement.right <= volumePlacement.triggerLeft &&
      volumePlacement.bottom <= volumePlacement.viewportHeight,
    volumePlacement,
    { popper: 'static', opens: 'left of trigger and inside viewport' }
  );

  const volumeInteraction = await evaluate(
    `(async () => {
      const slider = document.querySelector('.volumeControl input[type="range"]');
      slider.value = '25';
      slider.dispatchEvent(new Event('input', { bubbles: true }));
      ${settle}
      const afterSlider = {
        icon: document.querySelector('#dropdownVolume i').className,
        button: document.querySelector('.volumeControl button').textContent.trim()
      };
      document.querySelector('.volumeControl button').click();
      ${settle}
      return {
        afterSlider,
        afterMute: {
          icon: document.querySelector('#dropdownVolume i').className,
          button: document.querySelector('.volumeControl button').textContent.trim()
        }
      };
    })()`,
    sessionId
  );
  record(
    'volume slider and mute control update visible state',
    volumeInteraction.afterSlider.icon.includes('fa-volume-down') &&
      volumeInteraction.afterSlider.button === 'Mute' &&
      volumeInteraction.afterMute.icon.includes('fa-volume-mute') &&
      volumeInteraction.afterMute.button === 'Unmute',
    volumeInteraction,
    {
      afterSlider: { icon: 'fa-volume-down', button: 'Mute' },
      afterMute: { icon: 'fa-volume-mute', button: 'Unmute' }
    }
  );

  const muteDndState = await evaluate(
    `(() => {
      const alertBadge = document.querySelector('.alertHeader .navbar-brand .badge');
      const chatBadge = document.querySelector('.chatHeader .navbar-brand .badge');
      const privateBadge = document.querySelector('.chat-nav-pm .navbar-brand .badge');
      const checkbox = document.querySelector('.volumeControl #app-donot-disturb');
      return {
        checkboxChecked: checkbox?.checked ?? false,
        checkboxLabel: document.querySelector('.volumeControl label[for="app-donot-disturb"]')?.textContent.trim() ?? '',
        alertClass: alertBadge?.className ?? '',
        alertText: alertBadge?.textContent.replace(/\\s+/g, ' ').trim() ?? '',
        alertIcon: alertBadge?.querySelector('i')?.className ?? '',
        chatClass: chatBadge?.className ?? '',
        chatText: chatBadge?.textContent.replace(/\\s+/g, ' ').trim() ?? '',
        privateClass: privateBadge?.className ?? '',
        privateText: privateBadge?.textContent.replace(/\\s+/g, ' ').trim() ?? '',
        toastVisible: document.querySelector('#toast-container') !== null,
        dialogVisible: document.querySelector('.bootbox.show') !== null
      };
    })()`,
    sessionId
  );
  record(
    'master Mute enables global DND with the exact component badges and no activation toast',
    muteDndState.checkboxChecked &&
      muteDndState.checkboxLabel === "DON'T DISTURB" &&
      muteDndState.alertClass === 'badge badge-danger ms-2' &&
      muteDndState.alertText === 'DND' &&
      muteDndState.alertIcon === 'fas fa-bell-slash' &&
      muteDndState.chatClass === 'badge badge-danger ml-2' &&
      muteDndState.chatText === 'DND' &&
      muteDndState.privateClass === 'badge badge-danger ml-2' &&
      muteDndState.privateText === 'DND' &&
      !muteDndState.toastVisible &&
      !muteDndState.dialogVisible,
    muteDndState,
    {
      checkboxChecked: true,
      checkboxLabel: "DON'T DISTURB",
      alertClass: 'badge badge-danger ms-2',
      chatClass: 'badge badge-danger ml-2',
      privateClass: 'badge badge-danger ml-2',
      icon: 'fas fa-bell-slash',
      text: 'DND',
      toastVisible: false,
      dialogVisible: false
    }
  );

  await click('.volumeControl #app-donot-disturb', sessionId);
  const directDndOff = await evaluate(
    `({
      volumeButton: document.querySelector('.volumeControl button').textContent.trim(),
      checkboxChecked: document.querySelector('.volumeControl #app-donot-disturb').checked,
      checkboxLabel: document.querySelector('.volumeControl label[for="app-donot-disturb"]').textContent.trim(),
      badgeCount: document.querySelectorAll('.alertHeader .navbar-brand .badge, .chatHeader .navbar-brand .badge, .chat-nav-pm .navbar-brand .badge').length
    })`,
    sessionId
  );
  record(
    'direct DND toggle is independent from master volume and removes every DND badge',
    directDndOff.volumeButton === 'Unmute' &&
      !directDndOff.checkboxChecked &&
      directDndOff.checkboxLabel === "Don't Disturb" &&
      directDndOff.badgeCount === 0,
    directDndOff,
    {
      volumeButton: 'Unmute',
      checkboxChecked: false,
      checkboxLabel: "Don't Disturb",
      badgeCount: 0
    }
  );
  await click('.volumeControl h4 span', sessionId);

  await click('.chatHeader .chat-header-gear', sessionId);
  const settingsDndInitial = await evaluate(
    `({
      modalOpen: document.querySelector('#user-settings-modal')?.classList.contains('show') ?? false,
      checkboxChecked: document.querySelector('#user-settings-modal #app-donot-disturb')?.checked ?? null,
      checkboxLabel: document.querySelector('#user-settings-modal label[for="app-donot-disturb"]')?.textContent.trim() ?? ''
    })`,
    sessionId
  );
  record(
    'General Settings exposes the captured DND checkbox without a standalone DND modal',
    settingsDndInitial.modalOpen &&
      settingsDndInitial.checkboxChecked === false &&
      settingsDndInitial.checkboxLabel === "Don't Disturb",
    settingsDndInitial,
    { modalOpen: true, checkboxChecked: false, checkboxLabel: "Don't Disturb" }
  );
  await click('#user-settings-modal #app-donot-disturb', sessionId);
  const settingsDndOn = await evaluate(
    `({
      checkboxChecked: document.querySelector('#user-settings-modal #app-donot-disturb').checked,
      checkboxLabel: document.querySelector('#user-settings-modal label[for="app-donot-disturb"]').textContent.trim(),
      alertClass: document.querySelector('.alertHeader .navbar-brand .badge')?.className ?? '',
      chatClass: document.querySelector('.chatHeader .navbar-brand .badge')?.className ?? '',
      toastVisible: document.querySelector('#toast-container') !== null,
      dialogCount: document.querySelectorAll('.bootbox.show').length
    })`,
    sessionId
  );
  record(
    'General Settings DND synchronizes the shared badges with no toast or confirmation',
    settingsDndOn.checkboxChecked &&
      settingsDndOn.checkboxLabel === "DON'T DISTURB" &&
      settingsDndOn.alertClass === 'badge badge-danger ms-2' &&
      settingsDndOn.chatClass === 'badge badge-danger ml-2' &&
      !settingsDndOn.toastVisible &&
      settingsDndOn.dialogCount === 0,
    settingsDndOn,
    {
      checkboxChecked: true,
      checkboxLabel: "DON'T DISTURB",
      alertClass: 'badge badge-danger ms-2',
      chatClass: 'badge badge-danger ml-2',
      toastVisible: false,
      dialogCount: 0
    }
  );
  await click('#user-settings-modal #app-donot-disturb', sessionId);
  await click('#user-settings-modal .btn-close', sessionId);

  await click('#unmuteMuteMicrophone', sessionId);
  const microphoneEnabled = await evaluate(
    `document.querySelector('#unmuteMuteMicrophone').className`,
    sessionId
  );
  const waitingTalkingIndicator = await evaluate(
    `(() => {
      const indicator = document.querySelector('.talkingIndicator');
      return {
        text: indicator.textContent.replace(/\\s+/g, ' ').trim(),
        noSpeakerVisible: indicator.textContent.includes('No one is speaking'),
        microphoneIcon: indicator.querySelector('i')?.className ?? '',
        waveformId: indicator.querySelector('img')?.id ?? '',
        waveformSrc: indicator.querySelector('img')?.getAttribute('src') ?? '',
        anchorColor: getComputedStyle(indicator.querySelector('a')).color
      };
    })()`,
    sessionId
  );
  record(
    'unmuting alone keeps the client-facing no-speaker fallback',
    waitingTalkingIndicator.noSpeakerVisible &&
      waitingTalkingIndicator.text === '( No one is speaking )' &&
      waitingTalkingIndicator.microphoneIcon === '' &&
      waitingTalkingIndicator.waveformId === '' &&
      waitingTalkingIndicator.waveformSrc === '' &&
      waitingTalkingIndicator.anchorColor === 'rgb(247, 253, 55)',
    waitingTalkingIndicator,
    {
      noSpeakerVisible: true,
      text: '( No one is speaking )',
      microphoneIcon: '',
      waveformId: '',
      waveformSrc: '',
      anchorColor: 'rgb(247, 253, 55)'
    }
  );

  let talkingWaveform = await evaluate(
    `(async () => {
      window.dispatchEvent(new Event('presenterTalking'));
      ${settle}
      const image = document.querySelector('.talkingIndicator img');
      const style = getComputedStyle(image);
      return {
        text: document.querySelector('.talkingIndicator').textContent.replace(/\\s+/g, ' ').trim(),
        noSpeakerVisible: document.querySelector('.talkingIndicator').textContent.includes('No one is speaking'),
        microphoneIcon: document.querySelector('.talkingIndicator i')?.className ?? '',
        id: image?.id ?? '',
        src: image?.getAttribute('src') ?? '',
        complete: image?.complete ?? false,
        naturalWidth: image?.naturalWidth ?? 0,
        naturalHeight: image?.naturalHeight ?? 0,
        renderedWidth: Math.round(image?.getBoundingClientRect().width ?? 0),
        renderedHeight: Math.round(image?.getBoundingClientRect().height ?? 0),
        display: style.display,
        visibility: style.visibility
      };
    })()`,
    sessionId
  );
  await evaluate(
    `(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1200));
    })()`,
    sessionId
  );
  const waveformClip = await evaluate(
    `(() => {
      const rect = document.querySelector('.talkingIndicator img').getBoundingClientRect();
      return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        scale: 1
      };
    })()`,
    sessionId
  );
  const waveformFrameOne = await send(
    'Page.captureScreenshot',
    { format: 'png', clip: waveformClip, captureBeyondViewport: false },
    sessionId
  );
  await evaluate(
    `(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    })()`,
    sessionId
  );
  const waveformFrameTwo = await send(
    'Page.captureScreenshot',
    { format: 'png', clip: waveformClip, captureBeyondViewport: false },
    sessionId
  );
  talkingWaveform = {
    ...talkingWaveform,
    frameChanged: waveformFrameOne.data !== waveformFrameTwo.data
  };
  record(
    'presenterTalking selects the exact captured animated waveform',
    !talkingWaveform.noSpeakerVisible &&
      talkingWaveform.text.length > 0 &&
      talkingWaveform.microphoneIcon.includes('fa-microphone') &&
      talkingWaveform.id === 'talkingLevelsImg' &&
      talkingWaveform.src === '/assets/images/talking.gif' &&
      talkingWaveform.complete &&
      talkingWaveform.naturalWidth === 53 &&
      talkingWaveform.naturalHeight === 60 &&
      talkingWaveform.display !== 'none' &&
      talkingWaveform.visibility === 'visible' &&
      talkingWaveform.frameChanged,
    talkingWaveform,
    {
      noSpeakerVisible: false,
      microphoneIcon: 'fa-microphone',
      id: 'talkingLevelsImg',
      src: '/assets/images/talking.gif',
      complete: true,
      naturalWidth: 53,
      naturalHeight: 60,
      visible: true,
      frameChanged: true
    }
  );
  await evaluate(
    `(async () => {
      window.dispatchEvent(new Event('presenterNotTalking'));
      ${settle}
    })()`,
    sessionId
  );

  await click('#unmuteMuteMicrophone', sessionId);
  const microphoneMuted = await evaluate(
    `({
      className: document.querySelector('#unmuteMuteMicrophone').className,
      indicatorText: document.querySelector('.talkingIndicator').textContent.trim()
    })`,
    sessionId
  );
  record(
    'microphone toggles enabled and muted states',
    microphoneEnabled.includes('text-white') &&
      microphoneMuted.className.includes('muted') &&
      microphoneMuted.indicatorText === '( No one is speaking )',
    { microphoneEnabled, microphoneMuted },
    {
      enabled: 'text-white',
      muted: 'muted',
      indicatorText: '( No one is speaking )'
    }
  );

  await click('#startStopWebCam', sessionId);
  const cameraEnabled = await evaluate(
    `document.querySelector('#startStopWebCam').className`,
    sessionId
  );
  await click('#startStopWebCam', sessionId);
  const cameraMuted = await evaluate(
    `document.querySelector('#startStopWebCam').className`,
    sessionId
  );
  record(
    'camera toggles enabled and muted states',
    cameraEnabled.includes('text-white') && cameraMuted.includes('muted'),
    { cameraEnabled, cameraMuted },
    { enabled: 'text-white', muted: 'muted' }
  );

  await click('#dropdownRecording', sessionId);
  const recordingBlocked = await evaluate(
    `document.querySelector('#dropdownRecording').closest('li').querySelector('.dropdown-menu').textContent.trim()`,
    sessionId
  );
  record(
    'recording reports the captured no-screenshare state',
    recordingBlocked === "Can't start recording without screenshare",
    recordingBlocked,
    "Can't start recording without screenshare"
  );
  await click('#dropdownRecording', sessionId);

  await click('#dropdownScreenSharing', sessionId);
  const screenMenuPlacement = await evaluate(
    `(() => {
      const trigger = document.querySelector('#dropdownScreenSharing').getBoundingClientRect();
      const menu = document.querySelector('#dropdownScreenSharing').closest('li').querySelector('.dropdown-menu');
      const rect = menu.getBoundingClientRect();
      return {
        popper: menu.getAttribute('data-bs-popper'),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        triggerRight: Math.round(trigger.right),
        viewportWidth: innerWidth
      };
    })()`,
    sessionId
  );
  record(
    'screen-share dropdown uses the captured navbar alignment',
    screenMenuPlacement.popper === 'static' &&
      screenMenuPlacement.right <= screenMenuPlacement.viewportWidth,
    screenMenuPlacement,
    { popper: 'static', withinViewport: true }
  );
  await click('#dropdownScreenSharing + .screen-options-start-screen li:first-child', sessionId);
  const screenSharingClass = await evaluate(
    `document.querySelector('#dropdownScreenSharing').className`,
    sessionId
  );
  record(
    'screen sharing enters the active state',
    screenSharingClass.includes('text-white') && !screenSharingClass.includes('muted'),
    screenSharingClass,
    'text-white without muted'
  );

  await click('#dropdownRecording', sessionId);
  await click('#dropdownRecording + .screen-options-start-screen li:first-child', sessionId);
  const recordingState = await evaluate(
    `document.querySelector('.recIndicator')?.textContent.trim() ?? ''`,
    sessionId
  );
  record(
    'recording starts after screen sharing',
    recordingState === '[ REC ]',
    recordingState,
    '[ REC ]'
  );

  await click('#soundcloudDropdown', sessionId);
  const soundCloudPlacement = await evaluate(
    `(() => {
      const menu = document.querySelector('#soundcloudDropdown').closest('li').querySelector('.dropdown-menu');
      const rect = menu.getBoundingClientRect();
      return {
        popper: menu.getAttribute('data-bs-popper'),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        viewportWidth: innerWidth
      };
    })()`,
    sessionId
  );
  record(
    'SoundCloud dropdown uses the captured navbar alignment',
    soundCloudPlacement.popper === 'static' &&
      soundCloudPlacement.left >= 0 &&
      soundCloudPlacement.right <= soundCloudPlacement.viewportWidth,
    soundCloudPlacement,
    { popper: 'static', withinViewport: true }
  );
  await click('#soundcloudDropdown + .soundcloud-options li:first-child', sessionId);
  const soundCloudPrompt = await evaluate(
    `document.querySelector('.bootbox-prompt .modal-title')?.textContent.trim() ?? ''`,
    sessionId
  );
  const expectedSoundCloudPrompt =
    'You can play SoundCloud music for all. Click on "Share" from your track or playlist, copy and paste the share url here';
  record(
    'SoundCloud control opens the captured prompt',
    soundCloudPrompt === expectedSoundCloudPrompt,
    soundCloudPrompt,
    expectedSoundCloudPrompt
  );
  await click('.bootbox-prompt .btn-close', sessionId);

  await click('.mic-gear-btn', sessionId);
  const avDeviceModal = await evaluate(
    `({
      modalOpen: document.querySelector('#session-control-modal')?.classList.contains('show') ?? false,
      tabActive: document.querySelector('#av-device-selection-tab')?.classList.contains('active') ?? false,
      paneActive: document.querySelector('#av-device-selection')?.classList.contains('active') ?? false
    })`,
    sessionId
  );
  record(
    'microphone gear opens A/V Device Selection',
    avDeviceModal.modalOpen && avDeviceModal.tabActive && avDeviceModal.paneActive,
    avDeviceModal,
    { modalOpen: true, tabActive: true, paneActive: true }
  );
  await click('#session-control-modal .btn-close', sessionId);

  await click('.mainAppNav [title="Session Control"]', sessionId);
  const sessionControlModal = await evaluate(
    `({
      modalOpen: document.querySelector('#session-control-modal')?.classList.contains('show') ?? false,
      tabActive: document.querySelector('#reset-session-tab')?.classList.contains('active') ?? false
    })`,
    sessionId
  );
  record(
    'session-control gear opens the default Session Control tab',
    sessionControlModal.modalOpen && sessionControlModal.tabActive,
    sessionControlModal,
    { modalOpen: true, tabActive: true }
  );
  await click('#session-control-modal .btn-close', sessionId);

  await click('.mainAppNav [title="Reload"] a', sessionId);
  const reloadMessage = await evaluate(
    `document.querySelector('.bootbox-confirm .bootbox-body')?.textContent.trim() ?? ''`,
    sessionId
  );
  record(
    'reload opens the captured confirmation',
    reloadMessage === 'Are you sure you want to reload the page?',
    reloadMessage,
    'Are you sure you want to reload the page?'
  );
  await click('.bootbox-confirm .btn-close', sessionId);

  await evaluate(`sessionStorage.setItem('__ptrMediaFailure', 'denied')`, sessionId);
  const reloaded = waitForEvent('Page.loadEventFired', sessionId);
  await send('Page.reload', {}, sessionId);
  await reloaded;
  await click('#unmuteMuteMicrophone', sessionId);
  const microphonePermissionMessage = await evaluate(
    `document.querySelector('.bootbox-alert .bootbox-body')?.textContent.trim() ?? ''`,
    sessionId
  );
  const expectedMicrophonePermission =
    'Permission denied. To enable microphone, go to Chrome Settings > Privacy and security > Site Settings > Microphone and allow access for this site.';
  record(
    'microphone denial opens the production permission guidance',
    microphonePermissionMessage === expectedMicrophonePermission,
    microphonePermissionMessage,
    expectedMicrophonePermission
  );
  await click('.bootbox-alert .btn-close', sessionId);

  await click('#startStopWebCam', sessionId);
  const cameraPermissionMessage = await evaluate(
    `document.querySelector('.bootbox-alert .bootbox-body')?.textContent.trim() ?? ''`,
    sessionId
  );
  const expectedCameraPermission =
    'Permission denied. To enable camera, go to Chrome Settings > Privacy and security > Site Settings > Camera and allow access for this site.';
  record(
    'camera denial opens the production permission guidance',
    cameraPermissionMessage === expectedCameraPermission,
    cameraPermissionMessage,
    expectedCameraPermission
  );
  await click('.bootbox-alert .btn-close', sessionId);

  await click('#dropdownScreenSharing', sessionId);
  await click('#dropdownScreenSharing + .screen-options-start-screen li:first-child', sessionId);
  const screenPermissionMessage = await evaluate(
    `document.querySelector('.bootbox-alert .bootbox-body')?.textContent.trim() ?? ''`,
    sessionId
  );
  const expectedScreenPermission =
    'Permission denied. To enable screen sharing, go to Chrome Settings > Privacy and security > Site Settings > Screen capture and allow access for this site.';
  record(
    'screen-share denial opens the production permission guidance',
    screenPermissionMessage === expectedScreenPermission,
    screenPermissionMessage,
    expectedScreenPermission
  );

  const failures = checks.filter((check) => !check.passed);
  console.log(JSON.stringify({ targetUrl, viewport: [962, 942], checks, failures }, null, 2));
  if (failures.length > 0) process.exitCode = 1;
}

try {
  await run();
} finally {
  if (chrome.exitCode === null && chrome.signalCode === null) {
    const chromeExited = new Promise((resolve) => chrome.once('exit', resolve));
    chrome.kill();
    await chromeExited;
  }
  rmSync(chromeProfile, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 50
  });
}
