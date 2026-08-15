import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ROOM_SETTINGS } from './room-settings-schema';

/**
 * Defects that are IN THE REFERENCE and are deliberately not carried into this rebuild.
 *
 * ## Why a file of its own
 *
 * "Match the reference" is the standing instruction, and it is the right one — almost every
 * difference found so far has been our bug, not theirs. But the reference has real defects, and a
 * faithful transcription of one ships it. The dangerous case is the defect that LOOKS like a
 * deliberate choice, because the next person reading our code beside the template sees a mismatch
 * and "fixes" it back.
 *
 * Each entry names the defect, cites the line, and asserts we do not reproduce it.
 */

/* `${cwd}/…`, matching `manage-panel-bootstrap3-contract.test.ts`: the evidence sits at the app
   root, two levels above this file, and vitest runs from the app root. */
const VIEWS = `${process.cwd()}/evidence-dumps/TIER1-fetched/views`;
const TEMPLATE = readFileSync(`${VIEWS}/page.manageSession.html`, 'utf8');

describe('the Logout Webhook row edits the LOGIN webhook — page.manageSession.html:854', () => {
  /*
    The reference's row:

      <label …>Logout Webhook URL</label>
      <a onaftersave="saveSessField('logout_webhook_url')"
         editable-textarea="sess.login_webhook_url"
         e-label="Logout Webhook URL:">{{ sess.logout_webhook_url || 'empty' }}</a>

    Three references to a webhook field and one of them is the wrong one. The label says Logout, the
    save target is `logout_webhook_url`, the DISPLAY is `logout_webhook_url` — but the thing the
    editor binds and puts in the input is `login_webhook_url`.

    So opening the Logout Webhook editor shows the LOGIN webhook's current value, and saving writes
    it to the logout field. An owner who opens the row to check it, and saves without editing, has
    just copied their login webhook over their logout webhook. It reads correctly until you use it.
  */
  it('IS present in the reference — the citation is real, not remembered', () => {
    /* Guards against this whole file becoming fiction if the evidence is ever re-fetched and the
       defect turns out to have been fixed upstream. If this fails, re-read line 854 before touching
       anything else. */
    expect(TEMPLATE).toContain(
      `onaftersave="saveSessField('logout_webhook_url')" editable-textarea="sess.login_webhook_url"`
    );
  });

  it('cannot occur here, because every settings row binds its own name', () => {
    /*
      Ours renders `<Editable {def} value={settingValue(def.name)} />` in a loop over the schema, so
      the label, the value and the save target are all `def.name` by construction. There is no
      second identifier to get wrong.
    */
    const SOURCE = readFileSync(
      new URL('../routes/(app)/account/rooms/[id]/[[tab]]/+page.svelte', import.meta.url),
      'utf8'
    );
    expect(SOURCE).toContain('<Editable {def} value={settingValue(def.name)} />');
    /* The shape that would reintroduce it: a hardcoded field name next to a different label. */
    expect(SOURCE).not.toContain("settingValue('login_webhook_url')");
  });

  it('carries both webhook settings as separate keys, so neither can stand in for the other', () => {
    const names = ROOM_SETTINGS.map((d) => d.name);
    expect(names).toContain('login_webhook_url');
    expect(names).toContain('logout_webhook_url');
  });
});

describe('the stats period select — page.stats.html:31-36', () => {
  it('has four options that all submit the same value, in the reference', () => {
    /* Recorded as T5-19. Not reproduced, and not "fixed" either — we do not render that page at all
       yet, and when we do, this test says what the original did so the choice is explicit. */
    const STATS = readFileSync(`${VIEWS}/page.stats.html`, 'utf8');
    expect(STATS.split('value="hourly"').length - 1).toBe(4);
    /* And no ng-model anywhere on it, so nothing reads the choice regardless. */
    const selectAt = STATS.indexOf('<select>');
    expect(selectAt).toBeGreaterThan(-1);
    expect(STATS.slice(selectAt, STATS.indexOf('</select>', selectAt))).not.toContain('ng-model');
  });
});
