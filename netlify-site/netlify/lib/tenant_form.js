// Public tenant request form: markup, validation, and the plain-language job it creates.
// Pure functions, no database access. jobs_api.js owns routing, rate limits, photos and storage.
// The categories come from tenant_categories.js, generated from design/maintenance-mate/tenant-form-categories.json.
import { CATEGORIES, EMERGENCY } from "./tenant_categories.js";

export const STATES = ["WA", "NSW", "VIC", "QLD", "SA", "TAS", "ACT", "NT"];
const BEST = ["Any time", "Mornings", "Afternoons", "After 5pm"];
const ENTRY = ["Ring me first", "OK to enter", "Please don't enter"];
const PETS = ["No pets", "Dog", "Cat", "Other pets"];
const STARTED = ["Today", "This week", "A few weeks ago", "Longer than that"];
const REPEAT = ["First time", "Yes, it's come back"];
const URG = { routine: "Can wait a few days", urgent: "Urgent", emergency: "Emergency" };

const flagHint = { g: "gas", e: "power", w: "water", s: "security" };

export function parseSubmission(f, t) {
  const g = (k, n) => t(f.get(k), n);
  const pick = (k, list, d) => { const x = g(k, 60); return list.includes(x) ? x : d; };
  const v = {
    street: g("street", 120), unit: g("unit", 20), suburb: g("suburb", 60), state: pick("state", STATES, "WA"),
    postcode: (g("postcode", 8) || "").replace(/\s/g, "") || null,
    tenant_name: g("tenant_name", 120), mobile: g("mobile", 30), email: g("email", 120),
    best: pick("best", BEST, BEST[0]), entry: pick("entry", ENTRY, ENTRY[0]), pets: pick("pets", PETS, PETS[0]),
    cat: null, sub: null, description: g("description", 1500), location: g("location", 120),
    started: pick("started", STARTED, STARTED[0]), repeat: pick("repeat", REPEAT, REPEAT[0]),
    urgency: pick("urgency", Object.keys(URG), "routine"), website: g("website", 200),
  };
  const c = CATEGORIES.find((x) => x.k === g("cat", 30));
  if (c) { v.cat = c.k; const s = c.subs.find((x) => x[0] === g("sub_" + c.k, 80)); if (s) v.sub = s[0]; }
  const errs = [];
  if (!v.street || !v.suburb) errs.push("Tell me the street address and suburb so I can find the property.");
  if (v.postcode && !/^\d{4}$/.test(v.postcode)) errs.push("Postcodes are four digits. Check yours and try again.");
  if (!v.tenant_name) errs.push("Add your name so your property manager knows who to call.");
  if (!v.mobile && !v.email) errs.push("Add a mobile number or an email so they can reach you.");
  else {
    if (v.mobile && v.mobile.replace(/\D/g, "").length < 8) errs.push("That mobile number looks short. Check it and try again.");
    if (v.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) errs.push("That email doesn't look right. Check it and try again.");
  }
  if (!v.cat) errs.push("Pick what's wrong and I'll help from there.");
  if (!v.description) errs.push("Tell me a bit more about the problem.");
  return { v, errs };
}

// Turns a valid submission into the fields the existing job flow already understands.
export function buildJob(v) {
  const c = CATEGORIES.find((x) => x.k === v.cat), s = v.sub ? c.subs.find((x) => x[0] === v.sub) : null, flag = s ? s[1] : "";
  const urgency = flag ? "emergency" : v.urgency;
  const hints = [...new Set([s && s[2], flagHint[flag]].filter(Boolean))];
  const address = (v.unit ? v.unit + "/" : "") + v.street + ", " + v.suburb;
  const lines = [v.description, "", "Reported on the tenant form.", "Type: " + c.l + (v.sub ? " › " + v.sub : ""), "Tenant marked it: " + URG[urgency],
    "Started: " + v.started + " · Happened before: " + v.repeat, "If out: " + v.entry + " · Best time: " + v.best + " · Pets: " + v.pets,
    "Suburb line: " + v.suburb + " " + v.state + (v.postcode ? " " + v.postcode : "")];
  return {
    address: address.slice(0, 200), tenant_name: v.tenant_name, tenant_contact: [v.mobile, v.email].filter(Boolean).join(" · ").slice(0, 160),
    title: ((urgency === "emergency" ? "URGENT: " : "") + (v.sub || c.l)).slice(0, 100), description: lines.join("\n").slice(0, 2400),
    location: v.location, hints, flag, urgency,
  };
}

export const emergencyFor = (flag) => EMERGENCY[flag] || null;

const ALERT_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z"/><path d="M12 8v4M12 16h.01"/></svg>`;

export function renderForm({ esc, MM_LOGO, MM_MATT, SAFE, msg = "", errs = [], v = {} }) {
  const opts = (list, cur) => list.map((x) => `<option${x === cur ? " selected" : ""}>${esc(x)}</option>`).join("");
  const errBox = (msg || errs.length) ? `<div class="alert" role="alert"><div class="bi">${ALERT_ICON}</div><div><b>${esc(msg || "Nearly there. A couple of things to fix:")}</b>${errs.length ? `<ul>${errs.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>` : ""}</div></div>` : "";
  const cats = CATEGORIES.map((c) => `<label class="ct"><input type="radio" name="cat" value="${c.k}"${v.cat === c.k ? " checked" : ""}><span class="ci"><svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg></span>${esc(c.l)}</label>`).join("");
  const subs = CATEGORIES.map((c) => `<fieldset class="subs" data-cat="${c.k}"><legend>${esc(c.l)}: which is closest?</legend>${c.subs.map((s) => `<label class="sb${s[1] ? " e" : ""}"><input type="radio" name="sub_${c.k}" value="${esc(s[0])}" data-f="${s[1]}"${v.cat === c.k && v.sub === s[0] ? " checked" : ""}><span>${esc(s[0])}</span></label>`).join("")}</fieldset>`).join("");
  const urg = (k, big, small, cls = "") => `<label class="ub ${cls}"><input type="radio" name="urgency" value="${k}"${(v.urgency || "routine") === k ? " checked" : ""}>${big}<small>${small}</small></label>`;
  const data = JSON.stringify({ cats: CATEGORIES.map((c) => ({ k: c.k, tip: c.tip, tips: c.tips })), emg: EMERGENCY }).replace(/</g, "\\u003c");
  return `<div class="cap">${MM_LOGO}Maintenance Mate</div><h1>Something need fixing?</h1>
<div class="mt">${MM_MATT}<p>G'day! Tell me what's wrong and I'll get it to your property manager. It takes about two minutes.</p></div>
<p class="muted">Tell us what needs fixing at your rental. Your property manager will be in touch. This form does not show any property or account details.</p>${SAFE}
<form method="post" action="/request" enctype="multipart/form-data" id="mmf">${errBox}
<section class="sec"><h2><span class="step">1</span>Where is it?</h2>
<label>Street address<input name="street" required maxlength="120" autocomplete="address-line1" placeholder="e.g. 14 Example St" value="${esc(v.street)}"></label>
<label>Unit or apartment (if any)<input name="unit" maxlength="20" autocomplete="address-line2" placeholder="e.g. 4" value="${esc(v.unit)}"></label>
<div class="row3"><label>Suburb<input name="suburb" required maxlength="60" autocomplete="address-level2" value="${esc(v.suburb)}"></label><label>State<select name="state" autocomplete="address-level1">${opts(STATES, v.state || "WA")}</select></label><label>Postcode<input name="postcode" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" autocomplete="postal-code" value="${esc(v.postcode)}"></label></div></section>
<section class="sec"><h2><span class="step">2</span>About you</h2>
<label>Your name<input name="tenant_name" required maxlength="120" autocomplete="name" value="${esc(v.tenant_name)}"></label>
<div class="row2"><label>Mobile<input name="mobile" type="tel" maxlength="30" autocomplete="tel" value="${esc(v.mobile)}"></label><label>Email<input name="email" type="email" maxlength="120" autocomplete="email" value="${esc(v.email)}"></label></div>
<p class="muted">A mobile or an email is enough.</p>
<div class="row2"><label>Best time to contact you<select name="best">${opts(BEST, v.best)}</select></label><label>If a tradie comes when you're out<select name="entry">${opts(ENTRY, v.entry)}</select></label></div>
<label>Pets at the property?<select name="pets">${opts(PETS, v.pets)}</select></label></section>
<section class="sec"><h2><span class="step">3</span>What's the problem?</h2>
<fieldset class="cts"><legend class="vh">What type of problem?</legend>${cats}</fieldset>
${subs}
<div class="alert" id="emg" hidden><div class="bi">${ALERT_ICON}</div><div><b id="emgt"></b><span id="emgb"></span></div></div>
<div class="help" id="help" hidden>${MM_MATT}<div><b>Matt's tip</b><p id="tip"></p><ul id="tips"></ul></div></div></section>
<section class="sec"><h2><span class="step">4</span>Tell me more</h2>
<label>What's happening?<textarea name="description" required rows="4" maxlength="1500" placeholder="E.g. The kitchen tap drips constantly and water is pooling under the sink.">${esc(v.description)}</textarea></label>
<label>Where in the property? (optional)<input name="location" maxlength="120" placeholder="e.g. Kitchen, main bathroom" value="${esc(v.location)}"></label>
<div class="row2"><label>When did it start?<select name="started">${opts(STARTED, v.started)}</select></label><label>Has it happened before?<select name="repeat">${opts(REPEAT, v.repeat)}</select></label></div>
<label>Photos (optional, up to 3)<input type="file" name="photos" accept="image/*" multiple></label>
<fieldset class="urg"><legend>How urgent is it?</legend>${urg("routine", "Can wait", "A few days is fine")}${urg("urgent", "Urgent", "Affects daily living")}${urg("emergency", "Emergency", "Danger or damage now", "em2")}</fieldset></section>
<div class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div>
<section class="sec"><h2><span class="step">5</span>Send it</h2><button>Send to my property manager</button><p class="muted">Your details go to your property manager only. Sending this does not email anyone automatically. It goes to the property management team.</p></section></form>
<script type="application/json" id="mm-data">${data}</script><script>${CLIENT_JS}</script>`;
}

export function renderThanks({ esc, MM_LOGO, MM_MATT, SAFE, wo, flag }) {
  const e = emergencyFor(flag);
  return `<div class="cap">${MM_LOGO}Maintenance Mate</div><h1>Thanks, we've got it</h1><div class="mt">${MM_MATT}<p>Thanks! I've passed it to your property manager.${e ? " This one is flagged as urgent, so please follow the steps below while you wait." : ""}</p></div>
${e ? `<div class="alert"><div class="bi">${ALERT_ICON}</div><div><b>${esc(e[0])}</b>${esc(e[1])}</div></div>` : ""}
<p>${wo ? `Your reference is <b>${esc(wo)}</b>. ` : ""}Your repair request has been sent to the property management team. They'll contact you to arrange the next step.</p>${SAFE}`;
}

export const TENANT_FORM_CSS = `main{max-width:640px}.vh{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
form#mmf{gap:22px}.sec{display:grid;gap:12px}.sec>h2{margin:6px 0 0;font:800 20px/1.15 'Bricolage Grotesque',Georgia,serif;letter-spacing:-.015em}
.step{display:inline-flex;width:26px;height:26px;border-radius:50%;background:#0F1B3D;color:#fff;font:800 13px Manrope,sans-serif;align-items:center;justify-content:center;margin-right:8px;vertical-align:2px}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}.row3{display:grid;grid-template-columns:1.2fr 1fr 1fr;gap:12px}
select{width:100%;padding:12px 14px;border:2px solid #0F1B3D;border-radius:12px;font:inherit;background:#fff;color:#0F1B3D}
fieldset.cts{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.ct{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:10px;min-height:96px;padding:12px;border:2px solid #0F1B3D;border-radius:16px;background:#fff;font:800 14px/1.25 Manrope,sans-serif;box-shadow:3px 3px 0 #0F1B3D;cursor:pointer}
.ct input,.sb input,.ub input{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;border:0;opacity:0;cursor:pointer}
.ct:has(input:checked),.ct.on{background:#FFC93C}.ct:has(input:focus-visible),.sb:has(input:focus-visible),.ub:has(input:focus-visible){outline:3px solid #FF6B3D;outline-offset:2px}
.ci{width:36px;height:36px;border-radius:50%;background:#0F1B3D;display:flex;align-items:center;justify-content:center;flex:none}
.ci svg{width:20px;height:20px;stroke:#fff;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
fieldset.subs{display:flex;flex-wrap:wrap;gap:8px}fieldset.subs legend{font-weight:800;font-size:14px;margin-bottom:8px}
.sb{position:relative;display:inline-flex;align-items:center;min-height:44px;padding:8px 14px;border:2px solid #0F1B3D;border-radius:999px;background:#fff;font:700 14px/1.2 Manrope,sans-serif;cursor:pointer}
.sb:has(input:checked),.sb.on{background:#0F1B3D;color:#fff}.sb.e{border-color:#B3202A}
.sb.e::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:#B3202A;margin-right:8px}.sb.e:has(input:checked)::before{background:#FF6B3D}
.js .subs{display:none}.js .subs.show{display:flex}
.alert{display:flex;gap:12px;align-items:flex-start;padding:14px 16px;border:2px solid #B3202A;border-radius:16px;background:#FFE0E0;font-size:14px;line-height:1.5}
.alert b{display:block;font:800 16px 'Bricolage Grotesque',Georgia,serif}.alert ul{margin:6px 0 0;padding-left:1.1em}.alert[hidden],.help[hidden]{display:none}
.alert .bi{flex:none;width:34px;height:34px;border-radius:50%;background:#B3202A;display:flex;align-items:center;justify-content:center}
.alert .bi svg{width:18px;height:18px;stroke:#fff;fill:none;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round}
.help{display:flex;gap:12px;align-items:flex-start;padding:14px;border:2px solid #0F1B3D;border-radius:18px;background:#FFF1C9;box-shadow:3px 3px 0 #0F1B3D}
.help>svg{flex:none;width:56px;height:56px}.help b{font:800 12px Manrope,sans-serif;letter-spacing:.08em;text-transform:uppercase}
.help p{margin:4px 0 0;font-size:14.5px;line-height:1.5;font-weight:600}.help ul{margin:8px 0 0;padding-left:1.1em;font-size:14px;line-height:1.5;font-weight:600}
fieldset.urg{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}fieldset.urg legend{font-weight:800;font-size:14px;margin-bottom:8px}
.ub{position:relative;min-height:56px;padding:8px 10px;border:2px solid #0F1B3D;border-radius:14px;background:#fff;font:800 13.5px/1.2 Manrope,sans-serif;box-shadow:3px 3px 0 #0F1B3D;cursor:pointer;text-align:center;display:block}
.ub small{display:block;margin-top:2px;font:600 11.5px Manrope,sans-serif;color:#3D4A73}.ub:has(input:checked){background:#19C3A8}.ub.em2:has(input:checked){background:#FF6B3D}
@media(max-width:520px){.row2,.row3{grid-template-columns:1fr}fieldset.urg{grid-template-columns:1fr}}`;

const CLIENT_JS = `(function(){var f=document.getElementById('mmf');if(!f)return;document.documentElement.className+=' js';
var d=JSON.parse(document.getElementById('mm-data').textContent),cats={},auto=false;d.cats.forEach(function(c){cats[c.k]=c});
function q(s){return f.querySelector(s)}function all(s){return [].slice.call(f.querySelectorAll(s))}
function setUrg(v){var r=q('input[name=urgency][value='+v+']');if(r)r.checked=true}
function update(){var c=q('input[name=cat]:checked'),cat=c&&cats[c.value],help=document.getElementById('help'),em=document.getElementById('emg');
all('.ct').forEach(function(l){l.classList.toggle('on',l.querySelector('input').checked)});
all('.sb').forEach(function(l){l.classList.toggle('on',l.querySelector('input').checked)});
all('.subs').forEach(function(s){s.classList.toggle('show',!!cat&&s.getAttribute('data-cat')===cat.k)});
if(!cat){help.hidden=true;em.hidden=true;return}
var s=q('input[name=sub_'+cat.k+']:checked'),flag=s?s.getAttribute('data-f'):'';
if(flag&&d.emg[flag]){var e=d.emg[flag];document.getElementById('emgt').textContent=e[0];document.getElementById('emgb').textContent=e[1];em.hidden=false;setUrg('emergency');auto=true}
else{em.hidden=true;var u=q('input[name=urgency]:checked');if(auto&&u&&u.value==='emergency'){setUrg('urgent')}auto=false}
document.getElementById('tip').textContent=flag?"That sounds urgent, so do the steps above first. Then send this and I'll make sure it is flagged straight away.":cat.tip;
var ul=document.getElementById('tips');ul.innerHTML='';if(!flag)cat.tips.forEach(function(t){var li=document.createElement('li');li.textContent=t;ul.appendChild(li)});
help.hidden=false}
f.addEventListener('change',update);update()})();`;
