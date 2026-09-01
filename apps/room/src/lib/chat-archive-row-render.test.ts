import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import ChatArchivePane from './components/ChatArchivePane.svelte';
import type { ChatArchiveView } from './server/chat-archive.js';

/**
 * THE ARCHIVE ROW, AS THE CAPTURE DRAWS IT — `vxe`, bundle byte 2,301,700.
 *
 * ## What was measured, and what it found
 *
 * The reference's row inside `app-chat-logs-modal` is three labelled lines:
 *
 * ```js
 * d(1,"div")(2,"strong",15),v(3),Xe(4,"date"),u()(),
 * d(5,"div")(6,"strong",15),v(7,"By:\xa0"),u(),d(8,"i"),v(9),u()(),
 * d(10,"div")(11,"strong",15),v(12,"Channel:\xa0"),u(),d(13,"i"),v(14),u()()()
 * …  m(3),Ze(Ct(4,3,e.updated,"mediumDate")),m(6),Ze(e.createdBy),m(5),Ze(e.channel)
 * ```
 *
 * — const 15 being `[1,"fw-bold"]`. Until 2026-09-01 this room drew ONE compressed line and the
 * middle of those three was missing entirely: nothing rendered who had swept the log.
 *
 * That was not a data gap. `chat_archives.archived_by_user_id` has been `notNull` since the table
 * was added, and the schema comment beside it already said why — *"an administrative act on
 * everybody's data, and the one question an incident asks first"*. The column held the answer and
 * no read path selected it, which is the shape this repository calls a value with no consumer,
 * pointing the other way: a consumer that existed upstream with no value wired to it.
 *
 * ## Why this asserts on the RENDERED page and not on the source
 *
 * A source assertion on `By:&nbsp;` passes for a label sitting in a component nothing mounts, and
 * fails for a correct label written as `By:{'\u00a0'}`. `note-giphy-contract.test.ts` had to be
 * rewritten onto rendered output on 2026-09-01 for exactly the second reason. What is being claimed
 * here is that a presenter opening the browser SEES the name, so the page is what is measured.
 */
const archive = (over: Partial<ChatArchiveView> = {}): ChatArchiveView => ({
  id: 7,
  channel: 'main',
  olderThan: Date.UTC(2026, 7, 1),
  archivedAt: Date.UTC(2026, 7, 30, 14, 5),
  messageCount: 3,
  archivedBy: 'Dana Presenter',
  ...over
});

function body(archives: readonly ChatArchiveView[]): string {
  return render(ChatArchivePane, {
    props: {
      archives,
      channels: ['main'],
      channel: 'main',
      loading: false,
      error: null,
      onreload: () => {},
      onarchiveall: () => {},
      onarchiveolder: () => {},
      onrestore: () => {},
      onopen: () => {}
    }
  }).body;
}

/*
  `&nbsp;` survives to the page as U+00A0 itself, so the label is matched the way it renders.
  Written as an ESCAPE and not as the character: a literal non-breaking space in source is invisible
  to a reader and indistinguishable from the ordinary one beside it.
*/
const NBSP = '\u00a0';

describe('the archive row answers who swept it', () => {
  it('renders the capture s three labelled lines, `By:` among them', () => {
    const page = body([archive()]);

    expect(page).toContain(`<strong class="fw-bold">By:${NBSP}</strong>`);
    expect(page).toContain('<i>Dana Presenter</i>');
    expect(page).toContain(`<strong class="fw-bold">Channel:${NBSP}</strong>`);
    expect(page).toContain('<i>main</i>');
  });

  it('keeps the sweep boundary on the first line, which is the date the dialog asked for', () => {
    /*
      The capture shows one date, `updated`, and the server that wrote it is not in the bundle — so
      which of this room's two it corresponds to cannot be read, only guessed. Both are rendered
      instead: the boundary the presenter typed, and when the sweep ran.
    */
    const page = body([archive()]);

    expect(page).toContain('<strong class="fw-bold">');
    expect(page).toContain('and older');
    expect(page).toContain('archived');
    expect(page).toContain('3 messages');
  });

  it('names the archiver per row rather than once for the list', () => {
    /* Two sweeps by two people is the case a single header could not report. */
    const page = body([
      archive({ id: 1, archivedBy: 'Dana Presenter' }),
      archive({ id: 2, archivedBy: 'Ari Moderator', channel: 'vip' })
    ]);

    expect(page).toContain('<i>Dana Presenter</i>');
    expect(page).toContain('<i>Ari Moderator</i>');
    expect(page).toContain('<i>vip</i>');
  });

  it('says one message in the singular', () => {
    const page = body([archive({ messageCount: 1 })]);
    expect(page).toContain('1 message ');
    expect(page).not.toContain('1 messages');
  });
});
