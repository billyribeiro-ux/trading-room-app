import { describe, expect, it } from 'vitest';
import { DEFAULT_ALERT_DELIVERY_PREFERENCES, resolveAlertDelivery } from './alert-delivery';

const tradeAlert = {
  senderName: 'Billy Ribeiro',
  body: 'Buy 100 shares',
  nonTradeAlert: false
};

describe('decoded alert delivery', () => {
  it('uses the cash sound and warning toast for a trade alert', () => {
    expect(resolveAlertDelivery(tradeAlert, DEFAULT_ALERT_DELIVERY_PREFERENCES)).toEqual({
      sound: 'cash',
      toast: {
        kind: 'warning',
        title: 'Alert from @Billy Ribeiro',
        message: 'Buy 100 shares',
        enableHtml: true,
        timeOut: 5_000
      }
    });
  });

  it('changes only the sound for a non-trade alert', () => {
    expect(
      resolveAlertDelivery(
        { ...tradeAlert, nonTradeAlert: true },
        DEFAULT_ALERT_DELIVERY_PREFERENCES
      )
    ).toEqual({
      sound: 'nonTradeAlert',
      toast: {
        kind: 'warning',
        title: 'Alert from @Billy Ribeiro',
        message: 'Buy 100 shares',
        enableHtml: true,
        timeOut: 5_000
      }
    });
  });

  it('suppresses sound, toast, and notification delivery under DND', () => {
    expect(
      resolveAlertDelivery(tradeAlert, {
        ...DEFAULT_ALERT_DELIVERY_PREFERENCES,
        doNotDisturbOn: true
      })
    ).toBeNull();
  });

  it('keeps sound independent from the popup preference', () => {
    expect(
      resolveAlertDelivery(tradeAlert, {
        ...DEFAULT_ALERT_DELIVERY_PREFERENCES,
        alertPopup: false
      })
    ).toEqual({ sound: 'cash', toast: null });
  });

  it('uses the dumped longer-popup duration', () => {
    expect(
      resolveAlertDelivery(tradeAlert, {
        ...DEFAULT_ALERT_DELIVERY_PREFERENCES,
        longerAlertPopup: true
      })?.toast?.timeOut
    ).toBe(10_000);
  });
});
