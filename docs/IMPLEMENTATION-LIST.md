# THE IMPLEMENTATION LIST

Generated 2026-08-15 from the evidence, not from memory. Every row traces to a source named below.

**Owner directive this list serves, verbatim:**

> match everything identically end to end based on hard evidence. after we are all done then we improve

**And the rule that governs it:** nothing unbuilt is ever parked. Blocked, undecided and
needs-capture are NOTES ON a row, never a substitute for one. The only exits are: built, or proven
already built.

---

## Totals

| block | count | source |
| --- | ---: | --- |
| Room settings stored and read by NOTHING | **209** | `room-settings-schema.ts`, rows with `wired: false` |
| Reference wire commands confirmed missing | **25** | `docs/decoded/missing-commands-triage.md` |
| Manage-page action surface, per-user + bulk | **1 surface** | `docs/decoded/enterprise-and-control-plane.md` |
| Named features decoded but unbuilt | **5** | `NEW-TODO.md` |

**The 209 is the headline and it was never enumerated before today.** Each one is a control the
room owner can set on the manage page that changes nothing, because neither application reads it.
Under match-identically every one of them is outstanding.

Counted with the parse asserted at 269 rows (268 extracted + 1 reviewed deviation), so nothing was
silently dropped. An earlier pass of this same count reported 129 because the regex required a
`help:` field that not every row carries — recorded because that is exactly the class of error
this list exists to avoid.

---

## BLOCK 1 — the 209 unwired settings

`wired: false` means neither the room nor the controller reads it. Wiring one means: find its
consumer in the reference, build that, add the name to `ROOM_VISIBLE_SETTINGS` and `ROOM_CONSUMED`,
document a consumer in `room-config-boundary.test.ts`, and regenerate. That is the four-edit
process `hasSwingTradeAlerts` and `hasDayTradeAlerts` already went through.


### section `settings` — 204

| setting | type | manage-page label |
| --- | --- | --- |
| `additionalBadWordsList` | text | Extra Bad list |
| `advancedSearchAlerts` | checkbox | Advanced Search Alerts? |
| `alertLabels` | textarea | Alert Labels |
| `alertSoundOff` | checkbox | Alerts Sound Off? |
| `alertsAutoClear` | checkbox | Auto Clear Alerts? |
| `alertsChatOnBottom` | checkbox | Alerts/Chat on bottom? |
| `alertsOverlayOnScreenshare` | checkbox | Alerts over screenshare? |
| `allRoomsWelcomeMatPW` | textarea | All Rooms Welcome Mat Password |
| `allowPWLoginWithSSO` | checkbox | Allow PW based logins on SSO? |
| `altChatRender` | checkbox | Alt Chat Render? |
| `altCodeAppJS` | textarea | Alt AppJS |
| `altCodeVendorJS` | textarea | Alt VendorJS |
| `altGenChannelName` | textarea | Rename \ |
| `altOffTopicChannelName` | textarea | Rename \ |
| `altRoomRender` | checkbox | Alt Room Render? |
| `alt_roomjs` | textarea | Alt Room.js |
| `alwaysShowRoster` | checkbox | Always Show User Roster? |
| `apiSecret` | textarea | API secret |
| `archiveAlertsLog` | checkbox | Archive Alerts? |
| `archiveChatLog` | checkbox | Archive Chatlog? |
| `audioMeterDisabled` | checkbox | Disable Audio Meter? |
| `autoCloseTime` | textarea | Auto Close Room Time |
| `autoOpenTime` | textarea | Auto Open Room Time |
| `autoRecord` | checkbox | Auto record presenters? |
| `autoResetSession` | checkbox | Autoreset sess at 12am? |
| `autoSwitchToOfftopics` | checkbox | Auto switch to OffTopic Channels/Tabs? |
| `backupClusterID` | text | Backup ClusterID |
| `backupMediaMTXClustterID` | text | Backup MediaMTX ClustterID |
| `banIPList` | textarea | Ban IP list |
| `blinkingRec` | checkbox | Blinking [REC]? |
| `chatAutoClear` | checkbox | Auto Clear Chat? |
| `chatAutoClearSpecialHour` | textarea | Overwrite Clear Hour: |
| `chatAutoClearWeekend` | checkbox | Auto Clear Chat Weekend? |
| `chatDisabledForTrials` | checkbox | Chat Disabled For Trials? |
| `chatFloodDisabled` | checkbox | Disable Chat Flood? |
| `chatServerURL` | textarea | Talk URL |
| `chatTabsWithBadges` | textarea |  |
| `clusterID` | text | ClusterID |
| `collectsUserStats` | checkbox | UserXrefStats? |
| `copyTrades` | checkbox | Copy Trades? |
| `custLogoutURL` | textarea | Custom Logout URL |
| `custRoomDriveURL` | textarea | Custom Room Drive URL |
| `customCSS` | textarea | Custom CSS |
| `customClientAlertPostSecret` | textarea | Custom Alert secret |
| `customClientAlertPostURL` | textarea | Custom Alert POST |
| `customFaviconURL` | textarea | Custom Favicon |
| `customJWTErrorMessage` | textarea | Custom JWT Error Message |
| `customJanus` | textarea | Alt JanusJS |
| `customMobileAppLaunchWord` | textarea | Custom App launch Word |
| `customMobileAppV3Name` | textarea | Custom app String |
| `customPlayerURL` | text | Custom Player URL |
| `customUserInfoURL` | text | Custom User Info Page |
| `darkThemeAsDefault` | checkbox | Set Dark Theme As Default? |
| `darkThemeStyle` | textarea | Dark Theme Style |
| `deleteAlertPW` | textarea | Delete Alert Password |
| `diasableFCMAlerts` | checkbox | Disable PUSH Alerts? |
| `disableEmojis` | checkbox | Disable Emojis? |
| `disalowMultiLogins` | checkbox | Disalow Multi-logins? |
| `disalowSporadicMultiLogins` | checkbox | Prevent sporadic reconnects? |
| `doNotAutoSoftReset` | checkbox | Don't Soft reset at 12am? |
| `dontFollowPresenters` | checkbox | Don't follow Presenters? |
| `dontShowRecInfoToUsers` | checkbox | Hide recordings info for users? |
| `dontStopRecOnMicMute` | checkbox | Don't stop on mute? |
| `downloadRecordingsDisabled` | checkbox | Disable download button for Recordings for users? |
| `enableDeleteLog` | checkbox | Enable Delete Log? |
| `enableDiscord` | checkbox | Enable Discord? |
| `enableEditAlerts` | checkbox | Enable Edit Alerts? |
| `enableEditMessage` | checkbox | Enable Edit Messages? |
| `enableLiveStats` | checkbox | Live User stats? |
| `enablePrivateMessageHistory` | checkbox | Enable Private Message History? |
| `enableQAReactions` | checkbox | Enable QA Reactions? |
| `enableReactions` | checkbox | Enable Reactions? |
| `enableTokenBadges` | checkbox | Token Badges? |
| `enableVideoPlayer` | checkbox | Enable VideoPlayer? |
| `extraAdminChannels` | textarea | Extra Admin Channels |
| `extraRegChannels` | textarea | Extra Regular Channels |
| `fileAccessCaseByCase` | checkbox | Shared Files Access Case/Case? |
| `force_jpeg_screenshare` | checkbox | Force JPG Screens |
| `force_mp3_audio` | checkbox | Force MP3 Audio |
| `forgotRoomPassword` | checkbox | Forgot room password? |
| `generateRandomUDPPort` | checkbox | Random UDP port fix? |
| `h264Enabled` | checkbox | Use h264 codec? |
| `hasAdminOnlyChannel` | checkbox | Admin Channels/Tabs |
| `hasAlertScheduler` | checkbox | Enable alert scheduler? |
| `hasAppPairLink` | checkbox | Pair Link For App? |
| `hasChannelTabs` | checkbox | OffTopic Channels/Tabs |
| `hasProfanityFilter` | checkbox | Chat Profanity filter? |
| `hasQAOnAlerts` | checkbox | Q&A on Alerts? |
| `hasSpeechRecognitionDisabled` | checkbox | Disable Closed Captioning? |
| `hasTypingIndicator` | checkbox | Show typing indicator ? |
| `hasYTStreaming` | checkbox | Enable FB Live/YouTube Live |
| `hideLogo` | checkbox | Hide Logo |
| `hideNotes` | checkbox | Hide Notes Section? |
| `hideWebcamForRoom` | checkbox | Hide WebCam in the room? |
| `hqVideo` | checkbox | Use HQ Video? |
| `iframeSSOTFix` | checkbox | Iframe Cookie Fix? |
| `ignoreAutoOpenCloseOnWeekend` | checkbox | Ignore Auto Open & Close On Weekend |
| `imgurApiKey` | text | Imgur api key: |
| `imgurClientID` | text | Imgur ClientID: |
| `imgurRapidKey` | textarea | Imgur rapid key: |
| `ingnoreBadWordsList` | text | Ignore List |
| `invalidTokens` | textarea | Invalid Tokens |
| `isAlertOnly` | checkbox | Alerts only Room? |
| `isArchivedRoom` | checkbox | Is Archived Room? |
| `isLocked` | checkbox | Lock Session? |
| `isMainRoom` | checkbox | Is Main Room? |
| `isNewIndicatorOn` | checkbox | Is New Room? |
| `linkedRoomAlerts` | textarea | Linked Rooms for alerts |
| `linkedRoomDayTradeAlerts` | textarea | Linked Rooms for Day Trade Alerts |
| `linkedRoomDayTradeAlertsOther` | textarea | SessionID to load day trade alerts from |
| `linkedRoomRecordings` | textarea | Linked Rooms for Recordings |
| `linkedRoomSwingAlerts` | textarea | Linked Rooms for Swing Alerts |
| `linkedRoomSwingAlertsOther` | textarea | SessionID to load swing alerts from |
| `linkedStreamsAPIKey` | textarea | Other Room API Secret: |
| `login_webhook_url` | textarea | Login Webhook URL |
| `logout_webhook_url` | textarea | Logout Webhook URL |
| `mediaMTXClusterID` | text | MediaMTX ClusterID |
| `media_fir_rate` | text | ScreenShare KeyFrame Rate (i.e. 5, 10, 15) |
| `media_max_bitrate` | text | ScreenShare MAX BitRate |
| `media_relays` | textarea | Repeater List |
| `mobileAppExpireNotificationsDays` | number | Push expire days |
| `modAdminLoginList` | textarea | Admin panel access list: |
| `modAlertFilterList` | textarea | Alert filter list for mods: |
| `modMessage` | textarea | Moderator Message: |
| `needPasswordForUserNotes` | textarea | Password to Manage User's Notes |
| `node_media_relays` | textarea | Node Repeater List |
| `node_ws_media_relays` | textarea | Node Websocket Repeater List |
| `nqNewsFeedURL` | textarea | NQ News URL |
| `obsBroadcastRoom` | checkbox | Broadcast using OBS? |
| `obsStreamKey` | text | OBS Stream Key |
| `obsStreamSatusWebHookURL` | text | OBS Stream Satus WebHook URL |
| `openLoginLink` | textarea | Open link on login? |
| `pairErrorRedirect` | textarea | Pair ERROR Redirect |
| `pairOKRedirect` | textarea | Pair OK Redirect |
| `pairSecretKey` | textarea | Pair Secret Key |
| `playChatMessageSoundFor` | textarea | Chat Message Sound For Emails: |
| `positionsIframe` | checkbox | Enable positions iframe? |
| `positionsIframeUrl` | textarea | Positions Iframe Url |
| `privMessageHugePopup` | checkbox | Huge Priv Msg Alert? |
| `protextingGroupIDs` | text | Protexting GroupID |
| `protextingSecretTok` | text | Protexting Token |
| `ptrMobileAppCaseByCaseEnabled` | checkbox | App for Some Members? |
| `ptrMobileAppExpirePairCodeDays` | number | PTR app exp days |
| `recordChat` | checkbox | Record alerts and chat? |
| `recordingReminder` | checkbox | Recording Reminder If Speaking? |
| `recsInRoom` | checkbox | Show Recordings tab in the room? |
| `regUserCanPresent` | checkbox | Auto give Mic/Screen to Users? |
| `remToken` | checkbox | Remove token from url |
| `remote_recording` | checkbox | NEW recording procedure? |
| `reportEmail` | textarea | Report emails |
| `restreamToURL` | text | Restream URL |
| `restreamToURLKey` | text | Restream Key |
| `roomType` | select | Room Type |
| `runawayRecAutoKill` | checkbox | Auto stop recording if inactive? |
| `runawayRecMinutes` | number | Minutes of recording inactivity? |
| `runawayRecPostURL` | textarea | Slack url to post |
| `s3Bucket` | text | S3 Bucket |
| `s3BucketFolderPath` | text | S3 Bucket subfolder/path |
| `s3KeyID` | text | S3 Key ID/Name |
| `s3KeySecret` | text | S3 Key Secret |
| `salesBanner` | textarea | Sales Banner |
| `saveRecsToS3` | checkbox | Save Recs to AWS S3 |
| `saveRecsToVimeo` | checkbox | Save Recs to Vimeo |
| `saveWebinarModeChat` | checkbox | Preserve Webinar Mode chat? |
| `secTok` | textarea | Secret Token: |
| `sendFcmAlertsNew` | checkbox | New FCM Method? |
| `sendOpenCloseEmail` | textarea | Open/Close Room emails |
| `sendReportEmails` | checkbox | Send report email? |
| `showOnlyUsernames` | checkbox | Show Only Usernames in Roster? |
| `simplifiedEditor` | checkbox | Simplified Note Editor? |
| `slackPostURL` | textarea | Slack post URL secret |
| `smallerImagePreview` | checkbox | Smaller image previews? |
| `stAppScheduleID` | text | Scheudle ID (GCal) |
| `stickyGiveMicAndCam` | checkbox | Sticky give Mic/Cam? |
| `streamingThreads` | checkbox | Streaming Threads? |
| `strictBrowserMode` | checkbox | Strict Browser? |
| `stripeEmail` | textarea | Stripe Email: |
| `styckyNonTradeAlert` | checkbox | Sticky Non-Trade Alerts? |
| `subscriptionPlans` | textarea | Subscription Plans: |
| `superClusterExpectedServerCount` | number | Super Cluster Expected Server Count |
| `superClusterID` | text | Super ClusterID |
| `tipMeBtnEnabled` | checkbox | Enable Tip Me Button? |
| `tipMeBtnTxt` | textarea | Tip Me Button Text |
| `tipMeBtnUrl` | textarea | Tip Me Button Url |
| `twilioPhone` | text | Twillio Phone |
| `twillioApiSID` | text | Twillio SID |
| `twillioApiToken` | text | Twillio Token |
| `useFFmpegRecording` | checkbox | Use FFmpeg for Recording (BETA) |
| `useLessBusyVsRoundRobin` | checkbox | Use Less busy server algo vs round robin |
| `useV3` | checkbox | Use v3? (DON'T!) |
| `useV5` | checkbox | Use v5? (DON'T!) |
| `usersCanDeleteOwnMsgs` | checkbox | Users Can Delete Own Messages? |
| `usersPublicReply` | checkbox | User Public Reply? |
| `vimeoClientID` | text | Vimeo ClientID |
| `vimeoClientSecret` | text | Vimeo Secret |
| `vimeoFolderPath` | text | Vimeo Folder ID (optional) |
| `vimeoToken` | text | Vimeo Token |
| `vp9Enabled` | checkbox | Use VP9 codec? |
| `webinarPW2` | textarea | Temp Room Password: |
| `webinarPW3` | textarea | Temp Room Password 2: |
| `webinarPWFreeTrial` | textarea | Free Trial Password: |
| `x264_encArgs` | text | Custom Rec Params |
| `xuserAccessToken` | textarea | X User Access Token: |
| `xuserAccessTokenSecret` | textarea | X User Access Token Secret: |

### section `room-form` — 3

| setting | type | manage-page label |
| --- | --- | --- |
| `authMode` | select | Authorization Mode |
| `name` | text | Room Title |
| `webinarDate` | combodate | Date: |

### section `sso-setup` — 1

| setting | type | manage-page label |
| --- | --- | --- |
| `ssoHost` | text | SSO Host |

### section `branding` — 1

| setting | type | manage-page label |
| --- | --- | --- |
| `description` | html | Login Landing Page Editor |

---

## BLOCK 2 — the 25 confirmed-missing wire commands

Every one read at every occurrence in the bundle, then put through an adversarial pass that killed
8 of 34 claims. Payloads, gates and verbatim strings are in the triage document.

| command | occurrences | size |
| --- | ---: | --- |
| `kickUser` | 11 | medium |
| `playYTForAll` | 9 | small |
| `stopYTForAll` | 8 | small |
| `doChatLogSearch` | 8 | medium |
| `stopVideoForAll` | 7 | small |
| `playVideoForAll` | 7 | medium |
| `remoteRestartAudio` | 7 | small |
| `sendUsersToURL` | 7 | small |
| `focusOnSessionNote` | 7 | small |
| `sendSalesImageToChat` | 7 | small |
| `archiveLogs` | 6 | large |
| `unmuteChat` | 5 | small |
| `getDebugLog` | 4 | medium |
| `notyping` | 3 | medium |
| `presAreaTabs-recordings` | 3 | small |
| `restoreMobileAppTokens` | 3 | medium |
| `stopRecMsg` | 3 | trivial |
| `unarchiveLogs` | 2 | medium |
| `editQAMessage` | 2 | small |
| `updateProfilePic` | 2 | medium |
| `forceStopScreen` | 1 | medium |
| `stopOBStream` | 1 | trivial |
| `setUserProfilePic` | 1 | medium |
| `updateUserProfilePic` | 1 | small — once a stored pictur |
| `streamPlayerDisabled` | 1 | medium — it needs the player |

**Five of these are the SaaS operator toolkit** — `resetMediaServer`, `resetAllMediaServers`,
`resetAudioBridge`, `resetAudioBridgeOnServer`, `getMyRepeater` — and they travel on a separate
`adminCmd` channel. Six of the wider reset/diagnose family are already built.

---

## BLOCK 3 — the manage-page action surface

Decoded from the manage-page DOM with all 18 dropdowns captured OPEN. **None of it is built.**

- **Per-user menu** — `updateUserXref` codes 1-14, four submenus (Permissions, Granular Perms,
  App and Notifications, Badges), Set Note, Edit Username, Remove User, Set/Change Password,
  Resend Welcome Email, Pause/Pending
- **Permissions modal** — `hasMic`, `hasScreen`, `hasCam`, `hasAdminChat`, `canEditNotes`
- **Bulk menu** — `updateUserXrefMulty`, `applyToAllRooms`, email-list actions
- **User-list filters** — Free Trials, BANNED, Mobile, Non-Mobile, Presenters, Marketplace Users
- **API key restrictions** — `restrictToSessions`, `restrictToEndpoints`
- **Admin users** — `/users/v1/adminusers` list/add/remove with an opaque `perms` object

> ⚠ **THE ROLE-NUMBER TRAP.** `10` is *Hide Pers User Data* per user and **` Remove All`** in bulk.
> Different commands, different vocabularies. One shared enum would turn a privacy toggle into a
> mass delete. Code `12` is unobserved in either menu.

---

## BLOCK 4 — named features decoded and unbuilt

| feature | spec | state |
| --- | --- | --- |
| Alert Filter | `alert-scheduler-filter-labels.md` §2 | **building now** |
| Alert Labels | `alert-scheduler-filter-labels.md` §3 | **building now** |
| Alert Scheduler | `alert-scheduler-filter-labels.md` §1 | needs an entitlement whose manage control was NOT located, and a server-side scheduler |
| Benzinga News | `NEW-TODO.md` §2.2 | needs one decode pass for the const-table classes |
| Mobile app | `NEW-TODO.md` §2.5 | after `docs/MOBILE-APP.md` is read |
| `presAreaTabs-recordings` | `missing-commands-triage.md` | **NOT BUILT, blocker named** — the pane is one iframe onto a server archive page and we have zero recordings tables |

---

## Order of work

1. **Alert Filter + Alert Labels** — in flight.
2. **The divergence register** — in flight. It gates every match-identically decision, so it lands
   before the bulk settings work starts.
3. **BLOCK 1 by section**, largest first. `settings` at 204 is the bulk of the remaining app.
4. **BLOCK 3**, the manage-page surface — one coherent feature, and the role-number trap makes it
   the riskiest to do casually.
5. **BLOCK 2** wire commands, by cluster: moderation, then archives, then broadcast media.
6. **BLOCK 4** remainder.

The superadmin / enterprise layer is parked by the owner until the app is finished. Its decode is
complete in `docs/decoded/enterprise-and-control-plane.md`, with the Marketplace pane named as the
one surface never opened.

## What is NOT on this list, and why

- **Improvements.** `NEW-TODO.md` Part 1 — live entitlement re-checks and one-session-per-account —
  are deliberate divergences FROM the reference. The directive is match first, improve after.
- **The 4 NOISE identifiers** from the triage: hls.js and Angular animation internals, never ours.
- **`vendor.min.js`, 1.25 MB** — classified third-party and unread. That is a judgement, not a
  measurement, and it is recorded as a gap rather than as a decision.