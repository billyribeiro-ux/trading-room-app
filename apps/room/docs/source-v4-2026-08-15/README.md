# ProTradingRoom v4 — deployed source, retrieved 2026-08-15

**This is the version to match.** `../source/` holds an OLDER build of the same v4 and is left
untouched: it is SHA-256 pinned and enforced inside `pnpm test`, and every existing evidence-bound
test reads it.

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `deployed-index.html` | 16,094 | `d1f8408770a0e883de7d93ba…` |
| `main.d1d09071be31f1ba.js` | 2,891,205 | `40796ca83dba809b…` |
| `styles.ee2a710065b60389.css` | 444,793 | `8b54386a8dd07030…` |

Full digests are in `sha256sums.txt` beside this file.

**Not re-fetched, because they are byte-identical to `../source/` and to `/v3`:**
`runtime.b70e5d3ff558bfdf.js`, `polyfills.95db17d6d6f4b89d.js`, `scripts.38973a242454fb27.js`.

---

## How it was verified

Three independent captures, all agreeing on every hash:

1. `collect-app-versions.js` in the browser on `protradingroom.com` — the **marketing** site. All
   three version prefixes soft-404 there at HTTP 200 with
   `<h3>this is not the page you are looking for...</h3>`. A wasted run, kept because it is the same
   soft-404 trap `TODO.md` item T1-10 already records.
2. The same script on `chat.protradingroom.com`, the ROOM host.
3. The same script again from inside a **live Simpler Trading room**
   (`?id=652882112ad80b3e7c5132d5&sl=1`) — so this is what a real production room serves, not just
   what a bare URL returns.

Then `curl` from the command line, independently, reproducing all three hashes exactly.

## What is deployed, measured

| path | index | `main` | verdict |
| --- | --- | --- | --- |
| `/` | `d1f84087…` 16,094 | `40796ca8…` 2,891,205 | identical to `/v4` |
| `/v3` | `89ed9e7b…` 15,796 | `67a73a49…` 2,773,837 | a real, separate, older build |
| `/v4` | `d1f84087…` 16,094 | `40796ca8…` 2,891,205 | identical to `/` |
| `/v5` | — | — | **HTTP 404 on this path** |

`/` and `/v4` being byte-identical is why the bundle's own `roomV4Link` (`full.js:1925`) builds a
link to the `/v3/` sibling: the room **is** v4.

**On v5, stated carefully.** `useV5` is a LIVE, rendered, editable checkbox in the manage page
(`apps/controller/evidence-page.manageSession.html:2299`). The 404 above establishes only that
`/v5/` is not served as a URL PATH on this host — nothing more. The client contains no
version-switching logic (0 occurrences of `useV3`/`useV4`/`useV5` across 2,887,876 bytes, with a
passing control), so the server selects the build per room. Settling where v5 lives needs a room
whose `useV5` is on, which is what "PTR did not clear you for v5" refers to.

**`useV4` is commented out in the reference** (`evidence-page.manageSession.html:2304-2311`) while
v3 and v5 are live — consistent with v4 being the default that needs no switch.

---

## What changed between `../source/` and this

**+3,329 bytes. Twelve strings added, one removed.** Compared by extracting every quoted literal
from both bundles and diffing the sets.

**Added — file sorting:**
`st-fileSortBar` · `st-fileSortName` · `st-fileSortDate` · `sortFiles` · `fa-sort` ·
`fa-sort-alpha-up` · `fa-sort-amount-down` · `fa-sort-amount-up`

**Added — mobile app:**
`mobile-app-container` · `mobile` · `restoreMobileAppTokens` · `fa-mobile-alt`

**Removed:** `"Connectivity/Mic Troubleshooter"`

### `st-fileSortBar` settles a recorded failure, and the recorded lesson was wrong

`~/CLAUDE.md` opens with this incident: a search for `st-fileSortBar` returned nothing, it was
reported as "not in the capture", and the owner then pasted the real markup from the live app. The
lesson written down was *stop searching, read the region instead*.

**Measured here: `st-fileSortBar` appears 0 times in `../source/main.d6d3c112b59b7d0d.js` and does
appear in this one.** The search was not the problem. **Our evidence predated the feature**, and the
owner was pasting from a newer build than the one this repository holds.

The real lesson is larger and now recorded where it can be acted on: **evidence has a date, and the
live application moves.** A gap between what a capture shows and what the owner sees is not
automatically a reading error — check whether the capture is simply older, which is now a one-command
question because this directory exists.
