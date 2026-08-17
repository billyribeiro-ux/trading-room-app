# Phase 5 — decomposing `+page.svelte`: state, method, and the traps already paid for

**Written 2026-08-16 after six slices, so the remaining thirteen do not re-derive any of it.**
Row AE in the root `TODO.md` is the standing record of WHY this phase exists. This file is the
working method: what has landed, what is left, the pipeline that works, and — most importantly — the
five ways a mechanical extraction silently breaks this file, each of which has already cost a fix.

---

## 1. Where it stands

`+page.svelte` **9,605 → 7,349**. Script 8,627 → 6,397. Template 978 → 952.

| slice | module                          | commit    | page after |
| ----- | ------------------------------- | --------- | ---------: |
| 0     | the three gates (no extraction) | `e972418` |      9,605 |
| 1     | `RoomToasts`                    | `dc87d13` |      9,532 |
| 2     | `RoomDialogs`                   | `7bdc4ef` |      9,519 |
| 3     | `RoomPrefs`                     | `d9d1187` |      9,247 |
| 4b    | `RoomVolume`                    | `2330597` |      9,057 |
| 12    | `RoomBroadcasts`                | `a4480c4` |      8,899 |
| 6     | `RoomFiles`                     | `9d5a5fb` |      8,699 |
| 15    | `RoomTradeAlerts`               | `1bd38a2` |      8,415 |
| 7     | `RoomPrivateChat`               | `00ec080` |      8,132 |
| 13    | `RoomUserActions`               | `dc92cae` |      7,664 |
| 10    | `RoomComposer`                  | `6535c98` |      7,349 |

Suite 1,954/138 → **2,197/149**. `svelte-check` 0 errors, 0 warnings throughout.

**The template moved for the first time in slice 6**, and only because that slice collapsed a prop
list: 984 → 970. Everything before it came off the script alone. Slices 17–19 still carry almost all
of the template reduction, and the projection of ~785 depends on them completely — anyone measuring
progress by the page count alone will conclude this is nearly done when the hardest third is
untouched.

What slice 6 did establish is that a domain extraction pays TWICE where a prop is drilled twice.
Fifteen props left the page, and the same fifteen left `PresentationArea`. Slices 11, 15 and 16 all
touch `PresentationArea`'s surface, so the same arithmetic applies to them.

---

## 2. What is left — measured 2026-08-17, after S9

**Group B and Group C are DONE.** Every module the old table listed has landed, and so have 17
(`RoomOverlays`), 18 (window handlers) and 19 (`RoomShell`). The table is replaced rather than ticked
off, because a list of finished work reads like outstanding work to the next person opening this file.

`+page.svelte` is **2,508 lines** — script 1,952, template 557. Do not trust that number for long;
`source-size-contract.test.ts` is the authority and re-measures on every run.

### What the remaining 2,508 lines actually are

Measured with `svelte.parse`, every statement's leading comment attributed to it:

| block                          |   lines | disposition                                      |
| ------------------------------ | ------: | ------------------------------------------------ |
| 36 `new Room*()` constructions | **740** | **S7** — the composition root                    |
| 35 function declarations       | **495** | extract to the modules that own them             |
| template                       | **557** | prop-list collapse behind facades                |
| `$derived`                     |     176 | mostly stays; it is what the template reads      |
| imports                        |     131 | leave with their consumers (~40 remain after S7) |
| `$effect` + `onMount`          |     105 | **two effects stay deliberately** (below)        |
| `$state` / `$props` / other    |     147 | stays                                            |
| type aliases                   |      23 | move with their domain                           |

**Projection to the under-1,000 target, stated so a miss is visible rather than quiet:** S7 takes the
740 to ~40 and the imports to ~40; the functions to ~150; the template to ~380. That lands at
**~1,038** — over the target, not under it. The target is reachable but there is no slack in it, and
anyone who reports "under 1,000" without a fresh measurement is guessing.

### S7 — the composition root. The analysis is done; the move is not.

This is the largest and the most dangerous remaining slice, and the danger is specific: its failure
mode is SILENT. Reassigning a shared reactive value breaks the link for everything reading it
downstream — Svelte's own docs say _"you cannot export reassigned state"_ — so a mis-wired root
renders the room correctly once and then stops updating, with no error, no failing type-check and no
red test. That is why the measurements below were taken BEFORE any code moved, and why they are
recorded here rather than re-derived.

**Measured facts, each by reading the AST rather than by searching:**

1. **36 constructions, 740 lines, in 22 NON-CONTIGUOUS runs** spanning lines 175 to 1516. They are
   interleaved with the `$derived` values they depend on. This is the fact that makes S7 a real
   refactor rather than a cut-and-paste, and it was not obvious before it was measured.
2. **26 page bindings cross into them** — 11 `const`, 2 functions, 13 `let`.
3. **ZERO of the 13 `let`s is written by the TEMPLATE.** Every write is script-side. This is the
   finding that makes the slice tractable: the root can take readers as thunks and writers as
   receivers without the template changing at all.
4. **Four of the 13 are DOM handles** — `mainElement`, `alertChatElement`, `composerElement`,
   `alertsScroller` — written by `{@attach}` capture functions. These CANNOT move; they cross as
   thunks, and a root that tried to own them would be reaching for elements it does not render.
5. **The contract-test ripple is small: 6 files, 19 references.** Far smaller than the layout slice's
   twelve assertions across six files, because the classes keep their names and the template keeps
   reading `prefs.x` unchanged.

**The shape that follows from those five facts:**

```ts
// src/lib/room/create-room.svelte.ts
export function createRoom(deps: RoomDeps) {
  /* the 36 constructions, in their existing relative order */
  return { prefs, media, split /* … */ } as const;
}
```

- The page does `const { prefs, media, … } = createRoom({ … })`. Destructuring is safe — it binds the
  same instances, and the docs' warning is about REASSIGNMENT, not about binding.
- Every downstream reference (`prefs.doNotDisturbOn`, the template, all 166 test files) keeps working
  unchanged. That is the property worth protecting, and it is why the classes must keep their names.
- Readers cross as thunks (`isPresenter: () => isPresenter`), writers as named receivers
  (`setChatAlertsDetached`). The inline arrows currently written at each construction become named
  members of `RoomDeps`, which is strictly better: the receiver is declared once instead of being
  re-derived at each site.
- **The root must never be reassigned**, and the same `const`-instance rule the state classes already
  carry applies to it.

**Do not start this at the end of a session.** Half-moved wiring is the worst state this file can be
left in, and the failure is invisible to every gate the repository has.

### S6 (`createContext`) is CANCELLED — the plan was wrong and the measurement says so

The plan instructed "`PresentationArea` → its own panes: `createContext`". It is refuted, and the
refutation is recorded rather than the row quietly deleted, because the plan's sentence is still
readable and would otherwise be obeyed by the next person.

`svelte/context` exists for values reaching a descendant "potentially through many layers of
intermediate components". That is a claim about LAYERS, so it was counted by walking each child's own
template for the prop names its parent had handed it:

|                                                     | measured 2026-08-17 |
| --------------------------------------------------- | ------------------: |
| props `PresentationArea` forwards unchanged         |              **50** |
| of those, forwarded ON by the child to a grandchild |               **0** |

Fifty one-level hops to direct children is a wide component, not prop-drilling. Context would have
added indirection with no reader — the thing `PrivateChatPanel.svelte`'s own note refuses — and cost
the property this repository leans on hardest: 49 contract tests assert on these hand-offs as source
text, and a context hand-off is invisible to every one of them.

**Two things nearly made it look like drilling, and both dissolved on READING rather than counting.**
`viewerOnlyMode` appears in `ScreenTabs` only inside a capture citation, not as a prop. And
`ScreenPane` renders `ScreenZoomControls` WITHOUT forwarding either shared gate — it passes a locally
derived `showZoomCtrlDetached`. A count would have called both of those drilling.

The condition worth watching is therefore not "a component has many props" but **"a prop is forwarded
by a child it was given to"**, and it is now written that way in the component that owns the note.

**One honest gap fell out of this and is NOT fixed here.** `ScreenZoomControls` declares
`viewerOnlyMode` and is rendered twice — from `PresentationArea` with the flag, and from `ScreenPane`
(the detached variant) WITHOUT it. The flag gates one CSS class, `viewer-only-screen-zoom-controls`,
which the component's own note says "moves the gated trio rather than hiding it", so this is
positioning and not authority. Whether the capture applies that class to the DETACHED window is not
established from the evidence read so far, and it is not guessed: it needs the detached component's
markup from a capture, and until then the asymmetry is recorded rather than "corrected".

### Two effects stay on the page, and it is a decision, not a leftover

- the `noselect` body class — direct DOM manipulation of a node no element owns, which is `$effect`'s
  documented use;
- `polls.deliver` → open modal — `RoomPolls` already returns the decision; the page owns the modal.

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

### 4.5a A GENERIC declaration is `name<T>(`, not `name(`

`withEvidenceState<T extends MessageActionItem>(item: T)` was renamed nowhere in slice 9, because
both the reference rewrite and the declaration rewrite anchored on the opening parenthesis. The
result parsed as a stray `function` inside a class body — 46 errors from one missed rename, which
is at least loud. The same declaration without a type parameter renames correctly, so this is
invisible until a slice happens to contain one.

### 4.5b A BARE method reference is the unbound trap arriving from the SOURCE

`.map(withEvidenceState)` has no parenthesis, so the rename cannot see it — and left alone it is an
unbound method handed to `map`. This is the same defect `unbound-method-contract.test.ts` refuses
at prop boundaries, reaching the class from its own moved code instead. Any surviving bare reference
to a renamed method should be refused by the generator rather than passed through.

### 4.5c A literal NESTED inside a template interpolation is still a literal

Slice 15 taught the scanner that `${…}` is code. Slice 13 found the hole that opened: a literal
inside the interpolation was then treated as code too, and
`` `un${list === 'mutedUsers' ? …}` `` had its inner literal rewritten to `'this.#mutedUsers'`.
`svelte-check` caught it only because the comparison narrowed to a literal union; between two plain
`string`s it would have compiled, and a comparison that is silently always false is exactly the
shape that ships. The scanner is a flat TOKEN LIST now — every token is code or raw, reassembly is a
concatenation, and there is no structure left to get wrong.

### 4.6 A REMOVED region leaves its own indent behind

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

## 5a. Slice 9 (`RoomFeeds`) — SCOPED AND GENERATED, NOT LANDED

The class was written, type-checked clean at 372 lines with citations 2/2, and then REMOVED rather
than left unimported. What stopped it is worth writing down, because it is not difficulty:

**The page rewiring needs a COMMENT-AWARE pass, and the counted-string-swap approach cannot do it.**
Every other slice's identifiers appeared only in code. `visibleAlerts`, `searchableAlerts` and
`enableBadges` appear in PROSE as well — `RoomAlerts`'s own docstring says it "deliberately does
NOT own `visibleAlerts` / `searchableAlerts`", and there are eight more such mentions. A blind
replace rewrites those sentences into nonsense, and the citation gate cannot see it because the
count does not change.

**What remains, precisely:**

- 30 page sites, of which ~9 are inside comments and must NOT be rewritten;
- two of them are object-literal SHORTHAND in `messageChrome` (`enableBadges,` and
  `showBadgesToPresentersOnly,`), which need the key written back;
- `AlertChatArea` takes 8 of these as props already, so its side is a prop rename only.

The transform to use is the generator's own `xform`, which skips comment lines — not the flat
`swap` the rewiring scripts use. That is a twenty-minute change and it was not worth starting with
too little left to verify it.

**Design decisions already taken and worth keeping:**

- Generic over BOTH row types. `RoomAlerts`'s predicates take `AlertRow` — body, sender, hash,
  timestamp — which is NARROWER than `MessageActionItem`. Widening `AlertRow` to make one type fit
  would loosen a contract four other call sites depend on.
- The pipelines become GETTERS, not `$derived` fields, for the reason `RoomFiles.filesHidden`
  records.
- `chatMessagesFor` stays ONE function called twice, not two deriveds. Six steps duplicated is six
  chances to drift, and the extra column arrived after the main one.
- The unbounded `visibleAlerts` pass is NOT fixed inside the move. It is recorded in the class
  docstring and in `TODO.md`; fixing it changes behaviour and belongs in its own change.

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
