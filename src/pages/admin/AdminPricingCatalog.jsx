import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../api";
import { FiAlertCircle, FiCheck, FiPlusCircle, FiEyeOff, FiEye } from "react-icons/fi";

const NETWORKS = ["mtn", "airtel", "glo", "9mobile"];
const CABLE_PROVIDERS = ["DSTV", "GOtv", "StarTimes"];
const TABS = ["Airtime", "Data", "Cable"];
const CATEGORY_BY_TAB = ["airtime", "data", "cable"];

const PlanTable = ({ rows, loading, onSave, onToggle }) => {
  if (loading) return <div className="card-glass p-8 text-center text-white/35 font-dm text-sm">Loading...</div>;
  if (rows.length === 0) return <div className="card-glass p-8 text-center text-white/35 font-dm text-sm">No plans found.</div>;

  return (
    <div className="card-glass overflow-hidden">
      {rows.map((row, i) => (
        <div key={row.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 ${i < rows.length - 1 ? "border-b border-white/5" : ""} ${!row.active ? "opacity-50" : ""}`}>
          <div className="flex-1 min-w-0">
            <p className="text-white font-dm text-sm font-medium truncate">{row.label}</p>
            <p className="text-white/30 font-dm text-[11px]">VTpass price right now: ₦{row.liveVtpassPrice.toLocaleString()}</p>
          </div>
          <div className="flex gap-3 shrink-0 items-end">
            <div>
              <label className="text-white/40 font-dm text-[11px] mb-1 block">Buying (₦)</label>
              <input type="number" defaultValue={row.buyingPrice} className="input-field !py-2 text-sm w-28"
                onBlur={(e) => onSave(row, "buyingPrice", e.target.value)} />
            </div>
            <div>
              <label className="text-white/40 font-dm text-[11px] mb-1 block">Selling (₦)</label>
              <input type="number" defaultValue={row.sellingPrice} className="input-field !py-2 text-sm w-28"
                onBlur={(e) => onSave(row, "sellingPrice", e.target.value)} />
            </div>
            <div className="flex flex-col justify-end pb-2.5 w-20">
              <span className={`font-dm text-xs whitespace-nowrap ${row.sellingPrice - row.buyingPrice >= 0 ? "text-secondary" : "text-red-400"}`}>
                {row.sellingPrice - row.buyingPrice >= 0 ? "+" : ""}₦{(row.sellingPrice - row.buyingPrice).toLocaleString()}
              </span>
            </div>
            <button type="button" onClick={() => onToggle(row)}
              className={`p-2.5 rounded-lg border ${row.active ? "text-white/50 border-white/10 hover:text-red-400 hover:border-red-400/30" : "text-secondary border-secondary/30 bg-secondary/10"}`}
              title={row.active ? "Hide from customers" : "Show to customers"}>
              {row.active ? <FiEye size={14} /> : <FiEyeOff size={14} />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Lets an admin discover VTpass services the app doesn't offer yet (verified
// live against VTpass's own /services API) and add one — either merged into
// an existing network (data only) or as a brand-new network/provider.
const AddServiceForm = ({ category, existingNetworks, onAdded }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [mode, setMode] = useState("new"); // "new" | "merge" (data only)
  const [mergeInto, setMergeInto] = useState(existingNetworks[0] || "");
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#22c55e");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/admin/network-services/available/${category}`);
      setCandidates(data.services || []);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [category]);

  const add = async (e) => {
    e.preventDefault();
    if (!selected) return;
    const networkKey = mode === "merge" ? mergeInto : label.trim().toLowerCase().replace(/\s+/g, "-");
    if (mode === "new" && !label.trim()) { setError("A label is required for a new network."); return; }

    setSaving(true);
    setError("");
    try {
      await api.post("/admin/network-services", {
        category, networkKey, serviceID: selected,
        label: mode === "new" ? label.trim() : "",
        color: mode === "new" && category !== "cable" ? color : "",
      });
      setSelected(""); setLabel("");
      await load();
      onAdded();
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  if (loading) return <p className="text-white/30 font-dm text-xs">Checking VTpass for services not offered yet...</p>;

  return (
    <div className="card-glass p-5 mb-4">
      <p className="text-white font-syne font-semibold text-sm mb-1">Add a VTpass service</p>
      <p className="text-white/30 font-dm text-xs mb-3">Checked live against VTpass's own service list, not guessed.</p>
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2 mb-3">
          <FiAlertCircle size={13} className="text-red-400 shrink-0" />
          <p className="text-red-400 font-dm text-xs">{error}</p>
        </div>
      )}
      {candidates.length === 0 ? (
        <p className="text-white/35 font-dm text-xs">Nothing new available — the app already offers everything VTpass has under this category.</p>
      ) : (
        <form onSubmit={add} className="flex flex-col gap-3">
          <select value={selected} onChange={(e) => setSelected(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl text-white font-dm text-sm px-3 py-2.5">
            <option value="" style={{ backgroundColor: "#0d2248", color: "#fff" }}>Select a service...</option>
            {candidates.map((c) => (
              <option key={c.serviceID} value={c.serviceID} style={{ backgroundColor: "#0d2248", color: "#fff" }}>{c.name} ({c.serviceID})</option>
            ))}
          </select>

          {category === "data" && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setMode("merge")} className={`flex-1 py-2 rounded-lg font-dm text-xs border ${mode === "merge" ? "bg-secondary/15 text-secondary border-secondary/25" : "text-white/50 border-white/10"}`}>
                Merge into existing network
              </button>
              <button type="button" onClick={() => setMode("new")} className={`flex-1 py-2 rounded-lg font-dm text-xs border ${mode === "new" ? "bg-secondary/15 text-secondary border-secondary/25" : "text-white/50 border-white/10"}`}>
                New network
              </button>
            </div>
          )}

          {mode === "merge" && category === "data" ? (
            <select value={mergeInto} onChange={(e) => setMergeInto(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl text-white font-dm text-sm px-3 py-2.5 uppercase">
              {existingNetworks.map((n) => <option key={n} value={n} style={{ backgroundColor: "#0d2248", color: "#fff" }}>{n}</option>)}
            </select>
          ) : (
            <div className="flex gap-2">
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Display name, e.g. Smile" className="input-field flex-1" />
              {category !== "cable" && (
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-11 h-11 rounded-lg bg-transparent border border-white/10 shrink-0" />
              )}
            </div>
          )}

          <button type="submit" disabled={!selected || saving} className="btn-primary !w-auto self-start px-5 flex items-center gap-2 disabled:opacity-60">
            <FiPlusCircle size={15} /> {saving ? "Adding..." : "Add Service"}
          </button>
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
  const [dataServiceID, setDataServiceID] = useState("");
  const [dataRows, setDataRows] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  const [extraCableProviders, setExtraCableProviders] = useState([]);
  const [cableProvider, setCableProvider] = useState(CABLE_PROVIDERS[0]);
  const [cableServiceID, setCableServiceID] = useState("");
  const [cableRows, setCableRows] = useState([]);
  const [cableLoading, setCableLoading] = useState(false);

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
      setDataServiceID(data.serviceIDs?.[0] || "");
      setDataRows(data.rows || []);
    } catch (err) { setError(err.message); }
    setDataLoading(false);
  };

  const loadCable = async (provider) => {
    setCableLoading(true);
    try {
      const data = await api.get(`/admin/product-prices/cable/${provider}`);
      setCableServiceID(data.serviceIDs?.[0] || "");
      setCableRows(data.rows || []);
    } catch (err) { setError(err.message); }
    setCableLoading(false);
  };

  useEffect(() => { loadAirtime(); }, []);
  useEffect(() => { loadExtraNetworks("data", setExtraDataNetworks); }, []);
  useEffect(() => { loadExtraNetworks("cable", setExtraCableProviders); }, []);
  useEffect(() => { if (tab === 1) loadData(dataNetwork); }, [tab, dataNetwork]);
  useEffect(() => { if (tab === 2) loadCable(cableProvider); }, [tab, cableProvider]);

  const saveAirtimeRow = async (row, field, value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return;
    const next = { ...row, [field]: num };
    setAirtimeRows((rows) => rows.map((r) => (r.serviceID === row.serviceID ? next : r)));
    try {
      await api.post("/admin/product-prices", {
        category: "airtime", serviceID: row.serviceID, key: row.serviceID,
        label: row.network.toUpperCase(), buyingPrice: next.buyingPrice, sellingPrice: next.sellingPrice,
      });
      flashSaved();
    } catch (err) { setError(err.message); }
  };

  const savePlanRow = (category, setter) => async (row, field, value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return;
    const next = { ...row, [field]: num };
    setter((rows) => rows.map((r) => (r.id === row.id ? next : r)));
    try {
      await api.post("/admin/product-prices", {
        category, serviceID: row.serviceID, key: row.variationCode, label: row.label,
        buyingPrice: next.buyingPrice, sellingPrice: next.sellingPrice,
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
            <h1 className="font-syne font-bold text-white text-2xl">Pricing Catalog</h1>
            <p className="text-white/40 font-dm text-sm mt-1">Buying price (what VTpass charges) vs. selling price (what customers pay)</p>
          </div>
          {saved && <span className="flex items-center gap-1.5 text-secondary font-dm text-xs shrink-0"><FiCheck size={13} /> Saved</span>}
        </div>

        <div className="flex gap-2 mb-6">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} className={`px-4 py-2 rounded-xl font-dm text-sm border transition-colors ${tab === i ? "bg-secondary/15 text-secondary border-secondary/25" : "text-white/50 border-white/10 hover:text-white"}`}>
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
            <AddServiceForm category="airtime" existingNetworks={NETWORKS} onAdded={loadAirtime} />
            <div className="card-glass overflow-hidden">
              <p className="text-white/30 font-dm text-xs p-4 border-b border-white/8">
                Percent of face value — e.g. buying 98 / selling 99 on a ₦100 top-up charges the customer ₦99
                while VTpass costs ₦98, a ₦1 margin. An unconfigured network defaults to 100/100 (sell at face
                value, zero margin) rather than blocking sales.
              </p>
              {airtimeLoading ? (
                <div className="p-8 text-center text-white/35 font-dm text-sm">Loading...</div>
              ) : (
                airtimeRows.map((row, i) => (
                  <div key={row.serviceID} className={`flex items-center gap-4 p-4 ${i < airtimeRows.length - 1 ? "border-b border-white/5" : ""}`}>
                    <p className="text-white font-dm text-sm font-medium w-20 uppercase shrink-0">{row.network}</p>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-white/40 font-dm text-[11px] mb-1 block">Buying %</label>
                        <input type="number" step="0.1" defaultValue={row.buyingPrice} className="input-field !py-2 text-sm"
                          onBlur={(e) => saveAirtimeRow(row, "buyingPrice", e.target.value)} />
                      </div>
                      <div>
                        <label className="text-white/40 font-dm text-[11px] mb-1 block">Selling %</label>
                        <input type="number" step="0.1" defaultValue={row.sellingPrice} className="input-field !py-2 text-sm"
                          onBlur={(e) => saveAirtimeRow(row, "sellingPrice", e.target.value)} />
                      </div>
                    </div>
                    <p className={`font-dm text-xs w-24 text-right shrink-0 ${row.sellingPrice - row.buyingPrice >= 0 ? "text-secondary" : "text-red-400"}`}>
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
            <AddServiceForm category="data" existingNetworks={NETWORKS} onAdded={() => loadExtraNetworks("data", setExtraDataNetworks)} />
            <div className="flex gap-2 mb-4 flex-wrap">
              {dataNetworkOptions.map((n) => (
                <button key={n} onClick={() => setDataNetwork(n)} className={`px-3 py-1.5 rounded-lg font-dm text-xs uppercase border transition-colors ${dataNetwork === n ? "bg-secondary/15 text-secondary border-secondary/25" : "text-white/50 border-white/10 hover:text-white"}`}>
                  {n}
                </button>
              ))}
            </div>
            <PlanTable rows={dataRows} loading={dataLoading} onSave={savePlanRow("data", setDataRows)} onToggle={toggleRow(setDataRows)} />
          </>
        )}

        {tab === 2 && (
          <>
            <AddServiceForm category="cable" existingNetworks={CABLE_PROVIDERS} onAdded={() => loadExtraNetworks("cable", setExtraCableProviders)} />
            <div className="flex gap-2 mb-4 flex-wrap">
              {cableProviderOptions.map((p) => (
                <button key={p} onClick={() => setCableProvider(p)} className={`px-3 py-1.5 rounded-lg font-dm text-xs border transition-colors ${cableProvider === p ? "bg-secondary/15 text-secondary border-secondary/25" : "text-white/50 border-white/10 hover:text-white"}`}>
                  {p}
                </button>
              ))}
            </div>
            <PlanTable rows={cableRows} loading={cableLoading} onSave={savePlanRow("cable", setCableRows)} onToggle={toggleRow(setCableRows)} />
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPricingCatalog;
