# HANDOFF — what is undone, and everything needed to do it without guessing

Written 2026-08-12 12:35 EDT. Paste the relevant section into a fresh session verbatim.

Every offset, const index and line number below was READ out of the files named. Nothing here is
remembered or inferred. If something in this document does not match what you find, **the file
wins** — say so and correct this document.

---

## THE RULES THAT BIND YOU (not optional, not summarisable)

Read these first, in this order:

1. `CLAUDE.md` at the repository root — the standard for this repository.
2. `~/CLAUDE.md` — evidence discipline. **Evidence is READ, never searched. Absence is REPORTED,
   never invented.**
3. `apps/room/AGENTS.md` — the DPE level 8++ protocol.

The four that get violated most, restated because each one has already cost a turn here:

- **100% hard evidence, ZERO assumptions.** Every class, colour, attribute, number cites a file and a
  location. If you cannot cite it, you do not write it.
- **Read the region, do not conclude from a search hit.** `grep` returns what you already guessed;
  opening the file returns what you did not know to ask for. Locating with a tool is fine.
  Concluding from its output is not.
- **If it cannot be found, it does NOT get invented.** Say so, name every file you opened, write a
  browser-console script that downloads it (copy the shape of `apps/room/scripts/collect-tooltips.js`
  — denylist before every click, never click delete/upload/play/stop/send/save/submit, never mutate).
- **Rule out your own tooling before reporting a defect.** Every bug in this codebase that was not in
  the original code was the agent's. A failing check is your check until you have proved otherwise.

**Compiling and passing tests is not evidence that a thing renders.** jsdom reports every rect as
zero. Three real defects shipped green here and were only caught by a screenshot. See
`apps/room/scripts/verify-tooltip-placements.mjs` for the pattern that catches them.

Testing: run what changed, not the world. `pnpm --filter room vitest run <file>` plus
`pnpm --filter room check`. The full gate runs ONCE before a push.

Commit and push only when asked. `services/**` is a mirror — changes there are lost on sync.

---

## ITEM U — the zoom-controls volume dropdown (NEXT; evidence complete, implementation outstanding)

### What is already true

There are **TWO** `#dropdownVolume` triggers in the reference. This is why the thing looked missing
for weeks.

| variant                                                                                          | const        | status                                                             |
| ------------------------------------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------ |
| `["id","dropdownVolume","data-bs-toggle","dropdown",1,"nav-link","d-flex","align-items-center"]` | main nav     | **BUILT — do not touch.** `apps/room/src/routes/+page.svelte:6824` |
| `["id","dropdownVolume","data-bs-toggle","dropdown",1,"btn","btn-sm","btn-dark"]`                | zoom overlay | **MISSING — build this**                                           |

Ours is genuinely the nav variant, not a near-miss: `fa-2x`, `fa-volume-mute` and `mainNavItem` each
occur **exactly once** in the bundle, and `+page.svelte:6824` has all three.

### The evidence file

`apps/room/docs/source/main.d6d3c112b59b7d0d.js` (2,887,876 bytes). SHA-256 pinned by
`dump-contract.test.ts` — never edit it.

- The owning component's `consts:[` begins at offset **1992433**, holds **286** entries, ends at
  **2012092**.
- The nested template functions are hoisted ABOVE it: read offsets **1920560–1923400**.

Read those two regions with `Read`, or slice them with Python. Do not grep and conclude.

### The consts you need, by index

```
[ 88] [1,"zoom-controls-container","position-relative"]
[ 89] [1,"zoom-controls","position-absolute",3,"ngClass"]
[ 90] ["id","dropdownVolume","data-bs-toggle","dropdown",1,"btn","btn-sm","btn-dark"]
[ 91] ["aria-labelledby","dropdownVolume",1,"dropdown-menu","volumeControl"]
[ 92] ["data-bs-toggle","dropdown",1,"float-right","mr-2"]
[ 93] [1,"fas","fa-times"]
[ 94] ["audioVolSlider","","type","range","min","0","max","100","title","Volume",
       1,"mx-auto","py-2","volCtrl",3,"ngModelChange","change","input","ngModel"]
[ 95] ["title","Mute Audio",1,"btn","btn-primary","btn-sm"]
[ 96] ["title","Unmute Audio",1,"btn","btn-primary","btn-sm"]
[ 97] [1,"room-sound-options"]
[106] [1,"fas","fa-volume-up"]
[107] [1,"fas","fa-volume-down"]
[108] [1,"fas","fa-volume-off"]
[109] ["title","Mute Audio",1,"btn","btn-primary","btn-sm",3,"click"]
[110] ["title","Unmute Audio",1,"btn","btn-primary","btn-sm",3,"click"]
[111] [1,"my-1"]
[112] ["type","checkbox","value","Presenter audiob","title","Presenter audio",
       1,"form-check-input",3,"change","name","id","checked"]
[113] [1,"form-check-label",3,"for","ngClass"]
[114] [1,"mx-2","text-center"]
[115] ["audioVolSlider","","type","range","min","0","max","100","title","Volume",
       1,"mx-auto","py-1","volCtrl",3,"ngModelChange","change","input","ngModel"]
```

Reading `TAttributes`: entries before the `1` marker are static attributes; after `1` are classes;
after `2` are styles; after `3` are BINDINGS (a binding sets **no** DOM attribute — that fact is what
item `ngbTooltipWith` exists for; see `apps/room/src/lib/ngb-tooltip.ts`).

Note `"value","Presenter audiob"` on const 112 — the typo is the reference's. Reproduce it. This
codebase already ships `clas=` and `noboby` for the same reason.

### The template functions, decoded

`hSe` — **the trigger**. Verbatim from the bundle, fenced as text so no formatter rewrites it:

```text
function hSe(t,n){if(1&t&&(d(0,"button",90),H(1,cSe,1,0,"i",106)(2,dSe,1,0,"i",107)(3,uSe,1,0,"i",108),u()),2&t){const e=g(4);m(),O(1,e.audioVolume>50?1:-1),m(),O(2,e.audioVolume<50&&e.audioVolume>4?2:-1),m(),O(3,e.audioVolume<4?3:-1)}}
function cSe(t,n){1&t&&T(0,"i",106)}   // fas fa-volume-up
function dSe(t,n){1&t&&T(0,"i",107)}   // fas fa-volume-down
function uSe(t,n){1&t&&T(0,"i",108)}   // fas fa-volume-off
```

Which means: a `button` (const 90) holding ONE of three icons, chosen by `audioVolume` —
`>50` → `fa-volume-up`, `<50 && >4` → `fa-volume-down`, `<4` → `fa-volume-off`.

**EVERY BRANCH IS A STRICT INEQUALITY. At exactly 50 and exactly 4, NO icon renders.** Reproduce
that. Do not "fix" it to `>=`. It is the single most likely thing for a later reader to tidy into a
divergence, so write the comment that says why, and write the test that fails if anyone does.

`CSe` — **the container assembly**. Verbatim, then decoded:

```text
d(0,"li",71)(1,"div",88),H(2,lSe,7,3,"div",89)(3,hSe,4,3,"button",90),d(4,"div",91)(5,"h4"),
v(6," Volume "),d(7,"span",92),T(8,"i",93),u()(),d(9,"input",94),Ve("ngModelChange",...),
x("change",...adjustVol(o))("input",...adjustVol(o)),u(),T(10,"br"),
H(11,pSe,2,0,"button",95)(12,fSe,2,0,"button",96),T(13,"hr"),d(14,"div",...
```

Three children inside `div.zoom-controls-container.position-relative` (const 88):

1. `div.zoom-controls.position-absolute` (const 89) — the zoom buttons, conditional
2. `button#dropdownVolume` (const 90) — the volume trigger, conditional
3. `div.dropdown-menu.volumeControl` (const 91) — the menu, containing in order:
   `h4` with the text `" Volume "`, a `span.float-right.mr-2[data-bs-toggle=dropdown]` holding
   `i.fas.fa-times`, the range `input` (const 94) bound to `audioVolume` with `change`/`input` →
   `adjustVol(event)`, a `br`, the Mute/Unmute buttons, an `hr`, then `div.room-sound-options`.

Note the literal `" Volume "` — leading and trailing spaces.

`pSe` / `fSe` — Mute / Unmute buttons, rendering consts 109 / 110, click → `mute()` / `unmute()`.

`bSe` — **one row per talking presenter**, inside `div.room-sound-options`:

- `div.my-1` (111) > `input.form-check-input` (112), `change` → `toggleTalkingPresenter(user)`
- `name` and `id` are `"talkingPresenter" + $index + "-donot-disturb"` (built by `ei(...)`)
- `checked` ← `preferences.audioMutedFor[user.userID]`
- `label.form-check-label` (113), `for` same id, `ngClass` keyed on `audioMutedFor`
- inside the label: `<span>Mute</span>` when NOT muted, the user's `mediaValue.name`, and
  `<span>Muted</span>` when muted
- then `div.mx-2.text-center` (114) > `input…py-1.volCtrl` (115) — per-user volume, rendered ONLY when
  `sessData.individualVolumeControls` is true; `change`/`input` → `adjustVolPres(event, user)`

`vSe` repeats `bSe` over `mediaService.talkingUsers`.

### THE GATES — read this before writing any markup

`CSe`'s update block, verbatim from the bundle:

```text
m(2),O(2,e.showZoomCtrl?2:-1),
m(),O(3,e.appService.globals.viewerOnlyMode?3:-1),
m(6),je("ngModel",e.audioVolume),
m(2),O(11,e.audioVolume>0?11:-1),
m(),O(12,0==e.audioVolume?12:-1),
m(3),O(15,e.mediaService.talkingUsers&&e.mediaService.talkingUsers.length>0?15:-1),
m(6),O(21,e.isFullScreenshare?21:22)
```

Index 3 is `hSe`, the volume button. **It renders ONLY when `viewerOnlyMode` is true.** That single
fact explains why this control "has never rendered in any capture" — no capture was taken in
viewer-only mode. It is not missing markup; it is gated markup.

- volume trigger (const 90) — `viewerOnlyMode`
- Mute button (const 95/109) — `audioVolume > 0`
- Unmute button (const 96/110) — `audioVolume === 0` (the reference writes `0 == e.audioVolume`)
- the per-presenter list (const 97 contents) — `talkingUsers && talkingUsers.length > 0`
- the range input (const 94) — `[(ngModel)]="audioVolume"`, `change`/`input` → `adjustVol($event)`

### STATE THIS APP DOES NOT HAVE YET — add it before the markup, do not invent it

Checked with a search across `apps/room/src`; each of these is absent except where noted:

| needed                                    | status here                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `viewerOnlyMode`                          | **absent** (only inside a comment at `ScreenZoomControls.svelte:18`). **Source is now known — no guessing needed:** a URL query parameter named `vo`, read at bundle offset ~2595500 as `const s = new URLSearchParams(window.location.search)`, `_ = s.get("vo")`, then `_&&"1"===_&&(globals.viewerOnlyMode=!0)` and `_&&"2"===_&&(globals.viewerOnlyMode=!0,globals.viewerOnlyModeLimited=!0)`. Default `!1`. So `?vo=1` is viewer-only and `?vo=2` is viewer-only **limited**. Siblings read in the same block: `r`→`videoOnlyMode`, `co`→`chatOnlyMode`, plus `id`, `tok`, `sl`, `forcedStream`, `dscreen`, `pw`, `email`, `name`, `dlf`, `kt`, `changePasswordUID`. |
| `individualVolumeControls`                | **absent.** Read as `appService.globals.sessData.individualVolumeControls` (bundle offsets 1922707 and 2480727 — only two occurrences, both gating the per-user slider). It is a room setting, so check `apps/controller/src/lib/room-settings-schema.ts` before adding a field; if it is not there, that is a gap to REPORT, not a field to invent.                                                                                                                                                                                                                                                                                                                      |
| `audioMutedFor[userID]`                   | **absent.** Per-user mute preference; drives the checkbox `checked` and the Mute/Muted label swap.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `audioVolumeFor[userID]`                  | **absent.** Per-user volume; the `ngModel` of the const 115 slider.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `toggleTalkingPresenter(user)`            | **absent.** The checkbox `change` handler.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `adjustVolPres(event, user)`              | **absent.** The per-user slider `change`/`input` handler.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `talkingUsers`                            | **present**, `+page.svelte:930`, with `userID` and `mediaValue.name`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `volume`, `setMasterVolume`, `toggleMute` | **present**, `+page.svelte:861`, `:3467`, `:3503`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

**Do not fake any of the absent ones to make the markup render.** If a field's real name or source
cannot be established from the bundle or the room-settings schema, that is a gap: report it, and
write the console script.

### START HERE — the four sources still unread

Two of the six were sourced 2026-08-12 and are cited in the table above (`viewerOnlyMode` → the `vo`
query param; `individualVolumeControls` → `sessData`). **These four have NOT been read yet.** Each has
a known occurrence count in `apps/room/docs/source/main.d6d3c112b59b7d0d.js`, so none of them is a
gap — they are reads nobody has done:

| symbol                   | occurrences | what to establish                                                  |
| ------------------------ | ----------- | ------------------------------------------------------------------ |
| `audioMutedFor`          | 30          | where the map lives, how a key is set, what writes it              |
| `audioVolumeFor`         | 24          | same, plus its default for a user with no entry                    |
| `toggleTalkingPresenter` | 4           | the handler body — what it toggles and what it emits               |
| `adjustVolPres`          | 6           | the handler body — its arguments and what it applies the volume to |

Do these first, in one pass, and record each with its offset in this file before writing any state.
Reading them is roughly one Python slice each; guessing any of them re-opens the exact failure this
document exists to prevent.

### The two `room-sound-options` are NOT the same content

Both variants use `class="room-sound-options"`, which makes them look interchangeable. They are not:

- **nav variant** — the sound checkboxes (alert / QA / chat / non-trade). **Already built**,
  `+page.svelte:6904`.
- **overlay variant** — one row per talking presenter (`bSe`), described above. **Not built.**

Copying the nav one across would render the wrong control with the right class name.

### Where it goes

`apps/room/src/lib/components/ScreenTabs.svelte:249` currently renders:

```svelte
<div class="zoom-controls-container position-relative">
  {@render controls()}
</div>
```

Only one child. The trigger and the menu are the two that are absent.
`apps/room/src/lib/components/ScreenZoomControls.svelte` builds the zoom buttons (const 89) and
documents the same const numbering in its header — read it first; it is the model to follow.

### Definition of done

1. Markup matches the consts above attribute-for-attribute, in the same ORDER.
2. A contract test that reads the BUNDLE for its expectations rather than transcribing them — the
   pattern is `apps/room/src/lib/ngb-tooltip-placements-contract.test.ts`.
3. **Negative controls run at least once**, and reported: change `>50` to `>=50` and watch it go red;
   same for `<4`/`<=4`; same for the muted/unmuted span swap.
4. **A real render.** Extend or copy `apps/room/scripts/verify-tooltip-placements.mjs` — it drives
   real Chromium via `@playwright/test` resolved from `apps/controller`, strips types with Node's own
   `stripTypeScriptTypes` (no bundler), loads `css/complete-app-styles.css`, and exits non-zero on
   mismatch. Assert the icon at `audioVolume` = 0, 4, 5, 50, 51, 100.
5. `pnpm --filter room check` clean, the changed tests green, prettier clean.
6. Svelte MCP: `list-sections` → `get-documentation` → write → `svelte-autofixer` until clean.
7. `CHANGELOG.md` gets a dated+timed entry; the `TODO.md` row is REMOVED, not struck through.

---

## EVERYTHING ELSE UNDONE, EXPLICITLY

Full text for each is in `TODO.md`. Severity and what actually blocks it:

| #     | what is undone                                               | what it needs                                                                                                                                                                                                                                                                         |
| ----- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P** | `services/**` mirror diverged; this copy is ahead by 8 files | Promotion moves files OUT of this repo, which the owner's standing rule forbids. Re-seal per `ops/backend-import-provenance.md` and `apps/room/TODO.md` entry 2 when it happens.                                                                                                      |
| **Z** | `pnpm test` red at step 2                                    | Two of three causes fixed. Third is P surfacing as `expected 98, got 99` — **do not silence it**; bumping the count claims an import that never happened. Separately `evidence:verify` needs the 45 MB `evidence-dumps/` tree from `new-room-control` (pull direction is sanctioned). |
| **Q** | WordPress plugin never run in a live WordPress               | PHP is proven (8.3.33, golden token minted by the plugin's own functions). Checklist: `integrations/wordpress/STAGING-TEST.md`, §6 is the closing step.                                                                                                                               |
| **R** | Screenshare quality rows 6 and 8                             | Both need `getDisplayMedia` with a real desktop + a real member. Procedure: `apps/room/docs/MEASURE-SHARE-QUALITY.md`. Headless returns Chrome's synthetic gradient, which compresses too easily to show anything.                                                                    |
| **S** | Login page                                                   | Owner said ask Will. Nothing investigated; deliberately no problem statement, because writing one from guesswork produces a fix nobody asked for.                                                                                                                                     |
| **G** | Postgres host under real volume                              | Pressure is sustained CONNECTIONS from long-lived rooms, not compute.                                                                                                                                                                                                                 |
| **H** | Production topology: separate media plane from app tier      | What is deployed is a 5-day TEST topology.                                                                                                                                                                                                                                            |

---

## THINGS THAT ARE DONE — do not "fix" them back

- **Tooltips are finished.** Every placement (`left`/`top`/`bottom`/`top-right`/`auto`), static and
  bound, derived from the reference's own `Coe` table and `koe` function, rendered and measured in
  real Chromium (`pnpm --filter room verify:tooltips`, 6/6).
- **Popper's collision pass is deliberately not reproduced.** flip receives `fallbackPlacements`
  AFTER `shift()` removed the primary, so for a fixed placement it is `[]`, and `[] || …` is `[]`.
  `preventOverflow` is a no-op upstream. Proven, pinned, and recorded in `TODO.md` under "Not gaps".
- **The screen tabs' `tooltip=` attributes bind to nothing.** There is no `[tooltip]` directive in
  the bundle. They are inert; the hover text there is the native `title=`.
- **Top/bottom tooltips really are ~12.8px taller than left ones**, because the reference's own sheet
  still carries the Bootstrap 4 block and both generations spell that direction `top`.
