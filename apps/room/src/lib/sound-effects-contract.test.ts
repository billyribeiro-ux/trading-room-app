import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SOUND_EFFECT_SOURCES } from './sound-effects';

const appAlertsSource = readFileSync(
  new URL('../../docs/source/components/app-alerts.full.js', import.meta.url),
  'utf8'
);
const mainBundle = readFileSync(
  new URL('../../docs/source/main.d6d3c112b59b7d0d.js', import.meta.url),
  'utf8'
);
const toastHost = readFileSync(new URL('./components/ToastHost.svelte', import.meta.url), 'utf8');
const sourceCss = readFileSync(
  new URL('../../css/complete-app-styles.css', import.meta.url),
  'utf8'
);

describe('alert and sound source contract', () => {
  it('retains the exact alert event gates and warning-toast call', () => {
    expect(appAlertsSource).toContain("appEventBus.subscribe('alertMsg'");
    expect(appAlertsSource).toContain('!e.nonTradeAlert');
    expect(appAlertsSource).toContain('this.soundEffectsService.cash.play()');
    expect(appAlertsSource).toContain('this.soundEffectsService.nonTradeAlert.play()');
    expect(appAlertsSource).toContain('this.alertService.warning(e.txt, o');
    expect(appAlertsSource).toContain('enableHtml: !0');
  });

  it('uses the singleton global host and SSOT warning skin', () => {
    expect(toastHost).toContain('<div class="overlay-container" aria-live="polite">');
    expect(toastHost).toContain('id="toast-container" class="toast-top-right toast-container"');
    expect(sourceCss).toContain('.toast-warning {');
    expect(sourceCss).toContain('background-color: rgb(248, 148, 6)');
  });

  it('matches every decoded sound mapping', () => {
    for (const [name, sources] of Object.entries(SOUND_EFFECT_SOURCES)) {
      expect(sources.length, name).toBeGreaterThan(0);
      for (const source of sources) {
        expect(existsSync(new URL(`../../static${source}`, import.meta.url)), source).toBe(true);
        expect(mainBundle, `${name}:${source}`).toContain(source.slice(1));
      }
    }
  });
});
