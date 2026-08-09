# Do Not Disturb forensic contract

Source authority:

- `docs/source/main.d6d3c112b59b7d0d.js`
- `docs/source/components/app-room.full.js`
- `docs/source/components/app-alerts.full.js`
- `docs/source/components/app-chat.full.js`
- `docs/source/components/app-privchat.full.js`
- `docs/source/components/app-user-settings-modal.full.js`
- `docs/source/components/app-roomscroller.full.js`
- `docs/source/components/app-ytplayer.full.js`
- `docs/source/components/app-streaming-view.full.js`
- `css/complete-app-styles.css`

Verified behavior:

1. `preferences.doNotDisturbOn` is the single global DND state and defaults to `false`.
2. The application loads its entire preference object from `prefs-${sessionID}`.
3. The direct DND handlers toggle the global flag. They do not call `setPreference`, show a toast, open a confirmation, or send a server command.
4. The Volume dropdown and the App tab inside General Settings both expose the `app-donot-disturb` checkbox.
5. Master `Mute` sets volume to zero, turns DND on, turns subtitles on, and applies the current master volume to background audio. `Unmute` restores the previous volume and turns DND and subtitles off.
6. DND inserts these conditional header nodes:
   - Alerts: `badge badge-danger ms-2`
   - Chat: `badge badge-danger ml-2`
   - Private Chat: `badge badge-danger ml-2`
   - All three contain `fas fa-bell-slash` and the literal text `DND`.
7. DND suppresses alert sounds, alert popup toasts and alert browser notifications; chat mention sounds/toasts/browser notifications; ordinary followed/chat sounds; private-chat sounds/toasts/browser notifications; poll sounds; recording transition sounds; and user join/leave sounds.
8. DND does not globally suppress all informational UI. For example, copy confirmation and several reaction/join/leave informational toasts live outside the DND guards.
9. New YouTube embeds add `&mute=1` while DND is active. New HLS streams start at volume zero while DND is active.
10. There is no DND-specific modal component in the decoded root component inventory. DND is a section of the General Settings modal.

Run `pnpm capture:dnd-source` to verify every source and implementation assertion.
