# PrintForge 🖨️

**Workshop-direct 3D printing, laser cutting, cosplay props & filament — Mount Lavinia, Sri Lanka.**

A full-featured e-commerce storefront built as a static site with a Supabase backend and PayHere payment integration.

🔗 **[Live Site →](https://darshan0297.github.io/Printforge/)**

---

## Features

### Storefront
- Product catalogue with category filters, search, and 3D model viewer (model-viewer)
- 3-step cart & checkout (cart → delivery details → payment)
- Cash on Delivery and PayHere online payments (Visa, Mastercard, Lanka QR, bank transfer)
- Coupon / discount code system
- Order tracking by email or order ID with live status timeline
- 3D print quote request form with file upload
- Laser cutting quote request with material, size, and operation selector
- Blog with tagged posts
- Contact form

### Admin Panel
- **Dashboard** — revenue chart, stat cards, recent orders
- **Orders** — full CRUD, inline status & tracking update, convert laser quote → order
- **Products** — add/edit/hide/delete, image upload to Supabase Storage, 3D model upload
- **Coupons** — create percent or fixed-amount codes with expiry and usage limits
- **3D Print Quotes** — review, status management
- **Laser Quotes** — pricing, status management, convert to order
- **Messages** — customer contact submissions with read/unread tracking
- **Shop Config** — store identity, delivery settings, PayHere config, laser pricing matrix, 3D print pricing calculator

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML · CSS custom properties · Vanilla JS (no framework) |
| Backend / DB | [Supabase](https://supabase.com) (Postgres + Auth + Storage + RLS) |
| Payments | [PayHere](https://www.payhere.lk) (LKR, sandbox + production) |
| 3D Viewer | [model-viewer](https://modelviewer.dev) (GLB/glTF) |
| Hosting | GitHub Pages |
| Fonts | Space Grotesk · Syne · Inter (Google Fonts) |

---

## Project Structure

```
printforge/
├── index.html                  ← Homepage
├── robots.txt                  ← Search engine directives
├── sitemap.xml                 ← Sitemap for indexing
├── css/
│   ├── style.css               ← Shared design system (dark theme, green accent)
│   └── admin.css               ← Admin panel styles + collapsible sidebar
├── js/
│   ├── config.js               ← Supabase + PayHere config ← EDIT THIS
│   ├── app.js                  ← Cart, DB helpers, nav, toast, formatters
│   ├── admin.js                ← Admin auth, sidebar, demo data, badges
│   └── theme.js                ← Light/dark theme toggle
└── pages/
    ├── shop.html               ← Product listing
    ├── product.html            ← Product detail + 3D viewer
    ├── cart.html               ← Cart + checkout
    ├── orders.html             ← Order confirmation + tracking
    ├── print3d.html            ← 3D printing service + quote form
    ├── laser.html              ← Laser cutting service + quote form
    ├── about.html              ← About + contact form
    ├── blog.html               ← Blog listing
    ├── post.html               ← Blog post
    ├── admin.html              ← Dashboard
    ├── admin-orders.html       ← Orders management
    ├── admin-products.html     ← Product management
    ├── admin-coupons.html      ← Coupon management
    ├── admin-print3d.html      ← 3D print quotes
    ├── admin-laser.html        ← Laser quotes
    ├── admin-contacts.html     ← Customer messages
    └── admin-config.html       ← Shop configuration
```

---

## Quick Start

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Run the following tables in **SQL Editor → New query**:

```sql
create table orders (...);
create table products (...);
create table laser_quotes (...);
create table print3d_quotes (...);
create table contacts (...);
create table discount_codes (...);
create table shop_config (id text primary key, key text, value text, updated_at timestamptz default now());
```

3. **Project Settings → API** → copy your URL and `anon` key into `js/config.js`

### 2. Config

Edit `js/config.js`:

```js
const CONFIG = {
  supabase: {
    url: 'https://YOUR_PROJECT.supabase.co',
    anonKey: 'YOUR_ANON_KEY'
  },
  payhere: {
    merchantId: 'YOUR_MERCHANT_ID',
    notifyUrl: 'YOUR_EDGE_FUNCTION_URL/payhere-webhook',
    sandbox: true  // set false for production
  },
  shop: {
    name: 'PrintForge',
    currency: 'LKR',
    email: 'hello@yourshop.lk',
    deliveryFee: 350,
    freeDeliveryThreshold: 10000
  }
};
```

### 3. PayHere

1. Register at [payhere.lk](https://www.payhere.lk)
2. Copy your **Merchant ID** into `config.js`
3. Set `sandbox: false` and swap the PayHere script URL in `cart.html` when going live

### 4. Deploy

Push to GitHub and enable **GitHub Pages** (Settings → Pages → Source: `master` branch, `/ (root)`).

---

## Admin Access

Visit `/pages/admin.html`. In demo mode (no Supabase auth configured), leave the email and password blank and click **Sign In**.

To set up real auth: **Supabase → Authentication → Users → Invite user** — then log in with those credentials.

---

## License

MIT — free to use and adapt for your own shop.
