import sanitizeHtml from 'sanitize-html';

/**
 * Chat messages written with the rich text editor, sanitised on the way IN.
 *
 * ## Why this is not `sanitizeNoteHtml`
 *
 * A note is a document: the notes allow-list carries tables, headings, images, iframes, links and
 * six style properties, because somebody is writing a page. A chat message written with this
 * editor is a line of text with **five** controls on it, and the reference's own captured config
 * says so:
 *
 * ```js
 * toolbar: [['font', ['bold', 'italic', 'underline', 'clear']], ['color', ['forecolor']]]
 * ```
 *
 * So the allow-list below is the smallest set that toolbar can produce and nothing else. Reusing
 * the note list would have been one import and would have let a presenter put an `<iframe>` into
 * the chat log of a multi-tenant fintech room — a control surface nobody asked for, reachable by
 * anyone who can open a devtools console and post by hand.
 *
 * **`<font>` is deliberately absent too, and it was in the first draft.** Legacy browsers emit
 * `<font color>` for a forecolor, so allowing it looked like prudence — but `sanitize-html` cannot
 * value-check a plain attribute the way it checks a style, only strip or keep it, so the guard
 * written for it was dead code. More to the point: we are not using summernote. Our own editor
 * emits `<span style="color">`, so allowing `<font>` would permit a tag nothing here produces,
 * which is inventing a capability rather than reproducing one.
 *
 * **`a` and `img` are deliberately absent.** Links and inline images DO appear in chat, and they
 * are produced by the RENDERER from plain text (`CAPTURED_URL` and `IMAGE_EXTENSIONS` in
 * `RoomMessage.svelte`), never by the author. Allowing an author-supplied `<a href>` would let one
 * be pointed somewhere the visible text does not say.
 *
 * ## Fails closed
 *
 * `sanitize-html` drops any tag not named here and any attribute not named for that tag, so a new
 * editor control that emits something unlisted produces plain text rather than markup. That is the
 * right direction to fail: a lost bold is a cosmetic bug, an unfiltered tag is an incident.
 */

/** The captured toolbar produces exactly these. `strong`/`em` because browsers emit both spellings. */
const ALLOWED_CHAT_TAGS = ['b', 'strong', 'i', 'em', 'u', 'span', 'p', 'br'] as const;

/**
 * The same colour pattern the note sanitiser uses — hex or rgb/rgba, nothing else.
 *
 * Deliberately NOT a shared import: `notes.ts` does not export it, and exporting it to save four
 * lines would tie the chat allow-list to a document allow-list that has every reason to keep
 * growing. They agree today because colours are colours, not because they are one rule.
 */
const COLOR_VALUE =
  /^(?:#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))$/i;

export function sanitizeChatHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [...ALLOWED_CHAT_TAGS],
    allowedAttributes: {
      span: ['style'],
      p: ['style']
    },
    allowedStyles: {
      /* Colour only. The toolbar has no background, no size, no family and no alignment, so
         allowing any of them would be inventing a capability the captured config does not have. */
      '*': { color: [COLOR_VALUE] }
    },
    /* No schemes are allowed because no attribute here takes a URL. Stated rather than left to the
       library's defaults, so that adding `a` later is a decision and not an accident. */
    allowedSchemes: [],
    disallowedTagsMode: 'discard'
  }).trim();
}

/**
 * The four strings the reference treats as "nothing typed".
 *
 * `retriveRTEContent()` returns `''` for each of them:
 * `('' === e || '<p><br></p>' === e || '<br>' === e || '<p></p>' === e) && (e = '')`.
 * An editor reports an empty document in more than one way depending on how it got there — cleared
 * with the toolbar, backspaced to nothing, or never touched — and a message made only of those is
 * not a message.
 */
const EMPTY_EDITOR_OUTPUT = new Set(['', '<p><br></p>', '<br>', '<p></p>']);

/**
 * Is this editor content empty? Checked AFTER sanitising, because sanitising is what turns
 * `<script>x</script>` into nothing, and a message whose entire content was disallowed must not
 * post as an empty bubble.
 */
/*
   THE INLINE COPY STAYS SEPARATE, DELIBERATELY — the other half of row AF's own "write it down in
   BOTH places", added 2026-08-28.

   The three steps below are the same three `stripHtmlToText` runs, and the temptation is to call it
   and delete them. They answer DIFFERENT questions, and the difference is why the duplication is
   correct rather than an oversight:

     `stripHtmlToText`  produces the `body` a reader SEES — a value that is stored, searched and
                        rendered as text.
     this function      decides whether a sanitised message is EMPTY — a value nobody ever sees,
                        used once, to refuse a send.

   Merging them would tie a refusal rule to a rendering rule, so a change to how `body` reads for a
   member — decoding one more entity, say — would silently change which messages the room accepts.
   `chat-rich-text-contract.test.ts:123-132` pins both sides so the two cannot drift apart WITHOUT
   anybody noticing, which is the guarantee that makes keeping them separate safe.
*/
export function isEmptyChatHtml(sanitized: string): boolean {
  const trimmed = sanitized.trim();
  if (EMPTY_EDITOR_OUTPUT.has(trimmed)) return true;
  /* Tags stripped, entities left alone: `&nbsp;` is whitespace to a reader but not to `trim()`, and
     a message of nothing but spacing is the same empty message. */
  return (
    trimmed
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim() === ''
  );
}
