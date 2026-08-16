import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  The screens tab bar must be as tall as its tabs.

  `#screenTabs { height: 1px }` was never a captured declaration. It is the computed height of ONE
  captured node - `main-tab:Screens`, path `r.0#screens.1#screenTabs` - recorded in a session where
  no screen was shared, so the bar was an empty flex container: 0px of content plus its own 1px
  bottom border. Frozen as a rule it collapses the populated bar to 1px while its `li` tabs stay
  40px, and they overhang the video.

  These assertions move together: the captured sheets prove no height was ever declared, the
  capture's own layout numbers put the populated bar at 41.5px (derived, not observed - see the
  note on that assertion below), and our sheet has to declare
  neither height nor a reserve that double-counts it.
*/

const CAPTURED_SHEET = new URL('../../docs/source/styles.d622cb9ed2bbc221.css', import.meta.url);
const CAPTURED_COMPONENT_SHEET = new URL(
  '../../docs/source/components/app-presentationarea.component.css',
  import.meta.url
);
const CAPTURED_APPLIED_SHEET = new URL('../../css/complete-app-styles.css', import.meta.url);
const CAPTURE_DUMP = new URL(
  '../../proroom-ULTIMATE-staff-2026-07-24T12-42-02-part1.json',
  import.meta.url
);

const appCssRaw = readFileSync(new URL('../app.css', import.meta.url), 'utf8');
// Comments stripped before any assertion - a contract test that matches its own prose is testing
// the wrong document (see screen-stacking-contract.test.ts).
const appCss = appCssRaw.replace(/\/\*[\s\S]*?\*\//g, '');

const capturedGlobal = readFileSync(CAPTURED_SHEET, 'utf8');
const capturedComponent = readFileSync(CAPTURED_COMPONENT_SHEET, 'utf8');
const capturedApplied = readFileSync(CAPTURED_APPLIED_SHEET, 'utf8');

/**
 * Every declaration block in our sheet whose selector list mentions the given selector as a whole
 * token - `#streamsTabs` must not drag in `#streamsTabsContent`.
 */
function ourRulesFor(selector: string): string[] {
  const token = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w-])`);
  const rules: string[] = [];
  for (const match of appCss.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    if (token.test(match[1])) rules.push(match[2]);
  }
  return rules;
}

describe('screens tab bar height', () => {
  it('is not declared anywhere in the capture', () => {
    // The only `.screens-tabs` rule on the bar itself, verbatim from the captured global sheet.
    expect(capturedGlobal).toContain(
      '.screens-tabs{border-color:transparent;position:relative;z-index:1}'
    );
    // The component sheet sizes the CONTENT below the bar, never the bar.
    expect(capturedComponent).toContain(
      '#streamsTabsContent[_ngcontent-%COMP%], #screensTabsContent[_ngcontent-%COMP%]{height:calc(100% - 82px)}'
    );
    // No captured stylesheet targets the bar by id at all, so nothing can have declared a height
    // through that selector either.
    for (const [name, sheet] of [
      ['styles.d622cb9ed2bbc221.css', capturedGlobal],
      ['app-presentationarea.component.css', capturedComponent],
      ['complete-app-styles.css', capturedApplied]
    ] as const) {
      // Whole token: `#streamsTabsContent` is a different element and does exist.
      expect(sheet, `${name} must not target #screenTabs`).not.toMatch(/#screenTabs(?![\w-])/);
      expect(sheet, `${name} must not target #streamsTabs`).not.toMatch(/#streamsTabs(?![\w-])/);
    }
    // And no `.screens-tabs` rule in any captured sheet declares a height.
    for (const sheet of [capturedGlobal, capturedApplied]) {
      for (const match of sheet.matchAll(/([^{}]*\.screens-tabs[^{}]*)\{([^}]*)\}/g)) {
        expect(match[2], `captured rule "${match[1].trim()}" must not size the bar`).not.toMatch(
          /(^|;)\s*(min-)?height\s*:/
        );
      }
    }
  });

  it('is left to the tabs in our sheet', () => {
    const rules = ourRulesFor('#screenTabs');
    expect(rules.length, 'our sheet must still style the bar').toBeGreaterThan(0);
    for (const body of rules) {
      expect(body, 'nothing may pin the bar height').not.toMatch(/(^|;)\s*(min-)?height\s*:/);
    }
    for (const body of ourRulesFor('#streamsTabs')) {
      expect(body).not.toMatch(/(^|;)\s*(min-)?height\s*:/);
    }
    // The captured half of the same block is untouched.
    const bar = rules[0];
    expect(bar).toMatch(/position:\s*relative/);
    expect(bar).toMatch(/z-index:\s*1/);
    expect(bar).toMatch(/border-bottom:\s*1px solid transparent/);
    // `--notes-tabs-bg`, not `--darker-black`. This assertion previously pinned the latter; both
    // hold #111 and both compute to the captured rgb(17,17,17), so no pixel moved. It was changed
    // because the captured sheet keys `.screens-tabs` off `--notes-tabs-bg` by name, and matching
    // the source's own variable is what keeps this bar with its siblings under a future theme.
    expect(bar).toMatch(/background:\s*var\(--notes-tabs-bg\)/);
  });

  it('closes the capture arithmetic: 82 = the main bar plus this bar', () => {
    // Every number below is a rect from the capture dump, asserted against the dump itself in the
    // next test.
    const HOLDER_TOP = 49; // baseline-room: #mainTabs y
    const MAIN_TABS_HEIGHT = 40.5; // baseline-room: #mainTabs h
    const MAIN_TABS_CONTENT_TOP = 89.5; // baseline-room: #mainTabsContent y
    const PANE_HEIGHT = 1216; // main-tab:Screens: #screens h (= holder h)
    const CONTENT_HEIGHT = 1134; // main-tab:Screens: #screensTabsContent h
    const CAPTURED_RESERVE = 82; // app-presentationarea.component.css

    expect(HOLDER_TOP + MAIN_TABS_HEIGHT).toBe(MAIN_TABS_CONTENT_TOP);
    expect(PANE_HEIGHT - CAPTURED_RESERVE).toBe(CONTENT_HEIGHT);

    // #mainTabsContent is `height: 100%` beside a sibling bar, so it overflows the holder bottom by
    // exactly the bar. For the screens content to still end on that bottom:
    const holderBottom = HOLDER_TOP + PANE_HEIGHT;
    const barHeight = holderBottom - MAIN_TABS_CONTENT_TOP - CONTENT_HEIGHT;
    // DERIVED from the reserve, not observed: no capture holds a populated #screenTabs. What is
    // actually pinned here is the decomposition of the captured 82, not a measured bar height.
    expect(barHeight).toBe(41.5);

    // That is what the 82 is: the phantom overflow plus the real bar - two bars, not one.
    expect(MAIN_TABS_HEIGHT + barHeight).toBe(CAPTURED_RESERVE);
    // And it is not the 1px this sheet used to pin.
    expect(barHeight).not.toBe(1);
  });

  it('reads those numbers back out of the capture dump', () => {
    const dump = readFileSync(CAPTURE_DUMP, 'utf8');

    /** Every rect recorded for a node path, in capture order. */
    const rectsFor = (path: string) => {
      const needle = `"path":"${path}","tag":"`;
      const out: { x: number; y: number; w: number; h: number }[] = [];
      for (let i = dump.indexOf(needle); i !== -1; i = dump.indexOf(needle, i + 1)) {
        const start = dump.indexOf('"rect":{', i) + '"rect":'.length;
        out.push(JSON.parse(dump.slice(start, dump.indexOf('}', start) + 1)));
      }
      return out;
    };

    const pane = 'r.0.1#topRoomDiv.0.0.2#mainAreaSplit.1.1.0';
    const mainTabs = rectsFor(`${pane}.0#mainTabs`).filter((r) => r.h > 0);
    expect(mainTabs.length).toBeGreaterThan(0);
    for (const r of mainTabs) {
      expect(r.y).toBe(49);
      expect(r.h).toBe(40.5);
    }

    const mainTabsContent = rectsFor(`${pane}.1#mainTabsContent`).filter((r) => r.h > 0);
    expect(mainTabsContent.length).toBeGreaterThan(0);
    for (const r of mainTabsContent) {
      expect(r.y).toBe(89.5);
      expect(r.h).toBe(1216);
    }

    // The one capture that laid the screens pane out. The bar is 1px there BECAUSE it is empty:
    // its sibling is the "no one is presenting" h3, and the dump holds no child node under any
    // #screenTabs - the populated bar is an honest gap in the capture, supplied by the arithmetic.
    const bar = rectsFor('r.0#screens.1#screenTabs').filter((r) => r.h > 0);
    expect(bar).toEqual([{ x: 655.5, y: 155.1, w: 1186.5, h: 1 }]);
    expect(dump.includes('"path":"r.0#screens.1#screenTabs.')).toBe(false);
    expect(dump.includes('"path":"r.0#screens.0","tag":"h3"')).toBe(true);

    const content = rectsFor('r.0#screens.2#screensTabsContent').filter((r) => r.h > 0);
    expect(content).toEqual([{ x: 655.5, y: 156.1, w: 1186.5, h: 1134 }]);
  });

  it('does not spend the reserve twice now that the parent overflow is gone', () => {
    // The captured declaration itself is preserved, unedited.
    expect(appCss).toMatch(
      /#screensTabsContent,\s*#streamsTabsContent\s*\{[^}]*calc\(100% - 82px\)/
    );

    // 40.5 of that 82 paid for a #mainTabsContent overflow this sheet already removed, so the
    // reserve is replaced by the bar's real height.
    const pane = ourRulesFor('app-presentationarea #screens:not(:root).active')[0];
    expect(pane, '#screens must lay its bar and content out in a column').toBeTruthy();
    expect(pane).toMatch(/display:\s*flex/);
    expect(pane).toMatch(/flex-direction:\s*column/);

    const content = ourRulesFor('app-presentationarea #screensTabsContent:not(:root)')[0];
    expect(content, '#screensTabsContent must take the remainder').toBeTruthy();
    expect(content).toMatch(/height:\s*auto/);
    expect(content).toMatch(/flex:\s*1 1 auto/);
    expect(content).toMatch(/min-height:\s*0/);

    // The correction it mirrors, one level up, must still be in place - without it the 82 would be
    // right and this rule would be wrong.
    const mainContent = ourRulesFor('app-presentationarea #mainTabsContent:not(:root)')[0];
    expect(mainContent).toMatch(/flex:\s*1 1 auto/);
    expect(mainContent).toMatch(/height:\s*auto/);
  });
});

/*
  The bar exists whether or not anyone is sharing.

  Reported by the owner 2026-08-11: the strip's background was missing from where the screens go.
  The cause was that the tab bar sat in the alternate branch of the "no one is presenting"
  conditional, so an idle room rendered the heading INSTEAD of the bar and the only element in that
  whole region carrying a background was not in the document at all.

  The capture is unambiguous that they are siblings, and it is a capture taken with NOTHING shared -
  which is exactly the state that was broken. Under `r.0#screens` it holds three children in order:
  `.0` the h3, `.1#screenTabs`, `.2#screensTabsContent`. The bar is the only one of the three with
  an opaque background, and `#screens` itself is transparent, so it is the layer the owner was
  pointing at.
*/
describe('the screens tab bar is not conditional on anyone sharing', () => {
  // The screens pane moved to `PresentationArea.svelte` on 2026-08-15, heading and bar together.
  const page = readFileSync(
    new URL('./components/PresentationArea.svelte', import.meta.url),
    'utf8'
  );

  it('renders the bar as a sibling of the idle heading, not as its alternative', () => {
    // Comments stripped first: the block above and the one in `+page.svelte` both DESCRIBE the
    // defect, and a test that matches its own explanation proves nothing.
    const source = page.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

    const guard = source.indexOf('sharedScreens.length === 0');
    expect(guard, 'the idle heading guard must still exist').toBeGreaterThan(-1);

    const heading = source.indexOf('No one is presenting right now...', guard);
    const tabs = source.indexOf('<ScreenTabs', guard);
    expect(heading).toBeGreaterThan(-1);
    expect(tabs).toBeGreaterThan(-1);

    // THE assertion. Everything between the guard and the bar is the heading's branch, and it has
    // to CLOSE before the bar - an alternate branch there is the defect, restored.
    const between = source.slice(guard, tabs);
    expect(between).toContain('{/if}');
    expect(between, 'the bar must not sit in the alternate branch').not.toContain('{:else}');
    expect(between.indexOf('{/if}')).toBeGreaterThan(between.indexOf(heading > -1 ? 'No one' : ''));
  });

  it('gives the bar the background the capture recorded, from the variable the source used', () => {
    const bar = ourRulesFor('#screenTabs')[0];
    expect(bar, '#screenTabs must still be declared').toBeTruthy();

    // rgb(17,17,17) in the capture; `--notes-tabs-bg` is what the captured sheet names for
    // `.screens-tabs`, and `--darker-black` is a second token holding the same #111. Naming the
    // one the source names keeps this bar with its siblings if a theme ever moves it.
    expect(bar).toMatch(/background:\s*var\(--notes-tabs-bg\)/);
    expect(capturedGlobal).toContain('.screens-tabs,.files-tabs,.noteTabset');
    expect(capturedGlobal).toMatch(
      /\.screens-tabs[^{]*\{background-color:var\(--notes-tabs-bg\)\}/
    );
  });

  it('is the only background in the region, and sits between the heading and the content', () => {
    const dump = readFileSync(CAPTURE_DUMP, 'utf8');

    /** The computed value of one property on one captured node path. */
    const styleOf = (path: string, prop: string) => {
      const at = dump.indexOf(`"path":"${path}","tag":"`);
      expect(at, `${path} must be in the dump`).toBeGreaterThan(-1);
      const style = dump.indexOf('"style":{', at);
      const key = `"${prop}":"`;
      const start = dump.indexOf(key, style) + key.length;
      return dump.slice(start, dump.indexOf('"', start));
    };

    expect(styleOf('r.0#screens.1#screenTabs', 'background-color')).toBe('rgb(17, 17, 17)');
    // Its parent and both siblings are transparent - so removing the bar removes the only paint.
    expect(styleOf('r.0#screens', 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(styleOf('r.0#screens.0', 'background-color')).toBe('rgba(0, 0, 0, 0)');
    expect(styleOf('r.0#screens.2#screensTabsContent', 'background-color')).toBe(
      'rgba(0, 0, 0, 0)'
    );

    // And it occupies layout while idle: the content starts exactly where the 1px bar ends.
    expect(155.1 + 1).toBeCloseTo(156.1, 5);
  });
});
