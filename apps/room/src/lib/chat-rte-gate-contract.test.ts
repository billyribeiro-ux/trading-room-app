import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
  The chat rich text editor's GATE, and the three places that have to ask it the same way.

  `chat-rich-text-contract.test.ts` covers what the editor may PRODUCE — the two sanitisers, the
  column, the renderer. This file covers who may reach it at all, which is a separate question and
  the one the reference gets wrong.

  The rule, and it is upstream's own expression, not an inference:

      sessData.enableRTE && preferences.enableRTE && isPresenter

  It appears three times in the decoded bundle and all three are load-bearing:

    * on the composer button — `O(5, …enableRTE && …enableRTE && …isPresenter ? 5 : -1)`, the fifth
      and last conditional in the same const block that resolves the image, YouTube and GIF buttons;
    * inside `loadRTE()`, which returns without constructing the editor;
    * inside `retriveRTEContent()`, which returns an empty string, so a send that was reached
      anyway reads nothing out.

  Three consumers means three chances to disagree, which is why this room resolves it ONCE into
  `canUseRTE` and every consumer reads that. This file asserts they do.

  Source-level for the reason `badge-row-reveal.test.ts` gives: these are client-state gates that
  SSR never exercises, so a rendered assertion is identical whether the gate is wired or cut.
*/

const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
const MODAL = readFileSync(new URL('./components/ModalHost.svelte', import.meta.url), 'utf8');
const EDITOR = readFileSync(new URL('./components/RichTextEditor.svelte', import.meta.url), 'utf8');
/*
  The edit path left `+page.server.ts` for `message-actions.remote.ts`. Re-pointed at the file that
  owns it — a `not.toContain` left behind would have started passing because the whole region moved.
*/
const SERVER = readFileSync(
  new URL('../routes/message-actions.remote.ts', import.meta.url),
  'utf8'
);
const ROOM_CONFIG_CLIENT = readFileSync(
  new URL('./server/room-config-client.ts', import.meta.url),
  'utf8'
);

const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');

const pageCode = stripComments(PAGE);
const modalCode = stripComments(MODAL);
const editorCode = stripComments(EDITOR);
const serverCode = stripComments(SERVER);

describe('the gate is the reference expression, resolved once', () => {
  it('all three terms, in one derived value', () => {
    expect(pageCode).toContain(
      'const canUseRTE = $derived(data.sessData?.enableRTE === true && enableRTE && isPresenter);'
    );
  });

  it('the owner term is a real setting that crosses the boundary', () => {
    // Absent from `ROOM_VISIBLE_SETTINGS` it would arrive `undefined` and the gate would never open,
    // however the owner configured the room — which is exactly how the join/leave beep was broken.
    expect(ROOM_CONFIG_CLIENT).toContain('enableRTE?: boolean;');
  });

  it("the presenter's own term defaults OFF, as the reference's defaults do", () => {
    /*
      `enableRTE` is NOT among the 25 keys in the reference's default preferences object (byte
      979500ff, where its neighbours `pushToTalk:!1` and `makeUsersFollowMyScreens:!1` are), so a
      fresh account evaluates the gate on `undefined`.

      Polarity matters and is easy to get backwards: `!== false` would default it ON and hand every
      presenter a toolbar the reference does not give them.
    */
    expect(pageCode).toContain('let enableRTE = $state(loadedSettings.enableRTE === true);');
    expect(pageCode).not.toContain('loadedSettings.enableRTE !== false');
  });
});

describe('every consumer reads that one value', () => {
  it('the composer button — the fifth conditional in the captured const block', () => {
    /*
      The composer moved to `AlertChatArea.svelte` on 2026-08-15. The BUTTON is read there; the gate
      it reads and the modal opener it calls are still the page's, so both hand-offs are asserted
      too — a button wired to a prop nothing supplies would otherwise satisfy every line here.
    */
    const paneCode = readFileSync(
      new URL('./components/AlertChatArea.svelte', import.meta.url),
      'utf8'
    );
    expect(pageCode).toContain('{canUseRTE}');
    expect(pageCode).toContain('onrte={openRTEModal}');

    const from = paneCode.indexOf('{#if canUseRTE}');
    expect(from, 'the composer must gate its button on canUseRTE').toBeGreaterThan(-1);
    const button = paneCode.slice(from, from + 600);
    expect(button).toContain('onclick={onrte}');
    // consts 67 and 89: `[1,"textAreaBtns",3,"click"]` and
    // `["ngbTooltip","Rich Text Editor","placement","left",1,"fas","fa-font"]`.
    expect(button).toContain('class="textAreaBtns"');
    expect(button).toContain("ngbtooltip: 'Rich Text Editor'");
    expect(button).toContain('class="fas fa-font"');
  });

  it('the modal — no editor at all when the gate is shut, not a disabled one', () => {
    /*
      `loadRTE()` refuses to CONSTRUCT summernote rather than building it and greying it out. The
      distinction is not cosmetic: a disabled editor is a control that exists, and this codebase's
      rule is that a control which cannot act should not be drawn.
    */
    expect(modalCode).toContain('<RichTextEditor');
    const host = modalCode.indexOf('<div id="msgTxtContainer">');
    expect(host, 'the captured host id must still be the mount point').toBeGreaterThan(-1);
    expect(modalCode.slice(host, modalCode.indexOf('</div>', host))).toContain('canUseRTE');
  });

  it('and is mounted only while the modal is OPEN, not for the whole session', () => {
    /*
      `Modal` renders children whether it is open or not — it hides with `inert` and
      `display: none`. Gating on `canUseRTE` alone therefore mounts the editor at page load, which
      runs its focus attachment into a hidden container and, worse, means it does NOT focus on the
      open that matters, because the attachment has already run.

      This was written that way in the first draft and found by re-reading the diff rather than by
      any test, which is why there is now a test.
    */
    expect(modalCode).toContain("{#if name === 'rich-text' && canUseRTE}");
  });

  it('the send — asked AGAIN, because retriveRTEContent asks again', () => {
    /*
      The second ask is upstream's own defence and is reproduced rather than trimmed as redundant:
      it is what stops a click that reached the button after the gate closed from posting.
    */
    expect(pageCode).toContain("const html = canUseRTE ? rteDraft.trim() : '';");
    expect(pageCode).toContain("dialogs.alert = 'Empty message. Please type a message...';");
  });

  it('and refuses on the SERVER emptiness rule, so formatting-only cannot fail silently', () => {
    /*
      `<b></b>` — press Bold, press Send — passes the reference's four-literal-string test, reaches
      the server, and is refused there with a 400 this modal has nowhere to display. Asking the
      question `isEmptyChatHtml` asks means the person is told instead.
    */
    expect(pageCode).toContain('const text = stripHtmlToText(html);');
    expect(pageCode).toContain('if (!text) {');
  });
});

describe('the two entry points', () => {
  it('the composer carries its text in AND is left empty', () => {
    /*
      Both halves of `openRTEModal()`. Without the clear, the same words sit in two composers and
      can be sent twice.
    */
    /*
      ONE call since the two columns moved to `room/chat.svelte.ts`: `take` trims what is typed and
      clears it together. Both halves are still load-bearing and are still asserted — the text comes
      WITH you into the editor, and the composer is left empty so the same words cannot be sent
      twice from two places — but they can no longer be separated by an early return between them.
    */
    expect(pageCode).toContain("rteDraft = textToEditorHtml(chat.take('textAreaTxt'));");
    const chatClass = readFileSync(new URL('./room/chat.svelte.ts', import.meta.url), 'utf8');
    expect(chatClass).toContain('take(composer: ChatComposerId): string {');
    expect(chatClass).toContain('this.clear(composer);');
    expect(pageCode).toContain("openModal('rich-text');");
  });

  it('that text is ESCAPED, because a textarea holds text and not markup', () => {
    // The reference hands its composer value straight to `summernote('code', …)`, which parses it.
    // Somebody who types a less-than must see the character they typed.
    expect(pageCode).toContain('holder.textContent = text;');
    expect(pageCode).toContain('return holder.innerHTML;');
  });

  it('the edit routes on the COLUMN, never on a sniff for markup', () => {
    /*
      Upstream asks `containsHtml(this.msg.txt)` because a message there is one string. This room
      records which kind it is, so the same decision is a column read — the same rule the renderer
      follows in `chat-rich-text-contract.test.ts`.
    */
    expect(pageCode).toContain("if (kind === 'chat' && canUseRTE && item.bodyHtml) {");
    expect(pageCode).not.toContain('containsHtml');
  });

  it('the edit is NARROWED to the full gate, deliberately', () => {
    /*
      Upstream's edit branch omits the presenter term, so a member who owns a rich message gets the
      editor opened, types, presses Save — and `retriveRTEContent()` refuses, because THAT check
      does require presenter. Their edit is lost and they are told the message is empty.

      Reproducing a control that can never complete is not reproducing a feature. This asserts the
      narrowing survives: the edit branch reads `canUseRTE`, the same three terms as everything
      else.
    */
    const from = pageCode.indexOf("if (action === 'edit') {");
    expect(from).toBeGreaterThan(-1);
    const branch = pageCode.slice(from, pageCode.indexOf('bootboxPrompt = {', from));
    expect(branch).toContain('canUseRTE');
  });

  it('and the plain prompt is still there for everything else', () => {
    // The reference's own fallback, and the path every non-rich message keeps taking.
    expect(pageCode).toContain("title: kind === 'chat' ? 'Edit chat message:'");
  });
});

describe('the editor component', () => {
  it('has the five captured controls and no sixth', () => {
    // `toolbar: [['font', ['bold', 'italic', 'underline', 'clear']], ['color', ['forecolor']]]`
    for (const command of ['bold', 'italic', 'underline', 'removeFormat', 'foreColor']) {
      expect(editorCode, command).toContain(`'${command}'`);
    }
    /*
      A sixth would be a capability the captured config does not have. These four are the ones
      summernote offers next and are the likely additions.
    */
    for (const absent of ['insertUnorderedList', 'createLink', 'justifyCenter', 'fontSize']) {
      expect(editorCode, absent).not.toContain(absent);
    }
  });

  it('carries the captured placeholder and minimum height', () => {
    expect(editorCode).toContain('Type your message here...');
    expect(editorCode).toContain('min-height: 200px;');
  });

  it('does not draw its own Close or Send — the modal owns them', () => {
    /*
      `#msgTxtContainer` sits in `modal-body`; the buttons are in `modal-footer`. Drawing them here
      too would put two of each on screen, which is what the first draft did.
    */
    expect(editorCode).not.toContain('oncancel');
    expect(editorCode).not.toContain('onsend');
  });

  it('the modal labels its button Save when editing and Send otherwise', () => {
    // `O(14, o.isEditing ? 14 : 15)` over `<span>Save</span>` and `<span>Send</span>`.
    expect(modalCode).toContain('{#if rteIsEditing}<span>Save</span>{:else}<span>Send</span>{/if}');
  });
});

describe('the server', () => {
  it('sanitises an edit exactly as it sanitises a post', () => {
    expect(serverCode, 'the command must be here for this to guard anything').toContain(
      'export const messageAction = command('
    );
    expect(serverCode).toContain(
      "const sanitizedHtml = submittedHtml ? sanitizeChatHtml(submittedHtml) : '';"
    );
    expect(serverCode).toContain('!isEmptyChatHtml(sanitizedHtml) ? sanitizedHtml : null');
  });

  it('reads the rich field for CHAT only', () => {
    // The alerts table has no such column, and upstream's rich edit branch is chat-only too.
    // The field is on the schema now, so this reads the branch rather than a `FormData` lookup.
    expect(serverCode).toContain("kind === 'chat' ? (args.newBodyHtml ?? '').trim() : ''");
  });

  it('an edit rewrites BOTH columns, so markup cannot outlive the text', () => {
    /*
      The failure this prevents: a rich message edited through the PLAIN prompt — which is what
      happens once the owner turns the editor off — writes a new `body` and leaves the old markup
      in `body_html`. The renderer picks the column, so the message goes on displaying a sentence
      it no longer says.
    */
    /*
      Scoped to the CHAT branch. The first draft asserted `.set({ body: newBody })` appears nowhere
      and went red on the ALERT branch three lines above, which is correct as it stands — alerts
      have no such column. An assertion that fails on working code is a defect in the assertion.
    */
    const edit = serverCode.slice(serverCode.indexOf("if (args.operation === 'edit') {"));
    expect(edit, 'the edit branch must be found').toContain('newBodyHtml');
    /*
      Anchored on the EDIT operation first. Anchoring on the message lookup alone found the DELETE
      operation's copy of it, several hundred lines earlier.

      The lookup is `findMessage()` now — one helper both operations call, where each used to write
      the same room-scoped select out by hand. The old anchor was `const message = db`, which after
      the move matched NOTHING and silently sliced the guard down to the empty string. Both offsets
      are asserted found, so it cannot go vacuous that way again.
    */
    const chatBranchAt = edit.indexOf('const message = findMessage();');
    expect(chatBranchAt, 'the chat edit branch must be found').toBeGreaterThan(-1);
    const chatBranch = edit.slice(chatBranchAt);
    const endsAt = chatBranch.indexOf('return;');
    expect(endsAt, 'the branch must end somewhere').toBeGreaterThan(-1);
    const chatUpdate = chatBranch.slice(0, endsAt);
    expect(chatUpdate).toContain('.set({ body: newBody, bodyHtml: newBodyHtml })');
    expect(chatUpdate).not.toContain('.set({ body: newBody })');
  });
});
