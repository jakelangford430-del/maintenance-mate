// Browser test for the staff portal front end (app/assets/portal.js): the "New from tenants" panel and the job screen.
// Uses sample data and a mocked /api, so it needs no database or real exports.
// Needs Playwright with Chromium; the whole file is skipped when Playwright isn't installed.
// Run with: node --test "test/*.test.mjs"  (from the netlify-site folder)
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
let chromium = null;
try { ({ chromium } = require("playwright")); } catch { /* not installed: tests below are skipped */ }
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../app");

const now = Date.now(), ago = (h) => new Date(now - h * 3600e3).toISOString();
const bm = { open: 1, outstanding_cap: 10, outstanding_gap: 0, overdue: 0, overdue_cap: 3, overdue_gap: 0, overdue_pct: 0, days_past_sla: 0, triage: { P1: 0, P2: 0, P3: 1, P4: 0 } };
const ug = { open_now: 0, open_30d_ago_est: 0, open_7d_ago_est: 0, change_vs_30d: 0, change_vs_7d: 0, cleared_30d: 0, cleared_per_week_30d: 0, recent_wins: [] };
const PORTAL = {
  as_of: "2026-11-07", public_build: false, config: { property_categories: {}, recovery_goal_pct: 50, vacate: {} },
  jobs: [{ id: "T100", wo: "MM-0101", title: "Back fence panel down", address: "8 Banksia Ct, Mandurah", office: "Mandurah", pm: "Sam Green", triage: "P3", trade: "Fencing & gates",
    lodged: "2026-10-20", days_open: 19, sla_days: 28, overdue: false, days_past_sla: 0, supplier: null, needs_trade: true, next_due: "2026-11-17", stage: "Awaiting quote", source: "tapi", source_ref: "TP-55", pcat: "general" }],
  vacate: [], closed: [], offices: [{ office: "Mandurah" }], snapshots: [{ built_at: ago(5) }],
  benchmarks: { params: { target_turnaround_weeks: 4, overdue_share_of_cap: 0.2 }, portfolio: bm, offices: { Mandurah: bm } },
  urgent: { portfolio: ug, offices: { Mandurah: ug } }, weekly: { weeks: [{ lodged: 3 }, { lodged: 4 }], basis: "" },
  suppliers_dir: { preferred: { by_office: {}, basis: "" } }, matt: { batches: [] }, find_trade: { suggested: {} },
};
const desc = (words, type, urg) => `${words}\n\nReported on the tenant form.\nType: ${type}\nTenant marked it: ${urg}\nStarted: Today · Happened before: No\nIf out: OK to enter with a key · Best time: Morning · Pets: No pets\nSuburb line: Mandurah WA 6210`;
const row = (o) => ({ source: "native", origin: "tenant_form", location: null, office: "Mandurah", pm: "Sam Green", hints: "[]", photos: "[]", test: false, stage: "new", triage: null, trade: null, quotes: "[]", created_by: "Tenant request form", ...o });
const API = {
  jobs: [
    row({ job_id: "MM-1001", wo: "MM-1001", title: "Leaking tap", description: desc("Drips all day.", "Plumbing and water › Leaking tap", "Can wait a few days"), address: "4/14 Sample Ave, Mandurah", tenant_name: "Alex Tenant", tenant_contact: "0412 345 678 · alex@example.com", created_at: ago(30), hints: '["water"]', photos: '["intake/abcdef12-0000"]' }),
    row({ job_id: "MM-1002", wo: "MM-1002", title: "URGENT: Gas smell", description: desc("Smell of gas in the kitchen", "Gas › Gas smell", "Emergency"), address: "6 Kestrel Pl, Mandurah", pm: null, tenant_name: "Jo Renter", tenant_contact: "0400 000 111", created_at: ago(2), hints: '["gas"]' }),
    row({ job_id: "MM-1004", wo: "MM-1004", title: "Blocked gutter", description: desc("Overflowing", "Roof and gutters › Blocked gutter", "Urgent"), address: "1 Test Ave, Perth", office: "Perth", pm: "Other PM", created_at: ago(1) }),
    row({ job_id: "MM-1003", wo: "MM-1003", title: "Oven not heating", description: "Oven element dead", address: "3 Coral Way, Mandurah", origin: "pm", stage: "quoting", triage: "P3", trade: "Appliances", created_by: "Sam Green", created_at: ago(100),
      quotes: JSON.stringify([{ id: "q1", supplier: "Ace Appliances", status: "received", amount: 320, note: "parts in stock", requested_at: ago(90), received_at: ago(50) }, { id: "q2", supplier: "Bright Sparks", status: "requested", amount: null, requested_at: ago(90) }]) }),
  ],
  steps: [
    { id: 6, job_id: "MM-1003", action: "quote_record", detail: '{"supplier":"Ace Appliances","amount":320}', actor: "Sam Green", created_at: ago(50) },
    { id: 5, job_id: "MM-1003", action: "quotes_request", detail: '{"suppliers":["Ace Appliances","Bright Sparks"]}', actor: "Sam Green", created_at: ago(90) },
    { id: 4, job_id: "MM-1003", action: "triage", detail: '{"triage":"P3","trade":"Appliances"}', actor: "Sam Green", created_at: ago(95), undone_by: "Sam Green", undone_at: ago(94) },
    { id: 3, job_id: "MM-1003", action: "create", detail: '{"routed":"property_pm","pm":"Sam Green"}', actor: "Sam Green", created_at: ago(100) },
    { id: 2, job_id: "MM-1002", action: "create", detail: '{"routed":"suburb","pm":null,"office":"Mandurah","origin":"tenant_form","urgency":"emergency"}', actor: "Tenant request form", created_at: ago(2) },
    { id: 1, job_id: "MM-1001", action: "create", detail: '{"routed":"property_pm","pm":"Sam Green","origin":"tenant_form","urgency":"routine"}', actor: "Tenant request form", created_at: ago(30) },
  ],
  limits: [{ prop_key: "3 coral way mandurah", address: "3 Coral Way, Mandurah", amount: 500, note: null, set_by: "Sam Green", set_at: ago(200) }],
  me_office: "Mandurah",
};

async function open(browser, url, { who = "admin", width = 1280 } = {}) {
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [], posts = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", async (rt) => {
    const u = new URL(rt.request().url()), p = u.pathname;
    if (p === "/data/portal.js") return rt.fulfill({ contentType: "text/javascript", body: "window.PORTAL=" + JSON.stringify(PORTAL) });
    if (p === "/data/contacts.js") return rt.fulfill({ contentType: "text/javascript", body: "window.CONTACTS={suppliers:[]}" });
    if (p === "/api/me") return rt.fulfill({ json: who === "pm" ? { admin: false, via: "pm", person: "Sam Green" } : { admin: true, via: "password", person: "admin@example.com" } });
    if (p === "/api/jobs") { if (rt.request().method() === "POST") { posts.push(rt.request().postDataJSON()); return rt.fulfill({ json: { ok: true, step: { id: 99 } } }); } return rt.fulfill({ json: API }); }
    if (p === "/api/email-log") return rt.fulfill({ json: { events: [] } });
    if (p === "/api/archive") return rt.fulfill({ json: { archived: [] } });
    if (p === "/api/vacate") return rt.fulfill({ json: { overrides: [] } });
    if (p === "/api/photo") return rt.fulfill({ contentType: "image/svg+xml", body: '<svg xmlns="http://www.w3.org/2000/svg"/>' });
    if (u.hostname !== "portal.test") return rt.fulfill({ body: "" }); // fonts etc.
    const f = path.join(APP, p);
    return fs.existsSync(f) && fs.statSync(f).isFile() ? rt.fulfill({ path: f }) : rt.fulfill({ status: 404, body: "" });
  });
  await page.goto("http://portal.test/" + url);
  await page.waitForSelector("main > *");
  return { page, errors, posts };
}

test("staff portal UI", { skip: !chromium && "Playwright is not installed" }, async (t) => {
  const browser = await chromium.launch();
  t.after(() => browser.close());

  await t.test("overview lists new tenant requests, emergency first, with a nav badge", async () => {
    const { page, errors } = await open(browser, "director.html");
    const rows = await page.locator(".tnq .row .wo").allInnerTexts();
    assert.deepEqual(rows, ["MM-1002", "MM-1004", "MM-1001"], "emergency, then urgent, then routine; triaged jobs left out");
    assert.match(await page.locator(".tnq-em").innerText(), /emergency request is waiting/);
    assert.equal(await page.locator("nav .nb").first().innerText(), "3");
    assert.match(await page.title(), /^\(3\) /);
    assert.match(await page.locator(".mm-say").innerText(), /3 new tenant requests are waiting, 1 marked emergency/);
    assert.deepEqual(errors.filter((e) => !/NaN/.test(e)), []);
  });

  await t.test("the PM page only shows the PM's own requests and their office's shared queue", async () => {
    const { page } = await open(browser, "pm.html?pm=Sam%20Green", { who: "pm" });
    assert.deepEqual(await page.locator(".tnq .row .wo").allInnerTexts(), ["MM-1002", "MM-1001"]);
  });

  await t.test("job screen shows the tenant's answers, quotes and timeline", async () => {
    const { page, errors } = await open(browser, "job.html?id=MM-1001");
    assert.equal(await page.title(), "MM-1001 · Leaking tap · Maintenance Mate");
    const text = await page.locator("main").innerText();
    for (const s of ["Tenant says", "Can wait a few days", "If they're out", "OK to enter with a key", "Photos from the tenant", "from the tenant form", "Matt suggests"]) assert.ok(text.toLowerCase().includes(s.toLowerCase()), "missing " + s); // captions are upper-cased by CSS
    assert.equal(await page.locator('.jten a[href="tel:0412345678"]').count(), 1, "tap-to-call in the header");
    assert.equal(await page.locator(".jphotos img").count(), 1);
    assert.equal(await page.locator(".jtrack li.now b").innerText(), "Logged");
    const q = await open(browser, "job.html?id=MM-1003");
    assert.equal(await q.page.locator(".jtrack li.now b").innerText(), "Quotes");
    assert.equal(await q.page.locator(".jq tbody tr").count(), 2);
    assert.equal(await q.page.locator(".jtl li.und").count(), 1, "undone step is shown struck through");
    assert.deepEqual([...errors, ...q.errors], []);
  });

  await t.test("the next step button on the job screen posts the step", async () => {
    const { page, posts } = await open(browser, "job.html?id=MM-1001");
    await page.click('.jact [data-nx$="|triage"]');
    await page.click(".modal [data-go]");
    await page.waitForTimeout(300);
    assert.equal(posts.length, 1);
    assert.equal(posts[0].action, "triage"); assert.equal(posts[0].job_id, "MM-1001");
  });

  await t.test("job references link to the job screen", async () => {
    const { page } = await open(browser, "pm.html?pm=Sam%20Green");
    assert.equal(await page.locator('a.wo[href="job.html?id=MM-1003"]').count(), 1);
  });

  await t.test("unknown job shows a plain message", async () => {
    const { page } = await open(browser, "job.html?id=NOPE");
    assert.match(await page.locator("main").innerText(), /couldn't find that job/);
  });

  await t.test("job screen and PM page fit a phone screen", async () => {
    for (const url of ["job.html?id=MM-1002", "pm.html?pm=Sam%20Green"]) {
      const { page } = await open(browser, url, { width: 390 });
      const [sw, cw, left] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth, document.querySelector("main").getBoundingClientRect().left]);
      assert.equal(sw, cw, url + " scrolls sideways"); assert.equal(left, 0, url + " leaves room for the hidden sidebar");
    }
  });
});
