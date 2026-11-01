# Example Property Co portal: design v2 (calm premium)
v1 is unchanged in ../. v2 replaces it as the build reference.

## Files
- tokens.css / tokens.json: palette, status (colour + Lucide icon + label), type, spacing, radius, shadow, blur, easing.
- app.css: all components. Breakpoints are 900px and 640px. The PM workspace is designed mobile first.
- director.html, pm-workspace.html, suppliers.html, comms.html, styleguide.html.
- share/: renders at 1440 for every screen, plus director-390 and pm-workspace-390. gen.py rebuilds the HTML and render.py re-renders.

## Principles
- Each screen opens with an editorial headline (`h1.display`, with an `<em>` champagne italic accent), a lede and ONE `.btn-primary`.
- Hierarchy comes from type and space. Use `.surface` (soft, blurred) or `.navy` sparingly; no card grids or dense tables up front. "View all" handles progressive disclosure.
- Work row (`.row`): job no., title, property, a human line (italic serif), status, and one next action (Reassign / Call owner / Reconfirm / Chase).
- Under 640px the action moves into `.swipe`, a quick-action row standing in for the swipe tray. Wire it to a real swipe-left gesture. `.tabbar` is the bottom nav.
- Status: `.st.safe|watch|risk|critical`, always with its icon shape and label (no colour-only signals). `.pill` adds a tint.
- Supplier portrait: `.sup.a|b|c|d`, with the big grade letter as a watermark (aria-hidden) and the text grade in `.gl`.
- Progress: `.ring` (set `--p`) for recovery and `.prog` for task progress. Empty: `.empty` with `.orb`.
- Comms: `.split` puts the queue on the left and the `.letter` preview on the right. Merge fields are `.field`. Approve & send / Edit / Skip. "Nothing sends without approval" is always visible.
- Icons are inline Lucide SVG (`svg.i`, 1.6 stroke).

## Contrast (AA)
Ink/ivory 15:1, muted/ivory 5.3:1, champagne-ink/ivory 5.4:1, white/navy 16:1, champagne/navy 7:1. Status text on ivory and tints is at least 4.9:1. Plain champagne is never used for text on light backgrounds.

## Assumptions to confirm
Office status thresholds, the A–D cut-offs, and the 70% on-target goal for December are proposals. Plan owners are roles, because the data has no office-lead names.
