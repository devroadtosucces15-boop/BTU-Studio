/* BTU Studio — site climate (Open-Meteo), opt-in only.
   Nothing is requested until the user presses a button. "Current temperature" and "design temperature"
   are kept apart: only the statistical design value can be applied to the exterior-temperature field. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const KEY='btu-v6-climate',YEARS=5,PCT=0.99;
const API={geo:'https://geocoding-api.open-meteo.com/v1/search',now:'https://api.open-meteo.com/v1/forecast',hist:'https://archive-api.open-meteo.com/v1/archive'};
let state=null;                                   // last climate snapshot (also exported with the project)
const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}};
const store=()=>{try{state?localStorage.setItem(KEY,JSON.stringify(state)):localStorage.removeItem(KEY)}catch{}};
const fmt=x=>Number.isFinite(x)?x.toLocaleString('es-MX',{maximumFractionDigits:1}):'—';
const iso=d=>d.toISOString().slice(0,10);
/* nearest-rank percentile; exposed for tests */
function percentile(values,p){const v=values.filter(Number.isFinite).sort((a,b)=>a-b);if(!v.length)return NaN;return v[Math.min(v.length-1,Math.max(0,Math.ceil(p*v.length)-1))]}
async function getJSON(url,params){
  const u=new URL(url);Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));
  const r=await fetch(u,{headers:{accept:'application/json'}});
  if(!r.ok)throw new Error('Open-Meteo respondió '+r.status);
  return r.json();
}
const status=(t,tone)=>{const s=$('climStatus');s.textContent=t;s.dataset.tone=tone||''};
const busy=on=>['climSearchBtn','climGeoBtn','climApply'].forEach(id=>{const b=$(id);if(b)b.disabled=on});

async function search(){
  const q=$('climSearch').value.trim();if(q.length<2){status('Escribe al menos 2 letras del lugar.','warn');return}
  busy(true);status('Consultando Open-Meteo…');$('climResults').replaceChildren();
  try{
    const j=await getJSON(API.geo,{name:q,count:5,language:'es',format:'json'});
    const rows=j.results||[];
    if(!rows.length){status('Sin coincidencias para “'+q+'”.','warn');return}
    status('Elige el lugar correcto:');
    rows.forEach(r=>{const b=document.createElement('button');b.type='button';b.textContent=[r.name,r.admin1,r.country].filter(Boolean).join(', ')+(r.elevation!=null?' · '+Math.round(r.elevation)+' m':'');b.addEventListener('click',()=>fetchClimate({lat:r.latitude,lon:r.longitude,name:[r.name,r.admin1,r.country].filter(Boolean).join(', '),elevation:r.elevation??null}));$('climResults').append(b)});
  }catch(e){status('No se pudo buscar el lugar ('+e.message+'). Revisa tu conexión.','warn')}finally{busy(false)}
}
function useGeolocation(){
  if(!navigator.geolocation){status('Este navegador no ofrece geolocalización. Busca el lugar por nombre.','warn');return}
  status('Esperando tu permiso de ubicación…');
  navigator.geolocation.getCurrentPosition(p=>fetchClimate({lat:+p.coords.latitude.toFixed(3),lon:+p.coords.longitude.toFixed(3),name:'Mi ubicación (aprox.)',elevation:null}),
    e=>status(e.code===1?'Permiso de ubicación denegado. Puedes buscar el lugar por nombre.':'No se pudo obtener tu ubicación.','warn'),{enableHighAccuracy:false,timeout:15000,maximumAge:600000});
}
async function fetchClimate(site){
  busy(true);$('climResults').replaceChildren();status('Descargando temperatura actual e histórico de '+YEARS+' años…');
  try{
    const end=new Date(Date.now()-7*864e5),start=new Date(end);start.setUTCFullYear(end.getUTCFullYear()-YEARS);
    const [cur,hist]=await Promise.all([
      getJSON(API.now,{latitude:site.lat,longitude:site.lon,current:'temperature_2m',timezone:'auto'}),
      getJSON(API.hist,{latitude:site.lat,longitude:site.lon,start_date:iso(start),end_date:iso(end),daily:'temperature_2m_max',timezone:'auto'})
    ]);
    const maxes=hist.daily?.temperature_2m_max||[],dates=hist.daily?.time||[];
    const valid=maxes.filter(Number.isFinite);
    if(valid.length<365)throw new Error('histórico insuficiente');
    const MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const m=MONTHS.indexOf($('studioMonth')?.value)+1;              // 1–12, or 0 when no reference month is chosen
    const monthVals=m>=1?maxes.filter((v,i)=>Number.isFinite(v)&&Number(String(dates[i]).slice(5,7))===m):[];
    state={
      site,fetchedAt:new Date().toISOString(),source:'Open-Meteo (forecast + ERA5 historical)',
      current:{tempC:cur.current?.temperature_2m,time:cur.current?.time},
      design:{method:'P'+PCT*100+' de máximas diarias',years:YEARS,period:iso(start)+' a '+iso(end),days:valid.length,tempC:+percentile(valid,PCT).toFixed(1),absoluteMaxC:Math.max(...valid),
        month:monthVals.length?{month:m,meanOfDailyMaxC:+(monthVals.reduce((a,b)=>a+b,0)/monthVals.length).toFixed(1)}:null},
      applied:false
    };
    store();render();status('Listo. Revisa los datos antes de aplicarlos.');
  }catch(e){status('No se pudo obtener el clima ('+e.message+'). Puedes escribir las temperaturas a mano.','warn')}finally{busy(false)}
}
function apply(){
  if(!state)return;const to=$('To');to.value=String(state.design.tempC);
  to.dispatchEvent(new Event('input',{bubbles:true}));
  if(typeof calculate==='function')calculate();
  state.applied=true;state.appliedAt=new Date().toISOString();store();render();
  status('Temperatura exterior de diseño actualizada a '+fmt(state.design.tempC)+' °C. Es tu decisión validarla.');
}
function render(){
  const card=$('climCard');if(!state){card.hidden=true;return}
  card.hidden=false;card.replaceChildren();
  const row=(label,value,note)=>{const d=document.createElement('div');d.className='clim-row';const l=document.createElement('span');l.textContent=label;const v=document.createElement('b');v.textContent=value;d.append(l,v);if(note){const n=document.createElement('small');n.textContent=note;d.append(n)}card.append(d)};
  const t=document.createElement('h3');t.textContent=state.site.name;card.append(t);
  row('Temperatura ahora (informativa)',fmt(state.current.tempC)+' °C','Dato puntual de '+(state.current.time||'—')+'. No es una condición de diseño y no se aplica al cálculo.');
  row('Temperatura de diseño sugerida',fmt(state.design.tempC)+' °C','Percentil '+PCT*100+' de las máximas diarias de '+state.design.period+' ('+state.design.days+' días). Máximo absoluto: '+fmt(state.design.absoluteMaxC)+' °C.');
  if(state.design.month)row('Promedio de máximas en el mes '+state.design.month,fmt(state.design.month.meanOfDailyMaxC)+' °C','Solo contexto estacional.');
  const f=document.createElement('p');f.className='clim-meta';f.textContent='Consultado el '+new Date(state.fetchedAt).toLocaleString('es-MX')+' · Referencia estadística de reanálisis, no una norma de diseño: confirma con la normativa o datos locales de tu proyecto.'+(state.applied?' · Aplicada a la temperatura exterior':'');card.append(f);
  const b=document.createElement('button');b.type='button';b.id='climApply';b.className='primary';b.textContent='Aplicar '+fmt(state.design.tempC)+' °C como temperatura exterior de diseño';b.addEventListener('click',apply);card.append(b);
  const c=document.createElement('button');c.type='button';c.id='climClear';c.textContent='Olvidar este dato';c.addEventListener('click',()=>{state=null;store();render();status('Dato climático eliminado de este navegador.')});card.append(c);
}
const bind=()=>{if(!$('climSearchBtn'))return;$('climSearchBtn').addEventListener('click',search);$('climSearch').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();search()}});$('climGeoBtn').addEventListener('click',useGeolocation);state=load();render()};
window.btuClimate={snapshot:()=>state?JSON.parse(JSON.stringify(state)):null,restore:s=>{if(s&&typeof s==='object'&&s.design&&s.site){state=s;store();render()}},percentile};
bind();
})();
