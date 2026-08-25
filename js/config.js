// ============================================================
// config.js — Supabase + PayHere configuration
// Replace placeholder values with your real credentials
// ============================================================

const CONFIG = {
  supabase: {
    url: 'https://ixjudnzouhybeyabjbhn.supabase.co',         // e.g. https://xxxx.supabase.co
    anonKey: 'sb_publishable_FVJ2Lunh_a9Epi4hnA4ndA_kyDURzxQ' // from Project Settings → API
  },
  payhere: {
    merchantId: 'YOUR_PAYHERE_MERCHANT_ID',
    notifyUrl: 'YOUR_SUPABASE_EDGE_FUNCTION_URL/payhere-webhook',
    sandbox: true // set false for production
  },
  shop: {
    name: 'PrintForge',
    currency: 'LKR',
    email: 'hello@printforge.lk',
    phone: '+94788309969',
    address: '509, Galle Road, Mount Lavinia, Sri Lanka',
    deliveryFee: 350,      // flat rate LKR
    freeDeliveryThreshold: 44000, // free delivery above this amount
    stats: {
      projects:  '500+',
      printTime: '48h',
      materials: '15+',
      rating:    '4.9★'
    }
  }
};

// ============================================================
// Supabase client (loaded from CDN in each HTML file)
// ============================================================
let _supabase = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = supabase.createClient(CONFIG.supabase.url, CONFIG.supabase.anonKey);
  }
  return _supabase;
}
