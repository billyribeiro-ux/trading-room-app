// @vitest-environment jsdom
import { flushSync } from 'svelte';
import { describe, expect, it } from 'vitest';

import { EXTRA_COMPOSER, RoomChat } from './chat.svelte';
import { unreadFor, withoutChannel } from './chat-tab-unread';

/*
  The seventh room state class. The reactivity block at the bottom is the only gate that can see the
  thing most likely to go wrong — mutations and flushes INSIDE `$effect.root`, assertions OUTSIDE.
*/

/** The extra column's preference as a mutable fixture, because it can be toggled mid-session. */
const roomWith = (extraColumn: boolean) => {
  const prefs = { extraColumn };
  const chat = new RoomChat({ extraColumnEnabled: () => prefs.extraColumn });
  return { chat, prefs };
};

/**
 * THE OFF-TOPIC SEED, and why it is a value rather than a thunk.
 *
 * `ngOnInit: sessData.autoSwitchToOfftopics && (this.channel = "offTopic", …)` — byte 1,407,102, read
 * ONCE when the component initialises. This class reads it once too, in its constructor, and both
 * assertions below are about the difference between that and a derivation: the tab must move when
 * the room asks, and must still be movable back afterwards.
 *
 * The extra column has the same clause upstream at 2,359,803, gated on `preferences.extraChatColumn`
 * — and it is a no-op in both applications, because that column already defaults to off-topic. Its
 * default is asserted here so nobody wires the setting a second time into a column that is already
 * there.
 */
describe('the off-topic seed', () => {
  it('leaves the main column on main when the room says nothing', () => {
    expect(roomWith(false).chat.tab).toBe('main');
  });

  it('opens the main column on off-topic when the room asks', () => {
    const chat = new RoomChat({ extraColumnEnabled: () => false, autoSwitchToOffTopic: true });
    expect(chat.tab).toBe('off-topic');
  });

  /*
    A SEED, not a lock. If this were a `$derived` the member could not get back to the main channel,
    and the column would re-switch on every five-second invalidate.
  */
  it('is still a tab the member can move', () => {
    const chat = new RoomChat({ extraColumnEnabled: () => false, autoSwitchToOffTopic: true });
    chat.tab = 'main';
    expect(chat.tab).toBe('main');
  });

  it('leaves the EXTRA column alone, because it already defaults to off-topic', () => {
    expect(roomWith(true).chat.extraTab).toBe('off-topic');
    const seeded = new RoomChat({ extraColumnEnabled: () => true, autoSwitchToOffTopic: true });
    expect(seeded.extraTab).toBe('off-topic');
  });
});

describe('the mention router, which reads three fields to answer one question', () => {
  /*
    `preferences.extraChatColumn && (this.extraChatMsg || 'textAreaTxtExtra' === globals.chatInputFocus)`

    The truth table is small enough to state in full, and stating it in full is the point: the
    second term is the one that is easy to miss, and missing it puts a mention in the pane the
    viewer is not looking at.
  */
  it('a room with ONE column never routes to the extra composer', () => {
    const { chat } = roomWith(false);
    expect(chat.mentionTargetIsExtra(false)).toBe(false);
    expect(chat.mentionTargetIsExtra(true), 'even when the click came from there').toBe(false);

    chat.focused(EXTRA_COMPOSER);
    expect(chat.mentionTargetIsExtra(false), 'and even if focus somehow says otherwise').toBe(
      false
    );
  });

  it('a click INSIDE the extra column routes there', () => {
    // `extraChatMsg` is true for every row that column renders.
    const { chat } = roomWith(true);
    expect(chat.mentionTargetIsExtra(true)).toBe(true);
  });

  it('and so does a click in the MAIN log while you were typing in the extra one', () => {
    /*
      The term that is easy to miss. Without it, clicking a name in the main log while composing in
      the extra column inserts into the pane you are not looking at — which reads as the button
      doing nothing.
    */
    const { chat } = roomWith(true);
    expect(chat.mentionTargetIsExtra(false), 'focus is still the main composer').toBe(false);

    chat.focused(EXTRA_COMPOSER);
    expect(chat.mentionTargetIsExtra(false)).toBe(true);
  });

  it('and focus moving back reverses it', () => {
    const { chat } = roomWith(true);
    chat.focused(EXTRA_COMPOSER);
    chat.focused('textAreaTxt');
    expect(chat.mentionTargetIsExtra(false)).toBe(false);
  });

  it('the preference is read LIVE, so turning the column on mid-session works', () => {
    /*
      The reason the constructor takes a thunk rather than a boolean. A copy would be the value as
      of construction, and the settings modal can turn the second column on at any point — after
      which every mention would keep routing to the main composer, because this class was still
      holding `false` from page load.
    */
    const { chat, prefs } = roomWith(false);
    chat.focused(EXTRA_COMPOSER);
    expect(chat.mentionTargetIsExtra(false)).toBe(false);

    prefs.extraColumn = true;
    expect(chat.mentionTargetIsExtra(false)).toBe(true);
  });
});

describe('the insert, which is the reference’s own and differs by a space', () => {
  it('an empty composer gets no leading space', () => {
    // `i.length ? val(i + ' @' + e + ' ') : val('@' + e + ' ')`.
    const { chat } = roomWith(true);
    chat.mention('Allison', false);
    expect(chat.composer).toBe('@Allison ');
  });

  it('a composer with text gets one', () => {
    const { chat } = roomWith(true);
    chat.composer = 'hey';
    chat.mention('Allison', false);
    expect(chat.composer).toBe('hey @Allison ');
  });

  it('TWO consecutive mentions produce a double space, which is the reference’s own', () => {
    /*
      Pinned rather than fixed, and this test was written the other way round first.

      `i.length ? val(i + ' @' + e + ' ') : val('@' + e + ' ')` appends a separator whenever there is
      already content — and after the first mention there always is, ending in the trailing space
      the first insert added. So the reference produces `@Allison  @Bob `, with two spaces, and so
      does this.

      It looks like a typo and it is not: collapsing it would be a divergence from the capture in
      the one place a reader would never think to check, and the extra space is invisible in the
      rendered message anyway. Asserted explicitly so nobody tidies it without deciding to.
    */
    const { chat } = roomWith(true);
    chat.mention('Allison', false);
    chat.mention('Bob', false);
    expect(chat.composer).toBe('@Allison  @Bob ');
  });

  it('writes to the extra composer and leaves the main one alone', () => {
    const { chat } = roomWith(true);
    chat.composer = 'main draft';
    chat.mention('Allison', true);

    expect(chat.extraComposer).toBe('@Allison ');
    expect(chat.composer, 'the other pane must not be touched').toBe('main draft');
  });

  it('and REPORTS which composer it wrote to, so only the main one takes the caret', () => {
    /*
      The decision/effect split. The class cannot focus an element, and the page should not have to
      re-derive which composer was the target in order to know whether to. Upstream gives the extra
      column no focus treatment either.
    */
    const { chat } = roomWith(true);
    expect(chat.mention('Allison', false), 'main').toBe(true);
    expect(chat.mention('Bob', true), 'extra').toBe(false);
  });
});

describe('clearing, and taking', () => {
  it('a send clears its own composer and never the other', () => {
    const { chat } = roomWith(true);
    chat.composer = 'main';
    chat.extraComposer = 'extra';

    chat.clear('textAreaTxt');
    expect([chat.composer, chat.extraComposer]).toEqual(['', 'extra']);

    chat.extraComposer = 'extra';
    chat.clear(EXTRA_COMPOSER);
    expect([chat.composer, chat.extraComposer]).toEqual(['', '']);
  });

  it('take() trims and clears in ONE step', () => {
    /*
      The rich-text editor opens on the current draft. Two copies of the same half-written message —
      one in the modal, one behind it — is a message sent twice, so the read and the clear cannot be
      separated by anything that might return early between them.
    */
    const { chat } = roomWith(true);
    chat.composer = '  hello  ';
    expect(chat.take('textAreaTxt')).toBe('hello');
    expect(chat.composer).toBe('');
  });

  it('and takes from the column it was asked for', () => {
    const { chat } = roomWith(true);
    chat.composer = 'main';
    chat.extraComposer = '  extra  ';

    expect(chat.take(EXTRA_COMPOSER)).toBe('extra');
    expect(chat.extraComposer).toBe('');
    expect(chat.composer, 'the main draft survives').toBe('main');
  });
});

describe('the two channels', () => {
  it('open on main and off-topic, which is the reference’s pairing', () => {
    // `this.channel = 'offTopic'` in `app-extra-chat`; `app-chat` defaults to `main`.
    const { chat } = roomWith(true);
    expect([chat.tab, chat.extraTab]).toEqual(['main', 'off-topic']);
  });

  it('and switch independently, so one column cannot drag the other', () => {
    const { chat } = roomWith(true);
    chat.tab = 'off-topic';
    expect(chat.extraTab, 'still its own channel').toBe('off-topic');
    chat.extraTab = 'main';
    expect(chat.tab).toBe('off-topic');
  });
});

describe('the getters are REACTIVE, which no other gate can see', () => {
  it('re-runs a reader as the main composer is typed into', () => {
    const { chat } = roomWith(true);
    const seen: string[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(chat.composer);
      });
      flushSync();
      chat.mention('Allison', false);
      flushSync();
      chat.clear('textAreaTxt');
      flushSync();
    });
    stop();

    expect(seen, 'the composer is not reactive').toEqual(['', '@Allison ', '']);
  });

  it('and as focus moves between the two, which is what the router reads', () => {
    const { chat } = roomWith(true);
    const seen: boolean[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(chat.mentionTargetIsExtra(false));
      });
      flushSync();
      chat.focused(EXTRA_COMPOSER);
      flushSync();
      chat.focused('textAreaTxt');
      flushSync();
    });
    stop();

    expect(seen, 'the focus flag is not reactive').toEqual([false, true, false]);
  });

  it('and as a channel changes, which re-derives both message lists', () => {
    const { chat } = roomWith(true);
    const seen: string[] = [];

    const stop = $effect.root(() => {
      $effect(() => {
        seen.push(chat.extraTab);
      });
      flushSync();
      chat.extraTab = 'main';
      flushSync();
    });
    stop();

    expect(seen, 'the extra channel is not reactive').toEqual(['off-topic', 'main']);
  });
});

/**
 * `acA-06` — the per-column unread counts.
 *
 * ```js
 * subscribe("chatMsg", e => {
 *   e.c == this.channel ? emit("alwaysScrollToBottom")
 *                       : this.unreadMsgs[e.c] = this.unreadMsgs[e.c] ? this.unreadMsgs[e.c]+1 : 1,
 *   e.isMention && (e.c !== this.channel && globals.isPresenter &&
 *                   (this.unreadMentions[e.c] = this.unreadMentions[e.c]+1)), … })  // byte 1,430,918
 *
 * switchChatChannel(e) { … this.unreadMsgs[this.channel] = 0,
 *                          this.unreadMentions[this.channel] = 0, … }               // byte 1,439,687
 * ```
 *
 * The whole rule is "not the channel you are looking at", asked once per column — which is why the
 * cases below are all about the two columns disagreeing.
 */
describe('the unread counters', () => {
  const room = () => new RoomChat({ extraColumnEnabled: () => true });
  const arrival = { isMention: false, countMentions: false };

  it('counts nothing for the channel a column is already showing', () => {
    const chat = room();
    chat.chatArrived('main', arrival);
    expect(unreadFor(chat.unread, 'main').messages).toBe(0);
  });

  it('counts for the OTHER column, which is showing a different channel', () => {
    /*
      The main column opens on `main` and the extra one on `off-topic`, so one arrival on `main` is
      unread in exactly one of them. A single shared map could not express this, which is why the
      reference keeps one per component.
    */
    const chat = room();
    chat.chatArrived('main', arrival);
    expect(unreadFor(chat.unread, 'main').messages).toBe(0);
    expect(unreadFor(chat.extraUnread, 'main').messages).toBe(1);
  });

  it('accumulates, and keys by channel', () => {
    const chat = room();
    chat.chatArrived('off-topic', arrival);
    chat.chatArrived('off-topic', arrival);
    chat.chatArrived('vip', arrival);
    expect(unreadFor(chat.unread, 'off-topic').messages).toBe(2);
    expect(unreadFor(chat.unread, 'vip').messages).toBe(1);
  });

  it.each(['constructor', 'toString', 'valueOf', '__proto__', 'hasOwnProperty'])(
    'returns the SAME map when clearing a channel named %s that was never counted',
    (channel) => {
      /*
        The other half of the prototype-chain fix, and the reason it needs its own assertion: this
        one is about IDENTITY, not values. `withoutChannel` used to ask `channel in counts`, and `in`
        walks the prototype chain — so opening a channel named `toString` took the copy branch,
        allocated an object identical to the one it replaced, and reassigned a `$state.raw` field.
        Every tab in the strip re-rendered to remove a key that was never there.

        `toBe`, not `toEqual`: the values were always right, which is exactly why nothing caught it.
      */
      const counts = { main: { messages: 2, mentions: 0 } };
      expect(withoutChannel(counts, channel)).toBe(counts);
    }
  );

  it.each(['constructor', 'toString', 'valueOf', '__proto__', 'hasOwnProperty'])(
    'answers zero for a channel named %s, which is a legal channel name',
    (channel) => {
      /*
        THE PROTOTYPE CHAIN, and these are not hypothetical names. Channel names are the room
        owner's, out of `chatTabsWithBadges`, and `parseChatTabsWithBadges` refuses only a
        built-in collision, a duplicate, a bad `badges` value, an over-long name and control
        characters. Every name here passes all five.

        `unreadFor` used to be `counts[channel] ?? NOTHING_UNREAD`, so each of these returned a
        FUNCTION (or `Object.prototype`), which is not nullish, so the fallback never fired and the
        caller read `.messages` off it as `undefined` — the literal text `undefined` in the badge
        that `unreadFor`'s own docblock exists to prevent.

        Executed on the real column rather than on a hand-built map, so the fix has to hold through
        `RoomChat` and `$state.raw` and not merely in the pure function.
      */
      const chat = room();
      expect(unreadFor(chat.unread, channel)).toEqual({ messages: 0, mentions: 0 });

      /* And the counts still WORK for such a channel, which is the other half. */
      chat.chatArrived(channel, arrival);
      expect(unreadFor(chat.extraUnread, channel).messages).toBe(1);
    }
  );

  it('counts a mention only when the viewer is a presenter', () => {
    const member = room();
    member.chatArrived('off-topic', { isMention: true, countMentions: false });
    expect(unreadFor(member.unread, 'off-topic')).toEqual({ messages: 1, mentions: 0 });

    const presenter = room();
    presenter.chatArrived('off-topic', { isMention: true, countMentions: true });
    expect(unreadFor(presenter.unread, 'off-topic')).toEqual({ messages: 1, mentions: 1 });
  });

  it('clears the channel a column switches TO, and only that column', () => {
    const chat = room();
    chat.chatArrived('off-topic', { isMention: true, countMentions: true });
    expect(unreadFor(chat.unread, 'off-topic').messages).toBe(1);

    chat.tab = 'off-topic';
    expect(unreadFor(chat.unread, 'off-topic')).toEqual({ messages: 0, mentions: 0 });

    // The extra column was already on off-topic, so it never counted it in the first place.
    expect(unreadFor(chat.extraUnread, 'off-topic').messages).toBe(0);
    // …and its own map is untouched by the main column's switch.
    chat.chatArrived('main', arrival);
    chat.tab = 'main';
    expect(unreadFor(chat.extraUnread, 'main').messages).toBe(1);
  });

  it('drops the key rather than storing a zero, because absent already means zero', () => {
    const chat = room();
    chat.chatArrived('off-topic', arrival);
    chat.tab = 'off-topic';
    expect(Object.keys(chat.unread)).not.toContain('off-topic');
  });

  it('replaces the map instead of editing it, which is what makes the $state.raw correct', () => {
    const chat = room();
    const before = chat.unread;
    chat.chatArrived('off-topic', arrival);
    expect(chat.unread).not.toBe(before);
    expect(before).toEqual({});
  });
});

/**
 * `acA-04` — "Mod Only", per column.
 *
 * `this.filterChatMsgs = { modOnly: !1, modOnlyExtra: !1 }` (byte 981,131). The switch is here; the
 * predicate is `RoomFeeds`', where every other visibility rule for the log lives.
 */
describe('the Mod Only switch', () => {
  it('starts off in both columns', () => {
    const { chat } = roomWith(true);
    expect([chat.modOnly('main'), chat.modOnly('extra')]).toEqual([false, false]);
  });

  it('is per column, because a reader filters one and not the other', () => {
    const { chat } = roomWith(true);
    chat.setModOnly('extra', true);
    expect([chat.modOnly('main'), chat.modOnly('extra')]).toEqual([false, true]);
  });
});
