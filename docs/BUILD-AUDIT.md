# Auditing a feature before accepting it as done

Written 2026-08-15. Applies to any feature built from a spec in `docs/decoded/`, whether built by an
agent or by hand.

**The rule this exists for:** a build report is a CLAIM. Compiling is not evidence, a passing test is
not evidence that the test can fail, and an agent saying "verified" is not verification. Every line
below is a check somebody must personally execute.

Every item is derived from a real failure in this repository, not from a template.

---

## 1. Before reading a single line of the diff

- [ ] **`git status` — is the working tree only what was asked for?** A build that also edited
      unrelated files did something nobody reviewed.
- [ ] **Did it modify the spec it was built from?** If `docs/decoded/*.md` changed, the build may
      have edited the goalposts to match what it produced. Read that diff first.

## 2. The spec, line by line against the code

- [ ] **Wire command names, character for character.** Not "looks right" — grep the built code for
      each literal and compare to the spec.
      *Why: `swingAlertMsg` is the request, `newSwingAlertMsg` is the response. The obvious reading
      is backwards, my own first spec had it wrong, and building from the wrong one produces a
      command the server silently rejects.*
- [ ] **Every placeholder, label and title string is VERBATIM**, including leading and trailing
      spaces. `" Long "` is not `"Long"`.
- [ ] **Input types are the reference's**, not the improved ones. `type="text"` on a price field
      stays `type="text"` — a numeric input changes keyboard, validation and locale behaviour.
- [ ] **No invented controls.** Diff the rendered control list against the spec's. Anything present
      in ours and absent from the spec is INVENTED and must be removed or justified in a comment.
      *Why: this repository has shipped a dropdown item with no handler and a menu entry with no
      reference. Both rendered perfectly.*
- [ ] **Comparators and formatters match the reference's behaviour**, including the edge cases the
      spec calls out — ties returning 0, a limit of 0 returning an empty list, and so on.

## 3. Multi-tenancy — non-negotiable

- [ ] **Every database query carries the room predicate.** Read each one. A missing
      `roomShortCode` is a cross-tenant read, which is the failure mode this whole codebase is
      shaped around.
- [ ] **Authority is decided on the server from data the server owns.** No client-asserted role.
- [ ] **Entitlement gates render NOTHING when false**, not hidden markup. Verify by rendering with
      the flag off and reading the output.

## 4. Run it yourself. Do not read a transcript.

- [ ] **`rm -rf .svelte-kit && pnpm exec svelte-kit sync` FIRST**, then `svelte-check`.
      *Why: a stale `.svelte-kit` produced a green check across 1038 files while six real errors
      existed. A green check on a stale directory is not a green check.*
- [ ] `pnpm run lint` — clean.
- [ ] Run the new test file yourself.
- [ ] **Break one assertion yourself, watch it go red, restore it.** A test that has never failed is
      not known to be able to fail.
- [ ] `prettier --check` the new files.

## 5. Counting and searching

- [ ] **Never conclude from `grep -c` on a minified bundle.** It counts LINES; the bundle is one
      line, so every answer is 1 or 0. Use python `.count()`.
- [ ] **Never conclude absence from a search alone.** Open the region and read it. "Not in the
      capture" has been reported here when the capture was simply older than the feature.
- [ ] **Parse JSON, never regex it.**

## 6. Before writing the report

- [ ] **Everything stated as fact was personally executed.** Anything else is labelled
      **unverified** — including anything an agent claimed and I did not re-run.
- [ ] **State what was NOT checked.** "I ran the three tests covering this change; I did not run the
      full gate because nothing else was touched" is a complete and honest report.
- [ ] **Rule out your own tooling before reporting a failure.** Every bug in this session that was
      not in the original code was mine, and each one sent the owner looking at working code.

---

## The five failures of 2026-08-14/15, each of which produced a line above

| what happened | the line it produced |
| --- | --- |
| `grep -c` on a one-line bundle returned 1/1/1 for true counts 2/3/1, and nearly caused a correct agent report to be dismissed | §5 |
| A stale `.svelte-kit` gave a green `svelte-check` while six real errors existed | §4 |
| `/v5/` returning 404 was written up as "v5 does not exist" — a narrow measurement stated as a broad conclusion | §6 |
| Instructions told the owner to create a server he already had, because nothing checked first | §1 |
| `newSwingAlertMsg` was recorded as the create command; it is the response | §2 |
