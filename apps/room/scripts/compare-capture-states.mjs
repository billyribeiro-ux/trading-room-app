import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'parse5';

const DEFAULT_CAPTURE = 'proroom-ULTIMATE-staff-2026-07-24T12-42-02-part1.json';
const capturePath = resolve(process.argv[2] ?? DEFAULT_CAPTURE);
const htmlArgument = process.argv.find((argument) => argument.startsWith('--html='));
const urlArgument = process.argv.find((argument) => argument.startsWith('--url='));
const emojiHtmlArgument = process.argv.find((argument) => argument.startsWith('--emoji-html='));
const outputArgument = process.argv.find((argument) => argument.startsWith('--output='));
const htmlPath = resolve(
  htmlArgument?.slice('--html='.length) ?? '/private/tmp/ptr-runtime-dom.html'
);
const emojiHtmlPath = emojiHtmlArgument
  ? resolve(emojiHtmlArgument.slice('--emoji-html='.length))
  : null;
const outputPath = resolve(
  outputArgument?.slice('--output='.length) ?? 'docs/generated/runtime-vs-capture-states.json'
);

const payload = JSON.parse(await readFile(capturePath, 'utf8'));
const runtimeHtml = urlArgument
  ? await fetch(urlArgument.slice('--url='.length)).then((response) => {
      if (!response.ok) throw new Error(`Runtime request failed with HTTP ${response.status}`);
      return response.text();
    })
  : await readFile(htmlPath, 'utf8');
const document = parse(runtimeHtml);
const emojiDocument = emojiHtmlPath ? parse(await readFile(emojiHtmlPath, 'utf8')) : null;
const normalizeText = (value = '') => String(value).replace(/\s+/g, ' ').trim();

const differenceEvidenceByCapture = new Map();

function classify(captureIndexes, kind, evidence) {
  for (const captureIndex of captureIndexes) {
    const classifications = differenceEvidenceByCapture.get(captureIndex) ?? [];
    classifications.push({ kind, evidence });
    differenceEvidenceByCapture.set(captureIndex, classifications);
  }
}

classify(
  [0, 56, 57],
  'source-runtime-shell',
  'The source full-DOM captures include the Angular boot scripts, callback script, extension-added body attribute, and original runtime-only media nodes; those are preserved as raw differences and are not synthesized in Svelte.'
);
classify(
  [0, 3],
  'persisted-connected-data',
  'The runtime room scroller contains the connected user’s persisted message, while the corresponding captured room scroller is empty.'
);
classify(
  [0, 4, 22, 41, 42, 43, 44, 45, 46],
  'connected-identity',
  'The runtime renders the current connection identity. The dump contains Billy Ribeiro or an undefined Gravatar URL; the user explicitly prohibited hardcoding that captured identity.'
);
classify(
  Array.from({ length: 31 }, (_, offset) => offset + 4),
  'default-closed-modal',
  'The capture label and root class/style record an opened modal interaction state; the runtime comparison is intentionally taken at the default closed state and the modal remains available through its evidenced trigger where one is present.'
);
classify(
  [7, 8, 16, 17, 49, 50, 52],
  'captured-selected-tab',
  'The capture records a non-default selected tab. The runtime comparison uses the evidenced startup selection, so active/show and aria-selected differences are state deltas rather than missing nodes.'
);
classify(
  [12, 13],
  'captured-conditional-control',
  'The capture records the post-click Disable Video state, including the conditional saves-bandwidth span; the runtime comparison uses the pre-click Enable Video state.'
);
classify(
  [14, 15, 16, 17, 18],
  'client-hydration-attribute',
  'The captured literal readonly="readonly" or multiple="true" attribute is applied by the Svelte attachment during hydration; the compared server HTML contains the standards-equivalent boolean serialization.'
);
classify(
  [35, 36, 37, 38, 39, 40],
  'default-closed-dropdown',
  'The capture records an opened dropdown; the runtime comparison is intentionally taken before that control is activated.'
);
classify(
  [0, 41, 42, 43, 44, 45, 46],
  'explicit-closed-sidebar-startup',
  'The dump forced the sidebar subtree open. The user explicitly required the hamburger drawer to start closed and open only after clicking the hamburger.'
);
classify(
  [47, 48],
  'default-closed-roster-menu',
  'The capture records the roster kebab menu forced open; the runtime comparison is intentionally taken before the menu is activated.'
);
classify(
  [0, 49, 50, 51, 52, 56, 57],
  'direct-followup-dom',
  'The runtime includes the user-supplied post-dump VideoPlayer and Files DOM fragments. Their additional nodes are higher-priority direct evidence and remain visible as additions to the earlier dump capture.'
);
classify(
  [55],
  'default-closed-emoji-popover',
  'Capture 55 was taken while the emoji trigger referenced its open popover; the default runtime composer has no aria-describedby until the emoji control is clicked.'
);
classify(
  [56, 57],
  'composite-theme-state',
  'These full-DOM captures combine a forced theme with the open emoji tree, an open modal, backdrop, and the original Angular room shell; independent subtree captures verify those structures without pretending the default runtime has every overlay open simultaneously.'
);

function runtimeAttrs(node) {
  return Object.fromEntries(
    (node.attrs ?? [])
      .map(({ name, value }) => [name, value])
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

function captureAttrs(node) {
  return Object.fromEntries(
    Object.entries(node.attrs ?? {})
      .filter(([name]) => !name.startsWith('_ngcontent-') && !name.startsWith('_nghost-'))
      .sort(([left], [right]) => left.localeCompare(right))
  );
}

function directRuntimeText(node) {
  return normalizeText(
    (node.childNodes ?? [])
      .filter((child) => child.nodeName === '#text')
      .map((child) => child.value)
      .join(' ')
  );
}

function runtimeElements(root) {
  const elements = [];

  function visit(node) {
    if (node.tagName) elements.push(node);
    for (const child of node.childNodes ?? []) visit(child);
    if (node.content) visit(node.content);
  }

  visit(root);
  return elements;
}

function descendants(root) {
  const elements = [];

  function visit(node) {
    if (node.tagName) elements.push(node);
    for (const child of node.childNodes ?? []) visit(child);
    if (node.content) visit(node.content);
  }

  visit(root);
  return elements;
}

function signature(tag, attrs, text = null) {
  return JSON.stringify([tag, attrs, text]);
}

function compareMultisets(captureNodes, runtimeNodes, includeText) {
  const captureCounts = new Map();
  const runtimeCounts = new Map();
  const capturePaths = new Map();

  for (const node of captureNodes) {
    const key = signature(
      node.tag,
      captureAttrs(node),
      includeText ? normalizeText(node.text) : null
    );
    captureCounts.set(key, (captureCounts.get(key) ?? 0) + 1);
    if (!capturePaths.has(key)) capturePaths.set(key, []);
    capturePaths.get(key).push(node.path);
  }

  for (const node of runtimeNodes) {
    const key = signature(
      node.tagName,
      runtimeAttrs(node),
      includeText ? directRuntimeText(node) : null
    );
    runtimeCounts.set(key, (runtimeCounts.get(key) ?? 0) + 1);
  }

  let matched = 0;
  for (const [key, count] of captureCounts) {
    matched += Math.min(count, runtimeCounts.get(key) ?? 0);
  }

  const missing = [];
  for (const [key, count] of captureCounts) {
    const difference = count - (runtimeCounts.get(key) ?? 0);
    if (difference <= 0) continue;
    missing.push({
      count: difference,
      signature: JSON.parse(key),
      capturePaths: capturePaths.get(key).slice(0, difference)
    });
  }

  const extra = [];
  for (const [key, count] of runtimeCounts) {
    const difference = count - (captureCounts.get(key) ?? 0);
    if (difference <= 0) continue;
    extra.push({
      count: difference,
      signature: JSON.parse(key)
    });
  }

  return {
    matched,
    captureTotal: captureNodes.length,
    runtimeTotal: runtimeNodes.length,
    missing,
    extra
  };
}

const allRuntimeElements = [
  ...runtimeElements(document),
  ...(emojiDocument ? runtimeElements(emojiDocument) : [])
];

function candidateRoots(root) {
  const attrs = captureAttrs(root);
  const id = attrs.id;

  if (id) {
    const idMatches = allRuntimeElements.filter(
      (node) => node.tagName === root.tag && runtimeAttrs(node).id === id
    );
    if (idMatches.length > 0) return idMatches;
  }

  const ariaLabelledby = attrs['aria-labelledby'];
  if (ariaLabelledby) {
    const labelledMatches = allRuntimeElements.filter(
      (node) =>
        node.tagName === root.tag && runtimeAttrs(node)['aria-labelledby'] === ariaLabelledby
    );
    if (labelledMatches.length > 0) return labelledMatches;
  }

  const exact = allRuntimeElements.filter(
    (node) =>
      node.tagName === root.tag &&
      signature(node.tagName, runtimeAttrs(node)) === signature(root.tag, attrs)
  );
  if (exact.length > 0) return exact;

  const className = attrs.class;
  if (className) {
    const classMatches = allRuntimeElements.filter(
      (node) => node.tagName === root.tag && runtimeAttrs(node).class === className
    );
    if (classMatches.length > 0) return classMatches;
  }

  return allRuntimeElements.filter((node) => node.tagName === root.tag);
}

const captures = payload.caps.map((capture, index) => {
  const treeKind = capture.fullDom ? 'fullDom' : 'subtree';
  const captureNodes = capture[treeKind].nodes;
  const root = captureNodes[0];
  const candidates = root ? candidateRoots(root) : [];
  const ranked = candidates
    .map((candidate) => {
      const runtimeNodes = descendants(candidate);
      const attributes = compareMultisets(captureNodes, runtimeNodes, false);
      const text = compareMultisets(captureNodes, runtimeNodes, true);

      return {
        candidate,
        runtimeNodes,
        attributes,
        text,
        distance:
          Math.abs(runtimeNodes.length - captureNodes.length) +
          (captureNodes.length - attributes.matched)
      };
    })
    .sort((left, right) => left.distance - right.distance);
  const best = ranked[0];

  return {
    index,
    label: capture.label,
    differenceEvidence: differenceEvidenceByCapture.get(index) ?? [],
    treeKind,
    capturedNodes: captureNodes.length,
    root: root
      ? {
          tag: root.tag,
          id: root.attrs?.id ?? null,
          class: root.attrs?.class ?? null,
          path: root.path
        }
      : null,
    runtimeRootFound: Boolean(best),
    candidateCount: candidates.length,
    runtimeNodes: best?.runtimeNodes.length ?? 0,
    exactAttributeMatches: best?.attributes.matched ?? 0,
    exactAttributeAndTextMatches: best?.text.matched ?? 0,
    attributeDifferences: best
      ? {
          missing: best.attributes.missing,
          extra: best.attributes.extra
        }
      : {
          missing: captureNodes.map((node) => ({
            count: 1,
            signature: [node.tag, captureAttrs(node), null],
            capturePaths: [node.path]
          })),
          extra: []
        },
    attributeAndTextDifferences: best
      ? {
          missing: best.text.missing,
          extra: best.text.extra
        }
      : {
          missing: captureNodes.map((node) => ({
            count: 1,
            signature: [node.tag, captureAttrs(node), normalizeText(node.text)],
            capturePaths: [node.path]
          })),
          extra: []
        }
  };
});

function hasRawDifference(capture) {
  return (
    !capture.runtimeRootFound ||
    capture.runtimeNodes !== capture.capturedNodes ||
    capture.exactAttributeMatches !== capture.capturedNodes ||
    capture.exactAttributeAndTextMatches !== capture.capturedNodes
  );
}

const unclassifiedDifferenceCaptures = captures
  .filter((capture) => hasRawDifference(capture) && capture.differenceEvidence.length === 0)
  .map(({ index, label }) => ({ index, label }));

const report = {
  generatedAt: new Date().toISOString(),
  evidence: {
    capturePath,
    htmlPath: urlArgument ? null : htmlPath,
    runtimeUrl: urlArgument?.slice('--url='.length) ?? null,
    emojiHtmlPath
  },
  summary: {
    captureCount: captures.length,
    rootsFound: captures.filter((capture) => capture.runtimeRootFound).length,
    exactNodeCounts: captures.filter(
      (capture) => capture.runtimeRootFound && capture.runtimeNodes === capture.capturedNodes
    ).length,
    exactAttributeCaptures: captures.filter(
      (capture) =>
        capture.runtimeRootFound &&
        capture.runtimeNodes === capture.capturedNodes &&
        capture.exactAttributeMatches === capture.capturedNodes
    ).length,
    exactAttributeAndTextCaptures: captures.filter(
      (capture) =>
        capture.runtimeRootFound &&
        capture.runtimeNodes === capture.capturedNodes &&
        capture.exactAttributeAndTextMatches === capture.capturedNodes
    ).length,
    rootsMissing: captures
      .filter((capture) => !capture.runtimeRootFound)
      .map(({ index, label }) => ({ index, label })),
    capturesWithClassifiedDifferences: captures.filter(
      (capture) => hasRawDifference(capture) && capture.differenceEvidence.length > 0
    ).length,
    unclassifiedDifferenceCaptures
  },
  captures
};

await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(report.summary, null, 2)}\n`);
process.stdout.write(`${outputPath}\n`);
