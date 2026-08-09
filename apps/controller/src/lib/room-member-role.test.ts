import { describe, expect, it } from 'vitest';
import { isRoomPresenter, isRoomTrial, shouldRemoveAsFreeTrial, shouldRemoveAsNonPresenter } from './room-member-role';

describe('captured room member role semantics', () => {
  it('distinguishes a presenter from the role-1 admin state', () => {
    expect(isRoomPresenter({ role: 1, nonPresenter: false, isFreeTrial: false })).toBe(true);
    expect(isRoomPresenter({ role: 1, nonPresenter: true, isFreeTrial: false })).toBe(false);
    expect(isRoomPresenter({ role: 2, nonPresenter: false, isFreeTrial: false })).toBe(false);
  });

  it('derives trial status only from the independent captured flag', () => {
    expect(isRoomTrial({ role: 2, nonPresenter: false, isFreeTrial: true })).toBe(true);
    expect(isRoomTrial({ role: 6, nonPresenter: false, isFreeTrial: false })).toBe(false);
  });

  it('removes admins and participants but preserves owners and true presenters', () => {
    expect(shouldRemoveAsNonPresenter({ role: 0, nonPresenter: false, isFreeTrial: false })).toBe(false);
    expect(shouldRemoveAsNonPresenter({ role: 1, nonPresenter: false, isFreeTrial: false })).toBe(false);
    expect(shouldRemoveAsNonPresenter({ role: 1, nonPresenter: true, isFreeTrial: false })).toBe(true);
    expect(shouldRemoveAsNonPresenter({ role: 2, nonPresenter: false, isFreeTrial: false })).toBe(true);
  });

  it('removes every flagged trial member except the protected owner', () => {
    expect(shouldRemoveAsFreeTrial({ role: 0, nonPresenter: false, isFreeTrial: true })).toBe(false);
    expect(shouldRemoveAsFreeTrial({ role: 1, nonPresenter: false, isFreeTrial: true })).toBe(true);
    expect(shouldRemoveAsFreeTrial({ role: 1, nonPresenter: true, isFreeTrial: true })).toBe(true);
    expect(shouldRemoveAsFreeTrial({ role: 2, nonPresenter: false, isFreeTrial: false })).toBe(false);
  });
});
