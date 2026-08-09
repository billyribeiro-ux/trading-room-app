import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const files = {
  roomDom: new URL('../app-room/app-room-file.clean.html', import.meta.url),
  roomCompiled: new URL('../docs/source/components/app-room.compiled.js', import.meta.url),
  roomTemplateRuntime: new URL('../docs/source/components/app-room.full.js', import.meta.url),
  deployedBundle: new URL('../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  stylesheet: new URL('../css/complete-app-styles.css', import.meta.url),
  implementation: new URL('../src/routes/+page.svelte', import.meta.url),
  modalHost: new URL('../src/lib/components/ModalHost.svelte', import.meta.url)
};

const content = Object.fromEntries(
  Object.entries(files).map(([name, url]) => [name, readFileSync(url, 'utf8')])
);

function evidence(file, needle) {
  const source = content[file];
  const index = source.indexOf(needle);
  return {
    file: fileURLToPath(files[file]),
    line: index === -1 ? null : source.slice(0, index).split('\n').length,
    found: index !== -1,
    needle
  };
}

const checks = [
  {
    control: 'hamburger/sidebar initial state and left-side toggle',
    source: [
      evidence('roomDom', '<div class="wrapper">'),
      evidence('roomDom', 'title="Open Sidebar" class="sidebar-menu"'),
      evidence('roomCompiled', '(this.showSidebar = !1)'),
      evidence('roomCompiled', 'toggleSideBar() {'),
      evidence('roomCompiled', 'this.showSidebar = !this.showSidebar'),
      evidence(
        'stylesheet',
        '.push-wrapper[_ngcontent-ng-c977335924] { left: 250px; width: calc(100% - 250px); }'
      ),
      evidence('stylesheet', '.sidebar-wrapper[_ngcontent-ng-c977335924] { margin-left: -250px;')
    ],
    implementation: [
      evidence('implementation', 'let sidebarOpen = $state(false);'),
      evidence('implementation', "<div class={sidebarOpen ? 'wrapper push-wrapper' : 'wrapper'}>"),
      evidence('implementation', 'onclick={() => (sidebarOpen = !sidebarOpen)}')
    ]
  },
  {
    control: 'mobile-app launcher and modal target',
    source: [
      evidence('roomTemplateRuntime', "'Launch in Mobile App'"),
      evidence('roomTemplateRuntime', "'#mobileAppInfoModal'"),
      evidence('roomTemplateRuntime', "'mobile-info-app-btn'"),
      evidence('roomTemplateRuntime', 'e.appService.globals.sessData.ptrMobileAppEnabled ||'),
      evidence(
        'stylesheet',
        '.mobile-info-app-btn[_ngcontent-ng-c977335924]:hover { cursor: pointer; }'
      )
    ],
    implementation: [
      evidence('implementation', 'title="Launch in Mobile App"'),
      evidence('implementation', 'data-bs-target="#mobileAppInfoModal"'),
      evidence('implementation', 'class="fas fa-mobile mr-1 mobile-info-app-btn"'),
      evidence('implementation', "onclick={() => openModal('mobile')}"),
      evidence('modalHost', 'id="mobileAppInfoModal"'),
      evidence('modalHost', "open={name === 'mobile'}")
    ]
  },
  {
    control: 'talking indicator state and exact assets',
    source: [
      evidence(
        'roomDom',
        '<li class="nav-item talkingIndicator animated fadeIn"><a> ( No one is speaking )</a></li>'
      ),
      evidence(
        'roomTemplateRuntime',
        'O(16, e.mediaService.talkingUsers && e.mediaService.talkingUsers.length > 0 ? 16 : -1)'
      ),
      evidence('roomTemplateRuntime', 'O(17, e.mediaService.talkingStr ? -1 : 17)'),
      evidence('roomTemplateRuntime', 'pt(e.mediaService.talkingUsers)'),
      evidence('roomTemplateRuntime', '/assets/images/talking.gif'),
      evidence('roomTemplateRuntime', '/assets/images/notalking.png'),
      evidence('deployedBundle', 'this.appEventBus.subscribe("startTalking"'),
      evidence('deployedBundle', 'this.appEventBus.subscribe("stopTalking"'),
      evidence(
        'deployedBundle',
        'this.guiEventBus.subscribe("presenterTalking",()=>{this.presenterTalking=!0})'
      ),
      evidence(
        'stylesheet',
        '.talkingIndicator[_ngcontent-ng-c977335924] a[_ngcontent-ng-c977335924] { color: var(--presenter-noRecording-color); }'
      ),
      evidence(
        'stylesheet',
        '.talkingWaveform[_ngcontent-ng-c977335924] { max-height: 25px; max-width: 30px; }'
      ),
      evidence('stylesheet', '--presenter-noRecording-color: #f7fd37;')
    ],
    implementation: [
      evidence('implementation', "const noSpeakerText = ' ( No one is speaking )';"),
      evidence('implementation', '<a>{noSpeakerText}</a>'),
      evidence('implementation', 'let talkingUsers = $state<TalkingUser[]>([]);'),
      evidence('implementation', 'let presenterTalking = $state(false);'),
      evidence('implementation', 'function startTalking(talkingUser: TalkingUser) {'),
      evidence('implementation', 'function stopTalking(userID: number) {'),
      evidence('implementation', '{#if presenterTalking && talkingUsers.length > 0}'),
      evidence('implementation', 'src="/assets/images/talking.gif"'),
      evidence('implementation', "window.addEventListener('presenterTalking'"),
      evidence('implementation', "window.addEventListener('presenterNotTalking'")
    ]
  },
  {
    control: 'SoundCloud menu and prompt',
    source: [
      evidence('roomDom', 'id="soundcloudDropdown"'),
      evidence('roomDom', 'Play a track or playlist from SoundCloud'),
      evidence('roomTemplateRuntime', 'E(g(2).doSoundCloudEmbed())'),
      evidence('roomCompiled', 'doSoundCloudEmbed() {'),
      evidence(
        'roomCompiled',
        'You can play SoundCloud music for all. Click on "Share" from your track or playlist, copy and paste the share url here'
      ),
      evidence('roomCompiled', "bootbox.alert('Invalid SoundCloud URL...')")
    ],
    implementation: [
      evidence('implementation', 'function promptForSoundCloud() {'),
      evidence('implementation', "bootboxAlert = 'Invalid SoundCloud URL...';"),
      evidence('implementation', "onclick={() => toggleTopMenu('soundcloud')}")
    ]
  },
  {
    control: 'microphone toggle',
    source: [
      evidence('roomDom', 'id="unmuteMuteMicrophone"'),
      evidence('roomTemplateRuntime', 'E(g(2).toggleMic())'),
      evidence('roomCompiled', 'toggleMic() {'),
      evidence('roomCompiled', 'this.mediaService.toggleMicMute();'),
      evidence(
        'deployedBundle',
        'Your browser does not support microphone access. Please use Chrome, Firefox, or Safari.'
      ),
      evidence(
        'deployedBundle',
        'No microphone detected. Please ensure you have a microphone connected and try again.'
      )
    ],
    implementation: [
      evidence('implementation', 'async function toggleMicrophone() {'),
      evidence('implementation', 'onclick={toggleMicrophone}'),
      evidence(
        'implementation',
        'Your browser does not support microphone access. Please use Chrome, Firefox, or Safari.'
      ),
      evidence(
        'implementation',
        'No microphone detected. Please ensure you have a microphone connected and try again.'
      )
    ]
  },
  {
    control: 'microphone A/V device gear',
    source: [
      evidence('roomDom', 'title="Audio Device Settings" class="nav-link mic-gear-btn p-0 m-0"'),
      evidence('roomTemplateRuntime', 'E(g(2).openAvDeviceSelection())'),
      evidence('roomCompiled', 'openAvDeviceSelection() {'),
      evidence('roomCompiled', "un('#session-control-modal').modal('show')"),
      evidence('roomCompiled', "un('#av-device-selection-tab').tab('show')")
    ],
    implementation: [
      evidence('implementation', "onclick={() => openSessionControl('av-device-selection')}"),
      evidence('implementation', 'type SessionControlTab =')
    ]
  },
  {
    control: 'screen-share menu and both captured sources',
    source: [
      evidence('roomDom', 'id="dropdownScreenSharing"'),
      evidence('roomDom', '>Share Screen </a>'),
      evidence('roomDom', '> OBS / XSPLIT/ Share Virtual Cam</a>'),
      evidence('roomTemplateRuntime', 'mediaService.startScreenSharing(512e3)'),
      evidence('roomTemplateRuntime', "mediaService.startScreenSharing('camera')"),
      evidence(
        'deployedBundle',
        'Screen sharing is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.'
      )
    ],
    implementation: [
      // The menu opens the naming prompt, which opens the capture - the order the captured
      // `startScreenSharing(e)` uses, where `pa.prompt` runs before any getDisplayMedia call. This
      // check used to pin `onclick={() => startScreenSharing(...)}` directly, from before the
      // prompt was found in the bundle.
      evidence('implementation', "onclick={() => promptForScreenName('screen')}"),
      evidence('implementation', "onclick={() => promptForScreenName('camera')}"),
      evidence(
        'implementation',
        "async function startScreenSharing(source: 'screen' | 'camera', screenName: string)"
      ),
      evidence('implementation', 'width: { max: 1920 }'),
      evidence('implementation', 'height: { max: 1080 }'),
      evidence('implementation', 'frameRate: { max: 30 }')
    ]
  },
  {
    control: 'webcam toggle',
    source: [
      evidence('roomDom', 'id="startStopWebCam"'),
      evidence('roomTemplateRuntime', 'E(g(2).toggleWebcam())'),
      evidence('roomCompiled', 'toggleWebcam() {'),
      evidence('roomCompiled', 'this.mediaService.toggleCamMute()'),
      evidence(
        'deployedBundle',
        'Your browser does not support camera access. Please use Chrome, Firefox, or Safari.'
      ),
      evidence(
        'deployedBundle',
        'No camera detected. Please ensure you have a camera connected and try again.'
      )
    ],
    implementation: [
      evidence('implementation', 'async function toggleWebcam() {'),
      evidence('implementation', 'onclick={toggleWebcam}'),
      evidence(
        'implementation',
        'Your browser does not support camera access. Please use Chrome, Firefox, or Safari.'
      ),
      evidence(
        'implementation',
        'No camera detected. Please ensure you have a camera connected and try again.'
      )
    ]
  },
  {
    control: 'session-control gear',
    source: [
      evidence('roomDom', 'title="Session Control"'),
      evidence('roomDom', 'data-bs-target="#session-control-modal"'),
      evidence('roomTemplateRuntime', 'E(g(2).doSessionControl())'),
      evidence('roomCompiled', 'doSessionControl() {'),
      evidence('roomCompiled', "this.appService.guiEventBus.emit('doSessionControlModal')")
    ],
    implementation: [
      evidence('implementation', 'onclick={() => openSessionControl()}'),
      evidence(
        'implementation',
        "function openSessionControl(tab: SessionControlTab = 'reset-session')"
      )
    ]
  },
  {
    control: 'recording menu and state transitions',
    source: [
      evidence('roomDom', 'id="dropdownRecording"'),
      evidence('roomDom', "Can't start recording without screenshare"),
      evidence('roomCompiled', 'startRecording(e) {'),
      evidence('roomCompiled', 'stopRecording(e) {'),
      evidence('roomCompiled', 'pauseRecording() {'),
      evidence('roomCompiled', 'resumeRecording() {')
    ],
    implementation: [
      evidence('implementation', 'function startRecording() {'),
      evidence('implementation', 'function stopRecording() {'),
      evidence('implementation', 'function pauseRecording() {'),
      evidence('implementation', 'function resumeRecording() {'),
      evidence('implementation', "Can't start recording without screenshare")
    ]
  },
  {
    control: 'volume DOM, slider, mute and unmute',
    source: [
      evidence('roomDom', 'class="nav-item dropdown dropstart"'),
      evidence('roomDom', 'id="dropdownVolume"'),
      evidence('roomDom', 'audiovolslider=""'),
      evidence('roomTemplateRuntime', 'E(g().adjustVol(o))'),
      evidence('roomCompiled', 'adjustVol(e) {'),
      evidence('roomCompiled', 'mute() {'),
      evidence('roomCompiled', 'unmute() {')
    ],
    implementation: [
      evidence('implementation', 'function setMasterVolume(nextVolume: number) {'),
      evidence('implementation', 'function toggleMute() {'),
      evidence('implementation', 'audiovolslider=""'),
      evidence(
        'implementation',
        'setMasterVolume(Number((event.currentTarget as HTMLInputElement).value))'
      )
    ]
  },
  {
    control: 'exact volume icon boundaries',
    source: [
      evidence('roomTemplateRuntime', 'O(33, e.audioVolume > 50 ? 33 : -1)'),
      evidence('roomTemplateRuntime', 'e.audioVolume < 50 && e.audioVolume > 4 ? 34 : -1'),
      evidence('roomTemplateRuntime', 'O(35, e.audioVolume < 4 ? 35 : -1)')
    ],
    implementation: [
      evidence('implementation', '{#if volume > 50}'),
      evidence('implementation', '{:else if volume < 50 && volume > 4}'),
      evidence('implementation', '{:else if volume < 4}')
    ]
  },
  {
    control: 'navbar dropdown placement',
    source: [
      evidence('roomDom', 'class="dropdown-menu dropdown-menu-end soundcloud-options"'),
      evidence('roomDom', 'class="screen-options-start-screen dropdown-menu dropdown-menu-end"'),
      evidence('stylesheet', '.dropdown-menu-end[data-bs-popper] { right: 0px; left: auto; }'),
      evidence(
        'stylesheet',
        '.dropstart .dropdown-menu[data-bs-popper] { top: 0px; right: 100%; left: auto;'
      ),
      evidence('stylesheet', '.dropdown-menu.show { display: block; }')
    ],
    implementation: [
      evidence('implementation', "data-bs-popper={soundCloudMenuOpen ? 'static' : undefined}"),
      evidence('implementation', "data-bs-popper={screenShareMenuOpen ? 'static' : undefined}"),
      evidence('implementation', "data-bs-popper={volumeOpen ? 'static' : undefined}")
    ]
  },
  {
    control: 'volume-panel sound switches',
    source: [
      evidence('roomDom', 'id="alert-donot-disturb"'),
      evidence('roomDom', 'id="qa-donot-disturb"'),
      evidence('roomDom', 'id="non-trade-donot-disturb"'),
      evidence('roomDom', 'id="chat-donot-disturb"'),
      evidence('roomDom', 'id="presentation-subtitles"'),
      evidence('roomDom', 'id="app-donot-disturb"'),
      evidence('roomCompiled', 'alertSoundOnChange() {'),
      evidence('roomCompiled', 'qaSoundOnChange() {'),
      evidence('roomCompiled', 'nonTradeSoundOnChange() {'),
      evidence('roomCompiled', 'chatSoundOnChange() {'),
      evidence('roomCompiled', 'subtitlesOnChange() {'),
      evidence('roomCompiled', 'doNotDisturbOnChange() {')
    ],
    implementation: [
      evidence('implementation', 'function updateSoundCheck(event: Event) {'),
      evidence('implementation', "'alert-donot-disturb': 'alertSoundOn'"),
      evidence('implementation', "'non-trade-donot-disturb': 'nonTradeSound'"),
      evidence('implementation', "'qa-donot-disturb': 'qaSoundOn'"),
      evidence('implementation', "'chat-donot-disturb': 'chatSoundOn'"),
      evidence('implementation', "'presentation-subtitles': 'showSpeechRecoOverlay'")
    ]
  },
  {
    control: 'reload confirmation',
    source: [
      evidence('roomDom', 'title="Reload" class="nav-item"'),
      evidence('roomTemplateRuntime', 'E(g().doReload())'),
      evidence('roomCompiled', 'doReload() {'),
      evidence('roomCompiled', "bootbox.confirm('Are you sure you want to reload the page?'")
    ],
    implementation: [
      evidence('implementation', 'function requestReload() {'),
      evidence('implementation', "message: 'Are you sure you want to reload the page?'"),
      evidence('implementation', 'onclick={requestReload}')
    ]
  },
  {
    control: 'production browser-permission guidance',
    source: [
      evidence('deployedBundle', 'checkPermissionState(e)'),
      evidence('deployedBundle', 'getBrowserPermissionGuidance(e)'),
      evidence('deployedBundle', 'Permission denied. To enable'),
      evidence('deployedBundle', 'Settings > Privacy and security > Site Settings > '),
      evidence('deployedBundle', 'Settings > Privacy & Security > Permissions > '),
      evidence('deployedBundle', 'Safari > Preferences > Websites > '),
      evidence('deployedBundle', 'Settings > Cookies and site permissions > ')
    ],
    implementation: [
      evidence('implementation', 'async function checkPermissionState('),
      evidence('implementation', 'function getBrowserPermissionGuidance('),
      evidence('implementation', 'Permission denied. To enable ${mediaLabel}'),
      evidence(
        'implementation',
        'Settings > Privacy and security > Site Settings > ${permissionLabel}'
      ),
      evidence(
        'implementation',
        'Settings > Privacy & Security > Permissions > ${permissionLabel}'
      ),
      evidence('implementation', 'Safari > Preferences > Websites > ${permissionLabel}'),
      evidence('implementation', 'Settings > Cookies and site permissions > ${permissionLabel}')
    ]
  }
];

for (const check of checks) {
  check.sourcePassed = check.source.every((item) => item.found);
  check.implementationPassed = check.implementation.every((item) => item.found);
  check.passed = check.sourcePassed && check.implementationPassed;
}

const failures = checks.filter((check) => !check.passed);
console.log(
  JSON.stringify(
    {
      phase: 'Phase 1 — top room shell and navbar',
      authority: [
        fileURLToPath(files.roomDom),
        fileURLToPath(files.roomCompiled),
        fileURLToPath(files.roomTemplateRuntime),
        fileURLToPath(files.deployedBundle),
        fileURLToPath(files.stylesheet)
      ],
      implementation: fileURLToPath(files.implementation),
      checks,
      failures
    },
    null,
    2
  )
);
if (failures.length > 0) process.exitCode = 1;
