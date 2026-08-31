import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pastedImageFrom } from './pasted-image.js';
import { RoomChat } from './room/chat.svelte';
import { RoomComposer } from './room/composer.svelte';
import { RoomDialogs } from './room/dialogs.svelte';

/**
 * Pasting a screenshot into the CHAT composer — `acA-02`, and the surface a member actually uses.
 *
 * ## What was missing
 *
 * The chat textarea bound `focus`, `input`, `blur` and `keydown` and **no `paste`**. The three
 * ALERT composers — the post-alert modal, the swing form and the day-trade form — have each had a
 * paste handler since they were built, so the room could take a pasted screenshot everywhere except
 * the box most people type in. A pasted image simply did nothing.
 *
 * ## The reference's handler, byte 1,445,719, and the three things in it that are load-bearing
 *
 * ```js
 * onImagePaste(e) {
 *   const o = (e.clipboardData || e.originalEvent.clipboardData).items;
 *   let s = null;
 *   for (const r of o) 0 === r.type.indexOf("image") && (s = r.getAsFile());
 *   if (s) {
 *     if (!this.canPostImages) return !1;
 *     const r = URL.createObjectURL(s), a = li("#textAreaTxt").val().trim();
 *     bootbox.confirm({ … <img src="' + r + '" /> … <textarea id="msg-text">' + a + '</textarea> …,
 *       callback: l => { if (l) { const c = li("#msg-text").val().trim(); i.doImggurUpload(s, c) } } })
 *   }
 * }
 * ```
 *
 * 1. **The LAST image item wins**, because the loop keeps assigning. A paste carrying a screenshot
 *    AND its text URL therefore resolves to the image.
 * 2. **The composer's text is carried into the dialog** and posted with the image.
 * 3. **The composer is cleared only when a message actually travels** — `i && (…, val(""))` at byte
 *    1,443,041. Clearing unconditionally eats a draft that was never sent; not clearing leaves the
 *    viewer a second copy to send again.
 *
 * ## Scope: the MAIN composer only, and that is the reference's own boundary
 *
 * The `paste` binding is on textarea const 64 inside `d0e` (byte 1,427,208) — the main composer —
 * and the handler reads `#textAreaTxt` by id. The extra chat column's textarea is
 * `textAreaTxtExtra` and has no paste binding upstream; giving it one here would seed the dialog
 * from the OTHER column's box, because the handler is written around a single id.
 */

const MAIN = readFileSync(new URL('./components/AlertChatArea.svelte', import.meta.url), 'utf8');
const EXTRA = readFileSync(new URL('./components/ExtraChatPane.svelte', import.meta.url), 'utf8');
const OVERLAYS = readFileSync(new URL('./components/RoomOverlays.svelte', import.meta.url), 'utf8');
/*
  The dialog BODY moved to `ImagePasteConfirm.svelte` on 2026-08-31, and the reason is this room's
  own `dta-04`: `RoomOverlays` held THREE transcriptions of one `bootbox.confirm` — chat, swing,
  day-trade — and two of them had shipped without `<h4>Upload this image?</h4>`, leaving an
  unlabelled OK button over a picture. Three copies is three places for the question to go missing.

  So the heading is asserted where it now lives and the WIRING is still asserted at the call site,
  which keeps the two halves of this row separable: the shared dialog can be checked once, and
  chat's own textarea — the only thing that differs between the three (byte 1,445,719) — is checked
  in `RoomOverlays` where chat passes it.
*/
const PASTE_CONFIRM = readFileSync(
  new URL('./components/ImagePasteConfirm.svelte', import.meta.url),
  'utf8'
);
/*
  Read at MODULE scope, with the other three, and that is not stylistic. `beforeEach` below replaces
  the global `URL` with an object carrying stubbed `createObjectURL` / `revokeObjectURL` — so inside
  a test `new URL(...)` is no longer a constructor. Anything reading a file has to do it up here.
*/
const PAGE = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');
/** `ACA-05` reads the extra column's own `doImggurUpload` tail rather than quoting it. */
const BUNDLE = readFileSync(
  new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url),
  'utf8'
);
const POST_ALERT = readFileSync(
  new URL('./components/PostAlertModal.svelte', import.meta.url),
  'utf8'
);
const SWING = readFileSync(
  new URL('./components/swing-alerts/SwingAlertForm.svelte', import.meta.url),
  'utf8'
);
const DAY_TRADE = readFileSync(
  new URL('./components/day-trade-alerts/DayTradeAlertForm.svelte', import.meta.url),
  'utf8'
);
/*
  Comments stripped before every source assertion. The docblocks below quote the very handler they
  describe, so a raw-text `toContain` would pass on prose — the trap this repository has now met
  four times, most recently in `dead-export-contract.test.ts`.
*/
const strip = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
const mainCode = strip(MAIN);
const extraCode = strip(EXTRA);
const overlaysCode = strip(OVERLAYS);

/** A clipboard item, as `DataTransferItem` presents one. */
const item = (type: string, file: File | null) =>
  ({ type, getAsFile: () => file }) as unknown as DataTransferItem;

const png = (name: string) => new File(['x'], name, { type: 'image/png' });

const make = () => {
  const dialogs = new RoomDialogs();
  const chat = new RoomChat({ extraColumnEnabled: () => true });
  const sent: unknown[] = [];
  const uploaded: unknown[] = [];

  const composer = new RoomComposer({
    dialogs,
    chat,
    commands: {
      send: (payload) => (sent.push(payload), Promise.resolve(null)),
      uploadImage: (payload) => (uploaded.push(payload), Promise.resolve('https://cdn.test/u.png')),
      postAlert: () => Promise.resolve(null)
    },
    session: () => ({ sessData: {}, sessionHandle: 'room-1' }),
    prefs: { enableRTE: true },
    isPresenter: () => true,
    openModal: () => {},
    closeModal: () => {},
    closeMenu: () => {},
    editMessage: () => Promise.resolve(true),
    onSent: () => Promise.resolve(),
    uploadServer: '',
    uploadKey: ''
  });

  return { composer, chat, dialogs, sent, uploaded };
};

/**
 * `URL.createObjectURL` / `revokeObjectURL`, recorded.
 *
 * jsdom implements neither. Stubbing them is not just to stop a throw — the LEAK is one of the
 * things under test: a preview URL that is never revoked pins the pasted image's bytes for the life
 * of the tab, and a second paste while the first dialog is open used to be exactly how that happens.
 */
let created: string[] = [];
let revoked: string[] = [];

beforeEach(() => {
  created = [];
  revoked = [];
  let next = 0;
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: (_file: unknown) => {
      const url = `blob:paste-${(next += 1)}`;
      created.push(url);
      return url;
    },
    revokeObjectURL: (url: string) => revoked.push(url)
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('the pending paste', () => {
  it('holds the file and a preview, and seeds its message from the composer', () => {
    const { composer, chat } = make();
    chat.composer = '  look at this  ';
    const file = png('shot.png');

    composer.beginImagePaste(file);

    expect(composer.pastedImage?.file).toBe(file);
    expect(composer.pastedImage?.previewUrl).toBe(created[0]);
    // Trimmed, as `li("#textAreaTxt").val().trim()` is.
    expect(composer.pastedImageMessage).toBe('look at this');
  });

  it('does not touch the composer until the upload is confirmed', () => {
    const { composer, chat } = make();
    chat.composer = 'still mine';
    composer.beginImagePaste(png('shot.png'));
    expect(chat.composer).toBe('still mine');
  });

  it('releases the preview when the viewer cancels', () => {
    const { composer } = make();
    composer.beginImagePaste(png('shot.png'));
    composer.cancelImagePaste();

    expect(composer.pastedImage).toBeNull();
    expect(composer.pastedImageMessage).toBe('');
    expect(revoked).toEqual([created[0]]);
  });

  it('a SECOND paste replaces the first and releases its preview', () => {
    /*
      Without this the discarded paste's bytes stay pinned for the life of the tab, and a viewer
      correcting a mis-paste is the ordinary way to produce one.
    */
    const { composer } = make();
    composer.beginImagePaste(png('first.png'));
    const second = png('second.png');
    composer.beginImagePaste(second);

    expect(composer.pastedImage?.file).toBe(second);
    expect(revoked).toEqual([created[0]]);
  });

  it('cancelling when nothing is pending is not an error', () => {
    const { composer } = make();
    expect(() => composer.cancelImagePaste()).not.toThrow();
    expect(revoked).toEqual([]);
  });
});

describe('confirming it', () => {
  it('uploads the file and posts the link with the message', async () => {
    const { composer, chat, sent, uploaded } = make();
    chat.composer = 'look at this';
    composer.beginImagePaste(png('shot.png'));

    await composer.confirmImagePaste();

    expect(uploaded).toEqual([{ file: expect.any(File), originalName: 'shot.png' }]);
    expect(sent).toEqual([
      expect.objectContaining({ body: 'https://cdn.test/u.png look at this' })
    ]);
  });

  it('ACA-05 — an EXTRA-column paste seeds from its own box and posts to its own tab', async () => {
    /*
      The row this closes, executed rather than read off source. Both halves matter and both were
      wrong in the register's prescription:

        - the SEED is `#textAreaTxtExtra`, not `#textAreaTxt` (byte 2,392,023);
        - the DESTINATION is `sendGrpChat(s.channel, …)` — THIS column's tab — not the main one
          (byte 2,389,468).

      The main composer's draft is deliberately set to a DIFFERENT string, so a handler that seeded
      from the wrong box would post the wrong text rather than merely the right text by luck.
    */
    const { composer, chat, sent } = make();
    chat.composer = 'main column draft';
    chat.extraComposer = 'extra column draft';
    chat.extraTab = 'off-topic';

    composer.beginImagePaste(png('shot.png'), 'extra');
    expect(composer.pastedImageMessage, 'seeded from the EXTRA box').toBe('extra column draft');

    await composer.confirmImagePaste();

    /* `room` is what the send payload calls the channel — `sendBody`'s third argument. */
    expect(sent).toEqual([
      expect.objectContaining({
        body: 'https://cdn.test/u.png extra column draft',
        room: 'off-topic'
      })
    ]);
    /* The extra box is cleared because a message travelled; the main one is untouched. */
    expect(chat.extraComposer).toBe('');
    expect(chat.composer).toBe('main column draft');
  });

  it('ACA-05 — and a CHAT paste still lands on `main`, unchanged by the extraction', async () => {
    /*
      The half that proves the refactor is behaviour-preserving rather than merely compiling.

      `uploadImages` grew a channel argument so the extra column could name its tab; the chat path
      passes `undefined` and `sendBody` applies its OWN default, which the payload shows as `main`.
      Passing `undefined` rather than the literal `'main'` is deliberate — a second spelling of the
      default here would be a second thing to keep in step with `sendBody` — and this assertion is
      what catches it if that default ever moves.
    */
    const { composer, chat, sent } = make();
    chat.composer = 'main column draft';
    composer.beginImagePaste(png('shot.png'));
    await composer.confirmImagePaste();

    expect(sent).toHaveLength(1);
    expect((sent[0] as { room?: unknown }).room).toBe('main');
  });

  it('CLEARS the composer, because the text it held has now been posted', async () => {
    const { composer, chat } = make();
    chat.composer = 'look at this';
    composer.beginImagePaste(png('shot.png'));
    await composer.confirmImagePaste();
    expect(chat.composer).toBe('');
  });

  it('leaves an EMPTY composer alone, and posts the link by itself', async () => {
    /*
      `i && (…, li("#textAreaTxt").val(""))` — the reference clears only when a message travels. The
      distinction is invisible with a non-empty draft, which is why it has its own case.
    */
    const { composer, chat, sent } = make();
    chat.composer = '';
    composer.beginImagePaste(png('shot.png'));
    await composer.confirmImagePaste();

    expect(chat.composer).toBe('');
    expect(sent).toEqual([expect.objectContaining({ body: 'https://cdn.test/u.png' })]);
  });

  it('does not eat a draft the viewer typed WHILE the upload was in flight', async () => {
    /*
      The clear happens before the await, so a viewer who starts a new message during a slow upload
      keeps it. Written as its own case because "clear the composer" and "clear whatever is in the
      composer when the network answers" look identical until the network is slow.
    */
    const { composer, chat } = make();
    chat.composer = 'the pasted caption';
    composer.beginImagePaste(png('shot.png'));
    const inFlight = composer.confirmImagePaste();
    chat.composer = 'something new';
    await inFlight;

    expect(chat.composer).toBe('something new');
  });

  it('releases the preview, and confirming twice does nothing the second time', async () => {
    const { composer, chat, sent } = make();
    chat.composer = 'caption';
    composer.beginImagePaste(png('shot.png'));
    await composer.confirmImagePaste();
    await composer.confirmImagePaste();

    expect(revoked).toEqual([created[0]]);
    expect(sent).toHaveLength(1);
  });

  it('carries the message the DIALOG was left holding, not the one the composer had', async () => {
    // The textarea is `bind:value`d to `pastedImageMessage`; editing it must be what travels.
    const { composer, chat, sent } = make();
    chat.composer = 'first thought';
    composer.beginImagePaste(png('shot.png'));
    composer.pastedImageMessage = 'second thought';
    await composer.confirmImagePaste();

    expect(sent).toEqual([
      expect.objectContaining({ body: 'https://cdn.test/u.png second thought' })
    ]);
  });
});

describe('which image a paste carries', () => {
  /*
    EXECUTED, and it is one function for all four surfaces now. Three of them had their own copy of
    this loop and one had drifted — `PostAlertModal` returned on the FIRST image where the reference
    keeps assigning and takes the LAST, and abandoned the whole paste on one item `getAsFile()`
    could not materialise. `#lib/pasted-image.ts` carries the transcription and the story.
  */
  it('takes the LAST image, which is the reference s loop and not the first match', () => {
    const second = png('second.png');
    expect(
      pastedImageFrom([
        item('image/png', png('first.png')),
        item('text/plain', null),
        item('image/webp', second)
      ] as unknown as DataTransferItemList)
    ).toBe(second);
  });

  it('SKIPS an item it cannot materialise rather than abandoning the paste', () => {
    const real = png('real.png');
    expect(
      pastedImageFrom([
        item('image/tiff', null),
        item('image/png', real)
      ] as unknown as DataTransferItemList)
    ).toBe(real);
  });

  it('admits every image subtype, because the reference tests the prefix', () => {
    const webp = png('shot.webp');
    expect(pastedImageFrom([item('image/webp', webp)] as unknown as DataTransferItemList)).toBe(
      webp
    );
  });

  it('answers null for a paste with no image, and for no clipboard at all', () => {
    expect(
      pastedImageFrom([
        item('text/plain', null),
        item('text/html', null)
      ] as unknown as DataTransferItemList)
    ).toBeNull();
    expect(pastedImageFrom(undefined)).toBeNull();
    expect(pastedImageFrom(null)).toBeNull();
  });

  it('is the ONE implementation — no surface keeps its own copy', () => {
    for (const [name, code] of [
      ['AlertChatArea', mainCode],
      ['PostAlertModal', strip(POST_ALERT)],
      ['SwingAlertForm', strip(SWING)],
      ['DayTradeAlertForm', strip(DAY_TRADE)]
    ] as const) {
      expect(code, `${name} must call the shared rule`).toContain('pastedImageFrom(');
      expect(code, `${name} still has its own loop`).not.toContain('.getAsFile()');
    }
  });
});

describe('the clipboard filter, in the component', () => {
  /*
    The handler lives in `AlertChatArea` because it needs `canPostImages`, which is a page gate the
    composer class is not given. Its three rules are asserted from source; what they FEED is executed
    above, which is the split this repository uses wherever a rule and its consequence are in
    different layers.
  */
  it('is bound on the main composer, and only there', () => {
    expect(mainCode).toContain('onpaste={handleComposerPaste}');
    expect(mainCode).toContain('id="textAreaTxt"');
    /*
      `ACA-05` — INVERTED 2026-08-31, and the comment that stood here is why the row existed.

      It read: *"The extra column deliberately has none — the reference binds paste on textarea
      const 64 (the main composer) and its handler reads `#textAreaTxt` by id, so a second column
      pasting through it would seed from the first column's box."* **Both halves are false of
      `app-extra-chat`.** Its composer const 61 carries `paste` in its binding section, `cMe` at byte
      2,373,521 binds it, and that component's OWN `onImagePaste` at byte 2,392,023 reads
      `ui("#textAreaTxtExtra")`. Each column reads its own box; there was never a shared one.

      That is the failure mode this repository's preface names in the other direction — a claim
      framed as a fact about "the reference" that was read off ONE of two compiled copies. The
      assertion made the mistake permanent by pinning it.
    */
    expect(extraCode).toContain('onpaste={handleComposerPaste}');
    expect(extraCode).toContain('id="textAreaTxtExtra"');
  });

  it('ACA-05 — and the extra column posts to ITS OWN channel, which is a third destination', () => {
    /*
      THE ROW'S PRESCRIBED FIX WOULD HAVE POSTED INTO THE WRONG COLUMN.

      It said to feed the handler from `+page.svelte` *"beside the main column's
      `onpasteimage={(file) => composer.beginImagePaste(file)}`"* — which defaults to `'chat'`, and
      the chat branch posts with no channel argument, i.e. the MAIN tab. `app-extra-chat`'s own
      `doImggurUpload` at byte 2,389,468 ends in `sendGrpChat(s.channel, …)` against THIS column's
      tab. A screenshot pasted into the second column would have appeared in the first.

      Read off the bundle rather than quoted, so a different capture turns this red.
    */
    const tail =
      'o||(i&&(s.imggurUploadTxt+=" "+i,ui("#textAreaTxtExtra").val("")),s.appService.sendGrpChat(s.channel,s.imggurUploadTxt),s.imggurUploadTxt="")';
    expect(BUNDLE).toContain(tail);

    /* And ours names the third target at the call site rather than defaulting to the first. */
    expect(PAGE).toContain("onpasteimage={(file) => composer.beginImagePaste(file, 'extra')}");
    /* The two columns' call sites are DIFFERENT, which is the whole point of this row. */
    expect(PAGE).toContain('onpasteimage={(file) => composer.beginImagePaste(file)}');
  });

  it('refuses when the room does not let this viewer post images', () => {
    /*
      Source-level, and only this one line is: `canPostImages` is a page gate the composer class is
      not given, so the check has nowhere else to live. It is not the authority either way —
      `composer-image.remote.ts` re-checks on the server.
    */
    const at = mainCode.indexOf('function handleComposerPaste');
    expect(at, 'the handler must exist for this to test anything').toBeGreaterThan(-1);
    /*
      BOTH bounds are locals and both are asserted. An inlined `indexOf` as the end bound is what
      `slice-anchor-contract.test.ts` counts and refuses to grow: when the marker moves it returns
      -1, `slice(at, -1)` silently yields almost the whole file, and the assertions below pass over
      the wrong text.
    */
    const closes = mainCode.indexOf('\n  }', at);
    expect(closes, 'the handler must be closed for the slice to bound anything').toBeGreaterThan(
      at
    );
    const body = mainCode.slice(at, closes);
    expect(body).toContain('if (!canPostImages) return;');
    /* And the default is never prevented: a text paste must still land in the box. */
    expect(body).not.toContain('preventDefault');
  });

  it('reaches the composer through the page rather than uploading in place', () => {
    expect(mainCode).toContain('onpasteimage(image)');
    expect(PAGE).toContain('onpasteimage={(file) => composer.beginImagePaste(file)}');
  });

  it('draws the reference s confirmation, preview and seeded textarea included', () => {
    expect(overlaysCode).toContain('{#if composer.pastedImage}');
    expect(overlaysCode).toContain('onconfirm={() => void composer.confirmImagePaste()}');
    expect(overlaysCode).toContain('onclose={() => composer.cancelImagePaste()}');
    expect(overlaysCode).toContain('bind:value={composer.pastedImageMessage}');
    expect(PASTE_CONFIRM).toContain('<h4>Upload this image?</h4>');
    expect(overlaysCode).toContain('id="msg-text"');
  });
});
