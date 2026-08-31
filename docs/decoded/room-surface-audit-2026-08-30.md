# The room surfaces, audited against the pinned v4 bundle — 2026-08-30

**223 verified gaps across 18 surfaces.** Every entry names a byte offset in
`apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`, what this room does instead, and
the file and line where it does it.

## How this was produced, and what that buys

One reader per surface read the reference component end to end at verified boundaries and listed
every difference. **Each claimed difference then went to two independent verifiers** — one asking
*"is this already built here under another name?"*, one asking *"is the quoted evidence actually at
that offset, and does it mean what the claim says?"* A claim survived only if neither could refute
it.

| | |
| --- | ---: |
| surfaces read | 18 |
| reference components not found in the bundle | 0 |
| differences claimed | 274 |
| **survived verification** | **223** |
| refuted | 51 |
| false-claim rate | 19% |

**The 19% false-claim rate is the number to keep.** Nearly one claimed gap in five was wrong —
thirty-two already built here under a name the reader did not search for, nineteen resting on
reference code that does not do what the offset appeared to say (dead handlers, unreachable
branches). Without the second pass this document would carry fifty-one items of work that does not
need doing, and no way to tell which fifty-one. That is why the refuted list is kept below rather
than discarded.

**And a fifty-second was refuted after this document was committed** — UIM-03, annotated in place
below rather than moved, because the annotation is the useful part. Two adversarial verifiers had
passed it. The reason both missed it is worth recording: the claim was framed as *"`hidePrivateInfo`
does not exist anywhere in our source"*, which is TRUE, and the verifiers checked that. What neither
checked is whether the outcome is achieved another way — and it is, by three server-side refusals
that are stricter than the flag. **A gap stated as a missing NAME is the shape most likely to
survive verification while being wrong**, and it is the shape to distrust in the entries above.

**It is deliberately NOT folded into the table above, and it was, for a while.** That table read
222 survived / 52 refuted until 2026-08-30 14:20 UTC, and every other count in this document
disagreed with it: the prose two paragraphs up says "51 were refuted" and breaks that down as
thirty-two plus nineteen; the refuted section is headed "The fifty-one refuted claims" and lists
exactly fifty-one; the surfaces table sums to 223; `274 - 51 = 223`. One number had been moved and
five had not, which is the whole failure mode this document was written to describe, occurring
inside the document itself. The table describes the two-verifier pass **as it ran**, so UIM-03 —
refuted after the fact, by a third reading — belongs in this paragraph and not in that table,
exactly as RM-25 belongs in the next paragraph and not in that table.

**One hundred and thirty-two rows have been appended since this document was committed**, and none of them is
folded into the totals above — those describe the two-verifier pass and should keep describing it.

**Each such row says so at itself**, in one sentence, and that sentence is the whole mechanism:
`room-surface-audit-counts.test.ts` counts it per surface to license the gap between a surface's
`gaps` number and the rows filed under it, and counts it document-wide to license the gap between
the survivor count and the row count. A row may sit outside the tables ONLY by declaring that it
does, and it cannot escape both counts, because the same declaration is what admits it to either.

This paragraph used to carry that sentence itself, while describing RM-25 — the first such row,
found while building RM-11 and RM-12 by decoding the compact component's whole consts table rather
than the entries those rows named. That made RM-25 count twice once it also carried its own marker,
which is why this summary is now phrased in the plural: **a summary of markers must not be a
marker.** The lesson RM-25 taught is still the cheaper half of the one UIM-03 teaches — **a reader
who decodes the table finds rows a reader who looks up the cited const cannot** — and this
document's per-row byte offsets make the second reading the tempting one.

**Fourteen of the hundred and thirty-two are the two surfaces added on 2026-08-31** — `MainTabStrip.svelte`
(MTS-01 to MTS-07) and `RoomOverlays.svelte` (OVL-01 to OVL-07), read end to end at verified
boundaries. Neither had a section here. **Three of those fourteen exist only because the consts
tables were decoded by value rather than looked up** — MTS-04, MTS-06 and OVL-01 — which is RM-25's
lesson holding a second time, on a second pair of surfaces, at better than one in five.

**Seventeen more are `VideoPlayer.svelte`, `ScheduledAlerts.svelte` and `AvDevicePane.svelte`**,
none of which had a section here before. They are deliberately NOT folded into the tables above, for
the reason the two paragraphs above give, and they are countable rather than asserted — every one of
them carries the same sentence in its body, and `room-surface-audit-counts.test.ts` requires the
document to hold exactly `223 + <that count>` rows. A row appended without the sentence, or a
sentence written without a row, fails it.

**The three surfaces were chosen because they had NO section here at all**, and two of them proved
the point RM-25 makes about which reading finds what. `SCH-02` is the sharpest case: a decode from
2026-08-15 had reached that exact `ngClass` and stopped, writing *"The class NAMES are in the const
table and were not read; do not guess them."* They are not in the const table — Angular compiles a
multi-key `ngClass` into a shared factory beside the template functions — which is why looking where
the note said to look found nothing, and why the note survived two weeks.

**Twenty-two more are `ExtraChatPane.svelte` and `AlertQaModal.svelte`** — nine `XCP-` rows and
thirteen `QAM-` rows — two further surfaces this document had no section for at all. Each says so in
its own body, in the fixed sentence `room-surface-audit-counts.test.ts` counts, and the surfaces
table above is deliberately left at eighteen for the same reason.

**Twenty more are `PrivateChatComposer.svelte`, `GiphyPicker.svelte` and `SpeechRecoOverlay.svelte`**
— `PCC-`, `GIF-` and `SRO-`. The composer batch settled a rule two earlier readings had disagreed
about: all six of the reference's `onKey` implementations were decoded by value, five are byte-
identical apart from the jQuery alias and the element id, and **Shift+Enter is a no-op** —
`i.val(i.val())` assigns the value to itself, while only the ALT arm appends a newline. Both earlier
readings had transcribed those bytes correctly and one had described them wrongly, which is the
failure this document exists to catch, occurring between two of its own batches.

**Fourteen more are `ScreenZoomControls.svelte`, `ScreenVolumeControl.svelte` and
`StreamTabs.svelte`** — `SZC-`, `SVC-` and `STB-`, at the foot of this document. That batch found the
same class of error three times over: **every const index those three components cited from 66 upward
was one too high for the pinned bundle**, because the citations named `docs/source/components/*.js`,
a capture root this repository does not hold. The neighbours are plausible enough that a slot lookup
would have confirmed each one — 118 for the streams bar is `streamsTabsContent`, 98 for the dark
button is the magnifier glyph inside it — which is RM-25's lesson a fourth time and the reason the
brief for every batch says to decode by value.

**The navbar batch was the one merge that had to choose between two answers.** It and an earlier
batch extracted the same SoundCloud region on the same day — one file by feature, two by audience —
and both reached the same ceiling by different routes. The feature split survived on a measurement
rather than on taste: its `RoomNavbar` also builds `NAV-04` and `NAV-07`, which the other does not,
and a seam is not worth two behaviours. Merging it then surfaced two errors in it, both settled from
the bytes: const 176 declares `id` twice and Angular's `setUpAttributes` (`H0`, byte 16,054) calls
`setAttribute` once per pair with no de-duplication, so the SECOND name survives and the assertion
demanding the first was asserting an attribute the reference overwrites before paint; and the id it
corrected to is shared with the presenter's dropdown, which made it useless as the needle for "the
listener arm is absent for a presenter" — answered by the very element it was meant to distinguish
from. The needle is const 97's title now. The deleted pair's keyboard route came back with it.

**Seventeen more are `RoomNavbar.svelte` and `MessageMenu.svelte`** — `NAV-` and `MSM-`. The navbar
was the largest component in this repository with no section here at all. Four of its rows are
MEASURED REFUSALS and each is a control that is dead in the reference itself: `hasSTHelpLink` occurs
three times in 2,891,205 bytes and the only assignment that sets it true is on the LOGIN component,
so the room's help link can never render; `recIndicatorStart`'s one rule is a descendant selector
that an `<i>` cannot match; `audioVolSlider` is a CLASS rule written against an ATTRIBUTE. Building
any of them would have been reproducing dead code.

**These four batches landed in parallel and were merged one at a time**, which is why the running
total lives in ONE paragraph — the first — and each batch paragraph says only what it read. Three of
them arrived each carrying their own "N rows have therefore been appended" sentence, computed against
the document as it stood in that worktree, and all three were stale on arrival. A count that appears
in four places disagrees with itself the moment two of them move; the marker count is the only one
that cannot.

That reading is worth one sentence of its own, because it repeats RM-25's lesson at a larger scale.
`ExtraChatPane` is the SECOND compiled copy of the chat column, and reading `app-extra-chat`'s own
const table rather than assuming it mirrors `app-chat`'s is what produced `XCP-06` — a cited const
index that belonged to the other table — and `XCP-09`, five thousand eight hundred bytes of component
stylesheet that no capture in this repository has ever seen, which is invisible from the markup and
was found only by reading the bundle's `styles:` array.

**Seventeen more have been appended since, for a running total of eighteen.** They are the `NAV-` and
`MSM-` rows below, from a 2026-08-31 pass over `RoomNavbar.svelte` and `MessageMenu.svelte`, and each
one carries that same marker sentence in its own body so the total is READ from the document rather
than remembered. Three earlier batches each wrote their own "N rows have therefore been appended"
sentence, computed against their own worktree, and all three were stale before they were committed;
they are consolidated into this paragraph, which is the only place the running total lives.
`apps/room/src/lib/room-surface-audit-counts.test.ts` fails if it disagrees with the rows in either
direction.

## Where the work stands

**0 open · 355 closed · 355 rows.**

Every row in this document now carries a disposition. That is not the same as every row being
built: `BLOCKED` and `OWNER DECISION` are closures too, and the vocabulary says why — a row that was
read, measured and deliberately not built is indistinguishable from a row nobody has opened unless
the difference is written down, which is how work gets done twice. Two rows closed on 2026-08-30 are
`BLOCKED` on a one-line change each, and each names that line.

Those two numbers are checked rather than asserted: `apps/room/src/lib/room-surface-audit-counts.test.ts`
parses this document and fails if either is wrong. It exists because the answer to "how many are
left" came out **three different ways in ten minutes** on 2026-08-30 — 158, then 218, then 151 — not
because the document changed, but because each grep recognised a different subset of the ways a
closed row says it is closed. Every one of those numbers had been quoted as progress.

A row is finished in one of eight ways and only three of them are code. **The other five are the
expensive ones to lose**, because a row that was read, measured and deliberately not built looks
exactly like a row nobody has opened yet:

| disposition | what it means |
| --- | --- |
| `BUILT` | built here, against the cited reference bytes |
| `HALF BUILT` | built, where the row named a larger scope than the part that was right to build |
| `FIXED` | a defect of OURS removed, rather than a reference behaviour added |
| `ALREADY BUILT` | present under a name the audit's reader did not search for |
| `MEASURED REFUSAL` | read, measured, deliberately not built — with the measurement at the code |
| `DELIBERATE DIVERGENCE` | matching the reference here would reproduce a defect |
| `OWNER DECISION` | not ours to decide; what the owner has to answer is named |
| `BLOCKED` | cannot be finished from this checkout; what would unblock it is named |

The disposition is the first line under the row's heading, in bold. A row with no disposition line
carries its `**severity** · category · reference byte` line there instead, and is open.

Also recorded per surface: how many reference behaviours were confirmed **present** here. A list of
only gaps reads as though nothing works, and 965 behaviours were confirmed built.

## What this document is NOT

* **Not a plan.** Nothing here is scheduled, scoped or costed, and some entries will turn out to be
  deliberate divergences this repository already argued for in a comment the reader did not reach.
  Read the code before acting on a row.
* **Not a substitute for reading the bytes.** Every entry carries its offset so the next person
  re-reads rather than trusts. The v4 bundle is SHA-256 pinned, so an offset stays valid.
* **Not complete.** Eighteen surfaces of sixty-two; `todo-next.md` holds the inventory.

The verifiers' transcripts are not carried into the repository — they run to about a megabyte and
the register would stop being readable. Each entry carries the verdict sentence, and the reasoning
behind it is reproducible by re-reading the offset, which is the point of quoting one.

## Severity, as the readers used it

| | meaning |
| --- | --- |
| **high** | a control the reference has that does nothing here, or a value invented rather than read |
| **medium** | a behaviour that differs in a way a user would notice |
| **low** | a constant, a wording, or an ordering that differs |

| kind | count | | severity | count |
| --- | ---: | --- | --- | ---: |
| `missing-behaviour` | 81 | | high | 29 |
| `missing-control` | 62 | | medium | 110 |
| `divergence` | 45 | | low | 84 |
| `wrong-constant` | 20 | |  |  |
| `defect` | 9 | |  |  |
| `invented-value` | 6 | |  |  |

## The surfaces

| surface | gaps | of which high | reference behaviours confirmed present |
| --- | ---: | ---: | ---: |
| PrivateChatPanel.svelte | 21 | 4 | 48 |
| RoomMessage.svelte | 19 | 0 | 41 |
| notes/NoteEditor.svelte | 18 | 2 | 50 |
| ModalHost: session-control modal | 17 | 4 | 50 |
| ModalHost: user-settings modal | 17 | 5 | 35 |
| routes/+page.svelte (room shell) | 15 | 1 | 65 |
| ModalHost: user-info / moderation modal | 14 | 3 | 48 |
| PostAlertModal.svelte | 14 | 1 | 61 |
| ModalHost: report / advanced-search modal | 12 | 3 | 49 |
| RoomSidebar.svelte | 12 | 0 | 52 |
| StreamingView + ScreenPane + ScreenTabs | 11 | 1 | 59 |
| EmojiPicker + reactions | 11 | 1 | 69 |
| AlertChatArea.svelte | 9 | 3 | 42 |
| PresentationArea.svelte | 8 | 0 | 56 |
| PollPanel.svelte | 8 | 0 | 56 |
| FilesPane.svelte | 7 | 0 | 51 |
| ModalHost: connectivity / AV test modal | 5 | 1 | 61 |
| day-trade-alerts + swing-alerts panes | 5 | 0 | 72 |

---

## PrivateChatPanel.svelte

21 verified gaps; 48 reference behaviours confirmed present.

### G1 — The whole composer button column is absent: emoji picker, image upload, GIF picker

**BUILT 2026-08-30 10:05 UTC.** All three, in a component of their own. `textAreaBtnsCol` (const 56), the emoji span (57/58), the image-upload span (63/64) and the GIF span (65), with the image and GIF gated on `canPostImages` and the emoji deliberately not — the capture's split and the sensible one, since an emoji is text. The webinar notice (53/61/62) is there too, its tooltip verbatim including the reference's own missing apostrophe in "everyones".

**A COMPONENT because the ratchet said so.** The column put `PrivateChatPanel.svelte` at 716 lines and `source-size-contract` refused it, so `PrivateChatComposer.svelte` came out carrying `pEe` whole. The panel is now **516** lines — smaller than before the feature — which is what an extraction is supposed to look like.

**The image dialog is this conversation's OWN**, a third `ImageUploadDialog` instance rather than a share of the chat composer's. `RoomOverlays` already records that rule for the swing form; here the cost of getting it wrong is larger, because an image meant for one person would land in the room. The URL is SENT rather than staged, which is what `sendPrivChat` does with it. **`openRTEModal` is deliberately absent**, as `AlertChatArea` already records: the reference puts it on exactly two composers and private chat is not one of them.

**high** · `missing-control` · reference byte **2,198,563**

```
function pEe(t,n){if(1&t){const e=Y();d(0,"div",50)(1,"div",52),H(2,lEe,5,0,"div",53),d(3,"div",54)(4,"textarea",55),x("keyup",function(o){return D(e),E(g(2).onKey(o))})("paste",function(o){return D(e),E(g(2).onImagePaste(o))})("focus",function(){return D(e),E(g(2).onTextareaFocus())}),u()(),d(5,"div",56)(6,"span",57),x("click",function(){return D(e),E(g(2).toggleEmojiPanel())}),T(7,"i",58),u(),H(8,cEe,2,0,"span",59)(9,hEe,6,1,"span",60),u()()()}if(2&t){g();const e=It(3),i=g();m(2),O(2,i.webinarMode?2:-1),m(4),z("ngbPopover",e),m(2),O(8,i.canPostImages?8:-1),m(),O(9,i.canPostImages?9:-1)}}
```

**Ours:** PrivateChatPanel.svelte:369-385 renders `#textAreaHolderPM` containing ONLY the textarea. There is no `textAreaBtnsCol` column, no `span.textAreaBtns` emoji button, no `cEe` image-upload span, no `hEe` GIF span. Grepping apps/room/src for `toggleEmojiPanel` returns 0 hits; `GiphyPicker.svelte` exists but is imported only by `notes/NoteEditor.svelte:15`, and `imgUpload`/`onImagePaste` exist only for the swing/day-trade alert forms (RoomOverlays.svelte:633,647,664,679). None is wired to the private-chat composer.

> Verified: Confirmed on both sides. Reference: the `pEe` render function at offset 2198563 belongs to `app-privchat` (selector block at offset 2214530: `selectors:[["app-privchat"]],decls:19,vars:9`), and that component's consts array (read at offset 2217534) carries the full composer button column — `textAreaBtnsCol`, a `textAreaBtns` span with `["…

### G2 — `.pc-messages` has no CSS rule anywhere, so the private-chat log cannot scroll

**ALREADY BUILT — verified by reading 2026-08-30 08:40 UTC, not rebuilt.** The transcribed rule is in `captured-runtime-components.css:6691` (`app-privchat .pc-messages:not(:root)`), and `app.css:319` adds the host rule it needs — `app-privchatscroller { display: block; height: 100% }` — with a paragraph explaining that a custom element is `display: inline` until something says otherwise, so a percentage height inside it resolved against `auto`. This row describes a revision the panel has moved past.

**high** · `missing-behaviour` · reference byte **2,194,497**

```
dependencies:[uf],styles:[".pc-messages[_ngcontent-%COMP%]{height:calc(100% - 50px);overflow:hidden auto}"]
```

**Ours:** PrivateChatPanel.svelte:345 renders `<div class="pc-messages">`, and `private-chat.svelte.ts:385` scrolls `document.querySelector('.pc-messages')`, but `grep -rn "pc-messages" --include=*.css` over the whole repository returns ZERO rules. The reference's rule lives in the SCROLLER's own component styles, not in app-privchat's, so it was missed when app-privchat's styles were transcribed into captured-runtime-components.css:6482-6600. The container therefore has no height and no `overflow`, and `scrollTop = scrollHeight` on a non-scrolling box is a no-op.

> Verified: I could not refute this. `.pc-messages` is rendered (PrivateChatPanel.svelte:345) and scrolled by script (private-chat.svelte.ts:385-386) but has NO CSS rule anywhere in our source.

### G3 — `PAGE_SIZE = 50` and `Math.floor(log.length / 50)` replace the scroller's component-owned page counter, and re-request the same page

**ALREADY BUILT — verified by reading 2026-08-30 08:40 UTC, not rebuilt.** `PAGE_SIZE` no longer exists in this panel; paging is `RoomLogPages` (`#paging`), which is the extracted `currPage`/`hasMoreData`/`isLoadingMore` machinery this row's own verification note said the repository already had. `loadMore` refuses while `loadingMore` or `!hasMoreData`, so the same page cannot be requested twice.

**high** · `invented-value` · reference byte **2,193,442**

```
loadMore(){this.loadMoreLastID="pcm-"+this.msgs[0]._id,this.appService.guiEventBus.emit("PCLoadMore",{page:++this.currPage}),this.isLoadingMore=!0}
```

**Ours:** PrivateChatPanel.svelte:149 declares `const PAGE_SIZE = 50` (described as "the page size getAllPCLogs answers with") and :346/:354 gate on `log.length >= PAGE_SIZE && !searching` while computing `Math.floor(log.length / PAGE_SIZE)`. The reference has no client-side page size at all — `loadPClogForUID(e,i=0)` (@2207000-region, read at 2205022ff) sends only `{page, peerID}` and the counter is `++this.currPage` held on the scroller, reset to 0 on `PCswitchChatToUser`. Consequence: if a page comes back with fewer than 50 rows (e.g. 30), `log.length` becomes 80 and `Math.floor(80/50)` is 1 — the SAME page is requested again and `private-chat.svelte.ts:417-421` prepends it a second time with no de-duplication.

> Verified: I tried to find a component-owned page counter for private chat and it is genuinely absent. What I found instead confirms the claim and sharpens it: this repo DOES have the reference's counter machinery, extracted and named `RoomLogPages` (`lib/room/log-pages.svelte.ts`) — `#page` documented as "`this.currPage`, per log" (:62), `#hasMore`…

### G4 — `hasMoreData` is never modelled, so Load More never disappears when the history runs out

**ALREADY BUILT — verified by reading 2026-08-30 08:40 UTC, not rebuilt.** `get hasMore()` is `this.#paging.hasMoreData && !this.#searchTerm` — the reference's own gate — and the badge reads it. `switchToUser` resets the paging with `newLoadMorePaging()`, which is `PCswitchChatToUser`'s `currPage = 0, hasMoreData = !0, isLoadingMore = !1`.

**high** · `missing-behaviour` · reference byte **2,194,388**

```
2&i&&(m(2),O(2,o.hasMoreData&&!o.searchTerm?2:-1),m(),O(3,o.isLoadingMore?3:-1),m(),pt(o.msgs))
```

**Ours:** PrivateChatPanel.svelte:346 gates only on `log.length >= PAGE_SIZE && !searching`. The reference sets `0==e.length&&(this.hasMoreData=!1,this.loadMoreLastID="")` in the scroller's `getPCLog` subscriber (read at 2191700-region inside the class body at 2191427). Ours: an empty response leaves `log.length` unchanged, so the badge stays and every further click re-fetches the same empty page forever. `#lib/chat-paging.ts` and `#lib/room/log-pages.svelte.ts` DO model `hasMoreData` for the main chat/alert feeds, but the private-chat panel is not wired to either.

> Verified: I could not refute it. PrivateChatPanel.svelte:346 gates Load More solely on `log.length >= PAGE_SIZE && !searching` (PAGE_SIZE=50 at :149).

### G11 — `autoExpand` is not applied to the private-chat textarea, so `.pc-messages` is never resized either

**BUILT 2026-08-30 10:05 UTC.** Both halves, byte 2,203,228. The composer never expanded at all, so a member typing three lines saw one with the rest scrolled out of a box the captured `.txt-area` rule gives `overflow-y: auto`. **The second half is what makes this different from the main composer's variant:** `.pc-messages` is `calc(100% - 50px)` — fifty pixels reserved for a one-line composer — so a composer that grows without the log shrinking pushes the log's bottom off the panel, and the newest message disappears exactly when somebody is replying to it. The `+ 2` is the capture's and `+page.svelte` already records why it is not padding for luck. Scoped with `closest('app-privchat')` rather than a bare `document.querySelector`, which is the same scoping `this.elementRef.nativeElement.querySelector` gives upstream. It re-runs on any change to the draft and not only on input — an emoji, a cleared box after a send, a GIF URL — which is the half the reference gets for free by calling `autoExpand` from each of those places.

**medium** · `missing-behaviour` · reference byte **2,203,228**

```
autoExpand(e){P("autoExpand:"),e.style.height="0";const i=window.getComputedStyle(e),o=e.scrollHeight+2+"px";i.getPropertyValue("height")!==o&&(e.style.height=o,this.elementRef.nativeElement.querySelector(".pc-messages").style.height=`calc(100% - ${o} - 15px)`),""===e.value.trim()&&(e.style.height="23px",this.elementRef.nativeElement.querySelector(".pc-messages").style.height="calc(100% - 50px)")}
```

**Ours:** PrivateChatPanel.svelte:370-384 attaches no expand handler. `+page.svelte:853-870` has `autoExpandComposer`, but it is the MAIN chat composer's variant (it sets only the textarea height, never `.pc-messages`) and is passed only to the main composer at +page.svelte:1187 (`onexpandcomposer`). The private-chat panel receives no such prop.

> Verified: I could not refute it. The private-chat textarea in our source has no expand wiring of any kind, and nothing in apps/room/src ever writes a height onto `.pc-messages`.

### G12 — No incoming-PM toast or desktop notification ("Message from <name>")

**BUILT 2026-08-30 09:20 UTC.** `Message from <name>` as both a toast and a browser notification, gated on `!doNotDisturbOn && chatPopup` exactly as byte 2,205,900 has it, and raised only for a message that is NOT mine and NOT on the conversation already open — the same test the unread count beside it uses, because there is no point telling somebody about a message they are looking at. Only the SOUND fired before, so a member with the panel closed had no way to learn a private message had arrived. `RoomToasts` is injected rather than reached for, exactly as `playSound` is: this class knows WHEN somebody should be told and deliberately not how, and that class already owns the queue, the duplicate guard and the `?d=mm&s=50` gravatar fallback the icon needs. `chatPopup` joined `PrivateChatPrefs`; `RoomPrefs` already held it for the @-mention popup.

**medium** · `missing-behaviour` · reference byte **2,205,471**

```
!this.appService.globals.preferences.doNotDisturbOn&&this.appService.globals.preferences.chatPopup&&(this.alertService.info(e.txt,"Message from "+e.n,{enableHtml:!0}),window.Notification)&&new Notification("Message from "+e.n,{body:e.txt,icon:e.pic||"https://secure.gravatar.com/avatar/"+e.avt+"?d=mm&s=50"})
```

**Ours:** private-chat.svelte.ts:373 fires only the sound: `if (!doNotDisturbOn && !isMine && chatSoundOn) playSound('pling')`. `RoomToasts.notify` exists (toasts.svelte.ts:150-170) and correctly reproduces the `?d=mm&s=50` gravatar fallback, but its only two call sites are alert delivery and the @-mention popup (RoomOverlays.svelte:300, :349). Grepping apps/room/src for "Message from " returns no private-chat use.

> Verified: Confirmed absent from our source after an exhaustive search. `RoomPrivateChat.ingest()` fires only the sound (private-chat.svelte.ts:373) and there is no toast or OS notification on the incoming-PM path.

### G13 — `canPost` refusal ("Sorry, you can't post to this channel") is not modelled

**BUILT 2026-08-30 10:05 UTC.** The reference's own sentence, raised through this room's dialog primitive, before anything is trimmed or sent. There was no gate at all: a member whose chat was muted or disabled typed, the message went to the server, and the refusal came back as a generic failure rather than as the reason. **`canPost` is injected, not computed here** — the room already decides who may chat (`chatComposerAvailable`, the same value the main composer's render gate uses, which is upstream's own pairing at `O(4, e.isConnected && e.chatEnabled ? 4 : -1)`), and a second opinion in the panel is how two places come to disagree about one authority. The server refuses independently regardless; this is the message, not the enforcement. The draft is kept, so nothing a member typed is lost to a refusal.

**medium** · `missing-behaviour` · reference byte **2,208,062**

```
sendMessage(){if(!this.canPost)return void bootbox.alert("Sorry, you can't post to this channel");let e=Ao("#textAreaTxtPM").val().toString().trim();e&&(this.appService.sendPrivChat(this.currUser,e,this.recvdUser),Ao("#textAreaTxtPM").val(""),this.appService.guiEventBus.emit("scrollChatLogToBottomPM",{force:!0,repeat:!1}))}
```

**Ours:** private-chat.svelte.ts:425-439 `send()` trims and posts with no `canPost` gate; the string "you can't post to this channel" returns 0 hits across apps/room/src. The panel also has no `canPost`/`chatEnabled`/`isConnected` props (Props at PrivateChatPanel.svelte:91-116), so the reference's composer gate `O(4,e.isConnected&&e.chatEnabled?4:-1)` (fEe @2199159) has no counterpart — the composer is always rendered.

> Verified: The refusal is UNREACHABLE DEAD CODE in the reference's own private-chat component, so there is no behaviour to model — and the one real refusal path that exists IS built here. 1.

### G14 — Load More loses the reader's position — no `pcm-` anchor scroll-restore and no `-20` nudge

**BUILT 2026-08-30 09:20 UTC.** `loadMoreLastID` is recorded as `pcm-${firstRow._id}` BEFORE the request and restored after it, with `scrollIntoView(true)` and the reference's `- 20`. Without it the older page is inserted above the viewport while the scroll position stays where it was — now a different message — so a reader pressing `Load More` was thrown backwards through history they had not read. **The `-20` is transcribed rather than tuned:** `scrollIntoView(true)` aligns the anchor to the very top of the box, which hides the badge and the last line of the page just fetched, and guessing a different number would be inventing a value nobody can check. `CompactMessageRow` already emitted `id="pcm-{message._id}"`, so the anchor existed all along and nothing scrolled to it. `tick()` and not `setTimeout` — the opposite of `scrollToBottom`'s choice in the same class, and the note says why.

**medium** · `missing-behaviour` · reference byte **2,191,427**

```
this.appService.appEventBus.subscribe("getPCLog",e=>{this.isLoadingMore=!1,0==e.length&&(this.hasMoreData=!1,this.loadMoreLastID=""),this.loadMoreLastID&&(document.getElementById(this.loadMoreLastID).scrollIntoView(!0),this.scrollRef.nativeElement.parentElement.scrollTop=this.scrollRef.nativeElement.parentElement.scrollTop-20)})
```

**Ours:** private-chat.svelte.ts:408-422 `loadLog` prepends the older page and returns; nothing records the previously-first row's id or restores the scroll position. `CompactMessageRow.svelte:51` does emit the right anchor (`id="pcm-{message._id}"`), so the anchor exists but nothing scrolls to it. Grep for `loadMoreLastID` across apps/room/src returns 0 hits.

> Verified: I could not find any anchor-based scroll restore for the private-chat Load More anywhere in apps/room/src. `scrollIntoView` has ZERO occurrences in the entire src tree (case-insensitive), and `loadMoreLastID` / `loadMoreLast` / `lastID` / `anchorId` / `restoreScroll` / `scrollAnchor` / `preserveScroll` all return zero hits.

### G15 — Avatar `src` has no gravatar fallback, so an empty `avatarUrl` renders a broken image

**BUILT 2026-08-30 08:40 UTC — AND IT UNCOVERED A LIVE PRIVACY DEFECT.** `avatarSrc(pic, avt, size)` at both sites, with the capture's two sizes (`?d=mm&s=25` in the header at byte 2,195,104, `&s=32` in the list at 2,196,585).

**The value this row wanted to put in an outbound URL was every member's raw email address.** `lib/server/private-chat.ts` filled `avt` with `sender.email` and `peer.email`, so a member asking for their own history was handed the other participant's address, and the tab strip carried one per conversation. `private-chat-delivery.test.ts` had already found and fixed that exact leak on the live broadcast — its docblock names it — but its assertion read ONE file, so the two read paths shipped the address for weeks. Both now send `hashEmail(...)`, which is gravatar's own md5-of-the-lowercased-address and what the reference sends; that contract now sweeps every producer of the field. Stated plainly at the code: an md5 of an address is not strong protection, and what it stops is the plaintext being handed out and forwarded to a third party.

**medium** · `missing-behaviour` · reference byte **2,196,189**

```
z("src",e.pic||"https://secure.gravatar.com/avatar/"+e.avt+"?d=mm&s=32",Mt)
```

**Ours:** PrivateChatPanel.svelte:326 `<img alt="t.avt" class="avatarImg" src={tab.pic} />` and :193 `src={peer.pic}` (reference header tab uses `?d=mm&s=25`, eEe @2194806). `lib/server/private-chat.ts:236` fills `pic: peer.avatarUrl` with no fallback, and the `avt` field is carried on `PrivateChatTab` (PrivateChatPanel.svelte:64) but read by nothing.

> Verified: I could not refute it. Both private-chat avatar images bind `pic` directly with no `||` fallback, and no fallback is applied at any upstream hop.

### G16 — Tab online status is hard-coded false for every server-supplied conversation

**BUILT 2026-08-30 08:40 UTC.** An `onlineUserIds: () => ReadonlySet<number>` option, read once per recompute of the tab strip, supplied from `roster.users`. `checkUserOnlineStatus` (byte 2,203,628) re-runs on `getRoster`, `onUserJoin` and `onUserLeave`; deriving it does the same without three subscriptions to keep in step, and reads the roster once rather than upstream's O(roster × tabs) nested loop. **One deliberate divergence:** upstream's function only ever writes `!0` and has no branch that clears the flag, so a member who leaves stays lit until something rebuilds the tab list. Ours goes back to false, which is what the dot claims to mean.

**medium** · `missing-behaviour` · reference byte **2,203,228**

```
checkUserOnlineStatus(){if(this.privChatVisible&&this.appService.globals.roster&&this.chatTabs)for(const e of this.appService.globals.roster)for(const i of this.chatTabs)i.uid===e.userXrefID&&(i.online=!0)}
```

**Ours:** private-chat.svelte.ts:268-278 builds every server tab with `online: false` and nothing later consults the roster; only a peer created locally by `ingest` (:357) gets `online: true`. The reference recomputes it on `getRoster`, `onUserJoin` and `onUserLeave` (subscribers read in the ngOnInit block starting at 2200160). Consequence: the `bg-success` dot at PrivateChatPanel.svelte:325 is permanently grey for anyone on the loaded tab strip.

> Verified: I could not refute it. The `tabs` getter hard-codes `online: false` for every server-supplied conversation and the class has no access to the roster at all — `RoomPrivateChat`'s constructor options inject only `selectRosterUser` (a click handler), never a roster thunk, so no roster frame can reach the tab strip.

### G17 — The clear-search button does not clear the input when the typed term was never submitted

**BUILT 2026-08-30 08:40 UTC.** `searchTerm = ''` before `onsearch('')`, and the order is the fix — `o.value = ""` then `onEnterSearchChat("")` at byte 2,195,340. The local `$state` is written rather than the DOM node, because `bind:value` owns that element and reaching past a binding to set `.value` is how the two disagree.

**medium** · `defect` · reference byte **2,195,340**

```
d(7,"span",34),x("click",function(){D(e);const o=It(6),s=g();return o.value="",E(s.onEnterSearchChat(""))})
```

**Ours:** PrivateChatPanel.svelte:281 `onclick={() => onsearch('')}` — it never writes the input's own value. `searchTerm` is `$bindable()` (:127) but +page.svelte:1403 passes it UNBOUND (`searchTerm={privateChat.searchTerm}`), so the local value only resets when the parent's value changes. Type "abc" without pressing Enter, then click clear: `RoomPrivateChat.search('')` (private-chat.svelte.ts:562-568) sets `#searchTerm` from '' to '' — no prop change — and the input still reads "abc". The reference sets `o.value=""` explicitly for exactly this case.

> Verified: I tried to refute this and could not. The clear button at PrivateChatPanel.svelte:281 is `onclick={() => onsearch('')}` and nothing else — there is no `$effect` anywhere in PrivateChatPanel.svelte (grep for `$effect` in that file returns zero lines), no element ref, and no write to the input's own `.value`.

### G18 — The whole body is gated on `tabs.length > 0`; the reference gates only the LIST column on it

**BUILT 2026-08-30 08:40 UTC.** Two independent gates, as `O(16, o.chatTabs && o.chatTabs.length > 0 ? 16 : -1), O(17, "" !== o.currUser ? 17 : 18)` has at byte 2,219,468. The window this closes is between `openFromRoster` and `getAllPCLogs` returning: a selected peer and no tabs yet, where the panel used to say "No active chat" and show no composer, then change its mind.

**medium** · `divergence` · reference byte **2,219,468**

```
m(),O(16,o.chatTabs&&o.chatTabs.length>0?16:-1),m(),O(17,""!==o.currUser?17:18))
```

**Ours:** PrivateChatPanel.svelte:307 wraps BOTH the `.pc-list` column and the `.pc-logs` column in `{#if tabs.length > 0}`, with a single "No active chat" in the `{:else}` at :389. In the reference the two regions are independent: with zero tabs but a selected `currUser` — the window between `openFromRoster` and `getAllPCLogs` returning — the conversation and composer still render. Ours shows "No active chat" and no composer in that state.

> Verified: I could not find it built anywhere. In the reference the two regions are siblings with independent gates: at offset 2219390 `d(15,"div",19),H(16,rEe,4,1,"div",20)(17,fEe,5,3,"div",21)(18,_Ee,3,1),u()()` and at offset 2219743 `O(16,o.chatTabs&&o.chatTabs.length>0?16:-1),m(),O(17,""!==o.currUser?17:18))`.

### G5 — `pmLogsOnRight` side-swap (`flex-row-reverse` on `.pc-body`) is not applied

**BUILT 2026-08-30 09:20 UTC.** `class={['d-flex h-100 pc-body', { 'flex-row-reverse': pmLogsOnRight }]}` — `YDe = t => ({"flex-row-reverse": t})` at offset 2,194,594, applied at 2,219,468. The preference is now HELD by `RoomPrefs` as well, which it was not: the settings modal wrote it and persisted it and nothing in the room ever read it back, so the toggle changed its own state and nothing else. It defaults FALSE where its neighbours default true, because `!== false` would have flipped every existing member's panel on the first load after this shipped. The class rather than two orderings of the markup, because DOM order is the reading order a screen reader and the tab key follow.

**medium** · `missing-control` · reference byte **2,219,468**

```
z("ngClass",ct(7,YDe,o.appService.globals.preferences.pmLogsOnRight))
```

**Ours:** PrivateChatPanel.svelte:306 renders `<div class="d-flex h-100 pc-body">` with no conditional class and no `pmLogsOnRight` prop. `YDe=t=>({"flex-row-reverse":t})` is at offset 2194594. The preference IS written by the settings modal (ModalHost.svelte:1611 `onPreferenceChange('pmLogsOnRight', !previous)`) and is explicitly NOT in `dead-preference-keys.ts:43`, so the toggle currently has no reader — a control whose only effect is changing its own state.

> Verified: The `pmLogsOnRight` preference is written but never read anywhere in apps/room/src. PrivateChatPanel.svelte:306 renders `<div class="d-flex h-100 pc-body">` as a static class string; the component's props list (PrivateChatPanel.svelte:118-138, 19 props) has no layout/side prop, and the render site at +page.svelte:1440-1463 passes none.

### G6 — Tab list is rendered in the wrong order — the reference reverses it so the most recent conversation is first

**BUILT 2026-08-30 08:40 UTC.** `const orderedTabs = $derived([...tabs].reverse())` — `pt(e.chatTabs.slice().reverse())` at byte 2,196,816. The reversal is for DISPLAY only and the model stays ascending, which is the reference's own ordering and what every other reader of the getter expects. A spread rather than `reverse()` in place, because that mutates the array the caller still holds.

**medium** · `missing-behaviour` · reference byte **2,196,816**

```
function rEe(t,n){if(1&t&&(d(0,"div",20),ht(1,oEe,8,9,"button",39,qDe),H(3,sEe,5,0,"div",40),u()),2&t){const e=g();m(),pt(e.chatTabs.slice().reverse()),m(2),O(3,e.getAllPCLogsLoading?3:-1)}}
```

**Ours:** PrivateChatPanel.svelte:314 renders `{#each tabs as tab (tab.uid)}` in the order the getter produces, and `private-chat.svelte.ts:287-289` sorts ASCENDING by last activity ("the most recent sits last", matching the reference's `chatTabs.push(o)` in `newMessage` @2205471). The reference then reverses for display, so the newest conversation is at the TOP of `.pc-list`; ours puts it at the bottom.

> Verified: Could not refute. The reference builds `chatTabs` most-recent-LAST (splice-then-push in `newMessage`, observed at offset 2205766: `o=this.chatTabs.splice(a,1)[0]` ...

### G7 — No `getAllPCLogsLoading` state — neither the tab-strip loader nor the "Loading private chats" empty pane exists

**MEASURED REFUSAL — recorded 2026-08-30 09:20 UTC, deliberately NOT built.** Upstream needs that flag because it POSTs `getAllPCLogs` when the panel opens. This room does not: the conversation list is `loadConversations(...)` at `+page.server.ts:743`, resolved before the page renders and delivered with it, and the only thing that refreshes it is `invalidateAll()`, which keeps the previous list on screen while it runs. **There is no instant at which the strip exists and its contents are unknown**, so both of the reference's loading branches would be branches that can never render — which is a branch that can never be checked, the same call made for the note carousel's file browser earlier today. The paragraph lives at the code, and it names what would make the flag real (fetching the list on open) so a future change finds the two waiting empty states rather than rediscovering them from the capture.

**medium** · `missing-behaviour` · reference byte **2,196,694**

```
function sEe(t,n){1&t&&(d(0,"div",40)(1,"div",47),v(2,"Loading all private chats."),u(),d(3,"div",47),v(4,"Please wait..."),u()())}
```

**Ours:** PrivateChatPanel.svelte:389 and :337 both render the same static `<div class="flex-fill p-3 text-center">No active chat</div>`. The reference's `_Ee` (@2199521) picks between `mEe` " Loading private chats. Please wait... " (@2199404) and `gEe` " No active chat " on `getAllPCLogsLoading`, and `rEe` appends `sEe` inside the tab column while loading. Grepping apps/room/src for "Loading all private chats" and "Loading private chats" returns 0 hits.

> Verified: I could not refute it: the loader is genuinely absent from apps/room/src. PrivateChatPanel.svelte:337 and :389 both render the static "No active chat" div with no loading branch, and RoomPrivateChat has only #peerHistoryLoading (the moderator peer-history modal, private-chat.svelte.ts:156/238/492) — nothing for the tab list.

### G8 — Header tab close (`closeTab`) does not deselect the open thread

**BUILT 2026-08-30 09:20 UTC.** `closeTab()` on the panel state, wired to `onclosepeer`. It clears the peer, the search, the results bucket and the draft, then calls `onCleared` — which is what clears `selectedMessageUser`, the only thing the old wiring did. The header tab used to vanish while the thread and composer stayed: a conversation with nobody's name on it. Kept SEPARATE from `close()`, which is the panel's own X and hides the panel as well; the reference's two are two for the same reason.

**medium** · `missing-behaviour` · reference byte **2,205,022**

```
closeTab(e){this.user=null,this.recvdUser=null,this.currUser="",console.log("closeTab with uid: ",e)}
```

**Ours:** +page.svelte:1405-1408 wires `onclosepeer` to `userActions.clearSelectedMessageUser(); messageActions.clearSelected();` only. `privateChat.peerId` is untouched, so PrivateChatPanel.svelte:336 still takes the `currentUserId !== null` branch: the header tab vanishes but the thread and composer remain. The reference clears `currUser`, which by the update block `O(17,""!==o.currUser?17:18)` (@2219468) falls back to the empty pane. Note `RoomPrivateChat.close()` (private-chat.svelte.ts:552-559) DOES clear it for the X button — the gap is only on the tab close.

> Verified: Confirmed not implemented. The header tab's × is wired at +page.svelte:1451-1454 to `userActions.clearSelectedMessageUser(); messageActions.clearSelected();` only.

### G19 — No "Loading..." spinner badge while a page is in flight

**ALREADY BUILT — verified by reading 2026-08-30 08:40 UTC, not rebuilt.** The two exclusive branches are in the panel — `{#if hasMore && !searching}` for the badge, `{:else if loadingMore}` for the spinner — which is `O(2, …), O(3, o.isLoadingMore ? 3 : -1)`.

**low** · `missing-behaviour` · reference byte **2,191,172**

```
function zDe(t,n){1&t&&(d(0,"div",2)(1,"span",5),T(2,"i",6),v(3," Loading..."),u()())}
```

**Ours:** PrivateChatPanel.svelte:346-359 renders the Load More badge and nothing else; there is no `isLoadingMore` prop or state and no `badge badge-warning` + `fas fa-spinner fa-spin` variant. `RoomPrivateChat.loadLog` (private-chat.svelte.ts:408) tracks no in-flight flag, so a second click during a slow fetch fires a duplicate request.

> Verified: The reference's app-privchatscroller renders TWO independent branches inside .pc-messages: the clickable "Load More" badge ($De, gated on hasMoreData && !searchTerm) and a separate non-clickable spinner badge (zDe, gated on isLoadingMore) whose consts are [1,"badge","badge-warning"] plus [1,"fas","fa-spinner","fa-spin"] with the text " Lo…

### G21 — Composer textarea: placeholder has two dots not three, and `name`/`spellcheck`/`form-control` are missing

**BUILT 2026-08-30 08:40 UTC.** All four, from the const at byte 2,217,341 — `name="txt-area"`, `spellcheck="true"`, `class="txt-area form-control"` and the three-dot placeholder. `form-control` is the one that is not cosmetic: it gives the box its border, padding and focus ring, where the `w-100` standing in its place only made it wide. The structure is corrected too — the flex row moves off `#textAreaHolderPM` onto the capture's inner `div.d-flex.mx-0`, with a `div.flex-fill.px-0` around the textarea, which is the element G1's button column attaches to. The whole composer const table (50, 52, 53, 54, 55, 56) is transcribed in the comment, including the two entries belonging to rows still open.

**low** · `wrong-constant` · reference byte **2,217,341**

```
["name","txt-area","id","textAreaTxtPM","rows","1","spellcheck","true","placeholder","Type your message here...",1,"txt-area","form-control",3,"keyup","paste","focus"]
```

**Ours:** PrivateChatPanel.svelte:370-374: `class="txt-area w-100"`, `placeholder="Type your message here.."` (two dots), no `name="txt-area"`, no `spellcheck="true"`. Related: the holder at :369 carries `class="d-flex align-items-center textSendDiv"` where the reference const is `["id","textAreaHolderPM",1,"textSendDiv"]` with an inner `div.d-flex.mx-0` (read in the consts tail at 2217285-region) — the flex row is on the wrong element.

> Verified: I could not refute this. Our PrivateChatPanel composer genuinely lacks the attributes and the wrapper structure, and nothing elsewhere in apps/room/src supplies them.

### G23 — Delayed re-scroll fires at 60 ms; the reference uses 500 ms

**BUILT 2026-08-30 08:40 UTC.** `PRIVATE_CHAT_RESCROLL_MS = 500`, exported so the contract reads the value rather than restating it. The second scroll exists because the first runs against a box whose height is not final — avatars still loading, a long message not yet wrapped — and 60ms fired before either settled, so it re-scrolled to the same wrong place and a conversation opened part-way up its own last message. A `setTimeout` and not `tick()`, which is the opposite of the choice made in `CarouselDialog` and for the opposite reason: what is being waited for is the BROWSER finishing layout, which Svelte does not know about.

**low** · `wrong-constant` · reference byte **2,191,427**

```
scrollToBottom(e=!1,i=!1){try{P("scrollPCLogToBottom called on log....force:"+e+". parent:",this.scrollRef.nativeElement.parentElement),this.scrollRef.nativeElement.scrollTop=this.scrollRef.nativeElement.scrollHeight;const o=this;setTimeout(()=>{P("scrolling delayed.... SH:"+o.scrollRef.nativeElement.scrollHeight),o.scrollRef.nativeElement.scrollTop=o.scrollRef.nativeElement.scrollHeight,P("scrolling delayed.... ST:"+o.scrollRef.nativeElement.scrollTop)},500)}catch{}}
```

**Ours:** private-chat.svelte.ts:383-390 `scrollToBottom()` runs immediately then `setTimeout(run, 60)`. The 500 ms is what lets late-loading avatars and wrapped rows re-flow before the second scroll; 60 ms fires before that.

> Verified: I could not refute this. Our private-chat re-scroll delay is a bare literal 60 and it is the only delay in the private-chat scroll path; nothing anywhere in apps/room/src schedules a 500 ms private-chat re-scroll.

### G25 — Clearing the search refetches from the server; the reference restores the cached log locally

**BUILT 2026-08-30 09:20 UTC.** Two buckets, as the capture has: `privChatSearchResults` beside `privChatLog[currUser]`, with `log` picking between them. Clearing a search is now a local swap with no request — `privChatSearchResults = []` then `msgs = privChatLog[currUser]` at byte 2,209,001. It used to overwrite the one thread array, so clearing cost a round trip AND discarded every older page the reader had already loaded, sending them back to press `Load More` from the bottom again. The results bucket is cleared on `switchToUser` and on both closes, because results belong to the thread that produced them.

**low** · `divergence` · reference byte **2,209,001**

```
clearSearchTerm(){this.pmSearchTerm="",this.appService.guiEventBus.emit("setSearchTermPC",{searchTerm:this.pmSearchTerm,uid:this.currUser}),this.appService.globals.privChatSearchResults=[],this.msgs=this.appService.globals.privChatLog[this.currUser],this.appService.appEventBus.emit("scrollPCLogToBottom",{force:!0,repeat:!0})}
```

**Ours:** private-chat.svelte.ts:562-568 `search(term)` always calls `loadLog(peerId, 0, term.trim())`, so clearing a search costs a round trip and discards any pages the reader had already loaded. The reference keeps search results in a SEPARATE bucket (`privChatSearchResults`) and swaps `msgs` back to the untouched `privChatLog[currUser]`; ours overwrites the one thread array with the search results at :417-421 (`page === 0 || searchTerm ? incoming : …`).

> Verified: Could not refute. Our private-chat search has no separate results bucket and no local restore: `search(term)` at private-chat.svelte.ts:562-568 unconditionally awaits `loadLog(this.#peerId, 0, term.trim())`, so clearing the box costs a server round trip; and loadLog at :418-421 writes the answer into the single `#threads[peerId]` array (`…

### G27 — Title-flash notification interval is absent (recorded elsewhere as a known gap)

**BUILT 2026-08-30 10:40 UTC**, and the tripwire that guarded its absence is what said so. `moderator-message-contract.test.ts` named this as one of two consumers deliberately unbuilt with an assertion designed to fire when either appeared — *"this assertion exists so that adding either without updating that document fails here"* — and it fired. That assertion is narrowed to the one that IS still a gap (the transcript window's `&name=`), and `private-chat-strip-contract.test.ts` now asserts the string is present in the module that owns it, so the two together still say where it may and may not appear.

The title alternates every two seconds between the room's name and `<sender> messaged you - <room>`, for a message that is not mine and only while the composer does not have focus — `(!$("#textAreaTxtPM").is(":focus") || !window.onfocus) && !e.isMine` at byte 2,207,480. It stops on `onTextareaFocus`, on closing the tab and on closing the panel, each transcribed from its own site. A restart names the LATEST sender, which is upstream's first line in `newMessage`.

**Why it matters more than the sound already there:** a private message arriving in a background tab produced a `pling` and nothing else, and a muted tab, headphones carrying the presenter's audio, or a browser suppressing sound before any click each make that no signal at all. `private-chat-title-flash.ts` owns the interval and the title; the panel decides when. The clear is conditional and the restore is not, so a panel closing with no flash running cannot overwrite a title something else had set.

**low** · `missing-behaviour` · reference byte **2,205,471**

```
(!Ao("#textAreaTxtPM").is(":focus")||!window.onfocus)&&!e.isMine&&(this.notificationInterval=setInterval(()=>{document.title=this.appService.globals.sessionName===document.title?`${e.n} messaged you - ${this.appService.globals.sessionName}`:this.appService.globals.sessionName},2e3))
```

**Ours:** Not implemented, and deliberately so: `moderator-message-contract.test.ts:112` asserts `expect(pageCode).not.toContain('messaged you -')`, with the comment at :103-110 naming it as one of two recorded consumers still missing and pointing at `docs/decoded/missing-settings-triage.md`. `private-chat.svelte.ts:542-545` quotes the `closePanel` half (clearInterval + restore title) inside a comment with no code behind it. Listed here for completeness of the two-sided audit, not as an unrecorded gap.

> Verified: I could not find the title-flash notification interval implemented anywhere in apps/room/src, under this or any other name, and the repository's own contract test actively asserts its absence. What I searched (all under apps/room/src, node_modules excluded): `messaged you` (3 hits, all prose/assertions — none executable), `document.title`…

---

## RoomMessage.svelte

19 verified gaps; 41 reference behaviours confirmed present.

### RM-01 — app-st-compactmessage has its own component stylesheet; our compact branch renders inside the app-st-message host and inherits the CARD styles

**BUILT 2026-08-30 11:20 UTC.** Two hosts, one per mode — the reference's own split, since `app-st-message` and `app-st-compactmessage` are two components with two `styles:[…]` blocks — and `lib/styles/compact-message.css`, the compact component's block transcribed from bundle bytes 1,400,248–1,404,709.

**It could not come from the generator, and that is why it is a separate file.** `captured-runtime-components.css` is generated from `css/complete-app-styles.css`, and that capture carries exactly ONE `.msg-box[…]` scope — `ng-c1254915701`, the card. There is no second one. The compact component's rules exist only inside the JavaScript bundle, so no run of `pnpm css:sync-captured` can produce them and editing the generated file by hand is what its own header forbids. The new file states that provenance at the top; it is the only hand-written captured sheet in the tree.

**NOT a component per mode.** The compact branch reads two dozen values off `RoomMessage` — every gate, both formatters, the menu's allow-list, six style deriveds — so a component taking those as props would be two dozen props whose only purpose is to reach back. That is the trade `source-size-contract` records for the note editor's toolbar, made again: the seam the REFERENCE draws is the host element and its stylesheet, and that is exactly what crossed. The date separator became a `{#snippet}` so there is still exactly one implementation, which `alert-chat-style-contract` asserts.

**medium** · `missing-behaviour` · reference byte **1,400,248**

```
.msg-box[_ngcontent-%COMP%]{font-weight:100;font-size:14px
```

**Ours:** RoomMessage.svelte:578 opens `<app-st-message>` for BOTH modes and the compact branch is nested inside it (RoomMessage.svelte:585-744), so compact rows are styled by `app-st-message .msg-box` (16px), `app-st-message .avatar img` (35px) and `app-st-message .username` (font-weight 900). The reference's compact block pins 14px / 25px / font-weight 800 (verified at 1400248, 1401045, 1401137) and also carries `.nowrap{white-space:nowrap;display:table}` (1404334), `.reactions-container{margin-left:20px}` (1404652), `.uploaded-img{max-width:150px;max-height:150px}` (1403092) and `.presenter-reactions-right{margin:0 0 0 -50px}`. `grep -c app-st-compactmessage src/lib/styles/captured-runtime-components.css` returns 0 — the whole scoped section is absent from our transcription, and our compact markup uses `nowrap` (RoomMessage.svelte:659) and `reactions-container` (RoomMessage.svelte:726), neither of which any rule in our tree defines.

> Verified: I could not refute it; the claim is accurate on every point I checked, and our own CHANGELOG corroborates it. (1) MARKUP: RoomMessage.svelte:578 opens <app-st-message> unconditionally and the compact branch {#if displayMode === 'c'} runs 585-744 nested inside it, with no app-st-compactmessage host of its own (line 587 is a comment).

### RM-02 — Compact ALERT row has no "Ask a question" button and no `short` timestamp — our compact branch renders the bracketed chat time for every kind

**BUILT 2026-08-30 11:20 UTC.** The compact row branches on the log as `O(26, "alerts" === e.logType ? 26 : 27)` does at byte 1,380,680: `r_e` gives the alerts row a `[1,"created-at","mr-2",3,"ngStyle"]` span with Angular's `short` date — `M/d/yy, h:mm a`, which is what `alertDateFormatter` already produces for the card — and the `alert-qa` button gated `!isQAMsg && hasQAOnAlerts`, with the `btn-danger animated flash` unread marker. `a_e` keeps the bracketed `h:mm a` for chat. An alerts log switched to compact mode had lost the Q&A entry point entirely, and the button now has a rule to be styled by, since `.alert-qa` is in the compact block too.

**medium** · `missing-control` · reference byte **1,377,704**

```
Ze(Ct(3,3,e.msg.t,"short")),m(2),O(4,!e.isQAMsg&&e.appService.globals.sessData.hasQAOnAlerts?4:-1)
```

**Ours:** The reference's compact member row branches `O(26,"alerts"===e.logType?26:27)` (in b_e at 1380680): `r_e` (1377512) is the ALERTS row — a `short` date plus the `alert-qa` button `s_e` (1377129) gated `!isQAMsg && hasQAOnAlerts` — and `a_e` (1377804) is the chat row. The compact consts array carries the button verbatim at 1401207-region (`["title","Ask a question",1,"btn","btn-sm","btn-secondary","me-1","alert-qa",3,"click","ngClass","ngStyle"]`, offset 1399478). Our compact branch has no `alert-qa` node at all and always renders `[{compactTimeFormatter}]` (RoomMessage.svelte:655-664). An alerts log switched to compact mode therefore loses the Q&A entry point and the unread-QA `btn-danger animated flash` marker entirely.

> Verified: Our compact branch has no alert-qa node and no per-kind timestamp branch. RoomMessage.svelte:585 opens `{#if displayMode === 'c'}` and it runs to the `{:else}` at line 744; within 584-744 the only kind/alert references are the reaction-popover id (612), the tooltip formatter (657), the stars gate (694) and the answered-check (705) — there…

### RM-03 — Compact body drops mentionColor / questionColor

**BUILT 2026-08-30 11:20 UTC.** A `bodyColorClasses` derived carrying the two conditions once, applied by the card body and both compact bodies — `Kn(13, Ew, e.msg.isMention && !e.hasCustomFollowedUserColors, e.msg.txt.includes("?") && !e.hasCustomFollowedUserColors)`, which the compact member body `p_e` and reply body `f_e` read exactly as the card's does. A member mentioned in compact mode got no highlight at all, and the mention colour is the one signal that says a message is addressed to you.

**medium** · `missing-behaviour` · reference byte **1,378,659**

```
Kn(13,Ew,e.msg.isMention&&!e.hasCustomFollowedUserColors,e.msg.txt.includes("?")&&!e.hasCustomFollowedUserColors)
```

**Ours:** `Ew=(t,n)=>({mentionColor:t,questionColor:n})` is defined at 1366821 and applied by the compact member body `p_e` (1378508) and reply body `f_e` (1378951); the compact admin body const 25 likewise carries `ngClass`. Our compact body divs (RoomMessage.svelte:700-724) carry only layout classes — `messageBodyClass`, which is where our mention/question colours live (RoomMessage.svelte:276-278), is used ONLY by the card branch (RoomMessage.svelte:878, 881, 887). A member mentioned in compact mode gets no highlight.

> Verified: Confirmed, not refuted. In the reference both compact branches of `app-st-compactmessage` bind the mention/question ngClass: member body `p_e` and member reply body `f_e` use `Ew=(t,n)=>({mentionColor:t,questionColor:n})`, and the admin body `B1e` (const 25) uses `b1e=(t,n,e)=>({mentionColor:t,questionColor:n,"presenter-msg-right flex-fil…

### RM-04 — Compact reaction strip has no add-reaction pill

**BUILT 2026-08-30 11:20 UTC.** `g_e` at byte 1,380,270, gated as both compact containers gate it — `O(3, "chat" === e.logType || "alerts" === e.logType && e.isQAMsg ? 3 : -1)`. In compact mode a reaction could previously be added ONLY through the kebab menu, which is the control a member is least likely to open for something the card offers in one click. `menuAllows.reaction` still gates the strip, so this room's own answer and the capture's compose rather than duplicate.

**medium** · `missing-control` · reference byte **1,380,270**

```
function g_e(t,n){if(1&t){const e=Y();d(0,"span",52),x("click",function(){return D(e),E(g(3).addReaction())}),T(1,"i",37),u()}
```

**Ours:** The compact reactions containers `__e` (1380430, member) and `$1e` (1371909, admin) both end with `O(3,"chat"===e.logType||"alerts"===e.logType&&e.isQAMsg?3:-1)` selecting the add-reaction pill (`g_e` / `H1e`, const 52 = `placement auto … badge chat-reaction … ngbPopover`). Our compact reaction strip (RoomMessage.svelte:725-741) renders existing pills only; the trailing add pill exists solely in the card branch (RoomMessage.svelte:981-992). In compact mode a reaction can only be added through the kebab menu.

> Verified: I tried hard to refute this and could not. Reference side confirmed by reading bytes, not by search-and-assume: the compact component's consts array (parsed from `consts:` at offset 1395760) has entry 65 = `[1,"reactions-container",3,"ngStyle"]` (member) and entry 26 = `[1,"reactions-container",3,"ngClass","ngStyle"]` (admin), entry 52 =…

### RM-05 — Card admin/member branch: the reference compares against `"alert"` (singular), which is never a logType, so an ADMIN ALERT takes the reversed admin card

**BUILT 2026-08-30 11:22 UTC — and the row's own caveat is RESOLVED rather than inherited.** The row called this "a candidate rather than a certainty" because the captured DOM might be the better authority and is absent from this checkout. It still is; the bundle settles it without the capture. Every `logType` literal in it was enumerated: **32 `alerts`, 23 `chat`, 3 `pc`, and exactly 2 `alert`** — and those two are these render gates and nothing else. A term that can never be false is not a term. The compact renderer's extra clause is `"pc" != o.logType` (byte 1,400,148), which IS live and never reaches this component because a private message renders through `CompactMessageRow`; and the box class states the same gate with no term at all, `ct(30, o6, e.msg.isA)` at 1,334,988 and `ct(27, o6, e.msg.isA)` at 1,343,627 where `o6 = t => ({"msg-box-adm": t})`. **A gate written twice, once with a dead condition and once without, is the reference telling you which one it meant.** So `reverseMessage` and `messageBoxClass` drop the `kind === 'chat'` term: an alert posted by a presenter now takes the reversed admin card. Captured rows are unaffected — `evidenceDirection` and `evidenceMessageBoxClass` still win outright, which `admin-direction-contract.test.ts` asserts alongside the enumeration, read from the pinned bundle at run time rather than quoted.

**medium** · `divergence` · reference byte **1,361,597**

```
o.msg.isA&&"alert"!=o.logType?3:4
```

**Ours:** The reference's logType values are `chat` / `alerts` / `pc` (see doMsgDelete at 1352430-region), so `"alert" != logType` is always true and the card gate reduces to `msg.isA` — an admin-authored ALERT renders through `Bge` (`mr-1 d-flex flex-row-reverse`, const 8) rather than `f1e` (`mr-1 d-flex flex-row`, const 56). Ours: `reverseMessage = kind === 'chat' && isAdminMessage` (RoomMessage.svelte:201-205), so an admin alert always renders as the member/forward card unless `item.evidenceDirection` overrides it. Flagged as a candidate rather than a certainty: the captured DOM (via `evidenceDirection`) may be the better authority on what actually shipped, and I could not check it — the capture roots are absent from this checkout.

> Verified: Not implemented anywhere in apps/room/src. The reference card gate is `o.msg.isA&&"alert"!=o.logType?3:4`; I enumerated every logType literal in the bundle and "alert" (singular) is never assigned — only "alerts", "chat" and (by comparison) "pc" — so the term is unconditionally true and the gate reduces to `msg.isA`.

### RM-06 — parseStock's preceding-character guard is not reproduced — a ticker glued to a non-space character is left uncoloured upstream

**BUILT 2026-08-30 11:22 UTC.** The guard, in `#lib/message-body-segments.ts` — a ticker is coloured when it starts the body or when a LITERAL space precedes it, and `foo$AAPL`, `($AAPL` and a tab-indented `\t$AAPL` are plain text, as they are upstream. `atBodyStart` is threaded through the label and trade passes rather than measured, because upstream runs over ONE string those passes have already rewritten into markup: a ticker at offset 0 of a later piece sits immediately after a `>` there, which is not a space, so the two implementations agree character for character. **What is deliberately NOT reproduced** is `a = e.indexOf(r)` — the first occurrence of the matched text ANYWHERE in the body rather than this match's position, which makes upstream decide both of ` $AAPL foo $AAPL` from position 0 and, on the second pass, substitute inside the span the first pass produced. That is a defect whose only effect is nested markup; the positional RULE is transcribed and the aliasing is not, and the code says so where the next comparison will read it. `ticker-colour-contract.test.ts` renders all five cases.

**medium** · `missing-behaviour` · reference byte **1,327,300**

```
if(!(a>0&&" "!=e.charAt(a)))
```

**Ours:** `parseStock` (1327180-region) computes `var a=e.indexOf(r)` for each regex match and SKIPS the substitution when `a>0 && " "!=e.charAt(a)`. So `foo$AAPL` renders as plain text upstream while ` $AAPL` and a leading `$AAPL` are coloured. Our `parseTickersAndLinks` (RoomMessage.svelte:418-444) splits on the same regex and emits a `stock` segment for every match with no positional guard, so `foo$AAPL` is coloured here.

> Verified: I read the reference bytes and confirmed the guard, then searched apps/room/src exhaustively for any counterpart and found none. REFERENCE (read, not searched): at byte offset 1327300 of apps/room/docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js the bytes are `if(!(a>0&&" "!=e.charAt(a)))`, inside `parseStock(e,i,o){var s=e.match(new Re…

### RM-07 — questionColor is gated on `kind === 'chat'` here; the reference applies it on alerts too

**BUILT 2026-08-30 11:20 UTC.** The gate was ours: the reference's two conditions mention no log type. An alert containing a question mark is tinted upstream and was not here — which matters most on the surface where questions are the point, since `hasQAOnAlerts` exists to invite one.

**medium** · `divergence` · reference byte **1,331,638**

```
e.msg.txt.includes("?")&&!e.hasCustomFollowedUserColors
```

**Ours:** The reference's question term has no logType factor in any of the four body templates (card 1331638, compact 1378659). Ours: `isQuestion = item.evidenceQuestion ?? (kind === 'chat' && item.body.includes('?') && followedStyle === undefined)` (RoomMessage.svelte:272-275), so an alert containing `?` never gets `questionColor`.

> Verified: I could not refute it. Ours emits `questionColor` from exactly one place, RoomMessage.svelte:277, driven by `isQuestion` at :272-275, which requires `kind === 'chat'`.

### RM-08 — Compact menu labels differ from the card's and we render one label set for all three variants

**BUILT 2026-08-30 11:22 UTC.** `MESSAGE_MENU_TEXT` in `message-behavior.ts`, keyed by renderer, and `MessageMenu.svelte` picks the row from its own `variant` so a call site cannot render the wrong words. **Every `\xa0\xa0`-prefixed label literal in the bundle was enumerated first** — four complete menus, the card at 1,329,046-1,330,950 and 1,336,386-1,338,290, the compact admin at 1,367,382-1,369,287, the compact member at 1,374,766-1,376,671 — which establishes the row's scope as exactly three rather than approximately three: nine entries are byte-identical across all four, trailing spaces included (`Mark Answered ` and `Private Chat ` carry one everywhere; `Edit` and `Copy` carry none anywhere). `MESSAGE_MENU_LABEL` is untouched and stays the capture-matching LOOKUP; the contract asserts the two agree on the card so they cannot drift.

**low** · `wrong-constant` · reference byte **1,368,194**

```
\xa0\xa0Show Send Report
```

**Ours:** Both compact templates use `\xa0\xa0Show Send Report ` (1368194, 1375577), `\xa0\xa0Show message to all ` WITH a trailing space (1368006, 1375390) and `\xa0\xa0Reply ` WITH a trailing space (1368367, 1375751), against the card's `\xa0\xa0Alert Send Report ` (1329857), `\xa0\xa0Show message to all` (1329670) and `\xa0\xa0Reply` (1330031). `MessageMenu.svelte` renders one set for all three variants — `Alert Send Report` at :229, `Show message to all` at :217, `Reply` at :240 — and `MESSAGE_MENU_LABEL` (message-behavior.ts:3-16) has one string per entry.

> Verified: I could not refute it. Reference side confirmed by direct read: the card family (app-st-message) uses "\xa0\xa0Show message to all" (no trailing space), "\xa0\xa0Alert Send Report " and "\xa0\xa0Reply" (no trailing space), while BOTH compact template branches (app-st-compactmessage) use "\xa0\xa0Show message to all ", "\xa0\xa0Show Send R…

### RM-10 — Compact ADMIN timestamp is " [h:mm a] " with surrounding spaces; ours emits the member form for both rows

**BUILT 2026-08-30 11:22 UTC.** ` [` / `] ` on the admin row, `[` / `]` on the member's, written as EXPRESSIONS rather than as template whitespace — Svelte normalises runs of whitespace around a text node, so ` [` typed into the markup is not reliably ` [`, and a divergence of exactly one space is the kind nothing here would otherwise catch. `compact-mirror-contract.test.ts` renders both rows and matches the whole bracketed run anchored at both ends.

**low** · `wrong-constant` · reference byte **1,374,160**

```
Ne(" [",Ct(29,27,e.msg.t,"h:mm a"),"] ")
```

**Ours:** `z1e` (compact admin, 1372234) renders the stamp with a leading and trailing space; `a_e` (compact member, 1377804) renders `Ne("[",Ct(3,6,e.msg.t,"h:mm a"),"]")` with none. Ours emits `[{…}]` unconditionally at RoomMessage.svelte:663.

> Verified: I could not find the compact-ADMIN spaced stamp anywhere in apps/room/src. `compactTimeFormatter` has exactly one call site — RoomMessage.svelte:663 — inside the SHARED compact branch, emitting `[{…}]` with no surrounding spaces for both rows; `reverseMessage` is used there only for the enclosing span's class ternary (lines 658-660), neve…

### RM-11 — Compact inner row applies `flex-row-reverse` on presenterMsgsOnTheRight; ours applies `presenter-msg-right`

**BUILT 2026-08-30 11:22 UTC — and it is FOUR nodes, not one.** Reading the row's own byte led to the other three, which bind different lambdas to different consts in the same admin template: const 8 `g1e` → `flex-row-reverse` (this row), const 23 `_1e` → `w-100` when there is a reply and the setting is off / `flex-fill` when it is on, const 25 `b1e` → `presenter-msg-right flex-fill` on the plain body, const 43 `v1e` → `presenter-msg-right` on the reply wrapper. The member template binds NONE of them (consts 55, 64, 75, 76 are plain class lists), which is why every one carries the `reverseMessage` term and why one rendered member row is the negative control for all four at once. `presenter-msg-right` on the inner row was the wrong class from the right component: it sets text-align and margin, so the row's children kept their source order and the setting did nothing a presenter could see.

**low** · `wrong-constant` · reference byte **1,373,250**

```
z("ngClass",ct(30,g1e,e.appService.globals.sessData.presenterMsgsOnTheRight))
```

**Ours:** `g1e=t=>({"flex-row-reverse":t})` is defined at 1366648 and bound to compact const 8 (`w-100 d-inline-flex align-items-center`) by `z1e`. Ours: `class={['w-100 d-inline-flex align-items-center', { 'presenter-msg-right': reverseMessage && presenterMessagesOnTheRight }]}` (RoomMessage.svelte:600-605) — a different class with a different effect (text-align/margin instead of flex direction).

> Verified: I tried to refute this and could not. Both halves of the claim check out against bytes I actually read.

### RM-12 — Compact ADMIN reaction container drops `presenter-reactions-right`

**BUILT 2026-08-30 11:22 UTC.** `y1e` on const 26, admin only — the member container is const 65 and carries `ngStyle` alone. Without it a presenter's compact reactions stayed left while every other part of their row moved right.

**low** · `missing-behaviour` · reference byte **1,371,980**

```
z("ngClass",ct(6,y1e,e.appService.globals.sessData.presenterMsgsOnTheRight))("ngStyle",e.styleF)
```

**Ours:** `$1e` (1371909) binds `y1e=t=>({"presenter-reactions-right":t})` (1366866) to compact const 26 `[1,"reactions-container",3,"ngClass","ngStyle"]`; the member container (const 65) has no ngClass. Ours renders `<span class="reactions-container" style={bodyStyle}>` with no conditional class at RoomMessage.svelte:726, so a presenter's compact reactions never right-align.

> Verified: Confirmed against both sides. In the reference, app-st-compactmessage (selector at offset 1395475) has TWO reaction containers in one consts array (span 1395767-1399985): index 26 = [1,"reactions-container",3,"ngClass","ngStyle"] used by the ADMIN compact template z1e (offset 1372234, root div const 4 = "msg-box msg-box-adm", slot 35 rend…

### RM-13 — `chat-reaction-hover` is applied by our add-reaction pill but by NO reference template — it only exists in the card stylesheet, so the reference pill is always visible

**FIXED 2026-08-30 11:20 UTC, and it had cost a CONTROL.** The class is real and captured — `.msg-box:hover .chat-reaction-hover{display:inline-block}` with `.chat-reaction-hover{display:none}` at byte 1,366,420 — but no reference template applies it. Wearing it meant the add-reaction pill sat at `display: none` until the enclosing `.msg-box` was hovered, and **there is no hover on a phone**: adding a reaction was impossible on a touch device. A rule with no wearer upstream is a rule upstream does not use, and reading one as an instruction is how a stylesheet becomes a spec. The captured RULE stays where it is — that file is evidence, and deleting one because we stopped wearing it would edit the record.

**low** · `invented-value` · reference byte **1,360,390**

```
["placement","auto","container","body","autoClose","outside","popoverClass","popOverDiv",1,"badge","chat-reaction",3,"click","ngbPopover"]
```

**Ours:** The card add pill `h1e` (1342094) uses const 55, quoted above — classes `badge chat-reaction` only. The string `chat-reaction-hover` occurs exactly twice in the whole bundle, at 1366479 and 1366540, and both are CSS rules inside app-st-message's styles (`.msg-box:hover .chat-reaction-hover{display:inline-block}` / `.chat-reaction-hover{display:none}`); no consts array and no template node carries it. Ours puts it on the pill at RoomMessage.svelte:982, and our own transcription of those rules (captured-runtime-components.css:8151-8156) then hides the control until the row is hovered.

> Verified: I could not refute the claim; both halves check out. Our add-reaction pill really does carry `chat-reaction-hover` (RoomMessage.svelte:982) and our transcribed rules really do hide it until the row is hovered (captured-runtime-components.css:8151-8156), and the rule is live for us because `msg-box` is a genuine ancestor (RoomMessage.svelt…

### RM-14 — `answered-check` class is ours; the reference's ✅ div carries `ms-1 private-reply`

**FIXED 2026-08-30 11:20 UTC.** `function Age(t,n){1&t&&(d(0,"div",27),v(1,"\u2705"),u())}` at byte 1,331,360, with const 27 `[1,"ms-1","private-reply"]`. `answered-check` was ours and carried no CSS anywhere in this repository — a class with no rule. The reference reuses the reply wrapper's own classes for the tick, which reads oddly and is what it does.

**low** · `invented-value` · reference byte **1,359,087**

```
[1,"ms-1","private-reply"]
```

**Ours:** The card's `a1e` and the compact `h_e` (1378451) both render `d(0,"div",<27|24>),v(1,"✅")`, and const 27 (card, 1359087) / const 24 (compact) is `[1,"ms-1","private-reply"]`. `answered-check` returns ZERO hits in the bundle. Ours: `<div class="answered-check">✅</div>` at RoomMessage.svelte:706 (compact) and a bare `<div>✅</div>` at :868 (card); grep shows `answered-check` is styled by nothing in our tree either.

> Verified: I tried to refute this and could not. The reference's answered-checkmark div genuinely carries class="ms-1 private-reply"; ours carries an invented "answered-check" in the compact branch and no class at all in the card branch.

### RM-16 — gif placeholder id ignores the extra-chat-column variant

**BUILT 2026-08-30 11:56 UTC.** `extraChatMsg` is `urlwrapImg`'s fourth argument and its only effect is the id — `const c = s ? \`gifExtra_${o}\` : \`gif_${o}\`` at byte 1,326,195. The prop is fed by `ExtraChatPane`, which is the only surface in the room that can know it, and consumed by `MessageBody.svelte`. The row's own note stands and is kept at the code: nothing here resolves anything THROUGH the id — the reveal is keyed by URL because the reference's id is derived from the message, so a message with two gifs gives both the same id upstream — so the duplicate was inert. It was still two elements with one DOM id whenever the extra column was on, and the reference already carries the fix.

**low** · `divergence` · reference byte **1,326,195**

```
const c=s?`gifExtra_${o}`:`gif_${o}`
```

**Ours:** `urlwrapImg`'s fourth argument is `extraChatMsg`, and it switches the placeholder id to `gifExtra_<msgId>`. `RoomMessage.svelte` has no `extraChatMsg` prop and always emits `id="gif_{item.id}"` (RoomMessage.svelte:560), so the same message rendered in both the main log and the extra chat column produces two elements with the same DOM id. (Our own comment at :312-323 notes nothing resolves through the id here, which contains the damage but does not remove the duplicate.)

> Verified: I could not refute this. The reference's `urlwrapImg(e,i,o,s)` selects `gifExtra_${o}` vs `gif_${o}` on its fourth argument, and our RoomMessage.svelte emits `id="gif_{item.id}"` unconditionally with no column-aware input under any name: a case-insensitive grep for "extra" across the whole 1,007-line RoomMessage.svelte returns zero hits,…

### RM-19 — copyMessage mutates msg.txt upstream before writing to the clipboard

**DELIBERATE DIVERGENCE — recorded at the code 2026-08-30 11:20 UTC, not reproduced.** `this.msg.txt = sf(this.msg.txt).result` writes the stripped text back onto the MESSAGE, so copying silently rewrites the one on screen: formatting, links and ticker colouring vanish from the log for everyone looking at that browser, and nothing puts them back. The clipboard content is identical either way. Ours strips into a DETACHED element and leaves the message alone. Recorded rather than silently improved — this is a place where matching the reference would mean reproducing a defect, and the next person comparing the two should find the reason rather than assume the line was missed.

**low** · `divergence` · reference byte **1,355,969**

```
copyMessage(){this.msg.txt=sf(this.msg.txt).result,console.log("copyMessage: ",this.msg.txt),navigator.clipboard.writeText(this.msg.txt),this.alertsService.info("Copied to clipboard.")}
```

**Ours:** Ours strips markup into a local `plainText` and leaves `item.body` untouched (message-actions.svelte.ts:485-492), so the rendered message does not change when it is copied. Almost certainly the right call — recorded as a divergence rather than a match, per the previous stage's note.

> Verified: I could not refute this. Both sides verified by reading.

### RM-20 — doUserInfo's extra-chat-column companion event is not routed

**BUILT 2026-08-30 11:56 UTC.** The chain is three sites seven hundred kilobytes apart, and reading one without the others is why a `grep` for `doUserInfoExtra` concluded the event went nowhere: the emit at 1,352,313, the ONLY subscriber at 2,074,524 (`subscribe("doUserInfoExtra", e => { this.extraChatMsg = e })`, on the user modal), and that modal's own `doMention` at 2,077,087, which reads the stored flag as the first term of the same three-term router the message's kebab uses. So the feature is: open a member's card from the extra column, press @Mention, and the mention lands in the composer you are looking at. `MessageActions` records it on the `user` action and `mentionFromUserModal` supplies it to `mentionTargetIsExtra`, which still owns the `focus === 'textAreaTxtExtra'` half. **One divergence, and it removes a staleness rather than adding one:** upstream emits ONLY when the extra column is involved, so a card opened from the main log with main focus emits nothing and the modal keeps the last extra-column answer; ours records it on every open, which agrees in every case except that one. `message-actions.svelte.test.ts` asserts all four cases through the two composer buffers.

**low** · `missing-behaviour` · reference byte **1,352,030**

```
doUserInfo(e,i){this.appService.getUserInfo(e,i),this.appService.guiEventBus.emit("doUserInfo",e),this.appService.globals.preferences.extraChatColumn&&(this.extraChatMsg||"textAreaTxtExtra"===this.appService.globals.chatInputFocus)&&this.appService.guiEventBus.emit("doUserInfoExtra",this.extraChatMsg)
```

**Ours:** The `doUserInfoExtra` emit sits at 1352313. Ours dispatches `if (action === 'user') this.#openModal('user')` with no extra-column term (message-actions.svelte.ts:375); the `fromExtraColumn` flag it is handed is consumed by `mention` alone (message-actions.svelte.ts:376-378). `grep -rn doUserInfoExtra src` returns zero hits.

> Verified: Not built. Upstream `doUserInfoExtra` exists solely to carry the clicked row's `extraChatMsg` into the user-info modal (`this.extraChatMsg = e`, the ONLY subscriber, bundle 2074490), where the modal's own footer button reads it: `doUserMention(e){$("#user-modal").modal("hide"), emit(preferences.extraChatColumn && (this.extraChatMsg || "te…

### RM-21 — Alerts-log ticker colour comes from localStorage `alertStyle` upstream; ours has no alert-side ticker style

**BUILT 2026-08-30 11:22 UTC, with one gap recorded rather than papered over.** `tickerColorStyle` gives the ticker `parseStock`'s own precedence, which is not the body's: on ALERTS the followed-user style is not consulted at all and a room style IS, and on CHAT the room style applies whether or not the message carries a background of its own — `parseStock` never reads `msg.bkgColor`, while `effectiveStyle` drops to `undefined` for exactly that case because that gate belongs to the BOX. Every `$TICKER` in every alert had been rendering as a bare `stockColor` span. **The gap:** upstream `alertStyle` is separately persisted (`saveAlertStyle`, byte 2,242,440), its default is byte-identical to the chat one (`globals.alertStyle`, byte 980,310, the same five values as `globals.chatStyle` beside it), and this repository has no alert-style editor — so the alert branch reads `chatStyle`, which is upstream's behaviour for every account that has never opened that pane, and the one expression to change when it lands. A prop nothing feeds is what `unfed-props-contract` exists to catch.

**low** · `missing-behaviour` · reference byte **1,327,851**

```
if("alerts"===i){const l=window.localStorage.getItem("alertStyle")
```

**Ours:** `parseStock` reads `followedUsers[avt].followChatStyle.tickerColor` else `chatStyle.tickerColor` for chat (1327332), and `alertStyle.tickerColor` for alerts (1327851), falling through to a bare `<span class="stockColor">` when neither is stored. Ours: `stockStyle = effectiveStyle ? 'color: …tickerColor;' : undefined` (RoomMessage.svelte:264) where `effectiveStyle` for an alert is `followedStyle` only — `chatStyle` is gated on `kind === 'chat'` (RoomMessage.svelte:216-220) and no `alertStyle` prop exists. The bare-span fallback IS correct; the alert-side colour source is missing.

> Verified: No alert-side ticker style source exists in apps/room/src. RoomMessage.svelte:216-220 gates the room style on `kind === 'chat'` (`followedStyle ??

### RM-22 — Card admin body row's `justify-content-end` and the badge/reply wrapper class lists

**BUILT 2026-08-30 11:56 UTC — FOUR findings, and each one has a member control.** Every admin/member pair below is a place where the reference binds on ONE layout, so applying it to both is its own defect: (1) the **badges wrapper**, const 25 admin / const 60 member `d-inline-block flex-shrink-1` with `overflow: hidden` — we rendered badges as direct siblings of the username inside a `flex-nowrap` row, so a member with several badges pushed the timestamp and the kebab out instead of having their badges clipped; the two consts differ by `ngStyle` alone, which `Mge` binds to `styleF`, so the style is gated on the layout exactly as the table has it. (2) **`justify-content-end`**, `dge` at 1,335,936 on const 26, against the member's plain const 65. (3) The **reply block**, which was the same wrong shape as the compact one (RM-25): `Rge` at 1,331,967 and `c1e` at 1,340,691 render `div46 > [ div47 > [strong48, div49], div50 ]`, and ours wore card const **27** — the answered TICK's `ms-1 private-reply` — with the sender's own line INSIDE `private-reply-message` and both bodies on `messageBodyClass`, which lacks the `pe-3 w-100` that fills the row. (4) The **two reaction containers**, which are different ELEMENTS: `Lge` opens `d(0,"span",29)` = `[1,"ms-1",3,"ngClass","ngStyle"]` and `p1e` opens `d(0,"div",6)` = `[3,"ngStyle"]`; ours emitted one `span` with neither base class and applied `presenter-reactions-right` on BOTH layouts, so a member's card right-aligned its reactions whenever the room had the setting on — a thing the reference has no node for. The strip's CONTENTS are one `{#snippet}` with two call sites, because only the wrapper differs. The badge content stays real elements rather than the reference's `innerHTML` of a prebuilt string; that divergence is older than this row and is the safer half.

**low** · `wrong-constant` · reference byte **1,328,315**

```
dge=t=>({"justify-content-end":t})
```

**Ours:** `dge` is bound to card const 26 `[1,"d-flex",3,"ngClass"]` on the ADMIN card only (the member card's node 36 uses const 65, a plain `[1,"d-flex"]`). Ours renders `<div class="d-flex">` for both (RoomMessage.svelte:866). Same family of small class-list divergences on the card: the badges wrapper is const 25 `d-inline-block flex-shrink-1` with `overflow:hidden` upstream and we render badges bare (RoomMessage.svelte:803-813); the reply body is const 43 `msg-left text-formated preText ml-2 mr-2 p-0 pe-3 w-100` and we reuse `messageBodyClass` without `pe-3 w-100` (RoomMessage.svelte:878); the member reactions container is const 6 (ngStyle only) and the admin one is const 29 `[1,"ms-1",…]`, while ours emits neither base class (RoomMessage.svelte:961).

> Verified: I could not find any of the four class-list details implemented anywhere in apps/room/src. (1) justify-content-end: the reference binds it on the admin card's body-row div (const 26 = [1,"d-flex",3,"ngClass"], node 34 of Bge) via dge/presenterMsgsOnTheRight; the member card (f1e node 36) uses const 65 = plain [1,"d-flex"].

### RM-24 — `title="Copy order"` on the trade span has no reference counterpart

**FIXED 2026-08-30 11:20 UTC.** The reference's span is `'<span class="tradeColor" id="id_' + o._id + '">'` at byte 1,414,920 and carries no title, so a member hovering an order in the original sees nothing. `aria-label` takes its place rather than nothing at all, and the two are not the same thing: `title` shows a tooltip to everyone, `aria-label` names the control for a screen reader and is invisible. That span is `role="button"` here — ours, because the capture puts a click handler on a bare span — and a button whose only content is the order text needs a name saying what activating it does.

**low** · `invented-value` · reference byte **1,414,968**

```
o.txt.replace("[{(",'<span class="tradeColor" id="id_'+o._id+'">')
```

**Ours:** The reference's trade span carries `class` and `id` and nothing else; role/tabindex/title/keydown are ours (RoomMessage.svelte:531-546), and `"Copy order"` returns ZERO hits in the bundle. Deliberate and documented a11y additions — recorded so the inventory is complete, not as a defect.

> Verified: I could not refute this one, and the reference half of the claim is confirmed exhaustively rather than assumed. REFERENCE SIDE — absence verified four ways.

---

### RM-25 — Compact reply block wears the answered tick's two classes and nests `private-reply-message` the wrong way round

**BUILT 2026-08-30 11:22 UTC.** Found while building RM-11 and RM-12, by decoding the compact component's consts table (`consts:` at 1,395,760) rather than by looking for it — which is the argument for decoding the whole table instead of the entries a row names.

**medium** · `wrong-markup` · reference byte **1,370,300**

```
d(0,"div",43)(1,"div",44)(2,"strong",45),v(3),u(),T(4,"div",46),u(),T(7,"div",47),u()
```

**Ours:** `U1e` (compact admin, 1,370,300) and `f_e` (compact member, 1,378,850) render `div43 > [ div44 > [strong45, div46], div47 ]`. Compact const 43 is `msg-left text-formated preText ml-2 mr-2 p-0 pe-3 w-100` + `ngClass` (`v1e`, admin only) + `ngStyle`; const 76 is the same list with `ngStyle` alone (member); const 44 is `private-reply-message w-100` + the theme background; const 45 is `d-block username`; const 46 is the quoted body, the only node here carrying the mention/question colours; const 47 is the sender's own text, a direct child of the outer div with no class and no style. We rendered `<div class="ms-1 private-reply">` — compact const **24**, which is the answered TICK's const — with `private-reply-message` as a SIBLING of the name rather than the box that wraps it. So the quoted block had no background, the name had no `username` treatment, neither body carried a colour, and `w-100` was missing from the box that is meant to fill the row.

**Also decoded in passing:** the binding ORDER says which style goes where, and they are not all the body's — div43 and strong45 both take `invertTxtColorToggler(invertTxtColor, "name")` (the NAME inversion, which is `usernameStyle` here and is what the card already puts on the same `d-block username` node), while only div46 takes `styleF`. div47 takes neither and inherits. That asymmetry is the reference's.

*This row was ADDED after this document was committed — found on 2026-08-30 while building RM-11 and RM-12, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### RMSG-01 — `text-primary` on the card username is ours, and it is bound by no reference template that can ever apply it

**FIXED 2026-08-30 22:40 UTC.** `fge = t => ({"text-primary": t})` is defined at byte 1,328,577 and bound EXACTLY ONCE in the whole bundle — `ct(29, fge, e.msg.isA)` at 1,344,339, on card const 59, which is the MEMBER card's username. Both occurrences of the identifier were enumerated and the count is asserted from the pinned bundle at run time, not quoted.

**And that single binding is structurally dead.** The card's branch gate is `O(3, e.msg.isA && "alert" != e.logType ? 3 : 4)` — index 3 is `Bge` (admin), 4 is `f1e` (member), and `"alert"` is never a logType, which RM-05 established by enumerating all four literals. So `f1e` renders precisely when `msg.isA` is FALSE, and `ct(29, fge, e.msg.isA)` is false on every row that can evaluate it. **This is RM-13's shape exactly** — a real class, applied by us and by no reference template — and it is removed for the same reason.

**What it painted:** ours applied it on `kind === 'alert' && isAdminMessage`, which after RM-05 is a row that takes the ADMIN card, whose username is const 24 and carries no `ngClass` at all. So a presenter's name on an alert rendered Bootstrap blue wherever no inline `usernameStyle` outranked it. The `!item.evidenceKey` term settles the provenance: it EXCLUDED captured rows, so the class cannot have been read off a capture. `CARD_USERNAME_TEXT_PRIMARY_REFUSED` in `#lib/message-renderer-differences.js`; one negative control seen red.

**low** · `invented-value` · reference byte **1,344,339**

```
m(),O(23,e.hideAvatar?-1:23),m(3),z("ngStyle",e.styleF),m(),z("ngClass",ct(29,fge,e.msg.isA))("ngStyle",e.invertTxtColorToggler(e.invertTxtColor,"name"))
```

**Ours:** RoomMessage.svelte rendered `class={['username mx-1', { 'text-primary': kind === 'alert' && isAdminMessage && !item.evidenceKey }]}`. `grep -rn text-primary src` shows the class is used elsewhere in this room only where the reference does use it — `ModalHost`'s edit-username control and its two restream links, each with the const quoted beside it — so this was the one site with no reference wearer.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### RMSG-02 — The card's username ROW takes the body style on the member layout and on no other; ours gated it on the log type instead

**FIXED 2026-08-30 22:40 UTC.** The two consts differ by exactly one binding section, which is the whole finding: const 23 (admin, `Bge` node 30) is `[1,"d-flex","align-items-center","justify-content-between","flex-nowrap"]` and const 58 (member, `f1e` node 26) is the same list plus `3,"ngStyle"`. `f1e`'s update block reaches node 26 with `m(3), z("ngStyle", e.styleF)` at byte 1,344,339 — the same `styleF` the body carries. Const 23 has no binding section at all, so the admin row cannot take a style whatever the update block selects.

**Ours gated it on the LOG where the reference gates it on the LAYOUT, and the two disagreed in both directions.** `style={kind === 'alert' ? bodyStyle : undefined}` gave an admin's ALERT card a style the reference has no node for, and denied a member's CHAT card the one it does.

**Captured rows move TOWARD the capture, not away from it.** The owner's coloured-alert capture quoted in `room-message-render.test.ts` lists exactly four styled elements — the kebab, the username, the timestamp and the body — and this wrapper is not among them, while an alert from a presenter is an admin row. `usernameRowStyle` in `#lib/message-renderer-differences.js`; one negative control seen red, failing on both layouts at once.

**low** · `wrong-constant` · reference byte **1,360,639**

```
[1,"d-flex","align-items-center","justify-content-between","flex-nowrap",3,"ngStyle"]
```

**Ours:** RoomMessage.svelte's card branch renders one username row for both layouts and styled it from `kind`. The reference's admin template (`Bge` node 30, const 23 at byte 1,358,852) and member template (`f1e` node 26, const 58 at 1,360,639) are two nodes with two consts, and only the member's is bound.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### RMSG-03 — The Q&A count span is padded on the card and bare in the compact row; one snippet rendered the card's form in both

**FIXED 2026-08-30 22:40 UTC.** The `alert-qa` button is otherwise byte-identical across the two renderers — card const 70 and compact const 69 are the same eleven-entry array, the `me-1` span is `[1,"me-1"]` in both tables, and the trailing `✅` span is ` ✅` in both (`i1e` 1,339,199, `o_e` 1,377,073). Exactly one literal differs: `Ne(" (", e.msg.qa.length, ") ")` on the card against `Ne("(", e.msg.qa.length, ")")` in the compact row.

**RM-02 built the compact button by reusing the card's snippet**, and its note said so — *"The button is the card's, verbatim, down to the literal spaces inside each span"* — which is right about every part of it except this one. Every compact alert row shipped two extra spaces beside a `me-1` margin that is already the gap. `alertQaCountText(count, compact)` in `#lib/message-renderer-differences.js`; `compact` is a snippet PARAMETER rather than a read of `displayMode`, because the two call sites already know which they are and the whole reason this is a snippet is that their ORDER differs.

**low** · `wrong-constant` · reference byte **1,376,970**

```
function i_e(t,n){if(1&t&&(d(0,"span",70),v(1),u()),2&t){const e=g(4);m(),Ne("(",e.msg.qa.length,")")}}
```

**Ours:** the single `alertQaButton` snippet emitted `{' '}({item.questionCount}){' '}` for both hosts. Both literals are now read off the pinned bundle by the contract, and both rendered forms are asserted with the other as its control.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### RMSG-04 — The compact Trial badge is `Trial`; the card's is ` Trial `, and its `New` sibling is unpadded in both

**FIXED 2026-08-30 22:40 UTC.** `Jge` (card, byte 1,338,697) renders `v(1," Trial ")` and `c_e` (compact, 1,378,154) renders `v(1,"Trial")`, from the same const in both tables (`[1,"badge","bg-danger","trial-badge"]`, card 61 and compact 61), under the same gate, in the same position among the member-only marks. Only the literal differs, and this room rendered the card's in both.

**Its sibling is what makes this a transcription slip rather than a house rule.** `New` is `v(1,"New")` in BOTH (`Zge` 1,338,756, `d_e` 1,378,211) and was already right — so a compact row showing a trial member drew one padded badge beside one unpadded one, from the same table, on the same line. The contract counts the `New` pair as well as reading both `Trial` literals, so a capture that pads either turns it red.

`TRIAL_BADGE_TEXT` in `#lib/message-renderer-differences.js` — constants rather than markup whitespace, because Svelte normalises runs of whitespace around a text node and `" Trial "` typed into a template is not reliably `" Trial "`. That is RM-10's reason for writing its two bracket runs as expressions, made again.

**low** · `wrong-constant` · reference byte **1,378,154**

```
function c_e(t,n){1&t&&(d(0,"span",61),v(1,"Trial"),u())}
```

**Ours:** RoomMessage.svelte's compact member row rendered `<span class="badge bg-danger trial-badge"> Trial </span>`, which is `Jge`. One negative control, mutating the compact constant to the card's, was seen red on four assertions.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### RMSG-05 — The date separator's anchor takes `styleF` in BOTH components; this room painted it with nothing

**BUILT 2026-08-30 22:40 UTC.** `_ge` (card, byte 1,328,773) and `S1e` (compact, 1,367,109) are the same six calls, const for const: `d(0,"div",3)(1,"a",6), v(2), Xe(3,"date")` with `m(), z("ngStyle", e.styleF), m(), Ze(Ct(3,2,e.msg.t,"fullDate"))`. Const 6 is `[3,"ngStyle"]` in both tables — an element declared for a binding and nothing else — and the bare `m()` selects node 1, the anchor, by the same `advance` arithmetic ACA-03 rests on.

**Why it is worth a row.** This separator was the only node in either renderer that reads a message and paints none of its colours, so in a room whose alerts carry their own `fontColor` the date rule sat in the default text colour between rows that did not. Nothing announces that; it is a colour. Both renderers are asserted, plus the control that a message with no colours emits no style at all — which is what keeps this from becoming an unconditional `style` attribute.

**low** · `missing-behaviour` · reference byte **1,328,773**

```
function _ge(t,n){if(1&t&&(d(0,"div",3)(1,"a",6),v(2),Xe(3,"date"),u()()),2&t){const e=g();m(),z("ngStyle",e.styleF),m(),Ze(Ct(3,2,e.msg.t,"fullDate"))}}
```

**Ours:** RoomMessage.svelte's `dateSeparator` snippet rendered a bare `<a>`. The snippet itself is right and RM-01 argued for it — one implementation, two hosts, because each component's `styles:[…]` block carries its own `.separator` rule — so this is one attribute on a node that was otherwise transcribed.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### RMSG-06 — The compact MEMBER reaction repeater has no `clickedBy` gate; the other three have it, and matching would draw a pill claiming a reaction nobody made

**DELIBERATE DIVERGENCE — recorded at the code 2026-08-30 22:40 UTC, not reproduced.** Four templates repeat the reaction loop. `Oge` (card admin, 1,333,312), `u1e` (card member, 1,341,960) and `V1e` (compact admin, 1,371,615) each wrap the pill in `O(1, e.value.clickedBy.length > 0 ? 1 : -1)`. `m_e` (compact member, 1,379,950) opens `d(0,"span")(1,"span",51)` and renders it unconditionally.

`addRemoveReaction` empties `clickedBy` rather than deleting the key, so a reaction whose last holder removes it draws upstream as `🎉 0` — on a compact member row and on no other row in the product. That is a defect of the kind RM-19 records for `copyMessage`'s write-back: reproducing it would ship a pill claiming a reaction nobody has made, on one layout of four. The gate is applied to all four here, which is what three of them already say, and the contract renders all four layouts so that "one of four differs" is a statement about four rather than about one.

**Found by unifying the strip, which is the second half of this row.** The compact branch held a SECOND copy of the pill list, differing from `reactionStrip` by an inner gate on the log type — `g_e`'s own `O(3, "chat" === e.logType || "alerts" === e.logType && e.isQAMsg ? 3 : -1)` at 1,380,270. That gate is IMPLIED by the container's, upstream as well as here: `__e` renders under `O(36, (enableReactions && "chat" === logType || enableQAReactions && "alerts" === logType && isQAMsg) && checkMsgReactions(msg) ? 36 : -1)` (`b_e`, 1,380,680), every disjunct of which entails a disjunct of the inner one, and `menuAllows.reaction` is that same expression here. So the copy could go, and going is what surfaced that its `{#each}` and the card's gated differently.

**low** · `divergence` · reference byte **1,379,950**

```
function m_e(t,n){if(1&t){const e=Y();d(0,"span")(1,"span",51),x("click",function(){const o=D(e).$implicit;return E(g(3).addRemoveReaction(o.key))}),v(2),u()()}if(2&t){const e=n.$implicit,i=g(3);m(),z("ngClass",ct(3,r6,e.value.clickedBy.includes(i.hashEmail))),m(),ns("",e.value.emoji," ",e.value.clickedBy.length," ")}}
```

**Ours:** one `reactionStrip` snippet with THREE call sites — the card's two wrappers (RM-22: `span.ms-1` admin, bare `div` member) and the compact host's own container. The gate is `{#if reaction.clickedBy.length > 0}` for all of them, and the contract asserts one `{#snippet reactionStrip()}`, three renders of it, and a single occurrence of `chat-reaction-added` in the file.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

## notes/NoteEditor.svelte

18 verified gaps; 50 reference behaviours confirmed present.

> **These eighteen rows sat under `## RoomMessage.svelte` until 2026-08-30**, with this heading
> below them as an empty stub claiming eighteen gaps and listing none. Nothing was lost — every
> row was here and every one is closed — but the two sections said the opposite of the truth to
> anybody reading either: the NoteEditor section looked unstarted and the RoomMessage section
> looked twice its size. `room-surface-audit-counts.test.ts` now checks each surface heading
> against the `gaps` column of the table above, so a row filed under the wrong heading fails
> rather than being found by hand.

### note-editor-carousel-slide-upload — Per-slide image upload (Upload button, uploading spinner, POST to upload_server) is missing

**BUILT 2026-08-30 05:18 UTC.** A hidden `<input type="file" accept="image/*">` with id `cfi_<index>` under a styled `<label for>` — the reference's own pattern, const 58 `["type","file","accept","image/*",2,"display","none",3,"change","id"]` and 59 `[1,"btn","btn-sm","btn-outline-secondary","mb-0"]` — the ` Upload ` label with `fas fa-upload`, `uploadCarouselImage`, and the `D0e` spinner (const 52 the icon, 53 `[1,"small","mt-1"]`, caption `Uploading...`). Transcribed: the first file only, the input cleared unconditionally so the same file can be chosen twice, the URL written only on success, and the failure raised as a dialog rather than a console line. **Two deliberate divergences:** the POST is NOT transcribed — `onUploadImages` already carries this room's upload (CDN when configured, `composer-image.remote.ts` otherwise) and a second `$.ajax` here would be a second uploader with its own credential handling; and the spinner is keyed by the slide's KEY rather than its index, because upstream mutates a slide object it holds a reference to while ours replaces the array wholesale, so an index captured before the `await` points at a different slide once `removeCarouselSlide` renumbers. `note-image-browser-contract.test.ts`.

**high** · `missing-control` · reference byte **1,476,460**

```
uploadCarouselImage(e,i){const o=e.target,s=o.files?.[0];if(!s)return;const r=this.carouselImages[i];r.uploading=!0;const a=new FormData;a.append("image",s),a.append("name",s.name),$.ajax({...url:`${this.appService.globals.upload_server}/image/${this.appService.globals.sessionID}`,method:"POST",...headers:{Authorization:"Client-ID "+this.appService.globals.cdn_upload_key},...success:h=>{r.url=h.data.link,r.uploading=!1},error:h=>{console.error(h),r.uploading=!1,window.bootbox.alert("Image upload failed.")}}),o.value=""}
```

**Ours:** Absent from the carousel dialog. NoteEditor.svelte:1366-1389 renders only two `type="url"` text inputs per slide; there is no `<input type="file" accept="image/*">` with id `cfi_<index>` (reference template at 1462533), no ' Upload ' label-button (reference `v(9," Upload ")` at 1462593), and no per-slide 'Uploading...' spinner state (reference D0e, `v(3,"Uploading...")` at 1462307). The `onUploadImages` prop does exist (NoteEditor.svelte:53) but is wired only to the Insert Image dialog (insertImages, NoteEditor.svelte:473-490). Net effect: a carousel slide can only be filled by someone who already has an image URL in hand.

> Verified: I could not refute this. The carousel dialog is the only one of its kind in our source (NoteEditor.svelte:1338-1417, the `{:else if dialog === 'carousel'}` branch) and its per-slide row renders exactly four controls: `type="url"` Image URL (:1368-1376), `type="url"` Link/URL (:1377-1385), a "Delete slide" button (:1386-1387), then the sha…

### note-editor-file-browser-modal — The whole file-browser modal ("Select Image" / getSessionFiles) has no counterpart

**BUILT 2026-08-30 05:02 UTC.** The modal, a per-slide button, `selectFileForSlide`, and the four CSS rules — decoded with this component's own consts table (77 `file-browser-grid`, 79 `file-browser-item`, 80 `file-browser-thumb`, 81 `file-browser-name`) and the reference's scoped style block at byte 1,486,651, with the strings verbatim. The filter is `lib/session-image-files.ts`, transcribing `s.contentType?.includes("image/")` — `includes`, not `startsWith`. **Two deliberate divergences:** this room does not fetch on open (the page load already carries the same rows and every upload path invalidates it), so upstream's `Loading images...` branch is not drawn — a branch that can never render can never be checked; and the grid item is a `<button>` where the capture uses a clickable `<div>`, because it exists to be activated. `note-image-browser-contract.test.ts`.

> **Corrected 2026-08-30 05:18 UTC.** That button shipped labelled `Select Image` with invented classes. ` Select Image ` is the MODAL's title (byte 1,466,205); the button is ` Browse `, `fas fa-folder-open`, `btn btn-sm btn-outline-info mb-0 ml-1` (const 61/62, byte 1,462,300). The contract test pinned the invented label because I wrote both from the same wrong memory — it now pins the transcribed one and asserts the invented one is gone.

**high** · `missing-control` · reference byte **1,477,053**

```
openFileBrowser(e){this.fileBrowserTargetIndex=e,this.fileBrowserImages=[],this.fileBrowserLoading=!0,this.fileBrowserModalRef=this.modalService.open(this.fileBrowserModal,{ariaLabelledBy:"file-browser-modal-title",size:"lg"}),this.httpClient.post(`${this.appService.globals.apiROOT}/sessions/v2/cmd`,{tok:...,cmd:"getSessionFiles",uploadType:"files"}).subscribe({next:o=>{this.fileBrowserLoading=!1,o?.success&&o.files&&(this.fileBrowserImages=o.files.filter(s=>s.contentType?.includes("image/")))}
```

**Ours:** Absent. The carousel dialog in NoteEditor.svelte:1340-1422 offers a bare url input per slide and nothing else. grep over apps/room/src for `getSessionFiles`, `fileBrowser`, `file-browser`, `selectFileForSlide`, `Select Image`, `No images found` returns zero hits in any .svelte/.ts file (only unrelated FilesPane/ModalHost comments). The reference's third @ViewChild ng-template (fileBrowserModal, selector anchor at 1483267) and its whole template — loading state 'Loading images...', empty state 'No images found. Upload images via Files first.' at offset 1465769, .file-browser-grid of file.vidPath thumbnails, selectFileForSlide, and the ' Cancel ' footer — is unimplemented. A presenter who already uploaded an image via Files has no way to reach it from a carousel slide.

> Verified: I could not find any counterpart in apps/room/src. Our carousel dialog (NoteEditor.svelte:1340 `{:else if dialog === 'carousel'}`, rows at :1367, "Add slide" at :1391) gives each slide exactly two text inputs — "Image URL" and "Link / URL" — plus a Delete-slide button, then Interval/Height and the Save/Insert footer.

### note-editor-carousel-destructive-confirms — Deleting a slide and replacing a slide image happen with no confirmation

**BUILT 2026-08-30 05:52 UTC.** Both questions, in the reference's own words and with its own button classes: `Delete this slide?` (`Delete`/`btn-danger`, byte 1,475,669) and `Change this image?` (`Change`/`btn-warning`, byte 1,476,242), raised through `BootboxDialog` — the primitive `NotesPane` already uses for delete-note, revert-version and welcome-mat, which this path was the one to skip. `clearCarouselImage` moves the old URL INTO the staging field rather than discarding it, so a presenter who changes their mind can press the check and have it back. The pending question is keyed by SLIDE and re-found on accept, because an upload can land while the dialog is open. `note-carousel-slide-contract.test.ts`.

**medium** · `missing-behaviour` · reference byte **1,475,669**

```
removeCarouselImage(e){window.bootbox.confirm({message:"Delete this slide?",buttons:{confirm:{label:"Delete",className:"btn-danger"},cancel:{label:"Cancel",className:"btn-default"}},callback:i=>{i&&this.carouselImages.splice(e,1)}})}
```

**Ours:** NoteEditor.svelte:509-512 `removeCarouselSlide` splices the row out immediately with no dialog, and there is no 'Change this image?' path at all (reference clearCarouselImage at 1476242, `message:"Change this image?"` with confirm label 'Change'/btn-warning). Every other destructive note action in this repository is raised through BootboxDialog from NotesPane (delete note, revert version, welcome mat — NotesPane.svelte:195-228), so this is the one that skipped the house pattern.

> Verified: I could not find either confirmation implemented anywhere in apps/room/src. `removeCarouselSlide` (NoteEditor.svelte:509-512) splices via `.filter()` synchronously and the "Delete slide" button at NoteEditor.svelte:1386-1387 calls it directly — no dialog, no pending state, no request/accept indirection.

### note-editor-gif-insert-confirm — A GIF is inserted straight from the double-click; the reference confirms with a preview first

**BUILT 2026-08-30 06:52 UTC.** `insertGif` now STAGES the chosen GIF and `confirmGif` is what inserts it, through the `GifConfirmDialog` the chat composer has always used — this row's own verification found that pattern already built for chat and not for notes. The preview is the point: a Giphy result is a thumbnail in a grid, and what lands in the note is `images.original`, a larger image the presenter has not seen at the size it will appear. `this.sendingGif` is transcribed as a REFUSAL rather than a replacement — a second select while one is pending is dropped, because the presenter is looking at a preview of the first and must not confirm a different image than the one on screen. `note-giphy-contract.test.ts`.

**medium** · `missing-behaviour` · reference byte **1,482,885**

```
sendGif(e,i){this.sendingGif||(this.modalService.dismissAll(),this.sendingGif=!0,bootbox.confirm(`You sure you want to insert this image:<br/><img src='${i}' style='width: 100%;'>`,o=>{this.sendingGif=!1,o&&$("#summernoteEdit-"+this.tab._id).summernote("insertImage",i,e)}))}
```

**Ours:** GiphyPicker.svelte:145 fires `onselect(result.title, result.images.original.url)` on `ondblclick`, and NoteEditor.svelte:552-557 `insertGif` inserts the image immediately. There is no full-width preview confirmation and no `sendingGif` re-entrancy guard, so a double-click that registers twice can insert two copies. The picker does close on select (giphyOpen = false), which is the `modalService.dismissAll()` half.

> Verified: The claim survives. I hunted specifically for a note-side confirm and found the pattern IS built in this repo — but exclusively for the CHAT composer, not for the note editor.

### note-editor-image-popover — The image popover (imageAttributes / resize / float / removeMedia) has no counterpart

**BUILT 2026-08-30 07:25 UTC — three of the four groups.** `resizeFull`/`resizeHalf`/`resizeQuarter`/`resizeNone`, `floatLeft`/`floatRight`/`floatNone` and `removeMedia`, by the names the capture gives, on a strip that appears while an image is selected. Behind them, `note-image.ts` extends `@tiptap/extension-image` with a `width` attribute and a `float` style. **`resizeNone` and `floatNone` clear rather than set** — which is what the names say, and what makes them undo rather than merely change.

**What is evidenced here is the GROUP LIST and nothing else, and the build says so.** Summernote is not in this bundle, so its popover's markup, geometry and icons are unknown; this is a strip above the editor rather than a floating popover, because inventing a popover's geometry to match a capture nobody has is how a component acquires decisions nothing can check. **`imageAttributes` is deliberately NOT built** — a third-party plugin whose dialog is unevidenced twice over, in this bundle and in the reference's own source. It is the one group of four that stays open, and it needs either a capture of that plugin or an owner decision about what the dialog should hold.

**Two divergences with reasons.** The width is an ATTRIBUTE where summernote writes a style, because `safe-html.ts`'s `img` style allow-list admits `width: 100%` and nothing else — `50%` and `25%` would have been stripped on the way back in and the control would have changed nothing. And that allow-list was WIDENED to admit `float: left|right|none`, which is a deliberate change to a deny-by-default control: three enumerated keywords, no URL, no `url()`, no expression, and narrower than the property's real grammar because the extra values are ones this editor cannot produce. `note-image-popover-contract.test.ts` executes the pattern against both the three legal values and five refused ones.

**medium** · `missing-control` · reference byte **1,469,073**

```
popover:{image:[["custom",["imageAttributes"]],["image",["resizeFull","resizeHalf","resizeQuarter","resizeNone"]],["float",["floatLeft","floatRight","floatNone"]],["remove",["removeMedia"]]]}
```

**Ours:** Absent. grep over apps/room/src for `resizeFull`, `floatLeft`, `removeMedia`, `imageAttributes` returns zero hits in any .svelte/.ts file. Our editor configures `Image.configure({ allowBase64: false })` (NoteEditor.svelte:245) and nothing else, so once an image is in a note there is no UI to resize it to 100/50/25%, float it, edit its attributes, or remove it — only a raw text delete. Caveat, stated as absence: summernote itself is NOT in this bundle, so the popover's exact markup and the imageAttributes plugin behaviour are unevidenced; the fact that these four groups are configured is what is evidenced.

> Verified: I could not find any counterpart and I searched hard. The reference config is confirmed verbatim at the stated offset.

### note-editor-insert-carousel-silent-noop — insertCarousel with no valid slide fails silently instead of alerting

**BUILT 2026-08-30 06:20 UTC.** `Please add at least one image URL.` — the reference's own string, raised through `BootboxDialog`, with the dialog left OPEN because the presenter is being told to fix the rows in front of them and only the success branch dismisses upstream either. **A missing editor is deliberately NOT this message:** that is a bug in the component, not a mistake by the presenter, and the two conditions were one `||` before this. `note-carousel-guards-contract.test.ts`.

**medium** · `missing-behaviour` · reference byte **1,478,230**

```
...this.carouselInNote=!0)):window.bootbox.alert("Please add at least one image URL.")}editCarousel(){
```

**Ours:** NoteEditor.svelte:514-517 — `const slides = carouselSlides.filter(({ url }) => url.trim().startsWith('https://')); if (slides.length === 0 || instance === null) return;`. The primary button is always enabled, so pressing 'Insert Carousel' with an empty or non-https slide list closes nothing, inserts nothing and says nothing. CLAUDE.md's fail-loud rule and the reference agree here.

> Verified: The reference alerts on the empty case; ours returns silently, and I found no implementation of that alert anywhere in apps/room/src. Reference at observed offset 1478231: `insertCarousel(){const e=this.generateCarouselHtml();e?(...):window.bootbox.alert("Please add at least one image URL.")}`, with `generateCarouselHtml()` at observed of…

### note-editor-version-cap — Version history is unbounded; the reference caps it at 3

**BUILT 2026-08-30 06:20 UTC.** `NOTE_VERSION_LIMIT = 3` (`this.maxVersions = 3`, byte 1,468,359), enforced as a DELETE inside the same transaction as the insert, plus a `LIMIT` on the read. **The delete is the decision and the limit alone would have been the wrong fix:** a capped query leaves the table growing forever with rows nothing can reach, and the count behind `Version History (N)` stops meaning what the reference's means. Pruned on the insert branch only — the coalescing update rewrites the newest row in place, so the count cannot have changed there. Ordered by `version` rather than doing arithmetic on it, because the restore path writes a NEW version rather than rewinding the counter. `notes-repository.test.ts` saves five times and asserts the surplus rows are GONE, not merely unread.

**medium** · `wrong-constant` · reference byte **1,468,359**

```
this.maxVersions=3,this.editorDirtyContents=null,this.editorDirty=!1,this.isEditing=!1
```

**Ours:** No cap anywhere on our side. `getNoteVersions` (src/lib/server/notes-repository.ts:282-289) is `select().from(noteVersions).where(eq(noteVersions.noteId, noteId)).orderBy(desc(version)).all()` with no LIMIT, NotesPane.svelte:139-161 refetches it on every `updatedAt` change (i.e. every 3-second autosave), and NoteEditor.svelte:611-618 renders one row per result behind 'Version History (N)'. So N grows without bound on a long-lived note, the panel becomes an unbounded read path, and the button's count no longer means what the reference's means. The reference also snapshots only on a real change (`saveCurrentVersion` at 1469897 returns early when `prevVersions[0].content === e`); ours coalesces by author+time window (notes-repository.ts:114-144), which is a defensible divergence, but the missing cap is not.

> Verified: I could not find any 3-version cap in apps/room/src. Searched (case-insensitively, across .ts/.svelte/.md) for: maxVersions, MAX_VERSIONS, MAX_NOTE_VERSIONS, VERSION_LIMIT, versionCap, prevVersions, "max versions", "cap ...

### note-editor-welcome-mat-all-rooms-password — The all-rooms Welcome Mat password prompt is not raised

**BUILT 2026-08-30 08:05 UTC — end to end, and this row's own recorded blocker with it.** `+page.server.ts` carried the gap in its own words: *"the all-rooms variant needs a controller endpoint that enumerates the account's rooms and verifies `allRoomsWelcomeMatPW`."* `internal/room-welcome-mat-auth/[code]` is that endpoint. It answers `required` beside `ok` — the branch `bootbox.prompt` / `bootbox.confirm` swings on — and on a correct password returns the short codes of the rooms the caller's account owns, derived from the room the token already proves them for.

**THE AUTHORITY MOVED, AND THAT IS THE FIX RATHER THAN THE WORKAROUND.** Upstream compares in the browser against `sessData.allRoomsWelcomeMatPW`, which means a member who can read `sessData` can send `setWelcomeMatNoteTab` with any `pw` at all and have it obeyed — the check that mattered never ran on a server. Here the room forwards the typed candidate, holds nothing to compare it against, and the write path re-checks independently of the prompt, so a client that skips the dialog reaches the same gate.

**Three decisions, all recorded at the code.** The room list is on the AUTH call and not a second endpoint, so a `config-read` token alone cannot enumerate an account's rooms — the gate and the data it unlocks are one round trip, and a wrong password returns nothing. `welcomeMatPasswordRequired` fails CLOSED to `required: true`, because a plain confirmation would skip a gate the owner chose to set while a prompt costs one dialog and is re-checked anyway. And "all the rooms' welcome mats" is a COPY PER ROOM, not a shared note: the reference's server is not in the capture, `notes.room_short_code` is the fence every read in that repository scopes by, and a shared note would require removing that scope from the welcome-mat read. Each room's previous mat is demoted, never deleted, so a presenter in that room can put it back.

`welcome-mat-all-rooms-contract.test.ts` (21), `notes-repository.test.ts`'s two behavioural cases with an unnamed fourth room as the control, and the route's entry in both capability registries.

**medium** · `missing-behaviour` · reference byte **1,474,217**

```
setAsWelcomeTab(e){e?this.appService.globals.sessData.allRoomsWelcomeMatPW?bootbox.prompt({title:"Please enter the password to replace all the rooms Welcome Mats:",value:"",callback:i=>{if(i){const o=i.trim();o===this.appService.globals.sessData.allRoomsWelcomeMatPW?this.appService.sendServerAdminCommand("setWelcomeMatNoteTab",{id:this.tab._id,allRooms:e,pw:o}):bootbox.alert("Wrong password!")}}}):bootbox.confirm("Are you sure you want to replace all the rooms Welcome Mats with this note?"
```

**Ours:** NoteEditor.svelte:583-588 raises `onSetWelcomeMat(true)`, which NotesPane.svelte:218-228 turns into the plain confirm only — the password branch is never taken, and `pw` is never sent. This is ALREADY recorded as an honest gap in src/routes/+page.server.ts:987-1000 ("the all-rooms variant needs a controller endpoint that enumerates the account's rooms and verifies allRoomsWelcomeMatPW"), so it is a known open item rather than a new discovery. Listed because the two non-password confirm strings match the reference exactly and this third branch is the only one that does not.

> Verified: I could not refute this. The password branch genuinely does not exist anywhere in apps/room/src, under any name.

### note-editor-add-slide-scroll — Adding a slide does not scroll the new row into view

**BUILT 2026-08-30 06:20 UTC.** `scrollIntoView({ behavior: 'smooth', block: 'nearest' })` on the last row, byte 1,475,568. The `.carousel-slides-list` scroller this row also named landed with the three-state rebuild an hour earlier, which is what made the missing scroll visible: a presenter with six slides pressed ` Add slide ` and nothing appeared to happen. **Two deliberate divergences:** `tick()` rather than upstream's bare `setTimeout`, so it waits for exactly the render that added the row; and the query is scoped to this dialog's own list rather than `document`, because upstream's selector is scoped only by there being one such modal on the page. `note-carousel-guards-contract.test.ts`.

**low** · `missing-behaviour` · reference byte **1,475,568**

```
elImage(){this.carouselImages.push({url:"",link:"",pendingUrl:"",uploading:!1}),setTimeout(()=>{const e=document.querySelectorAll(".carousel-slide-row");e[e.length-1]?.scrollIntoView({behavior:"smooth",block:"nearest"})})}
```

**Ours:** NoteEditor.svelte:499-501 `addCarouselSlide` appends and stops. Our modal body has no `max-height: 50vh; overflow-y: auto` scroller either (the reference's `.carousel-slides-list` rule), so with many slides the new row lands below the fold of a `max-height: calc(100vh - 40px)` dialog (NoteEditor.svelte:1495-1499) with nothing to bring it back.

> Verified: I could not find the behaviour anywhere in apps/room/src, and I confirmed the reference counterpart by reading the bundle bytes myself. OUR SOURCE — what is actually there:
- /home/user/trading-room-app/apps/room/src/lib/components/notes/NoteEditor.svelte:499-501 is the whole handler: `function addCarouselSlide(): void { carouselSlides =…

### note-editor-carousel-arrow-hover — Carousel arrow buttons have no hover background change

**BUILT 2026-08-30 06:20 UTC.** Both handlers and both missing calls, byte 1,480,561. The inline style string already declared `transition: background 0.2s` — transcribed with the rest of it — and nothing ever changed the background, so it described an animation that could not happen. `preventDefault` and `stopPropagation` are the half that matters more: a slide may be wrapped in `slide.link` and an arrow sits inside it, so without them paging a linked carousel navigated away from the note. `note-carousel-guards-contract.test.ts`.

**low** · `missing-behaviour` · reference byte **1,480,561**

```
W.onmouseenter=()=>W.style.background="rgba(0,0,0,0.75)",W.onmouseleave=()=>W.style.background="rgba(0,0,0,0.45)",W.onclick=J=>{J.preventDefault(),J.stopPropagation(),B(),h()}
```

**Ours:** src/lib/components/notes/safe-html.ts:245-256 `control()` sets the identical inline style string including `transition:background 0.2s;` but attaches no mouseenter/mouseleave handlers, so the declared transition never fires and the arrow never lightens. The click handler (:250-253) also omits `preventDefault()`/`stopPropagation()`, which in the reference stops an arrow click inside a linked slide from following the link.

> Verified: I tried to find the arrow hover implemented under another name and could not. Our carousel arrow factory is `control()` inside `setupCarousel()` at /home/user/trading-room-app/apps/room/src/lib/components/notes/safe-html.ts:241-257.

### note-editor-carousel-labels — Carousel modal label text differs from the captured strings

**BUILT 2026-08-30 05:52 UTC.** Every string in this row: `Rotation interval (seconds)`, the `Slides` group label, `Link URL ` with its `(optional — clicking the image opens this)` hint span, `Image ` + `span.text-danger` `*`, ` Add slide ` with `fa-plus`, and the icon-only `i.fas.fa-trash` where a text `Delete slide` button was. `note-carousel-slide-contract.test.ts` asserts each, and asserts the three invented ones are gone.

**low** · `wrong-constant` · reference byte **1,463,957**

```
v(11,"Link URL "),d(12,"span",50),v(13,"(optional — clicking the image opens this)")
```

**Ours:** NoteEditor.svelte:1377 says 'Link / URL' with no hint span; :1368 says 'Image URL' where the reference's empty state says 'Image ' + `span.text-danger` '*' (offset 1462400); :1393 says 'Interval (seconds)' where the reference says 'Rotation interval (seconds)' (offset 1464581); :1386 says 'Delete slide' where the reference uses an icon-only `i.fas.fa-trash`; and the 'Slides' group label (offset 1465067 region, `v(17,"Slides")`) has no counterpart. The two titles that ARE swung on edit-mode ('Edit/Insert Image Carousel', 'Save Changes/Insert Carousel') match exactly.

> Verified: Our carousel modal really does use different label text from the captured bundle, and no renamed/extracted counterpart exists. Our NoteEditor.svelte:1368 renders 'Image URL', :1377 'Link / URL' with no hint span, :1387 a text button 'Delete slide', :1393 'Interval (seconds)'; there is no 'Slides' group label, no per-slide '#N' index, and…

### note-editor-carousel-modal-chrome — Carousel modal chrome: no Cancel button, no slide index badge, no delete-disabled-at-one

**BUILT 2026-08-30 05:52 UTC.** All three: the footer ` Cancel ` (const 41, `btn btn-outline-dark`), the `#N` badge (const 44, `Ne("#", i+1, "")`), and `disabled={carouselSlides.length === 1}` on the trash. The last REPLACES a behaviour this row described fairly as reaching the same end state by a different route — deleting the last row spliced it out and silently re-added a blank one, so the presenter's row appeared to survive a delete they had just asked for. `note-carousel-slide-contract.test.ts`.

**low** · `missing-control` · reference byte **1,465,110**

```
d(21,"button",38),x("click",function(){return D(e),E(g().addCarouselImage())}),T(22,"i",39),v(23," Add slide "),u()(),d(24,"div",40)(25,"button",41),x("click",function(){return E(D(e).$implicit.dismiss())}),v(26," Cancel ")
```

**Ours:** NoteEditor.svelte:1414-1420 — the footer holds one primary button only; dismissal is the header X at NoteEditor.svelte:1354-1362. The per-slide `span.badge.badge-secondary.mr-2` showing `#{{index+1}}` (reference `Ne("#",i+1,"")` at 1464222) is absent, as is the delete button's `[disabled]=carouselImages.length===1` (reference `z("disabled",1===o.carouselImages.length)` at 1464241) — NoteEditor.svelte:509-512 instead deletes the last row and silently re-adds a blank one, which reaches the same end state by a different route.

> Verified: All three sub-items are genuinely absent from our source, and the reference genuinely has all three (I re-read the bundle bytes at the cited offsets myself). (1) No Cancel button.

### note-editor-carousel-slide-preview — Filled-slide image preview and ' Change image ' button are missing

**BUILT 2026-08-30 05:52 UTC.** `k0e` at byte 1,463,604 — const 68 `[1,"carousel-img-preview","mb-2"]`, 69 `[1,"carousel-preview-img",3,"src"]`, 70 the button, 71 `fa-times` — and with it the three-state row `O(6, e.uploading ? 6 : e.url ? 8 : 7)` this row said was one flat state here. The two `.carousel-img-preview` rules at byte 1,488,253 now have their consumer. The `<img>` is registered UNSIZEABLE with its reason: upstream bounds it `max-height: 140px; max-width: 100%` with `object-fit: contain` on purpose, because that state exists to show the WHOLE image and a fixed box would letterbox or crop the very thing being checked. `note-carousel-slide-contract.test.ts`.

**low** · `missing-control` · reference byte **1,463,604**

```
x("click",function(){D(e);const o=g().$index;return E(g(2).clearCarouselImage(o))}),T(3,"i",71),v(4," Change image ")
```

**Ours:** NoteEditor.svelte:1366-1389 renders the same two url inputs whether a slide is empty or filled — there is no `div.carousel-img-preview` with `img.carousel-preview-img[src]=slide.url`, and no ' Change image ' button. The three-state slide row the reference drives with `O(6,e.uploading?6:e.url?8:7)` (offset 1464280) is one flat state here. The component's own stylesheet rules for `.carousel-img-preview` / `.carousel-preview-img` (bundle offset 1488513) therefore have no consumer in our source either.

> Verified: I could not refute it. NoteEditor.svelte renders one flat carousel slide row — "Image URL" input, "Link / URL" input, "Delete slide" button — regardless of whether the slide has a url.

### note-editor-giphy-hint-text — Giphy hint reads "to select it" where app-note reads "to insert it"

**BUILT 2026-08-30 06:52 UTC.** A `hint` prop on `GiphyPicker`, defaulting to `*Double click an image to select it` — the majority string at offsets 1,425,716, 2,197,828 and 2,372,175 — with `app-note`'s `insert it` (1,467,154) passed by `NoteEditor`. **This row filed it fairly as a shared-component compromise and it was one, but it was not a necessary one:** the difference is a prop, the default keeps the three surfaces that were already right untouched, and the words are not interchangeable — everywhere else a double-click selects a GIF that is then confirmed and SENT to a room; in a note it goes into a document. The same fix answers `GifConfirmDialog`'s `post`/`insert` split. `note-giphy-contract.test.ts`.

**low** · `wrong-constant` · reference byte **1,467,154**

```
d(5,"div",83)(6,"h6"),v(7,"*Double click an image to insert it")
```

**Ours:** GiphyPicker.svelte:106 renders '*Double click an image to select it'. Stated fairly: 'select it' is the correct string for the OTHER three giphy surfaces in the bundle — verified at offsets 1425716, 2197828 and 2372175 — and app-note at 1467154 is the only one that says 'insert it'. Our GiphyPicker is one shared component serving all of them, so this is a shared-component compromise, not a transcription error; it costs the note surface one word.

> Verified: Could not refute. Our GiphyPicker hardcodes the hint as "*Double click an image to select it" in markup, and its Props interface is only { apiKey, popoverId, onclose, onselect } — there is no hint/label prop, so no consumer can vary the wording.

### note-editor-giphy-search-button — The Giphy search icon button is missing; only the clear button exists

**BUILT 2026-08-30 06:52 UTC.** The other half of a pair: const 88 `[1,"input-group-text","text-dark",3,"click"]` is used TWICE at byte 1,467,345 — `d(12,"span",88)` with `fa-search`, `d(14,"span",88)` with `fa-times` — and only the clear half was here, so a search could be started only by pressing Enter with a visible affordance beside it that did the opposite. **Two words diverge from the capture and they diverge in the sibling too rather than being introduced here:** `text-white` for `text-dark` and the `fa-2x` on the icon, because this picker is a dark popover where the reference's is a light modal (`btn-close-white` on the header is the same decision). `role="button"` plus a keydown on both spans is ours — the capture puts a click handler on a bare `<span>` that no keyboard can reach. **The reference's modal footer ` Close ` is deliberately NOT added:** ours is a popover with a header `btn-close`, not a modal, and a footer button in a popover would be a control from a different surface. `note-giphy-contract.test.ts`.

**low** · `missing-control` · reference byte **1,467,345**

```
d(12,"span",88),x("click",function(){return D(e),E(g().searchGiphy())}),T(13,"i",89),u(),d(14,"span",88),x("click",function(){return D(e),E(g().clearSearchGiphy())}),T(15,"i",90)
```

**Ours:** GiphyPicker.svelte:124-135 renders a single `span.input-group-text` carrying `i.fa.fa-times` wired to `clearSearch`. The sibling `span.input-group-text.text-dark` with `i.fa.fa-search` wired to `searchGiphy()` has no counterpart, so a search can only be started with Enter on the form (GiphyPicker.svelte:107-112). The reference's modal footer ' Close ' button is likewise absent — ours closes via the header `btn-close` at :98-103.

> Verified: Our only Giphy search UI is GiphyPicker.svelte, which renders exactly one input-group affordance — a clear (fa-times) span — and NoteEditor.svelte mounts that popover for its GIFs toolbar button. There is no fa-search span, no searchGiphy-equivalent control, and no ' Close ' footer button anywhere in apps/room/src; the search can only be…

### note-editor-height-and-mount — Editor height and the mount element differ from the single .note-view element

**HALF BUILT 2026-08-30 07:25 UTC, and the half this row named.** *"the hidden div is the part worth deleting"* — deleted. `<div id="summernoteEdit-{noteId}" class="note-view" hidden>` was a mount point for a library this app does not use: summernote initialises ON `.note-view` and replaces it, so upstream has one element that is both the rendered note and the editor, while Tiptap mounts into `.note-editor-host` and the read-only note is `NotesPane`'s own element. Hidden, read by nothing, written by nothing. It also put a DUPLICATE id in the document — `NotesPane` renders the same one for the same note, so `getElementById` could return either and which depended on render order.

**The height stays ours and that is the decision.** `height: "100%"` against our `editorHeight` with a drag-resize bar: the reference's editor fills a pane it does not share, ours sits in a column beside the note list and a presenter sizing it is a capability the reference does not have. Recorded as a kept divergence rather than left as an open row.

**low** · `divergence` · reference byte **1,468,553**

```
placeholder:"Type your note here and press save",height:"100%",toolbar:[["style",["style"]],["view",["fullscreen","codeview"]],["misc",["und
```

**Ours:** NoteEditor.svelte:186 `editorHeight = $state(360)` with a drag-resize bar (:559-572, :1185-1199) instead of `height: "100%"`. Separately, NoteEditor.svelte:676 keeps an empty `div#summernoteEdit-{noteId}.note-view` with `hidden` beside the live editor frame, where the reference has ONE element serving as both the rendered note and the mount point. Ours is a hidden element nothing reads or writes — which is exactly the 'nothing exists without a consumer' rule in CLAUDE.md — while NotesPane.svelte:383-387 renders the real read-only `.note-view#summernoteEdit-{id}` in the non-editing branch. Flagged low, and the hidden div is the part worth deleting.

> Verified: I could not refute either half. (1) HEIGHT: the reference config is height:"100%" and the component's own styles are [_nghost]{display:block;height:100%} / .note-view{height:100%}, i.e.

### note-editor-iframe-whitelist — protradingroom.com is not in our iframe host allow-list

**OWNER DECISION, NOT BUILT — recorded 2026-08-30 07:25 UTC.** This row says it itself: *"Worth a decision, not a fix by default."* Adding a host to a deny-by-default sanitizer in a multi-tenant fintech application is not a transcription, and three measured facts argue against doing it unasked. The reference's own `codeviewFilter` and `codeviewIframeFilter` are BOTH false at the same offset, so that whitelist is inert there and its contents evidence an intention rather than a behaviour. Our sanitizer is a control the reference does not have at all, so this is not a gap against it. And `.protradingroom.com` with a leading dot is a SUBDOMAIN wildcard — admitting it would admit every subdomain of a domain this deployment may not even serve from.

**What unblocks it:** the owner saying whether notes may embed first-party iframes, and from which exact host. If yes, the entry belongs beside the existing four in `SAFE_IFRAME_HOSTS` with the room's own configured host rather than a literal, so a second deployment does not inherit the first one's domain.

**low** · `divergence` · reference byte **1,469,265**

```
codeviewIframeWhitelistSrcBase:["docs.google.com",".protradingroom.com","protradingroom.com"],codeviewFilter:!1,codeviewIframeFilter:!1
```

**Ours:** safe-html.ts:61-66 `SAFE_IFRAME_HOSTS` = docs.google.com, player.vimeo.com, www.youtube-nocookie.com, www.youtube.com — enforced at safe-html.ts:183. A note imported from the reference that embeds a first-party protradingroom.com iframe loses it silently. Recorded as a divergence, not a defect: the reference's own `codeviewFilter` and `codeviewIframeFilter` are BOTH false at this same offset, so that whitelist is inert there, and our sanitizer is a deny-by-default control the reference does not have at all. Worth a decision, not a fix by default.

> Verified: I could not refute it. Our note iframe host allow-list exists in two places and neither contains protradingroom.com in any form.

### note-editor-paste-url-regex — pendingUrl two-step and the image-URL paste auto-confirm are not reproduced

**BUILT 2026-08-30 05:52 UTC.** `pendingUrl`, its check button (const 67, disabled on an empty trim), Enter, and the paste interception with the regex transcribed character for character, `jfif` included. **This row's own reasoning was wrong and is worth saying why:** it recorded the divergence as harmless because "with a directly-bound field the confirm step has nothing left to do". That was true only while our row had ONE state. `url` is what decides which of the three renders, so a directly bound box flips the row into an `<img src="h">` on the first keystroke and takes the box off the screen. The staging field is what lets the row stay an input until there is something worth previewing. The regex's `^https?://` anchor and `(\?.*)?$` tail are also what make running it on a paste safe — no `javascript:` or `data:` payload can match — and the value lands in an `<img src>`. `note-carousel-slide-contract.test.ts`.

**low** · `divergence` · reference byte **1,475,962**

```
onCarouselUrlPaste(e,i){const o=e.clipboardData?.getData("text")?.trim();o&&/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|jfif|svg)(\?.*)?$/i.test(o)&&(e.preventDefault(),this.carouselImages[i].pendingUrl=o,this.confirmCarouselImageUrl(i))}
```

**Ours:** NoteEditor.svelte:1369-1376 binds the typed value straight to `slide.url` via `updateCarouselSlide(index, 'url', …)`, so there is no `pendingUrl` staging field, no check-button to confirm it, no keyup.enter handler and no paste interception. Recorded as a divergence rather than a defect: with a directly-bound field the confirm step has nothing left to do. The one behaviour genuinely lost is that pasting a non-image URL is indistinguishable from pasting an image one.

> Verified: I could not disprove this. The reference behaviour is confirmed present in the bundle, and no counterpart exists anywhere in apps/room/src.

---

## ModalHost: session-control modal

17 verified gaps; 50 reference behaviours confirmed present.

### SC-01 — Session History pane is a hardcoded empty state; its "Load History" button has no handler and there is no Refresh button, no list, and no data source

**BUILT 2026-08-30 04:30 UTC.** Both of upstream's branches (`EDe` and `DDe`), decoded with `app-session-control-modal`'s own consts table — the empty state with `Load History`, the loaded state with `Refresh` and one `<a class="list-group-item …">` per entry carrying `eventName`, `created` through `date:'medium'` and `eventValue`. Behind it: a `session_history` table, `recordSessionEvent`, and `getSessionHistory` as a presenter-gated `query` that takes no argument, so no caller can name another room. **WHICH events is a decision and says so:** the reference's server is not in the capture, so this room records the acts it already has a presenter-gated room-scoped command for — chat-mode change, soft and hard reset, session opened, close message saved/cleared — the same test `room_state` applies. The read is capped at 100 newest where the reference has no cap. `session-history-contract.test.ts` executes every writer, both refusal directions and the room scoping.

**high** · `missing-behaviour` · reference byte **2,146,310**

```
function DDe(t,n){if(1&t){const e=Y();d(0,"div",119)(1,"div",120)(2,"button",121),x("click",function(){return D(e),E(g(3).appService.fetchSessionHistory())}),T(3,"i",122),v(4," Refresh "),u()(),ht(5,TDe,9,6,"a",123,sDe),u()}if(2&t){const e=g(3);m(5),pt(e.appService.globals.sessionHistory)}}function EDe(t,n){if(1&t){const e=Y();d(0,"div",120),v(1,"No session history."),u(),d(2,"div",120)(3,"button",121),x("click",function(){return D(e),E(g(3).appService.fetchSessionHistory())}),T(4,"i",122),v(5," Load History "),u()()}}
```

**Ours:** apps/room/src/lib/components/ModalHost.svelte:4719-4721 renders `No session history.` unconditionally, followed by `<button class="btn btn-primary"><i class="fas fa fa-sync"></i> Load History </button>` with NO onclick, no type="button", and no `Refresh`/list branch. Grepping all of apps/room/src for `sessionHistory`, `fetchSessionHistory`, `session_history`, `eventName` returns nothing outside this literal text — no remote function, no table, no loader. This is exactly the shape CLAUDE.md forbids: a control whose only effect is nothing.

> Verified: I could not find any implementation in apps/room/src. Searched (excluding node_modules) for sessionHistory, session_history, session-history, getSessionHistory, fetchSessionHistory, "Load History"/loadHistory, Refresh, eventName/event_name/eventValue/event_value, and case-insensitive "History" across the whole tree, plus every *.remote.ts…

### SC-02 — A/V pane opens on two FABRICATED device entries and never enumerates on open — loadDevices() runs only from the Refresh button

**ALREADY BUILT — verified by reading 2026-08-30 14:13 UTC, not rebuilt; the second half is a DELIBERATE DIVERGENCE.** The fabricated entries are gone and `AvDevicePane.svelte`'s header names them: `Studio Display Microphone (05ac:1118)` and `Studio Display Camera (15bc:0000)`, with 64-character device ids that appear nowhere in the reference bundle and nowhere else in this repository — **somebody's real hardware, hardcoded, shown to every viewer as their own and pre-selected in both dropdowns**. Both selects seed from the saved settings now. The row's second half — enumerating in `ngAfterViewInit` — is refused with its reason at the same place: `loadDevices` calls `getUserMedia` (an unpermitted `enumerateDevices` returns devices with empty labels) and `media-capture-contract.test.ts` keeps every capture behind an explicit click, so opening a settings pane must not prompt a presenter for their camera and microphone. The pane says it has not looked yet, and Refresh is what looks — which is also why SC-10's "Please connect…" fallback matters more here than upstream.

**high** · `defect` · reference byte **2,159,387**

```
ngAfterViewInit(){var e=this;this.appService.globals.isPresenter&&!this.appService.globals.chatOnlyMode&&(this.loadDevices(),I(function*(){let i=yield e.appService.invokeAdminCmd("getStreamServers");e.serverArr=i.servers,P("streamServers: ",e.serverArr),e.handleStreaming()})())}
```

**Ours:** apps/room/src/lib/components/ModalHost.svelte:652-668 seeds `audioDevices`/`videoDevices` with invented literals — deviceId `953f11aeca98147407fe5afe290dc18b384306c979179ce7a96ec4b92148ab5b` / label `Studio Display Microphone (05ac:1118)` and `2da3a3313185023c68e57b8bd07c010fe3975db1a2962584c0b6b493aa5c708a` / `Studio Display Camera (15bc:0000)` — and `currentAudioDevice`/`currentVideoDevice` are seeded to those same invented ids, not from the saved `audioDeviceID`/`videoDeviceID` preference. `loadDevices` (ModalHost.svelte:1708) has exactly ONE call site, the Refresh button at ModalHost.svelte:4311; no `$effect` runs it when the modal or the A/V tab opens (the only session-scoped effect is ModalHost.svelte:1965-1968, which just restores the tab). So the presenter is shown two devices that do not exist on their machine, pre-selected, until they press Refresh.

> Verified: Could not refute. All three parts of the claim verified.

### SC-03 — The chosen audio input device is inert — `audioDeviceID` is written by the select and read by nothing; mic capture calls getUserMedia({audio:true})

**ALREADY BUILT — verified by reading 2026-08-30 14:13 UTC, not rebuilt.** `#lib/capture-settings.ts` carries the reference's constraint rule verbatim (byte 2,160,736's siblings) and `local-capture.svelte.ts:370` builds the microphone's `getUserMedia` from it. Its own header records what this was: *"`{ audio: true }` until 2026-08-30, so the A/V pane's microphone select and its three processing checkboxes wrote preferences and changed nothing."* `retryCount` is what decides between the exact-device constraint and the fallback, which is upstream's own shape.

**high** · `defect` · reference byte **2,160,736**

```
onAudioDeviceChange(e){console.log("onAudioDeviceChange: "+e),this.appService.globals.audioDeviceID!==e&&(this.appService.globals.audioDeviceID=e,this.appService.localstorage.set("audioDeviceID",e))}onVideoDeviceChange(e){this.appService.globals.videoDeviceID!==e&&(this.appService.globals.videoDeviceID=e,this.appService.localstorage.set("videoDeviceID",e))}
```

**Ours:** apps/room/src/lib/components/ModalHost.svelte:4332 writes `onPreferenceChange('audioDeviceID', currentAudioDevice)`. A repo-wide grep for `audioDeviceID` / `audioDeviceId` outside that one line returns nothing — no consumer. The microphone path is apps/room/src/lib/room/local-capture.svelte.ts:340, `navigator.mediaDevices.getUserMedia({ audio: true })`, with no `deviceId` constraint anywhere in the file. The VIDEO half is wired (create-room.svelte.ts:675 reads `prefs.loaded.videoDeviceID`, consumed at local-capture.svelte.ts:508/633 and media-transport.svelte.ts:937), which is what makes the audio half's absence a defect rather than a design.

> Verified: Could not refute. `audioDeviceID` is written at ModalHost.svelte:4332 and read nowhere: a grep across all of apps/ (excluding node_modules, .vercel/, build/, .svelte-kit/, docs/source) returns that single line.

### SC-04 — Enable/Disable Stream Player write a per-user preference `streamingPlayerEnabled` that nothing in the repository reads — the reference sends a room-level admin command

**BLOCKED 2026-08-30 03:30 UTC, and the dead write is gone.** The row's diagnosis is exact and the preference write has been removed — `streamingPlayerEnabled` is retired in `dead-preference-keys.ts` so the copies already in accounts are pruned. Wiring it was MEASURED and refused rather than deferred: the reference gets both the state and the link from its own server (`getPlayerLink()` → `invokeAdminCmd("streamStatus")` → `rc.enablePlayer` / `rc.playerURL`, byte 2,170,505), the client composes neither, and that server is not in the capture. What the feature *is*, from the pane's own blurb, is a public page rendering one room's screenshares to whoever holds a link — which needs an anonymous media grant nobody has designed, and `CLAUDE.md` forbids inventing an authority decision. Both buttons are `disabled` with the reason on screen; `stream-player-blocked-contract.test.ts` keeps them that way. **Unblocked by:** a decision on anonymous playback authorization, plus a MediaMTX host.

**high** · `defect` · reference byte **2,170,728**

```
enablePlayer(){var e=this;return I(function*(){let i=yield e.appService.invokeAdminCmd("changePlayerStatus",{enablePlayer:!0});console.log("enablePlayer rc:",i),e.getPlayerLink()})()}disablePlayer(){var e=this;return I(function*(){let i=yie
```

**Ours:** apps/room/src/lib/components/ModalHost.svelte:4458-4476 flips local `streamPlayerEnabled` and calls `onPreferenceChange('streamingPlayerEnabled', true|false)`. That key is written on those two lines and NOWHERE else in the whole repository (grep across apps/** and services/** for `streamingPlayerEnabled` returns only ModalHost.svelte:4462 and :4471). `prefs.save` (prefs.svelte.ts:532-614) persists it as this VIEWER's preference and mirrors it to localStorage; no server command is sent and no viewer-facing player is enabled. This is the identical defect class already recorded for `chatMode` in apps/room/src/lib/chat-mode.ts — a room-level presenter act modelled as a per-user preference.

> Verified: I could not find any implementation and the search strengthened the claim rather than refuting it. WHAT I READ IN THE REFERENCE (offsets observed, not reused):
- `changePlayerStatus` occurs at byte 2170816 only (I enumerated: 1 occurrence).

### SC-05 — Stream Player pane has no Player Link readout, no Copy button and no border-colour binding (the whole yDe block)

**BLOCKED 2026-08-30 03:30 UTC**, on the same absent value as SC-04: `streamingLinkPlayer` is assigned from `rc.playerURL`, which arrives from a server not in the capture. Composing a link here would mean inventing a public playback endpoint and its authorization. Recorded rather than guessed; see the note on SC-04 for what unblocks it.

**medium** · `missing-control` · reference byte **2,143,225**

```
function yDe(t,n){if(1&t){const e=Y();d(0,"div")(1,"div",105)(2,"label",106),v(3," Player Link (give this to viewers to be able to see your broadcast, each time you enabled the player this link changes): "),u(),d(4,"button",83),x("click",function(){return D(e),E(g(2).copyToClipboardPlayer())}),T(5,"i",107),v(6," Copy "),u()(),T(7,"textarea",108),u()}if(2&t){const e=g(2);m(7),Lo("border-color",e.streamingPlayerEnabled?"green":"red"),z("value",e.streamingLinkPlayer)}}
```

**Ours:** apps/room/src/lib/components/ModalHost.svelte:4438-4477 renders only the blurb, the status span and the two buttons. There is no `textarea#streaming-link-playyer`, no `copyToClipboardPlayer` equivalent, and no `streamingLinkPlayer` state — grep for `streamingLinkPlayer`, `streaming-link-playyer` and `Player Link` across apps/room/src returns zero. The presenter can toggle the player but can never obtain the link the toggle exists to produce.

> Verified: I could not find the Player Link readout anywhere in apps/room/src, under its own name, its label text, its handler name, or any synonym. Our Stream Player pane (ModalHost.svelte:4436-4477) is exactly three things: the explanatory paragraph, the "Stream Player enabled:" status span colour-bound to `streamPlayerEnabled`, and the Enable/Dis…

### SC-06 — Stream player state is never seeded from the server (`streamStatus` / getPlayerLink), so the readout always says false on open

**BLOCKED 2026-08-30 15:28 UTC, on the same absent server as SC-04 and SC-05 — it is their seeding half.** The row's own evidence is the argument: `getPlayerLink()` awaits `invokeAdminCmd("streamStatus")` and reads `rc.enablePlayer` and `rc.playerURL` off the answer. Both values come FROM a server that is not in the capture, and the client composes neither. There is nothing here to seed from.

**What the pane says now is not the defect this row describes, and the difference matters.** `streamPlayerEnabled` no longer exists: SC-04's close removed the dead per-user preference and the state it fed, and the readout is a literal `false` in red beside two `disabled` buttons and an `alert alert-info` saying *"The stream player is not available in this deployment: it needs a public playback page, and there is no server here that issues one."* So `false` is the TRUE state of this deployment rather than a stale default — a seeded value would be seeding a lie. **Unblocked by:** the same two things SC-04 names — a decision on anonymous playback authorization, and a MediaMTX host.

**medium** · `missing-behaviour` · reference byte **2,170,505**

```
getPlayerLink(){var e=this;return I(function*(){let i=yield e.appService.invokeAdminCmd("streamStatus");console.log("getPlayerLink rc:",i),e.streamingPlayerEnabled=i.rc.enablePlayer,e.streamingLinkPlayer=i.rc.playerURL})()}
```

**Ours:** apps/room/src/lib/components/ModalHost.svelte:673 `let streamPlayerEnabled = $state(false);` — seeded to a constant and only ever written by the two buttons at :4460 and :4469. Nothing calls a status endpoint. A presenter who enabled the player in a previous session reopens the pane and is told `Stream Player enabled: false`.

> Verified: I could not refute this. In our source the Stream Player readout is fed by exactly one variable, `streamPlayerEnabled`, declared as a literal `$state(false)` and written only by the two buttons in the same pane; nothing in the repository reads any server-side player status.

### SC-07 — "Swap Primary and Backup Media Servers" button absent, with its password gate and confirm

**BLOCKED 2026-08-30 15:28 UTC on a backup media cluster, and its password gate is a DELIBERATE DIVERGENCE that would not be reproduced even if the cluster existed.** Decoded at byte 2,173,860:

```js
switchToBackup() {
  this.appService.globals.sessData.deleteAlertPW
    ? bootbox.prompt({ title: "Please enter the password for this action:", …
        callback: e => { e && (e.trim() === this.appService.globals.sessData.deleteAlertPW
          ? bootbox.confirm("Are you sure you want to switch to the backup cluster? …",
              o => { o && (this.appService.invokeAdminCmd("swapBackupClusterID", {}), …) })
          : bootbox.alert("Wrong password!")) } })
    : bootbox.confirm("Are you sure you want to switch to the backup cluster? …", …)
}
```

Two independent blockers, and they are not the same kind of thing.

**The credential.** The gate compares the typed password **in the browser** against `sessData.deleteAlertPW` — one of the seven credentials this room's boundary refuses outright, and the exact shape of the 2026-08-07 privilege escalation: a member who can read `sessData` reads the password and answers their own prompt. This is the third control found doing it (`allRoomsWelcomeMatPW` on the welcome mat, and `needPasswordForUserNotes`), and the correct shape is the one those two settled on: **the credential stays on the controller and the QUESTION travels**. That half is designable today and is not what blocks the row.

**The cluster.** `swapBackupClusterID` swaps the room onto `backupClusterID`, a media-server identity this deployment does not have — there is one media plane here and no second cluster to fail over to, so the command has nothing to name. `backupClusterID` and `primaryClusterID` are unwired controller settings, and their manage-page note already records that they stay unwired for this reason. **Unblocked by:** a second MediaMTX cluster, at which point the password gate is built as a server-side check on the controller and never as a string comparison in a browser.

**medium** · `missing-control` · reference byte **2,140,720**

```
function lDe(t,n){if(1&t){const e=Y();d(0,"button",89),x("click",function(){return D(e),E(g(2).switchToBackup())}),v(1," Swap Primary and Backup Media Servers "),u()}}
```

**Ours:** Not built. The reset pane at apps/room/src/lib/components/ModalHost.svelte:4139-4192 goes straight from Soft Reset (:4162) to Hard Reset (:4176) with no swap control. Repo-wide case-insensitive grep for `swapBackup`, `switchToBackup`, `backup cluster`, `Swap Primary` across apps/room/src returns nothing; `backupClusterID` exists only as an unwired controller setting (apps/controller/src/lib/room-settings-schema.ts). The reference gates it on `sessData.backupClusterID` (`O(36,e.appService.globals.sessData.backupClusterID?36:-1)` at 2154613), so it is conditional there too — but a room with a backup cluster has no way to swap here.

> Verified: I could not find the control in apps/room/src under any name. The session-control reset pane in ModalHost.svelte runs Reload Session Config -> Refresh Roster & Count -> Soft Reset Session (:4169) -> Hard Reset/All Reload (:4182) -> Hard Reset and Revoke Tokens (:4193) with no swap control between them; the only occurrence of "backup" anyw…

### SC-08 — "Admin Dashboard Login" button (and its preceding <hr>) absent

**OWNER DECISION 2026-08-30 15:28 UTC. The shape is not in doubt and the credential is not the obstacle — the question is whether a room may hand somebody a signed-in controller session.** Decoded end to end, at bytes 2,175,167 and 1,153,962:

```js
adminLogin() { bootbox.confirm("Are you sure you want to login to the Admin Dashboard?",
                 e => { e && this.appService.doAdminLogin() }) }

doAdminLogin() { this.httpClient
  .post(`${globals.apiROOT}/sessions/v2/loginToAdminFromRoom`, { sessID, token })
  .subscribe({ next: i => i?.success && i.loginURL
      ? window.open(i.loginURL.startsWith("https://") ? i.loginURL : "https://" + i.loginURL, "_blank")
      : bootbox.alert(i?.msg || "There was an error logging in, …"),
    error: i => bootbox.alert(i?.error?.msg || "Not authorized or there was a server error.") }) }
```

**`modAdminLoginList` never reaches the browser here or upstream.** The client posts its session id and token and the SERVER answers `{success, loginURL}` or refuses; the list is consulted where it lives. That is this repository's own doctrine — *every authority decision is made on the server from data the server owns* — so the row is **not** blocked on the credential boundary the way SC-07's password gate is, and the audit's note that `modAdminLoginList` is unwired is true but not the obstacle.

What it is blocked on is one question the owner has to answer, because `CLAUDE.md` forbids inventing an authority decision: **may a presenter inside a room be handed an authenticated session for the controller, and for which account?** The controller here is not a read-only dashboard — it manages billing, room creation and every credential on this list. Minting a session for it from a room handoff is new authentication surface, not a link.

Two answers are costed and either is buildable in a day:

* **Yes, mint one.** `internal/room-admin-login/[code]` on the controller, on the read capability, checking the named member against the room's `modAdminLoginList` and its owner, and returning a one-shot login URL with a short TTL. The room's half is a presenter-gated remote function and the confirm above.
* **No, just point at it.** The same endpoint answers a boolean and the room opens the controller's ordinary login page. No session is minted and nothing is authenticated by the room; the member signs in themselves. Diverges from the reference, which auto-logs-in, and the divergence would be recorded.

**Not built either way until that is answered**, and the button is deliberately absent rather than present-and-inert: an "Admin Dashboard Login" that opens a login form somebody cannot pass is worse than no button.

**medium** · `missing-control` · reference byte **2,140,887**

```
function cDe(t,n){if(1&t){const e=Y();T(0,"hr"),d(1,"button",90),x("click",function(){return D(e),E(g(2).adminLogin())}),v(2," Admin Dashboard Login "),u()}}
```

**Ours:** Not built. Grep of apps/room/src for `adminLogin`, `Admin Dashboard`, `admin panel` returns nothing. Its gate, `modAdminLoginList`, exists in this repo only as an unwired controller setting (apps/controller/src/lib/room-settings-schema.ts:221, `wired: false`) and as a name in apps/room/src/lib/setting-coverage-contract.test.ts:176. The confirm string "Are you sure you want to login to the Admin Dashboard?" (bundle 2175167) has no counterpart here.

> Verified: I could not find any counterpart in apps/room/src, and I searched hard for one. Searches run over apps/room/src (and, excluding the pinned bundle, the whole repo): `adminLogin`, `doAdminLogin`, `admin_login`, `admin-login`, `adminDashboard`, `admin dashboard`, `admin panel`, `adminPanel`, `admin-panel`, `admin area`, `control panel`, `das…

### SC-09 — A/V error alert has no icon and no "Retry" button — the retry control is missing entirely

**BUILT 2026-08-30 14:13 UTC, and it is the one of the four that mattered.** Every error this pane can raise is TRANSIENT — a denied permission the member can grant, a device they can plug in, a page they can reload over HTTPS — and the only way out was the Refresh button at the TOP of the pane, above a red block that ends the reading. Somebody who had just fixed the problem the message describes had nothing beside the message to press. The icon (const 92), the button (const 93 `btn btn-sm btn-outline-secondary ml-2`), its `fa-redo` and the literal ` Retry ` are all the reference's, and Retry calls the SAME `loadDevices` Refresh does — a retry that took a different path would be two ways to answer one question.

**medium** · `missing-control` · reference byte **2,141,127**

```
function uDe(t,n){if(1&t){const e=Y();d(0,"div",50),T(1,"i",92),v(2),d(3,"button",93),x("click",function(){return D(e),E(g(2).loadDevices())}),T(4,"i",94),v(5," Retry "),u()()}if(2&t){const e=g(2);m(2),Ne(" ",e.devicesLoadError," ")}}
```

**Ours:** apps/room/src/lib/components/ModalHost.svelte:4321-4323 renders `<div class="alert alert-danger">{devicesLoadError}</div>` and nothing else — no `i.fas.fa-exclamation-triangle`, no `button.btn-sm.btn-outline-secondary.ml-2` with `i.fas.fa-redo` and label " Retry ". After a permission denial the only way back is the Refresh button further up the pane.

> Verified: I could not refute this. Our A/V device-selection error render is literally `{#if devicesLoadError}<div class="alert alert-danger">{devicesLoadError}</div>{/if}` (ModalHost.svelte:4321-4323) with no child elements at all — no `i.fas.fa-exclamation-triangle` and no Retry button.

### SC-10 — No "Please connect audio/video devices." fallbacks — the empty select renders instead

**BUILT 2026-08-30 14:13 UTC.** `O(99, audioDevicesList?.length > 0 ? 99 : devicesLoading || devicesLoadError ? -1 : 100)` — a three-way gate whose middle arm is "the block above has already said something". The fallback replaces the WHOLE group (label, select and the "Selected:" line) rather than sitting beside it. **This matters more here than upstream:** SC-02's recorded divergence means this pane deliberately opens with both lists empty, so an empty dropdown that opens onto nothing was the first thing a member saw every single time, with no statement of why. Both crossed-out icons are the reference's and they are not the same one — `fa-microphone-slash` and `fa-video-slash`.

**medium** · `missing-behaviour` · reference byte **2,142,196**

```
function mDe(t,n){1&t&&(d(0,"div",100),T(1,"i",101),v(2," Please connect audio devices. "),u())}
```

**Ours:** apps/room/src/lib/components/ModalHost.svelte:4325-4362 renders both `<select>`s unconditionally with an `{#each}` that produces zero `<option>`s when the list is empty, plus a `Selected: Unknown Device` line. The reference switches on `O(99,e.audioDevicesList&&e.audioDevicesList.length>0?99:e.devicesLoading||e.devicesLoadError?-1:100)` (bundle 2154772) and renders `mDe`/`vDe` — `i.fas.fa-microphone-slash` / `i.fas.fa-video-slash` with those two sentences — instead. Grep of apps/room/src for `Please connect audio devices` / `Please connect video devices` returns zero.

> Verified: I could not refute this. The session-control modal's av-device-selection tab renders both <select>s unconditionally with no empty-list guard.

### SC-11 — The three audio-constraint checkboxes are seeded to `false` rather than from the saved preferences, so they always open unchecked

**ALREADY BUILT — verified by reading 2026-08-30 14:13 UTC, not rebuilt.** All three seed from `capture` in `AvDevicePane.svelte:61-63`, with `untrack` because they are seeds and then locally owned — the user must be able to tick a box without the preference having round-tripped. The table in that file's header lists this row's three controls beside the two device selects as one fix; the pane was extracted for it.

**medium** · `defect` · reference byte **2,155,032**

```
preferences.echoCancellation),m(4),z("checked",e.appService.globals.preferences.noiseSuppression),m(4),z("checked",e.appService.globals.preferences.autoGainControl)
```

**Ours:** apps/room/src/lib/components/ModalHost.svelte:649-651 — `let echoCancellation = $state(false); let noiseSuppression = $state(false); let autoGainControl = $state(false);` — local state seeded to a constant, bound with `bind:checked` at :4372, :4384, :4396 and written back via `onPreferenceChange`. No prop and no read of `prefs.loaded.*` for any of the three, so a presenter who turned Echo Cancellation on last week reopens the pane and sees it off. (The reference's own handlers at 2169493 flip `globals.preferences.echoCancellation` and `setPreference` it; the template reads that same object back.)

> Verified: I could not refute it; the claim holds, and the reference comparison makes it slightly worse than stated. WHAT I SEARCHED (all under /home/user/trading-room-app/apps/room): exact tokens `echoCancellation`, `noiseSuppression`, `autoGainControl` across all of `src/` — exactly 9 hits, ALL in `ModalHost.svelte` (the three `$state(false)` decl…

### SC-12 — Restream textarea is never seeded from the room's stored restream URL

**BUILT 2026-08-30 14:50 UTC, together with SC-13 — they are one defect with two halves.** `restreamLink` was `$state('')` with no prop and no read of the room config; it is `$state(untrack(() => restreamUrl ?? ''))` now, fed from `data.sessData?.restreamToURL` in `RoomOverlays.svelte`. `untrack` for the reason `streamingProtocol` two lines above it gives: this is a SEED and then locally owned, so the presenter can type without the write having round-tripped, and the `invalidateAll()` after a successful save cannot overwrite what is being typed. **Reading it required a setting that did not cross the boundary at all** — see SC-13 for the third allow-list that was built to carry it, and why it is not on the list every member receives.

```
e.restreamLink=e.appService.globals.sessData.restreamToURL?e.appService.globals.sessData.restreamToURL:"",e.streamKey=e.appService.globals.mtxToken,e.streamingLink=`http://${e.appService.globals.streamServerMTX}:8889/room__${e.appService.gl
```

**Ours:** apps/room/src/lib/components/ModalHost.svelte:682 `let restreamLink = $state('');` — a constant, with no prop and no read of the room config. The Restream pane (ModalHost.svelte:4726-4747 region, textarea `#restream-link` bound with `bind:value`) therefore opens empty even when a restream destination is already configured, so "Set Restream URL" on an unmodified pane would clear it.

> Verified: I could not refute it. `restreamLink` has exactly five references in all of apps/room/src, every one in ModalHost.svelte: the declaration `let restreamLink = $state('');` (691), the two reads in saveRestreamLink (1626-1627), the reset in clearRestreamLink (1634), and `bind:value` on the textarea (4719).

### SC-13 — Set/Clear Restream URL write a per-user preference `restreamToURL` that nothing reads, instead of the room-level `setRestreamURL` command

**BUILT 2026-08-30 14:50 UTC, and it is the largest row of this slice — a boundary, not a handler.** The audit's reading was exact: `onPreferenceChange('restreamToURL', …)` is `prefs.save`, this VIEWER's settings row, and those two calls were the only occurrences of the name in `apps/room/src`. A presenter typed a destination, pressed Set, and the room republished nowhere — **while the pane went on displaying the value, which is the specific reason it could survive being looked at**. `setRestreamUrl` in `session-commands.remote.ts` writes through `internal/room-setting` now, the same seam `overwriteCashRegisterSound` uses and for the reason that endpoint's docblock gives: a durable per-room value broadcast over the event channel would change every browser's belief and persist nothing.

**What was NOT obvious, and is the divergence recorded rather than matched:** `restreamToURL` is a ROOM setting on the controller, and the room's config boundary had exactly two allow-lists — read by every member, and written. Adding it to the first would have put the value in the SSR payload of **every viewer's page load**, because `+page.server.ts` returns `sessData` from a load and SvelteKit serialises a load's return. The reference does exactly that (`globals.sessData.restreamToURL`). It must not be copied: the Manage page keeps `restreamToURLKey` as a separate field, so on paper the destination and the key are separate values — but YouTube hands out `rtmp://a.rtmp.youtube.com/live2/<STREAM-KEY>` and Twitch `rtmp://<ingest>/app/live_<KEY>` as ONE string, and the reference's own validator (`startsWith('rtmp://') && !includes(' ')`) accepts precisely that. Anybody holding it can publish to the presenter's channel.

So a THIRD allow-list, `ROOM_PRESENTER_SETTINGS`, projected by `internal/room-config/[code]` only for a member it has already computed `isP` for — merged into `settings` so the room reads one object, and `{}` for anybody else, which makes a participant's payload byte-identical to what it was before the list existed. Safe to be per-member because that endpoint is already called with `?email=` and the room's client caches per `shortCode\u0000email` in a per-request `WeakMap`. `isRoomWritableSetting` was widened to accept presenter-visible, and that is a restatement rather than a relaxation: its rule was never "on the general read list" but "readable by the party that can write it", and the endpoint refuses every caller who is not an owner or true presenter.

The validation is the reference's and is applied twice — in the pane to raise its own alert without a round trip, and again on the server, because a remote command is reachable without the pane and a hidden button is not a check.

```
startRestream(e=!1){if(e)return this.appService.invokeAdminCmd("setRestreamURL",{restreamToURL:""}),void(this.restreamLink="");this.restreamLink.startsWith("rtmp://")&&!this.restreamLink.includes(" ")?this.appService.invokeAdminCmd("setRest
```

**Ours:** apps/room/src/lib/components/ModalHost.svelte:1616-1627 — `saveRestreamLink()` calls `onPreferenceChange('restreamToURL', restreamLink)` and `clearRestreamLink()` calls `onPreferenceChange('restreamToURL', '')`. Those two lines are the only occurrences of `restreamToURL` in apps/room/src outside a contract-test name list; nothing in the room or in services/** consumes it, and `prefs.save` stores it as this viewer's preference. The VALIDATION half is faithful (startsWith('rtmp://') && !includes(' '), with the verbatim alert at apps/room/src/lib/room/user-actions.svelte.ts:511) — it is the write path that is at the wrong level.

> Verified: I could not find a room-level write path anywhere in our source. `saveRestreamLink()` / `clearRestreamLink()` call `onPreferenceChange('restreamToURL', ...)`, which is bound at RoomOverlays.svelte:581 to `prefs.save(key, value)`; `prefs.save` (prefs.svelte.ts:532) mirrors into the decoded snapshot, offers the key to `#hooks.onSideEffect`…

### SC-14 — Non-presenter (hasMic) body — the ngForm device-change flow — is not built, and there is no other working device picker for a non-presenter

**BUILT 2026-08-30 15:16 UTC, with SC-17 — they are one change, and the verifier's correction is what made it small.** The verifier was right that the picker itself already exists (`AvDevicePane`); what was missing was the ARM that renders it for a member and the navbar item that reaches it. Both halves are decoded rather than assumed:

```js
O(9, !isPresenter && user.hasMic ? 9 : -1)                              // the body,   byte 2,184,295
O(29, !isPresenter && !user.hasMic || isLimitedPresenter ? -1 : 29)     // the navbar, byte 2,489,576
function f4e(t,n){ d(0,"li",192), x("click", () => doSessionControl()), … v(4,"Session Control") … }
```

Slot 29 is the navbar's **Session Control** item, and it is the ONE entry in that presenter block whose gate is wider than `isPresenter`. So upstream a member holding the mic permission gets the item, and the modal answers them with the device picker alone. Here they could produce audio — `joinsMediaAsProducer(isPresenter || hasCam || hasMic || hasScreen)` has been honoured since the permissions work — and had no way to choose which microphone it came from.

`!isLimitedPresenter` is the reference's own term and is not redundant: `giveMicScreen` assigns `globals.user.isPresenter = globals.isLimitedPresenter = globals.isPresenter = e.give`, so somebody handed mic and screen at runtime satisfies `isPresenter`, and upstream deliberately withholds room administration from them. `hasMic` is the durable membership permission, one of the five `permissions_json` keys.

**Two divergences recorded at the code, and the second is forced by one of ours.** (1) It applies on CHANGE rather than on submit: `submitNewDevices(form)` writes the same two preference keys the presenter's selects write, only later, and keeping the submit button would mean one modal in which the identical control behaves two ways depending on who opened it. (2) It HAS a Refresh button, which `LDe` does not — SC-02's divergence means this room does not enumerate on open, so without Refresh a member would read "Please connect audio devices." forever with no way to answer it.

**medium** · `missing-control` · reference byte **2,156,909**

```
function LDe(t,n){if(1&t){const e=Y();d(0,"form",131,0),x("ngSubmit",function(){D(e);const o=It(1);return E(g().submitNewDevices(o))}),H(2,PDe,6,1,"div",52)(3,RDe,2,0)(4,ODe,6,1,"div",52)(5,NDe,2,0),d(6,"button",132),v(7," Change Devices "),u()()
```

**Ours:** apps/room/src/lib/components/ModalHost.svelte:4092-4765 renders ONE body for everyone; there is no `!isPresenter && user.hasMic` branch, no `<form>` with named `audioID`/`videoID` controls and no submit-time `submitNewDevices` equivalent (grep for `submitNewDevices` and `audioID` returns zero). The only entry points to this modal, RoomNavbar.svelte:548 (mic gear) and :661 (Session Control), both sit inside `{#if isPresenter}` (opened at RoomNavbar.svelte:348, closed at :669), so a non-presenter with a mic cannot reach any device picker at all — the `Change Devices` button at ModalHost.svelte:3973 belongs to `app-av-settings-modal` and is itself a stub with two empty `<select>`s and no handler.

> Verified: The claim's core holds, with one correction. The device picker ITSELF is built: ModalHost.svelte:4316-4420 is the `av-device-selection` tab of the session-control modal, with `<select id="audio-deviceList" aria-label="Audio device (input)">` bound to `currentAudioDevice` (:4348-4358), `<select id="video-deviceList" aria-label="Video devic…

### SC-15 — Refresh Devices button has neither the `disabled` binding nor the spinner/sync icon swap

**BUILT 2026-08-30 14:13 UTC.** `z("disabled", e.devicesLoading)` and `z("ngClass", e.devicesLoading ? "fa-spinner fa-spin" : "fa-sync-alt")` at byte 2,154,613. The button was always live and its icon never moved, so pressing Refresh twice fired a second `getUserMedia` while the first was still resolving — and the pane looked identical throughout, which is exactly why anybody would press it twice.

**low** · `missing-behaviour` · reference byte **2,154,613**

```
z("disabled",e.devicesLoading),m(),z("ngClass",e.devicesLoading?"fa-spinner fa-spin":"fa-sync-alt")
```

**Ours:** apps/room/src/lib/components/ModalHost.svelte:4306-4314 — the button has `title="Refresh device list"` and the right classes but no `disabled={devicesLoading}`, and its icon is a static `<i class="fas fa-sync-alt">`. The consts entry at bundle 2178854 confirms the reference declares both bindings on this element: `["type","button","title","Refresh device list",1,"btn","btn-sm","btn-outline-primary",3,"click","disabled"],[1,"fas",3,"ngClass"]`. A presenter can queue several enumerations by clicking repeatedly.

> Verified: I could not refute this. The button exists but genuinely carries neither binding, and no module, action or wrapper supplies them.

### SC-16 — Loading-devices indicator uses the wrong container class

**BUILT 2026-08-30 14:13 UTC.** Const 49 is `[1,"alert","alert-info"]` and this read `text-center my-3`. Not cosmetic: its twin below — const 50 `alert alert-danger` — already WAS a panel, so a loading state rendering as bare centred text beside an error rendering as a bordered block reads as two different KINDS of message, when they are the two outcomes of one button.

**low** · `wrong-constant` · reference byte **2,178,854**

```
[1,"alert","alert-info"],[1,"alert","alert-danger"]
```

**Ours:** apps/room/src/lib/components/ModalHost.svelte:4316-4319 renders `<div class="text-center my-3"><i class="fas fa-spinner fa-spin"></i> Loading devices...</div>`. The reference's `dDe` uses const 49, `alert alert-info` (the error alert, const 50 `alert alert-danger`, IS matched at :4322). Cosmetic only — the sentence and the icon are right.

> Verified: I could not refute it. Reference: at offset 2141078 the bundle reads `function dDe(t,n){1&t&&(d(0,"div",49),T(1,"i",91),v(2," Loading devices...

### SC-17 — Body is not gated on isPresenter inside the component — the presenter body is the only body and renders for whoever opens the modal

**BUILT 2026-08-30 15:16 UTC, and building it WITH SC-14 is the point rather than a convenience.** The row files this `low` because nothing was exposed in practice: both entry points sat inside `RoomNavbar`'s `{#if isPresenter}`, and every button in the body is server-authorised, so it was defence-in-depth. **SC-14 is precisely the navbar edit that row named** — *"one navbar edit away from rendering Hard Reset and Lock Session to a member"* — so the two were done in one change, gate first.

`{#if isPresenter}` now opens before the tab strip and closes after the last panel, with `{:else if hasMic}` beside it and `Done` outside both, which is the reference's own shape (`O(8, …)` / `O(9, …)` and the footer outside).

**Its contract found itself twice, and both are recorded in that file's header.** The first draft asserted containment by POSITION — every marker's index greater than the gate's — which is true of everything after the gate's opening whatever it encloses; a control that moved the `{/if}` up to close straight after the tab strip left it green with Hard Reset and Lock Session outside. **Third time in this repository a control has found the test rather than the code, and all three were the same mistake**: nesting asserted as order. The second: switching to a depth walk was still not enough, because every tab id also appears in the `{#each}` array that draws the tab STRIP — the assertion now uses each panel's own `id="…"`, which only the panels carry.

**low** · `divergence` · reference byte **2,184,295**

```
H(8,MDe,165,32)(9,LDe,21,5),u(),d(10,"div",8)(11,"button",9),x("click",function(){return o.done()}),v(12," Done "),u()()()()()),2&i&&(m(8),O(8,o.appService.globals.isPresenter?8:-1),m(),O(9,!o.appService.globals.isPresenter&&o.appService.globals.user.hasMic?9:-1))
```

**Ours:** apps/room/src/lib/components/ModalHost.svelte:4092-4765 has no `isPresenter` condition anywhere — not on the body, not on the `Session History` / `Webinar Tools` tabs that the reference gates with `rDe`/`aDe` (`O(16,…isPresenter?16:-1)`, `O(17,…isPresenter?17:-1)` at 2154613). Today the only entry points are presenter-gated in RoomNavbar.svelte:348, so nothing is exposed in practice; it is one navbar edit away from rendering Hard Reset and Lock Session to a member. Every one of those buttons is server-authorised, so this is defence-in-depth rather than an escalation.

> Verified: I could not refute it. The session-control modal in ModalHost.svelte (lines 4114-4787) contains no `isPresenter`, `hasMic` or role condition anywhere: an awk scan of that exact range finds only six `{#if}`s, all of them device/streaming state (devicesLoading, devicesLoadError, streamingProtocol RTMP/WHIP, streamingLinkRTMP, ingestError),…

---

## ModalHost: user-settings modal

17 verified gaps; 35 reference behaviours confirmed present.

### USM-02 — Alert-tab 'Users join/leave' group (4 checkboxes) missing while its consumers are live

**BUILT 2026-08-30, before this row was written down.** `ViewerAlertPrefsPane.svelte` renders all four with the reference's own ids (`beep-on-user-join`, `popup-on-user-join`, `beep-on-user-leave`, `popup-on-user-leave`) inside the `#appBeepOnUserJoinLeave` block, behind the reference's own gate — `(roomBeepOnUserJoin || roomJoinLeavePopup) && isPresenter`, byte 2,285,369. `ModalHost.svelte:3381` mounts it. Marked here on 2026-08-30 03:20 UTC after grepping the ids, not from memory: the audit was produced against an earlier tree and this row was already stale when it was filed.

**high** · `missing-control` · reference byte **2,269,797**

```
["id","appBeepOnUserJoinLeave","title","Beep on user",1,"pb-2"],[1,"fas","fa-user"],["type","checkbox","name","beep-on-user-join","value","Do not disturb","id","beep-on-user-join",1,"form-check-input",3,"change","checked"]
```

**Ours:** Zero hits in src/**/*.svelte for beep-on-user-join / popup-on-user-join / beep-on-user-leave / popup-on-user-leave or their preference names. The PREFERENCES exist and are read: prefs.svelte.ts:428-442 exposes popupOnUserJoin/popupOnUserLeave/beepOnUserJoin/beepOnUserLeave and src/lib/arrival-announcement.ts:30-59 consumes all four. So four live viewer preferences have no control anywhere in the room — the viewer cannot silence join/leave beeps or popups. Reference gate is `O(120,(o.appService.globals.sessData.beepOnUserJoin||o.appService.globals.sessData.userJoinAndLeavePopup)&&o.appService.globals.isPresenter?120:-1)` at offset 2285369.

> Verified: I could not find the control under any name. (1) Zero hits in any .svelte file for beep-on-user-join / popup-on-user-join / beep-on-user-leave / popup-on-user-leave, for the preference names beepOnUserJoin/Leave and popupOnUserJoin/Leave, or for label synonyms (Beep, "Beep on user", "Users join", join/leave, "join and leave") — the only .…

### USM-03 — 'Update Positions' checkbox missing — its consumer defaults to off and can never be turned on

**BUILT 2026-08-30, before this row was written down.** `ViewerAlertPrefsPane.svelte:104` renders `app-positions-update` behind `positionsIframe` (`O(119, sessData.positionsIframe && sessData.positionsIframeUrl ? 119 : -1)`, byte 2,285,255), and `prefs.svelte.ts:154` seeds it `!== false` to match the reference's `updatePositionsIframe:!0` at byte 980,052 — so the `=== true` coercion this row describes is gone as well. Marked 2026-08-30 03:20 UTC by reading the file.

**high** · `missing-control` · reference byte **2,269,626**

```
"app-positions-update","value","Do not disturb","id","app-positions-update",1,"form-check-input",3,"change","checked"
```

**Ours:** No `app-positions-update` / `updatePositionsIframe` control in ModalHost.svelte. The consumer is live: src/routes/+page.svelte:1238 passes `positionsAutoRefresh={prefs.loaded.updatePositionsIframe === true}` into PresentationArea.svelte:411 -> PositionsContainer.svelte:62 (`positionsRefreshRunning`). Nothing ever writes `updatePositionsIframe`, and the `=== true` coercion makes the absent key false, so the positions iframe auto-refresh is permanently off; the reference default is `updatePositionsIframe:!0` (read at offset 980052). Reference render gate: `O(119,o.appService.globals.sessData.positionsIframe` at offset 2285255.

> Verified: I could not find the control anywhere in apps/room/src. Searched: `app-positions-update`, `positions-update`, `positionsUpdate`, `updatePositionsIframe`, `positionsAutoRefresh`, `positionsRefreshRunning`, `positionsIframe`, the label text "Update Positions", and the synonyms "auto refresh"/"autoRefresh".

### USM-04 — Group Chat Control block is not gated on isPresenter && !isLimitedPresenter

**ALREADY BUILT — verified by reading 2026-08-30 15:36 UTC, not rebuilt.** `ModalHost.svelte` carries `{#if isPresenter && !isLimitedPresenter}` around the whole `#groupChatControl` box, with `O(290, …)` at byte 2,288,249 cited at the gate and the reason for the second term written beside it: `giveMicScreen` makes a member a presenter at runtime, and disabling the room's chat is not part of what that grant hands over. `user-settings-gates-contract.test.ts` pins it now, because a row found already built is a row nothing was watching.

**high** · `missing-control` · reference byte **2,288,249**

```
O(290,o.appService.globals.isPresenter&&!o.appService.globals.isLimitedPresenter?290:-1)
```

**Ours:** ModalHost.svelte:3599-3648 renders the `#groupChatControl` block — the three radios that fire `requestSettingsChatMode` -> `onChatModeChange` (an admin-level chat-mode change) — with NO surrounding `{#if}`. Between lines 2827 and 3844 the only `{#if isPresenter}` guards are at 2883 (presenter tab header) and 3652 (presenter pane). Every regular member therefore sees 'Regular Group Chat / Webinar Mode / Disable Group Chat' and gets the bootbox-equivalent confirm; the room's own rule is that authority controls fail closed.

> Verified: I could not find the gate anywhere in apps/room/src. The `#groupChatControl` block sits inside the `user-chat-settings` tab pane (opened at ModalHost.svelte:3453, `settingsTab === 'chat'`, whose nav-item at 2927 is NOT inside the `{#if isPresenter}` that wraps the presenter tab at 2942) with no surrounding `{#if}`: scanning lines 3454-371…

### USM-05 — Presenter-only action buttons (Remove preview windows / Mute all non-admins / Get my token) are rendered for everyone

**ALREADY BUILT — verified by reading 2026-08-30 15:36 UTC, not rebuilt.** The three sit inside `{#if isPresenter}` and **"Edit my Info and Avatar" is deliberately outside it**, which is the half of this row that is easy to over-fix: `O(135, …)` holds exactly three buttons and the const immediately after it is unconditional. Wrapping all four passes any "are they gated" check and takes a control away from every member, so the contract added today asserts the fourth is NOT gated as well.

**high** · `missing-control` · reference byte **2,285,714**

```
O(135,o.appService.globals.isPresenter?135:-1)
```

**Ours:** ModalHost.svelte:3214-3240 puts all four buttons inside one ungated `<div class="mx-3">`. In the reference only the last one is unconditional: the `[1,"mx-3"]` wrapper const (offset 2263375) carries the three presenter buttons under index 135 gated on `globals.isPresenter`, and the const immediately after it — `[1,"btn","btn-warning","btn-sm","m-1",3,"click"]` — is the always-rendered 'Edit my Info and Avatar'. A non-presenter in our room can click 'Mute Microphone for all non-admins' and 'Get my token'.

> Verified: I could not find the presenter gate anywhere in our source, and I verified the reference myself. CONFIRMED IN THE REFERENCE (I read the bytes, not a comment): slice [2285450,2286100) of main.d1d09071be31f1ba.js contains `O(135,o.appService.globals.isPresenter?135:-1)`, sitting between `O(132,...hasSpeechRecognition?132:-1)` and the alerts…

### USM-06 — Presenter colour Save writes a per-viewer preference instead of the server admin command

**BUILT 2026-08-30 03:06 UTC.** `presenter-colors.remote.ts` (`savePresenterColors`), `presenter_colors`, a page-load map, the render override in `RoomMessage.svelte` and a `presenterColorsChanged` broadcast. The key is derived on the SERVER from the session rather than accepted from the wire — a deliberate divergence, argued at the command. `presenter-colors-contract.test.ts` holds it.

**high** · `divergence` · reference byte **2,243,435**

```
savePresenterStyle(){this.appService.sendServerAdminCommand("savePresenterColors",{key:this.appService.hashEmail(this.appService.globals.user.email),val:{bkgColor:this.presenterStyle.bgColor,color:this.presenterStyle.color}})}
```

**Ours:** ModalHost.svelte:3826-3833 calls `onPreferenceChange('presenterStyle', {color, bkgColor})`, which is RoomOverlays.svelte:571 -> `prefs.save(key, value)` (prefs.svelte.ts:532) — a per-viewer settings-blob write. `grep -rn presenterStyle src/` finds exactly ONE hit outside that call site, so nothing reads the key: no server round-trip, no `savePresenterColors`, no `hashEmail` keying. The section's own heading (ModalHost.svelte:3789 'These colors will affect how ALL USERS see your messages and alerts') is therefore false — other viewers never see the change. `savePresenterColors` appears in our tree only as a string in feature-coverage-contract.test.ts:79.

> Verified: I could not refute it; the divergence is real, and the reference's Reset half is missing too. Reference (read at observed offset 2243496): `savePresenterStyle(){this.appService.sendServerAdminCommand("savePresenterColors",{key:this.appService.hashEmail(this.appService.globals.user.email),val:{bkgColor:...,color:...}})}`, with a second adm…

### USM-01 — Discord tab, pane and its three handlers are absent entirely

**BLOCKED 2026-08-30 15:52 UTC — on a Discord application registration, which does not exist for this deployment.** The row's own reading is right and the settings enumeration reached the same verdict independently: `enableDiscord` is the last entry on `REFERENCE_READS_AND_WE_DO_NOT` in `setting-coverage-contract.test.ts`, recorded there as needing a registration nobody has made.

What is decoded and would be built the day one exists: `doDiscordAuth()` opens `${apiROOT}/discord/v2/auth/start?token=${sesionToken}` in a new tab (byte 2,256,837), with `revokeDiscord` and `checkDiscordStatus` beside it. **The token in that query string is the part that would NOT be reproduced**: a room session token on a third-party OAuth start URL is the same shape as RS-12's Benzinga default, which is already an OWNER DECISION for the same reason. The correct form here is a server-minted, single-purpose state parameter. **Unblocked by:** a Discord application (client id and secret) plus the owner's answer on that. Recorded rather than deferred.

**medium** · `missing-control` · reference byte **2,268,143**

```
["id","discord-settings","role","tabpanel","aria-labelledby","discord-settings-tab",1,"tab-pane","fade"]
```

**Ours:** No Discord surface anywhere: `grep -rn -i discord src/` returns hits only in src/lib/setting-coverage-contract.test.ts:103 and :162, where `enableDiscord` is listed in REFERENCE_READS_AND_WE_DO_NOT and called 'the LAST buildable row... which needs an application registration that does not exist'. ModalHost.svelte:2837-2896 renders four tab headers (App/Alert/Chat/Presenter) and no fifth. The component methods I read at offset 2256837 (`doDiscordAuth(){P("Discord auth initiated"),window.open(`${this.appService.globals.apiROOT}/discord/v2/auth/start?token=${this.appService.globals.sesionToken}`,"_blank")...`), plus revokeDiscord/checkDiscordStatus in the same run, have no counterpart in our tree. Known and documented, not an oversight.

> Verified: I could not disprove this. Exhaustive search of apps/room/src (node_modules excluded) for `discord` (case-insensitive), the reference DOM ids (`discord-settings`, `discord-settings-tab`), the handler names (`doDiscordAuth`, `checkDiscordAuth`, `revokeDiscord`), and rename-synonyms (`oauth`, `revoke`, `integration`, `linkedAccount`, `third…

### USM-07 — Presenter colour Reset uses invented constants, never re-seeds from the server, and sends nothing

**BUILT 2026-08-30 03:06 UTC**, with USM-06. Reset sends (`clearPresenterColors`, which DELETES the row where the reference sends the empty pair) and restores the theme pair from `PRESENTER_COLOR_DEFAULTS`, transcribed from `globals.presenterStyle` at byte 980,538. The pickers seed from the stored map on modal open and on a theme switch, as the reference does at bytes 2,241,150 and 2,254,236.

**medium** · `wrong-constant` · reference byte **2,243,661**

```
resetPresenterStyle(){this.presenterStyle={color:this.appService.globals.presenterStyle[this.appService.globals.preferences.theme].color,bgColor:this.appService.globals.presenterStyle[this.appService.globals.preferences.theme].bgColor},this.appService.sendServerAdminCommand("savePresenterColors",{key:this.appService.hashEmail(this.appService.globals.user.email),val:{bkgColor:"",color:""}})}
```

**Ours:** ModalHost.svelte:3820-3823 resets to hardcoded `presenterTextColor = '#f7fd37'; presenterBackgroundColor = '#000000'` and sends nothing. The reference restores the THEME's presenter defaults and clears the stored pair server-side with `val:{bkgColor:"",color:""}`. Its documented fallback pair is `{color:"#1a1a1a",bgColor:"#e8e8e8"}`, which I read inside switchTheme at offset 2253925. Our initial values (ModalHost.svelte:732-733) are likewise hardcoded and never seeded from `sessData.presenterSettings[hashEmail(email)]`, so a presenter who saved colours sees the wrong swatches on reopen.

> Verified: Not refutable. Our presenter colour pair is initialised to two literals at ModalHost.svelte:749-750 and never seeded from anything server-owned; the Reset button (ModalHost.svelte:3910-3913) only re-assigns those same two literals and issues no command; Save (ModalHost.svelte:3919-3921) writes the generic preference key 'presenterStyle' t…

### USM-08 — 'Reactions Response' popup checkbox missing (gated on sessData.enableReactions)

**BUILT 2026-08-30 16:38 UTC.** `app-reactions-popup` behind `O(116, sessData.enableReactions ? 116 : -1)` (byte 2,285,066), with the reference's own line — `` `${n}: ${remove ? "removed" : ""} ${emoji} on "${txt}"` `` under the title `Message Reaction`, byte 2,509,044.

**MY messages only, and never my own reaction.** Upstream's socket layer emits `updateChatMsgReaction` only when `reactionDetails.msgUID === globals.user.userXrefID` (byte 1,011,021); here that filter runs on the server's own rows.

The mechanism is shared with USM-08/09/10 and is the interesting part: **the reference's cannot be copied.** Both of its toasts render `txt` — the reacted-to message BODY — read off `reactionDetails` / `qaReactionDetails`, fields on an inbound frame, and then filter to the right recipient IN THE BROWSER. `message-mutation-frames.ts` already says why this room's frames carry nothing: *"this hub's SSE stream is per ROOM while chat is per CHANNEL, so a frame carrying a message body would put admin-channel text on every subscriber's wire."*

So the frame stays a trigger, `invalidateAll()` re-reads the rows the server decided this member may see, and a reaction is noticed by DIFFING two of those reads — `#lib/reaction-arrivals.ts`. Everything the toast renders was already in this browser's page data, and the audience filter runs on the server's own answer rather than on a payload. The reactor's NAME comes from the roster, because a reaction stores an email hash and nothing else.

**medium** · `missing-control` · reference byte **2,269,041**

```
"app-reactions-popup","value","Do not disturb","id","app-reactions-popup",1,"form-check-input",3,"change","checked"
```

**Ours:** No `app-reactions-popup` id and no `reactionsPopup` preference anywhere in src/ (zero grep hits). The room DOES implement reactions (`enableReactions` is read in src/lib/components/RoomMessage.svelte, AlertQaModal.svelte, ExtraChatPane.svelte and server/room-config-client.ts), so the feature exists with no way for a viewer to silence its response popup. Reference gate `O(116,o.appService.globals.sessData.enableReactions?116:-1)` at offset 2285066; reference default `reactionsPopup:!0` at offset 979910.

> Verified: I could not refute it. Exhaustive case-insensitive search of apps/room/src for reactionsPopup, reactionsPopupQA, app-reactions-popup, reaction-popup, reactionsResponse, "Reactions Response", reactionsSoundOn, qaReactionSoundOn, updateChatMsgReaction and "Message Reaction" returned zero hits.

### USM-09 — 'Reactions QA Response' popup checkbox missing (gated on sessData.enableQAReactions)

**BUILT 2026-08-30 16:38 UTC**, with USM-08 and USM-10 — one mechanism, three rows. `app-reactions-popup-qa` behind `O(117, sessData.enableQAReactions ? 117 : -1)` (byte 2,285,130), title `QA Reaction`.

**The audience is the one the question notice beside it already uses**, and it is upstream's: everyone who has asked on that alert (`for (let _ of o.qa) _.uid === myId`), plus every presenter (the `globals.user.isPresenter && (…the same…)` copy), never the actor — byte 1,408,850.

**medium** · `missing-control` · reference byte **2,269,235**

```
"app-reactions-popup-qa","value","Do not disturb","id","app-reactions-popup-qa",1,"form-check-input",3,"change","checked"
```

**Ours:** No `app-reactions-popup-qa` id and no `reactionsPopupQA` preference in src/ (zero grep hits), although `enableQAReactions` is a room setting we read (src/lib/server/room-config-client.ts:634) and the Q&A reaction feature is built (qa-thread-contract.test.ts). Reference gate `O(117,o.appService.globals.sessData.enableQAReactions?117:-1)` at offset 2285130.

> Verified: I could not refute it. Exhaustive search of apps/room/src for `app-reactions-popup-qa`, `app-reactions-popup`, `reactions-popup`, `reactionsPopup`, `reactionPopup`, `showReactions`, `popupQA`, `qaReaction`/`QAReaction` (case-insensitive), and the reference's neighbouring sibling ids `note-update-popup` and `app-positions-update` returns Z…

### USM-10 — 'QA Reactions Sound' checkbox missing from the Alert tab

**BUILT 2026-08-30 16:38 UTC.** `app-reactions-sound-qa`, `v(3," QA Reactions Sound ")` at byte 2,232,964, on the Alert tab beside the QA sound it sat next to upstream.

**Which gate is on which is the part worth recording.** `preferences.doNotDisturbOn || (c && preferences.qaReactionSoundOn && qaAlert.play())` at byte 1,408,850 suppresses the SOUND with Do Not Disturb; the popup on the following line is outside that guard and is not suppressed. Reproduced with the asymmetry intact, because it is the shape every other notification in this room already has — and the contract asserts the gap between the two gates contains no `doNotDisturbOn`, because reproducing half of an asymmetry is worse than reproducing neither half.

**medium** · `missing-control` · reference byte **2,271,175**

```
"app-reactions-sound-qa","value","Do not disturb","id","app-reactions-sound-qa",1,"form-check-input",3,"change","checked"
```

**Ours:** Our Alert tab (ModalHost.svelte:3245-3396) has Alert/QA Popup, Alert sound, QA sound, Non-trade alert sound and Longer alert popup, but no `app-reactions-sound-qa`; `qaReactionSoundOn` has zero hits in src/. Reference default is `qaReactionSoundOn:!0` (read at offset 979369).

> Verified: I could not find it. The reference control is real and I read it: the template render function at offset 2232964 emits `d(0,"div",17)(1,"input",157),x("change",function(){return D(e),E(g().reactionsSoundQAOnChange())}),u(),d(2,"label",158),v(3," QA Reactions Sound ")` bound to `e.appService.globals.preferences.qaReactionSoundOn`; its attr…

### USM-11 — 'Note Update Popup' checkbox missing

**BUILT 2026-08-30 16:19 UTC — and the row named the popup while the defect was one level under it.** `saveSessionNote` in `+page.server.ts` wrote its row and **published nothing**. Every other viewer's Notes pane kept the previous text until they happened to reload, so a presenter editing the room's notes during a session was invisible to the room — which is the entire point of the pane. The checkbox could not exist without the frame, so the frame was the work.

`updatedSessionNote` is the reference's own name, read at byte **1,022,762**, which is what `message-mutation-frames.ts` requires of a fifth frame: *"Adding one means finding it in the bundle first — an invented frame name is the `alertDisplayMode` defect wearing a wire format."* Its receiver emits `noteTabUpdated {id, name}` and the toast hangs off that at byte 1,962,777.

**The frame carries the id and the NAME and not the content.** `invalidateAll()` re-reads the row, which is the authority — the argument the four message-mutation frames already make — and this SSE stream is per ROOM, which is the second reason that module gives for trigger-only frames. A note's tab name is already drawn for anyone who can see the pane at all, so the frame carries nothing its recipient could not read anyway.

**Two divergences, both refusals rather than omissions.** Upstream's handler calls `alertsService.clear()` before the toast; that wipes every toast on screen, and one of them may be the media-outage banner `RoomToasts` deliberately gives `timeOut: 0` — a note being edited must not dismiss it, and `RoomToasts` already de-duplicates, which is what that call was for. And upstream renders this control under `z("ngIf", sessData.beepOnUserJoin)` at byte 2,285,196 — the JOIN-BEEP room setting, which has nothing to do with session notes and which nothing else in that block shares. It reads as a markup slip; reproducing it would mean an owner who switches off the join beep silently loses control of note popups.

**medium** · `missing-control` · reference byte **2,269,438**

```
"note-update-popup","value","Do not disturb","id","note-update-popup",1,"form-check-input",3,"change","checked"
```

**Ours:** No `note-update-popup` id and no `noteUpdatePopup` preference in src/ (zero grep hits), although notes are implemented (src/lib/room/notes.svelte.ts, notes-access.svelte.ts). Reference renders it under `z("ngIf",o.appService.globals.sessData.beepOnUserJoin)` (offset 2285196) and defaults `noteUpdatePopup:!0` (offset 979948).

> Verified: Neither the control nor its preference nor its consumer exists in apps/room/src. I searched the whole tree case-insensitively for note-update, noteUpdate, note_update, notesUpdate, "note update", "note popup", "Update Popup", sessionNoteUpdated, 'Note "' and reactionsPopup — all zero hits.

### USM-12 — 'Recording Preview' checkbox persists nothing, has no disable side-effect, and is not gated on isPresenter

**BUILT 2026-08-30 15:52 UTC. Three defects in one control, and the first two are why the third was never noticed.** `app-recording-preview-window` was absent from `updateSettingCheck`'s id→preference table, which has NO fallback by design, so the box persisted nothing; nothing anywhere read `recPreviewWindow`, so there was nothing for a stored value to restore even if it had been written; and it rendered for every viewer while the window it governs belongs to the presenter who is recording.

All three closed. `RoomPrefs.recPreviewWindow` seeds from `loadedSettings.recPreviewWindow !== false` — default ON, read rather than chosen, from `recPreviewWindow:!0` at byte **979,890**. The mapping row exists, which in this file is the DECLARATION that a control has a consumer. `create-room`'s `onSideEffect` closes an open preview when the box goes off, which is the reference's own `guiEventBus.emit("closeRecPreviewWindow")` at byte 2,250,601. And `O(115, isPresenter ? 115 : -1)` at 2,285,015 is the gate.

**One recorded divergence:** `showRecPreview` also REFUSES to open when the preference is off, which upstream does not do — it reads the value only to seed its checkbox and to close on the way off. A preference whose only effect is closing something already open does nothing at all on the next session, which is the defect this row is about rather than a shape to reproduce.

**medium** · `defect` · reference byte **2,285,015**

```
O(115,o.appService.globals.isPresenter?115:-1)
```

**Ours:** ModalHost.svelte:3153-3167 renders `#app-recording-preview-window` for every viewer and routes it to `updateSettingCheck`, but `app-recording-preview-window` is absent from the `preferenceKeyByInputId` table at ModalHost.svelte:1520-1557, and the table has NO fallback (comment at :1558-1571), so the toggle writes nothing and is forgotten on reload. `recPreviewWindow` as a preference has zero hits in prefs.svelte.ts; the only matches are the private `#recPreviewWindow` window handle in src/lib/room/recording.ts:53-348. The reference handler `recPreviewWindowOnChange(){...setPreference("recPreviewWindow",...)` (read at offset 2250252) also emits `closeRecPreviewWindow` when switching off; ours closes nothing.

> Verified: I could not find it built anywhere in apps/room/src. All three limbs verified against our source and the reference bundle.

### USM-13 — Presenter CC toggle does not start or stop speech recognition immediately

**BUILT 2026-08-30 15:52 UTC, and it is two lines because the guards were already right.** `speechRecoCCOnChange` at byte 2,246,212 persists and then acts; ours persisted `doSpeechReco` and stopped. The only callers of `beginSpeechRecognition` were the two mic-START paths, so turning captions on mid-session did nothing until the microphone was restarted, and turning them off did not stop a recognition already running — **a toggle that says `Enabled` and captions nobody.**

The branch lives in `create-room`'s `onSideEffect`, the seam `prefs.save` already offers for exactly this. **The reference's `micProducer && !micMuted` guard is deliberately NOT repeated**, and the contract asserts its absence: `beginSpeechRecognition` already refuses without a live session, without the preference, without the room entitlement and without presenter authority, and it is the method both mic paths call. Two copies of one guard is how the copies come to disagree.

**medium** · `missing-behaviour` · reference byte **2,246,212**

```
speechRecoCCOnChange(){this.appService.globals.preferences.speechRecoCC=!this.appService.globals.preferences.speechRecoCC,this.appService.globals.preferences.doSpeechReco=this.appService.globals.preferences.speechRecoCC,this.appService.setPreference("speechRecoCC",this.appService.globals.preferences.speechRecoCC),this.appService.setPreference("doSpeechReco",this.appService.globals.preferences.doSpeechReco),this.appService.globals.preferences.speechRecoCC?this.mediaSoupService.micProducer&&!this.mediaSoupService.micMuted&&this.mediaSoupService.startSpeechRecognition():this.mediaSoup
```

**Ours:** ModalHost.svelte:1530 maps `presenter-speech-recognition` -> `doSpeechReco` only (the `speechRecoCC` half is a documented deliberate drop, ModalHost.svelte:1511-1516), and prefs.svelte.ts:589 stores the flag. Nothing acts on the write: the only callers of `beginSpeechRecognition` are src/lib/room/create-room.svelte.ts:678 and src/lib/room/local-capture.svelte.ts:377 (mic START), so turning captions on mid-session does nothing until the microphone is re-started, and turning them off does not stop an in-flight recognition.

> Verified: The presenter CC toggle in our room only persists the preference; nothing starts or stops recognition when it changes. Traced the full path: ModalHost.svelte:3803-3812 (checkbox id `presenter-speech-recognition`) -> updateSettingCheck maps it at :1603 to `doSpeechReco` -> :1645 onPreferenceChange -> RoomOverlays.svelte:581 -> prefs.save,…

### USM-14 — Presenter Settings tab and pane gated on isPresenter alone, missing !isLimitedPresenter

**BUILT 2026-08-30 15:36 UTC.** Both gates now read `isPresenter && !isLimitedPresenter` — `O(18, …)` at byte 2,283,408 for the tab header and `O(292, …)` at 2,288,469 for the pane, which the reference gates separately and so does this. A limited presenter was getting the whole Presenter Settings pane: the CC toggle, the presenter colours, the recording preview. The row's own observation is what made it small — the prop existed and the same narrowing was already applied twice in this file, so this was the one place the pair had been dropped rather than a missing capability.

**medium** · `divergence` · reference byte **2,283,408**

```
O(18,o.appService.globals.isPresenter&&!o.appService.globals.isLimitedPresenter?18:-1)
```

**Ours:** ModalHost.svelte:2883 (`{#if isPresenter}` around the tab header) and :3652 (`{#if isPresenter}` around `#presenter-settings`). The prop exists and is used elsewhere in the same file for exactly this narrowing (ModalHost.svelte:276 declares `isLimitedPresenter`, :2012 and :2049 apply `isPresenter && !isLimitedPresenter`), so a limited presenter — someone handed mic and screen — currently gets the whole presenter settings pane. The reference applies the same pair to the pane too: `O(292,...isPresenter&&!...isLimitedPresenter?292:-1)` at offset 2288469.

> Verified: Could not refute. Both gates on the user-settings modal's Presenter Settings tab and pane read `{#if isPresenter}` with no `!isLimitedPresenter` term, while the reference applies the pair to both.

### USM-17 — Switching theme does not reset the chat style or re-seed presenter colours

**HALF BUILT 2026-08-30 15:52 UTC — the chat-style half was missing, the presenter-colour half was already here.** The row names two behaviours and the second turned out to be built: the settings modal's open-time effect reads `theme`, so switching theme while it is open re-seeds the presenter swatches, which is verbatim what `switchTheme` does at byte 2,254,236. The contract asserts that rather than adding a second seeder — two effects keyed on one question are two answers to it.

The chat-style half is built now, and the shape of the reference's expression is the whole point: `chatStyle = JSON.parse(localStorage.getItem("chatStyle")) || globals.chatStyle[e]` means **saved wins, and only what the viewer never chose follows the theme**. Reproducing that needed a second field — `savedChatStyle` — because `globalChatStyle` is already the theme defaults with the stored values merged on top and cannot answer *which of these did they choose?* Re-seeding from it would pin the opening theme's defaults for the life of the session; that is the V8 control on this change, and it was seen red.

The row's own note that our chat style living in server preferences rather than `localStorage` is a deliberate architectural divergence is correct and unaffected: the write path is `prefs.save` → `onSideEffect` → `mergeGlobalChatStyle`, which is the single place both fields are kept in step.

**medium** · `missing-behaviour` · reference byte **2,253,925**

```
switchTheme(e){if(this.alertStyle=JSON.parse(window.localStorage.getItem("alertStyle"))||this.appService.globals.alertStyle[e],this.chatStyle=JSON.parse(window.localStorage.getItem("chatStyle"))||this.appService.globals.chatStyle[e],this.appService.globals.isPresenter){const i=this.appService.globals.sessData.presenterSettings&&this.appService.globals.sessData.presenterSettings[this.appService.hashEmail(this.appService.globals.user.email)];this.presenterStyle={color:"#1a1a1a",bgColor:"#e8e8e8"}
```

**Ours:** ModalHost.svelte:2922/2934 call `onTheme('light'|'dark')` -> RoomOverlays.svelte:570 -> `modals.setTheme` -> +page.svelte:518 `setTheme: (next) => (theme = next)`. That is the whole path: the theme flips, but the chat-style swatches keep the previous theme's colours until the viewer presses Reset (ModalHost.svelte:1924-1927 `resetChatStyle`, which the reference's switchTheme calls itself), and the presenter swatches are never re-seeded. Our chat style living in server preferences rather than localStorage 'chatStyle'/'alertStyle' is a deliberate architectural divergence and is NOT part of this gap.

> Verified: I tried hard to find a theme-triggered re-seed and there is none. The full write path is closed and does only one thing: ModalHost.svelte:3054/3066 `onchange={() => onTheme('light'|'dark')}` -> RoomOverlays.svelte:580 `onTheme={(next) => modals.setTheme(next)}` -> modals.svelte.ts:192-195, whose entire body is `this.#setTheme(nextTheme)`…

### USM-15 — Closed-captions sections are not gated on hasSpeechRecognition

**BUILT 2026-08-30 15:36 UTC, and the row's own reading of the severity is right — this is not a privilege hole, it is a control that could not work.** `O(132, globals.hasSpeechRecognition ? 132 : -1)` at byte 2,285,653, applied to both `#appSpeechRecoOverlay` and `#presenterSpeechRecognition`. The room already refuses at runtime (`RoomRecording.beginSpeechRecognition`, pinned by `speech-reco-entitlement.test.ts`), so what the ungated blocks drew was a checkbox somebody could tick, that then said `Enabled`, and that captioned nothing — **a control whose only effect is changing its own label**, which `CLAUDE.md` names outright.

The value is `RoomGates.speechRecognitionAvailable` passed from the page rather than re-derived in the component, and that is the load-bearing part: `!== true` (absent means NOT disabled) is that getter's rule and it is the same getter the runtime refusal reads. One reading of the setting, two consumers — re-deriving it in a component is how the drawn control and the running feature come to disagree.

**low** · `divergence` · reference byte **2,285,653**

```
O(132,o.appService.globals.hasSpeechRecognition?132:-1)
```

**Ours:** ModalHost.svelte:3192-3212 (`#appSpeechRecoOverlay`) and :3696-3717 (`#presenterSpeechRecognition`) render unconditionally. Our room does enforce the entitlement at RUNTIME — src/lib/room/recording.ts:376 `beginSpeechRecognition` refuses, per src/lib/room/speech-reco-entitlement.test.ts:18-22 — so the effect is a visible control that silently cannot work in a room with speech recognition disabled, not a privilege hole.

> Verified: Both closed-captions sections in our user-settings modal render with no entitlement condition, while the reference gates each on globals.hasSpeechRecognition. In ModalHost.svelte the #appSpeechRecoOverlay block (currently :3324-3344, +33 from the claim's line numbers because the working tree has uncommitted edits) has NO enclosing {#if} a…

### USM-18 — 'Smaller image preview' label has no on/off span and its checked term drops defaultImagePreview

**HALF BUILT 2026-08-30 15:52 UTC, and the half NOT built is the row's own recorded reason.** The label carries `<span>on</span>` / `<span>off</span>` now — `v(218," Smaller image preview "), H(219,Cke,…)(220,Ske,…)` at byte 2,281,312, where both are bare `<span>`s. Every other checkbox in this modal already had the pair.

The `defaultImagePreview` conjunct is refused, not overlooked. Upstream both the `checked` binding and the span gate are `smallImagePreview && defaultImagePreview`; here NEITHER preference has a consumer, because the class the pair drives — `chat-uploaded-img-sm` — has no rule in any of the 52 stylesheets. `settings-preference-wiring-contract.test.ts` proves that and keeps the id out of `updateSettingCheck`'s table; the new contract asserts it stays out. ANDing two values nothing reads would be scaffolding on scaffolding.

**low** · `divergence` · reference byte **2,286,816**

```
z("checked",o.appService.globals.preferences.smallImagePreview&&o.appService.globals.preferences.defaultImagePreview),m(3),O(219,o.appService.globals.preferences.smallImagePreview&&o.appService.globals.preferences.defaultImagePreview?219:-1)
```

**Ours:** ModalHost.svelte:3435-3446: checked comes from the local `settingChecks['small-image-preview']` and the label is plain text with no `<span>on/off</span>`. The persistence half is a DELIBERATE, evidenced closure — src/lib/settings-preference-wiring-contract.test.ts:427-462 proves the class it drives (`chat-uploaded-img-sm`) has no rule in any of the 52 stylesheets and asserts the id stays out of the mapping table. Only the missing label span and the dropped `defaultImagePreview` conjunct are unaccounted for; both are cosmetic.

> Verified: I could not refute it. ModalHost.svelte:3578 is the ONLY render site of this control in all of src/ (verified by grepping `Smaller image`, `chatImagePreview`, `small-image-preview`, `smallImagePreview`, and by listing every file containing `form-check-label`), and its label is plain text: `<label for="small-image-preview" class="form-chec…

---

## routes/+page.svelte (room shell)

15 verified gaps; 65 reference behaviours confirmed present.

### G01 — Archives → "Recording" menu item is inert: no `launchRecordings()`

**BLOCKED 2026-08-30 12:55 UTC.** `launchRecordings()` opens `${apiROOT}/sessions/v2/archives/recordings/${sessionID}/${token}` in a new tab — **a SERVER page**. There is no archive service here and no recordings or archive table in either database, which is the same blocker `presAreaTabs-recordings` carries and which `TODO.md` already records. Wiring the item would open a tab onto a 404 with a session token in the URL, which is worse than an inert item. What would unblock it: an archive service with a recordings endpoint. The item stays rendered, because it is the reference's own menu and the neighbouring Alert Logs / Chat Logs entries in the same dropdown do work.

**high** · `missing-behaviour` · reference byte **2,467,840**

```
E(g(3).launchRecordings())}),T(1,"i",51),d(2,"span",22),v(3,"Recording")
```

**Ours:** The same item is rendered with NO handler at all: `apps/room/src/lib/components/RoomSidebar.svelte:439-442` is `<a class="dropdown-item small"><i class="fas fa-circle"></i><span class="pl-2">Recording</span></a>`. The neighbouring Alert Logs / Chat Logs items in the same dropdown DO carry onclick. Grepped apps/room/src for `launchRecordings`, `archives/recordings`, `openRecordings` — zero hits. The reference body, read at byte 2522147, is `launchRecordings(){window.open(`${apiROOT}/sessions/v2/archives/recordings/${sessionID}/${sesionToken}`,"_blank")}`.

> Verified: Could not refute. The Archives dropdown's "Recording" item in our source is rendered with no handler and no href at apps/room/src/lib/components/RoomSidebar.svelte:439-442, inside the correct `{#if isPresenter || !session?.hideRecs}` gate (:438) — while its three siblings in the same dropdown all carry onclick (Alert Logs :452, Chat Logs…

### G02 — Presenter entry warning when the session is locked (bootbox "Session Locked" with a "Session Control" button)

**OWNER DECISION, NOT BUILT — recorded 2026-08-30 12:55 UTC, and the reason is an AUTHORITY difference rather than a missing dialog.** The warning is guarded `sessData.isLocked && globals.user.isPresenter`, which means upstream **a presenter enters a locked room** and is told it is locked to everyone else. In this room they cannot: `decideRoomEntry` (`apps/controller/src/lib/room-entry.ts:221`) refuses `isLocked === true` as its FIRST test, before identity is even established, so there is no presenter to warn. The dialog is not missing here — its precondition is. That is not a bug on its face: the setting's own help text in the control plane reads *"If session is locked, nobody will be able to log in..."*, and our door matches the words the owner is shown. But it does mean **an owner who locks a room locks themselves out of it**, and the reference clearly expects otherwise. Changing who may enter a locked room is an authority decision made on the server, which is exactly the class of change this repository does not make on inference. **The question for the owner: should a presenter be admitted to a locked room?** If yes, `decideRoomEntry` gains a presenter exemption and this dialog is then five lines — the confirm exists, `openSessionControl('lock-session')` exists, and `RoomConfirmation` would need the reference's two button labels.

**medium** · `missing-control` · reference byte **2,500,222**

```
title:"Session Locked",message:"Session is locked, no users are allowed in the room.<br><br>To unlock: Go to Session Control, then Lock Session tab, then click on Unlock Session.",buttons:{confirm:{label:"Session Control",className:"btn-primary"},cancel:{label:"Close",className:"btn-secondary"}}
```

**Ours:** Absent. Guarded upstream by `sessData.isLocked && globals.user.isPresenter` (the bytes immediately before the quote, read at 2500150-2500600), with a confirm callback that does `un("#session-control-modal").modal("show")`. `apps/room/src/lib/room/session-lock-writes.ts:28-42` has only the two post-action acknowledgements ('Session Locked' / 'Session Unlocked') a presenter sees AFTER locking. Grepped apps/room/src for `Session is locked` (zero hits) and `isLocked` (one hit, server-side entry admission at `apps/room/src/routes/session/+page.server.ts:351`). A presenter entering an already-locked room is told nothing.

> Verified: I could not refute this. The reference behaviour is real and our source has no counterpart under any name.

### G03 — Room-level `.notConnectedOverlay` "Reconnecting Chat..." (template node 7, gated on `socketConnected`)

**BUILT 2026-08-30 12:55 UTC.** `iRe` on const 9, gated `O(7, socketConnected ? -1 : 7)`. **The half that was built was the half nobody needs:** a member whose chat connection dropped saw nothing at all, and then — once it came back — a three-second tick saying "Conected" for a failure they were never told about. Both elements exist now and they stay two elements: making one say both things would lose the three-second timing the flash has and the flash alone. `roomEvents.connected` starts FALSE so this shows during the first connect too, which is upstream's own behaviour — `globals.socketConnected` is never initialised, only assigned. The literal spaces in `" Reconnecting Chat... "` are written as an expression, because Svelte normalises whitespace at element boundaries.

**medium** · `missing-control` · reference byte **2,496,906**

```
function iRe(t,n){1&t&&(d(0,"div",9),T(1,"i",37),v(2," Reconnecting Chat... "),u())}
```

**Ours:** Only the SUCCESS half exists: `apps/room/src/lib/components/RoomOverlays.svelte:502-508` renders one div that merges const 10 (`id="connectedMsg"`, the 3s "Conected" flash) and reuses the const-9 class list. The const-9 element itself — the overlay shown while the socket is DOWN, `O(7,o.appService.globals.socketConnected?-1:7)` which I read at byte 2548267 — has no counterpart; grepped for `notConnectedOverlay` (one hit, the connectedMsg div) and `socketConnected` (zero hits). The driving state already exists as `roomEventsConnected` (used at `RoomSidebar.svelte:276-280`), so only the overlay is missing.

> Verified: The reference has TWO distinct "Reconnecting Chat..." nodes and our source implements only one of them. The sidebar node (reference `lPe`, a `<p>` with `fa-cog fa-spin`, paired with `cPe`/`dPe`/`uPe`) IS built at RoomSidebar.svelte:270-281, driven by `roomEventsConnected` — so the driving state and the label text both exist.

### G04 — Talking-user names in the navbar are not clickable — `muteTalkingUserDialog(e)` absent

**BUILT 2026-08-30 12:36 UTC.** `muteTalkingUserDialog` in `RoomUserActions`, raised by each speaker name (const 147 `[3,"click"]`, byte 2,473,449). **A PROMPT with a typed word rather than a confirm, and that is upstream's choice for the right reason:** this mutes a microphone for everyone in the room, and an accidental click on one name in a list of names is exactly the mistake a confirm dialog does not prevent. `i && "yes" == i.toLowerCase()` is transcribed including the fact that it is not trimmed. The command mapping is not restated — `sendServerCommand('muteTalkingUser')` has no counterpart here and `remotePresCommand`/`mutemic` is the same act addressed to one peer, which is written out once on `muteAllNonAdmins` and pointed at from here. `role`/`tabindex`/`onkeydown` are OURS: the capture binds a click to a bare span.

**medium** · `missing-control` · reference byte **2,473,449**

```
E(g(3).muteTalkingUserDialog(o))})
```

**Ours:** `apps/room/src/lib/components/RoomNavbar.svelte:285-290` renders each speaker as a bare `<span>{talkingUser.mediaValue.name}</span>` with no handler. The method body, read at byte 2529373, is presenter-only `bootbox.prompt("Would you like to force stop "+e.mediaValue.name+" from talking? (forces a remote mute for all). type: yes to proceed", …)` then `sendServerCommand('muteTalkingUser', e)`. Grepped for `muteTalkingUserDialog`, `force stop`, `muteTalkingUser` — the only hits are prose at `apps/room/src/lib/room/user-actions.svelte.ts:400` and `apps/room/src/lib/mute-all-non-admins.ts:20`. The per-peer mechanism this needs (`remotePresCommand`/`mutemic`) is already built and used by `muteAllNonAdmins` (`user-actions.svelte.ts:408-429`), so what is missing is the click target and its prompt.

> Verified: I could not refute it. In our source the talking-user names are rendered as a bare, inert <span> inside the navbar's talkingIndicator: RoomNavbar.svelte:284-291 loops `{#each media.talking as talkingUser, index (talkingUser.userID)}` emitting `<span>{index > 0 ?

### G05 — Screenshare menu: " OBS / RTMP / Stream / Restream " item + `openStreamingTab()` (gated on `sessData.useMediaMTX`)

**BUILT 2026-08-30 12:36 UTC.** `a4e` at byte 2,479,514 with its leading divider inside the gate, its `title`, and the `badge text-bg-danger ms-1` **New** span (const 188). Upstream's handler is three chained jQuery `.tab('show')` calls; all three targets already exist here as STATE — `openSessionControl('streaming-selection')`, and `streamingControlTab` already defaults to `'obs-streaming'` — so the page opens the modal on the right tab and no component reaches into another's DOM.

**medium** · `missing-control` · reference byte **2,479,514**

```
E(g(3).openStreamingTab())}),d(2,"a",158),v(3," OBS / RTMP / Stream / Restream "
```

**Ours:** Our screenshare dropdown (`apps/room/src/lib/components/RoomNavbar.svelte:596-641`) carries only two of the three enumerated titles — `title="(Regular Bandwidth) ** RECOMMENDED"` (:607) and `title="OBS"` (:604) — plus "Stop Sharing All Screens". The third item, its `New` badge (const `[1,"badge","text-bg-danger","ms-1"]`) and the handler are absent; grepped for `openStreamingTab` and `OBS / RTMP` — zero hits. The reference handler, read at byte 2531675, chains `#session-control-modal` → `#streaming-selection-tab` → `#obs-streaming-tab`; all three ids already exist in `apps/room/src/lib/components/ModalHost.svelte:4406,4481`, so only the entry point is missing.

> Verified: I tried hard to find this built under another name and could not. Our screenshare dropdown (`apps/room/src/lib/components/RoomNavbar.svelte:594-607`) contains exactly two entry items — `title="(Regular Bandwidth) ** RECOMMENDED"` → `onpromptforscreenname('screen')` (:594-600) and `title="OBS"` → `onpromptforscreenname('camera')` (:604-607…

### G06 — Screenshare menu: " Reopen Screenshare Preview" item → `reopenPreviewWindow()`

**BUILT 2026-08-30 12:36 UTC — and it is the way back from a one-way door.** The row's own closing note is the important half: `previewWindowsVisible` was written `false` by Hide Preview Windows and **nothing ever wrote it true**, so a presenter who hid the preview cards could not get them back without reloading the room. `c4e` at byte 2,479,924 is gated on the same `isScreenSharing` the Stop-All entry above it carries, and its divider comes AFTER the item, which is why it is written separately rather than folded into that pair.

**medium** · `missing-control` · reference byte **2,479,924**

```
E(g(3).reopenPreviewWindow())}),v(2," Reopen Screenshare Preview")
```

**Ours:** Absent from `apps/room/src/lib/components/RoomNavbar.svelte`. Grepped apps/room/src for `reopenPreviewWindow`, `Reopen Screenshare Preview`, `Reopen Webcam` — zero hits (`reopenRecPreviewWindow` IS built, at `apps/room/src/lib/room/recording.ts:307-338`). The item is gated `O(15, isScreenSharing ? 15 : -1)` in the block I read at byte 2480728, and the method body at byte 2519083 is `if(!mediaService.isScreenSharing)return!1;emit("reopenPreviewWindow")`. Related: `previewWindowsVisible` (`apps/room/src/routes/+page.svelte:219`) is only ever written false (`:527`, via `user-actions.svelte.ts:565`) and never back true, so a presenter who hides the preview windows cannot restore them.

> Verified: I could not find any implementation of the "Reopen Screenshare Preview" control in our source under any name. The screenshare dropdown in `RoomNavbar.svelte` (the `<ul class="screen-options-start-screen …">` opened at :583 and closed at :630) contains exactly three items: Share Screen (:594-599, `onpromptforscreenname('screen')`), the OBS…

### G07 — Screenshare menu: per-screen "Stop Sharing {screenName}" repeater (d4e over `screenProducers`)

**BUILT 2026-08-30 12:36 UTC.** One entry per screen this browser is sharing, `d4e` at byte 2,480,060. Upstream repeats over `mediaSoupService.screenProducers`, a LOCAL producer map that cannot contain anybody else's share; the nearest thing here is the screen TAB list, which contains everyone's — so the page filters on `ownerId === null`, which `RoomScreens` documents as "one of this browser's own". Without that filter the menu would offer a presenter the chance to stop a screen they are not sharing. `stopLocalScreen(producerId)` already existed, because the browser's own "Stop sharing" bar calls it.

**medium** · `missing-control` · reference byte **2,480,060**

```
function d4e(t,n){if(1&t){const e=Y();d(0,"li")(1,"a",163),x("click",function(){const o=D(e).$implicit;return E(g(3).mediaService.stopSharingProducer(o.key))}),v(2),u()()}if(2&t){const e=n.$implicit;m(2),Ne(" Stop Sharing ",e.value.appData.screenName,"")}}
```

**Ours:** Our menu offers only the all-or-nothing "Stop Sharing All Screens" (`apps/room/src/lib/components/RoomNavbar.svelte:626-634`, gated on `media.screenSharing`). Grepped for `stopSharingProducer` (zero hits) and `Stop Sharing ` (only the all-screens label, `apps/room/src/lib/navbar-labels.ts:39`). A presenter sharing two screens cannot stop one of them.

> Verified: The navbar screenshare menu genuinely has no per-producer repeater: RoomNavbar.svelte's dropdown ends at the all-screens item gated on media.screenSharing, its only {#each} in the file is over media.talking (line 285), and its props carry no screen list. Grep found zero hits for stopSharingProducer/screenProducers-as-state and no per-scre…

### G08 — Talking indicator never shows the idle image: `#nolevelsImg` / notalking.png branch absent

**MEASURED REFUSAL — recorded at the code 2026-08-30 12:36 UTC, deliberately NOT built.** `presenterTalking` is written by exactly two subscribers (byte 1,117,020) and the only thing that emits them is the SERVER socket relaying `case "presenterTalking"` at byte 1,014,971. It is a live audio-activity signal computed somewhere this room does not have, and it is NOT the list beside it: "talking" in `talkingUsers` means A MICROPHONE IS OPEN, which `media-transport.svelte.ts` records at length — and there is no level detection anywhere in the reference either, its single `createAnalyser` being the AV-settings mic test. Building the branch means an image that can never show or one that always shows; neither is the reference. **This also settles the row's strongest argument:** `notalking.png` ships here with no consumer because the MARKUP was transcribed from a capture whose driving signal did not cross with it. The asset stays. What would unblock it: our own server computing and pushing an activity signal, after which this is one `{#if}` and const 148.

**medium** · `missing-behaviour` · reference byte **2,542,272**

```
["id","nolevelsImg","src","/assets/images/notalking.png",1,"talkingWaveform","animated","fadeIn"]
```

**Ours:** `apps/room/src/lib/components/RoomNavbar.svelte:292-301` renders `#talkingLevelsImg` (`/assets/images/talking.gif`) unconditionally. The reference switches between the two on `O(8,e.mediaService.presenterTalking?8:9)`, which I read at byte 2473901. Grepped apps/room/src for `nolevelsImg` and `notalking` — zero hits, yet `apps/room/static/assets/images/notalking.png` IS shipped in this repo: an asset with no consumer, which is the inverse of the usual gap and strong evidence the branch was dropped rather than never transcribed.

> Verified: I could not find the idle-image branch anywhere in our source. RoomNavbar.svelte:293-300 renders `#talkingLevelsImg` with a literal `src="/assets/images/talking.gif"` and no conditional; the `{:else}` at :303-307 is a DIFFERENT switch — it is the reference's `LPe` block (" ( No one is speaking )", our `NO_SPEAKER_TEXT` at navbar-labels.ts…

### G09 — Blocked audio autoplay is only logged, never surfaced — no "Your browser needs your OK" dialog

**BUILT 2026-08-30 12:55 UTC.** Chrome refuses audible autoplay without a user gesture, and this caught the rejection and wrote a `console.warn` — so a member whose browser blocked it heard NOTHING for the whole session with nothing on screen to act on. **The dialog's OK is the gesture**, which is the entire mechanism and why the retry has to be the dismissal callback rather than a timer: `play()` called again without a gesture is refused again. `alertThen` is the only API here that carries a dismissal callback. **One divergence, recorded at the code:** upstream opens `bootbox.hideAll()` and re-raises per failing producer, so a room with four open microphones shows the same sentence four times and clears whatever else the member was reading; one dialog is raised here and its callback retries every blocked element, because one gesture satisfies all of them. `resizeScrollviewChatEnd` has no counterpart — it is a jQuery height recalculation for a scroller this room lays out with CSS.

**medium** · `missing-behaviour` · reference byte **2,515,092**

```
bootbox.alert("Your browser needs your OK to play the room's audio",()=>{P("Autoplay after UI, pressing play()..."),o.play(),i.appService.guiEventBus.emit("resizeScrollviewChatEnd")})
```

**Ours:** `apps/room/src/lib/room/media-transport.svelte.ts:1274-1277` catches the rejected `play()` and does `console.warn('[media] remote audio ${producerId} could not play', error)` and nothing else. Grepped apps/room/src for `needs your OK` — zero hits. Chrome blocks audible autoplay without a gesture, so a viewer whose browser refuses hears nothing with no way to recover; the reference's dialog OK is the gesture that retries `play()`. (The reference has this twice — `attachAudioStream` here, and a 3× retry-then-alert in the mediasoup consumer at byte 1094188.)

> Verified: I could not refute this. Both reference sites are real and I read them: byte 2515120 (`attachAudioStream` -> `bootbox.hideAll(); bootbox.alert("Your browser needs your OK to play the room's audio", () => { o.play(), guiEventBus.emit("resizeScrollviewChatEnd") })`) and byte 1094188 (the mediasoup consumer's `h=(f=3,_=300)=>{c.play().then(.…

### G11 — `audioServerDisableMic` — no `micDisabled` state and no microphone-troubleshooting dialog

**MEASURED REFUSAL — recorded at the code 2026-08-30 12:55 UTC.** The event is raised by the AUDIO BRIDGE — the server deciding a microphone is unusable after it was already opened locally — and this room has no audio bridge, the same absence `media-transport.svelte.ts` records for `startTalking`/`stopTalking`. A subscriber would be a handler nothing can call. **And the outcome it exists for is already reached by a better route:** upstream has ONE sentence for every microphone failure, while `#reportCaptureError` branches on the actual error — a denied permission gets browser-specific guidance from the Permissions API, and everything else gets `mediaCaptureErrorMessage`, which tells an insecure context from a missing device from a device in use elsewhere. `micDisabled` stays unmodelled and `gates.ts:393` already records that where it matters.

**medium** · `missing-behaviour` · reference byte **2,503,109**

```
this.appService.appEventBus.subscribe("audioServerDisableMic",()=>{this.micDisabled=!0,this.recordingReminder=!1,bootbox.alert("There is an issue with your microphone, make sure you allowed its use on the browser. Also, if this is a USB microphone, try to unplug it and plug it back in, then reload the page and it shoul
```

**Ours:** Absent. Grepped apps/room/src for `audioServerDisableMic` (zero hits) and `micDisabled` (one hit, and it is prose: `apps/room/src/lib/room/gates.ts:393` records that the recording banner's `!micDisabled` term "this room does not model"). `this.micDisabled=!1` is one of the class-field initialisers I read at byte 2497326, and the handler also clears `recordingReminder`; neither the flag nor the dialog exists here.

> Verified: Not implemented anywhere in apps/room/src under any name. I grepped for the event name (audioServerDisableMic, disableMic/disable_mic/disable-mic, audioServer), the flag and every synonym I could think of (micDisabled, micBlocked, micBroken, micUnavailable, micFault, micError, micIssue, audioDisabled, noMic, micPermission), and the dialog…

### G12 — Navbar users counter has neither of its two handlers: click → `toggleSideBarUsersCount()`, dblclick → `hideCount` toggle

**BUILT 2026-08-30 12:36 UTC.** Both, and the row is right that the enumeration mislabels them: CLICK opens the sidebar and DBLCLICK hides the number. `toggleSideBarUsersCount` is `alwaysShowRoster && (…)`, so the setting gates the whole statement and the control is inert in a room that did not ask for it — upstream's own behaviour, and the hamburger beside it does the same job unconditionally. Its `loadRoster()` half has no counterpart and was already refused with its reason in `always-show-roster-contract.test.ts`. `hideCount` stays component state because that is what it is upstream: nothing persists it, and a reload showing the count again is right for a gesture meant to peek past a number rather than configure the room.

**medium** · `missing-control` · reference byte **2,484,941**

```
x("click",function(){return D(e),E(g().toggleSideBarUsersCount())})("dblclick",function(){D(e);const o=g();return E(o.hideCount=!o.hideCount)})
```

**Ours:** `apps/room/src/lib/components/RoomNavbar.svelte:228-230` is a plain `<span title="Users Connected" class="users ml-1 mr-1 d-flex align-items-center">` with no `onclick` and no `ondblclick`. Grepped apps/room/src for `toggleSideBarUsersCount` (only prose, `apps/room/src/lib/always-show-roster-contract.test.ts:31`) and `hideCount` (zero hits). Method body read at byte 2515444: `toggleSideBarUsersCount(){this.alwaysShowRoster&&(this.showSidebar=!this.showSidebar,this.showSidebar&&this.appService.loadRoster())}`. NOTE the enumeration mislabels this — the alwaysShowRoster flip is on CLICK; DBLCLICK toggles the separate `hideCount` field.

> Verified: Both handlers are genuinely absent from our source, and so is the visibility field the dblclick toggles. WHAT I READ IN OUR SOURCE.

### G13 — Navbar roster count is shown to everyone — the `hideCount || (!rosterCountVisibleToViewers && !isPresenter)` gate is not applied

**BUILT 2026-08-30 12:36 UTC.** The page resolves it through the same `rosterCountVisibleTo()` the SIDEBAR badge uses, so the two cannot answer differently — which was the defect: an owner setting honoured in one of the two places that publish the number is not honoured. `hideCount` is combined here rather than folded into that helper, because it is this component's state and not a room setting.

**medium** · `missing-control` · reference byte **2,487,511**

```
O(5,e.hideCount||!e.appService.globals.sessData.rosterCountVisibleToViewers&&!e.appService.globals.isPresenter?-1:5)
```

**Ours:** `apps/room/src/lib/components/RoomNavbar.svelte:228-230` renders `{roster.connectedCount}` unconditionally. We DO implement the sibling gate for the SIDEBAR badge — `rosterCountVisibleTo()` at `apps/room/src/lib/roster-gates.ts:81-84`, cited to `O(6, rosterCountVisibleToViewers || isPresenter ? 6 : -1)` and used at `RoomSidebar.svelte:545` — so an owner who turns the count off for viewers still has it leaked in the navbar. The gated node is `kPe` (read at byte 2472519), which renders `globals.rosterCount + simUserCount`, i.e. exactly our `roster.connectedCount`.

> Verified: Confirmed not built. The navbar count span in apps/room/src/lib/components/RoomNavbar.svelte:228-230 renders `{roster.connectedCount}` with no enclosing conditional (lines 210-230 of that file contain no `{#if}` between `<nav>` and the span).

### G14 — `simUserCount` is not clamped to [0, 5000]

**BUILT 2026-08-30 12:55 UTC, and the LOWER bound is the half that mattered.** `connectedCount` is `rosterCount + simUserCount`, so a negative setting **SUBTRACTED from a real roster** — a room of twelve could publish "7". A number that lies downwards is the worse half: an inflated headcount is at least the kind of lie the setting exists to tell. `#lib/sim-user-count.ts` carries the transcription and the three details that would each be a real change if tidied — the upper test is `>` and the lower `<=` (so 0 assigns 0, a redundant branch that is kept), `Number(e)` is upstream's so a non-numeric setting arrives as `NaN`, and the `e &&` guard means an absent value keeps the previous one there while here it is read per render. `NaN` is the one case the reference does not answer and is answered as 0, because the alternative is a headcount rendered as "NaN" to every member.

**low** · `missing-behaviour` · reference byte **2,499,409**

```
this.simUserCount>5e3&&(this.simUserCount=5e3),this.simUserCount<=0&&(this.simUserCount=0)
```

**Ours:** `apps/room/src/lib/room/create-room.svelte.ts:299` is `simUserCount: () => data.sessData?.simUserCount ?? 0`, passed into `RoomRoster` and added to the badge at `apps/room/src/lib/room/roster.svelte.ts:163`. No clamp on the client and none server-side — `apps/room/src/lib/server/room-config-client.ts:111` types it as a bare `simUserCount?: number`. An owner value of 50000 or -5 renders verbatim.

> Verified: No clamp exists anywhere in our source, on the client or the server. The value flows raw from the controller payload to the badge: room-config-client.ts:111 types it as a bare `simUserCount?: number` and fetchRoomConfig (same file, 799-832) validates only that the payload is an object with a `settings` object — no per-field checks; create…

### G16 — `visibilitychange` is armed immediately, not after the reference's 10 000 ms delay, and it does not unload/reload the roster

**DELIBERATE DIVERGENCE — recorded at the code 2026-08-30 12:55 UTC, which is what the row asked for.** The row's own closing observation is the point: the SIBLING refusal (the 500 ms `alwaysShowRoster` timer) is recorded in `always-show-roster-contract.test.ts` and this one was not, which is how a deliberate divergence reads as an oversight to the next comparison. Both halves are now in `refresh.svelte.ts`. The 10 000 ms delay protects a socket handshake still in flight; this room's equivalent is `invalidateAll()` and an idempotent five-second poll, neither of which a mid-load visibility flip can corrupt — and arming immediately means a member who tabs away in the first ten seconds is actually noticed. `unloadRoster()` saves a subscription upstream because the roster is a separate fetch; here it arrives with the page load, so unloading it would buy an empty sidebar for one frame on every return to the tab.

**low** · `divergence` · reference byte **2,511,416**

```
appVisibilityChange(e){console.log("appVisibilityChange enabled: ",e),e?this.visibilityChangeTimer=setTimeout(()=>{document.addEventListener("visibilitychange",()=>{
```

**Ours:** `apps/room/src/routes/+page.svelte:931` binds `<svelte:document onvisibilitychange={() => roomRefresh.visibilityChanged(document.hidden)} />` unconditionally at mount, and `apps/room/src/lib/room/refresh.svelte.ts:94-108` sets `appHasFocus`, stops/starts the 5 s poll and does one catch-up `invalidateAll()`. Two reference behaviours have no counterpart: the 10 s arming delay (the `},1e4)` at the end of that setTimeout) and the hidden-branch `appService.unloadRoster()` / show-branch `showSidebar && loadRoster()`. Probably deliberate — our roster arrives with the page load — but unlike the sibling 500 ms `alwaysShowRoster` timer, whose refusal IS recorded at `always-show-roster-contract.test.ts:17-21`, this one is nowhere written down.

> Verified: The claim is COMPOUND and only ONE of its two limbs survives. It must be split before it is acted on.

### G17 — `videoOnlyMode` (the `r` query parameter) is missing from both ngClass maps and from the `hideChatAlerts` gate

**MEASURED REFUSAL — already recorded, verified 2026-08-30 12:55 UTC.** The row says so itself: this is an ALREADY-DECLARED gap rather than an unnoticed one, listed only so the enumeration is answered in full. `gates.ts:250-261` carries the reason and it is the same one `files-gates.ts` records for `hideFiles`: `videoOnlyMode` is the `r` query parameter — recording-bot mode — and it is not on the wire here, so the term would read a value nothing supplies. `recordChat` is deliberately not on the wire either, because it appears ONLY inside that writer and would arrive with no reader. Nothing was added; the row is closed against the record that already existed.

**low** · `divergence` · reference byte **2,465,818**

```
nPe=(t,n)=>({"push-wrapper":t,"mt-0":n}),qB=t=>({"btn-dark":
```

**Ours:** `apps/room/src/routes/+page.svelte:982` binds `'mt-0': chatOnlyMode || gates.viewerOnlyMode` and `apps/room/src/lib/components/RoomShell.svelte:177` binds `'vh-100': chatOnlyMode || viewerOnlyMode` — two of the reference's three terms. The reference update block, which I read at byte 2548267, is `videoOnlyMode||chatOnlyMode||viewerOnlyMode` in both places. This is an ALREADY-DECLARED gap (`+page.svelte:978-979`, `RoomShell.svelte:168-170`, `gates.ts:258`) rather than an unnoticed one — listed only so the enumeration is answered in full.

> Verified: Could not refute. The reference's three-term expression is confirmed by direct read at three sites, and our source implements only two terms at all three consumers.

---

## ModalHost: user-info / moderation modal

14 verified gaps; 48 reference behaviours confirmed present.

### UIM-02 — Admin Notes tab renders only the password gate — the notes list, per-note delete and Add Note (mTe/fTe) have no counterpart

**BUILT 2026-08-30, before this row was written down.** `UserNotesPane.svelte` renders both halves of upstream's `O(104, allowToManageNotes ? 105 : 104)` — the scrolling list (`mTe`), the per-note row with its 20px `smallAvatarImg` and delete button (`fTe`), and Add Note — against `user_notes`, which is keyed by room AND subject, with `RoomUserNotes` holding the three calls and `userNotesPort` carrying them. The row's own quote of `ModalHost.svelte:203-208` is the stale part: that docblock was rewritten on 2026-08-29 when the schema change landed, and now records that both states exist. Marked 2026-08-30 04:10 UTC after reading the component.

**high** · `missing-control` · reference byte **2,065,327**

```
function mTe(t,n){if(1&t){const e=Y();d(0,"div",38)(1,"div",93),ht(2,fTe,7,8,"div",94,z2e),u()(),T(4,"hr"),d(5,"div",38)(6,"div",39)(7,"button",95),x("click",function(){return D(e),E(g(2).addNote())}),T(8,"i",96),v(9," Add Note "),u()()()}if(2&t){const e=g(2);m(2),pt(e.user.notes)}}
```

**Ours:** ModalHost.svelte:2547 renders `{#if !canManageNotes}` and nothing else — the pTe branch only; there is no `{:else}`. grep over apps/room/src returns ZERO hits for "Add Note", "addNote", "deleteNode", "delUserNote", "addUserNote", "smallAvatarImg" markup use, or the reference's triple-`d-flex` note row (consts[94] = [1,"d-flex","d-flex","justify-content-between","d-flex","align-items-stretch"], read in the consts array at 2087748). fTe (read at 2064890) is the per-note row with the 20px avatar, ' [date|short] name: note ' and `deleteNode(note,$index)`. This is already documented as a deliberate scope-out at ModalHost.svelte:203-208 ("`notes` is room-scoped, keyed by room_short_code with no member column"), so it is a known gap, not an unnoticed one — but it is still the whole feature.

> Verified: Could not refute. The #nav-notes tabpanel in ModalHost.svelte contains exactly one branch — {#if !canManageNotes} with the password paragraph and "Enter Password" button (upstream's pTe) — closing at line 2689 with no {:else}; the reference's mTe list container, per-row fTe (20px avatar, " [date|short] name: note ", deleteNode(note,$index…

### UIM-03 — `user.hidePrivateInfo` — the three privacy gates that suppress the extra tabs, the Last Login/Email/Badges/Location rows and the Permissions row — does not exist anywhere in our source

**ALREADY BUILT — the outcome, by three server-side refusals and one render gate.** Confirmed
2026-08-30 by re-reading the refutation above against the code rather than re-deriving it: the
`{#if isPresenter && !isLimitedPresenter}` block opens at the user card's tab list and closes after
the Admin Notes pane, so every row `hidePrivateInfo` would have suppressed is presenter-only and a
member sees no body at all. `authority-gate-contract.test.ts` finds that block by what it CONTAINS
and asserts each row falls inside its offsets. Under it, `email` and `locStr` are filtered off the
SSE roster frame (`roster-privacy.test.ts`), and Last Login and Email in that card come from
`user-detail.remote.ts`, which is presenter-only on the server. The reference's flag is a client
switch over data that still arrives; this is stricter. Carrying the disposition line the refutation
earned, so the row stops reading as open.

**high** · `missing-control` · reference byte **2,068,025**

```
O(5,e.user.hidePrivateInfo?-1:5),m(11),Ze(e.user.nick),m(),O(17,e.user.hidePrivateInfo?-1:17),m(5),Ze(e.user.privData.uaStr||"n/a"),m(),O(23,e.user.hidePrivateInfo?-1:23)
```

**Ours:** grep for "hidePrivateInfo" over the whole of apps/room/src returns ZERO hits (source and tests). Slot 5 is J2e, the System/Actions/Admin Notes tab list (read at 2059391); slot 17 is oTe, the Last Login / Email / Badges / Location rows (read at 2060099); slot 23 is lTe, the Permissions row (read at 2062977). We render all three unconditionally: ModalHost.svelte:2053 emits all four tabs from one `{#each}`, :2091 the Last Login row, :2165 the Permissions row. In a multi-tenant fintech room this flag is the one that keeps a member's email, IP, UA and permissions out of the modal, and we have no equivalent.

> Verified: I could not refute this. `hidePrivateInfo` — and every synonym I could construct for it — is absent from apps/room/src.

> **REFUTED on 2026-08-30, after the register was committed.** Read the markup rather than grepped
> for the flag name: `ModalHost.svelte`'s `{#if isPresenter && !isLimitedPresenter}` opens at the
> user card's tab list and closes after the Admin Notes pane, so the tabs AND every row inside them
> — Last Login, Email, Badges, Location, Permissions — are presenter-only. There is no `{:else}`: a
> member opening a card sees the header and the footer buttons and no body at all. Confirmed with
> the Svelte compiler's own AST, and pinned by `authority-gate-contract.test.ts`, which finds the
> block by what it CONTAINS and asserts each row falls inside its offsets.
>
> Two further refusals sit under it, and neither is a render gate: `email` and `locStr` are filtered
> off the SSE roster frame (`roster-privacy.test.ts`, after a real 2026-08-18 defect), and Last
> Login and Email in that card come from `user-detail.remote.ts`, which is presenter-only on the
> server. The reference's `hidePrivateInfo` is a client flag over data that still arrives; this is
> three server-side refusals, which is strictly stronger.
>
> **What the investigation did find, and it was worth more than the claim:** nothing asserted that
> gate. The privacy of every field in that card rested on one `{#if}` with no test. It has one now.

### UIM-09 — System tab, Location, Last Login, Trial/New and Temporary Access Only have no data supply — every value resolves to 'n/a' or false

**HALF BUILT 2026-08-30 — the one field of eleven that had a supply is now supplied; the other ten
are measured refusals.** It was BLOCKED for part of a day on a change in a file another agent held
open; that change landed the same day and the block is gone. Taken field by field, because the row
groups eleven that have different answers:

* **`loggedIn` and `email` are SUPPLIED now** — `user-detail.remote.ts` and `RoomUserDetail.decorate`,
  the presenter-only `userInfoDB` lookup. The row predates them. Both cells fill.
* **`isTrial` is SUPPLIED, 2026-08-30.** `room_members.is_trial` reaches this room as `isFT` on the
  SSE roster frame (`routes/sess/[room]/events/+server.ts:202`), so every roster `User` carried it
  all along; only the rename at the boundary was missing. `RoomUserActions.targetFor` now sets
  `isTrial: user.isFT ?? false`, and `isFT?: boolean` joined the class's `User` constraint beside
  the five permission flags — which is why this was two lines rather than the one the row predicted.
  The Trial badge's markup and gate were already correct (UIM-10), so `{#if isPresenter &&
  targetUser.isTrial}` at `ModalHost.svelte:2771` had been reading `undefined` for every member in
  every room: a badge whose only reachable state was "off". Two contract tests in
  `user-actions.svelte.test.ts`, and the `?? false` is pinned separately from the supply because an
  absent field and a false one must mean the same thing to a truthiness gate.
* **`temporaryAccessOnly` is a recorded refusal, not a gap**, and the row's stated danger is gone:
  `permission-keys.ts` explains that it is in neither the reference's own permission log line nor the
  controller's `PERMISSION_KEYS`, so there is no column to write it to — and Save sends
  `ROOM_PERMISSION_KEYS` only, which does not include it. The five keys it DOES send all come through
  `targetFor` now, so the silent-revocation the row warns about cannot happen.
* **`years` has no supply anywhere**, stated at `server/room-config-client.ts:82` in its own words:
  `item.membershipYears` has no producer. UIM-08 writes the gate correctly over it anyway, for the
  reason recorded there.
* **`location`, `ip`, `userAgent`, `appVersion`, `streamServer`, `serverId`, `isNew` — MEASURED
  REFUSAL.** `location` and `ip` are deliberately filtered off the roster wire (`roster-privacy.test.ts`,
  after a real 2026-08-18 defect) and `readUserDetail` answers with `email` and `loggedIn` only. The
  other four are per-SESSION facts the reference's socket server owns and this product's server never
  learns; `isNew`'s absence is already measured and written up at the Badges cell in `ModalHost`.

**high** · `missing-behaviour` · reference byte **2,068,096**

```
O(5,e.user.hidePrivateInfo?-1:5),m(11),Ze(e.user.nick),m(),O(17,e.user.hidePrivateInfo?-1:17),m(5),Ze(e.user.privData.uaStr||"n/a"),m(),O(23,e.user.hidePrivateInfo?-1:23),m(10),Ze(e.user.data.cver||"n/a"),m(6),Ze(e.user.privData.ip||"n/a"),m(),O(40,e.user.privData.ip?40:-1)
```

**Ours:** The markup is all there (ModalHost.svelte:2325 App Version, :2331 IP, :2341 System, :2345 Stream Server, :2356 Socket Server, :2360 UserID, :2091 Last Login, :2148 Location) but `ModalTargetUser` is built in only two places — `RoomUserActions.target` (src/lib/room/user-actions.svelte.ts:276-300) and `.targetFor` (:303-328) — and NEITHER sets `loggedIn`, `location`, `ip`, `userAgent`, `appVersion`, `streamServer`, `serverId`, `isTrial`, `isNew`, `years` or `temporaryAccessOnly`. grep for `appVersion:` / `streamServer:` / `serverId:` / `userAgent:` / `loggedIn:` / `temporaryAccessOnly:` as object keys over apps/room/src (excluding tests) returns no producer. So the whole System tab is a table of 'n/a', the '(click to lookup)' and '(test it)' links can never render, and the Temporary Access Only checkbox always initialises unticked regardless of the stored value — which matters because Save writes every key it is given (see the docblock at src/lib/room/user-actions.svelte.ts:313-322 about exactly this class of silent revocation).

> Verified: I tried to refute this and could not. The reference text is real: I read the bundle and `e.user.privData.uaStr` occurs at observed offset 2068127 (slice printed from 2068000), with `e.user.data.streamServer` at 2063568 — the compiled row list is App Version (`data.cver`), IP (`privData.ip`), System (`privData.uaStr`), Stream Server (`data…

### UIM-01 — Avatar edit dropdown (Setup Gravatar / Or upload a picture / Remove profile picture) is entirely absent

**ALREADY BUILT.** `AvatarOptionsMenu.svelte` renders the dropdown, mounted at
`ModalHost.svelte`'s `edit-user-avatar` cluster behind `{#if isTargetCurrentUser}` — which is the
reference's own gate, `O(6, o.user.userXrefID === o.appService.globals.user.userXrefID ? 6 : -1)` at
byte 2,095,583, with no role term. `onRemoveProfilePicture` and the upload picker are both wired, and
`roomForAvatarChange` in `profile-picture.remote.ts` is the server half that is the actual authority.
Built after this row was written; the CSS it called dead has a consumer now.

**medium** · `missing-control` · reference byte **2,058,852**

```
function K2e(t,n){if(1&t&&(d(0,"div",6)(1,"span",16),T(2,"i",17),u(),d(3,"ul",18),H(4,W2e,9,0)(5,q2e,4,0),u()()),2&t){const e=g();m(4),O(4,e.appService.globals.preferences.profilePic?5:4)}}
```

**Ours:** ModalHost.svelte:1991 renders `<div class="edit-user-avatar">` containing only the `<img>`. Root template gates the dropdown on `O(6, o.user.userXrefID===o.appService.globals.user.userXrefID?6:-1)` (read at 2095583); we render no dropdown at all. grep over apps/room/src returns ZERO hits for "Setup Gravatar", "Or upload a picture", "Remove profile picture", "clearProfilePic", "setupProfilePic", "edit-user-avatar-options". The CSS is already ported and is therefore dead: src/app.css:1913 `.edit-user-avatar-options`, :1926 `:hover`, :1930 `.dropdown-toggle::after`, plus src/lib/styles/captured-runtime-components.css:4825/4837/4841. The reference strings "Are your sure you want to remove your profile picture?" and "Profile Image Upload" also have zero hits in apps/room/src.

> Verified: I could not refute it. The reference's self-service avatar dropdown is genuinely unbuilt here, and our own repository already declares it unbuilt in a contract test.

### UIM-04 — Footer 'Private Chat' is not gated on `canPM` — only on `checkIsMe()`

**BUILT 2026-08-30.** The footer's Private Chat button takes its second term. `O(18, o.canPM &&
o.checkIsMe() ? 18 : -1)` at byte 2,096,067 — read beside its three siblings, which take
`checkIsMe()` alone — is a nested `{#if canPrivateChat}` inside the existing
`{#if !isTargetCurrentUser}`, so @Mention, Follow and Mute are untouched.

The answer arrives RESOLVED, from `RoomOverlays`, through `canShowRosterPrivateChat` — the existing
transcription of `(isPresenter || sessData.userPM || sessData.userToPresenterPM && ("a" === user.perms
|| user.hasAdminChat)) && !(globals.user.isFT && sessData.disablePMForTrials)` (byte 2,073,550). That
function had one caller, the roster's; the card asks the identical question about the identical target
and was not asking it at all. Two call sites, one rule — which the reference itself does not manage,
asking twice and disagreeing once. The prop defaults to `false`: it is a permission, so deny-by-default
governs. `user-info-modal-contract.test.ts`.

**medium** · `missing-control` · reference byte **2,096,067**

```
O(18,o.canPM&&o.checkIsMe()?18:-1),m(),O(19,o.checkIsMe()?19:-1))
```

**Ours:** ModalHost.svelte:2692 opens a single `{#if !isTargetCurrentUser}` that wraps @Mention, Private Chat, Follow and Mute together, so Private Chat (:2711) gets only the checkIsMe half. The reference's canPM is `(isPresenter||sessData.userPM||sessData.userToPresenterPM&&("a"===this.user.perms||this.user.hasAdminChat))&&!(globals.user.isFT&&sessData.disablePMForTrials)` (read at 2073550). The transcription EXISTS in this repo as `canShowRosterPrivateChat()` in src/lib/roster-private-chat.ts:26 — but ModalHost neither imports it nor takes a prop for it, so the modal's button is unconditional for any non-self target.

> Verified: The reference gates the user-info modal's Private Chat button on TWO conditions — `O(18,o.canPM&&o.checkIsMe()?18:-1)` — while @Mention (17) and Follow/Mute (19) get only `checkIsMe()` (which returns true when the target is NOT me, verified at offset 2087485). Our ModalHost opens a single `{#if !isTargetCurrentUser}` at ModalHost.svelte:2…

### UIM-05 — Follow-chat 'Reset' resets local state only; the reference resets AND persists to followedUsers

**BUILT 2026-08-30.** `onreset` reseeds AND persists, in that order:
`followChatStyle = defaultFollowStyle(); onFollowStyleChange(targetUser, followChatStyle)`.
`resetFollowChatStyle` at byte 2,075,493 is two statements, and its neighbour twelve bytes on shows
what the second one is — `saveFollowChatStyle` is that call alone, so Reset IS Save with a seed in
front of it. Both write immediately; neither waits for the Save button. The persistence path was
already built and this one control simply did not use it, so a presenter who pressed Reset and closed
the modal left the saved style untouched. `user-info-modal-contract.test.ts`.

**medium** · `missing-behaviour` · reference byte **2,075,493**

```
resetFollowChatStyle(e){this.followChatStyle=this.loadDefaultFollowChatStyle(),this.appService.updateUserInList({emailHash:e,followChatStyle:this.followChatStyle},"followedUsers")}
```

**Ours:** ModalHost.svelte:2677 — `onclick={() => (followChatStyle = defaultFollowStyle())}`. No call to `onFollowStyleChange`, so pressing Reset and closing the modal leaves the saved style untouched; the reference writes the defaults through `updateUserInList` immediately, exactly as `saveFollowChatStyle` does (2075673, which our 'Save changes' at :2683 does match).

> Verified: Could not refute. Our follow-chat 'Reset' at ModalHost.svelte:2809 is `onclick={() => (followChatStyle = defaultFollowStyle())}` — it assigns local $state only.

### UIM-06 — Clicking the 'Admin Notes' tab does not invoke manageAdminNotes() — the password prompt is reachable only from the Enter Password button

**BUILT 2026-08-30 — and the row understated it: a comment in our source asserted the OPPOSITE of
what the bundle says.** The Admin Notes tab now calls `onUserAction('admin-notes-password', …)`, the
same door the Enter Password button uses, which is `RoomAdminNotes.ask()` — the prompt and then the
load.

Read rather than trusted: `J2e` begins at **2,059,391** (the row cites 2,059,546, which is inside the
click handler), and its third anchor is
`d(4,"a",56),x("click",function(){return D(e),E(g(2).manageAdminNotes())})`. Const 56 — walked out of
this component's consts table at 2,087,748 — is the only one of the three tab anchors carrying
`3,"click"`. `manageAdminNotes()` at 2,081,768 prompts only when `needPasswordForUserNotes` is
configured and the door is still shut, and otherwise grants silently; `RoomNotesAccess.ask()` is both
branches, so a room with no password sees no prompt from this click either.

`admin-notes.ts` carried *"clicking a tab must not raise a password prompt — upstream's tab does
not"*. That claim was false and had never been checked against the bytes. It is corrected there, with
the decoded template quoted beside it and the old sentence kept so the plausible reasoning behind it
is answered rather than deleted. `userNotes.open` is gone from `ModalHost`'s prop shape with it —
nothing calls it any more.

**medium** · `missing-behaviour` · reference byte **2,059,546**

```
manageAdminNotes())}),v(5," Admin Notes "),u()}}function Z2e(t,n){1&t&&(d(0,"span",9),v(1,"Offline"),u())}
```

**Ours:** ModalHost.svelte:2053-2066 builds all four tabs from one `{#each}` whose onclick does `event.preventDefault(); userInfoTab = tabId` and nothing else. consts[56] for that tab carries `3,"click"` (read in the consts array at 2087748) precisely because the reference binds manageAdminNotes there. We do have the handler — `RoomNotesAccess.manageAdminNotes()` in src/lib/room/notes-access.svelte.ts:78, reached from ModalHost.svelte:2551 via `onUserAction('admin-notes-password', …)` — it is just not wired to the tab.

> Verified: I could not refute it. In our source the Admin Notes tab anchor does nothing but switch panes, and the notes-password door has exactly one caller.

### UIM-07 — The 'Badges:' cell renders an empty div — no parseBadges, no innerHTML supply

**ALREADY BUILT.** The Badges cell renders `{#each targetBadges as badge}` — the reference's own
`user-badge-img` / `badge px-1 mx-1 user-badge` markup, fed by `RoomFeeds.badgesFor` through the
`targetBadges` prop. `user-badges-contract.test.ts` pins it, including the one thing deliberately NOT
copied: upstream binds `innerHTML` here and marks it `noSanitize`, over label and colour values an
owner types into a controller form. These are ELEMENTS. Built after this row was written.

**medium** · `missing-behaviour` · reference byte **2,060,779**

```
z("innerHTML",Ct(18,14,e.badges,"html"),wn),m(2),O(19,e.appService.globals.isPresenter&&e.user.isFT?19:
```

**Ours:** ModalHost.svelte:2110 — `<div class="d-inline-block align-baseline mr-1"></div>`, permanently empty. The class list matches reference consts[57] = [1,"d-inline-block","align-baseline","mr-1",3,"innerHTML"] but the binding does not exist. grep for "parseBadges" over apps/room/src returns ZERO hits. We DO render badges elsewhere from a structured array (RoomMessage.svelte:673/676 with the reference's own `user-badge-img` / `badge px-1 mx-1 user-badge` markup), so the renderer exists under another shape — the modal is simply not fed it.

> Verified: I could not refute it. The 'Badges:' cell in our user-info modal is an empty div with no supply, and nothing anywhere in apps/room/src feeds a badge list for a MODAL TARGET user.

### UIM-08 — Stars/years gate drops two of its three terms — `disableStarYears` and `user.isP`

**BUILT 2026-08-30, all three terms — and the row's second claim is REFUTED.**
`O(21, sessData.disableStarYears || user.isP || !user.data.years ? -1 : 21)` at byte 2,061,001,
inverted, is `!disableStarYears && !isP && years`. This was the third term alone.

`disableStarYears` needed no new prop: it is on `RoomMessageChrome`, which this component already
takes, and `RoomMessage.svelte:753` and `:1039` already obey it. The modal was the one star in the
room ignoring the owner's setting.

**`user.isP` DOES have a counterpart here**, and the mapping was already written down —
`private-chat.svelte.ts:432` builds a roster target as `permissions: user.isP ? 'a' : 'r'`, and
`permissions` is what this modal's own Permissions row reads to print "Presenter / Admin". So
`targetUser.permissions !== 'a'` is `!user.isP` in this room's vocabulary. The row's "no counterpart
in apps/room/src" is the shape the register's own preface warns about: a gap stated as a missing NAME.

`years` still has no supply (see UIM-09), so this block renders for nobody today — as it did before.
The gate is written correctly now for the same reason `RoomMessage` already carries the same
three-term shape over the same absent supply: a gate written after the supply lands is a gate written
while somebody is looking at a wrong star. `user-info-modal-contract.test.ts`.

**medium** · `missing-control` · reference byte **2,061,001**

```
O(21,e.appService.globals.sessData.disableStarYears||e.user.isP||!e.user.data.years?-1:21),m(5),Ne(" ",e.user.privData.locStr||"n/a"," \xa0\xa0 ")
```

**Ours:** ModalHost.svelte:2138 — `{#if targetUser.years}` only. `disableStarYears` is a real, supplied setting in this repo (declared src/lib/server/room-config-client.ts:81, consumed at RoomMessage.svelte:694 and :820, documented at src/lib/room/gates.ts:109), so a room that switched star-years off would still see them in this modal. `user.isP` has no counterpart in apps/room/src.

> Verified: The reference gate is three-term: O(21, sessData.disableStarYears || user.isP || !user.data.years ? -1 : 21).

### UIM-13 — Our own source cites the wrong bundle offset for giveMicScreen — twice

**FIXED 2026-08-30.** Both citations now say **2,077,604**, which is where
`giveMicScreen(e){` actually starts — read with python from the pinned bundle, along with what is at
the address they used to name: `aySound:!0}}resetFollowChatStyle(e){…`, the tail of
`loadDefaultFollowChatStyle` and the head of `resetFollowChatStyle`, 2,123 bytes earlier and about a
different feature entirely.

The correction says what is at the wrong address rather than silently swapping a number, because the
transcribed BODY under those comments was byte-correct and a reader who followed the old pointer
would have concluded it was invented. `user-info-modal-contract.test.ts` asserts the offset against
the bundle instead of trusting it — a byte offset in prose is the load-bearing claim DPE rule 4 says
must become an executable assertion.

**medium** · `defect` · reference byte **2,077,604**

```
giveMicScreen(e){if(this.user.userXrefID==this.appService.globals.user.userXrefID)return bootbox.alert(`Can't ${e?"give":"take"} 'Mic/Screenshare' to yourself.`),!1;this.appService.sendServerAdminCommand("giveMicScreen",{user:this.user._id,give:e})
```

**Ours:** ModalHost.svelte:1419 says "Transcribed from the bundle at offset 2075481" and ModalHost.svelte:2230 repeats "transcribed byte-for-byte (bundle offset 2075481)". I read s[2075481:2075600] and it is `aySound:!0}}resetFollowChatStyle(e){this.followChatStyle=this.loadDefaultFollowChatStyle(),this.appService.updateUserIn` — the tail of loadDefaultFollowChatStyle and the head of resetFollowChatStyle, not giveMicScreen. The real definition site is 2077604. The transcribed BODY quoted in that docblock is correct byte-for-byte; only the citation is wrong. Two comments now point a future reader at the wrong function.

> Verified: I could not refute this; the defect is real and is broader than claimed. The BEHAVIOUR is fully built (ModalHost.svelte:1514 `async function giveMicScreen(give: boolean)`, buttons at :2351/:2357, command import at :47, tests at roster-gates.test.ts:598), and the body quoted in the docblock is byte-for-byte correct — but the offset citatio…

### UIM-10 — Trial and New badge classes diverge from the reference (and from our own RoomMessage.svelte)

**BUILT 2026-08-30.** `badge bg-danger trial-badge` and `badge bg-warning new-badge`, from consts
58 and 59 of this component's own table (walked from 2,087,748, 131 entries). Three differences and
all three mattered: `bg-*` is the Bootstrap **5** spelling this room is built on, so `badge-info` was
inheriting nothing; `New` is WARNING rather than info, a different colour and not a different name for
the same one; and `trial-badge` / `new-badge` are the hooks a room stylesheet hangs rules on.

The `Offline` badge two rows up is deliberately NOT changed — its const is 9 =
`[1,"badge","badge-danger"]`, the Bootstrap-4 spelling in the reference too. Copying a value means
copying it where it disagrees with its neighbours. `user-info-modal-contract.test.ts` asserts both
directions.

**low** · `wrong-constant` · reference byte **2,090,982**

```
[1,"badge","bg-danger","trial-badge"],[1,"badge","bg-warning","new-badge"],[1,"stars-container"],[1,"fas","fa-star","stars-icon"]
```

**Ours:** ModalHost.svelte:2132 uses `class="badge badge-danger"` for Trial and :2135 uses `class="badge badge-info"` for New. Our own sibling already has it right — RoomMessage.svelte:689 `badge bg-danger trial-badge` and :692 `badge bg-warning new-badge` — so the two surfaces render the same badge two different ways, and any CSS hung on `.trial-badge` / `.new-badge` misses the modal.

> Verified: I could not refute this. Our user-info modal renders the Trial/New badges with Bootstrap-4 contextual badge classes and no per-badge hook, while the reference's const array for that same modal uses the utility+hook form that our own RoomMessage.svelte already matches.

### UIM-11 — 'Restart Screens' second icon is fa-play-circle in ours, fa-sync in the reference

**BUILT 2026-08-30, together with UIM-12** — see that row for why one comment covers both. Restart
Screens is `fa-desktop` + `fa-sync`, consts 71 and 41 as emitted at byte 2,064,155. `fa-sync` is the
circular-arrows glyph this column's own Force Reload already uses, and it is what makes RESTART read
as restart.

**low** · `wrong-constant` · reference byte **2,064,155**

```
T(13,"i",71),v(14,"\xa0"),T(15,"i",41),v(16," Restart Screens "),u(),d(17,"button",40),x("click",functio
```

**Ours:** ModalHost.svelte:2407 — `<i class="icon fa fa-desktop"></i>&nbsp;<i class="icon fa fa-play-circle"></i> Restart Screens`. consts[71] = [1,"icon","fa","fa-desktop"] matches, but consts[41] = [1,"icon","fa","fa-sync"] (read at 2089781) does not — we render play-circle. The consequence is the one local-capture.svelte.ts:797 already warns about in prose: Restart Screens and Stop Screens must not look alike, and now Restart Screens and Start Rec do instead.

> Verified: Confirmed by reading both sides. The reference's peer-command menu renders Restart Screens as consts[71] + consts[41] = fa-desktop + fa-sync; our only render site uses fa-desktop + fa-play-circle.

### UIM-12 — 'Start Rec' icon `fa-record-vinyl` appears nowhere in the reference bundle

**BUILT 2026-08-30.** Start Rec is `fa-play-circle`, const 89. `fa-record-vinyl` occurs **zero**
times in the 2,891,205-byte bundle — a full-file search, not a slice — so it was invented here, and
the contract test asserts it appears nowhere in our source rather than merely that this one button
stopped using it.

Fixed in the same change as UIM-11 because the two errors were making each other worse: `play-circle`
was on the wrong button, so correcting only this row would have put Start Rec's icon beside Restart
Screens'. Corrected together the column reads desktop+sync / play / stop, and the contract asserts no
two buttons in it share an icon RUN — not that no glyph repeats, because upstream reuses `fa-desktop`
and `fa-stop-circle` on purpose.

**low** · `invented-value` · reference byte **2,064,315**

```
T(18,"i",89),v(19," Start Rec "),u(),d(20,"button",40),x("click",functio
```

**Ours:** ModalHost.svelte:2414 — `<i class="icon fa fa-record-vinyl"></i> Start Rec`. consts[89] = [1,"icon","fa","fa-play-circle"] (read at 2092492). A full-file search of main.d1d09071be31f1ba.js for the literal `fa-record-vinyl` returns -1 — it occurs nowhere in the 2,891,205-byte bundle, so this class name was invented here.

> Verified: The control is built, but the claimed VALUE is not. The button, its " Start Rec " label and the start-recording intent all exist in our source (ModalHost.svelte:2517-2521, with the captured wire counterpart remotePresCommand("startRec") documented at user-action-intent.ts:177), so this is not a missing surface.

### UIM-16 — Header avatar has no `user.pic ||` gravatar fallback, and the follow-chat preview's <strong> loses its fw-bold class

**HALF BUILT 2026-08-30 — which is what the row's own verifier said it should be.** Half 1 (the
gravatar fallback) stays REFUTED and is not reproduced.

Half 2 is built: `<strong class="fw-bold">Username:</strong>` in `FollowChatStylePane.svelte`, from
const 120 = `[1,"fw-bold"]`, bound at `d(35,"div",119)(36,"strong",120),v(37,"Username:")` — byte
2,070,269, and the `d(` there belongs to the div, which is why the assertion reads `(36,"strong",120)`
rather than a plausible `d(36,…` the bundle does not contain.

`fw-bold` on a `<strong>` looks like a tautology and the comment at the code says why it is not:
Bootstrap's `font-weight: 700 !important` beats the browser's `bolder` and survives a stylesheet that
flattens typography, and this preview's whole job is to show a presenter what the real thing will look
like. Every other `<strong>` in that component is bare, so the class is deliberate upstream.

**low** · `wrong-constant` · reference byte **2,095,583**

```
o.user.pic||"https://secure.gravatar.com/avatar/"+o.user.emailHash+"?d=mm&s=80",Mt),m(),O(6,o.user.userXrefID===o.appService.globals.user.u
```

**Ours:** ModalHost.svelte:1896 `gravatarAtSize(targetUser.pic, 80)` rewrites `s=` to 80 on an existing gravatar URL and otherwise returns the input verbatim (:1885-1893) — so an empty `avatarUrl` yields `<img src="">` where the reference builds the gravatar from emailHash. Our own ModalHost:4933 and :4980 do use the `user.pic || https://secure.gravatar.com/avatar/${user.emailHash}?d=mm&s=30` form, so the pattern exists two hundred lines away. Separately, reference consts[120] = [1,"fw-bold"] on the preview's `<strong>` (read at 2070269: `"strong",120),v(37,"Username:")`); ModalHost.svelte:2650 renders a bare `<strong>Username:</strong>`.

> Verified: Composite gap; only the second half survives. HALF 1 (gravatar fallback) is REFUTED — the claim's premise "an empty avatarUrl yields <img src=''>" is false.

---

## PostAlertModal.svelte

14 verified gaps; 61 reference behaviours confirmed present.

### PAM-01 — alertLabels picker: the per-label checkbox @for and processAlertLabels() hash-prefixing are absent, while the badge renderer that consumes the hashes is built

**BUILT 2026-08-30 04:18 UTC.** Both halves. The picker is `zTe` decoded with `app-post-alert-modal`'s own consts table (35 = `[1,"form-check"]`, 52 = the checkbox, 53 = `[3,"for"]`), drawn behind its gate `O(62, alertLabels && alertLabels.length > 0 ? 62 : -1)` between Non-trade and Linked Room Alerts, with the reference's index-based `alert-trade-label-{i}` id and the question mark after the name. The prefixing is `alertLabelPrefix` in `alert-labels.ts`, a transcription of `processAlertLabels` including the DOUBLE space between labels that each entry's own leading and trailing space produces — my first test asserted a single space and was wrong. It reaches all three places a body is composed, because the two upload paths compose after the modal has closed. **One divergence:** the selection lives in the composer's own `SvelteSet` rather than as `checked` on the room's shared parsed table, which is where the reference keeps it — same observable behaviour, one fewer shared mutable. `alert-label-picker-contract.test.ts`.

**high** · `missing-control` · reference byte **2,119,525**

```
function GTe(t,n){1&t&&ht(0,zTe,4,6,"div",35,Yx),2&t&&pt(g().appService.globals.alertLabels)}
```

**Ours:** PostAlertModal.svelte:414-502 renders exactly five footer checkboxes (keepOpenChk, postOnXChk, alert-push-label, alert-non-trade-label, alert-legal-disclosure-label) and no repeat over alertLabels; the id "alert-trade-label-" appears nowhere in apps/room/src. The SETTING is wired (apps/room/src/lib/room/gates.ts:381-383 parses sessData.alertLabels) and CONSUMED for rendering (apps/room/src/lib/components/RoomMessage.svelte:407-408 -> splitAlertLabels), so a presenter can only produce a badge by typing '#hash' by hand. apps/room/src/lib/alert-labels.ts:20-25 documents `checked` as "the selection state of the post-alert composer's label picker … never rendered in the capture we hold", and apps/room/src/lib/direct-evidence-contract.ts:112-118 pins 'alertLabels' as a hiddenCapabilityBranch. The paired behaviour is also absent: processAlertLabels (byte 2,131,232) prefixes ' #'+hash per checked label with ' ' between and '\n' after the last, PREPENDED to txt, then unchecks all; doCloseModal and clearInputFields also unchecked them. apps/room/src/lib/post-alert-behavior.ts:73-107 has no label pass at all.

> Verified: I could not find the alertLabels picker or its hash-prefixing anywhere in apps/room/src. PostAlertModal.svelte's Props interface (lines 14-51) has no alertLabels prop at all, so the component cannot see the configured labels; its footer (lines 413-466) renders exactly five static .form-check blocks (keepOpenChk, postOnXChk, alert-push-lab…

### PAM-02 — sendText checkbox "Text this out?" (gated on sessData.twillioApiSID) is absent

**BLOCKED 2026-08-30 13:54 UTC, and the GATE is the more interesting half.** Upstream renders the checkbox when `sessData.twillioApiSID` is truthy — that is, it decides whether to show a control by looking at **a credential**, and `twillioApiSID` is one of the seven this room's boundary refuses outright (`room-config-boundary.test.ts`). Reproducing the gate is not an option and the correct shape is not in doubt: a server-derived boolean saying *this room can send text messages*, with the credential staying on the controller. What is actually blocked is the thing behind it — **there is no SMS downstream in this deployment**, so the checkbox would set a flag that `schema.ts:259-266` already refuses at the boundary with its reason recorded. What would unblock it: a Twilio integration on the controller and the derived boolean beside it.

**medium** · `missing-control` · reference byte **2,118,228**

```
function VTe(t,n){if(1&t){const e=Y();d(0,"div",35)(1,"input",46),Ve("ngModelChange",function(o){D(e);const s=g();return He(s.sendText,o)||(s.sendText=o),E(o)}),u(),d(2,"label",47),v(3,"Text this out?"),u()()}
```

**Ours:** No checkbox and no `sendText` state in PostAlertModal.svelte (footer block 414-502). The only hits for 'sendText'/'Text this out' in apps/room/src are apps/room/src/lib/direct-evidence-contract.ts:113 (listing it as a hiddenCapabilityBranch) and the refusal docblock at apps/room/src/routes/scheduled-alerts.remote.ts:59-63. The gate expression itself, re-read at byte 2,138,971 as O(59,o.appService.globals.sessData.twillioApiSID?59:-1), cannot be reproduced: `twillioApiSID` is on the never-wire credential list at apps/room/src/lib/setting-coverage-contract.test.ts:221.

> Verified: I could not refute it. The "Text this out?" / sendText checkbox is genuinely not implemented anywhere in apps/room/src, and its absence is deliberate and documented rather than accidental.

### PAM-03 — dontCrossPost checkbox "Don't cross post to linked alert rooms" (gated on sessData.linkedRoomAlerts) is absent

**BLOCKED 2026-08-30 13:54 UTC.** The checkbox suppresses a fan-out that does not exist: `linkedRoomAlerts` — posting one alert into several linked rooms — has no implementation here, which `schema.ts:259-266` already names (*"the cross-post fan-out `linkedRoomAlerts` is itself blocked on"*). A control that turns OFF a behaviour the room does not have is the clearest possible example of a control with no consumer. What would unblock it: the fan-out.

**medium** · `missing-control` · reference byte **2,119,618**

```
function WTe(t,n){if(1&t){const e=Y();d(0,"div",35)(1,"input",54),Ve("ngModelChange",function(o){D(e);const s=g();return He(s.dontCrossPost,o)||(s.dontCrossPost=o),E(o)}),u(),d(2,"label",55),v(3,"Don't cross post to linked alert rooms"),u()()}
```

**Ours:** No checkbox and no `dontCrossPost` state in PostAlertModal.svelte:414-502; the id "alert-dont-cross-post-label" appears nowhere in apps/room/src. The field is documented as deliberately not stored at apps/room/src/lib/server/db/schema.ts:162-165 and refused at the boundary at apps/room/src/routes/scheduled-alerts.remote.ts:59-63. Its gate `linkedRoomAlerts` is on the not-wired settings list at apps/room/src/lib/setting-coverage-contract.test.ts:175. Reference gate re-read at byte 2,139,200: O(63,o.appService.globals.sessData.linkedRoomAlerts?63:-1).

> Verified: I could not refute this. Searched apps/room/src exhaustively for dontCrossPost, dont-cross, crossPost/cross_post/crosspost/cross-post/"Cross Post", the id alert-dont-cross-post-label, alert-cross, linkedRoomAlerts/linkedRoom*/linkedAlert/otherRooms/toLinked, and behavioural synonyms (fanout, fan-out, syndicate, relayAlert, mirrorAlert, pr…

### PAM-04 — The two inline-entry event-bus subscriptions (inlineAlertEntry / inlineAlertEntryImage) have no counterpart, and the toggle that feeds them has no consumer

**ALREADY BUILT — verified by reading 2026-08-30 13:54 UTC, not rebuilt.** Both subscriptions have counterparts and both are cited to the same bytes the row names: `composer.svelte.ts:360` is `inlineAlertEntry` (byte 2,125,143) and `:409` is `inlineAlertEntryImage` (byte 2,125,263), and `AlertChatArea.svelte:260-266,415-454` is the emitter — the inline box's Enter handler and its paste handler, with the reference's own `emit(…)` quoted at each. The row also records one DELIBERATE DIVERGENCE that is already written down at `composer.svelte.ts:370`: upstream's subscription calls the modal's `postAlert()` and so inherits whatever that modal was last left holding, so a presenter who ticked "Don't send to push" an hour ago silently gets it again from a box in a different column. This room posts a plain alert; the modal is where those decisions are made and where they are visible.

**medium** · `missing-behaviour` · reference byte **2,125,143**

```
this.appService.appEventBus.subscribe("inlineAlertEntry",i=>{this.selectedTab="text",this.alertTxt=i,this.postAlert()}),this.appService.appEventBus.subscribe("inlineAlertEntryImage",i=>{this.selectedTab="text",this.alertTxt=i.alertTxt&&i.alertTxt.length>0?i.alertTxt:"",this.onImagePaste(i.event)})
```

**Ours:** `inlineAlertEntry` returns zero hits across apps/room/src. The emitter side exists half-built: apps/room/src/lib/components/AlertChatArea.svelte:517-528 renders the presenter-only checkbox id="inline-alert-entry" / "Show inline alert entry" bound to `alerts.inlineEntry`, whose accessor pair at apps/room/src/lib/room/alerts.svelte.ts:134-140 has no other reader — no inline textarea (#textAreaAlertTxt in the reference, byte 2,047,730) is rendered, so ticking the box changes nothing and PostAlertModal has nothing to receive.

> Verified: I could not refute this. In our source `inlineEntry` has exactly six occurrences repo-wide and every one of them is the toggle itself: the private field + accessor pair in `alerts.svelte.ts` and the `bind:checked` on the presenter-only checkbox in `AlertChatArea.svelte`.

### PAM-05 — "Send Later?" / "Cancel" toggle pair, and the mutual exclusion between "Post Alert" and "Send Later", are absent

**BUILT.** `showSendLater` gates five nodes, and node 71 is the one that mattered: `O(71, showSendLater ? -1 : 71)` **removes Post Alert while the scheduler is open.** This room rendered the whole scheduling pane inline and kept the green button beside it, so a presenter who had just typed a date and a repeat could press Post Alert and send immediately — losing both, with nothing on screen to say so. `send-later-contract.test.ts` holds it, and its first draft is the one that taught this document about `indexOf` returning -1: `expect(branch.indexOf('{:else}')).toBeLessThan(branch.indexOf('Post Alert'))` is satisfied by the marker being GONE.

*(Built 2026-08-30 13:54 UTC with the rest of the PostAlertModal slice; the disposition line was not written at the time and is added on 2026-08-30 16:55 after `room-surface-audit-counts.test.ts` grew a per-surface check and this section came out four rows short of what the code says. The tracker understating progress is the safe direction and is still a defect — a row that reads open is a row somebody re-opens.)*

**low** · `missing-control` · reference byte **2,122,278**

```
function JTe(t,n){if(1&t){const e=Y();d(0,"button",76),x("click",function(){return D(e),E(g().showSendLater=!0)}),T(1,"i",75),v(2," Send Later? "),u()}}function ZTe(t,n){if(1&t){const e=Y();d(0,"button",77),x("click",function(){return D(e),E(g().showSendLater=!1)}),v(1," Cancel "),u()}}
```

**Ours:** apps/room/src/lib/components/PostAlertModal.svelte:487-496 renders <ScheduledAlerts> inline and unconditionally whenever `schedulerAvailable`, with no `showSendLater` state; line 499 always renders the "Post Alert" button. The reference gates, re-read in the update block ending at byte 2,139,400, are O(69,!o.showSendLater&&o.hasAlertScheduler?69:-1), O(70,o.showSendLater?70:-1), O(71,o.showSendLater?-1:71), O(72,o.showSendLater?72:-1) — the scheduler pane REPLACES the post button rather than sitting beside it. There is also no separate "Send Later" submit button; ScheduledAlerts.svelte:160-162 labels it "Schedule alert".

> Verified: I searched apps/room/src exhaustively and could not find the control under any name. `grep -rn "showSendLater" src/` returns 0 hits.

### PAM-07 — Repeat select option TEXT is "Off" / "Daily" / "Weekly" in the reference; ours renders the raw lowercase mode strings

**BUILT.** `Off` / `Daily` / `Weekly` (byte 2,120,818) instead of `{mode || 'off'}` over `REPEAT_MODES`, which rendered the room's own STORAGE format as a label — the shape this repository calls a control describing its implementation rather than its effect. The `aria-label` and the `form-select form-select-sm` classes came with it.

*(Built 2026-08-30 13:54 UTC with the rest of the PostAlertModal slice; the disposition line was not written at the time and is added on 2026-08-30 16:55 after `room-surface-audit-counts.test.ts` grew a per-surface check and this section came out four rows short of what the code says. The tracker understating progress is the safe direction and is still a defect — a row that reads open is a row somebody re-opens.)*

**low** · `wrong-constant` · reference byte **2,120,818**

```
d(14,"select",65),Ve("ngModelChange",function(o){D(e);const s=g();return He(s.repeatScheduledAlert,o)||(s.repeatScheduledAlert=o),E(o)}),d(15,"option",66),v(16,"Off"),u(),d(17,"option",67),v(18,"Daily"),u(),d(19,"option",68),v(20,"Weekly"),u()
```

**Ours:** apps/room/src/lib/components/ScheduledAlerts.svelte:144-148 renders `{mode || 'off'}` over REPEAT_MODES, producing the option labels "off", "daily", "weekly". The select also lacks aria-label="Repeat Scheduled Alert" and the form-select form-select-sm classes (consts row 65, inside the consts table that begins at byte 2,131,663).

> Verified: I could not refute it. Reference verified by reading bytes: at offset 2,121,217 the compiled template renders `"Repeat:"`, `d(14,"select",65)` bound to `repeatScheduledAlert`, then `d(15,"option",66),v(16,"Off"),u(),d(17,"option",67),v(18,"Daily"),u(),d(19,"option",68),v(20,"Weekly")`.

### PAM-08 — Ignore-weekends label text differs: "Ignore weekends?" vs our "Skip weekends"

**BUILT.** `Ignore weekends?` verbatim (byte 2,120,631), with the id and the `form-check mb-2` wrapper. The row's own note that the GATE already matched — `weekendsApply = repeat === 'daily'` against `'daily' === o.repeatScheduledAlert` — held, so this was the label alone.

*(Built 2026-08-30 13:54 UTC with the rest of the PostAlertModal slice; the disposition line was not written at the time and is added on 2026-08-30 16:55 after `room-surface-audit-counts.test.ts` grew a per-surface check and this section came out four rows short of what the code says. The tracker understating progress is the safe direction and is still a defect — a row that reads open is a row somebody re-opens.)*

**low** · `wrong-constant` · reference byte **2,120,631**

```
function YTe(t,n){if(1&t){const e=Y();d(0,"div",69)(1,"input",72),Ve("ngModelChange",function(o){D(e);const s=g(2);return He(s.ignoreWeekends,o)||(s.ignoreWeekends=o),E(o)}),u(),d(2,"label",73),v(3,"Ignore weekends?"),u()()}
```

**Ours:** apps/room/src/lib/components/ScheduledAlerts.svelte:151-156 renders <span>Skip weekends</span> on an unlabelled checkbox with no id="ignoreWeekendsChk" and no "form-check mb-2" wrapper. The GATE matches: `weekendsApply = repeat === 'daily'` (ScheduledAlerts.svelte:79) reproduces the reference's 'daily'===o.repeatScheduledAlert.

> Verified: I could not refute it. The string "Ignore weekends" appears ZERO times anywhere under apps/room/src (case-insensitive grep across .svelte/.ts/.test.ts, plus targeted greps of src/lib/*.ts and src/lib/room/*.ts for a label-text or i18n constant module).

### PAM-09 — The send-later timezone NOTE and the two field labels ("Send on this date & time:", "Repeat:") are absent

**BUILT.** The note, its underlined span and both labels (byte 2,120,860). It is the smallest row of the slice and the one a presenter would most notice missing: a `datetime-local` field always raises *whose* 09:00 this is, the behaviour was already correct — `ScheduledAlerts.svelte` documents that the value is parsed as local time — and the sentence saying so was the only part not on screen.

*(Built 2026-08-30 13:54 UTC with the rest of the PostAlertModal slice; the disposition line was not written at the time and is added on 2026-08-30 16:55 after `room-surface-audit-counts.test.ts` grew a per-surface check and this section came out four rows short of what the code says. The tracker understating progress is the safe direction and is still a defect — a row that reads open is a row somebody re-opens.)*

**low** · `missing-control` · reference byte **2,120,860**

```
d(2,"form")(3,"div",21)(4,"label",59),v(5,"NOTE: All times should be on "),d(6,"span",60),v(7,"your local time zone"),u()(),d(8,"label",61),v(9,"Send on this date & time:"),u()
```

**Ours:** apps/room/src/lib/components/ScheduledAlerts.svelte:136-149 uses bare "Send on" and "Repeat" spans and renders no timezone note and no underlined span. The behaviour the note describes IS honoured — ScheduledAlerts.svelte:46-53 documents that the datetime-local value is parsed as local time — but the sentence that tells the presenter so is not on screen. The <hr> and <form> wrapper of QTe are also absent.

> Verified: I could not find the timezone NOTE or either colon-terminated label anywhere in apps/room/src. Exhaustive grep for the exact strings ("NOTE: All times", "All times should", "Send on this date", "Repeat:") returned zero hits repo-wide; searches for synonyms and concept words (local time zone, local time, timezone, time zone, zone, tz, loca…

### PAM-10 — sendLaterAsEmail / sendLaterAsNick inputs and their "Send as email:" / "Send as Name:" labels are absent (deliberate security refusal)

**MEASURED REFUSAL — confirmed and now reaching a second place, 2026-08-30 13:54 UTC.** The row names it correctly. Two form fields that let a presenter post an alert under **someone else's name and email address** are an identity claim asserted by the client, which is the 2026-08-07 privilege escalation in a different costume; the sender is derived on the server from the session and the two fields are refused at the boundary (`schema.ts:259-266`). What changed today is that the refusal now shapes a SENTENCE as well as a payload: PAM-11's confirm ends at the date, where upstream's ends *"send as: <nick> (<email>) ?"* — quoting values that cannot vary here would imply a choice the presenter does not have.

**low** · `missing-control` · reference byte **2,124,312**

```
this.sendLaterAsEmail=this.appService.globals.user.email,this.sendLaterAsNick=this.appService.globals.user.name
```

**Ours:** No such inputs in ScheduledAlerts.svelte; apps/room/src/routes/scheduled-alerts.remote.ts:63-70 refuses them by name with the reasoning "it is the client naming who an alert is from … the sender is taken from the session, server-side", and scheduleAlertLater uses user.displayName (scheduled-alerts.remote.ts:99-101). Recorded as a divergence rather than a defect: reintroducing the fields would be the 2026-08-07 privilege escalation.

> Verified: Could not refute. The reference genuinely renders both controls — I re-read the bundle and found the compiled template at byte offset 2121637 (NOT 2124312 as the record states; I did not verify that offset and it should be corrected or dropped): label "Send as email:" bound to s.sendLaterAsEmail and label "Send as Name:" bound to s.sendLa…

### PAM-11 — postAlertLater's confirm and success dialogs are absent

**BUILT 2026-08-30 13:54 UTC, minus the identity clause.** Scheduling happened on one click. **The DATE is the reason for the question:** a `datetime-local` with a typo in it — a month, a year, an AM for a PM — schedules an alert to the entire room at a time nobody meant, and the only way to notice was to open the manage table afterwards and read it back. The confirm quotes the date in prose, which is where a wrong one is visible, and `Alert scheduled OK.` follows verbatim. `onalert` and `onconfirm` are passed in rather than owned: two components raising bootboxes from different places is how one replaces the other mid-read, which `dialogs.svelte.ts` records at length. The `send as:` clause is dropped for PAM-10's reason.

**low** · `missing-behaviour` · reference byte **2,130,310**

```
bootbox.confirm("Send this alert on: "+o.toString()+". send as: "+this.sendLaterAsNick+" ("+this.sendLaterAsEmail+") ?"
```

**Ours:** apps/room/src/lib/components/ScheduledAlerts.svelte:90-118 schedules with no confirmation step and reports only failures (`problem`, line 114); there is no "Alert scheduled OK." acknowledgement (reference byte 2,130,970). The past-date refusal IS present, moved server-side: apps/room/src/routes/scheduled-alerts.remote.ts:110 errors 400 with the reference's own sentence "Please select a date in the future." (reference byte 2,130,241).

> Verified: I could not refute this. The reference's `postAlertLater()` has a four-branch shape: (1) past date -> bootbox.alert("Please select a date in the future"), (2) no text/url -> bootbox.alert("Please enter some alert text..."), (3) otherwise bootbox.confirm("Send this alert on: "+o.toString()+".

### PAM-12 — onImagePaste selects the LAST image clipboard item in the reference (no break); ours selects the first

**ALREADY BUILT — verified by reading 2026-08-30 13:54 UTC, not rebuilt.** `pastedImageFrom` in `#lib/pasted-image.ts` keeps the LAST image item and its docblock says why in the reference's own terms — *"the reference's loop has no break, so the LAST image item wins… `PostAlertModal` picked a different one, silently, and nothing could have noticed"*. It also records the second drift in the same eight lines, which the row does not mention: an item whose `getAsFile()` answers null used to abandon the entire paste rather than being skipped, so one unreadable representation could throw away a real screenshot sitting behind it. The row describes a revision this module has moved past.

**low** · `divergence` · reference byte **2,125,403**

```
onImagePaste(e){const i=this,o=(e.clipboardData||e.originalEvent.clipboardData).items;let s=null;for(const r of o)0===r.type.indexOf("image")&&(s=r.getAsFile());if(s){const r=URL.createObjectURL(s);
```

**Ours:** apps/room/src/lib/components/PostAlertModal.svelte:140-148 breaks on the FIRST item whose type startsWith('image') and returns. The reference enumeration I was given states "takes the first item" — the loop has no break, so it takes the LAST. Everything else in the paste path matches: the bootbox confirm markup (PostAlertModal.svelte:512-519) and the composed body at apps/room/src/lib/post-alert-behavior.ts:120-128 (`alertText ? alertText+"\n"+url : url`, then disclosure) against byte 2,126,900's txt:""!==s.alertTxt&&s.alertTxt.length>0?s.alertTxt+"\n"+F:F.

> Verified: The reference's onImagePaste loops over all clipboard items with no break and reassigns unconditionally, so it keeps the LAST image item. Our PostAlertModal.selectPastedImage returns on the FIRST item whose type startsWith('image'), so it keeps the first.

### PAM-13 — img tab with no URL: the reference dispatches an upload whenever the module-level fc array EXISTS (even when empty); ours requires at least one file

**DELIBERATE DIVERGENCE — recorded 2026-08-30 13:54 UTC.** `return fc ? void this.doImagurFileListUpload(e) : void 0` tests whether a module-level array EXISTS, not whether it holds anything — so an empty file list dispatches an upload of nothing, which either no-ops in the uploader or posts an alert with no image and no URL. Reproducing that means reproducing a bug whose only outcomes are a wasted request or an empty alert. Ours requires at least one file, which is the same behaviour for every case a presenter can actually reach and differs only where the reference misfires.

**low** · `divergence` · reference byte **2,128,708**

```
if("img"===this.selectedTab){if(this.imageAlertTxt&&(e.txt=this.imageAlertTxt+"\n"),!this.alertUrl)return fc?void this.doImagurFileListUpload(e):void 0;e.txt+=this.alertUrl+" "}
```

**Ours:** apps/room/src/lib/post-alert-behavior.ts:91-95 returns {status:'upload'} only when draft.fileCount > 0, otherwise {status:'noop', reason:'empty-media'}. `fc` is undefined before the first selection and [] after fc.splice(0,o) (byte 2,125,960), so the reference's second-and-later empty press runs a zero-file upload loop and sends nothing while ours no-ops. Equivalent on screen; recorded because it is a real branch difference.

> Verified: I could not refute this one. Our media-tab empty-press path is implemented in exactly one place and it gates on file COUNT, not on the existence of a file list: `composePostAlert` (src/lib/post-alert-behavior.ts:88-98) returns `{status:'upload'}` only when `draft.fileCount > 0` and otherwise `{status:'noop', reason:'empty-media'}`, and th…

### PAM-14 — Element ids and name attributes added on the six text inputs/textareas that the reference leaves unnamed

**DELIBERATE DIVERGENCE — recorded 2026-08-30 13:54 UTC, and the reference is not consistent about this either.** The ids and `name` attributes are OURS and they are what make `<label for>` and `aria-labelledby` work: a text input with no accessible name is unreachable by a screen reader, and this repository adds them for the same reason it gives the captured trade span a `role` and a keydown. **The reference names some of its own** — const 62 is `["type","datetime-local","id","alert-send-later-time","name","alert-send-later-time",…]`, so the send-later input carries both — which makes this a difference in consistency rather than in kind. Nothing about them is visible to a member, and none is read by any selector in the captured stylesheets.

**low** · `divergence` · reference byte **2,131,663**

```
["rows","10","placeholder","Alert Text...","aria-label","Alert Text...",1,"form-control",3,"ngModelChange","paste","ngModel"]
```

**Ours:** PostAlertModal.svelte:291-292 (alert-text-body/alertTextBody), 315-316 (alert-url/alertUrl), 327-328 (alert-url-text/alertUrlText), 350-351 (alert-media-url/alertMediaUrl), 403-404 (alert-media-text/alertMediaText), 470-471 (alert-legal-disclosure-text/legalDisclosureText). I searched the bundle for each literal and every one returned -1: the reference consts rows carry rows/placeholder/aria-label/class only. Ours are additions, not a mismatch of a reference value.

> Verified: I could not refute it; both halves of the claim verify. Our six controls carry id+name at exactly the cited lines, and the reference's app-post-alert-modal consts array — which I read in full, not sampled — carries neither on any of the six.

### PAM-17 — The alertMsg payload's sendTxt / sendEmail / sendTweet / dontCrossPost / dontPush fields are refused by our server rather than sent

**MEASURED REFUSAL — already recorded, verified 2026-08-30 13:54 UTC.** `schema.ts:259-266` carries it in full: every one of those fields is *"an instruction to a downstream this deployment does not have — SMS, the mailer's alert path, Twitter, and the cross-post fan-out `linkedRoomAlerts` is itself blocked on. Storing a flag no consumer reads is the thing this repository refuses by name, so they are refused at the boundary and the refusal is recorded rather than the column being created empty."* PAM-02 and PAM-03 are the two CONTROLS for two of these flags and are blocked on the same absences; this row is the payload half of the same fact. Nothing was added; the row is closed against the record that already existed.

**low** · `divergence` · reference byte **2,128,708**

```
postAlert(){let e={txt:this.alertTxt,n:this.appService.globals.user.name,sendTxt:this.sendText,sendEmail:this.sendEmail,sendTweet:this.sendTweet,dontPush:this.dontPush,nonTradeAlert:this.nonTradeAlert,dontCrossPost:this.dontCrossPost};
```

**Ours:** apps/room/src/routes/post-alert.remote.ts:46-56 accepts a z.strictObject of {kind, body, targetUrl, nonTradeAlert} only; `dontPush` is computed by the composer and explicitly dropped at apps/room/src/lib/room/composer.svelte.ts:480-483 with the reasoning that accepting a field nothing reads implies something does; `n` (the sender name) is taken from the session server-side rather than from the client. The dontPush CHECKBOX is present (PostAlertModal.svelte:437-446) — only its downstream is absent.

> Verified: I could not refute it: the claim's statement about our source is accurate in every particular, and I found no implementation under any other name. What I DID establish is that this is a recorded, test-enforced boundary decision rather than an oversight, and that four of the five fields carry no reachable behaviour in the reference either…

---

## ModalHost: report / advanced-search modal

12 verified gaps; 49 reference behaviours confirmed present.

### RPT-01 — Report modal never fetches a report — no getAlertReport call, no resp.queue, no error state

**MEASURED REFUSAL 2026-08-30. One measurement decides this row and five others** — RPT-03 through
RPT-07 — so it is written once, in full, at `AlertSendReportModal.svelte`, and each of those rows
points here.

Every field the reference's report holds (`status`, `name`, `email`, `sentTime`, `latency`,
`failReason`, `token`) is a fact about one attempt to deliver one alert to one person. **This product
records no such attempt, anywhere:**

* **No table.** 24 tables across `services/api/migrations/**` — alert_media, alert_questions, alerts,
  audit_log, enterprises, files, follows, invite_tokens, member_notes, message_reactions, messages,
  mutes, note_versions, notes, poll_responses, polls, private_messages, refresh_tokens, room_channels,
  room_members, room_state, rooms, users. Searched for `queue`, `latency`, `fail_reason`, `sent_time`,
  `delivery`: the only hits are `alerts.dispatch` and two prose lines in a migration comment.
* **`alerts.dispatch` is the REQUEST, not the outcome** — a jsonb object constrained to exactly five
  booleans (sms, email, twitter, push, crossPost) recording which channels the presenter ticked. No
  recipient, no status, no timestamp behind it.
* **Nothing sends an alert to anyone.** `apps/room/src/lib/server` has no mail transport at all; the
  product's only one is the controller's `mail.ts`, whose two callers are `email-verification.ts` and
  `member-email.ts` (welcome + webinar reminder), and whose own header records that as of that commit
  nothing can be sent because there is no provider account.
* **`getAlertReport` has no server half** — zero occurrences across `apps/`, and no endpoint under
  `src/routes/api`.

So the queue this modal is a view onto does not exist, is not written, and has no producer. Building
the fetch would be a request to nothing.

**The refusal is gated rather than asserted.** `alert-report-modal-contract.test.ts` reads every
migration and fails if a delivery record appears — by the COLUMNS one must hold, not by a table name
somebody might not reuse. If that goes red, these six rows are live again, which is the intended
behaviour: a refusal whose premise has expired is worse than an unbuilt feature, because it looks
decided.

**What would close it:** a table of delivery attempts per alert per recipient, something that writes
to it when `alerts.dispatch` fans out, and a presenter-only read.

**high** · `missing-behaviour` · reference byte **2,413,317**

```
showTokenReport(e){bootbox.alert({title:"Token",message:e})}loadReports(){var e=this;I(function*(){try{console.log("this.alertID: ",e.alertID);let i=yield e.appService.invokeAdminCmd("getAlertReport",{alertID:e.alertID});console.log("resp: ",i),e.reports=i?.queue,e.loading=!1,e.reports&&e.reports.length>0&&e.calcPieData(e.reports)}catch{e.loadingError="There was an error loading the report."}})()
```

**Ours:** ModalHost.svelte:1955-1961 is the whole of our 'load': `if (name !== 'report') return; reportLoading = true; setTimeout(() => reportLoading = false, 500)`. No request is made, `reports` does not exist as state, and there is no `loadingError` anywhere. grep over apps/room/src for getAlertReport / invokeAdminCmd("getAlertReport") / 'There was an error loading the report.' returns zero hits.

> Verified: Our report modal has no fetch of any kind — only a cosmetic 500 ms timer. `apps/room/src/lib/components/ModalHost.svelte:2095-2102` is the entire "load": `$effect(() => { if (name !== 'report') return; reportLoading = true; const timer = window.setTimeout(() => { reportLoading = false; }, 500); return () => window.clearTimeout(timer); });…

### RPT-02 — reportLoading is driven by a hard-coded 500 ms timer that describes no work

**FIXED 2026-08-30.** The effect and `reportLoading` are gone. It was:

```js
$effect(() => {
  if (name !== 'report') return;
  reportLoading = true;
  const timer = window.setTimeout(() => { reportLoading = false; }, 500);
  return () => window.clearTimeout(timer);
});
```

Five hundred milliseconds of spinner in front of nothing, then the literal `No Reports.`, for every
alert in every room. A spinner is a PROMISE that something is being fetched; this one promised a fetch
that did not exist and then reported an empty result as though it were an answer — so a presenter read
`No Reports.` under a heading carrying a real AlertID and concluded the alert had reached nobody.

The modal now says what is missing (`REPORT_UNAVAILABLE`, ours and marked as ours, sibling to
`SYNC_ROOMS_UNAVAILABLE` for the identical situation). Deliberately NOT the reference's `No Reports.`
— that is upstream's `AMe` and means "the fetch returned an empty queue", which is the same lie told
as a sentence instead of as an animation.

**high** · `invented-value` · reference byte **2,412,261**

```
this.appService.guiEventBus.subscribe("doAlertSendReportModal",e=>{this.alertID=e,this.loading=!0,this.loadingError="",this.clearInput(),this.loadReports()})
```

**Ours:** ModalHost.svelte:715 `let reportLoading = $state(true)` and ModalHost.svelte:1955-1961 flip it false after `window.setTimeout(..., 500)`. The 500 is not in the reference and corresponds to nothing; the spinner is a decoration in front of a permanently empty list, and the modal always settles on the hard-coded 'No Reports.' at ModalHost.svelte:5139.

> Verified: Could not refute. Our report modal has no data source at all: `getAlertReport` returns zero hits across the whole apps/ tree, there is no `reports` array, no fetch, and no report endpoint under src/routes/api.

### RPT-03 — Report rows (list-group, per-status colours, name/email, sent time + latency, failure reason, token click) are entirely absent

**MEASURED REFUSAL 2026-08-30 — see RPT-01 for the measurement.** `xMe` was read in full (it begins
at **2,410,233**; the row cites 2,410,281, inside the click handler): the row's ngClass maps
`sent`/`failed`/`queued` to `text-success`/`text-danger`/`text-warning`, and it renders
`{name}&nbsp;`, `({email})`, a `.sent-time` block with `{sentTime|date:'medium'}` and
`Latency: {latency} secs`, and a `.failed-reason`. Seven fields, every one of them a property of a
delivery attempt this product does not record.

The captured CSS at `captured-runtime-components.css:5747-5805` stays unconsumed, and that is the
honest state rather than a reason to build markup for it — the stylesheet is a capture, not a
requirement. `alert-report-modal-contract.test.ts` asserts none of `list-group-item`, `sent-time` or
`failed-reason` is drawn over a list that cannot exist.

**high** · `missing-control` · reference byte **2,410,281**

```
function xMe(t,n){if(1&t){const e=Y();d(0,"div",30)(1,"div",31),x("click",function(){const o=D(e).$implicit;return E(g(3).showTokenReport(o.token))}),d(2,"strong",32),v(3),u(),d(4,"i"),v(5),u(),H(6,EMe,7,5,"div",33)(7,kMe,3,1,"div",34),u()()}if(2&t){const e=n.$implicit;z("ngClass",$a(5,FMe,"sent"===e.status,"failed"===e.status,"queued"===e.status)),m(3),Ne("",e.name,"\xa0"),m(2),Ne("(",e.email,")")
```

**Ours:** ModalHost.svelte:5125-5147 renders only: title, spinner, `<div class="mt-3 text-center">No Reports.</div>`, footer Close. No `.list-group`, no `.list-group-item`, no `text-success`/`text-danger`/`text-warning` mapping, no `.sent-time` / 'Latency: N secs' (reference literal at offset 2409857), no `.failed-reason`. The captured CSS for all of these IS present at src/lib/styles/captured-runtime-components.css:5747-5805 with no markup consuming it.

> Verified: The report modal in our source is a stub: ModalHost.svelte:5334-5356 renders only the title, a spinner driven by a cosmetic 500ms timer (ModalHost.svelte:736 `let reportLoading = $state(true)` and the $effect at ModalHost.svelte:2095-2102, which has no fetch behind it), the literal `<div class="mt-3 text-center">No Reports.</div>`, and a…

### RPT-04 — Report search box, clear addon, search addon and the searchReports pipe are absent

**MEASURED REFUSAL 2026-08-30 — see RPT-01.** The pipe was decoded: `searchReports` (registered at
2,409,220) filters `status === searchStatus` and then `email.toLowerCase().includes(searchTxt)`. Both
predicates are over fields of a delivery record. A search box, a clear addon and a search addon over
an array that is empty by construction is three controls whose only effect is their own presence —
refused by name in `CLAUDE.md` and by DPE rule 3.

**medium** · `missing-control` · reference byte **2,409,220**

```
ɵpipe=Rn({name:"searchReports",type:t,pure:!0})
```

**Ours:** No search UI at all in ModalHost.svelte:5125-5147. grep over apps/room/src for searchReports / search-term / clear-search-addon / search-addon / inputTxt / searchTxt returns zero hits for this modal. Reference pipe body (offset 2409241): status equality filter then `s.email.toLowerCase().includes(searchTxt)`; handlers `searchReports()` / `onInputChange()` at offset 2412183 and `clearInput()` at 2412406.

> Verified: Our alert-send-report modal has no search apparatus of any kind, under any name. ModalHost.svelte:5334-5356 is the complete modal: a spinner branch and a literal "No Reports." branch, with no input, no clear addon, no search addon and no status select.

### RPT-05 — Report status <select> (All / Sent / Queued / Failed) and onSelectChange are absent

**MEASURED REFUSAL 2026-08-30 — see RPT-01.** Consts 18-21 at 2,414,516 are the four options — All,
sent, queued, failed — and `onSelectChange` writes `searchStatus`, which only the `searchReports` pipe
reads. A status filter over a list with no statuses in it filters nothing. The shipped rule
`#search-select-addon{padding:0;border:0;margin:0}` stays unconsumed for the same reason RPT-03's CSS
does.

**medium** · `missing-control` · reference byte **2,414,516**

```
["id","search-select-addon",1,"input-group-text"],["aria-label","Search select",1,"form-select",3,"change"],["selected","","value",""],["value","sent"],["value","queued"],["value","failed"]
```

**Ours:** Absent from ModalHost.svelte:5125-5147; `searchStatus` / `onSelectChange` / the strings 'Queued' and 'Search select' appear nowhere in apps/room/src for this modal. The captured rule `#search-select-addon{padding:0;border:0;margin:0}` is nevertheless shipped at src/lib/styles/captured-runtime-components.css:5779.

> Verified: I could not disprove the claim. Our `app-alert-send-report-modal` (apps/room/src/lib/components/ModalHost.svelte:5334-5356) renders ONLY a loading spinner and the literal fallback `<div class="mt-3 text-center">No Reports.</div>`; there is no `<select>`, no input-group, no report body at all.

### RPT-06 — Pie chart (calcPieData + flot #pie-container) is absent

**MEASURED REFUSAL 2026-08-30 — see RPT-01, plus one reason of its own.** `calcPieData` at 2,412,738
counts sent/failed/queued, turns each into a percentage of `reports.length`, and hands the result to
`$.plot("#pie-container", …)` — **jQuery flot**. Two blockers, not one: there is no data to divide,
and this room loads neither jQuery nor flot and should not start for a chart. `PollPanel`'s own
`drawPieChart` is the shape a pie would take here if the data ever existed.

**medium** · `missing-behaviour` · reference byte **2,412,738**

```
(const c of a)"sent"===c&&r.push({data:Number(i/l*100),label:c,color:"#00bc8c"}),"failed"===c&&r.push({data:Number(o/l*100),label:c,color:"#E74C3C"}),"queued"===c&&r.push({data:Number(s/l*100),label:c,color:"#ffc107"});setTimeout(()=>{$.plot("#pie-container",r,{series:{pie:{show:!0,radius:1,tilt:.5,label:{show:!0,radius:1,formatter:
```

**Ours:** No `#pie-container` element and no percentage computation in ModalHost.svelte. The only pie in apps/room/src is PollPanel.svelte:411 `drawPieChart` for polls (`#pollPieChart`), which is a different surface. The captured `#pie-container{left:0;top:0;width:600px;height:192px;margin-bottom:8px}` is shipped at src/lib/styles/captured-runtime-components.css:5800 with nothing to paint into it.

> Verified: I could not refute this. Our alert-send-report modal is a stub with no data path at all, let alone a pie: apps/room/src/lib/components/ModalHost.svelte:5334-5356 renders `<app-alert-send-report-modal>` whose whole body is `{#if reportLoading}` a spinner `{:else}` the literal text `No Reports.`, and the only thing that drives it is a fake…

### RPT-07 — showTokenReport() — clicking a report row opens a bootbox titled 'Token'

**MEASURED REFUSAL 2026-08-30 — see RPT-01.** `showTokenReport(e){bootbox.alert({title:"Token",
message:e})}` at 2,413,317 is one line and `BootboxDialog` is not the blocker, as the row correctly
says. What is missing is the `token` — a per-delivery value on a row that does not exist, reached only
by clicking a row that is not drawn. The dialog is trivial; its subject is the refusal.

**medium** · `missing-control` · reference byte **2,413,317**

```
showTokenReport(e){bootbox.alert({title:"Token",message:e})}
```

**Ours:** No rows exist to click (see RPT-03), and grep over apps/room/src for showTokenReport / title: 'Token' returns zero hits. Our BootboxDialog primitive exists and is used elsewhere in ModalHost (e.g. the syncRooms confirm at ModalHost.svelte:5480-5495), so the primitive is not the blocker.

> Verified: Not built, and not built under another name. The reference handler is confirmed by direct read: at byte offset 2413317 of main.d1d09071be31f1ba.js the bundle reads `showTokenReport(e){bootbox.alert({title:"Token",message:e})}`, immediately followed by `loadReports()` which calls `invokeAdminCmd("getAlertReport",{alertID:e.alertID})`; its…

### SRCH-01 — Advanced-search results render as bare <p>{body}</p> instead of the full message row, so trade highlighting and click-to-copy are lost inside this modal

**BUILT 2026-08-30 04:05 UTC.** The results render `RoomMessage` with `kind="alert"` and the room's message chrome, as the reference renders `app-st-message` (byte 2,421,116) — sender, timestamp, day separator computed from the previous row (`prevD`), alert-label badges, trade highlighting and click-to-copy. `searchAlertLog` already selected every field, so nothing is fetched again. **One recorded divergence:** `showMenu={false}`. Upstream's row carries its full kebab; this room has no route from the modal to the message-action command (`ModalHost` is handed `onQaAction` and nothing else), so a full menu would be twelve entries that cannot act. `copyTradeOnClick` — the one binding the reference adds on top of the component, and the behaviour this row says was lost — IS wired, and the handler refuses every other action so a later change fails closed. `search-results-render-contract.test.ts`.

**medium** · `divergence` · reference byte **2,421,116**

```
function iAe(t,n){if(1&t){const e=Y();d(0,"app-st-message",46),x("click",function(o){const s=D(e).$implicit;return E(g(3).copyTradeOnClick(o,"id_"+s._id))}),u()}if(2&t){const e=n.$implicit,i=n.$index,o=g(3);z("msg",e)("logType","alerts")("prevD",i>0?o.msgs[i-1].t:0)("sessName",(null==e?null:e.sessName)||null)}}
```

**Ours:** ModalHost.svelte:5449-5453 renders `<div class="log-messages">{#each advancedSearchResults as result (result.id)}<p>{result.body}</p>{/each}</div>`. The reference also rewrites `[{(`/`)}]` into `<span class="tradeColor" id="id_<_id>">` inside this component's success handler (offset 2424330) and binds copyTradeOnClick per row (implementation at offset 1415143). We DO implement that rewrite and the copy for the main chat (copy-trades.ts:56-110, RoomMessage.svelte:523-534, message-actions.svelte.ts:496-510) — it is simply not reached from the search results, which are plain text with no sender, no timestamp, no prevD day separator and no sessName. CompactMessageRow.svelte is already imported in this same file (ModalHost.svelte:2, used at 5190).

> Verified: I could not refute it. Our advanced-search results really do render as bare escaped text: ModalHost.svelte:5658-5662 is `<div class="log-messages">{#each advancedSearchResults as result (result.id)}<p>{result.body}</p>{/each}</div>`, with no `{@html}` anywhere in ModalHost.svelte (0 hits), so no trade-marker rewrite could survive even if…

### SRCH-02 — A failed search shows no message — the reference raises bootbox.alert(msg); ours has no catch at all

**BUILT 2026-08-30.** `runAdvancedSearch()` has a `catch` that raises the reference's own copy —
*"There was an error searching for alerts, please try again or contact support"*, read at byte
1,150,520 inside `getAlertsAdvancedSearch`'s `.catch`, which emits `getAlertsAdvancedSearchFailed`;
the modal's subscriber at 2,424,060 answers it with `{ this.msgs = [], this.loading = !1,
bootbox.alert(i.msg) }`. All three halves are reproduced: the rows are already `[]` from the top of
the function, `finally` stops the spinner, and `onAlert` is the `BootboxDialog` this component already
uses everywhere else.

The defect was that a failed search and an empty one were the same screen — both fell through to
*"No logs to display. Please, change the input fields."* Those two states give opposite advice, and a
presenter told to widen a range that ran perfectly will widen it, get the same words, and conclude the
log is empty. The truncation flag is cleared in the same branch so a failure cannot inherit the last
search's footnote.

**medium** · `missing-behaviour` · reference byte **2,424,060**

```
this.appService.appEventBus.subscribe("getAlertsAdvancedSearchFailed",i=>{this.msgs=[],this.loading=!1,bootbox.alert(i.msg)})
```

**Ours:** ModalHost.svelte:552-570 `runAdvancedSearch()` wraps the query in `try { … } finally { advancedSearchLoading = false }` with NO catch, so a refused or failed `searchAlerts()` rejects out of the click handler and the modal falls through to the empty state 'No logs to display. Please, change the input fields.' (ModalHost.svelte:5455-5457) — the same thing it shows for a search that legitimately matched nothing. The reference's failure copy 'There was an error searching for alerts, please try again or contact support' (offset 1150222) appears nowhere in apps/room/src.

> Verified: I could not find any failure handling for the advanced alert search in apps/room/src. `runAdvancedSearch()` in ModalHost.svelte:573-591 wraps the `searchAlerts()` call in `try { … } finally { advancedSearchLoading = false }` with no `catch` — the only failure behaviour is clearing the spinner (the comment at :588 says exactly that and not…

### SRCH-03 — Room dropdown is a single hard-coded room; no userSessions localStorage, no getAllSTRoomsForUser, and rooms are never sent

**HALF BUILT 2026-08-30 — the divergence stays, the INVENTION is gone.** The row is two claims and
they have different answers.

**Multi-room: DELIBERATE DIVERGENCE, unchanged.** `ZMe` (which begins at **2,420,490**; the row cites
2,420,598, inside the click handler) iterates `{key, value}` pairs through `toggleSess(o.key,
o.value)`, seeded from `localstorage.getObject("userSessions")` and `getAllSTRoomsForUser()`. This
application is one room per deployment: no rooms endpoint, no such key, and `syncRooms()` already
answers with `SYNC_ROOMS_UNAVAILABLE`. An `{#each}` over a one-element list would be the same markup
wearing a loop.

**The key and the label: INVENTED, and now real.** They were the literals `'mastering-the-trade'` and
`'Mastering The Trade'`, hard-coded. Neither string occurs anywhere in the 2,891,205-byte bundle —
full-file search, and the contract test asserts it — so the one entry in this dropdown could be
ticked, could appear in `selectedRoomsStr`, and identified nothing. It is `room.shortCode` /
`room.name` now, from `data.room`: what the controller says this room IS, the same pair
`+page.server.ts` puts on the page load. That is the honest single-room reading of
`toggleSess(o.key, o.value)` — the directory has one entry, and this is it.

**medium** · `divergence` · reference byte **2,423,600**

```
ngOnInit(){this.clearInput();const e=this.appService.localstorage.getObject("userSessions");e&&Object.keys(e).length>0?(console.log("getUserSessions: ",e),this.userSessions=e):(console.log("getUserSessions getAllSTRoomsForUser(): "),this.appService.getAllSTRoomsForUser()),this.appService.appEventBus.subscribe("getAllSTRoomsForUserSuccess",i=>{this.userSessions=i.userSessions,this.appService.localstorage.setObject("userSessions",this.userSessions)})
```

**Ours:** ModalHost.svelte:5326-5348 iterates nothing — it renders one literal `<li>` toggling `'mastering-the-trade' / 'Mastering The Trade'`. There is no `userSessions` state, no localStorage key, and no rooms endpoint (grep for userSessions / getAllSTRoomsForUser in apps/room/src hits only the explanatory comments at ModalHost.svelte:585,591). syncRooms() confirms with the captured text (SYNC_ROOMS_CONFIRM, alerts-advanced-search.ts:199) and then shows our own SYNC_ROOMS_UNAVAILABLE notice (ModalHost.svelte:593-596). Deliberate and documented for a single-room app, but the hard-coded room name/key is invented — it is not in the bundle.

> Verified: Not implemented anywhere in apps/room/src. The room dropdown at ModalHost.svelte:5538-5560 is a single hard-coded <li> calling toggleKey(advancedSearch.rooms,'mastering-the-trade','Mastering The Trade') with no {#each} and no data source; the reference compiles the same control as an iteration over {key,value} pairs (ZMe -> toggleSess(o.k…

### RPT-08 — Entry-point guard: a message with no id must raise bootbox 'No reports found.' instead of opening the modal

**BUILT 2026-08-30.** Closed later the same day by moving the guard to the entry point; what
follows describes both stages, because the half-built stage is why the string sits where it does.
The reference's own string is carried, verbatim:
`openAlertSendReport(e){e?…:bootbox.alert("No reports found.")}` at **1,349,819** (the row cites
1,349,868, which is mid-method; its own verifier had it right). `AlertSendReportModal.svelte` renders
it on the `{:else}` of `{#if targetMessage?.id}`, so an id-less report no longer opens a heading
reading `Alert Sent Report. AlertID: ` — a real title with an empty identifier, which reads as a report
about nothing rather than as a refusal.

**The guard's POSITION was the other half, and it is built now.** Upstream refuses at the entry point
and the modal is never constructed. `RoomMessageActions` is the ONE opener — this file holds the only
call to `#openModal('report')`, and `ModalHost.svelte:5878` renders the modal on `name === 'report'`
— so `if (item.id) this.#openModal('report'); else this.#dialogs.alert = NO_REPORTS_FOUND;` there is
the whole guard. `MessageMenu.svelte:220` was never the layer for it; it holds no dialog.

Two consequences worth stating, because both are the kind of thing that gets undone later:

* **The component's `{:else}` was DELETED, not left.** With the entry point refusing, an id-less
  message cannot construct the modal, so that branch became unreachable — and an unreachable branch
  is what this repository forbids by name. It would also have quietly become the answer again if
  anyone removed the guard, which is exactly the silent regression a second answer buys you.
* **The string moved to `lib/message-behavior.ts`**, where the reference's other message-menu
  transcriptions are pinned, rather than travelling to the dispatcher that now uses it. A captured
  string with one consumer still belongs with its siblings.

Both halves are asserted in `alert-report-modal-contract.test.ts`, and each was seen red on its own
mutation: removing the guard fails the entry-point assertion, and restoring the `{:else}` fails the
no-second-answer one.

**low** · `missing-behaviour` · reference byte **1,349,868**

```
openAlertSendReport(e){e?this.appService.guiEventBus.emit("doAlertSendReportModal",e):bootbox.alert("No reports found.")}
```

**Ours:** MessageMenu.svelte:220-231 always calls `onaction('report')` with no id check; message-actions.svelte.ts:380 `if (action === 'report') this.#openModal('report')` likewise. ModalHost.svelte:5130 then titles the dialog `Alert Sent Report. AlertID: ${targetMessage?.id ?? ''}` — an empty AlertID rather than the reference's refusal dialog. The string 'No reports found.' does not appear in apps/room/src.

> Verified: The reference's entry-point refusal is genuinely absent from our source. Reference, bytes read at observed offset 1349819 of main.d1d09071be31f1ba.js: `openAlertSendReport(e){e?this.appService.guiEventBus.emit("doAlertSendReportModal",e):bootbox.alert("No reports found.")}` — the modal opens only when the message argument is truthy, other…

### SRCH-05 — advancedSearchTruncated / 'Showing the newest 500 matches' has no reference counterpart

**DELIBERATE DIVERGENCE — kept, and now gated.** Re-measured rather than re-asserted: the substring
`truncated` occurs **exactly once** in the whole bundle, at 1,643,312, inside hls.js ("last AAC PES
packet truncated…"). The reference's success handler reads only `i.alerts`. This is ours.

Kept because a silent cap is the worse failure: 500 results with no note reads as "that is all there
is". `alert-report-modal-contract.test.ts` now asserts the full-file count AND the rendered notice, so
the divergence cannot be tidied away for symmetry with the reference — which is the only way a
deliberate divergence is actually lost.

**The first version of that assertion was too weak and its negative control caught it**, which is
worth recording here because it is the same lesson the register's preface teaches: it checked for the
SYMBOLS `advancedSearchTruncated` and `ALERT_SEARCH_LIMIT`, which occur seven times between them
across a declaration, three resets and an assignment — so deleting the notice left it green. It reads
the markup now.

**low** · `divergence` · reference byte **2,424,205**

```
this.appService.appEventBus.subscribe("getAlertsAdvancedSearchSuccess",i=>{console.log("getAlertsAdvancedSearchSuccess got data: ",i),i&&(this.msgs=i.alerts,
```

**Ours:** ModalHost.svelte:479, 555, 565, 5443-5448 add a truncation flag and a 'Showing the newest {ALERT_SEARCH_LIMIT} matches' line (ALERT_SEARCH_LIMIT = 500, alert-search-limit.ts:13). I re-ran the search myself: the substring 'truncated' occurs exactly ONCE in the whole 2,891,205-byte bundle, at offset 1643312, inside hls.js ('last AAC PES packet truncated,might overlap between fragments'). The success handler reads only `i.alerts`. This is our addition and the comment at ModalHost.svelte:5437-5442 says so; keeping it is defensible (a silent cap is the worse failure), but it is a divergence from the reference and belongs on the record.

> Verified: Could not refute — but note the KIND: this is a divergence (something extra in OURS), not missing work, so nothing needs building. Both halves check out.

---

## RoomSidebar.svelte

12 verified gaps; 52 reference behaviours confirmed present.

### RS-01 — Roster row: the presenter-only "Trial" badge is not rendered, though the data to render it is already on the wire

**BUILT 2026-08-30 13:32 UTC.** `O(7, isPresenter && e.isFT ? 7 : -1)` on const 9. `isFT` was already on the wire and already read by two other gates, so the chip was the one thing missing — and it is the one distinction the roster is actually used to make: a presenter scanning the list could not tell a trial from a paying member.

**medium** · `missing-behaviour` · reference byte **2,034,640**

```
O(1,i.showUserAvatar(e.isP)?1:-1),m(4),Ze(e.nick),m(),O(6,e.data.badges?6:-1),m(),O(7,i.appService.globals.isPresenter&&e.isFT?7:-1),m(),O(8,i.appService.globals.sessData.isNewIndi
```

**Ours:** RoomSidebar.svelte:687-696 renders .media-body > .nickName with the name span, an empty badges div and the kebab, and nothing else. `trial-badge` occurs nowhere in the roster path — grep over apps/room/src finds it only in /home/user/trading-room-app/apps/room/src/lib/components/RoomMessage.svelte (the chat row). The CSS is present and unused at /home/user/trading-room-app/apps/room/src/lib/styles/captured-runtime-components.css. The gate's two inputs both exist here: the viewer's `isPresenter` is already a prop (RoomSidebar.svelte:51) and `isFT` is carried per entry (/home/user/trading-room-app/apps/room/src/lib/server/room-events.ts:322, `isFT: boolean`).

> Verified: I could not refute it. The reference roster row really does render a presenter-only "Trial" badge, and our only roster row render does not.

### RS-02 — Roster row: the badges div is rendered ALWAYS and EMPTY — the reference gates it on e.data.badges and fills it via parseBadges

**BUILT 2026-08-30 13:32 UTC.** Const 8's class list was here with no content and no gate — a wrapper nobody fills, which is the defect this repository names by that description. `badgesFor` is `RoomFeeds`'s and is the **same** resolution the message rows use, including its dark-variant fallback and its skip for a badge deleted from the account; passing it in rather than re-deriving is what stops the rail and the log disagreeing about who wears what. Upstream reaches the same place through `parseBadges`, which builds an HTML string; real elements here for the reason `MessageBody` records.

**medium** · `missing-behaviour` · reference byte **2,034,694**

```
O(6,e.data.badges?6:-1),m(),O(7,i.appService.globals.isPresenter&&e.isFT?7:-1),m(),O(8,i.appService.globals.sessData.isNewIndicatorOn&&i.appService.globals.isPresenter&&e.isNew?8:-
```

**Ours:** RoomSidebar.svelte:696 emits `<div class="d-inline-block align-baseline mr-1"></div>` unconditionally with no content and no gate — const 8 is `[1,"d-inline-block","align-baseline","mr-1",3,"innerHTML"]`, i.e. the element exists FOR the innerHTML binding it does not have here. `parseBadges` returns zero hits across apps/room/src, and `RosterUser` (/home/user/trading-room-app/apps/room/src/lib/server/room-events.ts:288-382) carries no `badges` field, so the producer is missing too. This is markup with no consumer, which is separately forbidden by the repo standard.

> Verified: The roster-row badges div is genuinely unimplemented in our source. RoomSidebar.svelte:696 emits `<div class="d-inline-block align-baseline mr-1"></div>` unconditionally, with no gate, no content, and no innerHTML/{@html} anywhere in the file (the file's only other "badge" token is the roster COUNT badge at :551).

### RS-05 — Roster avatar has no hideAvatars gate — a room that hides avatars still shows them in the roster

**BUILT 2026-08-30 13:32 UTC, and it is the one of the five that was a leak.** `showUserAvatar(e) { return !sessData.hideAvatars || !!e }` at byte 2,036,617 — **the roster's avatar gate is not the message log's**: a presenter's picture shows even in a room that hides avatars, because a member has to be able to tell who is running the room. This rail rendered every avatar unconditionally, so a room with avatars turned off still published every member's picture in the list of everybody present.

**medium** · `missing-control` · reference byte **2,036,617**

```
showUserAvatar(e){return!this.appService.globals.sessData.hideAvatars||!!e}
```

**Ours:** RoomSidebar.svelte:681-686 renders `<img class="rosterImg mr-3" ...>` unconditionally inside the full-row branch; the reference wraps it in `H(1,_2e,1,2,"img",4)` gated by `O(1,i.showUserAvatar(e.isP)?1:-1)` (byte 2034640). `showUserAvatar` returns zero hits across apps/room/src, and `hideAvatars` is read only by the CHAT path (/home/user/trading-room-app/apps/room/src/lib/chat-display-mode.ts, /home/user/trading-room-app/apps/room/src/lib/room-message-chrome.ts), never by roster-gates.ts. Note the reference's exemption: a presenter's avatar shows even when hideAvatars is on.

> Verified: The roster avatar is rendered with no hideAvatars gate anywhere in our source. RoomSidebar.svelte:681-686 emits `<img class="rosterImg mr-3" alt={user.displayName} src={user.avatarUrl} ...>` with the only enclosing branch being `{#if !rowIsFull(user)} ...

### RS-06 — Archives ▸ "Recording" renders with no handler at all

**BLOCKED 2026-08-30 13:32 UTC — the same blocker as G01, and the same item.** `launchRecordings()` opens `${apiROOT}/sessions/v2/archives/recordings/${sessionID}/${token}` in a new tab, which is a SERVER page. There is no archive service here and no recordings or archive table in either database. Wiring it would open a tab onto a 404 carrying a session token in the URL, which is worse than an inert item.

**medium** · `missing-behaviour` · reference byte **2,467,757**

```
function gPe(t,n){if(1&t){const e=Y();d(0,"a",50),x("click",function(){return D(e),E(g(3).launchRecordings())}),T(1,"i",51),d(2,"span",22),v(3,"Recording"),u()()}}
```

**Ours:** RoomSidebar.svelte:440-442 renders `<a class="dropdown-item small"><i class="fas fa-circle"></i><span class="pl-2">Recording</span></a>` with no onclick — const 50 is `[1,"dropdown-item","small",3,"click"]`, so the click binding is part of the const the item is built from. The reference handler is `launchRecordings(){window.open(`${apiROOT}/sessions/v2/archives/recordings/${sessionID}/${sesionToken}`,"_blank")}` at byte 2522147; `launchRecordings` and `archives/recordings` return zero hits in apps/room/src. The blocker is recorded (no archive tables — TODO.md:617, :448), but the item still renders and does nothing, which is the inert-control shape the repo standard forbids.

> Verified: Could not refute. The Archives dropdown's "Recording" item in our source is a bare anchor with no onclick, no href and no data-bs-target, while its three siblings in the same dropdown (Alert Logs, Chat Logs, Transcript History) all carry onclick handlers — so this is not a delegation pattern; I checked RoomSidebar.svelte and src/routes/+p…

### RS-07 — "Only select from Trials?" is a Yes/No question answered by OK/Cancel buttons

**BUILT 2026-08-30 13:32 UTC.** `buttons: {confirm: {label:"Yes", className:"btn-success"}, cancel: {label:"No", className:"btn-danger"}}` at byte 2,516,822. **"Cancel" was not merely unhelpful, it was wrong:** the No branch is not a cancellation — `ondismiss` runs `roster.draw(false)`, which draws from everybody — so a member pressing Cancel to back out got a random user anyway. `RoomConfirmation` gained four OPTIONAL fields defaulting to OK/Cancel, because that is what `bootbox.confirm(message, callback)` renders and what every other call site in this room passes.

**medium** · `wrong-constant` · reference byte **2,516,822**

```
getRandomUser(){const e=this;bootbox.confirm({message:"Only select from Trials?",buttons:{confirm:{label:"Yes",className:"btn-success"},cancel:{label:"No",className:"btn-danger"}}
```

**Ours:** The message text is exact (/home/user/trading-room-app/apps/room/src/routes/+page.svelte:353-364) and the dismiss semantics are right, but the labels are not carried: dialogs.confirmation has only `message`/`className`/`onconfirm`/`ondismiss` (rendered at /home/user/trading-room-app/apps/room/src/lib/components/RoomOverlays.svelte:702-713), and BootboxDialog's confirm footer is hard-coded to `Cancel` (btn-secondary btn-default) and `OK` (btn-primary) at /home/user/trading-room-app/apps/room/src/lib/components/BootboxDialog.svelte:115-124. Reference is "No"/btn-danger and "Yes"/btn-success.

> Verified: The message text and dismiss semantics are built, but the reference's button labels/classes are genuinely absent. `getRandomUser()` (routes/+page.svelte:353-364) sets `dialogs.confirmation = {message:'Only select from Trials?', onconfirm, ondismiss}`; the `RoomConfirmation` interface (lib/room/dialogs.svelte.ts:33-43) has only `message`/`…

### RS-09 — The second tip-me control lives in our SIDEBAR; the reference renders it in the navbar and our navbar has none

**BUILT 2026-08-30 13:32 UTC, and the row's framing is one step off in a useful way: the reference renders the tip TWICE.** `aPe` (byte 2,466,601) is the sidebar's `<p>` and this room had it; `APe` (byte 2,472,922) is the navbar's `<li>`, const 139 `[1,"nav-item",3,"click","title"]` wrapping const 140 `d-flex align-items-center btn btn-primary btn-sm`, gated `O(14, isTipEnabled ? 14 : -1)` immediately before Benzinga. **`tip-button.ts` was already written expecting both** — its own docblock says *"the two call sites read `tip.visible`"* while only one existed. The `<li>` carries the click where the sidebar's `<button>` does, which is const 139's own shape.

**medium** · `divergence` · reference byte **2,485,267**

```
APe,5,2,"li",89)(15,PPe,3,2,"li",90)(16,NPe,10,1,"li",91)
```

**Ours:** RoomSidebar.svelte:375-386 renders a second `<li class="nav-item" title={tip.label}>` tip control after General Settings and before Benzinga. In the reference TPe (byte 2470562, read through 2472300) index 14 is `T(14,"hr")` — there is no tip li in the sidebar at all; APe's only call site is the one quoted, inside the mainAppNav template U4e with placeholder const 89. Our /home/user/trading-room-app/apps/room/src/lib/components/RoomNavbar.svelte contains no tip control (grep for `tip` matches only `recordingTooltip`). So the control exists once in the room, in the wrong region. The sidebar's FIRST tip site (the `<p>`+button at RoomSidebar.svelte:231-242, reference aPe node 13) is correct and stays.

> Verified: The tip feature's LOGIC is built (lib/tip-button.ts + tip-button-contract.test.ts) and the FIRST render site is correct, but the second render site is in the wrong region and I could not find any navbar implementation. Reference: the consts table at bundle byte 2533190 gives index 6 = [1,"room-sidebar"] and index 7 = [1,"navbar","navbar-e…

### RS-03 — Roster row: the stars / years indicator (stars-container) is absent, and its CSS ships with no producer

**BLOCKED 2026-08-30 13:32 UTC.** `O(9, disableStarYears || e.isP || !e.data.years ? -1 : 9)` needs `e.data.years`, and **that value has no supply anywhere in this repository** — the same absence the MESSAGE-side star already carries, recorded twice at `gates.ts:110` and `room-config-client.ts:82` (*"its `item.membershipYears` supply does not exist yet"*). The message-side markup exists and is gated on a value that is always undefined; adding the roster's copy would be a second node that can never render. The CSS shipping with no producer is explained by the same fact. What would unblock it: a membership age on the roster row, which is a controller-side decision about what `years` means (account age? membership age? per room?) rather than a transcription.

**low** · `missing-behaviour` · reference byte **2,034,694**

```
O(8,i.appService.globals.sessData.isNewIndicatorOn&&i.appService.globals.isPresenter&&e.isNew?8:-1),m(),O(9,i.appService.globals.sessData.disableStarYears||e.isP||!e.data.years?-1:9)
```

**Ours:** No `stars-container`, `stars-icon` or `stars-num` anywhere in RoomSidebar.svelte; grep finds them only in RoomMessage.svelte, ModalHost.svelte and app.css. The roster-scoped rules `app-room-roster .stars-container` / `.stars-icon` / `.stars-num` exist in /home/user/trading-room-app/apps/room/src/lib/styles/captured-runtime-components.css with nothing that emits them. `RosterUser` carries no `years`, so the field is also absent from the payload.

> Verified: The roster star/years indicator is genuinely absent from our roster row, and the near-miss refutation is a component conflation. Reference: the gate at bundle byte 2,034,694 is confirmed verbatim, its slot-9 body `F2e` at byte 2,033,362 renders `span const 11 > i const 20 > span const 21` with `Ze(e.data.years)`, and the const table at by…

### RS-04 — Roster row: the "New" badge is absent

**BLOCKED 2026-08-30 13:32 UTC, on the same absence as RS-03.** `O(8, isNewIndicatorOn && isPresenter && e.isNew ? 8 : -1)` needs `e.isNew`, and `isNew` is declared on the message type (`types.ts:85`, `:336`) and populated by nothing, anywhere. The gate's other two terms exist; the row flag does not. Same unblocking condition: a server-side definition of what makes a member new.

**low** · `missing-behaviour` · reference byte **2,034,694**

```
O(8,i.appService.globals.sessData.isNewIndicatorOn&&i.appService.globals.isPresenter&&e.isNew?8:-
```

**Ours:** No `new-badge` in RoomSidebar.svelte (grep finds it only in RoomMessage.svelte). `isNewIndicatorOn` is modelled elsewhere (ModalHost.svelte, setting-coverage-contract.test.ts) but the per-entry `isNew` flag is not on `RosterUser` (/home/user/trading-room-app/apps/room/src/lib/server/room-events.ts:288-382), so the row cannot currently answer the gate.

> Verified: I could not disprove it. The reference roster row (update block `w2e`) draws four badge slots after the nick: badges innerHTML (slot 6), Trial (slot 7), New (slot 8), years star (slot 9).

### RS-08 — simUserCount is added to the headcount unclamped — the reference clamps it to 0…5000

**BUILT 2026-08-30 13:32 UTC — the same clamp as G14, in the one place that computes the number.** `RoomRoster.#connectedCount` is what both the navbar and this badge read, so `clampSimUserCount` there fixes both surfaces at once. The lower bound is the half that mattered: a negative setting **subtracted from a real roster**. See `#lib/sim-user-count.ts` for the transcription and the three details that would each be a real change if tidied.

**low** · `missing-control` · reference byte **2,499,381**

```
this.simUserCount=Number(e),this.simUserCount>5e3&&(this.simUserCount=5e3),this.simUserCount<=0&&(this.simUserCount=0)
```

**Ours:** /home/user/trading-room-app/apps/room/src/lib/room/create-room.svelte.ts:299 passes `simUserCount: () => data.sessData?.simUserCount ?? 0` straight through, and /home/user/trading-room-app/apps/room/src/lib/room/roster.svelte.ts:163 computes `(this.#count ?? this.#users.length) + this.#simUserCount()` with no bound. `5e3`/`5000` appears nowhere near simUserCount in apps/room/src (grep for `simUserCount` returns 14 hits, none clamping). A negative or absurd configured value publishes a nonsense headcount to every member.

> Verified: I could not refute this. The reference clamp is real and I read the bytes: at offset 2499381 (ngOnInit of the desktop room component) the bundle reads `const e=this.appService.globals.sessData.simUserCount` (offset 2498511) and then `e&&(this.simUserCount=Number(e),this.simUserCount>5e3&&(this.simUserCount=5e3),this.simUserCount<=0&&(this…

### RS-10 — Mobile App Info and the tip <p> are in the opposite order to the reference

**BUILT 2026-08-30 13:32 UTC.** `H(12, rPe, …)(13, aPe, …)` at byte 2,470,612. Both are `<p>` buttons in the same block, so the one a member's eye lands on first is whichever the room happens to have configured; the reference puts the thing the ROOM offers before the thing the PRESENTER asks for.

**low** · `divergence` · reference byte **2,470,612**

```
H(12,rPe,2,1,"p")(13,aPe,5,2,"p"),T(14,"hr"
```

**Ours:** RoomSidebar.svelte renders the tip `<p>` first (231-242) and the Mobile App Info `<p>` second (243-255), then the `<hr>` (256). The reference's node order inside li.nav-item.text-center is 12 = rPe (Mobile App Info, gated hideAppInfo), 13 = aPe (tip, gated isTipEnabled), 14 = hr. Both gates and both bodies are otherwise correct; only the vertical order differs.

> Verified: Confirmed by direct byte reads, not inference. In the reference, inside li.nav-item.text-center the creation order is slot 12 = rPe = the Mobile App Info <p>, slot 13 = aPe = the tip <p>, then T(14,"hr").

### RS-11 — The connection lines have a different element shape and the opposite order

**BUILT 2026-08-30 13:32 UTC — four nodes in two shapes, and we had two nodes in one.** `H(15,lPe,3,0,"p")(16,cPe,3,0,"p"), d(17,"p"), H(18,dPe,3,0,"span")(19,uPe,3,0,"span")`: the two FAILURE lines are a `<p>` each because they are sentences, and the two SUCCESS marks share one `<p>` as `<span>`s because they are labels. We had one `<p>` per service with both states inside it, so **on a healthy connection the room drew two stacked lines where the reference draws one**, and CHAT came second where the reference puts it first. The literals are transcribed with their own non-uniform spacing — `" Reconnecting Chat..."` has a leading space and no trailing one, `" Reconnecting Media... "` has both — written as expressions because Svelte normalises whitespace at element boundaries.

**low** · `divergence` · reference byte **2,470,790**

```
"),T(14,"hr"),H(15,lPe,3,0,"p")(16,cPe,3,0,"p"),d(17,"p"),H(18,dPe,3,0,"span")(19,uPe,3,0,"span"),u()()
```

**Ours:** RoomSidebar.svelte:268-283 renders TWO `<p>` elements, each carrying both the connected and the reconnecting state, Media first then Chat, and puts the Media tick BEFORE its label (`<i class="fas fa-check"></i> Media`) while the reference's dPe/uPe are both "label then tick". The reference shape is: p15 = " Reconnecting Chat...", p16 = " Reconnecting Media... " (both `-1` when connected), then ONE p17 holding span18 "Chat "+tick and span19 "Media "+tick. The gates themselves are right — `O(15,socketConnected?-1:15)`, `O(16,mediaSoupService.connected?-1:16)`, `O(18,socketConnected?18:-1)`, `O(19,mediaSoupService.connected?19:-1)` — and our two booleans map to them correctly.

> Verified: I could not refute it; the divergence is real on all three counts, and there is no second implementation anywhere in apps/room/src. (a) ORDER: the reference emits the Chat slot first in BOTH states — H(15,lPe)="Reconnecting Chat...", H(16,cPe)="Reconnecting Media...

### RS-12 — Benzinga: the default URL is not reproduced, so the item hides unless altBenzingaLinkURL is set

**OWNER DECISION, NOT BUILT — recorded 2026-08-30 13:32 UTC, and the reason is a CREDENTIAL rather than a preference.** The default is `https://ptrv3.protradingroom.com/public/bz/index.html?sessID=${sessionID}&id=${sessData.uuid}&tok=${sesionToken}` — a page on the reference vendor's own host, **carrying this room's session token in the query string**. Reproducing it would send every room's session token to a third party on every load of the sidebar item, for every room that has not set `altBenzingaLinkURL`. That is not a transcription decision. Two things follow and both are the owner's: whether this deployment should point at that host at all, and — if some Benzinga page is wanted — what identifier it may be given, because a session token in a URL is a session token in referrer headers, proxy logs and browser history. Until then the item renders only when the room supplies its own URL, which is `altBenzingaLinkURL`'s own branch and is safe by construction. The sibling gap (`benzinga-logo.png` is absent from this repository) is already recorded in `RoomNavbar.svelte`.

**low** · `divergence` · reference byte **2,499,501**

```
this.benzingaUrl=this.sanitizer.bypassSecurityTrustUrl(`https://ptrv3.protradingroom.com/public/bz/index.html?sessID=${this.appService.globals.sessionID}&id=${this.appService.globa
```

**Ours:** /home/user/trading-room-app/apps/room/src/lib/room/gates.ts:328-334: `benzingaUrl` returns `sessData.altBenzingaLinkURL?.trim() || null` and `benzingaVisible` additionally requires that URL to be non-null, so a room with `hasBenzingaNews` but no override gets no item — the reference gates only on `hasBenzingaNews` (byte 2471195, `O(31,e.appService.globals.sessData.hasBenzingaNews?31:-1)`). The divergence is argued in place (the default needs `sessionID`, a `sessData.uuid` absent from the 268-key schema, and `sesionToken`, which is httpOnly here) and is recorded in TODO.md. Listing it so the audit is two-sided, not because it should be built as written.

> Verified: I could not refute it. The reference's default Benzinga URL is genuinely not reproduced anywhere in apps/room/src, and our visibility gate is strictly narrower than the reference's.

---

## StreamingView + ScreenPane + ScreenTabs

11 verified gaps; 59 reference behaviours confirmed present.

### SV-SP-01 — ScreenPane renders no user-ID watermark overlay; the anti-leak overlay exists only on StreamingView

**BUILT 2026-08-30 03:52 UTC.** `ScreenPane.svelte` draws the same `overlay-userID-container` span, inside `#video-screen-container-{id}` so it fullscreens with the picture rather than being clipped away. The gate — `!isPresenter && overlayUserIdOnScreenshare`, plus the empty-id case — moved to `lib/user-id-watermark.ts` and `PresentationArea` resolves it once for both videos; `StreamingView` lost three props and gained one, because the expression spelled out there was exactly the one `ScreenPane` did not have. `user-id-watermark-contract.test.ts` asserts the nesting structurally rather than by line order. Stated at the module and worth repeating: this is a deterrent, not a control — a span over a video in the viewer's own browser can be removed by anyone with developer tools.

**high** · `missing-control` · reference byte **1,494,134**

```
function Q0e(t,n){if(1&t&&(d(0,"span",9),v(1),u()),2&t){const e=g();m(),Ne(" ",e.appService.globals.user.userXrefID," ")}}
```

**Ours:** The gate that mounts it, re-read at offset 1502175, is `O(10,!o.appService.globals.isPresenter&&o.appService.globals.sessData.overlayUserIdOnScreenshare?10:-1)` — const 9 of app-screenshare-view is `[1,"overlay-userID-container"]`, i.e. the SAME watermark span StreamingView carries, on the screenshare pane. Our ScreenPane.svelte has no `overlay-userID-container` anywhere (grep over apps/room/src returns exactly one hit, StreamingView.svelte:396), and PresentationArea.svelte:708 passes `overlayUserIdOnScreenshare` only into StreamingView — the `<ScreenPane>` instantiation at PresentationArea.svelte:607-624 does not receive it and ScreenPane.svelte:50-96 declares no such prop. So a room that has turned on `sessData.overlayUserIdOnScreenshare` gets the viewer's `userXrefID` burned over MTX streams and NOT over screenshares, which is the surface the setting is named for.

> Verified: I could not find any screenshare-pane watermark in apps/room/src under any name. Exhaustive greps over the whole room source for `overlay-userID`, `overlayUserId`, `overlayUserID`, `userXrefID`, `watermark`/`Watermark`, and `anti-leak|antileak|burn|idOverlay|userIdOverlay` return the watermark markup exactly once, in StreamingView.svelte:…

### SV-SP-02 — No detached state on the source pane: the reference blanks the original pane and offers 'click here to re-attach'

**BUILT 2026-08-30.** `RoomScreens.isDetachedHere` / `reattach`, and the pane's blanked state with
the captured `Screen Detached.. Click here to re-attach` heading (const 10,
`[1,"mt-4","text-center",3,"click"]`, byte 1,492,830).

**The distinction upstream's own naming hides is the whole row.** `isDetached` and `isDetachedCtrl`
differ by four characters and mean opposite ends of one gesture: the SOURCE window asking "have I
sent this screen elsewhere?" and the POPOUT asking "am I a popout?". This class had only the second,
so detaching left the original pane rendering the same producer — **one share feeding two live
decoders** — with no way back except finding and closing the popout window.

**One divergence, and it is the accessible one.** Upstream hangs the click on the `<h3>`: not
focusable, not keyboard operable, announced to a screen reader as a heading. A real `<button>` inside
the captured heading keeps the class, the text and the position exactly where the capture has them.
`role="button"` plus a tabindex on the heading was tried first and is precisely what
`a11y_no_noninteractive_element_to_interactive_role` refuses, with reason: it would have SAID button
and still been a heading.

Un-detaching happens in ONE place — the popout's `beforeunload` — because a viewer can close that
window by hand, and a second implementation of "put it back" is a second thing to drift. Two controls
seen red.

**medium** · `missing-behaviour` · reference byte **1,492,849**

```
return D(e),E(g().reAttachScren())}),v(1," Screen Detached.. Click here to re-attach "),u()}}
```

**Ours:** Three re-read pieces make this one control: the h3 above (sub-template z0e), its gate `O(1,o.isDetached?1:-1)` at offset 1501523, and the subscription at offset 1495283 — `subscribe("detachScreenShare",i=>{this.muser._id==i&&this.detachScreen()})` / `subscribe("reatachScreenShare",i=>{this.muser._id==i&&this.reAttachScren()})` — with `reAttachScren(){this.isDetached=!1,…}detachScreen(){this.isDetached=!0,this.stopWatchScreenOf(this.muser._id),…}` at offset 1499638. Our RoomScreens.detach (screens.svelte.ts:266-300) opens the popout window and registers a beforeunload that re-selects the tab, but nothing sets an `isDetached` flag on the source pane: ScreenPane.svelte has only `detached` (line 107), which is the POPOUT's own `isDetachedCtrl`, read from the query string via screens.svelte.ts:213-217. So after detaching, the original window keeps rendering the same screen (ScreenPane.svelte:336-342) — two live decoders on one producer — and there is no re-attach affordance at all.

> Verified: I could not find it. Our detach path opens the popout but never marks the SOURCE pane detached, never stops watching the producer, and offers no re-attach control.

### SV-SP-03 — No 'Connecting To Screen of …' state — an un-arrived screen shows an empty pane with no feedback

**BUILT 2026-08-30.** `q0e` transcribed — const 3
`[1,"text-center","mt-4","animated","fadeIn",2,"color","#fff"]`, const 12 the `fas fa-spinner
fa-pulse` glyph, and the hyphen between the two names, which is the capture's own separator.

**The gate is a NEGATION and that is what makes it worth a test.**
`O(4, o.isConnected || o.isPresentingThisScreen || o.isDetached ? -1 : 4)` at byte 1,501,699 shows
the line while NONE of the three holds; read the other way round it builds a spinner over every
screen that IS connected.

`isPresentingThisScreen` is `ownScreen` here: a screen this browser shares renders from the local
capture rather than from a consumer, so it is connected the moment it exists. Without that term a
presenter would watch a spinner over their own screen forever — this file already recorded that the
term is false by construction and did not record what depends on it. Two controls seen red.

**medium** · `missing-behaviour` · reference byte **1,493,278**

```
function q0e(t,n){if(1&t&&(d(0,"h3",3),T(1,"i",12),v(2),u()),2&t){const e=g();m(2),ns(" Connecting To Screen of ",e.muser.mediaValue.name,"-",e.muser.mediaValue.screenName," ")}}
```

**Ours:** Const 3 is `[1,"text-center","mt-4","animated","fadeIn",2,"color","#fff"]` and const 12 is `[1,"fas","fa-spinner","fa-pulse"]`, and the gate re-read at offset 1501699 is `O(4,o.isConnected||o.isPresentingThisScreen||o.isDetached?-1:4)` — i.e. shown exactly while not yet connected. Our ScreenPane.svelte:336-342 hides the `<video>` via `{ hidden: stream === null || saveData }` and renders nothing in its place; there is no spinner, no message, and no `isConnected` notion (grep for 'Connecting To Screen' over apps/room/src returns nothing). StreamingView has its counterpart (`Loading Stream...`, StreamingView.svelte:374-378); ScreenPane does not.

> Verified: I could not find any "Connecting To Screen" state, or any renamed equivalent, in apps/room/src. ScreenPane.svelte has exactly two template conditionals — `{#if saveData}` at :333 (the `Video Disabled` h3) and `{#if detached}` at :351 (the popout zoom cluster); when the stream has not arrived the pane renders nothing, because the `<video>`…

### SV-SP-04 — No too-small-video retry: a screen consumer that comes up 0x0 is never re-requested

**BUILT 2026-08-30.** `ScreenPane` measures, `RoomMediaTransport.retryScreen` re-consumes — the
same decision-versus-effect split every other feature here draws: the pane owns the element and can
see `videoWidth`, and only the transport can ask for the producer again.

The three constants are the reference's and are named rather than inlined: three attempts, 3,000 ms
apart, ten pixels. Below ten in either axis is a decoder that produced nothing, not a small window.
The budget is per producer and resets on a good picture (`i.tooSmallRetries = 0`), or a long session
would exhaust it on unrelated blips.

**The Firefox and Edge exclusions are deliberately NOT reproduced, and that is measured rather than
lazy.** They exist upstream because those browsers report `videoWidth` as 0 for a frame or two after
`playing` on the codepath it was written for, so the retry fired on healthy streams. This
implementation does not take the measurement at `playing` — it takes it after the same settling delay
the retry would wait and re-reads it before acting, so the case those exclusions guard against cannot
arise. A browser sniff that nothing needs is a branch with no consumer.

Why it mattered: a 0x0 video is an empty pane that never fills, which on screen is indistinguishable
from a presenter who has not started sharing. Nothing about it looks like a fault to report. Control
seen red.

**medium** · `missing-behaviour` · reference byte **1,499,022**

```
if(clearTimeout(i.screenConnectChecker),P("------webcam playing event fired....w:"+s+". h:"+r),(s<10||r<10)&&i.tooSmallRetries<3&&!i.mediaService.is_firefox&&!i.mediaService.is_edge)return P("------webcam playing event TOO small? retry..."),i.tooSmallRetries++,void setTimeout(()=>{i.mediaService.callScreenOfUserWEBRTC(this.muser)},3e3);i.tooSmallRetries=0
```

**Ours:** The offset is where `i.tooSmallRetries<3` begins; the quote is the surrounding one-time 'playing' listener installed by `startWatchScreenOf`. Our attach path is ScreenPane.svelte:219-241 (`attachStream`), which assigns srcObject, plays, logs a blocked autoplay and returns a teardown — it never inspects `videoWidth`/`videoHeight` and never re-requests. `grep -rn videoWidth apps/room/src` finds it only in screen-zoom.ts (the screenshot) and alert-overlay-compositor.ts; nothing in the screen-consume path (media-transport.svelte.ts:1144). The Firefox/Edge exclusion and the 3-attempt, 3000 ms cap are likewise absent.

> Verified: I could not refute this. Our screen attach path is ScreenPane.svelte:219-241 (`attachStream`), read in full: it assigns `srcObject`, sets volume/muted, calls `node.play()` with a `console.warn` on rejection, and returns a teardown that pauses and nulls `srcObject`.

### SV-SP-05 — Screen tabs do not start/stop watching: every shared screen is consumed on arrival, not only the selected one

**OWNER DECISION, recorded 2026-08-30.** The row files itself this way — *"a real shape difference
with a cost the reference does not pay… Filed as a divergence to be decided on, not as a defect"* —
and the verifier adds that its cost argument is overstated because a renamed counterpart exists.

The divergence is architectural and already recorded in two places
(`save-data-gate-contract.test.ts` and `room-mtx.svelte.ts`): `addRemoteScreen` consumes EVERY remote
screen producer the moment it is announced. At N screens shared this room pulls N video consumers
where the reference pulls 1.

**What makes it a decision rather than a fix:** the consume-on-arrival shape is what
`selectScreenTabOfId`, the detached popout, the alerts overlay and `applyScreenLayers` are all built
on — a screen has to be consumed before it can be laid out, previewed or burned into. Changing it is
a media-plane redesign, and the bandwidth it would save is a number nobody here has measured on a
room with several simultaneous shares. That measurement is what should decide it.

`SV-SP-02` removed the sharpest instance of the cost — the source pane no longer decodes a screen it
has detached — without touching the shape.

**medium** · `divergence` · reference byte **1,968,584**

```
onScreenShareTabChange(e,i=!0){P(`onScreenShareTabChange tab: ${e}. selectedScreenShareTab: ${this.selectedScreenShareTab}`),this.selectedScreenShareTab!=e&&this.appService.guiEventBus.emit("stopWatchScreenOf",this.selectedScreenShareTab),this.selectedScreenShareTab=e,this.appService.guiEventBus.emit("startWatchScreenOf",this.selectedScreenShareTab),this.appService.globals.currScreenID=this.selectedScreenShareTab
```

**Ours:** Our RoomScreens.selectTab (screens.svelte.ts:329-332) sets `#selectedScreenTab` and applies the `makeUsersFollowMyScreens` clause, but emits no stop/start-watch pair, because media-transport.svelte.ts:1091-1148 (`addRemoteScreen`) consumes EVERY remote screen producer the moment it is announced and holds the stream in `#screenStreams`. The divergence is recorded in save-data-gate-contract.test.ts:145-148 and room-mtx.svelte.ts:50-58 and is architectural rather than accidental — but it is a real shape difference with a cost the reference does not pay: at N screens shared, this room pulls N video consumers where the reference pulls 1. Filed as a divergence to be decided on, not as a defect.

> Verified: I could not refute it. The reference behaviour is real and the claim about us is accurate in every detail I could check, though its COST argument is overstated because a renamed counterpart exists.

### SV-SP-06 — ScreenTabs renders no locked-screen badge, so a locked screen has no indicator and no one-click unlock

**BUILT 2026-08-30.** `oSe` transcribed — const 82
`["placement","bottom","tooltip","Unlock this screen?",1,"mr-2",3,"click"]` and const 83
`["aria-hidden","true",1,"fas","fa-lock"]` — immediately after the forced-screen eye badge, which is
the reference's order and is asserted as such.

**The asymmetry the row names is exactly what hid it.** `StreamTabs.svelte` has rendered this badge
from the same const all along, on the bar where upstream it can never appear, while the bar that
actually locks screens had none. `lockedScreenId` reached this component and was read for one thing:
flipping a dropdown item's label. So a locked screen showed no indicator anywhere and the only way
out was the right item in the right menu.

`stopPropagation` because the badge lives inside the tab's own anchor — without it, clicking Unlock
would also select the tab, which is not what the reference's separate `click` does. Control seen red.

**medium** · `missing-control` · reference byte **1,918,843**

```
function oSe(t,n){if(1&t){const e=Y();d(0,"span",82),x("click",function(){D(e);const o=g().$implicit;return E(g(3).toggleLockScreen(o._id))}),T(1,"i",83),u()}}
```

**Ours:** Const 82 is `["placement","bottom","tooltip","Unlock this screen?",1,"mr-2",3,"click"]` and const 83 is `["aria-hidden","true",1,"fas","fa-lock"]`; the gate, re-read at offset 1920343, is `O(3,i.appService.globals.lockedScreenID===e._id?3:-1)` inside lSe's update block, immediately after the forced-screen eye badge at `O(2,i.forcedScreenID==e._id?2:-1)`. Our ScreenTabs.svelte renders the eye badge (lines 170-177) and then goes straight to the avatar at line 178 — no lock badge. `lockedScreenId` (ScreenTabs.svelte:49, 243) is used ONLY to flip the dropdown item's label. The asymmetry is the tell: StreamTabs.svelte:201-212 does render this badge, from the same const, on the bar where upstream it can never appear.

> Verified: I could not refute this. The reference claim checks out and our ScreenTabs genuinely has no lock badge.

### SV-SP-08 — globals.currScreenID is never written, so the presenter-unmutes-refocus path has nothing to read

**BUILT 2026-08-30, and the row's own verifier had the important half right: the WRITE was never
missing.**

`#selectedScreenTab` has held that value all along. What did not exist was a READER outside the
component tree — which is why the row sits on this surface and its trigger sits on the microphone
one. `RoomScreens.focusRoomOnSelectedScreen()` is that reader, called from
`RoomLocalCapture.#enableMicrophone`, which is this application's `presUnmuted` moment.

It takes no argument: the screen is whichever one this presenter is looking at, by definition. It
goes through `bringEveryoneTo` rather than a second `focusOnScreen` call, because the two are the
same act — that method re-checks the presenter role and moves this browser first so the presenter's
own view responds without a round trip, and a parallel path would be a second place for that rule to
drift. Silent when no screen is selected: a presenter can be sharing a producer that has not yet
produced a tab.

The other half of upstream's handler — `startTalking` — arrives INBOUND from the room socket here
rather than being sent, which `media.svelte.ts` already records and which is why only one half needed
building. Two controls seen red.

**low** · `missing-behaviour` · reference byte **1,968,960**

```
this.appService.globals.currScreenID=this.selectedScreenShareTab
```

**Ours:** Written by onScreenShareTabChange on every tab change, and its consumer — re-read at offset 1141836 — is `subscribe("presUnmuted",e=>{…this.globals.isScreenSharing&&this.sendServerAdminCommand("focusOnScreen",{id:this.globals.currScreenID})})`, i.e. a presenter who unmutes while sharing pulls the room to whichever screen they last selected. Our screens.svelte.ts keeps `#selectedScreenTab` (line 54) but nothing outside the component tree reads it, and grep over apps/room/src finds no `currScreenID` and no presUnmuted-to-focusOnScreen path. Low because the consumer lives on the talking/mic surface rather than this one, and the write is only half the feature.

> Verified: I could not find the behaviour in our source, and I am reporting that absence rather than inventing a counterpart. WHAT IS ACTUALLY MISSING — the CONSUMER, not the write.

### SV-SP-09 — No presenter self-preview deferral: our own screen always renders full video instead of the 'click here for larger preview' line

**DELIBERATE DIVERGENCE, recorded 2026-08-30.** The reference does not decode a presenter's own
screen until they click *"(You are sharing your screen as X click here for larger preview)"*; this
room renders it from the LOCAL capture, so it is already on screen and there is nothing to defer.

**The two are not the same trade.** Upstream defers because its own screen would otherwise be a
second WebRTC consumer of a producer it is already producing — a real cost. Ours is a direct
`srcObject` from the capture that already exists for the encoder: no consumer, no negotiation, and no
extra decode beyond compositing a stream the browser is holding regardless. Reproducing the deferral
would mean hiding a picture that costs nothing to show, and adding a click to get it back.

`SV-SP-03` depends on this being stated: `ownScreen` short-circuits the connecting spinner precisely
because our own screens are connected the moment they exist.

**low** · `missing-behaviour` · reference byte **1,493,170**

```
Ne(" (You are sharing your screen as ",e.muser.mediaValue.screenName," click here for larger preview) ")
```

**Ours:** The p is const 2 with a click bound to `largePreview()`, gated at offset 1501588 as `O(3,o.mediaService.isScreenSharing&&o.mediaService.localSharingStreams[o.muser._id]&&!o.localpreview?3:-1)`, and `largePreview(){this.localpreview=!0;…i.srcObject=e.localStream;…}` sits at offset 1499849. Our ScreenPane.svelte:301-309 states the term is false by construction here because `addLocalScreen` renders our own screens from the local capture, i.e. we always local-preview. That is a coherent decision, but it is a divergence, not an equivalence: the reference deliberately does NOT decode the presenter's own screen until they ask for it.

> Verified: I could not find any implementation or renamed equivalent in apps/room/src. Searched: 'largePreview', 'large preview', 'larger preview' (zero hits across all of apps/** in .ts/.svelte/.md); the label text 'You are sharing' and 'sharing your screen as' (zero hits in any template); 'localpreview'/'localPreview' (hits ONLY inside comments qu…

### SV-SP-10 — The screenshare <video> is statically muted upstream; ours binds volume and muted from the room master

**FIXED 2026-08-30.** `muted` is a static attribute on the element, the `volume`/`muted` props are
gone from `ScreenPane`, and `PresentationArea` passes neither.

Read from const 8 rather than inferred: `muted` sits in the STATIC attribute run BEFORE the `3`
marker, and the binding run after it holds only `click`, `controls`, `ngClass` and `id` — no
`volume`. `newScreenStream` then re-asserts `i.muted = !0` twice more (byte 1,497,239). **The
reference makes this element silent three separate ways**, which is not the sort of thing a codebase
does by accident.

The row's own assessment is the right one: harmless TODAY, because `addRemoteScreen` refuses any
producer whose `kind !== 'video'` so the consumed stream carries no audio track — and that is **one
guard away** from playing screenshare audio through an element the reference guarantees is silent. A
screen is a picture; the room's volume control is for the room's audio. Removing the props is what
makes the second predicate unwritable rather than merely absent. Control seen red.

**low** · `divergence` · reference byte **1,500,765**

```
["autoplay","autoplay","data-ng-dblclick","fullScreen()","playsinline","","muted","true",1,"webcamScreen",3,"click","controls","ngClass","id"]
```

**Ours:** Const 8 carries `muted="true"` as a STATIC attribute — `volume` is not in its binding list at all — and `newScreenStream` re-asserts it twice (`i.muted=!0` before assigning srcObject, and again in the play() catch; read at offset 1497239). Our ScreenPane.svelte:225-226 sets `node.volume = volume/100` and `node.muted = muted`, and PresentationArea.svelte:615-616 passes `{volume}` / `muted={volume === 0}`. Harmless today because media-transport.svelte.ts:1093 refuses any producer whose `kind !== 'video'`, so the consumed screen stream carries no audio track — but it is a live path to playing screenshare audio through an element the reference guarantees is silent.

> Verified: I could not find the reference's guaranteed-silent screenshare video anywhere in our source. The reference mutes it three independent ways: the const at byte 1500691 carries `"muted","true"` in the STATIC attribute run (before the `1` marker), with the binding run after `3` holding only `click`,`controls`,`ngClass`,`id` — no `volume`; `ne…

### SV-SP-13 — Fullscreen keeps only the standard API; the reference carries moz/webkit/ms fallbacks on both fullscreen paths

**MEASURED REFUSAL, recorded 2026-08-30.** The row states its own answer — *"Cosmetic/compat only
on any browser from the last several years"* — and the standard this repository holds decides the
rest: **nothing exists without a consumer.**

`document.mozCancelFullScreen`, `webkitExitFullscreen` and `msExitFullscreen` are `undefined` in every
browser this room supports, so each added branch is a line that can never run. That is the same
`.flipped`-class-with-no-CSS shape `CLAUDE.md` names by name, in executable form.

What IS worth keeping is the measurement, so nobody re-derives the row as a gap: the vendor chain is
real and is at bytes 1,491,771 and 1,492,211, both of our fullscreen call sites reach the same
`#video-screen-container-{id}` target the reference does, and the difference is exclusively in
branches that cannot be reached. If this room ever has to support a browser that needs one, the
evidence is here and the change is four lines.

**low** · `missing-behaviour` · reference byte **1,491,771**

```
onDoubleClicked(){try{let e=null;e=document.querySelector(`#video-screen-container-${this.id}`),document.fullscreenElement?document.exitFullscreen?document.exitFullscreen():document.mozCancelFullScreen?document.mozCancelFullScreen():document.webkitExitFullscreen?document.webkitExitFullscreen():document.msExitFullscreen&&document.msExitFullscreen():e.requestFullscreen?e.requestFullscreen():e.mozRequestFullScreen?e.moz
```

**Ours:** This is the appDoubleClick directive, whose vendor chain continues at offset 1492211 (`e.webkitRequestFullscreen?e.webkitRequestFullscreen():e.msRequestFullscreen&&e.msRequestFullscreen()`). Our ScreenPane.svelte:198-208 reproduces the `#video-screen-container-{id}` target and the standard pair only; StreamingView's own `toggleFullscreen()` has the same three-way fallback upstream and StreamingView.svelte:348-356 likewise keeps the standard pair. Cosmetic/compat only on any browser from the last several years.

> Verified: Could not refute. Both of our fullscreen call sites use the standard API only, with no vendor fallbacks anywhere in apps/room/src.

### SV-SP-14 — The detached zoom cluster has no hidden binding, so it paints over a pane that has no picture

**BUILT 2026-08-30.** `$0e = t => ({hidden: t})` over the same condition that hides the `<video>`,
so a popout whose stream has not arrived — or one with `saveData` on — does not float a magnifier and
a camera button over an empty box.

**ONE derived feeds both**, which is more than the row asked for and is the point: the cluster and the
picture cannot drift into different conditions, and the contract asserts both read `pictureHidden`.
The row's verifier notes that the one place this was previously reasoned about reached its
"equivalent" conclusion by conflating two distinct fields in the reference component — `isDetached`
and `isDetachedCtrl` again, which is the same confusion `SV-SP-02` untangles. Control seen red.

**low** · `missing-behaviour` · reference byte **1,493,686**

```
z("ngClass",ct(2,$0e,!e.isDetached&&(!e.isConnected||e.isPresentingThisScreen&&!e.localpreview||e.mediaService.saveData))),m(5),O(5,e.showZoomCtrlDetached?5:-1)
```

**Ours:** The offset is the start of `function Y0e`; the quote is its update block. `$0e = t => ({hidden: t})`, so the whole `zoom-controls-container-detached` collapses under exactly the conditions that hide the `<video>`. Our ScreenPane.svelte:351-363 renders the container whenever `detached` is true, with no hidden class — so in a popout whose stream has not arrived, or with saveData on, the magnifier/camera cluster floats over an empty box. The inner `showZoomCtrlDetached` gate IS reproduced (ScreenPane.svelte:144-151, ScreenZoomControls.svelte:231-235).

> Verified: I tried hard to refute this and could not. The binding is genuinely absent from our source, and the one place we already reasoned about it reaches its "equivalent" conclusion by conflating two DISTINCT fields in the reference component.

---

## EmojiPicker + reactions

11 verified gaps; 69 reference behaviours confirmed present.

### EMOJI-01 — A reaction is never pushed to other viewers — no realtime channel for reactions

**BUILT 2026-08-30 03:19 UTC**, and the audit found one third of it. Nine commands mutated a rendered row and published nothing — reaction, edit, delete, mark-answered, and the four Q&A commands. All nine announce now, on the reference's own four frame names (`updateChatMsg` / `updateAlertMsg` / `deleteChatMsg` / `deleteAlertMsg`, bytes 1,011,021 / 1,011,303 / 1,021,604 / 1,021,717). `message-mutation-frames.ts` holds them; `message-mutation-broadcast-contract.test.ts` drives all nine through the real hub and asserts on what a SECOND connection received. Ours are triggers where the reference's `update` pair carry the whole row — the row is the authority, and a frame carrying a body would put admin-channel text on a per-room stream.

**high** · `missing-behaviour` · reference byte **1,152,627**

```
manageChatReactions(e,i,o,s,r=null){this.socketService.send("chatReactions",{msgID:e,reactions:i,reactionDetails:o,type:s,msgIndex:r})}
```

**Ours:** apps/room/src/routes/message-actions.remote.ts:281-325 toggles `reactionsJson` in SQLite and returns; there is no `publishToRoom` on the reaction branch (grep for publishToRoom in that file: 0 hits) and the `RoomEvent` union at apps/room/src/lib/server/room-events.ts:45-140 has channels alerts/chat/typing/cmds and no reaction channel. The only refresh is the clicker's own `invalidateAll()` (apps/room/src/lib/room/message-actions.svelte.ts:247-266). The reference's return leg is the inbound `updateChatMsg` frame at offset 1011052, which I read verbatim: 'case"updateChatMsg":let a=i.msg,l=i.reactionDetails||null;l&&l.msgUID===this.globals.user.userXrefID&&this.appEventBus.emit("updateChatMsgReaction",l)'. A second viewer in our room sees a reaction only after a page load.

> Verified: I could not find any realtime fan-out for a reaction anywhere in apps/room/src, under this or any other name. What I verified by reading:

1.

### EMOJI-02 — `reactionDetails` ({n, emoji, remove}) is never computed, so no downstream consumer can exist

**BUILT 2026-08-30, by a different mechanism, and the difference is the point.**

The reference COMPUTES `{n, emoji, remove}` at the clicking browser and puts it on the wire as the
third argument of `manageChatReactions`. This room DERIVES the same three facts at the receiving
browser, from the row's own reaction map: `ReactionArrivals.changes(rows)` diffs
`emoji\u0000emailHash` pairs between passes and reports `{rowId, emoji, emailHash, removed}`.

**Because the frame cannot carry it.** This hub's stream is per ROOM while chat is per CHANNEL, so a
frame carrying a reaction's text or its author would put admin-channel content on every subscriber's
wire — the same constraint `publishChatToRoom` records for `isMention`. The mutation frames announce
that a row changed and the receiver reads the row it is entitled to.

It also fixes a defect upstream's shape has: a reaction added while a viewer's tab was hidden is
INVISIBLE to a per-event record and is caught by a diff, because the diff compares what is there now
with what was there last.

**medium** · `missing-behaviour` · reference byte **1,353,655**

```
i={n:this.appService.globals.user.nick||this.appService.globals.user.name,emoji:this.selectedEmoji[e].emoji,remove:!0}
```

**Ours:** Neither apps/room/src/lib/reaction-toggle.ts:28-45 nor apps/room/src/routes/message-actions.remote.ts:281-325 produces a who/what/removed record. `toggleReaction` returns only the new map; the client sends only `{reactionKey, reactionEmoji}` (apps/room/src/lib/room/message-actions.svelte.ts:255-259). Grep for `reactionDetails` across apps/room/src: 0 hits. The reference builds the same object in selectEmoji too and passes it as the 3rd argument of manageChatReactions (read at 1355000-1355100).

> Verified: I tried hard to refute this and could not. The `{n, emoji, remove}` record — and the whole feature it feeds — is absent from our source.

### EMOJI-03 — "Message Reaction" toast (the non-QA chat reaction notification) is absent

**BUILT 2026-08-30.** `chatReactionNotice` in `#lib/room/reaction-notices.ts`, raised from
`RoomOverlays` over `ReactionArrivals.changes(data.messages)`, gated on `prefs.reactionsPopup` and
titled `Message Reaction` — the literal at byte 2,509,144, which the audit's own note corrects from
an earlier stage's "Chat Reaction" (zero occurrences in the bundle).

The reactor's own reaction is skipped, which upstream gets for free by only ever raising the toast
from an inbound frame and this has to do explicitly, because a diff sees every change including your
own.

**medium** · `missing-control` · reference byte **2,508,981**

```
this.appService.appEventBus.subscribe("updateChatMsgReaction",i=>{this.appService.globals.preferences.reactionsPopup&&this.alertsService.info(`${i.n}: ${i.remove?"removed":""} ${i.emoji} on "${i.txt}"`,"Message Reaction",{enableHtml:!0})})
```

**Ours:** No such toast. `grep -rn "Message Reaction" apps/room/src` returns 0 hits; apps/room/src/lib/room/toasts.svelte.ts has no reaction path. NOTE: the previous stage reported it could not find a non-QA reaction toast — it exists and its title is "Message Reaction" (the literal `"Message Reaction"` is at offset 2509144), not "Chat Reaction" (0 occurrences of "Chat Reaction" in the bundle).

> Verified: The non-QA "Message Reaction" toast is genuinely absent from apps/room/src. Our source implements the reaction FEATURE (toggle rules in lib/reaction-toggle.ts, optimistic UI + server call in lib/room/message-actions.svelte.ts:592-625, persistence in routes/message-actions.remote.ts:281-315), but raises no toast on the reaction path — the…

### EMOJI-04 — "QA Reaction" toast and the QA reaction sound are absent

**BUILT 2026-08-30.** `questionReactionNotice`, the twin of the chat one, over the Q&A rows —
titled `QA Reaction` (byte 1,410,150), gated on `prefs.reactionsPopupQA`, with the paired
`prefs.qaReactionSoundOn && qaAlert` sound.

Two preferences and two notices rather than one of each, because that is what the reference has: a
reader can want reaction toasts on chat and not on the Q&A thread, and the sound is gated separately
again.

**medium** · `missing-control` · reference byte **1,409,470**

```
this.appService.globals.preferences.reactionsPopupQA&&l&&c&&this.alertService.info(`${c.n}: ${c.remove?"removed":""} ${c.emoji} on "${c.txt}"`,"QA Reaction",{enableHtml:!0})
```

**Ours:** Absent. `grep -rn "QA Reaction" apps/room/src` matches only prose comments about the room SETTING "Enable QA Reactions?" (apps/room/src/lib/room-message-chrome.ts:82, apps/room/src/lib/server/room-config-client.ts:627) — a different control. The paired sound gate `preferences.qaReactionSoundOn && soundEffectsService.qaAlert.play()` (I read `qaReactionSoundOn` occurrences at 979369, 1409156, 1409764, 1410280) has no counterpart either; apps/room/src/lib/room/prefs.svelte.ts carries `qaSoundOn` but no `qaReactionSoundOn`.

> Verified: Could not refute. Zero hits in apps/room/src for reactionsPopupQA, reactionsPopup, qaReactionSoundOn, reactionsSoundOn, qaReactionDetails, updatedQAMsg, or the settings labels "Reactions Response" / "Reactions QA Response".

### EMOJI-05 — User preferences `reactionsPopup` / `reactionsPopupQA` / `qaReactionSoundOn` and their two settings toggles do not exist

**BUILT 2026-08-30.** All three preferences are on `RoomPrefs` — `reactionsPopup`,
`reactionsPopupQA` (byte 979,890's object) and `qaReactionSoundOn` (byte 979,369's) — each defaulting
`!== false`, which is the reference's own three-state reading: absent, null and true all enable.

Both settings switches ship in `ReactionPrefsPane.svelte`, labelled `Reactions Response` and
`Reactions QA Response` exactly as read at bytes 2,227,101 and 2,227,573. The pane is its own
component because `ModalHost` was at its ceiling, which is the extraction that file's entry records.

**medium** · `missing-control` · reference byte **979,910**

```
recPreviewWindow:!0,reactionsPopup:!0,reactionsPopupQA:!0,noteUpdatePopup:!0,chatGif:!0,chatBadges:!0
```

**Ours:** apps/room/src/lib/room/prefs.svelte.ts defines popupOnUserJoin/popupOnUserLeave/chatPopup/alertPopup/longerAlertPopup/qaSoundOn but none of the three reaction flags (grep for `reactionsPopup` across apps/room/src and apps/controller/src: 0 hits). The reference also ships their two settings-modal switches, which I read verbatim: `v(3," Reactions Response ")` at offset 2227101 bound to `preferences.reactionsPopup`, and `v(3," Reactions QA Response ")` at offset 2227573 bound to `preferences.reactionsPopupQA`. Neither label appears anywhere in our tree.

> Verified: I could not refute this. The three preference flags and both settings switches are genuinely absent from our tree.

### EMOJI-06 — Enter in the search box does not select the first result

**BUILT 2026-08-30.** `onkeyup` on the search field selects `searchResults[0]`.

`keyup` and not `keydown`, which is upstream's own event (`setupKeyupListener`, byte 737,093) and the
right one for the reason `poll-08` gives: holding Enter repeats `keydown`, and a repeat would insert
the emoji once per repeat into whatever composer the picker is feeding.

**Upstream's `!this.query` guard is deliberately NOT reproduced, and a negative control is why.** It
was transcribed at first, on the reading that "the box is empty" and "there are no results" are
different tests. The control deleting it stayed GREEN, so the reading was checked rather than the
test strengthened — and it is wrong here: `runSearch` returns `null` for an empty string and `null`
again for a whitespace-only one, so the result check already covers every case the guard did.
Upstream's `SEARCH_CATEGORY.emojis` is null only before any search has run, so there the two really
are different questions. One statement of the fact, with the whitespace case pinned as a test.

**medium** · `missing-behaviour` · reference byte **750,272**

```
handleEnterKey(e,i){if(!i&&null!==this.SEARCH_CATEGORY.emojis&&this.SEARCH_CATEGORY.emojis.length){if(!(i=this.SEARCH_CATEGORY.emojis[0]))return;wC(this.emojiSelect,this.ngZone,{$event:e,emoji:i})}
```

**Ours:** apps/room/src/lib/components/EmojiPicker.svelte:513-522 binds only `oninput={(event) => handleSearch(event.currentTarget.value)}` on the search input; there is no keydown/keyup handler and no path that picks `searchResults[0]`. The reference wires it with `setupKeyupListener()`, which I read at offset 737093: `setupKeyupListener(){this.ngZone.runOutsideAngular(()=>ji(this.inputRef.nativeElement,"keyup")...subscribe(e=>{!this.query||"Enter"!==e.key||(this.enterKeyOutsideAngular.emit(e),e.preventDefault())}))}`, feeding emoji-mart's handleEnterKey.

> Verified: Our emoji picker's search input has no Enter handling at all. apps/room/src/lib/components/EmojiPicker.svelte:515-522 declares the input with exactly one handler — oninput={(event) => handleSearch(event.currentTarget.value)} — plus bind:this, id, class, type and placeholder; there is no onkeydown/onkeyup, and it is not inside a <form>, so…

### EMOJI-07 — Search input id is hardcoded `emoji-mart-search-2`; the reference derives it from a per-instance counter

**BUILT 2026-08-30.** `$props.id()`, which is Svelte's documented answer for exactly this —
*"unique to the current component instance"*, and *"when hydrating a server-rendered component, the
value will be consistent between server and client"*.

A module counter would reproduce `++Qee` more literally and would be wrong: it numbers the server's
instances and the client's independently, so hydration would find two different ids for one field.

The row's premise is exercised rather than argued — the contract MOUNTS TWO PICKERS and asserts two
ids and two `<label for>` targets, because a duplicate-id defect is not observable in one instance.
Control seen red.

**medium** · `wrong-constant` · reference byte **736,424**

```
inputId="emoji-mart-search-"+ ++Qee;destroy$=new Jt;
```

**Ours:** apps/room/src/lib/components/EmojiPicker.svelte:516 emits `id="emoji-mart-search-2"` and :523 `<label class="emoji-mart-sr-only" for="emoji-mart-search-2">`, the same literal for every instance. The counter's initialiser `Qee=0` is at offset 736204, so the reference's first picker is `emoji-mart-search-1` and each later one increments. Two pickers can be mounted at once in our tree (e.g. AlertChatArea.svelte:1077 and ExtraChatPane.svelte:549, or two open message pickers, since `reactionPickerOpen` is per-RoomMessage at RoomMessage.svelte:155), which produces duplicate DOM ids and a `for=` that binds to whichever input is first in document order.

> Verified: I could not refute this. The search input id in our picker is a bare literal in both places and nothing derives it.

### EMOJI-08 — `emoji-mart-dark` is applied unconditionally; the reference computes darkMode from prefers-color-scheme

**BUILT 2026-08-30, and it uncovered a crash that the row did not name.**

`MediaQuery` from `svelte/reactivity` reads `prefers-color-scheme: dark` reactively. Its constructor
calls `window.matchMedia` IMMEDIATELY — so building one where the API is absent throws, while
upstream's expression (`"function" != typeof matchMedia || …`, byte 744,873) yields `false` and
renders the light palette. The guard is transcribed for that reason and is not defensiveness: without
it this component crashes where the reference degrades. jsdom is such an environment, and every mount
in the new contract failed with `TypeError: window.matchMedia is not a function` until the guard went
in.

Honest gap, recorded at the code: the server has no `matchMedia` either, so SSR emits the light
palette and a dark-scheme machine gains the class on hydration — a one-frame swap on a popover the
reader has just clicked open. Doing it in CSS as Svelte's docs prefer would mean duplicating a
captured stylesheet, because both palettes are keyed off `.emoji-mart-dark` in
`protradingroom-source.css`. Control seen red.

**medium** · `divergence` · reference byte **754,689**

```
Rh("emoji-mart ",o.darkMode?"emoji-mart-dark":"","")
```

**Ours:** apps/room/src/lib/components/EmojiPicker.svelte:475 hardcodes `class="emoji-mart emoji-mart-dark"`. The reference's class field (read at 744873) is `darkMode=!("function"!=typeof matchMedia||!matchMedia("(prefers-color-scheme: dark)").matches)` and the app leaves it at that default, so on a light-scheme machine the reference picker renders the light palette (`.emoji-mart{color:#222427;background:#fff}`) while ours is always dark. Both palettes are present in our imported CSS (apps/room/src/lib/styles/protradingroom-source.css carries `.emoji-mart-dark{`), so only the class decision differs.

> Verified: Our picker hardcodes the dark class; nothing in apps/room/src computes it from the color scheme. Searched (node_modules excluded) for: emoji-mart-dark, emoji-mart, matchMedia, prefers-color-scheme, darkMode/dark_mode, colorScheme/color-scheme, MediaQuery, svelte/reactivity, and "dark" within EmojiPicker.svelte.

### EMOJI-09 — No staged first render — we mount every emoji cell at once

**BUILT 2026-08-30.** Three categories committed, the last of them capped at sixty cells, with the
rest arriving on a bare `setTimeout` — `Math.min(categories.length, 3)` and
`categories[s-1].emojis = r.slice(0, 60)`, byte 747,768.

Capped by INDEX (`stagedCount - 1`) rather than by the literal 2, because that is what `s-1` means: a
picker with fewer than three categories caps whichever one is last.

**The timer is cleared on teardown, where upstream leaks it.** Closing the picker inside that first
frame would otherwise leave a callback writing to a destroyed component — harmless in Angular, a
warning here.

The contract mounts the picker and counts sections and cells across the two passes: exactly three
category sections with the third at sixty, then all nine with the cap lifted. Two controls seen red.

**medium** · `missing-behaviour` · reference byte **747,768**

```
const s=Math.min(this.categories.length,3);this.setActiveCategories(this.activeCategories=this.categories.slice(0,s));const r=this.categories[s-1].emojis.slice();this.categories[s-1].emojis=r.slice(0,60),setTimeout(()=>{this.categories[s-1].emojis=r,this.setActiveCategories(this.categories),this.ref.detectChanges()
```

**Ours:** apps/room/src/lib/components/EmojiPicker.svelte:597-630 renders `{#each EMOJI_DUMP_DATA.categories ...}` with every category and every entry on mount. apps/room/src/lib/emoji-data.ts contains 1821 `spritePosition` entries, so opening the picker creates ~1821 `ngx-emoji` spans plus their sprite style strings synchronously, where the reference commits 3 categories with the third capped at 60 cells (`this.categories[s-1].emojis=r.slice(0,60)` read at offset 747930) and expands the rest on a `setTimeout` + `requestAnimationFrame`.

> Verified: I tried to find a staged/deferred first render in our picker and there is none. `EmojiPicker.svelte:603` iterates `EMOJI_DUMP_DATA.categories` with no cap — no `activeCategories` window, no `Math.min(..., 3)` — and `:614` iterates `entriesFor(categoryIndex)`, which at `:331-336` returns `frequentEntries` for index 0 and `EMOJI_DUMP_DATA.c…

### EMOJI-10 — ExtraChatPane mounts the picker with the default popoverId, which no trigger advertises — the popover never positions

**FIXED 2026-08-30.** `<EmojiPicker popoverId="ngb-popover-extra" …>`, matching what the trigger
five lines up advertises.

The consequence was one of two, both bad: `portalPopover`'s
`document.querySelector('[aria-describedby="ngb-popover-3"]')` found NOTHING, leaving the popover at
the hardcoded inline `translate3d(483.5px, -52.5px, 0px)` it ships with — an arbitrary place on
screen — or, when the main column's picker was also open, it found THAT column's trigger and
positioned this popover over the wrong composer.

`AlertQaModal`, `ModalHost` and `NoteEditor` all pass a matching id. This was the one that did not,
which is why the row is a `defect`. Control seen red.

**medium** · `defect` · reference byte **1,359,452**

```
["container","body","autoClose","outside","popoverClass","popOverDiv",1,"dropdown-item",3,"click","shown","hidden","ngbPopover"]
```

**Ours:** apps/room/src/lib/components/ExtraChatPane.svelte:462 sets `aria-describedby={emojiOpen ? 'ngb-popover-extra' : undefined}` on the trigger, but :549 renders `<EmojiPicker onselect={(glyph) => (composer += glyph)} />` with no `popoverId`, so the popover element gets the default id `ngb-popover-3` (EmojiPicker.svelte:10). `portalPopover` then runs `document.querySelector('[aria-describedby="ngb-popover-3"]')` (EmojiPicker.svelte:428, and again at :445) and finds either nothing — leaving the popover at its hardcoded inline `translate3d(483.5px, -52.5px, 0px)` (EmojiPicker.svelte:466) — or, if the alert-chat composer picker is also open, AlertChatArea.svelte:954's trigger, which is the wrong element. AlertQaModal.svelte:331, ModalHost.svelte:4874 and NoteEditor.svelte:1134 all pass a matching id; ExtraChatPane is the one that does not.

> Verified: I could not refute it. ExtraChatPane's emoji trigger advertises `ngb-popover-extra` but the picker it mounts receives no `popoverId`, so the popover element carries the default id `ngb-popover-3`.

### EMOJI-12 — Preview clears immediately on mouseleave; the reference defers it one animation frame

**BUILT 2026-08-30.** `requestAnimationFrame` on `mouseleave`, `cancelAnimationFrame` on
`mouseenter`, at both hover sites — the search results and the category grid.

**The pair is the feature, not the deferral.** Sliding across a row fires `mouseleave` on one cell and
`mouseenter` on the next, in that order, so a synchronous clear flashes the idle preview between
every pair of cells — nine flashes crossing one line of the grid. Deferring by a frame and cancelling
on the way in means the preview only returns to idle when the pointer has actually left. Control seen
red.

**low** · `divergence` · reference byte **750,893**

```
handleEmojiLeave(){!this.showPreview||!this.previewRef||(this.animationFrameRequestId=requestAnimationFrame(()=>{this.previewEmoji=null,this.ref.detectChanges()}))}
```

**Ours:** apps/room/src/lib/components/EmojiPicker.svelte:566 and :615 both set `onmouseleave={() => (hovered = null)}` synchronously. The reference's rAF (paired with `cancelAnimationFrame()` in handleEmojiOver, read in the same slice) exists so sliding across a row does not flash the idle preview between cells.

> Verified: The rAF deferral is genuinely absent from our source. EmojiPicker.svelte is the only emoji picker in apps/room/src, and both of its hover sites clear the preview synchronously in the event handler: `onmouseleave={() => (hovered = null)}` at lines 570 and 622 (the claim's 566/615 are off by a few lines; actual lines verified).

---

## AlertChatArea.svelte

9 verified gaps; 42 reference behaviours confirmed present.

### acA-01 — The inline ALERT ENTRY textarea is not rendered — only the checkbox that is supposed to control it

**BUILT 2026-08-30 04:44 UTC.** The field, its two handlers and both halves of the toggle. The markup is `H2e` decoded with `app-alerts`' own consts (20 = `[1,"w-100","inline-alert-entry-field"]`, 52 = `["id","textAreaAlertHolder",1,"p-1"]`, 53 = the textarea), meeting the captured CSS that was already bridged and waiting for it. **The key rules are NOT the chat composer's** and are pinned in `lib/inline-alert-key.ts`: Enter posts, ALT+Enter is the newline, and SHIFT+Enter does nothing at all — `i.val(i.val())` after `preventDefault` is a no-op. A whitespace box clears without sending, because the clear is outside the guard. The paste routes to the ALERT path through the same pending-paste state and the same confirmation the chat composer uses, which is upstream's own shape — its subscriber is the post-alert modal. The row's second finding is closed too: `showAlertsEntry` is seeded and persisted, where ours was ephemeral. **One divergence:** upstream's subscriber calls the modal's `postAlert()`, so the inline box silently inherits whatever five checkboxes that modal was last left holding; this room posts a plain alert. `inline-alert-entry-contract.test.ts`.

**high** · `missing-control` · reference byte **2,044,139**

```
function H2e(t,n){if(1&t){const e=Y();d(0,"div",20)(1,"div",52,2)(3,"textarea",53),x("keyup",function(o){return D(e),E(g().onKey(o))})("paste",function(o){return D(e),E(g().onImagePaste(o))}),u()()()}}
```

**Ours:** AlertChatArea.svelte:516-529 renders the "Show inline alert entry" checkbox with bind:checked={alerts.inlineEntry}; alerts.svelte.ts:62/134-140 hold #inlineEntry. `grep -rn inlineEntry apps/room/src` returns exactly one reader outside alerts.svelte.ts and it is that bind — nothing renders the field. The consts are read at 2055637 (["id","textAreaAlertHolder",1,"p-1"]) and 2055712 (["name","txt-area-alert","id","textAreaAlertTxt","rows","1","spellcheck","true","placeholder","Type your alert here..",1,"txt-area-alert","form-control","border-0",3,"keyup","paste"]) and the wrapper class at 2053309 ([1,"w-100","inline-alert-entry-field"]); the gate is O(20,o.showAlertsEntry?20:-1) at 2056748. The scoped CSS for all three (#textAreaAlertHolder, .txt-area-alert, .inline-alert-entry-field) is emitted in the same styles block at ~2056900. Also: the reference persists showAlertsEntry (localStorage object key); ours is ephemeral $state with no persistence anywhere in apps/room/src.

> Verified: I could not find the inline ALERT ENTRY textarea anywhere in apps/room/src, under its own name or any rename. Searches run: `inlineEntry`, `inline-alert-entry`, `textAreaAlert`, `textAreaAlertHolder`, `textAreaAlertTxt`, `txt-area-alert`, `inline-alert-entry-field`, `showAlertsEntry`, `alertComposer`, `alertDraft`, `alertEntry`, `alertHol…

### acA-02 — Chat composer has no (paste) handler — a pasted screenshot cannot be posted to chat

**BUILT 2026-08-30 03:43 UTC.** `AlertChatArea.svelte` binds `onpaste` on `#textAreaTxt`, gated on `canPostImages` as the reference is (`if (!this.canPostImages) return !1`), and the confirmation in `RoomOverlays.svelte` reproduces the reference's dialog — preview `<img>`, a `#msg-text` textarea seeded from the composer, and that text posted with the image. The extra chat column deliberately gets none: the reference binds paste on the main composer only and its handler reads `#textAreaTxt` by id. The rule for WHICH image a paste carries moved to `lib/pasted-image.ts`, where it replaced three separate copies — and one of those, `PostAlertModal`'s, had drifted into taking the FIRST image where the reference takes the last, and into abandoning a whole paste on one item `getAsFile()` could not materialise. `chat-paste-image-contract.test.ts` executes the state machine and the filter.

**high** · `missing-behaviour` · reference byte **1,427,208**

```
("paste",function(o){return D(e),E(g().onImagePaste(o))})
```

**Ours:** The composer textarea at AlertChatArea.svelte:904-929 binds onfocus/oninput/onblur/onkeydown and NO onpaste. `grep -rn "onpaste|onImagePaste|clipboardData" apps/room/src` finds paste handling only in PostAlertModal.svelte:298, swing-alerts/SwingAlertForm.svelte:189 and day-trade-alerts/DayTradeAlertForm.svelte:205 — never on #textAreaTxt. The reference binds it on textarea const 64 inside d0e at 1427062.

> Verified: Could not refute. The chat composer textarea `#textAreaTxt` in AlertChatArea.svelte binds only `{@attach captureComposerElement}`, `bind:value`, `onfocus`, `oninput`, `onblur`, `onkeydown` — there is no `onpaste`.

### acA-05 — Private-chat button in the main chat column is rendered ungated, while the gate exists and the extra column uses it

**BUILT 2026-08-30, before this row was written down.** `AlertChatArea.svelte:243` takes `showPmButton` and `:791` gates the entry on it; `+page.svelte:1223` feeds it from `gates.showPmButton`, the same source `ExtraChatPane` has always used. Marked 2026-08-30 03:35 UTC by grepping the prop through all three files.

**high** · `missing-control` · reference byte **1,453,980**

```
O(9,o.showPMBtn?9:-1)
```

**Ours:** AlertChatArea.svelte:760-768 renders the "Open Private chat" <li> unconditionally — it takes no showPmButton prop (props list :189-233 has none) and +page.svelte:1140-1195 passes none. The gate IS built: gates.ts:362-370 `showPmButton` = (isPresenter || sessData.userPM || sessData.userToPresenterPM) && !(user.isFT && sessData.disablePMForTrials), and ExtraChatPane.svelte:320 gates on it with the comment quoting this exact O(9,…) line, fed from +page.svelte:1284. So a free-trial member in a room with disablePMForTrials sees the PM entry point in the main column and not in the extra one.

> Verified: I could not refute it. The gate exists (`gates.ts:362-370` `showPmButton`) but has exactly one consumer: ExtraChatPane.

### acA-04 — "Mod Only" chat filter checkbox has no counterpart anywhere in apps/room/src

**BUILT 2026-08-30.** The switch is per column on `RoomChat` (`filterChatMsgs = {modOnly, modOnlyExtra}`,
byte 981,131); the predicate is one `.filter` in `RoomFeeds.chatMessagesFor`, transcribed from byte
1,414,769 — the moderators' messages AND your own survive it, which reads like an oversight until
you try it, because a filter that hid what you had just typed looks like the send having failed. The
checkbox is the capture's const table 43/44/45 (byte 1,450,283) in `ChatSearchBar`'s extended
section, which this room had never rendered because nothing had ever been built to put in it —
`RoomChatSearch` now holds `showChatToolbarExtended` and both of the reference's toggles, and the
chat gear opens it rather than the settings modal, which is what `toggleChatToolbar()` binds
upstream (byte 1,435,047).

**Two divergences, both recorded at the code.** The id carries the column — `"mod-only"` occurs four
times in the bundle, twice per column, so a room with both bars open ships two elements with one id
and the extra column's `<label for>` operates the main column's checkbox. And the toggle does not
re-request page 0 of the log the way upstream's does: this filter is a view over rows already held,
so the refetch would only throw away the pages a reader had scrolled back to.

Contracts: `alert-chat-area-contract.test.ts` (the markup, the two ids, the held flag),
`chat.svelte.test.ts` (per-column switch), `feeds.svelte.test.ts` (the predicate, executed, including
over search results). Five negative controls seen red.

**medium** · `missing-control` · reference byte **1,423,104**

```
function X_e(t,n){if(1&t){const e=Y();d(0,"div",43)(1,"input",44),Ve("ngModelChange",function(o){D(e);const s=g(2);return He(s.appService.globals.filterChatMsgs.modOnly,o)||(s.appService.globals.filterChatMsgs.modOnly=o),E(o)}),x("change",function(){return D(e),E(g(2).toggleModOnlyFilter())}),u(),d(2,"label",45),v(3," Mod Only "),u()()
```

**Ours:** `grep -rn "modOnly|Mod Only|mod-only" apps/room/src` returns ZERO hits. Neither the control (id="mod-only") nor the filter state (filterChatMsgs.modOnly) nor the handler (toggleModOnlyFilter) exists; feeds.visibleChat is not filtered by sender role.

> Verified: I could not refute the claim. Reference verified by reading bytes: `function X_e` begins at exactly offset 1423104 in main.d1d09071be31f1ba.js and renders `input,44` two-way bound to `appService.globals.filterChatMsgs.modOnly` with a change handler `toggleModOnlyFilter()` and label text " Mod Only "; it belongs to component `app-chat` (se…

### acA-06 — Chat tab unread-count badge and presenter-only mention count are not rendered

**BUILT 2026-08-30.** `chat-tab-unread.ts` holds the arithmetic; `RoomChat` holds one map per
column, because the reference keeps a separate `unreadMsgs` on `app-chat` and on `app-extra-chat`
(bytes 1,429,032 and 2,375,500) and a shared map would clear the badge in the column that is *not*
showing the channel you opened. `events.svelte.ts` counts from the SSE frame — which already carries
`room` and a server-decided `isMention` — above the own-sender guard, where the reference's
subscription takes it. `ChatTabStrip` renders const 28 and the `text-danger` span inside it.

**One deliberate simplification.** Upstream states `globals.isPresenter` twice, once deciding whether
to count a mention and once deciding whether to draw it, so the second can never differ from the
first. It is stated once here, at the count, and the strip carries no role of its own —
`expect(strip).not.toContain('isPresenter')` is a contract assertion, because a strip that took the
role would be a second authority on a question the server answered.

Contracts: `alert-chat-area-contract.test.ts`, `chat.svelte.test.ts`. Four negative controls seen red.

**medium** · `missing-control` · reference byte **1,420,987**

```
function $_e(t,n){if(1&t&&(d(0,"span",28),v(1),H(2,H_e,2,1,"span",29),u()),2&t){const e=g().$implicit,i=g(2);m(),Ne("",i.unreadMsgs[e.name]," "),m(),O(2,i.appService.globals.isPresenter&&i.unreadMentions[e.name]?2:-1)}}
```

**Ours:** ChatTabStrip.svelte:38-55 renders only `{chatTabLabel(tab)}` inside each anchor; its `tabs` prop is `readonly string[]` (:32) so no per-tab count can reach it, and `counterBadge` has zero occurrences in apps/room/src. The consts are read at 1448969 ([1,"badge","badge-pill","badge-warning","ml-1","counterBadge"]) and immediately after ([1,"text-danger"]); H_e (the " (n)" mention span) is at 1420857; the per-<li> gate O(3,i.unreadMsgs[e.name]||i.unreadMentions[e.name]?3:-1) is inside z_e at 1421206.

> Verified: I could not refute it. The channel strip is rendered in exactly one place, ChatTabStrip.svelte, and its anchor body is `{chatTabLabel(tab)}` with no badge span; its `tabs` prop is `readonly string[]` (line 32), so no per-tab count can structurally reach it.

### acA-07 — The alerts archive control drops the !isLimitedPresenter half of its gate — and the file's own comment states the full gate

**FIXED 2026-08-30.** `{#if isPresenter && !isLimitedPresenter}` around
`#addon-chat-messages-archive`, fed from `+page.svelte` as `media.limitedPresenter`. The component
takes it as a prop and decides no role of its own.

This is the shape `CLAUDE.md` names outright — *"every comment claiming X is bounded/constant/checked
still matches the next line"* — and it did not: the comment eight lines above the gate had stated
both terms since the block was written. Somebody handed mic and screen at runtime satisfies
`isPresenter` (`giveMicScreen` assigns `globals.user.isPresenter = globals.isLimitedPresenter =
e.give`), so the room was offering them a control the reference withholds. Contract:
`alert-chat-area-contract.test.ts`, which walks the block rather than checking proximity. Control
seen red.

**medium** · `missing-control` · reference byte **2,043,456**

```
O(2,e.appService.globals.isPresenter&&!e.appService.globals.isLimitedPresenter?2:-1)
```

**Ours:** AlertChatArea.svelte:667 is `{#if isPresenter}` around #addon-chat-messages-archive, while the comment directly above it at :652-655 says "the archive control gated again on `isPresenter && !media.limitedPresenter`". The component receives only `isPresenter`, and +page.svelte:296 derives it as `data.user.role === 'staff' || data.user.role === 'admin'` with no limited-presenter term. `media.limitedPresenter` exists and is reactive (media.svelte.ts:122, 305-318) and is already threaded elsewhere (create-room.svelte.ts:342). A member handed mic+screen therefore gets an Archive Alerts button the reference withholds.

> Verified: I could not refute it. The `!limitedPresenter` half of the gate is applied nowhere on the alerts-archive path, under any name.

### acA-08 — Extra chat column: wrong container class, no roomSplitDir gate, and the desktop ttb/btt placement inside the inner split is not modelled

**BUILT 2026-08-30.** The reference has THREE forms and this room shipped a fourth that is none of
them — one ungated top-level area in every case, so a top/bottom room drew the second column beside
the presentation pane instead of below the chat one. All three are built now, over one shared
`<ExtraChatPane>` call: the phone's plain `alert-chat-box` area (`nRe`, byte 2,496,359, whose gate
carries **no direction term** — measured, not assumed), `H4e`'s top-level area with the
`alert-chat-box-extra-column` class and the nested split, and `j4e`'s `chat-box` area inside
`AlertChatArea`'s own split (byte 2,490,857).

**The arithmetic is the part that is not a transcription.** `as-split` treats `size` as a proportion
and normalises across however many areas there are; flex-basis percentages do not, so binding
`chatSize` to both inner chat areas verbatim would emit `alerts + chat + chat` and overflow the
stack. `RoomSplit.#innerScale` does the division `as-split` does for free.

The class ships despite having no CSS rule in any of this room's stylesheets and no reader in the
bundle, because its twin `alert-chat-regular` is in exactly the same position and this room already
ships that one. Contract: `extra-chat-column-contract.test.ts`, whose old two assertions were
rewritten — both were true of two forms out of three and neither could have caught this. Four
negative controls seen red.

**medium** · `divergence` · reference byte **2,490,857**

```
function j4e(t,n){if(1&t){const e=Y();d(0,"as-split-area",211)(1,"app-extra-chat",212),x("openPrivateChat",function(o){return D(e),E(g(3).showPrivateChat(o))}),u()()}2&t&&z("size",g(3).chatSize)
```

**Ours:** The reference has TWO sites: j4e is a FOURTH as-split-area INSIDE the inner alert-chat split (const 211 = .chat-box), gated in V4e's update block at 2491052 by `O(6,!e.appService.globals.preferences.extraChatColumn||"ttb"!==…roomSplitDir&&"btt"!==…roomSplitDir?-1:6)`; and H4e is a top-level third area of the OUTER split carrying const 207 `["minSize","0",1,"alert-chat-box","alert-chat-box-extra-column",3,"size","order"]` (read at 2545788), gated in K4e at 2493526 by `O(2,e.hideChatAlerts||!…extraChatColumn||"ltr"!==…roomSplitDir&&"rtl"!==…roomSplitDir?-1:2)`. Ours has only the top-level form: RoomShell.svelte:231 and :234 render it in both branches on `!hideChatAlerts && extraChatColumnVisible`, +page.svelte:560 defines extraChatColumnVisible as `prefs.extraChatColumn && !split.chatCollapsed` with NO roomSplitDir term, and +page.svelte:1273 gives the area `class="alert-chat-box as-split-area"` — the string `alert-chat-box-extra-column` has zero occurrences in apps/room/src. So in a top/bottom room the column lands beside the presentation area instead of below the chat pane, and the extra-column class hook never ships.

> Verified: I could not refute any of the three sub-claims. (1) roomSplitDir gate: our only gate is `+page.svelte:562` `const extraChatColumnVisible = $derived(prefs.extraChatColumn && !split.chatCollapsed)`, consumed at `RoomShell.svelte:231` and `:234` as `{#if !hideChatAlerts && extraChatColumnVisible}` — no direction term anywhere.

### acA-11 — The empty-tabs " Chat" brand label and the tab-strip <ul> presence gate are both absent

**BUILT 2026-08-30.** Both halves, because neither reads right alone: the brand grows
`{#if chatTabs.length === 0}<span>&nbsp;Chat</span>{/if}` (`j_e`, byte 1,420,732, gated at
1,453,850) and `ChatTabStrip` wraps its whole `<ul>` in `{#if tabs.length > 0}` (byte 1,453,947).
`&nbsp;` and not a space: it is `\xa0` in the capture and a plain space would be collapsed by the
surrounding whitespace.

The verifier's note — that the gap is unreachable while every room has two built-in channels — is
correct and is why this stayed `low`. It stops being unreachable the moment a room configures its
channels through `chatTabsWithBadges`, and the empty styled `nav-tabs` strip was already shipping.
Contract: `alert-chat-area-contract.test.ts`, including a mount that asserts no `<ul>` for an empty
list. Two controls seen red.

**low** · `missing-control` · reference byte **1,420,732**

```
function j_e(t,n){1&t&&(d(0,"span"),v(1,"\xa0Chat"),u())}
```

**Ours:** The chat brand at AlertChatArea.svelte:753-758 is the icon plus the DND badge and never the label, so with no channels configured the header shows a bare comment glyph. Reference gate O(5,0==o.chatTabs.length?5:-1) read at 1453850. Separately O(7,o.chatTabs.length?7:-1) at 1453947 suppresses the whole <ul> when there are no tabs, while ChatTabStrip.svelte:38 emits the `nav nav-tabs … chatTabs` list unconditionally (an empty styled <ul> in the header).

> Verified: Both controls are genuinely absent from our markup, but the gap is unreachable in practice and that must be stated with it. (1) The empty-tabs brand label: AlertChatArea.svelte:763-770 renders navbar-brand as `<i class="fas fa-comment">` plus the conditional DND badge only — no `&nbsp;Chat` span and no gate.

### acA-12 — Search and gear clicks are bound to the <a> in ours and to the <li> in the reference

**BUILT 2026-08-30.** All four toolbar toggles — search and gear, in both columns — now hang on the
`<li>`, which is what const 12 `[1,"nav-item","mx-1",3,"click"]` carries and const 13 does not (byte
2,055,851). The `mx-1` margin was dead space on a control people press many times a session.

**The private-chat button is left on its `<a>`, and that is the row's real content.** It is bound
there in BOTH applications (`W_e`, byte 1,421,660), so the difference is specific to these two
toggles; the contract asserts the PM click is on an anchor precisely so a later consistency pass does
not undo a measurement. Control seen red.

**low** · `divergence` · reference byte **2,055,851**

```
d(11,"li",12),x("click",function(){return D(s),E(o.toggleAlertsToolbarSearchOnly())}),d(12,"a",13),T(13,"i",14),u()(),d(14,"li",15),x("click",function(){return D(s),E(o.toggleAlertsToolbar())})
```

**Ours:** AlertChatArea.svelte:474-495 puts onclick on the anchors (:478 ontogglealertssearch, :491 ontogglealertstoolbar) inside plain <li>s, and the chat column does the same at :769-790. In the reference const 12 is `[1,"nav-item","mx-1",3,"click"]` and const 13 is `["title","Search",1,"nav-link","p-0"]` with no click — i.e. the whole nav-item including its mx-1 margin is the hit target, and the same shape repeats for the chat column at 1453244+ (d(10,"li",15) … d(13,"li",18)). Our hit area is smaller by the li padding. The private-chat button is bound on the <a> in BOTH (W_e at 1421660), so this is specific to the two toolbar toggles.

> Verified: I could not find the reference's binding shape anywhere in apps/room/src. In all three of our toolbars the click sits on the anchor inside a plain <li>, never on the <li>: AlertChatArea.svelte:484-491 (<li class="nav-item mx-1"> with the handler on <a title="Search" class="nav-link p-0" onclick={ontogglealertssearch}> at :488) and :492-50…

### ACA-01 — The chat composer's Enter rules are not the reference's: ALT+Enter posts where it should insert a newline, the typing signal runs on for five seconds after a send, and the emoji panel stays open

**BUILT 2026-08-30 22:40 UTC, and it corrects a claim this repository had written down backwards.** `onKey` is measured on BOTH compiled copies — `app-chat` at 1,439,821 and `app-extra-chat` at 2,386,131, identical but for the jQuery alias and the textarea id — and its partner `onKeydown(e){e.preventDefault()}` at 1,440,246, bound as `keydown.enter` on const 64/61, is the half that changes what the other half means: the browser's default is cancelled for every Enter, so nothing the browser does can insert a newline in this box. `onKey` then runs on keyup and decides. **Enter sends, ALT+Enter appends `"\n"`, SHIFT+Enter does nothing.** `#lib/chat-composer-key.js` holds the rule; `AlertChatArea.svelte` holds the wiring, because each of the three side effects has a different owner here.

**Three things this room did not do, in descending order of what they cost.** (1) `ALT+Enter POSTED THE MESSAGE` — our gate was `Enter && !shiftKey`, so a member reaching for upstream's newline modifier published instead. (2) `this.showTyping && this.refreshTypingStatus(!0)` runs before the branch on every Enter, and ours only stopped on `blur`, so the sender kept showing as typing to everyone in the channel for up to five seconds after their message had already arrived — `TypingSignal`'s debounce was the only thing that would ever have cleared it. (3) `this.showEmojiChooser = !1` is on the SEND branch alone, and a newline does not close it; ours left the picker up across a send. The third is `menus.set('emoji', false)` rather than a local flag because the page owns which panel is open across every column at once.

**The `\n` goes on the END of the value**, which is `i.val(i.val() + "\n")` transcribed rather than improved. Guessing a caret insertion would be inventing behaviour; ACA-02 covers the caret case.

Contract: `chat-composer-key-contract.test.ts`, which reads both `onKey` bodies out of the pinned bundle at run time rather than quoting them. Three negative controls seen red.

**high** · `missing-behaviour` · reference byte **1,439,821**

```
onKey(e){if(13==e.keyCode){e.preventDefault(),this.showTyping&&this.refreshTypingStatus(!0);const i=li("#textAreaTxt");e.shiftKey?(i.val(i.val()),this.autoExpand(e.target)):e.altKey?(i.val(i.val()+"\n"),this.autoExpand(e.target)):(this.showEmojiChooser=!1,this.sendMessage(),this.autoExpand(e.target))}else this.showTyping&&(0===li("#textAreaTxt").val().trim().length?this.refreshTypingStatus(!0):this.updateLastTypedTime())}
```

**Ours:** AlertChatArea.svelte's composer textarea bound `onkeydown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); … void onsend()… } }}` — one branch, no ALT term, no typing frame and no panel close. `onstoppedtyping` reached only `onblur`. The `else` half of upstream's handler — an emptied box counting as a stop — IS already built and is not part of this row: `TypingSignal.typed()` returns through `stop()` on a blank value, with the reference's own `"" == i.val()` condition quoted at it.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### ACA-02 — SHIFT+Enter: upstream swallows the keystroke, this room inserts a newline, and the inline alert box already reproduces the swallow

**OWNER DECISION.** The measurement is settled and the two boxes now disagree with each other on purpose, which is not a state to leave undocumented. Upstream's Shift branch in every composer that shares this rule is `i.val(i.val())` — a self-assignment after `preventDefault`, whose only observable effect is that the keystroke is eaten. `inline-alert-key.ts` reproduced it for the inline ALERT box in `acA-01` and argued for it: *"a presenter's muscle memory for this box is the reference's."* The chat composer is NOT following it, and `#lib/chat-composer-key.js` states why at the code: the alert box had no prior behaviour to take away, the chat composer has had Shift+Enter as its newline for as long as it has existed, and upstream's replacement — `i.val(i.val() + "\n")` on ALT — appends at the END of the value rather than at the caret, so a member editing the middle of a message would have the newline land somewhere else.

**What the owner has to answer:** whether the two composers should agree, and in which direction. Matching upstream everywhere costs the chat composer its caret newline. Matching this room everywhere costs the inline alert box a divergence `acA-01` deliberately took. Doing neither — which is where it stands — costs one line of explanation per box and nothing else, and is the only option of the three that is reversible.

**One-line correction that is not mine to make:** `src/lib/inline-alert-key.ts:33` says *"One column over, in the chat composer, **Shift+Enter is the newline**"* as a statement about the REFERENCE. It is true of this room and false of the bundle. That line should read "in the chat composer as this room ships it". The claim is annotated at the call site in `AlertChatArea.svelte` and asserted in `chat-composer-key-contract.test.ts`, which reads both `onKey` bodies rather than trusting either document.

**medium** · `divergence` · reference byte **2,386,131**

```
e.shiftKey?(i.val(i.val()),this.autoExpand(e.target)):e.altKey?(i.val(i.val()+"\n"),this.autoExpand(e.target)):(this.showEmojiChooser=!1,this.sendMessage(),this.autoExpand(e.target))
```

**Ours:** `chatComposerKeyAction` answers `'ignore'` for Shift+Enter and `chatComposerKeyPrevents` therefore answers `false`, so the browser inserts the newline at the caret. Shift is tested BEFORE Alt, which is upstream's own order, so Shift+Alt+Enter resolves to the Shift branch in both — the decision tree is transcribed and one leaf is changed.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### ACA-03 — The presenter's Poll indicator classes are on the `<li>`; the reference binds them to the `<a>` inside it, and the non-presenter entry beside them already wears one there

**BUILT 2026-08-30 22:40 UTC.** `Tt` is Angular's `classProp` and writes to whichever node the update block has SELECTED. `P2e`'s update block is `m(), Tt("poll-active-blink", …)("poll-active-indicator", …)` — an Ivy update block starts at index 0 and `m(n)` advances by `n`, so the bare `m()` moves from the `<li>` at 0 to the `<a>` at 1. **That arithmetic is not assumed:** `Bge` in `app-st-message` writes its first `z(…)` pair with no `m()` at all (node 0, the box) and its next after `m(4)` (node 4, `d(4,"a",10)`, the kebab), and the contract asserts both readings.

**The const table is the second, independent half of the proof.** Const 11 is `[1,"nav-item","mx-2"]` — a class list with no `3,` binding section — so the `<li>` cannot change class at runtime whatever the update block selects.

**Why it is visible rather than pedantic:** both rules paint the anchor's own box, and the NON-presenter poll entry a few nodes later already wears one of them statically on its anchor (const 27, `[1,"poll-active-blink",2,"cursor","pointer",3,"click"]`, which this room had right). So one control was drawing its indicator on the anchor for a viewer and on the anchor's parent for a presenter, differing by the `<li>`'s `mx-2` margin. `pollNavAnchorClasses` in `#lib/alert-chat-nav.js`. Two negative controls seen red.

**low** · `wrong-markup` · reference byte **2,041,385**

```
d(0,"li",11)(1,"a",23),x("click",function(){return D(e),E(g().doPollUI())}),T(2,"i",24),v(3," Poll"),u()()… m(),Tt("poll-active-blink",e.pollIsActive&&!e.pollIsMinimized)("poll-active-indicator",e.pollIsMinimized)
```

**Ours:** AlertChatArea.svelte rendered `<li class={['nav-item mx-2', { 'poll-active-blink': …, 'poll-active-indicator': … }]}>` with a bare `<a onclick={onopenpoll}>` inside it. The two conditions were already the reference's, including the `&& !polls.minimized` term on the blink; only the element was wrong.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### ACA-04 — Both compiled copies close the Webinar Mode block with a bare, class-less `<i>`; this room does not emit it

**MEASURED REFUSAL 2026-08-30 22:40 UTC, recorded at the code.** `e0e` (byte 1,424,607) and `Z3e` (2,371,066) are the same six calls, and the last of them is `T(4,"i")` — passing **no const index at all**, not an empty one. The element therefore carries no class, no attribute, no text and no binding.

**Nothing can style it.** There is no bare `i` type selector in `app.css`, none in `captured-runtime-components.css`, and none in the reference's own `styles.ee2a710065b60389.css` — asserted in the contract against all three sheets, with a positive control per sheet so a regex that matches nothing cannot pass quietly. It renders zero pixels and announces nothing to a screen reader. Emitting it would be markup with no consumer, which is the first defect `CLAUDE.md` names, and it is the same test `app-typing-indicator-dots` failed eight nodes below and `blinkingRec` passed.

Recorded rather than left out silently, so the next byte-for-byte comparison of this block finds the reason instead of the hole. `WEBINAR_MODE_TRAILING_ICON_REFUSED` in `#lib/alert-chat-nav.js`; contract in `alert-chat-nav-contract.test.ts`. One negative control seen red — inserting the element turns the assertion on the block's tail red.

**low** · `divergence` · reference byte **1,424,607**

```
function e0e(t,n){1&t&&(d(0,"div",24),v(1," Webinar Mode "),d(2,"span",56),T(3,"i",57),u(),T(4,"i"),u())}
```

**Ours:** AlertChatArea.svelte's webinar block ends at the tooltip `<span>`. The three nodes before it — the `px-1 webinarMode` div, the ` Webinar Mode ` text with both of its spaces, and the `ml-2` span carrying the const-56 tooltip verbatim — are all transcribed.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### ACA-05 — The extra chat column's composer binds `paste` upstream; the refusal recorded here rests on a measurement of one copy that the other copy contradicts

**BLOCKED — needs one file this session does not own.** `acA-02` built the chat paste handler and recorded, as its reason for giving the extra column none, that *"the reference binds paste on textarea const 64 (the main composer) and its handler reads `#textAreaTxt` by id, so a second column pasting through it would seed from the first column's box."* **Both halves are false of `app-extra-chat`.** Its composer const (61) is `["name","txt-area","id","textAreaTxtExtra","rows","1","spellcheck","true","placeholder","Type your message here..",1,"txt-area","form-control","border-0",3,"keyup","paste","keydown.enter","focus"]` — `paste` is in the binding section — `cMe` at byte 2,373,521 binds it, and that component's OWN `onImagePaste` at byte 2,392,023 reads `ui("#textAreaTxtExtra")`, not `#textAreaTxt`, behind the same `if(!this.canPostImages)return!1` guard. There is no shared box and no seeding across columns.

**This is the shape the document's own preface warns about, in the other direction:** a claim framed as a fact about "the reference" that was read off one of the two compiled copies. The rule for this surface is that both are read before a divergence is claimed, and here that was not done.

**What would unblock it, exactly.** `ExtraChatPane.svelte` needs an `onpasteimage: (file: File) => void` prop and an `onpaste` on its `#textAreaTxtExtra` textarea calling the same `pastedImageFrom(event.clipboardData?.items)` guarded by `canPostImages` that `AlertChatArea.svelte`'s `handleComposerPaste` already runs, fed from `+page.svelte` beside the main column's `onpasteimage={(file) => composer.beginImagePaste(file)}`. And `src/lib/chat-paste-image-contract.test.ts:346` asserts `expect(extraCode).not.toContain('onpaste')` with that false reason written above it at :343-345; that assertion has to be inverted and its comment replaced. Both files are owned by other agents this session.

**medium** · `missing-behaviour` · reference byte **2,373,521**

```
function cMe(t,n){if(1&t){const e=Y();d(0,"div",25)(1,"div",59,3)(3,"div",60)(4,"textarea",61),x("keyup",function(o){return D(e),E(g().onKey(o))})("paste",function(o){return D(e),E(g().onImagePaste(o))})("keydown.enter",function(o){return D(e),E(g().onKeydown(o))})("focus",function(o){return D(e),E(g().onTextareaFocus(o,"textAreaTxtExtra"))}),u()()…
```

**Ours:** `grep -n paste src/lib/components/ExtraChatPane.svelte` returns nothing. A member with the second column open and focused cannot post a screenshot at all, and the reason recorded for that is a reading of the wrong component.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### ACA-06 — The chat toolbar's extended section is missing all four of its controls, and `ChatSearchBar`'s own docblock names two of them wrongly

**BLOCKED — every one of them lives in `ChatSearchBar.svelte`, owned by another agent this session.** `acA-04` built the Mod Only checkbox into that bar's extended section and left the rest. Decoding `J_e` (byte 1,423,745) and `X_e` (1,423,104) end to end gives the whole list, and the extended state is TWO independent slots rather than one — `O(9, showChatToolbarExtended ? 9 : -1)` inside the input group and `O(10, showChatToolbarExtended ? 10 : -1)` beneath it:

* **Save chat messages** — `K_e` at 1,421,929, `span` const 38 (`id="addon-chat-save"`), click `It(18).downloadLog("chat")`. Inside the input group, beside the clear `×`. The ALERTS column's twin of this IS built.
* **Archive Chat Messages** — `q_e` at 1,421,800, `div` const 41 (`id="addon-chat-archive"`), click `archiveOptions()`, gated `O(2, isPresenter && !isLimitedPresenter ? 2 : -1)` — the same two-term gate `acA-07` restored on the alerts side.
* **Group Chat Control** — `Y_e` at 1,422,202, const 46 `[1,"dropdown","d-inline-block","m-1","group-chat-control"]`: a `btn-secondary dropdown-toggle btn-sm` button reading ` Group Chat Control `, over three `dropdown-item`s — `Regular Group Chat` / `Webinar Mode` / `Disable Group Chat` — calling `changeChatMode("g"|"p"|"d", event)` with a `fas fa-check-square me-1` tick whose `visible` class marks the current `sessData.chatMode`. Gated `O(4, !isPresenter && !user.hasMic || isLimitedPresenter ? -1 : 4)`.
* **Detach Chat** — `Q_e` at 1,422,956, const 53, `fa-window-restore` plus ` Detach Chat`, click `detachChat()`, gated `O(5, chatOnlyMode ? -1 : 5)`.

**The two copies differ here, and that is a finding rather than an aside.** `app-extra-chat`'s extended section (`Q3e`, byte 2,369,619) carries Mod Only and Group Chat Control and **stops** — there is no Detach Chat. The const tables agree: `app-chat` carries three entries `app-extra-chat` does not (47 and 53, the two forms of the Detach button, and 54, its `fa-window-restore` icon), which is exactly the offset by which every const from 48 onward shifts between the two tables. So the control belongs to the main column alone.

**A separate one-line correction, in the same file.** `ChatSearchBar.svelte`'s docblock says *"The save-chat and archive controls beside it (`Y_e` and `Q_e`, nodes 4 and 5 of `X_e`) are separate features and are still not built."* `Y_e` and `Q_e` are the Group Chat Control dropdown and the Detach Chat button; the save and archive pair is `K_e`/`q_e` at node **9 of `J_e`**, in the other slot entirely. The same docblock cites `X_e` "at byte 1,423,265"; `function X_e` begins at **1,423,104**. Four names, one offset — the note should read "The Group Chat Control dropdown and the Detach Chat button (`Y_e` and `Q_e`, nodes 4 and 5 of `X_e`, byte 1,423,104), and the save/archive pair (`K_e`/`q_e`, node 9 of `J_e`), are separate features and are still not built."

**medium** · `missing-control` · reference byte **1,423,104**

```
function X_e(t,n){if(1&t){const e=Y();d(0,"div",43)(1,"input",44),Ve("ngModelChange",…),x("change",function(){return D(e),E(g(2).toggleModOnlyFilter())}),u(),d(2,"label",45),v(3," Mod Only "),u()(),H(4,Y_e,16,9,"div",46)(5,Q_e,3,0,"button",47)}if(2&t){const e=g(2);…m(3),O(4,!e.appService.globals.isPresenter&&!e.appService.globals.user.hasMic||e.appService.globals.isLimitedPresenter?-1:4),m(),O(5,e.appService.globals.chatOnlyMode?-1:5)}}
```

**Ours:** `ChatSearchBar.svelte`'s extended block renders the Mod Only checkbox and closes. `grep -rn "group-chat-control|Detach Chat|addon-chat-save|addon-chat-archive|changeChatMode|archiveOptions" src` over the whole app returns ZERO hits for every one of the six names — the alerts column's `#addon-chat-save` and `#addon-chat-messages-archive` are different ids on a different toolbar, and the alerts column's Detach button is `detachAlerts`, a different command.

---

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

## PresentationArea.svelte

8 verified gaps; 56 reference behaviours confirmed present.

### PA-01 — No speech-reco staleness checker — a caption never clears after the room falls silent

**BUILT 2026-08-30.** `#lib/room/caption-staleness.ts` — `startSpeechChecker` transcribed, with
the interval and the window both at the reference's 7,000 ms, so a caption survives between 7 and 14
seconds of silence. `onCaption` arms it; going stale sends the null.

**The port's own TYPE was half the defect.** `setCurrentCaption: (caption: Caption) => void` cannot
express "the room went quiet", so nothing in this application could ever clear a caption and the last
line anybody spoke stayed pinned over the presentation area for the rest of the session. It is
`Caption | null` now, and the widening says so where it is declared.

The checker stops itself from inside the stale branch, which is upstream's own shape and is
load-bearing: a silent room holds no timer at all, in every room, presenting or not. Ten behavioural
tests in `room/caption-staleness.test.ts` drive a fake clock; two source assertions pin the two ends.
One control seen red.

**medium** · `missing-behaviour` · reference byte **1,956,753**

```
startSpeechChecker(){this.speechRecoInterval||(this.speechRecoInterval=setInterval(()=>{this.lastSpeechRecoEvent+7e3<Date.now()?(this.currentSpeechReco=null,this.showSpeechRecognition=!1,this.stopSpeechChecker(),console.log("speech checker NOT active.. stopping checker and hiding box")):console.log("speech checker running.. still active...")},7e3))}
```

**Ours:** Nothing in apps/room/src implements the 7000 ms window, `lastSpeechRecoEvent`, `speechRecoInterval`, `startSpeechChecker` or `stopSpeechChecker` — a grep of the whole of src for `7000`, `7e3`, `speechChecker` and `lastSpeechRecoEvent` returns only unrelated hits in lib/user-action-intent.ts:305,316. `currentCaption` is WRITTEN at routes/+page.svelte:522 (`setCurrentCaption: (caption) => (currentCaption = caption)`) and is never written back to null anywhere: the port's own type at lib/room/create-room.svelte.ts:176 is `setCurrentCaption: (caption: Caption) => void`, which cannot express null, and lib/room/create-room.svelte.ts:693-695 only ever forwards a caption. So the last line spoken stays pinned over the presentation area for the rest of the session. SpeechRecoOverlay.svelte:86 (`historyMode ? history.length > 0 : Boolean(current)`) reproduces the second half of `hasSpeechRecognitionEntries()` correctly and therefore keeps rendering it.

> Verified: The reference behaviour is genuinely absent from apps/room/src, and I confirmed both halves of the claim by reading rather than assuming. WHAT I SEARCHED (all under /home/user/trading-room-app/apps/room/src, .ts + .svelte, non-test and test):
- literals and names: `7000`, `7e3`, `= 7000`, `7_000`, `speechChecker`/`speech checker`, `startS…

### PA-02 — The overlay's close button does not persist `showSpeechRecoOverlay` and does not reset history mode

**BUILT 2026-08-30.** `hideSpeechRecognition()` on the page, all five statements: persist through
`prefs.save('showSpeechRecoOverlay', false)`, clear the caption, reset history mode, stop the checker.

**Two paths to one setting, and one of them was not a setting.** The X wrote `subtitles = false`
through a `$bindable`, which lands on a bare private-field write in `RoomPrefs` with no `save()` —
so dismissing the overlay was forgotten on reload, while the navbar checkbox for the SAME preference
persisted correctly. `subtitles` is a plain prop now with an `onhidespeechreco` callback beside it,
because the dismissal writes four pieces of state the component does not own.

The three statements that are easy to drop, because nothing visible depends on them at the moment
you press the button, are the ones recorded at the code: the caption goes, the checker stops (or a
timer keeps waking to clear a box nobody is shown), and history mode resets so re-enabling the
overlay later does not reopen it in the transcript view. Two controls seen red.

**medium** · `missing-behaviour` · reference byte **1,957,245**

```
hideSpeechRecognition(e){e.preventDefault(),e.stopPropagation(),this.appService.globals.preferences.showSpeechRecoOverlay=!1,this.appService.setPreference("showSpeechRecoOverlay",!1),this.showSpeechRecognition=!1,this.currentSpeechReco=null,this.lastSpeechRecoEvent=0,this.stopSpeechChecker(),this.speechRecoHistoryMode=!1}
```

**Ours:** PresentationArea.svelte:437 wires `onclose={() => (subtitles = false)}`, and `subtitles` is bound to `prefs.subtitles` at routes/+page.svelte:1223. The setter at lib/room/prefs.svelte.ts:508-510 is `set subtitles(next) { this.#subtitles = next; }` — a bare field write with no `save()` / `persist()` call, unlike the navbar checkbox path which does persist (lib/room/prefs.svelte.ts:629 maps `presentation-subtitles` -> `showSpeechRecoOverlay` and calls `this.save(...)` at :637). So dismissing the overlay with its X is forgotten on reload, and `speechRecoHistoryMode` is also left set (PresentationArea.svelte:438 only toggles it from the history button).

> Verified: I could not find the behaviour anywhere in apps/room/src under any name. The overlay's X calls only `onclose={() => (subtitles = false)}` (PresentationArea.svelte:437), which lands on `set subtitles(next) { this.#subtitles = next; }` (prefs.svelte.ts:508-510) — a bare private-field write with no `save()`/`persist()`.

### PA-03 — The two screenshare info toasts are absent — "… started screen sharing" and "Connecting to …"

**HALF BUILT 2026-08-30 — both toasts built, the loading state refused with the reason.**

Both `info()` calls are in `addRemoteScreen`, and WHERE is the whole of it. "Connecting to …" goes
BEFORE `consume()`, which is what makes it a connecting notice rather than a second arrival notice:
building the consumer is a round trip to the SFU and this is the only feedback a viewer gets while it
happens. "… started screen sharing" goes INSIDE `if (remote)`, because a null `remote` is the dedupe
path the server's at-least-once `newProducer` requires — outside it, the toast fires once per
`getProducers` snapshot.

Upstream's `e.uid != globals.user.id` guard is already spent here: `addRemoteScreen` returns above
for this peer's own producer, for the stronger reason that consuming yourself is a server refusal.

**`screenLoading` / `callingScreenName` / `screenPresenter` / `screenPresenterAvatar` are NOT built.**
They drive a loading placeholder whose markup is quoted nowhere in this row or in the bytes it cites,
and a spinner invented rather than read is not something this repository ships. That is a separate
row when somebody reads `app-presentationarea`'s loading branch, not something to guess at now.
Contract: `presentation-area-contract.test.ts`, one control seen red.

**medium** · `missing-behaviour` · reference byte **1,960,202**

```
appEventBus.subscribe("addScreenStream",e=>{"screen"==e.mode&&this.alertsService.info(e.userName+" started screen sharing")}),this.appService.appEventBus.subscribe("callingScreenStart",e=>{e.uid!=this.appService.globals.user.id&&this.alertsService.info("Connecting to "+e.nick+"..."),this.screenLoading=!0,this.screenPresenter=this.callingScreenName=e.nick,this.screenPresenterAvatar=e.avt||e.pic})
```

**Ours:** A grep of the whole of apps/room/src for the literals `started screen sharing` and `Connecting to ` returns nothing, and for `screenLoading`, `callingScreen`, `callingScreenStart` and `addScreenStream` returns nothing. Four of the reference's constructor fields therefore have no counterpart — `screenLoading`, `callingScreenName`, `screenPresenter`, `screenPresenterAvatar` (defaults read at 1954419) — and neither toast is raised: a viewer gets no notice that a screen arrived and no "connecting" feedback while the consumer is being built. Our ScreenPane.svelte and lib/room/media-transport.svelte.ts carry no equivalent loading state.

> Verified: I tried hard to find a renamed counterpart and could not. Searches over apps/room/src (all .ts/.svelte, including tests and comment prose): the literals `started screen sharing`, `Connecting to `, `Connecting` (only hits are the session-login button label at routes/session/+page.svelte:483 and its contract test); the reference field names…

### PA-04 — `#notes` has no empty state — the "No Notes to display…" heading and its " New Note " button are absent from the pane

**BUILT 2026-08-30.** `LSe` transcribed — the `<h3>No Notes to display...</h3>` and the
`btn btn-small btn-primary` button — as a SLOT of the host beside the pane, which is what the
reference has (`H(44,LSe,5,0,"div")(45,zSe,6,0)` at byte 2,015,227, gated `O(44, sessionNotes ? 45 :
44)`) rather than a branch inside `NotesPane`.

`btn-small` is Bootstrap 3's spelling and does nothing under the Bootstrap this room ships. It is the
capture's, and a class list is evidence, so it is reproduced rather than corrected to `btn-sm`.

The button goes through a new `RoomNotes.requestNewNote()` rather than writing the gate in markup,
because the gate is the interesting half: a viewer who may READ notes but not edit them must not be
handed an editor, and at one of two call sites in markup that rule is one refactor from being
dropped. `mountNewNoteLink` now calls the same method. Two controls seen red.

**medium** · `missing-behaviour` · reference byte **1,927,385**

```
function LSe(t,n){if(1&t){const e=Y();d(0,"div")(1,"h3"),v(2,"No Notes to display..."),u(),d(3,"button",119),x("click",function(){return D(e),E(g().newNote())}),v(4," New Note "),u()()}}
```

**Ours:** The gate exists in the reference as `O(44, o.appService.globals.sessionNotes ? 45 : 44)` (read at byte 2017944 inside the update block), i.e. slot 44 is `LSe` and slot 45 is the real pane. PresentationArea.svelte:724-770 renders `div#notes` with a single `{#if noteGates.surfaceVisible}<NotesPane …/>{/if}` and no `{:else}`, and NotesPane.svelte:304-352 renders `ul#notesTabs` with `{#each notes …}` and `div#notesTabsContent` with `{#if activeNote !== null}` — so a room whose notes have not loaded (or that has none) shows an empty `<ul>` and an empty `<div>`, with no heading and no in-pane creation affordance. A grep of the whole of src for `No Notes to display` returns nothing. The strip's cog dropdown still offers New Note (MainTabStrip.svelte:185-187 via `notes.mountNewNoteLink`), so this is a missing empty state rather than a lost capability.

> Verified: I could not refute it. The reference pair is real and I re-read all three anchors myself: `LSe` at byte 1927385 renders `div > h3 "No Notes to display..."` plus `button[119]` labelled " New Note " wired to `g().newNote()`; the container declaration at byte 2015227 reads `d(43,"div",24),H(44,LSe,5,0,"div")(45,zSe,6,0),u()` (so slot 44 is t…

### PA-05 — `app-webcam-holder` is rendered on mobile, where the reference host omits it entirely

**BUILT 2026-08-30.** `{#if !split.isMobileScreen}` around the strip.

Measured on both hosts rather than inferred from one: the mobile host `Z4e` (byte 2,495,149) has four
children and none is `app-webcam-holder`, while the desktop host `q4e` (2,492,999) has five and puts
it first. A phone's presentation column is short and the reference keeps its height for the
presentation.

`previewWindowsVisible` was never standing in for this — it is a presenter-facing hide-all switch,
which is why the gap survived. Control seen red.

**medium** · `divergence` · reference byte **2,495,149**

```
function Z4e(t,n){if(1&t&&(d(0,"as-split-area",225),H(1,Y4e,7,1,"div",213)(2,Q4e,1,0,"app-positions-container"),T(3,"app-presentationarea",214),H(4,J4e,3,2,"button",215),u()),2&t){const e=g(2);z("size",e.presAreaSizeMobile),m(),O(1,e.modMessage&&e.appService.globals.isPresenter?1:-1)
```

**Ours:** The mobile host has four children and no `app-webcam-holder`; the desktop host `q4e` (2492999) has five and puts it first. Ours renders one component for both: PresentationArea.svelte:415-419 renders `<WebcamStrip …/>` unconditionally, and RoomShell.svelte:227-235 renders the SAME `presentationPane` snippet in both the `{#if split.isMobileScreen}` branch and the desktop branch, so there is no path that drops the strip. `previewWindowsVisible` (routes/+page.svelte:219, default true) is a presenter-facing hide-all switch, not a viewport gate. On a phone this costs the strip's vertical space in a column the reference deliberately keeps for the presentation.

> Verified: I could not refute this. There is no viewport gate on the webcam strip anywhere in apps/room/src, in markup, in props, or in CSS.

### PA-06 — Host child order: `app-webcam-holder` is node 1 in the reference, third in ours

**FIXED 2026-08-30.** The strip is the first child of the split area, before the moderator bar and
the positions iframe, which is node 1 in `q4e`. Contract pins all four siblings in order, so the next
component added between them cannot quietly reorder the three.

Visual and reading order only, as the row says — the four siblings are block-level in a flex column.
That is exactly why it needs a test: nothing about the rendered page looks wrong either way, so the
fix is one refactor from being silently undone. Control seen red.

**low** · `divergence` · reference byte **2,492,999**

```
function q4e(t,n){if(1&t&&(d(0,"as-split-area",208),T(1,"app-webcam-holder"),H(2,$4e,7,1,"div",213)(3,z4e,1,0,"app-positions-container"),T(4,"app-presentationarea",214),H(5,W4e,3,2,"button",215),u())
```

**Ours:** PresentationArea.svelte emits, in source order inside `<as-split-area class="presentation-box">`: ModeratorMessage at :400, PositionsContainer at :408-414, WebcamStrip at :415-419, `<app-presentationarea>` at :420, PositionsControls at :951-957. So the reference's 1/2/3 becomes 2/3/1 — the camera strip lands under the moderator bar and the positions iframe instead of above them. The component's own comment at :399 cites `$4e` as being rendered "before app-presentationarea", which is true but does not settle the webcam strip's slot. Visual and reading order only; the four siblings are block-level in a flex column, so nothing else changes.

> Verified: The literal sibling order divergence is REAL and I could not find it built anywhere. `WebcamStrip` is imported once (PresentationArea.svelte:53) and rendered once (PresentationArea.svelte:415), third among the five children of `<as-split-area class="presentation-box as-split-area">` (opens :382, closes :958): ModeratorMessage :400, Positi…

### PA-07 — The speech-reco overlay is the LAST child of `.mainPresentationAreaHolder` in the reference, the first in ours

**FIXED 2026-08-30.** The overlay is the holder's final child, after the tab strip, the panes, the
two players and the `<audio>` — which is where `H(89,u2e,9,7,"div",52),u())` puts it at byte
2,016,249.

Paint order never cared (`z-index: 9999`). **Tab order did**: the overlay's three `z-index: 10000`
buttons — transcript, history, close — came before the whole tab strip in the DOM, so a viewer
tabbing into the presentation column met the caption controls before anything they were there to use.
The file's own comment argued correctly for putting the overlay INSIDE the holder and never said
where in it; both facts are recorded together now. Control seen red.

**low** · `divergence` · reference byte **2,016,249**

```
H(86,n2e,1,2,"app-ytplayer",49)(87,i2e,1,1,"app-scplayer",50),T(88,"audio",51),H(89,u2e,9,7,"div",52),u())
```

**Ours:** The `u()` immediately after node 89 closes `.mainPresentationAreaHolder`, so the overlay is its final child, after ytplayer/scplayer/audio; its gate is `O(89,o.hasSpeechRecognitionEntries()&&o.showSpeechRecognition&&o.appService.globals.hasSpeechRecognition?89:-1)` at byte 2018393. PresentationArea.svelte:431-441 renders `<SpeechRecoOverlay>` FIRST inside `.mainPresentationAreaHolder`, before MainTabStrip (:455). Paint order is unaffected (`.speech-reco-overlay` is `position:absolute; z-index:9999`, component styles at 2018622), but the overlay's two `z-index:10000` buttons — transcript, history, close — now come before the whole tab strip in DOM and tab order. The file's own comment at :422-430 argues for placement inside the holder, correctly, but does not record that the reference puts it last.

> Verified: Verified on both sides. In the reference the caption overlay is the LAST child of the holder: at byte 2016327 the create block ends `H(89,u2e,9,7,"div",52),u())`, immediately after `H(86,n2e,...,"app-ytplayer",49)(87,i2e,...,"app-scplayer",50),T(88,"audio",51)` (read at 2016100-2016500), and `u2e` is the overlay (defined at byte 1952943:…

### PA-08 — Pane order inside `#mainTabsContent`: videoplayer sits after the two trade-alert panes in ours, before them in the reference

**FIXED 2026-08-30.** Videoplayer, then swing, then day-trade, then files — slots 47/48/49/50.

The row's sharpest observation is the one that makes this worth doing: `MainTabStrip` already kept
the reference's order, so **the strip and the content were ordered differently from each other**. Only
one pane carries `show active` at a time, so nothing was visibly misplaced; what it cost was tab and
reading order, and a slot-by-slot diff against the reference that stopped lining up two thirds of the
way down. Control seen red.

**low** · `divergence` · reference byte **2,017,654**

```
O(47,o.hideVideoPlayer&&!o.isP||o.isP?47:-1),m(),O(48,o.hasSwingTradeAlerts?48:-1),m(),O(49,o.hasDayTradeAlerts?49:-1),m(),z("ngClass",ct(61,Hr,"presAreaTabs-files"==o.selectedMain
```

**Ours:** Reference pane order in `div#mainTabsContent` is screens(37), streams(40), notes(43), recordings(46), videoplayer(47), swingAlerts(48), dayTradeAlerts(49), files(50). Ours (PresentationArea.svelte) is screens(:469), streams(:647), notes(:724), swingAlerts(:781), dayTradeAlerts(:823), videoplayer(:858), files(:885) — videoplayer moved after the two alert panes. Only one pane carries `show active` at a time so nothing is visibly misplaced; it matters for tab/reading order and for anyone diffing the two templates by slot. Note the tab STRIP does keep the reference order (MainTabStrip.svelte:214 videoplayer, then swing, then day trades), so the strip and the content are ordered differently from each other.

> Verified: Confirmed in both directions; I could not refute it. Reference creation block puts videoplayer (slot 47, factory `owe`) BEFORE swingAlerts (48, `vwe`) and dayTradeAlerts (49, `Iwe`), immediately followed by the files div at slot 50.

---

## PollPanel.svelte

8 verified gaps; 56 reference behaviours confirmed present.

### poll-01 — No sound is played when a poll arrives for answering

**BUILT 2026-08-30.** `playSoundEffect('fileShare')` in the page's delivery effect, gated on
`prefs.doNotDisturbOn` — the same gate every other arrival sound in this room uses, and upstream's
own (`globals.preferences.doNotDisturbOn || soundEffects.fileShare.play()`, byte 2,507,038).

The row's real finding is the one it states in passing: the key was declared, the file shipped, the
sound was loaded on every page, and `grep -rn fileShare src` found **no caller anywhere**. The call
sits inside the `'open'` branch rather than beside it — upstream's `gotPoll` never reaches the viewer
who wrote the poll (`i.senderUID != globals.user.userXrefID`, byte 1,024,082) and `deliver` refuses
that person plus two more, so a sound with no panel behind it would be a noise nothing explains.
Contract: `poll-panel-contract.test.ts`, with a control seen red.

**medium** · `missing-behaviour` · reference byte **2,507,038**

```
Service.appEventBus.subscribe("gotPoll",i=>{this.appService.globals.preferences.doNotDisturbOn||this.soundEffectsService.fileShare.play(),this.appService.guiEventBus.emit("doPollModal",{mode:"answer",
```

**Ours:** apps/room/src/routes/+page.svelte:621 is the whole of our poll-arrival path — `if (polls.deliver(data.activePoll, data.user.id)) modals.modal = 'poll';` — and it plays nothing. `fileShare` is DECLARED in apps/room/src/lib/sound-effects.ts:8 and mapped to '/assets/sound/fileShare.mp3' at :27 (and the file exists at apps/room/static/assets/sound/fileShare.mp3), but `grep -rn fileShare apps/room/src` outside sound-effects.ts returns nothing: no caller anywhere. The doNotDisturb gate our siblings use (RoomOverlays.svelte:442 for qaAlert) has no poll counterpart.

> Verified: I tried to find a poll-arrival sound under any name and could not. Our entire poll-arrival path is the effect at /home/user/trading-room-app/apps/room/src/routes/+page.svelte:623 — `if (polls.deliver(data.activePoll, data.user.id)) modals.modal = 'poll';` — and the decision it delegates to, `RoomPolls.deliver` (/home/user/trading-room-app…

### poll-02 — A poll ending elsewhere does not close an open panel

**BUILT 2026-08-30.** `RoomPolls.deliver` returns a verdict — `'open' | 'ended' | null` — and the
page closes the poll modal on `'ended'`.

**The row is really about state versus events, and that is why a boolean could not have carried it.**
The reference has `case "pollDone": emit("pollDone")` (byte 1,024,082) and a subscription wired once
for the component's life (2,106,987); this room has `data.activePoll` going null, which is true both
of a room that has never had a poll and of a poll that ended a moment ago. The first must NOT close
anything — a presenter builds a poll with `activePoll` null, so a verdict from the steady state would
shut the setup panel on the pass that opened it — so the TRANSITION is what is detected, on a field
of its own.

That field is not `#deliveredId`, and the distinction is the one an obvious implementation gets
wrong: `#deliveredId` is cleared for three reasons that are not "the poll ended" — you wrote it, you
already answered it, this browser has shown it once — so the author of a poll, for whom `deliver`
always returns `null`, would never be told their own poll had gone. Two of the six behavioural tests
are exactly those two people, and the control that reads the transition off `#deliveredId` fails both.

Behaviour: `room/polls.svelte.test.ts`. The page's half: `poll-panel-contract.test.ts`, which also
pins the `modals.modal === 'poll'` guard, because `closeActive()` closes whatever is open.

**medium** · `missing-behaviour` · reference byte **2,106,987**

```
pollChoicesTotals),this.calcPieData()}}),this.appService.appEventBus.subscribe("pollDone",()=>{this.hidePanel()})),this.showPanel()})
```

**Ours:** When the presenter ends the poll our server clears it and `data.activePoll` becomes null. apps/room/src/routes/+page.svelte:621 only calls `polls.deliver(null, id)`, which (apps/room/src/lib/room/polls.svelte.ts:99-103) clears `#deliveredId` and `#minimized` and returns false — it never sets `modals.modal = null`. `modals.closeActive()` (modals.svelte.ts:146-155) is reached only from the user's own close button. PollPanel's `mode`, `pollQuestion` and `pollChoices` are local `$state` assigned once in `resetModeForOpen` (PollPanel.svelte:139-158) and are not recomputed from `activePoll`, so an answerer who has not yet voted keeps a fully interactive panel for a poll that no longer exists; `sendAnswer` (:280-287) would then POST `sendPollAnswer` against it.

> Verified: I could not find any counterpart in apps/room/src. The only path from `data.activePoll` to the modal layer is the `$effect` at src/routes/+page.svelte:620-624, which can only SET `modals.modal = 'poll'`; the null branch of `RoomPolls.deliver` (src/lib/room/polls.svelte.ts:99-103) clears `#deliveredId` and `#minimized` and returns false, s…

### poll-03 — Pie-slice labels are placed on a container-relative ellipse, not at 0.8 of the pie radius

**FIXED 2026-08-30.** The labels are placed in PIXELS at `PIE_LABEL_RADIUS` (0.8, the reference's
`radius: .8` from `EB` at byte 2,104,707) times the pie's radius, from the measured centre of the
chart box.

The defect was two expressions in different units describing one circle: the pie was drawn on
`min(w,h)/2 - 10` and the labels placed at 32% of the box in each axis, on a box that is `width:
100%` by a fixed `height: 300px`. One `pieRadius()` answers both now, and the contract counts the
expression so it stays one. Control seen red.

**low** · `wrong-constant` · reference byte **2,104,707**

```
const EB={series:{pie:{show:!0,innerRadius:0,label:{show:!0,radius:.8,color:"#FAFAFA",formatter
```

**Ours:** apps/room/src/lib/components/PollPanel.svelte:446-454 (`labelStyle`) positions each label at `left = 50 + cos(angle) * 32` percent and `top = 50 + sin(angle) * 32` percent of the #pollPieChart box. The box is 100% wide by a fixed 300px tall, so 32% is ~173px horizontally and ~96px vertically — an ellipse — whereas the reference's `radius: .8` places labels on a CIRCLE at 0.8 x the pie radius (our own pie radius at PollPanel.svelte:427 is `min(width,height)/2 - 10`, so 0.8 x that = ~112px in both axes). The percentage 32 appears nowhere in the reference; I searched the bundle for `radius:.8` (found only at 2104767, inside EB) and for the literal `32` in that object (absent).

> Verified: Our label placement is genuinely container-percentage based and unrelated to the pie radius. PollPanel.svelte:446-454 computes `left = 50 + cos(angle)*32` and `top = 50 + sin(angle)*32` and emits them as `%` of #pollPieChart, whose box is declared `width: 100%; height: 300px` at PollPanel.svelte:736-739 — so the label ring is an ellipse (…

### poll-07 — Dragging does not snap (jQuery UI snap:true)

**BUILT 2026-08-30.** Both axes go through `clampAndSnap` from `#lib/panel-drag.js`, which is where
the private chat and the webcam holders already got their snap — this panel is the one floating panel
in the room that rolls its own pointer handling, and it was the one without it.

`SNAP_TOLERANCE` is jQuery UI's own 20px and is now read from one place rather than copied. The
cross-element half of `snap: true` — snapping to every other snappable element — needs a registry
this application does not have, and `panel-drag.ts` has recorded that gap since it was written, once,
for all four panels rather than four times. Control seen red: one axis left unsnapped.

**low** · `missing-behaviour` · reference byte **2,108,197**

```
initDrag(){$("#pollModalCompHolder").draggable({appendTo:"body",containment:".wrapper",handle:"#pollPanelTitlebar",cursor:"move",scroll:!1,snap:!0,cancel:"input, textarea, button, select, .poll-panel-controls"})
```

**Ours:** apps/room/src/lib/components/PollPanel.svelte:341-364 (`movePointer`, drag branch) clamps the panel to the wrapper rectangle — that is `containment: ".wrapper"` — but there is no snapping to other `.ui-draggable` elements at all. `grep -rn snap apps/room/src/lib/components/PollPanel.svelte` returns nothing. `handle`, `cursor:"move"` (via the .poll-panel-titlebar CSS), `scroll:!1` (pointer events, no scroll) and the full `cancel` list (:257 DRAG_CANCEL) are all present.

> Verified: I could not refute this. PollPanel.svelte's drag branch clamps only — `panelLeft = Math.min(bounds.left + bounds.width - panelWidth, Math.max(bounds.left, pointerState.left + dx))` and the matching `panelTop` — with no tolerance band and no snap of any kind.

### poll-08 — Choice input commits on keydown, reference on keyup

**FIXED 2026-08-30.** `onkeyup`, which is what the const table binds (`"keyup.enter"`, byte
2,113,811).

Not a one-frame difference: holding Enter repeats `keydown`, so the input added a choice per repeat.
Control seen red.

**low** · `divergence` · reference byte **2,113,811**

```
.e. Up, Down, Sideways)",1,"form-control",3,"ngModelChange","keyup.enter","ngModel"]
```

**Ours:** apps/room/src/lib/components/PollPanel.svelte:586-589 binds `onkeydown={(event) => { if (event.key === 'Enter') addChoice(); }}`. The reference binds `(keyup.enter)`. Observable difference is one frame plus behaviour under key-repeat: holding Enter on ours adds a choice per repeat, on the reference only on release.

> Verified: Our PollPanel binds the choice-commit to keydown; the reference const table binds keyup.enter, and nothing in our tree supplies keyup timing for this control. Searched exhaustively: `grep -rn "keyup"` over apps/room/src returns only RoomSidebar.svelte:643 (onkeyup={onusersearchkey}) and ModalHost.svelte:5620 — nothing in PollPanel; `pollC…

### poll-09 — No localStorage "savedPolls" legacy migration

**DELIBERATE DIVERGENCE, recorded 2026-08-30.** The row argues its own disposition and the
argument holds: saved polls are a server table here (`saved_polls`, `schema.ts:382`), written by
`savePoll` / `deleteSavedPoll` and loaded with the page. The reference's `loadPollsFromStorage()` is a
ONE-SHOT migration that promotes a legacy `localStorage` array to the server and then deletes the key
— and there is no legacy `localStorage` array in this application to promote, because this
application never wrote one.

Building it would mean reading a key nothing has ever written, and the `deleteSavedPoll` shape
differs besides: by row id here, by array index plus a full JSON resend there.

**low** · `missing-behaviour` · reference byte **2,111,310**

```
Polls",{savedSessionPolls:JSON.stringify(e)}),this.savedPolls=e,this.appService.localstorage.deleteKey("savedPolls")
```

**Ours:** Saved polls are a server table in this app: apps/room/src/lib/server/db/schema.ts:382 (`saved_polls`), loaded at apps/room/src/routes/+page.server.ts:629-635 and written by the `savePoll` / `deleteSavedPoll` form actions (:1408, :1432); the panel receives them as the `savedPolls` prop (PollPanel.svelte:30). There is no `localStorage` read of the key "savedPolls" anywhere — `grep -rn "'savedPolls'" apps/room/src` hits only the tab id at PollPanel.svelte:549 and :668. Deliberate: the reference's one-shot LS→server migration has no legacy data to migrate here, and deleteSavedPoll is by row id rather than array index + full JSON resend.

> Verified: The reference behaviour is real and I read it: at offset 2111003 the bundle defines `loadPollsFromLS(){try{return JSON.parse(this.appService.localstorage.get("savedPolls",[]))}catch{return[]}}`, and `loadPollsFromStorage()` immediately after promotes a non-empty legacy list to the server (`sendServerCommand("savedSessionPolls",{savedSessi…

### poll-10 — savePollResults() has a formatter but no Blob/saveAs download

**MEASURED REFUSAL, recorded 2026-08-30.** There is no user-facing control in the reference to
reproduce. The audit's own reader read all nine template functions (`ATe`/`PTe`/`RTe`/`ITe`/`OTe`/
`NTe`/`LTe`/`BTe`/`UTe`, 2,101,231–2,104,700) and **none binds `savePollResults`**; const entry 48 is
a click-less duplicate of entry 52, used only as the `ɵɵconditional` placeholder. So the reference
ships the method and no way to reach it, and the row's own verdict was *"a divergence, not a missing
user-facing control"*.

`formatPollResultsDownload` stays. It is the transcription of the reference's payload — results text
plus `"\n\nUser Responses:\n"` plus the archive rows — and deleting it would delete the evidence
rather than the dead code. Its only importer is its test, which `dead-export-contract.test.ts`
records as a real reader in as many words: *"a symbol only a test reads is still read, and excluding
tests would have condemned every constant a contract test pins."*

Inventing a download button the reference does not offer is the other direction, and it is not this
document's job to decide it — that is an owner question, not a gap.

**low** · `divergence` · reference byte **2,112,115**

```
var s="Poll Results ",r=new Blob([e],{type:"text/plain"});s+=(new Date).toDateString(),kTe.saveAs(r,s+".txt",!0)
```

**Ours:** apps/room/src/lib/poll-behavior.ts:114-125 (`formatPollResultsDownload`) reproduces the exact payload — results text + "\n\nUser Responses:\n" + archive rows in the `n: [nick - xref ]: choice` form (:100-112) — but nothing constructs a Blob or calls saveAs: `grep -rn "saveAs|file-saver" apps/room/src` returns nothing, and the function's only importer is apps/room/src/lib/poll-behavior.test.ts:12. This matches the reference's own reachability: I read all nine template functions (ATe/PTe/RTe/ITe/OTe/NTe/LTe/BTe/UTe, 2101231-2104700) and none binds savePollResults; consts entry 48 (2115154 region) is a click-less duplicate of entry 52 used only as the ɵɵconditional placeholder. Recorded as a divergence, not a missing user-facing control.

> Verified: I could not find any Blob/saveAs download of poll results anywhere in apps/room/src, and the claim as written is accurate. What I searched (all under /home/user/trading-room-app/apps/room/src unless noted):
1.

### poll-11 — Responses textarea has no trailing newline; redraw is rAF not a 100 ms timer

**HALF BUILT 2026-08-30 — (a) fixed, (b) refused with the reason.**

**(a) The trailing newline is real and is fixed.** The reference appends one row at a time and each
row carries its own `"\n"` (byte 2,106,688), so the box always ends in one; `formatVisiblePollResponses`
joined instead and lost the last character. The empty case stays the empty string rather than
becoming a lone newline, which a bare `+ '\n'` would have made it. Control seen red.

**(b) The 100 ms re-plot is refused, and the row itself supplies the reason.** `setTimeout(() =>
this.calcPieData(), 100)` exists because flot must re-MEASURE its container after a display change.
This room draws to a canvas, which keeps its bitmap across `display: none`, and its redraw is an
`$effect` on `panelWidth`/`panelHeight`/`pieData` scheduling a `requestAnimationFrame`. A maximise
changes a dimension and redraws one frame EARLIER than the reference; a restore-from-minimise changes
neither and needs no redraw. Reproducing the timer would be adding a delay to work around a
measurement this implementation does not have to make.

**low** · `divergence` · reference byte **2,106,688**

```
nses+=this.total+": ["+i.senderNick+" - "+i.x+" ]: "+s+"\n",$("#responsesTxt").append(this.total+": ["+i.senderNick+"]: "+s+"\n")
```

**Ours:** Two small timing/format divergences in one row. (a) apps/room/src/lib/poll-behavior.ts:88-98 (`formatVisiblePollResponses`) builds the ON-SCREEN rows in exactly the reference's short form `${index+1}: [${senderNick}]: ${choice}` — correctly NOT the longer archive form — but `.join('\n')` omits the trailing newline the reference's per-row append leaves. (b) The reference re-plots with `setTimeout(()=>this.calcPieData(),100)` after restore and after maximize when mode=="results" && total>0 (read at 2109067); ours has no such call in `restorePanel` (PollPanel.svelte:184-198) or `toggleMaximize` (:211-231) — the redraw comes from the `$effect` at PollPanel.svelte:474-497 which subscribes to panelWidth/panelHeight/pieData and schedules `requestAnimationFrame(drawPieChart)` (:495). A maximize changes panelWidth so it does redraw, one frame earlier; a plain restore-from-minimize changes neither dimension and does not redraw, which is safe for us (a canvas keeps its bitmap across display:none) where flot needed the re-measure.

> Verified: I could not refute this row; I confirmed both reference quotes by reading the bytes and then failed to find either behaviour anywhere in apps/room/src. (a) TRAILING NEWLINE — genuinely absent, and pinned absent.

---

## FilesPane.svelte

7 verified gaps; 51 reference behaviours confirmed present.

### FP-01 — Opening the Files MAIN tab does not refetch the file list

**BUILT 2026-08-30.** `#lib/room/main-tab-refetch.ts` — `onMainTabChange`'s two refetches, in the
one place every write to `mainTab` passes.

**The interesting half is the FIRST PASS**, and it is why this is a class rather than an `$effect`
reading `mainTab` directly. An effect runs once at mount with whatever tab the room opened on, so a
refetch there would fire a second load on top of the one that just delivered the page — for every
viewer, on every navigation. Upstream cannot have that problem: its version is a click handler and
there is no such thing as running it for the initial value. The first call seeds and returns false,
exactly as `RoomArrivals.fresh` does.

The reference's two commands — `getSessionFiles()` and `loadVideos()` — collapse into one
`invalidate('room:data')`, which is not a simplification: this route has a single `+page.server.ts`
load that builds files and the video state together, and a caller trying to be narrower would be
inventing a second source of truth for `data.files`. The Refresh button already records that
argument. Two controls seen red.

**low** · `missing-behaviour` · reference byte **1,968,369**

```
"presAreaTabs-files"==this.selectedMainTab&&this.getSessionFiles()
```

**Ours:** Read at 1968369 in `onMainTabChange(e)` — selecting the Files main tab re-runs `getSessionFiles()` (and the videoplayer tab re-runs `loadVideos()`). Our main tab strip only assigns the tab: `onclick={() => (mainTab = 'files')}` at src/lib/components/MainTabStrip.svelte:331 (and :348 / :354 for the dropdown paths); grep for `getSessionFiles`, `invalidate`, `refresh` across MainTabStrip.svelte returns nothing. The list is only refreshed by the 5s `invalidate('room:data')` poll and by the Refresh button (FilesPane.svelte:253), so a viewer who opens the pane sees data up to 5s stale rather than a fetch on open. Functionally covered by the poll, which is why this is not high.

> Verified: Opening the Files main tab genuinely does not trigger a file-list refetch in our source. MainTabStrip.svelte's Files handlers assign `mainTab` (and toggle the cog dropdown) and nothing else; FilesPane.svelte contains zero `$effect`, zero `onMount` and zero `{@attach}`, so becoming visible runs no code; `mainTab` is a plain `$state` in +pa…

### FP-03 — Active pane class string is emitted in a different order than the reference helper produces

**FIXED 2026-08-30.** `tab-pane fade show active`, which is what `Hr = t => ({"show active": t})`
(byte 1,916,418) produces over const 29's static `tab-pane fade`.

Same class SET either way, so nothing renders differently; what it costs is a byte-for-byte DOM diff
against a capture, which reports it as a difference and sends somebody looking. Free to match.
Control seen red.

**low** · `divergence` · reference byte **1,916,418**

```
Hr=t=>({"show active":t})
```

**Ours:** Read at 1916418; the pane binds it at 2017799 (`z("ngClass",ct(61,Hr,"presAreaTabs-files"==o.selectedMainTab))`), and const 29's static class is `tab-pane fade`, so the rendered attribute is `tab-pane fade show active`. src/lib/components/FilesPane.svelte:84 emits `'tab-pane fade active show'`. Same class set, different attribute text — a byte-for-byte DOM diff against a capture reports it.

> Verified: I could NOT refute this: FilesPane.svelte:84 really does emit 'tab-pane fade active show', and I found no helper, no test and no doc anywhere in apps/room/src that emits the reference-helper order for this pane. Searched for showActive/SHOW_ACTIVE/paneClass/tabPaneClass (no hits), read files-pane-contract.test.ts (its only #files-root ass…

### FP-05 — Tab click handler is duplicated on both the <li> and the <a>; the reference has it on the <li> only

**FIXED 2026-08-30.** The anchor's `onclick` is gone from all three tabs; the `<li>`'s stays, which
is where const 31/33/36 put the listener while 32/34/35 carry `ngClass` and nothing else.

The anchor click bubbled to the `<li>`, so the handler ran twice per click. The assignment is
idempotent, so nothing observable broke — **which is exactly why it would have stayed**. The
`onkeydown` stays and is deliberate: the reference's anchors are not keyboard operable and ours are,
so this row's fix is not "make the anchor inert". Control seen red.

**low** · `divergence` · reference byte **2,015,447**

```
d(53,"a",32)(54,"span"),v(55,"Files")
```

**Ours:** Read the whole strip at 2015380-2015900: the listener is `x("click",...)` attached after `d(52,"li",31)` etc., and const 32/34/35 (read at 1996545) carry only `ngClass` — the anchors have NO click and NO keydown. FilesPane.svelte:96 puts `onclick` on the `<li>` (correct) AND FilesPane.svelte:108/135/162 put the same `onclick` on the `<a>`, plus an `onkeydown` at :109/:136/:163. The anchor click bubbles to the li, so the handler runs twice per anchor click; the assignment is idempotent so nothing observable breaks. The keydown is a deliberate keyboard-operability addition (the reference's anchors are not keyboard operable).

> Verified: I tried to refute this and could not. Our source really does carry the same tab-select click on BOTH the `<li>` and the `<a>`, three times over, and nothing anywhere in apps/room/src removes, extracts or justifies the anchor half.

### FP-06 — onFileTabChange's console.log side effect is not reproduced

**MEASURED REFUSAL, recorded 2026-08-30.** The row states its own disposition — *"a debug
`console.log` left in a shipped bundle; recorded for completeness, not something to add"* — and it is
right.

Kept as a row rather than deleted because the value of having read it is knowing that
`onFileTabChange` does NOTHING ELSE: the reference's tab change is an assignment and a log, so the
absence of any other side effect on that path is confirmed rather than assumed. That is what a
`missing-behaviour` row is worth when the behaviour is a log line.

**low** · `missing-behaviour` · reference byte **1,960,015**

```
onFileTabChange(e){console.log("tab",e),this.selectedFileTab=e}
```

**Ours:** Read verbatim at 1960015. Ours assigns straight through the setter — FilesPane.svelte:96/123/150 write `files.fileTab = …`, and the setter is src/lib/room/files.svelte.ts:175-177 with no logging. A debug `console.log` left in a shipped bundle; recorded for completeness, not something to add.

> Verified: Could not refute. I read the reference bytes myself: at offset 1960015 the bundle reads verbatim `onFileTabChange(e){console.log("tab",e),this.selectedFileTab=e}ngAfter` (token occurs 4x; this is the first).

### FP-09 — Search term is trimmed here and is not trimmed in the reference's filter pipe

**DELIBERATE DIVERGENCE, recorded 2026-08-30.** The reference's `filter` pipe lower-cases the term
and does not trim it (read verbatim at byte 1,914,488), so typing a single space filters the list to
rows whose text happens to contain a space — most of them, and unpredictably. Ours trims, so a
whitespace-only query is an empty query and the list is unchanged.

Both are answers to a query nobody means to type. Ours is the one whose result a person can predict,
and reproducing the other would mean writing a filter that treats the space bar as a search term. The
divergence is one character of code and this paragraph is the whole of it; nothing else in the pipe
differs — any string-valued own property, case-insensitive substring, empty term returns the list.

**low** · `divergence` · reference byte **1,914,488**

```
transform(e,i){return e?i?(i=i.toLowerCase(),e.filter(o=>{let s=!1;return"string"==typeof o?o.toLowerCase().indexOf(i)>=0:(Object.keys(o).forEach(r=>{let a=o[r];"string"==typeof a&&a.toLowerCase().includes(i)&&(s=!0)}),s)})):e:[]}
```

**Ours:** Read verbatim at 1914488 (registered `name:"filter"` at 1914797). It lower-cases the term and does NOT trim it, so typing a single space filters to rows whose text contains a space. src/lib/room/files.svelte.ts:259 does `this.#fileSearch.trim().toLowerCase()`, so a whitespace-only query matches everything instead. Everything else matches: any string-valued own property, case-insensitive substring, empty term returns the list unchanged.

> Verified: Confirmed divergence; I could not find any implementation in our source that omits the trim. The reference `filter` pipe (read verbatim at offset 1914488, registered `name:"filter"` at offset 1914797, composed into the files table at offset 1951092 as `pt(rg(16,9,Ct(15,6,e.sessionFiles,e.filesSearch),e.fileSortField,e.fileSortDir))`) does…

### FP-12 — In-file comments cite const numbers that do not match THIS bundle

**FIXED 2026-08-30, and the fix is a test rather than an edit.**

The row is not "a comment has a typo". The citations named `app-presentationarea.full.js`, one of the
thirteen reference-capture roots **this repository does not hold**, so every index in them was
unverifiable by anybody but their author while reading as verified. Three were wrong: the
Stop-Playing-For-All glyph is const **157** and was cited as 158; the two alert-sound buttons are
**267** and **269** (with **260**/**261** the click-less placeholders and **268** the bell) and were
cited as 261/262/263; the `pe="button"` typo is on **261 and 269** and was cited as 263.

Every transcribed VALUE was correct, which is the part worth stating: the comments were right about
what the reference does and wrong about where to look, and the second is what a reader checks.

`files-pane-rows-contract.test.ts` decodes the component's const table out of the pinned v4 bundle
and asserts all six entries, so a renumbering in a future capture goes red instead of quietly making
the comments wrong again. The sentences saying which numbers were stale are kept — a correction with
no record of what it corrected is one somebody re-derives. Control seen red.

**low** · `wrong-constant` · reference byte **1,946,166**

```
function Lwe(t,n){if(1&t){const e=Y();d(0,"button",241),x("click",function(){return D(e),E(g().stopMp3ForAll())}),T(1,"i",157),v(2,"Stop Playing For All "),u()}}
```

**Ours:** Read verbatim at 1946166: the Stop-Playing-For-All icon is const 157, and `[1,"fa","fa-play-circle","mr-2"]` sits at 2004368. Our comment at FilesPane.svelte:276 says 'its const 158'. Likewise FilesPane.svelte:507 says the two alert-sound buttons are 'consts 261/262/263'; in this bundle they are 260/261 (no-click) and 267/269 (with click), with 268 the bell icon — read in the row views at 1947897 (`d(0,"button",267)...T(1,"i",268)`) and 1948105 (`d(0,"button",269)...T(1,"i",144)`). Every transcribed VALUE is correct; only the index citations are stale, consistent with those comments citing the absent `app-presentationarea.full.js` capture rather than this bundle. The same class of staleness applies to the `full.js:NNNN` line numbers throughout the file and to `docs/decoded/files-sort-bar.md`, neither of which exists in this checkout and neither of which I could verify.

> Verified: I could not refute it. The const-index citations in FilesPane.svelte's comments genuinely do not match this bundle, and I confirmed it by reading both bundles rather than trusting the claim.

### FP-13 — Row/tab classification reads a stored `kind` column, not contentType at render time

**HALF BUILT 2026-08-30 — the divergence is kept and is now applied consistently, which is what
the row actually found.**

Deciding once at upload (`kindForContentType` → `shared_files.kind`) rather than testing a string at
four render sites is the better shape and stays. What the row caught is that **the divergence was
three-quarters applied**: the row filter, the tab counts and the Play button read `kind`, while
`alertSoundButtonFor` alone still ran `contentType.indexOf('audio/')`.

That is a substring test where `kindForContentType` uses `startsWith`, so the two parted company on a
type like `application/x-audio/foo` — a row **absent from the Sounds tab and offered the
Set-Alert-Sound button anyway**. One pane, two answers to one question. The gate reads `kind` now and
`FileRow` no longer carries `contentType` at all, so the second predicate is unwritable rather than
merely absent.

The remaining half is upstream's own: a row whose content type changes after upload is not
reclassified here. Nothing in this application changes it — it is written once by the uploader — so
that is a property of the schema rather than a gap. Control seen red.

**low** · `divergence` · reference byte **1,949,656**

```
function e2e(t,n){if(1&t&&(d(0,"tr"),H(1,Zwe,24,17),u()),2&t){const e=n.$implicit,i=g(2);m(),O(1,"files"==i.selectedFileTab&&e.hasOwnProperty("contentType")&&-1==e.contentType.indexOf("image/")&&-1==e.contentType.indexOf("audio/")||"images"==i.selectedFileTab&&e.hasOwnProperty("contentType")&&e.contentType.indexOf("image/")>=0||"sounds"==i.selectedFileTab&&e.hasOwnProperty("contentType")&&e.contentType.indexOf("audio/")>=0?1:-1)}}
```

**Ours:** Read verbatim at 1949656. The reference discriminates at render from `contentType` with `indexOf(...)>=0` (substring anywhere) and additionally guards `hasOwnProperty('contentType')`. Ours stores the decision once at upload — `kindForContentType` uses `startsWith` (src/lib/server/file-storage.ts:38-41), written into `shared_files.kind` (src/routes/files-pane.remote.ts:246) — and the template/gates read `item.kind` (FilesPane.svelte:395 via `matchesFileTab`, files.svelte.ts:235-237; and :431, :452, :481, :495). Identical for well-formed content types; they part company only for a value like `application/x-image/foo`, and a row whose contentType changes after upload is not reclassified. The one place we kept the reference's own test is `alertSoundButtonFor`, which still uses `contentType.indexOf('audio/') < 0` (src/lib/files-gates.ts:82) — so the pane mixes the two predicates.

> Verified: Could not refute. I searched apps/room/src exhaustively for any render-time contentType classification (grep for `contentType`, `indexOf(`, `image/`, `audio/`, `startsWith`, `hasOwnProperty`, `matchesFileTab`, `countFiles`, `kindForContentType`, `sharedFiles`) and the claim holds line for line.

---

## ModalHost: connectivity / AV test modal

5 verified gaps; 61 reference behaviours confirmed present.

### CONN-01 — The entire "Mobile App" tab is absent: tab button, body, and the `restoreMobileAppTokens` server command

**ALREADY BUILT — verified by reading 2026-08-30 17:01 UTC, not rebuilt.** All three exist: the tab (`fa-mobile-alt me-1`, between Network Test and Mic Test, where upstream puts it), `MobileRestorePane.svelte` as the body — `PAe` at byte 2,438,242 transcribed whole, **including the reference's own missing full stop after "notifications"**, which is now asserted rather than trusted because it is the kind of thing a well-meaning edit repairs — and `onrestoremobiletokens` reaching the server command. The audit was produced against an earlier tree.

**One divergence stands and it is the one that creates CONN-02's problem:** the tab is behind `mobileAppAvailable`, where upstream draws it unconditionally. That gate is right — a room with no mobile app has nothing for Restore Connectivity to restore — and it is what made the empty-modal branch necessary below.

**high** · `missing-control` · reference byte **2,445,023**

```
onTabChange(e){e!==this.activeTab&&("mic"===this.activeTab&&this.cleanupMicTest(),this.activeTab=e)}restoreMobileAppTokens(){this.appService.sendServerCommand("restoreMobileAppTokens",{}),bootbox.alert("Command sent successfully, check your mobile device for a test notification")}
```

**Ours:** ModalHost.svelte:775 declares `let activeConnectivityTab = $state<'network' | 'mic'>('network')` — there is no third tab in the union. ModalHost.svelte:5635-5658 renders exactly two `<li class="nav-item">` entries (Network Test, Mic Test). ModalHost.svelte:5660/5714 branch on those two only. Grep over apps/room/src for `restoreMobileAppTokens`, `mobile-app-container`, `Restore Connectivity` and `fa-mobile-alt` returns ZERO hits (the only 'Mobile App' matches are the unrelated sidebar 'Mobile App Info' PIN item at RoomSidebar.svelte:251 and the navbar 'Launch in Mobile App' at RoomNavbar.svelte:243). The reference body is one blurb plus one `btn btn-primary` labelled ' Restore Connectivity ' (icon `fas fa-sync-alt me-1`, container `.mobile-app-container`, consts at offsets 2453564/2453625, click handler at 2438516). Note: apps/room/docs/source-v4-2026-08-15/README.md:69 already records `mobile-app-container · mobile · restoreMobileAppTokens · fa-mobile-alt` as strings ADDED in v4, so this is a v4 feature we never transcribed. Also note it is a push-token restore action, not a connectivity test.

> Verified: I could not find any implementation of the Mobile App tab in apps/room/src, under its own name or any rename. ModalHost.svelte:795 declares `let activeConnectivityTab = $state<'network' | 'mic'>('network')` and ModalHost.svelte:859 `onConnectivityTabChange(tab: 'network' | 'mic')` — a two-member union with no third member; the tablist at…

### CONN-02 — For a non-presenter the reference modal has NO tab we render — Mobile App is its only tab and its default; ours shows them the Network tab instead

**BUILT 2026-08-30 17:01 UTC.** `z("ngIf", globals.isPresenter)` on BOTH `H(9,hAe,…)` and `H(14,pAe,…)` at byte 2,456,395, with only the Mobile App `li` between them unconditional. This room had it the other way round — Network Test open, Mic Test gated — so a member could run the WebRTC connectivity test, which the reference never exposes to one.

**Diagnostic rather than privileged**, so this is defence in depth rather than a hole being closed, and it is worth saying so plainly. The BODY and the footer's Start Test button carry the same term as the tab, for the reason SC-17 records: a gate on the way IN is not a statement about what the thing is for.

**And it forced an answer to a case upstream cannot have.** With the Mobile App tab behind `mobileAppAvailable` (CONN-01's recorded divergence) and Network Test now behind `isPresenter`, a member in a room with no mobile app would have opened this modal onto NOTHING. An empty modal is a control whose only effect is that it opened. It says why it is empty instead — the same reasoning as SC-14's Refresh button: **a divergence forced by an earlier divergence of ours is still ours to answer for.**

**medium** · `missing-behaviour` · reference byte **2,456,395**

```
2&i&&(m(5),O(5,o.appService.globals.isPresenter?5:6),m(4),z("ngIf",o.appService.globals.isPresenter),m(2),Tt("active","mobile"===o.activeTab),m(3),z("ngIf",o.appService.globals.isPresenter)
```

**Ours:** Read at offset 2456395 (update block) together with the create block at 2456100: `H(9,hAe,4,2,"li",8)` (Network Test tab) and `H(14,pAe,4,2,"li",8)` (Mic Test tab) are BOTH behind `ngIf isPresenter`; only the inline `d(10,"li",9)` Mobile App tab is unconditional. Ours inverts the first of those: ModalHost.svelte:5636-5646 renders the Network Test tab unconditionally and only ModalHost.svelte:5645-5657 (`{#if isPresenter}`) gates the Mic Test tab. A non-presenter in our build therefore sees and can run the WebRTC test, which the reference never exposes to them.

> Verified: I could not find a presenter gate on the Network Test tab anywhere in apps/room/src. The reference gates BOTH the Network Test tab and the Mic Test tab behind ngIf isPresenter and leaves only the Mobile App tab unconditional; our ModalHost renders the Network Test tab unconditionally, has no Mobile App tab in this modal at all, and applie…

### CONN-03 — Initial-tab rule is not conditional on isPresenter

**BUILT 2026-08-30 17:01 UTC.** `this.activeTab = globals.isPresenter ? "network" : "mobile"` at byte 2,444,097, in the reference's constructor. This was the bare literal `'network'` — the one tab a non-presenter is not allowed to see at all once CONN-02 is applied, which is why the two had to be built together. `untrack`, because it is a seed: the member then clicks, and a reactive read would drag them back to the default on the next refetch.

**medium** · `missing-behaviour` · reference byte **2,444,097**

```
this.isPlayingBack=!1,this.playbackAudio=null,this.activeTab=this.appService.globals.isPresenter?"network":"mobile"}ngOnInit(){this.setupModalResetListene
```

**Ours:** ModalHost.svelte:775 `let activeConnectivityTab = $state<'network' | 'mic'>('network')` — a constant initial value with no presenter branch, and the `$effect` that runs when the modal opens (ModalHost.svelte:1969-1978) resets test state but never sets the tab. Downstream of CONN-01: with no 'mobile' tab there is nothing for a non-presenter to default to.

> Verified: Not built, and I could not find it under any other name. Our initial tab is a bare literal: ModalHost.svelte:796 `let activeConnectivityTab = $state<'network' | 'mic'>('network')`, with no presenter term anywhere in its lifetime.

### CONN-04 — Modal title is hard-coded; the reference swaps it on isPresenter

**BUILT 2026-08-30 17:01 UTC.** `O(5, isPresenter ? 5 : 6)` between `dAe` (` Connectivity/Mic Troubleshooter `) and `uAe` (` Connectivity Troubleshooter `) at byte 2,433,777. The row's own observation is the reason it is not cosmetic: the title promised a mic troubleshooter to a viewer who — correctly, even before CONN-02 — could not see one.

**medium** · `missing-behaviour` · reference byte **2,433,777**

```
function dAe(t,n){1&t&&v(0," Connectivity/Mic Troubleshooter ")}function uAe(t,n){1&t&&v(0," Connectivity Troubleshooter ")}function hAe(t,n){if(1&t){const e=Y();d(0,"li"
```

**Ours:** ModalHost.svelte:5628 `title="Connectivity/Mic Troubleshooter"` — one literal. The reference selects between the two template fns with `O(5,o.appService.globals.isPresenter?5:6)` (read at offset 2456395), so a non-presenter is shown ' Connectivity Troubleshooter ' — no '/Mic' — which is consistent with them having no Mic tab. Ours promises a mic troubleshooter to a viewer who (correctly, per ModalHost.svelte:5645) cannot see one.

> Verified: I could not disprove it. Our connectivity modal passes a single string literal `title="Connectivity/Mic Troubleshooter"` to `Modal`, and `Modal.svelte` renders `{title}` verbatim (line 128) — the `header` snippet that could override it is NOT passed by the connectivity modal (it passes only `title`, `titleClass`, `titleTag`, `beforeBody`,…

### CONN-07 — Second sidebar label variant 'Connectivity/Mic Check' is not rendered anywhere

**MEASURED REFUSAL 2026-08-30 17:01 UTC.** The literal is genuinely absent and the row's own last sentence is the disposition: *"only relevant if the second shell is a surface we are meant to build."* It is not. The bundle carries TWO shells with different labels for the same target, and the one this room implements is the other — `RoomSidebar.svelte` matches its label, icon and span at bytes 2,470,954 / 2,534,049 / 2,572,801 exactly.

The shell that says `Connectivity/Mic Check` is `app-closed-session-page`, which this room does not build at all: a closed room here is answered by `session/+page.server.ts` with the close message, which is a deliberate architectural difference recorded with `room_state.closed_message`. Adding one label out of a page we do not render would be a string with no surface. **Unblocked by** a decision to build that shell, at which point its whole sidebar comes with it and this label is one line of it.

**low** · `missing-behaviour` · reference byte **2,576,810**

```
d(36,"li",26)(37,"a",27),T(38,"i",28),d(39,"span",29),v(40,"Connectivity/Mic Check"),u()()(),d(41,"li",26)(42,"a",30),T(43,"i",31),d(44,"span",29),v(45,"General Settings"),u()()(),
```

**Ours:** RoomSidebar.svelte:290-297 renders `title="Connectivity Check"`, icon `fas fa-network-wired`, `<span class="pl-2">Connectivity Check</span>` — matching the reference's OTHER shell (label at offset 2470954, consts at 2534049 and 2572801). The bundle carries two shells with different labels for the same target; we implement one. Grep for 'Connectivity/Mic Check' across apps/room/src returns zero. Cosmetic, and only relevant if the second shell is a surface we are meant to build.

> Verified: I could not refute it: the literal 'Connectivity/Mic Check' is genuinely absent from our source. Searched apps/room (not just src) for the exact literal, 'Connectivity/Mic', case-insensitive 'mic check'/'miccheck'/'mic-check', '/Mic' and 'Mic/', plus the shell that owns it ('app-closed-session-page', 'closed-session', 'closedSession', 'se…

---

## day-trade-alerts + swing-alerts panes

5 verified gaps; 72 reference behaviours confirmed present.

### dta-01 — Edit button does not flash the composer form (`animated flash`, 500 ms) in either pane

**BUILT 2026-08-30 17:19 UTC, in both panes.** `#lib/flash-on-edit.ts`, worn by both forms as `{@attach flashOnEdit(flashNonce)}`.

**The row's last sentence is the whole reason upstream spends an animation on this**, and it survived the build: the composer sits ABOVE a table that can be scrolled past it, so pressing Edit on row forty fills a form the presenter cannot see. Without the flash the button reads as broken — they press it again, and the second press overwrites the draft the first one made.

An ATTACHMENT rather than an `$effect` or jQuery, which is what `CLAUDE.md` names as the Svelte 5 replacement for imperative DOM plumbing, and the official docs were read on it: *"Attachments are functions that run in an effect when an element is mounted to the DOM or when state read inside the function updates"*, and *"they can return a function that is called before the attachment re-runs"*. Both halves are load-bearing here.

**A COUNTER and not a boolean**, and the control on it was seen red: with a boolean, Edit pressed twice inside 500 ms leaves the value already `true`, nothing re-runs, and the FIRST timer strips the class off the SECOND flash — the presenter presses Edit, sees nothing, and is back to the defect.

**medium** · `missing-behaviour` · reference byte **1,988,722**

```
ii(".day-trade-alert-form").addClass("animated flash");const s=setTimeout(()=>{ii(".day-trade-alert-form").removeClass("animated flash"),clearTimeout(s)},500)
```

**Ours:** apps/room/src/lib/components/day-trade-alerts/DayTradeAlertsPane.svelte:135-137 — `requestEdit(row)` only does `draft = dayTradeAlertDraftFrom(row)`; the swing twin does the same at apps/room/src/lib/components/swing-alerts/SwingAlertsPane.svelte (same `requestEdit` shape). `grep -rn "animated flash" apps/room/src` returns exactly one hit, apps/room/src/lib/components/RoomNavbar.svelte:327 (the recording indicator) — nothing in either pane, either form, or any .ts module. Neither pane's comments record the flash as a deliberate omission, so it is unrecorded rather than declined. The swing half of the same behaviour is at bundle byte 1,984,526 (`ii(".swing-alert-form").addClass`, read this session). Consequence: the form sits ABOVE a table that can be scrolled; clicking Edit on row 30 fills a composer with no visible acknowledgement.

> Verified: The Edit-button flash is genuinely absent from both panes. `requestEdit` in each pane sets the composer draft and does nothing else, and no flash exists anywhere else in the chain: no `use:` action on either form, no scrollIntoView/focus, no helper (`flashElement`/`addClass(`), no `*FLASH*` constant other than the unrelated SSE `RECONNECT…

### dta-02 — Image-preview lightbox has no `Download Image` button in either pane

**BUILT 2026-08-30 17:19 UTC, in both panes.** `buttons: { download: … }` REPLACES bootbox's default OK, so Download Image is the dialog's only control and the header's close button is how it is dismissed without saving — upstream and here. `BootboxDialog`'s `footer` snippet is what expresses that; passing it suppresses the default OK. Saving closes the dialog too, which is the reference's own shape (its callback returns undefined, which bootbox reads as "close") and the right one: the presenter opened the picture to get a copy of it.

**The row named the capability as already present and it was, in the wrong place.** `RoomModals.downloadImage` had exactly one caller, and it was never modal state — no field, no lifecycle, nothing rendered. It is `#lib/download-image.ts` now, because handing a pane the room's whole modal state so it can save a file is the coupling this repository keeps taking back out. **A method whose class it never touches is a function that has not been extracted yet.** Its two filename rules are the reference's and are not cosmetic: without them a presenter saving a screenshot gets `a3f9c1_chart_1024.png` instead of `chart.png`.

**medium** · `missing-control` · reference byte **1,992,730**

```
showImagePreview(e,i=""){e&&bootbox.dialog({title:i,message:`…<img src="${e}" class="img-fluid" alt="${e}" />…`,size:"large",buttons:{download:{label:'<i class="fa fa-download"></i> Download Image',className:"btn-primary btn-sm m-auto",callback:()=>(fetch(e).then(o=>o.blob()).then(o=>{const s=document.createElement("a");s.href=URL.createObjectURL(o);let r=e.split("/").pop()||"image.jpg";r=r.replace(/^[^_]+_/,"").replace(/_[^_]+(\.[^.]+)$/,"$1"),s.download=r,…
```

**Ours:** apps/room/src/lib/components/day-trade-alerts/DayTradeAlertsPane.svelte:446-451 (and SwingAlertsPane.svelte:420-425) render `<BootboxDialog mode="alert" message="">` wrapping only `<div class="text-center"><img class="img-fluid" …/></div>` — the dialog's only control is the default OK. The reference dialog's ONLY button is the download one. The capability already exists in this repo and is simply not routed to from these panes: `modals.downloadImage(url)` at apps/room/src/lib/room/modals.svelte.ts:219-238 reproduces the same filename derivation (`replace(/^[^_]+_/, '').replace(/_[^_]+(\.[^.]+)$/, '$1')`) and apps/room/src/lib/components/RoomOverlays.svelte:812-816 renders the `<i class="fa fa-download"></i> Download Image` button for the chat/imgur preview. Both panes' own comments (DayTradeAlertsPane.svelte:440-445, SwingAlertsPane.svelte:415-419) transcribe the message markup and the empty title but omit the `buttons` block entirely, so the omission is unrecorded.

> Verified: I tried to refute this and could not. In apps/room/src the string "Download Image" occurs EXACTLY ONCE in the entire tree (RoomOverlays.svelte:840), and that button is wired to `modals.selectedImageUrl` / `modals.downloadImage(...)` — the imgur/chat lightbox at RoomOverlays.svelte:806-845 — not to the alert panes.

### dta-04 — Paste-to-upload confirm has no `Upload this image?` question in either pane

**BUILT 2026-08-30 17:19 UTC, in both panes**, with the reference's inline `max-height: 50vh` that the row records as the secondary half. Without the heading this was an unlabelled OK/Cancel over a picture: the presenter pasted, a dialog appeared, and nothing on it said what OK does.

**The chat composer's twin has carried the heading since it was built**, which is why the contract COUNTS the occurrences rather than checking for one — a `toContain` was already satisfied before either pane had it. `50vh` stays inline rather than folded into `.img-fluid`, which is 70vh and shared with the alert lightbox that wants the extra height.

**medium** · `missing-behaviour` · reference byte **1,992,250**

```
onImagePaste(e,i){…bootbox.confirm({message:'<div class="text-center"><h4>Upload this image?</h4><img style="max-width:100%; max-height: 50vh;" src="'+a+'" /> </div>',callback:l=>I(function*(){l?(yield o.doImggurUpload(r,i),…
```

**Ours:** apps/room/src/lib/components/RoomOverlays.svelte:682-694 (day trade) and 650-662 (swing) render `<BootboxDialog mode="confirm" message="">` whose whole body is `<div class="text-center"><img src={previewUrl} class="img-fluid" alt="Pasted screenshot" /></div>` — no `<h4>Upload this image?</h4>`, so the presenter sees an unlabelled OK/Cancel over a picture. (Secondary, cosmetic: the reference sizes that preview inline at `max-height:50vh`, ours inherits `.img-fluid`'s 70vh.) The paste detection itself matches — DayTradeAlertForm.svelte:71-81 keeps the LAST clipboard item whose type starts with `image`, exactly as `0===a.type.indexOf("image")` does, and does not preventDefault.

> Verified: I could not refute this. The `<h4>Upload this image?</h4>` heading exists in our source in exactly ONE place — `apps/room/src/lib/components/PostAlertModal.svelte:513`, the composer's own paste confirm — and nowhere else.

### dta-03 — Image-preview lightbox is not opened at `size:"large"`

**BUILT 2026-08-30 17:19 UTC, in both panes** — `className="modal-lg"`, which is what this repository already uses for a bootbox `size:"large"` at three other call sites the row itself names. Built with dta-02 because they are one dialog.

**low** · `missing-behaviour` · reference byte **1,992,730**

```
size:"large",buttons:{download:{label:'<i class="fa fa-download"></i> Download Image'
```

**Ours:** apps/room/src/lib/components/day-trade-alerts/DayTradeAlertsPane.svelte:447 and SwingAlertsPane.svelte:421 call `<BootboxDialog mode="alert" …>` with no `className`; BootboxDialog accepts a `className` prop (apps/room/src/lib/components/BootboxDialog.svelte:11 and 24-33) and `modal-lg` is what the repo uses for a bootbox `size:"large"` elsewhere (apps/room/src/lib/components/ModalHost.svelte:3993 and 4100, apps/room/src/lib/components/RoomOverlays.svelte:792). So the alert screenshot opens in a default-width modal where the reference opens a large one. Cosmetic only — `.img-fluid {max-height:70vh}` still bounds the image.

> Verified: I could not find the large-size image lightbox implemented anywhere for these two panes. The reference's showImagePreview opens bootbox with size:"large" (bootbox puts modal-lg on the .modal-dialog element).

### dta-05 — Linked-room log override (`linkedRoom${e}AlertsOther`) is deliberately not carried

**DELIBERATE DIVERGENCE — verified by reading 2026-08-30 17:19 UTC; the row is its own disposition and the code already carries the reason.** `linkedRoom${e}AlertsOther` lets a room fetch ANOTHER room's alert log, with the room named by the BROWSER: `sendServerCommand(\`get${e}AlertsLog\`, { sessionID: s || globals.sessionID, days: i })`. Both endpoints here take the room from the session row instead and say so in place (`api/day-trade-alerts/+server.ts:20-31`, `api/swing-alerts/+server.ts:21-25`), the setting is excluded from the room config at `room-config-client.ts:452` and `:480`, and `trade-alerts.svelte.ts` sends no session parameter at all.

**This is the 2026-08-07 privilege escalation's exact shape** — an authority decision asserted by the client — so carrying it would mean reintroducing the thing `CLAUDE.md` names as never to be reintroduced. The honest cost is stated rather than hidden: a room configured upstream to mirror another room's alert log shows its own here. Building it correctly would mean the mirror being resolved on the CONTROLLER from the room's own settings and never named on the wire, which is a real feature and not this row.

**low** · `divergence` · reference byte **1,993,565**

```
let s=this.appService.globals.sessData[`linkedRoom${e}AlertsOther`];s=s?.trim(),this.appService.sendServerCommand(`get${e}AlertsLog`,{sessionID:s||this.appService.globals.sessionID,days:i})
```

**Ours:** apps/room/src/routes/api/day-trade-alerts/+server.ts:20-31 documents the omission and takes the room from the session row instead of the request; the twin note is at apps/room/src/routes/api/swing-alerts/+server.ts:21-25 and the setting is explicitly excluded from the room config in apps/room/src/lib/server/room-config-client.ts:452 and :480. `apps/room/src/lib/room/trade-alerts.svelte.ts:219-223` fetches `${endpoint}?days=…` with no session parameter. A room configured upstream to mirror another room's alert log will show its own log here. Recorded as a deliberate, security-motivated divergence rather than an oversight (the same offset 1,010,164 initial-load path is likewise not carried).

> Verified: I could not refute it: the linked-room log override is genuinely not implemented anywhere in apps/room/src, and the claim's own characterisation ("deliberately not carried") matches our source exactly. Searched apps/room/src for linkedRoom, AlertsOther, alerts_other, alerts-other, alertsSource, alert_source, sourceRoom, alertsRoom, logRoo…

## MainTabStrip.svelte

7 gaps, read 2026-08-31 against `app-presentationarea` — selector block at byte 1,994,350, consts
table opening at 1,994,264, template and update block at 2,014,221-2,017,200. Every one of the
eight `<li>` elements and both dropdown sub-templates were decoded BY VALUE rather than by looking
up the consts a claim names; three of the seven below exist only because of that.

This surface had no section in this register. It is not counted in the surfaces table above, which
describes the two-verifier pass as it ran.

### MTS-01 — The Files cog is drawn for every member; the reference instantiates it only for a presenter

**BUILT 2026-08-31.** `{#if isPresenter}` around it, and `{#if}` rather than `hidden` because `-1`
is `ɵɵconditional`'s "instantiate nothing" — the distinction this strip already turns on. The cog
and its menu moved into `TabGearMenu.svelte` in the same change (see MTS-07), so the gate sits at
the call site where the value is. `main-tab-strip-gates.svelte.test.ts` mounts the strip as a member
and asserts the ELEMENT is absent rather than hidden, with the presenter render as its control.

This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.

**high** · `missing-control` · reference byte **2,017,076**

```
H(35,ZCe,8,0,"div"), … O(35,o.isP?35:-1)
function ZCe(t,n){if(1&t){const e=Y();d(0,"div")(1,"span",66),T(2,"i",54),u(),d(3,"ul",67)(4,"li",56),x("click",function(){return D(e),E(g().newFile())}),d(5,"a",57),T(6,"i",58),v(7," Upload File"),u()()()()}}
```

**Ours:** MainTabStrip.svelte rendered `span#dropdownMenuFiles` and its `ul.dropdown-menu`
unconditionally, inside the Files tab's anchor. The menu's only item is mounted by
`RoomNotes.mountUploadFileLink` (`room/notes.svelte.ts:291`), whose click opens the room's
`file-upload` modal — so a member was shown the presenter's file uploader. Nothing downstream
refused it either: `mountUploadFileLink` calls `this.#modals.open('file-upload')` with no role
check, unlike its notes twin which at least refuses inside `requestNewNote`.

### MTS-02 — The Notes cog has no gate; the reference instantiates it only for a presenter or a member who may author notes

**BLOCKED 2026-08-31.** The gate cannot be applied from `MainTabStrip.svelte`: its eleven props
carry `isPresenter` but nothing carrying the VIEWER's `canEditNotes`, and inventing a default is
worse than leaving it — `false` takes the New Note cog away from a member who legitimately has it,
`true` is no gate at all.

**The one line that unblocks it:** `apps/room/src/lib/components/PresentationArea.svelte:507`, in the
`<MainTabStrip … />` props between `{hideNotes}` and `{menus}`, add
`canEditNotes={data.canEditNotes === true}` — `data.canEditNotes` is already on that component's
`data` prop. Then `{#if isPresenter || canEditNotes}` around the `<TabGearMenu id="dropdownMenuNotes" …/>`,
exactly as MTS-01 now has. That file is outside this task's editable set.

This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.

**medium** · `missing-control` · reference byte **2,016,713**

```
O(23,o.isP||o.appService.globals.user.canEditNotes?23:-1)
function KCe(t,n){if(1&t){const e=Y();d(0,"div",15)(1,"span",53),T(2,"i",54),u(),d(3,"ul",55)(4,"li",56),x("click",function(){return D(e),E(g().newNote())}),d(5,"a",57),T(6,"i",58),v(7," New Note"),u()()()()}}
```

**Ours:** the cog is drawn for everybody. It is less severe than MTS-01 because the ACTION behind
it already refuses — `RoomNotes.requestNewNote` sets `newNoteOpen` to `this.#noteGates().editorMounted`,
so a member who may not author gets nothing when they press it. That is precisely the shape the
root standard names, though: a control whose only effect is nothing. The reference declines to draw
it at all.

### MTS-03 — The Recordings tab does not exist here at all

**BLOCKED 2026-08-31.** Not buildable from this component or from any file in this task's editable
set, and the block is structural rather than a missing prop: `MainTab` in `apps/room/src/lib/types.ts`
has no `'recordings'` member, so `mainTab = 'recordings'` does not type-check, and
`PresentationArea.svelte` has no `#recordings` pane (upstream const 25,
`["id","recordings","role","tabpanel","aria-labelledby","recordings-tab",1,"tab-pane","position-relative","h-100",3,"ngClass"]`),
so a tab added here would select a value nothing renders.

**What unblocks it, in order:** add `| 'recordings'` to `MainTab` in `apps/room/src/lib/types.ts:16`;
add `recsInRoom?: boolean` to `RoomSessionSettings` in `apps/room/src/lib/server/room-config-client.ts`
and pass it through the load; add the `#recordings` pane to `PresentationArea.svelte`. The first
half of the gate is already built — `RoomGates.archivesAvailable` (`room/gates.ts:336`) is
`archivesAvailableTo(viewer, session)`, the transcription of the reference method at byte 1,959,447,
and `roster-gates.test.ts:52` already pins it against these same bytes. The second half,
`sessData.recsInRoom`, returns ZERO hits across `apps/room/src`.

This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.

**medium** · `missing-control` · reference byte **2,016,775**

```
O(24,o.archivesAvailableTo()&&o.appService.globals.sessData.recsInRoom?24:-1)
function YCe(t,n){if(1&t){const e=Y();d(0,"li",31),x("click",function(){return D(e),E(g().onMainTabChange("presAreaTabs-recordings"))}),d(1,"a",59)(2,"div",12)(3,"div"),T(4,"i",60),d(5,"span",14),v(6,"Recordings"),u()()()()()}if(2&t){const e=g();m(),z("ngClass",ct(1,mo,"presAreaTabs-recordings"==e.selectedMainTab))}}
```

**Ours:** absent. Grepping `apps/room/src` for `recsInRoom`, `recordings-tab` or a `'recordings'`
main tab returns nothing. Const 59 is the anchor
(`["id","recordings-tab","data-bs-toggle","tab","data-bs-target","#recordings","role","tab","aria-controls","recordings","aria-selected","false",1,"nav-link",3,"ngClass"]`)
and const 60 the icon, `[1,"fas","fa-file-video"]`. The tab sits between Notes and VideoPlayer in
slot order, which is also where `PresentationArea`'s own pane-order note (`PA-08`) already says the
recordings pane belongs.

### MTS-04 — `z('hidden', o.hideScreens)` on the Screens `<li>` is not reproduced

**MEASURED REFUSAL 2026-08-31.** The measurement is recorded at the code, in
`MainTabStrip.svelte`'s header. `hideScreens` occurs exactly THREE times in the 2,891,205-byte
bundle: `this.hideScreens=!1` in the component constructor at 1,954,414, and the two template reads
at 2,016,430 (this tab) and 2,017,196 (its pane). Nothing else in the bundle mentions it.

**And its four siblings are all assigned, which is what makes this a measurement rather than a
guess.** `ngOnInit` at 1,955,678 sets `hideNotes`, `hideFiles`, `hasSwingTradeAlerts`,
`hasDayTradeAlerts` and `hideStreams` — `this.hideStreams=!this.appService.globals.sessData.useMediaMTX`
— and `hideScreens` is not among them. The flag is initialised false and never written, so the
binding can never be true. Reproducing it here would add a prop and a gate no caller could open.

This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.

**low** · `missing-behaviour` · reference byte **2,016,417**

```
2&i&&(m(),z("hidden",o.appService.globals.viewerOnlyMode),m(),z("hidden",o.hideScreens),m(),z("ngClass",ct(46,mo,"presAreaTabs-screens"==o.selectedMainTab)),m(6),z("hidden",o.hideStreams),…
```

**Ours:** MainTabStrip.svelte's Screens `<li>` carries `role="presentation" class="nav-item"` and no
`hidden`, where its Streams, Notes and Files siblings all carry one. The asymmetry is the
reference's own and is now explained where it is visible.

### MTS-05 — Seven `onkeydown` handlers that no keyboard could reach

**HALF BUILT 2026-08-31.** The seven tab anchors are fixed; the two cogs are refused with the
measurement recorded in `TabGearMenu.svelte`.

`tabindex` on every anchor read `{mainTab === … ? undefined : -1}`. `undefined` omits the attribute
in Svelte, and an `<a>` with no `href` and no non-negative `tabindex` is not focusable in any
browser — so the SELECTED tab could not take focus and the other six were explicitly removed from
the tab order. Every `onkeydown` in the strip was therefore unreachable code. It is `? 0 : -1` now,
the roving tabindex the ARIA tabs pattern asks for, and `main-tab-strip-gates.svelte.test.ts` calls
`.focus()` and asserts `document.activeElement`, then dispatches `Enter` and asserts the tab changed.

**The two cog `<span>`s are NOT repaired, and the reason is a constraint rather than an omission.**
A `<span>` with no `tabindex` is not focusable, and the only way to make one focusable is
`tabindex="0"` plus a role — on an element that sits inside the tab's own `<a role="tab">`, which
nests one interactive control inside another and is invalid whichever role is chosen. The reference
has exactly that shape and delegates the keyboard to Bootstrap, whose source is not in the bundle,
so there is nothing to transcribe and no rendered capture to check a repair against.

**This whole affordance is OURS.** The reference has no `tabindex` anywhere in the strip and no
keyboard handling whatsoever. What was wrong was shipping half of it.

This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.

**medium** · `defect` · reference byte **1,994,264**

```
["id","screens-tab","data-bs-toggle","tab","data-bs-target","#screens","role","tab","aria-controls","screens","aria-selected","true",1,"nav-link",3,"ngClass"]
```

**Ours:** MainTabStrip.svelte:103,129,151,224,257,295,326 — seven `tabindex` expressions, each
paired with an `onkeydown` that set `mainTab`. Const 5 above is the reference's screens anchor,
decoded by value: it carries no `tabindex` at all, and neither does any of its seven siblings.

### MTS-06 — `aria-selected` is derived here and hardcoded on all eight anchors upstream

**DELIBERATE DIVERGENCE 2026-08-31.** Recorded, not matched. Decoded by value from
`app-presentationarea`'s consts table: const 5 (`screens-tab`), 9 (`streams-tab`), 61
(`videoplayer-tab`), 63 (`swingAlerts-tab`) and 65 (`dayTradeAlerts-tab`) each carry a literal
`"aria-selected","true"`; const 11 (`notes-tab`), 17 (the files anchor, which carries no id) and 59
(`recordings-tab`) each carry a literal `"false"`. Nothing in the update block from 2,016,417 onward
writes the attribute — the only per-tab binding is `ngClass`, `ct(46,mo,…)` with
`mo=t=>({active:t})` at byte 1,916,345.

So a room with both alert entitlements announces FIVE simultaneously-selected tabs to a screen
reader and never announces the one actually showing. Reproducing it would reproduce a defect. Ours
binds it to `mainTab === …` on all seven anchors, and `main-tab-strip-gates.svelte.test.ts` asserts
exactly one tab answers `true` and that it is the one showing.

**The precedent is this document's own**, twice: `FP-04` and `PAM-15` refuted the identical claim
against `FilesPane` and `PostAlertModal` — "the reference genuinely hardcodes aria-selected and ours
genuinely binds it, and the claim's own remedy, that the divergence should stay recorded as
deliberate, is ALREADY recorded". It was not recorded for this surface, which is why this row exists
and is closed rather than refuted.

This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.

**low** · `divergence` · reference byte **1,994,264**

**Ours:** MainTabStrip.svelte, seven anchors, `aria-selected={mainTab === '…'}`. The eighth
reference anchor is Recordings, which this room does not have — see MTS-03.

### MTS-07 — The two tab cogs were one interaction with two implementations, and they disagreed

**FIXED 2026-08-31.** One implementation now, `TabGearMenu.svelte`, and the symmetry is structural:
the sibling menu to close is DERIVED from which cog this is, so a cog cannot be added that forgets
to close the other one.

Upstream neither cog carries a click handler. `data-bs-toggle="dropdown"` hands the open/close to
Bootstrap, and both cogs sit inside an `<li>` whose own `x("click", …)` calls `onMainTabChange` —
const 4 is `["role","presentation",1,"nav-item",3,"click","hidden"]`. One implementation, so the
two behave identically by construction.

This room has no Bootstrap dropdown behaviour, so each cog was hand-wired, and the two hand-wirings
had drifted. Measured before the repair: the notes cog called `event.stopPropagation()`, which
suppressed the very anchor handler that would have selected the Notes tab, and it did not close the
Files menu; the files cog re-set `mainTab = 'files'` by hand AND called `menus.set('notes', false)`.
So a member who clicked the notes cog stayed on whichever tab they were on and was shown a menu
belonging to a tab they could not see, while the files cog did the right thing twice over.

Three assertions per cog in `main-tab-strip-gates.svelte.test.ts`, driven against a REAL `RoomMenus`
rather than a recording stub — a stub would have let the two go on disagreeing about which calls to
make while faithfully recording both.

This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.

**medium** · `divergence` · reference byte **1,916,736**

```
function KCe(t,n){if(1&t){const e=Y();d(0,"div",15)(1,"span",53),T(2,"i",54),u(),d(3,"ul",55)(4,"li",56),…
 53  ["id","dropdownMenuNotes","data-bs-toggle","dropdown","aria-expanded","false",1,"dropdown-toggle"]
 66  ["id","dropdownMenuFiles","data-bs-toggle","dropdown","aria-expanded","false",1,"dropdown-toggle"]
```

**Ours:** MainTabStrip.svelte:167-188 (notes) and :340-367 (files) before the change — twenty-six
lines each, structurally identical and behaviourally different. Decoded in passing: const 55 labels
the notes menu `aria-labelledby="dropdownMenuButton"`, an element that exists nowhere in the
captured page, while const 67 labels the files menu with its own cog's id. Both are transcribed
as-is and `TabGearMenu` takes `labelledBy` explicitly for exactly that reason.

---

## RoomOverlays.svelte

7 gaps, read 2026-08-31. The surface is a LAYER rather than one reference component: the two
connection overlays are nodes 7-10 of `app-room`'s template (selector block at 2,533,572, consts at
2,533,197, template at 2,546,833), the delivery effects are `app-chat`'s `chatMsg` handler
(1,431,196) and `app-roomscroller`'s `updateAlertMsg` handler (1,408,794), and the dialogs are
`bootbox` calls in `app-presentationarea` (1,992,730, 1,992,250) and `app-chat` (1,445,719). All
four regions were read end to end.

This surface had no section in this register. It is not counted in the surfaces table above, which
describes the two-verifier pass as it ran.

### OVL-01 — The reconnect flash renders its two children in the wrong order and drops the reference's leading space

**FIXED 2026-08-31.** `<i class="fas fa-check"></i>{' Conected\n'}` — the tick first, then the text
node with the space that separates them, written as an expression because Svelte folds whitespace at
element boundaries. The sibling overlay four lines above already used that idiom for
`{' Reconnecting Chat... '}`; this element had never been given it.

`overlay-delivery-contract.test.ts` extracts the text node with a regex and compares it, rather than
asking whether the element contains a string. Its first draft asserted the element did not contain
`Connected`, to pin upstream's one-n spelling, and failed on its own subject: the element's CLASS is
`notConnectedOverlay`. That is the same substring-answered-by-a-longer-neighbour defect this
repository has already met twice, caught this time by its own negative control before it shipped.

This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.

**low** · `wrong-markup` · reference byte **2,547,023**

```
H(7,iRe,3,0,"div",9),d(8,"div",10),T(9,"i",11),v(10," Conected\n"),u(),T(11,"app-user-info-modal")…
 10  ["id","connectedMsg",1,"notConnectedOverlay","animated","fadeIn"]
 11  [1,"fas","fa-check"]
```

**Ours:** RoomOverlays.svelte rendered `Conected<i class="fas fa-check"></i>` — the tick trailing the
word, with no space anywhere, so the two ran together. `T` is `ɵɵelement` and `v` is `ɵɵtext`, so
the compiled order is unambiguous. `connection-overlay-contract.test.ts` already asserted this
element exists and that there are exactly two `notConnectedOverlay` classes; it asserted nothing
about what is inside it.

### OVL-02 — The Q&A arrival notice and the unread marker run in rooms that never bought Q&A on alerts

**BUILT 2026-08-31.** One line, `if (!messageChrome.hasQaOnAlerts) return;`, placed before the
effect reads a single arrival — so the toast, the `qaAlert` sound, the unread marker AND the Q&A
reaction notices all stop together, which is what the reference's early return does.

**Read off `messageChrome`, not `data.sessData`.** `buildMessageChrome` resolves
`hasQAOnAlerts === true` once for the whole page (`room-message-chrome.ts:263`) and three components
already read the answer; a second `data.sessData?.hasQAOnAlerts === true` here would be a second
answer to one question, which is the failure that module exists to end. The contract test asserts
the second read is absent as well as the gate being present.

This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.

**high** · `missing-behaviour` · reference byte **1,408,794**

```
if("alerts"!=this.logType||!this.appService.globals.sessData.hasQAOnAlerts)return;if(s.uid!==this.appService.globals.user.userXrefID&&!r){const f=s.isA?"answer":"question";for(let _ of o.qa)_.uid===this.appService.globals.user.userXrefID&&(…)}
```

**Ours:** the effect at RoomOverlays.svelte had no such gate. It called `unreadQaAlertIds.add(…)`
and `deliverQaNotice(…)` for every fresh question and ran `questionReactionNotice` unconditionally.
`unreadQA = !0` is set FURTHER DOWN the same upstream handler, past that return, so a room without
the entitlement flashes nothing upstream either — and the flash is what the marker feeds. The room's
own composer already refuses to draw the ask button without it (`O(1, !e.isQAMsg &&
sessData.hasQAOnAlerts ? 1 : -1)`, byte 1,339,784, pinned by `qa-entitlement-contract.test.ts`),
which is what makes this a leak rather than merely a difference: the notification path was open
where the control path was closed.

### OVL-03 — The chat ding had two implementations here, and the one in this file cited a gate that does not exist

**FIXED 2026-08-31.** The effect and its `chatArrivals` tracker are gone; the mention ring it was
accidentally covering moved to the mention effect, which is where the bundle puts it (OVL-04).

**The comment above it was the finding.** It claimed: *"app-chat plays `pling` for an incoming chat
message under exactly this gate: `preferences.doNotDisturbOn || (preferences.chatSoundOn &&
soundEffectsService.pling.play())`"*. All EIGHT `pling.play()` sites in the bundle were read —
1,218,923, 1,431,259, 1,431,911, 2,075,972, 2,207,439, 2,377,691, 2,378,343, 2,506,579 — and no site
carries that gate. The two in `app-chat`'s `chatMsg` handler are the MENTION ring (1,431,259, inside
`e.isMention &&`) and the followed-sender branch quoted below.

**And the correct rule was already built.** `#lib/chat-arrival-sound.ts` transcribes it and
`room/events.svelte.ts:861-876` calls it on the SSE arrival, where the sender's hash is in hand. So
this effect was a second copy layered on the right one: a room with `dingOnNewMessage` off and
nobody followed — upstream's SILENT case — rang on every message, and a room with it on rang twice.

This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.

**high** · `defect` · reference byte **1,431,911**

```
!this.appService.globals.preferences.doNotDisturbOn&&this.appService.globals.preferences.chatSoundOn){const{followedUsers:i}=this.appService.globals;try{i&&Object.keys(i).length>0&&i[e.avt].followChatStyle.playSound?this.soundEffectsService.pling.play():(this.appService.globals.playChatMessageSoundFor&&this.appService.globals.playChatMessageSoundFor.length>0&&this.appService.hashEmail(this.appService.globals.user.email)!==e.avt&&this.appService.globals.playChatMessageSoundFor.includes(e.avt)||this.appService.globals.sessData.dingOnNewMessage&&this.appService.hashEmail(this.appService.globals.user.email)!==e.avt)&&this.soundEffectsService.followed.play()}catch{…}
```

**Ours:** RoomOverlays.svelte held `const chatArrivals = new RoomArrivals<…>()` and an effect
reading `chatArrivals.fresh(data.messages)` that played `pling` whenever any arrival was not the
viewer's own. Three ways wrong at once: the wrong sound name for the ordinary case (`followed`, not
`pling`), no per-sender condition at all, and a second delivery of a sound the event router had
already decided. The tracker went with it — nothing else read it, so leaving it would have left a
marker set growing per message for a reader that no longer exists.

### OVL-04 — A mention plays no sound, and the popup preference silenced the sound as well as the popup

**BUILT 2026-08-31.** The ring is `if (prefs.chatSoundOn) playSoundEffect('pling');`, placed after
the Do Not Disturb return and BEFORE the `chatPopup` return, which is the reference's own nesting.
One ring for a batch rather than one per mention, stated as ours at the code: upstream handles
`chatMsg` one frame at a time, and `data.messages` reaches this component as a page.

This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.

**medium** · `missing-behaviour` · reference byte **1,431,259**

```
this.appService.globals.preferences.doNotDisturbOn||(this.appService.globals.preferences.chatSoundOn&&this.soundEffectsService.pling.play(),this.appService.globals.preferences.chatPopup&&(this.alertService.info(e.txt,"Mention from @"+e.n,{enableHtml:!0}),window.Notification&&Notification.requestPermission().then(…)))
```

**Ours:** the mention effect read `if (prefs.doNotDisturbOn || !prefs.chatPopup) return;` — a single
return on both preferences — under a comment that called it *"the outer gate on the whole block,
sound and popup alike"*. They are two SIBLING gates under one Do Not Disturb: `chatSoundOn` decides
the sound, `chatPopup` decides the toast and the OS notification. A member who had turned the popup
off was therefore told nothing at all when named. It happened not to be silent in practice only
because OVL-03's blanket ring was firing for every message including this one; fixing that alone
would have made it silent, which is why the two rows are one change.

### OVL-05 — The lightbox describes the image with a filename; the reference and this room's own other renderer both use the url

**FIXED 2026-08-31.** `alt={url}`, in `ImageLightbox.svelte` — the component the lightbox was
extracted into in the same change, so the one interesting decision it carries is argued in the file
that makes it.

Neither value is a good description of a picture and no rule this repository can apply would invent
one: the image is a member's upload and nothing in the room knows what is in it. What settles it is
that the filename was a preference substituted for a captured value, and that it disagreed with this
room's OWN second renderer of the same image — `RoomModals.showImage` writes
`<img src="${url}" alt="${url}" />` into the popped-out window (`room/modals.svelte.ts:295`). One
image, two alt rules, neither of them the reference's.

This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.

**low** · `invented-value` · reference byte **1,992,730**

```
showImagePreview(e,i=""){e&&bootbox.dialog({title:i,message:`\n        <div class="text-center">\n          <img src="${e}"\n              class="img-fluid"\n               alt="${e}" />\n        </div>\n      `,size:"large",buttons:{download:{label:'<i class="fa fa-download"></i> Download Image',className:"btn-primary btn-sm m-auto",callback:()=>(fetch(e)…,!1)}}})}
```

**Ours:** RoomOverlays.svelte computed
`alt={modals.selectedImageUrl.substring(modals.selectedImageUrl.lastIndexOf('/') + 1)}`. Four
reference call sites, all in `app-presentationarea` — 1,933,330, 1,936,798, 1,939,572, 1,943,143 —
and none passes `i`, which is why the dialog's `.modal-title` renders empty here and should.

### OVL-06 — The lightbox's download button sits in the body under an `<hr />`; where the reference puts it cannot be read from this checkout

**MEASURED REFUSAL 2026-08-31.** The measurement is recorded in `ImageLightbox.svelte`.

Upstream passes the button inside `buttons: { download: { label, className: "btn-primary btn-sm
m-auto", … } }`, and it is **bootbox** that decides where a `buttons` entry lands in the DOM and what
class list it ends up with. `window.bootbox` is a global in the captured page and its source is NOT
in the 2,891,205-byte bundle — `bootbox` appears only as call sites. So `.modal-footer` versus the
body, and whether `btn` is prepended to `btn-primary btn-sm m-auto`, are answerable only from a
rendered DOM capture, and thirteen of the fourteen capture roots are absent from this checkout by
design. `todo-next.md` states the same limit in general terms: a gap that turns on rendered geometry
is not auditable here and must say so rather than be guessed.

**What IS transcribed from those bytes and is now asserted:** the callback ends `…,!1)` — it returns
false, which is bootbox's "do not dismiss" — so saving the image leaves the lightbox open. The
button below closes nothing.

This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.

**low** · `divergence` · reference byte **1,992,730**

**Ours:** `ImageLightbox.svelte` renders the button inside `.bootbox-body` after an `<hr />`, with
`class="btn btn-primary btn-sm"`. Both the `<hr />` and the placement are this room's, are recorded
as this room's in that file, and are evidence of nothing.

### OVL-07 — Upstream raises the Q&A notice once per question the viewer asked, plus once more for a presenter; this room raises it once

**DELIBERATE DIVERGENCE 2026-08-31.** Recorded, not matched. `updateAlertMsg` runs two sibling
blocks over the same event: a LOOP over `o.qa` that fires for every entry whose `uid` is the
viewer's, and then a separate `user.isPresenter && (…)` block with the identical body. So a member
who has asked three questions on an alert gets three toasts and three `qaAlert` sounds when a fourth
arrives, and a presenter who has also asked gets four.

Reproducing that would reproduce a defect: the notice says *who asked what on which alert*, and it
says the same thing each time. `deliverQaNotice` in `RoomOverlays.svelte` resolves the audience once
— never for your own post, otherwise every presenter plus anyone who has asked on that alert — and
delivers once.

This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.

**low** · `defect` · reference byte **1,408,905**

```
for(let _ of o.qa)_.uid===this.appService.globals.user.userXrefID&&(this.appService.globals.preferences.doNotDisturbOn||(!l&&this.appService.globals.preferences.qaSoundOn&&this.soundEffectsService.qaAlert.play(),…),!l&&this.appService.globals.preferences.alertPopup&&this.alertService.info(`"${s.txt}" for alert: "${o.txt}" by ${o.n}`,`Alert ${f} from @${s.n}`),…);this.appService.globals.user.isPresenter&&(… the same body again …)
```

**Ours:** `deliverQaNotice` is called once per FRESH question, and it returns early unless the
viewer is a presenter or has asked on that alert. The presenter branch at byte 1,409,538 is the
duplicate — it repeats the loop body verbatim rather than being reached instead of it.

---

---

## notes/NoteEditor.svelte — second reading, 2026-08-30

3 rows. The eighteen above came from the two-verifier pass; these come from re-reading `app-note`
end to end at verified boundaries and decoding its whole consts table by value, which is the reading
`RM-25` records as the one that finds rows a reader who looks up a cited const cannot.

### NE-01 — A block whose entire body is one HTML comment: three conditions evaluated to render nothing

**FIXED 2026-08-30.** Deleted. `{#if giphyApiKey && openMenu === null && dialog === null}` wrapped a
single HTML comment and nothing else, so three values were read on every render to choose between
rendering nothing and rendering nothing.

The comment inside it — *"Giphy is opened by the toolbar button through this captured picker
surface"* — is TRUE, and it describes the block eighty lines above that actually mounts
`GiphyPicker`. That is what made it survive: a correct sentence, in a gate of its own, reads to the
next person as a surface that has not been built yet rather than as a leftover.

Nothing else in this repository looks in this direction. `orphan-style-contract` finds a rule nobody
wears and `orphan-component-contract` finds a component nobody mounts; a BRANCH with no body compiles,
lints, type-checks and passes `svelte-check` in silence. `note-dead-control-contract.test.ts` now
sweeps for the general form — any `{#if}` whose body is empty once comments are stripped — rather
than pinning this one instance. Control seen red: re-adding the block failed both assertions, and the
sweep named the block in its own message.

**low** · `divergence` · reference byte **1,461,505**

```
function T0e(t,n){if(1&t){const e=Y();d(0,"div",4)(1,"button",5),x("click",function(){return D(e),E(g().setAsWelcomeTab(!1))})
```

**Ours:** `T0e` is `app-note`'s entire editing template and it has sixteen nodes, none of them empty.
Ours had a seventeenth that rendered nothing at all. The offset is cited as the template the block
claimed to belong to, because there is no reference counterpart to cite — that is the finding.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### NE-02 — The button bar drops every padded text node the capture carries

**BUILT 2026-08-30.** Seven labels: ` Set as Welcome Mat `, ` Apply as Welcome Mat to all rooms `,
` Bring Everyone here `, ` Edit Carousel `, ` Version History (n) `, ` Done ` and `S0e`'s ` Revert `.

Svelte trims whitespace at the edges of an element's children, so a trailing space written as text is
compiled away — only an expression survives. The measurement and the whole argument already live in
`files-pane-contract.test.ts`'s `the padded text nodes` block, which pins the identical idiom on the
Files pane and records the compiler check that decided it; nothing of that is restated here or in the
component. What was new is only that the note surface had none of it while nine other components use
`{' '}` in 42 places.

The leading space needs nothing — it sits between the icon element and the text, where Svelte keeps
it. `note-padded-labels-contract.test.ts` asserts the source AND renders the bar, because a
source-only pin would have passed just as happily for `&#32;`, which that Files block measured and
found does not survive. Control seen red on both halves at once.

**low** · `wrong-constant` · reference byte **1,461,505**

```
v(3," Set as Welcome Mat "),u(),d(4,"button",5),x("click",…setAsWelcomeTab(!0)),T(5,"i",6),v(6," Apply as Welcome Mat to all rooms ")
```

**Ours:** Every label was written as markup text, so the compiler dropped its trailing space. No
pixel depends on it — a space at the end of a line box collapses — but the DOM text node does, and
that is what a byte-for-byte comparison of the two trees reads.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### NE-03 — The toolbar's four constant tables have no counterpart in the pinned bundle at all

**MEASURED REFUSAL 2026-08-30.** The font list, the size list, the line-height list and the
sixty-four-colour palette are NOT transcriptions and must not be cited as such. They are now
`src/lib/note-palette.ts`, whose header records the search rather than the assumption.

What was searched: `main.d1d09071be31f1ba.js` contains the string `summernote` 37 times and the
library zero times — the reference's editor is a separate script the capture does not include. Its
config at byte 1,468,553 names a toolbar layout and nothing else: no `fontNames`, no `fontSizes`, no
palette. `F7C6CE` and `9CC6EF` return zero hits in the bundle, zero in
`styles.ee2a710065b60389.css`, and zero in `css/complete-app-styles.css`.

So there is nothing to match, and inventing a citation for these values would be worse than having
none. They are summernote's own defaults, carried because our editor is not summernote and has no
defaults of its own. The module says that where the values are, so the next reader arguing about a
colour knows they are arguing about this room's editor rather than about a captured value.

The extraction was forced by `source-size-contract` refusing `NoteEditor.svelte` at 1,700 lines, and
the ceiling's rule — a slice leaves rather than the number rising — chose the right slice: ninety
lines that know nothing about Tiptap, about the open menu, or about a note.

**low** · `divergence` · reference byte **1,468,553**

```
placeholder:"Type your note here and press save",height:"100%",toolbar:[["style",["style"]],["view",["fullscreen","codeview"]],["misc",["und
```

**Ours:** `NoteEditor.svelte` carried the four tables inline with no note on where they came from, so
every one of them looked like the transcriptions the rest of the file is full of.

---

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

## notes/CarouselDialog.svelte

8 rows. The carousel modal, its image browser and its two confirmations were extracted out of
`NoteEditor.svelte` on 2026-08-30; this is the first end-to-end reading of the component that
resulted, against `M0e`, `x0e`, `D0e`, `E0e`, `k0e` and `O0e`.

### CD-01 — The image browser's header icon is `fas fa-images`; const 62 is `fas fa-folder-open`

**FIXED 2026-08-30.** `O0e`'s node 2 is `T(2,"i",62)` and const 62 is `[1,"fas","fa-folder-open"]` at
byte 1,486,004 — the SAME icon as the ` Browse ` button that opens this modal, which is the point of
it: the folder is what the control and the thing it opens have in common. `fa-images` is const 15 and
belongs to the carousel modal's own title, one screen up in the same file.

This is the shape the surface kept producing from the other side. `note-image-browser-contract.test.ts`
had already pinned this modal's strings and its grid and every one of them was right; what nobody had
read was the chrome the strings sit in. `O0e` is nine nodes long and every one names a const —
decoding all nine took a minute and produced four corrections, of which this is the first. Control
seen red.

**low** · `wrong-constant` · reference byte **1,466,288**

```
d(0,"div",26)(1,"h4",72),T(2,"i",62),v(3," Select Image "),u(),d(4,"button",28)
```

**Ours:** `CarouselDialog.svelte` rendered `<i class="fas fa-images"></i> Select Image`, and its `h4`
wore Bootstrap's `modal-title` where its sibling modal in the same file wears summernote's
`note-modal-title` — a third spelling in a file that only ever needed one.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### CD-02 — The browser's close button is `btn-close`; const 28 is Bootstrap 4's `close`, and it is the const the four sibling dialogs use

**FIXED 2026-08-30.** Const 28 is `["type","button","aria-label","Close",1,"close",3,"click"]` at byte
1,484,628, and it is the ONE close-button const in this component — the carousel modal and the file
browser are both declared from it. Ours drew them as two different buttons: `close` on one and
Bootstrap 5's `btn-close` on the other. Two spellings of one control in one file is one of them being
wrong.

**Its CHILD is deliberately not transcribed, and that is the interesting half.** `T(5,"span",29)` is
a CHILDLESS `<span aria-hidden="true">` — `T` is elementStart-and-end with no children, where a `×`
would compile to `d(5,"span",29),v(6,"×"),u()`. So upstream's close button paints nothing but its own
padding; the glyph was lost somewhere above this build, and `.close` in the captured sheet carries no
`::before` to put it back. Reproducing it would reproduce an invisible control, which is the one
reason `CLAUDE.md` gives for not matching the reference. `note-icon-close` is what the four sibling
note dialogs already draw and it is what is drawn here. Control seen red.

**low** · `wrong-constant` · reference byte **1,484,628**

```
["type","button","aria-label","Close",1,"close",3,"click"],["aria-hidden","true"]
```

**Ours:** `class="btn-close"` with no child at all, so the browser's close was a Bootstrap 5 control
in a summernote modal — styled by a different sheet from the four dialogs beside it.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### CD-03 — The browser's footer button is `btn btn-secondary`; const 41 is `btn btn-outline-dark`, the same const the carousel modal dismisses with

**FIXED 2026-08-30.** Const 41 is `["type","button",1,"btn","btn-outline-dark",3,"click"]` at byte
1,485,128, and `O0e` node 11 and `M0e` node 25 are both declared from it. Ours already had the
carousel modal's ` Cancel ` right; the browser's was invented beside it.

Worth stating plainly because it is the row's whole content: nothing here was missing and nothing was
broken. Two buttons that the reference draws identically were drawn differently, in one file, forty
lines apart — which is exactly the kind of divergence that survives every gate and every review, and
exactly why the const table is decoded by value rather than described. Control seen red.

**low** · `wrong-constant` · reference byte **1,466,484**

```
d(10,"div",40)(11,"button",41),x("click",function(){return E(D(e).$implicit.dismiss())}),v(12," Cancel ")
```

**Ours:** `class="btn btn-secondary"` on the browser's Cancel, against `btn btn-outline-dark` on the
carousel modal's — the same act, two buttons.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### CD-04 — The image-browser modal is not announced as a dialog and has no accessible name

**BUILT 2026-08-30.** `role="dialog"` and `aria-label="Select Image"` on the browser's root, matching
what the sibling carousel modal in the same file has always had.

The reference gets both without writing either: `openFileBrowser` opens the template through
`modalService.open(this.fileBrowserModal, {ariaLabelledBy:"file-browser-modal-title", size:"lg"})` at
byte 1,477,226, and NgbModal puts `role="dialog"` and `aria-labelledby` on a wrapper it owns. Const 72
is `["id","file-browser-modal-title",1,"modal-title"]` — the id that binding points at.

**The id is deliberately not reproduced**, and this is a divergence with a reason rather than a
shortcut. A literal document-unique id belongs to a component NgbModal mounts once at the document
root. This one is re-created inside `{#if dialog === 'carousel'}` in an editor a room may hold more
than one of, so a literal `file-browser-modal-title` is a duplicate id waiting for a second note to be
edited. `aria-label` says the same thing and cannot collide. Control seen red.

**medium** · `missing-behaviour` · reference byte **1,477,226**

```
this.fileBrowserModalRef=this.modalService.open(this.fileBrowserModal,{ariaLabelledBy:"file-browser-modal-title",size:"lg"})
```

**Ours:** The browser's root was a bare `<div class="note-modal open">` — no role, no name — while
the carousel modal forty lines above it carried `role="dialog"` and `aria-label={title}`. Assistive
technology met the browser as an unlabelled group of buttons.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### CD-05 — `.note-modal-dialog`: a wrapper element with no rule anywhere and no counterpart in the reference

**FIXED 2026-08-30.** Deleted, element and class together.

Searched rather than assumed: `note-modal-dialog` occurs zero times in
`main.d1d09071be31f1ba.js`, zero times in `styles.ee2a710065b60389.css`, and zero times in every sheet
this app ships — `css/complete-app-styles.css`, `lib/styles/*.css` and `app.css`. `O0e` has no wrapper
element either; the `.modal-dialog` NgbModal supplies lives outside the template, which is why a
reader porting the template would never have seen one to copy.

`CLAUDE.md` names this defect — *"no `.flipped` class with no CSS"* — and it is the direction
`orphan-style-contract.test.ts` does NOT look: that gate finds a rule nobody wears, and this was a
class no rule reaches. `note-dead-control-contract.test.ts` closes the other direction for this
surface, and its control asserts the six `note-modal-*` classes that ARE styled are still worn, so a
sweep that removed one of those looks different from this one. Control seen red.

**low** · `divergence` · reference byte **1,466,225**

```
function O0e(t,n){if(1&t){const e=Y();d(0,"div",26)(1,"h4",72),T(2,"i",62),v(3," Select Image ")
```

**Ours:** `<div class="note-modal-dialog">` sat between `.note-modal` and `.note-modal-content` in the
file browser and nowhere else, so the two modals in this one file nested differently for no reason
either of them could state.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### CD-06 — `.note-carousel-modal`: an invented class on the carousel modal's root, styling nothing

**FIXED 2026-08-30.** Removed. Same search as CD-05 and the same three zero results, plus zero in our
own sheets.

Recorded as its own row rather than folded into CD-05 because the two failed differently: the wrapper
was a whole ELEMENT that could be mistaken for structure, and this was a class on an element that has
to exist anyway, wearing the shape of a captured hook on a component whose every other class is one.
It is the harder of the two to see and the cheaper to add. Control seen red — re-adding it to the
markup, not to a comment, and the assertion names the class.

**low** · `divergence` · reference byte **1,464,344**

```
function M0e(t,n){if(1&t){const e=Y();d(0,"div",26)(1,"h4",27),T(2,"i",15),v(3),u(),d(4,"button",28)
```

**Ours:** `class="note-modal open note-carousel-modal"`. `M0e` opens on const 26, `modal-header`, and
declares no class of its own for the modal root at all — the root is NgbModal's.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### CD-07 — The carousel modal and its browser drop the capture's padded labels, and three of them stay dropped

**HALF BUILT 2026-08-30.** Padded: ` Add slide `, ` Select Image `, both ` Cancel `s, the swung title
(` Edit / Insert Image Carousel `) and the swung primary button (` Save Changes ` / ` Insert
Carousel `). The rule and its measurement are `files-pane-contract.test.ts`'s and are not restated.

**` Upload `, ` Browse ` and ` Change image ` are still unpadded, and the reason is not a
measurement** — the capture pads all three, at bytes 1,462,593, 1,462,725 and 1,463,600. It is that
three assertions pin their exact current spelling in two contract test files this change was not
permitted to edit:

- `note-image-browser-contract.test.ts:132` — `'><i class="fas fa-folder-open"></i> Browse</button'`
- `note-image-browser-contract.test.ts:268` — `'><i class="fas fa-upload"></i> Upload</label'`
- `note-carousel-slide-contract.test.ts:76` — `'><i class="fas fa-times"></i> Change image</button'`

Each needs one edit — `Browse</button` becomes `Browse{' '}</button`, and so on — after which the
three labels take the pad like the rest. `note-padded-labels-contract.test.ts` asserts the three ARE
still unpadded, deliberately: written as a comment the exception would rot the moment somebody fixed
it, and written as an assertion it expires by failing.

**low** · `wrong-constant` · reference byte **1,462,593**

```
d(7,"label",59),T(8,"i",60),v(9," Upload "),u(),d(10,"button",61),x("click",…openFileBrowser(o)),T(11,"i",62),v(12," Browse ")
```

**Ours:** None of the component's labels carried the capture's spaces; nine other components in this
room use the `{' '}` idiom in 42 places and the three note components used it in none.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### CD-08 — Both modals are opened `size:"lg"` in the reference and are 600px wide here

**OWNER DECISION, NOT BUILT — recorded 2026-08-30.** The reference opens BOTH of this component's
modals large, and it says so twice: `size:"lg"` at byte 1,475,314 (`openCarouselModal`, and again in
`editCarousel`) and at byte 1,477,226 (`openFileBrowser`). That is NgbModal's `.modal-lg`.

This room's chrome is summernote's, not NgbModal's, and the captured sheet ships the corresponding
width already: `.note-modal-content { width: 600px }` and `.note-modal-content-large { width: 900px }`,
both in `css/complete-app-styles.css`. Our two modals wear the first. So the change is one class on
each of two elements and the class is a captured one.

**What the owner has to answer is whether that mapping is a transcription or an inference.**
`size:"lg"` is NgbModal's vocabulary and `note-modal-content-large` is summernote's; nothing in either
capture states that one means the other, and the width of a modal is a visual decision that cannot be
verified from this checkout — there is no rendered capture of either dialog. It is left measured
rather than guessed, because a ten-slide carousel editor at 600px is a real complaint and a modal
that grew 300px because an agent inferred an equivalence is a different one.

**low** · `divergence` · reference byte **1,475,314**

```
this.modalService.open(this.carouselModal,{ariaLabelledBy:"carousel-modal-title",size:"lg"}).result.then(()=>{},()=>{})
```

**Ours:** `CarouselDialog.svelte` renders `<div class="note-modal-content">` for both modals, which
`css/complete-app-styles.css` sizes at 600px. `.note-modal-content-large` has no wearer anywhere in
`apps/room/src`.

---

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

## notes/NotesPane.svelte

4 rows, read against `zSe` (byte 1,930,173) — the notes pane inside `app-presentationarea` — and its
two row templates `jSe` and `$Se`.

### NP-01 — One tab panel is rendered where the reference renders one per note, so every inactive tab's `aria-controls` names an element that does not exist

**BUILT 2026-08-30.** A panel per note, `show active` toggled, which is Bootstrap's tab-pane shape and
the reference's: `zSe` repeats BOTH lists over the same array — `ht(1,jSe,9,11,"li",16,pc)` for the
tabs and `ht(4,$Se,10,9,"div",72,pc)` for the panels at byte 1,930,259 — and const 72 is
`["role","tabpanel",1,"tab-pane","fade",3,"ngClass","id"]`, with `show active` arriving through
`ngClass`.

**The sharp end is not the missing markup, it is that two green assertions described a broken
relationship.** `notes-pane-render.test.ts` has asserted `aria-controls="60"` on the second tab and a
single panel `id="59"` since it was written. Both were true. Together they say that every tab but the
open one pointed at an id nowhere in the document — which is not a degraded experience but a broken
one, because the control announces a relationship a screen reader then cannot follow. A test can pin
two facts and never ask whether they agree; the new assertion sweeps every `aria-controls` in the
rendered output and requires the id it names to exist, so a third note is covered without anyone
remembering.

The second cost was the thing a tab strip is for: `.note-container` is `overflow-y: auto`, so each
panel is its own scroller, and unmounting it threw away where the reader was.

**What is deliberately NOT repeated is the editor.** Upstream renders `app-note` in every panel and
lets each decide whether it is editing (`H(0,T0e,16,3)` gated on `isEditing`); ours mounts
`NoteEditor` only in the panel being edited, because ours is a Tiptap instance with a document, an
undo stack and a three-second autosave timer, and `editingNoteId` is a single value — a second
instance is unreachable and would cost all of that per note in the room. The read-only `.note-view`
IS repeated, which is what upstream's `app-note` renders when it is not editing. Control seen red:
restoring the single panel failed four assertions, one of them naming `aria-controls="60"`.

**medium** · `missing-behaviour` · reference byte **1,930,259**

```
d(3,"div",121),ht(4,$Se,10,9,"div",72,pc),u()),2&t){const e=g();m(),pt(e.appService.globals.sessionNotes),m(3),pt(e.appService.globals.sessionNotes)
```

**Ours:** `div#notesTabsContent` held a single `{#if activeNote !== null}` panel with `tab-pane fade
show active` written into the class list, while `ul#notesTabs` rendered one `<li>` per note and gave
each anchor `aria-controls={note.id}`.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### NP-02 — The tab click is bound to the `<a>`; const 31 carries it on the `<li>` and const 73 has no listener at all

**BUILT 2026-08-30.** Moved to the `<li>`, which is what `jSe` does at byte 1,928,643:
`d(0,"li",31),x("click",…onNotesTabChange(o._id))`. Const 31 is
`["role","presentation",1,"nav-item",3,"click"]` at byte 1,996,498; const 73, the anchor, is
`["data-bs-toggle","tab","role","tab","aria-selected","true",1,"nav-link",3,"ngClass","id"]` at byte
1,999,647 and declares two bindings, neither of them a listener.

Measured rather than assumed to matter: `.noteTabset .nav-link` carries `margin: 5px`, so every tab in
this strip has a five-pixel ring that belongs to the `<li>` and to nothing else, and a press landing
there did nothing. `acA-12` is the same finding on the two alert-toolbar toggles and was built the
same way, which is why this is transcribed rather than argued about again.

The anchor keeps `role="tab"` and its `aria-*`: it is what a screen reader reads as the tab, and
moving the handler outwards does not move the role. **No `svelte-ignore` is needed and two were
written before being measured** — `svelte-autofixer` answered `svelte-ignore comment is used, but not
warned` for both, because `role="presentation"` takes the element out of the accessibility tree and
neither `a11y_click_events_have_key_events` nor `a11y_no_noninteractive_element_interactions` fires.
A suppression for a warning that does not fire is one that will later hide a warning that does.

The rendered `<li>` is byte-identical either way — a handler is not an attribute — which is precisely
why it needed a test. Control seen red.

**low** · `divergence` · reference byte **1,928,643**

```
d(0,"li",31),x("click",function(){const o=D(e).$implicit;return E(g(2).onNotesTabChange(o._id))}),d(1,"a",73)
```

**Ours:** `onclick` sat on the `<a class="nav-link">` with an `event.preventDefault()` that had
nothing to prevent — the anchor carries no `href` — inside a plain `<li role="presentation"
class="nav-item">`.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### NP-03 — The three `.noteOptions` buttons drop the capture's trailing space

**BUILT 2026-08-30.** `Edit `, `Download ` and `Delete ` — `v(2,"Edit ")` at byte 1,929,396,
`v(2,"Delete ")` at 1,929,566 and `v(8,"Download ")` at 1,929,833. These three carry a trailing space
and NO leading one, which is the opposite of the editor's bar and is correct: consts 137/134/139 put
`mr-2` on the icon, so the gap on the left is a margin and not a text node.

Same rule as NE-02 and CD-07, same one place it is argued. `note-padded-labels-contract.test.ts`
renders the pane and checks the rendered strings as well as the source. Control seen red on both
halves.

**low** · `wrong-constant` · reference byte **1,929,833**

```
d(6,"button",133),x("click",function(){const o=D(e).$implicit;return E(g(2).downloadNote(o))}),T(7,"i",134),v(8,"Download ")
```

**Ours:** All three labels were markup text followed by a newline, so the compiler dropped the space.
The FilesPane trio next door — `Download{' '}`, `Delete{' '}`, `Play{' '}` — has kept it since that
pane was built and is pinned by its own contract test.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### NP-04 — The read-only note body has no `app-note` host and no `height: 100%`, and neither is reproduced

**MEASURED REFUSAL 2026-08-30.** The reference's `app-note` component ships two scoped rules of its
own at byte 1,487,671 — `[_nghost-%COMP%]{display:block;height:100%}` and
`.note-view[_ngcontent-%COMP%]{height:100%}` — and ours renders neither: the read-only branch is a
bare `.note-view` with no `<app-note>` around it, and `.note-view` has no rule in any sheet this app
ships.

Not built, and the measurement is why. The rule sizes the note body to its container, and the
container already bounds and scrolls it: `.note-container` is `height: calc(100% - 140px);
overflow-y: auto` in `css/complete-app-styles.css`. Content taller than the container scrolls either
way; content shorter than it leaves the container's own `--note-text-bg` painting the remainder either
way. The one case the rules would change is an EMPTY note, where the reference's `.note-view` is
full-height and ours is zero-height — inside a padded container that paints the same background in
both. There is nothing to see.

The host element is the same answer for a shorter reason: `app-note` has no rule anywhere in
`apps/room/src` or in any sheet, so adding the custom element would add a wrapper nothing reads. It
exists in the reference because Angular needed somewhere to hang a component; ours mounts the editor
inside `<app-note>` where it does render one, and that is the only place it is load-bearing.

Recorded rather than left silent because the pair is a real difference and the next reader diffing
the two templates will find it in ten seconds and spend ten minutes deciding.

**low** · `divergence` · reference byte **1,487,671**

```
[_nghost-%COMP%]{display:block;height:100%}.note-view[_ngcontent-%COMP%]{height:100%}
```

**Ours:** `NotesPane.svelte` renders `<div class="note-view" id="summernoteEdit-{id}">` directly
inside `.note-container`, with no `<app-note>` ancestor and no rule for either class. `NoteEditor`
renders `<app-note>` and styles it `display: block; min-height: 100%` in its own scoped block, which
is the half of the pair that has a consumer.

---

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

## ExtraChatPane.svelte

Nine rows, all added on 2026-08-31 by a reading of `app-extra-chat` end to end — its consts table
decoded by value at byte 2,393,850, its template function at 2,399,236, its class body from 2,374,375
and its own stylesheet at 2,400,462. This surface had no section in this document before that
reading, and it is deliberately not in the surfaces table above: that table describes the
two-verifier pass, and this is not part of it.

`ExtraChatPane` is the SECOND compiled copy of the chat column and the two copies differ, so every
offset below says which copy it came from. Where the difference is `ChatTabStrip`'s — `acA-06` and
the second half of `acA-11` — it is named and not touched, because that file belongs to another
reading in progress.

### XCP-01 — `#textAreaHolderExtra` is an invented id, and it cost the column its whole composer stylesheet plus the width container

**FIXED 2026-08-31.** The holder wears `textAreaHolder` again, through
`EXTRA_CHAT_COMPOSER_HOLDER_ID` in `#lib/extra-chat-surface.ts`, which carries the measurement.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

The suffix was ours, added for id uniqueness, and it silently cut the second chat column off from
five rule families at once: `#textAreaHolder` itself (`app.css:394` — the flex row, the 5px margin
and padding, the 8px radius, the textarea background), the two 35px min-heights on its wrappers
(`:410`, `:415`), `#textAreaHolder textarea` and its focus ring (`:420`, `:439`), all three
`.darkTheme #textAreaHolder` rules (`:1410`, `:1414`, `:1421`), and — the one that turned a control
into a no-op — `container-type: inline-size` at `:476`.

**A container query with no container ancestor evaluates to false.** So
`@container (width < 410px) .textAreaBtnsCol:not(.composer-options-forced) .composer-options`
never hid the option buttons and `@container (width >= 410px) .composer-expand` never hid the "+",
and BOTH sets rendered at every width. The only rule still biting was
`.composer-options-forced .composer-expand`, which is not inside a query — so pressing "+" hid "+"
and revealed nothing, because nothing was hidden. That is `CLAUDE.md`'s "no control whose only
effect is changing its own label", in the room, reachable by any viewer with the second column on.

`.textSendDiv` has NO rule in any stylesheet in this repository — grepped, zero hits — so nothing
covered for the missing id.

**high** · `defect` · reference byte **2,393,850**

```
[1,"px-0","flex-fill"],["id","textAreaHolder",1,"d-flex","align-items-center","textSendDiv"]
```

**Ours:** ExtraChatPane.svelte rendered `<div id="textAreaHolderExtra" …>`. The reference's const 25
is byte-identical to `app-chat`'s, and `app-extra-chat`'s OWN component stylesheet addresses it by
that id at byte **2,405,618** — `#textAreaHolder[_ngcontent-%COMP%]{background-color:var(--textarea-bg);border-radius:8px;padding:5px;margin:5px}`.
The duplicate id is therefore the reference's own; this repository already carried it twice
(`AlertChatArea.svelte:1208`, `AlertQaComposer.svelte`). Nothing in `src/` resolves it in script —
every occurrence is a CSS selector, markup, or a contract test. The FIELD ids stay distinct
(`textAreaTxt` / `textAreaTxtExtra`), which is the separation `RM-16` shows the reference itself
makes. Pinned by `extra-chat-surface-contract.test.ts`, whose negative control (restoring the
suffix) failed two assertions.

### XCP-02 — the brand has no `&nbsp;Chat` label when the room has no channels

**BUILT 2026-08-31.** `{#if chatTabs.length === 0}<span>&nbsp;Chat</span>{/if}`, in the navbar brand.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

The second half of `acA-11`, which `AlertChatArea.svelte:1028` has carried since that row was
written and this column never got. `ChatTabStrip` already suppresses the whole `<ul>` when there are
no tabs, so without this label a room with no channels configured drew a bare comment glyph in this
column's header and nothing said "Chat". `&nbsp;` and not a space: the capture's character is the
escape `\xa0`, and a plain space would be folded away by the surrounding template whitespace.

**low** · `missing-behaviour` · reference byte **2,367,381**

```
function j3e(t,n){1&t&&(d(0,"span"),v(1,"\xa0Chat"),u())}
```

**Ours:** ExtraChatPane.svelte's `<a class="navbar-brand ml-1 mr-1">` held the comment glyph and the
DND badge and nothing else. The gate is `O(5,0==o.chatTabs.length?5:-1)` at byte **2,399,848**,
inside `app-extra-chat`'s own template function at 2,399,236 — not the main column's, which is a
separate copy at 1,453,850.

### XCP-03 — Alt+Enter sends the message where the reference inserts a newline

**FIXED 2026-08-31.** The captured three-way branch is now one function,
`composerEnterAction` in `#lib/chat-composer-enter.ts`, and both composers this repository owns route
through it.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

`submitOnEnter` guarded on `event.shiftKey` alone, so Alt+Enter fell through to the send. The Q&A
modal's composer had the same rule right against the same upstream shape, so the two composers in
this repository disagreed about one keystroke — the "three implementations, one of them unfed"
failure `room-message-chrome.ts` records, in miniature. Falling through rather than appending `"\n"`
by hand is a deliberate divergence and is kept: the browser puts the break at the caret and keeps
the undo stack, which `i.val(i.val()+"\n")` does not.

**medium** · `defect` · reference byte **2,386,309**

```
e.altKey?(i.val(i.val()+"\n"),this.autoExpand(e.target)):(this.showEmojiChooser=!1,this.sendMessage()
```

**Ours:** ExtraChatPane.svelte's `submitOnEnter` read
`if (event.key !== 'Enter' || event.shiftKey) return;`. The shift branch is at byte **2,386,255** and
the alt branch at **2,386,309**, both inside `app-extra-chat`'s `onKey` (byte 2,386,131) — the extra
column's own handler, keyed to `#textAreaTxtExtra`.

### XCP-04 — sending a message leaves the emoji picker open over the message that just arrived

**BUILT 2026-08-31.** `emojiOpen = false` before `onsend()`, which is the order the reference uses.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

`this.showEmojiChooser = !1` is the FIRST act of the send branch, before `sendMessage()`. It is not
incidental: the picker is an absolutely positioned popover over the composer, so leaving it up hides
the message the viewer just sent. `AlertQaModal` already closed its own; this column did not.

**low** · `missing-behaviour` · reference byte **2,386,367**

```
this.showEmojiChooser=!1,this.sendMessage(),this.autoExpand(e.target)
```

**Ours:** ExtraChatPane.svelte's send path called `onsend()` and touched neither `emojiOpen` nor
`giphyOpen`.

### XCP-05 — the emoji and GIF triggers carry none of their captured attributes

**BUILT 2026-08-31.** Both const tables are now named constants in `#lib/extra-chat-surface.ts`,
quoted in full beside the values they produce, and spread onto the two triggers.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

The emoji trigger had `class` and `aria-describedby` and nothing else, where const 66 carries four
popover attributes — `placement`, `container`, `autoClose`, `popoverClass`. They are the popover's
placement and its escape rule, not decoration: `autoClose: "outside"` is what dismisses the picker on
a click elsewhere and `container: "body"` is what stops it being clipped by the composer's overflow.
The main column's trigger (`AlertChatArea.svelte`) and the Q&A modal's both carry them; this was the
third of three and the only one without, which is the same one-of-two shape `EMOJI-10` records for
`popoverId`.

The GIF trigger carried the font size alone, so it was the ONE composer button in this column with no
tooltip at all. Const 72 writes `placement` TWICE — `top` then `auto` — and `auto` is reproduced,
because the later value is the one Angular applies and it is what `AlertChatArea` already resolved
the same const to.

Applying the two spreads removed four `svelte-ignore` lines, and that is expected rather than a
regression: the compiler stops issuing `a11y_click_events_have_key_events` and
`a11y_no_static_element_interactions` once a spread is present, so the ignores suppressed nothing and
`svelte/no-unused-svelte-ignore` failed on them. Verified by removing them and re-running
`svelte-check` — 1,495 files, 0 errors, 0 warnings — and `eslint`, clean.

**low** · `divergence` · reference byte **2,393,850**

```
["placement","auto","container","body","autoClose","outside","popoverClass","popOverDiv",1,"textAreaBtns",3,"click","ngbPopover"]
```

**Ours:** ExtraChatPane.svelte's emoji `<span>` was `class="textAreaBtns"` plus `aria-describedby`;
its GIF `<span>` was `class="textAreaBtns" style="font-size: 12px;"` plus `aria-describedby`. Const
66 and const 72 of this component's own table are decoded in
`extra-chat-surface-contract.test.ts`, which slices the bundle for both rather than trusting the
transcription.

### XCP-06 — a cited const number belongs to `app-chat`'s table, not this component's

**FIXED 2026-08-31.** The webinar tooltip is const **53** here; the comment said 56.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

The two tables are NOT an offset of one another. `app-chat` carries a "Detach Chat" button at its own
53/54 that this column has no node for at all, so its numbering runs ahead: index 56 there is the
webinar tooltip, index 56 here is `[1,"users-count","me-1"]` — the typing indicator's counter, a
different control entirely. A const number is only readable against the table it came from, and this
is the second time in a week that a cited index in this repository pointed at something else.

The same reading measured `Z3e`'s fifth node — `T(4,"i")`, a bare `<i>` with no const, so no class,
no attribute and no text — and REFUSED it. An element with no class cannot be styled and this room
has no rule that could reach it, so reproducing it would add a tag nothing renders and nothing reads.

**low** · `wrong-constant` · reference byte **2,393,850**

```
["placement","top","ngbTooltip","In webinar mode users only see their own chat messages, while Presenters see everyones messages...",1,"ml-2"]
```

**Ours:** ExtraChatPane.svelte's webinar comment read "tooltip verbatim from const 56". The tooltip
string itself was always right; only the index pointing at it was wrong.
`extra-chat-surface-contract.test.ts` proves the divergence by asserting that `"title","Detach Chat"`
is in `app-chat`'s table and absent from this one.

### XCP-07 — the roomscroller's `ngClass` is not bound

**MEASURED REFUSAL 2026-08-31.** The class it would apply has no rule in any of the 52 stylesheets
this repository holds, and that measurement already exists — this row points at it rather than
repeating it.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

`USM-18` and `settings-preference-wiring-contract.test.ts` argued this pair for the settings checkbox
that drives it and refused the same binding there. Binding it here would switch on a class name
nothing reads, which is the "no `.flipped` class with no CSS" rule.

**low** · `divergence` · reference byte **2,400,160**

```
("ngClass",ct(13,B3e,o.appService.globals.preferences.smallImagePreview&&o.appService.globals.preferences.defaultImagePreview))
```

**Ours:** ExtraChatPane.svelte's `<app-extra-roomscroller>` carries the three captured inline styles
and no `class`. `B3e` at byte **2,367,305** is `t=>({"chat-uploaded-img-sm":t})`;
`extra-chat-surface-contract.test.ts` reads both offsets and then asserts the class has no rule in
`app.css` or `captured-runtime-components.css`.

### XCP-08 — the "Play YouTube For All" button is absent from this composer

**BLOCKED 2026-08-31.** One line in `routes/+page.svelte` unblocks it, named below.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

`lMe` resolves five children and the gates at byte **2,373,334** read
`O(2, canPostImages …)` image, `O(3, isPresenter …)` **YouTube**, `O(4, canPostImages …)` GIF,
`O(5, …enableRTE && …enableRTE && …isPresenter …)` RTE. The main column draws the third
(`AlertChatArea.svelte:1288`) and this one does not, so a presenter can send a video to the room from
one chat column and not from the other.

**What would unblock it:** `apps/room/src/routes/+page.svelte`, inside the `<ExtraChatPane …/>` call
that begins at **line 1477** — add one prop:
`onyoutube={gates.isPresenter ? () => modals.open('youtube') : undefined}`. The gate belongs on the
page for the reason this component's own note gives: it is handed each entitlement's RESULT rather
than the raw `isPresenter`, so authority stays decided in one place. Without a caller, an optional
handler and its branch would be a prop nothing passes and a control nothing reaches, which is the
scaffolding rule this repository has already paid for once.

**medium** · `missing-control` · reference byte **2,371,656**

```
function iMe(t,n){1&t&&(d(0,"span",68),T(1,"i",71),u())}
```

**Ours:** ExtraChatPane.svelte draws emoji, image, GIF and RTE and nothing between the image and the
GIF. Const 68 is
`["data-bs-toggle","modal","data-bs-target","#play-youtube-modal",1,"textAreaBtns"]` and const 71 is
`["ngbTooltip","Play YouTube For All","placement","left",1,"fas","fa-video"]`. The reference's span
carries NO click — it is a Bootstrap data-target — and this room's `Modal` is not Bootstrap-driven,
which is why `AlertChatArea` reaches its host through a prop and why this column cannot.

### XCP-09 — `app-extra-chat` has no transcribed stylesheet at all, and the capture it would come from never saw the component

**BLOCKED 2026-08-31.** A re-capture unblocks it; a hand-edit is forbidden.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

This is the largest single gap on the surface and it is invisible from the markup, which is why it
was found by reading the bundle's `styles:` array rather than the template. `app-extra-chat` ships
**5,818 bytes** of component styles — `.chatTabs` and its five `.nav-link` states, `.counterBadge`,
`.typing-indicator-container`, `.users-count`, `.users-typing`, `.txt-area` and its focus ring,
`.textAreaBtns` and its hover, `.textAreaBtnsCol`, `#textAreaHolder`, `.chatDisabled`,
`.webinarMode`, `.roomLog`, and the whole Giphy popover. `src/lib/styles/captured-runtime-components.css`
contains the string `app-extra-chat` **zero times**.

The reason is in the generator's INPUT rather than the generator: `apps/room/css/complete-app-styles.css`
— whose SHA-256 is the one that generated file's header pins — contains `extra-chat` zero times too.
That capture was taken from a room with `preferences.extraChatColumn` OFF, so Angular never mounted
the component and never injected its styles into the document being captured.

**What would unblock it:** a re-capture of `apps/room/css/complete-app-styles.css` from a room with
the second chat column enabled, followed by `pnpm css:sync-captured`. It is NOT a hand-edit:
`AGENTS.md` forbids editing a generated artifact and that sheet's own header says so on line 9.

**high** · `missing-behaviour` · reference byte **2,400,462**

```
styles:[".navbar[_ngcontent-%COMP%]{font-size:12px;padding:2px}.chatToolbar[_ngcontent-%COMP%], .chatHeader[_ngcontent-%COMP%]{background-color:var(--msgs-header-bg);color:var(--msgs-header-color)}
```

**Ours:** everything this column renders is styled only by rules that happen to be global or to be
`app-chat`'s written unscoped. Spot-checked: `.chatDisabled` and `.webinarMode` exist in `app.css`;
`.chatTabs`, `.counterBadge`, `.typing-indicator-container`, `.users-typing` and `.txt-area` exist
ONLY under `app-chat`, `app-privchat`, `app-reply-modal` or `app-alert-qa-modal` scopes in
`captured-runtime-components.css`, none of which reaches this component.
`extra-chat-surface-contract.test.ts` asserts both halves — the bundle HAS the stylesheet, and
neither the generated sheet nor its input has ever seen the component.

## AlertQaModal.svelte

Thirteen rows, all added on 2026-08-31 by a reading of `app-alert-qa-modal` end to end — its consts
table decoded by value at byte 2,341,450, its template function at 2,343,416, its class body from
2,333,560 and its own stylesheet at 2,344,356. This surface had no section in this document before
that reading, and it is deliberately not in the surfaces table above.

Four rows were built, two were fixed, one was already built, one is a measured refusal and four are
BLOCKED on the same two lines of `ModalHost.svelte` and its render of this component. The modal
reached its `source-size-contract` ceiling in the process, so `AlertQaAlertCard.svelte` (the
reference's own `e3e`) and `AlertQaComposer.svelte` (its footer) came out of it; the rows name
whichever of the three now owns the code.

### QAM-01 — a Q&A thread never shows a date separator, because `showDateSeparator` is hardcoded false

**BUILT 2026-08-31.** `showsDateSeparator(index)`, reproducing the reference's `prevD`.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

The reference passes each entry the PREVIOUS entry's timestamp, and `app-st-message` turns it into
`isND`, which its own template gates the separator on — `O(2, o.isND ? 2 : -1)` at byte **1,361,572**.
An alert's Q&A stays open for as long as the position does, so a thread running past midnight is
ordinary rather than exotic; it showed one unbroken run of times with no day boundary anywhere.

`sameCalendarDay` and NOT `getDay()`: upstream compares the day of the WEEK, so two entries exactly
seven days apart compare equal and the separator is skipped. That is a defect and this repository
already decided against reproducing it — the same helper draws the separator in both chat columns.
`index > 0` reproduces the `i > 0 ? … : 0` half exactly: the first entry has no predecessor, so
`prevD` is `0`, so `this.prevD &&` is false, so `isND` stays at its `!1` initial value.

**medium** · `missing-behaviour` · reference byte **2,332,963**

```
("msg",e)("isP",o.isPresenter)("logType",o.logType)("isQAMsg",o.isQAMsg)("qaMsgID",o.qaMsg._id)("msgIndex",i)("prevD",i>0?o.msgs[i-1].t:0)
```

**Ours:** AlertQaModal.svelte passed `showDateSeparator={false}` to every entry. The same `prevD`
binding is at byte **2,333,284** in the COMPACT renderer, and the flag it feeds is built at byte
**1,346,064** in `app-st-message`. Pinned by `alert-qa-surface-contract.test.ts`, whose negative
control (restoring the hardcoded `false`) went red.

### QAM-02 — the composer is not emptied when the modal opens on a different alert

**BUILT 2026-08-31.** Cleared on the open transition, keyed by the alert's id.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

`Modal` keeps this component mounted and toggles `display`, so `qaComposer` survived every close.
Half a question typed against alert A, abandoned, then the Q&A opened on alert B — and the fragment
was sitting in the box addressed to the wrong alert, one Enter away from being posted there. That is
why this is a defect rather than a tidiness point.

The marker is a PLAIN field and not `$state`: nothing renders from it, and an effect that reads its
own marker reactively re-runs on the write that was meant to end it. `arrivals.ts` records the same
reasoning for the same shape.

**medium** · `defect` · reference byte **2,334,927**

```
i&&(yi("#alertQAModal").modal("show"),this.modalId=e._id,yi("#textAreaQATxt").val(""))
```

**Ours:** AlertQaModal.svelte declared `qaComposer = $state('')` and cleared it only on a successful
send. The clear is the `openModal` half of the `openAlertQAModal` subscription upstream, so it fires
on an OPEN and not on the thread refreshes that follow it — which is why this is keyed on the alert
id rather than on `open` alone.

### QAM-03 — the thread opens on its oldest entry

**BUILT 2026-08-31.** The modal body is scrolled to its bottom on open and on each arrival.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

`scrollToBottomQA()` is called from three places upstream: on `openAlertQAModal` once the thread is
assigned, from `ngAfterViewInit`, and at the end of `sendMessage`. Its target is the `.modal-body`
itself — reference index 0 in the consts table, attached by `d(9,"div",10,0)`. The container really
does scroll: `#alertQAModal .modal-body` is
`min-height:330px; max-height:70vh; height:100%; overflow-y:auto` in the component's own stylesheet
at byte **2,344,478**, transcribed at `captured-runtime-components.css:5400`. Without it, opening the
Q&A on an alert with a long thread showed the OLDEST question and the answer everyone came for was
below the fold.

`tick()` rather than the reference's `setTimeout(…, 500)`: that wait exists because Bootstrap's
`.modal("show")` animates, and what is actually being waited for is the body having a layout to
measure. `Modal` sets `display: block` in the same flush that flips `open`.

**medium** · `missing-behaviour` · reference byte **2,335,916**

```
scrollToBottomQA(){const e=this;try{setTimeout(()=>{e.qaContainer.nativeElement.scrollTop=e.qaContainer.nativeElement.scrollHeight},500)}catch{}}
```

**Ours:** AlertQaModal.svelte had no scroll of any kind. The element is reached with `bind:this` on
the component's own host element and a `querySelector` for `.modal-body` inside it —
`dom-reference-contract.svelte.test.ts`'s rule, taken the way it asks rather than with an attachment
that assigns and clears a node.

### QAM-04 — "the captured textarea had no handler at all" is false, and it was licence

**FIXED 2026-08-31.** The claim is corrected in place, with the three bindings that refute it.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

The behaviour under that sentence was RIGHT and the justification was invented, which is worse than
no comment: a handler introduced with "the capture had none" is a handler anybody may redesign. Const
17 ends `3,"keyup","paste","placeholder"` — three bindings, not zero — the template attaches the
first two at byte **2,343,759**, and `onKey` at byte **2,336,560** is the same three-way Enter branch
every composer in the application carries.

The correction is recorded rather than the sentence deleted, so it reaches whoever read the old one.
The `keydown`-not-`keyup` divergence is real and stays: upstream needs a second binding
(`onKeydown(e){e.preventDefault()}`) purely to stop the browser inserting a newline before the keyup
arrives, and one handler on `keydown` has nothing to keep in step.

**low** · `defect` · reference byte **2,342,103**

```
["name","txt-area","id","textAreaQATxt","rows","1","spellcheck","true",1,"txt-area","form-control","border-0",3,"keyup","paste","placeholder"]
```

**Ours:** AlertQaModal.svelte carried the false sentence above `handleQaKeydown`; the handler now
lives in `AlertQaComposer.svelte` with the measurement. The Enter rule itself moved to
`#lib/chat-composer-enter.ts`, shared with `ExtraChatPane` — which is `XCP-03`'s other half.

### QAM-05 — the image-upload button has no click handler, and its gate is narrower than the reference's

**BLOCKED 2026-08-31.** One line in `ModalHost.svelte` unblocks it, named below.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

Two defects in one node. **It does not act:** const 36 is `[1,"textAreaBtns",3,"click"]` — a click
binding — and `l3e` at byte **2,333,483** wires it to `imgUpload()`. Ours carries no handler at all,
so a presenter clicking the image icon in the Q&A footer gets nothing. **Its gate is the wrong
value:** `canPostImages` is set once in `ngOnInit` at byte **2,334,626** as
`(this.isPresenter || sessData.userUploads)`, so a room with member uploads on offers this to
members; `isPresenter` narrows it to presenters only.

**What would unblock it:** `apps/room/src/lib/components/ModalHost.svelte`, in the `<AlertQaModal …/>`
call at **line 5636** — add one prop, `onimageupload={() => composer.openImageUpload()}`, the same
path both chat composers already use. Building the upload call locally instead would put a second
implementation inside a modal, which is how two of them drift.

**high** · `missing-control` · reference byte **2,333,483**

```
function l3e(t,n){if(1&t){const e=Y();d(0,"span",36),x("click",function(){return D(e),E(g().imgUpload())}),T(1,"i",37),u()}}
```

**Ours:** the span is rendered — with its tooltip, its class and its gate — and does nothing. It now
lives in `AlertQaComposer.svelte` with both measurements recorded at it.
`alert-qa-surface-contract.test.ts` asserts the button IS drawn before asserting what it lacks, so
the row cannot go green by the button disappearing.

### QAM-06 — pasting an image into the Q&A composer does nothing

**BLOCKED 2026-08-31.** The same line as `QAM-05` unblocks it.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

Const 17 declares `paste` beside `keyup`, and the template binds it to `onImagePaste` at byte
**2,343,759**; the handler itself is at byte **2,339,887** and uploads the pasted file with whatever
is already in the box as its message. There is no paste handler on our Q&A composer at all.

Filed separately from `QAM-05` rather than folded into it because the two are different affordances
with different failure modes — a dead button is visible, a missing paste handler is not — but they
are unblocked by the same prop, and a reader closing one should close the other.

**medium** · `missing-behaviour` · reference byte **2,342,103**

```
3,"keyup","paste","placeholder"
```

**Ours:** `AlertQaComposer.svelte`'s textarea binds `onkeydown` only. `#lib/pasted-image.ts` and
`ImageUploadDialog.svelte` exist and are wired to the two chat composers; neither is reachable from
this modal.

### QAM-07 — `bodyStyle="max-height: 70vh;"` duplicates one declaration of a four-declaration rule

**FIXED 2026-08-31.** The inline copy is gone; the transcribed rule is unchanged.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

`#alertQAModal .modal-body{min-height:330px;max-height:70vh;height:100%;overflow-y:auto}` is the
component's own stylesheet at byte **2,344,478**, transcribed at
`captured-runtime-components.css:5400-5405`. An inline copy of one of the four wins the cascade for
that one and says nothing about the other three, so a reader comparing the modal to the capture found
the height in two places and the overflow in neither — and the inline copy is the one that goes
stale, because it is not what `pnpm css:sync-captured` regenerates.

**low** · `divergence` · reference byte **2,344,478**

```
#alertQAModal[_ngcontent-%COMP%]   .modal-body[_ngcontent-%COMP%]{min-height:330px;max-height:70vh;height:100%;overflow-y:auto}
```

**Ours:** AlertQaModal.svelte passed `bodyStyle="max-height: 70vh;"` to `Modal`. Removing it is what
made `QAM-03` possible to reason about: the scroll depends on `overflow-y: auto`, which only the
transcribed rule supplies.

### QAM-08 — the alert card is drawn even when there is no alert

**BUILT 2026-08-31.** `{#if alert}`, in `AlertQaAlertCard.svelte`.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

`O(7, o.qaMsg ? 7 : -1)` gates the whole of `e3e`, and each of the four fields inside it is gated
again — one `hasOwnProperty` apiece for `"avt" || "pic"`, `"t"`, `"n"` and `"txt"`. Rendered
unconditionally with a `?? ''` behind each field, an alert-less open drew the FRAME of a card: the
bordered `admin-alert` box, a 50px mystery-man avatar, an empty `<strong>` and an empty body, under a
heading reading "Q&A for Alert:". `Modal` keeps its subtree mounted and toggles `display`, so that is
reachable state and not a theoretical one.

**low** · `missing-behaviour` · reference byte **2,344,076**

```
O(7,o.qaMsg?7:-1)
```

**Ours:** AlertQaModal.svelte rendered the card unconditionally. `e3e` at byte **2,332,074** is a
sub-template called once, which is the seam the card was extracted along when the modal hit its size
ceiling — the reference's own division, not a new one.

### QAM-09 — the alert sender's name loses the reference's two spaces

**BUILT 2026-08-31.** `{' '}{alert.senderName}{' '}`, the repository's standing idiom.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

`username` is `mx-1` on a `flex-nowrap` row beside the timestamp, so those two spaces are rendered
separation between the name and whatever sits against it. `AGENTS.md` records the autofixer
suggestion this repository declines for exactly this reason: every capture comparison here diffs
rendered strings, so a space is evidence rather than formatting.

**low** · `divergence` · reference byte **2,331,372**

```
Ne(" ",e.qaMsg.n," ")
```

**Ours:** AlertQaModal.svelte rendered `{targetMessage?.senderName ?? ''}`, which Prettier and HTML
whitespace folding both collapse.

### QAM-10 — the alert body in the header is rendered as plain text where the reference pipes it

**BLOCKED 2026-08-31.** One line in `ModalHost.svelte` unblocks it, named below.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

The reference binds `innerHTML` to
`parseLinks(parseSymbols(qaMsg.txt, "chat", qaMsg.avt, null), preferences.chatGif, qaMsg._id, false)`
and chooses between two templates on `O(0, sessData.copyTrades ? 0 : 1)` at byte **2,332,021** —
`Xxe` with a `copyTradeOnClick` handler, `Jxe` without. So a `$TICKER` in the alert is coloured, a
pasted URL is a link and an image URL renders as the image. Ours shows the raw string, so the same
alert is fully piped in the log beneath the modal and markup-free inside it.

**What would unblock it:** `apps/room/src/lib/components/ModalHost.svelte` at **line 529**, in the
`targetMessage` shape — add `targetUrl?: string | null;`. `MessageBody` renders those segments and
emits `image` clicks, which `room/message-actions.svelte.ts:497` resolves through exactly that field;
without it this component cannot name the URL the dispatcher would open, and rendering the image with
a click that cannot act is the control-with-no-effect this repository refuses. The value is present
at runtime — `RoomOverlays.svelte:783` passes `messageActions.selected`, a full `MessageActionItem` —
so this is a declaration catching up with the data, not a new dependency.

**medium** · `missing-behaviour` · reference byte **2,331,625**

```
z("innerHTML",Tn(2,6,Tn(1,1,e.qaMsg.txt,"chat",e.qaMsg.avt,null),e.appService.globals.preferences.chatGif,e.qaMsg._id,!1),wn)
```

**Ours:** `AlertQaAlertCard.svelte` renders `{alert.body}` inside the captured
`msg-left text-formated preText ml-2 mr-2 p-0` div. `messageChrome` already carries both `chatGif`
and `copyTrades`, so the pipe's other two arguments are available; only the image click is not.

### QAM-11 — the avatar fallback drops the sender's gravatar hash

**BLOCKED 2026-08-31.** The same declaration as `QAM-10`, one field wider.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

The reference falls back to THAT SENDER's gravatar, built from their email hash. Ours falls back to
the hashless URL, which is the generic mystery-man for everyone — so a presenter with no stored
picture is anonymous in the Q&A header and identified everywhere else in the room.

**What would unblock it:** the same `targetMessage` shape at `ModalHost.svelte:529` — add
`senderEmailHash?: string;`. Adding an optional field to this component alone would leave it
`undefined` at the type level while the value is present at runtime, which is the invisible mismatch
this repository keeps finding; the declaration is what has to move.

**low** · `divergence` · reference byte **2,331,038**

```
z("src",e.qaMsg.pic||"https://secure.gravatar.com/avatar/"+e.qaMsg.avt+"?d=mm&s=50",Mt)
```

**Ours:** `AlertQaAlertCard.svelte` renders
`src={alert.senderAvatarUrl ?? 'https://secure.gravatar.com/avatar/?d=mm&s=50'}`. The `width` and
`height` beside it are OURS and stay: const 31 is `["alt","qaMsg.avt",3,"src"]` and sizes the image
from `.avatar img { max-width: 50px }`, which is a layout shift this repository's standard forbids.

### QAM-12 — the dialog's root class is bound to the alert's own id

**MEASURED REFUSAL 2026-08-31.** The effect that class exists to produce is already built elsewhere.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

`Rh("modal fade ", o.qaMsg._id, "")` concatenates the alert's id onto the class list, so the dialog
wears a class named after a database row. Its ONE reader is four hundred bytes away at 2,334,927: a
jQuery selector finding the dialog by that class in order to hang a Bootstrap `hidden.bs.modal`
listener that deletes the alert's `unreadQA` marker.

Refused, and the refusal is safe because that effect is already built:
`RoomModals.closeActive` (`room/modals.svelte.ts:167`) clears `unreadQaAlertIds` for the selected
alert on the way out and quotes this very line as its reason. Nothing in this room dispatches
`hidden.bs.modal` — the only two occurrences of the string in `src/` are that comment and the one in
`AlertQaModal.svelte`. A class with no rule and no reader is the "no `.flipped` class with no CSS"
case, and this one would additionally be unstable: a different string on every alert, which no
stylesheet and no test could ever name.

**low** · `divergence` · reference byte **2,344,038**

```
Rh("modal fade ",o.qaMsg._id,""),m(7),O(7,o.qaMsg?7:-1)
```

**Ours:** AlertQaModal.svelte passes `rootClass="fade modal"`. The order against the reference's
`"modal fade "` is order alone, which CSS does not read.

### QAM-13 — the thread's compact display mode

**ALREADY BUILT — verified by reading 2026-08-31, not rebuilt.** `RoomMessage.svelte:578` branches on
the mode and renders `app-st-compactmessage` itself.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

The reference chooses between two whole loops — `o3e` over `app-st-message` and `r3e` over
`app-st-compactmessage` — which reads at first glance as a branch this modal is missing. It is not:
the branch is one level down, in the component all three message surfaces share, so the modal's job
is to pass `displayMode` and nothing else. Recorded rather than duplicated, and recorded at all
because a reader decoding `a3e` will ask the same question.

**low** · `missing-behaviour` · reference byte **2,333,453**

```
function a3e(t,n){1&t&&H(0,o3e,2,0)(1,r3e,2,0),2&t&&O(0,"r"==g().displayMode?0:1)}
```

**Ours:** AlertQaModal.svelte passes `{displayMode}` to every entry and `RoomMessage` does the rest.
The mode itself is the ALERTS one, which is the reference's own choice — its `loadAlertsMode()` at
byte 2,335,599 is the same function the alerts log calls.

---

## PrivateChatComposer.svelte

Nine rows, read on 2026-08-31 against the pinned v4 bundle by bracket-walking `consts:[[` at byte
2,214,572 to 2,219,021 — 79 entries, decoded by value — rather than by looking up the slots the
existing rows name. Six of the nine are rows a slot lookup cannot produce.

### PCC-01 — Shift+Enter inserts a newline here, and no composer in the bundle does that

**FIXED 2026-08-31 02:15 UTC.** `chat-composer-enter.ts` now owns the branch, and
`PrivateChatComposer.svelte` calls it: Shift+Enter SWALLOWS, Alt+Enter is the newline, plain Enter
sends. Five negative controls, two of them on this row: flipping the swallow arm to `'newline'`
reported `2 failed | 29 passed`, and restoring it `31 passed`.

**high** · `divergence` · reference byte **2,208,387**

```
onKey(e){if(13==e.keyCode){e.preventDefault();const i=Ao("#textAreaTxtPM");e.shiftKey?(i.val(i.val()),this.autoExpand(e.target)):e.altKey?(i.val(i.val()+"\n"),this.autoExpand(e.target)):(this.showEmojiChooser=!1,this.sendMessage(),this.autoExpand(e.target))}}
```

**Ours:** `PrivateChatComposer.svelte:172` read `if (event.shiftKey || event.altKey) { draft += '\n'; return; }` — one branch where the capture has two, so Shift+Enter put a line break into a box whose capture reassigns the value to itself and inserts nothing.

**And this repository has now held three opinions about that one arm.** The bundle carries six `onKey` implementations and FIVE are the fragment above, character for character apart from the jQuery alias and the element id: 1,439,821 (`#textAreaTxt`, the main chat composer), 2,208,387 (`#textAreaTxtPM`), 2,319,787 (`#textAreaReplyTxt`), 2,336,560 (`#textAreaQATxt`), 2,386,131 (`#textAreaTxtExtra`). The count is asserted rather than quoted — `private-chat-composer-v4-contract.test.ts` splits the bundle on that fragment and requires exactly five. The sixth, 2,047,549, is the inline alert box, and `inline-alert-key.ts` has ITS branch right.

**The lead this batch was given named `apps/room/src/lib/chat-composer-enter.ts` as an existing module and it does not exist in this checkout** — `ls` and `grep -rn "composer-enter" src` both return nothing, and nothing under `src/` imports such a name. So this row did not check ours against that module; it built it, from all six offsets, with the private composer as its consumer.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### PCC-02 — Sending does not close the emoji panel, and the capture closes it first

**FIXED 2026-08-31 02:15 UTC.** The send arm sets `composerPopover = null` before `onsend()`, in that order, because that is the order upstream writes. **The negative control for this came back GREEN the first time and that is the useful part of the row**: deleting the line changed nothing, because the behaviour had been written and never guarded. Two source-and-bundle assertions were added and the control then reported `1 failed | 32 passed`, restoring to `33 passed`.

**medium** · `missing-behaviour` · reference byte **2,208,387**

```
(this.showEmojiChooser=!1,this.sendMessage(),this.autoExpand(e.target))
```

**Ours:** the plain-Enter arm called `onsend()` alone. `showEmojiChooser` is the emoji popover's own flag — `toggleEmojiPanel()` at 2,208,614 is the only other writer — so a member who opened the picker, typed and pressed Enter left an emoji-mart panel sitting over the conversation they had just sent to.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### PCC-03 — The webinar notice says nothing: the words "Webinar Mode" were never rendered

**FIXED 2026-08-31 02:15 UTC.** `v(1," Webinar Mode ")` is transcribed, spaces and all, through the `{' … '}` idiom this repository already declines the autofixer's suggestion over. Negative control: mutating the string to `' Wbinar Mode '` reported `1 failed | 30 passed`; restored, `31 passed`.

**high** · `missing-behaviour` · reference byte **2,197,4xx** (`lEe`, in the run-up to `app-privchat`)

```
function lEe(t,n){1&t&&(d(0,"div",53),v(1," Webinar Mode "),d(2,"span",61),T(3,"i",62),u(),T(4,"i"),u())}
```

**Ours:** `PrivateChatComposer.svelte:222-234` rendered `<span class="px-1 webinarMode">` containing only the question-mark icon. Const 53's own rule is `.webinarMode{background-color:#aaa;color:#000;width:100%}` at byte 2,220,062 — a full-width grey banner — so what a member in webinar mode actually saw was an empty grey strip with a question mark in it, and the explanation of why their messages were private to them was reachable only by hovering an unlabelled icon.

**`T(4,"i")` is NOT transcribed.** It is the reference's own trailing `<i>` with no const, no class and no content; an element with no attributes and no children renders nothing, and copying it would be copying a typo. Recorded at the code so the next reader does not file it as a gap.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### PCC-04 — The webinar notice was inside the button column, after the textarea; the capture puts it first in the row

**FIXED 2026-08-31 02:15 UTC.** It is now the first child of `div.d-flex.mx-0`, before the textarea's wrapper. Asserted by index comparison on the server-rendered string — the notice's offset must be below both the textarea's and the button column's — rather than by looking for the class, because a class assertion passes wherever the element ends up.

**medium** · `divergence` · reference byte **2,198,563**

```
d(0,"div",50)(1,"div",52),H(2,lEe,5,0,"div",53),d(3,"div",54)(4,"textarea",55)
```

**Ours:** the `{#if webinarMode}` block sat inside `div.textAreaBtnsCol` — the three-icon column — which is where a 100%-wide grey banner is not a thing that belongs. `H(2,…)` is at index 2 of const 52's children and `d(3,"div",54)` at index 3, so the notice precedes the textarea wrapper; the button column is `d(5,"div",56)`, two elements later still.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### PCC-05 — `ml-2` and the tooltip were folded onto the icon; consts 61 and 62 keep them apart

**FIXED 2026-08-31 02:15 UTC.** The tooltip and the margin are on a wrapping `<span class="ml-2">`, and the `<i>` carries `fas fa-question-circle` and nothing else — which is what `T(3,"i",62)` means.

**low** · `wrong-constant` · reference byte **2,214,572** (consts 61 and 62, decoded by value)

```
61 ["placement","top","ngbTooltip","In webinar mode users only see their own chat messages, while Presenters see everyones messages...",1,"ml-2"]
62 [1,"fas","fa-question-circle"]
```

**Ours:** `class="fas fa-question-circle ml-2"` with the `placement`/`ngbtooltip` spread on the same `<i>`. Two elements collapsed into one, so the tooltip's hover target was the 14px glyph rather than the span around it, and the margin moved from the wrapper to the icon.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### PCC-06 — The composer binds no `paste`, and the capture binds one straight to the image uploader

**BLOCKED 2026-08-31 02:15 UTC.** The component cannot take an `onimagepaste` prop that nothing passes — that is the scaffolding DPE rule 3 exists to refuse — and `PrivateChatPanel.svelte` is outside this batch's scope. **The exact one-line change that unblocks it:** insert `onimagepaste={onimagepaste}` into the `<PrivateChatComposer … />` call at `apps/room/src/lib/components/PrivateChatPanel.svelte:513`, alongside the prop and forwarding handler that line needs.

**medium** · `missing-control` · reference byte **2,212,274**

```
55 ["name","txt-area","id","textAreaTxtPM","rows","1","spellcheck","true","placeholder","Type your message here...",1,"txt-area","form-control",3,"keyup","paste","focus"]
x("keyup",…)("paste",function(o){return D(e),E(g(2).onImagePaste(o))})("focus",…)
```

**Ours:** the textarea binds `oninput`, `onfocus` and `onkeydown` and no `onpaste`, so pasting a screenshot into a private conversation does nothing. `onImagePaste(e)` at 2,212,274 reads `clipboardData.items`, takes the first `image/*`, and opens the upload confirm pre-filled with whatever was already typed — `Ao("#textAreaTxtPM").val().trim()` becomes the dialog's message box. `RoomOverlays.svelte:633,647,664,679` has the same machinery for the swing and day-trade forms, so what is missing is the wiring rather than the capability.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### PCC-07 — The capture binds `keyup`; every composer in this room binds `keydown`

**DELIBERATE DIVERGENCE 2026-08-31 02:15 UTC.** Const 55's binding section is `3,"keyup","paste","focus"` and it is not transcribed, for a reason this repository has already written down twice: `CarouselDialog.svelte:586-587` records `onkeydown` "rather than `onkeyup` so the Enter that confirms cannot also submit", and `AlertChatArea.svelte:985` binds `onkeydown` to a handler decoded from a `keyup` composer. Recorded here so the third reader does not file it as a gap.

**low** · `divergence` · reference byte **2,214,572** (const 55, decoded by value)

```
3,"keyup","paste","focus"
```

**Ours:** `onkeydown`. The measurement that settles it: `preventDefault()` on `keyup` runs after the browser has already inserted the newline, so PCC-01's swallow arm — the reference's own `i.val(i.val())` — could not swallow anything on the event the reference binds. Matching the event would reproduce a defect and lose the branch, which is the definition this document gives the disposition.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### PCC-08 — The emoji panel closed after every glyph; the capture leaves it open

**FIXED 2026-08-31 02:15 UTC.** `onselect` now forwards the glyph and nothing else. Negative control: putting `composerPopover = null` back into the handler reported `1 failed | 32 passed`; restored, `33 passed`.

**medium** · `divergence` · reference byte **2,208,868**

```
selectEmoji(e){console.log(e);let i=Ao("#textAreaTxtPM").val()+e.emoji.native;Ao("#textAreaTxtPM").val(i),this.selectedEmoji=e.emoji}
```

**Ours:** the handler set `composerPopover = null` after each selection. `selectEmoji` appends and touches `showEmojiChooser` not at all, and const 57 carries `autoClose: "outside"` — ng-bootstrap's value for "a click inside does not dismiss" — so upstream a member picks three emoji with three clicks where this made them reopen a panel with a search box and nine category tabs twice over. The GIF picker is deliberately the other way round in the same file, because `sendGif` at 2,214,017 closes its popover before it does anything else.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### PCC-09 — `inline-alert-key.ts` states, as its reason for existing, something the bundle refutes

**BLOCKED 2026-08-31 02:15 UTC.** That module is outside this batch's scope. **The exact one-line change:** at `apps/room/src/lib/inline-alert-key.ts:30`, replace *"One column over, in the chat composer, **Shift+Enter is the newline**."* with *"One column over, in the chat composer, Shift+Enter is the same no-op; what differs is this box's SEND arm, which clears and re-heights where the five chat composers call `autoExpand`."* The module's CODE is correct and needs no change — only the sentence.

**low** · `defect` · reference byte **1,439,821**

```
onKey(e){if(13==e.keyCode){e.preventDefault(),this.showTyping&&this.refreshTypingStatus(!0);const i=li("#textAreaTxt");e.shiftKey?(i.val(i.val()),this.autoExpand(e.target)):e.altKey?(…)}
```

**Ours:** `inline-alert-key.ts:30` names the chat composer as the box where Shift+Enter inserts a newline, and offers that contrast as the whole reason the alert box needs a module. Byte 1,439,821 IS the chat composer and its shift arm is `i.val(i.val())`. The sentence is not decorative — it is the argument a reader uses to decide which box behaves how, and it sent this batch's composer to a third answer before the six offsets were read together.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

## GiphyPicker.svelte

Six rows, from decoding all four Giphy templates in the bundle rather than the one the file's own
comment cites. Three of the six exist only because the other three tables were read.

### GIF-01 — The private chat's picker is 400px tall in the capture and 700 here, and the rule that says so cannot reach it

**FIXED 2026-08-31 02:15 UTC.** `GiphyPicker` takes `panelHeight`, applied inline so it outranks the class rule from wherever the portal lands; the default is the majority `700px` and `PrivateChatComposer` passes `400px`. Negative control: changing the default to `400px` reported `1 failed | 22 passed`; restored, `23 passed`.

**medium** · `wrong-constant` · reference byte **2,224,360**

```
.giphy-search[_ngcontent-%COMP%]{width:400px;height:400px;border:2px solid var(--modal-content-bg-color);background-color:#fff;overflow:hidden}
```

**Ours:** one unscoped rule, `app.css:551`, at `height: 700px`. The bundle declares this selector six times and the distribution is asserted rather than sampled — the contract test matches every `.giphy-search[_ngcontent-%COMP%]{…}` and requires six, five of them `height:700px` and exactly one `height:400px`. The 400px one is `app-privchat`'s.

**And this is the `app-extra-chat` finding in reverse, which is why it took decoding to see.** The correct rule IS shipped: `captured-runtime-components.css:6595` carries `app-privchat .giphy-search:not(:root) { height: 400px }`. It has never applied. Every captured `.giphy-search` rule in that file is prefixed with its host element, and `GiphyPicker.svelte` portals its `<ngb-popover-window>` into `document.body` — which is what const 65's `container: "body"` means — so the node is not a descendant of `app-privchat` at the moment those rules are matched. Thirteen host-scoped rules for this popover ship and none of them can ever match; the unscoped copy in `app.css` is what paints it, at the majority value.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### GIF-02 — Three of the four Giphy templates have no search button at all

**BUILT 2026-08-31 02:15 UTC.** A `searchButton` prop, and `PrivateChatComposer` passes `false`. Negative control: flipping the composer to `searchButton={true}` reported `1 failed | 30 passed`; restored, `31 passed`.

**medium** · `divergence` · reference byte **2,197,701**

```
d(12,"input",72),Ve("ngModelChange",…),u(),d(13,"span",73),x("click",function(){return D(e),E(g(4).clearSearchGiphy())}),T(14,"i",74),u()
```

**Ours:** the component renders a search span and a clear span on every surface. The POPOVER variants each build exactly ONE `input-group-text` span and it is the clear one — `d(13,"span",73)` in `app-privchat`'s `uEe` (2,197,701), `d(13,"span",84)` in `app-chat`'s `r0e` (1,425,589), `d(13,"span",81)` in `app-extra-chat`'s `sMe` (2,372,048). Only `app-note`'s MODAL, `L0e` at 1,467,000, builds two: `d(12,"span",88)` → `searchGiphy()` then `d(14,"span",88)` → `clearSearchGiphy()`. The component styles agree — `app-privchat`'s blob has a `.giphy-search .fa-times` rule and no `.fa-search` rule.

**The default is `true` and that is deliberately NOT the majority**, which is the opposite of how the `hint` prop chose its default one field above. The reason is named at the code: the only other consumer is `notes/NoteEditor.svelte`, which IS the modal variant and is outside this batch's scope, so a majority default would have silently removed a control from the one surface whose capture has it.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### GIF-03 — The "two words diverge from the capture" note is refuted by the other three tables

**FIXED 2026-08-31 02:15 UTC.** The comment is replaced by the four hosts' const pairs, and the contract test asserts each of them plus the two occurrence counts.

**low** · `defect` · reference byte **2,214,572** (consts 73 and 74, decoded by value)

```
73 [1,"input-group-text","text-white",3,"click"]
74 [1,"fa","fa-2x","fa-times"]
```

**Ours:** `GiphyPicker.svelte:162-167` recorded `text-white` for `text-dark` and an added `fa-2x` as two deliberate divergences, argued from `app-note`'s consts 88/89/90 and generalised. By value, `text-white` with `fa fa-2x fa-times` is what all three POPOVER hosts declare — `app-privchat` 73/74, `app-chat` 84/85, `app-extra-chat` 81/82 — and `text-dark` with a plain `fa fa-search` / `fa fa-times` belongs to the one MODAL. The component matched its capture exactly and the note said it did not, which is the shape that gets "corrected" into a real defect later. `[1,"input-group-text","text-white",3,"click"]` occurs three times in the bundle and `…"text-dark"…` once; both counts are asserted. The input's `border` class splits the same way — present on all three popover hosts, absent from `app-note`'s const 87 — and ours has it.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### GIF-04 — A non-2xx Giphy response was parsed as an empty result set

**FIXED 2026-08-31 02:15 UTC.** `searchGiphy` in `giphy-search.ts` throws on `!response.ok`, so the failure reaches the `catch` that leaves the previous grid standing instead of arriving as "no matches".

**medium** · `defect` · reference byte **2,213,709**

```
searchGiphy(){const e=b_()({https:!0,apiKey:this.appService.globals.giphy_api_key}),i=this.giphySearchTerm;P("searchGiphy search: "+i),e.search(i).then(o=>{console.log(o),this.giphyResults=o.data}).catch(console.error)}
```

**Ours:** `results = payload.data ?? []` after an unconditional `response.json()`. Giphy answers a bad or rate-limited key with `200`-shaped JSON carrying `{"meta":{"status":403,…}}` and no `data`, and `?? []` turned that into an empty grid — a key problem presenting as a vocabulary problem, silently, on a surface with no other error channel. This is the repository's own "fails loud, no silent fallbacks" rule rather than a reference behaviour; the reference's shape that IS preserved is the one that matters at the UI, which is that a rejected search does not blank what is already there.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### GIF-05 — The result images have no intrinsic box, so the grid reflows as each GIF decodes

**FIXED 2026-08-31 02:15 UTC.** `imageBox` reads `width`/`height` off the rendition and answers `null` unless both parse as positive integers; the `<img>` takes them when it can and carries nothing when it cannot. Negative control: deleting the two attributes reported `1 failed | 23 passed`; restored, `24 passed`.

**low** · `defect` · reference byte **2,214,572** (const 77, decoded by value)

```
77 [3,"dblclick","src"]
```

**Ours:** `<img src alt ondblclick>` with no `width`, no `height` and no `aspect-ratio`. The reference has none either — its only sizing is `app-privchat img { max-width: 100% }` — so this is a defect reproduced rather than introduced, and the standard this repository states in as many words ("`<img>` always carries width + height or an aspect-ratio. No layout shift") decides it the other way. The numbers are EXTERNAL and are treated as such: they are validated integers or they are absent, they change what the browser reserves rather than what it renders, and nothing downstream reads them.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### GIF-06 — The reference tracks results by `title`, and that key is deliberately not transcribed

**MEASURED REFUSAL 2026-08-31 02:15 UTC.** The `{#each}` stays keyed by `id`, with the reason at the code and the reference's own trackBy asserted beside it.

**low** · `divergence` · reference byte **2,214,572** (`KDe`, the track function bound at `ht(16,dEe,2,1,"li",76,KDe)`)

```
KDe=(t,n)=>n.title
```

**Ours:** `{#each results as result (result.id)}`. The measurement that justifies not matching: `KDe` is `n.title` for `app-privchat` and `y0e` is the same for `app-note`, and Giphy titles collide constantly — the empty string is among the commonest. Angular's `trackBy` answers a collision by reusing a node; Svelte answers a duplicate key by THROWING `each_key_duplicate`, which takes the whole picker down. So the two are not the same instruction wearing different names, and copying the reference's field would convert a cosmetic reuse decision into a crash. `id` is used as the least-colliding field the payload offers, and it decides which DOM node is reused and nothing else — what is sent is the URL the member double-clicked, and the server decides whether it may be posted.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

## SpeechRecoOverlay.svelte

Five rows. This surface was documented against a bundle that is not the pinned one and is not even
present in this checkout, so every citation in it was unchecked by construction — `pnpm test` skips
the file that reads it. Re-decoded here against `main.d1d09071be31f1ba.js`.

### SRO-01 — Documented against an unpinned bundle whose const table is six entries shorter

**FIXED 2026-08-31 02:15 UTC.** The component now cites the pinned bundle and its real indices, and `speech-reco-overlay-v4-contract.test.ts` asserts twenty of them by value against that file — a test that runs here, where the one reading `docs/source/` does not.

**medium** · `defect` · reference byte **1,994,264** (`consts:[[`, bracket-walked to 2,014,221)

```
270 [1,"speech-reco-overlay"]   271 [1,"speech-reco-body"]   273 [1,"speech-reco-buttons"]
289 ["type","button","title","Full Transcript History","aria-label","Full Transcript History",1,"speech-reco-history-btn",3,"click"]
```

**Ours:** `SpeechRecoOverlay.svelte:31-35` named `docs/source/main.d6d3c112b59b7d0d.js`, "286 entries", and "indices 264-285 for this overlay". The pinned table has **292** entries and the overlay's are **270-291** — the same table six entries shorter, so every index in the file was low by six. The rendered classes were right throughout; what was wrong was every footnote, and a footnote is the part a reader cannot reconstruct without the bundle open. `gate/evidence-bound-tests.mjs` excludes `speech-reco-overlay-render.test.ts` from this checkout because `docs/source/` is gitignored, so nothing was checking them either.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### SRO-02 — Two of the icon citations name other parts of `app-presentationarea` entirely

**FIXED 2026-08-31 02:15 UTC.** The transcript button is const **289** with icon **79**, the history toggle **290** with icon **291**, the close button **276** with icon **92**. Negative control: restoring "button 270 + icon 93" reported `1 failed | 37 passed`; restored, `38 passed`.

**low** · `defect` · reference byte **1,952,594**

```
d(0,"button",289),x("click",…openTranscriptPage()),T(1,"i",79)
d(0,"button",290),x("click",…toggleSpeechRecoHistory(o)),T(1,"i",291)
d(7,"button",276),x("click",…hideSpeechRecognition(o)),T(8,"i",92)
```

**Ours:** the file read "283 + icon 80 (`fa-external-link-alt`), 284 + icon 285 (`fa-history`), 270 + icon 93 (`fa-times`)". In the pinned table const **80** is `["title","Lock this screen?"]` and const **93** is the volume slider's attribute list — neither is an icon, and neither belongs to this overlay. This is worse than the uniform six-entry shift SRO-01 describes, because subtracting six does not recover it: a reader correcting for the shift lands on 74 and 87, which are the two history buttons' no-click variants. Both wrong consts are now asserted for what they ACTUALLY are, so the old citation cannot come back quietly.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### SRO-03 — The two dismissal clicks reach the presentation surface underneath

**FIXED 2026-08-31 02:15 UTC.** `haltCaptionDismissal` calls `preventDefault()` and `stopPropagation()` before the close and history-toggle callbacks, and deliberately not before the transcript one. Negative control: reverting the close button to `onclick={onclose}` reported `1 failed | 37 passed`; restored, `38 passed`.

**medium** · `missing-behaviour` · reference byte **1,957,104**

```
hideSpeechRecognition(e){e.preventDefault(),e.stopPropagation(),this.appService.globals.preferences.showSpeechRecoOverlay=!1,…}
toggleSpeechRecoHistory(e){if(e.preventDefault(),e.stopPropagation(),…)}
```

**Ours:** `onclick={onclose}` and `onclick={ontogglehistory}`, with both props typed `() => void`, so the event was neither used by the component nor reachable by the parent. The overlay is `position: absolute; z-index: 9999` lying across the bottom of the presentation surface — its own captured rule — so every dismissal also landed as a click on whatever the presentation area does with clicks.

**The transcript button is deliberately left alone**, and that asymmetry is the capture's: `x("click",function(){return D(e),E(g(2).openTranscriptPage())})` takes no event argument at all, because it opens a new window and has nothing to suppress. Suppressing there too would be tidiness overruling the capture on a control where the capture is explicit.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### SRO-04 — The single-line branch is a LOOP upstream and a single `{:else if}` here, and that is not a gap

**ALREADY BUILT — verified by reading 2026-08-31 02:15 UTC, not rebuilt.** Recorded because the offset invites the opposite conclusion, and the reading that refutes it is one call deeper than the template.

**low** · `divergence` · reference byte **1,951,573**

```
function s2e(t,n){… d(0,"div",277,1),x("scroll",…), ht(2,o2e,7,2,"div",278,BCe),u()} … pt(e.getSpeechRecognitionEntries())
getSpeechRecognitionEntries(){return this.currentSpeechReco?[this.currentSpeechReco]:[]}   // byte 1,957,636
```

**Ours:** `{:else if current}` renders one `.speech-reco-line`. `s2e` is a `ht(…)` repeater over `getSpeechRecognitionEntries()`, which reads as a list and is not one — it is nought-or-one, always, so the loop emits exactly the DOM the single branch does. A reader who stops at the template files "the live caption is a list there and a line here"; the method one call away says otherwise, and both are now asserted so the refutation survives.

**The other trackBy in this template IS transcribed and matches**: `UCe = (t,n) => n.timestamp` is the transcript's, and the history `{#each}` is keyed by `line.timestamp`. `BCe = (t,n) => n.sender` is the single-line loop's and has nothing to key.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

### SRO-05 — All three overlay controls are `display: none` until the pointer hovers, and no keyboard can reach them

**MEASURED REFUSAL 2026-08-31 02:15 UTC.** Not changed from this batch, and the measurement is what says why rather than a judgement about accessibility.

**medium** · `defect` · reference byte **2,030,113** (within `app-presentationarea`'s `styles:` array, 2,018,629–2,032,208)

```
.speech-reco-buttons[_ngcontent-%COMP%]{display:none;gap:8px;pointer-events:auto;transition:display .2s ease}
.speech-reco-overlay[_ngcontent-%COMP%]:hover   .speech-reco-buttons[_ngcontent-%COMP%]{display:flex}
```

**Ours:** the same two rules, shipped twice — `css/complete-app-styles.css:7880` and `:7882`, and `src/lib/styles/captured-runtime-components.css:7356` — and this component declares no styles of its own, so it inherits them. `display: none` removes an element from the tab order outright, so the close, history and transcript buttons cannot be focused, and `:focus-within` cannot rescue them because nothing inside the overlay is focusable while they are hidden. **The bundle contains no `:focus-within` arm for this selector; that absence is asserted, not assumed.**

**Why it is refused rather than fixed here.** Making them reachable means replacing `display: none` with a `visibility`/`opacity` pair, which changes the captured geometry — the strip would occupy layout at all times — and both stylesheets that carry the rule are outside this batch's scope. **The one-line change that would unblock it:** in `apps/room/src/app.css`, add `.speech-reco-overlay:focus-within .speech-reco-buttons { display: flex }` AND change the base rule to keep the buttons in flow, which is two lines and a geometry decision, not one — which is precisely why it is recorded for the owner rather than made here. `PresentationArea.svelte`'s own PA-07 note assumes these buttons ARE in tab order; that assumption and this rule cannot both be true, and reconciling them is the next reader's first question.

*This row was ADDED after this document was committed — a v4 re-read on 2026-08-31, not part of the two-verifier pass the tables above describe, and therefore deliberately outside them.*

---


---

## ScreenZoomControls.svelte

Four rows, appended 2026-08-31. The surface is the screen tab bar's `ms-auto` control cluster, in
both of the arrangements the capture ships it in — `SSe`'s children 2/3/4/16/18/20 inside
`app-presentationarea`'s const 87, and `Y0e`'s three nodes inside `app-screenshare-view`'s const 4.
The container itself is not this component's: `ScreenTabs.svelte:308` draws const 87 and
`ScreenPane.svelte:567` draws const 4, so the rows below are about the buttons, their order and the
evidence the file cites for them.

Read end to end at verified boundaries in the pinned v4 bundle, with both const tables
bracket-walked BY VALUE from their `consts:[[` — `app-presentationarea`'s at byte 1,994,264, 292
entries, and `app-screenshare-view`'s at byte 1,500,337, 20 entries. Every finding below is one a
slot-number lookup could not produce.

### SZC-01 — The const-index table and the `ngClass` factory both name a build this repository does not hold, and the factory it names is a different class

**FIXED 2026-08-31.** Every const index this component cited from 66 upward was ONE TOO HIGH for the
pinned bundle, and the entries either side of each boundary are plausible enough that following one
reads as correct: the header said const 71 for `li.nav-item.ms-auto` (it is 70), const 88 for
`zoom-controls-container position-relative` (87), const 89 for the floating trio (88), consts 90-97
for the volume dropdown (89-96), const 98 for the dark button (97) and consts 101/116 for the
fullscreen icon swap (100/115). Const 98 is the magnifier GLYPH; the button that holds it is 97. All
re-decoded by value and corrected in place, with the bundle byte for `SSe` (1,923,312) and for the
table itself carried in the comment so the next reader re-walks rather than trusts.

**The second half is the one a by-value decode is required for.** The file said the trio's class
came from `` `VCe = (t) => ({'viewer-only-screen-zoom-controls': t})` ``. In the pinned bundle `VCe`
is at byte 1,916,444 and is `t => ({"viewer-only-screen-tab": t})` — a DIFFERENT class, on a
different element. The zoom-controls factory is `HCe` at byte 1,916,482, thirty-eight bytes later,
and `cSe` binds it at byte 1,920,974. Neither name is in the const table at all, and that is the
general fact rather than an accident of this one entry: Angular compiles an `ngClass` object literal
to a shared arrow beside the template functions and leaves only the marker `3,"ngClass"` in the
const, so const 88 reads `[1,"zoom-controls","position-absolute",3,"ngClass"]` and names nothing.
A reader looking for the class name in the table finds the nearest arrow instead, which is exactly
how `VCe` got written down. `screen-cluster-v4-contract.test.ts` asserts the absence directly —
the whole 19,957-byte table contains neither `viewer-only-screen-zoom-controls` nor
`viewer-only-screen-tab` nor `show active` — so the note cannot be re-derived the wrong way.

**Also corrected, and separately measured:** the file cited
`src/lib/styles/captured-runtime-components.css:6902` for `.zoom-controls { top: -33px; left: -33px }`.
Line 6902 is `app-presentationarea #notesTabsContent`; the rule is at 6930. And the shipped copy of
`.viewer-only-screen-zoom-controls { top: 33px !important; left: -3px !important }` is
`src/lib/styles/protradingroom-source.css`, not the capture the comment named — the class is not an
orphan, which is what the citation was there to establish.

This row was ADDED after this document was committed, in the 2026-08-31 pass.

### SZC-02 — The detached arrangement's HTML sketch draws a container the reference binds a class on

**FIXED 2026-08-31.** The header's detached sketch read `<div class="zoom-controls-container-detached">`
with no binding. `app-screenshare-view`'s const 4, walked out of its table by value, is
`[1,"zoom-controls-container-detached",3,"ngClass"]`, and `Y0e`'s update block at byte 1,493,972
binds `ct(2,$0e,!e.isDetached&&(!e.isConnected||e.isPresentingThisScreen&&!e.localpreview||e.mediaService.saveData))`
with `$0e = t => ({hidden: t})` at byte 1,492,696.

**The BINDING is not a gap and is deliberately not re-filed.** `SV-SP-14` above built it, on
`ScreenPane.svelte:567`, which is the component that owns that container. What was wrong was only
this file's drawing of it, which is the document a reader of `ScreenZoomControls` reaches first and
which said the container carries no class logic at all. The sketch now shows the binding and points
at the row that owns it.

This row was ADDED after this document was committed, in the 2026-08-31 pass.

### SZC-03 — The `ondblclick` guard on all five buttons is justified by a nesting the reference does not have

**DELIBERATE DIVERGENCE, measured 2026-08-31.** `swallowDoubleClick` is on every button in both
variants, and the reason recorded for it was "in the DETACHED arrangement the cluster sits inside
`.video-screen-container`, whose double-click maximises the screen". In the reference it does not.
`app-screenshare-view`'s root template, read at byte 1,501,300, is
`H(4,q0e,3,2,"h3",3)(5,Y0e,6,4,"div",4),d(6,"div",5)(7,"pan-zoom",6)(8,"div",7)(9,"video",8)` — the
cluster is **node 5** and the `appDoubleClick` box (const 5,
`["appDoubleClick","",1,"position-relative","h-inherit","overflow-hidden",3,"ngClass","id"]`) is
**node 6**. They are SIBLINGS under const 0, so upstream no double-click on the cluster can reach a
fullscreen handler and the reference carries no guard.

**Ours is nested, and on purpose.** `ScreenPane.svelte:565-578` puts the cluster inside
`#video-screen-container-…`, which is what makes it fullscreen with the picture — the same nesting
`SV-SP-01` relies on for the user-ID watermark, which is clipped away if it sits outside. So the
guard is the price of a placement this repository chose, not a transcription of anything, and
un-nesting it to match the reference would undo a row already built. Recorded at the code rather
than removed, because a guard whose stated reason is false is a guard the next reader deletes.

This row was ADDED after this document was committed, in the 2026-08-31 pass.

### SZC-04 — Nothing that runs in this checkout asserts anything about this component

**BUILT 2026-08-31 — `apps/room/src/lib/screen-cluster-v4-contract.test.ts`, 29 assertions, all of
which execute here and on CI.** The cluster's only guard was `screen-volume-contract.test.ts`, which
opens five files under `docs/source/components/` — a directory `.gitignore` excludes because
republishing a third party's compiled application from a public repository is not a question to
answer by accident. `gate/evidence-bound-tests.mjs` therefore drops it: it is one of the 42 files
the vitest banner names on every run of this suite, and every claim it makes about
`ScreenZoomControls` and `ScreenVolumeControl` has been unasserted for as long as that has been true.

**The replacement is bound to evidence that ships.** `docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js`
is TRACKED — 2,891,205 bytes, SHA-256 `40796ca8…`, verified against that directory's own
`sha256sums.txt` — and it is the bundle this whole register is written against. The new file walks
both const tables with `src/lib/const-table.mjs`, the repository's own tokenizer, and pins the
consts, the three gate expressions, the icon bounds, the `HCe`/`VCe` distinction, the detached
sibling placement and the rendered order of both variants.

**One of its negative controls came back GREEN and the assertion was the thing at fault.** The
detached case asserted `not.toContain('dropdownVolume')` while passing no `volume` snippet, so it
was asking whether nothing renders nothing; adding the volume slot to the detached branch — the
exact defect it names — left it passing. A `createRawSnippet` marker now makes the two branches
distinguishable, the attached case asserts the marker IS rendered so the snippet cannot silently
stop working, and the re-run control is red.

This row was ADDED after this document was committed, in the 2026-08-31 pass.

---

## ScreenVolumeControl.svelte

Four rows, appended 2026-08-31. The surface is `#dropdownVolume` as `app-presentationarea` renders
it — `pSe` (trigger, byte 1,921,142) and const 90's menu with its slider, its two gated buttons and
its `room-sound-options` rows — which is a different control from the navbar dropdown of the same id
(`app-room` const 104). Read end to end against `SSe`'s create and update blocks, with the const
table bracket-walked by value.

The transcription is faithful: every class, attribute and order below is the reference's. What the
pass found is three citation defects and one gap in what is actually guarded.

### SVC-01 — The three captured text nodes lost the reference's own leading and trailing spaces

**FIXED 2026-08-31.** `SSe` emits `v(6," Volume ")` at byte 1,923,441, `fSe` emits `v(1," Mute ")`
at byte 1,921,484 and `mSe` emits `v(1," Unmute ")` at byte 1,921,611. All three carry a leading AND
a trailing space. This component wrote them as plain text nodes on their own lines, and Svelte drops
whitespace-only text at an element boundary, so all six spaces were gone from the rendered strings —
the file's own closing sentence, "every class, attribute, order and text node is the reference's,
spaces included", was false for exactly the text nodes.

All three now use the brace idiom `apps/room/AGENTS.md` records and defends for the forty-odd other
captured strings in this repository — `{' Mute '}` — which is the standing exception to the
autofixer's "unexpected mustache interpolation with a string literal" suggestion, argued there on
precisely this ground: the braces preserve spaces that Prettier and HTML whitespace folding lose,
and every capture comparison here diffs rendered strings.

**One residual, stated rather than hidden.** In the `h4` the reference has ` Volume ` immediately
followed by const 91's close span; here a comment block sits between them, so Svelte collapses the
newline into one space and the rendered gap before the span is two characters rather than one. The
span is `float-right`, so nothing moves. Naming it is cheaper than a reader re-finding it.

This row was ADDED after this document was committed, in the 2026-08-31 pass.

### SVC-02 — The const table in the header is off by one from const 66 up, against a build that is not in this repository

**FIXED 2026-08-31.** The header cited `app-presentationarea 90` for the trigger (it is 89), const 91
for the menu (90), const 92 for the close span (91), const 94 for the slider (93), consts 95/109 and
96/110 for Mute and Unmute (94/108 and 95/109), const 97 for `room-sound-options` (96), const 112 for
the `value="Presenter audiob"` checkbox (111) and consts 98/102 for the two `ScreenZoomControls`
buttons it compares itself to (97/101). The two prop docstrings naming const 109 and const 110 for
the mute and unmute clicks were the same shift. `app-room 104` for the navbar trigger is CORRECT and
was left alone — the app-room table did not move, which is the measurement that says this is a
per-component boundary rather than a global one.

**The source of the drift is named rather than guessed at.** The citations pointed at
`docs/source/components/app-presentationarea.render-helpers.js` and `.compiled.js`, which are files
of an OLDER build and are not in this repository under any path — `git ls-files` finds nothing under
`apps/room/docs/source/`. So a reader following any of them had nothing to open, and a reader
resolving the numbers against the pinned bundle landed one entry past every const named.

**BLOCKED tail, outside this pass's three files, with the exact change.**
`apps/room/src/lib/screen-volume.ts:51-52` carries the same shift for the same reason: "The three
icon classes of consts 106, 107 and 108" and "const 108 is `[1,"fas","fa-volume-off"]`
(compiled.js:2128)". In the pinned bundle they are 105, 106 and 107, decoded by value. The one-line
change is `consts 106, 107 and 108` → `consts 105, 106 and 107` on line 51, with the sentence on 52
becoming `const 107 is [1,"fas","fa-volume-off"] (byte 2,001,495)`. The VALUES that module ships are
correct; only the numbers pointing at them are not.

This row was ADDED after this document was committed, in the 2026-08-31 pass.

### SVC-03 — The reference gives both volume dropdowns the same presenter-row ids; ours diverges, and nothing that runs said so

**ALREADY BUILT — verified by reading 2026-08-31, not rebuilt.** The divergence and its whole
argument are in `apps/room/src/lib/screen-volume.ts:99-114`, at `presenterRowId`, and
`PresenterMuteRows.svelte:51-59` states it again at the prop. The audit reader would have filed this
as an invented value; it is a decision already taken, recorded, and applied in exactly one of the
two places.

**What was missing is the measurement, in a form that executes.** Re-read by value: the reference
builds `ei("name","talkingPresenter",i,"-donot-disturb")` and its matching `id` and `for` in BOTH
components — `vSe` at byte 1,922,603 for the overlay and `T4e` at byte 2,483,544 for the navbar —
six occurrences of the literal `"talkingPresenter"` over two components, confirmed by splitting the
whole 2,891,205-byte file rather than by a match window. Both dropdowns are in the document at once
in viewer-only mode, because the navbar's is ungated and the overlay's trigger renders only there,
so upstream every `label[for]` in the overlay resolves to the navbar's checkbox of the same index
and the overlay's own rows cannot be muted by clicking their labels.

`screen-cluster-v4-contract.test.ts` now asserts the count, both byte offsets, and that the rendered
overlay emits `screenTalkingPresenter0-donot-disturb` and NOT `talkingPresenter0-donot-disturb`. The
citations in `screen-volume.ts` still name the absent decoded-components paths; that file is outside
this pass and the change is one line — `app-presentationarea.render-helpers.js:370-371` and
`app-room.render-helpers.js:1087-1088` → `bytes 1,922,603 and 2,483,544`.

This row was ADDED after this document was committed, in the 2026-08-31 pass.

### SVC-04 — `screen-volume-contract.test.ts` cannot run in this checkout or on CI, so this control's guard is the new file and not that one

**BLOCKED 2026-08-31, and the blocker is named with what would unblock it.** That file reads five
paths under `docs/source/components/` (lines 41-55 and 539-546). `docs/source` is one of the
fourteen evidence roots `.gitignore` excludes and `gate/evidence-bound-tests.mjs` discovers as
missing, so vitest excludes the file on every run here and on CI. It is not deleted and not edited:
its subject genuinely is a build this checkout cannot see, and deleting a test because its evidence
is absent is how a repository loses the record that the evidence ever existed.

**It is not a one-line repair, and saying so is the point of the row.** Re-pointing line 41 at
`../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js` would make the file run and then fail:
its literals are the older build's minifier output. Measured against the pinned bundle, at least
these move — `ut(` → `ct(`, `Dt(` → `Et(`, `Go` → `mo`, `hSe` → `pSe`, `CSe` → `SSe`, `bSe` → `vSe`
— and the const numbers shift by one from 66 up, which is `SVC-02`. The honest unblocking step is
the one taken here: a new file, bound to the tracked bundle, re-deriving each fact from the v4 bytes
rather than copying an assertion across. What remains blocked is the OLD file, and what would
unblock it is the owner deciding whether an evidence-bound test whose evidence is permanently
gitignored should be retired or re-pointed. That is not this pass's call.

This row was ADDED after this document was committed, in the 2026-08-31 pass.

---

## StreamTabs.svelte

Six rows, appended 2026-08-31.

**`StreamTabs` is a different component from `ScreenTabs`, and this was checked before the pass
began rather than assumed.** Both exist on disk — `apps/room/src/lib/components/StreamTabs.svelte`
(306 lines) and `apps/room/src/lib/components/ScreenTabs.svelte` — and they transcribe two different
reference templates from the same component: `ISe` at byte 1,925,991 renders `ul#streamsTabs` from
the MediaMTX stream list, and `lSe` at byte 1,919,600 renders `ul#screenTabs` from
`mediaService.screenSharingUsers`. `ISe` has no `img.presenter-img`, labels a tab with
`Ze(e.mediaValue.name)` alone, and its menu holds two items; `lSe` has the avatar, the
`{name}-{screenName}` join and four. So the `## StreamingView + ScreenPane + ScreenTabs` section
above, and its `SV-SP-05`/`SV-SP-06` rows about the screenshare bar, describe a different surface,
and nothing below re-files any of them.

The two bars DO share const entries — 31, 54, 55, 56, 57, 74 and the lock/unlock consts are single
table entries read by both — which is a fact this pass corrected a comment about, and is `STB-05`.

### STB-01 — The tab-select listener is on the anchor, and three `stopPropagation` calls suppress selections the reference performs

**BUILT 2026-08-31.** Const 31 is `["role","presentation",1,"nav-item",3,"click"]` and `ISe` opens
`d(0,"li",31),x("click",function(){const o=D(e).$implicit;return E(g(2).onStreamTabChange(o._id))})`
at byte 1,926,042 — the tab-select click is on the **`li`**. Const 73, the anchor, binds `ngClass`
and `id` and nothing else; it carries no `click` at all. This component had the handler on the
`<a>` and then stopped propagation in three places: the gear's `toggleMenu`, the lock badge's
handler, and `runItem` for every dropdown item.

**Nothing in the reference tab stops that click**, and the assertion is made rather than assumed:
the 609 bytes of `ISe` contain no `stopPropagation`, and Angular's compiled listeners suppress an
event only by RETURNING FALSE — `E(…)` is `ɵɵresetView`, which returns what the component method
returned, and `onStreamTabChange`, `toggleLockScreenMTX` and `bringFocusToScreen` all return
`undefined`. The gear has no handler of its own at all: const 78 is `data-bs-toggle="dropdown"` and
Bootstrap delegates that on `document`, above the `li`, so it cannot stop the bubble either.

So upstream, opening a gear menu selects its tab, clicking the lock badge locks AND selects, and
clicking a dropdown item selects too. Here none of the three did. `onselect` now sits on the `li`
where const 31 puts it, all three `stopPropagation` calls are gone, and `onkeydown` stays on the
anchor because it is the only focusable node in the tab — the roving-tabindex divergence this file
already recorded is unaffected. Two controls seen red: putting `onselect` back on the anchor, and
reintroducing one `stopPropagation`.

This row was ADDED after this document was committed, in the 2026-08-31 pass.

### STB-02 — Every const index this component names from 66 up is one too high for the pinned bundle

**FIXED 2026-08-31.** The header carried a fourteen-row index table and eleven of its rows named the
entry AFTER the one described: 118 for the streams bar (117 — 118 is `streamsTabsContent`), 74 for
the tab anchor (73 — 74 is the tooltip), 75 for the forced-screen tooltip (74), 83 for the lock badge
(82 — 83 is the padlock glyph), 78 for `d-inline-block` (77), 79 for the gear toggle (78), 55/56/57/58
for the cog, its menu, the menu `li` and its anchor (54/55/56/57), 81/86 for the two titles (80/85)
and 82/84/87 for the three glyphs (81/83/86). Consts 31 and 14 are unchanged, which is what places
the boundary between 31 and 54 rather than making this a blanket shift.

The table is now walked by value and the corrected numbers are asserted against the decoded entries
rather than against each other: for each corrected index `stream-tabs-v4-contract.test.ts` also
asserts what the STALE index holds, because an off-by-one in a table of tab markup produces
plausible neighbours and an assertion that only checks the new number passes on both.

The citations that produced it are the older build's — `app-presentationarea.full.js:543-588` and a
const table "at `:3790` onward" — and no such file is in this repository. Replaced with the byte
offsets of `ISe` and of `consts:[[`.

This row was ADDED after this document was committed, in the 2026-08-31 pass.

### STB-03 — All four "inert upstream" findings hold in the pinned bundle, and all four byte offsets were the older build's

**FIXED 2026-08-31.** This component's header carries the most valuable prose on the surface — four
controls that render and do nothing upstream, recorded so nobody "finishes" one by inventing a
protocol. Every one of the four SURVIVES re-reading in the pinned bundle, and every one of the
offsets under them pointed somewhere else in it:

| finding | cited | pinned v4 |
| --- | --- | --- |
| `forcedScreenMTXID` template read | 1926192 | **1,926,600** |
| `forcedScreenMTXID=""` in the constructor | 1952638 | **1,954,252** |
| `lockedScreenIDMTX=""` in globals | 977288 | **977,288** (unchanged) |
| `lockedScreenIDMTX` template read | 1926252 | **1,926,660** |
| the `selectStreamTabOfId` guard's two reads | 1960257 | **1,961,921** and **1,961,964** |
| `toggleLockScreenMTX` stub | `full.js:3056-3058` | **1,976,853** |
| the working `toggleLockScreen` beside it | `:3050` | **1,976,706**, 147 bytes earlier |
| `bringFocusToScreen` | `:2727` | **1,969,281** |
| the `focusOnScreen` subscriber | 1962380 | **1,964,131** |

The COUNTS all hold: `forcedScreenMTXID` twice, `lockedScreenIDMTX` four times — the four rather
than three that a `grep -o` match window once reported, re-confirmed here by splitting the whole
file — and the subscriber still scans `mediaService.screenSharingUsers` and never
`mtxHandlerService.mtxStreams`. So the four refusals stand unchanged; what was wrong was every
address a reader would use to check them, which for a standing refusal is most of its value.

This row was ADDED after this document was committed, in the 2026-08-31 pass.

### STB-04 — `stream-tabs-contract.test.ts` reads a bundle that is not in this repository, so the whole file asserts nothing

**BLOCKED 2026-08-31, with the exact change and why it is not one line.** Line 20 reads
`../../docs/source/main.d6d3c112b59b7d0d.js`. No file of that name exists anywhere in this
checkout, and `docs/source` is a gitignored evidence root, so `gate/evidence-bound-tests.mjs`
excludes the file — one of the 42 the vitest banner names on every run. All twelve of its `it`
blocks, including the four standing refusals `STB-03` is about and the two-lock-fields test its own
comment calls "THE test that earns this file", have been unexecuted here and on CI throughout.

The exact one-line change is line 20:
`new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url)` →
`new URL('../../docs/source-v4-2026-08-15/main.d1d09071be31f1ba.js', import.meta.url)`.
It is not sufficient on its own and the row would be dishonest without saying so: five of that
file's literals are the older minifier's and fail against v4 — `ut(9,Go,` → `ct(9,mo,`, `Dt(` →
`Et(`, `Go=t=>({active:t})` → `mo=t=>({active:t})`, and the two `O(10,…)`/`O(13,…)` node numbers sit
inside a longer update string that must be re-quoted from byte 1,926,570.

What this pass did instead is build `stream-tabs-v4-contract.test.ts`, which re-derives all twelve
facts from the v4 bytes and RUNS: 26 assertions, five of them negative controls seen red. Retiring
or re-pointing the old file is an owner decision about a test whose evidence is permanently
gitignored, and is deliberately not taken here.

This row was ADDED after this document was committed, in the 2026-08-31 pass.

### STB-05 — The forced-screen tooltip is ONE const entry read by both bars, not "two literals in one table"

**FIXED 2026-08-31.** The comment above `FORCED_SCREEN_TOOLTIP` justified duplicating the 250-character
string in `StreamTabs` and `ScreenTabs` on the ground that "`ScreenTabs` reads it from ITS const (75
as well) … They are two literals in one table." Decoding the table says otherwise: there is exactly
one entry, const 74 at byte 2,000,042, and both readers open it — `xSe` at byte 1,925,418 (streams)
and `iSe` at byte 1,918,787 (screenshares) each emit `d(0,"span",74)`. Two components of ours read
one const of theirs.

**The DECISION does not change and the reason for it is now the true one.** Sharing the string in
TypeScript is still a choice the reference does not make for us, and `ScreenTabs.svelte` is outside
this pass, so the duplication stays. What changed is that the comment no longer claims a fact about
the reference that the reference contradicts. The transcription itself is now asserted by value
rather than against a copy of itself: the test joins the component's three concatenated fragments
and compares the result to the decoded const, which is the only version of that assertion that can
fail for a real reason — a `toContain` of the whole string would fail on a component that is
correct, because Prettier splits the literal.

This row was ADDED after this document was committed, in the 2026-08-31 pass.

### STB-06 — `href="#{id}"` where const 57 is a literal `href="#"`

**DELIBERATE DIVERGENCE, measured 2026-08-31.** Const 57 is `["href","#",1,"dropdown-item"]`, decoded
by value, and it is the anchor of both dropdown items. Upstream nothing prevents its default: the
click handler is on the `li` (const 56, `[3,"click"]`), the anchor has none, and neither
`bringFocusToScreen` nor `toggleLockScreenMTX` returns `false`. So a menu click in the reference
runs its command AND navigates to `#`, which scrolls the room to the top.

Half of that is reproduced here and half is not. The BUBBLING is reproduced as of `STB-01` — the
click reaches the `li` and selects the tab, exactly as upstream. The JUMP is not: `runItem` keeps
`event.preventDefault()`, and the `href` is `#` plus the stream's own id rather than a bare `#`, so
the fragment at least names the tab it belongs to. Matching the reference literally here would
reproduce a defect that has nothing to do with the feature, and would do it on the only control in
this menu that a viewer can reach by keyboard.

This is recorded rather than left in a handler comment because the previous comment explained the
`preventDefault` and not the changed `href`, and an unexplained divergence is the one a future
reader "corrects" back.

This row was ADDED after this document was committed, in the 2026-08-31 pass.

---

## RoomNavbar.svelte

Eleven rows, produced 2026-08-31 by reading the reference's navbar template `U4e` (bundle byte
2,484,831) end to end and decoding `app-room`'s 229-entry consts array **by value**, bracket-walking
it from `consts:[[` at byte 2,533,197. Not one of these is visible to a reader who looks up a slot
number another row cited: `app-room`'s const 40 is the sidebar's Benzinga link and
`app-st-message`'s const 40 is a smile icon's tooltip, three tables apart.

`RoomNavbar.svelte` is the largest component in this repository and had no section here at all.

### NAV-01 — The navbar's help link is dead code in the reference, and is not built

**MEASURED REFUSAL 2026-08-31.** `hasSTHelpLink` occurs **three times in 2,891,205 bytes** and not
one of them assigns the field the navbar reads. Byte 2,497,854 is `app-room`'s own initialiser,
`this.hasSTHelpLink=!1`, inside the same constructor run that sets `showWebcams=!0`,
`isRecordingStarting=!1` and `alwaysShowRoster=!1`. Byte 2,487,906 is the READ,
`O(9, e.hasSTHelpLink ? 9 : -1)`. Byte 1,189,005 is `this.hasSTHelpLink=!0` on a **different class** —
the login/auth component, whose neighbouring fields are `rememberMe`, `authMode`, `showPW` and
`readOnlyEmail`. There is no path from one to the other: a grep for `hasSTHelpLink=` returns exactly
those two initialisers and nothing else. **Slot 9 is therefore `-1` for the life of every room**, and
the styled `.helpLink` rule that ships beside it (`app-room`'s own `styles:[…]`, byte 2,538,214,
`cursor:pointer;margin:0 5px` and `font-size:18px`) paints nothing.

Building it would put a hard-coded link to `https://intercom.help/simpler-trading/en/` — another
company's support desk — into every room in a multi-tenant application, to reproduce an element the
reference itself cannot render. The `tawkAvailable` third term two items along already records this
repository's position on shipping somebody else's support inbox.

This row was ADDED after this document was committed.

**low** · `missing-control` · reference byte **2,487,906**

```js
H(9,MPe,2,0,"a",84)                                     // U4e create block, byte 2,484,831
84 ["href","https://intercom.help/simpler-trading/en/","target","_blank",1,"helpLink","mr-auto"]
138 [1,"fas","fa-question-circle"]
function MPe(t,n){1&t&&(d(0,"a",84),T(1,"i",138),u())}  // byte 2,472,776
O(9, e.hasSTHelpLink ? 9 : -1)                          // byte 2,487,906
```

**Ours:** `RoomNavbar.svelte` renders the brand anchor and goes straight to the navbar toggler; there
is no `.helpLink`. `grep -rn helpLink apps/room/src` returns zero hits. That absence now has a reason
recorded against it rather than being an oversight nobody measured.

### NAV-02 — A member hearing the room's SoundCloud track has no way to stop it for themselves

**BUILT 2026-08-31.** `NavbarSoundCloud.svelte`, which now carries both of the reference's SoundCloud
items instead of one. The presenter's dropdown (slot 22, const 96) moved into it unchanged; the
listener's control (slot 23, const 97) is new.

The two gates are **not each other's negation** — `!scPlaying` is a term of one and of neither the
other — so the component takes a literal `variant` and the call site owns the gate, which is what
stops a boolean named `isPresenter` from rendering two SoundCloud icons in one bar. Const 176's
duplicated `id` is worn as `cssSoundCloudIcon`, the one a browser keeps; its `aria-haspopup` and
`aria-expanded` are refused, because this element opens nothing and announcing a popup that does not
exist is the same lie as a control whose only effect is changing its own label. `playing.gif` is
substituted by `fa-volume-up`, the resolution this file already argued for on the presenter's copy.

`navbar-decoded-rows-contract.test.ts` asserts it in four directions — present for a listener while a
track plays, absent when nothing plays, absent for a presenter, and the presenter's dropdown still
there — and each was run against a mutated component before it was trusted.

This row was ADDED after this document was committed.

**high** · `missing-control` · reference byte **2,478,748**

```js
H(22,i4e,18,4,"li",96)(23,o4e,4,3,"li",97)
96  ["title","Play music from SoundCloud for all",1,"nav-item","dropdown"]
97  ["title","Music is playing from SoundCloud for all",1,"nav-item"]
176 ["id","cssSoundCloudIcon","id","soundcloudDropdown","aria-haspopup","true",
     "aria-expanded","false",1,"nav-link","d-flex","align-items-center",3,"click","ngClass"]
O(23, isPresenter || isNonPresenterAdmin || !scPlaying ? -1 : 23)     // byte 2,488,684
function o4e(t,n){ … d(0,"li",97)(1,"a",176), x("click", () => doSoundCloudUserStop()),
                     T(2,"i",166)(3,"img",169) … }                    // byte 2,478,748
```

**Ours (before):** `onstopsoundcloudforme` reached `broadcasts.stopSoundCloudForMe()` and was
reachable from exactly one element — the third entry of the presenter's dropdown, inside
`{#if isPresenter}`. A member could only pull the master volume down, which silences the presenter
with the music.

### NAV-03 — `alwaysShowRoster` removes the hamburger entirely, and this bar kept it

**BUILT 2026-08-31.** The setting appears in BOTH sidebar-toggle conditions, on the refusing side of
each, so with it on neither slot renders and the users counter is the room's only remaining toggle —
which is exactly why that counter's handler is `alwaysShowRoster && (showSidebar = !showSidebar, …)`.
This bar already implemented the counter half (G12) and not this one, so in an `alwaysShowRoster`
room it rendered a control the reference removes, and that control could close a sidebar the setting
says is always shown.

The two upstream elements stay one element here: `DPe` and `EPe` differ only in title and icon, both
of which this file already writes as a ternary on `sidebarOpen`, and the pair is the compiler
splitting one `@if`/`@else` rather than two authored elements.

This row was ADDED after this document was committed.

**medium** · `missing-behaviour` · reference byte **2,487,413**

```js
H(1,DPe,2,0,"span",77)(2,EPe,2,0,"span",78)
77 ["title","Close Sidebar",1,"sidebar-menu","active-icon"]
78 ["title","Open Sidebar",1,"sidebar-menu"]
O(1, e.showSidebar && !e.alwaysShowRoster ? 1 : -1)
O(2, e.showSidebar || e.alwaysShowRoster ? -1 : 2)
```

**Ours (before):** `RoomNavbar.svelte` rendered `<span class="sidebar-menu">` unconditionally.

### NAV-04 — `breathing-rec` belongs on the presenter's recording ICON, and was nowhere

**BUILT 2026-08-31.** `iPe = (t, n) => ({ 'breathing-rec': t, recIndicatorStart: n })` is at byte
2,465,900 and is bound **exactly once in the whole bundle**, at byte 2,477,678, to element index 2 of
`t4e` — the `<i class="far fa-2x fa-dot-circle">` inside the presenter's Start/Stop Recording anchor,
const 153. So the reference's blinking REC is a presenter's cue on their own recording button, and
`.breathing-rec` is a real rule: a 5s `scale` pulse plus `color: red !important`,
`captured-runtime-components.css:4281`. This bar had it on no icon at all. This row was ADDED after
this document was committed.

Both terms of the first argument are carried: `roomState.isRecording && sessData.blinkingRec`, so a
room with the setting on and nothing recording gets no pulse. That second term is the one a
setting-shaped prop invites you to drop, and the contract test's negative control was run against
dropping it.

This row was ADDED after this document was committed.

**medium** · `missing-behaviour` · reference byte **2,477,678**

```js
iPe = (t,n) => ({"breathing-rec":t, recIndicatorStart:n})                       // byte 2,465,900
function t4e(t,n){ … d(0,"li",95)(1,"a",152), T(2,"i",153) … }                  // byte 2,477,354
m(), z("ngClass", ct(4, KB, !e.mediaService.isScreenSharing)),                  // index 1 = a[152]
m(), z("ngClass", Kn(6, iPe, roomState.isRecording && sessData.blinkingRec,
                            e.isRecordingStarting)),                            // index 2 = i[153]
153 [1,"far","fa-2x","fa-dot-circle",3,"ngClass"]
```

**Ours (before):** `<i class="far fa-2x fa-dot-circle"></i>`, a static class, with `blinkingRec`
spent entirely on the room-wide `[ REC ]` badge instead — see NAV-06 and NAV-08.

### NAV-05 — `recIndicatorStart` on that icon is inert in the reference, and is not worn

**MEASURED REFUSAL 2026-08-31.** `iPe`'s second argument puts `recIndicatorStart` on the same `<i>`
while `isRecordingStarting` is true. Its only rule anywhere is
`app-room .recIndicatorStart:not(:root) a:not(:root)…` — `captured-runtime-components.css:988`, a
DESCENDANT selector requiring an `a` inside the element carrying the class. An `<i>` with no children
has none, so the class paints nothing there, in the reference as much as here. This row was ADDED
after this document was committed.

Const 94, `[1,"nav-item","recIndicatorStart"]`, puts the same name on the STARTING badge's `li`,
which does contain the `a` that rule needs — and this room already wears it there. Adding a second
copy on the icon would be a class with no CSS, which the root standard refuses by name.

This row was ADDED after this document was committed.

**low** · `divergence` · reference byte **2,477,678**

```
94  [1,"nav-item","recIndicatorStart"]                        // the li that DOES have a descendant a
css app-room .recIndicatorStart:not(:root) a:not(:root)… { line-height:41px; color:#ff0 }
```

**Ours:** `NavbarRecIndicator.svelte` renders `<li class="nav-item recIndicatorStart">` with an `<a>`
inside it, which is the one placement the rule can match.

### NAV-06 — The `blinkingRec` docblock stated the wrong element, and had since it was written

**FIXED 2026-08-31.** The prop's docblock said the reference "binds `breathing-rec` through a class
MAP on the recording `ul` (`iPe`, byte 2,477,678), alongside `recIndicatorStart`", and concluded
"Same element breathing, one level down". Both halves are wrong: the binding is on an `<i>`, not a
`ul`, and the element it is one level down from is the presenter's recording anchor rather than the
`[ REC ]` badge — which carries no class map at all. The byte offset was right, which is how the
claim survived: it cites the correct instruction and describes the wrong element. This row was ADDED
after this document was committed.

`server/room-config-client.ts:249` already spelled `iPe` correctly, so the repository held both the
right statement and the wrong one, in two files, for as long as the prop has existed. That is the
failure the root standard names — a rule with no recorded WHY gets simplified back into the bug —
arriving as two records of one measurement disagreeing.

This row was ADDED after this document was committed.

**low** · `defect` · reference byte **2,477,678**

```
RoomNavbar.svelte, before:  "a class MAP on the recording `ul` … alongside `recIndicatorStart`"
bundle, byte 2,477,678:     z("ngClass", Kn(6, iPe, …)) applied to i[153], inside a[152]
```

**Ours:** the docblock now quotes the two `m()` steps that identify the element and points at
NAV-04's note at the icon. `RoomNavbar.svelte.test.ts:238` repeats the old sentence and is outside
this batch's scope; NAV-08 names it.

### NAV-07 — Both launching spinners lost `class="nav-link"`

**BUILT 2026-08-31.** `r4e` (byte 2,479,346) and `p4e` (byte 2,481,414) are byte-identical bodies:
`d(0,"li",19)(1,"a",150), T(2,"i",181)`, where const 19 is `[1,"nav-item"]`, const 150 is
`[1,"nav-link"]` and const 181 is `[1,"fas","fa-2x","fa-spinner","fa-spin"]`. Both `<a>`s here were
bare, so a spinner rendered without the padding and line-height every other item in the bar takes
from `.nav-link` and the row shifted the moment the device finished opening. This row was ADDED after
this document was committed.

Worth recording beside it: **the reference gates these two on `micLaunching` / `camLaunching`
ALONE**, not on any role — `O(25, e.mediaService.micLaunching ? 25 : -1)` and
`O(28, e.mediaService.camLaunching ? 28 : -1)`. This bar keeps them inside its single
`{#if isPresenter}` block, which is the divergence `room-navbar-contract.test.ts` already argues for
and asserts; the spinner is only reachable from a control that block also owns, so the narrower gate
costs nothing.

This row was ADDED after this document was committed.

**low** · `wrong-constant` · reference byte **2,479,346**

```js
function r4e(t,n){1&t&&(d(0,"li",19)(1,"a",150),T(2,"i",181),u()())}     // microphone
function p4e(t,n){1&t&&(d(0,"li",19)(1,"a",150),T(2,"i",181),u()())}     // webcam
150 [1,"nav-link"]
```

**Ours (before):** `<a><i class="fas fa-2x fa-spinner fa-spin"></i></a>`, twice.

### NAV-08 — The `[ REC ]` badge's `breathing-rec` is ours, and removing it needs one line elsewhere

**BLOCKED 2026-08-31.** Const 93 is `[1,"nav-item","recIndicator","animated","fadeIn"]` and `UPe`
(byte 2,474,097) binds one thing on it, `ngbTooltip`. There is no class map on the room-wide badge in
the reference, so the `breathing-rec` this bar puts there is an invention — a pulse every member sees
where the reference shows one only to the presenter who owns the recording. NAV-04 builds the real
placement; this row is the other half, and it cannot be closed from inside this batch's scope.

**What would unblock it, exactly.** In `apps/room/src/lib/room-navbar-contract.test.ts`, the
assertion block `it('breathes the REC badge only when the room asked for it')` pins the class to
`.recIndicator`; its three `expect` lines must move to the presenter's icon, i.e.

```
-    expect(html({ media: recording, blinkingRec: true })).toContain('breathing-rec');
+    expect(html({ media: recording, isPresenter: true, blinkingRec: true })).toContain('breathing-rec');
```

with the matching change on the `not.toContain` line below it, and the same for
`RoomNavbar.svelte.test.ts`'s `it('breathes only when the room asked it to')`, whose comment (line
238) repeats NAV-06's corrected claim word for word and must be replaced with the `iPe` measurement.

This row was ADDED after this document was committed.

**low** · `divergence` · reference byte **2,474,097**

```js
function UPe(t,n){if(1&t&&(d(0,"li",93)(1,"a",149),v(2,"[ REC ]"),u()()),2&t){ … xn("ngbTooltip", …) }}
93 [1,"nav-item","recIndicator","animated","fadeIn"]
```

**Ours:** `NavbarRecIndicator.svelte` keeps the class and now records, at the code, that it is ours
and why it stays.

### NAV-09 — The recording reminder is missing `!micMuted`, and the gate string is pinned

**BLOCKED 2026-08-31.** The reference's condition has five terms and this bar carries three of them:

```js
O(5, !sessData.recordingReminder || !e.recordingReminder || e.micDisabled
     || e.mediaService.micMuted
     || !roomState.isRecordingPaused && roomState.isRecording ? -1 : 5)      // byte 2,477,770
```

`micDisabled` is genuinely unmodelled here and `room/gates.ts:392` already records that. **`micMuted`
is not** — `media.micMuted` is read three elements away, by the microphone control's own class map —
so the banner tells a presenter "You are not recording!" while their microphone is muted, which is
the one state where starting a recording would capture silence.

**What would unblock it, exactly.** `apps/room/src/lib/recording-reminder-contract.test.ts:55`
asserts the gate as a literal string, so the component and that line have to move together:

```
-      '{#if recordingReminderAllowed && media.recordingReminder && (!media.recording || media.recordingPaused)}'
+      '{#if recordingReminderAllowed && media.recordingReminder && !media.micMuted && (!media.recording || media.recordingPaused)}'
```

That file is not this batch's to edit. Its `gatedSites`/`policySites` count is unaffected by the
change, since both sides still count one site.

This row was ADDED after this document was committed.

**medium** · `missing-behaviour` · reference byte **2,477,770**

**Ours:** `RoomNavbar.svelte` —
`{#if recordingReminderAllowed && media.recordingReminder && (!media.recording || media.recordingPaused)}`.

### NAV-10 — `Download Recording` has no counterpart anywhere in the reference

**DELIBERATE DIVERGENCE 2026-08-31.** The string `Download Recording` occurs **zero times in
2,891,205 bytes**; so does `recordedUrl`. The reference's recording menu is `YPe` (byte 2,475,469) on
the MediaMTX/rec-bot path and `e4e` (byte 2,477,105) otherwise, and neither renders a download: the
recording is made server-side and `recPreviewLocation` is where it goes. This room records in the
browser with a `MediaRecorder`, so it HAS a blob to hand back, and the item exists because of that —
it is a capability of this architecture rather than a transcription.

Recorded rather than removed, and recorded rather than left to look like a match. The control next to
it is a real gap in the other direction and is named here so the next reader does not have to
re-derive it: the reference shows **Show / Hide Rec Preview** under
`O(9, roomState.isRecording && sessData.recPreviewLocation ? 9 : -1)` — *while recording*, with a
preview location configured — where this bar shows it under `media.recordedUrl`, i.e. only after the
recording has stopped. `recPreviewLocation` is not modelled here at all, which is what keeps this a
divergence rather than a fix.

This row was ADDED after this document was committed.

**low** · `divergence` · reference byte **2,475,295**

```js
H(9,KPe,5,1)  …  O(9, roomState.isRecording && sessData.recPreviewLocation ? 9 : -1)
function KPe(t,n){ … d(0,"li"),T(1,"hr",115),u(),d(2,"li",19),H(3,WPe,3,0,"a",158)(4,qPe,3,0),u() … }
WPe: " Hide Rec Preview "     qPe: " Show Rec Preview"      // both verbatim here already
```

**Ours:** `RoomNavbar.svelte` gates the whole block on `media.recordedUrl` and puts Download
Recording at the head of it, with a comment recording why the preview toggle is not inside
`{#if media.recording}`.

### NAV-11 — `audioVolSlider` is an attribute with no consumer, in both applications

**MEASURED REFUSAL 2026-08-31.** The background-music slider (const 200) carries
`"audioVolSlider",""` and ours does not, which reads as a transcription gap. It is not one.
`audioVolSlider` occurs **seven times in 2,891,205 bytes** and every occurrence is accounted for:
four are const-table entries (2,000,881 and 2,001,857 in the AV-settings component, 2,539,771 and
2,545,086 and 2,545,418 in `app-room`), and the remaining two are **stylesheet** text —
`.audioVolSlider[_ngcontent-%COMP%]{background-color:#fafafa}` at bytes 2,556,585 and 2,586,249. That
rule is a CLASS selector and the markup writes an ATTRIBUTE, so it matches nothing; and no directive
declares `selectors:[["","audioVolSlider",""]]`, so nothing reads it either. This row was ADDED after
this document was committed.

Our master slider already carries the attribute, transcribed before this was measured. It stays —
removing a captured attribute is a change to the DOM this repository diffs against — but the second
copy is not added, because adding an inert attribute to match an inert attribute is work with no
consumer at either end.

This row was ADDED after this document was committed.

**low** · `wrong-constant` · reference byte **2,545,086**

```
200 ["audioVolSlider","","type","range","min","0","max","100","title","Background Volume",
     1,"px-0","py-2",3,"ngModelChange","input","ngModel"]
css .audioVolSlider[_ngcontent-%COMP%]{background-color:#fafafa}      // a CLASS rule, byte 2,556,585
```

**Ours:** `RoomNavbar.svelte`'s `#background-volume` input carries `title="Background Volume"` and
`class="px-0 py-2"` and no `audiovolslider`.

## MessageMenu.svelte

Six rows, produced 2026-08-31 by reading **all four** captured kebab menus end to end — `app-st-message`'s
`Bge` (byte 1,333,900) and `app-st-compactmessage`'s two renderers (`z1e` at 1,372,200 and the member
row at 1,380,700) — and decoding each component's consts array by value from its own `consts:[[`
(1,357,732 and 1,395,767).

**The finding worth stating first is that the entries already match.** Twelve gates, twelve entries,
the same source order, the same `&nbsp;&nbsp;` prefixes and the same three trigger classes in all
four. So five of the six rows below are refusals and divergences rather than missing behaviour, and
each carries the measurement that makes it one.

### MSM-01 — The Add Reaction icon's captured tooltip repeats the label beside it

**MEASURED REFUSAL 2026-08-31.** `["placement","left","ngbTooltip","Add Reaction",1,"far","fa-smile"]`
is `app-st-message`'s const 40 (byte 1,359,726) and `app-st-compactmessage`'s const 37 (byte
1,397,773), and in both it is the `T(2,"i",…)` of the reaction anchor. **The next instruction in each
of those functions renders the visible label:** `v(3,"\xa0\xa0Add Reaction")` in `Tge` (1,330,225) and
in `A1e` (1,368,562). The tooltip text is byte-identical to the words four characters to its right.

This repository does build captured `ngbTooltip`s — `#lib/ngb-tooltip` exists for it, and
`PrivateChatComposer.svelte` wears const 58's `["placement","left","ngbTooltip","Add Emojis",…]` on an
icon with NO adjacent text, where the bubble is the control's only label. Here it would repeat a
label the reader is already looking at, and our attachment's only accessibility effect is an
`aria-describedby` pointing at that same word while the bubble is open.

A second, independent measurement is recorded with it: `source-size-contract.test.ts` caps this
component at 253 and it stood at 252, so there was one line of headroom and no unpinned seam —
`chat-display-mode-contract.test.ts` requires `TRIGGER_CLASS`'s three strings to stay in this file's
own code. A refusal that cannot carry its reason at the code carries it at the gate, which is where
this one is: `message-menu-entries-contract.test.ts`.

This row was ADDED after this document was committed.

**low** · `missing-behaviour` · reference byte **1,359,726**

```
app-st-message        const 40 @1,359,726   ["placement","left","ngbTooltip","Add Reaction",1,"far","fa-smile"]
app-st-compactmessage const 37 @1,397,773   ["placement","left","ngbTooltip","Add Reaction",1,"far","fa-smile"]
Tge @1,330,225:  d(0,"a",39,1) … T(2,"i",40), v(3,"\xa0\xa0Add Reaction")
```

**Ours:** `MessageMenu.svelte` renders `<i class="far fa-smile"></i>&nbsp;&nbsp;Add Reaction`.

### MSM-02 — `aria-expanded` is a static literal in all three captured triggers

**DELIBERATE DIVERGENCE 2026-08-31.** `app-st-message` const 10 (1,358,083), `app-st-compactmessage`
const 9 (1,396,029) and const 56 (1,398,736) all read
`…"aria-haspopup","true","aria-expanded","false",1,"msgMenu",…`, and none carries a `3,"aria-expanded"`
binding marker — so the attribute is the string `false` for the life of the element and the reference
leaves Bootstrap's own `data-bs-toggle="dropdown"` script to correct it. This room has no Bootstrap
JS.

Transcribing the literal would announce a collapsed menu to a screen reader every time the menu is
open. `aria-haspopup` IS worn, so this is one divergence and not a rewrite of the trigger.

This row was ADDED after this document was committed.

**low** · `divergence` · reference byte **1,358,083**

**Ours:** `MessageMenu.svelte:aria-expanded={menuOpen}`, asserted in both directions by
`message-menu-entries-contract.test.ts`.

### MSM-03 — `id="dropdownMenuLink"` is duplicated once per message, in both applications

**DELIBERATE DIVERGENCE 2026-08-31.** The id is a static entry of all three trigger consts, and
`aria-labelledby="dropdownMenuLink"` is a static entry of both menu consts (`app-st-message` 11 at
1,358,243, `app-st-compactmessage` 10 at 1,396,212). One instance is rendered per message in the
reference and one per message here, so a 200-message log holds 200 elements carrying one DOM id and
every menu's `aria-labelledby` resolves to the first of them — the kebab of the oldest message on
screen.

Recorded and not repaired. The change is two lines in this component — a per-instance id from
`$props.id()` on the trigger and on the `aria-labelledby` — and it would break
`room-message-render.test.ts`, which pins the captured DOM of eighteen kebabs including that
attribute. That file is not this batch's to edit, and unlike NAV-08 the correction is not one line:
the eighteen fixtures each carry the literal, so the right change is to teach that test to normalise
the id rather than to rewrite eighteen captures.

This row was ADDED after this document was committed.

**low** · `defect` · reference byte **1,358,083**

**Ours:** `MessageMenu.svelte:118` and `:134`, transcribed, with the duplication now measured.

### MSM-04 — `User Info` and `Mention` are ungated upstream, and they are ungated here

**ALREADY BUILT 2026-08-31, verified by reading, not rebuilt.** In `Bge` the two anchors are element
indices 9 and 12 and the update block has no `O(…)` for either — the conditionals run
`O(8, …)` then straight to `O(15, …)`. `z1e` and the compact member renderer are the same shape at
indices 8 and 11. An audit reader listing "twelve gates" would file the two as gates this room
invented; they are not.

`sourceMessageBehavior` in `message-behavior.ts` returns the literal `openUserInfo: true` and
`mention: true`, so the only thing that can remove either is a captured menu listing that omits it,
which is `capturedMenuAllows` doing the job it exists for.

This row was ADDED after this document was committed.

**low** · `missing-behaviour` · reference byte **1,333,900**

```js
d(9,"a",12), x("click", () => doUserInfo(msg.uid, msg.rid)), T(10,"i",13), v(11,"\xa0\xa0User Info")
d(12,"a",12), x("click", () => doMention(msg.n)),            T(13,"i",14), v(14,"\xa0\xa0Mention")
// update block: … O(8, …), m(7), O(15, …) — nothing for 9 or 12
```

**Ours:** `messageMenuAllows` maps both through `capturedMenuAllows` onto a `true` fallback.

### MSM-05 — The reaction popover's `shown`/`hidden` outputs are not reproduced

**MEASURED REFUSAL 2026-08-31.** Const 39 (1,359,597) and const 36 (1,397,644) end
`3,"click","shown","hidden","ngbPopover"`, bound in `Tge`/`A1e` to `onPopoverOpen()` and
`onPopoverClose()`. Read whole at byte 1,355,713, all three handlers write one field:

```js
addReaction(){ this.showEmojiChooser=!0, console.log("this.popover: ", this.popover.isOpen()),
               $(".users-dropdown-options").on("click", e => (console.log("event: ",e), e.stopPropagation())) }
onPopoverOpen(){ this.showEmojiChooser=!0, console.log(…) }
onPopoverClose(){ setTimeout(() => { this.showEmojiChooser=!1 }, 500), console.log(…) }
``` `shown` writes a value the CLICK handler has
already written on the only path that opens the popover — which is what `onreactiontoggle` is here —
so the output is a second write and not a behaviour. And `addReaction` registers a fresh jQuery
delegation on `.users-dropdown-options` on every click, never removed: one listener per reaction
opened, for the life of the page, on a selector matching every kebab menu in the room. Reproducing
that is reproducing a leak.

The half that is behaviour is built and asserted: while the picker is open FROM this menu the entry
carries `aria-describedby`, which is what ngbPopover gives the reference.

This row was ADDED after this document was committed.

**low** · `divergence` · reference byte **1,355,713**

**Ours:** one `onreactiontoggle` callback plus `reactionPopoverId`, the renderer owning which popover
is open because the reaction pill can raise the same one.

### MSM-06 — `Mark Answered ` and `Private Chat ` lost the trailing space the capture gives them

**FIXED 2026-08-31.** `v(2,"\xa0\xa0Mark Answered ")` at byte 1,330,053 and
`v(2,"\xa0\xa0Private Chat ")` at 1,330,816, with the compact renderer's `M1e` (1,368,390) and `I1e`
(1,369,153) spelling both identically — so unlike `showAll`/`report`/`reply` these do not vary by
renderer and belong in the markup rather than in `MESSAGE_MENU_TEXT`. Both were written here as text
followed by a newline, which Svelte and HTML whitespace folding remove, so the room rendered
`Mark Answered` where the capture has `Mark Answered `. This row was ADDED after this document was
committed.

Restored with `{' '}` — the braces idiom `apps/room/AGENTS.md` records as a standing exception,
because every capture comparison in this repository diffs rendered strings. The other nine entries
have no trailing space in any of the four menus and still have none, which is asserted as the control
beside the fix.

This row was ADDED after this document was committed.

**low** · `wrong-constant` · reference byte **1,330,053**

```js
wge @1,330,053: d(0,"a",12),T(1,"i",38),v(2,"\xa0\xa0Mark Answered ")
kge @1,330,816: d(0,"a",12),T(1,"i",43),v(2,"\xa0\xa0Private Chat ")
```

**Ours (before):** `&nbsp;&nbsp;Mark Answered` and `&nbsp;&nbsp;Private Chat`, each followed by a
newline that folded away.

## The fifty-one refuted claims

Kept, not deleted. A future reader who re-derives one of these from the same offset should find it
here first.

| # | claim | verdict | why |
| --- | --- | --- | --- |
| G10 | Room-wide media outage is silent — no "Reconecting audio/video..." alert on `webRTCServerDisconnected` | `already-built` | The room-wide media-outage alert is built, under the reference's own live event name. The claimed handler `webRTCServerDisconnected` is DEAD CODE in the reference: I read the bytes at the cited offset and then searched the entire bundle — the string occurs exactly once (as a `subscribe`), and `emit("webRTC…")` yields o… |
| G15 | `.alert-chat-box` hover does not hide the main tab strip | `not-in-reference` | The quoted string IS at offset 2499976 verbatim — the claim is not fabricated. But the evidence does not support the behaviour claimed, because the handler is dead code on both ends. |
| G18 | The room-reset dialog uses a different sentence from `resetSession` | `already-built` | The claimed divergence does not exist. Our room-reset dialog is a VERBATIM transcription of the reference sentence belonging to the command it implements, and the byte citation the claim calls "a different component's string" is in fact exact. |
| USM-16 | Theme radios use a simplified checked expression | `already-built` | This is not an unnoticed simplification — it is a pre-existing, fully documented, deliberate divergence, and the two settings the claim says are "unmodelled" are in fact modelled end-to-end. 1. |
| UIM-14 | 'Give Mic/Screenshare' and 'Take away' buttons are invented — the reference binds giveMicScreen from no template chunk of this component | `already-built` | Not actionable — the affordance is implemented AND the divergence it flags is already declared in-source, in the same words, at the exact lines. I must be plain about one thing first: I did NOT refute the reference-side half of the claim, I CONFIRMED it. |
| UIM-15 | 'Upload Profile Picture' is an inert button — the whole admin upload dialog is absent | `already-built` | Built end-to-end on 2026-08-29 and the claim's core premise is factually wrong. The button does NOT dispatch onUserAction('upload-profile-picture', ...) — that action string has ZERO hits anywhere in apps/room/src (grep -rn "'upload-profile-picture'" src/ returns nothing), because the control was deliberately given its… |
| CONN-05 | ICE server set replaced, plus an added `unconfigured` TURN state and an `ice-source` provenance line — deliberate, documented, and test-pinned | `already-built` | All three parts of the claimed divergence are present in our source, implemented, documented and test-pinned; the claim's own cited line numbers are stale by ~200 lines but every element is there under the same names. (1) ICE-server replacement: `ModalHost.svelte:939-947` sets `const usingDeploymentServers = mediaIceSe… |
| CONN-06 | loadMicDevices is not called at component init, only when the modal opens | `already-built` | The claim's factual description of both sides is correct, but its conclusion ("plausibly deliberate, but I found no comment in our source claiming it — worth confirming rather than silently keeping") is refuted. This is not an undocumented drift; it is a decided, written-down, test-enforced repository contract, so ther… |
| SRCH-04 | Search payload omits traders, rooms and isArchived; the reference sends all seven fields and substitutes userSessions for empty rooms | `already-built` | The gap is stated as "payload omits traders, rooms and isArchived", but two of the three are built here under another name/location, and the third has nothing to filter. (1) TRADERS is fully implemented — `filterAlerts` applies exactly the reference's trader predicate (`Object.keys(search.traders)` matched against `sen… |
| SRCH-06 | Advanced Search toolbar button is rendered unconditionally; the reference gates it on sessData.advancedSearchAlerts | `not-in-reference` | The offset is genuine — at byte 2043065 the bundle really does contain the quoted text — but the evidence does not support the claim as stated. The claim says the reference gates the button on `sessData.advancedSearchAlerts`; the actual gate is a CONJUNCTION: `O(6, e.appService.globals.sessData.advancedSearchAlerts &&… |
| note-editor-dropdown-open-class | No counterpart to the note-dropdown-open positioning fix | `not-in-reference` | The quoted bytes ARE at the offset — I read them and they match verbatim — but they do not support the gap, because the handler is dead on the path it claims to fix. What is actually at 1471155-1471700 (app-note component, ngAfterViewInit): `const e=Array.from(document.querySelectorAll("#notes .dropdown-toggle"));for(l… |
| acA-03 | The whole chat toolbar (.chatToolbar) has no counterpart: chat search form, save, archive, Mod Only, Detach Chat | `already-built` | The claim's factual premises are false at the exact lines it cites. (1) "AlertChatArea.svelte has no .chatToolbar element at all" — it does: AlertChatArea.svelte:819 renders `<div class="shadow p-2 w-100 chatToolbar" style="margin-top: 0px;">`, byte-for-byte the reference's const 21 `[1,"shadow","p-2","w-100","chatTool… |
| acA-09 | "Advanced Search" is rendered unconditionally where the reference gates it on advancedSearchAlerts | `not-in-reference` | Refuted on two independent grounds. (1) The cited offset is wrong: the quoted expression does not begin at 2042677; s.find() places it at 2043008 (bare token `advancedSearchAlerts` at 2043042, its single occurrence in the bundle). |
| acA-10 | No mouseenter/mouseleave on .alert-chat-box hiding the main tab strip's nav-tabs | `not-in-reference` | The quoted string IS present verbatim at the claimed offset — the offset is not fabricated — but it is DEAD CODE, so it does not support the claim that the reference hides the main tab strip's nav-tabs on hover. The hide/show target `.mainTabset ul.nav-tabs` is a descendant selector that matches zero elements: `mainTab… |
| acA-13 | The composer/Chat-Disabled switch drops the isConnected term | `not-in-reference` | The quoted text IS at the offset verbatim, but it does not support the claim: the `isConnected` term is a branch that can never be false. On the chat component the field is initialised `this.isConnected=!0` (byte 1428863) and is written ONLY by two event-bus subscriptions, `subscribe("socketDisconnected",...=!1)` and `… |
| RM-09 | Compact Trial badge text is "Trial" with no padding spaces; only the card uses " Trial " | `already-built` | The claim is refuted because it reasons from our SOURCE text rather than our RENDERED output, and the Svelte compiler strips element-boundary whitespace. WHAT THE REFERENCE ACTUALLY SAYS (I read the bytes, not a search summary): - offset 1338742: `function Jge(t,n){1&t&&(d(0,"span",61),v(1," Trial "),u())}` — I resolve… |
| RM-15 | "click to hide" placeholder label has no reference counterpart | `already-built` | The claim is a false gap caused by searching only the JS bundle. `"click to hide"` is genuinely absent from main.d1d09071be31f1ba.js, but so is the FUNCTION that would carry it: I searched the whole 2,891,205-byte bundle for `showChatGif` and found exactly ONE occurrence, at offset 1326281, and that occurrence is insid… |
| RM-17 | openAlertSendReport's empty branch — bootbox.alert('No reports found.') | `already-built` | The reference's falsy branch fires on exactly one condition: `openAlertSendReport(this.msg._id)` called with no `_id`. I traced which rows can reach it. |
| RM-18 | invertTxtColorToggler's early `return {}` guard is not reproduced | `not-in-reference` | The offset is genuine — the quoted bytes are exactly there — but the evidence does not support the claim, because the `return {}` branch is UNREACHABLE DEAD CODE in the reference. The guard fires only when `e.fontSize` string-equals a COLOUR: `e.fontSize===globals.chatStyle[theme].color \|\| e.fontSize===globals.presente… |
| RM-23 | isMention: this component's own rule is a bare case-sensitive includes with no trailing space and no @all | `already-built` | The claim rests on an evidence caveat that the permitted file itself refutes. It says our `isMentionOf` rule (lowercase both sides, required trailing space, `@all ` from an admin) was "transcribed from a DIFFERENT bundle build (`main.d6d3c112b59b7d0d.js`) which is not readable in this checkout, so I cannot confirm whic… |
| PA-09 | `.presentation-box` drops the `!important` on `overflow: hidden` | `already-built` | The `!important` is NOT dropped. The claim inspected only the second, additive `.presentation-box` rule in app.css and missed the imported capture sheet. |
| poll-04 | flot label container colour #FAFAFA has no counterpart | `not-in-reference` | The literal exists but the claimed offset is wrong and, more importantly, the evidence does not support a missing visual property — #FAFAFA is unobservable dead config. OFFSET: the quoted run `label:{show:!0,radius:.8,color:"#FAFAFA",formatter:...` begins at byte 2104752, and `color:"#FAFAFA"` at 2104777. |
| poll-05 | Loading GIF path rewritten from ../../assets to /assets | `already-built` | The control exists in our source and the divergence is deliberate, correct, and non-behavioural. I read the reference bytes at the cited offset and they match verbatim; I then read our counterpart and it renders the same loading GIF in the same place with the same siblings. |
| poll-06 | #pollPieChart carries an extra position:relative | `not-in-reference` | The offset is exact and the quoted literal is real — but the evidence does not support the claim of a divergence. WHAT IS ACTUALLY AT 2115007 (read, not inferred): `["id","pollPieChart",2,"display","none","width","100%","height","300px","text-align","center"],` — byte-exact match for the claimed array, `s.find('["id","… |
| RS-13 | "Powered by" credits and links to a different company than the reference | `already-built` | The "Powered by" credits control is fully implemented in RoomSidebar.svelte, not missing. Ours reproduces the reference's entire structure for TPe's first list item — sidebar-wrapper > navbar w-100 h-100 > navbar-nav small w-100 h-100 > li.nav-item text-center > <p>Powered by: <a …></p> followed by the sibling <p>Versi… |
| RS-14 | Sort/Trials state is local to RoomRoster; the reference broadcasts it on guiEventBus and the child applies pipes | `already-built` | The behaviour is fully implemented; the guiEventBus emit is Angular plumbing, not a feature, and has no observable effect our source lacks. I read the bundle: the emitter lives on two separate top-level page components (selectors `app-room` at 2517337 and `app-closed-session-page` at 2570514), while the pipes live on a… |
| RS-15 | Roster rows are unmounted while the rail is collapsed; the reference keeps them mounted and only toggles a class | `not-in-reference` | The quoted string does exist in the bundle (exact start offset 2547994, not 2548034 — 2548034 lands 40 bytes into it), but it does not support the claim, and in fact contradicts it on every axis. (1) WRONG COMPONENT. |
| RS-16 | Five reference elements that are pure Bootstrap triggers carry explicit onclick handlers here | `already-built` | The reference half of the claim is correct — I read the const table at offset 2572865 and consts 20/23 are ["title","Connectivity Check","data-bs-toggle","modal","data-bs-target","#webrtc-troubleshooter-modal",1,"nav-link","sidebar-item"] and the "General Settings" twin, neither carrying 3,"click", while the adjacent M… |
| FP-02 | Empty-state <h4>No room files found.</h4> is not rendered at all | `not-in-reference` | The quoted bytes are real and the offset is exact, but they do not support the claim. The h4 is NOT an empty-state message in the reference: its gate, read verbatim in the same component's update block, is `O(84,o.sessionFiles?-1:84)` — it renders only when `sessionFiles` is FALSY (never fetched). |
| FP-04 | aria-selected is a static attribute in the reference and a live binding in ours | `already-built` | Both halves of the claim are factually correct, but it is not a gap. The reference genuinely hardcodes aria-selected (verified at offset 1996545), and ours genuinely binds it (FilesPane.svelte:107,134,161) — and the claim's own remedy, that the divergence "should stay recorded as deliberate," is ALREADY recorded. |
| FP-07 | Row selection is real state here; the reference has no selection state and reads the DOM back | `already-built` | Row selection feeding "Delete Selected" is fully implemented in our source, and the state-vs-DOM difference is a recorded, tested implementation decision rather than a missing or divergent behaviour. The reference reading in the claim is accurate — I re-read it rather than trusting it. |
| FP-08 | calculateFiles does not reset the three totals when the list is empty; ours recomputes to zero | `already-built` | The reference text is transcribed correctly (I re-read the bytes myself), but the item is not a gap in our source — the correct behaviour it describes is already present, and structurally so. Reference: `calculateFiles(e){return e&&e.length>0&&(this.soundsTotal=0,...)}` caches three counters on the component and only r… |
| FP-10 | playMp3ForMe uses a prefixed element id and adds an 'ended' listener the reference does not have | `already-built` | The behaviour is fully implemented, and both "differences" are deliberate, documented-in-place, and held by their own negative-controllable tests — so this is a recorded divergence, not a gap. `playMp3ForMe` exists at apps/room/src/lib/room/files.svelte.ts:341-369 and is wired to the Play/Stop button at apps/room/src/l… |
| FP-11 | Refresh re-runs the page load instead of posting the getSessionFiles command | `already-built` | The Refresh control is fully built, ungated, byte-matched to the reference's attributes, and its handler DOES refetch the file list from the server. The only difference is transport, and it is a deliberate, documented, contract-tested choice — not a missing behaviour. |
| PAM-06 | "See Scheduled Alerts" button, its #scheduledAlertsModal target and its scheduledAlerts.length>0 gate are absent | `already-built` | The control is not missing — it is built under a deliberate, documented rename, and the modal id the claim calls absent is literally present in our source. WHAT I VERIFIED IN THE REFERENCE (read, not assumed). |
| PAM-15 | aria-selected and the `active` class are computed from the current tab; the reference hard-codes them (and hard-codes "true" on two tabs at once) | `already-built` | Nothing is missing — the described behaviour is fully implemented in our source and pinned by a contract test, and the reference reading is accurate, so this is a completed, deliberate divergence rather than outstanding work. Ours: PostAlertModal.svelte binds all three attributes off the `tab` state on every tab anchor… |
| PAM-16 | Tab identifiers renamed: reference "text"/"link"/"img", ours 'text'/'url'/'media' | `already-built` | Refuted. This is a governed internal rename with zero observable divergence, and I verified both sides. |
| G9 | Enter+Shift appends a newline; the reference appends one only for Alt | `already-built` | The claim reads the reference's `onKey` as if it were a keydown handler. It is not — the PM textarea binds exactly three listeners, `keyup`, `paste`, `focus`, and no keydown at all. |
| G10 | Composer binds `keydown`, the reference binds `keyup` (and also `paste` and `focus`) | `not-in-reference` | The quoted array is real but it is NOT the main composer, and the claim's premise is refuted by the reference itself. (1) OFFSET CORRECTION. |
| G20 | The gear does not re-scroll the log when the toolbar opens or closes | `not-in-reference` | The offset is real and the quote is verbatim, but the evidence does NOT support the claim: the gear's scroll emit is dead code that fires into a bus with no subscriber, so the reference does not re-scroll the log when the toolbar toggles either. 1. |
| G22 | Unread badge is missing `bg-light` | `not-in-reference` | The citation is exact — byte 2217027 really is `[1,"badge","bg-light","privchatUnread"],`, consumed at offset 2196123 as `d(0,"span",46)` inside the unread-badge template `iEe`, so the reference span genuinely carries `bg-light` and ours (PrivateChatPanel.svelte:330, `class="badge privchatUnread"`) does not. The claim… |
| G24 | Scroller has no `scroll` handler, so `isScrollingUp` and its threshold are unmodelled | `not-in-reference` | Two independent refutations. (1) The claimed offset is wrong. |
| G26 | Header peer tab is driven by `selectedMessageUser` and its `active` class is hard-coded | `not-in-reference` | The offset and quote are genuine — `function eEe(` starts at exactly byte 2194806 and the quoted text is verbatim — but the evidence does not support either half of the claim. (1) "active class is hard-coded" is not a divergence. |
| SV-SP-07 | 'Stop This Screen' on a remote screen only drops the local tab; the reference also sends forceStopScreen after 2s | `already-built` | Every factual premise of the claim is stale. `RoomScreens.stop` no longer ends at "drop the tab"; the comment quoted in the claim ("Stopping their producer is not ours to do") is gone from the file, replaced by the opposite one. |
| SV-SP-11 | ScreenPane omits the video click that toggles native controls (dead upstream by the component's own stylesheet) | `not-in-reference` | The quoted code is genuinely present (exact start byte 1501400; the claimed 1501442 falls inside that run, on `o.showControls=!o.showControls`), but it is provably dead code upstream, so it does not support a gap. The component is `app-screenshare-view` (`selectors:[["app-screenshare-view"]]` at byte 1500253). |
| SV-SP-12 | StreamingView omits detachScreen / reAttachScreen and the three no-op stubs | `not-in-reference` | The bytes at 1908109 are exactly as quoted and do belong to app-streaming-view, but they are unreachable dead code, so they do not support a gap. (1) reAttachScreen occurs exactly ONCE in the whole 2,891,205-byte bundle — offset 1908154, the definition — with zero callers anywhere. |
| dta-06 | Day-trade Cancel's forced `dayTradeAlertsLog` array-identity reassign is not reproduced (and the swing twin never had it) | `already-built` | Not a gap — the divergence is already implemented and documented in our source with the correct byte offset, and every claim in that note verifies independently. Reference read at 1987900-1988600: the Day-trade cancel confirm callback is `i&&(this.clearDayTradeAlertFields(),this.appService.globals.dayTradeAlertsLog=[..… |
| dta-07 | CSV export revokes the object URL; the reference leaks it | `already-built` | Nothing is missing. The CSV export is fully implemented on both panes, and the revoke the "gap" describes is already present with its reason recorded in-file — DayTradeAlertsPane.svelte:241 and SwingAlertsPane.svelte:222 both call window.URL.revokeObjectURL(url) after link.click()/link.remove(), and the comment at DayT… |
| EMOJI-11 | Anchor-click scroll target differs: reference pins the first category to 0 and adds 1 elsewhere | `already-built` | Both halves of the claimed divergence are already implemented, one of them under a different mechanism. (1) The scroll TARGET matches exactly: the reference's category `top` is defined at offset 726648 as `this.top=i-s+e.scrollTop` (containerRect.top - scrollerRect.top + scrollTop), and EmojiPicker.svelte:231 `emojiScr… |
| EMOJI-13 | Stored skin tone is read with Number() + a 1..6 clamp rather than JSON.parse | `already-built` | The behaviour is implemented, and it is observably identical to the reference across the entire domain of values the reference itself can produce. WHAT I READ IN OUR SOURCE - apps/room/src/lib/components/EmojiPicker.svelte:421-422 — the restore-on-open read: `const storedSkin = Number(storage()?.getItem(`${NAMESPACE}.s… |
| EMOJI-14 | Reaction chip text omits the reference's trailing space | `not-in-reference` | The quoted bytes exist but do not support a gap. Two findings. |


---

## VideoPlayer.svelte

Read end to end on 2026-08-31 against the v4 bundle: the class methods at bytes 1,979,590–1,981,860,
the six template functions `WSe` / `qSe` / `KSe` / `YSe` / `QSe` / `XSe` at 1,930,621–1,931,900, the
three that render the player itself (`ewe` / `twe` / `nwe` / `iwe`) at 1,932,050–1,932,850, and the
room component's own consts table walked BY VALUE from its opening bracket at byte 1,994,264 —
entries 140 to 163 are this surface, at bytes 2,003,464 to 2,003,940.

Six differences. Four reference behaviours the reader looked for and found already present are worth
naming, because a list of only gaps reads as though nothing works: the per-item `Play For All` gate
(`O(5, videoPlayerUrl || videoPlayerUrl === e ? -1 : 5)`) is dead upstream — the whole list is behind
`O(1, videoPlayerUrl ? 2 : 1)` in `owe`, so ours being an outer `{#if}` is the same thing; the
`<video>` and `<iframe>` attribute sets match consts 160 and 163 exactly; `loadVideos()` is
presenter-gated at byte 1,967,675 and so is ours; and `stopVideoForAll(e)` really does interpolate
its verb into the question and then send the same bare command either way, which is what this file's
`requestStopVideo` already says.

### VID-01 — Both "Play For All" dialogs are hand-rolled `.bootbox.modal` markup, so neither has a backdrop, a focus move, or a focus restore

**FIXED 2026-08-31.** Routed through `BootboxDialog.svelte` with its `footer` snippet — the primitive
this repository already models `bootbox.dialog` with, and the same shape `RoomOverlays` uses for
`randomUser()`'s two-button dialog. Passing `footer` REPLACES the default OK, so the reference's own
button set is the dialog's only control, which is the property `dta-02` records for the alert-pane
lightbox.

**A copy of a primitive is a copy that stops tracking it, and these two had already stopped.** About
ninety lines of `<div class="bootbox modal fade show">` were transcribed by hand, and the three
things the copy was missing are the three that are not markup: no `.modal-backdrop`, so the room
stayed clickable behind a dialog that asserts `aria-modal="true"`; no focus move and no focus
restore, so a keyboard user's focus stayed on the Play For All button they had just left, behind the
dialog; and no `bootbox-alert` class, which is what the captured stylesheet and every other dialog in
this room are keyed on.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

**medium** · `defect` · reference byte **1,980,807**

```
playVideoForAll(e){bootbox.dialog({title:"Video",message:"<p>Do you want to play this video at a specific time?",buttons:{cancel:{label:"Cancel",className:"btn-danger",callback:()=>{console.log("Cancel clicked")}},noclose:{label:"Choose time?",className:"btn-success",callback:()=>{bootbox.dialog({title:"Choose time:",message:"<p><input type='datetime-local' id='video-start-datetime' name='video-start-datetime' class='form-control' /></p>",buttons:{cancel:{label:"Cancel",className:"btn-danger",…},ok:{label:"Send",className:"btn-primary",callback:()=>{…}}}})}},ok:{label:"Play now",className:"btn-primary",callback:()=>{…}}}})}
```

**Ours:** VideoPlayer.svelte:317-413 (before) rendered the two dialogs as literal `<div class="bootbox
modal fade show" style="display: block;">` blocks with their own `.modal-dialog` / `.modal-content` /
`.modal-header` / `.modal-footer` scaffolding, while `BootboxDialog.svelte` — imported by this same
file three lines above for the alert and the confirm — renders `<div class="modal-backdrop fade
show">`, moves focus to `.bootbox-accept` on mount and restores the previous focus on teardown, and
carries the `bootbox-{mode}` class. Verified as rendered rather than as source:
`room-surface-audit-2026-08-31-contract.test.ts` drives the `+` button, the Play For All button and
the Choose time? button and asserts a `.modal-backdrop` behind each dialog, the reference's three
button labels in the reference's order, and no default OK beside them.

### VID-02 — Both pending-video blocks read `m-2`; const 141 is `m-4`, and `m-2` is the const the "No videos." state uses

**BUILT 2026-08-31.** Const 141 is `[1,"m-4"]` at byte 2,003,492 and is taken by BOTH `d(0,"div",141)`
in `WSe` (the " Video URL: " block) and `d(1,"div",141)` in `qSe` (the " Video scheduled for: " block).

**The pair is what makes it more than a number.** Const 146 is `[1,"m-2"]` at byte 2,003,720, and it
is the "No videos." div — the LIST state, which the pending block replaces. Upstream the pending
notice indents further than the list precisely because it is not one; ours drew both at the same
inset, so the two states looked like two rows of one thing.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

**low** · `wrong-constant` · reference byte **2,003,492**

```
[1,"m-4"],[1,"mx-2"],["type","button","title","Remove For All",1,"btn","btn-danger","btn-sm","ms-4",3,"click"],[1,"fa","fa-trash","mr-2"],[1,"w-100","d-flex","justify-content-between","align-items-center","m-2","border-bottom"],[1,"m-2"],
```

**Ours:** VideoPlayer.svelte:186 and :195 (before) both read `<div class="m-2">`. The index was not
guessed: the consts table was walked bracket by bracket from `consts:[[` at byte 1,994,257, and
entries 138–166 printed by value, which is how 141 and 146 were separated at all — the two are ten
bytes apart in the table and both are one-class arrays.

### VID-03 — The `<strong>` holding the pending url carries no class; const 142 is `mx-2`

**BUILT 2026-08-31.** `d(2,"strong",142)` in `WSe` at byte 1,930,621, and 142 is `[1,"mx-2"]` at byte
2,003,502 — the SAME const the "Video scheduled for:" `<span>` already used here, which is what makes
the omission visible: one of the two consumers of const 142 had it and the other did not.

Cosmetic, and small: without it the url butts straight against the "Video URL:" label.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

**low** · `wrong-constant` · reference byte **1,930,621**

```
function WSe(t,n){if(1&t&&(d(0,"div",141),v(1," Video URL: "),d(2,"strong",142),v(3),u()(),d(4,"p"),v(5," IMPORTANT: The video URL needs to be a link to an mp4 video hosted on a website or something like S3, not a YouTube/Vimeo etc... "),u()),2&t){const e=g(5);m(3),Ze(e.scheduledVideo.videoURL)}}
```

**Ours:** VideoPlayer.svelte:188 (before) `<strong>{scheduledVideo.videoURL}</strong>`, against
VideoPlayer.svelte:196 `<span class="mx-2">` on the date twelve lines below it.

### VID-04 — The IMPORTANT paragraph is nested inside the url block; `u()()` puts it outside

**BUILT 2026-08-31.** Same bytes as VID-03 and the same read: `d(0,"div",141)` … `u()()` closes the
`strong` AND the `div`, and only then does `d(4,"p")` open. The paragraph is a SIBLING of the block.

**Not only nesting.** Nested inside a `m-4` div the paragraph inherited the indent and read as a
caption on the url — as though the warning were about that url in particular. As a sibling it is a
statement about the feature, which is what its text actually says: *"The video URL needs to be a link
to an mp4 video hosted on a website or something like S3."* The assertion measures `closest('div.m-4')`
rather than searching for the text near the div, because nesting is what differs and a window that
happens to contain the right text is not containment — the lesson `av-device-pane-contract.test.ts`
already records at `elementAt`.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

**low** · `divergence` · reference byte **1,930,621**

```
d(0,"div",141),v(1," Video URL: "),d(2,"strong",142),v(3),u()(),d(4,"p"),v(5," IMPORTANT:
```

**Ours:** VideoPlayer.svelte:186-193 (before) opened `<div class="m-2">`, put the `<strong>` and then
the whole `<p>` inside it, and closed the div after the paragraph.

### VID-05 — The scheduled time builds a fresh `Intl.DateTimeFormat` per call, in the VIEWER's locale; the pipe is `date:'medium'`, which resolves `en-US` for every viewer upstream

**FIXED 2026-08-31.** `mediumDate` from `#lib/message-formatters.js` — the room's own `date:'medium'`,
already there, already pinned to `en-US`, and already built once at module scope.

**Two defects, and the locale one is the one that could not be seen from this file.** Angular resolves
`date:'medium'` against `LOCALE_ID`, and this bundle never calls `registerLocaleData`: the only
occurrence of that name in all 2,891,205 bytes is inside Angular's own *"Missing extra locale data"*
error string at byte 147,099. So the reference renders `Aug 31, 2026, 5:04:00 PM` for every viewer on
earth, and passing `undefined` here rendered `31.08.2026, 17:04:00` for some of them. The other half
is the one `#lib/message-formatters.ts` and `#lib/short-when.ts` were each written for: constructing
an `Intl.DateTimeFormat` is a locale-data lookup, and this one ran on every render of the pending
line.

**Its `Invalid Date` guard went with it, deliberately.** The only writer of `videoPlayTime` is
`scheduleVideoForAll` in `#lib/room/broadcasts.svelte.ts`, which refuses to arm an unparseable value
(`if (!Number.isFinite(delay)) return`). A guard against a state its own writer cannot produce is a
claim that the writer might.

**And its control came back GREEN, which is recorded rather than repaired.** Restoring the
`undefined`-locale formatter left the format assertion passing — on a box whose default locale IS
`en-US`, both spellings render the same string. The locale is pinned by the second assertion (*"builds
no formatter of its own"*), which went red on the same mutation; the division is written into the test.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

**low** · `divergence` · reference byte **1,930,918**

```
function qSe(t,n){if(1&t){const e=Y();H(0,WSe,6,1),d(1,"div",141),v(2," Video scheduled for: "),d(3,"span",142),v(4),Xe(5,"date"),u()(),d(6,"button",143),x("click",function(){return D(e),E(g(4).stopVideoForAll("remove"))}),T(7,"i",144),v(8," Remove Scheduled Video "),u()}if(2&t){const e=g(4);O(0,e.scheduledVideo.videoURL?0:-1),m(4),Ze(Ct(5,2,e.scheduledVideo.videoPlayTime,"medium"))}}
```

**Ours:** VideoPlayer.svelte:167-179 (before) — `formatScheduledDate` called
`new Intl.DateTimeFormat(undefined, {year:'numeric',month:'short',day:'numeric',hour:'numeric',
minute:'2-digit',second:'2-digit'})` inside the function body. `mediumDateFormatter` at
`apps/room/src/lib/message-formatters.ts:73` is the same option set plus `hour12: true`, pinned to
`en-US`, and its own docblock records that it was moved out of `+page.svelte` for exactly this
reason — this file was the fifth copy of the mistake it was extracted to end.

### VID-06 — The reference's `videoseries` playlist URL is unreachable; ours reproduced the unreachable branch, with no record of why and no test on the four refusal sentences

**MEASURED REFUSAL 2026-08-31 — the branch is reproduced by NOT being written, and the measurement is
at the code.** `if(!o||!r) return void bootbox.alert("The youtube link seems wrong.")` demands BOTH a
video id and a `list=`, and the ternary two characters later branches on the video id alone. Anything
reaching the ternary has both, so `https://www.youtube.com/embed/videoseries?list=…` cannot be
produced by any input: a YouTube url with a playlist and no video id is refused by the guard above it,
and one with both is rendered as the single video. A presenter pasting a pure playlist link gets *"The
youtube link seems wrong."*

**Writing the arm would answer a question the reference has not answered.** So `#lib/video-list.ts`
does not build the playlist url at all, and `video-list-contract.test.ts` asserts the REFUSAL rather
than what the arm would return — including `expect(JSON.stringify(result)).not.toContain('videoseries')`
— so the day somebody relaxes the guard, the test names the decision they have just taken.

**The reason for the module is the other half of the row.** The four refusal sentences are every one
of them a transcription, and the only way to reach them was to mount the component and drive an input,
so none had ever been executed. They are pure now, and the ORDER is executed with them: emptiness is
tested before the scheme (a blank field is told it is blank), and the duplicate test runs AFTER the
normalisation, so `watch?v=X&list=Y` and the embed url it becomes are one entry rather than two rows
that play the same video.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

**low** · `divergence` · reference byte **1,979,830**

```
if(!o||!r)return void bootbox.alert("The youtube link seems wrong.");o?e=`https://www.youtube.com/embed/${o}?autoplay=1`:r&&(e=`https://www.youtube.com/embed/videoseries?list=${r}&autoplay=1&loop=1&rel=0`)
```

**Ours:** VideoPlayer.svelte:104-114 (before) carried `if (!videoId || !playlistId) { … } if (videoId)
{ … } else if (playlistId) { … }` — the same unreachable arm, under a comment reading only *"This
restrictive two-part guard is present in the compiled source"*, which records the guard and not the
consequence. `#lib/video-list.ts` now carries both, and the two YouTube patterns stay character for
character what the capture has, escapes included.

---

## ScheduledAlerts.svelte

Read end to end on 2026-08-31 against the v4 bundle. The surface is two reference components:
`app-scheduled-alerts-modal` whole — class at byte 2,406,725, template at 2,408,380, consts walked BY
VALUE from byte 2,407,518 (17 entries), component styles at 2,409,000 — and the send-later fields
inside `app-post-alert-modal`, template function `QTe` at byte 2,120,600 with its buttons `XTe` /
`JTe` / `ZTe` / `tDe` at 2,121,700–2,122,050.

Seven differences. Reference behaviours confirmed present and NOT re-litigated: the repeat select's
three labels and their wire values (PAM-07), the timezone note and its underline (PAM-09), the
`Ignore weekends?` wording and its `daily`-only gate (PAM-08), the confirm-before-schedule and its
`Alert scheduled OK.` (PAM-11), the `showSendLater` mutual exclusion with Post Alert (PAM-05), and the
`date:'short'` cell, which `#lib/short-when.ts` has served since 2026-08-30.

### SCH-01 — Remove deletes a scheduled alert on the click; the reference asks first, and quotes the alert

**BUILT 2026-08-31.** `removeScheduledAlertQuestion` in `#lib/scheduled-alert-table.ts`, asked through
the pane's existing `onconfirm` prop — the room's own dialog primitive, the same one PAM-11 uses two
functions above and for the same recorded reason: this pane does not own the dialog stack.

**The most expensive kind of missing confirmation.** A presenter who meant to press Remove on the
09:30 row and hit the 09:35 one destroyed an alert with no undo, no record of what it said, and no way
to know which one had gone — the table simply came back one row shorter. Those are the presenter's own
unsent words, and quoting the TEXT is what makes the answer checkable, exactly as PAM-11 quotes the
date.

`docs/decoded/alert-scheduler-filter-labels.md` already recorded the punctuation and said to reproduce
it verbatim — *"a full stop and a space before `text:`, and no closing question mark"* — and the test
asserts both, including `not.toContain('?')`, because a missing question mark is what a well-meaning
edit adds back.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

**high** · `missing-control` · reference byte **2,407,145**

```
removeScheduledAlert(e){bootbox.confirm("Are you sure you want to delete this alert by "+e.alert.n+". text: "+e.alert.txt,i=>{i&&this.appService.sendServerCommand("removeScheduledAlert",{scheduledAlertID:e._id})})}
```

**Ours:** ScheduledAlerts.svelte:243 (before) `<td><button type="button" onclick={() => remove(row.id)}>Remove</button></td>`,
calling `remove(id)` at ScheduledAlerts.svelte:158-165, which goes straight to the
`removeScheduledAlert` command. Grep over apps/room/src for `delete this alert` returned zero hits.
The server refuses correctly (`removeScheduledAlert` is presenter-gated and room-scoped, 404 on a
foreign row) — so the hole was never authorisation, only the absence of a question.

### SCH-02 — The repeat cell renders bare text; the reference draws a coloured pill, and its three class names had been explicitly left unread

**BUILT 2026-08-31.** `REPEAT_BADGE_CLASS` in `#lib/scheduled-alert-table.ts`, read at byte 2,406,323.

**This row exists because a previous decode said in as many words that it stopped here.**
`docs/decoded/alert-scheduler-filter-labels.md` decoded this table on 2026-08-15 and wrote: *"The
repeat `span` carries a three-way `ngClass` keyed on, in order: `"" === e.repeat || !e.repeat`,
`"daily" === e.repeat`, `"weekly" === e.repeat`. **The class NAMES are in the const table and were not
read; do not guess them.**"* They are not in the const table, which is why looking there found
nothing: Angular compiles a multi-key `ngClass` object literal into a shared pure-function factory
beside the template functions, and `mMe` is that factory.

**Red on "off" is the one nobody would have guessed.** A reader predicting a palette puts grey there.
Upstream spends its loudest colour on the alert that is NOT going to repeat — the state a presenter
most needs to pick out of a table of otherwise identical rows, because that one fires once and is then
gone.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

**medium** · `missing-behaviour` · reference byte **2,406,323**

```
const fMe=(t,n)=>n.sendOn,mMe=(t,n,e)=>({"text-bg-danger":t,"text-bg-info":n,"text-bg-warning":e});function gMe(t,n){1&t&&(d(0,"span",14),v(1,"no weekends"),u())}
```

**Ours:** ScheduledAlerts.svelte:236 (before) `{row.repeat || 'off'}` as bare text in the cell, with no
`<span>` at all — so const 13 `[1,"badge","rounded-pill",3,"ngClass"]` (byte 2,408,102) had no
counterpart either. The positional call is read at byte 2,406,725:
`z("ngClass",$a(9,mMe,""===e.repeat||!e.repeat,"daily"===e.repeat,"weekly"===e.repeat))`, which is what
makes the mapping unambiguous rather than inferred.

### SCH-03 — Two column headers are renamed and the fifth is empty; scope is absent, and the date cell is a `<td>` where upstream uses a row header

**BUILT 2026-08-31.** `Date / Time · Sender · Alert · Repeat · Actions`, `scope="col"` on all five, and
the date cell as `<th scope="row" class="alert-date-time-th">`.

**The empty header is the half that is not cosmetic.** A `<th></th>` is a column a screen reader
announces as nothing, and the cells under it are buttons that destroy things. `scope` is the
reference's own on both axes and is what tells a reader which header a cell belongs to; the date is a
row header upstream because in a table where the sender, the text and the repeat can all repeat, the
time is the only value that identifies the row.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

**medium** · `divergence` · reference byte **2,408,380**

```
d(7,"div",6)(8,"table",7)(9,"thead")(10,"tr")(11,"th",8),v(12,"Date / Time"),u(),d(13,"th",8),v(14,"Sender"),u(),d(15,"th",8),v(16,"Alert"),u(),d(17,"th",8),v(18,"Repeat"),u(),d(19,"th",8),v(20,"Actions"),u()()(),d(21,"tbody"),ht(22,_Me,16,13,"tr",9,fMe),u()()()
```

**Ours:** ScheduledAlerts.svelte:229 (before)
`<tr><th>Sends</th><th>By</th><th>Alert</th><th>Repeat</th><th></th></tr>` and
ScheduledAlerts.svelte:234 `<td>{shortDate(row.sendOn)}</td>`. Consts 8 `["scope","col"]` (byte
2,407,945) and 12 `["scope","row",1,"alert-date-time-th"]` (byte 2,408,063) had no counterpart
anywhere in the file.

### SCH-04 — The "no weekends" badge is an invented yellow; the reference's is `text-bg-secondary`, rounded, and `ms-1`

**BUILT 2026-08-31.** Const 14 is `[1,"badge","rounded-pill","text-bg-secondary","ms-1"]` at byte
2,408,141.

**A colour picked because it looked right is the shape `CLAUDE.md` names outright**, and this was one:
`background: #f0c040` appears nowhere in the bundle and nowhere else in this repository. Beside a
repeat pill that is now `text-bg-info`, a hand-mixed amber read as a third state rather than as a
qualifier on the second — which it is, being rendered only for a daily series.

The gate on it was already right and stays as it was: `"daily"===e.repeat&&e.ignoreWeekends`, not the
flag alone. The test covers the case that separates those two by giving row three `weekly` WITH
`ignoreWeekends` set.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

**low** · `invented-value` · reference byte **2,408,141**

```
[1,"badge","rounded-pill","text-bg-secondary","ms-1"],[1,"btn","btn-outline-danger","btn-sm","remove-scheduled-alert-btn",3,"click"],[1,"fas","fa-trash"]
```

**Ours:** ScheduledAlerts.svelte:240 (before) `<span class="badge">no weekends</span>`, with a scoped
rule at ScheduledAlerts.svelte:349-354 reading `padding: 0 0.3rem; border-radius: 3px; background:
#f0c040; font-size: 0.7rem`.

### SCH-05 — Remove has no icon and no button classes, and the two component styles the reference ships with this table are absent

**BUILT 2026-08-31.** `btn btn-outline-danger btn-sm remove-scheduled-alert-btn`, `<i class="fas
fa-trash">`, and the label with the capture's own surrounding spaces (`v(15," Remove ")`, written as
`{' Remove '}` per the idiom `AGENTS.md` records). The two rules are the reference's own, shipped in
the same `ɵcmp`.

**The one destructive control in the table looked like every other button in the pane**, which is what
made SCH-01's missing confirmation cost what it did — nothing about the control said it was the
dangerous one. `width: 88px` and `min-width: 150px` are not decoration either: they are what stops the
button reflowing and the date wrapping as rows arrive and are removed, in a table whose row count
changes under the reader.

`!important` is dropped because in a scoped sheet nothing is competing with these two, and
`font-weight: inherit` is added on the row header: a `<th>` is bold by default and this one is a
timestamp, not a heading a reader scans.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

**low** · `missing-control` · reference byte **2,409,000**

```
styles:[".remove-scheduled-alert-btn[_ngcontent-%COMP%]{width:88px!important}.alert-date-time-th[_ngcontent-%COMP%]{min-width:150px!important}"]
```

**Ours:** ScheduledAlerts.svelte:243 (before) `<button type="button" onclick={() => remove(row.id)}>Remove</button>`
— no `class`, no icon, and `remove-scheduled-alert-btn` / `alert-date-time-th` returned zero hits
across all of apps/room.

### SCH-06 — "See Scheduled Alerts" is offered unconditionally; the reference gates it on `scheduledAlerts.length > 0`

**MEASURED REFUSAL 2026-08-31, with the measurement here rather than at the code, because building it
would mean building the thing this pane deliberately does not do.** The gate is real —
`O(68, showSendLater && scheduledAlerts.length > 0 && hasAlertScheduler ? 68 : -1)` at byte 2,139,315,
transcribed into `PostAlertModal.svelte`'s own comment at line 606 — and upstream can afford it because
it FETCHES ON SESSION LOAD: `globals.sessData.hasAlertScheduler && this.send("getScheduledAlerts", null)`
at byte 1,009,797, so `globals.scheduledAlerts` has a length before anybody opens the composer.

**This pane fetches on request**, which its own comment states as the reference's shape for the
BUTTON (`manageScheduledAlerts()` is a click and not a load) and which `listScheduledAlerts` enforces
as a presenter-gated `query`. To gate the button on the count, the count would have to be fetched when
the composer opens — a presenter-gated round trip on every alert anybody starts writing, for a control
that answers "nothing is scheduled" a moment later anyway, and for a room's pending alerts, which the
remote module records as *"what a presenter intends to say and has not said yet."*

**Unblocked by** a decision to fetch the list on session load as upstream does — at which point the
gate is one term, and the empty state below it becomes unreachable rather than merely rare.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

**low** · `divergence` · reference byte **2,139,315**

```
O(68,e.showSendLater&&e.appService.globals.scheduledAlerts.length>0&&e.appService.globals.sessData.hasAlertScheduler?68:-1)
```

**Ours:** ScheduledAlerts.svelte:216-218 renders the manage toggle with no gate but `disabled` never
set, and `refresh()` is called only from `toggleManage()`. `pending` starts `[]` and is not asked for
until the button is pressed, so a length gate here would hide the button in exactly the state where
the answer is unknown rather than zero — a control that is absent because nothing has looked is worse
than one that opens onto "Nothing is scheduled."

### SCH-07 — The modal chrome — `modal-xl`, `table table-striped text-white`, the "Manage Scheduled Alerts" title and the Close footer — is not reproduced

**DELIBERATE DIVERGENCE 2026-08-31; the argument already lives in the component and is not restated
here.** `ScheduledAlerts.svelte`'s header records why the reference's two components are one here, and
`ScheduledAlertsTable.svelte`'s header records why drawing a row is not the part of that decision
being revisited. The chrome is what the merge costs: a pane embedded in `PostAlertModal`'s body cannot
carry a second modal's dialog, title bar and Close button, because there is no second modal.

`table-striped` and `text-white` go with it for a reason worth naming separately: both are Bootstrap
globals styling a table that is now inside a SCOPED sheet, and the room already runs two Bootstrap
generations on two surfaces (recorded in `todo-next.md`). Borrowing a global table skin into a scoped
component is how the row-striping in one modal starts depending on which generation loaded.

The two rules that are NOT chrome — `remove-scheduled-alert-btn` and `alert-date-time-th` — were built
rather than refused, and are SCH-05.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

**low** · `divergence` · reference byte **2,407,518**

```
consts:[["id","scheduledAlertsModal","tabindex","-1","aria-labelledby","scheduledAlertsModalLabel","aria-hidden","true",1,"modal","fade","text-white"],[1,"modal-dialog","modal-xl"],[1,"modal-content"],[1,"modal-header"],["id","scheduledAlertsModalLabel",1,"modal-title"],["type","button","data-bs-dismiss","modal","aria-label","Close",1,"btn-close","btn-close-white"],[1,"modal-body"],[1,"table","table-striped","text-white","w-100"]
```

**Ours:** `ScheduledAlertsTable.svelte` renders `<div class="scroll"><table>` with a scoped sheet, and
`ScheduledAlerts.svelte:225` renders the whole block inline inside `PostAlertModal`'s body. Note that
`PAM-06` in this document already closed the related half — the "See Scheduled Alerts" control and the
`#scheduledAlertsModal` id — as `already-built` under a documented rename, so this row is the STYLING
that the rename left behind, not the control.

---

## AvDevicePane.svelte

Read end to end on 2026-08-31 against the v4 bundle: `loadDevices` at bytes 2,162,037–2,165,010,
`onAudioDeviceChange` / `onVideoDeviceChange` / `submitNewDevices` / `setNewDevices` /
`getDeviceLabel` at 2,160,900–2,162,037, the presenter template functions `dDe` / `uDe` / `hDe` /
`pDe` / `fDe` / `mDe` / `gDe` / `_De` / `bDe` / `vDe` at 2,141,500–2,142,600, and
`app-session-control-modal`'s consts walked BY VALUE from byte 2,175,472 — entries 44–60 and 88–104
are this pane.

**Four differences, and this section deliberately does not restate the ModalHost ones.** SC-02, SC-03,
SC-09, SC-10, SC-11, SC-14, SC-15, SC-16 and SC-17 in the `ModalHost: session-control modal` section
above already cover the fabricated seed devices, the inert `audioDeviceID`, the Retry button, the
"Please connect…" fallbacks, the checkbox seeding, the non-presenter body, the Refresh disable and
spinner, the loading alert class, and the presenter gate. Every one was re-read here and none has
regressed; the markup matches consts 46–60 and 95–104 attribute for attribute, including the two
crossed-out icons and the `for`/`aria-label` pairs. What follows is what those rows did not reach:
the enumeration itself.

The connectivity / AV-test modal was read first, as instructed. `CONN-01` to `CONN-07` cover its tabs,
its title and its presenter gates; none of them touches this pane's device rules, and this pane is
rendered from BOTH modals (`ModalHost.svelte:5112` and `:5500`), which is why the rows are filed here
rather than under either modal.

### AVD-01 — `loadDevices` does not empty the lists first, so a Refresh after a device is unplugged keeps offering the device that has gone

**FIXED 2026-08-31.** `audioDevices = []` / `videoDevices = []` before the enumeration, which is where
the reference puts them: they are the first statement of its own `loadDevices`, byte 2,162,037.

**This is the same defect for the opposite gesture.** `if (nextAudio.length) audioDevices = nextAudio`
does the right thing for a member who plugs a device IN and exactly the wrong thing for one who pulls
a device OUT: the enumeration finds none, the assignment is skipped, and the pane keeps the previous
list — still selected, with the green `fa-check-circle` "Selected:" tick beside it. `AvDevicePane` is
where `audioDeviceID` is chosen and `audioCaptureConstraints` builds `deviceId: { exact: … }` from it
(`#lib/capture-settings.ts`), and `exact` is the one constraint shape that FAILS rather than
substituting — so the pane's confident display and the capture's refusal disagreed, with only the
capture being right.

**It also makes SC-10 reachable from a state it could not be reached from.** "Please connect audio
devices." was previously only ever the first frame; it is now the answer to unplugging one, which is
what makes that row true rather than merely correct.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

**medium** · `defect` · reference byte **2,162,037**

```
loadDevices(){var e=this;this.devicesLoading=!0,this.devicesLoadError="",this.audioDevicesList=[],this.videoDevicesList=[],
```

**Ours:** AvDevicePane.svelte:130-141 (before) — `if (nextAudio.length) { audioDevices = nextAudio; … }`
and the video twin, with no clearing anywhere in the function; `devicesLoadError` was set only when
BOTH lists came back empty, so a member with a working camera and no microphone got no message and a
stale microphone list. Asserted as source rather than driven, for the reason
`av-device-pane-contract.test.ts` already gives about `navigator.mediaDevices` under jsdom, and the
negative half is asserted too — the guarded-assignment shape is refused by pattern.

### AVD-02 — When the pane falls back to the first device it does not save that choice; the reference persists it

**FIXED 2026-08-31.** `resolveSelectedDevice` in `#lib/device-enumeration.ts` returns `fellBack`, and
the pane writes the preference only on that — which is the reference's `s ||`, byte 2,163,287.

**The select's `onchange` was the only writer, and a fallback is not a change event.** So the
"Selected:" line named one microphone while `capture.audioDeviceId` still named the one that had gone;
the pane looked like it had resolved the problem and the capture kept failing on it, with `exact`, for
the reason AVD-01 gives. This is the same class of defect `#lib/capture-settings.ts` was written for —
a control whose value nothing reads — one level in: a value the control never wrote.

**Written only when it fell back.** `onPreferenceChange` is a server write, so re-saving the
already-saved value would be one request per Refresh press that changes nothing, and the reference's
`s ||` is precisely that guard. Both directions are asserted, and both mutations were seen red — the
write removed, and the write made unconditional.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

**medium** · `defect` · reference byte **2,163,287**

```
e.audioDevicesList.length>0){const s=e.audioDevicesList.some(r=>r.deviceId===e.appService.globals.audioDeviceID);e.currentAudioDevice=s?e.appService.globals.audioDeviceID:e.audioDevicesList[0].deviceId,s||(e.appService.globals.audioDeviceID=e.currentAudioDevice,e.appService.localstorage.set("audioDeviceID",e.currentAudioDevice),P(`Set default audio device: ${e.currentAudioDevice}`))}
```

**Ours:** AvDevicePane.svelte:132-140 (before) assigned `currentAudioDevice = nextAudio[0].deviceId`
and `currentVideoDevice = nextVideo[0].deviceId` with no call to `onPreferenceChange` on either path;
the only call sites were the two `onchange` handlers at AvDevicePane.svelte:243 and :268.

### AVD-03 — The failure message has four arms; the reference has five, and the missing one is `NotSupportedError`

**BUILT 2026-08-31.** `deviceEnumerationMessage` in `#lib/device-enumeration.ts`, all five arms, each
with its own test.

**The missing arm is the one nobody would notice missing.** `NotSupportedError` is what `getUserMedia`
throws where the API exists but the requested capture does not, so it fell through to `Error loading
devices: <whatever the browser said>` — a sentence with no next step in it, where all four of its
siblings name one. Every error this pane can raise is TRANSIENT, which is the argument SC-09 already
makes at the Retry button sitting inside the alert; an arm that produces a sentence nobody can act on
is that argument's blind spot.

Our pre-flight guard (`if (!navigator.mediaDevices?.enumerateDevices)`) already used that exact
sentence and stays — it is an addition the reference does not have, and it now agrees with the arm
rather than being the only place the sentence appears.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

**low** · `missing-behaviour` · reference byte **2,164,760**

```
e.devicesLoadError="NotFoundError"===i.name?"No audio or video devices found. Please connect a microphone and/or camera.":"NotAllowedError"===i.name?"Permission denied. Please allow access to your microphone and camera in your browser settings.":"NotSupportedError"===i.name?"Your browser does not support device enumeration. Please use a modern browser.":"SecurityError"===i.name?"Security error. Please ensure the page is loaded over HTTPS.":`Error loading devices: ${i.message||"Unknown error"}`
```

**Ours:** AvDevicePane.svelte:152-161 (before) — a four-way ternary on `NotFoundError`,
`NotAllowedError`, `SecurityError` and the default, casting the caught value with `error as
DOMException` (which is an assertion about a value nothing checked; the module reads `name` off an
`instanceof Error` instead and falls through otherwise).

### AVD-04 — The dropdown shows a BLANK row for an unlabelled device upstream; the reference builds the label it needs and then throws it away

**DELIBERATE DIVERGENCE 2026-08-31 — matching the reference here would reproduce a defect, and the
measurement is recorded at `labelFor` in `#lib/device-enumeration.ts`.**

The reference computes the label, byte 2,162,800:

`let r=s.label;(null==r||""===r)&&(r=\`${s.kind} (${s.deviceId.substring(0,8)}...)\`)`

and then never uses it in the dropdown. Read the rest of that `forEach`: `r` feeds the `"default - "`
duplicate test and a `console.log`, and the value pushed onto `audioDevicesList` is the RAW `s`. The
option template renders `e.label` (`Ne(" ",e.label," ")`, byte 2,141,984). So a device the browser has
not labelled — which is every device before permission is granted, and the exact state this pane opens
in — appears as a blank entry that can be selected and names nothing.

**A dropdown of blank rows is a control that cannot be operated**, and the reference had already
written the sentence that fixes it. Using it is one line, and it is the same judgement `selectedDeviceLabel`
records for the "Selected:" line: this pane deliberately enumerates late, so the unlabelled state is
normal here in a way it is not upstream.

One addition of ours goes with it: an empty `deviceId` yields `unknown` rather than `substring`'s
bare `...`, which names nothing either.

*This row was ADDED after this document was committed — a second reading on 2026-08-31, not part of
the two-verifier pass the tables above describe, and therefore deliberately outside them.*

**low** · `divergence` · reference byte **2,162,800**

```
o.forEach(s=>{let r=s.label;(null==r||""===r)&&(r=`${s.kind} (${s.deviceId.substring(0,8)}...)`);const a="default"===s.deviceId||"communications"===s.deviceId;let l=!1;if(r.toLowerCase().startsWith("default - ")){const h=r.substring(10);l=o.some(f=>f.kind===s.kind&&f.label===h&&f.deviceId!==s.deviceId)}const c=a||l;"audioinput"!=s.kind||c?"videoinput"==s.kind&&!c&&e.videoDevicesList.push(s):e.audioDevicesList.push(s)
```

**Ours:** the synthesised label was already used — AvDevicePane.svelte:126-131 (before) had it inline
in `toOption` — but nothing recorded that upstream discards it, so the divergence read as a
transcription and would have been "corrected" back by the next reader diffing against `e.label`. It is
`#lib/device-enumeration.ts` now, with the measurement, and `device-enumeration-contract.test.ts`
executes both the synthesis and the alias rule the same `forEach` carries — including the case a
prefix-only reading of `"default - "` gets wrong, which is a machine with one microphone labelled
`Default - Headset` and no plain `Headset` beside it.
