# Example Property Co — Maintenance Recovery Portal · Design v1 (Dina)

## Files
- tokens.css — CSS custom properties (import first). tokens.json — same values for JS/Tailwind, plus status/grade maps and AA pairings.
- components.css — app shell, cards, buttons, inputs, tables, chips, grade badges, empty states, responsive rules (breakpoints 1000px / 700px).
- styleguide.html — every component. director.html, pm-workspace.html, suppliers.html, comms.html — static screens.
- share/*.jpg — renders at 1440 (all screens) and pm-workspace-390.jpg. gen.py builds the HTML; render.py re-renders (Playwright + system Chrome).

## Tokens
- Navy #0F1E33 = chrome/primary buttons; Ivory #F7F4EE = page; White = cards; Platinum/Silver = text and borders on navy.
- Brass #B08D57 is the ONE accent: active nav, 48px rules, focus ring, eyebrow on navy. On light surfaces use --brass-ink #7A5E30.
- Type: Cormorant Garamond 600 for headings and big numbers; Inter for UI/body; use `.num` (tabular figures) for metrics.
- Spacing 4px base (--s-1…--s-8), radius sm 4 / md 8 / lg 14 / pill, elevation --e-1..3.

## Components
- Status: `<span class="chip safe|watch|risk|critical">Label</span>` — CSS adds icon (✓ ◐ ▲ ■). Always keep the text label; never colour alone.
- Grades: `<span class="grade a|b|c|d" aria-label="Grade A">A</span>`.
- Tables: wrap in `.tablewrap` (horizontal scroll); `.hide-sm` hides secondary columns under 700px.
- Comms: preview layout = template editor (left) + rendered send preview with Previous/Skip/Approve & queue. Nothing sends without approval.
- Mobile: sidebar collapses to a top bar with a Menu button (wire up a drawer).

## Data mapping / proposed rules (confirm with the owner)
- Office status thresholds and supplier A–D grading cut-offs are proposals (see each screen). With them, no supplier currently reaches A — shown as the empty state.
- Recovery-plan owners are roles (Office leads, Property managers, Director, Automation); the data has no office-lead names.
