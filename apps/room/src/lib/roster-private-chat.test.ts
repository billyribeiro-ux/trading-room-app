import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  SELF_PRIVATE_CHAT_MESSAGE,
  canShowRosterPrivateChat,
  resolveRosterPrivateChatStart
} from './roster-private-chat';

const decodedRosterSource = readFileSync(
  new URL('../../docs/source/components/app-room-roster.full.js', import.meta.url),
  'utf8'
);
const cleanRosterContract = readFileSync(
  new URL('../../mention-reply-private-chat.clean.html', import.meta.url),
  'utf8'
);
const pageSource = readFileSync(new URL('../routes/+page.svelte', import.meta.url), 'utf8');

/*
  `.room-sidebar` became `RoomSidebar.svelte` on 2026-08-15. The reference-bundle assertions are
  untouched; ours follow the markup into the component.
*/
const SIDEBAR = readFileSync(new URL('./components/RoomSidebar.svelte', import.meta.url), 'utf8');

describe('roster private-chat evidence contract', () => {
  it('keeps the decoded source and clean root contract as gates', () => {
    expect(decodedRosterSource).toContain('(this.canPM =');
    expect(decodedRosterSource).toContain("bootbox.alert('Chatting with yourself again???')");
    expect(cleanRosterContract).toContain(
      '<i class="fas fa-comments"></i>&nbsp;&nbsp;Private Chat '
    );
  });

  it('renders the exact third roster item and captured open-menu attribute', () => {
    /*
      The per-row menu id moved into `RoomMenus` with the other ten floating menus, so the read is
      `menus.userId` now. Re-pointed rather than deleted — this asserts the captured attribute is
      still bound to WHICH ROW is open, which is the thing that breaks if the id becomes a boolean.
    */
    expect(SIDEBAR).toContain('data-bs-popper={menus.userId === user.id');
    expect(SIDEBAR).toContain('<i class="fas fa-comments"></i>&nbsp;&nbsp;Private Chat');
    // The handler is the page's, reached through a callback prop — the gate stays in one place.
    expect(SIDEBAR).toContain('onclick={() => onopenrosterprivatechat(user)}');
    /*
      WRAPPED since Phase 5 slice 7, and that is the assertion rather than an incidental change of
      spelling: `openRosterPrivateChat` was a function and is a method now, so passing it by
      reference would leave `this` as the component. The arrow is what keeps the gate reachable.
    */
    expect(pageSource).toContain(
      'onopenrosterprivatechat={(user) => privateChat.openFromRoster(user)}'
    );
  });

  it('shows the action to presenters', () => {
    expect(
      canShowRosterPrivateChat(
        { isPresenter: true },
        { id: 2, permissions: 'r', hasAdminChat: false }
      )
    ).toBe(true);
  });

  it('honors user PM and trial restrictions', () => {
    expect(
      canShowRosterPrivateChat(
        { isPresenter: false, userPmEnabled: true },
        { id: 2, permissions: 'r' }
      )
    ).toBe(true);
    expect(
      canShowRosterPrivateChat(
        {
          isPresenter: false,
          userPmEnabled: true,
          currentUserIsTrial: true,
          disablePmForTrials: true
        },
        { id: 2, permissions: 'r' }
      )
    ).toBe(false);
  });

  it('honors user-to-presenter PM only for presenter/admin targets', () => {
    expect(
      canShowRosterPrivateChat(
        { isPresenter: false, userToPresenterPmEnabled: true },
        { id: 2, permissions: 'a' }
      )
    ).toBe(true);
    expect(
      canShowRosterPrivateChat(
        { isPresenter: false, userToPresenterPmEnabled: true },
        { id: 2, permissions: 'r' }
      )
    ).toBe(false);
  });

  it('uses the exact self-DM Bootbox message', () => {
    expect(resolveRosterPrivateChatStart(7, 7)).toEqual({
      kind: 'self',
      message: SELF_PRIVATE_CHAT_MESSAGE
    });
  });

  it('emits the decoded non-self start payload', () => {
    expect(resolveRosterPrivateChatStart(7, 9)).toEqual({
      kind: 'open',
      uid: '9',
      isInit: true
    });
  });
});
