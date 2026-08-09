/**
 * Read-only browser contract for the authenticated account-navbar tooltips.
 *
 * Evidence:
 * - `evidence-dumps/login-page/logged-in-page` proves the labels and bottom
 *   placement used by the original Angular UI Bootstrap template.
 * - `evidence-dumps/NEXT-STEP/gaps/sheet-2.css:1397-1410` proves the Bootstrap 3
 *   tooltip values asserted below.
 * - The original state JSON measures the desktop Account trigger at 96.4297 CSS
 *   px and the Logout trigger at 54 CSS px. The user-supplied DPR2 screenshots
 *   dated 2026-08-02 prove the corresponding two-line/one-line desktop result.
 * - `/public/dist/vendor.min.js?v=2.18.100` contains Angular UI Bootstrap 0.12.1.
 *   Its tooltip inserts after the trigger, measures intrinsic `offsetWidth`, and
 *   bottom-centres that measured popup. The reference model below reproduces
 *   that algorithm instead of assuming popup width always equals trigger width.
 *
 * The verifier never clicks or submits either navbar control and never mutates
 * server data. It writes only the two requested diagnostic screenshots in
 * `/tmp` and a disposable Chrome profile which is removed on exit.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CONFIGURED_ORIGIN = process.env.ORIGIN?.trim() || 'http://127.0.0.1:5300';
const TARGET_URL =
  process.env.ACCOUNT_URL?.trim() || new URL('/account', `${CONFIGURED_ORIGIN.replace(/\/$/, '')}/`).href;
const TARGET_ORIGIN = new URL(TARGET_URL).origin;
const ACCOUNT_SCREENSHOT = '/tmp/account-settings-tooltip.png';
const LOGOUT_SCREENSHOT = '/tmp/logout-tooltip.png';
const VIEWPORT = { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false };
const VIEWPORT_WIDTHS = [320, 767, 768, 1440];
const DESKTOP_SCREENSHOT_WIDTH = 1440;

const chromeCandidates = [
  process.env.CHROME_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser'
].filter(Boolean);
const chromeBinary = chromeCandidates.find((candidate) => existsSync(candidate));

if (!chromeBinary) {
  throw new Error(
    `Chrome was not found. Set CHROME_BIN to a Chrome/Chromium executable. Checked: ${chromeCandidates.join(', ')}`
  );
}

function sessionCookie() {
  const source =
    process.env.COOKIE?.trim() ||
    (existsSync('/tmp/cookie1.txt') ? readFileSync('/tmp/cookie1.txt', 'utf8').trim() : '');

  if (!source) {
    throw new Error(
      'No authenticated cookie is available. Set COOKIE="control_session=..." or write it to /tmp/cookie1.txt.'
    );
  }

  const raw = source.replace(/^cookie:\s*/i, '');
  const pairs = raw
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const pair = pairs.find((entry) => entry.startsWith('control_session=')) ?? pairs[0];
  const separator = pair.indexOf('=');

  if (separator < 1) {
    throw new Error('The authenticated cookie must use the name=value format.');
  }

  return { name: pair.slice(0, separator), value: pair.slice(separator + 1) };
}

async function availablePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Could not allocate a local Chrome debugging port.'));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function connectToChrome(port, stderr) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find((target) => target.type === 'page');
        if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
      }
    } catch {
      // Chrome is still starting.
    }
    await delay(125);
  }

  throw new Error(
    `Chrome did not expose a debugging page on port ${port}.${stderr() ? `\nChrome stderr:\n${stderr()}` : ''}`
  );
}

function createCdpClient(socket) {
  let sequence = 0;
  const pending = new Map();

  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    clearTimeout(request.timer);
    if (message.error) {
      request.reject(new Error(`CDP ${request.method} failed: ${message.error.message}`));
    } else {
      request.resolve(message.result ?? {});
    }
  });

  socket.addEventListener('close', () => {
    for (const request of pending.values()) {
      clearTimeout(request.timer);
      request.reject(new Error(`Chrome closed while CDP ${request.method} was pending.`));
    }
    pending.clear();
  });

  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP ${method} timed out after 10 seconds.`));
      }, 10_000);
      pending.set(id, { method, resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params }));
    });
}

async function main() {
  try {
    await fetch(TARGET_ORIGIN, { redirect: 'manual' });
  } catch (error) {
    const detail =
      error instanceof Error
        ? `${error.message}${error.cause instanceof Error ? ` (${error.cause.message})` : ''}`
        : String(error);
    throw new Error(
      `Could not connect to the configured origin ${TARGET_ORIGIN}: ${detail}. Verify ORIGIN or ACCOUNT_URL and the local network boundary.`,
      { cause: error }
    );
  }

  const cookie = sessionCookie();
  const debugPort = await availablePort();
  const profileDirectory = mkdtempSync(join(tmpdir(), 'navbar-tooltip-chrome-'));
  let chromeStderr = '';
  let chrome;
  let socket;

  try {
    chrome = spawn(
      chromeBinary,
      [
        '--headless=new',
        `--remote-debugging-port=${debugPort}`,
        '--remote-debugging-address=127.0.0.1',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-background-networking',
        '--force-device-scale-factor=2',
        '--window-size=1440,900',
        `--user-data-dir=${profileDirectory}`,
        'about:blank'
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] }
    );
    chrome.stderr?.on('data', (chunk) => {
      chromeStderr = `${chromeStderr}${chunk.toString()}`.slice(-4000);
    });

    const websocketUrl = await connectToChrome(debugPort, () => chromeStderr);
    socket = new WebSocket(websocketUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out opening the Chrome debugger socket.')), 5000);
      socket.addEventListener(
        'open',
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true }
      );
      socket.addEventListener(
        'error',
        () => {
          clearTimeout(timer);
          reject(new Error('Chrome rejected the debugger socket connection.'));
        },
        { once: true }
      );
    });

    const send = createCdpClient(socket);
    const evaluate = async (expression) => {
      const { result, exceptionDetails } = await send('Runtime.evaluate', {
        expression,
        returnByValue: true,
        awaitPromise: true
      });
      if (exceptionDetails) {
        const detail = exceptionDetails.exception?.description ?? exceptionDetails.text;
        throw new Error(`Browser evaluation failed: ${detail}`);
      }
      return result?.value;
    };
    const waitFor = async (expression, description, timeout = 5000) => {
      const started = Date.now();
      while (Date.now() - started < timeout) {
        if (await evaluate(`Boolean(${expression})`)) return;
        await delay(50);
      }
      throw new Error(`Timed out waiting for ${description}.`);
    };

    await send('Network.enable');
    const cookieResult = await send('Network.setCookie', {
      ...cookie,
      url: `${TARGET_ORIGIN}/`,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax'
    });
    if (cookieResult.success === false) {
      throw new Error(`Chrome rejected the ${cookie.name} authentication cookie.`);
    }

    await send('Page.enable');
    await send('Emulation.setScrollbarsHidden', { hidden: true });
    await send('Emulation.setDeviceMetricsOverride', VIEWPORT);
    const navigation = await send('Page.navigate', { url: TARGET_URL });
    if (navigation.errorText) {
      throw new Error(`Chrome could not navigate to ${TARGET_URL}: ${navigation.errorText}`);
    }

    await waitFor("document.readyState === 'complete'", 'the account document to finish loading', 10_000);
    const currentUrl = await evaluate('location.href');
    if (new URL(currentUrl).pathname !== new URL(TARGET_URL).pathname) {
      throw new Error(
        `Expected authenticated ${new URL(TARGET_URL).pathname}, but Chrome reached ${currentUrl}. Refresh /tmp/cookie1.txt or COOKIE.`
      );
    }
    await waitFor(
      "document.querySelector('.acc-nav-account') && document.querySelector('.acc-nav-logout')",
      'the signed-in account navbar controls'
    );
    // The controls are present in SSR HTML before Svelte attaches the tooltip
    // attachment. Give the cold dev-server hydration pass a deterministic
    // boundary so a synthetic hover cannot be lost between those two states.
    await delay(500);

    const failures = [];
    const expect = (condition, message) => {
      if (!condition) failures.push(message);
    };
    const closeTo = (actual, expected, tolerance, label) => {
      expect(
        Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
        `${label}: expected ${expected} ± ${tolerance}, got ${actual}`
      );
    };

    const inspectTooltip = async ({ triggerSelector, expectedText, expectedLines, screenshotPath, viewportWidth }) => {
      const assertionLabel = `${expectedText} @ ${viewportWidth}px`;
      await evaluate(`(() => {
        const trigger = document.querySelector(${JSON.stringify(triggerSelector)});
        if (!trigger) throw new Error('Missing tooltip trigger ${triggerSelector}');
        trigger.dispatchEvent(new MouseEvent('mouseenter'));
      })()`);
      await waitFor(
        "document.querySelector('.acc-tooltip.tooltip.bottom.in:not([data-tooltip-reference])') && Number.parseFloat(getComputedStyle(document.querySelector('.acc-tooltip.tooltip.bottom.in:not([data-tooltip-reference])')).opacity) === 0.9",
        `${assertionLabel} tooltip to become fully visible`
      );

      const metrics = await evaluate(`(() => {
        const trigger = document.querySelector(${JSON.stringify(triggerSelector)});
        const popup = document.querySelector(
          '.acc-tooltip.tooltip.bottom.in:not([data-tooltip-reference])'
        );
        const inner = popup?.querySelector('.tooltip-inner');
        const arrow = popup?.querySelector('.tooltip-arrow');
        if (!trigger || !popup || !inner || !arrow) throw new Error('Incomplete Bootstrap tooltip DOM');

        const rect = (element) => {
          const value = element.getBoundingClientRect();
          return {
            x: value.x,
            y: value.y,
            top: value.top,
            right: value.right,
            bottom: value.bottom,
            left: value.left,
            width: value.width,
            height: value.height
          };
        };
        const renderedLines = (element) => {
          const words = [];
          const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const node = walker.currentNode;
            const text = node.textContent ?? '';
            for (const match of text.matchAll(/\\S+/g)) {
              const range = document.createRange();
              range.setStart(node, match.index);
              range.setEnd(node, match.index + match[0].length);
              const wordRect = range.getBoundingClientRect();
              words.push({ text: match[0], top: wordRect.top, left: wordRect.left });
            }
          }
          words.sort((a, b) => a.top - b.top || a.left - b.left);
          const lines = [];
          for (const word of words) {
            let line = lines.find((entry) => Math.abs(entry.top - word.top) <= 0.5);
            if (!line) {
              line = { top: word.top, words: [] };
              lines.push(line);
            }
            line.words.push(word);
          }
          return lines
            .sort((a, b) => a.top - b.top)
            .map((line) => line.words.sort((a, b) => a.left - b.left).map((word) => word.text).join(' '));
        };

        const snapshotGeometry = (element) => {
          const snapshotInner = element.querySelector('.tooltip-inner');
          const snapshotArrow = element.querySelector('.tooltip-arrow');
          if (!snapshotInner || !snapshotArrow) throw new Error('Incomplete reference tooltip DOM');

          return {
            popup: rect(element),
            inner: rect(snapshotInner),
            arrow: rect(snapshotArrow),
            offsetWidth: element.offsetWidth,
            lines: renderedLines(snapshotInner)
          };
        };

        /*
         * Angular UI Bootstrap 0.12.1's $tooltip defaults appendToBody to false,
         * inserts this popup with trigger.after(...), reads offsetWidth, and then
         * calls positionElements(trigger, popup, 'bottom', false). Building that
         * DOM in the live page lets the browser resolve the original shrink-to-fit
         * width at each breakpoint instead of encoding another width formula.
         */
        const reference = document.createElement('div');
        reference.dataset.tooltipReference = 'true';
        reference.className = 'acc-tooltip tooltip bottom fade in';
        reference.style.top = '0px';
        reference.style.left = '0px';
        reference.style.display = 'block';
        reference.style.visibility = 'hidden';
        reference.style.pointerEvents = 'none';

        const referenceArrow = document.createElement('div');
        referenceArrow.className = 'tooltip-arrow';
        const referenceInner = document.createElement('div');
        referenceInner.className = 'tooltip-inner';
        referenceInner.textContent = ${JSON.stringify(expectedText)};
        reference.append(referenceArrow, referenceInner);
        trigger.after(reference);

        const triggerRectForReference = rect(trigger);
        // The original invokes its positioning function twice around the digest.
        for (let pass = 0; pass < 2; pass += 1) {
          const current = rect(reference);
          const targetLeft =
            triggerRectForReference.left + triggerRectForReference.width / 2 - reference.offsetWidth / 2;
          const targetTop = triggerRectForReference.bottom + 3;
          const currentCssLeft = Number.parseFloat(reference.style.left) || 0;
          const currentCssTop = Number.parseFloat(reference.style.top) || 0;
          reference.style.left = String(currentCssLeft + targetLeft - current.left) + 'px';
          reference.style.top = String(currentCssTop + targetTop - current.top) + 'px';
        }

        const referenceGeometry = snapshotGeometry(reference);

        const popupStyle = getComputedStyle(popup);
        const innerStyle = getComputedStyle(inner);
        const arrowStyle = getComputedStyle(arrow);
        const triggerRect = rect(trigger);
        const popupRect = rect(popup);
        const innerRect = rect(inner);
        const arrowRect = rect(arrow);
        const lines = renderedLines(inner);
        reference.remove();

        return {
          text: inner.textContent,
          elementChildCount: inner.children.length,
          lines,
          trigger: triggerRect,
          popup: popupRect,
          inner: innerRect,
          arrow: arrowRect,
          reference: referenceGeometry,
          popupStyle: {
            position: popupStyle.position,
            zIndex: popupStyle.zIndex,
            fontFamily: popupStyle.fontFamily,
            fontSize: popupStyle.fontSize,
            fontStyle: popupStyle.fontStyle,
            fontWeight: popupStyle.fontWeight,
            lineHeight: popupStyle.lineHeight,
            opacity: popupStyle.opacity,
            paddingTop: popupStyle.paddingTop,
            paddingRight: popupStyle.paddingRight,
            paddingBottom: popupStyle.paddingBottom,
            paddingLeft: popupStyle.paddingLeft,
            marginTop: popupStyle.marginTop
          },
          innerStyle: {
            paddingTop: innerStyle.paddingTop,
            paddingRight: innerStyle.paddingRight,
            paddingBottom: innerStyle.paddingBottom,
            paddingLeft: innerStyle.paddingLeft,
            maxWidth: innerStyle.maxWidth,
            backgroundColor: innerStyle.backgroundColor,
            borderRadius: innerStyle.borderRadius,
            textAlign: innerStyle.textAlign,
            color: innerStyle.color
          },
          arrowStyle: {
            top: arrowStyle.top,
            marginLeft: arrowStyle.marginLeft,
            borderTopWidth: arrowStyle.borderTopWidth,
            borderRightWidth: arrowStyle.borderRightWidth,
            borderBottomWidth: arrowStyle.borderBottomWidth,
            borderLeftWidth: arrowStyle.borderLeftWidth,
            borderBottomColor: arrowStyle.borderBottomColor
          }
        };
      })()`);

      if (screenshotPath) {
        const clip = {
          x: Math.max(0, Math.floor(metrics.popup.left) - 12),
          y: Math.max(0, Math.floor(metrics.popup.top) - 8),
          width: Math.ceil(metrics.popup.right) - Math.floor(metrics.popup.left) + 24,
          height: Math.ceil(metrics.popup.bottom) - Math.floor(metrics.popup.top) + 16,
          scale: 1
        };
        const capture = await send('Page.captureScreenshot', {
          format: 'png',
          fromSurface: true,
          captureBeyondViewport: true,
          clip
        });
        const png = Buffer.from(capture.data, 'base64');
        writeFileSync(screenshotPath, png);
        expect(png.subarray(1, 4).toString() === 'PNG', `${assertionLabel}: ${screenshotPath} is not a PNG`);
        expect(
          png.readUInt32BE(16) === clip.width * VIEWPORT.deviceScaleFactor &&
            png.readUInt32BE(20) === clip.height * VIEWPORT.deviceScaleFactor,
          `${assertionLabel}: screenshot is not DPR2 (expected ${clip.width * 2}×${clip.height * 2}, got ${png.readUInt32BE(16)}×${png.readUInt32BE(20)})`
        );
      }

      expect(
        metrics.text === expectedText,
        `${assertionLabel}: expected exact text, got ${JSON.stringify(metrics.text)}`
      );
      expect(
        metrics.elementChildCount === 0,
        `${assertionLabel}: expected one raw textContent value with no visual wrapper elements, got ${metrics.elementChildCount} child element(s)`
      );
      expect(
        JSON.stringify(metrics.reference.lines) === JSON.stringify(expectedLines),
        `${assertionLabel}: reference model expected rendered lines ${JSON.stringify(expectedLines)}, got ${JSON.stringify(metrics.reference.lines)}`
      );
      expect(
        JSON.stringify(metrics.lines) === JSON.stringify(expectedLines),
        `${assertionLabel}: expected rendered lines ${JSON.stringify(expectedLines)}, got ${JSON.stringify(metrics.lines)}`
      );
      closeTo(metrics.popup.left, metrics.reference.popup.left, 0.1, `${assertionLabel}: popup left vs reference`);
      closeTo(metrics.popup.top, metrics.reference.popup.top, 0.1, `${assertionLabel}: popup top vs reference`);
      closeTo(metrics.popup.width, metrics.reference.popup.width, 0.02, `${assertionLabel}: popup width vs reference`);
      closeTo(
        metrics.popup.height,
        metrics.reference.popup.height,
        0.02,
        `${assertionLabel}: popup height vs reference`
      );
      closeTo(metrics.inner.width, metrics.reference.inner.width, 0.02, `${assertionLabel}: inner width vs reference`);
      closeTo(
        metrics.inner.height,
        metrics.reference.inner.height,
        0.02,
        `${assertionLabel}: inner height vs reference`
      );
      closeTo(metrics.arrow.left, metrics.reference.arrow.left, 0.1, `${assertionLabel}: arrow left vs reference`);
      closeTo(metrics.arrow.top, metrics.reference.arrow.top, 0.1, `${assertionLabel}: arrow top vs reference`);
      expect(metrics.popupStyle.position === 'absolute', `${assertionLabel}: expected absolute positioning`);
      expect(
        metrics.popupStyle.zIndex === '1070',
        `${assertionLabel}: expected z-index 1070, got ${metrics.popupStyle.zIndex}`
      );
      expect(
        metrics.popupStyle.fontFamily === '"Helvetica Neue", Helvetica, Arial, sans-serif',
        `${assertionLabel}: expected the captured Helvetica stack, got ${metrics.popupStyle.fontFamily}`
      );
      expect(
        metrics.popupStyle.fontSize === '12px',
        `${assertionLabel}: expected 12px font, got ${metrics.popupStyle.fontSize}`
      );
      expect(
        metrics.popupStyle.fontStyle === 'normal',
        `${assertionLabel}: expected normal style, got ${metrics.popupStyle.fontStyle}`
      );
      expect(
        metrics.popupStyle.fontWeight === '400',
        `${assertionLabel}: expected weight 400, got ${metrics.popupStyle.fontWeight}`
      );
      closeTo(Number.parseFloat(metrics.popupStyle.lineHeight), 12 * 1.42857, 0.01, `${assertionLabel}: line-height`);
      expect(
        metrics.popupStyle.opacity === '0.9',
        `${assertionLabel}: expected outer opacity 0.9, got ${metrics.popupStyle.opacity}`
      );
      expect(
        metrics.popupStyle.paddingTop === '5px' &&
          metrics.popupStyle.paddingRight === '0px' &&
          metrics.popupStyle.paddingBottom === '5px' &&
          metrics.popupStyle.paddingLeft === '0px',
        `${assertionLabel}: expected bottom-tooltip padding 5px 0, got ${metrics.popupStyle.paddingTop} ${metrics.popupStyle.paddingRight} ${metrics.popupStyle.paddingBottom} ${metrics.popupStyle.paddingLeft}`
      );
      expect(
        metrics.popupStyle.marginTop === '3px',
        `${assertionLabel}: expected 3px top margin, got ${metrics.popupStyle.marginTop}`
      );
      expect(
        metrics.innerStyle.paddingTop === '3px' &&
          metrics.innerStyle.paddingRight === '8px' &&
          metrics.innerStyle.paddingBottom === '3px' &&
          metrics.innerStyle.paddingLeft === '8px',
        `${assertionLabel}: expected inner padding 3px 8px, got ${metrics.innerStyle.paddingTop} ${metrics.innerStyle.paddingRight} ${metrics.innerStyle.paddingBottom} ${metrics.innerStyle.paddingLeft}`
      );
      expect(
        metrics.innerStyle.maxWidth === '200px',
        `${assertionLabel}: expected max-width 200px, got ${metrics.innerStyle.maxWidth}`
      );
      expect(
        metrics.innerStyle.backgroundColor === 'rgb(0, 0, 0)',
        `${assertionLabel}: expected black background, got ${metrics.innerStyle.backgroundColor}`
      );
      expect(
        metrics.innerStyle.color === 'rgb(255, 255, 255)',
        `${assertionLabel}: expected white text, got ${metrics.innerStyle.color}`
      );
      expect(
        metrics.innerStyle.borderRadius === '4px',
        `${assertionLabel}: expected 4px radius, got ${metrics.innerStyle.borderRadius}`
      );
      expect(
        metrics.innerStyle.textAlign === 'center',
        `${assertionLabel}: expected centered text, got ${metrics.innerStyle.textAlign}`
      );
      expect(
        metrics.arrowStyle.top === '0px' &&
          metrics.arrowStyle.marginLeft === '-5px' &&
          metrics.arrowStyle.borderTopWidth === '0px' &&
          metrics.arrowStyle.borderRightWidth === '5px' &&
          metrics.arrowStyle.borderBottomWidth === '5px' &&
          metrics.arrowStyle.borderLeftWidth === '5px' &&
          metrics.arrowStyle.borderBottomColor === 'rgb(0, 0, 0)',
        `${assertionLabel}: expected Bootstrap bottom arrow 0 5px 5px with a black bottom border, got ${JSON.stringify(metrics.arrowStyle)}`
      );
      closeTo(metrics.popup.top - metrics.trigger.bottom, 3, 0.1, `${assertionLabel}: trigger-to-tooltip gap`);
      closeTo(
        metrics.popup.left + metrics.popup.width / 2 - (metrics.trigger.left + metrics.trigger.width / 2),
        metrics.reference.popup.left +
          metrics.reference.popup.width / 2 -
          (metrics.trigger.left + metrics.trigger.width / 2),
        0.1,
        `${assertionLabel}: horizontal placement vs offsetWidth reference`
      );
      closeTo(
        metrics.arrow.left + metrics.arrow.width / 2,
        metrics.popup.left + metrics.popup.width / 2,
        0.1,
        `${assertionLabel}: arrow centering`
      );

      const fade = await evaluate(`(async () => {
        const trigger = document.querySelector(${JSON.stringify(triggerSelector)});
        const popup = document.querySelector('.acc-tooltip:not([data-tooltip-reference])');
        if (!trigger || !popup) throw new Error('Missing tooltip fade probe nodes');

        const startedAt = performance.now();
        let removalElapsed = null;
        const observer = new MutationObserver(() => {
          if (!popup.isConnected && removalElapsed === null) {
            removalElapsed = performance.now() - startedAt;
          }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });

        trigger.dispatchEvent(new MouseEvent('mouseleave'));
        const retainedAfterDispatch = popup.isConnected;
        const hasInAfterDispatch = popup.classList.contains('in');
        // This deadline timer is registered after mouseleave, so the
        // application's 500ms removal timer runs first when both become due.
        // That verifies the original timer boundary without treating normal
        // event-loop scheduling drift as an implementation failure.
        await new Promise((resolve) => setTimeout(resolve, 500));
        const removedBy500ms = !popup.isConnected;
        const deadlineElapsed = performance.now() - startedAt;
        observer.disconnect();

        return {
          retainedAfterDispatch,
          hasInAfterDispatch,
          removedBy500ms,
          removalElapsed,
          deadlineElapsed
        };
      })()`);
      expect(
        fade.retainedAfterDispatch,
        `${assertionLabel}: expected the fading tooltip DOM to be retained after mouseleave`
      );
      expect(
        !fade.hasInAfterDispatch,
        `${assertionLabel}: expected mouseleave to remove .in synchronously before cleanup`
      );
      expect(
        fade.removedBy500ms,
        `${assertionLabel}: expected tooltip DOM removal by the 500ms Angular cleanup boundary (checked after ${fade.deadlineElapsed.toFixed(1)}ms)`
      );

      if (!fade.removedBy500ms) {
        await evaluate("document.querySelector('.acc-tooltip:not([data-tooltip-reference])')?.remove()");
      }

      return { ...metrics, fade };
    };

    const results = [];
    for (const viewportWidth of VIEWPORT_WIDTHS) {
      await send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, width: viewportWidth });
      await waitFor(
        `document.documentElement.clientWidth === ${viewportWidth}`,
        `the ${viewportWidth}px responsive viewport`
      );
      await evaluate('new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))');

      const desktop = viewportWidth >= 768;
      const account = await inspectTooltip({
        triggerSelector: '.acc-nav-account',
        expectedText: 'Account Settings',
        expectedLines: desktop ? ['Account', 'Settings'] : ['Account Settings'],
        screenshotPath: viewportWidth === DESKTOP_SCREENSHOT_WIDTH ? ACCOUNT_SCREENSHOT : undefined,
        viewportWidth
      });

      const logout = await inspectTooltip({
        triggerSelector: '.acc-nav-logout',
        expectedText: 'Logout',
        expectedLines: ['Logout'],
        screenshotPath: viewportWidth === DESKTOP_SCREENSHOT_WIDTH ? LOGOUT_SCREENSHOT : undefined,
        viewportWidth
      });

      if (desktop) {
        closeTo(account.trigger.width, 96.4297, 0.02, `Account @ ${viewportWidth}px: original trigger width`);
        closeTo(logout.trigger.width, 54, 0.02, `Logout @ ${viewportWidth}px: original trigger width`);
      }
      results.push({ viewportWidth, account, logout });
    }

    if (failures.length > 0) {
      throw new Error(`Navbar tooltip contract failed (${failures.length}):\n- ${failures.join('\n- ')}`);
    }

    console.log('Authenticated account navbar tooltip contract verified');
    for (const { viewportWidth, account, logout } of results) {
      console.log(
        `  ${viewportWidth}px: Account ${account.inner.width.toFixed(3)} CSS px/${account.lines.length} line(s); Logout ${logout.inner.width.toFixed(3)} CSS px/${logout.lines.length} line`
      );
    }
    console.log(`  DPR2 screenshots: ${ACCOUNT_SCREENSHOT}, ${LOGOUT_SCREENSHOT}`);
  } finally {
    if (socket?.readyState === WebSocket.OPEN) socket.close();
    if (chrome && !chrome.killed) chrome.kill();
    if (chrome && chrome.exitCode === null) {
      await Promise.race([new Promise((resolve) => chrome.once('exit', resolve)), delay(2000)]);
    }
    rmSync(profileDirectory, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100
    });
  }
}

await main();
