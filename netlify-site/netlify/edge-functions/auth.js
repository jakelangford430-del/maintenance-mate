// Server-side auth gate for every path. Users: env PORTAL_USERS = JSON {"email":"pbkdf2$<iter>$<saltB64>$<hashB64>"}
// Session: HMAC-SHA256 signed cookie with env SESSION_SECRET. Nothing secret lives in the repo or bundle.
import { getDatabase } from "@netlify/database";
import { PEOPLE } from "../lib/people.js";
import { makeJobs } from "../lib/jobs_api.js";
import { makeSuppliers } from "../lib/suppliers_api.js";
// PM sessions: cookie user "pm:<Name>", created by picking a name + the shared PM PIN (env PORTAL_PM_PIN_HASH, pbkdf2 hash only).
const PM_NAMES = new Set(PEOPLE.map((p) => p.name));
const pmName = (u) => (String(u).startsWith("pm:") ? String(u).slice(3) : null);
const PM_PAGES = ["/pm.html", "/directory.html"]; // everything else (overview, backlog, properties, comms) is admin-only
const COOKIE = "pp_session", TTL = 60 * 60 * 12; // 12 hours
const env = (k) => (globalThis.Netlify?.env?.get(k)) ?? (globalThis.process?.env?.[k]);
const enc = new TextEncoder();
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const ub64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function hmac(msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(env("SESSION_SECRET")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(await crypto.subtle.sign("HMAC", key, enc.encode(msg))).replace(/=+$/, "");
}
function same(a, b) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }
async function checkPassword(email, pw) {
  let users = {}; try { users = JSON.parse(env("PORTAL_USERS") || "{}"); } catch { return false; }
  const rec = users[String(email).trim().toLowerCase()]; if (!rec) return false;
  return verify(rec, pw);
}
async function verify(rec, pw) {
  const [alg, iter, salt, hash] = String(rec).trim().split("$"); if (alg !== "pbkdf2") return false;
  const k = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: ub64(salt), iterations: +iter }, k, 256);
  return same(b64(bits), hash);
}
async function validSession(req) {
  const m = (req.headers.get("cookie") || "").match(new RegExp(COOKIE + "=([^;]+)")); if (!m) return null;
  const [user, exp, sig] = decodeURIComponent(m[1]).split("|");
  if (!sig || +exp < Date.now() / 1000) return null;
  if (!same(sig, await hmac(user + "|" + exp))) return null;
  if (user === "pin") return env("PORTAL_PIN_HASH") ? user : null; // removing PORTAL_PIN_HASH revokes PIN sessions
  if (pmName(user) !== null) return env("PORTAL_PM_PIN_HASH") && PM_NAMES.has(pmName(user)) ? user : null; // removing the hash revokes PM sessions
  const users = JSON.parse(env("PORTAL_USERS") || "{}"); return users[user] ? user : null; // removing a user revokes access
}

// ---- PIN brute-force protection (Netlify Database / Postgres, atomic upsert-increment) ----
// Each PIN attempt atomically increments its per-IP and global counters for the current
// 15-minute bucket BEFORE the PIN is checked. Over the limit = locked, PIN never verified.
// A correct PIN gives its reservation back (decrement), so only failures accumulate.
// Any DB error fails closed for PIN only; email login never touches the DB.
const WINDOW_MS = 5 * 60 * 1000, PER_IP_MAX = 15, GLOBAL_MAX = 150; // loosened for the PM trial
let _db; const db = () => (_db ??= getDatabase());
const inc = async (scope, bucket) => (await db().sql`
  INSERT INTO pin_attempts (scope, bucket, n) VALUES (${scope}, ${bucket}, 1)
  ON CONFLICT (scope, bucket) DO UPDATE SET n = pin_attempts.n + 1, updated_at = NOW()
  RETURNING n`)[0].n;
const JOBS_API = makeJobs({ db, json: (...a) => json(...a), pmName, env, inc: (s, b) => inc(s, b) });
const SUP_API = makeSuppliers({ db, json: (...a) => json(...a), inc: (s, b) => inc(s, b) });
// PMs may only act on their own jobs (server-enforced for archive, outgoing report, email log and the job lifecycle).
async function pmOwns(user, ids) { const p = pmName(user); if (p === null) return true;
  for (const id of ids) { const r = await JOBS_API.load(id); if (!r || r.pm !== p) return false; } return true; }
const dec = (scope, bucket) => db().sql`UPDATE pin_attempts SET n = GREATEST(n - 1, 0) WHERE scope = ${scope} AND bucket = ${bucket}`;
async function pinLogin(req, context, pin, recKey = "PORTAL_PIN_HASH") {
  const rec = env(recKey);
  if (!rec) return { ok: false, msg: "PIN sign-in is not enabled." };
  // IPv6 is grouped by /48: relays and ISPs rotate addresses within a prefix, so a /128 key
  // would let one client dodge the per-IP limit. IPv4 is per address.
  const raw = String(context?.ip || "unknown");
  const ip = raw.includes(":") ? raw.toLowerCase().split(":").slice(0, 3).join(":") + "::/48" : raw;
  const bucket = Math.floor(Date.now() / WINDOW_MS), ipScope = `ip:${ip}`;
  try {
    const nip = await inc(ipScope, bucket);
    if (nip > PER_IP_MAX) return { ok: false, msg: "Too many PIN attempts. Try again in 5 minutes.", locked: true };
    const nall = await inc("global", bucket);
    if (nall > GLOBAL_MAX) return { ok: false, msg: "PIN sign-in is paused after repeated failures. Try again later or use email.", locked: true };
  } catch (e) {
    console.error("pin counter DB unavailable", e?.message); // fail closed
    return { ok: false, msg: "PIN sign-in is temporarily unavailable. Use email." };
  }
  if (!/^[0-9]{4,12}$/.test(pin) || !(await verify(rec, pin))) return { ok: false, msg: "PIN is incorrect." };
  await Promise.all([dec(ipScope, bucket), dec("global", bucket)]).catch(() => {}); // successes do not count toward lockout
  return { ok: true };
}

// ---- Archive API (portal-side only; Tapi is never touched) ----
// GET  /api/archive -> { archived: [{job_id, wo, reason, note, archived_by, archived_at}] }
// POST /api/archive  JSON {action:"archive", ids:[...], reason, note} | {action:"restore", ids:[...]}
// Only reached with a valid session (checked above). POST requires same-origin JSON.
const REASONS = ["no_longer_required", "duplicate", "completed_elsewhere", "tenant_resolved", "other"];
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const pmOf = (u) => (PM_NAMES.has(u) && !String(u).includes("@") ? "pm:" + u : u);
async function archiveApi(req, user) {
  if (pmName(user) !== null) user = pmName(user);
  try {
    if (req.method === "GET") {
      const rows = await db().sql`SELECT job_id, wo, reason, note, archived_by, archived_at FROM job_archive WHERE restored_at IS NULL ORDER BY archived_at DESC`;
      return json({ archived: rows });
    }
    if (req.method !== "POST") return json({ error: "method" }, 405);
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) return json({ error: "origin" }, 403);
    if (!(req.headers.get("content-type") || "").startsWith("application/json")) return json({ error: "content-type" }, 415);
    const b = await req.json().catch(() => null);
    const ids = Array.isArray(b?.ids) ? [...new Set(b.ids.map(String))].filter((x) => /^[A-Za-z0-9-]{1,64}$/.test(x)) : [];
    if (!ids.length || ids.length > 500) return json({ error: "ids" }, 400);
    if (!(await pmOwns(pmOf(user), ids))) return json({ error: "You can only change your own jobs." }, 403);
    const wos = b.wos && typeof b.wos === "object" ? b.wos : {};
    if (b.action === "archive") {
      const reason = String(b.reason || ""), note = String(b.note || "").trim().slice(0, 500) || null;
      if (!REASONS.includes(reason)) return json({ error: "reason" }, 400);
      if (reason === "other" && !note) return json({ error: "note required for Other" }, 400);
      for (const id of ids) await db().sql`
        INSERT INTO job_archive (job_id, wo, reason, note, archived_by, archived_at)
        VALUES (${id}, ${String(wos[id] || "").slice(0, 40) || null}, ${reason}, ${note}, ${user}, NOW())
        ON CONFLICT (job_id) DO UPDATE SET reason = EXCLUDED.reason, note = EXCLUDED.note, archived_by = EXCLUDED.archived_by,
          archived_at = NOW(), restored_by = NULL, restored_at = NULL`;
      return json({ ok: true, n: ids.length });
    }
    if (b.action === "restore") {
      for (const id of ids) await db().sql`UPDATE job_archive SET restored_by = ${user}, restored_at = NOW() WHERE job_id = ${id} AND restored_at IS NULL`;
      return json({ ok: true, n: ids.length });
    }
    return json({ error: "action" }, 400);
  } catch (e) {
    console.error("archive DB error", e?.message);
    return json({ error: "Archive storage is unavailable. Nothing was changed." }, 503);
  }
}

// ---- Vacate-work overrides (portal-side only; Tapi is never touched) ----
// GET  /api/vacate -> { overrides: [{job_id, wo, state, set_by, set_at}] }
// POST /api/vacate  JSON {ids:[...], state:"vacate"|"active", wos:{id:wo}}
async function vacateApi(req, user) {
  if (pmName(user) !== null) user = pmName(user);
  try {
    if (req.method === "GET") return json({ overrides: await db().sql`SELECT job_id, wo, state, set_by, set_at FROM job_vacate ORDER BY set_at DESC` });
    if (req.method !== "POST") return json({ error: "method" }, 405);
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) return json({ error: "origin" }, 403);
    if (!(req.headers.get("content-type") || "").startsWith("application/json")) return json({ error: "content-type" }, 415);
    const b = await req.json().catch(() => null);
    const ids = Array.isArray(b?.ids) ? [...new Set(b.ids.map(String))].filter((x) => /^[A-Za-z0-9-]{1,64}$/.test(x)) : [];
    if (!ids.length || ids.length > 500) return json({ error: "ids" }, 400);
    if (!(await pmOwns(pmOf(user), ids))) return json({ error: "You can only change your own jobs." }, 403);
    const state = String(b.state || ""); if (!["vacate", "active"].includes(state)) return json({ error: "state" }, 400);
    const wos = b.wos && typeof b.wos === "object" ? b.wos : {};
    for (const id of ids) await db().sql`
      INSERT INTO job_vacate (job_id, wo, state, set_by, set_at) VALUES (${id}, ${String(wos[id] || "").slice(0, 40) || null}, ${state}, ${user}, NOW())
      ON CONFLICT (job_id) DO UPDATE SET state = EXCLUDED.state, set_by = EXCLUDED.set_by, set_at = NOW()`;
    return json({ ok: true, n: ids.length });
  } catch (e) {
    console.error("vacate DB error", e?.message);
    return json({ error: "Vacate storage is unavailable. Nothing was changed." }, 503);
  }
}
async function emailLogApi(req, user) {
  const pmn = pmName(user); if (pmn !== null) user = pmn;
  try {
    if (req.method === "GET") return json({ events: await db().sql`SELECT id, event, action, ref_kind, ref_id, wo, recipient, template, actor, acting_as, created_at FROM email_log ORDER BY created_at DESC, id DESC LIMIT 5000` });
    if (req.method !== "POST") return json({ error: "method" }, 405);
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) return json({ error: "origin" }, 403);
    if (!(req.headers.get("content-type") || "").startsWith("application/json")) return json({ error: "content-type" }, 415);
    const b = await req.json().catch(() => null);
    const t = (v, n) => { const x = String(v ?? "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, n); return x || null; };
    const event = String(b?.event || ""), action = String(b?.action || ""), kind = String(b?.ref_kind || ""), ref = String(b?.ref_id || "");
    if (!["prepared", "sent", "not_sent"].includes(event)) return json({ error: "event" }, 400);
    if (!["copy_to", "copy_subject", "copy_email", "open_email", "mark"].includes(action)) return json({ error: "action" }, 400);
    if ((event === "prepared") === (action === "mark")) return json({ error: "action" }, 400);
    if (!["job", "batch"].includes(kind) || !/^[A-Za-z0-9-]{1,64}$/.test(ref)) return json({ error: "ref" }, 400);
    if (kind === "job" && !(await pmOwns(pmn !== null ? "pm:" + pmn : user, [ref]))) return json({ error: "You can only log emails for your own jobs." }, 403);
    const template = t(b.template, 40); if (!template || !/^[a-z_]+$/.test(template)) return json({ error: "template" }, 400);
    const [row] = await db().sql`
      INSERT INTO email_log (event, action, ref_kind, ref_id, wo, recipient, template, actor, acting_as)
      VALUES (${event}, ${action}, ${kind}, ${ref}, ${t(b.wo, 40)}, ${t(b.recipient, 120)}, ${template}, ${user}, ${pmn !== null ? null : t(b.acting_as, 80)})
      RETURNING id, event, action, ref_kind, ref_id, wo, recipient, template, actor, acting_as, created_at`;
    return json({ ok: true, event: row });
  } catch (e) {
    console.error("email log DB error", e?.message);
    return json({ error: "Email log is unavailable. Nothing was recorded." }, 503);
  }
}
// ---- Supplier contact edits (PMs and admins; portal-side only) ----
// GET  /api/contacts -> { edits: [{supplier, field, value, edited_by, edited_at}] } (latest per supplier+field)
// POST /api/contacts  JSON {supplier, fields:{phone?, email?, website?, address?}}
async function contactsApi(req, user) {
  const pmn = pmName(user); const who = pmn !== null ? pmn : user;
  try {
    if (req.method === "GET") return json({ edits: await db().sql`SELECT DISTINCT ON (supplier, field) supplier, field, value, edited_by, edited_at FROM supplier_contact_edits ORDER BY supplier, field, edited_at DESC, id DESC` });
    if (req.method !== "POST") return json({ error: "method" }, 405);
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) return json({ error: "origin" }, 403);
    if (!(req.headers.get("content-type") || "").startsWith("application/json")) return json({ error: "content-type" }, 415);
    const b = await req.json().catch(() => null);
    const sup = String(b?.supplier || "").replace(/[\u0000-\u001f]/g, " ").trim().slice(0, 160);
    if (!sup) return json({ error: "supplier" }, 400);
    const F = b?.fields || {}, out = [];
    const ok = { phone: (v) => /^[0-9+()\s-]{6,40}$/.test(v), email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 120, website: (v) => /^(https?:\/\/)?[a-z0-9.-]+\.[a-z]{2,}(\/\S*)?$/i.test(v) && v.length <= 200, address: (v) => v.length <= 200 };
    for (const k of Object.keys(ok)) { if (!(k in F)) continue; const v = String(F[k] ?? "").replace(/[\u0000-\u001f]/g, " ").trim();
      if (v && !ok[k](v)) return json({ error: `That ${k} doesn't look right.` }, 400); out.push([k, v || null]); }
    if (!out.length) return json({ error: "Nothing to save." }, 400);
    const rows = [];
    for (const [k, v] of out) rows.push((await db().sql`INSERT INTO supplier_contact_edits (supplier, field, value, edited_by) VALUES (${sup}, ${k}, ${v}, ${who}) RETURNING supplier, field, value, edited_by, edited_at`)[0]);
    return json({ ok: true, edits: rows });
  } catch (e) {
    console.error("contacts DB error", e?.message);
    return json({ error: "Contact edits are unavailable. Nothing was saved." }, 503);
  }
}
const escH = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const page = (msg = "", person = "", open = "") => {
  const pm = !!env("PORTAL_PM_PIN_HASH"), pin = !!env("PORTAL_PIN_HASH");
  const err0 = msg ? `<div class="e" role="alert">${escH(msg)}</div>` : "";
  const err = err0, on = open || (person && pm ? "pmf" : pm ? "pick" : "emf"), H = (id) => (on === id ? "" : " hidden"), E = (id) => (on === id ? err : "");
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Sign in · Maintenance Mate</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Manrope:wght@400;500;600;700;800&display=swap"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect width="48" height="48" rx="14" fill="%23FFC93C"/%3E%3Cpath d="M24 9L40 22V37H8V22Z" fill="%230F1B3D" stroke="%230F1B3D" stroke-width="5" stroke-linejoin="round"/%3E%3Cg transform="translate(12 15)" fill="none" stroke="%23FFC93C" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/%3E%3C/g%3E%3C/svg%3E"><meta name="theme-color" content="#0F1B3D"><style>*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#EEF1FA;font:16px/1.5 Manrope,system-ui,sans-serif;color:#0F1B3D;padding:20px 0}
.card{background:#fff;padding:36px;border:2px solid #0F1B3D;border-radius:22px;box-shadow:6px 6px 0 #0F1B3D;width:min(400px,92vw);display:grid;gap:14px}.card[hidden]{display:none}
h1{font:800 2.1rem/1.08 'Bricolage Grotesque',Georgia,serif;letter-spacing:-.025em;margin:0 0 4px}.cap{justify-self:start;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:800;color:#0F1B3D;background:#FFC93C;padding:4px 12px;border-radius:999px}input{width:100%;padding:12px 14px;border:2px solid #0F1B3D;border-radius:12px;font:inherit;background:#fff}input:focus,button:focus-visible{outline:3px solid #FF6B3D;outline-offset:2px}
button{padding:12px;border:2px solid #0F1B3D;border-radius:14px;background:#FF6B3D;color:#0F1B3D;font:inherit;font-weight:800;cursor:pointer;box-shadow:3px 3px 0 #0F1B3D}button:active{transform:translate(3px,3px);box-shadow:none}.e{color:#B3202A;font-size:14px;font-weight:700}.lk{border:0;box-shadow:none;font-size:14px;color:#A83A12;background:none;padding:0;text-align:left;border-radius:0;cursor:pointer;text-decoration:underline}
.pl{list-style:none;margin:0;padding:0;max-height:min(46vh,380px);overflow:auto;border:2px solid #0F1B3D;border-radius:14px}.pl li[hidden]{display:none}.pl button{box-shadow:none;border-width:0 0 1px;width:100%;display:flex;justify-content:space-between;gap:10px;background:none;color:inherit;border-radius:0;padding:13px 14px;text-align:left;border-bottom:1px solid #E3E8F5;min-height:48px}
.pl button:hover,.pl button:focus{background:#FFF1C9;outline:none}.pl small{color:#3D4A73;white-space:nowrap}.who{font-weight:700}.muted{color:#3D4A73;font-size:14px;margin:0}</style></head><body>
${pm ? `<div class="card" id="pick"${H("pick")}><div class="cap">Maintenance Mate · PM workspace</div><h1>Who are you?</h1><p class="muted">Matt @ Maintenance Mate: AI maintenance knowledge for your portfolio</p>${E("pick")}<input id="pq" type="search" placeholder="Search your name" aria-label="Search your name" autocomplete="off">
<ul class="pl">${PEOPLE.map((p) => `<li><button type="button" data-p="${escH(p.name)}"><span>${escH(p.name)}</span><small>${escH(p.office)}</small></button></li>`).join("")}</ul>
<button type="button" class="lk" data-show="adm">Admin sign-in</button></div>
<form class="card" method="post" action="/login" id="pmf"${H("pmf")}><input type="hidden" name="mode" value="pm"><input type="hidden" name="person" id="pp" value="${escH(person)}"><div class="cap">Maintenance Mate · PM workspace</div><h1>Enter the PM PIN</h1>
<p class="muted">Signing in as <span class="who" id="pw">${escH(person)}</span></p>${E("pmf")}<input name="pin" id="pmpin" type="password" inputmode="numeric" autocomplete="one-time-code" placeholder="PM PIN" aria-label="PM PIN" required><button>Sign in</button><button type="button" class="lk" data-show="pick">Not you? Choose another name</button></form>` : ""}
<div id="adm" style="display:contents"><form class="card" method="post" action="/login" id="emf"${H("emf")}><div class="cap">Maintenance Mate · Admin</div><h1>Sign in</h1>${E("emf")}<input name="email" type="email" placeholder="Email" autocomplete="username" required><input name="password" type="password" placeholder="Password" autocomplete="current-password" required><button>Sign in</button>
${pin ? `<button type="button" class="lk" data-show="pinf">Sign in with admin PIN</button>` : ""}${pm ? `<button type="button" class="lk" data-show="pick">Property manager? Choose your name</button>` : ""}</form>
${pin ? `<form class="card" method="post" action="/login" id="pinf"${H("pinf")}><input type="hidden" name="mode" value="pin"><div class="cap">Maintenance Mate · Admin</div><h1>Sign in with PIN</h1>${E("pinf")}<input name="pin" type="password" inputmode="numeric" autocomplete="one-time-code" placeholder="Admin PIN" required><button>Sign in</button><button type="button" class="lk" data-show="emf">Use email instead</button></form>` : ""}</div>
<script>const $=s=>document.getElementById(s),cards=['pick','pmf','emf','pinf'];
function show(id){if(id==='adm')id='emf';cards.forEach(c=>{if($(c))$(c).hidden=c!==id});const f=$(id)&&$(id).querySelector('input:not([type=hidden])');if(f)f.focus()}
document.addEventListener('click',e=>{const s=e.target.closest('[data-show]');if(s)show(s.dataset.show);const p=e.target.closest('[data-p]');if(p){$('pp').value=p.dataset.p;$('pw').textContent=p.dataset.p;show('pmf')}});
if($('pq'))$('pq').oninput=e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('.pl li').forEach(li=>li.hidden=!li.textContent.toLowerCase().includes(q))};
if(location.hash==='#pin'&&$('pinf'))show('pinf');if(location.hash==='#admin')show('adm');</script></body></html>`,
  { status: 401, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
};

export default async (req, context) => {
  if (!env("SESSION_SECRET") || !env("PORTAL_USERS")) return new Response("Portal not configured", { status: 503 });
  const url = new URL(req.url);
  if (url.pathname === "/logout") return new Response(null, { status: 302, headers: { location: "/login", "set-cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });
  if (url.pathname === "/login" && req.method === "POST") {
    const f = await req.formData();
    let email;
    if (f.get("mode") === "pin") {
      const r = await pinLogin(req, context, String(f.get("pin") || ""));
      if (!r.ok) { const res = page(r.msg, "", "pinf"); if (r.locked) res.headers.set("retry-after", "300"); return res; }
      email = "pin";
    } else if (f.get("mode") === "pm") {
      const person = String(f.get("person") || "");
      if (!PM_NAMES.has(person)) return page("Choose your name from the list.");
      const r = await pinLogin(req, context, String(f.get("pin") || ""), "PORTAL_PM_PIN_HASH");
      if (!r.ok) { const res = page(r.msg, person); if (r.locked) res.headers.set("retry-after", "300"); return res; }
      email = "pm:" + person;
    } else {
      email = String(f.get("email") || "").trim().toLowerCase();
      if (email === "pin" || !(await checkPassword(email, String(f.get("password") || "")))) return page("Email or password is incorrect.", "", "emf");
    }
    const exp = Math.floor(Date.now() / 1000) + TTL, val = `${email}|${exp}|${await hmac(email + "|" + exp)}`;
    return new Response(null, { status: 303, headers: { location: email.startsWith("pm:") ? "/pm.html?pm=" + encodeURIComponent(email.slice(3)) : "/director.html", "set-cookie": `${COOKIE}=${encodeURIComponent(val)}; Path=/; Max-Age=${TTL}; HttpOnly; Secure; SameSite=Lax` } });
  }
  if (url.pathname === "/join" && env("PORTAL_PUBLIC_JOIN") === "on") return SUP_API.joinPage(req, context); // public supplier join form (tokenised link), flag default off
  if (url.pathname === "/request" && env("PORTAL_PUBLIC_REQUEST") === "on") return JOBS_API.requestPage(req, context); // public tenant form, flag default off
  const user = await validSession(req);
  if (!user) return url.pathname.startsWith("/api/") ? json({ error: "auth" }, 401) : page();
  const pmn = pmName(user);
  if (pmn !== null) { // PM session: own workspace + contractors only, always scoped to themselves
    if (url.pathname === "/api/me") return json({ admin: false, via: "pm", person: pmn });
    const p = url.pathname;
    if (p === "/" || p === "/login" || p.endsWith(".html") && !PM_PAGES.includes(p)) {
      if (p.startsWith("/api/")) return json({ error: "admin only" }, 403);
      return new Response(null, { status: 302, headers: { location: "/pm.html?pm=" + encodeURIComponent(pmn) } });
    }
    if (p === "/pm.html" && url.searchParams.get("pm") !== pmn) return new Response(null, { status: 302, headers: { location: "/pm.html?pm=" + encodeURIComponent(pmn) } });
  }
  if (url.pathname === "/api/me") { // admin = PIN session, or listed in PORTAL_ADMINS (unset: every password user, as today)
    const A = String(env("PORTAL_ADMINS") || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
    return json({ admin: user === "pin" || !A.length || A.includes(user), via: user === "pin" ? "pin" : "password", person: user === "pin" ? null : user });
  }
  if (url.pathname === "/api/archive") return archiveApi(req, user);
  if (url.pathname === "/api/vacate") return vacateApi(req, user);
  if (url.pathname === "/api/email-log") return emailLogApi(req, user);
  if (url.pathname === "/api/contacts") return contactsApi(req, user);
  { const A = String(env("PORTAL_ADMINS") || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean), admin = pmn === null && (user === "pin" || !A.length || A.includes(user)), who = pmn !== null ? pmn : user;
    if (url.pathname === "/api/join-review") return SUP_API.joinReviewApi(req, who, admin);
    if (url.pathname === "/api/optouts") return SUP_API.optoutsApi(req, who, admin);
    if (url.pathname === "/api/reach") return SUP_API.reachApi(req, who, (id) => pmOwns(user, [id])); }
  if (url.pathname === "/api/jobs") return JOBS_API.jobsApi(req, user);
  if (url.pathname === "/api/photo") return JOBS_API.photoApi(req, user);
  if (url.pathname === "/login") return new Response(null, { status: 302, headers: { location: "/director.html" } });
  const res = await context.next();
  const h = new Headers(res.headers); h.set("cache-control", "private, no-store");
  return new Response(res.body, { status: res.status, headers: h });
};
export const config = { path: "/*" };
