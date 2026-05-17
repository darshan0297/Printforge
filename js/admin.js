// ── Demo data ─────────────────────────────────────────────────
const DEMO_ORDERS = [
  { id:'ORD-001', status:'shipped', customer_email:'raveen@email.com', customer_firstname:'Raveen', customer_lastname:'C.', customer_phone:'+94 77 100 2345', customer_address:'12 Galle Rd, Colombo 3', customer_notes:'Please pack carefully', tracking_number:'SL123456789', created_at:new Date(Date.now()-3*86400000).toISOString(), items:[{name:'Goku Helmet',qty:1,price:8500}], subtotal:8500, delivery_fee:350, total:8850 },
  { id:'ORD-002', status:'processing', customer_email:'amaya@email.com', customer_firstname:'Amaya', customer_lastname:'M.', customer_phone:'+94 71 987 0001', customer_address:'54 Kandy Rd, Peradeniya', customer_notes:'', tracking_number:'', created_at:new Date(Date.now()-86400000).toISOString(), items:[{name:'Ender 5 Kit',qty:1,price:4800}], subtotal:4800, delivery_fee:350, total:5150 },
  { id:'ORD-003', status:'pending', customer_email:'thisara@email.com', customer_firstname:'Thisara', customer_lastname:'K.', customer_phone:'+94 70 555 6789', customer_address:'78 New Rd, Gampaha', customer_notes:'', tracking_number:'', created_at:new Date().toISOString(), items:[{name:'PLA+ Filament',qty:2,price:3200}], subtotal:6400, delivery_fee:350, total:6750 },
];
const DEMO_LASER_QUOTES = [
  { id:'LQ-001', name:'Kasun Perera', email:'kasun@email.com', phone:'+94 77 123 4567', material:'Acrylic 3mm', colour:'Black', operation:'Cut + Engrave', quantity:10, width_cm:8, height_cm:5, notes:'Custom business name signs.', file_urls:[], status:'new', quoted_price:null, admin_notes:'', created_at:new Date(Date.now()-3600000).toISOString() },
  { id:'LQ-002', name:'Nimesha Silva', email:'nimesha@email.com', phone:null, material:'MDF 6mm', colour:'Natural', operation:'Raster engraving', quantity:4, width_cm:9, height_cm:9, notes:'Wedding coasters.', file_urls:[], status:'quoted', quoted_price:2800, admin_notes:'Quoted 4 coasters @ LKR 700 each', created_at:new Date(Date.now()-2*86400000).toISOString() },
];
const DEMO_PRINT3D_QUOTES = [
  { id:'P3D-001', name:'Ashan Perera', contact_info:'+94 77 555 1234', notes:'Cosplay helmet — Iron Man Mk5. Needs to be paintable. About 30cm tall.', file_name:'ironman_mk5.stl', drive_file_url:'https://drive.google.com', status:'new', created_at:new Date(Date.now()-7200000).toISOString() },
  { id:'P3D-002', name:'Dilini Fernando', contact_info:'dilini@gmail.com', notes:'Replacement bracket for my printer — PETG preferred, needs to be strong.', file_name:'bracket_v3.stl', drive_file_url:null, status:'reviewing', created_at:new Date(Date.now()-86400000).toISOString() },
];
const DEMO_COUPONS = [
  { id:'c1', code:'LAUNCH20', type:'percent', value:20, min_order:0, max_uses:100, uses:14, expires_at:null, active:true, created_at:new Date().toISOString() },
  { id:'c2', code:'FREESHIP', type:'fixed', value:350, min_order:5000, max_uses:null, uses:7, expires_at:null, active:true, created_at:new Date().toISOString() },
];
const DEMO_CONTACTS = [
  { id:1, name:'Demo User', email:'demo@email.com', subject:'Custom print quote', message:'I need a Jujutsu Kaisen prop.', read:false, created_at:new Date().toISOString() }
];

// ── Utilities ──────────────────────────────────────────────────
function setBadge(id, n) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.display = n > 0 ? 'inline' : 'none';
  el.textContent = n;
}

// ── Sidebar collapse ───────────────────────────────────────────
function toggleSidebar() {
  const layout = document.getElementById('adminLayout');
  const collapsed = layout.classList.toggle('sidebar-collapsed');
  const btn = document.getElementById('sidebarToggle');
  if (btn) btn.textContent = collapsed ? '▶' : '☰';
}

// ── Auth ───────────────────────────────────────────────────────
async function doLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const btn   = document.getElementById('loginBtn');
  btn.disabled = true; btn.textContent = 'Signing in…';
  document.getElementById('loginErr').textContent = '';
  try {
    if (email && pass) {
      try { await DB.adminLogin(email, pass); }
      catch(e) { if (CONFIG.supabase.url.includes('supabase.co')) throw e; }
    }
    showAdminContent();
  } catch(e) {
    document.getElementById('loginErr').textContent = e.message || 'Login failed';
    btn.disabled = false; btn.textContent = 'Sign In →';
  }
}

async function doLogout() { try { await DB.adminLogout(); } catch {} location.reload(); }

function showAdminContent() {
  document.getElementById('loginOverlay').style.display = 'none';
  const page = document.body.dataset.page;
  document.querySelectorAll('.sidebar-link[data-page]').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });
  loadSidebarBadges();
  if (typeof pageInit === 'function') pageInit();
}

async function initAdminPage() {
  let hasSession = false;
  try {
    const { data: { session } } = await getSupabase().auth.getSession();
    hasSession = !!session;
  } catch {}
  if (hasSession) { showAdminContent(); return; }
  // No session — if demo URL (no real supabase), auto-show
  if (!CONFIG.supabase.url.includes('supabase.co')) showAdminContent();
}

async function loadSidebarBadges() {
  try {
    const sb = getSupabase();
    const [o, p3, lq, ct] = await Promise.all([
      sb.from('orders').select('*',{count:'exact',head:true}).eq('status','pending'),
      sb.from('print3d_quotes').select('*',{count:'exact',head:true}).eq('status','new'),
      sb.from('laser_quotes').select('*',{count:'exact',head:true}).eq('status','new'),
      sb.from('contacts').select('*',{count:'exact',head:true}).eq('read',false),
    ]);
    setBadge('nb-orders', o.count||0);
    setBadge('nb-print3d', p3.count||0);
    setBadge('nb-laser', lq.count||0);
    setBadge('nb-contacts', ct.count||0);
  } catch {
    setBadge('nb-orders',1); setBadge('nb-print3d',1); setBadge('nb-laser',1); setBadge('nb-contacts',1);
  }
}

document.addEventListener('DOMContentLoaded', initAdminPage);
