import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as parse5 from 'parse5';
import postcss from 'postcss';

const stylesheetPath = resolve(
  process.argv.find((argument) => argument.startsWith('--css='))?.slice('--css='.length) ??
    'css/complete-app-styles.css'
);
const rawRoomPath = resolve(
  process.argv.find((argument) => argument.startsWith('--room='))?.slice('--room='.length) ??
    'app-room/complete.html'
);
const cleanRoomPath = resolve(
  process.argv
    .find((argument) => argument.startsWith('--clean-room='))
    ?.slice('--clean-room='.length) ?? 'app-room/complete.clean.html'
);
const componentManifestPath = resolve('docs/source/components/manifest.json');
const reportPath = resolve('docs/generated/complete-stylesheet-audit.json');
const implementationStylePaths = [
  resolve('node_modules/@fortawesome/fontawesome-free/css/all.min.css'),
  resolve('node_modules/animate.css/animate.min.css'),
  resolve('src/lib/styles/tokens.css'),
  resolve('src/lib/styles/captured-runtime-components.css'),
  resolve('src/app.css')
];

const [stylesheet, rawRoom, cleanRoom, manifestSource, ...implementationStyles] = await Promise.all(
  [
    readFile(stylesheetPath, 'utf8'),
    readFile(rawRoomPath, 'utf8'),
    readFile(cleanRoomPath, 'utf8'),
    readFile(componentManifestPath, 'utf8'),
    ...implementationStylePaths.map((path) => readFile(path, 'utf8'))
  ]
);
const manifest = JSON.parse(manifestSource);

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function withoutComments(value) {
  return value.replace(/\/\*[\s\S]*?\*\//g, '');
}

function unique(values) {
  return [...new Set(values)].sort();
}

function cssTokens(value) {
  const source = withoutComments(value);
  const selectors = [...source.matchAll(/(?:^|})\s*([^@{}][^{}]*)\{/g)].map((match) =>
    match[1].trim()
  );
  const selectorSource = selectors.join('\n');
  return {
    rules: (source.match(/\{/g) ?? []).length,
    selectors: selectors.length,
    declarations: [...source.matchAll(/(?:^|[;{])\s*([a-zA-Z-][a-zA-Z0-9-]*)\s*:/g)].length,
    classes: unique(
      [...selectorSource.matchAll(/\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g)].map((match) => match[1])
    ),
    ids: unique(
      [...selectorSource.matchAll(/#(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g)].map((match) => match[1])
    ),
    properties: unique(
      [...source.matchAll(/(?:^|[;{])\s*([a-zA-Z-][a-zA-Z0-9-]*)\s*:/g)].map((match) =>
        match[1].toLowerCase()
      )
    ),
    customProperties: unique(
      [...source.matchAll(/(?:^|[;{])\s*(--[a-zA-Z0-9_-]+)\s*:/g)].map((match) => match[1])
    ),
    scopes: unique(
      [...source.matchAll(/_(?:ngcontent|nghost)-ng-c([0-9]+)/g)].map((match) => match[1])
    ),
    urls: unique(
      [...source.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s]+))/g)].map(
        (match) => match[1] ?? match[2] ?? match[3]
      )
    ),
    atRules: Object.fromEntries(
      [...source.matchAll(/@([a-zA-Z-]+)/g)].reduce((counts, match) => {
        const name = match[1].toLowerCase();
        counts.set(name, (counts.get(name) ?? 0) + 1);
        return counts;
      }, new Map())
    )
  };
}

function normalizeSelector(value) {
  return value
    .replace(/\[_ng(?:content|host)-(?:ng-c[0-9]+|%COMP%)\]/g, '')
    .replace(/:+after\b/g, '::after')
    .replace(/:+before\b/g, '::before')
    .replace(/\s+/g, ' ')
    .replace(/\s*([>+~])\s*/g, '$1')
    .replace(/\s*([(),])\s*/g, '$1')
    .trim();
}

function normalizeDeclarationValue(value) {
  return value
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*([,:;/()])\s*/g, '$1')
    .replace(/(^|[\s(:,])0px(?=$|[\s,);])/g, '$10')
    .trim();
}

function capturedOwnershipSelector(selector, host) {
  const pseudoElement = selector.match(/(::[a-zA-Z-]+(?:\([^)]*\))?)$/)?.[1] ?? '';
  const base = pseudoElement ? selector.slice(0, -pseudoElement.length) : selector;
  const children = [...(childHosts.get(host) ?? new Set())].sort();
  const boundary = children.length > 0 ? `:not(${host} :is(${children.join(', ')}) *)` : '';
  return `${host} ${base}${boundary}${pseudoElement}`;
}

function splitSelectors(value) {
  const selectors = [];
  let start = 0;
  let squareDepth = 0;
  let roundDepth = 0;
  let quote = null;
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'") quote = character;
    else if (character === '[') squareDepth += 1;
    else if (character === ']') squareDepth -= 1;
    else if (character === '(') roundDepth += 1;
    else if (character === ')') roundDepth -= 1;
    else if (character === ',' && squareDepth === 0 && roundDepth === 0) {
      selectors.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  selectors.push(value.slice(start).trim());
  return selectors.filter(Boolean);
}

function translatedHostSelector(selector, host) {
  const hostPattern = /\[_nghost-(?:ng-c[0-9]+|%COMP%)\]/g;
  const match = hostPattern.exec(selector);
  hostPattern.lastIndex = 0;
  if (!match) return null;

  const withoutHostScope = selector.replace(hostPattern, '');
  const compoundStart =
    Math.max(
      withoutHostScope.lastIndexOf(' ', match.index - 1),
      withoutHostScope.lastIndexOf('>', match.index - 1),
      withoutHostScope.lastIndexOf('+', match.index - 1),
      withoutHostScope.lastIndexOf('~', match.index - 1)
    ) + 1;
  return normalizeSelector(
    `${withoutHostScope.slice(0, compoundStart)}${host}${withoutHostScope.slice(compoundStart)}`
  );
}

function ruleRows(value, origin) {
  const rows = [];
  const root = postcss.parse(value, { from: origin });
  root.walkRules((rule) => {
    const keyframes = rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name);
    if (keyframes) return;
    const declarations = Object.fromEntries(
      rule.nodes
        .filter((node) => node.type === 'decl')
        .map((declaration) => [
          declaration.prop.toLowerCase(),
          normalizeDeclarationValue(
            `${declaration.value}${declaration.important ? ' !important' : ''}`
          )
        ])
    );
    for (const selector of splitSelectors(rule.selector)) {
      rows.push({
        selector,
        normalizedSelector: normalizeSelector(selector),
        declarations,
        line: rule.source?.start?.line ?? null
      });
    }
  });
  return rows;
}

function lineNumberAt(value, index) {
  return value.slice(0, index).split('\n').length;
}

const sectionPattern = /\/\*\s*=+\s*\n\s*SOURCE:\s*([^\n]+?)\s*\n\s*=+\s*\*\//g;
const markers = [...stylesheet.matchAll(sectionPattern)];
const sections = markers.map((marker, index) => {
  const start = marker.index + marker[0].length;
  const end = markers[index + 1]?.index ?? stylesheet.length;
  const body = stylesheet.slice(start, end);
  return {
    index: index + 1,
    source: marker[1].trim(),
    startLine: lineNumberAt(stylesheet, marker.index),
    endLine: lineNumberAt(stylesheet, end),
    bytes: Buffer.byteLength(body),
    sha256: sha256(body),
    css: body,
    ...cssTokens(body)
  };
});

function walkElements(node, callback) {
  if (node?.tagName) callback(node);
  for (const child of node?.childNodes ?? []) walkElements(child, callback);
}

function attrs(node) {
  return Object.fromEntries((node.attrs ?? []).map(({ name, value }) => [name, value]));
}

const scopeHosts = new Map();
const childHosts = new Map();
const rawDocument = parse5.parseFragment(rawRoom);
walkElements(rawDocument, (node) => {
  for (const name of Object.keys(attrs(node))) {
    const match = name.match(/^_nghost-ng-c([0-9]+)$/);
    if (!match) continue;
    const hosts = scopeHosts.get(match[1]) ?? new Set();
    hosts.add(node.tagName);
    scopeHosts.set(match[1], hosts);
  }
});
childHosts.set('app-root', new Set(['app-room']));

function walkComponentTree(node, ownerHost = null) {
  let nextOwner = ownerHost;
  if (node?.tagName) {
    const isComponentHost = (node.attrs ?? []).some(({ name }) =>
      /^_nghost-ng-c[0-9]+$/.test(name)
    );
    if (isComponentHost) {
      nextOwner = node.tagName;
      if (ownerHost && ownerHost !== nextOwner) {
        const children = childHosts.get(ownerHost) ?? new Set();
        children.add(nextOwner);
        childHosts.set(ownerHost, children);
      }
    }
  }
  for (const child of node?.childNodes ?? []) walkComponentTree(child, nextOwner);
}
walkComponentTree(rawDocument);

const scopeHostRows = [...scopeHosts.entries()]
  .map(([scope, hosts]) => ({ scope, hosts: [...hosts].sort() }))
  .sort((left, right) => left.scope.localeCompare(right.scope));
// The room fragment begins beneath app-root. The full JSON capture records
// app-root itself with this host scope.
scopeHostRows.push({
  scope: '4243810522',
  hosts: ['app-root'],
  evidence: 'proroom-ULTIMATE-staff-2026-07-24T12-42-02-part1.json'
});
scopeHostRows.sort((left, right) => left.scope.localeCompare(right.scope));
const scopeHostLookup = new Map(scopeHostRows.map(({ scope, hosts }) => [scope, hosts]));

const cleanClasses = new Set();
const cleanIds = new Set();
const cleanTags = new Set();
const cleanDocument = parse5.parseFragment(cleanRoom);
walkElements(cleanDocument, (node) => {
  cleanTags.add(node.tagName);
  const elementAttrs = attrs(node);
  for (const className of String(elementAttrs.class ?? '')
    .split(/\s+/)
    .filter(Boolean)) {
    cleanClasses.add(className);
  }
  if (elementAttrs.id) cleanIds.add(elementAttrs.id);
});

const manifestComponents = new Map(
  manifest.components.map((component) => [component.selector, component])
);
const runtimeSections = sections.filter((section) => section.scopes.length > 0);
const decodedComparisons = [];
for (const section of runtimeSections) {
  const hosts = unique(section.scopes.flatMap((scope) => scopeHostLookup.get(scope) ?? []));
  for (const host of hosts.filter((candidate) => candidate.startsWith('app-'))) {
    const component = manifestComponents.get(host);
    if (!component?.styleFile) {
      decodedComparisons.push({
        section: section.index,
        scope: section.scopes,
        host,
        styleFile: null,
        status: 'no-decoded-style-file'
      });
      continue;
    }
    const decodedSource = await readFile(resolve(component.styleFile), 'utf8');
    const decoded = cssTokens(decodedSource);
    decodedComparisons.push({
      section: section.index,
      scope: section.scopes,
      host,
      styleFile: component.styleFile,
      status: 'decoded',
      runtimeClassCount: section.classes.length,
      decodedClassCount: decoded.classes.length,
      runtimeClassesMissingFromDecoded: section.classes.filter(
        (className) => !decoded.classes.includes(className)
      ),
      decodedClassesMissingFromRuntime: decoded.classes.filter(
        (className) => !section.classes.includes(className)
      ),
      runtimePropertiesMissingFromDecoded: section.properties.filter(
        (property) => !decoded.properties.includes(property)
      ),
      decodedPropertiesMissingFromRuntime: decoded.properties.filter(
        (property) => !section.properties.includes(property)
      )
    });
  }
}

const allTokens = cssTokens(stylesheet);
const implementationTokens = cssTokens(implementationStyles.join('\n'));
const implementationRuleRows = implementationStyles.flatMap((source, index) =>
  ruleRows(source, implementationStylePaths[index])
);
const implementationRulesBySelector = new Map();
for (const row of implementationRuleRows) {
  const values = implementationRulesBySelector.get(row.normalizedSelector) ?? [];
  values.push(row);
  implementationRulesBySelector.set(row.normalizedSelector, values);
}

const runtimeRuleCoverage = runtimeSections
  .flatMap((section) => {
    const hosts = unique(section.scopes.flatMap((scope) => scopeHostLookup.get(scope) ?? []));
    return ruleRows(section.css, `${stylesheetPath}#section-${section.index}`).flatMap((row) =>
      hosts.map((host) => {
        const hostScopedSelector = translatedHostSelector(row.selector, host);
        const candidateSelectors = unique([
          row.normalizedSelector,
          normalizeSelector(`${host} ${row.normalizedSelector}`),
          normalizeSelector(`:where(${host}) ${row.normalizedSelector}`),
          normalizeSelector(capturedOwnershipSelector(row.normalizedSelector, host)),
          ...(hostScopedSelector ? [hostScopedSelector] : [])
        ]);
        const candidates = candidateSelectors.flatMap(
          (selector) => implementationRulesBySelector.get(selector) ?? []
        );
        const capturedProperties = Object.entries(row.declarations);
        const propertyMatches = capturedProperties.filter(([property]) =>
          candidates.some((candidate) => property in candidate.declarations)
        );
        const exactDeclarationMatches = capturedProperties.filter(([property, value]) =>
          candidates.some((candidate) => candidate.declarations[property] === value)
        );
        return {
          section: section.index,
          host,
          selector: row.selector,
          normalizedSelector: row.normalizedSelector,
          candidateSelectors,
          capturedLine: section.startLine + (row.line ?? 1) - 1,
          capturedDeclarations: capturedProperties.length,
          matchingImplementationSelectors: unique(
            candidates.map((candidate) => candidate.selector)
          ),
          matchedProperties: propertyMatches.length,
          exactDeclarations: exactDeclarationMatches.length,
          missingProperties: capturedProperties
            .filter(([property]) => !propertyMatches.some(([matched]) => matched === property))
            .map(([property]) => property),
          differingDeclarations: capturedProperties
            .filter(
              ([property, value]) =>
                propertyMatches.some(([matched]) => matched === property) &&
                !exactDeclarationMatches.some(([matched]) => matched === property) &&
                candidates.some(
                  (candidate) =>
                    property in candidate.declarations && candidate.declarations[property] !== value
                )
            )
            .map(([property, captured]) => ({
              property,
              captured,
              implementation: unique(
                candidates
                  .map((candidate) => candidate.declarations[property])
                  .filter((value) => value !== undefined)
              )
            }))
        };
      })
    );
  })
  .filter((row) => row.normalizedSelector);
const failedDownloads = [
  ...stylesheet.matchAll(/FAILED TO DOWNLOAD:\s*([^\n]+)\s*\n\s*REASON:\s*([^\n*]+)/g)
].map((match) => ({ url: match[1].trim(), reason: match[2].trim() }));
const unresolvedScopes = unique(
  runtimeSections
    .flatMap((section) => section.scopes)
    .filter((scope) => !scopeHostLookup.has(scope))
);
const cleanClassesWithoutSelectors = [...cleanClasses]
  .filter((className) => !allTokens.classes.includes(className))
  .sort();
const cleanClassesWithoutAnyImplementationEvidence = [...cleanClasses]
  .filter(
    (className) =>
      !allTokens.classes.includes(className) && !implementationTokens.classes.includes(className)
  )
  .sort();
const cleanIdsWithoutSelectors = [...cleanIds].filter((id) => !allTokens.ids.includes(id)).sort();
const cleanIdsWithoutAnyImplementationEvidence = [...cleanIds]
  .filter((id) => !allTokens.ids.includes(id) && !implementationTokens.ids.includes(id))
  .sort();

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  evidence: {
    stylesheetPath,
    rawRoomPath,
    cleanRoomPath,
    componentManifestPath,
    implementationStylePaths,
    bytes: Buffer.byteLength(stylesheet),
    lines: stylesheet.split('\n').length,
    sha256: sha256(stylesheet)
  },
  summary: {
    sourceSections: sections.length,
    runtimeScopedSections: runtimeSections.length,
    mappedRuntimeScopes: unique(
      runtimeSections.flatMap((section) =>
        section.scopes.filter((scope) => scopeHostLookup.has(scope))
      )
    ).length,
    unresolvedRuntimeScopes: unresolvedScopes.length,
    rules: allTokens.rules,
    selectors: allTokens.selectors,
    declarations: allTokens.declarations,
    uniqueClasses: allTokens.classes.length,
    uniqueIds: allTokens.ids.length,
    customProperties: allTokens.customProperties.length,
    externalOrDataUrls: allTokens.urls.length,
    failedDownloads: failedDownloads.length,
    cleanRoomClasses: cleanClasses.size,
    cleanRoomClassesWithSelectorEvidence: cleanClasses.size - cleanClassesWithoutSelectors.length,
    cleanRoomClassesWithoutSelectorEvidence: cleanClassesWithoutSelectors.length,
    cleanRoomClassesWithoutAnyImplementationEvidence:
      cleanClassesWithoutAnyImplementationEvidence.length,
    cleanRoomIds: cleanIds.size,
    cleanRoomIdsWithSelectorEvidence: cleanIds.size - cleanIdsWithoutSelectors.length,
    cleanRoomIdsWithoutSelectorEvidence: cleanIdsWithoutSelectors.length,
    cleanRoomIdsWithoutAnyImplementationEvidence: cleanIdsWithoutAnyImplementationEvidence.length,
    decodedRuntimeComponentComparisons: decodedComparisons.length,
    decodedRuntimeComponentsWithExactClassAndPropertySets: decodedComparisons.filter(
      (entry) =>
        entry.status === 'decoded' &&
        entry.runtimeClassesMissingFromDecoded.length === 0 &&
        entry.decodedClassesMissingFromRuntime.length === 0 &&
        entry.runtimePropertiesMissingFromDecoded.length === 0 &&
        entry.decodedPropertiesMissingFromRuntime.length === 0
    ).length,
    runtimeRuleSelectors: runtimeRuleCoverage.length,
    runtimeRuleSelectorsWithImplementationSelector: runtimeRuleCoverage.filter(
      (entry) => entry.matchingImplementationSelectors.length > 0
    ).length,
    runtimeDeclarations: runtimeRuleCoverage.reduce(
      (total, entry) => total + entry.capturedDeclarations,
      0
    ),
    runtimeDeclarationsWithImplementationProperty: runtimeRuleCoverage.reduce(
      (total, entry) => total + entry.matchedProperties,
      0
    ),
    runtimeDeclarationsWithExactImplementationValue: runtimeRuleCoverage.reduce(
      (total, entry) => total + entry.exactDeclarations,
      0
    ),
    completeStylesheetImportedByAppCss: implementationStyles
      .at(-1)
      .includes("@import '../css/complete-app-styles.css'"),
    localAnimateFallbackImportedByAppCss: implementationStyles
      .at(-1)
      .includes("@import 'animate.css/animate.min.css'"),
    localFontAwesomeFallbackImportedByAppCss: implementationStyles
      .at(-1)
      .includes("@import '@fortawesome/fontawesome-free/css/all.min.css'")
  },
  failedDownloads,
  unresolvedScopes,
  scopeHosts: scopeHostRows,
  cleanRoom: {
    tags: [...cleanTags].sort(),
    classesWithoutSelectorEvidence: cleanClassesWithoutSelectors,
    classesWithoutAnyImplementationEvidence: cleanClassesWithoutAnyImplementationEvidence,
    idsWithoutSelectorEvidence: cleanIdsWithoutSelectors,
    idsWithoutAnyImplementationEvidence: cleanIdsWithoutAnyImplementationEvidence
  },
  sections: sections.map(({ css: _css, ...section }) => ({
    ...section,
    hosts: unique(section.scopes.flatMap((scope) => scopeHostLookup.get(scope) ?? []))
  })),
  decodedComparisons,
  runtimeRuleCoverage
};

await mkdir(resolve('docs/generated'), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(
  JSON.stringify(
    {
      evidence: report.evidence,
      summary: report.summary,
      failedDownloads: report.failedDownloads,
      unresolvedScopes: report.unresolvedScopes,
      cleanRoom: report.cleanRoom,
      runtimeSections: report.sections
        .filter((section) => section.scopes.length > 0)
        .map(({ index, startLine, endLine, scopes, hosts, rules, declarations }) => ({
          index,
          startLine,
          endLine,
          scopes,
          hosts,
          rules,
          declarations
        })),
      report: reportPath
    },
    null,
    2
  )
);
