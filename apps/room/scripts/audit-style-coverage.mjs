import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_CAPTURE = 'proroom-ULTIMATE-staff-2026-07-24T12-42-02-part1.json';
const DEFAULT_OUTPUT = 'docs/generated/part-1-style-coverage.json';

const capturePath = resolve(process.argv[2] ?? DEFAULT_CAPTURE);
const outputPath = resolve(process.argv[3] ?? DEFAULT_OUTPUT);
const stylePaths = [
  'node_modules/@fortawesome/fontawesome-free/css/all.min.css',
  'node_modules/animate.css/animate.min.css',
  'css/complete-app-styles.css',
  'src/lib/styles/tokens.css',
  'src/app.css'
].map((path) => resolve(path));

const payload = JSON.parse(await readFile(capturePath, 'utf8'));
const styleSources = await Promise.all(
  stylePaths.map(async (path) => ({
    path,
    source: await readFile(path, 'utf8')
  }))
);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeCssValue = (value) =>
  String(value)
    .replace(/\s+/g, ' ')
    .replace(/\s*([,:;/])\s*/g, '$1')
    .trim()
    .toLowerCase();

function captureNodes(capture) {
  return capture[capture.fullDom ? 'fullDom' : 'subtree'].nodes;
}

function classTokens(node) {
  return String(node.attrs?.class ?? '')
    .split(/\s+/)
    .filter(Boolean);
}

function sourceMatches(pattern) {
  return styleSources.filter(({ source }) => pattern.test(source)).map(({ path }) => path);
}

const indirectClassOwnership = {
  'alert-chat-regular': {
    kind: 'variant-marker',
    owners: ['.alert-chat-box', 'as-split-area.alert-box', 'as-split-area.chat-box']
  },
  'as-horizontal': {
    kind: 'layout-state',
    owners: ['#mainAreaSplit', '.as-split-gutter[aria-orientation="horizontal"]']
  },
  'as-init': {
    kind: 'library-state',
    owners: ['#mainAreaSplit', '.alert-chat-box > as-split']
  },
  'as-percent': {
    kind: 'library-state',
    owners: ['#mainAreaSplit', '.alert-chat-box > as-split', '[style*="flex: 0 0 calc("]']
  },
  'as-split-area': {
    kind: 'custom-element-marker',
    owners: [
      '.alert-chat-box',
      '.presentation-box',
      'as-split-area.alert-box',
      'as-split-area.chat-box'
    ]
  },
  'as-vertical': {
    kind: 'layout-state',
    owners: ['.alert-chat-box > as-split', '.as-split-gutter[aria-orientation="vertical"]']
  },
  'btn-default': {
    kind: 'legacy-composed-class',
    owners: ['.btn', '.users-btns .reload-room-users', '.users-btns .search-room-users']
  },
  btnNavToggler: {
    kind: 'component-marker',
    owners: ['.navbar-toggler', '.mainAppNav']
  },
  centered: {
    kind: 'legacy-marker',
    owners: ['.btn', '.btn-success', '.float-right']
  },
  'chat-header-gear': {
    kind: 'component-marker',
    owners: ['.fas', '.fa-cog', '.chat-nav .nav-link']
  },
  'chat-nav-pm': {
    kind: 'composed-utility-class',
    owners: ['.navbar', '.navbar-light', '.bg-light', '.p-1', '.text-white']
  },
  filedragMD: {
    kind: 'component-marker',
    owners: ['#filedragAlert']
  },
  'input-group-btn': {
    kind: 'legacy-flex-item-marker',
    owners: ['.input-group', '.input-group .btn']
  },
  label: {
    kind: 'legacy-semantic-marker',
    owners: ['span', 'h3']
  },
  'label-warning': {
    kind: 'legacy-semantic-marker',
    owners: ['span', 'h3']
  },
  'ng-pristine': {
    kind: 'angular-form-state',
    owners: ['.form-control', '.form-check-input']
  },
  'ng-untouched': {
    kind: 'angular-form-state',
    owners: ['.form-control', '.form-check-input']
  },
  'ng-valid': {
    kind: 'angular-form-state',
    owners: ['.form-control', '.form-check-input']
  },
  'poll-panel-btn-close': {
    kind: 'component-variant-marker',
    owners: ['.poll-panel-btn']
  },
  preText: {
    kind: 'content-state-marker',
    owners: ['.msg-left', '.ml-2', '.mr-2', '.p-0']
  },
  'push-wrapper': {
    kind: 'sidebar-state-marker',
    owners: ['.wrapper', '.wrapper:has(.sidebar-wrapper[style])']
  },
  'saves-bandwidth': {
    kind: 'conditional-text-marker',
    owners: ['.pl-2']
  },
  'text-formated': {
    kind: 'content-state-marker',
    owners: ['.msg-left', '.ml-2', '.mr-2', '.p-0']
  },
  textSendDiv: {
    kind: 'component-marker',
    owners: ['#textAreaHolder']
  },
  themes: {
    kind: 'settings-section-marker',
    owners: ['.p-2', '#colorTheme', '#roomLayout']
  },
  'txt-area': {
    kind: 'component-marker',
    owners: ['#textAreaHolder textarea', '.form-control', '.border-0']
  },
  'ui-draggable': {
    kind: 'jquery-ui-state',
    owners: ['.webcamsHolderScreen', '.ui-draggable-handle', '.ui-resizable']
  }
};

const allNodes = payload.caps.flatMap(captureNodes);
const uniqueClasses = [...new Set(allNodes.flatMap(classTokens))].sort();
const uniqueIds = [
  ...new Set(allNodes.map((node) => node.attrs?.id).filter((value) => typeof value === 'string'))
].sort();

const classCoverage = uniqueClasses.map((className) => {
  const pattern = new RegExp(`\\.${escapeRegExp(className)}(?![a-zA-Z0-9_-])`);
  const sources = sourceMatches(pattern);

  return {
    className,
    sourceCount: sources.length,
    sources,
    indirectOwnership: indirectClassOwnership[className] ?? null
  };
});

const idCoverage = uniqueIds.map((id) => {
  const pattern = new RegExp(`#${escapeRegExp(id)}(?![a-zA-Z0-9_-])`);
  const sources = sourceMatches(pattern);

  return {
    id,
    sourceCount: sources.length,
    sources
  };
});

const capturedVariables = payload.caps[0]?.cssVars?.root ?? {};
const declarations = new Map();
const declarationPattern = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;}]+)/g;

for (const { path, source } of styleSources) {
  for (const match of source.matchAll(declarationPattern)) {
    const [, name, rawValue] = match;
    const values = declarations.get(name) ?? [];
    values.push({
      path,
      value: normalizeCssValue(rawValue.replace(/\s*!important\s*$/, ''))
    });
    declarations.set(name, values);
  }
}

const variableCoverage = Object.entries(capturedVariables)
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([name, rawValue]) => {
    const capturedValue = normalizeCssValue(rawValue);
    const definitions = declarations.get(name) ?? [];
    const exactDefinitions = definitions.filter(({ value }) => value === capturedValue);
    const resolvedDefinitions = definitions.filter(({ value }) => {
      const reference = value.match(/^var\((--[a-zA-Z0-9_-]+)\)$/)?.[1];
      if (reference) {
        return normalizeCssValue(capturedVariables[reference] ?? '') === capturedValue;
      }

      return value === 'inherit' && capturedValue === '';
    });

    return {
      name,
      capturedValue: rawValue,
      definitionCount: definitions.length,
      exactDefinitionCount: exactDefinitions.length,
      resolvedDefinitionCount: exactDefinitions.length + resolvedDefinitions.length,
      definitionSources: [...new Set(definitions.map(({ path }) => path))],
      exactDefinitionSources: [...new Set(exactDefinitions.map(({ path }) => path))],
      resolvedDefinitionSources: [
        ...new Set([...exactDefinitions, ...resolvedDefinitions].map(({ path }) => path))
      ]
    };
  });

const inlineStyleNodes = allNodes.filter((node) => typeof node.attrs?.style === 'string');
const computedStyleProperties = [
  ...new Set(allNodes.flatMap((node) => Object.keys(node.style ?? {})))
].sort();

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  evidence: {
    capturePath,
    stylePaths,
    styleBytes: styleSources.map(({ path, source }) => ({
      path,
      bytes: Buffer.byteLength(source)
    }))
  },
  summary: {
    captureCount: payload.caps.length,
    inspectedNodeOccurrences: allNodes.length,
    uniqueClasses: uniqueClasses.length,
    classesWithSelectorEvidence: classCoverage.filter(({ sourceCount }) => sourceCount > 0).length,
    classesWithoutSelectorEvidence: classCoverage.filter(({ sourceCount }) => sourceCount === 0)
      .length,
    classesWithIndirectOwnership: classCoverage.filter(
      ({ sourceCount, indirectOwnership }) => sourceCount === 0 && indirectOwnership
    ).length,
    unclassifiedClasses: classCoverage.filter(
      ({ sourceCount, indirectOwnership }) => sourceCount === 0 && !indirectOwnership
    ).length,
    uniqueIds: uniqueIds.length,
    idsWithSelectorEvidence: idCoverage.filter(({ sourceCount }) => sourceCount > 0).length,
    capturedVariables: variableCoverage.length,
    variablesWithDefinitions: variableCoverage.filter(({ definitionCount }) => definitionCount > 0)
      .length,
    variablesWithExactDefinitions: variableCoverage.filter(
      ({ exactDefinitionCount }) => exactDefinitionCount > 0
    ).length,
    variablesWithResolvedDefinitions: variableCoverage.filter(
      ({ resolvedDefinitionCount }) => resolvedDefinitionCount > 0
    ).length,
    inlineStyleNodeOccurrences: inlineStyleNodes.length,
    computedStyleProperties: computedStyleProperties.length
  },
  classCoverage,
  idCoverage,
  variableCoverage,
  inlineStyles: inlineStyleNodes.map((node) => ({
    path: node.path,
    tag: node.tag,
    id: node.attrs?.id ?? null,
    style: node.attrs.style
  })),
  computedStyleProperties
};

await mkdir(resolve(outputPath, '..'), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
process.stdout.write(`${outputPath}\n`);
