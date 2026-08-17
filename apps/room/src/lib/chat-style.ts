import type { FollowChatStyle, Theme } from '#lib/types.js';

/*
  THE TWO CAPTURED CHAT STYLES, which are NOT the same object and must never share a function.

  Both are pure functions of the theme, and both were on `+page.svelte` until 2026-08-17 — 68 lines
  of literal colours in a component, checked by nothing but a source-text slice.

  ## The defect that made these two functions instead of one

  They WERE one function, and it returned the FOLLOW default. `RoomMessage` applies the global style
  inline to every chat message with no colour of its own, and an inline style beats every stylesheet
  rule — so every chat message carried `background-color: #ffffff` while alerts sat on `#e8e8e8`.
  Chat was white, alerts were grey, and the two were supposed to match.

  That is why `alerts-background-contract.test.ts` asserts one does not call the other, and why the
  split is expressed as two exported functions rather than one with a flag: a flag is one edit away
  from being defaulted wrong again.

  ## Why they are PURE, and why that is the point of moving them

  `defaultFollowChatStyle` used to take no argument and read `theme` from the page's scope. It now
  takes the theme, which is what makes both of them testable by VALUE rather than by reading their
  source. Every number below is a captured measurement; a unit test can compare them to the capture
  and a `toContain` cannot.
*/

/**
 * `globals.chatStyle` — the ROOM's chat and alert style, verbatim:
 *
 * ```js
 * this.chatStyle = {
 *   lightTheme:{color:"#1a1a1a",tickerColor:"#1a1a1a",usernameColor:"#365d7d",bgColor:"#e8e8e8",fontSize:"13"},
 *   darkTheme: {color:"#f7fd37",tickerColor:"#f7fd37",usernameColor:"#c0d8ed",bgColor:"#000",  fontSize:"13"}}
 * ```
 *
 * `this.alertStyle` is the SAME object upstream, which is why an alert and a chat message share a
 * background in the capture. This is NOT the follow-a-user style — see {@link defaultFollowChatStyle}.
 */
export function defaultChatStyleForTheme(theme: Theme): FollowChatStyle {
  return theme === 'light'
    ? {
        color: '#1a1a1a',
        tickerColor: '#1a1a1a',
        usernameColor: '#365d7d',
        bgColor: '#e8e8e8',
        fontSize: 13,
        playSound: true
      }
    : {
        color: '#f7fd37',
        tickerColor: '#f7fd37',
        usernameColor: '#c0d8ed',
        bgColor: '#000000',
        fontSize: 13,
        playSound: true
      };
}

/**
 * The FOLLOW-a-user style, a different captured default:
 *
 * ```js
 * "lightTheme" === preferences.theme
 *   ? {color:"#1a1a1a",tickerColor:"#1a1a1a",usernameColor:"#365d7d",bgColor:"#ffffff",fontSize:14,playSound:!0}
 *   : {color:"#f7fd37",tickerColor:"#f7fd37",usernameColor:"#c0d8ed",bgColor:"#000000",fontSize:14,playSound:!0}
 * ```
 *
 * White and 14px, where the room style is `#e8e8e8` and 13px. A followed user's messages are meant
 * to STAND OUT from the rest, so the two must not share one function.
 */
export function defaultFollowChatStyle(theme: Theme): FollowChatStyle {
  return theme === 'light'
    ? {
        color: '#1a1a1a',
        tickerColor: '#1a1a1a',
        usernameColor: '#365d7d',
        bgColor: '#ffffff',
        fontSize: 14,
        playSound: true
      }
    : {
        color: '#f7fd37',
        tickerColor: '#f7fd37',
        usernameColor: '#c0d8ed',
        bgColor: '#000000',
        fontSize: 14,
        playSound: true
      };
}
