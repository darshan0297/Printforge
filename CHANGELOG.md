# PrintForge Lanka — Changelog

All notable changes, fixes, and updates to the website are recorded here.
Format: `[Date] — Description`

---

## 2026-05-21

- Created this changelog to track updates and fixes.
- Fixed shop page: sidebar filter panel now hidden by default on mobile with a "Filters" toggle button; auto-closes after category selection.
- Fixed toast overflowing screen on small phones (320px) — now full-width centered on screens ≤480px.
- Fixed product page: main image and 3D viewer height reduced on mobile (400px → 260/280px); Add to Cart / Buy Now buttons stack vertically on small screens.
- Fixed track orders page showing random demo orders for any email/ID — removed fallback that always showed hardcoded demo data when no real orders were found; now shows a proper "no orders found" empty state.
- Fixed product image carousels broken on homepage and product detail page — `initCarousels()` was never called after injecting card HTML, so scroll listeners and dot indicators never attached.
- Fixed mobile nav drawer completely broken — `initNav()` was defined but never called on any page. Added `document.addEventListener('DOMContentLoaded', initNav)` to `app.js` so it auto-runs on every page after the nav HTML has been injected.
- Fixed mobile nav drawer animation — replaced `display:none/flex` toggle with `visibility`/`opacity`/`transform` transition for smooth slide-in/out.
- Added scroll lock (`body overflow: hidden`) when drawer is open so page doesn't scroll behind it.
- Added Escape key support to close the drawer.
- Fixed outside-tap close handler to only fire when drawer is actually open.

---

<!-- Template for new entries:

## YYYY-MM-DD

### Added
- 

### Fixed
- 

### Changed
- 

### Removed
- 

-->
