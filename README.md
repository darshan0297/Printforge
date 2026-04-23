# PrintForge — Setup Guide

## Project Structure

```
printforge/
├── index.html              ← Homepage
├── css/style.css           ← Shared design system
├── js/
│   ├── config.js           ← Supabase + PayHere config (EDIT THIS FIRST)
│   └── app.js              ← Cart, DB helpers, shared utilities
├── pages/
│   ├── shop.html           ← Product listing with filters
│   ├── product.html        ← Product detail page
│   ├── cart.html           ← Cart + 3-step checkout
│   ├── orders.html         ← Order tracking + confirmation
│   ├── about.html          ← About, custom orders, contact form
│   └── admin.html          ← Admin dashboard
└── SUPABASE_SCHEMA.sql     ← Run this in Supabase SQL Editor
```

---

## Step 1 — Supabase

1. Create a free project at https://supabase.com
2. SQL Editor → New query → paste SUPABASE_SCHEMA.sql → Run
3. Project Settings → API → copy URL and anon key
4. Paste into js/config.js

Admin login: Authentication → Users → Add user → use on /pages/admin.html

---

## Step 2 — PayHere

1. Register at https://www.payhere.lk
2. Copy Merchant ID → js/config.js
3. Set sandbox: false for production
4. Add this script before </body> in cart.html:
   - Sandbox: https://sandbox.payhere.lk/pay/js
   - Production: https://www.payhere.lk/pay/js

---

## Step 3 — Deploy

Netlify Drop: drag the printforge/ folder to app.netlify.com/drop
Or upload via FTP to any web host.

---

## Customise

Edit js/config.js for shop name, email, phone, delivery fee.
Add products via /pages/admin.html or Supabase Table Editor.
Set product image URLs (Supabase Storage) to replace emoji icons.
