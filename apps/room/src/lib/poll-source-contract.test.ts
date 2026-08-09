import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve('.');
const compiledSource = readFileSync(
  resolve(root, 'docs/source/components/app-poll-modal.full.js'),
  'utf8'
);
const alertSource = readFileSync(
  resolve(root, 'docs/source/components/app-alerts.full.js'),
  'utf8'
);
const pollComponent = readFileSync(resolve(root, 'src/lib/components/PollPanel.svelte'), 'utf8');
const modalHost = readFileSync(resolve(root, 'src/lib/components/ModalHost.svelte'), 'utf8');
const appCss = readFileSync(resolve(root, 'src/app.css'), 'utf8');
const bootboxComponent = readFileSync(
  resolve(root, 'src/lib/components/BootboxDialog.svelte'),
  'utf8'
);

describe('Poll compiled-source contract', () => {
  it('opens with the production wrapper-centering calculation, not the hidden 50% CSS seed', () => {
    expect(compiledSource).toMatch(
      /e\.css\(\{\s*left: \(i - e\.outerWidth\(\)\) \/ 2 \+ 'px', top: \(o - e\.outerHeight\(\)\) \/ 2 \+ 'px'\s*\}\)/
    );
    expect(pollComponent).toContain('calculatePollPanelPosition(');
  });

  it('keeps the root host in the captured modal order', () => {
    expect(modalHost.indexOf('<app-post-alert-modal>')).toBeLessThan(
      modalHost.indexOf('<app-poll-modal')
    );
    expect(modalHost.indexOf('<app-poll-modal')).toBeLessThan(
      modalHost.indexOf('<app-chat-logs-modal>')
    );
  });

  it('uses the exact captured choice-delete and panel control structures', () => {
    expect(pollComponent).toContain('class="btn btn-link pull-right btn-default"');
    expect(pollComponent).toContain('class="fa fa-minus-circle"');
    expect(pollComponent).toContain('class="poll-panel-btn poll-panel-btn-close"');
    expect(pollComponent).toContain('class="ui-resizable-handle ui-resizable-se ui-icon');
  });

  it('drives the minimized and active Alert-header indicators exactly from Poll state', () => {
    expect(alertSource).toContain("'poll-active-blink', e.pollIsActive && !e.pollIsMinimized");
    expect(alertSource).toContain("'poll-active-indicator',");
    expect(pollComponent).toContain('onminimize();');
  });

  it('uses the captured stylesheet as SSOT with no local Poll or resizable override block', () => {
    expect(appCss.startsWith("@import '../css/complete-app-styles.css';")).toBe(true);
    expect(appCss).not.toMatch(/(?:^|\n)\.pollModalHolder\s*\{/);
    expect(appCss).not.toMatch(/(?:^|\n)\.ui-resizable-se\s*\{/);
  });

  it('renders the proven Bootbox fade backdrop beside the dialog', () => {
    expect(bootboxComponent).toContain('class="bootbox modal fade bootbox-{mode}');
    expect(bootboxComponent).toContain('<div class="modal-backdrop fade show"></div>');
  });
});
