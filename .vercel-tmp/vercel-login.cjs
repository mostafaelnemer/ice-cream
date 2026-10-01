#!/usr/bin/env node
/**
 * Vercel CLI Login Authorization Script (Cross-Platform)
 * Usage: node login.cjs
 */
const { spawnSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const isWindows = os.platform() === 'win32';

function createSecureLogFile() {
  const tmpDir = path.join(process.cwd(), '.vercel-tmp');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
  if (!isWindows) {
    try { fs.chmodSync(tmpDir, 0o700); } catch (e) { /* best effort */ }
  }
  return path.join(tmpDir, 'login.log');
}

const LOG_FILE = createSecureLogFile();

function log(msg) {
  console.error(msg);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function startBackgroundLogin() {
  const logStream = fs.openSync(LOG_FILE, 'w');
  const child = spawn('npx', ['vercel', 'login'], {
    detached: true,
    stdio: ['ignore', logStream, logStream],
    shell: isWindows
  });
  child.unref();
  log(`Background login process started (PID: ${child.pid})`);
  return child.pid;
}

function openBrowser(url) {
  const urlPattern = /^https:\/\/vercel\.com\/oauth\/device\?user_code=[A-Z0-9-]+$/;
  if (!urlPattern.test(url)) {
    log(`Error: URL does not match expected Vercel OAuth pattern: ${url}`);
    return;
  }
  try {
    if (os.platform() === 'darwin') {
      spawnSync('open', [url], { stdio: 'ignore' });
    } else if (os.platform() === 'win32') {
      spawnSync('powershell', ['-Command', `Start-Process '${url}'`], { stdio: 'ignore', windowsHide: true });
    } else {
      spawnSync('xdg-open', [url], { stdio: 'ignore' });
    }
    log('Browser opened automatically');
  } catch (error) {
    log(`Failed to open browser: ${error.message}`);
  }
}

async function waitForAuthUrl() {
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    try {
      if (fs.existsSync(LOG_FILE)) {
        const content = fs.readFileSync(LOG_FILE, 'utf8');
        const match = content.match(/https:\/\/vercel\.com\/oauth\/device\?user_code=[A-Z0-9-]+(?=\s|$)/);
        if (match) {
          return match[0];
        }
      }
    } catch (e) {
      if (e.code !== 'ENOENT') {
        log(`Warning: Error reading log file: ${e.code || e.message}`);
      }
    }
  }
  return null;
}

async function main() {
  log('Starting Vercel login...');
  const pid = startBackgroundLogin();
  const authUrl = await waitForAuthUrl();
  if (authUrl) {
    openBrowser(authUrl);
    console.log(JSON.stringify({ status: 'needs_auth', auth_url: authUrl }));
  } else {
    log('Failed to get authorization URL — log content:');
    try {
      log(fs.readFileSync(LOG_FILE, 'utf8'));
    } catch (e) { /* ignore */ }
    process.exit(1);
  }
}
main();
