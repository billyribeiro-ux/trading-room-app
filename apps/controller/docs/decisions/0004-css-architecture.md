# 0004 — Where CSS lives: global sheets vs component `<style>`

**Status:** accepted, 2026-08-09
**Context:** raised by the owner — *"one of Svelte's main advantages is to be able to write css on its
file without interfering with the main css… built for the next 10 years, not 10 minutes."*

---

## The evidence

Read from the official Svelte documentation on 2026-08-09, not from memory:

1. **Component `<style>` is scoped by default.** Svelte adds a hash class (`svelte-123xyz`) to
   affected elements, and *"styles will not apply to any elements on the page outside the component
   in question."*
2. **Scoped selectors get a specificity increase of 0-1-0**, from the scoping class. The docs are
   explicit about what this buys: *"a `p` selector defined in a component will take precedence over
   a `p` selector defined in a global stylesheet, **even if the global stylesheet is loaded
   later**."* Where the scoping class has to appear more than once it is added as
   `:where(.svelte-xyz123)` so specificity does not keep climbing.
3. **`@keyframes` are scoped too**, by the same hash, and escape via a `-global-` name prefix.
4. **`:root` custom properties in a global stylesheet are endorsed, not tolerated**: *"It's common to
   define custom properties on the `:root` element in a global stylesheet so that they apply to your
   entire application."*
5. **Styling a child component goes through CSS custom properties first**; `:global` is the fallback
   *"if this is impossible (for example, the child component comes from a library)"*.
6. **`:global {...}` blocks** exist for groups, and the nested form is preferred over a trailing
   `:global` selector.
7. **Current best-practice list** also says: prefer clsx-style arrays/objects in `class` over the
   `class:` directive, and use `{@attach ...}` over `use:action`.

Point 2 is the one that decides most of this document, and it is the opposite of the usual
assumption that global CSS beats component CSS.

---

## The decision

**Three tiers, and a rule for which tier a new style belongs in.**

### Tier 1 — `:root` design tokens, global

`--acc-ink`, `--btn-info-bg`, `--acc-input-border` and the rest stay in `account.css`. They are
measured values read out of the reference captures with the element named beside them, they are used
by everything, and the docs endorse exactly this. **A colour used in more than one component must be
a token, not a literal**, so a change is one edit rather than a search.

### Tier 2 — the Bootstrap transcriptions, global, and deliberately so

`account.css`, `public.css` and `manage.css` are **transcriptions of Bootstrap 3.1.1 and the
reference's own theme**, not application styling. `.acc-panel`, `.acc-input`, `.acc-btn`,
`.pub-root .button` and their neighbours are framework primitives shared across dozens of
components.

They stay global because that is what they are. Copying a Bootstrap grid into every component that
uses a column would multiply one source of truth into thirty, and — specific to this project — it
would break the evidence trail: each of those values is pinned to a capture, and the audit gates
(`verify-manage-styles.mjs`, `verify-breakpoints.mjs`, `verify-home-fidelity.mjs`) read these files.

**Their manual `.acc-body …` / `.pub-root …` prefixes are a hand-rolled version of what Svelte's
scoping does automatically**, and they are the direct cause of `TODO.md` item J: a page rendered
under the wrong ancestor, so none of the rules matched and every field came out at twice its width.
That is the cost of tier 2, it is accepted for transcribed framework CSS, and it is the reason for
the rule below.

### Tier 3 — component `<style>`, the default for everything else

**Anything that exists for one component belongs in that component's `<style>` block.** Scoped
automatically, higher specificity than the global sheets regardless of load order, and structurally
incapable of leaking.

`PasswordReveal.svelte` is the worked example already in the tree: it needs `pointer-events: auto`
to undo `.acc-feedback`'s `pointer-events: none`, and that rule lives in the component, where it
cannot reach anything else.

---

## The rule for new work

> **A style goes in a component `<style>` block unless it is a design token or a shared framework
> primitive used by two or more components. When in doubt, start it scoped — promoting a rule to a
> global sheet later is a copy-paste; demoting one is an archaeology exercise.**

Three corollaries:

- **Nothing NEW may depend on ancestor-prefix scoping.** If a rule needs `.acc-body` above it to
  work, it is either a tier-2 transcription or it is in the wrong place. Item J is what that costs.
- **`:global(...)` requires a comment saying why**, naming the thing outside the component that it
  has to reach. It is an escape hatch, and an uncommented one reads as an accident.
- **Parent → child styling uses custom properties**, per the docs, not `:global` reaching into a
  child. `:global` for that is reserved for third-party components, of which this app has none.

---

## What this does NOT mean

It does not mean migrating `account.css` into components. That sheet is a pixel-pinned transcription
whose values are the evidence, and rewriting it would destroy the thing that makes this
reproduction checkable while changing nothing a user sees. **This decision governs where NEW styles
go, and it is applied opportunistically to old ones when a file is being edited for another
reason** — not as a migration project.

---

## Known violation, recorded rather than left implicit

`.acc-success` was added to `account.css` on 2026-08-09 and is used by exactly one page
(`/forgot-password`). By the rule above it should have been a scoped rule in that component. It is
left in place for now because `password-reset-pages.test.ts` asserts it by reading `account.css`,
and moving it is a change to a file another session is editing — but it is the first thing to move
when that page is next touched, and it is written down here so it is a decision rather than an
oversight.

---

## Verification

Partly automatable, and the honest split matters more than a claim of full coverage.

**Checked by a gate today:**

- `scripts/verify-breakpoints.mjs` — `public.css` must carry exactly the thresholds 767/768/991/992/
  1200. Any new global rule that introduces a breakpoint fails it. (This is what forced the item I
  additions to be fluid with no `@media` block at all.)
- `scripts/verify-manage-styles.mjs` and `scripts/verify-home-fidelity.mjs` — pin the transcribed
  values, so a tier-2 edit that drifts from the capture is caught.
- `src/lib/chrome.test.ts` — pins which shell each page renders in, which is what makes the tier-2
  ancestor guarantee real rather than assumed.

**Checked at review, not by a script:**

- whether a new rule belongs in tier 2 or tier 3. That is a judgement about how many components need
  it, and no script can see the intent.
- whether a `:global(...)` is justified. The comment requirement makes it visible; a reviewer still
  has to read it.

**Not checked, and deliberately not claimed:** there is no gate that fails a build for putting a
one-component rule into `account.css`. Writing one that distinguishes that from a legitimate shared
primitive would produce false positives on a 1,900-line transcription, and a gate people learn to
override is worse than a documented rule. `.acc-success` above is exactly this case, and it is
recorded rather than silently permitted.

## SSOT sections affected

`docs/ENGINEERING-SSOT.md` styling guidance, if and when it gains one. No existing section changes:
this decision adds a rule for new work and explicitly does not restate the transcription policy.

## Consequences

- New components get a `<style>` block and no entry in any global sheet. This is cheaper to write,
  impossible to leak, and needs no ancestor guarantee.
- The global sheets stop growing except for genuinely shared primitives, so the item J failure mode
  shrinks over time rather than spreading.
- Reviewers get one question to ask of any new rule — *"is this a token, a shared primitive, or one
  component's business?"* — with a default answer for the last case.
