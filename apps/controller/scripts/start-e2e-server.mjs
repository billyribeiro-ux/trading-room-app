import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const port = Number.parseInt(process.argv[2] ?? '', 10);
if (!Number.isSafeInteger(port) || port < 1024 || port > 65_535) {
  throw new Error('start-e2e-server requires a validated non-privileged TCP port.');
}
// No temp directory any more. It existed only to hold the ephemeral SQLite file;
// the database is now a real server addressed by URL, so there is nothing on disk
// for this script to create or clean up.
const environment = {
  ...process.env,
  API_KEY_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
  CONTROL_PLANE_MODE: 'postgres',
  // Pinned, not inherited: a developer .env holding one half of the reCAPTCHA pair
  // makes the runtime refuse to start, which would fail Playwright for an unrelated reason.
  PUBLIC_RECAPTCHA_SITE_KEY: '',
  RECAPTCHA_SECRET_KEY: '',
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://localhost:5432/tradingroom_e2e',
  ROOM_JWT_SECRET: randomBytes(32).toString('hex')
};

const gracefulStopMs = 10_000;
const forcedStopMs = 5_000;
let stopping = false;
let stopPromise;
let activeChild;
let activeExit;

function run(command, args) {
  const child = spawn(command, args, {
    cwd: root,
    env: environment,
    stdio: 'inherit'
  });
  activeChild = child;
  activeExit = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  return activeExit;
}

function runVite(command, args) {
  // Run the repository-pinned Vite CLI directly and keep it in Playwright's
  // process group. A `pnpm` wrapper plus a detached child can survive
  // Playwright's tree kill and retain the readiness port indefinitely.
  const viteCli = fileURLToPath(new URL('../node_modules/vite/bin/vite.js', import.meta.url));
  return run(process.execPath, [viteCli, command, ...args]);
}

function signalActiveChild(signal) {
  if (!activeChild || activeChild.exitCode !== null || activeChild.signalCode !== null) return;

  activeChild.kill(signal);
}

async function activeChildExitedWithin(timeoutMs) {
  if (!activeExit) return true;

  let timeout;
  try {
    return await Promise.race([
      activeExit.then(
        () => true,
        () => true
      ),
      new Promise((resolve) => {
        timeout = setTimeout(() => resolve(false), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function stopActiveExecution(signal) {
  stopping = true;

  signalActiveChild(signal);
  if (!(await activeChildExitedWithin(gracefulStopMs))) {
    signalActiveChild('SIGKILL');
    if (!(await activeChildExitedWithin(forcedStopMs))) {
      throw new Error(`E2E server process group did not exit after ${gracefulStopMs + forcedStopMs}ms.`);
    }
  }
}

function stop(signal) {
  stopPromise ??= stopActiveExecution(signal);
  return stopPromise;
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => {
    void stop(signal).then(
      () => process.exit(0),
      (error) => {
        console.error(error);
        process.exit(1);
      }
    );
  });
}

try {
  // SvelteKit's official Playwright guidance builds and previews the production
  // output. The observed Vite development-client full reloads raced the
  // delayed-script hydration harness and cleared already-filled form fields.
  const build = await runVite('build', []);
  if (!stopping && build.code !== 0) {
    throw new Error(`E2E production build failed (${build.signal ?? `exit ${build.code}`}).`);
  }

  if (!stopping) {
    const preview = await runVite('preview', ['--host', '127.0.0.1', '--port', String(port), '--strictPort']);
    if (!stopping && preview.code !== 0) {
      throw new Error(`E2E production preview failed (${preview.signal ?? `exit ${preview.code}`}).`);
    }
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
