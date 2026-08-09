import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const chromeBinary =
  process.env.PTR_CHROME_BINARY ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const targetUrl = process.env.PTR_TARGET_URL ?? 'http://localhost:5178/';
const chromeProfile = mkdtempSync(join(tmpdir(), 'ptr-navbar-computed-audit-'));
const expected = {
  hamburger: 'rgb(204, 204, 204)',
  hamburgerHover: 'rgb(238, 238, 238)',
  micGearHover: 'rgb(255, 255, 255)',
  navbarLink: 'rgb(171, 176, 181)',
  navbarLinkHover: 'rgb(171, 176, 181)',
  speaking: 'rgb(247, 253, 55)',
  speakingRawText: ' ( No one is speaking )',
  speakingText: '( No one is speaking )',
  speakingVariable: '#f7fd37'
};

const chrome = spawn(
  chromeBinary,
  [
    '--headless=new',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-sync',
    '--metrics-recording-only',
    '--no-first-run',
    '--no-default-browser-check',
    '--remote-debugging-pipe',
    `--user-data-dir=${chromeProfile}`,
    'about:blank'
  ],
  {
    stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe']
  }
);

const requestPipe = chrome.stdio[3];
const responsePipe = chrome.stdio[4];

if (!requestPipe || !responsePipe) {
  chrome.kill();
  throw new Error('Chrome did not expose the DevTools protocol pipes.');
}

let nextRequestId = 1;
let responseBuffer = Buffer.alloc(0);
const pendingRequests = new Map();
const eventWaiters = new Set();
const styleSheetUrls = new Map();

function send(method, params = {}, sessionId) {
  const id = nextRequestId++;
  const payload = { id, method, params };
  if (sessionId) payload.sessionId = sessionId;

  return new Promise((resolve, reject) => {
    pendingRequests.set(id, { resolve, reject });
    requestPipe.write(`${JSON.stringify(payload)}\0`);
  });
}

function waitForEvent(method, sessionId, timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    const waiter = {
      method,
      sessionId,
      resolve: (params) => {
        clearTimeout(timer);
        eventWaiters.delete(waiter);
        resolve(params);
      }
    };
    const timer = setTimeout(() => {
      eventWaiters.delete(waiter);
      reject(new Error(`Timed out waiting for ${method}.`));
    }, timeoutMs);
    eventWaiters.add(waiter);
  });
}

function handleProtocolMessage(message) {
  if (message.method === 'CSS.styleSheetAdded') {
    styleSheetUrls.set(message.params.header.styleSheetId, message.params.header.sourceURL);
  }

  if (message.id) {
    const pending = pendingRequests.get(message.id);
    if (!pending) return;
    pendingRequests.delete(message.id);
    if (message.error) pending.reject(new Error(`${message.error.code}: ${message.error.message}`));
    else pending.resolve(message.result);
    return;
  }

  for (const waiter of eventWaiters) {
    if (waiter.method === message.method && waiter.sessionId === message.sessionId) {
      waiter.resolve(message.params);
    }
  }
}

responsePipe.on('data', (chunk) => {
  responseBuffer = Buffer.concat([responseBuffer, chunk]);
  let separatorIndex = responseBuffer.indexOf(0);
  while (separatorIndex !== -1) {
    const raw = responseBuffer.subarray(0, separatorIndex).toString('utf8');
    responseBuffer = responseBuffer.subarray(separatorIndex + 1);
    if (raw) handleProtocolMessage(JSON.parse(raw));
    separatorIndex = responseBuffer.indexOf(0);
  }
});

chrome.stderr.on('data', (chunk) => {
  const message = chunk.toString('utf8').trim();
  if (message) process.stderr.write(`${message}\n`);
});

chrome.on('exit', (code, signal) => {
  if (pendingRequests.size === 0) return;
  const error = new Error(`Chrome exited before the audit completed (${signal ?? code}).`);
  for (const pending of pendingRequests.values()) pending.reject(error);
  pendingRequests.clear();
});

async function nodeIdFor(selector, rootNodeId, sessionId) {
  const result = await send('DOM.querySelector', { nodeId: rootNodeId, selector }, sessionId);
  if (!result.nodeId) throw new Error(`Required navbar selector was not found: ${selector}`);
  return result.nodeId;
}

async function evaluate(expression, sessionId) {
  const result = await send(
    'Runtime.evaluate',
    { expression, returnByValue: true, awaitPromise: true },
    sessionId
  );
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? 'Runtime evaluation failed.');
  }
  return result.result.value;
}

function relevantColorRules(matchedStyles) {
  return matchedStyles.matchedCSSRules
    .flatMap(({ rule }) => {
      const declarations = rule.style.cssProperties.filter(
        ({ name, disabled }) => name === 'color' && !disabled
      );
      return declarations.map(({ value, important }) => ({
        selector: rule.selectorList.text,
        value,
        important: Boolean(important),
        origin: rule.origin,
        source: styleSheetUrls.get(rule.styleSheetId) ?? rule.styleSheetId ?? 'inline'
      }));
    })
    .filter(({ selector }) =>
      /talkingIndicator|sidebar-menu|navbar-dark|a:(?:link|visited|active)/.test(selector)
    );
}

async function run() {
  const target = await send('Target.createTarget', { url: 'about:blank' });
  const attached = await send('Target.attachToTarget', {
    targetId: target.targetId,
    flatten: true
  });
  const sessionId = attached.sessionId;

  await Promise.all([
    send('Page.enable', {}, sessionId),
    send('Runtime.enable', {}, sessionId),
    send('DOM.enable', {}, sessionId),
    send('CSS.enable', {}, sessionId)
  ]);

  const loaded = waitForEvent('Page.loadEventFired', sessionId);
  await send('Page.navigate', { url: targetUrl }, sessionId);
  await loaded;

  const document = await send('DOM.getDocument', { depth: -1, pierce: true }, sessionId);
  const hamburgerNodeId = await nodeIdFor(
    '.mainAppNav .sidebar-menu',
    document.root.nodeId,
    sessionId
  );
  const speakingNodeId = await nodeIdFor(
    '.mainAppNav .talkingIndicator a',
    document.root.nodeId,
    sessionId
  );
  const navbarLinkNodes = await send(
    'DOM.querySelectorAll',
    { nodeId: document.root.nodeId, selector: '#navbarsRoom .navbar-nav .nav-link' },
    sessionId
  );

  const base = await evaluate(
    `(() => {
      const hamburger = document.querySelector('.mainAppNav .sidebar-menu');
      const speaking = document.querySelector('.mainAppNav .talkingIndicator a');
      const root = getComputedStyle(document.documentElement);
      return {
        hamburger: getComputedStyle(hamburger).color,
        speaking: getComputedStyle(speaking).color,
        speakingRawText: speaking.textContent,
        speakingText: speaking.textContent.trim(),
        speakingVariable: root.getPropertyValue('--presenter-noRecording-color').trim()
      };
    })()`,
    sessionId
  );

  await send(
    'CSS.forcePseudoState',
    { nodeId: hamburgerNodeId, forcedPseudoClasses: ['hover'] },
    sessionId
  );
  const hamburgerHover = await evaluate(
    `getComputedStyle(document.querySelector('.mainAppNav .sidebar-menu')).color`,
    sessionId
  );
  await send(
    'CSS.forcePseudoState',
    { nodeId: hamburgerNodeId, forcedPseudoClasses: [] },
    sessionId
  );

  const navbarLinks = [];
  for (let index = 0; index < navbarLinkNodes.nodeIds.length; index += 1) {
    const nodeId = navbarLinkNodes.nodeIds[index];
    const baseLink = await evaluate(
      `(() => {
        const link = document.querySelectorAll('#navbarsRoom .navbar-nav .nav-link')[${index}];
        return {
          className: link.className,
          id: link.id,
          title: link.title,
          text: link.textContent.trim(),
          color: getComputedStyle(link).color
        };
      })()`,
      sessionId
    );
    await send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] }, sessionId);
    const hoverColor = await evaluate(
      `getComputedStyle(document.querySelectorAll('#navbarsRoom .navbar-nav .nav-link')[${index}]).color`,
      sessionId
    );
    await send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] }, sessionId);
    navbarLinks.push({ ...baseLink, hoverColor });
  }

  const [hamburgerRules, speakingRules] = await Promise.all([
    send('CSS.getMatchedStylesForNode', { nodeId: hamburgerNodeId }, sessionId),
    send('CSS.getMatchedStylesForNode', { nodeId: speakingNodeId }, sessionId)
  ]);

  const actual = { ...base, hamburgerHover };
  const failures = Object.entries(expected)
    .filter(([key, value]) =>
      key.startsWith('navbarLink') || key === 'micGearHover' ? false : actual[key] !== value
    )
    .map(([key, value]) => ({ property: key, expected: value, actual: actual[key] }));
  for (const link of navbarLinks) {
    if (link.color !== expected.navbarLink) {
      failures.push({
        property: `navbarLink:${link.id || link.title || link.text}:color`,
        expected: expected.navbarLink,
        actual: link.color
      });
    }
    const expectedHover = link.className.includes('mic-gear-btn')
      ? expected.micGearHover
      : expected.navbarLinkHover;
    if (link.hoverColor !== expectedHover) {
      failures.push({
        property: `navbarLink:${link.id || link.title || link.text}:hover`,
        expected: expectedHover,
        actual: link.hoverColor
      });
    }
  }

  console.log(
    JSON.stringify(
      {
        targetUrl,
        expected,
        actual,
        navbarLinks,
        failures,
        matchedColorRules: {
          hamburger: relevantColorRules(hamburgerRules),
          speaking: relevantColorRules(speakingRules)
        }
      },
      null,
      2
    )
  );

  if (failures.length > 0) process.exitCode = 1;
}

try {
  await run();
} finally {
  if (chrome.exitCode === null && chrome.signalCode === null) {
    const chromeExited = new Promise((resolve) => chrome.once('exit', resolve));
    chrome.kill();
    await chromeExited;
  }
  rmSync(chromeProfile, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 50
  });
}
