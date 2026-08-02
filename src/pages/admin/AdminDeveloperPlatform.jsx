import React, { useEffect, useState } from "react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../api";
import { formatNaira, formatDate } from "../../utils/helpers";
import { FiAlertCircle, FiTrash2, FiChevronDown, FiChevronUp } from "react-icons/fi";

const TABS = ["Developers", "Usage"];
const STATUS_OPTIONS = ["pending", "approved", "suspended"];

const DeveloperRow = ({ dev, onStatusChange }) => {
  const [open, setOpen] = useState(false);
  const [keys, setKeys] = useState(null);
  const [loadingKeys, setLoadingKeys] = useState(false);

  const toggle = async () => {
    setOpen(!open);
    if (!open && keys === null) {
      setLoadingKeys(true);
      try {
        const data = await api.get(`/admin/developer-accounts/${dev._id}/keys`);
        setKeys(data.keys || []);
      } catch {
        setKeys([]);
      }
      setLoadingKeys(false);
    }
  };

  const revokeKey = async (id) => {
    try {
      await api.post(`/admin/developer-accounts/keys/${id}/revoke`, {});
      setKeys((ks) => ks.map((k) => (k.id === id ? { ...k, status: "revoked" } : k)));
    } catch { /* surfaced via the row staying unchanged */ }
  };

  return (
    <div className="border-b border-line last:border-0">
      <div className="flex items-center justify-between gap-3 p-4">
        <button onClick={toggle} className="flex items-center gap-2 min-w-0 text-left flex-1">
          {open ? <FiChevronUp size={14} className="text-ink/40 shrink-0" /> : <FiChevronDown size={14} className="text-ink/40 shrink-0" />}
          <div className="min-w-0">
            <p className="text-ink font-dm text-sm font-medium truncate">{dev.email}</p>
            <p className="text-ink/35 font-dm text-xs">
              {dev.companyName || "No company name"} · Wallet {formatNaira(dev.walletBalance || 0)} · {dev.keyCount} key{dev.keyCount === 1 ? "" : "s"}
            </p>
          </div>
        </button>
        <select
          value={dev.status}
          onChange={(e) => onStatusChange(dev._id, e.target.value)}
          className={`input-field-light !py-1.5 !w-auto text-xs capitalize shrink-0 ${
            dev.status === "approved" ? "text-iris" : dev.status === "suspended" ? "text-red-400" : "text-ink/60"
          }`}
        >
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {open && (
        <div className="px-4 pb-4">
          {loadingKeys ? (
            <p className="text-ink/35 font-dm text-xs">Loading keys...</p>
          ) : keys.length === 0 ? (
            <p className="text-ink/35 font-dm text-xs">No API keys yet.</p>
          ) : (
            <div className="bg-surface border border-line rounded-xl overflow-hidden">
              {keys.map((k, i) => (
                <div key={k.id} className={`flex items-center justify-between gap-3 px-3 py-2.5 ${i < keys.length - 1 ? "border-b border-line" : ""} ${k.status === "revoked" ? "opacity-50" : ""}`}>
                  <div className="min-w-0">
                    <p className="text-ink font-dm text-xs font-medium truncate">{k.name || "Unnamed key"} <span className="text-ink/30 font-mono">{k.keyPrefix}</span></p>
                    <p className="text-ink/30 font-dm text-[11px] capitalize">{k.environment} · {k.status} · {k.rateLimitPerMinute}/min</p>
                  </div>
                  {k.status === "active" && (
                    <button onClick={() => revokeKey(k.id)} className="text-ink/40 hover:text-red-400 shrink-0" title="Revoke">
                      <FiTrash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AdminDeveloperPlatform = () => {
  const [tab, setTab] = useState(0);
  const [developers, setDevelopers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDevelopers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/admin/developer-accounts");
      setDevelopers(data.developers || []);
    } catch (err) {
      setError(err.message || "Could not load developer accounts.");
    }
    setLoading(false);
  };

  const loadAnalytics = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get("/admin/developer-analytics");
      setAnalytics(data);
    } catch (err) {
      setError(err.message || "Could not load usage analytics.");
    }
    setLoading(false);
  };

  useEffect(() => { loadDevelopers(); }, []);
  useEffect(() => { if (tab === 1 && !analytics) loadAnalytics(); }, [tab]);

  const handleStatusChange = async (id, status) => {
    setDevelopers((devs) => devs.map((d) => (d._id === id ? { ...d, status } : d)));
    try {
      await api.post(`/admin/developer-accounts/${id}/status`, { status });
    } catch (err) {
      setError(err.message || "Could not update status.");
      loadDevelopers(); // revert to real state on failure
    }
  };

  return (
    <AdminLayout>
      <div className="p-5 lg:p-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="font-syne font-bold text-ink text-2xl">Developer Platform</h1>
          <p className="text-ink/40 font-dm text-sm mt-1">Approve live API access and monitor developer usage</p>
        </div>

        <div className="flex gap-2 mb-6">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} className={`px-4 py-2 rounded-xl font-dm text-sm border transition-colors ${tab === i ? "bg-iris/15 text-iris border-iris/25" : "text-ink/50 border-line hover:text-ink"}`}>
              {t}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-4">
            <FiAlertCircle size={14} className="text-red-400 shrink-0" />
            <p className="text-red-400 font-dm text-sm">{error}</p>
          </div>
        )}

        {tab === 0 ? (
          loading ? (
            <div className="card-flat p-8 text-center text-ink/35 font-dm text-sm">Loading...</div>
          ) : developers.length === 0 ? (
            <div className="card-flat p-8 text-center text-ink/35 font-dm text-sm">No developers registered yet.</div>
          ) : (
            <div className="card-flat overflow-hidden">
              {developers.map((dev) => (
                <DeveloperRow key={dev._id} dev={dev} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )
        ) : loading || !analytics ? (
          <div className="card-flat p-8 text-center text-ink/35 font-dm text-sm">Loading...</div>
        ) : (
          <>
            <p className="text-ink/35 font-dm text-xs mb-4">Last 30 days, since {formatDate(analytics.since)}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="card-flat p-4">
                <p className="text-ink/35 font-dm text-[11px] uppercase mb-1">Total Requests</p>
                <p className="font-syne font-bold text-lg text-ink">{analytics.totalRequests.toLocaleString()}</p>
              </div>
              <div className="card-flat p-4">
                <p className="text-ink/35 font-dm text-[11px] uppercase mb-1">Errors (4xx/5xx)</p>
                <p className="font-syne font-bold text-lg text-red-400">{analytics.errorRequests.toLocaleString()}</p>
              </div>
              <div className="card-flat p-4">
                <p className="text-ink/35 font-dm text-[11px] uppercase mb-1">Sandbox Requests</p>
                <p className="font-syne font-bold text-lg text-ink">{analytics.sandboxRequests.toLocaleString()}</p>
              </div>
              <div className="card-flat p-4">
                <p className="text-ink/35 font-dm text-[11px] uppercase mb-1">Live Requests</p>
                <p className="font-syne font-bold text-lg text-iris">{analytics.liveRequests.toLocaleString()}</p>
              </div>
            </div>

            <h2 className="font-syne font-semibold text-ink text-base mb-3">Top Developers by Volume</h2>
            {analytics.topDevelopers.length === 0 ? (
              <div className="card-flat p-8 text-center text-ink/35 font-dm text-sm">No API requests yet.</div>
            ) : (
              <div className="card-flat overflow-hidden">
                {analytics.topDevelopers.map((d, i) => (
                  <div key={d.developerAccountId} className={`flex items-center justify-between px-4 py-3 ${i < analytics.topDevelopers.length - 1 ? "border-b border-line" : ""}`}>
                    <div className="min-w-0">
                      <p className="text-ink font-dm text-sm truncate">{d.email}</p>
                      {d.companyName && <p className="text-ink/35 font-dm text-xs">{d.companyName}</p>}
                    </div>
                    <p className="text-iris font-syne font-bold text-sm shrink-0">{d.requests.toLocaleString()} req</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDeveloperPlatform;
