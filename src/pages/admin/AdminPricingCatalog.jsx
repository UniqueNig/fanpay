import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../api";
import { FiAlertCircle, FiCheck, FiEyeOff, FiEye, FiPlusCircle } from "react-icons/fi";

const NETWORKS = ["mtn", "airtel", "glo", "9mobile"];
const CABLE_PROVIDERS = ["DSTV", "GOtv", "StarTimes"];
const TABS = ["Airtime", "Data", "Cable", "Electricity", "Exam Pins"];

const PlanTable = ({ rows, loading, onSave, onToggle }) => {
  if (loading) return <div className="card-flat p-8 text-center text-ink/35 font-dm text-sm">Loading...</div>;
  if (rows.length === 0) return <div className="card-flat p-8 text-center text-ink/35 font-dm text-sm">No plans found.</div>;

  return (
    <div className="card-flat overflow-hidden">
      {rows.map((row, i) => (
        <div key={row.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 ${i < rows.length - 1 ? "border-b border-line" : ""} ${!row.active ? "opacity-50" : ""}`}>
          <div className="flex-1 min-w-0">
            <p className="text-ink font-dm text-sm font-medium truncate">{row.label}</p>
            <p className="text-ink/30 font-dm text-[11px]">
              {row.liveMaskawasubPrice != null
                ? `Maskawasub price right now: ₦${row.liveMaskawasubPrice.toLocaleString()}`
                : row.liveVtpassPrice != null
                ? `VTpass price right now: ₦${row.liveVtpassPrice.toLocaleString()}`
                : "Manually added — not in the live provider catalog"}
            </p>
          </div>
          <div className="flex gap-3 shrink-0 items-end">
            <div>
              <label className="text-ink/40 font-dm text-[11px] mb-1 block">Plan ID</label>
              <input defaultValue={row.variationCode} className="input-field-light !py-2 text-sm w-24"
                onBlur={(e) => onSave(row, "variationCode", e.target.value)} title="The provider's plan id — used at purchase time. Only change this if the id is genuinely wrong." />
            </div>
            <div>
              <label className="text-ink/40 font-dm text-[11px] mb-1 block">Buying (₦)</label>
              <input type="number" defaultValue={row.buyingPrice} className="input-field-light !py-2 text-sm w-28"
                onBlur={(e) => onSave(row, "buyingPrice", e.target.value)} />
            </div>
            <div>
              <label className="text-ink/40 font-dm text-[11px] mb-1 block">Selling (₦)</label>
              <input type="number" defaultValue={row.sellingPrice} className="input-field-light !py-2 text-sm w-28"
                onBlur={(e) => onSave(row, "sellingPrice", e.target.value)} />
            </div>
            <div>
              <label className="text-ink/40 font-dm text-[11px] mb-1 block">API (₦)</label>
              <input type="number" defaultValue={row.apiPrice ?? row.buyingPrice} className="input-field-light !py-2 text-sm w-28"
                onBlur={(e) => onSave(row, "apiPrice", e.target.value)} title="What approved live-API developers pay instead of the selling price." />
            </div>
            <div className="flex flex-col justify-end pb-2.5 w-20">
              <span className={`font-dm text-xs whitespace-nowrap ${row.sellingPrice - row.buyingPrice >= 0 ? "text-iris" : "text-red-400"}`}>
                {row.sellingPrice - row.buyingPrice >= 0 ? "+" : ""}₦{(row.sellingPrice - row.buyingPrice).toLocaleString()}
              </span>
            </div>
            <button type="button" onClick={() => onToggle(row)}
              className={`p-2.5 rounded-lg border ${row.active ? "text-ink/50 border-line hover:text-red-400 hover:border-red-400/30" : "text-iris border-iris/30 bg-iris/10"}`}
              title={row.active ? "Hide from customers" : "Show to customers"}>
              {row.active ? <FiEye size={14} /> : <FiEyeOff size={14} />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Data plans grouped by planType (SME, GIFTING, CORPORATE GIFTING, etc —
// whatever Maskawasub returns) with a bulk hide/show per group, on top of
// the existing per-plan toggle inside each group's PlanTable. Bulk-hide
// doesn't introduce a separate "group active" flag — it just flips every
// plan currently in the group to the same `active` value in one request, so
// an admin can still re-enable one specific plan afterward via its own
// toggle without that being overwritten by anything group-level.
const GroupedDataTable = ({ rows, loading, onSave, onToggle, onBulkToggled }) => {
  const [bulkBusy, setBulkBusy] = useState(null);

  if (loading) return <div className="card-flat p-8 text-center text-ink/35 font-dm text-sm">Loading...</div>;
  if (rows.length === 0) return <div className="card-flat p-8 text-center text-ink/35 font-dm text-sm">No plans found.</div>;

  const groups = new Map();
  for (const row of rows) {
    const key = row.planType || "Other";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const bulkToggle = async (groupRows, nextActive) => {
    setBulkBusy(groupRows[0].planType || "Other");
    try {
      await api.post("/admin/product-prices/bulk-toggle", { ids: groupRows.map((r) => r.id), active: nextActive });
      onBulkToggled(groupRows.map((r) => r.id), nextActive);
    } catch { /* surfaced via the page-level error state on next load */ }
    setBulkBusy(null);
  };

  return (
    <div className="flex flex-col gap-5">
      {[...groups.entries()].map(([type, groupRows]) => {
        const anyActive = groupRows.some((r) => r.active);
        return (
          <div key={type}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-ink/50 font-dm text-xs font-semibold uppercase tracking-wider">{type} · {groupRows.length} plan{groupRows.length === 1 ? "" : "s"}</p>
              <button type="button" disabled={bulkBusy === type} onClick={() => bulkToggle(groupRows, !anyActive)}
                className="text-xs font-dm text-ink/50 hover:text-iris border border-line hover:border-iris/30 rounded-lg px-2.5 py-1 disabled:opacity-50">
                {bulkBusy === type ? "..." : anyActive ? "Hide all" : "Show all"}
              </button>
            </div>
            <PlanTable rows={groupRows} loading={false} onSave={onSave} onToggle={onToggle} />
          </div>
        );
      })}
    </div>
  );
};

// Manual fallback for a plan Maskawasub's live catalog doesn't (yet, or
// ever, in cable's case — see maskawasubCablePlans) list on its own —
// upserts straight into ProductPrice via the existing save endpoint, same
// as editing a discovered row's price does.
const AddPlanForm = ({ category, serviceID, onAdded }) => {
  const [planId, setPlanId] = useState("");
  const [label, setLabel] = useState("");
  const [buying, setBuying] = useState("");
  const [selling, setSelling] = useState("");
  const [apiPrice, setApiPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!planId.trim() || !label.trim() || buying === "" || selling === "" || apiPrice === "") return;
    setSaving(true);
    setError("");
    try {
      await api.post("/admin/product-prices", {
        category, serviceID, key: planId.trim(), label: label.trim(),
        buyingPrice: Number(buying), sellingPrice: Number(selling), apiPrice: Number(apiPrice),
      });
      setPlanId(""); setLabel(""); setBuying(""); setSelling(""); setApiPrice(""); setOpen(false);
      onAdded();
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-outline-iris !w-auto self-start px-4 py-2 text-xs flex items-center gap-2 mb-4">
        <FiPlusCircle size={13} /> Add a plan manually by id
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card-flat p-4 mb-4 flex flex-col gap-2">
      <p className="text-ink/40 font-dm text-[11px] mb-1">
        {category === "data"
          ? <>For a plan Maskawasub's catalog doesn't list yet under <span className="uppercase">{serviceID}</span> — you'll need the plan's Maskawasub dataplan_id.</>
          : <>For a plan VTpass's catalog doesn't list yet under <span className="uppercase">{serviceID}</span> — you'll need the plan's VTpass variation_code.</>}
      </p>
      {error && <p className="text-red-400 font-dm text-xs">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <input value={planId} onChange={(e) => setPlanId(e.target.value)} placeholder={category === "data" ? "Maskawasub plan id" : "VTpass variation_code"} className="input-field-light !py-2 text-sm" />
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Display name" className="input-field-light !py-2 text-sm" />
        <input type="number" value={buying} onChange={(e) => setBuying(e.target.value)} placeholder="Buying (₦)" className="input-field-light !py-2 text-sm" />
        <input type="number" value={selling} onChange={(e) => setSelling(e.target.value)} placeholder="Selling (₦)" className="input-field-light !py-2 text-sm" />
        <input type="number" value={apiPrice} onChange={(e) => setApiPrice(e.target.value)} placeholder="API price (₦)" className="input-field-light !py-2 text-sm" />
      </div>
      <div className="flex gap-2 mt-1">
        <button type="button" onClick={() => setOpen(false)} className="btn-outline-iris !w-auto px-4 py-2 text-xs">Cancel</button>
        <button type="submit" disabled={saving} className="btn-iris !w-auto px-4 py-2 text-xs disabled:opacity-60">{saving ? "Adding..." : "Add Plan"}</button>
      </div>
    </form>
  );
};

// Registers a network/cable provider/electricity disco beyond the hardcoded
// tables in services/maskawasub.js — for when Maskawasub adds one that isn't
// already mapped. No live "available services" list to pick from (unlike
// the VTpass-era version of this feature) — Maskawasub has no discovery
// endpoint for this, so it's admin-typed.
const ProviderManager = ({ category, onChanged }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [networkKey, setNetworkKey] = useState("");
  const [serviceID, setServiceID] = useState("");
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#8b5cf6");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/admin/network-services/${category}`);
      setRows(data.rows || []);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [category]);

  const add = async (e) => {
    e.preventDefault();
    if (!networkKey.trim() || !serviceID.trim() || !label.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api.post("/admin/network-services", {
        // "network" (airtime/data) is Maskawasub — numeric id. "cable"/
        // "electricity" are VTpass — a string slug like "ibadan-electric",
        // so it's sent as-is, not Number()-cast.
        category, networkKey: networkKey.trim(),
        serviceID: category === "network" ? Number(serviceID) : serviceID.trim(),
        label: label.trim(),
        color: category === "network" ? color : "",
      });
      setNetworkKey(""); setServiceID(""); setLabel("");
      await load();
      onChanged();
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  const toggle = async (row) => {
    setRows((rs) => rs.map((r) => (r._id === row._id ? { ...r, active: !r.active } : r)));
    try {
      await api.post(`/admin/network-services/${row._id}/toggle`, {});
      onChanged();
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="card-flat p-5 mb-4">
      <p className="text-ink font-syne font-semibold text-sm mb-1">
        {category === "network" ? "Networks" : category === "cable" ? "Cable providers" : "Electricity discos"} beyond the built-in list
      </p>
      <p className="text-ink/30 font-dm text-xs mb-3">
        {category === "network"
          ? "For when Maskawasub adds a network that isn't mapped yet — you'll need its numeric id from Maskawasub's own docs/dashboard."
          : "For when VTpass adds a provider that isn't mapped yet — you'll need its serviceID slug from VTpass's own docs/dashboard (e.g. \"showmax\")."}
      </p>
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2 mb-3">
          <FiAlertCircle size={13} className="text-red-400 shrink-0" />
          <p className="text-red-400 font-dm text-xs">{error}</p>
        </div>
      )}
      {!loading && rows.length > 0 && (
        <div className="flex flex-col gap-1.5 mb-3">
          {rows.map((r) => (
            <div key={r._id} className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-surface ${!r.active ? "opacity-50" : ""}`}>
              <p className="text-ink font-dm text-xs">{r.label} <span className="text-ink/30">({r.networkKey}, id {r.serviceID})</span></p>
              <button type="button" onClick={() => toggle(r)} className="text-ink/50 hover:text-iris">
                {r.active ? <FiEye size={13} /> : <FiEyeOff size={13} />}
              </button>
            </div>
          ))}
        </div>
      )}
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="btn-outline-iris !w-auto px-4 py-2 text-xs flex items-center gap-2">
          <FiPlusCircle size={13} /> Register a new one
        </button>
      ) : (
        <form onSubmit={add} className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={networkKey} onChange={(e) => setNetworkKey(e.target.value)} placeholder="Internal key, e.g. smile" className="input-field-light !py-2 text-sm" />
            <input
              type={category === "network" ? "number" : "text"}
              value={serviceID}
              onChange={(e) => setServiceID(e.target.value)}
              placeholder={category === "network" ? "Maskawasub numeric id" : "VTpass serviceID, e.g. showmax"}
              className="input-field-light !py-2 text-sm"
            />
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Display name" className="input-field-light !py-2 text-sm" />
            {category === "network" && (
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-11 rounded-lg bg-transparent border border-line" />
            )}
          </div>
          <div className="flex gap-2 mt-1">
            <button type="button" onClick={() => setOpen(false)} className="btn-outline-iris !w-auto px-4 py-2 text-xs">Cancel</button>
            <button type="submit" disabled={saving} className="btn-iris !w-auto px-4 py-2 text-xs disabled:opacity-60">{saving ? "Adding..." : "Register"}</button>
          </div>
        </form>
      )}
    </div>
  );
};

const AdminPricingCatalog = () => {
  const [tab, setTab] = useState(0);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const [airtimeRows, setAirtimeRows] = useState([]);
  const [airtimeLoading, setAirtimeLoading] = useState(true);

  const [extraDataNetworks, setExtraDataNetworks] = useState([]);
  const [dataNetwork, setDataNetwork] = useState(NETWORKS[0]);
  const [dataRows, setDataRows] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [extraCableProviders, setExtraCableProviders] = useState([]);
  const [cableProvider, setCableProvider] = useState(CABLE_PROVIDERS[0]);
  const [cableRows, setCableRows] = useState([]);
  const [cableServiceID, setCableServiceID] = useState("");
  const [cableLoading, setCableLoading] = useState(false);

  const [examRows, setExamRows] = useState([]);
  const [examLoading, setExamLoading] = useState(false);

  const flashSaved = () => { setSaved(true); setTimeout(() => setSaved(false), 1500); };

  const loadAirtime = async () => {
    setAirtimeLoading(true);
    try {
      const data = await api.get("/admin/product-prices/airtime");
      setAirtimeRows(data.rows || []);
    } catch (err) { setError(err.message); }
    setAirtimeLoading(false);
  };

  const loadExtraNetworks = async (category, setter) => {
    try {
      const data = await api.get(`/networks/${category}`);
      setter((data.networks || []).map((n) => n.id));
    } catch { setter([]); }
  };

  const loadData = async (network) => {
    setDataLoading(true);
    try {
      const data = await api.get(`/admin/product-prices/data/${network}`);
      setDataRows(data.rows || []);
    } catch (err) { setError(err.message); }
    setDataLoading(false);
  };

  const loadCable = async (provider) => {
    setCableLoading(true);
    try {
      const data = await api.get(`/admin/product-prices/cable/${provider}`);
      setCableRows(data.rows || []);
      setCableServiceID(data.serviceID || "");
    } catch (err) { setError(err.message); }
    setCableLoading(false);
  };

  const loadExam = async () => {
    setExamLoading(true);
    try {
      const data = await api.get("/admin/product-prices/exam");
      setExamRows(data.rows || []);
    } catch (err) { setError(err.message); }
    setExamLoading(false);
  };

  useEffect(() => { loadAirtime(); }, []);
  useEffect(() => { loadExtraNetworks("data", setExtraDataNetworks); }, []);
  useEffect(() => { loadExtraNetworks("cable", setExtraCableProviders); }, []);
  useEffect(() => { if (tab === 1) loadData(dataNetwork); }, [tab, dataNetwork]);
  useEffect(() => { if (tab === 2) loadCable(cableProvider); }, [tab, cableProvider]);
  useEffect(() => { if (tab === 4) loadExam(); }, [tab]);

  const saveAirtimeRow = async (row, field, value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return;
    const next = { ...row, [field]: num };
    setAirtimeRows((rows) => rows.map((r) => (r.serviceID === row.serviceID ? next : r)));
    try {
      await api.post("/admin/product-prices", {
        category: "airtime", serviceID: row.serviceID, key: row.serviceID,
        label: row.network.toUpperCase(), buyingPrice: next.buyingPrice, sellingPrice: next.sellingPrice,
        apiPrice: next.apiPrice ?? next.buyingPrice,
      });
      flashSaved();
    } catch (err) { setError(err.message); }
  };

  const savePlanRow = (category, setter) => async (row, field, value) => {
    let next;
    if (field === "variationCode") {
      const trimmed = value.trim();
      if (!trimmed || trimmed === row.variationCode) return;
      next = { ...row, variationCode: trimmed };
    } else {
      const num = Number(value);
      if (Number.isNaN(num)) return;
      next = { ...row, [field]: num };
    }
    setter((rows) => rows.map((r) => (r.id === row.id ? next : r)));
    try {
      // `id` routes this through the by-id update path server-side, which is
      // what makes editing the plan ID itself (the `key`) a rename instead
      // of silently creating a second row under the new id.
      await api.post("/admin/product-prices", {
        id: row.id, category, serviceID: row.serviceID, key: next.variationCode, label: row.label,
        buyingPrice: next.buyingPrice, sellingPrice: next.sellingPrice, apiPrice: next.apiPrice ?? next.buyingPrice,
      });
      flashSaved();
    } catch (err) { setError(err.message); }
  };

  const toggleRow = (setter) => async (row) => {
    setter((rows) => rows.map((r) => (r.id === row.id ? { ...r, active: !r.active } : r)));
    try {
      await api.post(`/admin/product-prices/${row.id}/toggle`, {});
      flashSaved();
    } catch (err) { setError(err.message); }
  };

  const dataNetworkOptions = [...NETWORKS, ...extraDataNetworks];
  const cableProviderOptions = [...CABLE_PROVIDERS, ...extraCableProviders];

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8 max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-syne font-bold text-ink text-2xl">Pricing Catalog</h1>
            <p className="text-ink/40 font-dm text-sm mt-1">Buying price (what Maskawasub charges) vs. selling price (what customers pay)</p>
          </div>
          {saved && <span className="flex items-center gap-1.5 text-iris font-dm text-xs shrink-0"><FiCheck size={13} /> Saved</span>}
        </div>

        <div className="flex gap-2 mb-6">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} className={`px-4 py-2 rounded-xl font-dm text-sm border transition-colors ${tab === i ? "bg-iris/15 text-iris border-iris/25" : "text-ink/50 border-line hover:text-ink"}`}>
              {t}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
            <FiAlertCircle className="text-red-400 mt-0.5 shrink-0" size={16} />
            <p className="text-red-400 font-dm text-sm">{error}</p>
          </div>
        )}

        {tab === 0 && (
          <>
            <ProviderManager category="network" onChanged={loadAirtime} />
            <div className="card-flat overflow-hidden">
              <p className="text-ink/30 font-dm text-xs p-4 border-b border-line">
                Percent of face value — e.g. buying 98 / selling 99 on a ₦100 top-up charges the customer ₦99
                while Maskawasub costs ₦98, a ₦1 margin. An unconfigured network defaults to 100/100 (sell at face
                value, zero margin) rather than blocking sales.
              </p>
              {airtimeLoading ? (
                <div className="p-8 text-center text-ink/35 font-dm text-sm">Loading...</div>
              ) : (
                airtimeRows.map((row, i) => (
                  <div key={row.serviceID} className={`flex items-center gap-4 p-4 ${i < airtimeRows.length - 1 ? "border-b border-line" : ""}`}>
                    <p className="text-ink font-dm text-sm font-medium w-20 uppercase shrink-0">{row.network}</p>
                    <div className="flex-1 grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-ink/40 font-dm text-[11px] mb-1 block">Buying %</label>
                        <input type="number" step="0.1" defaultValue={row.buyingPrice} className="input-field-light !py-2 text-sm"
                          onBlur={(e) => saveAirtimeRow(row, "buyingPrice", e.target.value)} />
                      </div>
                      <div>
                        <label className="text-ink/40 font-dm text-[11px] mb-1 block">Selling %</label>
                        <input type="number" step="0.1" defaultValue={row.sellingPrice} className="input-field-light !py-2 text-sm"
                          onBlur={(e) => saveAirtimeRow(row, "sellingPrice", e.target.value)} />
                      </div>
                      <div>
                        <label className="text-ink/40 font-dm text-[11px] mb-1 block">API %</label>
                        <input type="number" step="0.1" defaultValue={row.apiPrice ?? row.buyingPrice} className="input-field-light !py-2 text-sm"
                          onBlur={(e) => saveAirtimeRow(row, "apiPrice", e.target.value)} title="What approved live-API developers pay instead of the selling price." />
                      </div>
                    </div>
                    <p className={`font-dm text-xs w-24 text-right shrink-0 ${row.sellingPrice - row.buyingPrice >= 0 ? "text-iris" : "text-red-400"}`}>
                      {(row.sellingPrice - row.buyingPrice).toFixed(1)}% margin
                    </p>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {tab === 1 && (
          <>
            <ProviderManager category="network" onChanged={() => loadExtraNetworks("data", setExtraDataNetworks)} />
            <div className="flex gap-2 mb-4 flex-wrap">
              {dataNetworkOptions.map((n) => (
                <button key={n} onClick={() => setDataNetwork(n)} className={`px-3 py-1.5 rounded-lg font-dm text-xs uppercase border transition-colors ${dataNetwork === n ? "bg-iris/15 text-iris border-iris/25" : "text-ink/50 border-line hover:text-ink"}`}>
                  {n}
                </button>
              ))}
            </div>
            <AddPlanForm category="data" serviceID={dataNetwork} onAdded={() => loadData(dataNetwork)} />
            <GroupedDataTable
              rows={dataRows}
              loading={dataLoading}
              onSave={savePlanRow("data", setDataRows)}
              onToggle={toggleRow(setDataRows)}
              onBulkToggled={(ids, active) => {
                setDataRows((rows) => rows.map((r) => (ids.includes(r.id) ? { ...r, active } : r)));
                flashSaved();
              }}
            />
          </>
        )}

        {tab === 2 && (
          <>
            <ProviderManager category="cable" onChanged={() => loadExtraNetworks("cable", setExtraCableProviders)} />
            <div className="flex gap-2 mb-4 flex-wrap">
              {cableProviderOptions.map((p) => (
                <button key={p} onClick={() => setCableProvider(p)} className={`px-3 py-1.5 rounded-lg font-dm text-xs border transition-colors ${cableProvider === p ? "bg-iris/15 text-iris border-iris/25" : "text-ink/50 border-line hover:text-ink"}`}>
                  {p}
                </button>
              ))}
            </div>
            <AddPlanForm category="cable" serviceID={cableServiceID || cableProvider} onAdded={() => loadCable(cableProvider)} />
            <PlanTable rows={cableRows} loading={cableLoading} onSave={savePlanRow("cable", setCableRows)} onToggle={toggleRow(setCableRows)} />
          </>
        )}

        {tab === 3 && (
          <>
            <ProviderManager category="electricity" onChanged={() => {}} />
            <p className="text-ink/30 font-dm text-xs">
              Electricity has no per-plan catalog — customers type any amount, charged a flat fee (set in Settings).
              Registering a disco here only makes it available as a provider; it doesn't need per-plan pricing.
            </p>
          </>
        )}

        {tab === 4 && (
          <>
            <p className="text-ink/30 font-dm text-xs mb-4">
              WAEC result checker and JAMB UTME PINs, via VTpass. Priced from VTpass's own live rates — same
              buying/selling margin pattern as everything else. The Plan ID here is VTpass's real
              variation_code ("waecdirect", "utme-mock", "utme-no-mock") — don't rename it, that would break
              purchases. NECO isn't offered by VTpass at all (confirmed against their live services list,
              2026-08-02) — only WAEC and JAMB exist here.
            </p>
            <PlanTable rows={examRows} loading={examLoading} onSave={savePlanRow("exam", setExamRows)} onToggle={toggleRow(setExamRows)} />
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPricingCatalog;
