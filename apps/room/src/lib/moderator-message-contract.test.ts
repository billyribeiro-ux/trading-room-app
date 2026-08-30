import { render } from 'svelte/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import ModeratorMessage from './components/ModeratorMessage.svelte';

/**
 * THE MODERATOR BAR — presenter-only, and dismissed locally on purpose.
 *
 * `O(2, e.modMessage && globals.isPresenter ? 2 : -1)` at bundle byte 2,493,284, fed by
 * `this.modMessage = sessData.modMessage` (2,498,699). Its markup and five consts are transcribed in
 * the component; what this file asserts is the GATE, the strings and the wire.
 *
 * The parenthetical in the heading — *"(only you see this message)"* — is the capture's own, and it
 * is asserted verbatim because it is the sentence that tells a presenter the bar is not visible to
 * the room. Paraphrasing it would change what a presenter believes about their own screen.
 */
const page = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const area = readFileSync(new URL('./components/PresentationArea.svelte', import.meta.url), 'utf8');

/*
  COMMENTS STRIPPED before any `not.toContain`, and this file needed it immediately.

  The page's own docblock explains the fallback by NAMING the reference's `"PTR Session"` default —
  so the first draft of the assertion below matched the sentence explaining why the string is not
  used. An assertion that matches its own explanation is one this repository has already met once
  today, on `publishToUsers`. `toContain` is left against the raw source, because a positive
  assertion cannot be satisfied by prose that merely mentions the code.
*/
const pageCode = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const html = (message: string, isPresenter: boolean) =>
  render(ModeratorMessage, { props: { message, isPresenter } }).body;

describe('the moderator message bar', () => {
  it('draws the captured markup for a presenter in a room that set one', () => {
    const body = html('Careful with the 3pm print', true);
    expect(body).toContain('mod-msg-container');
    expect(body).toContain('Moderator Message (only you see this message):');
    expect(body).toContain('Careful with the 3pm print');
    // The three captured classes, each of which has a real rule in the captured stylesheet.
    expect(body).toContain('animated fadeIn mod-msg-container');
    expect(body).toContain('mod-msg-btn');
    expect(body).toContain('text-warning mod-msg');
  });

  /*
    BOTH REFUSALS, because the gate is a conjunction and either half failing alone is a different
    bug: a member seeing a moderator's private note, or a presenter never seeing it at all.
  */
  it('draws nothing for a member, whatever the room configured', () => {
    expect(html('Careful with the 3pm print', false)).not.toContain('mod-msg-container');
  });

  it('draws nothing when the room configured no message', () => {
    expect(html('', true)).not.toContain('mod-msg-container');
  });

  /*
    The wire, asserted because a component that renders correctly and receives nothing is exactly the
    failure the unfed-props sweep found six times today.
  */
  it('is fed from sessData and gated on the ROLE at the call site', () => {
    expect(page).toContain("modMessage={data.sessData?.modMessage ?? ''}");
    expect(area).toContain('<ModeratorMessage message={modMessage} {isPresenter} />');
  });

  /*
    Dismissal is LOCAL. `closeModMessage() { this.modMessage = "" }` (byte 2,532,005) clears the
    component's own field and persists nothing, so the bar returns on the next load. A `prefs.save`
    here would be a decision the reference does not make.
  */
  it('dismisses without persisting anything', () => {
    const component = readFileSync(
      new URL('./components/ModeratorMessage.svelte', import.meta.url),
      'utf8'
    );
    expect(component).toContain('dismissed = true');
    expect(component).not.toContain('save(');
    expect(component).not.toContain('prefs');
  });
});

/**
 * THE BROWSER TAB — the room's own name.
 *
 * `globals.sessionName = r.name` (byte 1,149,312), then `titleService.setTitle(globals.sessionName)`
 * on `globalsLoaded` (2,594,952). A page's `<svelte:head>` is where a document title belongs.
 *
 * The FALLBACK is this application's own title rather than the reference's `"PTR Session"` default
 * (byte 977,053): a room with no configured name should read as this product, not as the one it was
 * reconstructed from. That is a deliberate divergence and is asserted so it cannot drift back.
 */
describe('the document title', () => {
  it('is the room name, trimmed, with this product as the fallback', () => {
    expect(page).toContain("<title>{data.sessData?.name?.trim() || 'PTRChat'}</title>");
  });

  it('does not fall back to the reference brand string', () => {
    expect(pageCode).not.toContain('PTR Session');
  });

  /*
    ONE CONSUMER IS NOT BUILT — it was two, and this assertion did its job.

    It read: *"this assertion exists so that adding either without updating that document fails
    here."* On 2026-08-30 the private-chat notification flasher was built (surface-audit row G27) and
    this went red, which is exactly the tripwire working. The title now alternates between
    `"<sender> messaged you - <room>"` and the room name every two seconds while a private message
    is unread and the composer does not have focus — `private-chat-title-flash.ts` carries the
    transcription.

    What is STILL a gap is the transcript window's `&name=` parameter, bytes 1,958,716 and
    2,532,633, and it keeps its half of the assertion. The flasher's half moves to the module that
    now owns it rather than being deleted: `private-chat-strip-contract.test.ts` asserts the string
    IS there, so the two together still say where it may and may not appear.

    `docs/decoded/missing-settings-triage.md` records the remaining one.
  */
  it('has not quietly grown the consumer that is still a gap', () => {
    /*
      The PAGE must not carry the flasher — it belongs to the private-chat module, and a copy here
      would be a second thing writing `document.title` with no way to tell which won.
    */
    expect(pageCode).not.toContain('messaged you -');
    expect(pageCode).not.toContain('transcriptWindow');
  });
});
