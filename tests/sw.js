// Service worker: precache covers every asset the page references; offline reload works; old caches are purged.
const http = require('http'), fs = require('fs'), path = require('path');
const { ROOT, launch } = require('./lib');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
let fails = 0; const check = (ok, m) => { console.log(ok ? '✓' : '✗', m); if (!ok) fails++; };
(async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, q.url.split('?')[0].replace(/\/$/, '/index.html')); if (!f.startsWith(ROOT) || !fs.existsSync(f)) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', types[path.extname(f)] || 'application/octet-stream'); r.end(fs.readFileSync(f)); }).listen(0);
  const base = 'http://localhost:' + srv.address().port + '/';
  const b = await launch(), ctx = await b.newContext(), page = await ctx.newPage();
  await page.goto(base); await page.evaluate(() => navigator.serviceWorker.ready);
  await page.evaluate(async () => { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); await caches.open('btu-old-test'); });
  await page.reload(); await page.evaluate(() => navigator.serviceWorker.ready); await page.waitForTimeout(800);
  const names = await page.evaluate(() => caches.keys());
  check(names.length === 1 && names[0].startsWith('btu-v'), 'single current cache after activate: ' + names);
  // every local asset the page requested must be inside the cache
  const reqs = await page.evaluate(() => performance.getEntriesByType('resource').map(r => r.name).filter(n => n.startsWith(location.origin)));
  const cached = await page.evaluate(async () => (await (await caches.open((await caches.keys())[0])).keys()).map(r => r.url));
  const missing = reqs.filter(u => !cached.includes(u) && !u.endsWith('sw.js'));
  check(missing.length === 0, 'all page resources precached' + (missing.length ? ' — missing: ' + missing : ''));
  await ctx.setOffline(true);
  await page.reload();
  check(await page.evaluate(() => !!document.getElementById('out') && document.getElementById('btu-feedback-launch') !== null), 'offline reload renders app + feedback');
  await b.close(); srv.close(); process.exitCode = fails ? 1 : 0;
})();
