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

Commit and push only when asked. **`services/**` is authored HERE and this repository is its
authority** — corrected 2026-08-29. This line used to read *"`services/**` is a mirror — changes
there are lost on sync"*, which is the exact sentence `CLAUDE.md` records as **false and cost real
time**: `apps/controller/scripts/verify-backend-provenance.mjs:97-118` searched for a sync in either
direction, found none, and records the owner confirming on 2026-08-12 that the siblings are
reference only. Edits there are governed, not provisional — re-pin the file in that verifier and
add a CHANGELOG entry saying why.

---

## ITEM U — the zoom-controls volume dropdown (**BUILT 2026-08-12**; read the corrections below)

### STATUS — built, and what it is made of

| file                                                | what it is                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------- |
| `apps/room/src/lib/screen-volume.ts`                | the arithmetic: icon thresholds, both preference transitions              |
| `apps/room/src/lib/components/ScreenVolumeControl.svelte` | consts 90-97 and 106-115, attribute for attribute                   |
| `apps/room/src/lib/components/ScreenZoomControls.svelte`  | gains a `volume` snippet slot, in the captured child order          |
| `apps/room/src/routes/+page.svelte`                 | `viewerOnlyMode` (the `vo` parameter), the preference maps, the handlers  |
| `apps/room/src/lib/screen-volume.test.ts`           | 17 behaviour tests                                                        |
| `apps/room/src/lib/screen-volume-contract.test.ts`  | 13 tests whose expectations are READ from the decoded tree at runtime     |
| `apps/room/scripts/verify-screen-volume.mjs`        | real Chromium, six volume values, exits non-zero on mismatch              |

### FOUR CORRECTIONS — this document was wrong, and the decoded tree is what corrected it

Everything below was found by reading `apps/room/docs/source/components/app-presentationarea.*` and
`…/app-room.*` rather than the minified bundle. **Read those files, not byte offsets.** They are
line-numbered, and every citation in this section is one you can open.

1. **The two `room-sound-options` are a SUPERSET and a SUBSET, not different content.** This
   document said the nav variant held "the sound checkboxes" and the overlay variant held the
   presenter rows. The nav variant holds **both**: `app-room.render-helpers.js:1224-1226` renders
   `b4e` — the identical per-presenter row plus a trailing `hr` — and *then* the six checkboxes at
   `:1226-1279`. So `+page.svelte`'s navbar dropdown is INCOMPLETE: it is missing the presenter
   rows. Recorded in `TODO.md`; not fixed under item U.
2. **`mute()` / `unmute()` differ between the two components.** `app-presentationarea.compiled.js:923-933`
   sets `doNotDisturbOn` and nothing else. `app-room.compiled.js:807-823` also sets
   `preferences.subtitles` and drags the background music volume with it. Ours had only the second.
3. **The navbar's third icon is `fa-volume-off`, not `fa-volume-mute`.** `app-room.compiled.js:1696`
   is `[1,'fas','fa-2x','fa-volume-off']`; `+page.svelte:6835` renders `fa-volume-mute`. A
   pre-existing one-word divergence in already-built code — recorded in `TODO.md`, not changed here.
4. **`individualVolumeControls` was STORED but not TRANSPORTED.** The setting has always existed in
   the controller (`room-settings-schema.ts:254`, the type at `:720`, and the manage page's own
   editor at `apps/controller/docs/reference/parts/02-baseline-720-1439.md:2221` —
   `sess.individualVolumeControls`, "Individual Volume Controls?", captured "No"). What did not
   exist was any way for it to reach the room: it was `wired: false`, absent from
   `ROOM_VISIBLE_SETTINGS`, and absent from `RoomSessionSettings`. This change added the transport
   and the consumer together and regenerated the schema (43 wired, verifier green).

### What is already true

There are **TWO** `#dropdownVolume` triggers in the reference. This is why the thing looked missing
for weeks.

| variant                                                                                          | const        | status                                                             |
| ------------------------------------------------------------------------------------------------ | ------------ | ------------------------------------------------------------------ |
| `["id","dropdownVolume","data-bs-toggle","dropdown",1,"nav-link","d-flex","align-items-center"]` | main nav     | **BUILT — do not touch.** `apps/room/src/lib/components/RoomNavbar.svelte:663` |
| `["id","dropdownVolume","data-bs-toggle","dropdown",1,"btn","btn-sm","btn-dark"]`                | zoom overlay | **BUILT — corrected 2026-08-29.** `apps/room/src/lib/components/ScreenVolumeControl.svelte:113` renders `<button type="button" id="dropdownVolume" data-bs-toggle="dropdown" class="btn btn-sm btn-dark">`, attribute for attribute. This cell said **MISSING — build this** while the section heading forty lines above it said **BUILT 2026-08-12**; the heading was right |

Ours is genuinely the nav variant, not a near-miss: `fa-2x`, `fa-volume-mute` and `mainNavItem` each
occur **exactly once** in the bundle, and `RoomNavbar.svelte` has all three.

### The evidence files — the DECODED tree, not the bundle

**Do not reconstruct any of this from byte offsets again.** It is already decoded, pretty-printed
and line-numbered:

| file                                                              | what is in it                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------ |
| `apps/room/docs/source/components/app-presentationarea.render-helpers.js` | `lSe` 237-263, `cSe`/`dSe`/`uSe` 264-272, `hSe` 273-289, `pSe`/`fSe` 290-311, `mSe`/`gSe` 312-317, `_Se` 318-348, `bSe` 349-385, `vSe` 386-388, **`CSe` 395-459** |
| `apps/room/docs/source/components/app-presentationarea.compiled.js`       | the const table at **1594-3027**, the handlers at **892-954**, the component's own CSS at **3290** |
| `apps/room/docs/source/components/app-room.render-helpers.js`             | the NAVBAR copy: `u4e`/`h4e` 983-1004, `_4e`/`b4e` 1066-1106, the dropdown 1143-1288, its gates 1424-1460 |
| `apps/room/docs/source/components/app-room.compiled.js`                   | the navbar's own handlers 775-823, its const table from 1285 |
| `apps/room/docs/source/components/manifest.json`                         | which byte range each of the 51 components came from, with SHA-256 |

The raw bundle is still SHA-256 pinned by `dump-contract.test.ts` and still must not be edited — but
nothing in item U needed it. The ONE fact that is not in the decoded tree is the `vo` query
parameter, because the parameter block belongs to the app service rather than to any component; it
is quoted below from the bundle and is the only inherited claim in this section.

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
| `individualVolumeControls`                | **CORRECTION 2026-08-12 — it is NOT absent.** It is already in `apps/controller/src/lib/room-settings-schema.ts:254` and on the type at `:720`, marked **`wired: true`**. Captured label is `Individual Volume Controls?` with helper `Individual volume controls for each Presenter`, captured value `No` (`apps/controller/docs/reference/parts/02-baseline-720-1439.md:2221`), and it is a real persisted `sess` field (`:734`). An earlier pass in this brief listed it as absent — that was wrong. Read it before adding anything.                                                                                                                                   |
| `audioMutedFor[userID]`                   | **absent.** Per-user mute preference; drives the checkbox `checked` and the Mute/Muted label swap.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `audioVolumeFor[userID]`                  | **absent.** Per-user volume; the `ngModel` of the const 115 slider.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `toggleTalkingPresenter(user)`            | **absent.** The checkbox `change` handler.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `adjustVolPres(event, user)`              | **absent.** The per-user slider `change`/`input` handler.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `talkingUsers`                            | **present**, `+page.svelte:930`, with `userID` and `mediaValue.name`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `volume`, `setMasterVolume`, `toggleMute` | **present**, `+page.svelte:861`, `:3467`, `:3503`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

**Do not fake any of the absent ones to make the markup render.** If a field's real name or source
cannot be established from the bundle or the room-settings schema, that is a gap: report it, and
write the console script.

### The four state sources — READ 2026-08-12, verbatim below

All four were read on 2026-08-12. Nothing here is inferred; offsets are into
`apps/room/docs/source/main.d6d3c112b59b7d0d.js`.

**`toggleTalkingPresenter(user)`** — offset 1977077 (and an identical copy at 2510885):

```text
toggleTalkingPresenter(e){const{userID:i,mediaValue:o}=e;
this.appService.globals.preferences.audioMutedFor[i]
 ?(delete this.appService.globals.preferences.audioMutedFor[i],
   this.mediaSoupService.startListeningToPresenter(e),
   this.appService.globals.preferences.audioVolumeFor[i]=100)
 :(this.appService.globals.preferences.audioMutedFor[i]={name:o.name},
   this.mediaSoupService.stopListeningToPresenter(e),
   this.appService.globals.preferences.audioVolumeFor[i]=0),
this.appService.setPreference("audioMutedFor",this.appService.globals.preferences.audioMutedFor),
this.appService.setPreference("audioVolumeFor",this.appService.globals.preferences.audioVolumeFor)}
```

**`adjustVolPres(event, user)`** — offset ~1976104:

```text
adjustVolPres(e,i){const{userID:o,mediaValue:s}=i,r=e.target.value,a=r/100;
this.appService.globals.preferences.audioVolumeFor[o]=r,
ii("[id^=msRemAudio-"+o+"]").prop("volume",a),
0==r&&(this.appService.globals.preferences.audioMutedFor[o]={name:s.name},
  this.mediaSoupService.stopListeningToPresenter(i)),
r>0&&this.appService.globals.preferences.audioMutedFor[o]&&(
  delete this.appService.globals.preferences.audioMutedFor[o],
  this.mediaSoupService.startListeningToPresenter(i)),
this.appService.setPreference("audioMutedFor",…
```

**What that establishes — the parts most likely to be got wrong:**

- **`audioMutedFor[userID]` is an OBJECT, `{name}`, not a boolean.** Every read of it is a truthiness
  check and unmuting is `delete`, not `= false`. Model it as a map to `{ name: string }` and delete
  the key; a boolean map will look identical in the template and be wrong at the persistence layer.
- Mute and volume are **one state, kept in step**: muting sets volume 0, unmuting sets volume **100**,
  dragging to 0 mutes, dragging above 0 unmutes. Both handlers do both halves.
- The slider's value is used as a **string** from `e.target.value`, stored raw in `audioVolumeFor`,
  and divided by 100 only for the audio element.
- The audio elements are selected by **`[id^=msRemAudio-<userID>]`** and set with `.volume` in the
  range 0–1.
- Both handlers persist through **`setPreference("audioMutedFor", …)`** and
  **`setPreference("audioVolumeFor", …)`**, and both call
  `mediaSoupService.startListeningToPresenter` / `stopListeningToPresenter` — so this is not local UI
  state; it changes what the SFU sends.

**RESOLVED 2026-08-12, one half built and one half recorded as a gap:**

- **`setPreference`** — not read, and not needed. This app's equivalent is `savePreference` in
  `+page.svelte`, which writes localStorage and POSTs `?/savePreference`; both handlers call it with
  the same two keys the reference passes to `setPreference`.
- **`startListeningToPresenter` / `stopListeningToPresenter`** — still unread, and now known to be
  UNREPRODUCIBLE on this wire rather than merely unread. `Commands` in
  `apps/room/src/lib/media/signalling.ts:322-404` is the whole command surface, and it has
  `resumeConsumer`, `closeConsumer`, `pauseProducer` and `resumeProducer` — **no `pauseConsumer`**,
  and `closeConsumer` cannot be undone without re-consuming from a `ProducerInfo` the page does not
  retain. So per-presenter mute is applied to the listener's own `<audio id="msRemAudio-{userID}">`
  element: the member hears the same thing, and the bandwidth saving is what is missing. `TODO.md`
  carries it with the two options for closing it.

### The two `room-sound-options` — CORRECTED 2026-08-12

Both variants use `class="room-sound-options"`, and the earlier text here said they held different
content. Read against the decoded tree, they are a **subset and a superset**:

- **overlay variant** (`app-presentationarea.render-helpers.js:420-422`) — `d(14,'div',97)` with a
  single child, `H(15, vSe, 2, 0)`: one row per talking presenter and nothing else.
- **nav variant** (`app-room.render-helpers.js:1224-1279`) — `d(50,'div',116)` holding
  `H(51, b4e, 3, 0, 'hr')` FIRST (the same presenter rows, plus a trailing `hr`, gated on
  `talkingUsers.length > 0` at `:1436`) and THEN the six sound checkboxes.

So copying the nav one across would render too much, and the nav one as built in this app renders
too little — it has the six checkboxes and no presenter rows. That gap is `TODO.md`'s, not item U's.

### THE REFERENCE DECODE TREE — 45 pieces and 5 parts, mostly unopened

`apps/controller/docs/reference/` holds **45 files under `pieces/` and 5 under `parts/`** — full
forensic decodes of the reference, written from real DOM captures with per-node paths, computed
styles and verbatim text. Only THREE have been opened so far
(`pieces/ptr1-P22-settings-advanced-cluster.md`, `pieces/ptr1-P29-angular-data-model.md`,
`parts/02-baseline-720-1439.md`), and each one answered a question that had previously been called a
gap needing a collector script.

**Read the relevant piece before declaring anything missing.** This tree, plus
`apps/room/docs/source/components/`, is where the answers have been every time.

### ALREADY-BUILT CHECK — done 2026-08-12, and how to redo it correctly

**Before building anything, check `new-room` and `new-room-control`.** Work has been done in those
repos before, and the standing rule allows pulling files FROM them INTO this one. Re-doing something
that already works there, or replacing it, is the expensive mistake.

For item U specifically this check was run and came back clean: none of `dropdownVolume`,
`toggleTalkingPresenter`, `audioMutedFor` or `viewerOnlyMode` appears in either repo's `.svelte` or
`.ts` files (58 and 60 files respectively). **So item U is genuinely unbuilt and is safe to build
here.**

**Use this method — the obvious one silently lies:**

```bash
find new-room -name "*.svelte" -not -path "*/node_modules/*" -print0 \
  | xargs -0 grep -lE "yourPattern"
```

`grep -rl "pattern" new-room --include="*.svelte"` returns NOTHING in this environment, for every
pattern, including ones that certainly match — this shell's `grep` is `ugrep` and the `--include`
form does not read the files. It produces a confident empty result that looks exactly like "not
found". **Always run a control first:** grep for a term that MUST exist (`script` in a `.svelte`
tree) and confirm you get hits. The first run of this check reported "not built in either repo" on
the strength of the broken form, and that conclusion was worthless.

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

### Definition of done — met 2026-08-12, item by item

1. **Markup matches the consts attribute-for-attribute, in the same order** — asserted by
   `screen-volume-contract.test.ts`, which parses the const table with the repository's own
   `scripts/lib/const-table.mjs` and takes each index from the render helper's own call site.
2. **A contract test that READS its expectations** — it reads the four decoded component files at
   runtime rather than the bundle, which is the change of source this document now insists on.
3. **Negative controls run and reported** — five, each red, then restored: `>50`→`>=50`,
   `<4`→`<=4`, `delete`→`= false`, the Mute/Muted span swap inverted, and the volume slot removed
   from the cluster. A sixth was run against the RENDER harness (`>=50` → 5/6, failing at 50).
4. **A real render** — `pnpm --filter room verify:screen-volume`: six volume values in real
   Chromium, **6/6**, with PNGs in `apps/room/evidence-screen-volume/`. It loads all five sheets
   `src/app.css` imports; loading only `complete-app-styles.css` reports four rules as missing and
   is a harness bug, not a finding. The woff2 faces do not load over `file://`, so the glyphs are
   fallback boxes — the layout and the branch selection are what the screenshots prove.
5. `pnpm --filter room check` — **971 files, 0 errors, 0 warnings**. Changed tests green (30).
   Prettier clean on every changed file.
6. Svelte MCP used: `list-sections` → `get-documentation` → `svelte-autofixer` (clean on both
   components).
7. `CHANGELOG.md` entry added; the `TODO.md` row for item U removed.

### What item U uncovered, and what closed it — 2026-08-12 13:45 EDT

Item U put `viewerOnlyMode` in this app for the first time. Reading the decoded tree for its other
consumers found seven bindings nothing drove and two defects in shipped code. All are now closed
except the SFU half; the full table is in `CHANGELOG.md` at 13:45. The short version:

- the navbar dropdown had no per-presenter rows (`app-room.render-helpers.js:1224-1225`), rendered
  `fa-volume-mute` where const 107 is `fa-volume-off`, and gated its background-music slider on
  SoundCloud alone where `:1434` gates on `scPlaying || mp3Playing || roomState.ytURL`;
- `viewer-only-screen-video` and `viewer-only-screen-tab` were STATIC classes in `ScreenPane`, so
  viewer-only geometry applied to every room, and `viewer-only-screen-zoom-controls` was applied by
  nothing at all;
- the main tab strip, the chat/alerts column and the private chat all ignored viewer-only mode.

**Still open, and it is a wire limit rather than an oversight:** the SFU half of per-presenter mute.
`TODO.md` V has the two ways to close it.

**The pattern worth keeping.** Every one of those was found by opening
`apps/room/docs/source/components/*` — the same decoded files item U was built from. Three of them
(`viewer-only-*`) were CSS rules already shipping in `css/complete-app-styles.css` and applied by
nothing, which is what a binding that was never ported looks like from the stylesheet's side: search
the applied sheet for classes nothing renders, and the decoded `ngClass` helper tells you what was
missing.

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
