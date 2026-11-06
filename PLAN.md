# Travel Planner – India & Sri Lanka (29 Nov – 22 Dec 2026)

Private PWA for Elias & Sunny Dina. Keep it simple: content is edited in the Google Sheet (by hand or by an AI following `SCHEMA.md`), the app only reads.

## Architecture
- **Google Sheet** (private, in eliasdemme@gmail.com Drive) = single source of truth. Tabs: `Days`, `Items`, `Places`, `Settings`.
- **Apps Script** (`apps-script/Code.gs`, bound to the sheet): `setup()` builds tabs + dropdowns; `doPost` returns all data as JSON if PIN is correct (rate-limited).
- **Web app** (`index.html`, `app.js`, `style.css`, no build step, Leaflet map) on GitHub Pages: `eliasdemme/travel-planner`. Caches last data → works offline. Without `API_URL` in `config.js` it runs on `demo-data.json`.

## Screens
PIN (once per phone) · **Days** (list → day view → item detail) · **Map** (whole trip / per day, saved places toggle) · **Bookings** (only in booking mode: filter, totals in CHF, who-owes-whom).
Booking-mode toggle in header shows status/ref/price everywhere and flags nights without a stay.

## Phases
1. ✅ App skeleton, Apps Script, schema, GitHub Pages
2. Data import: files in `import/` → Sheet
3. Google Maps Takeout → `Places` tab

## Easter eggs
Tuk-tuk loader · tap title 5× → marigold rain · Namaste/Ayubowan greeting + countdown · tap day badge → fun fact · cheeky wrong-PIN messages · "everything booked" celebration · trip summary after the last day · ☀️ for Sunny.
