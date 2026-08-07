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

export const MENU = [
// Frozen Snacks (per piece, min 10, +5 each step, default stock 20)
  { id: "fz-samoosa-chicken", cat: "frozen", name: "Samoosa (Chicken)", unit: "1 Piece", minQty: 10, step: 5, price: 12, stock: 20, img: "images/fz-samoosa-chicken.png" },
  { id: "fz-samoosa-beef", cat: "frozen", name: "Samoosa (Beef)", unit: "1 Piece", minQty: 10, step: 5, price: 15, stock: 20, img: "images/fz-samoosa-beef.png" },
  { id: "fz-cutlet-chicken", cat: "frozen", name: "Cutlet (Chicken)", unit: "1 Piece", minQty: 10, step: 5, price: 15, stock: 20, img: "images/fz-cutlet-chicken.png" },
  { id: "fz-cutlet-beef", cat: "frozen", name: "Cutlet (Beef)", unit: "1 Piece", minQty: 10, step: 5, price: 18, stock: 20, img: "images/fz-cutlet-beef.png" },
  { id: "fz-unnakaya", cat: "frozen", name: "Unnakaya", unit: "1 Piece", minQty: 10, step: 5, price: 12, stock: 20, img: "images/fz-unnakaya.png" },
  { id: "fz-kallumakaya-plain", cat: "frozen", name: "Kallumakaya (w/o masala)", unit: "1 Piece", minQty: 10, step: 5, price: 18, stock: 20, img: "images/fz-kallumakaya-plain.png" },
  { id: "fz-kallumakaya-masala", cat: "frozen", name: "Kallumakaya (w/ masala)", unit: "1 Piece", minQty: 10, step: 5, price: 20, stock: 20, img: "images/fz-kallumakaya-masala.png" },
  { id: "fz-chicken-roll", cat: "frozen", name: "Chicken Roll", unit: "1 Piece", minQty: 10, step: 5, price: 15, stock: 20, img: "images/fz-chicken-roll.png" },
  // Fried Snacks (per piece, min 10, +5 each step, default stock 20)
  { id: "fr-samoosa-chicken", cat: "fried", name: "Samoosa (Chicken)", unit: "1 Piece", minQty: 10, step: 5, price: 15, stock: 20, img: "images/fr-samoosa-chicken.png" },
  { id: "fr-samoosa-beef", cat: "fried", name: "Samoosa (Beef)", unit: "1 Piece", minQty: 10, step: 5, price: 18, stock: 20, img: "images/fr-samoosa-beef.png" },
  { id: "fr-cutlet-chicken", cat: "fried", name: "Cutlet (Chicken)", unit: "1 Piece", minQty: 10, step: 5, price: 18, stock: 20, img: "images/fr-cutlet-chicken.png" },
  { id: "fr-cutlet-beef", cat: "fried", name: "Cutlet (Beef)", unit: "1 Piece", minQty: 10, step: 5, price: 20, stock: 20, img: "images/fr-cutlet-beef.png" },
  { id: "fr-unnakaya", cat: "fried", name: "Unnakaya", unit: "1 Piece", minQty: 10, step: 5, price: 15, stock: 20, img: "images/fr-unnakaya.png" },
  { id: "fr-kallumakaya", cat: "fried", name: "Kallumakaya", unit: "1 Piece", minQty: 10, step: 5, price: 22, stock: 20, img: "images/fr-kallumakaya.png" },
  { id: "fr-chicken-roll", cat: "fried", name: "Chicken Roll", unit: "1 Piece", minQty: 10, step: 5, price: 20, stock: 20, img: "images/fr-chicken-roll.png" },
  // Mains (per KG, min 1 KG, 0.5 KG increments)
  { id: "mc-chicken-biriyani", cat: "mains", name: "Chicken Biriyani", unit: "1 KG", minQty: 1, step: 0.5, price: 750, img: "images/mc-chicken-biriyani.png" },
  { id: "mc-beef-biriyani", cat: "mains", name: "Beef Biriyani", unit: "1 KG", minQty: 1, step: 0.5, price: 800, img: "images/mc-beef-biriyani.png" },
  { id: "mc-fish-biriyani", cat: "mains", name: "Fish Biriyani", unit: "1 KG", minQty: 1, step: 0.5, price: 1100, seasonal: true, img: "images/mc-fish-biriyani.png" },
  { id: "mc-mutton-biriyani", cat: "mains", name: "Mutton Biriyani", unit: "1 KG", minQty: 1, step: 0.5, price: 1250, seasonal: true, img: "images/mc-mutton-biriyani.png" },
  { id: "mc-madhooth", cat: "mains", name: "Madhooth", unit: "1 KG", minQty: 1, step: 0.5, price: 700, img: "images/mc-madhooth.png" },
  { id: "mc-chicken-curry", cat: "mains", name: "Chicken Curry", unit: "1 KG", minQty: 1, step: 0.5, price: 350, img: "images/mc-chicken-curry.png" },
  { id: "mc-ginger-chicken", cat: "mains", name: "Ginger Chicken", unit: "1 KG", minQty: 1, step: 0.5, price: 450, img: "images/mc-ginger-chicken.png" },
  { id: "mc-butter-chicken", cat: "mains", name: "Butter Chicken", unit: "1 KG", minQty: 1, step: 0.5, price: 650, img: "images/mc-butter-chicken.png" },
  { id: "mc-chilly-chicken", cat: "mains", name: "Chilly Chicken", unit: "1 KG", minQty: 1, step: 0.5, price: 500, img: "images/mc-chilly-chicken.png" },
  { id: "mc-turkish-chicken", cat: "mains", name: "Turkish Chicken", unit: "1 KG", minQty: 1, step: 0.5, price: 700, img: "images/mc-turkish-chicken.png" },
  { id: "mc-pepper-chicken", cat: "mains", name: "Pepper Chicken", unit: "1 KG", minQty: 1, step: 0.5, price: 400, img: "images/mc-pepper-chicken.png" },
  { id: "mc-chicken-65", cat: "mains", name: "Chicken 65", unit: "1 KG", minQty: 1, step: 0.5, price: 650, img: "images/mc-chicken-65.png" },
  { id: "mc-chicken-stew", cat: "mains", name: "Chicken Stew", unit: "1 KG", minQty: 1, step: 0.5, price: 550, img: "images/mc-chicken-stew.png" },
  { id: "mc-thai-chicken", cat: "mains", name: "Thai Chicken", unit: "1 KG", minQty: 1, step: 0.5, price: 700, img: "images/mc-thai-chicken.png" },
  { id: "mc-garlic-chicken", cat: "mains", name: "Garlic Chicken", unit: "1 KG", minQty: 1, step: 0.5, price: 450, img: "images/mc-garlic-chicken.png" },
  { id: "mc-chicken-fry", cat: "mains", name: "Chicken Fry", unit: "1 KG", minQty: 1, step: 0.5, price: 500, img: "images/mc-chicken-fry.png" },
  { id: "mc-hummus", cat: "mains", name: "Hummus", unit: "1 KG", minQty: 1, step: 0.5, price: 350, img: "images/mc-hummus.png" },
];

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
  const v = await readStorage("inventory");
  if (v) return v;
  const local = readLocal("inventory");
  if (local) return local;
  // Seed default stock from MENU definition
  const seed = {};
  MENU.forEach((item) => {
    if (item.stock != null) {
      seed[item.id] = { stock: item.stock };
    }
  });
  return seed;
}
export async function saveInventory(inv) {
  await writeStorage("inventory", inv);
  writeLocal("inventory", inv);
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
