# Working rules — each one earned by a specific failure

Written 2026-08-13. These lived in `TODO.md` until that file was stripped to what is actually left to
do; they were never to-do items, they are how to avoid repeating a day's worth of mistakes.

Every rule below cost at least one wasted turn. The failure is named in each, because a rule with no
recorded WHY gets "simplified" back into the bug it was preventing — which is the same argument
`CLAUDE.md` makes for this codebase's long comments.

---

## 1. A grep that returns nothing is evidence about the grep

`~/CLAUDE.md` already says it: **locating with a tool is fine, CONCLUDING from a tool's output is
not.** It was broken twice in one day, both times the same way.

**T2-18** was recorded as "not built: all three handlers are operations against media-relay
infrastructure for which this repository holds no endpoint." The whole console was built and wired to
three real form actions.

**T5-25** was recorded as "not built at all". Its endpoint existed with ten green tests.

Both came from grepping ONE component file for a marker string, finding nothing, and concluding the
feature was absent.

**Before acting on any "not built" note, check all four:** the component, the route tree
(`src/routes/**`), the form actions in the matching `+page.server.ts`, and `src/lib/**` tests. A
register that claims a built feature is missing sends the next person to write code twice.

---

## 2. An ABSENCE claim expires when the evidence grows, not when the code changes

`+page.svelte` said `ms-2` and `cursor-pointer` "have no rule in any stylesheet this repo holds".
That was TRUE when written — only the CSSOM captures existed then. `TIER1-fetched/styles.css`, the
raw sheet Chrome had re-serialised and 24 KB larger, was fetched later the same day and defines
`.cursor-pointer:hover { cursor: pointer }`.

Absence claims are the ones that rot, because nothing about the code changing will disturb them.
**Re-check every "there is no rule / no such thing" comment whenever new evidence lands.** The
stylesheets to re-check against are `TIER1-fetched/styles.css` and `theme.css`.

---

## 3. Never run a generator with its output suppressed

`node scripts/extract-manage-schema.mjs >/dev/null 2>&1` hid a ReferenceError. The script threw,
wrote nothing, and left the PREVIOUS output in place — which was then read as evidence that the fix
had not worked. Re-running with stderr visible showed the bug in one line.

**A failed regeneration is indistinguishable from a successful one when the file already exists.**
Run generators with stderr visible, and diff or check mtime if in doubt.

---

## 4. When a check disagrees with the data, the check is the suspect

A new help-shape comparison reported 52 mismatches against the settings schema. **All 52 were the
check's own fault** — it collapsed two distinct shapes into one bucket and stopped scanning at
`</p>`, missing every row whose helper sits outside the paragraph. The schema was right about all
267.

The tempting move — "the script says 52 rows are wrong, let me fix the data" — would have destroyed
correct evidence to satisfy a broken script. **A fresh check disagreeing with existing data is not
automatically the one that is right.**

The same day, in the opposite direction: `setting-help-shape-contract` objected when a genuine fix
moved a count 11 → 9. That time the test was right and the count was corrected **with the reason
recorded beside it**, rather than the assertion being loosened.

---

## 5. Do not word around the tally test

A register entry was written "**HALF CLOSED** … | OPEN — GEOMETRY ONLY |". The row's status was
correctly OPEN, but `evidence-gap-register-counts.test.ts` scans every cell with CLOSED winning, so
it counted the row closed and reported drift.

The test was right and the wording was wrong. **Do not fix a drift report by adjusting the tally to
match a mis-worded row** — reword the row. A row that is still open should not carry the token
CLOSED anywhere in it.

---

## 6. "Consistent with its neighbours" is a GUESS

The Extra Admin Users row's Actions cell was styled by inheriting the pattern its two captured
siblings use — `label > a`, measured on the badges Delete and the API-key delete. The fetched
template shows that row is a BARE anchor with an icon and no `<label>` at all. It is the one row on
the page that breaks its neighbours' pattern.

Inheriting was the right call while the row was unmeasured, and saying so was honest. It still
produced a difference. **When something is later captured, re-check anything that was inherited
rather than measured** — and label which is which at the time.

---

## 7. A rendered value is not the expression that produced it

The single most productive lesson of the day; it caught four separate defects:

- Four row icons carried `ng-show="false"` in the capture. All four INTERPOLATE — the captured room
  simply had both case-by-case settings off.
- The Select All label appeared to "drop its words" when checked. There are TWO spans; the second
  reads **Unselect All**.
- The badge submit buttons appeared to read "Add New Badge". They are `Add {{badges.text}}` — the
  text field happened to contain "New Badge" when the page was captured.
- A whole Stripe block was absent from every capture because `ng-if` REMOVES the element.

**A capture shows one evaluation of an expression. Read the source before recording a constant.**

---

## 8. Every contract test gets its negative control run

Not aspirational — it has caught real holes:

- Reverting the Select All fix left all 780 tests green. Nothing guarded it, because `allSelected` is
  client state that SSR always renders false. The guard moved to the component source.
- A test asserting `Out` is absent for an in-progress visit passed against a version that rendered it
  unconditionally, because it checked for a specific date and `formatLastLogin(null)` yields an epoch
  date — absent for the wrong reason.
- A test asserting the loader "no longer returns visits" passed while the loader returned them,
  because it matched `visits\s*:` and the key was written in shorthand.

**Change the thing the test guards and watch it go red. If it does not, the test is decoration.**

---

## 9. Do not push again until the work is finished — the backend gate restarts from zero

Owner instruction, 2026-08-14, in these words: **"from now on do not push anything that triggers the
backend CI until we're all done to avoid time delays."**

The mechanics that make it matter, and they are worse than "CI is slow":

- `backend-quality.yml` declares `concurrency: backend-quality-${{ github.ref }}` with
  `cancel-in-progress: true`. A second push **cancels the run in flight** and starts a new one. It
  does not queue, and it does not resume. Every push throws away whatever the previous run had
  already proved. Watched happen on 2026-08-14: run `31799962473` was cancelled mid-flight by a
  docs-only push and replaced by `31800376616`.
- The job compiles the Rust workspace, stands up two PostgreSQL clusters and rebuilds the API
  image. Its own header puts it at **~33 minutes**, with a 90-minute timeout.
- **On a branch whose diff already contains `backend-quality.yml`, choosing "safe" files does not
  help.** The scope step decides from the diff against the base, not from the last commit, and a
  change to that workflow is deliberately treated as a backend path so the gate proves changes to
  itself. So once the workflow is in the branch, a one-line README push runs the full 33 minutes.
- Any event that is not a `pull_request` — a push to `main`, a `merge_group`, a
  `workflow_dispatch` — skips the scope check entirely and always runs the full gate.

**So: accumulate commits locally and push once, when the work is actually done.** Committing is free
and loses nothing; pushing is the expensive act. This is the same argument as the batching rule in
`CLAUDE.md`, sharpened by having measured what a push actually costs here.

The exception is an explicit instruction to push now, which overrides this.
