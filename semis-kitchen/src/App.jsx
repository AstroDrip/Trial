import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ShoppingBag,
  Plus,
  Minus,
  X,
  Check,
} from "lucide-react";

import {
  FONTS,
  CATS,
  rupee,
  genId,
  genInvoiceId,
  resolveImg,
  loadMenu,
  loadInventory,
  createOrder,
  loadHeroImages,
  getFolderHeroImages,
} from "./lib/kitchen.jsx";
import LocationPicker from "./components/LocationPicker.jsx";

/* ---------------------------------------------------------
   Delivery time slots: hourly ranges from 11 AM to 9 PM.
--------------------------------------------------------- */
function formatHour12(h) {
  const period = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:00 ${period}`;
}
const DELIVERY_SLOTS = Array.from({ length: 10 }, (_, i) => {
  const startHour = 11 + i; // 11 AM .. 8 PM
  const endHour = startHour + 1; // 12 PM .. 9 PM
  return { id: `${startHour}-${endHour}`, label: `${formatHour12(startHour)} – ${formatHour12(endHour)}` };
});
/* Today's date in YYYY-MM-DD, for the date input's min attribute */
function todayISO() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

/* ---------------------------------------------------------
   Customer: Menu + Cart + Checkout
--------------------------------------------------------- */
function CustomerApp({ menu, inventory, heroImages }) {
  const [tab, setTab] = useState("fried");
  const [cart, setCart] = useState({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "", mode: "Delivery", location: null, paymentMethod: "cod", deliveryDate: "", deliverySlot: "" });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [slide, setSlide] = useState(0);

  const heroCount = heroImages?.length || 0;
  useEffect(() => {
    if (heroCount <= 1) return;
    const t = setInterval(() => setSlide((s) => (s + 1) % heroCount), 5000);
    return () => clearInterval(t);
  }, [heroCount]);

  const isAvailable = (id) => inventory[id]?.available !== false;

  // Effective price: prefer admin override stored in inventory, else MENU price
  const priceOf = (item) => (inventory[item.id]?.price != null ? inventory[item.id].price : item.price);

  const addItem = (item) => {
    if (!isAvailable(item.id)) return;
    const step = item.step || 1;
    const minQty = item.minQty || step;
    setCart((c) => {
      const current = c[item.id] || 0;
      const next = current === 0 ? minQty : current + step;
      return { ...c, [item.id]: Math.round(next * 100) / 100 };
    });
  };
  const decItem = (id, item) => {
    setCart((c) => {
      const next = { ...c };
      if (!next[id]) return next;
      const step = item?.step || 1;
      const minQty = item?.minQty || 1;
      next[id] = Math.round((next[id] - step) * 100) / 100;
      if (next[id] < minQty) delete next[id];
      return next;
    });
  };

  const cartLines = Object.entries(cart)
    .map(([id, qty]) => {
      const base = menu.find((m) => m.id === id);
      if (!base) return null;
      return { ...base, qty, price: priceOf(base) };
    })
    .filter(Boolean);
  const cartCount = cartLines.reduce((s, l) => s + l.qty, 0);
  const cartTotal = cartLines.reduce((s, l) => s + l.qty * l.price, 0);

  const submitOrder = async () => {
    const hasLocation = form.location?.lat != null && form.location?.lng != null;
    if (
      !form.name.trim() ||
      !form.phone.trim() ||
      !form.deliveryDate ||
      !form.deliverySlot ||
      (form.mode === "Delivery" && !form.address.trim() && !hasLocation)
    )
      return;
    setSubmitting(true);
    const order = {
      id: genId(),
      invoiceId: genInvoiceId(),
      items: cartLines.map((l) => ({ id: l.id, name: l.name, price: l.price, qty: l.qty })),
      total: cartTotal,
      customer: {
        name: form.name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
        mode: form.mode,
        location: form.location || null,
        paymentMethod: form.paymentMethod,
        deliveryDate: form.deliveryDate,
        deliverySlot: form.deliverySlot,
      },
      status: "pending",
      createdAt: Date.now(),
    };
    try {
      await createOrder(order);
    } catch (err) {
      console.error("Failed to place order:", err);
      setSubmitting(false);
      setErrorMsg("Sorry, we couldn't place your order. Please check your connection and try again.");
      return;
    }
    setSubmitting(false);
    setErrorMsg("");
    setCart({});
    setCheckoutOpen(false);
    setCartOpen(false);
    // Reset the delivery form so a new customer's checkout doesn't show the
    // previous order's name/phone/address/notes/location.
    setForm((f) => ({ name: "", phone: "", address: "", notes: "", mode: f.mode, location: null, paymentMethod: f.paymentMethod, deliveryDate: "", deliverySlot: "" }));
    setConfirmedOrder(order);
  };

  const itemsForTab = useMemo(() => menu.filter((m) => m.cat === tab), [menu, tab]);

  return (
    <div className="min-h-screen bg-green-950 text-stone-100" style={{ fontFamily: "'Work Sans', sans-serif" }}>
      <style>{FONTS}</style>

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-green-900 min-h-[320px] sm:min-h-[380px] flex items-center bg-gradient-to-br from-green-900 to-green-950">
        {/* Rotating image background */}
        {heroImages.length > 0 && heroImages.map((src, i) => (
          <img
            key={src + i}
            src={src}
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              i === slide ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        {/* Readability overlays */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-950 via-green-950/85 to-green-950/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-green-950 via-transparent to-green-950/40" />

        <div className="relative max-w-5xl mx-auto px-4 py-10 sm:py-12 w-full">
          <div
            className="text-amber-300 tracking-tight uppercase text-4xl sm:text-5xl mb-3"
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 700 }}
          >
            Semi's Kitchen
          </div>
        </div>

        {/* Slide indicators */}
        {heroImages.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-2">
            {heroImages.map((src, i) => (
              <button
                key={src + i}
                onClick={() => setSlide(i)}
                aria-label={`Show slide ${i + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === slide ? "w-6 bg-amber-400" : "w-2 bg-stone-400/70 hover:bg-stone-300"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Category tabs */}
      <div className="sticky top-0 z-20 bg-green-950/95 backdrop-blur border-b border-green-900">
        <div className="max-w-5xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {CATS.map((c) => {
            const Icon = c.icon;
            const active = tab === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setTab(c.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  active ? "border-amber-400 text-amber-300" : "border-transparent text-stone-400 hover:text-stone-200"
                }`}
              >
                <Icon className="w-4 h-4" /> {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Menu grid */}
      <main className="max-w-5xl mx-auto px-4 py-6 pb-28">
        {tab === "mains" && (
          <p className="mb-4 text-sm text-amber-300/90 bg-amber-400/10 border border-amber-400/30 rounded-lg px-3.5 py-2.5">
            Please note: same-day delivery is not available for Biriyani &amp; Curry items.
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {itemsForTab.map((item) => {
            const available = isAvailable(item.id);
            const qty = cart[item.id] || 0;
            return (
              <div
                key={item.id}
                className={`rounded-xl border border-green-900 bg-green-900/40 overflow-hidden ${
                  !available ? "opacity-50" : ""
                }`}
              >
                {/* Item image */}
                <div className="w-full h-36 bg-green-900 overflow-hidden">
                  <img
                    src={resolveImg(item.img)}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = "none";
                      e.target.nextElementSibling?.classList.remove("hidden");
                    }}
                  />
                  <div className="hidden w-full h-full flex items-center justify-center text-stone-600 text-xs">
                    No image
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-stone-50">
                      {item.name}
                      <span className="text-stone-500 text-xs ml-1.5">{item.unit}</span>
                    </div>
                    <div className="text-amber-400 text-sm mt-0.5">
                      {rupee(priceOf(item))}
                      {item.minQty > 1 && <span className="text-stone-500 text-xs ml-1.5">· min {item.minQty}</span>}
                      {item.seasonal && <span className="text-stone-500 text-xs ml-1.5">· seasonal price</span>}
                    </div>
                    {!available && <div className="text-red-400 text-xs mt-1 font-medium">Sold out today</div>}
                  </div>
                  {available ? (
                    qty > 0 ? (
                      <div className="flex items-center gap-2 bg-green-950 rounded-lg border border-green-800 px-1 py-1 shrink-0">
                        <button onClick={() => decItem(item.id, item)} className="w-7 h-7 flex items-center justify-center text-stone-300 hover:text-amber-300">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-5 text-center text-sm font-semibold">{qty}</span>
                        <button onClick={() => addItem(item)} className="w-7 h-7 flex items-center justify-center text-stone-300 hover:text-amber-300">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addItem(item)}
                        className="shrink-0 px-3.5 py-1.5 rounded-lg bg-amber-400 text-green-950 text-sm font-semibold hover:bg-amber-300 transition-colors"
                      >
                        Add
                      </button>
                    )
                  ) : (
                    <div className="shrink-0 px-3.5 py-1.5 rounded-lg bg-green-800 text-stone-500 text-sm font-semibold">Sold out</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Floating cart bar */}
      {cartCount > 0 && !cartOpen && !checkoutOpen && !confirmedOrder && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-amber-400 text-green-950 px-5 py-3.5 rounded-full shadow-xl font-semibold hover:bg-amber-300 transition-colors"
        >
          <ShoppingBag className="w-5 h-5" />
          {rupee(cartTotal)}
        </button>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCartOpen(false)} />
          <div className="relative w-full sm:w-[420px] bg-green-950 border-l border-green-900 h-full flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-green-900">
              <h2 className="text-lg font-semibold text-stone-50" style={{ fontFamily: "'Fraunces', serif" }}>Your order</h2>
              <button onClick={() => setCartOpen(false)}><X className="w-5 h-5 text-stone-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cartLines.length === 0 && <p className="text-stone-500 text-sm">Your cart is empty.</p>}
              {cartLines.map((l) => (
                <div key={l.id} className="flex flex-col gap-2 border-b border-green-900/60 pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-stone-100 text-sm font-medium">{l.name}</div>
                      <div className="text-stone-500 text-xs">{rupee(l.price)} {l.unit}</div>
                    </div>
                    <div className="flex items-center gap-2 bg-green-900 rounded-lg border border-green-800 px-1 py-1">
                      <button onClick={() => decItem(l.id, l)} className="w-6 h-6 flex items-center justify-center text-stone-300"><Minus className="w-3 h-3" /></button>
                      <span className="w-8 text-center text-sm">{l.qty}</span>
                      <button onClick={() => addItem(l)} className="w-6 h-6 flex items-center justify-center text-stone-300"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                  <div className="text-right text-sm text-amber-400 font-semibold">{rupee(l.qty * l.price)}</div>
                </div>
              ))}
            </div>
            {cartLines.length > 0 && (
              <div className="border-t border-green-900 p-5 space-y-3">
                <div className="flex justify-between text-stone-200 font-semibold">
                  <span>Total</span>
                  <span className="text-amber-400">{rupee(cartTotal)}</span>
                </div>
                <button
                  onClick={() => { setCartOpen(false); setCheckoutOpen(true); }}
                  className="w-full py-3 rounded-lg bg-amber-400 text-green-950 font-semibold hover:bg-amber-300 transition-colors"
                >
                  Proceed to checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCheckoutOpen(false)} />
          <div className="relative bg-green-950 border border-green-900 rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-50" style={{ fontFamily: "'Fraunces', serif" }}>Delivery details</h2>
              <button onClick={() => setCheckoutOpen(false)}><X className="w-5 h-5 text-stone-400" /></button>
            </div>
            <div className="flex gap-2 mb-4">
              {["Delivery", "Pickup"].map((m) => (
                <button
                  key={m}
                  onClick={() => setForm((f) => ({ ...f, mode: m }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                    form.mode === m ? "bg-amber-400 text-green-950 border-amber-400" : "border-green-800 text-stone-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
<div className="mb-4">
              <div className="flex gap-2">
                {[
                  { id: "cod", label: "Cash on Delivery" },
                  { id: "upi", label: "UPI" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, paymentMethod: p.id }))}
                    className={`flex-1 py-2.5 px-2 rounded-lg text-sm font-medium border ${
                      form.paymentMethod === p.id ? "bg-amber-400 text-green-950 border-amber-400" : "border-green-800 text-stone-300"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {form.paymentMethod === "upi" && (
                <p className="mt-2 text-sm text-amber-300/90 bg-amber-400/10 border border-amber-400/30 rounded-lg px-3 py-2">
                  A QR code will be sent to your provided phone number to complete the payment.
                </p>
              )}
            </div>
            <div className="mb-4">
              <label className="text-xs text-stone-400 mb-1.5 block">When should the order arrive?</label>
              <input
                type="date"
                min={todayISO()}
                value={form.deliveryDate}
                onChange={(e) => setForm((f) => ({ ...f, deliveryDate: e.target.value }))}
                className="w-full bg-green-900/60 border border-green-800 rounded-lg px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400 [color-scheme:dark]"
              />
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                {DELIVERY_SLOTS.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, deliverySlot: slot.id }))}
                    className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium border whitespace-nowrap ${
                      form.deliverySlot === slot.id ? "bg-amber-400 text-green-950 border-amber-400" : "border-green-800 text-stone-300"
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <input
                placeholder="Full name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full bg-green-900/60 border border-green-800 rounded-lg px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <input
                placeholder="Phone number"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full bg-green-900/60 border border-green-800 rounded-lg px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              {form.mode === "Delivery" && (
                <LocationPicker
                  value={form.location}
                  onChange={(loc) =>
                    setForm((f) => {
                      const merged = { ...(f.location || {}), ...loc };
                      return { ...f, location: merged, address: merged.address || f.address };
                    })
                  }
                />
              )}
              <textarea
                placeholder="Notes (spice level, allergies, etc.) — optional"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full bg-green-900/60 border border-green-800 rounded-lg px-3.5 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              />
            </div>
            <div className="flex justify-between items-center mt-4 mb-1 text-stone-200">
              <span className="text-sm">Order total</span>
              <span className="font-semibold text-amber-400">{rupee(cartTotal)}</span>
            </div>
            {errorMsg && (
              <p className="text-red-400 text-sm mt-2">{errorMsg}</p>
            )}
            <button
              disabled={
                submitting ||
                !form.name.trim() ||
                !form.phone.trim() ||
                !form.deliveryDate ||
                !form.deliverySlot ||
                (form.mode === "Delivery" && !form.address.trim() && !(form.location?.lat != null && form.location?.lng != null))
              }
              onClick={submitOrder}
              className="w-full mt-3 py-3 rounded-lg bg-amber-400 text-green-950 font-semibold hover:bg-amber-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? "Placing order…" : "Place order"}
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 text-center">
        <span className="font-bold tracking-widest text-green-800 select-none">QOZYD</span>
      </footer>

      {/* Confirmation */}
      {confirmedOrder && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" />
          <div className="relative bg-green-950 border border-green-900 rounded-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-400 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-green-950" />
            </div>
            <h2 className="text-xl font-semibold text-stone-50 mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Order sent!</h2>
            <p className="text-stone-400 text-sm mb-4">We'll confirm on WhatsApp/call shortly. Keep these IDs for your reference.</p>
            <div className="bg-green-900/60 border border-green-800 rounded-lg py-2.5 text-amber-300 font-mono tracking-wider text-sm mb-2">
              {confirmedOrder.id}
            </div>
            <div className="bg-green-900/60 border border-green-800 rounded-lg py-2.5 text-amber-300 font-mono tracking-wider text-sm mb-5">
              {confirmedOrder.invoiceId}
            </div>
            <button
              onClick={() => setConfirmedOrder(null)}
              className="w-full py-3 rounded-lg bg-amber-400 text-green-950 font-semibold hover:bg-amber-300 transition-colors"
            >
              Back to menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------
   Homepage (customer site)
--------------------------------------------------------- */
export default function App() {
  const [menu, setMenu] = useState([]);
  const [inventory, setInventory] = useState({});
  const [heroImages, setHeroImages] = useState([]);

  const refreshMenu = useCallback(async () => setMenu(await loadMenu()), []);
  const refreshInventory = useCallback(async () => setInventory(await loadInventory()), []);
  const refreshHeroImages = useCallback(async () => {
    const uploaded = await loadHeroImages();
    const merged = uploaded.length > 0 ? uploaded : getFolderHeroImages();
    setHeroImages(merged);
  }, []);

  useEffect(() => {
    refreshMenu();
    refreshHeroImages();
    refreshInventory();
  }, [refreshMenu, refreshHeroImages, refreshInventory]);

  return (
    <CustomerApp
      menu={menu}
      inventory={inventory}
      heroImages={heroImages}
    />
  );
}
