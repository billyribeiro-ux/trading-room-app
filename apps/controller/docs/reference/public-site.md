# Public marketing site (`/`) — pre-login

> **2026-08-09:** `/` no longer follows this capture — it renders the original cinematic surface
> decided in [`docs/decisions/0005-cinematic-home.md`](../decisions/0005-cinematic-home.md). This
> document remains the evidence record for the captured original and stays normative for the
> legacy marketing chrome still used by `/contact`, `/privacy`, and `/terms`.

Evidence: full server-rendered HTML of `https://protradingroom.com/`, supplied as a
paste. Structure, inline CSS and scripts only — no computed styles or rects.

---

## 1. A third stack

| | Controller | Room | **Public site** |
|---|---|---|---|
| Framework | AngularJS 1.3.15 | Angular Ivy | **none** — server-rendered HTML + jQuery 1.11.0 |
| CSS | Bootstrap 3 | Bootstrap 5 | **Bootstrap 3.1.1** |
| Icons | FontAwesome 4.3.0 | FontAwesome 5 | **FontAwesome 4.0.3** |
| Body id | — | — | `home4` |

Three applications, three stacks. Anything shared between them is shared by
convention, not by code.

## 2. Route discovery plus later direct form evidence

This public markup proves how the original site exposed the authentication routes:

```html
<li class="dropdown">
  <a href="#" class="dropdown-toggle" data-toggle="dropdown">Register/Login <b class="caret"></b></a>
  <ul class="dropdown-menu">
    <li><a href="/login">Login</a></li>
    <li><a href="/register">Register</a></li>
  </ul>
</li>
```

**`/register` exists**, as a sibling of `/login`, reached from a dropdown in the
navbar rather than a prominent call to action. Every visible CTA on the page instead
points at `/contact` — "Learn More", "Get a free demo room", "Contact Us" ×2.

So the acquisition path is **sales-led, not self-serve**: the page sells a demo and a
conversation, and self-registration is tucked into a dropdown.

Later direct captures close the form-markup portion of that gap:

- `evidence-dumps/login-page/login` preserves the original login page; and
- `evidence-dumps/register-page/register-page-file` preserves the original
  registration page.

The current Svelte routes cite those files directly. Still uncaptured are the
contact workflow, plan selection, checkout/payment, populated marketplace, and
other populated-account states; none may be inferred from the two form captures.

## 3. Marketplace: styled but not rendered

The `<head>` carries ~120 lines of inline CSS for a marketplace —
`.marketplace-container`, `.marketplace-card`, `.marketplace-card-price`,
`.marketplace-card-logo`, `#marketplace-empty-section h2`, `#marketplace-btn`, plus
carousel controls and two centring variants (`.marketplace-centered-1/-2`).

**None of those class names appear anywhere in the body.** The section renders
conditionally and had nothing to show on this load — the same "styled but empty"
pattern as the captured tenant's Badges table.

This connects to three things already in the controller: the "Marketplace Users"
filter in the M1 menu (`fa-credit-card`), and the `allowedProducts` /
`allowedMemberships` settings. A marketplace listing is presumably what a room
publishes to appear here.

Note `.marketplace-card-logo { background-color: #0e0e0e; }` matches the hero's
`background: #0e0e0e` — the site's near-black.

## 4. Defects in the consent implementation

The page has a GDPR banner offering "Accept All" / "Reject Non-Essential", gated on
`localStorage.gdprConsent`. Reading the actual script order, it does not do what it
says:

| Tracker | Gated by consent? | Evidence |
|---|---|---|
| Google Analytics `UA-51280128-2` | **yes** | `disableTracking()` sets `window['ga-disable-UA-51280128-2']` before the bottom `ga.js` injection runs |
| Google Ads `AW-1044463300` | **no** | `gtag.js` is loaded `async` in `<head>` and `gtag('config', …)` fires there, before any consent check exists |
| Tawk.to chat | **no** | injected unconditionally by a `<script>` at the bottom of `<body>`, *and* again inside `enableTracking()` — so accepting loads it **twice** |

Two further problems in the same block:

- **`_setDomainName('videoinclinic.com')`** on a site served from
  `protradingroom.com`. The GA cookie is scoped to a domain the browser is not on, so
  it is silently discarded. That analytics property has likely been recording nothing
  for a long time.
- **`function gtag()` is redeclared inside `enableTracking()`**, shadowing the global
  defined in `<head>`.

For a rebuild: consent must gate script *injection*, not just a disable flag set after
the fact, and the Ads tag and Tawk.to must move behind the same gate.

## 5. Content worth keeping

Copy deck, verbatim, for whatever replaces this:

- Title: *ProTradingRoom - Trading Room Software for professional traders*
- Hero: **Web-based Trading Room for Professionals**
- Seven selling points: White Label · HD Screen-Sharing with no lag · Desktop or
  Mobile · Mobile trade alerts · Web based HTML5, No Flash, No Downloads · Custom
  integrations on your site · Branding, Recording, Webinars, Stats, and more…
- Three feature cards: *Rooms are encrypted & secured* · *Cloud Based* · *Runs from
  the web browser. No Flash! No Java!. Pure HTML5 solution.*
- Testimonials framed as *Real user comments after switching to ProTradingRoom* —
  seven quotes naming **Omnovia** and **Webinato** as the products being replaced,
  matching the `<meta name="keywords">` ("webinato replacement, omnovia replacement")
- Footer: Privacy Policy · Terms of Service · Contact Us · © 2026 ProTradingRoom™

## 6. What this does not establish

- No computed styles or rects — markup only, so no pixel claims.
- The marketplace has CSS but no observed instance; there is no reference for a
  populated card.
- `/register`, `/login`, `/contact` and the marketplace page itself remain uncaptured.
  Running `scripts/capture-ptr-reference.js` on each would close them.
