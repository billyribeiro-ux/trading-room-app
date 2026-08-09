export interface AlertDeliveryPreferences {
  doNotDisturbOn: boolean;
  alertSoundOn: boolean;
  nonTradeSound: boolean;
  alertPopup: boolean;
  longerAlertPopup: boolean;
}

export interface AlertDeliveryEvent {
  senderName: string;
  body: string;
  nonTradeAlert: boolean;
}

export interface AlertDelivery {
  sound: 'cash' | 'nonTradeAlert' | null;
  toast: {
    kind: 'warning';
    title: string;
    message: string;
    enableHtml: true;
    timeOut: 5_000 | 10_000;
  } | null;
}

export const DEFAULT_ALERT_DELIVERY_PREFERENCES: AlertDeliveryPreferences = {
  doNotDisturbOn: false,
  alertSoundOn: true,
  nonTradeSound: true,
  alertPopup: true,
  longerAlertPopup: false
};

/**
 * Decoded from app-alerts:
 * - DND suppresses the complete alert-delivery branch.
 * - Trade and non-trade alerts use different sounds.
 * - Both alert kinds use the same warning toast.
 * - Browser notification delivery is gated by the presence of the popup.
 */
export function resolveAlertDelivery(
  event: AlertDeliveryEvent,
  preferences: AlertDeliveryPreferences
): AlertDelivery | null {
  if (preferences.doNotDisturbOn) return null;

  const sound = event.nonTradeAlert
    ? preferences.nonTradeSound
      ? 'nonTradeAlert'
      : null
    : preferences.alertSoundOn
      ? 'cash'
      : null;

  return {
    sound,
    toast: preferences.alertPopup
      ? {
          kind: 'warning',
          title: `Alert from @${event.senderName}`,
          message: event.body,
          enableHtml: true,
          timeOut: preferences.longerAlertPopup ? 10_000 : 5_000
        }
      : null
  };
}
