import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  `scripts/pull-everything.js` is pasted into a DevTools console, so it is one IIFE with no exports
  and it cannot be imported. This lifts its pure functions straight out of the shipped file text and
  evaluates them - the same technique as const-table-parser.test.ts - which means every assertion
  below is pinned to the bytes the owner actually pastes.

  The input is the pinned v4 bundle, docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js, because it is
  the newest complete reference artifact held by this repository and the one used by the current
  101-surface audit. It is also an artifact where
  artifact where absence means absence: Angular compiles every branch, icon and handler into it and
  serves the same bytes to a member, a presenter and a logged-out browser. Nothing here reads a DOM
  capture, and the test process has no `document` at all - which is itself the proof that the
  bundle path is not gated on anything being rendered.
*/

const script = readFileSync(new URL('../../scripts/pull-everything.js', import.meta.url), 'utf8');
const bundle = readFileSync(
  new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url),
  'utf8'
);

/** Slices `function <name>(...) { ... }` out of the script - inside the IIFE they close on `\n  }`. */
function lift(name: string): string {
  const from = script.indexOf(`function ${name}(`);
  expect(from, `${name} should be defined in pull-everything.js`).toBeGreaterThan(-1);
  const to = script.indexOf('\n  }\n', from);
  expect(to, `${name} should close on a two-space-indented brace`).toBeGreaterThan(from);
  return script.slice(from, to + '\n  }'.length);
}

/** The pure bundle path, in dependency order. extractBundle calls all of the others. */
const PURE = [
  'matchBracket',
  'bracketedValue',
  'parseConstTable',
  'decodeEntry',
  'idsFromEntries',
  'classIndex',
  'classEndOffset',
  'selectorAnchors',
  'componentSpan',
  'renderedText',
  'iconsInSource',
  'extractBundle'
];

type Component = {
  selector: string;
  kind: string;
  strategy: string;
  constCount: number;
  decoded: string[];
  ids: string[];
  icons: { fromConsts: string[]; fromSource: string[] };
  text: string[];
  css: string[];
  cssBytes: number;
  source: string;
  consts: string | null;
};

type Report = {
  bytes: number;
  discovery: {
    definitions: number;
    elementSelectors: string[];
    regexFallbackSelectors: string[];
    onlyFoundByParser: string[];
    onlyFoundByRegex: string[];
  };
  components: Component[];
  notes: string[];
};

type ExtractedComponent = {
  selector: string;
  start: number;
  end: number;
  bytes: number;
  sha256: string;
  readableBytes: number;
  readableSha256: string;
  readableRenderPreludeBytes: number;
  readableRenderPreludeSha256: string | null;
  fullReadableBytes: number;
  fullReadableSha256: string;
  styleCharacters: number;
  styleSha256: string | null;
  sourceFile: string;
  renderHelpersFile: string | null;
  fullSourceFile: string;
  styleFile: string | null;
};

type ExtractionManifest = {
  bundle: { path: string; bytes: number; sha256: string };
  componentCount: number;
  components: ExtractedComponent[];
};

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function extracted(relativePath: string): string {
  return readFileSync(new URL(`../../${relativePath}`, import.meta.url), 'utf8');
}

const liftedSource = PURE.map(lift).join('\n');
const core = new Function(`${liftedSource}\nreturn {${PURE.join(',')}};`)() as {
  extractBundle: (source: string, url: string) => Report;
  parseConstTable: (text: string) => unknown[];
  matchBracket: (text: string, start: number, open: string, close: string) => number;
};

const report = core.extractBundle(bundle, 'docs/source/main.d6d3c112b59b7d0d.js');
const bySelector = new Map(report.components.map((record) => [record.selector, record]));

function component(selector: string): Component {
  const record = bySelector.get(selector);
  expect(record, `${selector} should be extracted from the bundle`).toBeDefined();
  return record as Component;
}

describe('pull-everything: discovery', () => {
  it('runs with no DOM at all, so nothing about it is gated on an element existing', () => {
    expect(typeof document).toBe('undefined');
    expect(liftedSource).not.toMatch(/\bdocument\b|\bwindow\b|querySelector|getElementById/);
    expect(report.bytes).toBe(bundle.length);
  });

  it('discovers every definition in the file, not a hardcoded list', () => {
    // Counted here independently rather than asserted as a literal: the number is whatever the
    // shipped bundle contains, and a redeploy that adds a component must move both sides together.
    const anchors = bundle.split('selectors:[').length - 1;
    expect(anchors).toBeGreaterThan(60);
    expect(report.discovery.definitions).toBe(anchors);
    expect(report.components).toHaveLength(anchors);
    expect(report.notes.filter((note) => note.includes('no span'))).toEqual([]);
  });

  it('is a strict superset of the regex the older script used', () => {
    const regexNames = [
      ...new Set([...bundle.matchAll(/selectors:\[\["([a-z][a-z0-9-]*)"\]\]/g)].map((m) => m[1]))
    ].sort();
    expect(report.discovery.regexFallbackSelectors).toEqual(regexNames);
    expect(report.discovery.onlyFoundByRegex).toEqual([]);
    for (const name of regexNames) expect(report.discovery.elementSelectors).toContain(name);

    // The parser finds what the regex structurally cannot: a selector list whose first entry has
    // more than a tag name, e.g. [["input","type","checkbox","formControlName",""], ...].
    expect(report.discovery.onlyFoundByParser.length).toBeGreaterThan(0);
    expect(report.discovery.onlyFoundByParser).toContain('input');
  });

  it('names every app component, including ones no session renders', () => {
    for (const selector of [
      'app-room',
      'app-presentationarea',
      'app-screenshare-view',
      'app-detached-screen',
      'app-session-control-modal',
      'app-webrtc-troubleshooter',
      'app-kicked-page'
    ]) {
      expect(report.discovery.elementSelectors).toContain(selector);
    }
  });
});

describe('pull-everything: decoding', () => {
  it('pins every artifact in the separate v4 component corpus to its manifest and raw bundle span', () => {
    const manifest = JSON.parse(
      extracted('docs/source-v4-2026-08-15/components/manifest.json')
    ) as ExtractionManifest;
    expect(manifest.bundle).toEqual({
      path: 'docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js',
      bytes: bundle.length,
      sha256: digest(bundle)
    });
    expect(manifest.componentCount).toBe(51);
    expect(manifest.components).toHaveLength(manifest.componentCount);

    for (const artifact of manifest.components) {
      const raw = bundle.slice(artifact.start, artifact.end);
      expect(raw.length, `${artifact.selector} raw bytes`).toBe(artifact.bytes);
      expect(digest(raw), `${artifact.selector} raw digest`).toBe(artifact.sha256);

      const readable = extracted(artifact.sourceFile);
      expect(readable.length, `${artifact.selector} readable bytes`).toBe(artifact.readableBytes);
      expect(digest(readable), `${artifact.selector} readable digest`).toBe(
        artifact.readableSha256
      );

      const full = extracted(artifact.fullSourceFile);
      expect(full.length, `${artifact.selector} full bytes`).toBe(artifact.fullReadableBytes);
      expect(digest(full), `${artifact.selector} full digest`).toBe(artifact.fullReadableSha256);

      if (artifact.renderHelpersFile) {
        const helpers = extracted(artifact.renderHelpersFile);
        expect(helpers.length, `${artifact.selector} helper bytes`).toBe(
          artifact.readableRenderPreludeBytes
        );
        expect(digest(helpers), `${artifact.selector} helper digest`).toBe(
          artifact.readableRenderPreludeSha256
        );
      } else {
        expect(artifact.readableRenderPreludeBytes).toBe(0);
        expect(artifact.readableRenderPreludeSha256).toBeNull();
      }

      if (artifact.styleFile) {
        const css = extracted(artifact.styleFile).trimEnd();
        expect(css.length, `${artifact.selector} CSS bytes`).toBe(artifact.styleCharacters);
        expect(digest(css), `${artifact.selector} CSS digest`).toBe(artifact.styleSha256);
      } else {
        expect(artifact.styleCharacters).toBe(0);
        expect(artifact.styleSha256).toBeNull();
      }
    }
  });

  it("decodes app-room's table - the apostrophe case JSON.parse could not", () => {
    const room = component('app-room');
    expect(room.consts).toContain(`"Don't Disturb"`);
    // The exact byte that broke the old shortcut: replaceAll("'", '"') made this `"Don"t Disturb"`.
    expect(() => JSON.parse((room.consts as string).replaceAll("'", '"'))).toThrow();

    expect(room.constCount).toBeGreaterThan(200);
    const disturb = room.decoded.filter((line) => line.includes("Don't Disturb"));
    expect(disturb).toHaveLength(1);
    expect(disturb[0]).toContain('id="app-donot-disturb"');
    expect(disturb[0]).toContain('class="form-check-input"');
    expect(disturb[0]).toContain('[bound: change, checked]');
  });

  it('decodes app-presentationarea, including its hoisted role-gated templates', () => {
    const area = component('app-presentationarea');
    expect(area.kind).toBe('component');
    expect(area.strategy).toBe('class-iife');
    expect(area.constCount).toBeGreaterThan(200);

    // The screen-control cluster, docs/NEXT-SESSION-SCREEN-CONTROLS.md §2 and §8.
    for (const icon of ['fa-search', 'fa-camera', 'fa-search-plus', 'fa-redo', 'fa-expand']) {
      expect(area.icons.fromConsts).toContain(icon);
    }

    // Proof the span includes the PRELUDE - the *ngIf sub-templates Angular hoists in FRONT of the
    // class. `viewer-only-screen-zoom-controls` lives only there (render-helpers.js), and it is
    // exactly the kind of role-gated markup a DOM capture cannot see.
    expect(area.source).toContain('viewer-only-screen-zoom-controls');
    expect(area.source.length).toBeGreaterThan(50000);
  });

  it('extracts scoped CSS byte-for-byte, through the `[_ngcontent-%COMP%]` brackets', () => {
    // A naive depth counter would trip on the brackets inside the CSS strings, so this is compared
    // against the archived extraction. These three components' CSS is unchanged in v4; the
    // cross-version equality assertion prevents that premise from going stale silently.
    for (const selector of ['app-screenshare-view', 'app-presentationarea', 'app-room']) {
      const archived = readFileSync(
        new URL(`../../docs/source/components/${selector}.component.css`, import.meta.url),
        'utf8'
      );
      expect(component(selector).css.join('\n'), selector).toBe(archived.trimEnd());
    }
    expect(component('app-screenshare-view').css.join('\n')).toContain(
      '.zoom-controls-container-detached[_ngcontent-%COMP%]'
    );
    expect(report.components.filter((record) => record.cssBytes > 0).length).toBeGreaterThan(40);
  });

  it('emits icons, rendered text and ids for every component that has them', () => {
    const view = component('app-screenshare-view');
    expect(view.text).toContain(' Screen Detached.. Click here to re-attach ');
    expect(view.icons.fromConsts).toContain('fa-camera');

    const room = component('app-room');
    expect(room.text).toContain('Benzinga News');
    expect(room.icons.fromSource.length).toBeGreaterThanOrEqual(room.icons.fromConsts.length);

    // The modal index the report builds is made of these.
    expect(component('app-session-control-modal').ids).toContain('session-control-modal');
    expect(component('app-post-alert-modal').ids).toContain('alert-modal');
    const modalIds = report.components
      .flatMap((record) => record.ids)
      .filter((id) => /modal/i.test(id));
    expect(new Set(modalIds).size).toBeGreaterThan(20);
  });

  it('decodes something for the whole bundle, not just the components it was aimed at', () => {
    const total = report.components.reduce((sum, record) => sum + record.constCount, 0);
    expect(total).toBeGreaterThan(2000);
    expect(report.components.filter((record) => record.constCount > 0).length).toBeGreaterThan(50);
    expect(report.components.filter((record) => record.source.length > 0)).toHaveLength(
      report.components.length
    );
  });
});

describe('pull-everything: the shipped file itself', () => {
  it('parses the const table with the tokenizer and never with JSON.parse', () => {
    // `liftedSource` is the entire bundle path, byte for byte, and it is what ran above.
    expect(liftedSource).toContain('parseConstTable(table)');
    expect(liftedSource).not.toContain('replaceAll');
    expect(liftedSource).not.toContain('JSON.parse');
  });

  it('keeps quote state while matching brackets', () => {
    expect(core.matchBracket('[ "]" , 1 ]', 0, '[', ']')).toBe(10);
    expect(core.parseConstTable(`[["title","Don't Disturb"]]`)).toEqual([
      ['title', "Don't Disturb"]
    ]);
  });

  it('says in its own header which half is authoritative and which is session-specific', () => {
    expect(script).toContain(
      'BUNDLE SECTIONS ARE AUTHORITATIVE. DOM SECTIONS ARE SESSION-SPECIFIC.'
    );
    const header = script.slice(script.indexOf('HOW_TO_READ_THIS_FILE'));
    expect(header).toContain('BUNDLE SECTIONS ARE AUTHORITATIVE');
    expect(header).toContain('SESSION SECTIONS ARE NOT EVIDENCE OF ABSENCE');
  });

  it('has no hardcoded component list to fall out of date', () => {
    expect(script).not.toContain('const WANTED');
  });
});
