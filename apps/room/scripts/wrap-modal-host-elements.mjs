import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const targetPath = resolve('src/lib/components/ModalHost.svelte');
const wrappers = [
  ['user-modal', 'app-user-info-modal'],
  ['play-youtube-modal', 'app-play-youtube-modal'],
  ['user-settings-modal', 'app-user-settings-modal'],
  ['av-settings-modal', 'app-av-settings-modal'],
  ['debug-log-modal', 'app-debug-log-modal'],
  ['alert-modal', 'app-post-alert-modal'],
  ['chat-logs-modal', 'app-chat-logs-modal'],
  ['alerts-logs-modal', 'app-alert-logs-modal'],
  ['session-control-modal', 'app-session-control-modal'],
  ['mobileAppInfoModal', 'app-mobile-app-info-modal'],
  ['replyModal', 'app-reply-modal'],
  ['alertQAModal', 'app-alert-qa-modal'],
  ['mutedUsersModal', 'app-muted-users-modal'],
  ['followedUsersModal', 'app-followed-users-modal'],
  ['followedUsersModal', 'app-followed-users-modal'],
  ['scheduledAlertsModal', 'app-scheduled-alerts-modal'],
  ['alert-send-report-modal', 'app-alert-send-report-modal'],
  ['all-user-pm-modal', 'app-all-user-pmmodal'],
  ['alerts-advanced-search-modal', 'app-alerts-advanced-search'],
  ['alert-filter-modal', 'app-alert-filter-modal'],
  ['webrtc-troubleshooter-modal', 'app-webrtc-troubleshooter'],
  ['rteModal', 'app-rich-text-editor']
];

let source = await readFile(targetPath, 'utf8');
let cursor = 0;

for (const [id, tag] of wrappers) {
  const idPosition = source.indexOf(`id="${id}"`, cursor);
  if (idPosition === -1) throw new Error(`Could not find modal id ${id}`);

  const modalStart = source.lastIndexOf('<Modal', idPosition);
  const modalClose = source.indexOf('</Modal>', idPosition);
  if (modalStart === -1 || modalClose === -1) {
    throw new Error(`Could not resolve Modal boundaries for ${id}`);
  }

  const modalEnd = modalClose + '</Modal>'.length;
  source =
    source.slice(0, modalStart) +
    `<${tag}>\n` +
    source.slice(modalStart, modalEnd) +
    `\n</${tag}>` +
    source.slice(modalEnd);
  cursor = modalEnd + tag.length * 2 + 5;
}

await writeFile(targetPath, source);
