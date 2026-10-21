/* BTU Studio: annotate a visible area, save locally, submit via GitHub Issues.
   States: idle -> menu | annotate -> compose -> saved | list. The capture layer exists only in `annotate`. */
(()=>{'use strict';
const KEY='btu-studio-feedback-v1', REPO='https://github.com/devroadtosucces15-boop/BTU-Studio', ISSUE=REPO+'/issues/new', URL_LIMIT=7000;
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const set=(node,attrs)=>{Object.entries(attrs).forEach(([k,v])=>node.setAttribute(k,v));return node};
const load=()=>{try{const v=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(v)?v:[]}catch{return []}};
const save=v=>{try{localStorage.setItem(KEY,JSON.stringify(v));document.dispatchEvent(new CustomEvent('btu-feedback-change'));return true}catch{return false}};
const launch=set(el('button',null,'✎  Reportar / anotar'),{id:'btu-feedback-launch',type:'button','aria-label':'Anotar una sección o revisar reportes','aria-haspopup':'dialog'});
const mask=set(el('div'),{id:'btu-feedback-mask'});
const layer=set(el('div'),{id:'btu-feedback-layer','aria-hidden':'true'});
const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('aria-hidden','true');layer.append(svg);
const bar=set(el('div'),{id:'btu-feedback-bar',role:'toolbar','aria-label':'Herramientas de anotación'});
const panel=set(el('div'),{id:'btu-feedback-panel',role:'dialog','aria-modal':'true',tabindex:'-1'});
const add=(parent,tag,cls,txt,attrs={})=>{const n=el(tag,cls,txt);set(n,attrs);parent.append(n);return n};
const button=(parent,text,fn)=>{const b=add(parent,'button',null,text,{type:'button'});b.addEventListener('click',fn);return b};
const field=(parent,label,tag,attrs={})=>{const l=add(parent,'label',null,label);const f=add(parent,tag,null,undefined,attrs);l.htmlFor=f.id;return f};
const rectSvg=(x,y,w,h,mode)=>{const r=document.createElementNS('http://www.w3.org/2000/svg','rect');for(const [k,v] of Object.entries({x,y,width:w,height:h,rx:mode==='highlight'?2:7,fill:mode==='highlight'?'#f5d46b66':'#f5d46b16',stroke:'#f6d36c','stroke-width':mode==='highlight'?1:3}))r.setAttribute(k,v);return r};
let state='idle',mode='rectangle',start=null,mark=null,previousFocus=null,lastReport=null;
const modes=[['rectangle','▣ Marcar área'],['highlight','▰ Subrayar']];

/* Single place that decides what is visible and what can receive pointer input. */
function setState(next){
  state=next;
  const annotating=next==='annotate', open=next!=='idle';
  mask.style.display=open?'block':'none';mask.classList.toggle('active',open);
  layer.style.display=annotating?'block':'none';          // no hidden capture layer outside `annotate`
  layer.style.pointerEvents=annotating?'auto':'none';
  bar.style.display=(next==='menu'||annotating)?'flex':'none';
  if(next==='menu'||annotating||next==='idle')panel.remove();
  launch.style.display=open?'none':'';
  // keep the page behind a modal panel out of the tab order and the accessibility tree
  const modal=!annotating&&next!=='idle'&&next!=='menu';
  [...document.body.children].forEach(n=>{if(n===mask||n===launch||n.tagName==='SCRIPT')return;modal?n.setAttribute('inert',''):n.removeAttribute('inert')});
}
function draw(){svg.replaceChildren();if(!mark)return;svg.append(rectSvg(mark.x,mark.y,mark.w,mark.h,mode))}
function close(){start=null;mark=null;setState('idle');draw();const f=previousFocus;previousFocus=null;if(f&&document.contains(f))f.focus()}

function openMenu(){
  if(state==='idle')previousFocus=document.activeElement;
  setState('menu');bar.replaceChildren();
  const a=button(bar,'✎ Marcar un área',startAnnotating);button(bar,'▤ Mis reportes ('+load().length+')',openList);button(bar,'✕ Cerrar',close);
  a.focus();
}
function startAnnotating(){
  if(state==='idle')previousFocus=document.activeElement;
  mark=null;start=null;setState('annotate');draw();bar.replaceChildren();
  modes.forEach(([m,label])=>{const b=button(bar,label,()=>{mode=m;bar.querySelectorAll('[data-mode]').forEach(e=>e.setAttribute('aria-pressed',String(e.dataset.mode===m)));draw()});b.dataset.mode=m;b.setAttribute('aria-pressed',String(mode===m))});
  button(bar,'↶ Limpiar',()=>{mark=null;draw()});
  button(bar,'Continuar →',openCompose).classList.add('btu-primary');
  button(bar,'✕',close).setAttribute('aria-label','Cerrar anotación');
  bar.querySelector('button').focus();
}

const clamp=(v,max)=>Math.max(0,Math.min(max,v));
const point=e=>({x:clamp(e.clientX,innerWidth),y:clamp(e.clientY,innerHeight)});
function endDrag(e){
  if(!start)return;start=null;
  if(mark&&mark.w<8&&mark.h<8){mark.w=120;mark.h=mode==='highlight'?18:70;mark.x=Math.min(mark.x,innerWidth-mark.w);mark.y=Math.min(mark.y,innerHeight-mark.h)}
  draw();if(e&&e.cancelable)e.preventDefault();
}
layer.addEventListener('pointerdown',e=>{if(state!=='annotate'||(e.button!==0&&e.pointerType==='mouse'))return;start=point(e);mark={x:start.x,y:start.y,w:1,h:1};try{layer.setPointerCapture(e.pointerId)}catch{}draw();e.preventDefault()});
layer.addEventListener('pointermove',e=>{if(!start)return;const p=point(e);mark={x:Math.min(start.x,p.x),y:Math.min(start.y,p.y),w:Math.abs(p.x-start.x),h:Math.abs(p.y-start.y)};draw();e.preventDefault()});
layer.addEventListener('pointerup',endDrag);
layer.addEventListener('pointercancel',()=>{start=null;mark=null;draw()});   // iOS cancels touches for system gestures

/* Resolve the page element under the mark, ignoring our own UI. */
function describeTarget(){
  if(!mark)return 'Sin área marcada';
  const cx=mark.x+mark.w/2,cy=mark.y+mark.h/2;
  const target=document.elementsFromPoint(cx,cy).find(n=>!mask.contains(n)&&n!==launch&&n!==document.documentElement);
  if(!target)return 'Elemento no identificado';
  let t=target;
  while(t&&t!==document.body){if(t.id)return '#'+t.id;if(['SECTION','ARTICLE','MAIN'].includes(t.tagName))return t.tagName.toLowerCase()+(t.className?'.'+String(t.className).trim().split(/\s+/).slice(0,2).join('.'):'');t=t.parentElement}
  return target.tagName.toLowerCase();
}
function context(){return {url:location.href.split('#')[0],path:location.pathname,section:describeTarget(),scrollY:Math.round(scrollY),viewport:innerWidth+'x'+innerHeight,area:mark?{x:Math.round(mark.x),y:Math.round(mark.y),w:Math.round(mark.w),h:Math.round(mark.h),type:mode}:null,ua:navigator.userAgent.slice(0,180)}}

function issueLink(r){
  const a=r.context?.area;
  const build=desc=>['## Descripción',desc,'','## Ubicación','- Sección: '+(r.context?.section||'Sin identificar'),'- Página: '+(r.context?.url||''),'- Vista: '+(r.context?.viewport||''),'- Scroll Y: '+(r.context?.scrollY||0),'- Área (px): '+(a?JSON.stringify(a):'No marcada'),'- Categoría: '+r.category,'- Referencia local: '+r.id,'','> No se adjunta captura de pantalla automáticamente. Las coordenadas describen el área señalada.'].join('\n');
  const title=encodeURIComponent('[BTU Feedback] '+r.title.slice(0,100));
  let desc=r.description,body=encodeURIComponent(build(desc));
  // GitHub rejects very long query strings; trim the description rather than failing silently.
  while((ISSUE.length+title.length+body.length)>URL_LIMIT&&desc.length>200){desc=desc.slice(0,Math.floor(desc.length*.8));body=encodeURIComponent(build(desc+'… [recortado: texto completo en la referencia local '+r.id+']'))}
  return ISSUE+'?title='+title+'&body='+body;
}

/* Status vocabulary. Opening the GitHub form cannot prove an issue was created, so it is never reported as "sent". */
const STATUS={pending:'Pendiente de envío',opened:'Borrador abierto en GitHub (envío sin confirmar)',sent:'Enviado a GitHub (confirmado por ti)',resolved:'Resuelto localmente'};
/* Short label + tone for the status chip; the full honest status text stays visible next to it. */
function chipFor(s){if(s===STATUS.resolved)return['Resuelto','ok'];if(s===STATUS.sent)return['Enviado','ok'];if(s===STATUS.opened||s==='Enlace de envío abierto')return['Abierto','open'];return['Pendiente','pending']}
const isSent=r=>r.status===STATUS.sent;
function patch(id,fn){const items=load();const it=items.find(x=>x.id===id);if(!it)return false;fn(it);return save(items)}

function renderPanel(title){
  panel.replaceChildren();
  const h=add(panel,'h2',null,title,{id:'btu-feedback-title'});panel.setAttribute('aria-labelledby','btu-feedback-title');
  mask.append(panel);
  panel.focus({preventScroll:true});
}
const actions=()=>add(panel,'div','btu-actions');
const live=(parent,text)=>add(parent,'p','btu-muted',text,{role:'status','aria-live':'polite'});

function openCompose(){
  const selectedContext=context();      // before the panel covers the marked area
  setState('compose');bar.replaceChildren();
  renderPanel('Enviar retroalimentación');
  add(panel,'p',null,selectedContext.area?'Tu selección queda registrada con su sección y coordenadas. Puedes guardarla aquí o enviarla al registro oficial de GitHub.':'No marcaste ningún área: el reporte se guardará sin coordenadas.');
  const title=field(panel,'Título del reporte','input',{id:'btu-f-title',placeholder:'Ej. La temperatura no se actualiza',maxlength:'130'});
  const category=field(panel,'Tipo','select',{id:'btu-f-type'});
  [['Error','Error / fallo'],['Diseño','Diseño y alineación'],['Cálculo','Cálculo térmico'],['Mejora','Sugerencia']].forEach(([value,label])=>{const o=el('option',null,label);o.value=value;category.append(o)});
  const description=field(panel,'Descripción detallada','textarea',{id:'btu-f-desc',placeholder:'¿Qué ocurre y qué esperabas que pasara?',maxlength:'5000',required:'true'});
  const status=live(panel,'La información se guarda primero en este navegador. Para enviarla al equipo se necesita iniciar sesión en GitHub.');
  const a=actions();
  button(a,'← Volver a marcar',startAnnotating);
  button(a,'Guardar reporte',()=>{
    if(!description.value.trim()){status.textContent='Escribe una descripción antes de guardar.';description.setAttribute('aria-invalid','true');description.focus();return}
    const data={id:'BTU-'+Date.now().toString(36).toUpperCase(),title:title.value.trim()||'Comentario sobre BTU Studio',category:category.value,description:description.value.trim(),context:selectedContext,created:new Date().toISOString(),status:STATUS.pending};
    const items=load();items.unshift(data);
    if(!save(items)){status.textContent='No fue posible guardar en este dispositivo. Copia el texto antes de salir.';return}
    lastReport=data;openSaved(data);
  }).classList.add('btu-primary');
  button(a,'Cancelar',close);
  title.focus();
}
function openSaved(r){
  setState('saved');renderPanel('Reporte guardado');
  add(panel,'p',null,r.id+' · '+r.title);
  const st=add(panel,'p',null,'Estado: '+r.status);
  add(panel,'p','btu-muted','Guardado solo en este navegador. Pulsa “Abrir en GitHub” para preparar el reporte; GitHub pedirá iniciar sesión y confirmar. Esta página no puede saber si lo enviaste.');
  const a=actions();
  const link=add(a,'a','btu-primary','↗ Abrir en GitHub',{href:issueLink(r),target:'_blank',rel:'noopener noreferrer'});
  link.addEventListener('click',()=>{if(patch(r.id,it=>{if(!isSent(it)&&it.status!==STATUS.resolved)it.status=STATUS.opened}))st.textContent='Estado: '+STATUS.opened});
  button(a,'Ver mis reportes',openList);button(a,'Cerrar',close);
  link.focus();
}
function download(r){const blob=new Blob([JSON.stringify(r,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=r.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function openList(){
  setState('list');renderPanel('Mis reportes en este dispositivo');
  add(panel,'p',null,'Aquí aparecen los reportes guardados en este navegador. Los reportes enviados al equipo se administran en GitHub Issues.');
  const items=load();
  if(!items.length)add(panel,'p',null,'Todavía no hay reportes guardados.');
  items.forEach(r=>{
    const c=add(panel,'div','btu-report');
    add(c,'strong',null,r.title);
    add(c,'p',null,r.id+' · '+r.category+' · '+new Date(r.created).toLocaleDateString('es-MX'));
    add(c,'p',null,r.description.slice(0,240));
    const chip=chipFor(r.status);add(c,'span','btu-chip btu-chip-'+chip[1],chip[0]);
    add(c,'p','btu-muted','Estado: '+r.status);
    const open=add(c,'a',null,'Abrir en GitHub ↗',{href:issueLink(r),target:'_blank',rel:'noopener noreferrer'});
    open.addEventListener('click',()=>{patch(r.id,it=>{if(!isSent(it)&&it.status!==STATUS.resolved)it.status=STATUS.opened})});
    button(c,'Exportar JSON',()=>download(r));
    if(!isSent(r))button(c,'Confirmar que lo envié',()=>{patch(r.id,it=>{it.status=STATUS.sent});openList()});
    button(c,'Marcar resuelto aquí',()=>{patch(r.id,it=>{it.status=STATUS.resolved});openList()});
  });
  const a=actions();
  add(a,'a',null,'↗ Ver reportes oficiales',{href:REPO+'/issues',target:'_blank',rel:'noopener noreferrer'});
  button(a,'Nueva anotación',startAnnotating);button(a,'Cerrar',close);
}

launch.addEventListener('click',openMenu);
document.addEventListener('keydown',e=>{
  if(state==='idle')return;
  if(e.key==='Escape'){e.preventDefault();close();return}
  if(e.key!=='Tab')return;
  // focus trap: Tab cycles inside the open dialog (or the toolbar while annotating/menu)
  const scope=panel.isConnected?panel:bar;
  const f=[...scope.querySelectorAll('a[href],button:not([disabled]),input,select,textarea')].filter(n=>n.offsetParent!==null);
  if(!f.length)return;
  const first=f[0],last=f[f.length-1],cur=document.activeElement;
  if(!scope.contains(cur)){e.preventDefault();first.focus()}
  else if(e.shiftKey&&cur===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&cur===last){e.preventDefault();first.focus()}
});
addEventListener('resize',()=>{if(state==='annotate'){mark=null;draw()}});   // stored px coordinates no longer match the layout
mask.append(layer,bar);
document.body.append(launch,mask);
setState('idle');
window.btuFeedback={open:openMenu};
})();
