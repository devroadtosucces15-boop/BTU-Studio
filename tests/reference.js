// Independent re-implementation of the v6 formulas, checked against the rendered DOM (default inputs).
// Guards the golden baseline against being a snapshot of a bug introduced by the harness itself.
const { URL, launch } = require('./lib');
const parse = s => Number(s.replace(/,/g, ''));
(async () => {
  const b = await launch(), page = await b.newPage({ locale: 'es-MX' });
  await page.goto(URL);
  const txt = await page.evaluate(() => { document.querySelectorAll('.step-off').forEach(e => e.classList.remove('step-off')); return document.getElementById('out').innerText; });
  const L=10,W=8,H=4,Ti=2,To=35,Tf=20, V=L*W*H, wall=2*(L+W)*H, A=L*W;
  const qT=(.35*wall*(To-Ti)+.25*A*(To-Ti)+.3*A*(Tf-Ti))/1000;
  const qP=5000*3.8*(20-Ti)/(3600*18);
  const qI=V*2*4*1.2*1.005*(To-Ti)/3600;           // NOTE: ach[1/h]*airhours[h] -> kWh/period, rendered as kW
  const qInt=1.5+.2+1*300/1000+0;
  const total=(qT+qP+qI+qInt)*1.1;
  const m=txt.match(/Carga calculada con margen\s*([\d,.]+) kW/);
  const got=parse(m[1]);
  const ok=Math.abs(got-total)<0.01;
  console.log(ok?'✓':'✗','reference total',total.toFixed(4),'kW vs DOM',got,'kW');
  console.log('  breakdown kW:',{transmision:+qT.toFixed(3),producto:+qP.toFixed(3),infiltracion:+qI.toFixed(3),internas:qInt});
  await b.close(); process.exitCode=ok?0:1;
})();
