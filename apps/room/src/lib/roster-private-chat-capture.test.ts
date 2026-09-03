import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The one assertion in the roster private-chat family that needs EVIDENCE, split out on 2026-09-03.
 *
 * ## What it was costing
 *
 * `roster-private-chat.test.ts` holds seven cases and three of them are authority decisions on a
 * multi-tenant application: who may open a private chat with whom, whether a trial account may,
 * and whether a user-to-presenter setting reaches a non-presenter target. Six of the seven execute
 * `canShowRosterPrivateChat` and `resolveRosterPrivateChatStart` or read `RoomSidebar.svelte` and
 * `+page.svelte`, all committed.
 *
 * One read `docs/source/components/app-room-roster.full.js` at MODULE SCOPE. `docs/source` is
 * gitignored and `gate/evidence-bound-tests.mjs` excludes by FILE, so that one line took all seven
 * out of every checkout without the dumps — this container, and CI.
 *
 * ## The second read is here for a different reason, and it is worth stating
 *
 * `mention-reply-private-chat.clean.html` is under NO evidence root, so the gate cannot discover it —
 * and it is not in this repository either (`git ls-files` returns nothing; the path does not exist).
 * It would have thrown `ENOENT` at module scope the moment the free file could run, which is the
 * failure mode `#lib/reference-capture.ts` was built to end. It belongs with the case that reads it.
 */

const decodedRosterSource = readFileSync(
  new URL('../../docs/source/components/app-room-roster.full.js', import.meta.url),
  'utf8'
);
const cleanRosterContract = readFileSync(
  new URL('../../mention-reply-private-chat.clean.html', import.meta.url),
  'utf8'
);

describe('roster private-chat evidence contract', () => {
  it('keeps the decoded source and clean root contract as gates', () => {
    expect(decodedRosterSource).toContain('(this.canPM =');
    expect(decodedRosterSource).toContain("bootbox.alert('Chatting with yourself again???')");
    expect(cleanRosterContract).toContain(
      '<i class="fas fa-comments"></i>&nbsp;&nbsp;Private Chat '
    );
  });
});
