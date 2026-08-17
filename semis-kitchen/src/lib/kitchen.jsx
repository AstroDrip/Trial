import {
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Snowflake,
  Flame,
  Soup,
} from "lucide-react";

// API base URL — set VITE_API_URL in production (Vercel env var) to point at
// your deployed backend (e.g. https://your-api.vercel.app/api). In local dev
// it defaults to a relative "/api" path, which the Vite dev server proxies to
// the backend (see vite.config.js). Using a relative path avoids LAN-IP
// reachability and CORS issues so the site works from any host.
export const API = import.meta.env.VITE_API_URL || "/api";


/* ---------------------------------------------------------
   Brand
--------------------------------------------------------- */
export const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Work+Sans:wght@400;500;600;700&display=swap');
`;

export const CATS = [
  { id: "fried", name: "Fried Snacks", icon: Flame },
  { id: "frozen", name: "Frozen Snacks", icon: Snowflake },
  { id: "mains", name: "Biriyani & Curries", icon: Soup },
];

/* Reformat item names to remove parentheses, e.g. "Cutlet (Beef)" -> "Beef Cutlet",
   "Kallumakaya (w/ masala)" -> "Masala Kallumakaya",
   "Kallumakaya (w/o masala)" -> "Plain Kallumakaya". */
function formatItemName(name) {
  if (!name) return name;
  const m = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (!m) return name.trim();
  const base = m[1].trim();
  const variant = m[2].trim();
  let prefix = variant;
  if (/^w\/\s*masala$/i.test(variant)) prefix = "Masala";
  else if (/^w\/o\s*masala$/i.test(variant)) prefix = "Plain";
  else prefix = variant.replace(/\bw\/\b/g, "with");
  return `${prefix} ${base}`.trim();
}

export async function loadMenu() {
  const res = await fetch(`${API}/menu`);
  const json = await res.json();

  const menu = json.data.map((item) => ({
    id: item.id,
    cat: item.cat,
    name: formatItemName(item.name),
    unit: item.unit,
    minQty: Number(item.minQty),
    step: Number(item.step),
    price: Number(item.price),
    stock: Number(item.stock),
    seasonal: item.seasonal,
    img: item.img,
  }));

  // Hybrid: the live (authoritative) catalog is cached locally so the menu can
  // paint instantly on later visits even before the backend responds. New live
  // data always overwrites the cache, so real item ids + current
  // price/stock/availability stay in sync. Fire-and-forget on purpose — don't
  // delay the menu returning just to persist the cache.
  writeMenuCache(menu);

  return menu;
}

/* Map image filenames (from src/assets/images/) to their built URLs.
   Upload PNG/JPG files with names matching each menu item's `img` field. */
const MENU_IMAGES = import.meta.glob("/src/assets/images/*", {
  eager: true,
  query: "?url",
  import: "default",
});

/* Fallback mapping: fried & frozen snacks share the same photo. When a menu
   item's exact image file isn't present, fall back to the matching photo
   that is available in src/assets/images/. */
const IMAGE_FALLBACK = {
  /* Fried snacks (fr-*) */
  "fr-chicken-roll.png": "fr-ChickenRoll.jpeg",
  "fr-cutlet-beef.png": "fr-cutlet.jpeg",
  "fr-cutlet-chicken.png": "fr-cutlet.jpeg",
  "fr-kallumakaya.png": "fr-Kallumakaya.jpeg",
  "fr-samoosa-beef.png": "fr-samoosa.png",
  "fr-samoosa-chicken.png": "fr-samoosa.png",
  "fr-unnakaya.png": "fr-Unnakaya.jpeg",
  /* Frozen snacks (fz-*) — 6 new photos */
  "fz-chicken-roll.png": "fz-ChickenRoll.jpeg",
  "fz-cutlet-beef.png": "fz-Cutlet.jpeg",
  "fz-cutlet-chicken.png": "fz-Cutlet.jpeg",
  "fz-kallumakaya-masala.png": "fz-Masala-Kallumakaya.jpeg",
  "fz-kallumakaya-plain.png": "fz-Plain-Kallumakaya.jpeg",
  "fz-samoosa-beef.png": "fz-Samoosa.jpeg",
  "fz-samoosa-chicken.png": "fz-Samoosa.jpeg",
  "fz-unnakaya.png": "fz-Unnakaya.jpeg",
  /* Biriyanis & curries (mains) — match menu png refs to the uploaded photos */
  "mc-beef-biriyani.png": "beef-biryani.jpeg",
  "mc-butter-chicken.png": "butter-chicken.jpeg",
  "mc-chicken-65.png": "chicken-65.jpeg",
  "mc-chicken-biriyani.png": "chicken-biryani.jpeg",
  "mc-chicken-curry.png": "chicken-curry.jpeg",
  "mc-chicken-fry.png": "chicken-fry.jpeg",
  "mc-chicken-stew.png": "chicken-stew.jpeg",
  "mc-chilly-chicken.png": "chilly-chicken.jpeg",
  "mc-fish-biriyani.png": "fish-biryani.jpeg",
  "mc-garlic-chicken.png": "garlic-chicken.jpeg",
  "mc-ginger-chicken.png": "ginger-chicken.jpeg",
  "mc-hummus.png": "hummus.jpeg",
  "mc-madhooth.png": "madhooth.jpeg",
  "mc-mutton-biriyani.png": "mutton-biryani.jpeg",
  "mc-pepper-chicken.png": "pepper-chicken.jpeg",
  "mc-thai-chicken.png": "thai-chicken.jpeg",
  "mc-turkish-chicken.png": "turkish-chicken.jpeg",
};

const imgCache = new Map();
export function resolveImg(img) {
  if (!img) return undefined;
  if (imgCache.has(img)) return imgCache.get(img);
  const clean = img.replace(/^images\//, "");
  const direct = MENU_IMAGES[`/src/assets/images/${clean}`];
  if (direct) {
    imgCache.set(img, direct);
    return direct;
  }
  const fallbackName = IMAGE_FALLBACK[clean];
  if (fallbackName) {
    const resolved = MENU_IMAGES[`/src/assets/images/${fallbackName}`];
    imgCache.set(img, resolved);
    return resolved;
  }
  imgCache.set(img, undefined);
  return undefined;
}

/* Hero images: auto-detect any hero* / Hero-1* image dropped into src/assets/images/.
   Matches lowercase "hero..." and uppercase "Hero-1 ..." so the slideshow picks
   up every uploaded file regardless of naming/case. */
const HERO_IMAGES = import.meta.glob("/src/assets/images/[Hh]ero*", {
  eager: true,
  query: "?url",
  import: "default",
});
export function getFolderHeroImages() {
  return Object.values(HERO_IMAGES);
}

export const ADMIN_CODE = "semi2026";
export const STATUS = {
  pending: { label: "Pending", color: "text-amber-400", bg: "bg-amber-400/10", ring: "ring-amber-400/30" },
  accepted: { label: "Accepted", color: "text-emerald-400", bg: "bg-emerald-400/10", ring: "ring-emerald-400/30" },
  declined: { label: "Declined", color: "text-red-400", bg: "bg-red-400/10", ring: "ring-red-400/30" },
  completed: { label: "Completed", color: "text-sky-400", bg: "bg-sky-400/10", ring: "ring-sky-400/30" },
};

export function rupee(n) {
  return `₹${n.toLocaleString("en-IN")}`;
}
export function genId() {
  return "SK" + Math.random().toString(36).slice(2, 6).toUpperCase() + Date.now().toString().slice(-4);
}
export function genInvoiceId() {
  const d = new Date();
  const ymd =
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return "INV-" + ymd + "-" + rand;
}
/* ---------------------------------------------------------
   Storage helpers (shared, so admin + customers see the same data)
   Uses window.storage when available, otherwise falls back to
   localStorage so orders persist reliably in any browser.
--------------------------------------------------------- */
function readLocal(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
async function readStorage(key) {
  try {
    const r = await window.storage.get(key, true);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}

/* ---------------------------------------------------------
   Menu catalog cache — the "static catalog" half of the hybrid.
   After every successful live load, the authoritative menu (real
   ids + current price/stock/availability) is saved here so the
   customer page can render it instantly on later visits, then the
   fresh /api inventory + /api/menu overlay refreshes it. Item ids
   are the backend's real ids, so orders and admin inventory edits
   keep working unchanged. localStorage write is synchronous (so we
   can seed React state on first paint); window.storage (if present)
   is mirrored so browsers that prefer it stay in sync.
--------------------------------------------------------- */
const MENU_CACHE_KEY = "semis_menu_cache";

function readMenuCacheSync() {
  const v = readLocal(MENU_CACHE_KEY);
  return Array.isArray(v) ? v : [];
}

async function writeMenuCache(menu) {
  if (!Array.isArray(menu) || menu.length === 0) return;
  try {
    localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(menu));
    if (window.storage?.set) {
      await window.storage.set(MENU_CACHE_KEY, JSON.stringify(menu));
    }
  } catch {
    /* Never let a cache write break the live fetch. */
  }
}

/* Last-known catalog, read synchronously for an instant first paint.
   The live inventory overlay (price/stock/availability) is applied on
   top by the caller via the regular loadMenu / loadInventory refresh. */
export function loadMenuStored() {
  return readMenuCacheSync();
}

export async function loadInventory() {
  const res = await fetch(`${API}/inventory`);
  const json = await res.json();

  const inv = {};

  json.data.forEach((item) => {
    inv[item.menu_item_id] = {
      stock: item.stock,
      available: item.available,
      price: Number(item.selling_price),
    };
  });

  return inv;
}

/* Field-level inventory update — sends only the changed field(s) so concurrent
   admins editing different fields (price vs stock vs availability) don't
   overwrite each other's changes. */
export async function updateInventoryField(id, patch) {
  const res = await fetch(`${API}/inventory/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const json = await res.json();
  return json.data;
}

export async function createOrder(order) {
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...order, paymentStatus: order.paymentStatus || "unpaid" }),
  });
  const json = await res.json();
  return json.data;
}

export async function updatePaymentStatusApi(id, paymentStatus) {
  const res = await fetch(`${API}/orders/${id}/payment`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentStatus }),
  });
  const json = await res.json();
  return json.data;
}

/* Map a payment-method code to its display label */
export function paymentMethodLabel(code) {
  if (!code) return null;
  const map = { cod: "Cash on Delivery", upi: "UPI" };
  return map[code] || code;
}

/* Map a delivery slot id like "11-12" to a readable label like
   "11:00 AM – 12:00 PM". Mirrors the slot generation in App.jsx. */
export function deliverySlotLabel(slotId) {
  if (!slotId) return null;
  const [start, end] = slotId.split("-").map(Number);
  if (Number.isNaN(start) || Number.isNaN(end)) return slotId;
  const fmt = (h) => {
    const period = h >= 12 ? "PM" : "AM";
    const hr = h % 12 === 0 ? 12 : h % 12;
    return `${hr}:00 ${period}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

/* Format a YYYY-MM-DD (or Date-parsable) delivery date for display. */
export function deliveryDateLabel(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/* Shared mapper: raw API order row -> frontend order object. */
function mapOrder(o) {
  return {
    id: o.id,
    invoiceId: o.invoice_id,
    status: o.status,
    paymentStatus: o.payment_status || "unpaid",
    paymentMethod: o.payment_method || "cod",
    syncedAt: o.synced_at,
    total: Number(o.total),
    createdAt: new Date(o.created_at).getTime(),
    customer: {
      name: o.customer_name,
      phone: o.customer_phone,
      address: o.customer_address,
      mode: o.order_mode,
      notes: o.notes,
      location: o.latitude != null ? { lat: o.latitude, lng: o.longitude } : null,
      deliveryDate: o.delivery_date,
      deliverySlot: o.delivery_slot,
    },
    items: o.items.map((i) => ({ id: i.id, name: formatItemName(i.name), qty: Number(i.qty), price: Number(i.price) })),
  };
}

export async function fetchOrders() {
  const res = await fetch(`${API}/orders`);
  const json = await res.json();
  return json.data.map(mapOrder);
}


export async function deleteOrderApi(id) {
  await fetch(`${API}/orders/${id}`, { method: "DELETE" });
}

/* Deletes orders that are completed, paid, and already confirmed synced to
   the Google Sheet — see the Admin Invoices tab's "Delete paid & synced"
   button. Returns how many rows were actually deleted. */
export async function deletePaidSyncedOrdersApi() {
  const res = await fetch(`${API}/orders/paid-synced`, { method: "DELETE" });
  const json = await res.json();
  return json.deletedCount ?? 0;
}

/* Fetch archived (backed-up) orders from the shared database. This replaces
   the old per-browser localStorage archive so every admin sees identical data. */
export async function fetchArchivedOrders() {
  const res = await fetch(`${API}/orders/archived`);
  const json = await res.json();
  return json.data.map(mapOrder);
}

/* Mark a set of orders as archived in the shared database. */
export async function archiveOrdersApi(ids) {
  const res = await fetch(`${API}/orders/archive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
  const json = await res.json();
  return json.data;
}

/* Atomic, concurrency-safe stock decrement (no read-modify-write race). */
export async function decrementStockApi(id, qty) {
  const res = await fetch(`${API}/inventory/${id}/decrement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qty }),
  });
  const json = await res.json();
  return json.data;
}

export async function updateOrderStatusApi(id, status) {
  const res = await fetch(`${API}/orders/${id}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  const json = await res.json();
  return json.data;
}

export async function fetchSalesSummary() {
  const res = await fetch(`${API}/sales/summary`);
  const json = await res.json();
  return json.data; // [{ date, orders_count, revenue }]
}

/* ---------------------------------------------------------
   Invoice helpers (PDF generation + Google Sheets sync)
--------------------------------------------------------- */
/* Download a single invoice PDF for an order (opens in a new tab). */
export function downloadInvoice(orderId) {
  window.open(`${API}/invoices/${encodeURIComponent(orderId)}`, "_blank");
}

/* Download a ZIP of one PDF per accepted order. */
export function downloadAllInvoices() {
  const a = document.createElement("a");
  a.href = `${API}/invoices/batch`;
  a.download = `invoices-${Date.now()}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* Push all accepted orders' line items into the configured Google Sheet.
   Returns { success, appended } or throws on failure. */
export async function syncToSheets() {
  const res = await fetch(`${API}/invoices/sync-sheet`, { method: "POST" });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Sync to Google Sheets failed");
  return json; // { success, appended }
}

export async function loadHeroImages() {
  const v = await readStorage("heroImages");
  if (v) return v;
  return readLocal("heroImages") ?? [];
}

/* ---------------------------------------------------------
   Small shared bits
--------------------------------------------------------- */
export function Logo({ size = "md" }) {
  const big = size === "lg";
  return (
    <div className="leading-none">
      <div
        className={`${big ? "text-4xl" : "text-3xl"} text-amber-300 tracking-tight uppercase`}
        style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}
      >
        Semi's Kitchen
      </div>
      {big && <div className="text-stone-400 text-xs tracking-[0.2em] uppercase mt-1">Malabar snacks &amp; curries, made to order</div>}
    </div>
  );
}

export function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ${s.bg} ${s.color} ${s.ring}`}>
      {status === "pending" && <Clock className="w-3 h-3" />}
      {status === "accepted" && <CheckCircle2 className="w-3 h-3" />}
      {status === "declined" && <XCircle className="w-3 h-3" />}
      {status === "completed" && <Package className="w-3 h-3" />}
      {s.label}
    </span>
  );
}
