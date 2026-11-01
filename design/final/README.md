# Example Property Co: Maintenance Recovery Portal · FINAL design handoff
Palette **D, Midnight & Rose Gold** (chosen by the owner). This folder is the build reference. v1 (`../`) and v2 (`../v2/`, including `palettes/`) are archive only.

## Files
- `tokens.css`: palette D is the default. No separate palette layer.
- `tokens.json`: the same values, plus semantic roles, status colours, grades and contrast results.
- `app.css`: all components; it imports tokens.css.
- Screens:
  - `director.html`: Director overview.
  - `pm-workspace.html`: PM "My portfolio" (the PM's own portfolio and its maintenance backlog), designed mobile first.
  - `suppliers-database.html`: supplier and contractor directory (separate from scorecards). Data: `suppliers-data.json`.
  - `suppliers.html`: supplier scorecards.
  - `comms.html`: Automation & comms. Supplier chase queue and preview, plus full tenant delay and owner update letter previews.
  - `styleguide.html`.
- `share/`: renders at 1440 for every screen (6), plus `pm-workspace-390.jpg`, `suppliers-database-390.jpg` and `director-390.jpg`.
- `gen.py` rebuilds the HTML and `render.py` re-renders (Playwright + system Chrome).
- Note: variable names keep their v2 names (`--navy-*`, `--champagne-*`) so the CSS didn't change. The values are midnight and rose gold.

## Palette D
| Role | Token | Hex |
|---|---|---|
| Page | --ivory / --bg | #F7F3F1 pearl |
| Surface | --paper | #FFFCFB |
| Text | --ink | #1A1B26 |
| Muted text | --silver-700 | #5E5E6D |
| Primary | --navy-900 | #171927 midnight (hover #282C42, deep #0D0E18, soft #4C5170) |
| On primary | white / --platinum | #FFFFFF / #ECE6EA |
| Accent | --champagne | #D4A491 rose gold: hairlines, dots, focus ring, captions on midnight ONLY |
| Accent text | --champagne-ink | #8A5240, for italic headline accents and links on light |
| Merge field | --champagne-bg | #F6E6E0 |
| Status | safe / watch / risk / critical | #2F6B50 / #7A5B0C / #A4481A / #9E2626, tints #E6F0EA / #F6EED6 / #F9E7DC / #F7E1E1 |
| Grades A–D | --grade-a…d | #2F6B50 / #4C5170 / #7A5B0C / #9E2626 |

## Contrast (WCAG AA, all pass)
- Text on page: 15.5:1. White on midnight: 17.6:1. Rose gold on midnight: 7.9:1. Grade B on surface: 7.6:1.
- Tightest pairings (keep these limits):
  - **At risk on its tint: 4.97:1.** Don't lighten #A4481A or darken #F9E7DC, and keep the chip text at least 13px/500.
  - Accent text on a merge field: 5.15:1.
  - Safe on tint: 5.39:1. Watch on tint: 5.44:1. At risk on page: 5.41:1.
- Plain rose gold #D4A491 fails on light backgrounds, so never use it for text on pearl or white.
- Status is always icon shape + label + colour. Grades are letter + label + aria-label.

## Open assumptions (confirm with the owner before go-live)
1. Recovery goal: 70% of open jobs on target by December. This is a proposal; it's currently 27% (249 of 919).
2. Office status thresholds (Safe / Watch / At risk / Critical) are proposals.
3. Supplier A–D cut-offs: overdue below 25% plus a reply within 3 days for A, 25–45% for B, 45–65% for C, above 65% or a reassign candidate for D. These are proposals, and no supplier reaches A on the scorecards screen.
4. Recovery-plan owners are roles (Office leads, Property managers, Director, Automation). The data has no office-lead names.
5. Tenant and owner names and contact details are not in the data. The letters use `{{tenant_name}}` / `{{owner_name}}`, and the delivery addresses need a source.
6. Still to build: the mobile swipe gesture on work rows (`.swipe` currently shows buttons) and the mobile menu drawer (the top-bar nav is hidden under 640px; the `.tabbar` exists).
7. The dates and promises in the sample letters (for example "confirm by Tuesday 27 October") are illustrative. Fill them from the job's next_due.

## Component notes
The full notes are in `../v2/README.md`, and they still apply: `.row`, `.st`/`.pill`, `.sup.a–d`, `.ring`/`.prog`, `.empty`, `.split` + `.letter` + `.field`. Keep one `.btn-primary` per screen. Nothing sends without approval.

## Wording
No "today" or "my day" framing. The PM screen is **My portfolio**: "Good evening, Alex. Your portfolio has 193 open maintenance jobs, and 10 urgent ones to clear first." The **Backlog focus** progress shows Urgent cleared (0 of 10) and Backlog on target (58 of 193). Nav and tab label: My portfolio. Comms counts read "ready for review".

## Supplier directory (`suppliers-database.html`)
- **Schema** mirrors the supplier tracker `/workspace/outreach/supplier-tracker.csv` (supplier_id, business_name, contact, trade, regions_covered, licence_number/expiry, public liability, workers comp, ABN, rates, panel_status, performance metrics, notes). `suppliers-data.json` uses the same field names, so a future contractor list can be appended to `panel[]` (or to a prospects list) without layout changes.
- **panel_status**: Panel (193 Tapi suppliers with open jobs) / Prospect (Proud Plumbing & Gas, the detail example) / Unvetted (2,074 rows from `/workspace/property-contractors-all-areas.csv` (1,976) + `/workspace/property-suppliers-all-areas.csv` (98), always labelled "No licence or insurance checks").
- **Placeholders**: contacts, licence/insurance expiry, regions for prospects, and rates (`[rate]`/`[fee]`) are not in the data and render as dashed italic "not on file". Never show real rates or prices.
- **Grades** come from the Tapi Supplier board (overdue % + median days since action). Trade for panel suppliers is *inferred from the business name*, so replace it with tracker data. Regions come from the suburbs of their open jobs.
- **Trade mix and regions** come from `/workspace/platinum/analysis-summary.md` (11,092 jobs, 523 suppliers). That file is INTERNAL (it contains tenant addresses); only aggregates are used and no addresses from it appear.
- **Proud Plumbing & Gas**: licences PL 9874 / GF 014602 are claimed and shown as "Not yet verified on register". The ~4.9★ from ~890 Google reviews is external.
- Filters: status, trade, area (Perth/Mandurah/Bunbury/Geraldton), grade, compliance, preferred. Entry points: Add supplier and Import a contractor list, plus a no-results empty state. On desktop the detail is a sticky panel; on mobile it's a bottom sheet (build it as a drawer).
- The prospect lists cover Cockburn, Rockingham, Mandurah, Fremantle and Kwinana only. There are none for Bunbury or Geraldton, which are Platinum's busiest regions.
