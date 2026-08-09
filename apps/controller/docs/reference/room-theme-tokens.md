# Room theme tokens — extracted from the room app's inlined critical CSS

Evidence: `evidence-dumps/COPY/login-page-source` — the room app's `index.html` (`<title>PTRChat</title>`),
Angular with hashed bundles, critical CSS inlined by Critters.

## ⚠ This corrects a conclusion stated repeatedly in this project

`docs/ARCHITECTURE.md` said *"There is no theme system to build… A rebuild needs one
palette."* That was derived from the **controller's** 15 stylesheets, where `var(--`
occurs zero times, and it remains true **for the controller**.

It is **false for the room**. The room app defines **167 CSS custom properties**, including
**20 paired `--lightTheme-*` / `--darkTheme-*` tokens**. The room has two complete themes.

This is what `sess.darkThemeAsDefault` and `sess.darkThemeStyle` in the controller select
between — the setting lives in the controller, the tokens live here.

## The 20 theme pairs

| Token | Light | Dark |
|---|---|---|
| `chat-bg` | `#eee` | `#000` |
| `date-color` | `#8394a9` | `#8394a9` |
| `mobileApp-info-color` | `#676767` | `#f4f4f4` |
| `msg-bg` | `#d9d9d9` | `#000` |
| `msg-border-color` | `#d9d9d9` | `#393939` |
| `msg-color` | `#1a1a1a` | `#f7fd37` |
| `msgs-bg` | `#f1f1f1` | `#111` |
| `msgs-bg-adm` | `#e1e1e1` | `#000` |
| `msgs-separator-bg` | `#e8e8e8` | `#222` |
| `msgs-separator-border-color` | `#373c42` | `#373c42` |
| `msgs-separator-color` | `#373c42` | `#aaa` |
| `nickname-color` | `#676767` | `#c0d8ed` |
| `roster-bg` | `#f1f1f1` | `#111` |
| `roster-bg-adm` | `#e1e1e1` | `#000` |
| `sidebar-wrapper-bg-color` | `#fff` | `#000` |
| `sidebar-wrapper-color` | `#676767` | `#f4f4f4` |
| `textarea-bg` | `#fff` | `#111` |
| `textarea-color` | `#555` | `#eee` |
| `user-location-color` | `#676767` | `#f7fd37` |
| `username-color` | `#000` | `#c0d8ed` |

Every one carries `!important` in the source, i.e. they are applied as overrides on top
of the base palette rather than as the base itself.

## Base palette (Bootswatch *Darkly*)

| Token | Value |
|---|---|
| `--blue` | `#375a7f` |
| `--indigo` | `#6610f2` |
| `--purple` | `#6f42c1` |
| `--pink` | `#e83e8c` |
| `--red` | `#E74C3C` |
| `--orange` | `#fd7e14` |
| `--yellow` | `#F39C12` |
| `--green` | `#00bc8c` |
| `--teal` | `#20c997` |
| `--cyan` | `#3498DB` |
| `--white` | `#fff` |
| `--gray` | `#999` |
| `--gray-dark` | `#303030` |
| `--primary` | `#375a7f` |
| `--secondary` | `#444` |
| `--success` | `#00bc8c` |
| `--info` | `#3498DB` |
| `--warning` | `#F39C12` |
| `--danger` | `#E74C3C` |
| `--light` | `#303030` |
| `--dark` | `#adb5bd` |

The room also ships the full **Bootstrap 5.3** custom-property set (123 `--bs-*` tokens),
which independently confirms the Bootstrap 5 finding made from the DOM and again from the
screenshot's `#0d6efd` primary.

## App tokens (106)

| Token | Value |
|---|---|
| `--breakpoint-xs` | `0` |
| `--breakpoint-sm` | `576px` |
| `--breakpoint-md` | `768px` |
| `--breakpoint-lg` | `992px` |
| `--breakpoint-xl` | `1200px` |
| `--font-family-sans-serif` | `"Lato", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"` |
| `--font-family-monospace` | `SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace` |
| `--dark-gray` | `#aaa` |
| `--darker-gray` | `#aaa6a6` |
| `--light-gray` | `#ccc` |
| `--lighter-gray` | `#eee` |
| `--dark-black` | `#222` |
| `--darker-black` | `#111` |
| `--light-black` | `#373c42` |
| `--lighter-black` | `#3e444a` |
| `--light-green` | `#1edd6e` |
| `--brown` | `#555` |
| `--light-brown` | `#8c8686` |
| `--dark-brown` | `#4b4b4b` |
| `--lighter-blue` | `#edf2f6` |
| `--black` | `#000` |
| `--fire-yellow` | `#f7fd37` |
| `--light-blue` | `#40e0d0` |
| `--textarea-bg` | `var(--darker-black)` |
| `--name-color` | `#c0d8ed` |
| `--transparent-gray` | `rgba(255, 255, 255, .331)` |
| `--app-font-family` | `Arial, Helvetica, sans-serif` |
| `--app-link-color` | `#00bc8c` |
| `--avatar-gear-icon-padding` | `5px 5.5px` |
| `--navbar-color` | `#fff` |
| `--navbar-bg` | `#000` |
| `--sidebar-menu-bg` | `#000` |
| `--sidebar-menu-color` | `#ccc` |
| `--sidebar-menu-active-color` | `#f7fd37` |
| `--sidebar-navItem-border-color` | `transparent` |
| `--users-color` | `#fff` |
| `--users-border-color` | `#000` |
| `--presenter-noRecording-color` | `#f7fd37` |
| `--presenter-recording-color` | `#f00` |
| `--textarea-holder-border-color` | `#fff` |
| `--textarea-holder-btns-color` | `#bbb` |
| `--presenter-area-bg` | `#111` |
| `--tab-active-bg` | `#222` |
| `--tabs-color` | `#fff` |
| `--note-tabs-color` | `#00bc8c` |
| `--notes-tabs-bg` | `#111` |
| `--tabs-dropdown-bg` | `#323232` |
| `--tabs-dropdown-color` | `#777` |
| `--tabs-border-color` | `#444` |
| `--session-control-dropdown-bg` | `#222` |
| `--dropdown-divider-bg` | `#e9ecef` |
| `--note-download-bg` | `#00bc8c` |
| `--note-delete-bg` | `#e74c3c` |
| `--note-next-bg` | `#375a7f` |
| `--note-options-color` | `#fff` |
| `--note-options-hover-color` | `#cccc` |
| `--note-options-bg` | `#111` |
| `--note-text-bg` | `#222` |
| `--note-text-color` | `#ccc` |
| `--file-download-bg` | `#00bc8c` |
| `--file-delete-bg` | `#e74c3c` |
| `--file-see-more-bg` | `#375a7f` |
| `--file-list-odd-bg` | `#fff` |
| `--file-list-even-bg` | `#f4f4f4` |
| `--file-name-color` | `#333` |
| `--file-size-color` | `#b2b2b2` |
| `--file-searchbar-color` | `#b7b7b7` |
| `--file-searchbar-icon-color` | `#666666` |
| `--file-searchbar-bg` | `#fff` |
| `--split-gutter-bg` | `#000` |
| `--split-gutter-color` | `#fff` |
| `--msgs-header-color` | `#ccc` |
| `--msgs-header-bg` | `#111` |
| `--msgs-separator-color` | `#373c42` |
| `--msgs-separator-border-color` | `#373c42` |
| `--msgs-separator-bg` | `#e8e8e8` |
| `--archives-dropdown-menu-bg-color` | `#fff` |
| `--archives-dropdown-menu-color` | `#222222` |
| `--rosterImg-border-radius` | `0` |
| `--search-icon-bg-color` | `#adb5bd` |
| `--search-icon-color` | `#222` |
| `--reload-icon-bg-color` | `#00bc8c` |
| `--reload-icon-color` | `#fff` |
| `--users-badge-bg-color` | `#375a7f` |
| `--users-badge-color` | `#fff` |
| `--ptr-website-link-color` | `#00bc8c` |
| `--mobileApp-info-bg-color` | `transparent` |
| `--mobileApp-info-color` | `#676767` |
| `--modal-content-bg-color` | `#303030` |
| `--modal-content-color` | `#fff` |
| `--modal-content-border-color` | `#444` |
| `--modal-tabs-border-color` | `#444` |
| `--modal-active-tab-bg-color` | `#222` |
| `--modal-active-tab-color` | `#00bc8c` |
| `--modal-active-tab-border-color` | `#444` |
| `--checkbox-bg-color` | `#00bc8c` |
| `--modal-btn-hover-opacity` | `.9` |
| `--modal-btn-close-bg` | `#375a7f` |
| `--modal-btn-close-border` | `#375a7f` |
| `--modal-btn-success-bg` | `#00bc8c` |
| `--modal-btn-success-border` | `#00bc8c` |
| `--modal-btn-danger-bg` | `#e74c3c` |
| `--modal-btn-danger-border` | `#e74c3c` |
| `--modal-input-group-bg` | `#444` |
| `--modal-upload-files-color` | `#555` |
| `--modal-alert-link-color` | `#00bc8c` |

## Typography and vendor

- `--app-font-family: Arial, Helvetica, sans-serif !important` — the app overrides the
  Bootswatch body stack (`Lato, -apple-system, …`), so **Lato is loaded but not used** for
  app chrome. Another dead declaration, like the controller's `.muted`.
- Google Fonts: `Lato:400,700,400italic` (four other `@import`s are commented out)
- FontAwesome **5.8.1** via CDN with SRI
- animate.css **3.7.2**
- `html, body { background-color: #fff; overflow: hidden !important }` — the room locks
  scrolling at the document level.
