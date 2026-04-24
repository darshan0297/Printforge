// ================================================================
// send-email — Supabase Edge Function
// Sends transactional emails via Resend (resend.com)
// Deploy: supabase functions deploy send-email
// Env vars needed: RESEND_API_KEY, SHOP_EMAIL, SHOP_NAME
// ================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

interface Order {
  id: string;
  customer_email: string;
  customer_firstname: string;
  customer_lastname: string;
  customer_phone: string;
  customer_address: string;
  customer_notes: string;
  items: Array<{ name: string; qty: number; price: number }>;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  created_at: string;
}

const SHOP_NAME  = Deno.env.get("SHOP_NAME")  ?? "PrintForge";
const SHOP_EMAIL = Deno.env.get("SHOP_EMAIL") ?? "hello@printforge.lk";
const SITE_URL   = Deno.env.get("SITE_URL")   ?? "https://printforge.lk";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";

function fmtLKR(n: number) {
  return "LKR " + Math.round(n).toLocaleString("en-LK");
}

// ── Email templates ───────────────────────────────────────────

function orderConfirmTemplate(order: Order): string {
  const items = (order.items || [])
    .map(i => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #222;font-size:14px;color:#f0ede8">${i.name}</td>
        <td style="padding:10px 0;border-bottom:1px solid #222;font-size:14px;color:#b0aba4;text-align:center">×${i.qty}</td>
        <td style="padding:10px 0;border-bottom:1px solid #222;font-size:14px;color:#e8ff47;text-align:right;font-weight:700">${fmtLKR(i.price * i.qty)}</td>
      </tr>`).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'DM Sans',Arial,sans-serif">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="width:8px;height:8px;border-radius:50%;background:#e8ff47;display:inline-block"></span>
        <span style="font-family:Arial,sans-serif;font-weight:900;font-size:20px;color:#f0ede8;letter-spacing:-0.02em">${SHOP_NAME}</span>
      </div>
    </div>

    <!-- Hero -->
    <div style="background:#111;border:1px solid rgba(232,255,71,0.15);border-radius:16px;padding:40px;text-align:center;margin-bottom:24px">
      <div style="font-size:48px;margin-bottom:16px">✅</div>
      <h1 style="color:#f0ede8;font-size:24px;font-weight:800;margin:0 0 8px;letter-spacing:-0.03em">Order Confirmed!</h1>
      <p style="color:#b0aba4;font-size:15px;margin:0">Thanks ${order.customer_firstname} — we're on it.</p>
      <div style="margin-top:20px;display:inline-block;background:rgba(232,255,71,0.1);border:1px solid rgba(232,255,71,0.25);border-radius:100px;padding:6px 20px">
        <span style="color:#e8ff47;font-size:13px;font-weight:700;font-family:Arial,sans-serif">Order #${order.id}</span>
      </div>
    </div>

    <!-- Order items -->
    <div style="background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px;margin-bottom:16px">
      <h3 style="color:#b0aba4;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 16px">Items Ordered</h3>
      <table style="width:100%;border-collapse:collapse">
        ${items}
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#666">Subtotal</td>
          <td></td>
          <td style="padding:8px 0;font-size:13px;color:#b0aba4;text-align:right">${fmtLKR(order.subtotal)}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;font-size:13px;color:#666">Delivery</td>
          <td></td>
          <td style="padding:8px 0;font-size:13px;color:#b0aba4;text-align:right">${order.delivery_fee === 0 ? '<span style="color:#44dd88">Free</span>' : fmtLKR(order.delivery_fee)}</td>
        </tr>
        <tr>
          <td style="padding:14px 0 0;font-size:16px;font-weight:800;color:#f0ede8;font-family:Arial,sans-serif">Total</td>
          <td></td>
          <td style="padding:14px 0 0;font-size:18px;font-weight:800;color:#e8ff47;text-align:right;font-family:Arial,sans-serif">${fmtLKR(order.total)}</td>
        </tr>
      </table>
    </div>

    <!-- Delivery info -->
    <div style="background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:16px">
      <h3 style="color:#b0aba4;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 12px">Delivery To</h3>
      <p style="color:#f0ede8;font-size:14px;margin:0 0 4px;font-weight:600">${order.customer_firstname} ${order.customer_lastname}</p>
      <p style="color:#b0aba4;font-size:13px;margin:0 0 4px">${order.customer_address}</p>
      ${order.customer_phone ? `<p style="color:#b0aba4;font-size:13px;margin:0">${order.customer_phone}</p>` : ""}
    </div>

    <!-- Track order CTA -->
    <div style="text-align:center;margin:28px 0">
      <a href="${SITE_URL}/pages/orders.html?id=${order.id}" style="display:inline-block;background:#e8ff47;color:#000;font-weight:800;font-size:15px;padding:14px 32px;border-radius:100px;text-decoration:none;font-family:Arial,sans-serif">Track Your Order →</a>
    </div>

    <!-- What's next -->
    <div style="background:#111;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px;margin-bottom:24px">
      <h3 style="color:#b0aba4;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;margin:0 0 12px">What Happens Next</h3>
      <p style="color:#b0aba4;font-size:13px;margin:0 0 8px;line-height:1.6">🖨️ <strong style="color:#f0ede8">We're printing your order</strong> — most items are ready within 24–48h.</p>
      <p style="color:#b0aba4;font-size:13px;margin:0 0 8px;line-height:1.6">📦 <strong style="color:#f0ede8">You'll get a shipping update</strong> with tracking info once dispatched.</p>
      <p style="color:#b0aba4;font-size:13px;margin:0;line-height:1.6">❓ Questions? Reply to this email or WhatsApp us.</p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;border-top:1px solid rgba(255,255,255,0.06);padding-top:24px">
      <p style="color:#444;font-size:12px;margin:0 0 4px">${SHOP_NAME} · Mount Lavinia, Sri Lanka</p>
      <p style="color:#444;font-size:12px;margin:0"><a href="mailto:${SHOP_EMAIL}" style="color:#666;text-decoration:none">${SHOP_EMAIL}</a></p>
    </div>
  </div>
</body>
</html>`;
}

function newOrderAlertTemplate(order: Order): string {
  const items = (order.items || [])
    .map(i => `• ${i.name} × ${i.qty} — ${fmtLKR(i.price * i.qty)}`)
    .join("\n");

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px">
    <div style="background:#111;border:1px solid rgba(232,255,71,0.2);border-radius:12px;padding:28px">
      <div style="margin-bottom:20px">
        <span style="background:rgba(232,255,71,0.1);border:1px solid rgba(232,255,71,0.3);border-radius:100px;padding:4px 14px;font-size:12px;color:#e8ff47;font-weight:700">NEW ORDER</span>
      </div>
      <h2 style="color:#f0ede8;margin:0 0 4px;font-size:20px">Order #${order.id}</h2>
      <p style="color:#b0aba4;font-size:14px;margin:0 0 20px">${new Date(order.created_at).toLocaleString("en-LK")}</p>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
        <tr><td style="color:#666;font-size:13px;padding:4px 0">Customer</td><td style="color:#f0ede8;font-size:13px;font-weight:600;text-align:right">${order.customer_firstname} ${order.customer_lastname}</td></tr>
        <tr><td style="color:#666;font-size:13px;padding:4px 0">Email</td><td style="color:#f0ede8;font-size:13px;text-align:right">${order.customer_email}</td></tr>
        <tr><td style="color:#666;font-size:13px;padding:4px 0">Phone</td><td style="color:#f0ede8;font-size:13px;text-align:right">${order.customer_phone || "—"}</td></tr>
        <tr><td style="color:#666;font-size:13px;padding:4px 0">Address</td><td style="color:#f0ede8;font-size:13px;text-align:right">${order.customer_address}</td></tr>
        <tr><td style="color:#666;font-size:13px;padding:4px 0">Total</td><td style="color:#e8ff47;font-size:15px;font-weight:800;text-align:right">${fmtLKR(order.total)}</td></tr>
      </table>

      <div style="background:#0a0a0a;border-radius:8px;padding:14px;margin-bottom:20px">
        <p style="color:#666;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 8px">Items</p>
        ${(order.items || []).map(i => `<p style="color:#b0aba4;font-size:13px;margin:0 0 4px">${i.name} × ${i.qty} — <span style="color:#e8ff47">${fmtLKR(i.price * i.qty)}</span></p>`).join("")}
      </div>

      <a href="${SITE_URL}/pages/admin.html" style="display:block;text-align:center;background:#e8ff47;color:#000;font-weight:800;font-size:14px;padding:12px;border-radius:8px;text-decoration:none">Open in Admin →</a>
    </div>
  </div>
</body>
</html>`;
}

// ── Main handler ──────────────────────────────────────────────

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let payload: { type: string; order: Order };
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { type, order } = payload;
  if (!type || !order) return new Response("Missing type or order", { status: 400 });

  if (!RESEND_KEY) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return new Response("Email skipped (no API key)", { status: 200 });
  }

  const emails: Array<{ to: string; subject: string; html: string }> = [];

  if (type === "order_confirmed") {
    // 1. Customer confirmation
    emails.push({
      to:      order.customer_email,
      subject: `✅ Order Confirmed — #${order.id} | ${SHOP_NAME}`,
      html:    orderConfirmTemplate(order),
    });
    // 2. Admin new-order alert
    emails.push({
      to:      SHOP_EMAIL,
      subject: `🛍️ New Order #${order.id} — ${fmtLKR(order.total)}`,
      html:    newOrderAlertTemplate(order),
    });
  }

  // Send via Resend
  const results = await Promise.allSettled(
    emails.map(({ to, subject, html }) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${RESEND_KEY}`,
        },
        body: JSON.stringify({
          from:    `${SHOP_NAME} <orders@${SHOP_EMAIL.split("@")[1]}>`,
          to,
          subject,
          html,
        }),
      }).then(r => r.json())
    )
  );

  const errors = results
    .filter(r => r.status === "rejected")
    .map(r => (r as PromiseRejectedResult).reason);

  if (errors.length) {
    console.error("Email errors:", errors);
    return new Response(JSON.stringify({ ok: false, errors }), { status: 500 });
  }

  console.log(`Sent ${emails.length} email(s) for ${type}`);
  return new Response(JSON.stringify({ ok: true, sent: emails.length }), { status: 200 });
});
