/**
 * Media contract audit.
 *
 * Same shape as the other audits in this directory - read a capture, assert the implementation
 * against it, write a machine-readable report - but for the surfaces the mediasoup work touches,
 * which is the one area the existing audits never covered.
 *
 * It reads the live console dump (scripts/ptr-dump-now.js output) rather than the ULTIMATE
 * capture, because the media surfaces only exist while somebody is actually sharing: the stored
 * captures have `ul#screenTabs` present but rendered 0x0 with no children.
 *
 *   node scripts/audit-media-contract.mjs [path-to-dump.json]
 *
 * Defaults to the newest ptr-dump-*.json in ~/Downloads.
 */

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve, join } from 'node:path';

const paths = {
  screenTabs: resolve('src/lib/components/ScreenTabs.svelte'),
  roomMessage: resolve('src/lib/components/RoomMessage.svelte'),
  codecs: resolve('services/media/src/codecs.rs'),
  report: resolve('docs/generated/media-contract.json')
};

async function newestDump(explicit) {
  if (explicit) return resolve(explicit);
  const downloads = join(homedir(), 'Downloads');
  const entries = (await readdir(downloads)).filter(
    (name) => name.startsWith('ptr-dump-') && name.endsWith('.json')
  );
  if (entries.length === 0) {
    throw new Error(
      'no ptr-dump-*.json in ~/Downloads - run scripts/ptr-dump-now.js in the live room console first'
    );
  }
  entries.sort();
  return join(downloads, entries.at(-1));
}

const dumpPath = await newestDump(process.argv[2]);
const [dumpText, screenTabs, roomMessage, codecs] = await Promise.all([
  readFile(dumpPath, 'utf8'),
  readFile(paths.screenTabs, 'utf8'),
  readFile(paths.roomMessage, 'utf8'),
  readFile(paths.codecs, 'utf8')
]);

const dump = JSON.parse(dumpText);
const extracted = dump.extracted ?? {};
const failures = [];
const findings = [];

function assert(condition, claim, detail) {
  (condition ? findings : failures).push({ claim, detail, ok: Boolean(condition) });
}

/* ---------------------------------------------------------------- screen tabs -------------- */
// The controls cluster (li.nav-item.ms-auto) has no label; only labelled entries are screens.
const screens = (extracted.screenTabs ?? []).filter((tab) => tab.label);

assert(
  screens.length > 0,
  'the dump contains at least one rendered screen tab',
  `${screens.length} labelled tabs; without one, nothing below can be checked`
);

if (screens.length > 0) {
  const labelShape = screens.every((tab) => /.+-.+/.test(tab.label));
  assert(
    labelShape,
    'every screen tab label is `{name}-{screenName}`',
    screens.map((t) => t.label)
  );

  // Free text, not auto-numbering. Three live labels settled this: FUTURES, MAIN / SPX, and one
  // ending in a trailing space - none of which a generator produces.
  const names = screens.map((tab) => tab.label.split('-').slice(1).join('-'));
  const autoNumbered = names.every((name) => /^Screen \d+$/.test(name));
  assert(
    !autoNumbered || names.length < 2,
    'screenName is free text, not generated `Screen N`',
    names
  );

  assert(
    screens.every((tab) => tab.menuItems.includes('Detach Screen to a new window')),
    'every screen tab menu offers "Detach Screen to a new window"',
    screens.map((t) => t.menuItems)
  );
  assert(
    screens.every((tab) => tab.menuItems.some((item) => /Lock Screen/.test(item))),
    'every screen tab menu offers Lock/Unlock Screen',
    screens.map((t) => t.menuItems)
  );

  // Role gating: presenter-only entries must be absent for a viewer and present for a presenter.
  const presenterItems = ['Bring everyone here', 'Stop This Screen'];
  const sawPresenterItems = screens.some((tab) =>
    presenterItems.some((item) => tab.menuItems.includes(item))
  );
  const canPresent = Boolean(
    dump.meta?.capabilities?.screenShare || dump.meta?.capabilities?.postAlert
  );
  assert(
    sawPresenterItems === canPresent,
    'presenter-only menu entries appear exactly when the role can present',
    { roleGuess: dump.meta?.roleGuess, canPresent, sawPresenterItems }
  );

  // The component must implement whichever entries this role's dump proves.
  assert(
    screenTabs.includes('Detach Screen to a new window') && screenTabs.includes('Lock Screen'),
    'ScreenTabs.svelte implements the captured menu entries',
    paths.screenTabs
  );
  assert(
    screenTabs.includes('{screen.name}-{screen.screenName}'),
    'ScreenTabs.svelte renders the `{name}-{screenName}` label',
    paths.screenTabs
  );

  const eyeTab = screens.find((tab) => tab.hasEyeBadge);
  if (eyeTab?.eyeTooltip) {
    assert(
      screenTabs.includes(eyeTab.eyeTooltip.slice(0, 60)),
      'ScreenTabs.svelte quotes the captured default-screen tooltip verbatim',
      eyeTab.eyeTooltip.slice(0, 90) + '…'
    );
  }

  // Selection state differs before and after Bootstrap's tab JS runs. Both are real; record which
  // this dump caught so the component is never "corrected" against only one of them.
  const selectedFlags = screens.map((tab) => tab.ariaSelected);
  const tabindexes = screens.map((tab) => tab.tabindex);
  findings.push({
    claim: 'observed tab selection state',
    detail: {
      ariaSelected: selectedFlags,
      tabindex: tabindexes,
      note:
        selectedFlags.filter((flag) => flag === 'true').length > 1
          ? 'initial render: every tab aria-selected=true, no tabindex (pre-interaction)'
          : 'post-interaction: Bootstrap has written true/false and tabindex=-1'
    },
    ok: true
  });
}

/* ------------------------------------------------------------- alert Q&A buttons ------------ */
const qa = extracted.alertQaButtons ?? [];
const qaClasses = [...new Set(qa.map((button) => button.class))];

assert(
  qa.length > 0,
  'the dump contains alert Q&A buttons',
  `${qa.length} buttons, ${qaClasses.length} distinct class strings`
);

if (qa.length > 0) {
  assert(
    qaClasses.length === 1,
    'every Q&A button carries one class string in this capture',
    qaClasses
  );

  const flashing = qa.filter((button) => button.isFlashing);
  const withCount = qa.filter((button) => /\(\d+\)/.test(button.text));
  const answered = qa.filter((button) => button.text.includes('✅'));
  const unanswered = withCount.filter((button) => !button.text.includes('✅'));

  findings.push({
    claim: 'observed Q&A button states',
    detail: {
      total: qa.length,
      withCount: withCount.length,
      answered: answered.length,
      unansweredWithCount: unanswered.length,
      flashing: flashing.length,
      note:
        flashing.length === 0 && unanswered.length > 0
          ? `${unanswered.length} alerts have unanswered questions and NONE flash - the flash is not "has unanswered questions" for this role`
          : 'flashing observed; record the exact class string above'
    },
    ok: true
  });

  assert(
    roomMessage.includes('questionColor'),
    'RoomMessage.svelte applies questionColor to Q&A bodies',
    paths.roomMessage
  );
}

/* ------------------------------------------------------------------ router codecs ----------- */
// Only present when the dump was taken with the media probe; the plain dump has no signalling.
const routerCaps = (dump.routerCapabilities ?? [])
  .map((entry) => entry.routerRtpCapabilities)
  .find(Boolean);

if (routerCaps?.codecs) {
  const video = routerCaps.codecs.filter(
    (codec) => (codec.kind ?? codec.mimeType?.split('/')[0]) === 'video'
  );
  findings.push({
    claim: 'DEPLOYED router video codec order (the thing codecs.rs is built on)',
    detail: video.map((codec) => codec.mimeType),
    ok: true
  });
  assert(
    /MimeTypeVideo::Vp9/.test(codecs.split('media_codecs()')[1] ?? codecs),
    'codecs.rs still advertises VP9 first',
    paths.codecs
  );
  const first = video[0]?.mimeType?.toLowerCase();
  assert(first === 'video/vp9', 'the DEPLOYED router leads with VP9, matching codecs.rs', {
    deployedFirstVideoCodec: video[0]?.mimeType ?? null
  });
} else {
  findings.push({
    claim: 'router codec order not in this dump',
    detail: 'run scripts/ptr-auto-dump.js (the probing variant) to capture signalling',
    ok: true
  });
}

/* ------------------------------------------------------------------------ produce ----------- */
const screenProduces = (dump.produces ?? []).filter((entry) => entry.appData?.share === true);
if (screenProduces.length > 0) {
  findings.push({
    claim: 'DEPLOYED screen producer encodings (did useSharingSimulcast fire?)',
    detail: screenProduces.map((entry) => ({
      screenName: entry.appData?.screenName ?? null,
      encodings: entry.encodings,
      verdict: entry.encodings
        ? 'simulcast/SVC ON'
        : 'encodings absent - useSharingSimulcast was OFF'
    })),
    ok: true
  });
}

/* ------------------------------------------------------------------------- report ----------- */
const report = {
  generatedFrom: dumpPath,
  role: dump.meta?.roleGuess ?? null,
  capabilities: dump.meta?.capabilities ?? null,
  capturedAt: dump.meta?.capturedAt ?? null,
  nodeCount: dump.nodes?.length ?? null,
  findings,
  failures
};

await mkdir(resolve('docs/generated'), { recursive: true });
await writeFile(paths.report, JSON.stringify(report, null, 2) + '\n', 'utf8');

console.log(`media contract audit - ${dumpPath}`);
console.log(`  role: ${report.role}  nodes: ${report.nodeCount}`);
for (const finding of findings) {
  console.log(`  OK   ${finding.claim}`);
  if (finding.detail !== undefined)
    console.log(`       ${JSON.stringify(finding.detail).slice(0, 220)}`);
}
for (const failure of failures) {
  console.log(`  FAIL ${failure.claim}`);
  console.log(`       ${JSON.stringify(failure.detail).slice(0, 220)}`);
}
console.log(`  report: ${paths.report}`);

if (failures.length > 0) process.exitCode = 1;
