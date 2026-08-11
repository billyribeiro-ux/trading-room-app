# Changelog

Newest first. Every entry carries a **date and local time (EDT)**, and every time is either a git
commit timestamp or a measurement taken at that moment — none is estimated. Where a change landed in
a commit whose message describes something else, the commit is named anyway, because that is how it
will be found later.

**How this is maintained:** an entry is appended every time a piece of work is finished, not at the
end of a session. A change with no entry is a change the next person has to reverse-engineer from
`git log`.

**Branching: there isn't any, and that is deliberate.** Work is committed and pushed **straight to
`main`** — confirmed by the owner 2026-08-09. No feature branches, no PRs. The consequence is worth
stating once, here, rather than rediscovering it: **`main` auto-deploys**, so a push is a production
release, not a reviewable step. Two things follow, and both are conventions of this file:

1. **Every entry says whether it has runtime impact** — whether the push changed what the site
   serves, or only documentation, comments and tests. That is the first thing anyone reading back
   through an incident wants to know.
2. **Verification happens before the push, not after**, because there is no review gate to catch it.
   Each entry records what was run and what could not be.

---

## 2026-08-10

### 11:06 — Room TODO entry 7 CLOSED: pre-canned polls were reaching every member's browser

**Runtime impact: yes, in the room** — the page payload shrinks for members, and stops carrying
something it should never have carried. Files: `apps/room/src/routes/+page.server.ts`,
`src/lib/page-load-contract.test.ts`.

The loader selected `savedPolls` and returned them to **every role**. A member never opens the poll
panel, so they never SAW the list — but their browser was handed **every unsent draft a presenter
had written**, in the SSR HTML and in `__sveltekit` data, on every page load.

**Invisible is not private.** It reaches the browser, any cache in front of it, and any HAR a user
attaches to a support ticket. This is the same class as the `password_hash` that was spread into the
page payload on 2026-08-04 — and that one also looked harmless right up until somebody printed the
keys.

Gated on **`connectedUser.isP`**, the membership's own answer and the same predicate the poll panel
renders from. Not on `role`, which gets it wrong in both directions: a Participant granted presenter
rights in the controller would be refused, and a Presenter who had them withheld would be served.
That distinction is exactly the bug `canEditNotes` had before it was fixed the same way.

The empty list is the ternary's **first** branch, so a member's page load now makes **no database
read for polls at all** — the value cannot leak back through a refactor that returns a query result
unconditionally.

**It also pre-empts entry 5**, which is what that TODO row was written to warn about:
`GET /api/v1/rooms/{id}/saved-polls` refuses non-staff with 403, so the API cutover would have
started failing member page loads. An empty list is what that route already agrees with.

Three tests pin it, and the negative control confirms they bite: removing the gate fails two of
them. The two writes needed nothing — `savePoll` and `deleteSavedPoll` were already staff-gated,
which is what `require_staff` enforces.

Verified: **546 tests across 58 files** (543 → 546), `svelte-check` **0 errors, 0 warnings**, format
gate green, node-adapter build clean.

### 11:01 — The share-quality measurement, written down rather than rushed

**No code change** — one document. New: `apps/room/docs/MEASURE-SHARE-QUALITY.md`.

An attempt at the row 6 / row 8 measurement was made and abandoned, for a reason worth recording:
**`chrome://webrtc-internals` lists every page in the BROWSER, not one app.** The window had six
`simplertrading.com` tabs and two `chatgpt.com` tabs open, each contributing its own peer
connections, and the panel that was expanded turned out to be Simpler Trading's — a dead connection
stuck at `ICE: new => new => new`, nothing to do with this app. Ours was there, correctly named
`chat.tradingroom.app/?room=1001`, four boxes along.

Rather than have the owner close tabs they are actively using, the procedure is now a document:
which tabs to close and in what order, why `webrtc-internals` must be opened **before** the share
starts (it logs from the moment it opens, so opening it first captures negotiation and the bitrate
ramp instead of joining midway), and how the second session works — an **incognito window joining as
a GUEST**, name and email, no second account and no logging out.

It also records the two things that make the reading meaningful and are easy to get wrong: a second
session must actually be **receiving**, or the encoder has no reason to spend bits; and the shared
surface should be a **chart**, since the doc's 3841 kbps was measured on candlesticks and 13px text
and a desktop wallpaper is not comparable to it.

And it says what each possible result would MEAN — bitrate up with `limitation: none` closes rows 6
and 8; `qualityLimitationReason: bandwidth` makes row 8 a real conversation and row 6 actively
harmful; a drop in `framesPerSecond` is `contentHint='detail'` trading smoothness for sharpness,
which is the caveat recorded when it shipped and the point at which it should be reconsidered rather
than defended.

**Why it needs a human at all**, stated so nobody re-litigates it: `getDisplayMedia` requires a real
user gesture and an operating-system screen-picker dialog. Browser automation can drive a page; it
cannot click an OS dialog.

### 10:51 — Item R, the share half: `contentHint = 'detail'`, and why rows 6 and 8 were NOT taken

**Runtime impact: yes, in the room** — one property on the captured screen track. Files:
`apps/room/src/routes/+page.svelte`, `src/lib/recording-codec.test.ts`, and
`scripts/collect-share-stats.js` for the measurement that is still owed.

`streaming-choices.md` row 2, and the reasoning is that document's own wire measurement rather than
a preference. Presenter-to-member, 12 seconds with a member attached: full 1920x1080 leaves the
presenter, arrives at the member, paints at 1920x1080, VP9 end to end, **zero dropped frames** — and
`qualityLimitationReason: none` with cumulative `bandwidth: 0, cpu: 0`. The encoder spent **zero
seconds constrained**.

**So a soft-looking share was never a limit to lift.** Nothing throttles it; nothing asks it to spend
more. With `encodings: undefined` there is no floor, no ceiling and no content hint, so libvpx's own
heuristic decides — and that heuristic is tuned for camera video, where blurring a moving background
is free. For candlesticks, gridlines and 13px quote text it is exactly the wrong trade. One property
tells it otherwise, on the screen path only; the camera path keeps the default, where it is correct.

**Two caveats, kept rather than buried.** Its cost is **unmeasured** — it may raise the bitrate, and
under genuine congestion it degrades frame rate instead of resolution, so a share could end up
sharper and choppier. And it is a **divergence**: the capture sets this hint on its alert-overlay
canvas stream and never on the raw screen track. Taken anyway because the measurement shows the
headroom is real and unused, and because reverting is deleting one line.

**Rows 6 and 8 were deliberately not taken.** Row 6 (raising the 1920 cap for Retina) makes every
member pay bandwidth and decode CPU for pixels most of their screens cannot show, and diverges from
a constraint that is byte-identical to the capture. Row 8 (an explicit `maxBitrate`/`minBitrate`)
puts a floor under everyone's bandwidth, and a floor is precisely what hurts the member on the worst
connection. Both change what every viewer receives, so both wait for the measurement — unlike row 2,
which asks the encoder to use headroom already proven to exist.

**And the measurement I cannot take myself, stated plainly.** `getDisplayMedia` requires a real user
gesture and an OS screen-picker dialog. Browser automation can drive a page; it cannot click an
operating-system dialog. So the presenter-side `getStats()` read needs a human sharing a real
desktop with a second session receiving — `apps/room/scripts/collect-share-stats.js` collects it in
one paste and downloads the JSON. Worth recording why the second session is not an obstacle: it is
an **incognito window joining as a GUEST** with a name and an email. No second account, no logging
out of anything.

Verified: **543 tests across 58 files** (541 → 543), `svelte-check` **0 errors, 0 warnings**, format
gate green, node-adapter build clean.

### 12:56 — Item R, the recorder half: VP9 at 8 Mbps instead of the browser's guess

**Runtime impact: yes, in the room** — recordings change codec and bitrate. New:
`apps/room/src/lib/recording-codec.ts` (+ 10 tests); `+page.svelte`'s `startRecording` wired to it.

**The research the owner remembered was already in this repository**: `apps/room/docs/streaming-choices.md`,
written 2026-08-05, a measured and evidence-tagged ranking of ten options — byte-identical to the
copy in `new-room`, so there was nothing to pull. The earlier "not found" result was about the
IMPLEMENTATION, and that distinction is the whole of this entry.

**The recorder was `new MediaRecorder(recordedStream)` — no options at all.** No codec, no bitrate.
So the browser chose both, at roughly 2.5 Mbps, and row 4's measurement says what that costs on
realistic chart content (34 lines of 13px monospace, 120 animated candlesticks, 1080p30):

| codec | cap 2 Mbps | cap 8 Mbps | cap 16 Mbps |
| --- | ---: | ---: | ---: |
| **VP9 (webm)** | 1429 | **3841** | **6414** |
| AV1 (webm) | 1928 | 3778 | 3802 |
| H.264 (mp4) | 1582 | 2033 | 1990 |
| HEVC (mp4) | 1238 | 1723 | 1626 |

**Only VP9 keeps scaling.** Everything else saturates and ignores a higher cap, so for 1080p text a
~2 Mbps ceiling is a quality ceiling you cannot buy your way out of. The detail was available and
simply never asked for.

**On the owner's MP4 request, honestly.** MP4 and maximum sharpness are in direct tension and the
measurement is why — `.webm` does not open in QuickTime, while mp4/H.264 saturates near 2 Mbps. The
instruction was "the very best without sacrificing performance", so **quality wins the ordering**:
VP9, then AV1, then VP8, and mp4 only when nothing better is supported — which on **Safari is
immediately**, since it produces `video/mp4` natively. A Safari presenter therefore gets an MP4 with
nothing special done, and a Chrome presenter gets the sharpest file the machine can make. Making MP4
universal *without* losing ~1.8 Mbps of detail is server-side remux — row 10, needing the
transcoding workers the deployment plan defers. Demoting VP9 to avoid a conversion nobody has asked
for yet would be the wrong trade, and it is recorded rather than quietly made.

**8 Mbps, not 12, and that is the performance half of the instruction.** Row 4's own warning:
*"not bandwidth-free for the presenter's CPU. A second 1080p encode competes with the live encoder,
and on a loaded machine that can drop frames on the share members are watching."* The recording is
for the presenter; the live share is for everyone. So it takes the measured 3841 kbps at 8 Mbps and
declines to chase the extra 2573 kbps a 16 Mbps cap would allow.

An unsupported `mimeType` makes `new MediaRecorder` **throw**, so nothing-supported yields
`undefined` and the browser's default — a recording at the old quality beats a recording that never
starts. Ten tests pin the ordering, the Safari path, the throw-avoidance and the bitrate, with
`isSupported` injected so none of it rests on a manual check in one browser.

**Three rows remain, and they all need the same measurement**: row 2 `contentHint='detail'` (the
doc's strongest remaining candidate — the wire shows full resolution arriving with `bandwidth: 0,
cpu: 0`, so nothing is throttling and the only lever left is telling the encoder the content is
text), row 6 raising the 1920 cap for Retina, and row 8 an explicit `maxBitrate`. All three are
settled by one thing: **a presenter sharing a REAL desktop with a member attached, reading
`outbound-rtp` from `getStats()` before and after each change.** Headless `getDisplayMedia` returns
Chrome's synthetic gradient, which compresses too easily to show any difference — which is why the
doc's own 525 kbps figure is not the real number and why these rows are not being changed blind.

Verified: **541 tests across 58 files** (531 → 541), `svelte-check` **0 errors, 0 warnings**, format
gate green, node-adapter build clean.

### 12:43 — Item R: searched the two reference folders, and the MP4/quality work is not in them

**No code change** — a read-only search and its honest result. `TODO.md` item **R** rewritten from a
placeholder into a record of where I looked; item **P** updated with what the owner's pull-only rule
means for it.

The owner granted permission to pull files **from** `new-room-control` and `new-room` into this
repository, never the other way. So the first task for R was to find what that work actually did
rather than re-derive it. **It is not in either folder.**

- `diff -rq apps/room/src ~/Desktop/new-room/src` → **6 differing files, and every difference is
  work done in THIS repo today**: the `inert` modal fix, the connectivity test, the media-grant
  newline fix, `env.ts`. The only file unique to theirs is `handoff-redemption.test.ts`, the
  single-use guard deliberately removed on 08-07. **Our room is ahead of that folder, not behind
  it** — there is nothing there to pull.
- `MediaRecorder` appears in both trees **exactly once**, in `ModalHost`'s mic test. Neither has a
  room recorder.
- Every `recording` hit in `new-room-control/src` is a **settings surface** — `room-config.ts`,
  `room-settings-schema.ts`, the dont-touch block — the same `wired: false` entries already here.
- Every `ffmpeg` / `transcode` hit in both is **documentation or captured evidence**, never
  implementation.

So the memory is either of a discussion rather than an implementation, or the code lives somewhere
outside the two folders. **The owner needs to say which**, because the alternative is building it
from first principles and presenting the result as a match — the specific thing the house rules
forbid. The row now records the search so the next session does not repeat it.

What is genuinely here to start from: `streaming-choices.md` measured VP9 screen share at
**3841 kbps** on realistic chart content; `setPreferredLayers` is implemented in `services/media`,
deliberately beyond the capture, so per-consumer layer choice already exists; and `useH264`,
`useVP9`, `useHQVideo`, `hideRecs` and "Disable download button for Recordings for users" are all in
the settings schema with `wired: false` — the surfaces exist, the pipeline does not.

**Item P is now blocked by definition rather than by preference.** It needs `services/**` promoted
*to* `new-room-control`, and that direction is exactly the one the owner has prohibited. Recorded as
an owner action.

### 12:21 — TODO item K CLOSED: the stats export writes all nine of the reference's columns

**No runtime impact until deployed** — a new table, two write points and a rewritten export. Item
**K** is removed from `TODO.md`. New: migration `0007-room-sessions.js`,
`lib/server/room-visits.ts` (+ 7 tests), `lib/humanize-duration.ts`.

The reference's `exportStatsToCSV` writes nine columns, read verbatim from its own bundle in
`dumps/export-controls-1786287657298.json`:

```
Name, Email, [Phone,] IP, In, Out, Duration, isMobile, Browser
```

Six of them came from its per-visit `statXrefs` records, and this application had no equivalent:
`stats` is **one row per PERSON**, keyed on `lastLoginAt`, which cannot answer when somebody
arrived, when they left, or how long they stayed. So the export wrote three columns and the rest was
recorded as an honest gap rather than filled with blanks that would claim we collect data we do not.

**`room_sessions` records one row per ARRIVAL** — which is what an *xref* row plainly is. A member
who enters four times in a day is four rows, and that is what makes Duration a real number rather
than an average of nothing.

**The detail that settled the design: an open visit is faithful, not broken.** The reference's own
writer defaults `outMStr` to `"N/A"` and computes `dur` only when both times exist — so a row for
somebody still in the room renders `N/A, N/A` in its file too. Ours does the same, which meant the
feature could ship complete without waiting on a reliable "left" signal.

Written at the only place it can be: the moment the controller mints a handoff, at **both** doors —
owner launch and guest join. That request is the only one that sees the IP and the user agent, since
the room application runs behind a proxy on another host and sees neither the browser's original
address nor our account context.

**Name and email are copied into the row rather than only referenced**, and that is deliberate: a
guest has no membership at all, and a member later removed or renamed must not silently rewrite
visits that already happened. A stats export is evidence of who was present; joining live rows would
make last month's report change when somebody edits their profile.

`recordVisit` never throws into its caller. A stats row failing to write must not stop somebody
entering a room they paid for — a lost row is a gap in a report, a thrown error is a member staring
at an error page.

**The user-agent parser is small on purpose, and its ORDER is the whole thing.** Edge and Opera both
carry `Chrome` in their strings, and Chrome carries `Safari`, so the most specific token has to win
or every browser reads as Chrome — which looks right, because Chrome is the common case, and is
wrong for everyone else. Also handled: an Android **tablet** omits the `Mobile` token a phone
carries, so a naive `/Mobile/` test reports every Android tablet as a desktop, in a product built
explicitly for tablets. Both are pinned by tests. `isMobile` and `browser` are treated as **labels a
visitor supplied**, never as security inputs; nothing decides anything from them.

`humanizeDuration` reproduces moment's `relativeTime` defaults — "a few seconds", "an hour" — because
the reference calls `moment(out).from(in, true)`, and matching the thresholds is what makes our file
read the same as theirs rather than merely similar. It lives outside `$lib/server` because both
halves need it and SvelteKit refuses a `$lib/server` import from a component; duplicating the
thresholds is how two files quietly disagree about what an hour is.

**And the contract test had a hole worth naming.** `export-format-contract.test.ts` exists precisely
because these formats were once invented — its own header says a `Last login` column *"the reference
never had"* was the giveaway. It pinned filenames and CRLF and **not the stats header**, which is why
a three-column version survived until now. Four assertions added: both phone variants of the
nine-column header, the absence of `Last login`, one row per visit rather than per person, and the
`N/A` for an open one.

Verified: **657 tests across 59 files** (646 → 657), `svelte-check` **0 errors, 0 warnings**, format
gate green, `vite build` clean. `svelte-kit sync` was needed once — the loader's new `visits` key is
invisible to the page until Kit regenerates its types.

### 12:10 — TODO item C CLOSED: `push_tokens_json` has a writer, and the mobile app has a brief

**No runtime impact until deployed** — a new public endpoint nothing calls yet, plus migration 0006.
Item **C** is removed from `TODO.md`. New: `routes/api/mobile/pair/+server.ts`,
`lib/server/mobile-pairing.ts` (+ 11 tests), `db/migrations/0006-mobile-pair-attempts.js`,
`mobile-app/PROMPT.md`.

The column has existed since the schema was written and **nothing had ever appended to it**, because
the endpoint a device would call did not exist. So the FCM client, the fan-out and the manage-page
controls were all built against a list that could only ever be empty.

`POST /api/mobile/pair` takes room + email + PIN + FCM token, verifies, appends the token and
**consumes the PIN**. It is `/api/` rather than `/internal/` because a phone that has never paired
holds no shared secret — that is what pairing is for.

**Which makes a six-digit PIN the credential on a public endpoint, so two things carry the weight:**

- **Single use.** Consumed on success. Without it, a PIN read over someone's shoulder stays valid
  for days — `ptrMobileAppExpirePairCodeDays` sets the window.
- **Five failures destroy the code.** A million combinations, five guesses, and then the thing being
  attacked no longer exists. A member who mistypes five times asks for another; one click.

**The counter is a column, not a rate limiter, and that is the interesting decision.** The obvious
answer is a limiter — and it is the wrong one here, because this controller runs **serverless on
Vercel**: an in-process count lives and dies with one instance and shares nothing with the next. It
would look like protection and provide almost none. Migration 0006 adds
`room_users.mobile_pair_attempts`, following the precedent `login-attempts.ts` already set.

Failures are counted **only against a live code**. Incrementing on an expired or exhausted one would
let anyone run the counter up on a member who is not currently pairing, so their *next* code would
start part-spent.

Room and email are required alongside the PIN because the reference's own pair URL carries both —
`…/addUser/<publicId>/?sec=…&email=__userEmail__&name=__userName__` — so an attacker needs a room
code and a member's address, not just six digits swept across every room.

Every failure returns the same 403 with no detail. Wrong room, unknown email, expired, wrong PIN,
exhausted — one answer, because distinguishing them turns the endpoint into a way to discover which
email addresses are members of which room. The reason goes to the log, where the audience is us; the
**email is logged and the PIN is not**, since knowing which six digits were tried helps nobody and
writes a live credential into the log.

Ten devices per member, oldest evicted, and re-pairing the same device **replaces** its entry rather
than adding one — a reinstall is the common case and must not fill the array with duplicates of one
phone.

**`svelte-check` caught a real error the tests could not.** The query was written against
`roomUsers.email`, and `room_users` has no such column — a membership is a join row carrying room,
account and role, while the identity lives once on `users`. Every test in that file exercises the
pure half, so all 646 passed while the database query was wrong. It now joins through `users`. That
is the argument for running the type gate on a `.ts` change rather than trusting a green suite.

**And `mobile-app/PROMPT.md`** — the folder and brief for the app's own session, as the owner asked.
It fixes the wire contract so a future session cannot redesign it to suit the client, lists what is
already built and tested, and puts §5's open questions where they cannot be skipped. The first of
those decides the whole project: **does the app carry video, or only alerts?** Every captured control
is notification-related and no capture shows a mobile media path — an alert receiver is a small app
and a media client is not, so the framework choice deliberately waits on that answer rather than
being made first and regretted.

Verified: **646 tests across 58 files** (635 → 646), `svelte-check` **0 errors, 0 warnings**, format
gate green, `vite build` clean with the new route present in the output.

### 11:53 — TODO item N CLOSED: the connectivity test now tests THIS deployment

**Runtime impact: yes, in the room** — the troubleshooter's "Network Test" changes what it measures.
Item **N** is removed from `TODO.md`. Files: `apps/room/src/routes/+page.svelte`,
`src/lib/components/ModalHost.svelte`, new `src/lib/connectivity-test-contract.test.ts`.

The test ran against Google's public STUN servers only, which made every result misleading in a way
a user could not detect: a green tick said nothing about whether `media.tradingroom.app` was
reachable, and a red one blamed the user's firewall for infrastructure we do not run.

The room already had the right values — `/api/media/grant` returns this deployment's ICE servers on
every mint — but `+page.svelte` held them in a `let` inside `onMount`, reachable only by the media
session. They are now component-level `$state.raw` (raw because the array is REPLACED on each grant
and never mutated, so deep proxying would cost something and buy nothing) and passed to `ModalHost`
as a prop.

**The decision worth recording: when the deployment's servers are available they are used ALONE.**
Appending the public STUN entries "just in case" is the obvious thing to do and it would reintroduce
the same defect pointing the other way — a passing `stun` tick could have come from Google while
ours was unreachable, and nothing in the UI would distinguish them. A result is only worth showing
if it is about the infrastructure the user is actually trying to reach.

The public servers survive as a **labelled fallback** for the window before the media socket has
opened, when we have nothing of our own to offer. The modal now says which of the two ran — *"Tested
against this room's own media servers"* or *"Tested against public STUN only … Join the room, then
run it again"* — and only after a run, so it reports fact rather than intent. "STUN passed" is a
different claim in each case and a support conversation should not have to guess which one it is
reading.

`turn: 'unconfigured'` is unchanged and still correct: `MEDIA_TURN_URLS`/`MEDIA_TURN_SECRET` are
unset, so the minted list carries STUN only. Saying "check your network or firewall" for a relay
nobody configured blames the user for our own missing setting.

**Pinned by seven contract tests**, because all three decisions are invisible once made. The sharpest
asserts structurally that the public servers appear only on the fallback branch and are never
concatenated onto the deployment list. Another guards the thing that already shipped once and must
never return: the reference's `turn:flash.protradingroom.com` with `ptrUser`/`ptr123`, which opened
two authenticated relay allocations against a third party's host and leaked our users' IP addresses
to it on every run.

**One of those tests was wrong first, and the fix is the interesting part.** It asserted the TURN
host was absent from the file and failed — because the comment above `runWebRTCTest` quotes the
removed configuration verbatim, which is exactly what makes that comment worth having. Asserting on
raw text would have forced a future maintainer to delete the explanation to get the suite green. It
now strips comments before checking the live code, and separately asserts the explanation is still
there.

Verified: **531 tests across 57 files** (524 → 531), `svelte-check` **0 errors, 0 warnings**, the
Svelte autofixer reports **zero issues** on `ModalHost.svelte`, format gate green, and the
node-adapter build — the artefact that ships — is clean.

### 11:53 — New TODO item R: MP4 recording downloads and member screenshare quality

Raised by the owner: both were built in the other folder/repo and need re-establishing here.

Recorded as a **placeholder for a review, not a description of a defect** — nothing has been measured
on this side yet, and the first task is to find what that repo actually did rather than re-derive it
from first principles and call the result a match.

What is already known here, so the review starts from evidence: `docs/streaming-choices.md` measured
VP9 screen share at **3841 kbps** on realistic chart content; `setPreferredLayers` is implemented in
`services/media` (deliberately beyond the capture, precisely so a viewer is not forced to decode a
background tab's top layer); and `useH264`, `useVP9`, `useHQVideo`, `hideRecs` and "Disable download
button for Recordings for users" all exist in the settings schema with `wired: false` — so the
surfaces exist while the pipeline does not.

### 11:39 — TODO item L CLOSED: the Hetzner box has a firewall at last

**Runtime impact: yes, on production.** `ufw` is active and enabled at boot on `87.99.154.155`,
which serves both `media.tradingroom.app` and `chat.tradingroom.app`. Item **L** is removed from
`TODO.md`.

**Every rule came from a measured listener. Nothing was assumed.** `ss -tlnp` / `ss -ulnp` first:

| bound publicly | rule |
| --- | --- |
| `sshd` :22 | `22/tcp` |
| `caddy` :80 | `80/tcp` — also ACME renewals |
| `caddy` :443 | `443/tcp` |
| **`caddy` UDP :443** | **`443/udp`** |
| mediasoup RTC, `40000-40199` from `media.env` | `40000:40199/udp` **and** `/tcp` |

**The UDP 443 rule is the one that would have been missed.** Caddy listens on UDP 443 for HTTP/3;
a TCP-only ruleset looks complete, passes an HTTPS check, and silently breaks QUIC for every client
that negotiates it. It is in the `ss -ulnp` output and nowhere in any document.

Everything else — the SFU's signalling on `127.0.0.1:4443`, the room on `127.0.0.1:3000`, Caddy's
admin API on `127.0.0.1:2019`, resolved, chrony — is **loopback-bound**, so it needed no rule and is
now unreachable regardless.

**The Docker trap was checked rather than assumed.** When Docker *publishes* a port its DNAT chain
jumps ahead of ufw's INPUT rules and the firewall is decorative — a well-known way to believe a box
is protected when it is not. Measured: the media container runs `NetworkMode=host` with `ports=[]`,
and both `DOCKER-USER` and the nat `DOCKER` chain are empty. No bypass exists here, so ufw genuinely
governs the SFU.

**A dead-man switch was armed before anything changed.** `DEFAULT_INPUT_POLICY` is `DROP`, so one
missing rule locks SSH out of a box with no console access. `systemd-run --on-active=10min ufw
--force disable`, detached from the session, would have undone it with nobody needing to get in. It
was cancelled only after the verification below, and the firewall was then confirmed still active a
minute past the original deadline.

**Verified from outside, and the proof is a pair of ports:**

| | before | after |
| --- | --- | --- |
| 22 / 80 / 443 | succeeded | succeeded |
| **40000, 40199** (allowed) | refused | **refused** — still reaching the host; mediasoup binds on demand |
| **40500** (outside the range) | refused | **dropped, no answer** |
| **2019** (Caddy admin) | — | **dropped, no answer** |

"Refused" means the packet reached the host and nothing was listening; a timeout means the firewall
ate it. That flip on 40500 — and only on 40500, while 40199 next door still answers — is what
distinguishes a working ruleset from a hopeful one.

Also verified: a **new** SSH connection succeeds (the lockout test), all three hostnames respond, and
`pnpm smoke` passes **9 of 9** both immediately after enabling and again after the deadline passed.

The 2026-08-09 finding that opened this item is reproduced exactly in the "before" column: TCP 40000
**and 40500** both refused, `ufw inactive`, iptables INPUT `ACCEPT`. Nothing was wrongly exposed at
the time — but the next service to bind `0.0.0.0` would have been public the second it started, and
now it will not be.

### 07:52 — A collector for the six gaps I cannot reach, and it is EXECUTED rather than just written

**No runtime impact** — two scripts and six TODO rows. New:
`apps/controller/scripts/collect-manage-gaps.js`, `collect-manage-gaps.smoke.mjs`.

Paste-and-go for `TODO.md` gaps **5, 8, 9, 10, 11 and 12** — the manage-page ones that
`collect-create-new.js` does not touch. It downloads its own JSON; no terminal command, no
follow-up.

**It fixes the two defects that spoiled the last capture,** both recorded in `TODO.md` and both
silent failures:

- **Truncation.** The previous collector stopped its node array at index 900 and cut every tab's
  `html` at 120,000 characters — 35.6% of the Settings pane unmeasured. This one has no cap, and
  writes any limit it *does* hit into `gaps[]`, so a short capture can never again look complete.
- **The DON'T TOUCH block.** The previous one "logged the step and serialised the wrong element",
  leaving 49 settings verified only against an older dump. This one counts fields **before and
  after** clicking the disclosure and refuses to serialise if nothing changed — an empty result is
  reported as a failure instead of written out as evidence.

**Safety is structural, not a promise.** Every click goes through `safeClick()`, which refuses any
element whose text or attributes match a denylist (delete, upload, play, stop, send, save, submit,
post, ban, kick, clear, reset, launch, archive, pay, invite, email) and records the refusal. The only
clicks are on tab strips and disclosures — controls whose entire function is to reveal something
already present. It issues **no** network request of any kind. Credential-shaped field values are
masked before they reach the file.

**And it was actually run.** `node --check` only proves a file parses, and this gets pasted into a
live system once — a script that throws halfway writes a partial capture that looks complete.
`collect-manage-gaps.smoke.mjs` executes the real file against a dependency-free DOM stub:

```
SMOKE PASSED
  reached download: 21.2 KB of valid JSON
  settings fields captured: 3
  DON'T TOUCH disclosure clicked: true
  honest gaps recorded: 4
  secret redacted: true
```

That run caught **three problems, two of them mine and one real**:

1. A `const description` I had glued into `constdescription` while replacing a stray non-ASCII
   identifier. **`node --check` passed it** — it is legal as an implicit global — and it would have
   thrown at runtime under `'use strict'`, on the first click, on the live system. Only executing it
   found that.
2. My stub's `body` lacked `querySelectorAll`, which every real body has. My bug — but it exposed
   that the collector falls back to capturing the whole document when `.tab-pane.active` is absent,
   which the output now states as `paneSelector: "body (fallback)"`.
3. A four-second wait shorter than the collector's own deliberate sleeps, reported as "never reached
   the download step". The harness polls for 30s now instead of guessing.

`user rows captured: 0` in that output is a limit of the stub — it has no descendant-selector
support, so `table tr` matches nothing — and both the code and the printed line say so, because a
number that looks like a failure and is not is how a real failure gets ignored later.

**Attempted and abandoned, recorded rather than hidden:** verifying it in a real browser needed the
file served over `http://127.0.0.1`, and that navigation was declined — correctly, since the
standing rule is that nothing runs on local ports for this project. The server was stopped and the
port confirmed closed within the minute.

### 07:38 — The other two items: the collector verified ready, and a staging checklist for item Q

**No runtime impact** — one new document and two TODO rows. New:
`integrations/wordpress/STAGING-TEST.md`.

**Evidence gap 1 (`createNew()`) — prepared, and it is the owner's to run.** The function lives in
`/public/dist/app.min.js` on the LIVE original; nothing in this repository can reach it. What I could
do was make it a single paste and prove the script is safe to paste:
`node --check` clean, and re-read end to end — it performs **one `fetch` GET** of same-origin scripts
and the only `.click()` in the file is on an anchor it creates to trigger the download. It touches no
page control, submits nothing and posts nothing. Its eight targets cover gaps **1, 2, 3, 6 and 7** in
a single run, plus an attempt at 4. The TODO row now says so, rather than leaving the next reader to
re-audit it before daring to run it.

**Item Q — the missing half is a real WordPress, so it is now a checklist rather than a research
task.** `STAGING-TEST.md` is nine numbered steps with expected results and the exact log lines to
look for. Two of them are the point:

- **§5, the cache trap.** Copy the button's `href` and confirm it contains **no `jwt=` token**, then
  open it logged-out and confirm you get the WordPress login rather than the room. If a token is
  ever in that href, every visitor served the cached page enters as whoever loaded it first. The
  design prevents it; this is how you check the design survived.
- **§6, cancelling the subscription.** Cancel in WooCommerce, do not log out, click again — expect a
  refusal with `reason: "no-match"`. **This is the only step that proves entitlement is live rather
  than decorative; every other step passes with the gate wide open.** Item Q closes when §6 passes,
  and not before.

It also warns to leave the second and third filters blank during the test, because filters are
OR-ed — a second one would admit a visitor who matches only it, and the membership gate would never
be exercised at all.

### 07:35 — Item 1, the `ptr_clone` rename: the runtime role is renamed, and the job was 4× smaller than recorded

**No runtime impact** — a new forward-only migration nothing has applied yet, plus documentation.
Files: `services/api/migrations/0009_rename_runtime_roles.sql`,
`ops/postgres-runtime-role-hardening.md`, `apps/room/TODO.md`.

**Migration 0009 renames `ptr_clone_app` → `tradingroom_app`**, forward-only because the five applied
migrations that name the old role cannot be touched: editing one changes its sqlx checksum and every
existing database refuses to migrate, which has already happened on this project to a legacy database
that can never be migrated forward again. `0001_baseline.sql` is pinned twice besides.

Proven against a real PostgreSQL 16.13, all four paths — absent → no-op; present → renamed; run
twice → clean; **both names present → refuses**, because choosing one silently would decide which
role owns the grants, and that is an operator's call.

**A trap the entry did not record, and it would have failed on every database.** The OWNER role
cannot be renamed by a migration at all:

```
connected AS the role     ERROR:  session user cannot be renamed
from another session      ALTER ROLE
```

Migrations authenticate as `ptr_clone`, so an in-migration owner rename is impossible, not merely
risky. Measured with a throwaway role rather than assumed from documentation. It is now an operator
step with its own runbook.

**The scope in the entry was wrong by a factor of four, and that is the more useful finding.** It
read as a 570-occurrence find-and-replace. Measured: **594 outside the evidence dump, and ~445 of
them — three quarters — must keep the old name permanently.** 383 are in the checksum-pinned
`0001_baseline.sql` alone; the rest are the other applied migrations, the provisioning script that
must keep creating `ptr_clone_app` so those migrations can apply, the SHA-256-pinned evidence
verifier, and historical documents whose provenance rewriting would falsify. RLS policies need
nothing at all — policy targets are stored by OID, not by name.

Treating this as a text substitution is precisely how a database stops migrating, so the breakdown
is now a table in the runbook rather than a sentence in a TODO.

**What is left, and why it is not done here.** ~150 live occurrences, all inside `services/**`:
connection defaults, the release-attestation expected values, and the role-name assertions in
`tests/migrations.rs` (43) and `tests/tenancy.rs` (11). `services/**` is a mirror of
`new-room-control`; the entry itself says to do this "at the source repository, as its own dedicated
change with nothing else moving"; that tree has already diverged twice — the second time with
`new-room-control` serving the unsafe copy — and every one of those assertions is a runtime check
that needs a provisioned cluster with both roles to verify. Doing it from this side would deepen a
divergence already open as item **P**. Recorded rather than half-done.

Verified: `cargo check -p tradingroom-api --all-targets --features testing` clean, room format gate
green.

### 07:22 — The WordPress plugin is EXECUTED: `php -l` clean, and a PHP-minted token verified here

**No runtime impact** — closes the executable half of `TODO.md` item **Q**. New:
`integrations/wordpress/tradingroom-sso/tests/mint-golden-token.php`, `tests/golden-token.json`.

Docker Hub was reachable again (it and `git push` were failing from the same network fault an hour
earlier), so the thing that could not be done, was done.

**`php -l` under PHP 8.3.33: no syntax errors.**

**And a real cross-language proof, which is the part that matters.** `tests/mint-golden-token.php`
loads the plugin with the three WordPress functions it touches at load time stubbed, then mints a
token through the plugin's **own** `tradingroom_sso_entitlements()` and `tradingroom_sso_mint()`.
The result is committed as `golden-token.json` and pinned by four new tests: the bytes a real
`hash_hmac` and a real `json_encode` produced are run through the verifier a customer's login will
hit. Everything else in that file *describes* what PHP would emit; this is PHP emitting it.

**It caught the encoding hazard in the act.** The harness deliberately feeds the entitlement path a
duplicate and a blank — `['gold-annual', 'gold-annual', '  ']` — and the minted payload reads
`"memberships":["gold-annual"]`. A JSON **array**, de-duplicated and trimmed. Without the plugin's
`array_values( array_unique( … ) )` wrapper, `array_filter` would have left a gap in the keys and
PHP would have emitted `{"0":"gold-annual"}`, which our reader treats as nothing asserted — failing
closed, but baffling to debug. That wrapper is now proven load-bearing rather than argued to be.

The vector is also proven to be a real credential rather than a bypass: it is refused once stale
(`expired`) and refused against another room (`wrong-room`). Negative control: changing a single
signature byte fails four of the sixteen tests; restoring it passes.

Both commands run in a container, so **no local PHP is required** to reproduce or to regenerate the
vector after a change to the minting path — the command is in the script's header and in the
README.

**What is left of item Q, stated precisely rather than closed early:** the harness stubs WordPress;
it does not boot it. Nothing here has exercised `wc_memberships_get_user_active_memberships`,
`wcs_get_users_subscriptions`, the settings screen or the cached-page path. Before a customer uses
this it needs a staging site: enter as a paid member, then **cancel the subscription and prove the
next entry is refused**. That needs a real WordPress, not a build machine — so item Q is narrowed to
exactly that, and the README's Status section now says which half is proven.

Verified: **635 tests across 57 files** (631 → 635), `svelte-check` **0 errors, 0 warnings**, format
gate green.

### 07:09 — Full audit: three broken gates found and fixed, one of them mine

**No runtime impact** — gates, formatting and one stale contract list. Files: the room's
`.prettierignore`, the controller's `package.json` and `scripts/verify-room-settings-schema.mjs`,
`src/lib/sso-boundary.test.ts`, plus 29 files reformatted.

Everything was re-run from scratch — both apps, the Rust workspace, production. **Three real
defects, and two false alarms that were my own tooling.**

---

**1. A stale contract list — and it was mine, from four commits ago.**
`scripts/verify-room-settings-schema.mjs` carries its own `EXPECTED_WIRED_SETTINGS`, a **third**
copy of the wired set beside the generator's and the generated file's. Phase 2 and 3 wired six
settings and left this one at 35.

Nothing failed, because **this gate cannot run in this repository** — it shells out to the generator,
which reads `evidence-dumps/`, which is not here (`ENOENT: no such file or directory …
evidence-dumps/login-page/manage`). It is the strongest of the three checks — it regenerates the
schema twice and compares bytes — and it is the one that would have gone red on the first machine
that had the dump.

Fixed to 41 entries, and the note above it corrected. More usefully, `sso-boundary.test.ts` now
**reads that script and asserts its list equals the schema's wired set**, so an unrunnable gate is
mirrored by one vitest can execute. Negative control: removing a single entry fails the new test;
restoring it passes.

That note already said *"a count that appears twice is a count that goes wrong once."* It appeared
three times, and went wrong a third time. It now goes wrong loudly.

**2. The room's format gate had regressed — 33 files.** It was closed green on 2026-08-04 by
`TODO.md` 3d. **29 of the 33 were `.vercel/output/**`** — minified chunks and generated JSON from an
adapter-vercel build that did not exist when that entry was written, so the directory was never
ignored. `.vercel` added beside `.svelte-kit` and `build`, following the file's own stated rule
("SOURCE gets formatted, GENERATED gets ignored"). The remaining 4 were real and are formatted. The
five `.svelte` files deliberately excluded for whitespace-geometry reasons were **not** touched.

**3. The controller's format gate could never pass at all.** Its script globbed
`.github/**/*.{yaml,yml}`, but `.github/` lives at the repository root, not inside `apps/controller`
— so prettier exited on `No files matching the pattern were found` regardless of the code. The stale
glob is removed and 25 files formatted (6 from this SSO work, 3 from earlier today, ~16
pre-existing).

---

**Two false alarms, both my own tooling, reported here rather than as findings:**

- **`pnpm smoke` failed 6 of 9**, including `media /health: fetch failed`. An immediate re-run passed
  **9 of 9**, and probing the same three hosts from the Hetzner box returned 200/403/200. It was this
  machine's transient network — the same fault that was failing `git push` and the Docker Hub pull in
  the same minutes. **Production was never down.** Checking from a second network before reporting is
  the only reason that is not in here as an outage.
- **`cargo check --workspace --all-targets` reported 12 errors** in `tradingroom-api`'s tests. Every
  one was a missing `*_for_tests` helper — which are behind the `testing` feature, deliberately not
  default ("in a production build the connection stays private, which is fence #2 of the tenancy
  kernel"). With `--features testing`: clean. **My invocation was wrong; the crate is fine.**

---

**Verified after every fix:** controller **631 tests / 57 files**, `svelte-check` 0/0, `vite build`
clean, format gate green. Room **524 tests / 56 files**, `svelte-check` 0/0, node-adapter build
clean, format gate green — "All matched files use Prettier code style!" for the first time since it
regressed. Rust: `tradingroom-api` checks clean with its feature, `clippy -D warnings` clean on
`tradingroom-media`. `pnpm smoke` **9 of 9** against production.

### 06:57 — WordPress SSO, phase 4: the plugin, and an honest limit on it

**No runtime impact.** New: `integrations/wordpress/tradingroom-sso/tradingroom-sso.php`,
`integrations/wordpress/README.md`, `apps/controller/src/lib/server/sso-wordpress-contract.test.ts`.

The customer-side half. A logged-in member clicks "Enter Room"; the plugin asks WooCommerce what
they currently hold — active memberships, active subscriptions, purchased products — signs it with
that room's key, and redirects to `/sso/<code>?jwt=…`.

**The design decision that matters most: the token is minted on CLICK, never at render.** A token
embedded in rendered HTML is stored by the page cache, the CDN and every "copy of this page" plugin,
and then served to **every subsequent visitor** — each of whom would enter the room as whoever
loaded the page first. So the shortcode links to the plugin's own endpoint and the mint happens when
that link is followed. On a cached WordPress site the alternative is not a performance issue, it is
a total authentication failure, and it is the single easiest thing to get wrong here.

**The key is never a shortcode attribute.** The reference's own shortcode carried `key=''`, which
puts a room credential into post content — visible to every editor, every revision, every export.
Ours keeps keys in site options, masked on the settings screen, and a masked row left untouched
keeps its stored value so an admin can edit the controller URL without re-entering every key.

Also: entry requires a logged-in user (and sends them to log in and come back rather than losing the
click); an unknown room is refused rather than redirected to, which is what makes the one outbound
`wp_redirect` safe; and three filters plus an action are exposed for sites whose entitlements do not
live in WooCommerce at all.

**Two PHP hazards, both now pinned by tests.** `wp_json_encode` escapes forward slashes by default —
`https://x` becomes `https:\/\/x` — which is the classic "works in Postman, fails from WordPress"
bug when a verifier re-serialises the payload before checking the signature. Ours cannot hit it,
because the signature is computed over the payload **segment as presented**, never over a re-encoding
of the decoded object; the test exists to keep that invariant through future refactors. And
`json_encode` turns a non-sequential PHP array into `{}` rather than `[]`, which is why the plugin's
`array_values()` wrapper is load-bearing — our reader treats a non-array as nothing asserted, which
fails **closed**, but the failure would be baffling without the note.

**The honest limit, and it is a real one: the plugin has never been executed.** PHP is not installed
here and Docker Hub was unreachable (`context deadline exceeded` pulling `php:8.3-cli`), so neither
`php -l` nor a real mint was possible. The 12 contract tests prove **our side honours the contract we
wrote down** — they do not prove the PHP produces those bytes. Recorded as `TODO.md` item **Q** with
the one command that closes it, and stated in the README's Status section rather than left for a
customer to discover. **It should not ship to a customer before `php -l` and a staging install with
a real subscription cancelled mid-test.**

Verified: **629 tests across 57 files pass** (617 → 629), `svelte-check` **0 errors, 0 warnings**.

**All four phases are done.** `ssoJWTSecret` and the three entitlement filters are wired and
enforced; `tokenExpiresIn` bounds staleness; the room application was never touched. What remains
before a customer uses it is item **Q** and a decision on the default expiry (`1h` is in place).

### 06:50 — WordPress SSO, phase 3: `tokenExpiresIn` becomes the room's own staleness ceiling

**No runtime impact until deployed.** Files: `src/lib/server/sso-token.ts` (+ tests),
`(public)/sso/[code]/+server.ts`, `sso-boundary.test.ts`, the generator and the generated schema.

Phase 1 enforced one hour for every room. That is now the **default**, and a room owner narrows it
with the setting the reference already provides: `tokenExpiresIn`, whose help reads *"A string like
'1d', '1h', '12h" etc…"* and whose captured value in the reference tenant is exactly `"1d"`.

`resolveMaxTokenAge()` accepts `s`/`m`/`h`/`d`, bare digits as seconds, and tolerates spacing and
case. **Every path returns a usable number** — this runs on the entry path, so a typo in a settings
box must not take a room offline. It reports how it got there (`default` · `configured` · `clamped` ·
`unparsed`) and the route logs anything that is not a clean read, because a settings box that
silently does nothing is the exact complaint the `wired` flag exists to prevent.

**The clamp, at 24 hours.** An owner typing `365d` would turn the payment gate into a decoration.
The ceiling is not arbitrary: `1d` is the reference's own captured value, so a day is demonstrably a
value the original expected people to use, and the boundary itself is honoured rather than clamped.
Over-long values are capped and logged rather than refused — refusing would lock an owner out of
their own room over a text box, while honouring it silently would make the gate meaningless.

**`verifySsoToken` takes an options object now.** There are two independent knobs and a third would
eventually arrive; `verifySsoToken(secret, code, token, 3600)` reads as a timestamp at a glance and
would be a silent bug on the entry path. The twenty existing call sites were migrated by walking
balanced parentheses rather than by regex, because `NOW` also appears inside the claim literals and
a regex would have rewritten those too.

**`tokenExpiresIn` is wired — 40 → 41 of 269.** Generator, generated file and the boundary test's
count-lock all moved together, which is what that lock is for.

**A second test of mine broke on formatting rather than behaviour**, and the fix is the same lesson
as phase 2's: it pinned the complete single-line `verifySsoToken(...)` expression and failed the
moment the options object was added. Rewritten to assert the call **prefix** — that `shortCode`
reaches the verifier — which is the behaviour worth pinning. A test that fails when a line wraps
teaches people to stop reading tests.

Verified: **617 tests across 56 files pass** (610 → 617), `svelte-check` **0 errors, 0 warnings**.

### 06:46 — WordPress SSO, phase 2: the door, and the entitlement rule

**No runtime impact until deployed** — new route and helper. Files:
`apps/controller/src/routes/(public)/sso/[code]/+server.ts`,
`src/lib/server/sso-entitlement.ts` (+ tests), `src/lib/sso-boundary.test.ts`,
`scripts/extract-manage-schema.mjs`, `src/lib/room-settings-schema.ts`.

`GET /sso/<shortCode>?jwt=<HS256 JWT>` — verify, evaluate entitlement, mint the **existing** guest
handoff, redirect into the room. Roughly 60 lines of decision surrounded by the reasons for each.

**Why it mints a GUEST token, and why that is the property to defend.** A WordPress visitor has no
account here, and inventing one would be inventing authority. `type: 'guest'` with an empty `id` is
precisely true, and the room then resolves their role from its own membership, failing closed to
`member`. So **entitlement is delegated; authority is not** — if a customer's WordPress is
compromised, the blast radius is people entering a room they did not pay for, not somebody arriving
as staff. `sso-boundary.test.ts` asserts the route calls `guestHandoffToken` and never
`siteHandoffToken`.

**The entitlement semantics come from the reference's help text, and they are surprising.**
`allowedProducts` and `allowedPerms` both read *"Either a product or membership, or both must
match"* — an explicit disjunction. So configured filters are **OR-ed**: filling in a second family
to be stricter actually **widens** access. That runs against the usual fail-closed instinct, and it
is implemented as the evidence states rather than as instinct prefers, with the ambiguity named in
the module docs: the same sentence is repeated verbatim on `allowedPerms`, where "a product or
membership" does not mention permissions at all, so it reads like copied help text and the dump
cannot settle it. `explainEntitlementDecision()` exists so the Manage page can warn an owner in the
place they are typing rather than leaving them to discover it from who turns up.

The lapsed-payment path needs no special signal: WooCommerce simply stops reporting the plan, the
token arrives with nothing in it, and no filter matches. **Absence is the signal**, which means we
cannot drift out of step with their billing state machine.

**Ordering, and one deliberate inconsistency.** The verifier checks the signature before reading any
claim, because reporting on unauthenticated bytes is how a verifier becomes an oracle. The route
does the opposite — room-state before signature — and says why: whether a room is open is not a
secret (the guest login already reveals it to anyone holding the code), so there is no oracle to
protect and an early refusal avoids an HMAC per probe.

Every refusal returns the same words. `loginErrorURL` (the customer's own "your subscription has
lapsed" page) takes precedence, then `loginErrorMsg`, which the room-login page already uses — so
both doors refuse consistently. Admissions are logged too, with the filter entry that opened the
door: *"on what basis was this person let in"* is the question asked months later, and it cannot be
answered from a log of failures only.

**Wiring, and a generated file edited by hand — deliberately, and with a lock.** Five settings now
have a consumer: `ssoJWTSecret`, `allowedMemberships`, `allowedProducts`, `allowedPerms`,
`loginErrorURL`. **35 → 40 of 269 wired.** The flag lives in `scripts/extract-manage-schema.mjs`'s
`WIRED_SETTINGS`, which was updated properly — but **`pnpm schema:extract` cannot run in this
repository**: it reads `evidence-dumps/login-page/manage`, which is not here (the same absence that
blocked `verify-home-fidelity.mjs` on 2026-08-09). So the identical transformation was applied by
hand to the generated file, which its own header forbids.

That is only acceptable with something enforcing it, so `sso-boundary.test.ts` reads the generator's
contract number and asserts the generated file's wired count and header text agree with it. Flip a
flag in one without the other and it fails. It is the difference between "edited a generated file
once, carefully" and "the generated file is now hand-maintained by accident".

**One test was wrong and the code was right** — worth recording, because it is the failure mode the
house rules name. The ordering test used `indexOf('evaluateEntitlement')` and failed; it had matched
the *import* statements at the top of the file, where the entitlement module happens to be imported
before the token one. The route was correct throughout. Fixed by anchoring on call syntax, with the
mistake written into the test so the next person does not repeat it.

Verified: **610 tests across 56 files pass**, `svelte-check` **0 errors, 0 warnings**. The full suite
was run rather than a targeted one because the wired count changed in a generated file many tests
read. `svelte-kit sync` was needed first — a new route has no `./$types` until Kit generates them.

### 06:40 — WordPress SSO, phase 1: the verifier for a customer-minted token

**No runtime impact** — new module and its tests; nothing routes to it yet. Files:
`apps/controller/src/lib/server/sso-token.ts`, `sso-token.test.ts`.

**The goal, in one line:** a customer running WordPress + WooCommerce (Simpler Trading is the worked
example) embeds a room short code on their site, and *their* billing system decides whether a member
may enter — payment up to date or not.

**The evidence this is built on, not inferred.** `room-settings-schema.ts:67`, the help text the
reference itself renders for `ssoJWTSecret`:

> "Use this key in combination with the **WordPRess plugin**, or other JWT SSO, make it hard to
> getss, like: `5081b73a690762e2526bc1fef3c46eedf1ec8832`"

with `ssoHost`, `allowPWLoginWithSSO` and `tokenExpiresIn` (captured `"1d"`) beside it, and the
owner's own shortcode carrying `key=''` and `mode='urlv3'` — a URL-borne JWT.

**The architecture decision, and it removes most of the work.** Reading the room's `/session` route
first paid for itself: *"The controller owns identity… Either way the controller mints a token and
redirects here."* So WordPress SSO is a **third door on the controller**, beside owner-launch and
guest-login — the customer's site redirects to us, we verify and evaluate entitlement, then mint the
**existing** handoff through `room-handoff.ts`. Three consequences:

- **the room application needs no change at all** — it still trusts exactly one credential;
- **`ssoJWTSecret` never leaves the controller process.** It is not in `ROOM_VISIBLE_SETTINGS` and is
  never serialised into page data, which matters because the room puts its config into SSR HTML on
  every load;
- **one signer, one verifier.** A second implementation of the handoff is how two implementations
  drift apart.

**What is transcribed and what is ours, stated rather than blurred.** Transcribed: that the
mechanism exists, and its key. **Ours:** the claim set. The reference's captured token is
`{ name, email, id, type, issued, iat, exp }` — byte-for-byte from `ptr1.json` — and carries **no
membership, product or permission field**, so the dump cannot say how `allowedMemberships` /
`allowedProducts` / `allowedPerms` were evaluated: either their plugin checked before minting, or
their server called back to WordPress. Rather than invent a mechanism and present it as recovered,
the entitlements ride **inside** the signed token — no callback, no shared network path, no
WooCommerce credential on our side. Recorded as a deliberate divergence in the module docs.

**The check that makes the payment gate real, and the reason it exists.** The customer controls
`exp`; we enforce `SSO_MAX_TOKEN_AGE_SECONDS = 3600` on top. Without it a site minting year-long
tokens — which is exactly what the reference's own handoff does, at **360 days** — would turn "is
this subscription paid?" into "was it paid at some point last year". One hour survives a slow
checkout or a link opened in a new tab, and makes a cancellation bite within a trading session
rather than a trading week. Its test is named for the job it does.

Also strict, each one an allow rather than a reject: `HS256` pinned (`alg: none` is the textbook
forgery), constant-time comparison over the **presented** bytes rather than a re-serialisation,
`exp` required, future-dated `iat` refused, and **`room` required and matched against the URL** —
per-room keys already make cross-room replay hard, but a customer who reuses one key across two
rooms would otherwise hand every token holder entry to both. Binding costs nothing and does not
depend on the customer's key hygiene. Rejections are opaque to the caller and detailed in the log,
because naming the failed check turns the endpoint into an oracle for probing a customer's key.

Two integrator-friendliness decisions, both free: entitlements are accepted as a JSON array **or** a
comma-separated string, because `json_encode` of a term list gives one and `implode(',', $slugs)`
gives the other; and email is lower-cased once, here, since it is the join key to a membership row.

`generateSsoSecret()` emits **32 bytes** of hex rather than the reference example's 20 — this is an
HMAC-SHA256 key, and matching a screenshot is not a reason to hand a customer less entropy than the
algorithm's block size. The value is opaque to the plugin, which only copies it.

Verified: **17 tests pass**, `svelte-check` **0 errors, 0 warnings**. No migration was needed —
`ssoJWTSecret` is already one of the 269 keys in `room_settings.settings_json`.

**Not yet wired.** `wired: true` is flipped only when a consumer exists, and the consumer is the
route in phase 2. The flag lives in `scripts/extract-manage-schema.mjs`'s `WIRED_SETTINGS` and the
schema is regenerated — hand-editing the generated file would be undone by the next `schema:extract`.

### 06:01 — The liveness fix is DEPLOYED and proven against production

**Runtime impact: yes.** `tradingroom-media` on `87.99.154.155` was rebuilt and restarted at
09:56:21 UTC (05:56 EDT). It now runs the build containing `a11883c`.

**How it was verified, in order.** Nothing below is inferred:

1. **The build carries the fix.** The image is distroless and has no shell, so the binary was copied
   out with `docker create` + `docker cp` and read directly: both new log strings
   (`no response to heartbeat`, `peer stopped answering`) are present. Build log: zero errors.
   Image 71.8 MB, unchanged in size from the previous one.
2. **The service came back healthy** — `systemctl is-active` → `active`, worker started, admission
   still `require-grant` against the same public key.
3. **`pnpm smoke` → `All 9 checks passed.`**
4. **A real ghost was reclaimed, on the deployed build.** A probe minted a genuine Ed25519 grant on
   the box (so the signing key never left it), opened `/ws` over raw TLS with a hand-written
   upgrade — deliberately not a WebSocket library, because one would auto-pong and hide the very
   thing being measured — and then answered nothing at all:

   ```
   09:58:11.183  peer connected                  room=tra-liveness-probe user=Legacy(424242)
   09:59:11.185  peer stopped answering; closing its socket and releasing its slot  silent_for_secs=60
   09:59:11.185  room emptied; router closed     room=tra-liveness-probe
   09:59:11.185  peer disconnected
   probe:        server closed us after 60.0 s
   ```

   `/health` moved `rooms:1,peers:2` → `rooms:2,peers:3` while it was connected and back to
   `rooms:1,peers:2` sixty seconds later. **The router was closed and the slot released**, which is
   the whole point: before today that socket would have been counted forever.
5. **The live peers were NOT evicted.** The owner's two sockets stayed connected throughout the
   probe and are still connected now. That is the second test's property holding in production.

**And the restart settled the open question from 05:42.** Both peers **reconnected 1.4 seconds
after the service came back** (09:56:22, same room, same user). A ghost cannot reconnect — so those
two sockets were live browser tabs, idle and producing nothing, not abandoned ones. My 05:09 claim
was wrong in a different way than I feared: they were real sessions, but "the media plane is
carrying real peers" was still overstated, because no media was flowing on either and the earlier
06:58–07:09 session was the only one that ever produced audio or video.

Probe artefacts (`/tmp/liveness-probe.mjs`, its log, the extracted binary, the build log) were
removed from the box afterwards.

**Still open, and deliberately not done here:** `services/**` is a mirror, so this change now
diverges from `new-room-control`'s copy and must be promoted upstream and re-sealed
(`apps/room/TODO.md` entry 2, a drift that has already happened twice). That folder is under a
standing instruction not to be edited from this repository, so it needs the owner's call rather than
a quiet sync. `TODO.md` item **P** is narrowed to that alone.

### 05:42 — "Two real peers" investigated: the SFU cannot tell a live peer from an abandoned socket

**No runtime impact yet — the fix is committed (`a11883c`) and NOT deployed.** The box still runs
the 2026-08-09 build. Deploying needs a ~15-minute rebuild on the box and a service restart.

At 05:09 I wrote that `media.tradingroom.app` showed `rooms:1, peers:2` and called it "two real
peers connected to a real room… the media plane is carrying real peers." **That claim was not
supported by anything I had measured.** What follows is what the box actually says.

**The journal — both peers are the same person, and neither has produced anything.**

```
07:22:47Z  peer 64840acf… room=tra-1001 user=Some(Legacy(1)) role=Some(Presenter)  peer connected
07:40:33Z  peer 87c1c059… room=tra-1001 user=Some(Legacy(1)) role=Some(Presenter)  peer connected
```

No `peer is producing` line for either, and no disconnect. The session before them
(06:58:41–07:09:17) *did* produce audio and video and then disconnected cleanly — so the media path
works and disconnect detection works when a socket closes properly.

**The sockets — alive at the TCP layer, silent at the application layer.** `ss -tni` at 09:30:06Z,
against the two client connections from `216.49.131.90`:

| socket | `lastsnd`/`lastrcv` | connected at | `lastack` |
| --- | --- | --- | --- |
| `:5147` | **7,639,280 ms — 2h 07m 19s** | 07:22:47Z | 5.4 s |
| `:5425` | **6,573,063 ms — 1h 49m 33s** | 07:40:33Z | 14.5 s |

Both idle times match their connect timestamps **to the second**: not one application byte has
crossed either socket since the moment it was established. `lastack` in seconds means the client's
TCP stack is still answering keepalives, so these are most likely two idle browser tabs rather than
ghosts. **That is the point — the server cannot tell, and neither can I.** An idle tab and an
abandoned socket are byte-for-byte identical to this service.

**Why that is a defect and not a cosmetic stat.** Reading `serve_peer`, the loop selects on exactly
three things — shutdown, notifications, inbound frames — and **no timer**. Every per-peer resource
is RAII on that task: `LiveConnection` (which holds both the global `max_peers` slot *and* the
per-identity count, capped at `MAX_CONNECTIONS_PER_VERIFIED_USER = 4`), `HubMembership`, and the
`Session` holding the room's router. The task ends only when the socket produces an event. A client
that disappears **without a clean close** — closed laptop, dropped network, killed browser process,
phone leaving coverage — produces none, so:

- the room never empties and its router stays open;
- `/health` reports participants who are gone;
- and after four such sockets **that user is refused entry to their own room with a 503 while the
  service reports itself healthy** — precisely the failure `Config::max_peers`' own documentation
  says the ceiling exists to prevent. Both current sockets belong to `Legacy(1)`, so that user is
  already holding **2 of their 4** slots on connections that have said nothing for two hours.

TCP keepalive is not a fallback. It is the kernel's policy on a socket this process never sees — it
talks to Caddy over loopback, which never fails on its own — and the box's own settings
(`tcp_keepalive_time 7200`, `intvl 75`, `probes 9`, read from `sysctl`) would take **over two
hours** to conclude anything.

**The fix — a heartbeat arm in the peer loop.** Ping every `peer_ping_interval`; close the peer when
it has said nothing for `peer_silence_limit`. Any inbound frame counts as proof of life, which is
why that assignment sits above the `match` rather than in the `Pong` arm. Defaults 20 s and 60 s —
three missed pings — both now `Config` fields (`MEDIA_PEER_PING_SECONDS`,
`MEDIA_PEER_SILENCE_SECONDS`) validated at startup, so a zero interval or a silence limit below the
ping interval fails the boot instead of the first peer.

**No client change is required.** Browsers answer a WebSocket ping automatically at the protocol
level (RFC 6455 §5.5.2), so the pong arrives without a line of room code.

Two tests, and the pair is the point:

- `a_peer_that_stops_answering_is_closed_and_its_slot_released` — connects a socket and then never
  polls it, which is a faithful reproduction: a tungstenite client answers pings only while its
  stream is polled, so an unpolled socket is exactly a peer whose TCP stack is fine and whose
  application is not.
- `a_peer_that_keeps_answering_is_never_evicted` — **a heartbeat that evicts live sockets would be a
  worse defect than the leak**, and would look like an intermittent network fault rather than a
  server decision.

**Negative control, because a test that passes either way is worthless:** with the reclaim branch
disabled, the first test fails `left: 1, right: 0`. It measures the mechanism.

Verified: **114 lib + 11 bin tests pass**, `cargo clippy -p tradingroom-media --all-targets -D
warnings` clean, `cargo fmt` applied. Scope was the changed crate only, per the standing rule.

**Two honest notes.** The **rust-analyzer MCP was not available** in this session — absent from the
tool registry entirely, not merely unresponsive — so this used `cargo check`/`clippy`, which the
house rules allow only with this disclosure. And `services/**` is a **mirror**: this change makes
this copy diverge from `new-room-control`'s, which is `apps/room/TODO.md` entry 2 and has already
bitten twice. It must be promoted upstream and re-sealed rather than left to drift.

### 05:14 — The old SFU is DELETED. It was Lightsail all along, and the 04:56 entry below was my error

**No runtime impact on this repository** — no code changed. Real-world impact: an AWS resource that
had been billing since 2026-08-02 no longer exists.

**What was deleted,** read from the Lightsail API rather than inferred from anything:

| | |
| --- | --- |
| Instance | `mediasoup-test-01`, us-east-1a, Ubuntu |
| Bundle | `small_3_0` — **$12.00/month**, 2 vCPU, 2 GB RAM, 60 GB SSD, 3 TB transfer |
| Created | 2026-08-02 12:54:31 -0400 — so **$12/month for 8 days** |
| Static IP | `mediasoup-test-ip` = `34.195.170.147`, released |
| Alarms | `mediasoup-cpu-high`, `mediasoup-status-check-failed`, both removed with it |

`aws lightsail get-instances` now returns empty across all eleven regions, as do `get-static-ips`,
`get-disks` and `get-instance-snapshots`. EC2, EBS and S3 were already empty everywhere.

**The order was stop → verify → delete, and the verify step is the point.** After stopping,
`https://media.34-195-170-147.sslip.io/health` was unreachable while `media.tradingroom.app` still
answered — **with `rooms:1, peers:2`, the first real peers ever observed on the Hetzner SFU** — and
`node scripts/smoke.mjs` printed `All 9 checks passed`. Only then was it deleted. Stopping is
reversible; if anything had depended on that machine, smoke would have said so while
`start-instance` was still an option. Smoke passed 9/9 again after deletion.

Releasing the static IP is a separate call and is easy to miss: a Lightsail static IP is **free
while attached to a running instance and billed once it is not**, and `delete-instance` detaches it.

---

**Now the correction, and it is mine.** The 04:56 entry below says *"it is EC2 in us-east-1, not
Lightsail — the owner was right that no Lightsail instance was ever deployed."* **That was wrong.**
`mediasoup-test-01` existed, in Lightsail, exactly as `MEDIASOUP-DEPLOYMENT-PLAN.md` had described
it since Stage 1. The entry is left in place rather than rewritten, because it was read.

Both pieces of evidence I used were read correctly and neither supports the conclusion I drew:

- **`whois` → Amazon, and reverse DNS → `ec2-34-195-170-147.compute-1.amazonaws.com`.** Lightsail
  instances *are* EC2 instances underneath, so a Lightsail IP carries exactly that rDNS form.
  **Reverse DNS establishes the vendor and the region. It cannot distinguish the product.**
- **`aws ec2 describe-instances` empty in every region.** This felt like confirmation and was the
  opposite: **Lightsail resources never appear in the EC2 API**, so an empty EC2 sweep is precisely
  what a Lightsail-only account returns. The sweep that seemed to prove the finding was the
  strongest available sign that the wrong service was being queried.

One command settles it, and it is the service's own:

```console
$ aws lightsail get-instances --region us-east-1 --query 'instances[].name' --output text
mediasoup-test-01
```

**This is the house rule in `CLAUDE.md` almost word for word — "rule out my own tooling before
reporting a single failure", and "if it cannot be found, it does NOT get invented".** I inferred a
product from a hostname format and then told the owner they were right, which is worse than being
wrong quietly: it endorsed a conclusion with authority it had not earned. The honest answer at 04:56
was *"the vendor is Amazon and the region is us-east-1; which product it is cannot be determined
without account access."* The blocker was always account access, and that is what it stayed.

What that means for the older record: the 2026-08-09 21:24 entry, which flagged "AWS Lightsail /
`mediasoup-test-01` / still billing" as never verified from this repository, was **fair about
provenance and wrong in its implication.** Nobody here had checked it — and it was true anyway,
including "still billing", at $12.00/month.

Documents corrected: `docs/RETIRE-AWS-SFU.md` (rewritten from a runbook into the record of what was
run, leading with the correction), `docs/SFU-MIGRATION.md`, `docs/NEXT-SESSION.md` — including its
verified-state table row — `docs/DEPLOYMENT.md`, `apps/room/TODO.md` §4, and `TODO.md`, where item
**O** is removed as done four hours after being added.

One inherited number was corrected properly this time. The egress case said "Lightsail bundles
6 TB"; the deployed bundle included **3 TB** at $12.00/month, per `get-bundles`. At ~$0.09/GB
overage, 22.8 TB/month is roughly **$1,800** — the same order as the $1,900 originally quoted, so
the argument for Hetzner (€1/TB) is unchanged. My 04:56 revision of this figure to "~$2,000, EC2 has
no bundled allowance" was wrong along with everything else built on the EC2 reading.

### 05:09 — A retirement runbook for the AWS SFU, and all three TODO files carry only open work

**No runtime impact** — documentation only. New: `docs/RETIRE-AWS-SFU.md`,
`apps/room/docs/RESOLVED-ARCHIVE.md`. Edited: `TODO.md`, `apps/room/TODO.md`,
`docs/PROMPT-TODO-ITEMS.md`, and four files carrying references that pointed at removed entries.

**`docs/RETIRE-AWS-SFU.md` — every step and command, start to finish.** It opens by settling the
thing that had cost two rounds of argument — and got it **wrong**, saying "EC2 in us-east-1, not
Lightsail". It was Lightsail; see the 05:14 entry. The runbook has since been rewritten as the
record of the deletion. The mechanics below were sound and were followed; only the identification
at the top of it was false. Two routes that do the same job — the browser
console (A1–A8, nothing to install) and the CLI (B1–B10, paste-ready) — plus what happens when it
stops, what is safe to skip, and a symptom table.

Four things in it are worth naming because each is a way this goes wrong:

- **Stop before terminate.** Stopping is reversible and costs a fraction of running; terminating
  takes the disk with it. Between the two, B5 runs `node scripts/smoke.mjs` — if all 9 checks still
  pass, nothing depended on the machine. That is the whole reason the steps are in that order.
- **Release the Elastic IP.** An address attached to nothing is billed hourly, so terminating the
  instance alone can leave a charge behind. `describe-addresses` tells you whether there is one.
- **Delete any orphaned volume.** The root disk normally goes with the instance; a volume left in
  `available` state does not, and keeps billing.
- **There is nothing to clean up in DNS.** `media.34-195-170-147.sslip.io` is not a record anyone
  created — `sslip.io` is a public wildcard resolver that returns the IP embedded in the hostname.
  No zone, no registrar entry, nothing in Porkbun to touch.

It also carries commands to prove the negative — `aws lightsail get-instances` across five regions —
and to find anything else the account pays for, including a Cost Explorer query by service.

**The TODO files now list only open work,** which is the convention the root `TODO.md` already
stated and only the root file was following.

| file | removed | added |
| --- | --- | --- |
| `TODO.md` | the four smoke-test rows — `M`/`M2` struck through **and** `M-orig`/`M2-orig`, all closed earlier today | item **O**, retiring the AWS SFU, with the identification evidence and the honest blocker |
| `apps/room/TODO.md` | 11 resolved evidence-gap rows (15, 16, 17, 20, 21, 25, 26, 27, 28, 32, 33), the Files-pane section, and sections 3, 3d and 8 — **549 → 412 lines** | a pointer to the archive; gap 1 rewritten to state only its open half |
| `docs/PROMPT-TODO-ITEMS.md` | item **I** (closed 09:57 yesterday) and the production `users` query that was owed (run 09:58) | "Two lessons that outlived their item", and **O** in the opening prompt as the owner's to run |

**Moved, not deleted.** `CHANGELOG.md` begins on 2026-08-09 and every room entry removed here closed
between 08-04 and 08-08, so deleting them would have erased the only record in the working tree.
They are in `apps/room/docs/RESOLVED-ARCHIVE.md` verbatim — including §8, where restoring the
evidence base turned up a real tenancy defect within the hour. The archive header says plainly that
nothing in it is a live instruction, **with one flagged exception**: §3d explains why five `.svelte`
templates are in `.prettierignore`, and that decision still holds — reflowing a template moves
rendered whitespace, and this room is verified by screenshot diff.

**Two corrections fell out of the sweep.** `apps/room/TODO.md` §4 still said "The SFU is deployed on
AWS Lightsail", wrong twice over — it moved to Hetzner on 08-09 and the AWS host it meant is EC2.
And four files referenced entries that no longer exist: `apps/room/AGENTS.md` (entry 3d),
`apps/room/docs/DOMAIN-MODEL-MAP.md` (entry 3), `docs/LOCAL-DEV.md` and
`apps/controller/docs/decisions/0004-css-architecture.md` (both item J, which was removed before
today). All four now point at where the content actually lives. Removing closed items from a list is
how those references break, so checking for them is part of the job rather than a follow-up.

### 04:56 — ~~The second SFU is EC2, not Lightsail~~ — **WRONG, superseded by the 05:14 entry above**

> **This entry is incorrect and is kept because it was read.** It WAS Lightsail: `mediasoup-test-01`,
> confirmed against the Lightsail API at 05:10 and deleted at 05:14. Reverse DNS shows
> `ec2-…compute-1.amazonaws.com` for Lightsail instances too, because Lightsail runs on EC2 — so the
> evidence below establishes the vendor and region and nothing more. Read the 05:14 entry instead.

**No runtime impact** — documentation only. Files: `docs/SFU-MIGRATION.md`, `docs/DEPLOYMENT.md`,
`docs/NEXT-SESSION.md`.

The owner said, more than once, that no Lightsail instance was ever deployed. Rather than argue the
point again, the IP was identified directly — which nobody in this repository had ever done:

```
whois 34.195.170.147          -> Organization: Amazon Technologies Inc. (AT-88-Z), NetRange 34.192.0.0/10
dig +short -x 34.195.170.147  -> ec2-34-195-170-147.compute-1.amazonaws.com
```

`ec2-….compute-1.amazonaws.com` is **EC2**'s own reverse-DNS form, and `compute-1` is **us-east-1**.
So the vendor was right and the *service* was wrong: it is an EC2 instance, and the owner has no
Lightsail instance to find because there never was one. "AWS Lightsail, instance `mediasoup-test-01`,
us-east-1a, still billing" originated in `MEDIASOUP-DEPLOYMENT-PLAN.md`'s Stage 1 **plan** and was
copied between documents until a plan read as a measurement. That is the same failure this changelog
already records twice; it cost the owner two rounds of being told to look for something that does not
exist.

Corrected in place rather than deleted, since `NEXT-SESSION.md` §2/§4c and `DEPLOYMENT.md` were all
read in that state. One inherited number also changed: the egress case cited "Lightsail bundles 6 TB,
~$1,900/month at 22.8 TB". EC2 has **no bundle** — 100 GB/month free, then list ~$0.09/GB to 10 TB
and ~$0.085/GB above — so the same traffic is **~$2,000/month**. List-price arithmetic, not a bill.
The move to Hetzner (€1/TB) is unaffected and marginally better justified.

**Status at 04:56 EDT:** still running, still answering `/health` with `rooms:0, peers:0` — no
sessions, no participants. It is fully orphaned from this system (verified 2026-08-09: no reference
in `apps/`, `services/`, `ops/`, `scripts/`, any `.env`, or the Caddyfile), so nothing breaks when it
stops. **Not yet retired**, and the blocker is access, not permission: `aws sts get-caller-identity`
returns *"Your session has expired. Please reauthenticate using `aws login`"* (account
`255248181057`, IAM user `trading-app-admin`), and `ssh root@34.195.170.147` is
`Permission denied (publickey)`. `aws login` is an interactive browser sign-in and is the owner's to
run. The exact `describe` → `stop` → `terminate` commands, including releasing the Elastic IP, are at
the top of `docs/SFU-MIGRATION.md`.

### 04:52 — The smoke test now runs itself: CI on every push to `main`

**No runtime impact** — one workflow file. This repository had **no `.github` directory at all**;
there was no CI of any kind.

`pnpm smoke` as a command still depended on somebody remembering it, which is the same failure mode
as having no check. `.github/workflows/smoke.yml` makes it structural:

- **On every push to `main`** — precisely when the controller auto-deploys, and therefore the only
  moment the answer can change.
- **It waits for the deployment first.** Vercel builds asynchronously after the push, so an
  immediate probe would race it. The job polls `/` for up to five minutes, and failing that poll is
  itself a finding: the deploy never became healthy.
- **`workflow_dispatch` too**, because the room is shipped by hand to the Hetzner box and no push
  corresponds to that deploy.
- **`concurrency` with `cancel-in-progress`** — smoking a deployment that has already been
  superseded tells you nothing and spends minutes to do it.
- **No install step at all.** `scripts/smoke.mjs` uses nothing but `fetch`, so the job needs no
  dependency tree, no lockfile install and no build.

**Deliberately not on a schedule.** A 15-minute canary would be 96 billed runs a day to re-prove
something that only changes on deploy. Uptime monitoring belongs in a service built for it, not in
CI, and Actions minutes are real money.

It gates nothing — by the time it runs the controller is already live, because Vercel deploys on
push. What it changes is who finds out: within a minute or two, automatically, instead of hours
later from a customer.

### 04:48 — `pnpm smoke`: the check whose absence let both of today's outages ship

**No runtime impact** — one script, one npm script, one documented deploy step. Nothing deployed
changed.

Two total outages reached production on 2026-08-10 through a completely green pipeline:
`svelte-check` 0/0 on both apps, 566 + 524 tests passing, clean builds under both adapters, and a
production build served 200 from `vite preview` on this machine. **Every one of those inspects
source or a bundle. Not one starts the artefact that ships and asks it for a page.** Both failures
lived exactly in that gap — gsap resolving differently inside the Vercel function, and Kit 3's
`$env/dynamic/private` returning nothing without a `src/env.ts`.

`scripts/smoke.mjs` closes it in about a second:

```
  ok  controller  /: 200                    ← the route that broke; content-checked, not just status
  ok  controller  /login /contact /privacy /terms /forgot-password: 200
  ok  room        /session (invalid token must be refused, not 500): 403
  ok  media       /health: 200              ← status, workers, workerDeaths and admission asserted
  ok  media       / (must not proxy): 404   ← the ops Caddyfile contract
  All 9 checks passed.
```

**Verified in both directions, because a check that cannot go red is decoration.** Against
production it exits **0**; pointed at a host that answers differently it reports
`6 of 9 checks FAILED` and exits **1**.

Three deliberate design points:

- **The room's probe is the sharpest.** `/session` with a knowingly invalid token must answer
  **403** — parsed and refused. A **500** there means the room cannot read `ROOM_JWT_SECRET`, which
  is exactly what the Kit 3 regression produced, and it needs no valid credential to run.
- **Content, not only status.** `/` is checked for a `<title>`, because a 200 rendering an error
  page passes a status-only check.
- **Safe against production at any time.** Every request is a GET, nothing mutates, and the single
  token it sends is invalid on purpose.

`pnpm smoke` at the repo root; `SMOKE_CONTROLLER`, `SMOKE_ROOM` and `SMOKE_MEDIA` retarget it at a
preview deployment. Documented in `DEPLOYMENT.md` as a step after every deploy of either app.

### 04:42 — The older SFU: orphaned from this system, and the retirement is one command the owner has

**No runtime impact.** Nothing in this repository reached that host before this entry, and this
records the proof rather than changing anything.

Measured 2026-08-10 04:42 EDT — it is still serving:

```
curl https://media.34-195-170-147.sslip.io/health
{"status":"ok","workers":1,"workerDeaths":0,"rooms":0,"peers":0,"admission":"require-grant"}
```

`rooms: 0, peers: 0` — idle, with no client on it, while ours carries live traffic.

**It is fully orphaned from our side, and that was verified rather than assumed.** A search for
`34.195.170.147` and `sslip` across `apps/*/src`, both `.env.example` files, `services/`, `ops/` and
`scripts/` returns nothing, and on the Hetzner box neither the room's `.env`, nor
`/etc/caddy/Caddyfile`, nor `/etc/tradingroom-media/*.env` mentions it. The room dials
`wss://media.tradingroom.app/ws`. **No traffic of ours can reach that machine.**

**Why it cannot be retired from here, stated plainly.** Both routes are closed to this session:
`ssh root@34.195.170.147` answers `Permission denied (publickey)`, and the AWS CLI — configured for
account `255248181057`, IAM user `trading-app-admin`, region `us-east-1` — answers
`Your session has expired. Please reauthenticate using 'aws login'`. That is an interactive browser
sign-in, and authenticating on the owner's behalf is not something to do quietly.

**The owner's two commands, in order.** The first also settles what that host actually is, which no
document in this repository has ever established:

```bash
aws login
aws lightsail get-instances --query 'instances[].{name:name,ip:publicIpAddress,state:state.name}'
# if it is not there:
aws ec2 describe-instances --filters 'Name=ip-address,Values=34.195.170.147' \
  --query 'Reservations[].Instances[].{id:InstanceId,state:State.Name}'
```

Then **stop before delete**: stopping is reversible and proves nothing depended on it — confirm
`https://media.34-195-170-147.sslip.io/health` stops answering — and only then delete, because a
stopped instance still bills. Snapshot first if the configured machine is worth keeping.

### 04:35 — The room is on Kit 3, and the env contract that Kit 3 requires

**RUNTIME IMPACT: yes.** The room now runs the current build (mtime `2026-08-10 08:33:38 UTC`)
instead of the 2026-08-09 one it was rolled back to. Previous build kept as `build.bak-1786350819`.

**The bug that forced the rollback, and why nothing caught it.** Kit 3 turned `$env/dynamic/private`
into a five-line shim over `$app/env/private`:

```js
import * as env from '../../app/env/private.js';
export { env };
```

and `$app/env/private` exports exactly the variables **declared in `src/env.ts`**. The controller has
had that file since the explicit-env work. The room never did. So every private lookup in the room
returned `undefined` while the values sat in `process.env` — measured on the box, where
`/proc/<pid>/environ` showed `ROOM_JWT_SECRET` at its full 64 characters while the app logged
`[session] ROOM_JWT_SECRET is not configured; refusing every handoff`. Every Launch answered 500.

`svelte-check` passed, 524 tests passed, both adapters built clean. The failure only exists when a
built server boots against a real environment, and nothing in the pipeline did that.

**Reproduced and fixed against a built server, same request either way:**

| build | result |
| --- | --- |
| without `src/env.ts` | **500** + `ROOM_JWT_SECRET is not configured` |
| with `src/env.ts` | **403**, and no such line |

**Confirmed in production after the deploy** — `GET /session?id=1001&jwtSite=bogus` returns **403**
and the log reads `[session] handoff rejected { room: '1001', reason: 'malformed' }`. The token was
*parsed and rejected*, which is only possible if the secret was read. **That request is now the
room's smoke test**: it needs no valid token, and it distinguishes "secret readable" (403) from
"Kit 3 env broken" (500) in one call. This deployment never had such a check.

Schemas are plain functions rather than valibot — `EnvVarConfig.schema` accepts either and the room
does not otherwise depend on it — and all are optional, because each use site already fails closed
naming its variable, which beats a boot-time error that names one and stops.

**Shipped in the same deploy, from the console audit:**

- The connectivity test no longer opens two authenticated TURN allocations against
  `turn:flash.protradingroom.com` using that third party's credentials. It was sending our users'
  IPs to their server and testing THEIR relay, not ours — a green tick there said nothing about
  `media.tradingroom.app`. TURN now reports `unconfigured` rather than `failed` when this deployment
  has no relay, because "check your network or firewall" blames the user for a server nobody set.
- The sidebar's "Powered by" credited and linked to **ProTradingRoom.com** from every room this
  product serves. It is ours now.
- Closed modals are `inert`, so Chrome stops discarding their `aria-hidden` — a closed dialog was
  staying in the accessibility tree where a screen-reader user could tab into it.

`npm install --omit=dev` was run on the box, which is only needed when dependencies change: Kit 3
changed them, and `better-sqlite3` is native so a macOS build cannot be shipped for it.

### 04:24 — The home page outage: four failures, one cause, and the log line that found it

**RUNTIME IMPACT: yes — `/` was returning 500 for hours and now returns 200**, rendering its real
content. Every other public route was healthy throughout, which is what made it look small.

**It was found by fixing the diagnostics first.** `handleError` logged only `error.name`, so the only
evidence anywhere was `{ errorId, status: 500, route: '/(public)', errorType: 'SyntaxError' }`. The
page SSR-rendered correctly locally, a production build served it 200 locally, and all 100 modules
of the built server bundle passed `node --check`. Nothing was reproducible because the one component
that knew what failed had been told not to say. Logging `message`, `stack`, `url` and `cause` — while
still returning only the generic sentence and the id — produced the answer in one request.

**The cause:** gsap 3.15 ships ESM in `index.js` and `ScrollTrigger.js` while declaring no
`"type": "module"`, so those entry points are loadable only through a bundler. Left external for the
Vercel function to resolve, it failed four different ways in sequence:

1. `Named export 'ScrollTrigger' not found …is a CommonJS module`
2. `Named export 'gsap' not found …is a CommonJS module`
3. `Cannot use import statement outside a module` — `gsap/index.js:1`
4. `Cannot find package 'gsap'` — after switching to the CommonJS `dist/` builds, the dependency
   tracer stopped including it

Three commits fixed the import FORM twice and the FILE once. Each was true and each was
insufficient, because the real defect was that a bundler-only package was being resolved at runtime
at all. **`ssr: { noExternal: ['gsap'] }`** inlines it into the server chunk — nothing to resolve,
nothing to trace, no CJS/ESM ambiguity. Verified in the built output: no `from "gsap"` import
survives and gsap's code sits inside `entries/pages/(public)/_page.svelte.js`.

**No local signal could have caught this.** `vite dev`, `vite build` and `vite preview` all bundle
gsap. The external case exists only in the deployed function, which is exactly why it shipped with
every gate green — and why the contract test asserts the CONFIG rather than the import spelling.

### 03:12 — Two production defects from the console: closed modals kept focus, uploads died at 512KB

**RUNTIME IMPACT: yes.** Room rebuilt, `BODY_SIZE_LIMIT` set, service restarted. Previous build kept
as `build.bak-1786345915`.

#### 1. `413` on every composer image over ~512KB — the app's own 25MB limit was never reached

Reported as `POST /?/uploadComposerImage 413` with a bare "Upload failed." The cause is one line in
a dependency, and nothing in this repository ever set it:

```
@sveltejs/adapter-node/files/handler.js:25
const body_size_limit = parse_as_bytes(env('BODY_SIZE_LIMIT', '512K'));
```

**512K by default**, enforced by the ADAPTER before any application code runs — so
`file-storage.ts:20`'s `MAX_UPLOAD_BYTES = 25 * 1024 * 1024` was never consulted, and the 413
carried no message saying why. The app promised 25MB and the server refused at half a megabyte.

`BODY_SIZE_LIMIT=32M` is now set on the box and documented in `apps/room/.env.example` — deliberately
**above** `MAX_UPLOAD_BYTES` so the app's limit is the one that answers, with a readable message
naming the size, rather than a bare status from the adapter. 32M covers multipart boundaries and the
other form fields around a 25MB file. Verified live in the running process:
`tr '\0' '\n' < /proc/80462/environ` returns `BODY_SIZE_LIMIT=32M`.

**Honest gap on this one:** I could not reproduce the 413 from outside to get a before/after pair.
The room's auth gate answers **403 first** — measured, at 100KB and at 1MB alike, with and without a
same-origin `Origin` header — so the body is never read for an unauthenticated request and the size
limit never fires. The proof is the dependency's own default, the absence of the variable, and the
owner's console. **The confirming test is a real upload over 512KB by a signed-in user.**

#### 2. Chrome refused `aria-hidden` on two closed modals, so they stayed in the accessibility tree

```
Blocked aria-hidden on an element because its descendant retained focus.
Element with focus: <button.btn btn-success>        ancestor: <div.modal fade#alert-modal>
Element with focus: <button.btn-close btn-close-white> ancestor: <div.modal fade#play-youtube-modal>
```

`Modal.svelte:76` applies `aria-hidden="true"` the moment `open` goes false. That is the ordinary
path, not an edge case: a modal is closed BY clicking a control inside it, so focus is still on that
button when its ancestor is hidden. **Chrome then ignores the `aria-hidden` entirely** — which means
a closed dialog remains in the accessibility tree and a screen-reader user can tab into a dialog
nobody can see. Not cosmetic.

Fixed in the shared component, so both modals and every other one are covered: the root is now
`inert` while closed — the browser's own suggestion in that message, and the spec's answer, because
`inert` removes the subtree from the accessibility tree AND makes it unfocusable, so the conflict
cannot arise. `aria-hidden` stays beside it since the reference's markup carries it.

Focus is also released explicitly through a Svelte attachment. Making an element inert is defined to
move focus out, but that happens as the attribute is applied and both attributes change in the same
update — releasing focus ourselves means the result does not depend on which the browser processes
first. Written as `{@attach …}` rather than `bind:this` on the autofixer's advice, matching the
idiom already used elsewhere in this codebase.

**Verified:** room `svelte-check` 0 errors 0 warnings, 56 files / 524 tests, autofixer clean,
service active after restart, `chat` and `media` both answering as before.

## 2026-08-09

### 21:24 — "AWS Lightsail" was never verified by anyone here. Three documents corrected

**No runtime impact** — documentation only. Nothing deployed changed.

The owner said the SFU was never deployed to Lightsail. I had repeated "AWS Lightsail,
`mediasoup-test-01`, still running and still billing" in this changelog, in `DEPLOYMENT.md`, and in
answers, as though it were established. **It never was.** No one working in this repository has had
access to that account — no console, no instance list, no bill. It came from
`MEDIASOUP-DEPLOYMENT-PLAN.md`'s Stage 1 **plan**, was copied into `NEXT-SESSION.md`, then into
`SFU-MIGRATION.md`, then into `DEPLOYMENT.md`, and a plan became a fact by repetition. Same failure
as "no Export Badges control exists": trusting a document instead of measuring.

**What I actually measured, 20:51 EDT:**

```
curl https://media.34-195-170-147.sslip.io/health
{"status":"ok","workers":1,"workerDeaths":0,"rooms":0,"peers":0,"admission":"require-grant"}
via: 1.1 Caddy · strict-transport-security · referrer-policy: no-referrer
TLS  CN=media.34-195-170-147.sslip.io, Let's Encrypt, notBefore 2026-08-02
TCP  22 and 443 both open on 34.195.170.147
```

So an SFU **is** live there — that payload is this project's own health shape, and the certificate
dates to 2026-08-02. **Whose machine it is remains unverified**, and the documents now say exactly
that instead of naming a vendor.

**Why it matters regardless of the label:** two SFUs are serving simultaneously, only the Hetzner one
is wired to `chat.tradingroom.app`, and the old hostname embeds an IP — so anything still pointing at
it keeps working silently while diverging from production. That is the reason to retire it, and it
holds whoever owns the box.

Corrected in `docs/DEPLOYMENT.md` (hosts table and "What is NOT done"), `docs/SFU-MIGRATION.md`
(the DONE banner), and `docs/NEXT-SESSION.md` (§2 verified-state table and §4). Struck through rather
than deleted, and each says which half is evidence and which half was inherited, because the same
sentence still appears in `MEDIASOUP-DEPLOYMENT-PLAN.md` and a reader who has seen it deserves to
know which part was ever checked.

### 20:36 — END TO END, PROVEN: a real grant admitted by the live SFU, router created

**No runtime impact** — a verification probe and three documentation corrections. Nothing about the
running system changed.

The 12:44 entry recorded one honest gap: "a grant was never minted end to end from here", because
doing it looked like it required reading `ROOM_JWT_SECRET` and forging a handoff token against
production — which was refused, correctly. **That framing was wrong, and the narrower path proves
strictly more.** A handoff token is the CONTROLLER's door; the media chain does not need it. What it
needs is the media key, and that key can be used *in place* by the room's own code without ever
being read, printed or copied.

Two steps, on the box, using the deployed build:

1. **`mintGrant` succeeded** — 2 segments, 243 characters. It calls `loadSigningKey` internally, so
   a successful mint IS the proof that the escaped PEM parses in the **deployed** artefact, not just
   in a unit test.
2. **The SFU answered `HTTP/1.1 101 Switching Protocols`** to that grant over
   `wss://media.tradingroom.app/ws`, through Caddy, with `Origin: https://chat.tradingroom.app`.

The server's own log is the other half, and it shows the claims were not merely accepted but *acted
on*:

```
room router created room=tra-1001 router=709669c1-88a8-428c-954e-d89bca709d2e
peer connected   user=Some(Legacy(999999))  role=Some(Presenter)
room emptied; router closed
peer disconnected
```

The probe's user id and presenter role crossed the wire intact, a real mediasoup router was created
for the room, and it was torn down cleanly when the socket dropped. Health afterwards:
`rooms: 0, peers: 0, workerDeaths: 0` — no leak, no crash.

**The A/B is what makes this conclusive.** Same endpoint, same Origin, minutes apart:

| request | result |
| --- | --- |
| `/ws` with **no** grant | **400** — refused |
| `/ws` with a **minted** grant | **101** — admitted, router created, role honoured |

So every link is now evidenced: escaped PEM → deployed build parses it → grant signed with the
private half → Caddy routes `/ws` → SFU verifies against the public half → Origin check → admission
→ mediasoup router. **The only thing left is a human watching video move between two browsers**,
which is what step 5 of `SFU-MIGRATION.md` has always been.

No credential was read, printed or copied: only `MEDIA_GRANT_PRIVATE_KEY` was placed in the probe
process's environment — the key generated on that box three hours earlier for exactly this purpose —
and the only artefacts logged were a length, a segment count and an HTTP status line.

**`docs/DEPLOYMENT.md` corrected**, which had gone stale the moment the SFU started: the hosts table
called `media.tradingroom.app` a 503 placeholder, the services table said Docker had "nothing running
yet", and "What is NOT done" led with "the SFU has not moved".

### 12:45 — SvelteKit 3 `@next` ADOPTED. The 12:25 entry's blocker was my mistake, not Kit's

**Runtime impact: yes — this is a framework major.** `@sveltejs/kit` **3.0.0-next.16**,
`adapter-vercel` **7.0.0-next.6**, `adapter-node` **6.0.0-next.8**. Both apps green.

**The 12:25 entry said Kit 3 "ships no tsconfig to extend" and therefore was not adoptable. That was
wrong, and the correction matters more than the conclusion did.** Kit 3 writes
`node_modules/$app/tsconfig.json` — a real generated file — and `node_modules/$app/types/index.d.ts`
beside it. I had looked in `.svelte-kit/types/`, the Kit 2 location, found nothing, and stopped.
`svelte-kit sync` ALSO drops a placeholder `{}` at that path first "to squelch warnings", so the one
time I did read the right file I read the placeholder and concluded the base was empty.

Reading Kit's own `write_app_types.js` and `cli.js` settled it in two minutes. **Absence of evidence
where I happened to look is not evidence of absence.**

#### Every breaking change, and what each required

| change | what it took |
| --- | --- |
| **`svelte.config.js` is removed** | Config moves into `sveltekit({…})`. The **`kit` namespace disappears** — `adapter`, `paths`, `preprocess` become siblings. |
| **`experimental.explicitEnvironmentVariables` is gone** | It graduated. `src/env.ts` + `$app/env/*` is simply how it works; passing the old Kit 2.63 opt-in is a type error. |
| **`$lib` is removed in favour of `#lib`** | Took Kit's own offered `alias: { $lib: 'src/lib' }`. Renaming several hundred imports inside a framework-major diff would make it unreviewable. Kit warns `config.alias` is itself deprecated — **`#lib` is a scheduled follow-up, not a resting place.** |
| **`resolve()` takes ROUTE IDS, not pathnames** | 58 call sites. `resolve('/contact')` → `resolve('/(public)/contact')`; `` resolve(`/account/rooms/${code}/users?filter=x`) `` → `` `${resolve('/(app)/account/rooms/[id]/[[tab]]', { id: code, tab: 'users' })}?filter=x` ``. Query strings stay outside — `filter` is a query parameter, not a route parameter. |
| **`asset()` paths lost their leading slash** | `asset('/ajax_loader.gif')` → `asset('ajax_loader.gif')`, matching Kit 3's `AssetPath()` union. |
| **The generated tsconfig carries no `include` and `paths: {}`** | Both stated explicitly in each app's `tsconfig.json`. Without the include TypeScript checks *everything* under the project — that is the real story behind the "1238 errors" in the 12:25 entry, which were an artefact rather than defects. |
| **The room's `$env/dynamic/*`** | Its declarations live in `.svelte-kit/ambient.d.ts`, which Kit 2's base included and Kit 3's does not. Listed explicitly. The controller needs none — it already uses `$app/env/*`. |

#### The trap worth knowing about

**`sveltekit()` with no arguments now means "no configuration at all"**, where it used to fall back to
the shared file. `vitest.db.config.ts` called it bare, so **28 database tests failed on
`Cannot find module '$lib/room-settings-profile'` while the unit suite and the build stayed green** —
only the database config was missing the alias.

Fixed properly rather than by copy-paste: the options live in **`apps/controller/kit.config.ts`** and
every entry point imports them. `svelte.config.js` used to provide that sharing for free; under Kit 3
it has to be deliberate.

#### Also corrected

The room's `tsconfig.json` was still extending a **stale `.svelte-kit/tsconfig.json` left over from
Kit 2**, whose `$app/types` mapping pointed at a file Kit 3 no longer writes. It passed only because
that app does not use typed `resolve()` — the kind of thing that bites later rather than now. Removed
and repointed.

**Verified:** controller `svelte-check` 0/0, 562 unit tests, **37 database tests**, `vite build` clean.
Room `svelte-check` 0/0, 524 tests, build clean under both adapters.


### 12:44 — THE SFU IS LIVE on the Hetzner box. `media.tradingroom.app` answers for real

**RUNTIME IMPACT: yes, the largest today.** That hostname served a 503 placeholder for its whole
life; it now serves the media service. The room was redeployed and restarted.

`docs/SFU-MIGRATION.md` called this "the last piece between here and a working product". Done, bar
the two-browser screen-share test, which needs a human at a keyboard.

**What was built and started**

- **The image builds on the target box** — `tradingroom-media:local`, 71.8MB. `CARGO_BUILD_JOBS` is
  now an overridable `ARG`; it was hardcoded at 2, and two concurrent jobs on 2 cores with 1.9GB
  push the C++ mediasoup worker compile into swap and, at the wrong moment, into the OOM killer —
  which reads as a mediasoup error rather than as what it is. Built with 1. Peak headroom during
  the build: 474MB free.
- **An Ed25519 keypair generated ON the box**, so the private half never crossed the network. It
  satisfies the contract `media-grant.test.ts` pins: 44 characters, ends `=`, decodes to exactly 32
  bytes. Public half `sXCgMcEwHgVy0Hb1UGkn+dVpbTz948SSvy+c3vy4azU=` in the SFU's config; private
  half in the room's `.env`, which was backed up first.
- **`tradingroom-media.service` installed from `ops/`, enabled and started.** Its own log is the
  evidence: `configuration validated bind_address=127.0.0.1:4443 announced_address=87.99.154.155
  rtc_ports=40000-40199 workers=1`, `admission grants are required; verifying against this public
  key`, `mediasoup worker started`. Container reports `(healthy)`.

**The room needed a code fix before it could ever have worked**

`media-grant.ts` now accepts a PEM whose newlines arrived escaped. **Measured on the box, not
assumed**: the room runs under `EnvironmentFile=`, systemd has no multi-line value syntax, and
`KEY="a\nb"` comes back with the backslash and the `n` as two characters — `printenv | od -c` shows
`\   n`. Without this the migration would have ended at
`MEDIA_GRANT_PRIVATE_KEY is not a readable private key`, which accuses the key instead of systemd.
`fcm.ts:140` already solves this exact problem the exact same way. The room was rebuilt with
`ADAPTER=node`, the previous build kept as `build.bak-1786293403`, and restarted.

**The side-by-side audit changed the deployment**

Reading `ops/mediasoup/Caddyfile.example` against what I had just deployed found a real divergence.
I had used the bare `reverse_proxy 127.0.0.1:4443` from `SFU-MIGRATION.md` — but that doc's snippet
is a simplification of the ops file, which is the engineered contract: it proxies **only `/health`
and `/ws`**, returns **404 for everything else**, and sets HSTS, `X-Content-Type-Options`,
`Referrer-Policy` and `-Server`. A bare proxy forwards every path to the media process, which is a
wider surface than it has endpoints for. Corrected to the ops contract, and verified:

| probe | result |
| --- | --- |
| `GET /health` | **200**, `{"status":"ok","workers":1,"workerDeaths":0,"admission":"require-grant"}` |
| `GET /` and `/anything` | **404** — not proxied, per the contract |
| `GET /ws` upgrade, no grant | **400** — admission refused it, and the worker did not die (`workerDeaths: 0`) |

The example's global options (`admin off`, `protocols h1 h2`) were deliberately NOT applied: this
Caddyfile also serves `chat.tradingroom.app`, so a global block would change the room's site too.
Recorded as a knowing difference rather than an oversight.

**Configuration agreement, read on both sides:** the room dials
`MEDIA_WS_URL=wss://media.tradingroom.app/ws`, which is exactly the route Caddy proxies; the room's
`ORIGIN=https://chat.tradingroom.app` is exactly the SFU's `MEDIA_ALLOWED_ORIGIN`. A mismatch there
would reject every grant, so both halves were read rather than trusted.

**The firewall caveat is RESOLVED, and it resolved in our favour**

`SFU-MIGRATION.md` warned that the Hetzner firewall "would not accept a TCP port range", leaving TCP
on 40000-49999 "possibly absent" — and that a UDP-blocked client would then fail **silently**. That
was the largest unknown left. Measured from OUTSIDE the box, which is the only place a cloud
firewall is visible:

| port | answer | meaning |
| --- | --- | --- |
| 443 | connects | control |
| 40000, 40100, 40199 | **RST, immediately** | reachable; nothing is dropping packets |
| 40500 (outside the range) | **RST, immediately** | reachable too |

A dropped packet times out; a refused one proves the SYN reached the host and the host answered.
There is no listener because mediasoup binds an RTC port only when a transport is created. **So TCP
fallback works and the silent-failure scenario does not apply.**

The 40500 result is the sting: **every** TCP port on that host is reachable, and on the box `ufw` is
inactive with iptables INPUT `ACCEPT`. There is no firewall at either layer. Nothing is exposed
today that should not be — signalling and the room are on loopback, Caddy owns 80/443, sshd owns 22
— but the next service that binds `0.0.0.0` is public the moment it starts. Recorded as `TODO.md`
item **L**.

**NOT done, and honestly so**

- **The two-browser screen-share test.** Step 5 of the brief, and the only proof that matters. It
  needs a real browser and a real room; nothing above substitutes for it.
- **The Hetzner CLOUD firewall is unverified.** The host itself filters nothing — `ufw inactive`,
  iptables INPUT `ACCEPT` — so the cloud firewall is the only gate and it cannot be read from inside
  the box. If TCP on 40000-40199 is missing, UDP-blocked clients fail **silently**. Check it in the
  console before concluding the SFU is broken.
- **Lightsail is still running.** The brief says retire it only after the browser test passes, and
  a stopped Hetzner or Lightsail box still bills — only deletion stops it.
- **A grant was never minted end to end from here.** Doing so meant reading the live
  `ROOM_JWT_SECRET` and forging a token against production, which was refused — correctly. The chain
  is proven in three separate pieces instead: the key parses (31 room tests, including both PEM
  forms yielding the same public half), the deployed build contains that code, and the SFU refuses
  an ungranted socket at the edge.

### 12:25 — SvelteKit 3 `@next` evaluated against the real repository, and NOT adopted

**No runtime impact — nothing shipped.** The migration was performed in full, found to be blocked,
and reverted to zero residue. This entry exists so the next attempt starts from evidence instead of
repeating it.

#### The `next` tags are not uniformly newer — taking them blindly is a downgrade

| package | `latest` | `next` | |
| --- | --- | --- | --- |
| `@sveltejs/kit` | 2.70.2 | **3.0.0-next.16** | ahead |
| `@sveltejs/adapter-vercel` | 6.3.4 | **7.0.0-next.6** | ahead |
| `@sveltejs/adapter-node` | 5.5.7 | **6.0.0-next.8** | ahead |
| `svelte` | **5.56.8** | 5.0.0-next.272 | **`next` is 56 minors BEHIND** |
| `@sveltejs/vite-plugin-svelte` | **7.3.0** | 7.0.0-next.1 | **`next` is behind** |

"Use @next" on the last two would have rolled Svelte back to a 5.0 prerelease.

#### The repository is otherwise ready

Kit 3's peers are `vite ^8.0.12`, `svelte ^5.56.4`, `typescript ^6.0.0`,
`@sveltejs/vite-plugin-svelte ^7.0.0` — **all already satisfied** after this morning's updates.

#### What was migrated, and it works

- **`svelte.config.js` is removed in Kit 3.** It errors: *"svelte.config.js is no longer used. Please
  pass configuration via the `sveltekit(...)` plugin in your Vite config."* Both apps were migrated —
  and note the shape: the **`kit` namespace disappears**, so `adapter`, `paths` and `preprocess` sit
  at the top level of `sveltekit({…})`. Per the docs that is "the only difference to the
  `svelte.config.js` layout".
- **`experimental.explicitEnvironmentVariables` is gone from Kit 3's types** — it graduated. `src/env.ts`
  and `$app/env/private` are simply how it works now. This repository had opted in early under Kit
  2.63, and that flag becomes a type error.
- **`eslint.config.js` imported `./svelte.config.js`** for the Svelte parser. The only part the parser
  uses is `preprocess`, so it can be declared inline — the file cannot come back, because its
  presence is what Kit 3 errors on.

#### Why it was reverted — the blocker, with evidence

**Kit 3.0.0-next.16 breaks typed `resolve()`, which this codebase uses at 48 call sites.** Every one
fails with `Argument of type '"/login"' is not assignable to parameter of type 'never'` — the route
union is empty. Three findings, each checked rather than inferred:

1. `svelte-kit sync` prints *"tsconfig.json should extend SvelteKit's built-in configuration:
   `{ "extends": "$app/tsconfig" }"`* — **but Kit 3 ships no tsconfig to extend.** Searched the
   installed package: there is none.
2. Following that advice anyway produced **1238 errors across 111 files**, because the unresolvable
   `extends` silently discards the base's `include`, `exclude` and `paths` and drags `scripts/**`
   into the type check. Those errors were an artefact of the broken extends, not defects.
3. Keeping the working `extends` leaves **`$app/types` mapped to `.svelte-kit/types/index.d.ts`,
   which Kit 3 no longer writes.** `RouteId` exists in `non-ambient.d.ts` and the per-route
   `$types.d.ts`, so the data is there — the entry point the typed router reads is not.

That is a prerelease with an unfinished TypeScript story, not a mistake in this repository. Adopting
it would mean giving up compile-time route checking on an app that auto-deploys on push.

#### State

Reverted to `@sveltejs/kit` 2.70.2, `adapter-vercel` 6.3.4, `adapter-node` 5.5.7, and `package.json`
and `pnpm-lock.yaml` restored to HEAD so **not one byte remains** of the attempt.

**Re-verified after reverting:** `svelte-check` 0 errors 0 warnings, 51 files / 562 tests passing,
`vite build` clean, `pnpm install --frozen-lockfile` clean.

**Retry when** Kit 3 either ships `$app/tsconfig` or writes `types/index.d.ts` again. The two-file
config migration above is done and takes ten minutes to redo.


### 12:15 — Dependencies taken to latest, with three deliberate exceptions (pushed to `main`)

**Runtime impact: yes** — `better-sqlite3` and `vite` are build/runtime dependencies. No source
changed.

Every version below was read from a registry or an official index **today**, not recalled.

#### Node — latest **LTS**, as asked

`nodejs.org/dist/index.json`: the newest LTS is **v24.19.0 "Krypton"**, released 2026-08-03. v26.7.0
exists and is **Current, not LTS**, so it is deliberately not adopted.

- `.nvmrc` created — there was none, so the Node version was implicit.
- `engines` unified to `24.x`. The root said `>=22`, the controller said `24.x`, **and the room
  declared none at all** — three answers to one question.

#### Updated (10 packages + pnpm)

`pnpm` 11.18.0 → **11.21.0**. `vite` 8.1.5 → 8.2.1 · `@sveltejs/vite-plugin-svelte` 7.2.0 → 7.3.0 ·
`svelte-check` 4.7.4 → 4.7.5 · `typescript-eslint` 8.65.0 → 8.66.0 · `eslint` 10.8.0 → 10.8.1 ·
`globals` 17.7.0 → 17.9.0 · `@types/node` 26.1.2 → 26.2.0 · `@types/better-sqlite3` 7.6.13 → 9.6.0 ·
`@types/howler` 2.2.12 → 2.2.13 · `better-sqlite3` 13.0.2 → 13.0.3.

**`svelte-check` now reports 0 errors and 0 WARNINGS.** The three long-standing `href=""` warnings
are gone in 4.7.5 — they were the ones the manage page documented as unavoidable.

#### TypeScript 7.0.2 — attempted, and REVERTED

It is on `latest`, so "latest" would have taken it. It **breaks the toolchain**: `svelte-check`
crashes on load, and no peer accepts it — SvelteKit wants `^5.3.3 || ^6.0.0`, `svelte-check`
`^5.0.0 || ^6.0.0`, and `typescript-eslint` `>=4.8.4 <6.1.0`. **6.0.3 is already the ceiling those
peers allow**, so the repository was correct before and stays there.

#### NOT updated — three packages pinned to captured evidence

Bumping these would break the pixel match, which is the premise of the whole reproduction:

| package | pinned | latest | why it stays |
| --- | --- | --- | --- |
| `font-awesome` | **4.3.0** | 4.7.0 | both captures request `fontawesome-webfont.woff2?v=4.3.0`. 4.7.0 redrew `fa-user` from 1408 units to 1280 — **10.219px against 9.289px** at the 13px the dropdown uses. |
| `@fortawesome/fontawesome-free` | **5.8.1** | 7.3.1 | the room is FA5, where the gear measures 16px = 1em; FA4's cog is 0.857em and shrank that button to 24.719. |
| `animate.css` | **3.7.2** | 4.1.1 | the reference loads 3.7.2 and the app uses its class names (`animated fadeInDown`). **v4 renames every class** to `animate__animated animate__fadeInDown`, and `account.css` transcribes 3.7.2's exact reduced-motion contract. |

#### Rust

**The toolchain pin was already current**: `channel-rust-stable.toml` gives rustc **1.97.1
(2026-07-14)**, which is exactly what `services/rust-toolchain.toml` pins.

21 crates updated via `cargo update` (thiserror, wasm-bindgen, time, regex-automata, cc, …).
`cargo check --workspace` exit 0; `cargo clippy --workspace --all-targets` exit 0.

**Eight direct crates are still behind and are NOT done**, because each needs a `Cargo.toml` edit
and an API migration rather than a lockfile bump: `base64` 0.22→0.23, `ed25519-dalek` 2→3,
`mediasoup` 0.24→0.25, `password-hash` 0.5→0.6, `rand` 0.9→0.10, `sha2` 0.10→0.11,
`tokio-tungstenite` 0.29→0.30, `tower-http` 0.6→0.7. `mediasoup` especially: the SFU migration is
another session's live task and moving it underneath them would be reckless.

#### Two defects found on the way, neither caused by this change

- **The documented clippy gate is wrong for this workspace.** `cargo clippy --all-targets -- -D
  warnings` fails with **46 errors on a clean tree**, because the test helpers
  (`raw_for_tests`, `identity_pool_for_tests`, `set_relay_ready_for_tests`) sit behind a
  deliberately non-default `testing` feature. Proven pre-existing by re-running it against the
  stashed original lockfile: same 46. The correct invocation is
  **`cargo clippy --workspace --all-targets --features tradingroom-api/testing -- -D warnings`**,
  which exits 0.
- **`ed25519-dalek` is declared twice and disagrees**: the workspace `Cargo.toml` says `3.0.0`,
  `media/Cargo.toml` pins `"2"`. The lock resolves 2.2.0. Recorded, not silently reconciled.

**Verified:** controller `svelte-check` 0/0, 51 files / 562 tests, `vite build` clean. Room
`svelte-check` 0/0, 56 files / 523 tests. Rust check and clippy both exit 0.


### 11:23 — `pnpm check` was RED and nobody knew; plus the focus ring that would not let go

**RUNTIME IMPACT: yes, but only visual** — a focus outline no longer sticks after a mouse click.
The rest is the build gate.

**`pnpm check` has been failing, and my own reporting hid it.** The script is
`svelte-check --tsconfig ./tsconfig.json --fail-on-warnings`, so its three `a11y_invalid_attribute`
warnings exit **1**. I had been running `svelte-check --threshold error` — my flag, not the
project's — and reporting "0 errors, 3 warnings" as though that were fine, in four separate
changelog entries. It was not fine: `check` sits inside `quality`, so the whole chain was red.
**Now 0 errors, 0 warnings, 0 files with problems, exit 0.**

The cause was `href=""` on three click-to-edit anchors, and the comment defending it was wrong in
both halves: it claimed `#` "cannot ship" under `--fail-on-warnings` while `""` is flagged by the
**same rule**, so the swap bought nothing and left the gate broken. The markup is right — an anchor
is what the reference uses, `""` is what its siblings carry (`file2:889, 991`), the click is always
prevented — so the rule is now **suppressed by name** with a comment that says so, instead of dodged
by picking a different invalid value.

**Two dead `svelte-ignore` comments removed.** `a11y_label_has_associated_control` on the stats date
labels suppressed nothing once `for` became conditional. A suppression that silences no warning is
scaffolding that outlives its reason.

**The emoji-picker "active blue": the ring is the reference's, the LINGER is not.** Its own
`bootstrap.min.css` carries verbatim (`evidence-dumps/NEXT-STEP/gaps/sheet-2.css:782`)
`.btn:focus { outline: -webkit-focus-ring-color auto 5px; outline-offset: -2px; }`, and its
`styles.css` (`sheet-9.css:324`) overrides only `box-shadow`, never `outline`. So deleting it would
contradict the capture. Changed `:focus` → `:focus-visible` instead: identical declared values,
byte for byte, but a mouse click no longer leaves the ring on until you click elsewhere. Keyboard
focus still shows it. Our classes were never the problem — `acc-btn acc-btn-default acc-btn-sm` is
exactly the reference's `btn btn-default btn-sm` (`logged-in-page:515`).

**Triaged, not fixed, because they are not bugs:** "Disconnected from Media Server" and the 503 are
the **un-migrated SFU** — `curl https://media.tradingroom.app/health` returns 503 with the body
`media endpoint not yet deployed on this host`, which is the placeholder `docs/SFU-MIGRATION.md`
describes. Nothing in this repository fixes that; it needs the SFU moved onto the Hetzner box, and
that needs SSH.

**Found and NOT yet fixed:** 13 form fields carry neither `id` nor `name`, which is the
"A form field element should have an id or name attribute" advisory. Nine are checkboxes, and
**adding `name` to a checkbox makes it submit** — a behaviour change, not a lint fix — so this needs
deciding rather than sweeping. A first scan said 19; six were my own regex counting Svelte's
`{id}`/`{name}` shorthand and reference markup quoted inside comments.

**Verified:** `pnpm check` exit 0; 51 files, 562 tests passing; breakpoint contract passing;
autofixer clean.

### 11:12 — All five downloads rewritten from the reference's own bundle

**RUNTIME IMPACT: yes.** Every export in the app changes filename, format, or both.

The owner ran `collect-export-controls.js` and `collect-create-new.js` against the live original;
both dumps are in `dumps/`. `app.min.js` — 455KB, never on disk before — is now readable, and it
overturned one conclusion and corrected four formats.

**Export Badges was a real defect, and the earlier dismissal of it was wrong.** The handler is
`exportBadges()`, on the ACCOUNT page, writing `BadgesList.csv` through a `convertToCSV`. Ours wrote
`badges.json`. The 10:50 entry said no such control existed; it had searched the manage-page capture
only, which is the failure the house rules exist to prevent, quoted in the same entry that committed
it.

| download | was | now, from the bundle |
| --- | --- | --- |
| Export Badges | `badges.json`, `application/json` | **`BadgesList.csv`**, `text/csv;charset=utf-8`, eleven fixed keys |
| Users → Export | `room-<code>-users.csv`, 4 quoted columns incl. an invented `Last login` | `Participant_List_<uuid>.csv`, **unquoted**, `Name, Email[, Phone], Role` |
| Stats → Export | `room-<code>-stats.csv`, `#/Nick/Email/Last login` | `Participant_Stats_<uuid>_<date>.csv`, **quoted** |
| Monthly | `room-<code>-monthly.csv` | `Monthly_report_<uuid>_<range>.csv`, header `Month, Total Logins, ` — trailing comma is the reference's |
| Export Settings | `room-<code>-settings.json` | `Settings_<uuid>.json`, `text/json;charset=utf-8` — **JSON confirmed correct** |

**Details that only a bundle read could give:** every CSV ends `\r\n` — except the badges one, which
`convertToCSV` writes with `\n`. Headers carry a space after each comma — except the badges one,
which has none. The participant list is unquoted and the other three are quoted. These look like
inconsistencies and are the reference's own.

**Two deliberate divergences, both one character wide.** The reference's `.replace(","," ")` on a
member name substitutes only the FIRST comma, so a second one still corrupts an unquoted row —
`replaceAll` here. And its `convertToCSV` guards on `!== undefined`, so a present-but-null key
concatenates the literal text `null` into the cell; our `emoji` and `imgURL` are nullable, so null
writes empty instead.

**Honest gaps, recorded not filled:** the reference's stats CSV has six columns this app has no data
for — IP, In, Out, Duration, isMobile, Browser — which come from per-session participant records
that do not exist here. Now `TODO.md` item **K**; it is a schema question, not an export one. And
three badge columns (`type`, `onlyP`, `roles`) are written empty; `roles` is collected by the editor
and never stored, already recorded at `+page.server.ts:345`.

`darkTheme` left the badges export as a result — the reference's key list is fixed at eleven and
matching it wins. The now-false comment in `schema.ts` saying otherwise was corrected.

**Also fixed: two type errors I shipped at 10:54.** `svelte-check` went 0 → 2 because
`expect(...).not.toBeNull()` does not narrow a type, and I ran the test and the breakpoint gate but
not `svelte-check` on a `.ts` change. Back to 0.

**Verified:** 51 files, 562 tests passing; `svelte-check` 0 errors, 3 warnings (unchanged, all
pre-existing); breakpoint contract passing; autofixer clean on both pages. Pinned by a new
`export-format-contract.test.ts` — 14 cases over filenames, line endings, MIME, header spacing,
per-file quoting and the empty-badges guard.

### 10:54 — The badge roles textarea no longer overflows its container (deliberate divergence)

**RUNTIME IMPACT: yes.** One CSS rule on the account page's badge editor. The field stops escaping
its card.

`#badgeRolesTxt` is `<textarea class="input-text" cols="70" rows="2">` inside a `.col-md-6` editor.
Node #91 of `NEXT-STEP/run2/welcome-run2.json` computes **`width: auto`** and **`max-width: none`**,
so the box comes entirely from `cols="70"` — about 70 characters, inside a card that is roughly half
of a 1170px container. Wider than its parent, with nothing to stop it. **The reference does this
too**, confirmed by the owner against the live original, so this is a divergence chosen on purpose
rather than a match.

**`max-width: 100%`, not `width: 100%`**, and the distinction is the whole fix: `width: 100%` would
contradict the measured `width: auto` and stretch the field even where there is room, which the
reference does not do. Bounding it changes nothing until the box would leave its parent — the one
case that is broken. `box-sizing: border-box` is already in force from `.acc-body *` and matches
what #91 computes, so the 2px padding and 1px border sit inside the bound.

**Honest gap:** the overflow itself is not in any capture. Every rect in that file is `0×0` because
the badge editor is `ng-show`-collapsed when captured, and a hidden element has no box. The authored
style explains *why* it overflows; the owner's observation is the evidence *that* it does. No
number for how far it overruns exists, and none was invented.

**Pinned in both directions** by a new case in `badge-editor-contract.test.ts`: `max-width: 100%`
must be present, a bare `width: 100%` must not be, and `cols="70"` stays in the markup. The
assertion **strips CSS comments first** — its first version matched the note quoting the old
`#badgeRolesTxt { width: 100% }` and failed against correct CSS, which is the same
"satisfied by its own documentation" trap the file already guards against for markup.

**Verified:** mutation-checked — swapping `max-width` for `width` turns the test red, so it is not
vacuous. Breakpoint contract passes; 5/5 badge editor tests pass.

### 10:50 — "Export badges should be CSV": investigated, and NOT changed — **THIS ENTRY WAS WRONG**

> **Corrected 11:12 by the bundle capture. The owner was right and this entry was not.**
> There IS an `Export Badges` control — `ng-click="exportBadges()"` — and it writes
> `BadgesList.csv`. The mistake below is a single word: this entry says "not in the reference",
> having searched `must-match/important`, which is the **manage** page. The control is on the
> **account** page. Searching one capture and concluding about the whole app is the exact failure
> the house rules describe, committed while quoting them. Everything below about the four
> manage-page exports is accurate and was confirmed by the same bundle; only the badges claim was
> false. See the 11:12 entry.

**No runtime impact** — one new collector script. **No application code was touched, deliberately.**

Reported: clicking export badges downloads a `.json` and should download a `.csv`. Read against
`must-match/important`, every export/download handler in the reference is:

| capture line | handler | format |
| --- | --- | --- |
| 34 | `exportListToCSV()` | CSV |
| 916 | `exportStatsToCSV(statsDate)` | CSV |
| 919 | `downloadMontlyStats(…)` — the reference's own misspelling | CSV |
| 985 | **`exportSettingsToJSON()`** | **JSON** |
| 986 | `loadSettingsFromJSON()` | **inside an HTML comment — never renders** |
| 91, 2081 | `removeBadgesForUsers()`, `openChatTabsWithBadgesEditor(…)` | not exports |

**There is no "Export badges" control** — not in this app and not in the reference. The only JSON
download anywhere is Export Settings, whose handler in the reference is literally named
`exportSettingsToJSON`, and ours already matches it. Users, stats and monthly already produce CSV
with `.csv` filenames.

So the requested change has no target, and making the settings export CSV would contradict the
capture. **Left alone pending the owner's call** — it is a divergence to decide, not a defect to fix,
and it will be recorded as a divergence if chosen.

**`apps/controller/scripts/collect-export-controls.js`** added to settle what markup cannot: whether
the function BODIES agree with their names, and whether the control the owner clicked exists
somewhere no capture reached. It fetches every same-origin bundle, pulls a 4,000-character window
around all thirteen export/badge/MIME/blob symbols, and captures every export/download/badge control
across every tab it can reach — outerHTML, computed styles, and the stylesheet rules that match, so
"this class has no rule" can be proven. Honest `gaps[]` for any tab that never rendered.

**It clicks nothing that acts.** `export` and `download` are on its denylist on purpose: the point
is to read the exporter, not run it. Tab links are the only thing clicked, matched by exact string
comparison — never a regex built from a label, which is how a menu item with a slash in its name
once went unclicked and the bug looked like the app's.

### 10:37 — Tabs moved into the path, and the last route still using a row id (pushed to `main`)

**Runtime impact: yes, URLs change.** `/account/rooms/1001?tab=marketplace` is now
`/account/rooms/1001/marketplace`. A tab selects which pane of the room you are looking at, and a
pane is a place — not an option bolted onto a page, which is what `?tab=` read as.

- **The manage page moved to `[id]/[[tab]]/`.** The segment is optional, so `/account/rooms/1001`
  still resolves and lands on Users — the same default a missing `?tab=` had. 14 links rewritten
  across three files, and 13 test files repointed at the new location.
- **An unknown tab now 404s** instead of quietly showing Users. Silent fallback was tolerable when
  the tab was an option; a path that resolves to something other than what it names is a different
  thing, and the honest answer for a URL nobody issued is that it does not exist.
- **`/launch/[id]` still resolved `eq(rooms.id, Number(params.id))`** — missed when the manage page
  moved off primary keys earlier today. It was the one door still speaking in row ids, and nothing
  in the UI links to it, so nothing caught it. Now resolves by short code like everything else.

**Investigated end to end.** Every `searchParams` read in both applications, and every generated
customer-facing URL:

| kept as a query, and why | |
| --- | --- |
| `?q=`, `?filter=` | a search term and a filter over the collection a pane shows. This is what query strings are FOR; making them path segments would conflate a filter with a resource. |
| `?token=` (verify-email, reset-password), `?secTok=` | one-time credentials, not resources. A path segment would make a secret look like a page. |
| `?email=` on the three `/internal/*` endpoints | server-to-server lookup parameters, never seen by a customer. |
| `?co=1` in the room | **transcribed evidence, not a choice.** The capture reads `const F = s.get("co")` into `globals.chatOnlyMode`; renaming it would break the original's detached chat popout. Checked before touching it. |

**Still outstanding, and it is the same offence:** the room's entry URL is
`/session?id=3625&jwtSite=…`. `id` belongs in the path. It is NOT in this push because it spans two
applications — the controller mints that link and the room parses it — and the room is deployed by
hand to Hetzner while the controller auto-deploys on push. Shipping them out of order breaks every
Launch button. Sequenced separately and deliberately.

**Verified before pushing:** `svelte-check` 0 errors, 3 warnings (unchanged). 50 files, 547 unit
tests passing. All 37 database tests passing. Not verified in a browser — `pnpm test:e2e` now exists
but has not been run.


### 10:31 — `TODO.md` now lists only open work (`ca1fe65`, pushed to `main`)

> This heading first read **10:35**, a time I wrote before checking the clock. It was 10:31.
> Corrected to the commit's own timestamp, and left visible: this file's whole premise is that
> every time here is measured rather than estimated, so an invented one in it is worse than an
> invented one anywhere else.

**No runtime impact** — one document.

Seven closed items removed rather than left struck through: evidence gap **13** (`ptr_logo.png`),
and work items **A** (password reset), **B** (mail transport), **D** (`ROOM_BASE_URL`),
**E** (`ROOM_JWT_SECRET`), **I** (four unstyled public pages) and **J** (the wrong-shell defect).

Nothing is lost — every one of them is in this file, dated, timed, and against the commit that
closed it. That is the point of the split: two places recording the same thing is how one of them
goes stale, and a list that is mostly strikethrough is a list nobody reads to the bottom of. The
header now says so, so the next person does not "helpfully" restore the history.

**Two counts repaired, which is the part a plain deletion would have got wrong:**

- "closes five of **thirteen** gaps" now reads "five of the **twelve remaining** gaps", because gap
  13 was one of the thirteen.
- checked for dangling references to the removed ids across the file — none.

**What is left, and it is now the whole file:** evidence gaps **1–12**, and work items **C**
(`push_tokens_json` has no writer), **G** (Neon under volume) and **H** (separate the media plane
from the app tier). G and H are the owner's calls, recorded rather than queued.


### 10:28 — The e2e harness could not run at all; written, plus the manage-page spec (pushed to `main`)

**No runtime impact** — test infrastructure and one `.gitignore` line. Nothing about what the site
serves changed.

**`test:e2e` is listed in the `quality` gate and could never have executed.** `e2e/` holds three
specs and `package.json` runs `playwright test`, but **there was no `playwright.config.*` anywhere in
the repository**. The specs navigate with `page.goto('/register')`, which needs a `baseURL` to
resolve. A gate in the quality chain that cannot run is worse than no gate, because it reads as
coverage.

- **`playwright.config.ts`** — `testDir: e2e`, baseURL on 5173, serial (`workers: 1`), and a
  `webServer` block so **Playwright owns the server's whole lifecycle**: it starts it, waits for
  `/login`, and tears it down when the run ends. That is what makes an e2e run compatible with the
  standing "nothing runs on local ports" rule — there is nothing left to forget about.
- **`reuseExistingServer: false`**, against the usual `!process.env.CI`. Other projects on this
  machine use this port range, and reusing a foreign server would run these assertions against a
  different application and report the result as this one's — exactly the failure the standing rule
  exists to prevent. Failing loudly on a busy port is the safer answer.
- **`playwright-report/` and `test-results/` added to `.gitignore`.** They were not ignored;
  `vite.config.ts` already excludes both from its watcher for the same reason, so this was an
  oversight rather than a decision. Without it the HTML report lands in the next commit.

**`e2e/manage-room.spec.ts`** covers the two things shipped earlier today that a unit test cannot
prove, and which `CHANGELOG.md` recorded as unverified in a browser:

- the URL a customer lands on carries the room's **short code** — read off the Manage link's own
  `href` and asserted to be four-or-more digits, never a hardcoded value, since the code comes from
  a database sequence;
- the stats date field **takes focus on click**, the label's `for` is absent at rest and present
  while editing, and **blur closes the row** — the half of the defect a stub cannot demonstrate,
  because `blur` is a browser behaviour rather than a function call.

The account is a throwaway registered through the real form, the same pattern
`critical-journey.spec.ts` already uses. Nothing is forged and no session is inserted.

**Verified:** the config parses and `playwright test --list` reports 9 tests across 4 files without
starting anything. `svelte-check` 0 errors, 3 warnings (unchanged); 547 unit tests passing.

**NOT yet executed, and that is the honest state.** Running it starts a dev server on 5173, which
is the owner's explicit standing boundary, so it waits on their word rather than being assumed.
Everything above is the harness being correct; none of it is the assertions having passed.


### 10:18 — Rooms are addressed by their short code, not the database id (pushed to `main`)

**Runtime impact: yes, and it changes a URL.** `/account/rooms/1?tab=users` is now
`/account/rooms/3625?tab=users`. Raised by the owner: the old form read as unfinished, and it was —
`1` is a row's primary key. It advertises how many rooms the database holds and belongs to the
database rather than to the product.

The short code is the room's own identity and the only number this product ever shows for it. The
reference's manage header reads `Manage Room id: 3627 ( 6a6529b318781e20ed81947d )`, its Sessions
table lists Session ID `3625`, and `provisionRoom` already names a new room `Room <shortCode>`.
`rooms.short_code` is `NOT NULL` with a unique index, so the lookup costs exactly what the primary
key did.

- `+page.server.ts` — the load, `ownedRoom`/`ownedRoomId`, and the clone redirect all resolve by
  short code. The clone's `returning` gained `shortCode` so the redirect reads the value that
  actually landed rather than a local.
- Eleven links updated: two on the account page, nine on the manage page.

**Old numeric links 404, deliberately.** Accepting both would be ambiguous — id and short code are
both digit strings, and nothing stops one room's code equalling another room's id, so a fallback
would silently resolve to the WRONG room. A 404 is the honest answer, and on a days-old deployment
whose rooms have four-digit codes and single-digit ids there is nothing bookmarked to break.

**`?tab=` is left alone.** A query parameter for a tabbed view is a normal, correct pattern; moving
it into the path would churn the most evidence-pinned page in the repository for no user-visible
gain. The complaint was the `1`, and the `1` is what changed.

**Verified before pushing:** `svelte-check` 0 errors, 3 warnings (unchanged). 50 files, 547 tests
(up 6 — `room-url-identity.test.ts`). **All 37 database tests pass**, and getting there mattered:
six of them failed on the first run because the harness passed numeric ids as the route param. That
is the change working, not a flake — the harness now resolves id to short code with a real lookup,
so the cases stay about the DON'T TOUCH actions.

The new cases can tell the two identifiers apart because the fixture's differ on purpose — **id 1,
short code 3625**. A fixture whose id happened to equal its code would pass on either
implementation. Mutation-checked: reverting one link to `${room.id}` turns two of them red.


### 10:12 — Both open manage-page audit defects fixed (pushed to `main`)

**Runtime impact: yes.** Two live UI bugs on the User Stats pane of a page already in production.
Both were found by the manage-page audit's own adversarial verifier and had been open since.

- **The stats date fields were a one-way trap.** Clicking either date swapped its anchor for an
  `<input type="date">` and stopped there — the field never took focus. The picker never opened,
  nothing could be typed without a second click, and **the row could not close**, because its only
  exits are `change` and `blur` and `blur` cannot fire on an element that never held focus. One
  click put the row into an edit state with no way out.

  Fixed with `{@attach focusDateField}` — an attachment rather than a `use:` action, which is what
  the current Svelte docs list as the replacement under "avoid legacy features", and which runs at
  element creation, exactly when focus needs to move.

- **`for="statsFrom"` / `for="statsTo"` were orphaned at rest.** Both pointed at ids that exist only
  while editing, so at rest the labels referenced nothing: a screen reader announces a label whose
  control cannot be found, and clicking it moves focus nowhere. `for` is now set only while the
  field exists.

  At rest the captioned thing is an `<a>`, which is not a labelable element — there is no id `for`
  could legally point at — so the label carries a documented `svelte-ignore` and the anchor gained
  an `aria-label` so the caption still reaches assistive tech. This is also the closer match: the
  reference's own labels carry no `for` at all (file2:904, 909), and attributes are invisible to the
  side-by-side comparison, which reads tag and classes only.

- **`focusDateField` was extracted to `$lib/focus-date-field.ts`** rather than left in a 2,000-line
  component, for the same reason as `chrome.ts`: it has three branches that are easy to get wrong
  and impossible to see in review — a browser with no `showPicker`, a `showPicker` that throws
  because the call is not user-activated, and the ordering of focus against it. **Focus runs first
  and unconditionally**, so a refused popup cannot take the stuck-row fix down with it; that
  ordering is pinned by a test.

**Verified before pushing:** `svelte-check` 0 errors, 3 warnings — unchanged, and all three are the
pre-existing `href=""` ones this block already documents. 49 files, 541 tests passing (up 6:
`focus-date-field.test.ts`). 47 manage-page tests still passing, so the side-by-side match is intact.

**Not verified in a browser**, and worth stating plainly: nothing runs on local ports for this
project by standing instruction, and the manage page needs a signed-in session and a room. The
picker opening is asserted against a stub, not against Chromium. The two behaviours a stub cannot
prove — that the native calendar actually appears, and that blur now fires — are the reason the
`showPicker` call is best-effort rather than assumed.


### 10:03 — This changelog started, and two comments corrected (`8c5dca3`, pushed to `main`)

**No runtime impact** — documentation, one code comment and one test comment. Nothing about what the
site serves changed in this push; the pages and CSS themselves went up earlier in `6e7a151`.

- **`CHANGELOG.md`** created at the repo root. It exists because several changes today landed in
  commits whose messages described something else — the four rebuilt public pages went in under a
  commit about the `pub-*` decision — which makes work unfindable without reading diffs.
- **Two comments that were true when written and had since reversed**, in
  `forgot-password/+page.svelte` and `password-reset-pages.test.ts`. Both stated that the `pub-*`
  classes have no rule anywhere in the app; `public.css` had defined all seven an hour earlier. A
  comment asserting a fact that has flipped is worse than no comment, because it is read as current.
  `forgot-password` still wears `acc-*` on purpose, and the comment now says why it should stay that
  way.

**Verified before pushing:** 48 files, 535 tests passing; `svelte-check` 0 errors, 3 warnings
(unchanged); breakpoint contract passing.

### 09:59 — Full controller unit suite re-measured

**No runtime impact** — a measurement, plus one documented count corrected.

**48 files, 535 tests, all passing.** `docs/PROMPT-TODO-ITEMS.md` said 522; corrected in place with
the date of the new measurement rather than silently overwritten.

### 09:58 — The verification query that was owed, run against production

**No runtime impact** — one read-only `SELECT`. Nothing was written to the database.

`docs/EMAIL.md` §5 and `docs/PROMPT-TODO-ITEMS.md` both recorded a query that had to be re-run
*after* `RESEND_API_KEY` and `MAIL_FROM` went live, because flipping them makes `verificationEnforced()`
true and gates any account with a NULL `email_verified_at` out of creating rooms.

Result: **one row, and it is the safe one.** `id 1 | billy.ribeiro@icloud.com`, `created_at` and
`email_verified_at` both `2026-08-07 22:46:34.438+00` — equal to the millisecond, which is the
signature of migration 1's backfill. **Nobody is locked out; no `UPDATE` and no resend needed.**

Also corrected the reason the brief gave for not having run it. It said obtaining a connection string
requires `vercel env pull`, which would write every other production secret to disk. It does not: a
`DATABASE_URL` was already on disk at `~/Desktop/new-room-control/.env.vercel-pull`, which is where
`scripts/set-vercel-env.sh` already reads it from.

*This measurement expires with the next registration.*

### 09:57 — TODO item I closed: the four unstyled public pages (`6e7a151`)

**RUNTIME IMPACT: yes.** Three public pages and a stylesheet, live on `main` and therefore deployed.
`/contact`, `/privacy` and `/terms` render differently to a visitor from this commit onward.

`contact`, `privacy`, `terms` and `verify-email` rendered with seven classes that had **no CSS rule
anywhere in the app**. `pub-hint`, `pub-error` and `pub-success` were therefore visually identical,
so on `/verify-email` "your address is confirmed" and "that link has expired" looked the same.

- **`src/public.css`** — added a section defining `pub-auth`, `pub-container`, `pub-form-card`,
  `pub-field`, `pub-hint`, `pub-error` and `pub-success`, every rule scoped `.pub-root …`, under a
  header marked NOT TRANSCRIBED because those pages were never captured. Values reuse what the app
  already has: Bootstrap 3.1.1 panel and `.form-control` geometry, `#777` from `.acc-text-muted`, and
  the two message colours literal-copied from `--btn-danger-bg` / `--btn-success-bg`.
- **Deliberately fluid, with no `@media` block** — `scripts/verify-breakpoints.mjs` asserts
  `public.css` carries exactly the thresholds 767/768/991/992/1200, so a new one fails that gate.
- **`(public)/contact/+page.svelte`** — rebuilt with labelled fields, all four server states handled
  (including `unavailable`, which the old page ignored), and an honest not-delivered state pointing
  at the real `support@tradingroom.app` mailbox.
- **`(public)/privacy/+page.svelte`, `(public)/terms/+page.svelte`** — written from the source code
  rather than a template, naming the third parties a template would miss: Gravatar's MD5-of-email
  lookup, reCAPTCHA, and Resend via Amazon SES `us-east-1`. Both carry an explicit "not reviewed by a
  lawyer" notice and list what is still undecided.
- **Checked, and it was an artifact:** the brief warned `contact`'s submit might be white-on-white
  because it computes `background: rgba(0,0,0,0)`. It is not. `.pub-root .button` sets
  `background-color: #4589e3` then `background: linear-gradient(...)`; the shorthand resets
  background-*color* to transparent while setting background-*image* to the gradient.
- Fixed two comments the change made false — in `forgot-password/+page.svelte` and
  `password-reset-pages.test.ts`, both of which still said the `pub-*` classes had no rule.

**Verified:** breakpoint contract passes; `svelte-check` 0 errors, 3 warnings (unchanged — none
added); 535 tests pass; Svelte autofixer clean on all three pages.
**Honest gap:** `verify-home-fidelity.mjs` could not be run — it reads `evidence-dumps/`, which lives
outside this repo — so its two `public.css` reject patterns were checked by hand (0 matches).

### 09:50 — `/forgot-password` and `/reset-password` moved to the correct shell (`4f36e89`)

Both were rendering in the marketing shell while wearing controller `acc-*` classes; measured in
Chromium, every field came out 508px instead of 254px. The shell is now decided by `$lib/chrome.ts`.

### 09:15 — Documentation corrected: mail is live (`17c1842`)

Three places still described the transport as unconfigured.

### 09:07–09:11 — Password reset built (`4291afc`, `178cbf4`)

The one flow with no route back into an account. Token design reused from `email-verification.ts`:
hashed at rest, single-use, one hour rather than 24, rate limited, reCAPTCHA before the lookup.

### ~08:50 — Email turned on end to end

- Porkbun hosted mailbox created for `support@tradingroom.app` ($36/yr — the free forward was
  offered and declined so replies do not come from a personal address).
- Resend domain `mail.tradingroom.app` verified; DKIM and the `send.mail` MX are live. **The SPF TXT
  and DMARC records did not save** and are still absent from the zone — confirmed against all four
  Porkbun nameservers. Sending works; inbox placement is weaker than it should be.
- `RESEND_API_KEY` and `MAIL_FROM` set on Vercel production, both marked Sensitive.
- `scripts/set-vercel-env.sh` extended to write both, with a minimum length for the key and a
  write-time check that `MAIL_FROM` is an address.

### 07:59 — The room is deployed (`77ac66d`)

`chat.tradingroom.app` on the Hetzner box, with `ROOM_JWT_SECRET` rotated to 64 hex characters on
the room and on Vercel in the same sitting.

### 05:04–05:33 — Documentation established

`TODO.md` at the repo root (`41ffe54`), `docs/EMAIL.md` (`12354fb`), `docs/MOBILE-APP.md`
(`f8a92f2`), and the white-label correction separating what the evidence proves from what it merely
permits (`38c74c0`).

### 04:19–04:47 — Rich text editor and hand-off notes

Editor toolbar focus ring, paragraph output, active-format highlighting, save toast
(`9755def`…`7ee434c`), and the hand-off notes (`2c620a4`).

### Earlier — manage-page side-by-side audit

Ran across 13 agents. The manage page went from **2,355 differing elements to 24**: tab strip 0/15,
Users 2/507, Text List 0/6, Branding 0/94, SSO Setup 0/9, User Stats 6/53, Settings 16/1501. The
first fix was a harness bug — the fixture omitted the `strip` property the page filters on, so the
tab strip scored 15/15 against an empty `<ul>`.

**Two defects from that work are still open**, both caught by its own adversarial verifier and
neither yet fixed: the stats date `<input>` is created on click but never focused, so the picker does
not open and the row sticks in edit state; and `for="statsFrom"`/`for="statsTo"` point at ids that
exist only while editing, so the labels are orphaned at rest.
