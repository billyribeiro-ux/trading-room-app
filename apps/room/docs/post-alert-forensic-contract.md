# Post Alert forensic contract

This phase is bounded to the presenter-only `Post Alert` workflow.

## Evidence precedence

1. `docs/source/components/app-post-alert-modal.full.js` defines behavior and capability branches.
2. `app-modals/app-post-alert-modal` and `app-modals/app-post-alert-modal.clean.html` define the captured outer DOM states.
3. `modal` defines the focused inner-dialog state.
4. `docs/source/components/app-post-alert-modal.component.css` defines the component-owned CSS.
5. `css/complete-app-styles.css` is the global CSS SSOT.
6. `toast-container` defines only the singleton idle toast mount in this phase.

The prepared `app-modals/app-post-alert-modal.svelte` is a porting reference, not an authority
when it conflicts with the compiled source. In particular, the compiled source binds both URL
inputs to the same `alertUrl` property.

## Source-pinned behavior

- The constructor initializes `selectedTab` to `text`.
- Opening the modal clears `alertTxt`, `alertUrl`, `imageAlertTxt`, `linkAlertTxt`, and selected
  upload files, and resets `postOnX`. The decoded open handler does not reset `selectedTab`.
- Tabs map from source state as `text` → `text`, `link` → `url`, and `img` → `media`.
- Empty text, empty URL, and empty media submissions abort without invented visible feedback.
- A URL that contains neither `http://` nor `https://` produces the exact Bootbox message:
  `The link seems to be missing "https://" or "http://"`.
- URL captions are followed by `\n`; URL values are followed by one literal space.
- Direct URL/media submissions keep the URL in the source-proven `txt` payload. The local
  `targetUrl` image-rendering adapter is used only after a verified image upload returns
  `data.link`; it is not inferred for an arbitrary Image / GIF / Video URL.
- Multiple uploaded URLs are appended in file order, each preceded by one literal space.
- Legal disclosure is appended as `\n` followed by the editable disclosure text. Its default is
  `FOR EDUCATIONAL PURPOSES ONLY, NOT FINANCIAL ADVICE`.
- Image input and drag/drop accept images. The source renders selected-image previews, hides the
  drop zone, and uploads each file to `{upload_server}/image/{sessionID}` with
  `Authorization: Client-ID {cdn_upload_key}`.
- Image paste from the text area opens the captured `Upload this image?` confirmation before upload.
- `Post on X?` opens or reuses `TweetWindow` at the exact Twitter intent URL and exact
  `width=800,height=800,scrollbars=yes,resizable=yes` feature string.
- `Keep alert window open?` clears entry fields after posting while retaining the open modal.
- The Alert header renders `Poll` and `Post Alert` together only for a presenter.
- This repository targets the supplied staff capture. A browser connection without trusted
  upstream identity headers therefore receives a generated, stable connected-user identity in
  the staff role; its display name is not hardcoded.

## Captured capability boundary

The supplied visible modal includes:

- Keep alert window open
- Post on X
- Don't send to push notification
- Non-trade alert
- Add Legal Disclosure

The compiled component contains additional capability-controlled UI, but the supplied modal state
does not expose SMS, alert labels, linked-room cross-posting, send-later, or scheduled-alert
controls. They are not rendered in this phase.

The local repository has no push-notification or linked-room transport. `dontPush` is retained in
the outgoing client command shape but has no invented local effect. The supplied toast capture is
idle, so this phase does not invent a success toast.
