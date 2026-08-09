# Room login — measured visual specification

Evidence: a rendered screenshot of the room login at 3806×2520 device px
(**1903×1260 CSS px @ dpr2**). This is the **first rendered pixel evidence** in the
project — both JSON dumps carry geometry and computed styles but no image, which is
why every earlier document says pixel-perfection could be specified but not verified.

All values below were sampled programmatically from the image (PIL), not estimated by
eye. Where a number was derived rather than sampled, it says so.

---

## Palette

| Token | Value | How it was obtained |
|---|---|---|
| Page background | `#eeeeee` | **93.0% of all page pixels** — the dominant colour by area |
| Card background | `#ffffff` | 5.6% of page area |
| Primary (button, checkbox) | `#0a6ffd` | sampled at button centre |
| Disabled field fill | `#e9ecef` | 0.4% of area, the email input |
| Input value text | `#29a1b6` | teal, 3,584px of glyph area |
| Heading text | `#222222` | darkest pixel in the title band |
| Icon addon block | `#212529` | the trailing user/envelope buttons |

`#0a6ffd` is Bootstrap 5's `$primary` (`#0d6efd`) after JPEG-free PNG sampling —
within 3/255 on one channel. That **corroborates the Bootstrap 5 finding** made
independently from the DOM (`btn-close`, `data-bs-dismiss`), from a completely
different kind of evidence.

`#e9ecef` is Bootstrap 5's `$gray-200`, used for `:disabled` form controls. Also
consistent.

## Geometry (CSS px)

| Element | Measurement |
|---|---|
| Viewport | 1903 × 1260 |
| Card | **360 × 433**, at inclusive pixels x 770–1129, y 134–566 |
| Card horizontal position | centred; the raw DOM capture independently records a 360px border box |
| Empty avatar bitmap | **80 × 80** JPEG, rendered at its intrinsic size |
| Login button | **126.5 × 29.5** |
| Button corner | **pill** — see derivation below |
| Checkbox | 14.5 × 15.5 |
| Disabled email field | height **35**, fill `#e9ecef` |
| Content vertical extent | y 0 → ~660; the lower ~600px is empty background |

The earlier version of this table reported `359 × 432` by subtracting the two
inclusive endpoint coordinates. That is an off-by-one error: `1129 - 770 + 1 =
360` and `566 - 134 + 1 = 433`. The raw DOM capture independently reports both
`getBoundingClientRect()` and computed `width`/`height` as exactly `360 × 433px`,
with `box-sizing:border-box` and zero-width borders. There is no evidence for a
434px card height.

The user-supplied comparison screenshots independently exposed a rebuild defect:
the original PNG (`67683533…b2b8b`, 722×870 device pixels) showed the 360px card,
while the rebuild PNG (`14ffcd09…56a2b3`, 824×878) measured approximately 409px
wide. The cause was deterministic: the rebuild had `max-width:360px` but was
missing Bootstrap 5's global `box-sizing:border-box`, so the card's 25px left and
right padding expanded the content-box width toward 410px. The room shell now
applies the captured border-box reset locally. At viewports wide enough to hold
it, the card's border box is 360px; below that, it contracts with its containing
column rather than overflowing.

The supplied image, stored as `static/default-avatar.jpg` after removing its
reversible identifier from the public filename, is not a 360×433 image.
It is the original empty-avatar payload: a 1,262-byte baseline JFIF JPEG at
exactly 80×80 pixels, SHA-256
`10fc73b31e251de09ba5c87355909ffe3d7dff5e398992074494f8e74386c7c3`.
The supplied file's original hash-derived source is represented as
`[EMPTY_AVATAR_SOURCE_MD5]`. A direct retrieval from the corresponding
`https://www.gravatar.com/avatar/[EMPTY_AVATAR_SOURCE_MD5]?d=mm` URL produced a
byte-for-byte identical file. That token is distinct from the authenticated
capture's `[GRAVATAR_MD5_A]`. The surrounding login card—not the avatar—is the
element measured at 360×433 CSS pixels at the reference viewport.

## Authenticated identity and field typography

Evidence: `room-login-1785587188183.json`, captured at 1989×1265 CSS px @ dpr2.
Unlike the screenshot sampling above, these are browser-reported DOM properties
and computed styles, not inferred colours or estimated font metrics.

| Element | Browser-reported contract |
|---|---|
| `.user-nick` | identity text present; `Arial, Helvetica, sans-serif`; `15px`; weight `300`; italic; `22.5px` line-height; `rgb(34, 34, 34)`; opacity `1` |
| `#login-nickname-new` | value present; enabled; editable; not HTML-required; `Arial, Helvetica, sans-serif`; `16px/400/24px`; `rgb(40, 161, 181)`; white background; opacity `1` |
| `#login-email` | value present; disabled; not read-only; not HTML-required; `Arial, Helvetica, sans-serif`; `16px/400/24px`; `rgb(40, 161, 181)`; `rgb(233, 236, 239)` background; opacity `1` |

The captured person's name and email are evidence that the authenticated identity
is prefilled; they are not product defaults. The rebuild must source the current
authenticated user's `displayName` and `email`, use that email for the Gravatar
hash, and must never hard-code captured PII. When an authenticated controller
session and a remembered anonymous room identity both exist, the authenticated
session is authoritative. Server-side validation remains the correctness boundary
even though the captured name control has `required=false`.

### Button corner radius — derived, not sampled

The naive check ("is the inset at 2px from the top equal to half the height?")
reported `radius 8`, which is wrong. Solving the circle properly for an inset of
8.0 CSS px measured 2px below the top edge:

```
r − √(r² − (r − 2)²) = 8   →   r² − 20r + 68 = 0   →   r ≈ 15.7  (or 4.35)
```

`r ≈ 15.7` against a half-height of 14.75 means the button is a **pill**
(`border-radius: 999px`), and the 4.35 root is geometrically inconsistent with the
visible shape. Recorded here because the first automated reading was misleading.

## What this changes about the project's stated limits

`README.md` and `docs/PROCESS.md` both say *"no screenshot exists in either capture,
so pixel-perfection can be specified but not verified."* That remains true **for the
two controller pages**. It is no longer true for the room login: this screenshot is a
verifiable target for that one screen.

## What it does not give

- **One screen only.** The controller (`#/page/manageSession`) and account page still
  have no rendered evidence.
- **No hover, focus or error states.**
- **No font metrics from the screenshot alone.** The authenticated identity and
  field metrics in the section above come from the separate raw computed-style
  capture; heading and label metrics remain outside the screenshot evidence.
- **The avatar is a placeholder** (gravatar `d=mm` default), so it is not evidence of
  how a real avatar renders.
