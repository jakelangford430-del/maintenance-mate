// Run with: node --test "test/*.test.mjs"  (from the netlify-site folder, after npm install)
// Exercises the public tenant request form without a database: GET render, validation, honeypot, rate limit and the job it creates.
import test from "node:test";
import assert from "node:assert/strict";
import { makeJobs } from "../netlify/lib/jobs_api.js";
import { CATEGORIES, EMERGENCY } from "../netlify/lib/tenant_categories.js";

function setup({ count = 1 } = {}) {
  const queries = [];
  const db = () => ({ sql: async (strings, ...vals) => { const q = strings.join("?"); queries.push({ q, vals }); return q.includes("MAX(n)") ? [{ m: 0 }] : []; } });
  const api = makeJobs({ db, json: (b, s = 200) => new Response(JSON.stringify(b), { status: s }), pmName: () => null, env: () => "", inc: async () => count });
  return { api, queries };
}
const post = (api, fields) => { const fd = new FormData(); for (const [k, v] of Object.entries(fields)) fd.append(k, v); return api.requestPage(new Request("https://x.test/request", { method: "POST", body: fd }), { ip: "203.0.113.9" }); };
const valid = { street: "14 Sample Ave", unit: "4", suburb: "Mandurah", state: "WA", postcode: "6210", tenant_name: "Alex Tenant", mobile: "0412 345 678", email: "", cat: "plumbing", sub_plumbing: "Leaking tap", description: "Drips all day and pools under the sink.", urgency: "urgent" };
const text = async (r) => (await r.text()).replace(/&#39;/g, "'"); // the page escapes apostrophes as &#39;
const jobInsert = (queries) => queries.find((x) => x.q.includes("INSERT INTO job_flow"));

test("GET renders every category, the safety banner and Matt", async () => {
  const { api } = setup(); const r = await api.requestPage(new Request("https://x.test/request"), {}); const h = await text(r);
  assert.equal(r.status, 200);
  assert.equal((h.match(/class="ct"/g) || []).length, CATEGORIES.length);
  for (const k of ["name=\"street\"", "name=\"suburb\"", "name=\"state\"", "name=\"postcode\"", "name=\"tenant_name\"", "name=\"description\"", "name=\"photos\"", "Emergency?", "ATCO Gas", "Matt", "Powered by Maintenance Mate"]) assert.ok(h.includes(k), "missing " + k);
});

test("empty POST lists friendly errors and saves nothing", async () => {
  const { api, queries } = setup(); const r = await post(api, {}); const h = await text(r);
  assert.equal(r.status, 200);
  for (const m of ["street address and suburb", "Add your name", "mobile number or an email", "Pick what's wrong", "bit more about the problem"]) assert.ok(h.includes(m), m);
  assert.ok(!jobInsert(queries));
});

test("honeypot pretends success and stores nothing", async () => {
  const { api, queries } = setup(); const r = await post(api, { ...valid, website: "http://spam.example" }); const h = await text(r);
  assert.ok(h.includes("Thanks, we've got it")); assert.ok(!h.includes("reference")); assert.equal(queries.length, 0);
});

test("rate limit returns 429", async () => {
  const { api } = setup({ count: 99 }); const r = await post(api, valid); assert.equal(r.status, 429);
});

test("a normal request becomes a job with a plain-language description", async () => {
  const { api, queries } = setup(); const r = await post(api, valid); const h = await text(r);
  assert.equal(r.status, 200); assert.ok(h.includes("MM-1001"), "reference shown");
  const all = jobInsert(queries).vals.map(String).join("\n");
  assert.ok(all.includes("4/14 Sample Ave, Mandurah"), "address composed so routing by suburb still works");
  assert.ok(all.includes("Leaking tap")); assert.ok(all.includes("0412 345 678"));
  assert.ok(all.includes("Type: Plumbing and water › Leaking tap")); assert.ok(all.includes("Tenant marked it: Urgent"));
  assert.ok(all.includes("Suburb line: Mandurah WA 6210")); assert.ok(all.includes('["water"]'), "water hint carried to triage");
});

test("a gas smell is forced to emergency, flagged, and the steps repeat on the thank-you page", async () => {
  const { api, queries } = setup(); const r = await post(api, { ...valid, cat: "gas", sub_gas: "Gas smell", sub_plumbing: "", description: "Smell of gas in the kitchen", urgency: "routine" }); const h = await text(r);
  assert.ok(h.includes("ATCO Gas 13 13 52") && h.includes("flagged as urgent"));
  const all = jobInsert(queries).vals.map(String).join("\n");
  assert.ok(all.includes("URGENT: Gas smell")); assert.ok(all.includes("Tenant marked it: Emergency")); assert.ok(all.includes('["gas"]'));
});

test("tampered category or sub-issue is rejected, not stored", async () => {
  const { api, queries } = setup();
  const bad = await text(await post(api, { ...valid, cat: "bogus" })); assert.ok(bad.includes("Pick what's wrong"));
  const mism = await post(api, { ...valid, cat: "gas", sub_gas: "Leaking tap" }); const t = jobInsert(queries).vals.map(String).join("\n");
  assert.ok(!t.includes("› Leaking tap"), "sub from another category is ignored"); assert.equal(mism.status, 200);
});

test("bad postcode, short mobile and bad email are caught", async () => {
  const { api } = setup(); const h = await text(await post(api, { ...valid, postcode: "62", mobile: "123", email: "nope" }));
  assert.ok(h.includes("four digits")); assert.ok(h.includes("looks short")); assert.ok(h.includes("doesn't look right"));
});

test("typed values are escaped when the form re-renders", async () => {
  const { api } = setup(); const h = await text(await post(api, { ...valid, street: '"><script>alert(1)</script>', description: "" }));
  assert.ok(!h.includes("<script>alert(1)</script>")); assert.ok(h.includes("&lt;script&gt;"));
});

test("tenant tips never talk a tenant through gas, electrical or plumbing repairs", () => {
  const banned = /isolation valve|flip (it|a tripped|the)|reset (the )?(switch|breaker)|turn (the )?(gas|water|power) off|switch (it )?off at the (switchboard|meter|mains)|at the (meter|mains|switchboard)|safety switch has tripped/i;
  const texts = [];
  for (const c of CATEGORIES) { texts.push(c.tip, ...c.tips); }
  for (const k of Object.keys(EMERGENCY)) texts.push(EMERGENCY[k][1]);
  for (const x of texts) assert.ok(!banned.test(x), "unsafe walkthrough in: " + x);
});
