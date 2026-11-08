// Maintenance Mate job lifecycle API + photo store + public tenant request form.
// Portal-side only: nothing here writes to Tapi, and nothing sends email.
import { JOBS, ADDR, SUBURB_OFFICE, AS_OF, norm } from "./jobs_index.js";
import { PEOPLE } from "./people.js";
import { getStore } from "@netlify/blobs";
import { parseSubmission, buildJob, renderForm, renderThanks, TENANT_FORM_CSS } from "./tenant_form.js";

const OFFICE_OF = Object.fromEntries(PEOPLE.map((p) => [p.name, p.office]));
const TAPI_STAGE = { "Repair request": "new", "Accept tenant request": "new", "Choose action": "new", "Awaiting quote": "quoting", "Review quote": "quoting",
  "Awaiting approval": "awaiting_owner", "Owner approved": "approved", "Owner declined": "declined", "Scheduling job": "booked", "Awaiting confirmation": "booked",
  "Job scheduled": "booked", "Awaiting invoice": "booked", "Processing invoice": "booked" };
const CLOSED = ["completed", "invoiced", "sent_pm"];
const HINTS = ["water", "power", "gas", "security"];
const TRADES = ["Plumbing & gas","Electrical","Air-con & heating","Locks & security","Glass & windows","Roofing & gutters","Fencing & gates","Garden & trees","Pest control","Cleaning & carpets","Painting","Appliances","Doors & garage","Building & handyman","Other"];
const ID = /^[A-Za-z0-9-]{1,64}$/;
const COLS = ["job_id", "source", "wo", "origin", "title", "description", "location", "address", "office", "pm", "tenant_name", "tenant_contact", "hints", "photos", "test", "stage",
  "triage", "trade", "triage_reason", "triaged_by", "triaged_at", "quotes", "accepted_quote", "owner_decision", "owner_by", "owner_at", "booked_supplier", "booked_date", "booked_by", "booked_at",
  "completed_note", "completed_photos", "completed_by", "completed_at", "invoice_amount", "invoice_no", "invoiced_by", "invoiced_at", "pm_sent_by", "pm_sent_at", "created_by", "created_at"];
const t = (v, n) => { const x = String(v ?? "").replace(/[\u0000-\u0008\u000b-\u001f]/g, " ").trim().slice(0, n); return x || null; };
const J = (s, d) => { try { return s ? JSON.parse(s) : d; } catch { return d; } };
const now = () => new Date().toISOString();

export function route(address) {
  const k = norm(address); if (!k) return { pm: null, office: null, matched: "none" };
  const tryK = [k, k.replace(/^(unit|u|apt|flat)?\s*\d+[a-z]?\s+(?=\d)/, ""), k.replace(/^\d+[a-z]?\s*\/?\s*/, "")];
  for (const x of tryK) if (ADDR[x]) return { pm: ADDR[x][0] && OFFICE_OF[ADDR[x][0]] !== undefined ? ADDR[x][0] : null, office: ADDR[x][1], matched: ADDR[x][0] ? "property_pm" : "property_office" };
  const parts = String(address).split(","); const sub = norm(parts[parts.length - 1]);
  if (parts.length > 1 && SUBURB_OFFICE[sub]) return { pm: null, office: SUBURB_OFFICE[sub], matched: "suburb" };
  for (const s of Object.keys(SUBURB_OFFICE)) if (k.endsWith(" " + s)) return { pm: null, office: SUBURB_OFFICE[s], matched: "suburb" };
  return { pm: null, office: null, matched: "none" };
}

export function makeJobs({ db, json, pmName, env, inc }) {
  const blobs = () => getStore("job-photos");
  const isAdmin = (user) => pmName(user) === null;
  const actor = (user) => pmName(user) ?? user;
  async function load(id) {
    const [row] = await db().sql`SELECT * FROM job_flow WHERE job_id = ${id}`;
    if (row) return row;
    const x = JOBS[id]; if (!x) return null;
    return { job_id: id, source: "tapi", wo: x[2], pm: x[0], office: x[1], address: x[4], stage: TAPI_STAGE[x[3]] || "new", tapi_stage: x[3], tapi_supplier: x[5], _new: true };
  }
  const canSee = (user, r) => isAdmin(user) || r.pm === pmName(user) || (!r.pm && r.office && r.office === OFFICE_OF[pmName(user)]);
  const canAct = (user, r, action) => isAdmin(user) || r.pm === pmName(user) || (action === "take" && !r.pm && r.office === OFFICE_OF[pmName(user)]);
  async function save(r, isNew) {
    const v = COLS.map((c) => (r[c] === undefined ? null : r[c]));
    if (isNew) {
      await db().sql`INSERT INTO job_flow (job_id, source, wo, origin, title, description, location, address, office, pm, tenant_name, tenant_contact, hints, photos, test, stage,
        triage, trade, triage_reason, triaged_by, triaged_at, quotes, accepted_quote, owner_decision, owner_by, owner_at, booked_supplier, booked_date, booked_by, booked_at,
        completed_note, completed_photos, completed_by, completed_at, invoice_amount, invoice_no, invoiced_by, invoiced_at, pm_sent_by, pm_sent_at, created_by, created_at, n)
        VALUES (${v[0]}, ${v[1]}, ${v[2]}, ${v[3]}, ${v[4]}, ${v[5]}, ${v[6]}, ${v[7]}, ${v[8]}, ${v[9]}, ${v[10]}, ${v[11]}, ${v[12]}, ${v[13]}, ${!!v[14]}, ${v[15]},
        ${v[16]}, ${v[17]}, ${v[18]}, ${v[19]}, ${v[20]}, ${v[21]}, ${v[22]}, ${v[23]}, ${v[24]}, ${v[25]}, ${v[26]}, ${v[27]}, ${v[28]}, ${v[29]},
        ${v[30]}, ${v[31]}, ${v[32]}, ${v[33]}, ${v[34]}, ${v[35]}, ${v[36]}, ${v[37]}, ${v[38]}, ${v[39]}, ${v[40]}, ${v[41] || now()}, ${r.n ?? 0})`;
    } else {
      await db().sql`UPDATE job_flow SET source=${v[1]}, wo=${v[2]}, origin=${v[3]}, title=${v[4]}, description=${v[5]}, location=${v[6]}, address=${v[7]}, office=${v[8]}, pm=${v[9]},
        tenant_name=${v[10]}, tenant_contact=${v[11]}, hints=${v[12]}, photos=${v[13]}, test=${!!v[14]}, stage=${v[15]}, triage=${v[16]}, trade=${v[17]}, triage_reason=${v[18]},
        triaged_by=${v[19]}, triaged_at=${v[20]}, quotes=${v[21]}, accepted_quote=${v[22]}, owner_decision=${v[23]}, owner_by=${v[24]}, owner_at=${v[25]}, booked_supplier=${v[26]},
        booked_date=${v[27]}, booked_by=${v[28]}, booked_at=${v[29]}, completed_note=${v[30]}, completed_photos=${v[31]}, completed_by=${v[32]}, completed_at=${v[33]},
        invoice_amount=${v[34]}, invoice_no=${v[35]}, invoiced_by=${v[36]}, invoiced_at=${v[37]}, pm_sent_by=${v[38]}, pm_sent_at=${v[39]}, updated_at=NOW() WHERE job_id=${v[0]}`;
    }
  }
  const strip = (r) => { const o = {}; for (const c of COLS) o[c] = r[c] ?? null; return o; };
  async function limitFor(address) {
    const k = norm(address); if (!k) return null;
    const [l] = await db().sql`SELECT prop_key, address, amount, note, set_by, set_at FROM approval_limit WHERE prop_key = ${k}`; return l || null;
  }
  async function nextWo() { const [m] = await db().sql`SELECT COALESCE(MAX(n), 0) AS m FROM job_flow WHERE source = 'native'`; return +m.m + 1; }
  async function createNative(f, by, origin) {
    const rt = f.pm !== undefined ? f : route(f.address);
    for (let i = 0; i < 4; i++) {
      const n = (await nextWo()) + i, wo = "MM-" + (1000 + n);
      const r = { job_id: wo, n, source: "native", wo, origin, title: f.title, description: f.description, location: f.location, address: f.address, office: rt.office, pm: rt.pm,
        tenant_name: f.tenant_name, tenant_contact: f.tenant_contact, hints: JSON.stringify(f.hints || []), photos: JSON.stringify(f.photos || []), test: !!f.test, stage: "new", quotes: "[]", created_by: by, created_at: now() };
      try { await save(r, true); return { r, rt }; } catch (e) { if (i === 3) throw e; }
    }
  }
  async function step(id, action, detail, user, acting, prev) {
    const [s] = await db().sql`INSERT INTO job_step (job_id, action, detail, actor, acting_as, prev) VALUES (${id}, ${action}, ${detail ? JSON.stringify(detail) : null}, ${actor(user)}, ${acting}, ${prev === null ? null : JSON.stringify(prev)})
      RETURNING id, job_id, action, detail, actor, acting_as, created_at, undone_by, undone_at`; return s;
  }
  function body(req) {
    if (req.method !== "POST") return [null, json({ error: "method" }, 405)];
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) return [null, json({ error: "origin" }, 403)];
    if (!(req.headers.get("content-type") || "").startsWith("application/json")) return [null, json({ error: "content-type" }, 415)];
    return [req.json().catch(() => null), null];
  }

  async function jobsApi(req, user) {
    const pmn = pmName(user);
    try {
      if (req.method === "GET") {
        const rows = await db().sql`SELECT * FROM job_flow ORDER BY created_at DESC`;
        const vis = rows.filter((r) => canSee(user, r)), ids = new Set(vis.map((r) => r.job_id));
        const steps = (await db().sql`SELECT id, job_id, action, detail, actor, acting_as, created_at, undone_by, undone_at FROM job_step ORDER BY id DESC LIMIT 5000`).filter((s) => ids.has(s.job_id));
        const lk = pmn === null ? null : new Set([...vis.map((r) => norm(r.address)), ...Object.values(JOBS).filter((x) => x[0] === pmn).map((x) => norm(x[4]))]);
        const limits = (await db().sql`SELECT prop_key, address, amount, note, set_by, set_at FROM approval_limit ORDER BY set_at DESC`).filter((l) => !lk || lk.has(l.prop_key));
        return json({ as_of: AS_OF, jobs: vis.map(strip), steps, limits, me_office: pmn ? OFFICE_OF[pmn] || null : null });
      }
      const [bp, err] = body(req); if (err) return err; const b = await bp; if (!b) return json({ error: "body" }, 400);
      const acting = pmn === null ? t(b.acting_as, 80) : null, A = String(b.action || "");
      if (A === "create") {
        const f = { title: t(b.title, 140), description: t(b.description, 2000), location: t(b.location, 120), address: t(b.address, 200), tenant_name: t(b.tenant_name, 120),
          tenant_contact: t(b.tenant_contact, 160), hints: (Array.isArray(b.hints) ? b.hints : []).filter((h) => HINTS.includes(h)),
          photos: (Array.isArray(b.photos) ? b.photos : []).map(String).filter((k) => /^intake\/[A-Za-z0-9-]{8,64}$/.test(k)).slice(0, 6), test: !!b.test };
        if (!f.title || !f.address) return json({ error: "Add what's wrong and the property address." }, 400);
        const { r, rt } = await createNative(f, actor(user), "pm");
        await step(r.job_id, "create", { routed: rt.matched, pm: r.pm, office: r.office }, user, acting, null);
        return json({ ok: true, job: strip(r), routed: rt.matched });
      }
      if (A === "limit") {
        const address = t(b.address, 200), k = norm(address); if (!k) return json({ error: "address" }, 400);
        if (pmn !== null) { const r = b.job_id && ID.test(b.job_id) ? await load(b.job_id) : null; if (!r || r.pm !== pmn || norm(r.address) !== k) return json({ error: "You can set limits for your own properties only." }, 403); }
        const amount = b.amount === null || b.amount === "" ? null : Number(b.amount);
        if (amount !== null && !(Number.isFinite(amount) && amount >= 0 && amount < 1e7)) return json({ error: "amount" }, 400);
        await db().sql`INSERT INTO approval_limit (prop_key, address, amount, note, set_by, set_at) VALUES (${k}, ${address}, ${amount}, ${t(b.note, 300)}, ${actor(user)}, NOW())
          ON CONFLICT (prop_key) DO UPDATE SET address = EXCLUDED.address, amount = EXCLUDED.amount, note = EXCLUDED.note, set_by = EXCLUDED.set_by, set_at = NOW()`;
        return json({ ok: true, limit: await limitFor(address) });
      }
      const id = String(b.job_id || ""); if (!ID.test(id)) return json({ error: "job_id" }, 400);
      const r = await load(id); if (!r) return json({ error: "Job not found" }, 404);
      if (!canAct(user, r, A)) return json({ error: "This job belongs to another property manager." }, 403);
      const isNew = !!r._new, prev = isNew ? null : strip(r); delete r._new;
      if (isNew) { r.quotes = "[]"; r.created_by = actor(user); r.created_at = now(); if (r.stage === "booked" && JOBS[id][5]) r.booked_supplier = JOBS[id][5]; }
      const who = actor(user), at = now(), Q = J(r.quotes, []), bad = (m) => json({ error: m }, 409);
      let detail = {};
      if (A === "undo") {
        const [last] = await db().sql`SELECT id, action, prev FROM job_step WHERE job_id = ${id} AND undone_at IS NULL ORDER BY id DESC LIMIT 1`;
        if (!last || last.action === "create" || (b.step_id && +b.step_id !== +last.id)) return bad("Only the latest step can be undone.");
        const p = J(last.prev, null);
        if (p) await save(p, false); else await db().sql`DELETE FROM job_flow WHERE job_id = ${id}`;
        await db().sql`UPDATE job_step SET undone_by = ${who}, undone_at = NOW() WHERE id = ${last.id}`;
        return json({ ok: true, undone: last.action });
      }
      if (CLOSED.includes(r.stage) && !["invoice", "propertyme"].includes(A)) return bad("This job is closed off.");
      switch (A) {
        case "take": if (r.pm) return bad("Already assigned."); r.pm = pmn ?? t(b.pm, 80); if (!r.pm || OFFICE_OF[r.pm] === undefined) return json({ error: "pm" }, 400); detail = { pm: r.pm }; break;
        case "assign": if (pmn !== null) return json({ error: "admin only" }, 403); if (OFFICE_OF[b.pm] === undefined) return json({ error: "pm" }, 400); detail = { from: r.pm, pm: b.pm }; r.pm = b.pm; break;
        case "triage": {
          if (!/^P[1-4]$/.test(b.triage || "") || !TRADES.includes(b.trade)) return json({ error: "triage" }, 400);
          Object.assign(r, { triage: b.triage, trade: b.trade, triage_reason: t(b.reason, 300), triaged_by: who, triaged_at: at }); detail = { triage: b.triage, trade: b.trade, changed: !!b.changed }; break; }
        case "quotes_request": {
          if (!["new", "quoting", "declined", "approved"].includes(r.stage)) return bad("Quotes can't be requested at this stage.");
          const names = [...new Set((Array.isArray(b.suppliers) ? b.suppliers : []).map((s) => t(s, 120)).filter(Boolean))];
          const open = Q.filter((q) => q.status !== "withdrawn");
          if (r.stage === "declined" || r.stage === "approved") open.forEach((q) => (q.status = "withdrawn"));
          const live = Q.filter((q) => q.status !== "withdrawn");
          if (!names.length || names.length + live.length > 3) return json({ error: "Request quotes from 1 to 3 suppliers." }, 400);
          names.forEach((s) => Q.push({ id: crypto.randomUUID().slice(0, 8), supplier: s, status: "requested", amount: null, note: null, requested_at: at, by: who }));
          r.stage = "quoting"; r.accepted_quote = null; r.owner_decision = null; detail = { suppliers: names }; break; }
        case "quote_record": {
          if (r.stage !== "quoting") return bad("Not waiting on quotes.");
          const amount = Number(b.amount); if (!(Number.isFinite(amount) && amount >= 0 && amount < 1e7)) return json({ error: "Enter the quote amount." }, 400);
          let q = Q.find((x) => x.id === b.quote_id && x.status !== "withdrawn");
          if (!q) { const s = t(b.supplier, 120); if (!s) return json({ error: "supplier" }, 400); if (Q.filter((x) => x.status !== "withdrawn").length >= 3) return json({ error: "Up to 3 quotes per job." }, 400);
            q = { id: crypto.randomUUID().slice(0, 8), supplier: s, requested_at: null }; Q.push(q); }
          Object.assign(q, { status: "received", amount, note: t(b.note, 500), received_at: at, by: who }); detail = { supplier: q.supplier, amount }; break; }
        case "quote_accept": {
          if (r.stage !== "quoting") return bad("Not waiting on quotes.");
          const q = Q.find((x) => x.id === b.quote_id && x.status === "received"); if (!q) return json({ error: "Record the quote first." }, 400);
          const lim = await limitFor(r.address), cap = lim && lim.amount !== null ? Number(lim.amount) : null;
          const need = cap === null || Number(q.amount) > cap;
          r.accepted_quote = q.id; r.stage = need ? "awaiting_owner" : "approved"; r.owner_decision = need ? null : "within_limit"; r.owner_by = need ? null : who; r.owner_at = need ? null : at;
          detail = { supplier: q.supplier, amount: q.amount, limit: cap, owner_needed: need }; break; }
        case "owner": {
          if (r.stage !== "awaiting_owner") return bad("Not waiting on the owner.");
          if (!["approved", "declined"].includes(b.decision)) return json({ error: "decision" }, 400);
          Object.assign(r, { owner_decision: b.decision, owner_by: who, owner_at: at, stage: b.decision }); detail = { decision: b.decision }; break; }
        case "book": {
          if (!["new", "quoting", "approved", "booked"].includes(r.stage)) return bad(r.stage === "awaiting_owner" ? "Waiting on owner approval." : "Can't book at this stage.");
          const s = t(b.supplier, 120), d = String(b.date || ""); if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return json({ error: "Pick the supplier and the booked date." }, 400);
          Object.assign(r, { booked_supplier: s, booked_date: d, booked_by: who, booked_at: at, stage: "booked" }); detail = { supplier: s, date: d }; break; }
        case "complete": {
          if (r.stage !== "booked") return bad("Book the job first.");
          const ph = (Array.isArray(b.photos) ? b.photos : []).map(String).filter((k) => k.startsWith(`jobs/${id}/`) && /^[A-Za-z0-9\/-]{1,140}$/.test(k)).slice(0, 6);
          Object.assign(r, { completed_note: t(b.note, 1000), completed_photos: JSON.stringify(ph), completed_by: who, completed_at: at, stage: "completed" }); detail = { photos: ph.length }; break; }
        case "invoice": {
          if (r.stage !== "completed") return bad("Mark the job completed first.");
          const amount = Number(b.amount), no = t(b.invoice_no, 60); if (!(Number.isFinite(amount) && amount > 0 && amount < 1e7) || !no) return json({ error: "Enter the invoice amount and number." }, 400);
          Object.assign(r, { invoice_amount: amount, invoice_no: no, invoiced_by: who, invoiced_at: at, stage: "invoiced" }); detail = { amount, invoice_no: no }; break; }
        case "propertyme": {
          if (r.stage !== "invoiced") return bad("Record the invoice first.");
          Object.assign(r, { pm_sent_by: who, pm_sent_at: at, stage: "sent_pm" }); break; }
        default: return json({ error: "action" }, 400);
      }
      r.quotes = JSON.stringify(Q);
      await save(r, isNew);
      const s = await step(id, A, detail, user, acting, prev);
      const [row] = await db().sql`SELECT * FROM job_flow WHERE job_id = ${id}`;
      return json({ ok: true, job: strip(row), step: s });
    } catch (e) {
      console.error("jobs DB error", e?.message);
      return json({ error: "Job storage is unavailable. Nothing was changed." }, 503);
    }
  }

  // Photos: POST raw image body to /api/photo?job=<id|new>; GET /api/photo?key=...
  const IMG = { "image/jpeg": 1, "image/png": 1, "image/webp": 1, "image/heic": 1, "image/heif": 1 }, MAXB = 6 * 1024 * 1024;
  async function photoApi(req, user) {
    const u = new URL(req.url);
    try {
      if (req.method === "GET") {
        const key = String(u.searchParams.get("key") || ""); if (!/^(intake|jobs)\/[A-Za-z0-9\/-]{1,140}$/.test(key)) return json({ error: "key" }, 400);
        if (!isAdmin(user)) {
          const jid = key.startsWith("jobs/") ? key.split("/")[1] : null;
          const rows = jid ? [await load(jid)] : await db().sql`SELECT * FROM job_flow WHERE photos LIKE ${'%"' + key + '"%'}`;
          if (!rows.some((r) => r && canSee(user, r))) return json({ error: "forbidden" }, 403);
        }
        const r = await blobs().getWithMetadata(key, { type: "arrayBuffer" }); if (!r) return json({ error: "not found" }, 404);
        return new Response(r.data, { headers: { "content-type": r.metadata?.type || "image/jpeg", "cache-control": "private, no-store" } });
      }
      if (req.method !== "POST") return json({ error: "method" }, 405);
      const origin = req.headers.get("origin"); if (origin && origin !== u.origin) return json({ error: "origin" }, 403);
      const type = (req.headers.get("content-type") || "").split(";")[0]; if (!IMG[type]) return json({ error: "Photos must be JPEG, PNG, WebP or HEIC." }, 415);
      const jid = String(u.searchParams.get("job") || "new"); let prefix = "intake";
      if (jid !== "new") { if (!ID.test(jid)) return json({ error: "job" }, 400); const r = await load(jid); if (!r || !canAct(user, r, "photo")) return json({ error: "forbidden" }, 403); prefix = `jobs/${jid}`; }
      const buf = await req.arrayBuffer(); if (!buf.byteLength || buf.byteLength > MAXB) return json({ error: "Photo too large (6 MB max)." }, 413);
      const key = `${prefix}/${crypto.randomUUID()}`;
      await blobs().set(key, buf, { metadata: { type, by: actor(user), at: now() } });
      return json({ ok: true, key });
    } catch (e) { console.error("photo store error", e?.message); return json({ error: "Photo storage is unavailable." }, 503); }
  }

  // ---- Public tenant request form (/request), only when PORTAL_PUBLIC_REQUEST=on ----
  const REQ_WIN = 60 * 60 * 1000, REQ_IP_MAX = 5, REQ_ALL_MAX = 60;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const SAFE = `<div class="em"><b>Emergency?</b> If anyone is in danger call <b>000</b>. Gas smell: leave the building and call ATCO Gas faults on <b>13 13 52</b>. Power out or sparking: stay clear and call Western Power on <b>13 13 51</b>. Burst pipe or flooding: stay clear of power points and appliances near water. Then send this form so we can arrange a contractor.</div>`;
  const MM_LOGO = `<svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" rx="14" fill="#FFC93C"/><path d="M24 9L40 22V37H8V22Z" fill="#0F1B3D" stroke="#0F1B3D" stroke-width="5" stroke-linejoin="round"/><g transform="translate(12 15)" fill="none" stroke="#FFC93C" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></g></svg>`;
  const MM_MATT = `<svg viewBox="0 0 200 200" role="img" aria-label="Matt, the Maintenance Mate AI"><path d="M34 200v-16c0-13 10-22 23-22h86c13 0 23 9 23 22v16z" fill="#8FD3FF"/><rect x="68" y="160" width="14" height="40" fill="#FF6B3D"/><rect x="118" y="160" width="14" height="40" fill="#FF6B3D"/><rect x="12" y="108" width="24" height="46" rx="12" fill="#FF6B3D"/><rect x="164" y="108" width="24" height="46" rx="12" fill="#FF6B3D"/><rect x="30" y="74" width="140" height="100" rx="46" fill="#FFC93C"/><rect x="50" y="96" width="100" height="62" rx="29" fill="#0F1B3D"/><circle cx="78" cy="123" r="10" fill="#19C3A8"/><circle cx="122" cy="123" r="10" fill="#19C3A8"/><path d="M82 141 Q100 155 118 141" fill="none" stroke="#19C3A8" stroke-width="7" stroke-linecap="round"/><path d="M30 86C30 44 62 20 100 20s70 24 70 66z" fill="#FF6B3D"/><rect x="15" y="80" width="170" height="17" rx="8.5" fill="#FF6B3D"/><rect x="15" y="90" width="170" height="7" rx="3.5" fill="#E0501F"/><circle cx="100" cy="52" r="19" fill="#0F1B3D"/><g transform="translate(85 37) scale(1.25)" fill="none" stroke="#FFC93C" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></g></svg>`;
  const shell = (inner, status = 200) => new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Report a repair · Maintenance Mate</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600..800&family=Manrope:wght@400;500;600;700;800&display=swap"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48'%3E%3Crect width="48" height="48" rx="14" fill="%23FFC93C"/%3E%3Cpath d="M24 9L40 22V37H8V22Z" fill="%230F1B3D" stroke="%230F1B3D" stroke-width="5" stroke-linejoin="round"/%3E%3Cg transform="translate(12 15)" fill="none" stroke="%23FFC93C" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/%3E%3C/g%3E%3C/svg%3E"><meta name="theme-color" content="#0F1B3D"><style>*{box-sizing:border-box}body{margin:0;background:#EEF1FA;font:16px/1.5 Manrope,system-ui,sans-serif;color:#0F1B3D}main{max-width:560px;margin:0 auto;padding:28px 18px 60px}
h1{font:800 2.2rem/1.08 'Bricolage Grotesque',Georgia,serif;letter-spacing:-.025em;margin:10px 0 10px;color:#0F1B3D}.cap{display:inline-flex;align-items:center;gap:8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;font-weight:800;color:#0F1B3D}form{display:grid;gap:16px;background:#fff;padding:22px;border:2px solid #0F1B3D;border-radius:20px;box-shadow:5px 5px 0 #0F1B3D}
label{display:grid;gap:6px;font-size:14px;font-weight:700}input,textarea{width:100%;padding:12px 14px;border:2px solid #0F1B3D;border-radius:12px;font:inherit;background:#fff}fieldset{border:0;padding:0;margin:0;display:flex;flex-wrap:wrap;gap:8px}
legend{font-size:14px;font-weight:800;margin-bottom:6px}.ck{display:inline-flex;align-items:center;gap:8px;border:2px solid #0F1B3D;border-radius:999px;padding:8px 14px;font-weight:600;background:#fff}.ck input{width:auto}
button{padding:14px;border:2px solid #0F1B3D;border-radius:14px;background:#FF6B3D;color:#0F1B3D;font:inherit;font-weight:800;cursor:pointer;box-shadow:3px 3px 0 #0F1B3D}.muted{color:#3D4A73;font-size:14px}.em{background:#FFE3D6;border:2px solid #0F1B3D;border-radius:14px;padding:14px 16px;font-size:14px;margin:14px 0}
.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}.e{color:#B3202A;font-size:14px;font-weight:700}input:focus,textarea:focus,select:focus,button:focus-visible{outline:3px solid #FF6B3D;outline-offset:2px}button:active{transform:translate(3px,3px);box-shadow:none!important}.cap svg{width:26px;height:26px;flex:none}.mt{display:flex;align-items:center;gap:12px;margin:14px 0 6px}.mt svg{width:64px;height:64px;flex:none}.mt p{margin:0;background:#fff;border:2px solid #0F1B3D;border-radius:16px;padding:10px 14px;font-weight:700;font-size:15px;line-height:1.4;box-shadow:3px 3px 0 #FFC93C}.pw{margin:22px 0 0;font-size:13px;font-weight:700;color:#3D4A73;text-align:center}${TENANT_FORM_CSS}</style></head><body><main>${inner}<p class="pw">Powered by Maintenance Mate</p></main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
  const form = (msg = "", v = {}, errs = []) => shell(renderForm({ esc, MM_LOGO, MM_MATT, SAFE, msg, errs, v }));
  async function requestPage(req, context) {
    if (req.method === "GET") return form();
    if (req.method !== "POST") return new Response("method", { status: 405 });
    const raw = String(context?.ip || "unknown"), ip = raw.includes(":") ? raw.toLowerCase().split(":").slice(0, 3).join(":") + "::/48" : raw, bucket = Math.floor(Date.now() / REQ_WIN);
    let f; try { f = await req.formData(); } catch { return form("Something went wrong reading the form. Try again."); }
    const { v, errs } = parseSubmission(f, t);
    if (v.website) return shell(renderThanks({ esc, MM_LOGO, MM_MATT, SAFE, wo: null, flag: "" })); // honeypot: pretend success, store nothing
    try {
      if ((await inc(`req:ip:${ip}`, bucket)) > REQ_IP_MAX || (await inc("req:global", bucket)) > REQ_ALL_MAX)
        return shell(`<h1>Too many requests</h1><p>Please try again in an hour, or call your property manager.</p>`, 429);
    } catch { return shell(`<h1>Form unavailable</h1><p>Please try again later or call your property manager.</p>`, 503); }
    if (errs.length) return form("", v, errs);
    const photos = [];
    try {
      for (const p of f.getAll("photos").slice(0, 3)) {
        if (!p || typeof p === "string" || !p.size) continue; const type = p.type || "";
        if (!IMG[type] || p.size > MAXB) continue; const key = `intake/${crypto.randomUUID()}`;
        await blobs().set(key, await p.arrayBuffer(), { metadata: { type, by: "tenant_form", at: now() } }); photos.push(key);
      }
      const job = buildJob(v), hints = job.hints.filter((h) => HINTS.includes(h));
      const { r, rt } = await createNative({ address: job.address, tenant_name: job.tenant_name, tenant_contact: job.tenant_contact, description: job.description, location: job.location, title: job.title, hints, photos }, "Tenant request form", "tenant_form");
      await db().sql`INSERT INTO job_step (job_id, action, detail, actor) VALUES (${r.job_id}, 'create', ${JSON.stringify({ routed: rt.matched, pm: r.pm, office: r.office, origin: "tenant_form", urgency: job.urgency, type: v.cat })}, 'Tenant request form')`;
      return shell(renderThanks({ esc, MM_LOGO, MM_MATT, SAFE, wo: r.wo, flag: job.flag }));
    } catch (e) { console.error("request form error", e?.message); return shell(`<h1>Form unavailable</h1><p>Your request was not saved. Please try again later or call your property manager.</p>`, 503); }
  }
  return { jobsApi, photoApi, requestPage, load, canAct };
}
