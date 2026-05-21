# PrintForge Lanka — Changelog

All notable changes, fixes, and updates to the website are recorded here.
Format: `[Date] — Description`

---

## 2026-05-21

- Created this changelog to track updates and fixes.
- Fixed shop page: sidebar filter panel now hidden by default on mobile with a "Filters" toggle button; auto-closes after category selection.
- Fixed toast overflowing screen on small phones (320px) — now full-width centered on screens ≤480px.
- Fixed product page: main image and 3D viewer height reduced on mobile (400px → 260/280px); Add to Cart / Buy Now buttons stack vertically on small screens.
- Fixed mobile nav drawer (hamburger menu) not animating on mobile — replaced `display:none/flex` toggle with `visibility`/`opacity`/`transform` transition for smooth slide-in/out.
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
