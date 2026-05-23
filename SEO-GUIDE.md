# PrintForge SEO Guide

The goal is to rank #1 in Sri Lanka for **3D printing**, **eSUN filament**, **PLA+**, **PETG**, and **filament**. This document explains the current SEO setup and what to do on an ongoing basis to keep improving.

---

## Target Keywords

| Keyword | Intent | Priority |
|---|---|---|
| `3D printing Sri Lanka` | Service / informational | #1 |
| `eSUN filament Sri Lanka` | Product / buy | #1 |
| `PLA+ filament Sri Lanka` | Product / buy | #1 |
| `PETG filament Sri Lanka` | Product / buy | #1 |
| `filament Sri Lanka` | Product / buy | #1 |
| `buy filament Sri Lanka` | Transactional | #2 |
| `custom 3D printing Colombo` | Local service | #2 |
| `cosplay props Sri Lanka` | Product | #2 |
| `3D printed props Sri Lanka` | Product | #2 |
| `laser cutting Sri Lanka` | Service | #3 |

---

## What's Already Done

### On-page SEO
- **Title tags** — every public page has a unique, keyword-rich `<title>` (≤60 chars)
- **Meta descriptions** — every page has a unique description (≤160 chars) mentioning eSUN, PLA+, PETG, filament, and Sri Lanka
- **Meta keywords** — populated (minor signal but consistent with content)
- **Canonical URLs** — set to clean Vercel rewrite paths (`/shop`, `/3d-printing`, etc.)
- **H1 tags** — each page has one H1 containing target keywords
- **Body content** — eSUN brand name appears naturally in material cards, descriptions and intro text
- **OG / Twitter cards** — populated on all pages so social shares look good

### Structured Data (JSON-LD)
- **Homepage** — `LocalBusiness` + `WebSite` + `SearchAction`
- **3D Printing page** — `Service` + `FAQPage` (includes "What filament brand do you use?" → eSUN)
- **Shop page** — `CollectionPage` + `BreadcrumbList`
- **Laser page** — `Service` + `BreadcrumbList`

### Technical SEO
- **sitemap.xml** — lists all public pages with clean URLs and `lastmod` dates; submitted to Google
- **robots.txt** — blocks all admin routes, allows everything else; points to sitemap
- **HTTPS** — enforced by Vercel
- **Security headers** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy via `vercel.json`
- **Vercel Analytics** — enabled for traffic data

---

## Ongoing SEO Tasks

### Every time you add a product
1. Give it a descriptive name that includes the material: **"eSUN PLA+ 1kg White Filament"**, not just "White Filament"
2. Write a product description (2–3 sentences minimum) mentioning brand, material type and what it's good for
3. If it's a filament, include: brand (eSUN), type (PLA+ / PETG), weight (1kg), colour, and a use-case sentence

### Every time you write a blog post
Blog posts are the biggest lever for SEO. Each post should:
1. Target **one specific keyword** — e.g. "how to print PETG in Sri Lanka", "eSUN PLA+ review", "best filament for cosplay props"
2. Have that keyword in the **H1 title**
3. Be at least **600 words** — Google prefers depth
4. Use the keyword naturally **3–5 times** in the body text
5. Link back to the shop (`/shop?cat=Filament`) or the 3D printing page (`/3d-printing`) at least once
6. Use real images with descriptive `alt` text: `alt="eSUN PLA+ 1kg filament spool in red"` (not `alt="img1"`)

**Good blog post ideas that target the keywords:**
- "eSUN PLA+ vs PETG — Which Filament Should You Choose?"
- "Where to Buy eSUN Filament in Sri Lanka"
- "How to Choose the Right 3D Printing Material for Your Cosplay Prop"
- "Best 3D Printing Filament Brands Available in Sri Lanka"
- "PETG Filament Guide — Sri Lanka Edition"
- "3D Printing Prices in Sri Lanka — What to Expect"

### Monthly checklist
- [ ] Update `sitemap.xml` `lastmod` dates for pages that changed
- [ ] Check [Google Search Console](https://search.google.com/search-console) for crawl errors and coverage issues
- [ ] Check which search queries are getting impressions — write blog posts targeting the ones with high impressions but low clicks
- [ ] Make sure every new product has a real image (products with `??` placeholder hurt click-through rate)
- [ ] Add at least one new blog post targeting a long-tail keyword

---

## Google Search Console Setup (do this once)

1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Add property: `https://www.printforgelanka.com`
3. Verify via HTML tag — add the `<meta name="google-site-verification" content="...">` tag to `index.html`
4. Submit sitemap: `https://www.printforgelanka.com/sitemap.xml`
5. Check **Coverage** tab for any crawl errors
6. Check **Performance** tab weekly to see which queries are ranking

---

## URL Canonical Rules

Always use `https://www.printforgelanka.com` (with `www`) in canonical tags, sitemap, and structured data. The domain resolves both ways but `www` is the canonical form.

| Page | Canonical URL |
|---|---|
| Homepage | `https://www.printforgelanka.com/` |
| Shop | `https://www.printforgelanka.com/shop` |
| 3D Printing | `https://www.printforgelanka.com/3d-printing` |
| Laser Cutting | `https://www.printforgelanka.com/laser-cutting` |
| About | `https://www.printforgelanka.com/about` |
| Blog | `https://www.printforgelanka.com/blog` |

---

## Image SEO

Every product image and blog image should have descriptive alt text:
- **Good:** `alt="eSUN PLA+ 1kg white filament spool"`
- **Bad:** `alt="img"` or empty `alt=""`

When uploading images via the admin panel, use descriptive filenames before uploading:
- **Good:** `esun-pla-plus-1kg-white.jpg`
- **Bad:** `IMG_20240501_123456.jpg`

---

## Keyword Placement Cheat Sheet

For any new page, hit these spots:

| Location | Keyword density target |
|---|---|
| `<title>` | Primary keyword near the front |
| `<meta description>` | Primary + secondary keyword, natural sentence |
| H1 | Primary keyword |
| First paragraph | Primary + secondary keywords |
| H2 subheadings | Secondary keywords |
| Body text | Keywords every 100–200 words, naturally |
| Image `alt` text | Descriptive, keyword-adjacent |
| `<link rel="canonical">` | Exact canonical URL |
| JSON-LD `name` / `description` | Match page keywords |

---

## What NOT to Do

- Do not keyword-stuff — "eSUN PLA+ eSUN filament eSUN PETG eSUN" reads as spam and Google penalises it
- Do not duplicate title tags across pages — every page needs a unique title
- Do not use `/pages/shop.html` style URLs in canonical tags or sitemap — always use the clean Vercel rewrite paths
- Do not leave product descriptions blank — blank descriptions = weak pages = lower ranking
