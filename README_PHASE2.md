# PrintForge — Phase 2 Setup Guide
## PayHere Webhook · Email Notifications · Stock Management · Product Images

---

## Prerequisites
- Supabase project set up (Phase 1 schema already run)
- Supabase CLI installed: `npm install -g supabase`
- Resend account: https://resend.com (free — 3,000 emails/month)
- PayHere merchant account: https://www.payhere.lk

---

## Step 1 — Run Schema V2

In Supabase → SQL Editor → New query, paste and run `SUPABASE_SCHEMA_V2.sql`.

This adds:
- `tracking_number` column on orders
- `decrement_stock_for_order()` Postgres function
- `check_stock_availability()` Postgres function  
- DB trigger: auto-decrements stock when order status → `paid`
- `updated_at` auto-trigger on products and orders
- Storage bucket `product-images` with public read + auth write policies

---

## Step 2 — Deploy Edge Functions

### Login to Supabase CLI
```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```
Your project ref is the part after `https://` in your Supabase URL, e.g. `abcdefghijkl`.

### Set environment secrets
```bash
supabase secrets set PAYHERE_MERCHANT_SECRET=your_payhere_merchant_secret
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
supabase secrets set SHOP_NAME=PrintForge
supabase secrets set SHOP_EMAIL=hello@printforge.lk
supabase secrets set SITE_URL=https://your-netlify-url.netlify.app
```

### Deploy both functions
```bash
supabase functions deploy payhere-webhook
supabase functions deploy send-email
```

After deploy, your webhook URL will be:
`https://YOUR_PROJECT_REF.supabase.co/functions/v1/payhere-webhook`

---

## Step 3 — Configure PayHere

### In js/config.js:
```js
payhere: {
  merchantId: 'YOUR_MERCHANT_ID',
  notifyUrl:  'https://YOUR_PROJECT_REF.supabase.co/functions/v1/payhere-webhook',
  sandbox: false  // flip to false for live
}
```

### In PayHere Merchant Portal:
1. Settings → Domain Validation → add your site domain
2. Settings → Notifications → set Notify URL to your Edge Function URL above
3. Copy your **Merchant Secret** — used for MD5 signature verification

### Add PayHere SDK to cart.html
Before the closing `</body>` tag in `pages/cart.html`, add:
```html
<!-- Use sandbox URL while testing, switch to production when live -->
<script src="https://sandbox.payhere.lk/pay/js"></script>
<!-- Production: <script src="https://www.payhere.lk/pay/js"></script> -->
```

---

## Step 4 — Configure Resend

1. Sign up at https://resend.com
2. Add and verify your sending domain (or use the sandbox `onboarding@resend.dev` for testing)
3. Create an API key → copy it
4. Set via Supabase secrets (Step 2 above)

The `send-email` function sends from `orders@yourdomain.lk` — make sure your domain DNS has the Resend records added.

**For quick testing without domain verification:**
Edit `send-email/index.ts`, change the `from` field to:
```ts
from: `${SHOP_NAME} <onboarding@resend.dev>`,
```
This works immediately but only delivers to your own verified Resend account email.

---

## Step 5 — Product Images

In the Admin dashboard (`/pages/admin.html`):
1. Click "+ Add Product" or "Edit" on an existing product
2. Drag and drop or click to upload images (JPEG/PNG/WebP, max 5MB each)
3. Images upload to Supabase Storage → `product-images` bucket
4. First image becomes the primary product image on the shop and product pages
5. Multiple images appear as thumbnails on the product detail page

Images are stored at:
`https://YOUR_PROJECT_REF.supabase.co/storage/v1/object/public/product-images/PRODUCT_ID/filename.jpg`

---

## How it all connects

```
Customer places order
        │
        ▼
cart.html checks stock via check_stock_availability() RPC
        │
        ▼
Order created in DB (status: pending)
        │
        ▼
PayHere payment popup
        │
  ┌─────┴──────┐
paid        cancelled/failed
  │
  ▼
PayHere POSTs to /functions/v1/payhere-webhook
  │
  ├── Verifies MD5 signature
  ├── Updates order status → 'paid'
  ├── DB trigger fires → decrements stock
  └── Calls /functions/v1/send-email
            │
            ├── Customer: order confirmation email
            └── You: new order alert email
```

---

## Testing the Webhook Locally

```bash
supabase functions serve payhere-webhook --env-file .env.local
```

Create `.env.local`:
```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PAYHERE_MERCHANT_SECRET=your_secret
RESEND_API_KEY=re_xxxx
SHOP_EMAIL=hello@printforge.lk
SHOP_NAME=PrintForge
SITE_URL=http://localhost:3000
```

Test with curl:
```bash
curl -X POST http://localhost:54321/functions/v1/payhere-webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "merchant_id=123&order_id=ORD-2025-0001&status_code=2&payhere_amount=8500.00&payhere_currency=LKR&payhere_payment_id=PAY_TEST_001&md5sig=SKIP"
```
(Set `PAYHERE_MERCHANT_SECRET` to empty string to skip signature check during dev.)

---

## Checklist Before Going Live

- [ ] Run SUPABASE_SCHEMA_V2.sql
- [ ] Deploy both Edge Functions
- [ ] Set all 6 Supabase secrets
- [ ] Set `sandbox: false` in config.js
- [ ] Switch to production PayHere SDK URL in cart.html
- [ ] Add domain in PayHere merchant portal
- [ ] Set Notify URL in PayHere portal
- [ ] Verify sending domain in Resend
- [ ] Create admin user in Supabase Auth
- [ ] Add real products with images via admin dashboard
- [ ] Test a full end-to-end order in PayHere sandbox first
