import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

function text(url: URL): string {
  return readFileSync(url, 'utf8');
}

describe('Notes captured stylesheet authority', () => {
  const sourceCss = text(new URL('../../css/complete-app-styles.css', import.meta.url));
  const bridgedCss = text(new URL('styles/captured-runtime-components.css', import.meta.url));
  const localCss = text(new URL('../app.css', import.meta.url));
  const notesPane = text(new URL('components/notes/NotesPane.svelte', import.meta.url));
  const presentationArea = text(new URL('components/PresentationArea.svelte', import.meta.url));

  it('retains the decoded Notes tab, menu, content, and action-bar rules', () => {
    expect(sourceCss).toContain(
      '.screens-tabs .nav-link, .mainTabset .nav-link, .noteTabset .nav-link { padding: 0.5rem; font-size: 12px; line-height: 12px; margin: 5px; color: var(--tabs-color); }'
    );
    expect(sourceCss).toContain(
      '.files-tabs, .mainTabset, .noteTabset { border-color: transparent; display: flex; align-items: center; justify-content: center; }'
    );
    expect(sourceCss).toContain('.noteTabset .nav-link.active { position: relative; z-index: 1; }');
    expect(sourceCss).toContain('.noteTabset { border-top: 1px solid var(--tabs-border-color); }');
    expect(sourceCss).toContain(
      '.screens-tabs .dropdown-menu, .mainTabset .dropdown-menu, .noteTabset .dropdown-menu'
    );
    expect(sourceCss).toContain(
      '.noteOptions { background-color: var(--note-options-bg); position: sticky; bottom: 0px; padding: 10px; }'
    );
    expect(sourceCss).toContain(
      '.note-container { background-color: var(--note-text-bg); color: var(--note-text-color); padding: 15px; height: calc(100% - 140px); overflow-y: auto; }'
    );
  });

  it('uses the decoded presentation-area bridge for full-height Notes layout', () => {
    // The element moved to `PresentationArea.svelte` on 2026-08-15.
    expect(presentationArea).toContain('<app-presentationarea>');
    expect(bridgedCss).toContain('app-presentationarea #notes:not(:root)');
    expect(bridgedCss).toContain(
      'app-presentationarea #notesTabsContent:not(:root) .tab-pane.active:not(:root)'
    );
    expect(bridgedCss).toContain(
      'app-presentationarea #notesTabsContent:not(:root) .note-container:not(:root)'
    );
  });

  it('forbids the local 2px tab collapse and component-scoped Notes layout overrides', () => {
    const notesTabRules: string[] = [];

    postcss.parse(localCss).walkRules((rule) => {
      for (const selector of rule.selectors) {
        if (selector.trim() === '#notesTabs') notesTabRules.push(selector);
      }
    });

    expect(notesTabRules).toEqual([]);
    expect(localCss).not.toMatch(/#notesTabs\s*\{[^}]*height:\s*2px/);
    expect(notesPane).not.toContain('<style>');
    expect(notesPane).not.toContain('class="notes-pane"');
  });

  it('NP-04 — the read-only note has `app-note` around it and the two rules that size it', () => {
    /*
      `app-note`'s own `styles:[…]` at bundle byte 1,487,671:

        [_nghost-%COMP%]{display:block;height:100%}
        .note-view[_ngcontent-%COMP%]{height:100%}

      The update block that writes `id="summernoteEdit-<id>"` and the innerHTML belongs to that same
      component, which is what settles the structure: the read-only body is INSIDE `app-note` and is
      the `.note-view` those rules size. This pane rendered a bare `<div>`.

      **The rules are in `app.css`, not in the component**, and that is this file's own rule three
      assertions up — a component-scoped Notes override fought the captured stylesheet once already.
      Asserted here so the pair cannot drift apart: the host element without the rules is an element
      that does nothing, and the rules without the host are two selectors matching nothing.
    */
    expect(notesPane, 'the read-only note lost its host element').toContain('<app-note>');
    expect(localCss).toContain('app-presentationarea app-note:not(:root)');
    expect(localCss).toContain('app-presentationarea app-note:not(:root) .note-view:not(:root)');
  });
});
