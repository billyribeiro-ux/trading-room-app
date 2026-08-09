import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import postcss from 'postcss';

const paths = {
  capture: resolve('proroom-ULTIMATE-staff-2026-07-24T12-42-02-part1.json'),
  sourceCss: resolve('css/complete-app-styles.css'),
  bridgedCss: resolve('src/lib/styles/captured-runtime-components.css'),
  tokensCss: resolve('src/lib/styles/tokens.css'),
  localCss: resolve('src/app.css'),
  capturedMarkup: resolve('alert-section/1.html'),
  route: resolve('src/routes/+page.svelte'),
  messageComponent: resolve('src/lib/components/RoomMessage.svelte'),
  report: resolve('docs/generated/alert-chat-style-contract.json')
};

const [
  captureText,
  sourceCss,
  bridgedCss,
  tokensCss,
  localCss,
  capturedMarkup,
  route,
  messageComponent
] = await Promise.all([
  readFile(paths.capture, 'utf8'),
  readFile(paths.sourceCss, 'utf8'),
  readFile(paths.bridgedCss, 'utf8'),
  readFile(paths.tokensCss, 'utf8'),
  readFile(paths.localCss, 'utf8'),
  readFile(paths.capturedMarkup, 'utf8'),
  readFile(paths.route, 'utf8'),
  readFile(paths.messageComponent, 'utf8')
]);

const capture = JSON.parse(captureText);
const baseline = capture.caps.find(({ label }) => label === 'baseline-room');
if (!baseline?.fullDom?.nodes) throw new Error('baseline-room full DOM capture is missing');
const nodes = baseline.fullDom.nodes;

function classes(node) {
  return String(node.attrs?.class ?? '')
    .split(/\s+/)
    .filter(Boolean);
}

function hasClass(node, className) {
  return classes(node).includes(className);
}

function descendant(root, predicate, description) {
  const node = nodes.find(
    (candidate) => candidate.path.startsWith(`${root.path}.`) && predicate(candidate)
  );
  if (!node) throw new Error(`Missing captured ${description}`);
  return node;
}

function exactNode(node, expected, description) {
  const actual = {
    fontFamily: node.style['font-family'],
    fontSize: node.style['font-size'],
    fontWeight: node.style['font-weight'],
    lineHeight: node.style['line-height'],
    width: node.rect.w,
    height: node.rect.h
  };
  for (const [property, value] of Object.entries(expected)) {
    if (actual[property] !== value) {
      throw new Error(
        `${description} ${property}: expected ${JSON.stringify(value)}, received ${JSON.stringify(actual[property])}`
      );
    }
  }
  return actual;
}

const alertHeader = nodes.find((node) => hasClass(node, 'alertHeader'));
const chatHeader = nodes.find((node) => hasClass(node, 'chatHeader'));
if (!alertHeader || !chatHeader) throw new Error('Captured Alert/Chat headers are missing');

const alertBrand = descendant(alertHeader, (node) => hasClass(node, 'navbar-brand'), 'Alert brand');
const alertBell = descendant(alertHeader, (node) => hasClass(node, 'fa-bell'), 'Alert bell');
const alertSearch = descendant(
  alertHeader,
  (node) => hasClass(node, 'fa-search'),
  'Alert search icon'
);
const alertSettings = descendant(
  alertHeader,
  (node) => hasClass(node, 'fa-cog'),
  'Alert settings icon'
);
const chatBrand = descendant(chatHeader, (node) => hasClass(node, 'navbar-brand'), 'Chat brand');
const chatComment = descendant(
  chatHeader,
  (node) => hasClass(node, 'fa-comment'),
  'Chat comment icon'
);
const chatActiveTab = descendant(
  chatHeader,
  (node) => hasClass(node, 'nav-link') && hasClass(node, 'active'),
  'Chat active tab'
);
const chatSearch = descendant(
  chatHeader,
  (node) => hasClass(node, 'fa-search'),
  'Chat search icon'
);
const chatSettings = descendant(
  chatHeader,
  (node) => hasClass(node, 'fa-cog'),
  'Chat settings icon'
);

const capturedComputed = {
  alertHeader: exactNode(
    alertHeader,
    {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '16px',
      fontWeight: '300',
      lineHeight: '24px',
      height: 48
    },
    'Alert header'
  ),
  alertBrand: exactNode(
    alertBrand,
    {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '20px',
      fontWeight: '300',
      lineHeight: '30px',
      height: 40
    },
    'Alert brand'
  ),
  alertBell: exactNode(
    alertBell,
    {
      fontSize: '20px',
      fontWeight: '900',
      lineHeight: '20px',
      width: 17.5,
      height: 20
    },
    'Alert bell'
  ),
  alertSearch: exactNode(
    alertSearch,
    {
      fontSize: '16px',
      fontWeight: '900',
      lineHeight: '16px',
      width: 16,
      height: 16
    },
    'Alert search icon'
  ),
  alertSettings: exactNode(
    alertSettings,
    {
      fontSize: '16px',
      fontWeight: '900',
      lineHeight: '16px',
      width: 16,
      height: 16
    },
    'Alert settings icon'
  ),
  chatHeader: exactNode(
    chatHeader,
    {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '12px',
      fontWeight: '300',
      lineHeight: '18px',
      height: 48
    },
    'Chat header'
  ),
  chatBrand: exactNode(
    chatBrand,
    {
      fontFamily: 'Arial, Helvetica, sans-serif',
      fontSize: '20px',
      fontWeight: '300',
      lineHeight: '30px',
      width: 16,
      height: 40
    },
    'Chat brand'
  ),
  chatComment: exactNode(
    chatComment,
    {
      fontSize: '16px',
      fontWeight: '900',
      lineHeight: '16px',
      width: 16,
      height: 16
    },
    'Chat comment icon'
  ),
  chatActiveTab: exactNode(
    chatActiveTab,
    {
      fontSize: '12px',
      fontWeight: '700',
      lineHeight: '18px',
      height: 33
    },
    'Chat active tab'
  ),
  chatSearch: exactNode(
    chatSearch,
    {
      fontSize: '16px',
      fontWeight: '900',
      lineHeight: '16px',
      width: 16,
      height: 16
    },
    'Chat search icon'
  ),
  chatSettings: exactNode(
    chatSettings,
    {
      fontSize: '16px',
      fontWeight: '900',
      lineHeight: '16px',
      width: 16,
      height: 16
    },
    'Chat settings icon'
  )
};

const sourceAssertions = [
  ['application font', '--app-font-family: Arial, Helvetica, sans-serif !important'],
  ['Alert component header', '.alertHeader[_ngcontent-ng-c1922465750]'],
  [
    'Chat header base size',
    '.navbar[_ngcontent-ng-c3761163150] { font-size: 12px; padding: 2px; }'
  ],
  ['Chat icon size', '.chatHeader[_ngcontent-ng-c3761163150] .fas[_ngcontent-ng-c3761163150]'],
  ['message separator', '.separator[_ngcontent-ng-c1254915701] a[_ngcontent-ng-c1254915701]'],
  ['message separator size', 'font-size: 13px; color: var(--msgs-separator-color) !important']
];
for (const [description, token] of sourceAssertions) {
  if (!sourceCss.includes(token)) throw new Error(`Supplied stylesheet is missing ${description}`);
}

const bridgeAssertions = [
  'app-alerts .alertHeader:not(:root)',
  'app-chat .chatHeader:not(:root)',
  'app-chat\n  .chatHeader:not(:root)\n  .fas:not(:root)',
  'app-st-message .separator:not(:root)',
  'app-st-message .separator:not(:root) a:not(:root)'
];
for (const token of bridgeAssertions) {
  if (!bridgedCss.includes(token)) throw new Error(`Runtime stylesheet bridge is missing ${token}`);
}

const separatorRequirementAssertions = [
  '--msgs-separator-border-width: 1px',
  '--msgs-separator-date-font-style: italic',
  '--msgs-separator-date-font-weight: 600',
  'border-top: var(--msgs-separator-border-width) solid var(--msg-border-color)',
  'font-style: var(--msgs-separator-date-font-style)',
  'font-weight: var(--msgs-separator-date-font-weight)'
];
for (const token of separatorRequirementAssertions) {
  if (!tokensCss.includes(token)) {
    throw new Error(`Room SSOT is missing the shared separator requirement: ${token}`);
  }
}

const forbiddenLocalTokens = [
  '.chat-nav',
  '.alertHeader',
  '.chatHeader',
  '.chatTabs',
  'app-st-message'
];
const forbiddenLocalSelectors = [];
postcss.parse(localCss, { from: paths.localCss }).walkRules((rule) => {
  for (const selector of rule.selectors) {
    if (forbiddenLocalTokens.some((token) => selector.includes(token))) {
      forbiddenLocalSelectors.push(selector);
    }
  }
});
if (forbiddenLocalSelectors.length > 0) {
  throw new Error(
    `Local CSS overrides the captured Alert/Chat/message SSOT: ${forbiddenLocalSelectors.join(', ')}`
  );
}

const structuralAssertions = {
  capturedPresenterActions:
    capturedMarkup.includes('<i class="fas fa-question-circle"></i> Poll</a>') &&
    capturedMarkup.includes('<i class="fas fa-plus-circle"></i> Post Alert</a>'),
  implementedPresenterActions:
    route.includes('<i class="fas fa-question-circle"></i> Poll</a') &&
    route.includes('<i class="fas fa-plus-circle"></i> Post Alert</a'),
  oneSharedMessageHost: (messageComponent.match(/<app-st-message>/g) ?? []).length === 1,
  oneSharedSeparator: (messageComponent.match(/<div class="separator">/g) ?? []).length === 1
};
for (const [description, passed] of Object.entries(structuralAssertions)) {
  if (!passed) throw new Error(`Structural contract failed: ${description}`);
}

const report = {
  authority: {
    source: 'css/complete-app-styles.css',
    runtimeBridge: 'src/lib/styles/captured-runtime-components.css',
    localCssPolicy:
      'src/app.css may not restyle Alert header, Chat header, Chat tabs, or app-st-message'
  },
  capturedComputed,
  intentionalDifference: {
    alertBell: '20px',
    chatComment: '16px',
    evidence:
      'The captured Alert brand inherits Bootstrap navbar-brand sizing; the Chat component explicitly sets .chatHeader .fas to 16px.'
  },
  presenterActionInheritance: {
    expectedFontSize: '16px',
    evidence:
      'Captured Alert header computes to 16px; Poll/Post Alert anchors have no source rule changing font-size and inherit the Alert header size.'
  },
  sharedSeparator: {
    selector: 'app-st-message .separator > a',
    fontSize: '13px',
    borderTop: '1px solid var(--msg-border-color)',
    fontStyle: 'italic',
    fontWeight: '600',
    markupInstancesInComponent: 1,
    consumers: ['alert', 'chat']
  },
  structuralAssertions,
  forbiddenLocalSelectors
};

await mkdir(resolve('docs/generated'), { recursive: true });
await writeFile(paths.report, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
