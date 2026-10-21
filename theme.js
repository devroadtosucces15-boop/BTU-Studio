/* BTU Studio — app shell: step navigation, header actions, live summary, isometric chamber.
   Presentation only: reads inputs, never writes values or storage, never alters formulas. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const STEPS=['Proyecto','Cámara','Superficies','Cargas','Resultados'];
const reduced=()=>document.body.classList.contains('studio-reduced')||matchMedia('(prefers-reduced-motion:reduce)').matches;
let step=1;

/* ── Steps ───────────────────────────────── */
const nav=$('appSteps'),pager=$('stepPager');
STEPS.forEach((name,i)=>{
  const b=document.createElement('button');b.type='button';b.dataset.step=i+1;
  const n=document.createElement('i');n.textContent=i+1;b.append(n,name);
  b.addEventListener('click',()=>go(i+1));nav.append(b);
});
function go(n,{focus=true}={}){
  step=Math.max(1,Math.min(STEPS.length,n));
  document.querySelectorAll('main [data-step]').forEach(e=>e.classList.toggle('step-off',Number(e.dataset.step)!==step));
  nav.querySelectorAll('button').forEach(b=>{const i=Number(b.dataset.step);b.toggleAttribute('aria-current',i===step);if(i===step)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');b.classList.toggle('done',i<step)});
  pager.replaceChildren();
  if(step>1){const p=document.createElement('button');p.type='button';p.textContent='← '+STEPS[step-2];p.addEventListener('click',()=>go(step-1));pager.append(p)}
  if(step<STEPS.length){const x=document.createElement('button');x.type='button';x.className='primary';x.textContent=STEPS[step]+' →';x.addEventListener('click',()=>go(step+1));pager.append(x)}
  // existing function: recompute so Resultados never shows stale numbers (inputs such as producto only update on demand)
  if(step===STEPS.length&&typeof calculate==='function')calculate();
  if(focus)scrollTo({top:0,behavior:reduced()?'auto':'smooth'});
  drawChamber();
}

/* ── Header actions ──────────────────────── */
const drawer=$('appDrawer'),menu=$('appMenu');
function toggleDrawer(open){drawer.hidden=!open;menu.setAttribute('aria-expanded',String(open))}
menu.addEventListener('click',()=>toggleDrawer(drawer.hidden));
$('appProjects').addEventListener('click',()=>{toggleDrawer(true);$('studioProjectList').focus()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!drawer.hidden&&!document.querySelector('#btu-feedback-mask.active')){toggleDrawer(false);menu.focus()}});
$('appReports').addEventListener('click',()=>window.btuFeedback?.open());
function badge(){let n=0;try{const v=JSON.parse(localStorage.getItem('btu-studio-feedback-v1')||'[]');n=Array.isArray(v)?v.length:0}catch{}const b=$('appReportsBadge');b.textContent=n>99?'99+':String(n);b.hidden=!n}
document.addEventListener('btu-feedback-change',badge);addEventListener('storage',badge);badge();

/* ── Live summary of the last calculation ── */
const summary=$('appSummary'),out=$('out');
function updateSummary(){
  const r=[...out.querySelectorAll('.metrics .result')].slice(0,3).map(e=>e.textContent.trim());
  if(r.length<3){summary.hidden=true;return}
  summary.replaceChildren();
  const lead=document.createElement('em');lead.textContent='Último cálculo';summary.append(lead);
  r.forEach(t=>{const b=document.createElement('b');b.textContent=t;summary.append(b)});
  summary.hidden=false;
}
new MutationObserver(updateSummary).observe(out,{childList:true,subtree:true});updateSummary();

/* ── Isometric chamber (scaled to L, W, H) ── */
const NS='http://www.w3.org/2000/svg',COS=Math.cos(Math.PI/6),SIN=.5;
const mk=(tag,attrs)=>{const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);return e};
const val=id=>Math.max(0,Number($(id)?.value)||0);
function drawChamber(){
  const g=$('isoShapes');if(!g)return;
  let L=val('L'),W=val('W'),H=val('H');
  if(!(L>0&&W>0&&H>0)){g.replaceChildren();return}
  const m=Math.max(L,W,H);L/=m;W/=m;H/=m;                 // normalised proportions
  const raw=(x,y,z)=>[(x-y)*COS,(x+y)*SIN-z];
  const pts=[[0,0,0],[L,0,0],[L,W,0],[0,W,0],[0,0,H],[L,0,H],[L,W,H],[0,W,H]].map(p=>raw(...p));
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const box={x:48,y:22,w:324,h:180},k=Math.min(box.w/(maxX-minX),box.h/(maxY-minY));
  const ox=box.x+(box.w-(maxX-minX)*k)/2-minX*k,oy=box.y+(box.h-(maxY-minY)*k)/2-minY*k;
  const P=(x,y,z)=>{const[a,b]=raw(x,y,z);return[ox+a*k,oy+b*k]};
  const poly=(cls,arr)=>mk('polygon',{class:cls,points:arr.map(p=>p.map(v=>v.toFixed(1)).join(',')).join(' '),'stroke-width':1.5,'stroke-linejoin':'round'});
  const shapes=[
    poly('iso-top',[P(0,0,H),P(L,0,H),P(L,W,H),P(0,W,H)]),
    poly('iso-left',[P(0,W,H),P(L,W,H),P(L,W,0),P(0,W,0)]),
    poly('iso-right',[P(L,0,H),P(L,W,H),P(L,W,0),P(L,0,0)])
  ];
  // door on the right-hand face
  const d0=.2*W,d1=.45*W,dh=Math.min(.7*H,.8);
  shapes.push(poly('iso-door',[P(L,d0,0),P(L,d1,0),P(L,d1,dh),P(L,d0,dh)]));
  // dimension lines (offset outside the box)
  const off=.12,dim=(a,b)=>mk('path',{class:'iso-dim',d:`M${a[0].toFixed(1)} ${a[1].toFixed(1)}L${b[0].toFixed(1)} ${b[1].toFixed(1)}`});
  const aL=P(0,W+off,0),bL=P(L,W+off,0),aW=P(L+off,W,0),bW=P(L+off,0,0),aH=P(0-off,W+off,0),bH=P(0-off,W+off,H);
  shapes.push(dim(aL,bL),dim(aW,bW),dim(aH,bH));
  g.replaceChildren(...shapes);
  const place=(id,p,dx,dy,anchor)=>{const t=$(id);if(!t)return;t.setAttribute('x',(p[0]+dx).toFixed(1));t.setAttribute('y',(p[1]+dy).toFixed(1));t.setAttribute('text-anchor',anchor)};
  place('studioDimL',[(aL[0]+bL[0])/2,(aL[1]+bL[1])/2],-6,22,'middle');
  place('studioDimW',[(aW[0]+bW[0])/2,(aW[1]+bW[1])/2],8,22,'start');
  place('studioDimH',[(aH[0]+bH[0])/2,(aH[1]+bH[1])/2],-8,4,'end');
  const f=$('isoFloor');if(f){const c=P(L/2,W/2,0);f.setAttribute('cx',c[0].toFixed(1));f.setAttribute('cy',(c[1]+6).toFixed(1));f.setAttribute('rx',((maxX-minX)*k*.55).toFixed(1));f.setAttribute('ry',((maxX-minX)*k*.12).toFixed(1))}
}
['L','W','H'].forEach(id=>$(id)?.addEventListener('input',drawChamber));
new MutationObserver(drawChamber).observe($('studioVolume'),{childList:true});    // fires when project values are loaded programmatically

/* ── Temperature marker follows the bar ──── */
const bar=$('studioTempBar'),dot=$('studioTempDot');
const moveDot=()=>{if(bar&&dot)dot.setAttribute('cx',String(Number(bar.getAttribute('x'))+Number(bar.getAttribute('width'))))};
if(bar)new MutationObserver(moveDot).observe(bar,{attributes:true,attributeFilter:['width']});moveDot();

go(1,{focus:false});
})();
