// ================================================================
// PayHere Webhook — Supabase Edge Function
// Verifies PayHere signature, updates order status, triggers email
// Deploy: supabase functions deploy payhere-webhook
// ================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// PayHere status codes
const PAYHERE_STATUS: Record<string, string> = {
  "2":  "paid",        // success
  "0":  "pending",     // pending
  "-1": "cancelled",   // cancelled
  "-2": "failed",      // failed
  "-3": "refunded",    // chargedback
};

async function md5(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("MD5", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

serve(async (req) => {
  // PayHere sends POST with application/x-www-form-urlencoded
  let body: FormData;
  try {
    body = await req.formData();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const merchant_id      = body.get("merchant_id")?.toString() ?? "";
  const order_id         = body.get("order_id")?.toString() ?? "";
  const payment_id       = body.get("payhere_payment_id")?.toString() ?? "";
  const status_code      = body.get("status_code")?.toString() ?? "";
  const md5sig           = body.get("md5sig")?.toString() ?? "";
  const payhere_amount   = body.get("payhere_amount")?.toString() ?? "";
  const payhere_currency = body.get("payhere_currency")?.toString() ?? "";

  if (!order_id || !status_code) {
    return new Response("Missing fields", { status: 400 });
  }

  // Verify MD5 signature
  // Format: MD5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + MD5(merchant_secret).toUpperCase()).toUpperCase()
  const MERCHANT_SECRET = Deno.env.get("PAYHERE_MERCHANT_SECRET") ?? "";
  if (MERCHANT_SECRET) {
    const secretHash  = await md5(MERCHANT_SECRET);
    const localSigRaw = merchant_id + order_id + payhere_amount + payhere_currency + status_code + secretHash;
    const localSig    = await md5(localSigRaw);

    if (localSig !== md5sig) {
      console.error(`Signature mismatch for order ${order_id}. Got ${md5sig}, expected ${localSig}`);
      return new Response("Invalid signature", { status: 400 });
    }
  }

  // Map status
  const status = PAYHERE_STATUS[status_code] ?? "failed";

  // Update order in Supabase (uses service role — bypasses RLS)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (payment_id) updatePayload.payhere_payment_id = payment_id;

  const { data: order, error } = await supabase
    .from("orders")
    .update(updatePayload)
    .eq("id", order_id)
    .select()
    .single();

  if (error) {
    console.error("DB update error:", error);
    return new Response("DB error", { status: 500 });
  }

  console.log(`Order ${order_id} → ${status}`);

  // Trigger email notification on paid
  if (status === "paid" && order) {
    try {
      await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ type: "order_confirmed", order }),
      });
    } catch (e) {
      console.error("Email trigger failed:", e);
      // Don't fail the webhook — payment was processed
    }
  }

  return new Response("OK", { status: 200 });
});
