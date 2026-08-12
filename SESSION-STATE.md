# Session state — 2026-08-12

Everything this session established, committed and left open. Written to disk because it spans
more context than one window holds. Read this first; it points at everything else.

---

## 1. Where the tree is

```
main                                  f73ea57   unchanged all session
viewer-only-mode-and-volume-dropdown  e43928e   PR #3, OPEN, MERGEABLE, 12 commits, all pushed
audit/match-ledger                    232017c   docs/MATCH-LEDGER.md only, cut from main
```

Working tree clean. Nothing merged. Nothing pushed to `main`. `services/**` never edited.

### The 12 commits on PR #3

| commit | what |
| --- | --- |
| `6c9a25b` | viewer-only mode + both volume dropdowns |
| `a0a7385` | CHANGELOG: the icon fix was a different glyph (`\f6a9` vs `\f026`), not a near class name |
| `f9e1890` | navbar + sidebar gated on the three modes; `mt-0` bound |
| `324b331` | TODO row V's second clause corrected; the one v4 string the room carries |
| `d3e1c49` | the viewer-only harness can now fail on the navbar fix |
| `05d6b0b` | `hideChatAlerts` and `hidePresentation` — one flag each, plus the settings that feed them |
| `a10b3af` | the gutter double-click does something now |
| `1f9eb17` | `disableCopy` and push-to-talk — three host bindings never bound |
| `06411b6` | TODO bookkeeping |
| `3bee54e` | `isMobileScreen` + the K4e mobile layout, and the CSS rule that was deleting it |
| `76b180c` | repaired a second pre-existing red test |
| `e43928e` | provenance seal: two more path bugs, the count split, the manifest NOT silenced |

53 files, ~5,200 insertions since `main`.

---

## 2. What is verified, and by what

- **Room unit suite: 748 tests, 70 files, green.** `npx vitest run` in `apps/room`.
- **`svelte-check`: 0 errors, 0 warnings**, 972 files.
- **Prettier clean.**
- **Renders:** `verify:screen-volume` 8/8, `verify:viewer-only` 4/4, `verify:tooltips` 6/6,
  `verify:mobile-layout` 3/3. PNGs + `measurements.json` under `apps/room/evidence-*/`.
- **Provenance seal:** imported file count (98) and path-list SHA-256 pass **for the first time**.

### What is NOT verified

- **The manifest SHA-256 in `verify-backend-provenance.mjs` fails.** Expected `4c303601…`, got
  `f1a8493f…`. That check has never executed before, because the read it depends on pointed at a
  directory that does not exist. The mismatch is either real content drift in an imported file or a
  pin computed at import time and never validated. **Do not re-pin it** — that destroys the first
  true signal this seal has produced. It needs a per-file diff against the source (TODO row P),
  which means moving in a direction only the owner can authorise.
- **`evidence:verify` (step 4)** needs the full 45 MB `evidence-dumps/` tree from
  `new-room-control/`. Pulling it is one command in the sanctioned direction; committing 45 MB is
  the owner's call.

---

## 3. The audit — `docs/MATCH-LEDGER.md` (branch `audit/match-ledger`)

Component-by-component proof that this app matches the reference. Nothing is a claim without a
`file:line` citation on **both** sides.

**Scale, measured:** 52 reference components in `apps/room/docs/source/components/` (194 files,
3.3 MB). 50 files in `apps/controller/docs/reference/` (45 pieces + 5 parts, 3.3 MB) — **3 ever
opened**. Ours: 21 Svelte components, 80 lib modules.

**`app-room`: reference side COMPLETE.** All 8,231 lines of `component.css`, `render-helpers.js`,
`compiled.js`, `full.js`, read in full. `full.js:1-1825` is byte-identical to `render-helpers.js`;
the unique content is `1826-4115`.

- 15 items matched with citations on both sides
- 24 gaps confirmed by occurrence count — **13 of them are now implemented on PR #3**
- Our side read to 3,320 of 9,947, with **10 divergences**, every one declared in the code

**Remaining for `app-room`:** linear read of `+page.svelte` 3,320–9,947, **on the viewer-only
branch**, for divergences the code does not declare.

**Remaining overall:** 51 of 52 components untouched, plus the controller's 50 reference files.

---

## 4. Findings that changed other work

- **The navbar/sidebar/`mt-0` defect.** Nodes 3 and 4 of `app-room`'s root template are gated on
  `videoOnlyMode || chatOnlyMode || viewerOnlyMode` (`full.js:4043-4059`) and the root div binds
  `KAe = (t,n) => ({'push-wrapper': t, 'mt-0': n})` (`:4029-4039`). None were bound. With
  `.wrapper{margin-top:49px}` and `.navbar{height:49px}` in the scoped sheet, those are ONE defect
  with three signatures — and it is what made the branch's `vh-100` overflow by 49px. Fixed in
  `f9e1890`, measured in `d3e1c49`.
- **A CSS rule of ours was deleting the mobile presentation area.**
  `@media (max-width: 900px) { .vertical-gutter, .presentation-box { display: none } }` in
  `app.css` — ours, not captured, arrived unattributed in `cbfb4b9`. The captured 900px block holds
  only Files-pane font sizes. The reference's phone layout LEADS with the presentation (`K4e` node
  1, `render-helpers.js:1815`). Found by rendering, removed in `3bee54e`.
- **TODO row V was wrong.** `toggleTalkingPresenter` (`full.js:2354-2371`) and `adjustVolPres`
  (`:2610-2631`) both call `mediaSoupService.startListeningToPresenter` /
  `stopListeningToPresenter`. Per-presenter mute DOES reach the SFU upstream; the limit is our
  signalling, not the design. Corrected in `324b331`.
- **`roomV4Link`** — `full.js:1925` is `window.location.href.replace('.com/', '.com/v3/')`. Added
  to `v4.md` and `v5.md`. Still no `useV3/4/5` anywhere in the bundle.
- **Three instances of one path bug**, not one, in `verify-backend-provenance.mjs`. Two were
  invisible because the count check threw first.

---

## 5. Corrections issued against my own work

Logged rather than quietly patched, because each one nearly became a false finding.

1. **`archivesAvailableTo()` reported as absent. It is not.** `roster-gates.ts:54`, used at
   `+page.svelte:1337`.
2. **`f9e1890` broke a contract test and I reported it verified.** `dump-contract.test.ts`
   asserted the wrapper's ternary; binding a second class made a ternary impossible. I ran
   `svelte-check` and prettier and not the suite. Found and repaired in `76b180c`.
3. **`audit/match-ledger` is cut from `main` and predates PR #3.** Everything read past line 3,320
   on that branch was the pre-fix file (`function showPrivateChat`: 0 occurrences there).
4. **I typed a placeholder SHA-256 into `LOCALLY_AUTHORED`** before computing the real one. Caught
   and replaced from `shasum`. It should never have been typed.
5. **My handoff prompt said "work on the room."** Wrong — `hideChatAlerts`, `isChatOnlyRoom` and
   `disableCopy` are controller settings that must be marked `wired: true` and plumbed through
   `room-config.ts` to reach the room at all. The count moved 43 → 46 of 269.

---

## 6. Traps that have each cost time

1. **The shell's `grep` is broken** — aliased to ugrep, returns nothing for patterns that plainly
   match. Use `/usr/bin/grep`, always with a control that must produce hits.
2. **BSD `sed` has no `\|` alternation.** It fails silently and returns the input.
3. **Check out the right branch before reading `src/`.** The decoded reference tree is identical
   everywhere; ours is not.
4. **A harness can pass a case it does not measure.** `verify-viewer-only-layout.mjs` had 0
   occurrences of `room-sidebar`, `mainAppNav` or `mt-0` while returning 4/4. Grep the harness for
   the element before trusting its green.
5. **Evidence is READ, never searched.** Locating with a tool is fine; concluding from its output
   is not. Proof: divergence 10 in the ledger carries no marker phrase a search would find.

---

## 7. What to do next, in order

1. **Rewrite TODO row Z.** Causes 1–3 are closed; the manifest SHA-256 is the live one. The row
   still describes the old state.
2. **Decide the manifest mismatch** (TODO row P). Per-file diff against the source. Owner's
   direction needed.
3. **Consider splitting `e43928e` off PR #3.** It is the PR's stated blocker but unrelated to
   viewer-only mode.
4. **Finish `app-room`'s reverse pass** — `+page.svelte` 3,320–9,947, on the viewer-only branch.
5. **The 11 remaining `app-room` gaps** in the ledger — `appVisibilityChange`, Tawk, the `hideChat`
   handler, `pollModalCompHolder`, `initPMDrag`, `muteAllNonAdmins`, `calculateDuplicates`, the
   `.alert-chat-box` hover, the `windowClosing` postMessage, join/leave beeps, `stopRecMsg`'s
   `Notification`.
6. **`app-presentationarea`, then `app-screenshare-view`** — both already have anchored const
   mappings. Then the other 49, panes before modals. Then the controller's 50 reference files.

---

## 8. Standing rules

Evidence is read, never searched. If it cannot be found it is not invented — say so, write it into
`TODO.md` under Evidence gaps, name every file already read. The Svelte MCP is mandatory on every
`.svelte` change (`list-sections` → `get-documentation` → write → `svelte-autofixer` until clean).
Test what changed; the full gate runs once before a push or merge. A test that cannot fail is worse
than no test — run every negative control once. Comments are the unit of work; never shorten them,
and never put template syntax inside one. Rule out your own tooling before reporting a failure.
Re-read your own diff before saying done. `services/**` is a mirror. Commit when asked; branch
before touching `main`. `CHANGELOG.md` gets a real dated and timed entry per finished item and the
matching `TODO.md` row is removed, not struck through.
