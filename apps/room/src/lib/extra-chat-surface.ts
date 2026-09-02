/**
 * `app-extra-chat` — the captured facts about the SECOND chat column, and the ones it renders from.
 *
 * ## Why this module exists
 *
 * `ExtraChatPane.svelte` sits exactly at its `source-size-contract` ceiling, and the ratchet's own
 * rule is that the answer to that is an extraction rather than a bigger number. Every attribute
 * table below was decoded from ONE const array — `app-extra-chat`'s, at bundle byte **2,393,850** —
 * and each is quoted here in full beside the value it produces, so the component reads a named
 * constant and this file carries the citation. That is the trade the ratchet is designed to force,
 * and `+page.svelte`'s own entry describes it: *"moving an explanation to the code it explains is
 * the extraction itself."*
 *
 * **Read the tables against THIS component's array and no other.** `app-chat`'s numbering is not an
 * offset of this one — it carries a "Detach Chat" button at 53/54 that this column has no node for,
 * so index 56 there is the webinar tooltip and index 56 here is `[1,"users-count","me-1"]`. A const
 * number is only readable against the table it came from, and a comment in this component cited 56
 * for the webinar tooltip until 2026-08-31 for exactly that reason (`XCP-06`).
 */

/**
 * `XCP-01` — the composer holder's id, and the `Extra` suffix that was OURS.
 *
 * Const **25** is `["id","textAreaHolder",1,"d-flex","align-items-center","textSendDiv"]` —
 * byte-identical to `app-chat`'s — and this component's own stylesheet addresses it by that id at
 * byte **2,405,618**:
 *
 * ```css
 * #textAreaHolder{background-color:var(--textarea-bg);border-radius:8px;padding:5px;margin:5px}
 * ```
 *
 * The suffix `textAreaHolderExtra` was invented here for id uniqueness, and it cost this column
 * four things at once, none of them cosmetic:
 *
 * * `#textAreaHolder` (`app.css:394`) — the flex row, the 5px margin and padding, the 8px radius
 *   and the textarea background. The holder had none of them.
 * * `#textAreaHolder > .flex-fill` and `> .flex-fill > .flex-fill` (`:410`, `:415`) — the two 35px
 *   min-heights that stop the composer collapsing.
 * * `#textAreaHolder textarea` and `:focus` (`:420`, `:439`) plus all three `.darkTheme` rules
 *   (`:1410`, `:1414`, `:1421`). The field had no height, no colour, no background, no dark theme.
 *   `.textSendDiv` has NO rule in any stylesheet in this repository, so nothing covered for it.
 * * `#textAreaHolder { container-type: inline-size }` (`:476`), the container the two `@container`
 *   queries below it resolve against. **With no container ancestor a container query is false**, so
 *   both button sets rendered at every width — the four options AND the "+" that exists to reveal
 *   them — and the only rule still biting was `.composer-options-forced .composer-expand`, which is
 *   outside the queries. Pressing "+" hid "+" and revealed nothing, because nothing was hidden. A
 *   control whose only effect is to remove itself.
 *
 * **The duplicate id is the reference's own.** `app-chat`, `app-extra-chat` and `app-alert-qa-modal`
 * all use it, and this repository already carried it twice before this constant existed. It is safe
 * to reproduce because nothing resolves it in script — the only references anywhere in `src/` are
 * CSS selectors, this markup and one contract test; there is no `getElementById` or `querySelector`
 * for it. The FIELD ids stay distinct (`textAreaTxt` against `textAreaTxtExtra`), which is the
 * separation the reference itself makes and which `RM-16` shows is the load-bearing one.
 */
export const EXTRA_CHAT_COMPOSER_HOLDER_ID = 'textAreaHolder';

/**
 * `XCP-05`, first half — const **66**, the emoji trigger's popover configuration.
 *
 * ```js
 * ["placement","auto","container","body","autoClose","outside","popoverClass","popOverDiv",
 *  1,"textAreaBtns",3,"click","ngbPopover"]
 * ```
 *
 * These four were on the main column's trigger (`AlertChatArea.svelte`) and on the Q&A modal's, and
 * absent here — the same one-column-of-two omission `EMOJI-10` records for `popoverId`. They are
 * the popover's placement and its escape rule, not decoration: `autoClose: "outside"` is what
 * dismisses the picker on a click elsewhere, and `container: "body"` is what stops it being clipped
 * by the composer's own overflow.
 *
 * Lower-cased keys because they are written as plain HTML attributes here rather than as Angular
 * inputs, and the DOM lower-cases attribute names; `ngb-tooltip.ts` reads them in that form.
 *
 * **Applying this spread removed two `svelte-ignore` lines from the trigger, and that is expected
 * rather than a regression.** The compiler stops issuing `a11y_click_events_have_key_events` and
 * `a11y_no_static_element_interactions` once a spread is present, because it can no longer prove
 * the element carries no role — so the ignores suppressed nothing and
 * `svelte/no-unused-svelte-ignore` failed on them. Verified by removing them and re-running
 * `svelte-check`: 1,495 files, 0 errors, 0 warnings, and `eslint` clean on the file. The same
 * applies to the GIF trigger below.
 */
export const EXTRA_CHAT_EMOJI_POPOVER: Readonly<Record<string, string>> = {
  placement: 'auto',
  container: 'body',
  autoclose: 'outside',
  popoverclass: 'popOverDiv'
};

/**
 * `XCP-05`, second half — const **72**, the GIF trigger.
 *
 * ```js
 * ["ngbTooltip","Search for GIFs","placement","top","placement","auto","container","body",
 *  "autoClose","outside","popoverClass","popOverDiv","triggers","manual",1,"textAreaBtns",
 *  2,"font-size","12px",3,"click","ngbPopover"]
 * ```
 *
 * This trigger carried the font size and nothing else, so it was the ONE composer button in this
 * column with no tooltip at all while the emoji, image and RTE buttons beside it each had theirs.
 *
 * `placement` is written TWICE in that const, `top` then `auto`, and `auto` is what is reproduced:
 * the later value is the one Angular applies, and it is what `AlertChatArea` already resolved the
 * same const to. Recording the duplicate rather than silently picking is the point — a reader who
 * checks the table will find two and needs to know which one this is.
 */
export const EXTRA_CHAT_GIF_TRIGGER: Readonly<Record<string, string>> = {
  ngbtooltip: 'Search for GIFs',
  placement: 'auto',
  container: 'body',
  autoclose: 'outside',
  popoverclass: 'popOverDiv',
  triggers: 'manual'
};

/**
 * ## The measured gaps this column carries, and the one that stopped being one
 *
 * Recorded here rather than in the component because the component has no line to spare and because
 * each one is a fact about the captured surface, which is what this module is for.
 * `extra-chat-surface-contract.test.ts` measures every one so they cannot quietly stop being true —
 * and `EXTRA_CHAT_MEASURED_GAPS` below is the list a reader should trust, because it is asserted.
 *
 * There were three. `XCP-08` was built on 2026-08-31 and left the list; its measurement stays,
 * because what the button must look like is what a later edit can get wrong. `XCP-07` and `XCP-09`
 * are still `BLOCKED` rows in `docs/decoded/room-surface-audit-2026-08-30.md`.
 *
 * ### `XCP-08` — the "Play YouTube For All" button, BUILT 2026-08-31
 *
 * Kept in full below rather than deleted, because the measurement is what the next reader needs in
 * order to check the button still matches — and because the paragraph explaining why it could not
 * be built from inside the component is now the paragraph explaining how the gate works.
 *
 * `lMe` at byte **2,373,038** is this column's expanded button set, and it resolves five children.
 * The gates are at byte **2,373,334**: `O(2, canPostImages …)` image, `O(3, isPresenter …)`
 * **YouTube**, `O(4, canPostImages …)` GIF, `O(5, …enableRTE && …enableRTE && …isPresenter …)` RTE.
 * The third is `iMe` at byte **2,371,656** — const 68
 * `["data-bs-toggle","modal","data-bs-target","#play-youtube-modal",1,"textAreaBtns"]` wrapped
 * around const 71 `["ngbTooltip","Play YouTube For All","placement","left",1,"fas","fa-video"]`.
 * The main column draws it and this one does not, so a presenter can send a video to the room from
 * one chat column and not from the other.
 *
 * It could not be built from inside the component, and the reason is now the design. The
 * reference's span carries no click handler at all — it is a Bootstrap `data-bs-target` — and this
 * room's `Modal` is not Bootstrap-driven, so `AlertChatArea` reaches the modal host through an
 * `onopenmodal` prop the page supplies. Nothing in the `<ExtraChatPane>` call opened a modal, and
 * adding an optional handler and a branch here first would have been a prop with no caller, which
 * is the scaffolding rule this repository has already paid for once.
 *
 * The page passes it now, as `onyoutube={isPresenter ? () => modals.open('youtube') : undefined}`,
 * and the component renders the button `{#if onyoutube}`. **The presence of the handler IS the
 * gate**, which is the only shape consistent with the paragraph below: this column is handed each
 * entitlement's RESULT and deliberately not `isPresenter`, so a `boolean` prop beside a
 * `() => void` would have put one gate in two places and let them disagree. Both captured
 * attributes — `data-bs-toggle` and `data-bs-target` — are kept, exactly as the main column keeps
 * them: they are what the capture serves, and `onclick` is the substitution.
 *
 * ### `XCP-09` — this column has NO transcribed stylesheet at all
 *
 * `app-extra-chat` ships **5,818 bytes** of component styles at bundle byte **2,400,462**:
 * `.chatTabs` and its five `.nav-link` states, `.counterBadge`, `.typing-indicator-container`,
 * `.users-count`, `.users-typing`, `.txt-area` and its focus ring, `.textAreaBtns` and its hover,
 * `.textAreaBtnsCol`, `#textAreaHolder`, `.chatDisabled`, `.webinarMode`, `.roomLog`, and the whole
 * Giphy popover. `src/lib/styles/captured-runtime-components.css` contains the string
 * `app-extra-chat` **zero times**.
 *
 * The reason is in the generator's INPUT rather than the generator: `css/complete-app-styles.css` —
 * whose SHA-256 is the one that generated file's header pins — contains `extra-chat` zero times
 * too. That capture was taken from a room with `preferences.extraChatColumn` off, so Angular never
 * mounted this component and never injected its styles into the document being captured.
 *
 * The unblock is a re-capture of `complete-app-styles.css` from a room with the second column on,
 * followed by `pnpm css:sync-captured`. It is NOT a hand-edit: `AGENTS.md` forbids editing a
 * generated artifact, and that sheet's own header says so on line 9. It is also why `XCP-01` above
 * matters far more than an id normally would — with the component sheet missing, `app.css`'s
 * `#textAreaHolder` family is the only thing left that styles this composer.
 *
 * ### `XCP-07` LEFT THIS LIST on 2026-09-02, and it left for the reason `XCP-08` did
 *
 * `("ngClass", ct(13, B3e, preferences.smallImagePreview && preferences.defaultImagePreview))` at
 * byte **2,400,160**, where `B3e` at byte **2,367,305** is `t => ({"chat-uploaded-img-sm": t})`.
 *
 * It sat here as *"refused rather than missing"* because `chat-uploaded-img-sm` has no rule in any
 * of the 52 stylesheets this repository holds — a measurement that still stands and was re-proved
 * against `css/complete-app-styles.css`, where the search finds `.chat-uploaded-img` with a real
 * rule and the `-sm` variant zero times. What was wrong was treating that as the question. A class
 * this repository INVENTS with no rule is scaffolding and `CLAUDE.md` forbids it by name; a class
 * TRANSCRIBED from the capture has its consumer in the capture, which is the call already made and
 * tested for `btn-ligth` in `ChatArchiveLogPane.svelte`. The binding ships, on both columns.
 * `image-preview-latch-contract.test.ts` and `USM-18` carry the whole argument.
 *
 * ### `XCP-08` LEFT THIS LIST on 2026-08-31, and that is what the list is for
 *
 * It sat here as a third gap *"this column cannot close from its own file"*, and that was true of
 * the FILE and false of the repository: the blocker was that nothing in the `<ExtraChatPane>` call
 * opened a modal, so an optional handler added first would have been a prop with no caller. One
 * session owning the page and the component together closes it — the page passes `onyoutube` now,
 * and the button is gated on the HANDLER rather than on a flag, which is this column's own design
 * (see the `isPresenter` note below) rather than a shortcut.
 *
 * The ONE that remains is not of that kind. It is not a scope problem, and no amount of owning more
 * files closes it: `XCP-09` needs a re-capture of a component this room has never dumped.
 */
export const EXTRA_CHAT_MEASURED_GAPS = ['XCP-09'] as const;

/**
 * ## Decisions RELOCATED from `ExtraChatPane.svelte`, verbatim, on 2026-08-31
 *
 * Not a tidy-up. That component measured exactly at its `source-size-contract` ceiling — zero lines
 * of headroom — and four contract tests name strings inside every slice of it that could otherwise
 * have been extracted (`emoji-picker-contract` wants its emoji trigger and picker,
 * `extra-chat-column-contract` its textarea id, RTE button, `chatDisabled` and `webinarMode` blocks
 * and its chrome prop, `authority-gate-contract` its `showPmButton` gate,
 * `typing-indicator-contract` its indicator markup). So the markup could not move and the number
 * could not rise, and the ratchet's own prescription is the third thing: *"moving an explanation to
 * the code it explains is the extraction itself."*
 *
 * These are kept in full rather than shortened, because this repository's standard says in as many
 * words not to trim a comment to hit a line target. Each one is pointed at from the line it used to
 * sit on.
 *
 * ### `isPresenter` was a prop here and is gone, 2026-08-14
 *
 * Upstream's `app-extra-chat` reads it six times — the admin-chat tab (`isPresenter ||
 * user.hasAdminChat`), image posting (`isPresenter || sessData.userUploads`), the mention badge, the
 * limited-presenter branch and the mic check. It is genuinely load-bearing THERE because the
 * component computes its own gates.
 *
 * This one does not. The parent computes each gate once and passes the RESULT — `showPmButton`,
 * `canPostImages`, `canUseRTE` — which is the better shape: authority is decided in one place
 * instead of re-derived per component. Passing the raw flag as well meant a second input that no
 * line read, and a future reader could have gated something on it directly and quietly disagreed
 * with the parent. It is also what decided `XCP-08`'s shape above: the YouTube button's gate is
 * `isPresenter`, this component is deliberately not told, and so the gate arrives as the handler's
 * own presence rather than as a second flag.
 *
 * ### The `follow` prop is the PAGE's instance, and the effect that reads it lives in the component
 *
 * The `$effect` that acts on it is in `ExtraChatPane` and not on the page, which is what Svelte's
 * own best-practices page asks for: an effect is for "direct DOM manipulation", and the DOM in
 * question is that component's scroller. `scroll-follow.ts` had already written down the same
 * conclusion for its own reasons — *"the `tick()`-then-check dance around a scroller that may have
 * been replaced mid-flight belongs where the element lives"* — and until 2026-08-16 the element
 * lived there while the dance lived on `+page.svelte`.
 *
 * `follow` is the page's INSTANCE rather than a fresh one, because its markers are what make the
 * decision stateful across renders and because the alerts column deliberately gets a
 * differently-configured one. Constructing it in the component would silently give this column the
 * `alwaysScrollToBottom` override the alerts instance is forbidden.
 *
 * ### The scroller element, and the prop that used to carry it upward
 *
 * `onscrollerready` wrote that element up to `+page.svelte` and NOTHING read it until 2026-08-14,
 * so the second chat column never followed a new message while the first one did — a message
 * arrived, the column stayed where it was, and the reader saw nothing. ESLint is what surfaced it,
 * as an "assigned but never used" that turned out to be a missing feature.
 *
 * The effect is a deliberate parallel of the main chat's, not a new design: same four conditions
 * (first view, channel switch, new message, and the reader's own scroll position via
 * `shouldAutoScrollForMessage`), same `tick()` before measuring, and the same identity re-check
 * afterwards so a scroller swapped out mid-await is not written to.
 *
 * It is a local `$state` there as of 2026-08-16 rather than a `let` on the page fed by that
 * callback. The round trip existed only so a page-level `$effect` could reach an element the
 * component owns; with the effect there it has no reader, and a prop whose whole job was to hand an
 * element upward is "no config nothing reads" in prop form.
 *
 * ### `EMOJI-10` — the picker's `popoverId` must match what the trigger advertises
 *
 * The trigger sets `aria-describedby="ngb-popover-extra"`; the picker was mounted with no
 * `popoverId`, so the popover element carried the default `ngb-popover-3`. `portalPopover` then
 * runs `document.querySelector('[aria-describedby="ngb-popover-3"]')` and finds either NOTHING —
 * leaving the popover at the hardcoded inline `translate3d(483.5px, -52.5px, 0px)` it ships with,
 * i.e. somewhere arbitrary on screen — or, when the MAIN column's picker is also open, that
 * column's trigger, and positions this popover over the wrong composer.
 *
 * `AlertQaModal`, `ModalHost` and `NoteEditor` all pass a matching id. This was the one that did
 * not, which is why the audit filed it as a `defect` and not a divergence.
 *
 * ### `globals.chatInputFocus = 'textAreaTxtExtra'`
 *
 * Set on focus and read by the mention router, which sends `doMentionExtra` instead of `doMention`
 * when this composer is the focused one. The page holds the flag because it is the thing that
 * routes mentions; the component only reports.
 *
 * ### The magnifier, and what the page does with it
 *
 * It opened the Chat Logs modal until 2026-08-29 and now toggles the search bar, which is what
 * upstream's `toggleChatToolbarSearchOnly()` does and what this room's alerts column already did.
 * The modal is still reached from the sidebar.
 *
 * ### `XCP-02` — the `&nbsp;Chat` label on the brand
 *
 * `j3e` at byte **2,367,381** is `d(0,"span"), v(1,"\xa0Chat"), u()`, gated by
 * `O(5, 0 == o.chatTabs.length ? 5 : -1)` at byte **2,399,848** inside this component's own
 * template function (byte 2,399,236) — not the main column's. The label appears ONLY when there are
 * no channels, because the tab strip is what normally names the column, and `ChatTabStrip`
 * suppresses itself in exactly that case (the second half of `acA-11`). Without both halves a room
 * with no channels configured showed a bare comment glyph beside an empty styled list, and nothing
 * said "Chat". `&nbsp;` and not a space: it is `\xa0` in the capture, and a plain space would be
 * folded away by the surrounding template whitespace. `AlertChatArea` has carried this since the
 * row was first written; this column did not.
 */
export const EXTRA_CHAT_RELOCATED_DECISIONS = [
  'isPresenter',
  'follow',
  'scroller',
  'EMOJI-10',
  'chatInputFocus',
  'onsearch',
  'XCP-02'
] as const;
