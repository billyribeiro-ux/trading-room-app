# Phase 5 — decomposing `+page.svelte`: state, method, and the traps already paid for

**Written 2026-08-16 after six slices, so the remaining thirteen do not re-derive any of it.**
Row AE in the root `TODO.md` is the standing record of WHY this phase exists. This file is the
working method: what has landed, what is left, the pipeline that works, and — most importantly — the
five ways a mechanical extraction silently breaks this file, each of which has already cost a fix.

---

## 1. Where it stands

`+page.svelte` **9,605 → 8,415**. Script 8,627 → 7,463. Template 978 → 952.

| slice | module                          | commit    | page after |
| ----- | ------------------------------- | --------- | ---------: |
| 0     | the three gates (no extraction) | `e972418` |      9,605 |
| 1     | `RoomToasts`                    | `dc87d13` |      9,532 |
| 2     | `RoomDialogs`                   | `7bdc4ef` |      9,519 |
| 3     | `RoomPrefs`                     | `d9d1187` |      9,247 |
| 4b    | `RoomVolume`                    | `2330597` |      9,057 |
| 12    | `RoomBroadcasts`                | `a4480c4` |      8,899 |
| 6     | `RoomFiles`                     | `9d5a5fb` |      8,699 |
| 15    | `RoomTradeAlerts`               | `pending` |      8,415 |

Suite 1,954/138 → **2,114/146**. `svelte-check` 0 errors, 0 warnings throughout.

**The template moved for the first time in slice 6**, and only because that slice collapsed a prop
list: 984 → 970. Everything before it came off the script alone. Slices 17–19 still carry almost all
of the template reduction, and the projection of ~785 depends on them completely — anyone measuring
progress by the page count alone will conclude this is nearly done when the hardest third is
untouched.

What slice 6 did establish is that a domain extraction pays TWICE where a prop is drilled twice.
Fifteen props left the page, and the same fifteen left `PresentationArea`. Slices 11, 15 and 16 all
touch `PresentationArea`'s surface, so the same arithmetic applies to them.

---

## 2. What is left

**Group B — domains.** Independent of each other, so the ORDER IS FREE. Take small ones first; the
reordering of `RoomVolume` and `RoomBroadcasts` ahead of media transport is why six slices landed
rather than three.

| #   | module                    | ~script lines | note                                                                              |
| --- | ------------------------- | ------------: | --------------------------------------------------------------------------------- |
| 16  | `RoomNotes` + attachments |           340 | the seam I am least sure of — split if it does not read as one thing              |
| 8   | `RoomMessageActions`      |           380 | `handleMessageAction` + evidence state                                            |
| 7   | `RoomPrivateChat`         |           430 |                                                                                   |
| 11  | `RoomScreens`             |           450 | tabs, zoom, popouts, detach                                                       |
| 10  | `RoomComposer`            |           520 | sending, RTE, uploads, post-alert                                                 |
| 5   | `RoomEventStream`         |           650 | `subscribeToRoomEvents`; `createSubscriber` applies to `roomEventsConnected` ONLY |
| 9   | `RoomFeeds`               |           700 | the three scroll effects go to the panes that own the scrollers                   |
| 13  | `RoomUserActions`         |           700 | `handleUserAction` (249 lines)                                                    |
| 4   | media transport           |         1,700 | largest; `RoomMedia` keeps the state, transport goes to a sibling                 |

**Group C — the template.** 17 `RoomOverlays.svelte`, 18 document/window handlers, 19 `RoomShell.svelte`.

---

## 3. The pipeline that works

Every landed slice used this. Deviating from it is what produced the failures in §4.

1. **Extract byte-exact with `svelte.parse`**, attributing each statement's LEADING COMMENT to it.
   Never retype an evidence-derived region.
2. **Generate the class from the extracted text**, transforming only what must change. The
   initialisers move untouched: `svelte/$state` permits `this.#x = $state(...)` as the first
   assignment in a constructor, so the whole transformation is `let x = ` → `this.#x = `.
3. **Count citations in vs out BEFORE writing.** `(full\.js|compiled\.js|render-helpers\.js)[:.]` and
   `bytes? [\d,]{5,}`. Count over the **final file**, not over the generated fragments — a check that
   cannot see part of its own subject is what this gate exists to refuse.
4. **`svelte-check` tells you the interface.** Write it, run it, take every error as the work list.
5. **Rewire the page with the substitution COUNT asserted** before each write. Abort on mismatch.
6. **Repair shorthand** (§4.5) and re-run `svelte-check` until 0/0.
7. **Re-point the contract tests**, one named source constant per file, each assertion at the file
   that owns its subject, plus an assertion on the HAND-OFF.
8. **Reactivity test + negative control**, `room-mtx.svelte.test.ts` shape.
9. **Declare the ceiling**, lower the page ceiling, `CHANGELOG.md`, commit.

**Write the generator to a file and run it — never `node -e "…"`.** A `"` inside the script kills the
shell quoting, and the failure looks like a syntax error in your own code.

---

## 4. THE FIVE WAYS A RENAME SILENTLY BREAKS THIS FILE

Each of these has already happened and cost a fix. A transform that does not handle all five is not
safe to run on `+page.svelte`.

### 4.1 Comments are not code

The first `RoomVolume` generator rewrote `screen-volume.ts` to `screen-this.#volume.ts` **inside a
docstring**, destroying a citation. Skip any line that opens, continues or closes a block comment,
or starts with `//`. Caught by the citation count (§3.3), not by any compiler.

### 4.2 STRING LITERALS ARE NOT CODE EITHER — and this is the dangerous one

This has bitten twice and the second time was a real defect:

- **Slice 4b:** `'$lib/screen-volume'` became `'$lib/screen-roomVolume.volume'`. Caught by
  `svelte-check`.
- **Slice 12:** `'stopMp3ForAll'`, `'playVideoForAll'` and `'stopVideoForAll'` — **wire command
  names** the SSE dispatch compares against — each became `'broadcasts.<name>'`. Prefixed, they match
  nothing, so **video and mp3 "for all" would have stopped working for every member in the room**.
  `svelte-check`, `eslint` and `svelte-autofixer` were all green. A contract test caught it.

Skip `import` lines, and after any rename assert that no quoted `<instance>.<name>` literal exists.
**Include digits in that detector** — the first version used `[A-Za-z]+` and missed `Mp3`.

### 4.3 Spread syntax defeats a `(?<![\w.#])` lookbehind

`[...selectedFileIds]` has a `.` immediately before the identifier, so the guard that stops you
rewriting `foo.bar` also stops you rewriting a spread. Handle `\.\.\.name` explicitly.

### 4.4 A typed declaration cannot keep its annotation

`let fileTab: FileTab = $state('files')` must become a field `#fileTab: FileTab;` plus
`this.#fileTab = $state('files')`. Rewriting it in place produces
`this.#fileTab: FileTab = $state(...)`, which is a parse error.

### 4.5 A REMOVED region leaves its own indent behind

`svelte.parse` reports a statement's start at the statement, not at the start of its line, so a part
that opens with a block comment arrives flush left while the page has it at two spaces. Removing
`part.text` alone therefore leaves those two spaces, and where two parts are ADJACENT the orphans
accumulate — `fileTab` and `filesHidden` sit on consecutive lines, so the comment after them ended
up indented by six.

It compiles, it type-checks, every test passes, and it is wrong. Nothing but reading the diff finds
it. Remove `indentOf(part) + part.text + '\n'`, and apply the same guard when GENERATING, or every
method's leading JSDoc lands at column 0 above a body at column 4.

### 4.6 Shorthand — three separate forms, all parse errors

- Object literal: `{ chatGif }` → must become `{ chatGif: prefs.chatGif }`, and the KEY must not be
  renamed.
- Svelte attribute: `{doNotDisturbOn}` → `doNotDisturbOn={prefs.doNotDisturbOn}`.
- `bind:` directive: `bind:subtitles` → `bind:subtitles={prefs.subtitles}`.

The repair pass is itself dangerous: it rewrote a positional argument
(`trimChatLog(messages, trimChatLogs)`) as an object key. **Read every site it changes** — 8 were
rewritten in slice 3 and 7 were correct.

---

## 5. Slice 6 (`RoomFiles`) — LANDED, `9d5a5fb`, and what it cost

212 lines out of the page, 382 into `lib/room/files.svelte.ts`, and the number that mattered was
not either of those: **fifteen props collapsed at TWO call sites**, so thirty declarations went.
`PresentationArea` 1,186 → 1,142 and `FilesPane` 573 → 556.

The estimate above said 330 script lines and it delivered 186. The estimate was counting the
functions; what actually left is the functions minus the plumbing that had to stay.

**`bind:fileTab` disappeared as a side effect**, and that generalises: a bindable that exists only
to carry a write back up through a component that never reads it has no reason to survive its props.

**What the test migration actually cost.** `files-pane-contract.test.ts` was re-pointed in 13
places and grew a third source constant. Two NEGATIVES had to move with their positives — left on
`page`, they would have been green forever, because the page no longer contains `searchedFiles`
in any form.

**And it found a stale assertion in a file it did not touch.**
`for-all-broadcast-contract.test.ts` asserted the broadcast refusal wording against
`+page.svelte`. That wording moved to `RoomBroadcasts` in slice 12; the assertion did not move with
it and kept passing, because the page still held a line spelled identically — the Files pane's
`setAlertSound`. Slice 6 moved that line out and it went red.

**So a positive `toContain` can be stale in exactly the way a negative can be vacuous**, and the
extraction that exposes it is usually a LATER one. Before landing a slice, grep the other contract
tests for any string this slice is moving, not just for the identifiers it renames.

**Design decisions worth reusing:**

- `files` and `sessData` as THUNKS, never arrays — `data` is a `$props()` value, so a copy goes
  stale after navigation. `RoomRoster` set this precedent and `RoomFiles` confirms it.
- `filesHidden` as a **getter, not a `$derived` field** — a derived class field initialises before
  the constructor assigns the thunk it reads, so it would cache a value computed against
  `undefined`. This is now an executable test with a negative control, not a comment.
- A field with NO accessor at all is a real answer. `fileSearch` is written by the box and read
  only from inside, so it has a `search()` receiver and no getter.
- Annotate the FIELD when a generic initializer moves into a constructor. `this.#x = new Set()`
  elsewhere in the class reads as `Set<unknown>` otherwise, and annotating leaves the moved line
  byte-exact where editing it would not.

## 6. The gates this phase added, and what each caught

All four caught something real, usually within one slice of being written.

| gate                                                       | caught                                                                                                                        |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| catalog-driven `EXTRACTION_SOURCES` + reader floor         | a test that stopped naming `+page.svelte` stayed policed — the `day-separator` failure, third occurrence, closed structurally |
| per-module `CEILINGS` + 800 backstop, discovered from disk | fired on `toasts.svelte.ts` twenty minutes after being written, and again when prettier reflowed it                           |
| comment + citation floors (6,329 / 220)                    | the `screen-volume.ts` docstring corruption, before it was written                                                            |
| `unbound-method-contract.test.ts`                          | see below                                                                                                                     |

**A KNOWN BLIND SPOT in the citation gate, found in slice 15 and deliberately not fixed there.**

The floor counts citations with `bytes? [\d,]{5,}`, which cannot see one wrapped across a line
break. `changeDayTradeAlertMonths` carried `(byte\n      1,993,666)` and the gate never counted
it, so `MINIMUM_CITATIONS` has been low by at least one and possibly by more. It matters most
exactly where slice 15 was working: merging two halves into one class is the case where a citation
carried by only one half can vanish silently.

It was handled by carrying both wrapped citations across by hand and verifying them BY NUMBER rather
than by the gate. Widening the regex re-baselines the floor, which makes it its own change rather
than a passenger on an extraction — and the next slice that touches the gate should do it, then
re-measure the floor and say what the real count was.

**The unbound-method trap deserves its own note.** A class method passed as a prop loses `this` and
throws on first click. It happened **fifteen times in four slices** — ten in one commit — and
`svelte-check`, `eslint`, `svelte-autofixer`, every text-reading contract test AND the suite all pass
on it, because nothing mounts a component and clicks. The guard decides from the PROTOTYPE (an
accessor is a value, a data property holding a function is a method), so it needs no list of method
names.

**It was itself blind for one slice**: `RoomBroadcasts` landed with seven unbound methods and the
guard said nothing, because its instance map had four entries. The map is now checked against disk —
every class `lib/room/` exports must be listed. Extending it to the eight Phase 1 classes found
**zero** pre-existing offenders, because `RoomSidebar` and `RoomNavbar` take `roster`/`menus`/`media`
whole rather than being handed methods.

---

## 7. Standing rules for the remaining slices

- **Order is free within Group B. Take the small ones first.**
- **A move is a move.** Do not fold an optimisation into an extraction; when the pair breaks
  something there is no way to tell which did it. Record the candidate instead — `RoomToasts` carries
  the `$state.raw` analysis it deliberately did not act on.
- **Receivers rather than setters** where a field group has an invariant. `RoomBroadcasts.videoStopped`
  does four writes that a caller with setters could do one of. Precedent: `RoomMedia.roomRecordingStarted`.
- **Lint the whole repo, not just changed files.** A rename orphans constants in files the slice does
  not otherwise touch. 27 pre-existing errors live in `scripts/* 2.mjs` duplicates — that is the
  baseline, not a regression.
- **Prove a duplication claim before collapsing it.** Slice 15's "one class, two instances" rested
  on folding one half's vocabulary onto the other and diffing: nine of fourteen pairs came back
  byte-identical, and the only CODE difference in 297 lines was two strings. That took ten minutes
  and turned a design opinion into a measurement. When the two halves are NOT that close, the same
  ten minutes tells you to write two classes.
- **A collapse can lose evidence one half carried alone.** Only the day trade half cited
  `byte 1,955,967` and `byte 1,993,666`; a merge that took the swing half as the source would
  have dropped both, and the citation gate could only see one of them (§6). Diff the citations of
  the two halves BEFORE merging, and carry the union.
- **Report the number honestly when it misses.** Slice 1 was −73 against a planned ~250 because
  delivery policy stayed with the preferences it reads. A number that quietly misses its estimate is
  how the next estimate gets believed.
