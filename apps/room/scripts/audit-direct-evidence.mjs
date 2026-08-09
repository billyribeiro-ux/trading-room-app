import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'parse5';
import { DIRECT_EVIDENCE_CONTRACT } from '../src/lib/direct-evidence-contract.ts';

const root = new URL('../', import.meta.url);
const modalSource = readFileSync(new URL('src/lib/components/ModalHost.svelte', root), 'utf8');
const pageSource = readFileSync(new URL('src/routes/+page.svelte', root), 'utf8');
const messageSource = readFileSync(new URL('src/lib/components/RoomMessage.svelte', root), 'utf8');
const schemaSource = readFileSync(new URL('src/lib/server/db/schema.ts', root), 'utf8');

const modalRootHosts = [...modalSource.matchAll(/^<(app-[a-z0-9-]+)/gm)].map((match) => match[1]);
const sourceRootHosts = [...modalRootHosts, 'app-privchat'];
const expectedRootHosts = [...DIRECT_EVIDENCE_CONTRACT.rootHostOrder];

const requiredMessageEvidence = [
  'app-st-message',
  "clas: 'd-flex flex-column  align-items-center w-100 '",
  'msg-box pb-1',
  'msg-box-adm',
  'flex-row-reverse',
  'msgMenu dropright pt-1',
  'dropdown-menu users-dropdown-options',
  'Delete Message',
  'Mute Chat for 24hrs',
  'User Info',
  'Mention',
  'Show message to all',
  'Alert Send Report',
  'Copy',
  'Reply',
  'Mark Answered',
  'Private Chat',
  'alert-qa',
  'questionCount',
  'questionAnswered',
  'item.isAdmin === true',
  "item.body.includes('?')",
  'canPublicReply',
  'item.backgroundColor',
  'item.fontColor',
  'stockColor',
  'questionColor',
  'img-container',
  'uploaded-img',
  'longDateFormatter',
  'alertDateFormatter',
  'chatTimeFormatter'
];

const requiredSchemaEvidence = [
  "isAdmin: integer('is_admin'",
  "backgroundColor: text('background_color'",
  "fontColor: text('font_color'",
  "questionCount: integer('question_count'",
  "questionAnswered: integer('question_answered'"
];

const expectedMainNavTitles = [
  'Star/Stop Recording',
  'Play music from SoundCloud for all',
  'Unmute/Mute Microphone',
  'Start/Stop Screen Sharing',
  'Start / Stop WebCam',
  'Session Control',
  'Reload'
];

const expectedMainNavControlIds = [
  'dropdownRecording',
  'soundcloudDropdown',
  'unmuteMuteMicrophone',
  'dropdownScreenSharing',
  'startStopWebCam',
  'dropdownVolume'
];

const requiredMainNavBehaviorEvidence = [
  'let sidebarOpen = $state(false)',
  "openSessionControl('av-device-selection')",
  'navigator.mediaDevices.getUserMedia({ audio: true })',
  'navigator.mediaDevices.getDisplayMedia',
  "startScreenSharing('camera')",
  "message: 'Are you sure you want to reload the page?'",
  'window.location.reload()',
  'You can play SoundCloud music for all. Click on "Share" from your track or playlist, copy and paste the share url here',
  "value.indexOf('https://soundcloud.com') !== 0",
  "bootboxAlert = 'Invalid SoundCloud URL...'",
  'new MediaRecorder(screenStream)',
  'screenRecorder.pause()',
  'screenRecorder.resume()'
];

const sourceAudit = {
  rootHostOrderExact:
    sourceRootHosts.length === expectedRootHosts.length &&
    sourceRootHosts.every((host, index) => host === expectedRootHosts[index]),
  sourceRootHosts,
  expectedRootHosts,
  messageEvidence: requiredMessageEvidence.map((token) => ({
    token,
    present: messageSource.includes(token)
  })),
  schemaEvidence: requiredSchemaEvidence.map((token) => ({
    token,
    present: schemaSource.includes(token)
  })),
  alertHeaderEvidence: {
    bellBeforeAlerts: pageSource.indexOf('<i class="fas fa-bell me-1"></i> Alerts') !== -1,
    poll: pageSource.includes('<i class="fas fa-question-circle"></i> Poll'),
    postAlert: pageSource.includes('<i class="fas fa-plus-circle"></i> Post Alert'),
    privateChat: pageSource.includes('title="Open Private chat"')
  },
  mainNavBehaviorEvidence: requiredMainNavBehaviorEvidence.map((token) => ({
    token,
    present: pageSource.includes(token)
  }))
};

function attributes(node) {
  return Object.fromEntries(
    (node.attrs ?? []).map((attribute) => [attribute.name, attribute.value])
  );
}

function walk(node, visit) {
  visit(node);
  for (const child of node.childNodes ?? []) walk(child, visit);
}

function hasClass(node, className) {
  return (attributes(node).class ?? '').split(/\s+/).includes(className);
}

function textContent(node) {
  let value = '';
  walk(node, (current) => {
    if (current.nodeName === '#text') value += current.value;
  });
  return value.replace(/\s+/g, ' ').trim();
}

function first(document, predicate) {
  let match;
  walk(document, (node) => {
    if (!match && predicate(node)) match = node;
  });
  return match;
}

function descendants(node, predicate) {
  const matches = [];
  walk(node, (current) => {
    if (predicate(current)) matches.push(current);
  });
  return matches;
}

const populatedDocument = parse(readFileSync(new URL('alert-section/1.html', root), 'utf8'));
const suppliedMessages = [];

function collectSuppliedMessages(node, ancestors = []) {
  if (node.nodeName === 'app-st-message') {
    const panel = ancestors.some((ancestor) => ancestor.nodeName === 'app-alerts')
      ? 'alert'
      : 'chat';
    const messageBox = first(node, (current) => hasClass(current, 'msg-box'));
    const separator = first(node, (current) => hasClass(current, 'separator'));
    const username = first(node, (current) => hasClass(current, 'username'));
    const timestamp = first(node, (current) => hasClass(current, 'created-at'));
    const messageBody = first(node, (current) => hasClass(current, 'msg-left'));
    const avatar = first(
      node,
      (current) => current.nodeName === 'img' && attributes(current).alt === 'msg.avt'
    );
    const menuItems = descendants(
      node,
      (current) => current.nodeName === 'a' && hasClass(current, 'dropdown-item')
    ).map(textContent);
    const stockSpans = descendants(node, (current) => hasClass(current, 'stockColor'));
    const uploadedImages = descendants(node, (current) => hasClass(current, 'uploaded-img'));
    const questionCount = first(
      node,
      (current) => current.nodeName === 'span' && hasClass(current, 'me-1')
    );
    const messageRow = first(
      node,
      (current) =>
        current.nodeName === 'div' && hasClass(current, 'mr-1') && hasClass(current, 'd-flex')
    );

    suppliedMessages.push({
      sequence: suppliedMessages.length + 1,
      panel,
      sender: textContent(username ?? {}),
      avatar: attributes(avatar ?? {}).src ?? null,
      timestamp: textContent(timestamp ?? {}),
      body: textContent(messageBody ?? {}),
      separator: separator ? textContent(separator) : null,
      messageBoxClass: attributes(messageBox ?? {}).class ?? null,
      messageBoxStyle: attributes(messageBox ?? {}).style ?? null,
      direction: hasClass(messageRow ?? {}, 'flex-row-reverse') ? 'reverse' : 'forward',
      question: Boolean(first(node, (current) => hasClass(current, 'questionColor'))),
      questionCount: questionCount ? textContent(questionCount) : null,
      answered: textContent(node).includes('✅'),
      stockSpans: stockSpans.map(textContent),
      uploadedImages: uploadedImages.map((image) => attributes(image).src),
      replyEnabled: menuItems.includes('Reply'),
      menuItems
    });
  }

  for (const child of node.childNodes ?? []) {
    collectSuppliedMessages(child, [...ancestors, node]);
  }
}

collectSuppliedMessages(populatedDocument);

const measuredSuppliedStates = {
  alertMessages: suppliedMessages.filter((message) => message.panel === 'alert').length,
  alertDateSeparators: suppliedMessages.filter(
    (message) => message.panel === 'alert' && message.separator
  ).length,
  alertStockSpans: suppliedMessages
    .filter((message) => message.panel === 'alert')
    .reduce((total, message) => total + message.stockSpans.length, 0),
  alertUploadedImages: suppliedMessages
    .filter((message) => message.panel === 'alert')
    .reduce((total, message) => total + message.uploadedImages.length, 0),
  alertQuestionCountBadges: suppliedMessages.filter(
    (message) => message.panel === 'alert' && message.questionCount
  ).length,
  alertAnsweredChecks: suppliedMessages.filter(
    (message) => message.panel === 'alert' && message.answered
  ).length,
  chatMessages: suppliedMessages.filter((message) => message.panel === 'chat').length,
  chatDateSeparators: suppliedMessages.filter(
    (message) => message.panel === 'chat' && message.separator
  ).length,
  chatAdminReverseRows: suppliedMessages.filter(
    (message) => message.panel === 'chat' && message.direction === 'reverse'
  ).length,
  chatQuestionRows: suppliedMessages.filter(
    (message) => message.panel === 'chat' && message.question
  ).length
};

const suppliedStatesExact = Object.entries(DIRECT_EVIDENCE_CONTRACT.suppliedMessageStates).every(
  ([key, value]) => measuredSuppliedStates[key] === value
);

let liveAudit = null;
const htmlArgument = process.argv.find((argument) => argument.startsWith('--html='));
if (htmlArgument) {
  const htmlPath = htmlArgument.slice('--html='.length);
  const document = parse(readFileSync(htmlPath, 'utf8'));
  const liveRootHosts = [];
  const expectedHostSet = new Set(expectedRootHosts);
  walk(document, (node) => {
    if (expectedHostSet.has(node.nodeName)) liveRootHosts.push(node.nodeName);
  });

  const primaryArea = first(
    document,
    (node) => node.nodeName === 'as-split-area' && hasClass(node, 'alert-chat-box')
  );
  const alertHeader = first(
    document,
    (node) => node.nodeName === 'nav' && hasClass(node, 'alertHeader')
  );
  const firstMessage = first(document, (node) => node.nodeName === 'app-st-message');
  const firstMessageBox = first(firstMessage ?? {}, (node) => hasClass(node, 'msg-box'));
  const malformedClassNode = first(
    firstMessage ?? {},
    (node) => attributes(node).clas === 'd-flex flex-column  align-items-center w-100 '
  );
  const mainNav = first(
    document,
    (node) => node.nodeName === 'nav' && hasClass(node, 'mainAppNav')
  );
  const mainNavTitles = descendants(
    mainNav ?? {},
    (node) => node.nodeName === 'li' && expectedMainNavTitles.includes(attributes(node).title)
  ).map((node) => attributes(node).title);
  const mainNavControlIds = descendants(mainNav ?? {}, (node) =>
    expectedMainNavControlIds.includes(attributes(node).id)
  ).map((node) => attributes(node).id);

  liveAudit = {
    htmlPath,
    rootHostOrderExact:
      liveRootHosts.length === expectedRootHosts.length &&
      liveRootHosts.every((host, index) => host === expectedRootHosts[index]),
    liveRootHosts,
    primaryAreaStyle: attributes(primaryArea ?? {}).style,
    primaryAreaStyleExact:
      attributes(primaryArea ?? {}).style ===
      `order: 0; flex: 0 0 ${DIRECT_EVIDENCE_CONTRACT.populatedRoom.primaryFlex};`,
    alertHeaderText: textContent(alertHeader ?? {}),
    alertHeaderLabelsPresent: ['Alerts', 'Poll', 'Post Alert'].every((label) =>
      textContent(alertHeader ?? {}).includes(label)
    ),
    firstMessagePresent: Boolean(firstMessage),
    firstMessageBoxPresent: Boolean(firstMessageBox),
    malformedClasAttributeExact: Boolean(malformedClassNode),
    mainNavTitles,
    mainNavTitlesExact:
      mainNavTitles.length === expectedMainNavTitles.length &&
      mainNavTitles.every((title, index) => title === expectedMainNavTitles[index]),
    mainNavControlIds,
    mainNavControlIdsExact:
      mainNavControlIds.length === expectedMainNavControlIds.length &&
      mainNavControlIds.every((id, index) => id === expectedMainNavControlIds[index]),
    recordingDisabledTextExact: textContent(mainNav ?? {}).includes(
      "Can't start recording without screenshare"
    ),
    soundCloudCommandsExact: [
      'Play a track or playlist from SoundCloud',
      'Stop Playing For All',
      'Stop Playing For Me'
    ].every((label) => textContent(mainNav ?? {}).includes(label))
  };
}

const report = {
  generatedAt: new Date().toISOString(),
  suppliedMessageStates: DIRECT_EVIDENCE_CONTRACT.suppliedMessageStates,
  measuredSuppliedStates,
  suppliedStatesExact,
  suppliedMessages,
  sourceAudit,
  liveAudit
};

const failures = [
  !sourceAudit.rootHostOrderExact && 'source root-host order',
  !suppliedStatesExact && 'supplied app-st-message state counts',
  sourceAudit.messageEvidence.some((item) => !item.present) && 'message evidence tokens',
  sourceAudit.schemaEvidence.some((item) => !item.present) && 'Drizzle message-state fields',
  sourceAudit.mainNavBehaviorEvidence.some((item) => !item.present) &&
    'main navigation behavior evidence',
  Object.values(sourceAudit.alertHeaderEvidence).some((value) => !value) &&
    'alert/chat header controls',
  liveAudit && !liveAudit.rootHostOrderExact && 'live root-host order',
  liveAudit && !liveAudit.primaryAreaStyleExact && 'live populated-room primary geometry',
  liveAudit && !liveAudit.alertHeaderLabelsPresent && 'live alert header labels',
  liveAudit && !liveAudit.mainNavTitlesExact && 'live main navigation title order',
  liveAudit && !liveAudit.mainNavControlIdsExact && 'live main navigation control order',
  liveAudit && !liveAudit.recordingDisabledTextExact && 'live disabled recording branch',
  liveAudit && !liveAudit.soundCloudCommandsExact && 'live SoundCloud command labels',
  liveAudit &&
    liveAudit.firstMessagePresent &&
    !liveAudit.firstMessageBoxPresent &&
    'live message box',
  liveAudit &&
    liveAudit.firstMessagePresent &&
    !liveAudit.malformedClasAttributeExact &&
    'live literal clas attribute'
].filter(Boolean);

report.failures = failures;
writeFileSync(
  new URL('docs/generated/direct-followup-evidence.json', root),
  `${JSON.stringify(report, null, 2)}\n`
);

console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
