import {
  ChefHat,
  Clock,
  CheckCircle2,
  XCircle,
  Package,
  Snowflake,
  Flame,
  Soup,
} from "lucide-react";

// API base URL — set VITE_API_URL in production (Vercel env var) to point at
// your deployed backend (e.g. https://your-api.vercel.app/api). Falls back to
// local dev server when the env var isn't set.
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/* ---------------------------------------------------------
   Brand
--------------------------------------------------------- */
export const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,500&family=Work+Sans:wght@400;500;600;700&display=swap');
`;

export const CATS = [
  { id: "frozen", name: "Frozen Snacks", icon: Snowflake },
  { id: "fried", name: "Fried Snacks", icon: Flame },
  { id: "mains", name: "Biriyani & Curries", icon: Soup },
];

export async function loadMenu() {
  const res = await fetch(`${API}/menu`);
  const json = await res.json();

  return json.data.map((item) => ({
    id: item.id,
    cat: item.cat,
    name: item.name,
    unit: item.unit,
    minQty: Number(item.minQty),
    step: Number(item.step),
    price: Number(item.price),
    stock: Number(item.stock),
    seasonal: item.seasonal,
    img: item.img,
  }));
}

/* Map image filenames (from src/assets/images/) to their built URLs.
   Upload PNG/JPG files with names matching each menu item's `img` field. */
const MENU_IMAGES = import.meta.glob("/src/assets/images/*", {
  eager: true,
  query: "?url",
  import: "default",
});
export function resolveImg(img) {
  if (!img) return undefined;
  const key = `/src/assets/images/${img.replace(/^images\//, "")}`;
  return MENU_IMAGES[key];
}

/* Hero images: auto-detect any hero*.png/jpg/webp dropped into src/assets/images/ */
const HERO_IMAGES = import.meta.glob("/src/assets/images/hero*", {
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
export function compressImage(file, maxW = 1200, quality = 0.75) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Load failed"));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Read failed"));
    reader.readAsDataURL(file);
  });
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
function writeLocal(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

async function readStorage(key) {
  try {
    const r = await window.storage.get(key, true);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}
async function writeStorage(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), true);
  } catch {}
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

export async function saveInventory(inv) {
  for (const id in inv) {
    await fetch(`${API}/inventory/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inv[id]),
    });
  }
}

export async function createOrder(order) {
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(order),
  });
  const json = await res.json();
  return json.data;
}

export async function fetchOrders() {
  const res = await fetch(`${API}/orders`);
  const json = await res.json();

  return json.data.map((o) => ({
    id: o.id,
    invoiceId: o.invoice_id,
    status: o.status,
    total: Number(o.total),
    createdAt: new Date(o.created_at).getTime(),
    customer: {
      name: o.customer_name,
      phone: o.customer_phone,
      address: o.customer_address,
      mode: o.order_mode,
      notes: o.notes,
      location: o.latitude != null ? { lat: o.latitude, lng: o.longitude } : null,
    },
    items: o.items.map((i) => ({ id: i.id, name: i.name, qty: Number(i.qty), price: Number(i.price) })),
  }));
}


export async function deleteOrderApi(id) {
  await fetch(`${API}/orders/${id}`, { method: "DELETE" });
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

export async function loadOrders() {
  const v = await readStorage("orders");
  if (v) return v;
  return readLocal("orders") ?? [];
}
export async function saveOrders(orders) {
  await writeStorage("orders", orders);
  writeLocal("orders", orders);
}
export async function loadHeroImages() {
  const v = await readStorage("heroImages");
  if (v) return v;
  return readLocal("heroImages") ?? [];
}
export async function saveHeroImages(images) {
  await writeStorage("heroImages", images);
  writeLocal("heroImages", images);
}

/* Archived (backed-up) orders: completed & declined orders are moved here
   so the active orders list can be cleared for a fresh start while the
   invoices & sales sections keep the historical records. */
export async function loadArchivedOrders() {
  const v = await readStorage("archivedOrders");
  if (v) return v;
  return readLocal("archivedOrders") ?? [];
}
export async function saveArchivedOrders(orders) {
  await writeStorage("archivedOrders", orders);
  writeLocal("archivedOrders", orders);
}

/* ---------------------------------------------------------
   Small shared bits
--------------------------------------------------------- */
export function Logo({ size = "md" }) {
  const big = size === "lg";
  return (
    <div className="flex items-center gap-2.5">
      <div className={`${big ? "w-11 h-11" : "w-9 h-9"} rounded-full bg-amber-400 flex items-center justify-center shrink-0`}>
        <ChefHat className={`${big ? "w-6 h-6" : "w-5 h-5"} text-green-950`} strokeWidth={2.2} />
      </div>
      <div className="leading-none">
        <div
          className={`${big ? "text-3xl" : "text-xl"} text-amber-300 tracking-tight`}
          style={{ fontFamily: "'Fraunces', serif", fontWeight: 600 }}
        >
          Semi's Kitchen
        </div>
        {big && <div className="text-stone-400 text-xs tracking-[0.2em] uppercase mt-1">Malabar snacks &amp; curries, made to order</div>}
      </div>
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
