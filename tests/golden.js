// Golden tests for calculate(). `node tests/golden.js` compares; `--update` rewrites the baseline.
// The baseline captures what the engine renders TODAY (v6), so refactors can be proven value-neutral.
const fs = require('fs'), path = require('path');
const { URL, launch } = require('./lib');
const FILE = path.join(__dirname, 'golden', 'calculate.golden.json');
const update = process.argv.includes('--update');

const SCENARIOS = {
  default: {},
  conservacion: { __example: 'conservacion' },
  producto: { __example: 'producto' },
  aislamiento: { __example: 'aislamiento' },
  congelado: { Ti: -20, To: 38, Tf: 20, Tp: -5, mass: 3000, cp: 1.8, hours: 12, Uw: .22, Ur: .2, Uf: .25 },
  sin_producto: { mass: 0, people: 0, motors: 0, lights: 0 },
  hours_minimo: { hours: 0, mass: 1000 },            // hours clamps to 0.1
  ti_mayor_que_to: { Ti: 10, To: 5, Tp: 4 },         // negative dT clamps to 0
  verano_estacional: { seasonTo: 42, seasonTf: 28, alphaWall: .004, alphaRoof: .004, alphaFloor: .002, wetWall: 1.15, wetRoof: 1.1, wetFloor: 1.2, referenceTemp: 20 },
  invierno_estacional: { seasonTo: 8, seasonTf: 12, alphaWall: -.003, wetWall: .9 },
  infiltracion_alta: { ach: 6, airhours: 10, L: 20, W: 15, H: 6 },
  margen_cero: { margin: 0 },
  margen_negativo: { margin: -50 },                   // Math.max(0, margin) clamps
  vacio: { L: '', W: '', H: '', Ti: '', To: '' },     // empty -> Number('')||0
};

async function run(page, vals) {
  return page.evaluate(v => {
    const set = (id, x) => { const e = document.getElementById(id); e.value = x; };
    if (v.__example) loadExample(v.__example);
    for (const [k, x] of Object.entries(v)) if (k !== '__example') set(k, x);
    calculate();
    const text = id => document.getElementById(id)?.textContent ?? null;
    return {
      out: document.getElementById('out').innerText.replace(/\s+/g, ' ').trim(),
      surfaces: ['areaWallsOut','areaRoofOut','areaFloorOut','rWallsOut','rRoofOut','rFloorOut','qWallsOut','qRoofOut','qFloorOut','seasonalTrace'].map(text),
      bars: [...document.querySelectorAll('#out .bar')].map(b => b.style.width),
    };
  }, vals);
}

(async () => {
  const browser = await launch();
  const results = {};
  for (const [name, vals] of Object.entries(SCENARIOS)) {
    const ctx = await browser.newContext({ locale: 'es-MX' });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    await page.goto(URL);
    results[name] = await run(page, vals);
    if (errors.length) { console.error(name, 'page errors:', errors); process.exitCode = 1; }
    await ctx.close();
  }
  await browser.close();
  if (update) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.writeFileSync(FILE, JSON.stringify(results, null, 2) + '\n'); console.log('baseline written:', Object.keys(results).length, 'scenarios'); return; }
  const gold = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  let bad = 0;
  for (const name of Object.keys({ ...gold, ...results })) {
    if (JSON.stringify(gold[name]) !== JSON.stringify(results[name])) { bad++; console.error('✗ DIFF', name); } else console.log('✓', name);
  }
  if (bad) process.exitCode = 1;
})();
