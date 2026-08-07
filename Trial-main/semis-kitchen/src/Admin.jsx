import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useParams } from 'react-router';
import {
X,
  Check,
  Phone,
  MapPin,
  Lock,
  Package,
  Image,
  ChevronLeft,
  ChevronRight,
  Trash2,
  UtensilsCrossed,
  Save,
  FileText,
} from "lucide-react";
import {
  FONTS,
  CATS,
  MENU,
  STATUS,
  ADMIN_CODE,
  Logo,
  StatusPill,
  rupee,
  compressImage,
  loadInventory,
  saveInventory,
  loadOrders,
  saveOrders,
  loadHeroImages,
  saveHeroImages,
} from "./lib/kitchen.jsx";

/* ---------------------------------------------------------
   Admin dashboard (secret route /nashi)
--------------------------------------------------------- */
export default function Admin() {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);
  const [tab, setTab] = useState("pending");
  const [section, setSection] = useState("orders");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const [inventory, setInventory] = useState({});
  const [orders, setOrders] = useState([]);
  const [heroImages, setHeroImages] = useState([]);
  const [priceDraft, setPriceDraft] = useState({});

  const refreshInventory = useCallback(async () => setInventory(await loadInventory()), []);
  const refreshOrders = useCallback(async () => setOrders(await loadOrders()), []);
  const refreshHeroImages = useCallback(async () => {
    const uploaded = await loadHeroImages();
    setHeroImages(uploaded);
  }, []);

  useEffect(() => {
    refreshHeroImages();
    refreshInventory();
    refreshOrders();
    const iv = setInterval(() => {
      refreshHeroImages();
      refreshInventory();
      refreshOrders();
    }, 4000);
    return () => clearInterval(iv);
  }, [refreshHeroImages, refreshInventory, refreshOrders]);

  const tryUnlock = () => {
    if (code === ADMIN_CODE) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  const setOrderStatus = async (id, status) => {
    const current = await loadOrders();
    const next = current.map((o) => (o.id === id ? { ...o, status } : o));
    await saveOrders(next);
    await refreshOrders();
  };

  const toggleAvailability = async (itemId) => {
    const current = await loadInventory();
    const wasAvailable = current[itemId]?.available !== false;
    const next = { ...current, [itemId]: { ...current[itemId], available: !wasAvailable } };
    await saveInventory(next);
    await refreshInventory();
  };

  const savePrice = async (itemId) => {
    const raw = priceDraft[itemId];
    if (raw === undefined || raw === "") return;
    const price = Math.max(0, Math.round(Number(raw) * 100) / 100);
    if (!Number.isFinite(price)) return;
    const current = await loadInventory();
    const next = { ...current, [itemId]: { ...current[itemId], price } };
    await saveInventory(next);
    await refreshInventory();
    setPriceDraft((d) => {
      const copy = { ...d };
      delete copy[itemId];
      return copy;
    });
  };

  const uploadHeroFiles = async (files) => {
    const list = Array.from(files).slice(0, 10 - heroImages.length);
    if (!list.length) return;
    setUploading(true);
    try {
      const compressed = await Promise.all(list.map((f) => compressImage(f)));
      const next = [...heroImages, ...compressed].slice(0, 10);
      await saveHeroImages(next);
      await refreshHeroImages();
    } catch (e) {
      console.error(e);
    }
    setUploading(false);
  };

  const removeHeroImage = async (i) => {
    const next = heroImages.filter((_, idx) => idx !== i);
    await saveHeroImages(next);
    await refreshHeroImages();
  };

  const moveHeroImage = async (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= heroImages.length) return;
    const next = [...heroImages];
    [next[i], next[j]] = [next[j], next[i]];
    await saveHeroImages(next);
    await refreshHeroImages();
  };

  const clearHeroImages = async () => {
    await saveHeroImages([]);
    await refreshHeroImages();
  };

  if (!unlocked) {
    return (
      <div className="min-h-screen bg-green-100 flex items-center justify-center p-4" style={{ fontFamily: "'Work Sans', sans-serif" }}>
        <style>{FONTS}</style>
        <div className="w-full max-w-xs text-center">
          <div className="w-12 h-12 rounded-full bg-amber-400 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-green-950" />
          </div>
          <h1 className="text-green-950 text-lg font-semibold mb-1" style={{ fontFamily: "'Fraunces', serif" }}>Staff access</h1>
          <p className="text-green-800/70 text-sm mb-4">Enter the kitchen passcode to manage orders.</p>
          <input
            type="password"
            value={code}
            onChange={(e) => { setCode(e.target.value); setError(false); }}
            onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
            className="w-full bg-white border border-green-300 rounded-lg px-3.5 py-2.5 text-sm text-green-950 text-center focus:outline-none focus:ring-2 focus:ring-amber-400 mb-2"
            placeholder="Passcode"
          />
          {error && <p className="text-red-500 text-xs mb-2">Incorrect passcode.</p>}
          <button onClick={tryUnlock} className="w-full py-2.5 rounded-lg bg-amber-400 text-green-950 font-semibold hover:bg-amber-300 transition-colors shadow-sm">
            Unlock
          </button>
        </div>
      </div>
    );
  }

  const counts = {
    pending: orders.filter((o) => o.status === "pending").length,
    accepted: orders.filter((o) => o.status === "accepted").length,
    declined: orders.filter((o) => o.status === "declined").length,
    completed: orders.filter((o) => o.status === "completed").length,
  };
  const filtered = orders.filter((o) => o.status === tab).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="min-h-screen bg-green-100 text-green-950" style={{ fontFamily: "'Work Sans', sans-serif" }}>
      <style>{FONTS}</style>
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-green-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="text-xs text-green-800/60 uppercase tracking-widest">Kitchen dashboard</span>
            <button
              onClick={() => navigate("/")}
              className="text-[11px] px-2.5 py-1 rounded-full bg-green-100 border border-green-300 text-green-800 hover:text-amber-600"
            >
              ← Back to site
            </button>
          </div>
        </div>
<div className="max-w-5xl mx-auto px-4 flex gap-1">
          {[
            { id: "orders", label: "Orders" },
            { id: "invoices", label: "Invoices" },
            { id: "inventory", label: "Inventory" },
            { id: "hero", label: "Hero images" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                section === s.id ? "border-amber-400 text-amber-600" : "border-transparent text-green-800/60 hover:text-green-950"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {section === "orders" && (
          <>
            <div className="flex gap-2 mb-5 overflow-x-auto">
              {["pending", "accepted", "declined", "completed"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-3.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap border ${
                    tab === t ? "bg-amber-400 text-green-950 border-amber-400" : "border-green-300 bg-white text-green-800"
                  }`}
                >
                  {STATUS[t].label} ({counts[t]})
                </button>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16 text-green-800/50">
                <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No {tab} orders right now.
              </div>
            )}

            <div className="space-y-3">
              {filtered.map((o) => (
                <div key={o.id} className="border border-green-200 bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex flex-wrap justify-between gap-2 items-start mb-3">
                    <div>
                      <div className="font-mono text-xs text-green-800/50">{o.id}</div>
                      <div className="text-green-950 font-semibold">{o.customer.name}</div>
                      <div className="flex items-center gap-1.5 text-green-800/70 text-xs mt-0.5">
                        <Phone className="w-3 h-3" /> {o.customer.phone}
                        <span className="ml-2 px-1.5 py-0.5 rounded bg-green-100 text-green-800">{o.customer.mode}</span>
                      </div>
                      {o.customer.mode === "Delivery" && o.customer.address && (
                        <div className="flex items-start gap-1.5 text-green-800/70 text-xs mt-1 max-w-sm">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {o.customer.address}
                        </div>
                      )}
                    </div>
                    <StatusPill status={o.status} />
                  </div>
                  <div className="border-t border-green-100 pt-3 space-y-1">
                    {o.items.map((i) => (
                      <div key={i.id} className="flex justify-between text-sm text-green-900">
                        <span>{i.name} × {i.qty}</span>
                        <span>{rupee(i.price * i.qty)}</span>
                      </div>
                    ))}
                  </div>
                  {o.customer.notes && <div className="text-xs text-green-800/50 italic mt-2">Note: {o.customer.notes}</div>}
                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-green-100">
                    <span className="font-semibold text-amber-600">{rupee(o.total)}</span>
                    <div className="flex gap-2">
                      {o.status === "pending" && (
                        <>
                          <button
                            onClick={() => setOrderStatus(o.id, "declined")}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <X className="w-3.5 h-3.5" /> Decline
                          </button>
                          <button
                            onClick={() => setOrderStatus(o.id, "accepted")}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-400 text-green-950 hover:bg-amber-300"
                          >
                            <Check className="w-3.5 h-3.5" /> Accept
                          </button>
                        </>
                      )}
                      {o.status === "accepted" && (
                        <button
                          onClick={() => setOrderStatus(o.id, "completed")}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-sky-100 text-sky-700 hover:bg-sky-200"
                        >
                          <Package className="w-3.5 h-3.5" /> Mark completed
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

{section === "invoices" && (() => {
          const completed = orders
            .filter((o) => o.status === "completed")
            .sort((a, b) => b.createdAt - a.createdAt);

          // Group completed orders by week buckets (Mon-Sun)
          const byWeek = new Map();
          completed.forEach((o) => {
            const d = new Date(o.createdAt);
            const day = (d.getDay() + 6) % 7; // Mon=0 ... Sun=6
            const weekStart = new Date(d);
            weekStart.setDate(d.getDate() - day);
            weekStart.setHours(0, 0, 0, 0);
            const key = weekStart.getTime();
            if (!byWeek.has(key)) byWeek.set(key, []);
            byWeek.get(key).push(o);
          });
          const weeks = Array.from(byWeek.entries()).sort((a, b) => b[0] - a[0]);

          const fmtDate = (ts) =>
            new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
          const weekLabel = (ts) => {
            const start = new Date(ts);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return `${fmtDate(start.getTime())} – ${fmtDate(end.getTime())}`;
          };

          return (
            <div>
              <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                <div>
                  <h2 className="text-green-950 text-lg font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>Invoices</h2>
                  <p className="text-green-800/50 text-xs mt-0.5">
                    {completed.length} completed {completed.length === 1 ? "order" : "orders"} &middot; grouped by week
                  </p>
                </div>
              </div>

              {weeks.length === 0 && (
                <div className="text-center py-16 text-green-800/50">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No completed orders yet.
                </div>
              )}

              <div className="space-y-6">
                {weeks.map(([key, list]) => {
                  const weekTotal = list.reduce((s, o) => s + o.total, 0);
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-amber-600 text-sm uppercase tracking-widest">{weekLabel(key)}</h3>
                        <span className="text-xs text-green-800/60">
                          {list.length} {list.length === 1 ? "invoice" : "invoices"} &middot; {rupee(weekTotal)}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {list.map((o) => (
                          <div key={o.id} className="border border-green-200 bg-white rounded-xl p-4 shadow-sm">
                            <div className="flex flex-wrap justify-between gap-2 items-start mb-3">
                              <div>
                                <div className="font-mono text-xs text-amber-600">{o.invoiceId || o.id}</div>
                                <div className="font-mono text-xs text-green-800/50 mt-0.5">{o.id}</div>
                                <div className="text-green-950 font-semibold mt-1">{o.customer.name}</div>
                                <div className="flex items-center gap-1.5 text-green-800/70 text-xs mt-0.5">
                                  <Phone className="w-3 h-3" /> {o.customer.phone}
                                  <span className="ml-2 px-1.5 py-0.5 rounded bg-green-100 text-green-800">{o.customer.mode}</span>
                                </div>
                                <div className="text-green-800/60 text-xs mt-0.5">{fmtDate(o.createdAt)}</div>
                              </div>
                              <div className="text-right">
                                <StatusPill status={o.status} />
                                <div className="font-semibold text-amber-600 mt-2">{rupee(o.total)}</div>
                              </div>
                            </div>
                            <div className="border-t border-green-100 pt-3 space-y-1">
                              {o.items.map((i) => (
                                <div key={i.id} className="flex justify-between text-sm text-green-900">
                                  <span>{i.name} × {i.qty}</span>
                                  <span>{rupee(i.price * i.qty)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {section === "inventory" && (
          <div className="space-y-6">
            {CATS.map((c) => (
              <div key={c.id}>
                <h3 className="text-amber-600 text-sm uppercase tracking-widest mb-2">{c.name}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MENU.filter((m) => m.cat === c.id).map((item) => {
                    const available = inventory[item.id]?.available !== false;
                    const currentPrice = inventory[item.id]?.price ?? item.price;
                    const draft = priceDraft[item.id];
                    return (
                      <div key={item.id} className="border border-green-200 bg-white rounded-lg px-3.5 py-2.5 shadow-sm">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div>
                            <div className="text-sm text-green-950">{item.name}</div>
                            <div className="text-xs text-green-800/50">{item.unit}</div>
                          </div>
                          <button
                            onClick={() => toggleAvailability(item.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                              available ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                            }`}
                          >
                            {available ? "In stock" : "Sold out"}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-green-800/60">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={draft ?? currentPrice}
                            onChange={(e) => setPriceDraft((d) => ({ ...d, [item.id]: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === "Enter") savePrice(item.id); }}
                            className="w-24 bg-green-50 border border-green-300 rounded-lg px-2.5 py-1.5 text-sm text-green-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                          />
                          <button
                            onClick={() => savePrice(item.id)}
                            disabled={draft === undefined || draft === ""}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-800 hover:bg-green-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Save className="w-3.5 h-3.5" /> Save
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {section === "hero" && (
          <div>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
              <div>
                <h2 className="text-green-950 text-lg font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>Hero carousel images</h2>
                <p className="text-green-800/50 text-xs mt-0.5">
                  Up to 10 images &middot; auto-rotates every 5 seconds
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.length) { uploadHeroFiles(e.target.files); e.target.value = ""; } }}
                />
                {heroImages.length < 10 && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-400 text-green-950 text-sm font-semibold hover:bg-amber-300 transition-colors disabled:opacity-50"
                  >
                    <Image className="w-4 h-4" />
                    {uploading ? "Processing…" : "Upload images"}
                  </button>
                )}
                {heroImages.length > 0 && (
                  <button
                    onClick={clearHeroImages}
                    className="flex items-center gap-1 px-3.5 py-2 rounded-lg border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> Clear all
                  </button>
                )}
              </div>
            </div>

            {heroImages.length === 0 && (
              <div className="text-center py-16 text-green-800/50">
                <Image className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No uploaded hero images yet.</p>
              </div>
            )}

            {heroImages.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {heroImages.map((src, i) => (
                  <div key={src + i} className="group relative border border-green-200 bg-white rounded-xl overflow-hidden shadow-sm">
                    <div className="aspect-[16/9] overflow-hidden">
                      <img src={src} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute top-1.5 left-1.5 bg-black/60 text-stone-200 text-[11px] font-mono px-1.5 py-0.5 rounded">
                      #{i + 1}
                    </div>
                    {heroImages.length > 1 && (
                      <div className="absolute top-1.5 right-1.5 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {i > 0 && (
                          <button
                            onClick={() => moveHeroImage(i, -1)}
                            className="w-6 h-6 flex items-center justify-center bg-black/60 hover:bg-black/80 rounded text-stone-200"
                            aria-label="Move left"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {i < heroImages.length - 1 && (
                          <button
                            onClick={() => moveHeroImage(i, 1)}
                            className="w-6 h-6 flex items-center justify-center bg-black/60 hover:bg-black/80 rounded text-stone-200"
                            aria-label="Move right"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => removeHeroImage(i)}
                      className="absolute bottom-1.5 right-1.5 w-6 h-6 flex items-center justify-center bg-red-500/70 hover:bg-red-500 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove image"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
