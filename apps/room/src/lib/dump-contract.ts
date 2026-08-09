/**
 * Verifiable facts encoded by part 1 of the supplied capture.
 * Unknown values are intentionally absent.
 */
export const DUMP_CONTRACT = {
  part: 1,
  captureCount: 58,
  viewport: {
    width: 1842,
    height: 1265,
    devicePixelRatio: 2
  },
  baseline: {
    themeClass: 'lightTheme',
    topbarHeight: 49,
    sidebarWidth: 250,
    primaryColumnWidth: 556.5,
    splitGutterWidth: 11,
    presentationColumnWidth: 1024.5,
    alertsHeight: 483.6,
    chatHeight: 721.4,
    panelHeaderHeight: 48,
    composerHeight: 45
  },
  mainTabs: ['Screens', 'Notes', 'Files'],
  fileTabs: ['Files', 'Images', 'Sounds'],
  chatTabs: ['Main Chat', 'Off Topic'],
  settingsTabs: ['App Settings', 'Alert Settings', 'Chat Settings'],
  alertTabs: ['Text Alert', 'Text Url', 'Image / GIF / Video'],
  sidebarLabels: [
    'Connectivity Check',
    'General Settings',
    'Manage Muted Users',
    'Manage Followed Users'
  ],
  userCount: 1,
  version: 'v4.0.1-61268ec1',
  colors: {
    chatText: '#1a1a1a',
    chatUsername: '#000000',
    chatBackground: '#f1f1f1',
    chatTicker: '#676767'
  }
} as const;
