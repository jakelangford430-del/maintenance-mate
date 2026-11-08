# Maintenance Mate: brand and design system

This is the current look for the portal. `design/v2` and `design/final` are archived (the old Midnight and Rose Gold direction) and are not loaded by the app.

## Files
- `tokens.css` and `tokens.json`: palette, type, spacing, radius and depth. The old variable names (`--navy-*`, `--champagne*`, `--platinum`) are kept so existing components pick up the new values with no rewrite.
- `theme.css`: the restyle layer. It must load **after** `app.css`, `portal.css` and `system.css`.
- `brand/`: `mark.svg` (logo mark: a solid navy house with a yellow wrench through it, on a yellow tile), `matt.svg` (Matt), `favicon.svg`.
- In the app these are copied to `app/assets/` (`tokens.css`, `mm-theme.css`, `brand/`). Edit here, then copy.

## Look
Playful and confident, but still a working tool. Navy ink, a bright orange for the main action, teal for "good", yellow for highlights and sky blue for neutral information. Headings are Bricolage Grotesque 800, UI text is Manrope. Cards and buttons have a 2px navy outline and a hard offset shadow, which is the signature.

| Role | Colour |
|---|---|
| Ink / chrome | #0F1B3D (deep #0A1230, raised #1B2B5E) |
| Primary action, accents | #FF6B3D (text version on light: #A83A12) |
| Good / approved | #19C3A8 (text: #0B6B5A) |
| Highlight, active nav | #FFC93C |
| Neutral info | #8FD3FF (tint #DCEEFF) |
| Page | #EEF1FA |

### Rules
- Navy text on orange, teal and yellow. Never white on those.
- Plain orange is for fills, dots and focus rings. Text on light uses `--champagne-ink` (#A83A12).
- One orange (`.btn-primary`) button per screen.
- Status is always icon shape, label and colour. Never colour alone.
- Dense tables keep thin hairlines inside the outlined panel. The chunky outline goes on the panel, not on every row.
- Touch targets stay at least 44px on mobile.

## Matt
Matt is the Maintenance Mate AI: a yellow robot tradie with a navy screen face, teal eyes, an orange hard hat with a wrench badge, and a sky-blue work shirt with orange overall straps.
- `.mm-matt` banner at the top of every page (added in `portal.js`, `mattLine()`): Matt in a yellow ring, one bold line built from the real counts on screen, and on the Overview, Backlog and PM pages three live tiles (Open, Urgent, Overdue).
- `.mattbox` for his suggestions and shortlists: yellow tint with his face beside the caption.
- Public forms: Matt greets the tenant on `/request`.
- Use `brand/matt.svg` anywhere else. Keep him on navy or white, never on yellow.

## Voice
Warm, plain and Aussie. Short sentences. Say what is happening and what happens next.
- Matt says "G'day", "I'll keep chasing the rest", "Check them over and I'll draft the quote requests".
- Be straight about limits. The portal never sends on its own: keep "Nothing sends without your say-so" wherever a draft appears.
- No jargon, no exclamation marks in errors, no cutesy words for serious things (safety, gas, power, water).
- Emergency copy on the tenant form is unchanged and must stay plain.
- Say "your property manager", not "the system".

| Instead of | Say |
|---|---|
| Request submitted successfully | Thanks, we've got it |
| No items found | Nothing here yet. I'll shout if that changes |
| Action required | Needs your okay |
| Processing | I'm onto it |

## Adding to a new page
```html
<link rel="stylesheet" href="assets/app.css">
<link rel="stylesheet" href="assets/portal.css">
<link rel="stylesheet" href="assets/system.css">
<link rel="stylesheet" href="assets/mm-theme.css">
<link rel="icon" type="image/svg+xml" href="assets/brand/favicon.svg">
```
Server-rendered pages (`/request`, `/join`, sign-in) carry their own small inline stylesheet using the same tokens. Update those three in `netlify-site/netlify/lib/jobs_api.js`, `suppliers_api.js` and `edge-functions/auth.js` if the palette changes.
