/* BTU Studio — material library and layer builder.
   Educational: layer resistances R = e/λ are summed with surface films to give U = 1/Rtotal.
   Reads inputs only; it changes the engine inputs (Uw/Ur/Uf) solely when the user presses "Usar".
   λ values are representative mid-range figures for orientation. Use the manufacturer's data sheet for design. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
/* id, name, group, λ nominal, λ range [min,max] in W/m·K */
const CATALOG=[
 ['pur','Poliuretano / PIR (núcleo de panel)','Aislantes',0.024,[0.022,0.028]],
 ['xps','Poliestireno extruido (XPS)','Aislantes',0.034,[0.030,0.036]],
 ['eps','Poliestireno expandido (EPS)','Aislantes',0.037,[0.032,0.040]],
 ['mw','Lana mineral','Aislantes',0.038,[0.032,0.045]],
 ['fg','Vidrio celular','Aislantes',0.045,[0.040,0.055]],
 ['cork','Corcho expandido','Aislantes',0.040,[0.037,0.045]],
 ['conc','Concreto denso','Estructura',1.7,[1.4,2.0]],
 ['brick','Ladrillo cerámico','Estructura',0.6,[0.4,0.8]],
 ['wood','Madera','Estructura',0.15,[0.12,0.18]],
 ['steel','Acero (lámina)','Estructura',50,[45,58]]
];
const BY=Object.fromEntries(CATALOG.map(r=>[r[0],{id:r[0],name:r[1],group:r[2],lambda:r[3],range:r[4]}]));
const MAX_LAYERS=6;
let layers=[];                                    // {id,name,mm,lambda}
const num=(id,d=0)=>{const x=Number($(id)?.value);return Number.isFinite(x)?x:d};
const pos=(id)=>Math.max(0,num(id));
const fmt=(x,d=2)=>Number.isFinite(x)?x.toLocaleString('es-MX',{maximumFractionDigits:d}):'—';
const R=l=>l.lambda>0?(l.mm/1000)/l.lambda:0;
function totals(){const films=pos('matRsi')+pos('matRse');const layersR=layers.reduce((a,l)=>a+R(l),0);const rt=layersR+films;return{layersR,films,rt,u:rt>0?1/rt:0}}

function fillSelect(){
  const s=$('matSelect');let group='',og;
  CATALOG.forEach(([id,name,g])=>{if(g!==group){og=document.createElement('optgroup');og.label=g;s.append(og);group=g}const o=document.createElement('option');o.value=id;o.textContent=name;og.append(o)});
  onPick();
}
function onPick(){const m=BY[$('matSelect').value];$('matLambda').value=m.lambda;$('matRange').textContent='Rango típico: '+m.range[0]+'–'+m.range[1]+' W/m·K'}
function addLayer(){
  const m=BY[$('matSelect').value],mm=num('matThick'),lambda=num('matLambda');
  const st=$('matStatus');
  if(layers.length>=MAX_LAYERS){st.textContent='Máximo '+MAX_LAYERS+' capas.';return}
  if(!(mm>0)||!(lambda>0)){st.textContent='Espesor y λ deben ser mayores que cero.';return}
  layers.push({id:m.id,name:m.name,mm,lambda});st.textContent='';render();
}
function surfaceInfo(){
  const L=pos('L'),W=pos('W'),H=pos('H'),Ti=num('Ti'),To=num('To'),Tf=num('Tf');
  const s=$('matSurface').value;
  if(s==='walls')return{label:'Paredes',area:2*(L+W)*H,dT:Math.max(0,To-Ti),input:'Uw',type:'wallType'};
  if(s==='roof')return{label:'Techo',area:L*W,dT:Math.max(0,To-Ti),input:'Ur',type:'roofType'};
  return{label:'Piso',area:L*W,dT:Math.max(0,Tf-Ti),input:'Uf',type:'floorType'};
}
function render(){
  const list=$('matLayers');list.replaceChildren();
  layers.forEach((l,i)=>{
    const li=document.createElement('li');
    const t=document.createElement('span');t.textContent=(i+1)+'. '+l.name+' · '+fmt(l.mm,1)+' mm · λ '+fmt(l.lambda,3);
    const r=document.createElement('b');r.textContent='R '+fmt(R(l),3);
    const b=document.createElement('button');b.type='button';b.textContent='✕';b.setAttribute('aria-label','Quitar capa '+(i+1));b.addEventListener('click',()=>{layers.splice(i,1);render()});
    li.append(t,r,b);list.append(li);
  });
  if(!layers.length){const p=document.createElement('li');p.className='mat-empty';p.textContent='Aún no hay capas. Agrega un material con su espesor.';list.append(p)}
  const t=totals(),s=surfaceInfo(),q=t.u*s.area*s.dT;
  $('matRtotal').textContent=layers.length?fmt(t.rt,3)+' m²·K/W':'—';
  $('matU').textContent=layers.length?fmt(t.u,3)+' W/m²·K':'—';
  $('matQ').textContent=layers.length?fmt(q/1000,2)+' kW ('+fmt(q*3.412142,0)+' BTU/h)':'—';
  $('matQnote').textContent=layers.length?s.label+': '+fmt(s.area,1)+' m² × ΔT '+fmt(s.dT,1)+' °C con tus medidas actuales. Referencia sin compensación estacional ni margen.':'';
  $('matUse').disabled=!layers.length;$('matUse').textContent='Usar U = '+(layers.length?fmt(t.u,3):'—')+' en '+s.label.toLowerCase();
  renderCompare();
}
/* same thickness, different insulants */
function renderCompare(){
  const mm=Math.max(1,num('matCmpThick',100)),films=pos('matRsi')+pos('matRse');
  const rows=CATALOG.filter(r=>r[2]==='Aislantes').map(([id,name,,lam])=>({name,u:1/((mm/1000)/lam+films)})).sort((a,b)=>a.u-b.u);
  const max=Math.max(...rows.map(r=>r.u));
  const box=$('matCompare');box.replaceChildren();
  rows.forEach(r=>{const row=document.createElement('div');row.className='chartrow';const n=document.createElement('span');n.textContent=r.name.replace(/ \(.*\)/,'');const tr=document.createElement('div');tr.className='track';const bar=document.createElement('div');bar.className='bar';bar.style.width=(r.u/max*100).toFixed(1)+'%';tr.append(bar);const v=document.createElement('span');v.className='chartval';v.textContent=fmt(r.u,3)+' W/m²·K';row.append(n,tr,v);box.append(row)});
}
function use(){
  if(!layers.length)return;const s=surfaceInfo(),t=totals();
  const input=$(s.input);input.value=t.u.toFixed(3);
  const type=$(s.type);if(type)type.value='custom';
  input.dispatchEvent(new Event('input',{bubbles:true}));
  if(typeof calculate==='function')calculate();
  $('matStatus').textContent='U de '+s.label.toLowerCase()+' actualizada a '+t.u.toFixed(3)+' W/m²·K. Compruébalo contra la ficha técnica real.';
}
if($('matSelect')){
  fillSelect();
  $('matSelect').addEventListener('change',onPick);
  $('matAdd').addEventListener('click',addLayer);
  $('matUse').addEventListener('click',use);
  $('matClear').addEventListener('click',()=>{layers=[];$('matStatus').textContent='';render()});
  ['matRsi','matRse','matSurface','matCmpThick','L','W','H','Ti','To','Tf'].forEach(id=>$(id)?.addEventListener('input',render));
  render();
}
window.btuMaterials={catalog:CATALOG.map(r=>({...BY[r[0]]})),layers:()=>layers.map(l=>({...l})),totals};
})();
