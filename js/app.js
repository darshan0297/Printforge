// ============================================================
// app.js — shared utilities: cart, toast, nav, helpers
// ============================================================

// ── CART ──────────────────────────────────────────────────
const Cart = {
  _key: 'pf_cart',

  get() {
    try { return JSON.parse(localStorage.getItem(this._key)) || []; }
    catch { return []; }
  },

  save(items) {
    localStorage.setItem(this._key, JSON.stringify(items));
    this._sync();
  },

  add(product, qty = 1) {
    const items = this.get();
    const idx = items.findIndex(i => i.id === product.id);
    if (idx >= 0) {
      items[idx].qty = Math.min(items[idx].qty + qty, 99);
    } else {
      items.push({ ...product, qty });
    }
    this.save(items);
    Toast.show(`${product.name} added to cart`, 'success');
  },

  remove(id) {
    this.save(this.get().filter(i => i.id !== id));
  },

  updateQty(id, qty) {
    if (qty < 1) { this.remove(id); return; }
    const items = this.get();
    const idx = items.findIndex(i => i.id === id);
    if (idx >= 0) { items[idx].qty = Math.min(qty, 99); this.save(items); }
  },

  clear() { localStorage.removeItem(this._key); this._sync(); },

  count() { return this.get().reduce((s, i) => s + i.qty, 0); },

  subtotal() { return this.get().reduce((s, i) => s + i.price * i.qty, 0); },

  delivery() {
    const sub = this.subtotal();
    if (sub === 0) return 0;
    return sub >= CONFIG.shop.freeDeliveryThreshold ? 0 : CONFIG.shop.deliveryFee;
  },

  total() { return this.subtotal() + this.delivery(); },

  _sync() {
    const el = document.getElementById('cartCount');
    if (el) {
      const c = this.count();
      el.textContent = c;
      el.style.display = c > 0 ? 'flex' : 'none';
    }
  }
};

// ── TOAST ─────────────────────────────────────────────────
const Toast = {
  _timer: null,
  show(msg, type = 'info', duration = 3000) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.innerHTML = '<span class="toast-icon"></span><span class="toast-msg"></span>';
      document.body.appendChild(el);
    }
    const icons = { success: '✓', error: '✕', info: '◆' };
    el.querySelector('.toast-icon').textContent = icons[type] || '◆';
    el.querySelector('.toast-msg').textContent = msg;
    el.className = `show ${type}`;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => el.className = '', duration);
  }
};

// ── FORMAT HELPERS ────────────────────────────────────────
function fmt(n) {
  return 'LKR ' + Math.round(n).toLocaleString('en-LK');
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' });
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

function statusBadge(status) {
  const map = {
    pending:    ['badge-yellow', 'Pending'],
    paid:       ['badge-green',  'Paid'],
    processing: ['badge-orange', 'Processing'],
    shipped:    ['badge-green',  'Shipped'],
    delivered:  ['badge-green',  'Delivered'],
    cancelled:  ['badge-red',    'Cancelled'],
    failed:     ['badge-red',    'Failed'],
  };
  const [cls, label] = map[status] || ['badge-gray', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

// ── PAYHERE ──────────────────────────────────────────────
function initiatePayHere(order) {
  // PayHere JS SDK must be loaded on the page
  const payment = {
    sandbox:       CONFIG.payhere.sandbox,
    merchant_id:   CONFIG.payhere.merchantId,
    return_url:    `${location.origin}/pages/order-confirm.html`,
    cancel_url:    `${location.origin}/pages/cart.html`,
    notify_url:    CONFIG.payhere.notifyUrl,
    order_id:      order.id,
    items:         order.items.map(i => i.name).join(', ').substring(0, 255),
    amount:        order.total.toFixed(2),
    currency:      'LKR',
    first_name:    order.customer.firstName,
    last_name:     order.customer.lastName,
    email:         order.customer.email,
    phone:         order.customer.phone,
    address:       order.customer.address,
    city:          order.customer.city,
    country:       'Sri Lanka',
  };

  payhere.startPayment(payment);
}

// ── SUPABASE HELPERS ──────────────────────────────────────
const DB = {
  async getProducts(opts = {}) {
    const sb = getSupabase();
    let q = sb.from('products').select('*').eq('active', true);
    if (opts.category) q = q.eq('category', opts.category);
    if (opts.featured) q = q.eq('featured', true);
    if (opts.limit)    q = q.limit(opts.limit);
    q = q.order('created_at', { ascending: false });
    const { data, error } = await q;
    if (error) throw error;
    return data;
  },

  async getProduct(id) {
    const { data, error } = await getSupabase()
      .from('products').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async createOrder(payload) {
    const { data, error } = await getSupabase()
      .from('orders').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  async getOrder(id) {
    const { data, error } = await getSupabase()
      .from('orders').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async getOrdersByEmail(email) {
    const { data, error } = await getSupabase()
      .from('orders').select('*').eq('customer_email', email.toLowerCase())
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async submitContact(payload) {
    const { error } = await getSupabase().from('contacts').insert(payload);
    if (error) throw error;
  },

  // Admin only — requires service role key via edge function
  async adminGetOrders() {
    const { data, error } = await getSupabase()
      .from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async adminUpdateOrderStatus(id, status) {
    const { error } = await getSupabase()
      .from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  },

  async adminGetProducts() {
    const { data, error } = await getSupabase()
      .from('products').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async adminUpsertProduct(product) {
    const sb = getSupabase();
    if (product.id) {
      const { error } = await sb.from('products').update(product).eq('id', product.id);
      if (error) throw error;
    } else {
      const { error } = await sb.from('products').insert(product);
      if (error) throw error;
    }
  },

  async adminDeleteProduct(id) {
    const { error } = await getSupabase().from('products').delete().eq('id', id);
    if (error) throw error;
  },

  async adminGetContacts() {
    const { data, error } = await getSupabase()
      .from('contacts').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async adminLogin(email, password) {
    const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async adminLogout() {
    await getSupabase().auth.signOut();
  },

  async getSession() {
    const { data } = await getSupabase().auth.getSession();
    return data.session;
  }
};

// ── DEMO/MOCK DATA (used when Supabase not yet configured) ──
const DEMO_PRODUCTS = [
  { id:'p1', name:'Goku Ultra Instinct Helmet', category:'Cosplay Props', price:8500, old_price:11000, description:'High-detail PLA+ helmet print, primed and ready to paint. Designed for cosplay use with internal foam padding mounts. Fits most adult head sizes.', stock:5, icon:'🪖', featured:true, tag:'Popular', model_url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb', specs:{material:'PLA+',layer_height:'0.15mm',infill:'25%',finish:'Primed',weight:'~380g'} },
  { id:'p2', name:'PLA+ Filament 1kg', category:'Filament', price:3200, old_price:null, description:'Premium 1.75mm PLA+ available in 12 colours. Tangle-free vacuum-sealed spool. ±0.02mm dimensional accuracy.', stock:50, icon:'🧵', featured:true, tag:'In Stock', specs:{diameter:'1.75mm',weight:'1kg',tolerance:'±0.02mm',temp:'200–220°C',bed:'0–60°C'} },
  { id:'p3', name:'Ender 5 Upgrade Kit', category:'Printer Parts', price:4800, old_price:5500, description:'Drop-in replacement extruder, belt tensioner, and hardened steel nozzle set for the Ender 5 / 5 Pro.', stock:12, icon:'🔩', featured:true, tag:'Deal', model_url:'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/ToyCar/glTF-Binary/ToyCar.glb', specs:{compatibility:'Ender 5 / 5 Pro',includes:'Extruder, Tensioner, 3× Nozzles',nozzle_size:'0.4mm'} },
  { id:'p4', name:'Prop Sword — EVA Core', category:'Cosplay Props', price:12000, old_price:null, description:'Lightweight cosplay sword with EVA foam core and PLA shell. Highly detailed surface, ready for primer. Based on popular anime references.', stock:3, icon:'⚔️', featured:false, tag:'Custom', model_url:'https://modelviewer.dev/shared-assets/models/Astronaut.glb', specs:{length:'90cm',material:'EVA + PLA+',weight:'~280g',finish:'Raw / Unprimed'} },
  { id:'p5', name:'PETG Filament 1kg', category:'Filament', price:3600, old_price:null, description:'Tough, heat-resistant, and food-safe. Ideal for functional printed parts. Available in black, clear, and blue.', stock:30, icon:'🎁', featured:false, tag:'In Stock', specs:{diameter:'1.75mm',weight:'1kg',temp:'230–250°C',bed:'70–80°C'} },
  { id:'p6', name:'Miniature Paint Set (12pc)', category:'Tools & Finishing', price:2400, old_price:2800, description:'System 3 acrylic paint set with 12 colours selected for prop and miniature work. Includes primer and matte varnish.', stock:20, icon:'🎨', featured:false, tag:'Deal', specs:{count:'12 colours + primer + varnish',size:'22ml each',type:'Acrylic'} },
  { id:'p7', name:'TPU Flex Filament 500g', category:'Filament', price:2900, old_price:null, description:'Shore 95A flexible filament. Perfect for grips, gaskets, phone cases, and vibration-dampening parts.', stock:15, icon:'🌀', featured:false, tag:'In Stock', specs:{diameter:'1.75mm',shore:'95A',weight:'500g',temp:'210–230°C'} },
  { id:'p8', name:'Post-Processing Tool Kit', category:'Tools & Finishing', price:1800, old_price:null, description:'Deburring tool, needle files (5-piece), sandpaper assortment (100–2000 grit), and plastic scraper. Everything you need for clean post-processing.', stock:25, icon:'🛠️', featured:false, tag:'Useful', specs:{includes:'Deburring tool, 5 files, sandpaper set, scraper'} },
  // ── Laser Cutting Products ──
  { id:'lc1', name:'Acrylic Name Sign', category:'Laser Cutting', price:1800, old_price:2400, description:'Custom cut acrylic name or word sign in your choice of colour. 3mm cast acrylic, clean laser-cut edges. Perfect for desks, shelves, and gifting.', stock:99, icon:'✨', featured:true, tag:'Popular', specs:{material:'3mm Cast Acrylic',size:'Up to 20×10cm',finish:'Polished edges',colours:'Clear, Black, White, Red, Blue, Green, Gold, Pink'} },
  { id:'lc2', name:'Wooden Coaster Set (4pc)', category:'Laser Cutting', price:2200, old_price:null, description:'Set of 4 laser-engraved MDF coasters with custom design or text. 90mm diameter, 6mm thick. Sealed with matte lacquer.', stock:30, icon:'🪵', featured:true, tag:'In Stock', specs:{material:'6mm MDF',size:'90mm diameter',quantity:'4 coasters',finish:'Matte lacquer sealed'} },
  { id:'lc3', name:'Acrylic Keychain', category:'Laser Cutting', price:450, old_price:null, description:'Custom shape or text acrylic keychain. Choose your colour, we cut and engrave it. Great for events, gifts, and branding.', stock:99, icon:'🔑', featured:false, tag:'In Stock', specs:{material:'3mm Cast Acrylic',size:'Up to 6×4cm',hardware:'Metal split ring included'} },
  { id:'lc4', name:'Engraved Plaque — Acrylic', category:'Laser Cutting', price:3500, old_price:4200, description:'Professional engraved acrylic plaque for awards, recognition, or office use. High-contrast laser engraving on gloss acrylic with standoff mounting hardware.', stock:15, icon:'🏆', featured:false, tag:'Deal', specs:{material:'5mm Gloss Acrylic',size:'A5 (148×210mm)',mounting:'4× chrome standoffs included',engraving:'White fill on black or black fill on clear'} },
  { id:'lc5', name:'Fabric Patch — Custom Shape', category:'Laser Cutting', price:650, old_price:null, description:'Laser-cut felt or canvas patch in any shape. Clean sealed edges, no fraying. Ideal for cosplay, bags, jackets, and merchandise.', stock:50, icon:'🧩', featured:false, tag:'In Stock', specs:{materials:'Felt, Canvas, Denim',size:'Up to 10×10cm',edges:'Heat-sealed, no fray',minimum:'1 piece'} },
  { id:'lc6', name:'Leather Luggage Tag', category:'Laser Cutting', price:1200, old_price:null, description:'Laser-engraved genuine leather luggage tag with your name or custom text. 3–4mm vegetable-tanned leather, brass eyelet, and loop included.', stock:20, icon:'🏷️', featured:false, tag:'In Stock', specs:{material:'3–4mm Veg-tanned leather',size:'10×5cm',hardware:'Brass eyelet + strap loop',engraving:'Deep laser engraving'} },
];

// ── PRODUCT RENDER ────────────────────────────────────────
function renderProductCard(p, linkBase = '../pages/product.html') {
  const tag = p.tag || (p.old_price ? 'Deal' : 'In Stock');
  const tagCls = tag === 'Deal' ? 'red' : tag === 'Custom' ? 'orange' : '';
  return `
    <div class="card product-card" onclick="location.href='${linkBase}?id=${p.id}'">
      <div class="product-thumb">
        ${p.image ? `<img src="${p.image}" alt="${p.name}">` : `<span class="thumb-emoji">${p.icon || '📦'}</span>`}
        <span class="prod-tag ${tagCls}">${tag}</span>
        ${p.model_url ? `<span class="prod-3d">3D</span>` : ''}
      </div>
      <div class="card-body">
        <span class="prod-cat">${p.category}</span>
        <div class="prod-name">${p.name}</div>
        <div class="prod-desc">${p.description?.substring(0,88)}…</div>
        <div class="prod-footer">
          <div>
            ${p.old_price ? `<span class="prod-old">${fmt(p.old_price)}</span>` : ''}
            <span class="prod-price">${fmt(p.price)}</span>
          </div>
          <button class="btn btn-accent btn-sm" onclick="event.stopPropagation(); Cart.add(${JSON.stringify(p).replace(/"/g,'&quot;')})">Add +</button>
        </div>
      </div>
    </div>`;
}

// ── SHARED NAV HTML ───────────────────────────────────────
function renderNav(activePage = '') {
  const base = location.pathname.includes('/pages/') ? '../' : './';
  return `
  <nav>
    <a href="${base}index.html" class="logo"><span class="logo-dot"></span>PrintForge</a>
    <div class="nav-links">
      <a href="${base}index.html" ${activePage==='home'?'class="active"':''}>Home</a>
      <a href="${base}pages/shop.html" ${activePage==='shop'?'class="active"':''}>Shop</a>
      <a href="${base}pages/laser.html" ${activePage==='laser'?'class="active"':''}>Laser Cutting</a>
      <a href="${base}pages/blog.html" ${activePage==='blog'?'class="active"':''}>Blog</a>
      <a href="${base}pages/about.html" ${activePage==='about'?'class="active"':''}>About</a>
      <a href="${base}pages/orders.html" ${activePage==='orders'?'class="active"':''}>Track Order</a>
    </div>
    <div class="nav-actions">
      <button class="nav-btn" onclick="location.href='${base}pages/cart.html'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        Cart
        <span class="cart-bubble" id="cartCount" style="display:none">0</span>
      </button>
    </div>
  </nav>`;
}

function renderFooter() {
  const base = location.pathname.includes('/pages/') ? '../' : './';
  return `
  <footer>
    <div class="footer-grid">
      <div class="footer-brand">
        <a href="${base}index.html" class="logo"><span class="logo-dot"></span>PrintForge</a>
        <p>Workshop-direct 3D printing, laser cutting, filament, and cosplay props. Based in Mount Lavinia, Sri Lanka.</p>
      </div>
      <div class="footer-col">
        <h5>Shop</h5>
        <a href="${base}pages/shop.html?cat=Cosplay Props">Cosplay Props</a>
        <a href="${base}pages/shop.html?cat=Filament">Filament</a>
        <a href="${base}pages/shop.html?cat=Laser Cutting">Laser Products</a>
        <a href="${base}pages/shop.html?cat=Printer Parts">Printer Parts</a>
      </div>
      <div class="footer-col">
        <h5>Services</h5>
        <a href="${base}pages/laser.html">Laser Cutting</a>
        <a href="${base}pages/about.html#custom">Custom 3D Prints</a>
        <a href="${base}pages/about.html#custom">Prototyping</a>
        <a href="${base}pages/about.html#custom">Finishing</a>
      </div>
      <div class="footer-col">
        <h5>Info</h5>
        <a href="${base}pages/about.html">About</a>
        <a href="${base}pages/orders.html">Track Order</a>
        <a href="${base}pages/about.html#contact">Contact</a>
        <a href="${base}pages/admin.html" style="margin-top:.5rem;opacity:.4;font-size:.75rem">Admin</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© 2025 PrintForge. Mount Lavinia, Sri Lanka.</span>
      <span>${CONFIG.shop.email}</span>
    </div>
  </footer>`;
}

function initNav() {
  Cart._sync();
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    if (a.getAttribute('href') === path) a.classList.add('active');
  });
  // Inject theme toggle after nav HTML is in the DOM
  if (window._themeInject) window._themeInject();
}

// ── THEME BOOTSTRAP ──────────────────────────────────────────
// Applied immediately (before paint) to prevent flash of wrong theme
(function () {
  const saved = localStorage.getItem('pf_theme');
  if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
})();

// Load theme.js dynamically so it works regardless of script order
document.addEventListener('DOMContentLoaded', function () {
  const base = document.querySelector('script[src*="app.js"]')
    ?.getAttribute('src')?.replace('app.js', '') || '../js/';
  const s = document.createElement('script');
  s.src = base + 'theme.js';
  document.head.appendChild(s);
});
