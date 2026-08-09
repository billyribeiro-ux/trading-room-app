# `app-st-message` forensic contract

This phase uses four pinned evidence layers:

1. `app-room/complete.html` is the preserved raw full-room DOM and the whitespace authority for the 18 populated message nodes.
2. `src/lib/server/captured-message-fixture.json` is its mechanical extraction. `pnpm capture:messages-sync` regenerates it from that pinned raw source.
3. `alert-section/1.html` is the formatter-produced working reference. It is not the fixture source because formatting changes whitespace inside `.preText` message bodies.
4. `docs/source/components/app-st-message.full.js` and `app-st-message.render-helpers.js` define conditional branches and handlers.
5. `css/complete-app-styles.css` is the styling SSOT. Runtime selectors are bridged by `src/lib/styles/captured-runtime-components.css`; component CSS is not re-authored.

## Precedence

- Concrete captured DOM controls the visible menu for captured messages.
- Compiled conditions control live messages and branches absent from the captured session.
- Missing session values remain disabled. The decoded existence of a branch does not prove that its flag was enabled.
- Svelte/Drizzle transport code may adapt the source event bus, but it may not add labels, states, or user-facing outcomes that are absent from evidence.

## Render branches

| Evidence condition                                | Render result                                                                       |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `msg.isA && logType !== 'alert'`                  | Admin chat row, `msg-box-adm`, reversed row/avatar order, timestamp before username |
| Otherwise                                         | Forward row, username before chat timestamp or alert metadata                       |
| New calendar day                                  | `.separator > a` with the full date                                                 |
| `!isQAMsg && hasQAOnAlerts`                       | Alert question button                                                               |
| `msg.ans && logType !== 'alerts'`                 | Chat answered check                                                                 |
| `msg.repl`                                        | Private/public reply block                                                          |
| Existing reaction map and enabled reaction branch | Reaction badges plus hover add control                                              |

The populated DOM contains 8 Alert messages, 10 Chat messages, 2 separators in each panel, 6 reversed admin Chat rows, 4 question-colored Chat rows, 1 uploaded Alert image, and 3 stock spans.

## Menu order and gates

1. Presenter delete; Mute follows only for a non-admin message.
2. Non-presenter own-delete is the alternative delete branch.
3. Divider follows whichever delete branch rendered.
4. User Info.
5. Mention.
6. Show message to all: presenter and not limited presenter.
7. Alert Send Report: presenter Alert.
8. Reply: Chat, different author, and presenter or `usersPublicReply`.
9. Mark Answered: presenter Chat.
10. Add Reaction: enabled Chat reactions, or enabled Alert QA reactions on a QA message.
11. Edit: the exact source edit flags and ownership rules.
12. Copy: Alert.
13. Private Chat: presenter/user PM rules, suppressed for a trial user when trial PM is disabled.

## Exact action outcomes

- Kebab text: `⠇ `.
- Mute confirmation: `Are you sure you want to mute this user for 24 hours?`
- Mute success: `User chat muted.`
- Missing user: `Could not retrieve user info.`
- Copy toast: `Copied to clipboard.`
- Presenter delete and own-delete confirmation strings are pinned in `DIRECT_EVIDENCE_CONTRACT.appStMessage`.
- Shift-click bypasses the delete confirmation.
- Reactions toggle the connected user email hash in `clickedBy`.
- Private Chat hands the exact selected message identity to `app-privchat`.

## Captured-row transport

Captured messages are source evidence, not fabricated database rows. Their visible state is left byte-for-byte reproducible on load. In-session delete, answered, edit, and reaction actions use a client overlay; replies create a real Drizzle Chat row carrying the captured sender/body reply context. This avoids inventing persistent users or messages while keeping the demonstrated controls functional.

## Known evidence conflict resolved

The decoded component constant table includes an unused `pe-3 w-100` body-class variant. Every one of the 18 populated nodes and all four isolated message dumps render `msg-left text-formated preText ml-2 mr-2 p-0` without those classes. The concrete DOM wins, so those classes are not added.
