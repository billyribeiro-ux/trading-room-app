# MISSION: finish `apps/room/src/routes/+page.svelte`

You are continuing a decomposition that is four phases deep and has one phase left. Everything below
was **measured on 2026-08-16, not estimated**. Trust these numbers; re-measure only what you change.

**TARGET: `+page.svelte` under 1,000 lines.** It is 9,605 today. That is the owner's number and it is
deliberately aggressive.

**You design the route. This document gives you the facts, the standards, the traps and the
verification bar — not the answer.** Do not treat any framing here as a prescribed solution.

---

## 1. THE MEASUREMENT, taken 2026-08-16

```
+page.svelte            9,605 lines
  <script>              8,626   (ends at the line before the template)
  template                978
```

**Inside the script block:**

| | count |
|---|---|
| top-level functions | **248** |
| total function BODY lines | **4,375** |
| block-comment lines | **3,489** |
| `//` comment lines | **336** |
| non-comment script lines | **~4,801** |
| imports | 91 |
| `$state(` | 65 |
| `$state.raw` | 21 |
| `$derived(` | 51 |
| `$derived.by` | 4 |
| `$effect` | 16 |
| `$props()` | 1 (+1 in a snippet) |

**The 25 largest functions** (line number, body lines):

```
579  L6966  subscribeToRoomEvents      44  L5462  toggleMicrophone
249  L3332  handleUserAction           43  L3960  mediaServerDisconnected
183  L4749  handleMessageAction        43  L8134  webcamCard
124  L5696  startScreenSharing         36  L3779  openImageModal
 90  L3686  savePreference             36  L6552  uploadOneImage
 77  L5534  toggleWebcam               35  L591   detachScreen
 58  L4074  addRemoteScreen            35  L4477  deliverAlert
 57  L5906  startRecording             35  L5139  ingestPrivateMessage
 50  L5411  enableMicrophone           33  L6651  postAlert
 47  L2657  chatMessagesFor            32  L6933  resolveOwnLocation
                                       31  L4150  addRemoteWebcam
                                       30  L6225  playMp3ForMe
                                       30  L8237  submitNoteMutation
                                       28  L2783  maybeLoadOlderMessages
                                       28  L3205  loadTawkSupport
```

**Functions clustered by domain** (name-pattern grouping — indicative, verify before relying on it):

```
chat + messages + mentions + composer      45
media (screen/webcam/mic/record/sfu/mtx)   40
files + notes + uploads                    30
alerts + qa + polls                        27
roster + users + private chat              16
prefs / settings / theme / modal           15
events / commands / transport               8
unclassified                               67
```

**Inside the 978-line template** — this is the part most people miss:

```
<PresentationArea>  invocation   104 lines
<ModalHost>         invocation    86
<RoomNavbar>        invocation    51
<AlertChatArea>     invocation    47
<RoomSidebar>       invocation    34
<ExtraChatPane>     invocation    29
<PrivateChatPanel>  invocation    26
<ToastHost>         invocation     1
                    ─────────────────
                    378 lines of prop lists
comment lines                    214
remaining shell / layout markup  ~386
```

**Do the arithmetic before you plan.** The template alone is 978 lines. Whatever you do to the
script, the total cannot go below the template's size. Draw your own conclusions about what that
implies for the target.

---

## 2. WHAT IS ALREADY DONE — do not rebuild any of it

`git log --oneline -12` on branch `feat/extra-chat-column`. Read `CHANGELOG.md` (newest first) and
`TODO.md` row AE before planning.

**Phase 1 — eight state classes** in `src/lib/room/*.svelte.ts`, each with its own test:
`RoomPolls`, `RoomMenus`, `RoomSplit`, `RoomRoster`, `RoomAlerts`, `RoomLogPages`, `RoomChat`,
`RoomMedia`. Plus `RoomArrivals` and `RoomScrollFollow` (plain `.ts` — deliberately NOT rune modules,
because nothing renders from them and a `$state` set that an effect both reads and writes re-runs its
own effect). 13,522 → 12,938 — **only 584 lines**, because what moved was DECLARATIONS while the 248
function bodies stayed. That gap is your job.

**Phase 2 — six components** (plan said five): `PrivateChatPanel`, `RoomSidebar`, `RoomNavbar`,
`AlertChatArea` (45 props), `PresentationArea` (~100 props), `FilesPane` (22 props). Template
4,251 → 978. **There is essentially nothing left in the template to extract as a component.**

**Phase 3 — latch effects.** `RoomArrivals` replaced three hand-rolled seen-set/priming pairs;
`RoomScrollFollow` replaced three scroller latch sets. 16 `$effect` remain.

**Phase 4 — 162 `class:` directives → clsx** across 25 files. Zero remain.

**Already extracted as pure modules** (do not re-extract): `alert-filter`, `alert-labels`,
`media-elevation`, `screen-volume`, `screen-zoom`, `file-sort`, `files-gates`, `chat-plain-text`,
`reaction-toggle`, `message-formatters`, `navbar-labels`, `roster-gates`, `connectivity-status-rows`,
`room-message-chrome`, `user-action-intent`, `media-capture-error`, `dead-preference-keys`,
plus 16 `*.remote.ts` modules. **Zero `fetch('?/action')` call sites remain in `+page.svelte`.**

---

## 3. NON-NEGOTIABLE STANDARDS

Read these files first — they bind you and every sub-agent you spawn:
`CLAUDE.md` (repo root), `~/CLAUDE.md` (evidence discipline), `apps/room/AGENTS.md` (DPE level 8++).

The owner's standard, stated twice and in these words:
> Level 8+ enterprise grade, built for the next 20 years, following Svelte and Rust's best practices,
> with clean, maintainable code and maximized for the highest performance ALWAYS.
> **THIS IS APPLE/GOOGLE/MICROSOFT LEVEL STUFF.**

**The rules that will bite you specifically on this task:**

1. **THE COMMENTS ARE THE ASSET. ~3,825 of the 8,626 script lines are comments and you may not
   shorten them to hit a number.** `CLAUDE.md`: *"The comments are a deliberate practice. Never
   shorten them to look tidy."* They are capture citations — byte offsets, const numbers, quoted
   reference source. **They MOVE WITH THE CODE THEY EXPLAIN.** A comment landing in the module that
   owns its subject is the extraction; a comment deleted to fit is the failure this rule exists to
   stop. Any plan that reaches the target by shortening prose is rejected.

2. **The Svelte MCP is mandatory on every `.svelte` / `.svelte.ts` touch**, down to a one-line prop
   change: `list-sections` → `get-documentation` for every section you touch → write → `svelte-autofixer`
   until it returns nothing. It is the LAST gate, every time. On a small module it returns
   `issues: []` and `suggestions: []` and is genuinely actionable — that is one of the arguments for
   extracting in the first place.

3. **Evidence is READ, never searched. Absence is REPORTED, never invented.** Locating with a tool is
   fine; CONCLUDING from a tool's output is not. Open the region and read it.

4. **Fails closed, fails loud.** Multi-tenant fintech. Every authority decision is made on the server
   from data the server owns, never asserted by the client. Deny-by-default. No `.catch(() => {})`.

5. **Test what changed.** A `.ts`/`.svelte` under `src/` → that file's test plus `svelte-check`. The
   full gate runs ONCE, immediately before a push. Batch pushes.

6. **`CHANGELOG.md` gets a real dated + timed entry for every finished piece of work** (measure the
   clock, never estimate). The matching `TODO.md` row is REMOVED, not struck through.

7. **Commit and push freely to `feat/extra-chat-column`. NEVER merge into `main`.**

8. **Sub-agents and workflows are FORBIDDEN** unless the owner lifts it in that session. Build it
   yourself.

---

## 4. THE TRAPS — every one of these cost real time on this file

**These are not hypotheticals. Each is a defect that shipped or nearly shipped.**

- **A negative assertion goes GREEN the moment its region moves.** 46+ test files read
  `+page.svelte` as a STRING. Positive assertions fail loudly (fine — that is the migration telling
  you where to go). `not.toContain` starts passing for the wrong reason: the text is absent because
  the region left, not because the guard still holds. This happened for real
  (`unmute-chat-contract.test.ts` sliced for `const exactAlerts`, the table moved, the slice returned
  the empty string, the guard passed having stopped guarding — caught by reading, not by any test).
  **Every text-reading test must make at least one POSITIVE assertion, and `source-size-contract.test.ts`
  enforces that** via a generated case per reader file.

- **`EXTRACTION_SOURCES` in `source-size-contract.test.ts` — add your new file to it IN THE SAME
  COMMIT.** Re-pointing a test at a new file silently drops it out of that generated list. It has
  happened three times; twice it was only noticed because the total test count fell by one.

- **A mechanical source-constant replace must cover `lastIndexOf`, not just `indexOf`/`slice`/`match`** —
  and must not rename a LOCAL variable that shares the constant's name. Both happened in one pass;
  one produced `const pane = pane.slice(...)`.

- **Assert the substitution COUNT before writing.** Three `perl` mutations were silent no-ops because
  the regex did not match prettier's wrapping, and were read as passing controls.

- **Do not hand-roll what the platform does.** A hand-written tag scanner stopped after three tags in
  this exact file — an apostrophe inside a JS arrow-function handler broke its quote tracking — and
  reported **"0 directives"** for a file with five. A clean run with a wrong answer. Use
  `svelte.parse` / the compiler / the type-checker as the parser.

- **Prove the instrument before reporting a failure.** Every bug found in this session that was not
  in the original code was the tooling's. Six negative controls came back green; in four of them the
  fault was the test, not the source. If a control does not go red, suspect your control first.

- **Never put template syntax in a comment.** A comment quoting a Svelte block is prose to a human and
  an unclosed block to a parser. `svelte-check` stayed green while a contract test went red on exactly
  this.

- **`$state` on an object only ever reassigned → `$state.raw`.** An `$effect` that assigns a value
  derived from other state is a `$derived`. After a child saves, reassign parent state from the
  SERVER RESPONSE.

- **A state class must never be reassigned.** `svelte/svelte-js-files`: you cannot export reassigned
  state. The instance is created once; a new log is `chat.log = next`, a field write. Getting this
  wrong renders once then silently stops updating — and passes `svelte-check`, the suite AND the
  autofixer. **Every state class therefore needs a runtime reactivity test in the shape of
  `room-mtx.svelte.test.ts`**: read a field inside `$effect.root`, mutate, flush, assert it re-ran.

---

## 5. THE METHOD THAT WORKED — use it, it is the difference between a move and a rewrite

**For any component or module extraction, let the COMPILER produce the interface:**

1. Move the region byte-exact (`sed -n 'A,Bp'`). **Do not retype it** — it is evidence-derived markup
   with captured citations, and retyping is how a quoted `H(6, M2e, …)` drifts.
2. Write the new file with an **empty `<script>`**.
3. `npx svelte-check --output machine` and take every `Cannot find name` as the interface.
4. Only then write the props/imports.

**Why this is not ceremony:** in this file `data` appears twelve times in one markup region and *not
once* as the variable — every hit is a `data-bs-toggle` / `data-bs-target` attribute. A hand scan
produced four invented props in one component from COMMENT TEXT alone. The compiler also catches what
is not an identifier: `screenVolume` is a snippet, `captureVideoImage` is an import.

**Then:** `svelte-check` 0/0 → `eslint` (it will name the now-unused imports, which is independent
confirmation the new file took every usage) → the suite → `svelte-autofixer` → prettier → negative
controls with the mutation verified to have landed → lower the ceiling in the same commit.

---

## 6. VERIFICATION BAR — per slice, non-negotiable

- `npx svelte-check --threshold error` → **0 errors, 0 warnings** (currently 1,144 files)
- `npx vitest run` → currently **1,909 tests across 138 files**, all passing
- `npx eslint src` clean · prettier clean on touched files
- `svelte-autofixer` on every new/modified `.svelte` and `.svelte.ts` → until it returns nothing
- **A runtime reactivity test per state class** (see trap above)
- **A negative control per slice, seen RED, with the mutation verified to have landed** — a test that
  cannot fail is worse than no test
- **Lower the ceiling in `source-size-contract.test.ts` in the same commit.** Ceilings only ever go
  DOWN. Current: `+page.svelte` 9,606 · `ModalHost.svelte` 5,966 · `+page.server.ts` 1,584. A raise
  is a conversation, not a number to edit — the last time it was needed, the growth was paid for with
  a real extraction instead.
- Re-read your own `git diff` like a senior reviewer before saying done.

---

## 7. THINGS THAT ARE DECISIONS, NOT OVERSIGHTS — do not "fix" them

- **The 8 copy-on-write `new Set()` sites** (`playingForMe = new Set(playingForMe).add(id)`). The
  autofixer suggests `SvelteSet`. That removes a per-toggle allocation; it is **not** a correctness
  fix. The owner has ruled: do not blanket-convert.
- **`<svelte:document>` at the visibility handler** — the note there records why it is not an
  attachment.
- **`{' '}` mustaches** are the capture's own padded text nodes (`v(2, 'Delete Selected ')`). Svelte
  trims whitespace at element edges, so the pad must be an expression to survive into the DOM.
  `files-pane-contract` asserts exactly this. The autofixer suggests removing them; refuse.
- **Popper's collision pass, the screen `<video>` `controls` attribute, the overlay's id prefix** —
  all recorded in `TODO.md` under "Not gaps — decisions taken deliberately".
- **The legacy REFERENCE database name and the live runtime role `tradingroom_app` are different on
  purpose.** `ops/naming-provenance.md` is the mapping, and
  `apps/controller/src/lib/naming-boundary.test.ts` enforces it — that guard `git grep`s the WHOLE
  repository for the reference literal and fails on any hit outside its allow-list, **documentation
  included**. This very line was rewritten because the first draft spelled the name and turned CI
  red. Do not type it; point at the mapping file, as this does.
- **The capture directories are evidence** (`second-dump/**` and siblings) — SHA-256 pinned and
  enforced inside `pnpm test`. Never reformat, rename or "fix" anything in them.

---

## 8. CONTEXT THAT MAY MATTER TO YOUR PLAN

The approved plan called for a **`createContext` spine**, quoting `svelte/context` on module state
being reachable by the NEXT user during SSR. **That was deliberately deviated from**, and the reason
is recorded in `source-size-contract.test.ts` and `PrivateChatPanel.svelte`: the state classes are
instantiated inside `+page.svelte`, so they are per-request already and there is nothing for context
to protect against; the panes were DIRECT children, and a context layer for a one-level hop is
indirection with no reader.

The note also records the condition for revisiting it: *"Context earns its place when a pane grows
children that need the same state."*

`createContext` was added in Svelte **5.40**; this repo is on **5.56.8** (verified at runtime). The
documented mount-test wrapper pattern is available since 5.49.

**Those are facts, not instructions.** Decide for yourself whether the condition is now met and what
follows from it.

---

## 9. WHAT TO PRODUCE IN PLAN MODE

Before writing any code, produce a plan that states:

1. **Your own measurement**, taken fresh — do not trust section 1 without spot-checking it.
2. **The arithmetic to under 1,000**, made explicit: what ends up where, and what the file is left
   holding. If you conclude the target is unreachable, say so with the numbers rather than quietly
   aiming lower.
3. **The slices, ordered**, each with: what moves, roughly how many lines, which contract tests read
   that region today, and what its negative control will be.
4. **Which existing modules/classes absorb work** versus what genuinely needs a new file — nothing
   exists without a consumer.
5. **The risks you have identified yourself**, especially any place a `not.toContain` guard would go
   vacuous.
6. **One slice per commit, app green at every commit.**

Do not begin implementing until the plan is approved.

---

## 10. GROUND TRUTH COMMANDS

```bash
cd /Users/billyribeiro/Desktop/trading-room-app/apps/room
git log --oneline -12                    # branch feat/extra-chat-column
wc -l src/routes/+page.svelte

# the script/template split
python3 -c "
s=open('src/routes/+page.svelte').read().split('\n')
e=next(i for i,l in enumerate(s) if l.strip()=='</script>')+1
print('total',len(s)-1,'script',e,'template',len(s)-1-e)"

npx svelte-check --threshold error --output machine | tail -1
npx vitest run 2>&1 | grep -E "Tests |Test Files "
npx eslint src
```

**Nothing in this document is a substitute for reading the code.** It exists so you spend your budget
on the decomposition rather than on rediscovering what has already been measured.
