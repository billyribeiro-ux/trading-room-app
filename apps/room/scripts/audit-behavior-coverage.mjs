import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_CAPTURE = 'proroom-ULTIMATE-staff-2026-07-24T12-42-02-part1.json';
const capturePath = resolve(process.argv[2] ?? DEFAULT_CAPTURE);
const outputPath = resolve('docs/generated/part-1-behavior-coverage.json');
const pagePath = resolve('src/routes/+page.svelte');
const modalHostPath = resolve('src/lib/components/ModalHost.svelte');

const [payload, pageSource, modalHostSource] = await Promise.all([
  readFile(capturePath, 'utf8').then(JSON.parse),
  readFile(pagePath, 'utf8'),
  readFile(modalHostPath, 'utf8')
]);

const baselineNodes = payload.caps[0].fullDom.nodes;
const allCapturedOccurrences = payload.caps.flatMap((capture, captureIndex) => {
  const treeKind = capture.fullDom ? 'fullDom' : 'subtree';
  return capture[treeKind].nodes.map((node) => ({ captureIndex, node }));
});

const modalNameById = {
  'user-modal': 'user',
  'play-youtube-modal': 'youtube',
  'user-settings-modal': 'settings',
  'av-settings-modal': 'av',
  'debug-log-modal': 'debug',
  'alert-modal': 'alert',
  pollModalCompHolder: 'poll',
  'chat-logs-modal': 'chat-logs',
  'alerts-logs-modal': 'alert-logs',
  'session-control-modal': 'session',
  mobileAppInfoModal: 'mobile',
  replyModal: 'reply',
  alertQAModal: 'qa',
  mutedUsersModal: 'muted',
  followedUsersModal: 'followed',
  scheduledAlertsModal: 'scheduled',
  'alert-send-report-modal': 'report',
  'all-user-pm-modal': 'all-private',
  'alerts-advanced-search-modal': 'advanced-search',
  'alert-filter-modal': 'alert-filter',
  'webrtc-troubleshooter-modal': 'connectivity',
  rteModal: 'rich-text'
};

function countLiteral(source, literal) {
  let count = 0;
  let offset = 0;

  while ((offset = source.indexOf(literal, offset)) !== -1) {
    count += 1;
    offset += literal.length;
  }

  return count;
}

function referencesTarget(node, id) {
  return Object.values(node.attrs ?? {}).some((value) => value === `#${id}`);
}

function isToastLike(node) {
  return /toast|toastr|snackbar/i.test(
    [node.tag, node.text, ...Object.entries(node.attrs ?? {}).flat()].join(' ')
  );
}

const modalRootOccurrences = baselineNodes
  .filter((node) => {
    const id = node.attrs?.id;
    if (!id || !modalNameById[id]) return false;
    return id === 'pollModalCompHolder' || /(^|\s)modal(\s|$)/.test(node.attrs?.class ?? '');
  })
  .map((node) => node.attrs.id);
const modalIds = [...new Set(modalRootOccurrences)];

const modals = modalIds.map((id) => {
  const name = modalNameById[id];
  const captureStates = payload.caps.flatMap((capture, captureIndex) => {
    const treeKind = capture.fullDom ? 'fullDom' : 'subtree';
    const root = capture[treeKind].nodes[0];
    return root?.attrs?.id === id ? [{ captureIndex, label: capture.label }] : [];
  });
  const capturedAttributeTriggers = baselineNodes
    .filter((node) => referencesTarget(node, id))
    .map((node) => ({
      path: node.path,
      tag: node.tag,
      id: node.attrs?.id ?? null,
      class: node.attrs?.class ?? null,
      title: node.attrs?.title ?? null,
      text: String(node.text ?? '')
        .replace(/\s+/g, ' ')
        .trim()
    }));
  const runtimeTriggerCount = countLiteral(pageSource, `openModal('${name}')`);
  const runtimeTemplateCount =
    countLiteral(modalHostSource, `id="${id}"`) + countLiteral(modalHostSource, `id='${id}'`);

  return {
    id,
    runtimeName: name,
    captureStates,
    capturedAttributeTriggers,
    runtimeTemplateCount,
    runtimeTriggerCount,
    disposition:
      capturedAttributeTriggers.length > 0 && runtimeTriggerCount === 0
        ? 'captured-trigger-not-wired'
        : runtimeTriggerCount > 0
          ? 'runtime-trigger-wired'
          : 'captured-body-no-trigger-evidence'
  };
});

const tabFamilies = [
  {
    family: 'main',
    sourceState: 'mainTab',
    values: [
      { value: 'screens', target: '#screens', hidden: false },
      { value: 'streams', target: '#streams', hidden: true },
      { value: 'notes', target: '#notes', hidden: false },
      { value: 'files', target: '#files', hidden: false },
      { value: 'videoplayer', target: '#videoplayer', hidden: false, directFollowup: true }
    ]
  },
  {
    family: 'files',
    sourceState: 'fileTab',
    values: [
      { value: 'files', target: null, hidden: false },
      { value: 'images', target: null, hidden: false },
      { value: 'sounds', target: null, hidden: false }
    ]
  },
  {
    family: 'settings',
    sourceState: 'settingsTab',
    activation: 'onSettingsTab',
    values: [
      { value: 'app', target: '#user-app-settings', hidden: false },
      { value: 'alerts', target: '#user-alert-settings', hidden: false },
      { value: 'chat', target: '#user-chat-settings', hidden: false }
    ]
  },
  {
    family: 'alert',
    sourceState: 'alertTab',
    activation: 'onAlertTab',
    values: [
      { value: 'text', target: '#nav-text', hidden: false },
      { value: 'url', target: '#nav-url', hidden: false },
      { value: 'media', target: '#nav-img', hidden: false }
    ]
  }
];

const tabs = tabFamilies.map((family) => ({
  ...family,
  values: family.values.map((tab) => {
    const activation = family.activation
      ? `${family.activation}('${tab.value}')`
      : `${family.sourceState} = '${tab.value}'`;
    const source =
      family.family === 'settings' || family.family === 'alert' ? modalHostSource : pageSource;
    const runtimeActivationCount = countLiteral(source, activation);

    return {
      ...tab,
      runtimeActivationCount,
      disposition:
        tab.hidden && runtimeActivationCount === 0
          ? 'captured-hidden-inert'
          : runtimeActivationCount > 0
            ? 'runtime-state-wired'
            : 'no-runtime-state-activation'
    };
  })
}));

const toastLikeOccurrences = allCapturedOccurrences.filter(({ node }) => isToastLike(node));
const capturedTriggerGaps = modals
  .filter((modal) => modal.disposition === 'captured-trigger-not-wired')
  .map(({ id, runtimeName }) => ({ id, runtimeName }));
const directFollowupStates = [
  {
    name: 'file-upload',
    evidence: 'User-supplied Bootbox DOM fragment and 1138 × 601 screenshot',
    runtimeTriggerCount: countLiteral(pageSource, "openModal('file-upload')"),
    runtimeConditionalRootCount: countLiteral(modalHostSource, "name === 'file-upload'"),
    verificationReport: resolve('docs/generated/direct-file-upload-dom.json')
  }
];

const report = {
  generatedAt: new Date().toISOString(),
  evidence: {
    capturePath,
    pagePath,
    modalHostPath
  },
  summary: {
    capturedNodeOccurrences: allCapturedOccurrences.length,
    modalRootOccurrences: modalRootOccurrences.length,
    uniqueModalRootIds: modals.length,
    uniqueModalRootsRendered: modals.filter((modal) => modal.runtimeTemplateCount > 0).length,
    runtimeModalRootOccurrences: modals.reduce(
      (total, modal) => total + modal.runtimeTemplateCount,
      0
    ),
    modalsWithCapturedAttributeTriggers: modals.filter(
      (modal) => modal.capturedAttributeTriggers.length > 0
    ).length,
    modalsWithRuntimeTriggers: modals.filter((modal) => modal.runtimeTriggerCount > 0).length,
    capturedTriggerGaps,
    toastLikeNodeOccurrences: toastLikeOccurrences.length,
    directFollowupStates: directFollowupStates.length,
    directFollowupRuntimeTriggers: directFollowupStates.reduce(
      (total, state) => total + state.runtimeTriggerCount,
      0
    )
  },
  modals,
  tabs,
  directFollowupStates,
  toastEvidence: {
    capturedOccurrences: toastLikeOccurrences.map(({ captureIndex, node }) => ({
      captureIndex,
      path: node.path,
      tag: node.tag,
      id: node.attrs?.id ?? null,
      class: node.attrs?.class ?? null,
      text: String(node.text ?? '')
        .replace(/\s+/g, ' ')
        .trim()
    })),
    disposition:
      toastLikeOccurrences.length === 0
        ? 'stylesheet-support-only-no-captured-toast-state'
        : 'captured-toast-state-present'
  }
};

await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
process.stdout.write(`${outputPath}\n`);
