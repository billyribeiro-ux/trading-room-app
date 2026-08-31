import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { codeOf } from './source-comments';

/**
 * `RPL-01` … `RPL-03` — `app-reply-modal`, decoded 2026-08-31, three defects on one surface.
 *
 * They are the SAME three `QAM-05` and `QAM-06` were, one modal over, and they were found the same
 * way: by decoding the reference component rather than by a row asking for it. That is worth saying,
 * because the Q&A pair was fixed on 2026-08-31 and nothing looked at its neighbour.
 *
 * ```js
 * // const 13 — the textarea, and it declares TWO bindings
 * ["name","txt-area","id","textAreaReplyTxt","rows","1","spellcheck","true",
 *  "placeholder","Type your message here..",1,"txt-area","form-control","border-0",3,"keyup","paste"]
 *
 * // const 21 — the image span, and it declares a click
 * [1,"textAreaBtns",3,"click"]
 *
 * function $xe(t,n){ … d(0,"span",21), x("click",function(){ … g().imgUpload() }), T(1,"i",22) … }
 *                                                                          // byte 2,318,013
 * O(19, o.canPostImages ? 19 : -1)                                          // the gate
 * (this.isPresenter || sessData.userUploads) && (this.canPostImages = !0)   // byte 2,319,080
 * ```
 *
 * ## Its destination is neither neighbour's, and that is the part worth getting right
 *
 * `doImggurUpload` here (byte **2,322,349**):
 *
 * ```js
 * s.imggurUploadTxt += … F;                                    // the link FIRST
 * o || ( i && (s.imggurUploadTxt += " " + i,
 *              go("#textAreaReplyTxt").val("")),               // the box clears only WITH a message
 *        s.appService.sendChatReply(s.msg.c, s.imggurUploadTxt, s.msg.txt, s.msg.n, s.msg._id, null),
 *        s.imggurUploadTxt = "",
 *        go("#replyModal").modal("hide") )
 * ```
 *
 * A public reply against ONE message, then the modal hides. `QAM-05`'s prescribed fix — "the same
 * path both chat composers already use" — would have posted it to chat, and the register records why
 * that was wrong there. The same trap is one component away here.
 */

const BUNDLE = readFileSync('docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', 'utf8');
/*
  `app-reply-modal` left `ModalHost.svelte` for its own component on 2026-08-31, when these three
  fixes put that file over its ceiling and `source-size-contract` refused the raise. The assertions
  follow the code: what is read is the component, and the HOST is read only to prove it is still
  rendered — a component nothing mounts is a component whose contract proves nothing.
*/
const MODAL = readFileSync('src/lib/components/ReplyModal.svelte', 'utf8');
const HOST = readFileSync('src/lib/components/ModalHost.svelte', 'utf8');
const OVERLAYS = readFileSync('src/lib/components/RoomOverlays.svelte', 'utf8');
const ACTIONS = readFileSync('src/lib/room/message-actions.svelte.ts', 'utf8');

describe('the reference, read at verified boundaries', () => {
  it('is the bundle this register is written against', () => {
    expect(BUNDLE.length).toBe(2_891_205);
  });

  it('declares `paste` on the textarea and `click` on the image span', () => {
    const at = BUNDLE.indexOf('selectors:[["app-reply-modal"]]');
    expect(at, 'app-reply-modal moved').toBeGreaterThan(-1);
    const consts = BUNDLE.slice(at, at + 2_400);
    expect(consts).toContain('"id","textAreaReplyTxt"');
    expect(consts).toContain('1,"txt-area","form-control","border-0",3,"keyup","paste"');
    expect(consts).toContain('[1,"textAreaBtns",3,"click"]');
    /* And the template binds both, rather than declaring them and leaving them unused. */
    expect(consts).toContain('("paste",function(a){return D(s),E(o.onImagePaste(a))})');
    expect(consts).toContain('O(19,o.canPostImages?19:-1)');
  });

  it('wires the span to imgUpload, and gates it on a permission not a role', () => {
    expect(BUNDLE.slice(2_318_013, 2_318_120)).toContain('E(g().imgUpload())');
    /*
      `isPresenter || sessData.userUploads` — a room with member uploads on offers this to MEMBERS.
      Gating on `isPresenter` alone is narrower than the reference and is the mistake `QAM-05`
      recorded making here's twin.
    */
    expect(BUNDLE.slice(2_319_080, 2_319_200)).toContain(
      'resenter||this.appService.globals.sessData.userUploads)&&(this.canPostImages=!0)'
    );
  });

  it('and sends a REPLY, not a chat message and not a question', () => {
    expect(BUNDLE.slice(2_322_349, 2_323_300)).toContain(
      's.appService.sendChatReply(s.msg.c,s.imggurUploadTxt,s.msg.txt,s.msg.n,s.msg._id,null)'
    );
    expect(BUNDLE.slice(2_322_349, 2_323_300)).toContain('go("#replyModal").modal("hide")');
    /* The message goes AFTER the link, and the box clears only when one travelled. */
    expect(BUNDLE.slice(2_322_349, 2_323_300)).toContain(
      'i&&(s.imggurUploadTxt+=" "+i,go("#textAreaReplyTxt").val(""))'
    );
  });
});

describe('RPL-01 — the image button is gated on the permission', () => {
  it('renders NOTHING for a viewer who may not post images', () => {
    /*
      `{#if}` and not `hidden`: `-1` is instantiate-nothing, and an upload control that ships hidden
      has already told a member the room has uploads. Anchored on locals, because a slice from a
      `-1` proves nothing.
    */
    const code = codeOf('src/lib/components/ReplyModal.svelte', MODAL);
    const modal = code.indexOf('<app-reply-modal>');
    /*
      The closing anchor drops the `>`: prettier wraps a long closing tag as `</app-reply-modal\n>`,
      so matching the full tag failed on formatted output while passing on unformatted. Measured
      here, on the first run after the extraction.
    */
    const end = code.indexOf('</app-reply-modal', modal);
    expect(modal, 'the reply modal is gone').toBeGreaterThan(-1);
    expect(end, 'the reply modal is never closed').toBeGreaterThan(modal);
    const region = code.slice(modal, end);
    expect(region).toContain('{#if canPostImages}');
    expect(region).toContain('class="fas fa-image"');
    /*
      And the host still MOUNTS it. The `app-reply-modal` wrapper is also what 30 of the generated
      stylesheet's rules select on — see `captured-css-ancestor-contract.test.ts`, which guards that
      mechanism across every host rather than only this one.
    */
    expect(codeOf('src/lib/components/ModalHost.svelte', HOST)).toContain('<ReplyModal');
  });
});

describe('RPL-02 — and it acts', () => {
  it('the span carries the click, inside the gate', () => {
    const code = codeOf('src/lib/components/ReplyModal.svelte', MODAL);
    const modal = code.indexOf('<app-reply-modal>');
    /*
      The closing anchor drops the `>`: prettier wraps a long closing tag as `</app-reply-modal\n>`,
      so matching the full tag failed on formatted output while passing on unformatted. Measured
      here, on the first run after the extraction.
    */
    const end = code.indexOf('</app-reply-modal', modal);
    expect(modal, 'the reply modal is gone').toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(modal);
    expect(code.slice(modal, end)).toContain(
      '<span class="textAreaBtns" onclick={onReplyImageUpload}>'
    );
  });

  it('and it reaches the REPLY sender, never the chat or question one', () => {
    /*
      The assertion that would have caught `QAM-05`'s prescribed fix, and it moved with the code.

      The two image paths were one lifecycle written twice until the ratchet refused the second copy;
      they are `PendingImagePost` instances now, and the DESTINATION is the injected `post`. So what
      is asserted is that the reply instance posts through `sendReplyMessage` — the shared class can
      no longer send anywhere on its own, which is the point of injecting it.

      Bound and asserted rather than inlined: `slice-anchor-contract` refuses the other form, and a
      `-1` would slice a tail of the file containing every sender in the class.
    */
    const at = ACTIONS.indexOf('readonly replyImage = new PendingImagePost({');
    expect(at, 'the reply image path is missing').toBeGreaterThan(-1);
    const to = ACTIONS.indexOf('\n  });', at);
    expect(to, 'the reply image path is never closed').toBeGreaterThan(at);
    const body = ACTIONS.slice(at, to);
    expect(body).toContain('post: (body) => this.sendReplyMessage(body)');
    expect(body, 'a reply must not go out as a question').not.toContain('sendAlertQuestion');
    expect(body, 'a reply must not go out through the chat composer').not.toContain('#chat');
    /* `go("#replyModal").modal("hide")` — the image path only. */
    expect(body).toContain('afterSend: () => this.#closeModal()');

    /*
      And its NEIGHBOUR, in the same case, because the whole risk of a shared lifecycle is the two
      instances being handed the same destination. One assertion on one of them cannot see that.
    */
    const qa = ACTIONS.indexOf('readonly qaImage = new PendingImagePost({');
    expect(qa, 'the Q&A image path is missing').toBeGreaterThan(-1);
    const qaTo = ACTIONS.indexOf('\n  });', qa);
    expect(qaTo).toBeGreaterThan(qa);
    expect(ACTIONS.slice(qa, qaTo)).toContain('post: (body) => this.sendAlertQuestion(body)');
  });
});

describe('RPL-03 — a pasted screenshot', () => {
  it('the textarea binds paste, and the handler hands the draft over with the file', () => {
    const code = codeOf('src/lib/components/ReplyModal.svelte', MODAL);
    expect(code).toContain('onpaste={handleReplyPaste}');
    expect(code).toContain('onReplyImagePaste(image, replyComposer)');
    /* The shared loop, not a fifth copy of it. */
    expect(code).toContain('pastedImageFrom(event.clipboardData?.items)');
  });

  it('and the confirmation carries the reference s own textarea id', () => {
    /*
      `msg-text-reply`, byte 2,323,720 — one word from `msg-text`, `msg-text-pc` and `msg-text-qa`.
      The four ids are what keeps the four confirmations from being one shared dialog whose message
      could reach the wrong conversation; `trade-alert-pane-contract.test.ts` counts them.
    */
    expect(BUNDLE.slice(2_323_720, 2_323_900)).toContain('id="msg-text-reply"');
    expect(OVERLAYS).toContain('id="msg-text-reply"');
    expect(OVERLAYS).toContain('onconfirm={() => void messageActions.replyImage.confirm()}');
  });
});

describe('the draft does not survive the modal closing, by any route', () => {
  it('every exit goes through one function that clears it', () => {
    /*
      Upstream clears the box inside the send and then destroys the component, so no route leaves a
      draft behind. Here the modal stays mounted, so the clear is on the boundary: `closeReply`.

      Asserted as "the sender does NOT clear" as well as "close does", because two places clearing
      one field is the second answer this arrangement exists to avoid — and it is the state the code
      was in before `RPL-03`, when `sendReply` cleared and closing did not.
    */
    const code = codeOf('src/lib/components/ReplyModal.svelte', MODAL);
    expect(code).toContain('function closeReply() {');
    const at = code.indexOf('function closeReply() {');
    const to = code.indexOf('\n  }', at);
    expect(to).toBeGreaterThan(at);
    expect(code.slice(at, to)).toContain("replyComposer = '';");
    expect(code).toContain('if (await onReplySend(body)) closeReply();');
    expect(code).toContain('onclose={closeReply}');
  });
});
