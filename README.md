# Maintenance Mate

A property-maintenance portal for real estate agencies: a job dashboard per property manager and office, triage and urgency rules, a supplier directory with logged contact (email, SMS, web form, call), MM job references, outgoing-inspection (vacate) rules, and an optional supplier self-join form.

**This public copy contains code and design files only. No sample data, supplier lists, jobs, staff, tenant details or keys are included.** Generated data files (`netlify-site/netlify/lib/jobs_index.js`, `join_index.js`, `people.js`) are empty stubs.

## Layout
- `app/` — static portal pages, `assets/portal.js` front end, `build_data.py` (builds `app/data/*` from your job and supplier exports), `config.json` (thresholds and rules)
- `netlify-site/` — Netlify deploy: edge-function auth (`netlify/edge-functions/auth.js`), APIs (`netlify/lib/`), Netlify DB migrations, `sync.sh` to copy the build into `public/`
- `design/` — design tokens, CSS and design notes

## Run it
1. Put your own exports where `app/build_data.py` expects them and run `python3 app/build_data.py`.
2. `cd netlify-site && npm install && sh sync.sh`
3. Copy `.env.example` values into your Netlify site's environment variables (create users with `python3 add_user.py you@example.com`).
4. `npx netlify dev` locally, or `npx netlify deploy --prod`.
