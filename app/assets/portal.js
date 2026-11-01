(function(){
const NONSUP=/^(owner attending|tenant attending|strata attending|owners contractor attending|insurance claim in progress|platinum property co|water corporation|other|tbc|tba|agent|n\/?a|none|unknown|various|misc)$|\b(owners?|tenants?|strata|agent|landlord)('?s)?\b.*\b(attending|arranged|arranging)\b|insurance claim/i;
(function scrub(o){if(Array.isArray(o)){for(let i=o.length-1;i>=0;i--){const v=o[i];if(v&&typeof v==='object'&&typeof v.name==='string'&&NONSUP.test(v.name.trim()))o.splice(i,1);else scrub(v)}}else if(o&&typeof o==='object')for(const k in o)scrub(o[k])})([window.PORTAL.suppliers_dir,window.PORTAL.find_trade,window.PORTAL.matt]);
if(window.CONTACTS)CONTACTS.suppliers=CONTACTS.suppliers.filter(x=>!NONSUP.test(x.name.trim()));
const P=window.PORTAL, C=P.config, page=document.body.dataset.page;
// Old Tapi refs (stored in older log rows) -> Maintenance Mate job numbers, for display and matching only.
const MMR={};(P.jobs||[]).concat(P.vacate||[]).forEach(j=>{if(j.source_ref)MMR[j.source_ref]=j.wo});((window.PROPS&&window.PROPS.properties)||[]).forEach(p=>(p.jobs||[]).forEach(j=>{if(j.source_ref)MMR[j.source_ref]=j.wo}));
const MMREF=s=>s&&MMR[s]||s;
const $=(s,r=document)=>r.querySelector(s), esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n=x=>Number(x||0).toLocaleString('en-AU'), Q=new URLSearchParams(location.search);
const ICON={critical:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z"/><path d="M12 8v4M12 16h.01"/></svg>',
 risk:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m10.3 3.9-8.2 14a2 2 0 0 0 1.7 3h16.4a2 2 0 0 0 1.7-3l-8.2-14a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
 watch:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
 safe:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
 arrow:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>'};
const LBL={safe:'Safe',watch:'Watch',risk:'At risk',critical:'Critical'};
const st=s=>`<span class="st ${s}">${ICON[s]}${LBL[s]}</span>`;
const fmtD=d=>d?new Date(d+'T00:00:00').toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long'}):'[date]';
const fmtS=d=>d?new Date(d+'T00:00:00').toLocaleDateString('en-AU',{day:'numeric',month:'long'}):'[date]';
const sevOf=j=>j.triage==='P1'?'critical':j.overdue?'risk':'watch';
const DRAFT='<span class="note">Drafted by Matt @ Maintenance Mate · needs your check · nothing sends automatically</span>';

/* ---- shell: sidebar, top bar, drawer, tabbar ---- */
const NAV=[['director.html','Overview','M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z'],['backlog.html','Backlog','M4 6h16M4 12h16M4 18h10'],['properties.html','Properties','M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z'],['directory.html','Contractors','M16 11a4 4 0 1 0-8 0M4 21c1-4 4-6 8-6s7 2 8 6'],['comms.html','Comms','M4 5h16v11H8l-4 4z']];
let ME={},PMS=false;const VA_K='pp_viewas';let VA=Q.get('pm')||(page==='pm'?localStorage.getItem(VA_K):'')||'';if(page==='pm'&&Q.get('pm'))localStorage.setItem(VA_K,Q.get('pm'));
const me=page==='pm'&&VA?VA:'Admin';
const ini=me.split(' ').map(w=>w[0]).join('').slice(0,2);
const OFFS=P.offices.map(o=>o.office), CUR=Q.get('office')||'';
const isOn=h=>location.pathname.endsWith(h)||(h==='director.html'&&page==='director');
const nico=d=>`<svg class="ni" viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;
const lastB=(P.snapshots[P.snapshots.length-1]||{}).built_at;
const UPD=`Tapi last synced ${fmtS(P.as_of)} 2026${lastB?` · built ${new Date(lastB).toLocaleString('en-AU',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})} AWST`:''}`;
const PAGE_T=page==='pm'?'PM workspace':(NAV.find(x=>isOn(x[0]))||[0,'Portal'])[1];
const sideNav=()=>NAV.map(([h,l,d])=>`<a href="${h}${CUR&&h!=='comms.html'?'?office='+encodeURIComponent(CUR):''}" class="${isOn(h)?'on':''}"${isOn(h)?' aria-current="page"':''}>${nico(d)}<span>${l}</span></a>`).join('');
document.body.classList.add('sys');
document.body.insertAdjacentHTML('afterbegin',`<aside class="side" aria-label="Main"><a class="mark" href="director.html"><i></i>Maintenance Mate</a><nav>${sideNav()}</nav><div class="vas" hidden></div><div class="sfoot"><div class="cap">Data</div><div>${esc(UPD)}</div>${P.public_build?'<div>Public build · addresses withheld</div>':''}</div></aside>
<header class="top"><button class="burger" aria-label="Open menu" aria-expanded="false"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><a class="mark tm" href="director.html"><i></i>Maintenance Mate</a><div class="crumb"><span>Maintenance Mate</span><b>${esc(PAGE_T)}</b></div>
<label class="osw"><span class="vh">Office</span><select id="osw" aria-label="Office">${['',...OFFS].map(o=>`<option value="${esc(o)}" ${o===CUR?'selected':''}>${o?esc(o):'All offices'}</option>`).join('')}</select></label>
<span class="upd"><i class="dot"></i><span>${esc(UPD)}</span></span><div class="me"><span>${esc(me)}</span><div class="av">${esc(ini)}</div></div></header>
<div class="mdrawer" role="dialog" aria-label="Menu"><div class="scrim"></div><div class="panel"><button class="dr-x" aria-label="Close menu">✕</button><div class="cap" style="color:var(--champagne);margin-bottom:12px">Maintenance Mate</div>${sideNav()}<div class="vas" hidden></div><div class="cfgnote" style="margin-top:auto;color:var(--platinum-300,#bbb)">${esc(UPD)}${P.public_build?' · public build, street addresses withheld':''}</div></div></div>
<div class="modal" role="dialog" aria-modal="true"><div class="box"></div></div>`);
document.body.insertAdjacentHTML('beforeend',`<nav class="tabbar">${NAV.map(([h,l,d])=>`<a href="${h}${CUR&&h!=='comms.html'?'?office='+encodeURIComponent(CUR):''}" class="${isOn(h)?'on':''}">${nico(d)}<span>${l}</span></a>`).join('')}</nav>`);
$('#osw').onchange=e=>{const u=new URL(location.href);e.target.value?u.searchParams.set('office',e.target.value):u.searchParams.delete('office');location.href=u.pathname+u.search};
const dr=$('.mdrawer'),bg=$('.burger');
const setD=o=>{dr.classList.toggle('open',o);bg.setAttribute('aria-expanded',o)};
bg.onclick=()=>setD(true);$('.scrim').onclick=()=>setD(false);$('.dr-x').onclick=()=>setD(false);addEventListener('keydown',e=>{if(e.key==='Escape'){setD(false);closeM()}});
const M=$('.modal');let lastFocus=null;
function sheet(title,body,foot){return `<div class="sh-head"><button class="sh-x" data-close aria-label="Close draft">‹ Back</button><span class="cap">${esc(title)}</span></div><div class="sh-body">${body}</div><div class="sh-foot">${foot}</div>`}
function openM(h){lastFocus=document.activeElement;$('.box',M).innerHTML=h;M.querySelectorAll('.letter').forEach(kit);M.classList.add('open');document.body.style.overflow='hidden';$('.sh-body',M)&&($('.sh-body',M).scrollTop=0);$('[data-close]',M)?.focus();M.querySelectorAll('[data-close]').forEach(c=>c.addEventListener('click',closeM));$('[data-edit]',M)?.addEventListener('click',e=>{const l=$('.letter',M),on=l.isContentEditable;l.contentEditable=!on;e.target.textContent=on?'Edit':'Done editing';if(!on)l.focus()});$('[data-approve]',M)?.addEventListener('click',e=>{e.target.outerHTML='<span class="note">Marked approved. Sending is not connected in this build.</span>'})}
function closeM(){M.classList.remove('open');document.body.style.overflow='';lastFocus?.focus?.()}M.addEventListener('click',e=>{if(e.target===M)closeM()});

/* ---- letters (dates from each job's next_due) ---- */
const F=s=>`<span class="field">${esc(s)}</span>`;
function letter(kind,j){
  const from=`${esc(j.pm||'{{property_manager}}')}, Example Property Co ${esc(j.office||'')}`;
  const sig=`<p>Kind regards,</p><div class="sig">${esc(j.pm||'{{property_manager}}')}</div><div class="muted" style="font-size:14px">Property Manager · Example Property Co, ${esc(j.office||'')}</div>`;
  const meta=(to,sub)=>`<div class="meta"><span>To</span><span>${to}</span><span>From</span><span>${from}</span><span>Subject</span><span style="color:var(--ink)">${esc(sub)}</span></div>`;
  if(kind==='supplier')return meta(esc(j.supplier||'{{supplier}}'),`Follow-up: ${j.wo}, ${j.title} at ${j.address||''}`)+
   `<p style="margin-top:28px">Hi ${F(j.supplier||'{{supplier}}')},</p><p>We're following up on ${F(j.wo)}, ${F(j.title)} at ${F(j.address||'{{address}}')}. It was lodged ${F(Math.round(j.days_open)+' days')} ago${j.last_action?` and the last update in our system was ${F(fmtS(j.last_action))}`:''}.</p><p>Could you reply with a booked attendance date by ${F(fmtD(j.next_due))}? If you can't take this one, let us know and we'll reassign it.</p>`+sig;
  if(kind==='tenant')return meta(`{{tenant_name}} · {{tenant_email}} · Tenant at ${F(j.address||'{{address}}')}`,`An update on your ${j.title.toLowerCase()} request`)+
   `<p style="margin-top:28px">Hi ${F('{{tenant_name}}')},</p><p>We're sorry the ${F(j.title)} request (${F(j.wo)}) is taking longer than it should. You've been waiting ${F(Math.round(j.days_open)+' days')}.</p><p>Where it's up to: ${F(j.stage)}. We'll confirm the next step with you by ${F(fmtD(j.next_due))}, and you'll hear from us at least every seven days until it's resolved.</p><p>If anything changes or gets worse, reply to this email or call the ${esc(j.office||'')} office.</p>`+sig;
  return meta(`{{owner_name}} · {{owner_email}} · Owner of ${F(j.address||'{{address}}')}`,`Approval needed: ${j.title}`)+
   `<p style="margin-top:28px">Hi ${F('{{owner_name}}')},</p><p>We need your approval to proceed with ${F(j.title)} (${F(j.wo)}) at ${F(j.address||'{{address}}')}. The request was lodged ${F(Math.round(j.days_open)+' days')} ago.</p><p>Could you reply with your approval or questions by ${F(fmtD(j.next_due))}? Quote: ${F('[quote amount]')}.</p>`+sig;
}
const kindOf=j=>j.next_party==='owner'?'owner':'supplier';
function draft(j,kind){openM(sheet(j.next_action||'Draft',`<article class="letter"${(K=>ctxA('job',j.id,j.wo,K==='supplier'?j.supplier:K==='tenant'?'Tenant':'Owner',K+(K==='supplier'?'_chaser':'_update')))(kind||kindOf(j))}>${letter(kind||kindOf(j),j)}</article>`,`<a class="btn btn-primary" data-approve>Approve draft</a><a class="btn btn-ghost" data-edit>Edit</a><span class="sh-note">${DRAFT}</span>`))}
window.__draft=draft;
const JB={};P.jobs.forEach(j=>JB[j.id]=j);
/* ---- archive (portal-side, shared via /api/archive; Tapi untouched) ---- */
const TAPI=P.jobs.slice(), ALL=TAPI.slice(), BASE=JSON.parse(JSON.stringify({o:P.offices,b:P.benchmarks,u:P.urgent}));
const AR=new Map(), VO=new Map(); let AR_OK=false, VAC_OK=false; P.vacate=[];
const isVac=j=>VO.has(j.id)?VO.get(j.id).state==='vacate':!!j.vacate_auto;
const REAS={no_longer_required:'No longer required',duplicate:'Duplicate',completed_elsewhere:'Completed elsewhere',tenant_resolved:'Tenant resolved',other:'Other'};
const EL=[];let EL_OK=false;
const awst=t=>new Date(t).toLocaleString('en-AU',{timeZone:'Australia/Perth',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})+' AWST';
const elWho=e=>e.acting_as?`${e.acting_as} (View as)`:(e.actor==='pin'?'PIN session':e.actor);
const ctxA=(k,id,wo,rc,tp)=>` data-rk="${k}" data-ri="${esc(id)}" data-wo="${esc(wo||'')}" data-rc="${esc(rc||'')}" data-tp="${tp}"`;
const TPL={work_order:'Work order',supplier_chaser:'Supplier chaser',tenant_update:'Tenant update',owner_update:'Owner update',batch_work_order:'Batch work order',quote_request:'Quote request',owner_approval:'Owner approval'};
function elFor(k,id,rc){const by={};EL.filter(e=>e.ref_kind===k&&e.ref_id===id&&(!rc||e.recipient===rc)).forEach(e=>{const key=(e.recipient||'')+'|'+e.template;(by[key]=by[key]||[]).push(e)});
 return Object.values(by).map(L=>{L.sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id-a.id);return L.find(e=>e.event==='sent')||L[0]}).sort((a,b)=>b.created_at.localeCompare(a.created_at))}
const elLine=e=>e.event==='sent'?`<span class="elk ok">✓</span> Email sent to ${esc(e.recipient||'recipient')} by ${esc(elWho(e))}, ${awst(e.created_at)} · ${esc(TPL[e.template]||e.template)}`:`<span class="elk">•</span> Prepared, not confirmed sent · ${esc(TPL[e.template]||e.template)} to ${esc(e.recipient||'recipient')} by ${esc(elWho(e))}, ${awst(e.created_at)}`;
function histIn(k,id,rc){const L=elFor(k,id,rc);return L.length?`<ul class="elh-l">${L.slice(0,6).map(e=>`<li>${elLine(e)}</li>`).join('')}</ul>`:''}
const elHist=(k,id,rc)=>`<div class="elh" data-hk="${k}|${esc(id)}|${esc(rc||'')}">${histIn(k,id,rc)}</div>`;
function sentTo(b,name){const w=new Set(b.wos);return EL.some(e=>e.event==='sent'&&e.recipient===name&&((e.ref_kind==='batch'&&e.ref_id===b.id)||(e.ref_kind==='job'&&w.has(e.wo))))}
const mark=(b,name)=>`<span class="smk" data-sm="${esc(b.id)}|${esc(name)}">${sentTo(b,name)?'✓ Emailed':''}</span>`;
function elRefresh(){document.querySelectorAll('[data-hk]').forEach(d=>{const [k,id,rc]=d.dataset.hk.split('|');d.innerHTML=histIn(k,id,rc)});
 document.querySelectorAll('[data-sm]').forEach(d=>{const [id,nm]=d.dataset.sm.split('|');const b=MT.batches.find(x=>x.id===id);d.textContent=b&&sentTo(b,nm)?'✓ Emailed':''})}
async function elPost(o){const r=await fetch('/api/email-log',{method:'POST',credentials:'same-origin',keepalive:true,headers:{'content-type':'application/json'},body:JSON.stringify(o)});if(!r.ok)throw 0;const d=await r.json();EL.unshift(d.event);elRefresh();return d.event}
function elCtx(art){const d=art.dataset;return d.rk?{ref_kind:d.rk,ref_id:d.ri,wo:d.wo||null,recipient:d.rc||null,template:d.tp,acting_as:!PMS&&page==='pm'&&VA?VA:null}:null}
async function loadArchive(){const g=u=>fetch(u,{credentials:'same-origin',cache:'no-store'}).then(r=>{if(!r.ok)throw 0;return r.json()});
 await Promise.all([g('/api/email-log').then(d=>{EL.length=0;EL.push(...d.events.map(e=>({...e,wo:MMREF(e.wo)})));EL_OK=true}).catch(()=>{EL_OK=false}),g('/api/archive').then(d=>{AR.clear();d.archived.forEach(a=>AR.set(a.job_id,a));AR_OK=true}).catch(()=>{AR_OK=false}),
  g('/api/vacate').then(d=>{VO.clear();d.overrides.forEach(a=>VO.set(a.job_id,a));VAC_OK=true}).catch(()=>{VAC_OK=false}),g('/api/jobs').then(loadFlow).catch(()=>{FL_OK=false})]);applyArchive()}
async function vacPost(ids,state){const r=await fetch('/api/vacate',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({ids,state,wos:Object.fromEntries(ids.map(i=>[i,JB[i]?.wo]))})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||('Error '+r.status));return d}
async function moveVac(ids,state,after){const back=state==='vacate'?'active':'vacate';
 try{await vacPost(ids,state);await loadArchive();after&&after();toast(`${ids.length===1?esc(JB[ids[0]].wo):ids.length+' jobs'} ${state==='vacate'?'moved to outgoing report':'returned to active'}`,async()=>{try{await vacPost(ids,back);await loadArchive();after&&after();toast('Undone')}catch(e){toast('Undo failed: '+esc(e.message))}})}
 catch(e){toast('Not moved: '+esc(e.message))}}
function applyArchive(){
 const off=j=>AR.has(j.id)||isVac(j)||isClosed(j);
 P.jobs=ALL.filter(j=>!off(j));P.vacate=ALL.filter(j=>!AR.has(j.id)&&isVac(j)&&!isClosed(j));P.closed=ALL.filter(j=>!AR.has(j.id)&&isClosed(j));
 const gone=TAPI.filter(off),add=NATIVE.filter(j=>!off(j));
 const by=(L,o)=>L.filter(j=>!o||j.office===o),cut=(L,f)=>L.filter(f).length,dN=(o,f=()=>true)=>cut(by(add,o),f)-cut(by(gone,o),f);
 P.offices=BASE.o.map(o=>({...o,open:o.open+dN(o.office),overdue:o.overdue+dN(o.office,j=>j.overdue)}));
 const fixB=(b,o)=>{const x={...b,open:b.open+dN(o),overdue:b.overdue+dN(o,j=>j.overdue)};x.outstanding_gap=x.open-x.outstanding_cap;x.overdue_gap=x.overdue-x.overdue_cap;x.overdue_pct=x.open?Math.round(1000*x.overdue/x.open)/10:0;return x};
 const offs=Object.keys(BASE.b.offices);
 P.benchmarks={...BASE.b,portfolio:fixB(BASE.b.portfolio,''),offices:Object.fromEntries(offs.map(o=>[o,fixB(BASE.b.offices[o],o)]))};
 P.benchmarks.portfolio.avg_open_per_office=Math.round(10*P.benchmarks.portfolio.open/offs.length)/10;
 const fixU=(u,o)=>{const x={...u,open_now:u.open_now+dN(o,j=>j.triage==='P1')};x.change_vs_7d=x.open_now-x.open_7d_ago_est;x.change_vs_30d=x.open_now-x.open_30d_ago_est;return x};
 P.urgent={...BASE.u,portfolio:fixU(BASE.u.portfolio,''),offices:Object.fromEntries(Object.keys(BASE.u.offices).map(o=>[o,fixU(BASE.u.offices[o],o)]))};
}
async function arPost(body){const r=await fetch('/api/archive',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||('Error '+r.status));return d}
function toast(html,undo){let t=$('.toast');if(!t){t=document.createElement('div');t.className='toast';t.setAttribute('role','status');document.body.appendChild(t)}t.innerHTML=html+(undo?' <button class="btn btn-text btn-sm" data-undo>Undo</button>':'');t.classList.add('on');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('on'),undo?10000:4000);if(undo)$('[data-undo]',t).onclick=async()=>{t.classList.remove('on');await undo()}}
const who=u=>u==='pin'?'PIN sign-in':u;
const when=t=>new Date(t).toLocaleString('en-AU',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})+' AWST';
function archiveSheet(js,after){
 const one=js.length===1,j=js[0];
 openM(sheet(one?`Archive · ${j.wo}`:`Archive ${js.length} jobs`,`<p class="muted" style="margin:0 0 6px">${one?`${esc(j.title)} · ${esc(j.address||'')}`:js.slice(0,6).map(x=>esc(x.wo)).join(', ')+(js.length>6?` and ${js.length-6} more`:'')}</p>
 <p style="margin:0 0 16px;font-size:14px">Archived jobs leave the backlog and every count. They can be restored from the Archived view. This is recorded in the portal only; Tapi is not changed.</p>
 <fieldset class="arf"><legend class="cap">Reason (required)</legend>${Object.entries(REAS).map(([k,l])=>`<label class="chk"><input type="radio" name="arr" value="${k}"> ${l}</label>`).join('')}
 <textarea class="input" id="arnote" rows="2" maxlength="500" placeholder="Reason for Other (required), or an optional note" style="margin-top:8px;width:100%"></textarea></fieldset><p class="e" id="arerr" role="alert" style="color:var(--critical,#9E2626);font-size:14px"></p>`,
 `<button class="btn btn-primary" data-arok disabled>Confirm archive${one?'':` · ${js.length}`}</button><a class="btn btn-text" data-close>Cancel</a>`));
 const ok=$('[data-arok]',M),val=()=>{const r=$('input[name=arr]:checked',M)?.value,nt=$('#arnote',M).value.trim();ok.disabled=!r||(r==='other'&&!nt);return {r,nt}};
 M.querySelectorAll('input[name=arr]').forEach(i=>i.onchange=val);$('#arnote',M).oninput=val;
 ok.onclick=async()=>{const {r,nt}=val();if(ok.disabled)return;ok.disabled=true;ok.textContent='Archiving…';const ids=js.map(x=>x.id);
  try{await arPost({action:'archive',ids,reason:r,note:nt,wos:Object.fromEntries(js.map(x=>[x.id,x.wo]))});closeM();await loadArchive();after&&after();
   toast(`${one?esc(j.wo)+' archived':js.length+' jobs archived'} · ${esc(REAS[r])}`,async()=>{try{await arPost({action:'restore',ids});await loadArchive();after&&after();toast('Restored to the backlog')}catch(e){toast('Undo failed: '+esc(e.message))}})}
  catch(e){$('#arerr',M).textContent='Not archived: '+e.message;ok.disabled=false;ok.textContent='Try again'}}}
async function restore(ids,after){try{await arPost({action:'restore',ids});await loadArchive();after&&after();toast(`${ids.length===1?'Job':ids.length+' jobs'} restored to the backlog`)}catch(e){toast('Not restored: '+esc(e.message))}}
document.addEventListener('click',e=>{const a=e.target.closest('[data-job]');if(a){e.preventDefault();draft(JB[a.dataset.job],a.dataset.kind)}});

/* ---- swipe rows (mobile): drag left reveals actions ---- */
function swipe(root){root.querySelectorAll('.row.sw').forEach(r=>{const f=$('.sw-front',r);let x0=null,dx=0;
 r.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;dx=0;f.style.transition='none'},{passive:true});
 r.addEventListener('touchmove',e=>{if(x0==null)return;dx=Math.min(0,e.touches[0].clientX-x0);f.style.transform=`translateX(${Math.max(dx,-220)}px)`},{passive:true});
 r.addEventListener('touchend',()=>{const u=$('.sw-under',r),w=[...u.children].reduce((t,b)=>t+b.offsetWidth+8,16);f.style.transition='';const open=dx<-50;r.classList.toggle('open',open);root.querySelectorAll('.row.sw.open').forEach(o=>{if(o!==r){o.classList.remove('open');$('.sw-front',o).style.transform=''}});f.style.transform=open?`translateX(-${w}px)`:'';x0=null});
 f.addEventListener('click',()=>{if(r.classList.contains('open')){r.classList.remove('open');f.style.transform=''}});});}
function row(j,extra=''){
 const act=j.next_action&&/Reassign/.test(j.next_action)?'Reassign':j.next_party==='owner'?'Owner draft':'Chase';
 const h=`${esc(j.supplier||'No supplier')} · ${Math.round(j.days_open)} days open · ${Math.round(j.days_since_action||0)} since action. Next: ${esc(j.next_action||'review')} by ${fmtS(j.next_due)}.`;
 const btns=`<a class="btn btn-primary btn-sm" data-job="${j.id}">${act}</a><a class="btn btn-ghost btn-sm" data-job="${j.id}" data-kind="tenant">Tenant update</a>`;
 return `<li class="row sw"><div class="sw-under">${btns}</div><div class="sw-front"><div><div class="t"><span class="wo">${esc(j.wo)}</span>${esc(j.title)}</div><div class="p">${esc(j.address||'')}${j.triage?` · ${j.triage}`:''}</div><div class="h">${h}</div>${extra}</div>${st(sevOf(j))}</div><a class="btn btn-ghost btn-sm act-d" data-job="${j.id}">${act}</a><div class="swipe">${btns}</div></li>`;
}


const sg=v=>v>0?'+'+v:String(v);
function benchPanel(){const B=P.benchmarks,pr=B.params,rows=[['Portfolio',B.portfolio],...Object.entries(B.offices)];
 return `<section id="bench"><div class="sh"><h2 class="display">Benchmarks</h2><span class="cap">Proposal · derived from Tapi averages</span></div>
 <p class="muted" style="max-width:70ch">Outstanding cap = average weekly intake (last ${Math.round(pr.intake_window_days/7)} weeks) × ${pr.target_turnaround_weeks}-week target turnaround. Overdue cap = ${Math.round(pr.overdue_share_of_cap*100)}% of the outstanding cap. Shown alongside the ${C.recovery_goal_pct}% on-target goal and the safe-zone limits.</p>
 <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:14px;min-width:760px"><thead><tr class="cap" style="text-align:left">${['','Intake / wk (4m · full)','Intake / mth (4m)','Median to invoice (4m · full)','Open · cap · gap','Overdue · cap · gap','Overdue share'].map(h=>`<th style="padding:10px 8px;border-bottom:1px solid var(--hair)">${h}</th>`).join('')}</tr></thead><tbody>
 ${rows.map(([o,b])=>`<tr style="border-bottom:1px solid var(--hair)${o==='Portfolio'?';font-weight:500':''}"><td style="padding:12px 8px">${o}</td><td class="num">${b.intake_week_4m} · ${b.intake_week_full}</td><td class="num">${b.intake_month_4m}</td><td class="num">${b.median_completion_days_4m} · ${b.median_completion_days} days</td><td class="num">${b.open} · ${b.outstanding_cap} · <b style="color:var(--critical,#9E2626)">${sg(b.outstanding_gap)}</b></td><td class="num">${b.overdue} · ${b.overdue_cap} · <b style="color:var(--critical,#9E2626)">${sg(b.overdue_gap)}</b></td><td class="num">${b.overdue_pct}%</td></tr>`).join('')}
 </tbody></table></div><p class="cfgnote">Average open per office: ${B.portfolio.avg_open_per_office}. Turnaround is lodged to approved invoice received (${B.portfolio.completion_sample} completed jobs with a reliably linked invoice; history from ${fmtS(B.history_start)} ${B.history_start.slice(0,4)}). Overdue here is the job-level count (past its target days). Parameters in config.json, for the owner to confirm.</p></section>`;}
function urgentPanel(only){const U=P.urgent,rows=only?[[only,U.offices[only]]]:[['Portfolio',U.portfolio],...Object.entries(U.offices)],w=(only?U.offices[only]:U.portfolio).recent_wins;
 return `<section id="urgmon"><div class="sh"><h2 class="display">Urgent jobs monitor</h2><span class="cap">Estimated · urgent = triage P1</span></div>
 <div class="offices" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">${rows.map(([o,u])=>`<div class="office"><div class="cap">${o}</div><div class="n num" style="margin-top:10px">${u.open_now} open</div><div class="muted num" style="font-size:14px;margin-top:6px">7 days ago ≈ ${u.open_7d_ago_est} (${sg(u.change_vs_7d)})<br>30 days ago ≈ ${u.open_30d_ago_est} (${sg(u.change_vs_30d)})<br>Cleared ≈ ${u.cleared_per_week_30d} / week (${u.cleared_30d} in 30 days)<br>Net change, 30 days: ${sg(u.change_vs_30d)}</div></div>`).join('')}</div>
 <div class="cap" style="margin-top:28px">Recent wins · urgent jobs closed</div><ul class="rows">${w.map(x=>`<li class="row"><div><div class="t"><span class="wo">${esc(x.wo)}</span>${esc(x.title)}</div><div class="p">${esc(x.property||'')} · ${esc(x.office||'')}</div><div class="h">Closed ${fmtS(x.closed)} (invoice received), ${x.days} days after lodging · ${esc(x.supplier||'')}</div></div>${st('safe')}</li>`).join('')||'<li class="empty">No dated urgent closures yet.</li>'}</ul>
 <p class="cfgnote">${esc(U.basis)} ${(only?U.offices[only]:U.portfolio).closed_no_date} closed urgent jobs have no linked invoice date. Exact figures build up from data/history.json (${P.snapshots.length} snapshot${P.snapshots.length===1?'':'s'} so far).</p></section>`;}
/* ---- Find a trade + work order drafts (nothing sends) ---- */
const FT=P.find_trade, READY=new Set(JSON.parse(sessionStorage.getItem('ready')||'[]'));
const saveReady=()=>sessionStorage.setItem('ready',JSON.stringify([...READY]));

/* ---- copy & paste kit: the portal sends nothing ---- */
const CPI='<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>';
const TKI='<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>';
const MLI='<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>';
function kit(art){if(!art||art.previousElementSibling?.classList.contains('cpk'))return;const d=document.createElement('div');d.className='cpk';
 d.innerHTML=`<div class="cpk-b"><button type="button" class="cpb" data-cp="to">${CPI}<span>Copy to</span></button><button type="button" class="cpb" data-cp="sub">${CPI}<span>Copy subject</span></button><button type="button" class="cpb" data-cp="body">${CPI}<span>Copy email</span></button><a class="cpb cpm" data-cp="mail" href="#">${MLI}<span>Open in email</span></a></div><p class="cpk-h">Drafted by Matt @ Maintenance Mate · check it, then copy, paste into your email and send.</p><div class="cps" aria-live="polite"></div>`;art.before(d);kitHist(d,art)}
function kitHist(d,art){const c=elCtx(art),s=$('.cps',d);if(!c||!s)return;s.innerHTML=elHist(c.ref_kind,c.ref_id,c.recipient)}
const tx=e=>{const c=e.cloneNode(true);c.querySelectorAll('br').forEach(b=>b.replaceWith('\n'));return (c.textContent||'').split('\n').map(l=>l.replace(/\s+/g,' ').trim()).join('\n').trim()};
function mailParts(art){const m=$('.meta',art),sp=m?[...m.children]:[],f=k=>{const i=sp.findIndex(x=>tx(x)===k);return i>=0&&sp[i+1]?tx(sp[i+1]):''};
 const toRaw=f('To'),em=toRaw.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g),out=[];
 const walk=el=>{for(const c of el.children){if(c.classList.contains('meta')||c.classList.contains('cpk'))continue;const t=c.tagName;
  if(t==='UL'||t==='OL'){[...c.children].forEach(li=>out.push('- '+tx(li)));out.push('')}else if(t==='TABLE'){[...c.rows].forEach(r=>out.push([...r.cells].map(tx).join(' | ')));out.push('')}else if(t==='P'||t==='H3'||t==='H4'){out.push(tx(c));out.push('')}else if(c.children.length&&[...c.children].some(x=>/^(P|UL|OL|DIV|TABLE)$/.test(x.tagName)))walk(c);else{const v=tx(c);if(v)out.push(v)}}};
 walk(art);return {to:em?em.join(', '):toRaw,toAddr:em?em.join(','):'',subject:f('Subject'),body:out.join('\n').replace(/\n{3,}/g,'\n\n').trim()}}
function copyText(t){const fb=()=>new Promise((ok,no)=>{const a=document.createElement('textarea');a.value=t;a.setAttribute('readonly','');a.style.cssText='position:fixed;top:0;left:0;opacity:0;font-size:16px';document.body.appendChild(a);a.focus();a.select();a.setSelectionRange(0,t.length);let r=false;try{r=document.execCommand('copy')}catch(e){}a.remove();r?ok():no()});
 if(navigator.clipboard&&window.isSecureContext)return navigator.clipboard.writeText(t).catch(fb);return fb()}
function prep(b,art,action){const c=elCtx(art);if(!c)return;const box=$('.cps',b.closest('.cpk'));
 elPost({...c,event:'prepared',action}).then(()=>{box.innerHTML=`<div class="mks"><span>Did you send it?</span><button type="button" class="cpb sm" data-mk="sent">Mark as sent</button><button type="button" class="cpb sm ghost" data-mk="not_sent">Not sent</button></div>`+elHist(c.ref_kind,c.ref_id,c.recipient)}).catch(()=>{box.innerHTML='<p class="cpk-h">Could not record this right now. Nothing was recorded.</p>'})}
document.addEventListener('click',e=>{const m=e.target.closest('[data-mk]');if(!m)return;const k=m.closest('.cpk'),art=k?.nextElementSibling,c=art&&elCtx(art);if(!c)return;m.disabled=true;
 elPost({...c,event:m.dataset.mk,action:'mark'}).then(ev=>{$('.mks',k)?.remove();kitHist(k,art);if(ev.event==='not_sent')$('.cps',k).insertAdjacentHTML('afterbegin','<p class="cpk-h">Noted as not sent.</p>')}).catch(()=>{m.disabled=false;$('.cps',k).insertAdjacentHTML('afterbegin','<p class="cpk-h">Could not record this right now. Nothing was recorded.</p>')})});
document.addEventListener('click',e=>{const b=e.target.closest('[data-cp]');if(!b)return;const art=b.closest('.cpk')?.nextElementSibling;if(!art)return;const p=mailParts(art),k=b.dataset.cp;
 if(k==='mail'){b.href=`mailto:${encodeURIComponent(p.toAddr).replace(/%2C/g,',')}?subject=${encodeURIComponent(p.subject)}&body=${encodeURIComponent(p.body)}`;prep(b,art,'open_email');return}
 e.preventDefault();const s=$('span',b),lab=s.textContent;copyText(k==='to'?p.to:k==='sub'?p.subject:p.body).then(()=>{b.classList.add('ok');b.firstElementChild.outerHTML=TKI;s.textContent='Copied';prep(b,art,{to:'copy_to',sub:'copy_subject',body:'copy_email'}[k]);clearTimeout(b._t);b._t=setTimeout(()=>{b.classList.remove('ok');b.firstElementChild.outerHTML=CPI;s.textContent=lab},1800)},()=>{s.textContent='Select and copy';setTimeout(()=>s.textContent=lab,2200)})});
/* ---- Maintenance Matt's shortlist ---- */
const MT=P.matt||{batches:[],new_suppliers:[]},MBW={};MT.batches.forEach(b=>b.wos.forEach(w=>MBW[w]=b));
const licB=o=>o.lic_ok?'<span class="bd ok">Licence verified (WA register)</span>':'<span class="bd chk">Check licence before booking</span>';
const farB=o=>o.far?`<span class="bd far">Confirm service area${o.km!=null?` · ~${o.km} km`:''}</span>`:'';
const optMeta=o=>[o.panel,o.base,o.km!=null&&!o.far?`~${o.km} km from batch`:'',o.phone,o.website].filter(Boolean).map(esc).join(' · ');
const JW={};P.jobs.forEach(j=>JW[j.wo]=j);
/* ---- supplier contacts (data/contacts.js + PM edits from /api/contacts) ---- */
const CTX=window.CONTACTS||{suppliers:[]},CT={},CTE={};CTX.suppliers.forEach(x=>{CT[x.name]=x;(x.aka||[]).forEach(a=>CT[a]=x)});
function ctF(n,k){const e=CTE[n]&&CTE[n][k];if(e)return e.value?{v:e.value,src:`Edited by ${e.edited_by}`,checked:e.edited_at,by:e.edited_by}:null;const f=CT[n]&&CT[n].f&&CT[n].f[k];return f&&!f.verify?f:null}
const ctHeld=n=>{const c=CT[n]||{},f=c.f||{};return [...new Set([...(c.held||[]),...Object.entries(f).filter(([k,v])=>v.verify).map(([k,v])=>k)])]};
const ctEmail=n=>(ctF(n,'email')||{}).v||'';
const dShort=d=>{if(!d)return '';const x=String(d).includes('T')?new Date(d):new Date(String(d).slice(0,10)+'T00:00:00');return isNaN(x)?'':x.toLocaleDateString('en-AU',{day:'numeric',month:'short'})};
const telH=v=>'tel:'+String(v).split(/[;,/]/)[0].replace(/[^0-9+]/g,'');
const webH=v=>/^https?:/i.test(v)?v:'https://'+v;
const mapsH=n=>(CT[n]&&CT[n].maps)||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(n+' WA');
const ctT=(f)=>f?` title="${esc(`Source: ${f.src} · checked ${dShort(f.checked)}`)}"`:'';
const OPT={};const optd=(n,ch)=>!!(OPT[n]&&(OPT[n].has('all')||OPT[n].has(ch)));
const MOBR=/(?:\+?61\s?4|04)\d{2}[\s-]?\d{3}[\s-]?\d{3}/;
const ctMob=n=>{const m=ctF(n,'mobile');if(m)return m;const p=ctF(n,'phone');const x=p&&String(p.v).match(MOBR);return x?{...p,v:x[0]}:null};
const ctPh=n=>{const p=ctF(n,'phone');return p?{...p,v:String(p.v).split(/[;,]/)[0].trim()}:null};
/* best way to reach, in the owner's order: email, text (04 mobile), contact form, call */
function reachOf(n){const o=[],em=ctF(n,'email'),mb=ctMob(n),fm=ctF(n,'form'),ph=ctPh(n)||mb;
 if(OPT[n]&&OPT[n].has('all'))return [];
 if(em&&!optd(n,'email'))o.push({m:'email',f:em,l:'Email quote request',s:'Email'});
 if(mb&&!optd(n,'sms'))o.push({m:'sms',f:mb,l:'Text quote request',s:'Text'});
 if(fm&&!optd(n,'form'))o.push({m:'form',f:fm,l:'Open their quote form',s:'Form'});
 if(ph&&!optd(n,'phone'))o.push({m:'call',f:ph,l:`Call ${ph.v}`,s:'Call'});return o}
const reachTier=n=>{const r=reachOf(n);return !r.length?3:r[0].m==='email'||r[0].m==='sms'?0:r[0].m==='form'?1:2};
const reachBadge=n=>{const r=reachOf(n),k=OPT[n]&&OPT[n].has('all')?'Opted out':!r.length?'No contact':r[0].m==='call'?'Call only':r[0].s;return `<span class="rbadge r-${r.length?r[0].m:'none'}" title="Best way to reach">${esc(k)}</span>`};
const sub=j=>{const a=String(j.address||'').split(',');return (a.length>1?a[a.length-1]:'').replace(/\b(WA|6\d{3})\b/g,'').trim()||j.office||''};
const smsText=(j,n)=>`Hi ${n.split(/\s+/)[0]==='The'?'there':n}, ${j.pm?j.pm.split(' ')[0]+' from ':''}Example Property Co. Quote please: ${String(j.title||j.trade||'a job').toLowerCase()}, ${sub(j)}. Ref ${j.wo}. Price and earliest date? Thanks`;
const formText=(j,n)=>`Hi, this is ${j.pm||'the property manager'} from Example Property Co ${j.office||''}. Could you please quote for this job?\n\nRef: ${j.wo}\nJob: ${j.title||''}\nSuburb: ${sub(j)}\nTrade: ${j.trade||''}\n\nPlease reply with your price and earliest attendance date, and your licence and insurance details. Best contact: ${j.pm||''}, Example Property Co ${j.office||''}.`;
const callScript=(j,n)=>`“Hi, it's ${j.pm?j.pm.split(' ')[0]:'[your name]'} from Example Property Co ${j.office||''}. We manage a rental in ${sub(j)} and need a quote for ${String(j.title||'a job').toLowerCase()}, ref ${j.wo}. Can you quote, and when could you attend? What's the best email or mobile to send the details to?”`;
const RL={};const rlKey=(j,n)=>j+'|'+n;
const dTime=d=>new Date(d).toLocaleString('en-AU',{day:'numeric',month:'short',hour:'numeric',minute:'2-digit'});
const MV={email:'Emailed',sms:'Texted',form:'Form',call:'Called'};
function reachHist(jid,n){const L=RL[rlKey(jid,n)]||[];if(!L.length)return '';const last=L[0];
 const pend=last.event==='prepared';return `<div class="rlog">${pend?`<span>${esc({email:'Email prepared',sms:'Text prepared',form:'Form message copied',call:'Call started'}[last.method])} · ${esc(last.actor)} · ${dTime(last.created_at)}</span> <a class="rmk" data-rmk="sent|${last.method}">Mark as sent</a> <a class="rmk" data-rmk="not_sent|${last.method}">Not sent</a>`:`<span>${esc(last.event==='sent'?(MV[last.method]+(last.method==='form'?' sent':'')):'Not sent ('+last.method+')')} · ${esc(last.actor)} · ${dTime(last.created_at)}</span>`}${L.length>1?` <span class="muted">(${L.length} contact events)</span>`:''}</div>`}
function ctInner(n,jid){const j=jid&&JB[jid],R=reachOf(n),ad=ctF(n,'address')||ctF(n,'area'),rt=ctF(n,'rating'),wb=ctF(n,'website'),c=CT[n]||{};
 const act=(r,cls)=>{if(r.m==='email')return `<a class="${cls}" href="mailto:${esc(r.f.v)}" data-rm="email"${ctT(r.f)}>${cls==='rp'?esc(r.l):'Email'}</a>`;
  if(r.m==='sms')return `<a class="${cls}" href="sms:${esc(String(r.f.v).replace(/[^0-9+]/g,''))}" data-rm="sms"${ctT(r.f)}>${cls==='rp'?esc(r.l):'Text'}</a>`;
  if(r.m==='form')return `<a class="${cls}" href="${esc(webH(r.f.v))}" target="_blank" rel="noopener" data-rm="form"${ctT(r.f)}>${cls==='rp'?esc(r.l):'Quote form'}</a>`;
  return `<a class="${cls}" href="${esc(telH(r.f.v))}" data-rm="call"${ctT(r.f)}>${cls==='rp'?esc(r.l):'Call'}</a>`};
 const oo=OPT[n]&&OPT[n].has('all');
 const prim=oo?`<span class="ctn">Opted out of contact</span>`:R.length?act(R[0],'rp'):`<span class="ctn">No email, mobile, form or phone found</span>`;
 const others=R.slice(1).map(r=>act(r,'ro'));if(wb&&!(R[0]&&R[0].m==='form'))others.push(`<a class="ro" href="${esc(webH(wb.v))}" target="_blank" rel="noopener"${ctT(wb)}>Website</a>`);
 const miss=['email','mobile','form'].filter(k=>k==='mobile'?!ctMob(n):!ctF(n,k)).map(k=>({email:'email',mobile:'mobile',form:'form'}[k]));
 const chk=dShort([c.web_checked,c.site_checked,c.deep_checked,...Object.values(c.f||{}).map(x=>x&&x.checked),...Object.values(CTE[n]||{}).map(x=>x&&x.edited_at)].filter(Boolean).map(String).sort().pop());
 const r=rt?`<span${ctT(rt)}>★${esc(rt.v)}${rt.note?` (${esc(rt.note)} Google reviews)`:''}</span>`:`<span>No rating found · <a href="${esc(mapsH(n))}" target="_blank" rel="noopener">Search Google</a></span>`;
 const dbt=(c.doubt||[]).length?`<div class="ctd">Check: ${esc(c.doubt[0])}</div>`:'';
 return `<div class="ctr">${prim}${others.length?`<span class="rol">Other ways</span>${others.join('')}`:''}</div><div class="cti">${r}${ad?` · <span${ctT(ad)}>${esc(ad.v)}</span>`:''}${miss.length?` · <span class="ctn2">No ${miss.join(', ')} found</span>`:''}${chk?` · checked ${chk}`:''} · <a class="cte" data-cte>Edit contact</a></div>${ctHeld(n).length?`<div class="ctn2" style="color:#8a5a00">${esc(ctHeld(n).join(', '))} on file but held: waiting for the owner to check</div>`:''}${dbt}${jid?reachHist(jid,n):''}`}
const ctBlock=(n,jid)=>`<div class="ctb" data-ct="${esc(n)}"${jid?` data-j="${esc(jid)}"`:''}>${ctInner(n,jid)}</div>`;
const ctPaint=()=>document.querySelectorAll('[data-ct]').forEach(b=>{if(!b.querySelector('form'))b.innerHTML=ctInner(b.dataset.ct,b.dataset.j)});
fetch('/api/contacts',{credentials:'same-origin'}).then(r=>r.ok?r.json():{edits:[]}).then(d=>{(d.edits||[]).forEach(e=>{(CTE[e.supplier]||(CTE[e.supplier]={}))[e.field]=e});ctPaint()}).catch(()=>{});
document.addEventListener('click',async e=>{const b=e.target.closest('[data-ct]');if(!b)return;const n=b.dataset.ct;
 if(e.target.closest('[data-cte]')){e.preventDefault();const v=k=>esc((ctF(n,k)||{}).v||'');
  b.innerHTML=`<form class="ctf"><label>Phone<input class="input" name="phone" value="${v('phone')}" inputmode="tel"></label><label>Email<input class="input" name="email" value="${v('email')}" inputmode="email"></label><label>Website<input class="input" name="website" value="${v('website')}"></label><label>Address or area<input class="input" name="address" value="${v('address')}"></label><p class="fl-err" role="alert"></p><div class="ctfb"><button type="submit" class="btn btn-primary btn-sm">Save contact</button><button type="button" class="btn btn-text btn-sm" data-ctc>Cancel</button></div><p class="cfgnote">Saved for everyone, with your name and the time.</p></form>`;
  b.querySelector('form').onsubmit=async ev=>{ev.preventDefault();const f=new FormData(ev.target),fields={};['phone','email','website','address'].forEach(k=>{const nv=String(f.get(k)||'').trim();if(nv!==((ctF(n,k)||{}).v||''))fields[k]=nv});
   if(!Object.keys(fields).length){b.innerHTML=ctInner(n,b.dataset.j);return}
   const r=await fetch('/api/contacts',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({supplier:n,fields})}).catch(()=>null);const d=r?await r.json().catch(()=>({})):{};
   if(!r||!r.ok){b.querySelector('.fl-err').textContent=d.error||'Could not save. Try again.';return}
   d.edits.forEach(x=>{(CTE[n]||(CTE[n]={}))[x.field]=x});b.innerHTML=ctInner(n,b.dataset.j);ctPaint()};return}
 if(e.target.closest('[data-ctc]')){e.preventDefault();b.innerHTML=ctInner(n,b.dataset.j);return}
 const ra=e.target.closest('[data-rm]'),mk=e.target.closest('[data-rmk]'),jid=b.dataset.j,j=jid&&JB[jid];
 const logR=(method,event)=>j?fetch('/api/reach',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({job:j.id,wo:j.wo,supplier:n,method,event})}).then(r=>r.json().then(d=>{if(!r.ok)throw new Error(d.error||'Not recorded');(RL[rlKey(jid,n)]||(RL[rlKey(jid,n)]=[])).unshift(d.reach);b.innerHTML=ctInner(n,jid)})).catch(x=>toast(esc(x.message))):Promise.resolve();
 if(mk){e.preventDefault();const [ev,m]=mk.dataset.rmk.split('|');logR(m,ev);return}
 if(!ra||!j)return;const m=ra.dataset.rm;
 if(m==='email'){const d=document.createElement('div');d.innerHTML=quoteLetter(j,n);const p=mailParts(d);ra.href=`mailto:${encodeURIComponent(ctEmail(n))}?subject=${encodeURIComponent(p.subject)}&body=${encodeURIComponent(p.body)}`;logR('email','prepared');toast('Email drafted in your mail app. Nothing is sent until you press Send.');return}
 if(m==='sms'){const t=smsText(j,n);ra.href=ra.href.split('?')[0]+'?&body='+encodeURIComponent(t);logR('sms','prepared');toast('Text drafted. Nothing is sent until you press Send. Add the street address yourself if needed.');return}
 if(m==='form'){copyText(formText(j,n)).then(()=>toast('Message copied, paste it into their form.'),()=>toast('Open their form and type the job details.'));logR('form','prepared');return}
 if(m==='call'){logR('call','prepared');const s=document.createElement('div');s.className='cscript';s.innerHTML=`<b>Call script</b><p>${esc(callScript(j,n))}</p>`;b.querySelector('.cscript')?.remove();b.appendChild(s);return}
});
fetch('/api/optouts',{credentials:'same-origin'}).then(r=>r.ok?r.json():{optouts:[]}).then(d=>{(d.optouts||[]).forEach(o=>(OPT[o.supplier]||(OPT[o.supplier]=new Set())).add(o.channel));ctPaint()}).catch(()=>{});
fetch('/api/reach',{credentials:'same-origin'}).then(r=>r.ok?r.json():{reach:[]}).then(d=>{const W={};Object.values(JB).forEach(j=>{W[j.wo]=j.id;if(j.source_ref)W[j.source_ref]=j.id});(d.reach||[]).forEach(x=>{const id=W[x.wo];if(id)(RL[rlKey(id,x.supplier)]||(RL[rlKey(id,x.supplier)]=[])).push(x)});ctPaint()}).catch(()=>{});

function batchLetter(b,o,kind){const js=b.wos.map(w=>JW[w]).filter(Boolean),pm=js[0]?.pm||'{{property_manager}}';const sub=kind==='quote'?`Quote request ${b.id}: ${b.trade}, ${b.jobs} job${b.jobs===1?'':'s'} in ${b.suburbs}`:`Work orders ${b.id}: ${b.trade}, ${b.jobs} job${b.jobs===1?'':'s'} in ${b.suburbs}`;
 return `<div class="meta"><span>To</span><span>${esc(o.name)} · ${ctEmail(o.name)?esc(ctEmail(o.name)):F('{{contractor_email}}')}</span><span>From</span><span>${esc(pm)}, Example Property Co ${esc(b.office)}</span><span>Subject</span><span style="color:var(--ink)">${esc(sub)}</span></div>
 <p style="margin-top:28px">Hi ${F(o.name)},</p><p>${kind==='quote'?`We have ${b.jobs} ${esc(b.trade.toLowerCase())} job${b.jobs===1?'':'s'} in ${esc(b.suburbs)} and would like a quote. Could you reply with a price for each job and your earliest attendance date?`:`Please accept the following ${b.jobs} ${esc(b.trade.toLowerCase())} work order${b.jobs===1?'':'s'} in ${esc(b.suburbs)}. Could you reply with a booked attendance date for each?`}</p>
 <ul>${(js.length?js:b.wos.map(w=>({wo:w}))).map(j=>`<li>${esc(j.wo)}${j.title?` · ${esc(j.title)}`:''}${j.address?` · ${esc(j.address)}`:''}</li>`).join('')}</ul>
 <p>Please confirm your licence and insurance details and that you service ${esc(b.suburbs)}. If you can't take these, let us know and we'll arrange someone else.</p><p>Kind regards,</p><div class="sig">${esc(pm)}</div><div class="muted" style="font-size:14px">Property Manager · Example Property Co, ${esc(b.office)}</div>`}
function batchSheet(b,o,kind){openM(sheet(`${kind==='quote'?'Quote request':'Batch work order'} · ${b.id}`,`<article class="letter"${ctxA('batch',b.id,'',o.name,kind==='quote'?'quote_request':'batch_work_order')}>${batchLetter(b,o,kind)}</article>`,`<a class="btn btn-ghost" data-edit>Edit</a><a class="btn btn-text" data-close>Close</a><span class="sh-note">${DRAFT}</span>`))}
const tw=x=>String(x||'').toLowerCase().replace(/[^a-z ]/g,' ').split(/\s+/).filter(w=>w.length>3&&!['heating','gates','glazing','lawns','services','renovation','curtains'].includes(w));
function joined(j){/* suppliers who joined via the form and were approved by an admin (contact edits from 'Join form, approved by ...') */const out=[];Object.entries(CTE).forEach(([n,f])=>{const e=Object.values(f);if(!e.some(x=>/^Join form, approved/.test(x.edited_by||'')))return;const tr=(f.trades&&f.trades.value)||'',ar=(f.areas&&f.areas.value)||'';const jt=tw(j.trade);if(!jt.some(w=>tw(tr).includes(w)))return;if(j.office&&!ar.includes(j.office))return;out.push({name:n,location:'Joined via form · '+ar,phone:f.mobile&&f.mobile.value||''})});return out}
function matches(j){if(j.trade==='Other')return {pref:[],sug:[]};const sug=(FT.suggested[j.office]||{})[j.trade]||[],pref=(FT.preferred[j.office]||{})[j.trade]||[],have=new Set([...sug,...pref].map(x=>x.name));return {pref,sug:[...joined(j).filter(x=>!have.has(x.name)),...sug]}}
function woLetter(j,c){const ce=c.email||ctEmail(c.name),to=ce?esc(ce):F('{{contractor_email}}');
 return `<div class="meta"><span>To</span><span>${esc(c.name)} · ${to}</span><span>From</span><span>${esc(j.pm||'{{property_manager}}')}, Example Property Co ${esc(j.office||'')}</span><span>Subject</span><span style="color:var(--ink)">Work order ${esc(j.wo)}: ${esc(j.title)} at ${esc(j.address||'')}</span></div>
 <p style="margin-top:24px">Hi ${F(c.name)},</p><p>Example Property Co would like to book you for the following job:</p><p>${F(j.wo)} · ${F(j.title)}<br>${F(j.address||'{{address}}')}<br>Trade: ${F(j.trade)} · Priority: ${F(j.triage||'')}${j.triage==='P1'?' (urgent)':''}</p><p>Could you confirm whether you can take it and reply with an attendance date by ${F(fmtD(j.next_due))}? Tenant access details will follow once you confirm.</p><p>Kind regards,</p><div class="sig">${esc(j.pm||'{{property_manager}}')}</div><div class="muted" style="font-size:14px">Property Manager · Example Property Co, ${esc(j.office||'')}</div>`}
function woDraft(js,c,after){let k=0;const show=()=>{const j=js[k];openM(sheet(`Work order draft${js.length>1?` · ${k+1} of ${js.length}`:''}`,`<article class="letter"${ctxA('job',j.id,j.wo,c.name,'work_order')}>${woLetter(j,c)}</article>`,`<a class="btn btn-primary" data-ok>Approve</a><a class="btn btn-ghost" data-edit>Edit</a><a class="btn btn-text" data-close>Cancel</a><span class="sh-note">${DRAFT}</span>`));
 $('[data-ok]',M).onclick=()=>{READY.add(j.id);saveReady();if(k<js.length-1){k++;show()}else{closeM();after&&after()}}};show()}
function findTrade(j,after){const {pref,sug}=matches(j);const mb=MBW[j.wo],mo=mb?mb.options:[];const mli=(o,i)=>`<li class="row"><div><div class="t">Option ${o.rank} · ${esc(o.name)} ${mark(mb,o.name)} ${reachBadge(o.name)}</div><div class="h">${optMeta(o)}</div><div class="bds">${licB(o)}${farB(o)}</div>${ctBlock(o.name,j.id)}</div><a class="btn btn-ghost btn-sm" data-pick="m${i}">Pick</a></li>`;const msec=mb?`<div class="mattbox"><div class="cap">Supplier shortlist by Matt @ Maintenance Mate · batch ${esc(mb.id)} · ${mo.length} option${mo.length===1?'':'s'}</div><p class="cfgnote" style="margin:6px 0 8px">${esc(MT.note)}</p><ul class="rows">${mo.map((o,i)=>[o,i]).sort((a,b)=>reachTier(a[0].name)-reachTier(b[0].name)||a[1]-b[1]).map(([o,i])=>mli(o,i)).join('')}</ul><p style="margin:10px 0 0"><a class="btn btn-text btn-sm" href="directory.html?batch=${esc(mb.id)}&office=${encodeURIComponent(mb.office)}">See batch ${esc(mb.id)} · ${mb.jobs} job${mb.jobs===1?'':'s'} ›</a></p></div>`:'';const li=(c,i,kind)=>`<li class="row"><div><div class="t">${esc(c.name)}</div><div class="h">${kind==='p'?`${c.jobs} ${esc(j.trade.toLowerCase())} job${c.jobs===1?'':'s'} completed in ${esc(j.office)} · last ${fmtS(c.last)} ${String(c.last||'').slice(0,4)}`:`Not yet used · ${esc(c.location||c.area||'')}${c.phone?' · '+esc(c.phone):''}`}</div></div><a class="btn btn-ghost btn-sm" data-pick="${kind}${i}">Pick</a></li>`;
 const unk=j.trade==='Other'?'<p class="note" style="margin:0 0 12px">The trade could not be worked out from the title and description, so there are no matches. Browse <a href="directory.html">Contractors</a> by office and trade instead.</p>':'';
 openM(sheet(`Find a trade · ${j.wo}`,`${unk}<p class="muted" style="margin:0 0 6px">${esc(j.title)} · ${esc(j.address||'')}</p><p style="margin:0 0 16px"><span class="pill">${esc(j.trade)}</span> <span class="pill">${esc(j.office||'Office unknown')}</span></p>${srcLine(j).replace('margin:-8px 0 14px','margin:-8px 0 16px')}${elHist('job',j.id)}${msec}
 <div class="cap">Used before in ${esc(j.office||'this office')} · ${pref.length}</div><ul class="rows">${pref.map((c,i)=>li(c,i,'p')).join('')||'<li class="empty">No completed jobs in this trade and office.</li>'}</ul>
 <div class="cap" style="margin-top:20px">Not yet used · ${sug.length}</div><ul class="rows">${sug.slice(0,25).map((c,i)=>li(c,i,'s')).join('')||'<li class="empty">No directory contractors for this trade and office.</li>'}</ul><p class="cfgnote">${esc(FT.basis)} Licence, insurance and rates are not on file.</p>`,`${AR_OK&&!Array.isArray(after)?'<a class="btn btn-ghost" data-arch1>Archive job</a>':''}<a class="btn btn-text" data-close>Close</a>`));
 $('[data-arch1]',M)?.addEventListener('click',()=>archiveSheet([j],()=>R[page]()));
 M.querySelectorAll('[data-pick]').forEach(b=>b.onclick=()=>{const v=b.dataset.pick,c=v[0]==='m'?{name:mo[+v.slice(1)].name,phone:mo[+v.slice(1)].phone}:(v[0]==='p'?pref:sug)[+v.slice(1)];woDraft(Array.isArray(after)?after:[j],c,()=>R[page]())})}
/* ---- Job lifecycle: one list and one flow for Tapi and Maintenance Mate jobs (stored in the portal; Tapi is read-only) ---- */
const FL=new Map(),LIM=new Map(),STEPS=[],NATIVE=[];let FL_OK=false,ME_OFF=null;
const TST={'Repair request':'new','Accept tenant request':'new','Choose action':'new','Awaiting quote':'quoting','Review quote':'quoting','Awaiting approval':'awaiting_owner','Owner approved':'approved','Owner declined':'declined','Scheduling job':'booked','Awaiting confirmation':'booked','Job scheduled':'booked','Awaiting invoice':'booked','Processing invoice':'booked'};
const CLOSED=new Set(['completed','invoiced','sent_pm']);
const SL={new:'New',quoting:'Quoting',awaiting_owner:'Awaiting owner',approved:'Owner approved',declined:'Owner declined',booked:'Booked',completed:'Completed',invoiced:'Invoiced',sent_pm:'Sent to PropertyMe'};
const FILT=[['new','New',s=>s==='new'],['quoting','Quoting',s=>s==='quoting'||s==='approved'||s==='declined'],['awaiting_owner','Awaiting owner',s=>s==='awaiting_owner'],['booked','Booked',s=>s==='booked'],['completed','Completed',s=>s==='completed'],['invoiced','Invoiced',s=>s==='invoiced'||s==='sent_pm']];
const TRADES=['Plumbing & gas','Electrical','Air-con & heating','Locks & security','Glass & windows','Roofing & gutters','Fencing & gates','Garden & trees','Pest control','Cleaning & carpets','Painting','Appliances','Doors & garage','Building & handyman','Other'];
const normA=s=>String(s||'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\b(street)\b/g,'st').replace(/\broad\b/g,'rd').replace(/\bavenue\b/g,'ave').replace(/\bdrive\b/g,'dr').replace(/\bplace\b/g,'pl').replace(/\bcourt\b/g,'ct').replace(/\bcrescent\b/g,'cres').replace(/\bparade\b/g,'pde').replace(/\bterrace\b/g,'tce').replace(/\bclose\b/g,'cl').replace(/\bboulevard\b/g,'bvd').replace(/\bhighway\b/g,'hwy').replace(/\s+/g,' ').trim();
const JS_=(s,d)=>{try{return s?JSON.parse(s):d}catch(e){return d}};
const money=v=>v==null||v===''?'':'$'+Number(v).toLocaleString('en-AU',{minimumFractionDigits:Number(v)%1?2:0,maximumFractionDigits:2});
const SLA={P1:2,P2:7};
/* Matt's triage: explainable keyword rules from config.json property_categories plus a trade keyword map */
const PCR=(C.property_categories||{}).rules||{},rxL=L=>L&&L.length?new RegExp('\\b('+L.join('|')+')\\b','i'):null;
const TRK=[['Plumbing & gas',/\b(leak\w*|drip\w*|tap|taps|toilet|cistern|drain\w*|blocked|pipe\w*|plumb\w*|shower|basin|sink|hot water|hws|sewer|sewage|burst|flood\w*|gas)\b/i],['Electrical',/\b(electric\w*|power|gpo|power ?points?|switch(board)?|circuit|breaker|wiring|lights?|downlights?|sparking|rcd|safety switch|smoke (alarm|detector)s?)\b/i],
 ['Air-con & heating',/\b(air ?con\w*|split system|evaporative|cooler|heater|heating|a\/c)\b/i],['Locks & security',/\b(lock\w*|keys?|deadlock|security|break[ -]?in|not secure)\b/i],['Glass & windows',/\b(window\w*|glass|glazing|fly ?screens?|screens?|blinds?|curtains?|shutters?)\b/i],
 ['Roofing & gutters',/\b(roof\w*|gutter\w*|downpipes?|ceiling)\b/i],['Fencing & gates',/\b(fenc\w*|gates?)\b/i],['Garden & trees',/\b(garden\w*|lawn|trees?|retic\w*|hedge|weeds?|branch\w*)\b/i],['Pest control',/\b(pests?|termites?|ants|cockroach\w*|rodents?|rats?|mice|wasps?|bees)\b/i],
 ['Cleaning & carpets',/\b(clean\w*|carpets?|mould|mold)\b/i],['Painting',/\b(paint\w*|scuff\w*|touch[ -]?ups?)\b/i],['Appliances',/\b(oven|stove|cooktop|dishwasher|rangehood|washing machine|dryer|appliance\w*)\b/i],['Doors & garage',/\b(doors?|garage|roller door|sliding door)\b/i],['Building & handyman',/\b(cupboard\w*|cabinet\w*|drawers?|deck\w*|skirting|wardrobe\w*|tiles?|tiling|handle|towel rail|letterbox|wall|floor\w*|repair)\b/i]];
const HINTL={water:'Water',power:'Power',gas:'Gas',security:'Security'};
function mattTriage(text,hints){text=String(text||'');hints=hints||[];const hit=(re)=>{const m=re&&text.match(re);return m?m[0]:''};
 let tr='Other',tw='';for(const [t,re] of TRK){const m=hit(re);if(m){tr=t;tw=m;break}}
 if(tr==='Other'){if(hints.includes('water'))tr='Plumbing & gas';else if(hints.includes('power'))tr='Electrical';else if(hints.includes('gas'))tr='Plumbing & gas';else if(hints.includes('security'))tr='Locks & security'}
 const u=hit(rxL(PCR.urgent_safety)),hp=hints.filter(h=>HINTL[h]);let p='P3',why;
 if(u||hp.length){p='P1';why=u?`"${u}" reads as urgent or unsafe`:`tenant ticked ${hp.map(h=>HINTL[h].toLowerCase()).join(', ')} affected`}
 else{const c=hit(rxL(PCR.compliance)),e=hit(rxL(PCR.electrical)),w=hit(rxL(PCR.water)),v=hit(rxL((C.vacate||{}).include)),co=hit(rxL(PCR.cosmetic));
  if(c||e||w){p='P2';why=`"${c||e||w}" is ${c?'compliance':e?'electrical':'water'} work`}else if(v||co){p='P4';why=`"${v||co}" is low-level or cosmetic`}else why='no urgent, compliance, electrical, water or cosmetic words, so general repair'}
 return {triage:p,trade:tr,reason:`${p}: ${why}. Trade: ${tr==='Other'?'unclear from the words':`${tr} ("${tw||'tenant hint'}")`}.`}}
function natJob(r){const s=mattTriage((r.title||'')+' '+(r.description||'')+' '+(r.location||''),JS_(r.hints,[])),tri=r.triage||s.triage,sla=SLA[tri]||28,d=Math.max(0,(Date.now()-new Date(r.created_at))/864e5);
 const due=new Date(new Date(r.created_at).getTime()+sla*864e5).toISOString().slice(0,10);
 return {id:r.job_id,wo:r.wo,native:true,test:!!r.test,origin:r.origin,title:r.title||'',description:r.description||'',location:r.location||'',address:r.address||'',office:r.office||'',pm:r.pm||null,triage:r.triage||null,trade:r.trade||s.trade,
  lodged:String(r.created_at).slice(0,10),days_open:d,sla_days:sla,overdue:d>sla,days_past_sla:Math.max(0,d-sla),supplier:r.booked_supplier||null,needs_trade:!r.booked_supplier,next_due:due,tenant_name:r.tenant_name,tenant_contact:r.tenant_contact,hints:JS_(r.hints,[]),photos:JS_(r.photos,[])}}
function loadFlow(d){FL.clear();LIM.clear();STEPS.length=0;(d.jobs||[]).forEach(r=>FL.set(r.job_id,r));(d.limits||[]).forEach(l=>LIM.set(l.prop_key,l));STEPS.push(...(d.steps||[]));ME_OFF=d.me_office||null;FL_OK=true;
 NATIVE.length=0;[...FL.values()].filter(r=>r.source==='native').forEach(r=>NATIVE.push(natJob(r)));
 ALL.length=0;ALL.push(...TAPI,...NATIVE);ALL.forEach(j=>{JB[j.id]=j;JW[j.wo]=j});
 TAPI.forEach(j=>{const r=FL.get(j.id);if(r){if(r.triage){j.triage=r.triage;j.trade=r.trade}if(r.booked_supplier){j.supplier=r.booked_supplier;j.needs_trade=false}}})}
const stageOf=j=>{const r=FL.get(j.id);return r?r.stage:j.native?'new':(TST[j.stage]||'new')};
const isClosed=j=>CLOSED.has(stageOf(j));
const limOf=a=>LIM.get(normA(a));
const qOf=j=>JS_(FL.get(j.id)?.quotes,[]).filter(q=>q.status!=='withdrawn');
const stepsOf=j=>STEPS.filter(s=>s.job_id===j.id);
const lastStep=j=>stepsOf(j).find(s=>!s.undone_at&&s.action!=='create');
const byWho=s=>s.acting_as?`${s.acting_as} (View as)`:who(s.actor);
const SNAME={create:'Logged',take:'Taken from the shared queue',assign:'Assigned',triage:'Triage confirmed',quotes_request:'Quotes requested',quote_record:'Quote recorded',quote_accept:'Quote accepted',owner:'Owner replied',book:'Booked',complete:'Completed',invoice:'Invoice recorded',propertyme:'Sent to PropertyMe'};
const sDet=s=>{const d=JS_(s.detail,{})||{};switch(s.action){case 'triage':return `${d.triage} · ${d.trade}`;case 'quotes_request':return (d.suppliers||[]).join(', ');case 'quote_record':return `${d.supplier} · ${money(d.amount)}`;case 'quote_accept':return `${d.supplier} · ${money(d.amount)}${d.owner_needed?' · owner approval needed':' · within limit'}`;case 'owner':return d.decision==='approved'?'Approved':'Declined';case 'book':return `${d.supplier} · ${fmtS(d.date)}`;case 'invoice':return `${money(d.amount)} · ${d.invoice_no}`;case 'take':case 'assign':return d.pm||'';case 'create':return d.routed==='none'?'to the office shared queue':d.pm?`to ${d.pm}`:'to the office shared queue';default:return ''}};
/* status line: one plain sentence per job */
function statusLine(j){const s=stageOf(j),r=FL.get(j.id),Q=qOf(j),rec=Q.filter(q=>q.status==='received'),acc=Q.find(q=>q.id===r?.accepted_quote);
 const tapi='';
 switch(s){case 'new':return triaged(j)?`New · ${esc(r?.triage||j.triage)} · ${esc(r?.trade||j.trade)}${tapi}`:`New · needs triage${tapi}`;
  case 'quoting':return Q.length?`Quoting · ${rec.length} of ${Q.length} quote${Q.length===1?'':'s'} back`:`Quoting${tapi}`;
  case 'awaiting_owner':return `Awaiting owner${acc?` · ${esc(acc.supplier)} ${money(acc.amount)}`:''}${tapi}`;
  case 'approved':return `${r?.owner_decision==='within_limit'?'Within approval limit':'Owner approved'} · ready to book${tapi}`;
  case 'declined':return `Owner declined · get new quotes${tapi}`;
  case 'booked':return `Booked${r?.booked_supplier||j.supplier?` · ${esc(r?.booked_supplier||j.supplier)}`:''}${r?.booked_date?` · ${fmtS(r.booked_date)}`:''}${tapi}`;
  case 'completed':return `Completed ${r?.completed_at?fmtS(r.completed_at.slice(0,10)):''} · awaiting invoice`;
  case 'invoiced':return `Invoiced ${money(r?.invoice_amount)} · ${esc(r?.invoice_no||'')} · send to PropertyMe`;
  case 'sent_pm':return `Sent to PropertyMe ${r?.pm_sent_at?fmtS(r.pm_sent_at.slice(0,10)):''} · done`}return ''}
const triaged=j=>{const r=FL.get(j.id);return !!(r?r.triage:(!j.native&&j.triage))};
function nextStep(j){const s=stageOf(j),Q=qOf(j);
 if(!j.pm)return ['take','Take it'];
 switch(s){case 'new':return triaged(j)?['quotes','Request quotes']:['triage','Confirm triage'];
  case 'quoting':return Q.some(q=>q.status==='requested')?['record','Record quote']:Q.some(q=>q.status==='received')?['accept','Choose quote']:['quotes','Request quotes'];
  case 'awaiting_owner':return ['owner','Owner replied'];case 'approved':return ['book','Book job'];case 'declined':return ['quotes','Get new quotes'];
  case 'booked':return ['complete','Mark completed'];case 'completed':return ['invoice','Record invoice'];case 'invoiced':return ['pmsend','Send to PropertyMe'];}return null}
async function flPost(o){const r=await fetch('/api/jobs',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({...o,acting_as:!PMS&&page==='pm'&&VA?VA:null})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||('Error '+r.status));return d}
async function flReload(){try{const d=await fetch('/api/jobs',{credentials:'same-origin',cache:'no-store'}).then(r=>{if(!r.ok)throw 0;return r.json()});loadFlow(d)}catch(e){FL_OK=false}applyArchive()}
async function act(j,o,msg,after){try{const d=await flPost({job_id:j.id,...o});await flReload();closeM();(after||(()=>R[page]()))();
  toast(`${esc(j.wo)} · ${esc(msg)}`,async()=>{try{await flPost({job_id:j.id,action:'undo',step_id:d.step&&d.step.id});await flReload();(after||(()=>R[page]()))();toast('Undone')}catch(e){toast('Undo failed: '+esc(e.message))}});return d}
 catch(e){const b=$('.fl-err',M);if(b&&M.classList.contains('open'))b.textContent=e.message;else toast('Not saved: '+esc(e.message));return null}}
const srcLine=j=>j.source&&j.source!=='native'&&(j.source_ref||j.source)?`<p class="muted" style="margin:-8px 0 14px;font-size:12px">Imported from ${esc(j.source==='tapi'?'Tapi':j.source)}${j.source_ref?`, ref ${esc(j.source_ref)}`:''}</p>`:'';
const jobHead=j=>`<p class="muted" style="margin:0 0 4px">${esc(j.wo)} · ${esc(j.title)}</p><p class="muted" style="margin:0 0 14px;font-size:13px">${esc(j.address||'')}${j.office?' · '+esc(j.office):''}${j.pm?' · '+esc(j.pm):' · Office shared queue'}${j.test?' · <b>TEST RECORD</b>':''}</p>${srcLine(j)}`;
const err='<p class="fl-err" role="alert"></p>';
const emerg=`<div class="safe"><b>Emergency? Call first, then log it.</b><span>Danger to life or fire: 000 · Gas leak: ATCO Gas 13 13 52 · Power out or wires down: Western Power 13 13 51 · After-hours repairs: ${F('{{agency_after_hours_number}}')}</span></div>`;
/* step sheets */
function triageSheet(j,after){const s=mattTriage(j.title+' '+(j.description||'')+' '+(j.location||''),j.hints),r=FL.get(j.id),cur=r?.triage?{triage:r.triage,trade:r.trade}:s;
 openM(sheet(`Triage · ${j.wo}`,`${jobHead(j)}<div class="mattbox"><div class="cap">Matt @ Maintenance Mate suggests</div><p class="tri-s"><span class="pill ${s.triage==='P1'?'p1':''}">${s.triage}</span> <span class="pill">${esc(s.trade)}</span></p><p class="cfgnote" style="margin:4px 0 0">${esc(s.reason)}</p></div>
 ${s.triage==='P1'?emerg:''}<details class="fl-ch"><summary>Change it</summary><div class="fl-f"><label>Priority<select class="input" data-tp>${['P1','P2','P3','P4'].map(p=>`<option ${p===cur.triage?'selected':''}>${p}</option>`).join('')}</select></label><label>Trade<select class="input" data-tt>${TRADES.map(t=>`<option ${t===cur.trade?'selected':''}>${esc(t)}</option>`).join('')}</select></label></div></details>${err}`,
 `<a class="btn btn-primary" data-go>Confirm</a><a class="btn btn-text" data-close>Cancel</a>`));
 $('[data-go]',M).onclick=()=>{const p=$('[data-tp]',M).value,t=$('[data-tt]',M).value,ch=p!==s.triage||t!==s.trade;act(j,{action:'triage',triage:p,trade:t,changed:ch,reason:ch?'Changed by PM':s.reason},`triage ${p} · ${t}`,after)}}
function supOpts(j){const SD=P.suppliers_dir||{},tr=j.trade,off=j.office,L=[],seen=new Set();const add=(o)=>{if(o.name&&!seen.has(o.name)){seen.add(o.name);L.push(o)}};
 const tl=String(tr||'').toLowerCase(),known=tr&&tr!=='Other';
 const mb=MBW[j.wo];if(known&&mb&&mb.trade===tr)mb.options.slice().sort((a,b)=>a.rank-b.rank).forEach(o=>add({name:o.name,g:'m',h:`Option ${o.rank} · ${optMeta(o)}`}));
 const used=known?((((SD.preferred||{}).by_office||{})[off]||{})[tr]||[]).slice().sort((a,b)=>(b.completed_in_office||0)-(a.completed_in_office||0)):[];
 used.forEach(c=>add({name:c.name,g:'u',h:`${c.completed_in_office} ${tl} job${c.completed_in_office===1?'':'s'} done in ${off}`}));
 (known?((FT.suggested[off]||{})[tr]||[]):[]).slice(0,8).forEach(c=>add({name:c.name,g:'n',h:`Not yet used · ${c.location||c.area||''}`}));
 const oth=[];Object.entries(((SD.preferred||{}).by_office||{})[off]||{}).forEach(([t,cs])=>{if(t===tr)return;cs.forEach(c=>{if(!seen.has(c.name)&&!oth.find(x=>x.name===c.name))oth.push({name:c.name,g:'o',h:`${t} · ${c.completed_in_office} job${c.completed_in_office===1?'':'s'} done in ${off}`})})});oth.sort((a,b)=>a.name.localeCompare(b.name));
 const GI={m:0,u:1,n:2};L.forEach((o,i)=>o._i=i);L.sort((a,b)=>(GI[a.g]-GI[b.g])||(reachTier(a.name)-reachTier(b.name))||(a._i-b._i));
 return {L,oth,known}}
function quoteLetter(j,name){return `<div class="meta"><span>To</span><span>${esc(name)} · ${ctEmail(name)?esc(ctEmail(name)):F('{{contractor_email}}')}</span><span>From</span><span>${esc(j.pm||'{{property_manager}}')}, Example Property Co ${esc(j.office||'')}</span><span>Subject</span><span style="color:var(--ink)">Quote request ${esc(j.wo)}: ${esc(j.title)} at ${esc(j.address||'')}</span></div>
 <p style="margin-top:24px">Hi ${F(name)},</p><p>Could you please quote for the following job?</p><p>${F(j.wo)} · ${F(j.title)}<br>${F(j.address||'{{address}}')}${j.location?`<br>Where: ${F(j.location)}`:''}<br>Trade: ${F(j.trade)} · Priority: ${F(j.triage||'')}</p><p>Please reply with your price and your earliest attendance date, and confirm your licence and insurance details. Tenant access details will follow.</p><p>Kind regards,</p><div class="sig">${esc(j.pm||'{{property_manager}}')}</div><div class="muted" style="font-size:14px">Property Manager · Example Property Co, ${esc(j.office||'')}</div>`}
function quotesSheet(j,after){const {L,oth,known}=supOpts(j),live=qOf(j).filter(q=>stageOf(j)==='quoting'),room=3-live.length,hasM=L.some(o=>o.g==='m');
 const nT=hasM?Math.min(3,room):Math.min(2,room),tick=new Set(L.filter(o=>o.g===(hasM?'m':'u')).slice(0,nT).map(o=>o.name));
 const cap={m:"Matt @ Maintenance Mate's shortlist",u:`Used before · ${esc(j.trade)} · ${esc(j.office)}`,n:`Not yet used · ${esc(j.trade)}`};
 const item=o=>`<li class="row"><label class="chk"><input type="checkbox" value="${esc(o.name)}" ${tick.has(o.name)?'checked':''}> <span><b>${esc(o.name)}</b> ${reachBadge(o.name)}<br><span class="h">${esc(o.h)}</span></span></label>${ctBlock(o.name,j.id)}</li>`;
 let g0='',list='';L.forEach(o=>{if(o.g!==g0){g0=o.g;list+=`<li class="qcap">${cap[o.g]}</li>`}list+=item(o)});
 const intro=!known?`<p class="note" style="margin:0 0 10px">The trade for this job isn't set, so there's no supplier match. Set the trade in triage, show other trades, or type a supplier below.</p>`:!L.length?`<p class="note" style="margin:0 0 10px">No ${esc(j.trade.toLowerCase())} suppliers on file for ${esc(j.office)}. Show other trades or type a supplier below.</p>`:`<p style="margin:0 0 10px;font-size:14px">${esc(j.trade)} suppliers in ${esc(j.office)}. Pick up to ${room}. ${tick.size?(hasM?"Matt's top picks are ticked.":'The most-used are ticked.'):''}</p>`;
 openM(sheet(`Request quotes · ${j.wo}`,`${jobHead(j)}${intro}${L.length?`<ul class="rows qpick">${list}</ul>`:''}
 ${oth.length?`<details class="qoth"><summary>Show other trades (${oth.length})</summary><ul class="rows qpick">${oth.map(item).join('')}</ul></details>`:''}
 <label class="fl-1">Or type a supplier<input class="input" data-qo placeholder="Supplier name"></label>${err}`,`<a class="btn btn-primary" data-go>Request quotes</a><a class="btn btn-text" data-close>Cancel</a>`));
 $('[data-go]',M).onclick=async()=>{const names=[...M.querySelectorAll('.qpick input:checked')].map(i=>i.value);const o=$('[data-qo]',M).value.trim();if(o)names.push(o);
  if(!names.length||names.length>room){$('.fl-err',M).textContent=`Pick 1 to ${room} suppliers.`;return}
  const d=await act(j,{action:'quotes_request',suppliers:names},`quotes requested from ${names.length}`,after);if(d)quoteEmails(JB[j.id],names)}}
function quoteEmails(j,names){let k=0;const show=()=>{const nm=names[k];openM(sheet(`Quote request email${names.length>1?` · ${k+1} of ${names.length}`:''}`,`<article class="letter"${ctxA('job',j.id,j.wo,nm,'quote_request')}>${quoteLetter(j,nm)}</article>`,`${k<names.length-1?'<a class="btn btn-primary" data-nx>Next email</a>':'<a class="btn btn-primary" data-close>Done</a>'}<a class="btn btn-ghost" data-edit>Edit</a><span class="sh-note">${DRAFT}</span>`));$('[data-nx]',M)?.addEventListener('click',()=>{k++;show()})};show()}
function recordSheet(j,after,qid){const Q=qOf(j),q=Q.find(x=>x.id===qid)||Q.find(x=>x.status==='requested');
 openM(sheet(`Record quote · ${j.wo}`,`${jobHead(j)}<div class="fl-f"><label>Supplier<select class="input" data-qs>${Q.map(x=>`<option value="${x.id}" ${x===q?'selected':''}>${esc(x.supplier)}${x.status==='received'?` · ${money(x.amount)} (update)`:''}</option>`).join('')}${Q.length<3?'<option value="">Another supplier…</option>':''}</select></label>
 <label data-qn ${q?'hidden':''}>Supplier name<input class="input" data-qname></label><label>Amount (inc GST)<input class="input" data-qa inputmode="decimal" placeholder="0.00"></label><label class="fl-1">Note (optional)<input class="input" data-qnote placeholder="e.g. includes parts, can attend Tuesday"></label></div>${err}`,
 `<a class="btn btn-primary" data-go>Save quote</a><a class="btn btn-text" data-close>Cancel</a>`));
 $('[data-qs]',M).onchange=e=>{$('[data-qn]',M).hidden=!!e.target.value};
 $('[data-go]',M).onclick=()=>{const id=$('[data-qs]',M).value,a=$('[data-qa]',M).value.replace(/[$,\s]/g,'');if(a===''||isNaN(+a)){$('.fl-err',M).textContent='Enter the quote amount.';return}
  act(j,{action:'quote_record',quote_id:id||null,supplier:id?null:$('[data-qname]',M).value,amount:+a,note:$('[data-qnote]',M).value},`quote saved · ${money(+a)}`,after)}}
function limitLine(j){const l=limOf(j.address);return l&&l.amount!=null?`Owner approval limit: <b>${money(l.amount)}</b>${l.note?` · ${esc(l.note)}`:''}`:'<b>No limit on file, get owner approval</b>'}
function acceptSheet(j,after){const Q=qOf(j),rec=Q.filter(q=>q.status==='received'),l=limOf(j.address),cap=l&&l.amount!=null?+l.amount:null,lo=rec.length?Math.min(...rec.map(q=>+q.amount)):0;
 openM(sheet(`Choose quote · ${j.wo}`,`${jobHead(j)}<p style="margin:0 0 12px;font-size:14px">${limitLine(j)}</p><ul class="rows qpick">${Q.map(q=>q.status==='received'?`<li class="row"><label class="chk"><input type="radio" name="qa" value="${q.id}" ${+q.amount===lo?'checked':''}> <span><b>${esc(q.supplier)} · ${money(q.amount)}</b>${+q.amount===lo&&rec.length>1?' <span class="pill quiet">Lowest</span>':''}<br><span class="h">${esc(q.note||'')} ${cap===null||+q.amount>cap?'· needs owner approval':'· within limit'}</span></span></label></li>`:`<li class="row"><span>${esc(q.supplier)} · <span class="muted">waiting</span></span><a class="btn btn-text btn-sm" data-rq="${q.id}">Record</a></li>`).join('')}</ul>${err}`,
 `<a class="btn btn-primary" data-go>Accept quote</a><a class="btn btn-ghost" data-rq="">Record another</a><a class="btn btn-text" data-close>Cancel</a>`));
 M.querySelectorAll('[data-rq]').forEach(b=>b.onclick=()=>recordSheet(j,after,b.dataset.rq));
 $('[data-go]',M).onclick=()=>{const v=M.querySelector('input[name=qa]:checked')?.value;if(!v){$('.fl-err',M).textContent='Pick a quote.';return}const q=Q.find(x=>x.id===v),need=cap===null||+q.amount>cap;
  act(j,{action:'quote_accept',quote_id:v},need?'quote accepted · owner approval needed':'quote accepted · within limit',after).then(d=>{if(d&&need)ownerSheet(JB[j.id],after)})}}
function ownerLetter(j){const r=FL.get(j.id),q=qOf(j).find(x=>x.id===r?.accepted_quote)||{},l=limOf(j.address);
 return `<div class="meta"><span>To</span><span>${F('{{owner_name}}')} · ${F('{{owner_email}}')}</span><span>From</span><span>${esc(j.pm||'{{property_manager}}')}, Example Property Co ${esc(j.office||'')}</span><span>Subject</span><span style="color:var(--ink)">Approval needed: ${esc(j.title)} at ${esc(j.address||'')}</span></div>
 <p style="margin-top:24px">Hi ${F('{{owner_name}}')},</p><p>Your tenant has reported a maintenance issue at ${F(j.address||'{{address}}')}: ${F(j.title)}${j.location?` (${F(j.location)})`:''}.</p>
 <p>We have a quote from ${F(q.supplier||'{{supplier}}')} for ${F(money(q.amount)||'{{amount}}')}${q.note?` (${F(q.note)})`:''}.${l&&l.amount!=null?` This is above the approval limit of ${F(money(l.amount))} we hold for your property.`:` We don't have an approval limit on file for your property, so we need your OK before going ahead.`}</p>
 <p>Could you reply to approve or decline? Once approved we'll book the work in and keep you updated.</p><p>Kind regards,</p><div class="sig">${esc(j.pm||'{{property_manager}}')}</div><div class="muted" style="font-size:14px">Property Manager · Example Property Co, ${esc(j.office||'')}</div>`}
function ownerSheet(j,after){openM(sheet(`Owner approval · ${j.wo}`,`${jobHead(j)}<p style="margin:0 0 10px;font-size:14px">${limitLine(j)}</p><article class="letter"${ctxA('job',j.id,j.wo,'Owner','owner_approval')}>${ownerLetter(j)}</article>${err}`,
 `<a class="btn btn-primary" data-ow="approved">Owner approved</a><a class="btn btn-ghost" data-ow="declined">Owner declined</a><a class="btn btn-text" data-close>Later</a><span class="sh-note">${DRAFT}</span>`));
 M.querySelectorAll('[data-ow]').forEach(b=>b.onclick=()=>act(j,{action:'owner',decision:b.dataset.ow},b.dataset.ow==='approved'?'owner approved':'owner declined',after))}
function bookSheet(j,after){const r=FL.get(j.id),q=qOf(j).find(x=>x.id===r?.accepted_quote),O=supOpts(j).L,def=q?.supplier||r?.booked_supplier||j.supplier||'';const tm=new Date(Date.now()+864e5).toLocaleDateString('en-CA',{timeZone:'Australia/Perth'});
 openM(sheet(`Book · ${j.wo}`,`${jobHead(j)}<div class="fl-f"><label class="fl-1">Supplier<input class="input" data-bs list="bsl" value="${esc(def)}" placeholder="Supplier name"><datalist id="bsl">${O.map(o=>`<option value="${esc(o.name)}">`).join('')}</datalist></label><label>Booked date<input class="input" type="date" data-bd value="${r?.booked_date||tm}"></label></div>
 <div class="wo-k"></div>${err}`,`<a class="btn btn-primary" data-go>Save booking</a><a class="btn btn-ghost" data-wo>Work order email</a><a class="btn btn-text" data-close>Cancel</a>`));
 $('[data-wo]',M).onclick=()=>{const nm=$('[data-bs]',M).value.trim();if(!nm){$('.fl-err',M).textContent='Pick the supplier first.';return}const k=$('.wo-k',M);k.innerHTML=`<article class="letter"${ctxA('job',j.id,j.wo,nm,'work_order')}>${woLetter(j,{name:nm})}</article><p class="sh-note">${DRAFT}</p>`;kit($('.letter',k))};
 $('[data-go]',M).onclick=()=>act(j,{action:'book',supplier:$('[data-bs]',M).value.trim(),date:$('[data-bd]',M).value},`booked · ${$('[data-bs]',M).value.trim()}`,after)}
async function upPhotos(files,job){const keys=[];for(const f of [...files].slice(0,6)){const r=await fetch('/api/photo?job='+encodeURIComponent(job),{method:'POST',credentials:'same-origin',headers:{'content-type':f.type||'image/jpeg'},body:f});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Photo upload failed');keys.push(d.key)}return keys}
const photoIn=(k)=>`<label class="fl-1 ph-in">Photos (optional)<input type="file" accept="image/*" multiple data-${k}><span class="h" data-${k}n></span></label>`;
function completeSheet(j,after){openM(sheet(`Mark completed · ${j.wo}`,`${jobHead(j)}<div class="fl-f"><label class="fl-1">What was done (optional)<textarea class="input" rows="3" data-cn placeholder="e.g. Replaced tap washer, tested, no leak"></textarea></label>${photoIn('cp')}</div><p class="cfgnote">Completed jobs leave the active and overdue counts. ${j.native?'':'Tapi is not changed; the job drops off when a later Tapi import shows it closed.'}</p>${err}`,
 `<a class="btn btn-primary" data-go>Mark completed</a><a class="btn btn-text" data-close>Cancel</a>`));
 $('[data-go]',M).onclick=async e=>{e.target.textContent='Saving…';let ph=[];try{ph=await upPhotos($('[data-cp]',M).files,j.id)}catch(x){$('.fl-err',M).textContent=x.message;e.target.textContent='Mark completed';return}act(j,{action:'complete',note:$('[data-cn]',M).value,photos:ph},'completed',after)}}
function invoiceSheet(j,after){const q=qOf(j).find(x=>x.id===FL.get(j.id)?.accepted_quote);openM(sheet(`Record invoice · ${j.wo}`,`${jobHead(j)}<div class="fl-f"><label>Invoice amount<input class="input" data-ia inputmode="decimal" placeholder="${q?Number(q.amount).toFixed(2):'0.00'}"></label><label>Invoice number<input class="input" data-in></label></div>${q?`<p class="cfgnote">Accepted quote: ${esc(q.supplier)} · ${money(q.amount)}</p>`:''}${err}`,
 `<a class="btn btn-primary" data-go>Save invoice</a><a class="btn btn-text" data-close>Cancel</a>`));
 $('[data-go]',M).onclick=()=>{const a=$('[data-ia]',M).value.replace(/[$,\s]/g,'');act(j,{action:'invoice',amount:+a,invoice_no:$('[data-in]',M).value.trim()},`invoice ${money(+a)} recorded`,after)}}
function pmSummary(j){const r=FL.get(j.id)||{},q=qOf(j).find(x=>x.id===r.accepted_quote);return [`Maintenance job ${j.wo}: ${j.title}`,`Property: ${j.address||''}`,j.location?`Where: ${j.location}`:'',`Priority: ${r.triage||j.triage||''} · Trade: ${r.trade||j.trade||''}`,q?`Quote: ${q.supplier} ${money(q.amount)}${r.owner_decision==='within_limit'?' (within approval limit)':r.owner_decision==='approved'?` (owner approved ${r.owner_at?fmtS(r.owner_at.slice(0,10)):''})`:''}`:'',
 `Supplier: ${r.booked_supplier||j.supplier||''}${r.booked_date?` · attended ${fmtS(r.booked_date)}`:''}`,r.completed_at?`Completed: ${fmtS(r.completed_at.slice(0,10))}${r.completed_note?` · ${r.completed_note}`:''}`:'',`Invoice: ${r.invoice_no||''} · ${money(r.invoice_amount)}`,`Property manager: ${j.pm||''}`].filter(Boolean).join('\n')}
function pmSheet(j,after){const t=pmSummary(j);openM(sheet(`Send to PropertyMe · ${j.wo}`,`${jobHead(j)}<p style="margin:0 0 8px;font-size:14px">Copy this into the property's record in PropertyMe, attach the invoice there, then mark it sent.</p><pre class="pmx">${esc(t)}</pre>${err}`,
 `<a class="btn btn-ghost" data-cpy>Copy summary</a><a class="btn btn-primary" data-go>Mark sent to PropertyMe</a><a class="btn btn-text" data-close>Cancel</a>`));
 $('[data-cpy]',M).onclick=e=>copyText(t).then(()=>e.target.textContent='Copied',()=>e.target.textContent='Select and copy');
 $('[data-go]',M).onclick=()=>act(j,{action:'propertyme'},'sent to PropertyMe',after)}
function limitSheet(j,after){const l=limOf(j.address);openM(sheet(`Approval limit · ${j.address}`,`<p style="margin:0 0 12px;font-size:14px">Quotes above this amount need the owner's approval. Leave it blank if there's no limit on file; every quote then goes to the owner.</p><div class="fl-f"><label>Limit ($)<input class="input" data-la inputmode="decimal" value="${l&&l.amount!=null?Number(l.amount):''}" placeholder="No limit on file"></label><label class="fl-1">Note (optional)<input class="input" data-ln value="${esc(l?.note||'')}" placeholder="e.g. from management agreement"></label></div>${l?`<p class="cfgnote">Last set by ${esc(who(l.set_by))}, ${awst(l.set_at)}</p>`:''}${err}`,
 `<a class="btn btn-primary" data-go>Save limit</a><a class="btn btn-text" data-close>Cancel</a>`));
 $('[data-go]',M).onclick=async()=>{const a=$('[data-la]',M).value.replace(/[$,\s]/g,'');try{await flPost({action:'limit',job_id:j.id,address:j.address,amount:a===''?null:+a,note:$('[data-ln]',M).value});await flReload();closeM();(after||(()=>R[page]()))();toast(a===''?'Limit cleared':`Limit set to ${money(+a)}`)}catch(e){$('.fl-err',M).textContent=e.message}}}
function histSheet(j){const L=stepsOf(j);openM(sheet(`History · ${j.wo}`,`${jobHead(j)}<ul class="elh-l fl-h">${L.map(s=>`<li class="${s.undone_at?'und':''}"><b>${esc(SNAME[s.action]||s.action)}</b>${sDet(s)?' · '+esc(sDet(s)):''} · ${esc(byWho(s))}, ${awst(s.created_at)}${s.undone_at?` · undone by ${esc(who(s.undone_by))}, ${awst(s.undone_at)}`:''}</li>`).join('')||'<li>No steps recorded in the portal yet.</li>'}</ul>${elHist('job',j.id)}`,`<a class="btn btn-text" data-close>Close</a>`))}
async function undoLast(j,after){const s=lastStep(j);if(!s)return toast('Nothing to undo');try{await flPost({job_id:j.id,action:'undo',step_id:s.id});await flReload();(after||(()=>R[page]()))();toast(`Undone: ${esc(SNAME[s.action]||s.action)}`)}catch(e){toast('Undo failed: '+esc(e.message))}}
function runStep(j,k,after){({take:()=>act(j,{action:'take'},'taken',after),triage:()=>triageSheet(j,after),quotes:()=>quotesSheet(j,after),record:()=>recordSheet(j,after),accept:()=>acceptSheet(j,after),owner:()=>ownerSheet(j,after),book:()=>bookSheet(j,after),complete:()=>completeSheet(j,after),invoice:()=>invoiceSheet(j,after),pmsend:()=>pmSheet(j,after),
 limit:()=>limitSheet(j,after),hist:()=>histSheet(j),undo:()=>undoLast(j,after),ft:()=>findTrade(j),dr:()=>draft(j),ar:()=>archiveSheet([j],after||(()=>R[page]())),vv:()=>moveVac([j.id],'vacate',after||(()=>R[page]())),retri:()=>triageSheet(j,after),bookq:()=>bookSheet(j,after),own:()=>ownerSheet(j,after)})[k]?.()}
/* a job row: one status line, one next-step button, everything else under More */
function flowRow(j,o={}){const nx=FL_OK?nextStep(j):null,s=stageOf(j),cl=CLOSED.has(s),mine=!j.pm||j.pm===(PMS?ME.person:VA)||!PMS;
 const more=[s==='new'&&triaged(j)?['bookq','Book without quotes']:null,triaged(j)&&!cl?['retri','Change triage']:null,s==='quoting'?['record','Record a quote']:null,s==='quoting'&&qOf(j).some(q=>q.status==='received')?['accept','Choose quote now']:null,['limit','Approval limit'],s==='awaiting_owner'?null:(qOf(j).some(q=>q.id===FL.get(j.id)?.accepted_quote)?['own','Owner email']:null),
  !cl?['ft','Find a trade']:null,!cl&&!j.native?['dr','Draft email']:null,!cl&&VAC_OK&&j.triage!=='P1'&&!j.native?['vv','Move to outgoing report']:null,!cl&&AR_OK?['ar','Archive']:null,lastStep(j)?['undo','Undo last step']:null,['hist','History']].filter(Boolean);
 const tag=j.triage==='P1'&&!cl?'<span class="pill p1">P1 urgent</span>':j.overdue&&!cl?'<span class="pill">Overdue</span>':'';
 return `<li class="row bk fr" id="j-${esc(j.id)}"><div><div class="t"><span class="wo">${esc(j.wo)}</span>${esc(j.title)}${j.test?' <span class="pill quiet">TEST</span>':''}</div><div class="p">${esc(j.address||'')}${o.office?` · ${esc(j.office||'office unknown')}`:''}</div><div class="fls">${statusLine(j)}</div></div>
 <div class="ra">${tag}<span class="rb">${nx&&mine?`<a class="btn btn-primary btn-sm" data-nx="${esc(j.id)}|${nx[0]}">${esc(nx[1])}</a>`:''}${FL_OK&&mine?`<details class="more"><summary class="btn btn-text btn-sm" aria-label="More actions for ${esc(j.wo)}">More</summary><div class="mm">${more.map(([k,l])=>`<a href="#" data-nx="${esc(j.id)}|${k}">${esc(l)}</a>`).join('')}</div></details>`:''}</span></div></li>`}
function flowClick(e,after){const b=e.target.closest('[data-nx]');if(!b)return false;e.preventDefault();b.closest('details')?.removeAttribute('open');const [id,k]=b.dataset.nx.split('|');runStep(JB[id],k,after);return true}
/* New job (PM / admin) */
let PROPS_L=null;function propList(){if(PROPS_L)return Promise.resolve(PROPS_L);return new Promise(ok=>{if(window.PROPS)return ok(PROPS_L=window.PROPS.properties.map(p=>p.address).filter(Boolean));const s=document.createElement('script');s.src='data/properties.js';s.onload=()=>ok(PROPS_L=(window.PROPS?.properties||[]).map(p=>p.address).filter(Boolean));s.onerror=()=>ok(PROPS_L=[...new Set(ALL.map(j=>j.address).filter(Boolean))]);document.head.appendChild(s)})}
function newJobSheet(after){openM(sheet('New job',`<div class="fl-f"><label class="fl-1">Property<input class="input" data-na list="nal" placeholder="Start typing the address" autocomplete="off"><datalist id="nal"></datalist></label>
 <label class="fl-1">What's wrong<input class="input" data-nt placeholder="e.g. Kitchen tap leaking" maxlength="140"></label><label class="fl-1">Where in the property (optional)<input class="input" data-nl placeholder="e.g. Kitchen"></label>
 <div class="fl-1 hints"><span class="cap">Is any of this affected?</span>${Object.entries(HINTL).map(([k,l])=>`<label class="chk"><input type="checkbox" value="${k}"> ${l}</label>`).join('')}</div>
 <label>Tenant name (optional)<input class="input" data-nn></label><label>Tenant phone or email (optional)<input class="input" data-nc></label><label class="fl-1">More detail (optional)<textarea class="input" rows="2" data-nd></textarea></label>${photoIn('np')}
 <label class="chk fl-1"><input type="checkbox" data-ntest> Test record (local testing only)</label></div><div class="nsug"></div>${err}`,`<a class="btn btn-primary" data-go>Log job</a><a class="btn btn-text" data-close>Cancel</a>`));
 propList().then(L=>{const dl=$('#nal',M);if(!dl)return;$('[data-na]',M).oninput=e=>{const q=e.target.value.toLowerCase();if(q.length<3){dl.innerHTML='';return}dl.innerHTML=L.filter(a=>a.toLowerCase().includes(q)).slice(0,12).map(a=>`<option value="${esc(a)}">`).join('')}});
 const hs=()=>[...M.querySelectorAll('.hints input:checked')].map(i=>i.value);const sug=()=>{if(!$('[data-nt]',M))return;const t=$('[data-nt]',M).value+' '+$('[data-nd]',M).value+' '+$('[data-nl]',M).value;$('.nsug',M).innerHTML=t.trim().length>3||hs().length?(s=>`<p class="cfgnote">Matt suggests <b>${s.triage} · ${esc(s.trade)}</b>. You'll confirm on the next screen.</p>${s.triage==='P1'?emerg:''}`)(mattTriage(t,hs())):''};
 M.addEventListener('input',sug);M.addEventListener('change',sug);
 $('[data-go]',M).onclick=async e=>{const b=e.target;if(b.dataset.busy)return;b.dataset.busy=1;b.textContent='Saving…';try{const ph=await upPhotos($('[data-np]',M).files,'new');
  const d=await flPost({action:'create',address:$('[data-na]',M).value.trim(),title:$('[data-nt]',M).value.trim(),location:$('[data-nl]',M).value.trim(),description:$('[data-nd]',M).value.trim(),tenant_name:$('[data-nn]',M).value.trim(),tenant_contact:$('[data-nc]',M).value.trim(),hints:hs(),photos:ph,test:$('[data-ntest]',M).checked});
  await flReload();(after||(()=>R[page]()))();const j=JB[d.job.job_id];toast(`${esc(d.job.wo)} logged ${d.job.pm?'for '+esc(d.job.pm):'to the '+esc(d.job.office||'office')+' shared queue'}`);if(j&&j.pm&&(!PMS||j.pm===ME.person))triageSheet(j,after);else closeM()}
  catch(x){delete b.dataset.busy;b.textContent='Log job';$('.fl-err',M).textContent=x.message}}}
/* stage counts and "Check in Tapi" */
function stageCounts(L){const c={};FILT.forEach(([k,,f])=>c[k]=L.filter(j=>f(stageOf(j))).length);return c}
const checkTapi=()=>TAPI.filter(j=>{const r=FL.get(j.id);return r&&CLOSED.has(r.stage)&&r.completed_at&&(new Date(P.as_of+'T00:00:00+08:00')-new Date(r.completed_at))/864e5>=7});
/* ---- pages ---- */
const BS={office:Q.get('office')||'',pm:Q.get('pm')||'',pri:Q.get('pri')||'',trade:'',chip:(Q.get('chip')==='vac'?'out':Q.get('chip'))||'',bulk:false,sel:new Set()};
const main=$('main');
const R={reach(){const main=$('main');const OFF=['Mandurah','Perth','Bunbury','Geraldton'];let off=Q.get('office')&&OFF.includes(Q.get('office'))?Q.get('office'):'All offices';
 const K=['email','sms','form','call','none'],KL={email:'Email',sms:'Text',form:'Form only',call:'Phone only',none:'No contact'};
 const first=n=>{const r=reachOf(n);return r.length?r[0].m:'none'};
 function cov(){const S=CTX.suppliers.filter(x=>off==='All offices'||(x.offices||[]).includes(off)),T={},tot={email:0,sms:0,form:0,call:0,none:0};
  S.forEach(x=>{const k=first(x.name);tot[k]++;(x.trades&&x.trades.length?x.trades:['Trade not recorded']).forEach(t=>{(T[t]||(T[t]={email:0,sms:0,form:0,call:0,none:0,n:0}))[k]++;T[t].n++})});
  const rows=Object.entries(T).sort((a,b)=>b[1].n-a[1].n);
  const gaps=S.filter(x=>['call','none'].includes(first(x.name))).sort((a,b)=>(b.used||0)-(a.used||0)).slice(0,40);
  return `<section class="surface" style="padding:18px 22px;margin-top:18px"><div class="cap">Best way to reach · ${esc(off)} · ${S.length} suppliers</div>
  <div class="rcov">${K.map(k=>`<div><b class="num">${tot[k]}</b><span>${KL[k]}</span></div>`).join('')}</div>
  <div class="tblw"><table class="rtab"><thead><tr><th>Trade</th>${K.map(k=>`<th>${KL[k]}</th>`).join('')}<th>Total</th></tr></thead><tbody>${rows.map(([t,c])=>`<tr><td>${esc(t)}</td>${K.map(k=>`<td class="num${(k==='none'||k==='call')&&c[k]?' gap':''}">${c[k]||'·'}</td>`).join('')}<td class="num">${c.n}</td></tr>`).join('')}</tbody></table></div>
  <p class="muted" style="font-size:13px">Counted by each supplier's best way to reach: email, then text (04 mobile), then website form, then phone. Opted-out suppliers count as no contact.</p></section>
  <section class="surface" style="padding:18px 22px;margin-top:18px"><div class="cap">Gaps · phone only or no contact · most-used first</div><ul class="rows">${gaps.map(x=>`<li class="row" style="display:block"><b>${esc(x.name)}</b> ${reachBadge(x.name)} <span class="muted" style="font-size:13px">· ${esc((x.trades||[]).join(', '))}${x.used?` · ${x.used} jobs done`:''}</span>${ctBlock(x.name)}</li>`).join('')||'<li class="empty">No gaps.</li>'}</ul></section>`}
 main.innerHTML=`<div class="hero" style="padding-bottom:20px"><div class="cap">Contractors · reach</div><h1 class="display" style="margin-top:14px">How fast can we reach suppliers?</h1><p class="lede">Coverage by office and trade, join-form submissions waiting for review, and the opt-out list. Nothing here sends a message.</p>
 <div class="seg" style="margin-top:14px">${['All offices',...OFF].map(o=>`<button type="button" data-ro="${o}" class="${o===off?'on':''}">${o}</button>`).join('')}</div></div><div id="rcv"></div><section class="surface" style="padding:18px 22px;margin-top:18px" id="rjoin"><div class="cap">Join form submissions</div><p class="muted">Loading…</p></section><section class="surface" style="padding:18px 22px;margin-top:18px" id="ropt"><div class="cap">Opt-outs</div><p class="muted">Loading…</p></section>`;
 const draw=()=>{$('#rcv').innerHTML=cov();main.querySelectorAll('[data-ro]').forEach(b=>b.classList.toggle('on',b.dataset.ro===off))};draw();
 main.addEventListener('click',e=>{const b=e.target.closest('[data-ro]');if(b){off=b.dataset.ro;draw()}});
 const J=d=>{const v=typeof d==='string'?JSON.parse(d):d;return v||{}};
 const loadJ=()=>fetch('/api/join-review',{credentials:'same-origin'}).then(r=>r.json()).then(d=>{const L=d.submissions||[];$('#rjoin').innerHTML=`<div class="cap">Join form submissions · ${L.filter(x=>x.status==='pending').length} waiting</div>`+(L.length?`<ul class="rows">${L.map(x=>{const v=J(x.data);return `<li class="row" style="display:block"><b>${esc(x.supplier)}</b> <span class="tagu">${esc(x.status)}</span><div class="meta2"><span>${esc(v.contact_name||'')} · ${esc(v.email||'no email')} · ${esc(v.mobile||'no mobile')}${v.abn?` · ABN ${esc(v.abn)}`:''}</span></div><div class="meta2"><span>${esc((v.trades||[]).join(', '))} · ${esc((v.offices||[]).join(', '))}${v.areas?` · ${esc(v.areas)}`:''}${v.preferred?` · prefers ${esc(v.preferred)}`:''}</span></div><div class="meta2"><span>Insurance: ${esc(v.insurance||'not given')}${v.insurance_expiry?` · expires ${esc(v.insurance_expiry)}`:''}</span></div><div class="meta2"><span class="muted">Consent given ${dTime(x.consent_at)}${x.reviewed_by?` · ${esc(x.status)} by ${esc(x.reviewed_by)} ${dTime(x.reviewed_at)}`:''}</span></div>${x.status==='pending'?`<div style="display:flex;gap:8px;margin-top:8px"><a class="btn btn-primary btn-sm" data-jr="${x.id}|approve">Approve and update directory</a><a class="btn btn-text btn-sm" data-jr="${x.id}|reject">Reject</a></div>`:x.status==='rejected'?`<div style="display:flex;gap:8px;margin-top:8px"><a class="btn btn-text btn-sm" data-jr="${x.id}|delete">Delete</a></div>`:''}</li>`}).join('')}</ul>`:'<p class="muted">No submissions yet.</p>')}).catch(()=>{$('#rjoin').innerHTML='<div class="cap">Join form submissions</div><p class="muted">Unavailable.</p>'});
 const loadO=()=>fetch('/api/optouts',{credentials:'same-origin'}).then(r=>r.json()).then(d=>{const L=d.optouts||[];$('#ropt').innerHTML=`<div class="cap">Opt-outs · ${L.length}</div><p class="muted" style="font-size:13px">Respected by the reach buttons, the join link and the outreach lists.</p>${L.length?`<ul class="rows">${L.map(o=>`<li class="row" style="display:block"><b>${esc(o.supplier)}</b> · ${esc(o.channel==='all'?'all contact':o.channel)} <span class="muted" style="font-size:13px">· ${esc(o.reason||'')} · ${esc(o.recorded_by)} · ${dTime(o.created_at)}</span></li>`).join('')}</ul>`:''}<form class="ctf" id="optf" style="max-width:520px"><label>Supplier<input class="input" name="supplier" list="supl" required></label><datalist id="supl">${CTX.suppliers.map(x=>`<option value="${esc(x.name)}">`).join('')}</datalist><label>Channel<select class="input" name="channel"><option value="all">All contact</option><option value="sms">Text</option><option value="email">Email</option><option value="form">Website form</option><option value="phone">Phone</option></select></label><label>Reason<input class="input" name="reason" placeholder="e.g. Replied STOP"></label><p class="fl-err" role="alert"></p><div><button class="btn btn-ghost btn-sm">Add opt-out</button></div></form>`;
  $('#optf').onsubmit=async ev=>{ev.preventDefault();const f=new FormData(ev.target);const r=await fetch('/api/optouts',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify(Object.fromEntries(f))}).catch(()=>null);const d=r?await r.json().catch(()=>({})):{};if(!r||!r.ok){$('#optf .fl-err').textContent=d.error||'Not saved';return}(OPT[d.optout.supplier]||(OPT[d.optout.supplier]=new Set())).add(d.optout.channel);loadO();draw();toast('Opt-out saved')}}).catch(()=>{});
 main.addEventListener('click',async e=>{const b=e.target.closest('[data-jr]');if(!b)return;const [id,action]=b.dataset.jr.split('|');if(action==='delete'&&!confirm('Delete this rejected submission for good? This cannot be undone.'))return;b.textContent='Saving…';const r=await fetch('/api/join-review',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({id:+id,action})}).catch(()=>null);if(!r||!r.ok){toast('Not saved. Try again.');loadJ();return}toast(action==='approve'?'Approved. Directory updated.':action==='delete'?'Deleted':'Rejected');loadJ();fetch('/api/contacts',{credentials:'same-origin'}).then(r=>r.json()).then(d=>{(d.edits||[]).forEach(x=>{(CTE[x.supplier]||(CTE[x.supplier]={}))[x.field]=x});draw()})});
 loadJ();loadO();},

director(){
 const o=CUR&&OFFS.includes(CUR)?CUR:'', B=P.benchmarks, b=o?B.offices[o]:B.portfolio, U=o?P.urgent.offices[o]:P.urgent.portfolio;
 const J=P.jobs.filter(j=>!o||j.office===o), V=P.vacate.filter(j=>!o||j.office===o), nAr=ALL.filter(j=>AR.has(j.id)&&(!o||j.office===o)).length;
 const cnt=f=>J.filter(f).length, needs=cnt(j=>j.needs_trade), slow=cnt(j=>j.not_responding), W=P.weekly.weeks;
 const pct=(a,c)=>Math.max(0,Math.min(100,c?100*a/c:0));
 const bar=(a,c,cls='')=>`<div class="pb ${cls}" role="img" aria-label="${a} of cap ${c}"><i style="width:${pct(a,c)}%"></i>${a>c?`<em style="left:${pct(c,a)}%"></em>`:''}</div>`;
 const spark=(L,cls='')=>{const mx=Math.max(...L),mn=Math.min(...L),w=120,h=28,s=(i)=>i*w/(L.length-1),y=v=>h-2-(mx===mn?h/2:(v-mn)*(h-4)/(mx-mn));return `<svg class="spk ${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${L.map((v,i)=>s(i)+','+y(v)).join(' ')}"/><circle cx="${s(L.length-1)}" cy="${y(L[L.length-1])}" r="2.2"/></svg>`};
 const dl=(v,good)=>`<span class="dlt ${v===0?'':(v>0)===good?'up':'dn'}">${v>0?'▲ ':v<0?'▼ ':''}${sg(v)}</span>`;
 const tile=(lab,val,sub,viz,href)=>`<a class="tile" ${href?`href="${href}"`:''}><div class="tl-h"><span class="cap">${lab}</span></div><div class="tl-n mono">${val}</div><div class="tl-s">${sub}</div>${viz||''}</a>`;
 const oq=o?'&office='+encodeURIComponent(o):'';
 const lw=W[W.length-1].lodged, pw=W[W.length-2].lodged;
 const urgSeries=[U.open_30d_ago_est,U.open_7d_ago_est,U.open_now];
 // category mix (open backlog)
 const PO=['urgent_safety','compliance','electrical','water','cosmetic','general'], PL={urgent_safety:'Urgent / safety',compliance:'Compliance',electrical:'Electrical',water:'Leak / plumbing water',cosmetic:'Low-level / cosmetic',general:'General repair'};
 const cat={};J.forEach(j=>{const k=j.pcat||'general';cat[k]=(cat[k]||0)+1});const tot=J.length||1;
 let acc=0;const R0=15.9155,donut=`<svg class="donut" viewBox="0 0 42 42" role="img" aria-label="Backlog by category">${PO.map(k=>{const v=100*(cat[k]||0)/tot,s=`<circle class="dc-${k}" cx="21" cy="21" r="${R0}" stroke-dasharray="${v} ${100-v}" stroke-dashoffset="${25-acc}"/>`;acc+=v;return s}).join('')}<text x="21" y="20" class="dn1">${n(J.length)}</text><text x="21" y="26" class="dn2">open</text></svg>`;
 // urgent trend chart
 const uc=(()=>{const L=urgSeries,mx=Math.max(...L)*1.2,w=300,h=110,X=[36,200,272],y=v=>h-18-(v/mx)*(h-34);return `<svg class="lc" viewBox="0 0 ${w} ${h}" role="img" aria-label="Urgent open: about ${L[0]} thirty days ago, about ${L[1]} seven days ago, ${L[2]} now"><line x1="0" x2="${w}" y1="${h-18}" y2="${h-18}" class="ax"/><polyline class="ln" points="${X.map((x,i)=>x+','+y(L[i])).join(' ')}"/>${X.map((x,i)=>`<circle cx="${x}" cy="${y(L[i])}" r="3"/><text x="${x}" y="${y(L[i])-8}" class="lv">${i<2?'≈':''}${L[i]}</text><text x="${x}" y="${h-4}" class="lx">${['30 days ago','7 days ago','Now'][i]}</text>`).join('')}</svg>`})();
 const wk=(()=>{const mx=Math.max(...W.map(x=>x.lodged)),w=300,h=110,bw=w/W.length;return `<svg class="bc" viewBox="0 0 ${w} ${h}" role="img" aria-label="Jobs lodged per week, last 12 weeks">${W.map((x,i)=>{const bh=(x.lodged/mx)*(h-30);return `<rect x="${i*bw+3}" y="${h-16-bh}" width="${bw-6}" height="${bh}" class="${i===W.length-1?'last':''}"><title>Week to ${fmtS(x.end)}: ${x.lodged}</title></rect>`}).join('')}<line x1="0" x2="${w}" y1="${h-16}" y2="${h-16}" class="ax"/><text x="2" y="${h-3}" class="lx" style="text-anchor:start">${fmtS(W[0].end)}</text><text x="${w-2}" y="${h-3}" class="lx" style="text-anchor:end">${fmtS(W[W.length-1].end)}</text><text x="${w-2}" y="10" class="lv" style="text-anchor:end">peak ${mx}</text></svg>`})();
 const offRows=P.offices.filter(x=>!o||x.office===o);
 const ob=offRows.map(x=>{const bb=B.offices[x.office];return `<div class="obar"><div class="obh"><span>${esc(x.office)}</span><span class="mono">${bb.open} <s>/ ${bb.outstanding_cap} cap</s></span></div>${bar(bb.open,bb.outstanding_cap,'rose')}<div class="obh sm"><span>Overdue</span><span class="mono">${bb.overdue} <s>/ ${bb.overdue_cap} cap</s></span></div>${bar(bb.overdue,bb.overdue_cap,'thin')}</div>`}).join('');
 const chip=(ok)=>`<span class="chip ${ok?'ok':'over'}"><i></i>${ok?'Within cap':'Over cap'}</span>`;
 const trow=x=>{const bb=B.offices[x.office],uu=P.urgent.offices[x.office],JJ=P.jobs.filter(j=>j.office===x.office),ok=bb.open<=bb.outstanding_cap&&bb.overdue<=bb.overdue_cap;return `<tr><td><a href="backlog.html?office=${encodeURIComponent(x.office)}">${esc(x.office)}</a></td><td class="mono r">${bb.open}</td><td class="mono r m">${bb.outstanding_cap}</td><td class="mono r">${bb.overdue}</td><td class="mono r m">${bb.overdue_cap}</td><td class="mono r">${bb.overdue_pct}%</td><td class="mono r ${uu.open_now?'urg':''}">${uu.open_now}</td><td class="mono r">${JJ.filter(j=>j.needs_trade).length}</td><td class="mono r">${JJ.filter(j=>j.not_responding).length}</td><td>${chip(ok)}</td></tr>`};
 const wins=U.recent_wins.slice(0,6);
 main.innerHTML=`<div class="phead"><div><div class="cap">Overview${o?' · '+esc(o):' · All offices'}</div><h1>Maintenance operations</h1></div><div class="pact"><a class="btn btn-primary btn-sm" href="backlog.html?chip=needs${oq}">Find trades · <span class="mono">${n(needs)}</span></a><a class="btn btn-ghost btn-sm" href="backlog.html?chip=over${oq}">Overdue queue</a></div></div>
 ${AR_OK?'':'<p class="note" role="status">Archive and outgoing report status could not be loaded, so counts include every job from the last Tapi sync. Nothing was changed.</p>'}
 <section class="tiles">
 ${tile('Backlog',n(b.open),`${dl(b.outstanding_gap,false)} vs cap ${b.outstanding_cap}`,bar(b.open,b.outstanding_cap,'rose'),'backlog.html'+(o?'?office='+encodeURIComponent(o):''))}
 ${tile('Overdue',n(b.overdue),`${dl(b.overdue_gap,false)} vs cap ${b.overdue_cap} · ${b.overdue_pct}% of backlog`,bar(b.overdue,b.overdue_cap,'rose'),'backlog.html?chip=over'+oq)}
 ${tile('Urgent P1 open',`<span class="urg">${n(U.open_now)}</span>`,`${dl(U.change_vs_7d,false)} vs ≈${U.open_7d_ago_est} 7 days ago · est.`,spark(urgSeries,'red'),'backlog.html?pri=P1'+oq)}
 ${tile('Needs a trade',n(needs),`${Math.round(100*needs/tot)}% of backlog · ${n(slow)} supplier not responding`,bar(needs,J.length,'ink'),'backlog.html?chip=needs'+oq)}
 ${tile('Lodged last 7 days',n(lw),`${dl(lw-pw,false)} vs prior week · portfolio`,spark(W.map(x=>x.lodged)),'')}
 ${tile('Parked',n(V.length+nAr),`Outgoing report <span class="mono">${n(V.length)}</span> · Archived <span class="mono">${n(nAr)}</span> · not in counts`,`<div class="pb split"><i style="width:${pct(V.length,V.length+nAr||1)}%"></i></div>`,'backlog.html?chip=out'+oq)}
 </section>
 <section class="grid g3">
  <div class="panel"><div class="ph"><h2>Offices vs cap</h2><span class="cap">Open · overdue</span></div><div class="pbody">${ob}</div></div>
  <div class="panel"><div class="ph"><h2>Urgent trend</h2><span class="chip est">Estimated</span></div><div class="pbody">${uc}<div class="kv"><span>Cleared, 30 days</span><b class="mono">${U.cleared_30d}</b><span>Cleared / week</span><b class="mono">≈${U.cleared_per_week_30d}</b><span>Net, 30 days</span><b class="mono urg">${sg(U.change_vs_30d)}</b></div></div></div>
  <div class="panel"><div class="ph"><h2>Backlog by category</h2><a class="cap lnk" href="properties.html${o?'?office='+encodeURIComponent(o):''}">Properties ›</a></div><div class="pbody dnw">${donut}<ul class="lg">${PO.map(k=>`<li><i class="c-${k}"></i><span>${PL[k]}</span><b class="mono">${cat[k]||0}</b></li>`).join('')}</ul></div></div>
 </section>
 <section class="grid g21">
  <div class="panel"><div class="ph"><h2>Offices</h2><span class="cap">Against the proposed caps</span></div><div class="tw"><table class="dt"><thead><tr><th>Office</th><th class="r">Open</th><th class="r">Cap</th><th class="r">Overdue</th><th class="r">Cap</th><th class="r">Overdue %</th><th class="r">Urgent</th><th class="r">Needs trade</th><th class="r">Not resp.</th><th>Status</th></tr></thead><tbody>${offRows.map(trow).join('')}</tbody></table></div></div>
  <div class="panel"><div class="ph"><h2>Lodgements</h2><span class="cap">Per week · 12 weeks</span></div><div class="pbody">${wk}<div class="kv"><span>Avg intake / wk (4 months)</span><b class="mono">${B.portfolio.intake_week_4m}</b><span>Median to invoice</span><b class="mono">${B.portfolio.median_completion_days_4m} d</b></div></div></div>
 </section>
 <section class="grid">
  <div class="panel"><div class="ph"><h2>Recently closed urgent jobs</h2><span class="cap">Invoice received</span></div><div class="tw"><table class="dt"><thead><tr><th>Job</th><th>Title</th><th>Office</th><th class="r">Days</th><th>Closed</th></tr></thead><tbody>${wins.map(x=>`<tr><td class="mono">${esc(x.wo)}</td><td class="ell">${esc(x.title)}</td><td>${esc(x.office||'')}</td><td class="mono r">${x.days}</td><td class="mono">${fmtS(x.closed)}</td></tr>`).join('')||'<tr><td colspan="5" class="m">No dated urgent closures yet.</td></tr>'}</tbody></table></div></div>
 </section>
 ${FL_OK?(()=>{const A=ALL.filter(j=>!AR.has(j.id)&&(!o||j.office===o)),c=stageCounts(A),CT=checkTapi().filter(j=>!o||j.office===o),SQ=P.jobs.filter(j=>!j.pm&&(!o||j.office===o));
  return `<section class="grid g21"><div class="panel"><div class="ph"><h2>Jobs by stage</h2><a class="btn btn-primary btn-sm" data-new>New job</a></div><div class="pbody"><ul class="stc">${FILT.map(([k,l])=>`<li><span>${l}</span><b class="num">${n(c[k])}</b></li>`).join('')}</ul><p class="cfgnote">Tapi and Maintenance Mate jobs together · ${esc(UPD.split(' · ')[0])}. Tapi jobs show their Tapi stage until a step is recorded here.</p>${SQ.length?`<p style="margin:8px 0 0;font-size:14px"><b>${SQ.length}</b> job${SQ.length===1?'':'s'} in office shared queues (no property manager matched).</p><ul class="rows">${SQ.slice(0,8).map(j=>flowRow(j,{office:1})).join('')}</ul>`:''}</div></div>
  <div class="panel"><div class="ph"><h2>Check in Tapi · ${CT.length}</h2><span class="cap">Completed here 7+ days, still open in Tapi</span></div><ul class="rows">${CT.map(j=>{const r=FL.get(j.id);return `<li class="row"><div><div class="t"><span class="wo">${esc(j.wo)}</span>${esc(j.title)}</div><div class="p">${esc(j.pm||'')} · completed ${fmtS(r.completed_at.slice(0,10))} by ${esc(who(r.completed_by))} · in Tapi: ${esc(j.stage)}</div></div></li>`}).join('')||'<li class="empty">Nothing to check.</li>'}</ul></div></section>`})():''}
 <p class="cfgnote foot">Urgent trend is estimated from lodged and invoice dates. ${esc(P.weekly.basis)} Caps (average weekly intake × ${B.params.target_turnaround_weeks}-week turnaround; overdue ${Math.round(B.params.overdue_share_of_cap*100)}% of that) are proposals for the owner to confirm.</p>`;
 main.onclick=e=>{if(flowClick(e,()=>R.director()))return;if(e.target.closest('[data-new]'))newJobSheet(()=>R.director())};
},
backlog(){
 const S=BS;const PR={P1:1,P2:2,P3:3,P4:4};
 const jobs=()=>P.jobs.slice().sort((a,b)=>(b.overdue-a.overdue)||(b.days_past_sla-a.days_past_sla)||((PR[a.triage]||9)-(PR[b.triage]||9)));
 const opts=(k,L,l)=>`<select class="input" data-f="${k}" aria-label="${l}"><option value="">${l}: all</option>${L.map(x=>`<option ${S[k]===x?'selected':''}>${esc(x)}</option>`).join('')}</select>`;
 const uniq=f=>[...new Set(ALL.map(f).filter(Boolean))].sort();
 const CH=[['needs','Needs a trade',j=>j.needs_trade],['slow','Supplier not responding',j=>j.not_responding],['over','Overdue',j=>j.overdue]];
 main.innerHTML=`<div class="hero calm"><div class="cap">Backlog · data as at ${fmtS(P.as_of)} 2026</div><h1 class="display" id="bh" style="margin-top:14px;max-width:24ch"></h1></div>
 ${AR_OK?'':'<p class="note" role="status">Archive status could not be loaded, so archived jobs may still appear and archiving is unavailable. Nothing was changed.</p>'}
 <div class="bfil">${opts('office',uniq(j=>j.office),'Office')}${opts('pm',uniq(j=>j.pm),'PM')}${opts('pri',['P1','P2','P3','P4'],'Priority')}${opts('trade',uniq(j=>j.trade),'Trade')}<input class="input" type="search" data-q placeholder="Job number, Tapi ref or address" aria-label="Find a job by Maintenance Mate number, Tapi ref, title or address" value="${esc(S.q||'')}"></div>
 <div class="filters" id="chips"></div>
 <div id="bulkbar" class="bulkbar"></div><p class="muted num" id="bc" style="font-size:13px"></p><ul class="rows" id="bl"></ul>`;
 const qn=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,''),qm=j=>{const q=qn(S.q);if(!q)return true;return [j.wo,j.source_ref,j.title,j.address].some(v=>qn(v).includes(q))||(/^\d+$/.test(q)&&[j.wo,j.source_ref].some(v=>qn(v).replace(/^[a-z]+0*/,'')===q.replace(/^0+/,'')))};
 const filt=j=>qm(j)&&(!S.office||j.office===S.office)&&(!S.pm||j.pm===S.pm)&&(!S.pri||j.triage===S.pri)&&(!S.trade||j.trade===S.trade);
 function list(J){return J.filter(j=>filt(j)&&(!S.chip||CH.find(c=>c[0]===S.chip)[2](j))&&(S.bulk!=='assign'||j.needs_trade))}
 function archRows(){const L=ALL.filter(j=>AR.has(j.id)&&filt(j)).sort((a,b)=>AR.get(b.id).archived_at.localeCompare(AR.get(a.id).archived_at));
  $('#bc').textContent=`${L.length} archived job${L.length===1?'':'s'} · not counted anywhere in the portal`;$('#bulkbar').innerHTML='';
  $('#bl').innerHTML=L.map(j=>{const a=AR.get(j.id);return `<li class="row bk arch"><div><div class="t"><span class="wo">${esc(j.wo)}</span>${esc(j.title)}</div><div class="p">${esc(j.address||'')} · ${esc(j.office||'office unknown')} · ${esc(j.pm||'')}</div><div class="h">${esc(REAS[a.reason]||a.reason)}${a.note?` · “${esc(a.note)}”`:''} · archived by ${esc(who(a.archived_by))}, ${when(a.archived_at)}</div></div><div class="ra"><span class="pill quiet">Archived</span><a class="btn btn-ghost btn-sm" data-rs="${j.id}">Restore</a></div></li>`}).join('')||'<li class="empty">No archived jobs.</li>'}
 function vacRows(){const L=P.vacate.filter(filt).sort((a,b)=>(a.address||'').localeCompare(b.address||'')||a.wo.localeCompare(b.wo)),np=new Set(L.map(j=>j.address)).size;
  $('#bc').textContent=`Outgoing report · ${L.length} job${L.length===1?'':'s'} at ${np} propert${np===1?'y':'ies'} · handled at the outgoing (vacate) inspection report at the end of the tenancy · not in the active counts`;
  $('#bulkbar').innerHTML=VAC_OK?'':'<span class="note">Outgoing report changes are unavailable right now. Nothing was changed.</span>';
  $('#bl').innerHTML=L.map(j=>{const o=VO.get(j.id);return `<li class="row bk"><div><div class="t"><span class="wo">${esc(j.wo)}</span>${esc(j.title)}</div><div class="p">${esc(j.address||'Address unknown')} · ${esc(j.office||'office unknown')}</div><div class="h">${o?`Moved by ${esc(who(o.set_by))}, ${when(o.set_at)}`:`Auto-flagged · matched “${esc(j.vacate_rule||'')}”`} · ${esc(j.triage||'')} · ${Math.round(j.days_open)} days open</div></div><div class="ra"><span class="pill quiet">Moved to outgoing report</span>${VAC_OK?`<a class="btn btn-ghost btn-sm" data-va="${j.id}">Return to active</a>`:''}</div></li>`}).join('')||'<li class="empty">No jobs moved to the outgoing report.</li>'}
 function draw(){const J=jobs(),nAr=ALL.filter(j=>AR.has(j.id)).length;
  const JF=J.filter(filt),sc=[S.office,S.pm,S.pri,S.trade].filter(Boolean);$('#bh').innerHTML=`${n(JF.length)} outstanding jobs${sc.length?` <span class="bh-s">· ${sc.map(esc).join(' · ')}</span>`:''}. <em>Oldest overdue and most urgent first.</em>`;
  $('#chips').innerHTML=CH.map(([k,l,f])=>`<span class="fl ${S.chip===k?'on':''}" data-c="${k}">${l} · <span class="num">${JF.filter(f).length}</span></span>`).join('')+`<span class="fl ${S.bulk==='assign'?'on':''}" data-bulk="assign">Bulk assign</span>`+(AR_OK?`<span class="fl ${S.bulk==='archive'?'on':''}" data-bulk="archive">Bulk archive</span><span class="fl ${S.chip==='arch'?'on':''}" data-c="arch">Archived · <span class="num">${nAr}</span></span>`:'')+`<span class="fl quiet ${S.chip==='out'?'on':''}" data-c="out">Outgoing report · <span class="num">${P.vacate.length}</span></span>`;
  if(S.chip==='arch')return archRows();
  if(S.chip==='out')return vacRows();
  const L=list(J),sel=J.filter(j=>S.sel.has(j.id)),grp=sel[0],ba=S.bulk==='assign';
  $('#bc').textContent=`${L.length} job${L.length===1?'':'s'}${L.length>200?' · showing first 200, use the filters to narrow':''}`;
  $('#bulkbar').innerHTML=ba?`<span>${sel.length?`${sel.length} selected · ${esc(grp.trade)} · ${esc(grp.office)}`:'Select jobs that need a trade. They must share a trade and office.'}</span>${sel.length?`<a class="btn btn-primary btn-sm" data-assign>Assign one contractor</a>`:''}`
   :S.bulk==='archive'?`<span>${sel.length?`${sel.length} selected`:'Select jobs that are no longer required.'}</span><a class="btn btn-text btn-sm" data-selall>Select all shown</a>${sel.length?`<a class="btn btn-primary btn-sm" data-archsel>Archive ${sel.length}</a>`:''}`:'';
  $('#bl').innerHTML=L.slice(0,200).map(j=>{const dis=ba&&grp&&(j.trade!==grp.trade||j.office!==grp.office);const tag=READY.has(j.id)?'<span class="pill ok">Ready to send</span>':j.triage==='P1'?'<span class="pill p1">P1 urgent</span>':j.overdue?'<span class="pill">Overdue</span>':'<span class="pill quiet">Not yet due</span>';
   return `<li class="row bk">${S.bulk?`<input type="checkbox" class="bx" data-s="${j.id}" ${S.sel.has(j.id)?'checked':''} ${dis?'disabled':''} aria-label="Select ${esc(j.wo)}">`:''}<div><div class="t"><span class="wo">${esc(j.wo)}</span>${esc(j.title)}</div><div class="p">${esc(j.address||'')} · ${esc(j.office||'office unknown')} · ${esc(j.pm||'Office shared queue')}</div>${FL_OK?`<div class="fls">${statusLine(j)}</div>`:''}<div class="h">${esc(j.trade==='Other'?'Trade unclear':j.trade)} · ${esc(j.triage||'')} · ${Math.round(j.days_open)} days open${j.overdue?` · ${Math.round(j.days_past_sla)} days past target`:''} · ${j.supplier?`${esc(j.supplier)}, ${Math.round(j.days_since_action||0)} days since action`:'<b>No contractor</b>'}</div>${elHist('job',j.id)}</div><div class="ra">${tag}${S.bulk?'':`<span class="rb"><a class="btn btn-ghost btn-sm" data-ft="${j.id}">Find a trade</a>${VAC_OK&&j.triage!=='P1'?`<a class="btn btn-text btn-sm" data-vv="${j.id}" aria-label="Move ${esc(j.wo)} to outgoing report">Move to outgoing report</a>`:''}${AR_OK?`<a class="btn btn-text btn-sm" data-ar="${j.id}" aria-label="Archive ${esc(j.wo)}">Archive</a>`:''}</span>`}</div></li>`}).join('')||'<li class="empty">No jobs match these filters.</li>';}
 main.onchange=e=>{const f=e.target.dataset.f;if(f){S[f]=e.target.value;draw()}const s=e.target.dataset.s;if(s){e.target.checked?S.sel.add(s):S.sel.delete(s);draw()}};
 main.onclick=e=>{const c=e.target.closest('[data-c]');if(c){S.chip=S.chip===c.dataset.c?'':c.dataset.c;if(S.chip==='arch'||S.chip==='out'){S.bulk=false;S.sel.clear()}draw()}
  const bk=e.target.closest('[data-bulk]');if(bk){const m=bk.dataset.bulk;S.bulk=S.bulk===m?false:m;S.sel.clear();if(S.bulk==='assign')S.chip='needs';if(S.bulk&&(S.chip==='arch'||S.chip==='out'))S.chip='';draw()}
  const f=e.target.closest('[data-ft]');if(f)findTrade(JB[f.dataset.ft]);
  const ar=e.target.closest('[data-ar]');if(ar)archiveSheet([JB[ar.dataset.ar]],()=>R.backlog());
  const vv=e.target.closest('[data-vv]');if(vv)moveVac([vv.dataset.vv],'vacate',()=>R.backlog());
  const va=e.target.closest('[data-va]');if(va)moveVac(va.dataset.va.split(','),'active',()=>R.backlog());
  if(e.target.closest('[data-vacsel]')){const ids=[...S.sel];moveVac(ids,'vacate',()=>{S.sel.clear();S.bulk=false;R.backlog()})}
  const rs=e.target.closest('[data-rs]');if(rs)restore([rs.dataset.rs],()=>R.backlog());
  if(e.target.closest('[data-selall]')){list(jobs()).slice(0,200).forEach(j=>S.sel.add(j.id));draw()}
  if(e.target.closest('[data-archsel]')){const js=jobs().filter(j=>S.sel.has(j.id));archiveSheet(js,()=>{S.sel.clear();S.bulk=false;R.backlog()})}
  if(e.target.closest('[data-assign]')){const js=jobs().filter(j=>S.sel.has(j.id));findTrade(js[0],js)}};
 main.addEventListener('input',e=>{if(e.target.matches('[data-q]')){S.q=e.target.value;draw()}});
 R.backlog=()=>{[...S.sel].forEach(id=>(AR.has(id)||isVac(JB[id]))&&S.sel.delete(id));draw()};
 draw();
},
pm(){
 const pms=[...new Set(P.jobs.map(j=>j.pm).filter(Boolean))].sort();
 const pm=me, js=P.jobs.filter(j=>j.pm===pm), urg=js.filter(j=>j.triage==='P1').sort((a,b)=>b.days_open-a.days_open);
 const rec=js.filter(j=>j.reconfirm&&j.triage!=='P1'), rest=js.filter(j=>j.triage!=='P1'&&!j.reconfirm).sort((a,b)=>(a.next_due||'').localeCompare(b.next_due||'')||b.days_past_sla-a.days_past_sla);
 const ok=js.filter(j=>!j.overdue).length, uo=urg.filter(j=>j.overdue).length, office=js[0]?.office||'';
 const hr=new Date().getHours(), gr=hr<12?'Good morning':hr<18?'Good afternoon':'Good evening';
 main.innerHTML=`<div class="hero"><div class="cap">My portfolio · ${esc(office)} <select class="input" style="display:inline-block;width:auto;margin-left:12px;padding:4px 10px" aria-label="Property manager">${pms.map(p=>`<option ${p===pm?'selected':''}>${esc(p)}</option>`).join('')}</select></div>
 <h1 class="display" style="margin-top:18px;max-width:20ch">${gr}, ${esc(pm.split(' ')[0])}. Your portfolio has ${js.length} open maintenance jobs, <em>and ${urg.length} urgent ones to clear first.</em></h1>
 <p class="lede">${js.filter(j=>j.next_party==='supplier').length} are waiting on a supplier and ${js.filter(j=>j.next_party==='owner').length} on an owner. ${rec.length} need you to reconfirm the tenant and the need.</p>
 <div class="act"><a class="btn btn-primary" href="#urgent">Clear the urgent ${urg.length} ${ICON.arrow}</a>${DRAFT}</div>
 <div class="cap" style="margin-top:40px">Backlog focus</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:24px;max-width:640px;margin-top:12px">
 <div><div class="prog"><i style="width:${urg.length?Math.round(100*(urg.length-uo)/urg.length):100}%"></i></div><div class="muted num" style="font-size:13px;margin-top:8px">Urgent on target · ${urg.length-uo} of ${urg.length}</div></div>
 <div><div class="prog"><i style="width:${Math.round(100*ok/(js.length||1))}%"></i></div><div class="muted num" style="font-size:13px;margin-top:8px">Backlog on target · ${ok} of ${js.length}</div></div></div></div>
 <section id="urgent"><div class="sh"><h2 class="display">Urgent (P1)</h2><span class="cap">${urg.length} jobs</span></div><ul class="rows">${urg.map(j=>row(j)).join('')||'<li class="empty">No urgent jobs.</li>'}</ul></section>
 ${office?urgentPanel(office):''}
 <section><div class="sh"><h2 class="display">Reconfirm before spending</h2><span class="cap">${rec.length} jobs</span></div><ul class="rows">${rec.map(j=>row(j,`<div class="h" style="margin-top:6px">${esc(j.reconfirm_reasons||'')}</div><div style="display:flex;gap:18px;margin-top:6px"><label class="chk"><input type="checkbox"> Tenant still current</label><label class="chk"><input type="checkbox"> Work still required</label></div>`)).join('')}</ul></section>
 <section><div class="sh"><h2 class="display">Backlog by next due</h2><span class="cap">${rest.length} jobs</span></div><ul class="rows">${rest.map(j=>row(j)).join('')}</ul></section>`;
 $('select',main).onchange=e=>location.search='?pm='+encodeURIComponent(e.target.value);
 swipe(main);
},
directory(){
 const S=P.suppliers_dir, offs=S.offices; let off=Q.get('office')||offs[0], q='';const WANT=Q.get('batch');
 const cnt=k=>Object.values(S[k].by_office).reduce((t,o)=>t+Object.values(o).reduce((u,L)=>u+L.length,0),0);
 const ph=t=>`<span class="ph">${t}</span>`;
 const hist=name=>{const H=S.preferred.history[name]||[];return H.length?`<ul style="padding-left:18px;font-size:14px;max-height:260px;overflow:auto">${H.map(c=>`<li>${esc(c.wo)} · ${esc(c.title)} · ${esc(c.property||'')} · ${esc(c.office||'office unknown')} · ${esc(c.date_basis)} ${fmtS(c.date)} ${c.date.slice(0,4)}</li>`).join('')}</ul>`:'<p class="muted">No completed jobs on file.</p>'};
 const match=x=>!q||JSON.stringify(x).toLowerCase().includes(q);
 function group(k,render){const by=S[k].by_office[off]||{};const T=Object.entries(by).map(([t,L])=>[t,L.filter(match)]).filter(([,L])=>L.length).sort((a,b)=>a[0].localeCompare(b[0]));
  return T.length?T.map(([t,L])=>`<details class="surface" style="padding:16px 22px;margin-top:12px" ${q?'open':''}><summary style="cursor:pointer"><span class="cap">${esc(t)}</span> <span class="muted num" style="font-size:13px">· ${L.length}</span></summary><ul class="rows" style="margin-top:8px">${L.map(render).join('')}</ul></details>`).join(''):`<div class="empty surface" style="padding:24px;margin-top:12px"><p class="muted">None for ${esc(off)}${q?' matching this search':''}.</p></div>`}
 const prefRow=x=>`<li class="srow"><span class="gb n" aria-hidden="true">${esc(x.name[0])}</span><div><strong style="font-weight:500">${esc(x.name)}</strong><div class="meta2"><span>${x.completed_in_office} completed in ${esc(off)} · ${x.jobs_in_office} jobs booked here</span></div><details style="margin-top:6px"><summary class="muted" style="cursor:pointer;font-size:13px">Completed work</summary>${hist(x.name)}</details></div></li>`;
 const sugRow=x=>`<li class="srow"><span class="gb n" aria-hidden="true">${esc(x.name[0])}</span><div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><strong style="font-weight:500">${esc(x.name)}</strong><span class="tagu">Not yet used</span></div><div class="meta2"><span>${esc(x.trade||'')}</span></div><div class="meta2"><span>${esc(x.location||x.area||'')}</span></div><div class="meta2"><span>${x.phone?esc(x.phone):ph('phone not on file')} · ${x.email?esc(x.email):ph('email not on file')}${x.website?` · ${esc(x.website)}`:''}</span></div></div></li>`;
 function draw(){main.querySelectorAll('[data-o]').forEach(e=>e.classList.toggle('on',e.dataset.o===off));
  const nw=MT.new_suppliers.filter(x=>(x.regions||'').includes(off)&&match(x)),bt=MT.batches.filter(b=>b.office===off&&match(b));
  $('#mnew').innerHTML=`<details class="surface" style="padding:16px 22px;margin-top:12px" ${q?'open':''}><summary style="cursor:pointer"><span class="cap">New suppliers found by Matt @ Maintenance Mate</span> <span class="muted num" style="font-size:13px">· ${nw.length} in ${esc(off)}</span></summary><ul class="rows" style="margin-top:8px">${nw.map(x=>`<li class="srow"><span class="gb n" aria-hidden="true">${esc(x.name[0])}</span><div><div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><strong style="font-weight:500">${esc(x.name)}</strong>${reachBadge(x.name)}<span class="tagu mt">Found by Matt @ Maintenance Mate</span></div><div class="meta2"><span>${esc(x.trade||'')} · ${esc(x.regions||'')}${x.base?` · based ${esc(x.base)}`:''}</span></div><div class="meta2"><span>${x.phone?esc(x.phone):ph('phone not on file')}${x.website?` · ${esc(x.website)}`:''}${x.abn?` · ABN ${esc(x.abn)}`:''}</span></div><div class="bds">${licB(x)}</div>${ctBlock(x.name)}<div class="meta2"><span class="muted">Not contacted yet.</span></div></div></li>`).join('')||'<li class="empty">None for this office.</li>'}</ul></details>`;
  $('#mbat').innerHTML=`<div class="cap" style="margin-top:20px">Batches by Matt @ Maintenance Mate · ${bt.length} in ${esc(off)}</div>`+bt.map(b=>`<details class="surface bat" id="b-${b.id}" style="padding:16px 22px;margin-top:12px" ${(q||WANT===b.id)?'open':''}><summary style="cursor:pointer"><strong style="font-weight:500">${esc(b.id)} · ${esc(b.trade)}</strong> <span class="muted" style="font-size:13px">· ${b.jobs} job${b.jobs===1?'':'s'} · ${esc(b.suburbs)} · ${esc((b.priority||'').replace(/\s*\(.*$/,''))}</span></summary><ul class="rows" style="margin-top:8px">${b.options.map((o,i)=>[o,i]).sort((x,y)=>reachTier(x[0].name)-reachTier(y[0].name)||x[1]-y[1]).map(([o,i])=>`<li class="row"><div><div class="t">Option ${o.rank} · ${esc(o.name)} ${mark(b,o.name)} ${reachBadge(o.name)}</div><div class="h">${optMeta(o)}</div><div class="bds">${licB(o)}${farB(o)}</div>${ctBlock(o.name)}</div><div class="bact"><a class="btn btn-ghost btn-sm" data-bw="${b.id}|${i}|wo">Batch email</a><a class="btn btn-text btn-sm" data-bw="${b.id}|${i}|quote">Quote request</a></div></li>`).join('')}</ul><p class="muted" style="font-size:13px;margin:8px 0 0">Jobs: ${b.wos.map(esc).join(', ')}</p>${elHist('batch',b.id)}</details>`).join('');
  $('#pref').innerHTML=group('preferred',prefRow);$('#sug').innerHTML=group('suggested',sugRow)}
 main.innerHTML=`<div class="hero" style="padding-bottom:40px"><div class="cap">Contractors · by office and trade</div><h1 class="display" style="margin-top:18px;max-width:20ch">${n(cnt('preferred'))} contractors used before, <em>and ${n(cnt('suggested'))} suggestions to try.</em></h1><p class="lede">Preferred contractors have been booked with Platinum before. Suggested contractors have not been used yet. Licence, insurance and rates are not on file for either.</p>${PMS?'':'<p style="margin-top:12px"><a class="btn btn-ghost btn-sm" href="reach.html">Supplier reach coverage, join forms and opt-outs</a></p>'}</div>
 <div class="search"><input class="input" placeholder="Search by business, trade or suburb" aria-label="Search contractors"></div>
 <div class="filters">${offs.map(o=>`<span class="fl" data-o="${o}">${o}</span>`).join('')}</div>
 <section style="margin-top:28px" id="mattsec"><div class="sh"><h2 class="display" style="font-size:1.9rem">Supplier shortlist by Matt @ Maintenance Mate</h2><span class="cap">${MT.new_suppliers.length} new suppliers · ${MT.batches.length} batches</span></div><p class="cfgnote">${esc(MT.note)} Suppliers marked "Check licence before booking" have not been confirmed on the WA licence register.</p><div id="mnew"></div><div id="mbat"></div></section>
 <section style="margin-top:28px"><div class="sh"><h2 class="display" style="font-size:1.9rem">Preferred contractors</h2><span class="cap">Booked with Platinum before</span></div><p class="cfgnote">${esc(S.preferred.basis)}</p><div id="pref"></div></section>
 <section><div class="sh"><h2 class="display" style="font-size:1.9rem">Suggested contractors</h2><span class="cap">Not yet used</span></div><p class="cfgnote">${esc(S.suggested.basis)}</p><div id="sug"></div></section>`;
 main.querySelectorAll('[data-o]').forEach(e=>e.onclick=()=>{off=e.dataset.o;draw()});
 main.addEventListener('click',e=>{const a=e.target.closest('[data-bw]');if(!a)return;const [id,i,k]=a.dataset.bw.split('|'),b=MT.batches.find(x=>x.id===id);batchSheet(b,b.options[+i],k)});
 $('.search input').oninput=e=>{q=e.target.value.toLowerCase();draw()};
 draw();if(WANT)setTimeout(()=>document.getElementById('b-'+WANT)?.scrollIntoView({block:'start'}),50);
},
pm(){
 const L=pmList();if(!VA||!L.find(x=>x.name===VA))VA=(L[0]||{}).name||'';const who=L.find(x=>x.name===VA)||{name:VA,office:''};
 const PR={P1:1,P2:2,P3:3,P4:4};let qf='',sf='';
 const ord=(a,b)=>(a.triage==='P1'?0:1)-(b.triage==='P1'?0:1)||(b.days_past_sla||0)-(a.days_past_sla||0)||(PR[a.triage]||9)-(PR[b.triage]||9);
 const mine=()=>P.jobs.filter(j=>j.pm===VA).sort(ord), closedM=()=>P.closed.filter(j=>j.pm===VA);
 const offQ=()=>P.jobs.filter(j=>!j.pm&&j.office&&j.office===(PMS?ME_OFF:who.office));
 const tile=(lab,val,sub,k)=>`<a class="tile ${qf===k?'on':''}" href="#" data-q="${k}"><div class="tl-h"><span class="cap">${lab}</span></div><div class="tl-n mono">${val}</div><div class="tl-s">${sub}</div></a>`;
 const QF={all:()=>true,over:j=>j.overdue,urg:j=>j.triage==='P1',needs:j=>j.needs_trade};
 const outN=P.vacate.filter(j=>j.pm===VA).length;
 function nextBatch(J){const w=new Set(J.map(j=>j.wo));const B=MT.batches.filter(b=>b.wos.some(x=>w.has(x)));return B[0]}
 function draw(){const J=mine(),CJ=closedM(),b=nextBatch(J),SQ=offQ(),cn=stageCounts(J.concat(CJ)),sfF=sf&&FILT.find(x=>x[0]===sf);
  const S=(sfF?J.concat(CJ).filter(j=>sfF[2](stageOf(j))):J).filter(QF[qf||'all']);
  main.innerHTML=`${PMS?'':`<div class="vabar" role="status"><span>Viewing as <b>${esc(VA)}</b>${who.office?` · ${esc(who.office)}`:''}</span><a href="director.html" data-back>Back to admin</a></div>`}
  <div class="hero calm"><div class="cap">PM workspace · ${esc(VA)}</div><h1 class="display" style="margin-top:14px;max-width:26ch">${n(J.length)} open jobs. <em>Urgent first, then most overdue.</em></h1>${FL_OK?'<div class="act"><a class="btn btn-primary" data-new>New job</a></div>':''}</div>
  <section class="tiles">${tile('Open',n(J.length),'active jobs allocated','')}${tile('Overdue',n(J.filter(QF.over).length),'past target date','over')}${tile('Urgent',n(J.filter(QF.urg).length),'P1 safety or essential','urg')}${tile('Needs a trade',n(J.filter(QF.needs).length),'no contractor on the job','needs')}</section>
  ${SQ.length?`<section class="panel" style="margin-top:18px"><div class="ph"><h2>Office shared queue · ${SQ.length}</h2><span class="cap">No property manager matched</span></div><ul class="rows">${SQ.map(j=>flowRow(j)).join('')}</ul></section>`:''}
  <div class="sh" style="margin-top:22px"><h2 class="display" style="font-size:1.6rem">Jobs${sfF?` · ${sfF[1]}`:''}${qf?` · ${({over:'Overdue',urg:'Urgent',needs:'Needs a trade'})[qf]}`:''}</h2><a class="btn btn-text btn-sm" href="backlog.html?pm=${encodeURIComponent(VA)}&chip=out">Outgoing report · ${outN}</a></div>
  ${FL_OK?`<div class="sfil" role="group" aria-label="Stage">${[['','All open',J.length],...FILT.map(([k,l])=>[k,l,cn[k]])].map(([k,l,c])=>`<button type="button" class="chip ${sf===k?'on':''}" data-sf="${k}" aria-pressed="${sf===k}">${l} <b class="num">${c}</b></button>`).join('')}</div>`:'<p class="cfgnote">Job steps are unavailable right now; showing the Tapi list only.</p>'}
  <p class="muted num" style="font-size:13px">${S.length} job${S.length===1?'':'s'}${S.length>150?' · showing first 150':''} · ${esc(UPD.split(' · ')[0])}</p>
  <ul class="rows">${S.slice(0,150).map(j=>flowRow(j)).join('')||'<li class="empty">No jobs in this view.</li>'}</ul>
  ${b?`<details class="panel mbx" style="margin-top:22px"><summary class="ph"><span class="cap">Next batch from Matt @ Maintenance Mate's plan · ${esc(b.id)} · ${esc(b.trade)} · ${b.jobs} job${b.jobs===1?'':'s'}</span></summary><div class="pbody"><p class="muted" style="margin:0 0 8px;font-size:13px">${esc(b.suburbs)} · ${b.wos.map(esc).join(', ')}</p><ul class="rows">${b.options.map((o,i)=>[o,i]).sort((x,y)=>reachTier(x[0].name)-reachTier(y[0].name)||x[1]-y[1]).map(([o,i])=>`<li class="row"><div><div class="t">Option ${o.rank} · ${esc(o.name)} ${mark(b,o.name)} ${reachBadge(o.name)}</div><div class="h">${optMeta(o)}</div><div class="bds">${licB(o)}${farB(o)}</div>${ctBlock(o.name)}</div><div class="bact"><a class="btn btn-ghost btn-sm" data-bw="${i}|wo">Batch email</a><a class="btn btn-text btn-sm" data-bw="${i}|quote">Quote request</a></div></li>`).join('')}</ul>${elHist('batch',b.id)}<p class="cfgnote" style="margin:8px 0 0">${esc(MT.note)} <a href="directory.html?batch=${esc(b.id)}&office=${encodeURIComponent(b.office)}">Open batch ›</a></p></div></details>`:''}`;
  main.onclick=e=>{if(flowClick(e,draw))return;const t=e.target.closest('[data-q]');if(t){e.preventDefault();qf=qf===t.dataset.q?'':t.dataset.q;return draw()}
   const c=e.target.closest('[data-sf]');if(c){sf=c.dataset.sf;return draw()}
   if(e.target.closest('[data-new]'))return newJobSheet(draw);
   if(e.target.closest('[data-back]'))localStorage.removeItem(VA_K);
   const bw=e.target.closest('[data-bw]');if(bw){const [i,k]=bw.dataset.bw.split('|');batchSheet(b,b.options[+i],k)}}}
 draw();
},
properties(){
 const X=window.PROPS,L=X.labels,O=X.order;let off=Q.get('office')||'',q='',lim=60;
 const arWo=new Set([...AR.values()].map(a=>MMREF(a.wo)).filter(Boolean)),vWo=new Set(P.vacate.map(j=>j.wo));
 X.properties.forEach(p=>{p.openNow=p.jobs.filter(j=>j.open&&!arWo.has(j.wo)).length});
 const offs=[...new Set(X.properties.map(p=>p.office).filter(Boolean))].sort();
 const bar=c=>{const t=O.reduce((s,k)=>s+c[k],0)||1;return `<div class="cbar" aria-hidden="true">${O.map(k=>c[k]?`<i class="c-${k}" style="width:${100*c[k]/t}%"></i>`:'').join('')}</div>`};
 const legend=`<div class="clegend">${O.map(k=>`<span><i class="c-${k}"></i>${esc(L[k])}</span>`).join('')}</div>`;
 main.innerHTML=`<div class="hero calm"><div class="cap">Properties · all Tapi reports · data as at ${fmtS(X.as_of)} 2026</div><h1 class="display" style="margin-top:14px;max-width:24ch">${n(X.properties.length)} properties, <em>ranked by how often they need maintenance.</em></h1></div>
 <div class="bfil"><select class="input" data-po aria-label="Office"><option value="">Office: all</option>${offs.map(o=>`<option ${o===off?'selected':''}>${esc(o)}</option>`).join('')}</select><input class="input" data-pq placeholder="Search address, suburb or job number" aria-label="Search properties"></div>
 ${legend}<p class="muted num" id="pc" style="font-size:13px"></p><ul class="rows" id="pl"></ul><div id="pm"></div>
 <details class="surface" style="padding:16px 22px;margin-top:28px"><summary class="cap" style="cursor:pointer">How reports are grouped</summary><p class="cfgnote">${esc(X.note)} ${esc(X.basis)}</p>${O.filter(k=>X.rules[k]).map(k=>`<p class="cfgnote"><b>${esc(L[k])}:</b> ${X.rules[k].map(esc).join(', ')}</p>`).join('')}<p class="cfgnote">Rules are in config.json (property_categories; the outgoing report rules sit under "vacate").</p></details>`;
 function draw(){const F=X.properties.filter(p=>(!off||p.office===off)&&(!q||(p.address||'').toLowerCase().includes(q)||(q.length>3&&(p.jobs||[]).some(j=>[j.wo,j.source_ref].some(v=>String(v||'').toLowerCase()===q)))));
  $('#pc').textContent=`${F.length} propert${F.length===1?'y':'ies'} · most reports first`;
  $('#pl').innerHTML=F.slice(0,lim).map(p=>`<li class="prow"><details><summary><span class="rk num">${p.rank}</span><div class="pmain"><div class="t">${esc(p.address)}</div><div class="p">${esc(p.office||'Office unknown')}</div>${bar(p.cats)}<div class="h">${O.filter(k=>p.cats[k]).map(k=>`${esc(L[k])} ${p.cats[k]}`).join(' · ')}</div></div><div class="pnums"><div><b class="num">${p.total}</b><span class="cap">reports</span></div><div><b class="num">${p.openNow}</b><span class="cap">open</span></div></div></summary>
   <ul class="pjobs">${p.jobs.map(j=>`<li><span class="wo">${esc(j.wo)}</span><span class="pjt">${esc(j.title)}</span><span class="pjm">${fmtS(j.date)} ${j.date.slice(0,4)} · ${esc(L[j.cat])} · ${j.open&&!arWo.has(j.wo)?(vWo.has(j.wo)?'<b>Open · outgoing report</b>':'<b>Open</b>'):arWo.has(j.wo)?'Archived':esc(j.state)}</span></li>`).join('')}</ul></details></li>`).join('')||'<li class="empty">No properties match.</li>';
  $('#pm').innerHTML=F.length>lim?`<a class="btn btn-ghost" data-more style="margin-top:16px">Show more (${F.length-lim} left)</a>`:''}
 main.onchange=e=>{if(e.target.matches('[data-po]')){off=e.target.value;lim=60;draw()}};
 main.oninput=e=>{if(e.target.matches('[data-pq]')){q=e.target.value.trim().toLowerCase();lim=60;draw()}};
 main.onclick=e=>{if(e.target.closest('[data-more]')){lim+=60;draw()}};
 draw();
},
comms(){
 const sup=Q.get('sup');
 const q={Suppliers:P.jobs.filter(j=>j.next_party==='supplier'&&j.supplier&&(!sup||j.supplier===sup)),Tenants:P.jobs.filter(j=>j.tenant_update_due),Owners:P.jobs.filter(j=>j.next_party==='owner')};
 Object.values(q).forEach(a=>a.sort((x,y)=>(x.next_due||'').localeCompare(y.next_due||'')||y.days_past_sla-x.days_past_sla));
 let tab='Suppliers',i=0;const K={Suppliers:'supplier',Tenants:'tenant',Owners:'owner'};
 main.innerHTML=`<div class="hero" style="padding-bottom:40px"><div class="cap">Automation & comms</div><h1 class="display" style="margin-top:18px;max-width:22ch">${q.Suppliers.length} supplier chasers, ${q.Tenants.length} tenant updates and ${q.Owners.length} owner updates <em>are ready for review.</em></h1><div class="act"><span class="note">Nothing sends without approval</span></div></div><div class="split"><aside><div class="tabs">${Object.keys(q).map(t=>`<a data-t="${t}">${t} · ${q[t].length}</a>`).join('')}</div><ul class="q" style="margin-top:20px"></ul></aside><div><article class="letter"></article><div style="display:flex;gap:12px;margin-top:28px;flex-wrap:wrap;align-items:center"><a class="btn btn-primary" id="ap">Approve draft</a><a class="btn btn-text" id="sk">Skip</a><span class="muted num" id="ct" style="margin-left:auto;font-size:13px"></span></div></div></div>`;
 function draw(){const L=q[tab];main.querySelectorAll('[data-t]').forEach(a=>a.classList.toggle('on',a.dataset.t===tab));
  $('.q',main).innerHTML=L.slice(0,40).map((j,k)=>`<li class="${k===i?'on':''}" data-k="${k}"><div style="display:flex;justify-content:space-between;gap:8px"><strong style="font-weight:500">${esc(tab==='Suppliers'?j.supplier:tab==='Tenants'?'Tenant · '+(j.address||''):'Owner · '+(j.address||''))}</strong><span class="s">due ${fmtS(j.next_due)}</span></div><div style="font-size:14px">${esc(j.wo)} · ${esc(j.title)}</div><div class="s">${esc(j.next_action||'')}</div></li>`).join('');
  const j=L[i];{const A=$('.letter',main);A.innerHTML=j?letter(K[tab],j):'<div class="empty">Queue is empty.</div>';if(j){const t=K[tab];Object.assign(A.dataset,{rk:'job',ri:j.id,wo:j.wo,rc:t==='supplier'?j.supplier:t==='tenant'?'Tenant':'Owner',tp:t+(t==='supplier'?'_chaser':'_update')})}else delete A.dataset.rk;const kk=A.previousElementSibling;if(kk?.classList.contains('cpk')){$('.mks',kk)?.remove();kitHist(kk,A)}else kit(A)}$('#ct').textContent=`${i+1} of ${L.length} · highlighted text fills from the job record · dates from next due`;$('#ap').textContent='Approve draft'}
 function openComms(){const L=q[tab],j=L[i];if(!j)return;openM(sheet(`${tab.replace(/s$/,'')} draft · ${i+1} of ${L.length}`,`<article class="letter"${ctxA('job',j.id,j.wo,K[tab]==='supplier'?j.supplier:K[tab]==='tenant'?'Tenant':'Owner',K[tab]+(K[tab]==='supplier'?'_chaser':'_update'))}>${letter(K[tab],j)}</article><p class="muted" style="font-size:13px;margin-top:12px">Highlighted text fills from the job record. Dates come from the job's next due date.</p>`,`<a class="btn btn-primary" data-approve>Approve draft</a><a class="btn btn-ghost" data-edit>Edit</a><a class="btn btn-text" data-next>Skip ›</a>`));$('[data-next]',M).onclick=()=>{i=Math.min(i+1,L.length-1);draw();openComms()}}
 main.onclick=e=>{const t=e.target.closest('[data-t]'),k=e.target.closest('[data-k]');if(t){tab=t.dataset.t;i=0;draw()}if(k){i=+k.dataset.k;draw();if(matchMedia('(max-width:640px)').matches)openComms()}if(e.target.id==='sk'){i=Math.min(i+1,q[tab].length-1);draw()}if(e.target.id==='ap'){e.target.textContent='Marked approved · sending not connected'}};
 draw();
}};
function pmList(){const m={};P.jobs.forEach(j=>{if(!j.pm)return;const x=m[j.pm]||(m[j.pm]={name:j.pm,open:0,offs:{}});x.open++;x.offs[j.office||'Office unknown']=(x.offs[j.office||'Office unknown']||0)+1});
 ALL.forEach(j=>{if(j.pm&&!m[j.pm])m[j.pm]={name:j.pm,open:0,offs:{[j.office||'Office unknown']:1}}});
 return Object.values(m).map(x=>({...x,office:Object.entries(x.offs).sort((a,b)=>b[1]-a[1])[0][0]})).sort((a,b)=>b.open-a.open||a.name.localeCompare(b.name))}
function signedIn(){const nm=PMS?ME.person:ME.via==='pin'?'Admin (PIN)':(ME.person||'Admin');if(!ME.via)return;
 if(PMS){document.body.classList.add('pmsess');document.querySelectorAll('.side nav a,.mdrawer .panel>a,.tabbar a').forEach(a=>{const h=a.getAttribute('href').split('?')[0];if(!['pm.html','directory.html'].includes(h))a.remove()});
  const ws=`<a href="pm.html?pm=${encodeURIComponent(ME.person)}" class="${page==='pm'?'on':''}">${nico('M4 4h16v16H4zM4 9h16M9 9v11')}<span>My workspace</span></a>`;
  document.querySelectorAll('.side nav,.tabbar').forEach(n=>n.insertAdjacentHTML('afterbegin',ws));$('.mdrawer .dr-x').insertAdjacentHTML('afterend',ws);
  document.querySelectorAll('a.mark').forEach(a=>a.href='pm.html?pm='+encodeURIComponent(ME.person))}
 const m=$('.top .me');if(m)m.innerHTML=`<span class="sio">Signed in as <b>${esc(nm)}</b> · <a href="/logout">Sign out</a></span><div class="av" aria-hidden="true">${esc(nm.replace(/\(.*\)/,'').trim().split(' ').map(w=>w[0]).join('').slice(0,2))}</div>`;
 $('.mdrawer .panel').insertAdjacentHTML('beforeend',`<p class="sio-d">Signed in as <b>${esc(nm)}</b> · <a href="/logout">Sign out</a></p>`)}
function viewAs(){fetch('/api/me',{credentials:'same-origin'}).then(r=>r.ok?r.json():{}).catch(()=>({})).then(u=>{if(!u.admin)return;const L=pmList();
 document.querySelectorAll('.vas').forEach(box=>{box.hidden=false;box.innerHTML=`<div class="cap">View as</div><input class="vq" type="search" placeholder="Search people" aria-label="Search people to view as"><ul class="val">${L.map(x=>`<li><a href="pm.html?pm=${encodeURIComponent(x.name)}" data-va-n="${esc(x.name)}" class="${page==='pm'&&x.name===VA?'on':''}"><span class="van">${esc(x.name)}</span><span class="vam">${x.open} open · ${esc(x.office)}</span></a></li>`).join('')}</ul>`;
  $('.vq',box).oninput=e=>{const q=e.target.value.toLowerCase();box.querySelectorAll('li').forEach(li=>li.hidden=!li.textContent.toLowerCase().includes(q))}});
 document.addEventListener('click',e=>{const a=e.target.closest('[data-va-n]');if(a)localStorage.setItem(VA_K,a.dataset.vaN)})})}
const meP=fetch('/api/me',{credentials:'same-origin'}).then(r=>r.ok?r.json():{}).catch(()=>({}));
Promise.all([loadArchive(),meP]).then(([,u])=>{ME=u||{};PMS=ME.via==='pm';signedIn();if(!PMS)viewAs();R[page]()});
})();
