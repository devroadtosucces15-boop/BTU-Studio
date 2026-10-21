// Behavioural tests for feedback.js: layer lifecycle, truthful status, focus handling, touch, localStorage safety.
const { URL, launch } = require('./lib');
let fails = 0;
const check = (ok, msg) => { console.log(ok ? '✓' : '✗', msg); if (!ok) fails++; };
(async () => {
  const b = await launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto(URL);
  // seed protected keys; they must survive every feedback action
  await page.evaluate(() => { localStorage.setItem('btu-v6-autosave', '{"L":"11"}'); localStorage.setItem('btu-v6-projects', '{"p":{}}'); });
  const layerCaptures = () => page.evaluate(() => { const l = document.getElementById('btu-feedback-layer'); const cs = getComputedStyle(l); return cs.display !== 'none' && cs.pointerEvents !== 'none'; });
  check(!(await layerCaptures()), 'idle: no capture layer');
  await page.tap('#appReports');
  check(!(await layerCaptures()), 'menu: capture layer inactive (no invisible overlay)');
  check(await page.evaluate(() => !!document.elementFromPoint(200, 400) && document.elementFromPoint(200, 400).closest('#btu-feedback-mask') === null), 'menu: taps reach the page underneath');
  await page.tap('text=Mis reportes');
  check(!(await layerCaptures()), 'list: capture layer inactive');
  check(await page.evaluate(() => document.activeElement.id === 'btu-feedback-panel'), 'list: focus moved into dialog');
  check(await page.evaluate(() => document.querySelector('#btu-feedback-panel').getAttribute('aria-labelledby') === 'btu-feedback-title'), 'dialog labelled by its heading');
  await page.tap('text=Nueva anotación');
  check(await layerCaptures(), 'annotate: layer active');
  // touch drag with CDP-less approach: dispatch pointer events
  await page.evaluate(() => { const l = document.getElementById('btu-feedback-layer'); const f = (t, x, y) => l.dispatchEvent(new PointerEvent(t, { pointerId: 1, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, cancelable: true, button: 0 })); f('pointerdown', 40, 200); f('pointermove', 200, 300); f('pointerup', 200, 300); });
  check(await page.evaluate(() => document.querySelectorAll('#btu-feedback-layer rect').length === 1), 'annotate: touch drag draws a mark');
  await page.tap('text=Continuar');
  check(!(await layerCaptures()), 'compose: capture layer inactive');
  check(await page.evaluate(() => document.getElementById('btu-feedback-panel').textContent.includes('registrada')), 'compose: area recorded');
  check(await page.evaluate(() => !!document.querySelector('main, body > :not(script)')?.hasAttribute('inert') || [...document.body.children].some(n => n.hasAttribute('inert'))), 'compose: background inert');
  await page.click('text=Guardar reporte');
  check(await page.evaluate(() => document.getElementById('btu-f-desc') === document.activeElement), 'validation returns focus to description');
  await page.fill('#btu-f-desc', 'Prueba de reporte');
  await page.click('text=Guardar reporte');
  check(await page.evaluate(() => document.getElementById('btu-feedback-panel').textContent.includes('Pendiente de envío')), 'saved: status is pending, not "sent"');
  await page.evaluate(() => document.querySelector('#btu-feedback-panel a.btu-primary').addEventListener('click', e => e.preventDefault(), { capture: true }));
  await page.click('#btu-feedback-panel a.btu-primary');
  const st = await page.evaluate(() => JSON.parse(localStorage.getItem('btu-studio-feedback-v1'))[0].status);
  check(st.includes('sin confirmar'), 'opening GitHub is recorded as unconfirmed: "' + st + '"');
  const href = await page.evaluate(() => document.querySelector('#btu-feedback-panel a.btu-primary').href);
  check(href.length < 8000 && href.includes('/issues/new?title='), 'issue URL within limit (' + href.length + ')');
  // focus trap
  for (let i = 0; i < 8; i++) await page.keyboard.press('Tab');
  check(await page.evaluate(() => document.getElementById('btu-feedback-panel').contains(document.activeElement)), 'Tab stays inside dialog');
  await page.keyboard.press('Escape');
  check(await page.evaluate(() => getComputedStyle(document.getElementById('btu-feedback-mask')).display === 'none' && !document.querySelector('[inert]')), 'Escape closes and removes inert');
  check(await page.evaluate(() => document.activeElement.id === 'appReports'), 'focus restored to launcher');
  check(await page.evaluate(() => localStorage.getItem('btu-v6-projects') === '{"p":{}}' && localStorage.getItem('btu-v6-autosave') !== null), 'feedback leaves btu-v6-projects / autosave untouched (autosave is rewritten only by the app itself)');
  // long description trimmed
  check(errs.length === 0, 'no page errors ' + errs.join(' | '));
  await b.close(); process.exitCode = fails ? 1 : 0;
})();
