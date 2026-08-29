import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * THE PER-MEMBER ADMIN NOTES LIST — the tab whose gate worked and opened onto nothing.
 *
 * ## How the gap was found, which is the only reason it was found at all
 *
 * Not by reading the capture looking for missing features. By ARITHMETIC.
 * `orphan-style-contract.test.ts` measures every class `app.css` styles that nothing wears, and
 * `smallAvatarImg` had a rule and no wearer. Following that class into the bundle found `fTe` @
 * 2,064,959 — the avatar on a row of THIS list — and then found that this room rendered the notes
 * tab's password prompt with **no `{:else}` at all**.
 *
 * The password half had been repaired earlier the same day: `admin-notes-password` used to alert
 * `Wrong password!` whatever was typed, and the comparison is now made on the controller. So the
 * gate was correct, and a presenter who cleared it got an empty panel. **A working gate in front of
 * nothing is invisible to every other check here** — it type-checks, it lints, `svelte-check` is
 * silent, and the control does not lie: it opens exactly what it says it opens.
 *
 * ## The capture, transcribed
 *
 * The switch is `O(104, e.allowToManageNotes ? 105 : 104)` — 104 is `pTe`, the prompt; 105 is `mTe`,
 * the list. `mTe` @ 2,065,140 is a `col` scrolling at `max-height:300px`, an `@for` over
 * `user.notes`, an `<hr>`, and an " Add Note " button. `fTe` is one row:
 *
 * ```
 * <img class="smallAvatarImg" [src]="e.pic || gravatar(e.emailHash, s=80)" [alt]="user.nick">
 * " [" (e.date | date:'short') "] " e.name ": " e.note " "
 * <button (click)="deleteNode(note, $index)"><i class="fas fa-minus-circle"></i></button>
 * ```
 *
 * And the two commands, @ 2,079,597:
 *
 * ```js
 * addNote()        { bootbox.prompt("Enter your note below", note => …addUserNote {user, note}) }
 * deleteNode(e, i) { bootbox.confirm("Are you sure you want to delete this note by "+e.name+" ?",
 *                                     ok => …delUserNote {user, noteIDX: i}) }
 * ```
 *
 * ## What this file guards, and why each of the four matters
 *
 * 1. **The `{:else}` exists.** The whole defect was its absence, and an absence is what no other
 *    gate can see.
 * 2. **The server never reads the client's `canManage`.** The room's flag decides what to DRAW; the
 *    server's `sessions.notes_access_at` decides what may be WRITTEN. If those ever become one
 *    value, the value is the client's, and that is the 2026-08-07 escalation.
 * 3. **Deletion is by id.** Upstream sends an ordinal into a list that may already have shifted.
 * 4. **The credential never crosses.** `needPasswordForUserNotes` is one of the seven.
 */
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const read = (file: string) => readFileSync(`${ROOT}${file}`, 'utf8');

const PANE = read('lib/components/UserNotesPane.svelte');
const REMOTE = read('../src/routes/user-notes.remote.ts');
const SERVER = read('lib/server/user-notes.ts');
const HOLDER = read('lib/room/user-notes.svelte.ts');
const SCHEMA = read('lib/server/db/schema.ts');
const MODAL = read('lib/components/ModalHost.svelte');

/**
 * Source with its comments removed, for the assertions that measure an ABSENCE.
 *
 * Every file here quotes the capture at length, and the capture contains the very strings some of
 * these assertions refuse — `noteIDX` is in three docblocks. A `not.toContain` against raw source
 * would fail on the note explaining why the thing is not done, which is the inverse of the
 * hollow-coverage failure and just as useless.
 */
function codeOf(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('the Admin Notes tab has both of its states', () => {
  it('reads the files it is meant to be measuring', () => {
    /* The vacuity floor. Every assertion below is a `toContain` over one of these. */
    for (const [name, source] of Object.entries({ PANE, REMOTE, SERVER, HOLDER, MODAL })) {
      expect(source.length, `${name} is empty`).toBeGreaterThan(500);
    }
  });

  it('renders the LIST branch, which is the whole defect', () => {
    /*
      Upstream's 105. Asserted by the three classes the reference's own const table gives it, so a
      panel that renders something else entirely cannot satisfy this by having an `{:else}`.
    */
    const code = codeOf(PANE);
    expect(code).toContain('{:else}');
    expect(code).toContain('smallAvatarImg');
    expect(code).toContain('{#each notes as note (note.id)}');
    expect(code, 'the " Add Note " button, const 95 + 96').toContain('fa-plus-circle');
    expect(code, 'the per-row delete, const 99').toContain('fa-minus-circle');
    /* And 104 is still there — this added a branch, it did not replace one. */
    expect(code).toContain("To be able to manage user's notes, please enter the password.");
  });

  it('keys the list on the note id, so a deleted row cannot take its neighbour with it', () => {
    /*
      `{#each … (note.id)}` and not `(i)`. An index key over a list that shrinks in the middle makes
      Svelte reuse the DOM of the row AFTER the deleted one, which is the same defect class as
      upstream's ordinal addressing and would show it in the one place a presenter would notice.
    */
    expect(codeOf(PANE)).toContain('(note.id)');
    expect(codeOf(PANE)).not.toMatch(/\{#each notes as note, \w+\}/);
  });

  it('addresses deletion by ID and never by ordinal', () => {
    const code = codeOf(REMOTE) + codeOf(HOLDER) + codeOf(SERVER);
    expect(code, "upstream's `noteIDX` must not appear in any code path").not.toContain('noteIDX');
    expect(codeOf(REMOTE)).toContain('eq(userNotes.id, noteId)');
    /* Scoped as well as identified: an id from another room or another member matches zero rows. */
    expect(codeOf(REMOTE)).toContain('eq(userNotes.roomShortCode, room)');
    expect(codeOf(REMOTE)).toContain('eq(userNotes.subjectUserId, subjectUserId)');
    /* Zero rows is REPORTED, not shrugged off. */
    expect(codeOf(REMOTE)).toContain('removed.length === 0');
  });

  it('decides authority on the server, from data the server owns', () => {
    const code = codeOf(REMOTE);
    /* The role and the room, both from the session — neither assertable by the caller. */
    expect(code).toContain('presenterRoom()');
    /* The tenancy check, because these write a durable row keyed on the target alone. */
    expect(code).toContain('requireRoomMember(subjectUserId, room)');
    /* And the password, re-asked rather than taken from the room. */
    expect(code).toContain('requireNotesAccess(room, requireSessionId(getRequestEvent().locals))');

    /*
      THE ONE THAT MATTERS MOST. The room's `canManage` is a flag the room owns; if the server ever
      reads a client-sent equivalent, every check above becomes decoration.
    */
    expect(code, 'the server must not accept a client flag').not.toMatch(/canManage|allowToManage/);
    /* And no command takes a room, which is the rule `remote-command-scope-contract` enforces. */
    expect(code).not.toMatch(/roomShortCode:\s*z\./);
  });

  it('grants access only where the controller said yes, and lets the grant expire', () => {
    const auth = codeOf(read('../src/routes/notes-auth.remote.ts'));
    expect(auth, 'written only on ok').toContain('if (decision.ok) grantNotesAccess(');
    expect(codeOf(SERVER)).toContain('NOTES_ACCESS_TTL_MS');
    expect(codeOf(SERVER)).toContain('Date.now() - grantedAt.getTime() > NOTES_ACCESS_TTL_MS');
    /*
      The `required` half is asked of the controller on EVERY write rather than cached. An owner who
      turns the password on expects it to take effect; a room holding a boolean from boot would keep
      writing notes for every presenter until it restarted.
    */
    expect(codeOf(SERVER)).toContain("checkNotesPasswordRemotely(room, '')");
  });

  it('never lets the credential itself reach this room', () => {
    /*
      `needPasswordForUserNotes` is one of the seven credential-shaped settings.
      `room-config-boundary.test.ts` is the gate that enforces the boundary; this asserts the FEATURE
      built on top of it did not quietly acquire a copy, which is how a boundary gets crossed —
      not by editing the allow-list, but by a new consumer reading the value some other way.
    */
    for (const source of [PANE, REMOTE, SERVER, HOLDER]) {
      expect(codeOf(source)).not.toContain('needPasswordForUserNotes');
    }
  });

  it('stores what the reference stores, and joins for the rest', () => {
    /* Room AND subject on the row, because a note about a member of room A is not room B's. */
    expect(SCHEMA).toContain('export const userNotes = sqliteTable(');
    expect(codeOf(SCHEMA)).toContain("roomShortCode: text('room_short_code').notNull()");
    expect(codeOf(SCHEMA)).toContain("subjectUserId: integer('subject_user_id')");
    expect(codeOf(SCHEMA)).toContain("authorUserId: integer('author_user_id')");
    /*
      The index leads with both halves of every read and carries `createdAt` for the ordering. This
      is the read path; without it the list is a scan of every note in every room.
    */
    expect(codeOf(SCHEMA)).toContain("index('user_notes_room_subject_idx')");
    /* And the read is BOUNDED, which upstream's is not — its bound is a scrollbar. */
    expect(codeOf(SERVER)).toContain('.limit(NOTE_LIMIT)');
  });

  it('loads the list the moment the door opens, not on a second click', () => {
    /*
      The gap this closes was real in the first draft: the presenter clears the password, the panel
      flips to the list state, and the list is empty until they click the tab again. Upstream never
      has it because its notes arrive with the roster entry.
    */
    const composed = codeOf(read('lib/room/admin-notes.ts'));
    expect(composed).toContain('await this.#access.ask()');
    expect(composed).toContain('if (this.#access.granted) await this.#list.open(subjectUserId)');
    /* And the tab itself loads without raising a prompt, because upstream's tab does not. */
    expect(codeOf(MODAL)).toContain("if (tabId === 'notes') userNotes.open(targetUser.id)");
  });

  it('transcribes both dialog strings exactly, including the space upstream leaves', () => {
    const code = codeOf(HOLDER);
    expect(code).toContain("title: 'Enter your note below'");
    expect(code).toContain('`Are you sure you want to delete this note by ${note.authorName} ?`');
    /*
      The confirm names the note's AUTHOR, which is upstream's `e.name` and not the subject. It is
      the right question: the note being deleted is somebody's, and the presenter deleting it may
      not be the one who wrote it.
    */
    expect(code).toContain('note.authorName');
  });

  it('replaces the list wholesale, so the rune is raw', () => {
    /*
      Every mutation returns the whole new list from the server and it is assigned in one go —
      upstream's `user.notes = resp.notes`. A deep `$state` proxy over an array nothing mutates in
      place is overhead on every read, which is the first trap `CLAUDE.md` names.
    */
    expect(codeOf(HOLDER)).toContain('$state.raw<readonly UserNoteView[]>([])');
    expect(codeOf(HOLDER), 'nothing here pushes or splices').not.toMatch(/#notes\.(push|splice)/);
  });
});
