import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const files = {
  deployedBundle: new URL('../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  room: new URL('../docs/source/components/app-room.full.js', import.meta.url),
  alerts: new URL('../docs/source/components/app-alerts.full.js', import.meta.url),
  chat: new URL('../docs/source/components/app-chat.full.js', import.meta.url),
  privateChat: new URL('../docs/source/components/app-privchat.full.js', import.meta.url),
  settings: new URL('../docs/source/components/app-user-settings-modal.full.js', import.meta.url),
  youtube: new URL('../docs/source/components/app-ytplayer.full.js', import.meta.url),
  streaming: new URL('../docs/source/components/app-streaming-view.full.js', import.meta.url),
  manifest: new URL('../docs/source/components/manifest.json', import.meta.url),
  page: new URL('../src/routes/+page.svelte', import.meta.url),
  modalHost: new URL('../src/lib/components/ModalHost.svelte', import.meta.url),
  stylesheet: new URL('../css/complete-app-styles.css', import.meta.url)
};

const content = Object.fromEntries(
  Object.entries(files).map(([name, url]) => [name, readFileSync(url, 'utf8')])
);

function contains(file, needle) {
  const source = content[file];
  const index = source.indexOf(needle);
  return {
    file: fileURLToPath(files[file]),
    line: index === -1 ? null : source.slice(0, index).split('\n').length,
    needle,
    passed: index !== -1
  };
}

function excludes(file, needle) {
  const source = content[file];
  return {
    file: fileURLToPath(files[file]),
    needle,
    passed: !source.includes(needle)
  };
}

const checks = [
  {
    behavior: 'one global flag defaults false and loads with per-session preferences',
    assertions: [
      contains('deployedBundle', 'doNotDisturbOn:!1'),
      contains(
        'deployedBundle',
        'this.globals.preferences={...this.globals.preferences,...this.localstorage.getObject(`prefs-${this.globals.sessionID}`)}'
      ),
      contains('page', 'let doNotDisturbOn = $state(loadedSettings.doNotDisturbOn === true);')
    ]
  },
  {
    behavior: 'direct DND controls toggle only the global flag',
    assertions: [
      contains('room', 'doNotDisturbOnChange() {'),
      contains(
        'room',
        'this.appService.globals.preferences.doNotDisturbOn =\n        !this.appService.globals.preferences.doNotDisturbOn;'
      ),
      contains('chat', 'setDND() {'),
      contains('privateChat', 'setDND() {'),
      contains('page', "if (input.id === 'app-donot-disturb') {"),
      contains('page', 'doNotDisturbOn = input.checked;'),
      contains('modalHost', 'onDoNotDisturbChange(input.checked);')
    ]
  },
  {
    behavior: 'master Mute and Unmute couple volume, DND, subtitles, and background volume',
    assertions: [
      contains('room', '(this.appService.globals.preferences.doNotDisturbOn = !0)'),
      contains('room', '(this.appService.globals.preferences.subtitles = !0)'),
      contains('room', '(this.appService.globals.preferences.doNotDisturbOn = !1)'),
      contains('room', '(this.appService.globals.preferences.subtitles = !1)'),
      contains('page', 'doNotDisturbOn = true;'),
      contains('page', 'doNotDisturbOn = false;')
    ]
  },
  {
    behavior: 'Alerts, Chat, and Private Chat render their exact conditional badges',
    assertions: [
      contains('alerts', "[1, 'badge', 'badge-danger', 'ms-2']"),
      contains('chat', "[1, 'badge', 'badge-danger', 'ml-2']"),
      contains('privateChat', "[1, 'badge', 'badge-danger', 'ml-2']"),
      contains('alerts', "v(2, ' DND')"),
      contains('chat', "v(2, ' DND')"),
      contains('privateChat', "v(2, ' DND')"),
      contains('page', '<span class="badge badge-danger ms-2"'),
      contains('page', '<span class="badge badge-danger ml-2"'),
      contains(
        'stylesheet',
        '.badge-danger { color: rgb(255, 255, 255); background-color: rgb(231, 76, 60); }'
      )
    ]
  },
  {
    behavior: 'DND is a control inside General Settings and Volume, not a standalone modal',
    assertions: [
      contains('settings', "['id', 'appDoNotDisturb', 'title', 'Do not disturb', 1, 'pb-2']"),
      contains('settings', "'app-donot-disturb'"),
      contains('room', "'app-donot-disturb'"),
      contains('modalHost', 'id="appDoNotDisturb"'),
      contains('modalHost', 'id="app-donot-disturb"'),
      excludes('manifest', 'app-dnd-modal'),
      excludes('manifest', 'app-do-not-disturb-modal')
    ]
  },
  {
    behavior:
      'DND suppresses alert, chat, private-message, poll, recording, and join/leave sounds at their handlers',
    assertions: [
      contains('alerts', '!this.appService.globals.preferences.doNotDisturbOn &&'),
      contains('alerts', 'this.soundEffectsService.cash.play()'),
      contains('chat', 'this.appService.globals.preferences.doNotDisturbOn ||'),
      contains('chat', 'this.soundEffectsService.pling.play()'),
      contains('privateChat', '!this.appService.globals.preferences.doNotDisturbOn &&'),
      contains('privateChat', "this.alertService.info(e.txt, 'Message from ' + e.n"),
      contains('room', 'this.soundEffectsService.recordingStart.play()'),
      contains('room', 'this.soundEffectsService.recordingStop.play()'),
      contains('room', 'this.soundEffectsService.fileShare.play()'),
      contains('room', 'this.soundEffectsService.userJoin.play()'),
      contains('room', 'this.soundEffectsService.userLeave.play()')
    ]
  },
  {
    behavior: 'new YouTube and HLS playback starts muted while DND is active',
    assertions: [
      contains('youtube', "this.appService.globals.preferences.doNotDisturbOn ? '&mute=1' : ''"),
      contains(
        'streaming',
        'e.volume = this.appService.globals.preferences.doNotDisturbOn\n              ? 0'
      )
    ]
  },
  {
    behavior: 'DND activation itself has no source toast or confirmation',
    assertions: [
      excludes('room', 'DND enabled'),
      excludes('room', 'Do not disturb enabled'),
      excludes('settings', 'DND enabled'),
      excludes('settings', 'Do not disturb enabled'),
      excludes('chat', 'bootbox.confirm("Do not disturb'),
      excludes('privateChat', 'bootbox.confirm("Do not disturb')
    ]
  }
];

let failed = 0;
for (const check of checks) {
  for (const assertion of check.assertions) {
    if (!assertion.passed) failed += 1;
  }
}

console.log(
  JSON.stringify(
    {
      sourceAuthority: 'deployed Angular bundle/components plus complete-app-styles.css',
      behaviors: checks.length,
      assertions: checks.reduce((total, check) => total + check.assertions.length, 0),
      failed,
      checks
    },
    null,
    2
  )
);

if (failed > 0) process.exitCode = 1;
