// Climate module: consent-gated network, design vs current separation, explicit apply, JSON traceability.
const { URL: APP, launch } = require('./lib');
let fails = 0; const check = (ok, m) => { console.log(ok ? '✓' : '✗', m); if (!ok) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ geolocation: { latitude: 25.67, longitude: -100.31 }, permissions: ['geolocation'], locale: 'es-MX' });
  const page = await ctx.newPage();
  const calls = [];
  // 5 years of daily max: day i -> value (i % 100) / 2 + 10  => deterministic percentile
  const N = 1826, maxes = Array.from({ length: N }, (_, i) => (i % 100) / 2 + 10);
  const base = new Date(Date.UTC(2020, 0, 1));
  const times = maxes.map((_, i) => new Date(base.getTime() + i * 864e5).toISOString().slice(0, 10));
  await page.route(/open-meteo\.com/, r => {
    const u = new URL(r.request().url()); calls.push(u.hostname);
    const json = o => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(o) });
    if (u.hostname.startsWith('geocoding')) return json({ results: [{ name: 'Monterrey', admin1: 'Nuevo León', country: 'México', latitude: 25.67, longitude: -100.31, elevation: 540 }] });
    if (u.hostname.startsWith('archive')) return json({ daily: { time: times, temperature_2m_max: maxes } });
    return json({ current: { time: '2026-10-21T12:00', temperature_2m: 29.4 } });
  });
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(APP);
  await page.waitForTimeout(300);
  check(calls.length === 0, 'no network request before any click (consent)');
  const to0 = await page.inputValue('#To');
  await page.fill('#climSearch', 'Monterrey'); await page.click('#climSearchBtn');
  await page.click('#climResults button');
  await page.waitForSelector('#climCard:not([hidden])');
  const txt = await page.textContent('#climCard');
  const expected = await page.evaluate(m => window.btuClimate.percentile(m, 0.99), maxes);
  check(txt.includes('Temperatura ahora (informativa)') && txt.includes('29.4'), 'current temperature shown as informative only');
  check(txt.includes('Temperatura de diseño sugerida') && txt.includes(String(expected).replace('.', '.')), 'design temp = P99 of daily maxima (' + expected + ' °C)');
  check(await page.inputValue('#To') === to0, 'fetching climate does NOT change the exterior temperature');
  check(!(await page.evaluate(() => [...document.querySelectorAll('#climCard button')].some(x => /actual|ahora/i.test(x.textContent) && /aplicar/i.test(x.textContent)))), 'no apply button for the current temperature');
  await page.click('#climApply');
  check(await page.inputValue('#To') === String(expected), 'apply sets exterior design temp to ' + expected);
  const snap = await page.evaluate(() => window.btuClimate.snapshot());
  check(snap.applied === true && snap.fetchedAt && snap.design.period && snap.source, 'snapshot carries fetch date, period, source, applied flag');
  // project JSON traceability
  const exp = await page.evaluate(async () => { let blob; const orig = URL.createObjectURL; URL.createObjectURL = b => { blob = b; return orig(b) }; document.getElementById('studioExport').click(); URL.createObjectURL = orig; return JSON.parse(await blob.text()); });
  check(exp.engineVersion === 'v6.0' && exp.climate?.design?.tempC === expected, 'exported JSON has engineVersion + climate trace');
  // import restores climate; old JSON without climate still imports
  await page.click('#climClear');
  check(await page.evaluate(() => window.btuClimate.snapshot() === null), 'forget clears the snapshot');
  await page.evaluate(d => { window.btuClimate.restore(d.climate); }, exp);
  check(await page.evaluate(() => window.btuClimate.snapshot()?.site?.name === 'Monterrey, Nuevo León, México'), 'restore brings the climate trace back');
  await page.evaluate(() => window.btuClimate.restore(undefined));
  check(await page.evaluate(() => window.btuClimate.snapshot() !== null), 'restore(undefined) from a legacy JSON leaves state untouched (no crash)');
  // geolocation path
  await page.click('#climClear'); calls.length = 0;
  await page.click('#climGeoBtn'); await page.waitForSelector('#climCard:not([hidden])');
  check((await page.textContent('#climCard')).includes('Mi ubicación'), 'geolocation button works after explicit click');
  // failure path: offline
  await page.click('#climClear'); await page.unroute(/open-meteo\.com/); await page.route(/open-meteo\.com/, r => r.abort());
  await page.fill('#climSearch', 'Monterrey'); await page.click('#climSearchBtn');
  await page.waitForFunction(() => document.getElementById('climStatus').dataset.tone === 'warn');
  check(true, 'network failure shows a warning, app keeps working');
  check(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); process.exitCode = fails ? 1 : 0;
})();
