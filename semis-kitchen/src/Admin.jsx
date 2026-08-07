import { useState, useEffect, useCallback } from "react";
import { useNavigate } from 'react-router';
import {
  X,
  Check,
  Phone,
  MapPin,
  Lock,
  Package,
  Trash2,
  UtensilsCrossed,
  Save,
  FileText,
} from "lucide-react";
import {
  FONTS,
  CATS,
  STATUS,
  ADMIN_CODE,
  Logo,
  StatusPill,
  rupee,
  loadMenu,
  loadInventory,
  saveInventory,
  fetchOrders,
  updateOrderStatusApi,
  deleteOrderApi,
  loadArchivedOrders,
  saveArchivedOrders,
  fetchSalesSummary,
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
  const [invoiceGroup, setInvoiceGroup] = useState("week");

  const [inventory, setInventory] = useState({});
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [archived, setArchived] = useState([]);
  const [salesSummary, setSalesSummary] = useState([]);
  const [priceDraft, setPriceDraft] = useState({});
  const [stockDraft, setStockDraft] = useState({});

  const refreshMenu = useCallback(async () => setMenu(await loadMenu()), []);
  const refreshInventory = useCallback(async () => setInventory(await loadInventory()), []);
  const refreshOrders = useCallback(async () => setOrders(await fetchOrders()), []);
  const refreshArchived = useCallback(async () => setArchived(await loadArchivedOrders()), []);
  const refreshSales = useCallback(async () => setSalesSummary(await fetchSalesSummary()), []);

  useEffect(() => {
    refreshMenu();
    refreshArchived();
    refreshInventory();
    refreshOrders();
    refreshSales();
    const iv = setInterval(() => {
      refreshArchived();
      refreshInventory();
      refreshOrders();
      refreshSales();
    }, 4000);
    return () => clearInterval(iv);
  }, [refreshMenu, refreshArchived, refreshInventory, refreshOrders, refreshSales]);

  const tryUnlock = () => {
    if (code === ADMIN_CODE) {
      setUnlocked(true);
      setError(false);
    } else {
      setError(true);
    }
  };

const setOrderStatus = async (id, status) => {
    const order = orders.find((o) => o.id === id);
    await updateOrderStatusApi(id, status);

    // When accepting an order, decrement stock for each item
    if (status === "accepted" && order) {
      const inv = await loadInventory();
      const updated = { ...inv };
      (order.items || []).forEach((i) => {
        if (updated[i.id]) {
          const prev = updated[i.id].stock;
          if (prev != null && prev > 0) {
            updated[i.id] = { ...updated[i.id], stock: Math.max(0, prev - i.qty) };
          }
        }
      });
      await saveInventory(updated);
      await refreshInventory();
    }

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

  const saveStock = async (itemId) => {
    const raw = stockDraft[itemId];
    if (raw === undefined || raw === "") return;
    const stock = Math.max(0, Number(raw));
    if (!Number.isFinite(stock)) return;
    const current = await loadInventory();
    const next = { ...current, [itemId]: { ...current[itemId], stock } };
    await saveInventory(next);
    await refreshInventory();
    setStockDraft((d) => {
      const copy = { ...d };
      delete copy[itemId];
      return copy;
    });
  };

  // Clear all orders in a status tab (backing them up to archive first)
  const clearTab = async (status) => {
    const toClear = orders.filter((o) => o.status === status);
    const arch = await loadArchivedOrders();
    await saveArchivedOrders([...toClear, ...arch]);
    await Promise.all(toClear.map((o) => deleteOrderApi(o.id)));
    await refreshArchived();
    await refreshOrders();
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
  const allInvoiceOrders = [...archived, ...orders];

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
            { id: "sales", label: "Sales" },
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
              {(tab === "declined" || tab === "completed") && counts[tab] > 0 && (
                <button
                  onClick={() => { if (confirm(`Move all ${counts[tab]} ${tab} order(s) to the archive for a fresh start?`)) clearTab(tab); }}
                  className="px-3.5 py-2 rounded-lg text-sm font-semibold whitespace-nowrap border border-red-300 text-red-600 bg-red-50 hover:bg-red-100"
                >
                  <Trash2 className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                  Clear {STATUS[tab].label} ({counts[tab]})
                </button>
              )}
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
                        <div className="flex items-start gap-1.5 text-green-800/70 text-xs mt-1 max-w-sm min-w-0">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                          <span className="break-all">{o.customer.address}</span>
                        </div>
                      )}
                      {o.customer.mode === "Delivery" && o.customer.location?.lat && o.customer.location?.lng && (
                        <div className="flex items-start gap-1.5 text-green-800/70 text-xs mt-1">
                          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                          <a
                            href={`https://www.google.com/maps?q=${o.customer.location.lat},${o.customer.location.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-amber-600"
                          >
                            {o.customer.location.lat.toFixed(6)}, {o.customer.location.lng.toFixed(6)}
                          </a>
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
                  {o.customer.notes && <div className="text-xs text-green-800/50 italic mt-2 break-all">Note: {o.customer.notes}</div>}
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
          const invoiceSource = allInvoiceOrders
            .filter((o) => o.status === "completed")
            .sort((a, b) => b.createdAt - a.createdAt);

          const fmtDate = (ts) =>
            new Date(ts).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

          // Group by day (calendar date)
          const byDay = new Map();
          invoiceSource.forEach((o) => {
            const d = new Date(o.createdAt);
            const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
            if (!byDay.has(key)) byDay.set(key, []);
            byDay.get(key).push(o);
          });
          const days = Array.from(byDay.entries()).sort((a, b) => b[0] - a[0]);

          // Group by week (Mon-Sun)
          const byWeek = new Map();
          invoiceSource.forEach((o) => {
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

          const weekLabel = (ts) => {
            const start = new Date(ts);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return `${fmtDate(start.getTime())} – ${fmtDate(end.getTime())}`;
          };

          const groups = invoiceGroup === "day" ? days : weeks;
          const label = invoiceGroup === "day" ? fmtDate : weekLabel;

          return (
            <div>
              <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                <div>
                  <h2 className="text-green-950 text-lg font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>Invoices</h2>
                  <p className="text-green-800/50 text-xs mt-0.5">
                    {invoiceSource.length} completed {invoiceSource.length === 1 ? "order" : "orders"} &middot; {invoiceGroup === "day" ? "grouped by day" : "grouped by week"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {[
                    { id: "day", label: "By day" },
                    { id: "week", label: "By week" },
                  ].map((g) => (
                    <button
                      key={g.id}
                      onClick={() => setInvoiceGroup(g.id)}
                      className={`px-3.5 py-2 rounded-lg text-sm font-medium border ${
                        invoiceGroup === g.id ? "bg-amber-400 text-green-950 border-amber-400" : "border-green-300 bg-white text-green-800"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              {groups.length === 0 && (
                <div className="text-center py-16 text-green-800/50">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No completed orders yet.
                </div>
              )}

              <div className="space-y-6">
                {groups.map(([key, list]) => {
                  const groupTotal = list.reduce((s, o) => s + o.total, 0);
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-amber-600 text-sm uppercase tracking-widest">{label(key)}</h3>
                        <span className="text-xs text-green-800/60">
                          {list.length} {list.length === 1 ? "invoice" : "invoices"} &middot; {rupee(groupTotal)}
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
                  {menu.filter((m) => m.cat === c.id).map((item) => {
                    const available = inventory[item.id]?.available !== false;
                    const currentPrice = inventory[item.id]?.price ?? item.price;
                    const currentStock = inventory[item.id]?.stock ?? "";
                    const priceD = priceDraft[item.id];
                    const stockD = stockDraft[item.id];
                    return (
                      <div key={item.id} className="border border-green-200 bg-white rounded-lg px-3.5 py-2.5 shadow-sm">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div>
                            <div className="text-sm text-green-950">{item.name}</div>
                            <div className="text-xs text-green-800/50">{item.unit}</div>
                            {currentStock !== "" && (
                              <div className="text-xs mt-0.5">
                                <span className={Number(currentStock) <= 0 ? "text-red-500 font-semibold" : "text-green-700"}>
                                  Stock: {currentStock}
                                </span>
                              </div>
                            )}
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
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-green-800/60">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              placeholder="Price"
                              value={priceD ?? currentPrice}
                              onChange={(e) => setPriceDraft((d) => ({ ...d, [item.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") savePrice(item.id); }}
                              className="w-20 bg-green-50 border border-green-300 rounded-lg px-2 py-1.5 text-sm text-green-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                            <button
                              onClick={() => savePrice(item.id)}
                              disabled={priceD === undefined || priceD === ""}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-800 hover:bg-green-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Save price"
                            >
                              <Save className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="Stock"
                              value={stockD ?? currentStock}
                              onChange={(e) => setStockDraft((d) => ({ ...d, [item.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") saveStock(item.id); }}
                              className="w-20 bg-green-50 border border-green-300 rounded-lg px-2 py-1.5 text-sm text-green-950 focus:outline-none focus:ring-2 focus:ring-amber-400"
                            />
                            <button
                              onClick={() => saveStock(item.id)}
                              disabled={stockD === undefined || stockD === ""}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Save stock"
                            >
                              <Save className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <p className="text-xs text-green-800/50">
              Stock decrements automatically when an order is accepted. Price is the selling price.
            </p>
          </div>
        )}

        {section === "sales" && (() => {
          const sold = allInvoiceOrders.filter((o) => o.status === "completed");

          // Aggregate items sold
          const itemQty = {};
          sold.forEach((o) => {
            (o.items || []).forEach((i) => {
              itemQty[i.name] = (itemQty[i.name] || 0) + i.qty;
            });
          });

          // Today's revenue
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const today = sold.filter((o) => o.createdAt >= startOfToday.getTime());
          const todayRevenue = today.reduce((s, o) => s + (o.total || 0), 0);

          // Weekly revenue
          const startOfWeek = new Date();
          const wd = (startOfWeek.getDay() + 6) % 7;
          startOfWeek.setDate(startOfWeek.getDate() - wd);
          startOfWeek.setHours(0, 0, 0, 0);
          const week = sold.filter((o) => o.createdAt >= startOfWeek.getTime());
          const weekRevenue = week.reduce((s, o) => s + (o.total || 0), 0);

          const topItems = Object.entries(itemQty)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

          const statCard = (label, value, sub) => (
            <div className="bg-white border border-green-200 rounded-xl p-4 shadow-sm">
              <div className="text-xs text-green-800/50 uppercase tracking-widest">{label}</div>
              <div className="text-2xl font-bold text-green-950 mt-1">{value}</div>
              {sub && <div className="text-xs text-green-800/60 mt-1">{sub}</div>}
            </div>
          );

          return (
            <div>
              <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                <div>
                  <h2 className="text-green-950 text-lg font-semibold" style={{ fontFamily: "'Fraunces', serif" }}>Sales</h2>
                  <p className="text-green-800/50 text-xs mt-0.5">
                    Based on completed orders
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {statCard("Today's orders", today.length)}
                {statCard("Today's revenue", rupee(todayRevenue))}
                {statCard("This week's orders", week.length)}
                {statCard("Week revenue", rupee(weekRevenue))}
              </div>

<div className="bg-white border border-green-200 rounded-xl p-4 shadow-sm">
                <h3 className="text-amber-600 text-sm uppercase tracking-widest mb-3">Items sold (all time)</h3>
                {topItems.length === 0 && <p className="text-green-800/50 text-sm">No completed orders yet.</p>}
                <div className="space-y-2">
                  {topItems.map(([name, qty]) => (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <span className="text-green-950">{name}</span>
                      <span className="text-green-800/70">{qty} sold</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-green-200 rounded-xl p-4 shadow-sm mt-6">
                <h3 className="text-amber-600 text-sm uppercase tracking-widest mb-3">Daily sales summary</h3>
                {salesSummary.length === 0 && <p className="text-green-800/50 text-sm">No sales summary data yet.</p>}
                <div className="space-y-2">
                  {salesSummary.map((row) => (
                    <div key={row.date} className="flex items-center justify-between text-sm">
                      <span className="text-green-950">{new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                      <span className="text-green-800/70">{row.orders_count} orders · {rupee(Number(row.revenue))}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}
      </main>
    </div>
  );
}
