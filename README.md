# Maintenance Mate

A property-maintenance portal for real estate agencies: a job dashboard per property manager and office, triage and urgency rules, a supplier directory with logged contact (email, SMS, web form, call), MM job references, outgoing-inspection (vacate) rules, and an optional supplier self-join form.

**This public copy contains code and design files only. No sample data, supplier lists, jobs, staff, tenant details or keys are included.** Generated data files (`netlify-site/netlify/lib/jobs_index.js`, `join_index.js`, `people.js`) are empty stubs.

## Layout
- `app/` — static portal pages, `assets/portal.js` front end, `build_data.py` (builds `app/data/*` from your job and supplier exports), `config.json` (thresholds and rules)
- `netlify-site/` — Netlify deploy: edge-function auth (`netlify/edge-functions/auth.js`), APIs (`netlify/lib/`), Netlify DB migrations, `sync.sh` to copy the build into `public/`
- `design/maintenance-mate/` — the current brand and design system (tokens, theme, logo, Matt, voice guide). `design/v2` and `design/final` are archived

## Run it
1. Put your own exports where `app/build_data.py` expects them and run `python3 app/build_data.py`.
2. `cd netlify-site && npm install && sh sync.sh`
3. Copy `.env.example` values into your Netlify site's environment variables (create users with `python3 add_user.py you@example.com`).
4. `npx netlify dev` locally, or `npx netlify deploy --prod`.

## Tenant request form
The public form at `/request` is server-rendered by `netlify-site/netlify/lib/tenant_form.js` and wired in `jobs_api.js`. It collects the address (street, unit, suburb, state, postcode), contact details, one of 16 problem types with 90+ specific issues, a description, optional photos and urgency. Matt shows a safe first-step tip for each choice, and anything involving gas, sparking or power lines, flooding, a break-in or storm damage shows the emergency steps and is forced to Emergency.

- Edit the problem types, tips and emergency wording in `design/maintenance-mate/tenant-form-categories.json`, then run `node netlify-site/gen_tenant_categories.cjs`.
- The extra answers (problem type, urgency, when it started, entry permission and so on) are written into the job description, so no database change is needed.
- Tenant tips are simple, safe checks only (photos, notes, plug-in checks). The form never talks a tenant through gas, electrical or plumbing repairs, and a test enforces this.
- The emergency phone numbers are Western Australian (ATCO Gas, Western Power). Other states need their own before use.

## New tenant requests
Requests from the tenant form show in a **New from tenants** panel at the top of the Overview and of each PM's workspace. Emergencies come first, then urgent requests, then the oldest. A request stays in the list until someone confirms triage, so it can't drop off just because someone opened it. The Overview link in the sidebar shows a count (orange when one is an emergency), the browser tab shows the count, and Matt mentions them. A PM sees their own requests plus their office's shared queue. No database change: the urgency comes from the job's `create` step.

## Job screen
`app/job.html?id=<job id>` shows one job: the next step, a progress tracker (logged, quotes, owner, booked, completed, invoiced, PropertyMe), the tenant's answers and photos with tap-to-call, the quotes against the owner's approval limit, every step with who and when (undone steps struck through), and the emails prepared for the job. Every job reference (`MM-…`) in the portal links to it. PMs can open it (`/job.html` is in `PM_PAGES`); only the job's PM or an admin can take a step.

## Brand
Brand tokens, theme, logo and the Matt character live in `design/maintenance-mate/`. The app loads `app/assets/mm-theme.css` on every page. Design previews for screens not built yet are in `design/maintenance-mate/mockups/`.

## Tests
`cd netlify-site && npm install && node --test test/*.test.mjs`

`test/portal_ui.test.mjs` drives the staff portal in Chromium with sample data and a mocked API. It's skipped when Playwright isn't installed (`npm install --no-save playwright && npx playwright install chromium`).
