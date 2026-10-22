// Material library: R = e/λ, U = 1/ΣR, explicit "Usar", limits, and engine consistency.
const { URL: APP, launch } = require('./lib');
let fails = 0; const check = (ok, m) => { console.log(ok ? '✓' : '✗', m); if (!ok) fails++; };
const close = (a, b, e = 1e-3) => Math.abs(a - b) < e;
(async () => {
  const b = await launch(), page = await (await b.newContext({ locale: 'es-MX' })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(APP);
  await page.click('#appSteps button[data-step="3"]');
  const uw0 = await page.inputValue('#Uw');
  check(await page.locator('#matLayers li.mat-empty').count() === 1 && await page.isDisabled('#matUse'), 'starts empty, "Usar" disabled');
  await page.selectOption('#matSelect', 'pur'); await page.fill('#matThick', '100'); await page.click('#matAdd');
  const exp = 1 / (0.1 / 0.024 + 0.13 + 0.04);
  const t = await page.evaluate(() => window.btuMaterials.totals());
  check(close(t.u, exp), 'PUR 100 mm → U = ' + exp.toFixed(4) + ' (got ' + t.u.toFixed(4) + ')');
  check(await page.inputValue('#Uw') === uw0, 'building a stack does not touch Uw');
  // two layers: add concrete 150 mm
  await page.selectOption('#matSelect', 'conc'); await page.fill('#matThick', '150'); await page.click('#matAdd');
  const exp2 = 1 / (0.1 / 0.024 + 0.15 / 1.7 + 0.17);
  check(close((await page.evaluate(() => window.btuMaterials.totals())).u, exp2), 'two layers sum resistances');
  // apply to walls and verify engine uses it: walls kW = U*A*dT/1000
  await page.click('#matUse');
  check(await page.inputValue('#Uw') === exp2.toFixed(3) && await page.inputValue('#wallType') === 'custom', 'Usar sets Uw and wall type = custom');
  const text = await page.evaluate(() => { document.querySelectorAll('.step-off').forEach(e => e.classList.remove('step-off')); return document.getElementById('out').innerText; });
  const wallsKw = Number(exp2.toFixed(3)) * (2 * 18 * 4) * 33 / 1000;
  check(new RegExp('1\\. Paredes: ' + wallsKw.toFixed(2).replace('.', '\\.')).test(text), 'engine walls load matches U×A×ΔT = ' + wallsKw.toFixed(2) + ' kW');
  // surface switch + floor uses Tf
  await page.selectOption('#matSurface', 'floor');
  check((await page.textContent('#matQnote')).includes('Piso'), 'floor surface uses its own ΔT note');
  // limits and validation
  await page.fill('#matThick', '0'); await page.click('#matAdd');
  check((await page.textContent('#matStatus')).includes('mayores que cero'), 'rejects zero thickness');
  await page.fill('#matThick', '10');
  for (let i = 0; i < 8; i++) await page.click('#matAdd');
  check(await page.locator('#matLayers li').count() === 6, 'max 6 layers');
  // remove layer
  await page.click('#matLayers li:first-child button');
  check(await page.locator('#matLayers li').count() === 5, 'remove layer works');
  // comparison chart ordering: better insulant → smaller U (bars sorted ascending)
  const vals = await page.$$eval('#matCompare .chartval', n => n.map(x => parseFloat(x.textContent.replace(',', '.'))));
  check(vals.length === 6 && vals.every((v, i) => i === 0 || v >= vals[i - 1]), 'comparison sorted from best to worst insulant');
  await page.click('#matClear');
  check(await page.isDisabled('#matUse'), 'clear empties the stack');
  check(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); process.exitCode = fails ? 1 : 0;
})();
