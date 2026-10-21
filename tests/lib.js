// Shared helpers: serve repo root over file:// and drive the real calculate() in Chromium.
const path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'index.html');
async function launch() {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  return browser;
}
module.exports = { ROOT, URL, launch };
