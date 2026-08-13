# TIER1-fetched — static artifacts pulled 2026-08-13

Closes Tier 1 of docs/reference/evidence-gap-register.md. Fetched read-only over HTTPS from
protradingroom.com. No login, no interaction, no mutation.

IMPORTANT: this server answers missing files with HTTP **200** and a 52-byte body
\`<h3>this is not the page you are looking for...</h3>\`. Three targets came back that way and
are therefore ABSENT here, not silently wrong: the glyphicons webfont (any path), and the
Angular-17 room build assets styles.d622cb9ed2bbc221.css / main.d6d3c112b59b7d0d.js.

| file | bytes | sha256 |
|---|---|---|
| api-post-routes.md | 20699 | 29d08ef2b00764d4 |
| fontawesome.woff2 | 56780 | aadc3580d2b64ff5 |
| main.css | 2103 | a27b150001e49d3c |
| styles.css | 218719 | 23bc4e026a06c84c |
| theme.css | 232979 | 497733a044053a64 |
| vendor-animate.css | 63376 | 0cb9156494d7c7c7 |
| views/page.avatars.html | 630 | 7d33bdb848829b1b |
| views/page.login.html | 8483 | 39976ca60d254950 |
| views/page.manageSession.html | 216609 | 926c960686df0305 |
| views/page.recordings.html | 1324 | 1d9027c360faf32b |
| views/page.register.html | 4106 | 09c1c1bc0107f917 |
| views/page.stats.html | 12271 | 233304d2b53a4f39 |
| views/page.welcome.html | 94152 | b4faa02ee4698b2e |
| views/users.html | 1683 | e19dae1274d33b32 |

## Two artifacts deliberately NOT kept here

`app.min.js` and `vendor.min.js` were fetched and READ — every finding taken from them is
transcribed with an offset citation in `docs/reference/evidence-dumps-full-read.md` — but they are
not committed. Reasons, in order of weight:

1. **They trip `scripts/verify-privacy-boundary.mjs`, and the check is right to trip.** Not on user
   data: `app.min.js` carries only reserved-domain placeholders plus two CSS-selector-shaped false
   positives, and `vendor.min.js` carries three published open-source author attributions in MIT
   licence headers (AngularJS's creator, angular-translate's maintainer, and one other library
   author). Harmless, but silencing a PII check for a directory I had just added would be exactly
   the wrong instinct — and quoting those addresses HERE tripped the same check a second time,
   which is why this paragraph describes them instead of reproducing them.
2. 1.7 MB of third-party minified code with no ongoing value once the findings are transcribed.

They remain verifiable. Re-fetch and compare:

| artifact | URL | bytes | sha256 |
|---|---|---|---|
| app.min.js | `https://protradingroom.com/public/dist/app.min.js?v=1785053347467` | 455329 | `dcad77f4578fa9a75c46491dd3e31c534624b627afb6f4a2b74a6dcfdde6f439` |
| vendor.min.js | `https://protradingroom.com/public/dist/vendor.min.js?v=2.18.100` | 1265906 | `dd1fd2b3869615a21e32d1d2cee1d727993c34e6de6fc609cab8ed3a4fb3bbba` |

The eight `views/*.html` partials ARE kept: they are the evidence actually cited for markup, they
are small, and they are the reference's own source rather than a vendor bundle.
